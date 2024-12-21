// src/components/Leaderboard.jsx

import React, { useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';
import {
  Container,
  Typography,
  List,
  Box,
  Alert,
  CircularProgress,
  Divider,
  Paper,
  Tabs,
  Tab,
  Avatar,
  Chip,
  Tooltip,
  IconButton,
  Button,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { AuthContext } from '../context/AuthContext';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import StarIcon from '@mui/icons-material/Star';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import RefreshIcon from '@mui/icons-material/Refresh';
import PersonIcon from '@mui/icons-material/Person';
import PropTypes from 'prop-types';

// Constants for Time Frames
const TIME_FRAMES = [
  { label: 'All Time', query: 'all' },
  { label: 'Monthly', query: 'monthly' },
  { label: 'Weekly', query: 'weekly' },
];

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

const UserStatsPaper = styled(Paper)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2),
  marginBottom: theme.spacing(2),
  padding: theme.spacing(2),
  backgroundColor: '#f5f5f5',
  borderRadius: '4px',
}));

const LeaderboardListPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
}));

const StyledAvatar = styled(Avatar)(({ theme, rank }) => ({
  backgroundColor:
    rank === 0 ? '#FFD700' : rank === 1 ? '#C0C0C0' : rank === 2 ? '#CD7F32' : '#f5f5f5',
}));

const RefreshButton = styled(Button)(({ theme }) => ({
  marginLeft: theme.spacing(1),
}));

// LeaderboardHeader Component
const LeaderboardHeader = ({ onRefresh }) => (
  <HeaderBox>
    <Typography variant="h4" component="h1" display="flex" alignItems="center" gap={1}>
      <EmojiEventsIcon fontSize="large" style={{ color: '#FFD700' }} />
      Leaderboard
    </Typography>
    <IconButton
      onClick={onRefresh}
      color="primary"
      aria-label="Refresh Leaderboard"
    >
      <RefreshIcon />
    </IconButton>
  </HeaderBox>
);

LeaderboardHeader.propTypes = {
  onRefresh: PropTypes.func.isRequired,
};

// UserStats Component
const UserStats = ({ rank, score }) => (
  <UserStatsPaper>

    <Box display="flex" alignItems="center" gap={1}>
      <Typography variant="h6">Your Rank: #{rank}</Typography>
      <Typography variant="h6">Points: {score}</Typography>
    </Box>
  </UserStatsPaper>
);

UserStats.propTypes = {
  rank: PropTypes.number.isRequired,
  score: PropTypes.number.isRequired,
};

// LeaderboardItem Component
const LeaderboardItem = React.memo(({ user, rank, isCurrentUser }) => {
  const StyledListItem = styled(Box)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(1),
    backgroundColor: isCurrentUser ? 'rgba(33, 150, 243, 0.08)' : 'inherit',
    borderRadius: '4px',
    marginBottom: theme.spacing(1),
    transition: 'background-color 0.3s',
    '&:hover': {
      backgroundColor: 'rgba(0, 0, 0, 0.04)',
    },
  }));

  const getRankIcon = (rank) => {
    if (rank === 0) return '🥇';
    if (rank === 1) return '🥈';
    if (rank === 2) return '🥉';
    return rank + 1;
  };

  return (
    <StyledListItem>
      <Typography variant="h6" style={{ width: '30px', textAlign: 'center' }}>
        {getRankIcon(rank)}
      </Typography>
      <Box display="flex" alignItems="center" flexGrow={1} gap={2}>
        <StyledAvatar rank={rank} aria-label={`${user.email}'s Avatar`}>
          {user.email ? user.email[0].toUpperCase() : <PersonIcon />}
        </StyledAvatar>
        <Typography variant="body1">{user.email}</Typography>
        {user.badges?.map((badge, idx) => (
          <Tooltip key={idx} title={badge}>
            <Chip
              size="small"
              icon={<StarIcon />}
              label={badge}
              variant="outlined"
              sx={{ marginRight: '0.5em', marginTop: '0.5em' }}
            />
          </Tooltip>
        ))}
      </Box>
      <Box display="flex" alignItems="center" gap={0.5}>
        <WhatshotIcon color="error" />
        <Typography variant="h6">{user.score}</Typography>
      </Box>
    </StyledListItem>
  );
});

