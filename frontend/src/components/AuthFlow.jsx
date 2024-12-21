// src/components/AuthFlow.jsx
import React, { useState, useContext } from 'react';
import LoginForm from './LoginForm';
import OnboardingForm from './OnboardingForm';
import { AuthContext } from '../context/AuthContext';
import { Box, Button, Typography } from '@mui/material';

const AuthFlow = () => {
  const { user } = useContext(AuthContext);
  const [isLogin, setIsLogin] = useState(true);

  // If the user is already logged in, you might want to redirect them
  if (user) {
    // You can use React Router's Navigate component to redirect
    // return <Navigate to="/dashboard" />;
  }

  return (
    <Box sx={{ textAlign: 'center', padding: '20px' }}>
      <Typography variant="h4" gutterBottom>
        Welcome to Cannabis Recommender
      </Typography>
      <Box mb={2}>
        <Button
          variant={isLogin ? 'contained' : 'outlined'}
          onClick={() => setIsLogin(true)}
          sx={{ marginRight: 1 }}
        >
          Log In
        </Button>
        <Button
          variant={!isLogin ? 'contained' : 'outlined'}
          onClick={() => setIsLogin(false)}
        >
          Sign Up
        </Button>
      </Box>
      {isLogin ? <LoginForm /> : <OnboardingForm />}
    </Box>
  );
};

export default AuthFlow;
