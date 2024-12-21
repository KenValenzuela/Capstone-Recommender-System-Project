// src/components/Profile.jsx

import React, { useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';
import {
  Container,
  Typography,
  List,
  ListItem,
  Box,
  Alert,
  CircularProgress,
  Paper,
  Avatar,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Button,
  Tooltip,
} from '@mui/material';
import { makeStyles } from '@mui/styles';
import { AuthContext } from '../context/AuthContext';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import StarIcon from '@mui/icons-material/Star';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PersonIcon from '@mui/icons-material/Person';
import RefreshIcon from '@mui/icons-material/Refresh';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import FeedbackIcon from '@mui/icons-material/Feedback';
import FavoriteIcon from '@mui/icons-material/Favorite';
import InfoIcon from '@mui/icons-material/Info';

const useStyles = makeStyles(() => ({
  container: {
    marginTop: '2em',
    marginBottom: '2em',
  },
  profileHeader: {
    padding: '2em',
    background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
    color: 'white',
    marginBottom: '2em',
    borderRadius: '8px',
  },
  avatar: {
    width: 100,
    height: 100,
    marginBottom: '1em',
    border: '3px solid white',
  },
  sectionTitle: {
    marginTop: '1.5em',
    marginBottom: '1em',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5em',
  },
  badgeContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1em',
    padding: '1em',
  },
  badge: {
    padding: '0.5em 1em',
    textAlign: 'center',
    transition: 'transform 0.2s',
    '&:hover': {
      transform: 'scale(1.05)',
    },
  },
  notificationItem: {
    padding: '1em',
    marginBottom: '0.5em',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
    '&:hover': {
      backgroundColor: '#e0e0e0',
    },
  },
  statsCard: {
    textAlign: 'center',
    padding: '1em',
    height: '100%',
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
    marginTop: '0.5em',
  },
  refreshButton: {
    marginTop: '1em',
  },
  feedbackMessage: {
    marginTop: '1em',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5em',
    backgroundColor: '#e0f7fa',
    padding: '1em',
    borderRadius: '8px',
  },
}));

