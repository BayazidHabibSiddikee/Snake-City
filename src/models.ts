import * as THREE from 'three';
import { BeastKind, BiomeId } from './types';

export interface ModelResources {
  scaleMap: THREE.Texture;
  contactShadow: THREE.Texture;
  biome: BiomeId;
  castShadows: boolean;
}

function enableShadows(group: THREE.Object3D, cast: boolean, receive = true): void {
  group.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      obj.castShadow = cast;
      obj.receiveShadow = receive;
    }
  });
}

/**
 * Composite 9-part Dragon-Serpent Head (bottom-center grounded at y = 0).
 * Faces +Z in local space so lookAt() or atan2(dx, dz) aligns naturally.
 */
export function createSerpentHead(res: ModelResources): {
  group: THREE.Group;
  tongue: THREE.Group;
  headMat: THREE.MeshStandardMaterial;
  leftHorn: THREE.Mesh;
  rightHorn: THREE.Mesh;
  crown: THREE.Mesh;
} {
  const group = new THREE.Group();

  // Primary glossy scale material (roughness 0.28)
  const headMat = new THREE.MeshStandardMaterial({
    color: 0x1fc47c,
    map: res.scaleMap,
    roughness: 0.28,
    metalness: 0.12,
  });

  // Matte dorsal armor crest (roughness 0.62 -> >= 0.25 contrast)
  const crestMat = new THREE.MeshStandardMaterial({
    color: 0xf4c44e,
    roughness: 0.32,
    metalness: 0.72,
  });

  // Dark horn keratin (roughness 0.68)
  const hornMat = new THREE.MeshStandardMaterial({
    color: 0x1d2b24,
    roughness: 0.68,
    metalness: 0.08,
  });

  // Glowing amber eye + dark slit pupil
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0xffd147,
    emissive: 0xff9d00,
    emissiveIntensity: 0.85,
    roughness: 0.15,
    metalness: 0.05,
  });
  const pupilMat = new THREE.MeshStandardMaterial({
    color: 0x0c0e12,
    roughness: 0.1,
    metalness: 0.1,
  });

  // 1. Primary sculpted cranium (extruded diamond-tapered shield shape)
  const headShape = new THREE.Shape();
  headShape.moveTo(0, 0.56);
  headShape.quadraticCurveTo(0.42, 0.26, 0.36, -0.34);
  headShape.quadraticCurveTo(0, -0.5, -0.36, -0.34);
  headShape.quadraticCurveTo(-0.42, 0.26, 0, 0.56);
  const craniumGeo = new THREE.ExtrudeGeometry(headShape, {
    depth: 0.34,
    bevelEnabled: true,
    bevelThickness: 0.11,
    bevelSize: 0.09,
    bevelSegments: 3,
  });
  craniumGeo.rotateX(Math.PI / 2);
  craniumGeo.center();
  const cranium = new THREE.Mesh(craniumGeo, headMat);
  cranium.position.set(0, 0.36, 0.02);
  group.add(cranium);

  // 2. Armored lower jaw / snout plate
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 0.58), crestMat);
  jaw.position.set(0, 0.16, 0.12);
  group.add(jaw);

  // 3. Forehead golden diamond crest
  const crown = new THREE.Mesh(new THREE.OctahedronGeometry(0.15, 0), crestMat);
  crown.scale.set(0.8, 0.45, 1.5);
  crown.position.set(0, 0.58, -0.02);
  group.add(crown);

  // 4 & 5. Swept-back twin horns
  const hornGeo = new THREE.ConeGeometry(0.075, 0.42, 8);
  const leftHorn = new THREE.Mesh(hornGeo, hornMat);
  leftHorn.position.set(-0.24, 0.56, -0.34);
  leftHorn.rotation.set(-0.95, 0, 0.28);
  group.add(leftHorn);

  const rightHorn = new THREE.Mesh(hornGeo, hornMat);
  rightHorn.position.set(0.24, 0.56, -0.34);
  rightHorn.rotation.set(-0.95, 0, -0.28);
  group.add(rightHorn);

  // 6 & 7. Brow ridges & glowing eyes
  const eyeGeo = new THREE.SphereGeometry(0.095, 12, 10);
  const pupilGeo = new THREE.BoxGeometry(0.035, 0.11, 0.06);
  const browGeo = new THREE.BoxGeometry(0.14, 0.06, 0.22);

  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(side * 0.28, 0.44, 0.22);
    group.add(eye);

    const pupil = new THREE.Mesh(pupilGeo, pupilMat);
    pupil.position.set(side * 0.33, 0.44, 0.27);
    group.add(pupil);

    const brow = new THREE.Mesh(browGeo, hornMat);
    brow.position.set(side * 0.27, 0.52, 0.2);
    brow.rotation.z = side * -0.25;
    group.add(brow);
  }

  // 8. Animated forked tongue
  const tongue = new THREE.Group();
  const tongueMat = new THREE.MeshStandardMaterial({
    color: 0xff3b5c,
    emissive: 0x770c1e,
    emissiveIntensity: 0.4,
    roughness: 0.35,
  });
  const stem = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.025, 0.34), tongueMat);
  stem.position.set(0, 0, 0.17);
  tongue.add(stem);

  const forkL = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.022, 0.16), tongueMat);
  forkL.position.set(-0.045, 0, 0.37);
  forkL.rotation.y = -0.38;
  tongue.add(forkL);

  const forkR = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.022, 0.16), tongueMat);
  forkR.position.set(0.045, 0, 0.37);
  forkR.rotation.y = 0.38;
  tongue.add(forkR);

  tongue.position.set(0, 0.24, 0.48);
  group.add(tongue);

  // 9. Subtle ambient occlusion grounding disc (complements real CSM shadows)
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, 1.25),
    new THREE.MeshBasicMaterial({
      map: res.contactShadow,
      transparent: true,
      depthWrite: false,
      opacity: 0.22,
    }),
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.015;
  group.add(shadowPlane);

  enableShadows(group, res.castShadows);
  shadowPlane.castShadow = false;
  shadowPlane.receiveShadow = false;

  return { group, tongue, headMat, leftHorn, rightHorn, crown };
}

/**
 * Composite 3-part Serpent Body Segment (reusable factory).
 */
export function createSerpentSegment(
  bodyGeo: THREE.BufferGeometry,
  crestGeo: THREE.BufferGeometry,
  bellyGeo: THREE.BufferGeometry,
  bodyMat: THREE.MeshStandardMaterial,
  crestMat: THREE.MeshStandardMaterial,
  bellyMat: THREE.MeshStandardMaterial,
  castShadows: boolean,
): THREE.Group {
  const g = new THREE.Group();

  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.32;
  body.scale.set(1.0, 0.86, 1.12);
  body.castShadow = castShadows;
  body.receiveShadow = true;
  g.add(body);

  const crest = new THREE.Mesh(crestGeo, crestMat);
  crest.position.set(0, 0.62, 0);
  crest.castShadow = castShadows;
  crest.receiveShadow = true;
  g.add(crest);

  const belly = new THREE.Mesh(bellyGeo, bellyMat);
  belly.position.set(0, 0.11, 0);
  belly.castShadow = castShadows;
  belly.receiveShadow = true;
  g.add(belly);

  return g;
}

