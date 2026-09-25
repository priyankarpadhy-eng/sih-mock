import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Layers,
  CheckCircle2,
  History,
  ArrowRight,
  Clock,
  Server,
} from 'lucide-react';
import { NavTab } from '../layout/Sidebar';

export interface ReportsPageProps {
  rawConfig: string;
  hostname: string;
  vendor: string;
  complianceScore: number;
  onNavigate?: (tab: NavTab) => void;
}

export interface HistoricalAuditItem {
  id: string;
  timestamp: string;
  formatted_date: string;
  source_name: string;
  vendor: string;
  hardware: string;
  os_platform?: string;
  hostname?: string;
  compliance_score: number;
  passed_count: number;
  violations_count: number;
  total_controls?: number;
  critical_violations?: string[];
  raw_config?: string;
  filename: string;
}

const CISCO_SAMPLE_CFG = `! Cisco IOS-XE Core Router
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
`;

const JUNIPER_SAMPLE_CFG = `version 21.4R1;
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
`;

const PALOALTO_SAMPLE_CFG = `set deviceconfig system hostname FW-DC1-PERIMETER-01
set deviceconfig system os-version 10.2.4
set deviceconfig system idle-timeout 15
set deviceconfig system service disable-telnet no
set deviceconfig system service disable-http yes
set shared log-settings syslog SYSLOG-RECEIVER server 192.168.1.50
set network interface ethernet ethernet1/1 layer3 ip 192.168.1.1/24
`;

const FORTINET_SAMPLE_CFG = `config system global
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
`;

const DEFAULT_SEEDED_HISTORY: HistoricalAuditItem[] = [
  {
    id: 'audit-cisco-01',
    timestamp: '2026-09-25T09:30:00Z',
    formatted_date: 'Today, 09:30 AM',
    source_name: 'cisco_ios_router.cfg',
    vendor: 'Cisco Systems',
    hardware: 'ISR 4451 Router',
    os_platform: 'Cisco IOS-XE 16.09.04',
    hostname: 'RTR-NYC-CORE-01',
    compliance_score: 67,
    passed_count: 6,
    violations_count: 3,
    total_controls: 9,
    critical_violations: ['CIS-CSC-16.1 (Weak Password)', 'NIST-AC-17 (Telnet Cleartext)'],
    raw_config: CISCO_SAMPLE_CFG,
    filename: 'compliance_audit_cisco_isr4451.pdf',
  },
  {
    id: 'audit-juniper-01',
    timestamp: '2026-09-25T08:15:00Z',
    formatted_date: 'Today, 08:15 AM',
    source_name: 'juniper_junos_srx.conf',
    vendor: 'Juniper Networks',
    hardware: 'SRX340 Security Gateway',
    os_platform: 'Junos OS 21.4R1',
    hostname: 'SRX-SFO-EDGE-01',
    compliance_score: 78,
    passed_count: 7,
    violations_count: 2,
    total_controls: 9,
    critical_violations: ['CIS-JUNOS-2.3 (Telnet Enabled)'],
    raw_config: JUNIPER_SAMPLE_CFG,
    filename: 'compliance_audit_juniper_srx340.pdf',
  },
  {
    id: 'audit-paloalto-01',
    timestamp: '2026-09-24T16:45:00Z',
    formatted_date: 'Yesterday, 04:45 PM',
    source_name: 'paloalto_panos_firewall.cfg',
    vendor: 'Palo Alto Networks',
    hardware: 'PA-3220 NGFW',
    os_platform: 'PAN-OS 10.2.3',
    hostname: 'FW-DC1-PERIMETER-01',
    compliance_score: 70,
    passed_count: 7,
    violations_count: 3,
    total_controls: 10,
    critical_violations: ['PAN-SEC-01 (Insecure SNMP Community)', 'PAN-TEL-01 (Telnet Allowed)'],
    raw_config: PALOALTO_SAMPLE_CFG,
    filename: 'compliance_audit_paloalto_pa3220.pdf',
  },
  {
    id: 'audit-fortinet-01',
    timestamp: '2026-09-24T11:20:00Z',
    formatted_date: 'Yesterday, 11:20 AM',
    source_name: 'fortinet_fortigate_firewall.conf',
    vendor: 'Fortinet',
    hardware: 'FortiGate-100F',
    os_platform: 'FortiOS 7.2.4',
    hostname: 'FGT-BRANCH-LON-01',
    compliance_score: 78,
    passed_count: 7,
    violations_count: 2,
    total_controls: 9,
    critical_violations: ['FOS-ADM-02 (Telnet Management Enabled)'],
    raw_config: FORTINET_SAMPLE_CFG,
    filename: 'compliance_audit_fortinet_fgt100f.pdf',
  },
];

