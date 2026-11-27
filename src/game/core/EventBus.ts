/**
 * Strongly-typed event bus linking mechanical traps, hydraulic valves, electrical
 * circuits, combat actions, Soul Clan disciplines, enemy AI, and boss phases.
 */
export interface FoundryEventMap {
  'pressure_plate.activated': {
    plateId: string;
    actorId: string;
    force: number;
  };
  'pressure_plate.released': {
    plateId: string;
  };
  'valve.adjusted': {
    valveId: string;
    openRatio: number;
    flowRate: number;
  };
  'gear.meshed': {
    outputRpm: number;
    torqueLoad: number;
    synchronized: boolean;
  };
  'circuit.routed': {
    receiverPoweredCount: number;
    overloaded: boolean;
    totalCurrent: number;
  };
  'circuit.overloaded': {
    reason: string;
  };
  'trap.damaged_entity': {
    trapId: string;
    trapKind: 'blade' | 'conduit' | 'shockwave';
    targetId: string;
    damage: number;
  };
  'combat.parry': {
    attackerId: string;
    soulEnergyGain: number;
  };
  'combat.dodge': {
    perfect: boolean;
    soulEnergyGain: number;
  };
  'combat.finisher': {
    targetId: string;
    soulEnergyGain: number;
  };
  'soul.discipline_cast': {
    discipline: 'soulblade' | 'soulguard' | 'soulshade' | 'soulweaver';
    synergy?: string;
    costSe: number;
  };
  'boss.phase_changed': {
    bossId: string;
    previousPhase: 1 | 2 | 3;
    nextPhase: 1 | 2 | 3;
  };
  'foundry.puzzle_solved': {
    puzzleId: 'gear_sync' | 'energy_routing' | 'hydraulic_bridge';
    rewardSe: number;
  };
  'foundry.boss_defeated': {
    bossId: string;
    unlockedRank: string;
  };
}

export type FoundryEventName = keyof FoundryEventMap;
export type FoundryEventHandler<K extends FoundryEventName> = (
  payload: FoundryEventMap[K],
) => void;

export class GameplayEventBus {
  private readonly listeners = new Map<
    FoundryEventName,
    Set<FoundryEventHandler<FoundryEventName>>
  >();
  private readonly recentEvents: Array<{ name: FoundryEventName; at: number }> = [];

  public on<K extends FoundryEventName>(
    event: K,
    handler: FoundryEventHandler<K>,
  ): () => void {
    let bucket = this.listeners.get(event);
    if (!bucket) {
      bucket = new Set();
      this.listeners.set(event, bucket);
    }
    bucket.add(handler as FoundryEventHandler<FoundryEventName>);
    return () => {
      bucket?.delete(handler as FoundryEventHandler<FoundryEventName>);
    };
  }

  public emit<K extends FoundryEventName>(
    event: K,
    payload: FoundryEventMap[K],
  ): void {
    this.recentEvents.push({ name: event, at: Date.now() });
    if (this.recentEvents.length > 40) {
      this.recentEvents.shift();
    }
    const bucket = this.listeners.get(event);
    if (!bucket || bucket.size === 0) return;
    for (const fn of [...bucket]) {
      fn(payload);
    }
  }

  public getRecentEvents(): ReadonlyArray<{ name: FoundryEventName; at: number }> {
    return this.recentEvents;
  }

  public clear(): void {
    this.listeners.clear();
    this.recentEvents.length = 0;
  }
}
