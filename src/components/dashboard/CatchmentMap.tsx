import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { StructureWithComputed } from '../../api/types';
import { getStructures } from '../../api/client';
import ScoreBreakdown from './ScoreBreakdown';
import OfflineDispatchModal from './OfflineDispatchModal';

const STATUS_COLORS: Record<string, string> = {
  green: '#4ADE80',
  amber: '#FBBF24',
  red: '#F87171',
};
const FALLBACK_COLOR = '#666';

function statusColor(status?: string | null): string {
  return (status && STATUS_COLORS[status]) || FALLBACK_COLOR;
}

// Auto-fit the map to the markers once loaded
function FitBounds({ structures }: { structures: StructureWithComputed[] }) {
  const map = useMap();

  useEffect(() => {
    if (structures.length === 0) return;
    const bounds = structures.map((s) => [s.lat, s.lng] as [number, number]);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
  }, [structures, map]);

  return null;
}

// Invalidate Leaflet map size on mount, resize, and viewMode change to prevent blank areas
function ResizeMap({ viewMode }: { viewMode?: string }) {
  const map = useMap();

  useEffect(() => {
    const handleResize = () => map.invalidateSize();
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [map, viewMode]);

  return null;
}

interface Props {
  onSelect?: (id: string) => void;
  viewMode?: 'simple' | 'detailed';
}

export default function CatchmentMap({ onSelect, viewMode = 'simple' }: Props) {
  const [structures, setStructures] = useState<StructureWithComputed[]>([]);
  const [loading, setLoading] = useState(true);
  const [dispatchTarget, setDispatchTarget] = useState<StructureWithComputed | null>(null);

  useEffect(() => {
    getStructures()
      .then(setStructures)
      .catch((err) => console.error('CatchmentMap fetch error:', err))
      .finally(() => setLoading(false));
  }, []);

  const center = useMemo<[number, number]>(() => {
    if (structures.length === 0) return [12.25, 79.07];
    const avgLat = structures.reduce((s, st) => s + st.lat, 0) / structures.length;
    const avgLng = structures.reduce((s, st) => s + st.lng, 0) / structures.length;
    return [avgLat, avgLng];
  }, [structures]);

  if (loading) {
    return (
      <div className="w-full h-full min-h-[440px] flex-1 flex items-center justify-center bg-black border border-white/10">
        <span className="font-manrope text-white/40 text-[13px] animate-pulse">
          Loading map…
        </span>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[440px] flex-1 flex flex-col border border-white/10 overflow-hidden relative">
      <MapContainer
        center={center}
        zoom={11}
        className="w-full h-full flex-1"
        style={{ height: '100%', minHeight: '440px', width: '100%', flex: 1 }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>, HERE, Garmin, NGA, USGS'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          maxZoom={16}
        />
        <FitBounds structures={structures} />
        <ResizeMap viewMode={viewMode} />

        {structures.map((s) => {
          const dq = s.computed?.data_quality;
          const isDegraded = viewMode === 'detailed' && (dq === 'stale' || dq === 'offline');

          return (
            <div key={s.structure_id}>
              {/* Outer dashed ring for stale or offline sensor data (detailed view only) */}
              {isDegraded && (
                <CircleMarker
                  center={[s.lat, s.lng]}
                  radius={14}
                  pathOptions={{
                    color: statusColor(s.computed?.status),
                    dashArray: '3, 4',
                    weight: 1.5,
                    fill: false,
                    opacity: 0.6,
                  }}
                  interactive={false}
                />
              )}

              {/* Main circle marker */}
              <CircleMarker
                center={[s.lat, s.lng]}
                radius={10}
                pathOptions={{
                  fillOpacity: isDegraded ? 0.4 : 0.85,
                  opacity: isDegraded ? 0.4 : 1.0,
                  color: statusColor(s.computed?.status),
                  fillColor: statusColor(s.computed?.status),
                }}
                eventHandlers={{
                  click: () => onSelect?.(s.structure_id),
                }}
              >
                <Popup>
                  <div
                    style={{
                      background: '#000',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                      fontFamily: "'Manrope', sans-serif",
                      fontSize: '12px',
                      padding: '8px',
                      minWidth: viewMode === 'simple' ? '170px' : '190px',
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: 2, color: '#AFDDFF', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span>{s.name}</span>
                      {viewMode === 'detailed' && dq === 'stale' && (
                        <span style={{ fontSize: '10px', color: '#FBBF24', fontWeight: 500 }}>(stale data)</span>
                      )}
                      {viewMode === 'detailed' && dq === 'offline' && (
                        <span style={{ fontSize: '10px', color: '#F87171', fontWeight: 500 }}>(sensor offline)</span>
                      )}
                    </div>
                    <div style={{ opacity: 0.6, marginBottom: 6, textTransform: 'uppercase', fontSize: '10px' }}>
                      {s.type.replace(/_/g, ' ')}
                    </div>

                    {s.computed ? (
                      viewMode === 'simple' ? (
                        /* Simple Mode: Just Status word & 1 plain-language line + SMS trigger */
                        <div className="space-y-1.5">
                          <div className="font-semibold" style={{ color: statusColor(s.computed.status) }}>
                            {s.computed.status === 'green' && '🟢 Functional'}
                            {s.computed.status === 'amber' && '🟡 Degraded — Maintenance Needed'}
                            {s.computed.status === 'red' && '🔴 Critical — Immediate Action Required'}
                          </div>
                          <p className="text-white/80 text-[11px] leading-[14px]">
                            {s.computed.status === 'green' && 'Infiltration performing normally — capturing rainwater.'}
                            {s.computed.status === 'amber' && 'Silt accumulation reducing capacity — desilting recommended before monsoon.'}
                            {s.computed.status === 'red' && 'Severe siltation or breach — urgent desilting needed immediately.'}
                          </p>
                          <button
                            type="button"
                            onClick={() => setDispatchTarget(s)}
                            className="w-full mt-2 bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[11px] py-1 px-2 rounded font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1"
                          >
                            <span>⚡</span> Dispatch Emergency Alert
                          </button>
                        </div>
                      ) : (
                        /* Detailed Mode: Full IEI metrics & sub-scores + SMS trigger */
                        <div className="space-y-1">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>IEI: <strong>{s.computed.infiltration_efficiency_index.toFixed(2)}</strong></span>
                            <ScoreBreakdown computed={s.computed} benchmarkMmDay={s.benchmark_percolation_mm_day} />
                          </div>
                          <div>Percolation: {s.computed.observed_percolation_mm_day} mm/day</div>
                          <div>Silt: {s.computed.silt_depth_cm} cm</div>
                          <div>Capacity loss: {s.computed.capacity_loss_pct}%</div>
                          <div>Lost recharge: {s.computed.lost_recharge_m3_est_per_monsoon.toLocaleString()} m³</div>
                          {s.computed.low_battery && (
                            <div style={{ fontSize: '10px', color: '#F87171', marginTop: '4px', fontWeight: 500 }}>
                              🔋 Low battery (&lt;3.4V)
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => setDispatchTarget(s)}
                            className="w-full mt-2 bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] py-1 px-2 rounded font-medium transition-colors cursor-pointer flex items-center justify-center gap-1"
                          >
                            <span>⚡</span> Dispatch Emergency Alert
                          </button>
                        </div>
                      )
                    ) : (
                      <div style={{ opacity: 0.4 }}>Computing…</div>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            </div>
          );
        })}
      </MapContainer>

      {/* Offline SMS Dispatch Modal */}
      {dispatchTarget && (
        <OfflineDispatchModal
          structure={dispatchTarget}
          computed={dispatchTarget.computed}
          onClose={() => setDispatchTarget(null)}
        />
      )}
    </div>
  );
}
