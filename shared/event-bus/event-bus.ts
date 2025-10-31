// HMS Enterprise Event Bus Implementation
// Production-ready Redis pub/sub event system
// Provides reliable inter-service communication

import Redis from 'ioredis';
import { v7 as uuidv7 } from 'uuid';
import {
  BaseEvent,
  HMSEvent,
  EventBusChannels,
  EventHandler,
  EventSubscriptionConfig,
  EventBusConfig,
  EventPublishOptions,
  DeadLetterEvent,
  EventBusStats,
  EventMetadata
} from './types';
import { EventBusError, ConnectionError, PublishError, SubscriptionError } from './errors';
import { validateEvent } from './validator';

export class EventBus {
  private publisher: Redis;
  private subscriber: Redis;
  private deadLetterClient: Redis;
  private readonly config: EventBusConfig;
  private readonly subscriptions = new Map<string, Set<EventHandler>>();
  private readonly subscriptionConfigs = new Map<string, EventSubscriptionConfig>();
  private isShuttingDown = false;
  private connectionAttempts = 0;
  private maxConnectionRetries = 10;
  private connectionRetryDelay = 5000;
  private stats: EventBusStats = {
    published: 0,
    received: 0,
    failed: 0,
    retried: 0,
    deadLettered: 0,
    uptime: Date.now()
  };

  constructor(config: EventBusConfig) {
    this.config = config;
    this.initializeConnections();
    this.setupGracefulShutdown();
  }

  // =============================================================================
  // CONNECTION MANAGEMENT
  // =============================================================================

  private initializeConnections(): void {
    const redisConfig = {
      host: this.config.redis.host,
      port: this.config.redis.port,
      password: this.config.redis.password,
      db: this.config.redis.db,
      maxRetriesPerRequest: this.config.redis.maxRetriesPerRequest || 3,
      retryDelayOnFailover: this.config.redis.retryDelayOnFailover || 100,
      lazyConnect: this.config.redis.lazyConnect || true,
      // Enable auto-reconnect with exponential backoff
      enableOfflineQueue: false,
      // Connection pool settings
      family: 4,
      keepAlive: 30000,
      // Custom retry strategy
      retryStrategy: (times: number) => {
        if (times > this.maxConnectionRetries) {
          return null; // Stop retrying
        }
        return Math.min(times * this.connectionRetryDelay, 30000);
      }
    };

    // Initialize publisher client
    this.publisher = new Redis(redisConfig);

    // Initialize subscriber client
    this.subscriber = new Redis(redisConfig);

    // Initialize dead letter queue client
    this.deadLetterClient = new Redis(redisConfig);

    // Setup error handling
    this.setupConnectionHandlers();
  }

  private setupConnectionHandlers(): void {
    // Publisher connection handlers
    this.publisher.on('connect', () => {
      console.log('Event Bus Publisher connected to Redis');
      this.connectionAttempts = 0;
    });

    this.publisher.on('error', (error) => {
      console.error('Event Bus Publisher connection error:', error);
      this.stats.lastError = error.message;
    });

    this.publisher.on('reconnecting', () => {
      console.log('Event Bus Publisher reconnecting...');
    });

    // Subscriber connection handlers
    this.subscriber.on('connect', () => {
      console.log('Event Bus Subscriber connected to Redis');
    });

    this.subscriber.on('error', (error) => {
      console.error('Event Bus Subscriber connection error:', error);
      this.stats.lastError = error.message;
    });

    this.subscriber.on('message', (channel, message) => {
      this.handleMessage(channel, message).catch((error) => {
        console.error('Error handling message:', error);
        this.stats.failed++;
      });
    });

    // Dead letter queue connection handlers
    this.deadLetterClient.on('error', (error) => {
      console.error('Event Bus Dead Letter Queue connection error:', error);
    });
  }

  // =============================================================================
  // PUBLISHING
  // =============================================================================