/**
 * Composite 5-part Cliff Boulder / Formation Wall Block.
 */
export function createWallBlock(res: ModelResources): THREE.Group {
  const group = new THREE.Group();
  const isJungle = res.biome === 'jungle';

  const rockMat = new THREE.MeshStandardMaterial({
    color: isJungle ? 0x5c685e : 0x627385,
    roughness: 0.88,
    metalness: 0.04,
    flatShading: true,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: isJungle ? 0x3b493e : 0x3d4b59,
    roughness: 0.72,
    metalness: 0.12,
  });
  const capMat = new THREE.MeshStandardMaterial({
    color: isJungle ? 0x3f8f45 : 0xeaf4ff,
    roughness: isJungle ? 0.85 : 0.42,
    metalness: 0.02,
    flatShading: true,
  });

  // 1. Grounded stone plinth base
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.18, 0.92), trimMat);
  plinth.position.y = 0.09;
  group.add(plinth);

  // 2. Main towering faceted rock crag
  const mainRock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5, 0), rockMat);
  mainRock.position.set(0, 0.78, 0);
  mainRock.scale.set(0.96, 1.62, 0.96);
  mainRock.rotation.set(0.2, 0.45, 0.12);
  group.add(mainRock);

  // 3. Secondary flanking boulder shard
  const shard = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 0), rockMat);
  shard.position.set(0.26, 0.42, 0.22);
  shard.scale.set(0.95, 1.05, 0.9);
  shard.rotation.set(0.6, 1.1, 0.3);
  group.add(shard);

  // 4. Moss or Snow cap crown
  const cap = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35, 0), capMat);
  cap.position.set(-0.02, 1.38, -0.02);
  cap.scale.set(1.06, 0.46, 1.04);
  group.add(cap);

  // 5. Ground contact shadow
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 1.1),
    new THREE.MeshBasicMaterial({
      map: res.contactShadow,
      transparent: true,
      depthWrite: false,
      opacity: 0.48,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.012;
  group.add(shadow);

  enableShadows(group, res.castShadows);
  shadow.castShadow = false;
  return group;
}

/**
 * Composite 6-part Ancient Gold-Inlaid Totem Obelisk.
 */
export function createTotemBlock(res: ModelResources): THREE.Group {
  const group = new THREE.Group();
  const isJungle = res.biome === 'jungle';

  const stoneMat = new THREE.MeshStandardMaterial({
    color: isJungle ? 0x4b564c : 0x4e5d6e,
    roughness: 0.82,
    metalness: 0.08,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: isJungle ? 0xeab646 : 0x8cd3f5,
    roughness: 0.24,
    metalness: 0.88,
  });
  const runeMat = new THREE.MeshStandardMaterial({
    color: isJungle ? 0x56f59f : 0x70dfff,
    emissive: isJungle ? 0x1dc76e : 0x2299ee,
    emissiveIntensity: 1.15,
    roughness: 0.2,
    metalness: 0.1,
  });

  // 1. Stepped base pedestal
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.22, 0.84), stoneMat);
  base.position.y = 0.11;
  group.add(base);

  // 2. Towering fluted obelisk shaft
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.38, 2.25, 6), stoneMat);
  shaft.position.y = 1.34;
  group.add(shaft);

  // 3. Lower metallic inlay collar
  const collarLow = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.39, 0.12, 6), goldMat);
  collarLow.position.y = 0.65;
  group.add(collarLow);

  // 4. Upper metallic inlay collar
  const collarHigh = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.12, 6), goldMat);
  collarHigh.position.y = 2.08;
  group.add(collarHigh);

  // 5. Glowing crystal core floating in notch
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), runeMat);
  core.position.y = 2.75;
  core.name = 'totemCore';
  group.add(core);

  // 6. Metallic crown ring framing the crystal
  const crown = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.04, 8, 18), goldMat);
  crown.position.y = 2.75;
  crown.rotation.x = Math.PI / 2;
  crown.name = 'totemRing';
  group.add(crown);

  enableShadows(group, res.castShadows);
  return group;
}

/**
 * Composite 6-part Twin Warp Portal Archway.
 */
export function createPortalBlock(res: ModelResources, variant: 'A' | 'B'): THREE.Group {
  const group = new THREE.Group();
  const accentHex = variant === 'A' ? 0x2de3ff : 0xff6be0;
  const emissiveHex = variant === 'A' ? 0x0ea5e9 : 0xd946ef;

  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x3e4756,
    roughness: 0.78,
    metalness: 0.15,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0xd8c79e,
    roughness: 0.25,
    metalness: 0.85,
  });
  const ringMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    emissive: emissiveHex,
    emissiveIntensity: 1.4,
    roughness: 0.18,
    metalness: 0.2,
  });

  // 1. Octagonal portal dais (flush on tile, snake passes right through!)
  const dais = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.49, 0.1, 8), stoneMat);
  dais.position.y = 0.05;
  group.add(dais);

  // 2. Metallic outer inlay ring
  const baseRing = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.035, 8, 24), metalMat);
  baseRing.rotation.x = Math.PI / 2;
  baseRing.position.y = 0.11;
  group.add(baseRing);

  // 3. Glowing horizontal vortex pad
  const pad = new THREE.Mesh(new THREE.CircleGeometry(0.36, 20), ringMat);
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = 0.115;
  group.add(pad);

  // 4. Vertical spinning energy halo
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.045, 10, 24), ringMat);
  halo.position.y = 0.62;
  halo.name = 'portalHalo';
  group.add(halo);

  // 5 & 6. Twin floating rune crystal shards flanking the vortex
  const shardGeo = new THREE.OctahedronGeometry(0.085, 0);
  const s1 = new THREE.Mesh(shardGeo, metalMat);
  s1.position.set(-0.42, 0.56, 0);
  s1.name = 'portalShard1';
  group.add(s1);

  const s2 = new THREE.Mesh(shardGeo, metalMat);
  s2.position.set(0.42, 0.56, 0);
  s2.name = 'portalShard2';
  group.add(s2);

  enableShadows(group, res.castShadows);
  pad.castShadow = false;
  return group;
}

/**
 * Composite 4-part Jade/Gold Boost Rune Pad.
 */
export function createBoostBlock(res: ModelResources): THREE.Group {
  const group = new THREE.Group();

  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x3b4248,
    roughness: 0.72,
    metalness: 0.3,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xe6b94c,
    roughness: 0.26,
    metalness: 0.85,
  });
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0xffe45e,
    emissive: 0xffa800,
    emissiveIntensity: 1.15,
    roughness: 0.2,
  });

  // 1. Recessed bronze frame
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.07, 0.88), frameMat);
  base.position.y = 0.035;
  group.add(base);

  // 2. Inner metallic plate
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.38, 0.085, 8), brassMat);
  plate.position.y = 0.045;
  group.add(plate);

  // 3. Glowing star rune center
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), glowMat);
  star.scale.set(1.2, 0.35, 1.2);
  star.position.y = 0.11;
  star.name = 'boostCore';
  group.add(star);

  // 4. Floating energy ring
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 8, 20), glowMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.15;
  ring.name = 'boostRing';
  group.add(ring);

  enableShadows(group, false, true);
  return group;
}

