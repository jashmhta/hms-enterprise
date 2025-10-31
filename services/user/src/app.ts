// HMS User Service Express Application
// Main Express application setup with middleware and configuration

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import expressRateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';

import { Logger, createLoggerMiddleware, correlationIdMiddleware } from '@hms/shared/logger';
import { DatabaseManager, getDefaultDatabaseConfig } from '@hms/shared/database';
import { getEventBus, getDefaultEventBusConfig } from '@hms/shared/event-bus';
import { getJWTManager, JWTManager } from '@/utils/jwt';
import { getPasswordManager, PasswordManager } from '@/utils/password';
import { UserRepository } from '@/repositories/user.repository';
import { AuthService } from '@/services/auth.service';
import { UserService } from '@/services/user.service';
import { AuthController } from '@/controllers/auth.controller';
import { UserController } from '@/controllers/user.controller';
import { ValidationMiddleware } from '@/middleware/validation.middleware';
import { AuthenticationMiddleware } from '@/middleware/auth.middleware';
import { ErrorMiddleware } from '@/middleware/error.middleware';
import { setupRoutes } from '@/routes';
import { config } from '@/config';

// =============================================================================
// APPLICATION CLASS
// =============================================================================

export class HMSUserApp {
  public app: Application;
  private logger: Logger;
  private databaseManager: DatabaseManager;
  private jwtManager: JWTManager;
  private passwordManager: PasswordManager;
  private eventBus: any;
  private userRepository: UserRepository;
  private authService: AuthService;
  private userService: UserService;
  private authController: AuthController;
  private userController: UserController;
  private validationMiddleware: ValidationMiddleware;
  private authMiddleware: AuthenticationMiddleware;
  private errorMiddleware: ErrorMiddleware;

  constructor() {
    this.app = express();
    this.logger = new Logger({
      serviceName: config.serviceName,
      environment: config.nodeEnv,
      logLevel: config.logLevel
    });
  }

  // =============================================================================
  // APPLICATION INITIALIZATION
  // =============================================================================

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing HMS User Service...');

      // Initialize database
      await this.initializeDatabase();

      // Initialize JWT manager
      await this.initializeJWT();

      // Initialize password manager
      this.initializePasswordManager();

      // Initialize event bus
      await this.initializeEventBus();

      // Initialize repositories and services
      this.initializeServices();

      // Setup middleware
      this.setupMiddleware();

      // Setup routes
      this.setupRoutes();

      // Setup error handling
      this.setupErrorHandling();

