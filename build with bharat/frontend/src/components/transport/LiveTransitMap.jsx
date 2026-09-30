import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Navigation, 
  AlertTriangle, 
  CheckCircle2, 
  Play, 
  RotateCcw, 
  Compass, 
  Radio, 
  ShieldAlert,
  Layers,
  Eye
} from 'lucide-react';

// Approved Route Waypoints (AIIMS Central Hospital to EcoSafe CBWTF Okhla)
const ROUTE_WAYPOINTS = [
  { lat: 28.5672, lng: 77.2100, label: 'AIIMS Central Hospital (Origin)' },
  { lat: 28.5650, lng: 77.2280, label: 'South Ext Ring Road' },
  { lat: 28.5580, lng: 77.2340, label: 'Moolchand Flyover' },
  { lat: 28.5520, lng: 77.2400, label: 'Lala Lajpat Rai Marg' },
  { lat: 28.5480, lng: 77.2510, label: 'Nehru Place Outer Ring' },
  { lat: 28.5410, lng: 77.2620, label: 'Modi Flour Mills Corridor' },
  { lat: 28.5355, lng: 77.2731, label: 'EcoSafe CBWTF Okhla (Destination)' }
];

// Approved Safe Green Corridor Boundary Polygon (~1.8 km buffer)
const CORRIDOR_POLYGON = [
  [28.5780, 77.1980],
  [28.5760, 77.2380],
  [28.5620, 77.2600],
  [28.5420, 77.2880],
  [28.5250, 77.2800],
  [28.5320, 77.2500],
  [28.5480, 77.2250],
  [28.5550, 77.1950]
];

// Off-corridor deviation point (e.g. unauthorized detour into Central/West Delhi)
const DEVIATION_POINT = {
  lat: 28.6520,
  lng: 77.1520,
  label: 'Unauthorized Industrial Zone (Off-Corridor)'
};

