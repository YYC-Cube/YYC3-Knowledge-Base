"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, Play, Pause, Square, Filter } from "lucide-react";
import { WorkflowInstance, WorkflowStatus } from "@/types/workflow";

// 状态映射常量
const STATUS_MAP = {
  running: "运行中",
  completed: "已完成",
  failed: "失败",
  canceled: "已取消",
  suspended: "已暂停"
} as const;

// 状态徽章变体映射
const STATUS_BADGE_VARIANT = {
  running: "default" as const,
  completed: "outline" as const,
  failed: "destructive" as const,
  canceled: "outline" as const,
  suspended: "secondary" as const
} as const;

export default function WorkflowInstancesPage() {
  const [instances, setInstances] = useState<WorkflowInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<WorkflowStatus | "all">(
    "all"
  );

  useEffect(() => {
    fetchInstances();
  }, []);

  const fetchInstances = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/workflow/instances");
      if (response.ok) {
        const data = await response.json();
        setInstances(data.instances || []);
      }
    } catch (error) {
      console.error("Failed to fetch workflow instances:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: WorkflowStatus) => {
    return STATUS_BADGE_VARIANT[status] || "outline";
  };

  const getStatusText = (status: WorkflowStatus) => {
    return STATUS_MAP[status] || status;
  };

  const filteredInstances = instances.filter((instance) => {
    const matchesSearch =
      instance.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      instance.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || instance.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleInstanceAction = async (
    instanceId: string,
    action: "pause" | "resume" | "stop"
  ) => {
    try {
      const response = await fetch(
        `/api/workflow/instances/${instanceId}/${action}`,
        {
          method: "POST",
        }
      );
      if (response.ok) {
        fetchInstances(); // Refresh the list
      }
    } catch (error) {
      console.error(`Failed to ${action} workflow instance:`, error);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">加载中...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">工作流实例</h1>
        <p className="text-muted-foreground">查看和管理所有工作流实例</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>实例列表</CardTitle>
          <CardDescription>管理运行中和已完成的工作流实例</CardDescription>
          <div className="flex gap-4 mt-4">
            <Input
              placeholder="搜索实例..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Select
              value={statusFilter}
              onValueChange={(value: WorkflowStatus | "all") =>
                setStatusFilter(value)
              }
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="状态筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="running">运行中</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
                <SelectItem value="failed">失败</SelectItem>
                <SelectItem value="canceled">已取消</SelectItem>
                <SelectItem value="suspended">已暂停</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>实例名称</TableHead>
                <TableHead>工作流定义</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>开始时间</TableHead>
                <TableHead>完成时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInstances.map((instance) => (
                <TableRow key={instance.id}>
                  <TableCell className="font-medium">{instance.name}</TableCell>
                  <TableCell>{instance.workflowDefinitionId}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(instance.status)}>
                      {getStatusText(instance.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {instance.startedAt
                      ? new Date(instance.startedAt).toLocaleString()
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {instance.completedAt
                      ? new Date(instance.completedAt).toLocaleString()
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                      {instance.status === "running" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleInstanceAction(instance.id, "pause")
                          }
                        >
                          <Pause className="w-4 h-4" />
                        </Button>
                      )}
                      {instance.status === "suspended" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleInstanceAction(instance.id, "resume")
                          }
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      )}
                      {(instance.status === "running" ||
                        instance.status === "suspended") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleInstanceAction(instance.id, "stop")
                          }
                        >
                          <Square className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredInstances.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              暂无工作流实例
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
