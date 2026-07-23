"use client"

import { useState } from "react"
import { MainDashboard } from "@/components/dashboard/main-dashboard"
import { TicketSystem } from "@/components/support/ticket-system"
import { ContractApproval } from "@/components/workflow/contract-approval"
import { FinancialReconciliation } from "@/components/finance/financial-reconciliation"
import { LayoutDashboard, Ticket, FileText, DollarSign, Users, Settings, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"

export default function Home() {
  const [activeTab, setActiveTab] = useState("dashboard")

  const navigationItems = [
    {
      id: "dashboard",
      label: "仪表盘",
      icon: LayoutDashboard,
      component: <MainDashboard />,
    },
    {
      id: "tickets",
      label: "客服工单",
      icon: Ticket,
      component: <TicketSystem />,
    },
    {
      id: "contracts",
      label: "合同审批",
      icon: FileText,
      component: <ContractApproval />,
    },
    {
      id: "reconciliation",
      label: "财务对账",
      icon: DollarSign,
      component: <FinancialReconciliation />,
    },
  ]

  return (
    <div className="flex h-screen bg-background">
      {/* 侧边导航 */}
      <div className="w-64 border-r bg-card">
        <div className="p-6">
          <div className="flex items-center space-x-2 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">Y³</span>
            </div>
            <div>
              <h1 className="text-xl font-bold">YanYu Cloud³</h1>
              <p className="text-xs text-muted-foreground">企业管理系统</p>
            </div>
          </div>

          <nav className="space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors",
                    activeTab === item.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              )
            })}
          </nav>

          <div className="mt-8 pt-8 border-t space-y-2">
            <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
              <BarChart3 className="w-5 h-5" />
              <span className="font-medium">数据分析</span>
            </button>
            <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
              <Users className="w-5 h-5" />
              <span className="font-medium">用户管理</span>
            </button>
            <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
              <Settings className="w-5 h-5" />
              <span className="font-medium">系统设置</span>
            </button>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 overflow-auto">{navigationItems.find((item) => item.id === activeTab)?.component}</div>
    </div>
  )
}
