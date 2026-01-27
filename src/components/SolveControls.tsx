import { motion } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Volume2, VolumeX } from 'lucide-react';

interface SolveControlsProps {
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStepForward: () => void;
  onStepBack: () => void;
  onRestart: () => void;
  currentStep: number;
  totalSteps: number;
  speed: 'slow' | 'normal' | 'fast';
  onSpeedChange: (speed: 'slow' | 'normal' | 'fast') => void;
  soundEnabled?: boolean;
  onSoundToggle?: () => void;
  learningMode?: boolean;
}

const speedLabels = {
  slow: '0.5x',
  normal: '1x',
  fast: '2x',
};

const SolveControls = ({
  isPlaying,
  onPlay,
  onPause,
  onStepForward,
  onStepBack,
  onRestart,
  currentStep,
  totalSteps,
  speed,
  onSpeedChange,
  soundEnabled = false,
  onSoundToggle,
  learningMode = false,
}: SolveControlsProps) => {
  const progress = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>Step {currentStep} of {totalSteps}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan to-hot-pink"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Main Controls */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <button
          onClick={onRestart}
          className="p-3 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
          aria-label="Restart"
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        <button
          onClick={onStepBack}
          disabled={currentStep <= 0}
          className="p-3 rounded-full bg-secondary hover:bg-secondary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Previous step"
        >
          <SkipBack className="w-5 h-5" />
        </button>

        <button
          onClick={isPlaying ? onPause : onPlay}
          className="p-5 rounded-full bg-gradient-to-r from-primary to-hot-pink transition-transform hover:scale-105"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-7 h-7" />
          ) : (
            <Play className="w-7 h-7 ml-1" />
          )}
        </button>

        <button
          onClick={onStepForward}
          disabled={currentStep >= totalSteps}
          className="p-3 rounded-full bg-secondary hover:bg-secondary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Next step"
        >
          <SkipForward className="w-5 h-5" />
        </button>

        {onSoundToggle && (
          <button
            onClick={onSoundToggle}
            className="p-3 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
            aria-label={soundEnabled ? 'Mute' : 'Unmute'}
          >
            {soundEnabled ? (
              <Volume2 className="w-5 h-5" />
            ) : (
              <VolumeX className="w-5 h-5" />
            )}
          </button>
        )}
      </div>

      {/* Speed Controls */}
      <div className="flex justify-center gap-2">
        {(['slow', 'normal', 'fast'] as const).map((s) => (
          <button
            key={s}
            onClick={() => onSpeedChange(s)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              speed === s
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary hover:bg-secondary/80'
            }`}
          >
            {speedLabels[s]}
            {learningMode && s === 'slow' && ' (Beginner)'}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SolveControls;
