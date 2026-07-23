interface ClientInfo {
  socket: import('socket.io').Socket;
  userId: string | null;
  authenticated: boolean;
  connectedAt: Date;
}

interface Message {
  type: string;
  recipientId?: string;
  content?: string;
  data?: any;
  senderId?: string | null;
  timestamp?: string;
}

interface SubscribeData {
  channel: string;
  subscribe?: boolean;
}

// 使用CommonJS导入
const redisInstance = require('../config/redis');
const loggerInstance = require('../config/logger').logger;
const AppErrorInstance = require('../utils/app-error').AppError;
const ErrorCodeInstance = require('../constants/error-codes').ErrorCode;

// 定义WebSocketService类
class WebSocketServiceClass {
  // 明确声明所有属性并指定类型
  logger: typeof loggerInstance = loggerInstance;
  io: import('socket.io').Server | null = null;
  clients: Map<string, ClientInfo> = new Map();
  userSockets: Map<string, Set<string>> = new Map();
  channels: Map<string, Set<string>> = new Map();
  isInitialized: boolean = false;
  redisClient: any = null; // 简化类型声明

  /**
   * @param {import('http').Server} [server] - HTTP服务器实例
   */
  constructor(server?: import('http').Server) {
    // 如果提供了server参数，直接初始化
    if (server) {
      this.init(server);
    }
  }

