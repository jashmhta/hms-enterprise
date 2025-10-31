// HMS Patient Service Application
// Express application setup with middleware, routes, and ABDM integration

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { Logger } from '@hms/shared';
import { DatabaseConnectionManager } from '@hms/shared';
import { EventBus } from '@hms/shared';
import { config } from '@/config';
import { PatientRepository } from '@/repositories/patient.repository';
import { ABDMService } from '@/services/abdm.service';
import { PatientService } from '@/services/patient.service';
import { PatientController } from '@/controllers/patient.controller';
import { authMiddleware } from '@/middleware/auth.middleware';
import { requestLoggerMiddleware } from '@/middleware/request-logger.middleware';
import { errorHandlerMiddleware } from '@/middleware/error-handler.middleware';
import { patientValidationMiddleware } from '@/middleware/validation.middleware';

// =============================================================================
// PATIENT SERVICE APPLICATION CLASS
// =============================================================================

export class HMSPatientApp {
  private app: Application;
  private logger: Logger;
  private dbManager: DatabaseConnectionManager;
  private eventBus: EventBus;
  private patientRepository: PatientRepository;
  private abdmService: ABDMService;
  private patientService: PatientService;
  private patientController: PatientController;

  constructor() {
    this.app = express();
    this.logger = new Logger({
      service: 'HMSPatientApp',
      level: config.logLevel,
      structured: true
    });

    this.dbManager = new DatabaseConnectionManager(config.database, this.logger);
    this.eventBus = new EventBus(config.eventBus, this.logger);
  }

  // =============================================================================
  // APPLICATION INITIALIZATION
  // =============================================================================

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing HMS Patient Service...');

      // Initialize database connection
      await this.initializeDatabase();

      // Initialize event bus
      await this.initializeEventBus();

      // Initialize services
      await this.initializeServices();

      // Setup middleware
      this.setupMiddleware();

      // Setup routes
      this.setupRoutes();

      // Setup error handling
      this.setupErrorHandling();

