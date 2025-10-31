// HMS Enterprise Event Bus Custom Error Classes
// Comprehensive error handling for event bus operations

// Base Event Bus Error
export class EventBusError extends Error {
  public readonly code: string;
  public readonly retryable: boolean;
  public readonly context?: Record<string, unknown>;

  constructor(message: string, code = 'EVENT_BUS_ERROR', retryable = false, context?: Record<string, unknown>) {
    super(message);
    this.name = 'EventBusError';
    this.code = code;
    this.retryable = retryable;
    this.context = context;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, EventBusError);
  }
}

// Connection-related Errors
export class ConnectionError extends EventBusError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'CONNECTION_ERROR', true, context);
    this.name = 'ConnectionError';
  }
}

export class ConnectionTimeoutError extends ConnectionError {
  constructor(timeout: number, context?: Record<string, unknown>) {
    super(`Connection timeout after ${timeout}ms`, context);
    this.name = 'ConnectionTimeoutError';
    this.context = { timeout, ...context };
  }
}

export class MaxRetriesExceededError extends ConnectionError {
  constructor(attempts: number, context?: Record<string, unknown>) {
    super(`Maximum connection retries exceeded: ${attempts}`, context);
    this.name = 'MaxRetriesExceededError';
    this.retryable = false;
    this.context = { attempts, ...context };
  }
}

// Publishing-related Errors
export class PublishError extends EventBusError {
  constructor(message: string, originalError?: Error, context?: Record<string, unknown>) {
    super(message, 'PUBLISH_ERROR', true, {
      originalErrorName: originalError?.name,
      originalErrorMessage: originalError?.message,
      ...context
    });
    this.name = 'PublishError';
  }
}

export class EventValidationError extends PublishError {
  constructor(message: string, event?: unknown, context?: Record<string, unknown>) {
    super(message, undefined, { event, ...context });
    this.name = 'EventValidationError';
    this.retryable = false; // Validation errors are not retryable
  }
}

export class EventSizeExceededError extends PublishError {
  constructor(actualSize: number, maxSize: number, context?: Record<string, unknown>) {
    super(`Event size (${actualSize}) exceeds maximum allowed size (${maxSize})`, undefined, {
      actualSize,
      maxSize,
      ...context
    });
    this.name = 'EventSizeExceededError';
    this.retryable = false;
  }
}

export class ChannelNotFoundError extends PublishError {
  constructor(channel: string, context?: Record<string, unknown>) {
    super(`Channel not found: ${channel}`, undefined, { channel, ...context });
    this.name = 'ChannelNotFoundError';
    this.retryable = false;
  }
}

// Subscription-related Errors
export class SubscriptionError extends EventBusError {
  constructor(message: string, originalError?: Error, context?: Record<string, unknown>) {
    super(message, 'SUBSCRIPTION_ERROR', true, {
      originalErrorName: originalError?.name,
      originalErrorMessage: originalError?.message,
      ...context
    });
    this.name = 'SubscriptionError';
  }
}

export class HandlerTimeoutError extends SubscriptionError {
  constructor(timeout: number, handlerName?: string, context?: Record<string, unknown>) {
    super(`Handler execution timeout after ${timeout}ms`, undefined, {
      timeout,
      handlerName,
      ...context
    });
    this.name = 'HandlerTimeoutError';
    this.retryable = true;
  }
}

export class HandlerExecutionError extends SubscriptionError {
  constructor(message: string, handlerName?: string, eventId?: string, context?: Record<string, unknown>) {
    super(message, undefined, {
      handlerName,
      eventId,
      ...context
    });
    this.name = 'HandlerExecutionError';
    this.retryable = true;
  }
}

export class PatternValidationError extends SubscriptionError {
  constructor(pattern: string, reason: string, context?: Record<string, unknown>) {
    super(`Invalid subscription pattern '${pattern}': ${reason}`, undefined, {
      pattern,
      reason,
      ...context
    });
    this.name = 'PatternValidationError';
    this.retryable = false;
  }
}

// Dead Letter Queue Errors
export class DeadLetterQueueError extends EventBusError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'DLQ_ERROR', false, context);
    this.name = 'DeadLetterQueueError';
  }
}

export class DeadLetterQueueFullError extends DeadLetterQueueError {
  constructor(size: number, maxSize: number, context?: Record<string, unknown>) {
    super(`Dead letter queue is full (${size}/${maxSize})`, {
      size,
      maxSize,
      ...context
    });
    this.name = 'DeadLetterQueueFullError';
  }
}

// Validation Errors
export class ValidationError extends EventBusError {
  constructor(message: string, field?: string, value?: unknown, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', false, {
      field,
      value,
      ...context
    });
    this.name = 'ValidationError';
  }
}

export class RequiredFieldError extends ValidationError {
  constructor(field: string, context?: Record<string, unknown>) {
    super(`Required field '${field}' is missing`, field, undefined, context);
    this.name = 'RequiredFieldError';
  }
}

export class InvalidFormatError extends ValidationError {
  constructor(field: string, expectedFormat: string, actualValue: unknown, context?: Record<string, unknown>) {
    super(`Field '${field}' must be in format: ${expectedFormat}`, field, actualValue, context);
    this.name = 'InvalidFormatError';
  }
}

