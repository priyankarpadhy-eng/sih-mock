import React, { useState } from 'react';
import { Search, ArrowRight, ShieldCheck, AlertTriangle, ShieldAlert, Cpu, Terminal, Play } from 'lucide-react';
import { NetworkActivityChart } from '../widgets/NetworkActivityChart';
import { NavTab } from '../layout/Sidebar';

interface OverviewPageProps {
  auditResult: any;
  vendor: string;
  assets: any[];
  onNavigate: (tab: NavTab) => void;
  onSelectDevice: (id: string) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  auditResult,
  vendor,
  assets,
  onNavigate,
  onSelectDevice,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const score = auditResult?.compliance_score || 0;
  const total = auditResult?.total_checks || 7;
  const passed = auditResult?.passed_checks || 0;
  const failed = auditResult?.failed_checks || 0;

  const filteredAssets = assets.filter(a => 
    a.hostname.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.vendor.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getScoreCircleColor = (s: number) => {
    if (s >= 80) return 'text-[#10B981] border-[#10B981]';
    if (s >= 60) return 'text-[#F59E0B] border-[#F59E0B]';
    return 'text-[#EF4444] border-[#EF4444]';
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0F172A]">Dashboard</h1>
          <p className="text-xs text-[#64748B] mt-0.5">Multi-Vendor Network Security & Continuous Compliance Platform</p>
        </div>
      </div>

      {/* 4 Top Metric Cards (Reference Image 1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white border border-[#E2E8F0] p-5 rounded-2xl shadow-sm space-y-2">
          <span className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider font-bold">HARDWARE MONITORED</span>
          <div className="text-3xl font-bold font-mono text-[#0F172A]">{assets.length}</div>
          <p className="text-xs text-[#64748B]">4 active monitoring nodes</p>
        </div>

        <div className="bg-white border border-[#E2E8F0] p-5 rounded-2xl shadow-sm space-y-2">
          <span className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider font-bold">AVG. COMPLIANCE SCORE</span>
          <div className="text-3xl font-bold font-mono text-[#0F172A] flex items-center justify-between">
            <span>{score}%</span>
            <span className="text-xs font-semibold px-2 py-0.5 bg-[#10B981]/10 text-[#10B981] rounded border border-[#10B981]/20">
              +5% last scan
            </span>
          </div>
          <p className="text-xs text-[#64748B]">NIST / CIS / STIG / ISO 27001</p>
        </div>

        <div className="bg-white border border-[#E2E8F0] p-5 rounded-2xl shadow-sm space-y-2">
          <span className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider font-bold">ACTIVE SECURITY ISSUES</span>
          <div className="text-3xl font-bold font-mono text-[#EF4444]">{failed}</div>
          <p className="text-xs text-[#64748B]">Across all network nodes</p>
        </div>

        <div className="bg-white border border-[#E2E8F0] p-5 rounded-2xl shadow-sm space-y-2">
          <span className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider font-bold">AUDITS COMPLETED</span>
          <div className="text-3xl font-bold font-mono text-[#0F172A]">12</div>
          <p className="text-xs text-[#64748B]">Automated real-time scans</p>
        </div>

      </div>

      {/* Quick Audit Bar (Reference Image 1) */}
      <div className="bg-white border border-[#E2E8F0] p-4 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-[#475569]">
          <Play className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
          <span>Execute quick configuration audit for target device</span>
        </div>
        <div className="flex items-center gap-2 flex-1 max-w-xl">
          <input
            type="text"
            placeholder="Enter device hostname or IP to audit - e.g. 10.0.1.1"
            className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
          />
          <button
            onClick={() => onNavigate('auditor')}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold font-mono text-xs rounded-xl shadow-sm transition-colors shrink-0"
          >
            Start Audit
          </button>
        </div>
      </div>

      {/* Network Activity Time Series Graph (Green=Safe, Red=Confirmed, Black=Flagged) */}
      <NetworkActivityChart />

      {/* Monitored Assets Table (Reference Image 1) */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-base font-bold text-[#0F172A]">Monitored Network Assets</h2>
          <div className="relative">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assets..."
              className="pl-9 pr-4 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A] focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-[#64748B] uppercase tracking-wider text-[10px]">
                <th className="pb-3 font-semibold">HARDWARE ASSET</th>
                <th className="pb-3 font-semibold">SCORE</th>
                <th className="pb-3 font-semibold">NIST</th>
                <th className="pb-3 font-semibold">CIS</th>
                <th className="pb-3 font-semibold">STIG</th>
                <th className="pb-3 font-semibold">ISSUES</th>
                <th className="pb-3 font-semibold text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredAssets.map((item) => (
                <tr key={item.device_id} className="text-[#0F172A] hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-4">
                    <div className="font-bold font-sans text-sm">{item.hostname}</div>
                    <div className="text-[11px] text-[#64748B] font-mono">{item.vendor} &bull; {item.ip_address}</div>
                  </td>
                  <td className="py-4">
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-xs ${getScoreCircleColor(item.compliance_score)}`}>
                      {Math.round(item.compliance_score)}
                    </div>
                  </td>
                  <td className="py-4">
                    <span className="text-[#10B981] font-bold">PASS</span>
                  </td>
                  <td className="py-4">
                    <span className={item.compliance_score >= 70 ? "text-[#10B981] font-bold" : "text-[#EF4444] font-bold"}>
                      {item.compliance_score >= 70 ? "PASS" : "FAIL"}
                    </span>
                  </td>
                  <td className="py-4">
                    <span className="text-[#10B981] font-bold">PASS</span>
                  </td>
                  <td className="py-4">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {item.compliance_score < 50 && (
                        <span className="px-2 py-0.5 bg-[#EF4444]/10 text-[#EF4444] rounded border border-[#EF4444]/20 text-[10px]">
                          2 Critical
                        </span>
                      )}
                      {item.compliance_score < 70 && (
                        <span className="px-2 py-0.5 bg-[#F59E0B]/10 text-[#F59E0B] rounded border border-[#F59E0B]/20 text-[10px]">
                          4 High
                        </span>
                      )}
                      <span className="px-2 py-0.5 bg-[#F1F5F9] text-[#475569] rounded border border-[#E2E8F0] text-[10px]">
                        1 Medium
                      </span>
                    </div>
                  </td>
                  <td className="py-4 text-right">
                    <button
                      onClick={() => {
                        onSelectDevice(item.device_id);
                        onNavigate('auditor');
                      }}
                      className="px-3 py-1.5 bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-lg font-mono text-xs transition-colors"
                    >
                      Audit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
