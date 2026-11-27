import * as THREE from 'three';

export type CultivationShakeMove = 'shockwave' | 'dash' | 'ultimate' | 'breakthrough';

export interface CameraShakeOptions {
  /** Trauma impulse added in [0, 1] (squared internally for weighty decay). */
  trauma: number;
  /** Oscillation speed in radians/sec scale. Defaults to 24. */
  frequency?: number;
  /** Trauma decay per second. Defaults to 1.85. */
  decayRate?: number;
  /** Max local-space translation offset in world units at trauma = 1. */
  maxPositionOffset?: number;
  /** Max Euler rotation offset (radians) at trauma = 1. */
  maxRotationOffset?: number;
  /** Optional world-space directional kick vector (e.g., hit knockback direction). */
  directionX?: number;
  directionY?: number;
  directionZ?: number;
  /** Strength of directional camera kick in world units. */
  directionalKickStrength?: number;
}

export interface CameraShakeSample {
  trauma: number;
  intensity: number;
  positionOffset: THREE.Vector3;
  rotationOffset: THREE.Euler;
}

export interface CameraShakeConfig {
  /** Base max translational amplitude (world units) when trauma = 1. */
  defaultMaxPositionOffset?: number;
  /** Base max rotational amplitude (radians) when trauma = 1. */
  defaultMaxRotationOffset?: number;
  /** Base oscillation frequency. */
  defaultFrequency?: number;
  /** Base trauma decay rate (units per second). */
  defaultDecayRate?: number;
  /** Multiplier applied when prefers-reduced-motion is active. Defaults to 0.22. */
  reducedMotionScale?: number;
}

/**
 * Smooth multi-harmonic pseudo-noise in [-1, 1] for cinematic, non-jittery camera shake.
 */
function sampleHarmonicNoise(t: number, phaseA: number, phaseB: number): number {
  const n =
    Math.sin(t + phaseA) * 0.56 +
    Math.sin(t * 2.13 + phaseB) * 0.29 +
    Math.sin(t * 3.71 + phaseA * 1.7) * 0.15;
  return Math.max(-1, Math.min(1, n));
}

function detectReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * Trauma-based Three.js camera shake engine (`src/game/engine/CameraShake.ts`).
 *
 * Applies frame-rate-independent local-space translational and rotational transformation
 * offsets directly to a Three.js Camera with zero per-frame allocations and exact offset
 * reversion so damped follow-camera tracking never drifts.
 */
export class CameraShake {
  private readonly defaultMaxPos: number;
  private readonly defaultMaxRot: number;
  private readonly defaultFrequency: number;
  private readonly defaultDecayRate: number;
  private readonly reducedMotionScale: number;

  private trauma = 0;
  private elapsed = 0;
  private activeFrequency: number;
  private activeDecayRate: number;
  private activeMaxPos: number;
  private activeMaxRot: number;
  private enabled = true;
  private reducedMotionOverride: boolean | null = null;

  // Directional impact punch (decays exponentially in world space)
  private readonly kickWorldOffset = new THREE.Vector3();

  // Current frame computed local-space offsets (zero GC per frame)
  private readonly localPosOffset = new THREE.Vector3();
  private readonly localRotOffset = new THREE.Euler(0, 0, 0, 'YXZ');

  // Exact world-space position delta applied to the camera last frame, for drift-free revert
  private readonly appliedWorldPosOffset = new THREE.Vector3();
  private hasAppliedOffset = false;

  // Pre-allocated scratch math objects (zero GC in render loop)
  private readonly _worldOffset = new THREE.Vector3();
  private readonly _offsetQuat = new THREE.Quaternion();
  private readonly _kickDir = new THREE.Vector3();

  private readonly sampleView: CameraShakeSample;

