/**
 * 工作流API路由
 * 提供工作流定义、实例和任务的RESTful接口
 */

import { NextRequest, NextResponse } from "next/server";
import { WorkflowEngineService } from "../../services/workflow/workflow-engine.service";
import {
  WorkflowDefinition,
  CreateWorkflowDefinitionRequest,
  StartWorkflowRequest,
  CompleteTaskRequest,
  WorkflowError,
  WorkflowErrorCode,
} from "../../types/workflow";
import { v4 as uuidv4 } from "uuid";

// 全局工作流引擎实例
const workflowEngine = new WorkflowEngineService();

/**
 * 错误处理中间件
 */
function handleWorkflowError(error: any): NextResponse {
  if (error instanceof WorkflowError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      { status: error.statusCode }
    );
  }

  console.error("未知错误:", error);
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "内部服务器错误",
      },
    },
    { status: 500 }
  );
}

/**
 * 获取用户信息（简化版本）
 */
function getCurrentUser(request: NextRequest): string {
  // 在实际应用中，这里应该从JWT token或session中获取用户信息
  return request.headers.get("x-user-id") || "anonymous";
}

/**
 * 分页参数解析
 */
function getPaginationParams(searchParams: URLSearchParams) {
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 100);
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

// ===========================================
// 工作流定义相关API
// ===========================================

/**
 * 创建工作流定义
 * POST /api/workflow/definitions
 */
export async function createWorkflowDefinition(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const userId = getCurrentUser(request);
    const body: CreateWorkflowDefinitionRequest = await request.json();

    // 验证必填字段
    if (!body.name || !body.nodes || !body.edges) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: WorkflowErrorCode.VALIDATION_ERROR,
            message: "缺少必填字段: name, nodes, edges",
          },
        },
        { status: 400 }
      );
    }

    // 创建工作流定义
    const workflow: WorkflowDefinition = {
      id: uuidv4(),
      name: body.name,
      description: body.description,
      version: 1,
      status: "draft",
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId,
      nodes: body.nodes.map((node) => ({ ...node, id: uuidv4() })),
      edges: body.edges.map((edge) => ({ ...edge, id: uuidv4() })),
      variables: (body.variables || []).map((variable) => ({
        ...variable,
        id: uuidv4(),
      })),
    };

    await workflowEngine.saveWorkflowDefinition(workflow);

    return NextResponse.json({
      success: true,
      data: workflow,
    });
  } catch (error) {
    return handleWorkflowError(error);
  }
}

/**
 * 获取工作流定义列表
 * GET /api/workflow/definitions
 */
export async function getWorkflowDefinitions(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, offset } = getPaginationParams(searchParams);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    let workflows = await workflowEngine.listWorkflowDefinitions();

    // 过滤
    if (status) {
      workflows = workflows.filter((w) => w.status === status);
    }
    if (search) {
      workflows = workflows.filter(
        (w) =>
          w.name.toLowerCase().includes(search.toLowerCase()) ||
          (w.description &&
            w.description.toLowerCase().includes(search.toLowerCase()))
      );
    }

    // 分页
    const total = workflows.length;
    const data = workflows.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleWorkflowError(error);
  }
}

/**
 * 获取工作流定义详情
 * GET /api/workflow/definitions/[id]
 */
export async function getWorkflowDefinition(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const workflow = await workflowEngine.getWorkflowDefinition(params.id);

    if (!workflow) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: WorkflowErrorCode.WORKFLOW_NOT_FOUND,
            message: "工作流定义未找到",
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: workflow,
    });
  } catch (error) {
    return handleWorkflowError(error);
  }
}

/**
 * 更新工作流状态
 * PATCH /api/workflow/definitions/[id]/status
 */
