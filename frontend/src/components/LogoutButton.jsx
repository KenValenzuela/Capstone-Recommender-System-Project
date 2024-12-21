// src/components/LogoutButton.jsx
import React, { useContext } from 'react';
import { Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import LogoutIcon from '@mui/icons-material/Logout';

const LogoutButton = () => {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Button
      onClick={handleLogout}
      color="inherit"
      startIcon={<LogoutIcon />}
      sx={{
        '&:hover': {
          backgroundColor: 'rgba(255, 255, 255, 0.08)'
        }
      }}
    >
      Logout
    </Button>
  );
};

export default LogoutButton;