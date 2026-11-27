import * as THREE from 'three';
import { terrainHeightAt } from '../../terrain';
import {
  FOUNDRY_WORLD_ORIGIN,
  type FoundrySimulationState,
} from './FoundrySimulation';

interface BladeRig {
  group: THREE.Group;
  rotor: THREE.Group;
  shaftMat: THREE.MeshStandardMaterial;
}

interface EnemyRig {
  group: THREE.Group;
  coreMat: THREE.MeshStandardMaterial;
}

/**
 * Procedural 3D Three.js visual layer for The Forgotten Soul Foundry.
 * Driven purely by deterministic FoundrySimulationState (visuals never mutate simulation).
 */
export class FoundryRenderer {
  public readonly root = new THREE.Group();
  private readonly bladeRigs = new Map<string, BladeRig>();
  private readonly plateMats = new Map<string, THREE.MeshStandardMaterial>();
  private readonly enemyRigs = new Map<string, EnemyRig>();
  private readonly bridgeMesh: THREE.Mesh;
  private readonly conduitMat: THREE.MeshBasicMaterial;
  private readonly bossGroup = new THREE.Group();
  private readonly bossArmorRing = new THREE.Group();
  private readonly bossCoreMat: THREE.MeshStandardMaterial;
  private readonly bossShieldMesh: THREE.Mesh;
  private readonly bossShockwaveMesh: THREE.Mesh;
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];

  constructor() {
    this.root.name = 'ForgottenSoulFoundry';
    const ox = FOUNDRY_WORLD_ORIGIN.x;
    const oz = FOUNDRY_WORLD_ORIGIN.z;
    const baseY = terrainHeightAt(ox, oz, 'jungle');
    this.root.position.set(ox, baseY, oz);

    const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
      this.geometries.push(g);
      return g;
    };
    const trackMat = <T extends THREE.Material>(m: T): T => {
      this.materials.push(m);
      return m;
    };

    // Perimeter bronze & basalt foundry ring
    const ringGeo = trackGeo(new THREE.RingGeometry(48, 52, 48));
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xf2c14e,
        transparent: true,
        opacity: 0.24,
        side: THREE.DoubleSide,
      }),
    );
    const perimeter = new THREE.Mesh(ringGeo, ringMat);
    perimeter.position.y = 0.25;
    this.root.add(perimeter);

    // Monumental Foundry Entrance Pillars
    const stoneMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x26313b, roughness: 0.82, metalness: 0.28 }),
    );
    const brassMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xd9a13b, roughness: 0.36, metalness: 0.72 }),
    );
    const pillarGeo = trackGeo(new THREE.BoxGeometry(2.4, 11.5, 2.4));
    for (const sx of [-9, 9]) {
      const p = new THREE.Mesh(pillarGeo, stoneMat);
      p.position.set(sx, 5.75, -46);
      p.castShadow = true;
      p.receiveShadow = true;
      this.root.add(p);
    }
    const lintel = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(22, 2.0, 3.0)), brassMat);
    lintel.position.set(0, 12.2, -46);
    this.root.add(lintel);

    // Hydraulic Bridge
    const bridgeGeo = trackGeo(new THREE.BoxGeometry(10.5, 0.9, 14));
    const bridgeMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x3b6e7f, roughness: 0.48, metalness: 0.55 }),
    );
    this.bridgeMesh = new THREE.Mesh(bridgeGeo, bridgeMat);
    this.bridgeMesh.position.set(0, -1.2, -2);
    this.bridgeMesh.receiveShadow = true;
    this.root.add(this.bridgeMesh);

    // Electrified Conduit Floor Grid
    const conduitGeo = trackGeo(new THREE.PlaneGeometry(18, 12));
    conduitGeo.rotateX(-Math.PI / 2);
    this.conduitMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0x2de3ff,
        transparent: true,
        opacity: 0.14,
        side: THREE.DoubleSide,
      }),
    );
    const conduitMesh = new THREE.Mesh(conduitGeo, this.conduitMat);
    conduitMesh.position.set(0, 0.35, 4);
    this.root.add(conduitMesh);

    // Build Soulbound Colossus Boss Rig
    const bossBody = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(3.4, 4.4, 10.5, 10)), stoneMat);
    bossBody.position.y = 5.25;
    bossBody.castShadow = true;
    this.bossGroup.add(bossBody);

    this.bossCoreMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x38bdf8,
        emissiveIntensity: 1.4,
        roughness: 0.25,
        metalness: 0.4,
      }),
    );
    const bossCore = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(2.3, 1)), this.bossCoreMat);
    bossCore.position.y = 7.4;
    this.bossGroup.add(bossCore);

    const armorPlateGeo = trackGeo(new THREE.BoxGeometry(1.4, 5.2, 3.6));
    for (let i = 0; i < 4; i += 1) {
      const a = (i / 4) * Math.PI * 2;
      const plate = new THREE.Mesh(armorPlateGeo, brassMat);
      plate.position.set(Math.cos(a) * 5.2, 5.5, Math.sin(a) * 5.2);
      plate.rotation.y = -a;
      this.bossArmorRing.add(plate);
    }
    this.bossGroup.add(this.bossArmorRing);

    const shieldMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        transparent: true,
        opacity: 0.28,
        wireframe: true,
      }),
    );
    this.bossShieldMesh = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(7.2, 18, 14)), shieldMat);
    this.bossShieldMesh.position.y = 5.8;
    this.bossShieldMesh.visible = false;
    this.bossGroup.add(this.bossShieldMesh);

    const shockGeo = trackGeo(new THREE.RingGeometry(0.85, 1.0, 36));
    shockGeo.rotateX(-Math.PI / 2);
    const shockMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xfb7185,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide,
      }),
    );
    this.bossShockwaveMesh = new THREE.Mesh(shockGeo, shockMat);
    this.bossShockwaveMesh.position.y = 0.45;
    this.bossShockwaveMesh.visible = false;
    this.bossGroup.add(this.bossShockwaveMesh);

    this.bossGroup.position.set(0, 0, 34);
    this.root.add(this.bossGroup);
  }

  private ensureBladeRig(id: string, radius: number): BladeRig {
    const existing = this.bladeRigs.get(id);
    if (existing) return existing;

    const group = new THREE.Group();
    const shaftGeo = new THREE.CylinderGeometry(0.75, 0.95, 3.6, 8);
    const shaftMat = new THREE.MeshStandardMaterial({
      color: 0xd9a13b,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.45,
      roughness: 0.35,
      metalness: 0.7,
    });
    this.geometries.push(shaftGeo);
    this.materials.push(shaftMat);

    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.position.y = 1.8;
    group.add(shaft);

    const rotor = new THREE.Group();
    rotor.position.y = 1.5;
    const bladeGeo = new THREE.BoxGeometry(radius * 2, 0.24, 0.95);
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0xd8e6f0,
      emissive: 0xfb7185,
      emissiveIntensity: 0.3,
      roughness: 0.2,
      metalness: 0.88,
    });
    this.geometries.push(bladeGeo);
    this.materials.push(bladeMat);

    const bladeMesh = new THREE.Mesh(bladeGeo, bladeMat);
    rotor.add(bladeMesh);
    group.add(rotor);

    this.root.add(group);
    const rig = { group, rotor, shaftMat };
    this.bladeRigs.set(id, rig);
    return rig;
  }

  private ensurePlateMat(id: string, x: number, z: number, radius: number): THREE.MeshStandardMaterial {
    const existing = this.plateMats.get(id);
    if (existing) return existing;

    const geo = new THREE.CylinderGeometry(radius * 0.72, radius * 0.82, 0.36, 12);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.25,
      roughness: 0.45,
      metalness: 0.6,
    });
    this.geometries.push(geo);
    this.materials.push(mat);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.22, z);
    this.root.add(mesh);
    this.plateMats.set(id, mat);
    return mat;
  }

  private ensureEnemyRig(id: string, isEngineer: boolean): EnemyRig {
    const existing = this.enemyRigs.get(id);
    if (existing) return existing;

    const group = new THREE.Group();
    const bodyGeo = new THREE.ConeGeometry(1.4, 3.8, 7);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: isEngineer ? 0x312e81 : 0x1e293b,
      roughness: 0.5,
      metalness: 0.55,
    });
    const coreGeo = new THREE.OctahedronGeometry(0.85, 0);
    const coreMat = new THREE.MeshStandardMaterial({
      color: isEngineer ? 0xf59e0b : 0xa855f7,
      emissive: isEngineer ? 0xf59e0b : 0xa855f7,
      emissiveIntensity: 0.9,
    });
    this.geometries.push(bodyGeo, coreGeo);
    this.materials.push(bodyMat, coreMat);

    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.9;
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.y = 4.2;
    group.add(body, core);
    this.root.add(group);

    const rig = { group, coreMat };
    this.enemyRigs.set(id, rig);
    return rig;
  }

  public sync(state: FoundrySimulationState): void {
    const ox = FOUNDRY_WORLD_ORIGIN.x;
    const oz = FOUNDRY_WORLD_ORIGIN.z;
    const baseY = this.root.position.y;

    for (const blade of state.blades) {
      const rig = this.ensureBladeRig(blade.id, blade.radius);
      const localY = terrainHeightAt(ox + blade.localX, oz + blade.localZ, 'jungle') - baseY;
      rig.group.position.set(blade.localX, localY, blade.localZ);
      rig.rotor.rotation.y = -blade.angleRad;
      rig.shaftMat.emissive.setHex(blade.driveShaftDamaged ? 0xf87171 : 0x38bdf8);
      rig.shaftMat.emissiveIntensity = blade.driveShaftDamaged ? 0.95 : 0.4;
    }

    for (const plate of state.plates) {
      const mat = this.ensurePlateMat(plate.id, plate.localX, plate.localZ, plate.radius);
      mat.emissive.setHex(plate.active ? 0x3de095 : 0x38bdf8);
      mat.emissiveIntensity = plate.active ? 1.2 : 0.25;
    }

    // Smooth hydraulic bridge lift
    const targetBridgeY = state.hydraulics.bridgeRaised ? 0.8 : -1.2;
    this.bridgeMesh.position.y += (targetBridgeY - this.bridgeMesh.position.y) * 0.14;

    // Conduit electrical arc highlight
    if (state.conduitActiveTimer > 0 || state.energyPuzzle.overloaded) {
      this.conduitMat.color.setHex(state.energyPuzzle.overloaded ? 0xfb7185 : 0x2de3ff);
      this.conduitMat.opacity = 0.52 + 0.18 * Math.sin(state.simTime * 18);
    } else {
      this.conduitMat.color.setHex(0x2de3ff);
      this.conduitMat.opacity = 0.12;
    }

    // Soul Clan Faction Enemies
    for (const enemy of state.enemies) {
      const rig = this.ensureEnemyRig(enemy.id, enemy.role === 'soul_engineer');
      rig.group.visible = enemy.state !== 'DEFEATED';
      if (!rig.group.visible) continue;
      const localY = terrainHeightAt(ox + enemy.localX, oz + enemy.localZ, 'jungle') - baseY;
      rig.group.position.set(enemy.localX, localY, enemy.localZ);
      rig.coreMat.emissive.setHex(
        enemy.state === 'STAGGERED'
          ? 0x3de095
          : enemy.state === 'WINDUP' || enemy.state === 'STRIKE'
            ? 0xfb7185
            : enemy.state === 'TRIGGER_TRAP'
              ? 0xf59e0b
              : 0xa855f7,
      );
    }

    // The Soulbound Colossus Boss
    const boss = state.boss;
    this.bossGroup.visible = !boss.defeated;
    if (!boss.defeated) {
      const bossY = terrainHeightAt(ox + boss.localX, oz + boss.localZ, 'jungle') - baseY;
      this.bossGroup.position.set(boss.localX, bossY, boss.localZ);
      this.bossArmorRing.rotation.y = boss.armorAngleRad;
      this.bossShieldMesh.visible = boss.shieldActive;
      const coreHex =
        boss.state === 'OVERHEATED_VULNERABLE' || boss.state === 'STAGGERED'
          ? 0x3de095
          : boss.phase === 3
            ? 0xfb7185
            : boss.phase === 2
              ? 0xf59e0b
              : 0x38bdf8;
      this.bossCoreMat.color.setHex(coreHex);
      this.bossCoreMat.emissive.setHex(coreHex);

      if (boss.activeShockwaveRadius > 0.5) {
        this.bossShockwaveMesh.visible = true;
        this.bossShockwaveMesh.scale.setScalar(boss.activeShockwaveRadius);
      } else {
        this.bossShockwaveMesh.visible = false;
      }
    }
  }

  public dispose(): void {
    this.root.removeFromParent();
    for (const g of this.geometries) g.dispose();
    for (const m of this.materials) m.dispose();
    this.geometries.length = 0;
    this.materials.length = 0;
  }
}
