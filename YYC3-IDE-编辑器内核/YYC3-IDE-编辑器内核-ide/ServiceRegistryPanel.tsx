import { useState, useCallback, useMemo } from 'react'
import {
  Activity,
  Server,
  CheckCircle2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  BarChart3,
  BookOpen,
  Briefcase,
  Brain,
  Search,
  Database,
  Podcast,
  Shield,
  FileText,
  Code2,
  Cpu,
  Globe,
  Mic,
  Volume2,
  Image,
  Film,
  Newspaper,
  MessageSquare,
  Lock,
  Zap,
} from 'lucide-react'
import { PanelHeader } from './PanelManager'
import type { PanelId } from './types/index'
import { AIAgentOrchestrator } from '../../../services/AIAgentOrchestrator'
import { FinanceAnalysisService } from '../../../services/FinanceAnalysisService'
import { EducationService } from '../../../services/EducationService'
import { OfficeAutomationService } from '../../../services/OfficeAutomationService'
import { KnowledgeBaseService } from '../../../services/KnowledgeBaseService'
import { WebScraperService } from '../../../services/WebScraperService'
import { DataVisualizationService } from '../../../services/DataVisualizationService'
import { PodcastGenerator } from '../../../services/PodcastGenerator'
import { SecurityScannerEnhanced } from '../../../services/SecurityScannerEnhanced'
import { DocumentParserService } from '../../../services/DocumentParserService'
import { CodeInterpreterService } from '../../../services/CodeInterpreterService'

interface ServiceEntry {
  id: string
  name: string
  category: string
  icon: React.ReactNode
  getStatus: () => Record<string, unknown>
  color: string
}

const orchestratorInstance = new AIAgentOrchestrator({ enableLogging: false })
const financeInstance = new FinanceAnalysisService()
const educationInstance = new EducationService()
const officeInstance = new OfficeAutomationService()
const knowledgeInstance = new KnowledgeBaseService({ name: 'default' })
const scraperInstance = new WebScraperService()
const datavizInstance = new DataVisualizationService()
const podcastInstance = new PodcastGenerator()
const securityInstance = new SecurityScannerEnhanced()
const docparserInstance = new DocumentParserService()
const codeinterpInstance = new CodeInterpreterService()

const SERVICE_REGISTRY: ServiceEntry[] = [
  { id: 'orchestrator', name: 'AI Agent 编排引擎', category: '核心引擎', icon: <Brain size={16} />, getStatus: () => orchestratorInstance.getStats() as unknown as Record<string, unknown>, color: '#6366f1' },
  { id: 'finance', name: '金融数据分析', category: '数据分析', icon: <BarChart3 size={16} />, getStatus: () => financeInstance.getStatus(), color: '#22c55e' },
  { id: 'education', name: '教育作业批改', category: '智能服务', icon: <BookOpen size={16} />, getStatus: () => educationInstance.getStatus(), color: '#f59e0b' },
  { id: 'office', name: '办公自动化', category: '生产力', icon: <Briefcase size={16} />, getStatus: () => officeInstance.getStatus(), color: '#3b82f6' },
  { id: 'knowledge', name: '向量知识库', category: '数据服务', icon: <Database size={16} />, getStatus: () => knowledgeInstance.getStatus(), color: '#8b5cf6' },
  { id: 'scraper', name: '网页内容抓取', category: '数据服务', icon: <Search size={16} />, getStatus: () => scraperInstance.getStatus(), color: '#06b6d4' },
  { id: 'dataviz', name: '数据可视化', category: '数据分析', icon: <BarChart3 size={16} />, getStatus: () => datavizInstance.getStatus(), color: '#ec4899' },
  { id: 'podcast', name: '播客内容生成', category: '内容生成', icon: <Podcast size={16} />, getStatus: () => podcastInstance.getStatus(), color: '#7c3aed' },
  { id: 'security', name: '安全扫描增强', category: '安全', icon: <Shield size={16} />, getStatus: () => securityInstance.getStatus(), color: '#dc2626' },
  { id: 'docparser', name: '文档解析', category: '数据服务', icon: <FileText size={16} />, getStatus: () => docparserInstance.getStatus(), color: '#65a30d' },
  { id: 'codeinterp', name: '代码解释器', category: '开发工具', icon: <Code2 size={16} />, getStatus: () => codeinterpInstance.getStatus(), color: '#4f46e5' },
]

