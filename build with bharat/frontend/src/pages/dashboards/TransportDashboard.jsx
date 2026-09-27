import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import LiveTransitMap from '../../components/transport/LiveTransitMap';
import HandoverVerificationModal from '../../components/transport/HandoverVerificationModal';
import { 
  Truck, 
  MapPin, 
  Navigation, 
  Radio, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Package, 
  QrCode, 
  ArrowRight,
  RefreshCw,
  Clock,
  Building2,
  Scale,
  Phone
} from 'lucide-react';

export default function TransportDashboard() {
  const { user } = useAuth();

  const [vehicle, setVehicle] = useState({
    id: 'veh-001',
    plate_no: 'DL-01-AB-4421',
    current_lat: 28.5520,
    current_lng: 77.2400,
    speed: 38,
    driver_phone: '+91 98111 22334',
    driver_name: 'Vikram Singh'
  });

  const [allBatches, setAllBatches] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'pickup' | 'transit'
  const [searchQuery, setSearchQuery] = useState('');

  // Geofence Deviation State
  const [deviationState, setDeviationState] = useState({
    isDeviated: false,
    distanceKm: 0,
    plateNo: 'DL-01-AB-4421'
  });

  // Modal Handover State
  const [selectedBatchForHandover, setSelectedBatchForHandover] = useState(null);
  const [handoverStage, setHandoverStage] = useState('TRANSPORT_PICKUP');

  // Load batches relevant to transport (COLLECTED, IN_TRANSIT, RECEIVED)
  const loadBatches = async () => {
    setLoadingBatches(true);
    try {
      const res = await fetch('/api/waste-batches', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('biotrace_token')}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        const batches = data.batches || [];
        setAllBatches(batches);
      }
    } catch (err) {
      console.warn('Failed to load waste batches:', err.message);
    } finally {
      setLoadingBatches(false);
    }
  };

  const loadVehicle = async () => {
    try {
      const token = localStorage.getItem('biotrace_token');
      const res = await fetch('/api/vehicles', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        const v = data.vehicles?.[0];
        if (v) {
          setVehicle({
            id: v.id,
            plate_no: v.plate_no,
            current_lat: v.current_lat || 28.5520,
            current_lng: v.current_lng || 77.2400,
            speed: 38,
            driver_phone: v.driver_phone || v.transport_officer?.phone_number || '+91 98111 22334',
            driver_name: v.transport_officer?.name || user?.name || 'Vikram Singh'
          });
        }
      }
    } catch (err) {
      console.warn('Failed to load vehicle:', err.message);
    }
  };

  useEffect(() => {
    loadBatches();
    loadVehicle();
  }, []);

  // Filter transport batches
  const transportBatches = allBatches.filter(b => {
    // Show batches that are in stages relevant to transport
    const isRelevantStage = ['COLLECTED', 'IN_TRANSIT', 'RECEIVED', 'GENERATED'].includes(b.status);
    if (!isRelevantStage) return false;

    if (filterTab === 'pickup') return b.status === 'COLLECTED';
    if (filterTab === 'transit') return b.status === 'IN_TRANSIT';

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        b.batch_code?.toLowerCase().includes(q) ||
        b.cpcb_waste_category?.toLowerCase().includes(q) ||
        b.hospital?.name?.toLowerCase().includes(q) ||
        b.assigned_cbwtf?.name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const batchesInTransit = allBatches.filter(b => b.status === 'IN_TRANSIT');
  const batchesReadyPickup = allBatches.filter(b => b.status === 'COLLECTED');
  const totalCargoKg = batchesInTransit.reduce((acc, b) => acc + (b.quantity_kg || 0), 0);

  // Category Badge Helper
  const getCategoryBadge = (cat) => {
    switch (cat?.toLowerCase()) {
      case 'yellow':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'red':
        return 'bg-rose-100 text-rose-900 border-rose-300';
      case 'white':
        return 'bg-slate-100 text-slate-800 border-slate-300';
      case 'blue':
        return 'bg-sky-100 text-sky-900 border-sky-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Status Badge Helper
  const getStatusBadge = (status) => {
    switch (status) {
      case 'COLLECTED':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'IN_TRANSIT':
        return 'bg-orange-50 text-brand-orange border-orange-200 font-bold';
      case 'RECEIVED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  // Open Handover Modal for Pickup or Drop-off
  const handleStartHandover = (batch, stage) => {
    setSelectedBatchForHandover(batch);
    setHandoverStage(stage);
  };

  // On successful custody event completion
  const handleHandoverSuccess = () => {
    loadBatches();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Real-time Route Deviation Alert Banner */}
      {deviationState.isDeviated && (
        <div className="bg-biohazard-50 border-l-4 border-biohazard-600 rounded-r-lg p-4 shadow-panel flex flex-wrap items-center justify-between gap-3 text-biohazard-900 animate-pulse">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-biohazard-100 text-biohazard-700 rounded border border-biohazard-200">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-serif font-black text-sm">GEOFENCE ROUTE DEVIATION DETECTED</h4>
              <p className="text-xs text-biohazard-800 mt-0.5">
                Vehicle <span className="font-mono font-bold">{vehicle.plate_no}</span> is{' '}
                <span className="font-mono font-bold underline">{deviationState.distanceKm} km outside</span> approved safe green corridor. Real-time telemetry flagged and logged in CPCB Risk Engine.
              </p>
            </div>
          </div>
          <span className="text-xs bg-biohazard-600 text-white px-3 py-1 rounded font-mono font-bold">
            CPCB Rule 12 Breach Flag
          </span>
        </div>
      )}

      {/* Role Banner / Dispatch Terminal Header */}
      <div className="bg-white rounded-lg shadow-panel border border-hazmat-200 p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-lg bg-hazmat-100 border border-hazmat-300 flex items-center justify-center text-hazmat-900">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-serif font-black text-steel-900 tracking-tight">
                Transit Fleet Telemetry &amp; Geofence Enforcement
              </h1>
              <span className="text-[11px] px-2.5 py-0.5 rounded font-mono font-bold bg-hazmat-100 text-hazmat-900 border border-hazmat-300">
                CPCB Safe Corridor GPS Protocol
              </span>
            </div>
            <p className="text-xs text-steel-500 mt-0.5">
              Authorized Carrier: <span className="font-semibold text-steel-700">{user?.facility_name || 'EcoSafe Waste Handlers'}</span> &bull; Operator: <span className="font-mono text-steel-700">{user?.name || 'Vikram Singh'}</span>
            </p>
          </div>
        </div>

        {/* Live Corridor Status Indicator */}
        <div className="flex items-center space-x-3">
          <div className={`px-3 py-1.5 rounded border flex items-center space-x-2 text-xs font-mono font-bold ${
            deviationState.isDeviated 
              ? 'bg-biohazard-50 text-biohazard-800 border-biohazard-300 animate-pulse' 
              : 'bg-forest-50 text-forest-800 border-forest-300'
          }`}>
            <span className={`w-2 h-2 rounded-full ${deviationState.isDeviated ? 'bg-biohazard-600' : 'bg-forest-600 animate-ping'}`} />
            <span>{deviationState.isDeviated ? 'ROUTE DEVIATION DETECTED' : 'SAFE CORRIDOR: COMPLIANT'}</span>
          </div>

          <button
            onClick={loadBatches}
            className="p-2 border border-hazmat-300 rounded hover:bg-hazmat-50 text-steel-600 transition"
            title="Refresh Fleet Data"
          >
            <RefreshCw className={`w-4 h-4 ${loadingBatches ? 'animate-spin text-hazmat-700' : ''}`} />
          </button>
        </div>
      </div>

      {/* Top Header Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1: Active Fleet Vehicle */}
        <div className="bg-white rounded-lg p-4 shadow-panel border border-hazmat-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-steel-500">Fleet Vehicle</p>
            <p className="text-xl font-serif font-black text-steel-900 mt-1 font-mono">{vehicle.plate_no}</p>
            <p className="text-xs text-steel-600 mt-0.5 font-mono">
              Driver: <span className="font-semibold text-steel-800">{vehicle.driver_name || user?.name || 'Vikram Singh'}</span>
            </p>
            <p className="text-xs text-forest-800 mt-1 font-mono flex items-center space-x-1.5 font-semibold">
              <Phone className="w-3 h-3 text-forest-600" />
              <span>{vehicle.driver_phone || user?.phone_number || '+91 98111 22334'}</span>
            </p>
          </div>
          <div className="w-11 h-11 rounded-lg bg-hazmat-50 border border-hazmat-200 text-hazmat-900 flex items-center justify-center">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Geofence Corridor Status */}
        <div className="bg-white rounded-lg p-4 shadow-panel border border-hazmat-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-steel-500">Corridor Boundary</p>
            <div className="flex items-center space-x-1.5 mt-1">
              <div className={`w-2 h-2 rounded-full ${
                deviationState.isDeviated ? 'bg-biohazard-600 animate-ping' : 'bg-forest-600'
              }`} />
              <p className={`text-sm font-mono font-bold ${
                deviationState.isDeviated ? 'text-biohazard-700' : 'text-forest-700'
              }`}>
                {deviationState.isDeviated ? 'DEVIATION ALERT' : 'SECURE (±2.0 km)'}
              </p>
            </div>
            <p className="text-xs text-steel-500 mt-0.5 font-mono">
              {deviationState.isDeviated 
                ? `+${deviationState.distanceKm} km off corridor` 
                : 'AIIMS → EcoSafe Corridor'}
            </p>
          </div>
          <div className={`w-11 h-11 rounded-lg flex items-center justify-center border ${
            deviationState.isDeviated ? 'bg-biohazard-50 border-biohazard-200 text-biohazard-700' : 'bg-forest-50 border-forest-200 text-forest-800'
          }`}>
            <Navigation className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Active Cargo on Board */}
        <div className="bg-white rounded-lg p-4 shadow-panel border border-hazmat-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-steel-500">Cargo in Transit</p>
            <p className="text-xl font-serif font-black text-steel-900 mt-1">
              {batchesInTransit.length} <span className="text-xs font-normal text-steel-500 font-mono">batches</span>
            </p>
            <p className="text-xs text-hazmat-900 font-mono font-bold mt-0.5">
              {totalCargoKg.toFixed(1)} kg sealed cargo
            </p>
          </div>
          <div className="w-11 h-11 rounded-lg bg-hazmat-50 border border-hazmat-200 text-hazmat-800 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Pickups Awaiting Collection */}
        <div className="bg-white rounded-lg p-4 shadow-panel border border-hazmat-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-steel-500">Assigned Pickups</p>
            <p className="text-xl font-serif font-black text-steel-900 mt-1">
              {batchesReadyPickup.length} <span className="text-xs font-normal text-steel-500 font-mono">at dock</span>
            </p>
            <p className="text-xs text-forest-800 font-mono font-semibold mt-0.5">
              Hospital bay staging
            </p>
          </div>
          <div className="w-11 h-11 rounded-lg bg-hazmat-50 border border-hazmat-200 text-steel-700 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* SECTION 1: LIVE TRANSIT MAP VIEW */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-serif font-black text-steel-900 uppercase tracking-wide">
              Live Vehicle Transit &amp; Geofenced Corridor
            </h2>
            <p className="text-xs text-steel-500">
              OpenStreetMap telemetry tracking with CPCB approved safe corridor boundary overlay.
            </p>
          </div>
          <div className="flex items-center space-x-2 text-xs font-mono text-steel-500">
            <span className="w-2 h-2 rounded-full bg-forest-600 animate-pulse"></span>
            <span>Live GPS Telemetry Active</span>
          </div>
        </div>

        <LiveTransitMap
          vehicleId={vehicle.id}
          plateNo={vehicle.plate_no}
          onDeviationChange={(dev) => setDeviationState(dev)}
        />
      </div>

      {/* SECTION 2: ASSIGNED PICKUPS & ACTIVE TRANSIT MANIFEST */}
      <div className="bg-white rounded-lg shadow-panel border border-hazmat-200 overflow-hidden">
        <div className="p-4 border-b border-hazmat-200 flex flex-wrap items-center justify-between gap-3 bg-hazmat-50/50">
          <div>
            <h2 className="font-serif font-black text-sm text-steel-900 uppercase tracking-tight">
              Assigned Pickups &amp; Transit Manifest
            </h2>
            <p className="text-xs text-steel-500">
              Select any batch to initiate the 5-step QR, PIN, Camera, and Geolocation custody verification flow.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {/* Filter Pills */}
            <div className="flex bg-hazmat-100 p-1 rounded text-xs font-mono font-bold">
              <button
                onClick={() => setFilterTab('all')}
                className={`px-3 py-1 rounded transition ${
                  filterTab === 'all' ? 'bg-white text-steel-900 shadow-sm border border-hazmat-200' : 'text-steel-600 hover:text-steel-900'
                }`}
              >
                All ({allBatches.length})
              </button>
              <button
                onClick={() => setFilterTab('pickup')}
                className={`px-3 py-1 rounded transition ${
                  filterTab === 'pickup' ? 'bg-white text-steel-900 shadow-sm border border-hazmat-200' : 'text-steel-600 hover:text-steel-900'
                }`}
              >
                Ready for Pickup ({batchesReadyPickup.length})
              </button>
              <button
                onClick={() => setFilterTab('transit')}
                className={`px-3 py-1 rounded transition ${
                  filterTab === 'transit' ? 'bg-white text-steel-900 shadow-sm border border-hazmat-200' : 'text-steel-600 hover:text-steel-900'
                }`}
              >
                In Transit ({batchesInTransit.length})
              </button>
            </div>

            <button
              onClick={loadBatches}
              className="p-1.5 border border-hazmat-300 rounded hover:bg-white text-steel-600 transition"
              title="Refresh Batches"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Manifest Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-hazmat-50 text-steel-600 uppercase font-mono border-b border-hazmat-200">
              <tr>
                <th className="py-3 px-4">Batch Code</th>
                <th className="py-3 px-4">CPCB Category</th>
                <th className="py-3 px-4">Origin Facility</th>
                <th className="py-3 px-4">Destination CBWTF</th>
                <th className="py-3 px-4">Manifest Weight</th>
                <th className="py-3 px-4">Current Status</th>
                <th className="py-3 px-4 text-right">Handover Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hazmat-100">
              {transportBatches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-steel-400 font-mono">
                    No waste batches match the selected filter.
                  </td>
                </tr>
              ) : (
                transportBatches.map((batch) => {
                  const isReadyForPickup = batch.status === 'COLLECTED' || batch.status === 'GENERATED';
                  const isInTransit = batch.status === 'IN_TRANSIT';
                  const isReceived = batch.status === 'RECEIVED' || batch.status === 'TREATED' || batch.status === 'DISPOSED';

                  return (
                    <tr key={batch.id} className="hover:bg-hazmat-50/70 transition">
                      {/* Batch Code */}
                      <td className="py-3.5 px-4 font-mono font-bold text-steel-900">
                        {batch.batch_code}
                      </td>

                      {/* CPCB Category */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${getCategoryBadge(batch.cpcb_waste_category)}`}>
                          {batch.cpcb_waste_category}
                        </span>
                      </td>

                      {/* Origin Hospital */}
                      <td className="py-3.5 px-4 text-steel-700 font-medium">
                        <div>{batch.hospital?.name || 'AIIMS Central Hospital'}</div>
                        <div className="text-[10px] text-steel-400 font-mono">{batch.generating_department}</div>
                      </td>

                      {/* Destination CBWTF */}
                      <td className="py-3.5 px-4 text-steel-700">
                        {batch.assigned_cbwtf?.name || 'EcoSafe Waste Handlers CBWTF'}
                      </td>

                      {/* Weight */}
                      <td className="py-3.5 px-4 font-mono font-bold text-steel-800">
                        {batch.quantity_kg} kg
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${getStatusBadge(batch.status)}`}>
                          {batch.status}
                        </span>
                      </td>

                      {/* Handover Action */}
                      <td className="py-3.5 px-4 text-right">
                        {isReadyForPickup && (
                          <button
                            onClick={() => handleStartHandover(batch, 'TRANSPORT_PICKUP')}
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-hazmat-900 hover:bg-black text-white text-xs font-mono font-bold rounded shadow-sm transition"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>Verify Pickup</span>
                          </button>
                        )}

                        {isInTransit && (
                          <button
                            onClick={() => handleStartHandover(batch, 'TRANSPORT_DROPOFF')}
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-forest-700 hover:bg-forest-800 text-white text-xs font-mono font-bold rounded shadow-sm transition"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Verify Drop-off</span>
                          </button>
                        )}

                        {isReceived && (
                          <span className="inline-flex items-center text-xs font-mono text-forest-700 font-semibold space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-forest-600" />
                            <span>Delivered to CBWTF</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Handover Verification Modal Wizard */}
      {selectedBatchForHandover && (
        <HandoverVerificationModal
          batch={selectedBatchForHandover}
          stage={handoverStage}
          vehicle={vehicle}
          officer={{
            id: user?.id || 'user-tran-001',
            name: user?.name || 'Vikram Singh',
            role: user?.role || 'TRANSPORT_OFFICER'
          }}
          onClose={() => setSelectedBatchForHandover(null)}
          onSuccess={handleHandoverSuccess}
        />
      )}
    </div>
  );
}
