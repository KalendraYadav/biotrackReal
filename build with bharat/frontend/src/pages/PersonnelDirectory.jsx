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
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { useAuth, ROLES } from '../context/AuthContext';

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

      // Update locally
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
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-forest-900 text-forest-200 border border-forest-700">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-forest-400" />
            Verified
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-biohazard-950 text-biohazard-300 border border-biohazard-800">
            <XCircle className="w-3.5 h-3.5 mr-1 text-biohazard-500" />
            Rejected
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-hazmat-950 text-hazmat-300 border border-hazmat-800">
            <Clock className="w-3.5 h-3.5 mr-1 text-hazmat-400" />
            Pending
          </span>
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

  return (
    <div className="space-y-6">
      {/* Top Banner & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-steel-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Link
              to={role === ROLES.GOVERNMENT_AUTHORITY ? '/government' : '/hospital'}
              className="text-steel-600 hover:text-steel-900 flex items-center space-x-1 text-xs font-mono mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-steel-900 rounded-lg text-white">
              <Users className="w-6 h-6 text-forest-400" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-steel-950 tracking-tight">
                Personnel & Staff Directory
              </h1>
              <p className="text-xs text-steel-600 font-mono">
                CPCB Bio-Medical Waste Handling Personnel Verification & RBAC Authorization
              </p>
            </div>
          </div>
        </div>

        {/* Jurisdiction / Scope indicator */}
        <div className="flex items-center space-x-3">
          <div className="px-3 py-1.5 rounded bg-cream-100 border border-steel-200 text-right">
            <span className="text-[10px] font-mono text-steel-500 uppercase block font-semibold">Scope of Authority</span>
            <span className="text-xs font-mono font-bold text-steel-900">
              {role === ROLES.GOVERNMENT_AUTHORITY
                ? 'CPCB / SPCB Statewide Jurisdiction'
                : user?.facility_name || 'Hospital Local Facility'}
            </span>
          </div>

          <button
            onClick={fetchPersonnel}
            disabled={loading}
            className="p-2 rounded bg-steel-100 hover:bg-steel-200 text-steel-700 transition"
            title="Refresh Directory"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Action Notice */}
      {actionNotice && (
        <div
          className={`p-3 rounded-md flex items-center space-x-3 text-xs font-mono font-medium border ${
            actionNotice.type === 'success'
              ? 'bg-forest-950 text-forest-200 border-forest-800'
              : 'bg-biohazard-950 text-biohazard-200 border-biohazard-800'
          }`}
        >
          {actionNotice.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-forest-400 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-biohazard-400 flex-shrink-0" />
          )}
          <span>{actionNotice.message}</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-md bg-biohazard-950 border border-biohazard-800 text-biohazard-200 flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-biohazard-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-serif font-bold text-sm">Failed to Load Personnel Directory</h4>
            <p className="text-xs font-mono mt-1 text-biohazard-300">{error}</p>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-steel-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-steel-400" />
          <input
            type="text"
            placeholder="Search by name, email, role, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs font-mono bg-cream-50/50 border border-steel-300 rounded focus:ring-1 focus:ring-steel-900 focus:border-steel-900 outline-none"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-steel-500" />
          <span className="text-xs font-mono text-steel-600 mr-1">Status:</span>
          {['ALL', 'VERIFIED', 'PENDING', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded text-xs font-mono transition ${
                statusFilter === st
                  ? 'bg-steel-900 text-white font-bold'
                  : 'bg-cream-100 text-steel-700 hover:bg-steel-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Personnel Table */}
      <div className="bg-white rounded-lg border border-steel-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-steel-200 bg-cream-50/50 flex items-center justify-between">
          <h3 className="font-serif font-bold text-sm text-steel-900">
            Registered Custody Personnel ({filteredPersonnel.length})
          </h3>
          <span className="text-[11px] font-mono text-steel-500">
            Enforces custody logging restrictions in real time
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-6 h-6 animate-spin text-steel-500 mx-auto mb-2" />
            <p className="text-xs font-mono text-steel-600">Loading personnel records from PostgreSQL...</p>
          </div>
        ) : filteredPersonnel.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-8 h-8 text-steel-400 mx-auto mb-2" />
            <p className="text-sm font-serif font-bold text-steel-800">No personnel found</p>
            <p className="text-xs font-mono text-steel-500 mt-1">Try adjusting your search criteria or filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-steel-200 bg-steel-50 text-[11px] font-mono uppercase text-steel-600 tracking-wider">
                  <th className="py-3 px-4">Personnel Member</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Contact Phone</th>
                  <th className="py-3 px-4">Assigned Facility / Fleet</th>
                  <th className="py-3 px-4">Verification Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-steel-100 text-xs">
                {filteredPersonnel.map((person) => {
                  const isUpdating = updatingId === person.id;
                  return (
                    <tr key={person.id} className="hover:bg-cream-50/50 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-serif font-bold text-steel-950">{person.name}</div>
                        <div className="text-[11px] font-mono text-steel-500">{person.email}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-steel-100 text-steel-800 font-semibold border border-steel-200">
                          {getRoleLabel(person.role)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-1.5 font-mono text-steel-700">
                          <Phone className="w-3 h-3 text-steel-400" />
                          <span>{person.phone_number || '+91 98100 00000'}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-1.5 text-steel-800 font-medium">
                          {person.assigned_vehicle ? (
                            <>
                              <Truck className="w-3.5 h-3.5 text-hazmat-600" />
                              <span className="font-mono text-xs">Vehicle: {person.assigned_vehicle}</span>
                            </>
                          ) : (
                            <>
                              <Building2 className="w-3.5 h-3.5 text-steel-500" />
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
                        <div className="flex items-center justify-end space-x-2">
                          {person.verification_status !== 'VERIFIED' && (
                            <button
                              onClick={() => handleUpdateStatus(person.id, 'VERIFIED', person.name)}
                              disabled={isUpdating}
                              className="px-2.5 py-1 rounded bg-forest-700 hover:bg-forest-800 text-white font-mono text-[11px] font-bold flex items-center space-x-1 transition disabled:opacity-50"
                              title="Verify personnel for chain of custody"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Verify</span>
                            </button>
                          )}

                          {person.verification_status !== 'REJECTED' && (
                            <button
                              onClick={() => handleUpdateStatus(person.id, 'REJECTED', person.name)}
                              disabled={isUpdating}
                              className="px-2.5 py-1 rounded bg-biohazard-700 hover:bg-biohazard-800 text-white font-mono text-[11px] font-bold flex items-center space-x-1 transition disabled:opacity-50"
                              title="Reject personnel to block custody actions"
                            >
                              <XCircle className="w-3 h-3" />
                              <span>Reject</span>
                            </button>
                          )}

                          {person.verification_status !== 'PENDING' && (
                            <button
                              onClick={() => handleUpdateStatus(person.id, 'PENDING', person.name)}
                              disabled={isUpdating}
                              className="px-2 py-1 rounded bg-cream-100 hover:bg-steel-200 text-steel-700 font-mono text-[11px] transition disabled:opacity-50"
                              title="Reset to Pending"
                            >
                              Reset
                            </button>
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
  );
}
