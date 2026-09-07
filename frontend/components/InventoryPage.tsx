import React from 'react';
import { Server, Activity, ShieldCheck, ArrowRight } from 'lucide-react';
import { NavTab } from './Sidebar';

interface InventoryPageProps {
  assets: any[];
  onSelectDevice: (deviceId: string) => void;
  onNavigate: (tab: NavTab) => void;
}

export const InventoryPage: React.FC<InventoryPageProps> = ({
  assets,
  onSelectDevice,
  onNavigate,
}) => {
  const getScoreCircleColor = (s: number) => {
    if (s >= 80) return 'text-[#10B981] border-[#10B981]';
    if (s >= 60) return 'text-[#F59E0B] border-[#F59E0B]';
    return 'text-[#EF4444] border-[#EF4444]';
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#0F172A]">Asset Inventory</h1>
        <p className="text-xs text-[#64748B] mt-0.5">Network hardware assets and configuration state.</p>
      </div>

      {/* Asset Cards List */}
      <div className="grid grid-cols-1 gap-4">
        {assets.map((item) => (
          <div key={item.device_id} className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3">
              <div>
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="text-[#10B981] font-bold">[{item.device_id}]</span>
                  <span className="text-[#0F172A] font-bold text-sm">{item.hostname}</span>
                  <span className="text-[#64748B] text-[11px]">&bull; {item.vendor}</span>
                </div>
                <div className="text-xs text-[#64748B] font-mono mt-0.5">
                  Model: <span className="text-[#0F172A]">{item.model_number}</span> | OS: <span className="text-[#0F172A]">{item.os_version}</span> | Serial: <span className="text-[#0F172A]">{item.serial_number}</span> | IP: <span className="text-[#10B981]">{item.ip_address}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 font-mono text-xs">
                <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center font-bold text-xs ${getScoreCircleColor(item.compliance_score)}`}>
                  {Math.round(item.compliance_score)}
                </div>

                <button
                  onClick={() => {
                    onSelectDevice(item.device_id);
                    onNavigate('telemetry');
                  }}
                  className="px-3 py-1.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-[#0F172A] rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors"
                >
                  <Activity className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>Stream Logs</span>
                </button>

                <button
                  onClick={() => {
                    onSelectDevice(item.device_id);
                    onNavigate('auditor');
                  }}
                  className="px-3 py-1.5 bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Inspect</span>
                </button>
              </div>
            </div>

            {/* Sub-details: Interfaces & Protocols */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-3.5 rounded-xl space-y-1.5">
                <span className="text-[#64748B] text-[10px] uppercase block font-semibold">INTERFACES</span>
                <div className="space-y-1">
                  {item.interfaces_status?.map((iface: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-[11px]">
                      <span className="text-[#0F172A]">{iface.name} ({iface.ip})</span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] ${iface.status === 'UP' ? 'bg-[#10B981]/15 text-[#10B981] font-bold' : 'bg-[#EF4444]/15 text-[#EF4444] font-bold'}`}>
                        {iface.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-3.5 rounded-xl space-y-1.5">
                <span className="text-[#64748B] text-[10px] uppercase block font-semibold">MANAGEMENT PROTOCOLS</span>
                <div className="flex flex-wrap gap-1.5">
                  {item.management_protocols?.map((proto: string, idx: number) => (
                    <span
                      key={idx}
                      className={`px-2 py-0.5 rounded text-[11px] border ${
                        proto.includes('Non-Compliant') || proto === 'Telnet'
                          ? 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20'
                          : 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20'
                      }`}
                    >
                      {proto}
                    </span>
                  ))}
                </div>
              </div>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
};
