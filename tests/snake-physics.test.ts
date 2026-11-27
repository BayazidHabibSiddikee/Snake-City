import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createSnakeSimulationState,
  setSnakeDirection,
  stepSnakeSimulation,
  checkSnakeCollisions,
} from '../src/game/engine/SnakePhysics.ts';

describe('Pure Snake Simulation & Touch Controller Engine (src/game/engine/)', () => {
  it('initializes snake simulation state correctly', () => {
    const state = createSnakeSimulationState(10, 20);
    assert.equal(state.head.x, 10);
    assert.equal(state.head.z, 20);
    assert.equal(state.isAlive, true);
    assert.equal(state.body.length, 3);
  });

  it('prevents instant 180-degree self-reversal', () => {
    const state = createSnakeSimulationState(0, 0);
    // Initial direction is { x: 0, z: -1 } (moving North)
    const allowed = setSnakeDirection(state, { x: 0, z: 1 }); // Trying to turn South directly
    assert.equal(allowed, false);
    assert.deepEqual(state.nextDirection, { x: 0, z: -1 });

    const validTurn = setSnakeDirection(state, { x: 1, z: 0 }); // Turning East
    assert.equal(validTurn, true);
    assert.deepEqual(state.nextDirection, { x: 1, z: 0 });
  });

  it('steps simulation and updates head position', () => {
    const state = createSnakeSimulationState(0, 0);
    setSnakeDirection(state, { x: 0, z: -1 });
    stepSnakeSimulation(state, 0.5);
    assert.ok(state.head.z < 0);
  });

  it('detects boundary collisions correctly', () => {
    const state = createSnakeSimulationState(130, 0);
    assert.equal(checkSnakeCollisions(state, 120), true);
  });
});
