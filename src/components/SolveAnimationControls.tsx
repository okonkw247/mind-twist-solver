// Solve Animation Controls
// Play, pause, step forward/back, speed control

import { motion } from 'framer-motion';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  RotateCcw, 
  Gauge,
  Volume2,
  VolumeX
} from 'lucide-react';

export type AnimationSpeed = 'slow' | 'normal' | 'fast';

interface SolveAnimationControlsProps {
  isPlaying: boolean;
  currentStep: number;
  totalSteps: number;
  speed: AnimationSpeed;
  soundEnabled?: boolean;
  isAnimating?: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStepForward: () => void;
  onStepBack: () => void;
  onRestart: () => void;
  onSpeedChange: (speed: AnimationSpeed) => void;
  onSoundToggle?: () => void;
}

const SPEED_LABELS: Record<AnimationSpeed, string> = {
  slow: '0.5×',
  normal: '1×',
  fast: '2×',
};

const SolveAnimationControls = ({
  isPlaying,
  currentStep,
  totalSteps,
  speed,
  soundEnabled = false,
  isAnimating = false,
  onPlay,
  onPause,
  onStepForward,
  onStepBack,
  onRestart,
  onSpeedChange,
  onSoundToggle,
}: SolveAnimationControlsProps) => {
  const progress = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;
  const isComplete = currentStep >= totalSteps;
  
  const cycleSpeed = () => {
    const speeds: AnimationSpeed[] = ['slow', 'normal', 'fast'];
    const currentIndex = speeds.indexOf(speed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    onSpeedChange(speeds[nextIndex]);
  };
  
  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* Progress bar */}
      <div className="relative">
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-hot-pink"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
          <span>Step {currentStep}</span>
          <span>{totalSteps} moves</span>
        </div>
      </div>
      
      {/* Main controls */}
      <div className="flex items-center justify-center gap-2">
        {/* Step back */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onStepBack}
          disabled={currentStep === 0 || isAnimating}
          className="p-3 rounded-xl bg-secondary hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <SkipBack className="w-5 h-5" />
        </motion.button>
        
        {/* Play/Pause */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={isComplete ? onRestart : isPlaying ? onPause : onPlay}
          disabled={isAnimating && !isPlaying}
          className="p-5 rounded-full bg-gradient-to-r from-primary to-hot-pink text-white shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all disabled:opacity-50"
        >
          {isComplete ? (
            <RotateCcw className="w-7 h-7" />
          ) : isPlaying ? (
            <Pause className="w-7 h-7" />
          ) : (
            <Play className="w-7 h-7 ml-0.5" />
          )}
        </motion.button>
        
        {/* Step forward */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onStepForward}
          disabled={isComplete || isAnimating}
          className="p-3 rounded-xl bg-secondary hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <SkipForward className="w-5 h-5" />
        </motion.button>
      </div>
      
      {/* Secondary controls */}
      <div className="flex items-center justify-center gap-4">
        {/* Speed toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={cycleSpeed}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-all"
        >
          <Gauge className="w-4 h-4" />
          <span className="text-sm font-medium">{SPEED_LABELS[speed]}</span>
        </motion.button>
        
        {/* Restart */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRestart}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          <span className="text-sm font-medium">Restart</span>
        </motion.button>
        
        {/* Sound toggle */}
        {onSoundToggle && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onSoundToggle}
            className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-all"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4 text-muted-foreground" />
            )}
          </motion.button>
        )}
      </div>
    </div>
  );
};

export default SolveAnimationControls;
