import { useState, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, Hand, Sparkles } from 'lucide-react';
import Header from '@/components/Header';
import CubeSizeSelector from '@/components/CubeSizeSelector';
import RubiksCube3D from '@/components/RubiksCube3D';

const Index = () => {
  const navigate = useNavigate();
  const [selectedSize, setSelectedSize] = useState(3);

  return (
    <div className="min-h-screen gradient-main relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-60 h-60 rounded-full bg-cyan/20 blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 rounded-full bg-magenta/20 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-purple/10 blur-3xl" />
      </div>
      
      <Header />
      
      <main className="relative z-10 pt-20 pb-8 px-4 min-h-screen flex flex-col items-center">
        {/* 3D Cube */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-6 animate-float"
        >
          <Suspense fallback={
            <div className="w-[200px] h-[200px] flex items-center justify-center">
              <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          }>
            <RubiksCube3D size={200} autoRotate />
          </Suspense>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center gap-2">
            JSN Solving
            <Sparkles className="w-6 h-6 text-yellow-300" />
          </h1>
          <p className="text-white/70 text-sm">Solve any Rubik's Cube in seconds</p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="w-full max-w-md space-y-4 mb-8"
        >
          <button
            onClick={() => navigate('/camera')}
            className="btn-primary w-full flex items-center justify-center gap-3 text-lg h-16"
          >
            <Camera className="w-6 h-6" />
            Camera Input
          </button>

          <div className="flex items-center gap-4 py-2">
            <div className="flex-1 border-t-2 border-dashed border-white/30" />
            <span className="text-white/60 text-sm font-medium">Or</span>
            <div className="flex-1 border-t-2 border-dashed border-white/30" />
          </div>

          <button
            onClick={() => navigate('/manual-input')}
            className="btn-primary w-full flex items-center justify-center gap-3 text-lg h-16"
          >
            <Hand className="w-6 h-6" />
            Manual Input
          </button>
        </motion.div>

        {/* Cube Size Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="w-full max-w-md glass-card"
        >
          <CubeSizeSelector 
            selectedSize={selectedSize} 
            onSelectSize={setSelectedSize} 
          />
        </motion.div>

        {/* Premium Badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 text-center"
        >
          <button
            onClick={() => navigate('/premium')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 text-sm hover:bg-white/20 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-yellow-400" />
            Unlock all features with Premium
          </button>
        </motion.div>
      </main>
    </div>
  );
};

export default Index;
