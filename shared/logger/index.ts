// HMS Enterprise Logger
// Structured logging with correlation IDs and Winston

import winston from 'winston';
import { Request, Response, NextFunction } from 'express';
import { v7 as uuidv7 } from 'uuid';

// =============================================================================
// LOG LEVELS AND FORMATS
// =============================================================================

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  VERBOSE = 'verbose',
  DEBUG = 'debug',
  SILLY = 'silly'
}

export interface LogContext {
  correlationId?: string;
  traceId?: string;
  userId?: string;
  service?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: number;
  userAgent?: string;
  ip?: string;
  requestId?: string;
  sessionId?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  meta?: Record<string, unknown>;
}

// =============================================================================
// CUSTOM FORMATTERS
// =============================================================================

class StructuredFormatter {
  public static json = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf((info) => {
      const logEntry: LogEntry = {
        timestamp: info.timestamp as string,
        level: info.level as LogLevel,
        message: info.message,
        context: info.context as LogContext,
        error: info.error,
        meta: info.meta
      };

      // Add service name if available
      if (process.env.SERVICE_NAME) {
        logEntry.service = process.env.SERVICE_NAME;
      }

      return JSON.stringify(logEntry);
    })
  );

  public static console = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf((info) => {
      const contextStr = info.context ? ` [${JSON.stringify(info.context)}]` : '';
      const errorStr = info.error ? `\nError: ${info.error.stack || info.error.message}` : '';
      return `${info.timestamp} ${info.level}: ${info.message}${contextStr}${errorStr}`;
    })
  );

  public static simple = winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf((info) => {
      const contextStr = info.context ? ` [${JSON.stringify(info.context)}]` : '';
      return `${info.timestamp} ${info.level}: ${info.message}${contextStr}`;
    })
  );
}

// =============================================================================
// LOGGER CLASS
// =============================================================================

export class Logger {
  private winston: winston.Logger;
  private readonly defaultContext: LogContext;

  constructor(config: LoggerConfig) {
    this.defaultContext = {
      service: config.serviceName || process.env.SERVICE_NAME || 'hms-service'
    };

    // Create Winston logger
    this.winston = winston.createLogger({
      level: config.level || (process.env.LOG_LEVEL || LogLevel.INFO),
      defaultMeta: this.defaultContext,
      transports: this.createTransports(config),
      exitOnError: false,
      handleExceptions: true,
      handleRejections: true
    });

    // Add process error handling
    this.setupProcessErrorHandling();
  }

  private createTransports(config: LoggerConfig): winston.transport[] {
    const transports: winston.transport[] = [];

    // Console transport
    if (config.console !== false) {
      transports.push(new winston.transports.Console({
        format: config.environment === 'production'
          ? StructuredFormatter.json
          : StructuredFormatter.console,
        level: config.console?.level || (process.env.CONSOLE_LOG_LEVEL || config.level || LogLevel.INFO)
      }));
    }

    // File transports for production
    if (config.environment === 'production') {
      // Error log file
      transports.push(new winston.transports.File({
        filename: config.errorLogPath || 'logs/error.log',
        level: LogLevel.ERROR,
        format: StructuredFormatter.json,
        maxsize: config.maxFileSize || 10 * 1024 * 1024, // 10MB
        maxFiles: config.maxFiles || 5,
        tailable: true
      }));

      // Combined log file
      transports.push(new winston.transports.File({
        filename: config.combinedLogPath || 'logs/combined.log',
        format: StructuredFormatter.json,
        maxsize: config.maxFileSize || 10 * 1024 * 1024, // 10MB
        maxFiles: config.maxFiles || 10,
        tailable: true
      }));

      // Audit log file (for sensitive operations)
      if (config.auditLogPath) {
        transports.push(new winston.transports.File({
          filename: config.auditLogPath,
          level: 'audit',
          format: StructuredFormatter.json,
          maxsize: config.maxFileSize || 10 * 1024 * 1024, // 10MB
          maxFiles: config.maxFiles || 20,
          tailable: true
        }));
      }
    }

    // External transports (if configured)
    if (config.transports) {
      transports.push(...config.transports);
    }

    return transports;
  }

