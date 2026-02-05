'use client';

import React, { useEffect, useState } from 'react';
import { useNeuroStore } from '../store/useNeuroStore';

export const VoiceOutput = () => {
    const { messages } = useNeuroStore();
    const [lastSpokenIndex, setLastSpokenIndex] = useState(0);

    useEffect(() => {
        // Only speak if there are new messages and the last one is from 'assistant'
        if (messages.length > lastSpokenIndex) {
            const latestMessage = messages[messages.length - 1];

            if (latestMessage.role === 'assistant') {
                speak(latestMessage.content);
            }

            setLastSpokenIndex(messages.length);
        }
    }, [messages, lastSpokenIndex]);

    const speak = async (text: string) => {
        try {
            // Stop any existing audio
            const existingAudio = document.getElementById('omega-voice-audio') as HTMLAudioElement;
            if (existingAudio) {
                existingAudio.pause();
                existingAudio.remove();
            }

            const response = await fetch('/api/v1/brain/api/voice/synthesize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });

            if (!response.ok) throw new Error('Voice synthesis failed');

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audio.id = 'omega-voice-audio';
            audio.play();
        } catch (error) {
            console.error('Sovereign Voice Error:', error);
            // Fallback to browser TTS if server fails
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(text);
                window.speechSynthesis.speak(utterance);
            }
        }
    };

    return null; // Invisible component
};
