import { useState, useEffect, useRef } from 'react'
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react'

// This component can be used standalone or integrated into App.jsx
function VoiceInterface({ onCommand, onTranscript }) {
  const [isListening, setIsListening] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognition = useRef(null)
  const synthesis = window.speechSynthesis

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition not supported')
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    recognition.current = new SpeechRecognition()
    recognition.current.continuous = true
    recognition.current.interimResults = true

    recognition.current.onstart = () => {
      setIsListening(true)
    }

    recognition.current.onresult = (event) => {
      const current = event.resultIndex
      const transcriptText = event.results[current][0].transcript
      setTranscript(transcriptText)

      if (onTranscript) {
        onTranscript(transcriptText)
      }

      if (event.results[current].isFinal && onCommand) {
        onCommand(transcriptText)
        setTranscript('')
      }
    }

    recognition.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
    }

    recognition.current.onend = () => {
      setIsListening(false)
    }

    recognition.current.start()
  }

  const stopListening = () => {
    if (recognition.current) {
      recognition.current.stop()
      setIsListening(false)
    }
  }

  const speak = (text) => {
    if (isMuted) return

    const utterance = new SpeechSynthesisUtterance(text)
    synthesis.speak(utterance)
  }

  return (
    <div className="flex items-center space-x-4">
      <button
        onClick={isListening ? stopListening : startListening}
        className={`p-4 rounded-full transition-all ${
          isListening
            ? 'bg-red-500 hover:bg-red-600 animate-pulse'
            : 'bg-omega-accent hover:bg-omega-accent/80'
        }`}
      >
        {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
      </button>

      <button
        onClick={() => setIsMuted(!isMuted)}
        className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition-all"
      >
        {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
      </button>

      {transcript && (
        <div className="flex-1 bg-gray-800 border border-gray-700 rounded-lg p-3">
          <p className="text-sm text-gray-300">{transcript}</p>
        </div>
      )}
    </div>
  )
}

export default VoiceInterface
