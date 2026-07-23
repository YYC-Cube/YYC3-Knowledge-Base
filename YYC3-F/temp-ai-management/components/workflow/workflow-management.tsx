/**
 * 工作流管理页面
 * 集成工作流设计器、实例管理和任务处理功能
 */

"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  Plus,
  Search,
  Filter,
  Play,
  Pause,
  Eye,
  Edit,
  Trash2,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  Settings,
  Users,
  FileText,
  GitBranch,
  Activity,
} from "lucide-react";

import { WorkflowDesigner } from "./workflow-designer";
import { ApprovalTasks } from "./approval-tasks";
import {
  WorkflowDefinition,
  WorkflowInstance,
  WorkflowStatistics,
  CreateWorkflowDefinitionRequest,
  StartWorkflowRequest,
} from "@/types/workflow";

interface WorkflowManagementProps {
  userId: string;
  className?: string;
}

export function WorkflowManagement({
  userId,
  className = "",
}: WorkflowManagementProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [instances, setInstances] = useState<WorkflowInstance[]>([]);
  const [statistics, setStatistics] = useState<WorkflowStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // 对话框状态
  const [isDesignerOpen, setIsDesignerOpen] = useState(false);
  const [isStartWorkflowOpen, setIsStartWorkflowOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] =
    useState<WorkflowDefinition | null>(null);
  const [selectedWorkflowForStart, setSelectedWorkflowForStart] =
    useState<WorkflowDefinition | null>(null);

  // 获取工作流列表
  const fetchWorkflows = async () => {
    try {
      const response = await fetch("/api/workflow/definitions");
      if (response.ok) {
        const data = await response.json();
        setWorkflows(data.data || []);
      }
    } catch (error) {
      console.error("获取工作流列表失败:", error);
    }
  };

  // 获取工作流实例
  const fetchInstances = async () => {
    try {
      const response = await fetch("/api/workflow/instances?limit=20");
      if (response.ok) {
        const data = await response.json();
        setInstances(data.data || []);
      }
    } catch (error) {
      console.error("获取工作流实例失败:", error);
    }
  };

  // 获取统计信息
  const fetchStatistics = async () => {
    try {
      const response = await fetch("/api/workflow/statistics");
      if (response.ok) {
        const data = await response.json();
        setStatistics(data.data);
      }
    } catch (error) {
      console.error("获取统计信息失败:", error);
    }
  };

  // 初始化数据
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchWorkflows(),
        fetchInstances(),
        fetchStatistics(),
      ]);
      setLoading(false);
    };

    loadData();
  }, []);

  // 创建/保存工作流
  const saveWorkflow = async (workflowData: Partial<WorkflowDefinition>) => {
    try {
      const isEdit = !!editingWorkflow;
      const url = isEdit
        ? `/api/workflow/definitions/${editingWorkflow.id}`
        : "/api/workflow/definitions";

      const method = isEdit ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": userId,
        },
        body: JSON.stringify(workflowData),
      });

      if (response.ok) {
        toast.success(isEdit ? "工作流已更新" : "工作流已创建");
        setIsDesignerOpen(false);
        setEditingWorkflow(null);
        await fetchWorkflows();
      } else {
        const data = await response.json();
        toast.error(data.error?.message || "保存失败");
      }
    } catch (error) {
      console.error("保存工作流失败:", error);
      toast.error("保存失败");
    }
  };

  // 启动工作流
  const startWorkflow = async (
    workflowId: string,
    variables: Record<string, any> = {}
  ) => {
    try {
      const request: StartWorkflowRequest = {
        workflowId,
        variables,
        priority: "medium",
      };

      const response = await fetch("/api/workflow/instances", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": userId,
        },
        body: JSON.stringify(request),
      });

      if (response.ok) {
        toast.success("工作流已启动");
        setIsStartWorkflowOpen(false);
        await fetchInstances();
        await fetchStatistics();
      } else {
        const data = await response.json();
        toast.error(data.error?.message || "启动失败");
      }
    } catch (error) {
      console.error("启动工作流失败:", error);
      toast.error("启动失败");
    }
  };

  // 更新工作流状态
  const updateWorkflowStatus = async (workflowId: string, status: string) => {
    try {
      const response = await fetch(
        `/api/workflow/definitions/${workflowId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-User-Id": userId,
          },
          body: JSON.stringify({ status }),
        }
      );

      if (response.ok) {
        toast.success("状态已更新");
        await fetchWorkflows();
      } else {
        const data = await response.json();
        toast.error(data.error?.message || "更新失败");
      }
    } catch (error) {
      console.error("更新状态失败:", error);
      toast.error("更新失败");
    }
  };

  // 过滤工作流
  const filteredWorkflows = workflows.filter((workflow) => {
    const matchesSearch =
      workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (workflow.description &&
        workflow.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus =
      statusFilter === "all" || workflow.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // 过滤实例
  const filteredInstances = instances.filter((instance) => {
    const matchesSearch =
      instance.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      instance.workflowId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || instance.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // 获取状态徽章
  const getStatusBadge = (
    status: string,
    type: "workflow" | "instance" = "workflow"
  ) => {
    const configs = {
      workflow: {
        draft: { label: "草稿", variant: "secondary" as const },
        active: { label: "活跃", variant: "default" as const },
        deprecated: { label: "已弃用", variant: "outline" as const },
      },
      instance: {
        running: { label: "运行中", variant: "default" as const },
        completed: { label: "已完成", variant: "default" as const },
        failed: { label: "失败", variant: "destructive" as const },
        canceled: { label: "已取消", variant: "outline" as const },
        suspended: { label: "暂停", variant: "secondary" as const },
      },
    };

    const config = configs[type][status] || {
      label: status,
      variant: "outline" as const,
    };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // 渲染概览页面
  const renderOverview = () => (
    <div className="space-y-6">
      {/* 统计卡片 */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">工作流总数</CardTitle>
              <GitBranch className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statistics.totalWorkflows}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">运行中实例</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statistics.activeInstances}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">今日完成</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statistics.completedToday}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">待处理任务</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statistics.pendingTasks}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 快速操作 */}
      <Card>
        <CardHeader>
          <CardTitle>快速操作</CardTitle>
          <CardDescription>常用的工作流操作</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button onClick={() => setIsDesignerOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              创建工作流
            </Button>
            <Dialog
              open={isStartWorkflowOpen}
              onOpenChange={setIsStartWorkflowOpen}
            >
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Play className="w-4 h-4 mr-2" />
                  启动工作流
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>启动工作流</DialogTitle>
                  <DialogDescription>选择要启动的工作流</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Select
                    onValueChange={(value) => {
                      const workflow = workflows.find((w) => w.id === value);
                      setSelectedWorkflowForStart(workflow || null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择工作流" />
                    </SelectTrigger>
                    <SelectContent>
                      {workflows
                        .filter((w) => w.status === "active")
                        .map((workflow) => (
                          <SelectItem key={workflow.id} value={workflow.id}>
                            {workflow.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>

                  {selectedWorkflowForStart && (
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsStartWorkflowOpen(false)}
                      >
                        取消
                      </Button>
                      <Button
                        onClick={() =>
                          startWorkflow(selectedWorkflowForStart.id)
                        }
                      >
                        启动
                      </Button>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* 最近的工作流实例 */}
      <Card>
        <CardHeader>
          <CardTitle>最近的工作流实例</CardTitle>
          <CardDescription>最新创建的工作流实例</CardDescription>
        </CardHeader>
        <CardContent>
          {instances.slice(0, 5).map((instance) => (
            <div
              key={instance.id}
              className="flex items-center justify-between py-2 border-b last:border-b-0"
            >
              <div>
                <div className="font-medium">
                  {instance.workflowId.substring(0, 8)}...
                </div>
                <div className="text-sm text-gray-500">
                  启动者: {instance.startedBy} •{" "}
                  {format(new Date(instance.startedAt), "MM-dd HH:mm", {
                    locale: zhCN,
                  })}
                </div>
              </div>
              {getStatusBadge(instance.status, "instance")}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );

  // 渲染工作流定义页面
  const renderWorkflows = () => (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex justify-between items-center">
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="搜索工作流..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="draft">草稿</SelectItem>
              <SelectItem value="active">活跃</SelectItem>
              <SelectItem value="deprecated">已弃用</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setIsDesignerOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          创建工作流
        </Button>
      </div>

      {/* 工作流列表 */}
      <div className="grid gap-4">
        {filteredWorkflows.map((workflow) => (
          <Card key={workflow.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {workflow.name}
                    {getStatusBadge(workflow.status)}
                  </CardTitle>
                  <CardDescription>{workflow.description}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingWorkflow(workflow);
                      setIsDesignerOpen(true);
                    }}
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  {workflow.status === "draft" && (
                    <Button
                      size="sm"
                      onClick={() =>
                        updateWorkflowStatus(workflow.id, "active")
                      }
                    >
                      激活
                    </Button>
                  )}
                  {workflow.status === "active" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startWorkflow(workflow.id)}
                    >
                      <Play className="w-3 h-3 mr-1" />
                      启动
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>版本 {workflow.version}</span>
                <span>{workflow.nodes.length} 个节点</span>
                <span>
                  创建于{" "}
                  {format(new Date(workflow.createdAt), "yyyy-MM-dd", {
                    locale: zhCN,
                  })}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  // 渲染工作流实例页面
  const renderInstances = () => (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="搜索实例..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-64"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="running">运行中</SelectItem>
            <SelectItem value="completed">已完成</SelectItem>
            <SelectItem value="failed">失败</SelectItem>
            <SelectItem value="canceled">已取消</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 实例列表 */}
      <div className="grid gap-4">
        {filteredInstances.map((instance) => (
          <Card key={instance.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {instance.id.substring(0, 8)}...
                    {getStatusBadge(instance.status, "instance")}
                  </CardTitle>
                  <CardDescription>
                    工作流: {instance.workflowId} • 启动者: {instance.startedBy}
                  </CardDescription>
                </div>
                <Button size="sm" variant="outline">
                  <Eye className="w-3 h-3 mr-1" />
                  查看
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>
                  启动时间:{" "}
                  {format(new Date(instance.startedAt), "yyyy-MM-dd HH:mm", {
                    locale: zhCN,
                  })}
                </span>
                {instance.completedAt && (
                  <span>
                    完成时间:{" "}
                    {format(
                      new Date(instance.completedAt),
                      "yyyy-MM-dd HH:mm",
                      { locale: zhCN }
                    )}
                  </span>
                )}
                <span>当前节点: {instance.currentNodeIds.length} 个</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">工作流管理</h1>
          <p className="text-muted-foreground">设计、管理和监控您的业务流程</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="workflows">工作流定义</TabsTrigger>
          <TabsTrigger value="instances">工作流实例</TabsTrigger>
          <TabsTrigger value="tasks">我的任务</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {loading ? <div>加载中...</div> : renderOverview()}
        </TabsContent>

        <TabsContent value="workflows" className="space-y-4">
          {loading ? <div>加载中...</div> : renderWorkflows()}
        </TabsContent>

        <TabsContent value="instances" className="space-y-4">
          {loading ? <div>加载中...</div> : renderInstances()}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <ApprovalTasks userId={userId} onRefresh={() => fetchStatistics()} />
        </TabsContent>
      </Tabs>

      {/* 工作流设计器对话框 */}
      <Dialog open={isDesignerOpen} onOpenChange={setIsDesignerOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>
              {editingWorkflow ? "编辑工作流" : "创建工作流"}
            </DialogTitle>
            <DialogDescription>
              {editingWorkflow ? "修改现有工作流定义" : "设计新的工作流定义"}
            </DialogDescription>
          </DialogHeader>
          <div className="h-[80vh]">
            <WorkflowDesigner
              initialWorkflow={editingWorkflow || undefined}
              onSave={saveWorkflow}
              className="h-full"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
