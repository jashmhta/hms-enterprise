import { UserAuditLog } from '@/models/user.model';
import { DatabaseService } from './database.service';

export class AuditService {
  private db: DatabaseService;

  constructor() {
    this.db = new DatabaseService();
  }

  async getActivityLogs(query: any) {
    const { page = 1, limit = 50 } = query;
    const offset = (page - 1) * limit;
    
    return this.db.query<UserAuditLog[]>(
      'SELECT * FROM user_audit_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
  }
}
