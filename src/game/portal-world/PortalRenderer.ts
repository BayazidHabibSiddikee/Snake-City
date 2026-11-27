import * as THREE from 'three';
import { terrainHeightAt } from '../../terrain';
import type { BiomeId } from '../../types';
import { PORTAL_REGIONS, PortalRegionId } from '../../ecosystem/memory/RetentionPolicy';
import {
  PORTAL_VISUAL_PROFILES,
  createPortalIdentityTexture,
} from './PortalEffects';
import type {
  SpatialPortalCluster,
  SpatialPortalNode,
} from './PortalClusters';

interface DetailedPortalRig {
  node: SpatialPortalNode;
  signature: string;
  group: THREE.Group;
  ringMesh: THREE.Mesh;
  vortexMesh: THREE.Mesh;
  signMesh: THREE.Mesh;
  signTexture: THREE.CanvasTexture | null;
  signMaterial: THREE.MeshBasicMaterial;
  ringMaterial: THREE.MeshStandardMaterial;
  vortexMaterial: THREE.MeshBasicMaterial;
  shardsGroup: THREE.Group | null;
  crownGroup: THREE.Group | null;
  beaconMesh: THREE.Mesh | null;
  phaseOffset: number;
}

const MAX_CLUSTER_INSTANCES = 180;

// Pre-allocated scratch math objects (zero per-frame GC inside render loop)
const _mat4 = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _color = new THREE.Color();
const _euler = new THREE.Euler();

/**
 * Renders the 3D Portal Memory world inside Three.js:
 * - Detailed multi-part stone & energy archways with crisp CanvasTexture identity signage
 *   for Central Sanctuary gateways and nearby portals.
 * - Distinct state silhouettes: Cyan active vortex, Emerald steady frame, Purple fragmented
 *   orbiting rune shards for Lost Portals, Golden double-framed crown + beacon for Pinned portals.
 * - Single InstancedMesh pass for distant clustered browsing records (scales to 100s of portals).
 */
export class PortalRenderer {
  public readonly rootGroup = new THREE.Group();
  private readonly detailedGroup = new THREE.Group();
  private readonly regionMarkersGroup = new THREE.Group();

  private readonly detailedRigs = new Map<string, DetailedPortalRig>();

  // Shared geometries disposed on destroy()
  private readonly plinthGeo: THREE.CylinderGeometry;
  private readonly pillarGeo: THREE.BoxGeometry;
  private readonly lintelGeo: THREE.BoxGeometry;
  private readonly ringGeo: THREE.TorusGeometry;
  private readonly vortexGeo: THREE.CircleGeometry;
  private readonly signGeo: THREE.PlaneGeometry;
  private readonly shardGeo: THREE.OctahedronGeometry;
  private readonly crownGeo: THREE.OctahedronGeometry;
  private readonly beaconGeo: THREE.CylinderGeometry;

  // Shared base stone materials
  private readonly stoneMat: THREE.MeshStandardMaterial;
  private readonly goldTrimMat: THREE.MeshStandardMaterial;

  // Instanced distant cluster monoliths & beacon spires
  private readonly clusterPillarGeo: THREE.OctahedronGeometry;
  private readonly clusterPillarMat: THREE.MeshStandardMaterial;
  private readonly clusterInstancedMesh: THREE.InstancedMesh;
  private readonly clusterBeaconGeo: THREE.CylinderGeometry;
  private readonly clusterBeaconMat: THREE.MeshBasicMaterial;
  private readonly clusterBeaconInstanced: THREE.InstancedMesh;
  private activeClusterCount = 0;

  private biome: BiomeId = 'jungle';
  private maxAnisotropy = 4;

