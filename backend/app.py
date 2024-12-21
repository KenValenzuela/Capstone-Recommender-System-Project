# app.py

import os
import logging
import json
import datetime
import traceback
from typing import List, Optional, Literal
import numpy as np
import pandas as pd
import torch
import pickle
import faiss
import redis
import bcrypt
import uvicorn
from torch import nn
from sklearn.metrics.pairwise import cosine_similarity
from fastapi import FastAPI, HTTPException, Body, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from rapidfuzz import process as fuzzy_process

# ---------------------------
# Configurations and Paths
# ---------------------------
class Config:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    LOG_FILE = os.path.join(BASE_DIR, 'logs', 'deep_hybrid_recommender.log')
    USER_EMB_PATH = os.path.join(BASE_DIR, 'data', 'user_embeddings.npy')
    STRAIN_EMB_PATH = os.path.join(BASE_DIR, 'data', 'strain_embeddings.npy')
    STRAIN_DATA_PATH = os.path.join(BASE_DIR, 'data', 'cleaned_strain_data_final_with_embeddings.csv')
    USER_MAPPING_PATH = os.path.join(BASE_DIR, 'mappings', 'user_id_mapping.pkl')
    STRAIN_MAPPING_PATH = os.path.join(BASE_DIR, 'mappings', 'strain_mapping.pkl')
    FAISS_INDEX_PATH = os.path.join(BASE_DIR, 'models', 'faiss_index.bin')
    EPOCHS = 12
    LEARNING_RATE = 0.0005
    BATCH_SIZE = 256
    NUM_WORKERS = 8
    PATIENCE = 4
    K = 10  # Top K recommendations
    FUZZY_MATCH_THRESHOLD = 85  # Threshold for fuzzy matching confidence

# ---------------------------
# FastAPI App Initialization with Lifespan
# ---------------------------
async def lifespan(app: FastAPI):
    try:
        # Startup tasks
        if not os.path.exists(Config.STRAIN_MAPPING_PATH):
            logging.info("Strain mapping not found. Building strain mapping...")
            build_strain_mapping()
        else:
            logging.info("Strain mapping found. Loading existing mapping...")
        with open(Config.STRAIN_MAPPING_PATH, 'rb') as f:
            app.state.strain_mapping = pickle.load(f)
        logging.info("Strain mapping loaded successfully.")
        yield
    except Exception as e:
        logging.error(f"Error during lifespan events: {e}")
        raise e

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------
# Redis Setup for In-Memory Storage
# ---------------------------
redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

# ---------------------------
# Logging Setup
# ---------------------------
if not os.path.exists(os.path.dirname(Config.LOG_FILE)):
    os.makedirs(os.path.dirname(Config.LOG_FILE))
logging.basicConfig(
    filename=Config.LOG_FILE,
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s]: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

# ---------------------------
# Global Exception Handler
# ---------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logging.error(f"Unhandled exception: {exc}")
    traceback_str = ''.join(traceback.format_exception(None, exc, exc.__traceback__))
    logging.error(traceback_str)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error"},
    )

# ---------------------------
# Pydantic Models
# ---------------------------
class SurveyRequest(BaseModel):
    user_id: int = Field(..., description="User ID")
    desired_effects: List[str] = Field(..., description="List of desired effects")
    experience_level: str = Field(..., description="User's experience level")
    familiar_strains: List[str] = Field([], description="List of familiar strains")
    terpenes: Optional[List[str]] = Field(None, description="Selected terpenes")
    may_relieve: Optional[List[str]] = Field(None, description="Conditions to relieve")

class LoginRequest(BaseModel):
    email: str = Field(..., description="User email")
    password: str = Field(..., description="User password")

class SignupRequest(BaseModel):
    email: str = Field(..., description="User email")
    password: str = Field(..., description="User password")

class PasswordResetRequest(BaseModel):
    email: str = Field(..., description="User email")
    new_password: str = Field(..., description="New password")

class ReviewMetrics(BaseModel):
    potency: int = Field(..., ge=1, le=10, description="Potency rating from 1-10")
    taste: int = Field(..., ge=1, le=10, description="Taste rating from 1-10")
    aroma: int = Field(..., ge=1, le=10, description="Aroma rating from 1-10")
    value: int = Field(..., ge=1, le=10, description="Value rating from 1-10")

