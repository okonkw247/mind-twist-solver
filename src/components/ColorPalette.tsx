// Color Palette for Manual Mode
// Allows selecting colors to paint onto cube facelets

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const CUBE_COLORS = [
  { name: 'white', hex: '#f5f5f5', label: 'White (Top)' },
  { name: 'yellow', hex: '#ffd700', label: 'Yellow (Bottom)' },
  { name: 'red', hex: '#dc2626', label: 'Red (Right)' },
  { name: 'orange', hex: '#f97316', label: 'Orange (Left)' },
  { name: 'green', hex: '#22c55e', label: 'Green (Front)' },
  { name: 'blue', hex: '#2563eb', label: 'Blue (Back)' },
];

interface ColorPaletteProps {
  selectedColor: string;
  onSelectColor: (color: string) => void;
  colorCounts?: Record<string, number>;
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
}

const ColorPalette = ({
  selectedColor,
  onSelectColor,
  colorCounts,
  orientation = 'horizontal',
  size = 'md',
}: ColorPaletteProps) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-14 h-14',
  };
  
  const countSizeClasses = {
    sm: 'text-[10px] min-w-[14px] h-[14px]',
    md: 'text-xs min-w-[18px] h-[18px]',
    lg: 'text-sm min-w-[20px] h-[20px]',
  };
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${orientation === 'vertical' ? 'flex-col' : 'flex-row'} gap-2 p-3 rounded-2xl bg-card/80 backdrop-blur-sm border border-border`}
    >
      {CUBE_COLORS.map((color, index) => {
        const isSelected = selectedColor === color.name;
        const count = colorCounts?.[color.name] ?? 0;
        const isComplete = count === 9;
        const isOverflow = count > 9;
        
        return (
          <motion.button
            key={color.name}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelectColor(color.name)}
            className={`relative ${sizeClasses[size]} rounded-full transition-all duration-200 ${
              isSelected 
                ? 'ring-4 ring-primary ring-offset-2 ring-offset-background' 
                : 'hover:ring-2 hover:ring-white/30'
            }`}
            style={{ backgroundColor: color.hex }}
            title={color.label}
          >
            {/* Selected indicator */}
            {isSelected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <Check className={`${color.name === 'white' || color.name === 'yellow' ? 'text-gray-800' : 'text-white'} ${size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'}`} />
              </motion.div>
            )}
            
            {/* Count badge */}
            {colorCounts && (
              <div 
                className={`absolute -top-1 -right-1 ${countSizeClasses[size]} rounded-full flex items-center justify-center font-bold ${
                  isOverflow 
                    ? 'bg-destructive text-destructive-foreground animate-pulse' 
                    : isComplete 
                      ? 'bg-green-500 text-white' 
                      : 'bg-secondary text-foreground'
                }`}
              >
                {count}
              </div>
            )}
          </motion.button>
        );
      })}
    </motion.div>
  );
};

export default ColorPalette;
