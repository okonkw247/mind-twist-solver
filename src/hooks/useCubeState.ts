import { useState, useCallback } from 'react';

export type CubeFace = 'front' | 'right' | 'back' | 'left' | 'up' | 'down';

const faceOrder: CubeFace[] = ['front', 'right', 'back', 'left', 'up', 'down'];

const faceLabels: Record<CubeFace, string> = {
  front: 'Front (Green)',
  right: 'Right (Red)',
  back: 'Back (Blue)',
  left: 'Left (Orange)',
  up: 'Up (White)',
  down: 'Down (Yellow)',
};

interface CubeState {
  [key: string]: string[];
}

export const useCubeState = (size: number = 3) => {
  const totalStickers = size * size;
  
  const createEmptyFace = () => Array(totalStickers).fill('empty');
  
  const [cubeState, setCubeState] = useState<CubeState>(() => ({
    front: createEmptyFace(),
    right: createEmptyFace(),
    back: createEmptyFace(),
    left: createEmptyFace(),
    up: createEmptyFace(),
    down: createEmptyFace(),
  }));
  
  const [currentFaceIndex, setCurrentFaceIndex] = useState(0);
  
  const currentFace = faceOrder[currentFaceIndex];
  const currentFaceLabel = faceLabels[currentFace];
  
  const setSticker = useCallback((faceIndex: number, stickerIndex: number, color: string) => {
    const face = faceOrder[faceIndex];
    setCubeState(prev => ({
      ...prev,
      [face]: prev[face].map((c, i) => i === stickerIndex ? color : c),
    }));
  }, []);
  
  const setStickerOnCurrentFace = useCallback((stickerIndex: number, color: string) => {
    setSticker(currentFaceIndex, stickerIndex, color);
  }, [currentFaceIndex, setSticker]);
  
  const nextFace = useCallback(() => {
    setCurrentFaceIndex(prev => (prev + 1) % faceOrder.length);
  }, []);
  
  const prevFace = useCallback(() => {
    setCurrentFaceIndex(prev => (prev - 1 + faceOrder.length) % faceOrder.length);
  }, []);
  
  const goToFace = useCallback((index: number) => {
    if (index >= 0 && index < faceOrder.length) {
      setCurrentFaceIndex(index);
    }
  }, []);
  
  const resetCube = useCallback(() => {
    setCubeState({
      front: createEmptyFace(),
      right: createEmptyFace(),
      back: createEmptyFace(),
      left: createEmptyFace(),
      up: createEmptyFace(),
      down: createEmptyFace(),
    });
    setCurrentFaceIndex(0);
  }, [totalStickers]);
  
  // Count filled stickers
  const filledCount = Object.values(cubeState).flat().filter(c => c !== 'empty').length;
  const totalCount = totalStickers * 6;
  const progress = (filledCount / totalCount) * 100;
  
  // Check if a face is complete
  const isFaceComplete = (face: CubeFace) => {
    return cubeState[face].every(c => c !== 'empty');
  };
  
  // Check if cube is complete
  const isCubeComplete = filledCount === totalCount;
  
  return {
    cubeState,
    currentFace,
    currentFaceIndex,
    currentFaceLabel,
    currentFaceColors: cubeState[currentFace],
    setSticker,
    setStickerOnCurrentFace,
    nextFace,
    prevFace,
    goToFace,
    resetCube,
    filledCount,
    totalCount,
    progress,
    isFaceComplete,
    isCubeComplete,
    faceOrder,
    faceLabels,
  };
};
