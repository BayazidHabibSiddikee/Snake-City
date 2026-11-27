import * as THREE from 'three';

/**
 * Single-draw-call GPU BufferGeometry particle system for Cultivation Breakthroughs
 * (player level-up & Ascended Human evolution energy bursts).
 *
 * Consolidates all 5 celebratory visual layers—Core Supernova Shards, Equatorial
 * Crown Burst, Dual-Helix Spirit Ribbons, Star-Spark Bokeh Cloud, and Staggered
 * Shockwave Rings + Sky Pillar Motes—into ONE unified THREE.BufferGeometry +
 * THREE.ShaderMaterial rendered by ONE THREE.Points draw call.
 *
 * Per-particle typed attributes are uploaded ONCE on spawn; every subsequent frame
 * updates only a single scalar `uTime` uniform with zero CPU physics loops, zero
 * matrix uploads, and zero per-frame allocations.
 */

export const BREAKTHROUGH_LAYER_COUNTS = {
  coreShards: 240,
  crownRing: 160,
  spiritHelix: 180,
  starSparks: 220,
  shockRings: 108,
  skyPillar: 52,
} as const;

export const BREAKTHROUGH_TOTAL_PARTICLES =
  BREAKTHROUGH_LAYER_COUNTS.coreShards +
  BREAKTHROUGH_LAYER_COUNTS.crownRing +
  BREAKTHROUGH_LAYER_COUNTS.spiritHelix +
  BREAKTHROUGH_LAYER_COUNTS.starSparks +
  BREAKTHROUGH_LAYER_COUNTS.shockRings +
  BREAKTHROUGH_LAYER_COUNTS.skyPillar;

export interface BreakthroughSpawnParams {
  x: number;
  y: number;
  z: number;
  scaleColorHex: number;
  manaColorHex: number;
  level: number;
  isHuman: boolean;
  bodyTrail?: Array<{ x: number; y: number; z: number }>;
  pixelRatio?: number;
}

