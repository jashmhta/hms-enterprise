/**
 * Material-UI Theme Configuration
 * HMS Enterprise Frontend
 * 
 * Professional healthcare theme with proper color palette,
 * typography, and component styling for medical applications.
 */

import { createTheme } from '@mui/material/styles';
import { zhCN } from '@mui/material/locale';

// Color palette - Healthcare focused with accessibility in mind
const palette = {
  primary: {
    main: '#1976d2', // Medical blue
    light: '#42a5f5',
    dark: '#1565c0',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#dc004e', // Medical red for alerts
    light: '#ff5983',
    dark: '#9a0036',
    contrastText: '#ffffff',
  },
  success: {
    main: '#2e7d32', // Health green
    light: '#4caf50',
    dark: '#1b5e20',
    contrastText: '#ffffff',
  },
  warning: {
    main: '#ed6c02', // Medical amber
    light: '#ff9800',
    dark: '#e65100',
    contrastText: '#ffffff',
  },
  error: {
    main: '#d32f2f', // Emergency red
    light: '#ef5350',
    dark: '#c62828',
    contrastText: '#ffffff',
  },
  info: {
    main: '#0288d1', // Information blue
    light: '#03a9f4',
    dark: '#01579b',
    contrastText: '#ffffff',
  },
  grey: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#eeeeee',
    300: '#e0e0e0',
    400: '#bdbdbd',
    500: '#9e9e9e',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },
  // Healthcare-specific colors
  medical: {
    emergency: '#d32f2f',     // Red for emergency
    critical: '#f57c00',     // Orange for critical
    urgent: '#ed6c02',       // Amber for urgent
    routine: '#1976d2',      // Blue for routine
    recovery: '#2e7d32',     // Green for recovery
    outpatient: '#7b1fa2',   // Purple for outpatient
    inpatient: '#00796b',    // Teal for inpatient
    surgery: '#5d4037',       // Brown for surgery
    lab: '#455a64',          // Blue-grey for lab
    pharmacy: '#00695c',     // Dark teal for pharmacy
    radiology: '#37474f',    // Dark grey for radiology
  },
  background: {
    default: '#f8f9fa',
    paper: '#ffffff',
  },
  text: {
    primary: 'rgba(0, 0, 0, 0.87)',
    secondary: 'rgba(0, 0, 0, 0.6)',
    disabled: 'rgba(0, 0, 0, 0.38)',
  },
  divider: 'rgba(0, 0, 0, 0.12)',
};

