// WCA-Compliant Timer Hook
// Implements official WCA timing rules with inspection, penalties, and averages

import { useState, useEffect, useCallback, useRef } from 'react';

// WCA Constants
const INSPECTION_DURATION = 15000; // 15 seconds
const WARNING_8S = 8000;
const WARNING_12S = 12000;
const PLUS_2_THRESHOLD = 15000;
const DNF_THRESHOLD = 17000;

export type TimerPhase = 'idle' | 'inspection' | 'ready' | 'running' | 'stopped';
export type Penalty = null | '+2' | 'DNF';

export interface SolveResult {
  id: string;
  rawTime: number;
  penalty: Penalty;
  finalTime: number;
  timestamp: string;
  scramble: string;
  ao5?: number | 'DNF' | null;
  ao12?: number | 'DNF' | null;
}

export interface TimerStats {
  best: number | null;
  worst: number | null;
  mean: number | null;
  ao5: number | 'DNF' | null;
  ao12: number | 'DNF' | null;
  ao100: number | 'DNF' | null;
  count: number;
  dnfCount: number;
}

export interface InspectionWarning {
  type: '8s' | '12s' | '+2' | 'DNF' | null;
  message: string | null;
}

const STORAGE_KEY = 'jsn-wca-timer-records';

export function useWCATimer() {
  // Core timer state
  const [phase, setPhase] = useState<TimerPhase>('idle');
  const [solveTime, setSolveTime] = useState(0);
  const [inspectionElapsed, setInspectionElapsed] = useState(0);
  const [penalty, setPenalty] = useState<Penalty>(null);
  const [warning, setWarning] = useState<InspectionWarning>({ type: null, message: null });
  const [records, setRecords] = useState<SolveResult[]>([]);
  
  // Refs for accurate timing
  const startTimeRef = useRef<number>(0);
  const inspectionStartRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  const inspectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Load records from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setRecords(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load timer records:', e);
      }
    }
  }, []);
  
  // Save records to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }, [records]);
  
  // High-precision timer loop
  const updateSolveTime = useCallback(() => {
    if (phase === 'running') {
      setSolveTime(performance.now() - startTimeRef.current);
      animationFrameRef.current = requestAnimationFrame(updateSolveTime);
    }
  }, [phase]);
  
  // Start/stop animation frame loop
  useEffect(() => {
    if (phase === 'running') {
      animationFrameRef.current = requestAnimationFrame(updateSolveTime);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [phase, updateSolveTime]);
  
  // Inspection timer with warnings
  useEffect(() => {
    if (phase === 'inspection') {
      inspectionStartRef.current = performance.now();
      
      inspectionIntervalRef.current = setInterval(() => {
        const elapsed = performance.now() - inspectionStartRef.current;
        setInspectionElapsed(elapsed);
        
        // Update warnings
        if (elapsed >= DNF_THRESHOLD) {
          setWarning({ type: 'DNF', message: 'DNF - Time exceeded' });
          setPenalty('DNF');
          // Auto-stop with DNF
          setPhase('stopped');
          setSolveTime(0);
        } else if (elapsed >= PLUS_2_THRESHOLD) {
          setWarning({ type: '+2', message: '+2 Penalty' });
          setPenalty('+2');
        } else if (elapsed >= WARNING_12S) {
          setWarning({ type: '12s', message: '12 seconds!' });
        } else if (elapsed >= WARNING_8S) {
          setWarning({ type: '8s', message: '8 seconds!' });
        }
      }, 100);
      
      return () => {
        if (inspectionIntervalRef.current) {
          clearInterval(inspectionIntervalRef.current);
        }
      };
    }
  }, [phase]);
  
  // Start inspection
  const startInspection = useCallback(() => {
    setPhase('inspection');
    setSolveTime(0);
    setInspectionElapsed(0);
    setPenalty(null);
    setWarning({ type: null, message: null });
  }, []);
  
  // Start solving (after inspection)
  const startSolve = useCallback(() => {
    if (phase === 'inspection') {
      // Check if we're in penalty zone
      const elapsed = performance.now() - inspectionStartRef.current;
      
      if (elapsed >= DNF_THRESHOLD) {
        setPenalty('DNF');
      } else if (elapsed >= PLUS_2_THRESHOLD) {
        setPenalty('+2');
      }
      
      if (inspectionIntervalRef.current) {
        clearInterval(inspectionIntervalRef.current);
      }
    }
    
    setPhase('running');
    startTimeRef.current = performance.now();
    setWarning({ type: null, message: null });
  }, [phase]);
  
  // Stop timer
  const stopTimer = useCallback(() => {
    if (phase !== 'running') return;
    
    setPhase('stopped');
    setSolveTime(performance.now() - startTimeRef.current);
  }, [phase]);
  
  // Reset timer
  const resetTimer = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (inspectionIntervalRef.current) {
      clearInterval(inspectionIntervalRef.current);
    }
    
    setPhase('idle');
    setSolveTime(0);
    setInspectionElapsed(0);
    setPenalty(null);
    setWarning({ type: null, message: null });
  }, []);
  
  // Toggle handler for tap/space interaction
  const handleInteraction = useCallback(() => {
    switch (phase) {
      case 'idle':
        startInspection();
        break;
      case 'inspection':
        startSolve();
        break;
      case 'running':
        stopTimer();
        break;
      case 'stopped':
        // Do nothing - need explicit reset or save
        break;
    }
  }, [phase, startInspection, startSolve, stopTimer]);
  
  // Apply manual penalty
  const applyPenalty = useCallback((newPenalty: Penalty) => {
    if (phase === 'stopped') {
      setPenalty(newPenalty);
    }
  }, [phase]);
  
  // Save record with penalty
  const saveRecord = useCallback((scramble: string): SolveResult => {
    const rawTime = solveTime;
    let finalTime = rawTime;
    
    if (penalty === '+2') {
      finalTime = rawTime + 2000;
    }
    
    const newRecord: SolveResult = {
      id: Date.now().toString(),
      rawTime,
      penalty,
      finalTime,
      timestamp: new Date().toISOString(),
      scramble,
    };
    
    const newRecords = [newRecord, ...records];
    
    // Calculate Ao5 and Ao12 for this solve
    newRecord.ao5 = calculateAoN(newRecords, 5);
    newRecord.ao12 = calculateAoN(newRecords, 12);
    
    setRecords(newRecords);
    return newRecord;
  }, [solveTime, penalty, records]);
  
  // Delete record
  const deleteRecord = useCallback((id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id));
  }, []);
  
  // Clear all records
  const clearAllRecords = useCallback(() => {
    setRecords([]);
  }, []);
  
  // Calculate statistics
  const calculateStats = useCallback((): TimerStats => {
    const validResults = records.filter(r => r.penalty !== 'DNF');
    const dnfCount = records.filter(r => r.penalty === 'DNF').length;
    
    if (validResults.length === 0) {
      return {
        best: null,
        worst: null,
        mean: null,
        ao5: null,
        ao12: null,
        ao100: null,
        count: records.length,
        dnfCount,
      };
    }
    
    const times = validResults.map(r => r.finalTime);
    const best = Math.min(...times);
    const worst = Math.max(...times);
    const mean = times.reduce((a, b) => a + b, 0) / times.length;
    
    return {
      best,
      worst,
      mean,
      ao5: calculateAoN(records, 5),
      ao12: calculateAoN(records, 12),
      ao100: calculateAoN(records, 100),
      count: records.length,
      dnfCount,
    };
  }, [records]);
  
  // Get inspection time remaining
  const inspectionRemaining = Math.max(0, INSPECTION_DURATION - inspectionElapsed);
  const inspectionSeconds = Math.ceil(inspectionRemaining / 1000);
  
  return {
    // State
    phase,
    solveTime,
    inspectionRemaining: inspectionSeconds,
    inspectionElapsed,
    penalty,
    warning,
    records,
    
    // Actions
    startInspection,
    startSolve,
    stopTimer,
    resetTimer,
    handleInteraction,
    applyPenalty,
    saveRecord,
    deleteRecord,
    clearAllRecords,
    
    // Stats
    calculateStats,
  };
}

