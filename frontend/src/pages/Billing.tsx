/**
 * Billing Page Placeholder
 */

import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const Billing: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Billing Management
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography>Billing, invoicing, and GST compliance coming soon...</Typography>
      </Paper>
    </Box>
  );
};

export default Billing;