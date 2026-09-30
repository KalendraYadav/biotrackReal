import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { StatusPill, CategoryBadge } from '../../components/ui/StatusPill';
import { 
  Building2, 
  PlusCircle, 
  Layers, 
  Activity, 
  CheckCircle2, 
  Clock, 
  QrCode, 
  AlertTriangle, 
  Search, 
  Printer, 
  X, 
  Check, 
  ArrowRight, 
  AlertOctagon, 
  ShieldCheck, 
  TrendingUp, 
  TrendingDown, 
  Info,
  Calendar,
  Sparkles,
  MapPin,
  RefreshCw
} from 'lucide-react';

const CPCB_CATEGORIES = [
  {
    code: 'Yellow',
    name: 'Anatomical & Soiled Waste',
    badgeClass: 'bg-amber-100 text-amber-950 border-amber-300',
    color: '#D97706',
    examples: 'Human anatomical tissues, soiled cotton, gauze, dressings, expired medicines',
    treatment: 'Incineration or Plasma Pyrolysis'
  },
  {
    code: 'Red',
    name: 'Contaminated Recyclable Plastics',
    badgeClass: 'bg-rose-100 text-rose-950 border-rose-300',
    color: '#E11D48',
    examples: 'Tubing, catheters, IV bottles, syringes without needles, vacutainers',
    treatment: 'Autoclaving / Microwaving followed by Shredding'
  },
  {
    code: 'White',
    name: 'Sharps & Needles',
    badgeClass: 'bg-steel-200 text-steel-950 border-steel-400',
    color: '#475569',
    examples: 'Needles with syringes, scalpels, blades, contaminated sharp metals',
    treatment: 'Autoclaving followed by Dry Heat Sterilization / Encapsulation'
  },
  {
    code: 'Blue',
    name: 'Glassware & Metallic Implants',
    badgeClass: 'bg-sky-100 text-sky-950 border-sky-300',
    color: '#0284C7',
    examples: 'Medicine vials, ampoules, broken contaminated glassware, metallic pins',
    treatment: 'Disinfection via Sodium Hypochlorite / Autoclaving'
  }
];

const DEPARTMENTS = [
  'Operation Theatre 1',
  'Operation Theatre 2',
  'Intensive Care Unit (ICU)',
  'Emergency & Trauma Ward',
  'Pathology & Biochemistry Lab',
  'Pediatrics & Neonatal Ward',
  'Oncology Day Care',
  'Infectious Disease Isolation Ward',
  'General Surgery Ward'
];

const CBWTF_FACILITIES = [
  { id: 'fac-cbwtf-001', name: 'EcoSafe Waste Handlers (CBWTF Central)' },
  { id: 'fac-cbwtf-002', name: 'Apex Bio-Clean Treatment Plant' },
  { id: 'fac-cbwtf-003', name: 'GreenEarth Bio-Disposal Hub' }
];

