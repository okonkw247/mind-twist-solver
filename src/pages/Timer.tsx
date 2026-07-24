import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RefreshCw, Trash2, Trophy, Clock, X, AlertCircle, Hand } from 'lucide-react';
import { useWCATimer, formatWCATime, formatTimeWithPenalty } from '@/hooks/useWCATimer';
import { generateScramble } from '@/lib/kociembaSolver';

/**
 * WCA Hand-Pad Timer (landscape).
 *
 * Interaction:
 *  - Two large pads (left + right). User places both hands.
 *  - After holding both pads for 500ms → "READY" (green).
 *  - Releasing either pad → timer starts.
 *  - While running, touching any pad → timer stops.
 *  - After stop, tap Save / New scramble.
 */

const HOLD_READY_MS = 500;

const Timer = () => {
  const navigate = useNavigate();
  const [scramble, setScramble] = useState('');
  const [showRecords, setShowRecords] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<number | null>(null);

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
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setScramble(generateScramble(20));
  }, []);

  const newScramble = useCallback(() => {
    setScramble(generateScramble(20));
    resetTimer();
    setLastSavedTime(null);
    setReady(false);
  }, [resetTimer]);

  // Both hands down → start hold-to-ready countdown
  useEffect(() => {
    if (phase === 'running' || phase === 'stopped') return;
    if (leftDown && rightDown) {
      holdTimerRef.current = setTimeout(() => setReady(true), HOLD_READY_MS);
      return () => {
        if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      };
    } else {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      // If we were ready and user releases → start solve
      if (ready && phase === 'idle') {
        startSolve();
      }
      setReady(false);
    }
  }, [leftDown, rightDown, ready, phase, startSolve]);

  // Any pad press while running → stop
  const handlePadDown = useCallback(
    (side: 'L' | 'R') => {
      if (phase === 'running') {
        stopTimer();
        return;
      }
      if (phase === 'stopped') return;
      if (side === 'L') setLeftDown(true);
      else setRightDown(true);
    },
    [phase, stopTimer],
  );

  const handlePadUp = useCallback((side: 'L' | 'R') => {
    if (side === 'L') setLeftDown(false);
    else setRightDown(false);
  }, []);

  // Spacebar fallback: hold-space = both hands, release = start, tap while running = stop
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return;
      e.preventDefault();
      if (phase === 'running') {
        stopTimer();
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
  }, [phase, stopTimer]);

  const handleSave = () => {
    if (phase === 'stopped' && lastSavedTime === null) {
      saveRecord(scramble);
      setLastSavedTime(solveTime);
    }
  };

  const isRunning = phase === 'running';
  const isStopped = phase === 'stopped';

  // Pad visual state
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
        className={`flex-1 h-full rounded-3xl border-2 transition-all duration-150 flex flex-col items-center justify-center gap-3 select-none touch-none ${padClasses(state)}`}
        aria-label={`${side === 'L' ? 'Left' : 'Right'} hand pad`}
      >
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
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 safe-top shrink-0">
        <button onClick={() => navigate('/home')} className="btn-icon" aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 mx-3 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider shrink-0">
              Scramble
            </span>
            <p className="font-mono text-xs truncate">{scramble}</p>
            <button
              onClick={newScramble}
              className="p-1.5 rounded-lg hover:bg-secondary transition-colors shrink-0"
              aria-label="New scramble"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <button
          onClick={() => setShowRecords(true)}
          className="btn-icon relative"
          aria-label="Records"
        >
          <Trophy className="w-5 h-5" />
          {records.length > 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-primary text-[10px] rounded-full flex items-center justify-center font-bold">
              {records.length > 99 ? '99+' : records.length}
            </span>
          )}
        </button>
      </header>

      {/* Warning */}
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

      {/* Landscape stage: [ pad | display | pad ] */}
      <main className="flex-1 grid grid-cols-[1fr_auto_1fr] gap-3 px-3 pb-3 min-h-0">
        <HandPad side="L" />

        {/* Center display */}
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
            {phase === 'idle' &&
              !leftDown &&
              !rightDown &&
              'Place both hands on the pads'}
            {phase === 'idle' && (leftDown || rightDown) && !ready && !(leftDown && rightDown) &&
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

          {/* Stats row */}
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

export default Timer;
