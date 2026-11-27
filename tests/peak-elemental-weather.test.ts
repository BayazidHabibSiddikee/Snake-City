import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { WORLD_LANDMARKS } from '../src/terrain.ts';
import {
  PEAK_ELEMENTAL_THEMES,
  PEAK_WEATHER_FRAGMENT_SHADER,
  PEAK_WEATHER_VERTEX_SHADER,
  PeakElementalParticleSystem,
  createPeakWeatherSample,
  samplePeakElementalWeather,
} from '../src/game/engine/PeakElementalWeather.ts';

test('PEAK_ELEMENTAL_THEMES covers all 12 Trial Peaks with distinct elemental lighting, fog, and particle themes', () => {
  assert.equal(WORLD_LANDMARKS.length, 12);
  const particleKinds = new Set<string>();

  for (const lm of WORLD_LANDMARKS) {
    const theme = PEAK_ELEMENTAL_THEMES[lm.id];
    assert.ok(theme, `missing elemental weather theme for ${lm.id}`);
    assert.equal(theme.tier, lm.tier);
    assert.ok(theme.elementName.length > 0);
    assert.ok(theme.influenceRadius >= 60);
    assert.ok(theme.particleOpacity > 0.5 && theme.particleOpacity <= 1);
    particleKinds.add(theme.particleKind);
  }

  // Must span petals, snow, embers, sparks/mist, and celestial starlight across the 12 peaks
  assert.ok(particleKinds.has('petal'));
  assert.ok(particleKinds.has('snow'));
  assert.ok(particleKinds.has('ember'));
  assert.ok(particleKinds.has('spark'));
  assert.ok(particleKinds.has('celestial'));
});

test('samplePeakElementalWeather transitions smoothly between falling petals, glacial snow, and volcanic embers', () => {
  const foothill = WORLD_LANDMARKS.find((l) => l.id === 'whispering-foothill')!;
  const glacier = WORLD_LANDMARKS.find((l) => l.id === 'grand-glacier')!;
  const obsidian = WORLD_LANDMARKS.find((l) => l.id === 'obsidian-saddle')!;
  const crown = WORLD_LANDMARKS.find((l) => l.id === 'crown-of-humanity')!;

  const sPetal = samplePeakElementalWeather(foothill.x, foothill.z);
  assert.equal(sPetal.dominantLandmarkId, 'whispering-foothill');
  assert.ok(sPetal.influence > 0.95);
  assert.ok(sPetal.petalWeight > 0.8, `expected petal weight > 0.8 on Foothill, got ${sPetal.petalWeight}`);
  assert.ok(sPetal.particleVelY < 0, 'petals should gently drift downward');

  const sSnow = samplePeakElementalWeather(glacier.x, glacier.z);
  assert.equal(sSnow.dominantLandmarkId, 'grand-glacier');
  assert.ok(sSnow.influence > 0.95);
  assert.ok(sSnow.snowWeight > 0.8, `expected snow weight > 0.8 on Glacier, got ${sSnow.snowWeight}`);
  assert.notEqual(sSnow.fogHex, sPetal.fogHex, 'glacial fog color should differ from blossom valley fog');

  const sEmber = samplePeakElementalWeather(obsidian.x, obsidian.z);
  assert.equal(sEmber.dominantLandmarkId, 'obsidian-saddle');
  assert.ok(sEmber.emberWeight > 0.85);
  assert.ok(sEmber.particleVelY > 0, 'volcanic embers should rise upward');

  const sCrown = samplePeakElementalWeather(crown.x, crown.z);
  assert.equal(sCrown.dominantLandmarkId, 'crown-of-humanity');
  assert.ok(sCrown.celestialWeight > 0.85);

  // Midpoint between Whispering Foothill (petals) and Grand Glacier (snow) blends both continuously
  const midX = (foothill.x + glacier.x) * 0.5;
  const midZ = (foothill.z + glacier.z) * 0.5;
  const sMid = samplePeakElementalWeather(midX, midZ);
  assert.ok(sMid.petalWeight > 0.1 && sMid.snowWeight > 0.1, 'midpoint should smoothly blend petal & snow weights');
  assert.ok(sMid.influence > 0.25 && sMid.influence <= 1);
});

test('PeakElementalParticleSystem uses a single GPU BufferGeometry draw call and smoothly damps uniforms', () => {
  const sys = new PeakElementalParticleSystem(320, 2);
  assert.ok(sys.points instanceof THREE.Points);
  assert.ok(sys.geometry instanceof THREE.BufferGeometry);
  assert.equal(sys.geometry.attributes.position.count, 320);
  assert.equal(sys.geometry.attributes.aSeed.count, 320);
  assert.equal(sys.geometry.attributes.aFlutter.count, 320);

  assert.match(PEAK_WEATHER_VERTEX_SHADER, /attribute vec2 aFlutter;/);
  assert.match(PEAK_WEATHER_FRAGMENT_SHADER, /uniform vec4 uShapeWeights;/);
  assert.match(PEAK_WEATHER_FRAGMENT_SHADER, /uniform float uCelestialWeight;/);

  const glacier = WORLD_LANDMARKS.find((l) => l.id === 'grand-glacier')!;
  const scratch = createPeakWeatherSample();
  samplePeakElementalWeather(glacier.x, glacier.z, scratch);

  for (let i = 0; i < 30; i++) {
    sys.update(0.05, i * 0.05, glacier.x, 22, glacier.z, scratch, 2, 1.0);
  }

  assert.equal(sys.points.visible, true);
  const shapeWeights = sys.material.uniforms.uShapeWeights.value as THREE.Vector4;
  assert.ok(shapeWeights.y > 0.75, `expected damped snow weight > 0.75, got ${shapeWeights.y}`);
  assert.ok((sys.material.uniforms.uOpacity.value as number) > 0.65);

  assert.doesNotThrow(() => sys.dispose());
});
