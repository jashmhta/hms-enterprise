// HMS Enterprise Database Connection Pool
// Production-ready PostgreSQL connection management

import { Pool, PoolClient, PoolConfig } from 'pg';
import { Logger } from '../logger';

// =============================================================================
// CONNECTION CONFIGURATION
// =============================================================================

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean | {
    rejectUnauthorized?: boolean;
    ca?: string;
    key?: string;
    cert?: string;
  };
  pool?: {
    min?: number;
    max?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
    acquireTimeoutMillis?: number;
    createTimeoutMillis?: number;
    destroyTimeoutMillis?: number;
    reapIntervalMillis?: number;
    createRetryIntervalMillis?: number;
  };
  statement_timeout?: number;
  query_timeout?: number;
  application_name?: string;
}

export interface TransactionOptions {
  isolationLevel?: 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE';
  readOnly?: boolean;
  deferrable?: boolean;
}

// =============================================================================
// DATABASE CONNECTION MANAGER
// =============================================================================

export class DatabaseManager {
  private pool: Pool;
  private logger: Logger;
  private readonly config: DatabaseConfig;
  private isShuttingDown = false;

  constructor(config: DatabaseConfig, logger?: Logger) {
    this.config = this.createConfig(config);
    this.logger = logger || require('../logger').getLogger();
    this.initializePool();
    this.setupErrorHandling();
  }

