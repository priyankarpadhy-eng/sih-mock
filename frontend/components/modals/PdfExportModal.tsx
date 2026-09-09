import React, { useState } from 'react';
import { FileText, Download, CheckCircle, ShieldCheck } from 'lucide-react';

interface PdfExportModalProps {
  rawConfig: string;
  hostname: string;
  vendor: string;
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({ rawConfig, hostname, vendor }) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleDownloadPdf = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_config: rawConfig,
          device_metadata: { hostname, vendor },
          download: true,
        }),
      });

      if (!response.ok) {
        throw new Error('PDF export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vectornet_audit_${hostname.toLowerCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      // Fallback print mode trigger
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-toc-surface border border-toc-border rounded-lg p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-toc-heading flex items-center gap-2">
          <FileText className="w-5 h-5 text-tactical-cyan" />
          Executive & Technical PDF Audit Report Engine
        </h3>
        <p className="text-xs text-toc-text">
          Generate pixel-perfect corporate and military PDF deliverables complete with NIST/CIS scorecards, heatmaps, and playbooks.
        </p>
      </div>

      <button
        onClick={handleDownloadPdf}
        disabled={isExporting}
        className="px-6 py-3 bg-tactical-cyan hover:bg-tactical-cyan/90 text-toc-bg font-semibold font-mono text-xs rounded transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
      >
        <Download className="w-4 h-4" />
        {isExporting ? 'GENERATING PDF REPORT...' : 'EXPORT EXECUTIVE PDF REPORT'}
      </button>
    </div>
  );
};
