import { Role } from '@/models/user.model';
import { DatabaseService } from './database.service';

export class RoleService {
  private db: DatabaseService;

  constructor() {
    this.db = new DatabaseService();
  }

  async getRoles() {
    return this.db.query<Role[]>('SELECT * FROM roles ORDER BY level DESC');
  }

  async createRole(data: any) {
    return this.db.query<Role>(
      'INSERT INTO roles (name, display_name, description, permissions) VALUES ($1, $2, $3, $4) RETURNING *',
      [data.name, data.displayName, data.description, JSON.stringify(data.permissions)]
    );
  }

  async updateRole(id: string, data: any) {
    return this.db.query<Role>(
      'UPDATE roles SET name = $2, display_name = $3, description = $4, permissions = $5 WHERE id = $1 RETURNING *',
      [id, data.name, data.displayName, data.description, JSON.stringify(data.permissions)]
    );
  }
}
