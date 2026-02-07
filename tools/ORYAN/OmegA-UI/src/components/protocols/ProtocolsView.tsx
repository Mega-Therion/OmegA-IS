import { useState } from 'react';
import { Plus, BookOpen, Play, Edit2, Trash2, Hash, Zap } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { Protocol } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

export function ProtocolsView() {
  const { protocols, addProtocol } = useAppStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [...new Set(protocols.map(p => p.category))];
  const filteredProtocols = selectedCategory 
    ? protocols.filter(p => p.category === selectedCategory)
    : protocols;

  const handleSave = async (data: Partial<Protocol>) => {
    await addProtocol({
      name: data.name || 'New Protocol',
      triggerPhrase: data.triggerPhrase || '',
      content: data.content || '',
      category: data.category || 'General',
    });
    setDialogOpen(false);
    toast.success('Protocol created');
  };

  const handleApply = (protocol: Protocol) => {
    navigator.clipboard.writeText(protocol.content);
    toast.success(`"${protocol.name}" copied to clipboard - paste in chat to apply`);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-6 border-b border-border bg-background-elevated">
        <div className="flex items-center gap-3">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Protocols</h2>
          <Badge variant="outline" className="font-mono">{protocols.length} playbooks</Badge>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              New Protocol
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Protocol</DialogTitle>
            </DialogHeader>
            <ProtocolForm 
              onSave={handleSave}
              onCancel={() => setDialogOpen(false)}
              categories={categories}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Category Filter */}
      <div className="px-6 py-3 border-b border-border flex gap-2 overflow-x-auto">
        <Button
          variant={selectedCategory === null ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory(null)}
        >
          All
        </Button>
        {categories.map(cat => (
          <Button
            key={cat}
            variant={selectedCategory === cat ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-6">
        {filteredProtocols.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-4 glow-cyan">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No protocols yet</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Create reusable playbooks to guide your AI crew's responses
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProtocols.map((protocol) => (
              <ProtocolCard 
                key={protocol.id} 
                protocol={protocol}
                onApply={() => handleApply(protocol)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function ProtocolCard({ protocol, onApply }: { protocol: Protocol; onApply: () => void }) {
  return (
    <div className="hud-panel p-5 group hover:border-glow transition-all">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="font-semibold text-foreground">{protocol.name}</h4>
          <Badge variant="outline" className="mt-1 text-[10px]">{protocol.category}</Badge>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={onApply}
          className="gap-1 text-primary border-primary/30 hover:bg-primary/10"
        >
          <Play className="h-3 w-3" />
          Apply
        </Button>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Hash className="h-3 w-3 text-muted-foreground" />
        <code className="text-sm font-mono text-primary">{protocol.triggerPhrase}</code>
      </div>

      <p className="mt-3 text-sm text-muted-foreground line-clamp-3">
        {protocol.content}
      </p>
    </div>
  );
}

function ProtocolForm({ 
  onSave, 
  onCancel,
  categories 
}: { 
  onSave: (data: Partial<Protocol>) => void;
  onCancel: () => void;
  categories: string[];
}) {
  const [formData, setFormData] = useState({
    name: '',
    triggerPhrase: '',
    content: '',
    category: 'General',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Name</Label>
          <Input 
            value={formData.name} 
            onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
            placeholder="Protocol name"
          />
        </div>
        <div>
          <Label>Trigger Phrase</Label>
          <Input 
            value={formData.triggerPhrase} 
            onChange={(e) => setFormData(f => ({ ...f, triggerPhrase: e.target.value }))}
            placeholder="/command"
            className="font-mono"
          />
        </div>
      </div>

      <div>
        <Label>Category</Label>
        <Select 
          value={formData.category}
          onValueChange={(val) => setFormData(f => ({ ...f, category: val }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {['General', 'Thinking', 'Communication', 'Planning', 'Efficiency'].map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Instructions</Label>
        <Textarea 
          value={formData.content} 
          onChange={(e) => setFormData(f => ({ ...f, content: e.target.value }))}
          placeholder="Instructions that will be prepended to messages when this protocol is active..."
          rows={5}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="bg-primary hover:bg-primary/90">
          Create Protocol
        </Button>
      </div>
    </form>
  );
}