export class InvalidTypeError extends ValidationError {
  constructor(field: string, expectedType: string, actualType: string, context?: Record<string, unknown>) {
    super(`Field '${field}' must be of type ${expectedType}, got ${actualType}`, field, undefined, context);
    this.name = 'InvalidTypeError';
  }
}

// Configuration Errors
export class ConfigurationError extends EventBusError {
  constructor(message: string, field?: string, context?: Record<string, unknown>) {
    super(message, 'CONFIGURATION_ERROR', false, {
      field,
      ...context
    });
    this.name = 'ConfigurationError';
  }
}

export class InvalidConfigurationError extends ConfigurationError {
  constructor(configField: string, reason: string, context?: Record<string, unknown>) {
    super(`Invalid configuration for '${configField}': ${reason}`, configField, context);
    this.name = 'InvalidConfigurationError';
  }
}

// Rate Limiting Errors
export class RateLimitExceededError extends EventBusError {
  constructor(limit: number, windowMs: number, context?: Record<string, unknown>) {
    super(`Rate limit exceeded: ${limit} events per ${windowMs}ms`, 'RATE_LIMIT_EXCEEDED', true, {
      limit,
      windowMs,
      ...context
    });
    this.name = 'RateLimitExceededError';
  }
}

// Circuit Breaker Errors
export class CircuitBreakerOpenError extends EventBusError {
  constructor(service: string, resetTime: number, context?: Record<string, unknown>) {
    super(`Circuit breaker is open for service: ${service}. Resets at ${new Date(resetTime).toISOString()}`,
          'CIRCUIT_BREAKER_OPEN', false, {
      service,
      resetTime,
      ...context
    });
    this.name = 'CircuitBreakerOpenError';
  }
}

// Serialization Errors
export class SerializationError extends EventBusError {
  constructor(message: string, data?: unknown, context?: Record<string, unknown>) {
    super(message, 'SERIALIZATION_ERROR', false, {
      dataType: typeof data,
      ...context
    });
    this.name = 'SerializationError';
  }
}

export class DeserializationError extends EventBusError {
  constructor(message: string, rawData?: string, context?: Record<string, unknown>) {
    super(message, 'DESERIALIZATION_ERROR', false, {
      rawDataLength: rawData?.length,
      ...context
    });
    this.name = 'DeserializationError';
  }
}

// Health Check Errors
export class HealthCheckError extends EventBusError {
  constructor(message: string, component: string, context?: Record<string, unknown>) {
    super(message, 'HEALTH_CHECK_ERROR', false, {
      component,
      ...context
    });
    this.name = 'HealthCheckError';
  }
}

// Event Store Errors
export class EventStoreError extends EventBusError {
  constructor(message: string, operation: string, context?: Record<string, unknown>) {
    super(message, 'EVENT_STORE_ERROR', false, {
      operation,
      ...context
    });
    this.name = 'EventStoreError';
  }
}

// Batch Processing Errors
export class BatchProcessingError extends EventBusError {
  constructor(message: string, batchSize: number, processedCount: number, context?: Record<string, unknown>) {
    super(message, 'BATCH_PROCESSING_ERROR', false, {
      batchSize,
      processedCount,
      failedCount: batchSize - processedCount,
      ...context
    });
    this.name = 'BatchProcessingError';
  }
}

// Utility function to determine if an error is retryable
export function isRetryableError(error: Error): boolean {
  if (error instanceof EventBusError) {
    return error.retryable;
  }

  // Default retryable error patterns
  return error.message.includes('ECONNRESET') ||
         error.message.includes('ETIMEDOUT') ||
         error.message.includes('ENOTFOUND') ||
         error.message.includes('timeout') ||
         error.message.includes('network') ||
         error.message.includes('connection');
}

// Utility function to extract error information
export function extractErrorInfo(error: Error): {
  name: string;
  message: string;
  code?: string;
  retryable: boolean;
  context?: Record<string, unknown>;
  stack?: string;
} {
  const baseInfo = {
    name: error.name,
    message: error.message,
    stack: error.stack
  };

  if (error instanceof EventBusError) {
    return {
      ...baseInfo,
      code: error.code,
      retryable: error.retryable,
      context: error.context
    };
  }

  return {
    ...baseInfo,
    retryable: isRetryableError(error)
  };
}

// Export all errors
export {
  EventBusError as default,
  ConnectionError,
  ConnectionTimeoutError,
  MaxRetriesExceededError,
  PublishError,
  EventValidationError,
  EventSizeExceededError,
  ChannelNotFoundError,
  SubscriptionError,
  HandlerTimeoutError,
  HandlerExecutionError,
  PatternValidationError,
  DeadLetterQueueError,
  DeadLetterQueueFullError,
  ValidationError,
  RequiredFieldError,
  InvalidFormatError,
  InvalidTypeError,
  ConfigurationError,
  InvalidConfigurationError,
  RateLimitExceededError,
  CircuitBreakerOpenError,
  SerializationError,
  DeserializationError,
  HealthCheckError,
  EventStoreError,
  BatchProcessingError,
  isRetryableError,
  extractErrorInfo
};