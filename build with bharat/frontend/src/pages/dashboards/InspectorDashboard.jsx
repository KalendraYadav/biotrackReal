import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import CaseDetailModal from '../../components/inspector/CaseDetailModal';
import { 
  Scale, 
  AlertOctagon, 
  Clock, 
  CheckCircle2, 
  ShieldAlert, 
  RefreshCw, 
  AlertTriangle,
  Eye,
  ArrowUpRight,
  Search
} from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';

export default function InspectorDashboard() {
  const { user } = useAuth();
  const { subscribeToRisk } = useSocket();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [filterTab, setFilterTab] = useState('ALL'); // 'ALL' | 'ASSIGNED' | 'HIGH_PRIORITY' | 'UNDER_INVESTIGATION' | 'RESOLVED'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCaseForModal, setSelectedCaseForModal] = useState(null);
  const [latestLiveAlert, setLatestLiveAlert] = useState(null);

  const loadCases = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await fetch('/api/risk-cases', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('biotrace_token')}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setCases(data.risk_cases || []);
      }
    } catch (err) {
      console.warn('Failed to load risk cases:', err.message);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    loadCases();

    // Subscribe to real-time risk engine broadcast alerts via WebSocket
    const unsubscribe = subscribeToRisk ? subscribeToRisk((incomingCase) => {
      if (!incomingCase) return;
      setLatestLiveAlert(incomingCase);
      setCases((prevCases) => {
        const idx = prevCases.findIndex(
          (c) => c.id === incomingCase.id || c.case_code === incomingCase.case_code
        );
        if (idx !== -1) {
          const updated = [...prevCases];
          updated[idx] = { ...updated[idx], ...incomingCase };
          return updated;
        } else {
          return [incomingCase, ...prevCases];
        }
      });
    }) : null;

    // 4-second background polling fallback safeguard
    const pollTimer = setInterval(() => {
      loadCases(false);
    }, 4000);

    return () => {
      if (unsubscribe) unsubscribe();
      clearInterval(pollTimer);
    };
  }, [subscribeToRisk]);

  const handleSimulateBrokenChain = async () => {
    setSimulating(true);
    try {
      const res = await fetch('/api/risk-cases/test-broken-chain', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('biotrace_token')}`
        },
        body: JSON.stringify({ stage: 'TREATMENT' })
      });
      const data = await res.json();
      if (res.ok && data.risk_case) {
        setLatestLiveAlert(data.risk_case);
        setCases((prev) => {
          const exists = prev.some((c) => c.id === data.risk_case.id);
          return exists ? prev : [data.risk_case, ...prev];
        });
      }
    } catch (err) {
      console.warn('Failed to simulate broken chain incident:', err);
    } finally {
      setSimulating(false);
    }
  };

  // 4 Stat Card Counts
  const assignedCount = cases.filter(c => c.status === 'ASSIGNED').length;
  const highPriorityCount = cases.filter(c => c.risk_score >= 75 && c.status !== 'RESOLVED').length;
  const underInvestigationCount = cases.filter(c => c.status === 'UNDER_INVESTIGATION').length;
  const resolvedCount = cases.filter(c => c.status === 'RESOLVED').length;

  // Filtering
  const filteredCases = cases.filter(c => {
    if (filterTab === 'ASSIGNED' && c.status !== 'ASSIGNED') return false;
    if (filterTab === 'HIGH_PRIORITY' && (c.risk_score < 75 || c.status === 'RESOLVED')) return false;
    if (filterTab === 'UNDER_INVESTIGATION' && c.status !== 'UNDER_INVESTIGATION') return false;
    if (filterTab === 'RESOLVED' && c.status !== 'RESOLVED') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.case_code?.toLowerCase().includes(q) ||
        c.batch_id?.toLowerCase().includes(q) ||
        c.batch?.batch_code?.toLowerCase().includes(q) ||
        c.triggers?.some(t => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleActionComplete = () => {
    loadCases();
    setSelectedCaseForModal(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <PageHeader
        title="Biomedical Waste Compliance & Enforcement Portal"
        description={`Inspector: ${user?.name || 'Amit Deshmukh'} • AI anomaly detection & statutory sanctions`}
        icon={Scale}
        badge={
          <Badge variant="neutral">
            CPCB Field Audit Enforcement
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleSimulateBrokenChain}
              loading={simulating}
              icon={AlertTriangle}
              title="Simulate an out-of-order broken chain incident"
            >
              Test Broken Chain
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => loadCases(true)}
              loading={loading}
              icon={RefreshCw}
              aria-label="Refresh risk cases"
            >
              Refresh
            </Button>
          </div>
        }
      />

      {/* Real-Time Live AI Risk Engine Anomaly Alert Banner */}
      {latestLiveAlert && (
        <div 
          role="alert" 
          aria-live="assertive"
          className="rounded-lg p-4 bg-danger-bg border border-danger-border flex flex-wrap items-start justify-between gap-4 text-danger-text"
        >
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded bg-danger/10 text-danger mt-0.5 shrink-0">
              <ShieldAlert className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-danger">
                  Real-time AI anomaly triggered
                </span>
                <Badge variant="danger" size="sm">
                  Risk score: {latestLiveAlert.risk_score || latestLiveAlert.riskScore || 90}/100
                </Badge>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface border border-border text-text">
                  {latestLiveAlert.case_code || 'INS-ALERT'}
                </span>
              </div>
              <p className="text-sm font-semibold text-text mt-1">
                {latestLiveAlert.triggers?.[0] || 'Statutory chain-of-custody anomaly flagged by AI Risk Engine.'}
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                Batch: <span className="font-mono font-bold text-text">{latestLiveAlert.batch_code || latestLiveAlert.batch_id}</span> • Status: <span className="font-semibold text-warning-text">{latestLiveAlert.status || 'ASSIGNED'}</span> • Auto-assigned to Inspector
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setSelectedCaseForModal(latestLiveAlert)}
              icon={ArrowUpRight}
            >
              Investigate dossier
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLatestLiveAlert(null)}
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Assigned Audits */}
        <Card 
          onClick={() => setFilterTab('ASSIGNED')}
          className={`cursor-pointer transition-colors shadow-2xs hover:shadow-xs ${
            filterTab === 'ASSIGNED' ? 'ring-2 ring-primary border-primary bg-primary/5' : 'hover:border-slate-300'
          }`}
        >
          <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Assigned audits</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 tabular-nums">{assignedCount}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Awaiting initial inspection</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
              <Clock className="w-4 h-4" aria-hidden="true" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: High Priority Audits */}
        <Card 
          onClick={() => setFilterTab('HIGH_PRIORITY')}
          className={`cursor-pointer transition-colors shadow-2xs hover:shadow-xs ${
            filterTab === 'HIGH_PRIORITY' ? 'ring-2 ring-rose-500 border-rose-500 bg-rose-50/20' : 'hover:border-slate-300'
          }`}
        >
          <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">High priority</p>
              <p className="text-xl sm:text-2xl font-bold text-rose-600 mt-1 tabular-nums">{highPriorityCount}</p>
              <p className="text-[11px] text-rose-600 font-medium mt-0.5">Risk score ≥ 75/100</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
              <AlertOctagon className="w-4 h-4" aria-hidden="true" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Under Investigation */}
        <Card 
          onClick={() => setFilterTab('UNDER_INVESTIGATION')}
          className={`cursor-pointer transition-colors shadow-2xs hover:shadow-xs ${
            filterTab === 'UNDER_INVESTIGATION' ? 'ring-2 ring-amber-500 border-amber-500 bg-amber-50/20' : 'hover:border-slate-300'
          }`}
        >
          <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Under inquiry</p>
              <p className="text-xl sm:text-2xl font-bold text-amber-700 mt-1 tabular-nums">{underInvestigationCount}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Field inquiry active</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
              <AlertTriangle className="w-4 h-4" aria-hidden="true" />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Resolved Audits */}
        <Card 
          onClick={() => setFilterTab('RESOLVED')}
          className={`cursor-pointer transition-colors shadow-2xs hover:shadow-xs ${
            filterTab === 'RESOLVED' ? 'ring-2 ring-emerald-600 border-emerald-600 bg-emerald-50/20' : 'hover:border-slate-300'
          }`}
        >
          <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Resolved audits</p>
              <p className="text-xl sm:text-2xl font-bold text-emerald-700 mt-1 tabular-nums">{resolvedCount}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Sanctions closed</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Case Management Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-3.5 sm:p-4 border-b border-slate-200/80 bg-slate-50/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="inline-flex flex-wrap rounded-lg border border-slate-200 p-0.5 bg-slate-100/80" role="tablist" aria-label="Filter cases">
            <button
              role="tab"
              aria-selected={filterTab === 'ALL'}
              onClick={() => setFilterTab('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                filterTab === 'ALL' ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/60' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All cases ({cases.length})
            </button>
            <button
              role="tab"
              aria-selected={filterTab === 'ASSIGNED'}
              onClick={() => setFilterTab('ASSIGNED')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                filterTab === 'ASSIGNED' ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/60' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Assigned ({assignedCount})
            </button>
            <button
              role="tab"
              aria-selected={filterTab === 'HIGH_PRIORITY'}
              onClick={() => setFilterTab('HIGH_PRIORITY')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                filterTab === 'HIGH_PRIORITY' ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/60' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              High priority ({highPriorityCount})
            </button>
            <button
              role="tab"
              aria-selected={filterTab === 'UNDER_INVESTIGATION'}
              onClick={() => setFilterTab('UNDER_INVESTIGATION')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                filterTab === 'UNDER_INVESTIGATION' ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/60' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              In progress ({underInvestigationCount})
            </button>
            <button
              role="tab"
              aria-selected={filterTab === 'RESOLVED'}
              onClick={() => setFilterTab('RESOLVED')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                filterTab === 'RESOLVED' ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/60' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Resolved ({resolvedCount})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search case code, batch..."
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              aria-label="Search audit cases"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 uppercase text-[11px] font-semibold border-b border-slate-200">
                <th scope="col" className="py-3 px-4">Case code</th>
                <th scope="col" className="py-3 px-4">Risk score</th>
                <th scope="col" className="py-3 px-4">Target batch</th>
                <th scope="col" className="py-3 px-4">Primary triggers</th>
                <th scope="col" className="py-3 px-4">Audit status</th>
                <th scope="col" className="py-3 px-4 text-right">Inspect dossier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
                {filteredCases.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8">
                      <EmptyState
                        title="No risk audit cases found"
                        description="No audit cases match the selected filter tab or search query."
                      />
                    </td>
                  </tr>
                ) : (
                  filteredCases.map((rc) => {
                    const isHighRisk = rc.risk_score >= 75;
                    return (
                      <tr key={rc.id} className="hover:bg-surface-alt/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-text">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{rc.case_code}</span>
                            {(rc.case_type === 'BROKEN_CHAIN_OF_CUSTODY' || rc.type === 'BROKEN_CHAIN_OF_CUSTODY') && (
                              <Badge variant="danger" size="sm">
                                Broken chain
                              </Badge>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <Badge variant={isHighRisk ? 'danger' : 'warning'} size="sm">
                            {rc.risk_score}/100
                          </Badge>
                        </td>

                        <td className="py-3 px-4 text-text font-mono font-medium">
                          {rc.batch?.batch_code || rc.batch_id}
                        </td>

                        <td className="py-3 px-4 text-text max-w-sm">
                          <div className="truncate font-medium">{rc.triggers?.[0] || 'Chain of custody violation'}</div>
                          {rc.triggers?.length > 1 && (
                            <div className="text-[10px] text-text-muted mt-0.5">
                              +{rc.triggers.length - 1} additional triggers
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <Badge 
                            variant={
                              rc.status === 'RESOLVED' 
                                ? 'success' 
                                : rc.status === 'UNDER_INVESTIGATION' 
                                  ? 'warning' 
                                  : 'neutral'
                            } 
                            size="sm"
                          >
                            {rc.status}
                          </Badge>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setSelectedCaseForModal(rc)}
                            icon={Eye}
                          >
                            Inspect
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      {/* Case Detail Inspection Modal */}
      {selectedCaseForModal && (
        <CaseDetailModal
          riskCase={selectedCaseForModal}
          user={user}
          onClose={() => setSelectedCaseForModal(null)}
          onActionComplete={handleActionComplete}
        />
      )}
    </div>
  );
}
