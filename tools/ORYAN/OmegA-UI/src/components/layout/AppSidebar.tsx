import { 
  MessageSquare, 
  Users, 
  Brain, 
  BookOpen, 
  ListTodo, 
  Shield, 
  Settings,
  Eye,
  EyeOff,
  Radio,
  ChevronLeft,
  ChevronRight,
  Activity
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import { cn } from '@/lib/utils';
import { ModuleView } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getOrchestratorUrl } from '@/lib/orchestrator-config';

interface NavItem {
  id: ModuleView;
  label: string;
  icon: React.ElementType;
  shortcut?: string;
}

const navItems: NavItem[] = [
  { id: 'chat', label: 'HUD Chat', icon: MessageSquare, shortcut: '1' },
  { id: 'crew', label: 'Crew Manager', icon: Users, shortcut: '2' },
  { id: 'memory', label: 'Memory Vault', icon: Brain, shortcut: '3' },
  { id: 'protocols', label: 'Protocols', icon: BookOpen, shortcut: '4' },
  { id: 'tasks', label: 'Tasking (Ops)', icon: ListTodo, shortcut: '5' },
  { id: 'consent', label: 'Consent & Audit', icon: Shield, shortcut: '6' },
  { id: 'settings', label: 'Settings', icon: Settings, shortcut: '7' },
];

export function AppSidebar() {
  const { 
    currentView, 
    setView, 
    fourEyesMode, 
    externalMode, 
    toggleFourEyesMode,
    sidebarCollapsed,
    toggleSidebar
  } = useAppStore();
  const [healthStatus, setHealthStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    let mounted = true;

    const checkHealth = async () => {
      try {
        const baseUrl = getOrchestratorUrl();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const resp = await fetch(`${baseUrl.replace(/\\/$/, '')}/health`, { signal: controller.signal });
        clearTimeout(timeout);
        if (!mounted) return;
        setHealthStatus(resp.ok ? 'online' : 'offline');
      } catch {
        if (!mounted) return;
        setHealthStatus('offline');
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <aside 
      className={cn(
        "h-screen flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300",
        sidebarCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo/Brand */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-sidebar-border">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/50 flex items-center justify-center glow-cyan">
              <span className="text-primary font-mono font-bold text-sm">Ω</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground glow-text">OMEGAI</h1>
              <p className="text-[10px] text-muted-foreground font-mono">COMMAND DECK</p>
            </div>
          </div>
        )}
        {sidebarCollapsed && (
          <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/50 flex items-center justify-center glow-cyan mx-auto">
            <span className="text-primary font-mono font-bold text-sm">Ω</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className={cn("h-6 w-6 text-muted-foreground hover:text-foreground", sidebarCollapsed && "hidden")}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Status Bar */}
      <div className={cn(
        "px-4 py-3 border-b border-sidebar-border",
        sidebarCollapsed && "px-2"
      )}>
        <div className={cn(
          "flex items-center gap-2 text-xs mb-2",
          sidebarCollapsed && "justify-center"
        )}>
          <Activity className={cn(
            "h-3 w-3",
            healthStatus === 'online' && "text-emerald-400 animate-pulse-glow",
            healthStatus === 'offline' && "text-red-400",
            healthStatus === 'checking' && "text-muted-foreground animate-spin"
          )} />
          {!sidebarCollapsed && (
            <span className="font-mono text-muted-foreground">
              ORCH {healthStatus.toUpperCase()}
            </span>
          )}
        </div>
        {externalMode && (
          <div className={cn(
            "flex items-center gap-2 text-warning text-xs mb-2",
            sidebarCollapsed && "justify-center"
          )}>
            <Radio className="h-3 w-3 animate-pulse-glow" />
            {!sidebarCollapsed && <span className="font-mono">EXTERNAL MODE</span>}
          </div>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={toggleFourEyesMode}
              className={cn(
                "flex items-center gap-2 w-full py-1.5 px-2 rounded transition-colors",
                fourEyesMode 
                  ? "bg-warning/20 text-warning" 
                  : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent",
                sidebarCollapsed && "justify-center px-0"
              )}
            >
              {fourEyesMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {!sidebarCollapsed && (
                <span className="text-xs font-mono">
                  {fourEyesMode ? '4EYES ON' : '4EYES OFF'}
                </span>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Toggle privacy mode (hides sensitive content)</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto hud-scrollbar">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            
            return (
              <li key={item.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setView(item.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200",
                        "text-sm font-medium",
                        isActive 
                          ? "bg-primary/10 text-primary border border-primary/30 glow-cyan" 
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        sidebarCollapsed && "justify-center px-2"
                      )}
                    >
                      <Icon className={cn("h-4 w-4 flex-shrink-0", isActive && "animate-pulse-glow")} />
                      {!sidebarCollapsed && (
                        <>
                          <span className="flex-1 text-left">{item.label}</span>
                          <kbd className="hidden lg:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 text-[10px] font-mono text-muted-foreground">
                            {item.shortcut}
                          </kbd>
                        </>
                      )}
                    </button>
                  </TooltipTrigger>
                  {sidebarCollapsed && (
                    <TooltipContent side="right">
                      <p>{item.label}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className={cn(
        "p-4 border-t border-sidebar-border",
        sidebarCollapsed && "p-2"
      )}>
        {!sidebarCollapsed && (
          <div className="text-xs text-muted-foreground font-mono">
            <div className="flex items-center gap-2">
              <span className={cn(
                "h-2 w-2 rounded-full",
                healthStatus === 'online' && "bg-emerald-400",
                healthStatus === 'offline' && "bg-red-400",
                healthStatus === 'checking' && "bg-muted-foreground"
              )}></span>
              <span>{healthStatus === 'online' ? 'ORCH ONLINE' : 'ORCH OFFLINE'}</span>
            </div>
            <p className="mt-1 text-[10px]">⌘K for commands</p>
          </div>
        )}
        {sidebarCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="w-full h-8 text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </aside>
  );
}
