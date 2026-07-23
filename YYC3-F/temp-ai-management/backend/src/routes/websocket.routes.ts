(function() {
  const express = require('express');
  const { authenticate } = require('../middleware/auth.middleware');
  const { logger } = require('../config/logger');

  const router = express.Router();
  let wsService: any = null;

  function initializeWebSocketRoutes(service: any) {
    wsService = service;

    // 获取在线状态
    router.get("/status", authenticate, (req: any, res: any) => {
      if (!wsService) {
        return res.status(503).json({ error: "WebSocket service not initialized" });
      }

      res.json({
        online: wsService.getOnlineClientsCount(),
        users: wsService.getOnlineUsers(),
        timestamp: new Date().toISOString(),
      });
    });

    // 发送测试通知
    router.post("/test-notification", authenticate, (req: any, res: any) => {
      if (!wsService) {
        return res.status(503).json({ error: "WebSocket service not initialized" });
      }

      const body = req.body || {};
      const userId = body.userId || '';
      const title = body.title || "Test Notification";
      const message = body.message || "This is a test notification";
      const type = body.type || "info";
      const priority = body.priority || "medium";

      wsService.sendNotificationToUser(userId, {
        id: `test-${Date.now()}`,
        title: title,
        message: message,
        type: type,
        priority: priority,
      });

      // 如果需要记录发送者信息，可以在日志中记录
      if (req.user) {
        logger.debug("Notification sent by user", { userId: req.user.userId, recipientId: userId });
      }

      res.json({ success: true, message: "Notification sent" });
    });

    return router;
  }

  module.exports = initializeWebSocketRoutes;
})();
