"use client"

import type React from "react"
import { MessageSquare, Layers, Wrench, FileText, ImageIcon, Code, Play, Flag, GitBranch, Globe } from "lucide-react"
import { Card } from "@/components/ui/card"
import { useTranslation } from "@/app/i18n/context"

type NodeType = {
  type: string
  label: string
  icon: React.ReactNode
  color: string
  description: string
}

// 注意：这里我们先定义节点类型的结构，稍后在组件中使用翻译函数

type NodePaletteProps = {
  onAddNode: (type: string) => void
  onClose?: () => void
}

export function NodePalette({ onAddNode, onClose }: NodePaletteProps) {
  const { t } = useTranslation();
  
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType)
    event.dataTransfer.effectAllowed = "move"
  }

  const handleAddNode = (type: string) => {
    onAddNode(type)
    onClose?.()
  }

  // 使用翻译函数的节点类型定义
  const nodeTypes: NodeType[] = [
    {
      type: "start",
      label: t('nodes.start.label'),
      icon: <Play className="h-4 w-4" />,
      color: "bg-green-500",
      description: t('nodes.start.description'),
    },
    {
      type: "prompt",
      label: t('nodes.prompt.label'),
      icon: <FileText className="h-4 w-4" />,
      color: "bg-chart-5",
      description: t('nodes.prompt.description'),
    },
    {
      type: "textModel",
      label: t('nodes.textModel.label'),
      icon: <MessageSquare className="h-4 w-4" />,
      color: "bg-primary",
      description: t('nodes.textModel.description'),
    },
    {
      type: "imageGeneration",
      label: t('nodes.imageGeneration.label'),
      icon: <ImageIcon className="h-4 w-4" />,
      color: "bg-chart-1",
      description: t('nodes.imageGeneration.description'),
    },
    {
      type: "httpRequest",
      label: t('nodes.httpRequest.label'),
      icon: <Globe className="h-4 w-4" />,
      color: "bg-blue-500",
      description: t('nodes.httpRequest.description'),
    },
    {
      type: "conditional",
      label: t('nodes.conditional.label'),
      icon: <GitBranch className="h-4 w-4" />,
      color: "bg-purple-500",
      description: t('nodes.conditional.description'),
    },
    {
      type: "javascript",
      label: t('nodes.javascript.label'),
      icon: <Code className="h-4 w-4" />,
      color: "bg-yellow-500",
      description: t('nodes.javascript.description'),
    },
    {
      type: "embeddingModel",
      label: t('nodes.embeddingModel.label'),
      icon: <Layers className="h-4 w-4" />,
      color: "bg-chart-2",
      description: t('nodes.embeddingModel.description'),
    },
    {
      type: "tool",
      label: t('nodes.tool.label'),
      icon: <Wrench className="h-4 w-4" />,
      color: "bg-chart-4",
      description: t('nodes.tool.description'),
    },
    {
      type: "end",
      label: t('nodes.end.label'),
      icon: <Flag className="h-4 w-4" />,
      color: "bg-red-500",
      description: t('nodes.end.description'),
    },
  ]

  return (
    <aside className="h-full w-80 overflow-y-auto border-r border-border bg-card p-3 md:w-64 md:p-4">
      <h2 className="mb-3 text-sm font-semibold text-foreground md:mb-4">{t('nodes.palette')}</h2>
      <div className="space-y-2">
        {nodeTypes.map((node) => (
          <Card
            key={node.type}
            draggable
            onDragStart={(e) => onDragStart(e, node.type)}
            onClick={() => handleAddNode(node.type)}
            className="cursor-grab border border-border bg-secondary p-2 transition-all hover:border-primary hover:bg-secondary/80 active:cursor-grabbing md:p-3"
          >
            <div className="flex items-center gap-2 md:gap-3">
              <div className={`flex h-7 w-7 items-center justify-center rounded-md md:h-8 md:w-8 ${node.color}`}>
                <div className="text-primary-foreground">{node.icon}</div>
              </div>
              <div className="flex-1">
                <h3 className="text-xs font-medium text-foreground md:text-sm">{node.label}</h3>
                <p className="hidden text-xs text-muted-foreground md:block">{node.description}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </aside>
  )
}
