import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Settings, Activity, Brain, Lock, Zap, Database, Code, Key, Wrench, Rocket, Skull, Sliders } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SystemArchitectureControls } from './home-sections/SystemArchitectureControls';
import { SecurityControls } from './home-sections/SecurityControls';
import { MemoryControls } from './home-sections/MemoryControls';
import { SkillsControls } from './home-sections/SkillsControls';
import { DeploymentControls } from './home-sections/DeploymentControls';

interface Section {
  id: string;
  icon: any;
  color: string;
  hasControls?: boolean;
  badge?: string; // Key for translation
  badgeColor?: string;
}

const sections: Section[] = [
  {
    id: 'architecture',
    icon: Activity,
    color: 'from-blue-500 to-cyan-500',
    hasControls: true,
  },
  {
    id: 'foundation',
    icon: Brain,
    color: 'from-purple-500 to-pink-500',
  },
  {
    id: 'security',
    icon: Lock,
    color: 'from-red-500 to-orange-500',
    hasControls: true,
  },
  {
    id: 'memory',
    icon: Database,
    color: 'from-emerald-500 to-teal-500',
    hasControls: true,
  },
  {
    id: 'skills',
    icon: Zap,
    color: 'from-yellow-500 to-amber-500',
    hasControls: true,
  },
  {
    id: 'domain',
    icon: Brain,
    color: 'from-indigo-500 to-purple-500',
  },
  {
    id: 'adaptive',
    icon: Activity,
    color: 'from-cyan-500 to-blue-500',
  },
  {
    id: 'soul',
    icon: Brain,
    color: 'from-pink-500 to-rose-500',
  },
  {
    id: 'codefix',
    icon: Code,
    color: 'from-violet-500 to-purple-500',
  },
  {
    id: 'auth',
    badge: 'web_deployment',
    badgeColor: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
    icon: Key,
    color: 'from-yellow-500 to-orange-500',
  },
  {
    id: 'miniapp',
    badge: 'platform_infra',
    badgeColor: 'bg-orange-100 text-orange-700 border border-orange-200',
    icon: Wrench,
    color: 'from-orange-500 to-red-500',
  },
  {
    id: 'deployment',
    badge: 'lite_brutal',
    badgeColor: 'bg-blue-100 text-blue-700 border border-blue-200',
    icon: Rocket,
    color: 'from-blue-500 to-indigo-500',
    hasControls: true,
  },
  {
    id: 'brutal',
    badge: 'killer_features',
    badgeColor: 'bg-red-100 text-red-700 border border-red-200',
    icon: Skull,
    color: 'from-red-500 to-pink-500',
  },
];

const translations = {
  zh: {
    system_status: '系统状态',
    cpu: 'CPU使用率',
    memory: '内存占用',
    tasks: '活跃任务',
    uptime: '运行时间',
    sections: {
      architecture: { title: '系统架构', desc: '核心操作系统结构' },
      foundation: { title: 'NARA 本质', desc: '基础与核心能力' },
      security: { title: '安全架构', desc: '零信任实现' },
      memory: { title: '记忆与自学习', desc: '进化的思维能力' },
      skills: { title: '技能学习引擎', desc: '自动成长能力' },
      domain: { title: '领域知识与 Niche-AGI', desc: '营销大脑专业化' },
      adaptive: { title: '自适应操作系统', desc: '万能连接集成' },
      soul: { title: '灵魂与原则', desc: '核心价值观文件' },
      codefix: { title: '神秘代码修复网关', desc: '低代码超能力' },
      auth: { title: '登录与多用户', desc: 'Web 部署认证' },
      miniapp: { title: '小程序生成器', desc: '平台基础设施' },
      deployment: { title: '随处部署，永久运行', desc: '轻量但强悍的部署' },
      brutal: { title: 'NARA 的强悍之处', desc: '杀手级功能' },
    },
    badges: {
      web_deployment: 'WEB 部署',
      platform_infra: '平台基建',
      lite_brutal: '轻量强悍',
      killer_features: '杀手锏',
    },
    no_controls: '此部分无可用控件',
    select_section: '请选择带有控件的部分以调整设置'
  },
  en: {
    system_status: 'System Status',
    cpu: 'CPU Usage',
    memory: 'Memory',
    tasks: 'Active Tasks',
    uptime: 'Uptime',
    sections: {
      architecture: { title: 'System Architecture', desc: 'Core operating system structure' },
      foundation: { title: 'What NARA Actually Is', desc: 'Foundation & core capabilities' },
      security: { title: 'Security Architecture', desc: 'Zero Trust implementation' },
      memory: { title: 'Memory & Self-Learning', desc: 'Evolving mind capabilities' },
      skills: { title: 'Skill Learning Engine', desc: 'Auto-grow capabilities' },
      domain: { title: 'Domain Knowledge & Niche-AGI', desc: 'Marketing brain specialization' },
      adaptive: { title: 'Adaptive Operating System', desc: 'Connect anything integration' },
      soul: { title: 'Soul & Principles', desc: 'The file - core values' },
      codefix: { title: 'Secret Code-Fix Gateway', desc: 'Low-code superpower' },
      auth: { title: 'Sign-In & Multi-User', desc: 'Web deployment authentication' },
      miniapp: { title: 'Mini-App Generator', desc: 'Platform infrastructure' },
      deployment: { title: 'Deploy Anywhere, Run Forever', desc: 'Lite but brutal deployment' },
      brutal: { title: 'What Makes NARA Brutal', desc: 'The killer features' },
    },
    badges: {
      web_deployment: 'WEB DEPLOYMENT',
      platform_infra: 'PLATFORM INFRASTRUCTURE',
      lite_brutal: 'LITE BUT BRUTAL',
      killer_features: 'THE KILLER FEATURES',
    },
    no_controls: 'No controls available for this section',
    select_section: 'Select a section with controls to adjust settings'
  }
};

