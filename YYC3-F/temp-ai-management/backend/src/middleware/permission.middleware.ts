import { Request, Response, NextFunction } from "express";
import { PermissionService } from "../services/permission.service";
import { logger } from "../config/logger";

interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    roles: string[];
  };
}

export function requirePermission(action: string, resource: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // 检查用户是否已认证
      if (!req.user || !req.user.userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: "ERR_1001",
            message: "Authentication required",
          },
        });
      }

      const userId = req.user.userId;
      const resourceId = req.params.id; // 可选的资源ID

      // 检查权限
      const hasPermission = await PermissionService.checkPermission(
        userId,
        action,
        resource,
        resourceId
      );

      if (!hasPermission) {
        logger.warn("Permission denied", {
          userId,
          action,
          resource,
          resourceId,
          path: req.path,
          method: req.method,
        });

        return res.status(403).json({
          success: false,
          error: {
            code: "ERR_1005",
            message: "Insufficient permissions",
          },
        });
      }

      next();
    } catch (error) {
      logger.error("Permission check error", { error, userId: req.user?.userId });

      return res.status(500).json({
        success: false,
        error: {
          code: "ERR_5001",
          message: "Internal server error",
        },
      });
    }
  };
}

// 预定义的权限检查器
export const requireAdmin = requirePermission("*", "*");
export const requireReconciliationRead = requirePermission(
  "read",
  "reconciliation"
);
export const requireReconciliationWrite = requirePermission(
  "write",
  "reconciliation"
);
export const requireAnalyticsRead = requirePermission("read", "analytics");
