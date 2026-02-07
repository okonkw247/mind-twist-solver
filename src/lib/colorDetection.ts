/**
 * Camera Color Detection for Rubik's Cube
 * Uses RGB distance algorithm to detect cube colors from camera feed
 */

export type CubeColor = 'white' | 'yellow' | 'red' | 'orange' | 'green' | 'blue';

// Reference RGB values for cube colors (adjusted for various lighting conditions)
const COLOR_REFERENCES: Record<CubeColor, { r: number; g: number; b: number }[]> = {
  white: [
    { r: 255, g: 255, b: 255 },
    { r: 245, g: 245, b: 245 },
    { r: 230, g: 230, b: 230 },
    { r: 200, g: 200, b: 210 }, // Slight blue tint in some lighting
  ],
  yellow: [
    { r: 255, g: 255, b: 0 },
    { r: 255, g: 230, b: 0 },
    { r: 255, g: 200, b: 0 },
    { r: 230, g: 200, b: 50 },
  ],
  red: [
    { r: 255, g: 0, b: 0 },
    { r: 220, g: 38, b: 38 },
    { r: 200, g: 30, b: 30 },
    { r: 180, g: 0, b: 0 },
  ],
  orange: [
    { r: 255, g: 165, b: 0 },
    { r: 249, g: 115, b: 22 },
    { r: 255, g: 140, b: 0 },
    { r: 230, g: 100, b: 20 },
  ],
  green: [
    { r: 0, g: 255, b: 0 },
    { r: 34, g: 197, b: 94 },
    { r: 0, g: 200, b: 0 },
    { r: 50, g: 180, b: 50 },
  ],
  blue: [
    { r: 0, g: 0, b: 255 },
    { r: 37, g: 99, b: 235 },
    { r: 0, g: 100, b: 255 },
    { r: 30, g: 80, b: 200 },
  ],
};

export interface DetectionResult {
  color: CubeColor;
  confidence: number; // 0-1
  rgb: { r: number; g: number; b: number };
}

/**
 * Calculate Euclidean distance between two RGB colors
 */
function rgbDistance(
  c1: { r: number; g: number; b: number },
  c2: { r: number; g: number; b: number }
): number {
  return Math.sqrt(
    Math.pow(c1.r - c2.r, 2) +
    Math.pow(c1.g - c2.g, 2) +
    Math.pow(c1.b - c2.b, 2)
  );
}

/**
 * Detect the closest cube color from RGB values
 */
export function detectCubeColor(r: number, g: number, b: number): DetectionResult {
  const inputColor = { r, g, b };
  let minDistance = Infinity;
  let detectedColor: CubeColor = 'white';
  
  // Check against all reference colors for each cube color
  for (const [colorName, references] of Object.entries(COLOR_REFERENCES)) {
    for (const refColor of references) {
      const distance = rgbDistance(inputColor, refColor);
      if (distance < minDistance) {
        minDistance = distance;
        detectedColor = colorName as CubeColor;
      }
    }
  }
  
  // Calculate confidence (inverse of distance, normalized)
  // Max possible distance is ~441 (black to white), use 300 as practical max
  const confidence = Math.max(0, Math.min(1, 1 - (minDistance / 300)));
  
  return {
    color: detectedColor,
    confidence,
    rgb: inputColor,
  };
}

/**
 * Enhanced color detection using HSL for better discrimination
 */