export async function updateWorkflowStatus(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { status } = await request.json();

    if (!["draft", "active", "deprecated"].includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: WorkflowErrorCode.VALIDATION_ERROR,
            message: "无效的状态值",
          },
        },
        { status: 400 }
      );
    }

    const workflow = await workflowEngine.getWorkflowDefinition(params.id);
    if (!workflow) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: WorkflowErrorCode.WORKFLOW_NOT_FOUND,
            message: "工作流定义未找到",
          },
        },
        { status: 404 }
      );
    }

    workflow.status = status;
    workflow.updatedAt = new Date();
    await workflowEngine.saveWorkflowDefinition(workflow);

    return NextResponse.json({
      success: true,
      data: workflow,
    });
  } catch (error) {
    return handleWorkflowError(error);
  }
}

// ===========================================
// 工作流实例相关API
// ===========================================

/**
 * 启动工作流
 * POST /api/workflow/instances
 */
export async function startWorkflowInstance(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const userId = getCurrentUser(request);
    const body: StartWorkflowRequest = await request.json();

    if (!body.workflowId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: WorkflowErrorCode.VALIDATION_ERROR,
            message: "缺少必填字段: workflowId",
          },
        },
        { status: 400 }
      );
    }

    const instance = await workflowEngine.startWorkflow(body, userId);

    return NextResponse.json({
      success: true,
      data: instance,
    });
  } catch (error) {
    return handleWorkflowError(error);
  }
}

/**
 * 获取工作流实例列表
 * GET /api/workflow/instances
 */
export async function getWorkflowInstances(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, offset } = getPaginationParams(searchParams);
    const status = searchParams.get("status");
    const workflowId = searchParams.get("workflowId");
    const initiator = searchParams.get("initiator");

    let instances = await workflowEngine.listWorkflowInstances();

    // 过滤
    if (status) {
      instances = instances.filter((i) => i.status === status);
    }
    if (workflowId) {
      instances = instances.filter((i) => i.workflowId === workflowId);
    }
    if (initiator) {
      instances = instances.filter((i) => i.startedBy === initiator);
    }

    // 排序（最新的在前）
    instances.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

    // 分页
    const total = instances.length;
    const data = instances.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleWorkflowError(error);
  }
}

/**
 * 获取工作流实例详情
 * GET /api/workflow/instances/[id]
 */
export async function getWorkflowInstance(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const instance = await workflowEngine.getWorkflowInstance(params.id);

    if (!instance) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: WorkflowErrorCode.INSTANCE_NOT_FOUND,
            message: "工作流实例未找到",
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: instance,
    });
  } catch (error) {
    return handleWorkflowError(error);
  }
}

// ===========================================
// 工作流任务相关API
// ===========================================

/**
 * 获取工作流任务列表
 * GET /api/workflow/tasks
 */
export async function getWorkflowTasks(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, offset } = getPaginationParams(searchParams);
    const status = searchParams.get("status");
    const assignee = searchParams.get("assignee");
    const priority = searchParams.get("priority");

    let tasks = await workflowEngine.listWorkflowTasks();

    // 过滤
    if (status) {
      const statusList = status.split(",");
      tasks = tasks.filter((t) => statusList.includes(t.status));
    }
    if (assignee) {
      tasks = tasks.filter((t) => t.assignees.includes(assignee));
    }
    if (priority) {
      tasks = tasks.filter((t) => t.priority === priority);
    }

    // 排序（最新的在前）
    tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // 分页
    const total = tasks.length;
    const data = tasks.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleWorkflowError(error);
  }
}

/**
 * 获取工作流任务详情
 * GET /api/workflow/tasks/[id]
 */
export async function getWorkflowTask(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const task = await workflowEngine.getWorkflowTask(params.id);

    if (!task) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: WorkflowErrorCode.TASK_NOT_FOUND,
            message: "工作流任务未找到",
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: task,
    });
  } catch (error) {
    return handleWorkflowError(error);
  }
}

/**
 * 完成工作流任务
 * POST /api/workflow/tasks/[id]/complete
 */