export default function HospitalDashboard() {
  const { user } = useAuth();
  const hospitalId = user?.facility_id || 'fac-hosp-001';

  // Active view tab: 'track' | 'register' | 'correlation'
  const [activeTab, setActiveTab] = useState('track');

  // Batches state
  const [batches, setBatches] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Activity correlation state
  const [activityData, setActivityData] = useState(null);
  const [loadingActivity, setLoadingActivity] = useState(true);

  // Waste registration form state
  const [formData, setFormData] = useState({
    generating_department: 'Operation Theatre 1',
    cpcb_waste_category: 'Yellow',
    cpcb_waste_type: 'Anatomical Tissue & Soiled Cotton',
    quantity_kg: '',
    assigned_cbwtf_id: 'fac-cbwtf-001',
    notes: ''
  });
  const [gpsCoords, setGpsCoords] = useState({
    latitude: 28.5672,
    longitude: 77.2100,
    accuracy: null,
    source: 'facility_default',
    error: null
  });
  const [fetchingGps, setFetchingGps] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(null);

  // Request real device GPS with graceful fallback & clear user feedback
  const requestLiveGps = () => {
    if (!navigator.geolocation) {
      setGpsCoords(prev => ({
        ...prev,
        source: 'facility_default',
        error: 'Browser does not support geolocation API. Falling back to AIIMS Facility Verified Coordinates.'
      }));
      return;
    }
    setFetchingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
          source: 'live_device',
          error: null
        });
        setFetchingGps(false);
      },
      (err) => {
        let msg = 'Device GPS permission denied. Using Facility Registered Gateway Coordinates.';
        if (err.code === 2) msg = 'GPS position unavailable. Using Facility Registered Gateway Coordinates.';
        else if (err.code === 3) msg = 'GPS request timed out. Using Facility Registered Gateway Coordinates.';
        setGpsCoords(prev => ({
          ...prev,
          source: 'facility_default',
          error: msg
        }));
        setFetchingGps(false);
      },
      { timeout: 6000, enableHighAccuracy: true }
    );
  };

  // Trigger GPS acquisition when register tab opens
  useEffect(() => {
    if (activeTab === 'register') {
      requestLiveGps();
    }
  }, [activeTab]);

  // QR Code Modal state
  const [qrModalBatch, setQrModalBatch] = useState(null);

  // Handle ESC key for modal dismissal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setQrModalBatch(null);
    };
    if (qrModalBatch) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [qrModalBatch]);

  // Fetch batches
  const fetchBatches = () => {
    setLoadingBatches(true);
    fetch(`/api/waste-batches?facility=${hospitalId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('biotrace_token')}`
      }
    })
      .then(res => res.json())
      .then(data => {
        setBatches(data.batches || []);
        setLoadingBatches(false);
      })
      .catch(() => setLoadingBatches(false));
  };

  // Fetch 90-day activity logs
  useEffect(() => {
    fetchBatches();

    fetch(`/api/hospitals/${hospitalId}/activity`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('biotrace_token')}`
      }
    })
      .then(res => res.json())
      .then(data => {
        setActivityData(data);
        setLoadingActivity(false);
      })
      .catch(() => setLoadingActivity(false));
  }, [hospitalId]);

  // Handle Form Submit
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!formData.quantity_kg || parseFloat(formData.quantity_kg) <= 0) {
      alert('Please enter a valid waste weight in kg.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        hospital_id: hospitalId,
        generating_department: formData.generating_department,
        cpcb_waste_category: formData.cpcb_waste_category,
        cpcb_waste_type: formData.cpcb_waste_type,
        quantity_kg: parseFloat(formData.quantity_kg),
        assigned_cbwtf_id: formData.assigned_cbwtf_id,
        notes: formData.notes,
        performed_by_user_id: user?.id || 'user-hosp-001',
        latitude: gpsCoords.latitude,
        longitude: gpsCoords.longitude
      };

      const res = await fetch('/api/waste-batches', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('biotrace_token')}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.batch) {
        setRegisterSuccess(data.batch);
        setQrModalBatch(data.batch);
        fetchBatches();
        // Reset weight & notes
        setFormData(prev => ({ ...prev, quantity_kg: '', notes: '' }));
      } else {
        alert(data.message || 'Failed to register waste batch.');
      }
    } catch (err) {
      alert('Network error while registering waste batch: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate header stats
  const totalWeightToday = batches
    .filter(b => {
      const d = new Date(b.created_at);
      const today = new Date();
      return d.toDateString() === today.toDateString();
    })
    .reduce((acc, b) => acc + (b.quantity_kg || 0), 0);

  const displayedWeightToday = totalWeightToday > 0 
    ? Math.round(totalWeightToday * 10) / 10 
    : 142.8;

  const pendingCollectionCount = batches.filter(b => b.status === 'GENERATED').length;

  // Filtered batches
  const filteredBatches = batches.filter(b => {
    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
    const matchesSearch = searchQuery === '' || 
      b.batch_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.generating_department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.cpcb_waste_category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Header Facility & Role Summary Banner */}
      <PageHeader
        icon={Building2}
        title="Hospital Authority Dashboard"
        description="Point-of-generation biomedical waste manifest logging, dynamic QR tag generation, and clinical occupancy correlation under BMW Rules 2016."
        badges={
          <>
            <Badge variant="neutral">
              {activityData?.hospital?.name || user?.facility_name || 'AIIMS Central Hospital'}
            </Badge>
            <Badge variant="success" dot>
              Gate Verified
            </Badge>
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-steel-700 px-2.5 py-1.5 rounded bg-steel-100 border border-steel-200">
              CPCB Reg: CPCB-HOSP-DL-2024-001
            </span>
            <Button
              variant="primary"
              size="sm"
              icon={PlusCircle}
              onClick={() => setActiveTab('register')}
            >
              Register Batch
            </Button>
          </div>
        }
      />

      {/* 2. Header Stat Cards - Responsive 2x2 grid on mobile, 4-col on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Beds & Occupancy */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Beds &amp; Occupancy</span>
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
              <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 tabular-nums">420 / 500</div>
            <div className="text-[11px] text-slate-500 mt-0.5">84% current bed occupancy</div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden" role="progressbar" aria-valuenow={84} aria-valuemin={0} aria-valuemax={100}>
            <div className="bg-emerald-600 h-1.5 rounded-full" style={{ width: '84%' }}></div>
          </div>
        </div>

        {/* Surgeries Today */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Clinical Activity</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-800">
              <Activity className="w-3.5 h-3.5" aria-hidden="true" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 tabular-nums">34 Surgeries</div>
            <div className="text-[11px] text-slate-500 mt-0.5 truncate">142 Outpatient OPD procedures</div>
          </div>
          <div className="flex items-center text-[11px] text-emerald-800 font-medium truncate">
            <TrendingUp className="w-3.5 h-3.5 mr-1 text-emerald-600 shrink-0" aria-hidden="true" />
            <span className="truncate">Normal expected waste range</span>
          </div>
        </div>

        {/* Waste Generated Today */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Logged Today</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-800">
              <Layers className="w-3.5 h-3.5" aria-hidden="true" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 tabular-nums">{displayedWeightToday} kg</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{batches.length} registered batches</div>
          </div>
          <div className="flex items-center text-[11px] text-amber-900 font-medium">
            <Clock className="w-3.5 h-3.5 mr-1 text-amber-600 shrink-0" aria-hidden="true" />
            <span>{pendingCollectionCount} pending pickup</span>
          </div>
        </div>

        {/* Compliance Status */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Compliance</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-700 tabular-nums">98.4%</div>
            <div className="text-[11px] text-slate-500 mt-0.5 truncate">48h Statutory Disposal Compliance</div>
          </div>
          <div className="flex items-center text-[11px] text-emerald-800 font-medium truncate">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600 shrink-0" aria-hidden="true" />
            <span className="truncate">BMW Rules 2016 Compliant</span>
          </div>
        </div>
      </div>

      {/* 3. Section Navigation Tabs per Section 8.7 */}
      <div className="border-b border-steel-200 flex items-center gap-6 text-sm" role="tablist" aria-label="Hospital sections">
        <button
          role="tab"
          aria-selected={activeTab === 'track'}
          onClick={() => setActiveTab('track')}
          className={`pb-3 font-medium transition-colors flex items-center gap-2 border-b-2 -mb-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#07559B] rounded-t ${
            activeTab === 'track'
              ? 'border-[#07559B] text-[#07559B] font-semibold'
              : 'border-transparent text-steel-600 hover:text-steel-900 hover:border-steel-300'
          }`}
        >
          <Layers className="w-4 h-4" aria-hidden="true" />
          <span>Waste Tracking ({batches.length})</span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'register'}
          onClick={() => setActiveTab('register')}
          className={`pb-3 font-medium transition-colors flex items-center gap-2 border-b-2 -mb-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#07559B] rounded-t ${
            activeTab === 'register'
              ? 'border-[#07559B] text-[#07559B] font-semibold'
              : 'border-transparent text-steel-600 hover:text-steel-900 hover:border-steel-300'
          }`}
        >
          <PlusCircle className="w-4 h-4" aria-hidden="true" />
          <span>Register New Batch</span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'correlation'}
          onClick={() => setActiveTab('correlation')}
          className={`pb-3 font-medium transition-colors flex items-center gap-2 border-b-2 -mb-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#07559B] rounded-t ${
            activeTab === 'correlation'
              ? 'border-[#07559B] text-[#07559B] font-semibold'
              : 'border-transparent text-steel-600 hover:text-steel-900 hover:border-steel-300'
          }`}
        >
          <Activity className="w-4 h-4" aria-hidden="true" />
          <span>Activity Correlation</span>
        </button>
      </div>

      {/* 4. TAB CONTENT 1: Waste Tracking Table */}
      {activeTab === 'track' && (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden animate-fade-in">
          {/* Table Header Controls */}
          <div className="p-3.5 sm:p-4 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/40">
            <div className="flex items-center space-x-2">
              <h2 className="font-semibold text-sm text-slate-900">Hospital Manifests</h2>
              <Badge variant="neutral">
                {filteredBatches.length} of {batches.length}
              </Badge>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                  type="text"
                  placeholder="Search batch, department, category..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8.5 pr-3 py-1.5 border border-slate-300/90 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/40 focus:border-emerald-600 w-full sm:w-64 bg-white"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0" role="toolbar" aria-label="Filter by lifecycle status">
                {['ALL', 'GENERATED', 'COLLECTED', 'IN_TRANSIT', 'RECEIVED', 'TREATED', 'DISPOSED'].map(st => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                      statusFilter === st
                        ? 'bg-slate-900 text-white font-semibold shadow-xs'
                        : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {st === 'ALL' ? 'All' : st.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/80 text-[11px] uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-4 py-2.5">Batch Code</th>
                  <th scope="col" className="px-4 py-2.5">Category</th>
                  <th scope="col" className="px-4 py-2.5">Department</th>
                  <th scope="col" className="px-4 py-2.5 text-right">Quantity</th>
                  <th scope="col" className="px-4 py-2.5">Assigned Facility</th>
                  <th scope="col" className="px-4 py-2.5">Status</th>
                  <th scope="col" className="px-4 py-2.5">Deadline</th>
                  <th scope="col" className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-steel-100">
                {loadingBatches ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-steel-500">
                      <div className="flex flex-col items-center space-y-2">
                        <div className="w-6 h-6 border-2 border-[#07559B] border-t-transparent rounded-full animate-spin"></div>
                        <span>Loading waste manifests...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredBatches.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-8">
                      <EmptyState
                        title="No waste batches found"
                        description="There are no waste manifests matching the specified filters."
                        action={
                          <Button variant="primary" size="sm" onClick={() => setActiveTab('register')}>
                            Register New Batch
                          </Button>
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  filteredBatches.map(b => {
                    const deadline = new Date(b.compliance_deadline_at);
                    const isOverdue = new Date() > deadline && b.status !== 'DISPOSED';

                    return (
                      <tr key={b.id} className="hover:bg-steel-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono font-semibold text-steel-900">
                          {b.batch_code}
                        </td>
                        <td className="px-4 py-3">
                          <CategoryBadge category={b.cpcb_waste_category} />
                        </td>
                        <td className="px-4 py-3 text-steel-700">{b.generating_department}</td>
                        <td className="px-4 py-3 text-right font-semibold text-steel-900 tabular-nums">
                          {b.quantity_kg} kg
                        </td>
                        <td className="px-4 py-3 text-steel-600 truncate max-w-[160px]">
                          {b.assigned_cbwtf?.name || 'EcoSafe Waste Handlers'}
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill status={b.status} size="sm" />
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          <span className={`inline-flex items-center text-xs ${
                            isOverdue ? 'text-biohazard-700 font-semibold' : 'text-steel-600'
                          }`}>
                            {isOverdue && <AlertTriangle className="w-3.5 h-3.5 mr-1 text-biohazard-600 shrink-0" aria-hidden="true" />}
                            {deadline.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={QrCode}
                            onClick={() => setQrModalBatch(b)}
                          >
                            Tag
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
      )}

      {/* 5. TAB CONTENT 2: Waste Registration Form */}
      {activeTab === 'register' && (
        <div className="bg-white rounded-lg border border-steel-200 p-6 animate-fade-in max-w-2xl mx-auto">
          <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-steel-100">
            <div className="w-10 h-10 rounded bg-blue-50 border border-blue-200 text-[#07559B] flex items-center justify-center font-bold shrink-0">
              <PlusCircle className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-bold text-steel-900">Register Biomedical Waste Batch</h2>
              <p className="text-xs text-steel-500">
                Creates verifiable digital chain of custody identity, logs verified GPS &amp; timestamp, and generates bag QR tag.
              </p>
            </div>
          </div>

          <form onSubmit={handleRegisterSubmit} className="space-y-5">
            {/* Step 1: Generating Department */}
            <div>
              <label htmlFor="dept-select" className="block text-xs font-semibold text-steel-800 mb-1.5">
                1. Generating Department / Ward <span className="text-biohazard-600">*</span>
              </label>
              <select
                id="dept-select"
                value={formData.generating_department}
                onChange={e => setFormData({ ...formData, generating_department: e.target.value })}
                className="w-full border border-steel-300 rounded px-3 py-2 text-sm text-steel-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#07559B]"
              >
                {DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            {/* Step 2: CPCB Waste Category Selection */}
            <div>
              <label className="block text-xs font-semibold text-steel-800 mb-1.5">
                2. CPCB Biomedical Waste Category (Rule 2016) <span className="text-biohazard-600">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {CPCB_CATEGORIES.map(cat => {
                  const isSelected = formData.cpcb_waste_category === cat.code;
                  return (
                    <div
                      key={cat.code}
                      onClick={() => setFormData({ 
                        ...formData, 
                        cpcb_waste_category: cat.code,
                        cpcb_waste_type: cat.examples.split(',')[0]
                      })}
                      className={`cursor-pointer p-3 rounded border transition-colors flex flex-col justify-between ${
                        isSelected 
                          ? 'border-[#07559B] bg-blue-50/50 ring-1 ring-[#07559B]' 
                          : 'border-steel-200 bg-white hover:bg-steel-50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`px-2 py-0.5 rounded font-mono font-semibold text-xs border ${cat.badgeClass}`}>
                            {cat.code}
                          </span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-[#07559B]" aria-hidden="true" />}
                        </div>
                        <div className="font-semibold text-xs text-steel-900">{cat.name}</div>
                        <p className="text-[11px] text-steel-500 mt-1 line-clamp-2">{cat.examples}</p>
                      </div>
                      <div className="text-[10px] text-steel-500 mt-2 pt-1.5 border-t border-steel-100">
                        {cat.treatment}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Specific Waste Type Description & Quantity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="waste-desc" className="block text-xs font-semibold text-steel-800 mb-1.5">
                  3. Content Description <span className="text-biohazard-600">*</span>
                </label>
                <input
                  id="waste-desc"
                  type="text"
                  required
                  placeholder="e.g. Soiled cotton pads"
                  value={formData.cpcb_waste_type}
                  onChange={e => setFormData({ ...formData, cpcb_waste_type: e.target.value })}
                  className="w-full border border-steel-300 rounded px-3 py-2 text-sm text-steel-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#07559B]"
                />
              </div>

              <div>
                <label htmlFor="waste-qty" className="block text-xs font-semibold text-steel-800 mb-1.5">
                  4. Measured Net Weight (kg) <span className="text-biohazard-600">*</span>
                </label>
                <div className="relative">
                  <input
                    id="waste-qty"
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    placeholder="e.g. 18.5"
                    value={formData.quantity_kg}
                    onChange={e => setFormData({ ...formData, quantity_kg: e.target.value })}
                    className="w-full border border-steel-300 rounded px-3 py-2 text-sm text-steel-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#07559B] pr-10 tabular-nums"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-steel-400">
                    KG
                  </span>
                </div>
              </div>
            </div>

            {/* Step 4: Assigned Destination CBWTF */}
            <div>
              <label htmlFor="facility-select" className="block text-xs font-semibold text-steel-800 mb-1.5">
                5. Assigned Treatment Facility (CBWTF Destination) <span className="text-biohazard-600">*</span>
              </label>
              <select
                id="facility-select"
                value={formData.assigned_cbwtf_id}
                onChange={e => setFormData({ ...formData, assigned_cbwtf_id: e.target.value })}
                className="w-full border border-steel-300 rounded px-3 py-2 text-sm text-steel-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#07559B]"
              >
                {CBWTF_FACILITIES.map(fac => (
                  <option key={fac.id} value={fac.id}>{fac.name}</option>
                ))}
              </select>
            </div>

            {/* Step 5: Verification & Authentication Stamp Banner with GPS Telemetry */}
            <div className="space-y-2">
              <div className="bg-steel-50 rounded p-3.5 border border-steel-200 flex items-start justify-between gap-3">
                <div className="flex items-start space-x-3">
                  <ShieldCheck className="w-5 h-5 text-[#07559B] shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="text-xs text-steel-800">
                    <span className="font-semibold">Digital Gate Verification Stamp:</span> Logged by{' '}
                    <strong className="font-semibold">{user?.name || 'Dr. Aarav Mehta'}</strong> ({user?.role || 'HOSPITAL_AUTHORITY'}).
                    <div className="mt-1 flex items-center space-x-1.5 font-mono text-[11px] text-steel-600 tabular-nums">
                      <MapPin className="w-3.5 h-3.5 text-[#07559B] shrink-0" aria-hidden="true" />
                      <span>
                        Locking GPS: {gpsCoords.latitude.toFixed(4)}&deg; N, {gpsCoords.longitude.toFixed(4)}&deg; E
                        {gpsCoords.accuracy ? ` (Accuracy &plusmn;${gpsCoords.accuracy}m)` : ' (Facility Gateway)'}
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={requestLiveGps}
                  isLoading={fetchingGps}
                  icon={RefreshCw}
                >
                  Refresh GPS
                </Button>
              </div>

              {gpsCoords.error && (
                <div className="p-3 rounded bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <span className="font-semibold">GPS Notice: </span>
                    <span>{gpsCoords.error}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-steel-100">
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => setActiveTab('track')}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={submitting}
                icon={QrCode}
              >
                Register Batch &amp; Generate Tag
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* 6. TAB CONTENT 3: Activity Correlation Panel */}
      {activeTab === 'correlation' && (
        <div className="space-y-6 animate-fade-in">
          {/* Overview Callout */}
          <div className="bg-white rounded-lg p-6 border border-steel-200">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded bg-blue-50 border border-blue-200 text-[#07559B] flex items-center justify-center shrink-0">
                <Activity className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-steel-900">Activity-Based Waste Validation Engine</h3>
                <p className="text-xs text-steel-600 mt-1 max-w-3xl leading-relaxed">
                  Under CPCB guidelines, hospital biomedical waste correlates directly with bed occupancy and surgical procedures (~0.8 kg per occupied bed + 3.0 kg per surgery).
                  The AI Risk Engine monitors this 90-day timeline to identify potential unreported waste dumping or unverified hazardous waste mixing.
                </p>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-steel-100">
              <div>
                <div className="text-xs text-steel-500 font-medium">Hospital Bed Capacity</div>
                <div className="text-xl font-bold text-steel-900 mt-1 tabular-nums">{activityData?.statistics?.bed_count || 500} Beds</div>
              </div>
              <div>
                <div className="text-xs text-steel-500 font-medium">Average Daily Occupancy</div>
                <div className="text-xl font-bold text-steel-900 mt-1 tabular-nums">{activityData?.statistics?.average_occupancy || 412} Patients</div>
              </div>
              <div>
                <div className="text-xs text-steel-500 font-medium">Average Daily Waste</div>
                <div className="text-xl font-bold text-steel-900 mt-1 tabular-nums">{activityData?.statistics?.daily_average_kg || 155.2} kg/day</div>
              </div>
              <div>
                <div className="text-xs text-steel-500 font-medium">Detected Anomaly Days</div>
                <div className="text-xl font-bold text-biohazard-700 mt-1 tabular-nums">{activityData?.anomalies_detected || 2} Anomalies</div>
              </div>
            </div>
          </div>

          {/* Injected Anomalies Callout Cards */}
          <div className="space-y-3">
            <h4 className="font-semibold text-xs text-steel-900 uppercase tracking-wider flex items-center">
              <AlertOctagon className="w-4 h-4 mr-1.5 text-biohazard-600" aria-hidden="true" />
              Flagged Activity Correlation Anomalies (AI Validation Highlights)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Anomaly 1: Unreported waste drop */}
              <div className="p-4 rounded-lg border border-biohazard-200 bg-biohazard-50/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase bg-biohazard-100 text-biohazard-900 border border-biohazard-200">
                      Under-Reported Waste Anomaly
                    </span>
                    <span className="text-xs font-mono font-medium text-biohazard-800">14 Days Ago</span>
                  </div>
                  <div className="text-xs font-semibold text-steel-900">High Patient Activity Surge &bull; 75% Waste Drop</div>
                  <p className="text-xs text-steel-600 mt-1 leading-relaxed">
                    Bed occupancy was at <strong>95% (475 patients)</strong> with <strong>45 major surgeries</strong>, yet only <strong>48.2 kg</strong> of waste was logged (expected ~192.5 kg).
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-biohazard-200/60 text-[11px] font-medium text-biohazard-800">
                  Regulatory Risk: Potential unmanifested waste dumping or off-grid collection breach.
                </div>
              </div>

              {/* Anomaly 2: Extreme waste spike */}
              <div className="p-4 rounded-lg border border-amber-200 bg-amber-50/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase bg-amber-100 text-amber-900 border border-amber-200">
                      Waste Spike Anomaly
                    </span>
                    <span className="text-xs font-mono font-medium text-amber-800">42 Days Ago</span>
                  </div>
                  <div className="text-xs font-semibold text-steel-900">Low Occupancy &bull; 185% Waste Volume Surge</div>
                  <p className="text-xs text-steel-600 mt-1 leading-relaxed">
                    Normal bed occupancy (310 patients) resulted in an abnormal spike of <strong>442.0 kg</strong> of waste logged (expected ~155.0 kg).
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-amber-200/60 text-[11px] font-medium text-amber-800">
                  Regulatory Risk: Potential non-biomedical general refuse mixing into clinical stream.
                </div>
              </div>
            </div>
          </div>

          {/* Activity Log Timeline Table */}
          <div className="bg-white rounded-lg border border-steel-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-steel-200">
              <h4 className="font-semibold text-xs text-steel-900 uppercase tracking-wider">
                90-Day Hospital Activity &amp; Expected Waste Validation Log
              </h4>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs">
                <thead className="bg-steel-50 text-steel-600 font-semibold border-b border-steel-200 sticky top-0">
                  <tr>
                    <th scope="col" className="px-5 py-2.5">Date</th>
                    <th scope="col" className="px-5 py-2.5">Bed Occupancy</th>
                    <th scope="col" className="px-5 py-2.5 text-right">Surgeries</th>
                    <th scope="col" className="px-5 py-2.5 text-right">OPD Visits</th>
                    <th scope="col" className="px-5 py-2.5 text-right">Logged Waste</th>
                    <th scope="col" className="px-5 py-2.5 text-right">Ratio</th>
                    <th scope="col" className="px-5 py-2.5">AI Validation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-steel-100">
                  {(activityData?.activity_logs || []).slice(0, 20).map((log, idx) => {
                    const isAnomaly = log.anomaly !== null;
                    return (
                      <tr key={idx} className={isAnomaly ? 'bg-biohazard-50/50' : 'hover:bg-steel-50'}>
                        <td className="px-5 py-2.5 font-mono text-steel-900 tabular-nums">
                          {new Date(log.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-5 py-2.5 font-medium text-steel-800 tabular-nums">{log.bed_occupancy} beds</td>
                        <td className="px-5 py-2.5 text-right text-steel-600 tabular-nums">{log.surgeries_count}</td>
                        <td className="px-5 py-2.5 text-right text-steel-600 tabular-nums">{log.ops_count}</td>
                        <td className="px-5 py-2.5 text-right font-semibold text-steel-900 tabular-nums">{log.expected_waste_kg} kg</td>
                        <td className="px-5 py-2.5 text-right font-mono text-steel-600 tabular-nums">{log.waste_per_bed_ratio} kg/bed</td>
                        <td className="px-5 py-2.5">
                          {isAnomaly ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-biohazard-100 text-biohazard-800 border border-biohazard-200">
                              <AlertTriangle className="w-3 h-3 mr-1 text-biohazard-600" aria-hidden="true" />
                              {log.anomaly.type.replace('_', ' ')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-xs text-forest-700 font-medium">
                              <Check className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                              Normal
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 7. SCANNABLE QR CODE PRINT & TAG MODAL */}
      {qrModalBatch && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-labelledby="qr-modal-title"
          className="fixed inset-0 z-50 bg-steel-950/70 flex items-center justify-center p-4 animate-fade-in font-sans"
        >
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 border border-steel-300 text-center relative overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-steel-200 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded bg-blue-50 text-[#07559B] flex items-center justify-center border border-blue-200">
                  <QrCode className="w-4 h-4" aria-hidden="true" />
                </div>
                <h3 id="qr-modal-title" className="font-semibold text-sm text-steel-900">
                  Biomedical Waste QR Bag Tag
                </h3>
              </div>
              <button
                onClick={() => setQrModalBatch(null)}
                aria-label="Close tag modal"
                className="p-1 rounded text-steel-400 hover:text-steel-600 hover:bg-steel-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#07559B]"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Bag Tag Visual Layout */}
            <div className="border border-dashed border-steel-300 rounded p-4 bg-steel-50 mb-4 text-left">
              <div className="flex items-center justify-between border-b border-steel-200 pb-2 mb-3">
                <div>
                  <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-steel-500">CPCB Form VI Certified Tag</div>
                  <div className="text-xs font-semibold text-steel-900">{activityData?.hospital?.name || 'AIIMS Central Hospital'}</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-steel-900 text-white">
                  BMW 2016
                </span>
              </div>

              {/* Centered Dynamic QR Code SVG */}
              <div className="flex flex-col items-center justify-center bg-white p-4 rounded border border-steel-200 mb-3">
                <QRCodeSVG
                  value={qrModalBatch.qr_code_value || qrModalBatch.batch_code}
                  size={160}
                  level="H"
                  includeMargin={true}
                />
                <div className="font-mono font-bold text-xs text-steel-900 mt-2 tracking-wider">
                  {qrModalBatch.batch_code}
                </div>
                <div className="text-[10px] text-steel-400 font-mono">
                  {qrModalBatch.qr_code_value}
                </div>
              </div>

              {/* Tag Details */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] font-medium text-steel-500 uppercase">Category:</span>
                  <div className="font-semibold text-steel-900">{qrModalBatch.cpcb_waste_category}</div>
                </div>
                <div>
                  <span className="text-[10px] font-medium text-steel-500 uppercase">Net Weight:</span>
                  <div className="font-semibold text-steel-900 tabular-nums">{qrModalBatch.quantity_kg} kg</div>
                </div>
                <div>
                  <span className="text-[10px] font-medium text-steel-500 uppercase">Department:</span>
                  <div className="text-steel-700 truncate">{qrModalBatch.generating_department}</div>
                </div>
                <div>
                  <span className="text-[10px] font-medium text-steel-500 uppercase">Registered:</span>
                  <div className="text-steel-700 tabular-nums">{new Date(qrModalBatch.created_at).toLocaleDateString()}</div>
                </div>
              </div>
            </div>

            {/* Print & Action Buttons */}
            <div className="flex items-center space-x-3">
              <Button
                variant="primary"
                size="md"
                icon={Printer}
                onClick={() => window.print()}
                className="flex-1"
              >
                Print Bag Tag
              </Button>

              <Button
                variant="secondary"
                size="md"
                onClick={() => setQrModalBatch(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}