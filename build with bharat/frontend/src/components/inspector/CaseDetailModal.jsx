import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldAlert, 
  Scale, 
  Camera, 
  Clock, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Send, 
  Shield, 
  Check, 
  Loader2, 
  User, 
  Building2, 
  MapPin,
  Calendar,
  Layers
} from 'lucide-react';

export default function CaseDetailModal({
  riskCase,
  user,
  onClose,
  onActionComplete
}) {
  const [loadingAction, setLoadingAction] = useState(false);
  const [actionNotes, setActionNotes] = useState('');
  const [selectedActionType, setSelectedActionType] = useState('INVESTIGATE');
  const [actionSuccess, setActionSuccess] = useState(null);
  const [error, setError] = useState(null);

  const batch = riskCase?.batch || {};
  const isResolved = riskCase?.status === 'RESOLVED';
  const isUnderInvestigation = riskCase?.status === 'UNDER_INVESTIGATION';

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Sample photo evidence items if custody events don't have images
  const sampleEvidence = [
    {
      title: 'Hospital Dock Scale Tagging',
      stage: 'GENERATION',
      url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=500&auto=format&fit=crop&q=60',
      timestamp: '2026-09-02 08:30:00',
      gps: '28.5672, 77.2100',
      valid: true
    },
    {
      title: 'Weighbridge Intake Gross Scale',
      stage: 'TRANSPORT_DROPOFF',
      url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop&q=60',
      timestamp: '2026-09-02 11:45:00',
      gps: '28.5355, 77.2731',
      valid: false
    }
  ];

  const handleApplyAction = async (action) => {
    setLoadingAction(true);
    setError(null);

    try {
      const res = await fetch(`/api/risk-cases/${riskCase.id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('biotrace_token')}`
        },
        body: JSON.stringify({
          action,
          notes: actionNotes || `Inspector ${user?.name || 'Amit Deshmukh'} executed action '${action}'.`,
          inspector_id: user?.id || 'user-insp-001'
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to apply inspector action.');
      }

      setActionSuccess(`Case successfully updated with action: ${action}`);
      if (onActionComplete) {
        onActionComplete(data);
      }
    } catch (err) {
      console.error('Inspector action failed:', err);
      setError(err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-steel-950/80 backdrop-blur-sm animate-fade-in font-sans">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="case-dossier-title"
        className="bg-white w-full max-w-3xl rounded-lg shadow-modal border-2 border-steel-800 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-steel-950 text-cream-50 border-b border-steel-800 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0 pr-2">
            <div className="p-1.5 sm:p-2 bg-biohazard-950 border border-biohazard-600/50 text-biohazard-400 rounded shrink-0">
              <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h3 id="case-dossier-title" className="font-serif font-bold text-sm sm:text-base text-cream-100 tracking-wide truncate">
                  Audit Dossier: {riskCase?.case_code}
                </h3>
                <span className={`px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-mono font-bold tracking-tight shrink-0 ${
                  riskCase?.risk_score >= 80 
                    ? 'bg-biohazard-700 text-white border border-biohazard-600' 
                    : 'bg-hazmat-500 text-steel-950 border border-hazmat-600'
                }`}>
                  Risk: {riskCase?.risk_score}/100
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-cream-300/80 font-mono mt-0.5 truncate">
                Linked Batch: <span className="text-hazmat-300 font-bold">{batch?.batch_code || riskCase?.batch_id}</span> &bull; Status: {riskCase?.status}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 text-cream-300 hover:text-white rounded hover:bg-steel-800 transition shrink-0"
            aria-label="Close dossier"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 bg-cream-50/40">
          {error && (
            <div className="p-3 bg-biohazard-50 border border-biohazard-300 rounded text-xs text-biohazard-900 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-biohazard-600" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {actionSuccess && (
            <div className="p-3 bg-forest-50 border border-forest-300 rounded text-xs text-forest-900 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-forest-700 flex-shrink-0" />
              <span className="font-medium">{actionSuccess}</span>
            </div>
          )}

          {/* Section 1: AI Risk Triggers List */}
          <div className="bg-biohazard-50/80 border border-biohazard-300 rounded-md p-4 space-y-2">
            <div className="flex items-center space-x-2 text-xs font-serif font-bold text-biohazard-950 tracking-wide">
              <AlertTriangle className="w-4 h-4 text-biohazard-700" />
              <span>STATUTORY AUDIT TRIGGERS ({riskCase?.triggers?.length || 0})</span>
            </div>
            <ul className="space-y-1.5">
              {riskCase?.triggers?.map((trig, idx) => (
                <li key={idx} className="text-xs text-biohazard-900 font-mono flex items-start space-x-2">
                  <span className="w-1.5 h-1.5 rounded-none bg-biohazard-700 mt-1.5 flex-shrink-0" />
                  <span>{trig}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Section 2: Multi-Stage Cargo Weight Verification */}
          <div className="border border-steel-200 bg-white rounded-md p-4 space-y-3">
            <h4 className="text-xs font-serif font-bold text-steel-900 uppercase tracking-wider">
              Cargo Weight Verification Across Chain-of-Custody
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-cream-50/80 border border-cream-200 rounded">
                <span className="text-[10px] font-bold text-steel-600 uppercase tracking-wider">1. Hospital Outbound</span>
                <p className="text-base font-mono font-bold text-steel-900 mt-1">
                  {batch?.quantity_kg || 48.0} <span className="text-xs font-normal text-steel-500">kg</span>
                </p>
                <p className="text-[10px] text-steel-500">Operation Theatre</p>
              </div>

              <div className="p-3 bg-cream-50/80 border border-cream-200 rounded">
                <span className="text-[10px] font-bold text-steel-600 uppercase tracking-wider">2. Collection Dock</span>
                <p className="text-base font-mono font-bold text-steel-900 mt-1">
                  {batch?.quantity_kg || 48.0} <span className="text-xs font-normal text-steel-500">kg</span>
                </p>
                <p className="text-[10px] text-steel-500">Barcode Tag Scanned</p>
              </div>

              <div className="p-3 bg-biohazard-50/80 border border-biohazard-300 rounded">
                <span className="text-[10px] font-bold text-biohazard-800 uppercase tracking-wider">3. CBWTF Weighbridge</span>
                <p className="text-base font-mono font-bold text-biohazard-900 mt-1">
                  {riskCase?.triggers?.some(t => t.includes('28')) ? '20.0' : (batch?.quantity_kg || 48.0)} <span className="text-xs font-normal text-biohazard-700">kg</span>
                </p>
                <p className="text-[10px] text-biohazard-800 font-bold font-mono">
                  {riskCase?.triggers?.some(t => t.includes('28')) ? '-28.0 kg Discrepancy' : 'Normal Match'}
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Field Photographic Evidence Gallery */}
          <div className="space-y-3">
            <h4 className="text-xs font-serif font-bold text-steel-900 uppercase tracking-wider flex items-center space-x-1.5">
              <Camera className="w-4 h-4 text-steel-700" />
              <span>Chain of Custody Photographic Verification</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sampleEvidence.map((ev, idx) => (
                <div key={idx} className="border border-steel-200 rounded-md overflow-hidden bg-white">
                  <div className="h-36 relative overflow-hidden bg-steel-900 border-b border-steel-200">
                    <img src={ev.url} alt={ev.title} className="w-full h-full object-cover" />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-steel-950/90 text-cream-100 border border-steel-700">
                      {ev.stage}
                    </div>
                  </div>
                  <div className="p-3 space-y-1 text-xs">
                    <p className="font-bold text-steel-900">{ev.title}</p>
                    <p className="text-[11px] text-steel-600 font-mono flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-steel-400" />
                      <span>{ev.timestamp}</span>
                    </p>
                    <p className="text-[11px] font-mono text-steel-700 flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-steel-400" />
                      <span>{ev.gps}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Regulatory Action Execution Panel */}
          <div className="border border-steel-300 rounded-md p-4 bg-cream-50/70 space-y-3">
            <h4 className="text-xs font-serif font-bold text-steel-900 uppercase tracking-wider">
              Enforcement Actions &amp; Case Resolution
            </h4>

            <div>
              <label className="block text-xs font-bold text-steel-700 mb-1">
                Investigation Findings &amp; Statutory Citation
              </label>
              <textarea
                rows={2}
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="Enter regulatory inspection findings, statutory citations (BMW Rules 2016), or summons details..."
                className="w-full px-3 py-2 bg-white border border-steel-300 rounded text-xs text-steel-900 placeholder:text-steel-400 focus:outline-none focus:border-steel-800 font-sans"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {!isUnderInvestigation && !isResolved && (
                <button
                  type="button"
                  disabled={loadingAction}
                  onClick={() => handleApplyAction('INVESTIGATE')}
                  className="px-3.5 py-2 bg-hazmat-500 hover:bg-hazmat-600 disabled:opacity-50 text-steel-950 text-xs font-bold rounded border border-hazmat-600 flex items-center space-x-1.5 transition"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Start Investigation</span>
                </button>
              )}

              <button
                type="button"
                disabled={loadingAction}
                onClick={() => handleApplyAction('REQUEST_EVIDENCE')}
                className="px-3.5 py-2 bg-steel-800 hover:bg-steel-900 disabled:opacity-50 text-cream-50 text-xs font-bold rounded border border-steel-900 flex items-center space-x-1.5 transition"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Request Facility Evidence</span>
              </button>

              <button
                type="button"
                disabled={loadingAction}
                onClick={() => handleApplyAction('ESCALATE')}
                className="px-3.5 py-2 bg-biohazard-700 hover:bg-biohazard-800 disabled:opacity-50 text-white text-xs font-bold rounded border border-biohazard-800 flex items-center space-x-1.5 transition"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Escalate SPCB Notice</span>
              </button>

              {!isResolved && (
                <button
                  type="button"
                  disabled={loadingAction}
                  onClick={() => handleApplyAction('RESOLVE')}
                  className="px-3.5 py-2 bg-forest-800 hover:bg-forest-900 disabled:opacity-50 text-white text-xs font-bold rounded border border-forest-900 flex items-center space-x-1.5 transition"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Resolve &amp; Close Case</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-steel-950 border-t border-steel-800 flex items-center justify-between text-cream-100">
          <span className="text-xs text-cream-300 font-mono">
            Enforcement Officer: {user?.name || 'Amit Deshmukh'} &bull; Case: {riskCase?.case_code}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-steel-800 hover:bg-steel-700 text-cream-100 text-xs font-semibold rounded border border-steel-700 transition"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
}
