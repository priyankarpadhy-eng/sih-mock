import React, { useState } from 'react';
import { Search, ArrowRight, ShieldCheck, AlertTriangle, ShieldAlert, Cpu, Terminal, Play, Zap, Settings, Server, Layers } from 'lucide-react';
import { NetworkActivityChart } from '../widgets/NetworkActivityChart';
import { NavTab } from '../layout/Sidebar';

interface OverviewPageProps {
  auditResult: any;
  vendor: string;
  assets: any[];
  onNavigate: (tab: NavTab) => void;
  onSelectDevice: (id: string) => void;
}

const DEFAULT_FLEET_HARDWARE = [
  {
    device_id: 'DEV-CISCO-ISR4451',
    hostname: 'RTR-NYC-CORE-01',
    vendor: 'Cisco Systems',
    model_number: 'ISR 4451 Core Router',
    os_version: 'Cisco IOS-XE 16.09.04',
    ip_address: '10.0.1.1',
    device_type: 'router',
    compliance_score: 67,
    critical_issues: 2,
    warning_issues: 1,
    nist: 'FAIL',
    cis: 'FAIL',
    stig: 'FAIL',
  },
  {
    device_id: 'DEV-JUNIPER-SRX340',
    hostname: 'SRX-SFO-EDGE-01',
    vendor: 'Juniper Networks',
    model_number: 'SRX340 Security Gateway',
    os_version: 'Junos OS 21.4R1',
    ip_address: '172.16.0.1',
    device_type: 'firewall',
    compliance_score: 78,
    critical_issues: 1,
    warning_issues: 1,
    nist: 'PASS',
    cis: 'FAIL',
    stig: 'PASS',
  },
  {
    device_id: 'DEV-PALO-PA3220',
    hostname: 'FW-DC1-PERIMETER-01',
    vendor: 'Palo Alto Networks',
    model_number: 'PA-3220 NGFW',
    os_version: 'PAN-OS 10.2.3',
    ip_address: '192.168.1.1',
    device_type: 'firewall',
    compliance_score: 70,
    critical_issues: 2,
    warning_issues: 1,
    nist: 'PASS',
    cis: 'FAIL',
    stig: 'FAIL',
  },
  {
    device_id: 'DEV-FORTI-FGT100F',
    hostname: 'FGT-BRANCH-LON-01',
    vendor: 'Fortinet',
    model_number: 'FortiGate-100F Perimeter',
    os_version: 'FortiOS 7.2.4',
    ip_address: '10.10.1.1',
    device_type: 'firewall',
    compliance_score: 78,
    critical_issues: 1,
    warning_issues: 1,
    nist: 'PASS',
    cis: 'PASS',
    stig: 'PASS',
  },
];

