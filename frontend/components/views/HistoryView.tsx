import React, { useState, useEffect } from 'react';
import {
  History,
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  ArrowRight,
  RotateCcw,
  Download,
  Trash2,
  Calendar,
  Layers,
  Server,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { NavTab } from '../layout/Sidebar';

export interface AuditHistoryRecord {
  id: string;
  timestamp: string;
  formatted_date: string;
  source_name: string;
  vendor: string;
  hardware: string;
  os_platform?: string;
  device_type?: string;
  hostname?: string;
  compliance_score: number;
  passed_count: number;
  violations_count: number;
  total_controls: number;
  status: 'PASS' | 'NEEDS_ATTENTION' | 'CRITICAL';
  frameworks?: string[];
  critical_violations?: string[];
  lines_count?: number;
  file_size_kb?: number;
  raw_config?: string;
}

interface HistoryPageProps {
  onNavigate: (tab: NavTab) => void;
  onLoadConfig?: (cfg: string, label?: string) => void;
}

const DUMMY_AUDIT_HISTORY: AuditHistoryRecord[] = [
  {
    id: 'audit-cisco-01',
    timestamp: '2026-09-25T09:30:00Z',
    formatted_date: 'Today, 09:30 AM',
    source_name: 'cisco_ios_router.cfg',
    vendor: 'Cisco Systems',
    hardware: 'ISR 4451 Router',
    os_platform: 'Cisco IOS-XE 16.09.04',
    device_type: 'router',
    hostname: 'RTR-NYC-CORE-01',
    compliance_score: 67,
    passed_count: 6,
    violations_count: 3,
    total_controls: 9,
    status: 'NEEDS_ATTENTION',
    frameworks: ['NIST SP 800-53', 'CIS Benchmarks', 'CERT-In'],
    critical_violations: ['CIS-CSC-16.1 (Weak Password)', 'NIST-AC-17 (Telnet Cleartext)'],
    lines_count: 205,
    file_size_kb: 6.8,
    raw_config: `! Cisco IOS-XE Core Router
hostname RTR-NYC-CORE-01
version 16.9
service password-encryption
service timestamps debug datetime msec
service timestamps log datetime msec
enable secret 5 $1$mER7$vX3Y80x1g0f7
enable password 7 0822455D0A16
ip domain-name enterprise.local
ip ssh version 2
interface GigabitEthernet0/0/0
 ip address 10.0.1.1 255.255.255.0
 no shutdown
snmp-server community public RO
line vty 0 4
 transport input telnet ssh
 exec-timeout 15 0
`,
  },
  {
    id: 'audit-juniper-01',
    timestamp: '2026-09-25T08:15:00Z',
    formatted_date: 'Today, 08:15 AM',
    source_name: 'juniper_junos_srx.conf',
    vendor: 'Juniper Networks',
    hardware: 'SRX340 Security Gateway',
    os_platform: 'Junos OS 21.4R1',
    device_type: 'firewall',
    hostname: 'SRX-SFO-EDGE-01',
    compliance_score: 78,
    passed_count: 7,
    violations_count: 2,
    total_controls: 9,
    status: 'PASS',
    frameworks: ['NIST SP 800-53', 'CIS Benchmarks'],
    critical_violations: ['CIS-JUNOS-2.3 (Telnet Enabled)'],
    lines_count: 184,
    file_size_kb: 5.9,
    raw_config: `version 21.4R1;
system {
    host-name SRX-SFO-EDGE-01;
    services {
        ssh {
            protocol-version v2;
        }
        telnet;
    }
    syslog {
        host 10.0.1.50 {
            any notice;
        }
    }
}
interfaces {
    ge-0/0/0 {
        unit 0 {
            family inet {
                address 172.16.0.1/24;
            }
        }
    }
}
snmp {
    community public {
        authorization read-only;
    }
}
`,
  },
  {
    id: 'audit-paloalto-01',
    timestamp: '2026-09-24T16:45:00Z',
    formatted_date: 'Yesterday, 04:45 PM',
    source_name: 'paloalto_panos_firewall.cfg',
    vendor: 'Palo Alto Networks',
    hardware: 'PA-3220 NGFW',
    os_platform: 'PAN-OS 10.2.3',
    device_type: 'firewall',
    hostname: 'FW-DC1-PERIMETER-01',
    compliance_score: 70,
    passed_count: 7,
    violations_count: 3,
    total_controls: 10,
    status: 'NEEDS_ATTENTION',
    frameworks: ['NIST SP 800-53', 'DISA STIG', 'CERT-In'],
    critical_violations: ['PAN-SEC-01 (Insecure SNMP Community)', 'PAN-TEL-01 (Telnet Allowed)'],
    lines_count: 218,
    file_size_kb: 7.4,
    raw_config: `set deviceconfig system hostname FW-DC1-PERIMETER-01
set deviceconfig system os-version 10.2.4
set deviceconfig system idle-timeout 15
set deviceconfig system service disable-telnet no
set deviceconfig system service disable-http yes
set shared log-settings syslog SYSLOG-RECEIVER server 192.168.1.50
set network interface ethernet ethernet1/1 layer3 ip 192.168.1.1/24
`,
  },
  {
    id: 'audit-fortinet-01',
    timestamp: '2026-09-24T11:20:00Z',
    formatted_date: 'Yesterday, 11:20 AM',
    source_name: 'fortinet_fortigate_firewall.conf',
    vendor: 'Fortinet',
    hardware: 'FortiGate-100F',
    os_platform: 'FortiOS 7.2.4',
    device_type: 'firewall',
    hostname: 'FGT-BRANCH-LON-01',
    compliance_score: 78,
    passed_count: 7,
    violations_count: 2,
    total_controls: 9,
    status: 'PASS',
    frameworks: ['NIST SP 800-53', 'CIS Benchmarks'],
    critical_violations: ['FOS-ADM-02 (Telnet Management Enabled)'],
    lines_count: 162,
    file_size_kb: 5.1,
    raw_config: `config system global
    set hostname "FGT-BRANCH-LON-01"
    set admintimeout 10
    set admin-https-redirect enable
end
config system interface
    edit "port1"
        set ip 10.10.1.1 255.255.255.0
        set allowaccess ping https ssh telnet
    next
end
config log syslogd setting
    set status enable
    set server "10.10.1.50"
end
`,
  },
  {
    id: 'audit-multi-01',
    timestamp: '2026-09-23T14:10:00Z',
    formatted_date: '2 days ago',
    source_name: 'campus_core_bundle.cfg (4 Devices)',
    vendor: 'Multi-Vendor',
    hardware: 'Fleet Aggregation (Cisco, Juniper, Palo Alto)',
    os_platform: 'Heterogeneous Fleet',
    device_type: 'fleet',
    hostname: 'CAMPUS-CORE-FLEET',
    compliance_score: 74,
    passed_count: 27,
    violations_count: 10,
    total_controls: 37,
    status: 'PASS',
    frameworks: ['NIST SP 800-53', 'CIS Benchmarks', 'DISA STIG', 'CERT-In'],
    critical_violations: ['SNMP Cleartext', 'Telnet Allowed on 2 Nodes'],
    lines_count: 769,
    file_size_kb: 25.2,
  },
];

export const HistoryPage: React.FC<HistoryPageProps> = ({
  onNavigate,
  onLoadConfig,
}) => {
  const [history, setHistory] = useState<AuditHistoryRecord[]>(DUMMY_AUDIT_HISTORY);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [vendorFilter, setVendorFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedRecord, setSelectedRecord] = useState<AuditHistoryRecord | null>(null);

  const fetchHistory = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/audit/history');
      if (res.ok) {
        const data = await res.json();
        if (data.history && Array.isArray(data.history) && data.history.length > 0) {
          setHistory(data.history);
          return;
        }
      }
      setHistory(DUMMY_AUDIT_HISTORY);
    } catch {
      setHistory(DUMMY_AUDIT_HISTORY);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleClearHistory = async () => {
    if (!window.confirm('Are you sure you want to clear audit history?')) return;
    try {
      await fetch('http://localhost:8000/api/v1/audit/history', { method: 'DELETE' });
      setHistory([]);
    } catch {
      setHistory([]);
    }
  };

  const handleLoadRecord = (record: AuditHistoryRecord) => {
    if (onLoadConfig && record.raw_config) {
      onLoadConfig(record.raw_config, record.source_name);
      onNavigate('ingestion');
    } else {
      onNavigate('ingestion');
    }
  };

  // Filter logic
  const filteredHistory = history.filter((item) => {
    const matchesSearch =
      item.source_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.hostname && item.hostname.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.hardware && item.hardware.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesVendor =
      vendorFilter === 'ALL' || item.vendor.toLowerCase().includes(vendorFilter.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'PASS' && item.compliance_score >= 80) ||
      (statusFilter === 'NEEDS_ATTENTION' && item.compliance_score < 80);

    return matchesSearch && matchesVendor && matchesStatus;
  });

  // Calculate summary metrics
  const totalAudits = history.length;
  const avgScore =
    totalAudits > 0
      ? Math.round(history.reduce((acc, h) => acc + h.compliance_score, 0) / totalAudits)
      : 0;
  const totalViolations = history.reduce((acc, h) => acc + (h.violations_count || 0), 0);
  const uniqueVendors = Array.from(new Set(history.map((h) => h.vendor))).filter(Boolean);

  const getVendorBadgeColor = (vendorStr: string) => {
    const v = vendorStr.toLowerCase();
    if (v.includes('cisco')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (v.includes('juniper')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (v.includes('palo')) return 'bg-orange-50 text-orange-700 border-orange-200';
    if (v.includes('forti')) return 'bg-purple-50 text-purple-700 border-purple-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const handleDownloadPdf = async (item: AuditHistoryRecord) => {
    try {
      const res = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_config: item.raw_config || '',
          compliance_score: item.compliance_score,
          device_metadata: {
            hostname: item.hostname,
            vendor: item.vendor,
          },
          download: true,
        }),
      });
      if (!res.ok) throw new Error('PDF export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance_audit_${item.vendor.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${(item.hostname || 'node').toLowerCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error('PDF export error:', e);
      alert('Unable to generate PDF report for this record.');
    }
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-12 select-none">
      
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center">
              <History className="w-4 h-4 text-orange-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight font-heading">
              Audit History & Evaluation Logs
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Historical record of evaluated configurations, identified vendors, compliance scores, and security findings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchHistory}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium shadow-2xs transition-colors cursor-pointer"
            title="Refresh history"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Refresh</span>
          </button>

          {history.length > 0 && (
            <button
              type="button"
              onClick={handleClearHistory}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 text-rose-600 text-xs font-medium shadow-2xs transition-colors cursor-pointer"
              title="Clear all history records"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Log</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onNavigate('ingestion')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <span>Run New Audit</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block font-mono">
            Total Audits
          </span>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">{totalAudits}</div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Stored historical runs</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block font-mono">
            Avg Compliance Score
          </span>
          <div className={`text-2xl font-bold mt-1 font-mono ${avgScore >= 80 ? 'text-emerald-600' : 'text-orange-600'}`}>
            {avgScore}%
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Fleet average baseline</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block font-mono">
            Vendors Evaluated
          </span>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">{uniqueVendors.length}</div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Cisco, Juniper, PAN, Forti</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block font-mono">
            Identified Violations
          </span>
          <div className="text-2xl font-bold text-rose-600 mt-1 font-mono">{totalViolations}</div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Total non-compliant checks</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by configuration file, vendor, hostname, or model..."
            className="w-full pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 bg-slate-50 focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 transition-colors"
          />
        </div>

        {/* Vendor Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Vendor:</span>
          <select
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-slate-400"
          >
            <option value="ALL">All Vendors</option>
            <option value="cisco">Cisco Systems</option>
            <option value="juniper">Juniper Networks</option>
            <option value="palo">Palo Alto Networks</option>
            <option value="forti">Fortinet</option>
            <option value="multi">Multi-Vendor Fleet</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-slate-400"
          >
            <option value="ALL">All Scores</option>
            <option value="PASS">Pass (≥80%)</option>
            <option value="NEEDS_ATTENTION">Needs Attention (&lt;80%)</option>
          </select>
        </div>
      </div>

      {/* History Records Table / Cards */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        {filteredHistory.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <History className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800 font-heading">No Audit Records Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery || vendorFilter !== 'ALL' || statusFilter !== 'ALL'
                ? 'No past audit runs matched your current search filters.'
                : 'Upload or evaluate a network configuration to generate your first compliance audit history record.'}
            </p>
            <button
              type="button"
              onClick={() => onNavigate('ingestion')}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <span>Go to Ingestion & Audit</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredHistory.map((item) => {
              const isPass = item.compliance_score >= 80;
              return (
                <div
                  key={item.id}
                  className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Left: Source, Vendor, Hardware & Hostname */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      isPass ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'
                    }`}>
                      {isPass ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm font-mono truncate">
                          {item.source_name}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase font-mono ${getVendorBadgeColor(item.vendor)}`}>
                          {item.vendor}
                        </span>
                        {item.hostname && (
                          <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {item.hostname}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono">
                        <span className="text-slate-700 font-semibold">{item.hardware}</span>
                        {item.lines_count && (
                          <>
                            <span>&bull;</span>
                            <span>{item.lines_count} lines</span>
                          </>
                        )}
                        {item.file_size_kb && (
                          <>
                            <span>&bull;</span>
                            <span>{item.file_size_kb} KB</span>
                          </>
                        )}
                        <span>&bull;</span>
                        <span className="text-slate-400">{item.formatted_date}</span>
                      </div>

                      {item.critical_violations && item.critical_violations.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] font-mono">
                          <span className="text-slate-400">Findings:</span>
                          {item.critical_violations.map((v, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-medium"
                            >
                              {v}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Compliance Score & Load Action */}
                  <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <div className="text-left md:text-right font-mono">
                      <div className="flex items-center gap-2 md:justify-end">
                        <span className={`text-base font-bold px-2 py-0.5 rounded border ${
                          isPass
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {item.compliance_score}%
                        </span>
                        <span className="text-xs text-slate-400">Compliance</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        <span className="text-emerald-600 font-semibold">{item.passed_count} Passed</span>
                        <span className="mx-1 text-slate-300">&bull;</span>
                        <span className="text-rose-600 font-semibold">{item.violations_count} Violations</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDownloadPdf(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                        title="Download official PDF report for this past audit"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-500" />
                        <span>PDF</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLoadRecord(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                        title="Load configuration into Ingestion & Audit console"
                      >
                        <span>Re-Audit</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
