import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  RefreshCw,
  Trash2,
  Trophy,
  Clock,
  X,
  AlertCircle,
  Hand,
  Settings as SettingsIcon,
  RotateCw,
} from 'lucide-react';
import { useWCATimer, formatWCATime, formatTimeWithPenalty } from '@/hooks/useWCATimer';
import { generateScramble } from '@/lib/kociembaSolver';

/**
 * WCA Hand-Pad Timer (landscape) with configurable hold threshold + debounce.
 *
 * Reliability rules:
 *  - HOLD threshold (configurable): both pads must remain continuously held for
 *    this long before "READY" fires. Any release inside the window aborts.
 *  - Start-debounce: after the timer starts, any pad input within `startDebounceMs`
 *    is ignored so accidental release-tap doesn't instantly stop it.
 *  - Stop-debounce: after stop, pads are locked for `stopDebounceMs` before a
 *    new hold can begin, preventing a stray touch from restarting the flow.
 */

const SETTINGS_KEY = 'jsn-timer-hand-settings';

interface HandSettings {
  holdMs: number;         // 200–1500
  startDebounceMs: number; // 100–500
  stopDebounceMs: number;  // 100–1000
}

const DEFAULT_SETTINGS: HandSettings = {
  holdMs: 500,
  startDebounceMs: 250,
  stopDebounceMs: 400,
};

function loadSettings(): HandSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