// Typography configuration optimized for medical applications
const typography = {
  fontFamily: [
    'Inter',
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'Roboto',
    '"Helvetica Neue"',
    'Arial',
    'sans-serif',
  ].join(','),
  h1: {
    fontSize: '2.5rem',
    fontWeight: 600,
    lineHeight: 1.2,
    letterSpacing: '-0.01562em',
  },
  h2: {
    fontSize: '2rem',
    fontWeight: 600,
    lineHeight: 1.3,
    letterSpacing: '-0.00833em',
  },
  h3: {
    fontSize: '1.75rem',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  h4: {
    fontSize: '1.5rem',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  h5: {
    fontSize: '1.25rem',
    fontWeight: 600,
    lineHeight: 1.5,
  },
  h6: {
    fontSize: '1rem',
    fontWeight: 600,
    lineHeight: 1.5,
  },
  subtitle1: {
    fontSize: '1rem',
    fontWeight: 500,
    lineHeight: 1.5,
  },
  subtitle2: {
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: 1.5,
  },
  body1: {
    fontSize: '1rem',
    lineHeight: 1.6,
  },
  body2: {
    fontSize: '0.875rem',
    lineHeight: 1.6,
  },
  button: {
    fontSize: '0.875rem',
    fontWeight: 600,
    lineHeight: 1.5,
    textTransform: 'none' as const,
  },
  caption: {
    fontSize: '0.75rem',
    lineHeight: 1.4,
  },
  overline: {
    fontSize: '0.75rem',
    fontWeight: 600,
    lineHeight: 1.4,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
};

// Spacing consistent with medical UI standards
const spacing = 8;

// Shape configuration
const shape = {
  borderRadius: 8,
  borderRadius: {
    xs: 4,
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
  },
};

// Breakpoints for responsive design
const breakpoints = {
  values: {
    xs: 0,
    sm: 600,
    md: 900,
    lg: 1200,
    xl: 1536,
    xxl: 1920, // Extra large for medical dashboards
  },
};

// Component customizations
const components = {
  MuiCssBaseline: {
    styleOverrides: {
      body: {
        scrollbarWidth: 'thin',
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          background: palette.grey[100],
        },
        '&::-webkit-scrollbar-thumb': {
          background: palette.grey[400],
          borderRadius: '4px',
        },
        '&::-webkit-scrollbar-thumb:hover': {
          background: palette.grey[600],
        },
      },
    },
  },
  MuiButton: {
    styleOverrides: {
      root: {
        minHeight: '44px', // WCAG touch target minimum
        textTransform: 'none',
        fontWeight: 600,
        borderRadius: shape.borderRadius.sm,
        padding: '12px 24px',
        fontSize: '0.875rem',
        lineHeight: 1.4,
        boxShadow: 'none',
        '&:hover': {
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        },
        '&.MuiButton-contained': {
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          },
        },
      },
      containedPrimary: {
        background: `linear-gradient(135deg, ${palette.primary.main} 0%, ${palette.primary.dark} 100%)`,
        '&:hover': {
          background: `linear-gradient(135deg, ${palette.primary.dark} 0%, ${palette.primary.main} 100%)`,
        },
      },
      containedSecondary: {
        background: `linear-gradient(135deg, ${palette.secondary.main} 0%, ${palette.secondary.dark} 100%)`,
        '&:hover': {
          background: `linear-gradient(135deg, ${palette.secondary.dark} 0%, ${palette.secondary.main} 100%)`,
        },
      },
      outlined: {
        borderWidth: 2,
        '&:hover': {
          borderWidth: 2,
        },
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: shape.borderRadius.md,
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
        border: `1px solid ${palette.grey[100]}`,
        '&:hover': {
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.12)',
        },
      },
    },
  },
  MuiCardContent: {
    styleOverrides: {
      root: {
        padding: '24px',
        '&:last-child': {
          paddingBottom: '24px',
        },
      },
    },
  },
  MuiCardHeader: {
    styleOverrides: {
      root: {
        padding: '24px 24px 16px 24px',
      },
      title: {
        fontSize: '1.125rem',
        fontWeight: 600,
      },
    },
  },
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: shape.borderRadius.sm,
          '&.Mui-focused fieldset': {
            borderColor: palette.primary.main,
            borderWidth: 2,
          },
          '&:hover fieldset': {
            borderColor: palette.primary.light,
          },
        },
        '& .MuiInputLabel-root': {
          fontWeight: 500,
        },
        '& .MuiFormHelperText-root': {
          fontSize: '0.75rem',
          marginTop: '4px',
        },
      },
    },
  },
  MuiFormControl: {
    styleOverrides: {
      root: {
        '& .MuiInputLabel-root': {
          fontWeight: 500,
        },
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: '16px',
        fontWeight: 600,
        fontSize: '0.75rem',
      },
      colorPrimary: {
        backgroundColor: palette.primary.light,
        color: palette.primary.dark,
      },
      colorSecondary: {
        backgroundColor: palette.secondary.light,
        color: palette.secondary.dark,
      },
      colorSuccess: {
        backgroundColor: palette.success.light,
        color: palette.success.dark,
      },
      colorWarning: {
        backgroundColor: palette.warning.light,
        color: palette.warning.dark,
      },
      colorError: {
        backgroundColor: palette.error.light,
        color: palette.error.dark,
      },
    },
  },
  MuiListItem: {
    styleOverrides: {
      root: {
        borderRadius: shape.borderRadius.sm,
        '&.Mui-selected': {
          backgroundColor: palette.primary.light + '20',
          '&:hover': {
            backgroundColor: palette.primary.light + '30',
          },
        },
      },
    },
  },
  MuiTableCell: {
    styleOverrides: {
      root: {
        borderBottom: `1px solid ${palette.grey[100]}`,
        fontSize: '0.875rem',
      },
      head: {
        backgroundColor: palette.grey[50],
        fontWeight: 600,
        color: palette.text.primary,
        borderBottom: `2px solid ${palette.primary.main}`,
      },
    },
  },
  MuiTableHead: {
    styleOverrides: {
      root: {
        '& .MuiTableCell-head': {
          fontWeight: 600,
        },
      },
    },
  },
  MuiAppBar: {
    styleOverrides: {
      root: {
        backgroundColor: palette.background.paper,
        color: palette.text.primary,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        borderBottom: `1px solid ${palette.grey[200]}`,
      },
    },
  },
  MuiToolbar: {
    styleOverrides: {
      root: {
        minHeight: '64px',
        height: '64px',
        paddingLeft: '24px',
        paddingRight: '24px',
      },
    },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: {
        borderRight: `1px solid ${palette.grey[200]}`,
        boxShadow: '2px 0 8px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  MuiListItemButton: {
    styleOverrides: {
      root: {
        borderRadius: shape.borderRadius.sm,
        margin: '2px 8px',
        '&.Mui-selected': {
          backgroundColor: palette.primary.light + '20',
          color: palette.primary.dark,
          '&:hover': {
            backgroundColor: palette.primary.light + '30',
          },
          '& .MuiListItemIcon-root': {
            color: palette.primary.dark,
          },
        },
      },
    },
  },
  MuiAlert: {
    styleOverrides: {
      root: {
        borderRadius: shape.borderRadius.sm,
        fontSize: '0.875rem',
        lineHeight: 1.4,
      },
      standardSuccess: {
        backgroundColor: palette.success.light + '20',
        color: palette.success.dark,
        '& .MuiAlert-icon': {
          color: palette.success.main,
        },
      },
      standardError: {
        backgroundColor: palette.error.light + '20',
        color: palette.error.dark,
        '& .MuiAlert-icon': {
          color: palette.error.main,
        },
      },
      standardWarning: {
        backgroundColor: palette.warning.light + '20',
        color: palette.warning.dark,
        '& .MuiAlert-icon': {
          color: palette.warning.main,
        },
      },
      standardInfo: {
        backgroundColor: palette.info.light + '20',
        color: palette.info.dark,
        '& .MuiAlert-icon': {
          color: palette.info.main,
        },
      },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: shape.borderRadius.md,
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
      },
    },
  },
  MuiDialogTitle: {
    styleOverrides: {
      root: {
        fontSize: '1.25rem',
        fontWeight: 600,
        padding: '24px 24px 16px 24px',
      },
    },
  },
  MuiDialogContent: {
    styleOverrides: {
      root: {
        padding: '0 24px 24px 24px',
        fontSize: '0.875rem',
        lineHeight: 1.6,
      },
    },
  },
  MuiDialogActions: {
    styleOverrides: {
      root: {
        padding: '16px 24px 24px 24px',
        gap: '12px',
      },
    },
  },
  MuiTab: {
    styleOverrides: {
      root: {
        textTransform: 'none',
        fontWeight: 600,
        fontSize: '0.875rem',
        minHeight: '48px',
        '&.Mui-selected': {
          color: palette.primary.main,
        },
      },
    },
  },
  MuiTabs: {
    styleOverrides: {
      indicator: {
        height: 3,
        borderRadius: '3px 3px 0 0',
        backgroundColor: palette.primary.main,
      },
    },
  },
};

