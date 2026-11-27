import * as THREE from 'three';

export interface BreakthroughParticle {
  active: boolean;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  age: number;
  life: number;
  color: THREE.Color;
  size: number;
}

/**
 * Standalone Cultivation Breakthrough Particle System (`src/game/engine/CultivationBreakthroughParticles.ts`).
 * Spawns localized energy bursts when the player levels up using Three.js Points & PointsMaterial
 * with additive blending and vertex colors.
 */
export class CultivationBreakthroughParticleSystem {
  private readonly maxParticles = 250;
  private readonly group: THREE.Group;
  private readonly points: THREE.Points;
  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.PointsMaterial;
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly particles: BreakthroughParticle[] = [];

  constructor(scene: THREE.Scene, sparkTexture?: THREE.Texture) {
    this.group = new THREE.Group();

    this.positions = new Float32Array(this.maxParticles * 3);
    this.colors = new Float32Array(this.maxParticles * 3);

    for (let i = 0; i < this.maxParticles; i++) {
      this.positions[i * 3] = 0;
      this.positions[i * 3 + 1] = -500; // Hidden initially
      this.positions[i * 3 + 2] = 0;

      this.colors[i * 3] = 1;
      this.colors[i * 3 + 1] = 0.85;
      this.colors[i * 3 + 2] = 0.2;

      this.particles.push({
        active: false,
        position: new THREE.Vector3(0, -500, 0),
        velocity: new THREE.Vector3(),
        age: 0,
        life: 1.5,
        color: new THREE.Color(0xffd700),
        size: 1.5,
      });
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    this.material = new THREE.PointsMaterial({
      map: sparkTexture ?? undefined,
      size: 1.8,
      transparent: true,
      opacity: 0.95,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 10;
    this.group.add(this.points);
    scene.add(this.group);
  }

  /**
   * Triggers a localized energy burst at the player's world position upon level up / breakthrough.
   */
  public triggerBurst(origin: THREE.Vector3, intensity = 1.0): void {
    let spawnedCount = 0;
    const countToSpawn = Math.floor(120 * Math.max(0.5, Math.min(2.0, intensity)));

    for (let i = 0; i < this.maxParticles && spawnedCount < countToSpawn; i++) {
      const p = this.particles[i];
      p.active = true;
      p.age = 0;
      p.life = 1.2 + Math.random() * 1.1;

      p.position.copy(origin).add(
        new THREE.Vector3(
          (Math.random() - 0.5) * 0.8,
          Math.random() * 0.5,
          (Math.random() - 0.5) * 0.8,
        ),
      );

      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.2) * Math.PI * 0.7; // Upward bias
      const speed = 4.0 + Math.random() * 8.5 * intensity;

      p.velocity.set(
        Math.cos(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * speed + 3.0,
        Math.cos(phi) * Math.sin(theta) * speed,
      );

      // Randomize radiant gold / emerald / cyan energy colors
      const palette = [
        new THREE.Color(0xffd700), // Gold
        new THREE.Color(0x34d399), // Jade Emerald
        new THREE.Color(0x34dcff), // Cyan Qi
        new THREE.Color(0xff6b6b), // Crimson Aura
      ];
      p.color.copy(palette[Math.floor(Math.random() * palette.length)]);
      spawnedCount++;
    }
  }

  public update(dt: number): void {
    const posAttr = this.geometry.attributes.position as THREE.BufferAttribute;
    const colAttr = this.geometry.attributes.color as THREE.BufferAttribute;

    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];
      const idx = i * 3;

      if (!p.active) {
        this.positions[idx] = 0;
        this.positions[idx + 1] = -500;
        this.positions[idx + 2] = 0;
        continue;
      }

      p.age += dt;
      if (p.age >= p.life) {
        p.active = false;
        this.positions[idx] = 0;
        this.positions[idx + 1] = -500;
        this.positions[idx + 2] = 0;
        continue;
      }

      // Physics integration: gravity + upward fountain lift + drag
      p.velocity.y -= 4.8 * dt; // Gravity pull
      p.velocity.multiplyScalar(Math.max(0, 1 - 1.8 * dt)); // Air resistance
      p.position.addScaledVector(p.velocity, dt);

      this.positions[idx] = p.position.x;
      this.positions[idx + 1] = p.position.y;
      this.positions[idx + 2] = p.position.z;

      const fade = 1 - p.age / p.life;
      this.colors[idx] = p.color.r * fade;
      this.colors[idx + 1] = p.color.g * fade;
      this.colors[idx + 2] = p.color.b * fade;
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }

  public dispose(): void {
    this.group.clear();
    this.geometry.dispose();
    this.material.dispose();
  }
}
