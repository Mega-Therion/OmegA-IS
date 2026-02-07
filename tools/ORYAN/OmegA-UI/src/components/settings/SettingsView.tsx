import { useEffect, useState } from 'react';
import { Settings, Key, Eye, EyeOff, Save, Radio, AlertTriangle, Shield, Check, Mic, Server, Database } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { AppSettings } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { VoiceAuth } from '@/components/VoiceAuth';
import {
  getBrainBaseUrl,
  getBrainToken,
  getOrchestratorKey,
  getOrchestratorUrl,
  getUtilsEnabled,
} from '@/lib/orchestrator-config';

interface APIKeyConfig {
  id: 'openai' | 'groq' | 'anthropic' | 'localEndpoint';
  name: string;
  description: string;
  placeholder: string;
}

const apiConfigs: APIKeyConfig[] = [
  { 
    id: 'openai', 
    name: 'OpenAI', 
    description: 'GPT-4, GPT-3.5, and other OpenAI models',
    placeholder: 'sk-...'
  },
  { 
    id: 'groq', 
    name: 'Groq', 
    description: 'Fast inference for Llama, Mixtral, and more',
    placeholder: 'gsk_...'
  },
  { 
    id: 'anthropic', 
    name: 'Anthropic', 
    description: 'Claude models',
    placeholder: 'sk-ant-...'
  },
  { 
    id: 'localEndpoint', 
    name: 'Local LLM', 
    description: 'Custom endpoint for local models (Ollama, LM Studio)',
    placeholder: 'http://localhost:11434/v1'
  },
];

