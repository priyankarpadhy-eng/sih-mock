import React, { useState } from 'react';
import { Search, ArrowRight, ShieldCheck, AlertTriangle, ShieldAlert, Cpu, Terminal, Play, Zap, Settings } from 'lucide-react';
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

      {/* Automated Task Routing & Junior Engineer Workload Matrix */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 font-heading">Automated Task Assignment & Engineer Routing Matrix</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  POLICY ENGINE ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Violations discovered in vendor configurations are automatically triaged and assigned to designated junior engineers.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('settings')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors self-start sm:self-auto cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            <span>Configure Routing Rules</span>
            <ArrowRight className="w-3 h-3 text-slate-400" />
          </button>
        </div>

        {/* 4 Vendor Routing Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded uppercase">
                Cisco Systems
              </span>
              <span className="text-[10px] text-slate-500">SLA 4h</span>
            </div>
            <div className="font-semibold text-slate-900 font-sans text-xs">Junior NetOps Specialist</div>
            <div className="text-[11px] text-slate-500 truncate">netops.junior@vectornet.local</div>
            <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Auto-Remediation:</span>
              <span className="text-emerald-600 font-bold">Enabled</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-orange-700 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded uppercase">
                Palo Alto
              </span>
              <span className="text-[10px] text-rose-600 font-bold">SLA 2h</span>
            </div>
            <div className="font-semibold text-slate-900 font-sans text-xs">Perimeter Security Analyst</div>
            <div className="text-[11px] text-slate-500 truncate">firewall.palo@vectornet.local</div>
            <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Auto-Remediation:</span>
              <span className="text-emerald-600 font-bold">Enabled</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded uppercase">
                Fortinet FortiOS
              </span>
              <span className="text-[10px] text-slate-500">SLA 4h</span>
            </div>
            <div className="font-semibold text-slate-900 font-sans text-xs">SecOps Incident Responder</div>
            <div className="text-[11px] text-slate-500 truncate">secops.forti@vectornet.local</div>
            <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Auto-Remediation:</span>
              <span className="text-emerald-600 font-bold">Enabled</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded uppercase">
                Juniper JunOS
              </span>
              <span className="text-[10px] text-slate-500">SLA 6h</span>
            </div>
            <div className="font-semibold text-slate-900 font-sans text-xs">Infrastructure Routing Engineer</div>
            <div className="text-[11px] text-slate-500 truncate">routing.juniper@vectornet.local</div>
            <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Auto-Remediation:</span>
              <span className="text-emerald-600 font-bold">Enabled</span>
            </div>
          </div>
        </div>
      </div>

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