/**
 * Composite 5-part Collectible Fruit (Jungle Golden Mango / Alpine Crystal Berry).
 */
export function createFruitModel(res: ModelResources, golden: boolean): THREE.Group {
  const group = new THREE.Group();

  const orbColor = golden ? 0xffcf33 : res.biome === 'jungle' ? 0xff5a36 : 0x38d9ff;
  const orbEmissive = golden ? 0xd97706 : res.biome === 'jungle' ? 0xb91c1c : 0x0284c7;

  const orbMat = new THREE.MeshPhysicalMaterial({
    color: orbColor,
    emissive: orbEmissive,
    emissiveIntensity: golden ? 0.75 : 0.45,
    roughness: 0.16,
    metalness: golden ? 0.55 : 0.1,
    clearcoat: 1.0,
    clearcoatRoughness: 0.12,
  });

  const leafMat = new THREE.MeshStandardMaterial({
    color: golden ? 0xfff099 : 0x2ec468,
    roughness: 0.55,
    metalness: golden ? 0.75 : 0.05,
  });

  const haloMat = new THREE.MeshStandardMaterial({
    color: golden ? 0xffe066 : 0xffd166,
    emissive: golden ? 0xf59e0b : 0xea580c,
    emissiveIntensity: 0.85,
    roughness: 0.25,
    metalness: 0.8,
  });

  // 1. Main fruit core
  const core = new THREE.Mesh(
    golden ? new THREE.OctahedronGeometry(0.33, 1) : new THREE.SphereGeometry(0.3, 18, 14),
    orbMat,
  );
  core.position.y = 0.46;
  core.name = 'fruitCore';
  group.add(core);

  // 2 & 3. Twin crown leaves / crystal fins
  const leafGeo = new THREE.ConeGeometry(0.1, 0.24, 5);
  const leaf1 = new THREE.Mesh(leafGeo, leafMat);
  leaf1.position.set(-0.07, 0.78, 0);
  leaf1.rotation.z = 0.42;
  group.add(leaf1);

  const leaf2 = new THREE.Mesh(leafGeo, leafMat);
  leaf2.position.set(0.08, 0.76, 0.05);
  leaf2.rotation.z = -0.5;
  leaf2.rotation.x = 0.25;
  group.add(leaf2);

  // 4. Orbiting golden energy halo
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.03, 8, 24), haloMat);
  halo.position.y = 0.56;
  halo.rotation.x = Math.PI / 2.6;
  halo.name = 'fruitHalo';
  group.add(halo);

  // 5. Skyward navigation beacon (subtle beam visible across mountain valleys in Ant View)
  const beamHeight = golden ? 16 : 6.5;
  const beamMat = new THREE.MeshBasicMaterial({
    color: golden ? 0xffe066 : res.biome === 'jungle' ? 0xff7b54 : 0x58e1ff,
    transparent: true,
    opacity: golden ? 0.24 : 0.12,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(golden ? 0.08 : 0.04, golden ? 0.28 : 0.16, beamHeight, 8, 1, true),
    beamMat,
  );
  beam.position.y = beamHeight * 0.5 + 0.35;
  beam.name = 'fruitBeam';
  group.add(beam);

  // 6. Soft contact shadow grounded at y = 0.015
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.95, 0.95),
    new THREE.MeshBasicMaterial({
      map: res.contactShadow,
      transparent: true,
      depthWrite: false,
      opacity: 0.42,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.015;
  group.add(shadow);

  enableShadows(group, res.castShadows);
  shadow.castShadow = false;
  beam.castShadow = false;
  beam.receiveShadow = false;
  return group;
}

/**
 * Composite 4-part Dynamic Rolling Mountain Boulder hazard.
 */
export function createRollingBoulder(res: ModelResources): THREE.Group {
  const group = new THREE.Group();
  const isJungle = res.biome === 'jungle';

  const coreMat = new THREE.MeshStandardMaterial({
    color: isJungle ? 0x595e52 : 0x677582,
    roughness: 0.88,
    metalness: 0.06,
    flatShading: true,
  });
  const veinMat = new THREE.MeshStandardMaterial({
    color: 0xff6b3d,
    emissive: 0xc23510,
    emissiveIntensity: 0.65,
    roughness: 0.35,
    metalness: 0.2,
  });

  const body = new THREE.Mesh(new THREE.DodecahedronGeometry(1.0, 1), coreMat);
  body.scale.set(1.0, 0.92, 1.05);
  group.add(body);

  const ridge1 = new THREE.Mesh(new THREE.OctahedronGeometry(0.68, 0), coreMat);
  ridge1.position.set(0.35, 0.22, -0.2);
  ridge1.rotation.set(0.4, 0.8, 0.2);
  group.add(ridge1);

  const ridge2 = new THREE.Mesh(new THREE.OctahedronGeometry(0.62, 0), coreMat);
  ridge2.position.set(-0.32, -0.18, 0.28);
  ridge2.rotation.set(1.1, 0.2, 0.6);
  group.add(ridge2);

  // Subtle glowing lava/warning mineral vein so rolling boulders read unmistakably as hazards
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.96, 0.065, 6, 14), veinMat);
  band.rotation.x = Math.PI / 3;
  group.add(band);

  enableShadows(group, res.castShadows);
  return group;
}

/**
 * Composite 6-part Summit Landmark Shrine & Beacon marking visitable mountain peaks.
 */
export function createLandmarkShrine(
  res: ModelResources,
  accentHex: number,
): { group: THREE.Group; crystal: THREE.Mesh; ring: THREE.Mesh; beam: THREE.Mesh } {
  const group = new THREE.Group();

  const stoneMat = new THREE.MeshStandardMaterial({
    color: res.biome === 'jungle' ? 0x4b5c4d : 0x5a6b7c,
    roughness: 0.82,
    metalness: 0.1,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xf2c95c,
    roughness: 0.24,
    metalness: 0.86,
  });
  const glowMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: 1.25,
    roughness: 0.18,
    metalness: 0.2,
  });

  // 1. Wide stone summit dais
  const dais = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.7, 0.55, 8), stoneMat);
  dais.position.y = 0.25;
  group.add(dais);

  // 2. Twin gateway arch pillars
  const pillarGeo = new THREE.CylinderGeometry(0.28, 0.42, 4.4, 6);
  for (const side of [-1, 1]) {
    const pillar = new THREE.Mesh(pillarGeo, stoneMat);
    pillar.position.set(side * 1.55, 2.4, 0);
    group.add(pillar);

    const cap = new THREE.Mesh(new THREE.OctahedronGeometry(0.36, 0), goldMat);
    cap.position.set(side * 1.55, 4.8, 0);
    group.add(cap);
  }

  // 3. Summit archway crown lintel
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.42, 0.72), stoneMat);
  lintel.position.set(0, 4.45, 0);
  group.add(lintel);

  // 4. Floating summit crystal
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.68, 0), glowMat);
  crystal.position.set(0, 5.85, 0);
  group.add(crystal);

  // 5. Spinning golden ring around summit crystal
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.08, 8, 24), goldMat);
  ring.position.set(0, 5.85, 0);
  ring.rotation.x = Math.PI / 2.4;
  group.add(ring);

  // 6. Towering summit sky-beacon visible from across the entire mountain range
  const beamMat = new THREE.MeshBasicMaterial({
    color: accentHex,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.9, 34, 10, 1, true), beamMat);
  beam.position.set(0, 18.5, 0);
  group.add(beam);

  enableShadows(group, res.castShadows);
  beam.castShadow = false;
  beam.receiveShadow = false;

  return { group, crystal, ring, beam };
}