const Timer = () => {
  const navigate = useNavigate();
  const [scramble, setScramble] = useState('');
  const [showRecords, setShowRecords] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<number | null>(null);
  const [settings, setSettings] = useState<HandSettings>(loadSettings);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const {
    phase,
    solveTime,
    penalty,
    warning,
    records,
    resetTimer,
    startSolve,
    stopTimer,
    applyPenalty,
    saveRecord,
    deleteRecord,
    clearAllRecords,
    calculateStats,
  } = useWCATimer();

  const stats = calculateStats();

  // Hand-pad state
  const [leftDown, setLeftDown] = useState(false);
  const [rightDown, setRightDown] = useState(false);
  const [ready, setReady] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0); // 0..1
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdRafRef = useRef<number | null>(null);
  const runStartRef = useRef<number>(0);
  const stopLockUntilRef = useRef<number>(0);

  useEffect(() => {
    setScramble(generateScramble(20));
  }, []);

  // Lock to landscape where supported (installed PWA / fullscreen contexts).
  // Regular browser tabs and iOS Safari can't do this — the rotate-prompt
  // overlay below covers those cases instead.
  useEffect(() => {
    const orientation = (screen as any).orientation;
    if (orientation?.lock) {
      orientation.lock('landscape').catch(() => {
        // Not supported outside fullscreen/standalone — expected, ignore.
      });
    }
    return () => {
      if (orientation?.unlock) {
        try {
          orientation.unlock();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const clearHoldTimers = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (holdRafRef.current) {
      cancelAnimationFrame(holdRafRef.current);
      holdRafRef.current = null;
    }
  };

  const newScramble = useCallback(() => {
    setScramble(generateScramble(20));
    resetTimer();
    setLastSavedTime(null);
    setReady(false);
    setHoldProgress(0);
    clearHoldTimers();
  }, [resetTimer]);

  // Hold-to-ready with progress indicator
  useEffect(() => {
    if (phase === 'running' || phase === 'stopped') return;

    if (leftDown && rightDown) {
      const start = performance.now();
      const hold = settings.holdMs;
      const tick = () => {
        const p = Math.min(1, (performance.now() - start) / hold);
        setHoldProgress(p);
        if (p < 1) holdRafRef.current = requestAnimationFrame(tick);
      };
      holdRafRef.current = requestAnimationFrame(tick);
      holdTimerRef.current = setTimeout(() => setReady(true), hold);

      return () => clearHoldTimers();
    }

    // Not both down anymore
    clearHoldTimers();
    // If we were ready and user releases → start solve
    if (ready && phase === 'idle') {
      runStartRef.current = performance.now();
      startSolve();
    }
    setReady(false);
    setHoldProgress(0);
  }, [leftDown, rightDown, ready, phase, startSolve, settings.holdMs]);

  const handlePadDown = useCallback(
    (side: 'L' | 'R') => {
      const now = performance.now();
      // Stop-debounce lock after a solve stops
      if (now < stopLockUntilRef.current) return;

      if (phase === 'running') {
        // Start-debounce: ignore near-instant taps after start
        if (now - runStartRef.current < settings.startDebounceMs) return;
        stopTimer();
        stopLockUntilRef.current = now + settings.stopDebounceMs;
        setLeftDown(false);
        setRightDown(false);
        return;
      }
      if (phase === 'stopped') return;
      if (side === 'L') setLeftDown(true);
      else setRightDown(true);
    },
    [phase, stopTimer, settings.startDebounceMs, settings.stopDebounceMs],
  );

  const handlePadUp = useCallback((side: 'L' | 'R') => {
    if (side === 'L') setLeftDown(false);
    else setRightDown(false);
  }, []);

  // Spacebar fallback
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return;
      e.preventDefault();
      const now = performance.now();
      if (now < stopLockUntilRef.current) return;
      if (phase === 'running') {
        if (now - runStartRef.current < settings.startDebounceMs) return;
        stopTimer();
        stopLockUntilRef.current = now + settings.stopDebounceMs;
      } else if (phase === 'idle') {
        setLeftDown(true);
        setRightDown(true);
      }
    };
    const ku = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      e.preventDefault();
      if (phase === 'idle') {
        setLeftDown(false);
        setRightDown(false);
      }
    };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    return () => {
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
    };
  }, [phase, stopTimer, settings.startDebounceMs, settings.stopDebounceMs]);

  const handleSave = () => {
    if (phase === 'stopped' && lastSavedTime === null) {
      saveRecord(scramble);
      setLastSavedTime(solveTime);
    }
  };

  const isRunning = phase === 'running';
  const isStopped = phase === 'stopped';

  const padState = (down: boolean) => {
    if (isRunning) return 'stop';
    if (isStopped) return 'idle';
    if (ready && down) return 'ready';
    if (down) return 'holding';
    return 'idle';
  };

  const padClasses = (state: string) => {
    switch (state) {
      case 'ready':
        return 'bg-green-500/25 border-green-400 text-green-300 shadow-[0_0_60px_hsl(140_80%_45%/0.5)]';
      case 'holding':
        return 'bg-amber-500/20 border-amber-400 text-amber-300';
      case 'stop':
        return 'bg-destructive/20 border-destructive text-destructive';
      default:
        return 'bg-card border-border text-muted-foreground hover:bg-secondary/40';
    }
  };

  const HandPad = ({ side }: { side: 'L' | 'R' }) => {
    const down = side === 'L' ? leftDown : rightDown;
    const state = padState(down);
    const showProgress = leftDown && rightDown && !ready && !isRunning && !isStopped;
    return (
      <button
        type="button"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          handlePadDown(side);
        }}
        onPointerUp={() => handlePadUp(side)}
        onPointerCancel={() => handlePadUp(side)}
        onPointerLeave={() => handlePadUp(side)}
        className={`relative flex-1 h-full rounded-3xl border-2 transition-all duration-150 flex flex-col items-center justify-center gap-3 select-none touch-none overflow-hidden ${padClasses(state)}`}
        aria-label={`${side === 'L' ? 'Left' : 'Right'} hand pad`}
      >
        {showProgress && (
          <div
            className="absolute bottom-0 left-0 h-1.5 bg-amber-400 transition-[width] duration-75"
            style={{ width: `${holdProgress * 100}%` }}
          />
        )}
        <Hand
          className={`w-20 h-20 md:w-28 md:h-28 transition-transform ${
            side === 'R' ? 'scale-x-[-1]' : ''
          } ${down ? 'scale-110' : ''}`}
          strokeWidth={1.5}
        />
        <span className="text-xs md:text-sm font-semibold tracking-widest uppercase">
          {isRunning
            ? 'Tap to stop'
            : state === 'ready'
              ? 'Release!'
              : down
                ? 'Hold…'
                : 'Place hand'}
        </span>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col overflow-hidden">
      {/* Rotate-device fallback for browsers/devices that can't auto-lock orientation */}
      <div className="hidden [@media(orientation:portrait)]:flex fixed inset-0 z-[100] bg-background flex-col items-center justify-center gap-4 text-center px-8">
        <RotateCw className="w-12 h-12 text-primary animate-pulse" />
        <p className="text-lg font-semibold">Rotate your device</p>
        <p className="text-sm text-muted-foreground">This timer works best in landscape mode</p>
      </div>
      <header className="flex items-center justify-between gap-3 px-6 py-3 safe-top shrink-0">
        <button onClick={() => navigate('/home')} className="btn-icon shrink-0" aria-label="Back">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1 min-w-0 bg-secondary/40 rounded-xl px-4 py-2">
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground uppercase tracking-wider shrink-0 font-semibold">
              Scramble
            </span>
            <p className="font-mono text-sm truncate">{scramble}</p>
            <button
              onClick={newScramble}
              className="p-2 rounded-lg hover:bg-secondary transition-colors shrink-0 ml-auto"
              aria-label="New scramble"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowSettings(true)}
            className="btn-icon"
            aria-label="Timer settings"
          >
            <SettingsIcon className="w-6 h-6" />
          </button>
          <button
            onClick={() => setShowRecords(true)}
            className="btn-icon relative"
            aria-label="Records"
          >
            <Trophy className="w-6 h-6" />
            {records.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-primary text-[10px] rounded-full flex items-center justify-center font-bold">
                {records.length > 99 ? '99+' : records.length}
              </span>
            )}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {warning.message && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mx-4 mb-1 px-3 py-1.5 rounded-lg bg-destructive/20 text-destructive text-xs flex items-center gap-2 justify-center"
          >
            <AlertCircle className="w-4 h-4" />
            <span className="font-bold">{warning.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 grid grid-cols-[1fr_auto_1fr] gap-3 px-3 pb-3 min-h-0">
        <HandPad side="L" />

        <div className="flex flex-col items-center justify-center px-4 md:px-8 min-w-[220px] md:min-w-[320px]">
          <motion.p
            key={phase}
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`font-bold tabular-nums text-6xl md:text-8xl leading-none ${
              isRunning
                ? 'text-primary'
                : ready
                  ? 'text-green-400'
                  : leftDown || rightDown
                    ? 'text-amber-400'
                    : 'text-foreground'
            }`}
          >
            {formatWCATime(solveTime)}
          </motion.p>

          {penalty && isStopped && (
            <p
              className={`mt-2 text-lg font-bold ${
                penalty === 'DNF' ? 'text-destructive' : 'text-amber-400'
              }`}
            >
              {penalty}
            </p>
          )}

          <div className="mt-4 text-center text-xs md:text-sm text-muted-foreground min-h-5">
            {phase === 'idle' && !leftDown && !rightDown && 'Place both hands on the pads'}
            {phase === 'idle' &&
              (leftDown || rightDown) &&
              !(leftDown && rightDown) &&
              'Place the other hand'}
            {phase === 'idle' && leftDown && rightDown && !ready && 'Hold still…'}
            {phase === 'idle' && ready && 'Release to start!'}
            {isRunning && 'Tap a pad to stop'}
          </div>

          {isStopped && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 flex flex-wrap gap-2 justify-center"
            >
              <button
                onClick={() => applyPenalty(penalty === '+2' ? null : '+2')}
                className={`px-3 py-1.5 text-sm rounded-lg font-bold transition-colors ${
                  penalty === '+2'
                    ? 'bg-amber-500 text-background'
                    : 'bg-secondary hover:bg-muted'
                }`}
              >
                +2
              </button>
              <button
                onClick={() => applyPenalty(penalty === 'DNF' ? null : 'DNF')}
                className={`px-3 py-1.5 text-sm rounded-lg font-bold transition-colors ${
                  penalty === 'DNF'
                    ? 'bg-destructive text-destructive-foreground'
                    : 'bg-secondary hover:bg-muted'
                }`}
              >
                DNF
              </button>
              {lastSavedTime === null ? (
                <button onClick={handleSave} className="btn-primary px-4 py-1.5 text-sm">
                  Save
                </button>
              ) : (
                <button onClick={newScramble} className="btn-primary px-4 py-1.5 text-sm">
                  Next
                </button>
              )}
            </motion.div>
          )}

          <div className="mt-4 grid grid-cols-3 gap-2 w-full text-center">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Best</p>
              <p className="font-semibold text-sm tabular-nums">
                {stats.best ? formatWCATime(stats.best) : '-'}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Ao5</p>
              <p className="font-semibold text-sm tabular-nums">
                {stats.ao5 ? formatWCATime(stats.ao5) : '-'}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Ao12</p>
              <p className="font-semibold text-sm tabular-nums">
                {stats.ao12 ? formatWCATime(stats.ao12) : '-'}
              </p>
            </div>
          </div>
        </div>

        <HandPad side="R" />
      </main>

      {/* Settings sheet */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-50"
              onClick={() => setShowSettings(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl z-50 max-h-[80vh] flex flex-col"
            >
              <div className="flex justify-center py-3">
                <div className="w-12 h-1.5 bg-muted rounded-full" />
              </div>
              <div className="flex items-center justify-between px-5 pb-4 border-b border-border">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <SettingsIcon className="w-5 h-5 text-primary" />
                  Timer sensitivity
                </h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-6">
                <SliderRow
                  label="Hold to ready"
                  hint="How long both hands must stay on the pads before the timer arms."
                  value={settings.holdMs}
                  min={200}
                  max={1500}
                  step={50}
                  unit="ms"
                  onChange={(v) => setSettings((s) => ({ ...s, holdMs: v }))}
                />
                <SliderRow
                  label="Start debounce"
                  hint="Ignore pad input for this long after the timer starts (prevents instant-stop)."
                  value={settings.startDebounceMs}
                  min={100}
                  max={500}
                  step={25}
                  unit="ms"
                  onChange={(v) => setSettings((s) => ({ ...s, startDebounceMs: v }))}
                />
                <SliderRow
                  label="Stop debounce"
                  hint="Lock the pads for this long after stopping so a stray touch can't restart."
                  value={settings.stopDebounceMs}
                  min={100}
                  max={1000}
                  step={50}
                  unit="ms"
                  onChange={(v) => setSettings((s) => ({ ...s, stopDebounceMs: v }))}
                />
                <button
                  onClick={() => setSettings(DEFAULT_SETTINGS)}
                  className="w-full py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-secondary/40"
                >
                  Reset to defaults
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Records sheet */}
      <AnimatePresence>
        {showRecords && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-50"
              onClick={() => setShowRecords(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl z-50 max-h-[80vh] flex flex-col"
            >
              <div className="flex justify-center py-3">
                <div className="w-12 h-1.5 bg-muted rounded-full" />
              </div>
              <div className="flex items-center justify-between px-4 pb-4 border-b border-border">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-primary" />
                  Records ({records.length})
                </h2>
                <div className="flex gap-2">
                  {records.length > 0 && (
                    <button
                      onClick={() => {
                        if (confirm('Clear all records?')) clearAllRecords();
                      }}
                      className="p-2 rounded-lg hover:bg-secondary transition-colors text-destructive"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={() => setShowRecords(false)}
                    className="p-2 rounded-lg hover:bg-secondary transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {records.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No records yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {records.map((record, index) => (
                      <div
                        key={record.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50"
                      >
                        <span className="w-8 text-muted-foreground text-sm">#{index + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`font-bold ${
                              record.finalTime === stats.best
                                ? 'text-primary'
                                : record.finalTime === stats.worst
                                  ? 'text-destructive'
                                  : ''
                            }`}
                          >
                            {formatTimeWithPenalty(record)}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {record.scramble}
                          </p>
                        </div>
                        <button
                          onClick={() => deleteRecord(record.id)}
                          className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

interface SliderRowProps {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}

const SliderRow = ({ label, hint, value, min, max, step, unit, onChange }: SliderRowProps) => (
  <div>
    <div className="flex items-baseline justify-between mb-1">
      <label className="text-sm font-semibold">{label}</label>
      <span className="text-sm font-mono text-primary tabular-nums">
        {value} {unit}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full accent-primary"
    />
    <p className="text-xs text-muted-foreground mt-1">{hint}</p>
  </div>
);

export default Timer;
