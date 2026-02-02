import { Suspense, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Settings, Trophy, Play, Puzzle, Star } from 'lucide-react';
import RubiksCube3D from '@/components/RubiksCube3D';
import BottomNav from '@/components/BottomNav';
import StatCard from '@/components/StatCard';

const Home = () => {
  const navigate = useNavigate();
  const [bestTime] = useState('00:42.15');
  const [solveCount] = useState(1284);
  const [currentLevel] = useState(12);
  const [rank] = useState('GRANDMASTER');

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4 safe-top">
        <button
          onClick={() => navigate('/premium')}
          className="btn-icon"
          aria-label="Settings"
        >
          <Settings className="w-6 h-6" />
        </button>
        
        <h1 className="text-xl font-bold tracking-wider">JSN SOLVER</h1>
        
        <button
          onClick={() => navigate('/timer')}
          className="btn-icon"
          aria-label="Achievements"
        >
          <Trophy className="w-6 h-6" />
        </button>
      </header>

      <main className="px-4">
        {/* Daily Challenge Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card mb-6 flex items-center justify-between"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
              <span className="text-xs font-semibold text-destructive uppercase tracking-wider">
                Daily Challenge
              </span>
            </div>
            <h3 className="text-lg font-bold mb-1">Mirror Scramble</h3>
            <p className="text-sm text-muted-foreground mb-3">Beat 00:30 to win 500 Gold</p>
            <button
              onClick={() => navigate('/play-cube')}
              className="btn-primary py-2 px-6 text-sm"
            >
              Join Now
            </button>
          </div>
          <div className="w-20 h-20 rounded-full bg-secondary/50 flex items-center justify-center">
            <Puzzle className="w-10 h-10 text-muted-foreground" />
          </div>
        </motion.div>

        {/* 3D Cube Display */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="relative rounded-3xl bg-gradient-to-br from-card to-secondary/50 p-6 mb-6 overflow-hidden"
        >
          {/* Ambient glow */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 rounded-full bg-primary/10 blur-3xl" />
          </div>
          
          <div className="relative flex justify-center py-4">
            <Suspense fallback={
              <div className="w-48 h-48 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            }>
              <RubiksCube3D size={220} autoRotate={true} />
            </Suspense>
          </div>
        </motion.div>

        {/* Rank Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex justify-center mb-6"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border">
            <Star className="w-4 h-4 text-gold fill-gold" />
            <span className="text-sm font-semibold tracking-wider">{rank} RANK</span>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-2 gap-4 mb-6"
        >
          <StatCard label="BEST TIME" value={bestTime} />
          <StatCard label="SOLVES" value={solveCount.toLocaleString()} />
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          <button
            onClick={() => navigate('/play-cube')}
            className="btn-primary w-full h-14 flex items-center justify-center gap-3 text-lg"
          >
            <Play className="w-6 h-6" />
            PLAY GAME - LEVEL {currentLevel}
          </button>
          
          <button
            onClick={() => navigate('/solver')}
            className="btn-secondary w-full h-14 flex items-center justify-center gap-3 text-lg"
          >
            <Puzzle className="w-5 h-5" />
            FREE PLAY
          </button>
        </motion.div>
      </main>

      <BottomNav variant="home" />
    </div>
  );
};

export default Home;