export interface AscensionAvatarRig {
  group: THREE.Group;
  upperBody: THREE.Group;
  humanHeadGroup: THREE.Group;
  legsGroup: THREE.Group;
  leftArmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  leftLegPivot: THREE.Group;
  rightLegPivot: THREE.Group;
  leftWingPivot: THREE.Group;
  rightWingPivot: THREE.Group;
  cloak: THREE.Mesh;
  auraRing: THREE.Mesh;
  skinMat: THREE.MeshStandardMaterial;
  tunicMat: THREE.MeshStandardMaterial;
  goldMat: THREE.MeshStandardMaterial;
  wingMat: THREE.MeshStandardMaterial;
  auraMat: THREE.MeshStandardMaterial;
}

/**
 * Composite 14-part articulated Evolution & Ascended Human Avatar (bottom-center grounded at y = 0, facing +Z).
 * Morphs progressively from clawed forelimbs & drake wings -> upright Naga sage -> full bipedal Ascended Human.
 */
export function createAscensionAvatar(res: ModelResources): AscensionAvatarRig {
  const group = new THREE.Group();

  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xe6b992,
    roughness: 0.62,
    metalness: 0.02,
  });
  const tunicMat = new THREE.MeshStandardMaterial({
    color: 0x1d4d44,
    roughness: 0.78,
    metalness: 0.06,
  });
  const trouserMat = new THREE.MeshStandardMaterial({
    color: 0x26313b,
    roughness: 0.84,
    metalness: 0.04,
  });
  const bootMat = new THREE.MeshStandardMaterial({
    color: 0x4b3423,
    roughness: 0.72,
    metalness: 0.08,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: 0x1c1b22,
    roughness: 0.76,
    metalness: 0.08,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xf2c552,
    roughness: 0.22,
    metalness: 0.88,
  });
  const cloakMat = new THREE.MeshStandardMaterial({
    color: 0xb93832,
    roughness: 0.82,
    metalness: 0.04,
    side: THREE.DoubleSide,
  });
  const wingMat = new THREE.MeshStandardMaterial({
    color: 0x4be3a8,
    emissive: 0x159a6e,
    emissiveIntensity: 0.55,
    roughness: 0.28,
    metalness: 0.35,
    transparent: true,
    opacity: 0.86,
    side: THREE.DoubleSide,
  });
  const auraMat = new THREE.MeshStandardMaterial({
    color: 0xffe47a,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.25,
    roughness: 0.2,
    metalness: 0.75,
    transparent: true,
    opacity: 0.85,
  });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0x162436,
    roughness: 0.15,
    metalness: 0.1,
  });

  // --- LOWER BODY (Bipedal Legs, y = 0..0.95) ---
  const legsGroup = new THREE.Group();
  const thighGeo = new THREE.CylinderGeometry(0.11, 0.095, 0.48, 10);
  const shinGeo = new THREE.CylinderGeometry(0.09, 0.075, 0.44, 10);
  const bootGeo = new THREE.BoxGeometry(0.16, 0.14, 0.28);

  const buildLeg = (side: -1 | 1): THREE.Group => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.16, 0.94, 0);

    const thigh = new THREE.Mesh(thighGeo, trouserMat);
    thigh.position.y = -0.24;
    hip.add(thigh);

    const shin = new THREE.Mesh(shinGeo, trouserMat);
    shin.position.y = -0.66;
    hip.add(shin);

    const boot = new THREE.Mesh(bootGeo, bootMat);
    boot.position.set(0, -0.87, 0.05);
    hip.add(boot);

    return hip;
  };

  const leftLegPivot = buildLeg(-1);
  const rightLegPivot = buildLeg(1);
  legsGroup.add(leftLegPivot, rightLegPivot);
  group.add(legsGroup);

  // --- UPPER BODY (Torso, Pauldrons, Cloak, Arms, Wings, Human Head) ---
  const upperBody = new THREE.Group();
  upperBody.position.set(0, 0.94, 0);
  group.add(upperBody);

  // 1. Sculpted mountaineer tunic torso
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.2, 0.72, 10), tunicMat);
  torso.scale.set(1.12, 1.0, 0.78);
  torso.position.y = 0.36;
  upperBody.add(torso);

  // 2. Waist sash & brushed-gold belt buckle
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.215, 0.225, 0.12, 10), bootMat);
  belt.scale.set(1.14, 1.0, 0.82);
  belt.position.y = 0.06;
  upperBody.add(belt);

  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.11, 0.06), goldMat);
  buckle.position.set(0, 0.06, 0.18);
  upperBody.add(buckle);

  // 3. Metallic sun-crest breastplate & shoulder mantle
  const chestPlate = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), goldMat);
  chestPlate.scale.set(1.25, 1.1, 0.45);
  chestPlate.position.set(0, 0.48, 0.19);
  upperBody.add(chestPlate);

  const mantle = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.35, 0.14, 10), goldMat);
  mantle.scale.set(1.16, 1.0, 0.84);
  mantle.position.y = 0.68;
  upperBody.add(mantle);

  // 4. Flowing mountain expedition cloak anchored at shoulders
  const cloakShape = new THREE.Shape();
  cloakShape.moveTo(-0.24, 0);
  cloakShape.lineTo(0.24, 0);
  cloakShape.lineTo(0.38, -0.96);
  cloakShape.quadraticCurveTo(0, -1.08, -0.38, -0.96);
  cloakShape.closePath();
  const cloakGeo = new THREE.ExtrudeGeometry(cloakShape, {
    depth: 0.03,
    bevelEnabled: false,
  });
  const cloak = new THREE.Mesh(cloakGeo, cloakMat);
  cloak.position.set(0, 0.7, -0.2);
  cloak.rotation.x = 0.16;
  upperBody.add(cloak);

  // 5 & 6. Articulated Arms with shoulder pauldrons & golden bracers
  const upperArmGeo = new THREE.CylinderGeometry(0.082, 0.072, 0.36, 8);
  const forearmGeo = new THREE.CylinderGeometry(0.068, 0.056, 0.34, 8);
  const bracerGeo = new THREE.CylinderGeometry(0.072, 0.066, 0.12, 8);
  const handGeo = new THREE.SphereGeometry(0.068, 8, 8);
  const pauldronGeo = new THREE.SphereGeometry(0.135, 10, 8);

  const buildArm = (side: -1 | 1): THREE.Group => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.36, 0.66, 0);

    const pauldron = new THREE.Mesh(pauldronGeo, goldMat);
    pauldron.scale.set(1.15, 0.75, 1.05);
    shoulder.add(pauldron);

    const upperArm = new THREE.Mesh(upperArmGeo, tunicMat);
    upperArm.position.y = -0.18;
    shoulder.add(upperArm);

    const forearm = new THREE.Mesh(forearmGeo, skinMat);
    forearm.position.set(0, -0.48, 0.05);
    forearm.rotation.x = -0.22;
    shoulder.add(forearm);

    const bracer = new THREE.Mesh(bracerGeo, goldMat);
    bracer.position.set(0, -0.52, 0.06);
    bracer.rotation.x = -0.22;
    shoulder.add(bracer);

    const hand = new THREE.Mesh(handGeo, skinMat);
    hand.position.set(0, -0.66, 0.09);
    shoulder.add(hand);

    return shoulder;
  };

  const leftArmPivot = buildArm(-1);
  const rightArmPivot = buildArm(1);
  upperBody.add(leftArmPivot, rightArmPivot);

  // 7 & 8. Composite Drake Wings (active during Levels 6-9)
  const buildWing = (side: -1 | 1): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.2, 0.56, -0.18);

    const spar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 1.25, 6), goldMat);
    spar.rotation.z = side * -1.18;
    spar.position.set(side * 0.55, 0.22, -0.12);
    pivot.add(spar);

    const bladeGeo = new THREE.BoxGeometry(0.95, 0.028, 0.34);
    for (let f = 0; f < 3; f++) {
      const feather = new THREE.Mesh(bladeGeo, wingMat);
      feather.scale.set(1 - f * 0.18, 1, 1 - f * 0.14);
      feather.position.set(side * (0.48 + (2 - f) * 0.14), 0.16 - f * 0.18, -0.22 - f * 0.06);
      feather.rotation.set(0.24, side * -0.22, side * (0.28 - f * 0.18));
      pivot.add(feather);
    }

    return pivot;
  };

  const leftWingPivot = buildWing(-1);
  const rightWingPivot = buildWing(1);
  upperBody.add(leftWingPivot, rightWingPivot);

  // 9. Sculpted Human Head, Hair Crown, Eyes & Golden Ascension Circlet
  const humanHeadGroup = new THREE.Group();
  humanHeadGroup.position.set(0, 0.78, 0.02);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.1, 0.16, 10), skinMat);
  neck.position.y = 0.04;
  humanHeadGroup.add(neck);

  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.21, 16, 14), skinMat);
  skull.scale.set(0.92, 1.08, 0.98);
  skull.position.y = 0.24;
  humanHeadGroup.add(skull);

  const hairCrown = new THREE.Mesh(new THREE.SphereGeometry(0.225, 14, 12), hairMat);
  hairCrown.scale.set(0.98, 1.02, 1.05);
  hairCrown.position.set(0, 0.3, -0.04);
  humanHeadGroup.add(hairCrown);

  const hairTail = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.42, 8), hairMat);
  hairTail.position.set(0, 0.15, -0.22);
  hairTail.rotation.x = 0.38;
  humanHeadGroup.add(hairTail);

  const circlet = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.022, 8, 22), goldMat);
  circlet.rotation.x = Math.PI / 2 - 0.14;
  circlet.position.set(0, 0.34, 0.01);
  humanHeadGroup.add(circlet);

  const circletGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.042, 0), auraMat);
  circletGem.position.set(0, 0.35, 0.21);
  humanHeadGroup.add(circletGem);

  const eyeGeo = new THREE.SphereGeometry(0.028, 8, 8);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(side * 0.072, 0.25, 0.185);
    humanHeadGroup.add(eye);
  }

  upperBody.add(humanHeadGroup);

  // 10. Floating Radiant Golden Ascension Halo
  const auraRing = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.032, 8, 28), auraMat);
  auraRing.position.set(0, 0.78, -0.24);
  upperBody.add(auraRing);

  enableShadows(group, res.castShadows);
  auraRing.castShadow = false;
  leftWingPivot.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.castShadow = false;
  });
  rightWingPivot.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.castShadow = false;
  });

  return {
    group,
    upperBody,
    humanHeadGroup,
    legsGroup,
    leftArmPivot,
    rightArmPivot,
    leftLegPivot,
    rightLegPivot,
    leftWingPivot,
    rightWingPivot,
    cloak,
    auraRing,
    skinMat,
    tunicMat,
    goldMat,
    wingMat,
    auraMat,
  };
}

