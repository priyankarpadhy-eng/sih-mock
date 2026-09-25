import React, { useState } from 'react';
import { BarChart3, AlertCircle, ShieldCheck, ShieldAlert, Cpu, Layers, AlertTriangle } from 'lucide-react';

interface ChartItem {
  id: string;
  name: string;
  subLabel: string;
  hardware: string;
  vendor: string;
  critical: number;
  warnings: number;
  passed: number;
  score: number;
  topIssue: string;
}

const VENDOR_CHART_DATA: ChartItem[] = [
  {
    id: 'cisco',
    name: 'Cisco',
    subLabel: 'IOS-XE',
    hardware: 'ISR 4451 Router',
    vendor: 'Cisco Systems',
    critical: 2,
    warnings: 1,
    passed: 6,
    score: 67,
    topIssue: 'NIST-AC-17 (Telnet Cleartext)',
  },
  {
    id: 'paloalto',
    name: 'Palo Alto',
    subLabel: 'PAN-OS',
    hardware: 'PA-3220 NGFW',
    vendor: 'Palo Alto Networks',
    critical: 2,
    warnings: 1,
    passed: 7,
    score: 70,
    topIssue: 'PAN-TEL-01 (Insecure Telnet)',
  },
  {
    id: 'juniper',
    name: 'Juniper',
    subLabel: 'Junos OS',
    hardware: 'SRX340 Gateway',
    vendor: 'Juniper Networks',
    critical: 1,
    warnings: 1,
    passed: 7,
    score: 78,
    topIssue: 'CIS-JUNOS-2.3 (Telnet Enabled)',
  },
  {
    id: 'fortinet',
    name: 'Fortinet',
    subLabel: 'FortiOS',
    hardware: 'FortiGate-100F',
    vendor: 'Fortinet',
    critical: 1,
    warnings: 1,
    passed: 7,
    score: 78,
    topIssue: 'FOS-ADM-02 (Web Admin Timeout)',
  },
  {
    id: 'huawei',
    name: 'Huawei',
    subLabel: 'VRP OS',
    hardware: 'USG6000 NGFW',
    vendor: 'Huawei',
    critical: 3,
    warnings: 1,
    passed: 5,
    score: 55,
    topIssue: 'AAA Plaintext Authentication',
  },
  {
    id: 'sonic',
    name: 'SONiC',
    subLabel: 'Linux NOS',
    hardware: 'EdgeCore 7712',
    vendor: 'SONiC Foundation',
    critical: 1,
    warnings: 2,
    passed: 6,
    score: 66,
    topIssue: 'Default SNMP Community String',
  },
  {
    id: 'aws',
    name: 'AWS Cloud',
    subLabel: 'VPC SG',
    hardware: 'Cloud Security Group',
    vendor: 'Amazon Web Services',
    critical: 2,
    warnings: 0,
    passed: 8,
    score: 80,
    topIssue: '0.0.0.0/0 SSH Ingress Allowed',
  },
];

const HARDWARE_CHART_DATA: ChartItem[] = [
  {
    id: 'hw-isr4451',
    name: 'ISR 4451',
    subLabel: 'Cisco Router',
    hardware: 'ISR 4451',
    vendor: 'Cisco Systems',
    critical: 2,
    warnings: 1,
    passed: 6,
    score: 67,
    topIssue: 'CIS-CSC-16.1 (Weak Password)',
  },
  {
    id: 'hw-pa3220',
    name: 'PA-3220',
    subLabel: 'Palo Alto NGFW',
    hardware: 'PA-3220',
    vendor: 'Palo Alto Networks',
    critical: 2,
    warnings: 1,
    passed: 7,
    score: 70,
    topIssue: 'PAN-SEC-01 (Insecure SNMP)',
  },
  {
    id: 'hw-srx340',
    name: 'SRX340',
    subLabel: 'Juniper Gateway',
    hardware: 'SRX340',
    vendor: 'Juniper Networks',
    critical: 1,
    warnings: 1,
    passed: 7,
    score: 78,
    topIssue: 'CIS-JUNOS-2.3 (Telnet Enabled)',
  },
  {
    id: 'hw-fgt100f',
    name: 'FortiGate-100F',
    subLabel: 'Fortinet FW',
    hardware: 'FortiGate-100F',
    vendor: 'Fortinet',
    critical: 1,
    warnings: 1,
    passed: 7,
    score: 78,
    topIssue: 'FOS-ADM-02 (Telnet Management)',
  },
  {
    id: 'hw-cat9300',
    name: 'Catalyst 9300',
    subLabel: 'Cisco Switch',
    hardware: 'Catalyst 9300',
    vendor: 'Cisco Systems',
    critical: 1,
    warnings: 1,
    passed: 8,
    score: 80,
    topIssue: 'VLAN 1 Default Native VLAN',
  },
  {
    id: 'hw-usg6000',
    name: 'USG6000',
    subLabel: 'Huawei NGFW',
    hardware: 'USG6000',
    vendor: 'Huawei',
    critical: 3,
    warnings: 1,
    passed: 5,
    score: 55,
    topIssue: 'VRP Telnet Enabled on Gi0/0',
  },
  {
    id: 'hw-vpc',
    name: 'VPC Security Grp',
    subLabel: 'AWS Cloud',
    hardware: 'Cloud SG',
    vendor: 'AWS',
    critical: 2,
    warnings: 0,
    passed: 8,
    score: 80,
    topIssue: 'Unrestricted Ingress 0.0.0.0/0',
  },
];

