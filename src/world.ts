import * as THREE from 'three';
import { CSM } from 'three/addons/csm/CSM.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { getLevelEnvironment, getMagicTierForLevel, getStageForLevel } from './evolution';
import {
  AscensionAvatarRig,
  BeastRig,
  GroundFissureRig,
  PlayerAuraRig,
  createAscensionAvatar,
  createBeastModel,
  createBoostBlock,
  createFruitModel,
  createGroundFissureVisual,
  createLandmarkShrine,
  createPlayerAuraRig,
  createPortalBlock,
  createRollingBoulder,
  createSerpentHead,
  createSerpentSegment,
  createTotemBlock,
  createWallBlock,
  ModelResources,
} from './models';
import {
  WORLD_LAKES,
  WORLD_LANDMARKS,
  isDeepWater,
  isNearSpawn,
  terrainHeightAt,
  terrainNormalAt,
} from './terrain';
import {
  createContactShadowTexture,
  createMistTexture,
  createSnakeScaleTexture,
  createSparkGlowTexture,
  createTerrainTexture,
} from './textures';
import {
  BeastKind,
  BiomeId,
  CameraMode,
  CollectibleOrb,
  FormationData,
  GameMode,
  GroundFissure,
  MagicProjectile,
  RollingBoulder,
  ShockwaveEffect,
  WATER_LEVEL,
  WORLD_PLAY_RADIUS,
  WeatherMode,
  WildBeast,
  WorldObstacle,
  WorldPoint2D,
} from './types';

export interface SnakePose3D {
  x: number;
  y: number;
  z: number;
  nx: number;
  ny: number;
  nz: number;
  heading: number;
}

export interface RenderSnakeState {
  head: SnakePose3D;
  segments: SnakePose3D[];
  boostActive: boolean;
  speedRatio: number;
}

interface BurstParticle {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  age: number;
  life: number;
  scale: number;
  color: THREE.Color;
}

interface EvoShardParticle {
  active: boolean;
  kind: 'core' | 'ring' | 'helix';
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  originX: number;
  originY: number;
  originZ: number;
  orbitAngle: number;
  orbitRadius: number;
  orbitSpeed: number;
  riseSpeed: number;
  delay: number;
  age: number;
  life: number;
  scale: number;
  spinX: number;
  spinY: number;
  color: THREE.Color;
}

interface EvoSparkParticle {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  delay: number;
  age: number;
  life: number;
  baseColor: THREE.Color;
}

interface EvoShockRing {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  delay: number;
  age: number;
  life: number;
  maxRadius: number;
  riseSpeed: number;
}

interface MistParticle {
  x: number;
  z: number;
  yOffset: number;
  driftX: number;
  driftZ: number;
  phase: number;
}

interface RainDrop {
  x: number;
  y: number;
  z: number;
  speed: number;
  len: number;
}

interface RainSplash {
  active: boolean;
  x: number;
  y: number;
  z: number;
  nx: number;
  ny: number;
  nz: number;
  age: number;
  life: number;
  maxScale: number;
}

interface WeatherAtmosphere {
  fogDensity: number;
  skyHex: number;
  fogHex: number;
  sunScale: number;
  hemiScale: number;
  rimScale: number;
  exposure: number;
  mistOpacity: number;
  mistSize: number;
  mistTint: number;
}

const WEATHER_PRESETS: Record<BiomeId, Record<WeatherMode, WeatherAtmosphere>> = {
  mountain: {
    clear: {
      fogDensity: 0.0038,
      skyHex: 0x2c5680,
      fogHex: 0x426c96,
      sunScale: 1.06,
      hemiScale: 1.0,
      rimScale: 1.0,
      exposure: 1.08,
      mistOpacity: 0.0,
      mistSize: 15,
      mistTint: 0xdbeeff,
    },
    mist: {
      fogDensity: 0.0078,
      skyHex: 0x4b6a82,
      fogHex: 0x6d8aa0,
      sunScale: 0.85,
      hemiScale: 1.02,
      rimScale: 0.88,
      exposure: 1.04,
      mistOpacity: 0.27,
      mistSize: 17,
      mistTint: 0xdcebf7,
    },
    fog: {
      fogDensity: 0.0178,
      skyHex: 0x798d9c,
      fogHex: 0x8ea0ae,
      sunScale: 0.44,
      hemiScale: 1.15,
      rimScale: 0.55,
      exposure: 0.98,
      mistOpacity: 0.48,
      mistSize: 23,
      mistTint: 0xd9e3eb,
    },
    rain: {
      fogDensity: 0.0114,
      skyHex: 0x34495e,
      fogHex: 0x4c6278,
      sunScale: 0.52,
      hemiScale: 0.92,
      rimScale: 0.72,
      exposure: 0.96,
      mistOpacity: 0.24,
      mistSize: 16,
      mistTint: 0xb7cadc,
    },
  },
  jungle: {
    clear: {
      fogDensity: 0.0046,
      skyHex: 0x1a423c,
      fogHex: 0x23524b,
      sunScale: 1.05,
      hemiScale: 1.0,
      rimScale: 1.0,
      exposure: 1.08,
      mistOpacity: 0.0,
      mistSize: 15,
      mistTint: 0xd4f5ea,
    },
    mist: {
      fogDensity: 0.0086,
      skyHex: 0x2b5752,
      fogHex: 0x41726c,
      sunScale: 0.84,
      hemiScale: 1.02,
      rimScale: 0.9,
      exposure: 1.03,
      mistOpacity: 0.3,
      mistSize: 18,
      mistTint: 0xd4f0e7,
    },
    fog: {
      fogDensity: 0.0185,
      skyHex: 0x567772,
      fogHex: 0x6f8f8a,
      sunScale: 0.42,
      hemiScale: 1.16,
      rimScale: 0.55,
      exposure: 0.97,
      mistOpacity: 0.52,
      mistSize: 24,
      mistTint: 0xcce3dd,
    },
    rain: {
      fogDensity: 0.0124,
      skyHex: 0x1e3839,
      fogHex: 0x335355,
      sunScale: 0.5,
      hemiScale: 0.92,
      rimScale: 0.72,
      exposure: 0.95,
      mistOpacity: 0.26,
      mistSize: 16,
      mistTint: 0xaad0cc,
    },
  },
};

const MAX_SNAKE_SEGMENTS = 120;
const MAX_BURST_PARTICLES = 180;
const MAX_EVO_SHARDS = 260;
const MAX_EVO_SPARKS = 220;
const MAX_COLLECTIBLES = 42;
const MAX_ROLLING_BOULDERS = 24;
const MAX_PROJECTILES = 56;
const MAX_SHOCKWAVES = 14;
const MAX_FISSURES = 10;

// Scratch objects reused per frame (zero per-frame heap allocation)
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _up = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _basisMat = new THREE.Matrix4();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _euler = new THREE.Euler();
const _color = new THREE.Color();
const _targetSkyColor = new THREE.Color();
const _targetFogColor = new THREE.Color();
const _targetMistColor = new THREE.Color();
const _targetSunColor = new THREE.Color();
const _targetHemiSkyColor = new THREE.Color();
const _targetHemiGroundColor = new THREE.Color();
const _targetRimColor = new THREE.Color();
const _levelTintColor = new THREE.Color();
const _yAxis = new THREE.Vector3(0, 1, 0);

export class WorldEngine {
  public readonly container: HTMLElement;
  public readonly renderer: THREE.WebGLRenderer;
  public readonly scene: THREE.Scene;
  public readonly camera: THREE.PerspectiveCamera;
  public readonly isSoftwareGl: boolean;

  private readonly worldRoot = new THREE.Group();
  private readonly envGroup = new THREE.Group();
  private readonly propsGroup = new THREE.Group();
  private readonly snakeGroup = new THREE.Group();
  private readonly collectiblesGroup = new THREE.Group();
  private readonly bouldersGroup = new THREE.Group();
  private readonly beastsGroup = new THREE.Group();
  private readonly combatFxGroup = new THREE.Group();
  private readonly evoExplosionGroup = new THREE.Group();
  private readonly landmarksGroup = new THREE.Group();
  private readonly weatherGroup = new THREE.Group();

  private readonly maxAnisotropy: number;
  private biome: BiomeId = 'mountain';
  private weather: WeatherMode = 'mist';
  private activeEvolutionLevel = 1;

  // Terrain mesh (also raycast target in Builder mode)
  private terrainMesh: THREE.Mesh | null = null;
  private naturalObstacles: WorldObstacle[] = [];

  // Lighting & Cascaded Shadow Maps (CSM)
  private csm: CSM | null = null;
  private fallbackSunLight: THREE.DirectionalLight | null = null;
  private lastCsmFov = 58;
  private baseSunIntensity = 2.55;
  private baseHemiIntensity = 0.9;
  private baseRimIntensity = 0.58;
  private hemiLight!: THREE.HemisphereLight;
  private rimLight!: THREE.DirectionalLight;
  private waterMeshes: THREE.Mesh[] = [];

  // Ambient floating particles (snowflakes / jungle fireflies)
  private ambientMotes: THREE.Points | null = null;
  private ambientMotePositions: Float32Array | null = null;

  // Procedural Weather System (drifting mist/fog puffs, slanted light rain, ground splashes)
  private mistTexture!: THREE.CanvasTexture;
  private mistPoints!: THREE.Points;
  private mistMat!: THREE.PointsMaterial;
  private mistPositions!: Float32Array;
  private mistParticles: MistParticle[] = [];

  private rainLines!: THREE.LineSegments;
  private rainMat!: THREE.LineBasicMaterial;
  private rainPositions!: Float32Array;
  private rainDrops: RainDrop[] = [];
  private rainCyclePhase = Math.PI * 0.45;
  private liveRainIntensity = 0;

  private splashInstanced!: THREE.InstancedMesh;
  private splashMat!: THREE.MeshBasicMaterial;
  private rainSplashes: RainSplash[] = [];
  private splashCursor = 0;
  private weatherNormalScratch = { x: 0, y: 1, z: 0 };

  // Snake & 12-Stage Ascension Human Avatar visuals
  private snakeHeadGroup!: THREE.Group;
  private snakeTongue!: THREE.Group;
  private snakeHeadMat!: THREE.MeshStandardMaterial;
  private snakeLeftHorn!: THREE.Mesh;
  private snakeRightHorn!: THREE.Mesh;
  private snakeCrown!: THREE.Mesh;
  private snakeBodyPool: THREE.Group[] = [];
  private snakeBodyMat!: THREE.MeshStandardMaterial;
  private snakeCrestMat!: THREE.MeshStandardMaterial;
  private snakeBellyMat!: THREE.MeshStandardMaterial;
  private ascensionRig!: AscensionAvatarRig;
  private playerAuraRig!: PlayerAuraRig;
  private gaitPhase = 0;
  private snakeScaleMap!: THREE.Texture;
  private contactShadowMap!: THREE.Texture;

  // Dynamic world collectibles (14+ simultaneously across mountains)
  private collectiblePool: Array<{
    group: THREE.Group;
    golden: boolean;
    active: boolean;
  }> = [];

  // Dynamic rolling mountain boulders
  private rollingBoulderPool: THREE.Group[] = [];

  // Dynamic wild mountain beasts, Soul Clan ghosts & magical combat FX pools
  private beastPools: Record<BeastKind, BeastRig[]> = {
    wolf: [],
    boar: [],
    eagle: [],
    guardian: [],
    wraith: [],
    soul_elder: [],
  };
  private groundFissurePool: GroundFissureRig[] = [];
  private projectilePool: Array<{
    group: THREE.Group;
    coreMat: THREE.MeshBasicMaterial;
    haloMat: THREE.MeshBasicMaterial;
  }> = [];
  private shockwavePool: Array<{
    group: THREE.Group;
    ringMat: THREE.MeshBasicMaterial;
    discMat: THREE.MeshBasicMaterial;
  }> = [];

  // Landmark shrines on the 5 mountain peaks
  private landmarkVisuals: Array<{
    id: string;
    group: THREE.Group;
    crystal: THREE.Mesh;
    ring: THREE.Mesh;
    beam: THREE.Mesh;
  }> = [];

  // Animated player-placed props
  private animatedTotems: Array<{ core: THREE.Object3D; ring: THREE.Object3D; baseY: number }> = [];
  private animatedPortals: Array<{
    halo: THREE.Object3D;
    s1: THREE.Object3D;
    s2: THREE.Object3D;
  }> = [];
  private animatedBoosts: Array<{ core: THREE.Object3D; ring: THREE.Object3D }> = [];

  // Builder hover ghost & raycaster
  private hoverGhost!: THREE.Group;
  private boundaryRing!: THREE.Mesh;
  private raycaster = new THREE.Raycaster();
  private pointerNdc = new THREE.Vector2();

  // Burst particles (pooled InstancedMesh)
  private burstInstanced!: THREE.InstancedMesh;
  private burstParticles: BurstParticle[] = [];

  // Celebratory Evolution Tier-Up WebGL Particle Explosion (pooled, zero-GC)
  private sparkGlowMap!: THREE.CanvasTexture;
  private evoShardInstanced!: THREE.InstancedMesh;
  private evoShards: EvoShardParticle[] = [];
  private evoSparkPoints!: THREE.Points;
  private evoSparkPositions!: Float32Array;
  private evoSparkColors!: Float32Array;
  private evoSparkMat!: THREE.PointsMaterial;
  private evoSparks: EvoSparkParticle[] = [];
  private evoRings: EvoShockRing[] = [];
  private evoPillarMesh!: THREE.Mesh;
  private evoPillarMat!: THREE.MeshBasicMaterial;
  private evoFlashLight!: THREE.PointLight;
  private evoActive = false;
  private evoAge = 0;
  private evoDuration = 3.2;
  private evoOrigin = new THREE.Vector3();
  private evoFlashPeak = 16;

  // Camera state
  private cameraTargetPos = new THREE.Vector3(0, 14, 24);
  private cameraLookAt = new THREE.Vector3(0, 6, -24);
  private currentLookAt = new THREE.Vector3(0, 6, -24);
  private smoothHeading = Math.PI; // facing -Z toward Grand Glacier Peak
  private titleOrbitAngle = 0.25;
  private builderYaw = 0.4;
  private builderPitch = 0.92;
  private builderDist = 82;
  private builderFocus = new THREE.Vector3(0, 8, -12);
  private shakeIntensity = 0;

  // Loop & XR state
  private running = false;
  private frameId = 0;
  private lastTickPerf = 0;
  private elapsed = 0;
  private onFrameCallback: ((dt: number) => void) | null = null;
  private xrActive = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.isSoftwareGl = WorldEngine.detectSoftwareWebGL();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(
      container.clientWidth || window.innerWidth,
      container.clientHeight || window.innerHeight,
    );
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    this.maxAnisotropy = Math.min(this.renderer.capabilities.getMaxAnisotropy(), 8);

    this.scene = new THREE.Scene();

    // Procedural IBL reflection environment on all devices
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.42;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(
      58,
      (container.clientWidth || window.innerWidth) /
        Math.max(1, container.clientHeight || window.innerHeight),
      0.2,
      940,
    );
    this.camera.position.set(0, 18, 26);

    this.scene.add(this.worldRoot);
    this.worldRoot.add(
      this.envGroup,
      this.landmarksGroup,
      this.propsGroup,
      this.collectiblesGroup,
      this.bouldersGroup,
      this.beastsGroup,
      this.combatFxGroup,
      this.evoExplosionGroup,
      this.snakeGroup,
      this.weatherGroup,
    );

    this.snakeScaleMap = createSnakeScaleTexture(this.maxAnisotropy);
    this.contactShadowMap = createContactShadowTexture();
    this.mistTexture = createMistTexture();
    this.sparkGlowMap = createSparkGlowTexture();

