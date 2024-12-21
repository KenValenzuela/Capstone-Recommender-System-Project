// src/components/Badges.jsx

import React from 'react';
import { Typography, Paper, Tooltip, Chip } from '@mui/material';
import { makeStyles } from '@mui/styles';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

const useStyles = makeStyles(() => ({
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
}));

const Badges = ({ badges }) => {
  const classes = useStyles();

  return (
    <Paper className={classes.badgeContainer}>
      {badges && badges.length > 0 ? (
        badges.map((badge, index) => (
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
  );
};

export default Badges;
