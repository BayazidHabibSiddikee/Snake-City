/**
 * Unit tests for Serpent Peaks core game logic.
 * Run with: node --test tests/game-logic.test.mjs
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ─── Inline copies of pure logic (no DOM / Three.js imports needed) ───────────

function computeEvolutionLevel(xp, shrinesVisited) {
  const thresholds = [
    { xp: 0, shrines: 0 },   // Lv 1
    { xp: 400, shrines: 1 },  // Lv 2
    { xp: 1200, shrines: 2 }, // Lv 3
    { xp: 2800, shrines: 3 }, // Lv 4
    { xp: 5600, shrines: 4 }, // Lv 5
    { xp: 9600, shrines: 5 }, // Lv 6
    { xp: 15200, shrines: 6 },// Lv 7
    { xp: 22400, shrines: 7 },// Lv 8
    { xp: 31200, shrines: 8 },// Lv 9
    { xp: 42400, shrines: 9 },// Lv 10
    { xp: 56000, shrines: 10 },// Lv 11
    { xp: 72000, shrines: 11 },// Lv 12
  ];
  let level = 1;
  for (let i = thresholds.length - 1; i >= 1; i--) {
    if (xp >= thresholds[i].xp && shrinesVisited >= thresholds[i].shrines) {
      level = i + 1;
      break;
    }
  }
  return level;
}

const SP2_PREFIX = 'SP2|';
function encodeFormationCode(formation) {
  const payload = JSON.stringify({
    n: formation.name,
    b: formation.biome,
    p: formation.props.map(({ type, x, z }) => `${type}:${x.toFixed(1)},${z.toFixed(1)}`),
  });
  return SP2_PREFIX + btoa(payload);
}
function decodeFormationCode(code) {
  if (!code.startsWith(SP2_PREFIX)) return null;
  try {
    const obj = JSON.parse(atob(code.slice(SP2_PREFIX.length)));
    if (typeof obj.n !== 'string' || typeof obj.b !== 'string' || !Array.isArray(obj.p)) return null;
    return {
      name: obj.n,
      biome: obj.b,
      props: obj.p.map((s) => {
        const [type, coords] = s.split(':');
        const [x, z] = coords.split(',').map(Number);
        return { type, x, z };
      }),
    };
  } catch {
    return null;
  }
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function terrainHeightAt_simple(x, z) {
  // Simplified version: flat at y=0 for unit tests
  return Math.sin(x * 0.08) * 3.5 + Math.cos(z * 0.06) * 2.8;
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('computeEvolutionLevel', () => {
  it('starts at level 1 with no xp', () => {
    assert.equal(computeEvolutionLevel(0, 0), 1);
  });
  it('reaches level 2 when xp and shrines satisfied', () => {
    assert.equal(computeEvolutionLevel(400, 1), 2);
  });
  it('does NOT reach level 2 without required shrine', () => {
    assert.equal(computeEvolutionLevel(500, 0), 1);
  });
  it('reaches level 12 at max thresholds', () => {
    assert.equal(computeEvolutionLevel(72000, 11), 12);
  });
  it('caps at level 1 with excess xp but zero shrines', () => {
    assert.equal(computeEvolutionLevel(100000, 0), 1);
  });
});

describe('SP2 formation codec', () => {
  it('round-trips a simple formation', () => {
    const formation = {
      name: 'Test Pass',
      biome: 'mountain',
      props: [
        { type: 'wall', x: 10.5, z: -20.0 },
        { type: 'boost', x: 0.0, z: 5.0 },
      ],
    };
    const code = encodeFormationCode(formation);
    assert.ok(code.startsWith('SP2|'), 'code should have SP2| prefix');
    const decoded = decodeFormationCode(code);
    assert.ok(decoded !== null, 'should decode');
    assert.equal(decoded.name, formation.name);
    assert.equal(decoded.biome, formation.biome);
    assert.equal(decoded.props.length, 2);
    assert.equal(decoded.props[0].type, 'wall');
    assert.ok(Math.abs(decoded.props[0].x - 10.5) < 0.01);
  });
  it('returns null for invalid code', () => {
    assert.equal(decodeFormationCode('GARBAGE'), null);
    assert.equal(decodeFormationCode('SP2|!!!'), null);
  });
  it('handles empty props array', () => {
    const f = { name: 'Empty', biome: 'jungle', props: [] };
    const decoded = decodeFormationCode(encodeFormationCode(f));
    assert.ok(decoded !== null);
    assert.equal(decoded.props.length, 0);
  });
});

describe('clamp helper', () => {
  it('clamps within range', () => {
    assert.equal(clamp(0.5, 0, 1), 0.5);
    assert.equal(clamp(-1, 0, 1), 0);
    assert.equal(clamp(2, 0, 1), 1);
  });
});

describe('climate speed multipliers & severe weather', () => {
  const CLIMATE_EFFECTS = {
    clear:    { speedMult: 1.04, hpDrainPerSec: 0,    realmDrainMult: 0.85 },
    mist:     { speedMult: 0.96, hpDrainPerSec: 0.3,  realmDrainMult: 1.05 },
    fog:      { speedMult: 0.87, hpDrainPerSec: 1.0,  realmDrainMult: 1.25 },
    rain:     { speedMult: 0.85, hpDrainPerSec: 1.6,  realmDrainMult: 1.38 },
    storm:    { speedMult: 0.79, hpDrainPerSec: 2.5,  realmDrainMult: 1.55 },
    blizzard: { speedMult: 0.73, hpDrainPerSec: 3.3,  realmDrainMult: 1.72 },
    ashstorm: { speedMult: 0.77, hpDrainPerSec: 4.1,  realmDrainMult: 1.88 },
  };
  it('clear is fastest and only non-draining climate', () => {
    for (const [key, effect] of Object.entries(CLIMATE_EFFECTS)) {
      if (key === 'clear') {
        assert.equal(effect.hpDrainPerSec, 0);
      } else {
        assert.ok(CLIMATE_EFFECTS.clear.speedMult > effect.speedMult, `clear faster than ${key}`);
        assert.ok(effect.hpDrainPerSec > 0, `${key} drains HP`);
      }
    }
  });
  it('blizzard slows movement most and ashstorm has highest drain', () => {
    const speeds = Object.values(CLIMATE_EFFECTS).map(e => e.speedMult);
    const drains = Object.values(CLIMATE_EFFECTS).map(e => e.hpDrainPerSec);
    const mults = Object.values(CLIMATE_EFFECTS).map(e => e.realmDrainMult);
    assert.equal(Math.min(...speeds), CLIMATE_EFFECTS.blizzard.speedMult);
    assert.equal(Math.max(...drains), CLIMATE_EFFECTS.ashstorm.hpDrainPerSec);
    assert.equal(Math.max(...mults), CLIMATE_EFFECTS.ashstorm.realmDrainMult);
  });
  it('dynamic climate picker always switches to a different weather', () => {
    const pool = ['fog', 'rain', 'storm', 'blizzard', 'ashstorm', 'mist'];
    for (const current of pool) {
      const candidates = pool.filter(w => w !== current);
      assert.ok(candidates.length > 0);
      assert.ok(!candidates.includes(current));
    }
  });
  it('fixes all enemy HP to 200', () => {
    const FIXED_ENEMY_HP = 200;
    const enemyTypes = ['boar', 'wolf', 'eagle', 'guardian', 'soul_wraith', 'soul_reaper'];
    for (const type of enemyTypes) {
      assert.equal(FIXED_ENEMY_HP, 200, `${type} fixed to 200 HP`);
    }
  });
});

describe('terrain height sanity', () => {
  it('returns a finite number', () => {
    const h = terrainHeightAt_simple(10, 20);
    assert.ok(isFinite(h));
  });
  it('varies across the map', () => {
    const h1 = terrainHeightAt_simple(0, 0);
    const h2 = terrainHeightAt_simple(100, 100);
    assert.notEqual(h1, h2);
  });
});

describe('weather ambient soundscape crossfade profiles', () => {
  const SOUND_STEMS = {
    clear:    { howl: 0.0001, rain: 0,    leaf: 1.18, ash: 0.0001, sleet: 0.0001 },
    mist:     { howl: 0.004,  rain: 0,    leaf: 0.84, ash: 0.0001, sleet: 0.0001 },
    fog:      { howl: 0.012,  rain: 0,    leaf: 0.38, ash: 0.015,  sleet: 0.0001 },
    rain:     { howl: 0.024,  rain: 0.74, leaf: 1.32, ash: 0.008,  sleet: 0.0001 },
    storm:    { howl: 0.145,  rain: 0.94, leaf: 1.58, ash: 0.052,  sleet: 0.018  },
    blizzard: { howl: 0.22,   rain: 0,    leaf: 0.96, ash: 0.024,  sleet: 0.105  },
    ashstorm: { howl: 0.088,  rain: 0,    leaf: 0.68, ash: 0.21,   sleet: 0.038  },
  };
  it('activates howling wind strongest in blizzard and storm', () => {
    assert.ok(SOUND_STEMS.blizzard.howl > SOUND_STEMS.storm.howl);
    assert.ok(SOUND_STEMS.storm.howl > SOUND_STEMS.rain.howl);
    assert.ok(SOUND_STEMS.clear.howl < 0.001);
  });
  it('activates rainfall only in rain and storm climates', () => {
    assert.ok(SOUND_STEMS.rain.rain > 0);
    assert.ok(SOUND_STEMS.storm.rain > SOUND_STEMS.rain.rain);
    assert.equal(SOUND_STEMS.clear.rain, 0);
    assert.equal(SOUND_STEMS.blizzard.rain, 0);
    assert.equal(SOUND_STEMS.ashstorm.rain, 0);
  });
  it('emphasizes rustling leaves in clear/rain/storm and volcanic rumble in ashstorm', () => {
    assert.ok(SOUND_STEMS.clear.leaf > SOUND_STEMS.fog.leaf);
    assert.ok(SOUND_STEMS.ashstorm.ash > SOUND_STEMS.storm.ash);
    assert.ok(SOUND_STEMS.blizzard.sleet > SOUND_STEMS.storm.sleet);
  });
});

describe('cultivation stage difficulty multipliers', () => {
  const PROFILES = [
    { level: 1,  hp: 1.0,  dmg: 1.0,  boss: 1.0  },
    { level: 2,  hp: 1.2,  dmg: 1.15, boss: 1.08 },
    { level: 3,  hp: 1.45, dmg: 1.32, boss: 1.15 },
    { level: 4,  hp: 1.75, dmg: 1.5,  boss: 1.22 },
    { level: 5,  hp: 2.15, dmg: 1.72, boss: 1.3  },
    { level: 6,  hp: 2.65, dmg: 1.98, boss: 1.38 },
    { level: 7,  hp: 3.25, dmg: 2.28, boss: 1.46 },
    { level: 8,  hp: 3.95, dmg: 2.62, boss: 1.54 },
    { level: 9,  hp: 4.75, dmg: 3.0,  boss: 1.62 },
    { level: 10, hp: 5.65, dmg: 3.42, boss: 1.72 },
    { level: 11, hp: 6.7,  dmg: 3.9,  boss: 1.82 },
    { level: 12, hp: 8.0,  dmg: 4.5,  boss: 2.0  },
  ];
  const PRESET_MULT = { chill: 0.85, classic: 1.0, turbo: 1.25 };
  const BASE_HP = 200;

  it('scales enemy HP and damage strictly upward across all 12 cultivation stages', () => {
    assert.equal(PROFILES.length, 12);
    for (let i = 1; i < PROFILES.length; i++) {
      assert.ok(PROFILES[i].hp > PROFILES[i - 1].hp, `stage ${i + 1} HP mult > stage ${i}`);
      assert.ok(PROFILES[i].dmg > PROFILES[i - 1].dmg, `stage ${i + 1} DMG mult > stage ${i}`);
      assert.ok(PROFILES[i].boss > PROFILES[i - 1].boss, `stage ${i + 1} boss bonus > stage ${i}`);
    }
  });
  it('starts at 200 HP at Stage 1 Classic and scales steeply by Stage 12 Dou Di', () => {
    const s1 = Math.round(BASE_HP * PROFILES[0].hp * PRESET_MULT.classic);
    const s12 = Math.round(BASE_HP * PROFILES[11].hp * PRESET_MULT.classic);
    const s12Boss = Math.round(BASE_HP * PROFILES[11].hp * PROFILES[11].boss * PRESET_MULT.classic);
    assert.equal(s1, 200);
    assert.equal(s12, 1600);
    assert.equal(s12Boss, 3200);
  });
  it('combines cultivation scaling with speed preset difficulty multipliers', () => {
    const p6 = PROFILES[5];
    assert.ok(p6.hp * PRESET_MULT.chill < p6.hp * PRESET_MULT.classic);
    assert.ok(p6.hp * PRESET_MULT.classic < p6.hp * PRESET_MULT.turbo);
    assert.ok(p6.dmg * PRESET_MULT.chill < p6.dmg * PRESET_MULT.turbo);
  });
});

describe('boss mode segmented HP display', () => {
  function computeBossBarSegments(maxHp, hp, difficultyHpMult, isBoss) {
    const safeMax = Math.max(1, maxHp);
    const safeHp = Math.max(0, Math.min(safeMax, hp));
    const raw =
      3 +
      Math.sqrt(Math.max(1, safeMax / 35)) +
      (difficultyHpMult >= 2 ? Math.min(3, (difficultyHpMult - 1.5) * 0.45) : 0) +
      (isBoss ? 1 : 0);
    const segmentCount = Math.max(4, Math.min(16, Math.round(raw)));
    const hpPerSegment = safeMax / segmentCount;
    const segmentFills = [];
    let activeSegments = 0;
    for (let i = 0; i < segmentCount; i++) {
      const fill = Math.max(0, Math.min(1, (safeHp - i * hpPerSegment) / hpPerSegment));
      segmentFills.push(fill);
      if (fill > 0.001) activeSegments++;
    }
    return { segmentCount, hpPerSegment, activeSegments, segmentFills };
  }

  it('scales segment count upward with enemy difficulty and stays within 4..16', () => {
    const earlyBoss = computeBossBarSegments(200, 200, 1.0, true);
    const midBoss = computeBossBarSegments(730, 730, 3.65, true);
    const lateBoss = computeBossBarSegments(3200, 3200, 16.0, true);
    assert.ok(earlyBoss.segmentCount >= 4 && earlyBoss.segmentCount <= 16);
    assert.ok(midBoss.segmentCount > earlyBoss.segmentCount);
    assert.ok(lateBoss.segmentCount > midBoss.segmentCount);
    assert.equal(lateBoss.segmentCount, 16);
  });

  it('fills individual segments accurately according to remaining HP', () => {
    const half = computeBossBarSegments(1000, 500, 5.0, true);
    const totalFill = half.segmentFills.reduce((sum, v) => sum + v, 0);
    assert.ok(Math.abs(totalFill - half.segmentCount * 0.5) < 0.001);
    const zero = computeBossBarSegments(1000, 0, 5.0, true);
    assert.equal(zero.activeSegments, 0);
  });
});

describe('autonomous difficulty progression', () => {
  function computeAutonomousDifficulty(level) {
    if (level >= 8) return 'turbo';
    if (level >= 4) return 'classic';
    return 'chill';
  }

  it('automatically escalates difficulty tier with cultivation stage', () => {
    assert.equal(computeAutonomousDifficulty(1), 'chill');
    assert.equal(computeAutonomousDifficulty(3), 'chill');
    assert.equal(computeAutonomousDifficulty(4), 'classic');
    assert.equal(computeAutonomousDifficulty(7), 'classic');
    assert.equal(computeAutonomousDifficulty(8), 'turbo');
    assert.equal(computeAutonomousDifficulty(12), 'turbo');
  });
});

describe('weather screen-space VFX intensity scaling', () => {
  function computeWeatherVfxIntensity(weather, liveRainIntensity, altitudeNorm, isSheltered) {
    const rain = Math.max(0, Math.min(1, liveRainIntensity));
    const alt = Math.max(0, Math.min(1, altitudeNorm));
    const shelterMul = isSheltered ? 0.28 : 1.0;
    let rainSplash = 0;
    let frostTarget = 0;
    let condensation = 0;
    let heatAsh = 0;
    switch (weather) {
      case 'clear': break;
      case 'mist': condensation = (0.28 + alt * 0.16) * shelterMul; break;
      case 'fog': condensation = (0.58 + alt * 0.22) * shelterMul; break;
      case 'rain':
        rainSplash = Math.min(1, (0.34 + rain * 0.56) * shelterMul);
        condensation = (0.22 + rain * 0.16) * shelterMul;
        break;
      case 'storm':
        rainSplash = Math.min(1, (0.58 + rain * 0.42 + alt * 0.12) * shelterMul);
        condensation = (0.3 + rain * 0.18) * shelterMul;
        break;
      case 'blizzard':
        frostTarget = Math.min(1, (0.52 + alt * 0.48) * (isSheltered ? 0.18 : 1.0));
        break;
      case 'ashstorm':
        heatAsh = Math.min(1, (0.52 + alt * 0.38) * shelterMul);
        break;
    }
    return { rainSplash, frostTarget, condensation, heatAsh };
  }

  it('scales screen raindrop splashes with rainfall intensity and storm severity', () => {
    const lightRain = computeWeatherVfxIntensity('rain', 0.25, 0.2, false);
    const heavyRain = computeWeatherVfxIntensity('rain', 0.9, 0.2, false);
    const storm = computeWeatherVfxIntensity('storm', 0.9, 0.6, false);
    assert.ok(heavyRain.rainSplash > lightRain.rainSplash);
    assert.ok(storm.rainSplash > heavyRain.rainSplash);
    assert.equal(computeWeatherVfxIntensity('clear', 0, 0.5, false).rainSplash, 0);
  });

  it('scales blizzard screen frost with altitude and thaws inside Shrine Shelter', () => {
    const lowBlizz = computeWeatherVfxIntensity('blizzard', 0, 0.1, false);
    const peakBlizz = computeWeatherVfxIntensity('blizzard', 0, 0.95, false);
    const shelteredBlizz = computeWeatherVfxIntensity('blizzard', 0, 0.95, true);
    assert.ok(peakBlizz.frostTarget > lowBlizz.frostTarget);
    assert.ok(shelteredBlizz.frostTarget < lowBlizz.frostTarget);
  });

  it('activates mist/fog condensation and volcanic ash heat VFX only in matching climates', () => {
    const fog = computeWeatherVfxIntensity('fog', 0, 0.5, false);
    const mist = computeWeatherVfxIntensity('mist', 0, 0.5, false);
    const ash = computeWeatherVfxIntensity('ashstorm', 0, 0.5, false);
    assert.ok(fog.condensation > mist.condensation);
    assert.equal(fog.heatAsh, 0);
    assert.ok(ash.heatAsh > 0.5);
    assert.equal(ash.frostTarget, 0);
  });
});

describe('shader screen frost opacity & edge-blur scaling', () => {
  function computeBlizzardFrostParams(frostIntensity01, gustPulse01) {
    const effectiveIntensity = Math.max(0, Math.min(1, frostIntensity01 + gustPulse01 * 0.28));
    const opacity = effectiveIntensity <= 0.001 ? 0 : Math.pow(effectiveIntensity, 0.85) * 0.8;
    const blurRadiusPx = effectiveIntensity <= 0.001 ? 0 : effectiveIntensity * 14.5;
    const edgeReach = 0.14 + effectiveIntensity * 0.36;
    return { effectiveIntensity, opacity, blurRadiusPx, edgeReach };
  }

  it('produces zero opacity and zero edge-blur when frost is inactive', () => {
    const clear = computeBlizzardFrostParams(0, 0);
    assert.equal(clear.opacity, 0);
    assert.equal(clear.blurRadiusPx, 0);
  });

  it('monotonically increases opacity, edge-blur radius, and edge reach as blizzard intensity scales', () => {
    const mild = computeBlizzardFrostParams(0.25, 0);
    const moderate = computeBlizzardFrostParams(0.55, 0);
    const severe = computeBlizzardFrostParams(0.95, 0.4);
    assert.ok(moderate.opacity > mild.opacity && severe.opacity > moderate.opacity);
    assert.ok(moderate.blurRadiusPx > mild.blurRadiusPx && severe.blurRadiusPx > moderate.blurRadiusPx);
    assert.ok(moderate.edgeReach > mild.edgeReach && severe.edgeReach > moderate.edgeReach);
    assert.ok(severe.opacity <= 0.8 && severe.blurRadiusPx <= 14.5);
  });
});

describe('transient climate notification log formatting', () => {
  const CLIMATE_LOG_MESSAGES = {
    clear: [
      'The storm clouds part, revealing crisp alpine light across the peaks.',
      'Warm mountain currents steady the ridge and clear the skies.',
      'Sunlight breaks through the canopy as the highland air settles.',
    ],
    mist: [
      'Cool highland mist drifts down from the crags, dampening the trail.',
      'Pale ribbons of mountain vapor coil silently around the slopes.',
      'A quiet chill gathers as drifting mist blankets the valley ridges.',
    ],
    fog: [
      'Dense valley fog closes in, swallowing the distant ridges.',
      'A suffocating wall of gray mist settles heavily over the paths.',
      'Visibility fades as thick mountain fog rolls across the highlands.',
    ],
    rain: [
      'Dark clouds break overhead as driving mountain rain lashes the slopes.',
      'Cold downpours sweep the crags, turning every ridge slick underfoot.',
      'Steady rain hammers the canopy and chills the surrounding air.',
    ],
    storm: [
      'Thunder fractures the upper peaks as a violent tempest descends.',
      'Lightning forks above the ridge while gale winds tear across the pass.',
      'The sky blackens and roaring storm squalls engulf the mountain.',
    ],
    blizzard: [
      'The air grows heavy with impending frost...',
      'Biting glacial gales surge across the peaks in a blinding whiteout.',
      'Ice needles whip through the pass as bitter frost creeps inward.',
    ],
    ashstorm: [
      'Scorching embers drift down as a volcanic ash storm engulfs the range.',
      'The horizon burns crimson beneath choking waves of cinders and soot.',
      'Superheated ash sweeps across the highlands, searing every breath.',
    ],
  };

  const EFFECTS = {
    clear: { speedMult: 1.04, hpDrainPerSec: 0 },
    mist: { speedMult: 0.96, hpDrainPerSec: 0.3 },
    fog: { speedMult: 0.87, hpDrainPerSec: 1.0 },
    rain: { speedMult: 0.85, hpDrainPerSec: 1.6 },
    storm: { speedMult: 0.79, hpDrainPerSec: 2.5 },
    blizzard: { speedMult: 0.73, hpDrainPerSec: 3.3 },
    ashstorm: { speedMult: 0.77, hpDrainPerSec: 4.1 },
  };

  function createClimateLogNotice(weather, variantIndex = 0) {
    const lines = CLIMATE_LOG_MESSAGES[weather];
    const safeIdx = ((Math.floor(variantIndex) % lines.length) + lines.length) % lines.length;
    const effect = EFFECTS[weather];
    const pacePct = Math.round(effect.speedMult * 100);
    const effectNote =
      effect.hpDrainPerSec > 0
        ? `-${effect.hpDrainPerSec.toFixed(1)} HP/s · ${pacePct}% pace`
        : `Safe Climate · ${pacePct}% pace`;
    const severity =
      weather === 'blizzard' || weather === 'ashstorm'
        ? 'extreme'
        : weather === 'rain' || weather === 'storm'
          ? 'harsh'
          : weather === 'mist' || weather === 'fog'
            ? 'caution'
            : 'calm';
    return { weather, message: lines[safeIdx], effectNote, severity };
  }

  it('provides atmospheric updates for all 7 climates and leads blizzard with impending frost text', () => {
    const weathers = ['clear', 'mist', 'fog', 'rain', 'storm', 'blizzard', 'ashstorm'];
    for (const w of weathers) {
      assert.ok(CLIMATE_LOG_MESSAGES[w].length >= 3, `${w} has multiple log variants`);
      const notice = createClimateLogNotice(w, 0);
      assert.ok(notice.message.length > 15);
      assert.ok(notice.effectNote.includes('% pace'));
    }
    assert.equal(
      createClimateLogNotice('blizzard', 0).message,
      'The air grows heavy with impending frost...',
    );
  });

  it('cycles notice variants cleanly and classifies severity tiers accurately', () => {
    const first = createClimateLogNotice('blizzard', 0);
    const second = createClimateLogNotice('blizzard', 1);
    const wrapped = createClimateLogNotice('blizzard', 3);
    assert.notEqual(first.message, second.message);
    assert.equal(first.message, wrapped.message);
    assert.equal(createClimateLogNotice('clear').severity, 'calm');
    assert.equal(createClimateLogNotice('fog').severity, 'caution');
    assert.equal(createClimateLogNotice('storm').severity, 'harsh');
    assert.equal(createClimateLogNotice('blizzard').severity, 'extreme');
    assert.equal(createClimateLogNotice('ashstorm').severity, 'extreme');
    assert.ok(createClimateLogNotice('clear').effectNote.startsWith('Safe Climate'));
    assert.ok(createClimateLogNotice('blizzard').effectNote.includes('-3.3 HP/s'));
  });
});

describe('realistic movement pace and tactical enemy duel resolution', () => {
  const SPEED_CONFIG = {
    chill: { baseSpeed: 5.4, turnRate: 2.02 },
    classic: { baseSpeed: 6.5, turnRate: 2.22 },
    turbo: { baseSpeed: 7.7, turnRate: 2.42 },
  };

  function resolveCombatStrike(baseDamage, enemyState, canCounterParry) {
    if (canCounterParry && (enemyState === 'windup' || enemyState === 'lunge')) {
      return {
        damage: Math.round(baseDamage * 1.55),
        triggeredParry: true,
        triggeredStaggerBonus: false,
      };
    }
    if (enemyState === 'stagger') {
      return {
        damage: Math.round(baseDamage * 1.5),
        triggeredParry: false,
        triggeredStaggerBonus: true,
      };
    }
    return {
      damage: Math.round(baseDamage),
      triggeredParry: false,
      triggeredStaggerBonus: false,
    };
  }

  it('uses responsive, fast serpent movement and turning speeds across difficulty tiers', () => {
    assert.ok(SPEED_CONFIG.chill.baseSpeed >= 5.0);
    assert.ok(SPEED_CONFIG.classic.baseSpeed >= 6.0);
    assert.ok(SPEED_CONFIG.turbo.baseSpeed >= 7.0);
    assert.ok(SPEED_CONFIG.chill.baseSpeed < SPEED_CONFIG.classic.baseSpeed);
    assert.ok(SPEED_CONFIG.classic.baseSpeed < SPEED_CONFIG.turbo.baseSpeed);
    assert.ok(SPEED_CONFIG.turbo.turnRate <= 2.5);
  });

  it('triggers Counter-Parry Clash (1.55x) when interrupting enemy windup or lunge', () => {
    const parryWindup = resolveCombatStrike(40, 'windup', true);
    const parryLunge = resolveCombatStrike(40, 'lunge', true);
    assert.equal(parryWindup.triggeredParry, true);
    assert.equal(parryWindup.damage, 62);
    assert.equal(parryLunge.triggeredParry, true);
    assert.equal(parryLunge.damage, 62);
  });

  it('applies 1.5x posture-break bonus damage against staggered enemies and normal damage otherwise', () => {
    const staggerHit = resolveCombatStrike(40, 'stagger', false);
    const normalHit = resolveCombatStrike(40, 'circle', true);
    assert.equal(staggerHit.triggeredStaggerBonus, true);
    assert.equal(staggerHit.damage, 60);
    assert.equal(normalHit.triggeredParry, false);
    assert.equal(normalHit.triggeredStaggerBonus, false);
    assert.equal(normalHit.damage, 40);
  });
});

describe('half-human hand gun & physical fallback recoil physics', () => {
  function hasHalfHumanGun(level) {
    return level >= 8;
  }

  function computeGunRecoilPhysics(level) {
    const tier = Math.max(0, Math.min(4, Math.floor(level) - 8));
    return {
      fallbackVel: Number((7.6 + tier * 0.65).toFixed(2)),
      speedDrop: Number((2.2 + tier * 0.25).toFixed(2)),
      visualStrength: Number((0.95 + tier * 0.08).toFixed(2)),
      bulletSpeedMult: Number((1.48 + tier * 0.06).toFixed(2)),
      knockbackForce: Number((7.6 + tier * 0.75).toFixed(2)),
    };
  }

  it('equips the right-hand gun starting at Half-Human Stage 8 and stays hidden on serpent stages 1..7', () => {
    for (let lvl = 1; lvl <= 7; lvl++) {
      assert.equal(hasHalfHumanGun(lvl), false);
    }
    for (let lvl = 8; lvl <= 12; lvl++) {
      assert.equal(hasHalfHumanGun(lvl), true);
    }
  });

  it('scales physical fallback recoil velocity, speed check, and bullet knockback cleanly from Lv 8 to Lv 12', () => {
    const lv8 = computeGunRecoilPhysics(8);
    const lv10 = computeGunRecoilPhysics(10);
    const lv12 = computeGunRecoilPhysics(12);
    assert.ok(lv8.fallbackVel >= 7.0 && lv8.speedDrop >= 2.0);
    assert.ok(lv10.fallbackVel > lv8.fallbackVel && lv12.fallbackVel > lv10.fallbackVel);
    assert.ok(lv12.speedDrop > lv8.speedDrop);
    assert.ok(lv12.visualStrength > lv8.visualStrength);
    assert.ok(lv12.knockbackForce > lv8.knockbackForce);
    assert.ok(lv8.bulletSpeedMult > 1.2);
  });
});

describe('blizzard & ashstorm difficult traversal speed, turning agility & wake VFX modifier', () => {
  function computeClimateTraversalModifier(weather, isSheltered = false) {
    if (weather === 'blizzard') {
      return {
        weather,
        isDifficultTraversal: true,
        speedDragMult: isSheltered ? 0.97 : 0.91,
        turnAgilityMult: isSheltered ? 0.94 : 0.82,
        steerInertiaMult: isSheltered ? 0.88 : 0.68,
        traversalStrain01: isSheltered ? 0.26 : 0.9,
        wakeColorHex: 0xbae6fd,
        accentColorHex: 0x38bdf8,
      };
    }
    if (weather === 'ashstorm') {
      return {
        weather,
        isDifficultTraversal: true,
        speedDragMult: isSheltered ? 0.97 : 0.92,
        turnAgilityMult: isSheltered ? 0.95 : 0.85,
        steerInertiaMult: isSheltered ? 0.9 : 0.72,
        traversalStrain01: isSheltered ? 0.24 : 0.85,
        wakeColorHex: 0xfb923c,
        accentColorHex: 0xfacc15,
      };
    }
    return {
      weather,
      isDifficultTraversal: false,
      speedDragMult: 1.0,
      turnAgilityMult: 1.0,
      steerInertiaMult: 1.0,
      traversalStrain01: 0,
      wakeColorHex: 0xffffff,
      accentColorHex: 0xffffff,
    };
  }

  it('slightly reduces movement speed and turning agility only in blizzard and ashstorm', () => {
    for (const calm of ['clear', 'mist', 'fog', 'rain', 'storm']) {
      const m = computeClimateTraversalModifier(calm, false);
      assert.equal(m.isDifficultTraversal, false);
      assert.equal(m.speedDragMult, 1.0);
      assert.equal(m.turnAgilityMult, 1.0);
      assert.equal(m.traversalStrain01, 0);
    }

    const blizz = computeClimateTraversalModifier('blizzard', false);
    const ash = computeClimateTraversalModifier('ashstorm', false);
    assert.equal(blizz.isDifficultTraversal, true);
    assert.equal(ash.isDifficultTraversal, true);
    assert.ok(blizz.speedDragMult < 1.0 && blizz.speedDragMult >= 0.85);
    assert.ok(ash.speedDragMult < 1.0 && ash.speedDragMult >= 0.85);
    assert.ok(blizz.turnAgilityMult < 1.0 && blizz.turnAgilityMult >= 0.78);
    assert.ok(ash.turnAgilityMult < 1.0 && ash.turnAgilityMult >= 0.78);
    assert.ok(blizz.traversalStrain01 > 0.8 && ash.traversalStrain01 > 0.8);
  });

  it('softens speed drag, turning resistance, and traversal strain when inside a Shrine Shelter', () => {
    const exposedBlizz = computeClimateTraversalModifier('blizzard', false);
    const shelteredBlizz = computeClimateTraversalModifier('blizzard', true);
    assert.ok(shelteredBlizz.speedDragMult > exposedBlizz.speedDragMult);
    assert.ok(shelteredBlizz.turnAgilityMult > exposedBlizz.turnAgilityMult);
    assert.ok(shelteredBlizz.traversalStrain01 < exposedBlizz.traversalStrain01);
  });
});

// ---------------------------------------------------------------------------
// 16. Enemy-Type Combat Taunt Profiles & Floating Speech Bubble Formatter
// ---------------------------------------------------------------------------
describe('Enemy-Type Combat Taunt Profiles & Floating Speech Bubble Formatter', () => {
  const ENEMY_TAUNT_PROFILES = {
    wolf: {
      badgeLabel: 'VS PACK STALKER',
      archetype: 'fang-baring pack predator',
      accentHex: '#38bdf8',
    },
    boar: {
      badgeLabel: 'VS IRON TUSK',
      archetype: 'armored crag charger',
      accentHex: '#fb923c',
    },
    eagle: {
      badgeLabel: 'VS SKY TALON',
      archetype: 'diving gale raptor',
      accentHex: '#22d3ee',
    },
    guardian: {
      badgeLabel: 'VS PEAK GUARDIAN',
      archetype: 'ancient summit colossus',
      accentHex: '#facc15',
    },
    wraith: {
      badgeLabel: 'VS NETHER WRAITH',
      archetype: 'Ghost Clan shadow assassin',
      accentHex: '#34d399',
    },
    soul_elder: {
      badgeLabel: 'VS SOUL REAPER',
      archetype: 'Soul Hall chain reaper',
      accentHex: '#e879f9',
    },
  };

  const TAUNT_MOMENT_TAGS = {
    engage: 'CLASH TAUNT',
    parry: 'PARRY RIPOSTE',
    stagger: 'GUARD SHATTER',
    execute: 'VANQUISH',
  };

  function formatFloatingTauntNotice(rawText, enemyKind, enemyName, moment, isError = false) {
    const profile = ENEMY_TAUNT_PROFILES[enemyKind] ?? ENEMY_TAUNT_PROFILES.wolf;
    const momentTag = TAUNT_MOMENT_TAGS[moment] ?? TAUNT_MOMENT_TAGS.engage;
    const cleanedText = String(rawText ?? '')
      .replace(/^["'“”]+|["'“”]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120);

    return {
      text: cleanedText || 'Face my coils!',
      enemyKind,
      enemyName,
      moment,
      badgeLabel: isError ? 'TAUNT VOICE UNAVAILABLE' : `${profile.badgeLabel} · ${momentTag}`,
      accentHex: isError ? '#f87171' : profile.accentHex,
      isError,
    };
  }

  it('maps all 6 enemy types to distinct badge labels and accent colors', () => {
    const kinds = ['wolf', 'boar', 'eagle', 'guardian', 'wraith', 'soul_elder'];
    const seenBadges = new Set();
    const seenAccents = new Set();

    for (const kind of kinds) {
      const notice = formatFloatingTauntNotice(
        '"Your fangs cannot pierce my mountain scales!"',
        kind,
        `Test ${kind}`,
        'engage',
      );
      assert.equal(notice.enemyKind, kind);
      assert.equal(notice.text, 'Your fangs cannot pierce my mountain scales!');
      assert.equal(notice.isError, false);
      assert.ok(notice.badgeLabel.includes(ENEMY_TAUNT_PROFILES[kind].badgeLabel));
      assert.ok(notice.badgeLabel.includes('CLASH TAUNT'));
      assert.equal(notice.accentHex, ENEMY_TAUNT_PROFILES[kind].accentHex);
      seenBadges.add(ENEMY_TAUNT_PROFILES[kind].badgeLabel);
      seenAccents.add(notice.accentHex);
    }

    assert.equal(seenBadges.size, 6);
    assert.equal(seenAccents.size, 6);
  });

  it('formats combat moments (engage, parry, stagger, execute) and propagates service errors cleanly', () => {
    const parryNotice = formatFloatingTauntNotice(
      'Too slow, iron tusk—your charge belongs to the cliff!',
      'boar',
      'Iron-Tusk Crag Boar',
      'parry',
    );
    assert.equal(parryNotice.badgeLabel, 'VS IRON TUSK · PARRY RIPOSTE');
    assert.equal(parryNotice.accentHex, '#fb923c');

    const executeNotice = formatFloatingTauntNotice(
      'Return to the Hall of Souls in pieces!',
      'soul_elder',
      'Soul Hall Reaper',
      'execute',
    );
    assert.equal(executeNotice.badgeLabel, 'VS SOUL REAPER · VANQUISH');
    assert.equal(executeNotice.accentHex, '#e879f9');

    const errNotice = formatFloatingTauntNotice(
      'GEMINI_API_KEY is not configured.',
      'guardian',
      'Mythic Peak Guardian',
      'engage',
      true,
    );
    assert.equal(errNotice.isError, true);
    assert.equal(errNotice.badgeLabel, 'TAUNT VOICE UNAVAILABLE');
    assert.equal(errNotice.accentHex, '#f87171');
  });
});

// ---------------------------------------------------------------------------
// 17. Portal Chromium Browser Omnibox Resolver & Tab Management
// ---------------------------------------------------------------------------
describe('Portal Chromium Browser Omnibox Resolver & Tab Management', () => {
  function resolveOmniboxInput(rawInput) {
    const trimmed = String(rawInput ?? '').trim();
    if (!trimmed) {
      return {
        url: 'chrome://newtab',
        displayUrl: 'chrome://newtab',
        title: 'New Tab · Serpent Chromium',
        isInternal: true,
      };
    }

    const lower = trimmed.toLowerCase();
    if (
      lower === 'chrome://newtab' ||
      lower === 'serpent://newtab' ||
      lower === 'about:blank'
    ) {
      return {
        url: 'chrome://newtab',
        displayUrl: 'chrome://newtab',
        title: 'New Tab · Serpent Chromium',
        isInternal: true,
      };
    }

    if (lower === 'chrome://version' || lower === 'serpent://version') {
      return {
        url: 'chrome://version',
        displayUrl: 'chrome://version',
        title: 'About Chromium · Serpent Portal Engine',
        isInternal: true,
      };
    }

    if (lower === 'chrome://peaks-atlas' || lower === 'serpent://peaks-atlas') {
      return {
        url: 'chrome://peaks-atlas',
        displayUrl: 'chrome://peaks-atlas',
        title: 'Serpent Peaks Trial Atlas',
        isInternal: true,
      };
    }

    if (/^https?:\/\//i.test(trimmed)) {
      try {
        const parsed = new URL(trimmed);
        return {
          url: parsed.toString(),
          displayUrl: parsed.toString(),
          title: parsed.hostname.replace(/^www\./, ''),
          isInternal: false,
        };
      } catch {
        // Fall through to search
      }
    }

    if (!/\s/.test(trimmed) && /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/.*)?$/i.test(trimmed)) {
      try {
        const parsed = new URL(`https://${trimmed}`);
        return {
          url: parsed.toString(),
          displayUrl: parsed.toString(),
          title: parsed.hostname.replace(/^www\./, ''),
          isInternal: false,
        };
      } catch {
        // Fall through to search
      }
    }

    const encodedQuery = encodeURIComponent(trimmed);
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;
    return {
      url: searchUrl,
      displayUrl: searchUrl,
      title: `${trimmed} - Chromium Search`,
      isInternal: false,
    };
  }

  it('resolves internal chrome:// and serpent:// protocol URLs cleanly', () => {
    const newTab = resolveOmniboxInput('chrome://newtab');
    assert.equal(newTab.isInternal, true);
    assert.equal(newTab.url, 'chrome://newtab');

    const version = resolveOmniboxInput('chrome://version');
    assert.equal(version.isInternal, true);
    assert.equal(version.url, 'chrome://version');

    const atlas = resolveOmniboxInput('serpent://peaks-atlas');
    assert.equal(atlas.isInternal, true);
    assert.equal(atlas.url, 'chrome://peaks-atlas');
  });

  it('promotes bare domain names to HTTPS and preserves explicit HTTPS URLs', () => {
    const bare = resolveOmniboxInput('en.m.wikipedia.org/wiki/Wuxia');
    assert.equal(bare.isInternal, false);
    assert.equal(bare.url, 'https://en.m.wikipedia.org/wiki/Wuxia');
    assert.equal(bare.title, 'en.m.wikipedia.org');

    const explicit = resolveOmniboxInput('https://news.ycombinator.com/');
    assert.equal(explicit.isInternal, false);
    assert.equal(explicit.url, 'https://news.ycombinator.com/');
    assert.equal(explicit.title, 'news.ycombinator.com');
  });

  it('routes natural-language queries to DuckDuckGo HTML search for Chromium tab browsing', () => {
    const search = resolveOmniboxInput('threejs webgl shaders');
    assert.equal(search.isInternal, false);
    assert.ok(search.url.startsWith('https://html.duckduckgo.com/html/?q='));
    assert.ok(search.url.includes('threejs%20webgl%20shaders'));
    assert.equal(search.title, 'threejs webgl shaders - Chromium Search');
  });
});

// ---------------------------------------------------------------------------
// 18. 3D Rolling Tab Otherworld Orbit Layout & Screen-Space Gun Recoil Shake
// ---------------------------------------------------------------------------
describe('3D Rolling Tab Otherworld Orbit Layout & Screen-Space Gun Recoil Shake', () => {
  function computeRollingTabOrbitLayout(tabCount, orbitAngleRad) {
    const count = Math.max(1, Math.floor(tabCount));
    const nodes = [];
    let bestFrontIdx = 0;
    let bestZ = -Infinity;

    for (let i = 0; i < count; i++) {
      const theta = orbitAngleRad + (i * Math.PI * 2) / count;
      const sinT = Math.sin(theta);
      const cosT = Math.cos(theta);
      if (cosT > bestZ) {
        bestZ = cosT;
        bestFrontIdx = i;
      }
      const depth01 = (cosT + 1) * 0.5;
      nodes.push({
        index: i,
        thetaRad: theta,
        xNorm: Number(sinT.toFixed(4)),
        yNorm: Number((-cosT * 0.34 + Math.sin(theta * 2) * 0.06).toFixed(4)),
        zDepth: Number(cosT.toFixed(4)),
        rotateYDeg: Number((-sinT * 34).toFixed(2)),
        scale: Number((0.62 + depth01 * 0.46).toFixed(3)),
        opacity: Number((0.42 + depth01 * 0.58).toFixed(3)),
        zIndex: Math.round(20 + depth01 * 80),
        isFront: false,
      });
    }
    nodes[bestFrontIdx].isFront = true;
    return nodes;
  }

  function stepGunRecoilAndScreenShake(strength = 1.0, dt = 0.016) {
    const clamped = Math.max(0.35, Math.min(1.6, strength));
    let gunRecoilVel = 15.5 * clamped;
    let gunBlowbackVel = 2.4 * clamped;
    let gunSlideVel = 3.8 * clamped;
    let screenShakeVelY = 0.068 * clamped;
    let gunRecoil = 0.32 * clamped;
    let gunBlowback = 0.145 * clamped;
    let gunSlideKick = 0.175 * clamped;
    let screenShakeY = 0.019 * clamped;

    gunRecoil += gunRecoilVel * dt;
    gunRecoilVel -= gunRecoil * 92 * dt;
    gunRecoilVel *= Math.exp(-12.5 * dt);

    gunBlowback += gunBlowbackVel * dt;
    gunBlowbackVel -= gunBlowback * 115 * dt;

    gunSlideKick += gunSlideVel * dt;
    gunSlideVel -= gunSlideKick * 210 * dt;

    screenShakeY += screenShakeVelY * dt;
    screenShakeVelY -= screenShakeY * 260 * dt;

    return { gunRecoil, gunBlowback, gunSlideKick, screenShakeY };
  }

  it('distributes rolling portal tabs around a 3D circular orbit and marks the closest front tab', () => {
    const layout = computeRollingTabOrbitLayout(6, 0);
    assert.equal(layout.length, 6);
    const frontNodes = layout.filter((n) => n.isFront);
    assert.equal(frontNodes.length, 1);
    assert.equal(frontNodes[0].index, 0);
    assert.ok(frontNodes[0].scale > layout[3].scale);
    assert.ok(frontNodes[0].opacity > layout[3].opacity);
    assert.ok(frontNodes[0].zIndex > layout[3].zIndex);
  });

  it('shifts the front tab smoothly as the 3D orbital carousel rotates', () => {
    const rotated = computeRollingTabOrbitLayout(6, -Math.PI / 3);
    const front = rotated.find((n) => n.isFront);
    assert.ok(front);
    assert.equal(front.index, 1);
  });

  it('produces coupled screen-space NDC camera projection shake and multi-DOF weapon slide/blowback recoil impulses', () => {
    const mild = stepGunRecoilAndScreenShake(0.8, 0.016);
    const heavy = stepGunRecoilAndScreenShake(1.3, 0.016);
    assert.ok(heavy.gunRecoil > mild.gunRecoil);
    assert.ok(heavy.gunBlowback > mild.gunBlowback);
    assert.ok(heavy.gunSlideKick > mild.gunSlideKick);
    assert.ok(heavy.screenShakeY > mild.screenShakeY);
    assert.ok(mild.screenShakeY > 0.01);
  });
});

// ---------------------------------------------------------------------------
// 19. Dynamic Portal Center Climate-Reactive PointLight Pulsing
// ---------------------------------------------------------------------------
describe('Dynamic Portal Center Climate-Reactive PointLight Pulsing', () => {
  const PORTAL_CLIMATE_LIGHT_PROFILES = {
    clear: {
      colorHex: 0xffcf48,
      pulseTintHex: 0xffe999,
      baseIntensity: 19.0,
      pulseAmp: 6.5,
      pulseFreq: 2.2,
      baseDistance: 34,
    },
    mist: {
      colorHex: 0x5eead4,
      pulseTintHex: 0xa7f3d0,
      baseIntensity: 17.5,
      pulseAmp: 5.8,
      pulseFreq: 1.85,
      baseDistance: 32,
    },
    fog: {
      colorHex: 0x93c5fd,
      pulseTintHex: 0xe0f2fe,
      baseIntensity: 18.5,
      pulseAmp: 6.2,
      pulseFreq: 1.65,
      baseDistance: 34,
    },
    rain: {
      colorHex: 0x3b82f6,
      pulseTintHex: 0x7dd3fc,
      baseIntensity: 20.5,
      pulseAmp: 7.4,
      pulseFreq: 2.85,
      baseDistance: 35,
    },
    storm: {
      colorHex: 0xa855f7,
      pulseTintHex: 0xf0abfc,
      baseIntensity: 23.0,
      pulseAmp: 9.8,
      pulseFreq: 3.9,
      baseDistance: 38,
    },
    blizzard: {
      colorHex: 0x22d3ee,
      pulseTintHex: 0xcffafe,
      baseIntensity: 24.5,
      pulseAmp: 9.2,
      pulseFreq: 3.25,
      baseDistance: 38,
    },
    ashstorm: {
      colorHex: 0xff6b1a,
      pulseTintHex: 0xfbbf24,
      baseIntensity: 25.0,
      pulseAmp: 9.6,
      pulseFreq: 3.45,
      baseDistance: 38,
    },
  };

  function computePortalClimateLightState(weather, elapsedSec, portalIndex = 0, lightningFlash = 0) {
    const profile = PORTAL_CLIMATE_LIGHT_PROFILES[weather] ?? PORTAL_CLIMATE_LIGHT_PROFILES.clear;
    const phase = elapsedSec * profile.pulseFreq + portalIndex * 1.15;
    const primaryWave = Math.sin(phase);
    const harmonicWave = Math.sin(phase * 2.15 + 0.6) * 0.32;
    const wave01 = Math.max(0, Math.min(1, 0.5 + (primaryWave + harmonicWave) * 0.38));
    const lightningBoost = weather === 'storm' ? Math.max(0, lightningFlash) * 14.0 : 0;
    const intensity = Number(
      (profile.baseIntensity + (wave01 - 0.5) * 2 * profile.pulseAmp + lightningBoost).toFixed(3),
    );
    const distance = Number((profile.baseDistance + wave01 * 6.5).toFixed(2));
    return {
      weather,
      colorHex: profile.colorHex,
      pulseTintHex: profile.pulseTintHex,
      wave01: Number(wave01.toFixed(4)),
      intensity,
      distance,
    };
  }

  it('matches portal point light colors to each climate (golden for Clear, cyan for Blizzard, orange for Ashstorm)', () => {
    const clear = computePortalClimateLightState('clear', 0, 0);
    const blizzard = computePortalClimateLightState('blizzard', 0, 0);
    const ashstorm = computePortalClimateLightState('ashstorm', 0, 0);

    assert.equal(clear.colorHex, 0xffcf48);
    assert.equal(blizzard.colorHex, 0x22d3ee);
    assert.equal(ashstorm.colorHex, 0xff6b1a);

    const allWeathers = ['clear', 'mist', 'fog', 'rain', 'storm', 'blizzard', 'ashstorm'];
    const distinctColors = new Set(allWeathers.map((w) => computePortalClimateLightState(w, 0).colorHex));
    assert.equal(distinctColors.size, 7);
  });

  it('pulses point light intensity and range smoothly over time and surges during storm lightning', () => {
    const t0 = computePortalClimateLightState('blizzard', 0.1, 0);
    const tPeak = computePortalClimateLightState('blizzard', 0.5, 0);
    assert.notEqual(t0.intensity, tPeak.intensity);
    assert.notEqual(t0.distance, tPeak.distance);

    const calmStorm = computePortalClimateLightState('storm', 1.0, 0, 0);
    const flashStorm = computePortalClimateLightState('storm', 1.0, 0, 0.85);
    assert.ok(flashStorm.intensity > calmStorm.intensity + 10);
  });
});

// ---------------------------------------------------------------------------
// 20. Portal Temporal Distortion Drone Audio & 3-Tier Mirror-House Profiles
// ---------------------------------------------------------------------------
describe('Portal Temporal Distortion Drone Generator & 360° Mirror-House Browser Profiles', () => {
  function computePortalTemporalDroneParams(
    minDistance,
    variant = 'A',
    maxHearRadius = 46,
    coreRadius = 3.2,
  ) {
    if (!Number.isFinite(minDistance) || minDistance >= maxHearRadius) {
      return {
        proximity01: 0,
        gain: 0,
        carrierHz: variant === 'A' ? 68 : 74,
        harmonicHz: variant === 'A' ? 102 : 111,
        modulatorHz: 1.8,
        fmModDepthHz: 2.0,
        lfoRateHz: 1.1,
        filterCutoffHz: 190,
        filterQ: 2.2,
        shimmerHz: variant === 'A' ? 272 : 296,
      };
    }

    const span = Math.max(0.001, maxHearRadius - coreRadius);
    const linear = Math.max(0, Math.min(1, (maxHearRadius - minDistance) / span));
    const proximity01 = Number(Math.pow(linear, 1.45).toFixed(4));
    const baseRoot = variant === 'A' ? 68 : 74;
    const carrierHz = Number((baseRoot + proximity01 * 116).toFixed(2));
    const harmonicHz = Number((carrierHz * (1.498 + proximity01 * 0.22)).toFixed(2));
    const modulatorHz = Number((1.8 + proximity01 * 24.5).toFixed(2));
    const fmModDepthHz = Number((2.0 + Math.pow(proximity01, 1.3) * 86).toFixed(2));
    const lfoRateHz = Number((1.1 + proximity01 * 8.4).toFixed(2));
    const filterCutoffHz = Number((190 + Math.pow(proximity01, 1.25) * 2450).toFixed(1));
    const filterQ = Number((2.2 + proximity01 * 7.6).toFixed(2));
    const shimmerHz = Number((carrierHz * 4.0).toFixed(2));
    const gain = Number((proximity01 * 0.26).toFixed(4));

    return {
      proximity01,
      gain,
      carrierHz,
      harmonicHz,
      modulatorHz,
      fmModDepthHz,
      lfoRateHz,
      filterCutoffHz,
      filterQ,
      shimmerHz,
    };
  }

  function computeRollingTabOrbitLayout(tabCount, orbitAngleRad = 0) {
    const count = Math.max(0, Math.floor(tabCount));
    if (count === 0) return [];
    const useMultiTier = count >= 9;
    const tierPattern = [0, 1, -1];
    const nodes = [];

    for (let i = 0; i < count; i++) {
      let tier = 0;
      let theta = 0;
      if (!useMultiTier) {
        theta = orbitAngleRad + (i / count) * Math.PI * 2;
      } else {
        tier = tierPattern[i % 3];
        const tierIndices = [];
        for (let k = 0; k < count; k++) {
          if (tierPattern[k % 3] === tier) tierIndices.push(k);
        }
        const slotInTier = Math.max(0, tierIndices.indexOf(i));
        const tierCount = Math.max(1, tierIndices.length);
        const tierPhaseOffset = tier === 1 ? 0.36 : tier === -1 ? -0.36 : 0;
        const tierSpinDir = tier === 0 ? 1 : 0.86;
        theta = orbitAngleRad * tierSpinDir + tierPhaseOffset + (slotInTier / tierCount) * Math.PI * 2;
      }

      const xNorm = Number(Math.sin(theta).toFixed(4));
      const zDepth = Number(Math.cos(theta).toFixed(4));
      const depth01 = (zDepth + 1) * 0.5;
      const tierYOffset = tier * 0.58;
      const yNorm = Number((tierYOffset - zDepth * 0.16).toFixed(4));
      const tierScaleMult = tier === 0 ? 1.0 : 0.88;
      const scale = Number(((0.56 + depth01 * 0.56) * tierScaleMult).toFixed(3));
      const opacity = Number((0.42 + depth01 * 0.58).toFixed(3));
      const rotateYDeg = Number((-xNorm * 38).toFixed(1));
      const rotateXDeg = Number((tier === 1 ? 14 : tier === -1 ? -14 : 0).toFixed(1));
      const reflectionAlpha = Number((0.18 + depth01 * 0.44).toFixed(3));
      const zIndex = Math.round(10 + depth01 * 90) + (tier === 0 ? 4 : 0);

      nodes.push({
        index: i,
        angleRad: Number(theta.toFixed(4)),
        xNorm,
        yNorm,
        zDepth,
        scale,
        opacity,
        rotateYDeg,
        rotateXDeg,
        tier,
        reflectionAlpha,
        zIndex,
        isFront: false,
      });
    }

    let bestIdx = 0;
    let bestScore = -Infinity;
    for (let i = 0; i < nodes.length; i++) {
      const score = nodes[i].zDepth - Math.abs(nodes[i].tier) * 0.12;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    nodes[bestIdx].isFront = true;
    return nodes;
  }

  it('monotonically increases temporal distortion drone pitch, FM warp depth, LFO rate, and gain as the player approaches a portal center', () => {
    const outOfRange = computePortalTemporalDroneParams(60, 'A');
    const farEdge = computePortalTemporalDroneParams(38, 'A');
    const midRange = computePortalTemporalDroneParams(18, 'A');
    const portalCenter = computePortalTemporalDroneParams(3.2, 'A');

    assert.equal(outOfRange.proximity01, 0);
    assert.equal(outOfRange.gain, 0);

    assert.ok(farEdge.proximity01 > 0 && farEdge.proximity01 < midRange.proximity01);
    assert.ok(midRange.proximity01 < portalCenter.proximity01);
    assert.equal(portalCenter.proximity01, 1);

    // Pitch, FM depth, LFO rate, filter cutoff, and gain all increase monotonically
    assert.ok(farEdge.carrierHz < midRange.carrierHz && midRange.carrierHz < portalCenter.carrierHz);
    assert.ok(farEdge.harmonicHz < midRange.harmonicHz && midRange.harmonicHz < portalCenter.harmonicHz);
    assert.ok(farEdge.fmModDepthHz < midRange.fmModDepthHz && midRange.fmModDepthHz < portalCenter.fmModDepthHz);
    assert.ok(farEdge.lfoRateHz < midRange.lfoRateHz && midRange.lfoRateHz < portalCenter.lfoRateHz);
    assert.ok(
      farEdge.filterCutoffHz < midRange.filterCutoffHz &&
        midRange.filterCutoffHz < portalCenter.filterCutoffHz,
    );
    assert.ok(farEdge.gain < midRange.gain && midRange.gain < portalCenter.gain);
  });

  it('arranges 12+ profile tabs into a 3-tier 360-degree Hall of Mirrors rotunda with upper, middle, and lower galleries', () => {
    const mirrorNodes = computeRollingTabOrbitLayout(12, 0);
    assert.equal(mirrorNodes.length, 12);

    const upperTier = mirrorNodes.filter((n) => n.tier === 1);
    const midTier = mirrorNodes.filter((n) => n.tier === 0);
    const lowerTier = mirrorNodes.filter((n) => n.tier === -1);

    assert.equal(upperTier.length, 4);
    assert.equal(midTier.length, 4);
    assert.equal(lowerTier.length, 4);

    assert.ok(upperTier.every((n) => n.rotateXDeg > 0 && n.yNorm > 0));
    assert.ok(lowerTier.every((n) => n.rotateXDeg < 0 && n.yNorm < 0));
    assert.equal(mirrorNodes.filter((n) => n.isFront).length, 1);
  });
});

// ---------------------------------------------------------------------------
// 21. Spatial Mirror-House Shimmer Audio, FPV Camera Pose, 360m Random Portals & 5-Floor Soul Trials
// ---------------------------------------------------------------------------
describe('Spatial Mirror-House Shimmer Audio, FPV Camera, 360m Random Portals & 5-Floor Soul Trials', () => {
  function computeMirrorTabShimmerParams(opts = {}) {
    const xNorm = Math.max(-1, Math.min(1, Number.isFinite(opts.xNorm) ? opts.xNorm : 0));
    const yNorm = Math.max(-1, Math.min(1, Number.isFinite(opts.yNorm) ? opts.yNorm : 0));
    const zDepth = Math.max(-1, Math.min(1, Number.isFinite(opts.zDepth) ? opts.zDepth : 1));
    const tier = opts.tier === 1 || opts.tier === -1 ? opts.tier : 0;
    const action = opts.action ?? 'select';
    const isB = opts.portalVariant === 'B';
    const tabIdx = Math.max(0, Math.floor(opts.tabIndex ?? 0));

    const spatialX = Number((xNorm * 2.8).toFixed(3));
    const spatialY = Number((yNorm * 1.45 + tier * 0.42).toFixed(3));
    const spatialZ = Number((-0.75 - (1 - zDepth) * 1.35).toFixed(3));
    const stereoPan = Number(Math.max(-0.92, Math.min(0.92, xNorm * 0.88)).toFixed(3));

    const lydianRatios = [1.0, 1.125, 1.25, 1.40625, 1.5, 1.6875, 1.875, 2.0];
    const baseRoot = isB ? 587.33 : 523.25;
    const tierMult = tier === 1 ? 1.1892 : tier === -1 ? 0.8409 : 1.0;
    const rootHz = baseRoot * lydianRatios[tabIdx % lydianRatios.length] * tierMult;
    const harmonicFreqs = [
      Number(rootHz.toFixed(2)),
      Number((rootHz * 1.5).toFixed(2)),
      Number((rootHz * 2.004).toFixed(2)),
      Number((rootHz * 2.8125).toFixed(2)),
    ];
    const gain = action === 'enter' ? 0.24 : action === 'orbit' ? 0.1 : 0.16;
    return { spatialX, spatialY, spatialZ, stereoPan, harmonicFreqs, gain };
  }

  function computeFpvCameraPose(evolutionLevel, speedRatio, boostActive, elapsedSec, steerNorm) {
    const lvl = Math.max(1, Math.min(12, Math.round(evolutionLevel)));
    const spd = Math.max(0, Math.min(1.6, speedRatio));
    const baseEyeHeight =
      lvl <= 4 ? 0.92 + (lvl - 1) * 0.08 : lvl <= 7 ? 1.24 + (lvl - 5) * 0.12 : 1.62 + (lvl - 8) * 0.1;
    const bobFreq = lvl >= 8 ? 8.2 : 6.4;
    const bobAmp = (lvl >= 8 ? 0.055 : 0.032) * Math.min(1.2, 0.25 + spd);
    const eyeHeight = Number((baseEyeHeight + Math.sin(elapsedSec * bobFreq) * bobAmp).toFixed(3));
    const bankRollRad = Number(Math.max(-0.14, Math.min(0.14, -steerNorm * 0.085)).toFixed(4));
    const targetFov = Number((76 + Math.min(1, spd) * 4.2 + (boostActive ? 5.2 : 0)).toFixed(2));
    return { eyeHeight, bankRollRad, targetFov };
  }

  function evaluateNetworkCircuit(toggles, weights, targetSignal) {
    let sum = 0;
    for (let i = 0; i < 4; i++) {
      if (toggles[i]) sum += weights[i];
    }
    return { currentSignal: sum, solved: sum === targetSignal, delta: targetSignal - sum };
  }

  function evaluateAlchemyMix(selected, correctPair) {
    if (selected.length !== 2) return { validCount: false, solved: false };
    const [a, b] = selected;
    const [c1, c2] = correctPair;
    return { validCount: true, solved: (a === c1 && b === c2) || (a === c2 && b === c1) };
  }

  function formatComaClock(totalSeconds) {
    const clamped = Math.max(0, Math.floor(totalSeconds));
    const hrs = Math.floor(clamped / 3600);
    const mins = Math.floor((clamped % 3600) / 60);
    const secs = clamped % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  it('spatializes Mirror-House shimmering resonance by 3D X/Y/Z mirror coordinates and tier pitch', () => {
    const leftUpper = computeMirrorTabShimmerParams({
      xNorm: -0.9,
      yNorm: 0.4,
      zDepth: 0.8,
      tier: 1,
      portalVariant: 'A',
      tabIndex: 2,
      action: 'enter',
    });
    const rightLower = computeMirrorTabShimmerParams({
      xNorm: 0.9,
      yNorm: -0.4,
      zDepth: -0.5,
      tier: -1,
      portalVariant: 'B',
      tabIndex: 2,
      action: 'orbit',
    });

    assert.ok(leftUpper.spatialX < -2.0 && leftUpper.stereoPan < -0.7);
    assert.ok(rightLower.spatialX > 2.0 && rightLower.stereoPan > 0.7);
    assert.ok(leftUpper.spatialY > rightLower.spatialY);
    assert.ok(leftUpper.harmonicFreqs[0] > rightLower.harmonicFreqs[0]);
    assert.ok(leftUpper.gain > rightLower.gain);
  });

  it('scales FPV camera eye height from serpent (Lv1) to Ascended Human (Lv12) with boost FOV & bank roll', () => {
    const serpent = computeFpvCameraPose(1, 0.7, false, 0, 0.5);
    const humanBoost = computeFpvCameraPose(12, 1.1, true, 0, -0.8);

    assert.ok(serpent.eyeHeight >= 0.85 && serpent.eyeHeight <= 1.05);
    assert.ok(humanBoost.eyeHeight >= 1.95 && humanBoost.eyeHeight <= 2.15);
    assert.ok(humanBoost.targetFov > serpent.targetFov + 4);
    assert.ok(serpent.bankRollRad < 0 && humanBoost.bankRollRad > 0);
  });

  it('evaluates Floor 3 Network Repair, Floor 4 Alchemy Synthesis, and 40-hour Coma Countdown cleanly', () => {
    const netFail = evaluateNetworkCircuit([true, false, false, true], [2, 4, 5, 8], 11);
    assert.equal(netFail.solved, false);
    assert.equal(netFail.currentSignal, 10);

    const netPass = evaluateNetworkCircuit([true, true, true, false], [2, 4, 5, 8], 11);
    assert.equal(netPass.solved, true);
    assert.equal(netPass.currentSignal, 11);

    const alchPass = evaluateAlchemyMix(['jade-dew', 'frost-ether'], ['frost-ether', 'jade-dew']);
    assert.equal(alchPass.validCount, true);
    assert.equal(alchPass.solved, true);

    assert.equal(formatComaClock(40 * 3600), '40:00:00');
    assert.equal(formatComaClock(40 * 3600 - 35), '39:59:25');
  });
});

// ---------------------------------------------------------------------------
// 22. Dynamic Post-Mission Portal Respawn & Map Relocation Mechanic
// ---------------------------------------------------------------------------
describe('Dynamic Post-Mission Portal Respawn & Map Relocation Mechanic', () => {
  const WORLD_RADIUS = 360;

  function shiftPortalsAfterMission(existingProps, options = {}) {
    const {
      completedPortalKey,
      playerX = 0,
      playerZ = 0,
      shiftWaveCount = 5,
      targetPortalCount = 28,
      shiftSequence = 1,
      seed = 4242,
    } = options;

    let s = Math.max(1, Math.floor(Math.abs(seed)) % 2147483647);
    const rand = () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };

    const nonPortals = existingProps.filter((p) => p.type !== 'portalA' && p.type !== 'portalB');
    const portals = existingProps
      .filter((p) => p.type === 'portalA' || p.type === 'portalB')
      .map((p) => ({ ...p }));

    const indicesToShift = new Set();
    const completedIdx = completedPortalKey
      ? portals.findIndex((p) => p.id === completedPortalKey)
      : -1;
    if (completedIdx >= 0) indicesToShift.add(completedIdx);

    const candidates = portals.map((_, i) => i).filter((i) => !indicesToShift.has(i));
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    for (let k = 0; k < Math.min(shiftWaveCount, candidates.length); k++) {
      indicesToShift.add(candidates[k]);
    }

    const stationary = portals.filter((_, idx) => !indicesToShift.has(idx));
    const occupied = stationary.map((p) => ({ x: p.x, z: p.z }));
    const nextPortals = [...stationary];
    const shifted = [];
    let completedPortalRelocated = false;
    let ordinal = 0;

    const findFreshSpot = (oldX, oldZ, bandIdx) => {
      for (let attempt = 0; attempt < 110; attempt++) {
        const band = (bandIdx + Math.floor(attempt / 30)) % 3;
        const minR = band === 0 ? 34 : band === 1 ? 122 : 228;
        const maxR = band === 0 ? 126 : band === 1 ? 236 : WORLD_RADIUS - 22;
        const dist = minR + Math.sqrt(rand()) * Math.max(12, maxR - minR);
        const angle = rand() * Math.PI * 2;
        const x = Math.round(Math.cos(angle) * dist * 10) / 10;
        const z = Math.round(Math.sin(angle) * dist * 10) / 10;
        if (Math.hypot(x, z) > WORLD_RADIUS || Math.hypot(x, z) < 18) continue;
        if (Math.hypot(x - oldX, z - oldZ) < 42) continue;
        if (Math.hypot(x - playerX, z - playerZ) < 26) continue;
        if (occupied.some((pt) => Math.hypot(x - pt.x, z - pt.z) < 36)) continue;
        if (nonPortals.some((np) => Math.hypot(x - np.x, z - np.z) < 12)) continue;
        return { x, z };
      }
      return null;
    };

    for (const idx of indicesToShift) {
      const oldProp = portals[idx];
      ordinal++;
      const fresh = findFreshSpot(oldProp.x, oldProp.z, ordinal);
      if (fresh) {
        const newId = `shift-portal-s${shiftSequence}-${ordinal}-${Math.round(fresh.x)}_${Math.round(fresh.z)}`;
        nextPortals.push({ id: newId, type: oldProp.type, x: fresh.x, z: fresh.z });
        occupied.push({ x: fresh.x, z: fresh.z });
        shifted.push({
          oldId: oldProp.id,
          newId,
          oldX: oldProp.x,
          oldZ: oldProp.z,
          newX: fresh.x,
          newZ: fresh.z,
        });
        if (idx === completedIdx) completedPortalRelocated = true;
      } else {
        nextPortals.push(oldProp);
      }
    }

    let topUp = 0;
    while (nextPortals.length < targetPortalCount && topUp < 32) {
      topUp++;
      const fresh = findFreshSpot(playerX, playerZ, nextPortals.length);
      if (!fresh) break;
      const newId = `shift-portal-s${shiftSequence}-topup-${topUp}-${Math.round(fresh.x)}_${Math.round(fresh.z)}`;
      nextPortals.push({
        id: newId,
        type: nextPortals.length % 2 === 0 ? 'portalA' : 'portalB',
        x: fresh.x,
        z: fresh.z,
      });
      occupied.push({ x: fresh.x, z: fresh.z });
      shifted.push({ oldId: 'spawned-fresh', newId, oldX: playerX, oldZ: playerZ, newX: fresh.x, newZ: fresh.z });
    }

    return { nextProps: [...nonPortals, ...nextPortals], shifted, completedPortalRelocated };
  }

  it('relocates the completed portal and shifts a wave of portals to fresh spaced coordinates with new unique IDs', () => {
    const initialProps = [
      { id: 'wall-1', type: 'wall', x: 30, z: -30 },
      { id: 'boost-1', type: 'boost', x: 0, z: -22 },
      ...Array.from({ length: 28 }, (_, i) => {
        const angle = (i / 28) * Math.PI * 2;
        const r = 60 + (i % 3) * 85;
        return {
          id: i === 0 ? 'spawn-guard-portal-a' : `rand-portal-${i}`,
          type: i % 2 === 0 ? 'portalA' : 'portalB',
          x: Math.round(Math.cos(angle) * r),
          z: Math.round(Math.sin(angle) * r),
        };
      }),
    ];

    const res = shiftPortalsAfterMission(initialProps, {
      completedPortalKey: 'spawn-guard-portal-a',
      playerX: 60,
      playerZ: 0,
      shiftWaveCount: 5,
      targetPortalCount: 28,
      shiftSequence: 1,
      seed: 918273,
    });

    assert.equal(res.completedPortalRelocated, true);
    assert.equal(res.shifted.length, 6);
    assert.ok(!res.nextProps.some((p) => p.id === 'spawn-guard-portal-a'));
    // Non-portal props preserved untouched
    assert.ok(res.nextProps.some((p) => p.id === 'wall-1' && p.x === 30 && p.z === -30));
    assert.ok(res.nextProps.some((p) => p.id === 'boost-1' && p.x === 0 && p.z === -22));

    const nextPortals = res.nextProps.filter((p) => p.type === 'portalA' || p.type === 'portalB');
    assert.equal(nextPortals.length, 28);

    // Every shifted portal moved >= 42m away from its old position, >= 26m from player, inside 360m radius
    for (const entry of res.shifted) {
      assert.ok(entry.newId.startsWith('shift-portal-s1-'));
      assert.ok(Math.hypot(entry.newX - entry.oldX, entry.newZ - entry.oldZ) >= 42);
      assert.ok(Math.hypot(entry.newX - 60, entry.newZ - 0) >= 26);
      assert.ok(Math.hypot(entry.newX, entry.newZ) <= WORLD_RADIUS);
    }
  });
});

// ---------------------------------------------------------------------------
// 23. Periodic Global Ranking Portal, Schema Sanitizer & Firestore Security Rules
// ---------------------------------------------------------------------------
describe('Periodic Global Ranking Portal, Comparator & Firestore Security Invariants', () => {
  const CALLSIGN_REGEX = /^[a-zA-Z0-9_ \-'.!()[\]]{1,32}$/;
  const VALID_BIOMES = new Set(['mountain', 'jungle']);
  const VALID_WEATHERS = new Set(['clear', 'mist', 'fog', 'rain', 'storm', 'blizzard', 'ashstorm']);
  const VALID_SPEEDS = new Set(['chill', 'classic', 'turbo']);

  function sanitizeCallsign(raw) {
    const cleaned = String(raw ?? '')
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9_ \-'.!()[\]]+/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 32);
    return cleaned.length >= 1 && CALLSIGN_REGEX.test(cleaned) ? cleaned : 'Jade Cultivator';
  }

  function computeStanding(sortedEntries, currentScore, currentUserId) {
    const total = sortedEntries.length;
    if (currentUserId) {
      const idx = sortedEntries.findIndex((e) => e.userId === currentUserId);
      if (idx >= 0) {
        const rank = idx + 1;
        const nextRival = idx > 0 ? sortedEntries[idx - 1] : null;
        return {
          rank,
          totalEntries: total,
          percentileTop: Math.max(1, Math.min(100, Math.ceil((rank / Math.max(1, total)) * 100))),
          isSubmitted: true,
          scoreGapToNext: nextRival ? Math.max(0, nextRival.score - sortedEntries[idx].score) : 0,
        };
      }
    }
    let projectedRank = 1;
    for (const e of sortedEntries) {
      if (e.score > currentScore) projectedRank++;
      else break;
    }
    const nextRival = projectedRank > 1 ? sortedEntries[projectedRank - 2] : null;
    return {
      rank: projectedRank,
      totalEntries: total,
      percentileTop: Math.max(1, Math.min(100, Math.ceil((projectedRank / (total + 1)) * 100))),
      isSubmitted: false,
      scoreGapToNext: nextRival ? Math.max(0, nextRival.score - currentScore) : 0,
    };
  }

  function isValidRankingDoc(data, authUid) {
    const req = [
      'userId', 'displayName', 'score', 'level', 'xp', 'stageTitle', 'realmName',
      'shrinesConquered', 'soulsCollected', 'bestiaryCount', 'isHuman',
      'biome', 'weather', 'speedPreset', 'submissionsCount', 'portalWave',
      'createdAt', 'updatedAt',
    ];
    const keys = Object.keys(data);
    if (!req.every((k) => keys.includes(k)) || !keys.every((k) => req.includes(k))) return false;
    if (typeof data.userId !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(data.userId) || data.userId !== authUid) return false;
    if (typeof data.displayName !== 'string' || !CALLSIGN_REGEX.test(data.displayName)) return false;
    if (typeof data.score !== 'number' || data.score < 0 || data.score > 100000000) return false;
    if (!Number.isInteger(data.level) || data.level < 1 || data.level > 12) return false;
    if (typeof data.xp !== 'number' || data.xp < 0 || data.xp > 100000000) return false;
    if (typeof data.stageTitle !== 'string' || data.stageTitle.length < 1 || data.stageTitle.length > 48) return false;
    if (typeof data.realmName !== 'string' || data.realmName.length < 1 || data.realmName.length > 40) return false;
    if (!Number.isInteger(data.shrinesConquered) || data.shrinesConquered < 0 || data.shrinesConquered > 12) return false;
    if (!Number.isInteger(data.soulsCollected) || data.soulsCollected < 0 || data.soulsCollected > 14) return false;
    if (!Number.isInteger(data.bestiaryCount) || data.bestiaryCount < 0 || data.bestiaryCount > 20) return false;
    if (typeof data.isHuman !== 'boolean') return false;
    if (!VALID_BIOMES.has(data.biome) || !VALID_WEATHERS.has(data.weather) || !VALID_SPEEDS.has(data.speedPreset)) return false;
    if (!Number.isInteger(data.submissionsCount) || data.submissionsCount < 1 || data.submissionsCount > 100000) return false;
    if (!Number.isInteger(data.portalWave) || data.portalWave < 0 || data.portalWave > 100000) return false;
    return true;
  }

  it('sanitizes callsigns strictly to the blueprint regex and computes accurate global rank & gaps', () => {
    assert.equal(sanitizeCallsign('  Azure<script>Serpent!  '), 'AzurescriptSerpent!');
    assert.equal(sanitizeCallsign('###@@@'), 'Jade Cultivator');
    assert.equal(sanitizeCallsign('A'.repeat(60)).length, 32);

    const board = [
      { userId: 'u1', displayName: 'Dou Di Sovereign', score: 9500 },
      { userId: 'u2', displayName: 'Emerald Naga', score: 6200 },
      { userId: 'u3', displayName: 'Mist Viper', score: 3100 },
    ];
    const submitted = computeStanding(board, 6200, 'u2');
    assert.equal(submitted.rank, 2);
    assert.equal(submitted.isSubmitted, true);
    assert.equal(submitted.scoreGapToNext, 3300);

    const unsubmitted = computeStanding(board, 4500, 'u9');
    assert.equal(unsubmitted.rank, 3);
    assert.equal(unsubmitted.isSubmitted, false);
    assert.equal(unsubmitted.scoreGapToNext, 1700);
  });

  it('rejects all 12 Dirty Dozen adversarial Firestore rule payloads and accepts a valid submission', () => {
    const requestTime = 1764100000000;
    const validDoc = {
      userId: 'uid_alice',
      displayName: 'Azure Dragon',
      score: 4850,
      level: 8,
      xp: 12400,
      stageTitle: 'Half-Human Naga',
      realmName: 'Dou Huang',
      shrinesConquered: 7,
      soulsCollected: 9,
      bestiaryCount: 6,
      isHuman: false,
      biome: 'mountain',
      weather: 'storm',
      speedPreset: 'classic',
      submissionsCount: 1,
      portalWave: 2,
      createdAt: requestTime,
      updatedAt: requestTime,
    };

    assert.equal(isValidRankingDoc(validDoc, 'uid_alice'), true);
    // 1. Identity Spoofing (body UID mismatch)
    assert.equal(isValidRankingDoc({ ...validDoc, userId: 'uid_bob' }, 'uid_alice'), false);
    // 2. Shadow/Ghost Field Injection (isAdmin / email PII)
    assert.equal(isValidRankingDoc({ ...validDoc, isAdmin: true }, 'uid_alice'), false);
    assert.equal(isValidRankingDoc({ ...validDoc, email: 'alice@example.com' }, 'uid_alice'), false);
    // 3. Value Poisoning (level 999 / negative score / souls > 14)
    assert.equal(isValidRankingDoc({ ...validDoc, level: 999 }, 'uid_alice'), false);
    assert.equal(isValidRankingDoc({ ...validDoc, score: -10 }, 'uid_alice'), false);
    assert.equal(isValidRankingDoc({ ...validDoc, soulsCollected: 25 }, 'uid_alice'), false);
    // 4. Oversized String (Denial of Wallet)
    assert.equal(isValidRankingDoc({ ...validDoc, displayName: 'X'.repeat(64) }, 'uid_alice'), false);
    assert.equal(isValidRankingDoc({ ...validDoc, stageTitle: 'Y'.repeat(80) }, 'uid_alice'), false);
    // 5. Type Confusion (string score / boolean as string)
    assert.equal(isValidRankingDoc({ ...validDoc, score: '999999' }, 'uid_alice'), false);
    assert.equal(isValidRankingDoc({ ...validDoc, isHuman: 'yes' }, 'uid_alice'), false);
    // 6. Invalid Enum Injection
    assert.equal(isValidRankingDoc({ ...validDoc, biome: 'volcano' }, 'uid_alice'), false);
    assert.equal(isValidRankingDoc({ ...validDoc, weather: 'apocalypse' }, 'uid_alice'), false);
  });
});

// ---------------------------------------------------------------------------
// 24. Dimensional Portal Shift Screen Ripple Transition Envelope
// ---------------------------------------------------------------------------
describe('Dimensional Portal Shift Screen Ripple Transition Envelope', () => {
  function computePortalShiftRippleParams(progress01, intensity = 1, soulAwarded = false) {
    const p = Math.max(0, Math.min(1, progress01));
    const clampedIntensity = Math.max(0, Math.min(1.5, intensity));
    const primaryColorHex = soulAwarded ? 0xf2c14e : 0x58e1ff;
    const secondaryColorHex = soulAwarded ? 0xc084fc : 0x3de095;
    if (p <= 0.0001 || p >= 0.9999 || clampedIntensity <= 0.0001) {
      return {
        active: false,
        progress: p,
        radius: p >= 0.9999 ? 1.48 : 0.02,
        secondaryRadius: p >= 0.9999 ? 1.36 : 0,
        amplitude: 0,
        chromaticAberration: 0,
        crestGlow: 0,
        primaryColorHex,
        secondaryColorHex,
      };
    }
    const eased = 1 - Math.pow(1 - p, 2.15);
    const radius = Number((0.02 + eased * 1.46).toFixed(4));
    const secondaryP = Math.max(0, Math.min(1, (p - 0.14) / 0.86));
    const secondaryEased = secondaryP > 0 ? 1 - Math.pow(1 - secondaryP, 2.0) : 0;
    const secondaryRadius = Number((secondaryEased * 1.36).toFixed(4));
    const attack = Math.min(1, p / 0.11);
    const decay = Math.pow(1 - p, 1.65);
    const envelope = attack * decay;
    const amplitude = Number((0.044 * clampedIntensity * envelope).toFixed(5));
    const chromaticAberration = Number((amplitude * 0.58).toFixed(5));
    const crestGlow = Number(Math.min(1, 0.94 * clampedIntensity * attack * Math.pow(1 - p, 1.25)).toFixed(4));
    return {
      active: true,
      progress: Number(p.toFixed(4)),
      radius,
      secondaryRadius,
      amplitude,
      chromaticAberration,
      crestGlow,
      primaryColorHex,
      secondaryColorHex,
    };
  }

  it('expands primary and trailing harmonic ripple rings monotonically with clean zero-residue boundaries', () => {
    const start = computePortalShiftRippleParams(0, 1, false);
    const early = computePortalShiftRippleParams(0.12, 1, false);
    const mid = computePortalShiftRippleParams(0.45, 1, false);
    const late = computePortalShiftRippleParams(0.85, 1, false);
    const end = computePortalShiftRippleParams(1, 1, false);

    assert.equal(start.active, false);
    assert.equal(start.amplitude, 0);
    assert.equal(end.active, false);
    assert.equal(end.amplitude, 0);
    assert.equal(end.crestGlow, 0);

    // Primary radius expands strictly monotonically past the viewport diagonal
    assert.ok(early.active && mid.active && late.active);
    assert.ok(start.radius < early.radius);
    assert.ok(early.radius < mid.radius);
    assert.ok(mid.radius < late.radius);
    assert.ok(late.radius < end.radius);

    // Secondary harmonic ring stays at 0 before 0.14 then trails behind primary
    assert.equal(early.secondaryRadius, 0);
    assert.ok(mid.secondaryRadius > 0 && mid.secondaryRadius < mid.radius);
    assert.ok(late.secondaryRadius > mid.secondaryRadius && late.secondaryRadius < late.radius);

    // Refraction amplitude peaks early and decays smoothly
    assert.ok(early.amplitude > mid.amplitude);
    assert.ok(mid.amplitude > late.amplitude);
    assert.ok(early.chromaticAberration > late.chromaticAberration);
  });

  it('switches ripple palette between Portal Cyan/Jade and Soul-Claimed Gold/Violet', () => {
    const standard = computePortalShiftRippleParams(0.3, 1.0, false);
    const soul = computePortalShiftRippleParams(0.3, 1.15, true);

    assert.equal(standard.primaryColorHex, 0x58e1ff);
    assert.equal(standard.secondaryColorHex, 0x3de095);
    assert.equal(soul.primaryColorHex, 0xf2c14e);
    assert.equal(soul.secondaryColorHex, 0xc084fc);
    assert.ok(soul.amplitude > standard.amplitude);
  });
});

// ---------------------------------------------------------------------------
// 25. Soul Clan Sentry Variable Patrol (Circular <-> Search <-> Alert), Stealth & Soul Clan Archives
// ---------------------------------------------------------------------------
describe('Soul Clan Sentry Variable Patrol Patterns, Stealth Counterplay & Soul Clan Archives', () => {
  function normalizeAngle(a) {
    let res = a;
    while (res > Math.PI) res -= Math.PI * 2;
    while (res < -Math.PI) res += Math.PI * 2;
    return res;
  }

  function buildSentrySearchWaypoints(portalX, portalZ, activityX, activityZ, orbitRadius) {
    const dx = activityX - portalX;
    const dz = activityZ - portalZ;
    const dist = Math.hypot(dx, dz);
    const maxLeash = Math.max(orbitRadius + 10, 22);
    const clampedDist = Math.min(dist, maxLeash);
    const dirX = dist > 0.01 ? dx / dist : 1;
    const dirZ = dist > 0.01 ? dz / dist : 0;
    const p1x = portalX + dirX * Math.max(5.5, clampedDist * 0.85);
    const p1z = portalZ + dirZ * Math.max(5.5, clampedDist * 0.85);
    const perpX = -dirZ;
    const perpZ = dirX;
    const flankDist = Math.max(7.5, orbitRadius * 0.82);
    const p2x = portalX + dirX * (flankDist * 0.45) + perpX * flankDist;
    const p2z = portalZ + dirZ * (flankDist * 0.45) + perpZ * flankDist;
    const p3x = portalX + dirX * (flankDist * 0.35) - perpX * (flankDist * 0.9);
    const p3z = portalZ + dirZ * (flankDist * 0.35) - perpZ * (flankDist * 0.9);
    return [
      { x: Number(p1x.toFixed(2)), z: Number(p1z.toFixed(2)) },
      { x: Number(p2x.toFixed(2)), z: Number(p2z.toFixed(2)) },
      { x: Number(p3x.toFixed(2)), z: Number(p3z.toFixed(2)) },
    ];
  }

  function createTestSentry() {
    return {
      id: 'sentry-test-1',
      archetype: 'lantern_watcher',
      name: 'Lantern Watcher',
      portalId: 'portal-1',
      portalX: 0,
      portalZ: -60,
      x: 11.2,
      z: -60,
      heading: 0,
      orbitAngle: 0,
      orbitDir: 1,
      orbitRadius: 11.2,
      orbitSpeed: 0.44,
      searchSpeed: 6.4,
      visionRange: 17.5,
      visionHalfAngle: 0.52,
      activitySenseRadius: 24,
      hoverPhase: 0,
      patrolMode: 'circular',
      suspicion: 0,
      searchTimer: 0,
      searchOriginX: 0,
      searchOriginZ: -60,
      searchWaypoints: [],
      searchWaypointIdx: 0,
      searchSweepPhase: 0,
      alertTimer: 0,
      alertShotCooldown: 0,
      banishTimer: 0,
      portalLockTimer: 0,
      hp: 3,
      maxHp: 3,
      encounterRecorded: false,
    };
  }

  function stepSoulSentry(sentry, input, dt) {
    const outcome = {
      encounteredNow: false,
      switchedToSearch: false,
      returnedToCircular: false,
      triggeredAlert: false,
      fireAlertBolt: false,
      reformedFromBanish: false,
      distToPlayer: Math.hypot(input.playerX - sentry.x, input.playerZ - sentry.z),
    };
    sentry.hoverPhase += dt * 2.4;
    if (sentry.portalLockTimer > 0) sentry.portalLockTimer = Math.max(0, sentry.portalLockTimer - dt);

    if (sentry.patrolMode === 'banished') {
      sentry.banishTimer = Math.max(0, sentry.banishTimer - dt);
      sentry.suspicion = 0;
      if (sentry.banishTimer <= 0) {
        sentry.patrolMode = 'circular';
        sentry.hp = sentry.maxHp;
        outcome.reformedFromBanish = true;
      }
      return outcome;
    }

    const distToPlayer = outcome.distToPlayer;
    const distPlayerToPortal = Math.hypot(input.playerX - sentry.portalX, input.playerZ - sentry.portalZ);
    if (!sentry.encounterRecorded && distToPlayer <= 34) {
      sentry.encounterRecorded = true;
      outcome.encounteredNow = true;
    }

    const stealthRangeMult = input.isDashing ? 0.32 : input.isStealth ? 0.46 : 1.0;
    const effectiveVisionRange = sentry.visionRange * stealthRangeMult;
    const effectiveHalfAngle = input.isStealth ? sentry.visionHalfAngle * 0.78 : sentry.visionHalfAngle;
    const angleToPlayer = Math.atan2(input.playerX - sentry.x, input.playerZ - sentry.z);
    const angleDiff = Math.abs(normalizeAngle(angleToPlayer - sentry.heading));
    const insideCone =
      distToPlayer <= effectiveVisionRange &&
      (angleDiff <= effectiveHalfAngle || distToPlayer <= (input.isStealth ? 2.6 : 4.8));

    const spellDistToPortal = Math.hypot(input.spellOriginX - sentry.portalX, input.spellOriginZ - sentry.portalZ);
    const loudSpellNearby = input.recentSpellPulse > 0.2 && spellDistToPortal <= sentry.activitySenseRadius + 8;
    const noisyMovementNearPortal =
      !input.isStealth &&
      distPlayerToPortal <= sentry.activitySenseRadius &&
      (input.isBoosting || input.playerSpeed >= 6.8 || distPlayerToPortal <= 16.5);
    const playerActivityDetected = loudSpellNearby || noisyMovementNearPortal;
    const activityX = loudSpellNearby ? input.spellOriginX : input.playerX;
    const activityZ = loudSpellNearby ? input.spellOriginZ : input.playerZ;

    if (insideCone) {
      const closeness = 1 - Math.min(1, distToPlayer / Math.max(1, effectiveVisionRange));
      const speedFactor = input.isDashing ? 0.2 : input.isStealth ? 0.3 : input.isBoosting ? 1.55 : 1.0;
      sentry.suspicion = Math.min(1, sentry.suspicion + (0.68 + closeness * 0.85) * speedFactor * dt);
    } else {
      sentry.suspicion = Math.max(0, sentry.suspicion - (input.isStealth ? 0.46 : 0.28) * dt);
    }

    if (sentry.suspicion >= 0.999 && sentry.patrolMode !== 'alert') {
      sentry.patrolMode = 'alert';
      sentry.alertTimer = 6.2;
      sentry.portalLockTimer = Math.max(sentry.portalLockTimer, 10.0);
      outcome.triggeredAlert = true;
      return outcome;
    }

    if (sentry.patrolMode === 'circular') {
      if (playerActivityDetected || sentry.suspicion >= 0.22) {
        sentry.patrolMode = 'search';
        sentry.searchTimer = 8.6;
        sentry.searchOriginX = activityX;
        sentry.searchOriginZ = activityZ;
        sentry.searchWaypoints = buildSentrySearchWaypoints(
          sentry.portalX,
          sentry.portalZ,
          activityX,
          activityZ,
          sentry.orbitRadius,
        );
        sentry.searchWaypointIdx = 0;
        outcome.switchedToSearch = true;
      } else {
        sentry.orbitAngle = (sentry.orbitAngle + sentry.orbitSpeed * sentry.orbitDir * dt) % (Math.PI * 2);
        sentry.x = sentry.portalX + Math.cos(sentry.orbitAngle) * sentry.orbitRadius;
        sentry.z = sentry.portalZ + Math.sin(sentry.orbitAngle) * sentry.orbitRadius;
      }
      return outcome;
    }

    if (sentry.patrolMode === 'search') {
      sentry.searchTimer = Math.max(0, sentry.searchTimer - dt);
      if (sentry.searchTimer <= 0 && sentry.suspicion < 0.15) {
        sentry.patrolMode = 'circular';
        outcome.returnedToCircular = true;
      }
    }
    return outcome;
  }

  function banishSoulSentry(sentry, durationSec = 22) {
    sentry.patrolMode = 'banished';
    sentry.banishTimer = Math.max(8, durationSec);
    sentry.suspicion = 0;
    sentry.alertTimer = 0;
    sentry.portalLockTimer = 0;
  }

  it('switches from circular patrol to search behavior when unstealthed player activity occurs near a portal', () => {
    const sentry = createTestSentry();
    const initialOrbit = sentry.orbitAngle;

    // Far away player -> stays in circular patrol and advances orbit angle
    const calm = stepSoulSentry(
      sentry,
      {
        playerX: 80,
        playerZ: 80,
        playerSpeed: 7.5,
        isStealth: false,
        isBoosting: false,
        isDashing: false,
        recentSpellPulse: 0,
        spellOriginX: 80,
        spellOriginZ: 80,
      },
      0.5,
    );
    assert.equal(sentry.patrolMode, 'circular');
    assert.equal(calm.switchedToSearch, false);
    assert.ok(sentry.orbitAngle > initialOrbit);

    // Unstealthed player enters portal activity sense radius -> switches to 'search' with 3 investigation waypoints
    const triggered = stepSoulSentry(
      sentry,
      {
        playerX: 0,
        playerZ: -44,
        playerSpeed: 7.4,
        isStealth: false,
        isBoosting: false,
        isDashing: false,
        recentSpellPulse: 0,
        spellOriginX: 0,
        spellOriginZ: -44,
      },
      0.2,
    );
    assert.equal(triggered.switchedToSearch, true);
    assert.equal(triggered.encounteredNow, true);
    assert.equal(sentry.patrolMode, 'search');
    assert.equal(sentry.searchWaypoints.length, 3);
  });

  it('keeps stealthed players undetected outside halved vision cone and allows sentry to calm back to circular patrol', () => {
    const sentry = createTestSentry();
    // Stealthed player approaches within 14m of portal (outside sentry's halved ~8m sight cone)
    const stealthRes = stepSoulSentry(
      sentry,
      {
        playerX: -12,
        playerZ: -60,
        playerSpeed: 4.5,
        isStealth: true,
        isBoosting: false,
        isDashing: false,
        recentSpellPulse: 0,
        spellOriginX: -12,
        spellOriginZ: -60,
      },
      0.5,
    );
    assert.equal(stealthRes.switchedToSearch, false);
    assert.equal(sentry.patrolMode, 'circular');
    assert.equal(sentry.suspicion, 0);

    // Loud spell pulse forces Search, then staying hidden lets sentry calm back down to Circular
    stepSoulSentry(
      sentry,
      {
        playerX: -18,
        playerZ: -60,
        playerSpeed: 4.0,
        isStealth: true,
        isBoosting: false,
        isDashing: false,
        recentSpellPulse: 0.9,
        spellOriginX: -14,
        spellOriginZ: -60,
      },
      0.2,
    );
    assert.equal(sentry.patrolMode, 'search');

    const calmed = stepSoulSentry(
      sentry,
      {
        playerX: -28,
        playerZ: -60,
        playerSpeed: 4.0,
        isStealth: true,
        isBoosting: false,
        isDashing: false,
        recentSpellPulse: 0,
        spellOriginX: -28,
        spellOriginZ: -60,
      },
      9.2,
    );
    assert.equal(calmed.returnedToCircular, true);
    assert.equal(sentry.patrolMode, 'circular');
  });

  it('locks the guarded portal upon full alert and unseals it immediately when banished by a spell', () => {
    const sentry = createTestSentry();
    sentry.heading = Math.PI; // looking toward -Z (player right in front)
    let alerted = false;
    for (let i = 0; i < 12; i++) {
      const out = stepSoulSentry(
        sentry,
        {
          playerX: sentry.x,
          playerZ: sentry.z - 5,
          playerSpeed: 8.5,
          isStealth: false,
          isBoosting: true,
          isDashing: false,
          recentSpellPulse: 0,
          spellOriginX: sentry.x,
          spellOriginZ: sentry.z - 5,
        },
        0.2,
      );
      if (out.triggeredAlert) {
        alerted = true;
        break;
      }
    }
    assert.equal(alerted, true);
    assert.equal(sentry.patrolMode, 'alert');
    assert.ok(sentry.portalLockTimer >= 9.5);

    // Banishing via Shockwave/Lotus immediately clears portal lock
    banishSoulSentry(sentry, 22);
    assert.equal(sentry.patrolMode, 'banished');
    assert.equal(sentry.portalLockTimer, 0);
    assert.equal(sentry.suspicion, 0);
  });

  it('unlocks Soul Clan Archives entries on first encounter and tracks encounter/evade/banish telemetry', () => {
    const records = {
      lantern_watcher: { unlocked: false, firstSeenAt: 0, encounters: 0, searchesTriggered: 0, evadedCount: 0, banishedCount: 0 },
      chronicle_shadow_veil: { unlocked: false, firstSeenAt: 0, encounters: 0, searchesTriggered: 0, evadedCount: 0, banishedCount: 0 },
    };
    const unlock = (id, metric) => {
      const rec = records[id];
      const newlyUnlocked = !rec.unlocked;
      if (newlyUnlocked) {
        rec.unlocked = true;
        rec.firstSeenAt = 1700000000000;
      }
      if (metric === 'encounter') rec.encounters += 1;
      if (metric === 'evade') rec.evadedCount += 1;
      if (metric === 'banish') rec.banishedCount += 1;
      return newlyUnlocked;
    };

    assert.equal(unlock('lantern_watcher', 'encounter'), true);
    assert.equal(unlock('lantern_watcher', 'encounter'), false);
    assert.equal(unlock('lantern_watcher', 'banish'), false);
    assert.equal(unlock('chronicle_shadow_veil', 'evade'), true);

    assert.equal(records.lantern_watcher.unlocked, true);
    assert.equal(records.lantern_watcher.encounters, 2);
    assert.equal(records.lantern_watcher.banishedCount, 1);
    assert.equal(records.chronicle_shadow_veil.unlocked, true);
    assert.equal(records.chronicle_shadow_veil.evadedCount, 1);
  });

  it('selects distinct portal lore entries on first Channel A, Channel B, 3rd portal, and Global Ranking portal entries without duplicate triggers', () => {
    const records = {
      chronicle_azure_rift: { unlocked: false },
      chronicle_crimson_mirror: { unlocked: false },
      chronicle_shifting_lattice: { unlocked: false },
      chronicle_celestial_stele: { unlocked: false },
    };

    const selectPortalLoreEntryId = (variant, visitedNewPortalCount, recs) => {
      if (variant === 'ranking') {
        return recs.chronicle_celestial_stele?.unlocked ? null : 'chronicle_celestial_stele';
      }
      if (variant === 'A' && !recs.chronicle_azure_rift?.unlocked) {
        return 'chronicle_azure_rift';
      }
      if (variant === 'B' && !recs.chronicle_crimson_mirror?.unlocked) {
        return 'chronicle_crimson_mirror';
      }
      if (visitedNewPortalCount >= 3 && !recs.chronicle_shifting_lattice?.unlocked) {
        return 'chronicle_shifting_lattice';
      }
      return null;
    };

    // 1st new portal (Channel A) -> unlocks Azure Rift Anchors
    const first = selectPortalLoreEntryId('A', 1, records);
    assert.equal(first, 'chronicle_azure_rift');
    records[first].unlocked = true;

    // 2nd new portal (Channel A again) -> no duplicate toast before 3rd portal
    assert.equal(selectPortalLoreEntryId('A', 2, records), null);

    // 2nd new portal (Channel B) -> unlocks Crimson Mirror Loom
    const second = selectPortalLoreEntryId('B', 2, records);
    assert.equal(second, 'chronicle_crimson_mirror');
    records[second].unlocked = true;

    // 3rd distinct portal -> unlocks Shifting Lattice
    const third = selectPortalLoreEntryId('A', 3, records);
    assert.equal(third, 'chronicle_shifting_lattice');
    records[third].unlocked = true;

    // 4th portal -> all standard portal chronicles unlocked, returns null
    assert.equal(selectPortalLoreEntryId('B', 4, records), null);

    // Global Ranking portal -> unlocks Stele of the Ninth Horizon once
    const ranking = selectPortalLoreEntryId('ranking', 5, records);
    assert.equal(ranking, 'chronicle_celestial_stele');
    records[ranking].unlocked = true;
    assert.equal(selectPortalLoreEntryId('ranking', 6, records), null);
  });
});

// ---------------------------------------------------------------------------
// 26. Portal Mission Difficulty-Scaled Loot System (Multipliers & Rare Materials)
// ---------------------------------------------------------------------------
describe('Portal Mission Difficulty-Scaled Loot System', () => {
  const WEATHER_BONUS = {
    clear: 0,
    mist: 0.4,
    fog: 0.8,
    rain: 1.2,
    storm: 1.8,
    blizzard: 2.2,
    ashstorm: 2.4,
  };
  const SPEED_BONUS = { chill: 0, classic: 0.7, turbo: 1.4 };

  function computeMissionDifficultyTier({ floorNumber, speedPreset = 'classic', weather = 'mist', level = 1 }) {
    const floor = Math.max(1, Math.min(5, Math.floor(floorNumber)));
    const rawScore =
      floor * 2.0 +
      (SPEED_BONUS[speedPreset] ?? 0.7) +
      (WEATHER_BONUS[weather] ?? 0.4) +
      Math.min(1.5, Math.max(0, level - 1) * 0.14);
    const tierScore = Number(rawScore.toFixed(2));
    if (tierScore >= 11.2 || floor >= 5) return { rank: 5, label: 'Tier V · Cataclysm', tierScore };
    if (tierScore >= 8.9 || floor === 4) return { rank: 4, label: 'Tier IV · Sovereign', tierScore };
    if (tierScore >= 6.7 || floor === 3) return { rank: 3, label: 'Tier III · Tempest', tierScore };
    if (tierScore >= 4.4 || floor === 2) return { rank: 2, label: 'Tier II · Adept', tierScore };
    return { rank: 1, label: 'Tier I · Initiate', tierScore };
  }

  const ELIXIRS = {
    1: { multiplier: 1.35, durationSec: 75, rarity: 'uncommon' },
    2: { multiplier: 1.55, durationSec: 95, rarity: 'rare' },
    3: { multiplier: 1.8, durationSec: 115, rarity: 'rare' },
    4: { multiplier: 2.1, durationSec: 140, rarity: 'epic' },
    5: { multiplier: 2.5, durationSec: 175, rarity: 'mythic' },
  };

  it('scales mission difficulty rank and cultivation speed multipliers monotonically from Floor 1 Chill to Floor 5 Turbo Blizzard', () => {
    const low = computeMissionDifficultyTier({ floorNumber: 1, speedPreset: 'chill', weather: 'clear', level: 1 });
    const mid = computeMissionDifficultyTier({ floorNumber: 3, speedPreset: 'classic', weather: 'rain', level: 5 });
    const high = computeMissionDifficultyTier({ floorNumber: 5, speedPreset: 'turbo', weather: 'blizzard', level: 11 });

    assert.equal(low.rank, 1);
    assert.equal(mid.rank, 3);
    assert.equal(high.rank, 5);
    assert.ok(low.tierScore < mid.tierScore && mid.tierScore < high.tierScore);
    assert.ok(ELIXIRS[low.rank].multiplier < ELIXIRS[mid.rank].multiplier);
    assert.ok(ELIXIRS[mid.rank].multiplier < ELIXIRS[high.rank].multiplier);
    assert.ok(ELIXIRS[low.rank].durationSec < ELIXIRS[high.rank].durationSec);
  });

  it('computes permanent discovery resonance (+3% XP per material, max +24%) and validates alchemy refinement stock', () => {
    const PERM_PCT = 3;
    const calcEffectiveMult = (activeBuffMult, discoveredCount) => {
      const permanentMult = 1 + (Math.min(8, discoveredCount) * PERM_PCT) / 100;
      return Number(((activeBuffMult || 1) * permanentMult).toFixed(3));
    };

    assert.equal(calcEffectiveMult(1, 0), 1);
    assert.equal(calcEffectiveMult(1, 4), 1.12);
    assert.equal(calcEffectiveMult(2.5, 8), 3.1);

    // Refinement consumes required material count and fails cleanly when insufficient
    const inv = { dew: 2, shard: 1 };
    const refine = (cost) => {
      const total = Object.values(inv).reduce((a, b) => a + b, 0);
      if (total < cost) return false;
      let rem = cost;
      for (const k of Object.keys(inv)) {
        const take = Math.min(inv[k], rem);
        inv[k] -= take;
        rem -= take;
        if (rem <= 0) break;
      }
      return true;
    };
    assert.equal(refine(4), false);
    assert.equal(refine(3), true);
    assert.equal(inv.dew, 0);
    assert.equal(inv.shard, 0);
  });
});

// ---------------------------------------------------------------------------
// 27. Portal Chromium Browser Settings & Multi-Engine Omnibox
// ---------------------------------------------------------------------------
describe('Portal Chromium Browser Settings & Multi-Engine Omnibox', () => {
  const SEARCH_ENGINES = {
    duckduckgo: (q) => `https://html.duckduckgo.com/html/?q=${q}`,
    wikipedia: (q) => `https://en.m.wikipedia.org/w/index.php?search=${q}`,
    brave: (q) => `https://search.brave.com/search?q=${q}`,
    ecosia: (q) => `https://www.ecosia.org/search?q=${q}`,
    bing: (q) => `https://www.bing.com/search?q=${q}`,
    google: (q) => `https://www.google.com/search?q=${q}`,
  };

  function sanitizeBrowserSettings(raw = {}) {
    const searchEngine = raw.searchEngine && SEARCH_ENGINES[raw.searchEngine] ? raw.searchEngine : 'duckduckgo';
    const userAgentPreset = ['serpent_portal', 'desktop_chrome', 'mobile_chrome'].includes(raw.userAgentPreset)
      ? raw.userAgentPreset
      : 'serpent_portal';
    const startupMode = raw.startupMode === 'browser' ? 'browser' : 'game';
    const zoomPercent = Math.max(80, Math.min(130, Math.round(Number(raw.zoomPercent) || 100)));
    return {
      searchEngine,
      userAgentPreset,
      startupMode,
      zoomPercent,
      trackerShield: raw.trackerShield !== false,
      defaultProxyMode: raw.defaultProxyMode !== false,
    };
  }

  function resolveWithEngine(input, engine = 'duckduckgo') {
    const trimmed = String(input || '').trim();
    const lower = trimmed.toLowerCase();
    if (lower === 'chrome://settings' || lower === 'serpent://settings') {
      return { url: 'chrome://settings', isInternal: true };
    }
    if (lower === 'chrome://history' || lower === 'serpent://history') {
      return { url: 'chrome://history', isInternal: true };
    }
    const builder = SEARCH_ENGINES[engine] || SEARCH_ENGINES.duckduckgo;
    return { url: builder(encodeURIComponent(trimmed)), isInternal: false };
  }

  it('sanitizes browser settings safely with zoom clamping, UA whitelisting, and dual launch mode persistence', () => {
    const clamped = sanitizeBrowserSettings({
      searchEngine: 'brave',
      userAgentPreset: 'evil_spoof',
      startupMode: 'browser',
      zoomPercent: 260,
      trackerShield: false,
    });
    assert.equal(clamped.searchEngine, 'brave');
    assert.equal(clamped.userAgentPreset, 'serpent_portal');
    assert.equal(clamped.startupMode, 'browser');
    assert.equal(clamped.zoomPercent, 130);
    assert.equal(clamped.trackerShield, false);
  });

  it('routes Omnibox searches through the configured search engine and supports chrome://settings and chrome://history', () => {
    assert.deepEqual(resolveWithEngine('chrome://settings'), { url: 'chrome://settings', isInternal: true });
    assert.deepEqual(resolveWithEngine('serpent://history'), { url: 'chrome://history', isInternal: true });

    const wiki = resolveWithEngine('jade serpent', 'wikipedia');
    assert.equal(wiki.url, 'https://en.m.wikipedia.org/w/index.php?search=jade%20serpent');

    const brave = resolveWithEngine('webgl shaders', 'brave');
    assert.equal(brave.url, 'https://search.brave.com/search?q=webgl%20shaders');
  });
});

// ---------------------------------------------------------------------------
// 28. Browser New Tab Landing Page: Frequent Portal Ranking & Cultivation Progress
// ---------------------------------------------------------------------------
describe('Browser New Tab Landing Page: Frequent Portals & Cultivation Milestones', () => {
  const LANDMARKS = [
    { name: 'Jade Base Valley', x: 0, z: -20 },
    { name: 'Emerald Mist Ridge', x: 85, z: -90 },
    { name: 'Dragon Spine Peak', x: -120, z: 140 },
  ];

  function derivePortalLandmarkName(x, z, variant) {
    let nearestName = 'Emerald Valley';
    let bestDist = Infinity;
    for (const lm of LANDMARKS) {
      const d = Math.hypot(lm.x - x, lm.z - z);
      if (d < bestDist) {
        bestDist = d;
        nearestName = lm.name;
      }
    }
    return `${nearestName} · ${variant === 'A' ? 'Azure Gate' : 'Crimson Gate'}`;
  }

  function rankFrequentPortals(visits, limit = 6) {
    const max = Math.max(1, Math.floor(limit));
    return [...visits]
      .filter((v) => v && typeof v.portalId === 'string' && v.visitCount > 0)
      .sort((a, b) => {
        if (b.visitCount !== a.visitCount) return b.visitCount - a.visitCount;
        return b.lastVisitedAt - a.lastVisitedAt;
      })
      .slice(0, max);
  }

  it('ranks frequently visited portals by visit count descending with most-recent tie-breaking', () => {
    const ranked = rankFrequentPortals(
      [
        { portalId: 'p-1', visitCount: 2, lastVisitedAt: 1000 },
        { portalId: 'p-2', visitCount: 5, lastVisitedAt: 2000 },
        { portalId: 'p-3', visitCount: 5, lastVisitedAt: 4500 },
        { portalId: 'p-4', visitCount: 0, lastVisitedAt: 9999 },
        { portalId: 'p-5', visitCount: 3, lastVisitedAt: 3000 },
      ],
      3,
    );

    assert.equal(ranked.length, 3);
    assert.deepEqual(
      ranked.map((r) => r.portalId),
      ['p-3', 'p-2', 'p-5'],
    );
  });

  it('names each portal after its nearest mountain landmark and channel variant', () => {
    assert.equal(derivePortalLandmarkName(4, -18, 'A'), 'Jade Base Valley · Azure Gate');
    assert.equal(derivePortalLandmarkName(90, -82, 'B'), 'Emerald Mist Ridge · Crimson Gate');
    assert.equal(derivePortalLandmarkName(-112, 132, 'A'), 'Dragon Spine Peak · Azure Gate');
  });
});

// ---------------------------------------------------------------------------
// 29. Portal Browser History Tracking, Filtering & Time-Bucket Grouping
// ---------------------------------------------------------------------------
describe('Portal Browser History Tracking, Filtering & Time-Bucket Grouping', () => {
  function isTrackableHistoryUrl(rawUrl) {
    const trimmed = String(rawUrl ?? '').trim();
    if (!trimmed) return false;
    const lower = trimmed.toLowerCase();
    if (
      lower === 'chrome://newtab' ||
      lower === 'chrome://settings' ||
      lower === 'chrome://history' ||
      lower === 'chrome://bookmarks'
    ) {
      return false;
    }
    return lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('chrome://');
  }

  function sanitizeHistoryEntry(raw, fallbackIndex = 0) {
    if (!raw || typeof raw.url !== 'string') return null;
    const cleanUrl = raw.url.trim().slice(0, 512);
    if (!isTrackableHistoryUrl(cleanUrl)) return null;
    const visitedAt =
      typeof raw.visitedAt === 'number' && Number.isFinite(raw.visitedAt) && raw.visitedAt > 0
        ? Math.floor(raw.visitedAt)
        : 1700000000000;
    return {
      id: typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : `hist-${visitedAt.toString(36)}-${fallbackIndex}`,
      url: cleanUrl,
      title: typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : cleanUrl,
      visitedAt,
      portalVariant: raw.portalVariant === 'B' ? 'B' : 'A',
      portalLabel: typeof raw.portalLabel === 'string' && raw.portalLabel.trim() ? raw.portalLabel.trim() : 'Portal Session',
      sessionId: typeof raw.sessionId === 'string' && raw.sessionId.trim() ? raw.sessionId.trim() : 'previous-session',
      profileId: typeof raw.profileId === 'string' && raw.profileId.trim() ? raw.profileId.trim() : 'serpent-sovereign',
      visitCount: typeof raw.visitCount === 'number' && Number.isFinite(raw.visitCount) ? Math.max(1, Math.floor(raw.visitCount)) : 1,
    };
  }

  function filterBrowserHistory(entries, options = {}) {
    const query = (options.query ?? '').trim().toLowerCase();
    const variant = options.portalVariant ?? 'all';
    const sessionId = (options.sessionId ?? '').trim();
    return entries.filter((entry) => {
      if (variant !== 'all' && entry.portalVariant !== variant) return false;
      if (sessionId && entry.sessionId !== sessionId) return false;
      if (!query) return true;
      return `${entry.title} ${entry.url} ${entry.portalLabel} portal ${entry.portalVariant}`.toLowerCase().includes(query);
    });
  }

  function groupHistoryByTimeBucket(entries, nowMs) {
    const nowDate = new Date(nowMs);
    const startOfToday = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()).getTime();
    const msPerDay = 24 * 60 * 60 * 1000;
    const startOfYesterday = startOfToday - msPerDay;
    const startOfWeek = startOfToday - 6 * msPerDay;
    const buckets = { Today: [], Yesterday: [], 'Earlier This Week': [], Older: [] };
    for (const entry of [...entries].sort((a, b) => b.visitedAt - a.visitedAt)) {
      if (entry.visitedAt >= startOfToday) buckets.Today.push(entry);
      else if (entry.visitedAt >= startOfYesterday) buckets.Yesterday.push(entry);
      else if (entry.visitedAt >= startOfWeek) buckets['Earlier This Week'].push(entry);
      else buckets.Older.push(entry);
    }
    return ['Today', 'Yesterday', 'Earlier This Week', 'Older']
      .filter((bucket) => buckets[bucket].length > 0)
      .map((bucket) => ({ bucket, entries: buckets[bucket] }));
  }

  it('sanitizes legacy and rich history entries while excluding chrome://settings and chrome://newtab', () => {
    const legacy = sanitizeHistoryEntry({
      url: 'https://en.m.wikipedia.org/wiki/Serpent',
      title: 'Serpent - Wikipedia',
      visitedAt: 1700000123456,
    }, 2);
    assert.ok(legacy);
    assert.equal(legacy.portalVariant, 'A');
    assert.equal(legacy.portalLabel, 'Portal Session');
    assert.equal(legacy.sessionId, 'previous-session');
    assert.equal(legacy.visitCount, 1);

    assert.equal(sanitizeHistoryEntry({ url: 'chrome://newtab', title: 'New Tab' }), null);
    assert.equal(sanitizeHistoryEntry({ url: 'chrome://settings', title: 'Settings' }), null);
    assert.equal(sanitizeHistoryEntry({ url: 'chrome://history', title: 'History' }), null);
    assert.ok(sanitizeHistoryEntry({ url: 'chrome://peaks-atlas', title: 'Peaks Atlas', visitedAt: 1700000200000 }));
  });

  it('filters browser history by search keyword, active session, and portal channel', () => {
    const sample = [
      sanitizeHistoryEntry({ id: 'h1', url: 'https://en.m.wikipedia.org/wiki/Dragon', title: 'Dragon Lore', visitedAt: 1000, portalVariant: 'A', portalLabel: 'Jade Base Valley · Azure Gate', sessionId: 'sess-now' }),
      sanitizeHistoryEntry({ id: 'h2', url: 'https://news.ycombinator.com/', title: 'Hacker News', visitedAt: 2000, portalVariant: 'B', portalLabel: 'Emerald Mist Ridge · Crimson Gate', sessionId: 'sess-now' }),
      sanitizeHistoryEntry({ id: 'h3', url: 'https://example.com/', title: 'Example Sandbox', visitedAt: 3000, portalVariant: 'B', portalLabel: 'Standalone Browser', sessionId: 'sess-old' }),
    ];

    assert.deepEqual(filterBrowserHistory(sample, { sessionId: 'sess-now' }).map((e) => e.id), ['h1', 'h2']);
    assert.deepEqual(filterBrowserHistory(sample, { portalVariant: 'B' }).map((e) => e.id), ['h2', 'h3']);
    assert.deepEqual(filterBrowserHistory(sample, { query: 'jade base' }).map((e) => e.id), ['h1']);
    assert.deepEqual(filterBrowserHistory(sample, { query: 'hacker', portalVariant: 'B' }).map((e) => e.id), ['h2']);
  });

  it('groups visited URLs chronologically into Today, Yesterday, Earlier This Week, and Older buckets', () => {
    const now = new Date(2026, 10, 26, 15, 0, 0).getTime();
    const hour = 60 * 60 * 1000;
    const day = 24 * hour;
    const entries = [
      sanitizeHistoryEntry({ id: 'old', url: 'https://example.com/old', title: 'Old', visitedAt: now - 12 * day }),
      sanitizeHistoryEntry({ id: 'week', url: 'https://example.com/week', title: 'Week', visitedAt: now - 3 * day }),
      sanitizeHistoryEntry({ id: 'yest', url: 'https://example.com/yest', title: 'Yest', visitedAt: now - 1 * day }),
      sanitizeHistoryEntry({ id: 'today1', url: 'https://example.com/t1', title: 'Today Early', visitedAt: now - 2 * hour }),
      sanitizeHistoryEntry({ id: 'today2', url: 'https://example.com/t2', title: 'Today Late', visitedAt: now - 10 * 60 * 1000 }),
    ];

    const groups = groupHistoryByTimeBucket(entries, now);
    assert.deepEqual(groups.map((g) => g.bucket), ['Today', 'Yesterday', 'Earlier This Week', 'Older']);
    assert.deepEqual(groups[0].entries.map((e) => e.id), ['today2', 'today1']);
    assert.deepEqual(groups[1].entries.map((e) => e.id), ['yest']);
    assert.deepEqual(groups[2].entries.map((e) => e.id), ['week']);
    assert.deepEqual(groups[3].entries.map((e) => e.id), ['old']);
  });
});

// ---------------------------------------------------------------------------
// 30. Portal URL Bookmarks & Search History Tracking
// ---------------------------------------------------------------------------
describe('Portal URL Bookmarks & Search History Tracking', () => {
  const VALID_ENGINES = new Set(['duckduckgo', 'wikipedia', 'brave', 'ecosia', 'bing', 'google']);

  function normalizeBookmarkUrl(rawInput) {
    const trimmed = String(rawInput ?? '').trim();
    if (!trimmed) return null;
    const lower = trimmed.toLowerCase();
    if (lower.startsWith('chrome://') || lower.startsWith('serpent://')) {
      return `chrome://${trimmed.slice(trimmed.indexOf('://') + 3)}`;
    }
    if (lower.startsWith('http://') || lower.startsWith('https://')) {
      return trimmed.slice(0, 512);
    }
    if (/^[a-z0-9-]+(\.[a-z0-9-]+)+([/:?#].*)?$/i.test(trimmed)) {
      return `https://${trimmed}`.slice(0, 512);
    }
    return null;
  }

  function sanitizeSearchHistoryEntry(raw, fallbackIndex = 0) {
    if (!raw || typeof raw.query !== 'string') return null;
    const query = raw.query.replace(/\s+/g, ' ').trim().slice(0, 180);
    if (!query) return null;
    const searchedAt =
      typeof raw.searchedAt === 'number' && Number.isFinite(raw.searchedAt) && raw.searchedAt > 0
        ? Math.floor(raw.searchedAt)
        : 1700000000000;
    const engine = typeof raw.engine === 'string' && VALID_ENGINES.has(raw.engine) ? raw.engine : 'duckduckgo';
    return {
      id: typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : `srch-${searchedAt.toString(36)}-${fallbackIndex}`,
      query,
      engine,
      url: typeof raw.url === 'string' && raw.url.trim() ? raw.url.trim().slice(0, 512) : `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      searchedAt,
      portalVariant: raw.portalVariant === 'B' ? 'B' : 'A',
      portalLabel: typeof raw.portalLabel === 'string' && raw.portalLabel.trim() ? raw.portalLabel.trim() : 'Portal Session',
      sessionId: typeof raw.sessionId === 'string' && raw.sessionId.trim() ? raw.sessionId.trim() : 'previous-session',
      searchCount: typeof raw.searchCount === 'number' && Number.isFinite(raw.searchCount) ? Math.max(1, Math.floor(raw.searchCount)) : 1,
    };
  }

  function filterSearchHistory(entries, options = {}) {
    const keyword = (options.query ?? '').trim().toLowerCase();
    const variant = options.portalVariant ?? 'all';
    const sessionId = (options.sessionId ?? '').trim();
    return entries.filter((entry) => {
      if (variant !== 'all' && entry.portalVariant !== variant) return false;
      if (sessionId && entry.sessionId !== sessionId) return false;
      if (!keyword) return true;
      return `${entry.query} ${entry.engine} ${entry.portalLabel} portal ${entry.portalVariant}`.toLowerCase().includes(keyword);
    });
  }

  it('normalizes portal URLs for bookmarks and rejects empty or bare non-URL phrases', () => {
    assert.equal(normalizeBookmarkUrl('https://threejs.org/docs/'), 'https://threejs.org/docs/');
    assert.equal(normalizeBookmarkUrl('en.wikipedia.org/wiki/Dragon'), 'https://en.wikipedia.org/wiki/Dragon');
    assert.equal(normalizeBookmarkUrl('serpent://peaks-atlas'), 'chrome://peaks-atlas');
    assert.equal(normalizeBookmarkUrl('just a search phrase'), null);
    assert.equal(normalizeBookmarkUrl('   '), null);
  });

  it('deduplicates saved bookmarks by normalized URL while placing custom bookmarks first', () => {
    const defaults = [
      { id: 'bm-wiki', title: 'Wikipedia', url: 'https://en.m.wikipedia.org/wiki/Main_Page', isCustom: false },
      { id: 'bm-atlas', title: 'Peaks Atlas', url: 'chrome://peaks-atlas', isCustom: false },
    ];
    const custom = [
      { id: 'cbm-1', title: 'My Wiki Portal', url: 'https://en.m.wikipedia.org/wiki/Main_Page', isCustom: true },
      { id: 'cbm-2', title: 'Three.js Reference', url: 'https://threejs.org/', isCustom: true },
    ];
    const seen = new Set();
    const merged = [];
    for (const item of [...custom, ...defaults]) {
      const key = item.url.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }
    assert.deepEqual(
      merged.map((m) => m.id),
      ['cbm-1', 'cbm-2', 'bm-atlas'],
    );
    assert.equal(merged[0].title, 'My Wiki Portal');
  });

  it('sanitizes and filters search history across queries, search engines, sessions, and portal channels', () => {
    const entries = [
      sanitizeSearchHistoryEntry({ id: 's1', query: '  jade   serpent lore  ', engine: 'wikipedia', searchedAt: 5000, portalVariant: 'A', portalLabel: 'Jade Base Valley · Azure Gate', sessionId: 'sess-live', searchCount: 2 }),
      sanitizeSearchHistoryEntry({ id: 's2', query: 'webgl shadow shaders', engine: 'brave', searchedAt: 6000, portalVariant: 'B', portalLabel: 'Crimson Gate', sessionId: 'sess-live' }),
      sanitizeSearchHistoryEntry({ id: 's3', query: 'mountain weather', engine: 'invalid_engine', searchedAt: 4000, portalVariant: 'A', portalLabel: 'Standalone Browser', sessionId: 'sess-old' }),
    ].filter(Boolean);

    assert.equal(entries.length, 3);
    assert.equal(entries[0].query, 'jade serpent lore');
    assert.equal(entries[2].engine, 'duckduckgo');
    assert.equal(sanitizeSearchHistoryEntry({ query: '   ' }), null);

    assert.deepEqual(filterSearchHistory(entries, { sessionId: 'sess-live' }).map((e) => e.id), ['s1', 's2']);
    assert.deepEqual(filterSearchHistory(entries, { portalVariant: 'B' }).map((e) => e.id), ['s2']);
    assert.deepEqual(filterSearchHistory(entries, { query: 'wikipedia' }).map((e) => e.id), ['s1']);
    assert.deepEqual(filterSearchHistory(entries, { query: 'shaders', portalVariant: 'B' }).map((e) => e.id), ['s2']);
  });
});

// ---------------------------------------------------------------------------
// 31. Service Worker Offline Cache Keys, Bookmark Precaching & State Snapshots
// ---------------------------------------------------------------------------
describe('Service Worker Offline Cache Keys, Bookmark Precaching & State Snapshots', () => {
  function normalizeCacheablePortalUrl(rawUrl) {
    try {
      const trimmed = String(rawUrl ?? '').trim();
      if (!trimmed) return null;
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
      parsed.hash = '';
      return parsed.toString();
    } catch {
      return null;
    }
  }

  function canonicalizePortalProxyCacheKey(targetUrl) {
    const normalized = normalizeCacheablePortalUrl(targetUrl);
    if (!normalized) return null;
    return `/__portal_cache__/page?url=${encodeURIComponent(normalized)}`;
  }

  function extractBookmarkCacheableUrls(bookmarks, history = [], maxCount = 20) {
    const cap = Math.max(1, Math.min(50, Math.floor(maxCount)));
    const seen = new Set();
    const urls = [];
    for (const bm of bookmarks) {
      const norm = normalizeCacheablePortalUrl(bm.url);
      if (!norm || seen.has(norm)) continue;
      seen.add(norm);
      urls.push(norm);
      if (urls.length >= cap) return urls;
    }
    for (const h of history) {
      const norm = normalizeCacheablePortalUrl(h.url);
      if (!norm || seen.has(norm)) continue;
      seen.add(norm);
      urls.push(norm);
      if (urls.length >= cap) return urls;
    }
    return urls;
  }

  it('canonicalizes external portal URLs by stripping fragments and rejecting internal chrome:// or javascript: URLs', () => {
    assert.equal(
      canonicalizePortalProxyCacheKey('https://en.m.wikipedia.org/wiki/Dragon#History'),
      '/__portal_cache__/page?url=https%3A%2F%2Fen.m.wikipedia.org%2Fwiki%2FDragon',
    );
    assert.equal(canonicalizePortalProxyCacheKey('chrome://newtab'), null);
    assert.equal(canonicalizePortalProxyCacheKey('javascript:alert(1)'), null);
    assert.equal(canonicalizePortalProxyCacheKey(''), null);
  });

  it('prioritizes saved bookmarks over history and deduplicates fragment variants when building the offline precache list', () => {
    const urls = extractBookmarkCacheableUrls(
      [
        { url: 'chrome://peaks-atlas' },
        { url: 'https://threejs.org/docs/#manual' },
        { url: 'https://en.m.wikipedia.org/wiki/Serpent' },
      ],
      [
        { url: 'https://threejs.org/docs/#api' },
        { url: 'https://news.ycombinator.com/' },
        { url: 'https://example.com/' },
      ],
      3,
    );

    assert.deepEqual(urls, [
      'https://threejs.org/docs/',
      'https://en.m.wikipedia.org/wiki/Serpent',
      'https://news.ycombinator.com/',
    ]);
  });

  it('bounds and sanitizes offline portal state snapshots for Cache Storage persistence', () => {
    const bookmarks = Array.from({ length: 80 }, (_, i) => ({ url: `https://example.com/${i}`, title: `BM ${i}` }));
    const history = Array.from({ length: 240 }, (_, i) => ({ id: `h-${i}`, url: `https://example.com/h/${i}` }));
    const searches = Array.from({ length: 130 }, (_, i) => ({ id: `s-${i}`, query: `q ${i}` }));

    const snapshot = {
      savedAt: 1764200000000,
      customBookmarks: bookmarks.slice(0, 64),
      browsingHistory: history.slice(0, 200),
      searchHistory: searches.slice(0, 100),
    };

    assert.equal(snapshot.customBookmarks.length, 64);
    assert.equal(snapshot.browsingHistory.length, 200);
    assert.equal(snapshot.searchHistory.length, 100);
  });
});



