// Animation Queue - Syncs solver moves with 3D renderer
// Prevents logical vs visual state desync

import { CubeMove } from './kociembaSolver';

export type AnimationSpeed = 'learning' | 'normal' | 'fast' | 'pro';
export type QueueState = 'idle' | 'playing' | 'paused' | 'complete';

export interface AnimationCommand {
  move: CubeMove;
  stepIndex: number;
  totalSteps: number;
  duration: number;
  startTime?: number;
}

export interface AnimationCallbacks {
  onMoveStart?: (command: AnimationCommand) => void;
  onMoveComplete?: (stepIndex: number) => void;
  onSequenceComplete?: () => void;
  onStateChange?: (state: QueueState) => void;
}

// Speed presets in milliseconds
export const SPEED_PRESETS: Record<AnimationSpeed, { duration: number; pause: number }> = {
  learning: { duration: 1200, pause: 800 },
  normal: { duration: 600, pause: 200 },
  fast: { duration: 300, pause: 50 },
  pro: { duration: 100, pause: 0 },
};

export class AnimationQueue {
  private commands: AnimationCommand[] = [];
  private currentIndex: number = 0;
  private state: QueueState = 'idle';
  private speed: AnimationSpeed = 'normal';
  private callbacks: AnimationCallbacks = {};
  private timeoutId: NodeJS.Timeout | null = null;
  private currentMoveStartTime: number = 0;
  
  constructor(moves: CubeMove[], speed: AnimationSpeed = 'normal') {
    this.speed = speed;
    this.buildQueue(moves);
  }
  
  private buildQueue(moves: CubeMove[]): void {
    const preset = SPEED_PRESETS[this.speed];
    
    this.commands = moves.map((move, index) => ({
      move,
      stepIndex: index,
      totalSteps: moves.length,
      duration: preset.duration,
    }));
  }
  
  setCallbacks(callbacks: AnimationCallbacks): void {
    this.callbacks = callbacks;
  }
  
  setSpeed(speed: AnimationSpeed): void {
    this.speed = speed;
    const preset = SPEED_PRESETS[speed];
    
    // Update durations for remaining commands
    for (let i = this.currentIndex; i < this.commands.length; i++) {
      this.commands[i].duration = preset.duration;
    }
  }
  
  getState(): QueueState {
    return this.state;
  }
  
  getCurrentIndex(): number {
    return this.currentIndex;
  }
  
  getTotalSteps(): number {
    return this.commands.length;
  }
  
  getCurrentCommand(): AnimationCommand | null {
    return this.commands[this.currentIndex] || null;
  }
  
  private setState(newState: QueueState): void {
    this.state = newState;
    this.callbacks.onStateChange?.(newState);
  }
  
  private async executeMove(command: AnimationCommand): Promise<void> {
    return new Promise((resolve) => {
      this.currentMoveStartTime = Date.now();
      command.startTime = this.currentMoveStartTime;
      
      // Notify move start
      this.callbacks.onMoveStart?.(command);
      
      // Wait for animation duration + pause
      const preset = SPEED_PRESETS[this.speed];
      const totalDelay = command.duration + preset.pause;
      
      this.timeoutId = setTimeout(() => {
        // Notify move complete
        this.callbacks.onMoveComplete?.(command.stepIndex);
        resolve();
      }, totalDelay);
    });
  }
  
  async play(): Promise<void> {
    if (this.state === 'playing') return;
    if (this.currentIndex >= this.commands.length) {
      this.reset();
    }
    
    this.setState('playing');
    
    // Store playing state locally to avoid TypeScript narrowing issues
    let isPlaying = true;
    
    const checkPlaying = () => this.state === 'playing';
    
    while (this.currentIndex < this.commands.length && isPlaying) {
      // Check if still playing before each move
      if (!checkPlaying()) {
        isPlaying = false;
        break;
      }
      
      const command = this.commands[this.currentIndex];
      await this.executeMove(command);
      
      // Check again after move completes
      if (!checkPlaying()) {
        isPlaying = false;
        break;
      }
      
      this.currentIndex++;
    }
    
    // Only mark complete if we finished naturally while playing
    if (this.currentIndex >= this.commands.length && checkPlaying()) {
      this.setState('complete');
      this.callbacks.onSequenceComplete?.();
    }
  }
  
  pause(): void {
    if (this.state !== 'playing') return;
    
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    
    this.setState('paused');
  }
  
  stepForward(): AnimationCommand | null {
    if (this.currentIndex >= this.commands.length) return null;
    
    const command = this.commands[this.currentIndex];
    this.callbacks.onMoveStart?.(command);
    this.callbacks.onMoveComplete?.(command.stepIndex);
    this.currentIndex++;
    
    if (this.currentIndex >= this.commands.length) {
      this.setState('complete');
      this.callbacks.onSequenceComplete?.();
    }
    
    return command;
  }
  
  stepBackward(): AnimationCommand | null {
    if (this.currentIndex <= 0) return null;
    
    this.currentIndex--;
    const command = this.commands[this.currentIndex];
    
    if (this.state === 'complete') {
      this.setState('paused');
    }
    
    return command;
  }
  
  jumpToStep(stepIndex: number): void {
    if (stepIndex < 0 || stepIndex > this.commands.length) return;
    
    this.pause();
    this.currentIndex = stepIndex;
    
    if (stepIndex >= this.commands.length) {
      this.setState('complete');
    } else {
      this.setState('paused');
    }
  }
  
  reset(): void {
    this.pause();
    this.currentIndex = 0;
    this.setState('idle');
  }
  
  destroy(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.callbacks = {};
  }
}

// Hook-friendly factory
export function createAnimationQueue(
  moves: CubeMove[],
  speed: AnimationSpeed = 'normal'
): AnimationQueue {
  return new AnimationQueue(moves, speed);
}
