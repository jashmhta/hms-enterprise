/**
 * Clinical Page Placeholder
 */

import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const Clinical: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Clinical Management
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography>Clinical workflows, visits, and medical records coming soon...</Typography>
      </Paper>
    </Box>
  );
};

export default Clinical;