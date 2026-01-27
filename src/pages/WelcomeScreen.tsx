import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, Lock, User } from 'lucide-react';
import jsnLogo from '@/assets/jsn-logo.png';
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
    // For now, skip auth and go directly to home
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

    // For now, simulate auth success
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
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <img 
            src={jsnLogo} 
            alt="JSN Solving" 
            className="w-40 h-40 object-contain"
          />
        </motion.div>

        {/* Tagline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-3xl md:text-4xl font-bold text-center text-foreground mb-2"
        >
          Solve Any Cube.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-2xl md:text-3xl font-bold text-center gradient-text mb-16"
        >
          Learn Step by Step.
        </motion.p>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
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
      <header className="flex items-center gap-4 px-4 py-4">
        <button
          onClick={() => setMode('welcome')}
          className="p-2 rounded-full hover:bg-secondary transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold">
          {mode === 'signin' ? 'Sign In' : 'Create Account'}
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
