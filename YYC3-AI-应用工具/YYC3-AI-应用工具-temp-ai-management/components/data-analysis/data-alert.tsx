import React, { useState, useCallback } from "react";
import { Bell, AlertTriangle, CheckCircle, XCircle, Settings, Mail, MessageSquare, Webhook, Plus, Trash2, Edit, Play, Clock, TrendingUp, BarChart3, Shield, Save, Copy, Download, Filter, Search, Target, Activity, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { EnhancedCard } from "../design-system/enhanced-card-system";
import { EnhancedButton } from "../design-system/enhanced-button-system";
import { AnimatedContainer } from "../design-system/animation-system";
import { useSound } from "../design-system/sound-system";

// 数据类型定义
interface AlertCondition {
  id: string;
  field: string;
  operator: ">" | "<" | ">=" | "<=" | "=" | "!=" | "contains" | "not_contains" | "in" | "not_in";
  value: string | number;
  description: string;
  enabled: boolean;
}

interface NotificationChannel {
  id: string;
  type: "email" | "sms" | "webhook" | "slack" | "teams" | "dingtalk";
  name: string;
  config: {
    recipients?: string[];
    url?: string;
    token?: string;
    template?: string;
  };
  enabled: boolean;
}

interface AlertConfig {
  id: string;
  type: "email" | "sms" | "webhook" | "dingtalk" | "slack" | "teams";
  name: string;
  config: {
    [key: string]: any;
  };
  enabled: boolean;
  priority: "low" | "medium" | "high" | "critical";
  conditions: AlertCondition[];
  logicOperator: "AND" | "OR";
  notifications: NotificationChannel[];
  suppressionDuration: number; // 分钟
  maxAlerts: number;
  escalationEnabled: boolean;
  escalationDelay: number; // 分钟
  escalationChannels: NotificationChannel[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastTriggered?: string;
  triggerCount: number;
  status: "active" | "suppressed" | "disabled";
  tags: string[];
}

interface AlertHistory {
  id: string;
  ruleId: string;
  ruleName: string;
  triggeredAt: string;
  resolvedAt?: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  data: Record<string, any>;
  notificationsSent: number;
  status: "triggered" | "resolved" | "suppressed";
}

interface DataSource {
  id: string;
  name: string;
  type: string;
  fields: Array<{
    name: string;
    type: "number" | "string" | "boolean" | "date";
    description: string;
  }>;
}

// 模拟数据
const mockDataSources: DataSource[] = [
  {
    id: "users",
    name: "用户数据",
    type: "database",
    fields: [
      { name: "total_users", type: "number", description: "总用户数" },
      { name: "active_users", type: "number", description: "活跃用户数" },
      { name: "new_registrations", type: "number", description: "新注册用户数" },
      { name: "user_retention_rate", type: "number", description: "用户留存率" },
    ],
  },
  {
    id: "sales",
    name: "销售数据",
    type: "database",
    fields: [
      { name: "daily_revenue", type: "number", description: "日营收" },
      { name: "order_count", type: "number", description: "订单数量" },
      { name: "conversion_rate", type: "number", description: "转化率" },
      { name: "average_order_value", type: "number", description: "平均订单价值" },
    ],
  },
  {
    id: "system",
    name: "系统指标",
    type: "monitoring",
    fields: [
      { name: "cpu_usage", type: "number", description: "CPU使用率" },
      { name: "memory_usage", type: "number", description: "内存使用率" },
      { name: "disk_usage", type: "number", description: "磁盘使用率" },
      { name: "response_time", type: "number", description: "响应时间" },
      { name: "error_rate", type: "number", description: "错误率" },
    ],
  },
];

const mockNotificationChannels: NotificationChannel[] = [
  {
    id: "email-admin",
    type: "email",
    name: "管理员邮件",
    config: {
      recipients: ["admin@yanyu.cloud", "ops@yanyu.cloud"],
      template: "default",
    },
    enabled: true,
  },
  {
    id: "sms-urgent",
    type: "sms",
    name: "紧急短信",
    config: {
      recipients: ["+86138****8888", "+86139****9999"],
    },
    enabled: true,
  },
  {
    id: "webhook-slack",
    type: "webhook",
    name: "Slack通知",
    config: {
      url: "https://hooks.slack.com/services/YOUR_WORKSPACE/YOUR_CHANNEL/YOUR_WEBHOOK_TOKEN",
      template: "slack",
    },
    enabled: true,
  },
  {
    id: "dingtalk-ops",
    type: "dingtalk",
    name: "钉钉运维群",
    config: {
      url: "https://oapi.dingtalk.com/robot/send?access_token=YOUR_ACCESS_TOKEN",
      token: "YOUR_TOKEN",
    },
    enabled: true,
  },
];

// 示例警报配置（使用占位符，无敏感信息）
const alertConfigs: AlertConfig[] = mockNotificationChannels.map(channel => ({
  id: channel.id,
  type: channel.type,
  name: channel.name,
  config: channel.config,
  enabled: channel.enabled,
  priority: "medium",
  conditions: [],
  logicOperator: "AND",
  notifications: [channel],
  suppressionDuration: 60,
  maxAlerts: 10,
  escalationEnabled: false,
  escalationDelay: 30,
  escalationChannels: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: "system",
  triggerCount: 0,
  status: "active",
  tags: [],
}));

// 数据警报组件
export default function DataAlert() {
  const [alerts, setAlerts] = useState<AlertConfig[]>(alertConfigs);
  const [isConfiguring, setIsConfiguring] = useState(false);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">数据警报中心</h1>
          <p className="text-muted-foreground">
            监控系统数据异常，及时发送警报通知
          </p>
        </div>
        <Button
          onClick={() => setIsConfiguring(!isConfiguring)}
          variant="outline"
        >
          <Settings className="w-4 h-4 mr-2" />
          配置管理
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {alerts.map((alert) => (
          <Card key={alert.id} className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{alert.name}</CardTitle>
                <Badge variant={alert.enabled ? "default" : "secondary"}>
                  {alert.enabled ? "启用" : "禁用"}
                </Badge>
              </div>
              <CardDescription>
                类型: {alert.type.toUpperCase()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  配置状态: {alert.enabled ? "正常" : "未激活"}
                </div>
                <div className="flex items-center gap-2">
                  {alert.enabled ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-gray-400" />
                  )}
                  <span className="text-sm">
                    {alert.enabled ? "运行中" : "已停用"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isConfiguring && (
        <Card>
          <CardHeader>
            <CardTitle>警报配置</CardTitle>
            <CardDescription>
              配置各种警报通知方式
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              <p>⚠️ 注意：配置警报时请确保：</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>使用有效的邮箱地址和手机号码</li>
                <li>Webhook URL 必须是可访问的 HTTPS 地址</li>
                <li>钉钉机器人需要正确的 access_token</li>
                <li>不要在代码中硬编码敏感信息</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