  private setupProcessErrorHandling(): void {
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.error('Uncaught Exception', { error: error.stack || error.message, context: { type: 'uncaught_exception' } });
      process.exit(1);
    });

    // Handle unhandled rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.error('Unhandled Rejection', {
        error: reason instanceof Error ? reason.stack || reason.message : String(reason),
        context: { type: 'unhandled_rejection', promise: promise.toString() }
      });
    });
  }

  // =============================================================================
  // LOGGING METHODS
  // =============================================================================

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    const logInfo: winston.Loginfo = {
      level,
      message,
      ...this.defaultContext,
      ...context,
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          ...(error as any).code
        }
      })
    };

    this.winston.log(logInfo);
  }

  error(message: string, context?: LogContext | { error: Error; [key: string]: unknown }): void {
    if (context && 'error' in context && context.error instanceof Error) {
      const { error, ...restContext } = context;
      this.log(LogLevel.ERROR, message, restContext, error);
    } else {
      this.log(LogLevel.ERROR, message, context as LogContext);
    }
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  verbose(message: string, context?: LogContext): void {
    this.log(LogLevel.VERBOSE, message, context);
  }

  // =============================================================================
  // SPECIALIZED LOGGING METHODS
  // =============================================================================

  http(message: string, context?: LogContext): void {
    this.log(LogLevel.HTTP, message, context);
  }

  audit(message: string, context?: LogContext): void {
    // Audit logs for security and compliance
    this.log('audit' as LogLevel, message, {
      ...context,
      audit: true,
      timestamp: new Date().toISOString()
    });
  }

  performance(operation: string, duration: number, context?: LogContext): void {
    this.info(`Performance: ${operation}`, {
      ...context,
      operation,
      duration,
      performance: true
    });
  }

  security(event: string, context?: LogContext): void {
    this.warn(`Security Event: ${event}`, {
      ...context,
      security: true,
      timestamp: new Date().toISOString()
    });
  }

  business(event: string, context?: LogContext): void {
    this.info(`Business Event: ${event}`, {
      ...context,
      business: true,
      timestamp: new Date().toISOString()
    });
  }

  // =============================================================================
  // CORRELATION ID SUPPORT
  // =============================================================================

  withContext(additionalContext: LogContext): Logger {
    return new ContextualLogger(this, { ...this.defaultContext, ...additionalContext });
  }

  withCorrelationId(correlationId: string): Logger {
    return new ContextualLogger(this, { ...this.defaultContext, correlationId });
  }

  withTraceId(traceId: string): Logger {
    return new ContextualLogger(this, { ...this.defaultContext, traceId });
  }

  withUser(userId: string): Logger {
    return new ContextualLogger(this, { ...this.defaultContext, userId });
  }

  // =============================================================================
  // REQUEST/RESPONSE LOGGING
  // =============================================================================

  logRequest(req: Request, additionalContext?: LogContext): void {
    const context: LogContext = {
      method: req.method,
      url: req.originalUrl || req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      requestId: req.headers['x-request-id'] as string,
      correlationId: req.headers['x-correlation-id'] as string,
      traceId: req.headers['x-trace-id'] as string,
      ...additionalContext
    };

    this.http(`Incoming Request: ${req.method} ${req.originalUrl || req.url}`, context);
  }

  logResponse(req: Request, res: Response, startTime: number, additionalContext?: LogContext): void {
    const duration = Date.now() - startTime;
    const context: LogContext = {
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      duration,
      requestId: req.headers['x-request-id'] as string,
      correlationId: req.headers['x-correlation-id'] as string,
      traceId: req.headers['x-trace-id'] as string,
      ...additionalContext
    };

    const level = res.statusCode >= 400 ? LogLevel.WARN : LogLevel.HTTP;
    this.log(level, `Response: ${req.method} ${req.originalUrl || req.url} ${res.statusCode}`, context);
  }

  logError(req: Request, error: Error, additionalContext?: LogContext): void {
    const context: LogContext = {
      method: req.method,
      url: req.originalUrl || req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      requestId: req.headers['x-request-id'] as string,
      correlationId: req.headers['x-correlation-id'] as string,
      traceId: req.headers['x-trace-id'] as string,
      ...additionalContext
    };

    this.error(`Request Error: ${req.method} ${req.originalUrl || req.url}`, {
      ...context,
      error: error.stack || error.message
    });
  }

  // =============================================================================
  // HEALTH AND METRICS
  // =============================================================================

  getWinstonLogger(): winston.Logger {
    return this.winston;
  }

  getLevel(): string {
    return this.winston.level;
  }

  setLevel(level: LogLevel): void {
    this.winston.level = level;
    this.winston.transports.forEach(transport => {
      transport.level = level;
    });
  }

  isLevelEnabled(level: LogLevel): boolean {
    return this.winston.isLevelEnabled(level);
  }

  addTransport(transport: winston.transport): void {
    this.winston.add(transport);
  }

  removeTransport(transport: winston.transport): void {
    this.winston.remove(transport);
  }

  // =============================================================================
  // CHILD LOGGER WITH CONTEXT
  // =============================================================================

  child(additionalContext: LogContext): Logger {
    return new ContextualLogger(this, { ...this.defaultContext, ...additionalContext });
  }
}

