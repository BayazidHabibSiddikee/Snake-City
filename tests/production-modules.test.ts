import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  DailyBudgetTracker,
  fetchWithSafeRedirects,
  isBlockedHostnameSyntax,
  isPrivateOrReservedIp,
  readResponseBodyWithLimit,
  resolveAndValidateHost,
  resolveTrustedParentOrigin,
  ShortTtlCache,
  SlidingWindowRateLimiter,
  validateProxyUrl,
} from '../server/security.ts';
import { resolveInitialStartupMode } from '../src/app/router.ts';
import { GameplayEventBus } from '../src/game/core/EventBus.ts';
import {
  adjustSoulEnergy,
  applyBossDamage,
  castSoulDisciplineSkill,
  createInitialFoundryState,
  exportFoundryPersistedState,
  FOUNDRY_FIXED_DT,
  resolveActiveSynergy,
  setHydraulicValve,
  setPlayerBlocking,
  startPlayerAttack,
  stepFoundrySimulation,
  toggleEnergySwitch,
  triggerPlayerDodge,
  triggerPlayerJump,
  triggerPlayerParry,
  updateGearPuzzleConfig,
} from '../src/game/foundry/FoundrySimulation.ts';

describe('Production Security Module (server/security.ts) — SSRF, Redirects, Limits & Abuse Guards', () => {
  it('blocks private IPv4, loopback, cloud metadata, CGNAT, IPv6 ULA/link-local, and IPv4-mapped IPv6 addresses', () => {
    const blockedIps = [
      '127.0.0.1',
      '10.0.0.1',
      '172.16.4.2',
      '192.168.1.25',
      '169.254.169.254',
      '100.64.0.1',
      '0.0.0.0',
      '::1',
      'fe80::1',
      'fc00::1',
      'fd12:3456::1',
      '::ffff:127.0.0.1',
      '::ffff:7f00:1',
      '::ffff:169.254.169.254',
    ];
    for (const ip of blockedIps) {
      assert.equal(isPrivateOrReservedIp(ip), true, `Expected IP ${ip} to be blocked`);
    }
    assert.equal(isPrivateOrReservedIp('93.184.216.34'), false);
    assert.equal(isPrivateOrReservedIp('2606:2800:220:1:248:1893:25c8:1946'), false);
  });

  it('rejects alternate IP encodings, restricted ports, credentials, and non-HTTP schemes', () => {
    assert.equal(isBlockedHostnameSyntax('2130706433'), true);
    assert.equal(isBlockedHostnameSyntax('0x7f000001'), true);
    assert.equal(isBlockedHostnameSyntax('0177.0.0.1'), true);
    assert.equal(isBlockedHostnameSyntax('metadata.google.internal'), true);

    assert.equal(validateProxyUrl('file:///etc/passwd').ok, false);
    assert.equal(validateProxyUrl('https://user:pass@example.com/').ok, false);
    assert.equal(validateProxyUrl('https://example.com:6379/').ok, false);
    assert.equal(validateProxyUrl('http://localhost:3000/').ok, false);
    assert.equal(validateProxyUrl('https://example.com/article').ok, true);
  });

  it('blocks DNS rebinding or private A/AAAA answers in resolveAndValidateHost and across redirect hops', async () => {
    const evilLookup = async (host: string) => {
      if (host === 'rebind.attacker.test') {
        return [{ address: '169.254.169.254', family: 4 }];
      }
      return [{ address: '93.184.216.34', family: 4 }];
    };

    const rebindCheck = await resolveAndValidateHost('rebind.attacker.test', evilLookup);
    assert.equal(rebindCheck.ok, false);

    const publicCheck = await resolveAndValidateHost('example.com', evilLookup);
    assert.equal(publicCheck.ok, true);

    // Public host 302-redirects to internal loopback -> MUST be rejected before second fetch!
    let fetchCalls = 0;
    const mockFetch: typeof fetch = async () => {
      fetchCalls += 1;
      return new Response('', {
        status: 302,
        headers: { location: 'http://127.0.0.1:8080/internal-secret' },
      });
    };

    await assert.rejects(
      () =>
        fetchWithSafeRedirects('https://example.com/start', {
          headers: {},
          lookupFn: evilLookup,
          fetchFn: mockFetch,
        }),
      /private|restricted|Blocked/i,
    );
    assert.equal(fetchCalls, 1);
  });

  it('caps streaming upstream response bodies cleanly without buffering unbounded payloads', async () => {
    const bigPayload = 'A'.repeat(20_000);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        for (let i = 0; i < bigPayload.length; i += 2048) {
          controller.enqueue(encoder.encode(bigPayload.slice(i, i + 2048)));
        }
        controller.close();
      },
    });
    const res = new Response(stream, { headers: { 'content-type': 'text/html' } });
    const out = await readResponseBodyWithLimit(res, 4096);
    assert.equal(out.truncated, true);
    assert.equal(out.bytesRead, 4096);
    assert.equal(out.text.length, 4096);
  });

  it('enforces per-IP sliding-window rate limits, daily AI budgets, TTL caching, and trusted parent origins', () => {
    const limiter = new SlidingWindowRateLimiter(2, 60_000);
    assert.equal(limiter.check('1.2.3.4', 1000).allowed, true);
    assert.equal(limiter.check('1.2.3.4', 2000).allowed, true);
    const third = limiter.check('1.2.3.4', 3000);
    assert.equal(third.allowed, false);
    assert.ok(third.retryAfterSec >= 1);
    assert.equal(limiter.check('1.2.3.4', 62_000).allowed, true);

    const budget = new DailyBudgetTracker(2);
    assert.equal(budget.consume(Date.UTC(2026, 10, 26, 12)).allowed, true);
    assert.equal(budget.consume(Date.UTC(2026, 10, 26, 13)).allowed, true);
    assert.equal(budget.consume(Date.UTC(2026, 10, 26, 14)).allowed, false);
    assert.equal(budget.consume(Date.UTC(2026, 10, 27, 0, 1)).allowed, true);

    const cache = new ShortTtlCache<string>(1000);
    cache.set('k', 'hello', 5000);
    assert.equal(cache.get('k', 5500), 'hello');
    assert.equal(cache.get('k', 6100), null);

    assert.equal(
      resolveTrustedParentOrigin('https://snake-city.app', undefined, 'localhost:3000', 'https'),
      'https://snake-city.app',
    );
  });
});

