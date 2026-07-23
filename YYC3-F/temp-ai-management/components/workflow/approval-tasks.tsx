/**
 * 审批任务组件
 * 提供工作流任务的查看、处理和评论功能
 */

"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  Filter,
  Search,
  Calendar,
  AlertTriangle,
  User,
  FileText,
  Eye,
  ChevronRight,
  Timer,
  Users,
} from "lucide-react";

import {
  WorkflowTask,
  WorkflowComment,
  WorkflowInstance,
} from "@/types/workflow";

export interface ApprovalTasksProps {
  userId?: string;
  showApprovalOnly?: boolean;
  onRefresh?: () => void;
  className?: string;
}

export function ApprovalTasks({
  userId,
  showApprovalOnly = false,
  onRefresh,
  className = "",
}: ApprovalTasksProps) {
  const [activeTab, setActiveTab] = useState("pending");
  const [tasks, setTasks] = useState<WorkflowTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selectedTask, setSelectedTask] = useState<WorkflowTask | null>(null);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [processingTaskId, setProcessingTaskId] = useState<string | null>(null);

  // 获取任务数据
  const fetchTasks = async (status: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        assignee: userId || '',
        status: status === "pending" ? "pending,in_progress" : status,
        limit: "50",
      });
      
      // 如果只显示审批任务，添加类型筛选
      if (showApprovalOnly) {
        params.append('type', 'approval');
      }

      const response = await fetch(`/api/workflow/tasks?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTasks(data.data || []);
      } else {
        console.error("获取任务失败:", response.statusText);
        toast.error("获取任务失败");
      }
    } catch (error) {
      console.error("获取任务失败:", error);
      toast.error("获取任务失败");
    } finally {
      setLoading(false);
    }
  };

  // Tab切换时加载相应任务
  useEffect(() => {
    fetchTasks(activeTab);
  }, [activeTab, userId]);

  // 过滤任务
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.nodeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.instanceId.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPriority =
      priorityFilter === "all" || task.priority === priorityFilter;

    return matchesSearch && matchesPriority;
  });

  // 完成任务
  const completeTask = async (
    taskId: string,
    action: "complete" | "reject"
  ) => {
    setProcessingTaskId(taskId);
    try {
      const endpoint = action === "complete" ? "complete" : "reject";
      // 创建headers对象，只在userId存在时添加X-User-Id
      const headers: HeadersInit = {
        "Content-Type": "application/json"
      };
      
      if (userId) {
        headers["X-User-Id"] = userId;
      }
      
      const response = await fetch(
        `/api/workflow/tasks/${taskId}/${endpoint}`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            comment: comment || undefined,
          }),
        }
      );

      if (response.ok) {
        toast.success(action === "complete" ? "审批已通过" : "审批已拒绝");
        setComment("");
        setIsTaskDialogOpen(false);
        await fetchTasks(activeTab);
        onRefresh?.();
      } else {
        const data = await response.json();
        toast.error(data.error?.message || "操作失败");
      }
    } catch (error) {
      console.error("操作失败:", error);
      toast.error("操作失败");
    } finally {
      setProcessingTaskId(null);
    }
  };

  // 查看任务详情
  const viewTaskDetails = (task: WorkflowTask) => {
    setSelectedTask(task);
    setIsTaskDialogOpen(true);
  };

  // 状态配置类型
  interface StatusConfigItem {
    label: string;
    variant: "secondary" | "default" | "destructive" | "outline";
    icon: React.ElementType;
  }

  // 获取任务状态徽章
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, StatusConfigItem> = {
      pending: { label: "待处理", variant: "secondary", icon: Clock },
      in_progress: {
        label: "处理中",
        variant: "default",
        icon: Timer,
      },
      completed: {
        label: "已完成",
        variant: "default",
        icon: CheckCircle,
      },
      rejected: {
        label: "已拒绝",
        variant: "destructive",
        icon: XCircle,
      },
      canceled: { label: "已取消", variant: "outline", icon: XCircle },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  // 优先级配置类型
  interface PriorityConfigItem {
    label: string;
    className: string;
  }

  // 获取优先级徽章
  const getPriorityBadge = (priority: string) => {
    const priorityConfig: Record<string, PriorityConfigItem> = {
      low: {
        label: "低",
        className: "bg-blue-50 text-blue-700 border-blue-200",
      },
      medium: {
        label: "中",
        className: "bg-green-50 text-green-700 border-green-200",
      },
      high: {
        label: "高",
        className: "bg-orange-50 text-orange-700 border-orange-200",
      },
      urgent: {
        label: "紧急",
        className: "bg-red-50 text-red-700 border-red-200",
      },
    };

    const config = priorityConfig[priority] || priorityConfig.medium;

    return (
      <Badge variant="outline" className={config.className}>
        <AlertTriangle className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  // 渲染任务卡片
  const renderTaskCard = (task: WorkflowTask) => (
    <Card
      key={task.id}
      className="cursor-pointer hover:shadow-md transition-shadow"
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" />
            {task.nodeName}
          </CardTitle>
          <div className="flex items-center gap-2">
            {getStatusBadge(task.status)}
            {getPriorityBadge(task.priority)}
          </div>
        </div>
        <CardDescription className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            实例ID: {task.instanceId.substring(0, 8)}...
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {format(new Date(task.createdAt), "MM-dd HH:mm", { locale: zhCN })}
          </span>
        </CardDescription>
      </CardHeader>

      <CardContent className="py-2">
        {task.dueDate && (
          <div className="flex items-center gap-2 text-sm text-orange-600 mb-2">
            <Clock className="w-3 h-3" />
            截止时间:{" "}
            {format(new Date(task.dueDate), "yyyy-MM-dd HH:mm", {
              locale: zhCN,
            })}
          </div>
        )}

        {task.formData && Object.keys(task.formData).length > 0 && (
          <div className="bg-gray-50 p-2 rounded text-sm">
            <div className="font-medium mb-1">相关数据:</div>
            {Object.entries(task.formData)
              .slice(0, 2)
              .map(([key, value]) => (
                <div key={key} className="text-gray-600">
                  <span className="font-medium">{key}:</span> {String(value)}
                </div>
              ))}
            {Object.keys(task.formData).length > 2 && (
              <div className="text-gray-500 text-xs mt-1">
                还有 {Object.keys(task.formData).length - 2} 项...
              </div>
            )}
          </div>
        )}

        {task.comments && task.comments.length > 0 && (
          <div className="flex items-center gap-1 text-sm text-gray-500 mt-2">
            <MessageSquare className="w-3 h-3" />
            {task.comments.length} 条评论
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-2">
        <div className="flex w-full justify-between items-center">
          <div className="flex items-center gap-2">
            {task.assignees.length > 1 && (
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Users className="w-3 h-3" />
                {task.assignees.length} 人
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => viewTaskDetails(task)}
            >
              <Eye className="w-3 h-3 mr-1" />
              查看
            </Button>

            {activeTab === "pending" &&
              (task.status === "pending" || task.status === "in_progress") && (
                <>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTask(task);
                      completeTask(task.id, "reject");
                    }}
                    disabled={!!processingTaskId}
                  >
                    拒绝
                  </Button>
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTask(task);
                      completeTask(task.id, "complete");
                    }}
                    disabled={!!processingTaskId}
                  >
                    通过
                  </Button>
                </>
              )}
          </div>
        </div>
      </CardFooter>
    </Card>
  );

  // 渲染任务列表
  const renderTasks = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-40">
          <div className="text-gray-500">正在加载...</div>
        </div>
      );
    }

    if (filteredTasks.length === 0) {
      return (
        <div className="flex flex-col justify-center items-center h-40 text-gray-500">
          <FileText className="w-12 h-12 mb-2 opacity-50" />
          <p>
            暂无
            {activeTab === "pending"
              ? "待处理"
              : activeTab === "completed"
              ? "已完成"
              : "已拒绝"}
            的任务
          </p>
        </div>
      );
    }

    return (
      <ScrollArea className="h-[600px] pr-4">
        <div className="space-y-4">{filteredTasks.map(renderTaskCard)}</div>
      </ScrollArea>
    );
  };

  return (
    <div className={className}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">我的审批任务</h2>
        <p className="text-gray-600">管理和处理分配给您的工作流任务</p>
      </div>

      {/* 过滤器和搜索 */}
      <div className="flex gap-4 mb-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="搜索任务名称或实例ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="w-48">
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger>
              <SelectValue placeholder="优先级筛选" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部优先级</SelectItem>
              <SelectItem value="urgent">紧急</SelectItem>
              <SelectItem value="high">高</SelectItem>
              <SelectItem value="medium">中</SelectItem>
              <SelectItem value="low">低</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={() => fetchTasks(activeTab)}>
          刷新
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            待处理 (
            {
              tasks.filter(
                (t) => t.status === "pending" || t.status === "in_progress"
              ).length
            }
            )
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            已通过 ({tasks.filter((t) => t.status === "completed").length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            已拒绝 ({tasks.filter((t) => t.status === "rejected").length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {renderTasks()}
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          {renderTasks()}
        </TabsContent>

        <TabsContent value="rejected" className="mt-4">
          {renderTasks()}
        </TabsContent>
      </Tabs>

      {/* 任务详情对话框 */}
      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              任务详情
            </DialogTitle>
            <DialogDescription>查看任务详细信息并进行操作</DialogDescription>
          </DialogHeader>

          {selectedTask && (
            <div className="space-y-4">
              {/* 任务基本信息 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    任务名称
                  </Label>
                  <div className="mt-1 text-sm">{selectedTask.nodeName}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    状态
                  </Label>
                  <div className="mt-1">
                    {getStatusBadge(selectedTask.status)}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    优先级
                  </Label>
                  <div className="mt-1">
                    {getPriorityBadge(selectedTask.priority)}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    创建时间
                  </Label>
                  <div className="mt-1 text-sm">
                    {format(
                      new Date(selectedTask.createdAt),
                      "yyyy-MM-dd HH:mm:ss",
                      { locale: zhCN }
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* 任务数据 */}
              {selectedTask.formData &&
                Object.keys(selectedTask.formData).length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      相关数据
                    </Label>
                    <div className="mt-2 bg-gray-50 p-3 rounded-lg">
                      {Object.entries(selectedTask.formData).map(
                        ([key, value]) => (
                          <div key={key} className="flex justify-between py-1">
                            <span className="font-medium text-gray-700">
                              {key}:
                            </span>
                            <span className="text-gray-600">
                              {String(value)}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

              {/* 历史评论 */}
              {selectedTask.comments && selectedTask.comments.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    历史评论
                  </Label>
                  <ScrollArea className="mt-2 h-32">
                    <div className="space-y-2">
                      {selectedTask.comments.map((comment: WorkflowComment) => (
                        <div
                          key={comment.id}
                          className="bg-gray-50 p-3 rounded-lg"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Avatar className="w-6 h-6">
                              <AvatarFallback className="text-xs">
                                {comment.userId.substring(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">
                              {comment.userId}
                            </span>
                            <span className="text-xs text-gray-500">
                              {format(
                                new Date(comment.timestamp),
                                "MM-dd HH:mm",
                                { locale: zhCN }
                              )}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">
                            {comment.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* 审批意见输入 */}
              {(selectedTask.status === "pending" ||
                selectedTask.status === "in_progress") && (
                <div>
                  <Label
                    htmlFor="approval-comment"
                    className="text-sm font-medium text-gray-700"
                  >
                    审批意见
                  </Label>
                  <Textarea
                    id="approval-comment"
                    placeholder="请输入审批意见..."
                    className="mt-2 min-h-[80px]"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsTaskDialogOpen(false)}
            >
              关闭
            </Button>
            {selectedTask &&
              (selectedTask.status === "pending" ||
                selectedTask.status === "in_progress") && (
                <>
                  <Button
                    variant="destructive"
                    onClick={() => completeTask(selectedTask.id, "reject")}
                    disabled={!!processingTaskId}
                  >
                    {processingTaskId === selectedTask.id
                      ? "处理中..."
                      : "拒绝"}
                  </Button>
                  <Button
                    onClick={() => completeTask(selectedTask.id, "complete")}
                    disabled={!!processingTaskId}
                  >
                    {processingTaskId === selectedTask.id
                      ? "处理中..."
                      : "通过"}
                  </Button>
                </>
              )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
