// src/components/ProtectedRoute.jsx
import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ children, requireSurvey = false }) => {
  const { user, surveyCompleted, ageVerified } = useContext(AuthContext);

  if (!ageVerified) {
    // User hasn't completed age verification
    return <Navigate to="/" replace />;
  }

  if (!user) {
    // User is not authenticated
    return <Navigate to="/signup" replace />;
  }

  if (requireSurvey && !surveyCompleted) {
    // User is authenticated but hasn't completed the survey
    return <Navigate to="/survey" replace />;
  }

  // User is authenticated and survey requirements are met
  return children;
};

export default ProtectedRoute;
