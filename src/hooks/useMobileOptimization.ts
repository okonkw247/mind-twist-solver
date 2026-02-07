import { useState, useEffect, useMemo } from 'react';

/**
 * Hook for mobile device detection and performance optimization settings
 */
export function useMobileOptimization() {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isLowPowerMode, setIsLowPowerMode] = useState<boolean>(false);
  const [devicePixelRatio, setDevicePixelRatio] = useState<number>(1);

  useEffect(() => {
    // Detect mobile devices
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor;
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        userAgent.toLowerCase()
      );
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth < 768;
      
      setIsMobile(isMobileDevice || (isTouchDevice && isSmallScreen));
      setDevicePixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    };

    // Detect low power mode (approximation based on device characteristics)
    const checkLowPower = () => {
      const isSlowConnection = (navigator as any).connection?.effectiveType === '2g' || 
                               (navigator as any).connection?.effectiveType === 'slow-2g';
      const isMemoryConstrained = (navigator as any).deviceMemory && (navigator as any).deviceMemory < 4;
      setIsLowPowerMode(isSlowConnection || isMemoryConstrained);
    };

    checkMobile();
    checkLowPower();

    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Performance settings based on device capabilities
  const settings = useMemo(() => ({
    // Reduce polygon count on mobile
    cubeSegments: isMobile ? 2 : 4,
    roundedBoxSmoothnessn: isMobile ? 2 : 4,
    
    // Reduce antialiasing quality
    antialias: !isMobile,
    
    // Lower shadow quality
    shadowMapEnabled: !isMobile,
    shadowMapSize: isMobile ? 512 : 1024,
    
    // Pixel ratio (limit on mobile)
    pixelRatio: isMobile ? Math.min(devicePixelRatio, 1.5) : Math.min(devicePixelRatio, 2),
    
    // Animation settings
    animationDuration: isMobile ? 500 : 600,
    scrambleDuration: isMobile ? 100 : 150,
    
    // Touch controls
    enableDamping: true,
    dampingFactor: isMobile ? 0.08 : 0.1,
    rotateSpeed: isMobile ? 0.6 : 0.8,
    
    // Rendering
    powerPreference: isMobile ? 'low-power' as const : 'high-performance' as const,
    
    // Low power overrides
    ...(isLowPowerMode && {
      cubeSegments: 1,
      roundedBoxSmoothness: 1,
      pixelRatio: 1,
      animationDuration: 400,
    }),
  }), [isMobile, isLowPowerMode, devicePixelRatio]);

  return {
    isMobile,
    isLowPowerMode,
    settings,
  };
}

/**
 * Simple mobile check without the full hook
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent || navigator.vendor;
  const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
    userAgent.toLowerCase()
  );
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth < 768;
  
  return isMobileUA || (isTouchDevice && isSmallScreen);
}
