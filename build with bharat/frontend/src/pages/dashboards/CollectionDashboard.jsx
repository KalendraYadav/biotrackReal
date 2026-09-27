import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import HandoverVerificationModal from '../../components/transport/HandoverVerificationModal';
import { 
  ShieldCheck, 
  QrCode, 
  Camera, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  Layers,
  RefreshCw,
  Search,
  Filter,
  Scale,
  Building2,
  Calendar,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';

const CATEGORY_STYLES = {
  YELLOW: { bg: 'bg-amber-50 text-amber-900 border-amber-300', dot: 'bg-amber-600' },
  RED: { bg: 'bg-biohazard-50 text-biohazard-900 border-biohazard-300', dot: 'bg-biohazard-600' },
  WHITE: { bg: 'bg-cream-100 text-steel-900 border-steel-300', dot: 'bg-steel-500' },
  BLUE: { bg: 'bg-sky-50 text-sky-900 border-sky-300', dot: 'bg-sky-600' }
};

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
  const collectedBatches = batches.filter(b => b.status === 'COLLECTED' || b.status === 'IN_TRANSIT' || b.status === 'RECEIVED' || b.status === 'TREATED' || b.status === 'DISPOSED');

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
    <div className="space-y-6 font-sans">
      {/* Role Banner */}
      <div className="bg-white rounded-lg border border-steel-200 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded bg-forest-900/10 border border-forest-700/30 flex items-center justify-center text-forest-800">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-serif font-bold text-steel-900 tracking-tight">Collection Officer Terminal</h1>
                <span className="text-xs px-2.5 py-0.5 rounded font-mono font-bold bg-cream-100 text-steel-800 border border-cream-300">
                  {user?.facility_name || 'EcoSafe Waste Handlers'}
                </span>
              </div>
              <p className="text-xs text-steel-600 mt-0.5 font-sans">
                Hospital bay waste reception &bull; Barcode scanning &bull; Weighbridge check &bull; Tamper seal inspection
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={fetchBatches}
              disabled={loading}
              className="px-3 py-1.5 rounded border border-steel-300 hover:bg-cream-100 text-xs font-semibold text-steel-800 flex items-center space-x-1.5 transition"
              title="Refresh queue"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-forest-700' : ''}`} />
              <span>Refresh</span>
            </button>
            <div className="text-xs font-mono text-steel-900 px-3 py-1.5 rounded bg-cream-100 border border-steel-300 font-bold">
              OFFICER: {user?.id || 'OFF-COL-001'}
            </div>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-steel-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-steel-600 uppercase tracking-wider">Awaiting Pickup</span>
            <div className="p-1.5 rounded bg-hazmat-100 text-hazmat-800">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-mono font-bold text-steel-950 mt-2">{readyForCollection.length} Batches</div>
          <div className="text-xs text-hazmat-700 font-mono mt-1 flex items-center space-x-1">
            <span>Ready at hospital dock</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-steel-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-steel-600 uppercase tracking-wider">Collected &amp; Verified</span>
            <div className="p-1.5 rounded bg-forest-100 text-forest-800">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-mono font-bold text-steel-950 mt-2">{collectedBatches.length} Batches</div>
          <div className="text-xs text-forest-700 font-mono mt-1">
            Chain of custody initialized
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-steel-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-steel-600 uppercase tracking-wider">Weight Collected</span>
            <div className="p-1.5 rounded bg-steel-100 text-steel-800">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-mono font-bold text-steel-950 mt-2">{totalCollectedKg.toFixed(1)} kg</div>
          <div className="text-xs text-steel-500 font-mono mt-1">Dock verified scale sum</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-steel-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-steel-600 uppercase tracking-wider">Compliance Score</span>
            <div className="p-1.5 rounded bg-forest-100 text-forest-800">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-mono font-bold text-forest-800 mt-2">100%</div>
          <div className="text-xs text-forest-700 font-mono mt-1">Zero missing photo/GPS tags</div>
        </div>
      </div>

      {/* Main Queue & Verification Workspace */}
      <div className="bg-white rounded-lg border border-steel-200 p-5 space-y-4">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-steel-100 pb-3">
          {/* Tabs */}
          <div className="flex items-center space-x-1.5 bg-cream-100 p-1 rounded border border-cream-200">
            <button
              onClick={() => setActiveTab('PENDING')}
              className={`px-3 py-1.5 text-xs font-bold rounded transition ${
                activeTab === 'PENDING'
                  ? 'bg-steel-900 text-cream-50'
                  : 'text-steel-600 hover:text-steel-900'
              }`}
            >
              Pending Collection ({readyForCollection.length})
            </button>
            <button
              onClick={() => setActiveTab('COLLECTED')}
              className={`px-3 py-1.5 text-xs font-bold rounded transition ${
                activeTab === 'COLLECTED'
                  ? 'bg-steel-900 text-cream-50'
                  : 'text-steel-600 hover:text-steel-900'
              }`}
            >
              Verified / En Route ({collectedBatches.length})
            </button>
          </div>

          {/* Search and Category Filter */}
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-steel-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search batch or hospital..."
                className="pl-8 pr-3 py-1.5 text-xs border border-steel-300 rounded focus:outline-none focus:border-steel-800 w-48 sm:w-60"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs border border-steel-300 rounded px-2.5 py-1.5 bg-white text-steel-700 focus:outline-none focus:border-steel-800 font-medium"
            >
              <option value="ALL">All Categories</option>
              <option value="YELLOW">Yellow (Infectious)</option>
              <option value="RED">Red (Contaminated Plastic)</option>
              <option value="WHITE">White (Sharps)</option>
              <option value="BLUE">Blue (Glassware)</option>
            </select>
          </div>
        </div>

        {/* Batch Queue Cards */}
        {loading ? (
          <div className="py-12 text-center text-steel-400 text-xs flex flex-col items-center">
            <RefreshCw className="w-6 h-6 animate-spin text-forest-700 mb-2" />
            <span className="font-mono">Loading CPCB custody queue...</span>
          </div>
        ) : filteredBatches.length === 0 ? (
          <div className="py-12 text-center text-steel-400 border-2 border-dashed border-steel-200 rounded-md bg-cream-50/50">
            <CheckCircle2 className="w-8 h-8 mx-auto text-forest-700 mb-2" />
            <h4 className="text-sm font-serif font-bold text-steel-800">
              {activeTab === 'PENDING' ? 'No Batches Awaiting Pickup' : 'No Batches Found'}
            </h4>
            <p className="text-xs text-steel-600 mt-1 max-w-sm mx-auto">
              {activeTab === 'PENDING' 
                ? 'All generated biomedical waste bags have been collected and verified with GPS and camera evidence.'
                : 'No waste batches match the selected search query or category filter.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredBatches.map((b) => {
              const catStyle = CATEGORY_STYLES[b.cpcb_waste_category] || CATEGORY_STYLES.YELLOW;
              const isPending = b.status === 'GENERATED';

              return (
                <div
                  key={b.id}
                  className="p-4 rounded-lg border border-steel-200 bg-white hover:border-steel-400 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-xs text-steel-900 bg-cream-100 border border-cream-200 px-2 py-0.5 rounded">
                          {b.batch_code}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border flex items-center space-x-1 ${catStyle.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-none ${catStyle.dot}`} />
                          <span>{b.cpcb_waste_category}</span>
                        </span>
                      </div>
                      <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                        isPending 
                          ? 'bg-hazmat-100 text-hazmat-900 border border-hazmat-300' 
                          : 'bg-forest-100 text-forest-900 border border-forest-300'
                      }`}>
                        {b.status}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-serif font-bold text-sm text-steel-900 leading-snug">
                        {b.cpcb_waste_type}
                      </h4>
                      <p className="text-xs text-steel-600 mt-0.5">
                        Department: <span className="font-semibold text-steel-800">{b.generating_department || 'General Ward'}</span>
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-steel-100 text-xs">
                      <div className="flex items-center space-x-1.5 text-steel-700">
                        <Scale className="w-3.5 h-3.5 text-steel-400" />
                        <span className="font-mono font-bold text-steel-900">{b.quantity_kg} kg</span>
                      </div>
                      <div className="flex items-center space-x-1.5 text-steel-600 truncate">
                        <Building2 className="w-3.5 h-3.5 text-steel-400 flex-shrink-0" />
                        <span className="truncate text-xs font-medium">{b.hospital?.name || 'Hospital Dock'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-steel-100 flex items-center justify-between">
                    <span className="text-[11px] text-steel-500 font-mono">
                      {new Date(b.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    {isPending ? (
                      <button
                        onClick={() => setSelectedBatchForHandover(b)}
                        className="px-3.5 py-1.5 bg-forest-800 hover:bg-forest-900 text-cream-50 text-xs font-bold rounded border border-forest-900 flex items-center space-x-1.5 transition"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Verify &amp; Collect</span>
                      </button>
                    ) : (
                      <span className="inline-flex items-center text-xs font-mono font-bold text-forest-800 space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
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

      {/* Handover Verification Wizard Modal */}
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