      this.logger.info('HMS User Service initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize HMS User Service', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  // =============================================================================
  // INITIALIZATION METHODS
  // =============================================================================

  private async initializeDatabase(): Promise<void> {
    try {
      this.databaseManager = new DatabaseManager(getDefaultDatabaseConfig(), this.logger);
      this.logger.info('Database manager initialized');

    } catch (error) {
      this.logger.error('Failed to initialize database', { error: error.message });
      throw error;
    }
  }

  private async initializeJWT(): Promise<void> {
    try {
      this.jwtManager = getJWTManager(this.logger);
      await this.jwtManager.initializeKeys();
      this.logger.info('JWT manager initialized');

    } catch (error) {
      this.logger.error('Failed to initialize JWT manager', { error: error.message });
      throw error;
    }
  }

  private initializePasswordManager(): void {
    try {
      this.passwordManager = getPasswordManager(this.logger);
      this.logger.info('Password manager initialized');

    } catch (error) {
      this.logger.error('Failed to initialize password manager', { error: error.message });
      throw error;
    }
  }

  private async initializeEventBus(): Promise<void> {
    try {
      const eventBusConfig = getDefaultEventBusConfig();
      eventBusConfig.redis = {
        host: config.eventBus.redis.host,
        port: config.eventBus.redis.port,
        password: config.eventBus.redis.password,
        db: config.eventBus.redis.db
      };

      this.eventBus = getEventBus(eventBusConfig);
      this.logger.info('Event bus initialized');

    } catch (error) {
      this.logger.error('Failed to initialize event bus', { error: error.message });
      throw error;
    }
  }

  private initializeServices(): void {
    try {
      // Initialize repositories
      this.userRepository = new UserRepository(this.databaseManager, this.logger);

      // Initialize services
      this.authService = new AuthService(
        this.userRepository,
        this.jwtManager,
        this.passwordManager,
        this.eventBus,
        this.logger,
        this.databaseManager
      );

      this.userService = new UserService(
        this.userRepository,
        this.passwordManager,
        this.eventBus,
        this.logger,
        this.databaseManager
      );

      // Initialize controllers
      this.authController = new AuthController(this.authService, this.logger);
      this.userController = new UserController(this.userService, this.logger);

      // Initialize middleware
      this.validationMiddleware = new ValidationMiddleware(this.logger);
      this.authMiddleware = new AuthenticationMiddleware(
        this.jwtManager,
        this.userRepository,
        this.logger
      );
      this.errorMiddleware = new ErrorMiddleware(this.logger);

      this.logger.info('Services and controllers initialized');

    } catch (error) {
      this.logger.error('Failed to initialize services', { error: error.message });
      throw error;
    }
  }

  // =============================================================================
  // MIDDLEWARE SETUP
  // =============================================================================

  private setupMiddleware(): void {
    // Security headers
    this.app.use(this.authMiddleware.securityHeaders);

    // CORS configuration
    this.app.use(cors({
      origin: config.cors.origin,
      credentials: config.cors.credentials,
      methods: config.cors.methods,
      allowedHeaders: config.cors.headers
    }));

    // Request parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    this.app.use(cookieParser());

    // Compression
    this.app.use(compression());

    // Request ID and correlation ID
    this.app.use(this.authMiddleware.requestId);
    this.app.use(correlationIdMiddleware(this.logger));
    this.app.use(createLoggerMiddleware(this.logger));

    // Rate limiting
    this.app.use(expressRateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.maxRequests,
      message: {
        success: false,
        message: 'Too many requests from this IP, please try again later',
        code: 'RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false
    }));

    // Request logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();

      res.on('finish', () => {
        const duration = Date.now() - start;
        this.logger.http(`${req.method} ${req.originalUrl}`, {
          statusCode: res.statusCode,
          duration,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          requestId: req.headers['x-request-id'],
          correlationId: req.headers['x-correlation-id']
        });
      });

      next();
    });

    this.logger.info('Middleware configured');
  }

  // =============================================================================
  // ROUTES SETUP
  // =============================================================================

  private setupRoutes(): void {
    setupRoutes(
      this.app,
      this.authController,
      this.userController,
      this.validationMiddleware,
      this.authMiddleware,
      this.errorMiddleware,
      this.logger
    );

    this.logger.info('Routes configured');
  }

  // =============================================================================
  // ERROR HANDLING SETUP
  // =============================================================================

  private setupErrorHandling(): void {
    // 404 handler
    this.app.use(this.errorMiddleware.notFoundHandler);

    // Global error handler
    this.app.use(this.errorMiddleware.errorHandler);

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any, promise) => {
      this.logger.error('Unhandled Rejection at:', {
        promise,
        reason: reason.toString(),
        stack: reason.stack
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      this.logger.error('Uncaught Exception:', {
        error: error.message,
        stack: error.stack
      });
      process.exit(1);
    });

    this.logger.info('Error handling configured');
  }

  // =============================================================================
  // APPLICATION START
  // =============================================================================

  async start(): Promise<void> {
    try {
      await this.initialize();

      const server = this.app.listen(config.port, () => {
        this.logger.info(`HMS User Service started successfully`, {
          port: config.port,
          environment: config.nodeEnv,
          serviceName: config.serviceName,
          processId: process.pid
        });

        // Log service information
        console.log('\n🚀 HMS User Service Started');
        console.log(`📍 Port: ${config.port}`);
        console.log(`🌍 Environment: ${config.nodeEnv}`);
        console.log(`📖 API Documentation: http://localhost:${config.port}/api/v1/docs`);
        console.log(`🏥 Health Check: http://localhost:${config.port}/api/v1/health`);
        console.log(`ℹ️  API Info: http://localhost:${config.port}/api/v1/info`);
        console.log('');
      });

      // Graceful shutdown handling
      const gracefulShutdown = (signal: string) => {
        this.logger.info(`Received ${signal}, shutting down gracefully...`);

        server.close(() => {
          this.logger.info('HTTP server closed');

          // Close database connections
          if (this.databaseManager) {
            this.databaseManager.close().then(() => {
              this.logger.info('Database connections closed');
              process.exit(0);
            }).catch((error) => {
              this.logger.error('Error closing database connections', { error: error.message });
              process.exit(1);
            });
          } else {
            process.exit(0);
          }
        });

        // Force close after 10 seconds
        setTimeout(() => {
          this.logger.error('Forced shutdown due to timeout');
          process.exit(1);
        }, 10000);
      };

      process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
      process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    } catch (error) {
      this.logger.error('Failed to start HMS User Service', {
        error: error.message,
        stack: error.stack
      });
      process.exit(1);
    }
  }

  // =============================================================================
  // HEALTH CHECK
  // =============================================================================

  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    services: Record<string, any>;
    uptime: number;
  }> {
    try {
      const healthData = {
        status: 'healthy' as 'healthy' | 'unhealthy',
        services: {
          database: await this.checkDatabaseHealth(),
          jwt: this.checkJWTHealth(),
          eventBus: await this.checkEventBusHealth()
        },
        uptime: process.uptime()
      };

      // Overall health status
      healthData.status = Object.values(healthData.services)
        .every(service => service.status === 'healthy') ? 'healthy' : 'unhealthy';

      return healthData;

    } catch (error) {
      return {
        status: 'unhealthy',
        services: {
          error: error.message
        },
        uptime: process.uptime()
      };
    }
  }

  // =============================================================================
  // HEALTH CHECK HELPERS
  // =============================================================================

  private async checkDatabaseHealth(): Promise<{ status: string; responseTime?: number }> {
    try {
      const start = Date.now();
      await this.databaseManager.healthCheck();
      const responseTime = Date.now() - start;

      return { status: 'healthy', responseTime };

    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  private checkJWTHealth(): { status: string; keyId?: string; keyAge?: number } {
    try {
      const keyId = this.jwtManager.getKeyId();
      const keyAge = this.jwtManager.getKeyAge();

      return { status: 'healthy', keyId, keyAge };

    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  private async checkEventBusHealth(): Promise<{ status: string; connectionStatus?: boolean }> {
    try {
      const isHealthy = await this.eventBus.healthCheck();
      return { status: isHealthy ? 'healthy' : 'unhealthy', connectionStatus: isHealthy };

    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  // =============================================================================
  // GETTERS
  // =============================================================================

  getApp(): Application {
    return this.app;
  }

  getLogger(): Logger {
    return this.logger;
  }
}

export default HMSUserApp;