class ReviewRequest(BaseModel):
    user_id: int = Field(..., description="User ID of the reviewer")
    strain_name: str = Field(..., description="Name of the strain being reviewed")
    rating: float = Field(..., ge=0, le=5, description="Rating given by the user (0-5 scale)")
    text: Optional[str] = Field("", description="Optional review text")
    metrics: Optional[ReviewMetrics] = Field(None, description="Detailed metrics for the review")

class FeedbackRequest(BaseModel):
    user_id: int = Field(..., description="User ID providing the feedback")
    strain_id: str = Field(..., description="Strain ID or name receiving feedback")
    feedback_type: Literal["like", "dislike"] = Field(..., description="Type of feedback")

# ---------------------------
# Pydantic Models for Favorites
# ---------------------------
class FavoriteRequest(BaseModel):
    user_id: int = Field(..., description="User ID")
    strain_name: str = Field(..., description="Name of the strain to favorite")

class FavoriteResponse(BaseModel):
    favorites: List[str] = Field(..., description="List of favorite strains")

# ---------------------------
# Define Deep Hybrid Recommender Model
# ---------------------------
class DeepHybridRecommender(nn.Module):
    def __init__(self, input_size: int):
        super(DeepHybridRecommender, self).__init__()
        self.network = nn.Sequential(
            nn.Linear(input_size, 512),
            nn.BatchNorm1d(512),
            nn.ReLU(),
            nn.Dropout(0.4),
            nn.Linear(512, 256),
            nn.BatchNorm1d(256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, 128),
            nn.BatchNorm1d(128),
            nn.ReLU(),
            nn.Linear(128, 64),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            nn.Linear(64, 1)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.network(x)

# ---------------------------
# Helper Functions
# ---------------------------
def normalize_strain_name(strain_name: str) -> str:
    """Normalizes strain names for consistent lookup."""
    if not isinstance(strain_name, str):
        strain_name = str(strain_name)
    return strain_name.lower().strip()

def build_strain_mapping():
    """Builds a mapping from normalized strain names to their strain_id."""
    try:
        strain_data = pd.read_csv(Config.STRAIN_DATA_PATH, header=0)
        strain_data['Strain_Name'] = strain_data['Strain_Name'].fillna('').astype(str).apply(normalize_strain_name)
        strain_data['strain_id'] = strain_data['strain_id'].astype(int)

        if strain_data['Strain_Name'].duplicated().any():
            duplicates = strain_data[strain_data['Strain_Name'].duplicated(keep=False)]['Strain_Name'].unique()
            logging.error(f"Duplicate strain names found: {duplicates}")
            raise ValueError("Strain names must be unique for mapping.")

        strain_mapping = {row['Strain_Name']: row['strain_id'] for index, row in strain_data.iterrows()}
        with open(Config.STRAIN_MAPPING_PATH, 'wb') as f:
            pickle.dump(strain_mapping, f)

        logging.info("Strain mapping built and saved successfully.")
        return strain_mapping

    except Exception as e:
        logging.error(f"Error building strain mapping: {e}")
        raise

def load_embeddings():
    """Load embeddings (for your recommender system)."""
    try:
        user_embeddings = np.load(Config.USER_EMB_PATH, mmap_mode='r')
        strain_embeddings = np.load(Config.STRAIN_EMB_PATH, mmap_mode='r')
        logging.info("Embeddings loaded successfully.")
        return user_embeddings, strain_embeddings
    except Exception as e:
        logging.error(f"Error loading embeddings: {e}")
        raise HTTPException(status_code=500, detail=f"Error loading embeddings: {str(e)}")

def get_new_user_id():
    """Generates a new numeric user ID."""
    try:
        user_id = redis_client.incr("next_user_id")
        logging.info(f"Generated new user ID: {user_id}")
        return user_id
    except Exception as e:
        logging.error(f"Error generating new user ID: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating new user ID: {str(e)}")

def get_user_profile(user_id: int):
    """Fetch user profile from Redis"""
    user_profile_data = redis_client.get(f"user_profile_{user_id}")
    if not user_profile_data:
        logging.error(f"User profile not found for user {user_id}")
        raise HTTPException(status_code=404, detail="User profile not found!")
    return json.loads(user_profile_data)

def save_user_profile(user_id: int, profile_data: dict):
    """Save user profile to Redis"""
    redis_client.set(f"user_profile_{user_id}", json.dumps(profile_data))
    logging.info(f"User profile saved for user {user_id}")

def get_user_id_from_email(email: str):
    """Fetches user ID from Redis based on email."""
    user_id = redis_client.get(f"user_email_{email}")
    if user_id:
        return int(user_id)
    return None

def user_exists(email: str):
    """Check if a user with the given email exists"""
    exists = redis_client.exists(f"user_email_{email}")
    logging.info(f"User exists check for email '{email}': {bool(exists)}")
    return bool(exists)

def consolidate_columns(df: pd.DataFrame, prefix: str) -> List[List[str]]:
    cols = [col for col in df.columns if col.startswith(prefix)]

    def get_items(row):
        return [col[len(prefix):].lower().strip() for col in cols if row[col] == 1]

    consolidated = df.apply(get_items, axis=1).tolist()
    logging.info(f"Consolidated {len(cols)} columns with prefix '{prefix}' into lists.")
    return consolidated

def get_fuzzy_match(query: str, choices: set, threshold=Config.FUZZY_MATCH_THRESHOLD) -> Optional[str]:
    match = fuzzy_process.extractOne(query, choices)
    if match:
        matched_strain, score, _ = match
        if score >= threshold:
            logging.info(f"Fuzzy match found: {query} -> {matched_strain} (score: {score})")
            return matched_strain
    logging.warning(f"Fuzzy match not found for '{query}'. Best score: {'No match' if not match else match[1]}")
    return None

def reset_user_cache(user_id: int):
    """Resets the cache for a specific user."""
    keys = redis_client.keys(f"user_*_{user_id}")
    if keys:
        redis_client.delete(*keys)
        logging.info(f"Cache reset for user {user_id}")

def award_badge(user_profile: dict, badge_name: str):
    """Awards a badge to the user if not already awarded."""
    if badge_name not in user_profile.get("badges", []):
        user_profile.setdefault("badges", []).append(badge_name)
        user_profile.setdefault("notifications", []).append(f"Congratulations! You've earned the '{badge_name}' badge.")
        logging.info(f"Awarded badge '{badge_name}' to user {user_profile['user_id']}.")

# ---------------------------
# API Endpoints
# ---------------------------
@app.get("/")
def root():
    return {"message": "Hybrid Recommender System is Running!"}

@app.post("/onboarding/", status_code=201)
def onboarding(signup: SignupRequest):
    try:
        if user_exists(signup.email):
            logging.warning(f"Attempt to register already existing email: {signup.email}")
            raise HTTPException(
                status_code=400,
                detail="Email already registered."
            )

        user_id = get_new_user_id()
        hashed_password = bcrypt.hashpw(signup.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        user_profile = {
            "user_id": user_id,
            "email": signup.email,
            "password": hashed_password,
            "preferences": {},
            "badges": [],
            "achievements": {},
            "reviews": [],
            "notifications": [],
            "favorites": [],
            "last_login": str(datetime.datetime.now()),
            "survey_completed": False,
            "strain_feedback": {},
        }

        save_user_profile(user_id, user_profile)
        redis_client.set(f"user_email_{signup.email}", user_id)
        logging.info(f"User {signup.email} registered successfully with ID {user_id}.")

        return {"message": "User registered successfully.", "user": {"user_id": user_id, "email": signup.email}}

    except HTTPException as he:
        raise he
    except Exception as e:
        logging.error(f"Error during onboarding: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create user: {str(e)}"
        )

@app.post("/login/")
def login(login: LoginRequest):
    try:
        if not user_exists(login.email):
            logging.warning(f"Login attempt with non-existent email: {login.email}")
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password."
            )

        user_id = get_user_id_from_email(login.email)
        user_profile = get_user_profile(user_id)

        if not bcrypt.checkpw(login.password.encode('utf-8'), user_profile['password'].encode('utf-8')):
            logging.warning(f"Invalid password attempt for user ID: {user_id}")
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password."
            )

        user_profile["last_login"] = str(datetime.datetime.now())
        save_user_profile(user_id, user_profile)

        logging.info(f"User {login.email} logged in successfully.")
        return {"message": "Login successful.", "user": {"user_id": user_id, "email": login.email}}

    except HTTPException as he:
        raise he
    except Exception as e:
        logging.error(f"Error during login: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Login failed: {str(e)}"
        )

