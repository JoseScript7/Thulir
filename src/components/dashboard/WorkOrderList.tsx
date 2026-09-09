import { useEffect, useState, useMemo } from 'react';
import { getWorkOrders } from '../../api/client';
import type { WorkOrder } from '../../api/types';
import ScoreBreakdown from './ScoreBreakdown';
import OfflineDispatchModal from './OfflineDispatchModal';

const STATUS_BORDER: Record<string, string> = {
  red: 'border-l-[#F87171]',
  amber: 'border-l-[#FBBF24]',
};

const STATUS_CHIP_BG: Record<string, string> = {
  red: 'bg-[#F87171]',
  amber: 'bg-[#FBBF24]',
};

interface Props {
  onSelect?: (id: string) => void;
  selectedId?: string | null;
  viewMode?: 'simple' | 'detailed';
}

export default function WorkOrderList({ onSelect, selectedId, viewMode = 'simple' }: Props) {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortMode, setSortMode] = useState<'urgency' | 'roi'>('urgency');
  const [dispatchTarget, setDispatchTarget] = useState<{
    structure: { structure_id: string; name: string; type?: string };
    computed: WorkOrder;
  } | null>(null);

  useEffect(() => {
    getWorkOrders()
      .then(setOrders)
      .catch((err) => console.error('WorkOrderList fetch error:', err))
      .finally(() => setLoading(false));
  }, []);

  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      if (viewMode === 'detailed' && sortMode === 'roi') {
        return (b.recharge_per_rupee ?? 0) - (a.recharge_per_rupee ?? 0);
      }
      return (a.infiltration_efficiency_index ?? 0) - (b.infiltration_efficiency_index ?? 0);
    });
  }, [orders, sortMode, viewMode]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-black border border-white/10 px-4 py-3 animate-pulse">
            <div className="h-3 bg-white/5 rounded w-3/4 mb-2" />
            <div className="h-3 bg-white/5 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="bg-black border border-white/10 px-4 py-6 text-center">
        <p className="font-manrope text-[#AFDDFF] text-[13px] leading-[18px]">
          All monitored structures functional — no action needed
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header — Simple vs Detailed toggle */}
      {viewMode === 'detailed' ? (
        <div className="flex items-center justify-between font-manrope text-[10px]">
          <span className="text-white/40 uppercase tracking-wider">
            Maintenance Queue
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSortMode('urgency')}
              className={`transition-colors cursor-pointer ${
                sortMode === 'urgency' ? 'text-[#AFDDFF] font-semibold' : 'text-white/40 hover:text-white/70'
              }`}
            >
              SORT: URGENCY
            </button>
            <span className="text-white/20">|</span>
            <button
              type="button"
              onClick={() => setSortMode('roi')}
              className={`transition-colors cursor-pointer ${
                sortMode === 'roi' ? 'text-[#AFDDFF] font-semibold' : 'text-white/40 hover:text-white/70'
              }`}
            >
              SORT: BUDGET ROI
            </button>
          </div>
        </div>
      ) : (
        <div className="font-manrope text-white/40 text-[10px] uppercase tracking-wider mb-2">
          Maintenance Queue
        </div>
      )}

      {sortedOrders.map((wo) => {
        const isSelected = selectedId === wo.structure_id;
        const borderColor = STATUS_BORDER[wo.status] || 'border-l-[#666]';
        const chipBg = STATUS_CHIP_BG[wo.status] || 'bg-[#666]';

        return (
          <button
            key={wo.structure_id}
            onClick={() => onSelect?.(wo.structure_id)}
            className={`
              w-full text-left bg-black border-l-4 ${borderColor}
              px-4 py-3 transition-colors cursor-pointer
              hover:bg-white/[0.03]
              ${isSelected ? 'bg-white/[0.05] ring-1 ring-white/10' : ''}
            `}
          >
            {viewMode === 'simple' ? (
              /* Simple Mode: Clean Status Chip + Ticket Text + Offline SMS trigger */
              <>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`${chipBg} rounded-[3px] px-[5px] py-[1px] font-manrope text-black text-[10px] leading-[14px] uppercase font-semibold`}
                  >
                    STATUS: {wo.status.toUpperCase()}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDispatchTarget({
                        structure: {
                          structure_id: wo.structure_id,
                          name: wo.structure_name,
                          type: wo.structure_type || undefined,
                        },
                        computed: wo,
                      });
                    }}
                    className="text-[10px] text-amber-300 hover:text-white flex items-center gap-1 font-semibold transition-colors cursor-pointer bg-amber-400/10 hover:bg-amber-400/20 px-2 py-0.5 rounded border border-amber-400/30"
                  >
                    <span>⚡</span> Dispatch Alert
                  </button>
                </div>
                <p className="font-manrope text-white/80 text-[12px] leading-[16px]">
                  {wo.ticket}
                </p>
              </>
            ) : (
              /* Detailed Mode: Data Quality Chip + IEI Badge + Breakdown + Metric Subtitle + SMS button */
              <>
                <div className="flex items-center gap-2 mb-2 flex-wrap justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    {wo.data_quality && wo.data_quality !== 'good' && (
                      <span className="bg-white/10 text-white/60 border border-white/20 rounded-[3px] px-[5px] py-[1px] font-manrope text-[10px] leading-[14px]">
                        ⚠️ {wo.data_quality === 'stale' ? 'stale data' : 'sensor offline'}
                      </span>
                    )}
                    <span
                      className={`${chipBg} rounded-[3px] px-[5px] py-[1px] font-manrope text-black text-[10px] leading-[14px] uppercase font-semibold`}
                    >
                      STATUS: {wo.status.toUpperCase()}
                    </span>
                    <span className="bg-white/10 rounded-[3px] px-[5px] py-[1px] font-manrope text-[#AFDDFF] text-[10px] leading-[14px]">
                      IEI {wo.infiltration_efficiency_index.toFixed(2)}
                    </span>
                    <ScoreBreakdown computed={wo} />
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDispatchTarget({
                        structure: {
                          structure_id: wo.structure_id,
                          name: wo.structure_name,
                          type: wo.structure_type || undefined,
                        },
                        computed: wo,
                      });
                    }}
                    className="text-[10px] text-amber-300 hover:text-white flex items-center gap-1 font-medium transition-colors cursor-pointer bg-amber-400/10 hover:bg-amber-400/20 px-2 py-0.5 rounded border border-amber-400/30"
                  >
                    <span>⚡</span> Dispatch
                  </button>
                </div>
                <p className="font-manrope text-white/80 text-[12px] leading-[16px]">
                  {wo.ticket}
                </p>
                {sortMode === 'roi' ? (
                  <p className="font-manrope text-[#AFDDFF] text-[10px] leading-[14px] mt-1 font-medium">
                    ₹{wo.recharge_per_rupee}/₹ spent
                  </p>
                ) : (
                  wo.status === 'amber' && wo.predicted_days_to_red != null && (
                    <p className="font-manrope text-white/40 text-[10px] leading-[14px] mt-1">
                      ⏳ Predicted to hit RED in ~{wo.predicted_days_to_red} days at current rate
                    </p>
                  )
                )}
              </>
            )}
          </button>
        );
      })}

      {/* Offline SMS Dispatch Modal */}
      {dispatchTarget && (
        <OfflineDispatchModal
          structure={dispatchTarget.structure}
          computed={dispatchTarget.computed}
          onClose={() => setDispatchTarget(null)}
        />
      )}
    </div>
  );
}