  /**
   * 初始化WebSocket服务
   * @param {import('http').Server} server - HTTP服务器实例
   */
  init(server: import('http').Server): void {
    try {
      // 导入socket.io
      const { Server } = require('socket.io');
      this.io = new Server(server, {
        cors: {
          origin: '*',
          methods: ['GET', 'POST'],
          credentials: true
        },
        transports: ['websocket', 'polling'],
        allowEIO3: true
      });

      this.setupListeners();
      this.setupRedisListeners();
      this.isInitialized = true;
      this.logger.info('WebSocket service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize WebSocket service', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw new Error('Failed to initialize WebSocket service');
    }
  }

  /**
   * 设置WebSocket监听器
   */
  setupListeners(): void {
    // 连接事件
    this.io?.on('connection', (socket: import('socket.io').Socket) => {
      this.logger.info('New WebSocket connection established', { socketId: socket.id });
      
      // 存储客户端信息
      this.clients.set(socket.id, {
        socket,
        userId: null,
        authenticated: false,
        connectedAt: new Date()
      });

      // 认证事件
      socket.on('authenticate', (token: string) => {
        this.handleAuthentication(socket, token);
      });

      // 消息事件
      socket.on('message', (message: Message) => {
        this.handleMessage(socket, message);
      });

      // 订阅频道事件
      socket.on('subscribe', (data: SubscribeData) => {
        this.handleSubscribe(socket, data);
      });

      // 断开连接事件
      socket.on('disconnect', (reason: string) => {
        this.handleDisconnect(socket, reason);
      });

      // 错误事件
      socket.on('error', (error: Error) => {
        this.logger.error('WebSocket error', {
          socketId: socket.id,
          error: error.message
        });
      });
    });
  }

  /**
   * 设置Redis监听器
   */
  setupRedisListeners(): void {
    try {
      // 获取Redis客户端
      this.redisClient = redisInstance.redis;

      // 监听Redis消息
      this.redisClient.on('message', (channel: string, message: string) => {
        this.handleRedisMessage(channel, message);
      });

      // 监听Redis错误
      this.redisClient.on('error', (error: Error) => {
        this.logger.error('Redis client error in WebSocket service', {
          error: error.message || 'Unknown Redis error'
        });
      });
    } catch (error) {
      this.logger.error('Failed to setup Redis listeners', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  /**
   * 处理认证
   * @param {import('socket.io').Socket} socket - Socket实例
   * @param {string} token - 认证令牌
   */
  async handleAuthentication(socket: import('socket.io').Socket, token: string): Promise<void> {
    try {
      if (!token) {
        socket.emit('auth_error', { message: 'Authentication token is required' });
        return;
      }

      // 验证token逻辑
      let userId: string | null = null;
      try {
        // 实际项目中这里应该调用auth服务验证token
        // const decoded = await authService.verifyToken(token);
        // userId = decoded.userId;
        
        // 模拟验证成功
        userId = 'user_' + Math.random().toString(36).substring(2, 10);
      } catch (error) {
        socket.emit('auth_error', { message: 'Invalid or expired token' });
        this.logger.warn('WebSocket authentication failed', { socketId: socket.id });
        return;
      }

      // 更新客户端信息
      const clientInfo = this.clients.get(socket.id);
      if (clientInfo) {
        clientInfo.userId = userId;
        clientInfo.authenticated = true;
        
        // 存储用户的socket连接
        if (!this.userSockets.has(userId)) {
          this.userSockets.set(userId, new Set());
        }
        this.userSockets.get(userId)?.add(socket.id);
        
        // 发送认证成功消息
        socket.emit('auth_success', { userId });
        this.logger.info('WebSocket client authenticated', { socketId: socket.id, userId });
      }
    } catch (error) {
      this.logger.error('Error during authentication', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      socket.emit('auth_error', { message: 'Authentication failed' });
    }
  }

  /**
   * 处理消息
   * @param {import('socket.io').Socket} socket - Socket实例
   * @param {Message} message - 消息对象
   */
  async handleMessage(socket: import('socket.io').Socket, message: Message): Promise<void> {
    try {
      const clientInfo = this.clients.get(socket.id);
      if (!clientInfo || !clientInfo.authenticated) {
        socket.emit('error', { message: 'Authentication required' });
        return;
      }

      const { userId } = clientInfo;
      this.logger.info('Received WebSocket message', {
        socketId: socket.id,
        userId,
        messageType: message.type || 'unknown'
      });

      // 根据消息类型处理
      switch (message.type) {
        case 'chat':
          // 处理聊天消息
          if (message.recipientId && message.content) {
            this.sendMessageToUser(message.recipientId, {
              type: 'chat',
              senderId: userId,
              content: message.content,
              timestamp: new Date().toISOString()
            });
          }
          break;
        case 'notification':
          // 处理通知消息
          if (message.data) {
            this.broadcastNotification(message.data);
          }
          break;
        default:
          this.logger.warn('Unknown message type', { type: message.type });
      }
    } catch (error) {
      this.logger.error('Error handling WebSocket message', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      socket.emit('error', { message: 'Failed to process message' });
    }
  }

  /**
   * 处理订阅
   * @param {import('socket.io').Socket} socket - Socket实例
   * @param {SubscribeData} data - 订阅数据
   */
  handleSubscribe(socket: import('socket.io').Socket, data: SubscribeData): void {
    try {
      const clientInfo = this.clients.get(socket.id);
      if (!clientInfo || !clientInfo.authenticated) {
        socket.emit('error', { message: 'Authentication required' });
        return;
      }

      const { channel, subscribe = true } = data;
      if (!channel) {
        socket.emit('error', { message: 'Channel name is required' });
        return;
      }

      if (subscribe) {
        // 添加到频道
        if (!this.channels.has(channel)) {
          this.channels.set(channel, new Set());
        }
        this.channels.get(channel)?.add(socket.id);
        
        // 订阅Redis频道
        if (this.redisClient && typeof this.redisClient.subscribe === 'function') {
          try {
            this.redisClient.subscribe(channel);
          } catch (redisError) {
            this.logger.error('Failed to subscribe to Redis channel', {
              channel,
              error: redisError instanceof Error ? redisError.message : 'Unknown error'
            });
          }
        }
        
        socket.emit('subscribe_success', { channel });
        this.logger.info('Socket subscribed to channel', {
          socketId: socket.id,
          channel
        });
      } else {
        // 取消订阅
        if (this.channels.has(channel)) {
          this.channels.get(channel)?.delete(socket.id);
          
          // 如果频道中没有订阅者，清理频道
          if (this.channels.get(channel)?.size === 0) {
            this.channels.delete(channel);
            
            // 取消订阅Redis频道
            if (this.redisClient && typeof this.redisClient.unsubscribe === 'function') {
              try {
                this.redisClient.unsubscribe(channel);
              } catch (redisError) {
                this.logger.error('Failed to unsubscribe from Redis channel', {
                  channel,
                  error: redisError instanceof Error ? redisError.message : 'Unknown error'
                });
              }
            }
          }
        }
        
        socket.emit('unsubscribe_success', { channel });
        this.logger.info('Socket unsubscribed from channel', {
          socketId: socket.id,
          channel
        });
      }
    } catch (error) {
      this.logger.error('Error handling subscription', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      socket.emit('error', { message: 'Failed to process subscription' });
    }
  }

  /**
   * 处理断开连接
   * @param {import('socket.io').Socket} socket - Socket实例
   * @param {string} reason - 断开原因
   */
  handleDisconnect(socket: import('socket.io').Socket, reason: string): void {
    const socketId = socket.id;
    const clientInfo = this.clients.get(socketId);
    
    this.logger.info('WebSocket connection closed', {
      socketId,
      reason,
      userId: clientInfo?.userId || 'unauthenticated'
    });

    // 清理客户端信息
    if (clientInfo && clientInfo.userId) {
      // 从用户socket映射中移除
      const userSockets = this.userSockets.get(clientInfo.userId);
      if (userSockets) {
        userSockets.delete(socketId);
        // 如果用户没有其他连接，清理用户socket映射
        if (userSockets.size === 0) {
          this.userSockets.delete(clientInfo.userId);
        }
      }
    }

    // 从所有频道中移除
    for (const [channel, sockets] of this.channels.entries()) {
      if (sockets.has(socketId)) {
        sockets.delete(socketId);
        // 如果频道中没有订阅者，清理频道
        if (sockets.size === 0) {
          this.channels.delete(channel);
          // 取消订阅Redis频道
          if (this.redisClient && typeof this.redisClient.unsubscribe === 'function') {
            try {
              this.redisClient.unsubscribe(channel);
            } catch (redisError) {
              this.logger.error('Failed to unsubscribe from Redis channel during cleanup', {
                channel,
                error: redisError instanceof Error ? redisError.message : 'Unknown error'
              });
            }
          }
        }
      }
    }

    // 移除客户端信息
    this.clients.delete(socketId);
  }

  /**
   * 处理Redis消息
   * @param {string} channel - 频道名称
   * @param {string} message - 消息内容
   */
  handleRedisMessage(channel: string, message: string): void {
    try {
      // 解析消息
      let parsedMessage = message;
      if (typeof message === 'string') {
        try {
          parsedMessage = JSON.parse(message);
        } catch (e) {
          this.logger.warn('Failed to parse Redis message', { 
            channel, 
            error: e instanceof Error ? e.message : 'Unknown error' 
          });
        }
      }

      // 广播到订阅该频道的客户端
      const sockets = this.channels.get(channel);
      if (sockets) {
        sockets.forEach((socketId: string) => {
          const client = this.clients.get(socketId);
          if (client) {
            client.socket.emit('redis_message', {
              channel,
              message: parsedMessage
            });
          }
        });
      }

      this.logger.info('Processed Redis message', { channel });
    } catch (error) {
      this.logger.error('Error handling Redis message', {
        channel,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 向特定用户发送消息
   * @param {string} userId - 用户ID
   * @param {Message} message - 消息对象
   * @returns {boolean} - 是否发送成功
   */
  sendMessageToUser(userId: string, message: Message): boolean {
    try {
      const sockets = this.userSockets.get(userId);
      if (!sockets || sockets.size === 0) {
        this.logger.warn('No active sockets for user', { userId });
        return false;
      }

      sockets.forEach((socketId: string) => {
        const client = this.clients.get(socketId);
        if (client) {
          client.socket.emit('message', message);
        }
      });

      this.logger.info('Message sent to user', { userId, messageType: message.type });
      return true;
    } catch (error) {
      this.logger.error('Failed to send message to user', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * 向所有认证用户广播消息
   * @param {Message} message - 消息对象
   * @returns {boolean} - 是否广播成功
   */
  broadcastMessage(message: Message): boolean {
    try {
      this.clients.forEach((client, socketId: string) => {
        if (client.authenticated) {
          client.socket.emit('message', message);
        }
      });

      this.logger.info('Message broadcasted to all authenticated users', {
        messageType: message.type
      });
      return true;
    } catch (error) {
      this.logger.error('Failed to broadcast message', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * 广播通知
   * @param {any} notification - 通知对象
   * @returns {boolean} - 是否广播成功
   */
  broadcastNotification(notification: any): boolean {
    try {
      this.clients.forEach((client, socketId: string) => {
        if (client.authenticated) {
          client.socket.emit('notification', notification);
        }
      });

      this.logger.info('Notification broadcasted', {
        notificationType: notification.type
      });
      return true;
    } catch (error) {
      this.logger.error('Failed to broadcast notification', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * 获取用户的连接数
   * @param {string} userId - 用户ID
   * @returns {number} - 连接数
   */
  getUserConnectionsCount(userId: string): number {
    const sockets = this.userSockets.get(userId);
    return sockets ? sockets.size : 0;
  }

  /**
   * 获取总连接数
   * @returns {number} - 总连接数
   */
  getTotalConnectionsCount(): number {
    return this.clients.size;
  }

  /**
   * 获取认证用户数
   * @returns {number} - 认证用户数
   */
  getAuthenticatedUsersCount(): number {
    return this.userSockets.size;
  }

  /**
   * 关闭WebSocket服务
   * @returns {boolean} - 是否关闭成功
   */
  close(): boolean {
    try {
      if (this.io && typeof this.io.close === 'function') {
        this.io.close();
      }

      // 清理资源
      this.clients.clear();
      this.userSockets.clear();
      this.channels.clear();
      this.isInitialized = false;

      return true;
    } catch (error) {
      this.logger.error('Error closing WebSocket service', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * 发布AI分析结果
   * @param {string} userId - 用户ID
   * @param {any} analysisData - 分析数据
   * @returns {boolean} - 是否发布成功
   */
  publishAiAnalysis(userId: string, analysisData: any): boolean {
    try {
      // 向特定用户发送AI分析结果
      return this.sendMessageToUser(userId, {
        type: 'ai_analysis',
        data: analysisData,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.logger.error('Failed to publish AI analysis', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * 发布系统通知
   * @param {any} notification - 通知对象
   * @returns {boolean} - 是否发布成功
   */
  publishSystemNotification(notification: any): boolean {
    try {
      // 广播系统通知
      return this.broadcastNotification({
        type: 'system_notification',
        data: notification,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.logger.error('Failed to publish system notification', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }
}

// 导出服务类
module.exports = WebSocketServiceClass;
