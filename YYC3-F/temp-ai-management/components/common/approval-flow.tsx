"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, XCircle, Clock, AlertCircle, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ApprovalStep {
  id: string
  name: string
  assignee: string
  assigneeName: string
  status: "pending" | "approved" | "rejected" | "skipped"
  comments?: string
  processedAt?: string
  dueDate: string
}

interface ApprovalFlowProps {
  steps: ApprovalStep[]
  currentStep: number
  onApprove?: (stepId: string, comments?: string) => void
  onReject?: (stepId: string, comments: string) => void
  className?: string
}

export function ApprovalFlow({ steps, currentStep, onApprove, onReject, className }: ApprovalFlowProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case "rejected":
        return <XCircle className="w-5 h-5 text-red-600" />
      case "pending":
        return <Clock className="w-5 h-5 text-yellow-600" />
      case "skipped":
        return <AlertCircle className="w-5 h-5 text-gray-400" />
      default:
        return <Clock className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-100 text-green-800">已通过</Badge>
      case "rejected":
        return <Badge className="bg-red-100 text-red-800">已拒绝</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">待处理</Badge>
      case "skipped":
        return <Badge variant="secondary">已跳过</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>审批流程</span>
          <span className="text-sm font-normal text-muted-foreground">
            当前步骤: {currentStep}/{steps.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* 流程进度条 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                    index < currentStep
                      ? "bg-green-100 text-green-600"
                      : index === currentStep - 1
                        ? "bg-blue-100 text-blue-600"
                        : "bg-gray-100 text-gray-400",
                  )}
                >
                  {index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div className={cn("w-12 h-0.5 mx-1", index < currentStep - 1 ? "bg-green-400" : "bg-gray-200")} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            {steps.map((step) => (
              <div key={step.id} className="text-center" style={{ width: "80px" }}>
                {step.name}
              </div>
            ))}
          </div>
        </div>

        {/* 详细步骤 */}
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={step.id}>
              <div className="flex items-start space-x-3">
                <div className="mt-1">{getStatusIcon(step.status)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium">{step.name}</h4>
                      {getStatusBadge(step.status)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      截止: {new Date(step.dueDate).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 mb-2">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="text-xs">{step.assigneeName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground">{step.assigneeName}</span>
                  </div>

                  {step.comments && (
                    <div className="flex items-start space-x-2 p-2 bg-muted rounded text-sm">
                      <MessageSquare className="w-4 h-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <div className="text-muted-foreground">{step.comments}</div>
                        {step.processedAt && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(step.processedAt).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {step.status === "pending" && index === currentStep - 1 && (onApprove || onReject) && (
                    <div className="flex gap-2 mt-3">
                      {onApprove && (
                        <Button
                          size="sm"
                          onClick={() => onApprove(step.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          通过
                        </Button>
                      )}
                      {onReject && (
                        <Button size="sm" variant="destructive" onClick={() => onReject(step.id, "需要修改")}>
                          <XCircle className="w-4 h-4 mr-1" />
                          拒绝
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {index < steps.length - 1 && <Separator className="my-3" />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
