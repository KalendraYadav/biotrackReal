import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import LiveTransitMap from '../../components/transport/LiveTransitMap';
import HandoverVerificationModal from '../../components/transport/HandoverVerificationModal';
import { 
  Truck, 
  MapPin, 
  Navigation, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Package, 
  QrCode, 
  RefreshCw, 
  Clock, 
  Building2, 
  Scale, 
  Phone,
  Search
} from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import StatusPill, { CategoryBadge } from '../../components/ui/StatusPill';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';

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

  // Open Handover Modal for Pickup or Drop-off
  const handleStartHandover = (batch, stage) => {
    setSelectedBatchForHandover(batch);
    setHandoverStage(stage);
  };

  const handleHandoverSuccess = () => {
    loadBatches();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <PageHeader
        title="Transit Fleet Telemetry & Geofence Enforcement"
        description={`Authorized carrier: ${user?.facility_name || 'EcoSafe Waste Handlers'} • Operator: ${user?.name || 'Vikram Singh'}`}
        icon={Truck}
        badge={
          <Badge variant={deviationState.isDeviated ? 'danger' : 'success'} dot>
            {deviationState.isDeviated ? 'Deviation alert' : 'Corridor compliant'}
          </Badge>
        }
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={loadBatches}
            loading={loadingBatches}
            icon={RefreshCw}
            aria-label="Refresh transit fleet data"
          >
            Refresh
          </Button>
        }
      />

      {/* Route Deviation Alert Banner - Positioned cleanly beneath PageHeader */}
      {deviationState.isDeviated && (
        <div 
          role="alert" 
          aria-live="assertive"
          className="rounded-xl p-4 bg-red-50/90 border border-red-200 flex flex-wrap items-center justify-between gap-3 text-red-950 shadow-2xs animate-fade-in"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-red-100 text-red-700 shrink-0">
              <AlertTriangle className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-red-900">Geofence route deviation detected</h4>
              <p className="text-xs text-red-700/90 mt-0.5">
                Vehicle <span className="font-mono font-bold text-red-950">{vehicle.plate_no}</span> is{' '}
                <span className="font-mono font-bold underline tabular-nums">{deviationState.distanceKm} km outside</span> approved safe green corridor. Real-time telemetry flagged and logged in CPCB Risk Engine.
              </p>
            </div>
          </div>
          <Badge variant="danger" size="sm">
            CPCB Rule 12 Breach Flag
          </Badge>
        </div>
      )}

      {/* Metrics Row (4 Cards) - Responsive 2x2 grid on mobile, 4-col on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Active Fleet Vehicle */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Fleet Vehicle</span>
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
              <Truck className="w-3.5 h-3.5" aria-hidden="true" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono tracking-tight">{vehicle.plate_no}</div>
            <div className="text-[11px] text-slate-500 mt-0.5 truncate">
              Driver: <span className="font-medium text-slate-700">{vehicle.driver_name || user?.name || 'Vikram Singh'}</span>
            </div>
            <div className="text-[11px] text-emerald-700 mt-1 font-mono flex items-center gap-1 font-medium">
              <Phone className="w-3 h-3 text-emerald-600 shrink-0" aria-hidden="true" />
              <span>{vehicle.driver_phone || user?.phone_number || '+91 98111 22334'}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Geofence Corridor Status */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Corridor Boundary</span>
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
              <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
            </div>
          </div>
          <div className="my-2">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${deviationState.isDeviated ? 'bg-red-500' : 'bg-emerald-500'}`} />
              <div className={`text-base sm:text-lg font-mono font-bold ${deviationState.isDeviated ? 'text-red-700' : 'text-emerald-700'}`}>
                {deviationState.isDeviated ? 'Deviation Alert' : 'Secure (±2.0 km)'}
              </div>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {deviationState.isDeviated 
                ? `+${deviationState.distanceKm} km off corridor` 
                : 'AIIMS → EcoSafe corridor'}
            </div>
          </div>
        </div>

        {/* Card 3: Active Cargo on Board */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Cargo In Transit</span>
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
              <Package className="w-3.5 h-3.5" aria-hidden="true" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 tabular-nums">
              {batchesInTransit.length} <span className="text-xs font-normal text-slate-500 font-sans">batches</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
              <span className="font-semibold text-slate-900">{totalCargoKg.toFixed(1)} kg</span> sealed cargo
            </div>
          </div>
        </div>

        {/* Card 4: Pickups Awaiting Collection */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Assigned Pickups</span>
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
              <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 tabular-nums">
              {batchesReadyPickup.length} <span className="text-xs font-normal text-slate-500 font-sans">at dock</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Hospital bay staging
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: LIVE TRANSIT MAP VIEW (Leaflet / OpenStreetMap Preserved) */}
      <div className="space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 px-1">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Live Vehicle Transit & Geofenced Corridor</h2>
            <p className="text-xs text-slate-500">
              OpenStreetMap telemetry tracking with CPCB approved safe corridor boundary overlay.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
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
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-3">
          <div>
            <CardTitle className="text-sm">Assigned pickups & transit manifest</CardTitle>
            <CardDescription className="text-xs">
              Select any batch to initiate the 5-step QR, PIN, camera, and geolocation custody verification.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Buttons */}
            <div className="inline-flex rounded-lg border border-border p-0.5 bg-surface-alt" role="group" aria-label="Filter batches">
              <button
                type="button"
                onClick={() => setFilterTab('all')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  filterTab === 'all'
                    ? 'bg-surface text-text shadow-xs border border-border'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                All ({allBatches.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('pickup')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  filterTab === 'pickup'
                    ? 'bg-surface text-text shadow-xs border border-border'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                Ready for pickup ({batchesReadyPickup.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('transit')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  filterTab === 'transit'
                    ? 'bg-surface text-text shadow-xs border border-border'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                In transit ({batchesInTransit.length})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-text-muted" aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search batch or facility..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-md border border-border bg-surface text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-ring w-44 sm:w-56"
                aria-label="Search batch code or facility"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-alt text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                  <th scope="col" className="py-3 px-4 whitespace-nowrap">Batch code</th>
                  <th scope="col" className="py-3 px-4 whitespace-nowrap">CPCB category</th>
                  <th scope="col" className="py-3 px-4 whitespace-nowrap">Origin facility</th>
                  <th scope="col" className="py-3 px-4 whitespace-nowrap">Destination CBWTF</th>
                  <th scope="col" className="py-3 px-4 whitespace-nowrap">Manifest weight</th>
                  <th scope="col" className="py-3 px-4 whitespace-nowrap">Current status</th>
                  <th scope="col" className="py-3 px-4 text-right whitespace-nowrap">Handover action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transportBatches.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8">
                      <EmptyState
                        title="No waste batches found"
                        description="No waste batches match the selected filter or search term."
                      />
                    </td>
                  </tr>
                ) : (
                  transportBatches.map((batch) => {
                    const isReadyForPickup = batch.status === 'COLLECTED' || batch.status === 'GENERATED';
                    const isInTransit = batch.status === 'IN_TRANSIT';
                    const isReceived = batch.status === 'RECEIVED' || batch.status === 'TREATED' || batch.status === 'DISPOSED';

                    return (
                      <tr key={batch.id} className="hover:bg-surface-alt/70 transition-colors">
                        {/* Batch Code */}
                        <td className="py-3 px-4 font-mono font-bold text-text whitespace-nowrap">
                          {batch.batch_code}
                        </td>

                        {/* CPCB Category */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <CategoryBadge category={batch.cpcb_waste_category} />
                        </td>

                        {/* Origin Hospital */}
                        <td className="py-3 px-4 text-text whitespace-nowrap">
                          <div className="font-medium">{batch.hospital?.name || 'AIIMS Central Hospital'}</div>
                          <div className="text-[10px] text-text-muted">{batch.generating_department}</div>
                        </td>

                        {/* Destination CBWTF */}
                        <td className="py-3 px-4 text-text-muted whitespace-nowrap">
                          {batch.assigned_cbwtf?.name || 'EcoSafe Waste Handlers CBWTF'}
                        </td>

                        {/* Weight */}
                        <td className="py-3 px-4 font-semibold text-text tabular-nums whitespace-nowrap">
                          {batch.quantity_kg} kg
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <StatusPill status={batch.status} />
                        </td>

                        {/* Handover Action */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {isReadyForPickup && (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleStartHandover(batch, 'TRANSPORT_PICKUP')}
                                icon={QrCode}
                              >
                                Verify pickup
                              </Button>
                            )}

                            {isInTransit && (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleStartHandover(batch, 'TRANSPORT_DROPOFF')}
                                icon={CheckCircle2}
                              >
                                Verify drop-off
                              </Button>
                            )}

                            {isReceived && (
                              <span className="inline-flex items-center text-xs text-success font-medium gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                                <span>Delivered</span>
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Handover Verification Modal Wizard (Fully Preserved) */}
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