  private createConfig(userConfig: DatabaseConfig): DatabaseConfig {
    const defaultConfig: Partial<DatabaseConfig> = {
      application_name: process.env.SERVICE_NAME || 'hms-service',
      statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '30000'), // 30 seconds
      query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT || '60000'), // 1 minute
      pool: {
        min: parseInt(process.env.DB_POOL_MIN || '2'),
        max: parseInt(process.env.DB_POOL_MAX || '20'),
        idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000'), // 30 seconds
        connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'), // 10 seconds
        acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000'), // 1 minute
        createTimeoutMillis: parseInt(process.env.DB_CREATE_TIMEOUT || '30000'), // 30 seconds
        destroyTimeoutMillis: parseInt(process.env.DB_DESTROY_TIMEOUT || '5000'), // 5 seconds
        reapIntervalMillis: parseInt(process.env.DB_POOL_REAP_INTERVAL || '1000'), // 1 second
        createRetryIntervalMillis: parseInt(process.env.DB_CREATE_RETRY_INTERVAL || '200') // 200ms
      }
    };

    return this.mergeConfig(defaultConfig, userConfig);
  }

  private mergeConfig(defaultConfig: Partial<DatabaseConfig>, userConfig: DatabaseConfig): DatabaseConfig {
    const config: DatabaseConfig = {
      host: userConfig.host,
      port: userConfig.port,
      database: userConfig.database,
      user: userConfig.user,
      password: userConfig.password,
      ssl: userConfig.ssl || false,
      statement_timeout: userConfig.statement_timeout || defaultConfig.statement_timeout,
      query_timeout: userConfig.query_timeout || defaultConfig.query_timeout,
      application_name: userConfig.application_name || defaultConfig.application_name
    };

    if (userConfig.pool || defaultConfig.pool) {
      config.pool = {
        min: userConfig.pool?.min || defaultConfig.pool?.min,
        max: userConfig.pool?.max || defaultConfig.pool?.max,
        idleTimeoutMillis: userConfig.pool?.idleTimeoutMillis || defaultConfig.pool?.idleTimeoutMillis,
        connectionTimeoutMillis: userConfig.pool?.connectionTimeoutMillis || defaultConfig.pool?.connectionTimeoutMillis,
        acquireTimeoutMillis: userConfig.pool?.acquireTimeoutMillis || defaultConfig.pool?.acquireTimeoutMillis,
        createTimeoutMillis: userConfig.pool?.createTimeoutMillis || defaultConfig.pool?.createTimeoutMillis,
        destroyTimeoutMillis: userConfig.pool?.destroyTimeoutMillis || defaultConfig.pool?.destroyTimeoutMillis,
        reapIntervalMillis: userConfig.pool?.reapIntervalMillis || defaultConfig.pool?.reapIntervalMillis,
        createRetryIntervalMillis: userConfig.pool?.createRetryIntervalMillis || defaultConfig.pool?.createRetryIntervalMillis
      };
    }

    return config;
  }

  private initializePool(): void {
    const poolConfig: PoolConfig = {
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
      ssl: this.config.ssl,
      min: this.config.pool?.min,
      max: this.config.pool?.max,
      idleTimeoutMillis: this.config.pool?.idleTimeoutMillis,
      connectionTimeoutMillis: this.config.pool?.connectionTimeoutMillis,
      statement_timeout: this.config.statement_timeout,
      query_timeout: this.config.query_timeout,
      application_name: this.config.application_name
    };

    this.pool = new Pool(poolConfig);
    this.logger.info('Database connection pool initialized', {
      host: this.config.host,
      database: this.config.database,
      maxConnections: this.config.pool?.max,
      minConnections: this.config.pool?.min
    });
  }

  private setupErrorHandling(): void {
    this.pool.on('connect', (client) => {
      this.logger.debug('New database client connected', {
        processId: client.processID,
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount
      });
    });

    this.pool.on('acquire', (client) => {
      this.logger.debug('Database client acquired from pool', {
        processId: client.processID,
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount
      });
    });

    this.pool.on('remove', (client) => {
      this.logger.debug('Database client removed from pool', {
        processId: client.processID,
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount
      });
    });

    this.pool.on('error', (error, client) => {
      this.logger.error('Database pool error', {
        error: error.message,
        processId: client?.processID,
        stack: error.stack
      });
    });

    // Graceful shutdown handling
    process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
  }

  private async gracefulShutdown(signal: string): Promise<void> {
    if (this.isShuttingDown) return;

    this.logger.info(`Received ${signal}, gracefully shutting down database connections...`);
    this.isShuttingDown = true;

    try {
      // Close all connections
      await this.pool.end();
      this.logger.info('Database connections closed successfully');
      process.exit(0);
    } catch (error) {
      this.logger.error('Error during database shutdown', { error: error.message });
      process.exit(1);
    }
  }

  // =============================================================================
  // CONNECTION METHODS
  // =============================================================================

  async getClient(): Promise<PoolClient> {
    if (this.isShuttingDown) {
      throw new Error('Database is shutting down');
    }

    try {
      const client = await this.pool.connect();
      this.logger.debug('Database client acquired from pool', {
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount
      });
      return client;
    } catch (error) {
      this.logger.error('Failed to acquire database client', { error: error.message });
      throw error;
    }
  }

  async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const start = Date.now();
    const client = await this.getClient();

    try {
      const result = await client.query<T>(text, params);
      const duration = Date.now() - start;

      this.logger.debug('Database query executed', {
        query: text,
        duration,
        rowCount: result.rowCount,
        params: params ? '[REDACTED]' : undefined
      });

      return {
        rows: result.rows,
        rowCount: result.rowCount || 0,
        command: result.command as any,
        duration
      };
    } catch (error) {
      const duration = Date.now() - start;
      this.logger.error('Database query failed', {
        query: text,
        duration,
        error: error.message,
        params: params ? '[REDACTED]' : undefined
      });
      throw error;
    } finally {
      client.release();
    }
  }

  // =============================================================================
  // TRANSACTION METHODS
  // =============================================================================

  async transaction<T>(
    callback: (client: TransactionClient) => Promise<T>,
    options?: TransactionOptions
  ): Promise<T> {
    const client = await this.getClient();
    const transactionClient = new TransactionClient(client, this.logger);

    try {
      await transactionClient.begin(options);
      const result = await callback(transactionClient);
      await transactionClient.commit();
      return result;
    } catch (error) {
      try {
        await transactionClient.rollback();
      } catch (rollbackError) {
        this.logger.error('Failed to rollback transaction', { error: rollbackError.message });
      }
      throw error;
    } finally {
      client.release();
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  async healthCheck(): Promise<DatabaseHealth> {
    try {
      const start = Date.now();
      await this.query('SELECT 1 as health_check');
      const responseTime = Date.now() - start;

      return {
        status: 'healthy',
        responseTime,
        totalConnections: this.pool.totalCount,
        idleConnections: this.pool.idleCount,
        waitingClients: this.pool.waitingCount
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        totalConnections: this.pool.totalCount,
        idleConnections: this.pool.idleCount,
        waitingClients: this.pool.waitingCount
      };
    }
  }

  getPoolStats(): PoolStats {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
      maxCount: this.config.pool?.max || 20
    };
  }

  async close(): Promise<void> {
    this.isShuttingDown = true;
    await this.pool.end();
    this.logger.info('Database connection pool closed');
  }

  getPool(): Pool {
    return this.pool;
  }
}

// =============================================================================
// TRANSACTION CLIENT
// =============================================================================

export class TransactionClient {
  private client: PoolClient;
  private logger: Logger;
  private isActive = false;
  private queryCount = 0;
  private startTime: number;

  constructor(client: PoolClient, logger: Logger) {
    this.client = client;
    this.logger = logger;
    this.startTime = Date.now();
  }

