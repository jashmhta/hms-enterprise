// HMS User Service Routes Index
// Central route definitions and API setup

import { Router, Application } from 'express';
import { AuthController } from '@/controllers/auth.controller';
import { UserController } from '@/controllers/user.controller';
import { ValidationMiddleware } from '@/middleware/validation.middleware';
import { AuthenticationMiddleware } from '@/middleware/auth.middleware';
import { ErrorMiddleware } from '@/middleware/error.middleware';
import { Logger } from '@hms/shared/logger';
import { createAuthRoutes } from './auth.routes';
import { createUserRoutes } from './user.routes';

// =============================================================================
// ROUTE SETUP
// =============================================================================

export const setupRoutes = (
  app: Application,
  authController: AuthController,
  userController: UserController,
  validationMiddleware: ValidationMiddleware,
  authMiddleware: AuthenticationMiddleware,
  errorMiddleware: ErrorMiddleware,
  logger: Logger
): void => {
  // API Router
  const apiRouter = Router();

  // API versioning
  const v1Router = Router();
  apiRouter.use('/v1', v1Router);

  // Health check endpoints (no authentication required)
  v1Router.get('/health', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'User Service is healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime()
    });
  });

  // Detailed health check with dependencies
  v1Router.get('/health/detailed', async (req, res) => {
    try {
      // TODO: Check database connectivity
      const dbHealthy = true; // await checkDatabaseHealth();

      // TODO: Check Redis connectivity
      const redisHealthy = true; // await checkRedisHealth();

      const healthData = {
        status: dbHealthy && redisHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        dependencies: {
          database: { status: dbHealthy ? 'healthy' : 'unhealthy' },
          redis: { status: redisHealthy ? 'healthy' : 'unhealthy' }
        }
      };

      const statusCode = healthData.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json({
        success: healthData.status === 'healthy',
        data: healthData
      });

    } catch (error) {
      logger.error('Detailed health check failed', { error: error.message });
      res.status(503).json({
        success: false,
        message: 'Health check failed',
        timestamp: new Date().toISOString()
      });
    }
  });

  // API Documentation (if enabled)
  if (config.api.enableSwagger) {
    // TODO: Setup Swagger documentation
    // const swaggerUi = require('swagger-ui-express');
    // const swaggerDocument = require('../../swagger.json');

    v1Router.get('/docs', (req, res) => {
      res.json({
        success: true,
        message: 'API Documentation',
        data: {
          title: config.api.swaggerTitle,
          description: config.api.swaggerDescription,
          version: config.api.swaggerVersion,
          endpoints: {
            auth: {
              'POST /v1/auth/login': 'User login',
              'POST /v1/auth/logout': 'User logout',
              'POST /v1/auth/refresh': 'Refresh access token',
              'POST /v1/auth/change-password': 'Change password',
              'POST /v1/auth/forgot-password': 'Forgot password',
              'POST /v1/auth/reset-password': 'Reset password',
              'GET /v1/auth/me': 'Get current user info',
              'GET /v1/auth/sessions': 'Get user sessions',
              'DELETE /v1/auth/sessions/:sessionId': 'Revoke session',
              'DELETE /v1/auth/sessions': 'Revoke all sessions'
            },
            users: {
              'GET /v1/users': 'Get users list',
              'GET /v1/users/statistics': 'Get user statistics',
              'GET /v1/users/:id': 'Get user by ID',
              'POST /v1/users': 'Create user',
              'PUT /v1/users/:id': 'Update user',
              'DELETE /v1/users/:id': 'Delete user',
              'POST /v1/users/bulk-update': 'Bulk update users',
              'POST /v1/users/bulk-delete': 'Bulk delete users',
              'PUT /v1/users/profile': 'Update profile',
              'POST /v1/users/profile/image': 'Upload profile image',
              'POST /v1/users/:id/activate': 'Activate user',
              'POST /v1/users/:id/deactivate': 'Deactivate user'
            }
          }
        }
      });
    });
  }

  // API Info endpoint
  v1Router.get('/info', (req, res) => {
    res.json({
      success: true,
      data: {
        name: 'HMS User Service',
        description: 'User authentication and management service',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        apis: {
          authentication: `${req.protocol}://${req.get('host')}${req.baseUrl}/v1/auth`,
          users: `${req.protocol}://${req.get('host')}${req.baseUrl}/v1/users`,
          docs: config.api.enableSwagger ? `${req.protocol}://${req.get('host')}${req.baseUrl}/v1/docs` : null
        },
        health: {
          basic: `${req.protocol}://${req.get('host')}${req.baseUrl}/v1/health`,
          detailed: `${req.protocol}://${req.get('host')}${req.baseUrl}/v1/health/detailed`
        }
      }
    });
  });

  // Authentication routes
  v1Router.use('/auth', createAuthRoutes(
    authController,
    validationMiddleware,
    authMiddleware,
    errorMiddleware
  ));

  // User management routes
  v1Router.use('/users', createUserRoutes(
    userController,
    validationMiddleware,
    authMiddleware,
    errorMiddleware
  ));

  // Mount API router
  app.use('/api', apiRouter);

  // Root redirect to API info
  app.get('/', (req, res) => {
    res.redirect('/api/v1/info');
  });

  // Log route setup
  logger.info('Routes configured successfully', {
    authRoutes: Object.keys(createAuthRoutes(
      authController,
      validationMiddleware,
      authMiddleware,
      errorMiddleware
    ).stack || {}),
    userRoutes: Object.keys(createUserRoutes(
      userController,
      validationMiddleware,
      authMiddleware,
      errorMiddleware
    ).stack || {}),
    apiPrefix: '/api/v1',
    swaggerEnabled: config.api.enableSwagger
  });
};

// =============================================================================
// ROUTE METRICS AND MONITORING
// =============================================================================

export const getRouteMetrics = (): {
  totalRoutes: number;
  authRoutes: number;
  userRoutes: number;
  healthRoutes: number;
  docsRoutes: number;
} => {
  // This would be dynamically calculated based on actual mounted routes
  return {
    totalRoutes: 25,
    authRoutes: 10,
    userRoutes: 12,
    healthRoutes: 2,
    docsRoutes: 1
  };
};

export default setupRoutes;