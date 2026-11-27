import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CameraShake } from '../src/game/engine/CameraShake.ts';

describe('CameraShake (src/game/engine/CameraShake.ts)', () => {
  it('applies positional and rotational Three.js camera offsets when triggered and reverts cleanly with zero drift', () => {
    const shake = new CameraShake();
    shake.setReducedMotionOverride(false);

    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);
    const basePos = new THREE.Vector3(10, 15, 25);
    camera.position.copy(basePos);
    camera.lookAt(0, 5, 0);
    const baseQuat = camera.quaternion.clone();

    shake.triggerDamage(0.65, 1, 0);
    assert.equal(shake.isActive(), true);
    assert.ok(shake.getTrauma() > 0.7);

    const sample = shake.update(1 / 60);
    assert.ok(sample.intensity > 0);

    const applied = shake.applyToCamera(camera);
    assert.equal(applied, true);
    assert.ok(camera.position.distanceTo(basePos) > 0.01, 'camera position should be offset during shake');
    assert.ok(camera.quaternion.angleTo(baseQuat) > 0.0005, 'camera orientation should be offset during shake');

    // Reverting restores the exact base position so damped camera tracking never drifts
    shake.revertFromCamera(camera);
    assert.ok(camera.position.distanceTo(basePos) < 1e-6, 'revertFromCamera must restore exact camera position');
  });

  it('decays trauma smoothly to zero over time', () => {
    const shake = new CameraShake();
    shake.setReducedMotionOverride(false);

    shake.triggerCultivationMove('ultimate', 1.1);
    const peakTrauma = shake.getTrauma();
    assert.ok(peakTrauma >= 0.85);

    for (let i = 0; i < 120; i++) {
      shake.update(1 / 60);
    }

    assert.equal(shake.getTrauma(), 0);
    assert.equal(shake.isActive(), false);
  });

  it('scales trauma and amplitude across cultivation move profiles and damage ratios', () => {
    const lightDamage = new CameraShake();
    lightDamage.setReducedMotionOverride(false);
    lightDamage.triggerDamage(0.15, 0, 1);

    const heavyDamage = new CameraShake();
    heavyDamage.setReducedMotionOverride(false);
    heavyDamage.triggerDamage(0.9, 0, 1);

    assert.ok(heavyDamage.getTrauma() > lightDamage.getTrauma());

    const dash = new CameraShake();
    dash.setReducedMotionOverride(false);
    dash.triggerCultivationMove('dash', 1.0);

    const ultimate = new CameraShake();
    ultimate.setReducedMotionOverride(false);
    ultimate.triggerCultivationMove('ultimate', 1.0);

    const breakthrough = new CameraShake();
    breakthrough.setReducedMotionOverride(false);
    breakthrough.triggerCultivationMove('breakthrough', 1.0);

    assert.ok(ultimate.getTrauma() > dash.getTrauma());
    assert.ok(breakthrough.getTrauma() > dash.getTrauma());
  });

  it('scales offsets down cleanly when prefers-reduced-motion is active and supports reset/disable', () => {
    const normalShake = new CameraShake({ reducedMotionScale: 0.2 });
    normalShake.setReducedMotionOverride(false);
    normalShake.triggerCultivationMove('shockwave', 1.0);
    const normalSample = normalShake.update(0.03);

    const reducedShake = new CameraShake({ reducedMotionScale: 0.2 });
    reducedShake.setReducedMotionOverride(true);
    reducedShake.triggerCultivationMove('shockwave', 1.0);
    const reducedSample = reducedShake.update(0.03);

    assert.ok(reducedSample.intensity > 0);
    assert.ok(reducedSample.intensity < normalSample.intensity * 0.3);

    const cam = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    cam.position.set(1, 2, 3);
    normalShake.applyToCamera(cam);
    normalShake.reset(cam);
    assert.equal(normalShake.isActive(), false);
    assert.ok(cam.position.distanceTo(new THREE.Vector3(1, 2, 3)) < 1e-6);

    normalShake.setEnabled(false);
    normalShake.triggerDamage(0.8);
    assert.equal(normalShake.isActive(), false);
  });
});
