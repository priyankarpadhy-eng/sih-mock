import React, { useState } from 'react';
import { Upload, Terminal, ShieldAlert, Check, Copy, ArrowRight, FileText, Download, AlertTriangle, HelpCircle, ShieldCheck } from 'lucide-react';
import { NavTab } from './Sidebar';

interface AuditFinding {
  rule_id: string;
  framework: string;
  control_ref: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  status: 'PASS' | 'FAIL' | 'WARNING' | 'UNKNOWN' | 'NOT_APPLICABLE';
  observed_value: string;
  required_value: string;
  line_start?: number | null;
  line_end?: number | null;
  parser_confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  rule_pack_version?: string;
  remediation_cli?: {
    proposal_status?: string;
    script?: string;
    remediation_cli?: string;
    rollback?: string;
    verification_cmd?: string;
    prerequisites?: string;
    warning?: string;
  };
  rollback_cli?: string;
}

interface AuditorPageProps {
  rawConfig: string;
  onConfigChange: (cfg: string) => void;
  detectedVendor: string;
  onEvaluate: () => void;
  onLoadSample: (key: string) => void;
  isLoading: boolean;
  auditResult: any;
  onNavigate: (tab: NavTab) => void;
}

export const AuditorPage: React.FC<AuditorPageProps> = ({
  rawConfig,
  onConfigChange,
  detectedVendor,
  onEvaluate,
  onLoadSample,
  isLoading,
  auditResult,
  onNavigate,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'fail' | 'pass' | 'unknown'>('all');
  const [copiedRule, setCopiedRule] = useState<string | null>(null);
  const [copiedRollback, setCopiedRollback] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const findings: AuditFinding[] = auditResult?.findings || [];
  const filteredFindings = findings.filter((f) => {
    if (activeFilter === 'fail') return f.status === 'FAIL' || f.status === 'WARNING';
    if (activeFilter === 'pass') return f.status === 'PASS';
    if (activeFilter === 'unknown') return f.status === 'UNKNOWN' || f.status === 'NOT_APPLICABLE';
    return true;
  });

  const handleCopy = (ruleId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRule(ruleId);
    setTimeout(() => setCopiedRule(null), 2000);
  };

  const handleCopyRollback = (ruleId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRollback(ruleId);
    setTimeout(() => setCopiedRollback(null), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          onConfigChange(evt.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      const res = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_text: rawConfig })
      });
      if (!res.ok) throw new Error('PDF export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vectornet_audit_${detectedVendor.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      alert('Could not generate PDF. Please ensure backend is reachable.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0F172A]">Auditor</h1>
          <p className="text-xs text-[#64748B] mt-0.5">Deterministic Policy-as-Code audit engine with OSCAL evidence spans and safety proposals.</p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
          <span className="text-[#64748B] text-[11px]">BENCHMARKS:</span>
          {['cisco_ios', 'palo_alto', 'juniper_junos', 'fortinet_fortios', 'aws_sg'].map((key) => (
            <button
              key={key}
              onClick={() => onLoadSample(key)}
              className="px-2.5 py-1 bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-[#0F172A] transition-colors uppercase text-[11px] font-semibold"
            >
              {key.split('_')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Ingestion & Syntax Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 text-center shadow-sm space-y-3">
            <Upload className="w-6 h-6 text-[#10B981] mx-auto" />
            <div>
              <label htmlFor="cfg-file-input" className="cursor-pointer text-xs font-bold text-[#0F172A] hover:underline block">
                Upload raw config file
              </label>
              <span className="text-[11px] text-[#64748B]">Supports .cfg, .txt, .log, .json</span>
            </div>
            <input
              type="file"
              id="cfg-file-input"
              className="hidden"
              accept=".cfg,.txt,.log,.json"
              onChange={handleFileUpload}
            />
          </div>

          <div className="bg-white border border-[#CBD5E1] p-3.5 rounded-xl shadow-sm space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#64748B]">VENDOR</span>
              <span className="text-[#10B981] font-bold">{detectedVendor}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-[#F1F5F9]">
              <span className="text-[#64748B]">ENGINE</span>
              <span className="text-[#0F172A] font-semibold">OSCAL 2026.1</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={onEvaluate}
              disabled={isLoading || !rawConfig.trim()}
              className="w-full py-2.5 bg-[#0F172A] hover:bg-[#1E293B] text-white font-semibold font-mono text-xs rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? 'ANALYZING CONFIG...' : 'RUN COMPLIANCE AUDIT'}
            </button>

            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf || !rawConfig.trim()}
              className="w-full py-2 bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] font-semibold font-mono text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-[#0F172A]" />
              <span>{isExportingPdf ? 'EXPORTING PDF...' : 'EXPORT AUDIT REPORT (PDF)'}</span>
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white border border-[#CBD5E1] rounded-2xl p-4 shadow-sm flex flex-col min-h-[260px]">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] mb-3 text-xs font-mono text-[#64748B]">
            <span className="flex items-center gap-2 text-[#0F172A] font-bold">
              <FileText className="w-4 h-4 text-[#10B981]" />
              RAW CONFIGURATION INPUT
            </span>
            <span>{rawConfig.split('\n').length} LINES</span>
          </div>
          <textarea
            value={rawConfig}
            onChange={(e) => onConfigChange(e.target.value)}
            className="w-full h-full min-h-[200px] bg-transparent text-[#0F172A] font-mono text-xs focus:outline-none resize-none leading-relaxed"
          />
        </div>

      </div>

      {/* Audit Findings Matrix */}
      <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[#0F172A]">Audit Verification Matrix</h2>
            <p className="text-xs text-[#64748B]">OSCAL-aligned evidence traceability down to configuration line spans.</p>
          </div>

          <div className="flex items-center gap-1 font-mono text-xs bg-[#F8FAFC] p-1 rounded-xl border border-[#CBD5E1]">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1 rounded-lg transition-colors ${activeFilter === 'all' ? 'bg-white text-[#0F172A] font-bold shadow-sm' : 'text-[#64748B]'}`}
            >
              ALL ({findings.length})
            </button>
            <button
              onClick={() => setActiveFilter('fail')}
              className={`px-3 py-1 rounded-lg transition-colors ${activeFilter === 'fail' ? 'bg-[#EF4444]/15 text-[#EF4444] font-bold' : 'text-[#64748B]'}`}
            >
              VIOLATIONS ({findings.filter(f => f.status === 'FAIL' || f.status === 'WARNING').length})
            </button>
            <button
              onClick={() => setActiveFilter('pass')}
              className={`px-3 py-1 rounded-lg transition-colors ${activeFilter === 'pass' ? 'bg-[#10B981]/15 text-[#10B981] font-bold' : 'text-[#64748B]'}`}
            >
              PASSED ({findings.filter(f => f.status === 'PASS').length})
            </button>
            <button
              onClick={() => setActiveFilter('unknown')}
              className={`px-3 py-1 rounded-lg transition-colors ${activeFilter === 'unknown' ? 'bg-[#475569]/15 text-[#475569] font-bold' : 'text-[#64748B]'}`}
            >
              UNKNOWN ({findings.filter(f => f.status === 'UNKNOWN' || f.status === 'NOT_APPLICABLE').length})
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {filteredFindings.map((item) => {
            const fixScript = item.remediation_cli?.script || item.remediation_cli?.remediation_cli;
            const rollbackScript = item.remediation_cli?.rollback || item.rollback_cli;
            const lineSpanText = item.line_start ? (item.line_start === item.line_end ? `Line ${item.line_start}` : `Line ${item.line_start}-${item.line_end}`) : 'Not observed in artifact';

            return (
              <div key={item.rule_id} className="bg-[#F8FAFC] border border-[#CBD5E1] p-4 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3 font-mono text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded font-bold border ${
                      item.status === 'PASS'
                        ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30'
                        : item.status === 'FAIL'
                        ? 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30'
                        : item.status === 'UNKNOWN'
                        ? 'bg-[#475569]/15 text-[#475569] border-[#475569]/30'
                        : 'bg-[#F59E0B]/15 text-[#D97706] border-[#F59E0B]/30'
                    }`}>
                      {item.status}
                    </span>

                    <span className="px-2 py-0.5 rounded bg-[#E0F2FE] text-[#0369A1] font-semibold border border-[#BAE6FD]">
                      {lineSpanText}
                    </span>

                    {item.parser_confidence && (
                      <span className="px-2 py-0.5 rounded bg-white text-[#64748B] border border-[#E2E8F0] text-[10px]">
                        CONFIDENCE: {item.parser_confidence}
                      </span>
                    )}

                    <span className="text-[#0F172A] font-bold text-sm font-sans">{item.title}</span>
                  </div>
                  <span className="text-[#64748B] text-[11px]">{item.framework} &bull; {item.control_ref}</span>
                </div>

                <p className="text-xs text-[#475569] leading-relaxed">{item.description}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="bg-white p-2.5 rounded-lg border border-[#E2E8F0]">
                    <span className="text-[#64748B] block text-[10px]">OBSERVED EVIDENCE</span>
                    <span className="text-[#0F172A] font-bold">{item.observed_value}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-[#E2E8F0]">
                    <span className="text-[#64748B] block text-[10px]">REQUIRED BASELINE POLICY</span>
                    <span className="text-[#10B981] font-bold">{item.required_value}</span>
                  </div>
                </div>

                {fixScript && item.status !== 'PASS' && (
                  <div className="bg-white border border-[#CBD5E1] p-3 rounded-lg space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span className="text-[#0F172A] uppercase font-bold">REMEDIATION PROPOSAL</span>
                        <span className="px-1.5 py-0.5 text-[10px] bg-[#FEF3C7] text-[#92400E] rounded font-semibold border border-[#FDE68A]">
                          PROPOSAL ONLY (DRY RUN)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopy(item.rule_id, fixScript)}
                          className="px-2.5 py-1 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#CBD5E1] text-[#0F172A] rounded-md flex items-center gap-1 text-[11px]"
                        >
                          {copiedRule === item.rule_id ? <Check className="w-3 h-3 text-[#10B981]" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedRule === item.rule_id ? 'COPIED FIX' : 'COPY FIX'}</span>
                        </button>
                        {rollbackScript && (
                          <button
                            onClick={() => handleCopyRollback(item.rule_id, rollbackScript)}
                            className="px-2.5 py-1 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#CBD5E1] text-[#475569] rounded-md flex items-center gap-1 text-[11px]"
                          >
                            {copiedRollback === item.rule_id ? <Check className="w-3 h-3 text-[#10B981]" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedRollback === item.rule_id ? 'COPIED ROLLBACK' : 'COPY ROLLBACK'}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {item.remediation_cli?.verification_cmd && (
                      <div className="text-[11px] font-mono text-[#64748B]">
                        <span className="font-semibold text-[#0F172A]">Verification: </span>
                        <code>{item.remediation_cli.verification_cmd}</code>
                      </div>
                    )}

                    <pre className="text-xs font-mono text-[#0F172A] overflow-x-auto bg-[#F8FAFC] p-2.5 rounded border border-[#E2E8F0]">
                      <code>{fixScript}</code>
                    </pre>

                    {rollbackScript && (
                      <details className="text-[11px] font-mono text-[#64748B] pt-1">
                        <summary className="cursor-pointer font-semibold text-[#475569] hover:underline">
                          View Rollback Plan
                        </summary>
                        <pre className="mt-1.5 p-2 bg-[#F1F5F9] text-[#334155] rounded border border-[#E2E8F0] overflow-x-auto">
                          <code>{rollbackScript}</code>
                        </pre>
                      </details>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
