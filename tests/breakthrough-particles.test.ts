import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  BREAKTHROUGH_FRAGMENT_SHADER,
  BREAKTHROUGH_LAYER_COUNTS,
  BREAKTHROUGH_TOTAL_PARTICLES,
  BREAKTHROUGH_VERTEX_SHADER,
  BreakthroughParticleSystem,
} from '../src/breakthroughParticles.ts';

test('BreakthroughParticleSystem packs all 6 energy layers into a single BufferGeometry & 1 draw call', () => {
  const sys = new BreakthroughParticleSystem(2);

  assert.equal(sys.getDrawCallCount(), 1, 'entire breakthrough burst must execute in 1 draw call');
  assert.ok(sys.geometry instanceof THREE.BufferGeometry);
  assert.ok(sys.points instanceof THREE.Points);
  assert.equal(sys.particleCount, BREAKTHROUGH_TOTAL_PARTICLES);
  assert.equal(sys.particleCount, 960);

  // Only 1 renderable Points object (plus non-draw PointLight) in the breakthrough group
  const drawables = sys.group.children.filter(
    (c) => c instanceof THREE.Mesh || c instanceof THREE.Points || c instanceof THREE.Line,
  );
  assert.equal(drawables.length, 1);
  assert.equal(sys.group.visible, false, 'inactive breakthrough group should stay hidden (0 draw calls)');

  // Verify all custom BufferAttributes are properly sized
  const posAttr = sys.geometry.getAttribute('position') as THREE.BufferAttribute;
  const velAttr = sys.geometry.getAttribute('aVelocity') as THREE.BufferAttribute;
  const colAttr = sys.geometry.getAttribute('aColor') as THREE.BufferAttribute;
  const timeAttr = sys.geometry.getAttribute('aTiming') as THREE.BufferAttribute;
  const paramAttr = sys.geometry.getAttribute('aParams') as THREE.BufferAttribute;

  assert.equal(posAttr.count, BREAKTHROUGH_TOTAL_PARTICLES);
  assert.equal(velAttr.count, BREAKTHROUGH_TOTAL_PARTICLES);
  assert.equal(colAttr.count, BREAKTHROUGH_TOTAL_PARTICLES);
  assert.equal(timeAttr.count, BREAKTHROUGH_TOTAL_PARTICLES);
  assert.equal(paramAttr.count, BREAKTHROUGH_TOTAL_PARTICLES);
  assert.equal(timeAttr.itemSize, 4);
  assert.equal(paramAttr.itemSize, 4);

  sys.dispose();
});

test('BreakthroughParticleSystem populates all 6 particle modes on spawn and updates only uniforms per frame', () => {
  const sys = new BreakthroughParticleSystem(1.5);
  sys.spawn({
    x: 12,
    y: 18,
    z: -24,
    scaleColorHex: 0x3de095,
    manaColorHex: 0x58e1ff,
    level: 6,
    isHuman: false,
    bodyTrail: [
      { x: 11, y: 17.5, z: -23 },
      { x: 10, y: 17.2, z: -22 },
    ],
  });

  assert.equal(sys.isActive(), true);
  assert.equal(sys.group.visible, true);
  assert.ok(sys.flashLight.intensity > 0);

  // Confirm every layer mode (0..5) is populated with exact counts
  const timeAttr = sys.geometry.getAttribute('aTiming') as THREE.BufferAttribute;
  const modeCounts = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < timeAttr.count; i++) {
    const mode = Math.round(timeAttr.getW(i));
    assert.ok(mode >= 0 && mode <= 5, `mode ${mode} out of bounds`);
    modeCounts[mode]++;
  }
  assert.equal(modeCounts[0], BREAKTHROUGH_LAYER_COUNTS.coreShards);
  assert.equal(modeCounts[1], BREAKTHROUGH_LAYER_COUNTS.crownRing);
  assert.equal(modeCounts[2], BREAKTHROUGH_LAYER_COUNTS.spiritHelix);
  assert.equal(modeCounts[3], BREAKTHROUGH_LAYER_COUNTS.starSparks);
  assert.equal(modeCounts[4], BREAKTHROUGH_LAYER_COUNTS.shockRings);
  assert.equal(modeCounts[5], BREAKTHROUGH_LAYER_COUNTS.skyPillar);

  // Advance frames — uTime advances smoothly without requiring CPU buffer re-uploads
  const posAttr = sys.geometry.getAttribute('position') as THREE.BufferAttribute;
  const versionAfterSpawn = posAttr.version;
  assert.equal(sys.update(0.05), true);
  assert.equal(sys.update(0.05), true);
  assert.equal(posAttr.version, versionAfterSpawn, 'update(dt) must NOT re-upload position buffer per frame');
  assert.ok(Math.abs((sys.material.uniforms.uTime.value as number) - 0.1) < 1e-6);

  // Advance past duration (3.0s) and confirm clean auto-deactivation
  for (let i = 0; i < 40; i++) {
    sys.update(0.1);
  }
  assert.equal(sys.isActive(), false);
  assert.equal(sys.group.visible, false);
  assert.equal(sys.flashLight.intensity, 0);

  sys.dispose();
});

test('Breakthrough GLSL shaders declare required BufferGeometry attributes and uniforms', () => {
  assert.match(BREAKTHROUGH_VERTEX_SHADER, /uniform float uTime;/);
  assert.match(BREAKTHROUGH_VERTEX_SHADER, /uniform float uPixelRatio;/);
  assert.match(BREAKTHROUGH_VERTEX_SHADER, /attribute vec3 aVelocity;/);
  assert.match(BREAKTHROUGH_VERTEX_SHADER, /attribute vec3 aColor;/);
  assert.match(BREAKTHROUGH_VERTEX_SHADER, /attribute vec4 aTiming;/);
  assert.match(BREAKTHROUGH_VERTEX_SHADER, /attribute vec4 aParams;/);
  assert.match(BREAKTHROUGH_FRAGMENT_SHADER, /gl_PointCoord/);
  assert.match(BREAKTHROUGH_FRAGMENT_SHADER, /discard;/);
});
