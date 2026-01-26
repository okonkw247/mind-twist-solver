import { motion } from 'framer-motion';

interface ColorPickerProps {
  selectedColor: string;
  onSelectColor: (color: string) => void;
}

const cubeColors = [
  { name: 'red', color: '#dc2626', label: 'Red' },
  { name: 'white', color: '#f5f5f5', label: 'White' },
  { name: 'green', color: '#22c55e', label: 'Green' },
  { name: 'orange', color: '#f97316', label: 'Orange' },
  { name: 'yellow', color: '#ffd700', label: 'Yellow' },
  { name: 'blue', color: '#2563eb', label: 'Blue' },
];

const ColorPicker = ({ selectedColor, onSelectColor }: ColorPickerProps) => {
  return (
    <div className="w-full">
      <p className="text-lg text-white mb-4 text-center font-medium">Pick a Color</p>
      
      <div className="flex justify-center gap-4 flex-wrap">
        {cubeColors.map(({ name, color, label }) => {
          const isSelected = selectedColor === name;
          
          return (
            <motion.button
              key={name}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onSelectColor(name)}
              className={`color-picker-btn ${isSelected ? 'selected' : ''}`}
              style={{ backgroundColor: color }}
              aria-label={`Select ${label}`}
              title={label}
            >
              {isSelected && (
                <motion.div
                  layoutId="colorIndicator"
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-1 rounded-full bg-hot-pink"
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default ColorPicker;
