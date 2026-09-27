import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, ROLE_ROUTES, DEMO_ROLES_LIST } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
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
  ExternalLink,
  Menu,
  Users
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

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(() => setBackendStatus('connected'))
      .catch(() => setBackendStatus('disconnected'));
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const currentRoleMeta = demoRoles.find(r => r.role === role) || demoRoles[0];
  const RoleIcon = ROLE_ICONS[role] || ShieldCheck;

  return (
    <div className="min-h-screen bg-cream-50/60 flex flex-col font-sans text-steel-950">
      {/* Top Main Navigation Header */}
      <header className="bg-steel-950 text-cream-50 shadow-nav border-b border-steel-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Product Name */}
            <div className="flex items-center space-x-6">
              <Link to={ROLE_ROUTES[role] || '/'} className="flex items-center space-x-3 group">
                <div className="w-10 h-10 rounded bg-steel-900 flex items-center justify-center border border-steel-800">
                  <ShieldCheck className="w-6 h-6 text-biohazard-500" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xl font-serif font-bold tracking-wide text-cream-50">BioTrace</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-biohazard-700 text-white font-mono font-bold uppercase tracking-wider border border-biohazard-600">
                      NidusClean
                    </span>
                  </div>
                  <p className="text-[11px] text-cream-300/80 font-mono leading-tight">BMW Digital Chain-of-Custody</p>
                </div>
              </Link>

              {/* Navigation Tabs */}
              <nav className="hidden md:flex items-center space-x-2 pl-4 border-l border-steel-800">
                <Link
                  to={ROLE_ROUTES[role] || '/'}
                  className={`px-3 py-1.5 rounded text-xs font-mono font-medium transition ${
                    location.pathname !== '/personnel'
                      ? 'bg-steel-800 text-white font-bold'
                      : 'text-cream-300 hover:text-white hover:bg-steel-800'
                  }`}
                >
                  Dashboard
                </Link>

                {(role === 'HOSPITAL_AUTHORITY' || role === 'GOVERNMENT_AUTHORITY') && (
                  <Link
                    to="/personnel"
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-mono font-medium transition ${
                      location.pathname === '/personnel'
                        ? 'bg-forest-800 text-white font-bold border border-forest-600'
                        : 'text-cream-300 hover:text-white hover:bg-steel-800'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 text-forest-400" />
                    <span>Personnel</span>
                  </Link>
                )}
              </nav>
            </div>

            {/* Right Controls: Status, Quick Role Switcher, Profile */}
            <div className="flex items-center space-x-3">
              {/* Live Sync Mode Status (Socket.IO / Polling) */}
              <div className="hidden lg:flex items-center">
                {syncMode === 'websocket' ? (
                  <span className="inline-flex items-center text-xs font-mono font-semibold px-2.5 py-1 rounded bg-forest-950 text-forest-300 border border-forest-800" title="Real-Time WebSocket Connected">
                    <span className="relative flex h-2 w-2 mr-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-forest-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-forest-400"></span>
                    </span>
                    Live Sockets
                  </span>
                ) : syncMode === 'polling' ? (
                  <span className="inline-flex items-center text-xs font-mono font-semibold px-2.5 py-1 rounded bg-hazmat-950 text-hazmat-300 border border-hazmat-800" title="Short Polling Fallback Active (5s)">
                    <RefreshCw className="w-3 h-3 mr-1.5 animate-spin text-hazmat-400" />
                    Polling (5s)
                  </span>
                ) : (
                  <span className="inline-flex items-center text-xs font-mono font-semibold px-2.5 py-1 rounded bg-steel-900 text-steel-400 border border-steel-700">
                    <Activity className="w-3 h-3 mr-1.5 animate-spin text-steel-400" />
                    Connecting...
                  </span>
                )}
              </div>

              {/* API Gateway Status */}
              <div className="hidden sm:flex items-center">
                {backendStatus === 'connected' ? (
                  <span className="inline-flex items-center text-xs font-mono font-semibold px-2 py-0.5 rounded bg-forest-950 text-forest-300 border border-forest-800">
                    <CheckCircle2 className="w-3 h-3 mr-1 text-forest-400" />
                    API
                  </span>
                ) : backendStatus === 'checking' ? (
                  <span className="inline-flex items-center text-xs font-mono font-semibold px-2 py-0.5 rounded bg-hazmat-950 text-hazmat-300 border border-hazmat-800">
                    <Activity className="w-3 h-3 mr-1 animate-spin text-hazmat-400" />
                    API
                  </span>
                ) : (
                  <span className="inline-flex items-center text-xs font-mono font-semibold px-2 py-0.5 rounded bg-biohazard-950 text-biohazard-300 border border-biohazard-800">
                    <AlertCircle className="w-3 h-3 mr-1 text-biohazard-400" />
                    API
                  </span>
                )}
              </div>

              {/* Solid Non-Interactive Role Badge */}
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded bg-steel-900 border border-steel-700 text-xs font-medium text-cream-100">
                <RoleIcon className="w-4 h-4 text-biohazard-400" />
                <span className="hidden sm:inline font-semibold">{currentRoleMeta?.title || role}</span>
              </div>

              {/* User Profile & Logout */}
              <div className="flex items-center pl-2 border-l border-steel-800 space-x-2">
                <div className="text-right hidden md:block">
                  <div className="text-xs font-serif font-bold text-cream-100 leading-tight">{user?.name}</div>
                  <div className="text-[11px] text-cream-300/80 font-mono leading-tight truncate max-w-[150px]">
                    {user?.facility_name || user?.facility?.name || 'Regulatory Authority'}
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="p-2 rounded bg-steel-900 hover:bg-steel-800 border border-steel-700 text-cream-200 hover:text-cream-50 transition"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>

                {/* Mobile Menu Toggle */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="sm:hidden p-2 rounded bg-steel-900 hover:bg-steel-800 border border-steel-700 text-cream-100 transition"
                  title="Toggle Mobile Menu"
                >
                  <Menu className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Subheader Drawer */}
        {mobileMenuOpen && (
          <div className="sm:hidden bg-steel-900 border-t border-steel-800 px-4 py-3 space-y-2 animate-fade-in text-xs font-mono">
            <div className="flex items-center justify-between py-1 border-b border-steel-800">
              <span className="text-cream-300 font-medium">Active Facility:</span>
              <span className="font-semibold text-white truncate max-w-[200px]">
                {user?.facility_name || user?.facility?.name || 'Regulatory Authority'}
              </span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-steel-800">
              <span className="text-cream-300 font-medium">Sync Mode:</span>
              <span className="font-semibold text-forest-300">
                {syncMode === 'websocket' ? 'WebSocket (Real-Time)' : syncMode === 'polling' ? 'Short Polling (5s)' : 'Connecting...'}
              </span>
            </div>
            <div className="pt-2 flex justify-end">
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 bg-biohazard-700 hover:bg-biohazard-800 text-white rounded flex items-center space-x-1 font-semibold"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </header>



      {/* Floating Real-Time Toast Alerts Container */}
      <div className="fixed top-20 right-4 z-[9999] w-96 max-w-[calc(100vw-2rem)] space-y-2 pointer-events-none font-sans">
        {alerts && alerts.map((alert) => (
          <div
            key={alert.id}
            className={`pointer-events-auto p-4 rounded border-2 transition-all duration-300 shadow-modal ${
              alert.type === 'critical'
                ? 'bg-biohazard-950 text-cream-50 border-biohazard-600'
                : 'bg-hazmat-950 text-cream-50 border-hazmat-600'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start space-x-3">
                <div className={`p-1.5 rounded mt-0.5 ${
                  alert.type === 'critical' ? 'bg-biohazard-700 text-white' : 'bg-hazmat-500 text-steel-950 font-bold'
                }`}>
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-serif font-bold text-xs leading-snug">{alert.title}</h4>
                    {alert.code && (
                      <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-white/20 uppercase">
                        {alert.code}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-cream-200 mt-1 leading-relaxed">
                    {alert.message}
                  </p>
                  <div className="mt-2 flex items-center space-x-3">
                    <button
                      onClick={() => {
                        dismissAlert(alert.id);
                        if (alert.code?.startsWith('INS-') || alert.type === 'critical') {
                          navigate('/inspector');
                        } else {
                          navigate('/transport');
                        }
                      }}
                      className="text-[11px] font-mono font-bold text-hazmat-300 hover:text-white flex items-center space-x-1"
                    >
                      <span>Investigate Details</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                    <span className="text-[10px] text-cream-400 font-mono">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => dismissAlert(alert.id)}
                className="text-cream-400 hover:text-white p-1 rounded transition"
                title="Dismiss Alert"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-steel-950 border-t border-steel-800 py-4 text-xs text-cream-300">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-cream-200">
            <span className="font-serif font-bold text-cream-100">BioTrace Platform</span>
            <span>&bull;</span>
            <span className="font-mono text-[11px] text-cream-400">Bio-Medical Waste Management Rules 2016 Enforcement</span>
          </div>
          <div className="flex items-center space-x-4 font-mono text-[11px] text-cream-400">
            <a href="#terms" onClick={(e) => e.preventDefault()} className="hover:text-cream-100 underline">
              Terms of Service
            </a>
            <span>&bull;</span>
            <a href="#privacy" onClick={(e) => e.preventDefault()} className="hover:text-cream-100 underline">
              Privacy Policy
            </a>
            <span>&bull;</span>
            <span className="text-steel-500">Statutory Portal v1.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
