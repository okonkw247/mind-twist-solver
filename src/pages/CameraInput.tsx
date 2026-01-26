import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Camera, AlertCircle } from 'lucide-react';

const CameraInput = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">Camera Input</h1>
        </div>
      </header>

      <main className="flex-1 pt-16 pb-8 px-4 flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-sm"
        >
          {/* Camera Icon */}
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-cyan/20 to-magenta/20 flex items-center justify-center">
            <Camera className="w-12 h-12 text-primary" />
          </div>

          <h2 className="text-2xl font-bold mb-3">Camera Access Required</h2>
          
          <p className="text-muted-foreground mb-6">
            Allow camera access to scan your Rubik's Cube automatically. Point your camera at each face to capture the colors.
          </p>

          <button
            onClick={() => {
              // In a real implementation, this would request camera permissions
              alert('Camera feature coming soon! Use Manual Input for now.');
            }}
            className="btn-primary w-full h-14 mb-4"
          >
            Enable Camera
          </button>

          <button
            onClick={() => navigate('/manual-input')}
            className="btn-secondary w-full h-14"
          >
            Use Manual Input Instead
          </button>

          <div className="mt-8 p-4 rounded-xl bg-secondary/50 border border-border">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground text-left">
                For best results, ensure good lighting and hold the cube steady while scanning each face.
              </p>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default CameraInput;
