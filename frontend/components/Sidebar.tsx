import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  UploadCloud,
  Server,
  Activity,
  ShieldCheck,
  Cpu,
  Terminal,
  FileText,
  Flame,
  CheckSquare,
  Sparkles,
  User,
  LogOut,
  Shield
} from 'lucide-react';
import { UserProfile } from './AuthModal';

export type NavTab = 'overview' | 'ingestion' | 'inventory' | 'telemetry' | 'auditor' | 'workbench' | 'remediation' | 'tasks' | 'skills' | 'reports';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  complianceScore: number;
  hostname: string;
  user: UserProfile | null;
  onOpenAuthModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  complianceScore,
  hostname,
  user,
  onOpenAuthModal,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeUser = mounted ? user : null;
  const userRole = activeUser?.role || 'SUPER_ADMIN';
  const displayName = activeUser?.display_name || 'Priyankar Padhy';
  const email = activeUser?.email || 'priyankar@sentinel.net';
  const initial = displayName.charAt(0) || 'P';

  // Role-based navigation filtering: Ingestion at top, Overview just below it
  const navItems = [
    { id: 'ingestion' as NavTab, label: 'Ingestion', icon: UploadCloud, roles: ['SUPER_ADMIN', 'SECURITY_AUDITOR', 'NETWORK_OPERATOR'] },
    { id: 'overview' as NavTab, label: 'Overview', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'SECURITY_AUDITOR', 'NETWORK_OPERATOR', 'VIEWER'] },
    { id: 'tasks' as NavTab, label: 'Tasks (Kanban)', icon: CheckSquare, roles: ['SUPER_ADMIN', 'SECURITY_AUDITOR', 'NETWORK_OPERATOR', 'VIEWER'] },
    { id: 'skills' as NavTab, label: 'Agentic Skills', icon: Sparkles, roles: ['SUPER_ADMIN', 'SECURITY_AUDITOR'] },
    { id: 'inventory' as NavTab, label: 'Inventory', icon: Server, roles: ['SUPER_ADMIN', 'SECURITY_AUDITOR', 'NETWORK_OPERATOR', 'VIEWER'] },
    { id: 'telemetry' as NavTab, label: 'Telemetry', icon: Activity, roles: ['SUPER_ADMIN', 'SECURITY_AUDITOR', 'NETWORK_OPERATOR', 'VIEWER'] },
    { id: 'auditor' as NavTab, label: 'Auditor', icon: ShieldCheck, roles: ['SUPER_ADMIN', 'SECURITY_AUDITOR'] },
    { id: 'workbench' as NavTab, label: 'Workbench', icon: Cpu, roles: ['SUPER_ADMIN', 'SECURITY_AUDITOR'] },
    { id: 'remediation' as NavTab, label: 'Remediation', icon: Terminal, roles: ['SUPER_ADMIN', 'NETWORK_OPERATOR'] },
    { id: 'reports' as NavTab, label: 'Reports', icon: FileText, roles: ['SUPER_ADMIN', 'SECURITY_AUDITOR', 'VIEWER'] },
  ].filter(item => item.roles.includes(userRole));

  return (
    <aside className="w-64 h-screen sticky top-0 bg-white border-r border-[#E2E8F0] flex flex-col justify-between p-4 shrink-0 overflow-y-auto z-20 shadow-sm">
      <div className="space-y-5">
        
        {/* Brand Logo & Name */}
        <div className="flex items-center justify-between px-2 py-1 border-b border-[#E2E8F0] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-[#0F172A] tracking-tight font-serif">SENTINEL</h1>
              <p className="text-[10px] text-[#64748B] font-mono">SIH 2026 Defense Engine</p>
            </div>
          </div>
        </div>

        {/* User Account & RBAC Badge */}
        <div className="bg-[#F8FAFC] border border-[#CBD5E1] p-2.5 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#0F172A] text-white text-[10px] font-bold flex items-center justify-center font-mono">
                {initial}
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-[#0F172A] truncate">{displayName}</div>
                <div className="text-[9px] text-[#64748B] truncate font-mono">{email}</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-[#E2E8F0] pt-1.5 text-[10px]">
            <span className={`font-mono font-bold px-2 py-0.5 rounded text-[9px] ${
              userRole === 'SUPER_ADMIN' ? 'bg-red-100 text-red-700' :
              userRole === 'SECURITY_AUDITOR' ? 'bg-sky-100 text-sky-800' :
              userRole === 'NETWORK_OPERATOR' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
            }`}>
              {userRole}
            </span>
            <button
              onClick={onOpenAuthModal}
              className="text-[#0EA5E9] hover:underline font-mono font-bold flex items-center gap-1"
            >
              <LogOut className="w-3 h-3" />
              Switch
            </button>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium cursor-pointer transition-all text-left ${
                  isActive
                    ? 'bg-[#F1F5F9] text-[#0F172A] font-semibold border border-[#E2E8F0]'
                    : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#0F172A]' : 'text-[#64748B]'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Active Node Card */}
      <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 space-y-2 mt-4">
        <div className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider flex items-center justify-between">
          <span>ACTIVE NODE</span>
          <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
        </div>
        <div className="text-xs font-bold text-[#0F172A] font-mono truncate">{hostname}</div>
        <div className="flex items-center justify-between text-xs font-mono pt-1.5 border-t border-[#E2E8F0]">
          <span className="text-[#64748B]">SCORE</span>
          <span className={`font-bold ${complianceScore >= 70 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
            {complianceScore}%
          </span>
        </div>
      </div>
    </aside>
  );
};
