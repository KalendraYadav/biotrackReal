import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, ROLE_ROUTES, DEMO_ROLES_LIST } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { SkipToContent } from '../ui/SkipToContent';
import BioTraceMark from '../brand/BioTraceMark';
import { 
  ShieldCheck, 
  LogOut, 
  ChevronDown, 
  Activity, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  Truck,
  Flame,
  Scale,
  User as UserIcon,
  RefreshCw,
  Zap,
  Radio,
  X,
  AlertTriangle,
  Menu,
  Users,
  Layers,
  ArrowRight
} from 'lucide-react';

const ROLE_ICONS = {
  HOSPITAL_AUTHORITY: Building2,
  COLLECTION_OFFICER: ShieldCheck,
  TRANSPORT_OFFICER: Truck,
  TREATMENT_FACILITY: Flame,
  GOVERNMENT_AUTHORITY: Activity,
  COMPLIANCE_INSPECTOR: Scale
};

export default function AppLayout({ children }) {
  const { user, role, logout, loginAsDemoRole, demoRoles } = useAuth();
  const { isConnected, syncMode, alerts, dismissAlert } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();

  const [backendStatus, setBackendStatus] = useState('checking');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);
  const switcherRef = useRef(null);

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(() => setBackendStatus('connected'))
      .catch(() => setBackendStatus('disconnected'));
  }, []);

  // Close switcher on click outside
  useEffect(() => {
    if (!roleSwitcherOpen) return;
    function handleClickOutside(event) {
      if (switcherRef.current && !switcherRef.current.contains(event.target)) {
        setRoleSwitcherOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [roleSwitcherOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSwitchRole = async (targetRole) => {
    setRoleSwitcherOpen(false);
    setMobileMenuOpen(false);
    const res = await loginAsDemoRole(targetRole);
    if (res.success) {
      navigate(res.dashboardRoute);
    }
  };

  const currentRoleMeta = demoRoles.find(r => r.role === role) || demoRoles[0];
  const RoleIcon = ROLE_ICONS[role] || ShieldCheck;
  const isDashboardActive = location.pathname !== '/personnel';
  const isPersonnelActive = location.pathname === '/personnel';

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-900">
      {/* Skip to Main Content Link for Keyboard Accessibility (AX-03) */}
      <SkipToContent targetId="main-content" />

      {/* Top Enterprise Navigation Bar */}
      <header className="bg-[#03275D] text-white border-b border-[#104F89]/80 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-15">
            {/* Logo & Product Name */}
            <div className="flex items-center gap-6">
              <Link 
                to={ROLE_ROUTES[role] || '/'} 
                className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-lg py-1"
                aria-label="BioTrace home dashboard"
              >
                <div className="p-1 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 shadow-xs group-hover:border-cyan-400 transition-colors">
                  <BioTraceMark className="w-5 h-8 drop-shadow" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold tracking-tight text-white leading-none">
                      <strong className="font-extrabold text-white">BIO</strong>
                      <span className="font-light text-[#D9E9FB] ml-[0.04em]">TRACE</span>
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider bg-[#0C477D] text-cyan-300 border border-[#36B9EE]/50">
                      NidusClean
                    </span>
                  </div>
                  <p className="text-[10px] text-cyan-200/80 font-mono leading-none mt-1">CPCB BMW Chain of Custody</p>
                </div>
              </Link>

              {/* Navigation Tabs */}
              <nav aria-label="Main navigation" className="hidden md:flex items-center gap-1 pl-4 border-l border-white/15">
                <Link
                  to={ROLE_ROUTES[role] || '/'}
                  aria-current={isDashboardActive ? 'page' : undefined}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                    isDashboardActive
                      ? 'bg-white/15 text-white font-semibold border-b-2 border-[#00C49E] shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Dashboard
                </Link>

                {(role === 'HOSPITAL_AUTHORITY' || role === 'GOVERNMENT_AUTHORITY') && (
                  <Link
                    to="/personnel"
                    aria-current={isPersonnelActive ? 'page' : undefined}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                      isPersonnelActive
                        ? 'bg-white/15 text-white font-semibold border-b-2 border-[#00C49E] shadow-xs'
                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 text-cyan-300" aria-hidden="true" />
                    <span>Personnel</span>
                  </Link>
                )}
              </nav>
            </div>

            {/* Right Controls: Unified Status, Role Switcher, Profile */}
            <div className="flex items-center gap-2.5 sm:gap-3.5">
              {/* Executive System Health Indicator */}
              <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#083569]/90 border border-[#1E5692] text-[11px] font-mono text-cyan-200">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>
                  {syncMode === 'websocket' ? 'Live Telemetry' : 'Sync Active'} • API 200
                </span>
              </div>

              {/* Role Switcher Dropdown (for testing and quick demo navigation) */}
              <div className="relative" ref={switcherRef}>
                <button
                  type="button"
                  onClick={() => setRoleSwitcherOpen(!roleSwitcherOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#083569]/90 hover:bg-[#0C477D] border border-[#1E5692] text-xs font-medium text-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                  aria-expanded={roleSwitcherOpen}
                  aria-label="Switch demonstration duty role"
                >
                  <RoleIcon className="w-3.5 h-3.5 text-[#00C49E] shrink-0" aria-hidden="true" />
                  <span className="font-semibold text-white truncate max-w-[130px] sm:max-w-[160px]">
                    {currentRoleMeta?.title || role}
                  </span>
                  <ChevronDown className="w-3 h-3 text-cyan-200/80" aria-hidden="true" />
                </button>

                {roleSwitcherOpen && (
                  <div 
                    role="menu"
                    className="absolute right-0 mt-1.5 w-72 rounded-xl bg-[#072B57] border border-[#1E5692] shadow-2xl py-1.5 z-50 text-xs animate-in fade-in slide-in-from-top-1"
                  >
                    <div className="px-3 py-2 border-b border-[#1E5692]/60">
                      <p className="text-[10px] font-mono font-bold text-cyan-300 uppercase tracking-wider">
                        Switch Operational Context
                      </p>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        Test RBAC & workflows across all 6 statutory roles:
                      </p>
                    </div>

                    <div className="py-1">
                      {DEMO_ROLES_LIST.map((r) => {
                        const Icon = ROLE_ICONS[r.role] || ShieldCheck;
                        const isCurrent = r.role === role;

                        return (
                          <button
                            key={r.role}
                            type="button"
                            role="menuitem"
                            onClick={() => handleSwitchRole(r.role)}
                            className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-white/10 transition-colors ${
                              isCurrent ? 'bg-blue-900/60 text-cyan-200 font-semibold border-l-2 border-[#00C49E]' : 'text-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`p-1.5 rounded-md ${isCurrent ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'}`}>
                                <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs truncate text-white">{r.title}</div>
                                <div className="text-[10px] text-slate-400 truncate">{r.name} • {r.facility}</div>
                              </div>
                            </div>
                            {isCurrent && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#00C49E] shrink-0 ml-2" aria-hidden="true" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>


              {/* User Profile & Logout */}
              <div className="flex items-center pl-2 border-l border-slate-800/80 gap-2">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-white leading-tight">{user?.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono leading-tight truncate max-w-[140px]">
                    {user?.facility_name || user?.facility?.name || 'Regulatory Authority'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  aria-label="Sign out of BioTrace"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                </button>

                {/* Mobile Menu Toggle */}
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  aria-expanded={mobileMenuOpen}
                  aria-label="Toggle navigation menu"
                  title="Toggle mobile menu"
                >
                  <Menu className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0F172A] border-t border-slate-800 px-4 py-3 space-y-3 animate-in fade-in text-xs">
            <div className="space-y-1 pb-2 border-b border-slate-800">
              <Link
                to={ROLE_ROUTES[role] || '/'}
                onClick={() => setMobileMenuOpen(false)}
                aria-current={isDashboardActive ? 'page' : undefined}
                className={`block px-3 py-2 rounded-lg text-xs font-medium ${
                  isDashboardActive
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                Dashboard
              </Link>
              {(role === 'HOSPITAL_AUTHORITY' || role === 'GOVERNMENT_AUTHORITY') && (
                <Link
                  to="/personnel"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-current={isPersonnelActive ? 'page' : undefined}
                  className={`block px-3 py-2 rounded-lg text-xs font-medium ${
                    isPersonnelActive
                      ? 'bg-slate-800 text-white font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  Personnel Directory
                </Link>
              )}
            </div>

            <div className="pt-1">
              <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
                Switch Operational Context
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {DEMO_ROLES_LIST.map((r) => (
                  <button
                    key={r.role}
                    type="button"
                    onClick={() => handleSwitchRole(r.role)}
                    className={`p-2 rounded-lg border text-left text-[11px] font-medium transition-colors ${
                      r.role === role
                        ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {r.title}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-slate-400 text-xs">
              <span className="truncate max-w-[200px]">{user?.name} ({user?.facility_name || 'CPCB'})</span>
              <button
                type="button"
                onClick={handleLogout}
                className="text-red-400 font-semibold hover:text-red-300"
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Global Real-Time Critical Incident Alert Banner (AX-02, role=alert) */}
      {alerts && alerts.length > 0 && (
        <div className="bg-red-950/90 border-b border-red-800/80 px-4 py-2.5 text-white" role="alert" aria-live="assertive">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="p-1 rounded bg-red-800/80 text-white shrink-0">
                <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
              </span>
              <span className="font-semibold tracking-wide uppercase text-red-200 text-[10px] shrink-0">
                CPCB Risk Engine Flag:
              </span>
              <span className="truncate text-red-100 font-medium">
                {alerts[0].message || alerts[0].title || 'Statutory anomaly detected in chain of custody'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => dismissAlert(alerts[0].id)}
              className="p-1 text-red-300 hover:text-white rounded-md transition-colors shrink-0"
              aria-label="Dismiss alert"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 focus:outline-none">
        {children}
      </main>

      {/* Enterprise Regulatory Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-5 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-[11px]">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">BioTrace (NidusClean)</span>
            <span>&bull;</span>
            <span>Central Pollution Control Board BMW Rules 2016 Compliant</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Server-side PostGIS & RBAC Enforced</span>
            <span>&bull;</span>
            <span>Cryptographic Form IV Ledger</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
