import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { ExplorerModule } from './components/modules/ExplorerModule';
import { TrendsModule } from './components/modules/TrendsModule';
import { CreativeModule } from './components/modules/CreativeModule';
import { ASOModule } from './components/modules/ASOModule';
import { PaywallModule } from './components/modules/PaywallModule';
import { ReviewsModule } from './components/modules/ReviewsModule';
import { MarketsModule } from './components/modules/MarketsModule';
import { FeaturesModule } from './components/modules/FeaturesModule';
import { IdeasModule } from './components/modules/IdeasModule';
import { AssistantModule } from './components/modules/AssistantModule';
import { SalesModule } from './components/modules/SalesModule';
import { LearningModule } from './components/modules/LearningModule';
import { CrossAnalysisModule } from './components/modules/CrossAnalysisModule';
import { ABTestingModule } from './components/modules/ABTestingModule';
import { GrowthCapitalModule } from './components/modules/GrowthCapitalModule';
import { OwnerDashboardModule } from './components/modules/OwnerDashboardModule';
import { SupportModule } from './components/modules/SupportModule';
import { HumanAICollaborationModule } from './components/modules/HumanAICollaborationModule';
import { FloatingAssistant } from './components/FloatingAssistant';

export default function EnterpriseApp() {
  const [activeModule, setActiveModule] = useState('dashboard');
  const [subPage, setSubPage] = useState('');
  const [selectedApp, setSelectedApp] = useState(null);
  const [showFloatingAssistant, setShowFloatingAssistant] = useState(false);

  const getModuleInfo = (moduleId: string, subPageId?: string) => {
    const moduleMap = {
      dashboard: { 
        title: 'Analytics Dashboard', 
        subtitle: 'Enterprise intelligence and workflow management' 
      },
      'owner-dashboard': {
        title: subPageId === 'cost-management' ? 'Cost Management' : subPageId === 'performance-analytics' ? 'Performance Analytics' : 'Owner Dashboard',
        subtitle: subPageId === 'cost-management' ? 'Interactive cost analysis and budget management' : subPageId === 'performance-analytics' ? 'Deep dive analytics and performance insights' : 'Executive portfolio performance monitoring and detailed app analytics'
      },
      explorer: { 
        title: subPageId === 'detail' ? 'App Deep Analysis' : 'App Explorer', 
        subtitle: subPageId === 'detail' ? 'Comprehensive app analytics and intelligence' : 'Discover and analyze mobile applications' 
      },
      trends: { 
        title: subPageId === 'detail' ? 'Trend Deep Analysis' : 'Market Trends', 
        subtitle: subPageId === 'detail' ? 'Detailed trend analysis and forecasting' : 'Real-time market intelligence and forecasting' 
      },
      creative: { 
        title: subPageId === 'detail' ? 'Creative Deep Analysis' : subPageId === 'comparison' ? 'Creative Benchmarking' : 'Creative Intelligence', 
        subtitle: subPageId === 'detail' ? 'Comprehensive visual and creative analysis' : subPageId === 'comparison' ? 'Side-by-side creative performance comparison' : 'Visual design analysis and competitive intelligence' 
      },
      aso: { 
        title: subPageId === 'detail' ? 'ASO Deep Analysis' : subPageId === 'optimization' ? 'ASO Optimization Tools' : 'ASO Intelligence', 
        subtitle: subPageId === 'detail' ? 'Comprehensive ASO performance analysis' : subPageId === 'optimization' ? 'App store optimization recommendations' : 'App store optimization and keyword intelligence' 
      },
      paywall: { 
        title: subPageId === 'detail' ? 'Paywall Deep Analysis' : subPageId === 'comparison' ? 'Paywall Benchmarking' : 'Paywall Scanner', 
        subtitle: subPageId === 'detail' ? 'Comprehensive monetization analysis' : subPageId === 'comparison' ? 'Paywall strategy comparison and insights' : 'Monetization strategy and paywall intelligence' 
      },
      reviews: { 
        title: subPageId === 'analysis' ? 'Review Deep Analysis' : subPageId === 'monitoring' ? 'Review Monitoring' : 'Review Intelligence', 
        subtitle: subPageId === 'analysis' ? 'Comprehensive review sentiment and feedback analysis' : subPageId === 'monitoring' ? 'Real-time review tracking and alerts' : 'User feedback analysis and sentiment intelligence' 
      },
      'cross-analysis': { 
        title: subPageId === 'report' ? 'Intelligence Report' : subPageId === 'competitive' ? 'Competitive Analysis' : 'Cross Analysis', 
        subtitle: subPageId === 'report' ? 'Comprehensive cross-module intelligence report' : subPageId === 'competitive' ? 'Multi-dimensional competitive intelligence' : 'Multi-module analysis and intelligence synthesis' 
      },
      'ab-testing': {
        title: subPageId === 'test-detail' ? 'Test Analysis' : subPageId === 'create-test' ? 'Create AB Test' : 'AB Testing',
        subtitle: subPageId === 'test-detail' ? 'Detailed test configuration and results' : subPageId === 'create-test' ? 'Set up new AB test experiments' : 'Growth optimization through data-driven testing'
      },
      'growth-capital': {
        title: subPageId === 'investment-detail' ? 'Investment Analysis' : subPageId === 'fund-management' ? 'Fund Management' : 'Growth Capital',
        subtitle: subPageId === 'investment-detail' ? 'Detailed investment performance tracking' : subPageId === 'fund-management' ? 'Capital deployment and fund operations' : 'Enterprise investment portfolio and capital management'
      },
      'human-ai-collaboration': {
        title: subPageId === 'workspace' ? 'Collaboration Workspace' : subPageId === 'plan-builder' ? 'Strategic Plan Builder' : 'Human-AI Collaboration',
        subtitle: subPageId === 'workspace' ? 'Real-time collaborative intelligence workspace' : subPageId === 'plan-builder' ? 'AI-assisted strategic planning and roadmap generation' : 'Intelligence amplification system for strategic planning and growth'
      },
      markets: { 
        title: subPageId === 'detail' ? 'Market Deep Analysis' : subPageId === 'discovery' ? 'Market Discovery' : 'Market Intelligence', 
        subtitle: subPageId === 'detail' ? 'Comprehensive market opportunity analysis' : subPageId === 'discovery' ? 'Discover new market opportunities' : 'Geographic market analysis and opportunity discovery' 
      },
      features: { 
        title: subPageId === 'comparison' ? 'Feature Benchmarking' : subPageId === 'prioritizer' ? 'Feature Prioritizer' : 'Feature Intelligence', 
        subtitle: subPageId === 'comparison' ? 'Feature comparison and competitive analysis' : subPageId === 'prioritizer' ? 'AI-powered feature prioritization' : 'Product feature analysis and roadmap intelligence' 
      },
      ideas: { 
        title: subPageId === 'detail' ? 'Idea Deep Analysis' : 'Ideas Generator', 
        subtitle: subPageId === 'detail' ? 'Detailed idea analysis and implementation roadmap' : 'AI-powered app improvement and feature ideas' 
      },
      assistant: { 
        title: 'AI Assistant', 
        subtitle: 'Intelligent assistance and workflow automation' 
      },
      sales: { 
        title: subPageId === 'pipeline' ? 'Sales Pipeline' : subPageId === 'lead-generation' ? 'Lead Generation' : 'Sales Engine', 
        subtitle: subPageId === 'pipeline' ? 'Lead management and conversion tracking' : subPageId === 'lead-generation' ? 'AI-powered prospect discovery' : 'Sales pipeline and lead generation intelligence' 
      },
      learning: { 
        title: subPageId === 'analytics' ? 'Learning Analytics' : subPageId === 'models' ? 'Model Management' : 'Learning Engine', 
        subtitle: subPageId === 'analytics' ? 'Performance analytics and insights' : subPageId === 'models' ? 'AI model training and optimization' : 'Machine learning and intelligence amplification' 
      },
      'support-center': {
        title: subPageId === 'chatbot' ? 'AI Help Chat' : subPageId === 'documentation' ? 'Documentation' : 'Support Center',
        subtitle: subPageId === 'chatbot' ? 'AI-powered support assistant' : subPageId === 'documentation' ? 'Comprehensive platform documentation' : 'Help, documentation, and support resources'
      },
      chatbot: {
        title: 'AI Help Chat',
        subtitle: 'AI-powered support assistant'
      },
      documentation: {
        title: 'Documentation',
        subtitle: 'Comprehensive platform documentation'
      }
    };
    
    return moduleMap[moduleId as keyof typeof moduleMap] || { 
      title: 'Karbon Intelligence', 
      subtitle: 'Enterprise app intelligence platform' 
    };
  };

  const handleSubPageChange = (page: string, appData?: any) => {
    setSubPage(page);
    if (appData) {
      setSelectedApp(appData);
    }
  };

  const handleAssistantToggle = () => {
    if (activeModule === 'assistant') {
      return;
    }
    setShowFloatingAssistant(!showFloatingAssistant);
  };

  const renderModule = () => {
    const moduleProps = {
      subPage,
      selectedApp,
      onSubPageChange: handleSubPageChange
    };

    switch (activeModule) {
      case 'dashboard':
        return <Dashboard onNavigate={setActiveModule} />;
      case 'owner-dashboard':
        return <OwnerDashboardModule {...moduleProps} />;
      case 'explorer':
        return <ExplorerModule {...moduleProps} />;
      case 'trends':
        return <TrendsModule {...moduleProps} />;
      case 'creative':
        return <CreativeModule {...moduleProps} />;
      case 'aso':
        return <ASOModule {...moduleProps} />;
      case 'paywall':
        return <PaywallModule {...moduleProps} />;
      case 'reviews':
        return <ReviewsModule {...moduleProps} />;
      case 'cross-analysis':
        return <CrossAnalysisModule {...moduleProps} />;
      case 'ab-testing':
        return <ABTestingModule {...moduleProps} />;
      case 'growth-capital':
        return <GrowthCapitalModule {...moduleProps} />;
      case 'human-ai-collaboration':
        return <HumanAICollaborationModule subPage={subPage} onSubPageChange={handleSubPageChange} />;
      case 'markets':
        return <MarketsModule {...moduleProps} />;
      case 'features':
        return <FeaturesModule {...moduleProps} />;
      case 'ideas':
        return <IdeasModule {...moduleProps} />;
      case 'assistant':
        return <AssistantModule />;
      case 'sales':
        return <SalesModule {...moduleProps} />;
      case 'learning':
        return <LearningModule {...moduleProps} />;
      case 'support-center':
      case 'chatbot':
      case 'documentation':
        return <SupportModule subPage={subPage} onSubPageChange={handleSubPageChange} />;
      default:
        return <Dashboard onNavigate={setActiveModule} />;
    }
  };

  const moduleInfo = getModuleInfo(activeModule, subPage);

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar activeModule={activeModule} onModuleChange={setActiveModule} />
      
      <div className="flex-1 flex flex-col">
        <Header title={moduleInfo.title} subtitle={moduleInfo.subtitle} />
        
        <main className="flex-1 p-6">
          {renderModule()}
        </main>
      </div>

      {/* Floating Assistant - only show if not in assistant module */}
      {activeModule !== 'assistant' && (
        <FloatingAssistant 
          isOpen={showFloatingAssistant}
          onToggle={handleAssistantToggle}
          onNavigateToAssistant={() => setActiveModule('assistant')}
        />
      )}
    </div>
  );
}