// WCA Average of N calculation
// Removes best and worst (5%), averages the rest
// More than 1 DNF in Ao5 = DNF, more than 10% DNF in larger averages = DNF
export function calculateAoN(results: SolveResult[], n: number): number | 'DNF' | null {
  if (results.length < n) return null;
  
  const subset = results.slice(0, n);
  const dnfCount = subset.filter(r => r.penalty === 'DNF').length;
  
  // DNF threshold: 1 for Ao5, ~10% for larger averages
  const maxDNF = n === 5 ? 1 : Math.floor(n / 10) || 1;
  
  if (dnfCount > maxDNF) return 'DNF';
  
  // Sort times (DNF goes to end as infinity)
  const sorted = [...subset].sort((a, b) => {
    if (a.penalty === 'DNF') return 1;
    if (b.penalty === 'DNF') return -1;
    return a.finalTime - b.finalTime;
  });
  
  // Remove 5% best and 5% worst (minimum 1 each for Ao5)
  const trimCount = Math.ceil(n * 0.05) || 1;
  const trimmed = sorted.slice(trimCount, -trimCount);
  
  // If all remaining are DNF, return DNF
  if (trimmed.every(r => r.penalty === 'DNF')) return 'DNF';
  
  // Average the valid times
  const validTimes = trimmed.filter(r => r.penalty !== 'DNF').map(r => r.finalTime);
  return validTimes.reduce((a, b) => a + b, 0) / validTimes.length;
}

// Format time as MM:SS.xx or SS.xx
export function formatWCATime(ms: number | null | 'DNF'): string {
  if (ms === null) return '-';
  if (ms === 'DNF') return 'DNF';
  
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  if (minutes > 0) {
    return `${minutes}:${seconds.toFixed(2).padStart(5, '0')}`;
  }
  return seconds.toFixed(2);
}

// Format time with penalty indicator
export function formatTimeWithPenalty(result: SolveResult): string {
  if (result.penalty === 'DNF') return 'DNF';
  
  const timeStr = formatWCATime(result.finalTime);
  
  if (result.penalty === '+2') {
    return `${timeStr}+`;
  }
  
  return timeStr;
}
