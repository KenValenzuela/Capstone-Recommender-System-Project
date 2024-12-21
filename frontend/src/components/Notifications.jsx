// src/components/Notifications.jsx

import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import axios from 'axios';
import {
  Container,
  Typography,
  Box,
  Paper,
  List,
  Alert,
  CircularProgress,
  Chip,
  Tooltip,
  IconButton,
  Menu,
  MenuItem,
  Button, Avatar,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import StarIcon from '@mui/icons-material/Star';
import RateReviewIcon from '@mui/icons-material/RateReview';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PropTypes from 'prop-types';

// Constants for Notification Types
const NOTIFICATION_TYPES = {
  ACHIEVEMENT: 'achievement',
  REVIEW: 'review',
  BADGE: 'badge',
  RECOMMENDATION: 'recommendation',
  LIKE: 'like',
};

// Styled Components
const StyledContainer = styled(Container)(({ theme }) => ({
  marginTop: theme.spacing(4),
  marginBottom: theme.spacing(4),
}));

const HeaderBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: theme.spacing(2),
}));

const FilterChipsBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
  flexWrap: 'wrap',
  marginBottom: theme.spacing(2),
}));

const NotificationPaper = styled(Paper)(({ theme, unread }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(1),
  backgroundColor: unread ? 'rgba(33, 150, 243, 0.08)' : 'inherit',
  transition: 'background-color 0.3s',
  '&:hover': {
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
}));

const StyledAvatar = styled(Avatar)(({ theme, type }) => ({
  backgroundColor: getNotificationColor(type),
}));

const NoNotificationsBox = styled(Box)(({ theme }) => ({
  textAlign: 'center',
  padding: theme.spacing(4),
}));

// Helper Functions
const getNotificationIcon = (type) => {
  switch (type) {
    case NOTIFICATION_TYPES.ACHIEVEMENT:
      return <EmojiEventsIcon color="primary" />;
    case NOTIFICATION_TYPES.REVIEW:
      return <RateReviewIcon color="secondary" />;
    case NOTIFICATION_TYPES.BADGE:
      return <StarIcon style={{ color: '#FFD700' }} />;
    case NOTIFICATION_TYPES.RECOMMENDATION:
      return <WhatshotIcon color="error" />;
    case NOTIFICATION_TYPES.LIKE:
      return <ThumbUpIcon color="success" />;
    default:
      return <NotificationsIcon />;
  }
};

const getNotificationColor = (type) => {
  switch (type) {
    case NOTIFICATION_TYPES.ACHIEVEMENT:
      return '#2196F3';
    case NOTIFICATION_TYPES.REVIEW:
      return '#9C27B0';
    case NOTIFICATION_TYPES.BADGE:
      return '#FFD700';
    case NOTIFICATION_TYPES.RECOMMENDATION:
      return '#f44336';
    case NOTIFICATION_TYPES.LIKE:
      return '#4CAF50';
    default:
      return '#757575';
  }
};

// Sub-Components

/**
 * NotificationsHeader Component
 * Renders the header with title and "Mark all as read" button.
 */
const NotificationsHeader = ({ onMarkAllRead }) => (
  <HeaderBox>
    <Typography variant="h4" component="h1">
      Notifications
    </Typography>
    <Button
      variant="outlined"
      color="primary"
      onClick={onMarkAllRead}
      startIcon={<CheckCircleIcon />}
    >
      Mark All as Read
    </Button>
  </HeaderBox>
);

NotificationsHeader.propTypes = {
  onMarkAllRead: PropTypes.func.isRequired,
};

/**
 * FilterChips Component
 * Renders filter chips for different notification categories.
 */