export function SettingsView() {
  const { 
    settings, 
    updateSettings, 
    externalMode, 
    toggleExternalMode,
    fourEyesMode,
    toggleFourEyesMode,
    logConsent
  } = useAppStore();
  
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({
    openai: settings.apiKeys.openai ? '••••••••••••' : '',
    groq: settings.apiKeys.groq ? '••••••••••••' : '',
    anthropic: settings.apiKeys.anthropic ? '••••••••••••' : '',
    localEndpoint: settings.apiKeys.localEndpoint || '',
  });
  
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [orchestratorUrl, setOrchestratorUrl] = useState(settings.orchestratorUrl || getOrchestratorUrl());
  const [orchestratorKey, setOrchestratorKey] = useState(
    (settings.orchestratorKey || getOrchestratorKey()) ? '••••••••••••' : ''
  );
  const [orchestratorUtilsEnabled, setOrchestratorUtilsEnabled] = useState(
    settings.orchestratorUtilsEnabled ?? getUtilsEnabled()
  );
  const [showOrchestratorKey, setShowOrchestratorKey] = useState(false);
  const [orchestratorStatus, setOrchestratorStatus] = useState<'idle' | 'checking' | 'online' | 'offline'>('idle');
  const [brainBaseUrl, setBrainBaseUrl] = useState(settings.brainBaseUrl || getBrainBaseUrl());
  const [brainToken, setBrainToken] = useState(
    (settings.brainToken || getBrainToken()) ? '••••••••••••' : ''
  );
  const [showBrainToken, setShowBrainToken] = useState(false);
  const [consentDialogOpen, setConsentDialogOpen] = useState(false);
  const [pendingExternalMode, setPendingExternalMode] = useState(false);

  useEffect(() => {
    setOrchestratorUrl(settings.orchestratorUrl || getOrchestratorUrl());
    setOrchestratorKey((settings.orchestratorKey || getOrchestratorKey()) ? '••••••••••••' : '');
    setOrchestratorUtilsEnabled(settings.orchestratorUtilsEnabled ?? getUtilsEnabled());
    setBrainBaseUrl(settings.brainBaseUrl || getBrainBaseUrl());
    setBrainToken((settings.brainToken || getBrainToken()) ? '••••••••••••' : '');
  }, [
    settings.orchestratorUrl,
    settings.orchestratorKey,
    settings.orchestratorUtilsEnabled,
    settings.brainBaseUrl,
    settings.brainToken,
  ]);

  const handleSaveKey = async (configId: string, value: string) => {
    if (value && !value.includes('••••')) {
      await updateSettings({
        apiKeys: {
          ...settings.apiKeys,
          [configId]: value,
        },
      });
      
      await logConsent({
        actionType: 'key_store',
        details: `API key stored for ${configId} (encrypted at rest)`,
        approved: true,
      });
      
      setApiKeys(prev => ({ ...prev, [configId]: '••••••••••••' }));
      toast.success(`${configId} key saved securely`);
    }
  };

  const handleSaveOrchestrator = async () => {
    const updates: Partial<AppSettings> = {
      orchestratorUrl: orchestratorUrl.trim(),
      orchestratorUtilsEnabled,
    };

    if (!orchestratorKey.includes('••••')) {
      updates.orchestratorKey = orchestratorKey;
    }

    await updateSettings(updates);
    if (!orchestratorKey.includes('••••')) {
      setOrchestratorKey(orchestratorKey ? '••••••••••••' : '');
    }
    toast.success('Orchestrator settings saved');
  };

  const handleSaveBrain = async () => {
    const updates: Partial<AppSettings> = {
      brainBaseUrl: brainBaseUrl.trim(),
    };

    if (!brainToken.includes('••••')) {
      updates.brainToken = brainToken;
    }

    await updateSettings(updates);
    if (!brainToken.includes('••••')) {
      setBrainToken(brainToken ? '••••••••••••' : '');
    }
    toast.success('Brain API settings saved');
  };

  const handleCheckOrchestrator = async () => {
    setOrchestratorStatus('checking');
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const base = (orchestratorUrl || getOrchestratorUrl()).replace(/\\/$/, '');
      const resp = await fetch(`${base}/health`, { signal: controller.signal });
      clearTimeout(timeout);
      setOrchestratorStatus(resp.ok ? 'online' : 'offline');
    } catch {
      setOrchestratorStatus('offline');
    }
  };

  const handleExternalModeToggle = () => {
    if (!externalMode) {
      setPendingExternalMode(true);
      setConsentDialogOpen(true);
    } else {
      toggleExternalMode();
      toast.success('External mode disabled');
    }
  };

  const handleConsentApprove = async () => {
    await logConsent({
      actionType: 'api_enable',
      details: 'User enabled external mode - external API calls are now permitted',
      approved: true,
    });
    toggleExternalMode();
    setConsentDialogOpen(false);
    setPendingExternalMode(false);
    toast.success('External mode enabled');
  };

  const handleConsentDeny = async () => {
    await logConsent({
      actionType: 'api_enable',
      details: 'User declined to enable external mode',
      approved: false,
    });
    setConsentDialogOpen(false);
    setPendingExternalMode(false);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-6 border-b border-border bg-background-elevated">
        <div className="flex items-center gap-3">
          <Settings className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Settings</h2>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-6">
        <div className="max-w-2xl mx-auto space-y-8">
          
          {/* Mode Settings */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Privacy & Security
            </h3>
            
            <div className="space-y-4">
              {/* 4Eyes Mode */}
              <div className="hud-panel p-4 flex items-center justify-between">
                <div>
                  <Label className="text-foreground">4Eyes Mode</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Blur sensitive content on screen for privacy
                  </p>
                </div>
                <Switch 
                  checked={fourEyesMode}
                  onCheckedChange={toggleFourEyesMode}
                />
              </div>

              {/* External Mode */}
              <div className={cn(
                "hud-panel p-4 flex items-center justify-between",
                externalMode && "border-warning/50"
              )}>
                <div>
                  <Label className="text-foreground flex items-center gap-2">
                    External Mode
                    {externalMode && (
                      <Badge variant="outline" className="text-warning border-warning/50 text-[10px]">
                        <Radio className="h-2.5 w-2.5 mr-1 animate-pulse" />
                        ACTIVE
                      </Badge>
                    )}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Allow connections to external AI APIs
                  </p>
                </div>
                <Switch 
                  checked={externalMode}
                  onCheckedChange={handleExternalModeToggle}
                />
              </div>
            </div>
          </section>

          {/* Voice Authentication */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Mic className="h-4 w-4 text-primary" />
              Voice Authentication
            </h3>
            <div className="hud-panel p-4">
              <p className="text-sm text-muted-foreground mb-4">
                Set up voice authentication to secure your commands. Only your voice will be able to execute commands.
              </p>
              <VoiceAuth mode="setup" />
            </div>
          </section>

          {/* Orchestrator Connection */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Server className="h-4 w-4 text-primary" />
              Orchestrator Spine
            </h3>
            <div className="hud-panel p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-foreground">Connection Status</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {orchestratorStatus === 'idle' && 'Run a quick health check.'}
                    {orchestratorStatus === 'checking' && 'Checking /health...'}
                    {orchestratorStatus === 'online' && 'Orchestrator is reachable.'}
                    {orchestratorStatus === 'offline' && 'Orchestrator not responding.'}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px]',
                    orchestratorStatus === 'online' && 'text-emerald-400 border-emerald-400/50',
                    orchestratorStatus === 'offline' && 'text-red-400 border-red-400/50',
                    orchestratorStatus === 'checking' && 'text-warning border-warning/50',
                    orchestratorStatus === 'idle' && 'text-muted-foreground'
                  )}
                >
                  {orchestratorStatus.toUpperCase()}
                </Badge>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Base URL</Label>
                <Input
                  value={orchestratorUrl}
                  onChange={(e) => setOrchestratorUrl(e.target.value)}
                  placeholder="http://localhost:8080"
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">API Key</Label>
                <div className="relative">
                  <Input
                    type={showOrchestratorKey ? 'text' : 'password'}
                    value={orchestratorKey}
                    onChange={(e) => setOrchestratorKey(e.target.value)}
                    placeholder="omega-key"
                    className="pr-10 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOrchestratorKey((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showOrchestratorKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-foreground">Utilities</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Enable embeddings + routing helpers
                  </p>
                </div>
                <Switch
                  checked={orchestratorUtilsEnabled}
                  onCheckedChange={setOrchestratorUtilsEnabled}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCheckOrchestrator}>
                  Test Connection
                </Button>
                <Button onClick={handleSaveOrchestrator}>
                  Save
                </Button>
              </div>
            </div>
          </section>

          {/* Brain API */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              Brain API
            </h3>
            <div className="hud-panel p-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-foreground">Base URL</Label>
                <Input
                  value={brainBaseUrl}
                  onChange={(e) => setBrainBaseUrl(e.target.value)}
                  placeholder="http://localhost:3001"
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Bearer Token</Label>
                <div className="relative">
                  <Input
                    type={showBrainToken ? 'text' : 'password'}
                    value={brainToken}
                    onChange={(e) => setBrainToken(e.target.value)}
                    placeholder="brain-token"
                    className="pr-10 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowBrainToken((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showBrainToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveBrain}>
                  Save
                </Button>
              </div>
            </div>
          </section>

          {/* API Connectors */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Key className="h-4 w-4 text-primary" />
              API Connectors
              {!externalMode && (
                <Badge variant="outline" className="text-muted-foreground text-[10px]">
                  Requires External Mode
                </Badge>
              )}
            </h3>
            
            <div className={cn(
              "space-y-3",
              !externalMode && "opacity-50 pointer-events-none"
            )}>
              {apiConfigs.map((config) => (
                <div key={config.id} className="hud-panel p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <Label className="text-foreground flex items-center gap-2">
                        {config.name}
                        {settings.apiKeys[config.id] && (
                          <Check className="h-3 w-3 text-success" />
                        )}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {config.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showKeys[config.id] ? 'text' : 'password'}
                        value={apiKeys[config.id] || ''}
                        onChange={(e) => setApiKeys(prev => ({ ...prev, [config.id]: e.target.value }))}
                        placeholder={config.placeholder}
                        className="pr-10 font-mono text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKeys(prev => ({ ...prev, [config.id]: !prev[config.id] }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showKeys[config.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <Button 
                      variant="outline"
                      onClick={() => handleSaveKey(config.id, apiKeys[config.id])}
                      disabled={!apiKeys[config.id] || apiKeys[config.id].includes('••••')}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            <p className="text-xs text-muted-foreground mt-3 px-1">
              Keys are encrypted at rest using WebCrypto. They are never displayed after saving.
            </p>
          </section>

          {/* About */}
          <section className="pb-8">
            <h3 className="text-sm font-semibold text-foreground mb-4">About</h3>
            <div className="hud-panel p-4 text-sm text-muted-foreground space-y-2">
              <p><strong className="text-foreground">OMEGAI Command Deck</strong> v1.0.0</p>
              <p>Local-first, privacy-forward AI command center</p>
              <p className="text-xs font-mono">Built for RY • Gentle Authority Governance</p>
            </div>
          </section>
        </div>
      </ScrollArea>

      {/* Consent Dialog */}
      <Dialog open={consentDialogOpen} onOpenChange={setConsentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              Enable External Mode?
            </DialogTitle>
            <DialogDescription className="pt-2 space-y-3">
              <p>
                Enabling External Mode will allow OMEGAI to make API calls to external services 
                (OpenAI, Groq, Anthropic, etc.) when you send messages.
              </p>
              <p>
                This means your messages and context may be sent to third-party servers 
                according to their respective privacy policies.
              </p>
              <p className="font-medium text-foreground">
                Do you consent to enabling external API connections?
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleConsentDeny}>
              Deny
            </Button>
            <Button onClick={handleConsentApprove} className="bg-warning text-warning-foreground hover:bg-warning/90">
              I Consent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
