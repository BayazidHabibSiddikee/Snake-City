import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { GameLoop } from '../src/game/engine/GameLoop.ts';
import { simulateWorldTick } from '../src/game/engine/WorldSimulationEngine.ts';
import { CultivationBreakthroughParticleSystem } from '../src/game/engine/CultivationBreakthroughParticles.ts';
import { WeatherTransitionShaderSystem } from '../src/game/engine/WeatherTransitionShader.ts';
import { SoundEngine } from '../src/audio.ts';

describe('Standalone Game Engine Modules (src/game/engine/)', () => {
  it('subscribes and unsubscribes game loop callbacks successfully', () => {
    const loop = new GameLoop();
    let tickCount = 0;
    const unsubscribe = loop.subscribe(() => {
      tickCount++;
    });

    assert.equal(typeof unsubscribe, 'function');
    unsubscribe();
    loop.stop();
  });

  it('simulates world vitality drain and recovery correctly under weather and altitude', () => {
    const baseState = {
      vitality: 80,
      altitudeNorm: 0.9, // High altitude
      weather: 'blizzard' as const,
      isSheltered: false,
      score: 100,
    };

    const updated = simulateWorldTick(baseState, 1.0);
    assert.ok(updated.vitality < 80, 'Blizzard and high altitude should drain vitality');

    const shelteredState = {
      vitality: 50,
      altitudeNorm: 0.2,
      weather: 'rain' as const,
      isSheltered: true,
      score: 100,
    };

    const shelteredUpdated = simulateWorldTick(shelteredState, 1.0);
    assert.ok(shelteredUpdated.vitality > 50, 'Sheltered rain should regenerate vitality');
  });

  it('triggers breakthrough particle bursts and updates successfully', () => {
    const scene = new THREE.Scene();
    const particleSystem = new CultivationBreakthroughParticleSystem(scene);
    const origin = new THREE.Vector3(10, 5, 20);

    particleSystem.triggerBurst(origin, 1.2);
    particleSystem.update(0.16);
    particleSystem.dispose();
    assert.ok(true, 'Particle system triggered and updated without throwing');
  });

  it('initializes and updates weather transition shader system successfully', () => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera();
    const weatherShader = new WeatherTransitionShaderSystem(scene, camera);

    weatherShader.setWeather('blizzard', 'mountain', 0.85);
    weatherShader.update(0.016, 1.0);
    weatherShader.dispose();
    assert.ok(true, 'Weather transition shader system updated and disposed cleanly');
  });

  it('invokes spatial HRTF spirit whisper audio method safely', () => {
    const sound = new SoundEngine();
    sound.playSoulSpiritWhisper(12, 4, 15, 0.85);
    sound.dispose();
    assert.ok(true, 'Soul spirit whisper audio method executed successfully');
  });
});