// =============================================================================
// CONTEXTUAL LOGGER
// =============================================================================

class ContextualLogger extends Logger {
  constructor(parent: Logger, private readonly context: LogContext) {
    super({
      serviceName: context.service || process.env.SERVICE_NAME,
      level: parent.getLevel() as LogLevel,
      environment: process.env.NODE_ENV === 'production' ? 'production' : 'development'
    });
  }

  private log(level: LogLevel, message: string, additionalContext?: LogContext, error?: Error): void {
    const mergedContext = { ...this.context, ...additionalContext };
    super.log(level, message, mergedContext, error);
  }

  error(message: string, context?: LogContext | { error: Error; [key: string]: unknown }): void {
    if (context && 'error' in context && context.error instanceof Error) {
      const { error, ...restContext } = context;
      this.log(LogLevel.ERROR, message, { ...this.context, ...restContext }, error);
    } else {
      this.log(LogLevel.ERROR, message, { ...this.context, ...(context as LogContext) });
    }
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, { ...this.context, ...context });
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, { ...this.context, ...context });
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, { ...this.context, ...context });
  }
}

// =============================================================================
// EXPRESS MIDDLEWARE
// =============================================================================

export interface LoggerMiddlewareOptions {
  skip?: (req: Request, res: Response) => boolean;
  level?: LogLevel;
  requestHeaders?: string[];
  responseHeaders?: string[];
  bodyBlacklist?: string[];
  sanitizeBody?: (body: any) => any;
}

