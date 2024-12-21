// src/App.js

import React, { useEffect, useContext } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import AgeVerification from './components/AgeVerification';
import LoginForm from './components/LoginForm';
import OnboardingForm from './components/OnboardingForm'; // Sign Up
import BudtenderSurvey from './components/BudtenderSurvey';
import Recommendations from './components/Recommendations';
import Profile from './components/Profile';
import NavBar from './components/NavBar'; // Import the NavBar
import ProtectedRoute from './components/ProtectedRoute';
import ReviewForm from './components/ReviewForm'; // Import ReviewForm
import './App.css';

const AppRouter = () => {
  const {
    ageVerified,
    setAgeVerified,
    user,
    surveyCompleted,
    loading,
  } = useContext(AuthContext);

  const isAuthenticated = !!user;

  useEffect(() => {
    const verified = localStorage.getItem('ageVerified');
    if (verified === 'true') {
      setAgeVerified(true);
    }
  }, [setAgeVerified]);

  if (loading) {
    return <div>Loading your content...</div>;
  }

  return (
    <div className="app-container">
      {/* Show NavBar only after age verification */}
      {ageVerified && <NavBar />}

      <Routes>
        <Route
          path="/"
          element={
            ageVerified ? (
              isAuthenticated ? (
                surveyCompleted ? (
                  <Navigate to="/recommendations" replace />
                ) : (
                  <Navigate to="/survey" replace />
                )
              ) : (
                <Navigate to="/signup" replace />
              )
            ) : (
              <AgeVerification />
            )
          }
        />
        <Route
          path="/signup"
          element={
            ageVerified ? (
              !isAuthenticated ? (
                <OnboardingForm />
              ) : (
                <Navigate
                  to={surveyCompleted ? '/recommendations' : '/survey'}
                  replace
                />
              )
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/login"
          element={
            ageVerified ? (
              !isAuthenticated ? (
                <LoginForm />
              ) : (
                <Navigate
                  to={surveyCompleted ? '/recommendations' : '/survey'}
                  replace
                />
              )
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/survey"
          element={
            <ProtectedRoute>
              <BudtenderSurvey />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recommendations"
          element={
            <ProtectedRoute requireSurvey>
              <Recommendations />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/review/:strainId"
          element={
            <ProtectedRoute>
              <ReviewForm />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}

export default App;
