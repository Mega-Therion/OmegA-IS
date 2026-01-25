'use client'

import { useEffect, useState } from 'react'

interface Episode {
    id: string
    title: string
    date: string
    duration?: string
    summary?: string
}

export function Podcast() {
    const [episodes, setEpisodes] = useState<Episode[]>([])
    const [activeEpisode, setActiveEpisode] = useState<string | null>(null)
    const [isGenerating, setIsGenerating] = useState(false)

    const fetchEpisodes = async () => {
        try {
            const res = await fetch('/api/v1/brain/podcast/episodes')
            const data = await res.json()
            setEpisodes(data.episodes || [])
        } catch (e) {
            console.error('Failed to fetch episodes', e)
        }
    }

    useEffect(() => {
        fetchEpisodes()
    }, [])

    const handleGenerate = async () => {
        setIsGenerating(true)
        try {
            // 1. Generate Script
            await fetch('/api/v1/brain/podcast/generate/script', { method: 'POST' })
            // 2. Generate Audio
            await fetch('/api/v1/brain/podcast/generate/audio', { method: 'POST' })
            // Refresh after a delay (simulated)
            setTimeout(fetchEpisodes, 5000)
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl text-cyan-100 font-semibold italic tracking-wider">🎙️ Neural Briefings</h2>
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="rounded-full border border-purple-400/50 px-4 py-2 text-xs text-purple-300 hover:bg-purple-400/10 disabled:opacity-50"
                >
                    {isGenerating ? 'Synthesizing...' : 'Generate Daily Briefing'}
                </button>
            </div>

            <div className="grid gap-4 overflow-y-auto pr-2 custom-scrollbar">
                {episodes.length === 0 ? (
                    <div className="text-center py-10 text-cyan-400/40 border border-dashed border-cyan-400/20 rounded-3xl">
                        No briefings synchronized. Transmit a generate directive.
                    </div>
                ) : (
                    episodes.map(episode => (
                        <div
                            key={episode.id}
                            className={`p-5 rounded-3xl border transition-all ${activeEpisode === episode.id ? 'border-cyan-400 bg-cyan-400/10 shadow-glow' : 'border-cyan-400/20 bg-black/40'}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="text-cyan-100 font-medium">{episode.title || `Briefing ${episode.date}`}</h3>
                                    <p className="text-[10px] text-cyan-400/60 uppercase">{episode.date}</p>
                                </div>
                                {activeEpisode === episode.id ? (
                                    <button onClick={() => setActiveEpisode(null)} className="text-cyan-400 underline text-xs">Close</button>
                                ) : (
                                    <button
                                        onClick={() => setActiveEpisode(episode.id)}
                                        className="rounded-full bg-cyan-400 p-2 text-black hover:bg-cyan-300"
                                    >
                                        ▶️
                                    </button>
                                )}
                            </div>
                            {activeEpisode === episode.id && (
                                <div className="mt-4 space-y-4">
                                    <p className="text-xs text-cyan-100/70">{episode.summary}</p>
                                    <audio controls className="w-full h-8 custom-audio-player" src={`/api/v1/brain/podcast/audio/${episode.id}`} />
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