export interface BeastRig {
  kind: BeastKind;
  group: THREE.Group;
  bodyGroup: THREE.Group;
  limbs: THREE.Object3D[];
  wings: THREE.Object3D[];
  accentObj: THREE.Object3D | null;
  primaryMat: THREE.MeshStandardMaterial;
  glowMat: THREE.MeshStandardMaterial;
  hpBarGroup: THREE.Group;
  hpFillMesh: THREE.Mesh;
}

/**
 * Creates a sculpted, articulated composite 3D mountain animal or magical beast (bottom-center grounded at y = 0, facing +Z).
 */
export function createBeastModel(res: ModelResources, kind: BeastKind): BeastRig {
  const group = new THREE.Group();
  const bodyGroup = new THREE.Group();
  group.add(bodyGroup);

  const limbs: THREE.Object3D[] = [];
  const wings: THREE.Object3D[] = [];
  let accentObj: THREE.Object3D | null = null;

  let primaryMat: THREE.MeshStandardMaterial;
  let glowMat: THREE.MeshStandardMaterial;
  let hpBarY = 2.05;
  let shadowSize = 1.8;

  if (kind === 'wolf') {
    // 1. Dire Ridge Wolf — agile alpine predator with slate fur, silver ruff, amber eyes & 4 galloping legs
    primaryMat = new THREE.MeshStandardMaterial({
      color: res.biome === 'jungle' ? 0x3b4240 : 0x4b5563,
      roughness: 0.82,
      metalness: 0.06,
    });
    const ruffMat = new THREE.MeshStandardMaterial({
      color: 0xb8c5d0,
      roughness: 0.88,
      metalness: 0.04,
    });
    glowMat = new THREE.MeshStandardMaterial({
      color: 0xffb347,
      emissive: 0xff7b1c,
      emissiveIntensity: 1.35,
      roughness: 0.2,
      metalness: 0.25,
    });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.56, 1.38), primaryMat);
    torso.position.set(0, 0.88, -0.04);
    bodyGroup.add(torso);

    const chestRuff = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 0), ruffMat);
    chestRuff.scale.set(1.05, 0.92, 1.05);
    chestRuff.position.set(0, 0.94, 0.52);
    bodyGroup.add(chestRuff);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.38, 0.52), primaryMat);
    head.position.set(0, 1.12, 0.86);
    bodyGroup.add(head);

    const snout = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.44, 5), primaryMat);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, 1.05, 1.24);
    bodyGroup.add(snout);

    const earGeo = new THREE.ConeGeometry(0.09, 0.28, 4);
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(earGeo, primaryMat);
      ear.position.set(side * 0.16, 1.4, 0.78);
      ear.rotation.z = side * -0.18;
      bodyGroup.add(ear);

      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), glowMat);
      eye.position.set(side * 0.15, 1.18, 1.08);
      bodyGroup.add(eye);
    }

    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.75, 6), ruffMat);
    tail.position.set(0, 0.92, -0.92);
    tail.rotation.x = -1.1;
    bodyGroup.add(tail);
    accentObj = tail;

    const legGeo = new THREE.CylinderGeometry(0.09, 0.065, 0.76, 7);
    const legOffsets: Array<[number, number]> = [
      [-0.24, 0.48],
      [0.24, 0.48],
      [-0.24, -0.5],
      [0.24, -0.5],
    ];
    for (const [lx, lz] of legOffsets) {
      const pivot = new THREE.Group();
      pivot.position.set(lx, 0.72, lz);
      const legMesh = new THREE.Mesh(legGeo, primaryMat);
      legMesh.position.y = -0.36;
      pivot.add(legMesh);
      bodyGroup.add(pivot);
      limbs.push(pivot);
    }
    hpBarY = 1.95;
    shadowSize = 1.9;
  } else if (kind === 'boar') {
    // 2. Ironhorn Mountain Boar — heavy armored tusker with glowing ember ridge & curved tusks
    primaryMat = new THREE.MeshStandardMaterial({
      color: 0x523c32,
      roughness: 0.85,
      metalness: 0.14,
    });
    const armorMat = new THREE.MeshStandardMaterial({
      color: 0x3b444e,
      roughness: 0.45,
      metalness: 0.65,
    });
    const tuskMat = new THREE.MeshStandardMaterial({
      color: 0xf4ecd8,
      roughness: 0.32,
      metalness: 0.12,
    });
    glowMat = new THREE.MeshStandardMaterial({
      color: 0xff6b35,
      emissive: 0xe64012,
      emissiveIntensity: 1.4,
      roughness: 0.25,
      metalness: 0.3,
    });

    const torso = new THREE.Mesh(new THREE.DodecahedronGeometry(0.76, 1), primaryMat);
    torso.scale.set(0.95, 0.88, 1.32);
    torso.position.set(0, 0.92, -0.05);
    bodyGroup.add(torso);

    const shoulderPlate = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.54, 0.74), armorMat);
    shoulderPlate.position.set(0, 1.15, 0.38);
    shoulderPlate.rotation.x = 0.2;
    bodyGroup.add(shoulderPlate);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.56, 0.64), primaryMat);
    head.position.set(0, 0.88, 0.92);
    head.rotation.x = 0.18;
    bodyGroup.add(head);

    const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.32, 8), armorMat);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, 0.78, 1.32);
    bodyGroup.add(snout);

    const tuskGeo = new THREE.ConeGeometry(0.08, 0.55, 6);
    for (const side of [-1, 1]) {
      const tusk = new THREE.Mesh(tuskGeo, tuskMat);
      tusk.position.set(side * 0.32, 0.86, 1.32);
      tusk.rotation.set(0.55, 0, side * -0.45);
      bodyGroup.add(tusk);

      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.068, 8, 8), glowMat);
      eye.position.set(side * 0.28, 1.02, 1.14);
      bodyGroup.add(eye);
    }

    // Molten dorsal spines
    const crestGroup = new THREE.Group();
    const spineGeo = new THREE.OctahedronGeometry(0.15, 0);
    for (let s = 0; s < 4; s++) {
      const spine = new THREE.Mesh(spineGeo, glowMat);
      spine.scale.set(0.6, 1.45, 1.1);
      spine.position.set(0, 1.48 - s * 0.06, 0.45 - s * 0.34);
      crestGroup.add(spine);
    }
    bodyGroup.add(crestGroup);
    accentObj = crestGroup;

    const legGeo = new THREE.CylinderGeometry(0.14, 0.11, 0.64, 7);
    const legOffsets: Array<[number, number]> = [
      [-0.38, 0.45],
      [0.38, 0.45],
      [-0.36, -0.52],
      [0.36, -0.52],
    ];
    for (const [lx, lz] of legOffsets) {
      const pivot = new THREE.Group();
      pivot.position.set(lx, 0.58, lz);
      const legMesh = new THREE.Mesh(legGeo, primaryMat);
      legMesh.position.y = -0.28;
      pivot.add(legMesh);
      bodyGroup.add(pivot);
      limbs.push(pivot);
    }
    hpBarY = 2.2;
    shadowSize = 2.35;
  } else if (kind === 'eagle') {
    // 3. Storm Talon Griffin / Arcane Hawk — soaring lightning predator with articulated wings
    primaryMat = new THREE.MeshStandardMaterial({
      color: 0x3b4963,
      roughness: 0.65,
      metalness: 0.18,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf2c14e,
      roughness: 0.28,
      metalness: 0.78,
    });
    glowMat = new THREE.MeshStandardMaterial({
      color: 0x58e8ff,
      emissive: 0x22b8ff,
      emissiveIntensity: 1.5,
      roughness: 0.2,
      metalness: 0.35,
    });

    // Hovering offset so eagle glides visibly above terrain
    bodyGroup.position.y = 1.65;

    const torso = new THREE.Mesh(new THREE.ConeGeometry(0.44, 1.38, 8), primaryMat);
    torso.rotation.x = Math.PI / 2;
    bodyGroup.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), primaryMat);
    head.position.set(0, 0.22, 0.68);
    bodyGroup.add(head);

    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.38, 5), goldMat);
    beak.rotation.x = Math.PI / 2 + 0.28;
    beak.position.set(0, 0.16, 0.98);
    bodyGroup.add(beak);

    const crest = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.42, 4), glowMat);
    crest.position.set(0, 0.42, 0.52);
    crest.rotation.x = -0.75;
    bodyGroup.add(crest);

    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), glowMat);
      eye.position.set(side * 0.16, 0.26, 0.85);
      bodyGroup.add(eye);

      const wingPivot = new THREE.Group();
      wingPivot.position.set(side * 0.32, 0.12, 0.08);
      const innerWing = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.08, 0.56), primaryMat);
      innerWing.position.set(side * 0.56, 0, -0.06);
      wingPivot.add(innerWing);

      const tipWing = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.05, 0.38), glowMat);
      tipWing.position.set(side * 1.4, 0.02, -0.14);
      tipWing.rotation.y = side * -0.18;
      wingPivot.add(tipWing);

      bodyGroup.add(wingPivot);
      wings.push(wingPivot);
    }

    const tailFan = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, 0.52), primaryMat);
    tailFan.position.set(0, 0.04, -0.82);
    bodyGroup.add(tailFan);
    accentObj = crest;

    hpBarY = 3.05;
    shadowSize = 2.2;
  } else if (kind === 'guardian') {
    // 4. Mythic Peak Guardian — towering crystal-antlered runic mountain stag/golem boss
    primaryMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.52,
      metalness: 0.42,
      flatShading: true,
    });
    const stoneGoldMat = new THREE.MeshStandardMaterial({
      color: 0xe9c46a,
      roughness: 0.25,
      metalness: 0.84,
    });
    glowMat = new THREE.MeshStandardMaterial({
      color: 0xc084fc,
      emissive: 0x9333ea,
      emissiveIntensity: 1.65,
      roughness: 0.16,
      metalness: 0.32,
    });

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.5, 1.38, 7), primaryMat);
    torso.scale.set(1.1, 1.0, 0.88);
    torso.position.set(0, 1.68, 0);
    bodyGroup.add(torso);

    // Floating chest rune core
    const chestCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), glowMat);
    chestCore.position.set(0, 1.78, 0.52);
    bodyGroup.add(chestCore);

    // Sculpted gilded shoulder mantle
    const shoulders = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.42, 0.88), stoneGoldMat);
    shoulders.position.set(0, 2.32, 0);
    bodyGroup.add(shoulders);

    // Crowned stag-spirit head
    const head = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), primaryMat);
    head.scale.set(0.86, 1.1, 1.15);
    head.position.set(0, 2.86, 0.16);
    bodyGroup.add(head);

    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), glowMat);
      eye.position.set(side * 0.17, 2.9, 0.5);
      bodyGroup.add(eye);

      // Luminous branching crystal antlers
      const antlerMain = new THREE.Mesh(new THREE.ConeGeometry(0.08, 1.12, 5), glowMat);
      antlerMain.position.set(side * 0.42, 3.55, 0.04);
      antlerMain.rotation.z = side * -0.45;
      bodyGroup.add(antlerMain);

      const antlerFork = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.65, 5), stoneGoldMat);
      antlerFork.position.set(side * 0.72, 3.82, 0.12);
      antlerFork.rotation.z = side * -0.85;
      bodyGroup.add(antlerFork);
    }

    // Orbiting runic halo ring behind Guardian
    const runeHalo = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.065, 8, 24), glowMat);
    runeHalo.position.set(0, 2.42, -0.58);
    bodyGroup.add(runeHalo);
    accentObj = runeHalo;

    // 4 heavy golem limbs (2 legs + 2 arms)
    const legGeo = new THREE.CylinderGeometry(0.2, 0.14, 1.12, 6);
    for (const side of [-1, 1]) {
      const legPivot = new THREE.Group();
      legPivot.position.set(side * 0.4, 1.08, 0);
      const leg = new THREE.Mesh(legGeo, primaryMat);
      leg.position.y = -0.54;
      legPivot.add(leg);
      bodyGroup.add(legPivot);
      limbs.push(legPivot);

      const armPivot = new THREE.Group();
      armPivot.position.set(side * 0.96, 2.28, 0);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.05, 0.28), primaryMat);
      arm.position.y = -0.48;
      const fist = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), glowMat);
      fist.position.y = -1.04;
      armPivot.add(arm, fist);
      bodyGroup.add(armPivot);
      limbs.push(armPivot);
    }

    hpBarY = 4.45;
    shadowSize = 3.0;
  } else if (kind === 'wraith') {
    // 5. Nether Earth Wraith — Soul Clan subterranean phantom hunter rising from ground fissures
    primaryMat = new THREE.MeshStandardMaterial({
      color: 0x1a1326,
      roughness: 0.72,
      metalness: 0.28,
      flatShading: true,
    });
    const boneMat = new THREE.MeshStandardMaterial({
      color: 0xd9e4de,
      roughness: 0.36,
      metalness: 0.18,
    });
    const cloakTrimMat = new THREE.MeshStandardMaterial({
      color: 0x3b2259,
      roughness: 0.58,
      metalness: 0.32,
      flatShading: true,
    });
    glowMat = new THREE.MeshStandardMaterial({
      color: 0x3cf5b8,
      emissive: 0x16c98e,
      emissiveIntensity: 1.9,
      roughness: 0.14,
      metalness: 0.3,
    });

    // Tattered hovering obsidian robe skirt (grounded cleanly above earth)
    const lowerCloak = new THREE.Mesh(new THREE.ConeGeometry(0.66, 1.55, 7, 1, true), primaryMat);
    lowerCloak.material.side = THREE.DoubleSide;
    lowerCloak.position.set(0, 1.05, 0);
    bodyGroup.add(lowerCloak);

    // Upper spectral torso & pauldrons
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.32, 0.92, 6), cloakTrimMat);
    torso.position.set(0, 1.88, 0);
    bodyGroup.add(torso);

    const soulCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), glowMat);
    soulCore.position.set(0, 1.92, 0.32);
    bodyGroup.add(soulCore);

    // Hooded cowl & pale bone mask
    const hood = new THREE.Mesh(new THREE.ConeGeometry(0.44, 0.76, 6), primaryMat);
    hood.position.set(0, 2.66, -0.05);
    hood.rotation.x = 0.2;
    bodyGroup.add(hood);

    const mask = new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 0), boneMat);
    mask.scale.set(0.85, 1.15, 0.72);
    mask.position.set(0, 2.52, 0.24);
    bodyGroup.add(mask);

    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), glowMat);
      eye.position.set(side * 0.1, 2.56, 0.42);
      bodyGroup.add(eye);

      // Spectral clawed arms reaching forward
      const armPivot = new THREE.Group();
      armPivot.position.set(side * 0.56, 2.18, 0.05);
      const sleeve = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.85, 5), primaryMat);
      sleeve.rotation.x = Math.PI * 0.65;
      sleeve.position.set(0, -0.22, 0.28);
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.42, 4), glowMat);
      claw.rotation.x = Math.PI * 0.5;
      claw.position.set(0, -0.34, 0.74);
      armPivot.add(sleeve, claw);
      bodyGroup.add(armPivot);
      limbs.push(armPivot);
    }

    // Orbiting Soul-Chain ring
    const chainRing = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.045, 6, 20), glowMat);
    chainRing.position.set(0, 1.55, 0);
    chainRing.rotation.x = Math.PI * 0.38;
    bodyGroup.add(chainRing);
    accentObj = chainRing;

    hpBarY = 3.5;
    shadowSize = 2.0;
  } else {
    // 6. Soul Hall Reaper — towering Ghost Clan Elder boss with horned bone crown & floating spectral scythe
    primaryMat = new THREE.MeshStandardMaterial({
      color: 0x160f24,
      roughness: 0.6,
      metalness: 0.38,
      flatShading: true,
    });
    const boneArmorMat = new THREE.MeshStandardMaterial({
      color: 0xe6efe9,
      roughness: 0.34,
      metalness: 0.22,
    });
    const violetMetalMat = new THREE.MeshStandardMaterial({
      color: 0x4c1d6e,
      roughness: 0.32,
      metalness: 0.76,
    });
    glowMat = new THREE.MeshStandardMaterial({
      color: 0xe879f9,
      emissive: 0x9333ea,
      emissiveIntensity: 1.95,
      roughness: 0.12,
      metalness: 0.35,
    });
    const soulFlameMat = new THREE.MeshStandardMaterial({
      color: 0x3ef5b8,
      emissive: 0x12d896,
      emissiveIntensity: 2.0,
      roughness: 0.14,
      metalness: 0.28,
    });

    // Billowing lower mantle
    const robe = new THREE.Mesh(new THREE.ConeGeometry(0.98, 2.2, 8, 1, true), primaryMat);
    robe.material.side = THREE.DoubleSide;
    robe.position.set(0, 1.38, 0);
    bodyGroup.add(robe);

    // Armored dark torso + glowing soul furnace
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.45, 1.32, 7), violetMetalMat);
    torso.position.set(0, 2.48, 0);
    bodyGroup.add(torso);

    const soulFurnace = new THREE.Mesh(new THREE.OctahedronGeometry(0.38, 0), soulFlameMat);
    soulFurnace.position.set(0, 2.52, 0.48);
    bodyGroup.add(soulFurnace);

    // Wide jagged shoulder mantle
    const shoulders = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.42, 0.92), boneArmorMat);
    shoulders.position.set(0, 3.12, 0);
    bodyGroup.add(shoulders);

    // Horned skull visage & elder crown
    const skull = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), boneArmorMat);
    skull.scale.set(0.86, 1.18, 0.96);
    skull.position.set(0, 3.66, 0.16);
    bodyGroup.add(skull);

    const cowl = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.92, 6), primaryMat);
    cowl.position.set(0, 3.92, -0.1);
    cowl.rotation.x = 0.24;
    bodyGroup.add(cowl);

    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), soulFlameMat);
      eye.position.set(side * 0.16, 3.7, 0.5);
      bodyGroup.add(eye);

      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.09, 1.05, 5), glowMat);
      horn.position.set(side * 0.42, 4.25, 0.08);
      horn.rotation.z = side * -0.46;
      bodyGroup.add(horn);

      const armPivot = new THREE.Group();
      armPivot.position.set(side * 1.08, 3.04, 0.1);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.18, 0.3), primaryMat);
      arm.position.y = -0.52;
      const gauntlet = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), soulFlameMat);
      gauntlet.position.y = -1.12;
      armPivot.add(arm, gauntlet);

      // Right arm wields the Soul Hall Spectral Scythe
      if (side === 1) {
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 3.2, 6), violetMetalMat);
        shaft.position.set(0.18, -0.45, 0.55);
        shaft.rotation.x = 0.42;
        const blade = new THREE.Mesh(new THREE.ConeGeometry(0.26, 1.35, 4), soulFlameMat);
        blade.position.set(-0.32, 0.82, 1.25);
        blade.rotation.set(0.4, 0, 1.35);
        armPivot.add(shaft, blade);
      }
      bodyGroup.add(armPivot);
      limbs.push(armPivot);
    }

    // Twin intersecting dark-soul halo rings behind the Reaper
    const haloGroup = new THREE.Group();
    haloGroup.position.set(0, 3.1, -0.58);
    const outerRing = new THREE.Mesh(new THREE.TorusGeometry(1.22, 0.065, 8, 28), glowMat);
    const innerRing = new THREE.Mesh(new THREE.TorusGeometry(0.84, 0.048, 6, 22), soulFlameMat);
    innerRing.rotation.y = Math.PI * 0.35;
    haloGroup.add(outerRing, innerRing);
    bodyGroup.add(haloGroup);
    accentObj = haloGroup;

    hpBarY = 5.15;
    shadowSize = 3.2;
  }

  // Grounded soft contact shadow
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(shadowSize, shadowSize),
    new THREE.MeshBasicMaterial({
      map: res.contactShadow,
      transparent: true,
      depthWrite: false,
      opacity: 0.48,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  group.add(shadow);

  // Clean overhead billboarded 3D HP bar (hidden until engaged/damaged)
  const hpBarGroup = new THREE.Group();
  hpBarGroup.position.set(0, hpBarY, 0);
  const barWidth = kind === 'guardian' || kind === 'soul_elder' ? 2.25 : 1.4;
  const barBg = new THREE.Mesh(
    new THREE.PlaneGeometry(barWidth + 0.08, 0.18),
    new THREE.MeshBasicMaterial({
      color: 0x0b151a,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  const hpFillGeo = new THREE.PlaneGeometry(barWidth, 0.11);
  hpFillGeo.translate(barWidth / 2, 0, 0); // scale from left edge cleanly
  const hpFillColor =
    kind === 'soul_elder'
      ? 0xe879f9
      : kind === 'wraith'
        ? 0x3ef5b8
        : kind === 'guardian'
          ? 0xc084fc
          : 0xff5a45;
  const hpFillMesh = new THREE.Mesh(
    hpFillGeo,
    new THREE.MeshBasicMaterial({
      color: hpFillColor,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  hpFillMesh.position.set(-barWidth / 2, 0, 0.01);
  hpBarGroup.add(barBg, hpFillMesh);
  hpBarGroup.visible = false;
  group.add(hpBarGroup);

  enableShadows(bodyGroup, res.castShadows);
  shadow.castShadow = false;
  shadow.receiveShadow = false;
  hpBarGroup.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = false;
      o.receiveShadow = false;
    }
  });

  return {
    kind,
    group,
    bodyGroup,
    limbs,
    wings,
    accentObj,
    primaryMat,
    glowMat,
    hpBarGroup,
    hpFillMesh,
  };
}

export interface GroundFissureRig {
  group: THREE.Group;
  outerRing: THREE.Mesh;
  innerDisc: THREE.Mesh;
  vortexCone: THREE.Mesh;
  ringMat: THREE.MeshBasicMaterial;
  discMat: THREE.MeshBasicMaterial;
  vortexMat: THREE.MeshBasicMaterial;
}

/**
 * Cracked subterranean Soul-Clan summoning fissure that tears open on the terrain
 * as Ghost Clan hunters erupt from underground.
 */
export function createGroundFissureVisual(): GroundFissureRig {
  const group = new THREE.Group();

  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x3ef5b8,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const outerRing = new THREE.Mesh(new THREE.RingGeometry(0.76, 1.0, 28), ringMat);
  outerRing.rotation.x = -Math.PI / 2;
  outerRing.position.y = 0.09;
  group.add(outerRing);

  const discMat = new THREE.MeshBasicMaterial({
    color: 0x190929,
    transparent: true,
    opacity: 0.88,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const innerDisc = new THREE.Mesh(new THREE.CircleGeometry(0.78, 22), discMat);
  innerDisc.rotation.x = -Math.PI / 2;
  innerDisc.position.y = 0.06;
  group.add(innerDisc);

  const vortexMat = new THREE.MeshBasicMaterial({
    color: 0xb96bff,
    transparent: true,
    opacity: 0.42,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const vortexCone = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.35, 2.8, 14, 1, true), vortexMat);
  vortexCone.position.y = 1.42;
  group.add(vortexCone);

  group.visible = false;
  return { group, outerRing, innerDisc, vortexCone, ringMat, discMat, vortexMat };
}

export interface PlayerAuraRig {
  group: THREE.Group;
  orbs: THREE.Mesh[];
  groundRing: THREE.Mesh;
  orbMat: THREE.MeshStandardMaterial;
  ringMat: THREE.MeshBasicMaterial;
}

/**
 * Escalating Player Magical Aura (up to 6 orbiting arcane rune shards + glowing rune halo).
 * Grows in orb count, brightness, and color from Tier 1 -> Tier 12 Dou Di Flame Emperor.
 */
export function createPlayerAuraRig(): PlayerAuraRig {
  const group = new THREE.Group();

  const orbMat = new THREE.MeshStandardMaterial({
    color: 0x3de095,
    emissive: 0x2ed489,
    emissiveIntensity: 1.5,
    roughness: 0.15,
    metalness: 0.35,
  });

  const orbGeo = new THREE.OctahedronGeometry(0.16, 0);
  const orbs: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(orbGeo, orbMat);
    m.visible = false;
    m.castShadow = false;
    group.add(m);
    orbs.push(m);
  }

  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x3de095,
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const groundRing = new THREE.Mesh(new THREE.RingGeometry(1.15, 1.38, 28), ringMat);
  groundRing.rotation.x = -Math.PI / 2;
  groundRing.position.y = 0.14;
  groundRing.visible = false;
  group.add(groundRing);

  return { group, orbs, groundRing, orbMat, ringMat };
}


