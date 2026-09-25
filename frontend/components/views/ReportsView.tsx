import React, { useState, useEffect } from 'react';
import { FileText, Download, ExternalLink, RefreshCw, ShieldCheck, AlertTriangle, Layers, CheckCircle2 } from 'lucide-react';

interface ReportsPageProps {
  rawConfig: string;
  hostname: string;
  vendor: string;
  complianceScore: number;
}

interface VendorReportItem {
  id: string;
  vendorName: string;
  deviceModel: string;
  osVersion: string;
  hostname: string;
  complianceScore: number;
  passedCount: number;
  violationsCount: number;
  frameworks: string[];
  filename: string;
  configText: string;
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

export const ReportsPage: React.FC<ReportsPageProps> = ({
  rawConfig,
  hostname,
  vendor,
  complianceScore,
}) => {
  const [selectedVendorId, setSelectedVendorId] = useState<string>('cisco');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [pdfKey, setPdfKey] = useState<number>(0);
  const [blobUrl, setBlobUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [activeReportName, setActiveReportName] = useState<string>('Cisco Systems');

  // Vendor report profiles available for download
  const vendorReports: VendorReportItem[] = [
    {
      id: 'cisco',
      vendorName: 'Cisco Systems',
      deviceModel: 'ISR 4451-X Enterprise Router',
      osVersion: 'Cisco IOS-XE 16.9.4',
      hostname: 'RTR-NYC-CORE-01',
      complianceScore: 67,
      passedCount: 6,
      violationsCount: 3,
      frameworks: ['NIST SP 800-53', 'CIS Benchmark', 'CERT-In'],
      filename: 'compliance_audit_cisco_ios.pdf',
      configText: CISCO_SAMPLE_CFG,
    },
    {
      id: 'juniper',
      vendorName: 'Juniper Networks',
      deviceModel: 'SRX340 Services Gateway',
      osVersion: 'Junos OS 21.4R1',
      hostname: 'SRX-SFO-EDGE-01',
      complianceScore: 78,
      passedCount: 7,
      violationsCount: 2,
      frameworks: ['NIST SP 800-53', 'CIS Benchmark'],
      filename: 'compliance_audit_juniper_junos.pdf',
      configText: JUNIPER_SAMPLE_CFG,
    },
    {
      id: 'paloalto',
      vendorName: 'Palo Alto Networks',
      deviceModel: 'PA-3220 Next-Gen Firewall',
      osVersion: 'PAN-OS 10.2.4 Enterprise',
      hostname: 'FW-DC1-PERIMETER-01',
      complianceScore: 70,
      passedCount: 7,
      violationsCount: 3,
      frameworks: ['NIST SP 800-53', 'DISA STIG', 'CERT-In'],
      filename: 'compliance_audit_paloalto_panos.pdf',
      configText: PALOALTO_SAMPLE_CFG,
    },
    {
      id: 'fortinet',
      vendorName: 'Fortinet',
      deviceModel: 'FortiGate-100F Enterprise Firewall',
      osVersion: 'FortiOS 7.2.4 GA',
      hostname: 'FGT-BRANCH-LON-01',
      complianceScore: 78,
      passedCount: 7,
      violationsCount: 2,
      frameworks: ['NIST SP 800-53', 'CIS Benchmark'],
      filename: 'compliance_audit_fortinet_fortigate.pdf',
      configText: FORTINET_SAMPLE_CFG,
    },
  ];

  // If user has an active ingested configuration, prepend it as the primary option
  const allReports: VendorReportItem[] = React.useMemo(() => {
    if (rawConfig && rawConfig.trim()) {
      const activeItem: VendorReportItem = {
        id: 'active_session',
        vendorName: vendor || 'Active Ingested Device',
        deviceModel: 'Live Parsed Configuration',
        osVersion: 'Universal Data Model',
        hostname: hostname || 'TAC-INGESTED-NODE',
        complianceScore: complianceScore || 75,
        passedCount: Math.round((complianceScore || 75) * 0.08),
        violationsCount: Math.max(1, 10 - Math.round((complianceScore || 75) * 0.08)),
        frameworks: ['NIST SP 800-53', 'CIS', 'CERT-In'],
        filename: `compliance_audit_${(vendor || 'custom').toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`,
        configText: rawConfig,
      };
      return [activeItem, ...vendorReports];
    }
    return vendorReports;
  }, [rawConfig, hostname, vendor, complianceScore]);

  // Set default selection to active session if available
  useEffect(() => {
    if (rawConfig && rawConfig.trim()) {
      setSelectedVendorId('active_session');
      setActiveReportName(vendor || 'Active Ingested Device');
    }
  }, [rawConfig, vendor]);

  // Active item for live PDF preview
  const currentItem = allReports.find(r => r.id === selectedVendorId) || allReports[0];

  // Generate / Load PDF for currently selected vendor item
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
  }, [selectedVendorId, pdfKey, currentItem]);

