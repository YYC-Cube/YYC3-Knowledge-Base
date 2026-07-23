import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { cn } from "./ui/utils";

interface NavigationProps {
  activeModule: string;
  onModuleChange: (module: string) => void;
}

const modules = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { id: 'explorer', label: 'Explorer', icon: '🔍', count: '2,847' },
  { id: 'trends', label: 'Trends', icon: '📊', count: '67' },
  { id: 'creative', label: 'Creative', icon: '🎨', count: '234' },
  { id: 'aso', label: 'ASO', icon: '🔤', count: '89' },
  { id: 'paywall', label: 'Paywall', icon: '💰', count: '423' },
  { id: 'reviews', label: 'Reviews', icon: '💬', count: '12K' },
  { id: 'markets', label: 'Markets', icon: '🌍', count: '12' },
  { id: 'features', label: 'Features', icon: '⚙️', count: '156' },
  { id: 'ideas', label: 'Ideas', icon: '💡', count: '23' },
  { id: 'assistant', label: 'Assistant', icon: '🤖' },
  { id: 'settings', label: 'Settings', icon: '⚙️' }
];

export function Navigation({ activeModule, onModuleChange }: NavigationProps) {
  return (
    <nav className="bg-card border-b border-border p-4">
      <div className="flex flex-wrap gap-2 justify-center">
        {modules.map((module) => (
          <Button
            key={module.id}
            variant={activeModule === module.id ? "default" : "ghost"}
            onClick={() => onModuleChange(module.id)}
            className={cn(
              "flex items-center gap-2 h-9",
              activeModule === module.id && "bg-primary text-primary-foreground"
            )}
          >
            <span>{module.icon}</span>
            <span>{module.label}</span>
            {module.count && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {module.count}
              </Badge>
            )}
          </Button>
        ))}
      </div>
    </nav>
  );
}