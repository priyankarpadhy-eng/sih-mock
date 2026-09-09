import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle, Copy, Check, Terminal, Code2 } from 'lucide-react';

interface AuditFinding {
  rule_id: string;
  framework: string;
  control_ref: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  status: 'PASS' | 'FAIL' | 'WARNING';
  observed_value: string;
  required_value: string;
  remediation_cli?: {
    target_vendor: string;
    rule_id: string;
    remediation_cli: string;
  };
}

interface AuditMatrixProps {
  findings: AuditFinding[];
  vendor: string;
}

export const AuditMatrix: React.FC<AuditMatrixProps> = ({ findings, vendor }) => {
  const [copiedRuleId, setCopiedRuleId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'fail' | 'pass'>('all');

  const handleCopyCli = (ruleId: string, cliText: string) => {
    navigator.clipboard.writeText(cliText);
    setCopiedRuleId(ruleId);
    setTimeout(() => setCopiedRuleId(null), 2000);
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-tactical-critical/15 text-tactical-critical border-tactical-critical/30';
      case 'HIGH':
        return 'bg-tactical-critical/10 text-tactical-critical border-tactical-critical/20';
      case 'MEDIUM':
        return 'bg-tactical-warning/15 text-tactical-warning border-tactical-warning/30';
      default:
        return 'bg-toc-border text-toc-text border-toc-border';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PASS':
        return 'bg-tactical-pass/10 text-tactical-pass border-tactical-pass/30';
      case 'FAIL':
        return 'bg-tactical-critical/10 text-tactical-critical border-tactical-critical/30';
      case 'WARNING':
        return 'bg-tactical-warning/10 text-tactical-warning border-tactical-warning/30';
      default:
        return 'bg-toc-border text-toc-text border-toc-border';
    }
  };

  const filteredFindings = findings.filter((f) => {
    if (activeTab === 'fail') return f.status === 'FAIL' || f.status === 'WARNING';
    if (activeTab === 'pass') return f.status === 'PASS';
    return true;
  });

  return (
    <section className="bg-toc-surface border border-toc-border rounded-lg p-6 mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-toc-heading flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-tactical-cyan" />
            Compliance Verification Matrix & CLI Remediation Workspace
          </h2>
          <p className="text-xs text-toc-text mt-0.5">
            Audit findings mapped to NIST SP 800-53, CIS, DISA STIG, and ISO 27001 with target CLI playbooks.
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1.5 font-mono text-xs bg-toc-bg p-1 rounded border border-toc-border">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'all' ? 'bg-toc-surface text-toc-heading font-medium' : 'text-toc-text hover:text-toc-heading'
            }`}
          >
            ALL CHECKS ({findings.length})
          </button>
          <button
            onClick={() => setActiveTab('fail')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'fail' ? 'bg-tactical-critical/20 text-tactical-critical font-medium' : 'text-toc-text hover:text-toc-heading'
            }`}
          >
            VIOLATIONS ({findings.filter((f) => f.status !== 'PASS').length})
          </button>
          <button
            onClick={() => setActiveTab('pass')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'pass' ? 'bg-tactical-pass/20 text-tactical-pass font-medium' : 'text-toc-text hover:text-toc-heading'
            }`}
          >
            COMPLIANT ({findings.filter((f) => f.status === 'PASS').length})
          </button>
        </div>
      </div>

      {/* Findings Table */}
      <div className="space-y-4">
        {filteredFindings.map((finding) => (
          <div
            key={finding.rule_id}
            className="bg-toc-bg border border-toc-border rounded-lg p-5 transition-all hover:border-toc-hover"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-toc-border pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap font-mono text-xs">
                  <span className={`px-2.5 py-0.5 rounded border font-semibold ${getStatusBadge(finding.status)}`}>
                    {finding.status}
                  </span>
                  <span className={`px-2 py-0.5 rounded border ${getSeverityBadge(finding.severity)}`}>
                    {finding.severity}
                  </span>
                  <span className="text-tactical-cyan font-bold">[{finding.rule_id}]</span>
                  <span className="text-toc-text">{finding.framework} &bull; {finding.control_ref}</span>
                </div>
                <h3 className="text-base font-semibold text-toc-heading">{finding.title}</h3>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono bg-toc-surface p-3 rounded border border-toc-border">
                <div>
                  <span className="text-toc-text block text-[10px]">OBSERVED VALUE</span>
                  <span className="text-toc-heading font-medium">{finding.observed_value}</span>
                </div>
                <div className="h-6 w-px bg-toc-border"></div>
                <div>
                  <span className="text-toc-text block text-[10px]">REQUIRED BASELINE</span>
                  <span className="text-tactical-cyan font-medium">{finding.required_value}</span>
                </div>
              </div>
            </div>

            <p className="text-sm text-toc-text mt-3 leading-relaxed">
              {finding.description}
            </p>

            {/* Vendor Specific CLI Remediation Snippet */}
            {finding.remediation_cli && finding.remediation_cli.remediation_cli && (
              <div className="mt-4 bg-toc-surface border border-toc-border rounded-md p-4 space-y-2">
                <div className="flex items-center justify-between font-mono text-xs">
                  <div className="flex items-center gap-2 text-tactical-cyan">
                    <Terminal className="w-4 h-4" />
                    <span className="font-semibold uppercase">CLI REMEDIATION PLAYBOOK ({finding.remediation_cli.target_vendor || vendor})</span>
                  </div>
                  <button
                    onClick={() => handleCopyCli(finding.rule_id, finding.remediation_cli!.remediation_cli)}
                    className="flex items-center gap-1.5 px-3 py-1 bg-toc-bg hover:bg-toc-hover border border-toc-border rounded text-toc-heading transition-colors"
                  >
                    {copiedRuleId === finding.rule_id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-tactical-pass" />
                        <span className="text-tactical-pass font-semibold">COPIED</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>COPY SNIPPET</span>
                      </>
                    )}
                  </button>
                </div>

                <pre className="p-3 bg-toc-bg border border-toc-border rounded font-mono text-xs text-tactical-cyan overflow-x-auto leading-relaxed">
                  <code>{finding.remediation_cli.remediation_cli}</code>
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};