export const OverviewPage: React.FC<OverviewPageProps> = ({
  auditResult,
  vendor,
  assets,
  onNavigate,
  onSelectDevice,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Merge live assets with default fleet hardware
  const combinedAssets = React.useMemo(() => {
    if (assets && assets.length > 0) {
      return assets;
    }
    // If an audit was performed just now, prepend it
    if (auditResult) {
      const liveDevName = auditResult?.sbm?.device_metadata?.hostname || auditResult?.hostname || 'INGESTED-NODE-01';
      const liveVendor = vendor || auditResult?.sbm?.device_metadata?.vendor || 'Cisco Systems';
      const liveScore = Math.round(auditResult?.compliance_score || 75);
      const liveViolations = auditResult?.findings?.filter((f: any) => f.status === 'FAIL' || f.status === 'WARNING').length || 0;
      
      const liveAsset = {
        device_id: `DEV-LIVE-${Date.now().toString(36)}`,
        hostname: liveDevName,
        vendor: liveVendor,
        model_number: auditResult?.detected_hardware || 'Network Appliance',
        os_version: auditResult?.os_platform || 'Universal',
        ip_address: '10.0.1.1',
        device_type: 'router',
        compliance_score: liveScore,
        critical_issues: Math.ceil(liveViolations * 0.6),
        warning_issues: Math.floor(liveViolations * 0.4),
        nist: liveScore >= 80 ? 'PASS' : 'FAIL',
        cis: liveScore >= 70 ? 'PASS' : 'FAIL',
        stig: liveScore >= 75 ? 'PASS' : 'FAIL',
      };
      return [liveAsset, ...DEFAULT_FLEET_HARDWARE.slice(0, 3)];
    }
    return DEFAULT_FLEET_HARDWARE;
  }, [assets, auditResult, vendor]);

  const filteredAssets = combinedAssets.filter(a => 
    (a.hostname || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.vendor || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.model_number || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Compute Hardware & Vendor Metrics
  const uniqueVendors = Array.from(new Set(combinedAssets.map(a => a.vendor).filter(Boolean)));
  const uniqueHardwareModels = Array.from(new Set(combinedAssets.map(a => a.model_number).filter(Boolean)));
  
  const totalIssuesCount = combinedAssets.reduce((sum, a) => {
    const crit = a.critical_issues ?? 0;
    const warn = a.warning_issues ?? 0;
    return sum + crit + warn;
  }, 0);

  const avgFleetScore = combinedAssets.length > 0
    ? Math.round(combinedAssets.reduce((sum, a) => sum + (a.compliance_score || 0), 0) / combinedAssets.length)
    : 73;

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
          <h1 className="text-xl font-bold text-[#0F172A]">Overview</h1>
          <p className="text-xs text-[#64748B] mt-0.5">Multi-Vendor Network Security & Continuous Compliance Platform</p>
        </div>
      </div>

      {/* 4 Top Metric Cards (Hardware & Vendor Details) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Unique Vendors Detected */}
        <div className="bg-white border border-[#E2E8F0] p-5 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider font-bold">UNIQUE VENDORS DETECTED</span>
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          </div>
          <div className="text-3xl font-bold font-mono text-[#0F172A]">{uniqueVendors.length}</div>
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            {uniqueVendors.slice(0, 4).map((v, idx) => (
              <span key={idx} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                {v.split(' ')[0]}
              </span>
            ))}
          </div>
        </div>

        {/* Card 2: Hardware & Appliance Models */}
        <div className="bg-white border border-[#E2E8F0] p-5 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider font-bold">HARDWARE & APPLIANCES</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          </div>
          <div className="text-3xl font-bold font-mono text-[#0F172A]">{uniqueHardwareModels.length} Models</div>
          <p className="text-xs text-[#64748B] truncate">
            Routers, NGFWs, Security Gateways
          </p>
        </div>

        {/* Card 3: Active Compliance Issues */}
        <div className="bg-white border border-[#E2E8F0] p-5 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider font-bold">ACTIVE COMPLIANCE ISSUES</span>
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
          </div>
          <div className="text-3xl font-bold font-mono text-[#EF4444]">{totalIssuesCount}</div>
          <p className="text-xs text-[#64748B]">Across all detected network hardware</p>
        </div>

        {/* Card 4: Average Compliance Score */}
        <div className="bg-white border border-[#E2E8F0] p-5 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider font-bold">AVG. COMPLIANCE SCORE</span>
            <span className="text-xs font-semibold px-2 py-0.5 bg-[#10B981]/10 text-[#10B981] rounded border border-[#10B981]/20">
              Fleet Average
            </span>
          </div>
          <div className="text-3xl font-bold font-mono text-[#0F172A]">
            {avgFleetScore}%
          </div>
          <p className="text-xs text-[#64748B]">NIST SP 800-53 &bull; CIS &bull; CERT-In</p>
        </div>

      </div>

      {/* Quick Audit Bar */}
      <div className="bg-white border border-[#E2E8F0] p-4 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-[#475569]">
          <Play className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
          <span>Execute configuration compliance audit for target device</span>
        </div>
        <div className="flex items-center gap-2 flex-1 max-w-xl">
          <input
            type="text"
            placeholder="Enter device hostname or IP to audit - e.g. 10.0.1.1"
            className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
          />
          <button
            onClick={() => onNavigate('ingestion')}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold font-mono text-xs rounded-xl shadow-sm transition-colors shrink-0 cursor-pointer"
          >
            Start Audit
          </button>
        </div>
      </div>

      {/* Vendor & Hardware-Wise Compliance Issues Graph */}
      <NetworkActivityChart auditResult={auditResult} assets={combinedAssets} />

      {/* Automated Task Routing & Junior Engineer Workload Matrix */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 font-heading">Automated Task Assignment & Engineer Routing Matrix</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-orange-50 text-orange-800 border border-orange-200">
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

      {/* Detected Hardware Assets & Network Appliances Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[#0F172A]">Detected Hardware & Network Appliances</h2>
            <p className="text-xs text-[#64748B] mt-0.5">Inventory of parsed device models, vendor platforms, and compliance standings.</p>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search hardware or vendor..."
              className="pl-9 pr-4 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A] focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-[#64748B] uppercase tracking-wider text-[10px]">
                <th className="pb-3 font-semibold">HARDWARE APPLIANCE</th>
                <th className="pb-3 font-semibold">VENDOR</th>
                <th className="pb-3 font-semibold">SCORE</th>
                <th className="pb-3 font-semibold">NIST</th>
                <th className="pb-3 font-semibold">CIS</th>
                <th className="pb-3 font-semibold">STIG</th>
                <th className="pb-3 font-semibold">ISSUES FOUND</th>
                <th className="pb-3 font-semibold text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredAssets.length > 0 ? (
                filteredAssets.map((item) => (
                  <tr key={item.device_id} className="text-[#0F172A] hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-4">
                      <div className="font-bold font-sans text-sm flex items-center gap-2">
                        <span>{item.model_number || item.hostname}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200">
                          {item.hostname}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#64748B] font-mono mt-0.5">
                        {item.ip_address} &bull; {item.os_version || 'Universal'}
                      </div>
                    </td>
                    <td className="py-4">
                      <span className="font-semibold text-slate-800">{item.vendor}</span>
                    </td>
                    <td className="py-4">
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-xs ${getScoreCircleColor(item.compliance_score)}`}>
                        {Math.round(item.compliance_score)}
                      </div>
                    </td>
                    <td className="py-4">
                      <span className={item.compliance_score >= 80 ? "text-[#10B981] font-bold" : "text-[#EF4444] font-bold"}>
                        {item.compliance_score >= 80 ? "PASS" : "FAIL"}
                      </span>
                    </td>
                    <td className="py-4">
                      <span className={item.compliance_score >= 70 ? "text-[#10B981] font-bold" : "text-[#EF4444] font-bold"}>
                        {item.compliance_score >= 70 ? "PASS" : "FAIL"}
                      </span>
                    </td>
                    <td className="py-4">
                      <span className={item.compliance_score >= 75 ? "text-[#10B981] font-bold" : "text-[#EF4444] font-bold"}>
                        {item.compliance_score >= 75 ? "PASS" : "FAIL"}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.critical_issues > 0 && (
                          <span className="px-2 py-0.5 bg-[#EF4444]/10 text-[#EF4444] rounded border border-[#EF4444]/20 text-[10px] font-bold">
                            {item.critical_issues} Critical
                          </span>
                        )}
                        {item.warning_issues > 0 && (
                          <span className="px-2 py-0.5 bg-[#F59E0B]/10 text-[#F59E0B] rounded border border-[#F59E0B]/20 text-[10px] font-semibold">
                            {item.warning_issues} Warning
                          </span>
                        )}
                        {(!item.critical_issues && !item.warning_issues) && (
                          <span className="px-2 py-0.5 bg-[#10B981]/10 text-[#10B981] rounded border border-[#10B981]/20 text-[10px] font-bold">
                            Compliant
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 text-right">
                      <button
                        onClick={() => {
                          onSelectDevice(item.device_id);
                          onNavigate('ingestion');
                        }}
                        className="px-3 py-1.5 bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-lg font-mono text-xs transition-colors cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2 text-[#64748B]">
                      <Cpu className="w-8 h-8 text-[#94A3B8]" />
                      <div className="font-semibold text-sm text-[#0F172A]">No Hardware Assets Detected Yet</div>
                      <p className="text-xs max-w-sm">
                        Paste or upload a network configuration in the Ingestion tab to run continuous security compliance auditing.
                      </p>
                      <button
                        onClick={() => onNavigate('ingestion')}
                        className="mt-2 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold font-mono flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Go to Ingestion</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
