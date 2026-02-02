// Play Cube - Level-based gameplay with real-time 3D cube

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Map, Zap, Star, Lock, Play, ChevronUp, ChevronDown, X, Gem } from 'lucide-react';
import RealTimeCube3D, { RealTimeCubeHandle } from '@/components/RealTimeCube3D';
import BottomNav from '@/components/BottomNav';
import { generateScramble, parseSolution } from '@/lib/kociembaSolver';

interface Level {
  id: number;
  stars: number;
  unlocked: boolean;
  current?: boolean;
}

const PlayCube = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const cubeRef = useRef<RealTimeCubeHandle>(null);
  
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [selectedMinutes, setSelectedMinutes] = useState(2);
  const [selectedSeconds, setSelectedSeconds] = useState(0);
  const [gems, setGems] = useState(450);
  const [energy, setEnergy] = useState({ current: 10, max: 10 });
  const [progress, setProgress] = useState({ current: 12, total: 45 });
  
  const [levels] = useState<Level[]>([
    { id: 1, stars: 3, unlocked: true },
    { id: 2, stars: 2, unlocked: true },
    { id: 3, stars: 1, unlocked: true },
    { id: 4, stars: 0, unlocked: true, current: true },
    { id: 5, stars: 0, unlocked: false },
  ]);

  const currentLevel = levels.find(l => l.current) || levels[0];

  const handleStartLevel = () => {
    navigate('/solver');
  };

  return (
    <div className="min-h-screen bg-background pb-24 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4 safe-top">
        <button
          onClick={() => navigate('/premium')}
          className="btn-icon"
          aria-label="Settings"
        >
          <Settings className="w-6 h-6" />
        </button>
        
        <div className="text-center">
          <h1 className="text-lg font-bold tracking-wider">World 1: Logic Cube</h1>
          <p className="text-xs text-muted-foreground">
            Progress: {progress.current}/{progress.total} Stars
          </p>
        </div>
        
        <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/20 border border-primary">
          <Star className="w-4 h-4 text-gold fill-gold" />
          <span className="font-bold text-sm">125</span>
        </div>
      </header>

      {/* Resources Bar */}
      <div className="px-4 mb-6">
        <div className="flex gap-3">
          <div className="flex-1 glass-card flex items-center gap-3 py-3">
            <div className="w-10 h-10 rounded-lg bg-gold/20 flex items-center justify-center">
              <Gem className="w-5 h-5 text-gold" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Gems</p>
              <p className="font-bold">{gems}</p>
            </div>
          </div>
          
          <div className="flex-1 glass-card flex items-center gap-3 py-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Energy</p>
              <p className="font-bold">{energy.current}/{energy.max}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Level Map */}
      <main className="flex-1 px-4 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent pointer-events-none" />
        
        {/* Level path visualization */}
        <div className="relative flex flex-col items-center justify-center min-h-[400px]">
          {/* Connecting lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--primary) / 0.3)" />
                <stop offset="100%" stopColor="hsl(var(--primary) / 0.1)" />
              </linearGradient>
            </defs>
            {/* Diagonal lines connecting levels */}
            <path
              d="M 50% 85% L 65% 70% L 35% 50% L 55% 35% L 50% 20%"
              stroke="url(#lineGradient)"
              strokeWidth="3"
              fill="none"
              strokeDasharray="8 4"
            />
          </svg>

          {/* Level nodes */}
          {levels.slice().reverse().map((level, index) => {
            const positions = [
              { x: '50%', y: '15%' },
              { x: '35%', y: '32%' },
              { x: '60%', y: '48%' },
              { x: '40%', y: '65%' },
              { x: '55%', y: '82%' },
            ];
            const pos = positions[index];
            
            return (
              <motion.div
                key={level.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="absolute transform -translate-x-1/2 -translate-y-1/2"
                style={{ left: pos.x, top: pos.y }}
              >
                {level.current && (
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2">
                    <Map className="w-5 h-5 text-primary" />
                  </div>
                )}
                
                <button
                  onClick={() => level.unlocked && navigate('/solver')}
                  disabled={!level.unlocked}
                  className={`level-node ${level.current ? 'current' : ''} ${!level.unlocked ? 'locked' : ''}`}
                >
                  {level.unlocked ? (
                    level.id
                  ) : (
                    <Lock className="w-6 h-6" />
                  )}
                </button>
                
                <div className="mt-2 text-center">
                  <p className="text-xs text-muted-foreground">
                    {level.current ? 'Current' : `Level ${level.id}`}
                  </p>
                  <div className="flex gap-0.5 justify-center mt-1">
                    {[1, 2, 3].map(star => (
                      <Star
                        key={star}
                        className={`w-3 h-3 ${
                          star <= level.stars ? 'text-gold fill-gold' : 'text-muted-foreground'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>

      {/* Continue Button */}
      <div className="px-4 mb-4">
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleStartLevel}
          className="btn-primary w-full h-14 flex items-center justify-center gap-3 text-lg"
        >
          <Play className="w-6 h-6" />
          Continue Level {currentLevel.id}
        </motion.button>
      </div>

      <BottomNav variant="map" />

      {/* Time Selection Modal */}
      <AnimatePresence>
        {showTimeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6"
            onClick={() => setShowTimeModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm glass-card p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Select Time</h2>
                <button onClick={() => setShowTimeModal(false)}>
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex justify-center items-center gap-4 mb-8">
                <div className="flex flex-col items-center">
                  <span className="text-sm text-muted-foreground mb-2">Min</span>
                  <button
                    onClick={() => setSelectedMinutes(prev => Math.min(prev + 1, 59))}
                    className="p-2 rounded-lg hover:bg-secondary"
                  >
                    <ChevronUp className="w-5 h-5" />
                  </button>
                  <span className="text-4xl font-bold w-16 text-center tabular-nums">
                    {selectedMinutes}
                  </span>
                  <button
                    onClick={() => setSelectedMinutes(prev => Math.max(prev - 1, 0))}
                    className="p-2 rounded-lg hover:bg-secondary"
                  >
                    <ChevronDown className="w-5 h-5" />
                  </button>
                </div>

                <span className="text-4xl font-bold">:</span>

                <div className="flex flex-col items-center">
                  <span className="text-sm text-muted-foreground mb-2">Sec</span>
                  <button
                    onClick={() => setSelectedSeconds(prev => prev >= 55 ? 0 : prev + 5)}
                    className="p-2 rounded-lg hover:bg-secondary"
                  >
                    <ChevronUp className="w-5 h-5" />
                  </button>
                  <span className="text-4xl font-bold w-16 text-center tabular-nums">
                    {selectedSeconds}
                  </span>
                  <button
                    onClick={() => setSelectedSeconds(prev => prev <= 0 ? 55 : prev - 5)}
                    className="p-2 rounded-lg hover:bg-secondary"
                  >
                    <ChevronDown className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <button
                onClick={() => setShowTimeModal(false)}
                className="btn-primary w-full py-4 text-lg font-bold"
              >
                OK
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PlayCube;
