import React, { useContext, useState } from 'react';
import axios from 'axios';
import {
  Container,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Link
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const passwordRegex = {
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  number: /[0-9]/,
  special: /[^A-Za-z0-9]/
};

const OnboardingForm = () => {
  const { setUser, setAuthToken, setUserId } = useContext(AuthContext);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validatePassword = (password) => {
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (!passwordRegex.uppercase.test(password)) return 'Password must contain at least one uppercase letter';
    if (!passwordRegex.lowercase.test(password)) return 'Password must contain at least one lowercase letter';
    if (!passwordRegex.number.test(password)) return 'Password must contain at least one number';
    if (!passwordRegex.special.test(password)) return 'Password must contain at least one special character';
    return '';
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return 'Email is required';
    if (!emailRegex.test(email)) return 'Please enter a valid email address';
    return '';
  };

  const validateForm = () => {
    const newErrors = {};

    // Validate email
    const emailError = validateEmail(formData.email);
    if (emailError) newErrors.email = emailError;

    // Validate password
    const passwordError = validatePassword(formData.password);
    if (passwordError) newErrors.password = passwordError;

    // Validate password confirmation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords don't match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear errors when user starts typing
    setErrors((prev) => ({ ...prev, [name]: '' }));
    setServerError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!validateForm()) return;

    setIsSubmitting(true);
    setServerError(null);

    try {
      const response = await axios.post('http://localhost:8001/onboarding/', {
        email: formData.email,
        password: formData.password,
      });

      const { user: userData, token } = response.data;

      // Update authentication state
      setUser(userData);
      setUserId(userData.user_id);
      setAuthToken(token);

      // Store authentication data
      sessionStorage.setItem('authToken', token);
      sessionStorage.setItem('userId', userData.user_id);

      // Clear form and navigate with userId passed as state
      setFormData({ email: '', password: '', confirmPassword: '' });
      navigate('/survey', {
        state: { userId: userData.user_id, message: 'Registration successful!' }
      });

    } catch (error) {
      console.error('Onboarding error:', error);

      if (error.response?.status === 409) {
        setErrors((prev) => ({
          ...prev,
          email: 'This email is already registered'
        }));
      } else if (error.response?.data?.field) {
        setErrors((prev) => ({
          ...prev,
          [error.response.data.field]: error.response.data.detail
        }));
      } else {
        setServerError(
          error.response?.data?.detail || 'An unexpected error occurred. Please try again.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        component="main"
        sx={{
          marginTop: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: 3,
          boxShadow: 2,
          borderRadius: 2,
          backgroundColor: 'background.paper'
        }}
      >
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          sx={{ mb: 3 }}
        >
          Create Account
        </Typography>

        {serverError && (
          <Alert
            severity="error"
            sx={{ width: '100%', mb: 2 }}
            onClose={() => setServerError(null)}
          >
            {serverError}
          </Alert>
        )}

        <Box
          component="form"
          onSubmit={handleSubmit}
          noValidate
          sx={{ width: '100%' }}
        >
          <TextField
            name="email"
            id="email"
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={handleChange}
            variant="outlined"
            fullWidth
            margin="normal"
            error={Boolean(errors.email)}
            helperText={errors.email}
            disabled={isSubmitting}
            autoComplete="email"
            inputProps={{
              'aria-label': 'Email Address',
            }}
          />

          <TextField
            name="password"
            id="password"
            label="Password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            variant="outlined"
            fullWidth
            margin="normal"
            error={Boolean(errors.password)}
            helperText={errors.password}
            disabled={isSubmitting}
            autoComplete="new-password"
            inputProps={{
              'aria-label': 'Password',
            }}
          />

          <TextField
            name="confirmPassword"
            id="confirmPassword"
            label="Confirm Password"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            variant="outlined"
            fullWidth
            margin="normal"
            error={Boolean(errors.confirmPassword)}
            helperText={errors.confirmPassword}
            disabled={isSubmitting}
            autoComplete="new-password"
            inputProps={{
              'aria-label': 'Confirm Password',
            }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            disabled={isSubmitting}
            sx={{
              mt: 3,
              mb: 2,
              height: 56,
              position: 'relative'
            }}
          >
            {isSubmitting ? (
              <CircularProgress
                size={24}
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  marginTop: '-12px',
                  marginLeft: '-12px',
                }}
              />
            ) : 'Sign Up'}
          </Button>

          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography variant="body2" color="textSecondary">
              Already have an account?{' '}
              <Link
                href="/login"
                underline="hover"
                sx={{ cursor: 'pointer' }}
              >
                Sign in
              </Link>
            </Typography>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default OnboardingForm;
