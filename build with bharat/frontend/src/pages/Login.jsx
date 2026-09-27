import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, DEMO_ROLES_LIST } from '../context/AuthContext';
import { 
  ShieldCheck, 
  Building2, 
  Truck, 
  Flame, 
  Activity, 
  Scale, 
  Lock, 
  Mail, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  EyeOff,
  Radio
} from 'lucide-react';

const ROLE_ICONS = {
  HOSPITAL_AUTHORITY: Building2,
  COLLECTION_OFFICER: ShieldCheck,
  TRANSPORT_OFFICER: Truck,
  TREATMENT_FACILITY: Flame,
  GOVERNMENT_AUTHORITY: Activity,
  COMPLIANCE_INSPECTOR: Scale
};

export default function Login() {
  const { login, loginAsDemoRole, error: authError } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('hospital@demo.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState('HOSPITAL_AUTHORITY');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSelectRole = (demo) => {
    setSelectedRole(demo.role);
    setEmail(demo.email);
    setPassword('password123');
    setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSubmitting(true);

    const result = await login(email, password);
    setSubmitting(false);

    if (result.success) {
      navigate(result.dashboardRoute);
    } else {
      setErrorMessage(result.error || 'Authentication failed. Please check your credentials.');
    }
  };

  const handleInstantDemoLogin = async (demoRole) => {
    setSelectedRole(demoRole.role);
    setEmail(demoRole.email);
    setPassword('password123');
    setErrorMessage('');
    setSubmitting(true);

    const result = await loginAsDemoRole(demoRole.role);
    setSubmitting(false);

    if (result.success) {
      navigate(result.dashboardRoute);
    } else {
      setErrorMessage(result.error || 'Demo login failed.');
    }
  };

  return (
    <div className="min-h-screen bg-steel-950 flex flex-col justify-center py-10 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-4xl px-4">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-lg bg-steel-900 border border-steel-800 mb-3">
            <ShieldCheck className="w-8 h-8 text-biohazard-500" />
          </div>
          <div className="flex items-center justify-center space-x-2.5 mb-2">
            <h1 className="text-3xl font-serif font-bold text-cream-50 tracking-wide">BioTrace</h1>
            <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold uppercase tracking-wider bg-biohazard-700 text-white border border-biohazard-600">
              NidusClean
            </span>
          </div>
          <p className="text-xs text-cream-200/80 font-mono max-w-lg mx-auto uppercase tracking-wide">
            Biomedical Waste Digital Chain-of-Custody &amp; Real-Time Compliance Platform
          </p>
          <div className="flex items-center justify-center gap-2 mt-2 text-xs text-cream-400/70 font-mono">
            <span>CPCB Rule 2016 Compliant</span>
            <span>&bull;</span>
            <span>Server-Side RBAC Enforced</span>
          </div>
        </div>

        {/* Main Authentication Container - Single elevated card with shadow-modal */}
        <div className="bg-white rounded-lg shadow-modal border-2 border-steel-800 overflow-hidden">
          {/* Demo Role Selector Bar */}
          <div className="bg-cream-50 border-b border-steel-200 p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Radio className="w-4 h-4 text-biohazard-700" />
                <h2 className="text-xs font-serif font-bold uppercase tracking-wider text-steel-900">
                  Quick Duty Role Selector (1-Click Terminal Access)
                </h2>
              </div>
              <span className="text-[11px] text-steel-500 font-mono">All demo passwords: password123</span>
            </div>

            {/* 6 Role Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              {DEMO_ROLES_LIST.map((demo) => {
                const Icon = ROLE_ICONS[demo.role] || ShieldCheck;
                const isSelected = selectedRole === demo.role;

                return (
                  <button
                    key={demo.role}
                    type="button"
                    onClick={() => handleSelectRole(demo)}
                    onDoubleClick={() => handleInstantDemoLogin(demo)}
                    className={`p-2.5 rounded text-left transition-all border flex flex-col justify-between relative ${
                      isSelected
                        ? 'bg-white border-steel-900 ring-2 ring-steel-900/20'
                        : 'bg-white/80 hover:bg-white border-steel-200 hover:border-steel-400'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div 
                          className="w-7 h-7 rounded flex items-center justify-center text-white"
                          style={{ backgroundColor: demo.accentColor }}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-forest-800" />
                        )}
                      </div>
                      <div className="font-serif font-bold text-xs text-steel-900 leading-snug line-clamp-1">
                        {demo.title}
                      </div>
                      <div className="text-[11px] text-steel-500 font-mono truncate mt-0.5">
                        {demo.name}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Area */}
          <div className="p-6 sm:p-8 bg-white">
            {(errorMessage || authError) && (
              <div className="mb-6 rounded bg-biohazard-50 border border-biohazard-300 p-4 text-sm text-biohazard-950 flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-biohazard-700 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-serif font-bold">Authentication Refused</div>
                  <div className="text-xs text-biohazard-900 mt-0.5 font-mono">{errorMessage || authError}</div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Email Field */}
                <div>
                  <label className="block text-xs font-bold text-steel-800 uppercase tracking-wider mb-1.5">
                    Official Registered Email
                  </label>
                  <div className="relative rounded">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="w-4 h-4 text-steel-400" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. hospital@demo.com"
                      className="block w-full pl-10 pr-3 py-2.5 border border-steel-300 rounded text-sm text-steel-900 placeholder-steel-400 focus:outline-none focus:border-steel-900 font-sans"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-xs font-bold text-steel-800 uppercase tracking-wider mb-1.5">
                    Access Password
                  </label>
                  <div className="relative rounded">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="w-4 h-4 text-steel-400" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="block w-full pl-10 pr-10 py-2.5 border border-steel-300 rounded text-sm text-steel-900 placeholder-steel-400 focus:outline-none focus:border-steel-900 font-sans"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-steel-400 hover:text-steel-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between pt-3 gap-3 border-t border-steel-100">
                <div className="text-xs text-steel-600 flex items-center font-mono">
                  <span>Selected Authority:</span>
                  <span className="ml-1.5 font-bold text-steel-950 font-serif">
                    {DEMO_ROLES_LIST.find(d => d.role === selectedRole)?.title || selectedRole}
                  </span>
                </div>

                <div className="flex items-center space-x-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleInstantDemoLogin(DEMO_ROLES_LIST.find(d => d.role === selectedRole) || DEMO_ROLES_LIST[0])}
                    disabled={submitting}
                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded border border-steel-300 bg-cream-50 hover:bg-cream-100 text-steel-800 text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    1-Click Terminal Access
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center px-6 py-2.5 rounded bg-forest-800 hover:bg-forest-900 text-cream-50 text-xs font-bold tracking-wider uppercase border border-forest-900 transition-colors disabled:opacity-50"
                  >
                    {submitting ? (
                      <span className="flex items-center">
                        <div className="w-3.5 h-3.5 border-2 border-cream-50 border-t-transparent rounded-full animate-spin mr-2"></div>
                        Authenticating...
                      </span>
                    ) : (
                      <span className="flex items-center">
                        Authenticate &amp; Enter <ArrowRight className="w-4 h-4 ml-1.5" />
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Security & Compliance Footer Note */}
        <div className="mt-6 text-center space-y-2">
          <p className="text-xs text-cream-300/60 font-mono">
            Protected by BioTrace JWT &amp; Bcrypt Authentication &bull; Monitored by Real-Time Statutory Risk Engine
          </p>
          <div className="flex items-center justify-center space-x-4 text-xs text-cream-400/80 font-mono">
            <a href="#terms" onClick={(e) => e.preventDefault()} className="hover:text-cream-200 underline">
              CPCB Compliance Terms of Service
            </a>
            <span>&bull;</span>
            <a href="#privacy" onClick={(e) => e.preventDefault()} className="hover:text-cream-200 underline">
              Statutory Data Privacy Policy
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
