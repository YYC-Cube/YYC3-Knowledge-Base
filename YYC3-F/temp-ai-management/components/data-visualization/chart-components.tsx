"use client";

import React, { useState, useCallback, useRef } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  ScatterChart,
  Scatter,
  RadarChart,
  Radar,
  Treemap,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  Sector,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  IconDownload,
  IconExpand,
  IconFilter,
  IconRefresh,
} from "@/components/ui/icons";

// 图表类型定义
export type ChartType =
  | "bar"
  | "line"
  | "area"
  | "pie"
  | "scatter"
  | "radar"
  | "treemap";

// 数据点类型定义
export interface DataPoint {
  [key: string]: string | number | Date | null;
}

// 图表尺寸定义
export interface ChartDimensions {
  width?: number | string;
  height?: number | string;
  aspectRatio?: number;
}

// 图表配置定义
export interface ChartConfig {
  type: ChartType;
  xAxis?: string;
  yAxis?: string | string[];
  category?: string;
  value?: string;
  colorScheme?: string[];
  stacked?: boolean;
  showGrid?: boolean;
  showLegend?: boolean;
  animationDuration?: number;
}

// 图表组件属性
export interface DataVisualizationChartProps {
  data: DataPoint[];
  config: ChartConfig;
  dimensions?: ChartDimensions;
  title?: string;
  description?: string;
  loading?: boolean;
  onRefresh?: () => void;
  onFilter?: () => void;
  onExport?: () => void;
  className?: string;
}

// 默认颜色方案
const DEFAULT_COLORS = [
  "#3366CC",
  "#DC3912",
  "#FF9900",
  "#109618",
  "#990099",
  "#0099C6",
  "#DD4477",
  "#66AA00",
  "#B82E2E",
  "#316395",
];