const Profile = () => {
  const classes = useStyles();
  const { user } = useContext(AuthContext);
  const [profileData, setProfileData] = useState(null);
  const [userFeedbacks, setUserFeedbacks] = useState([]);
  const [feedback, setFeedback] = useState({ message: '', type: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.user_id) {
      fetchProfile();
      fetchFeedbacks();
    } else {
      setProfileData(null);
      setUserFeedbacks([]);
      setFeedback({ message: '', type: '' });
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/profile/${user.user_id}`);
      setProfileData(response.data.profile);
      setFeedback({ message: '', type: '' });
    } catch (error) {
      console.error('Error fetching profile:', error);
      const errorDetail =
        error.response?.data?.detail || 'An unexpected error occurred.';
      setFeedback({ message: errorDetail, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchFeedbacks = async () => {
    try {
      const response = await axios.get(`/feedbacks/${user.user_id}`);
      setUserFeedbacks(response.data.feedbacks);
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
      // Optionally set feedback message or handle error
    }
  };

  // Calculate level based on achievements
  const level = useMemo(() => {
    const totalPoints = Object.values(profileData?.achievements || {}).reduce(
      (sum, value) => sum + value,
      0
    );
    return Math.floor(totalPoints / 100) + 1;
  }, [profileData]);

  // Calculate progress towards next level
  const levelProgress = useMemo(() => {
    const totalPoints = Object.values(profileData?.achievements || {}).reduce(
      (sum, value) => sum + value,
      0
    );
    return totalPoints % 100;
  }, [profileData]);

  // Total achievement score
  const achievementScore = useMemo(() => {
    return Object.values(profileData?.achievements || {}).reduce(
      (a, b) => a + b,
      0
    );
  }, [profileData]);

  // Feedback loop message
  const feedbackLoopMessage = useMemo(() => {
    const totalFeedbacks = userFeedbacks.length;
    if (totalFeedbacks === 0) {
      return 'Start liking strains to improve your recommendations!';
    } else if (totalFeedbacks < 5) {
      return 'The more you like strains, the better your recommendations will be!';
    } else {
      return 'Great job! Your recommendations are getting more accurate.';
    }
  }, [userFeedbacks]);

  const nextLevelTarget = 100;

  const handleRefresh = () => {
    fetchProfile();
    fetchFeedbacks();
  };

  if (loading) {
    return (
      <Container maxWidth="md" className={classes.container}>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="60vh"
        >
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" className={classes.container}>
      {feedback.message && (
        <Alert severity={feedback.type} style={{ marginBottom: '1em' }}>
          {feedback.message}
        </Alert>
      )}

      <Paper className={classes.profileHeader} elevation={3}>
        <Box display="flex" flexDirection="column" alignItems="center">
          <Avatar
            className={classes.avatar}
            alt={`${user?.email || 'User'}'s Avatar`}
          >
            {user?.email ? user.email[0].toUpperCase() : <PersonIcon />}
          </Avatar>
          <Typography variant="h4" gutterBottom>
            {user?.email || 'Guest'}
          </Typography>
          <Box display="flex" alignItems="center" gap={1}>
            <WhatshotIcon />
            <Typography variant="h6">Level {level} Connoisseur</Typography>
          </Box>
          <Box mt={2} width="100%" maxWidth={300}>
            <Typography variant="body2" align="center">
              {levelProgress}/100 XP to Level {level + 1}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={(levelProgress / nextLevelTarget) * 100}
              className={classes.progressBar}
            />
          </Box>
          <Button
            variant="outlined"
            color="inherit"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            className={classes.refreshButton}
          >
            Refresh
          </Button>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* Feedback Loop Message */}
        <Grid item xs={12}>
          <Paper className={classes.feedbackMessage}>
            <FeedbackIcon color="primary" />
            <Typography variant="body1">{feedbackLoopMessage}</Typography>
            <Tooltip title="Liking or disliking strains helps improve your personalized recommendations over time.">
              <InfoIcon color="action" />
            </Tooltip>
          </Paper>
        </Grid>

        {/* Stats Cards */}
        <Grid item xs={12}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Card className={classes.statsCard}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Reviews
                  </Typography>
                  <Typography variant="h4">
                    {profileData?.reviews?.length || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card className={classes.statsCard}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Badges Earned
                  </Typography>
                  <Typography variant="h4">
                    {profileData?.badges?.length || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card className={classes.statsCard}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Achievement Score
                  </Typography>
                  <Typography variant="h4">{achievementScore}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>

        {/* Badges */}
        <Grid item xs={12}>
          <Typography variant="h5" className={classes.sectionTitle}>
            <StarIcon color="primary" /> Badges
          </Typography>
          <Paper className={classes.badgeContainer}>
            {profileData?.badges && profileData.badges.length > 0 ? (
              profileData.badges.map((badge, index) => (
                <Tooltip key={index} title={`Badge Earned: ${badge}`}>
                  <Chip
                    icon={<EmojiEventsIcon />}
                    label={badge}
                    color="primary"
                    variant="outlined"
                    className={classes.badge}
                  />
                </Tooltip>
              ))
            ) : (
              <Typography variant="body1" color="textSecondary">
                Complete more activities to earn badges!
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12}>
          <Typography variant="h5" className={classes.sectionTitle}>
            <NotificationsIcon color="primary" /> Recent Activity
          </Typography>
          <List>
            {profileData?.notifications &&
            profileData.notifications.length > 0 ? (
              profileData.notifications
                .slice(0, 5)
                .map((notification, index) => (
                  <ListItem key={index} className={classes.notificationItem}>
                    <Typography variant="body1">
                      {typeof notification === 'object'
                        ? JSON.stringify(notification)
                        : notification}
                    </Typography>
                  </ListItem>
                ))
            ) : (
              <Typography variant="body1" color="textSecondary">
                No recent activity to display.
              </Typography>
            )}
          </List>
        </Grid>

        {/* Your Reviews */}
        <Grid item xs={12}>
          <Typography variant="h5" className={classes.sectionTitle}>
            <StarIcon color="primary" /> Your Reviews
          </Typography>
          <List>
            {profileData?.reviews && profileData.reviews.length > 0 ? (
              profileData.reviews
                .slice(0, 5)
                .map((review, index) => (
                  <ListItem key={index}>
                    <Paper
                      style={{ padding: '1em', width: '100%' }}
                      elevation={2}
                    >
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={2}>
                          <Typography
                            variant="subtitle1"
                            color="textSecondary"
                          >
                            Rating:
                          </Typography>
                          <Box display="flex" alignItems="center">
                            <StarIcon color="secondary" />
                            <Typography variant="h6">{review.rating}</Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12} sm={10}>
                          <Typography
                            variant="subtitle1"
                            color="textSecondary"
                          >
                            Strain:
                          </Typography>
                          <Typography variant="h6">
                            {review.Strain_Name}
                          </Typography>
                          <Typography
                            variant="subtitle1"
                            color="textSecondary"
                            style={{ marginTop: '0.5em' }}
                          >
                            Comment:
                          </Typography>
                          <Typography variant="body1">
                            {review.text || 'No comment provided.'}
                          </Typography>
                          {review.metrics && (
                            <Box mt={1}>
                              <Typography
                                variant="subtitle1"
                                color="textSecondary"
                              >
                                Detailed Ratings:
                              </Typography>
                              <Grid container spacing={1}>
                                {Object.entries(review.metrics).map(
                                  ([key, value]) => (
                                    <Grid item key={key}>
                                      <Chip
                                        label={`${key}: ${value}`}
                                        color="primary"
                                        size="small"
                                      />
                                    </Grid>
                                  )
                                )}
                              </Grid>
                            </Box>
                          )}
                        </Grid>
                      </Grid>
                    </Paper>
                  </ListItem>
                ))
            ) : (
              <Typography variant="body1" color="textSecondary">
                You haven't submitted any reviews yet.
              </Typography>
            )}
          </List>
        </Grid>

        {/* Your Feedback */}
        <Grid item xs={12}>
          <Typography variant="h5" className={classes.sectionTitle}>
            <FeedbackIcon color="primary" /> Your Feedback
          </Typography>
          <List>
            {userFeedbacks && userFeedbacks.length > 0 ? (
              userFeedbacks
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 5)
                .map((fb, index) => (
                  <ListItem key={index}>
                    <Paper
                      style={{ padding: '1em', width: '100%' }}
                      elevation={2}
                    >
                      <Grid container alignItems="center" spacing={2}>
                        <Grid item>
                          {fb.feedback_type === 'like' ? (
                            <ThumbUpIcon color="primary" />
                          ) : (
                            <ThumbDownIcon color="error" />
                          )}
                        </Grid>
                        <Grid item xs>
                          <Typography variant="subtitle1">
                            {fb.strain_name}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {fb.feedback_type === 'like'
                              ? 'You liked this strain.'
                              : 'You disliked this strain.'}
                          </Typography>
                          <Typography variant="body2">
                            Date: {new Date(fb.date).toLocaleString()}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Paper>
                  </ListItem>
                ))
            ) : (
              <Typography variant="body1" color="textSecondary">
                You haven't submitted any feedback yet.
              </Typography>
            )}
          </List>
        </Grid>

        {/* Favorite Strains */}
        <Grid item xs={12}>
          <Typography variant="h5" className={classes.sectionTitle}>
            <FavoriteIcon color="primary" /> Your Favorite Strains
          </Typography>
          <Paper className={classes.badgeContainer}>
            {profileData?.favorites && profileData.favorites.length > 0 ? (
              profileData.favorites.map((strain, index) => (
                <Chip
                  key={index}
                  icon={<FavoriteIcon />}
                  label={strain}
                  color="secondary"
                  variant="outlined"
                  className={classes.badge}
                />
              ))
            ) : (
              <Typography variant="body1" color="textSecondary">
                You haven't added any favorite strains yet.
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Profile;
