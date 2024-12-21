// src/context/AuthContext.jsx
import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';

// Set the base URL for Axios to point to your FastAPI backend
axios.defaults.baseURL = 'http://localhost:8001';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // State variables
  const [user, setUser] = useState(null);
  const [userId, setUserId] = useState(null);
  const [ageVerified, setAgeVerified] = useState(false);
  const [surveyCompleted, setSurveyCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Clear authentication state wrapped in useCallback
  const clearAuthState = useCallback(() => {
    setUser(null);
    setUserId(null);
    localStorage.removeItem('userId');
    console.log('Auth state cleared.');
    setLoading(false);
  }, []);

  // Age verification function wrapped in useCallback
  const verifyAge = useCallback((isVerified) => {
    if (isVerified) {
      setAgeVerified(true);
      localStorage.setItem('ageVerified', 'true');
      console.log('Age verification successful.');
    } else {
      setAgeVerified(false);
      localStorage.removeItem('ageVerified');
      console.warn('Age verification failed.');
    }
  }, []);

  // Fetch user profile from the backend wrapped in useCallback
  const fetchUserProfile = useCallback(async () => {
    if (!userId) {
      console.warn('fetchUserProfile called without valid userId');
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching user profile...');
      const response = await axios.get(`/profile/${userId}`);
      const fetchedUser = response.data.profile;
      console.log('User profile fetched:', fetchedUser);
      setUser(fetchedUser);
      setSurveyCompleted(fetchedUser.survey_completed || false);
      setAuthError(null);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setAuthError('Failed to fetch user profile. Please log in again.');
      clearAuthState();
    } finally {
      setLoading(false);
    }
  }, [userId, clearAuthState]);

  // Load authentication state from localStorage on component mount
  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) {
      setUserId(parseInt(storedUserId, 10));
      console.log('User ID loaded from localStorage.');
    } else {
      clearAuthState();
    }
  }, [clearAuthState]);

  // Fetch user profile when userId changes
  useEffect(() => {
    if (userId) {
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, [userId, fetchUserProfile]);

  // Login function wrapped in useCallback
  const login = useCallback(async (email, password) => {
    try {
      const response = await axios.post('/login/', { email, password });
      const data = response.data;

      // Assuming the backend returns user data in data.user
      setUserId(data.user.user_id);
      localStorage.setItem('userId', data.user.user_id.toString());
      setAuthError(null);
      fetchUserProfile();
    } catch (error) {
      console.error('Login error:', error);
      setAuthError('Login failed. Please check your credentials.');
      clearAuthState();
    }
  }, [fetchUserProfile, clearAuthState]);

  // Sign up function wrapped in useCallback
  const signup = useCallback(async (email, password) => {
    try {
      const response = await axios.post('/onboarding/', { email, password });
      const data = response.data;

      // Assuming the backend returns user data in data.user
      setUserId(data.user.user_id);
      localStorage.setItem('userId', data.user.user_id.toString());
      setAuthError(null);
      fetchUserProfile();
    } catch (error) {
      console.error('Signup error:', error);
      setAuthError('Signup failed. Please try again.');
      clearAuthState();
    }
  }, [fetchUserProfile, clearAuthState]);

  // Logout function wrapped in useCallback
  const logout = useCallback(() => {
    clearAuthState();
  }, [clearAuthState]);

  // Context value to be provided to consumers
  const contextValue = useMemo(
    () => ({
      user,
      userId,
      ageVerified,
      surveyCompleted,
      setUser,
      setUserId,
      setAgeVerified,
      setSurveyCompleted,
      loading,
      authError,
      verifyAge,
      login,
      signup,
      logout,
    }),
    [
      user,
      userId,
      ageVerified,
      surveyCompleted,
      loading,
      authError,
      verifyAge,
      login,
      signup,
      logout,
    ]
  );

  // Render the provider
  return (
    <AuthContext.Provider value={contextValue}>
      {loading ? <div>Loading your content...</div> : children}
    </AuthContext.Provider>
  );
};