export const ReportsPage: React.FC<ReportsPageProps> = ({
  rawConfig,
  hostname,
  vendor,
  complianceScore,
  onNavigate,
}) => {
  // Mode selection: 'current' (live session) vs 'history' (previous runs)
  const [activeMode, setActiveMode] = useState<'current' | 'history'>(
    rawConfig && rawConfig.trim() ? 'current' : 'history'
  );

  const [historyItems, setHistoryItems] = useState<HistoricalAuditItem[]>(DEFAULT_SEEDED_HISTORY);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string>(DEFAULT_SEEDED_HISTORY[0].id);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [pdfKey, setPdfKey] = useState<number>(0);
  const [blobUrl, setBlobUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Fetch real audit history from backend
  useEffect(() => {
    const fetchBackendHistory = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/v1/audit/history');
        if (res.ok) {
          const data = await res.json();
          if (data.history && Array.isArray(data.history) && data.history.length > 0) {
            const mapped: HistoricalAuditItem[] = data.history.map((h: any) => ({
              id: h.id,
              timestamp: h.timestamp,
              formatted_date: h.formatted_date,
              source_name: h.source_name || `${h.vendor || 'device'}.cfg`,
              vendor: h.vendor || 'Unknown Vendor',
              hardware: h.hardware || 'Enterprise Hardware',
              os_platform: h.os_platform || '',
              hostname: h.hostname || 'NODE-01',
              compliance_score: h.compliance_score || 0,
              passed_count: h.passed_count || 0,
              violations_count: h.violations_count || 0,
              total_controls: h.total_controls || 9,
              critical_violations: h.critical_violations || [],
              raw_config: h.raw_config || '',
              filename: `compliance_audit_${(h.vendor || 'device').toLowerCase().replace(/[^a-z0-9]/g, '_')}_${(h.hostname || 'node').toLowerCase()}.pdf`,
            }));
            setHistoryItems(mapped);
            if (mapped.length > 0) {
              setSelectedHistoryId(mapped[0].id);
            }
          }
        }
      } catch {
        // use DEFAULT_SEEDED_HISTORY fallback
      }
    };
    fetchBackendHistory();
  }, []);

  // Determine current active item to preview and download
  const currentItem = React.useMemo(() => {
    if (activeMode === 'current' && rawConfig && rawConfig.trim()) {
      return {
        id: 'current_active',
        vendorName: vendor || 'Current Ingested Device',
        deviceModel: 'Live Parsed Configuration',
        osVersion: 'Universal Canonical Baseline',
        hostname: hostname || 'TAC-INGESTED-NODE',
        complianceScore: complianceScore || 75,
        passedCount: Math.round((complianceScore || 75) * 0.08),
        violationsCount: Math.max(1, 10 - Math.round((complianceScore || 75) * 0.08)),
        filename: `compliance_audit_current_${(vendor || 'live').toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`,
        configText: rawConfig,
      };
    }

    // Otherwise history mode (or fallback if no current rawConfig)
    const hist = historyItems.find((h) => h.id === selectedHistoryId) || historyItems[0] || DEFAULT_SEEDED_HISTORY[0];
    return {
      id: hist.id,
      vendorName: hist.vendor,
      deviceModel: hist.hardware,
      osVersion: hist.os_platform || 'Universal Data Model',
      hostname: hist.hostname || 'NODE-01',
      complianceScore: hist.compliance_score,
      passedCount: hist.passed_count,
      violationsCount: hist.violations_count,
      filename: hist.filename,
      configText: hist.raw_config || CISCO_SAMPLE_CFG,
    };
  }, [activeMode, rawConfig, hostname, vendor, complianceScore, historyItems, selectedHistoryId]);

  // Generate PDF preview blob whenever current item or pdfKey changes
  useEffect(() => {
    let isMounted = true;
    let localUrl = '';

    const loadPdf = async () => {
      setIsGenerating(true);
      try {
        const res = await fetch('/api/export-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            raw_config: currentItem.configText,
            compliance_score: currentItem.complianceScore,
            device_metadata: {
              hostname: currentItem.hostname,
              vendor: currentItem.vendorName,
            },
            download: false,
          }),
        });
        if (res.ok && isMounted) {
          const blob = await res.blob();
          localUrl = window.URL.createObjectURL(blob);
          setBlobUrl(localUrl);
        }
      } catch (err) {
        console.error('PDF preview generation error:', err);
      } finally {
        if (isMounted) setIsGenerating(false);
      }
    };

    loadPdf();

    return () => {
      isMounted = false;
      if (localUrl) window.URL.revokeObjectURL(localUrl);
    };
  }, [currentItem, pdfKey]);

  // PDF Download action
  const handleDownloadReport = async (itemToDownload: typeof currentItem) => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_config: itemToDownload.configText,
          compliance_score: itemToDownload.complianceScore,
          device_metadata: {
            hostname: itemToDownload.hostname,
            vendor: itemToDownload.vendorName,
          },
          download: true,
        }),
      });

      if (!response.ok) throw new Error('PDF export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = itemToDownload.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('Download error:', err);
      alert('Could not export PDF report. Please check server connectivity.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenNewTab = () => {
    if (blobUrl) {
      window.open(blobUrl, '_blank');
    }
  };

  const hasCurrentConfig = Boolean(rawConfig && rawConfig.trim());

  return (
    <div className="space-y-6 max-w-[1280px] mx-auto pb-12 select-none">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-heading">
            Executive Compliance Audit Reports
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-mono">
            Export and verify defense-grade compliance audit reports (NIST SP 800-53 &bull; CIS Benchmarks &bull; CERT-In)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPdfKey((prev) => prev + 1)}
            className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-mono text-xs font-semibold rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
            title="Refresh PDF Preview"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleOpenNewTab}
            disabled={!blobUrl}
            className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-mono text-xs font-semibold rounded-xl shadow-2xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            title="Open PDF in new browser tab"
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
            <span>Open Tab</span>
          </button>
          <button
            onClick={() => handleDownloadReport(currentItem)}
            disabled={isExporting}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-mono text-xs font-semibold rounded-xl shadow-2xs transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            title="Download executive PDF deliverable"
          >
            <Download className="w-4 h-4 text-white" />
            <span>{isExporting ? 'Generating...' : `Export PDF (${currentItem.vendorName.split(' ')[0]})`}</span>
          </button>
        </div>
      </div>

      {/* Choice Selector: Current Ingestion Audit vs Previous Audits from History */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200 p-2.5 rounded-2xl">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 font-heading pl-1">Export Source:</span>
          <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveMode('current')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeMode === 'current'
                  ? 'bg-orange-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <ShieldCheck className={`w-3.5 h-3.5 ${activeMode === 'current' ? 'text-white' : 'text-orange-600'}`} />
              <span>Current Ingestion Check</span>
              {hasCurrentConfig && (
                <span className={`w-2 h-2 rounded-full ${activeMode === 'current' ? 'bg-white' : 'bg-emerald-500 animate-pulse'}`} />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveMode('history')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeMode === 'history'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <History className={`w-3.5 h-3.5 ${activeMode === 'history' ? 'text-white' : 'text-slate-500'}`} />
              <span>Previous Audits from History</span>
              <span className={`px-1.5 py-0.2 text-[10px] font-mono rounded ${
                activeMode === 'history' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700'
              }`}>
                {historyItems.length}
              </span>
            </button>
          </div>
        </div>

        <div className="text-[11px] font-mono text-slate-500 px-1">
          {activeMode === 'current' ? (
            hasCurrentConfig ? (
              <span className="text-emerald-700 font-medium">Live Ingestion Active &bull; {vendor || 'Detected Vendor'}</span>
            ) : (
              <span className="text-slate-500">No active scan in buffer &bull; Showing demo fallback</span>
            )
          ) : (
            <span>Select any previous audit from the history archive below</span>
          )}
        </div>
      </div>

      {/* Mode Content: Current Check View */}
      {activeMode === 'current' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-orange-600" />
              <h2 className="text-sm font-bold text-slate-900 font-heading">
                Active Ingestion Compliance Audit Report
              </h2>
            </div>
            {hasCurrentConfig ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Live Ingestion Session
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-amber-50 text-amber-700 border border-amber-200">
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                No Custom Config Ingested Yet
              </span>
            )}
          </div>

          {hasCurrentConfig ? (
            <div className="p-4 rounded-xl border border-orange-200 bg-orange-50/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono px-2 py-0.5 rounded uppercase tracking-wider bg-orange-100 text-orange-800 border border-orange-200">
                    {vendor || 'Canonical Vendor'}
                  </span>
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                    complianceScore >= 70
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    {complianceScore}% Compliance
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-900 font-heading">
                  Node: {hostname || 'TAC-INGESTED-NODE'}
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  Frameworks: NIST SP 800-53 Rev 5 &bull; CIS Benchmarks &bull; CERT-In Mandates
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownloadReport(currentItem)}
                  disabled={isExporting}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-mono font-semibold shadow-2xs transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Current Audit PDF</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-xl border border-dashed border-slate-200 text-center space-y-3">
              <p className="text-xs text-slate-600 font-mono">
                No active configuration has been ingested in this session. You can export any past audit record below, or load a config in the Ingestion console.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveMode('history')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Switch to Previous Audits</span>
                </button>
                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate('ingestion')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <span>Go to Ingestion Console</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mode Content: Previous Audits from History */}
      {activeMode === 'history' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-slate-700" />
              <h2 className="text-sm font-bold text-slate-900 font-heading">
                Previous Audit Runs Archive
              </h2>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              {historyItems.length} Historical Records Available
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {historyItems.map((item) => {
              const isSelected = selectedHistoryId === item.id;
              const isPassed = item.compliance_score >= 70;

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedHistoryId(item.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                    isSelected
                      ? 'border-orange-500 bg-orange-50/20 shadow-xs ring-1 ring-orange-300'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                        {item.vendor}
                      </span>
                      <span
                        className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                          isPassed
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {item.compliance_score}%
                      </span>
                    </div>

                    <div className="text-xs font-bold text-slate-900 line-clamp-1">
                      {item.hardware || item.source_name}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">
                      {item.hostname} &bull; {item.formatted_date}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap pt-2 mt-2 border-t border-slate-100 text-[10px] font-mono text-slate-500">
                      <span className="text-emerald-700 font-semibold">{item.passed_count} Passed</span>
                      <span>&bull;</span>
                      <span className="text-rose-700 font-semibold">{item.violations_count} Issues</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedHistoryId(item.id);
                      }}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer text-center ${
                        isSelected
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                      }`}
                    >
                      {isSelected ? 'Previewing' : 'Preview'}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedHistoryId(item.id);
                        handleDownloadReport({
                          id: item.id,
                          vendorName: item.vendor,
                          deviceModel: item.hardware,
                          osVersion: item.os_platform || 'Universal Data Model',
                          hostname: item.hostname || 'NODE-01',
                          complianceScore: item.compliance_score,
                          passedCount: item.passed_count,
                          violationsCount: item.violations_count,
                          filename: item.filename,
                          configText: item.raw_config || CISCO_SAMPLE_CFG,
                        });
                      }}
                      title={`Download ${item.vendor} Compliance Audit PDF`}
                      className="p-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Live Embedded PDF Preview Frame */}
      <div className="bg-white border border-slate-300 rounded-2xl p-3 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 gap-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-orange-600 shrink-0" />
            <span className="font-bold text-slate-900">REPORT PREVIEW:</span>
            <span className="text-slate-800 font-semibold">{currentItem.vendorName}</span>
            <span className="text-slate-400">&bull;</span>
            <span className="text-slate-600 truncate">{currentItem.hostname}</span>
            <span className="text-slate-400">&bull;</span>
            <span className="text-slate-500 truncate text-[11px]">{currentItem.filename}</span>
          </div>
          <div className="text-[11px] text-slate-500 shrink-0">
            COMPLIANCE:{' '}
            <span className={`font-bold ${currentItem.complianceScore >= 70 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {currentItem.complianceScore}% {currentItem.complianceScore >= 70 ? '(PASS)' : '(NEEDS ATTENTION)'}
            </span>
          </div>
        </div>

        {isGenerating || !blobUrl ? (
          <div className="w-full h-[650px] flex flex-col items-center justify-center space-y-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <RefreshCw className="w-8 h-8 text-orange-600 animate-spin" />
            <div className="text-xs font-mono font-bold text-slate-800">
              Generating Official Compliance Audit PDF for {currentItem.vendorName}...
            </div>
            <p className="text-[11px] text-slate-500 font-mono">
              Compiling NIST SP 800-53 Rev 5 controls, line-level evidence, and SHA-256 seal
            </p>
          </div>
        ) : (
          <iframe
            key={blobUrl}
            src={blobUrl}
            title="Executive PDF Verification Sheet"
            className="w-full h-[800px] border border-slate-200 rounded-xl bg-white"
          />
        )}
      </div>

    </div>
  );
};
