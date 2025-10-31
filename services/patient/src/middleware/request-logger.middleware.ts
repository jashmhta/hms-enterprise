// HMS Patient Service Request Logger Middleware
// Request/response logging for debugging and monitoring

import { Request, Response, NextFunction } from 'express';
import { Logger } from '@hms/shared';

// =============================================================================
// REQUEST LOGGER MIDDLEWARE
// =============================================================================

export const requestLoggerMiddleware = (logger: Logger) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    const requestId = generateRequestId();

    // Add request ID to request object
    (req as any).requestId = requestId;

    // Extract important request information
    const requestInfo = {
      requestId,
      method: req.method,
      url: req.originalUrl || req.url,
      path: req.path,
      query: sanitizeQuery(req.query),
      userAgent: req.get('User-Agent'),
      ip: getClientIP(req),
      contentType: req.get('Content-Type'),
      contentLength: req.get('Content-Length'),
      authorization: req.get('Authorization') ? 'Bearer [REDACTED]' : undefined,
      facilityId: req.get('X-Facility-ID'),
      hipId: req.get('X-HIP-ID'),
      correlationId: req.get('X-Correlation-ID') || req.get('X-Request-ID'),
      timestamp: new Date().toISOString()
    };

    // Log incoming request
    logger.info('Incoming request', requestInfo);

    // Override res.json to log response
    const originalJson = res.json;
    res.json = function(data: any) {
      const responseTime = Date.now() - startTime;
      const responseInfo = {
        requestId,
        method: req.method,
        url: req.originalUrl || req.url,
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
        contentLength: res.get('Content-Length'),
        success: data?.success,
        message: data?.message,
        timestamp: new Date().toISOString()
      };

      // Determine log level based on status code
      if (res.statusCode >= 500) {
        logger.error('Request completed with server error', responseInfo);
      } else if (res.statusCode >= 400) {
        logger.warn('Request completed with client error', responseInfo);
      } else if (res.statusCode >= 300) {
        logger.info('Request completed with redirect', responseInfo);
      } else {
        logger.info('Request completed successfully', responseInfo);
      }

      // Add response time header
      res.set('X-Response-Time', `${responseTime}ms`);
      res.set('X-Request-ID', requestId);

      // Call original json method
      return originalJson.call(this, data);
    };

    // Override res.send to log response for non-JSON responses
    const originalSend = res.send;
    res.send = function(data: any) {
      const responseTime = Date.now() - startTime;
      const responseInfo = {
        requestId,
        method: req.method,
        url: req.originalUrl || req.url,
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
        contentLength: res.get('Content-Length'),
        timestamp: new Date().toISOString()
      };

      if (res.statusCode >= 500) {
        logger.error('Request completed with server error', responseInfo);
      } else if (res.statusCode >= 400) {
        logger.warn('Request completed with client error', responseInfo);
      } else {
        logger.info('Request completed successfully', responseInfo);
      }

      res.set('X-Response-Time', `${responseTime}ms`);
      res.set('X-Request-ID', requestId);

      return originalSend.call(this, data);
    };

    // Handle request errors
    res.on('error', (error: Error) => {
      const responseTime = Date.now() - startTime;
      logger.error('Request response error', {
        requestId,
        method: req.method,
        url: req.originalUrl || req.url,
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    });

    next();
  };
};

// =============================================================================
// ERROR LOGGER MIDDLEWARE
// =============================================================================

export const errorLoggerMiddleware = (logger: Logger) => {
  return (error: Error, req: Request, res: Response, next: NextFunction): void => {
    const requestId = (req as any).requestId || generateRequestId();

    const errorInfo = {
      requestId,
      method: req.method,
      url: req.originalUrl || req.url,
      path: req.path,
      query: sanitizeQuery(req.query),
      userAgent: req.get('User-Agent'),
      ip: getClientIP(req),
      facilityId: req.get('X-Facility-ID'),
      hipId: req.get('X-HIP-ID'),
      correlationId: req.get('X-Correlation-ID') || req.get('X-Request-ID'),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      body: sanitizeBody(req.body),
      headers: sanitizeHeaders(req.headers),
      timestamp: new Date().toISOString()
    };

    logger.error('Request error occurred', errorInfo);

    // Add request ID to response
    res.set('X-Request-ID', requestId);

    next(error);
  };
};

// =============================================================================
// HEALTH CHECK LOGGER MIDDLEWARE
// =============================================================================

export const healthCheckLoggerMiddleware = (logger: Logger) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip logging for health checks to reduce noise
    if (req.path === '/health' || req.path === '/api/v1/health') {
      return next();
    }

    // Use normal request logger for other requests
    return requestLoggerMiddleware(logger)(req, res, next);
  };
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getClientIP(req: Request): string {
  return (
    req.headers['x-forwarded-for'] as string ||
    req.headers['x-real-ip'] as string ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    (req.connection as any)?.socket?.remoteAddress ||
    'unknown'
  );
}

