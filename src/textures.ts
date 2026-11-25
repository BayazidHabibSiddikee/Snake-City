import * as THREE from 'three';
import { BiomeId } from './types';

function makeCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function seededRand(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Generates organic rock/soil/snow surface detail texture for the open-world 3D mountain range.
 */
export function createTerrainTexture(biome: BiomeId, maxAnisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const [canvas, ctx] = makeCanvas(size);
  const rand = seededRand(biome === 'jungle' ? 8821 : 9913);

  ctx.fillStyle = biome === 'jungle' ? '#9bb098' : '#b4c0ca';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 820; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 4 + rand() * 28;
    const shade =
      rand() > 0.5
        ? 'rgba(255, 255, 255, 0.14)'
        : biome === 'jungle'
          ? 'rgba(22, 48, 28, 0.16)'
          : 'rgba(34, 48, 62, 0.16)';
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Fine mineral grain so ground looks crisp up close in Ant View
  for (let i = 0; i < 1600; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const sz = 1 + rand() * 2.4;
    ctx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
    ctx.fillRect(x, y, sz, sz);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(24, 24);
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Generates repeating emerald reptile scale pattern for the serpent head and body.
 */
export function createSnakeScaleTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const [canvas, ctx] = makeCanvas(size);

  ctx.fillStyle = '#18a86b';
  ctx.fillRect(0, 0, size, size);

  const rows = 8;
  const cols = 8;
  const w = size / cols;
  const h = size / rows;

  for (let r = -1; r <= rows; r++) {
    for (let c = -1; c <= cols; c++) {
      const offsetX = r % 2 === 0 ? 0 : w * 0.5;
      const cx = c * w + offsetX + w * 0.5;
      const cy = r * h + h * 0.5;

      const grad = ctx.createRadialGradient(cx, cy - h * 0.15, 2, cx, cy, w * 0.65);
      grad.addColorStop(0, '#5ef2a8');
      grad.addColorStop(0.6, '#179b63');
      grad.addColorStop(1, '#0b5234');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(cx, cy - h * 0.6);
      ctx.quadraticCurveTo(cx + w * 0.58, cy, cx, cy + h * 0.62);
      ctx.quadraticCurveTo(cx - w * 0.58, cy, cx, cy - h * 0.6);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 232, 130, 0.22)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const [canvas, ctx] = makeCanvas(size);
  const grad = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.22)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Generates a soft, organic multi-lobe cloud/mist puff sprite texture for valley mist & mountain fog.
 */
export function createMistTexture(): THREE.CanvasTexture {
  const size = 128;
  const [canvas, ctx] = makeCanvas(size);
  ctx.clearRect(0, 0, size, size);

  const puffs = [
    { x: 64, y: 64, r: 54, a: 0.42 },
    { x: 48, y: 56, r: 36, a: 0.34 },
    { x: 82, y: 60, r: 34, a: 0.32 },
    { x: 62, y: 78, r: 32, a: 0.28 },
    { x: 58, y: 46, r: 28, a: 0.25 },
  ];

  for (const p of puffs) {
    const grad = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, p.r);
    grad.addColorStop(0, `rgba(240, 248, 255, ${p.a})`);
    grad.addColorStop(0.55, `rgba(225, 240, 252, ${p.a * 0.45})`);
    grad.addColorStop(1, 'rgba(220, 236, 250, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Generates a luminous radial star-spark sprite texture for evolution particle explosions.
 */
export function createSparkGlowTexture(): THREE.CanvasTexture {
  const size = 128;
  const [canvas, ctx] = makeCanvas(size);
  const c = size / 2;
  ctx.clearRect(0, 0, size, size);

  // Soft outer luminous halo
  const halo = ctx.createRadialGradient(c, c, 2, c, c, c);
  halo.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  halo.addColorStop(0.22, 'rgba(255, 252, 232, 0.85)');
  halo.addColorStop(0.55, 'rgba(255, 240, 195, 0.28)');
  halo.addColorStop(1, 'rgba(255, 230, 170, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, size, size);

  // Crisp subtle 4-point star flare glint across center
  ctx.save();
  ctx.translate(c, c);
  for (let i = 0; i < 2; i++) {
    ctx.rotate((i * Math.PI) / 2);
    const flare = ctx.createLinearGradient(-c * 0.85, 0, c * 0.85, 0);
    flare.addColorStop(0, 'rgba(255, 255, 255, 0)');
    flare.addColorStop(0.45, 'rgba(255, 255, 255, 0.55)');
    flare.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
    flare.addColorStop(0.55, 'rgba(255, 255, 255, 0.55)');
    flare.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = flare;
    ctx.fillRect(-c * 0.85, -3.5, c * 1.7, 7);
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
