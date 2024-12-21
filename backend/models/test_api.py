import httpx
import pytest

# Define the base URL of your FastAPI server
BASE_URL = "http://localhost:8001"

# Test the root endpoint
def test_root():
    response = httpx.get(f"{BASE_URL}/")
    assert response.status_code == 200
    assert response.json() == {"message": "Hybrid Recommender System is Running!"}

# Test onboarding endpoint
def test_onboarding():
    data = {
        "email": "test@example.com",
        "password": "password123"
    }
    response = httpx.post(f"{BASE_URL}/onboarding/", json=data)
    assert response.status_code == 200
    assert "user" in response.json()

# Test login endpoint
def test_login():
    data = {
        "email": "test@example.com",
        "password": "password123"
    }
    response = httpx.post(f"{BASE_URL}/login/", json=data)
    assert response.status_code == 200
    assert "user" in response.json()

# Test submit survey endpoint
def test_submit_survey():
    data = {
        "user_id": "some_user_id",
        "desired_effects": ["relaxed", "happy"],
        "experience_level": "beginner",
        "tried_strains": []
    }
    response = httpx.post(f"{BASE_URL}/submit_survey/", json=data)
    assert response.status_code == 200
    assert response.json() == {"message": "Survey data submitted successfully."}

# Test recommend endpoint
def test_recommend():
    user_id = "some_user_id"
    response = httpx.get(f"{BASE_URL}/recommend/{user_id}")
    assert response.status_code == 200
    assert "recommended_strains" in response.json()

# Test strains list endpoint
def test_strains_list():
    response = httpx.get(f"{BASE_URL}/strains_list/")
    assert response.status_code == 200
    assert "strains" in response.json()

# Test add badge endpoint
def test_add_badge():
    data = {
        "user_id": "some_user_id",
        "badge": "Explorer"
    }
    response = httpx.post(f"{BASE_URL}/add_badge/", json=data)
    assert response.status_code == 200
    assert "message" in response.json()

# Test track achievement endpoint
def test_track_achievement():
    data = {
        "user_id": "some_user_id",
        "achievement_name": "Top Reviewer",
        "progress": 10
    }
    response = httpx.post(f"{BASE_URL}/track_achievement/", json=data)
    assert response.status_code == 200
    assert "message" in response.json()

# Test review strain endpoints (POST, PUT, DELETE)
def test_review_strain():
    review_data = {
        "user_id": "some_user_id",
        "strain_name": "Blue Dream",
        "rating": 4.5,
        "comment": "Very relaxing strain."
    }
    # Add review
    response = httpx.post(f"{BASE_URL}/review_strain/", json=review_data)
    assert response.status_code == 200
    assert "message" in response.json()

    # Edit review
    edit_data = {
        "user_id": "some_user_id",
        "strain_name": "Blue Dream",
        "rating": 4.0,
        "comment": "Adjusted rating after more usage."
    }
    response = httpx.put(f"{BASE_URL}/review_strain/", json=edit_data)
    assert response.status_code == 200
    assert "message" in response.json()

    # Delete review
    delete_data = {
        "user_id": "some_user_id",
        "strain_name": "Blue Dream"
    }
    response = httpx.delete(f"{BASE_URL}/review_strain/", json=delete_data)
    assert response.status_code == 200
    assert "message" in response.json()

# Test leaderboard endpoint
def test_leaderboard():
    response = httpx.get(f"{BASE_URL}/leaderboard/")
    assert response.status_code == 200
    assert "leaderboard" in response.json()

# Test notifications endpoint
def test_notifications():
    user_id = "some_user_id"
    response = httpx.get(f"{BASE_URL}/notifications/{user_id}")
    assert response.status_code == 200
    assert "notifications" in response.json()

# Test profile endpoint
def test_profile():
    user_id = "some_user_id"
    response = httpx.get(f"{BASE_URL}/profile/{user_id}")
    assert response.status_code == 200
    assert "profile" in response.json()
