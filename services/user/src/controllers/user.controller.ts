import { Request, Response } from 'express';
import { UserService } from '@/services/user.service';

export class UserController {
  private userService: UserService;
  constructor() {
    this.userService = new UserService();
  }

  async getUsers(req: Request, res: Response) {
    const users = await this.userService.getUsers();
    res.json({ success: true, data: users });
  }

  async getUserById(req: Request, res: Response) {
    const user = await this.userService.getUserById(req.params.id);
    res.json({ success: true, data: user });
  }
}
