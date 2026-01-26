import { useState, useEffect, useCallback, useRef } from 'react';

export interface TimerRecord {
  id: string;
  time: number;
  date: string;
  scramble: string;
  penalty?: '+2' | 'DNF';
}

export interface TimerStats {
  best: number | null;
  worst: number | null;
  average: number | null;
  ao5: number | null;  // Average of 5
  ao12: number | null; // Average of 12
  count: number;
}

const STORAGE_KEY = 'jsn-solving-timer-records';

export const useTimer = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [records, setRecords] = useState<TimerRecord[]>([]);
  const [isInspecting, setIsInspecting] = useState(false);
  const [inspectionTime, setInspectionTime] = useState(15);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

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

  // Timer logic
  useEffect(() => {
    if (isRunning) {
      startTimeRef.current = Date.now() - time;
      intervalRef.current = setInterval(() => {
        setTime(Date.now() - startTimeRef.current);
      }, 10);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  // Inspection timer
  useEffect(() => {
    if (isInspecting && inspectionTime > 0) {
      const timer = setTimeout(() => {
        setInspectionTime(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (isInspecting && inspectionTime <= 0) {
      // Auto-start when inspection ends
      startTimer();
    }
  }, [isInspecting, inspectionTime]);

  const startInspection = useCallback(() => {
    setInspectionTime(15);
    setIsInspecting(true);
    setTime(0);
  }, []);

  const startTimer = useCallback(() => {
    setIsInspecting(false);
    setIsRunning(true);
  }, []);

  const stopTimer = useCallback(() => {
    setIsRunning(false);
  }, []);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    setIsInspecting(false);
    setTime(0);
    setInspectionTime(15);
  }, []);

  const toggleTimer = useCallback(() => {
    if (isInspecting) {
      startTimer();
    } else if (isRunning) {
      stopTimer();
    } else if (time === 0) {
      startInspection();
    }
  }, [isRunning, isInspecting, time, startTimer, stopTimer, startInspection]);

  const saveRecord = useCallback((scramble: string, penalty?: '+2' | 'DNF') => {
    const newRecord: TimerRecord = {
      id: Date.now().toString(),
      time: penalty === '+2' ? time + 2000 : time,
      date: new Date().toISOString(),
      scramble,
      penalty,
    };
    
    setRecords(prev => [newRecord, ...prev]);
    return newRecord;
  }, [time]);

  const deleteRecord = useCallback((id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id));
  }, []);

  const clearAllRecords = useCallback(() => {
    setRecords([]);
  }, []);

  // Calculate statistics
  const calculateStats = useCallback((): TimerStats => {
    const validTimes = records
      .filter(r => r.penalty !== 'DNF')
      .map(r => r.time);
    
    if (validTimes.length === 0) {
      return { best: null, worst: null, average: null, ao5: null, ao12: null, count: 0 };
    }

    const best = Math.min(...validTimes);
    const worst = Math.max(...validTimes);
    const average = validTimes.reduce((a, b) => a + b, 0) / validTimes.length;

    // Calculate AoX (remove best and worst, then average)
    const calculateAo = (times: number[]): number | null => {
      if (times.length < 3) return null;
      const sorted = [...times].sort((a, b) => a - b);
      const trimmed = sorted.slice(1, -1); // Remove best and worst
      return trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
    };

    const ao5 = validTimes.length >= 5 ? calculateAo(validTimes.slice(0, 5)) : null;
    const ao12 = validTimes.length >= 12 ? calculateAo(validTimes.slice(0, 12)) : null;

    return { best, worst, average, ao5, ao12, count: records.length };
  }, [records]);

  return {
    time,
    isRunning,
    isInspecting,
    inspectionTime,
    records,
    startInspection,
    startTimer,
    stopTimer,
    resetTimer,
    toggleTimer,
    saveRecord,
    deleteRecord,
    clearAllRecords,
    calculateStats,
  };
};

// Format time as MM:SS.xx
export const formatTime = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);

  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  }
  return `${seconds}.${centiseconds.toString().padStart(2, '0')}`;
};
