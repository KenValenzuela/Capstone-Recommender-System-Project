// src/components/Recommendations.jsx

import React, { useContext, useState, useEffect } from 'react';
import axios from 'axios';
import {
  Container,
  Typography,
  List,
  Button,
  Card,
  CardContent,
  CardActions,
  CircularProgress,
  Box,
  Alert,
  Fade,
  Snackbar,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  Divider,
  Chip,
  IconButton,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import InfoIcon from '@mui/icons-material/Info';
import RateReviewIcon from '@mui/icons-material/RateReview';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ScienceIcon from '@mui/icons-material/Science';
import LocalFloristIcon from '@mui/icons-material/LocalFlorist';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';

const Recommendations = () => {
  const { userId, surveyCompleted } = useContext(AuthContext);
  const navigate = useNavigate();

  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedbackStatus, setFeedbackStatus] = useState({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info',
  });
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const [favorites, setFavorites] = useState([]);

  // Fetch favorites on component mount
  useEffect(() => {
    if (userId) {
      fetchFavorites();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchFavorites = async () => {
    try {
      const response = await axios.get(`/favorites/${userId}`);
      setFavorites(response.data.favorites);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      // Handle error if necessary
    }
  };

  const EducationalDisclaimer = () => (
    <Paper elevation={3} sx={{ p: 3, mb: 4, bgcolor: 'background.paper' }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ScienceIcon color="primary" />
        Understanding Our AI-Budtender Approach
      </Typography>
      <Divider sx={{ my: 2 }} />
      <Typography variant="body1" paragraph>
        Yes, everything you see here is essentially a hybrid. Our AI-Budtender takes a revolutionary approach
        to cannabis recommendations.
      </Typography>
      <Typography variant="body1" paragraph>
        What sets us apart is our recognition that traditional strain classifications (Indica/Sativa) are
        increasingly obsolete in today's market. Through extensive breeding and modern cultivation techniques,
        nearly all available cannabis is technically hybrid.
      </Typography>
      <Typography variant="body1" paragraph sx={{ fontWeight: 'medium' }}>
        Instead, we focus on terpene profiles as the key to understanding and predicting effects. Terpenes
        are the aromatic compounds that truly drive the unique characteristics and effects of different
        cannabis varieties.
      </Typography>
      <Alert severity="info" sx={{ mt: 2 }}>
        Our recommendations are based on comprehensive terpene analysis from lab-reported Certificates of Analysis (C.o.A's) and user-reported effects,
        not outdated classification systems.
      </Alert>
    </Paper>
  );

  const fetchRecommendations = async () => {
    if (!userId) {
      setError('Authentication required. Please log in again.');
      setLoading(false);
      return;
    }

    if (!surveyCompleted) {
      setError('Please complete the survey to receive recommendations.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`/recommend/${userId}`);

      if (
        response.data.recommended_strains &&
        Array.isArray(response.data.recommended_strains)
      ) {
        setRecommendations(response.data.recommended_strains);
        setSnackbar({
          open: true,
          message: `Found ${response.data.recommended_strains.length} recommendations based on terpene profiles!`,
          severity: 'success',
        });
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      const errorMessage =
        error.response?.data?.detail || 'Unable to fetch recommendations';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFeedback = async (strain, feedbackType) => {
    if (feedbackStatus[strain.name]) return;

    try {
      await axios.post(`/feedback/`, {
        user_id: userId,
        strain_id: strain.name, // Assuming strain.name is used as strain_id
        feedback_type: feedbackType,
      });

      setFeedbackStatus((prev) => ({
        ...prev,
        [strain.name]: feedbackType,
      }));

      setSnackbar({
        open: true,
        message: 'Thank you for your feedback! This helps improve our recommendations.',
        severity: 'success',
      });
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setSnackbar({
        open: true,
        message: 'Failed to submit feedback. Please try again.',
        severity: 'error',
      });
    }
  };

  const handleFavoriteToggle = async (strain) => {
    const isFavorite = favorites.includes(strain.name);
    try {
      if (isFavorite) {
        // Remove from favorites
        await axios.delete(`/favorites/`, { data: { user_id: userId, strain_name: strain.name } });
        setFavorites((prev) => prev.filter((fav) => fav !== strain.name));
        setSnackbar({
          open: true,
          message: `"${strain.name}" removed from favorites.`,
          severity: 'info',
        });
      } else {
        // Add to favorites
        await axios.post(`/favorites/`, { user_id: userId, strain_name: strain.name });
        setFavorites((prev) => [...prev, strain.name]);
        setSnackbar({
          open: true,
          message: `"${strain.name}" added to favorites!`,
          severity: 'success',
        });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update favorites. Please try again.',
        severity: 'error',
      });
    }
  };

  const handleStrainDetails = (strain) => {
    navigate(`/strain/${encodeURIComponent(strain.name)}`);
  };

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
    if (retryCount < maxRetries) {
      fetchRecommendations();
    } else {
      setError('Max retry attempts reached. Please try again later.');
    }
  };

  const TerpeneInfo = ({ terpenes }) => (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocalFloristIcon fontSize="small" />
          Terpene Profile Details
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          These terpenes contribute to the strain's unique effects and characteristics:
        </Typography>
        <Box sx={{ mt: 1 }}>
          {terpenes.map((terpene, index) => {
            const info = getTerpeneDescription(terpene);
            return (
              <Tooltip
                key={index}
                title={
                  <Box>
                    <Typography variant="subtitle2">
                      {info.icon} {terpene}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {info.description}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Taste Profile: {info.taste.join(', ')}
                    </Typography>
                  </Box>
                }
                placement="top"
                arrow
              >
                <Chip
                  label={`${info.icon} ${terpene}`}
                  variant="outlined"
                  size="small"
                  sx={{ m: 0.5 }}
                />
              </Tooltip>
            );
          })}
        </Box>
      </AccordionDetails>
    </Accordion>
  );

  const getTerpeneDescription = (terpene) => {
    // Normalize the input to ensure matching with keys
    const formattedTerpene = terpene.charAt(0).toUpperCase() + terpene.slice(1).toLowerCase();

    const terpeneData = {
      Myrcene: {
        icon: "🥭",
        description: `Mango-like with earthy, musky notes. Known for sedative and relaxing effects. May help with sleep and muscle tension. Works well with THC and CBN for enhanced relaxation.`,
        taste: ["earthy", "herbal", "musky", "spicy", "tropical"]
      },
      Limonene: {
        icon: "🍋",
        description: `Citrusy and uplifting. Associated with mood elevation and stress relief. May help with anxiety and depression. Enhances the effects of CBD while potentially reducing THC anxiety.`,
        taste: ["citrus", "fresh", "zesty"]
      },
      Pinene: {
        icon: "🌲",
        description: `Fresh pine aroma. Promotes alertness and may improve memory. Could help with respiratory function. May counteract some THC memory effects.`,
        taste: ["earthy", "fresh", "pine", "sharp", "woody"]
      },
      Caryophyllene: {
        icon: "🌶️",
        description: `Spicy, peppery profile. Known for pain relief and anti-inflammatory properties. Unique ability to bind to CB2 receptors. Works synergistically with CBD.`,
        taste: ["spicy", "woody", "earthy", "peppery"]
      },
      Linalool: {
        icon: "🌸",
        description: `Floral and calming. Helps with anxiety and sleep. Works well with CBD and CBN for enhanced relaxation. Known for its lavender-like properties.`,
        taste: ["citrus", "floral", "herbal", "sweet"]
      },
      Humulene: {
        icon: "🍺",
        description: `Hoppy and earthy. May help with appetite control and inflammation. Works synergistically with CBD and CBG.`,
        taste: ["woody", "earthy", "spicy", "hoppy"]
      },
      Terpinolene: {
        icon: "🍏",
        description: `Complex aroma with floral and herbal notes. Has sedative properties and antioxidant benefits. Enhances effects of THC and CBN.`,
        taste: ["floral", "pine", "lime", "herbal"]
      },
      Ocimene: {
        icon: "🌿",
        description: `Sweet and herbaceous. Known for antiviral and anti-inflammatory properties. Works well with CBD for respiratory support.`,
        taste: ["citrus", "herbal", "sweet", "woody"]
      },
      Eucalyptol: {
        icon: "🌿",
        description: `Fresh and minty. Supports respiratory health and cognitive function. Enhanced effects when combined with THCV.`,
        taste: ["cool", "fresh", "medicinal", "mint"]
      },
      Nerolidol: {
        icon: "🌺",
        description: `Subtle floral aroma. Promotes restful sleep and has antifungal properties. Works well with CBN for enhanced sedative effects.`,
        taste: ["apple", "citrus", "floral", "woody"]
      },
      Geraniol: {
        icon: "🌹",
        description: `Sweet floral scent. Offers neuroprotective and antioxidant benefits. Enhanced effects when combined with CBD.`,
        taste: ["floral", "fruity", "sweet"]
      },
      Bisabolol: {
        icon: "🌼",
        description: `Gentle floral aroma. Known for anti-inflammatory and skin healing properties. Works synergistically with CBD and CBG.`,
        taste: ["chamomile-like", "floral", "sweet"]
      },
      Farnesene: {
        icon: "🍏",
        description: `Light citrus and green apple notes. Offers anti-inflammatory and antioxidant benefits. Enhanced effects with CBD.`,
        taste: ["citrus", "floral", "sweet", "woody"]
      },
      Phytol: {
        icon: "🍵",
        description: `Grassy, floral aroma. Supports sleep and anxiety relief. Works well with CBN for enhanced sleep benefits.`,
        taste: ["balsamic", "floral", "grassy", "green"]
      },
      Sabinene: {
        icon: "🌰",
        description: `Spicy woody aroma. Offers antioxidant and anti-inflammatory benefits. Enhanced effects when combined with CBD.`,
        taste: ["citrus", "spicy", "woody"]
      },
      Valencene: {
        icon: "🍊",
        description: `Sweet citrus aroma. Known for anti-inflammatory and mood-lifting properties. Works well with THC for enhanced effects.`,
        taste: ["citrus", "sweet"]
      }
    };

    const terpene_info = terpeneData[formattedTerpene];

    if (!terpene_info) {
      return {
        icon: "🌱",
        description: "A beneficial cannabis compound that contributes to the strain's unique effects.",
        taste: ["unique"]
      };
    }

    return {
      icon: terpene_info.icon,
      description: terpene_info.description,
      taste: terpene_info.taste
    };
  };

  if (loading) {
    return (
      <Fade in={true} timeout={1000}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '60vh',
            gap: 2,
            textAlign: 'center',
          }}
        >
          <CircularProgress size={60} />
          <Typography variant="h6" gutterBottom>
            Finding Your Perfect Strains
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Analyzing terpene profiles and generating personalized recommendations...
          </Typography>
        </Box>
      </Fade>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Fade in={true} timeout={500}>
          <Alert
            severity="error"
            variant="filled"
            action={
              <Button color="inherit" size="small" onClick={handleRetry}>
                Retry
              </Button>
            }
            sx={{ mb: 2 }}
          >
            <Typography variant="body2">{error}</Typography>
          </Alert>
        </Fade>
      </Container>
    );
  }

  return (
    <>
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Fade in={true} timeout={800}>
          <div>
            <Typography
              variant="h4"
              gutterBottom
              align="center"
              sx={{ mb: 3 }}
            >
              Your Personalized Cannabis Recommendations
            </Typography>

            <EducationalDisclaimer />

            {recommendations.length === 0 ? (
              <Alert severity="info" variant="filled" sx={{ mb: 2 }}>
                No recommendations found. Please complete the survey to get
                personalized recommendations based on terpene profiles.
              </Alert>
            ) : (
              <List>
                {recommendations.map((strain, index) => (
                  <Fade
                    in={true}
                    timeout={500 + index * 100}
                    key={strain.id || strain.name || index}
                  >
                    <Card
                      sx={{
                        mb: 2,
                        p: 2,
                        boxShadow: 3,
                        transition: 'transform 0.3s',
                        '&:hover': { transform: 'scale(1.02)' },
                      }}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography variant="h5">
                            {strain.name || 'Unnamed Strain'}
                          </Typography>
                          <IconButton
                            onClick={() => handleFavoriteToggle(strain)}
                            color={favorites.includes(strain.name) ? 'error' : 'default'}
                            sx={{ ml: 1 }}
                            aria-label={favorites.includes(strain.name) ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            {favorites.includes(strain.name) ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                          </IconButton>
                          <Button
                            onClick={() => handleStrainDetails(strain)}
                            sx={{ ml: 1 }}
                            startIcon={<InfoIcon />}
                          >
                            Details
                          </Button>
                        </Box>

                        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                          Modern Hybrid • Recommended based on terpene profile
                        </Typography>

                        {strain.effects && strain.effects.length > 0 && (
                          <Typography variant="body2" sx={{ mt: 2 }}>
                            <strong>Reported Effects:</strong>{' '}
                            {strain.effects.join(', ')}
                          </Typography>
                        )}

                        {strain.terpenes && strain.terpenes.length > 0 && (
                          <Box sx={{ mt: 2 }}>
                            <TerpeneInfo terpenes={strain.terpenes} />
                          </Box>
                        )}
                      </CardContent>

                      <CardActions sx={{ justifyContent: 'space-between', mt: 1 }}>
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          startIcon={<RateReviewIcon />}
                          onClick={() =>
                            navigate(
                              `/review/${encodeURIComponent(strain.name)}`
                            )
                          }
                          sx={{ '&:hover': { backgroundColor: 'primary.dark' } }}
                        >
                          Review
                        </Button>
                        <Box>
                          <Button
                            onClick={() => handleFeedback(strain, 'like')}
                            color={
                              feedbackStatus[strain.name] === 'like'
                                ? 'primary'
                                : 'default'
                            }
                            startIcon={<ThumbUpIcon />}
                            sx={{
                              '&:hover': {
                                backgroundColor:
                                  feedbackStatus[strain.name] === 'like'
                                    ? 'primary.light'
                                    : 'grey.300',
                              },
                            }}
                          >
                            Like
                          </Button>
                          <Button
                            onClick={() => handleFeedback(strain, 'dislike')}
                            color={
                              feedbackStatus[strain.name] === 'dislike'
                                ? 'error'
                                : 'default'
                            }
                            startIcon={<ThumbDownIcon />}
                            sx={{
                              '&:hover': {
                                backgroundColor:
                                  feedbackStatus[strain.name] === 'dislike'
                                    ? 'error.light'
                                    : 'grey.300',
                              },
                            }}
                          >
                            Dislike
                          </Button>
                        </Box>
                      </CardActions>
                    </Card>
                  </Fade>
                ))}
              </List>
            )}
          </div>
        </Fade>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </>
  );
};

export default Recommendations;
