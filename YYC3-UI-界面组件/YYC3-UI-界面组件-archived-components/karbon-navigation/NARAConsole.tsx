import { useState } from 'react';
import { Home, MessageSquare, RefreshCw, Languages, Layout } from 'lucide-react';
import { HomeMode } from './nara/HomeMode';
import { ChatMode } from './nara/ChatMode';
import { LoopMode } from './nara/LoopMode';
import { YYCEnterpriseLayout } from './yyc/navigation/YYCEnterpriseLayout';
import { motion } from 'motion/react';

type Mode = 'home' | 'chat' | 'loop' | 'system';
type Language = 'zh' | 'en';

const translations = {
  zh: {
    title: 'NARA',
    subtitle: 'AI 操作系统',
    status: '在线',
    tabs: {
      home: '主页',
      chat: '对话',
      loop: '循环',
      system: '企业系统'
    }
  },
  en: {
    title: 'NARA',
    subtitle: 'AI Operating System',
    status: 'Online',
    tabs: {
      home: 'Home',
      chat: 'Chat',
      loop: 'Loop',
      system: 'Enterprise System'
    }
  }
};

export function NARAConsole() {
  const [activeMode, setActiveMode] = useState<Mode>('system'); // Default to new system for demo
  const [language, setLanguage] = useState<Language>('zh');

  const t = translations[language];

  // If Enterprise System is active, render it full screen (bypassing the console shell if desired, or inside it)
  // The request implies a full layout design. Let's render it as a full overlay if selected.
  if (activeMode === 'system') {
    return (
      <div className="relative h-screen w-full">
         <YYCEnterpriseLayout />
         {/* Back to Console Button for Demo purposes */}
         <button 
           onClick={() => setActiveMode('home')}
           className="fixed bottom-4 right-4 z-50 p-2 bg-slate-800 text-white rounded-full opacity-50 hover:opacity-100 transition-opacity text-xs"
           title="Return to NARA Console"
         >
           Exit
         </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans transition-colors duration-300">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  {t.title}
                </h1>
                <p className="text-xs text-slate-500 font-medium">{t.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setLanguage(l => l === 'zh' ? 'en' : 'zh')}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors flex items-center gap-2 text-xs font-medium"
              >
                <Languages className="w-4 h-4" />
                <span>{language === 'zh' ? 'EN' : '中文'}</span>
              </button>
              <div className="flex items-center gap-2 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span className="text-xs text-emerald-700 font-medium">{t.status}</span>
              </div>
            </div>
          </div>

          {/* Mode Tabs */}
          <div className="flex gap-2 bg-slate-100/50 p-1.5 rounded-xl border border-slate-200/60 shadow-inner overflow-x-auto">
            <button
              onClick={() => setActiveMode('home')}
              className={`flex-1 min-w-[80px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 relative overflow-hidden ${
                activeMode === 'home'
                  ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              {activeMode === 'home' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-white rounded-lg shadow-sm border border-slate-200/50 -z-10"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <Home className="w-4 h-4 relative z-10" />
              <span className="relative z-10">{t.tabs.home}</span>
            </button>
            <button
              onClick={() => setActiveMode('chat')}
              className={`flex-1 min-w-[80px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 relative overflow-hidden ${
                activeMode === 'chat'
                  ? 'text-slate-800'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              {activeMode === 'chat' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-white rounded-lg shadow-sm border border-slate-200/50 -z-10"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <MessageSquare className="w-4 h-4 relative z-10" />
              <span className="relative z-10">{t.tabs.chat}</span>
            </button>
            <button
              onClick={() => setActiveMode('loop')}
              className={`flex-1 min-w-[80px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 relative overflow-hidden ${
                activeMode === 'loop'
                  ? 'text-slate-800'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              {activeMode === 'loop' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-white rounded-lg shadow-sm border border-slate-200/50 -z-10"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <RefreshCw className="w-4 h-4 relative z-10" />
              <span className="relative z-10">{t.tabs.loop}</span>
            </button>
            <button
              onClick={() => setActiveMode('system')}
              className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 relative overflow-hidden ${
                activeMode === 'system'
                  ? 'text-slate-800'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
               <Layout className="w-4 h-4 relative z-10" />
               <span className="relative z-10">{t.tabs.system}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-100 via-slate-50 to-slate-50 -z-10 opacity-70 pointer-events-none" />
        {activeMode === 'home' && <HomeMode language={language} />}
        {activeMode === 'chat' && <ChatMode language={language} />}
        {activeMode === 'loop' && <LoopMode language={language} />}
      </main>
    </div>
  );
}
