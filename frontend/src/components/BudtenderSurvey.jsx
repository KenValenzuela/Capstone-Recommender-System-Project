import React, { useState, useContext, useEffect } from 'react';
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
  TextField,
  Box,
  Alert,
  AlertTitle,
  CircularProgress,
  Autocomplete,
  Chip,
  Paper,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import RelaxedIcon from '@mui/icons-material/SelfImprovement';
import HappyIcon from '@mui/icons-material/EmojiEmotions';
import SleepyIcon from '@mui/icons-material/Bedtime';
import InfoIcon from '@mui/icons-material/Info';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PrivacyTipIcon from '@mui/icons-material/PrivacyTip';
import MedicalInformationIcon from '@mui/icons-material/MedicalInformation';
import ScienceIcon from '@mui/icons-material/Science';

const terpeneList = [
  'Bisabolol',
  'Caryophyllene',
  'Eucalyptol',
  'Farnesene',
  'Geraniol',
  'Humulene',
  'Limonene',
  'Linalool',
  'Myrcene',
  'Nerolidol',
  'Ocimene',
  'Phytol',
  'Pinene',
  'Sabinene',
  'Terpinolene',
  'Valencene',
];

const conditionsList = [
  'Anxiety',
  'Chronic Pain',
  'Depression',
  'Insomnia',
  'Stress',
  'Headaches',
  'Appetite Loss',
  'Fibromyalgia',
  'Migraines',
  'Muscle Spasms',
];

const effectsList = [
  {
    name: 'Relaxed',
    description: 'Feeling calm and stress-free.',
    icon: <RelaxedIcon />,
  },
  {
    name: 'Happy',
    description: 'Uplifted mood.',
    icon: <HappyIcon />,
  },
  {
    name: 'Sleepy',
    description: 'Promotes restful sleep.',
    icon: <SleepyIcon />,
  },
];

const experienceLevels = ['Novice', 'Intermediate', 'Experienced'];

const EthicalDisclaimer = () => (
  <Box sx={{ mb: 4 }}>
    <Paper elevation={3} sx={{ p: 3, bgcolor: 'background.paper' }}>
      <Box display="flex" alignItems="center" mb={2}>
        <PrivacyTipIcon color="primary" sx={{ mr: 1 }} />
        <Typography variant="h6">Your Privacy & Data Protection</Typography>
      </Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        <AlertTitle>Data Privacy Notice</AlertTitle>
        • Our recommendation system is trained on synthetic data to protect user privacy
        <br />
        • Your personal preferences are encrypted and anonymized
        <br />
        • We never share individual user data with third parties
      </Alert>

      <Box display="flex" alignItems="center" mb={2} mt={3}>
        <MedicalInformationIcon color="warning" sx={{ mr: 1 }} />
        <Typography variant="h6">Medical Disclaimer</Typography>
      </Box>
      <Alert severity="warning">
        <AlertTitle>Important Health Information</AlertTitle>
        • Recommendations are based on reported experiences and the entourage effect
        <br />
        • This is not medical advice - consult healthcare professionals
        <br />
        • Individual responses to cannabis can vary significantly
      </Alert>

      <Box display="flex" alignItems="center" mb={2} mt={3}>
        <ScienceIcon color="info" sx={{ mr: 1 }} />
        <Typography variant="h6">The Entourage Effect</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" paragraph>
        The entourage effect refers to the synergistic interaction between cannabis compounds
        (cannabinoids and terpenes) that can enhance therapeutic benefits. Our recommendations
        consider these interactions to provide more personalized suggestions.
      </Typography>
    </Paper>
  </Box>
);

