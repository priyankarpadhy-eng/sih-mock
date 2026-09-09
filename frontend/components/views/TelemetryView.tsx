import React, { useState } from 'react';
import { Activity, ShieldCheck, Filter, Terminal } from 'lucide-react';
import { NavTab } from '../layout/Sidebar';

interface UnifiedJsonLog {
  timestamp: string;
  device_id: string;
  hostname: string;
  vendor: string;
  log_level: string;
  category: string;
  raw_message: string;
  parsed_data: Record<string, any>;
}

interface TelemetryPageProps {
  logs: UnifiedJsonLog[];
  selectedDeviceId: string;
  onSelectDevice: (id: string) => void;
  onNavigate: (tab: NavTab) => void;
  onVerifyAndAudit: () => void;
}

export const TelemetryPage: React.FC<TelemetryPageProps> = ({
  logs,
  selectedDeviceId,
  onSelectDevice,
  onNavigate,
  onVerifyAndAudit,
}) => {
  const [selectedLogLevel, setSelectedLogLevel] = useState<string>('ALL');

  const filteredLogs = logs.filter((l) => {
    if (selectedDeviceId && selectedDeviceId !== 'ALL' && l.device_id !== selectedDeviceId) return false;
    if (selectedLogLevel !== 'ALL' && l.log_level !== selectedLogLevel) return false;
    return true;
  });

  const getLogLevelBadge = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20';
      case 'WARNING':
        return 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20';
      default:
        return 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0F172A]">Real-Time Telemetry</h1>
          <p className="text-xs text-[#64748B] mt-0.5">Centralized JSON log lake and event stream.</p>
        </div>

        <button
          onClick={() => {
            onVerifyAndAudit();
            onNavigate('auditor');
          }}
          className="px-4 py-2 bg-[#0F172A] hover:bg-[#1E293B] text-white font-semibold font-mono text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 shrink-0"
        >
          <ShieldCheck className="w-4 h-4 text-[#10B981]" />
          <span>VERIFY & RUN AUDIT SCAN</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-[#E2E8F0] p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-[#64748B]">
            <Filter className="w-3.5 h-3.5" />
            <span>HARDWARE FILTER:</span>
          </div>
          <select
            value={selectedDeviceId}
            onChange={(e) => onSelectDevice(e.target.value)}
            className="p-1.5 bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-lg"
          >
            <option value="ALL">ALL DEVICES ({logs.length} LOGS)</option>
            <option value="DEV-CSCO-01">DEV-CSCO-01 (TAC-ROUTER-01)</option>
            <option value="DEV-PAN-01">DEV-PAN-01 (FW-PAN-TACTICAL-01)</option>
            <option value="DEV-JUN-01">DEV-JUN-01 (BGP-JUNOS-01)</option>
            <option value="DEV-FGT-01">DEV-FGT-01 (FG-SASE-HUB-01)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[#64748B]">SEVERITY:</span>
          <select
            value={selectedLogLevel}
            onChange={(e) => setSelectedLogLevel(e.target.value)}
            className="p-1.5 bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-lg"
          >
            <option value="ALL">ALL LEVELS</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="WARNING">WARNING</option>
            <option value="INFO">INFO</option>
          </select>
        </div>
      </div>

      {/* Log Lake Stream */}
      <div className="space-y-3">
        {filteredLogs.map((log, idx) => (
          <div key={idx} className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-sm space-y-3 font-mono text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E8F0] pb-2 text-[11px]">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded border font-bold ${getLogLevelBadge(log.log_level)}`}>
                  {log.log_level}
                </span>
                <span className="text-[#10B981] font-bold">[{log.device_id}]</span>
                <span className="text-[#0F172A] font-bold">{log.hostname}</span>
                <span className="text-[#64748B]">&bull; {log.category}</span>
              </div>
              <span className="text-[#64748B]">{log.timestamp}</span>
            </div>

            <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[#0F172A] text-[11px]">
              <code>{log.raw_message}</code>
            </div>

            <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg space-y-1 text-[11px]">
              <span className="text-[#64748B] text-[10px] uppercase font-semibold block">NORMALIZED JSON DATA:</span>
              <pre className="text-[#0F172A] overflow-x-auto leading-relaxed">
                <code>{JSON.stringify(log.parsed_data, null, 2)}</code>
              </pre>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
