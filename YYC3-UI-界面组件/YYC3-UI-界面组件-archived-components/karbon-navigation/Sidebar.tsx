import { useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Home, 
  Search, 
  TrendingUp, 
  Palette, 
  Type, 
  DollarSign, 
  MessageSquare, 
  Globe, 
  Settings, 
  Lightbulb, 
  Bot,
  BarChart3,
  ChevronDown,
  ChevronRight,
  User,
  LogOut,
  FileText,
  Star,
  TestTube2,
  Brain,
  Users,
  Wallet,
  Crown,
  PieChart,
  Activity,
  HeadphonesIcon,
  MessageCircle,
  HelpCircle,
  UserCheck
} from 'lucide-react';

interface SidebarProps {
  activeModule: string;
  onModuleChange: (module: string) => void;
}

const moduleGroups = [
  {
    title: 'Revenue',
    modules: [
      { id: 'owner-dashboard', label: 'Owner Dashboard', icon: Crown, badge: 'Executive' },
      { id: 'growth-capital', label: 'Growth Capital', icon: Wallet, badge: 'Core' },
      { id: 'sales', label: 'Sales Engine', icon: Users, badge: null }
    ]
  },
  {
    title: 'Analytics',
    modules: [
      { id: 'dashboard', label: 'Dashboard', icon: Home, badge: null },
      { id: 'explorer', label: 'App Explorer', icon: Search, badge: null },
      { id: 'trends', label: 'Market Trends', icon: TrendingUp, badge: 'Live' },
      { id: 'cross-analysis', label: 'Cross Analysis', icon: BarChart3, badge: null }
    ]
  },
  {
    title: 'Intelligence',
    modules: [
      { id: 'creative', label: 'Creative Analysis', icon: Palette, badge: null },
      { id: 'aso', label: 'ASO Optimization', icon: Type, badge: null },
      { id: 'paywall', label: 'Paywall Scanner', icon: DollarSign, badge: null },
      { id: 'reviews', label: 'Review Analytics', icon: MessageSquare, badge: null }
    ]
  },
  {
    title: 'Strategy & Growth',
    modules: [
      { id: 'human-ai-collaboration', label: 'Human-AI Collaboration', icon: UserCheck, badge: 'Amplify' },
      { id: 'ab-testing', label: 'AB Testing', icon: TestTube2, badge: 'New' },
      { id: 'markets', label: 'Market Discovery', icon: Globe, badge: null },
      { id: 'features', label: 'Feature Intelligence', icon: Settings, badge: null }
    ]
  },
  {
    title: 'AI & Automation',
    modules: [
      { id: 'ideas', label: 'Ideas Generator', icon: Lightbulb, badge: 'AI' },
      { id: 'assistant', label: 'AI Assistant', icon: Bot, badge: null },
      { id: 'learning', label: 'Learning Engine', icon: Brain, badge: 'Beta' }
    ]
  },
  {
    title: 'Support',
    modules: [
      { id: 'support-center', label: 'Support Center', icon: HeadphonesIcon, badge: null },
      { id: 'chatbot', label: 'AI Help Chat', icon: MessageCircle, badge: 'Live' },
      { id: 'documentation', label: 'Documentation', icon: FileText, badge: null }
    ]
  }
];

export function Sidebar({ activeModule, onModuleChange }: SidebarProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);

  const toggleGroup = (groupTitle: string) => {
    setCollapsedGroups(prev => 
      prev.includes(groupTitle) 
        ? prev.filter(g => g !== groupTitle)
        : [...prev, groupTitle]
    );
  };

  const isGroupCollapsed = (groupTitle: string) => collapsedGroups.includes(groupTitle);

  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
            <span className="text-sidebar-primary-foreground font-semibold">K</span>
          </div>
          <div>
            <h1 className="font-semibold text-sidebar-foreground">Karbon</h1>
            <p className="text-xs text-sidebar-foreground/60">Admin</p>
          </div>
        </div>
        
        <div className="bg-sidebar-accent rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-sm text-sidebar-accent-foreground">Enterprise Platform</span>
            <Badge variant="secondary" className="text-xs">
              Pro
            </Badge>
          </div>
          <p className="text-xs text-sidebar-accent-foreground/70">
            Moneyball meets with AlphaGo
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-6">
        {moduleGroups.map((group) => (
          <div key={group.title}>
            <button
              onClick={() => toggleGroup(group.title)}
              className="flex items-center justify-between w-full p-2 text-xs font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors"
            >
              <span>{group.title}</span>
              {isGroupCollapsed(group.title) ? (
                <ChevronRight className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
            
            {!isGroupCollapsed(group.title) && (
              <div className="mt-2 space-y-1">
                {group.modules.map((module) => (
                  <Button
                    key={module.id}
                    variant={activeModule === module.id ? "default" : "ghost"}
                    className={`w-full justify-start gap-3 ${
                      activeModule === module.id 
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground' 
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    }`}
                    onClick={() => onModuleChange(module.id)}
                  >
                    <module.icon className="w-4 h-4" />
                    <span>{module.label}</span>
                    {module.badge && (
                      <Badge 
                        variant="secondary" 
                        className={`ml-auto text-xs h-5 px-1.5 ${
                          module.badge === 'Core' ? 'bg-yellow-100 text-yellow-800' : 
                          module.badge === 'Executive' ? 'bg-purple-100 text-purple-800' :
                          module.badge === 'New' ? 'bg-green-100 text-green-800' :
                          module.badge === 'AI' ? 'bg-blue-100 text-blue-800' :
                          module.badge === 'Beta' ? 'bg-orange-100 text-orange-800' :
                          module.badge === 'Live' ? 'bg-red-100 text-red-800' :
                          module.badge === 'Amplify' ? 'bg-gradient-to-r from-purple-100 to-cyan-100 text-purple-800' : ''
                        }`}
                      >
                        {module.badge}
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border space-y-2">
        <Button variant="ghost" className="w-full justify-start text-sidebar-foreground">
          <User className="w-4 h-4 mr-3" />
          Account Settings
        </Button>
        <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:text-destructive">
          <LogOut className="w-4 h-4 mr-3" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}