const FilterChips = ({ currentFilter, onFilterChange }) => (
  <FilterChipsBox>
    <Chip
      label="All"
      clickable
      color={currentFilter === 'all' ? 'primary' : 'default'}
      onClick={() => onFilterChange('all')}
    />
    <Chip
      label="Unread"
      clickable
      color={currentFilter === 'unread' ? 'primary' : 'default'}
      onClick={() => onFilterChange('unread')}
    />
    <Chip
      label="Achievements"
      clickable
      color={currentFilter === NOTIFICATION_TYPES.ACHIEVEMENT ? 'primary' : 'default'}
      onClick={() => onFilterChange(NOTIFICATION_TYPES.ACHIEVEMENT)}
      icon={<EmojiEventsIcon />}
    />
    <Chip
      label="Reviews"
      clickable
      color={currentFilter === NOTIFICATION_TYPES.REVIEW ? 'primary' : 'default'}
      onClick={() => onFilterChange(NOTIFICATION_TYPES.REVIEW)}
      icon={<RateReviewIcon />}
    />
    <Chip
      label="Badges"
      clickable
      color={currentFilter === NOTIFICATION_TYPES.BADGE ? 'primary' : 'default'}
      onClick={() => onFilterChange(NOTIFICATION_TYPES.BADGE)}
      icon={<StarIcon />}
    />
    <Chip
      label="Likes"
      clickable
      color={currentFilter === NOTIFICATION_TYPES.LIKE ? 'primary' : 'default'}
      onClick={() => onFilterChange(NOTIFICATION_TYPES.LIKE)}
      icon={<ThumbUpIcon />}
    />
    <Chip
      label="Recommendations"
      clickable
      color={currentFilter === NOTIFICATION_TYPES.RECOMMENDATION ? 'primary' : 'default'}
      onClick={() => onFilterChange(NOTIFICATION_TYPES.RECOMMENDATION)}
      icon={<WhatshotIcon />}
    />
  </FilterChipsBox>
);

FilterChips.propTypes = {
  currentFilter: PropTypes.string.isRequired,
  onFilterChange: PropTypes.func.isRequired,
};

/**
 * NotificationItem Component
 * Represents a single notification item with actions.
 */
const NotificationItem = React.memo(({ notification, onAction, onDelete }) => {
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleMarkRead = () => {
    handleMenuClose();
    onAction(notification.id, 'markRead');
  };

  const handleNavigate = () => {
    handleMenuClose();
    onAction(notification.id, 'navigate');
  };

  const handleDelete = () => {
    handleMenuClose();
    onDelete(notification.id);
  };

  return (
    <NotificationPaper unread={!notification.read} elevation={notification.read ? 1 : 3}>
      <Box display="flex" alignItems="flex-start">
        <StyledAvatar type={notification.type}>
          {getNotificationIcon(notification.type)}
        </StyledAvatar>
        <Box flexGrow={1} ml={2}>
          <Typography variant="subtitle1" component="div">
            {notification.title}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {notification.message}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {new Date(notification.timestamp).toLocaleString()}
          </Typography>
        </Box>
        <Box>
          {notification.action && (
            <Button
              variant="contained"
              color="primary"
              size="small"
              onClick={handleNavigate}
              startIcon={<WhatshotIcon />}
              sx={{ mr: 1 }}
            >
              {notification.actionText || 'View'}
            </Button>
          )}
          <IconButton
            size="small"
            onClick={handleMenuOpen}
            aria-label="More options"
          >
            <MoreVertIcon />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            <MenuItem onClick={handleMarkRead}>
              <Box display="flex" alignItems="center">
                <CheckCircleIcon fontSize="small" sx={{ mr: 1 }} />
                <Typography variant="body2">
                  {notification.read ? 'Mark as Unread' : 'Mark as Read'}
                </Typography>
              </Box>
            </MenuItem>
            <MenuItem onClick={handleDelete}>
              <Box display="flex" alignItems="center">
                <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
                <Typography variant="body2">Delete</Typography>
              </Box>
            </MenuItem>
          </Menu>
        </Box>
      </Box>
    </NotificationPaper>
  );
});

NotificationItem.propTypes = {
  notification: PropTypes.shape({
    id: PropTypes.number.isRequired,
    type: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired,
    timestamp: PropTypes.string.isRequired,
    read: PropTypes.bool.isRequired,
    action: PropTypes.string,
    actionText: PropTypes.string,
    strainId: PropTypes.number, // Assuming strainId is used for navigation
  }).isRequired,
  onAction: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

/**
 * NotificationsList Component
 * Renders the list of notifications.
 */
const NotificationsList = ({ notifications, onAction, onDelete }) => (
  <List>
    {notifications.map((notification) => (
      <NotificationItem
        key={notification.id}
        notification={notification}
        onAction={onAction}
        onDelete={onDelete}
      />
    ))}
  </List>
);

NotificationsList.propTypes = {
  notifications: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      type: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      message: PropTypes.string.isRequired,
      timestamp: PropTypes.string.isRequired,
      read: PropTypes.bool.isRequired,
      action: PropTypes.string,
      actionText: PropTypes.string,
      strainId: PropTypes.number,
    })
  ).isRequired,
  onAction: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

function useStyles() {
  return undefined;
}

/**
 * Notifications Component
 * Main component that manages and displays notifications.
 */
