import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BioTraceMark from '../components/brand/BioTraceMark';
import IndiaSilhouette from '../components/brand/IndiaSilhouette';
import { 
  UserRound, 
  ChevronDown, 
  ArrowRight, 
  Hospital, 
  Truck, 
  Factory, 
  Building2, 
  CheckSquare2, 
  Cloud, 
  X,
  Lock,
  Mail,
  AlertCircle,
  Loader2,
  CheckCircle2,
  KeyRound
} from 'lucide-react';

/**
 * 6 Statutory Roles per visual reference specification & backend RBAC contracts
 */
const STATUTORY_ROLES = [
  {
    roleKey: 'HOSPITAL_AUTHORITY',
    name: 'Hospital Authority',
    description: 'Generate & Manage Waste',
    tone: 'green',
    icon: Hospital,
    borderColor: '#00CA92',
    iconBg: 'rgba(0, 202, 146, 0.22)',
    iconColor: '#91F1CC'
  },
  {
    roleKey: 'COLLECTION_OFFICER',
    name: 'Collection Officer',
    description: 'Collect from Generators',
    tone: 'amber',
    icon: Truck,
    borderColor: '#F59E0B',
    iconBg: 'rgba(245, 158, 11, 0.22)',
    iconColor: '#FDE68A'
  },
  {
    roleKey: 'TRANSPORT_OFFICER',
    name: 'Transport Officer',
    description: 'Track Waste Movement',
    tone: 'blue',
    icon: Truck,
    borderColor: '#3B82F6',
    iconBg: 'rgba(59, 130, 246, 0.22)',
    iconColor: '#93C5FD'
  },
  {
    roleKey: 'TREATMENT_FACILITY',
    name: 'Treatment Facility (CBWTF)',
    description: 'Process & Treat Waste',
    tone: 'orange',
    icon: Factory,
    borderColor: '#F97316',
    iconBg: 'rgba(249, 115, 22, 0.22)',
    iconColor: '#FDBA74'
  },
  {
    roleKey: 'GOVERNMENT_AUTHORITY',
    name: 'Government Authority',
    description: 'Regulate & Monitor Compliance',
    tone: 'violet',
    icon: Building2,
    borderColor: '#8B5CF6',
    iconBg: 'rgba(139, 92, 246, 0.22)',
    iconColor: '#DDD6FE'
  },
  {
    roleKey: 'COMPLIANCE_INSPECTOR',
    name: 'Compliance Inspector',
    description: 'Audit & Field Inspection',
    tone: 'cyan',
    icon: CheckSquare2,
    borderColor: '#06B6D4',
    iconBg: 'rgba(6, 182, 212, 0.22)',
    iconColor: '#A5F3FC'
  }
];

