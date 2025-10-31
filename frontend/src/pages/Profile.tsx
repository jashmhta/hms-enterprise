/**
 * Profile Page Placeholder
 */

import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const Profile: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Profile
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography>User profile and account settings coming soon...</Typography>
      </Paper>
    </Box>
  );
};

export default Profile;