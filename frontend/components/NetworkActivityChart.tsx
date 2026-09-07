import React, { useState } from 'react';
import { Activity, ShieldCheck, AlertCircle, ShieldAlert, BarChart3, TrendingUp } from 'lucide-react';

interface ActivityPoint {
  time: string;
  safe: number;       // Green
  confirmed: number;  // Red
  flagged: number;    // Dark Slate
}

const TIME_SERIES_DATA: ActivityPoint[] = [
  { time: '00:00', safe: 65, confirmed: 4, flagged: 8 },
  { time: '02:00', safe: 80, confirmed: 2, flagged: 6 },
  { time: '04:00', safe: 95, confirmed: 5, flagged: 10 },
  { time: '06:00', safe: 140, confirmed: 8, flagged: 18 },
  { time: '08:00', safe: 240, confirmed: 18, flagged: 28 },
  { time: '10:00', safe: 380, confirmed: 35, flagged: 45 },
  { time: '12:00', safe: 450, confirmed: 48, flagged: 52 },
  { time: '14:00', safe: 520, confirmed: 62, flagged: 70 },
  { time: '16:00', safe: 580, confirmed: 75, flagged: 85 },
  { time: '18:00', safe: 620, confirmed: 85, flagged: 95 },
  { time: '20:00', safe: 490, confirmed: 55, flagged: 65 },
  { time: '22:00', safe: 380, confirmed: 38, flagged: 45 },
  { time: '24:00', safe: 280, confirmed: 22, flagged: 30 },
];

export const NetworkActivityChart: React.FC = () => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Compute totals
  const totalEvents = TIME_SERIES_DATA.reduce((acc, d) => acc + d.safe + d.confirmed + d.flagged, 0);
  const totalSafe = TIME_SERIES_DATA.reduce((acc, d) => acc + d.safe, 0);
  const totalConfirmed = TIME_SERIES_DATA.reduce((acc, d) => acc + d.confirmed, 0);
  const totalFlagged = TIME_SERIES_DATA.reduce((acc, d) => acc + d.flagged, 0);

  const maxTotal = Math.max(...TIME_SERIES_DATA.map(d => d.safe + d.confirmed + d.flagged));
  const yTicks = [600, 450, 300, 150, 0];

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-5">
      
      {/* Header & Metric Badges */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#10B981]" />
            <h2 className="text-base font-bold text-[#0F172A] tracking-tight">Network Activity & Security Volume</h2>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">Continuous 24-hour telemetry event stream & violation distribution across all nodes.</p>
        </div>

        {/* Legend / Metrics */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></span>
            <span className="text-[#334155] font-semibold">Safe Activity: {totalSafe.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#FEF2F2] border border-[#FEE2E2] rounded-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]"></span>
            <span className="text-[#B91C1C] font-semibold">Confirmed: {totalConfirmed.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0F172A]"></span>
            <span className="text-[#0F172A] font-semibold">Flagged: {totalFlagged.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Main Chart Canvas with Y-Axis and Guidelines */}
      <div className="pt-2">
        <div className="relative h-56 flex items-end">
          
          {/* Y-Axis Guidelines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6 pl-8">
            {yTicks.map((tick, idx) => (
              <div key={idx} className="w-full flex items-center gap-2">
                <span className="text-[10px] font-mono text-[#94A3B8] w-6 text-right shrink-0">{tick}</span>
                <div className="w-full border-b border-dashed border-[#F1F5F9]" />
              </div>
            ))}
          </div>

          {/* Bars Container */}
          <div className="relative w-full h-full flex items-end justify-between gap-2.5 pl-10 pr-2 pb-6 z-10">
            {TIME_SERIES_DATA.map((pt, idx) => {
              const total = pt.safe + pt.confirmed + pt.flagged;
              const barHeightPct = Math.min((total / maxTotal) * 100, 100);
              
              const safePct = (pt.safe / total) * 100;
              const confirmedPct = (pt.confirmed / total) * 100;
              const flaggedPct = (pt.flagged / total) * 100;

              const isHovered = hoveredIdx === idx;

              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center justify-end h-full relative cursor-pointer group"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  {/* Floating Hover Tooltip */}
                  {isHovered && (
                    <div className="absolute -top-20 bg-[#0F172A] text-white text-[10px] font-mono py-1.5 px-3 rounded-xl shadow-lg pointer-events-none z-30 whitespace-nowrap animate-in fade-in zoom-in-95 duration-150">
                      <div className="font-bold border-b border-slate-700 pb-1 mb-1 flex items-center justify-between gap-3">
                        <span>{pt.time} UTC</span>
                        <span>{total} total/s</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#34D399]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#34D399]"></span>
                        <span>Safe: {pt.safe}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#F87171]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#F87171]"></span>
                        <span>Threats: {pt.confirmed}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#94A3B8]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#94A3B8]"></span>
                        <span>Flagged: {pt.flagged}</span>
                      </div>
                    </div>
                  )}

                  {/* Concrete Stacked Bar with guaranteed non-zero height */}
                  <div
                    style={{ height: `${Math.max(barHeightPct, 12)}%` }}
                    className={`w-full max-w-[32px] flex flex-col justify-end rounded-t-md overflow-hidden transition-all duration-200 shadow-sm ${
                      isHovered ? 'ring-2 ring-[#0F172A] scale-[1.04]' : 'hover:opacity-95'
                    }`}
                  >
                    {/* Top Segment: Black Bar (Flagged Issue) */}
                    <div
                      style={{ height: `${flaggedPct}%` }}
                      className="bg-[#0F172A] w-full min-h-[3px] transition-all"
                      title={`Flagged: ${pt.flagged}`}
                    />
                    {/* Middle Segment: Red Bar (Confirmed Violation) */}
                    <div
                      style={{ height: `${confirmedPct}%` }}
                      className="bg-[#EF4444] w-full min-h-[3px] transition-all"
                      title={`Confirmed: ${pt.confirmed}`}
                    />
                    {/* Bottom Segment: Green Bar (Safe Telemetry) */}
                    <div
                      style={{ height: `${safePct}%` }}
                      className="bg-[#10B981] w-full min-h-[10px] transition-all"
                      title={`Safe: ${pt.safe}`}
                    />
                  </div>

                </div>
              );
            })}
          </div>

        </div>

        {/* X-Axis Time Labels */}
        <div className="flex justify-between pl-10 pr-2 pt-1 border-t border-[#E2E8F0] text-[10px] font-mono text-[#64748B]">
          {TIME_SERIES_DATA.map((pt, idx) => (
            <span key={idx} className="flex-1 text-center font-medium">{pt.time}</span>
          ))}
        </div>
      </div>

    </div>
  );
};
