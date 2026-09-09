import React, { useState } from 'react';
import { Terminal, Copy, Check } from 'lucide-react';

interface RemediationPageProps {
  findings: any[];
  vendor: string;
}

export const RemediationPage: React.FC<RemediationPageProps> = ({ findings, vendor }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const violations = findings.filter((f) => f.status !== 'PASS');

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0F172A]">Remediation Playbooks</h1>
          <p className="text-xs text-[#64748B] mt-0.5">Vendor CLI commands to fix security violations.</p>
        </div>

        <div className="font-mono text-xs text-[#10B981] bg-[#10B981]/10 px-3 py-1.5 rounded-lg border border-[#10B981]/20 font-bold">
          TARGET VENDOR: {vendor}
        </div>
      </div>

      {/* Remediation Cards */}
      <div className="space-y-4">
        {violations.length > 0 ? (
          violations.map((f) => (
            <div key={f.rule_id} className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3 font-mono text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[#EF4444] font-bold">[{f.rule_id}]</span>
                  <span className="text-[#0F172A] font-bold text-sm font-sans">{f.title}</span>
                </div>
                <span className="text-[#64748B] text-[11px]">{f.framework} &bull; {f.control_ref}</span>
              </div>

              <p className="text-xs text-[#475569]">{f.description}</p>

              {f.remediation_cli?.remediation_cli && (
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-xl space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between text-[#0F172A]">
                    <div className="flex items-center gap-2 font-bold">
                      <Terminal className="w-4 h-4 text-[#10B981]" />
                      <span>CLI COMMAND PLAYBOOK</span>
                    </div>
                    <button
                      onClick={() => handleCopy(f.rule_id, f.remediation_cli.remediation_cli)}
                      className="px-2.5 py-1 bg-white hover:bg-[#F1F5F9] border border-[#E2E8F0] text-[#0F172A] rounded-lg flex items-center gap-1.5 text-[11px] font-semibold"
                    >
                      {copiedId === f.rule_id ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedId === f.rule_id ? 'COPIED' : 'COPY'}</span>
                    </button>
                  </div>
                  <pre className="p-3 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] leading-relaxed overflow-x-auto">
                    <code>{f.remediation_cli.remediation_cli}</code>
                  </pre>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="bg-white border border-[#E2E8F0] p-8 rounded-2xl text-center font-mono text-xs text-[#10B981] font-bold shadow-sm">
            All compliance checks passed for {vendor}. No remediation commands required.
          </div>
        )}
      </div>

    </div>
  );
};
