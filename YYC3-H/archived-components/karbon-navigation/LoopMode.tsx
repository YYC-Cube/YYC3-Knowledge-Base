import { useState, useEffect } from 'react';
import { Play, Pause, Square, CheckCircle2, AlertCircle, Loader2, ChevronRight, Activity, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface WorkflowStep {
  id: string;
  nameKey: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: number;
  duration?: string;
  outputKey?: string;
  outputParams?: string[];
}

interface Workflow {
  id: string;
  nameKey: string;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed';
  currentStep?: number;
  totalSteps: number;
  startTime?: Date;
  steps: WorkflowStep[];
  type: 'analysis' | 'optimization' | 'generation' | 'monitoring';
}

const translations = {
  zh: {
    live_loops: '实时执行循环',
    active: '活跃',
    completed: '已完成',
    step: '步骤',
    of: '/',
    types: {
      analysis: '分析',
      optimization: '优化',
      generation: '生成',
      monitoring: '监控'
    },
    workflows: {
      market_analysis: '市场分析流水线',
      ui_optimization: 'UI 组件优化',
      content_gen: '内容生成循环',
      monitoring: '实时用户监控',
      steps: {
        data_coll: '数据收集',
        pattern_rec: '模式识别',
        trend_analysis: '趋势分析',
        insight_gen: '洞察生成',
        report_comp: '报告编译',
        perf_audit: '性能审计',
        code_refactor: '代码重构',
        bundle_opt: '打包优化',
        qa: '质量保证',
        context_analysis: '语境分析',
        draft_gen: '草稿生成',
        qual_check: '质量检查',
        finalization: '定稿',
        cont_mon: '持续监控'
      },
      outputs: {
        collected_points: '收集了 {0} 个数据点',
        found_bottlenecks: '发现 {0} 个瓶颈',
        optimized_comps: '优化了 {0} 个组件',
        analyzed_voice: '已分析品牌语调',
        generated_variants: '生成了 {0} 个变体',
        variants_passed: '所有变体已通过',
        ready: '内容就绪',
        active_users: '活跃用户: {0} | 事件/分: {1}'
      }
    }
  },
  en: {
    live_loops: 'Live Execution Loops',
    active: 'Active',
    completed: 'Completed',
    step: 'Step',
    of: 'of',
    types: {
      analysis: 'analysis',
      optimization: 'optimization',
      generation: 'generation',
      monitoring: 'monitoring'
    },
    workflows: {
      market_analysis: 'Market Analysis Pipeline',
      ui_optimization: 'UI Component Optimization',
      content_gen: 'Content Generation Loop',
      monitoring: 'Real-time User Monitoring',
      steps: {
        data_coll: 'Data Collection',
        pattern_rec: 'Pattern Recognition',
        trend_analysis: 'Trend Analysis',
        insight_gen: 'Insight Generation',
        report_comp: 'Report Compilation',
        perf_audit: 'Performance Audit',
        code_refactor: 'Code Refactoring',
        bundle_opt: 'Bundle Optimization',
        qa: 'Quality Assurance',
        context_analysis: 'Context Analysis',
        draft_gen: 'Draft Generation',
        qual_check: 'Quality Check',
        finalization: 'Finalization',
        cont_mon: 'Continuous Monitoring'
      },
      outputs: {
        collected_points: 'Collected {0} data points',
        found_bottlenecks: 'Found {0} bottlenecks',
        optimized_comps: 'Optimized {0} components',
        analyzed_voice: 'Analyzed brand voice',
        generated_variants: 'Generated {0} variants',
        variants_passed: 'All variants passed',
        ready: 'Content ready for use',
        active_users: 'Active users: {0} | Events/min: {1}'
      }
    }
  }
};

interface LoopModeProps {
  language: 'zh' | 'en';
}

export function LoopMode({ language }: LoopModeProps) {
  const t = translations[language];

  const formatOutput = (key?: string, params?: string[]) => {
    if (!key) return null;
    let text = t.workflows.outputs[key as keyof typeof t.workflows.outputs] || key;
    if (params) {
      params.forEach((param, index) => {
        text = text.replace(`{${index}}`, param);
      });
    }
    return text;
  };

  const [workflows, setWorkflows] = useState<Workflow[]>([
    {
      id: '1',
      nameKey: 'market_analysis',
      status: 'running',
      currentStep: 2,
      totalSteps: 5,
      startTime: new Date(Date.now() - 120000),
      type: 'analysis',
      steps: [
        { id: '1', nameKey: 'data_coll', status: 'completed', duration: '45s', outputKey: 'collected_points', outputParams: ['10,247'] },
        { id: '2', nameKey: 'pattern_rec', status: 'running', progress: 67 },
        { id: '3', nameKey: 'trend_analysis', status: 'pending' },
        { id: '4', nameKey: 'insight_gen', status: 'pending' },
        { id: '5', nameKey: 'report_comp', status: 'pending' },
      ],
    },
    {
      id: '2',
      nameKey: 'ui_optimization',
      status: 'running',
      currentStep: 3,
      totalSteps: 4,
      startTime: new Date(Date.now() - 300000),
      type: 'optimization',
      steps: [
        { id: '1', nameKey: 'perf_audit', status: 'completed', duration: '1m 12s', outputKey: 'found_bottlenecks', outputParams: ['7'] },
        { id: '2', nameKey: 'code_refactor', status: 'completed', duration: '2m 34s', outputKey: 'optimized_comps', outputParams: ['14'] },
        { id: '3', nameKey: 'bundle_opt', status: 'running', progress: 89 },
        { id: '4', nameKey: 'qa', status: 'pending' },
      ],
    },
    {
      id: '3',
      nameKey: 'content_gen',
      status: 'completed',
      currentStep: 4,
      totalSteps: 4,
      startTime: new Date(Date.now() - 600000),
      type: 'generation',
      steps: [
        { id: '1', nameKey: 'context_analysis', status: 'completed', duration: '23s', outputKey: 'analyzed_voice' },
        { id: '2', nameKey: 'draft_gen', status: 'completed', duration: '1m 45s', outputKey: 'generated_variants', outputParams: ['5'] },
        { id: '3', nameKey: 'qual_check', status: 'completed', duration: '34s', outputKey: 'variants_passed' },
        { id: '4', nameKey: 'finalization', status: 'completed', duration: '12s', outputKey: 'ready' },
      ],
    },
    {
      id: '4',
      nameKey: 'monitoring',
      status: 'running',
      currentStep: 1,
      totalSteps: 1,
      startTime: new Date(Date.now() - 3600000),
      type: 'monitoring',
      steps: [
        { id: '1', nameKey: 'cont_mon', status: 'running', outputKey: 'active_users', outputParams: ['1,247', '3,421'] },
      ],
    },
  ]);

  const [expandedWorkflows, setExpandedWorkflows] = useState<Set<string>>(new Set(['1', '2']));

  useEffect(() => {
    const interval = setInterval(() => {
      setWorkflows(prev =>
        prev.map(workflow => {
          if (workflow.status !== 'running') return workflow;

          return {
            ...workflow,
            steps: workflow.steps.map(step => {
              if (step.status === 'running' && step.progress !== undefined) {
                const newProgress = Math.min(100, step.progress + Math.random() * 5);
                return { ...step, progress: Math.round(newProgress) };
              }
              return step;
            }),
          };
        })
      );
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const toggleWorkflow = (id: string) => {
    const newExpanded = new Set(expandedWorkflows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedWorkflows(newExpanded);
  };

  const getWorkflowTypeColor = (type: Workflow['type']) => {
    switch (type) {
      case 'analysis':
        return 'from-blue-500 to-cyan-500';
      case 'optimization':
        return 'from-purple-500 to-pink-500';
      case 'generation':
        return 'from-emerald-500 to-teal-500';
      case 'monitoring':
        return 'from-amber-500 to-orange-500';
    }
  };

  const getStatusIcon = (status: WorkflowStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-slate-300" />;
    }
  };

  return (
    <div className="h-full overflow-y-auto pb-safe bg-slate-50">
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        {/* Active Workflows Summary */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-emerald-100 p-1.5 rounded-lg">
              <Activity className="w-5 h-5 text-emerald-600" />
            </div>
            <h2 className="font-bold text-slate-800">{t.live_loops}</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <div className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wide">{t.active}</div>
              <div className="text-2xl font-bold text-blue-600">
                {workflows.filter((w) => w.status === 'running').length}
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <div className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wide">{t.completed}</div>
              <div className="text-2xl font-bold text-emerald-600">
                {workflows.filter((w) => w.status === 'completed').length}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Workflow List */}
        <div className="space-y-3">
          {workflows.map((workflow, index) => {
            const isExpanded = expandedWorkflows.has(workflow.id);
            const workflowName = t.workflows[workflow.nameKey as keyof typeof t.workflows] || workflow.nameKey;
            const typeName = t.types[workflow.type] || workflow.type;

            return (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                key={workflow.id} 
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Workflow Header */}
                <button
                  onClick={() => toggleWorkflow(workflow.id)}
                  className="w-full p-5 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center gap-4 mb-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getWorkflowTypeColor(workflow.type)} flex items-center justify-center flex-shrink-0 shadow-sm text-white`}>
                      {workflow.status === 'running' ? (
                        <Play className="w-5 h-5 fill-current" />
                      ) : workflow.status === 'completed' ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <Pause className="w-5 h-5 fill-current" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-bold text-slate-800">{workflowName}</h3>
                      <p className="text-xs text-slate-500 font-medium capitalize mt-0.5 px-2 py-0.5 bg-slate-100 rounded-full inline-block">
                        {typeName}
                      </p>
                    </div>
                    <motion.div
                      animate={{ rotate: isExpanded ? 90 : 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    >
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    </motion.div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-slate-500">
                        {t.step} {workflow.currentStep || 0} {t.of} {workflow.totalSteps}
                      </span>
                      {workflow.startTime && workflow.status === 'running' && (
                        <span className="text-slate-400 font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {Math.floor((Date.now() - workflow.startTime.getTime()) / 60000)}m {Math.floor(((Date.now() - workflow.startTime.getTime()) % 60000) / 1000)}s
                        </span>
                      )}
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <motion.div
                        className={`h-full bg-gradient-to-r ${getWorkflowTypeColor(workflow.type)}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${((workflow.currentStep || 0) / workflow.totalSteps) * 100}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                </button>

                {/* Expanded Steps */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-100 bg-slate-50/30"
                    >
                      <div className="p-4 space-y-2">
                        {workflow.steps.map((step) => {
                          const stepName = t.workflows.steps[step.nameKey as keyof typeof t.workflows.steps] || step.nameKey;
                          
                          return (
                            <div
                              key={step.id}
                              className={`p-3.5 rounded-xl border transition-all ${
                                step.status === 'running'
                                  ? 'bg-blue-50 border-blue-100 shadow-sm'
                                  : step.status === 'completed'
                                  ? 'bg-white border-slate-200'
                                  : 'bg-slate-50 border-slate-100 opacity-60'
                              }`}
                            >
                              <div className="flex items-center gap-3 mb-2">
                                {getStatusIcon(step.status)}
                                <div className="flex-1">
                                  <div className={`text-sm font-semibold ${step.status === 'running' ? 'text-blue-700' : 'text-slate-700'}`}>
                                    {stepName}
                                  </div>
                                  {step.duration && (
                                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{step.duration}</div>
                                  )}
                                </div>
                                {step.status === 'running' && step.progress !== undefined && (
                                  <div className="text-sm font-bold text-blue-600">{step.progress}%</div>
                                )}
                              </div>

                              {/* Progress bar for running step */}
                              {step.status === 'running' && step.progress !== undefined && (
                                <div className="w-full bg-blue-100 rounded-full h-1.5 overflow-hidden mt-2">
                                  <motion.div
                                    className="h-full bg-blue-500"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${step.progress}%` }}
                                    transition={{ type: "spring" }}
                                  />
                                </div>
                              )}

                              {/* Step output */}
                              {(step.outputKey || step.outputParams) && (
                                <div className="mt-2 text-xs text-slate-500 bg-slate-100/50 rounded-lg px-3 py-2 font-mono border border-slate-100">
                                  {formatOutput(step.outputKey, step.outputParams)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
