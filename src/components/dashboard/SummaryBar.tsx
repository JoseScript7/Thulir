import { useEffect, useState } from 'react';
import { getSummary } from '../../api/client';
import type { Summary } from '../../api/types';

const CARD_BASE = 'bg-black border border-white/10 p-4 font-manrope';

export default function SummaryBar() {
  const [data, setData] = useState<Summary | null>(null);

  useEffect(() => {
    getSummary()
      .then(setData)
      .catch((err) => console.error('SummaryBar fetch error:', err));
  }, []);

  if (!data) {
    return (
      <div className="flex gap-3 flex-wrap">
        {[...Array(4)].map((_, i) => (
          <div key={i} className={`${CARD_BASE} min-w-[140px] flex-1 animate-pulse`}>
            <div className="h-3 bg-white/5 rounded w-20 mb-3" />
            <div className="h-8 bg-white/5 rounded w-12" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Top row — 4 stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Structures monitored */}
        <div className={CARD_BASE}>
          <div className="text-white/50 text-[10px] uppercase tracking-wider mb-2">
            Structures Monitored
          </div>
          <div className="text-[#AFDDFF] text-[28px] font-graphik leading-none">
            {data.total_structures}
          </div>
        </div>

        {/* Functional */}
        <div className={CARD_BASE}>
          <div className="text-white/50 text-[10px] uppercase tracking-wider mb-2">
            🟢 Functional
          </div>
          <div className="text-[#4ADE80] text-[28px] font-graphik leading-none">
            {data.count_green}
          </div>
        </div>

        {/* Degraded */}
        <div className={CARD_BASE}>
          <div className="text-white/50 text-[10px] uppercase tracking-wider mb-2">
            🟡 Degraded
          </div>
          <div className="text-[#FBBF24] text-[28px] font-graphik leading-none">
            {data.count_amber}
          </div>
        </div>

        {/* Critical */}
        <div className={CARD_BASE}>
          <div className="text-white/50 text-[10px] uppercase tracking-wider mb-2">
            🔴 Critical
          </div>
          <div className="text-[#F87171] text-[28px] font-graphik leading-none">
            {data.count_red}
          </div>
        </div>
      </div>

      {/* Hero number card */}
      <div className={`${CARD_BASE} border-[#AFDDFF]/20`}>
        <div className="text-white/50 text-[10px] uppercase tracking-wider mb-2">
          Est. Groundwater Recharge Lost This Monsoon
        </div>
        <div className="text-[#AFDDFF] text-[36px] font-graphik leading-none">
          {data.total_lost_recharge_m3.toLocaleString()} m³
        </div>
        <div className="text-white/40 text-[12px] font-manrope mt-2">
          ≈ {data.total_lost_irrigation_acres.toLocaleString()} acres of irrigation deferred · ≈ ₹{data.total_lost_value_inr.toLocaleString()} in recharge value
        </div>
      </div>
    </div>
  );
}
