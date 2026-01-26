import { motion } from 'framer-motion';

interface FaceGridProps {
  faceColors: string[];
  selectedColor: string;
  onCellClick: (index: number) => void;
  size?: number;
}

const colorMap: Record<string, string> = {
  red: '#dc2626',
  white: '#f5f5f5',
  green: '#22c55e',
  orange: '#f97316',
  yellow: '#ffd700',
  blue: '#2563eb',
  empty: '#4a4a4a',
};

const FaceGrid = ({ faceColors, selectedColor, onCellClick, size = 3 }: FaceGridProps) => {
  const cellSize = size === 3 ? 80 : size === 2 ? 100 : 60;
  const gap = 4;
  
  return (
    <div
      className="grid mx-auto"
      style={{
        gridTemplateColumns: `repeat(${size}, ${cellSize}px)`,
        gap: `${gap}px`,
      }}
    >
      {faceColors.map((color, index) => (
        <motion.button
          key={index}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onCellClick(index)}
          className="cube-sticker"
          style={{
            width: cellSize,
            height: cellSize,
            backgroundColor: colorMap[color] || colorMap.empty,
            borderRadius: '8px',
          }}
          aria-label={`Cell ${index + 1}, color: ${color || 'empty'}`}
        />
      ))}
    </div>
  );
};

export default FaceGrid;
