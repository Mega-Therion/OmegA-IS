import { useState, useRef } from 'react';
import { useNeuroStore } from '../store/useNeuroStore';

export const useVoiceInput = () => {
    const { setIsListening, setInputText, submitMessage } = useNeuroStore();
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                await sendAudioToServer(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setIsListening(true);
        } catch (error) {
            console.error('Error accessing microphone:', error);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setIsListening(false);
        }
    };

    const sendAudioToServer = async (blob: Blob) => {
        try {
            // Convert to arrayBuffer for raw transmission
            const arrayBuffer = await blob.arrayBuffer();

            const response = await fetch('/api/v1/brain/api/voice/listen', {
                method: 'POST',
                headers: { 'Content-Type': 'application/octet-stream' },
                body: arrayBuffer
            });

            if (!response.ok) throw new Error('Transcription failed');

            const data = await response.json();
            if (data.transcript) {
                setInputText(data.transcript);
                // Optionally auto-submit
                // submitMessage(data.transcript);
            }
        } catch (error) {
            console.error('Transcription Error:', error);
        }
    };

    return {
        isRecording,
        startRecording,
        stopRecording
    };
};
