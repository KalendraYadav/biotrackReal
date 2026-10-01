import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, ROLE_ROUTES } from '../../context/AuthContext';
import { ShieldAlert, AlertTriangle, Clock, Lock, LogOut } from 'lucide-react';
import Button from '../ui/Button';

export default function ProtectedRoute({ allowedRoles, children }) {
  const { isAuthenticated, role, loading, user, logout } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-600">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Verification Lifecycle Enforcement:
  // Operational permissions are restricted strictly to VERIFIED accounts
  const verificationStatus = user?.verification_status || 'VERIFIED';
  if (verificationStatus !== 'VERIFIED') {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-xl p-6 sm:p-8 text-center animate-fade-in">
          <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-inner bg-amber-50 border border-amber-200 text-amber-600">
            {verificationStatus === 'PENDING' ? (
              <Clock className="w-7 h-7" aria-hidden="true" />
            ) : verificationStatus === 'SUSPENDED' ? (
              <AlertTriangle className="w-7 h-7 text-orange-600" aria-hidden="true" />
            ) : (
              <Lock className="w-7 h-7 text-rose-600" aria-hidden="true" />
            )}
          </div>

          <span className="inline-block px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider mb-2 bg-slate-100 text-slate-700 border border-slate-300">
            Status: {verificationStatus}
          </span>

          <h2 className="text-xl font-bold text-slate-900 mb-2">
            {verificationStatus === 'PENDING'
              ? 'Verification Pending'
              : verificationStatus === 'SUSPENDED'
              ? 'Account Temporarily Suspended'
              : verificationStatus === 'REVOKED'
              ? 'Account Authorization Revoked'
              : 'Account Rejected'}
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
            {verificationStatus === 'PENDING'
              ? 'Your personnel registration has been recorded and is currently awaiting verification by your assigned facility administrator or State Pollution Control Board regulator.'
              : verificationStatus === 'SUSPENDED'
              ? 'Your operational authority has been temporarily suspended by regulatory administrative action. Operational workflows are disabled.'
              : verificationStatus === 'REVOKED'
              ? 'Your statutory operational authorization has been permanently revoked by the Government Authority.'
              : 'Your verification request was reviewed and rejected by the authorized facility administrator.'}
          </p>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-left text-xs mb-6 space-y-1 font-mono">
            <div><strong className="text-slate-700">Account:</strong> {user?.name}</div>
            <div><strong className="text-slate-700">Email:</strong> {user?.email}</div>
            <div><strong className="text-slate-700">Requested Role:</strong> {user?.role}</div>
            <div><strong className="text-slate-700">Facility:</strong> {user?.facility_name || 'Unassigned'}</div>
          </div>

          <Button
            variant="secondary"
            className="w-full"
            icon={LogOut}
            onClick={logout}
          >
            Log Out &amp; Return to Login
          </Button>
        </div>
      </div>
    );
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    const userHome = ROLE_ROUTES[role] || '/login';
    return <Navigate to={userHome} replace />;
  }

  return children;
}
