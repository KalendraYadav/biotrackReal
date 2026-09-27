import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import CaseDetailModal from '../../components/inspector/CaseDetailModal';
import { 
  Scale, 
  AlertOctagon, 
  Clock, 
  CheckCircle2, 
  Search, 
  FileText, 
  Camera, 
  ArrowUpRight, 
  ShieldAlert, 
  RefreshCw, 
  Filter, 
  AlertTriangle,
  Eye,
  SlidersHorizontal
} from 'lucide-react';

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
    const unsubscribe = subscribeToRisk((incomingCase) => {
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
    });

    // 4-second background polling fallback safeguard
    const pollTimer = setInterval(() => {
      loadCases(false);
    }, 4000);

    return () => {
      unsubscribe();
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
    <div className="space-y-6 pb-12 font-sans">
      {/* Role Banner */}
      <div className="bg-white rounded-lg shadow-sm border border-hazmat-300 p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded bg-steel-900 border border-steel-700 flex items-center justify-center text-hazmat-400">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-serif font-black text-steel-950 tracking-tight">
                Biomedical Waste Compliance &amp; Enforcement Portal
              </h1>
              <span className="text-[11px] px-2.5 py-0.5 rounded font-mono font-bold bg-steel-900 text-cream-50 border border-steel-800">
                CPCB Field Audit Enforcement
              </span>
            </div>
            <p className="text-xs font-mono text-steel-600 mt-0.5">
              Inspector: <span className="font-bold text-steel-900">{user?.name || 'Amit Deshmukh'}</span> &bull; AI Anomaly Detection &amp; Statutory Sanctions
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleSimulateBrokenChain}
            disabled={simulating}
            className="px-3 py-1.5 bg-biohazard-700 hover:bg-biohazard-800 disabled:opacity-50 text-white rounded text-xs font-mono font-bold flex items-center space-x-1.5 transition shadow-sm"
            title="Simulate an out-of-order broken chain incident"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{simulating ? 'Simulating...' : 'Test Broken Chain'}</span>
          </button>
          <button
            onClick={() => loadCases(true)}
            className="p-2 border border-hazmat-300 rounded hover:bg-hazmat-50 text-steel-700 transition"
            title="Refresh Cases"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Real-Time Live AI Risk Engine Anomaly Alert Banner */}
      {latestLiveAlert && (
        <div className="bg-biohazard-950 border-2 border-biohazard-600 rounded-lg p-4 shadow-modal text-cream-50 animate-fade-in flex flex-wrap items-start justify-between gap-4 font-sans">
          <div className="flex items-start space-x-3.5">
            <div className="p-2.5 bg-biohazard-700 text-white rounded mt-0.5 border border-biohazard-500 shadow-sm flex-shrink-0">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-biohazard-300">
                  Real-Time AI Anomaly Triggered
                </span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-biohazard-800 text-biohazard-100 font-bold border border-biohazard-600">
                  Risk Score: {latestLiveAlert.risk_score || latestLiveAlert.riskScore || 90}/100
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-steel-900 text-cream-200 border border-steel-700">
                  {latestLiveAlert.case_code || 'INS-ALERT'}
                </span>
              </div>
              <p className="text-sm font-serif font-bold text-white mt-1">
                {latestLiveAlert.triggers?.[0] || 'Statutory chain-of-custody anomaly flagged by AI Risk Engine.'}
              </p>
              <p className="text-xs font-mono text-cream-300 mt-0.5">
                Batch: <span className="font-bold text-white">{latestLiveAlert.batch_code || latestLiveAlert.batch_id}</span> &bull; Status: <span className="text-amber-400 font-bold">{latestLiveAlert.status || 'ASSIGNED'}</span> &bull; Auto-assigned to Inspector
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSelectedCaseForModal(latestLiveAlert)}
              className="px-3.5 py-1.5 bg-biohazard-600 hover:bg-biohazard-500 text-white text-xs font-mono font-bold rounded flex items-center space-x-1.5 transition shadow-sm"
            >
              <span>Investigate Dossier</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setLatestLiveAlert(null)}
              className="p-1.5 text-cream-400 hover:text-white rounded hover:bg-white/10 transition text-xs font-mono"
              title="Dismiss banner"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Assigned Audits */}
        <div 
          onClick={() => setFilterTab('ASSIGNED')}
          className={`bg-white rounded-lg p-4 shadow-sm border cursor-pointer transition ${
            filterTab === 'ASSIGNED' ? 'border-steel-900 ring-2 ring-steel-300' : 'border-hazmat-300 hover:border-steel-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-mono font-bold text-steel-500 uppercase tracking-wider">Assigned Audits</p>
            <Clock className="w-4 h-4 text-steel-600" />
          </div>
          <p className="text-2xl font-mono font-bold text-steel-900 mt-2">{assignedCount}</p>
          <p className="text-xs font-mono text-steel-500 mt-0.5">Awaiting initial inspection</p>
        </div>

        {/* Card 2: High Priority Audits */}
        <div 
          onClick={() => setFilterTab('HIGH_PRIORITY')}
          className={`bg-white rounded-lg p-4 shadow-sm border cursor-pointer transition ${
            filterTab === 'HIGH_PRIORITY' ? 'border-biohazard-600 ring-2 ring-biohazard-200' : 'border-hazmat-300 hover:border-biohazard-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-mono font-bold text-steel-500 uppercase tracking-wider">High Priority</p>
            <AlertOctagon className="w-4 h-4 text-biohazard-700" />
          </div>
          <p className="text-2xl font-mono font-bold text-biohazard-700 mt-2">{highPriorityCount}</p>
          <p className="text-xs font-mono text-biohazard-700 font-semibold mt-0.5">Risk score &ge; 75/100</p>
        </div>

        {/* Card 3: Under Investigation */}
        <div 
          onClick={() => setFilterTab('UNDER_INVESTIGATION')}
          className={`bg-white rounded-lg p-4 shadow-sm border cursor-pointer transition ${
            filterTab === 'UNDER_INVESTIGATION' ? 'border-amber-600 ring-2 ring-amber-200' : 'border-hazmat-300 hover:border-amber-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-mono font-bold text-steel-500 uppercase tracking-wider">Under Investigation</p>
            <AlertTriangle className="w-4 h-4 text-amber-700" />
          </div>
          <p className="text-2xl font-mono font-bold text-amber-800 mt-2">{underInvestigationCount}</p>
          <p className="text-xs font-mono text-steel-500 mt-0.5">Field inquiry active</p>
        </div>

        {/* Card 4: Resolved Audits */}
        <div 
          onClick={() => setFilterTab('RESOLVED')}
          className={`bg-white rounded-lg p-4 shadow-sm border cursor-pointer transition ${
            filterTab === 'RESOLVED' ? 'border-forest-600 ring-2 ring-forest-200' : 'border-hazmat-300 hover:border-forest-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-mono font-bold text-steel-500 uppercase tracking-wider">Resolved Audits</p>
            <CheckCircle2 className="w-4 h-4 text-forest-700" />
          </div>
          <p className="text-2xl font-mono font-bold text-forest-800 mt-2">{resolvedCount}</p>
          <p className="text-xs font-mono text-steel-500 mt-0.5">Sanctions &amp; sign-off closed</p>
        </div>
      </div>

      {/* Case Management Table */}
      <div className="bg-white rounded-lg shadow-sm border border-hazmat-300 overflow-hidden">
        <div className="p-3 border-b border-hazmat-300 flex flex-wrap items-center justify-between gap-3 bg-hazmat-50 font-mono">
          <div className="flex bg-hazmat-200/80 p-1 rounded text-xs font-bold">
            <button
              onClick={() => setFilterTab('ALL')}
              className={`px-3 py-1 rounded transition ${
                filterTab === 'ALL' ? 'bg-white text-steel-950 shadow-sm' : 'text-steel-700 hover:text-steel-950'
              }`}
            >
              All Cases ({cases.length})
            </button>
            <button
              onClick={() => setFilterTab('ASSIGNED')}
              className={`px-3 py-1 rounded transition ${
                filterTab === 'ASSIGNED' ? 'bg-white text-steel-950 shadow-sm' : 'text-steel-700 hover:text-steel-950'
              }`}
            >
              Assigned ({assignedCount})
            </button>
            <button
              onClick={() => setFilterTab('HIGH_PRIORITY')}
              className={`px-3 py-1 rounded transition ${
                filterTab === 'HIGH_PRIORITY' ? 'bg-white text-steel-950 shadow-sm' : 'text-steel-700 hover:text-steel-950'
              }`}
            >
              High Priority ({highPriorityCount})
            </button>
            <button
              onClick={() => setFilterTab('UNDER_INVESTIGATION')}
              className={`px-3 py-1 rounded transition ${
                filterTab === 'UNDER_INVESTIGATION' ? 'bg-white text-steel-950 shadow-sm' : 'text-steel-700 hover:text-steel-950'
              }`}
            >
              In Progress ({underInvestigationCount})
            </button>
            <button
              onClick={() => setFilterTab('RESOLVED')}
              className={`px-3 py-1 rounded transition ${
                filterTab === 'RESOLVED' ? 'bg-white text-steel-950 shadow-sm' : 'text-steel-700 hover:text-steel-950'
              }`}
            >
              Resolved ({resolvedCount})
            </button>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search case code, batch..."
              className="w-full px-3 py-1.5 bg-white border border-hazmat-300 rounded text-xs font-mono focus:outline-none focus:ring-2 focus:ring-hazmat-500"
            />
          </div>
        </div>

        {/* Cases Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-hazmat-100 text-steel-700 uppercase font-bold border-b border-hazmat-300">
              <tr>
                <th className="py-2.5 px-4">Case Code</th>
                <th className="py-2.5 px-4">Risk Score</th>
                <th className="py-2.5 px-4">Target Batch</th>
                <th className="py-2.5 px-4">Primary Triggers</th>
                <th className="py-2.5 px-4">Audit Status</th>
                <th className="py-2.5 px-4 text-right">Inspect Dossier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hazmat-200">
              {filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-steel-400">
                    No risk audit cases match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredCases.map((rc) => {
                  const isHighRisk = rc.risk_score >= 75;
                  return (
                    <tr key={rc.id} className="hover:bg-hazmat-50/70 transition">
                      <td className="py-3 px-4 font-bold text-steel-900">
                        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                          <span>{rc.case_code}</span>
                          {(rc.case_type === 'BROKEN_CHAIN_OF_CUSTODY' || rc.type === 'BROKEN_CHAIN_OF_CUSTODY') && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-biohazard-700 text-white font-mono font-bold tracking-tight">
                              BROKEN CHAIN
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold border ${
                          isHighRisk ? 'bg-biohazard-100 text-biohazard-950 border-biohazard-300' : 'bg-amber-100 text-amber-950 border-amber-300'
                        }`}>
                          {rc.risk_score}/100
                        </span>
                      </td>

                      <td className="py-3 px-4 text-steel-800 font-bold">
                        {rc.batch?.batch_code || rc.batch_id}
                      </td>

                      <td className="py-3 px-4 text-steel-700 max-w-sm font-sans">
                        <div className="truncate font-semibold">{rc.triggers?.[0] || 'Chain of custody violation'}</div>
                        {rc.triggers?.length > 1 && (
                          <div className="text-[10px] text-steel-500 font-mono mt-0.5">
                            +{rc.triggers.length - 1} additional triggers
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${
                          rc.status === 'RESOLVED' 
                            ? 'bg-forest-100 text-forest-900 border-forest-300' 
                            : rc.status === 'UNDER_INVESTIGATION' 
                              ? 'bg-amber-100 text-amber-950 border-amber-300' 
                              : 'bg-steel-200 text-steel-900 border-steel-300'
                        }`}>
                          {rc.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedCaseForModal(rc)}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-steel-900 hover:bg-black text-white text-xs font-bold rounded shadow-sm transition font-mono"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect Case</span>
                        </button>
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
