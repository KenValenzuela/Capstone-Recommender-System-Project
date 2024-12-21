// src/components/Survey.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Container,
  Typography,
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  RadioGroup,
  Radio,
  Button,
  Autocomplete,
  TextField,
  Box,
  Icon,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import RelaxedIcon from '@mui/icons-material/SelfImprovement';
import HappyIcon from '@mui/icons-material/EmojiEmotions';
import SleepyIcon from '@mui/icons-material/Bedtime';

const effectsList = [
  { name: 'Relaxed', description: 'Feeling calm and stress-free, perfect for unwinding.', icon: <RelaxedIcon /> },
  { name: 'Happy', description: 'Uplifted mood, great for social situations or enjoying yourself.', icon: <HappyIcon /> },
  { name: 'Euphoric', description: 'A blissful, floating feeling that can enhance creativity.' },
  { name: 'Uplifted', description: 'Boosts your mood and energy, ideal for staying productive.' },
  { name: 'Creative', description: 'Helps you think outside the box, perfect for artistic pursuits.' },
  { name: 'Focused', description: 'Enhances concentration, great for getting tasks done.' },
  { name: 'Sleepy', description: 'Promotes restful sleep, ideal for winding down at night.', icon: <SleepyIcon /> },
  { name: 'Energetic', description: 'Gives you a boost of energy, great for daytime activities.' },
  { name: 'Social', description: 'Increases sociability, perfect for gatherings and meeting new people.' },
  { name: 'Body High', description: 'A relaxing sensation throughout the body, perfect for easing tension.' },
  { name: 'Appetite Boost', description: 'Helps stimulate your appetite, ideal if you need a bit of a hunger boost.' },
];

const experienceLevels = ['Novice', 'Intermediate', 'Experienced'];

function Survey({ user, setSurveyCompleted }) {
  const [desiredEffects, setDesiredEffects] = useState([]);
  const [experienceLevel, setExperienceLevel] = useState('');
  const [triedStrains, setTriedStrains] = useState([]);
  const [availableStrains, setAvailableStrains] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch the list of available strains from the backend
    const fetchStrains = async () => {
      try {
        const response = await axios.get('http://localhost:8001/strains_list/');
        setAvailableStrains(response.data.strains);
      } catch (error) {
        console.error('Error fetching strains:', error);
        setErrorMessage('Failed to load strains for selection.');
      }
    };
    fetchStrains();
  }, []);

  const handleEffectChange = (event) => {
    const value = event.target.name;
    setDesiredEffects((prev) =>
      event.target.checked ? [...prev, value] : prev.filter((effect) => effect !== value)
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    // Input validation
    if (desiredEffects.length === 0) {
      setErrorMessage('Please select at least one desired effect.');
      return;
    }
    if (!experienceLevel) {
      setErrorMessage('Please select your experience level.');
      return;
    }

    setIsLoading(true);

    try {
      // Prepare tried strains data
      const triedStrainsData = triedStrains.map((strain) => ({
        strain_id: strain.strain_id,
      }));

      // Send the survey data to the backend
      await axios.post('http://localhost:8001/submit_survey/', {
        user_id: user.user_id,
        desired_effects: desiredEffects,
        experience_level: experienceLevel,
        tried_strains: triedStrainsData,
      });
      setSurveyCompleted(true);
      navigate('/recommendations');
    } catch (error) {
      console.error('Error submitting survey:', error);
      const errorDetail = error.response?.data?.detail || 'An unexpected error occurred.';
      setErrorMessage(errorDetail);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" style={{ marginTop: '2em' }}>
      <Typography variant="h4" gutterBottom>
        Welcome! Let's Find the Perfect Strain for You
      </Typography>
      <Typography variant="body1" gutterBottom>
        Hey there! I'm here to help you find the perfect strain that matches your preferences. Let's start by getting to know what you enjoy and your experience level. Take your time—I'm here to make sure you leave with a smile!
      </Typography>
      {errorMessage && (
        <Typography variant="body1" color="error" gutterBottom>
          {errorMessage}
        </Typography>
      )}
      {experienceLevel && (
        <Typography variant="body2" gutterBottom>
          {experienceLevel === 'Novice' && "It's awesome that you're starting your journey—I'm here to help every step of the way!"}
          {experienceLevel === 'Intermediate' && "Great, you've got some experience! Let's find something to elevate your experience further."}
          {experienceLevel === 'Experienced' && "Awesome, seasoned connoisseur! I think you're going to love these more nuanced effects."}
        </Typography>
      )}
      <form onSubmit={handleSubmit}>
        <FormControl component="fieldset" margin="normal">
          <FormLabel component="legend">What effects are you looking for today?</FormLabel>
          <Typography variant="body2" style={{ marginBottom: '0.5em' }}>
            Whether you're looking to relax after a long day, get energized for a fun activity, or boost your creativity, let me know! Your choices help me make personalized recommendations.
          </Typography>
          <FormGroup>
            {effectsList.map((effect) => (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={desiredEffects.includes(effect.name)}
                    onChange={handleEffectChange}
                    name={effect.name}
                  />
                }
                label={
                  <Box display="flex" alignItems="center">
                    {effect.icon && (
                      <Icon style={{ marginRight: '0.5em' }}>
                        {effect.icon}
                      </Icon>
                    )}
                    {effect.name} - {effect.description}
                  </Box>
                }
                key={effect.name}
              />
            ))}
          </FormGroup>
        </FormControl>
        <FormControl component="fieldset" margin="normal">
          <FormLabel component="legend">What's your experience level with cannabis?</FormLabel>
          <Typography variant="body2" style={{ marginBottom: '0.5em' }}>
            Whether you're just starting out, have some experience, or are a seasoned connoisseur, knowing this helps me suggest the best options for you.
          </Typography>
          <RadioGroup
            value={experienceLevel}
            onChange={(e) => setExperienceLevel(e.target.value)}
          >
            {experienceLevels.map((level) => (
              <FormControlLabel
                value={level}
                control={<Radio />}
                label={level}
                key={level}
              />
            ))}
          </RadioGroup>
        </FormControl>
        <FormControl component="fieldset" margin="normal" fullWidth>
          <FormLabel component="legend">Have you tried any strains before that you really liked?</FormLabel>
          <Typography variant="body2" style={{ marginBottom: '0.5em' }}>
            Sharing your favorites helps me make better recommendations. If you remember any strains that made a positive impression, just type them in—even a partial name works! I'll do my best to match it.
          </Typography>
          <Autocomplete
            multiple
            options={availableStrains}
            getOptionLabel={(option) => option.name}
            onChange={(event, newValue) => {
              setTriedStrains(newValue);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                variant="standard"
                placeholder="Select Strains"
              />
            )}
          />
        </FormControl>
        <Button
          variant="contained"
          color="primary"
          type="submit"
          fullWidth
          style={{ marginTop: '1.5em' }}
          disabled={isLoading}
        >
          {isLoading ? 'Submitting...' : 'Submit & Find My Recommendations'}
        </Button>
      </form>
    </Container>
  );
}

export default Survey;
