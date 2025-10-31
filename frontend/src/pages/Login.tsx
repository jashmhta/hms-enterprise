/**
 * Login Page
 * HMS Enterprise Frontend
 * 
 * Professional login page with authentication form,
 * password recovery, and responsive design.
 */

import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  Grid,
  Card,
  CardContent,
  useTheme,
  alpha,
} from '@mui/material';
import {
  LocalHospital,
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Security,
  MedicalServices,
} from '@mui/icons-material';

import { useAuthContext } from '../contexts/AuthContext';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';

// Validation schema
const loginSchema = yup.object().shape({
  email: yup
    .string()
    .email('Please enter a valid email address')
    .required('Email is required'),
  password: yup
    .string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
  rememberMe: yup.boolean(),
});

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

const Login: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, loginError } = useAuthContext();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  const {
    control,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    
    try {
      const success = await login(data);
      if (success) {
        toast.success('Welcome back to HMS Enterprise!');
        navigate(from, { replace: true });
      } else {
        setError('root', {
          message: loginError || 'Login failed. Please check your credentials.',
        });
      }
    } catch (error) {
      setError('root', {
        message: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.primary.light, 0.1)} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4} alignItems="center">
          {/* Left Side - Branding */}
          <Grid
            item
            xs={12}
            md={6}
            sx={{
              display: { xs: 'none', md: 'flex' },
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <Paper
              elevation={0}
              sx={{
                p: 4,
                background: 'transparent',
                textAlign: 'center',
              }}
            >
              <LocalHospital
                sx={{
                  fontSize: 80,
                  color: theme.palette.primary.main,
                  mb: 2,
                }}
              />
              <Typography
                variant="h2"
                component="h1"
                gutterBottom
                sx={{
                  fontWeight: 700,
                  color: theme.palette.primary.dark,
                  mb: 2,
                }}
              >
                HMS Enterprise
              </Typography>
              <Typography
                variant="h5"
                color="text.secondary"
                sx={{ mb: 4, fontWeight: 400 }}
              >
                Hospital Management System
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ mb: 3, lineHeight: 1.6 }}
              >
                Modern healthcare platform for day-care centers with comprehensive
                patient management, clinical workflows, and billing solutions.
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Chip
                  icon={<MedicalServices />}
                  label="Patient Management"
                  size="small"
                  color="primary"
                  variant="outlined"
                />
                <Chip
                  icon={<Security />}
                  label="ABDM Integrated"
                  size="small"
                  color="success"
                  variant="outlined"
                />
                <Chip
                  label="Healthcare Compliant"
                  size="small"
                  color="info"
                  variant="outlined"
                />
              </Box>
            </Paper>
          </Grid>

          {/* Right Side - Login Form */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={24}
              sx={{
                p: 4,
                borderRadius: 3,
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
              }}
            >
              {/* Logo for mobile */}
              <Box
                sx={{
                  display: { xs: 'flex', md: 'none' },
                  justifyContent: 'center',
                  mb: 3,
                }}
              >
                <LocalHospital
                  sx={{
                    fontSize: 48,
                    color: theme.palette.primary.main,
                  }}
                />
              </Box>

              <Typography
                variant="h4"
                component="h2"
                gutterBottom
                align="center"
                sx={{
                  fontWeight: 600,
                  color: theme.palette.text.primary,
                  mb: 1,
                }}
              >
                Welcome Back
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                align="center"
                sx={{ mb: 4 }}
              >
                Sign in to your HMS Enterprise account
              </Typography>

              {errors.root && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {errors.root.message}
                </Alert>
              )}

              <Box
                component="form"
                onSubmit={handleSubmit(onSubmit)}
                noValidate
              >
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Email Address"
                      type="email"
                      autoComplete="email"
                      autoFocus
                      error={!!errors.email}
                      helperText={errors.email?.message}
                      InputProps={{
                        startAdornment: (
                          <Email sx={{ color: 'text.secondary', mr: 1 }} />
                        ),
                      }}
                      sx={{ mb: 3 }}
                    />
                  )}
                />

                <Controller
                  name="password"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      error={!!errors.password}
                      helperText={errors.password?.message}
                      InputProps={{
                        startAdornment: (
                          <Lock sx={{ color: 'text.secondary', mr: 1 }} />
                        ),
                        endAdornment: (
                          <Button
                            onClick={handleTogglePasswordVisibility}
                            sx={{ minWidth: 'auto', p: 1 }}
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </Button>
                        ),
                      }}
                      sx={{ mb: 2 }}
                    />
                  )}
                />

                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 3,
                  }}
                >
                  <Controller
                    name="rememberMe"
                    control={control}
                    render={({ field }) => (
                      <Box>
                        <input
                          type="checkbox"
                          id="remember-me"
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          style={{ marginRight: 8 }}
                        />
                        <label htmlFor="remember-me" style={{ cursor: 'pointer' }}>
                          Remember me
                        </label>
                      </Box>
                    )}
                  />
                  <Link
                    to="/forgot-password"
                    style={{
                      color: theme.palette.primary.main,
                      textDecoration: 'none',
                    }}
                  >
                    Forgot password?
                  </Link>
                </Box>

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={isLoading || isSubmitting}
                  startIcon={
                    isLoading || isSubmitting ? (
                      <CircularProgress size={20} />
                    ) : undefined
                  }
                  sx={{
                    mb: 3,
                    py: 1.5,
                    fontSize: '1rem',
                    fontWeight: 600,
                  }}
                >
                  {isLoading || isSubmitting ? 'Signing in...' : 'Sign In'}
                </Button>
              </Box>

              <Divider sx={{ my: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  OR
                </Typography>
              </Divider>

              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Don't have an account?
                </Typography>
                <Button
                  variant="outlined"
                  component={Link}
                  to="/register"
                  sx={{ mr: 2 }}
                >
                  Create Account
                </Button>
                <Button
                  variant="text"
                  component={Link}
                  to="/demo"
                  size="small"
                >
                  View Demo
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      {/* Footer */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          py: 2,
          textAlign: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
        }}
      >
        <Typography variant="caption" color="text.secondary">
          © 2024 HMS Enterprise. All rights reserved. | 
          <Link to="/privacy" style={{ color: theme.palette.primary.main, textDecoration: 'none' }}>
            Privacy Policy
          </Link> | 
          <Link to="/terms" style={{ color: theme.palette.primary.main, textDecoration: 'none' }}>
            Terms of Service
          </Link>
        </Typography>
      </Box>
    </Box>
  );
};

export default Login;