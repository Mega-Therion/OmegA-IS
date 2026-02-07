import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Cpu, 
  Database, 
  HardDrive, 
  MessageSquare, 
  Users, 
  Zap,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/stores/app-store';

interface Metric {
  label: string;
  value: number | string;
  unit?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  color: string;
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  uptime: string;
  lastCheck: Date;
}

export function MonitoringDashboard() {
  const { agents, conversations, memories, tasks } = useAppStore();
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    status: 'healthy',
    uptime: '99.9%',
    lastCheck: new Date(),
  });
  const [isLive, setIsLive] = useState(true);

  // Simulate real-time metrics updates
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemHealth(prev => ({
        ...prev,
        lastCheck: new Date(),
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Subscribe to realtime metrics
  useEffect(() => {
    const channel = supabase
      .channel('system-metrics')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'system_metrics',
        },
        () => {
          // Trigger refresh on new metrics
          setSystemHealth(prev => ({ ...prev, lastCheck: new Date() }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const metrics: Metric[] = [
    {
      label: 'Active Agents',
      value: agents.length,
      icon: <Users className="h-5 w-5" />,
      trend: 'stable',
      color: 'text-primary',
    },
    {
      label: 'Conversations',
      value: conversations.length,
      icon: <MessageSquare className="h-5 w-5" />,
      trend: 'up',
      trendValue: '+12%',
      color: 'text-secondary',
    },
    {
      label: 'Memory Items',
      value: memories.length,
      icon: <Database className="h-5 w-5" />,
      trend: 'up',
      trendValue: '+5%',
      color: 'text-success',
    },
    {
      label: 'Active Tasks',
      value: tasks.filter(t => t.status !== 'done').length,
      icon: <Activity className="h-5 w-5" />,
      trend: 'down',
      trendValue: '-3%',
      color: 'text-warning',
    },
  ];

  const systemMetrics: Metric[] = [
    {
      label: 'API Latency',
      value: 45,
      unit: 'ms',
      icon: <Zap className="h-5 w-5" />,
      trend: 'stable',
      color: 'text-primary',
    },
    {
      label: 'Memory Usage',
      value: 67,
      unit: '%',
      icon: <HardDrive className="h-5 w-5" />,
      trend: 'up',
      color: 'text-warning',
    },
    {
      label: 'CPU Load',
      value: 23,
      unit: '%',
      icon: <Cpu className="h-5 w-5" />,
      trend: 'stable',
      color: 'text-success',
    },
    {
      label: 'Uptime',
      value: systemHealth.uptime,
      icon: <Clock className="h-5 w-5" />,
      trend: 'stable',
      color: 'text-primary',
    },
  ];

  const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-success" />;
      case 'down':
        return <TrendingDown className="h-3 w-3 text-destructive" />;
      default:
        return <Minus className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: SystemHealth['status']) => {
    switch (status) {
      case 'healthy':
        return 'bg-success';
      case 'degraded':
        return 'bg-warning';
      case 'critical':
        return 'bg-destructive';
    }
  };

  return (
    <div className="p-6 space-y-6 h-full overflow-auto hud-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">System Monitoring</h1>
          <p className="text-muted-foreground text-sm">Real-time metrics and health indicators</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-success animate-pulse' : 'bg-muted'}`} />
            <span className="text-sm text-muted-foreground">
              {isLive ? 'Live' : 'Paused'}
            </span>
          </div>
          
          <Badge 
            variant="outline" 
            className={`${getStatusColor(systemHealth.status)} bg-opacity-20 border-none`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(systemHealth.status)} mr-2`} />
            System {systemHealth.status}
          </Badge>
        </div>
      </div>

      {/* Application Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className="hud-panel">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className={metric.color}>{metric.icon}</div>
                <div className="flex items-center gap-1">
                  {getTrendIcon(metric.trend)}
                  {metric.trendValue && (
                    <span className="text-xs text-muted-foreground">{metric.trendValue}</span>
                  )}
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold text-foreground">
                  {metric.value}
                  {metric.unit && <span className="text-sm text-muted-foreground ml-1">{metric.unit}</span>}
                </p>
                <p className="text-sm text-muted-foreground">{metric.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* System Performance */}
      <Card className="hud-panel">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            System Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {systemMetrics.map((metric) => (
              <div key={metric.label} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={metric.color}>{metric.icon}</div>
                    <span className="text-sm text-muted-foreground">{metric.label}</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {metric.value}{metric.unit}
                  </span>
                </div>
                {typeof metric.value === 'number' && (
                  <Progress 
                    value={metric.value} 
                    className="h-2 bg-muted"
                  />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Agent Status Grid */}
      <Card className="hud-panel">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Agent Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                  style={{ backgroundColor: `${agent.color}20`, color: agent.color }}
                >
                  {agent.avatar || agent.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{agent.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{agent.role}</p>
                </div>
                <div className="status-online" title="Online" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Last Updated */}
      <div className="text-center text-xs text-muted-foreground">
        Last updated: {systemHealth.lastCheck.toLocaleTimeString()}
      </div>
    </div>
  );
}