  async publish<T extends HMSEvent>(
    channel: keyof EventBusChannels,
    eventData: Omit<T['data'], keyof BaseEvent['data']>,
    metadata?: Partial<EventMetadata>,
    options?: EventPublishOptions
  ): Promise<string> {
    if (this.isShuttingDown) {
      throw new EventBusError('Event Bus is shutting down');
    }

    try {
      // Validate channel
      if (!channel || typeof channel !== 'string') {
        throw new PublishError('Invalid channel provided');
      }

      // Create complete event
      const event: BaseEvent = {
        id: uuidv7(),
        type: channel as string,
        source: process.env.SERVICE_NAME || 'unknown',
        timestamp: new Date(),
        data: eventData,
        metadata: {
          version: '1.0.0',
          correlationId: metadata?.correlationId || uuidv7(),
          causationId: metadata?.causationId,
          userId: metadata?.userId,
          sessionId: metadata?.sessionId,
          traceId: metadata?.traceId || uuidv7(),
          ...metadata
        }
      };

      // Validate event structure
      validateEvent(event);

      // Serialize event
      const serializedEvent = JSON.stringify(event);

      // Apply delay if specified
      let finalChannel = channel;
      if (options?.delay && options.delay > 0) {
        // Schedule delayed event
        await this.scheduleDelayedEvent(finalChannel, serializedEvent, options.delay);
      } else {
        // Publish immediately
        await this.publisher.publish(finalChannel, serializedEvent);
      }

      this.stats.published++;

      // Log publish for debugging (in production, use structured logging)
      console.debug(`Event published to channel ${channel}:`, {
        eventId: event.id,
        correlationId: event.metadata.correlationId
      });

      return event.id;

    } catch (error) {
      this.stats.failed++;
      throw new PublishError(`Failed to publish event to ${channel}: ${error.message}`, error);
    }
  }

  private async scheduleDelayedEvent(channel: string, serializedEvent: string, delay: number): Promise<void> {
    // Store delayed event in Redis with TTL
    const delayedEventKey = `events:delayed:${uuidv7()}`;
    await this.publisher.setex(delayedEventKey, Math.ceil(delay / 1000), serializedEvent);

    // Add to delayed events queue
    await this.publisher.zadd('events:delayed_queue', Date.now() + delay, delayedEventKey);
  }

  // =============================================================================
  // SUBSCRIPTION
  // =============================================================================

  async subscribe(config: EventSubscriptionConfig): Promise<void> {
    try {
      // Validate config
      if (!config.pattern || !config.handler) {
        throw new SubscriptionError('Pattern and handler are required for subscription');
      }

      // Store subscription config
      this.subscriptionConfigs.set(config.pattern, config);

      // Add handler to subscriptions
      if (!this.subscriptions.has(config.pattern)) {
        this.subscriptions.set(config.pattern, new Set());
      }
      this.subscriptions.get(config.pattern)!.add(config.handler);

      // Subscribe to pattern
      await this.subscriber.psubscribe(config.pattern);

      console.log(`Subscribed to pattern: ${config.pattern}`);

    } catch (error) {
      throw new SubscriptionError(`Failed to subscribe to ${config.pattern}: ${error.message}`, error);
    }
  }

  async unsubscribe(pattern: string, handler?: EventHandler): Promise<void> {
    try {
      if (handler) {
        // Remove specific handler
        const handlers = this.subscriptions.get(pattern);
        if (handlers) {
          handlers.delete(handler);
          if (handlers.size === 0) {
            this.subscriptions.delete(pattern);
            await this.subscriber.punsubscribe(pattern);
          }
        }
      } else {
        // Remove all handlers for pattern
        this.subscriptions.delete(pattern);
        await this.subscriber.punsubscribe(pattern);
      }

      this.subscriptionConfigs.delete(pattern);
      console.log(`Unsubscribed from pattern: ${pattern}`);

    } catch (error) {
      throw new SubscriptionError(`Failed to unsubscribe from ${pattern}: ${error.message}`, error);
    }
  }

  // =============================================================================
  // MESSAGE HANDLING
  // =============================================================================

  private async handleMessage(channel: string, message: string): Promise<void> {
    try {
      this.stats.received++;

      // Parse message
      const event: BaseEvent = JSON.parse(message);

      // Validate event
      validateEvent(event);

      // Find matching handlers
      const handlers = this.findHandlersForChannel(channel);

      if (handlers.length === 0) {
        console.debug(`No handlers found for channel: ${channel}`);
        return;
      }

      // Execute all matching handlers concurrently or with concurrency limit
      const config = this.subscriptionConfigs.get(channel);
      const concurrency = config?.options?.concurrency || 10;

      // Use semaphore pattern for concurrency control
      const semaphore = new Array(concurrency).fill(null);
      const promises = handlers.map(async (handler) => {
        // Wait for available slot
        await this.waitForSlot(semaphore);

        try {
          await this.executeHandler(handler, event, channel);
        } finally {
          // Release slot
          const index = semaphore.indexOf(null);
          if (index !== -1) {
            semaphore[index] = true;
          }
        }
      });

      await Promise.allSettled(promises);

    } catch (error) {
      this.stats.failed++;
      console.error(`Error handling message from ${channel}:`, error);

      // Send to dead letter queue if configured
      if (this.config.events?.enableDeadLetterQueue !== false) {
        await this.sendToDeadLetterQueue(channel, message, error);
      }
    }
  }

