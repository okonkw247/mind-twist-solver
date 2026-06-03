/**
 * AdvancedSolverModal — Runs Kociemba on the current cube state and offers
 * the user one or more solutions. Tap a row to apply that sequence.
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Eye, Loader2, X, AlertTriangle } from 'lucide-react';
import { getSolutionMoves } from '@/lib/kociembaSolver';

interface Solution {
  moves: string[];
  label: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  faceArrays: Record<string, string[]>;
  onApply: (moves: string[]) => void;
  onEditColors?: () => void;
}

export default function AdvancedSolverModal({
  open,
  onClose,
  faceArrays,
  onApply,
  onEditColors,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setSolutions([]);
    setError(null);

    (async () => {
      const result = await getSolutionMoves(faceArrays);
      if (cancelled) return;
      if (!result.success || !result.moves) {
        setError(result.error || 'Could not solve this cube.');
        setLoading(false);
        return;
      }
      const moves = result.moves.map((m) => m.notation);
      // Only the primary Kociemba solution is reliable; show a single row.
      setSolutions([{ moves, label: `${moves.length} Moves` }]);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, faceArrays]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-md z-50 rounded-2xl bg-card border border-border p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Box className="w-6 h-6" />
                <h2 className="text-lg font-bold">Advanced Solver</h2>
              </div>
              <button onClick={onClose} className="btn-icon" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-xl bg-secondary/40 px-4 py-3 mb-3 flex items-center gap-3">
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              ) : error ? (
                <AlertTriangle className="w-5 h-5 text-destructive" />
              ) : (
                <div className="w-2.5 h-2.5 rounded-full bg-primary" />
              )}
              <span className="text-sm font-medium">
                {loading ? 'Solver Running..' : error ? 'Solver Error' : 'Solution Ready'}
              </span>
            </div>

            {error ? (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                {onEditColors && (
                  <button
                    onClick={() => {
                      onEditColors();
                      onClose();
                    }}
                    className="btn-secondary px-5 py-2 text-sm"
                  >
                    Edit colors
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-1 min-h-[120px]">
                {solutions.map((sol, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      onApply(sol.moves);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between px-4 py-4 rounded-lg hover:bg-secondary/60 transition-colors border-b border-border last:border-b-0"
                  >
                    <span className="font-bold text-base">{sol.label}</span>
                    <Eye className="w-5 h-5 text-foreground" />
                  </button>
                ))}
                {!loading && solutions.length === 0 && !error && (
                  <p className="text-center text-sm text-muted-foreground py-6">
                    No moves needed — cube is solved.
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
