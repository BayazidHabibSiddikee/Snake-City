import * as THREE from 'three';

export type GameLoopCallback = (dt: number, elapsedTime: number) => void;

/**
 * Standalone 3D Game Loop Manager (`src/game/engine/GameLoop.ts`).
 * Drives animation frames using THREE.Clock with delta-time smoothing and pause/resume support.
 */
export class GameLoop {
  private clock = new THREE.Clock();
  private animationFrameId: number | null = null;
  private isRunning = false;
  private callbacks: Set<GameLoopCallback> = new Set();
  private maxDelta = 0.1; // Cap delta to prevent spiral of death on lag spikes

  constructor() {}

  public subscribe(cb: GameLoopCallback): () => void {
    this.callbacks.add(cb);
    return () => {
      this.callbacks.delete(cb);
    };
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clock.start();
    this.loop();
  }

  public stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.clock.stop();
  }

  public pause(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public resume(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clock.start();
    this.loop();
  }

  private loop = (): void => {
    if (!this.isRunning) return;

    const rawDt = this.clock.getDelta();
    const dt = Math.min(rawDt, this.maxDelta);
    const elapsedTime = this.clock.getElapsedTime();

    for (const cb of this.callbacks) {
      try {
        cb(dt, elapsedTime);
      } catch (err) {
        console.error('Error in GameLoop callback:', err);
      }
    }

    this.animationFrameId = requestAnimationFrame(this.loop);
  };
}
