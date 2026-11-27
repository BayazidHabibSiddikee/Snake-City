import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  COMBAT_TEXT_STYLES,
  CombatTextBillboardSystem,
  computeBillboardDistanceScale,
  evaluateCombatTextMotion,
  formatCombatTextLabel,
  type CombatTextKind,
} from '../src/combatText.ts';

test('formatCombatTextLabel formats all combat and resource kinds cleanly', () => {
  assert.equal(formatCombatTextLabel('damage', 48.4), '-48');
  assert.equal(formatCombatTextLabel('damage', 0), 'HIT');
  assert.equal(formatCombatTextLabel('crit', 124.7), '✦ 125!');
  assert.equal(formatCombatTextLabel('crit', 0), '✦ CRIT!');
  assert.equal(formatCombatTextLabel('qi_absorbed', 16), '+16 Qi absorbed');
  assert.equal(formatCombatTextLabel('qi_absorbed', 42), '+42 Qi absorbed');
  assert.equal(formatCombatTextLabel('qi_absorbed', 0), 'Qi absorbed');
  assert.equal(formatCombatTextLabel('vitality', 22), '+22 HP');
  assert.equal(formatCombatTextLabel('player_damage', 19.6), '-20 HP');
  assert.equal(formatCombatTextLabel('xp', 100), '+100 XP');
  assert.equal(formatCombatTextLabel('damage', 99, '  WARD BROKEN  '), 'WARD BROKEN');
});

test('COMBAT_TEXT_STYLES uses ballistic arcs for damage and buoyant rise for resources', () => {
  const kinds: CombatTextKind[] = [
    'damage',
    'crit',
    'qi_absorbed',
    'vitality',
    'player_damage',
    'xp',
  ];
  for (const kind of kinds) {
    const style = COMBAT_TEXT_STYLES[kind];
    assert.ok(style.lifeSec > 0.5, `${kind} should stay readable > 0.5s`);
    assert.ok(style.launchVy > 0, `${kind} should launch upward`);
    assert.ok(style.baseScale > 0, `${kind} should have positive baseScale`);
  }

  // Damage hits pop with gravity; resource pickups float buoyantly
  assert.equal(COMBAT_TEXT_STYLES.damage.buoyant, false);
  assert.ok(COMBAT_TEXT_STYLES.damage.gravity > 0);
  assert.equal(COMBAT_TEXT_STYLES.crit.buoyant, false);
  assert.ok(COMBAT_TEXT_STYLES.crit.gravity > 0);
  assert.equal(COMBAT_TEXT_STYLES.player_damage.buoyant, false);
  assert.ok(COMBAT_TEXT_STYLES.player_damage.gravity > 0);

  assert.equal(COMBAT_TEXT_STYLES.qi_absorbed.buoyant, true);
  assert.equal(COMBAT_TEXT_STYLES.qi_absorbed.gravity, 0);
  assert.equal(COMBAT_TEXT_STYLES.vitality.buoyant, true);
  assert.equal(COMBAT_TEXT_STYLES.xp.buoyant, true);
});

test('evaluateCombatTextMotion punches in, holds solid plateau, then fades to zero', () => {
  const start = evaluateCombatTextMotion(0, 1.0, 2.5, 'crit');
  const peak = evaluateCombatTextMotion(0.14, 1.0, 2.5, 'crit');
  const mid = evaluateCombatTextMotion(0.45, 1.0, 2.5, 'crit');
  const late = evaluateCombatTextMotion(0.85, 1.0, 2.5, 'crit');
  const end = evaluateCombatTextMotion(1.0, 1.0, 2.5, 'crit');

  assert.ok(peak.scale > start.scale, 'crit pop should expand sharply from spawn');
  assert.ok(peak.scale > 2.5, 'crit pop should overshoot baseScale on impact');
  assert.equal(mid.opacity, 1, 'mid-life billboard must remain fully opaque');
  assert.ok(late.opacity < mid.opacity && late.opacity > 0, 'late-life billboard should fade smoothly');
  assert.equal(end.opacity, 0, 'expired billboard must fade to 0 opacity');

  const critPeak = evaluateCombatTextMotion(0.14, 1.0, 2.5, 'crit').scale;
  const qiPeak = evaluateCombatTextMotion(0.14, 1.0, 2.5, 'qi_absorbed').scale;
  assert.ok(critPeak > qiPeak, 'crit strikes should overshoot more dramatically than Qi pickups');
});

test('computeBillboardDistanceScale scales monotonically within safe near/far bounds', () => {
  const near = computeBillboardDistanceScale(4, 2.5);
  const mid = computeBillboardDistanceScale(26, 2.5);
  const far = computeBillboardDistanceScale(90, 2.5);
  const extreme = computeBillboardDistanceScale(600, 2.5);

  assert.ok(near < mid, 'mid-distance scale should exceed near scale');
  assert.ok(mid <= far, 'far scale should be >= mid scale');
  assert.ok(extreme <= 2.5 * 2.35 + 0.001, 'extreme distance scale must stay clamped');
  assert.ok(near >= 2.5 * 0.76 - 0.001, 'near distance scale must respect lower clamp');
});

test('CombatTextBillboardSystem safely initializes, updates, clears, and disposes in headless Node', () => {
  const system = new CombatTextBillboardSystem(4);
  assert.equal(system.group.name, 'combatTextBillboards');
  assert.doesNotThrow(() => {
    system.spawn({ x: 4, y: 12, z: -8, kind: 'qi_absorbed', value: 16 });
    system.update(0.016, new THREE.Vector3(0, 14, 20));
    system.clear();
    system.dispose();
  });
});
