import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Dance Floor meter — scores movement intensity from the device accelerometer
 * (DeviceMotion). Works in a mobile browser / Capacitor WebView. On desktop (no
 * motion sensor) it falls back to a clearly-flagged simulation so the UI is demoable.
 *
 * Score model: each ~60Hz sample → linear-accel magnitude (gravity removed).
 * We smooth it (intensity 0..1), detect rhythmic peaks ("moves"), and integrate
 * intensity over time into a climbing score. Tuned to feel good, not to be precise.
 */
export interface DanceState {
  running: boolean;
  score: number;       // climbing total
  moves: number;       // peak detections
  intensity: number;   // 0..1 smoothed, for the live meter
  seconds: number;
  simulated: boolean;  // true when no real sensor (desktop)
}

const PEAK_THRESHOLD = 2.6;   // m/s² of linear accel to count a "move"
const REFRACTORY_MS = 180;    // min gap between counted moves

export const useDanceMeter = () => {
  const [state, setState] = useState<DanceState>({ running: false, score: 0, moves: 0, intensity: 0, seconds: 0, simulated: false });
  const raf = useRef<number | null>(null);
  const tick = useRef(0);
  const lastPeak = useRef(0);
  const smooth = useRef(0);
  const startedAt = useRef(0);
  const simTimer = useRef<number | null>(null);
  const motionFn = useRef<((e: DeviceMotionEvent) => void) | null>(null);

  const onSample = useCallback((mag: number, simulated: boolean) => {
    // mag = linear accel magnitude (m/s²). Smooth → intensity 0..1.
    const norm = Math.min(1, mag / 9);
    smooth.current = smooth.current * 0.82 + norm * 0.18;
    const now = performance.now();
    let movedNow = 0;
    if (mag > PEAK_THRESHOLD && now - lastPeak.current > REFRACTORY_MS) {
      lastPeak.current = now;
      movedNow = 1;
    }
    setState((s) => {
      if (!s.running) return s;
      const gained = smooth.current * 6 + movedNow * 12; // per-frame score
      return {
        ...s,
        intensity: smooth.current,
        moves: s.moves + movedNow,
        score: Math.round(s.score + gained),
        seconds: Math.floor((now - startedAt.current) / 1000),
        simulated,
      };
    });
  }, []);

  const handleMotion = useCallback((e: DeviceMotionEvent) => {
    const a = e.acceleration && (e.acceleration.x != null)
      ? e.acceleration
      : e.accelerationIncludingGravity; // some devices only fill the gravity one
    if (!a) return;
    const ax = a.x || 0, ay = a.y || 0, az = a.z || 0;
    // when using gravity-included, subtract ~9.8 baseline from magnitude
    const raw = Math.sqrt(ax * ax + ay * ay + az * az);
    const mag = e.acceleration && e.acceleration.x != null ? raw : Math.abs(raw - 9.8);
    onSample(mag, false);
  }, [onSample]);

  const start = useCallback(async () => {
    startedAt.current = performance.now();
    lastPeak.current = 0; smooth.current = 0; tick.current = 0;
    setState({ running: true, score: 0, moves: 0, intensity: 0, seconds: 0, simulated: false });

    // iOS 13+ needs an explicit permission request from a user gesture.
    const DME: any = typeof DeviceMotionEvent !== 'undefined' ? DeviceMotionEvent : null;
    let granted = true;
    if (DME && typeof DME.requestPermission === 'function') {
      try { granted = (await DME.requestPermission()) === 'granted'; } catch { granted = false; }
    }

    let gotReal = false;
    if (granted && typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
      const wrapped = (e: DeviceMotionEvent) => { gotReal = true; handleMotion(e); };
      motionFn.current = wrapped;
      window.addEventListener('devicemotion', wrapped);
    }

    // Fallback: if no real motion events arrive within 1.2s, simulate (desktop/no sensor).
    window.setTimeout(() => {
      if (!gotReal) {
        setState((s) => ({ ...s, simulated: true }));
        const loop = () => {
          // pseudo-random "dancing" signal
          const t = performance.now() / 1000;
          const beat = Math.sin(t * 6) * 0.5 + 0.5;
          const mag = beat * 6 + Math.random() * 4;
          onSample(mag, true);
          simTimer.current = window.setTimeout(loop, 40);
        };
        loop();
      }
    }, 1200);
  }, [handleMotion, onSample]);

  const stop = useCallback(() => {
    setState((s) => ({ ...s, running: false, intensity: 0 }));
    if (motionFn.current) { window.removeEventListener('devicemotion', motionFn.current); motionFn.current = null; }
    if (simTimer.current) { clearTimeout(simTimer.current); simTimer.current = null; }
    if (raf.current) { cancelAnimationFrame(raf.current); raf.current = null; }
  }, []);

  const reset = useCallback(() => setState({ running: false, score: 0, moves: 0, intensity: 0, seconds: 0, simulated: false }), []);

  useEffect(() => () => stop(), [stop]);

  return { ...state, start, stop, reset };
};
