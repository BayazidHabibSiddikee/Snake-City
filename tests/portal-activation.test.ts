import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PORTAL_ACTIVATION_TRIGGER_RADIUS,
  PORTAL_DISTANCE_HUD_RANGE,
  PORTAL_OPEN_DURATION_SEC,
  PORTAL_VORTEX_VERTEX_SHADER,
  PORTAL_VORTEX_FRAGMENT_SHADER,
  PORTAL_PARTICLE_VERTEX_SHADER,
  PORTAL_PARTICLE_FRAGMENT_SHADER,
  createInitialPortalActivation,
  findNearestPeakPortalInRange,
  getPortalLandmark,
  getPortalRequiredRank,
  stepPortalActivation,
  type PortalActivationSnapshot,
} from '../src/portalActivation.ts';
import { buildPeakPortalNetwork } from '../src/formations.ts';

test('all 12 Trial Peak portals map cleanly to Cultivation Ranks 1 through 12', () => {
  const portals = buildPeakPortalNetwork('mountain', 0);
  assert.equal(portals.length, 12);

  const ranks = portals.map((p) => getPortalRequiredRank(p.id));
  assert.deepEqual(ranks, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

  for (const portal of portals) {
    const lm = getPortalLandmark(portal.id);
    assert.ok(lm, `expected landmark metadata for ${portal.id}`);
    assert.equal(lm.tier, getPortalRequiredRank(portal.id));
  }
});

test('portal remains strictly sealed when player cultivation rank is below required rank', () => {
  const portalId = 'peak-portal-6-grand-glacier';
  let state = createInitialPortalActivation(portalId);

  // Player at Rank 5 stands right inside the portal threshold (2m away)
  for (let i = 0; i < 40; i++) {
    const step = stepPortalActivation(state, 5, 2.0, 0.1);
    state = step.snapshot;
    assert.equal(step.justStartedOpening, false);
    assert.equal(step.justFinishedOpening, false);
    assert.equal(step.snapshot.phase, 'sealed');
    assert.equal(step.snapshot.unlocked, false);
    assert.equal(step.snapshot.canEnter, false);
    assert.equal(step.snapshot.openProgress, 0);
    assert.equal(step.snapshot.vortexAperture, 0);
    assert.equal(step.snapshot.screenOpacity, 0);
  }
});

test('reaching required rank triggers staged awakening -> igniting -> open visual sequence', () => {
  const portalId = 'peak-portal-6-grand-glacier';
  let state = createInitialPortalActivation(portalId);

  // Player reaches Rank 6 but is still far away (80m) — stays dormant until approached
  const farStep = stepPortalActivation(state, 6, 80, 0.1);
  state = farStep.snapshot;
  assert.equal(farStep.justStartedOpening, false);
  assert.equal(farStep.snapshot.unlocked, true);
  assert.equal(farStep.snapshot.phase, 'sealed');
  assert.equal(farStep.snapshot.canEnter, false);

  // Player enters activation radius -> triggers opening sequence (cannot passively enter immediately!)
  const startStep = stepPortalActivation(state, 6, PORTAL_ACTIVATION_TRIGGER_RADIUS - 2, 0.1);
  state = startStep.snapshot;
  assert.equal(startStep.justStartedOpening, true);
  assert.equal(startStep.snapshot.phase, 'awakening');
  assert.equal(startStep.snapshot.canEnter, false);
  assert.ok(startStep.snapshot.ringSpinSpeed > 0.5);

  // Mid-sequence -> enters igniting phase with expanding vortex aperture & shockwave flash
  let sawIgniting = false;
  let peakShockwave = 0;
  let finishCount = 0;
  const totalSteps = Math.ceil((PORTAL_OPEN_DURATION_SEC + 0.5) / 0.1);
  for (let i = 0; i < totalSteps; i++) {
    const step = stepPortalActivation(state, 6, 12, 0.1);
    state = step.snapshot;
    if (step.snapshot.phase === 'igniting') sawIgniting = true;
    if (step.snapshot.shockwaveFlash > peakShockwave) {
      peakShockwave = step.snapshot.shockwaveFlash;
    }
    if (step.justFinishedOpening) finishCount++;
  }

  assert.ok(sawIgniting, 'expected portal to pass through igniting phase');
  assert.ok(peakShockwave > 0.7, `expected strong ignition shockwave flash, got ${peakShockwave}`);
  assert.equal(finishCount, 1, 'opening completion event should fire strictly once');
  assert.equal(state.phase, 'open');
  assert.equal(state.openProgress, 1);

  const finalCheck = stepPortalActivation(state, 6, 4, 0.05);
  assert.equal(finalCheck.snapshot.canEnter, true);
  assert.equal(finalCheck.snapshot.vortexAperture, 1);
  assert.equal(finalCheck.snapshot.screenOpacity, 1);
});

test('custom 3D portal vortex and GPU particle GLSL shaders declare required uniforms & attributes', () => {
  assert.match(PORTAL_VORTEX_VERTEX_SHADER, /varying vec2 vUv;/);
  for (const u of ['uTime', 'uOpenProgress', 'uVortexAperture', 'uShockwave', 'uUnlocked', 'uPeakAccent']) {
    assert.ok(PORTAL_VORTEX_FRAGMENT_SHADER.includes(u), `vortex shader missing ${u}`);
  }
  for (const a of ['aAngle', 'aRadius', 'aHeight', 'aSpeed', 'aSeed', 'aSize']) {
    assert.ok(PORTAL_PARTICLE_VERTEX_SHADER.includes(a), `particle vertex shader missing ${a}`);
  }
  assert.ok(PORTAL_PARTICLE_FRAGMENT_SHADER.includes('gl_PointCoord'));
});

test('findNearestPeakPortalInRange returns nearest peak name & distance only within configured range', () => {
  const portals = buildPeakPortalNetwork('mountain', 0);
  const peak1 = portals[0];
  const peak2 = portals[1];
  assert.ok(peak1 && peak2);

  // Far away from all 12 portals -> returns null so HUD stays clean
  const outOfRange = findNearestPeakPortalInRange(portals, 9999, 9999, 1);
  assert.equal(outOfRange, null);

  // Standing 20m away from Peak 2's portal -> resolves Peak 2 with exact distance & rank lock
  const nearPeak2 = findNearestPeakPortalInRange(
    [
      { id: 'custom-wall-1', type: 'wall', x: peak2.x, z: peak2.z },
      { id: 'builder-portal-1', type: 'portalA', x: peak2.x + 2, z: peak2.z },
      ...portals,
    ],
    peak2.x + 20,
    peak2.z,
    1,
  );
  assert.ok(nearPeak2, 'expected Peak 2 portal within range');
  assert.equal(nearPeak2.portalId, peak2.id);
  assert.equal(nearPeak2.peakTier, 2);
  assert.equal(nearPeak2.peakName, 'Pinecrest Lookout');
  assert.equal(nearPeak2.distanceMeters, 20);
  assert.equal(nearPeak2.requiredRank, 2);
  assert.equal(nearPeak2.unlocked, false);
  assert.equal(nearPeak2.phase, 'sealed');
  assert.ok(
    nearPeak2.proximityFrac > 0.7 && nearPeak2.proximityFrac < 1,
    `expected proximityFrac between 0.7 and 1, got ${nearPeak2.proximityFrac}`,
  );

  // When player meets rank and activation snapshot is open, HUD info reflects open status
  let state = createInitialPortalActivation(peak1.id);
  for (let i = 0; i < 40; i++) {
    state = stepPortalActivation(state, 3, 10, 0.1).snapshot;
  }
  const activations = new Map<string, PortalActivationSnapshot>([[peak1.id, state as PortalActivationSnapshot]]);
  const nearOpenPeak1 = findNearestPeakPortalInRange(
    portals,
    peak1.x,
    peak1.z + 12,
    3,
    activations,
    PORTAL_DISTANCE_HUD_RANGE,
  );
  assert.ok(nearOpenPeak1);
  assert.equal(nearOpenPeak1.peakName, 'Whispering Foothill');
  assert.equal(nearOpenPeak1.distanceMeters, 12);
  assert.equal(nearOpenPeak1.unlocked, true);
  assert.equal(nearOpenPeak1.phase, 'open');
});
