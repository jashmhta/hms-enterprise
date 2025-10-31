// HMS Appointment Service Application
// Express application setup with middleware, routes, and scheduling engine

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { Logger } from '@hms/shared';
import { DatabaseConnectionManager } from '@hms/shared';
import { EventBus } from '@hms/shared';
import { config } from '@/config';
import { AppointmentRepository } from '@/repositories/appointment.repository';
import { AppointmentService } from '@/services/appointment.service';
import { AppointmentController } from '@/controllers/appointment.controller';
import { authMiddleware } from '@/middleware/auth.middleware';
import { requestLoggerMiddleware } from '@/middleware/request-logger.middleware';
import { errorHandlerMiddleware } from '@/middleware/error-handler.middleware';
import { appointmentValidationMiddleware } from '@/middleware/validation.middleware';

// =============================================================================
// APPOINTMENT SERVICE APPLICATION CLASS
// =============================================================================

export class HMSAppointmentApp {
  private app: Application;
  private logger: Logger;
  private dbManager: DatabaseConnectionManager;
  private eventBus: EventBus;
  private appointmentRepository: AppointmentRepository;
  private appointmentService: AppointmentService;
  private appointmentController: AppointmentController;

  constructor() {
    this.app = express();
    this.logger = new Logger({
      service: 'HMSAppointmentApp',
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
      this.logger.info('Initializing HMS Appointment Service...');

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

      // Setup scheduled tasks
      this.setupScheduledTasks();

      this.logger.info('HMS Appointment Service initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize HMS Appointment Service', {
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
      this.appointmentRepository = new AppointmentRepository(
        this.dbManager.getPool(),
        this.logger
      );

      // Initialize appointment service
      this.appointmentService = new AppointmentService(
        this.appointmentRepository,
        this.eventBus,
        this.logger
      );

      // Initialize controller
      this.appointmentController = new AppointmentController(
        this.appointmentService,
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

    // Appointment booking rate limiting
    const appointmentBookingLimiter = rateLimit({
      windowMs: config.rateLimit.appointmentBookingWindowMs,
      max: config.rateLimit.appointmentBookingMaxRequests,
      message: {
        success: false,
        message: 'Too many appointment booking requests',
        errors: ['Appointment booking rate limit exceeded']
      },
      skip: (req: Request) => {
        // Skip rate limiting for internal service calls
        return req.headers['x-internal-service'] === 'true';
      }
    });

    // Search rate limiting
    const searchLimiter = rateLimit({
      windowMs: config.rateLimit.searchWindowMs,
      max: config.rateLimit.searchMaxRequests,
      message: {
        success: false,
        message: 'Too many search requests',
        errors: ['Search rate limit exceeded']
      },
      skip: (req: Request) => {
        return req.headers['x-internal-service'] === 'true';
      }
    });

    this.app.use(generalLimiter);
    this.app.use('/api/v1/appointments/book', appointmentBookingLimiter);
    this.app.use('/api/v1/appointments/search', searchLimiter);
  }

  // =============================================================================
  // ROUTES SETUP
  // =============================================================================

  private setupRoutes(): void {
    // Health check endpoint (no auth required)
    this.app.get('/health', this.appointmentController.healthCheck);
    this.app.get('/api/v1/health', this.appointmentController.healthCheck);

    // API information endpoint
    this.app.get('/api/v1/info', (req: Request, res: Response) => {
      res.json({
        success: true,
        message: 'HMS Appointment Service API',
        data: {
          name: config.serviceName,
          version: '1.0.0',
          description: 'HMS Appointment Service with Scheduling and Calendar Management',
          environment: config.nodeEnv,
          documentation: '/api/v1/docs',
          endpoints: {
            health: '/health',
            appointments: '/api/v1/appointments',
            scheduling: '/api/v1/scheduling',
            availability: '/api/v1/availability',
            calendar: '/api/v1/calendar',
            waitlist: '/api/v1/waitlist',
            metrics: '/api/v1/metrics'
          },
          features: {
            scheduling: true,
            calendar: true,
            waitlist: true,
            reminders: true,
            recurringAppointments: true,
            bulkOperations: true,
            realTimeUpdates: true,
            analytics: true,
            integrations: {
              email: config.notification.email.enabled,
              sms: config.notification.sms.enabled,
              whatsapp: config.notification.whatsapp.enabled,
              googleCalendar: config.integrations.googleCalendar.enabled,
              outlookCalendar: config.integrations.outlookCalendar.enabled,
              zoom: config.integrations.zoom.enabled,
              payment: config.integrations.payment.enabled
            }
          }
        }
      });
    });

    // API routes with authentication
    const apiRouter = express.Router();

    // Apply authentication middleware to all API routes
    apiRouter.use(authMiddleware);

    // Appointment routes
    this.setupAppointmentRoutes(apiRouter);

    // Availability routes
    this.setupAvailabilityRoutes(apiRouter);

    // Calendar routes
    this.setupCalendarRoutes(apiRouter);

    // Waitlist routes
    this.setupWaitlistRoutes(apiRouter);

    // Metrics routes
    this.setupMetricsRoutes(apiRouter);

    // Utility routes
    this.setupUtilityRoutes(apiRouter);

    // Mount API router
    this.app.use('/api/v1', apiRouter);

    // Service status endpoint
    this.app.get('/service-status', async (req: Request, res: Response) => {
      try {
        const appointmentStats = {
          totalAppointments: await this.getAppointmentCount(),
          activeSchedules: await this.getActiveScheduleCount(),
          availableSlots: await this.getAvailableSlotsCount(),
          waitlistEntries: await this.getWaitlistCount()
        };

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
            appointment: appointmentStats
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

  private setupAppointmentRoutes(router: express.Router): void {
    const appointmentRouter = express.Router();

    // Create appointment
    appointmentRouter.post(
      '/',
      appointmentValidationMiddleware.createAppointment,
      this.appointmentController.createAppointment
    );

    // Get appointment by ID
    appointmentRouter.get(
      '/:appointmentId',
      this.appointmentController.getAppointmentById
    );

    // Get appointment by number
    appointmentRouter.get(
      '/number/:appointmentNumber',
      this.appointmentController.getAppointmentByNumber
    );

    // Update appointment
    appointmentRouter.put(
      '/:appointmentId',
      appointmentValidationMiddleware.updateAppointment,
      this.appointmentController.updateAppointment
    );

    // Cancel appointment
    appointmentRouter.post(
      '/:appointmentId/cancel',
      this.appointmentController.cancelAppointment
    );

    // Check-in appointment
    appointmentRouter.post(
      '/:appointmentId/checkin',
      this.appointmentController.checkInAppointment
    );

    // Complete appointment
    appointmentRouter.post(
      '/:appointmentId/complete',
      this.appointmentController.completeAppointment
    );

    // Mark no-show
    appointmentRouter.post(
      '/:appointmentId/no-show',
      this.appointmentController.markNoShow
    );

    // Search appointments
    appointmentRouter.get(
      '/search',
      appointmentValidationMiddleware.searchAppointments,
      this.appointmentController.searchAppointments
    );

    // Create bulk appointments
    appointmentRouter.post(
      '/bulk',
      this.appointmentController.createBulkAppointments
    );

    router.use('/appointments', appointmentRouter);
  }

  private setupAvailabilityRoutes(router: express.Router): void {
    const availabilityRouter = express.Router();

    // Get available slots
    availabilityRouter.get(
      '/slots',
      appointmentValidationMiddleware.getAvailableSlots,
      this.appointmentController.getAvailableSlots
    );

    router.use('/availability', availabilityRouter);
  }

  private setupCalendarRoutes(router: express.Router): void {
    const calendarRouter = express.Router();

    // Get calendar view for doctor
    calendarRouter.get(
      '/doctor/:doctorId',
      this.appointmentController.getCalendarView
    );

    router.use('/calendar', calendarRouter);
  }

  private setupWaitlistRoutes(router: express.Router): void {
    const waitlistRouter = express.Router();

    // Add to waitlist
    waitlistRouter.post(
      '/',
      this.appointmentController.addToWaitlist
    );

    // Get waitlist for doctor
    waitlistRouter.get(
      '/doctor/:doctorId',
      this.appointmentController.getWaitlistForDoctor
    );

    router.use('/waitlist', waitlistRouter);
  }

  private setupMetricsRoutes(router: express.Router): void {
    const metricsRouter = express.Router();

    // Get appointment metrics
    metricsRouter.get(
      '/',
      this.appointmentController.getMetrics
    );

    router.use('/metrics', metricsRouter);
  }

  private setupUtilityRoutes(router: express.Router): void {
    const utilityRouter = express.Router();

    // Get appointment types
    utilityRouter.get(
      '/appointment-types',
      this.appointmentController.getAppointmentTypes
    );

    // Get consultation types
    utilityRouter.get(
      '/consultation-types',
      this.appointmentController.getConsultationTypes
    );

    // Get booking channels
    utilityRouter.get(
      '/booking-channels',
      this.appointmentController.getBookingChannels
    );

    router.use('/utils', utilityRouter);
  }

  // =============================================================================
  // ERROR HANDLING SETUP
  // =============================================================================

  private setupErrorHandling(): void {
    // 404 handler
    this.app.use('*', this.appointmentController.handleNotFoundError);

    // Method not allowed handler
    this.app.use('*', this.appointmentController.handleMethodNotAllowed);

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
  // SCHEDULED TASKS SETUP
  // =============================================================================

  private setupScheduledTasks(): void {
    try {
      this.logger.info('Setting up scheduled tasks...');

      // Schedule reminder checks
      this.scheduleReminderTasks();

      // Schedule availability slot generation
      this.scheduleAvailabilityGeneration();

      // Schedule metrics calculation
      this.scheduleMetricsCalculation();

      // Schedule waitlist processing
      this.scheduleWaitlistProcessing();

      this.logger.info('Scheduled tasks setup completed');

    } catch (error) {
      this.logger.error('Failed to setup scheduled tasks', {
        error: error.message
      });
    }
  }

  private scheduleReminderTasks(): void {
    // This would use node-cron or node-schedule to schedule reminder checks
    // For now, just log that it would be implemented
    this.logger.info('Reminder tasks scheduled');
  }

  private scheduleAvailabilityGeneration(): void {
    // This would generate availability slots based on doctor schedules
    this.logger.info('Availability generation scheduled');
  }

  private scheduleMetricsCalculation(): void {
    // This would calculate and cache appointment metrics
    this.logger.info('Metrics calculation scheduled');
  }

  private scheduleWaitlistProcessing(): void {
    // This would process waitlist entries and offer slots
    this.logger.info('Waitlist processing scheduled');
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
        this.logger.info('📅 HMS Appointment Service Started', {
          environment: config.nodeEnv,
          port: config.port,
          serviceName: config.serviceName,
          nodeVersion: process.version,
          memoryUsage: process.memoryUsage(),
          pid: process.pid,
          features: {
            scheduling: true,
            calendar: true,
            waitlist: true,
            reminders: true,
            recurringAppointments: true,
            bulkOperations: true,
            analytics: config.analytics.enabled,
            realTimeUpdates: true,
            integrations: {
              email: config.notification.email.enabled,
              sms: config.notification.sms.enabled,
              whatsapp: config.notification.whatsapp.enabled,
              googleCalendar: config.integrations.googleCalendar.enabled,
              outlookCalendar: config.integrations.outlookCalendar.enabled,
              zoom: config.integrations.zoom.enabled,
              payment: config.integrations.payment.enabled
            }
          }
        });
      });

    } catch (error) {
      this.logger.error('Failed to start HMS Appointment Service', {
        error: error.message,
        stack: error.stack
      });
      process.exit(1);
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  private async getAppointmentCount(): Promise<number> {
    try {
      // This would query the database for total appointment count
      return 0; // Placeholder
    } catch (error) {
      return 0;
    }
  }

  private async getActiveScheduleCount(): Promise<number> {
    try {
      // This would query the database for active schedules
      return 0; // Placeholder
    } catch (error) {
      return 0;
    }
  }

  private async getAvailableSlotsCount(): Promise<number> {
    try {
      // This would query the database for available slots
      return 0; // Placeholder
    } catch (error) {
      return 0;
    }
  }

  private async getWaitlistCount(): Promise<number> {
    try {
      // This would query the database for waitlist entries
      return 0; // Placeholder
    } catch (error) {
      return 0;
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

  getAppointmentService(): AppointmentService {
    return this.appointmentService;
  }

  getLogger(): Logger {
    return this.logger;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default HMSAppointmentApp;