  async begin(options?: TransactionOptions): Promise<void> {
    if (this.isActive) {
      throw new Error('Transaction is already active');
    }

    let beginQuery = 'BEGIN';

    if (options?.isolationLevel) {
      beginQuery += ` ISOLATION LEVEL ${options.isolationLevel}`;
    }

    if (options?.readOnly) {
      beginQuery += ' READ ONLY';
    }

    if (options?.deferrable) {
      beginQuery += ' DEFERRABLE';
    }

    await this.client.query(beginQuery);
    this.isActive = true;
    this.queryCount = 1;
    this.startTime = Date.now();

    this.logger.debug('Transaction started', {
      isolationLevel: options?.isolationLevel,
      readOnly: options?.readOnly,
      deferrable: options?.deferrable
    });
  }

  async commit(): Promise<void> {
    if (!this.isActive) {
      throw new Error('No active transaction to commit');
    }

    await this.client.query('COMMIT');
    const duration = Date.now() - this.startTime;
    this.isActive = false;

    this.logger.debug('Transaction committed', {
      duration,
      queryCount: this.queryCount
    });
  }

  async rollback(): Promise<void> {
    if (!this.isActive) {
      return; // No transaction to rollback
    }

    await this.client.query('ROLLBACK');
    const duration = Date.now() - this.startTime;
    this.isActive = false;

    this.logger.warn('Transaction rolled back', {
      duration,
      queryCount: this.queryCount
    });
  }

  async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    if (!this.isActive) {
      throw new Error('No active transaction');
    }

    const start = Date.now();
    this.queryCount++;

    try {
      const result = await this.client.query<T>(text, params);
      const duration = Date.now() - start;

      this.logger.debug('Transaction query executed', {
        query: text,
        duration,
        rowCount: result.rowCount,
        params: params ? '[REDACTED]' : undefined,
        queryCount: this.queryCount
      });

      return {
        rows: result.rows,
        rowCount: result.rowCount || 0,
        command: result.command as any,
        duration
      };
    } catch (error) {
      const duration = Date.now() - start;
      this.logger.error('Transaction query failed', {
        query: text,
        duration,
        error: error.message,
        params: params ? '[REDACTED]' : undefined,
        queryCount: this.queryCount
      });
      throw error;
    }
  }

  async savepoint(name: string): Promise<void> {
    if (!this.isActive) {
      throw new Error('No active transaction');
    }

    await this.client.query(`SAVEPOINT ${name}`);
    this.logger.debug('Savepoint created', { name });
  }

  async rollbackToSavepoint(name: string): Promise<void> {
    if (!this.isActive) {
      throw new Error('No active transaction');
    }

    await this.client.query(`ROLLBACK TO SAVEPOINT ${name}`);
    this.logger.debug('Rolled back to savepoint', { name });
  }

  async releaseSavepoint(name: string): Promise<void> {
    if (!this.isActive) {
      throw new Error('No active transaction');
    }

    await this.client.query(`RELEASE SAVEPOINT ${name}`);
    this.logger.debug('Savepoint released', { name });
  }

  isTransactionActive(): boolean {
    return this.isActive;
  }

  getQueryCount(): number {
    return this.queryCount;
  }
}

// =============================================================================
// UTILITY TYPES AND INTERFACES
// =============================================================================

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
  command: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  duration: number;
}

export interface DatabaseHealth {
  status: 'healthy' | 'unhealthy';
  responseTime?: number;
  error?: string;
  totalConnections: number;
  idleConnections: number;
  waitingClients: number;
}

export interface PoolStats {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
  maxCount: number;
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

export function getDefaultDatabaseConfig(): DatabaseConfig {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'hms',
    user: process.env.DB_USER || 'hmsuser',
    password: process.env.DB_PASSWORD || 'hmspassword',
    ssl: process.env.DB_SSL === 'true' ? {
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
    } : false,
    statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '30000'),
    query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT || '60000'),
    application_name: process.env.SERVICE_NAME || 'hms-service',
    pool: {
      min: parseInt(process.env.DB_POOL_MIN || '2'),
      max: parseInt(process.env.DB_POOL_MAX || '20'),
      idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
      acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000'),
      createTimeoutMillis: parseInt(process.env.DB_CREATE_TIMEOUT || '30000'),
      destroyTimeoutMillis: parseInt(process.env.DB_DESTROY_TIMEOUT || '5000'),
      reapIntervalMillis: parseInt(process.env.DB_POOL_REAP_INTERVAL || '1000'),
      createRetryIntervalMillis: parseInt(process.env.DB_CREATE_RETRY_INTERVAL || '200')
    }
  };
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let databaseInstance: DatabaseManager | null = null;

export function getDatabase(config?: DatabaseConfig): DatabaseManager {
  if (!databaseInstance) {
    const dbConfig = config || getDefaultDatabaseConfig();
    databaseInstance = new DatabaseManager(dbConfig);
  }
  return databaseInstance;
}

export function initializeDatabase(config: DatabaseConfig): DatabaseManager {
  databaseInstance = new DatabaseManager(config);
  return databaseInstance;
}

export default DatabaseManager;