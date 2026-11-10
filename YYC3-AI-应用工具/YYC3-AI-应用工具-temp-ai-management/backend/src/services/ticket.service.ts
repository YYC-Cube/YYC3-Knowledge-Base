// 直接导入和使用，避免变量重复声明
import { pool } from '../config/database';
import { logger } from '../config/logger';

/**
 * 工单服务类
 */
export default class TicketService {
  /**
   * 获取工单列表
   * @param {Object} filters - 过滤条件
   * @param {string} [filters.status] - 工单状态
   * @param {string} [filters.priority] - 工单优先级
   * @param {string} [filters.category] - 工单分类
   * @param {string} [filters.assignedTo] - 处理人
   * @param {string} [filters.createdBy] - 创建人
   * @param {number} [filters.page=1] - 页码
   * @param {number} [filters.limit=20] - 每页数量
   * @param {string} [filters.sortBy='created_at'] - 排序字段
   * @param {string} [filters.sortOrder='desc'] - 排序顺序
   * @returns {Promise<Array>} 工单列表
   */
  async getTickets(filters: any = {}): Promise<Array<any>> {
    const {
      status,
      priority,
      category,
      assignedTo,
      createdBy,
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = filters;

    try {
      let query = `
        SELECT * FROM support_tickets
        WHERE 1=1
      `;
      const params = [];

      // 添加过滤条件
      if (status) {
        params.push(status);
        query += ` AND status = $${params.length}`;
      }

      if (priority) {
        params.push(priority);
        query += ` AND priority = $${params.length}`;
      }

      if (category) {
        params.push(category);
        query += ` AND category = $${params.length}`;
      }

      if (assignedTo) {
        params.push(assignedTo);
        query += ` AND assigned_to = $${params.length}`;
      }

      if (createdBy) {
        params.push(createdBy);
        query += ` AND created_by = $${params.length}`;
      }

      // 添加排序
      const validSortColumns = ['created_at', 'updated_at', 'due_date', 'priority'];
      const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
      const sortDirection = ['asc', 'desc'].includes(sortOrder) ? sortOrder : 'desc';
      query += ` ORDER BY ${sortColumn} ${sortDirection}`;

      // 添加分页
      const offset = (page - 1) * limit;
      params.push(limit, offset);
      query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

      const result = await pool.query(query, params);
      return result.rows.map(row => this.mapDbTicketToModel(row));
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Error fetching tickets', { error: errorMessage });
        throw error;
      }
  }

  /**
   * 获取单个工单
   * @param {string} ticketId - 工单ID
   * @returns {Promise<Object|null>} 工单对象
   */
  async getTicketById(ticketId: string): Promise<any | null> {
    try {
      const query = `
        SELECT * FROM support_tickets
        WHERE id = $1
      `;
      const result = await pool.query(query, [ticketId]);

      if (result.rows.length === 0) {
        return null;
      }

      const ticket = result.rows[0];
      const messages = await this.getTicketMessages(ticketId);
      return this.mapDbTicketToModel(ticket, messages);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Error fetching ticket by ID', { 
          ticketId, 
          error: errorMessage 
        });
        throw error;
      }
  }

  /**
   * 创建新工单
   * @param {Object} ticketData - 工单数据
   * @param {string} ticketData.title - 工单标题
   * @param {string} ticketData.description - 工单描述
   * @param {string} ticketData.category - 工单分类
   * @param {string} ticketData.priority - 工单优先级
   * @param {string} ticketData.createdBy - 创建人ID
   * @param {string} [ticketData.customerName] - 客户名称
   * @param {string} [ticketData.customerEmail] - 客户邮箱
   * @param {string} [ticketData.customerPhone] - 客户电话
   * @param {Array} [ticketData.tags] - 标签列表
   * @returns {Promise<Object>} 创建的工单
   */
  async createTicket(ticketData: { title: string; description: string; category: string; priority: string; createdBy: string; customerName?: string; customerEmail?: string; customerPhone?: string; tags?: string[] }): Promise<any> {
    try {
      const {
        title,
        description,
        category,
        priority,
        createdBy,
        customerName,
        customerEmail,
        customerPhone,
        tags = []
      } = ticketData;

      const ticketNumber = await this.generateTicketNumber();
      const dueDate = this.calculateDueDate(priority);

      const query = `
        INSERT INTO support_tickets (
          ticket_number,
          title,
          description,
          category,
          priority,
          status,
          created_by,
          customer_name,
          customer_email,
          customer_phone,
          tags,
          due_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;

      const result = await pool.query(query, [
        ticketNumber,
        title,
        description,
        category,
        priority,
        'open',
        createdBy,
        customerName,
        customerEmail,
        customerPhone,
        tags,
        dueDate
      ]);

      const newTicket = result.rows[0];
      logger.info('Ticket created', { ticketId: newTicket.id });

      // 记录审计日志
      await this.logAudit(
        newTicket.id,
        'create',
        null,
        newTicket,
        createdBy
      );

      return this.mapDbTicketToModel(newTicket);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Error creating ticket', { error: errorMessage });
        throw error;
      }
  }

  /**
   * 更新工单
   * @param {string} ticketId - 工单ID
   * @param {Object} updateData - 更新数据
   * @param {string} [updateData.title] - 工单标题
   * @param {string} [updateData.description] - 工单描述
   * @param {string} [updateData.category] - 工单分类
   * @param {string} [updateData.priority] - 工单优先级
   * @param {string} [updateData.status] - 工单状态
   * @param {string} [updateData.assignedTo] - 处理人
   * @param {Array} [updateData.tags] - 标签列表
   * @param {string} userId - 操作用户ID
   * @returns {Promise<Object|null>} 更新后的工单
   */
  async updateTicket(ticketId: string, updateData: { title?: string; description?: string; category?: string; priority?: string; status?: string; assignedTo?: string; tags?: string[] }, userId: string): Promise<any | null> {
    try {
      // 先获取当前工单
      const currentTicket = await this.getTicketById(ticketId);
      if (!currentTicket) {
        return null;
      }

      // 构建更新查询
      let query = 'UPDATE support_tickets SET ';
      const params = [];
      let paramIndex = 1;

      // 处理可更新字段
      const updateFields = {
        title: updateData.title,
        description: updateData.description,
        category: updateData.category,
        priority: updateData.priority,
        status: updateData.status,
        assigned_to: updateData.assignedTo,
        tags: updateData.tags
      };

      const fieldUpdates = [];
      for (const [field, value] of Object.entries(updateFields)) {
        if (value !== undefined) {
          fieldUpdates.push(`${field} = $${paramIndex}`);
          params.push(value);
          paramIndex++;
        }
      }

      // 如果有更新字段
      if (fieldUpdates.length > 0) {
        query += fieldUpdates.join(', ') + ', updated_at = NOW()';
        params.push(ticketId);
        query += ` WHERE id = $${paramIndex} RETURNING *`;

        const result = await pool.query(query, params);
        const updatedTicket = result.rows[0];

        // 记录审计日志
        await this.logAudit(
          ticketId,
          'update',
          currentTicket,
          updatedTicket,
          userId
        );

        logger.info('Ticket updated', { ticketId });
        return this.mapDbTicketToModel(updatedTicket);
      }

      return currentTicket;
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Error updating ticket', { 
          ticketId, 
          error: errorMessage 
        });
        throw error;
      }
  }

  /**
   * 关闭工单
   * @param {string} ticketId - 工单ID
   * @param {string} resolutionNotes - 解决说明
   * @param {string} userId - 操作用户ID
   * @returns {Promise<Object|null>} 关闭后的工单
   */
  async closeTicket(ticketId: string, resolutionNotes: string, userId: string): Promise<any | null> {
    try {
      // 先获取当前工单
      const currentTicket = await this.getTicketById(ticketId);
      if (!currentTicket) {
        return null;
      }

      const query = `
        UPDATE support_tickets
        SET status = 'closed',
            resolution_notes = $1,
            resolved_at = NOW(),
            updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `;

      const result = await pool.query(query, [resolutionNotes, ticketId]);
      const closedTicket = result.rows[0];

      // 记录审计日志
      await this.logAudit(
        ticketId,
        'close',
        currentTicket,
        closedTicket,
        userId
      );

      logger.info('Ticket closed', { ticketId });
      return this.mapDbTicketToModel(closedTicket);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Error closing ticket', { 
          ticketId, 
          error: errorMessage 
        });
        throw error;
      }
  }

  /**
   * 分配工单
   * @param {string} ticketId - 工单ID
   * @param {string} assigneeId - 处理人ID
   * @param {string} userId - 操作用户ID
   * @returns {Promise<Object|null>} 分配后的工单
   */
  async assignTicket(ticketId: string, assigneeId: string, userId: string): Promise<any | null> {
    try {
      // 先获取当前工单
      const currentTicket = await this.getTicketById(ticketId);
      if (!currentTicket) {
        return null;
      }

      const query = `
        UPDATE support_tickets
        SET assigned_to = $1,
            updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `;

      const result = await pool.query(query, [assigneeId, ticketId]);
      const assignedTicket = result.rows[0];

      // 记录审计日志
      await this.logAudit(
        ticketId,
        'assign',
        { assigned_to: currentTicket.assigned_to },
        { assigned_to: assigneeId },
        userId
      );

      logger.info('Ticket assigned', { ticketId, assigneeId });
      return this.mapDbTicketToModel(assignedTicket);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Error assigning ticket', { 
          ticketId, 
          assigneeId, 
          error: errorMessage 
        });
        throw error;
      }
  }

  /**
   * 添加工单消息
   * @param {string} ticketId - 工单ID
   * @param {Object} messageData - 消息数据
   * @param {string} messageData.content - 消息内容
   * @param {string} messageData.sender - 发送者ID
   * @param {string} messageData.senderName - 发送者名称
   * @param {boolean} [messageData.isInternal=false] - 是否内部消息
   * @param {Array} [messageData.attachments=[]] - 附件列表
   * @returns {Promise<Object>} 创建的消息
   */
  async addTicketMessage(ticketId: string, messageData: { content: string; sender: string; senderName: string; isInternal?: boolean; attachments?: any[] }): Promise<any> {
    try {
      // 检查工单是否存在
      const ticket = await this.getTicketById(ticketId);
      if (!ticket) {
        throw new Error('Ticket not found');
      }

      const {
        content,
        sender,
        senderName,
        isInternal = false,
        attachments = []
      } = messageData;

      const query = `
        INSERT INTO ticket_messages (
          ticket_id,
          content,
          sender,
          sender_name,
          is_internal,
          attachments
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const result = await pool.query(query, [
        ticketId,
        content,
        sender,
        senderName,
        isInternal,
        attachments
      ]);

      const newMessage = result.rows[0];
      logger.info('Message added to ticket', { ticketId, messageId: newMessage.id });

      return this.mapDbMessageToModel(newMessage);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Error adding message to ticket', { 
          ticketId, 
          error: errorMessage 
        });
        throw error;
      }
  }

  /**
   * 获取工单统计数据
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Object>} 统计数据
   */
  async getTicketStats(filters: { startDate?: string; endDate?: string } = {}): Promise<any> {
    try {
      // 按状态统计
      const statusQuery = `
        SELECT status, COUNT(*) as count
        FROM support_tickets
        WHERE 1=1
      `;

      // 按优先级统计
      const priorityQuery = `
        SELECT priority, COUNT(*) as count
        FROM support_tickets
        WHERE 1=1
      `;

      // 添加共同过滤条件
      let whereClause = '';
      const params = [];

      if (filters.startDate && filters.endDate) {
        params.push(filters.startDate, filters.endDate);
        whereClause += ` AND created_at BETWEEN $${params.length - 1} AND $${params.length}`;
      }

      // 执行查询
      const statusResult = await pool.query(statusQuery + whereClause + ' GROUP BY status', params);
      const priorityResult = await pool.query(priorityQuery + whereClause + ' GROUP BY priority', params);

      // 格式化结果
      return {
        byStatus: statusResult.rows.reduce((acc: Record<string, number>, row: any) => {
          acc[row.status] = parseInt(row.count);
          return acc;
        }, {}),
        byPriority: priorityResult.rows.reduce((acc: Record<string, number>, row: any) => {
          acc[row.priority] = parseInt(row.count);
          return acc;
        }, {}),
        total: statusResult.rows.reduce((sum: number, row: any) => sum + parseInt(row.count), 0),
        slaCompliance: this.calculateSlaCompliance(),
      };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Error fetching ticket statistics', { error: errorMessage });
        throw error;
      }
  }

  /**
   * 计算SLA合规率
   * @returns {number} 合规率百分比
   */
  calculateSlaCompliance(): number {
    // 这里应该有复杂的SLA计算逻辑
    // 简化版返回固定值
    return 100;
  }

  /**
   * 私有方法
   */

  /**
   * 获取工单消息列表
   * @param {string} ticketId - 工单ID
   * @returns {Promise<Array>} 消息列表
   */
  async getTicketMessages(ticketId: string): Promise<Array<any>> {
    const query = `
      SELECT * FROM ticket_messages
      WHERE ticket_id = $1
      ORDER BY timestamp ASC
    `;
    const result = await pool.query(query, [ticketId]);
    return result.rows.map(this.mapDbMessageToModel.bind(this));
  }

  /**
   * 生成工单编号
   * @returns {Promise<string>} 工单编号
   */
  async generateTicketNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const query = `
      SELECT COUNT(*) as count 
      FROM support_tickets 
      WHERE ticket_number LIKE $1
    `;
    const result = await pool.query(query, [`TKT-${year}-%`]);
    const count = Number.parseInt(result.rows[0].count) + 1;
    return `TKT-${year}-${String(count).padStart(4, "0")}`;
  }

  /**
   * 计算截止日期
   * @param {string} priority - 优先级
   * @returns {Date} 截止日期
   */
  calculateDueDate(priority: string) {
    const now = new Date();
    const hours = this.getSlaHours(priority);
    return new Date(now.getTime() + hours * 60 * 60 * 1000);
  }

  /**
   * 获取SLA小时数
   * @param {string} priority - 优先级
   * @returns {number} 小时数
   */
  getSlaHours(priority: string): number {
    const slaMap: Record<string, number> = {
      urgent: 4,
      high: 8,
      medium: 24,
      low: 72,
    };
    return slaMap[priority] || 24;
  }

  /**
   * 记录审计日志
   * @param {string} ticketId - 工单ID
   * @param {string} action - 操作类型
   * @param {any} oldValue - 旧值
   * @param {any} newValue - 新值
   * @param {string} userId - 用户ID
   * @returns {Promise<void>}
   */
  async logAudit(ticketId: string, action: string, oldValue: any, newValue: any, userId: string): Promise<void> {
    const query = `
      INSERT INTO ticket_audit_log (
        ticket_id, action, old_value, new_value, performed_by
      ) VALUES ($1, $2, $3, $4, $5)
    `;
    await pool.query(query, [ticketId, action, JSON.stringify(oldValue), JSON.stringify(newValue), userId]);
  }

  /**
   * 将数据库行映射为模型
   * @param {Object} row - 数据库行
   * @param {Array} [messages=[]] - 消息列表
   * @returns {Object} 模型对象
   */
  mapDbTicketToModel(row: any, messages: Array<any> = []): any {
    return {
      id: row.id,
      ticketNumber: row.ticket_number,
      title: row.title,
      description: row.description,
      category: row.category,
      priority: row.priority,
      status: row.status,
      createdBy: row.created_by || 'system',
      assignedTo: row.assigned_to,
      customerName: row.customer_name,
      customerEmail: row.customer_email,
      customerPhone: row.customer_phone,
      tags: row.tags || [],
      slaDeadline: row.due_date,
      resolvedAt: row.resolved_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * 将数据库行映射为消息模型
   * @param {Object} row - 数据库行
   * @returns {Object} 消息模型
   */
  mapDbMessageToModel(row: any): any {
    return {
      id: row.id,
      ticketId: row.ticket_id,
      content: row.content,
      authorId: row.sender,
      authorName: row.sender_name,
      isInternal: row.is_internal,
      attachments: row.attachments,
      createdAt: row.timestamp,
    };
  }
}
