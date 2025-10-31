// HMS Patient Service Server Entry Point
// Application bootstrap and startup

import HMSPatientApp from './app';
import { config } from '@/config';

// =============================================================================
// SERVER STARTUP
// =============================================================================

async function startServer(): Promise<void> {
  try {
    console.log('🏥 HMS Patient Service');
    console.log('========================');
    console.log(`Environment: ${config.nodeEnv}`);
    console.log(`Service Name: ${config.serviceName}`);
    console.log(`Port: ${config.port}`);
    console.log(`Database: ${config.database.host}:${config.database.port}/${config.database.name}`);
    console.log(`Redis: ${config.redis.host}:${config.redis.port}`);
    console.log(`ABDM Enabled: ${config.abdm.enabled}`);
    console.log(`ABDM Mode: ${config.abdm.mode}`);
    console.log('Initializing service...\n');

    const app = new HMSPatientApp();
    await app.start();

  } catch (error) {
    console.error('\n❌ Failed to start HMS Patient Service:', error.message);

    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }

    // Log additional error details if available
    if ((error as any).code) {
      console.error('\nError code:', (error as any).code);
    }

    if ((error as any).errno) {
      console.error('\nError number:', (error as any).errno);
    }

    // Check for common startup issues
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Possible solutions:');
      console.error('   - Check if PostgreSQL is running on the configured host and port');
      console.error('   - Verify database connection parameters in environment variables');
      console.error('   - Ensure database server is accessible from this container');
    }

    if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      console.error('\n💡 Possible solutions:');
      console.error('   - Check network connectivity');
      console.error('   - Verify hostnames in configuration');
      console.error('   - Check DNS resolution');
    }

    if (error.message.includes('authentication failed') || error.message.includes('password')) {
      console.error('\n💡 Possible solutions:');
      console.error('   - Verify database credentials');
      console.error('   - Check database user permissions');
      console.error('   - Ensure database user exists and has required privileges');
    }

    if (error.message.includes('permission denied')) {
      console.error('\n💡 Possible solutions:');
      console.error('   - Check file/directory permissions');
      console.error('   - Verify user has required access rights');
      console.error('   - Check ownership of application files');
    }

    console.error('\n🔧 Configuration check:');
    console.error(`   - Node Environment: ${config.nodeEnv}`);
    console.error(`   - Database Host: ${config.database.host}`);
    console.error(`   - Database Port: ${config.database.port}`);
    console.error(`   - Database Name: ${config.database.name}`);
    console.error(`   - Redis Host: ${config.redis.host}`);
    console.error(`   - Redis Port: ${config.redis.port}`);

    process.exit(1);
  }
}

// =============================================================================
// HANDLE UNCAUGHT ERRORS
// =============================================================================

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('\n💥 Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  console.error('Stack:', reason?.stack);
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

// Handle SIGTERM for graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n📴 SIGTERM received, shutting down gracefully...');
  // Graceful shutdown will be handled by the app class
  setTimeout(() => {
    console.log('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 30000); // 30 second timeout
});

// Handle SIGINT for graceful shutdown
process.on('SIGINT', () => {
  console.log('\n📴 SIGINT received, shutting down gracefully...');
  // Graceful shutdown will be handled by the app class
  setTimeout(() => {
    console.log('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 30000); // 30 second timeout
});

// Handle warning events
process.on('warning', (warning: Error) => {
  console.warn('\n⚠️  Process Warning:', warning.name);
  console.warn('Message:', warning.message);
  console.warn('Stack:', warning.stack);
});

// =============================================================================
// START SERVER
// =============================================================================

if (require.main === module) {
  startServer();
}

export default startServer;