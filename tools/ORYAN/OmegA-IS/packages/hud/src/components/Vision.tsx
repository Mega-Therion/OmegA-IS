'use client'

import { useEffect, useState } from 'react'

export function Vision() {
    const [captures, setCaptures] = useState<string[]>([])
    const [isCapturing, setIsCapturing] = useState(false)

    const fetchCaptures = async () => {
        try {
            const res = await fetch('/api/v1/brain/eyes')
            const data = await res.json()
            setCaptures(data.captures || [])
        } catch (e) {
            console.error('Failed to fetch captures', e)
        }
    }

    useEffect(() => {
        fetchCaptures()
    }, [])

    const handleCapture = async () => {
        setIsCapturing(true)
        try {
            await fetch('/api/v1/brain/eyes/capture', { method: 'POST' })
            setTimeout(fetchCaptures, 2000)
        } finally {
            setIsCapturing(false)
        }
    }

    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl text-cyan-100 font-semibold italic tracking-wider">👁️ Neural Vision</h2>
                <button
                    onClick={handleCapture}
                    disabled={isCapturing}
                    className="rounded-full border border-cyan-400/50 px-4 py-2 text-xs text-cyan-300 hover:bg-cyan-400/10 disabled:opacity-50 shadow-glow-small"
                >
                    {isCapturing ? 'Capturing...' : 'Trigger Capture'}
                </button>
            </div>

            {captures.length === 0 ? (
                <div className="flex-1 flex items-center justify-center border border-dashed border-cyan-400/20 rounded-3xl text-cyan-400/30">
                    No visual records found in the buffer.
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto pr-2 custom-scrollbar">
                    {captures.map((file, i) => (
                        <div key={i} className="group relative rounded-2xl overflow-hidden border border-cyan-400/20 bg-black shadow-lg aspect-video">
                            <img
                                src={`/api/brain/captures/${file}`}
                                alt={`Capture ${file}`}
                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                            />
                            <div className="absolute bottom-0 inset-x-0 bg-black/60 p-2 text-[10px] text-cyan-100/60 font-mono">
                                {file}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
