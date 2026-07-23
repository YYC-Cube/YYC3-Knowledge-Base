/**
 * 工作流引擎服务
 * 提供完整的工作流执行引擎功能
 */

import { EventEmitter } from "events";
import { v4 as uuidv4 } from "uuid";
import {
  WorkflowDefinition,
  WorkflowInstance,
  WorkflowTask,
  WorkflowHistoryEntry,
  WorkflowComment,
  WorkflowNode,
  WorkflowEdge,
  StartWorkflowRequest,
  CompleteTaskRequest,
  WorkflowError,
  WorkflowErrorCode,
  TaskNodeConfig,
  ApprovalNodeConfig,
  ConditionNodeConfig,
  TimerNodeConfig,
  WebhookNodeConfig,
  ScriptNodeConfig,
} from "../../types/workflow";

export class WorkflowEngineService extends EventEmitter {
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private instances: Map<string, WorkflowInstance> = new Map();
  private tasks: Map<string, WorkflowTask> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    super();
    this.setMaxListeners(0); // 无限制监听器
  }

  /**
   * 启动工作流
   */
  async startWorkflow(
    request: StartWorkflowRequest,
    initiator: string
  ): Promise<WorkflowInstance> {
    try {
      // 1. 获取工作流定义
      const workflowDefinition = await this.getActiveWorkflowDefinition(
        request.workflowId
      );
      if (!workflowDefinition) {
        throw new WorkflowError(
          `工作流定义未找到: ${request.workflowId}`,
          WorkflowErrorCode.WORKFLOW_NOT_FOUND,
          404
        );
      }

      // 2. 验证输入变量
      this.validateWorkflowVariables(
        workflowDefinition,
        request.variables || {}
      );

      // 3. 创建工作流实例
      const instance: WorkflowInstance = {
        id: uuidv4(),
        workflowId: workflowDefinition.id,
        workflowVersion: workflowDefinition.version,
        status: "running",
        startedAt: new Date(),
        startedBy: initiator,
        currentNodeIds: [],
        variables: { ...request.variables },
        history: [],
        metadata: {
          businessKey: request.businessKey,
          priority: request.priority || "medium",
          dueDate: request.dueDate,
        },
      };

      // 4. 保存工作流实例
      this.instances.set(instance.id, instance);

      // 5. 查找开始节点
      const startNode = workflowDefinition.nodes.find(
        (node) => node.type === "start"
      );
      if (!startNode) {
        throw new WorkflowError(
          `工作流中未找到开始节点: ${request.workflowId}`,
          WorkflowErrorCode.INVALID_WORKFLOW_DEFINITION,
          400
        );
      }

      // 6. 添加开始历史记录
      const historyEntry: WorkflowHistoryEntry = {
        id: uuidv4(),
        timestamp: new Date(),
        nodeId: startNode.id,
        nodeName: startNode.name,
        nodeType: startNode.type,
        action: "entered",
        actor: initiator,
      };

      instance.history.push(historyEntry);
      instance.currentNodeIds = [startNode.id];

      // 7. 保存更新后的实例
      this.instances.set(instance.id, instance);

      // 8. 触发工作流启动事件
      this.emit("workflow:started", {
        instanceId: instance.id,
        workflowId: instance.workflowId,
        initiator,
      });

      // 9. 执行后续节点
      await this.progressWorkflow(instance.id, startNode.id, {}, initiator);

      return instance;
    } catch (error) {
      console.error("启动工作流失败:", error);
      throw error;
    }
  }

  /**
   * 推进工作流执行
   */
  async progressWorkflow(
    instanceId: string,
    completedNodeId: string,
    data: any = {},
    actor: string = "system"
  ): Promise<WorkflowInstance> {
    try {
      // 1. 获取工作流实例
      const instance = this.instances.get(instanceId);
      if (!instance) {
        throw new WorkflowError(
          `工作流实例未找到: ${instanceId}`,
          WorkflowErrorCode.INSTANCE_NOT_FOUND,
          404
        );
      }

      if (instance.status !== "running") {
        throw new WorkflowError(
          `无法推进非运行状态的工作流: ${instanceId}, 状态: ${instance.status}`,
          WorkflowErrorCode.INVALID_WORKFLOW_STATUS,
          400
        );
      }

      // 2. 验证节点是否是当前活动节点
      if (!instance.currentNodeIds.includes(completedNodeId)) {
        throw new WorkflowError(
          `节点 ${completedNodeId} 不是工作流 ${instanceId} 的当前活动节点`,
          WorkflowErrorCode.EXECUTION_ERROR,
          400
        );
      }

      // 3. 获取工作流定义
      const workflowDefinition = this.workflows.get(instance.workflowId);
      if (!workflowDefinition) {
        throw new WorkflowError(
          `工作流定义未找到: ${instance.workflowId}`,
          WorkflowErrorCode.WORKFLOW_NOT_FOUND,
          404
        );
      }

      // 4. 获取完成的节点
      const completedNode = workflowDefinition.nodes.find(
        (node) => node.id === completedNodeId
      );
      if (!completedNode) {
        throw new WorkflowError(
          `节点未找到: ${completedNodeId}`,
          WorkflowErrorCode.EXECUTION_ERROR,
          404
        );
      }

      // 5. 添加完成历史记录
      const historyEntry: WorkflowHistoryEntry = {
        id: uuidv4(),
        timestamp: new Date(),
        nodeId: completedNodeId,
        nodeName: completedNode.name,
        nodeType: completedNode.type,
        action: "completed",
        actor,
        data,
      };

      instance.history.push(historyEntry);

      // 6. 更新变量
      if (data && typeof data === "object") {
        instance.variables = {
          ...instance.variables,
          ...data,
        };
      }

      // 7. 从当前节点中移除已完成的节点
      instance.currentNodeIds = instance.currentNodeIds.filter(
        (id) => id !== completedNodeId
      );

      // 8. 查找下一个节点
      const outgoingEdges = workflowDefinition.edges.filter(
        (edge) => edge.sourceNodeId === completedNodeId
      );

      if (outgoingEdges.length === 0) {
        // 如果没有出口，且没有其他活动节点，则工作流完成
        if (instance.currentNodeIds.length === 0) {
          instance.status = "completed";
          instance.completedAt = new Date();

          // 添加工作流完成历史
          const completeHistoryEntry: WorkflowHistoryEntry = {
            id: uuidv4(),
            timestamp: new Date(),
            nodeId: "workflow",
            nodeName: "Workflow",
            nodeType: "workflow",
            action: "completed",
            actor,
          };

          instance.history.push(completeHistoryEntry);

          // 触发工作流完成事件
          this.emit("workflow:completed", {
            instanceId: instance.id,
            workflowId: instance.workflowId,
          });
        }
      } else {
        // 处理每个出口边
        for (const edge of outgoingEdges) {
          // 评估条件（如果有）
          if (edge.condition) {
            const conditionMet = await this.evaluateCondition(
              edge.condition.expression,
              instance.variables
            );
            if (!conditionMet) {
              continue; // 条件不满足，跳过此边
            }
          }

          // 获取目标节点
          const targetNode = workflowDefinition.nodes.find(
            (node) => node.id === edge.targetNodeId
          );
          if (!targetNode) {
            console.error(`目标节点未找到: ${edge.targetNodeId}`);
            continue;
          }

          // 添加目标节点进入历史
          const enterHistoryEntry: WorkflowHistoryEntry = {
            id: uuidv4(),
            timestamp: new Date(),
            nodeId: targetNode.id,
            nodeName: targetNode.name,
            nodeType: targetNode.type,
            action: "entered",
            actor,
          };

          instance.history.push(enterHistoryEntry);

          // 将目标节点添加到当前节点列表
          instance.currentNodeIds.push(targetNode.id);

          // 根据节点类型执行相应操作
          await this.executeNode(instance, targetNode, actor);
        }
      }

      // 9. 保存更新后的实例
      this.instances.set(instance.id, instance);

      return instance;
    } catch (error) {
      console.error("推进工作流失败:", error);
      throw error;
    }
  }

  /**
   * 执行节点
   */
  private async executeNode(
    instance: WorkflowInstance,
    node: WorkflowNode,
    actor: string
  ): Promise<void> {
    switch (node.type) {
      case "end":
        // 结束节点 - 如果没有其他活动节点，则完成工作流
        if (instance.currentNodeIds.length === 1) {
          instance.status = "completed";
          instance.completedAt = new Date();

          // 触发工作流完成事件
          this.emit("workflow:completed", {
            instanceId: instance.id,
            workflowId: instance.workflowId,
          });
        }
        break;

      case "task":
        // 任务节点 - 创建任务
        await this.createWorkflowTask(instance, node);
        break;

      case "approval":
        // 审批节点 - 创建审批任务
        await this.createApprovalTask(instance, node);
        break;

      case "condition":
        // 条件节点 - 自动执行条件评估并继续
        await this.handleConditionNode(instance, node, actor);
        break;

      case "parallel":
        // 并行节点 - 创建多个分支
        await this.handleParallelNode(instance, node, actor);
        break;

      case "gateway":
        // 网关节点 - 根据配置汇聚或分流
        await this.handleGatewayNode(instance, node, actor);
        break;

      case "timer":
        // 定时器节点 - 设置延时执行
        await this.scheduleTimerNode(instance, node, actor);
        break;

      case "webhook":
        // Webhook节点 - 调用外部API
        await this.executeWebhookNode(instance, node, actor);
        break;

      case "script":
        // 脚本节点 - 执行脚本
        await this.executeScriptNode(instance, node, actor);
        break;

      case "custom":
        // 自定义节点 - 调用自定义处理器
        await this.executeCustomNode(instance, node, actor);
        break;

      default:
        console.warn(`未处理的节点类型: ${node.type}`);
        // 自动完成未知类型节点
        await this.progressWorkflow(instance.id, node.id, {}, actor);
    }
  }

  /**
   * 创建工作流任务
   */
  private async createWorkflowTask(
    instance: WorkflowInstance,
    node: WorkflowNode
  ): Promise<void> {
    const config = node.config as TaskNodeConfig;

    const task: WorkflowTask = {
      id: uuidv4(),
      instanceId: instance.id,
      nodeId: node.id,
      nodeName: node.name,
      status: "pending",
      assignees: config.assignees || [],
      assigneeType: config.assigneeType || "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      dueDate: config.timeout
        ? new Date(Date.now() + config.timeout * 1000)
        : undefined,
      priority: (instance.metadata?.priority as any) || "medium",
      formData: {},
      comments: [],
      metadata: {
        formType: config.formType,
        formSchema: config.formSchema,
        autoComplete: config.autoComplete,
      },
    };

    this.tasks.set(task.id, task);

    // 触发任务创建事件
    this.emit("task:created", {
      taskId: task.id,
      instanceId: instance.id,
      nodeId: node.id,
    });
  }

  /**
   * 创建审批任务
   */
  private async createApprovalTask(
    instance: WorkflowInstance,
    node: WorkflowNode
  ): Promise<void> {
    const config = node.config as ApprovalNodeConfig;

    const task: WorkflowTask = {
      id: uuidv4(),
      instanceId: instance.id,
      nodeId: node.id,
      nodeName: node.name,
      status: "pending",
      assignees: config.assignees || [],
      assigneeType: config.assigneeType || "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      dueDate: config.timeout
        ? new Date(Date.now() + config.timeout * 1000)
        : undefined,
      priority: (instance.metadata?.priority as any) || "medium",
      formData: {},
      comments: [],
      metadata: {
        approvalType: config.approvalType,
        passCondition: config.passCondition,
      },
    };

    this.tasks.set(task.id, task);

    // 触发任务创建事件
    this.emit("task:created", {
      taskId: task.id,
      instanceId: instance.id,
      nodeId: node.id,
    });
  }

  /**
   * 处理条件节点
   */
  private async handleConditionNode(
    instance: WorkflowInstance,
    node: WorkflowNode,
    actor: string
  ): Promise<void> {
    const config = node.config as ConditionNodeConfig;

    for (const condition of config.conditions) {
      const conditionMet = await this.evaluateCondition(
        condition.expression,
        instance.variables
      );
      if (conditionMet) {
        // 找到满足的条件，继续执行目标节点
        await this.progressWorkflow(
          instance.id,
          node.id,
          { conditionResult: condition.description },
          actor
        );
        return;
      }
    }

    // 如果没有条件满足，执行默认节点
    if (config.defaultNodeId) {
      await this.progressWorkflow(
        instance.id,
        node.id,
        { conditionResult: "default" },
        actor
      );
    } else {
      // 没有默认节点，自动完成
      await this.progressWorkflow(
        instance.id,
        node.id,
        { conditionResult: "none" },
        actor
      );
    }
  }

  /**
   * 处理并行节点
   */
  private async handleParallelNode(
    instance: WorkflowInstance,
    node: WorkflowNode,
    actor: string
  ): Promise<void> {
    // 并行节点自动完成，让工作流引擎处理多个出口
    await this.progressWorkflow(instance.id, node.id, {}, actor);
  }

  /**
   * 处理网关节点
   */
  private async handleGatewayNode(
    instance: WorkflowInstance,
    node: WorkflowNode,
    actor: string
  ): Promise<void> {
    // 网关节点自动完成，用于汇聚多个分支
    await this.progressWorkflow(instance.id, node.id, {}, actor);
  }

  /**
   * 调度定时器节点
   */
  private async scheduleTimerNode(
    instance: WorkflowInstance,
    node: WorkflowNode,
    actor: string
  ): Promise<void> {
    const config = node.config as TimerNodeConfig;

    let delay = 0;
    if (config.delayType === "fixed") {
      delay = config.delay || 0;
    } else if (config.delayType === "expression") {
      // 计算表达式结果
      delay = await this.evaluateExpression(
        config.delayExpression || "0",
        instance.variables
      );
    }

    const timer = setTimeout(async () => {
      await this.progressWorkflow(
        instance.id,
        node.id,
        { delaySeconds: delay },
        actor
      );
      this.timers.delete(`${instance.id}_${node.id}`);
    }, delay * 1000);

    this.timers.set(`${instance.id}_${node.id}`, timer);
  }

  /**
   * 执行Webhook节点
   */
  private async executeWebhookNode(
    instance: WorkflowInstance,
    node: WorkflowNode,
    actor: string
  ): Promise<void> {
    const config = node.config as WebhookNodeConfig;

    try {
      // 这里应该实现实际的HTTP请求
      const response = await this.makeHttpRequest(config, instance.variables);
      await this.progressWorkflow(
        instance.id,
        node.id,
        { webhookResponse: response },
        actor
      );
    } catch (error) {
      console.error("Webhook执行失败:", error);
      await this.progressWorkflow(
        instance.id,
        node.id,
        { webhookError: (error as Error).message },
        actor
      );
    }
  }

  /**
   * 执行脚本节点
   */
  private async executeScriptNode(
    instance: WorkflowInstance,
    node: WorkflowNode,
    actor: string
  ): Promise<void> {
    const config = node.config as ScriptNodeConfig;

    try {
      // 这里应该实现实际的脚本执行
      const result = await this.executeScript(config, instance.variables);
      await this.progressWorkflow(
        instance.id,
        node.id,
        { scriptResult: result },
        actor
      );
    } catch (error) {
      console.error("脚本执行失败:", error);
      await this.progressWorkflow(
        instance.id,
        node.id,
        { scriptError: (error as Error).message },
        actor
      );
    }
  }

  /**
   * 执行自定义节点
   */
  private async executeCustomNode(
    instance: WorkflowInstance,
    node: WorkflowNode,
    actor: string
  ): Promise<void> {
    // 这里应该调用自定义节点处理器
    await this.progressWorkflow(instance.id, node.id, {}, actor);
  }

  /**
   * 完成工作流任务
   */
  async completeWorkflowTask(
    taskId: string,
    request: CompleteTaskRequest,
    actor: string
  ): Promise<WorkflowTask> {
    try {
      // 1. 获取任务
      const task = this.tasks.get(taskId);
      if (!task) {
        throw new WorkflowError(
          `任务未找到: ${taskId}`,
          WorkflowErrorCode.TASK_NOT_FOUND,
          404
        );
      }

      // 2. 验证任务状态
      if (task.status !== "pending" && task.status !== "in_progress") {
        throw new WorkflowError(
          `无法完成状态为 ${task.status} 的任务`,
          WorkflowErrorCode.INVALID_TASK_STATUS,
          400
        );
      }

      // 3. 更新任务状态
      task.status = request.action === "complete" ? "completed" : "rejected";
      task.updatedAt = new Date();

      // 4. 添加评论（如果有）
      if (request.comment) {
        const newComment: WorkflowComment = {
          id: uuidv4(),
          taskId: task.id,
          userId: actor,
          content: request.comment,
          timestamp: new Date(),
        };

        if (!task.comments) {
          task.comments = [];
        }

        task.comments.push(newComment);
      }

      // 5. 保存任务更新
      this.tasks.set(task.id, task);

      // 6. 推进工作流
      if (request.action === "complete") {
        // 成功完成任务，继续工作流
        await this.progressWorkflow(
          task.instanceId,
          task.nodeId,
          request.data || {},
          actor
        );
      } else {
        // 拒绝任务，需要特殊处理
        await this.handleTaskRejection(
          task.instanceId,
          task.nodeId,
          request.data || {},
          actor
        );
      }

      // 7. 触发任务完成事件
      this.emit(
        `task:${request.action === "complete" ? "completed" : "rejected"}`,
        {
          taskId: task.id,
          instanceId: task.instanceId,
          nodeId: task.nodeId,
          actor,
        }
      );

      return task;
    } catch (error) {
      console.error("完成工作流任务失败:", error);
      throw error;
    }
  }

  /**
   * 处理任务拒绝
   */
  private async handleTaskRejection(
    instanceId: string,
    nodeId: string,
    data: any,
    actor: string
  ): Promise<void> {
    // 默认处理：标记工作流为失败
    const instance = this.instances.get(instanceId);
    if (instance) {
      instance.status = "failed";
      instance.completedAt = new Date();

      // 添加失败历史记录
      const historyEntry: WorkflowHistoryEntry = {
        id: uuidv4(),
        timestamp: new Date(),
        nodeId,
        nodeName: "Task Rejected",
        nodeType: "rejection",
        action: "failed",
        actor,
        data,
      };

      instance.history.push(historyEntry);
      this.instances.set(instanceId, instance);

      // 触发工作流失败事件
      this.emit("workflow:failed", {
        instanceId: instance.id,
        workflowId: instance.workflowId,
        error: "Task rejected",
      });
    }
  }

  /**
   * 获取活动的工作流定义
   */
  private async getActiveWorkflowDefinition(
    workflowId: string
  ): Promise<WorkflowDefinition | null> {
    const workflow = this.workflows.get(workflowId);
    return workflow && workflow.status === "active" ? workflow : null;
  }

  /**
   * 验证工作流变量
   */
  private validateWorkflowVariables(
    workflow: WorkflowDefinition,
    variables: Record<string, any>
  ): void {
    for (const variable of workflow.variables) {
      if (variable.required && !(variable.name in variables)) {
        throw new WorkflowError(
          `必需的变量缺失: ${variable.name}`,
          WorkflowErrorCode.VALIDATION_ERROR,
          400
        );
      }
    }
  }

  /**
   * 评估条件表达式
   */
  private async evaluateCondition(
    expression: string,
    variables: Record<string, any>
  ): Promise<boolean> {
    try {
      // 简单的表达式评估，实际应用中应该使用更安全的表达式引擎
      const func = new Function("data", `with(data) { return ${expression}; }`);
      return !!func(variables);
    } catch (error) {
      console.error("条件评估失败:", error);
      return false;
    }
  }

  /**
   * 评估表达式
   */
  private async evaluateExpression(
    expression: string,
    variables: Record<string, any>
  ): Promise<any> {
    try {
      const func = new Function("data", `with(data) { return ${expression}; }`);
      return func(variables);
    } catch (error) {
      console.error("表达式评估失败:", error);
      return null;
    }
  }

  /**
   * 发送HTTP请求
   */
  private async makeHttpRequest(
    config: WebhookNodeConfig,
    variables: Record<string, any>
  ): Promise<any> {
    // 这里应该实现实际的HTTP请求逻辑
    console.log("发送HTTP请求:", config.url, config.method);
    return { status: "success", data: "mock response" };
  }

  /**
   * 执行脚本
   */
  private async executeScript(
    config: ScriptNodeConfig,
    variables: Record<string, any>
  ): Promise<any> {
    // 这里应该实现实际的脚本执行逻辑
    console.log("执行脚本:", config.language, config.script);
    return { status: "success", result: "mock result" };
  }

  // 公共方法：工作流定义管理
  async saveWorkflowDefinition(workflow: WorkflowDefinition): Promise<void> {
    this.workflows.set(workflow.id, workflow);
  }

  async getWorkflowDefinition(id: string): Promise<WorkflowDefinition | null> {
    return this.workflows.get(id) || null;
  }

  async listWorkflowDefinitions(): Promise<WorkflowDefinition[]> {
    return Array.from(this.workflows.values());
  }

  // 公共方法：工作流实例管理
  async getWorkflowInstance(id: string): Promise<WorkflowInstance | null> {
    return this.instances.get(id) || null;
  }

  async listWorkflowInstances(): Promise<WorkflowInstance[]> {
    return Array.from(this.instances.values());
  }

  // 公共方法：任务管理
  async getWorkflowTask(id: string): Promise<WorkflowTask | null> {
    return this.tasks.get(id) || null;
  }

  async listWorkflowTasks(): Promise<WorkflowTask[]> {
    return Array.from(this.tasks.values());
  }

  async getTasksByAssignee(assignee: string): Promise<WorkflowTask[]> {
    return Array.from(this.tasks.values()).filter((task) =>
      task.assignees.includes(assignee)
    );
  }

  // 清理方法
  async cleanup(): Promise<void> {
    // 清理定时器
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();

    // 清理事件监听器
    this.removeAllListeners();
  }
}
