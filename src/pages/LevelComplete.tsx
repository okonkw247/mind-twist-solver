import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { X, Timer, User, Trophy, Star, Zap, Box } from 'lucide-react';

const LevelComplete = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { level = 1, time = '00:45', moves = 28, stars = 2, rank = 'SILVER' } = location.state || {};

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4 safe-top">
        <button
          onClick={() => navigate('/home')}
          className="btn-icon"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
          <Zap className="w-4 h-4 absolute -top-1 -right-1 text-primary" />
        </button>
        
        <h1 className="text-lg font-bold tracking-wider">JSN SOLVER</h1>
        
        <div className="w-12" />
      </header>

      <main className="flex-1 px-4 flex flex-col items-center justify-center">
        {/* Level Complete Title */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold mb-2">LEVEL {level}</h1>
          <h2 className="text-4xl font-bold flex items-center justify-center gap-2">
            COMPLETE
            <Star className="w-6 h-6 text-gold fill-gold" />
          </h2>
        </motion.div>

        {/* Trophy Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative mb-8"
        >
          {/* Lightning decorations */}
          <Zap className="absolute -top-4 -left-8 w-6 h-6 text-primary animate-pulse" />
          <Zap className="absolute bottom-0 -right-4 w-5 h-5 text-primary animate-pulse" style={{ animationDelay: '0.5s' }} />
          
          {/* Main circle */}
          <div className="w-32 h-32 rounded-full border-4 border-primary flex items-center justify-center"
               style={{ boxShadow: '0 0 40px hsl(var(--primary) / 0.3)' }}>
            <Box className="w-12 h-12" />
          </div>
        </motion.div>

        {/* Stars */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex gap-4 mb-10"
        >
          {[1, 2, 3].map((star) => (
            <motion.div
              key={star}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.5 + star * 0.15, type: 'spring' }}
            >
              <Star
                className={`w-12 h-12 ${
                  star <= stars
                    ? 'text-gold fill-gold'
                    : 'text-muted-foreground'
                }`}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Stats Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="w-full max-w-sm glass-card"
        >
          <div className="space-y-0">
            <div className="flex items-center justify-between py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <Timer className="w-5 h-5 text-muted-foreground" />
                <span className="text-muted-foreground">Time</span>
              </div>
              <span className="font-bold text-lg">{time}</span>
            </div>
            
            <div className="flex items-center justify-between py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-muted-foreground" />
                <span className="text-muted-foreground">Moves</span>
              </div>
              <span className="font-bold text-lg">{moves}</span>
            </div>
            
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <Trophy className="w-5 h-5 text-muted-foreground" />
                <span className="text-muted-foreground">Rank</span>
              </div>
              <span className="font-bold text-lg italic text-primary">{rank}</span>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Next Level Button */}
      <div className="px-4 pb-8 safe-bottom">
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          onClick={() => navigate('/play-cube', { state: { level: level + 1 } })}
          className="btn-primary w-full h-14 text-lg font-bold"
        >
          NEXT LEVEL
        </motion.button>
      </div>
    </div>
  );
};

export default LevelComplete;
