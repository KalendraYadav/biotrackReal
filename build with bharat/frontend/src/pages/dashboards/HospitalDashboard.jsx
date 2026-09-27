import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../../context/AuthContext';
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
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    color: '#D97706',
    examples: 'Human anatomical tissues, soiled cotton, gauze, dressings, expired medicines',
    treatment: 'Incineration or Plasma Pyrolysis'
  },
  {
    code: 'Red',
    name: 'Contaminated Recyclable Plastics',
    badgeClass: 'bg-rose-100 text-rose-900 border-rose-300',
    color: '#E11D48',
    examples: 'Tubing, catheters, IV bottles, syringes without needles, vacutainers',
    treatment: 'Autoclaving / Microwaving followed by Shredding'
  },
  {
    code: 'White',
    name: 'Sharps & Needles',
    badgeClass: 'bg-slate-200 text-slate-900 border-slate-400',
    color: '#475569',
    examples: 'Needles with syringes, scalpels, blades, contaminated sharp metals',
    treatment: 'Autoclaving followed by Dry Heat Sterilization / Encapsulation'
  },
  {
    code: 'Blue',
    name: 'Glassware & Metallic Implants',
    badgeClass: 'bg-sky-100 text-sky-900 border-sky-300',
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

  // Estimated today weight fallback if mock generation timestamps were spread
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
      <div className="bg-white rounded-lg border border-steel-200 p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded bg-forest-900/10 border border-forest-700/30 flex items-center justify-center text-forest-800 flex-shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-serif font-bold text-steel-900 tracking-tight">Hospital Authority Dashboard</h1>
                <span className="text-xs px-2.5 py-0.5 rounded font-mono font-bold bg-cream-100 text-steel-800 border border-cream-300">
                  {activityData?.hospital?.name || user?.facility_name || 'AIIMS Central Hospital'}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded font-mono font-bold bg-forest-100 text-forest-900 border border-forest-300 flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-forest-700" />
                  Gate Verified
                </span>
              </div>
              <p className="text-xs text-steel-600 mt-1 max-w-2xl font-sans">
                Point-of-generation BMW manifest registration, dynamic QR bag tagging, and AI activity-based occupancy correlation.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono text-steel-800 px-3 py-1.5 rounded bg-cream-100 border border-steel-300 font-bold">
              CPCB Reg: CPCB-HOSP-DL-2024-001
            </span>
          </div>
        </div>
      </div>

      {/* 2. Header Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Beds & Occupancy */}
        <div className="bg-white p-4 rounded-lg border border-steel-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-steel-500">Beds &amp; Occupancy</span>
            <div className="p-1.5 rounded bg-steel-100 text-steel-800">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-mono font-bold text-steel-950">420 / 500</div>
            <div className="text-xs text-steel-500 mt-0.5 font-medium">84% current bed occupancy</div>
          </div>
          <div className="w-full bg-steel-100 rounded-full h-1.5 overflow-hidden">
            <div className="bg-forest-700 h-1.5 rounded-full" style={{ width: '84%' }}></div>
          </div>
        </div>

        {/* Surgeries Today */}
        <div className="bg-white p-4 rounded-lg border border-steel-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-steel-500">Clinical Activity Today</span>
            <div className="p-1.5 rounded bg-forest-100 text-forest-800">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-mono font-bold text-steel-950">34 Surgeries</div>
            <div className="text-xs text-steel-500 mt-0.5 font-medium">142 Outpatient OPD procedures</div>
          </div>
          <div className="flex items-center text-[11px] text-forest-800 font-mono font-semibold bg-forest-50 border border-forest-200 px-2 py-0.5 rounded w-fit">
            <TrendingUp className="w-3 h-3 mr-1" />
            Normal expected waste range
          </div>
        </div>

        {/* Waste Generated Today */}
        <div className="bg-white p-4 rounded-lg border border-steel-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-steel-500">Waste Logged Today</span>
            <div className="p-1.5 rounded bg-amber-100 text-amber-800">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-mono font-bold text-steel-950">{displayedWeightToday} kg</div>
            <div className="text-xs text-steel-500 mt-0.5 font-medium">{batches.length} registered batches</div>
          </div>
          <div className="flex items-center text-[11px] text-amber-900 font-mono font-semibold bg-amber-50 border border-amber-300 px-2 py-0.5 rounded w-fit">
            <Clock className="w-3 h-3 mr-1 text-amber-700" />
            {pendingCollectionCount} pending collection
          </div>
        </div>

        {/* Compliance Status */}
        <div className="bg-white p-4 rounded-lg border border-steel-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-steel-500">Compliance Status</span>
            <div className="p-1.5 rounded bg-forest-100 text-forest-800">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-mono font-bold text-forest-800">98.4%</div>
            <div className="text-xs text-steel-500 mt-0.5 font-medium">48h Statutory Disposal Compliance</div>
          </div>
          <div className="flex items-center text-[11px] text-forest-800 font-mono font-semibold bg-forest-50 px-2 py-0.5 rounded w-fit border border-forest-200">
            <CheckCircle2 className="w-3 h-3 mr-1 text-forest-700" />
            BMW Rules 2016 Compliant
          </div>
        </div>
      </div>

      {/* 3. Section Navigation Tabs */}
      <div className="flex items-center space-x-1.5 bg-cream-100 p-1 rounded border border-cream-200">
        <button
          onClick={() => setActiveTab('track')}
          className={`flex items-center px-3.5 py-2 rounded font-mono font-bold text-xs transition-all ${
            activeTab === 'track'
              ? 'bg-steel-900 text-cream-50'
              : 'text-steel-600 hover:text-steel-900'
          }`}
        >
          <Layers className="w-4 h-4 mr-2" />
          Live Waste Tracking ({batches.length})
        </button>

        <button
          onClick={() => setActiveTab('register')}
          className={`flex items-center px-3.5 py-2 rounded font-mono font-bold text-xs transition-all ${
            activeTab === 'register'
              ? 'bg-hazmat-600 text-steel-950'
              : 'text-steel-600 hover:text-steel-900'
          }`}
        >
          <PlusCircle className="w-4 h-4 mr-2" />
          Register New Waste Batch
        </button>

        <button
          onClick={() => setActiveTab('correlation')}
          className={`flex items-center px-3.5 py-2 rounded font-mono font-bold text-xs transition-all ${
            activeTab === 'correlation'
              ? 'bg-steel-900 text-cream-50'
              : 'text-steel-600 hover:text-steel-900'
          }`}
        >
          <Activity className="w-4 h-4 mr-2" />
          Activity Correlation &amp; Anomalies
        </button>
      </div>

      {/* 4. TAB CONTENT 1: Waste Tracking Table */}
      {activeTab === 'track' && (
        <div className="bg-white rounded-2xl shadow-subtle border border-slate-200 overflow-hidden animate-fade-in">
          {/* Table Header Controls */}
          <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <h2 className="font-bold text-base text-slate-900">Hospital Waste Batches Manifest</h2>
              <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-bold">
                {filteredBatches.length} of {batches.length}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search batch, department, category..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1F5C3B] w-full sm:w-64"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                {['ALL', 'GENERATED', 'COLLECTED', 'IN_TRANSIT', 'RECEIVED', 'TREATED', 'DISPOSED'].map(st => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors ${
                      statusFilter === st
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Batch Code</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Department</th>
                  <th className="px-5 py-3">Quantity</th>
                  <th className="px-5 py-3">Assigned CBWTF</th>
                  <th className="px-5 py-3">Lifecycle Status</th>
                  <th className="px-5 py-3">SLA Deadline</th>
                  <th className="px-5 py-3 text-right">QR Tag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {loadingBatches ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center space-y-2">
                        <div className="w-6 h-6 border-2 border-[#1F5C3B] border-t-transparent rounded-full animate-spin"></div>
                        <span>Loading waste manifests...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredBatches.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-slate-400">
                      No waste batches match the selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredBatches.map(b => {
                    const catObj = CPCB_CATEGORIES.find(c => c.code === b.cpcb_waste_category);
                    const deadline = new Date(b.compliance_deadline_at);
                    const isOverdue = new Date() > deadline && b.status !== 'DISPOSED';

                    return (
                      <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-3.5 font-mono font-bold text-slate-900">
                          {b.batch_code}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] border ${catObj?.badgeClass || 'bg-slate-100 text-slate-800'}`}>
                            {b.cpcb_waste_category}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-700">{b.generating_department}</td>
                        <td className="px-5 py-3.5 font-bold text-slate-900">{b.quantity_kg} kg</td>
                        <td className="px-5 py-3.5 text-slate-600 truncate max-w-[160px]">
                          {b.assigned_cbwtf?.name || 'EcoSafe Waste Handlers'}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase ${
                            b.status === 'GENERATED' ? 'bg-amber-50 text-amber-900 border border-amber-300' :
                            b.status === 'COLLECTED' ? 'bg-cream-100 text-steel-800 border border-cream-300' :
                            b.status === 'IN_TRANSIT' ? 'bg-hazmat-100 text-hazmat-900 border border-hazmat-300' :
                            b.status === 'RECEIVED' ? 'bg-steel-100 text-steel-900 border border-steel-300' :
                            'bg-forest-100 text-forest-900 border border-forest-300'
                          }`}>
                            {b.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center text-[11px] font-semibold ${
                            isOverdue ? 'text-rose-600 font-bold' : 'text-slate-500'
                          }`}>
                            {isOverdue && <AlertTriangle className="w-3 h-3 mr-1 text-rose-600" />}
                            {deadline.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => setQrModalBatch(b)}
                            className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors"
                          >
                            <QrCode className="w-3.5 h-3.5 mr-1 text-[#1F5C3B]" />
                            View Tag
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
      )}

      {/* 5. TAB CONTENT 2: Waste Registration Form */}
      {activeTab === 'register' && (
        <div className="bg-white rounded-2xl shadow-subtle border border-slate-200 p-6 sm:p-8 animate-fade-in max-w-4xl mx-auto">
          <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-[#FFF1EB] text-[#F1602A] flex items-center justify-center font-bold">
              <PlusCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Register New Biomedical Waste Batch</h2>
              <p className="text-xs text-slate-500">
                Creates verifiable digital chain-of-custody identity, logs initial GPS & timestamp, and generates bag QR tag.
              </p>
            </div>
          </div>

          <form onSubmit={handleRegisterSubmit} className="space-y-6">
            {/* Step 1: Generating Department */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                1. Generating Department / Ward
              </label>
              <select
                value={formData.generating_department}
                onChange={e => setFormData({ ...formData, generating_department: e.target.value })}
                className="w-full border border-slate-300 rounded-xl p-3 text-sm text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1F5C3B]"
              >
                {DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            {/* Step 2: CPCB Waste Category Selection (4 Color Cards) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                2. CPCB Biomedical Waste Category (Rule 2016)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
                      className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex flex-col justify-between ${
                        isSelected 
                          ? 'border-[#1F5C3B] bg-emerald-50/40 shadow-sm ring-1 ring-[#1F5C3B]' 
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`px-2.5 py-0.5 rounded font-black text-xs border ${cat.badgeClass}`}>
                            {cat.code}
                          </span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-[#1F5C3B]" />}
                        </div>
                        <div className="font-bold text-xs text-slate-900">{cat.name}</div>
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{cat.examples}</p>
                      </div>
                      <div className="text-[10px] font-semibold text-slate-400 mt-3 pt-2 border-t border-slate-100">
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
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  3. Specific Waste Content Description
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Soiled cotton pads, anatomical specimens"
                  value={formData.cpcb_waste_type}
                  onChange={e => setFormData({ ...formData, cpcb_waste_type: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl p-3 text-sm text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1F5C3B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  4. Measured Net Quantity (kg)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    placeholder="e.g. 18.5"
                    value={formData.quantity_kg}
                    onChange={e => setFormData({ ...formData, quantity_kg: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl p-3 text-sm text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1F5C3B]"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    KG
                  </span>
                </div>
              </div>
            </div>

            {/* Step 4: Assigned Destination CBWTF */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                5. Assigned Treatment Facility (CBWTF Destination)
              </label>
              <select
                value={formData.assigned_cbwtf_id}
                onChange={e => setFormData({ ...formData, assigned_cbwtf_id: e.target.value })}
                className="w-full border border-slate-300 rounded-xl p-3 text-sm text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1F5C3B]"
              >
                {CBWTF_FACILITIES.map(fac => (
                  <option key={fac.id} value={fac.id}>{fac.name}</option>
                ))}
              </select>
            </div>

            {/* Step 5: Verification & Authentication Stamp Banner with GPS Telemetry */}
            <div className="space-y-2">
              <div className="bg-[#EAF5EF] rounded-xl p-4 border border-[#1F5C3B]/20 flex items-start justify-between gap-3">
                <div className="flex items-start space-x-3">
                  <ShieldCheck className="w-5 h-5 text-[#1F5C3B] flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-[#123924]">
                    <span className="font-bold">Digital Gate Verification Stamp:</span> Logged by{' '}
                    <strong className="font-bold">{user?.name || 'Dr. Aarav Mehta'}</strong> ({user?.role || 'HOSPITAL_AUTHORITY'}).
                    <div className="mt-1 flex items-center space-x-2 font-mono text-[11px] text-forest-800">
                      <MapPin className="w-3.5 h-3.5 text-forest-600" />
                      <span>
                        Locking GPS: {gpsCoords.latitude.toFixed(4)}&deg; N, {gpsCoords.longitude.toFixed(4)}&deg; E
                        {gpsCoords.accuracy ? ` (Accuracy &plusmn;${gpsCoords.accuracy}m)` : ' (Facility Registered Gateway)'}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={requestLiveGps}
                  disabled={fetchingGps}
                  className="px-2.5 py-1 rounded bg-forest-100 hover:bg-forest-200 text-forest-800 text-xs font-mono font-medium flex items-center space-x-1 transition flex-shrink-0"
                  title="Refresh GPS Coordinates"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${fetchingGps ? 'animate-spin' : ''}`} />
                  <span>{fetchingGps ? 'Locating...' : 'Refresh GPS'}</span>
                </button>
              </div>

              {gpsCoords.error && (
                <div className="p-3 rounded-lg bg-hazmat-50 border border-hazmat-300 text-hazmat-900 text-xs font-mono flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-hazmat-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">GPS Geofence Notice: </span>
                    <span>{gpsCoords.error}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveTab('track')}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center px-6 py-2.5 rounded-xl bg-[#F1602A] hover:bg-[#DC4F1B] text-white text-xs font-bold shadow-md transition-colors disabled:opacity-50"
              >
                {submitting ? (
                  <span className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Generating Manifest & QR Tag...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <QrCode className="w-4 h-4 mr-2" />
                    Register Batch & Generate QR Bag Tag
                  </span>
                )}
              </button>
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
              <div className="w-10 h-10 rounded bg-forest-100 border border-forest-200 text-forest-800 flex items-center justify-center flex-shrink-0">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-base text-steel-900">Activity-Based Waste Validation Engine</h3>
                <p className="text-xs text-steel-600 mt-1 max-w-3xl">
                  Under CPCB guidelines, hospital biomedical waste correlates directly with bed occupancy and surgical procedures (~0.8 kg per occupied bed + 3.0 kg per surgery).
                  The AI Risk Engine monitors this 90-day timeline to identify potential unreported waste dumping or unverified hazardous waste mixing.
                </p>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Hospital Bed Capacity</div>
                <div className="text-xl font-bold text-slate-900 mt-1">{activityData?.statistics?.bed_count || 500} Beds</div>
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Average Daily Occupancy</div>
                <div className="text-xl font-bold text-slate-900 mt-1">{activityData?.statistics?.average_occupancy || 412} Patients</div>
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Average Daily Waste</div>
                <div className="text-xl font-bold text-slate-900 mt-1">{activityData?.statistics?.daily_average_kg || 155.2} kg/day</div>
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Detected Anomaly Days</div>
                <div className="text-xl font-bold text-rose-600 mt-1">{activityData?.anomalies_detected || 2} Anomalies</div>
              </div>
            </div>
          </div>

          {/* Injected Anomalies Callout Cards */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm text-slate-900 flex items-center">
              <AlertOctagon className="w-4 h-4 mr-1.5 text-rose-600" />
              Flagged Activity Correlation Anomalies (AI Validation Highlights)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Anomaly 1: Unreported waste drop */}
              <div className="p-4 rounded-xl border-2 border-rose-200 bg-rose-50/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-200 text-rose-900">
                      Under-Reported Waste Anomaly
                    </span>
                    <span className="text-xs font-mono font-bold text-rose-700">14 Days Ago</span>
                  </div>
                  <div className="text-xs font-bold text-slate-900">High Patient Activity Surge &bull; 75% Waste Drop</div>
                  <p className="text-xs text-slate-600 mt-1">
                    Bed occupancy was at <strong>95% (475 patients)</strong> with <strong>45 major surgeries</strong>, yet only <strong>48.2 kg</strong> of waste was logged (expected ~192.5 kg).
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-rose-200/60 text-[11px] font-semibold text-rose-800">
                  Regulatory Risk: Potential unmanifested waste dumping or off-grid collection breach.
                </div>
              </div>

              {/* Anomaly 2: Extreme waste spike */}
              <div className="p-4 rounded-xl border-2 border-amber-200 bg-amber-50/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-200 text-amber-900">
                      Waste Spike Anomaly
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-700">42 Days Ago</span>
                  </div>
                  <div className="text-xs font-bold text-slate-900">Low Occupancy &bull; 185% Waste Volume Surge</div>
                  <p className="text-xs text-slate-600 mt-1">
                    Normal bed occupancy (310 patients) resulted in an abnormal spike of <strong>442.0 kg</strong> of waste logged (expected ~155.0 kg).
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-amber-200/60 text-[11px] font-semibold text-amber-800">
                  Regulatory Risk: Potential non-biomedical general refuse mixing into clinical stream.
                </div>
              </div>
            </div>
          </div>

          {/* Activity Log Timeline Table */}
          <div className="bg-white rounded-2xl shadow-subtle border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h4 className="font-bold text-sm text-slate-900">90-Day Hospital Activity & Expected Waste Validation Log</h4>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider sticky top-0">
                  <tr>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Bed Occupancy</th>
                    <th className="px-6 py-3">Surgeries</th>
                    <th className="px-6 py-3">OPD Visits</th>
                    <th className="px-6 py-3">Logged Waste</th>
                    <th className="px-6 py-3">Correlation Ratio</th>
                    <th className="px-6 py-3">AI Validation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {(activityData?.activity_logs || []).slice(0, 20).map((log, idx) => {
                    const isAnomaly = log.anomaly !== null;
                    return (
                      <tr key={idx} className={isAnomaly ? 'bg-rose-50/60' : 'hover:bg-slate-50'}>
                        <td className="px-6 py-3 font-mono text-slate-900">
                          {new Date(log.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-6 py-3 font-semibold text-slate-800">{log.bed_occupancy} beds</td>
                        <td className="px-6 py-3 text-slate-600">{log.surgeries_count}</td>
                        <td className="px-6 py-3 text-slate-600">{log.ops_count}</td>
                        <td className="px-6 py-3 font-bold text-slate-900">{log.expected_waste_kg} kg</td>
                        <td className="px-6 py-3 font-mono text-slate-600">{log.waste_per_bed_ratio} kg/bed</td>
                        <td className="px-6 py-3">
                          {isAnomaly ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              {log.anomaly.type.replace('_', ' ')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[11px] text-emerald-700 font-semibold">
                              <Check className="w-3.5 h-3.5 mr-1" />
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
        <div className="fixed inset-0 z-50 bg-steel-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in font-sans">
          <div className="bg-white rounded-lg shadow-modal max-w-md w-full p-6 border-2 border-steel-800 text-center relative overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-steel-200 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded bg-forest-100 text-forest-800 flex items-center justify-center border border-forest-300">
                  <QrCode className="w-4 h-4" />
                </div>
                <h3 className="font-serif font-bold text-sm text-steel-900">Biomedical Waste QR Bag Tag</h3>
              </div>
              <button
                onClick={() => setQrModalBatch(null)}
                className="p-1.5 rounded text-steel-400 hover:text-steel-600 hover:bg-cream-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Bag Tag Visual Layout */}
            <div className="border-2 border-dashed border-steel-300 rounded p-4 bg-cream-50 mb-4 text-left">
              <div className="flex items-center justify-between border-b border-steel-200 pb-2 mb-3">
                <div>
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-steel-500">CPCB Form VI Certified Tag</div>
                  <div className="text-xs font-serif font-bold text-steel-900">{activityData?.hospital?.name || 'AIIMS Central Hospital'}</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-steel-950 text-cream-100">
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
                <div className="font-mono font-bold text-xs text-slate-900 mt-2 tracking-wider">
                  {qrModalBatch.batch_code}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {qrModalBatch.qr_code_value}
                </div>
              </div>

              {/* Tag Details */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Category:</span>
                  <div className="font-bold text-slate-900">{qrModalBatch.cpcb_waste_category}</div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Net Weight:</span>
                  <div className="font-bold text-slate-900">{qrModalBatch.quantity_kg} kg</div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Department:</span>
                  <div className="text-slate-700 font-medium truncate">{qrModalBatch.generating_department}</div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Registered:</span>
                  <div className="text-slate-700 font-medium">{new Date(qrModalBatch.created_at).toLocaleDateString()}</div>
                </div>
              </div>
            </div>

            {/* Print & Action Buttons */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => window.print()}
                className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-[#1F5C3B] hover:bg-emerald-900 text-white text-xs font-bold shadow-md transition-colors"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print Physical Bag Tag
              </button>

              <button
                onClick={() => setQrModalBatch(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
