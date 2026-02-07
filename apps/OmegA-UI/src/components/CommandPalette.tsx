import { useEffect, useState } from 'react';
import { 
  MessageSquare, 
  Users, 
  Brain, 
  BookOpen, 
  ListTodo, 
  Shield, 
  Settings,
  Plus,
  Eye,
  EyeOff,
  Search
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useAppStore } from '@/stores/app-store';
import { ModuleView } from '@/lib/types';

interface CommandItem {
  id: string;
  label: string;
  icon: React.ElementType;
  action: () => void;
  group: string;
  shortcut?: string;
}

export function CommandPalette() {
  const { 
    commandPaletteOpen, 
    toggleCommandPalette, 
    setView,
    fourEyesMode,
    toggleFourEyesMode,
    createConversation,
    agents
  } = useAppStore();

  const commands: CommandItem[] = [
    // Navigation
    { id: 'nav-chat', label: 'Go to HUD Chat', icon: MessageSquare, action: () => setView('chat'), group: 'Navigation', shortcut: '1' },
    { id: 'nav-crew', label: 'Go to Crew Manager', icon: Users, action: () => setView('crew'), group: 'Navigation', shortcut: '2' },
    { id: 'nav-memory', label: 'Go to Memory Vault', icon: Brain, action: () => setView('memory'), group: 'Navigation', shortcut: '3' },
    { id: 'nav-protocols', label: 'Go to Protocols', icon: BookOpen, action: () => setView('protocols'), group: 'Navigation', shortcut: '4' },
    { id: 'nav-tasks', label: 'Go to Tasking', icon: ListTodo, action: () => setView('tasks'), group: 'Navigation', shortcut: '5' },
    { id: 'nav-consent', label: 'Go to Consent & Audit', icon: Shield, action: () => setView('consent'), group: 'Navigation', shortcut: '6' },
    { id: 'nav-settings', label: 'Go to Settings', icon: Settings, action: () => setView('settings'), group: 'Navigation', shortcut: '7' },
    
    // Actions
    { 
      id: 'action-new-chat', 
      label: 'New Conversation', 
      icon: Plus, 
      action: async () => {
        await createConversation('New Chat', agents.slice(0, 2).map(a => a.id));
        setView('chat');
      }, 
      group: 'Actions' 
    },
    { 
      id: 'action-new-memory', 
      label: 'New Memory', 
      icon: Brain, 
      action: () => setView('memory'), 
      group: 'Actions' 
    },
    { 
      id: 'action-toggle-4eyes', 
      label: fourEyesMode ? 'Disable 4Eyes Mode' : 'Enable 4Eyes Mode', 
      icon: fourEyesMode ? Eye : EyeOff, 
      action: toggleFourEyesMode, 
      group: 'Actions' 
    },
  ];

  const groupedCommands = commands.reduce((acc, cmd) => {
    if (!acc[cmd.group]) acc[cmd.group] = [];
    acc[cmd.group].push(cmd);
    return acc;
  }, {} as Record<string, CommandItem[]>);

  // Keyboard shortcuts
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggleCommandPalette();
      }
      
      // Number shortcuts for navigation
      if (!commandPaletteOpen && e.key >= '1' && e.key <= '7' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        
        const views: ModuleView[] = ['chat', 'crew', 'memory', 'protocols', 'tasks', 'consent', 'settings'];
        const index = parseInt(e.key) - 1;
        if (views[index]) {
          setView(views[index]);
        }
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [toggleCommandPalette, commandPaletteOpen, setView]);

  const runCommand = (command: CommandItem) => {
    command.action();
    toggleCommandPalette();
  };

  return (
    <CommandDialog open={commandPaletteOpen} onOpenChange={toggleCommandPalette}>
      <div className="flex items-center border-b border-border px-3">
        <Search className="h-4 w-4 text-muted-foreground mr-2" />
        <CommandInput 
          placeholder="Type a command or search..." 
          className="border-0 focus:ring-0"
        />
      </div>
      <CommandList className="max-h-[400px]">
        <CommandEmpty>No results found.</CommandEmpty>
        
        {Object.entries(groupedCommands).map(([group, items], idx) => (
          <div key={group}>
            {idx > 0 && <CommandSeparator />}
            <CommandGroup heading={group}>
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.id}
                    onSelect={() => runCommand(item)}
                    className="flex items-center gap-3 px-3 py-2 cursor-pointer"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span>{item.label}</span>
                    {item.shortcut && (
                      <kbd className="ml-auto h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 text-[10px] font-mono text-muted-foreground hidden sm:inline-flex">
                        {item.shortcut}
                      </kbd>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
