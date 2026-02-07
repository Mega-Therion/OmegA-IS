import { useState } from 'react';
import { Plus, Search, Pin, PinOff, Edit2, Trash2, Brain, Tag, Calendar, Sparkles } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { MemoryItem } from '@/lib/types';
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
import { Slider } from '@/components/ui/slider';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export function MemoryView() {
  const { memories, addMemory, updateMemory, deleteMemory, fourEyesMode } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMemory, setEditingMemory] = useState<MemoryItem | null>(null);
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);

  const filteredMemories = memories.filter(mem => {
    const matchesSearch = searchQuery === '' || 
      mem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mem.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mem.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesPinned = !showPinnedOnly || mem.pinned;
    return matchesSearch && matchesPinned;
  });

  const pinnedMemories = filteredMemories.filter(m => m.pinned);
  const regularMemories = filteredMemories.filter(m => !m.pinned);

  const handleSave = async (data: Partial<MemoryItem>) => {
    if (editingMemory) {
      await updateMemory({ ...editingMemory, ...data } as MemoryItem);
      toast.success('Memory updated');
    } else {
      await addMemory({
        title: data.title || 'Untitled',
        content: data.content || '',
        tags: data.tags || [],
        source: data.source || 'Manual',
        confidence: data.confidence || 0.9,
        pinned: data.pinned || false,
      });
      toast.success('Memory saved');
    }
    setDialogOpen(false);
    setEditingMemory(null);
  };

  const handleDelete = async (id: string) => {
    await deleteMemory(id);
    toast.success('Memory deleted');
  };

  const handleTogglePin = async (memory: MemoryItem) => {
    await updateMemory({ ...memory, pinned: !memory.pinned });
    toast.success(memory.pinned ? 'Unpinned' : 'Pinned to board');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-6 border-b border-border bg-background-elevated">
        <div className="flex items-center gap-3">
          <Brain className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Memory Vault</h2>
          <Badge variant="outline" className="font-mono">{memories.length} items</Badge>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => setEditingMemory(null)}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              New Memory
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingMemory ? 'Edit Memory' : 'Create New Memory'}</DialogTitle>
            </DialogHeader>
            <MemoryForm 
              memory={editingMemory}
              onSave={handleSave}
              onCancel={() => setDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search & Filters */}
      <div className="px-6 py-3 border-b border-border flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memories, tags..."
            className="pl-9"
          />
        </div>
        <Button
          variant={showPinnedOnly ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowPinnedOnly(!showPinnedOnly)}
          className="gap-2"
        >
          <Pin className="h-4 w-4" />
          Pinboard
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-6">
        {filteredMemories.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-4 glow-cyan">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {searchQuery ? 'No matches found' : 'Memory Vault is empty'}
            </h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              {searchQuery 
                ? 'Try a different search term or clear the filter'
                : 'Save important insights, quotes, and knowledge here for quick retrieval'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {pinnedMemories.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Pin className="h-3 w-3" />
                  Pinboard
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {pinnedMemories.map((memory) => (
                    <MemoryCard
                      key={memory.id}
                      memory={memory}
                      fourEyesMode={fourEyesMode}
                      onEdit={() => { setEditingMemory(memory); setDialogOpen(true); }}
                      onDelete={() => handleDelete(memory.id)}
                      onTogglePin={() => handleTogglePin(memory)}
                    />
                  ))}
                </div>
              </div>
            )}

            {regularMemories.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  All Memories
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {regularMemories.map((memory) => (
                    <MemoryCard
                      key={memory.id}
                      memory={memory}
                      fourEyesMode={fourEyesMode}
                      onEdit={() => { setEditingMemory(memory); setDialogOpen(true); }}
                      onDelete={() => handleDelete(memory.id)}
                      onTogglePin={() => handleTogglePin(memory)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function MemoryCard({ 
  memory, 
  fourEyesMode,
  onEdit, 
  onDelete,
  onTogglePin 
}: { 
  memory: MemoryItem;
  fourEyesMode: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
}) {
  return (
    <div className={cn(
      "hud-panel p-4 group hover:border-glow transition-all",
      memory.pinned && "border-primary/50"
    )}>
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-medium text-foreground line-clamp-1">{memory.title}</h4>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6"
            onClick={onTogglePin}
          >
            {memory.pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onEdit}>
            <Edit2 className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={onDelete}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <p className={cn(
        "mt-2 text-sm text-muted-foreground line-clamp-3",
        fourEyesMode && "four-eyes-blur"
      )}>
        {memory.content}
      </p>

      <div className="mt-3 flex flex-wrap gap-1">
        {memory.tags.slice(0, 3).map((tag, idx) => (
          <Badge key={idx} variant="outline" className="text-[10px]">
            <Tag className="h-2.5 w-2.5 mr-1" />
            {tag}
          </Badge>
        ))}
        {memory.tags.length > 3 && (
          <Badge variant="outline" className="text-[10px]">+{memory.tags.length - 3}</Badge>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {formatDistanceToNow(new Date(memory.createdAt), { addSuffix: true })}
        </span>
        <span className="font-mono">
          {Math.round(memory.confidence * 100)}% conf
        </span>
      </div>
    </div>
  );
}

function MemoryForm({ 
  memory, 
  onSave, 
  onCancel 
}: { 
  memory: MemoryItem | null; 
  onSave: (data: Partial<MemoryItem>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    title: memory?.title || '',
    content: memory?.content || '',
    tags: memory?.tags?.join(', ') || '',
    source: memory?.source || '',
    confidence: memory?.confidence || 0.9,
    pinned: memory?.pinned || false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title: formData.title,
      content: formData.content,
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
      source: formData.source,
      confidence: formData.confidence,
      pinned: formData.pinned,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Title</Label>
        <Input 
          value={formData.title} 
          onChange={(e) => setFormData(f => ({ ...f, title: e.target.value }))}
          placeholder="Memory title"
        />
      </div>

      <div>
        <Label>Content</Label>
        <Textarea 
          value={formData.content} 
          onChange={(e) => setFormData(f => ({ ...f, content: e.target.value }))}
          placeholder="What do you want to remember?"
          rows={4}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Tags (comma separated)</Label>
          <Input 
            value={formData.tags} 
            onChange={(e) => setFormData(f => ({ ...f, tags: e.target.value }))}
            placeholder="strategy, important"
          />
        </div>
        <div>
          <Label>Source</Label>
          <Input 
            value={formData.source} 
            onChange={(e) => setFormData(f => ({ ...f, source: e.target.value }))}
            placeholder="Where is this from?"
          />
        </div>
      </div>

      <div>
        <Label>Confidence: {Math.round(formData.confidence * 100)}%</Label>
        <Slider 
          value={[formData.confidence]}
          onValueChange={([val]) => setFormData(f => ({ ...f, confidence: val }))}
          min={0}
          max={1}
          step={0.05}
          className="mt-2"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="bg-primary hover:bg-primary/90">
          {memory ? 'Update' : 'Save'} Memory
        </Button>
      </div>
    </form>
  );
}