  private findHandlersForChannel(channel: string): EventHandler[] {
    const handlers: EventHandler[] = [];

    // Find exact matches
    const exactHandlers = this.subscriptions.get(channel);
    if (exactHandlers) {
      handlers.push(...exactHandlers);
    }

    // Find pattern matches
    for (const [pattern, patternHandlers] of this.subscriptions.entries()) {
      if (this.patternMatches(pattern, channel) && pattern !== channel) {
        handlers.push(...patternHandlers);
      }
    }

    return handlers;
  }

  private patternMatches(pattern: string, channel: string): boolean {
    // Simple wildcard matching for patterns like "patient.*"
    if (pattern === '*') return true;
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(channel);
    }
    return pattern === channel;
  }

  private async waitForSlot(semaphore: (boolean | null)[]): Promise<void> {
    return new Promise((resolve) => {
      const checkSlot = () => {
        const index = semaphore.indexOf(null);
        if (index !== -1) {
          semaphore[index] = true;
          resolve();
        } else {
          setTimeout(checkSlot, 10);
        }
      };
      checkSlot();
    });
  }

  private async executeHandler(
    handler: EventHandler,
    event: BaseEvent,
    channel: string
  ): Promise<void> {
    const config = this.subscriptionConfigs.get(channel);
    const maxRetries = config?.options?.maxRetries || 3;
    const timeout = config?.options?.timeout || 30000;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Execute with timeout
        await Promise.race([
          handler(event as HMSEvent),
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Handler timeout')), timeout);
          })
        ]);

        return; // Success, exit retry loop

      } catch (error) {
        lastError = error as Error;
        this.stats.retried++;

        if (attempt < maxRetries) {
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    console.error(`Handler failed after ${maxRetries} attempts for channel ${channel}:`, lastError);

    if (config?.options?.deadLetterQueue !== false) {
      await this.sendToDeadLetterQueue(channel, JSON.stringify(event), lastError!);
    }

    throw lastError!;
  }

  // =============================================================================
  // DEAD LETTER QUEUE
  // =============================================================================

  private async sendToDeadLetterQueue(
    channel: string,
    message: string,
    error: Error
  ): Promise<void> {
    try {
      const deadLetterEvent: DeadLetterEvent = {
        originalEvent: JSON.parse(message) as HMSEvent,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack || ''
        },
        retryCount: 0,
        firstFailure: new Date(),
        lastFailure: new Date(),
        metadata: {
          originalChannel: channel,
          errorStack: error.stack || '',
          retryHistory: []
        }
      };

      // Store in dead letter queue
      const deadLetterKey = `events:dlq:${uuidv7()}`;
      await this.deadLetterClient.setex(
        deadLetterKey,
        86400 * 7, // 7 days TTL
        JSON.stringify(deadLetterEvent)
      );

      // Add to DLQ list for processing
      await this.deadLetterClient.lpush('events:dlq_list', deadLetterKey);

      this.stats.deadLettered++;

    } catch (dlqError) {
      console.error('Failed to send event to dead letter queue:', dlqError);
    }
  }

  // =============================================================================
  // HEALTH AND MONITORING
  // =============================================================================

  async healthCheck(): Promise<boolean> {
    try {
      // Check Redis connections
      const publisherStatus = this.publisher.status === 'ready';
      const subscriberStatus = this.subscriber.status === 'ready';

      return publisherStatus && subscriberStatus && !this.isShuttingDown;
    } catch (error) {
      return false;
    }
  }

  getStats(): EventBusStats {
    return {
      ...this.stats,
      uptime: Date.now() - this.stats.uptime
    };
  }

  async getDelayedEventsCount(): Promise<number> {
    try {
      return await this.publisher.zcard('events:delayed_queue');
    } catch (error) {
      console.error('Error getting delayed events count:', error);
      return 0;
    }
  }

  async getDeadLetterQueueCount(): Promise<number> {
    try {
      return await this.deadLetterClient.llen('events:dlq_list');
    } catch (error) {
      console.error('Error getting dead letter queue count:', error);
      return 0;
    }
  }

  // =============================================================================
  // PROCESSING DELAYED EVENTS
  // =============================================================================

  async processDelayedEvents(): Promise<void> {
    if (this.isShuttingDown) return;

    try {
      const now = Date.now();
      const readyEvents = await this.publisher.zrangebyscore(
        'events:delayed_queue',
        0,
        now,
        'LIMIT',
        0,
        100 // Process up to 100 events at a time
      );

      for (const delayedEventKey of readyEvents) {
        try {
          // Get the event data
          const eventData = await this.publisher.get(delayedEventKey);
          if (eventData) {
            const event: BaseEvent = JSON.parse(eventData);
            await this.publisher.publish(event.type, eventData);
          }

          // Remove from delayed queue
          await this.publisher.zrem('events:delayed_queue', delayedEventKey);
          await this.publisher.del(delayedEventKey);

        } catch (error) {
          console.error(`Error processing delayed event ${delayedEventKey}:`, error);
        }
      }

    } catch (error) {
      console.error('Error processing delayed events:', error);
    }
  }

  // Start processing delayed events every 5 seconds
  startDelayedEventProcessor(): void {
    setInterval(() => {
      this.processDelayedEvents().catch(console.error);
    }, 5000);
  }

  // =============================================================================
  // GRACEFUL SHUTDOWN
  // =============================================================================

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      console.log(`Received ${signal}, gracefully shutting down Event Bus...`);
      this.isShuttingDown = true;

      try {
        // Stop accepting new events
        // Process remaining delayed events
        await this.processDelayedEvents();

        // Close connections
        await Promise.all([
          this.publisher.quit(),
          this.subscriber.quit(),
          this.deadLetterClient.quit()
        ]);

        console.log('Event Bus shutdown complete');
        process.exit(0);

      } catch (error) {
        console.error('Error during Event Bus shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  async createBatchPublisher(): Promise<BatchPublisher> {
    return new BatchPublisher(this.publisher, this.config);
  }

  async replayEvents(
    channel: string,
    startDate: Date,
    endDate: Date,
    handler: EventHandler
  ): Promise<void> {
    // Implementation for event replay (if event store is enabled)
    console.log(`Replaying events from ${startDate} to ${endDate} for channel: ${channel}`);
    // This would integrate with an event store if configured
  }
}

