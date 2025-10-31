/**
 * Settings Page Placeholder
 */

import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const Settings: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography>Application settings and preferences coming soon...</Typography>
      </Paper>
    </Box>
  );
};

export default Settings;