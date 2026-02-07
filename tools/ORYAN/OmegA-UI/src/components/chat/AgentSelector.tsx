import { useState } from 'react';
import { Check, ChevronDown, Users } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';

interface AgentSelectorProps {
  selectedAgents: string[];
  onSelectionChange: (agents: string[]) => void;
}

export function AgentSelector({ selectedAgents, onSelectionChange }: AgentSelectorProps) {
  const { agents } = useAppStore();
  const [open, setOpen] = useState(false);

  const toggleAgent = (agentId: string) => {
    if (selectedAgents.includes(agentId)) {
      onSelectionChange(selectedAgents.filter(id => id !== agentId));
    } else {
      onSelectionChange([...selectedAgents, agentId]);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Users className="h-4 w-4" />
          <span className="hidden sm:inline">Active Crew</span>
          <span className="bg-primary/20 text-primary px-1.5 rounded text-xs font-mono">
            {selectedAgents.length}
          </span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground px-2 py-1">
            Select agents for this conversation
          </p>
          {agents.map((agent) => {
            const isSelected = selectedAgents.includes(agent.id);
            return (
              <button
                key={agent.id}
                onClick={() => toggleAgent(agent.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-2 py-2 rounded-md transition-colors",
                  isSelected 
                    ? "bg-primary/10 border border-primary/30" 
                    : "hover:bg-muted"
                )}
              >
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: agent.color + '30', color: agent.color }}
                >
                  {agent.name[0]}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium" style={{ color: isSelected ? agent.color : undefined }}>
                    {agent.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{agent.role}</p>
                </div>
                {isSelected && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