    this.initLighting();
    this.initSnakeVisuals();
    this.initCombatFxPools();
    this.initBuilderHelpers();
    this.initBurstParticles();
    this.initEvolutionExplosion();
    this.initWeatherSystem();
    this.setBiome('mountain');
    this.applyWeatherImmediate();

    window.addEventListener('resize', this.handleResize);
  }

  private static detectSoftwareWebGL(): boolean {
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const rendererName = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
      return /SwiftShader|llvmpipe|Software|Mesa OffScreen/i.test(rendererName);
    } catch {
      return false;
    }
  }

  public getNaturalObstacles(): WorldObstacle[] {
    return this.naturalObstacles;
  }

  private getModelResources(): ModelResources {
    return {
      scaleMap: this.snakeScaleMap,
      contactShadow: this.contactShadowMap,
      biome: this.biome,
      castShadows: !this.isSoftwareGl,
    };
  }

  private initLighting(): void {
    this.hemiLight = new THREE.HemisphereLight(0xa3d4ff, 0x263544, 0.92);
    this.scene.add(this.hemiLight);

    if (!this.isSoftwareGl) {
      // High-quality 4-cascade 2048px Cascaded Shadow Maps for crisp close-up snake shadows
      // and sweeping mountain ridge, tree, and boulder shadows across the entire valley
      this.csm = new CSM({
        camera: this.camera,
        parent: this.scene,
        cascades: 4,
        maxFar: 220,
        mode: 'practical',
        shadowMapSize: 2048,
        shadowBias: -0.00022,
        lightDirection: new THREE.Vector3(-0.62, -0.68, -0.39).normalize(),
        lightIntensity: 2.5,
        lightNear: 1,
        lightFar: 520,
        lightMargin: 120,
      });
      this.csm.fade = true;
      this.configureCsmCascadeBiases();
      this.csm.updateFrustums();
      this.lastCsmFov = this.camera.fov;
    } else {
      // Lightweight fallback sun for software WebGL where shadow maps are disabled
      this.fallbackSunLight = new THREE.DirectionalLight(0xffe7cf, 2.45);
      this.fallbackSunLight.position.set(36, 58, 28);
      this.scene.add(this.fallbackSunLight);
      this.scene.add(this.fallbackSunLight.target);
    }

    this.rimLight = new THREE.DirectionalLight(0x88ccff, 0.58);
    this.rimLight.position.set(-42, 24, -36);
    this.rimLight.castShadow = false;
    this.scene.add(this.rimLight);
  }

  private configureCsmCascadeBiases(): void {
    if (!this.csm) return;
    // Progressive per-cascade bias: tight near snake for grounded contact, smooth on distant cliffs
    const biases = [-0.00016, -0.00024, -0.00034, -0.00046];
    const normalBiases = [0.022, 0.042, 0.068, 0.095];
    const radii = [1.5, 1.8, 2.1, 2.4];

    this.csm.lights.forEach((light, i) => {
      light.shadow.bias = biases[i] ?? -0.0003;
      light.shadow.normalBias = normalBiases[i] ?? 0.05;
      light.shadow.radius = radii[i] ?? 1.8;
    });
  }

  /**
   * Registers all lit PBR materials under an Object3D subtree with CSM once.
   */
  private registerCsmMaterials(root: THREE.Object3D): void {
    if (!this.csm) return;
    const csm = this.csm;
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh || !mesh.material) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of mats) {
        if (
          (mat as THREE.MeshStandardMaterial).isMeshStandardMaterial ||
          (mat as THREE.MeshPhysicalMaterial).isMeshPhysicalMaterial
        ) {
          if (!csm.shaders.has(mat)) {
            csm.setupMaterial(mat);
          }
        }
      }
    });
  }

  /**
   * Unregisters materials from CSM shader map and disposes geometries/materials in a group.
   */
  private disposeGroupWithCsm(group: THREE.Group): void {
    group.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh || (obj as THREE.Points).isPoints) {
        const m = obj as THREE.Mesh;
        m.geometry?.dispose();
        if (Array.isArray(m.material)) {
          m.material.forEach((mat) => {
            this.csm?.shaders.delete(mat);
            mat.dispose();
          });
        } else if (m.material) {
          this.csm?.shaders.delete(m.material);
          m.material.dispose();
        }
      }
    });
    group.clear();
  }

  private initSnakeVisuals(): void {
    const res = this.getModelResources();
    const head = createSerpentHead(res);
    this.snakeHeadGroup = head.group;
    this.snakeTongue = head.tongue;
    this.snakeHeadMat = head.headMat;
    this.snakeLeftHorn = head.leftHorn;
    this.snakeRightHorn = head.rightHorn;
    this.snakeCrown = head.crown;
    this.snakeHeadGroup.scale.setScalar(0.72);
    this.snakeGroup.add(this.snakeHeadGroup);

    // 12-stage Evolution & Ascended Human composite articulated rig
    this.ascensionRig = createAscensionAvatar(res);
    this.ascensionRig.group.visible = false;
    this.snakeGroup.add(this.ascensionRig.group);

    // Escalating Player Arcane Aura (orbiting rune shards + ground halo)
    this.playerAuraRig = createPlayerAuraRig();
    this.snakeGroup.add(this.playerAuraRig.group);

    const bodyGeo = new THREE.SphereGeometry(0.37, 14, 12);
    const crestGeo = new THREE.OctahedronGeometry(0.11, 0);
    crestGeo.scale(0.65, 1.0, 1.45);
    const bellyGeo = new THREE.BoxGeometry(0.42, 0.12, 0.48);

    this.snakeBodyMat = new THREE.MeshStandardMaterial({
      color: 0x1bb373,
      map: this.snakeScaleMap,
      roughness: 0.3,
      metalness: 0.12,
      transparent: true,
      opacity: 1.0,
    });
    this.snakeCrestMat = new THREE.MeshStandardMaterial({
      color: 0xf4c44e,
      roughness: 0.28,
      metalness: 0.78,
      transparent: true,
      opacity: 1.0,
    });
    this.snakeBellyMat = new THREE.MeshStandardMaterial({
      color: 0xd9c282,
      roughness: 0.65,
      metalness: 0.05,
      transparent: true,
      opacity: 1.0,
    });

    for (let i = 0; i < MAX_SNAKE_SEGMENTS; i++) {
      const seg = createSerpentSegment(
        bodyGeo,
        crestGeo,
        bellyGeo,
        this.snakeBodyMat,
        this.snakeCrestMat,
        this.snakeBellyMat,
        !this.isSoftwareGl,
      );
      seg.visible = false;
      this.snakeBodyPool.push(seg);
      this.snakeGroup.add(seg);
    }
    this.registerCsmMaterials(this.snakeGroup);
  }

  private initCollectiblePool(): void {
    this.disposeGroupWithCsm(this.collectiblesGroup);
    this.collectiblePool = [];

    const res = this.getModelResources();
    for (let i = 0; i < MAX_COLLECTIBLES; i++) {
      const golden = i < 14; // first 14 slots are golden summit crystals with tall sky beacons
      const g = createFruitModel(res, golden);
      g.scale.setScalar(golden ? 1.55 : 1.3);
      g.visible = false;
      this.collectiblesGroup.add(g);
      this.collectiblePool.push({ group: g, golden, active: false });
    }
    this.registerCsmMaterials(this.collectiblesGroup);
  }

  private initRollingBoulderPool(): void {
    this.disposeGroupWithCsm(this.bouldersGroup);
    this.rollingBoulderPool = [];

    const res = this.getModelResources();
    for (let i = 0; i < MAX_ROLLING_BOULDERS; i++) {
      const b = createRollingBoulder(res);
      b.visible = false;
      this.bouldersGroup.add(b);
      this.rollingBoulderPool.push(b);
    }
    this.registerCsmMaterials(this.bouldersGroup);
  }

  private initBeastPools(): void {
    this.disposeGroupWithCsm(this.beastsGroup);
    this.beastPools = { wolf: [], boar: [], eagle: [], guardian: [], wraith: [], soul_elder: [] };

    const res = this.getModelResources();
    const counts: Record<BeastKind, number> = {
      wolf: 7,
      boar: 6,
      eagle: 6,
      guardian: 4,
      wraith: 8,
      soul_elder: 3,
    };

    for (const kind of ['wolf', 'boar', 'eagle', 'guardian', 'wraith', 'soul_elder'] as BeastKind[]) {
      for (let i = 0; i < counts[kind]; i++) {
        const rig = createBeastModel(res, kind);
        rig.group.visible = false;
        this.beastsGroup.add(rig.group);
        this.beastPools[kind].push(rig);
      }
    }
    this.registerCsmMaterials(this.beastsGroup);
  }

  private initCombatFxPools(): void {
    this.combatFxGroup.clear();
    this.projectilePool = [];
    this.shockwavePool = [];
    this.groundFissurePool = [];

    for (let i = 0; i < MAX_FISSURES; i++) {
      const fRig = createGroundFissureVisual();
      this.combatFxGroup.add(fRig.group);
      this.groundFissurePool.push(fRig);
    }

    const coreGeo = new THREE.OctahedronGeometry(0.32, 1);
    const haloGeo = new THREE.TorusGeometry(0.46, 0.055, 6, 16);
    for (let i = 0; i < MAX_PROJECTILES; i++) {
      const group = new THREE.Group();
      const coreMat = new THREE.MeshBasicMaterial({ color: 0x3de095 });
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.78,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const core = new THREE.Mesh(coreGeo, coreMat);
      const halo = new THREE.Mesh(haloGeo, haloMat);
      group.add(core, halo);
      group.visible = false;
      this.combatFxGroup.add(group);
      this.projectilePool.push({ group, coreMat, haloMat });
    }

    const ringGeo = new THREE.TorusGeometry(1, 0.09, 8, 36);
    ringGeo.rotateX(Math.PI / 2);
    const discGeo = new THREE.RingGeometry(0.76, 1.0, 36);
    discGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < MAX_SHOCKWAVES; i++) {
      const group = new THREE.Group();
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x3de095,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const discMat = new THREE.MeshBasicMaterial({
        color: 0x3de095,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      const disc = new THREE.Mesh(discGeo, discMat);
      group.add(ring, disc);
      group.visible = false;
      this.combatFxGroup.add(group);
      this.shockwavePool.push({ group, ringMat, discMat });
    }
  }

  private initBuilderHelpers(): void {
    // Glowing terrain placement cursor ring
    this.hoverGhost = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.35, 0.12, 8, 28),
      new THREE.MeshBasicMaterial({
        color: 0x58e1ff,
        transparent: true,
        opacity: 0.88,
      }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.25;
    this.hoverGhost.add(ring);

    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.3, 6.0, 8, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0x58e1ff,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    beam.position.y = 3.2;
    this.hoverGhost.add(beam);
    this.hoverGhost.visible = false;
    this.worldRoot.add(this.hoverGhost);

    // Subtle playable mountain boundary ring shown ONLY in Builder mode
    this.boundaryRing = new THREE.Mesh(
      new THREE.RingGeometry(WORLD_PLAY_RADIUS - 0.5, WORLD_PLAY_RADIUS + 0.5, 96),
      new THREE.MeshBasicMaterial({
        color: 0x7be0ff,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    this.boundaryRing.rotation.x = -Math.PI / 2;
    this.boundaryRing.position.y = 14;
    this.boundaryRing.visible = false;
    this.worldRoot.add(this.boundaryRing);
  }

  private initBurstParticles(): void {
    const geo = new THREE.OctahedronGeometry(0.18, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.7,
      roughness: 0.2,
      metalness: 0.2,
    });
    this.burstInstanced = new THREE.InstancedMesh(geo, mat, MAX_BURST_PARTICLES);
    this.burstInstanced.frustumCulled = false;

    for (let i = 0; i < MAX_BURST_PARTICLES; i++) {
      this.burstParticles.push({
        active: false,
        pos: new THREE.Vector3(0, -200, 0),
        vel: new THREE.Vector3(),
        age: 0,
        life: 0.65,
        scale: 1,
        color: new THREE.Color(0xffd24d),
      });
      _mat4.makeScale(0, 0, 0);
      this.burstInstanced.setMatrixAt(i, _mat4);
      this.burstInstanced.setColorAt(i, _color.setHex(0xffd24d));
    }
    this.burstInstanced.instanceMatrix.needsUpdate = true;
    if (this.burstInstanced.instanceColor) {
      this.burstInstanced.instanceColor.needsUpdate = true;
    }
    this.worldRoot.add(this.burstInstanced);
    this.registerCsmMaterials(this.burstInstanced);
  }

  public spawnBurst(x: number, y: number, z: number, colorHex: number, count = 20): void {
    let spawned = 0;
    for (let i = 0; i < MAX_BURST_PARTICLES && spawned < count; i++) {
      const p = this.burstParticles[i];
      if (!p.active) {
        p.active = true;
        p.pos.set(x, y, z);
        const angle = Math.random() * Math.PI * 2;
        const speed = 2.2 + Math.random() * 5.2;
        p.vel.set(Math.cos(angle) * speed, 2.8 + Math.random() * 4.8, Math.sin(angle) * speed);
        p.age = 0;
        p.life = 0.48 + Math.random() * 0.4;
        p.scale = 0.75 + Math.random() * 0.95;
        p.color.setHex(colorHex);
        spawned++;
      }
    }
  }

  private initEvolutionExplosion(): void {
    this.evoExplosionGroup.visible = false;

    // 1. Faceted Luminous Celebration Shards (InstancedMesh, additive glow)
    const shardGeo = new THREE.OctahedronGeometry(0.24, 0);
    shardGeo.scale(0.68, 1.45, 0.68);
    const shardMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.evoShardInstanced = new THREE.InstancedMesh(shardGeo, shardMat, MAX_EVO_SHARDS);
    this.evoShardInstanced.frustumCulled = false;
    this.evoShardInstanced.renderOrder = 5;

    this.evoShards = [];
    for (let i = 0; i < MAX_EVO_SHARDS; i++) {
      this.evoShards.push({
        active: false,
        kind: 'core',
        pos: new THREE.Vector3(0, -300, 0),
        vel: new THREE.Vector3(),
        originX: 0,
        originY: 0,
        originZ: 0,
        orbitAngle: 0,
        orbitRadius: 1,
        orbitSpeed: 3,
        riseSpeed: 3,
        delay: 0,
        age: 0,
        life: 1.4,
        scale: 1,
        spinX: 6,
        spinY: 8,
        color: new THREE.Color(0xffe066),
      });
      _mat4.makeScale(0, 0, 0);
      this.evoShardInstanced.setMatrixAt(i, _mat4);
      this.evoShardInstanced.setColorAt(i, _color.setHex(0xffe066));
    }
    this.evoShardInstanced.instanceMatrix.needsUpdate = true;
    if (this.evoShardInstanced.instanceColor) {
      this.evoShardInstanced.instanceColor.needsUpdate = true;
    }
    this.evoExplosionGroup.add(this.evoShardInstanced);

    // 2. Radiant Star-Spark Bokeh Cloud (THREE.Points with vertex colors + additive glow)
    this.evoSparkPositions = new Float32Array(MAX_EVO_SPARKS * 3);
    this.evoSparkColors = new Float32Array(MAX_EVO_SPARKS * 3);
    this.evoSparks = [];
    for (let i = 0; i < MAX_EVO_SPARKS; i++) {
      this.evoSparkPositions[i * 3 + 1] = -300;
      this.evoSparkColors[i * 3] = 1;
      this.evoSparkColors[i * 3 + 1] = 0.92;
      this.evoSparkColors[i * 3 + 2] = 0.55;
      this.evoSparks.push({
        active: false,
        pos: new THREE.Vector3(0, -300, 0),
        vel: new THREE.Vector3(),
        delay: 0,
        age: 0,
        life: 1.6,
        baseColor: new THREE.Color(0xffe066),
      });
    }
    const sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(this.evoSparkPositions, 3));
    sparkGeo.setAttribute('color', new THREE.BufferAttribute(this.evoSparkColors, 3));
    this.evoSparkMat = new THREE.PointsMaterial({
      map: this.sparkGlowMap,
      size: 1.55,
      transparent: true,
      opacity: 0.96,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.evoSparkPoints = new THREE.Points(sparkGeo, this.evoSparkMat);
    this.evoSparkPoints.frustumCulled = false;
    this.evoSparkPoints.renderOrder = 6;
    this.evoExplosionGroup.add(this.evoSparkPoints);

    // 3. Three Staggered Expanding Ascension Shockwave Torus Rings
    const ringGeo = new THREE.TorusGeometry(1, 0.085, 10, 48);
    ringGeo.rotateX(Math.PI / 2);
    this.evoRings = [];
    for (let i = 0; i < 3; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: i === 0 ? 0xfff5c0 : 0xffe066,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(ringGeo, mat);
      mesh.visible = false;
      mesh.renderOrder = 5;
      this.evoExplosionGroup.add(mesh);
      this.evoRings.push({
        mesh,
        mat,
        delay: i * 0.14,
        age: 0,
        life: 1.15 + i * 0.22,
        maxRadius: 12 + i * 3.8,
        riseSpeed: 0.65 + i * 0.55,
      });
    }

    // 4. Translucent Ascension Sky Light Pillar
    const pillarGeo = new THREE.CylinderGeometry(0.45, 2.0, 34, 18, 1, true);
    pillarGeo.translate(0, 17, 0);
    this.evoPillarMat = new THREE.MeshBasicMaterial({
      color: 0xffe999,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.evoPillarMesh = new THREE.Mesh(pillarGeo, this.evoPillarMat);
    this.evoPillarMesh.visible = false;
    this.evoPillarMesh.renderOrder = 4;
    this.evoExplosionGroup.add(this.evoPillarMesh);

    // 5. Transient Dynamic Illumination Flash on Surrounding Mountain Terrain & Serpent
    this.evoFlashLight = new THREE.PointLight(0xffe699, 0, 38, 1.5);
    this.evoExplosionGroup.add(this.evoFlashLight);
  }

  /**
   * Triggers a celebratory multi-layered WebGL particle explosion at the snake's location
   * whenever a new Evolution Tier is reached (scaled up for Tier 12 Ascended Human).
   */
  public spawnEvolutionExplosion(
    x: number,
    y: number,
    z: number,
    scaleColorHex: number,
    manaColorHex: number,
    level: number,
    isHuman: boolean,
    bodyTrail?: Array<{ x: number; y: number; z: number }>,
  ): void {
    this.evoActive = true;
    this.evoAge = 0;
    this.evoDuration = isHuman ? 3.8 : 3.0;
    this.evoOrigin.set(x, y, z);
    this.evoExplosionGroup.visible = true;

    const powerScale = isHuman ? 1.45 : 0.92 + (level / 12) * 0.42;
    const palette = [
      0xfff8dc, // incandescent white-gold core
      0xffe066, // radiant ascension gold
      manaColorHex, // newly awakened magic tier color
      scaleColorHex, // newly evolved scale/form hue
    ];

    // Configure 260 faceted shards across 3 choreographed layers:
    // [0..109] Core Radial Supernova, [110..179] Equatorial Crown Ring, [180..259] Ascending Spirit Helix
    for (let i = 0; i < MAX_EVO_SHARDS; i++) {
      const p = this.evoShards[i];
      p.active = true;
      p.age = 0;
      p.spinX = (Math.random() - 0.5) * 14;
      p.spinY = (Math.random() - 0.5) * 14;

      if (i < 110) {
        // Wave 1: Spherical-hemisphere supernova explosion
        p.kind = 'core';
        const trailPt =
          bodyTrail && bodyTrail.length > 0 && i % 4 === 0
            ? bodyTrail[i % bodyTrail.length]
            : null;
        const ox = trailPt ? trailPt.x : x;
        const oy = trailPt ? trailPt.y + 0.7 : y;
        const oz = trailPt ? trailPt.z : z;
        p.pos.set(ox, oy, oz);
        p.originX = ox;
        p.originY = oy;
        p.originZ = oz;

        const theta = Math.random() * Math.PI * 2;
        const elev = -0.15 + Math.random() * 1.45;
        const speed = (6.8 + Math.random() * 11.5) * powerScale;
        const horiz = Math.cos(elev) * speed;
        p.vel.set(
          Math.cos(theta) * horiz,
          Math.sin(elev) * speed + 2.4 * powerScale,
          Math.sin(theta) * horiz,
        );
        p.delay = Math.random() * 0.08;
        p.life = 1.25 + Math.random() * 0.95;
        p.scale = (0.85 + Math.random() * 1.15) * (isHuman ? 1.2 : 1.0);
        p.color.setHex(palette[i % palette.length]);
      } else if (i < 180) {
        // Wave 2: Crisp horizontal equatorial crown burst
        p.kind = 'ring';
        const ringIdx = i - 110;
        const theta = (ringIdx / 70) * Math.PI * 2 + (Math.random() - 0.5) * 0.06;
        const speed = (10.5 + Math.random() * 4.2) * powerScale;
        p.pos.set(x + Math.cos(theta) * 0.5, y + 0.15, z + Math.sin(theta) * 0.5);
        p.originX = x;
        p.originY = y;
        p.originZ = z;
        p.vel.set(Math.cos(theta) * speed, 1.2 + Math.random() * 2.2, Math.sin(theta) * speed);
        p.delay = 0.06 + (ringIdx % 2) * 0.09;
        p.life = 1.1 + Math.random() * 0.55;
        p.scale = (0.9 + Math.random() * 0.65) * (isHuman ? 1.22 : 1.0);
        p.color.setHex(ringIdx % 2 === 0 ? 0xffe066 : manaColorHex);
      } else {
        // Wave 3: Ascending dual-helix spirit embers spiraling skyward around the evolved form
        p.kind = 'helix';
        const hIdx = i - 180;
        p.originX = x;
        p.originY = y - 0.2;
        p.originZ = z;
        p.orbitAngle = (hIdx % 2) * Math.PI + (hIdx / 80) * Math.PI * 4;
        p.orbitRadius = 0.95 + Math.random() * 2.4 * powerScale;
        p.orbitSpeed = (2.6 + Math.random() * 2.2) * (hIdx % 2 === 0 ? 1 : -1);
        p.riseSpeed = (2.8 + Math.random() * 4.4) * powerScale;
        p.delay = 0.05 + Math.random() * 0.55;
        p.life = 1.85 + Math.random() * 1.1;
        p.scale = (0.65 + Math.random() * 0.85) * (isHuman ? 1.25 : 1.0);
        p.pos.set(
          x + Math.cos(p.orbitAngle) * p.orbitRadius,
          p.originY,
          z + Math.sin(p.orbitAngle) * p.orbitRadius,
        );
        p.vel.set(0, 0, 0);
        p.color.setHex(hIdx % 3 === 0 ? 0xfff8dc : hIdx % 3 === 1 ? 0xffe066 : manaColorHex);
      }
    }

    // Configure 220 glowing additive star-spark motes
    this.evoSparkMat.size = isHuman ? 2.0 : 1.55;
    for (let i = 0; i < MAX_EVO_SPARKS; i++) {
      const sp = this.evoSparks[i];
      sp.active = true;
      sp.age = 0;
      sp.delay = Math.random() * 0.24;
      sp.life = 1.45 + Math.random() * 1.35;
      const theta = Math.random() * Math.PI * 2;
      const phi = -0.1 + Math.random() * 1.55;
      const speed = (3.4 + Math.random() * 12.0) * powerScale;
      const h = Math.cos(phi) * speed;
      sp.pos.set(
        x + (Math.random() - 0.5) * 1.4,
        y + (Math.random() - 0.5) * 0.8,
        z + (Math.random() - 0.5) * 1.4,
      );
      sp.vel.set(Math.cos(theta) * h, Math.sin(phi) * speed + 2.8 * powerScale, Math.sin(theta) * h);
      sp.baseColor.setHex(palette[i % palette.length]);
    }

    // Configure 3 staggered expanding ascension rings
    const ringColors = [0xfff6cc, manaColorHex, isHuman ? 0xffe066 : scaleColorHex];
    for (let i = 0; i < this.evoRings.length; i++) {
      const r = this.evoRings[i];
      r.age = 0;
      r.delay = i * 0.14;
      r.life = (1.1 + i * 0.22) * (isHuman ? 1.25 : 1.0);
      r.maxRadius = (11.5 + i * 3.6) * powerScale;
      r.riseSpeed = 0.65 + i * 0.65;
      r.mat.color.setHex(ringColors[i]);
      r.mat.opacity = 0;
      r.mesh.position.set(x, y + 0.15, z);
      r.mesh.scale.setScalar(0.5);
      r.mesh.visible = true;
    }

    // Configure vertical ascension sky beam
    this.evoPillarMat.color.setHex(isHuman ? 0xfff0a8 : manaColorHex);
    this.evoPillarMat.opacity = 0.55;
    this.evoPillarMesh.position.set(x, y - 0.4, z);
    this.evoPillarMesh.scale.set(1, 1, 1);
    this.evoPillarMesh.visible = true;

    // Configure dynamic local flash PointLight
    this.evoFlashLight.position.set(x, y + 2.2, z);
    this.evoFlashLight.color.setHex(isHuman ? 0xffe999 : manaColorHex);
    this.evoFlashPeak = isHuman ? 24 : 15;
    this.evoFlashLight.intensity = this.evoFlashPeak;

    // Also fire a crisp burst of solid sparks right at the origin for layered depth
    this.spawnBurst(x, y + 0.4, z, 0xffe066, isHuman ? 48 : 28);
  }

  private updateEvolutionExplosion(dt: number): void {
    if (!this.evoActive) return;
    this.evoAge += dt;

    let anyAlive = false;

    // 1. Update 260 faceted shards
    for (let i = 0; i < MAX_EVO_SHARDS; i++) {
      const p = this.evoShards[i];
      if (!p.active) continue;

      if (this.evoAge < p.delay) {
        anyAlive = true;
        _mat4.makeScale(0, 0, 0);
        this.evoShardInstanced.setMatrixAt(i, _mat4);
        continue;
      }

      p.age += dt;
      if (p.age >= p.life) {
        p.active = false;
        _mat4.makeScale(0, 0, 0);
        this.evoShardInstanced.setMatrixAt(i, _mat4);
        continue;
      }

      anyAlive = true;
      const u = p.age / p.life;

      if (p.kind === 'helix') {
        const ang = p.orbitAngle + p.age * p.orbitSpeed;
        const rad = p.orbitRadius * (1 + u * 0.95);
        p.pos.set(
          p.originX + Math.cos(ang) * rad,
          p.originY + p.age * p.riseSpeed,
          p.originZ + Math.sin(ang) * rad,
        );
      } else {
        const drag = p.kind === 'ring' ? Math.exp(-2.1 * dt) : Math.exp(-1.35 * dt);
        p.vel.x *= drag;
        p.vel.z *= drag;
        p.vel.y = p.vel.y * Math.exp(-0.9 * dt) - (p.kind === 'ring' ? 3.2 : 6.4) * dt;
        p.pos.addScaledVector(p.vel, dt);
      }

      // Snappy pop-in then silky shrink-out
      const env = u < 0.12 ? u / 0.12 : Math.pow(1 - (u - 0.12) / 0.88, 1.35);
      const s = Math.max(0.001, p.scale * env);
      _euler.set(p.age * p.spinX, p.age * p.spinY, p.age * 3.2);
      _quat.setFromEuler(_euler);
      _scale.setScalar(s);
      _mat4.compose(p.pos, _quat, _scale);
      this.evoShardInstanced.setMatrixAt(i, _mat4);
      this.evoShardInstanced.setColorAt(i, p.color);
    }
    this.evoShardInstanced.instanceMatrix.needsUpdate = true;
    if (this.evoShardInstanced.instanceColor) {
      this.evoShardInstanced.instanceColor.needsUpdate = true;
    }

    // 2. Update 220 glowing star-spark bokeh motes
    const sparkPosAttr = this.evoSparkPoints.geometry.attributes.position as THREE.BufferAttribute;
    const sparkColAttr = this.evoSparkPoints.geometry.attributes.color as THREE.BufferAttribute;
    for (let i = 0; i < MAX_EVO_SPARKS; i++) {
      const sp = this.evoSparks[i];
      const idx = i * 3;
      if (!sp.active || this.evoAge < sp.delay) {
        if (sp.active) anyAlive = true;
        this.evoSparkPositions[idx] = 0;
        this.evoSparkPositions[idx + 1] = -300;
        this.evoSparkPositions[idx + 2] = 0;
        continue;
      }
      sp.age += dt;
      if (sp.age >= sp.life) {
        sp.active = false;
        this.evoSparkPositions[idx + 1] = -300;
        continue;
      }
      anyAlive = true;
      const drag = Math.exp(-1.7 * dt);
      sp.vel.x *= drag;
      sp.vel.z *= drag;
      sp.vel.y = sp.vel.y * Math.exp(-1.1 * dt) - 2.1 * dt;
      sp.pos.addScaledVector(sp.vel, dt);

      const u = sp.age / sp.life;
      const shimmer = 0.72 + 0.28 * Math.sin(sp.age * 24 + i * 1.7);
      const brightness = Math.pow(1 - u, 1.4) * shimmer;

      this.evoSparkPositions[idx] = sp.pos.x;
      this.evoSparkPositions[idx + 1] = sp.pos.y;
      this.evoSparkPositions[idx + 2] = sp.pos.z;
      this.evoSparkColors[idx] = sp.baseColor.r * brightness;
      this.evoSparkColors[idx + 1] = sp.baseColor.g * brightness;
      this.evoSparkColors[idx + 2] = sp.baseColor.b * brightness;
    }
    sparkPosAttr.needsUpdate = true;
    sparkColAttr.needsUpdate = true;

    // 3. Update 3 staggered expanding shockwave torus rings
    for (let i = 0; i < this.evoRings.length; i++) {
      const r = this.evoRings[i];
      if (this.evoAge < r.delay) {
        r.mesh.visible = false;
        anyAlive = true;
        continue;
      }
      r.age += dt;
      if (r.age >= r.life) {
        r.mesh.visible = false;
        continue;
      }
      anyAlive = true;
      r.mesh.visible = true;
      const u = r.age / r.life;
      const easeOut = 1 - Math.pow(1 - u, 2.4);
      const radius = 0.55 + (r.maxRadius - 0.55) * easeOut;
      r.mesh.position.set(this.evoOrigin.x, this.evoOrigin.y + 0.15 + r.age * r.riseSpeed, this.evoOrigin.z);
      r.mesh.scale.set(radius, 1 + (1 - u) * 0.6, radius);
      r.mat.opacity = Math.pow(1 - u, 1.6) * 0.92;
    }

    // 4. Update Ascension Sky Light Pillar
    const pillarLife = 1.45;
    if (this.evoAge < pillarLife) {
      anyAlive = true;
      const pu = this.evoAge / pillarLife;
      const widthPulse = pu < 0.18 ? 0.4 + (pu / 0.18) * 1.35 : 1.75 * (1 - (pu - 0.18) / 0.82);
      this.evoPillarMesh.visible = true;
      this.evoPillarMesh.scale.set(Math.max(0.05, widthPulse), 1 + pu * 0.35, Math.max(0.05, widthPulse));
      this.evoPillarMesh.rotation.y += dt * 1.8;
      this.evoPillarMat.opacity = Math.pow(1 - pu, 1.45) * 0.52;
    } else {
      this.evoPillarMesh.visible = false;
    }

    // 5. Update Dynamic Local PointLight Flash
    const flashLife = 1.15;
    if (this.evoAge < flashLife) {
      anyAlive = true;
      const fu = this.evoAge / flashLife;
      this.evoFlashLight.intensity = this.evoFlashPeak * Math.pow(1 - fu, 2.1);
    } else {
      this.evoFlashLight.intensity = 0;
    }

    if (!anyAlive || this.evoAge >= this.evoDuration) {
      this.evoActive = false;
      this.evoExplosionGroup.visible = false;
      this.evoFlashLight.intensity = 0;
    }
  }

  public triggerShake(amount: number): void {
    this.shakeIntensity = Math.min(1.4, Math.max(this.shakeIntensity, amount));
  }

  private initWeatherSystem(): void {
    // 1. Drifting Mountain Mist & Dense Fog Billows (soft translucent sprites hugging terrain)
    const mistCount = this.isSoftwareGl ? 84 : 168;
    this.mistPositions = new Float32Array(mistCount * 3);
    this.mistParticles = [];

    for (let i = 0; i < mistCount; i++) {
      const ang = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * 64;
      const x = Math.cos(ang) * r;
      const z = Math.sin(ang) * r;
      const yOffset = 1.6 + Math.random() * 8.5;
      this.mistParticles.push({
        x,
        z,
        yOffset,
        driftX: 1.0 + Math.random() * 1.4,
        driftZ: (Math.random() - 0.5) * 0.9,
        phase: Math.random() * Math.PI * 2,
      });
      this.mistPositions[i * 3] = x;
      this.mistPositions[i * 3 + 1] = terrainHeightAt(x, z, this.biome) + yOffset;
      this.mistPositions[i * 3 + 2] = z;
    }

    const mistGeo = new THREE.BufferGeometry();
    mistGeo.setAttribute('position', new THREE.BufferAttribute(this.mistPositions, 3));
    this.mistMat = new THREE.PointsMaterial({
      map: this.mistTexture,
      color: 0xdcebf7,
      size: 17,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.mistPoints = new THREE.Points(mistGeo, this.mistMat);
    this.mistPoints.frustumCulled = false;
    this.mistPoints.renderOrder = 2;
    this.weatherGroup.add(this.mistPoints);

    // 2. Slanted Wind-Blown Mountain Rain Streaks
    const rainCount = this.isSoftwareGl ? 220 : 520;
    this.rainPositions = new Float32Array(rainCount * 6); // 2 vertices per streak
    this.rainDrops = [];
    for (let i = 0; i < rainCount; i++) {
      const rx = (Math.random() - 0.5) * 58;
      const ry = Math.random() * 32;
      const rz = (Math.random() - 0.5) * 58;
      this.rainDrops.push({
        x: rx,
        y: ry,
        z: rz,
        speed: 25 + Math.random() * 11,
        len: 1.05 + Math.random() * 0.65,
      });
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));
    this.rainMat = new THREE.LineBasicMaterial({
      color: 0xd4ecff,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    });
    this.rainLines = new THREE.LineSegments(rainGeo, this.rainMat);
    this.rainLines.frustumCulled = false;
    this.rainLines.visible = false;
    this.rainLines.renderOrder = 3;
    this.weatherGroup.add(this.rainLines);

    // 3. Pooled Terrain-Aligned Rain Splash Rings
    const splashCount = this.isSoftwareGl ? 24 : 48;
    const splashGeo = new THREE.RingGeometry(0.14, 0.26, 12);
    splashGeo.rotateX(-Math.PI / 2);
    this.splashMat = new THREE.MeshBasicMaterial({
      color: 0xd9f0ff,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.splashInstanced = new THREE.InstancedMesh(splashGeo, this.splashMat, splashCount);
    this.splashInstanced.frustumCulled = false;
    this.splashInstanced.visible = false;
    this.splashInstanced.renderOrder = 3;

    this.rainSplashes = [];
    for (let i = 0; i < splashCount; i++) {
      this.rainSplashes.push({
        active: false,
        x: 0,
        y: -200,
        z: 0,
        nx: 0,
        ny: 1,
        nz: 0,
        age: 0,
        life: 0.28,
        maxScale: 1.1,
      });
      _mat4.makeScale(0, 0, 0);
      this.splashInstanced.setMatrixAt(i, _mat4);
    }
    this.splashInstanced.instanceMatrix.needsUpdate = true;
    this.weatherGroup.add(this.splashInstanced);
  }

  public setWeather(weather: WeatherMode): void {
    if (this.weather === weather) return;
    this.weather = weather;
    if (weather === 'rain') {
      // Begin near an active light shower peak so rain is immediately visible on toggle,
      // then naturally ebb and swell between gentle drizzle lulls and steady light showers
      this.rainCyclePhase = Math.PI * 0.42;
    }
  }

  public getWeather(): WeatherMode {
    return this.weather;
  }

  public getLiveRainIntensity(): number {
    return this.liveRainIntensity;
  }

  private applyWeatherImmediate(): void {
    const preset = WEATHER_PRESETS[this.biome][this.weather];
    if (!this.xrActive) {
      if (this.scene.background instanceof THREE.Color) {
        this.scene.background.setHex(preset.skyHex);
      } else {
        this.scene.background = new THREE.Color(preset.skyHex);
      }
    }
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.setHex(preset.fogHex);
      this.scene.fog.density = preset.fogDensity;
    } else {
      this.scene.fog = new THREE.FogExp2(preset.fogHex, preset.fogDensity);
    }
    this.mistMat.opacity = preset.mistOpacity;
    this.mistMat.size = preset.mistSize;
    this.mistMat.color.setHex(preset.mistTint);
    this.mistPoints.visible = preset.mistOpacity > 0.01;
    this.renderer.toneMappingExposure = preset.exposure;
    this.applyWeatherLightIntensities(preset.sunScale, preset.hemiScale, preset.rimScale);
  }

  private applyWeatherLightIntensities(sunScale: number, hemiScale: number, rimScale: number): void {
    const sunVal = this.baseSunIntensity * sunScale;
    if (this.csm) {
      this.csm.lightIntensity = sunVal;
      for (const light of this.csm.lights) {
        light.intensity = sunVal;
      }
    } else if (this.fallbackSunLight) {
      this.fallbackSunLight.intensity = sunVal;
    }
    this.hemiLight.intensity = this.baseHemiIntensity * hemiScale;
    this.rimLight.intensity = this.baseRimIntensity * rimScale;
  }

  private updateWeather(dt: number, focusX: number, focusY: number, focusZ: number): void {
    const preset = WEATHER_PRESETS[this.biome][this.weather];
    const lvlEnv = getLevelEnvironment(this.activeEvolutionLevel);
    const wBlend = lvlEnv.blendWeight;
    const dampT = 1 - Math.exp(-2.2 * dt);
    const t = this.elapsed;

    // 1. Smoothly blend Weather Preset + Cultivation Level Environment (sky, fog, sun, hemi, rim, motes)
    if (!this.xrActive) {
      if (!(this.scene.background instanceof THREE.Color)) {
        this.scene.background = new THREE.Color(preset.skyHex);
      }
      _targetSkyColor.setHex(preset.skyHex).lerp(_levelTintColor.setHex(lvlEnv.skyHex), wBlend);
      this.scene.background.lerp(_targetSkyColor, dampT);
    }

    if (this.scene.fog instanceof THREE.FogExp2) {
      _targetFogColor.setHex(preset.fogHex).lerp(_levelTintColor.setHex(lvlEnv.fogHex), wBlend);
      this.scene.fog.color.lerp(_targetFogColor, dampT);
      const targetDensity = preset.fogDensity + lvlEnv.fogDensityBoost;
      this.scene.fog.density = THREE.MathUtils.damp(this.scene.fog.density, targetDensity, 2.2, dt);
    }

    this.renderer.toneMappingExposure = THREE.MathUtils.damp(
      this.renderer.toneMappingExposure,
      preset.exposure,
      2.4,
      dt,
    );

    const curSun = this.csm
      ? this.csm.lightIntensity
      : (this.fallbackSunLight?.intensity ?? this.baseSunIntensity);
    const nextSun = THREE.MathUtils.damp(curSun, this.baseSunIntensity * preset.sunScale, 2.4, dt);
    _targetSunColor.setHex(0xffffff).lerp(_levelTintColor.setHex(lvlEnv.sunHex), Math.min(0.85, wBlend + 0.15));
    if (this.csm) {
      this.csm.lightIntensity = nextSun;
      for (const light of this.csm.lights) {
        light.intensity = nextSun;
        light.color.lerp(_targetSunColor, dampT);
      }
    } else if (this.fallbackSunLight) {
      this.fallbackSunLight.intensity = nextSun;
      this.fallbackSunLight.color.lerp(_targetSunColor, dampT);
    }

    this.hemiLight.intensity = THREE.MathUtils.damp(
      this.hemiLight.intensity,
      this.baseHemiIntensity * preset.hemiScale,
      2.4,
      dt,
    );
    _targetHemiSkyColor.setHex(lvlEnv.hemiSkyHex);
    _targetHemiGroundColor.setHex(lvlEnv.hemiGroundHex);
    this.hemiLight.color.lerp(_targetHemiSkyColor, dampT);
    this.hemiLight.groundColor.lerp(_targetHemiGroundColor, dampT);

    this.rimLight.intensity = THREE.MathUtils.damp(
      this.rimLight.intensity,
      this.baseRimIntensity * (preset.rimScale + (this.activeEvolutionLevel >= 5 ? 0.35 : 0)),
      2.4,
      dt,
    );
    _targetRimColor.setHex(lvlEnv.rimHex);
    this.rimLight.color.lerp(_targetRimColor, dampT);

    if (this.ambientMotes) {
      const moteMat = this.ambientMotes.material as THREE.PointsMaterial;
      _levelTintColor.setHex(lvlEnv.moteHex);
      moteMat.color.lerp(_levelTintColor, dampT);
    }

    // 2. Drifting 3D Valley Mist & Dense Fog Puffs
    const envMistBoost = this.activeEvolutionLevel >= 5 ? 0.08 : 0;
    this.mistMat.opacity = THREE.MathUtils.damp(
      this.mistMat.opacity,
      Math.min(0.62, preset.mistOpacity + envMistBoost),
      2.6,
      dt,
    );
    this.mistMat.size = THREE.MathUtils.damp(this.mistMat.size, preset.mistSize, 2.6, dt);
    _targetMistColor.setHex(preset.mistTint).lerp(_levelTintColor.setHex(lvlEnv.fogHex), wBlend * 0.72);
    this.mistMat.color.lerp(_targetMistColor, 1 - Math.exp(-2.6 * dt));

    const mistVisible = this.mistMat.opacity > 0.008;
    this.mistPoints.visible = mistVisible;
    if (mistVisible) {
      const mistRadius = 64;
      const windSpeedMul = this.weather === 'rain' ? 1.55 : this.weather === 'fog' ? 0.72 : 1.0;
      const posAttr = this.mistPoints.geometry.attributes.position as THREE.BufferAttribute;

      for (let i = 0; i < this.mistParticles.length; i++) {
        const p = this.mistParticles[i];
        p.x += p.driftX * windSpeedMul * dt;
        p.z += (p.driftZ + Math.sin(t * 0.25 + p.phase) * 0.45) * windSpeedMul * dt;

        // Wrap puffs inside a moving volume around the active focal point
        let dx = p.x - focusX;
        let dz = p.z - focusZ;
        if (dx > mistRadius) p.x -= mistRadius * 2;
        else if (dx < -mistRadius) p.x += mistRadius * 2;
        if (dz > mistRadius) p.z -= mistRadius * 2;
        else if (dz < -mistRadius) p.z += mistRadius * 2;

        dx = p.x - focusX;
        dz = p.z - focusZ;
        if (dx * dx + dz * dz > mistRadius * mistRadius * 1.2) {
          const ang = Math.random() * Math.PI * 2;
          const rad = (0.35 + Math.random() * 0.65) * mistRadius;
          p.x = focusX + Math.cos(ang) * rad;
          p.z = focusZ + Math.sin(ang) * rad;
        }

        const groundY = terrainHeightAt(p.x, p.z, this.biome);
        const bob = Math.sin(t * 0.42 + p.phase) * 0.75;
        this.mistPositions[i * 3] = p.x;
        this.mistPositions[i * 3 + 1] = groundY + p.yOffset + bob;
        this.mistPositions[i * 3 + 2] = p.z;
      }
      posAttr.needsUpdate = true;
    }

    // 3. Occasional Light Rain Oscillator, Slanted Rain Streaks & Ground Splashes
    let targetRain = 0;
    if (this.weather === 'rain') {
      this.rainCyclePhase += dt * 0.26;
      const showerWave =
        0.62 +
        0.3 * Math.sin(this.rainCyclePhase) +
        0.1 * Math.sin(this.rainCyclePhase * 2.3 + 0.7);
      targetRain = THREE.MathUtils.clamp(showerWave, 0.26, 0.96);
    }
    this.liveRainIntensity = THREE.MathUtils.damp(this.liveRainIntensity, targetRain, 2.2, dt);

    const rainActive = this.liveRainIntensity > 0.02;
    this.rainLines.visible = rainActive;
    if (rainActive) {
      this.rainMat.opacity = 0.16 + this.liveRainIntensity * 0.42;
      const halfSpan = 28;
      const boxHeight = 30;
      const windX = -3.4;
      const windZ = -1.2;
      const activeCount = Math.floor(this.rainDrops.length * (0.25 + this.liveRainIntensity * 0.75));
      const rainAttr = this.rainLines.geometry.attributes.position as THREE.BufferAttribute;

      for (let i = 0; i < this.rainDrops.length; i++) {
        const d = this.rainDrops[i];
        const base = i * 6;

        if (i >= activeCount) {
          this.rainPositions[base] = 0;
          this.rainPositions[base + 1] = -300;
          this.rainPositions[base + 2] = 0;
          this.rainPositions[base + 3] = 0;
          this.rainPositions[base + 4] = -300;
          this.rainPositions[base + 5] = 0;
          continue;
        }

        d.x += windX * dt;
        d.y -= d.speed * dt;
        d.z += windZ * dt;

        // Wrap horizontally around focal point
        if (d.x - focusX > halfSpan) d.x -= halfSpan * 2;
        else if (d.x - focusX < -halfSpan) d.x += halfSpan * 2;
        if (d.z - focusZ > halfSpan) d.z -= halfSpan * 2;
        else if (d.z - focusZ < -halfSpan) d.z += halfSpan * 2;

        const groundY = Math.max(WATER_LEVEL, terrainHeightAt(d.x, d.z, this.biome));
        if (d.y < groundY) {
          // Spawn a subtle ground splash ring if drop hits near the player/camera
          const distSq = (d.x - focusX) * (d.x - focusX) + (d.z - focusZ) * (d.z - focusZ);
          if (distSq < 26 * 26 && Math.random() < 0.22 * this.liveRainIntensity) {
            this.spawnRainSplash(d.x, groundY, d.z);
          }
          d.x = focusX + (Math.random() - 0.5) * halfSpan * 2;
          d.z = focusZ + (Math.random() - 0.5) * halfSpan * 2;
          const spawnGround = Math.max(WATER_LEVEL, terrainHeightAt(d.x, d.z, this.biome));
          d.y = Math.max(focusY + 14, spawnGround + 16) + Math.random() * boxHeight * 0.5;
        }

        const slantScale = d.len / d.speed;
        this.rainPositions[base] = d.x;
        this.rainPositions[base + 1] = d.y;
        this.rainPositions[base + 2] = d.z;
        this.rainPositions[base + 3] = d.x - windX * slantScale;
        this.rainPositions[base + 4] = d.y + d.len;
        this.rainPositions[base + 5] = d.z - windZ * slantScale;
      }
      rainAttr.needsUpdate = true;
    }

    // 4. Update Expanding Ground Rain Splash Rings
    let anySplash = false;
    for (let i = 0; i < this.rainSplashes.length; i++) {
      const sp = this.rainSplashes[i];
      if (!sp.active) continue;
      sp.age += dt;
      if (sp.age >= sp.life) {
        sp.active = false;
        _mat4.makeScale(0, 0, 0);
        this.splashInstanced.setMatrixAt(i, _mat4);
        continue;
      }
      anySplash = true;
      const u = sp.age / sp.life;
      // Quick outward ring expansion then soft shrink-out
      const ringScale = u < 0.72 ? (0.25 + (u / 0.72) * 0.95) * sp.maxScale : (1 - (u - 0.72) / 0.28) * 1.2 * sp.maxScale;
      _up.set(sp.nx, sp.ny, sp.nz);
      _quat.setFromUnitVectors(_yAxis, _up);
      _scale.set(Math.max(0.001, ringScale), 1, Math.max(0.001, ringScale));
      _mat4.compose(_vec3A.set(sp.x, sp.y + 0.06, sp.z), _quat, _scale);
      this.splashInstanced.setMatrixAt(i, _mat4);
    }
    this.splashInstanced.visible = anySplash;
    if (anySplash) {
      this.splashMat.opacity = 0.22 + this.liveRainIntensity * 0.34;
      this.splashInstanced.instanceMatrix.needsUpdate = true;
    }
  }

  private spawnRainSplash(x: number, groundY: number, z: number): void {
    const sp = this.rainSplashes[this.splashCursor];
    this.splashCursor = (this.splashCursor + 1) % this.rainSplashes.length;
    sp.active = true;
    sp.x = x;
    sp.y = groundY;
    sp.z = z;
    if (groundY <= WATER_LEVEL + 0.05) {
      sp.nx = 0;
      sp.ny = 1;
      sp.nz = 0;
    } else {
      terrainNormalAt(x, z, this.biome, this.weatherNormalScratch);
      sp.nx = this.weatherNormalScratch.x;
      sp.ny = this.weatherNormalScratch.y;
      sp.nz = this.weatherNormalScratch.z;
    }
    sp.age = 0;
    sp.life = 0.24 + Math.random() * 0.14;
    sp.maxScale = 0.85 + Math.random() * 0.75;
  }

  public setBiome(biome: BiomeId): void {
    this.biome = biome;
    const isJungle = biome === 'jungle';

    const sunColor = isJungle ? 0xffebc2 : 0xffe8cf;
    this.baseSunIntensity = isJungle ? 2.4 : 2.55;
    this.baseHemiIntensity = isJungle ? 0.88 : 0.9;
    this.baseRimIntensity = 0.58;

    if (this.csm) {
      this.csm.lightDirection
        .set(isJungle ? -0.54 : -0.62, isJungle ? -0.76 : -0.68, isJungle ? -0.36 : -0.39)
        .normalize();
      for (const light of this.csm.lights) {
        light.color.setHex(sunColor);
      }
    } else if (this.fallbackSunLight) {
      this.fallbackSunLight.color.setHex(sunColor);
    }

    if (isJungle) {
      this.hemiLight.color.setHex(0x88e5d0);
      this.hemiLight.groundColor.setHex(0x1f3822);
      this.rimLight.color.setHex(0x52d6a6);
    } else {
      this.hemiLight.color.setHex(0xa8d8ff);
      this.hemiLight.groundColor.setHex(0x283645);
      this.rimLight.color.setHex(0x8cc8ff);
    }

    this.applyWeatherImmediate();
    this.rebuildMountainWorld();
    this.initCollectiblePool();
    this.initRollingBoulderPool();
    this.initBeastPools();
    this.rebuildLandmarks();
  }

  private rebuildLandmarks(): void {
    this.disposeGroupWithCsm(this.landmarksGroup);
    this.landmarkVisuals = [];

    const res = this.getModelResources();
    for (const lm of WORLD_LANDMARKS) {
      const y = terrainHeightAt(lm.x, lm.z, this.biome);
      const shrine = createLandmarkShrine(res, lm.accentHex);
      shrine.group.position.set(lm.x, y - 0.15, lm.z);
      // Orient summit gateway facing center of valley
      shrine.group.rotation.y = Math.atan2(-lm.x, -lm.z);
      this.landmarksGroup.add(shrine.group);
      this.landmarkVisuals.push({
        id: lm.id,
        ...shrine,
      });
    }
    this.registerCsmMaterials(this.landmarksGroup);
  }

  private rebuildMountainWorld(): void {
    this.disposeGroupWithCsm(this.envGroup);
    this.terrainMesh = null;
    this.waterMeshes = [];
    this.ambientMotes = null;
    this.naturalObstacles = [];

    const isJungle = this.biome === 'jungle';

    // 1. Colossal Explorable 3D Mountain Continent (680 x 680 units, 220 x 220 resolution)
    const terrainSize = 680;
    const terrainSegs = this.isSoftwareGl ? 124 : 220;
    const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegs, terrainSegs);
    terrainGeo.rotateX(-Math.PI / 2);

    const pos = terrainGeo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const nScratch = { x: 0, y: 1, z: 0 };

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = terrainHeightAt(x, z, this.biome);
      pos.setY(i, y);

      terrainNormalAt(x, z, this.biome, nScratch);
      const steepness = 1 - nScratch.y;

      if (isJungle) {
        if (y < WATER_LEVEL + 0.7) {
          _color.setHex(0x2d4a3a); // lagoon shore
        } else if (steepness > 0.25) {
          _color.setHex(0x4c584e); // mossy granite cliff rock
        } else if (y < 11) {
          _color.setHex(0x2a6b3b); // lush valley grass
        } else if (y < 24) {
          _color.setHex(0x3a8243); // highland foliage slopes
        } else if (y < 38) {
          _color.setHex(0x638853); // misty cloud forest
        } else {
          _color.setHex(0xc8dcc4); // sunlit celestial mist summit
        }
      } else {
        if (y < WATER_LEVEL + 0.7) {
          _color.setHex(0x384d5e); // glacial lake pebbles
        } else if (steepness > 0.24 && y < 34) {
          _color.setHex(0x5b6a78); // exposed alpine granite cliffs
        } else if (y < 9.5) {
          _color.setHex(0x3a6448); // alpine meadow & pine valley floor
        } else if (y < 18.5) {
          _color.setHex(0x556e5c); // rocky sub-alpine ridge
        } else if (y < 28.0) {
          _color.setHex(0x7d8c9a); // high mountain scree
        } else {
          _color.setHex(0xeef6ff); // gleaming snow-capped colossal peaks
        }
      }
      colors[i * 3] = _color.r;
      colors[i * 3 + 1] = _color.g;
      colors[i * 3 + 2] = _color.b;
    }

    terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    terrainGeo.computeVertexNormals();

    const terrainTex = createTerrainTexture(this.biome, this.maxAnisotropy);
    terrainTex.repeat.set(64, 64);
    const terrainMat = new THREE.MeshStandardMaterial({
      map: terrainTex,
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.02,
      flatShading: false,
    });

    this.terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    this.terrainMesh.castShadow = !this.isSoftwareGl;
    this.terrainMesh.receiveShadow = true;
    this.envGroup.add(this.terrainMesh);

    // 2. Alpine Glacial Lakes / Emerald Lagoons nestled in continental basins
    const waterMat = new THREE.MeshStandardMaterial({
      color: isJungle ? 0x16948c : 0x3b8ec4,
      emissive: isJungle ? 0x063d3b : 0x0d3254,
      emissiveIntensity: 0.35,
      roughness: 0.12,
      metalness: 0.35,
      transparent: true,
      opacity: 0.85,
    });
    for (const lake of WORLD_LAKES) {
      const waterGeo = new THREE.CircleGeometry(lake.radius * 1.45, 36);
      waterGeo.rotateX(-Math.PI / 2);
      const wm = new THREE.Mesh(waterGeo, waterMat);
      wm.position.set(lake.x, WATER_LEVEL, lake.z);
      wm.receiveShadow = true;
      this.envGroup.add(wm);
      this.waterMeshes.push(wm);
    }

    // 3. Instanced Continental Mountain Forest (~740 towering pines/jungle trees across the 480-unit world!)
    let seed = isJungle ? 4219 : 7331;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    const treePlacements: Array<{ x: number; y: number; z: number; s: number; rot: number; tint: number }> = [];
    const targetTrees = this.isSoftwareGl ? 360 : 740;

    let attempts = 0;
    while (treePlacements.length < targetTrees && attempts < 12000) {
      attempts++;
      const angle = rand() * Math.PI * 2;
      const dist = 14 + Math.sqrt(rand()) * (WORLD_PLAY_RADIUS + 26);
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      // Keep spawn meadow and initial northern sightline open
      if (isNearSpawn(x, z, 13.5)) continue;
      if (Math.abs(x) < 6.5 && z < 0 && z > -28) continue;
      if (isDeepWater(x, z, this.biome)) continue;

      // Keep all 12 Peak Shrines clear
      if (WORLD_LANDMARKS.some((lm) => Math.hypot(x - lm.x, z - lm.z) < lm.radius + 2.2)) continue;

      const y = terrainHeightAt(x, z, this.biome);
      if (y < WATER_LEVEL + 1.2) continue;
      if (!isJungle && y > 27.5) continue; // Alpine treeline stops below high glacial peaks!
      if (isJungle && y > 39.0) continue;

      terrainNormalAt(x, z, this.biome, nScratch);
      if (nScratch.y < 0.8) continue;

      if (treePlacements.some((tp) => Math.hypot(tp.x - x, tp.z - z) < 5.0)) continue;

      const s = 1.7 + rand() * 2.2;
      treePlacements.push({ x, y, z, s, rot: rand() * Math.PI * 2, tint: 0.88 + rand() * 0.24 });

      if (dist <= WORLD_PLAY_RADIUS + 3) {
        this.naturalObstacles.push({
          x,
          z,
          radius: 0.44 * s,
          kind: 'tree',
        });
      }
    }

    const trunkGeo = isJungle
      ? new THREE.CylinderGeometry(0.18, 0.34, 3.2, 7)
      : new THREE.CylinderGeometry(0.15, 0.3, 2.4, 7);
    trunkGeo.translate(0, isJungle ? 1.5 : 1.1, 0);

    const canopyLowGeo = isJungle
      ? new THREE.DodecahedronGeometry(1.5, 1)
      : new THREE.ConeGeometry(1.45, 3.2, 7);
    canopyLowGeo.translate(0, isJungle ? 3.2 : 3.0, 0);

    const canopyHighGeo = isJungle
      ? new THREE.DodecahedronGeometry(1.08, 1)
      : new THREE.ConeGeometry(1.0, 2.5, 7);
    canopyHighGeo.translate(0, isJungle ? 4.35 : 4.75, 0);

    const trunkMat = new THREE.MeshStandardMaterial({
      color: isJungle ? 0x563924 : 0x4b382a,
      roughness: 0.92,
      metalness: 0.02,
    });
    const canopyLowMat = new THREE.MeshStandardMaterial({
      color: isJungle ? 0x25783c : 0x1f5446,
      roughness: 0.78,
      metalness: 0.02,
      flatShading: true,
    });
    const canopyHighMat = new THREE.MeshStandardMaterial({
      color: isJungle ? 0x47a84d : 0xddeeff,
      roughness: isJungle ? 0.72 : 0.45,
      metalness: 0.02,
      flatShading: true,
    });

    const tCount = treePlacements.length;
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, tCount);
    const canopiesLow = new THREE.InstancedMesh(canopyLowGeo, canopyLowMat, tCount);
    const canopiesHigh = new THREE.InstancedMesh(canopyHighGeo, canopyHighMat, tCount);

    for (let i = 0; i < tCount; i++) {
      const p = treePlacements[i];
      _euler.set(0, p.rot, 0);
      _quat.setFromEuler(_euler);
      _scale.set(p.s, p.s * (0.92 + (i % 5) * 0.05), p.s);
      _mat4.compose(_vec3A.set(p.x, p.y - 0.35, p.z), _quat, _scale);
      trunks.setMatrixAt(i, _mat4);
      canopiesLow.setMatrixAt(i, _mat4);
      canopiesHigh.setMatrixAt(i, _mat4);
      _color.setRGB(p.tint, p.tint, p.tint);
      canopiesLow.setColorAt(i, _color);
    }
    trunks.instanceMatrix.needsUpdate = true;
    canopiesLow.instanceMatrix.needsUpdate = true;
    canopiesHigh.instanceMatrix.needsUpdate = true;
    if (canopiesLow.instanceColor) canopiesLow.instanceColor.needsUpdate = true;

    trunks.computeBoundingSphere();
    canopiesLow.computeBoundingSphere();
    canopiesHigh.computeBoundingSphere();

    if (!this.isSoftwareGl) {
      trunks.castShadow = true;
      trunks.receiveShadow = true;
      canopiesLow.castShadow = true;
      canopiesLow.receiveShadow = true;
      canopiesHigh.castShadow = true;
      canopiesHigh.receiveShadow = true;
    }
    this.envGroup.add(trunks, canopiesLow, canopiesHigh);

    // 4. Instanced Natural Continental Boulders & Crags (~310 collidable rock hazards!)
    const rockCount = this.isSoftwareGl ? 170 : 310;
    const rockPlacements: Array<{ x: number; y: number; z: number; sx: number; sy: number; sz: number; rot: number; tint: number }> = [];
    let rAttempts = 0;
    while (rockPlacements.length < rockCount && rAttempts < 6000) {
      rAttempts++;
      const angle = rand() * Math.PI * 2;
      const dist = 16 + Math.sqrt(rand()) * (WORLD_PLAY_RADIUS + 18);
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      if (isNearSpawn(x, z, 14)) continue;
      if (Math.abs(x) < 6 && z < 0 && z > -26) continue;
      if (isDeepWater(x, z, this.biome)) continue;
      if (WORLD_LANDMARKS.some((lm) => Math.hypot(x - lm.x, z - lm.z) < lm.radius + 2.0)) continue;
      if (rockPlacements.some((rp) => Math.hypot(rp.x - x, rp.z - z) < 5.5)) continue;

      const y = terrainHeightAt(x, z, this.biome);
      const sx = 1.3 + rand() * 2.2;
      const sy = 1.2 + rand() * 2.8;
      const sz = 1.3 + rand() * 2.2;
      rockPlacements.push({ x, y, z, sx, sy, sz, rot: rand() * Math.PI * 2, tint: 0.85 + rand() * 0.28 });

      if (dist <= WORLD_PLAY_RADIUS + 2) {
        this.naturalObstacles.push({
          x,
          z,
          radius: Math.max(sx, sz) * 0.72,
          kind: 'rock',
        });
      }
    }

    const rockGeo = new THREE.DodecahedronGeometry(1.0, 0);
    const rockMat = new THREE.MeshStandardMaterial({
      color: isJungle ? 0x536358 : 0x67788a,
      roughness: 0.88,
      metalness: 0.05,
      flatShading: true,
    });
    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, rockPlacements.length);
    for (let i = 0; i < rockPlacements.length; i++) {
      const r = rockPlacements[i];
      _euler.set(rand() * 0.35, r.rot, rand() * 0.35);
      _quat.setFromEuler(_euler);
      _scale.set(r.sx, r.sy, r.sz);
      _mat4.compose(_vec3A.set(r.x, r.y + r.sy * 0.35, r.z), _quat, _scale);
      rocks.setMatrixAt(i, _mat4);
      _color.setRGB(r.tint, r.tint, r.tint);
      rocks.setColorAt(i, _color);
    }
    rocks.instanceMatrix.needsUpdate = true;
    if (rocks.instanceColor) rocks.instanceColor.needsUpdate = true;
    rocks.computeBoundingSphere();
    rocks.receiveShadow = true;
    if (!this.isSoftwareGl) rocks.castShadow = true;
    this.envGroup.add(rocks);

    // 5. Atmospheric Mountain Snowdrifts / Jungle Fireflies (wrapping smoothly around the player)
    const moteCount = 320;
    const motePositions = new Float32Array(moteCount * 3);
    for (let i = 0; i < moteCount; i++) {
      const mx = (rand() - 0.5) * 140;
      const mz = (rand() - 0.5) * 140;
      const my = terrainHeightAt(mx, mz, this.biome) + 2 + rand() * 26;
      motePositions[i * 3] = mx;
      motePositions[i * 3 + 1] = my;
      motePositions[i * 3 + 2] = mz;
    }
    const moteGeo = new THREE.BufferGeometry();
    moteGeo.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));
    const moteMat = new THREE.PointsMaterial({
      color: isJungle ? 0xe6ff7a : 0xeef8ff,
      size: isJungle ? 0.36 : 0.28,
      transparent: true,
      opacity: isJungle ? 0.82 : 0.65,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.ambientMotePositions = motePositions;
    this.ambientMotes = new THREE.Points(moteGeo, moteMat);
    this.ambientMotes.frustumCulled = false;
    this.envGroup.add(this.ambientMotes);

    // Register terrain, water, instanced trees, and instanced boulders with CSM
    this.registerCsmMaterials(this.envGroup);
  }

  /**
   * Rebuilds all player-placed or preset mountain course props flush onto the 3D mountain terrain.
   */
  public syncFormation(formation: FormationData): void {
    this.disposeGroupWithCsm(this.propsGroup);
    this.animatedTotems = [];
    this.animatedPortals = [];
    this.animatedBoosts = [];

    const res = this.getModelResources();
    const nScratch = { x: 0, y: 1, z: 0 };

    for (const prop of formation.props) {
      let block: THREE.Group | null = null;
      const y = terrainHeightAt(prop.x, prop.z, this.biome);
      terrainNormalAt(prop.x, prop.z, this.biome, nScratch);

      if (prop.type === 'wall') {
        block = createWallBlock(res);
        block.scale.setScalar(1.95);
        block.rotation.y = ((Math.abs(prop.x * 7 + prop.z * 13) % 4) * Math.PI) / 2;
      } else if (prop.type === 'totem') {
        block = createTotemBlock(res);
        block.scale.setScalar(1.75);
        const core = block.getObjectByName('totemCore');
        const ring = block.getObjectByName('totemRing');
        if (core && ring) {
          this.animatedTotems.push({ core, ring, baseY: 2.75 });
        }
      } else if (prop.type === 'portalA' || prop.type === 'portalB') {
        block = createPortalBlock(res, prop.type === 'portalA' ? 'A' : 'B');
        block.scale.setScalar(2.4);
        const halo = block.getObjectByName('portalHalo');
        const s1 = block.getObjectByName('portalShard1');
        const s2 = block.getObjectByName('portalShard2');
        if (halo && s1 && s2) {
          this.animatedPortals.push({ halo, s1, s2 });
        }
      } else if (prop.type === 'boost') {
        block = createBoostBlock(res);
        block.scale.setScalar(2.35);
        // Align boost pad cleanly to mountain slope normal!
        _up.set(nScratch.x, nScratch.y, nScratch.z);
        block.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), _up);
        const core = block.getObjectByName('boostCore');
        const ring = block.getObjectByName('boostRing');
        if (core && ring) {
          this.animatedBoosts.push({ core, ring });
        }
      }

      if (block) {
        block.position.set(prop.x, y - (prop.type === 'boost' ? 0.02 : 0.15), prop.z);
        this.propsGroup.add(block);
      }
    }
    this.registerCsmMaterials(this.propsGroup);
  }

  public setBuilderOverlayVisible(visible: boolean): void {
    this.boundaryRing.visible = visible;
    if (!visible) {
      this.hoverGhost.visible = false;
    }
  }

  public resetBuilderCamera(): void {
    this.builderYaw = 0.28;
    this.builderPitch = 0.94;
    this.builderDist = 175;
    this.builderFocus.set(0, 12, -30);
  }

  public adjustBuilderOrbit(dx: number, dy: number): void {
    this.builderYaw -= dx * 0.007;
    this.builderPitch = THREE.MathUtils.clamp(this.builderPitch + dy * 0.006, 0.35, 1.48);
  }

  public adjustBuilderZoom(deltaY: number): void {
    this.builderDist = THREE.MathUtils.clamp(this.builderDist + deltaY * 0.14, 34, 340);
  }

  /**
   * Raycasts pointer directly onto the 3D sculpted mountain terrain for placing props anywhere!
   */
  public pickMountainPoint(clientX: number, clientY: number): WorldPoint2D | null {
    if (!this.terrainMesh) return null;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const hits = this.raycaster.intersectObject(this.terrainMesh, false);
    if (hits.length > 0) {
      const pt = hits[0].point;
      if (Math.hypot(pt.x, pt.z) <= WORLD_PLAY_RADIUS - 2) {
        this.hoverGhost.visible = true;
        this.hoverGhost.position.set(pt.x, pt.y + 0.1, pt.z);
        return { x: pt.x, z: pt.z };
      }
    }
    this.hoverGhost.visible = false;
    return null;
  }

  public hideHoverGhost(): void {
    this.hoverGhost.visible = false;
  }

  public snapCameraHeading(heading: number): void {
    this.smoothHeading = heading;
  }

  /**
   * Builds a surface-hugging 3D orientation quaternion from terrain normal + heading.
   */
  private applyTerrainPose(obj: THREE.Object3D, pose: SnakePose3D, yLift = 0.04): void {
    obj.position.set(pose.x, pose.y + yLift, pose.z);

    _up.set(pose.nx, pose.ny, pose.nz).normalize();
    _fwd.set(Math.sin(pose.heading), 0, Math.cos(pose.heading));
    // Project forward tangent onto slope plane
    _fwd.addScaledVector(_up, -_fwd.dot(_up));
    if (_fwd.lengthSq() < 0.0001) {
      _fwd.set(0, 0, 1);
    } else {
      _fwd.normalize();
    }
    _right.crossVectors(_up, _fwd).normalize();
    _basisMat.makeBasis(_right, _up, _fwd);
    obj.quaternion.setFromRotationMatrix(_basisMat);
  }

  public updateVisuals(
    dt: number,
    snake: RenderSnakeState,
    orbs: CollectibleOrb[],
    boulders: RollingBoulder[],
    beasts: WildBeast[],
    projectiles: MagicProjectile[],
    shockwaves: ShockwaveEffect[],
    visitedLandmarkIds: Set<string>,
    gameMode: GameMode,
    cameraMode: CameraMode,
    evolutionLevel = 1,
    nextLandmarkId: string | null = null,
    fissures: GroundFissure[] = [],
  ): void {
    this.elapsed += dt;
    this.activeEvolutionLevel = evolutionLevel;
    const t = this.elapsed;
    const stage = getStageForLevel(evolutionLevel);
    const magic = getMagicTierForLevel(evolutionLevel);

    // 1. Update fallback directional light position if running without CSM
    if (this.fallbackSunLight) {
      this.fallbackSunLight.position.set(snake.head.x + 36, snake.head.y + 52, snake.head.z + 28);
      this.fallbackSunLight.target.position.set(snake.head.x, snake.head.y, snake.head.z);
      this.fallbackSunLight.target.updateMatrixWorld();
    }

    // 2. Update 12-Stage Morphing Serpent -> Naga -> Ascended Human Avatar!
    const showSerpentHead = stage.humanFaceBlend < 0.85 && stage.serpentScale > 0.05;
    this.snakeHeadGroup.visible = showSerpentHead;
    if (showSerpentHead) {
      const headScale = stage.serpentScale * (1 - stage.humanFaceBlend * 0.45);
      this.applyTerrainPose(this.snakeHeadGroup, snake.head, 0.03);
      this.snakeHeadGroup.scale.setScalar(headScale);
      const hornS = Math.max(0.001, stage.hornScale);
      this.snakeLeftHorn.scale.setScalar(hornS);
      this.snakeRightHorn.scale.setScalar(hornS);
      this.snakeCrown.scale.set(0.8 * hornS, 0.45 * hornS, 1.5 * hornS);

      // Tongue flick
      const flick = Math.max(0, Math.sin(t * 7.2) * Math.sin(t * 2.1));
      this.snakeTongue.scale.z = 0.25 + flick * 1.1;
      this.snakeTongue.rotation.y = Math.sin(t * 20) * 0.16 * flick;
    }

    // Scale color progression + sprint boost glow
    _color.setHex(stage.scaleColorHex);
    this.snakeHeadMat.color.lerp(_color, 1 - Math.exp(-3 * dt));
    this.snakeBodyMat.color.lerp(_color, 1 - Math.exp(-3 * dt));

    const targetEmissive = snake.boostActive ? 0.55 : stage.auraIntensity * 0.18;
    this.snakeHeadMat.emissive.setHex(0xffe066);
    this.snakeHeadMat.emissiveIntensity = THREE.MathUtils.damp(
      this.snakeHeadMat.emissiveIntensity,
      targetEmissive,
      8,
      dt,
    );
    this.snakeBodyMat.emissive.setHex(stage.level >= 10 ? 0xffe066 : 0x28c78a);
    this.snakeBodyMat.emissiveIntensity = THREE.MathUtils.damp(
      this.snakeBodyMat.emissiveIntensity,
      snake.boostActive ? 0.38 : stage.level >= 11 ? 0.5 : 0.0,
      8,
      dt,
    );

    // Serpent body segments (fade into ethereal spirit trail at Lv 11, completely gone at Lv 12 Ascended Human!)
    const showTail = stage.tailOpacity > 0.02;
    this.snakeBodyMat.opacity = stage.tailOpacity;
    this.snakeCrestMat.opacity = stage.tailOpacity;
    this.snakeBellyMat.opacity = stage.tailOpacity;

    const segCount = showTail ? Math.min(snake.segments.length, MAX_SNAKE_SEGMENTS) : 0;
    const bodyScaleBase = Math.max(0.55, stage.serpentScale);
    for (let i = 0; i < MAX_SNAKE_SEGMENTS; i++) {
      const segMesh = this.snakeBodyPool[i];
      if (i >= segCount) {
        segMesh.visible = false;
        continue;
      }
      segMesh.visible = true;
      const pose = snake.segments[i];
      this.applyTerrainPose(segMesh, pose, 0.03);

      const ratio = segCount > 1 ? i / (segCount - 1) : 0;
      const taper = THREE.MathUtils.lerp(0.92, 0.42, Math.pow(ratio, 1.35)) * bodyScaleBase;
      const pulse = 1 + Math.sin(t * 8.0 - i * 0.48) * 0.04;
      segMesh.scale.setScalar(taper * pulse);
    }

    // Articulated Evolution & Ascended Human Rig (Lv 5+ forelimbs/wings -> Lv 8+ Naga -> Lv 11-12 Full Human!)
    const showAscensionRig = stage.nagaTorsoBlend > 0.05 || stage.wingBlend > 0.05 || stage.legsBlend > 0.05;
    this.ascensionRig.group.visible = showAscensionRig;
    if (showAscensionRig) {
      const rig = this.ascensionRig;
      // Keep human/naga standing mostly upright on slopes with gentle lean into terrain
      rig.group.position.set(snake.head.x, snake.head.y + 0.02, snake.head.z);
      _up.set(snake.head.nx * 0.25, 1.0, snake.head.nz * 0.25).normalize();
      _fwd.set(Math.sin(snake.head.heading), 0, Math.cos(snake.head.heading));
      _fwd.addScaledVector(_up, -_fwd.dot(_up)).normalize();
      _right.crossVectors(_up, _fwd).normalize();
      _basisMat.makeBasis(_right, _up, _fwd);
      rig.group.quaternion.setFromRotationMatrix(_basisMat);

      // Advance running gait phase proportional to speed
      this.gaitPhase += dt * (4.2 + snake.speedRatio * 4.8);
      const stride = Math.sin(this.gaitPhase);

      // Scale whole human rig cleanly (1.05 height at Ascended Human so mountains still feel monumental!)
      const rigScale = THREE.MathUtils.lerp(0.76, 1.08, stage.nagaTorsoBlend);
      rig.group.scale.setScalar(rigScale);

      // Legs emerge at Lv 10-12
      const hasLegs = stage.legsBlend > 0.05;
      rig.legsGroup.visible = hasLegs;
      if (hasLegs) {
        rig.legsGroup.scale.set(1, stage.legsBlend, 1);
        const legSwing = stride * 0.68 * stage.legsBlend;
        rig.leftLegPivot.rotation.x = legSwing;
        rig.rightLegPivot.rotation.x = -legSwing;
        rig.upperBody.position.y = 0.26 + stage.legsBlend * 0.68 + Math.abs(Math.cos(this.gaitPhase)) * 0.05;
      } else {
        // Seated upright atop the front serpent coils (Naga / Wyrm form)
        rig.upperBody.position.y = 0.22 + stage.nagaTorsoBlend * 0.16;
      }

      // Forelimbs / Arms animate smoothly
      const armScale = Math.max(0.01, stage.nagaTorsoBlend);
      rig.leftArmPivot.scale.setScalar(armScale);
      rig.rightArmPivot.scale.setScalar(armScale);
      rig.leftArmPivot.rotation.x = -stride * 0.58;
      rig.rightArmPivot.rotation.x = stride * 0.58;
      rig.leftArmPivot.rotation.z = 0.14 + Math.sin(t * 2.5) * 0.04;
      rig.rightArmPivot.rotation.z = -0.14 - Math.sin(t * 2.5) * 0.04;

      // Skin color shifts from emerald-tinted scaled Naga to warm Human skin!
      _color.setHex(stage.humanFaceBlend > 0.65 ? 0xe6b992 : 0x74b898);
      rig.skinMat.color.lerp(_color, 1 - Math.exp(-4 * dt));

      // Human head emerges at Lv 8+
      rig.humanHeadGroup.visible = stage.humanFaceBlend > 0.15;
      if (rig.humanHeadGroup.visible) {
        rig.humanHeadGroup.scale.setScalar(0.55 + stage.humanFaceBlend * 0.48);
        rig.humanHeadGroup.rotation.y = Math.sin(t * 1.4) * 0.06;
      }

      // Cloak appears on Naga & Human forms and billows back with speed
      rig.cloak.visible = stage.nagaTorsoBlend >= 0.8;
      if (rig.cloak.visible) {
        rig.cloak.rotation.x = 0.18 + snake.speedRatio * 0.28 + Math.sin(t * 7.5) * 0.08;
      }

      // Drake Wings flap at Lv 6-9
      const showWings = stage.wingBlend > 0.05;
      rig.leftWingPivot.visible = showWings;
      rig.rightWingPivot.visible = showWings;
      if (showWings) {
        const ws = stage.wingBlend;
        rig.leftWingPivot.scale.setScalar(ws);
        rig.rightWingPivot.scale.setScalar(ws);
        const flap = Math.sin(t * (snake.boostActive ? 11 : 6.2)) * 0.34;
        rig.leftWingPivot.rotation.y = 0.28 + flap;
        rig.rightWingPivot.rotation.y = -0.28 - flap;
      }

      // Golden Ascension Halo
      rig.auraRing.visible = stage.auraIntensity > 0.2;
      if (rig.auraRing.visible) {
        rig.auraRing.rotation.z = t * 1.1;
        rig.auraRing.scale.setScalar(0.65 + stage.auraIntensity * 0.5);
        rig.auraMat.opacity = 0.25 + stage.auraIntensity * 0.65;
        rig.auraMat.emissiveIntensity = snake.boostActive ? 1.8 : 1.0 + stage.auraIntensity * 0.5;
      }
    }

    // 2b. Escalating Player Arcane Aura (orbiting rune shards + glowing rune circle)
    const auraRig = this.playerAuraRig;
    const orbCount = magic.auraOrbs;
    auraRig.group.visible = orbCount > 0;
    if (orbCount > 0) {
      auraRig.group.position.set(snake.head.x, snake.head.y + 0.08, snake.head.z);
      auraRig.orbMat.color.setHex(magic.manaColorHex);
      auraRig.orbMat.emissive.setHex(magic.manaColorHex);
      auraRig.orbMat.emissiveIntensity = snake.boostActive ? 2.2 : 1.35 + (evolutionLevel / 12) * 0.7;

      const orbitRadius = 1.05 + evolutionLevel * 0.045;
      const orbitSpeed = 1.8 + evolutionLevel * 0.12;
      const baseHeight = stage.legsBlend > 0.4 ? 1.35 : 0.92;
      for (let i = 0; i < auraRig.orbs.length; i++) {
        const orbMesh = auraRig.orbs[i];
        if (i >= orbCount) {
          orbMesh.visible = false;
          continue;
        }
        orbMesh.visible = true;
        const angle = t * orbitSpeed + (i * Math.PI * 2) / orbCount;
        orbMesh.position.set(
          Math.cos(angle) * orbitRadius,
          baseHeight + Math.sin(t * 3.2 + i * 1.3) * 0.22,
          Math.sin(angle) * orbitRadius,
        );
        orbMesh.rotation.set(t * 2.1 + i, t * 2.8, 0);
        const orbScale = 0.8 + (evolutionLevel / 12) * 0.55;
        orbMesh.scale.setScalar(orbScale);
      }

      const showGroundRune = evolutionLevel >= 4;
      auraRig.groundRing.visible = showGroundRune;
      if (showGroundRune) {
        auraRig.ringMat.color.setHex(magic.manaColorHex);
        auraRig.ringMat.opacity = 0.14 + ((evolutionLevel - 3) / 9) * 0.28 + Math.sin(t * 3.5) * 0.05;
        auraRig.groundRing.rotation.z = t * 0.7;
        auraRig.groundRing.scale.setScalar(0.95 + (evolutionLevel / 12) * 0.45);
      }
    }

    // 3. Sync & Animate World Collectibles across the Continent
    let goldenIdx = 0;
    let normalIdx = 14;
    for (const slot of this.collectiblePool) {
      slot.active = false;
      slot.group.visible = false;
    }
    for (const orb of orbs) {
      let slotIdx = -1;
      if (orb.golden && goldenIdx < 14) {
        slotIdx = goldenIdx++;
      } else if (!orb.golden && normalIdx < MAX_COLLECTIBLES) {
        slotIdx = normalIdx++;
      }
      if (slotIdx < 0) continue;
      const slot = this.collectiblePool[slotIdx];
      slot.active = true;
      slot.group.visible = true;
      slot.group.position.set(orb.x, orb.y + 0.15, orb.z);

      const core = slot.group.getObjectByName('fruitCore');
      const halo = slot.group.getObjectByName('fruitHalo');
      if (core) {
        core.rotation.y = t * (orb.golden ? 2.4 : 1.7) + orb.id;
        core.position.y = 0.56 + Math.sin(t * 3.1 + orb.id) * 0.12;
      }
      if (halo) {
        halo.rotation.z = t * 2.2 + orb.id;
        halo.position.y = 0.56 + Math.sin(t * 3.1 + orb.id) * 0.12;
      }
    }

    // 4. Sync & Animate Dynamic Rolling Mountain Boulders
    for (let i = 0; i < MAX_ROLLING_BOULDERS; i++) {
      const mesh = this.rollingBoulderPool[i];
      const b = boulders[i];
      if (!b) {
        mesh.visible = false;
        continue;
      }
      mesh.visible = true;
      mesh.position.set(b.x, b.y + b.radius * 0.88, b.z);
      mesh.scale.setScalar(b.radius);
      mesh.rotation.set(b.rotX, 0, b.rotZ);
    }

    // 4b. Sync & Animate Roaming Wild Mountain Animals, Peak Guardians & Subterranean Ghost Clan
    const usedByKind: Record<BeastKind, number> = {
      wolf: 0,
      boar: 0,
      eagle: 0,
      guardian: 0,
      wraith: 0,
      soul_elder: 0,
    };
    for (const kind of ['wolf', 'boar', 'eagle', 'guardian', 'wraith', 'soul_elder'] as BeastKind[]) {
      for (const rig of this.beastPools[kind]) {
        rig.group.visible = false;
      }
    }
    for (let i = 0; i < beasts.length; i++) {
      const beast = beasts[i];
      const pool = this.beastPools[beast.kind];
      const idx = usedByKind[beast.kind];
      if (!pool || idx >= pool.length) continue;
      usedByKind[beast.kind] = idx + 1;

      const rig = pool[idx];
      rig.group.visible = true;
      rig.group.position.set(beast.x, beast.y, beast.z);
      rig.group.rotation.y = beast.heading;
      const emergeScale = beast.state === 'emerging' ? 0.55 + beast.emergeProgress * 0.45 : 1.0;
      rig.group.scale.setScalar(beast.scale * emergeScale);

      // Articulated gait / wing flap / ghostly hover / emerging rise
      const speedNorm = Math.min(1.6, Math.hypot(beast.vx, beast.vz) / Math.max(1, beast.speed));
      if (beast.kind === 'eagle') {
        const hoverY = 1.65 + Math.sin(beast.animPhase * 1.4) * 0.32;
        rig.bodyGroup.position.y = beast.state === 'lunge' ? hoverY - 0.7 : hoverY;
        const flap = Math.sin(beast.animPhase * 2.8) * (beast.state === 'windup' ? 0.65 : 0.42);
        if (rig.wings[0]) rig.wings[0].rotation.z = flap;
        if (rig.wings[1]) rig.wings[1].rotation.z = -flap;
      } else if (beast.kind === 'wraith' || beast.kind === 'soul_elder') {
        const floatBob = Math.sin(beast.animPhase * 2.1 + beast.id) * 0.24;
        rig.bodyGroup.position.y = beast.state === 'emerging' ? 0 : 0.22 + floatBob;
        const armWave = Math.sin(beast.animPhase * 2.5) * 0.32;
        for (let l = 0; l < rig.limbs.length; l++) {
          const sign = l % 2 === 0 ? 1 : -1;
          rig.limbs[l].rotation.x =
            beast.state === 'windup' ? -0.85 : armWave * sign - 0.25;
        }
        if (rig.accentObj) {
          rig.accentObj.rotation.z = t * (beast.state === 'windup' ? 5.2 : 2.1);
          rig.accentObj.rotation.y = t * 1.4;
        }
      } else {
        const stride = Math.sin(beast.animPhase * 2.2) * 0.62 * Math.max(0.12, speedNorm);
        for (let l = 0; l < rig.limbs.length; l++) {
          const sign = l % 2 === 0 ? 1 : -1;
          rig.limbs[l].rotation.x = stride * sign;
        }
        rig.bodyGroup.position.y =
          beast.state === 'windup'
            ? 0.1 + Math.sin(t * 28) * 0.06
            : Math.abs(Math.cos(beast.animPhase * 2.2)) * 0.08 * speedNorm;
        if (beast.kind === 'guardian' && rig.accentObj) {
          rig.accentObj.rotation.z = t * (beast.state === 'windup' ? 4.2 : 1.5);
        } else if (beast.kind === 'wolf' && rig.accentObj) {
          rig.accentObj.rotation.y = Math.sin(beast.animPhase * 2.6) * 0.35;
        }
      }

      // Hit-flash white/crimson emissive pulse or attack windup / emergence glow
      if (beast.hitFlash > 0) {
        rig.primaryMat.emissive.setHex(0xffffff);
        rig.primaryMat.emissiveIntensity = Math.min(1.4, beast.hitFlash * 5.5);
      } else if (beast.state === 'emerging') {
        rig.primaryMat.emissive.setHex(beast.kind === 'soul_elder' ? 0xd946ef : 0x22e8a8);
        rig.primaryMat.emissiveIntensity = 0.75 + Math.sin(t * 22) * 0.35;
      } else if (beast.state === 'windup') {
        rig.primaryMat.emissive.setHex(
          beast.faction === 'ghost_clan'
            ? 0x3ef5b8
            : beast.kind === 'guardian'
              ? 0xc084fc
              : 0xff5a2a,
        );
        rig.primaryMat.emissiveIntensity = 0.55 + Math.sin(t * 26) * 0.35;
      } else {
        rig.primaryMat.emissive.setHex(0x000000);
        rig.primaryMat.emissiveIntensity = 0;
      }
      rig.glowMat.emissiveIntensity = beast.state === 'windup' || beast.state === 'emerging' ? 2.8 : 1.6;

      // Overhead billboarded HP bar when damaged or actively aggroed
      const showHp = beast.hp < beast.maxHp || beast.state !== 'patrol';
      rig.hpBarGroup.visible = showHp;
      if (showHp) {
        rig.hpBarGroup.lookAt(this.camera.position);
        const frac = Math.max(0.02, Math.min(1, beast.hp / Math.max(1, beast.maxHp)));
        rig.hpFillMesh.scale.x = frac;
      }
    }

    // 4b-ii. Sync & Animate Cracked Subterranean Ghost Clan Earth Fissures
    for (let i = 0; i < MAX_FISSURES; i++) {
      const fRig = this.groundFissurePool[i];
      const f = fissures[i];
      if (!f) {
        fRig.group.visible = false;
        continue;
      }
      fRig.group.visible = true;
      const u = Math.max(0, Math.min(1, f.age / Math.max(0.1, f.life)));
      const openFactor = u < 0.25 ? u / 0.25 : u > 0.75 ? (1 - u) / 0.25 : 1;
      const rad = Math.max(0.25, f.radius * openFactor);
      fRig.group.position.set(f.x, f.y + 0.04, f.z);
      fRig.outerRing.scale.setScalar(rad);
      fRig.outerRing.rotation.z = t * (f.isBoss ? 2.8 : 1.9);
      fRig.innerDisc.scale.setScalar(rad * 0.96);
      fRig.vortexCone.scale.set(rad * 0.82, 0.4 + openFactor * (f.isBoss ? 1.55 : 1.05), rad * 0.82);
      fRig.vortexCone.rotation.y = -t * 3.2;
      fRig.ringMat.color.setHex(f.colorHex);
      fRig.ringMat.opacity = 0.85 * openFactor;
      fRig.discMat.opacity = 0.88 * openFactor;
      fRig.vortexMat.color.setHex(f.isBoss ? 0xe879f9 : 0x3ef5b8);
      fRig.vortexMat.opacity = 0.45 * openFactor;
    }

    // 4c. Sync & Animate Pooled Magical Spell Projectiles
    for (let i = 0; i < MAX_PROJECTILES; i++) {
      const slot = this.projectilePool[i];
      const p = projectiles[i];
      if (!p) {
        slot.group.visible = false;
        continue;
      }
      slot.group.visible = true;
      slot.group.position.set(p.x, p.y, p.z);
      const styleScale = p.style === 'lotus' ? 2.85 : p.style === 'soul_chain' ? 2.3 : 2.1;
      slot.group.scale.setScalar(p.radius * styleScale);
      slot.group.rotation.set(t * 7.5 + p.id, t * 9.4, p.style === 'lotus' ? t * 6.0 : 0);
      slot.coreMat.color.setHex(p.colorHex);
      slot.haloMat.color.setHex(
        p.style === 'lotus' ? 0xffe48f : p.style === 'soul_chain' ? 0x3ef5b8 : p.fromPlayer ? 0xffffff : p.colorHex,
      );
    }

    // 4d. Sync & Animate Expanding Arcane Shockwave Rings
    for (let i = 0; i < MAX_SHOCKWAVES; i++) {
      const slot = this.shockwavePool[i];
      const sw = shockwaves[i];
      if (!sw) {
        slot.group.visible = false;
        continue;
      }
      slot.group.visible = true;
      const u = Math.max(0, Math.min(1, sw.age / Math.max(0.05, sw.life)));
      const fade = 1 - u;
      slot.group.position.set(sw.x, sw.y + 0.35, sw.z);
      slot.group.scale.set(Math.max(0.2, sw.radius), 1, Math.max(0.2, sw.radius));
      slot.ringMat.color.setHex(sw.colorHex);
      slot.ringMat.opacity = fade * 0.92;
      slot.discMat.color.setHex(sw.colorHex);
      slot.discMat.opacity = fade * 0.38;
    }

    // 5. Animate all 12 Summit Trial Shrines (highlighting the next target peak with a towering golden sky-beam!)
    for (let i = 0; i < this.landmarkVisuals.length; i++) {
      const lv = this.landmarkVisuals[i];
      const visited = visitedLandmarkIds.has(lv.id);
      const isNext = lv.id === nextLandmarkId;
      lv.crystal.rotation.y = t * (visited ? 0.7 : isNext ? 2.5 : 1.6) + i;
      lv.crystal.position.y = 5.85 + Math.sin(t * 2.2 + i) * 0.25;
      lv.ring.rotation.z = -t * (isNext ? 2.2 : 1.3);
      const beamMat = lv.beam.material as THREE.MeshBasicMaterial;
      if (visited) {
        beamMat.opacity = 0.05;
        lv.beam.scale.set(1, 0.7, 1);
      } else if (isNext) {
        beamMat.opacity = 0.34 + Math.sin(t * 3.2) * 0.06;
        lv.beam.scale.set(1.6, 2.2, 1.6);
      } else {
        beamMat.opacity = 0.16 + Math.sin(t * 2.2 + i) * 0.04;
        lv.beam.scale.set(1, 1.15, 1);
      }
    }

    // 6. Animate Formation Props (Totems, Portals, Boosts)
    for (let i = 0; i < this.animatedTotems.length; i++) {
      const tm = this.animatedTotems[i];
      tm.core.rotation.y = t * 1.8 + i;
      tm.core.position.y = tm.baseY + Math.sin(t * 2.8 + i) * 0.1;
      tm.ring.rotation.z = -t * 1.5;
    }
    for (let i = 0; i < this.animatedPortals.length; i++) {
      const pt = this.animatedPortals[i];
      pt.halo.rotation.y = t * 1.6 + i;
      pt.s1.position.y = 0.56 + Math.sin(t * 3.2 + i) * 0.08;
      pt.s2.position.y = 0.56 + Math.cos(t * 3.2 + i) * 0.08;
    }
    for (let i = 0; i < this.animatedBoosts.length; i++) {
      const bs = this.animatedBoosts[i];
      bs.core.rotation.y = t * 2.4 + i;
      bs.ring.scale.setScalar(0.92 + Math.sin(t * 4.5 + i) * 0.08);
    }

    // 7. Animate Alpine Lakes & Floating Snow / Fireflies (wrapping smoothly around the player)
    for (const wm of this.waterMeshes) {
      wm.position.y = WATER_LEVEL + Math.sin(t * 1.3) * 0.06;
    }
    if (this.ambientMotes && this.ambientMotePositions) {
      const posAttr = this.ambientMotes.geometry.attributes.position as THREE.BufferAttribute;
      const isJungle = this.biome === 'jungle';
      const wrapR = 72;
      for (let i = 0; i < this.ambientMotePositions.length / 3; i++) {
        const ix = i * 3;
        if (isJungle) {
          this.ambientMotePositions[ix] += Math.sin(t * 0.6 + i) * dt * 0.4;
          this.ambientMotePositions[ix + 1] += Math.cos(t * 0.8 + i * 0.7) * dt * 0.25;
        } else {
          this.ambientMotePositions[ix] += Math.sin(t * 0.4 + i) * dt * 0.75;
          this.ambientMotePositions[ix + 1] -= dt * 1.35;
        }
        // Keep ambient motes wrapped around player across the massive 480-unit continent
        const dx = this.ambientMotePositions[ix] - snake.head.x;
        const dz = this.ambientMotePositions[ix + 2] - snake.head.z;
        if (dx > wrapR) this.ambientMotePositions[ix] -= wrapR * 2;
        else if (dx < -wrapR) this.ambientMotePositions[ix] += wrapR * 2;
        if (dz > wrapR) this.ambientMotePositions[ix + 2] -= wrapR * 2;
        else if (dz < -wrapR) this.ambientMotePositions[ix + 2] += wrapR * 2;

        const groundY = terrainHeightAt(
          this.ambientMotePositions[ix],
          this.ambientMotePositions[ix + 2],
          this.biome,
        );
        if (this.ambientMotePositions[ix + 1] < groundY + 0.5 || this.ambientMotePositions[ix + 1] > groundY + 32) {
          this.ambientMotePositions[ix + 1] = groundY + (isJungle ? 3 + (i % 14) : 24);
        }
      }
      posAttr.needsUpdate = true;
    }

    // 8. Update Pooled Burst Particles
    let anyActive = false;
    for (let i = 0; i < MAX_BURST_PARTICLES; i++) {
      const p = this.burstParticles[i];
      if (!p.active) continue;
      anyActive = true;
      p.age += dt;
      if (p.age >= p.life) {
        p.active = false;
        _mat4.makeScale(0, 0, 0);
        this.burstInstanced.setMatrixAt(i, _mat4);
        continue;
      }
      p.vel.y -= 10.5 * dt;
      p.pos.addScaledVector(p.vel, dt);
      const s = p.scale * (1 - p.age / p.life);
      _euler.set(p.age * 7, p.age * 5, 0);
      _quat.setFromEuler(_euler);
      _scale.setScalar(Math.max(0.001, s));
      _mat4.compose(p.pos, _quat, _scale);
      this.burstInstanced.setMatrixAt(i, _mat4);
      this.burstInstanced.setColorAt(i, p.color);
    }
    if (anyActive) {
      this.burstInstanced.instanceMatrix.needsUpdate = true;
      if (this.burstInstanced.instanceColor) {
        this.burstInstanced.instanceColor.needsUpdate = true;
      }
    }

    // 8b. Update Celebratory Evolution Tier-Up Particle Explosion
    this.updateEvolutionExplosion(dt);

    // 9. Smooth Terrain-Aware GTA / Ant Camera + Cascaded Shadow Map Update
    if (!this.xrActive) {
      this.updateCamera(dt, snake, gameMode, cameraMode);
    }

    // 10. Procedural Mountain Weather (mist/fog billows, slanted light rain, splashes, atmospheric damping)
    const weatherFocusX = gameMode === 'playing' || gameMode === 'paused' ? snake.head.x : this.currentLookAt.x;
    const weatherFocusY = gameMode === 'playing' || gameMode === 'paused' ? snake.head.y : this.currentLookAt.y;
    const weatherFocusZ = gameMode === 'playing' || gameMode === 'paused' ? snake.head.z : this.currentLookAt.z;
    this.updateWeather(dt, weatherFocusX, weatherFocusY, weatherFocusZ);

    if (this.csm) {
      this.camera.updateMatrixWorld();
      if (Math.abs(this.camera.fov - this.lastCsmFov) > 0.25) {
        this.lastCsmFov = this.camera.fov;
        this.csm.updateFrustums();
      }
      this.csm.update();
    }
  }

  private updateCamera(
    dt: number,
    snake: RenderSnakeState,
    gameMode: GameMode,
    cameraMode: CameraMode,
  ): void {
    let targetFov = 54;
    let dampLambda = 5.2;

    if (gameMode === 'title') {
      // Sweeping scenic flyover across the snow-capped mountains & valleys!
      this.titleOrbitAngle += dt * 0.085;
      const radius = 64;
      const cx = Math.sin(this.titleOrbitAngle) * radius;
      const cz = Math.cos(this.titleOrbitAngle) * radius - 14;
      const groundAtCam = terrainHeightAt(cx, cz, this.biome);
      this.cameraTargetPos.set(cx, Math.max(groundAtCam + 12, 28 + Math.sin(this.titleOrbitAngle * 0.8) * 5), cz);
      this.cameraLookAt.set(0, 12, -24);
      targetFov = 52;
      dampLambda = 2.2;
    } else if (gameMode === 'ascended' || gameMode === 'evolving') {
      // Triumphant 360° showcase orbit around your newly evolved form atop the mountain!
      this.titleOrbitAngle += dt * 0.42;
      const orbitR = gameMode === 'ascended' ? 6.2 : 7.4;
      const cx = snake.head.x + Math.sin(this.titleOrbitAngle) * orbitR;
      const cz = snake.head.z + Math.cos(this.titleOrbitAngle) * orbitR;
      const groundAtCam = terrainHeightAt(cx, cz, this.biome);
      this.cameraTargetPos.set(cx, Math.max(groundAtCam + 1.8, snake.head.y + 2.8), cz);
      this.cameraLookAt.set(snake.head.x, snake.head.y + 1.5, snake.head.z);
      targetFov = 48;
      dampLambda = 3.8;
    } else if (gameMode === 'builder') {
      const horiz = Math.cos(this.builderPitch) * this.builderDist;
      const cx = this.builderFocus.x + Math.sin(this.builderYaw) * horiz;
      const cy = this.builderFocus.y + Math.sin(this.builderPitch) * this.builderDist;
      const cz = this.builderFocus.z + Math.cos(this.builderYaw) * horiz;
      const minGround = terrainHeightAt(cx, cz, this.biome) + 6;
      this.cameraTargetPos.set(cx, Math.max(cy, minGround), cz);
      this.cameraLookAt.copy(this.builderFocus);
      targetFov = 48;
      dampLambda = 5.5;
    } else {
      // Smooth heading follow with shortest-arc wrapping
      const angleDiff =
        ((snake.head.heading - this.smoothHeading + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      this.smoothHeading += angleDiff * (1 - Math.exp(-6.0 * dt));

      const dirX = Math.sin(this.smoothHeading);
      const dirZ = Math.cos(this.smoothHeading);

      if (cameraMode === 'ant') {
        // ANT VIEW: low-to-the-ground wide GTA chase hugging the mountainside so peaks & pines tower overhead!
        const backDist = 5.6;
        const camX = snake.head.x - dirX * backDist;
        const camZ = snake.head.z - dirZ * backDist;
        const groundBehind = terrainHeightAt(camX, camZ, this.biome);
        const camY = Math.max(snake.head.y + 2.15, groundBehind + 1.65);

        const lookAheadDist = 9.0;
        const lookX = snake.head.x + dirX * lookAheadDist;
        const lookZ = snake.head.z + dirZ * lookAheadDist;
        const lookGround = terrainHeightAt(lookX, lookZ, this.biome);
        const lookY = Math.max(snake.head.y + 1.45, lookGround + 1.35);

        this.cameraTargetPos.set(camX, camY, camZ);
        this.cameraLookAt.set(lookX, lookY, lookZ);
        targetFov = snake.boostActive ? 65 : 60;
        dampLambda = 6.2;
      } else if (cameraMode === 'chase') {
        // GTA MOUNTAIN CHASE: commanding cinematic 3rd-person view over slopes & valleys
        const backDist = 11.8;
        const camX = snake.head.x - dirX * backDist;
        const camZ = snake.head.z - dirZ * backDist;
        const groundBehind = terrainHeightAt(camX, camZ, this.biome);
        const camY = Math.max(snake.head.y + 5.4, groundBehind + 2.6);

        const lookAheadDist = 8.5;
        const lookX = snake.head.x + dirX * lookAheadDist;
        const lookZ = snake.head.z + dirZ * lookAheadDist;
        const lookGround = terrainHeightAt(lookX, lookZ, this.biome);
        const lookY = Math.max(snake.head.y + 1.2, lookGround + 0.8);

        this.cameraTargetPos.set(camX, camY, camZ);
        this.cameraLookAt.set(lookX, lookY, lookZ);
        targetFov = snake.boostActive ? 57 : 52;
        dampLambda = 5.4;
      } else {
        // EAGLE MAP VIEW: high soaring alpine panorama following your serpent
        const camX = snake.head.x - dirX * 16;
        const camZ = snake.head.z - dirZ * 16;
        const camY = Math.max(snake.head.y + 30, terrainHeightAt(camX, camZ, this.biome) + 22);
        this.cameraTargetPos.set(camX, camY, camZ);
        this.cameraLookAt.set(snake.head.x + dirX * 5, snake.head.y + 1, snake.head.z + dirZ * 5);
        targetFov = 48;
        dampLambda = 4.6;
      }
    }

    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 4.5, dt);
      this.camera.updateProjectionMatrix();
    }

    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, this.cameraTargetPos.x, dampLambda, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, this.cameraTargetPos.y, dampLambda, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, this.cameraTargetPos.z, dampLambda, dt);

    // Safety clamp so damped camera never dips inside a hillside
    if (gameMode !== 'title') {
      const floorY = terrainHeightAt(this.camera.position.x, this.camera.position.z, this.biome) + 1.2;
      if (this.camera.position.y < floorY) {
        this.camera.position.y = floorY;
      }
    }

    this.currentLookAt.x = THREE.MathUtils.damp(this.currentLookAt.x, this.cameraLookAt.x, dampLambda + 1.8, dt);
    this.currentLookAt.y = THREE.MathUtils.damp(this.currentLookAt.y, this.cameraLookAt.y, dampLambda + 1.8, dt);
    this.currentLookAt.z = THREE.MathUtils.damp(this.currentLookAt.z, this.cameraLookAt.z, dampLambda + 1.8, dt);

    if (this.shakeIntensity > 0.004) {
      const sx = (Math.random() - 0.5) * this.shakeIntensity;
      const sy = (Math.random() - 0.5) * this.shakeIntensity * 0.7;
      _vec3B.copy(this.currentLookAt).add(_vec3A.set(sx, sy, 0));
      this.camera.lookAt(_vec3B);
      this.shakeIntensity = THREE.MathUtils.damp(this.shakeIntensity, 0, 11, dt);
    } else {
      this.shakeIntensity = 0;
      this.camera.lookAt(this.currentLookAt);
    }
  }

  /**
   * Optional WebXR tabletop AR/VR session launcher (kept available under the hood).
   */
  public async tryEnterXR(): Promise<{ supported: boolean; message: string }> {
    const nav = navigator as Navigator & { xr?: XRSystem };
    if (!nav.xr) {
      return {
        supported: false,
        message: 'No WebXR headset detected on this browser.',
      };
    }
    try {
      const arSupported = await nav.xr.isSessionSupported('immersive-ar');
      const vrSupported = !arSupported && (await nav.xr.isSessionSupported('immersive-vr'));
      if (!arSupported && !vrSupported) {
        return { supported: false, message: 'No WebXR headset connected.' };
      }
      const mode = arSupported ? 'immersive-ar' : 'immersive-vr';
      const session = await nav.xr.requestSession(mode, {
        optionalFeatures: ['local-floor', 'hand-tracking'],
      });
      this.renderer.xr.enabled = true;
      await this.renderer.xr.setSession(session);
      this.xrActive = true;
      this.worldRoot.scale.setScalar(0.015);
      this.worldRoot.position.set(0, 0.85, -1.2);
      if (arSupported) this.scene.background = null;
      session.addEventListener('end', () => {
        this.xrActive = false;
        this.worldRoot.scale.setScalar(1);
        this.worldRoot.position.set(0, 0, 0);
        this.setBiome(this.biome);
      });
      return { supported: true, message: `Entered ${mode.toUpperCase()} Mode!` };
    } catch {
      return { supported: false, message: 'Could not start WebXR session.' };
    }
  }

  public start(onFrame: (dt: number) => void): void {
    this.onFrameCallback = onFrame;
    this.running = true;
    this.lastTickPerf = performance.now();

    if (this.isSoftwareGl) {
      this.tickSoftware();
    } else {
      this.renderer.setAnimationLoop(this.tickHardware);
    }
  }

  private tickHardware = (): void => {
    if (!this.running) return;
    const now = performance.now();
    const rawDt = (now - this.lastTickPerf) / 1000;
    this.lastTickPerf = now;
    const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

    this.onFrameCallback?.(dt);
    this.renderer.render(this.scene, this.camera);
  };

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (gl && typeof gl.fenceSync === 'function') {
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (!this.running) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.frameId = window.setTimeout(cb, 80);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    } else {
      this.frameId = window.setTimeout(cb, 80);
    }
  }

  private tickSoftware = (): void => {
    if (!this.running) return;
    const now = performance.now();
    const rawDt = (now - this.lastTickPerf) / 1000;
    this.lastTickPerf = now;
    const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

    this.onFrameCallback?.(dt);
    this.renderer.render(this.scene, this.camera);
    this.afterDraw(this.tickSoftware);
  };

  private handleResize = (): void => {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.csm?.updateFrustums();
  };

  /**
   * Apply a graphics quality preset: 'low' | 'medium' | 'high'.
   * Safe to call at any time — no restart required.
   */
  public setGraphicsQuality(quality: 'low' | 'medium' | 'high'): void {
    if (this.isSoftwareGl) return; // software renderer — keep fixed settings
    switch (quality) {
      case 'low':
        this.renderer.setPixelRatio(1);
        this.renderer.shadowMap.enabled = false;
        this.renderer.shadowMap.type = THREE.BasicShadowMap;
        if (this.csm) { this.csm.maxFar = 60; this.csm.updateFrustums(); }
        this.renderer.toneMappingExposure = 0.98;
        break;
      case 'medium':
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        if (this.csm) { this.csm.maxFar = 120; this.csm.updateFrustums(); }
        this.renderer.toneMappingExposure = 1.02;
        break;
      case 'high':
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        if (this.csm) { this.csm.maxFar = 200; this.csm.updateFrustums(); }
        this.renderer.toneMappingExposure = 1.06;
        break;
    }
  }

  public dispose(): void {
    this.running = false;
    this.renderer.setAnimationLoop(null);
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('resize', this.handleResize);
    if (this.csm) {
      this.csm.remove();
      this.csm.dispose();
      this.csm = null;
    }
    this.mistTexture?.dispose();
    this.sparkGlowMap?.dispose();
    this.evoShardInstanced?.geometry.dispose();
    (this.evoShardInstanced?.material as THREE.Material | undefined)?.dispose();
    this.evoSparkPoints?.geometry.dispose();
    this.evoSparkMat?.dispose();
    if (this.evoRings.length > 0) {
      this.evoRings[0].mesh.geometry.dispose();
      for (const r of this.evoRings) r.mat.dispose();
    }
    this.evoPillarMesh?.geometry.dispose();
    this.evoPillarMat?.dispose();
    this.mistPoints?.geometry.dispose();
    this.mistMat?.dispose();
    this.rainLines?.geometry.dispose();
    this.rainMat?.dispose();
    this.splashInstanced?.geometry.dispose();
    this.splashMat?.dispose();
    this.renderer.dispose();
  }
}
