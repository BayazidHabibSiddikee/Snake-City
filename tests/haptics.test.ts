import assert from 'node:assert/strict';
import test from 'node:test';
import {
  HAPTIC_PATTERNS,
  HAPTIC_SEVERITY_PATTERNS,
  HapticFeedbackEngine,
  computePatternDurationMs,
  getVibrationPatternForSeverity,
  isVibrationApiSupported,
  resolveCombatHitSeverity,
  scaleHapticPattern,
  type HapticEvent,
  type HapticSeverity,
} from '../src/game/engine/HapticFeedback.ts';
import * as legacyHapticsBarrel from '../src/haptics.ts';

test('HAPTIC_SEVERITY_PATTERNS defines escalating subtle patterns across all severity tiers', () => {
  const orderedTiers: HapticSeverity[] = [
    'subtle',
    'moderate',
    'heavy',
    'critical',
    'breakthrough',
  ];

  let prevPriority = 0;
  let prevDuration = 0;
  for (const tier of orderedTiers) {
    const spec = HAPTIC_SEVERITY_PATTERNS[tier];
    assert.ok(spec, `missing severity tier ${tier}`);
    assert.ok(spec.priority > prevPriority, `${tier} priority should strictly increase`);
    prevPriority = spec.priority;

    const totalMs = computePatternDurationMs(spec.pattern);
    assert.ok(totalMs > prevDuration, `${tier} total cadence (${totalMs}ms) should escalate`);
    prevDuration = totalMs;

    for (let i = 0; i < spec.pattern.length; i += 2) {
      assert.ok(
        spec.pattern[i] >= 6 && spec.pattern[i] <= 60,
        `${tier} vibrate pulse[${i}] (${spec.pattern[i]}ms) must stay subtle`,
      );
    }
  }

  assert.deepEqual(
    getVibrationPatternForSeverity('heavy', 1),
    [...HAPTIC_SEVERITY_PATTERNS.heavy.pattern],
  );
  assert.equal(legacyHapticsBarrel.HapticFeedbackEngine, HapticFeedbackEngine);
});

test('resolveCombatHitSeverity escalates cleanly based on damage ratio, crit, defeat, boss, and hit direction', () => {
  assert.equal(resolveCombatHitSeverity({ damageRatio: 0.12 }), 'subtle');
  assert.equal(resolveCombatHitSeverity({ damageRatio: 0.32 }), 'moderate');
  assert.equal(resolveCombatHitSeverity({ damageRatio: 0.15, isBoss: true }), 'moderate');
  assert.equal(resolveCombatHitSeverity({ damageRatio: 0.25, isCrit: true }), 'heavy');
  assert.equal(resolveCombatHitSeverity({ damageRatio: 0.2, isDefeat: true }), 'heavy');
  assert.equal(resolveCombatHitSeverity({ damageRatio: 0.5, isCrit: true }), 'critical');
  assert.equal(resolveCombatHitSeverity({ damageRatio: 0.15, isDefeat: true, isBoss: true }), 'critical');

  // Player incoming hits scale by max-HP chunk lost
  assert.equal(resolveCombatHitSeverity({ damageRatio: 0.1, isPlayerHit: true }), 'moderate');
  assert.equal(resolveCombatHitSeverity({ damageRatio: 0.22, isPlayerHit: true }), 'heavy');
  assert.equal(resolveCombatHitSeverity({ damageRatio: 0.4, isPlayerHit: true }), 'critical');
});

test('HAPTIC_PATTERNS defines subtle, short-pulse sequences for all cultivation and combat events', () => {
  const events = Object.keys(HAPTIC_PATTERNS) as HapticEvent[];
  assert.ok(events.includes('cast_primary'));
  assert.ok(events.includes('cultivation_shockwave'));
  assert.ok(events.includes('cultivation_dash'));
  assert.ok(events.includes('cultivation_ultimate'));
  assert.ok(events.includes('enemy_hit'));
  assert.ok(events.includes('enemy_crit'));
  assert.ok(events.includes('enemy_defeat'));
  assert.ok(events.includes('player_hit'));
  assert.ok(events.includes('evolution_breakthrough'));

  for (const ev of events) {
    const spec = HAPTIC_PATTERNS[ev];
    assert.ok(spec.severity in HAPTIC_SEVERITY_PATTERNS, `${ev} should map to a valid severity tier`);
    assert.ok(spec.pattern.length >= 1, `${ev} should have at least one pulse`);
    assert.ok(spec.priority >= 1 && spec.priority <= 5, `${ev} priority should be 1..5`);
    assert.ok(spec.minIntervalMs >= 50, `${ev} should enforce anti-spam throttling`);
    for (let i = 0; i < spec.pattern.length; i += 2) {
      assert.ok(
        spec.pattern[i] >= 6 && spec.pattern[i] <= 60,
        `${ev} vibrate pulse[${i}] (${spec.pattern[i]}ms) must stay subtle`,
      );
    }
  }
});

