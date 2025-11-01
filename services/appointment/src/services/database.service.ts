import { Pool } from "pg";
export class DatabaseService {
  private pool: Pool;
  constructor() { this.pool = new Pool({ connectionString: process.env.DATABASE_URL }); }
  async query<T>(text: string, params?: any[]): Promise<T> {
    const client = await this.pool.connect(); try { const res = await client.query(text, params); return res.rows[0]; }
    finally { client.release(); }
  }
  async queryOne<T>(text: string, params?: any[]): Promise<T | null> {
    const result = await this.query<T | null>(text, params); return result || null;
  }
}