const CATEGORIES = [...new Set(SERVICE_REGISTRY.map(s => s.category))]

interface ServiceCardProps {
  service: ServiceEntry
  expanded: boolean
  onToggle: () => void
}

function ServiceCard({ service, expanded, onToggle }: ServiceCardProps) {
  const status = service.getStatus()

  return (
    <div
      className="border border-gray-700/50 rounded-lg overflow-hidden hover:border-gray-600/50 transition-colors"
      style={{ borderLeftColor: service.color, borderLeftWidth: 3 }}
    >
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none"
        onClick={onToggle}
      >
        <span style={{ color: service.color }}>{service.icon}</span>
        <span className="text-sm text-gray-200 flex-1">{service.name}</span>
        <CheckCircle2 size={14} className="text-green-500" />
        <span className="text-xs text-gray-500">v{(status.version as string) || '?'}</span>
        {expanded ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronRight size={14} className="text-gray-500" />}
      </div>

      {expanded && (
        <div className="px-3 pb-3 border-t border-gray-700/30">
          <pre className="text-xs text-gray-400 mt-2 overflow-auto max-h-48 bg-gray-800/50 rounded p-2">
            {JSON.stringify(status, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

interface ServiceRegistryPanelProps {
  nodeId?: string
  panelId?: PanelId
}

export function ServiceRegistryPanel({ nodeId = 'service-registry', panelId = 'service-registry' as PanelId }: ServiceRegistryPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [refreshKey, setRefreshKey] = useState(0)

  const toggleExpand = useCallback((id: string) => {
    setExpandedId(prev => prev === id ? null : id)
  }, [])

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  const filteredServices = useMemo(() => {
    if (filterCategory === 'all') return SERVICE_REGISTRY
    return SERVICE_REGISTRY.filter(s => s.category === filterCategory)
  }, [filterCategory])

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    SERVICE_REGISTRY.forEach(s => {
      counts[s.category] = (counts[s.category] || 0) + 1
    })
    return counts
  }, [])

  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-100">
      <PanelHeader nodeId={nodeId} panelId={panelId} title="服务注册中心" icon={<Server size={16} />}>
        <button
          onClick={refresh}
          className="p-1 rounded hover:bg-gray-700 transition-colors"
          title="刷新状态"
        >
          <RefreshCw size={14} className="text-gray-400" />
        </button>
      </PanelHeader>

      <div className="px-3 py-2 border-b border-gray-700/50">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500">分类:</span>
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-2 py-0.5 rounded text-xs transition-colors ${
              filterCategory === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            全部 ({SERVICE_REGISTRY.length})
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-2 py-0.5 rounded text-xs transition-colors ${
                filterCategory === cat ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {cat} ({categoryCounts[cat] || 0})
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-3 py-2 space-y-1.5" key={refreshKey}>
        {filteredServices.map(service => (
          <ServiceCard
            key={service.id}
            service={service}
            expanded={expandedId === service.id}
            onToggle={() => toggleExpand(service.id)}
          />
        ))}
      </div>

      <div className="px-3 py-2 border-t border-gray-700/50 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          <Activity size={12} className="inline mr-1" />
          {filteredServices.length} / {SERVICE_REGISTRY.length} 服务
        </span>
        <span className="text-xs text-gray-600">
          YYC³ Service Registry v1.0.1
        </span>
      </div>
    </div>
  )
}
