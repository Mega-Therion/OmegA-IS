// OMEGAI Voice-Enabled Chat Input
import { useState, useEffect } from 'react';
import { Mic, Send, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useVoiceCapture } from '@/hooks/useVoiceCapture';
import { useVoiceAuthStore } from '@/stores/voiceAuth';
import { sendToChatbot } from '@/integrations/voiceGuard';
import { toast } from 'sonner';

interface VoiceChatInputProps {
  inputValue: string;
  setInputValue: (value: string) => void;
  onSend: (message: string, isVoiceAuthenticated: boolean) => void;
  isTyping: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export function VoiceChatInput({
  inputValue,
  setInputValue,
  onSend,
  isTyping,
  inputRef,
  onKeyDown,
}: VoiceChatInputProps) {
  const {
    fingerprint,
    isAuthenticated,
    failedAttempts,
    maxFailedAttempts,
    verifyVoice,
    recordAuthAttempt,
  } = useVoiceAuthStore();

  const [voiceMode, setVoiceMode] = useState(false);
  const [lastVerificationResult, setLastVerificationResult] = useState<{
    isMatch: boolean;
    similarity: number;
  } | null>(null);

  const {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoiceCapture({
    continuous: false,
    interimResults: true,
  });

  // Auto-fill input with voice transcript
  useEffect(() => {
    if (voiceMode && (transcript || interimTranscript)) {
      setInputValue(transcript || interimTranscript);
    }
  }, [transcript, interimTranscript, voiceMode, setInputValue]);

  // When voice capture completes, verify and send
  useEffect(() => {
    if (voiceMode && transcript && !isListening) {
      handleVoiceComplete(transcript);
    }
  }, [transcript, isListening, voiceMode]);

  const handleVoiceComplete = async (voiceTranscript: string) => {
    if (!fingerprint) {
      // No voice fingerprint set up - treat as regular chatbot
      toast.info('No voice fingerprint set. Sending to generic chatbot.');
      await handleChatbotFallback(voiceTranscript);
      resetVoiceMode();
      return;
    }

    // Verify voice
    const result = verifyVoice(voiceTranscript);
    setLastVerificationResult(result);

    if (result.isMatch) {
      // Voice authenticated - send as authorized command
      recordAuthAttempt(true);
      toast.success(`Voice verified (${(result.similarity * 100).toFixed(0)}% match)`);
      onSend(voiceTranscript, true);
      resetVoiceMode();
    } else {
      // Voice not authenticated - send to generic chatbot
      recordAuthAttempt(false);
      toast.error(`Voice not recognized (${(result.similarity * 100).toFixed(0)}% match)`);
      await handleChatbotFallback(voiceTranscript);
      resetVoiceMode();
    }
  };

  const handleChatbotFallback = async (message: string) => {
    // Send to generic chatbot endpoint
    const response = await sendToChatbot(message);
    toast.info('Routed to generic chatbot (no voice auth)');

    // You could also add a message to the chat showing the chatbot response
    // For now, just show a toast
  };

  const resetVoiceMode = () => {
    setVoiceMode(false);
    resetTranscript();
    setInputValue('');
    setLastVerificationResult(null);
  };

  const handleVoiceClick = () => {
    if (!isSupported) {
      toast.error('Voice recognition not supported in this browser');
      return;
    }

    if (isListening) {
      stopListening();
    } else {
      setVoiceMode(true);
      resetTranscript();
      startListening({
        onError: (err) => {
          toast.error(`Voice error: ${err}`);
          resetVoiceMode();
        },
      });
    }
  };

  const handleSendClick = () => {
    if (!inputValue.trim() || isTyping) return;

    // Send as text (not voice-authenticated)
    onSend(inputValue, false);
    setInputValue('');
  };

  const isLocked = failedAttempts >= maxFailedAttempts;

  return (
    <div className="border-t border-border bg-background-elevated p-4">
      <div className="max-w-3xl mx-auto">
        {/* Voice Status Badge */}
        {(voiceMode || lastVerificationResult) && (
          <div className="flex items-center justify-between mb-2">
            {voiceMode && (
              <Badge
                variant="outline"
                className={cn(
                  'text-xs',
                  isListening && 'border-primary text-primary animate-pulse'
                )}
              >
                <Mic className="h-3 w-3 mr-1" />
                {isListening ? 'Listening...' : 'Voice Mode'}
              </Badge>
            )}
            {lastVerificationResult && !voiceMode && (
              <Badge
                variant={lastVerificationResult.isMatch ? 'default' : 'outline'}
                className={cn(
                  'text-xs',
                  lastVerificationResult.isMatch
                    ? 'bg-green-500/20 text-green-400 border-green-500/50'
                    : 'bg-red-500/20 text-red-400 border-red-500/50'
                )}
              >
                {lastVerificationResult.isMatch ? 'Voice Verified' : 'Voice Failed'} (
                {(lastVerificationResult.similarity * 100).toFixed(0)}%)
              </Badge>
            )}
          </div>
        )}

        {/* Input Area */}
        <div className="flex items-end gap-2">
          {/* Voice Button */}
          {isSupported && (
            <Button
              onClick={handleVoiceClick}
              disabled={isLocked || isTyping}
              variant={isListening ? 'destructive' : 'outline'}
              className={cn(
                'h-11 w-11 rounded-lg',
                isListening && 'animate-pulse',
                !isListening && fingerprint && 'border-primary text-primary'
              )}
              title={
                isLocked
                  ? 'Voice auth locked - too many failures'
                  : fingerprint
                  ? 'Voice command (authenticated)'
                  : 'Voice input (no auth)'
              }
            >
              {isListening ? <Mic className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          )}

          {/* Text Input */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={
                voiceMode
                  ? 'Speak your command...'
                  : fingerprint
                  ? 'Type or speak a command...'
                  : 'Enter message (no voice auth)...'
              }
              className={cn(
                'w-full min-h-[44px] max-h-32 px-4 py-3 pr-12 rounded-lg resize-none',
                'bg-input border border-border text-foreground placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary',
                'font-mono text-sm',
                voiceMode && 'border-primary ring-2 ring-primary/20'
              )}
              rows={1}
              disabled={isListening}
            />
          </div>

          {/* Send Button */}
          <Button
            onClick={handleSendClick}
            disabled={!inputValue.trim() || isTyping || isListening}
            className="h-11 w-11 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground glow-cyan"
            title="Send as text (not voice-authenticated)"
          >
            {fingerprint ? <MessageCircle className="h-4 w-4" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>

        {/* Help Text */}
        {fingerprint && (
          <p className="text-xs text-muted-foreground mt-2 px-1">
            Click <Mic className="h-3 w-3 inline" /> for voice commands or type for regular chat
          </p>
        )}
      </div>
    </div>
  );
}