export default function LiveTransitMap({ 
  vehicleId = 'veh-001', 
  plateNo = 'DL-01-AB-4421',
  onDeviationChange,
  onTelemetryUpdate
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const vehicleMarkerRef = useRef(null);
  const breadcrumbLayerRef = useRef(null);
  const corridorLayerRef = useRef(null);

  const [currentPos, setCurrentPos] = useState({ lat: 28.5520, lng: 77.2400 });
  const [speedKmh, setSpeedKmh] = useState(38);
  const [isDeviated, setIsDeviated] = useState(false);
  const [deviationKm, setDeviationKm] = useState(0);
  const [simStep, setSimStep] = useState(3);
  const [isSimulating, setIsSimulating] = useState(false);
  const [breadcrumbTrail, setBreadcrumbTrail] = useState([]);
  const [statusMessage, setStatusMessage] = useState('Corridor compliant &bull; GPS lock active');

  // Helper: Haversine distance
  const getDistanceKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Check corridor validity
  const checkCorridor = (lat, lng) => {
    let minDistance = Infinity;
    for (let i = 0; i < ROUTE_WAYPOINTS.length - 1; i++) {
      const p1 = ROUTE_WAYPOINTS[i];
      const p2 = ROUTE_WAYPOINTS[i + 1];

      const dx = p2.lng - p1.lng;
      const dy = p2.lat - p1.lat;
      const l2 = dx * dx + dy * dy;
      let t = l2 === 0 ? 0 : ((lng - p1.lng) * dx + (lat - p1.lat) * dy) / l2;
      t = Math.max(0, Math.min(1, t));
      const projLat = p1.lat + t * dy;
      const projLng = p1.lng + t * dx;
      const dist = getDistanceKm(lat, lng, projLat, projLng);
      if (dist < minDistance) {
        minDistance = dist;
      }
    }
    const valid = minDistance <= 2.0;
    return { valid, distance: Math.round(minDistance * 100) / 100 };
  };

  // Custom Leaflet Icons using SVGs
  const createHospitalIcon = () => {
    return L.divIcon({
      className: 'custom-map-icon',
      html: `
        <div style="background-color: #1F5C3B; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #FFFFFF; box-shadow: 0 4px 10px rgba(0,0,0,0.25);">
          <span style="color: white; font-weight: bold; font-size: 16px;">H</span>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });
  };

  const createCbwtfIcon = () => {
    return L.divIcon({
      className: 'custom-map-icon',
      html: `
        <div style="background-color: #0D9488; width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; border: 2px solid #FFFFFF; box-shadow: 0 4px 10px rgba(0,0,0,0.25);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });
  };

  const createVehicleIcon = (deviated = false) => {
    const color = deviated ? '#EF4444' : '#F1602A';
    const pulseBg = deviated ? 'rgba(239, 68, 68, 0.4)' : 'rgba(241, 96, 42, 0.35)';
    return L.divIcon({
      className: 'custom-vehicle-icon',
      html: `
        <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 40px; height: 40px; border-radius: 50%; background-color: ${pulseBg}; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="background-color: ${color}; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2.5px solid #FFFFFF; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 10;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="1" y="3" width="15" height="13"></rect>
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
              <circle cx="5.5" cy="18.5" r="2.5"></circle>
              <circle cx="18.5" cy="18.5" r="2.5"></circle>
            </svg>
          </div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22]
    });
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [28.5520, 77.2400],
      zoom: 13,
      zoomControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // OpenStreetMap Standard Tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors | CPCB Geofence Network'
    }).addTo(map);

    // Safe Green Corridor Polygon
    const corridor = L.polygon(CORRIDOR_POLYGON, {
      color: '#10B981',
      weight: 2,
      dashArray: '5, 5',
      fillColor: '#10B981',
      fillOpacity: 0.14
    }).addTo(map);
    corridor.bindTooltip('Approved CPCB Green Transit Corridor', { sticky: true });
    corridorLayerRef.current = corridor;

    // Planned Route Polyline
    const routePoints = ROUTE_WAYPOINTS.map(w => [w.lat, w.lng]);
    L.polyline(routePoints, {
      color: '#1F5C3B',
      weight: 5,
      opacity: 0.85
    }).addTo(map);

    // Origin Marker (AIIMS)
    const hospMarker = L.marker([28.5672, 77.2100], { icon: createHospitalIcon() }).addTo(map);
    hospMarker.bindPopup(`
      <div style="font-family: inherit; font-size: 13px; line-height: 1.4;">
        <strong style="color: #1F5C3B;">AIIMS Central Hospital</strong><br/>
        <span style="color: #64748B;">BMW Generating Facility &bull; 500 Beds</span><br/>
        <span style="font-size: 11px; color: #94A3B8;">CPCB-HOSP-DL-2024-001</span>
      </div>
    `);

    // Destination Marker (EcoSafe CBWTF)
    const cbwtfMarker = L.marker([28.5355, 77.2731], { icon: createCbwtfIcon() }).addTo(map);
    cbwtfMarker.bindPopup(`
      <div style="font-family: inherit; font-size: 13px; line-height: 1.4;">
        <strong style="color: #0D9488;">EcoSafe Waste Handlers CBWTF</strong><br/>
        <span style="color: #64748B;">Central Treatment Plant &bull; Okhla Phase-III</span><br/>
        <span style="font-size: 11px; color: #94A3B8;">CPCB-CBWTF-DL-2023-011</span>
      </div>
    `);

    // Breadcrumb Layer group
    const breadcrumbGroup = L.layerGroup().addTo(map);
    breadcrumbLayerRef.current = breadcrumbGroup;

    // Live Vehicle Marker
    const vehicleMarker = L.marker([28.5520, 77.2400], {
      icon: createVehicleIcon(false),
      zIndexOffset: 1000
    }).addTo(map);

    vehicleMarker.bindPopup(`
      <div style="font-family: inherit; font-size: 13px;">
        <strong style="color: #F1602A;">Vehicle ${plateNo}</strong><br/>
        <span>Officer: Vikram Singh (DL)</span><br/>
        <span>Speed: 38 km/h &bull; Geofence: COMPLIANT</span>
      </div>
    `);
    vehicleMarkerRef.current = vehicleMarker;

    mapInstanceRef.current = map;

    // Initial GPS ping fetch from backend
    fetchVehicleLocation(vehicleId);

    // Invalidate size once rendered
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Fetch initial location from server
  const fetchVehicleLocation = async (id) => {
    try {
      const token = localStorage.getItem('biotrace_token');
      const res = await fetch(`/api/vehicles/${id}/location`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        if (data.current_location) {
          const lat = data.current_location.latitude;
          const lng = data.current_location.longitude;
          updatePositionOnMap(lat, lng, 38, false);
          if (Array.isArray(data.gps_trail)) {
            setBreadcrumbTrail(data.gps_trail);
            renderBreadcrumbs(data.gps_trail);
          }
        }
      }
    } catch (err) {
      console.warn('Could not fetch vehicle location:', err.message);
    }
  };

  // Render breadcrumbs on map
  const renderBreadcrumbs = (trail) => {
    if (!breadcrumbLayerRef.current) return;
    breadcrumbLayerRef.current.clearLayers();

    if (!trail || trail.length === 0) return;

    const latlngs = trail.map(t => [t.lat, t.lng]);
    L.polyline(latlngs, {
      color: '#F97316',
      weight: 3,
      dashArray: '6, 6',
      opacity: 0.7
    }).addTo(breadcrumbLayerRef.current);

    // Add tiny dot for each ping
    trail.forEach((pt) => {
      L.circleMarker([pt.lat, pt.lng], {
        radius: 3,
        color: '#EA580C',
        fillColor: '#FFFFFF',
        fillOpacity: 1,
        weight: 2
      }).addTo(breadcrumbLayerRef.current);
    });
  };

  // Core function to update position, marker icon, and trigger real-time telemetry ping
  const updatePositionOnMap = async (lat, lng, speed = 35, notifyServer = true) => {
    const geo = checkCorridor(lat, lng);
    const deviated = !geo.valid;

    setCurrentPos({ lat, lng });
    setSpeedKmh(speed);
    setIsDeviated(deviated);
    setDeviationKm(geo.distance);

    if (onDeviationChange) {
      onDeviationChange({
        isDeviated: deviated,
        distanceKm: geo.distance,
        lat,
        lng,
        plateNo
      });
    }

    // Update vehicle marker on Leaflet
    if (vehicleMarkerRef.current) {
      vehicleMarkerRef.current.setLatLng([lat, lng]);
      vehicleMarkerRef.current.setIcon(createVehicleIcon(deviated));
      vehicleMarkerRef.current.setPopupContent(`
        <div style="font-family: inherit; font-size: 13px; line-height: 1.4;">
          <strong style="color: ${deviated ? '#EF4444' : '#F1602A'};">
            ${deviated ? '⚠ ROUTE DEVIATION DETECTED' : 'Vehicle ' + plateNo}
          </strong><br/>
          <span>Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}</span><br/>
          <span>Speed: ${speed} km/h</span><br/>
          <strong style="color: ${deviated ? '#EF4444' : '#10B981'};">
            ${deviated ? `Outside Corridor: +${geo.distance} km` : 'CPCB Corridor Compliant'}
          </strong>
        </div>
      `);
    }

    // Update corridor polygon color on Leaflet
    if (corridorLayerRef.current) {
      corridorLayerRef.current.setStyle({
        color: deviated ? '#EF4444' : '#10B981',
        fillColor: deviated ? '#EF4444' : '#10B981',
        fillOpacity: deviated ? 0.22 : 0.14
      });
    }

    // Pan map to keep vehicle visible
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo([lat, lng], { animate: true, duration: 0.6 });
    }

    // Append to local breadcrumb trail
    const newPing = { lat, lng, speed_kmh: speed, timestamp: new Date().toISOString() };
    setBreadcrumbTrail(prev => {
      const updated = [...prev, newPing];
      renderBreadcrumbs(updated);
      return updated;
    });

    if (deviated) {
      setStatusMessage(`ALERT: Vehicle strayed ${geo.distance} km from approved corridor!`);
    } else {
      setStatusMessage(`In Transit &bull; ${speed} km/h &bull; Corridor Compliant`);
    }

    // Send Telemetry Ping to Backend Endpoint
    if (notifyServer) {
      try {
        const token = localStorage.getItem('biotrace_token');
        const res = await fetch(`/api/vehicles/${vehicleId}/ping`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            lat,
            lng,
            speed_kmh: speed
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (onTelemetryUpdate) onTelemetryUpdate(data);
        }
      } catch (err) {
        console.warn('Vehicle telemetry ping error:', err.message);
      }
    }
  };

  // Simulation: Move vehicle forward step-by-step
  const handleNextSimulationStep = () => {
    const nextStep = (simStep + 1) % ROUTE_WAYPOINTS.length;
    setSimStep(nextStep);
    const target = ROUTE_WAYPOINTS[nextStep];
    const speed = Math.floor(25 + Math.random() * 20);
    updatePositionOnMap(target.lat, target.lng, speed, true);
  };

  // Simulation: Trigger Off-Corridor Deviation
  const handleTriggerDeviation = () => {
    updatePositionOnMap(DEVIATION_POINT.lat, DEVIATION_POINT.lng, 44, true);
  };

  // Simulation: Reset back to AIIMS Origin
  const handleResetToOrigin = () => {
    setSimStep(0);
    const origin = ROUTE_WAYPOINTS[0];
    updatePositionOnMap(origin.lat, origin.lng, 0, true);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
      {/* Map Control Bar */}
      <div className="p-3.5 bg-slate-50/80 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg flex items-center justify-center border ${
            isDeviated 
              ? 'bg-red-50 border-red-200 text-red-700' 
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}>
            {isDeviated ? <ShieldAlert className="w-4 h-4" /> : <Navigation className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono font-bold text-slate-900 text-sm tracking-tight">{plateNo}</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold border uppercase tracking-wider ${
                isDeviated 
                  ? 'bg-red-100 text-red-800 border-red-300' 
                  : 'bg-emerald-100 text-emerald-800 border-emerald-300'
              }`}>
                {isDeviated ? 'ROUTE DEVIATION ALERT' : 'CORRIDOR SECURE'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">
              Lat: <span className="text-slate-700">{currentPos.lat.toFixed(4)}</span> &bull; Lng: <span className="text-slate-700">{currentPos.lng.toFixed(4)}</span> &bull; Speed: <span className="font-bold text-slate-900">{speedKmh} km/h</span>
            </p>
          </div>
        </div>

        {/* Live Simulation Buttons for Evaluator / Tester */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={handleNextSimulationStep}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            title="Move vehicle to next checkpoint along green corridor"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Drive Next Checkpoint</span>
          </button>

          <button
            onClick={handleTriggerDeviation}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-300/80 text-xs font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            title="Simulate vehicle straying outside safe corridor to test real-time risk alert"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
            <span>Simulate Deviation</span>
          </button>

          <button
            onClick={handleResetToOrigin}
            className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            title="Reset position to AIIMS Central Hospital dock"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset Origin</span>
          </button>
        </div>
      </div>

      {/* Real-time Alert Toast inside map box when deviated */}
      {isDeviated && (
        <div className="bg-red-600 text-white px-4 py-2 flex items-center justify-between text-xs font-mono font-medium">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-white shrink-0" />
            <span>
              GEOFENCE BREACH: Vehicle is {deviationKm} km outside approved CPCB Green Corridor. Telemetry logged as high risk.
            </span>
          </div>
          <button
            onClick={handleNextSimulationStep}
            className="px-2.5 py-1 bg-white text-red-700 rounded-md text-xs font-semibold hover:bg-red-50 transition-colors shadow-xs"
          >
            Return to Corridor
          </button>
        </div>
      )}

      {/* Leaflet Map Canvas */}
      <div 
        ref={mapContainerRef} 
        style={{ width: '100%', zIndex: 1 }}
        className="relative bg-slate-100 h-[320px] sm:h-[420px]"
      />

      {/* Map Footer Legend & Route Details */}
      <div className="p-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5 text-xs font-mono text-slate-600">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] sm:text-xs">
          <div className="flex items-center space-x-1.5">
            <div className="w-3 h-3 rounded-full bg-forest-700 border border-white shadow-sm shrink-0"></div>
            <span>AIIMS Hospital (Origin)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-3 h-3 rounded bg-steel-700 border border-white shadow-sm shrink-0"></div>
            <span>EcoSafe CBWTF (Destination)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-4 h-2 bg-forest-600 bg-opacity-30 border border-forest-600 border-dashed shrink-0"></div>
            <span>Corridor Geofence (&plusmn;2.0km)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-3 h-3 rounded-full bg-hazmat-600 border border-white shadow-sm shrink-0"></div>
            <span>Vehicle {plateNo}</span>
          </div>
        </div>
        <div className="flex items-center space-x-2 font-mono text-slate-500 text-[11px] sm:text-xs">
          <Radio className="w-3 h-3 text-emerald-600 animate-pulse shrink-0" />
          <span>Live Pings: {breadcrumbTrail.length} recorded</span>
        </div>
      </div>
    </div>
  );
}
