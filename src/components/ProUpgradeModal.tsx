import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Check } from 'lucide-react';

interface ProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const features = [
  'All 57 OLL & 21 PLL Algorithms',
  '3D Animated Step-by-Step Solver',
  'Ad-Free Personalized Experience',
];

const ProUpgradeModal = ({ isOpen, onClose }: ProUpgradeModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-50"
          >
            {/* Handle */}
            <div className="flex justify-center py-3">
              <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
            </div>
            
            <div className="bg-card rounded-t-3xl px-6 pb-8 pt-4">
              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center">
                  <Star className="w-10 h-10 text-primary" fill="currentColor" />
                </div>
              </div>
              
              {/* Title */}
              <h2 className="text-2xl font-bold text-center mb-2">
                Unlock Pro Features
              </h2>
              <p className="text-muted-foreground text-center mb-8">
                Master advanced techniques and solve any cube in under 10 seconds.
              </p>
              
              {/* Features */}
              <div className="space-y-4 mb-8">
                {features.map((feature, index) => (
                  <motion.div
                    key={feature}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + index * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-medium">{feature}</span>
                  </motion.div>
                ))}
              </div>
              
              {/* CTA Button */}
              <button className="w-full py-4 rounded-2xl bg-primary font-bold text-lg mb-4">
                Upgrade Now – $4.99
              </button>
              
              {/* Restore */}
              <button 
                onClick={onClose}
                className="w-full text-center text-muted-foreground py-2"
              >
                Restore Purchases
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ProUpgradeModal;
