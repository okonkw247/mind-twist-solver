import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Loading assets...');

  useEffect(() => {
    const texts = [
      'Loading assets...',
      'Initializing cube...',
      'Preparing solver...',
      'Almost ready...',
    ];
    
    const interval = setInterval(() => {
      setLoadingProgress(prev => {
        const newProgress = prev + Math.random() * 8 + 2;
        
        if (newProgress >= 25 && newProgress < 50) setLoadingText(texts[1]);
        else if (newProgress >= 50 && newProgress < 75) setLoadingText(texts[2]);
        else if (newProgress >= 75) setLoadingText(texts[3]);
        
        if (newProgress >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 400);
          return 100;
        }
        return newProgress;
      });
    }, 80);

    return () => clearInterval(interval);
  }, [onComplete]);

  // Rainbow progress bar colors
  const progressColors = [
    { color: 'hsl(0, 0%, 95%)', width: 20 },   // White
    { color: 'hsl(48, 100%, 50%)', width: 20 }, // Yellow
    { color: 'hsl(30, 100%, 50%)', width: 20 }, // Orange
    { color: 'hsl(0, 85%, 50%)', width: 20 },   // Red
    { color: 'hsl(230, 15%, 40%)', width: 20 }, // Gray (remaining)
  ];

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Decorative cube logo */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0, rotateY: -20 }}
        animate={{ scale: 1, opacity: 1, rotateY: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="mb-12 relative"
      >
        {/* Glowing ring */}
        <div className="absolute inset-0 w-48 h-48 rounded-full border-2 border-primary/30 animate-pulse" 
             style={{ transform: 'translate(-50%, -50%) rotate(-20deg)', left: '50%', top: '50%' }} />
        
        {/* Abstract cube representation */}
        <div className="w-48 h-48 relative flex items-center justify-center">
          <div className="absolute w-32 h-32 bg-card/80 rounded-3xl transform rotate-12 border border-primary/20" />
          <div className="relative grid grid-cols-2 gap-2 p-4">
            <div className="w-10 h-10 rounded-lg bg-cube-red shadow-lg transform -rotate-6" />
            <div className="w-10 h-10 rounded-lg bg-cube-orange shadow-lg transform rotate-3" />
            <div className="w-10 h-10 rounded-lg bg-cube-yellow shadow-lg transform rotate-6" />
            <div className="w-10 h-10 rounded-lg bg-cube-green shadow-lg transform -rotate-3" />
          </div>
        </div>
      </motion.div>

      {/* App Name */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="text-4xl md:text-5xl font-bold text-foreground mb-2 tracking-widest"
      >
        JSN
      </motion.h1>
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="text-4xl md:text-5xl font-bold text-foreground mb-4 tracking-widest"
      >
        SOLVER
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="text-primary text-sm tracking-[0.3em] uppercase mb-16"
      >
        Master the Puzzle
      </motion.p>

      {/* Loading Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="w-72 px-4"
      >
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">System Status</span>
        </div>
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm text-foreground">{loadingText}</span>
          <span className="text-sm text-foreground font-mono">{Math.round(loadingProgress)}%</span>
        </div>
        
        {/* Rainbow progress bar */}
        <div className="rainbow-progress bg-muted">
          {progressColors.map((segment, index) => {
            const segmentProgress = Math.min(
              Math.max((loadingProgress - index * 20) / 20, 0),
              1
            ) * segment.width;
            
            return (
              <div
                key={index}
                className="segment"
                style={{
                  backgroundColor: segment.color,
                  width: `${segmentProgress}%`,
                }}
              />
            );
          })}
        </div>
      </motion.div>

      {/* Version info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="absolute bottom-8 text-center"
      >
        <p className="text-xs text-muted-foreground tracking-wider">
          PWA EDITION V1.0.0 • PUZZLE ENGINE 3.0
        </p>
      </motion.div>
    </motion.div>
  );
};

export default SplashScreen;
