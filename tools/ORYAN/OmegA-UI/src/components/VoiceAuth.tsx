// OMEGAI Voice Authentication Component
import { useState, useEffect } from 'react';
import { Mic, MicOff, Check, X, Settings2, Trash2 } from 'lucide-react';
import { useVoiceCapture } from '@/hooks/useVoiceCapture';
import { useVoiceAuthStore } from '@/stores/voiceAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface VoiceAuthProps {
  onAuthSuccess?: (transcript: string) => void;
  onAuthFailure?: (transcript: string) => void;
  mode?: 'setup' | 'verify';
  className?: string;
}

export function VoiceAuth({
  onAuthSuccess,
  onAuthFailure,
  mode = 'verify',
  className,
}: VoiceAuthProps) {
  const {
    fingerprint,
    isAuthenticated,
    failedAttempts,
    maxFailedAttempts,
    similarityThreshold,
    setFingerprint,
    clearFingerprint,
    verifyVoice,
    recordAuthAttempt,
    setSimilarityThreshold,
  } = useVoiceAuthStore();

  const [isSetupMode, setIsSetupMode] = useState(mode === 'setup' || !fingerprint);
  const [showSettings, setShowSettings] = useState(false);
  const [lastSimilarity, setLastSimilarity] = useState<number | null>(null);

  const {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoiceCapture({
    continuous: false,
    interimResults: true,
  });

  useEffect(() => {
    if (mode === 'setup') {
      setIsSetupMode(true);
    }
  }, [mode]);

  // Handle voice capture result
  useEffect(() => {
    if (transcript && !isListening) {
      if (isSetupMode) {
        // Setup mode: record the voice fingerprint
        handleSetupComplete(transcript);
      } else {
        // Verify mode: check against fingerprint
        handleVerifyVoice(transcript);
      }
    }
  }, [transcript, isListening, isSetupMode]);

  const handleSetupComplete = (voiceTranscript: string) => {
    if (voiceTranscript.trim().length < 5) {
      toast.error('Passphrase too short. Please speak at least 5 words.');
      resetTranscript();
      return;
    }

    setFingerprint(voiceTranscript);
    toast.success('Voice fingerprint recorded successfully!');
    setIsSetupMode(false);
    resetTranscript();
  };

  const handleVerifyVoice = (voiceTranscript: string) => {
    const { isMatch, similarity } = verifyVoice(voiceTranscript);
    setLastSimilarity(similarity);

    if (isMatch) {
      recordAuthAttempt(true);
      toast.success(`Voice verified! (${(similarity * 100).toFixed(0)}% match)`);
      onAuthSuccess?.(voiceTranscript);
    } else {
      recordAuthAttempt(false);
      toast.error(`Voice not recognized (${(similarity * 100).toFixed(0)}% match). Try again.`);
      onAuthFailure?.(voiceTranscript);
    }

    resetTranscript();
  };

  const handleStartRecording = () => {
    resetTranscript();
    setLastSimilarity(null);
    startListening({
      onError: (err) => {
        toast.error(`Microphone error: ${err}`);
      },
    });
  };

  const handleClearFingerprint = () => {
    clearFingerprint();
    setIsSetupMode(true);
    resetTranscript();
    setLastSimilarity(null);
    toast.info('Voice fingerprint cleared');
  };

  if (!isSupported) {
    return (
      <div className={cn('p-4 bg-destructive/10 border border-destructive rounded-lg', className)}>
        <p className="text-sm text-destructive">
          Voice recognition is not supported in this browser. Please use Chrome, Edge, or Safari.
        </p>
      </div>
    );
  }

  const isLocked = failedAttempts >= maxFailedAttempts;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <Badge
          variant={isAuthenticated ? 'default' : 'outline'}
          className={cn(
            'text-xs font-mono',
            isAuthenticated && 'bg-green-500/20 text-green-400 border-green-500/50',
            isLocked && 'bg-red-500/20 text-red-400 border-red-500/50'
          )}
        >
          {isSetupMode
            ? 'Setup Required'
            : isAuthenticated
            ? 'Voice Verified'
            : isLocked
            ? 'Locked - Too Many Failed Attempts'
            : 'Voice Auth Ready'}
        </Badge>

        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <Settings2 className="h-3 w-3" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Voice Auth Settings</DialogTitle>
              <DialogDescription>
                Configure voice authentication parameters
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Similarity Threshold: {(similarityThreshold * 100).toFixed(0)}%
                </label>
                <Slider
                  value={[similarityThreshold * 100]}
                  onValueChange={(val) => setSimilarityThreshold(val[0] / 100)}
                  min={50}
                  max={95}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Higher = more strict, Lower = more lenient
                </p>
              </div>

              {fingerprint && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Stored Passphrase</label>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-mono">{fingerprint.passPhrase}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Recorded: {new Date(fingerprint.recordedAt).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleClearFingerprint}
                    className="w-full"
                  >
                    <Trash2 className="h-3 w-3 mr-2" />
                    Clear Fingerprint
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Recording Interface */}
      <div className="relative">
        <div
          className={cn(
            'p-4 rounded-lg border-2 transition-all',
            isListening
              ? 'border-primary bg-primary/10 glow-cyan'
              : isAuthenticated
              ? 'border-green-500/50 bg-green-500/5'
              : 'border-border bg-background-elevated'
          )}
        >
          <div className="flex items-center gap-3">
            <Button
              onClick={isListening ? stopListening : handleStartRecording}
              disabled={isLocked}
              variant={isListening ? 'destructive' : 'default'}
              size="lg"
              className={cn(
                'h-12 w-12 rounded-full',
                !isListening && 'bg-primary hover:bg-primary/90 glow-cyan'
              )}
            >
              {isListening ? (
                <MicOff className="h-5 w-5" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </Button>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                {isSetupMode
                  ? 'Record Your Voice'
                  : isListening
                  ? 'Listening...'
                  : 'Click to Authenticate'}
              </p>
              <p className="text-xs text-muted-foreground">
                {isSetupMode
                  ? 'Speak a unique passphrase (5+ words)'
                  : isLocked
                  ? `Locked. Clear fingerprint to reset.`
                  : `${failedAttempts}/${maxFailedAttempts} failed attempts`}
              </p>
            </div>

            {isAuthenticated && !isSetupMode && (
              <Check className="h-5 w-5 text-green-400" />
            )}
            {isLocked && <X className="h-5 w-5 text-red-400" />}
          </div>

          {/* Transcript Display */}
          {(transcript || interimTranscript) && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-sm font-mono">
                {transcript || (
                  <span className="text-muted-foreground italic">{interimTranscript}</span>
                )}
              </p>
              {lastSimilarity !== null && (
                <p className="text-xs text-muted-foreground mt-1">
                  Match: {(lastSimilarity * 100).toFixed(1)}%
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="mt-3 pt-3 border-t border-destructive/30">
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      {isSetupMode && (
        <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
          <p className="font-medium mb-1">Setup Instructions:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Click the microphone button</li>
            <li>Speak a unique passphrase (e.g., "Omega authorize full system access")</li>
            <li>Make it at least 5 words for better security</li>
            <li>You'll need to speak this same phrase to authenticate later</li>
          </ol>
        </div>
      )}
    </div>
  );
}
