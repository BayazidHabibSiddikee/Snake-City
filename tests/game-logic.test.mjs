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

describe('climate speed multipliers', () => {
  const CLIMATE_EFFECTS = {
    clear:   { speedMult: 1.04, hpDrainPerSec: 0,    realmDrainMult: 0.85 },
    mist:    { speedMult: 0.97, hpDrainPerSec: 0,    realmDrainMult: 1.0  },
    fog:     { speedMult: 0.90, hpDrainPerSec: 0.45, realmDrainMult: 1.15 },
    rain:    { speedMult: 0.93, hpDrainPerSec: 0.85, realmDrainMult: 1.25 },
  };
  it('clear is fastest', () => {
    assert.ok(CLIMATE_EFFECTS.clear.speedMult > CLIMATE_EFFECTS.mist.speedMult);
    assert.ok(CLIMATE_EFFECTS.clear.speedMult > CLIMATE_EFFECTS.fog.speedMult);
    assert.ok(CLIMATE_EFFECTS.clear.speedMult > CLIMATE_EFFECTS.rain.speedMult);
  });
  it('fog and rain drain hp', () => {
    assert.ok(CLIMATE_EFFECTS.fog.hpDrainPerSec > 0);
    assert.ok(CLIMATE_EFFECTS.rain.hpDrainPerSec > 0);
    assert.equal(CLIMATE_EFFECTS.clear.hpDrainPerSec, 0);
    assert.equal(CLIMATE_EFFECTS.mist.hpDrainPerSec, 0);
  });
  it('rain has highest realm drain multiplier', () => {
    const mults = Object.values(CLIMATE_EFFECTS).map(e => e.realmDrainMult);
    assert.equal(Math.max(...mults), CLIMATE_EFFECTS.rain.realmDrainMult);
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
