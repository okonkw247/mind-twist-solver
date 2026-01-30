import { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AnimatePresence } from 'framer-motion';
import SplashScreen from "./pages/SplashScreen";
import WelcomeScreen from "./pages/WelcomeScreen";
import Home from "./pages/Home";
import Index from "./pages/Index";
import ManualInput from "./pages/ManualInput";
import CameraInput from "./pages/CameraInput";
import Solution from "./pages/Solution";
import Premium from "./pages/Premium";
import Timer from "./pages/Timer";
import PlayCube from "./pages/PlayCube";
import Solver from "./pages/Solver";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const [showSplash, setShowSplash] = useState(() => {
    // Only show splash if user hasn't seen it this session
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

  // Show splash screen overlay
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
      <Route path="/index" element={<Index />} />
      <Route path="/manual-input" element={<ManualInput />} />
      <Route path="/camera" element={<CameraInput />} />
      <Route path="/solution" element={<Solution />} />
      <Route path="/premium" element={<Premium />} />
      <Route path="/timer" element={<Timer />} />
      <Route path="/play-cube" element={<PlayCube />} />
      <Route path="/compete" element={<PlayCube />} />
      <Route path="/solver" element={<Solver />} />
      <Route path="/settings" element={<Premium />} />
      
      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
