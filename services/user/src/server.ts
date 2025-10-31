// HMS User Service Server Entry Point
// Application bootstrap and startup

import HMSUserApp from './app';
import { config } from '@/config';

// =============================================================================
// SERVER STARTUP
// =============================================================================

async function startServer(): Promise<void> {
  try {
    console.log('🏥 HMS User Service');
    console.log('==================');
    console.log(`Environment: ${config.nodeEnv}`);
    console.log(`Service Name: ${config.serviceName}`);
    console.log(`Port: ${config.port}`);
    console.log('Initializing service...\n');

    const app = new HMSUserApp();
    await app.start();

  } catch (error) {
    console.error('\n❌ Failed to start HMS User Service:', error.message);

    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }

    process.exit(1);
  }
}

// =============================================================================
// HANDLE UNCAUGHT ERRORS
// =============================================================================

process.on('unhandledRejection', (reason: any, promise) => {
  console.error('\n💥 Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error: Error) => {
  console.error('\n💥 Uncaught Exception:', error.message);
  if (error.stack) {
    console.error('\nStack trace:');
    console.error(error.stack);
  }
  process.exit(1);
});

// =============================================================================
// START SERVER
// =============================================================================

if (require.main === module) {
  startServer();
}

export default startServer;