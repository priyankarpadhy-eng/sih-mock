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
  const [blobUrl, setBlobUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  React.useEffect(() => {
    if (!rawConfig || !rawConfig.trim()) {
      setBlobUrl('');
      return;
    }

    let isMounted = true;
    let localUrl = '';

    const loadPdf = async () => {
      setIsGenerating(true);
      try {
        const res = await fetch('/api/export-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            raw_config: rawConfig,
            compliance_score: complianceScore,
            device_metadata: { hostname, vendor },
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
  }, [rawConfig, hostname, vendor, complianceScore, pdfKey]);

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
      const filename = `vectornet_verification_sheet_${(hostname || 'node').toLowerCase().replace(/[^a-z0-9_-]/g, '')}.pdf`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error(err);
      if (blobUrl) {
        window.open(blobUrl, '_blank');
      }
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
            className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-mono text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-4 h-4 text-white" />
            {isExporting ? 'DOWNLOADING PDF...' : 'DOWNLOAD PDF (.PDF)'}
          </button>
        </div>
      </div>

      {/* Embedded Live PDF Document Frame or Clean Empty State */}
      {!rawConfig || !rawConfig.trim() ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs space-y-3">
          <FileText className="w-12 h-12 text-slate-300 mx-auto" />
          <h2 className="text-base font-bold text-slate-900 font-mono">No Configuration Ingested</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Please upload or paste a network configuration in the Ingestion console to generate an official executive PDF compliance report.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-[#CBD5E1] rounded-xl p-2 shadow-sm space-y-2">
          <div className="flex items-center justify-between px-3 py-1.5 bg-[#F8FAFC] border-b border-[#E2E8F0] rounded-t-lg text-xs font-mono text-[#475569]">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-orange-500" />
              <span className="font-bold text-[#0F172A]">DOCUMENT PREVIEW:</span>
              <span>vectornet_verification_sheet_{(hostname || 'node').toLowerCase()}.pdf</span>
            </div>
            <div className="text-[11px] text-[#64748B]">
              STATUS: <span className={`font-bold ${complianceScore >= 70 ? 'text-[#10B981]' : 'text-[#DC2626]'}`}>{complianceScore >= 70 ? 'COMPLIANT' : 'NON-COMPLIANT'}</span> | SCORE: <span className="font-bold text-[#0F172A]">{complianceScore}%</span>
            </div>
          </div>

          {isGenerating || !blobUrl ? (
            <div className="w-full h-[600px] flex flex-col items-center justify-center space-y-3 bg-[#F8FAFC] rounded-b-lg">
              <RefreshCw className="w-8 h-8 text-orange-600 animate-spin" />
              <div className="text-xs font-mono font-bold text-slate-800">
                Compiling Executive Audit Report PDF for {hostname || 'Ingested Node'}...
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                Embedding live compliance controls, line spans, and verifiable cryptography
              </p>
            </div>
          ) : (
            <iframe
              key={blobUrl}
              src={blobUrl}
              title="Executive PDF Verification Sheet"
              className="w-full h-[800px] border-0 rounded-b-lg"
            />
          )}
        </div>
      )}

    </div>
  );
};
