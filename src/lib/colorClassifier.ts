/**
 * colorClassifier — Sample 9 sticker colors from a video frame.
 *
 * Uses HSL distance against canonical Rubik's color centers.
 * Robust to varied lighting because hue dominates the metric.
 */

export type ColorName = 'white' | 'yellow' | 'red' | 'orange' | 'blue' | 'green';

interface RGB { r: number; g: number; b: number }
interface HSL { h: number; s: number; l: number }

const COLOR_REFERENCES: Record<ColorName, HSL> = {
  white:  { h: 0,   s: 0,   l: 95 },
  yellow: { h: 52,  s: 95,  l: 55 },
  red:    { h: 0,   s: 85,  l: 50 },
  orange: { h: 25,  s: 95,  l: 55 },
  blue:   { h: 220, s: 90,  l: 45 },
  green:  { h: 130, s: 75,  l: 45 },
};

function rgbToHsl({ r, g, b }: RGB): HSL {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn: h = ((gn - bn) / d + (gn < bn ? 6 : 0)); break;
      case gn: h = (bn - rn) / d + 2; break;
      case bn: h = (rn - gn) / d + 4; break;
    }
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

function classifyHsl(hsl: HSL): ColorName {
  // Whites: very low saturation regardless of hue
  if (hsl.s < 18 && hsl.l > 60) return 'white';

  let best: ColorName = 'white';
  let bestScore = Infinity;
  for (const name of Object.keys(COLOR_REFERENCES) as ColorName[]) {
    if (name === 'white') continue;
    const ref = COLOR_REFERENCES[name];
    const dh = hueDistance(hsl.h, ref.h);
    const ds = Math.abs(hsl.s - ref.s) * 0.3;
    const dl = Math.abs(hsl.l - ref.l) * 0.2;
    const score = dh + ds + dl;
    if (score < bestScore) { bestScore = score; best = name; }
  }
  return best;
}

/**
 * Sample 9 cells in a 3x3 grid from the central square region of an ImageData.
 * Returns flattened row-major colors.
 */
export function classifyFace(image: ImageData): ColorName[] {
  const { width, height, data } = image;
  const size = Math.min(width, height) * 0.6; // central 60%
  const startX = (width - size) / 2;
  const startY = (height - size) / 2;
  const cell = size / 3;
  const sampleHalf = cell * 0.18;

  const result: ColorName[] = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const cx = startX + cell * (col + 0.5);
      const cy = startY + cell * (row + 0.5);
      let r = 0, g = 0, b = 0, n = 0;
      const x0 = Math.max(0, Math.floor(cx - sampleHalf));
      const x1 = Math.min(width - 1, Math.floor(cx + sampleHalf));
      const y0 = Math.max(0, Math.floor(cy - sampleHalf));
      const y1 = Math.min(height - 1, Math.floor(cy + sampleHalf));
      for (let y = y0; y <= y1; y += 2) {
        for (let x = x0; x <= x1; x += 2) {
          const idx = (y * width + x) * 4;
          r += data[idx]; g += data[idx + 1]; b += data[idx + 2]; n++;
        }
      }
      if (n === 0) { result.push('white'); continue; }
      r /= n; g /= n; b /= n;
      result.push(classifyHsl(rgbToHsl({ r, g, b })));
    }
  }
  return result;
}