  constructor(maxAnisotropy = 4) {
    this.maxAnisotropy = maxAnisotropy;
    this.rootGroup.name = 'PortalMemoryWorld';
    this.rootGroup.add(this.detailedGroup);
    this.rootGroup.add(this.regionMarkersGroup);

    // Shared composite portal geometries (realistic monumental proportions: ~6.8m tall)
    this.plinthGeo = new THREE.CylinderGeometry(3.4, 4.1, 0.72, 8);
    this.pillarGeo = new THREE.BoxGeometry(0.82, 5.9, 0.92);
    this.lintelGeo = new THREE.BoxGeometry(5.6, 0.78, 1.15);
    this.ringGeo = new THREE.TorusGeometry(2.12, 0.14, 12, 36);
    this.vortexGeo = new THREE.CircleGeometry(1.98, 28);
    this.signGeo = new THREE.PlaneGeometry(4.4, 2.2);
    this.shardGeo = new THREE.OctahedronGeometry(0.26, 0);
    this.crownGeo = new THREE.OctahedronGeometry(0.55, 0);
    this.beaconGeo = new THREE.CylinderGeometry(0.14, 0.42, 22, 8, 1, true);

    this.stoneMat = new THREE.MeshStandardMaterial({
      color: 0x1b2730,
      roughness: 0.76,
      metalness: 0.24,
    });

    this.goldTrimMat = new THREE.MeshStandardMaterial({
      color: 0xf2c14e,
      emissive: 0x926510,
      emissiveIntensity: 0.55,
      roughness: 0.28,
      metalness: 0.85,
    });

    // Distant spatial cluster InstancedMesh (1 draw call for up to 180 distant portal clusters)
    this.clusterPillarGeo = new THREE.OctahedronGeometry(1.65, 0);
    this.clusterPillarMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.35,
      metalness: 0.45,
      emissive: 0x16242c,
      emissiveIntensity: 0.55,
    });
    this.clusterInstancedMesh = new THREE.InstancedMesh(
      this.clusterPillarGeo,
      this.clusterPillarMat,
      MAX_CLUSTER_INSTANCES,
    );
    this.clusterInstancedMesh.count = 0;
    this.clusterInstancedMesh.frustumCulled = false;
    this.rootGroup.add(this.clusterInstancedMesh);

    this.clusterBeaconGeo = new THREE.CylinderGeometry(0.18, 0.55, 20, 6, 1, true);
    this.clusterBeaconMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.clusterBeaconInstanced = new THREE.InstancedMesh(
      this.clusterBeaconGeo,
      this.clusterBeaconMat,
      MAX_CLUSTER_INSTANCES,
    );
    this.clusterBeaconInstanced.count = 0;
    this.clusterBeaconInstanced.frustumCulled = false;
    this.rootGroup.add(this.clusterBeaconInstanced);

    this.buildRegionWaymarkers();
  }

  public setBiome(biome: BiomeId): void {
    if (this.biome === biome) return;
    this.biome = biome;
    this.rebuildRegionWaymarkers();
    // Re-ground existing detailed portals on new biome heightmap
    this.detailedRigs.forEach((rig) => {
      const groundY = terrainHeightAt(rig.node.x, rig.node.z, this.biome);
      rig.group.position.set(rig.node.x, groundY, rig.node.z);
    });
  }

  private buildRegionWaymarkers(): void {
    const regionIds: PortalRegionId[] = [
      'active_gateway',
      'memory_forest',
      'forgotten_ruins',
      'archive_mountains',
      'portal_halls',
    ];
    for (const regionId of regionIds) {
      const meta = PORTAL_REGIONS[regionId];
      const groundY = terrainHeightAt(meta.centerX, meta.centerZ, this.biome);
      const markerGroup = new THREE.Group();
      markerGroup.name = `RegionMarker_${regionId}`;
      markerGroup.position.set(meta.centerX, groundY, meta.centerZ);

      // Subtle glowing district waypoint ring on the horizon
      const spireMat = new THREE.MeshBasicMaterial({
        color: meta.accentNum,
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const spire = new THREE.Mesh(this.beaconGeo, spireMat);
      spire.position.y = 14;
      spire.scale.set(1.3, 1.5, 1.3);
      markerGroup.add(spire);
      this.regionMarkersGroup.add(markerGroup);
    }
  }

  private rebuildRegionWaymarkers(): void {
    while (this.regionMarkersGroup.children.length > 0) {
      const child = this.regionMarkersGroup.children.pop();
      if (!child) continue;
      child.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.material instanceof THREE.Material) {
          obj.material.dispose();
        }
      });
    }
    this.buildRegionWaymarkers();
  }

  private computeNodeSignature(node: SpatialPortalNode): string {
    return `${node.visualState}|${node.title}|${node.domain}|${node.tabCount}|${node.pinned ? 1 : 0}|${node.loading ? 1 : 0}|${Math.floor(node.lastVisitedAt / 60000)}`;
  }

  /**
   * Synchronizes detailed nearby 3D archways and distant InstancedMesh clusters.
   */
  public syncLayout(
    detailedNodes: readonly SpatialPortalNode[],
    distantClusters: readonly SpatialPortalCluster[],
  ): void {
    const desiredIds = new Set<string>();

    for (const node of detailedNodes) {
      desiredIds.add(node.id);
      const sig = this.computeNodeSignature(node);
      const existing = this.detailedRigs.get(node.id);
      if (existing) {
        if (existing.signature !== sig) {
          this.disposeDetailedRig(existing);
          this.detailedRigs.delete(node.id);
          const rebuilt = this.createDetailedRig(node, sig);
          this.detailedRigs.set(node.id, rebuilt);
          this.detailedGroup.add(rebuilt.group);
        } else {
          existing.node = node;
          const groundY = terrainHeightAt(node.x, node.z, this.biome);
          existing.group.position.set(node.x, groundY, node.z);
          existing.group.rotation.y = node.facingRad;
          existing.group.scale.setScalar(node.scale);
        }
      } else {
        const rig = this.createDetailedRig(node, sig);
        this.detailedRigs.set(node.id, rig);
        this.detailedGroup.add(rig.group);
      }
    }

    // Dispose detailed rigs that moved out of the nearby LOD pool
    this.detailedRigs.forEach((rig, id) => {
      if (!desiredIds.has(id)) {
        this.disposeDetailedRig(rig);
        this.detailedRigs.delete(id);
      }
    });

    // Update distant InstancedMesh cluster beacons in 1 batched pass
    const count = Math.min(MAX_CLUSTER_INSTANCES, distantClusters.length);
    this.activeClusterCount = count;
    this.clusterInstancedMesh.count = count;
    this.clusterBeaconInstanced.count = count;

    for (let i = 0; i < count; i++) {
      const cluster = distantClusters[i];
      const profile = PORTAL_VISUAL_PROFILES[cluster.visualState] ?? PORTAL_VISUAL_PROFILES.saved;
      const groundY = terrainHeightAt(cluster.x, cluster.z, this.biome);
      const clusterScale = 1 + Math.min(1.4, Math.log2(Math.max(1, cluster.count)) * 0.38);

      _pos.set(cluster.x, groundY + 3.2 * clusterScale, cluster.z);
      _euler.set(0, (i * 0.7) % (Math.PI * 2), 0);
      _quat.setFromEuler(_euler);
      _scale.set(clusterScale, clusterScale * 1.45, clusterScale);
      _mat4.compose(_pos, _quat, _scale);
      this.clusterInstancedMesh.setMatrixAt(i, _mat4);
      _color.setHex(profile.primaryNum);
      this.clusterInstancedMesh.setColorAt(i, _color);

      // Vertical horizon beacon
      _pos.set(cluster.x, groundY + 11 * clusterScale, cluster.z);
      _quat.identity();
      _scale.set(clusterScale * 0.9, clusterScale, clusterScale * 0.9);
      _mat4.compose(_pos, _quat, _scale);
      this.clusterBeaconInstanced.setMatrixAt(i, _mat4);
      this.clusterBeaconInstanced.setColorAt(i, _color);
    }

    this.clusterInstancedMesh.instanceMatrix.needsUpdate = true;
    if (this.clusterInstancedMesh.instanceColor) {
      this.clusterInstancedMesh.instanceColor.needsUpdate = true;
    }
    this.clusterBeaconInstanced.instanceMatrix.needsUpdate = true;
    if (this.clusterBeaconInstanced.instanceColor) {
      this.clusterBeaconInstanced.instanceColor.needsUpdate = true;
    }
  }

  private createDetailedRig(node: SpatialPortalNode, signature: string): DetailedPortalRig {
    const profile = PORTAL_VISUAL_PROFILES[node.visualState] ?? PORTAL_VISUAL_PROFILES.saved;
    const group = new THREE.Group();
    const groundY = terrainHeightAt(node.x, node.z, this.biome);
    group.position.set(node.x, groundY, node.z);
    group.rotation.y = node.facingRad;
    group.scale.setScalar(node.scale);

    // 1. Stone Plinth (grounded cleanly with subtle skirt into sloped terrain)
    const plinth = new THREE.Mesh(this.plinthGeo, this.stoneMat);
    plinth.position.y = 0.25;
    plinth.receiveShadow = true;
    group.add(plinth);

    // 2. Twin Pillars + Top Lintel (golden frame for Pinned gateways)
    const frameMat = profile.goldenFrame ? this.goldTrimMat : this.stoneMat;
    const leftPillar = new THREE.Mesh(this.pillarGeo, frameMat);
    leftPillar.position.set(-2.35, 3.15, 0);
    leftPillar.castShadow = true;
    group.add(leftPillar);

    const rightPillar = new THREE.Mesh(this.pillarGeo, frameMat);
    rightPillar.position.set(2.35, 3.15, 0);
    rightPillar.castShadow = true;
    group.add(rightPillar);

    const lintel = new THREE.Mesh(this.lintelGeo, frameMat);
    lintel.position.set(0, 6.25, 0);
    lintel.castShadow = true;
    group.add(lintel);

    // 3. Glowing State Ring
    const ringMaterial = new THREE.MeshStandardMaterial({
      color: profile.primaryNum,
      emissive: profile.primaryNum,
      emissiveIntensity: profile.emissiveIntensity,
      roughness: 0.22,
      metalness: 0.35,
    });
    const ringMesh = new THREE.Mesh(this.ringGeo, ringMaterial);
    ringMesh.position.set(0, 3.35, 0);
    group.add(ringMesh);

    // 4. Translucent Energy Portal Core
    const vortexMaterial = new THREE.MeshBasicMaterial({
      color: profile.secondaryNum,
      transparent: true,
      opacity: node.visualState === 'active' ? 0.36 : node.visualState === 'lost' ? 0.24 : 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const vortexMesh = new THREE.Mesh(this.vortexGeo, vortexMaterial);
    vortexMesh.position.set(0, 3.35, 0);
    group.add(vortexMesh);

    // 5. Crisp CanvasTexture Identity Plaque above lintel (readable from a distance)
    const signTexture = createPortalIdentityTexture(
      {
        title: node.title,
        domain: node.domain,
        faviconGlyph: node.faviconGlyph,
        visualState: node.visualState,
        regionId: node.regionId,
        lastVisitedAt: node.lastVisitedAt,
        tabCount: node.tabCount,
        recoverable: node.recoverable,
        isSanctuaryHub: Boolean(node.sanctuaryAction),
        loading: node.loading,
      },
      this.maxAnisotropy,
    );
    const signMaterial = new THREE.MeshBasicMaterial({
      map: signTexture ?? undefined,
      color: signTexture ? 0xffffff : profile.primaryNum,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const signMesh = new THREE.Mesh(this.signGeo, signMaterial);
    signMesh.position.set(0, 8.15, 0);
    group.add(signMesh);

    // 6. Lost Portal Fragmented Particles (6 orbiting purple shards)
    let shardsGroup: THREE.Group | null = null;
    if (profile.fragmentedParticles) {
      shardsGroup = new THREE.Group();
      shardsGroup.position.set(0, 3.4, 0);
      for (let i = 0; i < 6; i++) {
        const shard = new THREE.Mesh(this.shardGeo, ringMaterial);
        const ang = (i / 6) * Math.PI * 2;
        shard.position.set(Math.cos(ang) * 2.85, Math.sin(ang * 2) * 0.9, Math.sin(ang) * 0.85);
        shardsGroup.add(shard);
      }
      group.add(shardsGroup);
    }

    // 7. Pinned Golden Crown + Persistent Marker Spire
    let crownGroup: THREE.Group | null = null;
    if (profile.goldenFrame) {
      crownGroup = new THREE.Group();
      crownGroup.position.set(0, 9.85, 0);
      const crown = new THREE.Mesh(this.crownGeo, this.goldTrimMat);
      crownGroup.add(crown);
      group.add(crownGroup);
    }

    let beaconMesh: THREE.Mesh | null = null;
    if (profile.persistentBeacon) {
      const beaconMat = new THREE.MeshBasicMaterial({
        color: profile.primaryNum,
        transparent: true,
        opacity: profile.goldenFrame ? 0.2 : 0.14,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      beaconMesh = new THREE.Mesh(this.beaconGeo, beaconMat);
      beaconMesh.position.set(0, 15.5, 0);
      group.add(beaconMesh);
    }

    let phaseHash = 0;
    for (let i = 0; i < node.id.length; i++) phaseHash = (phaseHash * 31 + node.id.charCodeAt(i)) % 628;

    return {
      node,
      signature,
      group,
      ringMesh,
      vortexMesh,
      signMesh,
      signTexture,
      signMaterial,
      ringMaterial,
      vortexMaterial,
      shardsGroup,
      crownGroup,
      beaconMesh,
      phaseOffset: phaseHash / 100,
    };
  }

  /**
   * Smooth per-frame animation (zero GC allocations):
   * - Active portals swirl vigorously in bright cyan
   * - Saved portals glow calmly in emerald green
   * - Lost portals drift fragmented purple shards
   * - Pinned portals slowly rotate their golden marker crown
   * - Identity plaques gently billboard yaw toward the player for readability
   */
  public update(dt: number, elapsedSec: number, playerX: number, playerZ: number): void {
    this.detailedRigs.forEach((rig) => {
      const profile = PORTAL_VISUAL_PROFILES[rig.node.visualState] ?? PORTAL_VISUAL_PROFILES.saved;
      const t = elapsedSec * profile.pulseFreq + rig.phaseOffset;
      const wave = Math.sin(t);

      rig.ringMesh.rotation.z += dt * profile.ringSpinSpeed;
      rig.ringMaterial.emissiveIntensity = profile.emissiveIntensity + wave * profile.pulseAmp;

      if (rig.node.visualState === 'active') {
        const s = 1 + wave * 0.045;
        rig.vortexMesh.scale.set(s, s, 1);
      }

      if (rig.shardsGroup) {
        rig.shardsGroup.rotation.y += dt * 0.85;
        rig.shardsGroup.position.y = 3.4 + Math.sin(elapsedSec * 1.9 + rig.phaseOffset) * 0.35;
      }

      if (rig.crownGroup) {
        rig.crownGroup.rotation.y += dt * 1.1;
        rig.crownGroup.position.y = 9.85 + Math.sin(elapsedSec * 2.0 + rig.phaseOffset) * 0.22;
      }

      // Gently orient identity plaque toward player so website title is readable from any approach angle
      const angleToPlayer = Math.atan2(playerX - rig.node.x, playerZ - rig.node.z);
      rig.signMesh.rotation.y = angleToPlayer - rig.group.rotation.y;
    });

    // Subtle breathing animation for distant cluster crystals
    if (this.activeClusterCount > 0) {
      this.clusterPillarMat.emissiveIntensity = 0.45 + Math.sin(elapsedSec * 1.6) * 0.14;
    }
  }

  private disposeDetailedRig(rig: DetailedPortalRig): void {
    this.detailedGroup.remove(rig.group);
    rig.signTexture?.dispose();
    rig.signMaterial.dispose();
    rig.ringMaterial.dispose();
    rig.vortexMaterial.dispose();
    if (rig.beaconMesh && rig.beaconMesh.material instanceof THREE.Material) {
      rig.beaconMesh.material.dispose();
    }
  }

  public dispose(): void {
    this.detailedRigs.forEach((rig) => this.disposeDetailedRig(rig));
    this.detailedRigs.clear();
    this.rebuildRegionWaymarkers();

    this.plinthGeo.dispose();
    this.pillarGeo.dispose();
    this.lintelGeo.dispose();
    this.ringGeo.dispose();
    this.vortexGeo.dispose();
    this.signGeo.dispose();
    this.shardGeo.dispose();
    this.crownGeo.dispose();
    this.beaconGeo.dispose();
    this.stoneMat.dispose();
    this.goldTrimMat.dispose();
    this.clusterPillarGeo.dispose();
    this.clusterPillarMat.dispose();
    this.clusterBeaconGeo.dispose();
    this.clusterBeaconMat.dispose();
  }
}
