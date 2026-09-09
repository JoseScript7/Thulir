import { useEffect, useState } from 'react';
import { getDesiltingEvents } from '../../api/client';
import type { DesiltingEvent } from '../../api/types';

interface Props {
  structureId: string | null;
}

export default function DesiltingImpact({ structureId }: Props) {
  const [events, setEvents] = useState<DesiltingEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!structureId) {
      setEvents([]);
      return;
    }

    setLoading(true);
    getDesiltingEvents(structureId)
      .then((data) => setEvents(data || []))
      .catch((err) => {
        console.error('DesiltingImpact fetch error:', err);
        setEvents([]);
      })
      .finally(() => setLoading(false));
  }, [structureId]);

  if (loading || events.length === 0) {
    // Render nothing if no desilting event is in this structure's history yet
    return null;
  }

  const latest = events[events.length - 1];
  const before = latest.iei_before;
  const after = latest.iei_7d_after;

  // Calculate percentage improvement
  const rawDelta = before > 0 ? ((after - before) / before) * 100 : after * 100;
  const delta = Math.round(rawDelta);

  const beforePct = Math.min(100, Math.max(0, Math.round(before * 100)));
  const afterPct = Math.min(100, Math.max(0, Math.round(after * 100)));

  return (
    <div className="bg-black border border-white/10 p-4 font-manrope space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-white/50 text-[10px] uppercase tracking-wider">
          Desilting Impact Analysis
        </div>
        <span className="text-[#AFDDFF] text-[10px] bg-[#AFDDFF]/10 border border-[#AFDDFF]/30 px-2 py-0.5 rounded">
          FIELD VERIFIED INTERVENTION
        </span>
      </div>

      {/* Bars comparison */}
      <div className="space-y-2 pt-1">
        {/* Before Desilting */}
        <div>
          <div className="flex justify-between text-[11px] text-white/60 mb-1">
            <span>IEI before desilting</span>
            <span className="font-semibold text-white/70">{before.toFixed(2)}</span>
          </div>
          <div className="w-full bg-white/5 h-3 rounded-sm overflow-hidden">
            <div
              className="bg-white/30 h-full transition-all duration-500"
              style={{ width: `${beforePct}%` }}
            />
          </div>
        </div>

        {/* After Desilting */}
        <div>
          <div className="flex justify-between text-[11px] text-[#AFDDFF] mb-1">
            <span>IEI after desilting</span>
            <span className="font-semibold text-[#AFDDFF]">{after.toFixed(2)}</span>
          </div>
          <div className="w-full bg-white/5 h-3 rounded-sm overflow-hidden">
            <div
              className="bg-[#AFDDFF] h-full transition-all duration-500"
              style={{ width: `${afterPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Key Takeaway */}
      <p className="text-white/80 text-[12px] leading-[16px] pt-1 border-t border-white/10">
        Desilting restored infiltration efficiency by{' '}
        <span className="text-[#AFDDFF] font-semibold">+{delta}%</span> — proving proactive maintenance works.
      </p>
    </div>
  );
}
