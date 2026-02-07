'use client';

import React from 'react';
import { useNeuroStore } from '../store/useNeuroStore';
import { useVoiceInput } from '../hooks/useVoiceInput';

export const VoiceInterface = () => {
    const { isListening } = useNeuroStore();
    const { isRecording, startRecording, stopRecording } = useVoiceInput();

    const toggleListening = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    return (
        <div className="fixed bottom-24 right-8 z-50">
            <button
                onClick={toggleListening}
                className={`p-4 rounded-full shadow-lg transition-all duration-300 ${isListening
                    ? 'bg-red-500 animate-pulse ring-4 ring-red-500/30'
                    : 'bg-indigo-600 hover:bg-indigo-500'
                    }`}
            >
                {isListening ? (
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                ) : (
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                )}
            </button>
            {isListening && (
                <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-black/80 text-white px-3 py-1 rounded text-sm">
                    Listening...
                </div>
            )}
        </div>
    );
};
