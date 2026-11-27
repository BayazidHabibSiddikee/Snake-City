import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  COMBAT_LOG_END_HOLD_MS,
  COMBAT_LOG_HIGH_DAMAGE_DEALT,
  COMBAT_LOG_HIGH_DAMAGE_RECEIVED,
  COMBAT_LOG_IDLE_TIMEOUT_MS,
  COMBAT_LOG_MAX_ENTRIES,
  CombatLogTracker,
  formatCombatLogEntry,
  isHighDamageCombatEvent,
  type CombatLogEntry,
} from '../src/combatLog.ts';

test('formatCombatLogEntry formats dealt, crit, parry, defeat, received, and session marker entries', () => {
  const sample = (partial: Omit<CombatLogEntry, 'id' | 'timestampMs' | 'isHighDamage'> & { isHighDamage?: boolean }): CombatLogEntry => ({
    id: 1,
    timestampMs: 1000,
    isHighDamage: partial.isHighDamage ?? isHighDamageCombatEvent(partial.kind, partial.amount, partial.damageRatio),
    ...partial,
  });

  const dealt = formatCombatLogEntry(sample({ kind: 'dealt', amount: 48.4, targetName: 'Dire Ridge Wolf' }));
  assert.equal(dealt.directionLabel, 'Dealt');
  assert.equal(dealt.description, 'Struck Dire Ridge Wolf');
  assert.equal(dealt.deltaText, '-48');
  assert.equal(dealt.isHighDamage, false);
  assert.equal(dealt.isSessionMarker, false);

  const crit = formatCombatLogEntry(
    sample({ kind: 'crit', amount: 142, targetName: 'Ironback Boar', skillName: 'Flame Lotus' }),
  );
  assert.equal(crit.directionLabel, 'Crit');
  assert.equal(crit.description, 'Flame Lotus on Ironback Boar');
  assert.equal(crit.deltaText, '-142!');
  assert.equal(crit.isHighDamage, true);

  const received = formatCombatLogEntry(
    sample({ kind: 'received', amount: 22.6, targetName: 'a Soul Clan chain bolt' }),
  );
  assert.equal(received.directionLabel, 'Taken');
  assert.equal(received.description, 'Soul Clan chain bolt hit you');
  assert.equal(received.deltaText, '-23 HP');
  assert.equal(received.isHighDamage, false);

  const parry = formatCombatLogEntry(
    sample({ kind: 'parry', amount: 18, targetName: 'Peak Guardian' }),
  );
  assert.equal(parry.directionLabel, 'Parry');
  assert.equal(parry.deltaText, '+18 Qi');
  assert.equal(parry.isHighDamage, false);

  const defeat = formatCombatLogEntry(
    sample({ kind: 'defeat', amount: 200, targetName: 'Peak Guardian' }),
  );
  assert.equal(defeat.directionLabel, 'Slain');
  assert.equal(defeat.deltaText, 'KO');

  const startMarker = formatCombatLogEntry(
    sample({ kind: 'combat_start', amount: 0, targetName: 'Peak Guardian' }),
  );
  assert.equal(startMarker.isSessionMarker, true);
  assert.match(startMarker.description, /Combat Start/);

  const endMarker = formatCombatLogEntry(
    sample({ kind: 'combat_end', amount: 210, targetName: 'Encounter', skillName: 'Dealt 210 · Taken 18' }),
  );
  assert.equal(endMarker.isSessionMarker, true);
  assert.match(endMarker.description, /Combat End/);
});

test('isHighDamageCombatEvent highlights high absolute and proportional damage strikes cleanly', () => {
  assert.equal(isHighDamageCombatEvent('dealt', 45, 0.12), false);
  assert.equal(isHighDamageCombatEvent('dealt', COMBAT_LOG_HIGH_DAMAGE_DEALT, 0.12), true);
  assert.equal(isHighDamageCombatEvent('dealt', 42, 0.34), true);

  assert.equal(isHighDamageCombatEvent('crit', 55, 0.1), false);
  assert.equal(isHighDamageCombatEvent('crit', 85, 0.1), true);

  assert.equal(isHighDamageCombatEvent('received', 14, 0.1), false);
  assert.equal(isHighDamageCombatEvent('received', COMBAT_LOG_HIGH_DAMAGE_RECEIVED, 0.1), true);
  assert.equal(isHighDamageCombatEvent('received', 18, 0.25), true);

  assert.equal(isHighDamageCombatEvent('parry', 150, 0.5), false);
  assert.equal(isHighDamageCombatEvent('combat_start', 200, 1), false);
});

