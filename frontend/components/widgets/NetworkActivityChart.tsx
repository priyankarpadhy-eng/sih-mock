import React, { useState } from 'react';
import { BarChart3, AlertTriangle, ShieldCheck, ShieldAlert, Cpu, Server, Layers } from 'lucide-react';

interface ComplianceGroup {
  id: string;
  name: string;
  subtitle: string;
  hardware: string;
  vendor: string;
  deviceType: string;
  score: number;
  critical: number;
  warnings: number;
  passed: number;
  totalControls: number;
  keyIssues: string[];
}

interface NetworkActivityChartProps {
  auditResult?: any;
  assets?: any[];
}

const DEFAULT_VENDOR_DATA: ComplianceGroup[] = [
  {
    id: 'cisco',
    name: 'Cisco Systems',
    subtitle: 'IOS-XE 16.09.04',
    hardware: 'ISR 4451 Router',
    vendor: 'Cisco Systems',
    deviceType: 'Core Router',
    score: 67,
    critical: 2,
    warnings: 1,
    passed: 6,
    totalControls: 9,
    keyIssues: ['CIS-CSC-16.1 (Weak Password)', 'NIST-AC-17 (Telnet Cleartext)', 'Logging Buffer Overflow'],
  },
  {
    id: 'paloalto',
    name: 'Palo Alto Networks',
    subtitle: 'PAN-OS 10.2.3',
    hardware: 'PA-3220 NGFW',
    vendor: 'Palo Alto Networks',
    deviceType: 'Next-Gen Firewall',
    score: 70,
    critical: 2,
    warnings: 1,
    passed: 7,
    totalControls: 10,
    keyIssues: ['PAN-TEL-01 (Telnet Allowed)', 'PAN-SEC-01 (Insecure SNMP Community)', 'Insecure DNS Fallback'],
  },
  {
    id: 'juniper',
    name: 'Juniper Networks',
    subtitle: 'Junos OS 21.4R1',
    hardware: 'SRX340 Security Gateway',
    vendor: 'Juniper Networks',
    deviceType: 'Security Gateway',
    score: 78,
    critical: 1,
    warnings: 1,
    passed: 7,
    totalControls: 9,
    keyIssues: ['CIS-JUNOS-2.3 (Telnet Management)', 'NTP Peer Authentication Missing'],
  },
  {
    id: 'fortinet',
    name: 'Fortinet',
    subtitle: 'FortiOS 7.2.4',
    hardware: 'FortiGate-100F',
    vendor: 'Fortinet',
    deviceType: 'Perimeter Firewall',
    score: 78,
    critical: 1,
    warnings: 1,
    passed: 7,
    totalControls: 9,
    keyIssues: ['FOS-ADM-02 (Telnet Management)', 'Admin Web Idle Timeout > 10m'],
  },
];

const DEFAULT_HARDWARE_DATA: ComplianceGroup[] = [
  {
    id: 'hw-isr4451',
    name: 'ISR 4451 Core Router',
    subtitle: 'Cisco Systems &bull; 10.0.1.1',
    hardware: 'ISR 4451',
    vendor: 'Cisco Systems',
    deviceType: 'Router',
    score: 67,
    critical: 2,
    warnings: 1,
    passed: 6,
    totalControls: 9,
    keyIssues: ['CIS-CSC-16.1 (Weak Password)', 'NIST-AC-17 (Telnet Cleartext)'],
  },
  {
    id: 'hw-pa3220',
    name: 'PA-3220 Next-Gen Firewall',
    subtitle: 'Palo Alto Networks &bull; 192.168.1.1',
    hardware: 'PA-3220',
    vendor: 'Palo Alto Networks',
    deviceType: 'Firewall',
    score: 70,
    critical: 2,
    warnings: 1,
    passed: 7,
    totalControls: 10,
    keyIssues: ['PAN-TEL-01 (Telnet Allowed)', 'PAN-SEC-01 (Insecure SNMP)'],
  },
  {
    id: 'hw-srx340',
    name: 'SRX340 Security Gateway',
    subtitle: 'Juniper Networks &bull; 172.16.0.1',
    hardware: 'SRX340',
    vendor: 'Juniper Networks',
    deviceType: 'Gateway',
    score: 78,
    critical: 1,
    warnings: 1,
    passed: 7,
    totalControls: 9,
    keyIssues: ['CIS-JUNOS-2.3 (Telnet Enabled)'],
  },
  {
    id: 'hw-fgt100f',
    name: 'FortiGate-100F Perimeter',
    subtitle: 'Fortinet &bull; 10.10.1.1',
    hardware: 'FortiGate-100F',
    vendor: 'Fortinet',
    deviceType: 'Firewall',
    score: 78,
    critical: 1,
    warnings: 1,
    passed: 7,
    totalControls: 9,
    keyIssues: ['FOS-ADM-02 (Telnet Allowed)'],
  },
];

