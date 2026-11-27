import * as THREE from 'three';

export type CombatTextKind =
  | 'damage'
  | 'crit'
  | 'qi_absorbed'
  | 'vitality'
  | 'player_damage'
  | 'xp';

export interface CombatTextSpawnOptions {
  x: number;
  y: number;
  z: number;
  kind: CombatTextKind;
  /** Numeric magnitude (e.g. damage dealt, Qi absorbed, HP restored). */
  value?: number;
  /** Optional explicit override text (if omitted, formatted automatically from kind & value). */
  text?: string;
  /** Optional smaller secondary caption beneath the main number (e.g. "COUNTER CLASH", "GOLDEN"). */
  subtext?: string;
  /** Optional scale multiplier (default 1.0). */
  scaleMultiplier?: number;
}

export interface CombatTextStyle {
  fillTop: string;
  fillBottom: string;
  stroke: string;
  glow: string;
  fontWeight: number;
  fontSizePx: number;
  fontFamily: string;
  baseScale: number;
  lifeSec: number;
  launchVy: number;
  gravity: number;
  buoyant: boolean;
}

export const COMBAT_TEXT_STYLES: Record<CombatTextKind, CombatTextStyle> = {
  damage: {
    fillTop: '#fff7e6',
    fillBottom: '#fbbf24',
    stroke: '#11161d',
    glow: 'rgba(251, 191, 36, 0.55)',
    fontWeight: 800,
    fontSizePx: 54,
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
    baseScale: 2.35,
    lifeSec: 0.92,
    launchVy: 4.1,
    gravity: 6.2,
    buoyant: false,
  },
  crit: {
    fillTop: '#fffbeb',
    fillBottom: '#f59e0b',
    stroke: '#241204',
    glow: 'rgba(253, 224, 71, 0.85)',
    fontWeight: 800,
    fontSizePx: 66,
    fontFamily: 'Cinzel, Georgia, serif',
    baseScale: 3.15,
    lifeSec: 1.18,
    launchVy: 5.2,
    gravity: 5.6,
    buoyant: false,
  },
  qi_absorbed: {
    fillTop: '#e6fcff',
    fillBottom: '#38e8ff',
    stroke: '#061923',
    glow: 'rgba(56, 232, 255, 0.72)',
    fontWeight: 700,
    fontSizePx: 46,
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
    baseScale: 2.85,
    lifeSec: 1.16,
    launchVy: 2.45,
    gravity: 0,
    buoyant: true,
  },
  vitality: {
    fillTop: '#dcfce7',
    fillBottom: '#34d399',
    stroke: '#062016',
    glow: 'rgba(52, 211, 153, 0.65)',
    fontWeight: 700,
    fontSizePx: 44,
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
    baseScale: 2.45,
    lifeSec: 1.05,
    launchVy: 2.3,
    gravity: 0,
    buoyant: true,
  },
  player_damage: {
    fillTop: '#ffe4e6',
    fillBottom: '#f43f5e',
    stroke: '#26060d',
    glow: 'rgba(244, 63, 94, 0.75)',
    fontWeight: 800,
    fontSizePx: 54,
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
    baseScale: 2.55,
    lifeSec: 1.02,
    launchVy: 4.5,
    gravity: 6.8,
    buoyant: false,
  },
  xp: {
    fillTop: '#fef9c3',
    fillBottom: '#eab308',
    stroke: '#1e1605',
    glow: 'rgba(234, 179, 8, 0.68)',
    fontWeight: 700,
    fontSizePx: 44,
    fontFamily: 'Cinzel, Georgia, serif',
    baseScale: 2.6,
    lifeSec: 1.12,
    launchVy: 2.5,
    gravity: 0,
    buoyant: true,
  },
};

export interface CombatTextMotionSample {
  scale: number;
  opacity: number;
  progress01: number;
}

/**
 * Formats concise, legible 3D combat/resource labels for floating billboards.
 */