interface NetworkActivityChartProps {
  auditResult?: any;
  assets?: any[];
}

export const NetworkActivityChart: React.FC<NetworkActivityChartProps> = ({ auditResult }) => {
  const [xAxisMode, setXAxisMode] = useState<'vendor' | 'hardware'>('vendor');
  const [metricMode, setMetricMode] = useState<'errors' | 'all'>('errors');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const activeData = xAxisMode === 'vendor' ? VENDOR_CHART_DATA : HARDWARE_CHART_DATA;

  // Y-axis configuration
  // When metricMode === 'errors', max error is ~5 -> Y ticks [6, 4, 2, 0]
  // When metricMode === 'all', max controls is ~10 -> Y ticks [10, 8, 6, 4, 2, 0]
  const maxY = metricMode === 'errors' ? 6 : 12;
  const yTicks = metricMode === 'errors' ? [6, 5, 4, 3, 2, 1, 0] : [12, 10, 8, 6, 4, 2, 0];

  const totalCritical = activeData.reduce((acc, d) => acc + d.critical, 0);
  const totalWarnings = activeData.reduce((acc, d) => acc + d.warnings, 0);
  const totalErrors = totalCritical + totalWarnings;
  const totalPassed = activeData.reduce((acc, d) => acc + d.passed, 0);

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-5">
      
      {/* Chart Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-orange-600" />
            <h2 className="text-base font-bold text-[#0F172A] tracking-tight">
              Compliance Errors by {xAxisMode === 'vendor' ? 'Vendor' : 'Hardware Appliance'}
            </h2>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Error frequency on Y-axis and detected {xAxisMode === 'vendor' ? 'vendors' : 'hardware models'} on X-axis.
          </p>
        </div>

        {/* Toggles & Legend */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* X-Axis Selector: Vendor vs Hardware */}
          <div className="flex items-center bg-[#F1F5F9] p-0.5 rounded-xl text-xs font-mono border border-[#E2E8F0]">
            <button
              onClick={() => setXAxisMode('vendor')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                xAxisMode === 'vendor' ? 'bg-white text-[#0F172A] shadow-xs' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Vendor X-Axis</span>
            </button>
            <button
              onClick={() => setXAxisMode('hardware')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                xAxisMode === 'hardware' ? 'bg-white text-[#0F172A] shadow-xs' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Hardware X-Axis</span>
            </button>
          </div>

          {/* Metric Selector: Errors Only vs All Controls */}
          <div className="flex items-center bg-[#F1F5F9] p-0.5 rounded-xl text-xs font-mono border border-[#E2E8F0]">
            <button
              onClick={() => setMetricMode('errors')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                metricMode === 'errors' ? 'bg-white text-[#0F172A] shadow-xs' : 'text-[#64748B]'
              }`}
            >
              Errors Only
            </button>
            <button
              onClick={() => setMetricMode('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                metricMode === 'all' ? 'bg-white text-[#0F172A] shadow-xs' : 'text-[#64748B]'
              }`}
            >
              All Controls
            </button>
          </div>

          {/* Legend Badges */}
          <div className="hidden sm:flex items-center gap-2.5 text-xs font-mono">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-[#FEF2F2] border border-[#FEE2E2] rounded-lg">
              <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]"></span>
              <span className="text-[#991B1B] font-semibold">Critical: {totalCritical}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-[#FFFBEB] border border-[#FEF3C7] rounded-lg">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]"></span>
              <span className="text-[#92400E] font-semibold">Warnings: {totalWarnings}</span>
            </div>
            {metricMode === 'all' && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-[#F0FDF4] border border-[#DCFCE7] rounded-lg">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></span>
                <span className="text-[#166534] font-semibold">Passed: {totalPassed}</span>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Main Chart Canvas with Y-Axis Guidelines & Stacked Vertical Bars */}
      <div className="pt-2">
        <div className="relative h-64 flex items-end">
          
          {/* Y-Axis Label */}
          <div className="absolute -left-2 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-mono font-bold text-[#94A3B8] tracking-wider pointer-events-none">
            {metricMode === 'errors' ? 'ERRORS (FAIL/WARN)' : 'TOTAL CONTROLS'}
          </div>

          {/* Y-Axis Guidelines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8 pl-8 sm:pl-10">
            {yTicks.map((tick, idx) => (
              <div key={idx} className="w-full flex items-center gap-2">
                <span className="text-[10px] font-mono text-[#94A3B8] w-4 text-right shrink-0">{tick}</span>
                <div className="w-full border-b border-dashed border-[#F1F5F9]" />
              </div>
            ))}
          </div>

          {/* Bars Container */}
          <div className="relative w-full h-full flex items-end justify-between gap-2 sm:gap-4 pl-12 sm:pl-14 pr-3 pb-8 z-10">
            {activeData.map((item, idx) => {
              const errorsCount = item.critical + item.warnings;
              const totalVal = metricMode === 'errors' ? errorsCount : (item.critical + item.warnings + item.passed);
              const barHeightPct = Math.min((totalVal / maxY) * 100, 100);

              const critRatio = totalVal > 0 ? (item.critical / totalVal) * 100 : 0;
              const warnRatio = totalVal > 0 ? (item.warnings / totalVal) * 100 : 0;
              const passRatio = totalVal > 0 && metricMode === 'all' ? (item.passed / totalVal) * 100 : 0;

              const isHovered = hoveredIdx === idx;

              return (
                <div
                  key={item.id}
                  className="flex-1 flex flex-col items-center justify-end h-full relative cursor-pointer group"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  {/* Floating Hover Tooltip Card */}
                  {isHovered && (
                    <div className="absolute -top-28 bg-[#0F172A] text-white text-[11px] font-mono py-2 px-3 rounded-xl shadow-2xl pointer-events-none z-30 whitespace-nowrap animate-in fade-in zoom-in-95 duration-150 border border-slate-700">
                      <div className="font-bold border-b border-slate-700 pb-1.5 mb-1.5 flex items-center justify-between gap-4">
                        <span className="text-white font-sans text-xs">{item.name}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          item.score >= 80 ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                          item.score >= 70 ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                          'bg-rose-950 text-rose-300 border border-rose-800'
                        }`}>
                          {item.score}% Score
                        </span>
                      </div>
                      
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between gap-4 text-[#F87171]">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#EF4444]"></span>
                            <span>Critical Errors:</span>
                          </span>
                          <span className="font-bold">{item.critical}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-[#FBBF24]">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#F59E0B]"></span>
                            <span>Warnings:</span>
                          </span>
                          <span className="font-bold">{item.warnings}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-[#34D399]">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
                            <span>Passed Controls:</span>
                          </span>
                          <span className="font-bold">{item.passed}</span>
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-300 pt-1.5 mt-1.5 border-t border-slate-800 flex items-center gap-1.5">
                        <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                        <span className="truncate max-w-[200px]">{item.topIssue}</span>
                      </div>
                    </div>
                  )}

                  {/* Concrete Stacked Vertical Bar with Distinct Colors */}
                  <div
                    style={{ height: `${Math.max(barHeightPct, 12)}%` }}
                    className={`w-full max-w-[38px] flex flex-col justify-end rounded-t-md overflow-hidden transition-all duration-200 shadow-sm ${
                      isHovered ? 'ring-2 ring-orange-500 scale-[1.06]' : 'hover:opacity-95'
                    }`}
                  >
                    {/* Top Segment: Critical Errors (Red) */}
                    {item.critical > 0 && (
                      <div
                        style={{ height: `${critRatio}%` }}
                        className="bg-[#EF4444] w-full min-h-[5px] transition-all"
                        title={`Critical Errors: ${item.critical}`}
                      />
                    )}
                    {/* Middle Segment: Warnings (Amber) */}
                    {item.warnings > 0 && (
                      <div
                        style={{ height: `${warnRatio}%` }}
                        className="bg-[#F59E0B] w-full min-h-[4px] transition-all"
                        title={`Warnings: ${item.warnings}`}
                      />
                    )}
                    {/* Bottom Segment: Passed / Compliant (Emerald) */}
                    {metricMode === 'all' && item.passed > 0 && (
                      <div
                        style={{ height: `${passRatio}%` }}
                        className="bg-[#10B981] w-full min-h-[8px] transition-all"
                        title={`Passed: ${item.passed}`}
                      />
                    )}
                  </div>

                </div>
              );
            })}
          </div>

        </div>

        {/* X-Axis Labels (Vendor / Hardware Names) */}
        <div className="flex justify-between pl-12 sm:pl-14 pr-3 pt-2 border-t border-[#E2E8F0] text-[11px] font-mono text-[#64748B]">
          {activeData.map((item, idx) => (
            <div key={idx} className="flex-1 text-center font-medium px-0.5">
              <div className="font-bold text-slate-800 text-[11px] truncate">{item.name}</div>
              <div className="text-[10px] text-slate-400 truncate">{item.subLabel}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Summary Sub-bar */}
      <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-600 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-slate-400">Total Fleet Errors:</span>
          <span className="font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
            {totalErrors} Compliance Errors
          </span>
          <span className="text-slate-400">&bull;</span>
          <span className="text-slate-500 font-sans">{totalCritical} Critical, {totalWarnings} Warnings</span>
        </div>
        <div className="text-[11px] text-slate-400">
          Hover over any bar to view line-level violation details
        </div>
      </div>

    </div>
  );
};