@app.post("/submit_survey/")
def submit_survey(survey: SurveyRequest):
    try:
        logging.info(f"Received survey submission: {survey.json()}")
        user_id = survey.user_id
        user_profile = get_user_profile(user_id)

        desired_effects = [normalize_strain_name(effect) for effect in survey.desired_effects]
        experience_level = normalize_strain_name(survey.experience_level)
        familiar_strains = [normalize_strain_name(s) for s in survey.familiar_strains]
        terpenes = [normalize_strain_name(t) for t in survey.terpenes] if survey.terpenes else []
        may_relieve = [normalize_strain_name(m) for m in survey.may_relieve] if survey.may_relieve else []

        user_profile["preferences"] = {
            "desired_effects": desired_effects,
            "experience_level": experience_level,
            "familiar_strains": familiar_strains,
            "terpenes": terpenes,
            "may_relieve": may_relieve
        }
        user_profile["survey_completed"] = True
        save_user_profile(user_id, user_profile)
        logging.info(f"Survey data submitted for user {user_id}")

        return recommend_internal(user_id)

    except HTTPException as he:
        raise he
    except Exception as e:
        logging.error(f"Error submitting survey for user {survey.user_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Survey submission failed: {str(e)}")

@app.get("/recommend/{user_id}")
def recommend(user_id: int):
    try:
        return recommend_internal(user_id)
    except HTTPException as he:
        raise he
    except Exception as e:
        logging.error(f"Error in recommend endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Recommendation failed: {str(e)}")

