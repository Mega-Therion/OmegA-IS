// OMEGAI Voice Capture Hook - Web Speech API wrapper
import { useState, useEffect, useCallback, useRef } from 'react';

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export interface VoiceCaptureOptions {
  continuous?: boolean;
  interimResults?: boolean;
  lang?: string;
}

export interface VoiceCaptureResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export function useVoiceCapture(options: VoiceCaptureOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const callbacksRef = useRef<{
    onResult?: (result: VoiceCaptureResult) => void;
    onError?: (error: string) => void;
    onEnd?: () => void;
  }>({});

  // Check browser support
  useEffect(() => {
    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognitionAPI) {
      setIsSupported(true);

      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = options.continuous ?? false;
      recognition.interimResults = options.interimResults ?? true;
      recognition.lang = options.lang ?? 'en-US';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimText = '';
        let finalText = '';
        let highestConfidence = 0;

        for (let i = event.results.length - 1; i >= 0; i--) {
          const result = event.results[i];
          const text = result[0].transcript;

          if (result.isFinal) {
            finalText = text;
            highestConfidence = result[0].confidence;
            setTranscript(finalText);
            setConfidence(highestConfidence);

            // Call user callback
            if (callbacksRef.current.onResult) {
              callbacksRef.current.onResult({
                transcript: finalText,
                confidence: highestConfidence,
                isFinal: true,
              });
            }
          } else {
            interimText = text;
            setInterimTranscript(interimText);

            // Call user callback for interim results too
            if (callbacksRef.current.onResult) {
              callbacksRef.current.onResult({
                transcript: interimText,
                confidence: result[0].confidence,
                isFinal: false,
              });
            }
          }
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        const errorMsg = `Speech recognition error: ${event.error}`;
        setError(errorMsg);
        setIsListening(false);

        if (callbacksRef.current.onError) {
          callbacksRef.current.onError(errorMsg);
        }
      };

      recognition.onend = () => {
        setIsListening(false);

        if (callbacksRef.current.onEnd) {
          callbacksRef.current.onEnd();
        }
      };

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognitionRef.current = recognition;
    } else {
      setIsSupported(false);
      setError('Speech recognition not supported in this browser');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [options.continuous, options.interimResults, options.lang]);

  const startListening = useCallback((callbacks?: {
    onResult?: (result: VoiceCaptureResult) => void;
    onError?: (error: string) => void;
    onEnd?: () => void;
  }) => {
    if (!isSupported) {
      const err = 'Speech recognition not supported';
      setError(err);
      callbacks?.onError?.(err);
      return;
    }

    if (isListening) {
      return; // Already listening
    }

    // Update callbacks
    callbacksRef.current = callbacks || {};

    setTranscript('');
    setInterimTranscript('');
    setError(null);

    try {
      recognitionRef.current?.start();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to start recognition';
      setError(errorMsg);
      callbacks?.onError?.(errorMsg);
    }
  }, [isSupported, isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setConfidence(0);
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    confidence,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}
