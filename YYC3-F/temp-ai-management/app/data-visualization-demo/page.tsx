"use client";

import React, { useState, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DataVisualizationChart } from "@/components/data-visualization/chart-components";
import { PivotTable } from "@/components/data-visualization/pivot-table";
import DataVisualizationUtils from "@/lib/data-visualization-utils";

export default function DataVisualizationDemo() {
  // 生成模拟数据
  const salesData = useMemo(
    () =>
      DataVisualizationUtils.generateMockData(12, [
        { name: "month", type: "string" },
        { name: "revenue", type: "number" },
        { name: "orders", type: "number" },
        { name: "customers", type: "number" },
        { name: "profit", type: "number" },
      ]).map((item, index) => ({
        ...item,
        month: `2024-${String(index + 1).padStart(2, "0")}`,
        revenue: Math.floor(Math.random() * 100000) + 50000,
        orders: Math.floor(Math.random() * 500) + 100,
        customers: Math.floor(Math.random() * 300) + 50,
        profit: Math.floor(Math.random() * 30000) + 10000,
      })),
    []
  );

  const productData = useMemo(
    () => [
      { category: "手机", value: 45, sales: 8500000 },
      { category: "电脑", value: 25, sales: 6200000 },
      { category: "平板", value: 15, sales: 2800000 },
      { category: "耳机", value: 10, sales: 1500000 },
      { category: "其他", value: 5, sales: 800000 },
    ],
    []
  );

  const userAnalyticsData = useMemo(
    () =>
      DataVisualizationUtils.generateMockData(50, [
        { name: "name", type: "string" },
        { name: "age", type: "number" },
        { name: "score", type: "number" },
        { name: "active", type: "boolean" },
        { name: "joinDate", type: "date" },
      ]).map((item, index) => ({
        id: index + 1,
        name: `用户${index + 1}`,
        age: Math.floor(Math.random() * 50) + 18,
        score: Math.floor(Math.random() * 100),
        active: Math.random() > 0.3,
        joinDate: item.joinDate,
        region: ["北京", "上海", "广州", "深圳", "杭州"][
          Math.floor(Math.random() * 5)
        ],
        department: ["技术部", "销售部", "市场部", "运营部"][
          Math.floor(Math.random() * 4)
        ],
      })),
    []
  );

  // 表格列定义
  const userColumns: ColumnDef<any>[] = [
    {
      accessorKey: "id",
      header: "ID",
      meta: { isNumeric: true },
    },
    {
      accessorKey: "name",
      header: "姓名",
    },
    {
      accessorKey: "age",
      header: "年龄",
      meta: { isNumeric: true },
    },
    {
      accessorKey: "score",
      header: "评分",
      meta: { isNumeric: true },
      cell: ({ row }) => {
        const score = row.getValue("score") as number;
        return (
          <div className="flex items-center gap-2">
            <span>{score}</span>
            <Badge
              variant={
                score >= 80
                  ? "default"
                  : score >= 60
                  ? "secondary"
                  : "destructive"
              }
            >
              {score >= 80 ? "优秀" : score >= 60 ? "良好" : "待改进"}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: "active",
      header: "状态",
      cell: ({ row }) => {
        const active = row.getValue("active") as boolean;
        return (
          <Badge variant={active ? "default" : "secondary"}>
            {active ? "活跃" : "非活跃"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "region",
      header: "地区",
    },
    {
      accessorKey: "department",
      header: "部门",
    },
    {
      accessorKey: "joinDate",
      header: "加入日期",
    },
  ];

  const [activeChart, setActiveChart] = useState<string>("bar");

  const handleRefresh = () => {
    // 刷新数据逻辑
    console.log("刷新数据");
  };

  const handleFilter = () => {
    // 筛选数据逻辑
    console.log("筛选数据");
  };

  const handleExport = () => {
    // 导出数据逻辑
    console.log("导出数据");
  };

  // 计算统计信息
  const statistics = useMemo(() => {
    const revenueStats = DataVisualizationUtils.calculateStatistics(
      salesData,
      "revenue"
    );
    const userStats = DataVisualizationUtils.calculateStatistics(
      userAnalyticsData,
      "score"
    );

    return {
      revenue: revenueStats,
      userScore: userStats,
      totalUsers: userAnalyticsData.length,
      activeUsers: userAnalyticsData.filter((user) => user.active).length,
    };
  }, [salesData, userAnalyticsData]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面标题 */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">数据可视化系统演示</h1>
        <p className="text-muted-foreground">
          展示高级图表组件、数据透视表和数据处理工具的功能
        </p>
      </div>

      <Separator />

      {/* 统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">总收入</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {DataVisualizationUtils.formatNumber(
                statistics.revenue.sum,
                "currency"
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              平均:{" "}
              {DataVisualizationUtils.formatNumber(
                statistics.revenue.avg,
                "currency"
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">用户总数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              活跃用户: {statistics.activeUsers}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">平均评分</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statistics.userScore.avg.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">
              最高: {statistics.userScore.max} / 最低:{" "}
              {statistics.userScore.min}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">数据点</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {salesData.length + userAnalyticsData.length}
            </div>
            <p className="text-xs text-muted-foreground">
              销售: {salesData.length} / 用户: {userAnalyticsData.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 主要内容 */}
      <Tabs defaultValue="charts" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="charts">图表展示</TabsTrigger>
          <TabsTrigger value="tables">数据表格</TabsTrigger>
          <TabsTrigger value="utils">工具函数</TabsTrigger>
        </TabsList>

        {/* 图表展示标签页 */}
        <TabsContent value="charts" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 销售数据柱状图 */}
            <DataVisualizationChart
              data={salesData}
              config={{
                type: "bar",
                xAxis: "month",
                yAxis: ["revenue", "profit"],
                colorScheme: ["#3366CC", "#DC3912"],
                showGrid: true,
                showLegend: true,
              }}
              dimensions={{ height: 400 }}
              title="月度销售数据"
              description="显示收入和利润的月度趋势"
              onRefresh={handleRefresh}
              onFilter={handleFilter}
              onExport={handleExport}
            />

            {/* 销售数据折线图 */}
            <DataVisualizationChart
              data={salesData}
              config={{
                type: "line",
                xAxis: "month",
                yAxis: ["orders", "customers"],
                colorScheme: ["#FF9900", "#109618"],
                showGrid: true,
                showLegend: true,
              }}
              dimensions={{ height: 400 }}
              title="月度订单和客户趋势"
              description="订单数量和客户数量的变化趋势"
              onRefresh={handleRefresh}
              onExport={handleExport}
            />

            {/* 产品分类饼图 */}
            <DataVisualizationChart
              data={productData}
              config={{
                type: "pie",
                category: "category",
                value: "value",
                colorScheme: DataVisualizationUtils.generateColorScheme(
                  5,
                  "vibrant"
                ),
                showLegend: true,
              }}
              dimensions={{ height: 400 }}
              title="产品分类分布"
              description="各产品类别的销售占比"
              onExport={handleExport}
            />

            {/* 销售数据面积图 */}
            <DataVisualizationChart
              data={salesData}
              config={{
                type: "area",
                xAxis: "month",
                yAxis: ["revenue"],
                colorScheme: ["#45B7D1"],
                stacked: false,
                showGrid: true,
                showLegend: true,
              }}
              dimensions={{ height: 400 }}
              title="收入趋势面积图"
              description="月度收入的累积趋势"
              onRefresh={handleRefresh}
              onExport={handleExport}
            />
          </div>

          {/* 图表功能展示 */}
          <Card>
            <CardHeader>
              <CardTitle>图表功能演示</CardTitle>
              <CardDescription>
                展示图表组件的各种功能和配置选项
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={activeChart === "bar" ? "default" : "outline"}
                  onClick={() => setActiveChart("bar")}
                >
                  柱状图
                </Button>
                <Button
                  variant={activeChart === "line" ? "default" : "outline"}
                  onClick={() => setActiveChart("line")}
                >
                  折线图
                </Button>
                <Button
                  variant={activeChart === "area" ? "default" : "outline"}
                  onClick={() => setActiveChart("area")}
                >
                  面积图
                </Button>
                <Button
                  variant={activeChart === "scatter" ? "default" : "outline"}
                  onClick={() => setActiveChart("scatter")}
                >
                  散点图
                </Button>
                <Button
                  variant={activeChart === "radar" ? "default" : "outline"}
                  onClick={() => setActiveChart("radar")}
                >
                  雷达图
                </Button>
              </div>

              <div className="min-h-[400px]">
                <DataVisualizationChart
                  data={salesData}
                  config={{
                    type: activeChart as any,
                    xAxis: "month",
                    yAxis:
                      activeChart === "scatter"
                        ? "revenue"
                        : ["revenue", "profit"],
                    category: "month",
                    value: "revenue",
                    colorScheme: DataVisualizationUtils.generateColorScheme(
                      2,
                      "default"
                    ),
                    showGrid: true,
                    showLegend: true,
                  }}
                  dimensions={{ height: 350 }}
                  title={`${
                    activeChart === "bar"
                      ? "柱状图"
                      : activeChart === "line"
                      ? "折线图"
                      : activeChart === "area"
                      ? "面积图"
                      : activeChart === "scatter"
                      ? "散点图"
                      : "雷达图"
                  } 演示`}
                  description="动态切换图表类型演示"
                  onRefresh={handleRefresh}
                  onFilter={handleFilter}
                  onExport={handleExport}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 数据表格标签页 */}
        <TabsContent value="tables" className="space-y-6">
          <PivotTable
            data={userAnalyticsData}
            defaultColumns={userColumns}
            title="用户数据分析表"
            description="支持排序、筛选、分页和导出功能的高级数据表格"
            onExport={handleExport}
            onSettingsChange={(settings) => console.log("设置变更:", settings)}
          />
        </TabsContent>

        {/* 工具函数标签页 */}
        <TabsContent value="utils" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 数据聚合演示 */}
            <Card>
              <CardHeader>
                <CardTitle>数据聚合功能</CardTitle>
                <CardDescription>按部门聚合用户数据统计</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {DataVisualizationUtils.aggregateData(
                    userAnalyticsData,
                    "department",
                    [
                      { field: "score", operation: "avg" },
                      { field: "score", operation: "count" },
                    ]
                  ).map((item, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-3 bg-muted rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{item.department}</p>
                        <p className="text-sm text-muted-foreground">
                          人数: {item.score_count}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">
                          {item.score_avg.toFixed(1)} 分
                        </p>
                        <p className="text-sm text-muted-foreground">
                          平均评分
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 颜色方案演示 */}
            <Card>
              <CardHeader>
                <CardTitle>颜色方案生成</CardTitle>
                <CardDescription>不同类型的颜色方案</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {["default", "pastel", "vibrant", "monochrome"].map(
                    (scheme) => (
                      <div key={scheme} className="space-y-2">
                        <p className="font-medium capitalize">{scheme}</p>
                        <div className="flex gap-2">
                          {DataVisualizationUtils.generateColorScheme(
                            8,
                            scheme
                          ).map((color, index) => (
                            <div
                              key={index}
                              className="w-8 h-8 rounded border"
                              style={{ backgroundColor: color }}
                              title={color}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 数据格式化演示 */}
            <Card>
              <CardHeader>
                <CardTitle>数据格式化</CardTitle>
                <CardDescription>不同格式的数字显示</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>默认格式:</span>
                    <span className="font-mono">
                      {DataVisualizationUtils.formatNumber(1234567.89)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>货币格式:</span>
                    <span className="font-mono">
                      {DataVisualizationUtils.formatNumber(
                        1234567.89,
                        "currency"
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>百分比格式:</span>
                    <span className="font-mono">
                      {DataVisualizationUtils.formatNumber(0.1234, "percent")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>紧凑格式:</span>
                    <span className="font-mono">
                      {DataVisualizationUtils.formatNumber(
                        1234567.89,
                        "compact"
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 统计信息演示 */}
            <Card>
              <CardHeader>
                <CardTitle>统计信息计算</CardTitle>
                <CardDescription>用户评分的统计数据</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">
                      {statistics.userScore.count}
                    </p>
                    <p className="text-sm text-muted-foreground">总数</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">
                      {statistics.userScore.avg.toFixed(1)}
                    </p>
                    <p className="text-sm text-muted-foreground">平均值</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">
                      {statistics.userScore.max}
                    </p>
                    <p className="text-sm text-muted-foreground">最大值</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">
                      {statistics.userScore.min}
                    </p>
                    <p className="text-sm text-muted-foreground">最小值</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
