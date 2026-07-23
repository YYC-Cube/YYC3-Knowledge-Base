/**
 * 工作流设计器组件
 * 基于ReactFlow实现的可视化工作流设计器
 */

"use client";

import React, { useState, useCallback, useEffect } from "react";
import ReactFlow, {
  addEdge,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Edge,
  Node,
  Connection,
  NodeTypes,
  Panel,
} from "reactflow";
import "reactflow/dist/style.css";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Play,
  Square,
  GitBranch,
  CheckCircle,
  Clock,
  Webhook,
  Code,
  Settings,
  Plus,
  Save,
  Eye,
  Edit,
  Trash2,
} from "lucide-react";

import {
  WorkflowDefinition,
  WorkflowNode,
  WorkflowEdge,
  WorkflowVariable,
} from "@/types/workflow";

// 自定义节点组件
const CustomNode = ({ data, selected }: { data: any; selected: boolean }) => {
  const getNodeIcon = (type: string) => {
    switch (type) {
      case "start":
        return <Play className="w-4 h-4" />;
      case "end":
        return <Square className="w-4 h-4" />;
      case "task":
        return <CheckCircle className="w-4 h-4" />;
      case "approval":
        return <CheckCircle className="w-4 h-4 text-orange-500" />;
      case "condition":
        return <GitBranch className="w-4 h-4" />;
      case "timer":
        return <Clock className="w-4 h-4" />;
      case "webhook":
        return <Webhook className="w-4 h-4" />;
      case "script":
        return <Code className="w-4 h-4" />;
      default:
        return <Settings className="w-4 h-4" />;
    }
  };

  const getNodeColor = (type: string) => {
    switch (type) {
      case "start":
        return "bg-green-100 border-green-300 text-green-800";
      case "end":
        return "bg-red-100 border-red-300 text-red-800";
      case "task":
        return "bg-blue-100 border-blue-300 text-blue-800";
      case "approval":
        return "bg-orange-100 border-orange-300 text-orange-800";
      case "condition":
        return "bg-purple-100 border-purple-300 text-purple-800";
      case "timer":
        return "bg-yellow-100 border-yellow-300 text-yellow-800";
      case "webhook":
        return "bg-indigo-100 border-indigo-300 text-indigo-800";
      case "script":
        return "bg-gray-100 border-gray-300 text-gray-800";
      default:
        return "bg-gray-100 border-gray-300 text-gray-800";
    }
  };

  return (
    <div
      className={`px-4 py-2 shadow-md rounded-lg border-2 min-w-[100px] ${getNodeColor(
        data.type
      )} ${selected ? "ring-2 ring-blue-500" : ""}`}
    >
      <div className="flex items-center gap-2">
        {getNodeIcon(data.type)}
        <div className="text-sm font-medium">{data.label}</div>
      </div>
      {data.description && (
        <div className="text-xs opacity-75 mt-1">{data.description}</div>
      )}
    </div>
  );
}

// 已有具名导出，不需要重复的默认导出

// 节点类型映射
const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

interface WorkflowDesignerProps {
  initialWorkflow?: WorkflowDefinition;
  onSave?: (workflow: Partial<WorkflowDefinition>) => void;
  readOnly?: boolean;
  className?: string;
}