export const NetworkActivityChart: React.FC<NetworkActivityChartProps> = ({ auditResult, assets }) => {
  const [viewMode, setViewMode] = useState<'vendor' | 'hardware'>('vendor');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // If live audit result is available and vendor matches, we can enrich data
  const data = viewMode === 'vendor' ? DEFAULT_VENDOR_DATA : DEFAULT_HARDWARE_DATA;

  const totalCritical = data.reduce((acc, d) => acc + d.critical, 0);
  const totalWarnings = data.reduce((acc, d) => acc + d.warnings, 0);
  const totalIssues = totalCritical + totalWarnings;
  const totalPassed = data.reduce((acc, d) => acc + d.passed, 0);
  const avgScore = Math.round(data.reduce((acc, d) => acc + d.score, 0) / data.length);

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-6">
      
      {/* Top Header & Grouping Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F1F5F9] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0F172A] tracking-tight">
                {viewMode === 'vendor' ? 'Vendor-Wise Compliance Issues' : 'Hardware Appliance Compliance Issues'}
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Distribution of critical violations, security warnings, and compliant controls across detected network assets.
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-[#F1F5F9] p-1 rounded-xl text-xs font-mono self-start sm:self-auto border border-[#E2E8F0]">
          <button
            onClick={() => { setViewMode('vendor'); setSelectedGroupId(null); }}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'vendor'
                ? 'bg-white text-[#0F172A] shadow-xs'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>By Vendor</span>
          </button>
          <button
            onClick={() => { setViewMode('hardware'); setSelectedGroupId(null); }}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'hardware'
                ? 'bg-white text-[#0F172A] shadow-xs'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>By Hardware</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        <div className="p-3 bg-[#FEF2F2] border border-[#FEE2E2] rounded-xl space-y-1">
          <div className="text-[10px] text-[#991B1B] font-bold uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Critical Issues</span>
          </div>
          <div className="text-2xl font-bold text-[#991B1B]">{totalCritical}</div>
          <div className="text-[11px] text-[#B91C1C]">Immediate remediation required</div>
        </div>

        <div className="p-3 bg-[#FFFBEB] border border-[#FEF3C7] rounded-xl space-y-1">
          <div className="text-[10px] text-[#92400E] font-bold uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Warnings Found</span>
          </div>
          <div className="text-2xl font-bold text-[#92400E]">{totalWarnings}</div>
          <div className="text-[11px] text-[#B45309]">Configuration deviations</div>
        </div>

        <div className="p-3 bg-[#F0FDF4] border border-[#DCFCE7] rounded-xl space-y-1">
          <div className="text-[10px] text-[#166534] font-bold uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Compliant Controls</span>
          </div>
          <div className="text-2xl font-bold text-[#166534]">{totalPassed}</div>
          <div className="text-[11px] text-[#15803D]">Passed baseline controls</div>
        </div>

        <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-1">
          <div className="text-[10px] text-[#334155] font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5" />
            <span>Fleet Avg Score</span>
          </div>
          <div className="text-2xl font-bold text-[#0F172A]">{avgScore}%</div>
          <div className="text-[11px] text-[#64748B]">NIST &bull; CIS &bull; STIG</div>
        </div>
      </div>

      {/* Stacked Comparative Bars List */}
      <div className="space-y-4 pt-1">
        {data.map((item) => {
          const total = item.totalControls;
          const critPct = (item.critical / total) * 100;
          const warnPct = (item.warnings / total) * 100;
          const passPct = (item.passed / total) * 100;
          const isSelected = selectedGroupId === item.id;

          return (
            <div
              key={item.id}
              onClick={() => setSelectedGroupId(isSelected ? null : item.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'border-orange-400 bg-orange-50/20 shadow-xs ring-1 ring-orange-300'
                  : 'border-[#E2E8F0] hover:border-slate-300 hover:bg-[#F8FAFC]'
              }`}
            >
              {/* Row Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold font-mono text-xs">
                    {item.vendor[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#0F172A]">{item.name}</span>
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {item.hardware}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#64748B] font-mono mt-0.5" dangerouslySetInnerHTML={{ __html: item.subtitle }} />
                  </div>
                </div>

                <div className="flex items-center gap-3 font-mono text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#991B1B] font-bold">{item.critical} Critical</span>
                    <span className="text-[#94A3B8]">&bull;</span>
                    <span className="text-[#B45309] font-semibold">{item.warnings} Warning</span>
                  </div>

                  <div className={`px-2.5 py-1 rounded-lg font-bold text-xs border ${
                    item.score >= 80 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : item.score >= 70 
                        ? 'bg-amber-50 text-amber-700 border-amber-200' 
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    {item.score}% Score
                  </div>
                </div>
              </div>

              {/* Stacked Progress Bar */}
              <div className="h-3 w-full bg-[#E2E8F0] rounded-full overflow-hidden flex shadow-inner">
                {item.critical > 0 && (
                  <div
                    style={{ width: `${critPct}%` }}
                    className="bg-[#EF4444] h-full transition-all"
                    title={`Critical Issues: ${item.critical}`}
                  />
                )}
                {item.warnings > 0 && (
                  <div
                    style={{ width: `${warnPct}%` }}
                    className="bg-[#F59E0B] h-full transition-all"
                    title={`Warnings: ${item.warnings}`}
                  />
                )}
                {item.passed > 0 && (
                  <div
                    style={{ width: `${passPct}%` }}
                    className="bg-[#10B981] h-full transition-all"
                    title={`Passed Controls: ${item.passed}`}
                  />
                )}
              </div>

              {/* Key Issues Tags */}
              <div className="mt-3 flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-slate-100 text-[11px] font-mono">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-slate-400 font-semibold text-[10px] uppercase">Issues:</span>
                  {item.keyIssues.map((issue, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
                    >
                      {issue}
                    </span>
                  ))}
                </div>
                <div className="text-slate-400 text-[10px]">
                  {item.passed} / {item.totalControls} Controls Passed
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#F1F5F9] text-xs font-mono text-[#64748B]">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]"></span>
            <span>Critical Severity (FAIL)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]"></span>
            <span>Medium / Warning</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></span>
            <span>Compliant Baseline (PASS)</span>
          </div>
        </div>
        <div className="text-[11px] text-slate-400">
          Click any vendor or hardware to view breakdown
        </div>
      </div>

    </div>
  );
};
