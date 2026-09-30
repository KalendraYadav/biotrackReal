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
  RefreshCw
} from 'lucide-react';
import { useAuth, ROLES } from '../context/AuthContext';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
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

  const handleUpdateStatus = async (targetId, newStatus, personName) => {
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
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || `Failed to update status to ${newStatus}`);
      }

      setPersonnel((prev) =>
        prev.map((p) => (p.id === targetId ? { ...p, verification_status: newStatus } : p))
      );

      setActionNotice({
        type: newStatus === 'VERIFIED' ? 'success' : 'danger',
        message: `${personName} has been ${newStatus.toLowerCase()} successfully.`
      });

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
        return 'State Government Authority';
      case ROLES.COMPLIANCE_INSPECTOR:
        return 'Compliance Inspector';
      default:
        return r;
    }
  };

  const backLink = role === ROLES.GOVERNMENT_AUTHORITY ? '/government' : '/hospital';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Back Link */}
      <div>
        <Link
          to={backLink}
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text transition-colors font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Back to dashboard</span>
        </Link>
      </div>

      {/* Page Header */}
      <PageHeader
        title="Personnel & Staff Directory"
        description="CPCB Bio-Medical Waste Handling personnel verification & RBAC authorization."
        icon={Users}
        badge={
          <Badge variant="neutral">
            {role === ROLES.GOVERNMENT_AUTHORITY
              ? 'CPCB / SPCB Statewide jurisdiction'
              : user?.facility_name || 'Hospital local facility'}
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

      {/* Action Notice Toast */}
      {actionNotice && (
        <div
          role="status"
          className={`p-3 rounded-lg flex items-center gap-3 text-xs border ${
            actionNotice.type === 'success'
              ? 'bg-success-bg text-success border-success'
              : 'bg-danger-bg text-danger border-danger'
          }`}
        >
          {actionNotice.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
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

          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100/80" role="group" aria-label="Filter status">
            {['ALL', 'VERIFIED', 'PENDING', 'REJECTED'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
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
              <span>Loading personnel records from PostgreSQL...</span>
            </div>
          ) : filteredPersonnel.length === 0 ? (
            <div className="py-8">
              <EmptyState
                title="No personnel found"
                description="Try adjusting your search criteria or status filter."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th scope="col" className="py-3 px-4">Personnel member</th>
                    <th scope="col" className="py-3 px-4">Role</th>
                    <th scope="col" className="py-3 px-4">Contact phone</th>
                    <th scope="col" className="py-3 px-4">Assigned facility / Fleet</th>
                    <th scope="col" className="py-3 px-4">Verification status</th>
                    <th scope="col" className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredPersonnel.map((person) => {
                    const isUpdating = updatingId === person.id;
                    return (
                      <tr key={person.id} className="hover:bg-surface-alt/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-text">{person.name}</div>
                          <div className="text-[11px] text-text-muted">{person.email}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <Badge variant="neutral" size="sm">
                            {getRoleLabel(person.role)}
                          </Badge>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 font-mono text-text">
                            <Phone className="w-3 h-3 text-text-muted shrink-0" aria-hidden="true" />
                            <span>{person.phone_number || '+91 98100 00000'}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 text-text">
                            {person.assigned_vehicle ? (
                              <>
                                <Truck className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
                                <span className="font-mono text-xs">Vehicle: {person.assigned_vehicle}</span>
                              </>
                            ) : (
                              <>
                                <Building2 className="w-3.5 h-3.5 text-text-muted shrink-0" aria-hidden="true" />
                                <span className="text-xs truncate max-w-[200px]" title={person.assigned_facility}>
                                  {person.assigned_facility}
                                </span>
                              </>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {getStatusBadge(person.verification_status)}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {person.verification_status !== 'VERIFIED' && (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleUpdateStatus(person.id, 'VERIFIED', person.name)}
                                loading={isUpdating}
                                icon={CheckCircle2}
                              >
                                Verify
                              </Button>
                            )}

                            {person.verification_status !== 'REJECTED' && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleUpdateStatus(person.id, 'REJECTED', person.name)}
                                loading={isUpdating}
                                icon={XCircle}
                              >
                                Reject
                              </Button>
                            )}

                            {person.verification_status !== 'PENDING' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUpdateStatus(person.id, 'PENDING', person.name)}
                                loading={isUpdating}
                              >
                                Reset
                              </Button>
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
    </div>
  );
}
