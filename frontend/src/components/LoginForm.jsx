// src/components/LoginForm.jsx
import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { TextField, Button, Typography } from '@mui/material';

const LoginForm = () => {
  const { login, authError } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    await login(email, password);
    // Additional logic if needed
  };

  return (
    <form onSubmit={handleSubmit}>
      <Typography variant="h5">Log In</Typography>
      {authError && (
        <Typography color="error" variant="body1">
          {authError}
        </Typography>
      )}
      <TextField
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        fullWidth
        margin="normal"
      />
      <TextField
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        fullWidth
        margin="normal"
      />
      <Button type="submit" variant="contained" color="primary" fullWidth>
        Log In
      </Button>
    </form>
  );
};

export default LoginForm;