export function formatCombatTextLabel(
  kind: CombatTextKind,
  value?: number,
  explicitText?: string,
): string {
  if (explicitText && explicitText.trim().length > 0) {
    return explicitText.trim();
  }
  const rounded = Math.max(0, Math.round(Number.isFinite(value) ? (value as number) : 0));
  switch (kind) {
    case 'damage':
      return rounded > 0 ? `-${rounded}` : 'HIT';
    case 'crit':
      return rounded > 0 ? `✦ ${rounded}!` : '✦ CRIT!';
    case 'qi_absorbed':
      return rounded > 0 ? `+${rounded} Qi absorbed` : 'Qi absorbed';
    case 'vitality':
      return rounded > 0 ? `+${rounded} HP` : '+HP';
    case 'player_damage':
      return rounded > 0 ? `-${rounded} HP` : '-HP';
    case 'xp':
      return rounded > 0 ? `+${rounded} XP` : '+XP';
  }
}

/**
 * Pure pop-in scale & fade-out opacity curve for 3D floating combat text.
 * - Snappy elastic punch during the opening 16% of lifetime.
 * - Full readability across the middle plateau.
 * - Smooth cubic dissolve over the final 38%.
 */
export function evaluateCombatTextMotion(
  age: number,
  life: number,
  baseScale: number,
  kind: CombatTextKind,
): CombatTextMotionSample {
  const safeLife = Math.max(0.05, life);
  const progress01 = Math.max(0, Math.min(1, age / safeLife));

  let popFactor: number;
  if (progress01 < 0.14) {
    const t = progress01 / 0.14;
    const overshoot = kind === 'crit' ? 1.34 : kind === 'damage' || kind === 'player_damage' ? 1.22 : 1.12;
    popFactor = 0.42 + (overshoot - 0.42) * (1 - Math.pow(1 - t, 3));
  } else if (progress01 < 0.28) {
    const t = (progress01 - 0.14) / 0.14;
    const overshoot = kind === 'crit' ? 1.34 : kind === 'damage' || kind === 'player_damage' ? 1.22 : 1.12;
    popFactor = overshoot + (1.0 - overshoot) * t;
  } else {
    const tail = (progress01 - 0.28) / 0.72;
    popFactor = 1.0 - tail * 0.1;
  }

  let opacity = 1;
  if (progress01 < 0.06) {
    opacity = progress01 / 0.06;
  } else if (progress01 > 0.62) {
    const fadeT = (progress01 - 0.62) / 0.38;
    opacity = Math.pow(1 - fadeT, 1.8);
  }

  return {
    scale: Number((baseScale * popFactor).toFixed(4)),
    opacity: Number(Math.max(0, Math.min(1, opacity)).toFixed(4)),
    progress01: Number(progress01.toFixed(4)),
  };
}

/**
 * Computes gentle camera-distance scale compensation so 3D billboard combat text
 * stays crisp both up close and across wide mountain ridges.
 */
export function computeBillboardDistanceScale(cameraDistance: number, baseScale: number): number {
  const safeDist = Math.max(2, Number.isFinite(cameraDistance) ? cameraDistance : 18);
  const distFactor = Math.max(0.76, Math.min(2.35, 0.62 + safeDist * 0.024));
  return Number((baseScale * distFactor).toFixed(4));
}

const COMBAT_TEXT_POOL_SIZE = 36;
const CANVAS_W = 512;
const CANVAS_H = 128;
const SPRITE_ASPECT = CANVAS_W / CANVAS_H;

interface PooledCombatBillboard {
  active: boolean;
  kind: CombatTextKind;
  sprite: THREE.Sprite;
  material: THREE.SpriteMaterial;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D | null;
  texture: THREE.CanvasTexture;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  life: number;
  baseScale: number;
  swayPhase: number;
  spawnOrder: number;
}

/**
 * Pooled Three.js 3D Billboard (`THREE.Sprite`) combat & resource text renderer.
 * Zero per-frame allocations, crisp `SRGBColorSpace` procedural `CanvasTexture`s,
 * ballistic damage pops, buoyant Qi absorption drifts, and clean GPU disposal.
 */
