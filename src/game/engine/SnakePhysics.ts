export interface Vector2D {
  x: number;
  z: number;
}

export interface SnakeSegmentNode {
  x: number;
  z: number;
}

export interface SnakeSimulationState {
  head: Vector2D;
  body: SnakeSegmentNode[];
  direction: Vector2D;
  nextDirection: Vector2D;
  speed: number;
  score: number;
  level: number;
  isAlive: boolean;
  vitality: number;
}

/**
 * Creates initial pure snake simulation state.
 */
export function createSnakeSimulationState(startX = 0, startZ = 0): SnakeSimulationState {
  return {
    head: { x: startX, z: startZ },
    body: [
      { x: startX, z: startZ + 1 },
      { x: startX, z: startZ + 2 },
      { x: startX, z: startZ + 3 },
    ],
    direction: { x: 0, z: -1 },
    nextDirection: { x: 0, z: -1 },
    speed: 6.0,
    score: 0,
    level: 1,
    isAlive: true,
    vitality: 100,
  };
}

/**
 * Updates snake heading without allowing instantaneous self-reversal (180-degree flip).
 */
export function setSnakeDirection(state: SnakeSimulationState, dir: Vector2D): boolean {
  // Prevent direct 180 reversal unless single-segment or forced
  if (state.direction.x + dir.x === 0 && state.direction.z + dir.z === 0 && state.body.length > 0) {
    return false;
  }
  state.nextDirection = { x: dir.x, z: dir.z };
  return true;
}

/**
 * Steps the pure snake physics simulation by dt seconds.
 */
export function stepSnakeSimulation(state: SnakeSimulationState, dt: number): void {
  if (!state.isAlive) return;

  state.direction = { ...state.nextDirection };

  const stepDist = state.speed * dt;
  const prevHead = { ...state.head };

  state.head.x += state.direction.x * stepDist;
  state.head.z += state.direction.z * stepDist;

  // Follow-the-leader body segment interpolation
  if (state.body.length > 0) {
    let lead = prevHead;
    for (let i = 0; i < state.body.length; i++) {
      const seg = state.body[i];
      const dx = lead.x - seg.x;
      const dz = lead.z - seg.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const targetDist = 0.6;
      if (dist > targetDist) {
        seg.x += (dx / dist) * (dist - targetDist);
        seg.z += (dz / dist) * (dist - targetDist);
      }
      lead = seg;
    }
  }
}

/**
 * Checks self-collision or world boundary collision.
 */
export function checkSnakeCollisions(state: SnakeSimulationState, boundsRadius = 120): boolean {
  if (Math.abs(state.head.x) > boundsRadius || Math.abs(state.head.z) > boundsRadius) {
    return true; // Out of bounds
  }

  // Self collision
  for (const seg of state.body) {
    const dx = seg.x - state.head.x;
    const dz = seg.z - state.head.z;
    if (dx * dx + dz * dz < 0.35) {
      return true;
    }
  }

  return false;
}
