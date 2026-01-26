import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crown, Check, X, Sparkles, Zap, Volume2, Wifi } from 'lucide-react';

const features = [
  { name: '2×2 & 3×3 Solver', free: true, premium: true },
  { name: '4×4 to 8×8 Solver', free: false, premium: true },
  { name: 'Camera Input', free: true, premium: true },
  { name: 'Manual Input', free: true, premium: true },
  { name: 'Step-by-Step Solution', free: true, premium: true },
  { name: 'AI Voice Guidance', free: false, premium: true },
  { name: 'Ad-Free Experience', free: false, premium: true },
  { name: 'Offline Mode', free: false, premium: true },
  { name: 'Speed Controls', free: false, premium: true },
  { name: 'VIP Support', free: false, premium: true },
];

const Premium = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Gradient Header */}
      <div className="gradient-main pt-16 pb-12 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10"
        >
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <Crown className="w-10 h-10 text-yellow-400" />
          </div>
          
          <h1 className="text-3xl font-bold text-white mb-2">Go Premium</h1>
          <p className="text-white/70">Unlock the full power of JSN Solving</p>
        </motion.div>
      </div>

      <main className="px-4 pb-8 -mt-4">
        {/* Premium Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-3 mb-8"
        >
          {[
            { icon: Zap, label: 'All Cube Sizes', desc: '2×2 to 8×8' },
            { icon: Volume2, label: 'AI Voice', desc: 'Step guidance' },
            { icon: Wifi, label: 'Offline Mode', desc: 'Solve anywhere' },
            { icon: Sparkles, label: 'No Ads', desc: 'Clean experience' },
          ].map((item, index) => (
            <div
              key={item.label}
              className="glass-card flex flex-col items-center text-center p-4"
            >
              <item.icon className="w-8 h-8 text-primary mb-2" />
              <h3 className="font-semibold text-sm">{item.label}</h3>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </motion.div>

        {/* Feature Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card mb-8"
        >
          <h2 className="text-lg font-semibold mb-4 text-center">Feature Comparison</h2>
          
          <div className="space-y-0">
            {/* Header */}
            <div className="flex items-center py-2 border-b border-border">
              <span className="flex-1 text-sm font-medium">Feature</span>
              <span className="w-16 text-center text-sm font-medium text-muted-foreground">Free</span>
              <span className="w-16 text-center text-sm font-medium text-primary">Pro</span>
            </div>
            
            {features.map((feature) => (
              <div key={feature.name} className="flex items-center py-3 border-b border-border/50 last:border-0">
                <span className="flex-1 text-sm">{feature.name}</span>
                <span className="w-16 flex justify-center">
                  {feature.free ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : (
                    <X className="w-5 h-5 text-muted-foreground/50" />
                  )}
                </span>
                <span className="w-16 flex justify-center">
                  <Check className="w-5 h-5 text-primary" />
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Pricing */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center mb-6"
        >
          <div className="mb-4">
            <span className="text-4xl font-bold gradient-text">$4.99</span>
            <span className="text-muted-foreground">/month</span>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Cancel anytime. 7-day free trial included.
          </p>
          
          <button className="btn-primary w-full max-w-sm h-14 text-lg">
            Start Free Trial
          </button>
        </motion.div>

        {/* Back Button */}
        <div className="text-center">
          <button
            onClick={() => navigate(-1)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Maybe later
          </button>
        </div>
      </main>
    </div>
  );
};

export default Premium;