export function createLoggerMiddleware(logger: Logger, options: LoggerMiddlewareOptions = {}) {
  const {
    skip,
    level = LogLevel.HTTP,
    requestHeaders = ['content-type', 'user-agent', 'x-forwarded-for'],
    responseHeaders = ['content-length'],
    bodyBlacklist = ['password', 'token', 'secret', 'key', 'authorization'],
    sanitizeBody
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip if condition provided
    if (skip && skip(req, res)) {
      return next();
    }

    const startTime = Date.now();

    // Log request
    const requestContext: LogContext = {
      method: req.method,
      url: req.originalUrl || req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      requestId: req.headers['x-request-id'] as string,
      correlationId: req.headers['x-correlation-id'] as string,
      traceId: req.headers['x-trace-id'] as string,
      headers: {}
    };

    // Add selected headers
    requestHeaders.forEach(header => {
      const value = req.get(header);
      if (value) {
        (requestContext.headers as any)[header] = value;
      }
    });

    // Add sanitized body
    if (req.body && Object.keys(req.body).length > 0) {
      let sanitizedBody = req.body;

      if (sanitizeBody) {
        sanitizedBody = sanitizeBody(req.body);
      } else {
        // Default blacklisting
        sanitizedBody = { ...req.body };
        bodyBlacklist.forEach(field => {
          if (field in sanitizedBody) {
            sanitizedBody[field] = '[REDACTED]';
          }
        });
      }

      requestContext.body = sanitizedBody;
    }

    logger.http(`Incoming Request: ${req.method} ${req.originalUrl || req.url}`, requestContext);

    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function(this: Response, ...args: any[]): Response {
      const duration = Date.now() - startTime;

      const responseContext: LogContext = {
        method: req.method,
        url: req.originalUrl || req.url,
        statusCode: res.statusCode,
        duration,
        headers: {}
      };

      // Add selected response headers
      responseHeaders.forEach(header => {
        const value = res.get(header);
        if (value) {
          (responseContext.headers as any)[header] = value;
        }
      });

      const logLevel = res.statusCode >= 400 ? LogLevel.WARN : level;
      logger.log(logLevel, `Response: ${req.method} ${req.originalUrl || req.url} ${res.statusCode}`, responseContext);

      return originalEnd.apply(this, args);
    };

    next();
  };
}

// =============================================================================
// CORRELATION ID MIDDLEWARE
// =============================================================================

export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Get existing correlation ID from header or generate new one
  const correlationId = req.headers['x-correlation-id'] as string || uuidv7();

  // Set correlation ID in headers for downstream services
  req.headers['x-correlation-id'] = correlationId;
  res.setHeader('x-correlation-id', correlationId);

  // Add request ID if not present
  const requestId = req.headers['x-request-id'] as string || uuidv7();
  req.headers['x-request-id'] = requestId;
  res.setHeader('x-request-id', requestId);

  // Add trace ID for distributed tracing
  const traceId = req.headers['x-trace-id'] as string || uuidv7();
  req.headers['x-trace-id'] = traceId;
  res.setHeader('x-trace-id', traceId);

  next();
}

// =============================================================================
// CONFIGURATION
// =============================================================================

export interface LoggerConfig {
  level?: LogLevel;
  environment?: 'development' | 'staging' | 'production';
  serviceName?: string;
  console?: boolean | { level?: LogLevel };
  transports?: winston.transport[];
  maxFileSize?: number;
  maxFiles?: number;
  errorLogPath?: string;
  combinedLogPath?: string;
  auditLogPath?: string;
}

export function getDefaultLoggerConfig(): LoggerConfig {
  return {
    level: process.env.LOG_LEVEL as LogLevel || LogLevel.INFO,
    environment: process.env.NODE_ENV as any || 'development',
    serviceName: process.env.SERVICE_NAME,
    console: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 10,
    errorLogPath: process.env.ERROR_LOG_PATH || 'logs/error.log',
    combinedLogPath: process.env.COMBINED_LOG_PATH || 'logs/combined.log',
    auditLogPath: process.env.AUDIT_LOG_PATH
  };
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let defaultLoggerInstance: Logger | null = null;

export function getLogger(config?: LoggerConfig): Logger {
  if (!defaultLoggerInstance) {
    const loggerConfig = config || getDefaultLoggerConfig();
    defaultLoggerInstance = new Logger(loggerConfig);
  }
  return defaultLoggerInstance;
}

export function initializeLogger(config: LoggerConfig): Logger {
  defaultLoggerInstance = new Logger(config);
  return defaultLoggerInstance;
}

// =============================================================================
// EXPORTS
// =============================================================================

export { Logger as default };
export { StructuredFormatter };
export type { LoggerConfig, LogContext, LogEntry, LoggerMiddlewareOptions };