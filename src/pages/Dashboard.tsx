import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SummaryBar from '../components/dashboard/SummaryBar';
import CatchmentMap from '../components/dashboard/CatchmentMap';
import TrendChart from '../components/dashboard/TrendChart';
import DesiltingImpact from '../components/dashboard/DesiltingImpact';
import WorkOrderList from '../components/dashboard/WorkOrderList';
import { getLastSyncTime } from '../api/client';

export default function Dashboard() {
  const [selectedStructureId, setSelectedStructureId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'simple' | 'detailed'>('simple');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [lastSyncTime, setLastSyncTime] = useState<string>(
    getLastSyncTime() || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      const syncTime = getLastSyncTime();
      if (syncTime) setLastSyncTime(syncTime);
    };

    const handleOffline = () => {
      setIsOnline(false);
      const syncTime = getLastSyncTime();
      if (syncTime) setLastSyncTime(syncTime);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="bg-black min-h-screen font-manrope">
      {/* Offline banner */}
      {!isOnline && (
        <div className="bg-black border-b border-amber-400/40 text-amber-300 text-[12px] p-2 text-center font-medium flex items-center justify-center gap-2">
          <span>⚠️ OFFLINE — showing last synced data from {lastSyncTime}</span>
          <span className="text-white/40">•</span>
          <span className="text-[#AFDDFF]">Cellular SMS Direct Dispatch Active</span>
        </div>
      )}

      {/* Top nav bar — Back link + View Mode density toggle */}
      <div className="flex items-center justify-between px-5 md:px-[35px] pt-5 md:pt-[27px]">
        <Link
          to="/"
          className="font-manrope text-[12px] text-white/60 hover:text-white transition-colors inline-flex items-center gap-1"
        >
          ← BACK
        </Link>

        {/* View mode toggle */}
        <div className="flex items-center gap-2 font-manrope text-[11px] bg-black border border-white/10 px-3 py-1.5 rounded-sm">
          <button
            type="button"
            onClick={() => setViewMode('simple')}
            className={`transition-colors cursor-pointer ${
              viewMode === 'simple' ? 'text-[#AFDDFF] font-semibold' : 'text-white/40 hover:text-white/70'
            }`}
          >
            VIEW: SIMPLE
          </button>
          <span className="text-white/20">|</span>
          <button
            type="button"
            onClick={() => setViewMode('detailed')}
            className={`transition-colors cursor-pointer ${
              viewMode === 'detailed' ? 'text-[#AFDDFF] font-semibold' : 'text-white/40 hover:text-white/70'
            }`}
          >
            VIEW: DETAILED
          </button>
        </div>
      </div>

      {/* Dashboard content */}
      <div className="px-5 md:px-[35px] py-5 md:py-6 space-y-5">
        {/* Summary bar across the top */}
        <SummaryBar />

        {/* Two-column layout */}
        <div className="flex flex-col md:flex-row gap-5 items-stretch">
          {/* Left / wider column — map + optional detailed analytics */}
          <div className="flex-1 min-w-0 flex flex-col space-y-5">
            <div className={`w-full flex flex-col ${viewMode === 'simple' ? 'flex-1 min-h-[540px] lg:min-h-[620px]' : 'h-[440px] flex-shrink-0'}`}>
              <CatchmentMap onSelect={setSelectedStructureId} viewMode={viewMode} />
            </div>
            {viewMode === 'detailed' && (
              <>
                <TrendChart structureId={selectedStructureId} />
                <DesiltingImpact structureId={selectedStructureId} />
              </>
            )}
          </div>

          {/* Right / narrower column — work order list */}
          <div className="w-full md:w-[320px] lg:w-[380px] flex-shrink-0 flex flex-col">
            <WorkOrderList
              onSelect={setSelectedStructureId}
              selectedId={selectedStructureId}
              viewMode={viewMode}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