@app.post("/recommend/")
def recommend_post(user_id: int = Body(...)):
    try:
        return recommend_internal(user_id)
    except HTTPException as he:
        raise he
    except Exception as e:
        logging.error(f"Error in recommend_post endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Recommendation failed: {str(e)}")

def recommend_internal(user_id: int):
    try:
        logging.info(f"Generating recommendations for user {user_id}")

        user_profile = get_user_profile(user_id)
        preferences = user_profile.get("preferences", {})
        tried_strains = set(preferences.get("familiar_strains", []))
        desired_effects = preferences.get("desired_effects", [])

        familiar_strains_normalized = set([normalize_strain_name(s) for s in tried_strains])

        user_embeddings, strain_embeddings = load_embeddings()
        strain_data = pd.read_csv(Config.STRAIN_DATA_PATH, header=0)
        strain_data.columns = [col.strip() for col in strain_data.columns]

        strain_data['Effects_List'] = consolidate_columns(strain_data, 'Effects_')
        strain_data['Terpene_List'] = consolidate_columns(strain_data, 'Terpene Profile_')
        strain_data['May_Relieve_List'] = consolidate_columns(strain_data, 'May Relieve_')

        strain_data['Strain_Name'] = strain_data['Strain_Name'].fillna('').astype(str).apply(normalize_strain_name)
        strain_data['Effects_List'] = strain_data['Effects_List'].apply(
            lambda x: [normalize_strain_name(effect) for effect in x])
        strain_data['Terpene_List'] = strain_data['Terpene_List'].apply(
            lambda x: [normalize_strain_name(terpene) for terpene in x])
        strain_data['May_Relieve_List'] = strain_data['May_Relieve_List'].apply(
            lambda x: [normalize_strain_name(relief) for relief in x])

        strain_mapping = app.state.strain_mapping

        found_strains = set()
        missing_strains = set()
        available_strain_names = set(strain_mapping.keys())
        for strain in familiar_strains_normalized:
            matched_strain = get_fuzzy_match(strain, available_strain_names)
            if matched_strain:
                found_strains.add(matched_strain)
            else:
                missing_strains.add(strain)

        logging.info(f"Familiar strains found: {found_strains}")
        logging.info(f"Familiar strains not found: {missing_strains}")

        if found_strains:
            strain_ids = [strain_mapping[s] for s in found_strains]
            user_emb = np.mean(strain_embeddings[strain_ids], axis=0).reshape(1, -1)
        else:
            logging.warning(f"No valid familiar strain indices found for user {user_id}. Using average embedding.")
            user_emb = np.mean(strain_embeddings, axis=0).reshape(1, -1)

        # Incorporate favorites into user embeddings
        favorites = user_profile.get("favorites", [])
        if favorites:
            favorite_normalized = [normalize_strain_name(s) for s in favorites]
            favorite_indices = []
            for s in favorite_normalized:
                matched_strain = get_fuzzy_match(s, available_strain_names)
                if matched_strain:
                    favorite_indices.append(strain_mapping[matched_strain])
            if favorite_indices:
                favorite_emb = np.mean(strain_embeddings[favorite_indices], axis=0).reshape(1, -1)
                user_emb = 0.6 * user_emb + 0.4 * favorite_emb
                logging.info(f"Favorites incorporated into user embeddings for user {user_id}")

        if "reviews" in user_profile and user_profile["reviews"]:
            liked_strains = [normalize_strain_name(review['Strain_Name']) for review in user_profile["reviews"] if
                             review['rating'] >= 4]
            liked_indices = []
            for s in liked_strains:
                matched_strain = get_fuzzy_match(s, available_strain_names)
                if matched_strain:
                    liked_indices.append(strain_mapping[matched_strain])
            if liked_indices:
                feedback_emb = np.mean(strain_embeddings[liked_indices], axis=0).reshape(1, -1)
                user_emb = 0.7 * user_emb + 0.3 * feedback_emb
                logging.info(f"Feedback incorporated for user {user_id}")

        if not os.path.exists(Config.FAISS_INDEX_PATH):
            logging.error("FAISS index file not found.")
            raise HTTPException(status_code=500, detail="Recommendation system is unavailable.")

        faiss_index = faiss.read_index(Config.FAISS_INDEX_PATH)
        if faiss_index is None:
            logging.error("FAISS index is unavailable.")
            raise HTTPException(status_code=500, detail="Recommendation system is unavailable.")

        filtered_strain_data = strain_data[
            strain_data['Effects_List'].apply(lambda effects: any(effect in desired_effects for effect in effects))
        ]

        logging.info(f"Number of strains after filtering by effects: {len(filtered_strain_data)}")

        if filtered_strain_data.empty:
            logging.warning("No strains matched the desired effects.")
            raise HTTPException(status_code=404, detail="No strains found matching your preferences.")

        filtered_strain_ids = filtered_strain_data['strain_id'].tolist()
        filtered_embeddings = strain_embeddings[filtered_strain_ids]

        similarities = cosine_similarity(user_emb, filtered_embeddings).flatten()

        filtered_strain_data = filtered_strain_data.copy()
        filtered_strain_data['similarity'] = similarities

        filtered_strain_data = filtered_strain_data.sort_values(by='similarity', ascending=False)

        recommended_strains = []
        for _, row in filtered_strain_data.head(Config.K).iterrows():
            strain_info = {
                'name': row['Strain_Name'],
                'type': str(row.get('Type', 'Hybrid')),
                'effects': row.get('Effects_List', []),
                'terpenes': row.get('Terpene_List', []),
                'may_relieve': row.get('May_Relieve_List', []),
                'similarity_score': round(row['similarity'], 4)
            }
            recommended_strains.append(strain_info)

        logging.info(f"Recommendations generated: {recommended_strains}")
        return {"recommended_strains": recommended_strains}
    except HTTPException as he:
        raise he
    except Exception as e:
        logging.error(f"Error generating recommendations for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Recommendation failed")