// =============================================================================
  // BATCH PUBLISHER
  // =============================================================================

export class BatchPublisher {
  private publisher: Redis;
  private config: EventBusConfig;
  private batch: Array<{ channel: string; event: string }> = [];
  private batchSize = 100;
  private flushInterval = 5000; // 5 seconds
  private flushTimer?: NodeJS.Timeout;

  constructor(publisher: Redis, config: EventBusConfig) {
    this.publisher = publisher;
    this.config = config;
    this.setupAutoFlush();
  }

  async add(channel: string, event: BaseEvent): Promise<void> {
    this.batch.push({ channel, event: JSON.stringify(event) });

    if (this.batch.length >= this.batchSize) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.batch.length === 0) return;

    const pipeline = this.publisher.pipeline();

    for (const { channel, event } of this.batch) {
      pipeline.publish(channel, event);
    }

    await pipeline.exec();
    this.batch = [];
  }

  private setupAutoFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch(console.error);
    }, this.flushInterval);
  }

  async destroy(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    await this.flush();
  }
}

// =============================================================================
  // SINGLETON INSTANCE
  // =============================================================================

let eventBusInstance: EventBus | null = null;

export function getEventBus(config?: EventBusConfig): EventBus {
  if (!eventBusInstance) {
    if (!config) {
      throw new EventBusError('EventBus config required for first initialization');
    }
    eventBusInstance = new EventBus(config);
  }
  return eventBusInstance;
}

export function initializeEventBus(config: EventBusConfig): EventBus {
  eventBusInstance = new EventBus(config);
  return eventBusInstance;
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

export function getDefaultEventBusConfig(): EventBusConfig {
  return {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      lazyConnect: true
    },
    events: {
      defaultRetryAttempts: 3,
      defaultTimeout: 30000,
      enableEventStore: false, // Can be enabled in production
      enableDeadLetterQueue: true
    }
  };
}

export default EventBus;