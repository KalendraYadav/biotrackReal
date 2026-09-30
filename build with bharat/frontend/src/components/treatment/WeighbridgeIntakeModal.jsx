import React, { useState, useEffect } from 'react';
import { 
  X, 
  Scale, 
  QrCode, 
  Camera, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  Building2, 
  FileText,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export default function WeighbridgeIntakeModal({
  batch,
  cbwtf = { id: 'fac-cbwtf-001', name: 'EcoSafe Waste Handlers (CBWTF Central)' },
  user,
  onClose,
  onSuccess
}) {
  const [receivedWeight, setReceivedWeight] = useState(batch?.quantity_kg || 15.0);
  const [scalePhoto, setScalePhoto] = useState(null);
  const [notes, setNotes] = useState(`Weighbridge gross intake verified at ${cbwtf.name} gate. Visual inspection passed.`);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const genWeight = batch?.quantity_kg || 0;
  const recWeight = parseFloat(receivedWeight) || 0;
  const diffKg = Math.round((recWeight - genWeight) * 100) / 100;
  const absDiff = Math.abs(diffKg);
  const diffPercent = genWeight > 0 ? Math.round((absDiff / genWeight) * 1000) / 10 : 0;

  // Determine CPCB compliance tolerance
  let toleranceCategory = 'NORMAL';
  if (diffPercent > 5.0) {
    toleranceCategory = 'CRITICAL';
  } else if (diffPercent > 2.0) {
    toleranceCategory = 'MODERATE';
  }

  // Simulated Scale Camera Snapshot
  const handleGenerateScalePhoto = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 500;
    canvas.height = 340;
    const ctx = canvas.getContext('2d');

    // Industrial digital scale display background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 500, 340);

    // Scale display frame
    ctx.fillStyle = '#022c22';
    ctx.fillRect(40, 40, 420, 160);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.strokeRect(40, 40, 420, 160);

    // Digital LED Weight readout
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 54px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${recWeight.toFixed(2)} kg`, 430, 135);

    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('WEIGHBRIDGE SCALE #04 &bull; CALIBRATED', 50, 70);

    // Footer Watermark
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 260, 500, 80);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px monospace';
    ctx.fillText(`CBWTF GATE INTAKE | BATCH: ${batch?.batch_code}`, 20, 285);
    ctx.fillText(`OPERATOR: ${user?.name || 'Treatment Operator'} | ${new Date().toLocaleString()}`, 20, 305);
    ctx.fillText(`VARIANCE: ${diffKg >= 0 ? '+' : ''}${diffKg} kg (${diffPercent}%)`, 20, 325);

    setScalePhoto(canvas.toDataURL('image/jpeg', 0.85));
  };

  const handleSubmitIntake = async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = {
        stage: 'TRANSPORT_DROPOFF',
        quantity_at_stage_kg: recWeight,
        verified_by_scan: true,
        photo_url: scalePhoto || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=500&auto=format&fit=crop&q=60',
        latitude: cbwtf.lat || 28.5355,
        longitude: cbwtf.lng || 77.2731,
        geofence_valid: true,
        timestamp: new Date().toISOString(),
        notes: `${notes} [Weighbridge: ${recWeight}kg vs Gen: ${genWeight}kg | Diff: ${diffPercent}%]`,
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
        throw new Error(data.message || data.error || 'Failed to record weighbridge check-in.');
      }

      if (onSuccess) {
        onSuccess(data);
      }
      onClose();
    } catch (err) {
      console.error('Weighbridge intake error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-steel-950/70 backdrop-blur-sm animate-fade-in font-sans">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="weighbridge-modal-title"
        className="bg-white w-full max-w-xl rounded-lg shadow-modal border border-hazmat-300 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-steel-900 text-cream-50 flex items-center justify-between border-b border-steel-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-hazmat-500/20 text-hazmat-400 rounded border border-hazmat-500/30">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 id="weighbridge-modal-title" className="font-serif font-bold text-base text-cream-50">Weighbridge Intake &amp; Reconciliation</h3>
              <p className="text-xs font-mono text-steel-400">
                Batch: <span className="font-bold text-hazmat-400">{batch?.batch_code}</span> &bull; Facility: {cbwtf.name}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-steel-400 hover:text-white rounded transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-biohazard-50 border border-biohazard-300 rounded text-xs text-biohazard-900 flex items-center space-x-2 font-mono">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Batch Summary Box */}
          <div className="bg-hazmat-50/70 border border-hazmat-200 rounded p-4 grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-steel-500 font-mono uppercase text-[10px]">Origin Hospital:</span>
              <p className="font-bold text-steel-900">{batch?.hospital?.name || 'AIIMS Central Hospital'}</p>
            </div>
            <div>
              <span className="text-steel-500 font-mono uppercase text-[10px]">CPCB Category:</span>
              <p className="font-bold text-steel-900">{batch?.cpcb_waste_category} ({batch?.cpcb_waste_type})</p>
            </div>
            <div>
              <span className="text-steel-500 font-mono uppercase text-[10px]">Manifest Gen Weight:</span>
              <p className="font-mono font-bold text-steel-900 text-sm">{genWeight} kg</p>
            </div>
            <div>
              <span className="text-steel-500 font-mono uppercase text-[10px]">Treatment Facility:</span>
              <p className="font-semibold text-steel-800">{cbwtf.name}</p>
            </div>
          </div>

          {/* Quantity Reconciliation Panel */}
          <div className="border border-hazmat-300 rounded p-4 space-y-3 bg-white">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-bold text-steel-800 uppercase">
                Weighbridge Scale Reading (Net Received kg)
              </label>
              <span className="text-[11px] font-mono text-steel-500">Tare auto-deducted</span>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="number"
                step="0.1"
                min="0"
                value={receivedWeight}
                onChange={(e) => setReceivedWeight(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-hazmat-300 rounded text-lg font-mono font-bold text-steel-900 focus:outline-none focus:ring-2 focus:ring-hazmat-500"
              />
              <span className="text-sm font-mono font-bold text-steel-500">kg</span>
            </div>

            {/* Live Discrepancy Indicator */}
            <div className={`p-3 rounded text-xs flex items-start space-x-2.5 transition-all font-mono ${
              toleranceCategory === 'NORMAL' 
                ? 'bg-forest-50 border border-forest-300 text-forest-950' 
                : toleranceCategory === 'MODERATE' 
                  ? 'bg-amber-50 border border-amber-300 text-amber-950' 
                  : 'bg-biohazard-50 border border-biohazard-300 text-biohazard-950 animate-pulse'
            }`}>
              {toleranceCategory === 'NORMAL' ? (
                <CheckCircle2 className="w-4 h-4 text-forest-700 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                  toleranceCategory === 'CRITICAL' ? 'text-biohazard-700' : 'text-amber-700'
                }`} />
              )}
              <div>
                <div className="font-bold flex items-center space-x-2">
                  <span>
                    Variance: {diffKg >= 0 ? '+' : ''}{diffKg} kg ({diffPercent}%)
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    toleranceCategory === 'NORMAL' 
                      ? 'bg-forest-200 text-forest-900' 
                      : toleranceCategory === 'MODERATE' 
                        ? 'bg-amber-200 text-amber-900' 
                        : 'bg-biohazard-200 text-biohazard-950'
                  }`}>
                    {toleranceCategory === 'NORMAL' && 'Normal CPCB Tolerance (≤2%)'}
                    {toleranceCategory === 'MODERATE' && 'Moderate Variance (2-5%)'}
                    {toleranceCategory === 'CRITICAL' && 'CRITICAL MISMATCH (>5%)'}
                  </span>
                </div>
                <p className="text-[11px] mt-0.5 font-sans opacity-90">
                  {toleranceCategory === 'NORMAL' && 'Cargo weight matches generation manifest within normal calibration variance.'}
                  {toleranceCategory === 'MODERATE' && 'Minor variance detected. Meets legal tolerance limit for municipal transit.'}
                  {toleranceCategory === 'CRITICAL' && 'CPCB Rule 12 Warning: Discrepancy > 5% will trigger an automated AI Risk Engine case upon commit.'}
                </p>
              </div>
            </div>
          </div>

          {/* Scale Photo Evidence */}
          <div>
            <label className="block text-xs font-mono font-bold text-steel-700 mb-1.5 uppercase">
              Weighbridge Scale Photo Evidence
            </label>
            {scalePhoto ? (
              <div className="relative rounded overflow-hidden border border-hazmat-300">
                <img src={scalePhoto} alt="Scale Snapshot" className="w-full h-36 object-cover" />
                <button
                  type="button"
                  onClick={() => setScalePhoto(null)}
                  className="absolute top-2 right-2 bg-steel-900/90 text-cream-50 font-mono text-[10px] px-2 py-1 rounded hover:bg-steel-950"
                >
                  Retake Photo
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGenerateScalePhoto}
                className="w-full py-3 px-4 border border-dashed border-hazmat-300 rounded bg-hazmat-50 hover:bg-hazmat-100 text-xs text-steel-700 font-mono font-bold flex items-center justify-center space-x-2 transition"
              >
                <Camera className="w-4 h-4 text-hazmat-800" />
                <span>Snap Weighbridge Scale Photo</span>
              </button>
            )}
          </div>

          {/* Custody Notes */}
          <div>
            <label className="block text-xs font-mono font-bold text-steel-700 mb-1 uppercase">
              Intake Inspection Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
            onClick={handleSubmitIntake}
            disabled={loading}
            className="px-5 py-2 bg-hazmat-900 hover:bg-black disabled:opacity-50 text-white text-xs font-bold rounded shadow-sm flex items-center space-x-2 transition"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Recording Intake...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm Intake &amp; Mark Received</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