const BudtenderSurvey = () => {
  const { user, setSurveyCompleted } = useContext(AuthContext);
  const navigate = useNavigate();

  // State variables
  const [desiredEffects, setDesiredEffects] = useState([]);
  const [experienceLevel, setExperienceLevel] = useState('');
  const [familiarStrains, setFamiliarStrains] = useState([]);
  const [selectedTerpenes, setSelectedTerpenes] = useState([]);
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [availableStrains, setAvailableStrains] = useState([]);
  const [feedback, setFeedback] = useState({ message: '', type: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showEthicalInfo, setShowEthicalInfo] = useState(true);

  // Fetch available strains on component mount
  useEffect(() => {
    const fetchStrains = async () => {
      try {
        const response = await axios.get('/strains_list/');
        setAvailableStrains(response.data.strains);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching strains list:', error);
        setFeedback({
          message: 'Error loading strain list. Retrying...',
          type: 'error',
        });
        setTimeout(fetchStrains, 5000);
      }
    };

    fetchStrains();
  }, []);

  // Load user's existing survey data if available
  useEffect(() => {
    if (user?.preferences) {
      const {
        desired_effects,
        experience_level,
        familiar_strains,
        terpenes,
        may_relieve,
      } = user.preferences;

      if (desired_effects) setDesiredEffects(desired_effects);
      if (experience_level) setExperienceLevel(experience_level);
      if (familiar_strains) setFamiliarStrains(familiar_strains);
      if (terpenes) setSelectedTerpenes(terpenes);
      if (may_relieve) setSelectedConditions(may_relieve);
    }
  }, [user]);

  const handleEffectChange = (event) => {
    const value = event.target.name;
    setDesiredEffects((prev) =>
      event.target.checked
        ? [...prev, value]
        : prev.filter((effect) => effect !== value)
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback({ message: '', type: '' });

    // Validation
    if (desiredEffects.length === 0) {
      setFeedback({
        message: 'Please select at least one desired effect.',
        type: 'error',
      });
      return;
    }
    if (!experienceLevel) {
      setFeedback({
        message: 'Please select your experience level.',
        type: 'error',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await axios.post('/submit_survey/', {
        user_id: user.user_id,
        desired_effects: desiredEffects,
        experience_level: experienceLevel,
        familiar_strains: familiarStrains,
        terpenes: selectedTerpenes,
        may_relieve: selectedConditions,
      });

      setFeedback({
        message: 'Survey submitted successfully! Preparing your personalized recommendations...',
        type: 'success',
      });
      setSurveyCompleted(true);

      setTimeout(
        () => navigate('/recommendations', { state: { familiarStrains } }),
        2000
      );
    } catch (error) {
      console.error('Error submitting survey:', error);
      const errorMessage =
        error.response?.data?.detail ||
        'An error occurred while submitting the survey.';
      setFeedback({ message: errorMessage, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Container maxWidth="sm">
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="200px"
        >
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 6 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center" 
          sx={{ fontWeight: 'bold', mb: 3 }}>
          Let's Find Your Perfect Cannabis Match
        </Typography>

        {/* Ethical Considerations Section */}
        <Accordion 
          expanded={showEthicalInfo} 
          onChange={() => setShowEthicalInfo(!showEthicalInfo)}
          sx={{ mb: 4 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6" sx={{ fontWeight: 500 }}>
              Important Information & Disclaimers
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <EthicalDisclaimer />
          </AccordionDetails>
        </Accordion>

        {feedback.message && (
          <Alert severity={feedback.type} sx={{ width: '100%', mb: 3 }}>
            {feedback.message}
          </Alert>
        )}

        <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
          <Box component="form" onSubmit={handleSubmit}>
            {/* Desired Effects Section */}
            <FormControl component="fieldset" sx={{ mb: 4, width: '100%' }}>
              <FormLabel component="legend" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                What effects are you looking for today?
                <Tooltip title="Effects are based on aggregated user experiences and may vary by individual" arrow>
                  <InfoIcon sx={{ ml: 1, fontSize: '1rem' }} />
                </Tooltip>
              </FormLabel>
              <FormGroup>
                {effectsList.map((effect) => (
                  <FormControlLabel
                    key={effect.name}
                    control={
                      <Checkbox
                        checked={desiredEffects.includes(effect.name)}
                        onChange={handleEffectChange}
                        name={effect.name}
                      />
                    }
                    label={
                      <Box display="flex" alignItems="center">
                        {effect.icon}
                        <Box ml={1}>
                          <Typography variant="subtitle1">
                            {effect.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {effect.description}
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                ))}
              </FormGroup>
            </FormControl>

            {/* Experience Level Section */}
            <FormControl component="fieldset" sx={{ mb: 4, width: '100%' }}>
              <FormLabel component="legend" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                What's your experience level with cannabis?
                <Tooltip title="This helps us tailor recommendations to your comfort level" arrow>
                  <InfoIcon sx={{ ml: 1, fontSize: '1rem' }} />
                </Tooltip>
              </FormLabel>
              <RadioGroup
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                row
              >
                {experienceLevels.map((level) => (
                  <FormControlLabel
                    key={level}
                    value={level}
                    control={<Radio />}
                    label={level}
                  />
                ))}
              </RadioGroup>
            </FormControl>

            {/* Familiar Strains Section */}
            <FormControl component="fieldset" sx={{ mb: 4, width: '100%' }}>
              <FormLabel component="legend" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                Select strains you're familiar with
                <Tooltip title="This helps us understand your preferences and tolerance" arrow>
                  <InfoIcon sx={{ ml: 1, fontSize: '1rem' }} />
                </Tooltip>
              </FormLabel>
              <Autocomplete
                multiple
                id="familiar-strains"
                options={availableStrains}
                value={familiarStrains}
                onChange={(event, newValue) => {
                  setFamiliarStrains(newValue);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    variant="outlined"
                    placeholder="Search for strains..."
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      label={option}
                      {...getTagProps({ index })}
                      sx={{ m: 0.5 }}
                    />
                  ))
                }
              />
            </FormControl>

            {/* Terpene Profile Section */}
            <FormControl component="fieldset" sx={{ mb: 4, width: '100%' }}>
              <FormLabel component="legend" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                Select Terpenes You're Interested In
                <Tooltip title="Terpenes contribute to the entourage effect and overall experience" arrow>
                  <InfoIcon sx={{ ml: 1, fontSize: '1rem' }} />
                </Tooltip>
              </FormLabel>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Terpenes are aromatic compounds that contribute to the entourage effect and can enhance specific benefits.
              </Typography>
              <Autocomplete
                multiple
                id="terpenes"
                options={terpeneList}
                value={selectedTerpenes}
                onChange={(event, newValue) => {
                  setSelectedTerpenes(newValue);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    variant="outlined"
                    placeholder="Select terpenes..."
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      label={option}
                      {...getTagProps({ index })}
                      sx={{ m: 0.5 }}
                    />
                  ))
                }
              />
            </FormControl>

            {/* Conditions to Relieve Section */}
            <FormControl component="fieldset" sx={{ mb: 4, width: '100%' }}>
              <FormLabel component="legend" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                Select Conditions You'd Like to Relieve
                <Tooltip title="This information is used anonymously to provide better recommendations. Not medical advice." arrow>
                  <InfoIcon sx={{ ml: 1, fontSize: '1rem' }} />
                </Tooltip>
              </FormLabel>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                While cannabis may help with these conditions, always consult healthcare professionals for medical advice.
              </Typography>
              <Autocomplete
                multiple
                id="conditions"
                options={conditionsList}
                value={selectedConditions}
                onChange={(event, newValue) => {
                  setSelectedConditions(newValue);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    variant="outlined"
                    placeholder="Select conditions..."
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      label={option}
                      {...getTagProps({ index })}
                      sx={{ m: 0.5 }}
                    />
                  ))
                }
              />
            </FormControl>

            {/* Submit Section */}
            <Box sx={{ position: 'relative', mt: 4 }}>
              <Alert severity="info" sx={{ mb: 3 }}>
                <AlertTitle>Before You Submit</AlertTitle>
                • Your preferences help us provide personalized recommendations
                <br />
                • All data is anonymized and processed securely
                <br />
                • You can update your preferences at any time
              </Alert>

              <Button
                variant="contained"
                color="primary"
                type="submit"
                fullWidth
                disabled={isSubmitting}
                sx={{
                  py: 2,
                  fontSize: '1.1rem',
                  fontWeight: 500,
                  bgcolor: 'primary.main',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  }
                }}
              >
                {isSubmitting ? 'Processing...' : 'Get My Personalized Recommendations'}
              </Button>
              {isSubmitting && (
                <CircularProgress
                  size={24}
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    mt: '-12px',
                    ml: '-12px',
                  }}
                />
              )}
            </Box>
          </Box>
        </Paper>

        {/* Additional Information */}
        <Paper elevation={2} sx={{ p: 3, mt: 4, bgcolor: 'background.paper' }}>
          <Typography variant="subtitle1" gutterBottom fontWeight="500">
            How We Make Recommendations
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Our system uses advanced algorithms and the entourage effect principle to match you
            with strains that align with your preferences. We analyze terpene profiles,
            reported effects, and user experiences to provide personalized suggestions.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Remember: Cannabis affects everyone differently. Start low and go slow,
            especially if you're new to cannabis or trying a new strain.
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};

export default BudtenderSurvey;