import { Request, Response } from 'express';
import { AuthService } from '@/services/auth.service';

export class AuthController {
  private authService: AuthService;
  constructor() {
    this.authService = new AuthService();
  }

  async login(req: Request, res: Response) {
    try {
      const result = await this.authService.login(req.body);
      res.json(result);
    } catch (error: any) {
      res.status(error.status || 500).json({ success: false, message: error.message });
    }
  }

  async abdmLogin(req: Request, res: Response) {
    try {
      const result = await this.authService.abdmLogin(req.body);
      res.json(result);
    } catch (error: any) {
      res.status(error.status || 500).json({ success: false, message: error.message });
    }
  }
}
