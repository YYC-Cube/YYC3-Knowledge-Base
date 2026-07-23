import { useState, useEffect } from 'react';
import { Send, Plus, MoreVertical, CheckCircle2, Clock, AlertCircle, Loader2, Menu, X, Folder, ChevronRight, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  status?: 'completed' | 'running' | 'failed';
}

interface ChatSession {
  id: string;
  name: string;
  messages: Message[];
  status: 'idle' | 'processing' | 'completed' | 'error';
  lastActivity: Date;
  projectId?: string;
}

interface Project {
  id: string;
  nameKey: string;
  color: string;
}

const translations = {
  zh: {
    new_chat: '新对话',
    chat_sessions: '对话会话',
    ungrouped: '未分组',
    input_placeholder: '描述您的任务或询问状态...',
    projects: {
      p1: '营销活动',
      p2: '产品发布',
      p3: '内容策略',
    },
    sessions: {
      market_analysis: '市场分析任务',
      ui_optimization: 'UI/UX 优化',
      content_gen: '内容生成',
      comp_research: '竞争对手研究',
      new_task: '新任务',
    },
    system_messages: {
      processing: '我正在分析...',
      analyzing: '正在处理：\n\n1. 数据收集\n2. 特征映射\n3. 情感分析\n\n预计时间：2分钟',
      complete: '优化完成！结果如下：\n\n✓ 步骤从7减少到4\n✓ 添加进度指示器\n✓ 实施智能默认值\n✓ 创建A/B测试变体\n\n预期转化率提升：+28%',
      welcome: '新会话已开始。今天我能为您做什么？',
      ready: '准备协助进行竞争分析。',
      wait: '我正在处理您的请求，请稍候...'
    }
  },
  en: {
    new_chat: 'New Chat',
    chat_sessions: 'Chat Sessions',
    ungrouped: 'Ungrouped',
    input_placeholder: 'Describe your task or ask for status...',
    projects: {
      p1: 'Marketing Campaign',
      p2: 'Product Launch',
      p3: 'Content Strategy',
    },
    sessions: {
      market_analysis: 'Market Analysis Task',
      ui_optimization: 'UI/UX Optimization',
      content_gen: 'Content Generation',
      comp_research: 'Competitive Research',
      new_task: 'New Task',
    },
    system_messages: {
      processing: 'I\'m analyzing...',
      analyzing: 'I\'m analyzing the fitness app market. Currently processing:\n\n1. Data collection from App Store\n2. Competitor feature mapping\n3. User sentiment analysis\n\nETA: 2 minutes',
      complete: 'Optimization complete! Here are the results:\n\n✓ Reduced steps from 7 to 4\n✓ Added progress indicators\n✓ Implemented smart defaults\n✓ A/B test variants created\n\nExpected conversion lift: +28%',
      welcome: 'New session started. How can I help you today?',
      ready: 'Ready to help with competitive analysis.',
      wait: 'I\'m processing your request. This will take a moment...'
    }
  }
};

interface ChatModeProps {
  language: 'zh' | 'en';
}

