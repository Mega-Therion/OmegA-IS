'use client'

import { useState } from 'react'

export function Terminal() {
    const [command, setCommand] = useState('')
    const [history, setHistory] = useState<{ cmd: string; out: string; err: string }[]>([])
    const [isLoading, setIsLoading] = useState(false)

    const handleExec = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!command.trim() || isLoading) return

        setIsLoading(true)
        try {
            const response = await fetch('/api/v1/terminal/exec', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command })
            })
            const data = await response.json()
            setHistory(prev => [...prev, { cmd: command, out: data.stdout, err: data.stderr || data.error }])
            setCommand('')
        } catch (error) {
            setHistory(prev => [...prev, { cmd: command, out: '', err: 'Failed to connect to Neural Terminal.' }])
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex flex-col h-full bg-black/80 rounded-3xl border border-cyan-400/20 p-6 font-mono text-sm">
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {history.length === 0 && (
                    <div className="text-cyan-400/40 italic"># Neural Terminal Initialized. Ready for directives...</div>
                )}
                {history.map((entry, i) => (
                    <div key={i} className="space-y-1">
                        <div className="flex gap-2 text-purple-400">
                            <span className="opacity-50">➜</span>
                            <span>{entry.cmd}</span>
                        </div>
                        {entry.out && <pre className="text-cyan-100/80 whitespace-pre-wrap pl-6">{entry.out}</pre>}
                        {entry.err && <pre className="text-red-400/80 whitespace-pre-wrap pl-6">{entry.err}</pre>}
                    </div>
                ))}
                {isLoading && <div className="animate-pulse text-cyan-400">Processing...</div>}
            </div>

            <form onSubmit={handleExec} className="mt-4 flex gap-2">
                <span className="text-purple-400">➜</span>
                <input
                    autoFocus
                    value={command}
                    onChange={e => setCommand(e.target.value)}
                    placeholder="Enter shell command..."
                    className="flex-1 bg-transparent outline-none text-cyan-100 placeholder:text-cyan-400/20"
                />
            </form>
        </div>
    )
}
