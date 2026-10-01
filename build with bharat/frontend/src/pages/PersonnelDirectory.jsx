import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Phone,
  Building2,
  Truck,
  ArrowLeft,
  AlertTriangle,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Ban,
  Flag,
  FileText,
  Calendar,
  X
} from 'lucide-react';
import { useAuth, ROLES } from '../context/AuthContext';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';

export default function PersonnelDirectory() {
  const { user, role } = useAuth();
  const [personnel, setPersonnel] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [updatingId, setUpdatingId] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);
  const [jurisdiction, setJurisdiction] = useState('');

  // Modal State for Sensitive Actions (Suspension, Revocation, Rejection)
  const [activeModal, setActiveModal] = useState(null); // { type: 'SUSPEND'|'REVOKE'|'REJECT'|'FLAG', target: person }
  const [modalReason, setModalReason] = useState('');
  const [flagSeverity, setFlagSeverity] = useState('STANDARD');
  const [auditHistoryTarget, setAuditHistoryTarget] = useState(null);

  const fetchPersonnel = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('biotrace_token');
      const res = await fetch('/api/personnel', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || 'Failed to fetch personnel directory');
      }

      const data = await res.json();
      setPersonnel(data.personnel || []);
      setJurisdiction(data.jurisdiction || '');
    } catch (err) {
      console.error('[PersonnelDirectory] fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPersonnel();
  }, []);

  const handleUpdateStatus = async (targetId, newStatus, reason = '') => {
    setUpdatingId(targetId);
    setActionNotice(null);
    try {
      const token = localStorage.getItem('biotrace_token');
      const res = await fetch(`/api/personnel/${targetId}/verify`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus, reason: reason.trim() || undefined })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || `Failed to update status to ${newStatus}`);
      }

      setPersonnel((prev) =>
        prev.map((p) => (p.id === targetId ? { ...p, verification_status: newStatus } : p))
      );

      setActionNotice({
        type: newStatus === 'VERIFIED' ? 'success' : 'danger',
        message: data.message || `Personnel verification status updated to ${newStatus}.`
      });

      setActiveModal(null);
      setModalReason('');

      setTimeout(() => {
        setActionNotice(null);
      }, 5000);
    } catch (err) {
      alert(`Action failed: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleFlagForAudit = async (targetId, finding, severity) => {
    setUpdatingId(targetId);
    setActionNotice(null);
    try {
      const token = localStorage.getItem('biotrace_token');
      const res = await fetch(`/api/personnel/${targetId}/flag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ finding: finding.trim(), severity })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to flag personnel for audit');
      }

      setActionNotice({
        type: 'warning',
        message: data.message || 'Personnel record flagged for compliance investigation.'
      });

      setActiveModal(null);
      setModalReason('');

      setTimeout(() => {
        setActionNotice(null);
      }, 5000);
    } catch (err) {
      alert(`Action failed: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  // Filtering
  const filteredPersonnel = personnel.filter((p) => {
    const matchesSearch =
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.assigned_facility?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone_number?.includes(searchQuery);

    const matchesStatus =
      statusFilter === 'ALL' || p.verification_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <Badge variant="success" dot size="sm">
            Verified
          </Badge>
        );
      case 'SUSPENDED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-300">
            <AlertTriangle className="w-3 h-3 text-amber-700" />
            Suspended
          </span>
        );
      case 'REVOKED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-900 text-slate-100 border border-slate-700">
            <Ban className="w-3 h-3 text-rose-400" />
            Revoked
          </span>
        );
      case 'REJECTED':
        return (
          <Badge variant="danger" size="sm">
            Rejected
          </Badge>
        );
      case 'PENDING':
      default:
        return (
          <Badge variant="warning" size="sm">
            Pending
          </Badge>
        );
    }
  };

  const getRoleLabel = (r) => {
    switch (r) {
      case ROLES.HOSPITAL_AUTHORITY:
        return 'Hospital Authority';
      case ROLES.COLLECTION_OFFICER:
        return 'Collection Officer';
      case ROLES.TRANSPORT_OFFICER:
        return 'Transport Officer';
      case ROLES.TREATMENT_FACILITY:
        return 'Treatment Facility';
      case ROLES.GOVERNMENT_AUTHORITY:
        return 'Government Authority';
      case ROLES.COMPLIANCE_INSPECTOR:
        return 'Compliance Inspector';
      default:
        return r;
    }
  };

  const getBackLink = () => {
    if (role === ROLES.GOVERNMENT_AUTHORITY) return '/government';
    if (role === ROLES.COMPLIANCE_INSPECTOR) return '/inspector';
    if (role === ROLES.TREATMENT_FACILITY) return '/treatment';
    return '/hospital';
  };

  // Authority Action Matrix Helper
  const canManageTarget = (person) => {
    if (person.id === user?.id) return false; // Self-action prohibited
    if (person.verification_status === 'REVOKED') return false; // Terminal state

    if (role === ROLES.GOVERNMENT_AUTHORITY) return true;

    if (role === ROLES.HOSPITAL_AUTHORITY) {
      if (person.facility_id !== user?.facility_id) return false;
      if (
        person.role === ROLES.GOVERNMENT_AUTHORITY ||
        person.role === ROLES.COMPLIANCE_INSPECTOR ||
        person.role === ROLES.TREATMENT_FACILITY
      ) {
        return false;
      }
      return true;
    }

    if (role === ROLES.TREATMENT_FACILITY) {
      if (person.facility_id !== user?.facility_id) return false;
      if (
        person.role === ROLES.GOVERNMENT_AUTHORITY ||
        person.role === ROLES.COMPLIANCE_INSPECTOR ||
        person.role === ROLES.HOSPITAL_AUTHORITY
      ) {
        return false;
      }
      return true;
    }

    return false; // Compliance Inspector & others have read/flag permissions only
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Back Link */}
      <div>
        <Link
          to={getBackLink()}
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text transition-colors font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Back to dashboard</span>
        </Link>
      </div>

      {/* Page Header */}
      <PageHeader
        title="Personnel & Identity Governance"
        description="CPCB Bio-Medical Waste Handling personnel verification, RBAC authorization, and lifecycle governance."
        icon={Users}
        badge={
          <Badge variant="neutral">
            {jurisdiction ||
              (role === ROLES.GOVERNMENT_AUTHORITY || role === ROLES.COMPLIANCE_INSPECTOR
                ? 'CPCB / SPCB Statewide jurisdiction'
                : user?.facility_name || 'Local facility scope')}
          </Badge>
        }
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchPersonnel}
            loading={loading}
            icon={RefreshCw}
            aria-label="Refresh personnel directory"
          >
            Refresh
          </Button>
        }
      />

      {/* Role Scope Notice Banner */}
      <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/60 text-xs text-blue-900 flex items-start gap-3">
        <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="font-semibold">Governance Operating Scope:</strong>{' '}
          {role === ROLES.GOVERNMENT_AUTHORITY &&
            'As Government Authority, you hold regulatory oversight over all facility, logistics, and inspection personnel across the state, including permanent revocation authority.'}
          {role === ROLES.COMPLIANCE_INSPECTOR &&
            'As Compliance Inspector, you have statewide inspection access. You may inspect and flag personnel records for regulatory audit, but administrative mutations remain reserved for governing authorities.'}
          {role === ROLES.HOSPITAL_AUTHORITY &&
            `As Hospital Authority, you are authorized to verify, reject, or suspend staff personnel belonging specifically to ${user?.facility_name || 'your assigned hospital'}.`}
          {role === ROLES.TREATMENT_FACILITY &&
            `As Treatment Facility Authority, you are authorized to verify, reject, or suspend collection and transport personnel belonging to ${user?.facility_name || 'your CBWTF unit'}.`}
        </div>
      </div>

      {/* Action Notice Toast */}
      {actionNotice && (
        <div
          role="status"
          className={`p-3 rounded-lg flex items-center gap-3 text-xs border ${
            actionNotice.type === 'success'
              ? 'bg-success-bg text-success border-success'
              : actionNotice.type === 'warning'
              ? 'bg-amber-50 text-amber-900 border-amber-300'
              : 'bg-danger-bg text-danger border-danger'
          }`}
        >
          {actionNotice.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          ) : actionNotice.type === 'warning' ? (
            <Flag className="w-4 h-4 shrink-0 text-amber-600" aria-hidden="true" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
          )}
          <span>{actionNotice.message}</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div
          role="alert"
          className="p-4 rounded-lg bg-danger-bg border border-danger-border text-danger-text flex items-start gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <h4 className="font-semibold text-sm">Failed to load personnel directory</h4>
            <p className="text-xs text-text-muted mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-3.5 sm:p-4 border-b border-slate-200/80 bg-slate-50/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              placeholder="Search by name, email, role, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              aria-label="Search personnel"
            />
          </div>

          <div
            className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100/80 overflow-x-auto"
            role="group"
            aria-label="Filter status"
          >
            {['ALL', 'VERIFIED', 'PENDING', 'SUSPENDED', 'REJECTED', 'REVOKED'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div>
          {loading ? (
            <div className="py-12 text-center text-slate-500 text-xs flex flex-col items-center">
              <RefreshCw className="w-6 h-6 animate-spin text-primary mb-2" aria-hidden="true" />
              <span>Loading regulated personnel records from PostgreSQL...</span>
            </div>
          ) : filteredPersonnel.length === 0 ? (
            <div className="py-8">
              <EmptyState
                title="No personnel records found"
                description="Try adjusting your search criteria or verification status filter."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th scope="col" className="py-3 px-4 whitespace-nowrap">Personnel Member</th>
                    <th scope="col" className="py-3 px-4 whitespace-nowrap">Role</th>
                    <th scope="col" className="py-3 px-4 whitespace-nowrap">Contact</th>
                    <th scope="col" className="py-3 px-4 whitespace-nowrap">Facility / Fleet</th>
                    <th scope="col" className="py-3 px-4 whitespace-nowrap">Status</th>
                    <th scope="col" className="py-3 px-4 whitespace-nowrap">Registered</th>
                    <th scope="col" className="py-3 px-4 text-right whitespace-nowrap">Authorized Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80">
                  {filteredPersonnel.map((person) => {
                    const isUpdating = updatingId === person.id;
                    const isSelf = person.id === user?.id;
                    const canManage = canManageTarget(person);
                    const formattedDate = person.created_at
                      ? new Date(person.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })
                      : 'Initial Seed';

                    return (
                      <tr key={person.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            <span>{person.name}</span>
                            {isSelf && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 border border-slate-300 text-slate-600 font-mono">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500">{person.email}</div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <Badge variant="neutral" size="sm">
                            {getRoleLabel(person.role)}
                          </Badge>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-mono text-slate-700">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" aria-hidden="true" />
                            <span>{person.phone_number || '+91 98100 00000'}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-slate-700">
                            {person.assigned_vehicle ? (
                              <>
                                <Truck className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
                                <span className="font-mono text-xs">Vehicle: {person.assigned_vehicle}</span>
                              </>
                            ) : (
                              <>
                                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                                <span className="text-xs truncate max-w-[200px]" title={person.assigned_facility}>
                                  {person.assigned_facility}
                                </span>
                              </>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {getStatusBadge(person.verification_status)}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                          {formattedDate}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Audit History View Button */}
                            {person.recent_audit_history && person.recent_audit_history.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setAuditHistoryTarget(person)}
                                title="View audit history"
                                className="p-1.5 text-slate-500 hover:text-slate-800 rounded-md hover:bg-slate-100 transition-colors"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Self Action Guard */}
                            {isSelf && (
                              <span className="text-[11px] text-slate-400 italic">Current Session Account</span>
                            )}

                            {/* Terminal State Guard */}
                            {!isSelf && person.verification_status === 'REVOKED' && (
                              <span className="text-[11px] text-slate-500 font-mono">Permanently Revoked</span>
                            )}

                            {/* Compliance Inspector: Flag for Audit */}
                            {role === ROLES.COMPLIANCE_INSPECTOR && !isSelf && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setActiveModal({ type: 'FLAG', target: person })}
                                icon={Flag}
                              >
                                Flag for Audit
                              </Button>
                            )}

                            {/* Governing Authority Actions */}
                            {canManage && (
                              <>
                                {/* VERIFY: if not currently verified */}
                                {person.verification_status !== 'VERIFIED' && person.verification_status !== 'SUSPENDED' && (
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => setActiveModal({ type: 'VERIFY', target: person })}
                                    loading={isUpdating}
                                    icon={CheckCircle2}
                                  >
                                    Verify
                                  </Button>
                                )}

                                {/* REJECT: for PENDING accounts */}
                                {person.verification_status === 'PENDING' && (
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => setActiveModal({ type: 'REJECT', target: person })}
                                    loading={isUpdating}
                                    icon={XCircle}
                                  >
                                    Reject
                                  </Button>
                                )}

                                {/* SUSPEND: for VERIFIED accounts */}
                                {person.verification_status === 'VERIFIED' && (
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setActiveModal({ type: 'SUSPEND', target: person })}
                                    loading={isUpdating}
                                    icon={AlertTriangle}
                                  >
                                    Suspend
                                  </Button>
                                )}

                                {/* REINSTATE: for SUSPENDED accounts */}
                                {person.verification_status === 'SUSPENDED' && (
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => setActiveModal({ type: 'VERIFY', target: person, isReinstate: true })}
                                    loading={isUpdating}
                                    icon={CheckCircle2}
                                  >
                                    Reinstate
                                  </Button>
                                )}

                                {/* REVOKE: Reserved strictly for GOVERNMENT_AUTHORITY */}
                                {role === ROLES.GOVERNMENT_AUTHORITY && (
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => setActiveModal({ type: 'REVOKE', target: person })}
                                    loading={isUpdating}
                                    icon={Ban}
                                  >
                                    Revoke
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Dedicated Confirm Personnel Verification Modal */}
      {activeModal && activeModal.type === 'VERIFY' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-verification-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && updatingId !== activeModal.target.id) {
              setActiveModal(null);
            }
          }}
        >
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 sm:p-6 text-left">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl border bg-emerald-50 border-emerald-200 text-emerald-600">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="confirm-verification-title" className="text-base font-bold text-slate-900">
                    {activeModal.isReinstate ? 'Confirm Personnel Reinstatement' : 'Confirm Personnel Verification'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Granting statutory operational access
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={updatingId === activeModal.target.id}
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-700 disabled:opacity-50"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 mb-4 rounded-lg bg-blue-50/70 border border-blue-200 text-xs text-blue-900 leading-relaxed">
              Please review the personnel details before granting operational access.
            </div>

            <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 space-y-2.5 text-xs mb-5">
              <div className="flex justify-between items-start border-b border-slate-200/70 pb-2">
                <span className="text-slate-500 font-medium">Full Name</span>
                <span className="font-semibold text-slate-900 text-right">{activeModal.target.name}</span>
              </div>
              <div className="flex justify-between items-start border-b border-slate-200/70 pb-2">
                <span className="text-slate-500 font-medium">Official Email</span>
                <span className="font-mono text-slate-800 text-right break-all">{activeModal.target.email}</span>
              </div>
              <div className="flex justify-between items-start border-b border-slate-200/70 pb-2">
                <span className="text-slate-500 font-medium">Phone Number</span>
                <span className="font-mono text-slate-800 text-right">{activeModal.target.phone_number || 'Not provided'}</span>
              </div>
              <div className="flex justify-between items-start border-b border-slate-200/70 pb-2">
                <span className="text-slate-500 font-medium">Requested Role</span>
                <span className="font-semibold text-slate-900 text-right">{getRoleLabel(activeModal.target.role)}</span>
              </div>
              <div className="flex justify-between items-start border-b border-slate-200/70 pb-2">
                <span className="text-slate-500 font-medium">Assigned Facility</span>
                <span className="text-slate-800 text-right max-w-[220px] font-medium">{activeModal.target.assigned_facility || 'Unassigned'}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200/70 pb-2">
                <span className="text-slate-500 font-medium">Current Status</span>
                <span>{getStatusBadge(activeModal.target.verification_status)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Registration Date</span>
                <span className="font-mono text-[11px] text-slate-600">
                  {activeModal.target.created_at
                    ? new Date(activeModal.target.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })
                    : 'Initial Seed'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button
                variant="ghost"
                size="sm"
                disabled={updatingId === activeModal.target.id}
                onClick={() => setActiveModal(null)}
              >
                Cancel
              </Button>

              <Button
                variant="primary"
                size="sm"
                loading={updatingId === activeModal.target.id}
                disabled={updatingId === activeModal.target.id}
                onClick={() => handleUpdateStatus(activeModal.target.id, 'VERIFIED')}
                icon={CheckCircle2}
              >
                {activeModal.isReinstate ? 'Confirm Reinstatement' : 'Confirm Verification'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sensitive Action Modal (Suspend / Reject / Revoke) */}
      {activeModal && activeModal.type !== 'FLAG' && activeModal.type !== 'VERIFY' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 sm:p-6 text-left">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-xl border ${
                    activeModal.type === 'REVOKE'
                      ? 'bg-rose-50 border-rose-200 text-rose-600'
                      : activeModal.type === 'SUSPEND'
                      ? 'bg-amber-50 border-amber-200 text-amber-600'
                      : 'bg-red-50 border-red-200 text-red-600'
                  }`}
                >
                  {activeModal.type === 'REVOKE' ? (
                    <Ban className="w-5 h-5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {activeModal.type === 'REVOKE'
                      ? 'Permanent Authorization Revocation'
                      : activeModal.type === 'SUSPEND'
                      ? 'Temporary Account Suspension'
                      : 'Reject Registration Application'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Target: {activeModal.target.name} ({getRoleLabel(activeModal.target.role)})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  setModalReason('');
                }}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              {activeModal.type === 'REVOKE'
                ? 'Permanent revocation withdraws all operational authorizations permanently under CPCB statutory regulations. This cannot be undone.'
                : activeModal.type === 'SUSPEND'
                ? 'Account suspension temporarily disables operational login and barcode signing permissions until reinstated by governing authority.'
                : 'Rejecting this registration request will prevent operational permissions from being granted.'}
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mandatory Administrative Reason
              </label>
              <textarea
                rows={3}
                required
                value={modalReason}
                onChange={(e) => setModalReason(e.target.value)}
                placeholder="Specify regulatory or organizational justification..."
                className="w-full p-2.5 text-xs rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[
                  'Employment verification failure',
                  'Expired medical handling license',
                  'Statutory route violation',
                  'Facility contract termination',
                  'Regulatory audit sanction'
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setModalReason(preset)}
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setActiveModal(null);
                  setModalReason('');
                }}
              >
                Cancel
              </Button>

              <Button
                variant="destructive"
                size="sm"
                disabled={!modalReason.trim()}
                onClick={() => {
                  const newStatus =
                    activeModal.type === 'REVOKE'
                      ? 'REVOKED'
                      : activeModal.type === 'SUSPEND'
                      ? 'SUSPENDED'
                      : 'REJECTED';
                  handleUpdateStatus(activeModal.target.id, newStatus, modalReason);
                }}
              >
                Confirm {activeModal.type}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Flag for Audit Modal (for Compliance Inspector) */}
      {activeModal && activeModal.type === 'FLAG' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 sm:p-6 text-left">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl border bg-amber-50 border-amber-200 text-amber-600">
                  <Flag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Flag Personnel for Compliance Audit</h3>
                  <p className="text-xs text-slate-500">
                    Target: {activeModal.target.name} ({getRoleLabel(activeModal.target.role)})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  setModalReason('');
                }}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Audit Severity
              </label>
              <select
                value={flagSeverity}
                onChange={(e) => setFlagSeverity(e.target.value)}
                className="w-full p-2 text-xs rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="STANDARD">Standard Inspection Note</option>
                <option value="HIGH">High Priority Investigation</option>
                <option value="CRITICAL">Critical Compliance Violation</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Inspection Finding / Observations
              </label>
              <textarea
                rows={3}
                required
                value={modalReason}
                onChange={(e) => setModalReason(e.target.value)}
                placeholder="Describe the discrepancy, inspection observation, or statutory violation..."
                className="w-full p-2.5 text-xs rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setActiveModal(null);
                  setModalReason('');
                }}
              >
                Cancel
              </Button>

              <Button
                variant="primary"
                size="sm"
                disabled={!modalReason.trim()}
                onClick={() => handleFlagForAudit(activeModal.target.id, modalReason, flagSeverity)}
                icon={Flag}
              >
                Submit Inspection Flag
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Audit History Drawer / Modal */}
      {auditHistoryTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 sm:p-6 text-left max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">Governance Audit History</h3>
                  <p className="text-xs text-slate-500">
                    Personnel: {auditHistoryTarget.name} ({auditHistoryTarget.email})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAuditHistoryTarget(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {auditHistoryTarget.recent_audit_history &&
              auditHistoryTarget.recent_audit_history.length > 0 ? (
                auditHistoryTarget.recent_audit_history.map((log) => (
                  <div key={log.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                    <div className="font-mono text-[10px] text-slate-400 flex items-center justify-between mb-1">
                      <span>{new Date(log.timestamp).toLocaleString('en-IN')}</span>
                      <span className="font-semibold text-slate-600">ID: {log.id.slice(0, 8)}</span>
                    </div>
                    <div className="font-mono text-slate-800 break-words font-medium">{log.action}</div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-xs text-slate-400">
                  No previous audit actions recorded for this account.
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-right">
              <Button variant="secondary" size="sm" onClick={() => setAuditHistoryTarget(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
