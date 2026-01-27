import { Suspense, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Play, Pause, RotateCcw, X, ChevronUp, ChevronDown } from 'lucide-react';
import RubiksCube3D from '@/components/RubiksCube3D';
import { generateScramble, parseSolution } from '@/lib/cubeSolver';

type Difficulty = 'very_easy' | 'easy' | 'medium' | 'hard';

const difficulties: { id: Difficulty; label: string; scrambleLength: number; timeLimit: number }[] = [
  { id: 'very_easy', label: 'Very Easy', scrambleLength: 5, timeLimit: 180 },
  { id: 'easy', label: 'Easy', scrambleLength: 10, timeLimit: 300 },
  { id: 'medium', label: 'Medium', scrambleLength: 15, timeLimit: 600 },
  { id: 'hard', label: 'Hard', scrambleLength: 20, timeLimit: 900 },
];

const PlayCube = () => {
  const navigate = useNavigate();
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [selectedMinutes, setSelectedMinutes] = useState(2);
  const [selectedSeconds, setSelectedSeconds] = useState(0);
  const [timeLimit, setTimeLimit] = useState(120); // in seconds
  const [timeRemaining, setTimeRemaining] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [scramble, setScramble] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [gameStarted, setGameStarted] = useState(false);

  // Generate scramble based on difficulty
  const generateNewScramble = useCallback(() => {
    const diff = difficulties.find(d => d.id === difficulty);
    const newScramble = generateScramble(diff?.scrambleLength || 10);
    setScramble(newScramble);
    setTimeRemaining(timeLimit);
    setGameStarted(false);
  }, [difficulty, timeLimit]);

  useEffect(() => {
    generateNewScramble();
  }, [generateNewScramble]);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPlaying && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setIsPlaying(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isPlaying, timeRemaining]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    if (!gameStarted) {
      setGameStarted(true);
    }
    setIsPlaying(true);
  };

  const handleTimeConfirm = () => {
    const totalSeconds = selectedMinutes * 60 + selectedSeconds;
    setTimeLimit(totalSeconds);
    setTimeRemaining(totalSeconds);
    setShowTimeModal(false);
  };

  const progress = (timeRemaining / timeLimit) * 100;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-4 px-4 py-3 border-b border-border">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-secondary transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold flex-1 text-center">Play Cube</h1>
        <div className="w-10" />
      </header>

      <main className="flex-1 flex flex-col">
        {/* Timer Display */}
        <div className="flex justify-end px-6 py-4">
          <button
            onClick={() => setShowTimeModal(true)}
            className="relative w-24 h-24"
          >
            {/* Circular Progress */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="hsl(var(--secondary))"
                strokeWidth="6"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth="6"
                strokeDasharray={`${progress * 2.83} 283`}
                className="transition-all duration-1000"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-lg font-mono">
              {formatTime(timeRemaining)}
            </span>
          </button>
        </div>

        {/* 3D Cube */}
        <div className="flex-1 flex items-center justify-center">
          <Suspense fallback={
            <div className="w-64 h-64 flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          }>
            <RubiksCube3D size={280} autoRotate={!gameStarted} />
          </Suspense>
        </div>

        {/* Scramble Display */}
        {scramble && (
          <div className="px-6 py-4">
            <p className="text-sm text-muted-foreground mb-2">Scramble:</p>
            <p className="font-mono text-lg bg-secondary/50 rounded-lg p-3 text-center">
              {scramble}
            </p>
          </div>
        )}

        {/* Controls */}
        <div className="p-6">
          <div className="flex justify-center gap-4 mb-6">
            <button
              onClick={generateNewScramble}
              className="p-4 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
              aria-label="New scramble"
            >
              <RotateCcw className="w-6 h-6" />
            </button>

            <button
              onClick={isPlaying ? () => setIsPlaying(false) : handleStart}
              className="px-12 py-4 rounded-full bg-gradient-to-r from-purple to-cyan font-bold text-lg transition-transform hover:scale-105"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-5 h-5 inline-block mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 inline-block mr-2" />
                  Start
                </>
              )}
            </button>
          </div>

          {/* Difficulty Selector */}
          <div className="flex justify-center gap-2 flex-wrap">
            {difficulties.map((diff) => (
              <button
                key={diff.id}
                onClick={() => setDifficulty(diff.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  difficulty === diff.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary hover:bg-secondary/80'
                }`}
              >
                {diff.label}
              </button>
            ))}
          </div>
        </div>
      </main>

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
              className="w-full max-w-sm bg-card rounded-2xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Select Time</h2>
                <button onClick={() => setShowTimeModal(false)}>
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex justify-center items-center gap-4 mb-8">
                {/* Minutes */}
                <div className="flex flex-col items-center">
                  <span className="text-sm text-muted-foreground mb-2">Min</span>
                  <div className="flex flex-col items-center gap-2">
                    <button
                      onClick={() => setSelectedMinutes(prev => Math.min(prev + 1, 59))}
                      className="p-2 rounded-lg hover:bg-secondary"
                    >
                      <ChevronUp className="w-5 h-5" />
                    </button>
                    <span className="text-4xl font-bold w-16 text-center">
                      {selectedMinutes}
                    </span>
                    <button
                      onClick={() => setSelectedMinutes(prev => Math.max(prev - 1, 0))}
                      className="p-2 rounded-lg hover:bg-secondary"
                    >
                      <ChevronDown className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <span className="text-4xl font-bold">:</span>

                {/* Seconds */}
                <div className="flex flex-col items-center">
                  <span className="text-sm text-muted-foreground mb-2">Sec</span>
                  <div className="flex flex-col items-center gap-2">
                    <button
                      onClick={() => setSelectedSeconds(prev => prev >= 55 ? 0 : prev + 5)}
                      className="p-2 rounded-lg hover:bg-secondary"
                    >
                      <ChevronUp className="w-5 h-5" />
                    </button>
                    <span className="text-4xl font-bold w-16 text-center">
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
              </div>

              <button
                onClick={handleTimeConfirm}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan to-blue font-bold text-lg"
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
