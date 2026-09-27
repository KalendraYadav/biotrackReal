import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Building2, Navigation, Layers, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function NationalFacilitiesMap({
  facilities = [],
  vehicles = [],
  onSelectFacility,
  selectedFacilityId
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  // Create Hospital Marker Icon
  const createHospitalIcon = (isSelected = false) => {
    return L.divIcon({
      className: 'custom-hosp-pin',
      html: `
        <div style="
          background-color: ${isSelected ? '#e05315' : '#14462a'};
          width: 34px; height: 34px; border-radius: 4px;
          display: flex; align-items: center; justify-content: center;
          border: 2px solid #FFFFFF; box-shadow: 0 2px 6px rgba(0,0,0,0.4);
          transform: ${isSelected ? 'scale(1.2)' : 'scale(1)'};
          transition: transform 0.2s;
        ">
          <span style="color: white; font-weight: 900; font-size: 14px; font-family: monospace;">H</span>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });
  };

  // Create CBWTF Marker Icon
  const createCbwtfIcon = (isSelected = false) => {
    return L.divIcon({
      className: 'custom-cbwtf-pin',
      html: `
        <div style="
          background-color: ${isSelected ? '#e05315' : '#1e293b'};
          width: 34px; height: 34px; border-radius: 4px;
          display: flex; align-items: center; justify-content: center;
          border: 2px solid #FFFFFF; box-shadow: 0 2px 6px rgba(0,0,0,0.4);
          transform: ${isSelected ? 'scale(1.2)' : 'scale(1)'};
          transition: transform 0.2s;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"></path>
          </svg>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });
  };

  // Create Vehicle Marker Icon
  const createVehicleIcon = () => {
    return L.divIcon({
      className: 'custom-fleet-pin',
      html: `
        <div style="
          background-color: #c2410c;
          width: 28px; height: 28px; border-radius: 4px;
          display: flex; align-items: center; justify-content: center;
          border: 2px solid #FFFFFF; box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        ">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="1" y="3" width="15" height="13"></rect>
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
            <circle cx="5.5" cy="18.5" r="2.5"></circle>
            <circle cx="18.5" cy="18.5" r="2.5"></circle>
          </svg>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [21.5, 78.9], // Center of India
      zoom: 5,
      zoomControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap &bull; CPCB National Environmental Audit'
    }).addTo(map);

    mapInstanceRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers on Facilities / Vehicles change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear previous markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    // Add Facility Markers
    facilities.forEach(fac => {
      if (!fac.lat || !fac.lng) return;
      const isHosp = fac.type === 'HOSPITAL';
      const isSelected = fac.id === selectedFacilityId;
      const icon = isHosp ? createHospitalIcon(isSelected) : createCbwtfIcon(isSelected);

      const marker = L.marker([fac.lat, fac.lng], { icon }).addTo(map);

      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; line-height: 1.4; color: #0f172a;">
          <strong style="color: ${isHosp ? '#14462a' : '#1e293b'}; font-size: 13px;">${fac.name}</strong><br/>
          <span style="font-family: monospace; font-weight: 600;">${fac.city} &bull; ${fac.type}</span><br/>
          ${fac.bed_count ? `<span style="color: #475569;">Bed Capacity: ${fac.bed_count} beds</span><br/>` : ''}
          <span style="font-size: 11px; font-family: monospace; color: #64748b;">${fac.cpcb_registration_no}</span>
        </div>
      `);

      marker.on('click', () => {
        if (onSelectFacility) onSelectFacility(fac);
      });

      markersRef.current.push(marker);
    });

    // Add Vehicle Markers
    vehicles.forEach(veh => {
      const lat = veh.current_lat;
      const lng = veh.current_lng;
      if (!lat || !lng) return;

      const driverName = veh.transport_officer?.name || 'Assigned Driver';
      const driverPhone = veh.driver_phone || veh.phone_number || veh.transport_officer?.phone_number || '+91 98111 22334';

      const marker = L.marker([lat, lng], { icon: createVehicleIcon() }).addTo(map);
      marker.bindPopup(`
        <div style="font-family: monospace; font-size: 12px; line-height: 1.5; color: #0f172a; min-width: 170px;">
          <strong style="color: #c2410c; font-size: 13px;">Carrier ${veh.plate_no}</strong><br/>
          <span>Driver: <strong>${driverName}</strong></span><br/>
          <span style="color: #15803d; font-weight: bold;">Tel: ${driverPhone}</span><br/>
          <span style="color: #64748b; font-size: 11px;">GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}</span>
        </div>
      `);
      markersRef.current.push(marker);
    });
  }, [facilities, vehicles, selectedFacilityId]);

  // Regional Zoom Buttons
  const zoomToRegion = (lat, lng, zoom = 11) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], zoom, { animate: true });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-hazmat-300 overflow-hidden font-sans">
      {/* Map Filter Controls Bar */}
      <div className="p-3 bg-hazmat-100 border-b border-hazmat-300 flex flex-wrap items-center justify-between gap-2 font-mono">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-steel-800 uppercase">Region Filter:</span>
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => zoomToRegion(21.5, 78.9, 5)}
              className="px-2.5 py-1 bg-white hover:bg-hazmat-50 border border-hazmat-300 rounded text-xs font-bold text-steel-800 transition"
            >
              All India
            </button>
            <button
              onClick={() => zoomToRegion(28.5672, 77.2100, 11)}
              className="px-2.5 py-1 bg-white hover:bg-hazmat-50 border border-hazmat-300 rounded text-xs font-bold text-steel-800 transition"
            >
              Delhi NCR
            </button>
            <button
              onClick={() => zoomToRegion(19.0760, 72.8777, 11)}
              className="px-2.5 py-1 bg-white hover:bg-hazmat-50 border border-hazmat-300 rounded text-xs font-bold text-steel-800 transition"
            >
              Mumbai
            </button>
            <button
              onClick={() => zoomToRegion(12.9716, 77.5946, 11)}
              className="px-2.5 py-1 bg-white hover:bg-hazmat-50 border border-hazmat-300 rounded text-xs font-bold text-steel-800 transition"
            >
              Bengaluru
            </button>
            <button
              onClick={() => zoomToRegion(13.0827, 80.2707, 11)}
              className="px-2.5 py-1 bg-white hover:bg-hazmat-50 border border-hazmat-300 rounded text-xs font-bold text-steel-800 transition"
            >
              Chennai
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs font-mono text-steel-700">
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-[#14462a]" />
            <span className="font-semibold">Hospitals ({facilities.filter(f => f.type === 'HOSPITAL').length})</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-steel-800" />
            <span className="font-semibold">CBWTFs ({facilities.filter(f => f.type === 'CBWTF').length})</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-hazmat-600" />
            <span className="font-semibold">Carriers ({vehicles.length})</span>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div 
        ref={mapContainerRef} 
        style={{ height: '400px', width: '100%', zIndex: 1 }} 
        className="relative bg-hazmat-100"
      />
    </div>
  );
}