export const BREAKTHROUGH_VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;

  attribute vec3 aVelocity;
  attribute vec3 aColor;
  attribute vec4 aTiming; // x: delay, y: life, z: baseSize, w: mode (0..5)
  attribute vec4 aParams; // mode-specific physics scalars

  varying vec3 vColor;
  varying float vAlpha;
  varying float vMode;
  varying float vPhase;

  void main() {
    float delay = aTiming.x;
    float life = max(0.05, aTiming.y);
    float baseSize = aTiming.z;
    float mode = aTiming.w;
    float age = uTime - delay;

    if (age <= 0.0 || age >= life) {
      vAlpha = 0.0;
      vColor = vec3(0.0);
      vMode = mode;
      vPhase = 0.0;
      gl_PointSize = 0.0;
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      return;
    }

    float u = clamp(age / life, 0.0, 1.0);
    vec3 worldPos = position;
    float env = 1.0;

    if (mode < 1.5) {
      // Mode 0 (Core Supernova Shards) & Mode 1 (Equatorial Crown Burst):
      // Closed-form exponential drag + gravity arc
      float dragK = max(0.05, aParams.x);
      float gravity = aParams.y;
      float horizTravel = (1.0 - exp(-dragK * age)) / dragK;
      float vertDrag = max(0.05, dragK * 0.72);
      float vertTravel = (1.0 - exp(-vertDrag * age)) / vertDrag;

      worldPos.x += aVelocity.x * horizTravel;
      worldPos.z += aVelocity.z * horizTravel;
      worldPos.y += aVelocity.y * vertTravel - 0.5 * gravity * age * age / (1.0 + 0.32 * vertDrag * age);

      // Snappy pop-in then silky taper
      env = u < 0.10 ? (u / 0.10) : pow(1.0 - (u - 0.10) / 0.90, 1.32);
    } else if (mode < 2.5) {
      // Mode 2: Ascending Dual-Helix Spirit Ribbons
      float ang = aVelocity.x + age * aVelocity.z;
      float rad = aVelocity.y * (1.0 + u * aParams.x);
      worldPos.x += cos(ang) * rad;
      worldPos.z += sin(ang) * rad;
      worldPos.y += age * aParams.y;
      env = u < 0.12 ? (u / 0.12) : pow(1.0 - (u - 0.12) / 0.88, 1.25);
    } else if (mode < 3.5) {
      // Mode 3: Radiant Star-Spark Bokeh Cloud
      float dragK = max(0.05, aParams.x);
      float gravity = aParams.y;
      float travel = (1.0 - exp(-dragK * age)) / dragK;
      worldPos.x += aVelocity.x * travel;
      worldPos.z += aVelocity.z * travel;
      worldPos.y += aVelocity.y * travel - 0.5 * gravity * age * age;
      float twinkle = 0.72 + 0.28 * sin(age * 24.0 + aParams.z);
      env = pow(1.0 - u, 1.35) * twinkle;
    } else if (mode < 4.5) {
      // Mode 4: Three Staggered Expanding Shockwave Rings
      float easeOut = 1.0 - pow(1.0 - u, 2.4);
      float rad = mix(aVelocity.y, aVelocity.z, easeOut);
      float ang = aVelocity.x + age * 0.45;
      worldPos.x += cos(ang) * rad;
      worldPos.z += sin(ang) * rad;
      worldPos.y += 0.15 + age * aParams.x;
      env = (u < 0.08 ? (u / 0.08) : 1.0) * pow(1.0 - u, 1.55);
    } else {
      // Mode 5: Ascending Celestial Sky Pillar Motes
      float ang = aVelocity.x + age * aVelocity.z;
      float widthPulse = u < 0.18 ? (0.45 + (u / 0.18) * 0.95) : (1.40 * (1.0 - (u - 0.18) / 0.82 * 0.55));
      float rad = aVelocity.y * max(0.2, widthPulse);
      worldPos.x += cos(ang) * rad;
      worldPos.z += sin(ang) * rad;
      worldPos.y += aParams.x + age * aParams.y;
      env = (u < 0.14 ? (u / 0.14) : 1.0) * pow(1.0 - u, 1.45);
    }

    vec4 mvPosition = modelViewMatrix * vec4(worldPos, 1.0);
    float dist = max(1.0, -mvPosition.z);

    vColor = aColor;
    vAlpha = clamp(env, 0.0, 1.0);
    vMode = mode;
    vPhase = age * 7.5 + aParams.z;

    float sizePulse = (mode < 1.5) ? (0.45 + 0.65 * env) : (0.65 + 0.45 * env);
    gl_PointSize = clamp(baseSize * sizePulse * uPixelRatio * (270.0 / dist), 1.5, 92.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const BREAKTHROUGH_FRAGMENT_SHADER = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vMode;
  varying float vPhase;

  void main() {
    if (vAlpha <= 0.01) discard;

    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float shapeAlpha = 0.0;
    float coreHot = 0.0;

    if (vMode < 1.5) {
      // Rotating faceted crystal diamond / star-shard SDF
      float c = cos(vPhase);
      float s = sin(vPhase);
      vec2 rp = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
      float diamond = abs(rp.x) * 1.25 + abs(rp.y) * 0.82;
      float starCross = min(abs(rp.x), abs(rp.y)) * 2.4 + length(rp) * 0.65;
      float d = min(diamond, starCross);
      shapeAlpha = 1.0 - smoothstep(0.42, 0.96, d);
      coreHot = 1.0 - smoothstep(0.0, 0.42, d);
    } else if (vMode < 2.5) {
      // Luminous spirit helix orb with razor-bright core
      float r = length(p);
      shapeAlpha = pow(max(0.0, 1.0 - r), 1.85);
      coreHot = 1.0 - smoothstep(0.0, 0.38, r);
    } else if (vMode < 3.5) {
      // Soft radiant star-spark bokeh with subtle 4-ray flare
      float r = length(p);
      float rays = exp(-abs(p.x) * 7.0) * exp(-r * 2.1) + exp(-abs(p.y) * 7.0) * exp(-r * 2.1);
      float disc = pow(max(0.0, 1.0 - r), 2.1);
      shapeAlpha = clamp(disc + rays * 0.55, 0.0, 1.0);
      coreHot = 1.0 - smoothstep(0.0, 0.34, r);
    } else {
      // Shockwave ring plasma bead & sky pillar ember
      float r = length(p);
      shapeAlpha = pow(max(0.0, 1.0 - r), 1.55);
      coreHot = 1.0 - smoothstep(0.0, 0.44, r);
    }

    float finalAlpha = shapeAlpha * vAlpha;
    if (finalAlpha <= 0.015) discard;

    vec3 glowColor = mix(vColor, vec3(1.0, 0.99, 0.93), coreHot * 0.65);
    gl_FragColor = vec4(glowColor * (1.0 + coreHot * 0.55), finalAlpha);
  }
`;

/**
 * Pure seeded PRNG helper (Mulberry32) so breakthrough bursts remain deterministic
 * in tests while still delivering rich organic variety on every level-up.
 */
function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class BreakthroughParticleSystem {
  public readonly group = new THREE.Group();
  public readonly geometry: THREE.BufferGeometry;
  public readonly material: THREE.ShaderMaterial;
  public readonly points: THREE.Points;
  public readonly flashLight: THREE.PointLight;
  public readonly particleCount = BREAKTHROUGH_TOTAL_PARTICLES;

  private readonly positions: Float32Array;
  private readonly velocities: Float32Array;
  private readonly colors: Float32Array;
  private readonly timings: Float32Array;
  private readonly params: Float32Array;
  private readonly scratchColor = new THREE.Color();

  private active = false;
  private age = 0;
  private duration = 3.2;
  private flashPeak = 16;
  private burstCounter = 0;
  private disposed = false;

  constructor(initialPixelRatio = 1) {
    this.group.name = 'cultivationBreakthroughBufferSystem';
    this.group.visible = false;

    const n = this.particleCount;
    this.positions = new Float32Array(n * 3);
    this.velocities = new Float32Array(n * 3);
    this.colors = new Float32Array(n * 3);
    this.timings = new Float32Array(n * 4);
    this.params = new Float32Array(n * 4);

    // Park particles inactive until spawn()
    for (let i = 0; i < n; i++) {
      this.positions[i * 3 + 1] = -300;
      this.timings[i * 4 + 1] = 1.0;
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('aVelocity', new THREE.BufferAttribute(this.velocities, 3));
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('aTiming', new THREE.BufferAttribute(this.timings, 4));
    this.geometry.setAttribute('aParams', new THREE.BufferAttribute(this.params, 4));

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.max(1, Math.min(2, initialPixelRatio)) },
      },
      vertexShader: BREAKTHROUGH_VERTEX_SHADER,
      fragmentShader: BREAKTHROUGH_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.name = 'breakthroughUnifiedBufferPoints';
    this.points.frustumCulled = false;
    this.points.renderOrder = 6;
    this.group.add(this.points);

    this.flashLight = new THREE.PointLight(0xffe699, 0, 38, 1.5);
    this.group.add(this.flashLight);
  }

  /** Always renders the entire multi-layer energy burst in 1 single WebGL draw call. */
  public getDrawCallCount(): number {
    return 1;
  }

  public isActive(): boolean {
    return this.active;
  }

  public setPixelRatio(pixelRatio: number): void {
    if (this.disposed) return;
    this.material.uniforms.uPixelRatio.value = Math.max(1, Math.min(2, pixelRatio));
  }

  /**
   * Populates all 960 layered breakthrough particles into the single BufferGeometry
   * in one tight typed-array pass, triggering a single GPU buffer upload.
   */
  public spawn(opts: BreakthroughSpawnParams): void {
    if (this.disposed) return;

    const { x, y, z, scaleColorHex, manaColorHex, level, isHuman, bodyTrail } = opts;
    if (opts.pixelRatio !== undefined) {
      this.setPixelRatio(opts.pixelRatio);
    }

    this.active = true;
    this.age = 0;
    this.duration = isHuman ? 3.8 : 3.0;
    this.group.visible = true;
    this.material.uniforms.uTime.value = 0;

    const rand = createSeededRandom(++this.burstCounter * 2654435761 + level * 97);
    const powerScale = isHuman ? 1.45 : 0.92 + (level / 12) * 0.42;
    const palette = [
      0xfff8dc, // incandescent white-gold core
      0xffe066, // radiant ascension gold
      manaColorHex, // newly awakened magic tier hue
      scaleColorHex, // evolved form hue
    ];

    let cursor = 0;
    const writeColor = (idx: number, hex: number) => {
      this.scratchColor.setHex(hex);
      const c3 = idx * 3;
      this.colors[c3] = this.scratchColor.r;
      this.colors[c3 + 1] = this.scratchColor.g;
      this.colors[c3 + 2] = this.scratchColor.b;
    };

    // Layer 0 (240): Core Radial Supernova Shards (mode = 0)
    for (let i = 0; i < BREAKTHROUGH_LAYER_COUNTS.coreShards; i++, cursor++) {
      const p3 = cursor * 3;
      const t4 = cursor * 4;
      const trailPt =
        bodyTrail && bodyTrail.length > 0 && i % 4 === 0
          ? bodyTrail[i % bodyTrail.length]
          : null;
      this.positions[p3] = trailPt ? trailPt.x : x;
      this.positions[p3 + 1] = trailPt ? trailPt.y + 0.7 : y;
      this.positions[p3 + 2] = trailPt ? trailPt.z : z;

      const theta = rand() * Math.PI * 2;
      const elev = -0.15 + rand() * 1.45;
      const speed = (6.8 + rand() * 11.8) * powerScale;
      const horiz = Math.cos(elev) * speed;
      this.velocities[p3] = Math.cos(theta) * horiz;
      this.velocities[p3 + 1] = Math.sin(elev) * speed + 2.4 * powerScale;
      this.velocities[p3 + 2] = Math.sin(theta) * horiz;

      writeColor(cursor, palette[i % palette.length]);

      this.timings[t4] = rand() * 0.08;
      this.timings[t4 + 1] = 1.25 + rand() * 0.95;
      this.timings[t4 + 2] = (1.15 + rand() * 1.15) * (isHuman ? 1.24 : 1.0);
      this.timings[t4 + 3] = 0;

      this.params[t4] = 1.35; // drag
      this.params[t4 + 1] = 6.2; // gravity
      this.params[t4 + 2] = rand() * Math.PI * 2;
      this.params[t4 + 3] = 1;
    }

    // Layer 1 (160): Equatorial Crown Burst (mode = 1)
    for (let i = 0; i < BREAKTHROUGH_LAYER_COUNTS.crownRing; i++, cursor++) {
      const p3 = cursor * 3;
      const t4 = cursor * 4;
      const theta = (i / BREAKTHROUGH_LAYER_COUNTS.crownRing) * Math.PI * 2 + (rand() - 0.5) * 0.05;
      const speed = (10.5 + rand() * 4.4) * powerScale;

      this.positions[p3] = x + Math.cos(theta) * 0.5;
      this.positions[p3 + 1] = y + 0.15;
      this.positions[p3 + 2] = z + Math.sin(theta) * 0.5;

      this.velocities[p3] = Math.cos(theta) * speed;
      this.velocities[p3 + 1] = 1.2 + rand() * 2.2;
      this.velocities[p3 + 2] = Math.sin(theta) * speed;

      writeColor(cursor, i % 2 === 0 ? 0xffe066 : manaColorHex);

      this.timings[t4] = 0.05 + (i % 2) * 0.09;
      this.timings[t4 + 1] = 1.1 + rand() * 0.55;
      this.timings[t4 + 2] = (1.1 + rand() * 0.7) * (isHuman ? 1.22 : 1.0);
      this.timings[t4 + 3] = 1;

      this.params[t4] = 2.05; // drag
      this.params[t4 + 1] = 3.1; // gentle drop
      this.params[t4 + 2] = rand() * Math.PI * 2;
      this.params[t4 + 3] = 1;
    }

    // Layer 2 (180): Ascending Dual-Helix Spirit Ribbons (mode = 2)
    for (let i = 0; i < BREAKTHROUGH_LAYER_COUNTS.spiritHelix; i++, cursor++) {
      const p3 = cursor * 3;
      const t4 = cursor * 4;
      const orbitAngle = (i % 2) * Math.PI + (i / BREAKTHROUGH_LAYER_COUNTS.spiritHelix) * Math.PI * 4;
      const orbitRadius = 0.95 + rand() * 2.35 * powerScale;
      const orbitSpeed = (2.6 + rand() * 2.2) * (i % 2 === 0 ? 1 : -1);

      this.positions[p3] = x;
      this.positions[p3 + 1] = y - 0.2;
      this.positions[p3 + 2] = z;

      this.velocities[p3] = orbitAngle;
      this.velocities[p3 + 1] = orbitRadius;
      this.velocities[p3 + 2] = orbitSpeed;

      writeColor(cursor, i % 3 === 0 ? 0xfff8dc : i % 3 === 1 ? 0xffe066 : manaColorHex);

      this.timings[t4] = 0.04 + rand() * 0.55;
      this.timings[t4 + 1] = 1.85 + rand() * 1.1;
      this.timings[t4 + 2] = (0.95 + rand() * 0.95) * (isHuman ? 1.25 : 1.0);
      this.timings[t4 + 3] = 2;

      this.params[t4] = 0.95; // radius expansion factor
      this.params[t4 + 1] = (2.9 + rand() * 4.5) * powerScale; // rise speed
      this.params[t4 + 2] = rand() * Math.PI * 2;
      this.params[t4 + 3] = 1;
    }

    // Layer 3 (220): Radiant Star-Spark Bokeh Cloud (mode = 3)
    for (let i = 0; i < BREAKTHROUGH_LAYER_COUNTS.starSparks; i++, cursor++) {
      const p3 = cursor * 3;
      const t4 = cursor * 4;
      const theta = rand() * Math.PI * 2;
      const phi = -0.1 + rand() * 1.55;
      const speed = (3.4 + rand() * 12.0) * powerScale;
      const h = Math.cos(phi) * speed;

      this.positions[p3] = x + (rand() - 0.5) * 1.4;
      this.positions[p3 + 1] = y + (rand() - 0.5) * 0.8;
      this.positions[p3 + 2] = z + (rand() - 0.5) * 1.4;

      this.velocities[p3] = Math.cos(theta) * h;
      this.velocities[p3 + 1] = Math.sin(phi) * speed + 2.8 * powerScale;
      this.velocities[p3 + 2] = Math.sin(theta) * h;

      writeColor(cursor, palette[i % palette.length]);

      this.timings[t4] = rand() * 0.24;
      this.timings[t4 + 1] = 1.45 + rand() * 1.35;
      this.timings[t4 + 2] = (1.35 + rand() * 0.85) * (isHuman ? 1.25 : 1.0);
      this.timings[t4 + 3] = 3;

      this.params[t4] = 1.65; // drag
      this.params[t4 + 1] = 2.05; // light gravity
      this.params[t4 + 2] = i * 1.7; // twinkle phase
      this.params[t4 + 3] = 1;
    }

    // Layer 4 (108): Three Staggered Expanding Shockwave Rings (mode = 4)
    const ringColors = [0xfff6cc, manaColorHex, isHuman ? 0xffe066 : scaleColorHex];
    const perRing = BREAKTHROUGH_LAYER_COUNTS.shockRings / 3;
    for (let i = 0; i < BREAKTHROUGH_LAYER_COUNTS.shockRings; i++, cursor++) {
      const p3 = cursor * 3;
      const t4 = cursor * 4;
      const waveIdx = Math.floor(i / perRing);
      const localIdx = i % perRing;
      const angle = (localIdx / perRing) * Math.PI * 2;
      const maxRadius = (11.5 + waveIdx * 3.6) * powerScale;

      this.positions[p3] = x;
      this.positions[p3 + 1] = y;
      this.positions[p3 + 2] = z;

      this.velocities[p3] = angle;
      this.velocities[p3 + 1] = 0.55;
      this.velocities[p3 + 2] = maxRadius;

      writeColor(cursor, ringColors[waveIdx % ringColors.length]);

      this.timings[t4] = waveIdx * 0.14;
      this.timings[t4 + 1] = (1.1 + waveIdx * 0.22) * (isHuman ? 1.25 : 1.0);
      this.timings[t4 + 2] = (1.45 + waveIdx * 0.18) * (isHuman ? 1.18 : 1.0);
      this.timings[t4 + 3] = 4;

      this.params[t4] = 0.65 + waveIdx * 0.65; // rise speed
      this.params[t4 + 1] = waveIdx;
      this.params[t4 + 2] = angle;
      this.params[t4 + 3] = 1;
    }

    // Layer 5 (52): Ascending Celestial Sky Pillar Motes (mode = 5)
    for (let i = 0; i < BREAKTHROUGH_LAYER_COUNTS.skyPillar; i++, cursor++) {
      const p3 = cursor * 3;
      const t4 = cursor * 4;
      const angle = (i / BREAKTHROUGH_LAYER_COUNTS.skyPillar) * Math.PI * 6;
      const colRadius = 0.55 + rand() * 1.45;
      const spinSpeed = (1.8 + rand() * 1.5) * (i % 2 === 0 ? 1 : -1);

      this.positions[p3] = x;
      this.positions[p3 + 1] = y - 0.3;
      this.positions[p3 + 2] = z;

      this.velocities[p3] = angle;
      this.velocities[p3 + 1] = colRadius;
      this.velocities[p3 + 2] = spinSpeed;

      writeColor(cursor, isHuman ? 0xfff0a8 : i % 2 === 0 ? manaColorHex : 0xffe999);

      this.timings[t4] = rand() * 0.16;
      this.timings[t4 + 1] = 1.45 + rand() * 0.45;
      this.timings[t4 + 2] = (1.7 + rand() * 1.1) * (isHuman ? 1.2 : 1.0);
      this.timings[t4 + 3] = 5;

      this.params[t4] = (i / BREAKTHROUGH_LAYER_COUNTS.skyPillar) * 18.0; // vertical column seed
      this.params[t4 + 1] = (7.5 + rand() * 6.5) * powerScale; // upward beam speed
      this.params[t4 + 2] = rand() * Math.PI * 2;
      this.params[t4 + 3] = 1;
    }

    // Single one-shot GPU buffer upload for the entire burst
    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.aVelocity as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.aColor as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.aTiming as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.aParams as THREE.BufferAttribute).needsUpdate = true;

    // Local flash illumination synced with the burst
    this.flashLight.position.set(x, y + 2.2, z);
    this.flashLight.color.setHex(isHuman ? 0xffe999 : manaColorHex);
    this.flashPeak = isHuman ? 24 : 15;
    this.flashLight.intensity = this.flashPeak;
  }

  /**
   * Advances breakthrough playback by updating ONLY the `uTime` uniform
   * and decaying the transient flash light (zero CPU buffer uploads per frame).
   */
  public update(dt: number): boolean {
    if (!this.active || this.disposed) return false;
    const safeDt = Math.max(0, Math.min(0.1, dt));
    this.age += safeDt;

    this.material.uniforms.uTime.value = this.age;

    const flashLife = 1.15;
    if (this.age < flashLife) {
      const fu = this.age / flashLife;
      this.flashLight.intensity = this.flashPeak * Math.pow(1 - fu, 2.1);
    } else {
      this.flashLight.intensity = 0;
    }

    if (this.age >= this.duration) {
      this.active = false;
      this.group.visible = false;
      this.flashLight.intensity = 0;
      return false;
    }
    return true;
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.active = false;
    this.geometry.dispose();
    this.material.dispose();
    this.group.clear();
  }
}
