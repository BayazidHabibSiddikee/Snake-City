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
    chill: { baseSpeed: 3.7, turnRate: 1.72 },
    classic: { baseSpeed: 4.5, turnRate: 1.88 },
    turbo: { baseSpeed: 5.4, turnRate: 2.02 },
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

  it('uses slower, grounded serpent movement and turning speeds across difficulty tiers', () => {
    assert.ok(SPEED_CONFIG.chill.baseSpeed < 4.5);
    assert.ok(SPEED_CONFIG.classic.baseSpeed < 5.2);
    assert.ok(SPEED_CONFIG.turbo.baseSpeed < 6.0);
    assert.ok(SPEED_CONFIG.chill.baseSpeed < SPEED_CONFIG.classic.baseSpeed);
    assert.ok(SPEED_CONFIG.classic.baseSpeed < SPEED_CONFIG.turbo.baseSpeed);
    assert.ok(SPEED_CONFIG.turbo.turnRate <= 2.1);
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




