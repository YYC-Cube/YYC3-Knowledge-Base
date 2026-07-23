/**
 * 工作流引擎类型定义
 * 提供完整的工作流定义、实例、任务和历史记录类型
 */

// 工作流定义
export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  version: number;
  status: "draft" | "active" | "deprecated";
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables: WorkflowVariable[];
  metadata?: Record<string, any>;
}

// 工作流节点
export interface WorkflowNode {
  id: string;
  type:
    | "start"
    | "end"
    | "task"
    | "approval"
    | "condition"
    | "parallel"
    | "gateway"
    | "timer"
    | "webhook"
    | "script"
    | "custom";
  name: string;
  description?: string;
  config: Record<string, any>;
  position?: { x: number; y: number };
  metadata?: Record<string, any>;
}

// 工作流连线
export interface WorkflowEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  condition?: {
    expression: string;
    description?: string;
  };
  metadata?: Record<string, any>;
}

// 工作流变量
export interface WorkflowVariable {
  id: string;
  name: string;
  type: "string" | "number" | "boolean" | "date" | "array" | "object";
  defaultValue?: any;
  required: boolean;
  description?: string;
  metadata?: Record<string, any>;
}

// 工作流状态类型
export type WorkflowStatus = "running" | "completed" | "failed" | "canceled" | "suspended";

// 工作流实例
export interface WorkflowInstance {
  id: string;
  workflowId: string;
  workflowVersion: number;
  status: "running" | "completed" | "failed" | "canceled" | "suspended";
  startedAt: Date;
  completedAt?: Date;
  startedBy: string;
  currentNodeIds: string[];
  variables: Record<string, any>;
  history: WorkflowHistoryEntry[];
  metadata?: Record<string, any>;
}

// 工作流历史记录
export interface WorkflowHistoryEntry {
  id: string;
  timestamp: Date;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  action: "entered" | "completed" | "failed" | "skipped" | "rejected";
  actor?: string;
  comment?: string;
  data?: any;
}

// 工作流任务
export interface WorkflowTask {
  id: string;
  instanceId: string;
  nodeId: string;
  nodeName: string;
  status: "pending" | "in_progress" | "completed" | "rejected" | "canceled";
  assignees: string[];
  assigneeType: "user" | "role" | "department" | "dynamic";
  createdAt: Date;
  updatedAt: Date;
  dueDate?: Date;
  priority: "low" | "medium" | "high" | "urgent";
  formData?: Record<string, any>;
  comments?: WorkflowComment[];
  metadata?: Record<string, any>;
}

// 工作流评论
export interface WorkflowComment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  timestamp: Date;
  attachments?: WorkflowAttachment[];
}

// 工作流附件
export interface WorkflowAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: Date;
  createdBy: string;
}

// 工作流节点配置接口
export interface TaskNodeConfig {
  formType?: "simple" | "advanced" | "dynamic" | "custom";
  formSchema?: any;
  assigneeType: "user" | "role" | "department" | "dynamic";
  assignees: string[];
  autoComplete?: boolean;
  timeout?: number;
  escalationRules?: EscalationRule[];
}

export interface ApprovalNodeConfig {
  approvalType: "single" | "sequential" | "parallel" | "majority";
  assigneeType: "user" | "role" | "department" | "dynamic";
  assignees: string[];
  passCondition?: "all" | "majority" | "any";
  timeout?: number;
  escalationRules?: EscalationRule[];
}

export interface ConditionNodeConfig {
  conditions: {
    expression: string;
    targetNodeId: string;
    description?: string;
  }[];
  defaultNodeId?: string;
}

export interface TimerNodeConfig {
  delayType: "fixed" | "expression";
  delay?: number; // 秒
  delayExpression?: string;
  timezone?: string;
}

export interface WebhookNodeConfig {
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
  authentication?: {
    type: "none" | "basic" | "bearer" | "apikey";
    credentials?: Record<string, string>;
  };
}

export interface ScriptNodeConfig {
  language: "javascript" | "python" | "shell";
  script: string;
  timeout?: number;
  environment?: Record<string, string>;
}

// 升级规则
export interface EscalationRule {
  id: string;
  condition: string; // 触发条件，如超时
  action: "notify" | "reassign" | "skip";
  target: string[]; // 通知或重新分配的目标
  delay: number; // 延迟时间（秒）
}

// API 请求类型
export interface CreateWorkflowDefinitionRequest {
  name: string;
  description?: string;
  nodes: Omit<WorkflowNode, "id">[];
  edges: Omit<WorkflowEdge, "id">[];
  variables?: Omit<WorkflowVariable, "id">[];
}

export interface StartWorkflowRequest {
  workflowId: string;
  variables?: Record<string, any>;
  businessKey?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  dueDate?: Date;
}

export interface CompleteTaskRequest {
  action: "complete" | "reject";
  data?: any;
  comment?: string;
}

// API 响应类型
export interface WorkflowListResponse {
  data: WorkflowDefinition[];
  total: number;
  page: number;
  limit: number;
}

export interface WorkflowInstanceListResponse {
  data: WorkflowInstance[];
  total: number;
  page: number;
  limit: number;
}

export interface WorkflowTaskListResponse {
  data: WorkflowTask[];
  total: number;
  page: number;
  limit: number;
}

// 工作流统计信息
export interface WorkflowStatistics {
  totalWorkflows: number;
  activeInstances: number;
  completedToday: number;
  pendingTasks: number;
  avgCompletionTime: number;
  successRate: number;
}

// 工作流引擎事件
export type WorkflowEvent =
  | {
      type: "workflow:started";
      payload: { instanceId: string; workflowId: string; initiator: string };
    }
  | {
      type: "workflow:completed";
      payload: { instanceId: string; workflowId: string };
    }
  | {
      type: "workflow:failed";
      payload: { instanceId: string; workflowId: string; error: string };
    }
  | {
      type: "task:created";
      payload: { taskId: string; instanceId: string; nodeId: string };
    }
  | {
      type: "task:completed";
      payload: {
        taskId: string;
        instanceId: string;
        nodeId: string;
        actor: string;
      };
    }
  | {
      type: "task:rejected";
      payload: {
        taskId: string;
        instanceId: string;
        nodeId: string;
        actor: string;
      };
    };

// 工作流错误代码
export enum WorkflowErrorCode {
  WORKFLOW_NOT_FOUND = "WORKFLOW_NOT_FOUND",
  INSTANCE_NOT_FOUND = "INSTANCE_NOT_FOUND",
  TASK_NOT_FOUND = "TASK_NOT_FOUND",
  INVALID_WORKFLOW_DEFINITION = "INVALID_WORKFLOW_DEFINITION",
  INVALID_WORKFLOW_STATUS = "INVALID_WORKFLOW_STATUS",
  INVALID_TASK_STATUS = "INVALID_TASK_STATUS",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  EXECUTION_ERROR = "EXECUTION_ERROR",
}

// 工作流错误
export class WorkflowError extends Error {
  constructor(
    message: string,
    public code: WorkflowErrorCode,
    public statusCode: number = 400,
    public details?: any
  ) {
    super(message);
    this.name = "WorkflowError";
  }
}
