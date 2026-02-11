import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Volume2, 
  Music, 
  Vibrate, 
  Mail, 
  Lock, 
  Zap, 
  Trash2, 
  LogOut,
  Info,
  ChevronRight
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';

const Settings = () => {
  const navigate = useNavigate();
  const [soundFX, setSoundFX] = useState(true);
  const [music, setMusic] = useState(false);
  const [haptic, setHaptic] = useState(true);
  const [offlineMode, setOfflineMode] = useState(true);

  const ToggleSwitch = ({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-12 h-7 rounded-full transition-colors ${
        enabled ? 'bg-primary' : 'bg-muted'
      }`}
    >
      <motion.div
        className="absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-md"
        animate={{ x: enabled ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  );

  const SettingRow = ({ 
    icon: Icon, 
    iconColor = 'text-primary',
    label, 
    rightContent,
    onClick 
  }: { 
    icon: React.ElementType; 
    iconColor?: string;
    label: string; 
    rightContent?: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 py-4 hover:bg-secondary/50 transition-colors rounded-lg px-2 -mx-2"
    >
      <div className={`w-10 h-10 rounded-xl bg-secondary flex items-center justify-center ${iconColor}`}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="flex-1 text-left font-medium">{label}</span>
      {rightContent}
    </button>
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="flex items-center gap-4 px-4 py-4 safe-top">
        <button
          onClick={() => navigate(-1)}
          className="btn-icon"
          aria-label="Go back"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold tracking-wider flex-1 text-center pr-10">Settings</h1>
      </header>

      <main className="px-4">
        {/* App Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center py-8"
        >
          <div className="w-24 h-24 rounded-2xl bg-primary/20 border-2 border-primary flex items-center justify-center mb-4"
               style={{ boxShadow: '0 0 40px hsl(var(--primary) / 0.3)' }}>
            <div className="w-12 h-12 border-4 border-primary rounded-lg relative">
              <div className="absolute inset-1 border-2 border-primary/50 rounded" />
            </div>
          </div>
          <h2 className="text-2xl font-bold">JSN Solver</h2>
          <span className="text-primary text-sm font-medium">v1.2</span>
        </motion.div>

        {/* Game Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card mb-4"
        >
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Game Settings
          </h3>
          <div className="space-y-1">
            <SettingRow 
              icon={Volume2} 
              label="Sound FX" 
              rightContent={<ToggleSwitch enabled={soundFX} onChange={setSoundFX} />}
            />
            <SettingRow 
              icon={Music} 
              label="Music" 
              rightContent={<ToggleSwitch enabled={music} onChange={setMusic} />}
            />
            <SettingRow 
              icon={Vibrate} 
              label="Haptic Feedback" 
              rightContent={<ToggleSwitch enabled={haptic} onChange={setHaptic} />}
            />
          </div>
        </motion.div>

        {/* Account */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card mb-4"
        >
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Account
          </h3>
          <div className="space-y-1">
            <SettingRow 
              icon={Mail} 
              label="Link Email" 
              rightContent={
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Not linked</span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              }
              onClick={() => {}}
            />
            <SettingRow 
              icon={Lock} 
              label="Change Password" 
              rightContent={<ChevronRight className="w-5 h-5 text-muted-foreground" />}
              onClick={() => {}}
            />
          </div>
        </motion.div>

        {/* PWA Options */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card mb-6"
        >
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
            PWA Options
          </h3>
          <div className="space-y-1">
            <SettingRow 
              icon={Zap} 
              label="Offline Mode" 
              rightContent={<ToggleSwitch enabled={offlineMode} onChange={setOfflineMode} />}
            />
            <SettingRow 
              icon={Trash2}
              iconColor="text-destructive"
              label="Clear Cache" 
              rightContent={<span className="text-sm text-muted-foreground">12.4 MB</span>}
              onClick={() => {
                if (confirm('Clear all cached data?')) {
                  // Clear cache logic
                }
              }}
            />
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          <button
            onClick={() => navigate('/about')}
            className="w-full py-4 rounded-xl bg-secondary flex items-center justify-center gap-2 font-semibold"
          >
            <Info className="w-5 h-5" />
            About JSN Solver
          </button>
          
          <button
            onClick={() => {
              if (confirm('Are you sure you want to logout?')) {
                navigate('/');
              }
            }}
            className="w-full py-4 rounded-xl bg-primary flex items-center justify-center gap-2 font-bold"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </motion.div>

        {/* Footer */}
        <div className="text-center py-8 text-muted-foreground text-sm">
          <p>Designed for Cubers worldwide.</p>
          <p>© 2024 JSN Digital Labs</p>
        </div>
      </main>

      <BottomNav variant="solver" />
    </div>
  );
};

export default Settings;
