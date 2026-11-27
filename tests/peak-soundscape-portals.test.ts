import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PORTAL_NETWORK_TARGET_COUNT,
  PRESET_FORMATIONS,
  buildPeakPortalNetwork,
  generateRandomPortalNetwork,
  shiftPortalsAfterMission,
} from '../src/formations.ts';
import { WORLD_LANDMARKS } from '../src/terrain.ts';
import {
  CULTIVATION_PEAK_SOUNDSCAPES,
  computePeakTierSoundscapeParams,
} from '../src/audio.ts';

test('portal network contains strictly 12 portals anchored to the 12 Trial Peaks and none near spawn', () => {
  assert.equal(PORTAL_NETWORK_TARGET_COUNT, 12);
  assert.equal(WORLD_LANDMARKS.length, 12);

  for (const biome of ['mountain', 'jungle'] as const) {
    const peakPortals = buildPeakPortalNetwork(biome, 0);
    assert.equal(peakPortals.length, 12, `expected 12 portals for ${biome}`);

    for (const portal of peakPortals) {
      const distFromSpawn = Math.hypot(portal.x, portal.z);
      assert.ok(
        distFromSpawn >= 36,
        `portal ${portal.id} at (${portal.x}, ${portal.z}) is too close to spawn (${distFromSpawn.toFixed(1)}m)`,
      );
      const distFromStartLane = Math.hypot(portal.x - 0, portal.z - -12);
      assert.ok(
        distFromStartLane >= 24,
        `portal ${portal.id} must not block starting lane (dist ${distFromStartLane.toFixed(1)}m)`,
      );
    }

    // Verify preset formations carry no hardcoded spawn portals and generateRandomPortalNetwork returns strictly 12
    for (const preset of PRESET_FORMATIONS) {
      const presetHardcodedPortals = preset.props.filter(
        (p) => p.type === 'portalA' || p.type === 'portalB',
      );
      assert.equal(presetHardcodedPortals.length, 0, `preset ${preset.id} should have no hardcoded portals`);

      const merged = generateRandomPortalNetwork(preset.props, biome, PORTAL_NETWORK_TARGET_COUNT);
      const mergedPortals = merged.filter((p) => p.type === 'portalA' || p.type === 'portalB');
      assert.equal(mergedPortals.length, 12, `merged ${preset.id} (${biome}) must have strictly 12 portals`);
    }
  }
});

test('shiftPortalsAfterMission maintains strictly 12 portals and shifts the completed peak portal', () => {
  const initial = generateRandomPortalNetwork([], 'mountain', PORTAL_NETWORK_TARGET_COUNT);
  const targetPortal = initial.find((p) => p.type === 'portalA' || p.type === 'portalB');
  assert.ok(targetPortal);

  const result = shiftPortalsAfterMission(initial, 'mountain', {
    completedPortalKey: targetPortal.id,
    playerX: targetPortal.x,
    playerZ: targetPortal.z,
    targetPortalCount: PORTAL_NETWORK_TARGET_COUNT,
    shiftSequence: 1,
  });

  const nextPortals = result.nextProps.filter((p) => p.type === 'portalA' || p.type === 'portalB');
  assert.equal(nextPortals.length, 12, 'must preserve strictly 12 portals after shift');
  assert.ok(result.shifted.length >= 1, 'completed peak portal should relocate to a fresh terrace');
});

test('cultivation peak environmental soundscapes cover all 12 Trial Peaks and adapt to player tier', () => {
  assert.equal(CULTIVATION_PEAK_SOUNDSCAPES.length, 12);

  for (const lm of WORLD_LANDMARKS) {
    const matched = CULTIVATION_PEAK_SOUNDSCAPES.find((p) => p.peakId === lm.id);
    assert.ok(matched, `missing peak soundscape profile for ${lm.id}`);
  }

  // Proximity scales pad & air gain monotonically
  const far = computePeakTierSoundscapeParams('grand-glacier', 6, 0, 6, 'mountain');
  const near = computePeakTierSoundscapeParams('grand-glacier', 6, 0.9, 6, 'mountain');
  assert.equal(far.padGain, 0);
  assert.ok(near.padGain > far.padGain);
  assert.ok(near.airGain > far.airGain);

  // Under-tiered player hears harmonic tension; mastery-tiered player hears higher consonant brightness
  const underTier = computePeakTierSoundscapeParams('crown-of-humanity', 12, 0.85, 2, 'mountain');
  const masterTier = computePeakTierSoundscapeParams('crown-of-humanity', 12, 0.85, 12, 'mountain');
  assert.ok(underTier.harmonicTension01 > 0.5);
  assert.equal(underTier.masteryResonance, false);
  assert.equal(masterTier.harmonicTension01, 0);
  assert.equal(masterTier.masteryResonance, true);
  assert.ok(masterTier.padFilterHz > underTier.padFilterHz);
  assert.ok(masterTier.overtoneGain > underTier.overtoneGain);
});