const Notifications = () => {
  const classes = useStyles();
  const { user, authToken } = useContext(AuthContext);
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  const API_BASE_URL = useMemo(
    () => process.env.REACT_APP_API_BASE_URL || 'http://localhost:8001',
    []
  );

  // Fetch notifications from the backend
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/notifications/${user.user_id}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setNotifications(response.data.notifications);
      setError('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, authToken, user.user_id]);

  useEffect(() => {
    if (user?.user_id) {
      fetchNotifications();
    }
  }, [fetchNotifications, user]);

  // Handle actions like mark as read/unread and navigation
  const handleNotificationAction = async (notificationId, actionType) => {
    try {
      if (actionType === 'markRead') {
        // Toggle read status
        const notification = notifications.find((n) => n.id === notificationId);
        const updatedReadStatus = !notification.read;
        await axios.post(
          `${API_BASE_URL}/notifications/${notificationId}/mark-read`,
          { read: updatedReadStatus },
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
        setNotifications((prevNotifications) =>
          prevNotifications.map((n) =>
            n.id === notificationId ? { ...n, read: updatedReadStatus } : n
          )
        );
      } else if (actionType === 'navigate') {
        const notification = notifications.find((n) => n.id === notificationId);
        if (notification.type === NOTIFICATION_TYPES.REVIEW) {
          navigate(`/review/${notification.strainId}`);
        } else if (notification.type === NOTIFICATION_TYPES.ACHIEVEMENT) {
          navigate('/profile');
        }
        // Add more navigation cases as needed
      }
    } catch (err) {
      setError('Failed to perform action on notification');
    }
  };

  // Handle deletion of a notification
  const handleDeleteNotification = async (notificationId) => {
    try {
      await axios.delete(`${API_BASE_URL}/notifications/${notificationId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setNotifications((prevNotifications) =>
        prevNotifications.filter((n) => n.id !== notificationId)
      );
    } catch (err) {
      setError('Failed to delete notification');
    }
  };

  // Handle marking all notifications as read
  const handleMarkAllRead = async () => {
    try {
      await axios.post(
        `${API_BASE_URL}/notifications/${user.user_id}/mark-all-read`,
        {},
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setNotifications((prevNotifications) =>
        prevNotifications.map((n) => ({ ...n, read: true }))
      );
    } catch (err) {
      setError('Failed to mark all notifications as read');
    }
  };

  // Filter notifications based on the selected filter
  const filteredNotifications = useMemo(() => {
    if (filter === 'all') return notifications;
    if (filter === 'unread') return notifications.filter((n) => !n.read);
    return notifications.filter((n) => n.type === filter);
  }, [notifications, filter]);

  if (loading) {
    return (
      <StyledContainer maxWidth="md">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      </StyledContainer>
    );
  }

  return (
    <StyledContainer maxWidth="md">
      {/* Header */}
      <NotificationsHeader onMarkAllRead={handleMarkAllRead} />

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ marginBottom: '1em' }}>
          {error}
        </Alert>
      )}

      {/* Filter Chips */}
      <FilterChips currentFilter={filter} onFilterChange={setFilter} />

      {/* Notifications List */}
      {filteredNotifications.length > 0 ? (
        <NotificationsList
          notifications={filteredNotifications}
          onAction={handleNotificationAction}
          onDelete={handleDeleteNotification}
        />
      ) : (
        <NoNotificationsBox>
          <Typography variant="h6" color="textSecondary" gutterBottom>
            {filter === 'all'
              ? "You're all caught up!"
              : `No ${filter.charAt(0).toUpperCase() + filter.slice(1)} notifications.`}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Engage with the app to receive more notifications.
          </Typography>
        </NoNotificationsBox>
      )}
    </StyledContainer>
  );
};

// Prop Types
NotificationsHeader.propTypes = {
  onMarkAllRead: PropTypes.func.isRequired,
};

FilterChips.propTypes = {
  currentFilter: PropTypes.string.isRequired,
  onFilterChange: PropTypes.func.isRequired,
};

NotificationsList.propTypes = {
  notifications: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      type: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      message: PropTypes.string.isRequired,
      timestamp: PropTypes.string.isRequired,
      read: PropTypes.bool.isRequired,
      action: PropTypes.string,
      actionText: PropTypes.string,
      strainId: PropTypes.number,
    })
  ).isRequired,
  onAction: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

NotificationItem.propTypes = {
  notification: PropTypes.shape({
    id: PropTypes.number.isRequired,
    type: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired,
    timestamp: PropTypes.string.isRequired,
    read: PropTypes.bool.isRequired,
    action: PropTypes.string,
    actionText: PropTypes.string,
    strainId: PropTypes.number,
  }).isRequired,
  onAction: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default Notifications;
