import { useEffect } from 'react';
import { useAppStore } from '@/stores/app-store';
import { seedDatabase } from '@/lib/seed-data';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { CommandPalette } from '@/components/CommandPalette';
import { ChatView } from '@/components/chat/ChatView';
import { CrewView } from '@/components/crew/CrewView';
import { MemoryView } from '@/components/memory/MemoryView';
import { ProtocolsView } from '@/components/protocols/ProtocolsView';
import { TasksView } from '@/components/tasks/TasksView';
import { ConsentView } from '@/components/consent/ConsentView';
import { SettingsView } from '@/components/settings/SettingsView';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { currentView, isLoading, isInitialized, loadData } = useAppStore();

  useEffect(() => {
    const init = async () => {
      await seedDatabase();
      await loadData();
    };
    init();
  }, [loadData]);

  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-xl bg-primary/20 border border-primary/50 flex items-center justify-center mx-auto mb-4 glow-cyan">
            <span className="text-primary font-mono font-bold text-2xl">Ω</span>
          </div>
          <div className="flex items-center gap-2 text-primary">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="font-mono text-sm">Initializing OMEGAI...</span>
          </div>
        </div>
      </div>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'chat': return <ChatView />;
      case 'crew': return <CrewView />;
      case 'memory': return <MemoryView />;
      case 'protocols': return <ProtocolsView />;
      case 'tasks': return <TasksView />;
      case 'consent': return <ConsentView />;
      case 'settings': return <SettingsView />;
      default: return <ChatView />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <AppSidebar />
      <main className="flex-1 min-w-0 overflow-hidden">
        {renderView()}
      </main>
      <CommandPalette />
    </div>
  );
};

export default Index;
