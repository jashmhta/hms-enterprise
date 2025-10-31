/**
 * Clinical Service Express Application
 * HMS Enterprise
 * 
 * Main application setup for the Clinical microservice handling
 * clinical operations, medical records, and patient care workflows.
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { Pool } from 'pg';
import Redis from 'redis';
import { logger } from '../../shared/utils/logger';
import { EventBus } from '../../shared/event-bus/types';
import { DatabaseConnection } from '../../shared/utils/database';
import ClinicalService from './services/clinical.service';
import ClinicalController from './controllers/clinical.controller';
import ClinicalRepository from './repositories/clinical.repository';
import config from './config';

class ClinicalApp {
  public app: Application;
  private db: Pool;
  private redis: Redis.ClientType;
  private eventBus: EventBus;
  private clinicalService: ClinicalService;
  private clinicalController: ClinicalController;

  constructor() {
    this.app = express();
    this.initializeDatabase();
    this.initializeRedis();
    this.initializeEventBus();
    this.initializeServices();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeDatabase(): void {
    try {
      const dbConnection = new DatabaseConnection(config.database);
      this.db = dbConnection.getPool();
      logger.info('Clinical database initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize clinical database', { error: error.message });
      process.exit(1);
    }
  }

  private initializeRedis(): void {
    try {
      this.redis = Redis.createClient({
        socket: {
          host: config.redis.host,
          port: config.redis.port
        },
        password: config.redis.password,
        database: config.redis.db
      });

      this.redis.on('error', (error) => {
        logger.error('Clinical Redis error', { error: error.message });
      });

      this.redis.on('connect', () => {
        logger.info('Clinical Redis connected successfully');
      });

      this.redis.connect();
    } catch (error) {
      logger.error('Failed to initialize clinical Redis', { error: error.message });
      process.exit(1);
    }
  }

  private initializeEventBus(): void {
    try {
      // Initialize event bus with Redis backend
      this.eventBus = {
        emit: async (event: string, data: any) => {
          try {
            await this.redis.publish(`${config.eventBus.namespace}:${event}`, JSON.stringify(data));
            logger.debug('Event emitted', { event, data });
          } catch (error) {
            logger.error('Failed to emit event', { error: error.message, event });
          }
        },
        on: (event: string, handler: (data: any) => void) => {
          this.redis.subscribe(`${config.eventBus.namespace}:${event}`, (message) => {
            try {
              const data = JSON.parse(message);
              handler(data);
            } catch (error) {
              logger.error('Failed to parse event message', { error: error.message, message });
            }
          });
        }
      };
      logger.info('Clinical event bus initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize clinical event bus', { error: error.message });
      process.exit(1);
    }
  }

  private initializeServices(): void {
    try {
      const clinicalRepository = new ClinicalRepository(this.db);
      this.clinicalService = new ClinicalService(clinicalRepository, this.eventBus);
      this.clinicalController = new ClinicalController(this.clinicalService);
      logger.info('Clinical services initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize clinical services', { error: error.message });
      process.exit(1);
    }
  }

  private initializeMiddleware(): void {
    // Security middleware
    if (config.security.helmet.contentSecurityPolicy) {
      this.app.use(helmet());
    }

    // CORS middleware
    this.app.use(cors({
      origin: config.security.cors.origin,
      credentials: config.security.cors.credentials,
      methods: config.security.cors.methods,
      allowedHeaders: config.security.cors.allowedHeaders
    }));

    // Compression middleware
    if (config.performance.compression) {
      this.app.use(compression({
        level: config.performance.compressionLevel
      }));
    }

    // Rate limiting middleware
    const limiter = rateLimit({
      windowMs: config.security.rateLimiting.windowMs,
      max: config.security.rateLimiting.maxRequests,
      message: {
        success: false,
        message: config.security.rateLimiting.message,
        error: 'RATE_LIMIT_EXCEEDED',
        timestamp: new Date().toISOString()
      },
      standardHeaders: true,
      legacyHeaders: false
    });
    this.app.use(limiter);

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      logger.info('Clinical service request', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });
      next();
    });

    // Health check endpoint
    if (config.performance.healthCheck.enabled) {
      this.app.get(config.performance.healthCheck.path, (req: Request, res: Response) => {
        res.status(200).json({
          status: 'healthy',
          service: 'clinical',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          version: '1.0.0'
        });
      });
    }

    // Metrics endpoint
    if (config.performance.monitoring.enabled) {
      this.app.get(config.performance.monitoring.metricsPath, (req: Request, res: Response) => {
        res.set('Content-Type', 'text/plain');
        res.send('# Clinical Service Metrics\n# TODO: Implement metrics collection');
      });
    }
  }

  private initializeRoutes(): void {
    // Clinical Visit Routes
    this.app.post('/api/clinical/visits', this.clinicalController.createVisit);
    this.app.get('/api/clinical/visits/:visitId', this.clinicalController.getVisitById);
    this.app.put('/api/clinical/visits/:visitId', this.clinicalController.updateVisit);
    this.app.get('/api/clinical/visits', this.clinicalController.searchVisits);
    this.app.post('/api/clinical/visits/:visitId/checkin', this.clinicalController.checkInPatient);
    this.app.post('/api/clinical/visits/:visitId/start', this.clinicalController.startVisit);
    this.app.post('/api/clinical/visits/:visitId/complete', this.clinicalController.completeVisit);
    this.app.post('/api/clinical/visits/:visitId/discharge', this.clinicalController.dischargePatient);

    // Prescription Routes
    this.app.post('/api/clinical/prescriptions', this.clinicalController.createPrescription);
    this.app.get('/api/clinical/prescriptions/:prescriptionId', this.clinicalController.getPrescriptionById);
    this.app.put('/api/clinical/prescriptions/:prescriptionId/status', this.clinicalController.updatePrescriptionStatus);
    this.app.get('/api/clinical/prescriptions', this.clinicalController.searchPrescriptions);

    // Laboratory Order Routes
    this.app.post('/api/clinical/lab-orders', this.clinicalController.createLabOrder);
    this.app.get('/api/clinical/lab-orders/:orderId', this.clinicalController.getLabOrderById);
    this.app.put('/api/clinical/lab-orders/:orderId/status', this.clinicalController.updateLabOrderStatus);
    this.app.get('/api/clinical/lab-orders', this.clinicalController.searchLabOrders);

    // Imaging Order Routes
    this.app.post('/api/clinical/imaging-orders', this.clinicalController.createImagingOrder);
    this.app.get('/api/clinical/imaging-orders/:orderId', this.clinicalController.getImagingOrderById);
    this.app.put('/api/clinical/imaging-orders/:orderId/status', this.clinicalController.updateImagingOrderStatus);
    this.app.get('/api/clinical/imaging-orders', this.clinicalController.searchImagingOrders);

    // Medical Record Routes
    this.app.post('/api/clinical/medical-records', this.clinicalController.createMedicalRecord);
    this.app.get('/api/clinical/medical-records/:recordId', this.clinicalController.getMedicalRecordById);
    this.app.get('/api/clinical/medical-records', this.clinicalController.searchMedicalRecords);

    // Clinical Decision Support Routes
    this.app.post('/api/clinical/decision-support/drug-interactions', this.clinicalController.getDrugInteractions);
    this.app.post('/api/clinical/decision-support/allergy-check', this.clinicalController.getAllergyCheck);
    this.app.get('/api/clinical/decision-support/guidelines', this.clinicalController.getClinicalGuidelines);

    // Dashboard Routes
    this.app.get('/api/clinical/dashboard/provider', this.clinicalController.getProviderDashboard);
    this.app.get('/api/clinical/dashboard/department/:departmentId', this.clinicalController.getDepartmentDashboard);

    // Quality and Compliance Routes
    this.app.get('/api/clinical/quality/metrics', this.clinicalController.getQualityMetrics);
    this.app.get('/api/clinical/compliance/reports', this.clinicalController.getComplianceReport);

    // Clinical Analytics Routes
    this.app.get('/api/clinical/analytics', this.clinicalController.getClinicalAnalytics);
    this.app.get('/api/clinical/patients/:patientId/clinical-history', this.clinicalController.getPatientClinicalHistory);

    // Export and Reporting Routes
    this.app.post('/api/clinical/patients/:patientId/export', this.clinicalController.exportPatientData);
    this.app.post('/api/clinical/reports', this.clinicalController.generateClinicalReport);

    // API Documentation
    this.app.get('/api/clinical', (req: Request, res: Response) => {
      res.json({
        name: 'Clinical Service API',
        version: '1.0.0',
        description: 'HMS Enterprise Clinical Service - Clinical workflow management, medical records, and patient care',
        endpoints: {
          visits: {
            'POST /api/clinical/visits': 'Create new clinical visit',
            'GET /api/clinical/visits/:visitId': 'Get visit by ID',
            'PUT /api/clinical/visits/:visitId': 'Update visit',
            'GET /api/clinical/visits': 'Search visits',
            'POST /api/clinical/visits/:visitId/checkin': 'Check in patient',
            'POST /api/clinical/visits/:visitId/start': 'Start visit',
            'POST /api/clinical/visits/:visitId/complete': 'Complete visit',
            'POST /api/clinical/visits/:visitId/discharge': 'Discharge patient'
          },
          prescriptions: {
            'POST /api/clinical/prescriptions': 'Create prescription',
            'GET /api/clinical/prescriptions/:prescriptionId': 'Get prescription by ID',
            'PUT /api/clinical/prescriptions/:prescriptionId/status': 'Update prescription status',
            'GET /api/clinical/prescriptions': 'Search prescriptions'
          },
          laboratory: {
            'POST /api/clinical/lab-orders': 'Create lab order',
            'GET /api/clinical/lab-orders/:orderId': 'Get lab order by ID',
            'PUT /api/clinical/lab-orders/:orderId/status': 'Update lab order status',
            'GET /api/clinical/lab-orders': 'Search lab orders'
          },
          imaging: {
            'POST /api/clinical/imaging-orders': 'Create imaging order',
            'GET /api/clinical/imaging-orders/:orderId': 'Get imaging order by ID',
            'PUT /api/clinical/imaging-orders/:orderId/status': 'Update imaging order status',
            'GET /api/clinical/imaging-orders': 'Search imaging orders'
          },
          medicalRecords: {
            'POST /api/clinical/medical-records': 'Create medical record',
            'GET /api/clinical/medical-records/:recordId': 'Get medical record by ID',
            'GET /api/clinical/medical-records': 'Search medical records'
          },
          decisionSupport: {
            'POST /api/clinical/decision-support/drug-interactions': 'Check drug interactions',
            'POST /api/clinical/decision-support/allergy-check': 'Check medication allergies',
            'GET /api/clinical/decision-support/guidelines': 'Get clinical guidelines'
          },
          dashboards: {
            'GET /api/clinical/dashboard/provider': 'Get provider dashboard',
            'GET /api/clinical/dashboard/department/:departmentId': 'Get department dashboard'
          },
          quality: {
            'GET /api/clinical/quality/metrics': 'Get quality metrics',
            'GET /api/clinical/compliance/reports': 'Get compliance reports'
          },
          analytics: {
            'GET /api/clinical/analytics': 'Get clinical analytics',
            'GET /api/clinical/patients/:patientId/clinical-history': 'Get patient clinical history'
          },
          exports: {
            'POST /api/clinical/patients/:patientId/export': 'Export patient data',
            'POST /api/clinical/reports': 'Generate clinical report'
          }
        },
        health: '/health',
        metrics: '/metrics'
      });
    });
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.path} not found`,
        error: 'NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    });

    // Global error handler
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      logger.error('Clinical service error', {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(500).json({
        success: false,
        message: config.nodeEnv === 'production' ? 'Internal server error' : error.message,
        error: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      });
    });
  }

  public getApp(): Application {
    return this.app;
  }

  public async close(): Promise<void> {
    try {
      // Close database connections
      await this.db.end();
      
      // Close Redis connection
      if (this.redis) {
        await this.redis.quit();
      }

      logger.info('Clinical service closed successfully');
    } catch (error) {
      logger.error('Error closing clinical service', { error: error.message });
    }
  }
}

export default ClinicalApp;