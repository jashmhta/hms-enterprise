import { Request, Response, NextFunction } from "express";
import { logger } from "@/utils/logger";
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error("Error:", { message: err.message, stack: err.stack, url: req.url });
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack })
  });
};
