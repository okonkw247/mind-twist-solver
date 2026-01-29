import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Play, Pause, RotateCcw, X, ChevronUp, ChevronDown, Shuffle } from 'lucide-react';
import AnimatedRubiksCube, { AnimatedCubeHandle } from '@/components/AnimatedRubiksCube';
import { generateScramble, parseSolution, CubeMove } from '@/lib/kociembaSolver';

type Difficulty = 'very_easy' | 'easy' | 'medium' | 'hard';

const difficulties: { id: Difficulty; label: string; scrambleLength: number; timeLimit: number }[] = [
  { id: 'very_easy', label: 'Very Easy', scrambleLength: 5, timeLimit: 180 },
  { id: 'easy', label: 'Easy', scrambleLength: 10, timeLimit: 300 },
  { id: 'medium', label: 'Medium', scrambleLength: 15, timeLimit: 600 },
  { id: 'hard', label: 'Hard', scrambleLength: 20, timeLimit: 900 },
];

// Move button configuration
const moveButtons = [
  { move: 'U', label: 'U' },
  { move: "U'", label: "U'" },
  { move: 'U2', label: 'U2' },
  { move: 'D', label: 'D' },
  { move: "D'", label: "D'" },
  { move: 'D2', label: 'D2' },
  { move: 'L', label: 'L' },
  { move: "L'", label: "L'" },
  { move: 'L2', label: 'L2' },
  { move: 'R', label: 'R' },
  { move: "R'", label: "R'" },
  { move: 'R2', label: 'R2' },
  { move: 'F', label: 'F' },
  { move: "F'", label: "F'" },
  { move: 'F2', label: 'F2' },
  { move: 'B', label: 'B' },
  { move: "B'", label: "B'" },
  { move: 'B2', label: 'B2' },
];

const PlayCube = () => {
  const navigate = useNavigate();
  const cubeRef = useRef<AnimatedCubeHandle>(null);
  
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [selectedMinutes, setSelectedMinutes] = useState(2);
  const [selectedSeconds, setSelectedSeconds] = useState(0);
  const [timeLimit, setTimeLimit] = useState(120);
  const [timeRemaining, setTimeRemaining] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [scramble, setScramble] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [gameStarted, setGameStarted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isScrambling, setIsScrambling] = useState(false);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);

  // Execute a single move via the shared cube ref
  const executeMove = useCallback(async (moveNotation: string) => {
    if (!cubeRef.current || isAnimating) return;
    
    const moves = parseSolution(moveNotation);
    if (moves.length === 0) return;
    
    const move = moves[0];
    setIsAnimating(true);
    await cubeRef.current.executeMove(move, 400);
    setMoveHistory(prev => [...prev, moveNotation]);
    setIsAnimating(false);
  }, [isAnimating]);

  // Execute scramble sequence
  const executeScramble = useCallback(async (scrambleString: string) => {
    if (!cubeRef.current) return;
    
    setIsScrambling(true);
    const moves = parseSolution(scrambleString);
    
    for (const move of moves) {
      await cubeRef.current.executeMove(move, 200);
    }
    
    setIsScrambling(false);
    setGameStarted(true);
  }, []);

  // Generate and optionally execute scramble
  const generateNewScramble = useCallback((autoExecute: boolean = false) => {
    const diff = difficulties.find(d => d.id === difficulty);
    const newScramble = generateScramble(diff?.scrambleLength || 10);
    setScramble(newScramble);
    setTimeRemaining(timeLimit);
    setGameStarted(false);
    setMoveHistory([]);
    cubeRef.current?.reset();
    
    if (autoExecute) {
      setTimeout(() => executeScramble(newScramble), 100);
    }
  }, [difficulty, timeLimit, executeScramble]);

  useEffect(() => {
    generateNewScramble(false);
  }, []);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPlaying && timeRemaining > 0 && gameStarted) {
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
  }, [isPlaying, timeRemaining, gameStarted]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = async () => {
    if (!gameStarted && scramble) {
      await executeScramble(scramble);
    }
    setIsPlaying(true);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setGameStarted(false);
    setMoveHistory([]);
    cubeRef.current?.reset();
    generateNewScramble(false);
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

      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* Timer Display */}
        <div className="flex justify-between items-center px-6 py-4">
          <div className="text-sm text-muted-foreground">
            Moves: <span className="font-mono font-bold">{moveHistory.length}</span>
          </div>
          <button
            onClick={() => setShowTimeModal(true)}
            className="relative w-20 h-20"
          >
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
                stroke="hsl(var(--primary))"
                strokeWidth="6"
                strokeDasharray={`${progress * 2.83} 283`}
                className="transition-all duration-1000"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-mono font-bold">
              {formatTime(timeRemaining)}
            </span>
          </button>
        </div>

        {/* 3D Animated Cube */}
        <div className="flex items-center justify-center py-4">
          <Suspense fallback={
            <div className="w-64 h-64 flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          }>
            <AnimatedRubiksCube 
              ref={cubeRef} 
              size={240} 
            />
          </Suspense>
        </div>

        {/* Scramble Display */}
        {scramble && (
          <div className="px-4 py-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">Scramble:</p>
              <button
                onClick={() => generateNewScramble(true)}
                disabled={isScrambling || isAnimating}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 disabled:opacity-50"
              >
                <Shuffle className="w-3 h-3" />
                New
              </button>
            </div>
            <p className="font-mono text-sm bg-secondary/50 rounded-lg p-2 text-center">
              {scramble}
            </p>
          </div>
        )}

        {/* Move Buttons Grid */}
        <div className="px-4 py-2">
          <p className="text-xs text-muted-foreground mb-2 text-center">
            {isScrambling ? 'Scrambling...' : gameStarted ? 'Tap to rotate faces' : 'Start to begin'}
          </p>
          <div className="grid grid-cols-6 gap-1.5">
            {moveButtons.map(({ move, label }) => (
              <button
                key={move}
                onClick={() => executeMove(move)}
                disabled={!gameStarted || isAnimating || isScrambling}
                className="h-10 rounded-lg bg-secondary hover:bg-secondary/80 font-mono text-sm font-bold 
                         disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 mt-auto">
          <div className="flex justify-center gap-4 mb-4">
            <button
              onClick={handleReset}
              disabled={isScrambling}
              className="p-3 rounded-full bg-secondary hover:bg-secondary/80 transition-colors disabled:opacity-50"
              aria-label="Reset"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              onClick={isPlaying ? () => setIsPlaying(false) : handleStart}
              disabled={isScrambling || isAnimating}
              className="px-10 py-3 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 font-bold 
                       transition-transform hover:scale-105 disabled:opacity-50"
            >
              {isScrambling ? (
                'Scrambling...'
              ) : isPlaying ? (
                <>
                  <Pause className="w-4 h-4 inline-block mr-2" />
                  Pause
                </>
              ) : gameStarted ? (
                <>
                  <Play className="w-4 h-4 inline-block mr-2" />
                  Resume
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 inline-block mr-2" />
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
                onClick={() => {
                  setDifficulty(diff.id);
                  handleReset();
                }}
                disabled={isScrambling || gameStarted}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all disabled:opacity-50 ${
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
                className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 font-bold text-lg"
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
