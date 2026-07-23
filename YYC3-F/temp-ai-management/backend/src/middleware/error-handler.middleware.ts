import type { Request, Response, NextFunction } from "express";
import { logger } from "../config/logger";
import { AppError } from "../utils/app-error";
import { ErrorCode } from "../constants/error-codes";

interface RequestWithId extends Request {
  id?: string;
  user?: {
    userId: string;
    email: string;
    roles: string[];
  };
}

export function errorHandler(
  err: any,
  req: RequestWithId,
  res: Response,
  next: NextFunction
) {
  // 获取错误信息
  const statusCode = err.statusCode || err.status || 500;
  const errorCode = err.errorCode || ErrorCode.UNKNOWN_ERROR;
  const message = err.message || "Internal Server Error";
  const details = err.details || null;
  const stack = err.stack || "";

  // 构造客户端响应
  const clientResponse = {
    success: false,
    error: {
      code: errorCode,
      message: statusCode < 500 ? message : "An unexpected error occurred",
      requestId: req.id || generateRequestId(),
    },
  };

  // 添加调试信息（非生产环境）
  if (process.env.NODE_ENV !== "production" && details) {
    (clientResponse.error as any).details = details;
  }

  // 记录错误日志（带上下文信息）
  const logData = {
    errorCode,
    statusCode,
    message,
    stack: process.env.NODE_ENV !== "production" ? stack : undefined,
    details,
    request: {
      id: req.id,
      method: req.method,
      path: req.path,
      query: req.query,
      headers: {
        "user-agent": req.get("user-agent"),
        referer: req.get("referer"),
        "x-forwarded-for": req.get("x-forwarded-for"),
      },
      userId: req.user?.userId,
    },
  };

  // 数据库错误特殊处理
  if (err.code === "23505") {
    return res.status(409).json({
      success: false,
      error: {
        code: ErrorCode.CONFLICT,
        message: "Duplicate entry",
        requestId: req.id || generateRequestId(),
      },
    });
  }

  if (err.code === "23503") {
    return res.status(400).json({
      success: false,
      error: {
        code: ErrorCode.BAD_REQUEST,
        message: "Foreign key constraint violation",
        requestId: req.id || generateRequestId(),
      },
    });
  }

  // 验证错误
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: err.message,
        requestId: req.id || generateRequestId(),
      },
    });
  }

  if (statusCode >= 500) {
    logger.error("Server error", logData);
  } else {
    logger.warn("Client error", logData);
  }

  // 发送响应
  res.status(statusCode).json(clientResponse);
}

// 生成请求ID的简单函数
function generateRequestId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 异步错误处理包装器
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
