import { useState, useCallback, useMemo } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Treemap,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  BarChart3,
  Upload,
  Table2,
  Lightbulb,
  RefreshCw,
  Download,
  Maximize2,
  Settings,
  FileSpreadsheet,
  Loader2,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  TrendingUp,
  AlertTriangle,
  Info,
} from 'lucide-react'
import { PanelHeader } from './PanelManager'
import { DataAnalysisService, type ChartConfig, type AnalysisResult, type DataSet } from '../../../services/DataAnalysisService'

const CHART_COLORS = [
  '#6366f1', '#22c55e', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6',
  '#f97316', '#84cc16',
]

interface SampleDataTemplate {
  name: string
  description: string
  csv: string
}

const SAMPLE_TEMPLATES: SampleDataTemplate[] = [
  {
    name: '销售数据',
    description: '月度销售额示例',
    csv: `月份,销售额,成本,利润,订单数
1月,125000,78000,47000,320
2月,138000,82000,56000,380
3月,152000,88000,64000,420
4月,145000,85000,60000,395
5月,168000,92000,76000,450
6月,175000,95000,80000,480`,
  },
  {
    name: '用户数据',
    description: '用户增长与留存',
    csv: `月份,新增用户,活跃用户,留存率,付费转化率
1月,2500,12000,0.72,0.15
2月,2800,13500,0.75,0.16
3月,3100,15200,0.78,0.18
4月,2900,16800,0.76,0.17
5月,3400,18500,0.79,0.19
6月,3600,20200,0.81,0.21`,
  },
  {
    name: '产品数据',
    description: '产品分类统计',
    csv: `产品类别,销量,收入,评分,退货率
电子产品,520,156000,4.5,0.03
服装,380,95000,4.2,0.08
家居用品,210,63000,4.3,0.05
食品饮料,650,45500,4.6,0.02
运动户外,180,72000,4.4,0.06`,
  },
]