      this.logger.info('HMS Patient Service initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize HMS Patient Service', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  // =============================================================================
  // DATABASE INITIALIZATION
  // =============================================================================

  private async initializeDatabase(): Promise<void> {
    try {
      this.logger.info('Initializing database connection...');
      await this.dbManager.initialize();
      this.logger.info('Database connection established');

    } catch (error) {
      this.logger.error('Failed to initialize database', {
        error: error.message
      });
      throw error;
    }
  }

  // =============================================================================
  // EVENT BUS INITIALIZATION
  // =============================================================================

  private async initializeEventBus(): Promise<void> {
    try {
      this.logger.info('Initializing event bus...');
      await this.eventBus.initialize();
      this.logger.info('Event bus initialized');

    } catch (error) {
      this.logger.error('Failed to initialize event bus', {
        error: error.message
      });
      throw error;
    }
  }

  // =============================================================================
  // SERVICES INITIALIZATION
  // =============================================================================

  private async initializeServices(): Promise<void> {
    try {
      this.logger.info('Initializing services...');

      // Initialize repository
      this.patientRepository = new PatientRepository(
        this.dbManager.getPool(),
        this.logger
      );

      // Initialize ABDM service
      this.abdmService = new ABDMService(this.logger);

      // Initialize patient service
      this.patientService = new PatientService(
        this.patientRepository,
        this.abdmService,
        this.eventBus,
        this.logger
      );

      // Initialize controller
      this.patientController = new PatientController(
        this.patientService,
        this.logger
      );

      this.logger.info('All services initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize services', {
        error: error.message
      });
      throw error;
    }
  }

  // =============================================================================
  // MIDDLEWARE SETUP
  // =============================================================================

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }));

    // CORS middleware
    this.app.use(cors({
      origin: config.cors.origin,
      credentials: config.cors.credentials,
      methods: config.cors.methods,
      allowedHeaders: config.cors.headers,
      optionsSuccessStatus: 204
    }));

    // Compression middleware
    this.app.use(compression());

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging middleware
    this.app.use(requestLoggerMiddleware(this.logger));

    // Rate limiting
    this.setupRateLimiting();

    // Trust proxy for IP address detection
    this.app.set('trust proxy', 1);

    // Request timing
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      res.locals.startTime = Date.now();
      next();
    });
  }

  private setupRateLimiting(): void {
    // General rate limiting
    const generalLimiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.maxRequests,
      message: {
        success: false,
        message: 'Too many requests from this IP',
        errors: ['Rate limit exceeded']
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req: Request, res: Response) => {
        this.logger.warn('Rate limit exceeded', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path
        });
        res.status(429).json({
          success: false,
          message: 'Too many requests from this IP',
          errors: ['Rate limit exceeded']
        });
      }
    });

    // Patient search rate limiting
    const patientSearchLimiter = rateLimit({
      windowMs: config.rateLimit.patientSearchWindowMs,
      max: config.rateLimit.patientSearchMaxRequests,
      message: {
        success: false,
        message: 'Too many patient search requests',
        errors: ['Patient search rate limit exceeded']
      },
      skip: (req: Request) => {
        // Skip rate limiting for internal service calls
        return req.headers['x-internal-service'] === 'true';
      }
    });

    // Document upload rate limiting
    const documentUploadLimiter = rateLimit({
      windowMs: config.rateLimit.documentUploadWindowMs,
      max: config.rateLimit.documentUploadMaxRequests,
      message: {
        success: false,
        message: 'Too many document upload requests',
        errors: ['Document upload rate limit exceeded']
      }
    });

    this.app.use(generalLimiter);
    this.app.use('/api/v1/patients/search', patientSearchLimiter);
    this.app.use('/api/v1/patients/*/documents', documentUploadLimiter);
  }

  // =============================================================================
  // ROUTES SETUP
  // =============================================================================

  private setupRoutes(): void {
    // Health check endpoint (no auth required)
    this.app.get('/health', this.patientController.healthCheck);
    this.app.get('/api/v1/health', this.patientController.healthCheck);

    // API information endpoint
    this.app.get('/api/v1/info', (req: Request, res: Response) => {
      res.json({
        success: true,
        message: 'HMS Patient Service API',
        data: {
          name: config.serviceName,
          version: '1.0.0',
          description: 'HMS Patient Service with ABDM Integration',
          environment: config.nodeEnv,
          documentation: '/api/v1/docs',
          endpoints: {
            health: '/health',
            patients: '/api/v1/patients',
            abdm: '/api/v1/abdm'
          },
          features: {
            abdmIntegration: config.abdm.enabled,
            documentManagement: true,
            search: true,
            visits: true
          }
        }
      });
    });

    // API routes with authentication
    const apiRouter = express.Router();

    // Apply authentication middleware to all API routes
    apiRouter.use(authMiddleware);

    // Patient routes
    this.setupPatientRoutes(apiRouter);

    // Patient visit routes
    this.setupPatientVisitRoutes(apiRouter);

    // ABDM integration routes
    this.setupABDMRoutes(apiRouter);

    // Profile routes
    this.setupProfileRoutes(apiRouter);

    // Admin routes (additional permissions required)
    this.setupAdminRoutes(apiRouter);

    // Mount API router
    this.app.use('/api/v1', apiRouter);

    // Service status endpoint
    this.app.get('/service-status', async (req: Request, res: Response) => {
      try {
        const abdmHealth = config.abdm.enabled
          ? await this.abdmService.healthCheck()
          : { status: 'disabled', abdmEnabled: false };

        res.json({
          success: true,
          message: 'Service status retrieved successfully',
          data: {
            service: config.serviceName,
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: {
              status: 'connected',
              poolSize: this.dbManager.getPool().totalCount,
              idleConnections: this.dbManager.getPool().idleCount,
              activeConnections: this.dbManager.getPool().totalCount - this.dbManager.getPool().idleCount
            },
            redis: {
              status: this.eventBus.isConnected() ? 'connected' : 'disconnected'
            },
            abdm: abdmHealth
          }
        });

      } catch (error) {
        res.status(500).json({
          success: false,
          message: 'Failed to get service status',
          errors: [error.message]
        });
      }
    });
  }

  private setupPatientRoutes(router: express.Router): void {
    const patientRouter = express.Router();

    // Create patient
    patientRouter.post(
      '/',
      patientValidationMiddleware.createPatient,
      this.patientController.createPatient
    );

    // Search patients
    patientRouter.get(
      '/search',
      patientValidationMiddleware.searchPatients,
      this.patientController.searchPatients
    );

    // Get patient summaries
    patientRouter.get(
      '/summaries',
      this.patientController.getPatientSummaries
    );

    // Get patient by ID
    patientRouter.get(
      '/:patientId',
      this.patientController.getPatientById
    );

    // Get patient by MRN
    patientRouter.get(
      '/mrn/:mrn',
      this.patientController.getPatientByMRN
    );

    // Update patient
    patientRouter.put(
      '/:patientId',
      patientValidationMiddleware.updatePatient,
      this.patientController.updatePatient
    );

    // Delete patient
    patientRouter.delete(
      '/:patientId',
      this.patientController.deletePatient
    );

    router.use('/patients', patientRouter);
  }

  private setupPatientVisitRoutes(router: express.Router): void {
    const visitRouter = express.Router();

    // Create patient visit
    visitRouter.post(
      '/:patientId/visits',
      patientValidationMiddleware.createVisit,
      this.patientController.createPatientVisit
    );

    // Get patient visits
    visitRouter.get(
      '/:patientId/visits',
      this.patientController.getPatientVisits
    );

    router.use('/patients', visitRouter);
  }

  private setupABDMRoutes(router: express.Router): void {
    const abdmRouter = express.Router();

    // Get ABDM status
    abdmRouter.get(
      '/status',
      this.patientController.getABDMStatus
    );

    // Generate Aadhaar OTP
    abdmRouter.post(
      '/aadhaar/otp',
      patientValidationMiddleware.generateAadhaarOtp,
      this.patientController.generateAadhaarOtp
    );

    // Verify Aadhaar OTP
    abdmRouter.post(
      '/aadhaar/verify',
      patientValidationMiddleware.verifyAadhaarOtp,
      this.patientController.verifyAadhaarOtp
    );

    // Create ABHA
    abdmRouter.post(
      '/abha/create',
      patientValidationMiddleware.createABHA,
      this.patientController.createABHA
    );

    // Link ABHA to patient
    abdmRouter.post(
      '/patients/:patientId/link-abha',
      patientValidationMiddleware.linkABHA,
      this.patientController.linkABHAToPatient
    );

    // Create ABDM consent
    abdmRouter.post(
      '/patients/:patientId/consent',
      patientValidationMiddleware.createConsent,
      this.patientController.createABDMConsent
    );

    router.use('/abdm', abdmRouter);
  }

  private setupProfileRoutes(router: express.Router): void {
    const profileRouter = express.Router();

    // Get patient profile (comprehensive view)
    profileRouter.get(
      '/:patientId/profile',
      this.patientController.getPatientProfile
    );

    router.use('/patients', profileRouter);
  }

  private setupAdminRoutes(router: express.Router): void {
    const adminRouter = express.Router();

    // Admin-only endpoints can be added here
    // For example: bulk operations, analytics, reports, etc.

    router.use('/admin', adminRouter);
  }

  // =============================================================================
  // ERROR HANDLING SETUP
  // =============================================================================

  private setupErrorHandling(): void {
    // 404 handler
    this.app.use('*', this.patientController.handleNotFoundError);

    // Method not allowed handler
    this.app.use('*', this.patientController.handleMethodNotAllowed);

    // Global error handler
    this.app.use(errorHandlerMiddleware(this.logger));

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      this.logger.error('Unhandled Rejection', {
        reason: reason.toString(),
        promise: promise.toString(),
        stack: reason.stack
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      this.logger.error('Uncaught Exception', {
        error: error.message,
        stack: error.stack
      });

      // Graceful shutdown
      this.gracefulShutdown();
    });

    // Handle SIGTERM
    process.on('SIGTERM', () => {
      this.logger.info('SIGTERM received, initiating graceful shutdown...');
      this.gracefulShutdown();
    });

    // Handle SIGINT
    process.on('SIGINT', () => {
      this.logger.info('SIGINT received, initiating graceful shutdown...');
      this.gracefulShutdown();
    });
  }

  // =============================================================================
  // GRACEFUL SHUTDOWN
  // =============================================================================

  private async gracefulShutdown(): Promise<void> {
    try {
      this.logger.info('Starting graceful shutdown...');

      // Stop accepting new requests
      // Note: Express will handle this automatically when the process exits

      // Close database connections
      if (this.dbManager) {
        await this.dbManager.close();
        this.logger.info('Database connections closed');
      }

      // Close event bus connections
      if (this.eventBus) {
        await this.eventBus.close();
        this.logger.info('Event bus connections closed');
      }

      this.logger.info('Graceful shutdown completed');

    } catch (error) {
      this.logger.error('Error during graceful shutdown', {
        error: error.message
      });
      process.exit(1);
    }

    process.exit(0);
  }

  // =============================================================================
  // APPLICATION START
  // =============================================================================

  async start(): Promise<void> {
    try {
      await this.initialize();

      this.app.listen(config.port, () => {
        this.logger.info('🏥 HMS Patient Service Started', {
          environment: config.nodeEnv,
          port: config.port,
          serviceName: config.serviceName,
          nodeVersion: process.version,
          memoryUsage: process.memoryUsage(),
          pid: process.pid,
          features: {
            abdmIntegration: config.abdm.enabled,
            database: 'PostgreSQL',
            eventBus: 'Redis',
            authentication: 'JWT',
            validation: 'Express Validator'
          }
        });
      });

    } catch (error) {
      this.logger.error('Failed to start HMS Patient Service', {
        error: error.message,
        stack: error.stack
      });
      process.exit(1);
    }
  }

  // =============================================================================
  // GETTERS
  // =============================================================================

  getApp(): Application {
    return this.app;
  }

  getDbManager(): DatabaseConnectionManager {
    return this.dbManager;
  }

  getEventBus(): EventBus {
    return this.eventBus;
  }

  getPatientService(): PatientService {
    return this.patientService;
  }

  getLogger(): Logger {
    return this.logger;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default HMSPatientApp;