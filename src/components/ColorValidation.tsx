import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface ColorCount {
  color: string;
  count: number;
  expected: number;
}

interface ColorValidationProps {
  colorCounts: ColorCount[];
  onDismiss: () => void;
  visible: boolean;
}

const colorDisplayNames: Record<string, string> = {
  red: 'Red',
  white: 'White',
  green: 'Green',
  orange: 'Orange',
  yellow: 'Yellow',
  blue: 'Blue',
};

const colorHexMap: Record<string, string> = {
  red: '#dc2626',
  white: '#f5f5f5',
  green: '#22c55e',
  orange: '#f97316',
  yellow: '#ffd700',
  blue: '#2563eb',
};

const ColorValidation = ({ colorCounts, onDismiss, visible }: ColorValidationProps) => {
  const invalidColors = colorCounts.filter(c => c.count !== c.expected && c.count > 0);

  if (!visible || invalidColors.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-20 left-4 right-4 z-40"
      >
        <div className="bg-destructive/90 backdrop-blur-sm rounded-2xl p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold mb-1">Invalid Color Count</h3>
              {invalidColors.map((c) => (
                <p key={c.color} className="text-sm flex items-center gap-2">
                  <span
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: colorHexMap[c.color] }}
                  />
                  Rubik's cube has only {c.expected} {colorDisplayNames[c.color]} faces.
                  You have {c.count}.
                </p>
              ))}
              <p className="text-sm mt-2 opacity-80">
                Please rescan or reselect.
              </p>
            </div>
            <button
              onClick={onDismiss}
              className="p-1 rounded-lg hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ColorValidation;
