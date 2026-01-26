import { Lock } from 'lucide-react';
import { motion } from 'framer-motion';

interface CubeSizeSelectorProps {
  selectedSize: number;
  onSelectSize: (size: number) => void;
}

const cubeSizes = [
  { size: 2, label: '2×2', free: true },
  { size: 3, label: '3×3', free: true },
  { size: 4, label: '4×4', free: false },
  { size: 5, label: '5×5', free: false },
  { size: 6, label: '6×6', free: false },
  { size: 7, label: '7×7', free: false },
  { size: 8, label: '8×8', free: false },
];

const CubeSizeSelector = ({ selectedSize, onSelectSize }: CubeSizeSelectorProps) => {
  return (
    <div className="w-full">
      <h3 className="text-sm text-muted-foreground mb-3 text-center">Select Cube Size</h3>
      
      <div className="flex gap-2 overflow-x-auto pb-2 px-1 scrollbar-hide">
        {cubeSizes.map(({ size, label, free }) => {
          const isSelected = selectedSize === size;
          
          return (
            <motion.button
              key={size}
              whileHover={{ scale: free ? 1.05 : 1 }}
              whileTap={{ scale: free ? 0.95 : 1 }}
              onClick={() => free && onSelectSize(size)}
              disabled={!free}
              className={`relative flex-shrink-0 px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-200 min-w-[60px] ${
                isSelected
                  ? 'bg-gradient-to-r from-magenta to-hot-pink text-white shadow-lg'
                  : free
                  ? 'bg-secondary text-white hover:bg-secondary/80'
                  : 'bg-secondary/50 text-muted-foreground cursor-not-allowed'
              }`}
            >
              <span className={!free ? 'opacity-50' : ''}>{label}</span>
              {!free && (
                <Lock className="absolute -top-1 -right-1 w-4 h-4 text-primary bg-background rounded-full p-0.5" />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default CubeSizeSelector;
