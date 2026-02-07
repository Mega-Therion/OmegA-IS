import { Shield, CheckCircle2, XCircle, Calendar, AlertTriangle, Info } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { ConsentEvent } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow, format } from 'date-fns';

const actionTypeConfig: Record<ConsentEvent['actionType'], { label: string; icon: React.ElementType; color: string }> = {
  api_enable: { label: 'API Enabled', icon: Shield, color: 'text-secondary' },
  external_call: { label: 'External Call', icon: AlertTriangle, color: 'text-warning' },
  data_sync: { label: 'Data Sync', icon: Info, color: 'text-primary' },
  key_store: { label: 'Key Storage', icon: Shield, color: 'text-success' },
};

export function ConsentView() {
  const { consentEvents, externalMode } = useAppStore();

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-6 border-b border-border bg-background-elevated">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Consent & Audit</h2>
          <Badge variant="outline" className="font-mono">{consentEvents.length} events</Badge>
        </div>
        {externalMode && (
          <Badge variant="outline" className="text-warning border-warning/50 bg-warning/10">
            <AlertTriangle className="h-3 w-3 mr-1" />
            EXTERNAL MODE ACTIVE
          </Badge>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-6">
        <div className="max-w-3xl mx-auto">
          {/* Governance Info */}
          <div className="hud-panel-glow p-6 mb-6">
            <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Gentle Authority Doctrine
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This system operates on a principle of explicit consent. All external API calls, 
              data synchronization, and key storage events require your explicit approval. 
              This log provides a complete audit trail of all authorized actions.
            </p>
            <div className="mt-4 flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="status-online" />
                <span className="text-foreground">Local Mode</span>
              </div>
              {externalMode && (
                <div className="flex items-center gap-2">
                  <div className="status-warning" />
                  <span className="text-warning">External Mode</span>
                </div>
              )}
            </div>
          </div>

          {/* Event Timeline */}
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-muted-foreground mb-4 px-2">
              Consent Log
            </h3>
            
            {consentEvents.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No consent events recorded yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {consentEvents.map((event) => (
                  <ConsentEventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function ConsentEventCard({ event }: { event: ConsentEvent }) {
  const config = actionTypeConfig[event.actionType];
  const Icon = config.icon;

  return (
    <div className={cn(
      "hud-panel p-4 flex items-start gap-4",
      event.approved ? "border-l-2 border-l-success" : "border-l-2 border-l-destructive"
    )}>
      <div className={cn("mt-0.5", config.color)}>
        <Icon className="h-5 w-5" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-foreground">{config.label}</span>
          {event.approved ? (
            <Badge variant="outline" className="text-success border-success/30 text-[10px]">
              <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
              Approved
            </Badge>
          ) : (
            <Badge variant="outline" className="text-destructive border-destructive/30 text-[10px]">
              <XCircle className="h-2.5 w-2.5 mr-1" />
              Denied
            </Badge>
          )}
        </div>
        
        <p className="text-sm text-muted-foreground">{event.details}</p>
        
        <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>{format(new Date(event.createdAt), 'PPp')}</span>
          <span className="mx-1">•</span>
          <span>{formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}</span>
        </div>
      </div>
    </div>
  );
}