test('scaleHapticPattern scales vibration durations while keeping pause gaps intact and bounded', () => {
  const base = [20, 22, 30];
  const boosted = scaleHapticPattern(base, 1.25);
  assert.equal(boosted[0], 25);
  assert.equal(boosted[1], 22, 'pause duration should stay unchanged');
  assert.equal(boosted[2], 38);

  const clampedHigh = scaleHapticPattern([60, 20, 60], 5);
  assert.ok(clampedHigh[0] <= 72, 'vibrate pulse must stay capped at <= 72ms');
  assert.equal(computePatternDurationMs([10, 20, 30]), 60);
});

test('HapticFeedbackEngine dispatches severity-driven combat hits and breakthroughs with priority throttling', () => {
  const calls: Array<number | number[]> = [];
  let now = 1000;
  const engine = new HapticFeedbackEngine({
    vibrateFn: (pattern) => {
      calls.push(pattern);
      return true;
    },
    nowFn: () => now,
    initialEnabled: true,
  });

  // Subtle combat hit fires a short single pulse
  assert.equal(engine.triggerCombatHit({ damageRatio: 0.1 }), true);
  assert.equal(calls.length, 1);
  assert.equal(typeof calls[0], 'number');

  // Breakthrough immediately preempts an active subtle hit with a 5-step cadence
  now += 5;
  assert.equal(engine.triggerBreakthrough(12, true), true);
  assert.equal(calls.length, 2);
  assert.ok(Array.isArray(calls[1]) && calls[1].length === 5);

  // Incoming subtle hit during active breakthrough cadence is suppressed
  now += 30;
  assert.equal(engine.triggerBySeverity('subtle'), false);
  assert.equal(calls.length, 2);

  // After breakthrough finishes, player heavy hit fires cleanly
  now += 250;
  assert.equal(engine.triggerCombatHit({ damageRatio: 0.25, isPlayerHit: true }), true);
  assert.equal(calls.length, 3);
  assert.ok(Array.isArray(calls[2]) && calls[2].length === 3);
});

test('HapticFeedbackEngine invokes Vibration API with priority & cooldown throttling for named events', () => {
  const calls: Array<number | number[]> = [];
  let now = 1000;
  const engine = new HapticFeedbackEngine({
    vibrateFn: (pattern) => {
      calls.push(pattern);
      return true;
    },
    nowFn: () => now,
    initialEnabled: true,
  });

  assert.equal(engine.isSupported(), true);
  assert.equal(engine.isEnabled(), true);

  // Trigger a high-priority ultimate pulse (duration = 24+26+36+24+48 = 158ms, priority 5)
  assert.equal(engine.trigger('cultivation_ultimate'), true);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], [24, 26, 36, 24, 48]);

  // Low-priority primary bolt 30ms later must NOT interrupt the active ultimate sequence
  now += 30;
  assert.equal(engine.trigger('cast_primary'), false);
  assert.equal(calls.length, 1);

  // Once the active ultimate window completes, enemy_hit fires cleanly
  now += 160;
  assert.equal(engine.trigger('enemy_hit'), true);
  assert.equal(calls.length, 2);
  assert.equal(calls[1], 14);

  // Same event within minIntervalMs (60ms) is throttled
  now += 20;
  assert.equal(engine.trigger('enemy_hit'), false);
  assert.equal(calls.length, 2);

  // Higher-priority Counter Clash crit CAN preempt an active lower-priority enemy_hit
  assert.equal(engine.trigger('enemy_crit'), true);
  assert.equal(calls.length, 3);
  assert.deepEqual(calls[2], [20, 18, 32]);
});

test('HapticFeedbackEngine respects enable toggle, cancellation, and unsupported hosts gracefully', () => {
  const calls: Array<number | number[]> = [];
  const engine = new HapticFeedbackEngine({
    vibrateFn: (pattern) => {
      calls.push(pattern);
      return true;
    },
    nowFn: () => 5000,
    initialEnabled: true,
  });

  engine.setEnabled(false, false);
  assert.deepEqual(calls, [0], 'disabling haptics should cancel any active vibration');
  assert.equal(engine.trigger('enemy_hit'), false, 'disabled engine must not vibrate');
  assert.equal(engine.triggerBySeverity('critical'), false, 'disabled engine must not vibrate by severity');

  // Unsupported browser (e.g. desktop / iOS Safari) cleanly no-ops
  assert.equal(isVibrationApiSupported({}), false);
  assert.equal(isVibrationApiSupported({ vibrate: () => true }), true);
  const unsupported = new HapticFeedbackEngine({ vibrateFn: null, initialEnabled: true });
  assert.equal(unsupported.isSupported(), false);
  assert.equal(unsupported.trigger('cultivation_shockwave'), false);
  assert.equal(unsupported.triggerBreakthrough(4), false);
  assert.doesNotThrow(() => unsupported.cancel());
});
