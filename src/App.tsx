import { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AnimatePresence } from 'framer-motion';
import { CubeProvider, useCubeContext } from '@/cube/CubeProvider';
import { CubeSettingsProvider, useCubeSettings } from '@/cube/CubeSettings';
import SplashScreen from "./pages/SplashScreen";
import WelcomeScreen from "./pages/WelcomeScreen";
import Home from "./pages/Home";
import ManualInput from "./pages/ManualInput";
import CameraInput from "./pages/CameraInput";
import Solution from "./pages/Solution";
import Timer from "./pages/Timer";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import VirtualCube from "./pages/VirtualCube";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const [showSplash, setShowSplash] = useState(() => {
    const sessionSplashShown = sessionStorage.getItem('jsn_splash_shown');
    return !sessionSplashShown;
  });
  
  const [isWelcomed, setIsWelcomed] = useState(() => {
    return localStorage.getItem('jsn_user_welcomed') === 'true';
  });

  const handleSplashComplete = () => {
    setShowSplash(false);
    sessionStorage.setItem('jsn_splash_shown', 'true');
  };

  if (showSplash) {
    return (
      <AnimatePresence mode="wait">
        <SplashScreen 
          key="splash" 
          onComplete={handleSplashComplete} 
        />
      </AnimatePresence>
    );
  }

  return (
    <Routes>
      {/* Entry point - redirect based on welcome status */}
      <Route 
        path="/" 
        element={
          isWelcomed ? <Navigate to="/home" replace /> : <WelcomeScreen />
        } 
      />
      
      {/* Main app routes */}
      <Route path="/home" element={<Home />} />
      <Route path="/manual-input" element={<ManualInput />} />
      <Route path="/camera" element={<CameraInput />} />
      <Route path="/solution" element={<Solution />} />
      <Route path="/timer" element={<Timer />} />
      <Route path="/virtual-cube" element={<VirtualCube />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/camera" element={<CameraInput />} />
      <Route path="/ar-solver" element={<CameraInput />} />
      
      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

// Bridges global CubeSettings → AnimationController so every screen honours
// the user's preferred animation speed.
const CubeSettingsBridge = ({ children }: { children: React.ReactNode }) => {
  const { animationSpeed } = useCubeSettings();
  const { setSpeed } = useCubeContext();
  useEffect(() => {
    setSpeed(animationSpeed);
  }, [animationSpeed, setSpeed]);
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <CubeSettingsProvider>
          <CubeProvider>
            <CubeSettingsBridge>
              <AppContent />
            </CubeSettingsBridge>
          </CubeProvider>
        </CubeSettingsProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
