"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

export default function WorkflowStatisticsPage() {
  const [statistics, setStatistics] = useState({
    totalWorkflows: 0,
    activeInstances: 0,
    completedToday: 0,
    averageExecutionTime: 0,
    statusDistribution: [] as Array<{
      name: string;
      value: number;
      color: string;
    }>,
    dailyCompletions: [] as Array<{
      date: string;
      completed: number;
      failed: number;
    }>,
    popularWorkflows: [] as Array<{ name: string; executions: number }>,
  });

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      // Mock data for demonstration
      setStatistics({
        totalWorkflows: 15,
        activeInstances: 8,
        completedToday: 23,
        averageExecutionTime: 145,
        statusDistribution: [
          { name: "已完成", value: 65, color: "#22c55e" },
          { name: "运行中", value: 20, color: "#3b82f6" },
          { name: "失败", value: 10, color: "#ef4444" },
          { name: "已暂停", value: 5, color: "#f59e0b" },
        ],
        dailyCompletions: [
          { date: "周一", completed: 12, failed: 2 },
          { date: "周二", completed: 18, failed: 1 },
          { date: "周三", completed: 15, failed: 3 },
          { date: "周四", completed: 20, failed: 1 },
          { date: "周五", completed: 23, failed: 2 },
          { date: "周六", completed: 8, failed: 1 },
          { date: "周日", completed: 5, failed: 0 },
        ],
        popularWorkflows: [
          { name: "订单审批流程", executions: 145 },
          { name: "员工入职流程", executions: 89 },
          { name: "费用报销流程", executions: 67 },
          { name: "采购申请流程", executions: 43 },
          { name: "请假申请流程", executions: 32 },
        ],
      });
    } catch (error) {
      console.error("Failed to fetch workflow statistics:", error);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">工作流统计分析</h1>
        <p className="text-muted-foreground">查看工作流执行情况和性能指标</p>
      </div>

      {/* 概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总工作流数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statistics.totalWorkflows}
            </div>
            <p className="text-xs text-muted-foreground">活跃的工作流定义</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">运行中实例</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statistics.activeInstances}
            </div>
            <p className="text-xs text-muted-foreground">当前执行中的实例</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今日完成</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statistics.completedToday}
            </div>
            <p className="text-xs text-muted-foreground">今天完成的实例数</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均执行时间</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statistics.averageExecutionTime}秒
            </div>
            <p className="text-xs text-muted-foreground">工作流平均耗时</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* 状态分布饼图 */}
        <Card>
          <CardHeader>
            <CardTitle>工作流状态分布</CardTitle>
            <CardDescription>各状态工作流实例的占比</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statistics.statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statistics.statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 热门工作流 */}
        <Card>
          <CardHeader>
            <CardTitle>热门工作流</CardTitle>
            <CardDescription>执行次数最多的工作流</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statistics.popularWorkflows} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip />
                <Bar dataKey="executions" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 每日完成趋势 */}
      <Card>
        <CardHeader>
          <CardTitle>每日完成趋势</CardTitle>
          <CardDescription>过去一周的工作流完成情况</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={statistics.dailyCompletions}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="completed"
                stroke="#22c55e"
                name="完成"
              />
              <Line
                type="monotone"
                dataKey="failed"
                stroke="#ef4444"
                name="失败"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
