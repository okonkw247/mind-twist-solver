import { describe, it, expect } from 'vitest';
import { classifyFaceDetailed, type ColorName } from '../colorClassifier';

/** Build a fake camera frame whose center 60% is filled with one solid color. */
function solidFrame(rgb: [number, number, number]): ImageData {
  const width = 320;
  const height = 240;
  const data = new Uint8ClampedArray(width * height * 4);
  // Background is dark so we also prove the sampling window avoids it.
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 10;
    data[i + 1] = 10;
    data[i + 2] = 10;
    data[i + 3] = 255;
  }
  const size = Math.min(width, height) * 0.6;
  const startX = Math.floor((width - size) / 2);
  const startY = Math.floor((height - size) / 2);
  for (let y = startY; y < startY + size; y++) {
    for (let x = startX; x < startX + size; x++) {
      const index = (y * width + x) * 4;
      data[index] = rgb[0];
      data[index + 1] = rgb[1];
      data[index + 2] = rgb[2];
      data[index + 3] = 255;
    }
  }
  return { width, height, data } as unknown as ImageData;
}

// Canonical WCA sticker colors in RGB.
const CANONICAL: Array<[ColorName, [number, number, number]]> = [
  ['white', [255, 255, 255]],
  ['yellow', [255, 213, 0]],
  ['red', [196, 30, 58]],
  ['orange', [255, 88, 0]],
  ['blue', [0, 81, 186]],
  ['green', [0, 158, 96]],
];

describe('classifyFaceDetailed', () => {
  it.each(CANONICAL)('classifies a solid %s face as readable', (name, rgb) => {
    const result = classifyFaceDetailed(solidFrame(rgb));
    expect(result.readable).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.58);
    expect(new Set(result.colors)).toEqual(new Set([name]));
  });

  it('marks a dark frame as not readable', () => {
    const result = classifyFaceDetailed(solidFrame([12, 12, 12]));
    expect(result.readable).toBe(false);
  });
});