export function DataVisualizationChart({
  data,
  config,
  dimensions = { height: 300 },
  title,
  description,
  loading = false,
  onRefresh,
  onFilter,
  onExport,
  className = "",
}: DataVisualizationChartProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [chartType, setChartType] = useState<ChartType>(config.type);
  const chartRef = useRef<HTMLDivElement>(null);
  const colorScheme = config.colorScheme || DEFAULT_COLORS;

  // 更新活动索引（用于饼图交互）
  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  // 自动维度计算
  const calculatedDimensions = {
    width: dimensions.width || "100%",
    height: dimensions.height || 300,
  };

  // 生成饼图自定义活动扇区
  const renderActiveShape = (props: any) => {
    const {
      cx,
      cy,
      innerRadius,
      outerRadius,
      startAngle,
      endAngle,
      fill,
      payload,
      percent,
      value,
    } = props;

    return (
      <g>
        <text x={cx} y={cy} dy={-20} textAnchor="middle" fill={fill}>
          {payload.name}
        </text>
        <text x={cx} y={cy} dy={8} textAnchor="middle" fill="#999">
          {`${value}`}
        </text>
        <text x={cx} y={cy} dy={25} textAnchor="middle" fill="#999">
          {`(${(percent * 100).toFixed(2)}%)`}
        </text>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 10}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 10}
          outerRadius={outerRadius + 15}
          fill={fill}
        />
      </g>
    );
  };

  // 渲染不同类型的图表
  const renderChart = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full w-full">
          <Skeleton className="h-full w-full" />
        </div>
      );
    }

    if (!data || data.length === 0) {
      return (
        <div className="flex items-center justify-center h-full w-full">
          <p className="text-gray-500">暂无数据</p>
        </div>
      );
    }

    switch (chartType) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
              barCategoryGap="20%"
            >
              {config.showGrid !== false && (
                <CartesianGrid strokeDasharray="3 3" />
              )}
              <XAxis
                dataKey={config.xAxis}
                angle={-45}
                textAnchor="end"
                height={70}
                tick={{ fontSize: 12 }}
              />
              <YAxis />
              <Tooltip />
              {config.showLegend !== false && (
                <Legend verticalAlign="top" height={36} />
              )}
              {Array.isArray(config.yAxis) ? (
                config.yAxis.map((axis, index) => (
                  <Bar
                    key={axis}
                    dataKey={axis}
                    fill={colorScheme[index % colorScheme.length]}
                    stackId={config.stacked ? "stack" : undefined}
                    animationDuration={config.animationDuration || 1500}
                  />
                ))
              ) : (
                <Bar
                  dataKey={config.yAxis}
                  fill={colorScheme[0]}
                  animationDuration={config.animationDuration || 1500}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        );

      case "line":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
            >
              {config.showGrid !== false && (
                <CartesianGrid strokeDasharray="3 3" />
              )}
              <XAxis
                dataKey={config.xAxis}
                angle={-45}
                textAnchor="end"
                height={70}
                tick={{ fontSize: 12 }}
              />
              <YAxis />
              <Tooltip />
              {config.showLegend !== false && (
                <Legend verticalAlign="top" height={36} />
              )}
              {Array.isArray(config.yAxis) ? (
                config.yAxis.map((axis, index) => (
                  <Line
                    key={axis}
                    type="monotone"
                    dataKey={axis}
                    stroke={colorScheme[index % colorScheme.length]}
                    activeDot={{ r: 8 }}
                    animationDuration={config.animationDuration || 1500}
                  />
                ))
              ) : (
                <Line
                  type="monotone"
                  dataKey={config.yAxis}
                  stroke={colorScheme[0]}
                  activeDot={{ r: 8 }}
                  animationDuration={config.animationDuration || 1500}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        );

      case "area":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
            >
              {config.showGrid !== false && (
                <CartesianGrid strokeDasharray="3 3" />
              )}
              <XAxis
                dataKey={config.xAxis}
                angle={-45}
                textAnchor="end"
                height={70}
                tick={{ fontSize: 12 }}
              />
              <YAxis />
              <Tooltip />
              {config.showLegend !== false && (
                <Legend verticalAlign="top" height={36} />
              )}
              {Array.isArray(config.yAxis) ? (
                config.yAxis.map((axis, index) => (
                  <Area
                    key={axis}
                    type="monotone"
                    dataKey={axis}
                    stackId={config.stacked ? "stack" : `area${index}`}
                    fill={colorScheme[index % colorScheme.length]}
                    stroke={colorScheme[index % colorScheme.length]}
                    fillOpacity={0.6}
                    animationDuration={config.animationDuration || 1500}
                  />
                ))
              ) : (
                <Area
                  type="monotone"
                  dataKey={config.yAxis}
                  fill={colorScheme[0]}
                  stroke={colorScheme[0]}
                  fillOpacity={0.6}
                  animationDuration={config.animationDuration || 1500}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        );

      case "pie":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                dataKey={config.value}
                nameKey={config.category}
                onMouseEnter={onPieEnter}
                animationDuration={config.animationDuration || 1500}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={colorScheme[index % colorScheme.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              {config.showLegend !== false && (
                <Legend verticalAlign="bottom" height={36} />
              )}
            </PieChart>
          </ResponsiveContainer>
        );

      case "scatter":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
              {config.showGrid !== false && (
                <CartesianGrid strokeDasharray="3 3" />
              )}
              <XAxis
                type="number"
                dataKey={config.xAxis}
                name={config.xAxis}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                type="number"
                dataKey={config.yAxis as string}
                name={config.yAxis as string}
                tick={{ fontSize: 12 }}
              />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} />
              {config.showLegend !== false && (
                <Legend verticalAlign="top" height={36} />
              )}
              <Scatter
                name="数据点"
                data={data}
                fill={colorScheme[0]}
                animationDuration={config.animationDuration || 1500}
              />
            </ScatterChart>
          </ResponsiveContainer>
        );

      case "radar":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
              <PolarGrid />
              <PolarAngleAxis dataKey={config.category} />
              <PolarRadiusAxis />
              <Radar
                name={config.yAxis as string}
                dataKey={config.value}
                stroke={colorScheme[0]}
                fill={colorScheme[0]}
                fillOpacity={0.6}
                animationDuration={config.animationDuration || 1500}
              />
              <Tooltip />
              {config.showLegend !== false && (
                <Legend verticalAlign="bottom" height={36} />
              )}
            </RadarChart>
          </ResponsiveContainer>
        );

      case "treemap":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={data}
              dataKey={config.value}
              nameKey={config.category}
              aspectRatio={4 / 3}
              stroke="#fff"
              animationDuration={config.animationDuration || 1500}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colorScheme[index % colorScheme.length]}
                />
              ))}
              <Tooltip />
            </Treemap>
          </ResponsiveContainer>
        );

      default:
        return (
          <div className="flex items-center justify-center h-full w-full">
            <p className="text-gray-500">不支持的图表类型: {chartType}</p>
          </div>
        );
    }
  };

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            {title && <CardTitle className="text-lg">{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          <div className="flex items-center gap-2">
            {/* 图表类型选择器 */}
            <Select
              value={chartType}
              onValueChange={(value) => setChartType(value as ChartType)}
            >
              <SelectTrigger className="w-[120px] h-8">
                <SelectValue placeholder="图表类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bar">柱状图</SelectItem>
                <SelectItem value="line">折线图</SelectItem>
                <SelectItem value="area">面积图</SelectItem>
                <SelectItem value="pie">饼图</SelectItem>
                <SelectItem value="scatter">散点图</SelectItem>
                <SelectItem value="radar">雷达图</SelectItem>
                <SelectItem value="treemap">矩形树图</SelectItem>
              </SelectContent>
            </Select>

            {/* 功能按钮 */}
            {onFilter && (
              <Button
                variant="outline"
                size="icon"
                title="筛选"
                onClick={onFilter}
              >
                <IconFilter className="h-4 w-4" />
              </Button>
            )}
            {onRefresh && (
              <Button
                variant="outline"
                size="icon"
                title="刷新"
                onClick={onRefresh}
              >
                <IconRefresh className="h-4 w-4" />
              </Button>
            )}
            {onExport && (
              <Button
                variant="outline"
                size="icon"
                title="导出"
                onClick={onExport}
              >
                <IconDownload className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div
          ref={chartRef}
          style={{
            height: calculatedDimensions.height,
            width: calculatedDimensions.width,
          }}
          className="pt-2"
        >
          {renderChart()}
        </div>
      </CardContent>
    </Card>
  );
}
