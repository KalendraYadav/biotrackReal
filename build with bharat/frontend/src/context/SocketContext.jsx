import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

// Sound feedback synthesizer for critical alerts
const playAlertChime = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    }
  } catch {}
};

export function SocketProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const [syncMode, setSyncMode] = useState('connecting'); // 'websocket' | 'polling' | 'connecting'
  const [latestPing, setLatestPing] = useState(null);
  const [latestRiskCase, setLatestRiskCase] = useState(null);
  const [latestCustodyEvent, setLatestCustodyEvent] = useState(null);
  const [alerts, setAlerts] = useState([]);

  const socketRef = useRef(null);
  const pollTimerRef = useRef(null);
  const knownCasesRef = useRef(new Map());
  const listenersRef = useRef({
    onPing: new Set(),
    onRisk: new Set(),
    onCustody: new Set()
  });

  // Push an active toast alert
  const pushAlert = useCallback((alert) => {
    const id = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newAlert = { id, timestamp: new Date().toISOString(), ...alert };
    setAlerts((prev) => [newAlert, ...prev.slice(0, 4)]);

    if (alert.type === 'critical') {
      playAlertChime();
    }

    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      dismissAlert(id);
    }, 10000);
  }, []);

  const dismissAlert = useCallback((id) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // Short Polling Fallback (4 seconds) with JWT Authentication
  const startPolling = useCallback(() => {
    if (pollTimerRef.current) return;
    setSyncMode('polling');

    pollTimerRef.current = setInterval(async () => {
      try {
        const token = localStorage.getItem('biotrace_token');
        const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

        // 1. Poll latest vehicle GPS
        const vehRes = await fetch('/api/vehicles/veh-001/location', { headers: authHeaders });
        if (vehRes.ok) {
          const vehData = await vehRes.json();
          if (vehData?.current_location) {
            const pingData = {
              vehicle_id: vehData.vehicle_id,
              lat: vehData.current_location.latitude,
              lng: vehData.current_location.longitude,
              timestamp: vehData.current_location.last_ping_at
            };
            setLatestPing(pingData);
            listenersRef.current.onPing.forEach((cb) => cb(pingData));
          }
        }

        // 2. Poll latest risk cases
        const riskRes = await fetch('/api/risk-cases', { headers: authHeaders });
        if (riskRes.ok) {
          const riskData = await riskRes.json();
          const cases = riskData.risk_cases || [];
          if (cases.length > 0) {
            cases.forEach((c) => {
              const known = knownCasesRef.current.get(c.id);
              if (known === undefined) {
                // Newly detected case via polling!
                knownCasesRef.current.set(c.id, c.risk_score);
                setLatestRiskCase(c);
                listenersRef.current.onRisk.forEach((cb) => cb(c));

                if (c.risk_score >= 70) {
                  pushAlert({
                    type: 'critical',
                    title: `High Risk Case Alert: ${c.case_code || 'INS-ALERT'}`,
                    message: c.triggers?.[0] || 'High severity chain-of-custody anomaly flagged by AI Risk Engine.',
                    code: c.case_code,
                    score: c.risk_score
                  });
                }
              } else if (known !== c.risk_score) {
                // Score escalated!
                knownCasesRef.current.set(c.id, c.risk_score);
                setLatestRiskCase(c);
                listenersRef.current.onRisk.forEach((cb) => cb(c));
              }
            });
          }
        }
      } catch (err) {
        // Polling retry
      }
    }, 4000);
  }, [pushAlert]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  // Initialize Socket.IO connection
  useEffect(() => {
    let socket = null;
    try {
      // Connect directly to port 5000 in dev or current origin in prod
      const socketUrl = window.location.port === '5173'
        ? `${window.location.protocol}//${window.location.hostname}:5000`
        : '/';

      socket = io(socketUrl, {
        reconnectionAttempts: 10,
        reconnectionDelay: 1500,
        timeout: 5000,
        transports: ['websocket', 'polling']
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        setIsConnected(true);
        setSyncMode('websocket');
        stopPolling();
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
        startPolling();
      });

      socket.on('connect_error', () => {
        setIsConnected(false);
        startPolling();
      });

      // Handle telemetry ping
      socket.on('telemetry:ping', (data) => {
        setLatestPing(data);
        listenersRef.current.onPing.forEach((cb) => cb(data));

        if (data.deviationAlert?.alert) {
          pushAlert({
            type: 'warning',
            title: 'CPCB Geofence Deviation Alert',
            message: data.deviationAlert.message || 'Vehicle has deviated outside approved safe corridor!',
            code: 'ROUTE_DEVIATION'
          });
        }
      });

      // Handle new or escalated risk alert
      socket.on('risk:alert', (data) => {
        const rc = data.case || data;
        knownCasesRef.current.set(rc.id, rc.risk_score);
        setLatestRiskCase(rc);
        listenersRef.current.onRisk.forEach((cb) => cb(rc));

        if (rc.risk_score >= 70) {
          pushAlert({
            type: 'critical',
            title: `High Risk Case Alert: ${rc.case_code || 'INS-ALERT'}`,
            message: rc.triggers?.[0] || 'High severity chain-of-custody anomaly flagged by AI Risk Engine.',
            code: rc.case_code,
            score: rc.risk_score
          });
        }
      });

      // Handle custody event
      socket.on('custody:event', (data) => {
        setLatestCustodyEvent(data);
        listenersRef.current.onCustody.forEach((cb) => cb(data));
      });
    } catch {
      startPolling();
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
      stopPolling();
    };
  }, [pushAlert, startPolling, stopPolling]);

  // Listener subscription helpers
  const subscribeToPing = useCallback((cb) => {
    listenersRef.current.onPing.add(cb);
    return () => listenersRef.current.onPing.delete(cb);
  }, []);

  const subscribeToRisk = useCallback((cb) => {
    listenersRef.current.onRisk.add(cb);
    return () => listenersRef.current.onRisk.delete(cb);
  }, []);

  const subscribeToCustody = useCallback((cb) => {
    listenersRef.current.onCustody.add(cb);
    return () => listenersRef.current.onCustody.delete(cb);
  }, []);

  return (
    <SocketContext.Provider
      value={{
        isConnected,
        syncMode,
        latestPing,
        latestRiskCase,
        latestCustodyEvent,
        alerts,
        dismissAlert,
        pushAlert,
        subscribeToPing,
        subscribeToRisk,
        subscribeToCustody
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return ctx;
}
