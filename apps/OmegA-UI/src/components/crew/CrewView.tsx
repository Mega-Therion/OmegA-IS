import { useState } from 'react';
import { Plus, Edit2, Trash2, Shield, Zap, AlertTriangle, Users } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { Agent } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

export function CrewView() {
  const { agents, addAgent, updateAgent } = useAppStore();
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleSaveAgent = async (agentData: Partial<Agent>) => {
    if (editingAgent) {
      await updateAgent({ ...editingAgent, ...agentData } as Agent);
    } else {
      await addAgent({
        name: agentData.name || 'New Agent',
        role: agentData.role || 'Assistant',
        description: agentData.description || '',
        color: agentData.color || '#00d4ff',
        weights: agentData.weights || 0.25,
        rules: agentData.rules || [],
        strengths: agentData.strengths || [],
        boundaries: agentData.boundaries || [],
        style: agentData.style || 'Helpful and professional',
      });
    }
    setDialogOpen(false);
    setEditingAgent(null);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-6 border-b border-border bg-background-elevated">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Crew Manager</h2>
          <Badge variant="outline" className="font-mono">{agents.length} agents</Badge>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => setEditingAgent(null)}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              New Agent
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingAgent ? 'Edit Agent' : 'Create New Agent'}</DialogTitle>
            </DialogHeader>
            <AgentForm 
              agent={editingAgent} 
              onSave={handleSaveAgent}
              onCancel={() => setDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Agent Grid */}
      <ScrollArea className="flex-1 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <AgentCard 
              key={agent.id} 
              agent={agent}
              onEdit={() => {
                setEditingAgent(agent);
                setDialogOpen(true);
              }}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function AgentCard({ agent, onEdit }: { agent: Agent; onEdit: () => void }) {
  return (
    <div 
      className="hud-panel p-5 group hover:border-glow transition-all cursor-pointer"
      onClick={onEdit}
    >
      <div className="flex items-start gap-4">
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold border"
          style={{ 
            backgroundColor: agent.color + '20', 
            borderColor: agent.color + '50',
            color: agent.color,
            boxShadow: `0 0 20px ${agent.color}30`
          }}
        >
          {agent.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground glow-text" style={{ color: agent.color }}>
            {agent.name}
          </h3>
          <p className="text-sm text-muted-foreground">{agent.role}</p>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
        >
          <Edit2 className="h-4 w-4" />
        </Button>
      </div>

      <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
        {agent.description}
      </p>

      {/* Weights bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground">Routing Weight</span>
          <span className="font-mono text-primary">{Math.round(agent.weights * 100)}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all"
            style={{ 
              width: `${agent.weights * 100}%`,
              backgroundColor: agent.color,
              boxShadow: `0 0 10px ${agent.color}`
            }}
          />
        </div>
      </div>

      {/* Tags */}
      <div className="mt-4 flex flex-wrap gap-1">
        {agent.strengths.slice(0, 3).map((strength, idx) => (
          <Badge key={idx} variant="outline" className="text-[10px]">
            <Zap className="h-2.5 w-2.5 mr-1 text-primary" />
            {strength}
          </Badge>
        ))}
      </div>

      {/* Rules count */}
      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Shield className="h-3 w-3" />
          {agent.rules.length} rules
        </span>
        <span className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {agent.boundaries.length} boundaries
        </span>
      </div>
    </div>
  );
}

function AgentForm({ 
  agent, 
  onSave, 
  onCancel 
}: { 
  agent: Agent | null; 
  onSave: (data: Partial<Agent>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: agent?.name || '',
    role: agent?.role || '',
    description: agent?.description || '',
    color: agent?.color || '#00d4ff',
    weights: agent?.weights || 0.25,
    rules: agent?.rules?.join('\n') || '',
    strengths: agent?.strengths?.join(', ') || '',
    boundaries: agent?.boundaries?.join('\n') || '',
    style: agent?.style || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: formData.name,
      role: formData.role,
      description: formData.description,
      color: formData.color,
      weights: formData.weights,
      rules: formData.rules.split('\n').filter(Boolean),
      strengths: formData.strengths.split(',').map(s => s.trim()).filter(Boolean),
      boundaries: formData.boundaries.split('\n').filter(Boolean),
      style: formData.style,
    });
  };

  const colorOptions = ['#00d4ff', '#ff6b6b', '#a855f7', '#22c55e', '#f59e0b', '#3b82f6'];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Name</Label>
          <Input 
            value={formData.name} 
            onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
            placeholder="Agent name"
          />
        </div>
        <div>
          <Label>Role</Label>
          <Input 
            value={formData.role} 
            onChange={(e) => setFormData(f => ({ ...f, role: e.target.value }))}
            placeholder="e.g., Strategic Advisor"
          />
        </div>
      </div>

      <div>
        <Label>Description</Label>
        <Textarea 
          value={formData.description} 
          onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
          placeholder="What does this agent do?"
          rows={2}
        />
      </div>

      <div>
        <Label>Color</Label>
        <div className="flex gap-2 mt-1">
          {colorOptions.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setFormData(f => ({ ...f, color }))}
              className={cn(
                "w-8 h-8 rounded-full border-2 transition-all",
                formData.color === color ? "border-foreground scale-110" : "border-transparent"
              )}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      <div>
        <Label>Routing Weight: {Math.round(formData.weights * 100)}%</Label>
        <Slider 
          value={[formData.weights]}
          onValueChange={([val]) => setFormData(f => ({ ...f, weights: val }))}
          min={0}
          max={1}
          step={0.05}
          className="mt-2"
        />
      </div>

      <div>
        <Label>Strengths (comma separated)</Label>
        <Input 
          value={formData.strengths} 
          onChange={(e) => setFormData(f => ({ ...f, strengths: e.target.value }))}
          placeholder="Coding, Analysis, Writing"
        />
      </div>

      <div>
        <Label>System Doctrine (rules, one per line)</Label>
        <Textarea 
          value={formData.rules} 
          onChange={(e) => setFormData(f => ({ ...f, rules: e.target.value }))}
          placeholder="Be precise&#10;Show reasoning"
          rows={2}
          className="font-mono text-sm"
        />
      </div>

      <div>
        <Label>Boundaries (one per line)</Label>
        <Textarea 
          value={formData.boundaries} 
          onChange={(e) => setFormData(f => ({ ...f, boundaries: e.target.value }))}
          placeholder="No financial advice&#10;Flag uncertainty"
          rows={2}
          className="font-mono text-sm"
        />
      </div>

      <div>
        <Label>Communication Style</Label>
        <Input 
          value={formData.style} 
          onChange={(e) => setFormData(f => ({ ...f, style: e.target.value }))}
          placeholder="Thoughtful, measured, probing"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="bg-primary hover:bg-primary/90">
          {agent ? 'Update' : 'Create'} Agent
        </Button>
      </div>
    </form>
  );
}