export class CombatTextBillboardSystem {
  public readonly group = new THREE.Group();
  private readonly pool: PooledCombatBillboard[] = [];
  private spawnCounter = 0;
  private disposed = false;

  constructor(maxAnisotropy = 4) {
    this.group.name = 'combatTextBillboards';

    if (typeof document === 'undefined') return;

    for (let i = 0; i < COMBAT_TEXT_POOL_SIZE; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = CANVAS_W;
      canvas.height = CANVAS_H;
      const ctx = canvas.getContext('2d');

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      texture.anisotropy = Math.min(4, Math.max(1, maxAnisotropy));

      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0,
        depthTest: false,
        depthWrite: false,
        fog: false,
      });

      const sprite = new THREE.Sprite(material);
      sprite.visible = false;
      sprite.renderOrder = 22;
      sprite.frustumCulled = false;
      this.group.add(sprite);

      this.pool.push({
        active: false,
        kind: 'damage',
        sprite,
        material,
        canvas,
        ctx,
        texture,
        x: 0,
        y: -400,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        age: 0,
        life: 1,
        baseScale: 2.4,
        swayPhase: 0,
        spawnOrder: 0,
      });
    }
  }

  public spawn(options: CombatTextSpawnOptions): void {
    if (this.disposed || this.pool.length === 0) return;

    // Pick first inactive slot, or recycle the oldest active billboard if saturated
    let slot: PooledCombatBillboard | null = null;
    let oldestSlot = this.pool[0];
    for (let i = 0; i < this.pool.length; i++) {
      const entry = this.pool[i];
      if (!entry.active) {
        slot = entry;
        break;
      }
      if (entry.spawnOrder < oldestSlot.spawnOrder) {
        oldestSlot = entry;
      }
    }
    if (!slot) slot = oldestSlot;

    const style = COMBAT_TEXT_STYLES[options.kind];
    const label = formatCombatTextLabel(options.kind, options.value, options.text);
    const subtext = options.subtext?.trim() ?? '';

    this.drawBillboardCanvas(slot, style, label, subtext);

    // Slight radial horizontal jitter prevents simultaneous strikes/pickups from stacking directly on top of one another
    const scatterAngle = (this.spawnCounter * 2.399963) % (Math.PI * 2);
    const scatterMag = style.buoyant ? 0.45 : 0.72;
    const lateralSpeed = style.buoyant ? 0.32 : 1.45;

    slot.active = true;
    slot.kind = options.kind;
    slot.spawnOrder = ++this.spawnCounter;
    slot.x = options.x + Math.cos(scatterAngle) * scatterMag;
    slot.y = options.y;
    slot.z = options.z + Math.sin(scatterAngle) * scatterMag;
    slot.vx = Math.cos(scatterAngle) * lateralSpeed;
    slot.vy = style.launchVy;
    slot.vz = Math.sin(scatterAngle) * lateralSpeed;
    slot.age = 0;
    slot.life = style.lifeSec;
    slot.baseScale = style.baseScale * Math.max(0.65, Math.min(1.65, options.scaleMultiplier ?? 1));
    slot.swayPhase = scatterAngle;

    slot.sprite.position.set(slot.x, slot.y, slot.z);
    slot.sprite.visible = true;
    slot.material.opacity = 1;
  }

  private drawBillboardCanvas(
    slot: PooledCombatBillboard,
    style: CombatTextStyle,
    label: string,
    subtext: string,
  ): void {
    const ctx = slot.ctx;
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Shrink font smoothly if label is long so text never clips near canvas bounds
    let fontSize = style.fontSizePx;
    ctx.font = `${style.fontWeight} ${fontSize}px ${style.fontFamily}`;
    const maxTextWidth = CANVAS_W - 44;
    const measured = ctx.measureText(label).width;
    if (measured > maxTextWidth && measured > 0) {
      fontSize = Math.max(24, Math.floor(fontSize * (maxTextWidth / measured)));
      ctx.font = `${style.fontWeight} ${fontSize}px ${style.fontFamily}`;
    }

    const centerX = CANVAS_W * 0.5;
    const mainY = subtext ? CANVAS_H * 0.42 : CANVAS_H * 0.52;

    // Soft radiant drop shadow + crisp dark ink outline for instant legibility against sunlit snow or dark crags
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.lineWidth = Math.max(6, Math.round(fontSize * 0.16));
    ctx.strokeStyle = style.stroke;
    ctx.shadowColor = style.glow;
    ctx.shadowBlur = 16;
    ctx.strokeText(label, centerX, mainY);

    const grad = ctx.createLinearGradient(0, mainY - fontSize * 0.55, 0, mainY + fontSize * 0.55);
    grad.addColorStop(0, style.fillTop);
    grad.addColorStop(1, style.fillBottom);
    ctx.fillStyle = grad;
    ctx.shadowBlur = 8;
    ctx.fillText(label, centerX, mainY);

    if (subtext) {
      const subSize = Math.max(17, Math.round(fontSize * 0.36));
      ctx.font = `700 ${subSize}px "Plus Jakarta Sans", system-ui, sans-serif`;
      ctx.shadowBlur = 6;
      ctx.lineWidth = 4;
      ctx.strokeStyle = style.stroke;
      ctx.strokeText(subtext, centerX, CANVAS_H * 0.78);
      ctx.fillStyle = style.fillTop;
      ctx.fillText(subtext, centerX, CANVAS_H * 0.78);
    }

    ctx.restore();
    slot.texture.needsUpdate = true;
  }

  public update(dt: number, cameraPos: THREE.Vector3): void {
    if (this.disposed) return;
    const safeDt = Math.max(0, Math.min(0.1, dt));

    for (let i = 0; i < this.pool.length; i++) {
      const slot = this.pool[i];
      if (!slot.active) continue;

      slot.age += safeDt;
      if (slot.age >= slot.life) {
        slot.active = false;
        slot.sprite.visible = false;
        slot.material.opacity = 0;
        continue;
      }

      const style = COMBAT_TEXT_STYLES[slot.kind];
      if (style.buoyant) {
        // Weightless Qi / vitality levitation with gentle horizontal shimmer
        const drag = Math.exp(-2.2 * safeDt);
        slot.vx *= drag;
        slot.vz *= drag;
        slot.x += (slot.vx + Math.sin(slot.age * 5.2 + slot.swayPhase) * 0.35) * safeDt;
        slot.y += slot.vy * safeDt;
        slot.z += slot.vz * safeDt;
        slot.vy *= Math.exp(-0.55 * safeDt);
      } else {
        // Ballistic damage pop with smooth horizontal damping & vertical gravity
        const drag = Math.exp(-3.4 * safeDt);
        slot.vx *= drag;
        slot.vz *= drag;
        slot.vy -= style.gravity * safeDt;
        slot.x += slot.vx * safeDt;
        slot.y += slot.vy * safeDt;
        slot.z += slot.vz * safeDt;
      }

      const dx = slot.x - cameraPos.x;
      const dy = slot.y - cameraPos.y;
      const dz = slot.z - cameraPos.z;
      const camDist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      const motion = evaluateCombatTextMotion(slot.age, slot.life, slot.baseScale, slot.kind);
      const heightScale = computeBillboardDistanceScale(camDist, motion.scale);

      slot.sprite.position.set(slot.x, slot.y, slot.z);
      slot.sprite.scale.set(heightScale * SPRITE_ASPECT * 0.45, heightScale * 0.45, 1);
      slot.material.opacity = motion.opacity;
    }
  }

  public clear(): void {
    for (let i = 0; i < this.pool.length; i++) {
      const slot = this.pool[i];
      slot.active = false;
      slot.sprite.visible = false;
      slot.material.opacity = 0;
    }
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (let i = 0; i < this.pool.length; i++) {
      const slot = this.pool[i];
      slot.texture.dispose();
      slot.material.dispose();
    }
    this.group.clear();
    this.pool.length = 0;
  }
}
