import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { logger } from "../config/logger";

interface JwtPayload {
  userId: string;
  exp: number;
  iat: number;
}

export const jwtRefreshMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

    // 如果token剩余有效期不足15分钟则刷新
    const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
    if (expiresIn < 900) {
      const newToken = jwt.sign(
        { userId: decoded.userId },
        process.env.JWT_SECRET!,
        { expiresIn: "2h" }
      );

      // 在响应头中返回新令牌
      res.setHeader("X-New-Token", newToken);
      logger.info(`Refreshed JWT token for user: ${decoded.userId}`);
    }

    next();
  } catch (error) {
    // 令牌验证错误不中断请求，让后续中间件处理身份验证
    next();
  }
};