test('CombatLogTracker emits Combat Start and Combat End markers, tracks high damage, and manages visibility cleanly', () => {
  const tracker = new CombatLogTracker(
    COMBAT_LOG_MAX_ENTRIES,
    COMBAT_LOG_IDLE_TIMEOUT_MS,
    COMBAT_LOG_END_HOLD_MS,
  );

  // Hidden & idle before any combat occurs
  assert.equal(tracker.getSessionState(), 'idle');
  assert.equal(tracker.isVisible(1000, true, false), false);
  assert.equal(tracker.isVisible(1000, true, true), false);

  // First strike automatically inserts Combat Start marker + strike entry
  const hit1 = tracker.record({ kind: 'dealt', amount: 40, targetName: 'Dire Ridge Wolf' }, 1000);
  assert.equal(hit1.isHighDamage, false);
  assert.equal(tracker.getSessionState(), 'active');
  assert.equal(tracker.getEntries().length, 2);
  assert.equal(tracker.getEntries()[0].kind, 'dealt');
  assert.equal(tracker.getEntries()[1].kind, 'combat_start');

  const critHit = tracker.record(
    { kind: 'crit', amount: 112, targetName: 'Dire Ridge Wolf', skillName: 'Stagger', damageRatio: 0.45 },
    1500,
  );
  assert.equal(critHit.isHighDamage, true);

  const heavyTaken = tracker.record(
    { kind: 'received', amount: 34, targetName: 'Dire Ridge Wolf', damageRatio: 0.3 },
    2000,
  );
  assert.equal(heavyTaken.isHighDamage, true);

  assert.equal(tracker.isVisible(2200, true, false), true);
  assert.equal(tracker.isVisible(2200, false, true), false, 'must stay hidden outside playing mode');

  const summary = tracker.getSummary();
  assert.equal(summary.totalDealt, 152);
  assert.equal(summary.totalReceived, 34);
  assert.equal(summary.hitsDealt, 2);
  assert.equal(summary.hitsReceived, 1);

  // Stays active while hostile remains engaged even past idle timeout
  const stillEngaged = tracker.syncSession(2000 + COMBAT_LOG_IDLE_TIMEOUT_MS + 500, true, true);
  assert.equal(stillEngaged.state, 'active');
  assert.equal(tracker.isVisible(2000 + COMBAT_LOG_IDLE_TIMEOUT_MS + 500, true, true), true);

  // Once hostile disengages past idle timeout -> transitions to 'ended' and appends Combat End marker
  const endTime = 2000 + COMBAT_LOG_IDLE_TIMEOUT_MS + 600;
  const ended = tracker.syncSession(endTime, true, false);
  assert.equal(ended.state, 'ended');
  assert.equal(ended.stateChanged, true);
  assert.equal(tracker.getEntries()[0].kind, 'combat_end');
  // Remains briefly visible during Combat End hold window so player sees the indicator
  assert.equal(tracker.isVisible(endTime + 500, true, false), true);

  // After Combat End hold expires -> settles back to idle and hides
  const idleTime = endTime + COMBAT_LOG_END_HOLD_MS + 100;
  const settled = tracker.syncSession(idleTime, true, false);
  assert.equal(settled.state, 'idle');
  assert.equal(settled.stateChanged, true);
  assert.equal(tracker.isVisible(idleTime, true, false), false);

  // Re-entering combat starts a clean encounter with a fresh Combat Start marker
  tracker.record({ kind: 'dealt', amount: 30, targetName: 'Snow Leopard' }, idleTime + 500);
  assert.equal(tracker.getSessionState(), 'active');
  assert.equal(tracker.getEntries().length, 2);
  assert.equal(tracker.getEntries()[1].kind, 'combat_start');
  assert.equal(tracker.getSummary().totalDealt, 30);
  assert.equal(tracker.getSummary().totalReceived, 0);

  // Rolling buffer caps at max entries
  for (let i = 0; i < 14; i++) {
    tracker.record({ kind: 'dealt', amount: 10, targetName: 'Snow Leopard' }, idleTime + 600 + i * 50);
  }
  assert.equal(tracker.getEntries().length, COMBAT_LOG_MAX_ENTRIES);

  tracker.clear();
  assert.equal(tracker.getEntries().length, 0);
  assert.equal(tracker.getSessionState(), 'idle');
  assert.equal(tracker.isVisible(999999, true, true), false);
});

test('index.css defines Combat Start/End status styling, high-damage highlights, and reduced-motion rules', () => {
  const css = fs.readFileSync(path.resolve('src/index.css'), 'utf8');
  assert.match(css, /\.combat-log-panel\s*\{/);
  assert.match(css, /\.combat-log-panel\.is-visible\s*\{/);
  assert.match(css, /\.combat-log-status\.state-active\s*\{/);
  assert.match(css, /\.combat-log-status\.state-ended\s*\{/);
  assert.match(css, /\.combat-log-row\.kind-combat_start\s*\{/);
  assert.match(css, /\.combat-log-row\.kind-combat_end\s*\{/);
  assert.match(css, /\.combat-log-row\.is-high-damage\.kind-received\s*\{/);
  assert.match(css, /font-variant-numeric:\s*tabular-nums/);
  assert.match(css, /@keyframes combatLogRowEnter/);
  assert.match(css, /@keyframes combatLogHighDmgPop/);
});
