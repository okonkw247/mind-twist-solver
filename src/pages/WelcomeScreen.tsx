import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, Lock, User, Box } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

type AuthMode = 'welcome' | 'signin' | 'signup';

const WelcomeScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mode, setMode] = useState<AuthMode>('welcome');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleGetStarted = () => {
    localStorage.setItem('jsn_user_welcomed', 'true');
    navigate('/home');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || (mode === 'signin' && !password.trim())) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all required fields",
      });
      return;
    }

    localStorage.setItem('jsn_user_email', email);
    localStorage.setItem('jsn_user_welcomed', 'true');
    toast({
      title: mode === 'signin' ? "Welcome back!" : "Account created!",
      description: "Redirecting to home...",
    });
    setTimeout(() => navigate('/home'), 500);
  };

  if (mode === 'welcome') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
        {/* Abstract cube logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0, rotateY: -20 }}
          animate={{ scale: 1, opacity: 1, rotateY: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-8 relative"
        >
          <div className="w-40 h-40 relative flex items-center justify-center">
            <div className="absolute w-28 h-28 bg-card rounded-3xl transform rotate-12 border border-primary/30" />
            <div className="relative grid grid-cols-2 gap-2 p-3">
              <div className="w-10 h-10 rounded-lg bg-cube-red shadow-lg" />
              <div className="w-10 h-10 rounded-lg bg-cube-orange shadow-lg" />
              <div className="w-10 h-10 rounded-lg bg-cube-yellow shadow-lg" />
              <div className="w-10 h-10 rounded-lg bg-cube-green shadow-lg" />
            </div>
          </div>
        </motion.div>

        {/* Tagline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-3xl font-bold text-center text-foreground mb-2"
        >
          Solve Any Cube.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-bold text-center gradient-text mb-16"
        >
          Learn Step by Step.
        </motion.p>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="w-full max-w-sm space-y-4"
        >
          <button
            onClick={handleGetStarted}
            className="btn-primary w-full h-14 text-lg"
          >
            Get Started
          </button>
          <button
            onClick={() => setMode('signin')}
            className="btn-secondary w-full h-14 text-lg"
          >
            Sign In
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center gap-4 px-4 py-4 safe-top">
        <button
          onClick={() => setMode('welcome')}
          className="btn-icon"
          aria-label="Go back"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold tracking-wider">
          {mode === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT'}
        </h1>
      </header>

      {/* Form */}
      <div className="flex-1 px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {mode === 'signup' && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <label className="text-lg font-medium text-foreground mb-2 block">
                What's your name?
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="pl-12 h-14 text-lg bg-secondary border-border"
                />
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: mode === 'signup' ? 0.1 : 0 }}
          >
            <label className="text-lg font-medium text-foreground mb-2 block">
              What's your email?
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="pl-12 h-14 text-lg bg-secondary border-border"
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              You'll need to confirm this email later.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: mode === 'signup' ? 0.2 : 0.1 }}
          >
            <label className="text-lg font-medium text-foreground mb-2 block">
              {mode === 'signin' ? 'Password' : 'Create a password'}
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="pl-12 h-14 text-lg bg-secondary border-border"
              />
            </div>
          </motion.div>

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: mode === 'signup' ? 0.3 : 0.2 }}
            type="submit"
            className="btn-primary w-full h-14 text-lg mt-8"
          >
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </motion.button>
        </form>

        {/* Toggle mode */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-8 text-muted-foreground"
        >
          {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
          <button
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            className="text-primary font-medium ml-2 hover:underline"
          >
            {mode === 'signin' ? 'Sign Up' : 'Sign In'}
          </button>
        </motion.p>
      </div>
    </div>
  );
};

export default WelcomeScreen;