@app.post("/feedback/")
def submit_feedback(feedback: FeedbackRequest):
    try:
        user_id = feedback.user_id
        user_profile = get_user_profile(user_id)

        if "strain_feedback" not in user_profile:
            user_profile["strain_feedback"] = {}

        normalized_strain_name = normalize_strain_name(feedback.strain_id)

        user_profile["strain_feedback"][normalized_strain_name] = {
            "type": feedback.feedback_type,
            "date": str(datetime.datetime.now())
        }

        save_user_profile(user_id, user_profile)

        feedback_key = f"strain_feedback_{normalized_strain_name}"
        if feedback.feedback_type == "like":
            redis_client.hincrby(feedback_key, "likes", 1)
            redis_client.zincrby('strain_popularity', 1, normalized_strain_name)
        else:
            redis_client.hincrby(feedback_key, "dislikes", 1)

        # Award badges based on feedback count
        feedback_count = len(user_profile["strain_feedback"])
        if feedback_count == 5:
            award_badge(user_profile, "Feedback Contributor")

        save_user_profile(user_id, user_profile)

        logging.info(
            f"Feedback recorded for strain '{normalized_strain_name}' by user {user_id}: {feedback.feedback_type}")
        return {"message": "Feedback recorded successfully"}

    except HTTPException as he:
        raise he
    except Exception as e:
        logging.error(f"Error recording feedback: {e}")
        raise HTTPException(status_code=500, detail="Failed to record feedback")