  // Direct download handler for any specific vendor report
  const handleDownloadVendorReport = async (item: VendorReportItem) => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_config: item.configText,
          compliance_score: item.complianceScore,
          device_metadata: {
            hostname: item.hostname,
            vendor: item.vendorName,
          },
          download: true,
        }),
      });

      if (!response.ok) throw new Error('PDF export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('Download error:', err);
      alert('Could not export PDF report. Please verify connection.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenNewTab = () => {
    if (blobUrl) {
      window.open(blobUrl, '_blank');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0F172A] font-serif">Executive Compliance Audit Reports</h1>
          <p className="text-xs text-[#64748B] mt-0.5 font-mono">
            Download and inspect vendor-specific compliance audit deliverables (NIST SP 800-53 &bull; CIS &bull; CERT-In)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setPdfKey(prev => prev + 1)}
            className="px-3 py-1.5 bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC] text-[#0F172A] font-mono text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            title="Refresh PDF Preview"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#64748B]" />
            <span>Refresh Preview</span>
          </button>
          <button
            onClick={handleOpenNewTab}
            disabled={!blobUrl}
            className="px-3 py-1.5 bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC] text-[#0F172A] font-mono text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
            <span>Open in Tab</span>
          </button>
          <button
            onClick={() => handleDownloadVendorReport(currentItem)}
            disabled={isExporting}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-mono text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-4 h-4 text-white" />
            <span>{isExporting ? 'Generating...' : `Download ${currentItem.vendorName.split(' ')[0]} PDF`}</span>
          </button>
        </div>
      </div>

      {/* Vendor Compliance Report Download Cards */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-orange-600" />
            <h2 className="text-sm font-bold text-slate-900 font-heading">
              Download Compliance Audit by Vendor
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            {allReports.length} Vendor Reports Available
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {allReports.map((item) => {
            const isSelected = selectedVendorId === item.id;
            const isPassed = item.complianceScore >= 70;

            return (
              <div
                key={item.id}
                onClick={() => {
                  setSelectedVendorId(item.id);
                  setActiveReportName(item.vendorName);
                }}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  isSelected
                    ? 'border-orange-500 bg-orange-50/20 shadow-xs ring-1 ring-orange-300'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                      {item.vendorName}
                    </span>
                    <span className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                      isPassed ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {item.complianceScore}%
                    </span>
                  </div>

                  <div className="text-xs font-bold text-slate-900 line-clamp-1">
                    {item.deviceModel}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">
                    {item.hostname} &bull; {item.osVersion}
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap pt-2 mt-2 border-t border-slate-100 text-[10px] font-mono text-slate-500">
                    <span className="text-emerald-700 font-semibold">{item.passedCount} Passed</span>
                    <span>&bull;</span>
                    <span className="text-rose-700 font-semibold">{item.violationsCount} Issues</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedVendorId(item.id);
                      setActiveReportName(item.vendorName);
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
                      handleDownloadVendorReport(item);
                    }}
                    title={`Download ${item.vendorName} Compliance Audit PDF`}
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

      {/* Live Embedded PDF Preview Frame */}
      <div className="bg-white border border-[#CBD5E1] rounded-2xl p-3 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-mono text-[#475569] gap-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-orange-600 shrink-0" />
            <span className="font-bold text-[#0F172A]">REPORT PREVIEW:</span>
            <span className="text-slate-700 font-semibold">{activeReportName}</span>
            <span className="text-slate-400">&bull;</span>
            <span className="text-slate-500 truncate">{currentItem.filename}</span>
          </div>
          <div className="text-[11px] text-[#64748B] shrink-0">
            SCORE: <span className="font-bold text-[#0F172A]">{currentItem.complianceScore}%</span> | STATUS:{' '}
            <span className={`font-bold ${currentItem.complianceScore >= 70 ? 'text-[#10B981]' : 'text-[#DC2626]'}`}>
              {currentItem.complianceScore >= 70 ? 'PASS' : 'NEEDS ATTENTION'}
            </span>
          </div>
        </div>

        {isGenerating || !blobUrl ? (
          <div className="w-full h-[650px] flex flex-col items-center justify-center space-y-3 bg-[#F8FAFC] rounded-xl border border-dashed border-slate-200">
            <RefreshCw className="w-8 h-8 text-orange-600 animate-spin" />
            <div className="text-xs font-mono font-bold text-slate-800">
              Generating Official Defense Compliance Audit PDF for {currentItem.vendorName}...
            </div>
            <p className="text-[11px] text-slate-500 font-mono">
              Compiling NIST SP 800-53 controls, line-level evidence, and SHA-256 seal
            </p>
          </div>
        ) : (
          <iframe
            key={blobUrl}
            src={blobUrl}
            title="Executive PDF Verification Sheet"
            className="w-full h-[800px] border border-slate-200 rounded-xl"
          />
        )}
      </div>

    </div>
  );
};
