import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config, validateConfig } from './config';
import { logger } from '@hms-helpers/shared';
import { EventBus } from '@hms-helpers/shared';
import { BillingRepository } from './repositories/billing.repository';
import { BillingService } from './services/billing.service';
import billingRoutes from './routes/billing.routes';
import { errorHandler, notFoundHandler } from '@hms-helpers/shared';

class BillingApp {
  public app: express.Application;
  private eventBus: EventBus;
  private billingService: BillingService;

  constructor() {
    this.app = express();
    this.eventBus = new EventBus(config.eventBus);
    this.initializeServices();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeServices(): void {
    try {
      validateConfig();
      
      const billingRepository = new BillingRepository();
      this.billingService = new BillingService(billingRepository, this.eventBus);
      
      logger.info('Billing services initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize billing services', { error: error.message });
      throw error;
    }
  }

  private initializeMiddleware(): void {
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

    // CORS configuration
    this.app.use(cors({
      origin: config.cors.origin,
      credentials: config.cors.credentials,
      methods: config.cors.methods,
      allowedHeaders: config.cors.allowedHeaders,
    }));

    // Compression middleware
    this.app.use(compression());

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.max,
      message: {
        success: false,
        message: config.rateLimit.message,
        errors: []
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use(limiter);

    // Request logging
    this.app.use((req, res, next) => {
      logger.info('Billing service request', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });
      next();
    });

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        success: true,
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          service: 'billing-service',
          version: process.env.SERVICE_VERSION || '1.0.0',
          uptime: process.uptime()
        }
      });
    });
  }

  private initializeRoutes(): void {
    // API routes
    this.app.use('/api/v1', billingRoutes);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.status(200).json({
        success: true,
        message: 'HMS Billing Service is running',
        version: process.env.SERVICE_VERSION || '1.0.0',
        documentation: '/api/v1/docs'
      });
    });

    // API info endpoint
    this.app.get('/api/v1', (req, res) => {
      res.status(200).json({
        success: true,
        message: 'HMS Billing Service API v1',
        version: process.env.SERVICE_VERSION || '1.0.0',
        endpoints: {
          invoices: '/api/v1/invoices',
          payments: '/api/v1/payments',
          billableItems: '/api/v1/billable-items',
          analytics: '/api/v1/analytics',
          dashboard: '/api/v1/dashboard',
          reports: '/api/v1/reports',
          health: '/api/v1/health'
        }
      });
    });
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      const server = this.app.listen(config.port, () => {
        logger.info(`Billing service started successfully`, {
          port: config.port,
          nodeEnv: config.nodeEnv,
          serviceName: 'billing-service'
        });
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.gracefulShutdown(server));
      process.on('SIGINT', () => this.gracefulShutdown(server));

      // Handle uncaught exceptions
      process.on('uncaughtException', (error) => {
        logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
        process.exit(1);
      });

      process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled Rejection', { reason, promise });
        process.exit(1);
      });

    } catch (error) {
      logger.error('Failed to start billing service', { error: error.message });
      throw error;
    }
  }

  private async gracefulShutdown(server: any): Promise<void> {
    logger.info('Gracefully shutting down billing service...');

    server.close(async () => {
      logger.info('HTTP server closed');

      try {
        // Close database connections
        // await this.billingRepository.close();

        // Disconnect from event bus
        // await this.eventBus.disconnect();

        logger.info('Billing service shutdown complete');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', { error: error.message });
        process.exit(1);
      }
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error('Forcing shutdown after timeout');
      process.exit(1);
    }, 30000);
  }

  public getApp(): express.Application {
    return this.app;
  }

  public getEventBus(): EventBus {
    return this.eventBus;
  }

  public getBillingService(): BillingService {
    return this.billingService;
  }
}

export default BillingApp;