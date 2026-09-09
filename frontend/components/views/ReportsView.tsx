import React, { useState } from 'react';
import { FileText, Download, ExternalLink, RefreshCw } from 'lucide-react';

interface ReportsPageProps {
  rawConfig: string;
  hostname: string;
  vendor: string;
  complianceScore: number;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  rawConfig,
  hostname,
  vendor,
  complianceScore,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [pdfKey, setPdfKey] = useState(0);

  const pdfUrl = `/api/export-pdf?download=false&v=${pdfKey}`;
  const downloadUrl = `/api/export-pdf?download=true`;

  const handleDownloadDirect = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_config: rawConfig,
          compliance_score: complianceScore,
          device_metadata: { hostname, vendor },
          download: true,
        }),
      });

      if (!response.ok) throw new Error('PDF export failed');

      const blob = await response.blob();
      const filename = `vectornet_verification_sheet_${(hostname || 'cucme').toLowerCase()}.pdf`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch {
      window.open(downloadUrl, '_blank');
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenNewTab = () => {
    window.open(`/api/export-pdf?download=false`, '_blank');
  };

  return (
    <div className="space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0F172A] font-serif">Executive PDF Audit Deliverables</h1>
          <p className="text-xs text-[#64748B] mt-0.5 font-mono">
            Network Security Hardening & Compliance Verification Sheet (Doc No: NS-TA-2026-026)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setPdfKey(prev => prev + 1)}
            className="px-3.5 py-2 bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC] text-[#0F172A] font-mono text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            title="Refresh PDF Preview"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#64748B]" />
            REFRESH
          </button>
          <button
            onClick={handleOpenNewTab}
            className="px-4 py-2 bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC] text-[#0F172A] font-mono text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-2"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#0EA5E9]" />
            OPEN IN NEW TAB
          </button>
          <button
            onClick={handleDownloadDirect}
            disabled={isExporting}
            className="px-5 py-2.5 bg-[#0F172A] hover:bg-[#1E293B] text-white font-mono text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-[#10B981]" />
            {isExporting ? 'DOWNLOADING PDF...' : 'DOWNLOAD PDF (.PDF)'}
          </button>
        </div>
      </div>

      {/* Embedded Live PDF Document Frame */}
      <div className="bg-white border border-[#CBD5E1] rounded-xl p-2 shadow-sm space-y-2">
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#F8FAFC] border-b border-[#E2E8F0] rounded-t-lg text-xs font-mono text-[#475569]">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#10B981]" />
            <span className="font-bold text-[#0F172A]">DOCUMENT PREVIEW:</span>
            <span>vectornet_verification_sheet_{(hostname || 'cucme').toLowerCase()}.pdf</span>
          </div>
          <div className="text-[11px] text-[#64748B]">
            STATUS: <span className="font-bold text-[#DC2626]">NON-COMPLIANT</span> | SCORE: <span className="font-bold text-[#0F172A]">{complianceScore}%</span>
          </div>
        </div>

        <iframe
          key={pdfKey}
          src={pdfUrl}
          title="Executive PDF Verification Sheet"
          className="w-full h-[800px] border-0 rounded-b-lg"
        />
      </div>

    </div>
  );
};