export async function completeWorkflowTask(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const userId = getCurrentUser(request);
    const body: CompleteTaskRequest = await request.json();

    const completedTask = await workflowEngine.completeWorkflowTask(
      params.id,
      { action: "complete", ...body },
      userId
    );

    return NextResponse.json({
      success: true,
      data: completedTask,
    });
  } catch (error) {
    return handleWorkflowError(error);
  }
}

/**
 * 拒绝工作流任务
 * POST /api/workflow/tasks/[id]/reject
 */
export async function rejectWorkflowTask(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const userId = getCurrentUser(request);
    const body: CompleteTaskRequest = await request.json();

    const rejectedTask = await workflowEngine.completeWorkflowTask(
      params.id,
      { action: "reject", ...body },
      userId
    );

    return NextResponse.json({
      success: true,
      data: rejectedTask,
    });
  } catch (error) {
    return handleWorkflowError(error);
  }
}

/**
 * 获取我的任务
 * GET /api/workflow/tasks/my
 */
export async function getMyTasks(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = getCurrentUser(request);
    const { searchParams } = new URL(request.url);
    const { page, limit, offset } = getPaginationParams(searchParams);
    const status = searchParams.get("status");

    let tasks = await workflowEngine.getTasksByAssignee(userId);

    // 过滤
    if (status) {
      const statusList = status.split(",");
      tasks = tasks.filter((t) => statusList.includes(t.status));
    }

    // 排序（最新的在前）
    tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // 分页
    const total = tasks.length;
    const data = tasks.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleWorkflowError(error);
  }
}

// ===========================================
// 工作流统计API
// ===========================================

/**
 * 获取工作流统计信息
 * GET /api/workflow/statistics
 */
export async function getWorkflowStatistics(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const workflows = await workflowEngine.listWorkflowDefinitions();
    const instances = await workflowEngine.listWorkflowInstances();
    const tasks = await workflowEngine.listWorkflowTasks();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const statistics = {
      totalWorkflows: workflows.length,
      activeInstances: instances.filter((i) => i.status === "running").length,
      completedToday: instances.filter(
        (i) =>
          i.status === "completed" && i.completedAt && i.completedAt >= today
      ).length,
      pendingTasks: tasks.filter((t) => t.status === "pending").length,
      avgCompletionTime: 0, // 计算平均完成时间
      successRate: 0, // 计算成功率
    };

    // 计算平均完成时间
    const completedInstances = instances.filter(
      (i) => i.status === "completed" && i.completedAt
    );
    if (completedInstances.length > 0) {
      const totalTime = completedInstances.reduce((sum, instance) => {
        return (
          sum + (instance.completedAt!.getTime() - instance.startedAt.getTime())
        );
      }, 0);
      statistics.avgCompletionTime = Math.round(
        totalTime / completedInstances.length / 1000 / 60
      ); // 分钟
    }

    // 计算成功率
    const finishedInstances = instances.filter(
      (i) =>
        i.status === "completed" ||
        i.status === "failed" ||
        i.status === "canceled"
    );
    if (finishedInstances.length > 0) {
      const successfulInstances = instances.filter(
        (i) => i.status === "completed"
      ).length;
      statistics.successRate = Math.round(
        (successfulInstances / finishedInstances.length) * 100
      );
    }

    return NextResponse.json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    return handleWorkflowError(error);
  }
}

// 导出所有API函数
export const workflowAPI = {
  // 工作流定义
  createWorkflowDefinition,
  getWorkflowDefinitions,
  getWorkflowDefinition,
  updateWorkflowStatus,

  // 工作流实例
  startWorkflowInstance,
  getWorkflowInstances,
  getWorkflowInstance,

  // 工作流任务
  getWorkflowTasks,
  getWorkflowTask,
  completeWorkflowTask,
  rejectWorkflowTask,
  getMyTasks,

  // 统计
  getWorkflowStatistics,

  // 工作流引擎实例
  workflowEngine,
};