LeaderboardItem.propTypes = {
  user: PropTypes.shape({
    user_id: PropTypes.number.isRequired,
    email: PropTypes.string.isRequired,
    badges: PropTypes.arrayOf(PropTypes.string),
    score: PropTypes.number.isRequired,
  }).isRequired,
  rank: PropTypes.number.isRequired,
  isCurrentUser: PropTypes.bool.isRequired,
};

// LeaderboardList Component
const LeaderboardList = ({ leaderboard, currentUser }) => (
  <List>
    {leaderboard.map((user, index) => (
      <React.Fragment key={user.user_id}>
        <LeaderboardItem
          user={user}
          rank={index}
          isCurrentUser={user.user_id === currentUser?.user_id}
        />
        {index < leaderboard.length - 1 && <Divider />}
      </React.Fragment>
    ))}
  </List>
);

LeaderboardList.propTypes = {
  leaderboard: PropTypes.arrayOf(
    PropTypes.shape({
      user_id: PropTypes.number.isRequired,
      email: PropTypes.string.isRequired,
      badges: PropTypes.arrayOf(PropTypes.string),
      score: PropTypes.number.isRequired,
    })
  ).isRequired,
  currentUser: PropTypes.shape({
    user_id: PropTypes.number.isRequired,
    score: PropTypes.number.isRequired,
  }),
};

function useStyles() {
  return undefined;
}

// Main Leaderboard Component
const Leaderboard = () => {
  const classes = useStyles();
  const { user, authToken } = useContext(AuthContext);
  const [leaderboard, setLeaderboard] = useState([]);
  const [feedback, setFeedback] = useState({ message: '', type: '' });
  const [loading, setLoading] = useState(true);
  const [timeFrame, setTimeFrame] = useState(0); // 0: All Time, 1: Monthly, 2: Weekly
  const [userRank, setUserRank] = useState(null);

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8001';

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/leaderboard/`, {
        headers: { Authorization: `Bearer ${authToken}` },
        params: { timeFrame: TIME_FRAMES[timeFrame].query },
      });

      setLeaderboard(response.data.leaderboard);

      // Find user's rank
      const rankIndex = response.data.leaderboard.findIndex(
        (item) => item.user_id === user?.user_id
      );
      setUserRank(rankIndex !== -1 ? rankIndex + 1 : null);
    } catch (error) {
      const errorDetail = error.response?.data?.detail || 'An unexpected error occurred.';
      setFeedback({ message: errorDetail, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Fetch leaderboard on component mount and when timeFrame changes
  useEffect(() => {
    if (user?.user_id) {
      fetchLeaderboard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeFrame, authToken]);

  // Handle time frame change
  const handleTimeFrameChange = (event, newValue) => {
    setTimeFrame(newValue);
  };

  // Handle manual refresh
  const handleRefresh = () => {
    fetchLeaderboard();
  };

  // Memoize current user's score
  const currentUserScore = useMemo(() => {
    const currentUserData = leaderboard.find((item) => item.user_id === user?.user_id);
    return currentUserData?.score || 0;
  }, [leaderboard, user]);

  if (loading) {
    return (
      <StyledContainer maxWidth="md">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </StyledContainer>
    );
  }

  return (
    <StyledContainer maxWidth="md">
      {/* Feedback Alert */}
      {feedback.message && (
        <Alert severity={feedback.type} sx={{ marginBottom: '1em' }}>
          {feedback.message}
        </Alert>
      )}

      {/* Leaderboard Header */}
      <LeaderboardHeader onRefresh={handleRefresh} />

      {/* User Statistics */}
      {userRank && (
        <UserStats rank={userRank} score={currentUserScore} />
      )}

      {/* Leaderboard Tabs */}
      <Paper elevation={3}>
        <Tabs
          value={timeFrame}
          onChange={handleTimeFrameChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
          aria-label="Leaderboard Time Frames"
        >
          {TIME_FRAMES.map((frame, index) => (
            <Tab key={index} label={frame.label} />
          ))}
        </Tabs>
      </Paper>

      {/* Leaderboard List */}
      <LeaderboardList leaderboard={leaderboard} currentUser={user} />

      {/* No Entries Feedback */}
      {leaderboard.length === 0 && (
        <Box textAlign="center" py={4}>
          <Typography variant="h6" color="textSecondary">
            No entries yet. Be the first to make it to the leaderboard!
          </Typography>
        </Box>
      )}
    </StyledContainer>
  );
};

export default Leaderboard;
