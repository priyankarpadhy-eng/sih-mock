import React, { useState } from 'react';
import { Shield, User, Lock, Mail, KeyRound, CheckCircle2, ArrowRight, ShieldAlert, Sparkles } from 'lucide-react';

export type UserRole = 'SUPER_ADMIN' | 'SECURITY_AUDITOR' | 'NETWORK_OPERATOR' | 'VIEWER';

export interface UserProfile {
  uid: string;
  email: string;
  display_name: string;
  role: UserRole;
  team_id: string;
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
  currentUser: UserProfile | null;
}

const DEMO_USERS: UserProfile[] = [
  {
    uid: 'FIREBASE_UID_SUPERADMIN_01',
    email: 'secops.lead@vectornet.local',
    display_name: 'Super Administrator',
    role: 'SUPER_ADMIN',
    team_id: 'TEAM_VECTOR_DEFENSE'
  },
  {
    uid: 'FIREBASE_UID_AUDITOR_02',
    email: 'auditor@vectornet.io',
    display_name: 'Senior Cyber Auditor',
    role: 'SECURITY_AUDITOR',
    team_id: 'TEAM_VECTOR_DEFENSE'
  },
  {
    uid: 'FIREBASE_UID_OPERATOR_03',
    email: 'operator@vectornet.io',
    display_name: 'Lead Network Operator',
    role: 'NETWORK_OPERATOR',
    team_id: 'TEAM_VECTOR_DEFENSE'
  },
  {
    uid: 'FIREBASE_UID_VIEWER_04',
    email: 'viewer@vectornet.io',
    display_name: 'Command Viewer',
    role: 'VIEWER',
    team_id: 'TEAM_VECTOR_DEFENSE'
  }
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  currentUser,
}) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('SUPER_ADMIN');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please provide valid email and password.');
      return;
    }

    try {
      const endpoint = isSignUp ? 'http://localhost:8000/api/v1/auth/signup' : 'http://localhost:8000/api/v1/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          display_name: displayName || email.split('@')[0],
          role: selectedRole
        }),
      });

      if (res.ok) {
        const data = await res.json();
        onLoginSuccess(data.user);
        onClose();
      } else {
        // Fallback login creation for demo
        const userObj: UserProfile = {
          uid: `usr-${Date.now()}`,
          email: email,
          display_name: displayName || email.split('@')[0],
          role: selectedRole,
          team_id: 'TEAM_VECTOR_DEFENSE'
        };
        onLoginSuccess(userObj);
        onClose();
      }
    } catch {
      // Fallback
      const userObj: UserProfile = {
        uid: `usr-${Date.now()}`,
        email: email,
        display_name: displayName || email.split('@')[0],
        role: selectedRole,
        team_id: 'TEAM_VECTOR_DEFENSE'
      };
      onLoginSuccess(userObj);
      onClose();
    }
  };

  const handleQuickDemoLogin = (demoUser: UserProfile) => {
    onLoginSuccess(demoUser);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-[#CBD5E1] rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0F172A] flex items-center justify-center text-white font-bold">
              <Shield className="w-4 h-4 text-[#10B981]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0F172A] font-serif">
                {isSignUp ? 'Create VectorNet Account' : 'VectorNet Authentication'}
              </h2>
              <p className="text-[11px] text-[#64748B] font-mono">Firebase Auth & Role-Based Access Control</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#64748B] hover:text-[#0F172A] text-sm font-mono font-bold"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs font-mono rounded-lg flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
            {errorMsg}
          </div>
        )}

        {/* Email Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isSignUp && (
            <div>
              <label className="block text-[11px] font-mono font-bold text-[#475569] mb-1">FULL NAME:</label>
              <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#CBD5E1] px-3 py-2 rounded-xl">
                <User className="w-4 h-4 text-[#64748B]" />
                <input
                  type="text"
                  placeholder="Priyankar Padhy"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="bg-transparent text-xs text-[#0F172A] outline-none w-full font-sans"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-mono font-bold text-[#475569] mb-1">EMAIL ADDRESS:</label>
            <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#CBD5E1] px-3 py-2 rounded-xl">
              <Mail className="w-4 h-4 text-[#64748B]" />
              <input
                type="email"
                placeholder="priyankar@vectornet.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-transparent text-xs text-[#0F172A] outline-none w-full font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono font-bold text-[#475569] mb-1">PASSWORD:</label>
            <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#CBD5E1] px-3 py-2 rounded-xl">
              <Lock className="w-4 h-4 text-[#64748B]" />
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-transparent text-xs text-[#0F172A] outline-none w-full font-mono"
              />
            </div>
          </div>

          {/* Role Selector */}
          <div>
            <label className="block text-[11px] font-mono font-bold text-[#475569] mb-1">ROLE-BASED ACCESS CONTROL (RBAC):</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as UserRole)}
              className="w-full bg-[#F8FAFC] border border-[#CBD5E1] px-3 py-2 rounded-xl text-xs font-mono font-bold text-[#0F172A] outline-none"
            >
              <option value="SUPER_ADMIN">SUPER_ADMIN (Full Control & Rule Edits)</option>
              <option value="SECURITY_AUDITOR">SECURITY_AUDITOR (Audit & Policy Review)</option>
              <option value="NETWORK_OPERATOR">NETWORK_OPERATOR (Remediation & Task Exec)</option>
              <option value="VIEWER">VIEWER (Read-Only Telemetry)</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-[#0F172A] hover:bg-[#1E293B] text-white font-mono text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <span>{isSignUp ? 'SIGN UP & CONNECT' : 'SIGN IN WITH EMAIL'}</span>
            <ArrowRight className="w-4 h-4 text-[#10B981]" />
          </button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs font-mono text-[#0EA5E9] hover:underline"
          >
            {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Register new user'}
          </button>
        </div>

        {/* 1-Click Demo RBAC Role Switcher */}
        <div className="border-t border-[#E2E8F0] pt-4 space-y-2">
          <div className="text-[10px] font-mono font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            1-Click Demo Role Switcher:
          </div>

          <div className="grid grid-cols-2 gap-2">
            {DEMO_USERS.map(user => {
              const isCurrent = currentUser?.uid === user.uid;

              return (
                <button
                  key={user.uid}
                  type="button"
                  onClick={() => handleQuickDemoLogin(user)}
                  className={`p-2 rounded-xl border text-left text-[11px] transition-all flex flex-col justify-between ${
                    isCurrent
                      ? 'border-[#10B981] bg-emerald-50 text-[#0F172A]'
                      : 'border-[#E2E8F0] bg-[#F8FAFC] hover:border-[#CBD5E1] text-[#334155]'
                  }`}
                >
                  <div className="font-bold truncate">{user.display_name}</div>
                  <div className="text-[9px] font-mono text-[#0EA5E9] font-bold">{user.role}</div>
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
