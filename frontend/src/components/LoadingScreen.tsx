/**
 * Loading Screen Component
 * HMS Enterprise Frontend
 * 
 * Professional loading component with spinner and optional message.
 * Used for initial app loading and component-level loading states.
 */

import React from 'react';
import { Box, CircularProgress, Typography, Backdrop, Fade } from '@mui/material';
import { styled } from '@mui/material/styles';
import { LocalHospital } from '@mui/icons-material';

interface LoadingScreenProps {
  open?: boolean;
  message?: string;
  subMessage?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'fullscreen' | 'inline' | 'backdrop';
  backdrop?: boolean;
}

const LoadingContainer = styled(Box)<{ variant: 'fullscreen' | 'inline' | 'backdrop' }>(({ theme, variant }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing(2),
  ...(variant === 'fullscreen' && {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.palette.background.default,
    zIndex: 9999,
  }),
  ...(variant === 'backdrop' && {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 1000,
  }),
  ...(variant === 'inline' && {
    padding: theme.spacing(2),
    minHeight: '200px',
  }),
}));

const LoadingLogo = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '80px',
  height: '80px',
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  borderRadius: '12px',
  boxShadow: theme.shadows[4],
  marginBottom: theme.spacing(2),
  position: 'relative',
  overflow: 'hidden',
}));

const LoadingSpinner = styled(CircularProgress)<{ size?: 'small' | 'medium' | 'large' }>(({ theme, size }) => {
  const sizeMap = {
    small: 24,
    medium: 40,
    large: 56,
  };
  
  return {
    width: sizeMap[size || 'medium'],
    height: sizeMap[size || 'medium'],
    color: theme.palette.primary.main,
  };
});

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  open = true,
  message = 'Loading...',
  subMessage,
  size = 'medium',
  variant = 'fullscreen',
  backdrop = false,
}) => {
  if (!open && variant !== 'backdrop') {
    return null;
  }

  const loadingContent = (
    <LoadingContainer variant={variant}>
      {variant === 'fullscreen' && (
        <LoadingLogo>
          <LocalHospital sx={{ fontSize: 40 }} />
        </LoadingLogo>
      )}
      
      {variant !== 'fullscreen' && (
        <LoadingSpinner size={size} />
      )}
      
      {message && (
        <Typography
          variant={variant === 'fullscreen' ? 'h6' : 'subtitle1'}
          component="div"
          align="center"
          color="text.primary"
          fontWeight={variant === 'fullscreen' ? 500 : 400}
        >
          {message}
        </Typography>
      )}
      
      {subMessage && (
        <Typography
          variant="body2"
          color="text.secondary"
          align="center"
          sx={{ maxWidth: 300 }}
        >
          {subMessage}
        </Typography>
      )}
    </LoadingContainer>
  );

  if (variant === 'backdrop' || backdrop) {
    return (
      <Fade in={open}>
        <Backdrop
          sx={{
            zIndex: (theme) => theme.zIndex.drawer + 1,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
          }}
          open={open}
        >
          {loadingContent}
        </Backdrop>
      </Fade>
    );
  }

  return loadingContent;
};

export default LoadingScreen;