function sanitizeQuery(query: any): any {
  if (!query || typeof query !== 'object') {
    return {};
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(query)) {
    // Remove sensitive information from query params
    if (key.toLowerCase().includes('token') ||
        key.toLowerCase().includes('password') ||
        key.toLowerCase().includes('secret') ||
        key.toLowerCase().includes('key')) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  // Create a deep copy to avoid modifying original
  const sanitized = JSON.parse(JSON.stringify(body));

  // Remove sensitive fields
  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'key',
    'accessToken',
    'refreshToken',
    'clientSecret',
    'aadhaarNumber',
    'otp',
    'pin'
  ];

  function removeSensitiveFields(obj: any, path: string = ''): void {
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        if (typeof item === 'object' && item !== null) {
          removeSensitiveFields(item, `${path}[${index}]`);
        }
      });
    } else if (obj && typeof obj === 'object') {
      Object.keys(obj).forEach(key => {
        const currentPath = path ? `${path}.${key}` : key;

        if (sensitiveFields.some(field =>
            key.toLowerCase().includes(field.toLowerCase()) ||
            currentPath.toLowerCase().includes(field.toLowerCase())
        )) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          removeSensitiveFields(obj[key], currentPath);
        }
      });
    }
  }

  removeSensitiveFields(sanitized);
  return sanitized;
}

function sanitizeHeaders(headers: any): any {
  if (!headers || typeof headers !== 'object') {
    return {};
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(headers)) {
    // Remove sensitive headers
    if (key.toLowerCase().includes('authorization') ||
        key.toLowerCase().includes('token') ||
        key.toLowerCase().includes('secret') ||
        key.toLowerCase().includes('key')) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

// =============================================================================
// PERFORMANCE MONITORING MIDDLEWARE
// =============================================================================

export const performanceMonitoringMiddleware = (logger: Logger) => {
  const requestCounts = new Map<string, number>();
  const responseTimes = new Map<string, number[]>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    const routeKey = `${req.method}:${req.route?.path || req.path}`;

    // Increment request count
    requestCounts.set(routeKey, (requestCounts.get(routeKey) || 0) + 1);

    // Override res.json to track performance
    const originalJson = res.json;
    res.json = function(data: any) {
      const responseTime = Date.now() - startTime;

      // Track response times
      if (!responseTimes.has(routeKey)) {
        responseTimes.set(routeKey, []);
      }
      const times = responseTimes.get(routeKey)!;
      times.push(responseTime);

      // Keep only last 100 response times to avoid memory issues
      if (times.length > 100) {
        times.shift();
      }

      // Log performance metrics periodically
      const requestCount = requestCounts.get(routeKey) || 0;
      if (requestCount % 50 === 0) {
        const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
        const maxTime = Math.max(...times);
        const minTime = Math.min(...times);

        logger.info('Performance metrics', {
          route: routeKey,
          requestCount,
          avgResponseTime: Math.round(avgTime),
          maxResponseTime,
          minResponseTime,
          sampleSize: times.length
        });
      }

      return originalJson.call(this, data);
    };

    next();
  };
};

// =============================================================================
// REQUEST SIZE LIMITING MIDDLEWARE
// =============================================================================

export const requestSizeMonitoringMiddleware = (logger: Logger, maxBodySize: number = 10 * 1024 * 1024) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.get('Content-Length') || '0');

    if (contentLength > maxBodySize) {
      logger.warn('Request size exceeds limit', {
        method: req.method,
        url: req.originalUrl || req.url,
        contentLength,
        maxSize: maxBodySize,
        ip: getClientIP(req),
        userAgent: req.get('User-Agent')
      });

      res.status(413).json({
        success: false,
        message: 'Request entity too large',
        errors: [`Request size (${contentLength} bytes) exceeds maximum allowed size (${maxBodySize} bytes)`]
      });
      return;
    }

    // Log large requests
    if (contentLength > maxBodySize * 0.5) { // Log requests larger than 50% of max size
      logger.info('Large request detected', {
        method: req.method,
        url: req.originalUrl || req.url,
        contentLength,
        threshold: maxBodySize * 0.5,
        ip: getClientIP(req)
      });
    }

    next();
  };
};

// =============================================================================
// EXPORTS
// =============================================================================

export {
  requestLoggerMiddleware as default,
  errorLoggerMiddleware,
  healthCheckLoggerMiddleware,
  performanceMonitoringMiddleware,
  requestSizeMonitoringMiddleware
};