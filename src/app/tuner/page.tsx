'use client';

import { useEffect, useState } from 'react';
import { useTuner } from '@/hooks/useTuner';
import { CentsMeter } from '@/components/CentsMeter';

type AudioInput = { deviceId: string; label: string };

export default function TunerPage() {
  // Init tuner logic
  const { start, stop, status, note, cents, pitchHz, clarity, error, a4, setA4 } = useTuner();

  // UI state
  const [mics, setMics] = useState<AudioInput[]>([]);
  const [selectedMicId, setSelectedMicId] = useState<string>('default');
  const [showDiag, setShowDiag] = useState(false);  // Toggle for debug info

  // Persistence and setup
  useEffect(() => {
    // Load saved settings
    const id = requestAnimationFrame(() => {
      const savedMic = localStorage.getItem('micId');
      const savedA4 = localStorage.getItem('a4');

      if (savedMic) setSelectedMicId(savedMic);
      if (savedA4) setA4(parseFloat(savedA4));
    });

    // Fetch available mics
    const fetchMics = async () => {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const inputs = devices
          .filter(d => d.kind === 'audioinput')
          .map(d => ({
            deviceId: d.deviceId,
            label: d.label || (d.deviceId === 'default' ? 'Default Microphone' : `Microphone ${d.deviceId.slice(0, 4)}...`)
          }));
        setMics(inputs);
      }
      catch (e) { console.error(e); }
    };
    fetchMics();
    navigator.mediaDevices?.addEventListener('devicechange', fetchMics);
    return () => {
      cancelAnimationFrame(id);
      navigator.mediaDevices?.removeEventListener('devicechange', fetchMics);
    };
  }, [setA4]);

  // Save settings when changed
  useEffect(() => { localStorage.setItem('micId', selectedMicId); }, [selectedMicId]);
  useEffect(() => { localStorage.setItem('a4', String(a4)); }, [a4]);

  const handleStart = () => start(selectedMicId);

return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 flex flex-col items-center">
      <div className="w-full max-w-md space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black tracking-tighter bg-linear-to-br from-white to-zinc-500 bg-clip-text text-transparent">
            Web Tuner
          </h1>
          <p className="text-xs text-zinc-500 uppercase tracking-widest font-mono">
             Realtime DSP Tuner
          </p>
        </div>

        {/* --- Main Tuner Display --- */}
        <div className="relative flex flex-col items-center justify-center py-10 bg-zinc-900/50 border border-zinc-800 rounded-3xl shadow-2xl">
           
           {/* Note Name */}
           <div className={`text-9xl font-black tracking-tighter transition-colors duration-200 ${
             cents !== null && Math.abs(cents) < 5 ? 'text-green-500 drop-shadow-[0_0_30px_rgba(34,197,94,0.3)]' : 'text-zinc-200'
           }`}>
             {note || "--"}
           </div>

           {/* Cents Meter Component */}
           <div className="w-4/5">
             <CentsMeter cents={cents} />
           </div>

           {/* Error Message */}
           {error && <div className="absolute top-4 bg-red-500/10 text-red-500 text-xs px-3 py-1 rounded-full border border-red-500/20">{error}</div>}
        </div>


        {/* --- Controls Section --- */}
        <div className="space-y-4 bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
          
          {/* Start/Stop Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleStart}
              disabled={status === 'running'}
              className="flex-1 bg-zinc-100 text-zinc-950 font-bold py-3 rounded-lg hover:bg-white disabled:opacity-20 disabled:cursor-not-allowed transition-all"
            >
              Start
            </button>
            <button
              onClick={stop}
              disabled={status !== 'running'}
              className="px-6 border border-zinc-700 font-bold py-3 rounded-lg hover:bg-zinc-800 disabled:opacity-20 transition-all"
            >
              Stop
            </button>
          </div>

          {/* Mic Selector */}
          <div className="space-y-1">
             <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Input Source</label>
             <select 
               value={selectedMicId}
               onChange={(e) => { 
                 setSelectedMicId(e.target.value); 
                 if(status === 'running') stop(); // Force restart on change
               }}
               className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm focus:ring-2 focus:ring-zinc-700 outline-none"
             >
               <option value="default">Default Device</option>
               {mics.filter(m => m.deviceId !== 'default').map(m => (
                 <option key={m.deviceId} value={m.deviceId}>{m.label}</option>
               ))}
             </select>
          </div>

          {/* A4 Calibration */}
          <div className="space-y-2 pt-2 border-t border-zinc-800">
             <div className="flex justify-between items-center text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
               <span>Reference Pitch</span>
               <span className="text-zinc-300 font-mono">{a4} Hz</span>
             </div>
             <input 
               type="range" min="432" max="446" step="1"
               value={a4}
               onChange={(e) => setA4(Number(e.target.value))}
               className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-zinc-100 [&::-webkit-slider-thumb]:rounded-full"
             />
          </div>
        </div>

        {/* --- Diagnostics Toggle --- */}
        <div className="text-center">
          <button 
            onClick={() => setShowDiag(!showDiag)}
            className="text-[10px] text-zinc-600 underline decoration-zinc-800 hover:text-zinc-400"
          >
            {showDiag ? 'Hide Diagnostics' : 'Show Internals'}
          </button>
        </div>

        {/* Hidden Diagnostics Panel */}
        {showDiag && (
           <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-zinc-500 border-t border-zinc-900 pt-4">
              <div>Pitch: {pitchHz?.toFixed(2) || '--'} Hz</div>
              <div>Clarity: {clarity?.toFixed(2) || '--'}</div>
              <div>Status: {status}</div>
              <div>Secure: {String(typeof window !== 'undefined' && window.isSecureContext)}</div>
           </div>
        )}

      </div>
    </main>
  );
}