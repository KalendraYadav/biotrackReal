import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, DEMO_ROLES_LIST } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
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
  Radio,
  Zap
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
    <div className="min-h-screen bg-[#0B132B] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans relative overflow-hidden">
      {/* Subtle ambient gradient aura */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-4xl relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-3.5 shadow-lg shadow-emerald-950/50">
            <ShieldCheck className="w-8 h-8 text-emerald-400" aria-hidden="true" />
          </div>
          <div className="flex items-center justify-center gap-3 mb-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">BioTrace</h1>
            <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-700/60 shadow-xs">
              NidusClean
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 font-mono max-w-xl mx-auto uppercase tracking-wide">
            Biomedical Waste Digital Chain of Custody &amp; Real-Time Statutory Monitoring
          </p>
          <div className="flex items-center justify-center gap-2.5 mt-2.5 text-xs text-slate-400 font-mono">
            <span>CPCB Rule 2016 Compliant</span>
            <span className="text-slate-600" aria-hidden="true">&bull;</span>
            <span>Server-Side PostGIS &amp; RBAC Enforced</span>
          </div>
        </div>

        {/* Main Authentication Card */}
        <div className="bg-white rounded-2xl border border-slate-700/80 overflow-hidden shadow-2xl">
          {/* Demo Role Selector Section (3x2 Grid - Zero Truncation) */}
          <div className="bg-slate-50/90 border-b border-slate-200/90 p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 mb-4">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Duty Role Terminal Access
                </h2>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                Select role for instant evaluation (demo password: <span className="font-semibold text-slate-700">password123</span>)
              </span>
            </div>

            {/* 6 Role Cards in 2x3 Grid */}
            <div 
              role="radiogroup" 
              aria-label="Select demo duty role"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
            >
              {DEMO_ROLES_LIST.map((demo) => {
                const Icon = ROLE_ICONS[demo.role] || ShieldCheck;
                const isSelected = selectedRole === demo.role;

                return (
                  <button
                    key={demo.role}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => handleSelectRole(demo)}
                    onDoubleClick={() => handleInstantDemoLogin(demo)}
                    className={`p-3.5 rounded-xl text-left transition-all border flex items-start justify-between relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                      isSelected
                        ? 'bg-emerald-50/70 border-emerald-600 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'bg-white hover:bg-slate-100/80 border-slate-200 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div 
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs"
                        style={{ backgroundColor: demo.accentColor }}
                        aria-hidden="true"
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-900 leading-snug">
                          {demo.title}
                        </div>
                        <div className="text-[11px] text-slate-600 truncate mt-0.5 font-medium">
                          {demo.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                          {demo.facility}
                        </div>
                      </div>
                    </div>
                    {isSelected ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 ml-2 mt-0.5" aria-hidden="true" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-200 shrink-0 ml-2 mt-1.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form & Actions Area */}
          <div className="p-6 sm:p-8 bg-white">
            {(errorMessage || authError) && (
              <div 
                role="alert"
                className="mb-6 rounded-xl bg-rose-50 border border-rose-300 p-4 text-sm text-rose-950 flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <div className="font-bold">Authentication failed</div>
                  <div className="text-xs text-rose-800 mt-0.5">{errorMessage || authError}</div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Email Field */}
                <Input
                  id="login-email"
                  label="Official Registered Email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. hospital@demo.com"
                  leftIcon={Mail}
                />

                {/* Password Field */}
                <Input
                  id="login-password"
                  label="Access Password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  leftIcon={Lock}
                />
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-col sm:flex-row items-center justify-between pt-4 gap-3 border-t border-slate-100">
                <div className="text-xs text-slate-500 flex items-center gap-1.5 self-start sm:self-center">
                  <span>Selected authority:</span>
                  <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                    {DEMO_ROLES_LIST.find(d => d.role === selectedRole)?.title || selectedRole}
                  </span>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={() => handleInstantDemoLogin(DEMO_ROLES_LIST.find(d => d.role === selectedRole) || DEMO_ROLES_LIST[0])}
                    disabled={submitting}
                    icon={Zap}
                    className="flex-1 sm:flex-initial"
                  >
                    1-Click Demo Login
                  </Button>

                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={submitting}
                    icon={ArrowRight}
                    className="flex-1 sm:flex-initial"
                  >
                    Authenticate &amp; Enter
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Security & Compliance Footer Note */}
        <div className="mt-8 text-center space-y-2">
          <p className="text-xs text-slate-400 font-mono">
            Protected by BioTrace JWT &amp; Bcrypt Authentication &bull; Monitored by Real-Time Statutory Risk Engine
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-slate-400 font-mono">
            <span className="text-slate-500">CPCB Compliance Terms of Service</span>
            <span aria-hidden="true">&bull;</span>
            <span className="text-slate-500">Statutory Data Privacy Policy</span>
          </div>
        </div>
      </div>
    </div>
  );
}
