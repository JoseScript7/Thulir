import { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';
import type { Computed } from '../../api/types';

interface Props {
  computed: Computed;
  benchmarkMmDay?: number;
}

export default function ScoreBreakdown({ computed, benchmarkMmDay }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const ppsPct = Math.round((computed.pps ?? 0) * 100);

  return (
    <div className="relative inline-flex items-center" ref={ref}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="text-[#AFDDFF]/60 hover:text-[#AFDDFF] transition-colors p-0.5 inline-flex items-center justify-center cursor-pointer"
        aria-label="Score breakdown"
      >
        <Info className="w-[13px] h-[13px]" />
      </button>

      {open && (
        <div
          className="absolute z-[9999] bottom-full mb-2 left-0 bg-black border border-[#AFDDFF]/40 p-3 text-[12px] font-manrope min-w-[280px] shadow-2xl rounded-sm text-left"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-[#AFDDFF] font-semibold mb-2 text-[11px] tracking-wide">
            IEI = 0.45×PPS + 0.40×CRS + 0.15×Integrity
          </div>

          <div className="space-y-1.5 text-white/80">
            <div>
              <span className="text-[#AFDDFF] font-medium">PPS = {computed.pps?.toFixed(3) ?? '—'}</span>
              <span className="text-white/60 ml-1">
                — percolation is at {ppsPct}% of the {benchmarkMmDay ? `${benchmarkMmDay} mm/day ` : ''}benchmark for this structure type
              </span>
            </div>

            <div>
              <span className="text-[#AFDDFF] font-medium">CRS = {computed.crs?.toFixed(3) ?? '—'}</span>
              <span className="text-white/60 ml-1">
                — {computed.capacity_loss_pct}% capacity lost to siltation
              </span>
            </div>

            <div>
              <span className="text-[#AFDDFF] font-medium">
                Integrity = {computed.integrity?.toFixed(1) ?? '—'}
              </span>
              <span className="text-white/60 ml-1">
                — {computed.integrity < 1 ? '⚠️ breach pattern detected' : 'normal recession pattern'}
              </span>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-white/10 flex justify-between text-white/50 text-[10px]">
            <span>Composite Score</span>
            <span className="text-[#AFDDFF] font-bold">
              {computed.infiltration_efficiency_index.toFixed(3)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