export function ChatMode({ language }: ChatModeProps) {
  const t = translations[language];

  const [projects] = useState<Project[]>([
    { id: 'p1', nameKey: 'p1', color: 'from-blue-500 to-cyan-500' },
    { id: 'p2', nameKey: 'p2', color: 'from-purple-500 to-pink-500' },
    { id: 'p3', nameKey: 'p3', color: 'from-emerald-500 to-teal-500' },
  ]);

  const [sessions, setSessions] = useState<ChatSession[]>([]);

  // Initialize sessions on mount to use translations if needed, but for now we'll just mock them
  // In a real app, these would probably come from an API or local storage
  // Here I'll just map the initial mock data
  useEffect(() => {
    setSessions([
      {
        id: '1',
        name: t.sessions.market_analysis,
        status: 'processing',
        lastActivity: new Date(),
        projectId: 'p1',
        messages: [
          {
            id: '1',
            role: 'user',
            content: 'Analyze the top 10 fitness apps and provide competitive insights',
            timestamp: new Date(Date.now() - 300000),
          },
          {
            id: '2',
            role: 'assistant',
            content: t.system_messages.analyzing,
            timestamp: new Date(Date.now() - 240000),
            status: 'running',
          },
        ],
      },
      {
        id: '2',
        name: t.sessions.ui_optimization,
        status: 'completed',
        lastActivity: new Date(Date.now() - 3600000),
        projectId: 'p2',
        messages: [
          {
            id: '1',
            role: 'user',
            content: 'Optimize the onboarding flow for better conversion',
            timestamp: new Date(Date.now() - 7200000),
          },
          {
            id: '2',
            role: 'assistant',
            content: t.system_messages.complete,
            timestamp: new Date(Date.now() - 3600000),
            status: 'completed',
          },
        ],
      },
      {
        id: '3',
        name: t.sessions.content_gen,
        status: 'idle',
        lastActivity: new Date(Date.now() - 86400000),
        projectId: 'p3',
        messages: [
          {
            id: '1',
            role: 'system',
            content: t.system_messages.welcome,
            timestamp: new Date(Date.now() - 86400000),
          },
        ],
      },
      {
        id: '4',
        name: t.sessions.comp_research,
        status: 'idle',
        lastActivity: new Date(Date.now() - 172800000),
        projectId: 'p1',
        messages: [
          {
            id: '1',
            role: 'system',
            content: t.system_messages.ready,
            timestamp: new Date(Date.now() - 172800000),
          },
        ],
      },
    ]);
  }, [language]); // Reset sessions when language changes for demo purposes

  const [activeSessionId, setActiveSessionId] = useState('1');
  const [inputMessage, setInputMessage] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set(['p1', 'p2', 'p3']));
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  const handleSendMessage = () => {
    if (!inputMessage.trim() || !activeSession) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    setSessions(sessions.map((s) =>
      s.id === activeSessionId
        ? {
            ...s,
            messages: [...s.messages, newMessage],
            status: 'processing' as const,
            lastActivity: new Date(),
          }
        : s
    ));

    setInputMessage('');

    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: t.system_messages.wait,
        timestamp: new Date(),
        status: 'running',
      };

      setSessions(prevSessions => prevSessions.map((s) =>
        s.id === activeSessionId
          ? {
              ...s,
              messages: [...s.messages, newMessage, aiMessage],
              lastActivity: new Date(),
            }
          : s
      ));
    }, 1000);
  };

  const createNewSession = (projectId?: string) => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      name: `${t.sessions.new_task} ${sessions.length + 1}`,
      status: 'idle',
      lastActivity: new Date(),
      projectId,
      messages: [
        {
          id: '1',
          role: 'system',
          content: t.system_messages.welcome,
          timestamp: new Date(),
        },
      ],
    };

    setSessions([newSession, ...sessions]);
    setActiveSessionId(newSession.id);
    setSidebarOpen(false);
  };

  const toggleProject = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const getStatusIcon = (status: ChatSession['status']) => {
    switch (status) {
      case 'processing':
        return <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
      case 'error':
        return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const groupedSessions = projects.map(project => ({
    project,
    sessions: sessions.filter(s => s.projectId === project.id),
  }));

  const ungroupedSessions = sessions.filter(s => !s.projectId);

  const SidebarContent = () => (
    <div className="h-full flex flex-col bg-slate-50 border-r border-slate-200">
      <div className="p-4 border-b border-slate-200 bg-white/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-700">{t.chat_sessions}</h3>
          {isMobile && (
            <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <button
          onClick={() => createNewSession()}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-slate-200"
        >
          <Plus className="w-4 h-4" />
          {t.new_chat}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {groupedSessions.map(({ project, sessions: projectSessions }) => {
          if (projectSessions.length === 0) return null;
          const isExpanded = expandedProjects.has(project.id);
          const projectName = t.projects[project.nameKey as keyof typeof t.projects];

          return (
            <div key={project.id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <button
                onClick={() => toggleProject(project.id)}
                className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-slate-50 transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
                <Folder className={`w-4 h-4 bg-gradient-to-r ${project.color} bg-clip-text text-transparent fill-current opacity-80`} />
                <span className="text-sm font-semibold flex-1 text-left text-slate-700">{projectName}</span>
                <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{projectSessions.length}</span>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-slate-50"
                  >
                    <div className="p-1 space-y-0.5">
                      {projectSessions.map((session) => (
                        <button
                          key={session.id}
                          onClick={() => {
                            setActiveSessionId(session.id);
                            if (isMobile) setSidebarOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                            session.id === activeSessionId
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                          }`}
                        >
                          {getStatusIcon(session.status)}
                          <div className="flex-1 text-left min-w-0">
                            <div className="text-sm font-medium truncate">{session.name}</div>
                            <div className="text-[10px] opacity-60">
                              {session.lastActivity.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {ungroupedSessions.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-1">
            <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
              {t.ungrouped}
            </div>
            {ungroupedSessions.map((session) => (
              <button
                key={session.id}
                onClick={() => {
                  setActiveSessionId(session.id);
                  if (isMobile) setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                  session.id === activeSessionId
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                {getStatusIcon(session.status)}
                <div className="flex-1 text-left min-w-0">
                  <div className="text-sm font-medium truncate">{session.name}</div>
                  <div className="text-[10px] opacity-60">
                    {session.lastActivity.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-full flex bg-slate-50 relative">
      {!isMobile && (
        <div className="w-80 h-full relative z-10">
          <SidebarContent />
        </div>
      )}

      {isMobile && sidebarOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40"
            onClick={() => setSidebarOpen(false)}
          />
          <motion.div
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 w-80 z-50 shadow-2xl"
          >
            <SidebarContent />
          </motion.div>
        </>
      )}

      <div className="flex-1 flex flex-col bg-white/50 backdrop-blur-sm relative z-0">
        <div className="border-b border-slate-200 bg-white/80 p-3 flex items-center gap-3 sticky top-0 z-20">
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <div className="flex-1 flex items-center gap-2 overflow-hidden">
            <div className="bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm">
              {getStatusIcon(activeSession?.status || 'idle')}
            </div>
            <span className="text-sm font-bold text-slate-800 truncate">{activeSession?.name}</span>
          </div>
          <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {activeSession?.messages.map((message) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-5 py-3.5 shadow-sm ${
                  message.role === 'user'
                    ? 'bg-slate-900 text-white rounded-br-none'
                    : message.role === 'system'
                    ? 'bg-slate-100 text-slate-500 text-sm border border-slate-200'
                    : 'bg-white text-slate-700 border border-slate-200 rounded-bl-none'
                }`}
              >
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>
                <div className={`flex items-center gap-2 mt-2 ${message.role === 'user' ? 'justify-end text-slate-400' : 'text-slate-400'}`}>
                  <span className="text-[10px] opacity-70">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {message.status && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        message.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-600'
                          : message.status === 'running'
                          ? 'bg-amber-100 text-amber-600'
                          : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {message.status}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="p-4 pb-safe bg-white border-t border-slate-100">
          <div className="relative shadow-lg shadow-slate-200/50 rounded-2xl">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={t.input_placeholder}
              className="w-full bg-white text-slate-800 rounded-2xl pl-4 pr-14 py-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-100 border border-slate-200 min-h-[56px] max-h-32 placeholder:text-slate-400"
              rows={1}
            />
            <div className="absolute right-2 bottom-2">
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim()}
                className="p-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl transition-all shadow-md hover:shadow-lg disabled:shadow-none"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
