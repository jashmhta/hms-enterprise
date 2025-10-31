// HMS Enterprise Event Bus - Main Entry Point
// Complete event-driven communication system for microservices

// Export main classes
export { EventBus, BatchPublisher, getEventBus, initializeEventBus, getDefaultEventBusConfig } from './event-bus';

// Export all types
export * from './types';

// Export errors
export * from './errors';

// Export validator
export * from './validator';

// Export utilities
export { RedisClientManager, ConnectionPool } from './redis-client';
export { EventStore, InMemoryEventStore, RedisEventStore } from './event-store';
export { CorrelationIdManager } from './correlation-id';

// Default export
export { EventBus as default } from './event-bus';

// Re-export commonly used items for convenience
export type {
  BaseEvent,
  HMSEvent,
  EventBusConfig,
  EventPublishOptions,
  EventHandler,
  EventSubscriptionConfig,
  EventBusStats
} from './types';

export {
  EventBusError,
  PublishError,
  SubscriptionError,
  ValidationError,
  isRetryableError
} from './errors';