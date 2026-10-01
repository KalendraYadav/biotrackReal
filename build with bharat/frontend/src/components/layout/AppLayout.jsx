import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, ROLE_ROUTES } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { SkipToContent } from '../ui/SkipToContent';
import BioTraceMark from '../brand/BioTraceMark';
import Button from '../ui/Button';
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
  const { user, role, logout, demoRoles } = useAuth();
  const { isConnected, syncMode, alerts, dismissAlert } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();

  const [backendStatus, setBackendStatus] = useState('checking');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [identityCardOpen, setIdentityCardOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const identityRef = useRef(null);

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(() => setBackendStatus('connected'))
      .catch(() => setBackendStatus('disconnected'));
  }, []);

  // Close identity card on click outside
  useEffect(() => {
    if (!identityCardOpen) return;
    function handleClickOutside(event) {
      if (identityRef.current && !identityRef.current.contains(event.target)) {
        setIdentityCardOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [identityCardOpen]);

  const handleLogoutClick = () => {
    setIdentityCardOpen(false);
    setMobileMenuOpen(false);
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setShowLogoutModal(false);
    logout();
    navigate('/login');
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
            <div className="flex items-center gap-6 min-w-0">
              <Link 
                to={ROLE_ROUTES[role] || '/'} 
                className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-lg py-1 min-w-0"
                aria-label="BioTrace home dashboard"
              >
                <div className="p-1 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 shadow-xs group-hover:border-cyan-400 transition-colors">
                  <BioTraceMark className="w-5 h-8 drop-shadow" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="text-base sm:text-lg font-bold tracking-tight text-white leading-none">
                      <strong className="font-extrabold text-white">BIO</strong>
                      <span className="font-light text-[#D9E9FB] ml-[0.04em]">TRACE</span>
                    </span>
                    <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider bg-[#0C477D] text-cyan-300 border border-[#36B9EE]/50 shrink-0">
                      CPCB BMW
                    </span>
                  </div>
                  <p className="text-[10px] text-cyan-200/80 font-mono leading-none mt-1 hidden sm:block truncate">CPCB BMW Chain of Custody</p>
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

                {(role === 'HOSPITAL_AUTHORITY' || role === 'GOVERNMENT_AUTHORITY' || role === 'TREATMENT_FACILITY' || role === 'COMPLIANCE_INSPECTOR') && (
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
            <div className="flex items-center gap-2 sm:gap-3.5 shrink-0">
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

              {/* Server-Authoritative Operational Identity Display (RBAC Bound) */}
              <div className="relative hidden md:block" ref={identityRef}>
                <button
                  type="button"
                  onClick={() => setIdentityCardOpen(!identityCardOpen)}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[#083569]/90 hover:bg-[#0C477D] border border-[#1E5692] text-xs font-medium text-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 group"
                  aria-expanded={identityCardOpen}
                  aria-label="View authenticated statutory operational identity"
                  title="Operational Duty Identity"
                >
                  <div className="p-1 rounded bg-[#00C49E]/15 text-[#00C49E]">
                    <RoleIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  </div>
                  <div className="text-left min-w-0">
                    <div className="text-[9px] font-mono uppercase tracking-wider text-cyan-300 font-bold leading-none">
                      OPERATIONAL IDENTITY
                    </div>
                    <div className="font-semibold text-white truncate max-w-[130px] sm:max-w-[160px] leading-tight mt-0.5">
                      {currentRoleMeta?.title || role}
                    </div>
                  </div>
                  <ChevronDown className={`w-3 h-3 text-cyan-200/80 transition-transform duration-200 ${identityCardOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>

                {identityCardOpen && (
                  <div 
                    role="dialog"
                    aria-label="Statutory Identity Details"
                    className="absolute right-0 mt-1.5 w-80 rounded-xl bg-[#072B57] border border-[#1E5692] shadow-2xl p-3 z-50 text-xs animate-in fade-in slide-in-from-top-1"
                  >
                    <div className="pb-2.5 border-b border-[#1E5692]/60">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-cyan-300 uppercase tracking-wider">
                          SIGNED IN AS
                        </span>
                        <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          {user?.verification_status || 'VERIFIED'}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white mt-1">
                        {currentRoleMeta?.title || role}
                      </h4>
                      <p className="text-[11px] text-cyan-100 font-medium">
                        {user?.name}
                      </p>
                      <p className="text-[10px] text-slate-300 mt-0.5">
                        {user?.facility_name || user?.facility?.name || 'CPCB Regulatory Authority'}
                      </p>
                    </div>

                    <div className="py-2.5 space-y-1.5 text-[11px] text-slate-300">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Statutory Role:</span>
                        <span className="font-mono text-cyan-200 font-medium">{role}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Email:</span>
                        <span className="font-mono text-slate-200">{user?.email}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Jurisdiction:</span>
                        <span className="text-slate-200 truncate max-w-[150px]">{user?.facility_name || user?.facility?.name || 'CPCB / State Board'}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#1E5692]/60 flex items-center justify-between">
                      <p className="text-[10px] text-slate-400 italic">
                        Role is bound to authenticated credentials.
                      </p>
                      <button
                        type="button"
                        onClick={handleLogoutClick}
                        className="px-2.5 py-1 rounded bg-red-950/60 hover:bg-red-900 border border-red-700/60 text-red-200 text-[11px] font-medium transition-colors"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* User Profile & Actions */}
              <div className="flex items-center pl-1.5 sm:pl-2 border-l border-slate-800/80 gap-1.5 sm:gap-2">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-white leading-tight">{user?.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono leading-tight truncate max-w-[140px]">
                    {user?.facility_name || user?.facility?.name || 'Regulatory Authority'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogoutClick}
                  className="p-2 rounded-lg bg-[#083569]/90 hover:bg-[#0C477D] border border-[#1E5692] text-slate-300 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                  aria-label="Sign out of BioTrace"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                </button>

                {/* Mobile Menu Toggle */}
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2 rounded-lg bg-[#083569]/90 hover:bg-[#0C477D] border border-[#1E5692] text-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
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
          <div className="md:hidden bg-[#03275D] border-t border-[#104F89] px-4 py-3 space-y-3 animate-in fade-in text-xs text-white shadow-xl">
            <div className="space-y-1 pb-2 border-b border-[#104F89]">
              <Link
                to={ROLE_ROUTES[role] || '/'}
                onClick={() => setMobileMenuOpen(false)}
                aria-current={isDashboardActive ? 'page' : undefined}
                className={`block px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isDashboardActive
                    ? 'bg-[#083569] text-white font-semibold border-l-2 border-[#00C49E]'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                Dashboard
              </Link>
              {(role === 'HOSPITAL_AUTHORITY' || role === 'GOVERNMENT_AUTHORITY') && (
                <Link
                  to="/personnel"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-current={isPersonnelActive ? 'page' : undefined}
                  className={`block px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isPersonnelActive
                      ? 'bg-[#083569] text-white font-semibold border-l-2 border-[#00C49E]'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Personnel Directory
                </Link>
              )}
            </div>

            <div className="pt-2 pb-1 border-t border-[#104F89]">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-mono font-bold text-cyan-300 uppercase tracking-wider">
                  OPERATIONAL IDENTITY
                </p>
                <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  {user?.verification_status || 'VERIFIED'}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#083569]/90 border border-[#1E5692] text-xs">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="p-1.5 rounded-md bg-[#00C49E]/15 text-[#00C49E]">
                    <RoleIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-white text-xs leading-tight">{currentRoleMeta?.title || role}</div>
                    <div className="text-[11px] text-cyan-200 mt-0.5">{user?.name}</div>
                  </div>
                </div>
                <div className="text-[10px] text-slate-300 font-mono mt-1">
                  {user?.facility_name || user?.facility?.name || 'CPCB Regulatory Office'}
                </div>
                <div className="text-[10px] text-slate-400 mt-2 italic border-t border-[#1E5692]/60 pt-1.5">
                  Role is bound to authenticated credentials.
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[#104F89] flex items-center justify-between text-xs">
              <div className="min-w-0 pr-2">
                <span className="truncate block font-medium text-white">{user?.name}</span>
                <span className="text-[10px] text-cyan-200/70 font-mono truncate block">
                  {user?.facility_name || user?.facility?.name || 'CPCB Regulatory Office'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogoutClick}
                className="text-red-400 font-semibold hover:text-red-300 shrink-0 px-2.5 py-1 rounded bg-red-950/40 border border-red-800/40"
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-[11px] text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span className="font-bold text-slate-800">BIOTrace</span>
            <span>&bull;</span>
            <span>Central Pollution Control Board BMW Rules 2016 Compliant</span>
          </div>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-4 text-slate-400">
            <span>Server-side PostGIS & RBAC Enforced</span>
            <span>&bull;</span>
            <span>Cryptographic Form IV Ledger</span>
          </div>
        </div>
      </footer>

      {/* Sign Out Confirmation Modal */}
      {showLogoutModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-dialog-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isLoggingOut) {
              setShowLogoutModal(false);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && !isLoggingOut) {
              setShowLogoutModal(false);
            }
          }}
        >
          <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 sm:p-6 text-left">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl border bg-rose-50 border-rose-200 text-rose-600">
                  <LogOut className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="logout-dialog-title" className="text-base font-bold text-slate-900">
                    Sign Out
                  </h3>
                  <p className="text-xs text-slate-500">
                    Session termination
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isLoggingOut}
                onClick={() => setShowLogoutModal(false)}
                className="text-slate-400 hover:text-slate-700 disabled:opacity-50"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 mb-6">
              <p className="text-sm font-medium text-slate-800">
                Are you sure you want to sign out of BIOTrace?
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                You will need to authenticate again to access your account.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button
                variant="ghost"
                size="sm"
                disabled={isLoggingOut}
                onClick={() => setShowLogoutModal(false)}
              >
                Cancel
              </Button>

              <Button
                variant="destructive"
                size="sm"
                loading={isLoggingOut}
                disabled={isLoggingOut}
                onClick={confirmLogout}
                icon={LogOut}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
