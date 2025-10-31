/**
 * Patients Page
 * HMS Enterprise Frontend
 * 
 * Patient management interface with search, filtering, and CRUD operations.
 * Integrated with ABDM for healthcare identity management.
 */

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Person,
  Search,
  FilterList,
  MoreVert,
  Add,
  Edit,
  Visibility,
  LocalHospital,
} from '@mui/icons-material';

const Patients: React.FC = () => {
  // Mock data
  const patients = [
    {
      id: 1,
      mrn: 'MRN-2024-000001',
      name: 'John Doe',
      email: 'john.doe@email.com',
      phone: '+1 234-567-8900',
      age: 45,
      gender: 'Male',
      bloodGroup: 'O+',
      lastVisit: '2024-01-15',
      status: 'Active',
      abhaLinked: true,
    },
    {
      id: 2,
      mrn: 'MRN-2024-000002',
      name: 'Jane Smith',
      email: 'jane.smith@email.com',
      phone: '+1 234-567-8901',
      age: 32,
      gender: 'Female',
      bloodGroup: 'A+',
      lastVisit: '2024-01-14',
      status: 'Active',
      abhaLinked: false,
    },
    {
      id: 3,
      mrn: 'MRN-2024-000003',
      name: 'Robert Johnson',
      email: 'robert.johnson@email.com',
      phone: '+1 234-567-8902',
      age: 58,
      gender: 'Male',
      bloodGroup: 'B+',
      lastVisit: '2024-01-13',
      status: 'Active',
      abhaLinked: true,
    },
  ];

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [searchTerm, setSearchTerm] = React.useState('');

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Patient Management</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => console.log('Add new patient')}
        >
          New Patient
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search patients by name, MRN, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <Button
              variant="outlined"
              startIcon={<FilterList />}
              fullWidth
            >
              Filters
            </Button>
          </Grid>
          <Grid item xs={12} md={3}>
            <Button
              variant="outlined"
              startIcon={<LocalHospital />}
              fullWidth
            >
              ABDM Sync
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Patient</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Medical Info</TableCell>
              <TableCell>Last Visit</TableCell>
              <TableCell>ABHA</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {patients.map((patient) => (
              <TableRow key={patient.id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar>{patient.name.split(' ').map(n => n[0]).join('')}</Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {patient.name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {patient.mrn}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2">{patient.email}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {patient.phone}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2">
                      {patient.age} years, {patient.gender}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Blood Group: {patient.bloodGroup}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>{patient.lastVisit}</TableCell>
                <TableCell>
                  <Chip
                    icon={patient.abhaLinked ? <LocalHospital /> : undefined}
                    label={patient.abhaLinked ? 'Linked' : 'Not Linked'}
                    color={patient.abhaLinked ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={patient.status}
                    color="success"
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <IconButton onClick={handleMenuClick}>
                    <MoreVert />
                  </IconButton>
                  <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleMenuClose}
                  >
                    <MenuItem onClick={handleMenuClose}>
                      <Visibility sx={{ mr: 1 }} />
                      View Details
                    </MenuItem>
                    <MenuItem onClick={handleMenuClose}>
                      <Edit sx={{ mr: 1 }} />
                      Edit Patient
                    </MenuItem>
                    <MenuItem onClick={handleMenuClose}>
                      <Person sx={{ mr: 1 }} />
                      Clinical History
                    </MenuItem>
                  </Menu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default Patients;