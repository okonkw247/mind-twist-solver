import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Bell, 
  Settings, 
  Trophy, 
  Zap, 
  Timer, 
  Award, 
  Edit,
  Share2,
  ChevronRight
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';

interface Badge {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  unlocked: boolean;
}

const badges: Badge[] = [
  { id: 'first-solve', name: 'First Solve', icon: Trophy, color: 'text-amber-400', bgColor: 'bg-amber-500/20', unlocked: true },
  { id: 'speed-demon', name: 'Speed Demon', icon: Zap, color: 'text-red-400', bgColor: 'bg-red-500/20', unlocked: true },
  { id: 'marathoner', name: 'Marathoner', icon: Timer, color: 'text-blue-400', bgColor: 'bg-blue-500/20', unlocked: true },
  { id: 'master', name: 'Master', icon: Award, color: 'text-slate-400', bgColor: 'bg-slate-500/20', unlocked: false },
];

const Profile = () => {
  const navigate = useNavigate();
  const [username] = useState('CubeMaster99');
  const [title] = useState('Expert Speedcuber');
  const [memberSince] = useState('Jan 2024');
  const [cubesSolved] = useState(154);
  const [bestTime] = useState(12.4);
  const [globalRank] = useState(420);
  const [isPro] = useState(true);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4 safe-top">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-primary rounded" />
          </div>
          <span className="text-xl font-bold tracking-wider">JSN SOLVER</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-icon" aria-label="Notifications">
            <Bell className="w-6 h-6" />
          </button>
          <button 
            className="btn-icon" 
            aria-label="Settings"
            onClick={() => navigate('/settings')}
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </header>

      <main className="px-4">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 py-6 border-t border-border"
        >
          {/* Avatar */}
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gold to-primary p-1">
              <div className="w-full h-full rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-3xl">
                  👤
                </div>
              </div>
            </div>
            {/* Online status */}
            <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-primary border-2 border-background" />
          </div>
          
          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl font-bold">{username}</h2>
              {isPro && (
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-primary text-primary-foreground uppercase">
                  Pro
                </span>
              )}
            </div>
            <p className="text-muted-foreground">{title}</p>
            <p className="text-sm text-muted-foreground">Member since {memberSince}</p>
          </div>
        </motion.div>

        {/* Performance Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">
            Performance Overview
          </h3>
          
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="glass-card">
              <p className="text-sm text-muted-foreground mb-1">Cubes Solved</p>
              <p className="text-4xl font-bold">{cubesSolved}</p>
            </div>
            <div className="glass-card bg-primary/10 border-primary/30">
              <p className="text-sm text-primary mb-1">Best Time</p>
              <p className="text-4xl font-bold text-primary">
                {bestTime}<span className="text-xl">s</span>
              </p>
            </div>
          </div>
          
          <div className="glass-card">
            <p className="text-sm text-muted-foreground mb-1">Global Rank</p>
            <p className="text-4xl font-bold">#{globalRank}</p>
          </div>
        </motion.div>

        {/* Recent Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Recent Badges</h3>
            <button className="text-primary text-sm font-medium flex items-center gap-1">
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
            {badges.map((badge, index) => {
              const Icon = badge.icon;
              return (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="flex flex-col items-center gap-2 min-w-[80px]"
                >
                  <div className={`w-16 h-16 rounded-full ${badge.bgColor} flex items-center justify-center ring-2 ring-offset-2 ring-offset-background ${
                    badge.unlocked ? 'ring-current ' + badge.color : 'ring-muted'
                  }`}>
                    <Icon className={`w-7 h-7 ${badge.unlocked ? badge.color : 'text-muted-foreground'}`} />
                  </div>
                  <span className={`text-xs font-medium text-center ${
                    badge.unlocked ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {badge.name.toUpperCase()}
                  </span>
                </motion.div>
              );
            })}
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
            onClick={() => {}}
            className="w-full py-4 rounded-xl bg-primary flex items-center justify-center gap-2 font-bold"
          >
            <Edit className="w-5 h-5" />
            Edit Profile
          </button>
          
          <button 
            onClick={() => {}}
            className="w-full py-4 rounded-xl bg-secondary flex items-center justify-center gap-2 font-semibold"
          >
            <Share2 className="w-5 h-5" />
            Share Stats
          </button>
        </motion.div>
      </main>

      <BottomNav variant="profile" />
    </div>
  );
};

export default Profile;
