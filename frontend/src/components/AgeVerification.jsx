import React, { useContext, useState, useEffect } from 'react';
import {
  Button,
  Typography,
  Box,
  Paper,
  Fade,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  VerifiedUser as VerifiedUserIcon,
  Warning as WarningIcon,
  Block as BlockIcon
} from '@mui/icons-material';
import PropTypes from 'prop-types';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

/**
 * Constants for age verification
 */
const MINIMUM_AGE = 21;
const CURRENT_YEAR = new Date().getFullYear();
const BIRTH_YEARS = Array.from(
  { length: 100 },
  (_, i) => CURRENT_YEAR - i - 15
).reverse();

/**
 * AgeVerification component with enhanced user experience and accessibility
 * @param {Object} props - Component props
 * @param {number} props.minimumAge - Minimum required age (defaults to 21)
 * @returns {JSX.Element}
 */
const AgeVerification = ({ minimumAge = MINIMUM_AGE }) => {
  const { verifyAge } = useContext(AuthContext);
  const navigate = useNavigate();

  // Component state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDetailedVerification, setShowDetailedVerification] = useState(false);
  const [selectedYear, setSelectedYear] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [mounted, setMounted] = useState(false);

  /**
   * Effect to handle component mount animation
   */
  useEffect(() => {
    setMounted(true);

    // Add event listener for back button/navigation
    const handleBeforeUnload = (e) => {
      if (!localStorage.getItem('ageVerified')) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  /**
   * Calculates age from birth year
   */
  const calculateAge = (birthYear) => {
    return CURRENT_YEAR - birthYear;
  };

  /**
   * Handles simple age verification
   */
  const handleSimpleVerification = async () => {
    try {
      setLoading(true);
      setError('');
      await verifyAge(true);
      navigate('/login');
    } catch (error) {
      setError('Age verification failed. Please try again.');
      setLoading(false);
    }
  };

  /**
   * Handles detailed age verification
   */
  const handleDetailedVerification = async () => {
    if (!selectedYear || !termsAccepted) {
      setError('Please complete all required fields.');
      return;
    }

    const age = calculateAge(selectedYear);
    if (age < minimumAge) {
      setShowExitDialog(true);
      return;
    }

    try {
      setLoading(true);
      setError('');
      await verifyAge(true);
      navigate('/login');
    } catch (error) {
      setError('Age verification failed. Please try again.');
      setLoading(false);
    }
  };

  /**
   * Handles exit for underage users
   */
  const handleExit = () => {
    window.location.href = 'https://www.google.com';
  };

  /**
   * Renders the exit dialog for underage users
   */
  const renderExitDialog = () => (
    <Dialog
      open={showExitDialog}
      onClose={() => setShowExitDialog(false)}
      aria-labelledby="exit-dialog-title"
    >
      <DialogTitle id="exit-dialog-title">
        <Box display="flex" alignItems="center" gap={1}>
          <BlockIcon color="error" />
          <Typography variant="h6">Access Denied</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography>
          We apologize, but you must be {minimumAge} years or older to access this site.
          You will be redirected to a safe page.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={handleExit}
          color="primary"
          variant="contained"
          autoFocus
        >
          I Understand
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Fade in={mounted} timeout={800}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          p: 3,
          background: 'linear-gradient(to bottom, #1a1a1a, #2d2d2d)'
        }}
      >
        <Paper
          elevation={8}
          sx={{
            p: 4,
            maxWidth: 500,
            width: '100%',
            borderRadius: 2,
            backgroundColor: 'rgba(255, 255, 255, 0.95)'
          }}
        >
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            gap={3}
          >
            <VerifiedUserIcon
              color="primary"
              sx={{ fontSize: 48 }}
            />

            <Typography
              variant="h4"
              component="h1"
              align="center"
              fontWeight="bold"
              color="primary"
            >
              Age Verification Required
            </Typography>

            <Typography
              variant="body1"
              align="center"
              color="text.secondary"
              sx={{ mb: 2 }}
            >
              You must be {minimumAge} or older to access this site.
              Please verify your age to continue.
            </Typography>

            {error && (
              <Alert
                severity="error"
                sx={{ width: '100%' }}
              >
                {error}
              </Alert>
            )}

            {!showDetailedVerification ? (
              <Box
                display="flex"
                flexDirection="column"
                gap={2}
                width="100%"
              >
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={handleSimpleVerification}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : null}
                >
                  I am {minimumAge} or older
                </Button>

                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => setShowDetailedVerification(true)}
                  disabled={loading}
                >
                  Enter Birth Year Instead
                </Button>
              </Box>
            ) : (
              <Box
                display="flex"
                flexDirection="column"
                gap={2}
                width="100%"
              >
                <FormControl fullWidth>
                  <InputLabel id="birth-year-label">Birth Year</InputLabel>
                  <Select
                    labelId="birth-year-label"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    label="Birth Year"
                  >
                    {BIRTH_YEARS.map((year) => (
                      <MenuItem key={year} value={year}>
                        {year}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      color="primary"
                    />
                  }
                  label="I confirm that the information provided is accurate"
                />

                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={handleDetailedVerification}
                  disabled={loading || !selectedYear || !termsAccepted}
                  startIcon={loading ? <CircularProgress size={20} /> : null}
                >
                  Verify Age
                </Button>

                <Button
                  variant="text"
                  color="primary"
                  onClick={() => setShowDetailedVerification(false)}
                  disabled={loading}
                >
                  Back
                </Button>
              </Box>
            )}

            <Box
              sx={{
                mt: 2,
                p: 2,
                bgcolor: 'warning.light',
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              <WarningIcon color="warning" />
              <Typography variant="body2" color="warning.dark">
                By proceeding, you acknowledge that you are legally permitted to access this content in your jurisdiction.
              </Typography>
            </Box>
          </Box>
        </Paper>

        {renderExitDialog()}
      </Box>
    </Fade>
  );
};

AgeVerification.propTypes = {
  minimumAge: PropTypes.number
};

export default AgeVerification;