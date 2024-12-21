// src/components/ReviewForm.jsx

import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Container,
  Typography,
  Box,
  Rating,
  TextField,
  Button,
  Paper,
  Slider,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Card,
  CardContent,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  Group as GroupIcon,
  Psychology as PsychologyIcon,
  TrendingUp as TrendingUpIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { AuthContext } from '../context/AuthContext';

const effects = [
  'Relaxed',
  'Euphoric',
  'Happy',
  'Uplifted',
  'Focused',
  'Creative',
  'Energetic',
  'Sleepy',
  'Pain Relief',
  'Stress Relief',
];

const metricDescriptions = {
  potency: "Rate the strength and intensity of the effects",
  taste: "Evaluate the flavor profile and overall taste experience",
  aroma: "Rate the strength and appeal of the smell",
  value: "Consider the quality relative to cost"
};

const ReviewForm = () => {
  const { strainId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [strainInfo, setStrainInfo] = useState(null);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState({ open: false, message: '', severity: 'info' });
  const [confirmDialog, setConfirmDialog] = useState(false);

  // Review form state
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [selectedEffects, setSelectedEffects] = useState([]);
  const [metrics, setMetrics] = useState({
    potency: 5,
    taste: 5,
    aroma: 5,
    value: 5,
  });

  useEffect(() => {
    fetchStrainInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strainId]);

  const fetchStrainInfo = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/strain/${encodeURIComponent(strainId)}`);
      setStrainInfo(response.data);
    } catch (error) {
      console.error('Error fetching strain info:', error);
      setError('Error fetching strain info. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleEffectToggle = (effect) => {
    setSelectedEffects((prev) =>
      prev.includes(effect) ? prev.filter((e) => e !== effect) : [...prev, effect]
    );
  };

  const handleSubmit = async () => {
    if (!rating) {
      setFeedback({
        open: true,
        message: 'Please provide a rating before submitting.',
        severity: 'error',
      });
      return;
    }

    setLoading(true);
    try {
      await axios.post('/review/', {
        user_id: user.user_id,
        strain_name: strainInfo.name,
        rating: rating,
        text: text,
        metrics: metrics,
        effects: selectedEffects
      });

      setFeedback({
        open: true,
        message: 'Review submitted successfully! Your contribution helps improve recommendations for everyone.',
        severity: 'success',
      });

      navigate('/profile');
    } catch (error) {
      console.error('Error submitting review:', error);
      setFeedback({
        open: true,
        message: error.response?.data?.detail || 'Error submitting review. Please try again.',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && !strainInfo) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!strainInfo) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Typography variant="h6">Strain information not available.</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 6 }}>
      {/* Community Impact Card */}
      <Card sx={{ mb: 4, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
        <CardContent>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GroupIcon /> Your Review Matters
          </Typography>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <PsychologyIcon />
                <Typography variant="body2">
                  Helps our AI understand your preferences for better recommendations
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <GroupIcon />
                <Typography variant="body2">
                  Connects you with users who share similar experiences
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <TrendingUpIcon />
                <Typography variant="body2">
                  Improves strain recommendations for the entire community
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Review {strainInfo.name}
        </Typography>

        <Snackbar
          open={feedback.open}
          autoHideDuration={6000}
          onClose={() => setFeedback({ ...feedback, open: false })}
        >
          <Alert severity={feedback.severity}>{feedback.message}</Alert>
        </Snackbar>

        {/* Overall Rating Section */}
        <Box sx={{ my: 3 }}>
          <Typography variant="h6" gutterBottom>Overall Rating</Typography>
          <Rating
            size="large"
            value={rating}
            onChange={(event, newValue) => setRating(newValue)}
            precision={0.5}
          />
          <Typography variant="body2" color="textSecondary">
            {rating === 0 ? 'Select a rating' : `${rating} out of 5 stars`}
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Detailed Metrics Section */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Detailed Rating</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {Object.entries(metrics).map(([metric, value]) => (
              <Box key={metric} sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography>{metric.charAt(0).toUpperCase() + metric.slice(1)}</Typography>
                  <Tooltip title={metricDescriptions[metric]} placement="right">
                    <IconButton size="small">
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Slider
                  value={value}
                  onChange={(e, newValue) =>
                    setMetrics((prev) => ({ ...prev, [metric]: newValue }))
                  }
                  step={1}
                  min={1}
                  max={10}
                  valueLabelDisplay="auto"
                  marks
                  sx={{ width: '100%', mt: 1 }}
                />
                <Typography variant="body2" color="textSecondary" align="right">
                  {value}/10
                </Typography>
              </Box>
            ))}
          </AccordionDetails>
        </Accordion>

        <Divider sx={{ my: 3 }} />

        {/* Effects Section */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Effects Experienced</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {effects.map((effect) => (
                <Chip
                  key={effect}
                  label={effect}
                  onClick={() => handleEffectToggle(effect)}
                  color={selectedEffects.includes(effect) ? 'primary' : 'default'}
                  variant={selectedEffects.includes(effect) ? 'filled' : 'outlined'}
                  sx={{
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                    },
                  }}
                />
              ))}
            </Box>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
              Select all effects you experienced with this strain
            </Typography>
          </AccordionDetails>
        </Accordion>

        {/* Review Text Section */}
        <Box sx={{ mt: 3 }}>
          <TextField
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            label="Your Review"
            placeholder="Share your experience with this strain... What made it unique? When would you recommend using it?"
            value={text}
            onChange={(e) => setText(e.target.value)}
            sx={{ my: 3 }}
          />
        </Box>

        {/* Submit Button */}
        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={() => setConfirmDialog(true)}
          disabled={loading || !rating}
          sx={{
            mt: 4,
            height: 48,
            textTransform: 'none',
            fontSize: '1.1rem'
          }}
        >
          {loading ? <CircularProgress size={24} /> : 'Submit Review'}
        </Button>
      </Paper>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog}
        onClose={() => setConfirmDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Confirm Review Submission
        </DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Are you sure you want to submit this review? Your contribution will:
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <GroupIcon fontSize="small" color="primary" /> Help others find the right strain
            </Typography>
            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <PsychologyIcon fontSize="small" color="primary" /> Improve personalized recommendations
            </Typography>
            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrendingUpIcon fontSize="small" color="primary" /> Enhance the community knowledge base
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setConfirmDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              setConfirmDialog(false);
              handleSubmit();
            }}
            variant="contained"
            color="primary"
          >
            Submit Review
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ReviewForm;