export function detectCubeColorHSL(r: number, g: number, b: number): DetectionResult {
  // Convert RGB to HSL
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const l = (max + min) / 2;
  
  let h = 0;
  let s = 0;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case rNorm:
        h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6;
        break;
      case gNorm:
        h = ((bNorm - rNorm) / d + 2) / 6;
        break;
      case bNorm:
        h = ((rNorm - gNorm) / d + 4) / 6;
        break;
    }
  }
  
  const hDegrees = h * 360;
  const saturation = s * 100;
  const lightness = l * 100;
  
  let detectedColor: CubeColor;
  let confidence: number;
  
  // White detection (high lightness, low saturation)
  if (lightness > 75 && saturation < 25) {
    detectedColor = 'white';
    confidence = Math.min(1, lightness / 100);
  }
  // Yellow detection (hue 40-70, high saturation)
  else if (hDegrees >= 40 && hDegrees <= 70 && saturation > 40) {
    detectedColor = 'yellow';
    confidence = saturation / 100;
  }
  // Orange detection (hue 15-45, high saturation)
  else if (hDegrees >= 15 && hDegrees < 45 && saturation > 50) {
    detectedColor = 'orange';
    confidence = saturation / 100;
  }
  // Red detection (hue 0-15 or 345-360)
  else if ((hDegrees >= 0 && hDegrees < 20) || hDegrees >= 340) {
    detectedColor = 'red';
    confidence = saturation / 100;
  }
  // Green detection (hue 90-160)
  else if (hDegrees >= 80 && hDegrees <= 170) {
    detectedColor = 'green';
    confidence = saturation / 100;
  }
  // Blue detection (hue 200-260)
  else if (hDegrees >= 190 && hDegrees <= 270) {
    detectedColor = 'blue';
    confidence = saturation / 100;
  }
  // Fallback to RGB distance method
  else {
    return detectCubeColor(r, g, b);
  }
  
  return {
    color: detectedColor,
    confidence: Math.max(0.3, confidence),
    rgb: { r, g, b },
  };
}

/**
 * Sample a region of pixels and get the average color
 */
export function sampleRegion(
  imageData: ImageData,
  x: number,
  y: number,
  sampleSize: number = 10
): { r: number; g: number; b: number } {
  let totalR = 0;
  let totalG = 0;
  let totalB = 0;
  let count = 0;
  
  const halfSize = Math.floor(sampleSize / 2);
  
  for (let dy = -halfSize; dy <= halfSize; dy++) {
    for (let dx = -halfSize; dx <= halfSize; dx++) {
      const px = Math.max(0, Math.min(imageData.width - 1, x + dx));
      const py = Math.max(0, Math.min(imageData.height - 1, y + dy));
      const idx = (py * imageData.width + px) * 4;
      
      totalR += imageData.data[idx];
      totalG += imageData.data[idx + 1];
      totalB += imageData.data[idx + 2];
      count++;
    }
  }
  
  return {
    r: Math.round(totalR / count),
    g: Math.round(totalG / count),
    b: Math.round(totalB / count),
  };
}

/**
 * Capture and detect all 9 colors from a camera frame
 */
export function captureGridColors(
  video: HTMLVideoElement,
  gridPadding: number = 0.1 // 10% padding from edges
): DetectionResult[] {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    console.error('Could not get canvas context');
    return Array(9).fill({ color: 'white', confidence: 0, rgb: { r: 0, g: 0, b: 0 } });
  }
  
  ctx.drawImage(video, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  const results: DetectionResult[] = [];
  
  // Calculate grid positions with padding
  const paddedWidth = canvas.width * (1 - 2 * gridPadding);
  const paddedHeight = canvas.height * (1 - 2 * gridPadding);
  const startX = canvas.width * gridPadding;
  const startY = canvas.height * gridPadding;
  const cellWidth = paddedWidth / 3;
  const cellHeight = paddedHeight / 3;
  
  // Sample center of each cell in 3x3 grid
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const centerX = Math.round(startX + cellWidth * (col + 0.5));
      const centerY = Math.round(startY + cellHeight * (row + 0.5));
      
      // Sample a region around the center point
      const avgColor = sampleRegion(imageData, centerX, centerY, 15);
      const result = detectCubeColorHSL(avgColor.r, avgColor.g, avgColor.b);
      results.push(result);
    }
  }
  
  return results;
}

/**
 * Color map for rendering
 */
export const COLOR_HEX_MAP: Record<CubeColor, string> = {
  white: '#f5f5f5',
  yellow: '#ffd700',
  red: '#dc2626',
  orange: '#f97316',
  green: '#22c55e',
  blue: '#2563eb',
};
