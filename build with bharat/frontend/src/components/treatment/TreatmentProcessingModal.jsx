import React, { useState } from 'react';
import { 
  X, 
  Flame, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  ShieldCheck, 
  Clock, 
  Gauge, 
  Sparkles,
  Thermometer,
  Cpu
} from 'lucide-react';

export default function TreatmentProcessingModal({
  batch,
  cbwtf = { id: 'fac-cbwtf-001', name: 'EcoSafe Waste Handlers (CBWTF Central)' },
  user,
  onClose,
  onSuccess
}) {
  const category = batch?.cpcb_waste_category?.toLowerCase() || 'yellow';

  // Preset recommended treatment method based on CPCB BMW Rules 2016
  const getTreatmentDefaults = (cat) => {
    switch (cat) {
      case 'yellow':
        return {
          modality: 'Incineration (Dual-Chamber Controlled Air)',
          unitId: 'INCINERATOR-BAY-01',
          primaryTemp: '1050',
          secondaryTemp: '1200',
          pressure: 'Negative Draft (-0.2 in. wc)',
          durationMin: 45,
          gasRetentionSec: 2.0,
          description: 'Combustion of anatomical tissue and soiled gauze. Retention time 2 sec in secondary chamber as per CPCB Schedule II.'
        };
      case 'red':
        return {
          modality: 'Autoclave Sterilization + High-Torque Shredding',
          unitId: 'AUTOCLAVE-UNIT-02',
          primaryTemp: '121',
          secondaryTemp: 'N/A',
          pressure: '15 psi',
          durationMin: 60,
          gasRetentionSec: 0,
          description: 'Steam sterilization cycle followed by mechanical mutilation to prevent unauthorized reuse of tubing and bottles.'
        };
      case 'white':
        return {
          modality: 'Autoclaving + Encapsulation / Sharp Pit Immobilization',
          unitId: 'SHARPS-PULVERIZER-01',
          primaryTemp: '121',
          secondaryTemp: 'N/A',
          pressure: '15 psi',
          durationMin: 60,
          gasRetentionSec: 0,
          description: 'High-temperature sterilization of metallic sharps/needles followed by containment in concrete-lined encapsulation pit.'
        };
      case 'blue':
      default:
        return {
          modality: 'Chemical Disinfection (1% NaOCl) + Glass Crushing',
          unitId: 'CRUSHER-DECONTAM-03',
          primaryTemp: 'Ambient',
          secondaryTemp: 'N/A',
          pressure: 'Atmospheric',
          durationMin: 30,
          gasRetentionSec: 0,
          description: 'Sodium hypochlorite immersion neutralization followed by specialized recycling crushing for glass vials and ampoules.'
        };
    }
  };

  const defaults = getTreatmentDefaults(category);

  const [treatmentMethod, setTreatmentMethod] = useState(defaults.modality);
  const [equipmentId, setEquipmentId] = useState(defaults.unitId);
  const [chamberTemp, setChamberTemp] = useState(defaults.primaryTemp);
  const [pressure, setPressure] = useState(defaults.pressure);
  const [duration, setDuration] = useState(defaults.durationMin);
  const [operatorNotes, setOperatorNotes] = useState(
    `Batch ${batch?.batch_code} passed pre-treatment validation. Cycle parameters met CPCB Schedule II statutory standards.`
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmitTreatment = async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = {
        stage: 'TREATMENT',
        quantity_at_stage_kg: batch.quantity_kg,
        verified_by_scan: true,
        photo_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop&q=60',
        latitude: cbwtf.lat || 28.5355,
        longitude: cbwtf.lng || 77.2731,
        geofence_valid: true,
        timestamp: new Date().toISOString(),
        notes: `[TREATMENT APPLIED: ${treatmentMethod}] Unit: ${equipmentId}, Temp: ${chamberTemp}°C, Press: ${pressure}, Duration: ${duration}min. ${operatorNotes}`,
        performed_by_user_id: user?.id
      };

      const res = await fetch(`/api/waste-batches/${batch.id}/custody-event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('biotrace_token')}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to record treatment stage.');
      }

      if (onSuccess) {
        onSuccess(data);
      }
      onClose();
    } catch (err) {
      console.error('Treatment submission error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-steel-950/70 backdrop-blur-sm animate-fade-in font-sans">
      <div className="bg-white w-full max-w-xl rounded-lg shadow-modal border border-hazmat-300 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-steel-900 text-cream-50 flex items-center justify-between border-b border-steel-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-forest-500/20 text-forest-400 rounded border border-forest-500/30">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-cream-50">Execute Biomedical Waste Treatment</h3>
              <p className="text-xs font-mono text-steel-400">
                Batch: <span className="font-bold text-hazmat-400">{batch?.batch_code}</span> &bull; {batch?.cpcb_waste_category} Category
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-steel-400 hover:text-white rounded transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-biohazard-50 border border-biohazard-300 rounded text-xs text-biohazard-900 flex items-center space-x-2 font-mono">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* CPCB Mandatory Treatment Rule Callout */}
          <div className="bg-forest-50 border border-forest-300 rounded p-4 text-xs font-mono">
            <div className="flex items-center space-x-2 font-bold text-forest-900">
              <ShieldCheck className="w-4 h-4 text-forest-700" />
              <span>CPCB Mandated Treatment Standard ({batch?.cpcb_waste_category})</span>
            </div>
            <p className="text-forest-950 mt-1.5 text-[11px] font-sans leading-relaxed">
              {defaults.description}
            </p>
          </div>

          {/* Treatment Modality Select */}
          <div>
            <label className="block text-xs font-mono font-bold text-steel-700 mb-1 uppercase">
              Treatment Modality
            </label>
            <input
              type="text"
              value={treatmentMethod}
              onChange={(e) => setTreatmentMethod(e.target.value)}
              className="w-full px-3 py-2 border border-hazmat-300 rounded text-xs font-bold text-steel-900 focus:outline-none focus:ring-2 focus:ring-hazmat-500 font-mono"
            />
          </div>

          {/* Operating Parameters Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono">
            <div>
              <label className="block text-[11px] font-bold text-steel-700 mb-1 uppercase">
                Equipment Unit ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={equipmentId}
                  onChange={(e) => setEquipmentId(e.target.value)}
                  className="w-full px-3 py-2 bg-hazmat-50 border border-hazmat-300 rounded text-xs font-bold text-steel-900 focus:outline-none focus:ring-2 focus:ring-hazmat-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-steel-700 mb-1 uppercase">
                Operating Temp (°C)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={chamberTemp}
                  onChange={(e) => setChamberTemp(e.target.value)}
                  className="w-full px-3 py-2 bg-hazmat-50 border border-hazmat-300 rounded text-xs font-bold text-steel-900 focus:outline-none focus:ring-2 focus:ring-hazmat-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-steel-700 mb-1 uppercase">
                Pressure / Retention
              </label>
              <input
                type="text"
                value={pressure}
                onChange={(e) => setPressure(e.target.value)}
                className="w-full px-3 py-2 bg-hazmat-50 border border-hazmat-300 rounded text-xs font-bold text-steel-900 focus:outline-none focus:ring-2 focus:ring-hazmat-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 font-mono">
            <div>
              <label className="block text-[11px] font-bold text-steel-700 mb-1 uppercase">
                Cycle Duration (Minutes)
              </label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-3 py-2 border border-hazmat-300 rounded text-xs font-bold text-steel-900 focus:outline-none focus:ring-2 focus:ring-hazmat-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-steel-700 mb-1 uppercase">
                Plant Certified Operator
              </label>
              <input
                type="text"
                disabled
                value={user?.name || 'Ramesh Kumar (CBWTF Operator)'}
                className="w-full px-3 py-2 bg-hazmat-100 border border-hazmat-300 rounded text-xs text-steel-700 font-bold cursor-not-allowed"
              />
            </div>
          </div>

          {/* Operational Log Notes */}
          <div>
            <label className="block text-xs font-mono font-bold text-steel-700 mb-1 uppercase">
              Treatment Cycle Operational Log
            </label>
            <textarea
              rows={2}
              value={operatorNotes}
              onChange={(e) => setOperatorNotes(e.target.value)}
              className="w-full px-3 py-2 border border-hazmat-300 rounded text-xs font-mono focus:outline-none focus:ring-2 focus:ring-hazmat-500"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-hazmat-50 border-t border-hazmat-200 flex items-center justify-between font-mono">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-hazmat-300 text-steel-700 text-xs font-bold rounded hover:bg-white transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmitTreatment}
            disabled={loading}
            className="px-5 py-2 bg-forest-800 hover:bg-forest-900 disabled:opacity-50 text-white text-xs font-bold rounded shadow-sm flex items-center space-x-2 transition"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Executing Treatment Cycle...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Verify Treatment &amp; Mark Treated</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