export default function ChartPanel({ nodeId }: { nodeId: string }) {
  const [dataSet, setDataSet] = useState<DataSet | null>(null)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [activeChartIndex, setActiveChartIndex] = useState(0)
  const [rawText, setRawText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showStats, setShowStats] = useState(true)
  const [showInsights, setShowInsights] = useState(true)
  const [copiedData, setCopiedData] = useState(false)

  const analysisService = useMemo(() => new DataAnalysisService(), [])

  const handleParse = useCallback((text?: string) => {
    const content = text || rawText.trim()
    if (!content) return

    setIsLoading(true)
    setError(null)

    try {
      let parsed: DataSet

      if (content.trim().startsWith('[') || content.trim().startsWith('{')) {
        parsed = analysisService.parseJSON(content)
      } else {
        parsed = analysisService.parseCSV(content)
      }

      parsed.name = '导入数据'
      setDataSet(parsed)

      const result = analysisService.analyze(parsed, {
        autoDetectCharts: true,
        maxCharts: 6,
      })

      setAnalysisResult(result)
      setActiveChartIndex(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : '解析失败，请检查数据格式')
      setDataSet(null)
      setAnalysisResult(null)
    } finally {
      setIsLoading(false)
    }
  }, [rawText, analysisService])

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setRawText(text)
      handleParse(text)
    }
    reader.readAsText(file)
  }, [handleParse])

  const handleLoadSample = useCallback((template: SampleDataTemplate) => {
    setRawText(template.csv)
    handleParse(template.csv)
  }, [handleParse])

  const handleExportCSV = useCallback(() => {
    if (!dataSet) return

    const csv = analysisService.exportToCSV(dataSet)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${dataSet.name || 'data'}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }, [dataSet, analysisService])

  const handleCopyData = useCallback(async () => {
    if (!analysisResult) return

    const text = JSON.stringify(analysisResult.dataSet.rows.slice(0, 20), null, 2)
    await navigator.clipboard.writeText(text)
    setCopiedData(true)
    setTimeout(() => setCopiedData(false), 2000)
  }, [analysisResult])

  const activeChart = analysisResult?.charts[activeChartIndex]

  const chartData = useMemo(() => {
    if (!dataSet || !activeChart) return []

    return dataSet.rows.map(row => {
      const point: Record<string, any> = {}

      if (activeChart.xAxis) {
        point['xLabel'] = row[activeChart.xAxis.key]
      }
      if (activeChart.yAxis) {
        point['yValue'] = Number(row[activeChart.yAxis.key]) || 0
      }

      activeChart.series.forEach(s => {
        point[s.label || s.key] = Number(row[s.key]) || 0
      })

      return point
    })
  }, [dataSet, activeChart])

  return (
    <div className="size-full flex flex-col bg-[var(--ide-bg)]">
      <PanelHeader
        nodeId={nodeId}
        panelId="chart"
        title="数据分析"
        icon={<BarChart3 className="w-3 h-3 text-emerald-400/70" />}
      >
        <button
          onClick={handleExportCSV}
          disabled={!dataSet}
          className="w-5 h-5 rounded flex items-center justify-center hover:bg-white/5 disabled:opacity-30"
          title="导出CSV"
        >
          <Download className="w-3 h-3 text-slate-600" />
        </button>
        <button
          onClick={handleCopyData}
          disabled={!analysisResult}
          className="w-5 h-5 rounded flex items-center justify-center hover:bg-white/5 disabled:opacity-30"
          title="复制数据"
        >
          {copiedData ? (
            <Check className="w-3 h-3 text-green-400" />
          ) : (
            <Copy className="w-3 h-3 text-slate-600" />
          )}
        </button>
      </PanelHeader>

      {/* Input Area */}
      {!dataSet && !isLoading && (
        <div className="px-3 pt-3 pb-2">
          <div className="flex gap-2 mb-2">
            <label className="flex-1 relative cursor-pointer">
              <input
                type="file"
                accept=".csv,.json,.tsv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="px-3 py-2 bg-white/[0.03] border border-dashed border-white/10 rounded-md text-center hover:border-blue-500/30 transition-colors">
                <Upload className="w-4 h-4 mx-auto mb-1 text-slate-500" />
                <span className="text-[11px] text-slate-500">上传 CSV/JSON 文件</span>
              </div>
            </label>
            <label className="relative cursor-pointer">
              <input
                type="file"
                accept=".csv,.json,.tsv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-md text-center hover:bg-blue-500/20 transition-colors">
                <FileSpreadsheet className="w-4 h-4 mx-auto mb-1 text-blue-400" />
                <span className="text-[11px] text-blue-400">导入</span>
              </div>
            </label>
          </div>

          <textarea
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            placeholder="或粘贴 CSV / JSON 数据..."
            rows={5}
            className="w-full px-3 py-2 bg-white/[0.02] border border-white/10 rounded-md text-[11px] text-slate-300 placeholder:text-slate-700 font-mono resize-y focus:outline-none focus:border-emerald-500/50"
          />

          <button
            onClick={() => handleParse()}
            disabled={!rawText.trim()}
            className="mt-2 w-full px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-md text-xs font-medium transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            分析数据
          </button>

          {/* Sample Templates */}
          <div className="mt-3">
            <p className="text-[10px] text-slate-600 mb-1.5">示例数据</p>
            <div className="flex gap-1.5 flex-wrap">
              {SAMPLE_TEMPLATES.map(t => (
                <button
                  key={t.name}
                  onClick={() => handleLoadSample(t)}
                  className="px-2 py-1 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 rounded text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-3 mt-3 p-2.5 bg-red-500/10 border border-red-500/20 rounded-md">
          <p className="text-[11px] text-red-400">{error}</p>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-400/50" />
          <p className="text-[11px] text-slate-500">正在分析数据...</p>
        </div>
      )}

      {/* Analysis Results */}
      {analysisResult && dataSet && (
        <div className="flex-1 overflow-y-auto">
          {/* Insights */}
          {showInsights && analysisResult.insights.length > 0 && (
            <div className="mx-3 mt-3 p-2.5 bg-indigo-500/5 border border-indigo-500/10 rounded-lg">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px] font-medium text-amber-300">数据洞察</span>
                </div>
                <button
                  onClick={() => setShowInsights(false)}
                  className="w-4 h-4 rounded hover:bg-white/10 flex items-center justify-center"
                >
                  <ChevronDown className="w-3 h-3 text-slate-600" />
                </button>
              </div>
              <ul className="space-y-1">
                {analysisResult.insights.map((insight, i) => (
                  <li key={i} className="text-[10px] text-slate-400 leading-relaxed pl-2">
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Chart Type Tabs */}
          {analysisResult.charts.length > 0 && (
            <div className="px-3 mt-3">
              <div className="flex items-center gap-1 mb-2 overflow-x-auto pb-1">
                {analysisResult.charts.map((chart, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveChartIndex(idx)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-medium whitespace-nowrap transition-colors ${
                      activeChartIndex === idx
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'text-slate-600 hover:text-slate-400 hover:bg-white/5'
                    }`}
                  >
                    {getChartIcon(chart.type)}
                    {chart.title.split('-').pop()?.trim() || chart.type}
                  </button>
                ))}
              </div>

              {/* Chart Display */}
              <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3 min-h-[240px]">
                {activeChart && (
                  <ResponsiveContainer width="100%" height={260}>
                    {renderChart(activeChart, chartData)}
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          )}

          {/* Statistics Summary */}
          {showStats && analysisResult.summary && (
            <div className="mx-3 mt-3 p-2.5 bg-white/[0.02] border border-white/5 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Table2 className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-[11px] font-medium text-slate-400">
                    统计摘要 ({dataSet.rows.length} 行 × {dataSet.columns.length} 列)
                  </span>
                </div>
                <button
                  onClick={() => setShowStats(false)}
                  className="w-4 h-4 rounded hover:bg-white/10 flex items-center justify-center"
                >
                  <ChevronDown className="w-3 h-3 text-slate-600" />
                </button>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {dataSet.columns.filter(c => c.type === 'number').slice(0, 5).map(col => {
                  const stats = analysisResult.summary[col.key]
                  if (!stats) return null

                  return (
                    <details key={col.key} className="group">
                      <summary className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-400 hover:text-slate-300 list-none">
                        <ChevronRight className="w-3 h-3 group-open:rotate-90 transition-transform text-slate-700" />
                        <span className="font-medium">{col.label}</span>
                        <span className="text-[9px] text-slate-600 ml-auto">
                          均值: {stats.mean?.toLocaleString()} | 范围: [{stats.min?.toLocaleString()}, {stats.max?.toLocaleString()}]
                        </span>
                      </summary>
                      <div className="ml-5 mt-1.5 grid grid-cols-3 gap-x-3 gap-y-0.5 text-[9px] text-slate-500">
                        <div>计数: <span className="text-slate-400">{stats.count}</span></div>
                        <div>总和: <span className="text-slate-400">{stats.sum?.toLocaleString()}</span></div>
                        <div>均值: <span className="text-slate-400">{stats.mean?.toLocaleString()}</span></div>
                        <div>中位数: <span className="text-slate-400">{stats.median?.toLocaleString()}</span></div>
                        <div>标准差: <span className="text-slate-400">{stats.stdDev?.toLocaleString()}</span></div>
                        <div>缺失率: <span className={`${stats.missingRatio > 0.1 ? 'text-amber-400' : 'text-slate-400'}`}>{(stats.missingRatio * 100).toFixed(1)}%</span></div>
                      </div>
                    </details>
                  )
                })}
              </div>
            </div>
          )}

          {/* Action Bar */}
          <div className="px-3 py-3 mt-2 flex items-center justify-between border-t border-white/5">
            <button
              onClick={() => {
                setDataSet(null)
                setAnalysisResult(null)
                setRawText('')
                setError(null)
              }}
              className="px-3 py-1.5 bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 rounded-md text-[10px] transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3 h-3" />
              新建分析
            </button>
            <span className="text-[9px] text-slate-700">
              YYC³ DataAnalysis
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function getChartIcon(type: ChartConfig['type']): string {
  switch (type) {
    case 'bar': return '📊 '
    case 'line': return '📈 '
    case 'area': return '📉 '
    case 'pie': return '🥧 '
    case 'scatter': return '⚬ '
    case 'radar': return '🕸️ '
    case 'treemap': return '🗂️ '
    case 'funnel': return '🔽 '
    default: return '📊 '
  }
}

function renderChart(config: ChartConfig, data: Record<string, any>[]): React.ReactNode {
  const commonProps = {
    data,
    margin: { top: 10, right: 10, left: 0, bottom: 0 },
  }

  switch (config.type) {
    case 'bar':
      return (
        <BarChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
          <XAxis dataKey="xLabel" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={40} />
          <Tooltip
            contentStyle={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 8,
              fontSize: 11,
              color: '#e2e8f0',
            }}
          />
          {config.series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.label || s.key}
              fill={s.color || CHART_COLORS[i % CHART_COLORS.length]}
              radius={[4, 4, 0, 0]}
              stackId={config.options?.stacked ? 'stack' : undefined}
            />
          ))}
        </BarChart>
      )

    case 'line':
      return (
        <LineChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
          <XAxis dataKey="xLabel" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={40} />
          <Tooltip
            contentStyle={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 8,
              fontSize: 11,
              color: '#e2e8f0',
            }}
          />
          {config.series.map((s, i) => (
            <Line
              key={s.key}
              type={config.options?.curveType || 'monotone'}
              dataKey={s.label || s.key}
              stroke={s.color || CHART_COLORS[i % CHART_COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3, fill: s.color || CHART_COLORS[i % CHART_COLORS.length] }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      )

    case 'area':
      return (
        <AreaChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
          <XAxis dataKey="xLabel" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={40} />
          <Tooltip
            contentStyle={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 8,
              fontSize: 11,
              color: '#e2e8f0',
            }}
          />
          {config.options?.showLegend !== false && <Legend wrapperStyle={{ fontSize: 10 }} />}
          {config.series.map((s, i) => (
            <Area
              key={s.key}
              type={config.options?.curveType || 'monotone'}
              dataKey={s.label || s.key}
              stroke={s.color || CHART_COLORS[i % CHART_COLORS.length]}
              fill={s.color || CHART_COLORS[i % CHART_COLORS.length]}
              fillOpacity={0.15}
              strokeWidth={2}
              stackId={config.options?.stacked ? 'stack' : undefined}
            />
          ))}
        </AreaChart>
      )

    case 'pie':
      return (
        <PieChart {...commonProps}>
          <Pie
            data={data}
            dataKey={config.series[0]?.key || 'yValue'}
            nameKey="xLabel"
            cx="50%"
            cy="50%"
            outerRadius={80}
            innerRadius={config.options?.doughnut ? 50 : 0}
            paddingAngle={2}
            label
          >
            {data.map((_entry: any, index: number) => (
              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 8,
              fontSize: 11,
              color: '#e2e8f0',
            }}
          />
          {config.options?.showLegend !== false && <Legend wrapperStyle={{ fontSize: 10 }} />}
        </PieChart>
      )

    case 'scatter':
      return (
        <ScatterChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
          <XAxis dataKey={Object.keys(data[0] || {})[0] || 'xLabel'} tick={{ fontSize: 10, fill: '#94a3b8' }} name={config.xAxis?.label || 'X'} />
          <YAxis dataKey={Object.keys(data[0] || {})[1] || 'yValue'} tick={{ fontSize: 10, fill: '#94a3b8' }} name={config.yAxis?.label || 'Y'} width={40} />
          <Tooltip
            contentStyle={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 8,
              fontSize: 11,
              color: '#e2e8f0',
            }}
            cursor={{ strokeDasharray: '3 3' }}
          />
          <Scatter
            data={data}
            fill={config.series[0]?.color || CHART_COLORS[0]}
            fillOpacity={0.7}
          />
        </ScatterChart>
      )

    default:
      return (
        <div className="flex items-center justify-center h-full text-slate-500 text-sm">
          图表类型 "{config.type}" 暂不支持渲染
        </div>
      )
  }
}
