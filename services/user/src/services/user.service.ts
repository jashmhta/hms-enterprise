import { User } from '@/models/user.model';
import { DatabaseService } from './database.service';

export class UserService {
  private db: DatabaseService;

  constructor() {
    this.db = new DatabaseService();
  }

  async getUsers() {
    return this.db.query<User[]>('SELECT * FROM users ORDER BY created_at DESC');
  }

  async getUserById(id: string) {
    return this.db.queryOne<User>('SELECT * FROM users WHERE id = $1', [id]);
  }

  async updateUser(id: string, data: Partial<User>) {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const setClause = fields.map((field, i) => `${field} = $${i + 2}`).join(', ');
    
    return this.db.query<User>(
      `UPDATE users SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
  }

  async deleteUser(id: string) {
    await this.db.query('DELETE FROM users WHERE id = $1', [id]);
    return { success: true };
  }

  async createMultipleUsers(users: any[]) {
    const results = [];
    for (const userData of users) {
      const user = await this.updateUser('temp', userData);
      results.push(user);
    }
    return results;
  }
}
