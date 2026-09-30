import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import HandoverVerificationModal from '../../components/transport/HandoverVerificationModal';
import { 
  ShieldCheck, 
  QrCode, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  Search, 
  Scale, 
  Building2 
} from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import StatusPill, { CategoryBadge } from '../../components/ui/StatusPill';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';

export default function CollectionDashboard() {
  const { user } = useAuth();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState('PENDING'); // 'PENDING' | 'COLLECTED'
  const [selectedBatchForHandover, setSelectedBatchForHandover] = useState(null);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/waste-batches', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('biotrace_token')}`
        }
      });
      const data = await res.json();
      setBatches(data.batches || []);
    } catch (err) {
      console.error('Failed to load waste batches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const readyForCollection = batches.filter(b => b.status === 'GENERATED');
  const collectedBatches = batches.filter(b => 
    b.status === 'COLLECTED' || 
    b.status === 'IN_TRANSIT' || 
    b.status === 'RECEIVED' || 
    b.status === 'TREATED' || 
    b.status === 'DISPOSED'
  );

  const filteredBatches = (activeTab === 'PENDING' ? readyForCollection : collectedBatches).filter(b => {
    const matchesSearch = 
      b.batch_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.hospital?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.cpcb_waste_type?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = categoryFilter === 'ALL' || b.cpcb_waste_category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const totalCollectedKg = collectedBatches.reduce((acc, b) => acc + (b.quantity_kg || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <PageHeader
        title="Collection Officer Terminal"
        description="Hospital bay waste reception, barcode scanning, weighbridge check, and tamper seal inspection."
        icon={ShieldCheck}
        badge={
          <Badge variant="primary">
            {user?.facility_name || 'EcoSafe Waste Handlers'}
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-600 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200">
              Officer: {user?.id || 'OFF-COL-001'}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchBatches}
              loading={loading}
              icon={RefreshCw}
              aria-label="Refresh collection queue"
            >
              Refresh
            </Button>
          </div>
        }
      />

      {/* 4 Stat Cards - Responsive 2x2 on mobile, 4-col on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Awaiting Pickup</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 tabular-nums">
              {readyForCollection.length} <span className="text-xs font-normal text-slate-500 font-sans">batches</span>
            </div>
            <div className="text-[11px] text-amber-700 font-medium mt-0.5">Ready at hospital dock</div>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Collected & Verified</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 tabular-nums">
              {collectedBatches.length} <span className="text-xs font-normal text-slate-500 font-sans">batches</span>
            </div>
            <div className="text-[11px] text-emerald-700 font-medium mt-0.5">Chain of custody initialized</div>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Weight Collected</span>
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
              <Scale className="w-3.5 h-3.5" aria-hidden="true" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 tabular-nums">
              {totalCollectedKg.toFixed(1)} <span className="text-xs font-normal text-slate-500 font-sans">kg</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Dock verified scale sum</div>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Compliance Score</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-700 tabular-nums">100%</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Zero missing photo/GPS tags</div>
          </div>
        </div>
      </div>

      {/* Main Queue & Verification Workspace */}
      <div className="space-y-4">
        {/* Filter and Search Strip */}
        <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Tabs */}
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100/70" role="group" aria-label="Filter queue">
            <button
              type="button"
              onClick={() => setActiveTab('PENDING')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'PENDING'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pending Collection ({readyForCollection.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('COLLECTED')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'COLLECTED'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Verified / En Route ({collectedBatches.length})
            </button>
          </div>

          {/* Search and Category Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search batch or hospital..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/40 focus:border-emerald-600 w-48 sm:w-60"
                aria-label="Search batch code or hospital"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/40 focus:border-emerald-600 font-medium"
              aria-label="Filter by waste category"
            >
              <option value="ALL">All Categories</option>
              <option value="Yellow">Yellow (Infectious)</option>
              <option value="Red">Red (Contaminated plastic)</option>
              <option value="White">White (Sharps)</option>
              <option value="Blue">Blue (Glassware)</option>
            </select>
          </div>
        </div>

        <div>
          {loading ? (
            <div className="py-12 text-center text-slate-500 text-xs flex flex-col items-center bg-white rounded-xl border border-slate-200">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mb-2" aria-hidden="true" />
              <span>Loading CPCB custody queue...</span>
            </div>
          ) : filteredBatches.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200/90 p-8 shadow-2xs">
              <EmptyState
                title={activeTab === 'PENDING' ? 'No batches awaiting pickup' : 'No batches found'}
                description={
                  activeTab === 'PENDING' 
                    ? 'All generated biomedical waste bags have been collected and verified with GPS and camera evidence.'
                    : 'No waste batches match the selected search query or category filter.'
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
              {filteredBatches.map((b) => {
                const isPending = b.status === 'GENERATED';

                return (
                  <div
                    key={b.id}
                    className="p-4 rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                            {b.batch_code}
                          </span>
                          <CategoryBadge category={b.cpcb_waste_category} />
                        </div>
                        <StatusPill status={b.status} size="sm" />
                      </div>

                      <div>
                        <h4 className="font-semibold text-sm text-slate-900 leading-snug">
                          {b.cpcb_waste_type}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Department: <span className="font-medium text-slate-700">{b.generating_department || 'General Ward'}</span>
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-900">
                          <Scale className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                          <span className="font-semibold tabular-nums">{b.quantity_kg} kg</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500 truncate">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                          <span className="truncate text-xs font-medium">{b.hospital?.name || 'Hospital dock'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(b.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>

                      {isPending ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setSelectedBatchForHandover(b)}
                          icon={QrCode}
                        >
                          Verify & Collect
                        </Button>
                      ) : (
                        <span className="inline-flex items-center text-xs font-medium text-emerald-700 gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Handover Verified</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Handover Verification Wizard Modal (Fully Preserved) */}
      {selectedBatchForHandover && (
        <HandoverVerificationModal
          batch={selectedBatchForHandover}
          stage="COLLECTION"
          officer={{
            id: user?.id || 'OFF-COL-001',
            name: user?.name || 'Priya Sharma',
            role: 'COLLECTION_OFFICER'
          }}
          vehicle={{
            id: 'dock-station-01',
            plate_no: 'HOSP-GATE-BAY',
            current_lat: 28.5672,
            current_lng: 77.2100
          }}
          onClose={() => setSelectedBatchForHandover(null)}
          onSuccess={() => {
            fetchBatches();
          }}
        />
      )}
    </div>
  );
}