  constructor(config: CameraShakeConfig = {}) {
    this.defaultMaxPos = config.defaultMaxPositionOffset ?? 0.52;
    this.defaultMaxRot = config.defaultMaxRotationOffset ?? 0.048;
    this.defaultFrequency = config.defaultFrequency ?? 24;
    this.defaultDecayRate = config.defaultDecayRate ?? 1.9;
    this.reducedMotionScale = config.reducedMotionScale ?? 0.22;

    this.activeFrequency = this.defaultFrequency;
    this.activeDecayRate = this.defaultDecayRate;
    this.activeMaxPos = this.defaultMaxPos;
    this.activeMaxRot = this.defaultMaxRot;

    this.sampleView = {
      trauma: 0,
      intensity: 0,
      positionOffset: this.localPosOffset,
      rotationOffset: this.localRotOffset,
    };
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.trauma = 0;
      this.kickWorldOffset.set(0, 0, 0);
      this.localPosOffset.set(0, 0, 0);
      this.localRotOffset.set(0, 0, 0);
    }
  }

  public setReducedMotionOverride(reduced: boolean | null): void {
    this.reducedMotionOverride = reduced;
  }

  public getTrauma(): number {
    return this.trauma;
  }

  public isActive(): boolean {
    return this.trauma > 0.001 || this.kickWorldOffset.lengthSq() > 0.00001;
  }

  /**
   * Triggers a trauma impulse with optional frequency, decay, amplitude, and directional kick.
   */
  public trigger(options: CameraShakeOptions): void {
    if (!this.enabled) return;
    const impulse = Number.isFinite(options.trauma) ? Math.max(0, Math.min(1, options.trauma)) : 0;
    if (impulse <= 0 && !options.directionalKickStrength) return;

    const wasStronger = impulse >= this.trauma * 0.8;
    this.trauma = Math.min(1, Math.max(this.trauma, impulse) + Math.min(this.trauma, impulse) * 0.28);

    if (wasStronger) {
      this.activeFrequency = options.frequency ?? this.defaultFrequency;
      this.activeDecayRate = options.decayRate ?? this.defaultDecayRate;
      this.activeMaxPos = options.maxPositionOffset ?? this.defaultMaxPos;
      this.activeMaxRot = options.maxRotationOffset ?? this.defaultMaxRot;
    }

    const kickMag = options.directionalKickStrength ?? 0;
    if (kickMag > 0) {
      this._kickDir.set(
        options.directionX ?? 0,
        options.directionY ?? 0,
        options.directionZ ?? 0,
      );
      if (this._kickDir.lengthSq() > 0.0001) {
        this._kickDir.normalize().multiplyScalar(kickMag);
        this.kickWorldOffset.add(this._kickDir);
        const maxKick = 0.85;
        if (this.kickWorldOffset.length() > maxKick) {
          this.kickWorldOffset.setLength(maxKick);
        }
      }
    }
  }

  /**
   * Triggers a sharp, kinetic camera jolt when the player takes damage.
   * Scales intensity with damage severity and pushes along the incoming hit direction.
   */
  public triggerDamage(damageRatio = 0.35, pushX = 0, pushZ = 0): void {
    const ratio = Number.isFinite(damageRatio) ? Math.max(0.08, Math.min(1, damageRatio)) : 0.35;
    const isHeavy = ratio >= 0.45;
    this.trigger({
      trauma: Math.min(1, 0.48 + ratio * 0.46),
      frequency: isHeavy ? 32 : 28,
      decayRate: isHeavy ? 1.75 : 2.15,
      maxPositionOffset: isHeavy ? 0.64 : 0.46,
      maxRotationOffset: isHeavy ? 0.068 : 0.048,
      directionX: pushX,
      directionY: -0.22,
      directionZ: pushZ,
      directionalKickStrength: 0.22 + ratio * 0.36,
    });
  }

  /**
   * Triggers tailored Three.js camera shake profiles for powerful cultivation moves:
   * - shockwave: resonant radial pulse with subtle lift
   * - dash: sharp kinetic burst with quick recovery
   * - ultimate: deep seismic rumble for Heavenly Flame Lotus
   * - breakthrough: ascending celestial tremor for stage evolution / ascension
   */
  public triggerCultivationMove(move: CultivationShakeMove, powerScale = 1.0): void {
    const s = Number.isFinite(powerScale) ? Math.max(0.5, Math.min(1.5, powerScale)) : 1.0;

    switch (move) {
      case 'shockwave':
        this.trigger({
          trauma: Math.min(0.82, 0.5 * s),
          frequency: 22,
          decayRate: 2.0,
          maxPositionOffset: 0.48 * s,
          maxRotationOffset: 0.04 * s,
          directionY: 0.16,
          directionalKickStrength: 0.14 * s,
        });
        break;
      case 'dash':
        this.trigger({
          trauma: Math.min(0.75, 0.46 * s),
          frequency: 29,
          decayRate: 2.5,
          maxPositionOffset: 0.42 * s,
          maxRotationOffset: 0.036 * s,
          directionY: 0.08,
          directionalKickStrength: 0.12 * s,
        });
        break;
      case 'ultimate':
        this.trigger({
          trauma: Math.min(1.0, 0.88 * s),
          frequency: 17,
          decayRate: 1.35,
          maxPositionOffset: 0.78 * s,
          maxRotationOffset: 0.064 * s,
          directionY: 0.28,
          directionalKickStrength: 0.26 * s,
        });
        break;
      case 'breakthrough':
        this.trigger({
          trauma: Math.min(1.0, 0.76 * s),
          frequency: 15,
          decayRate: 1.25,
          maxPositionOffset: 0.68 * s,
          maxRotationOffset: 0.056 * s,
          directionY: 0.34,
          directionalKickStrength: 0.24 * s,
        });
        break;
    }
  }

  /**
   * Backwards-compatible scalar trigger (maps legacy intensity values ~0.15..1.4 into trauma).
   */
  public triggerRaw(amount: number): void {
    if (!Number.isFinite(amount) || amount <= 0) return;
    const normalizedTrauma = Math.max(0, Math.min(1, Math.sqrt(Math.min(1.4, amount) / 1.15)));
    this.trigger({
      trauma: normalizedTrauma,
      frequency: 24,
      decayRate: 2.0,
      maxPositionOffset: this.defaultMaxPos,
      maxRotationOffset: this.defaultMaxRot,
    });
  }

  /**
   * Advances trauma decay, directional kick damping, and harmonic oscillation.
   * Returns a reused sample object (zero allocations).
   */
  public update(dt: number): CameraShakeSample {
    const safeDt = Number.isFinite(dt) ? Math.max(0, Math.min(0.1, dt)) : 0;
    const motionScale = this.getEffectiveMotionScale();

    if (!this.enabled || motionScale <= 0 || !this.isActive()) {
      this.trauma = 0;
      this.kickWorldOffset.set(0, 0, 0);
      this.localPosOffset.set(0, 0, 0);
      this.localRotOffset.set(0, 0, 0);
      this.sampleView.trauma = 0;
      this.sampleView.intensity = 0;
      return this.sampleView;
    }

    this.elapsed += safeDt;

    // Quadratic trauma curve produces crisp initial impact and silky smooth tail decay
    const intensity = this.trauma * this.trauma * motionScale;
    const t = this.elapsed * this.activeFrequency;

    const posX = sampleHarmonicNoise(t, 1.37, 4.19) * this.activeMaxPos * intensity;
    const posY = sampleHarmonicNoise(t * 1.07, 7.91, 2.63) * this.activeMaxPos * 0.82 * intensity;
    const posZ = sampleHarmonicNoise(t * 0.89, 13.11, 5.47) * this.activeMaxPos * 0.45 * intensity;
    this.localPosOffset.set(posX, posY, posZ);

    const pitch = sampleHarmonicNoise(t * 0.96, 3.14, 9.21) * this.activeMaxRot * 0.72 * intensity;
    const yaw = sampleHarmonicNoise(t * 1.11, 6.28, 1.73) * this.activeMaxRot * 0.58 * intensity;
    const roll = sampleHarmonicNoise(t * 0.84, 11.05, 8.41) * this.activeMaxRot * 1.15 * intensity;
    this.localRotOffset.set(pitch, yaw, roll, 'YXZ');

    this.sampleView.trauma = this.trauma;
    this.sampleView.intensity = intensity;

    // Frame-rate independent trauma decay & directional kick damping
    this.trauma = Math.max(0, this.trauma - this.activeDecayRate * safeDt);
    if (this.trauma < 0.001) {
      this.trauma = 0;
    }

    const kickDamp = Math.exp(-13.5 * safeDt);
    this.kickWorldOffset.multiplyScalar(kickDamp);
    if (this.kickWorldOffset.lengthSq() < 0.00001) {
      this.kickWorldOffset.set(0, 0, 0);
    }

    return this.sampleView;
  }

  /**
   * Removes the exact world-space position offset applied during the previous frame
   * so follow-camera exponential damping never accumulates shake drift.
   */
  public revertFromCamera(camera: THREE.Camera): void {
    if (!this.hasAppliedOffset) return;
    camera.position.sub(this.appliedWorldPosOffset);
    this.appliedWorldPosOffset.set(0, 0, 0);
    this.hasAppliedOffset = false;
  }

  /**
   * Applies the current local-space translational and rotational shake offsets to a Three.js Camera.
   * Call after base camera positioning and lookAt() for the frame.
   */
  public applyToCamera(camera: THREE.Camera): boolean {
    const motionScale = this.getEffectiveMotionScale();
    const hasPos = this.localPosOffset.lengthSq() > 1e-8 || this.kickWorldOffset.lengthSq() > 1e-8;
    const hasRot =
      Math.abs(this.localRotOffset.x) > 1e-6 ||
      Math.abs(this.localRotOffset.y) > 1e-6 ||
      Math.abs(this.localRotOffset.z) > 1e-6;

    if (!this.enabled || motionScale <= 0 || (!hasPos && !hasRot)) {
      this.appliedWorldPosOffset.set(0, 0, 0);
      this.hasAppliedOffset = false;
      return false;
    }

    // Rotate local right/up/forward shake offset into world space using the camera's orientation
    this._worldOffset
      .copy(this.localPosOffset)
      .applyQuaternion(camera.quaternion)
      .addScaledVector(this.kickWorldOffset, motionScale);

    camera.position.add(this._worldOffset);
    this.appliedWorldPosOffset.copy(this._worldOffset);
    this.hasAppliedOffset = true;

    // Compose local pitch/yaw/roll shake quaternion onto camera orientation
    if (hasRot) {
      this._offsetQuat.setFromEuler(this.localRotOffset);
      camera.quaternion.multiply(this._offsetQuat);
    }

    return true;
  }

  /**
   * Immediately clears all shake state and optionally reverts any active camera offset.
   */
  public reset(camera?: THREE.Camera): void {
    if (camera) {
      this.revertFromCamera(camera);
    } else {
      this.appliedWorldPosOffset.set(0, 0, 0);
      this.hasAppliedOffset = false;
    }
    this.trauma = 0;
    this.kickWorldOffset.set(0, 0, 0);
    this.localPosOffset.set(0, 0, 0);
    this.localRotOffset.set(0, 0, 0);
    this.sampleView.trauma = 0;
    this.sampleView.intensity = 0;
  }

  private getEffectiveMotionScale(): number {
    const isReduced =
      this.reducedMotionOverride !== null ? this.reducedMotionOverride : detectReducedMotion();
    return isReduced ? this.reducedMotionScale : 1.0;
  }
}
