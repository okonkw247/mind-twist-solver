import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RefreshCw, Trash2, Trophy, Clock, X, AlertCircle, Star } from 'lucide-react';
import { useWCATimer, formatWCATime, formatTimeWithPenalty } from '@/hooks/useWCATimer';
import { generateScramble } from '@/lib/kociembaSolver';
import BottomNav from '@/components/BottomNav';
import StatCard from '@/components/StatCard';

const Timer = () => {
  const navigate = useNavigate();
  const [scramble, setScramble] = useState('');
  const [showRecords, setShowRecords] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<number | null>(null);
  
  const {
    phase,
    solveTime,
    inspectionRemaining,
    penalty,
    warning,
    records,
    resetTimer,
    handleInteraction,
    applyPenalty,
    saveRecord,
    deleteRecord,
    clearAllRecords,
    calculateStats,
  } = useWCATimer();

  const stats = calculateStats();

  // Generate initial scramble
  useEffect(() => {
    setScramble(generateScramble(20));
  }, []);

  // Generate new scramble
  const newScramble = useCallback(() => {
    setScramble(generateScramble(20));
    resetTimer();
    setLastSavedTime(null);
  }, [resetTimer]);

  // Handle spacebar/tap to start/stop
  const onInteraction = useCallback(() => {
    if (phase === 'stopped' && lastSavedTime === null) {
      saveRecord(scramble);
      setLastSavedTime(solveTime);
    } else if (phase !== 'stopped') {
      handleInteraction();
    }
  }, [phase, lastSavedTime, scramble, saveRecord, solveTime, handleInteraction]);

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        onInteraction();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onInteraction]);

  const isRunning = phase === 'running';
  const isInspecting = phase === 'inspection';

  return (
    <div className="min-h-screen bg-background flex flex-col pb-24">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4 safe-top">
        <button
          onClick={() => navigate('/home')}
          className="btn-icon"
          aria-label="Go back"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold tracking-wider">WCA TIMER</h1>
        <button
          onClick={() => setShowRecords(true)}
          className="btn-icon relative"
          aria-label="View records"
        >
          <Trophy className="w-6 h-6" />
          {records.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-xs rounded-full flex items-center justify-center font-bold">
              {records.length > 99 ? '99+' : records.length}
            </span>
          )}
        </button>
      </header>

      <main className="flex-1 px-4 flex flex-col">
        {/* Scramble Display */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Scramble</span>
            <button
              onClick={newScramble}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
              aria-label="New scramble"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <div className="glass-card">
            <p className="font-mono text-sm leading-relaxed text-center">
              {scramble}
            </p>
          </div>
        </motion.div>

        {/* Warning Banner */}
        {warning.message && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`mb-4 p-3 rounded-xl flex items-center gap-2 ${
              warning.type === 'DNF' || warning.type === '+2'
                ? 'bg-destructive/20 text-destructive'
                : 'bg-gold/20 text-gold'
            }`}
          >
            <AlertCircle className="w-5 h-5" />
            <span className="font-bold">{warning.message}</span>
          </motion.div>
        )}

        {/* Timer Display */}
        <div 
          className="flex-1 flex flex-col items-center justify-center cursor-pointer select-none"
          onClick={onInteraction}
        >
          {isInspecting ? (
            <motion.div
              key="inspection"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              <p className="text-muted-foreground mb-2 uppercase tracking-wider">Inspection</p>
              <p className={`text-8xl font-bold tabular-nums ${
                inspectionRemaining <= 3 ? 'text-destructive' : 
                inspectionRemaining <= 8 ? 'text-gold' : 'text-foreground'
              }`}>
                {inspectionRemaining}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="timer"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              <p className={`text-7xl font-bold tabular-nums ${
                isRunning ? 'text-primary' : 'text-foreground'
              }`}>
                {formatWCATime(solveTime)}
              </p>
              
              {penalty && phase === 'stopped' && (
                <p className={`mt-2 text-xl font-bold ${
                  penalty === 'DNF' ? 'text-destructive' : 'text-gold'
                }`}>
                  {penalty}
                </p>
              )}
              
              {phase === 'idle' && (
                <p className="mt-4 text-muted-foreground">
                  Tap or press Space to start
                </p>
              )}
              
              {phase === 'stopped' && lastSavedTime === null && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4"
                >
                  <p className="text-primary mb-4">
                    Tap to save • New scramble to reset
                  </p>
                  
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        applyPenalty(penalty === '+2' ? null : '+2');
                      }}
                      className={`px-4 py-2 rounded-lg font-bold transition-colors ${
                        penalty === '+2' 
                          ? 'bg-gold text-background' 
                          : 'bg-secondary hover:bg-muted'
                      }`}
                    >
                      +2
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        applyPenalty(penalty === 'DNF' ? null : 'DNF');
                      }}
                      className={`px-4 py-2 rounded-lg font-bold transition-colors ${
                        penalty === 'DNF' 
                          ? 'bg-destructive text-destructive-foreground' 
                          : 'bg-secondary hover:bg-muted'
                      }`}
                    >
                      DNF
                    </button>
                  </div>
                </motion.div>
              )}
              
              {lastSavedTime !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4"
                >
                  <p className="text-primary mb-2">✓ Saved!</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      newScramble();
                    }}
                    className="btn-primary px-6 py-3"
                  >
                    Next Solve
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <StatCard 
            label="Best" 
            value={stats.best ? formatWCATime(stats.best) : '-'} 
            className="text-center"
          />
          <StatCard 
            label="Ao5" 
            value={stats.ao5 ? formatWCATime(stats.ao5) : '-'} 
            className="text-center"
          />
          <StatCard 
            label="Ao12" 
            value={stats.ao12 ? formatWCATime(stats.ao12) : '-'} 
            className="text-center"
          />
        </div>
      </main>

      <BottomNav variant="solver" />

      {/* Records Sheet */}
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
                        if (confirm('Clear all records?')) {
                          clearAllRecords();
                        }
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

              {/* Stats Summary */}
              {stats.count > 0 && (
                <div className="grid grid-cols-4 gap-2 p-4 border-b border-border">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Best</p>
                    <p className="font-semibold text-primary text-sm">
                      {stats.best ? formatWCATime(stats.best) : '-'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Worst</p>
                    <p className="font-semibold text-destructive text-sm">
                      {stats.worst ? formatWCATime(stats.worst) : '-'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Mean</p>
                    <p className="font-semibold text-sm">
                      {stats.mean ? formatWCATime(stats.mean) : '-'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Count</p>
                    <p className="font-semibold text-sm">{stats.count}</p>
                  </div>
                </div>
              )}

              {/* Records List */}
              <div className="flex-1 overflow-y-auto p-4">
                {records.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No records yet</p>
                    <p className="text-sm mt-1">Complete your first solve!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {records.map((record, index) => (
                      <motion.div
                        key={record.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50"
                      >
                        <span className="w-8 text-muted-foreground text-sm">
                          #{index + 1}
                        </span>
                        <div className="flex-1">
                          <p className={`font-bold ${
                            record.finalTime === stats.best ? 'text-primary' :
                            record.finalTime === stats.worst ? 'text-destructive' : ''
                          }`}>
                            {formatTimeWithPenalty(record)}
                          </p>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {record.scramble}
                          </p>
                        </div>
                        <button
                          onClick={() => deleteRecord(record.id)}
                          className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </motion.div>
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
