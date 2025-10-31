/**
 * Server Entry Point for Clinical Service
 * HMS Enterprise
 * 
 * Main server file that starts the Clinical microservice.
 * Initializes Express app, connects to database, and starts HTTP server.
 */

import { createServer } from 'http';
import ClinicalApp from './app';
import { logger } from '../../shared/utils/logger';
import config from './config';

// Graceful shutdown handler
const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  server.close(() => {
    logger.info('HTTP server closed');
    
    // Close database connections
    process.exit(0);
  });

  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

// Start the server
const clinicalApp = new ClinicalApp();
const server = createServer(clinicalApp.getApp());
const PORT = config.port || 3004;

server.listen(PORT, () => {
  logger.info(`Clinical Service started on port ${PORT}`, {
    port: PORT,
    environment: config.nodeEnv,
    serviceName: 'clinical-service',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Handle process signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason,
    promise
  });
  process.exit(1);
});

export default server;