export default function Login() {
  const { login, loginAsDemoRole, error: authError } = useAuth();
  const navigate = useNavigate();

  // State
  const [selectedRole, setSelectedRole] = useState(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Custom credential toggle state (preserves existing manual login functionality)
  const [showManualLogin, setShowManualLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Environment Selector state
  const [isCloudMenuOpen, setIsCloudMenuOpen] = useState(false);
  const [activeEnvironment, setActiveEnvironment] = useState('Production Cloud');

  const modalRef = useRef(null);
  const triggerRef = useRef(null);

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsRoleModalOpen(false);
        setIsCloudMenuOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle selecting a role from the modal
  const handleSelectRole = (role) => {
    setSelectedRole(role);
    setIsRoleModalOpen(false);
    setErrorMessage('');
    triggerRef.current?.focus();
  };

  // Primary Enter handler (connects to real backend authentication)
  const handleEnterClick = async () => {
    if (!selectedRole) {
      setIsRoleModalOpen(true);
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const result = await loginAsDemoRole(selectedRole.roleKey);
      setIsSubmitting(false);

      if (result.success) {
        navigate(result.dashboardRoute);
      } else {
        setErrorMessage(result.error || 'Authentication failed. Please verify statutory gateway connectivity.');
      }
    } catch (err) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'Network error communicating with authentication service.');
    }
  };

  // Manual credentials submit handler
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please enter both your registered email and password.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const result = await login(email, password);
      setIsSubmitting(false);

      if (result.success) {
        navigate(result.dashboardRoute);
      } else {
        setErrorMessage(result.error || 'Invalid official credentials.');
      }
    } catch (err) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'Authentication gateway connection failed.');
    }
  };

  return (
    <div className="biotrace-page min-h-screen flex flex-col justify-between relative selection:bg-emerald-500/30 selection:text-white">
      {/* Atmospheric lighting and depth gradient overlays */}
      <div className="biotrace-atmosphere" aria-hidden="true" />

      {/* Top Navigation Bar: Production Cloud Selector */}
      <div className="relative z-20 w-full px-4 sm:px-8 pt-6 sm:pt-8 flex justify-end">
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsCloudMenuOpen(!isCloudMenuOpen)}
            aria-haspopup="true"
            aria-expanded={isCloudMenuOpen}
            className="flex items-center gap-2.5 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full text-white text-xs sm:text-sm font-medium border border-[#83b4e2]/80 bg-[#104f89]/75 backdrop-blur-md hover:bg-[#104f89]/95 hover:border-[#a5d2ff] transition-all shadow-lg shadow-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            <Cloud className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-200" aria-hidden="true" />
            <span>{activeEnvironment}</span>
            <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300 transition-transform duration-200 ${isCloudMenuOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>

          {/* Cloud Environment Dropdown Menu */}
          {isCloudMenuOpen && (
            <div 
              role="menu"
              className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#092c57]/95 border border-[#83b4e2]/70 p-2 shadow-2xl backdrop-blur-xl z-30 animate-bio-modal text-left"
            >
              <div className="px-3 py-2 border-b border-[#83b4e2]/30 mb-1">
                <div className="text-[11px] font-mono uppercase tracking-wider text-cyan-200/90 font-semibold">
                  Statutory Infrastructure
                </div>
                <div className="text-[10px] text-slate-300 mt-0.5">
                  CPCB Digital Chain of Custody Gateway
                </div>
              </div>

              {[
                { name: 'Production Cloud', tag: 'Primary Live', ping: 'bg-emerald-400' },
                { name: 'CPCB Regulatory Sandbox', tag: 'Staging', ping: 'bg-amber-400' },
                { name: 'Disaster Recovery Node', tag: 'Hot Standby', ping: 'bg-cyan-400' }
              ].map((env) => (
                <button
                  key={env.name}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setActiveEnvironment(env.name);
                    setIsCloudMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    activeEnvironment === env.name
                      ? 'bg-blue-600/40 text-white font-semibold'
                      : 'text-slate-200 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${env.ping}`} />
                    <span>{env.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-300/80 font-mono">{env.tag}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-6 sm:py-10 max-w-4xl mx-auto w-full">
        {/* Brand Header */}
        <header className="text-center flex flex-col items-center mb-8 sm:mb-12">
          {/* Authentic Geometric BioTrace "B" Mark (Four Quadrants) */}
          <div className="mb-4 sm:mb-6 transition-transform hover:scale-105 duration-300">
            <BioTraceMark className="w-[72px] h-[116px] sm:w-[90px] sm:h-[144px]" />
          </div>

          {/* Institutional Wordmark */}
          <h1 className="text-4xl sm:text-6xl lg:text-[4.25rem] font-light tracking-[0.14em] text-white flex items-center justify-center leading-none">
            <strong className="font-extrabold text-white">BIO</strong>
            <span className="font-light text-[#D9E9FB] ml-[0.04em]">TRACE</span>
          </h1>

          {/* Restrained Tricolor Accent (Saffron, White, Green) */}
          <div className="flex items-center justify-center gap-2 my-3 sm:my-4" aria-hidden="true">
            <span className="w-14 sm:w-16 h-1 rounded-full bg-[#FF881B]" />
            <span className="w-14 sm:w-16 h-1 rounded-full bg-[#F5F9FF]" />
            <span className="w-14 sm:w-16 h-1 rounded-full bg-[#00CA92]" />
          </div>

          {/* Primary Tagline */}
          <p className="text-xs sm:text-sm font-semibold tracking-[0.28em] text-[#C6E2FB] uppercase">
            MAKE INDIA CLEAN
          </p>

          {/* Secondary Tagline */}
          <p className="text-sm sm:text-lg text-[#9CC5EC] font-normal leading-relaxed mt-2.5 max-w-md sm:max-w-xl">
            Digital Chain of Custody for
            <br />
            Biomedical Waste Management
          </p>
        </header>

        {/* Central Glass Entry Panel */}
        <section 
          aria-label="BioTrace Entry Panel"
          className="w-full max-w-[760px] rounded-[1.7rem] border border-[#78AADB]/60 bg-[#104F89]/65 backdrop-blur-xl p-6 sm:p-12 shadow-2xl shadow-[#021838]/80 text-center relative"
        >
          {/* Role Selector Trigger Button */}
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setIsRoleModalOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={isRoleModalOpen}
            className={`w-full min-h-[76px] sm:min-h-[88px] rounded-[1.4rem] border-2 border-[#83B4E2] bg-[#0C477D]/85 hover:bg-[#0C477D] text-white flex items-center justify-between px-5 sm:px-7 text-lg sm:text-2xl font-medium transition-all shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-400/40 group ${
              selectedRole ? 'ring-2 ring-emerald-400/30' : ''
            }`}
          >
            <div className="flex items-center gap-4 min-w-0">
              <div 
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors"
                style={{
                  backgroundColor: selectedRole ? selectedRole.iconBg : 'rgba(255, 255, 255, 0.1)',
                  color: selectedRole ? selectedRole.iconColor : '#91F1CC'
                }}
              >
                {selectedRole ? (
                  <selectedRole.icon className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
                ) : (
                  <UserRound className="w-6 h-6 sm:w-7 sm:h-7 text-[#91F1CC]" aria-hidden="true" />
                )}
              </div>

              <div className="text-left min-w-0">
                <span className="block truncate font-semibold text-white">
                  {selectedRole ? selectedRole.name : 'Select Role'}
                </span>
                {selectedRole && (
                  <span className="block text-xs sm:text-sm text-[#A8C7E5] truncate font-normal">
                    {selectedRole.description}
                  </span>
                )}
              </div>
            </div>

            <ChevronDown 
              className={`w-6 h-6 sm:w-7 sm:h-7 text-[#C9E1FA] shrink-0 ml-3 transition-transform duration-200 group-hover:translate-y-0.5 ${
                isRoleModalOpen ? 'rotate-180' : ''
              }`} 
              aria-hidden="true" 
            />
          </button>

          {/* Primary Enter Button */}
          <button
            type="button"
            onClick={handleEnterClick}
            disabled={!selectedRole || isSubmitting}
            className={`w-full min-h-[76px] sm:min-h-[88px] mt-6 sm:mt-8 rounded-[1.4rem] border-2 border-[#36B9EE] biotrace-enter-btn text-white flex items-center justify-between px-6 sm:px-8 text-xl sm:text-2xl font-bold tracking-wide transition-all shadow-xl shadow-cyan-950/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-400/40 ${
              !selectedRole || isSubmitting ? 'opacity-65 cursor-not-allowed filter-none' : 'cursor-pointer'
            }`}
          >
            <div className="flex items-center gap-3">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin text-white" aria-hidden="true" />
                  <span>Entering Platform...</span>
                </>
              ) : (
                <span>ENTER</span>
              )}
            </div>

            <div className="flex items-center">
              {/* Divider Line */}
              <span className="h-10 sm:h-12 w-[1px] bg-[#B5F2FF]/40 mr-4 sm:mr-6" aria-hidden="true" />
              {/* Arrow Icon */}
              <ArrowRight className="w-7 h-7 sm:w-8 sm:h-8 text-white biotrace-arrow transition-transform duration-200" aria-hidden="true" />
            </div>
          </button>

          {/* Validation & Error Messaging */}
          {(errorMessage || authError) && (
            <div 
              role="alert"
              className="mt-5 rounded-2xl bg-rose-950/80 border border-rose-500/60 p-3.5 sm:p-4 text-xs sm:text-sm text-rose-200 flex items-start gap-3 text-left animate-fade-in backdrop-blur-md"
            >
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="min-w-0">
                <div className="font-bold text-white">Statutory Authentication Error</div>
                <div className="text-rose-200/90 mt-0.5">{errorMessage || authError}</div>
              </div>
            </div>
          )}

          {/* Discreet Credentials Toggle for Registered Administrators & Custom Staff */}
          <div className="mt-6 pt-5 border-t border-[#83b4e2]/30 flex flex-col items-center">
            <button
              type="button"
              onClick={() => setShowManualLogin(!showManualLogin)}
              className="text-xs sm:text-sm text-[#A8C9E9] hover:text-white transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:underline"
            >
              <KeyRound className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{showManualLogin ? 'Hide Custom Credentials Form' : 'Staff Login: Enter with Custom Credentials'}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showManualLogin ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>

            {/* Expandable Custom Login Form */}
            {showManualLogin && (
              <form 
                onSubmit={handleManualSubmit}
                className="w-full mt-4 p-4 sm:p-5 rounded-2xl bg-[#092B54]/80 border border-[#83B4E2]/50 text-left animate-bio-modal"
              >
                <div className="text-xs font-semibold text-cyan-200 uppercase tracking-wider mb-3">
                  Statutory Staff Authentication
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-200 mb-1">
                      Official Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. hospital@demo.com"
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900/60 border border-[#83B4E2]/50 text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-200 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900/60 border border-[#83B4E2]/50 text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span>Authenticate &amp; Enter Portal</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </section>
      </main>

      {/* Institutional Legal & Geographic Footer */}
      <footer className="relative z-10 w-full px-6 sm:px-12 py-6 sm:py-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-[#C6E2FB]/90 text-xs">
        {/* Left Side: Institutional Pillars */}
        <div className="text-center sm:text-left leading-relaxed tracking-[0.26em] font-semibold">
          <div>SAFE</div>
          <div>TRACEABLE</div>
          <div>COMPLIANT</div>
          <div>CLEANER INDIA</div>
          <div className="w-14 h-0.5 bg-[#83b4e2]/60 mt-1 mx-auto sm:mx-0" aria-hidden="true" />
        </div>

        {/* Right Side: India Silhouette & People-Process-Technology */}
        <div className="flex items-center gap-3.5 text-center sm:text-left">
          <IndiaSilhouette className="w-9 h-13 text-[#9cc5ec] shrink-0" />
          <div className="tracking-[0.1em] leading-tight font-medium">
            <div>PEOPLE</div>
            <div>PROCESS</div>
            <div>TECHNOLOGY</div>
            <div className="text-[10px] text-[#83b4e2] font-normal tracking-[0.15em] mt-0.5">
              A CLEANER TOMORROW
            </div>
            <div className="w-14 h-0.5 bg-[#83b4e2]/60 mt-1 mx-auto sm:mx-0" aria-hidden="true" />
          </div>
        </div>
      </footer>

      {/* Role Selection Modal Dialog */}
      {isRoleModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#001A3C]/75 backdrop-blur-md animate-fade-in"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setIsRoleModalOpen(false);
              triggerRef.current?.focus();
            }
          }}
          role="presentation"
        >
          <div 
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="role-modal-title"
            aria-describedby="role-modal-desc"
            className="w-full max-w-[830px] rounded-[1.6rem] border border-[#83B7E7] bg-gradient-to-br from-[#123E6B]/95 to-[#052B56]/98 p-5 sm:p-8 shadow-2xl shadow-black/60 relative animate-bio-modal max-h-[90vh] overflow-y-auto"
          >
            {/* Modal Close Button */}
            <button
              type="button"
              onClick={() => {
                setIsRoleModalOpen(false);
                triggerRef.current?.focus();
              }}
              aria-label="Close role selection dialog"
              className="absolute top-4 right-4 sm:top-6 sm:right-6 text-[#C9E1FA] hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            >
              <X className="w-6 h-6 sm:w-7 sm:h-7" aria-hidden="true" />
            </button>

            {/* Modal Heading */}
            <div className="flex items-center gap-3.5 sm:gap-4 mb-6 pr-10">
              <div className="p-2.5 sm:p-3 rounded-2xl border border-[#7BA7D1]/80 bg-[#0C477D]/80 text-[#91F1CC] shrink-0">
                <UserRound className="w-6 h-6 sm:w-7 sm:h-7" aria-hidden="true" />
              </div>
              <div>
                <h2 id="role-modal-title" className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Select Your Role
                </h2>
                <p id="role-modal-desc" className="text-xs sm:text-sm text-[#A8C9E9] mt-0.5">
                  Choose your statutory role to access the BioTrace platform.
                </p>
              </div>
            </div>

            {/* Exactly 6 Statutory Roles Grid (2 Columns on Desktop, 1 Column on Small Mobile) */}
            <div 
              role="radiogroup" 
              aria-label="Statutory roles"
              className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"
            >
              {STATUTORY_ROLES.map((role) => {
                const Icon = role.icon;
                const isSelected = selectedRole?.roleKey === role.roleKey;

                return (
                  <button
                    key={role.roleKey}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => handleSelectRole(role)}
                    className="w-full min-h-[108px] sm:min-h-[120px] rounded-2xl border p-4 sm:p-5 flex items-center justify-between gap-3 text-left transition-all duration-200 bg-[#0B4E85]/70 hover:bg-[#0E5B9B]/95 hover:scale-[1.01] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 group"
                    style={{
                      borderColor: role.borderColor,
                      boxShadow: isSelected ? `0 0 0 2px ${role.borderColor}` : undefined
                    }}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Icon Container with Role Accent Tone */}
                      <div 
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center shrink-0 shadow-inner"
                        style={{
                          backgroundColor: role.iconBg,
                          color: role.iconColor
                        }}
                      >
                        <Icon className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={1.8} aria-hidden="true" />
                      </div>

                      {/* Role Copy */}
                      <div className="min-w-0">
                        <div className="font-bold text-base sm:text-lg text-white leading-snug">
                          {role.name}
                        </div>
                        <div className="text-xs sm:text-sm text-[#A8C7E5] mt-1 leading-snug line-clamp-2">
                          {role.description}
                        </div>
                      </div>
                    </div>

                    {/* Right Arrow / Selected Indicator */}
                    <div className="shrink-0 pl-1">
                      {isSelected ? (
                        <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" aria-hidden="true" />
                      ) : (
                        <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 text-[#E0EFFF] group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
