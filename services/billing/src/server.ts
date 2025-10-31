import { BillingApp } from './app';
import { logger } from '@hms-helpers/shared';

async function startServer(): Promise<void> {
  try {
    const billingApp = new BillingApp();
    await billingApp.start();
  } catch (error) {
    logger.error('Failed to start billing server', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception in billing server', { 
    error: error.message, 
    stack: error.stack 
  });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection in billing server', { reason, promise });
  process.exit(1);
});

// Start the server
startServer();