describe('Modular App Router (src/app/router.ts)', () => {
  it('routes ?mode=browser and saved startupMode=browser independently without initializing Three.js', () => {
    assert.equal(resolveInitialStartupMode('?mode=browser', null), 'browser');
    assert.equal(resolveInitialStartupMode('?mode=game', null), 'game');
    assert.equal(
      resolveInitialStartupMode('', {
        getItem: () => JSON.stringify({ settings: { startupMode: 'browser' } }),
      }),
      'browser',
    );
    assert.equal(resolveInitialStartupMode('', { getItem: () => null }), 'menu');
  });
});

describe('Production Forgotten Soul Foundry Simulation (EventBus + FoundrySimulation.ts)', () => {
  it('registers each attack hit strictly once per active window and enforces heavy-attack commitment', () => {
    const bus = new GameplayEventBus();
    const state = createInitialFoundryState();
    const guardian = state.enemies.find((e) => e.id === 'foundry_guardian')!;
    const initialHp = guardian.hp;

    // Position player right next to Soul Guardian and execute light attack
    assert.equal(startPlayerAttack(state, 'light'), true);
    // Run across STARTUP + entire ACTIVE window (0.45s = 27 fixed ticks)
    let totalHits = 0;
    for (let i = 0; i < 27; i += 1) {
      const res = stepFoundrySimulation(
        state,
        FOUNDRY_FIXED_DT,
        { playerLocalX: guardian.localX - 2, playerLocalZ: guardian.localZ, playerSpeed: 0 },
        bus,
      );
      totalHits += res.enemyHits;
    }
    assert.equal(totalHits, 1, 'Single light attack must register strictly one hit');
    assert.ok(guardian.hp < initialHp);

    // Heavy attack cannot be canceled by dodge mid-startup
    state.resources.attackPhase = 'IDLE';
    state.resources.sp = 100;
    assert.equal(startPlayerAttack(state, 'heavy'), true);
    assert.equal(triggerPlayerDodge(state, bus), false);
  });

  it('never lets Soul Energy go negative and rewards Perfect Parry & Soul Clan Dual-Discipline Synergy', () => {
    const bus = new GameplayEventBus();
    const state = createInitialFoundryState();
    adjustSoulEnergy(state, -999);
    assert.equal(state.resources.se, 0);

    // Activate Soulguard + Soulweaver synergy ("Aegis Snare")
    state.resources.primaryDiscipline = 'soulguard';
    state.resources.secondaryDiscipline = 'soulweaver';
    assert.equal(resolveActiveSynergy('soulguard', 'soulweaver')?.name, 'Aegis Snare');

    const guardian = state.enemies.find((e) => e.id === 'foundry_guardian')!;
    guardian.state = 'WINDUP';
    state.playerLocalX = guardian.localX - 3;
    state.playerLocalZ = guardian.localZ;

    let parryEvents = 0;
    bus.on('combat.parry', () => {
      parryEvents += 1;
    });
    assert.equal(triggerPlayerParry(state, bus), true);
    assert.equal(parryEvents, 1);
    assert.equal(guardian.state, 'STAGGERED');
    assert.ok(guardian.chainedTimer > 0, 'Aegis Snare should chain parried attacker');
    assert.ok(state.resources.se >= 28);

    const castRes = castSoulDisciplineSkill(state, 'soulguard', bus);
    assert.equal(castRes.cast, true);
    assert.ok(state.resources.se >= 0);
  });

  it('solves Gear Synchronization (ω1r1 = ω2r2), Energy Routing (V=IR) + Overload, Hydraulics (F=PA), and persists state', () => {
    const bus = new GameplayEventBus();
    const solvedPuzzles: string[] = [];
    bus.on('foundry.puzzle_solved', (ev) => solvedPuzzles.push(ev.puzzleId));

    const state = createInitialFoundryState();
    // Gear puzzle: driveRpm=36, target=-18 -> r1=1, r2=2, r3=2, reverse=true
    const gSolved = updateGearPuzzleConfig(
      state,
      { gear1Radius: 1, gear2Radius: 2, gear3Radius: 2, reverseIdlerEngaged: true },
      bus,
    );
    assert.equal(gSolved.computedOutputRpm, -18);
    assert.equal(gSolved.solved, true);

    // Energy puzzle: Switch A + C triggers overload (>16A); turning C off & B on delivers clean 10A 2/2 receivers
    toggleEnergySwitch(state, 'switchA', bus);
    const overloaded = toggleEnergySwitch(state, 'switchC', bus);
    assert.equal(overloaded.overloaded, true);
    assert.equal(overloaded.deliveredEnergy, 0);

    toggleEnergySwitch(state, 'switchC', bus); // clear short-circuit
    const clean = toggleEnergySwitch(state, 'switchB', bus);
    assert.equal(clean.overloaded, false);
    assert.equal(clean.receiversPowered, 2);
    assert.equal(clean.solved, true);

    // Hydraulic bridge balancing
    setHydraulicValve(state, 1.0, bus);
    for (let i = 0; i < 180; i += 1) {
      stepFoundrySimulation(
        state,
        FOUNDRY_FIXED_DT,
        { playerLocalX: 0, playerLocalZ: -54, playerSpeed: 0 },
        bus,
      );
    }
    assert.equal(state.hydraulics.bridgeRaised, true);
    assert.deepEqual(solvedPuzzles, ['gear_sync', 'energy_routing', 'hydraulic_bridge']);

    // Persistence round-trip survives reload
    const saved = exportFoundryPersistedState(state);
    const reloaded = createInitialFoundryState(saved);
    assert.equal(reloaded.gearPuzzle.solved, true);
    assert.equal(reloaded.energyPuzzle.solved, true);
    assert.equal(reloaded.hydraulics.bridgeRaised, true);
  });

  it('lets mechanical rotating blades damage lured enemies and transitions Colossus boss phases strictly once each', () => {
    const bus = new GameplayEventBus();
    const state = createInitialFoundryState();
    const phaseEvents: Array<1 | 2 | 3> = [];
    bus.on('boss.phase_changed', (ev) => phaseEvents.push(ev.nextPhase));

    // Place enemy directly inside Saw Assembly Beta blade arc
    const blade = state.blades[1];
    const enemy = state.enemies[0];
    enemy.localX = blade.localX + Math.cos(blade.angleRad) * 3.5;
    enemy.localZ = blade.localZ + Math.sin(blade.angleRad) * 3.5;
    const enemyStartHp = enemy.hp;

    stepFoundrySimulation(
      state,
      FOUNDRY_FIXED_DT,
      { playerLocalX: 0, playerLocalZ: -54, playerSpeed: 0 },
      bus,
    );
    assert.ok(enemy.hp < enemyStartHp, 'Rotating blade trap should damage lured enemy');

    // Boss transitions Phase 1 -> 2 -> 3 strictly once each, and Energy Routing overheats Phase 2 shield
    applyBossDamage(state, 180, bus); // HP drops below 65% -> Phase 2 Shielded
    assert.equal(state.boss.phase, 2);
    assert.equal(state.boss.shieldActive, true);
    assert.deepEqual(phaseEvents, [2]);

    // Route Switches A + B -> overheats Phase 2 shield!
    toggleEnergySwitch(state, 'switchA', bus);
    toggleEnergySwitch(state, 'switchB', bus);
    assert.equal(state.boss.shieldActive, false);
    assert.equal(state.boss.state, 'OVERHEATED_VULNERABLE');

    applyBossDamage(state, 120, bus); // Drops below 30% -> Phase 3
    assert.equal(state.boss.phase, 3);
    assert.deepEqual(phaseEvents, [2, 3]);

    // Extra damage in Phase 3 does not re-emit phase transitions
    applyBossDamage(state, 200, bus);
    assert.equal(state.boss.defeated, true);
    assert.deepEqual(phaseEvents, [2, 3]);
  });

  it('transitions cleanly through Jump, Wall-Run, and Landing kinematics and mitigates damage while Blocking', () => {
    const bus = new GameplayEventBus();
    const state = createInitialFoundryState();

    // Jump near Foundry outer wall (radius = 48m >= 43m) at speed 12 m/s -> JUMPING -> WALL_RUN -> LANDING
    assert.equal(triggerPlayerJump(state), true);
    assert.equal(state.resources.movementState, 'JUMPING');
    let sawWallRun = false;
    let sawLanding = false;
    for (let i = 0; i < 120; i += 1) {
      stepFoundrySimulation(
        state,
        FOUNDRY_FIXED_DT,
        { playerLocalX: 48, playerLocalZ: 0, playerSpeed: 12 },
        bus,
      );
      if (state.resources.movementState === 'WALL_RUN') sawWallRun = true;
      if (state.resources.movementState === 'LANDING') {
        sawLanding = true;
        break;
      }
    }
    assert.equal(sawWallRun, true, 'Airborne player near Foundry wall should enter WALL_RUN');
    assert.equal(sawLanding, true, 'Touchdown should transition cleanly into LANDING');
    assert.equal(state.playerLocalY, 0);

    // Block reduces incoming melee damage by 60% (12 -> 5) and drains stamina
    const blockState = createInitialFoundryState();
    const guardian = blockState.enemies.find((e) => e.id === 'foundry_guardian')!;
    guardian.state = 'WINDUP';
    guardian.stateTimer = 0.01;
    assert.equal(setPlayerBlocking(blockState, true), true);
    const spBefore = blockState.resources.sp;
    const res = stepFoundrySimulation(
      blockState,
      FOUNDRY_FIXED_DT,
      { playerLocalX: guardian.localX - 3, playerLocalZ: guardian.localZ, playerSpeed: 0 },
      bus,
    );
    assert.equal(res.playerDamageTaken, 5, 'Blocking should mitigate 12 melee damage down to 5');
    assert.ok(blockState.resources.sp < spBefore, 'Blocking a hit should consume stamina');
  });

  it('lets Soul Engineer AI sprint to Conduit Surge Plate, keeps failed puzzles uncorrupted, and stays frame-rate consistent (30Hz vs 60Hz)', () => {
    const bus = new GameplayEventBus();
    const plateEvents: string[] = [];
    bus.on('pressure_plate.activated', (ev) => plateEvents.push(`${ev.plateId}:${ev.actorId}`));

    // Soul Engineer sees player near conduit zone and runs onto plate_conduit to trigger trap!
    const aiState = createInitialFoundryState();
    for (let i = 0; i < 120; i += 1) {
      stepFoundrySimulation(
        aiState,
        FOUNDRY_FIXED_DT,
        { playerLocalX: 2, playerLocalZ: 4, playerSpeed: 0 },
        bus,
      );
    }
    assert.ok(
      plateEvents.includes('plate_conduit:foundry_engineer'),
      'Soul Engineer AI should activate plate_conduit when player is in conduit zone',
    );
    assert.ok(aiState.conduitActiveTimer > 0);

    // Failed puzzle attempts (over-torqued gear + overloaded circuit) do not corrupt state and remain recoverable
    const pState = createInitialFoundryState();
    const overTorqued = updateGearPuzzleConfig(
      pState,
      { gear1Radius: 1, gear2Radius: 1, gear3Radius: 4, reverseIdlerEngaged: true },
      bus,
    );
    assert.equal(overTorqued.overTorqued, true);
    assert.equal(overTorqued.solved, false);
    const recoveredGear = updateGearPuzzleConfig(
      pState,
      { gear1Radius: 1, gear2Radius: 2, gear3Radius: 2, reverseIdlerEngaged: true },
      bus,
    );
    assert.equal(recoveredGear.overTorqued, false);
    assert.equal(recoveredGear.solved, true);

    // Frame-rate independence: 1.0s elapsed at 30Hz (30 steps) vs 60Hz (60 steps) yields identical blade angle & hydraulics
    const state30 = createInitialFoundryState();
    const state60 = createInitialFoundryState();
    setHydraulicValve(state30, 0.75);
    setHydraulicValve(state60, 0.75);
    for (let i = 0; i < 30; i += 1) {
      stepFoundrySimulation(state30, 1 / 30, { playerLocalX: 0, playerLocalZ: -54, playerSpeed: 0 });
    }
    for (let i = 0; i < 60; i += 1) {
      stepFoundrySimulation(state60, 1 / 60, { playerLocalX: 0, playerLocalZ: -54, playerSpeed: 0 });
    }
    assert.ok(
      Math.abs(state30.blades[0].angleRad - state60.blades[0].angleRad) < 1e-6,
      'Blade angle θ(t) must be identical across 30Hz and 60Hz ticks',
    );
    assert.ok(
      Math.abs(state30.hydraulics.tankBLevel - state60.hydraulics.tankBLevel) <= 0.3,
      'Hydraulic tank levels must converge closely across 30Hz and 60Hz ticks',
    );
  });
});
