import { useEffect, useState, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { getStructure } from '../../api/client';
import type { TelemetryReading } from '../../api/types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface Props {
  structureId: string | null;
}

export default function TrendChart({ structureId }: Props) {
  const [readings, setReadings] = useState<TelemetryReading[]>([]);
  const [name, setName] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!structureId) {
      setReadings([]);
      setName('');
      return;
    }

    setLoading(true);
    getStructure(structureId)
      .then((detail) => {
        setName(detail.name);
        // API returns newest first, reverse for chronological X axis
        setReadings([...(detail.telemetry || [])].reverse());
      })
      .catch((err) => console.error('TrendChart fetch error:', err))
      .finally(() => setLoading(false));
  }, [structureId]);

  // Compute per-interval percolation rate
  const rateData = useMemo(() => {
    if (readings.length < 2) return { labels: [] as string[], rates: [] as number[] };

    const labels: string[] = [];
    const rates: number[] = [];

    for (let i = 1; i < readings.length; i++) {
      const prev = readings[i - 1];
      const cur = readings[i];
      const msPerDay = 86_400_000;
      const days =
        (new Date(cur.timestamp).getTime() - new Date(prev.timestamp).getTime()) / msPerDay;

      if (days > 0 && prev.water_depth_cm > cur.water_depth_cm) {
        const rate = ((prev.water_depth_cm - cur.water_depth_cm) / days) * 10; // cm→mm
        rates.push(Math.round(rate * 100) / 100);
      } else {
        rates.push(0);
      }

      labels.push(
        new Date(cur.timestamp).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
        })
      );
    }

    return { labels, rates };
  }, [readings]);

  // Empty / placeholder state
  if (!structureId) {
    return (
      <div className="w-full h-full min-h-[300px] bg-black border border-white/10 flex items-center justify-center p-6">
        <p className="font-manrope text-white/30 text-[13px] text-center">
          Select a structure on the map or work-order list to view its percolation trend.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full h-full min-h-[300px] bg-black border border-white/10 flex items-center justify-center">
        <span className="font-manrope text-white/40 text-[13px] animate-pulse">
          Loading trend…
        </span>
      </div>
    );
  }

  const chartData = {
    labels: rateData.labels,
    datasets: [
      {
        label: 'Percolation rate (mm/day)',
        data: rateData.rates,
        borderColor: '#AFDDFF',
        backgroundColor: 'rgba(175, 221, 255, 0.08)',
        pointBackgroundColor: '#AFDDFF',
        pointBorderColor: '#AFDDFF',
        pointRadius: 2,
        pointHoverRadius: 5,
        borderWidth: 1.5,
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: `Percolation Trend — ${name || structureId}`,
        color: '#AFDDFF',
        font: { family: "'Manrope', sans-serif", size: 12 },
        padding: { bottom: 16 },
      },
      tooltip: {
        backgroundColor: '#000',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        titleColor: '#AFDDFF',
        bodyColor: '#fff',
        titleFont: { family: "'Manrope', sans-serif", size: 11 },
        bodyFont: { family: "'Manrope', sans-serif", size: 11 },
        callbacks: {
          label: (ctx: any) => `${ctx.parsed.y} mm/day`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: 'rgba(255,255,255,0.35)', font: { size: 10 } },
        grid: { color: 'rgba(255,255,255,0.04)' },
      },
      y: {
        ticks: { color: 'rgba(255,255,255,0.35)', font: { size: 10 } },
        grid: { color: 'rgba(255,255,255,0.06)' },
        title: {
          display: true,
          text: 'mm/day',
          color: 'rgba(255,255,255,0.4)',
          font: { size: 10 },
        },
      },
    },
  };

  return (
    <div className="w-full h-full min-h-[300px] bg-black border border-white/10 p-4">
      <Line data={chartData} options={chartOptions} />
    </div>
  );
}