export function WorkflowDesigner({
  initialWorkflow,
  onSave,
  readOnly = false,
  className = "",
}: WorkflowDesignerProps) {
  // 工作流基本信息
  const [name, setName] = useState(initialWorkflow?.name || "");
  const [description, setDescription] = useState(
    initialWorkflow?.description || ""
  );

  // 流程图节点和边
  const [nodes, setNodes, onNodesChange] = useNodesState(
    initialWorkflow?.nodes.map((node) => ({
      id: node.id,
      type: "custom",
      position: node.position || { x: 100, y: 100 },
      data: {
        label: node.name,
        description: node.description,
        type: node.type,
        config: node.config,
      },
    })) || []
  );

  const [edges, setEdges, onEdgesChange] = useEdgesState(
    initialWorkflow?.edges.map((edge) => ({
      id: edge.id,
      source: edge.sourceNodeId,
      target: edge.targetNodeId,
      type: "smoothstep",
      animated: true,
      style: { stroke: "#555" },
      data: edge.condition,
      label: edge.condition?.description,
    })) || []
  );

  // 工作流变量
  const [variables, setVariables] = useState<WorkflowVariable[]>(
    initialWorkflow?.variables || []
  );

  // 对话框状态
  const [isNodeDialogOpen, setIsNodeDialogOpen] = useState(false);
  const [isEdgeDialogOpen, setIsEdgeDialogOpen] = useState(false);
  const [isVariableDialogOpen, setIsVariableDialogOpen] = useState(false);

  // 当前编辑的元素
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [editingVariable, setEditingVariable] =
    useState<WorkflowVariable | null>(null);

  // 节点编辑表单状态
  const [nodeFormData, setNodeFormData] = useState({
    label: "",
    description: "",
    type: "task",
    config: {},
  });

  // 处理节点点击
  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (readOnly) return;
      setSelectedNode(node);
      setNodeFormData({
        label: node.data.label,
        description: node.data.description || "",
        type: node.data.type,
        config: node.data.config || {},
      });
      setIsNodeDialogOpen(true);
    },
    [readOnly]
  );

  // 处理边点击
  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      if (readOnly) return;
      setSelectedEdge(edge);
      setIsEdgeDialogOpen(true);
    },
    [readOnly]
  );

  // 处理连接
  const onConnect = useCallback(
    (params: Connection) => {
      if (readOnly) return;
      setEdges((edges) =>
        addEdge(
          {
            ...params,
            type: "smoothstep",
            animated: true,
            style: { stroke: "#555" },
          },
          edges
        )
      );
    },
    [setEdges, readOnly]
  );

  // 添加新节点
  const addNode = (type: string) => {
    if (readOnly) return;

    const nodeNames = {
      start: "开始",
      end: "结束",
      task: "任务",
      approval: "审批",
      condition: "条件",
      parallel: "并行",
      gateway: "网关",
      timer: "定时",
      webhook: "API调用",
      script: "脚本",
    } as Record<string, string>;

    const newNode: Node = {
      id: `node_${Date.now()}`,
      type: "custom",
      position: { x: 100 + nodes.length * 20, y: 100 + nodes.length * 20 },
      data: {
        label: nodeNames[type] || "新节点",
        type,
        config: {},
      },
    };

    setNodes((nodes) => [...nodes, newNode]);
  };

  // 保存节点编辑
  const saveNodeEdit = () => {
    if (!selectedNode) return;

    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === selectedNode.id) {
          return {
            ...node,
            data: {
              ...node.data,
              label: nodeFormData.label,
              description: nodeFormData.description,
              config: nodeFormData.config,
            },
          };
        }
        return node;
      })
    );

    setIsNodeDialogOpen(false);
    setSelectedNode(null);
  };

  // 删除节点
  const deleteNode = () => {
    if (!selectedNode) return;

    setNodes((nodes) => nodes.filter((n) => n.id !== selectedNode.id));
    setEdges((edges) =>
      edges.filter(
        (e) => e.source !== selectedNode.id && e.target !== selectedNode.id
      )
    );

    setIsNodeDialogOpen(false);
    setSelectedNode(null);
  };

  // 保存边编辑
  const saveEdgeEdit = (condition: string, description: string) => {
    if (!selectedEdge) return;

    setEdges((edges) =>
      edges.map((edge) => {
        if (edge.id === selectedEdge.id) {
          return {
            ...edge,
            data: condition
              ? { expression: condition, description }
              : undefined,
            label: description || undefined,
          };
        }
        return edge;
      })
    );

    setIsEdgeDialogOpen(false);
    setSelectedEdge(null);
  };

  // 删除边
  const deleteEdge = () => {
    if (!selectedEdge) return;

    setEdges((edges) => edges.filter((e) => e.id !== selectedEdge.id));
    setIsEdgeDialogOpen(false);
    setSelectedEdge(null);
  };

  // 保存工作流
  const saveWorkflow = () => {
    if (!name) {
      toast.error("工作流名称不能为空");
      return;
    }

    if (nodes.length === 0) {
      toast.error("工作流必须至少包含一个节点");
      return;
    }

    // 构造工作流定义
    const workflow: Partial<WorkflowDefinition> = {
      name,
      description,
      nodes: nodes.map((node) => ({
        id: node.id,
        type: node.data.type,
        name: node.data.label,
        description: node.data.description,
        config: node.data.config,
        position: node.position,
      })),
      edges: edges.map((edge) => ({
        id: edge.id,
        sourceNodeId: edge.source!,
        targetNodeId: edge.target!,
        condition: edge.data,
      })),
      variables,
    };

    onSave?.(workflow);
    toast.success("工作流已保存");
  };

  // 工具栏渲染
  const renderToolbar = () => (
    <Panel
      position="top-left"
      className="bg-white p-3 rounded-lg shadow-lg border"
    >
      <div className="flex flex-col gap-3">
        <div className="text-sm font-medium text-gray-700">添加节点</div>
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" variant="outline" onClick={() => addNode("start")}>
            <Play className="w-3 h-3 mr-1" />
            开始
          </Button>
          <Button size="sm" variant="outline" onClick={() => addNode("end")}>
            <Square className="w-3 h-3 mr-1" />
            结束
          </Button>
          <Button size="sm" variant="outline" onClick={() => addNode("task")}>
            <CheckCircle className="w-3 h-3 mr-1" />
            任务
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => addNode("approval")}
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            审批
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => addNode("condition")}
          >
            <GitBranch className="w-3 h-3 mr-1" />
            条件
          </Button>
          <Button size="sm" variant="outline" onClick={() => addNode("timer")}>
            <Clock className="w-3 h-3 mr-1" />
            定时
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => addNode("webhook")}
          >
            <Webhook className="w-3 h-3 mr-1" />
            API
          </Button>
          <Button size="sm" variant="outline" onClick={() => addNode("script")}>
            <Code className="w-3 h-3 mr-1" />
            脚本
          </Button>
        </div>
      </div>
    </Panel>
  );

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* 工作流基本信息 */}
      <div className="bg-white p-4 border-b flex-shrink-0">
        <div className="flex justify-between items-center">
          <div className="flex-1 max-w-2xl">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="工作流名称"
              className="text-lg font-medium mb-2"
              disabled={readOnly}
            />
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="工作流描述"
              disabled={readOnly}
            />
          </div>
          <div className="flex gap-2 ml-4">
            <Button
              variant="outline"
              onClick={() => setIsVariableDialogOpen(true)}
              disabled={readOnly}
            >
              <Settings className="w-4 h-4 mr-1" />
              变量管理
            </Button>
            <Button onClick={saveWorkflow} disabled={readOnly}>
              <Save className="w-4 h-4 mr-1" />
              保存工作流
            </Button>
          </div>
        </div>
      </div>

      {/* 工作流设计器 */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={readOnly ? undefined : onNodesChange}
          onEdgesChange={readOnly ? undefined : onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-right"
          className="bg-gray-50"
        >
          {!readOnly && renderToolbar()}
          <Background color="#f1f5f9" gap={20} />
          <Controls />
          <MiniMap
            nodeColor={() => "#e2e8f0"}
            maskColor="rgba(255, 255, 255, 0.8)"
            position="bottom-left"
          />
        </ReactFlow>
      </div>

      {/* 节点编辑对话框 */}
      <Dialog open={isNodeDialogOpen} onOpenChange={setIsNodeDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑节点</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList>
              <TabsTrigger value="basic">基本信息</TabsTrigger>
              <TabsTrigger value="config">节点配置</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div>
                <Label htmlFor="node-label">节点名称</Label>
                <Input
                  id="node-label"
                  value={nodeFormData.label}
                  onChange={(e) =>
                    setNodeFormData((prev) => ({
                      ...prev,
                      label: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="node-description">节点描述</Label>
                <Textarea
                  id="node-description"
                  value={nodeFormData.description}
                  onChange={(e) =>
                    setNodeFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="node-type">节点类型</Label>
                <Select
                  value={nodeFormData.type}
                  onValueChange={(value) =>
                    setNodeFormData((prev) => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger id="node-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="start">开始节点</SelectItem>
                    <SelectItem value="end">结束节点</SelectItem>
                    <SelectItem value="task">任务节点</SelectItem>
                    <SelectItem value="approval">审批节点</SelectItem>
                    <SelectItem value="condition">条件节点</SelectItem>
                    <SelectItem value="parallel">并行节点</SelectItem>
                    <SelectItem value="gateway">网关节点</SelectItem>
                    <SelectItem value="timer">定时节点</SelectItem>
                    <SelectItem value="webhook">API调用节点</SelectItem>
                    <SelectItem value="script">脚本节点</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="config">
              <Card>
                <CardHeader>
                  <CardTitle>节点配置</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-500">
                    根据节点类型配置相应的参数...
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsNodeDialogOpen(false)}
            >
              取消
            </Button>
            <Button variant="destructive" onClick={deleteNode}>
              <Trash2 className="w-4 h-4 mr-1" />
              删除
            </Button>
            <Button onClick={saveNodeEdit}>
              <Save className="w-4 h-4 mr-1" />
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 边编辑对话框 */}
      <Dialog open={isEdgeDialogOpen} onOpenChange={setIsEdgeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>编辑连线条件</DialogTitle>
          </DialogHeader>
          <EdgeEditForm
            edge={selectedEdge}
            onSave={saveEdgeEdit}
            onDelete={deleteEdge}
            onCancel={() => setIsEdgeDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* 变量管理对话框 */}
      <Dialog
        open={isVariableDialogOpen}
        onOpenChange={setIsVariableDialogOpen}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>管理工作流变量</DialogTitle>
          </DialogHeader>
          <VariableManager
            variables={variables}
            onChange={setVariables}
            onClose={() => setIsVariableDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 边编辑表单组件
function EdgeEditForm({
  edge,
  onSave,
  onDelete,
  onCancel,
}: {
  edge: Edge | null;
  onSave: (condition: string, description: string) => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  const [condition, setCondition] = useState(edge?.data?.expression || "");
  const [description, setDescription] = useState(edge?.data?.description || "");

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="edge-condition">条件表达式</Label>
        <Input
          id="edge-condition"
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          placeholder="例如: data.amount > 1000"
        />
      </div>
      <div>
        <Label htmlFor="edge-description">条件描述</Label>
        <Input
          id="edge-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="例如: 金额大于1000元"
        />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button variant="destructive" onClick={onDelete}>
          删除
        </Button>
        <Button onClick={() => onSave(condition, description)}>保存</Button>
      </DialogFooter>
    </div>
  );
}

// 变量管理组件
function VariableManager({
  variables,
  onChange,
  onClose,
}: {
  variables: WorkflowVariable[];
  onChange: (variables: WorkflowVariable[]) => void;
  onClose: () => void;
}) {
  const [editingVariable, setEditingVariable] =
    useState<WorkflowVariable | null>(null);
  const [showForm, setShowForm] = useState(false);

  const addVariable = () => {
    setEditingVariable({
      id: `var_${Date.now()}`,
      name: "",
      type: "string",
      required: false,
      description: "",
    });
    setShowForm(true);
  };

  const editVariable = (variable: WorkflowVariable) => {
    setEditingVariable(variable);
    setShowForm(true);
  };

  const saveVariable = (variable: WorkflowVariable) => {
    const existingIndex = variables.findIndex((v) => v.id === variable.id);
    if (existingIndex >= 0) {
      onChange(variables.map((v, i) => (i === existingIndex ? variable : v)));
    } else {
      onChange([...variables, variable]);
    }
    setShowForm(false);
    setEditingVariable(null);
  };

  const deleteVariable = (id: string) => {
    onChange(variables.filter((v) => v.id !== id));
  };

  return (
    <div className="space-y-4">
      {!showForm && (
        <>
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              共 {variables.length} 个变量
            </div>
            <Button size="sm" onClick={addVariable}>
              <Plus className="w-4 h-4 mr-1" />
              添加变量
            </Button>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {variables.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                暂无变量，点击上方按钮添加
              </div>
            ) : (
              <div className="space-y-2">
                {variables.map((variable) => (
                  <div
                    key={variable.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <div className="font-medium">{variable.name}</div>
                      <div className="text-sm text-gray-500">
                        {variable.type} {variable.required && "(必填)"}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => editVariable(variable)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500"
                        onClick={() => deleteVariable(variable.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={onClose}>完成</Button>
          </DialogFooter>
        </>
      )}

      {showForm && editingVariable && (
        <VariableForm
          variable={editingVariable}
          onSave={saveVariable}
          onCancel={() => {
            setShowForm(false);
            setEditingVariable(null);
          }}
        />
      )}
    </div>
  );
}

// 变量表单组件
function VariableForm({
  variable,
  onSave,
  onCancel,
}: {
  variable: WorkflowVariable;
  onSave: (variable: WorkflowVariable) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState(variable);

  const handleSave = () => {
    if (!formData.name) {
      toast.error("变量名称不能为空");
      return;
    }
    onSave(formData);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="var-name">变量名称</Label>
        <Input
          id="var-name"
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          placeholder="变量名称"
        />
      </div>
      <div>
        <Label htmlFor="var-type">变量类型</Label>
        <Select
          value={formData.type}
          onValueChange={(value) =>
            setFormData((prev) => ({ ...prev, type: value as any }))
          }
        >
          <SelectTrigger id="var-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="string">字符串</SelectItem>
            <SelectItem value="number">数字</SelectItem>
            <SelectItem value="boolean">布尔值</SelectItem>
            <SelectItem value="date">日期</SelectItem>
            <SelectItem value="array">数组</SelectItem>
            <SelectItem value="object">对象</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="var-default">默认值</Label>
        <Input
          id="var-default"
          value={String(formData.defaultValue || "")}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, defaultValue: e.target.value }))
          }
          placeholder="默认值"
        />
      </div>
      <div>
        <Label htmlFor="var-description">描述</Label>
        <Textarea
          id="var-description"
          value={formData.description || ""}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, description: e.target.value }))
          }
          placeholder="变量描述"
        />
      </div>
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="var-required"
          checked={formData.required}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, required: e.target.checked }))
          }
          aria-label="是否必填"
        />
        <Label htmlFor="var-required">必填</Label>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button onClick={handleSave}>保存</Button>
      </DialogFooter>
    </div>
  );
}