// Create the theme
const theme = createTheme({
  palette,
  typography,
  spacing,
  shape,
  breakpoints,
  components,
});

// Export theme and utilities
export default theme;

// Export theme utilities
export const getMedicalColor = (status: string): string => {
  switch (status.toUpperCase()) {
    case 'EMERGENCY':
      return palette.medical.emergency;
    case 'CRITICAL':
      return palette.medical.critical;
    case 'URGENT':
      return palette.medical.urgent;
    case 'ROUTINE':
      return palette.medical.routine;
    case 'RECOVERY':
      return palette.medical.recovery;
    case 'OUTPATIENT':
      return palette.medical.outpatient;
    case 'INPATIENT':
      return palette.medical.inpatient;
    case 'SURGERY':
      return palette.medical.surgery;
    case 'LAB':
      return palette.medical.lab;
    case 'PHARMACY':
      return palette.medical.pharmacy;
    case 'RADIOLOGY':
      return palette.medical.radiology;
    default:
      return palette.primary.main;
  }
};

export const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'active':
    case 'completed':
    case 'confirmed':
    case 'scheduled':
      return palette.success.main;
    case 'pending':
    case 'in_progress':
    case 'processing':
      return palette.warning.main;
    case 'cancelled':
    case 'inactive':
    case 'failed':
    case 'error':
      return palette.error.main;
    case 'draft':
    case 'preliminary':
      return palette.info.main;
    default:
      return palette.grey[500];
  }
};

export const getContrastText = (backgroundColor: string): string => {
  // Simple contrast calculation - could be enhanced with proper luminance calculation
  const color = backgroundColor.replace('#', '');
  const r = parseInt(color.substr(0, 2), 16);
  const g = parseInt(color.substr(2, 2), 16);
  const b = parseInt(color.substr(4, 2), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return yiq >= 128 ? '#000000' : '#ffffff';
};