interface HomeModeProps {
  language: 'zh' | 'en';
}

export function HomeMode({ language }: HomeModeProps) {
  const [activeSection, setActiveSection] = useState<string>('architecture');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['architecture']));
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  const t = translations[language];

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSection = (id: string) => {
    if (isMobile) {
      const newExpanded = new Set(expandedSections);
      if (newExpanded.has(id)) {
        newExpanded.delete(id);
      } else {
        newExpanded.add(id);
      }
      setExpandedSections(newExpanded);
    } else {
      setActiveSection(id);
    }
  };

  const renderDetailPanel = () => {
    switch (activeSection) {
      case 'architecture':
        return <SystemArchitectureControls language={language} />;
      case 'security':
        return <SecurityControls language={language} />;
      // Note: Passing language to other controls even if they might not be updated yet
      case 'memory':
        return <MemoryControls language={language} />;
      case 'skills':
        return <SkillsControls language={language} />;
      case 'deployment':
        return <DeploymentControls language={language} />;
      default:
        return (
          <div className="flex items-center justify-center h-full text-slate-400">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center bg-white p-8 rounded-2xl shadow-lg border border-slate-100"
            >
              <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sliders className="w-8 h-8 opacity-50 text-slate-400" />
              </div>
              <p className="font-medium text-slate-600">{t.no_controls}</p>
              <p className="text-sm mt-2 text-slate-400">{t.select_section}</p>
            </motion.div>
          </div>
        );
    }
  };

  // Status Card Component
  const StatusCard = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-lg shadow-slate-200/50 backdrop-blur-xl relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-bl-full -z-10 opacity-50" />
      
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-slate-700 flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-500" />
          {t.system_status}
        </h2>
        <button className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded-lg">
          <Settings className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 transition-all hover:shadow-md hover:bg-white group">
          <div className="text-xs text-slate-500 mb-1 font-medium">{t.cpu}</div>
          <div className="text-lg font-bold text-emerald-600 group-hover:scale-105 transition-transform origin-left">32%</div>
        </div>
        <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 transition-all hover:shadow-md hover:bg-white group">
          <div className="text-xs text-slate-500 mb-1 font-medium">{t.memory}</div>
          <div className="text-lg font-bold text-blue-600 group-hover:scale-105 transition-transform origin-left">4.2GB</div>
        </div>
        <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 transition-all hover:shadow-md hover:bg-white group">
          <div className="text-xs text-slate-500 mb-1 font-medium">{t.tasks}</div>
          <div className="text-lg font-bold text-purple-600 group-hover:scale-105 transition-transform origin-left">27</div>
        </div>
        <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 transition-all hover:shadow-md hover:bg-white group">
          <div className="text-xs text-slate-500 mb-1 font-medium">{t.uptime}</div>
          <div className="text-lg font-bold text-amber-500 group-hover:scale-105 transition-transform origin-left">99.8%</div>
        </div>
      </div>
    </motion.div>
  );

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="h-full overflow-y-auto pb-safe bg-slate-50">
        <div className="p-4 space-y-4">
          <StatusCard />

          {/* Sections */}
          <div className="space-y-3">
            {sections.map((section, index) => {
              const Icon = section.icon;
              const isExpanded = expandedSections.has(section.id);
              const sectionData = t.sections[section.id as keyof typeof t.sections];

              return (
                <motion.div 
                  key={section.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full p-4 flex items-center gap-4 hover:bg-slate-50/80 transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-800 text-sm">{sectionData.title}</h3>
                        {section.hasControls && (
                          <div className="bg-slate-100 p-1 rounded-md">
                            <Sliders className="w-3 h-3 text-slate-400" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{sectionData.desc}</p>
                      {section.badge && (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1.5 inline-block ${section.badgeColor}`}>
                          {t.badges[section.badge as keyof typeof t.badges]}
                        </span>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  <AnimatePresence>
                    {isExpanded && section.hasControls && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-slate-100 bg-slate-50/50"
                      >
                        {renderDetailPanel()}
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

  // Desktop Layout
  return (
    <div className="h-full flex bg-slate-50">
      {/* Side Panel */}
      <div className="w-80 border-r border-slate-200 bg-white/50 backdrop-blur-sm overflow-y-auto">
        <div className="p-4 space-y-4">
          <StatusCard />

          {/* Navigation Sections */}
          <div className="space-y-1">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              const sectionData = t.sections[section.id as keyof typeof t.sections];

              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all duration-200 group relative overflow-hidden ${
                    isActive
                      ? 'bg-white text-slate-800 shadow-md ring-1 ring-slate-200'
                      : 'text-slate-500 hover:bg-white/60 hover:text-slate-700 hover:shadow-sm'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeSection"
                      className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-full"
                    />
                  )}
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${section.color} flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 text-left overflow-hidden">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-semibold truncate ${isActive ? 'text-slate-800' : 'text-slate-600'}`}>
                        {sectionData.title}
                      </span>
                      {section.hasControls && (
                        <Sliders className={`w-3 h-3 flex-shrink-0 ${isActive ? 'text-slate-400' : 'text-slate-300'}`} />
                      )}
                    </div>
                    {section.badge && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium mt-1 inline-block ${section.badgeColor}`}>
                        {t.badges[section.badge as keyof typeof t.badges]}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detail Panel */}
      <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6">
        <div className="max-w-5xl mx-auto">
          {renderDetailPanel()}
        </div>
      </div>
    </div>
  );
}
