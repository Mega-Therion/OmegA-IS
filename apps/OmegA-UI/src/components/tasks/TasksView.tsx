import { useState } from 'react';
import { Plus, ListTodo, GripVertical, MoreVertical, Trash2, Link2, Flag } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { Task, TaskStatus, TaskPriority } from '@/lib/types';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

const columns: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'backlog', label: 'Backlog', color: 'text-muted-foreground' },
  { id: 'doing', label: 'Doing', color: 'text-warning' },
  { id: 'done', label: 'Done', color: 'text-success' },
];

const priorityConfig: Record<TaskPriority, { label: string; color: string }> = {
  low: { label: 'Low', color: 'text-muted-foreground' },
  medium: { label: 'Medium', color: 'text-secondary' },
  high: { label: 'High', color: 'text-warning' },
  critical: { label: 'Critical', color: 'text-destructive' },
};

export function TasksView() {
  const { tasks, addTask, updateTask, deleteTask } = useAppStore();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCreateTask = async (data: Partial<Task>) => {
    await addTask({
      title: data.title || 'New Task',
      description: data.description,
      status: data.status || 'backlog',
      priority: data.priority || 'medium',
      links: data.links || {},
    });
    setDialogOpen(false);
    toast.success('Task created');
  };

  const handleMoveTask = async (task: Task, newStatus: TaskStatus) => {
    await updateTask({ ...task, status: newStatus });
  };

  const handleDeleteTask = async (id: string) => {
    await deleteTask(id);
    toast.success('Task deleted');
  };

  const getColumnTasks = (status: TaskStatus) => 
    tasks.filter(t => t.status === status)
      .sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-6 border-b border-border bg-background-elevated">
        <div className="flex items-center gap-3">
          <ListTodo className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Tasking (Ops)</h2>
          <Badge variant="outline" className="font-mono">{tasks.length} tasks</Badge>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              New Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
            </DialogHeader>
            <TaskForm 
              onSave={handleCreateTask}
              onCancel={() => setDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 p-6 overflow-x-auto">
        <div className="flex gap-4 h-full min-w-max">
          {columns.map((column) => (
            <div key={column.id} className="w-80 flex flex-col">
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3 px-2">
                <div className="flex items-center gap-2">
                  <h3 className={cn("font-semibold text-sm", column.color)}>
                    {column.label}
                  </h3>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {getColumnTasks(column.id).length}
                  </Badge>
                </div>
              </div>

              {/* Column Content */}
              <ScrollArea className="flex-1 hud-panel p-2">
                <div className="space-y-2">
                  {getColumnTasks(column.id).map((task) => (
                    <TaskCard 
                      key={task.id}
                      task={task}
                      onMove={(status) => handleMoveTask(task, status)}
                      onDelete={() => handleDeleteTask(task.id)}
                    />
                  ))}
                  
                  {getColumnTasks(column.id).length === 0 && (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      No tasks
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TaskCard({ 
  task, 
  onMove, 
  onDelete 
}: { 
  task: Task; 
  onMove: (status: TaskStatus) => void;
  onDelete: () => void;
}) {
  const priority = priorityConfig[task.priority];

  return (
    <div className="glass-card p-3 group hover:border-primary/30 transition-all cursor-grab">
      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{task.title}</p>
          {task.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {task.description}
            </p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {columns.filter(c => c.id !== task.status).map(col => (
              <DropdownMenuItem key={col.id} onClick={() => onMove(col.id)}>
                Move to {col.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="h-3 w-3 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <Badge 
          variant="outline" 
          className={cn("text-[10px]", priority.color)}
        >
          <Flag className="h-2.5 w-2.5 mr-1" />
          {priority.label}
        </Badge>
        
        {(task.links.conversationId || task.links.memoryId) && (
          <Badge variant="outline" className="text-[10px]">
            <Link2 className="h-2.5 w-2.5 mr-1" />
            Linked
          </Badge>
        )}
      </div>
    </div>
  );
}

function TaskForm({ 
  onSave, 
  onCancel 
}: { 
  onSave: (data: Partial<Task>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'backlog' as TaskStatus,
    priority: 'medium' as TaskPriority,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Title</Label>
        <Input 
          value={formData.title} 
          onChange={(e) => setFormData(f => ({ ...f, title: e.target.value }))}
          placeholder="Task title"
        />
      </div>

      <div>
        <Label>Description (optional)</Label>
        <Textarea 
          value={formData.description} 
          onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
          placeholder="Task details..."
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Status</Label>
          <Select 
            value={formData.status}
            onValueChange={(val: TaskStatus) => setFormData(f => ({ ...f, status: val }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {columns.map(col => (
                <SelectItem key={col.id} value={col.id}>{col.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Priority</Label>
          <Select 
            value={formData.priority}
            onValueChange={(val: TaskPriority) => setFormData(f => ({ ...f, priority: val }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(priorityConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="bg-primary hover:bg-primary/90">
          Create Task
        </Button>
      </div>
    </form>
  );
}