@app.get("/feedbacks/{user_id}")
def get_user_feedbacks(user_id: int):
    try:
        logging.info(f"Retrieving feedbacks for user {user_id}")
        user_profile = get_user_profile(user_id)

        strain_feedback = user_profile.get("strain_feedback", {})
        feedbacks = [
            {
                "strain_name": strain_name,
                "feedback_type": feedback_data["type"],
                "date": feedback_data["date"]
            }
            for strain_name, feedback_data in strain_feedback.items()
        ]

        logging.info(f"Retrieved {len(feedbacks)} feedback(s) for user {user_id}")
        return {"feedbacks": feedbacks}

    except HTTPException as he:
        raise he
    except Exception as e:
        logging.error(f"Error retrieving feedbacks for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve feedbacks")

@app.get("/feedback/{strain_name}")
def get_strain_feedback(strain_name: str):
    try:
        normalized_strain_name = normalize_strain_name(strain_name)
        feedback_key = f"strain_feedback_{normalized_strain_name}"
        feedback_data = redis_client.hgetall(feedback_key)

        result = {
            "likes": int(feedback_data.get("likes", 0)),
            "dislikes": int(feedback_data.get("dislikes", 0))
        }

        logging.info(f"Feedback retrieved for strain '{strain_name}'")
        return result

    except Exception as e:
        logging.error(f"Error retrieving feedback: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve feedback")

@app.get("/strain/{strain_name}")
def get_strain_details(strain_name: str):
    try:
        strain_data = pd.read_csv(Config.STRAIN_DATA_PATH, header=0)
        strain_data.columns = [col.strip() for col in strain_data.columns]

        strain_data['Effects_List'] = consolidate_columns(strain_data, 'Effects_')
        strain_data['Terpene_List'] = consolidate_columns(strain_data, 'Terpene Profile_')
        strain_data['May_Relieve_List'] = consolidate_columns(strain_data, 'May Relieve_')

        strain_data['Strain_Name'] = strain_data['Strain_Name'].fillna('').astype(str).apply(normalize_strain_name)
        strain_data['Effects_List'] = strain_data['Effects_List'].apply(
            lambda x: [normalize_strain_name(effect) for effect in x])
        strain_data['Terpene_List'] = strain_data['Terpene_List'].apply(
            lambda x: [normalize_strain_name(terpene) for terpene in x])
        strain_data['May_Relieve_List'] = strain_data['May_Relieve_List'].apply(
            lambda x: [normalize_strain_name(relief) for relief in x])

        normalized_strain_name = normalize_strain_name(strain_name)
        strain_row = strain_data[strain_data['Strain_Name'] == normalized_strain_name]
        if strain_row.empty:
            logging.warning(f"Strain '{strain_name}' not found.")
            raise HTTPException(status_code=404, detail="Strain not found.")

        strain_info = {
            "name": strain_row.iloc[0]['Strain_Name'],
            "type": str(strain_row.iloc[0].get('Type', 'Hybrid')),
            "effects": strain_row.iloc[0].get('Effects_List', []),
            "terpenes": strain_row.iloc[0].get('Terpene_List', []),
            "may_relieve": strain_row.iloc[0].get('May_Relieve_List', []),
            "rating": strain_row.iloc[0].get('Rating', 0)
        }

        logging.info(f"Strain details fetched for strain '{strain_name}'")
        return strain_info

    except HTTPException as he:
        raise he
    except Exception as e:
        logging.error(f"Error fetching strain details: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching strain details: {str(e)}")

