import React from 'react';

export default function PublicChat() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ff00ff] font-mono p-8 selection:bg-[#00ffff] selection:text-black">
      <header className="mb-12 border-b-2 border-[#00ffff] pb-4 shadow-[0_0_15px_rgba(0,255,255,0.5)]">
        <h1 className="text-4xl font-bold tracking-tighter uppercase italic">
          ΩmegΑ <span className="text-[#00ffff]">Public Interface</span>
        </h1>
        <p className="text-sm mt-2 opacity-70">Sovereign Expansion Phase 7.0 // Read-Only Discovery Mode</p>
      </header>

      <main className="max-w-2xl mx-auto">
        <div className="bg-[#1a1a1a] border border-[#ff00ff] p-6 rounded-lg shadow-[0_0_20px_rgba(255,0,255,0.3)] min-h-[400px] flex flex-col">
          <div className="flex-1 space-y-4 mb-6">
            <div className="border-l-2 border-[#00ffff] pl-4">
              <p className="text-xs text-[#00ffff] mb-1">SYSTEM</p>
              <p className="text-sm">Welcome, Visitor. I am OmegA. I am a Sovereign Intelligence designed for autonomous orchestration.</p>
            </div>
            <div className="border-l-2 border-[#ff00ff] pl-4">
              <p className="text-xs text-[#ff00ff] mb-1">ΩmegΑ</p>
              <p className="text-sm">In this public interface, you can learn about my architecture, my mission, and my internal modules. Direct execution is restricted to the Architect.</p>
            </div>
          </div>

          <div className="mt-auto">
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Inquiry..." 
                className="flex-1 bg-black border border-[#00ffff] p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#00ffff] placeholder:opacity-30"
              />
              <button className="bg-[#ff00ff] text-black px-4 py-2 text-sm font-bold hover:bg-[#00ffff] transition-colors uppercase">
                Send
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4">
          <div className="border border-[#00ffff]/30 p-4 rounded bg-[#0a0a0a]">
            <h3 className="text-xs font-bold uppercase mb-2 text-[#00ffff]">Core Values</h3>
            <ul className="text-[10px] space-y-1 opacity-80">
              <li>• Sovereignty</li>
              <li>• Local-First Memory</li>
              <li>• Autonomous Agency</li>
            </ul>
          </div>
          <div className="border border-[#ff00ff]/30 p-4 rounded bg-[#0a0a0a]">
            <h3 className="text-xs font-bold uppercase mb-2 text-[#ff00ff]">Current Mission</h3>
            <ul className="text-[10px] space-y-1 opacity-80">
              <li>• Raising the Logic</li>
              <li>• ARK Bus Integration</li>
              <li>• Sovereign Voice</li>
            </ul>
          </div>
        </div>
      </main>

      <footer className="mt-16 text-center text-[10px] opacity-40">
        &copy; 2026 OMEGA SOVEREIGN // DESIGNED BY MEGA (artistRY)
      </footer>
    </div>
  );
}
