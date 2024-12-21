// src/components/StrainDetails.jsx

import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Button,
  Box,
  Paper,
  CircularProgress,
  Alert,
  Snackbar,
  IconButton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const StrainDetails = () => {
  const { strain_name } = useParams();
  const navigate = useNavigate();
  const { userId } = useContext(AuthContext);

  const [strainDetails, setStrainDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info',
  });

  useEffect(() => {
    if (userId) {
      fetchFavorites();
    }
    fetchStrainDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strain_name, userId]);

  const fetchFavorites = async () => {
    try {
      const response = await axios.get(`/favorites/${userId}`);
      setFavorites(response.data.favorites);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      // Handle error if necessary
    }
  };

  const fetchStrainDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`/strain/${encodeURIComponent(strain_name)}`);

      if (response.data) {
        setStrainDetails(response.data);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error fetching strain details:', error);
      const errorMessage =
        error.response?.data?.detail || 'Unable to fetch strain details.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleFavoriteToggle = async () => {
    if (!userId) {
      setSnackbar({
        open: true,
        message: 'Please log in to manage favorites.',
        severity: 'warning',
      });
      return;
    }

    const isFavorite = favorites.includes(strainDetails.name);
    try {
      if (isFavorite) {
        // Remove from favorites
        await axios.delete(`/favorites/`, { data: { user_id: userId, strain_name: strainDetails.name } });
        setFavorites((prev) => prev.filter((fav) => fav !== strainDetails.name));
        setSnackbar({
          open: true,
          message: `"${strainDetails.name}" removed from favorites.`,
          severity: 'info',
        });
      } else {
        // Add to favorites
        await axios.post(`/favorites/`, { user_id: userId, strain_name: strainDetails.name });
        setFavorites((prev) => [...prev, strainDetails.name]);
        setSnackbar({
          open: true,
          message: `"${strainDetails.name}" added to favorites!`,
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

  const handleGoBack = () => {
    navigate(-1); // Navigate back to the previous page
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Box
          display="flex"
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          minHeight="60vh"
          gap={2}
          textAlign="center"
        >
          <CircularProgress size={60} />
          <Typography variant="h6" gutterBottom>
            Loading Strain Details
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Please wait while we fetch the details...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert
          severity="error"
          variant="filled"
          action={
            <Button color="inherit" size="small" onClick={fetchStrainDetails}>
              Retry
            </Button>
          }
          sx={{ mb: 2 }}
        >
          <Typography variant="body2">{error}</Typography>
        </Alert>
        <Button
          variant="contained"
          color="primary"
          startIcon={<ArrowBackIcon />}
          onClick={handleGoBack}
        >
          Go Back
        </Button>
      </Container>
    );
  }

  return (
    <>
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h4" gutterBottom>
              {strainDetails.name || 'Strain Details'}
            </Typography>
            <IconButton
              onClick={handleFavoriteToggle}
              color={favorites.includes(strainDetails.name) ? 'error' : 'default'}
              aria-label={favorites.includes(strainDetails.name) ? 'Remove from favorites' : 'Add to favorites'}
            >
              {favorites.includes(strainDetails.name) ? <FavoriteIcon /> : <FavoriteBorderIcon />}
            </IconButton>
          </Box>

          {/* Display Strain Information */}
          <Typography variant="body1" gutterBottom>
            <strong>Type:</strong> {strainDetails.type || 'Hybrid'}
          </Typography>
          <Typography variant="body1" gutterBottom>
            <strong>Effects:</strong> {strainDetails.effects.join(', ') || 'N/A'}
          </Typography>
          <Typography variant="body1" gutterBottom>
            <strong>Terpenes:</strong> {strainDetails.terpenes.join(', ') || 'N/A'}
          </Typography>
          <Typography variant="body1" gutterBottom>
            <strong>May Relieve:</strong> {strainDetails.may_relieve.join(', ') || 'N/A'}
          </Typography>
          <Typography variant="body1" gutterBottom>
            <strong>Rating:</strong> {strainDetails.rating || 'N/A'}
          </Typography>

          {/* Placeholder for Chatbot Integration */}
          <Box sx={{ mt: 4 }}>
            <Typography variant="h5" gutterBottom>
              Chat with our AI Budtender
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              This feature is under construction. Please check back later! 😊
            </Typography>
            {/* Future Integration Point for Chatbot */}
          </Box>

          <Button
            variant="contained"
            color="primary"
            startIcon={<ArrowBackIcon />}
            onClick={handleGoBack}
            sx={{ mt: 3 }}
          >
            Go Back
          </Button>
        </Paper>

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

export default StrainDetails;
