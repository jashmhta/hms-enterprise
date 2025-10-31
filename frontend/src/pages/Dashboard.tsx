/**
 * Dashboard Page
 * HMS Enterprise Frontend
 * 
 * Main dashboard with overview statistics, charts, and recent activities.
 * Responsive design with healthcare-specific metrics.
 */

import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  LinearProgress,
  Chip,
} from '@mui/material';
import {
  People,
  CalendarToday,
  TrendingUp,
  MedicalServices,
  NotificationImportant,
  AccessTime,
  EventAvailable,
} from '@mui/icons-material';

const Dashboard: React.FC = () => {
  // Mock data - would come from API
  const stats = {
    totalPatients: 1247,
    todayAppointments: 45,
    pendingTasks: 12,
    criticalAlerts: 3,
    monthlyGrowth: 12.5,
    bedOccupancy: 78,
    averageWaitTime: 15,
  };

  const recentAppointments = [
    {
      id: 1,
      patient: 'John Doe',
      time: '09:00 AM',
      type: 'Consultation',
      status: 'Scheduled',
    },
    {
      id: 2,
      patient: 'Jane Smith',
      time: '09:30 AM',
      type: 'Follow-up',
      status: 'Checked In',
    },
    {
      id: 3,
      patient: 'Robert Johnson',
      time: '10:00 AM',
      type: 'Procedure',
      status: 'In Progress',
    },
  ];

  const alerts = [
    {
      id: 1,
      type: 'Critical Lab Result',
      message: 'Patient Sarah Williams has critical lab results',
      time: '5 minutes ago',
    },
    {
      id: 2,
      type: 'Emergency',
      message: 'Emergency admission requested',
      time: '12 minutes ago',
    },
    {
      id: 3,
      type: 'Medication Alert',
      message: 'Drug interaction detected for patient Michael Brown',
      time: '25 minutes ago',
    },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard Overview
      </Typography>
      
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Patients
                  </Typography>
                  <Typography variant="h4">{stats.totalPatients.toLocaleString()}</Typography>
                </Box>
                <People sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Today's Appointments
                  </Typography>
                  <Typography variant="h4">{stats.todayAppointments}</Typography>
                </Box>
                <CalendarToday sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Pending Tasks
                  </Typography>
                  <Typography variant="h4">{stats.pendingTasks}</Typography>
                </Box>
                <AccessTime sx={{ fontSize: 40, color: 'warning.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Critical Alerts
                  </Typography>
                  <Typography variant="h4" color="error.main">{stats.criticalAlerts}</Typography>
                </Box>
                <NotificationImportant sx={{ fontSize: 40, color: 'error.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Recent Appointments */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Appointments
            </Typography>
            <List>
              {recentAppointments.map((appointment) => (
                <ListItem key={appointment.id} divider>
                  <ListItemIcon>
                    <EventAvailable />
                  </ListItemIcon>
                  <ListItemText
                    primary={appointment.patient}
                    secondary={`${appointment.time} - ${appointment.type}`}
                  />
                  <Chip
                    label={appointment.status}
                    size="small"
                    color={
                      appointment.status === 'In Progress'
                        ? 'success'
                        : appointment.status === 'Checked In'
                        ? 'warning'
                        : 'primary'
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Critical Alerts */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom color="error.main">
              Critical Alerts
            </Typography>
            <List>
              {alerts.map((alert) => (
                <ListItem key={alert.id} divider>
                  <ListItemIcon>
                    <NotificationImportant color="error" />
                  </ListItemIcon>
                  <ListItemText
                    primary={alert.type}
                    secondary={alert.message}
                  />
                  <Typography variant="caption" color="textSecondary">
                    {alert.time}
                  </Typography>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Performance Metrics */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Performance Metrics
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Bed Occupancy</Typography>
                  <Typography variant="body2">{stats.bedOccupancy}%</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={stats.bedOccupancy}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Monthly Growth</Typography>
                  <Typography variant="body2">{stats.monthlyGrowth}%</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={stats.monthlyGrowth}
                  color="success"
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Card sx={{ textAlign: 'center', py: 2, cursor: 'pointer' }}>
                  <People sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
                  <Typography variant="caption">New Patient</Typography>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card sx={{ textAlign: 'center', py: 2, cursor: 'pointer' }}>
                  <CalendarToday sx={{ fontSize: 32, color: 'success.main', mb: 1 }} />
                  <Typography variant="caption">Schedule</Typography>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card sx={{ textAlign: 'center', py: 2, cursor: 'pointer' }}>
                  <MedicalServices sx={{ fontSize: 32, color: 'warning.main', mb: 1 }} />
                  <Typography variant="caption">Clinical</Typography>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card sx={{ textAlign: 'center', py: 2, cursor: 'pointer' }}>
                  <TrendingUp sx={{ fontSize: 32, color: 'info.main', mb: 1 }} />
                  <Typography variant="caption">Reports</Typography>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;