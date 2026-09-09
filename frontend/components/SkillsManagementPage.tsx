import React, { useState, useEffect } from 'react';
import {
  Cpu,
  FileCode,
  Save,
  Plus,
  CheckCircle,
  RefreshCw,
  Key,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Sparkles,
  Zap,
  Check,
  AlertCircle,
  Layers,
  HelpCircle
} from 'lucide-react';
import { UserProfile } from './AuthModal';

interface SkillItem {
  skill_id: string;
  skill_name: string;
  category: string;
  framework: string;
  filepath: string;
  rule_count: number;
  raw_content: string;
}

interface AIConfigResponse {
  total_keys: number;
  active_model: string;
  available_free_models: { id: string; name: string; description: string }[];
  key_pool: { index: number; key_preview: string; status: string }[];
}

interface SkillsManagementPageProps {
  user?: UserProfile | null;
}

export const SkillsManagementPage: React.FC<SkillsManagementPageProps> = ({ user }) => {
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // Active Tab: 'skills' or 'llm_keys'
  const [activeSubTab, setActiveSubTab] = useState<'skills' | 'llm_keys'>('skills');

  // Skills State
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<SkillItem | null>(null);
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // OpenRouter Multi-Key AI Pool State
  const [aiConfig, setAiConfig] = useState<AIConfigResponse | null>(null);
  const [apiKeysInput, setApiKeysInput] = useState<string[]>(['', '', '', '', '', '']);
  const [selectedModel, setSelectedModel] = useState<string>('google/gemini-2.0-flash-lite-preview-02-05:free');
  const [isTestingPool, setIsTestingPool] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const fetchSkills = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/skills');
      if (res.ok) {
        const data = await res.json();
        setSkills(data);
        if (data.length > 0 && !selectedSkill) {
          setSelectedSkill(data[0]);
          setContent(data[0].raw_content);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAiConfig = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/ai/config');
      if (res.ok) {
        const data: AIConfigResponse = await res.json();
        setAiConfig(data);
        setSelectedModel(data.active_model);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSkills();
    fetchAiConfig();
  }, []);

  const handleSelectSkill = (skill: SkillItem) => {
    setSelectedSkill(skill);
    setContent(skill.raw_content);
    setSaveStatus(null);
    setSaveError(null);
  };

  const handleSaveSkill = async () => {
    if (!selectedSkill) return;

    if (!isSuperAdmin) {
      setSaveError('RBAC Access Denied: Only Super Admin role has access to modify Agentic Skill rules.');
      return;
    }

    setIsSaving(true);
    setSaveStatus(null);
    setSaveError(null);

    try {
      const res = await fetch('http://localhost:8000/api/v1/skills/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filepath: selectedSkill.filepath,
          content: content,
          user_uid: user?.uid || 'FIREBASE_UID_SUPERADMIN_01',
          user_role: user?.role || 'SUPER_ADMIN'
        }),
      });

      if (res.ok) {
        setSaveStatus('Skill Markdown updated successfully! Dynamic rules reloaded in memory.');
        fetchSkills();
      } else {
        const errData = await res.json();
        setSaveError(errData.detail || 'Failed to update skill file.');
      }
    } catch {
      setSaveError('Error connecting to backend server.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAiPool = async () => {
    if (!isSuperAdmin) {
      setSaveError('RBAC Access Denied: Only Super Admin role can configure OpenRouter API key pools.');
      return;
    }

    setIsSaving(true);
    setSaveStatus(null);
    setSaveError(null);

    const validKeys = apiKeysInput.filter(k => k.trim().length > 0);

    try {
      const res = await fetch('http://localhost:8000/api/v1/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_keys: validKeys,
          active_model: selectedModel,
          user_uid: user?.uid || 'FIREBASE_UID_SUPERADMIN_01',
          user_role: user?.role || 'SUPER_ADMIN'
        }),
      });

      if (res.ok) {
        setSaveStatus(`OpenRouter API Key Pool updated! ${validKeys.length} key(s) configured with model ${selectedModel}.`);
        fetchAiConfig();
      } else {
        const errData = await res.json();
        setSaveError(errData.detail || 'Failed to update AI pool config.');
      }
    } catch {
      setSaveError('Error connecting to server.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestFailover = async () => {
    setIsTestingPool(true);
    setTestResult(null);
    try {
      const formData = new FormData();
      formData.append('prompt', 'Verify system status and describe NIST AC-12 compliance rule.');
      formData.append('system_instruction', 'You are VectorNet AI Agent.');

      const res = await fetch('http://localhost:8000/api/v1/ai/query-failover', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setTestResult(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsTestingPool(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header & RBAC Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-[#CBD5E1] p-5 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            {isSuperAdmin ? (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                SUPER ADMIN RBAC ENFORCED
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                READ-ONLY ACCESS ({user?.role || 'VIEWER'})
              </span>
            )}
            <span className="text-xs font-mono text-[#64748B]">Global Markdown (.md) Rules</span>
          </div>

          <h1 className="text-xl font-bold text-[#0F172A] font-serif flex items-center gap-2 mt-1">
            <Cpu className="w-6 h-6 text-[#0EA5E9]" />
            Agentic Skills & OpenRouter AI Key Pool
          </h1>
          <p className="text-xs text-[#64748B] mt-1 font-mono">
            Manage dynamic compliance skills, global IDE rules, and 6-key failover pool for free AI models
          </p>
        </div>

        {/* Sub-Tab Selector */}
        <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#CBD5E1] p-1 rounded-xl font-mono text-xs">
          <button
            onClick={() => setActiveSubTab('skills')}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'skills'
                ? 'bg-[#0F172A] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-[#38BDF8]" />
            Agentic Skills (.md)
          </button>
          <button
            onClick={() => setActiveSubTab('llm_keys')}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'llm_keys'
                ? 'bg-[#0F172A] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <Key className="w-3.5 h-3.5 text-[#10B981]" />
            OpenRouter AI Key Pool ({aiConfig?.total_keys || 0})
          </button>
        </div>
      </div>

      {/* Global Status & Feedback Messages */}
      {saveStatus && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono rounded-xl flex items-center gap-2 shadow-xs">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          {saveStatus}
        </div>
      )}

      {saveError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs font-mono rounded-xl flex items-center gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          {saveError}
        </div>
      )}

      {/* SUB-TAB 1: SKILLS MANAGEMENT (.MD RULES) */}
      {activeSubTab === 'skills' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Left: Registered Skills Directory */}
          <div className="bg-white border border-[#CBD5E1] rounded-2xl p-4 space-y-3 shadow-xs">
            <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-2">
              <h3 className="text-xs font-bold text-[#0F172A] font-mono uppercase tracking-wider">
                Registered Skill Profiles ({skills.length})
              </h3>
              <button
                onClick={fetchSkills}
                className="p-1 text-[#64748B] hover:text-[#0F172A] rounded cursor-pointer"
                title="Reload Skills Directory"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2 max-h-[620px] overflow-y-auto pr-0.5">
              {skills.map(s => {
                const isSelected = selectedSkill?.skill_id === s.skill_id;

                return (
                  <div
                    key={s.skill_id}
                    onClick={() => handleSelectSkill(s)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#0EA5E9] bg-sky-50 shadow-xs ring-1 ring-sky-200'
                        : 'border-[#E2E8F0] bg-[#F8FAFC] hover:border-[#CBD5E1]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#0F172A] font-mono truncate">{s.skill_id}</span>
                      <span className="text-[9px] font-mono bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold uppercase shrink-0">
                        {s.category}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#475569] mt-1 truncate">{s.skill_name}</div>
                    <div className="text-[10px] font-mono text-[#0EA5E9] mt-1 font-bold">
                      {s.rule_count} Dynamic Rules
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Skill Markdown Editor Pane */}
          <div className="md:col-span-2 bg-white border border-[#CBD5E1] rounded-2xl p-5 space-y-4 shadow-xs flex flex-col">
            {selectedSkill ? (
              <>
                <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-3">
                  <div>
                    <h3 className="text-sm font-bold font-mono text-[#0F172A]">{selectedSkill.filepath}</h3>
                    <p className="text-[10px] text-[#64748B] font-mono">Category: {selectedSkill.category} &bull; Framework: {selectedSkill.framework}</p>
                  </div>

                  <button
                    onClick={handleSaveSkill}
                    disabled={isSaving || !isSuperAdmin}
                    className={`px-4 py-2 text-white font-mono text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer ${
                      isSuperAdmin ? 'bg-[#0F172A] hover:bg-[#1E293B]' : 'bg-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Save className="w-3.5 h-3.5 text-[#10B981]" />
                    {isSaving ? 'SAVING...' : isSuperAdmin ? 'SAVE & APPLY RULES' : 'LOCK (SUPER ADMIN ONLY)'}
                  </button>
                </div>

                {!isSuperAdmin && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-mono rounded-xl flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Read-Only Mode: Log in as <strong>Super Admin</strong> role to edit agentic skills and global rules.</span>
                  </div>
                )}

                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  disabled={!isSuperAdmin}
                  rows={24}
                  className="w-full bg-[#0F172A] text-[#38BDF8] p-4 rounded-xl font-mono text-xs leading-relaxed outline-none focus:ring-1 focus:ring-[#0EA5E9] disabled:opacity-90"
                />
              </>
            ) : (
              <div className="text-center py-24 text-xs font-mono text-[#94A3B8]">
                Select a skill profile from the list to view or edit evaluation rules.
              </div>
            )}
          </div>

        </div>
      )}

      {/* SUB-TAB 2: OPENROUTER MULTI-KEY FAILOVER POOL */}
      {activeSubTab === 'llm_keys' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Left: Free AI Models & Key Pool Overview */}
          <div className="bg-white border border-[#CBD5E1] rounded-2xl p-5 space-y-4 shadow-xs">
            <h3 className="text-xs font-bold text-[#0F172A] font-mono uppercase tracking-wider border-b border-[#E2E8F0] pb-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#10B981]" />
              Top Recommended Free AI Models
            </h3>

            <div className="space-y-3">
              {aiConfig?.available_free_models.map(m => {
                const isSelected = selectedModel === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => isSuperAdmin && setSelectedModel(m.id)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#10B981] bg-emerald-50/60 shadow-xs ring-1 ring-emerald-300'
                        : 'border-[#CBD5E1] bg-[#F8FAFC] hover:border-[#0EA5E9]'
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono font-bold text-[#0F172A]">
                      <span>{m.name}</span>
                      {isSelected && <span className="text-[9px] bg-emerald-600 text-white px-2 py-0.5 rounded font-bold uppercase">ACTIVE</span>}
                    </div>
                    <p className="text-[11px] text-[#475569] mt-1">{m.description}</p>
                    <div className="text-[9px] font-mono text-[#64748B] mt-1 truncate">{m.id}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: 6-Key Pool Inputs & Failover Tester */}
          <div className="md:col-span-2 bg-white border border-[#CBD5E1] rounded-2xl p-5 space-y-5 shadow-xs">
            
            <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-3">
              <div>
                <h3 className="text-sm font-bold font-mono text-[#0F172A] flex items-center gap-2">
                  <Key className="w-4 h-4 text-[#10B981]" />
                  OpenRouter API Multi-Key Pool (Up to 6 Keys)
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5 font-mono">
                  If Key #1 exhausts tokens or hits rate limit (429), engine automatically fails over to Key #2, #3, etc.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleTestFailover}
                  disabled={isTestingPool}
                  className="px-3.5 py-1.5 bg-sky-50 border border-sky-300 text-sky-800 hover:bg-sky-100 font-mono text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                  {isTestingPool ? 'TESTING POOL...' : 'TEST FAILOVER'}
                </button>

                <button
                  onClick={handleSaveAiPool}
                  disabled={isSaving || !isSuperAdmin}
                  className={`px-4 py-1.5 text-white font-mono text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer ${
                    isSuperAdmin ? 'bg-[#0F172A] hover:bg-[#1E293B]' : 'bg-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Save className="w-3.5 h-3.5 text-[#10B981]" />
                  {isSaving ? 'SAVING...' : 'SAVE KEY POOL'}
                </button>
              </div>
            </div>

            {/* Test Results Output */}
            {testResult && (
              <div className="p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-xs space-y-2 border border-slate-700">
                <div className="flex justify-between items-center text-[10px] text-[#38BDF8] font-bold border-b border-slate-800 pb-1">
                  <span>LLM FAILOVER TEST LOG</span>
                  <span>Model: {testResult.model}</span>
                </div>
                <div className="space-y-1 text-[11px]">
                  {testResult.failover_log?.map((log: string, idx: number) => (
                    <div key={idx} className="leading-snug">{log}</div>
                  ))}
                </div>
                {testResult.content && (
                  <div className="pt-2 text-[#A7F3D0] border-t border-slate-800 text-[11px]">
                    Response: "{testResult.content.slice(0, 180)}..."
                  </div>
                )}
              </div>
            )}

            {/* API Keys Pool Form Grid */}
            <div className="space-y-3 font-mono text-xs">
              <label className="block font-bold text-[#0F172A] uppercase text-[10px]">
                CONFIGURE OPENROUTER API KEYS (PASTE 5 TO 6 KEYS FOR FAILOVER):
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[0, 1, 2, 3, 4, 5].map((idx) => {
                  const maskedKey = aiConfig?.key_pool[idx]?.key_preview || 'Not configured';
                  return (
                    <div key={idx} className="bg-[#F8FAFC] border border-[#CBD5E1] p-2.5 rounded-xl space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-bold text-[#64748B]">
                        <span>API KEY #{idx + 1}</span>
                        <span className="text-[#0EA5E9]">{maskedKey}</span>
                      </div>
                      <input
                        type="password"
                        placeholder={`Paste OpenRouter Key #${idx + 1} (sk-or-v1-...)`}
                        value={apiKeysInput[idx] || ''}
                        disabled={!isSuperAdmin}
                        onChange={(e) => {
                          const newKeys = [...apiKeysInput];
                          newKeys[idx] = e.target.value;
                          setApiKeysInput(newKeys);
                        }}
                        className="w-full bg-white border border-[#CBD5E1] p-2 rounded-lg text-xs outline-none focus:border-[#0EA5E9] font-mono"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Information Notice */}
            <div className="p-3 bg-sky-50 border border-sky-200 text-sky-900 text-xs font-mono rounded-xl flex items-start gap-2">
              <HelpCircle className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">How Automatic Key Failover Works:</span>
                <p className="text-[11px] text-sky-800 mt-0.5 leading-relaxed">
                  VectorNet uses free high-capacity OpenRouter models. If a key runs out of daily tokens or returns HTTP 429 rate limit, the system instantly switches to Key #2, then Key #3, ensuring 100% continuous compliance scanning without downtime.
                </p>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
