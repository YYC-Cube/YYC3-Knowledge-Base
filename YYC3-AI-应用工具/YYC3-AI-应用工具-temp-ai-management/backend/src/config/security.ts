import cors from "cors";
import { Express } from "express";
import helmet from "helmet";

export function configureSecurityMiddleware(app: Express) {
  // CORS 配置
  const corsOptions = {
    origin:
      process.env.NODE_ENV === "production"
        ? ["https://yanyu.cloud", "https://admin.yanyu.cloud"]
        : ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["X-New-Token"],
    credentials: true,
    maxAge: 86400, // 24小时
  };

  app.use(cors(corsOptions));

  // Helmet CSP 配置
  app.use(
    helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "cdn.yanyu.cloud"],
        styleSrc: ["'self'", "'unsafe-inline'", "cdn.yanyu.cloud"],
        imgSrc: ["'self'", "data:", "cdn.yanyu.cloud", "storage.yanyu.cloud"],
        connectSrc: ["'self'", "api.yanyu.cloud", "ws.yanyu.cloud"],
        fontSrc: ["'self'", "cdn.yanyu.cloud"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    })
  );

  // 其他安全标头
  app.use(helmet.xssFilter());
  app.use(helmet.noSniff());
  app.use(helmet.hidePoweredBy());
  app.use(helmet.frameguard({ action: "deny" }));
  app.use(helmet.referrerPolicy({ policy: "same-origin" }));
}
