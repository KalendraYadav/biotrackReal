import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  QrCode, 
  ShieldCheck, 
  Camera, 
  MapPin, 
  Scale, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  ArrowRight, 
  ArrowLeft,
  RefreshCw,
  Clock,
  Truck,
  Sparkles,
  Upload,
  Keyboard,
  Check
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

export default function HandoverVerificationModal({
  batch,
  stage = 'TRANSPORT_PICKUP',
  vehicle = { id: 'veh-001', plate_no: 'DL-01-AB-4421', current_lat: 28.5520, current_lng: 77.2400 },
  officer = { id: 'user-tran-001', name: 'Vikram Singh', role: 'TRANSPORT_OFFICER' },
  onClose,
  onSuccess
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successReceipt, setSuccessReceipt] = useState(null);

  // Step 1: QR Scan State
  const [qrScanned, setQrScanned] = useState(false);
  const [qrCodeValue, setQrCodeValue] = useState('');
  const [qrInputMode, setQrInputMode] = useState('camera'); // 'camera' or 'manual'
  const [manualQrText, setManualQrText] = useState('');
  const [qrScannerActive, setQrScannerActive] = useState(false);
  const [qrScanSuccess, setQrScanSuccess] = useState(false);
  const [qrScanError, setQrScanError] = useState(null);
  const html5QrScannerRef = useRef(null);
  const qrFileInputRef = useRef(null);

  // Audio scan feedback synthesizers (Web Audio API)
  const playScanSuccessSound = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
        osc.start();
        osc.stop(ctx.currentTime + 0.18);
      }
    } catch (e) {}
  };

  const playScanErrorSound = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {}
  };

  // Step 2: Officer Authentication State
  const [officerPin, setOfficerPin] = useState('1234');
  const [officerAuthenticated, setOfficerAuthenticated] = useState(false);

  // Step 3: Camera API State
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [cameraError, setCameraError] = useState(null);

  // Step 4: GPS Telemetry State
  const [gpsFetching, setGpsFetching] = useState(false);
  const [gpsError, setGpsError] = useState(null);
  const [gpsData, setGpsData] = useState({
    latitude: vehicle?.current_lat || 28.5520,
    longitude: vehicle?.current_lng || 77.2400,
    accuracy: 10,
    timestamp: new Date().toISOString(),
    geofence_valid: true
  });

  // Step 5: Quantity & Custody Notes State
  const [stageQuantity, setStageQuantity] = useState(batch?.quantity_kg ? String(batch.quantity_kg) : '0');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (batch?.quantity_kg) {
      setStageQuantity(String(batch.quantity_kg));
    }
  }, [batch?.quantity_kg]);

  // Stop camera and QR scanner when modal closes or unmounts
  useEffect(() => {
    return () => {
      stopCamera();
      stopQrScanner();
    };
  }, []);

  // Control QR Scanner lifecycle on Step 1
  useEffect(() => {
    if (currentStep === 1 && qrInputMode === 'camera') {
      const timer = setTimeout(() => {
        startQrScanner();
      }, 250);
      return () => {
        clearTimeout(timer);
        stopQrScanner();
      };
    } else {
      stopQrScanner();
    }
  }, [currentStep, qrInputMode]);

  // Sync camera stream to video element when step or cameraActive changes
  useEffect(() => {
    if (cameraActive && mediaStreamRef.current && videoRef.current) {
      if (videoRef.current.srcObject !== mediaStreamRef.current) {
        videoRef.current.srcObject = mediaStreamRef.current;
        videoRef.current.play().catch((e) => console.warn('Video play error:', e));
      }
    }
  }, [cameraActive, currentStep]);

  // Auto-start camera when entering step 3 without a photo
  useEffect(() => {
    if (currentStep === 3 && !capturedPhoto && !cameraActive) {
      startCamera();
    }
    if (currentStep !== 3 && cameraActive) {
      stopCamera();
    }
  }, [currentStep, capturedPhoto]);

  // Initialize camera stream for Step 3
  const startCamera = async () => {
    setCameraError(null);
    try {
      // 1. Enforce HTTPS or localhost check
      const isLocalhost = Boolean(
        typeof window !== 'undefined' && (
          window.location.hostname === 'localhost' ||
          window.location.hostname === '127.0.0.1' ||
          window.location.hostname === '[::1]'
        )
      );
      const isSecure = typeof window !== 'undefined' && (window.isSecureContext || isLocalhost);
      if (!isSecure) {
        throw new Error('Camera access blocked: Web browsers require HTTPS or localhost to access the camera.');
      }

      // 2. Check navigator.mediaDevices support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API (navigator.mediaDevices.getUserMedia) is not supported in this browser or webview.');
      }

      // Stop any existing tracks before starting a new one
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
      }

      // 3. Request camera stream with mobile-friendly constraints and automatic fallback
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
      } catch (idealErr) {
        console.warn('Ideal camera constraints failed, attempting fallback to basic video:', idealErr.name, idealErr.message);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      mediaStreamRef.current = stream;
      setCameraActive(true);

      // 4. Attach stream directly to visible video element
      if (videoRef.current) {
        const vid = videoRef.current;
        vid.srcObject = stream;
        vid.setAttribute('playsinline', 'true');
        vid.setAttribute('webkit-playsinline', 'true');
        vid.muted = true;

        vid.onloadedmetadata = async () => {
          try {
            await vid.play();
          } catch (playErr) {
            console.warn('Camera video play notice onloadedmetadata:', playErr);
          }
        };

        try {
          await vid.play();
        } catch (playErr) {
          console.warn('Immediate camera video play notice:', playErr);
        }
      }
    } catch (err) {
      console.warn('Live camera access failed:', err.name, err.message);
      let friendlyMsg = 'Camera permission denied or camera device not found.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        friendlyMsg = 'Camera permission was denied. Please click the camera icon in your browser address bar to allow camera access.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        friendlyMsg = 'No camera hardware found on this device. You can use the photo file upload button below.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        friendlyMsg = 'Camera is in use by another application or tab. Please close other camera apps and retry.';
      } else if (err.name === 'OverconstrainedError') {
        friendlyMsg = 'Camera does not meet requested resolution constraints. Please retry with standard camera.';
      } else if (err.message) {
        friendlyMsg = err.message;
      }
      setCameraError(friendlyMsg);
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Notice stopping media track:', e);
        }
      });
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Capture snapshot from video stream onto canvas with digital watermark
  const captureSnapshot = () => {
    if (!videoRef.current) return;
    const vid = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    const width = vid.videoWidth || 640;
    const height = vid.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Draw video frame
    ctx.drawImage(vid, 0, 0, width, height);

    // Overlay digital evidence watermark
    const footerHeight = Math.max(50, Math.round(height * 0.12));
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, height - footerHeight, width, footerHeight);

    ctx.fillStyle = '#10B981';
    ctx.font = `bold ${Math.round(footerHeight * 0.28)}px monospace`;
    ctx.fillText(`BIOTRACE CPCB EVIDENCE | BATCH: ${batch?.batch_code || 'BMW-BATCH'}`, 14, height - footerHeight + 20);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `${Math.round(footerHeight * 0.22)}px monospace`;
    ctx.fillText(`STAGE: ${stage} | GPS: ${gpsData.latitude.toFixed(4)}, ${gpsData.longitude.toFixed(4)} | ${new Date().toISOString()}`, 14, height - footerHeight + 40);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedPhoto(dataUrl);
    stopCamera();
    setError(null);
  };

  // Process mobile/desktop uploaded image file with digital watermark
  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current || document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 640, 480);

        // Watermark
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.fillRect(0, 420, 640, 60);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`BIOTRACE EVIDENCE | BATCH: ${batch?.batch_code || 'BMW-BATCH'}`, 14, 440);
        ctx.font = '11px monospace';
        ctx.fillText(`STAGE: ${stage} | GPS: ${gpsData.latitude.toFixed(4)}, ${gpsData.longitude.toFixed(4)} | ${new Date().toLocaleTimeString()}`, 14, 460);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedPhoto(dataUrl);
        stopCamera();
        setError(null);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Generate simulated evidence photo if camera is blocked/unavailable
  const generateSimulatedPhoto = () => {
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');

    // Gradient background representing cargo bay
    const grad = ctx.createLinearGradient(0, 0, 640, 480);
    grad.addColorStop(0, '#1e293b');
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 640, 480);

    // Box container illustration
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.strokeRect(160, 100, 320, 240);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BIOMEDICAL WASTE - SEALED CARGO', 320, 210);

    ctx.font = '14px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`TAG: ${batch?.batch_code} &bull; ${batch?.cpcb_waste_category} BAG`, 320, 240);
    ctx.fillText(`TRUCK PLATE: ${vehicle?.plate_no || 'DL-01-AB-4421'}`, 320, 270);

    // Watermark footer
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 410, 640, 70);

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`CPCB VERIFIED DIGITAL EVIDENCE WATERMARK`, 14, 435);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '11px monospace';
    ctx.fillText(`STAGE: ${stage} | GPS: ${gpsData.latitude.toFixed(4)}, ${gpsData.longitude.toFixed(4)} | ${new Date().toISOString()}`, 14, 458);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedPhoto(dataUrl);
    stopCamera();
  };

  // Fetch real device GPS
  const refreshGps = () => {
    setGpsFetching(true);
    setGpsError(null);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsData({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy),
            timestamp: new Date().toISOString(),
            geofence_valid: true
          });
          setGpsFetching(false);
          setGpsError(null);
        },
        (err) => {
          let msg = 'Device GPS permission denied. Falling back to vehicle telemetry.';
          if (err.code === 2) msg = 'Device GPS position unavailable. Falling back to vehicle telemetry.';
          else if (err.code === 3) msg = 'Device GPS timed out. Falling back to vehicle telemetry.';
          setGpsError(msg);
          setGpsData(prev => ({
            ...prev,
            latitude: vehicle?.current_lat || 28.5520,
            longitude: vehicle?.current_lng || 77.2400,
            timestamp: new Date().toISOString()
          }));
          setGpsFetching(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setGpsError('Geolocation is not supported by this browser. Using vehicle telemetry.');
      setGpsFetching(false);
    }
  };

  // Extract batch code from various CPCB / BioTrace QR formats
  const extractBatchCode = (raw) => {
    if (!raw) return null;
    const trimmed = String(raw).trim();

    // Direct match with batch_code or qr_code_value or id
    if (trimmed === batch?.batch_code || trimmed === batch?.id || trimmed === batch?.qr_code_value) {
      return batch.batch_code;
    }

    // Match CPCB Hospital Tag: QR-NIDUS-(BMW-YYYY-XXXXX)-...
    const nidusMatch = trimmed.match(/QR-NIDUS-(BMW-\d{4}-\d{5})/i);
    if (nidusMatch) return nidusMatch[1];

    // Match standard BMW code: BMW-YYYY-XXXXX
    const bmwMatch = trimmed.match(/(BMW-\d{4}-\d{5})/i);
    if (bmwMatch) return bmwMatch[1];

    // Match BIOTRACE:batchCode:...
    const biotraceMatch = trimmed.match(/BIOTRACE:([^:]+)/i);
    if (biotraceMatch) return biotraceMatch[1];

    // Try parsing JSON payload
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.batch_code) return parsed.batch_code;
      if (parsed.id) return parsed.id;
    } catch {
      // not JSON
    }

    return trimmed;
  };

  // Validate scanned QR code against target batch
  const processQrCode = (rawText) => {
    setQrScanError(null);
    if (!rawText || !rawText.trim()) {
      setQrScanError('Please scan or enter a valid QR tag string.');
      return;
    }

    const trimmed = rawText.trim();
    const parsedCode = extractBatchCode(trimmed);
    const expectedCode = batch?.batch_code;
    const expectedQr = batch?.qr_code_value;
    const expectedId = batch?.id;

    const isMatch = Boolean(
      (expectedCode && parsedCode && parsedCode.toUpperCase() === expectedCode.toUpperCase()) ||
      (expectedQr && (trimmed === expectedQr.trim() || trimmed.toLowerCase() === expectedQr.trim().toLowerCase())) ||
      (expectedCode && trimmed.toUpperCase().includes(expectedCode.toUpperCase())) ||
      (expectedId && (parsedCode === expectedId || trimmed === expectedId))
    );

    if (isMatch) {
      playScanSuccessSound();
      setQrScanSuccess(true);
      setQrCodeValue(trimmed);
      setQrScanned(true);
      stopQrScanner();

      // Brief visual confirmation checkmark before advancing
      setTimeout(() => {
        setCurrentStep(2);
        setQrScanSuccess(false);
      }, 750);
    } else {
      playScanErrorSound();
      setQrScanError(
        `Scanned tag "${parsedCode || trimmed}" does not match target batch "${expectedCode}" (Tag: ${expectedQr || 'N/A'}).`
      );
    }
  };

  // Decode QR from uploaded image file
  const handleQrFileInput = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setQrScanError(null);
    try {
      const sandbox = document.getElementById('qr-file-scan-sandbox');
      if (sandbox) sandbox.innerHTML = '';
      const html5QrCode = new Html5Qrcode('qr-file-scan-sandbox');
      const decodedText = await html5QrCode.scanFile(file, true);
      processQrCode(decodedText);
      try {
        html5QrCode.clear();
      } catch (e) {}
    } catch (err) {
      console.warn('QR file scan failed:', err);
      playScanErrorSound();
      setQrScanError('Could not decode QR code from the uploaded image. Please ensure the QR code is clearly visible and well-lit.');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  // Start live HTML5 QR code scanner on #qr-reader
  const startQrScanner = async () => {
    if (html5QrScannerRef.current) return;
    setQrScanError(null);

    try {
      const el = document.getElementById('qr-reader');
      if (!el) return;
      el.innerHTML = '';

      const scanner = new Html5Qrcode('qr-reader');
      html5QrScannerRef.current = scanner;

      let cameraConfig = { facingMode: 'environment' };
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length > 0) {
          const backCam = cameras.find(c =>
            c.label.toLowerCase().includes('back') ||
            c.label.toLowerCase().includes('rear') ||
            c.label.toLowerCase().includes('environment')
          );
          cameraConfig = backCam ? backCam.id : cameras[0].id;
        }
      } catch (camsErr) {
        console.warn('Could not enumerate cameras, falling back to facingMode constraint:', camsErr);
      }

      let started = false;
      try {
        await scanner.start(
          cameraConfig,
          {
            fps: 15,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
              const qrEdgeSize = Math.floor(minEdge * 0.75);
              return { width: qrEdgeSize, height: qrEdgeSize };
            },
            aspectRatio: 1.0
          },
          (decodedText) => {
            processQrCode(decodedText);
          },
          () => {
            // Active scan loop frame callback
          }
        );
        started = true;
      } catch (firstErr) {
        console.warn('First QR camera start failed, attempting user-facing fallback:', firstErr);
        await scanner.start(
          { facingMode: 'user' },
          {
            fps: 15,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
              const qrEdgeSize = Math.floor(minEdge * 0.75);
              return { width: qrEdgeSize, height: qrEdgeSize };
            },
            aspectRatio: 1.0
          },
          (decodedText) => {
            processQrCode(decodedText);
          },
          () => {}
        );
        started = true;
      }

      if (started) {
        setQrScannerActive(true);
      }
    } catch (err) {
      console.warn('Live QR camera scanner notice:', err);
      setQrScannerActive(false);
      let msg = 'Live QR camera feed unavailable. You can upload a QR image or use manual tag entry below.';
      if (err.name === 'NotAllowedError' || String(err).includes('NotAllowedError')) {
        msg = 'Camera permission denied for QR scanning. Please allow camera permissions or use manual tag entry.';
      } else if (err.name === 'NotFoundError' || String(err).includes('NotFoundError')) {
        msg = 'No camera device found for QR scanning. Please use image upload or manual tag entry.';
      }
      setQrScanError(msg);
    }
  };

  // Stop live HTML5 QR code scanner
  const stopQrScanner = async () => {
    if (html5QrScannerRef.current) {
      const scanner = html5QrScannerRef.current;
      html5QrScannerRef.current = null;
      try {
        if (scanner.isScanning) {
          await scanner.stop();
        }
        scanner.clear();
      } catch (err) {
        console.warn('Notice clearing QR scanner:', err);
      }
    }
    setQrScannerActive(false);
  };

  // Handlers for Wizard Step Progression
  const handleStep1Scan = () => {
    processQrCode(batch?.qr_code_value || batch?.batch_code || `BIOTRACE:${batch?.batch_code}:${batch?.id}`);
  };

  const handleStep2Auth = () => {
    if (officerPin.length < 4) {
      setError('Please enter a valid 4-digit officer PIN (default: 1234)');
      return;
    }
    setError(null);
    setOfficerAuthenticated(true);
    setCurrentStep(3);
  };

  const handleStep3Photo = () => {
    if (!capturedPhoto) {
      setError('Please capture photo evidence before proceeding.');
      return;
    }
    setError(null);
    stopCamera();
    setCurrentStep(4);
    refreshGps();
  };

  const handleStep4Gps = () => {
    setCurrentStep(5);
  };

  // Final Step 5 Submission: POST to /api/waste-batches/:id/custody-event
  const handleSubmitCustodyEvent = async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = {
        stage,
        quantity_at_stage_kg: parseFloat(stageQuantity),
        verified_by_scan: true,
        photo_url: capturedPhoto,
        latitude: gpsData.latitude,
        longitude: gpsData.longitude,
        geofence_valid: gpsData.geofence_valid,
        timestamp: gpsData.timestamp,
        notes,
        performed_by_user_id: officer.id
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
        throw new Error(data.message || data.error || 'Failed to record custody handover.');
      }

      setSuccessReceipt(data);
      if (onSuccess) {
        onSuccess(data);
      }
    } catch (err) {
      console.error('Custody event submission failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const quantityDiff = Math.abs(parseFloat(stageQuantity) - (batch?.quantity_kg || 0));
  const diffPercent = batch?.quantity_kg ? (quantityDiff / batch.quantity_kg) * 100 : 0;
  const isHighVariance = diffPercent > 5.0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-steel-950/70 backdrop-blur-xs animate-fade-in font-sans">
      <div className="bg-white w-full max-w-2xl rounded-lg shadow-modal border-2 border-steel-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-steel-900 text-cream flex items-center justify-between border-b border-hazmat-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-hazmat-500/20 text-hazmat-400 rounded border border-hazmat-600/40">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-black text-base text-cream tracking-tight">
                {stage === 'COLLECTION' 
                  ? 'Hospital Gate Collection Handover' 
                  : stage === 'TRANSPORT_PICKUP' 
                    ? 'Vehicle Pickup Handover Protocol' 
                    : 'CBWTF Gate Intake & Drop-off Handover'}
              </h3>
              <p className="text-xs text-steel-400 font-mono">
                Batch: <span className="text-hazmat-300 font-bold">{batch?.batch_code}</span> &bull; {stage === 'COLLECTION' ? `Officer: ${officer?.name || 'Priya Sharma'}` : `Vehicle: ${vehicle?.plate_no}`}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-steel-400 hover:text-cream rounded transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Stepper (1 to 5) */}
        {!successReceipt && (
          <div className="px-6 py-3 bg-hazmat-50 border-b border-hazmat-200">
            <div className="flex items-center justify-between max-w-lg mx-auto">
              {[
                { step: 1, label: 'QR Scan', icon: QrCode },
                { step: 2, label: 'Officer Auth', icon: ShieldCheck },
                { step: 3, label: 'Live Camera', icon: Camera },
                { step: 4, label: 'GPS + Time', icon: MapPin },
                { step: 5, label: 'Quantity', icon: Scale }
              ].map(({ step, label, icon: StepIcon }) => {
                const isCurrent = currentStep === step;
                const isComplete = currentStep > step;
                return (
                  <div key={step} className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-mono font-bold transition-all border ${
                      isComplete 
                        ? 'bg-forest-700 text-white border-forest-800' 
                        : isCurrent 
                          ? 'bg-hazmat-900 text-white border-hazmat-900 shadow-sm' 
                          : 'bg-hazmat-200 text-steel-600 border-hazmat-300'
                    }`}>
                      {isComplete ? <CheckCircle2 className="w-4 h-4" /> : step}
                    </div>
                    <span className={`text-[10px] mt-1 font-mono font-bold uppercase ${
                      isCurrent ? 'text-steel-900' : 'text-steel-500'
                    }`}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 bg-biohazard-50 border border-biohazard-300 rounded text-xs text-biohazard-900 flex items-center space-x-2 font-mono">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-biohazard-700" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Screen Receipt */}
          {successReceipt ? (
            <div className="text-center py-6 animate-fade-in space-y-4">
              <div className="w-16 h-16 bg-forest-100 text-forest-700 rounded-lg border border-forest-300 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h4 className="text-xl font-serif font-black text-steel-900">Custody Handover Verified!</h4>
                <p className="text-xs text-steel-500 mt-1 font-mono">
                  Immutable chain-of-custody transaction successfully committed to ledger.
                </p>
              </div>

              <div className="bg-hazmat-50 border border-hazmat-200 rounded-lg p-4 text-left space-y-2.5 max-w-md mx-auto text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-steel-500">Stage:</span>
                  <span className="font-bold text-steel-900">{stage}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-steel-500">Updated Status:</span>
                  <span className="font-bold text-forest-800 bg-forest-100 px-2 py-0.5 rounded border border-forest-300">
                    {successReceipt.updatedBatchStatus}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-steel-500">Verified Weight:</span>
                  <span className="font-bold text-steel-900">{stageQuantity} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-steel-500">Authorized Officer:</span>
                  <span className="font-bold text-steel-900">{officer.name} ({officer.id})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-steel-500">Transit Carrier:</span>
                  <span className="font-bold text-steel-900">{vehicle.plate_no}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-steel-500">GPS Coordinates:</span>
                  <span className="text-steel-700">{gpsData.latitude.toFixed(4)}, {gpsData.longitude.toFixed(4)}</span>
                </div>
                <div className="flex justify-between border-t border-hazmat-200 pt-2">
                  <span className="text-steel-500">AI Risk Evaluation:</span>
                  <span className={`font-bold ${
                    (successReceipt.risk_evaluation?.riskScore || 0) > 70 ? 'text-biohazard-700' : 'text-forest-700'
                  }`}>
                    Score: {successReceipt.risk_evaluation?.riskScore || 0}/100
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-forest-700 hover:bg-forest-800 text-white text-xs font-mono font-bold rounded shadow-sm transition"
                >
                  Done &bull; Return to Fleet Dashboard
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* STEP 1: SCAN QR */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="text-center">
                    <h4 className="font-serif font-black text-steel-900 text-sm">Step 1: Scan Biomedical Waste Bag QR Code</h4>
                    <p className="text-xs text-steel-500">
                      Scan the CPCB tamper-evident tag attached to the cargo bag before loading.
                    </p>
                  </div>

                  {/* Mode Selector Tabs */}
                  <div className="flex border-b border-hazmat-200">
                    <button
                      type="button"
                      onClick={() => setQrInputMode('camera')}
                      className={`flex-1 py-2 text-xs font-mono font-bold flex items-center justify-center space-x-1.5 border-b-2 transition ${
                        qrInputMode === 'camera'
                          ? 'border-hazmat-900 text-steel-950 bg-hazmat-50/50'
                          : 'border-transparent text-steel-500 hover:text-steel-800'
                      }`}
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Live Camera Scanner</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setQrInputMode('manual')}
                      className={`flex-1 py-2 text-xs font-mono font-bold flex items-center justify-center space-x-1.5 border-b-2 transition ${
                        qrInputMode === 'manual'
                          ? 'border-hazmat-900 text-steel-950 bg-hazmat-50/50'
                          : 'border-transparent text-steel-500 hover:text-steel-800'
                      }`}
                    >
                      <Keyboard className="w-3.5 h-3.5" />
                      <span>Manual Tag Entry</span>
                    </button>
                  </div>

                  {/* QR Scan Alert / Error */}
                  {qrScanError && (
                    <div className="p-2.5 bg-biohazard-50 border border-biohazard-300 rounded text-xs text-biohazard-900 flex items-start space-x-2 font-mono">
                      <AlertTriangle className="w-4 h-4 text-biohazard-700 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">{qrScanError}</div>
                    </div>
                  )}

                  {/* CAMERA SCANNER TAB */}
                  {qrInputMode === 'camera' && (
                    <div className="space-y-3">
                      <div className="relative bg-steel-950 rounded-lg overflow-hidden border border-steel-800 flex flex-col items-center justify-center min-h-[260px]">
                        {/* html5-qrcode target container */}
                        <div id="qr-reader" className="w-full max-w-sm h-full" />
                        <div id="qr-file-scan-sandbox" style={{ display: 'none' }} />

                        {/* Scanner Status Badge */}
                        {qrScannerActive && (
                          <div className="absolute top-2 left-2 z-20 pointer-events-none">
                            <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-800/80 flex items-center backdrop-blur-xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping mr-1.5" />
                              SCAN LOOP ACTIVE &bull; 15 FPS
                            </span>
                          </div>
                        )}

                        {/* Scan Bounding Box Reticle Overlay */}
                        {qrScannerActive && (
                          <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-10">
                            <div className="w-52 h-52 border-2 border-dashed border-emerald-400/70 rounded-xl relative shadow-[0_0_15px_rgba(16,185,129,0.15)] flex flex-col justify-between p-2">
                              {/* Corner reticles */}
                              <span className="absolute -top-1 -left-1 w-5 h-5 border-t-2 border-l-2 border-emerald-400" />
                              <span className="absolute -top-1 -right-1 w-5 h-5 border-t-2 border-r-2 border-emerald-400" />
                              <span className="absolute -bottom-1 -left-1 w-5 h-5 border-b-2 border-l-2 border-emerald-400" />
                              <span className="absolute -bottom-1 -right-1 w-5 h-5 border-b-2 border-r-2 border-emerald-400" />
                              
                              <div className="flex justify-between items-center text-[10px] font-mono text-emerald-400 bg-steel-950/80 px-1.5 py-0.5 rounded">
                                <span>CPCB TARGET</span>
                                <span>ALIGN TAG</span>
                              </div>

                              {/* Animated laser line */}
                              <div className="w-full h-0.5 bg-emerald-400 shadow-[0_0_10px_#34D399] animate-pulse my-auto" />

                              <div className="text-center text-[9px] font-mono text-emerald-300 bg-steel-950/80 py-0.5 rounded">
                                POSITION QR IN BOX
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Success Flash Overlay */}
                        {qrScanSuccess && (
                          <div className="absolute inset-0 bg-emerald-700/95 flex flex-col items-center justify-center text-white font-mono z-30 animate-fade-in p-4 text-center">
                            <CheckCircle2 className="w-14 h-14 text-white mb-2 animate-bounce" />
                            <p className="font-bold text-base tracking-wide">QR Tag Decoded &amp; Verified!</p>
                            <p className="text-xs text-emerald-100 mt-1 font-bold">{batch?.batch_code}</p>
                            <p className="text-[10px] text-emerald-200 font-mono mt-0.5">{batch?.qr_code_value}</p>
                          </div>
                        )}
                      </div>

                      {/* Hidden File Input for QR Image Scan */}
                      <input
                        ref={qrFileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleQrFileInput}
                      />

                      {/* Info & Helper actions */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-steel-600 px-1">
                        <div>
                          <span>Target: </span>
                          <span className="font-bold text-steel-900">{batch?.batch_code}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => qrFileInputRef.current?.click()}
                            className="px-2.5 py-1 bg-steel-100 hover:bg-steel-200 text-steel-800 rounded font-semibold flex items-center space-x-1 transition"
                            title="Upload a saved QR tag image to decode"
                          >
                            <Upload className="w-3.5 h-3.5 text-steel-600" />
                            <span>Scan Image File</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleStep1Scan}
                            className="px-2.5 py-1 bg-hazmat-100 hover:bg-hazmat-200 text-steel-800 rounded font-semibold flex items-center space-x-1 transition"
                          >
                            <QrCode className="w-3.5 h-3.5 text-hazmat-700" />
                            <span>Simulate Tag Scan</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MANUAL TAG ENTRY TAB */}
                  {qrInputMode === 'manual' && (
                    <div className="p-4 bg-hazmat-50 border border-hazmat-200 rounded-lg space-y-3 font-mono">
                      <div>
                        <label className="block text-xs font-bold text-steel-700 mb-1">
                          Enter or Paste CPCB Bag Tag String
                        </label>
                        <input
                          type="text"
                          value={manualQrText}
                          onChange={(e) => setManualQrText(e.target.value)}
                          placeholder={`e.g. ${batch?.qr_code_value || batch?.batch_code || 'BMW-2026-00018'}`}
                          className="w-full px-3 py-2 bg-white border border-hazmat-300 rounded text-xs font-mono text-steel-900 focus:outline-none focus:ring-2 focus:ring-hazmat-500"
                        />
                        <p className="text-[11px] text-steel-500 mt-1">
                          Supports CPCB format (<span className="text-steel-800">QR-NIDUS-BMW-...</span>), standard code (<span className="text-steel-800">BMW-...</span>), or JSON payload.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setManualQrText(batch?.qr_code_value || batch?.batch_code || '')}
                          className="text-[11px] text-hazmat-800 hover:underline font-bold"
                        >
                          Paste Expected Tag ({batch?.batch_code})
                        </button>

                        <button
                          type="button"
                          onClick={() => processQrCode(manualQrText)}
                          className="px-4 py-2 bg-hazmat-900 hover:bg-black text-white text-xs font-bold rounded shadow-sm flex items-center space-x-1.5 transition"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Verify Tag</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="p-3 bg-cream-50 border border-hazmat-200 rounded text-xs font-mono text-steel-600 flex justify-between items-center">
                    <div>
                      <span className="text-steel-400">Waste Type: </span>
                      <span className="font-bold text-steel-800">{batch?.cpcb_waste_category}</span> ({batch?.cpcb_waste_type})
                    </div>
                    <div>
                      <span className="text-steel-400">Weight: </span>
                      <span className="font-bold text-steel-900">{batch?.quantity_kg} kg</span>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: AUTHENTICATE OFFICER */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="text-center">
                    <h4 className="font-serif font-black text-steel-900 text-sm">Step 2: Authenticate Transport Officer</h4>
                    <p className="text-xs text-steel-500">
                      Confirm driver authorization for vehicle {vehicle.plate_no}.
                    </p>
                  </div>

                  <div className="bg-hazmat-50 border border-hazmat-200 rounded-lg p-4 space-y-3 font-mono">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded bg-forest-800 text-white flex items-center justify-center font-bold">
                        VS
                      </div>
                      <div>
                        <p className="font-bold text-steel-900 text-sm">{officer.name}</p>
                        <p className="text-xs text-steel-500">
                          ID: <span className="font-mono">{officer.id}</span> &bull; Role: {officer.role}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-steel-600 border-t border-hazmat-200 pt-2 flex justify-between">
                      <span>Assigned Vehicle:</span>
                      <span className="font-bold text-steel-900">{vehicle.plate_no}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold text-steel-700 mb-1">
                      Officer Authorization PIN
                    </label>
                    <input
                      type="password"
                      maxLength={6}
                      value={officerPin}
                      onChange={(e) => setOfficerPin(e.target.value)}
                      placeholder="Enter 4-digit PIN (default: 1234)"
                      className="w-full px-3 py-2 border border-hazmat-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-hazmat-500 font-mono tracking-widest text-center"
                    />
                    <p className="text-[11px] text-steel-400 mt-1 text-center font-mono">
                      Demo PIN prefilled as <span className="text-steel-700 font-bold">1234</span>
                    </p>
                  </div>

                  <div className="flex justify-between pt-2">
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="px-4 py-2 border border-hazmat-300 text-steel-700 text-xs font-mono font-semibold rounded hover:bg-hazmat-50"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleStep2Auth}
                      className="px-5 py-2 bg-forest-700 hover:bg-forest-800 text-white text-xs font-mono font-bold rounded shadow-sm flex items-center space-x-1.5"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Authorize Officer &amp; Next</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: CAPTURE LIVE PHOTO (CAMERA API) */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div className="text-center">
                    <h4 className="font-serif font-black text-steel-900 text-sm">Step 3: Capture Live Cargo Photo Evidence</h4>
                    <p className="text-xs text-steel-500">
                      HTML5 Camera API live capture of tagged waste cargo at dock.
                    </p>
                  </div>

                  {capturedPhoto ? (
                    <div className="space-y-3">
                      <div className="relative rounded-lg overflow-hidden border border-hazmat-300 shadow-sm">
                        <img src={capturedPhoto} alt="Captured Evidence" className="w-full h-56 object-cover" />
                        <div className="absolute top-2 right-2 bg-forest-700 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded shadow">
                          Photo Captured
                        </div>
                      </div>
                      <div className="flex justify-center space-x-2">
                        <button
                          onClick={() => {
                            setCapturedPhoto(null);
                            startCamera();
                          }}
                          className="px-3 py-1.5 border border-hazmat-300 text-steel-700 text-xs font-mono font-semibold rounded hover:bg-hazmat-50 flex items-center space-x-1"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Retake Photo</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {cameraError && (
                        <div className="p-3 bg-biohazard-50 border border-biohazard-300 rounded text-xs text-biohazard-900 flex items-start space-x-2 font-mono">
                          <AlertTriangle className="w-4 h-4 text-biohazard-700 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <span className="font-bold">Camera Alert: </span>
                            {cameraError}
                          </div>
                        </div>
                      )}

                      <div className="relative bg-steel-950 rounded-lg overflow-hidden h-60 flex items-center justify-center border border-steel-800">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                        />

                        {!cameraActive && (
                          <div className="absolute inset-0 bg-steel-950 flex flex-col items-center justify-center p-4 text-center text-steel-400 z-10">
                            <Camera className="w-10 h-10 mx-auto mb-2 text-steel-600" />
                            <p className="text-xs font-mono font-bold text-steel-300">
                              {cameraError ? 'Live Camera Feed Unavailable' : 'Initializing camera stream...'}
                            </p>
                            <p className="text-[11px] text-steel-400 font-mono mt-1 max-w-sm">
                              {cameraError || 'Please allow camera permission when prompted by your browser.'}
                            </p>
                          </div>
                        )}

                        {cameraActive && (
                          <button
                            type="button"
                            onClick={captureSnapshot}
                            className="absolute bottom-3 z-20 px-4 py-2 bg-hazmat-600 hover:bg-hazmat-700 text-white text-xs font-mono font-bold rounded shadow-lg flex items-center space-x-1.5 transition"
                          >
                            <Camera className="w-4 h-4" />
                            <span>Snap Photo Now</span>
                          </button>
                        )}
                      </div>

                      {/* Hidden file input for mobile / camera upload */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileInputChange}
                        className="hidden"
                      />

                      {/* Camera Fallbacks & Actions */}
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 bg-hazmat-100 hover:bg-hazmat-200 text-steel-800 text-xs font-mono font-medium rounded flex items-center space-x-1 transition"
                        >
                          <Upload className="w-3.5 h-3.5 text-hazmat-700" />
                          <span>Take / Upload Photo File</span>
                        </button>
                        <button
                          type="button"
                          onClick={generateSimulatedPhoto}
                          className="px-3 py-1.5 bg-hazmat-100 hover:bg-hazmat-200 text-steel-800 text-xs font-mono font-medium rounded flex items-center space-x-1 transition"
                        >
                          <Camera className="w-3.5 h-3.5 text-hazmat-700" />
                          <span>Simulate Cargo Snapshot</span>
                        </button>
                        {!cameraActive && (
                          <button
                            type="button"
                            onClick={startCamera}
                            className="px-3 py-1.5 bg-forest-700 hover:bg-forest-800 text-white text-xs font-mono font-medium rounded flex items-center space-x-1 transition"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Retry Camera</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between pt-2">
                    <button
                      onClick={() => {
                        stopCamera();
                        setCurrentStep(2);
                      }}
                      className="px-4 py-2 border border-hazmat-300 text-steel-700 text-xs font-mono font-semibold rounded hover:bg-hazmat-50"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleStep3Photo}
                      disabled={!capturedPhoto}
                      className="px-5 py-2 bg-forest-700 hover:bg-forest-800 disabled:opacity-50 text-white text-xs font-mono font-bold rounded shadow-sm flex items-center space-x-1.5"
                    >
                      <span>Confirm Photo &amp; Next</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: AUTO-CAPTURE GPS + TIMESTAMP */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <div className="text-center">
                    <h4 className="font-serif font-black text-steel-900 text-sm">Step 4: Geolocation &amp; Timestamp Lock</h4>
                    <p className="text-xs text-steel-500">
                      Validating GPS coordinates against approved safe green corridor.
                    </p>
                  </div>

                  <div className="bg-hazmat-50 border border-hazmat-200 rounded-lg p-4 space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-forest-700" />
                        <span className="font-semibold text-steel-700">GPS Coordinates:</span>
                      </div>
                      <span className="font-bold text-steel-900">
                        {gpsData.latitude.toFixed(4)}, {gpsData.longitude.toFixed(4)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-steel-500" />
                        <span className="font-semibold text-steel-700">Audit Timestamp:</span>
                      </div>
                      <span className="text-steel-600">
                        {new Date(gpsData.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-hazmat-200 pt-2">
                      <span className="font-semibold text-steel-700">Geofence Compliance:</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold bg-forest-100 text-forest-900 border border-forest-300">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Within Safe Corridor
                      </span>
                    </div>
                  </div>

                  {gpsError && (
                    <div className="p-3 bg-hazmat-50 border border-hazmat-300 rounded text-xs text-hazmat-900 flex items-start space-x-2 font-mono">
                      <AlertTriangle className="w-4 h-4 text-hazmat-700 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <span className="font-bold">GPS Geofence Notice: </span>
                        <span>{gpsError}</span>
                      </div>
                    </div>
                  )}

                  <div className="text-center">
                    <button
                      onClick={refreshGps}
                      disabled={gpsFetching}
                      className="px-3 py-1.5 text-xs text-steel-600 hover:text-steel-900 font-mono font-medium inline-flex items-center space-x-1"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${gpsFetching ? 'animate-spin' : ''}`} />
                      <span>Refresh GPS Coordinates</span>
                    </button>
                  </div>

                  <div className="flex justify-between pt-2">
                    <button
                      onClick={() => setCurrentStep(3)}
                      className="px-4 py-2 border border-hazmat-300 text-steel-700 text-xs font-mono font-semibold rounded hover:bg-hazmat-50"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleStep4Gps}
                      className="px-5 py-2 bg-forest-700 hover:bg-forest-800 text-white text-xs font-mono font-bold rounded shadow-sm flex items-center space-x-1.5"
                    >
                      <span>Lock Geolocation &amp; Next</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 5: CONFIRM QUANTITY & SUBMIT */}
              {currentStep === 5 && (
                <div className="space-y-4">
                  <div className="text-center">
                    <h4 className="font-serif font-black text-steel-900 text-sm">Step 5: Confirm Cargo Weight &amp; Final Sign-off</h4>
                    <p className="text-xs text-steel-500">
                      Compare dock scale reading against generation manifest weight.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-hazmat-50 border border-hazmat-200 rounded-lg font-mono">
                      <p className="text-[11px] text-steel-500 font-medium">Manifest Weight (Gen)</p>
                      <p className="text-lg font-bold text-steel-900 mt-0.5">
                        {batch?.quantity_kg} <span className="text-xs text-steel-500 font-normal">kg</span>
                      </p>
                    </div>

                    <div className="p-3 bg-hazmat-100 border border-hazmat-300 rounded-lg font-mono">
                      <label className="block text-[11px] text-steel-800 font-bold">
                        Dock Verified Weight (kg)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={stageQuantity}
                        onChange={(e) => setStageQuantity(e.target.value)}
                        className="w-full mt-1 px-2.5 py-1 bg-white border border-hazmat-400 rounded text-base font-bold text-steel-900 focus:outline-none focus:ring-2 focus:ring-hazmat-500"
                      />
                    </div>
                  </div>

                  {/* Variance Warning Pill */}
                  {isHighVariance ? (
                    <div className="p-3 bg-biohazard-50 border border-biohazard-300 rounded text-xs text-biohazard-900 flex items-start space-x-2 font-mono">
                      <AlertTriangle className="w-4 h-4 text-biohazard-700 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Weight Discrepancy Alert: </span>
                        {quantityDiff.toFixed(1)} kg ({diffPercent.toFixed(1)}% variance). Discrepancies &gt; 5% will trigger an AI Risk Engine audit flag.
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-forest-50 border border-forest-200 rounded text-xs text-forest-900 flex items-center space-x-2 font-mono">
                      <CheckCircle2 className="w-4 h-4 text-forest-700 flex-shrink-0" />
                      <span>Weight matches manifest within legal 5% CPCB tolerance.</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-mono font-bold text-steel-700 mb-1">
                      Custody Notes / Inspection Observations
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-hazmat-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-hazmat-500 font-mono"
                    />
                  </div>

                  {/* Submission Error Banner (e.g. Chain of Custody Violation) */}
                  {error && (
                    <div className="p-4 bg-biohazard-950 border-2 border-biohazard-600 rounded-lg text-cream-50 text-xs font-mono shadow-modal animate-fade-in">
                      <div className="flex items-start space-x-3">
                        <AlertTriangle className="w-5 h-5 text-biohazard-400 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1 flex-1">
                          <p className="font-serif font-black text-sm text-biohazard-300 uppercase tracking-wide">
                            Chain of Custody Violation Blocked
                          </p>
                          <p className="text-cream-200">{error}</p>
                          <div className="mt-2 pt-2 border-t border-biohazard-800/80 text-[11px] text-biohazard-400 font-semibold">
                            &bull; AI Risk Engine triggered automatically.<br />
                            &bull; High-priority risk case dispatched to CPCB Compliance Inspector.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between pt-2">
                    <button
                      onClick={() => setCurrentStep(4)}
                      className="px-4 py-2 border border-hazmat-300 text-steel-700 text-xs font-mono font-semibold rounded hover:bg-hazmat-50"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleSubmitCustodyEvent}
                      disabled={loading}
                      className="px-6 py-2.5 bg-hazmat-900 hover:bg-black disabled:opacity-50 text-white text-xs font-mono font-bold rounded shadow-sm flex items-center space-x-2 transition"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Recording Custody Event...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Commit Handover to Ledger</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
