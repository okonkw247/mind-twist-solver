/** Live Rubik's sticker classifier with confidence gating for camera capture. */

export type ColorName = 'white' | 'yellow' | 'red' | 'orange' | 'blue' | 'green';

interface RGB { r: number; g: number; b: number }
interface HSV { h: number; s: number; v: number }

export interface FaceClassification {
  colors: ColorName[];
  confidence: number;
  readable: boolean;
}

const COLOR_REFERENCES: Record<ColorName, HSV> = {
  white: { h: 0, s: 0.04, v: 0.95 },
  yellow: { h: 52, s: 0.95, v: 0.95 },
  red: { h: 0, s: 0.85, v: 0.77 },
  orange: { h: 25, s: 0.95, v: 1 },
  blue: { h: 220, s: 0.98, v: 0.73 },
  green: { h: 145, s: 1, v: 0.62 },
};

function rgbToHsv({ r, g, b }: RGB): HSV {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    switch (max) {
      case rn: h = ((gn - bn) / d + (gn < bn ? 6 : 0)); break;
      case gn: h = (bn - rn) / d + 2; break;
      case bn: h = (rn - gn) / d + 4; break;
    }
    h *= 60;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

function classifyHsv(hsv: HSV): { color: ColorName; confidence: number } {
  // Dark samples are usually the cube outline, a shadow, or the room behind
  // the cube. Keep the best guess for the preview, but never call it readable.
  if (hsv.v < 0.2) {
    return { color: 'white', confidence: hsv.v * 0.25 };
  }

  // Low-chroma stickers are white even when the room light is warm.
  if (hsv.s < 0.2 && hsv.v > 0.42) {
    const brightnessConfidence = Math.min(1, Math.max(0, (hsv.v - 0.42) / 0.42));
    return {
      color: 'white',
      confidence: Math.min(1, (0.55 + (0.2 - hsv.s) * 1.8) * (0.45 + brightnessConfidence * 0.55)),
    };
  }

  let best: ColorName = 'white';
  let bestScore = Infinity;
  let secondScore = Infinity;
  for (const name of Object.keys(COLOR_REFERENCES) as ColorName[]) {
    if (name === 'white') continue;
    const ref = COLOR_REFERENCES[name];
    const hue = hueDistance(hsv.h, ref.h) / 180;
    const saturation = Math.abs(hsv.s - ref.s);
    const brightness = Math.abs(hsv.v - ref.v) * 0.35;
    const score = hue * 0.7 + saturation * 0.2 + brightness * 0.1;
    if (score < bestScore) {
      secondScore = bestScore;
      bestScore = score;
      best = name;
    } else if (score < secondScore) {
      secondScore = score;
    }
  }

  const separation = Math.max(0, secondScore - bestScore);
  const brightnessConfidence = Math.min(1, Math.max(0, (hsv.v - 0.2) / 0.55));
  return {
    color: best,
    confidence: Math.min(1, (0.35 + separation * 2.6) * (0.35 + brightnessConfidence * 0.65)),
  };
}

/** Backwards-compatible simple classifier. */
export function classifyFace(image: ImageData): ColorName[] {
  return classifyFaceDetailed(image).colors;
}

/** Sample nine center regions and report whether they are safe to capture. */
export function classifyFaceDetailed(image: ImageData): FaceClassification {
  const { width, height, data } = image;
  const size = Math.min(width, height) * 0.6;
  const startX = (width - size) / 2;
  const startY = (height - size) / 2;
  const cell = size / 3;
  const sampleHalf = cell * 0.2;
  const colors: ColorName[] = [];
  const confidences: number[] = [];

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const cx = startX + cell * (col + 0.5);
      const cy = startY + cell * (row + 0.5);
      const x0 = Math.max(0, Math.floor(cx - sampleHalf));
      const x1 = Math.min(width - 1, Math.floor(cx + sampleHalf));
      const y0 = Math.max(0, Math.floor(cy - sampleHalf));
      const y1 = Math.min(height - 1, Math.floor(cy + sampleHalf));
      let r = 0, g = 0, b = 0, n = 0;
      for (let y = y0; y <= y1; y += 2) {
        for (let x = x0; x <= x1; x += 2) {
          const index = (y * width + x) * 4;
          r += data[index];
          g += data[index + 1];
          b += data[index + 2];
          n++;
        }
      }
      if (n === 0) {
        colors.push('white');
        confidences.push(0);
        continue;
      }
      const result = classifyHsv(rgbToHsv({ r: r / n, g: g / n, b: b / n }));
      colors.push(result.color);
      confidences.push(result.confidence);
    }
  }

  const confidence = confidences.reduce((sum, value) => sum + value, 0) / confidences.length;
  return {
    colors,
    confidence,
    readable: confidences.every((value) => value >= 0.42) && confidence >= 0.58,
  };
}