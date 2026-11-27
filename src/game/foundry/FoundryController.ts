import type * as THREE from 'three';
import { GameplayEventBus } from '../core/EventBus';
import { FoundryRenderer } from './FoundryRenderer';
import {
  castSoulDisciplineSkill,
  createInitialFoundryState,
  exportFoundryPersistedState,
  FOUNDRY_FIXED_DT,
  FOUNDRY_STORAGE_KEY,
  FOUNDRY_WORLD_ORIGIN,
  setHydraulicValve,
  setPlayerBlocking,
  startPlayerAttack,
  stepFoundrySimulation,
  toggleEnergySwitch,
  triggerPlayerDodge,
  triggerPlayerJump,
  triggerPlayerParry,
  updateGearPuzzleConfig,
  type AttackKind,
  type FoundryPersistedState,
  type FoundrySimulationState,
  type GearPuzzleState,
  type SoulDisciplineId,
} from './FoundrySimulation';

/**
 * Coordinates the fixed-step Forgotten Soul Foundry simulation, EventBus,
 * localStorage persistence, and 3D FoundryRenderer inside SnakeGameController.
 */
export class FoundryController {
  public readonly bus = new GameplayEventBus();
  public readonly renderer = new FoundryRenderer();
  private state: FoundrySimulationState;
  private accumulator = 0;
  private listeners: Array<(state: FoundrySimulationState) => void> = [];
  private lastUiNotifyAt = 0;

  constructor() {
    this.state = createInitialFoundryState(this.loadPersisted());
    this.bus.on('foundry.puzzle_solved', () => this.savePersisted());
    this.bus.on('foundry.boss_defeated', () => this.savePersisted());
  }

  public attachToScene(scene: THREE.Scene): void {
    if (!this.renderer.root.parent) {
      scene.add(this.renderer.root);
    }
    this.renderer.sync(this.state);
  }

  public subscribe(fn: (state: FoundrySimulationState) => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== fn);
    };
  }

  private notify(force = false): void {
    const now = performance.now();
    if (!force && now - this.lastUiNotifyAt < 140) return;
    this.lastUiNotifyAt = now;
    for (const fn of this.listeners) fn(this.state);
  }

  public getState(): FoundrySimulationState {
    return this.state;
  }

  public isPlayerInsideFoundry(worldX: number, worldZ: number): boolean {
    const dx = worldX - FOUNDRY_WORLD_ORIGIN.x;
    const dz = worldZ - FOUNDRY_WORLD_ORIGIN.z;
    return Math.hypot(dx, dz) <= FOUNDRY_WORLD_ORIGIN.radius;
  }

  public getEntranceWorldCoords(): { x: number; z: number } {
    return {
      x: FOUNDRY_WORLD_ORIGIN.x,
      z: FOUNDRY_WORLD_ORIGIN.z - 42,
    };
  }

  public update(
    frameDt: number,
    playerWorldX: number,
    playerWorldZ: number,
    playerSpeed: number,
    isBoosting: boolean,
  ): { playerDamageTaken: number; insideFoundry: boolean } {
    const localX = playerWorldX - FOUNDRY_WORLD_ORIGIN.x;
    const localZ = playerWorldZ - FOUNDRY_WORLD_ORIGIN.z;
    const insideFoundry = Math.hypot(localX, localZ) <= FOUNDRY_WORLD_ORIGIN.radius;

    // Pause heavy simulation when player is far away; keep blades visibly turning at low rate
    if (!insideFoundry) {
      for (const b of this.state.blades) {
        b.angleRad = (b.angleRad + b.currentAngularVel * Math.min(0.05, frameDt) * 0.5) % (Math.PI * 2);
      }
      this.renderer.sync(this.state);
      return { playerDamageTaken: 0, insideFoundry: false };
    }

    this.accumulator = Math.min(0.15, this.accumulator + Math.max(0, frameDt));
    let totalDamage = 0;

    while (this.accumulator >= FOUNDRY_FIXED_DT) {
      const res = stepFoundrySimulation(
        this.state,
        FOUNDRY_FIXED_DT,
        {
          playerLocalX: localX,
          playerLocalZ: localZ,
          playerSpeed,
          isBoosting,
        },
        this.bus,
      );
      totalDamage += res.playerDamageTaken;
      this.accumulator -= FOUNDRY_FIXED_DT;
    }

    this.renderer.sync(this.state);
    this.notify(false);
    return { playerDamageTaken: totalDamage, insideFoundry: true };
  }

  public performAttack(kind: Exclude<AttackKind, 'none'>): boolean {
    const ok = startPlayerAttack(this.state, kind);
    if (ok) this.notify(true);
    return ok;
  }

  public performDodge(): boolean {
    const ok = triggerPlayerDodge(this.state, this.bus);
    if (ok) this.notify(true);
    return ok;
  }

  public performParry(): boolean {
    const ok = triggerPlayerParry(this.state, this.bus);
    if (ok) {
      this.savePersisted();
      this.notify(true);
    }
    return ok;
  }

  public performJump(): boolean {
    const ok = triggerPlayerJump(this.state);
    if (ok) this.notify(true);
    return ok;
  }

  public setBlocking(active: boolean): boolean {
    const prev = this.state.resources.blocking;
    const next = setPlayerBlocking(this.state, active);
    if (prev !== next) this.notify(true);
    return next;
  }

  public castDiscipline(discipline?: SoulDisciplineId): { cast: boolean; message: string } {
    const res = castSoulDisciplineSkill(
      this.state,
      discipline ?? this.state.resources.primaryDiscipline,
      this.bus,
    );
    if (res.cast) {
      this.savePersisted();
      this.notify(true);
    }
    return res;
  }

  public selectDisciplines(primary: SoulDisciplineId, secondary: SoulDisciplineId | null): void {
    this.state.resources.primaryDiscipline = primary;
    this.state.resources.secondaryDiscipline = secondary === primary ? null : secondary;
    this.savePersisted();
    this.notify(true);
  }

  public updateGearPuzzle(
    patch: Partial<Pick<GearPuzzleState, 'gear1Radius' | 'gear2Radius' | 'gear3Radius' | 'reverseIdlerEngaged'>>,
  ): void {
    updateGearPuzzleConfig(this.state, patch, this.bus);
    this.notify(true);
  }

  public toggleSwitch(which: 'switchA' | 'switchB' | 'switchC'): void {
    toggleEnergySwitch(this.state, which, this.bus);
    this.notify(true);
  }

  public adjustValve(openRatio: number): void {
    setHydraulicValve(this.state, openRatio, this.bus);
    this.notify(true);
  }

  public resetFoundryEncounter(): void {
    const saved = exportFoundryPersistedState(this.state);
    this.state = createInitialFoundryState({
      ...saved,
      colossusDefeated: false,
    });
    this.renderer.sync(this.state);
    this.notify(true);
  }

  private loadPersisted(): Partial<FoundryPersistedState> | undefined {
    try {
      if (typeof window === 'undefined') return undefined;
      const raw = window.localStorage.getItem(FOUNDRY_STORAGE_KEY);
      if (!raw) return undefined;
      const parsed = JSON.parse(raw) as Partial<FoundryPersistedState>;
      return parsed && typeof parsed === 'object' ? parsed : undefined;
    } catch {
      return undefined;
    }
  }

  public savePersisted(): void {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(
        FOUNDRY_STORAGE_KEY,
        JSON.stringify(exportFoundryPersistedState(this.state)),
      );
    } catch {
      // ignore storage quota errors
    }
  }
}
