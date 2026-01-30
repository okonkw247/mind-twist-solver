// Camera Controls Component
// Zoom, reset, and view presets for the 3D cube

import { motion } from 'framer-motion';
import { ZoomIn, ZoomOut, RotateCcw, Eye, Maximize } from 'lucide-react';

interface CameraControlsProps {
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onReset?: () => void;
  onViewFront?: () => void;
  onViewTop?: () => void;
  onFullscreen?: () => void;
  compact?: boolean;
}

const CameraControls = ({
  onZoomIn,
  onZoomOut,
  onReset,
  onViewFront,
  onViewTop,
  onFullscreen,
  compact = false,
}: CameraControlsProps) => {
  const buttonClass = compact
    ? 'p-2 rounded-lg bg-secondary/80 backdrop-blur-sm hover:bg-secondary text-foreground transition-all'
    : 'p-3 rounded-xl bg-secondary/80 backdrop-blur-sm hover:bg-secondary text-foreground transition-all';
  
  const iconClass = compact ? 'w-4 h-4' : 'w-5 h-5';
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex ${compact ? 'flex-row gap-1' : 'flex-col gap-2'}`}
    >
      {onZoomIn && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onZoomIn}
          className={buttonClass}
          title="Zoom In"
        >
          <ZoomIn className={iconClass} />
        </motion.button>
      )}
      
      {onZoomOut && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onZoomOut}
          className={buttonClass}
          title="Zoom Out"
        >
          <ZoomOut className={iconClass} />
        </motion.button>
      )}
      
      {onReset && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onReset}
          className={buttonClass}
          title="Reset Camera"
        >
          <RotateCcw className={iconClass} />
        </motion.button>
      )}
      
      {onViewFront && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onViewFront}
          className={buttonClass}
          title="Front View"
        >
          <Eye className={iconClass} />
        </motion.button>
      )}
      
      {onFullscreen && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onFullscreen}
          className={buttonClass}
          title="Fullscreen"
        >
          <Maximize className={iconClass} />
        </motion.button>
      )}
    </motion.div>
  );
};

export default CameraControls;
