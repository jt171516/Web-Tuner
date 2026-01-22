import React from 'react';

export function CentsMeter({ cents }: { cents: number | null }) {
  // Clamp the cents value to the range [-50, 50] for display purposes
  const clamped = cents == null ? 0 : Math.max(-50, Math.min(50, cents));

  // Convert clamped cents to a percentage for the meter fill
  const leftPct = ((clamped + 50) / 100) * 100;

  // Determine the color based on how close to zero the cents value is
  const isInTune = Math.abs(clamped) < 5;
  const needleColor = cents === null ? 'bg-zinc-600' : isInTune ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-red-500';

  return (
    <div className="w-full max-w-md mt-6">
      {/* Scale Labels */}
      <div className="flex justify-between text-[10px] text-zinc-500 font-mono mb-1 px-1">
        <span>-50</span>
        <span className="text-zinc-700">0</span>
        <span>+50</span>
      </div>

      {/* The Bar */}
      <div className="relative h-4 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden shadow-inner">
        {/* Center Line (Perfect Tune) */}
        <div className="absolute left-1/2 top-0 h-full w-0.5 bg-zinc-600/50 -translate-x-1/2" />

        {/* The Needle */}
        <div
          className={`absolute top-0 h-full w-1.5 rounded-full transition-all duration-100 ease-out -translate-x-1/2 ${needleColor}`}
          style={{ left: `${leftPct}%` }}
        />
      </div>
      
      {/* Numeric Readout below */}
      <div className="text-center mt-2 font-mono text-xs text-zinc-500">
         {cents != null ? (cents > 0 ? `+${cents.toFixed(0)}` : cents.toFixed(0)) : '--'} cents
      </div>
    </div>
  );
}