@app.get("/strains_list/")
def get_strains_list():
    try:
        strain_data = pd.read_csv(Config.STRAIN_DATA_PATH, header=0)
        strain_data.columns = [col.strip() for col in strain_data.columns]

        strain_data['Strain_Name'] = strain_data['Strain_Name'].fillna('').astype(str).apply(normalize_strain_name)

        strains_list = strain_data['Strain_Name'].tolist()
        logging.info("Strains list fetched successfully.")
        return {"strains": strains_list}
    except Exception as e:
        logging.error(f"Error fetching strains list: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching strains list: {str(e)}")

@app.get("/leaderboard/")
def get_leaderboard():
    try:
        top_users = redis_client.zrevrange('leaderboard', 0, 9, withscores=True)
        leaderboard = []
        for user_id_str, score in top_users:
            user_id = int(user_id_str)
            user_profile_data = redis_client.get(f"user_profile_{user_id}")
            email = 'Unknown'
            if user_profile_data:
                user_profile = json.loads(user_profile_data)
                email = user_profile.get('email', 'Unknown')
            leaderboard.append({"user_id": user_id, "email": email, "score": int(score)})
        logging.info("Leaderboard retrieved successfully.")
        return {"leaderboard": leaderboard}
    except Exception as e:
        logging.error(f"Error retrieving leaderboard: {e}")
        raise HTTPException(status_code=500, detail=f"Error retrieving leaderboard: {str(e)}")

@app.get("/notifications/{user_id}")
def get_notifications(user_id: int):
    try:
        user_profile = get_user_profile(user_id)
        notifications = user_profile.get("notifications", [])
        user_profile["notifications"] = []
        save_user_profile(user_id, user_profile)
        logging.info(f"Notifications retrieved for user {user_id}.")
        return {"notifications": notifications}
    except HTTPException as he:
        raise he
    except Exception as e:
        logging.error(f"Error retrieving notifications for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving notifications")

@app.get("/profile/{user_id}")
def get_profile(user_id: int):
    try:
        user_profile = get_user_profile(user_id)
        user_profile.pop('password', None)
        logging.info(f"Profile retrieved for user {user_id}.")
        return {"profile": user_profile}
    except HTTPException as he:
        raise he
    except Exception as e:
        logging.error(f"Error retrieving profile for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error retrieving profile: {str(e)}")


@app.post("/review/")
def submit_review(review: ReviewRequest):
    try:
        user_id = review.user_id
        user_profile = get_user_profile(user_id)

        normalized_strain_name = normalize_strain_name(review.strain_name)

        review_entry = {
            "Strain_Name": normalized_strain_name,
            "rating": review.rating,
            "text": review.text,
            "date": str(datetime.datetime.now())
        }

        if review.metrics:
            review_entry["metrics"] = {
                "potency": review.metrics.potency,
                "taste": review.metrics.taste,
                "aroma": review.metrics.aroma,
                "value": review.metrics.value
            }

        user_profile.setdefault("reviews", []).append(review_entry)
        save_user_profile(user_id, user_profile)

        strain_reviews_key = f"strain_reviews_{normalized_strain_name}"
        redis_client.hincrby(strain_reviews_key, "review_count", 1)
        redis_client.hincrbyfloat(strain_reviews_key, "rating_sum", review.rating)

        redis_client.zincrby('leaderboard', 1, user_id)

        # Award badges based on review count
        review_count = len(user_profile["reviews"])
        if review_count == 1:
            award_badge(user_profile, "First Review")
        elif review_count == 10:
            award_badge(user_profile, "Review Enthusiast")

        save_user_profile(user_id, user_profile)

        logging.info(f"Review submitted for strain '{normalized_strain_name}' by user {user_id}.")
        return {"message": "Review submitted successfully"}

    except HTTPException as he:
        raise he
    except Exception as e:
        logging.error(f"Error submitting review for strain '{review.strain_name}': {e}")
        raise HTTPException(status_code=500, detail=f"Error submitting review: {str(e)}")

@app.get("/popular_strains/")
def get_popular_strains():
    try:
        popular_strains = redis_client.zrevrange('strain_popularity', 0, 9, withscores=True)
        result = []
        for strain_name, score in popular_strains:
            result.append({"strain_name": strain_name, "popularity_score": int(score)})

        logging.info("Popular strains retrieved successfully.")
        return {"popular_strains": result}
    except Exception as e:
        logging.error(f"Error retrieving popular strains: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve popular strains")

