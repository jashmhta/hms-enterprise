import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User, UserRole } from "@/models/user.model";
import { RedisService } from "@/services/redis.service";
import { logger } from "@/utils/logger";
export interface AuthRequest extends Request {
  user?: User;
}
export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (\!token) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }
    const decoded = jwt.verify(token, process.env.JWT_PUBLIC_KEY as string) as any;
    req.user = decoded.user;
    next();
  } catch (error) {
    logger.error("Auth middleware error:", error);
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};
export const requireRole = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (\!req.user || \!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    next();
  };
};