# ---------------------------
# Favorites Endpoints
# ---------------------------
@app.post("/favorites/", status_code=201)
def add_favorite(favorite: FavoriteRequest):
    try:
        user_id = favorite.user_id
        strain_name = normalize_strain_name(favorite.strain_name)

        user_profile = get_user_profile(user_id)

        favorites = user_profile.get("favorites", [])
        if strain_name in favorites:
            logging.info(f"Strain '{strain_name}' is already in favorites for user {user_id}.")
            raise HTTPException(
                status_code=400,
                detail="Strain is already in favorites."
            )

        favorites.append(strain_name)
        user_profile["favorites"] = favorites

        # Award badge for adding favorites
        if len(favorites) == 5:
            award_badge(user_profile, "Favorites Collector")

        save_user_profile(user_id, user_profile)

        logging.info(f"Strain '{strain_name}' added to favorites for user {user_id}.")
        return {"message": "Strain added to favorites successfully."}

    except HTTPException as he:
        raise he
    except Exception as e:
        logging.error(f"Error adding favorite strain '{favorite.strain_name}' for user {favorite.user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to add favorite strain")

@app.delete("/favorites/", status_code=200)
def remove_favorite(favorite: FavoriteRequest):
    try:
        user_id = favorite.user_id
        strain_name = normalize_strain_name(favorite.strain_name)

        user_profile = get_user_profile(user_id)

        favorites = user_profile.get("favorites", [])
        if strain_name not in favorites:
            logging.warning(f"Strain '{strain_name}' not found in favorites for user {user_id}.")
            raise HTTPException(
                status_code=404,
                detail="Strain not found in favorites."
            )

        favorites.remove(strain_name)
        user_profile["favorites"] = favorites
        save_user_profile(user_id, user_profile)

        logging.info(f"Strain '{strain_name}' removed from favorites for user {user_id}.")
        return {"message": "Strain removed from favorites successfully."}

    except HTTPException as he:
        raise he
    except Exception as e:
        logging.error(f"Error removing favorite strain '{favorite.strain_name}' for user {favorite.user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to remove favorite strain")

@app.get("/favorites/{user_id}", response_model=FavoriteResponse)
def get_favorites(user_id: int):
    try:
        logging.info(f"Retrieving favorites for user {user_id}")
        user_profile = get_user_profile(user_id)

        favorites = user_profile.get("favorites", [])

        logging.info(f"Retrieved {len(favorites)} favorite(s) for user {user_id}")
        return {"favorites": favorites}

    except HTTPException as he:
        raise he
    except Exception as e:
        logging.error(f"Error retrieving favorites for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve favorites")

# ---------------------------
# Chatbot Endpoint (Optional)
# ---------------------------
# Uncomment and implement if integrating a chatbot is desired.
# Make sure to install OpenAI SDK and set up API keys.

# import openai

# openai.api_key = os.getenv("OPENAI_API_KEY")

# class ChatRequest(BaseModel):
#     user_id: int
#     strain_name: str
#     message: str

# @app.post("/chat/")
# def chat_with_bot(chat_request: ChatRequest):
#     try:
#         user_id = chat_request.user_id
#         strain_name = normalize_strain_name(chat_request.strain_name)
#         user_message = chat_request.message

#         # Construct the prompt
#         prompt = f"You are an expert AI budtender. Provide detailed information about the strain '{strain_name}', its effects, terpenes, and any other relevant information. User message: {user_message}"

#         # Call OpenAI's API
#         response = openai.ChatCompletion.create(
#             model="gpt-4",
#             messages=[
#                 {"role": "system", "content": "You are a helpful assistant specialized in cannabis strains and their effects."},
#                 {"role": "user", "content": prompt},
#             ],
#             max_tokens=500,
#             temperature=0.7,
#         )

#         bot_reply = response['choices'][0]['message']['content'].strip()

#         return {"reply": bot_reply}

#     except Exception as e:
#         logging.error(f"Error in chat_with_bot: {e}")
#         raise HTTPException(status_code=500, detail="Chatbot service unavailable.")

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
