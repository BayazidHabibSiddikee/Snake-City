import {
  DAY_MS,
  PORTAL_REGIONS,
  PortalRecord,
  PortalRegionId,
  PortalVisualState,
} from '../../ecosystem/memory/RetentionPolicy';

export type SanctuaryGatewayAction =
  | 'newtab'
  | 'atlas'
  | 'history'
  | 'bookmarks'
  | 'settings';

export interface SpatialPortalNode {
  id: string;
  recordId: string | null;
  sanctuaryAction: SanctuaryGatewayAction | null;
  regionId: PortalRegionId;
  visualState: PortalVisualState;
  title: string;
  domain: string;
  url: string;
  faviconGlyph: string;
  lastVisitedAt: number;
  tabCount: number;
  recoverable: boolean;
  pinned: boolean;
  loading: boolean;
  collectionId?: string;
  sessionMeta?: string;
  x: number;
  z: number;
  facingRad: number;
  scale: number;
}

export interface SpatialPortalCluster {
  id: string;
  regionId: PortalRegionId;
  visualState: PortalVisualState;
  x: number;
  z: number;
  count: number;
  representativeTitle: string;
  sampleRecordId: string;
}

export interface PortalLodPartition {
  detailedNodes: SpatialPortalNode[];
  distantClusters: SpatialPortalCluster[];
  totalPortalCount: number;
}

/**
 * Five grand permanent gateways standing around the Central Sanctuary (spawn area)
 * so every essential browser capability is immediately visible as a 3D gateway.
 */
export function buildCentralSanctuaryGateways(): SpatialPortalNode[] {
  const specs: Array<{
    id: string;
    action: SanctuaryGatewayAction;
    title: string;
    domain: string;
    url: string;
    glyph: string;
    state: PortalVisualState;
    angleDeg: number;
    radius: number;
  }> = [
    {
      id: 'sanctuary-newtab',
      action: 'newtab',
      title: 'New Tab Gateway',
      domain: 'chrome://newtab',
      url: 'chrome://newtab',
      glyph: 'NT',
      state: 'active',
      angleDeg: 0,
      radius: 26,
    },
    {
      id: 'sanctuary-atlas',
      action: 'atlas',
      title: 'Portal Memory Atlas',
      domain: 'portal://world-atlas',
      url: 'portal://atlas',
      glyph: 'PM',
      state: 'pinned',
      angleDeg: -38,
      radius: 27,
    },
    {
      id: 'sanctuary-history',
      action: 'history',
      title: 'Memory Forest Index',
      domain: 'chrome://history',
      url: 'chrome://history',
      glyph: 'HI',
      state: 'saved',
      angleDeg: 38,
      radius: 27,
    },
    {
      id: 'sanctuary-bookmarks',
      action: 'bookmarks',
      title: 'Saved Vault & Cache',
      domain: 'chrome://bookmarks',
      url: 'chrome://bookmarks',
      glyph: 'BM',
      state: 'saved',
      angleDeg: 76,
      radius: 29,
    },
    {
      id: 'sanctuary-settings',
      action: 'settings',
      title: 'Browser & Offline Settings',
      domain: 'chrome://settings',
      url: 'chrome://settings',
      glyph: 'ST',
      state: 'active',
      angleDeg: -76,
      radius: 29,
    },
  ];

  return specs.map((spec) => {
    const rad = (spec.angleDeg * Math.PI) / 180;
    const x = Number((Math.sin(rad) * spec.radius).toFixed(2));
    const z = Number((Math.cos(rad) * spec.radius).toFixed(2));
    const facingRad = Math.atan2(-x, -z);
    return {
      id: spec.id,
      recordId: null,
      sanctuaryAction: spec.action,
      regionId: 'central_sanctuary',
      visualState: spec.state,
      title: spec.title,
      domain: spec.domain,
      url: spec.url,
      faviconGlyph: spec.glyph,
      lastVisitedAt: 0,
      tabCount: 1,
      recoverable: false,
      pinned: spec.state === 'pinned',
      loading: false,
      sessionMeta: 'Central Sanctuary Navigation Gateway',
      x,
      z,
      facingRad,
      scale: 1.15,
    };
  });
}

function hash01(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

/**
 * Places every PortalRecord into a structured, readable 6-region world layout
 * (never random scatter):
 * - Active Gateway District: inner northern arc right beyond Central Sanctuary
 * - Memory Forest: eastern sector where distance grows smoothly with visit age
 * - Forgotten Ruins: south-western ruins sector for lost/closed/crashed sessions
 * - Archive Mountains: outer high ridges for older saved browsing archives
 * - Portal Halls: north-western elevated plaza for Collections & Pinned portals
 */
export function layoutPortalRecordsInWorld(
  records: readonly PortalRecord[],
  nowMs = Date.now(),
): SpatialPortalNode[] {
  const byRegion = new Map<PortalRegionId, PortalRecord[]>();
  for (const rec of records) {
    const list = byRegion.get(rec.regionId) ?? [];
    list.push(rec);
    byRegion.set(rec.regionId, list);
  }

  const placed: SpatialPortalNode[] = [];

  // 1. Active Gateway District (inner northern crescent: r = 44..72m)
  const activeList = (byRegion.get('active_gateway') ?? []).sort(
    (a, b) => b.lastVisitedAt - a.lastVisitedAt,
  );
  activeList.forEach((rec, idx) => {
    const row = Math.floor(idx / 7);
    const col = idx % 7;
    const rowCount = Math.min(7, activeList.length - row * 7);
    const spread = Math.min(1.5, Math.max(0.45, (rowCount - 1) * 0.24));
    const t = rowCount <= 1 ? 0 : col / (rowCount - 1) - 0.5;
    const angle = t * spread;
    const radius = 46 + row * 18;
    const x = Number((Math.sin(angle) * radius).toFixed(2));
    const z = Number((Math.cos(angle) * radius).toFixed(2));
    placed.push(makeNodeFromRecord(rec, x, z, Math.atan2(-x, -z), 1.08));
  });

  // 2. Memory Forest (eastern grove: angle +48°..+145°, radius scales with age: recent = near!)
  const memoryList = (byRegion.get('memory_forest') ?? []).sort(
    (a, b) => b.lastVisitedAt - a.lastVisitedAt,
  );
  memoryList.forEach((rec, idx) => {
    const ageDays = Math.max(0, (nowMs - rec.lastVisitedAt) / DAY_MS);
    const ageNorm = Math.min(1, Math.log1p(ageDays * 2.2) / Math.log1p(18));
    const ringStep = Math.floor(idx / 8) * 14;
    const radius = Math.min(182, 66 + ageNorm * 78 + ringStep + hash01(rec.id + 'r') * 8);
    const baseAngle = 0.85 + ((idx % 8) / 7) * 1.48 + (hash01(rec.id + 'a') - 0.5) * 0.12;
    const x = Number((Math.sin(baseAngle) * radius).toFixed(2));
    const z = Number((Math.cos(baseAngle) * radius).toFixed(2));
    placed.push(makeNodeFromRecord(rec, x, z, Math.atan2(-x, -z), 0.96));
  });

  // 3. Forgotten Ruins (south-western misted sector: angle -165°..-98°, r = 74..176m)
  const ruinsList = (byRegion.get('forgotten_ruins') ?? []).sort(
    (a, b) => (b.closedAt ?? b.lastVisitedAt) - (a.closedAt ?? a.lastVisitedAt),
  );
  ruinsList.forEach((rec, idx) => {
    const row = Math.floor(idx / 6);
    const col = idx % 6;
    const radius = Math.min(180, 78 + row * 20 + hash01(rec.id + 'r') * 7);
    const angle = -2.85 + (col / 5) * 1.15 + (hash01(rec.id + 'a') - 0.5) * 0.1;
    const x = Number((Math.sin(angle) * radius).toFixed(2));
    const z = Number((Math.cos(angle) * radius).toFixed(2));
    placed.push(makeNodeFromRecord(rec, x, z, Math.atan2(-x, -z), 1.0));
  });

  // 4. Archive Mountains (outer south-eastern & eastern ridge: angle +112°..+195°, r = 188..304m)
  const archiveList = (byRegion.get('archive_mountains') ?? []).sort(
    (a, b) => b.lastVisitedAt - a.lastVisitedAt,
  );
  archiveList.forEach((rec, idx) => {
    const row = Math.floor(idx / 10);
    const col = idx % 10;
    const radius = Math.min(308, 192 + row * 22 + hash01(rec.id + 'r') * 10);
    const angle = 1.98 + (col / 9) * 1.42 + (hash01(rec.id + 'a') - 0.5) * 0.08;
    const x = Number((Math.sin(angle) * radius).toFixed(2));
    const z = Number((Math.cos(angle) * radius).toFixed(2));
    placed.push(makeNodeFromRecord(rec, x, z, Math.atan2(-x, -z), 0.94));
  });

  // 5. Portal Halls (north-western plateau: angle -86°..-26°, r = 82..178m)
  const hallsList = (byRegion.get('portal_halls') ?? []).sort((a, b) => {
    if (a.type === 'collection' && b.type !== 'collection') return -1;
    if (b.type === 'collection' && a.type !== 'collection') return 1;
    return b.lastVisitedAt - a.lastVisitedAt;
  });
  hallsList.forEach((rec, idx) => {
    const row = Math.floor(idx / 6);
    const col = idx % 6;
    const radius = Math.min(184, 84 + row * 22 + (rec.type === 'collection' ? -6 : 6));
    const angle = -1.48 + (col / 5) * 1.02 + (hash01(rec.id + 'a') - 0.5) * 0.08;
    const x = Number((Math.sin(angle) * radius).toFixed(2));
    const z = Number((Math.cos(angle) * radius).toFixed(2));
    placed.push(
      makeNodeFromRecord(rec, x, z, Math.atan2(-x, -z), rec.type === 'collection' ? 1.18 : 1.04),
    );
  });

  return placed;
}

function makeNodeFromRecord(
  rec: PortalRecord,
  x: number,
  z: number,
  facingRad: number,
  scale: number,
): SpatialPortalNode {
  return {
    id: rec.id,
    recordId: rec.id,
    sanctuaryAction: null,
    regionId: rec.regionId,
    visualState: rec.visualState,
    title: rec.title,
    domain: rec.domain,
    url: rec.url,
    faviconGlyph: rec.faviconGlyph,
    lastVisitedAt: rec.lastVisitedAt,
    tabCount: rec.tabCount,
    recoverable: rec.recoverable,
    pinned: rec.pinned,
    loading: Boolean(rec.loading),
    collectionId: rec.collectionId,
    sessionMeta: rec.sessionMeta,
    x,
    z,
    facingRad,
    scale,
  };
}

/**
 * Spatial LOD & clustering algorithm so the 3D world smoothly supports hundreds of
 * browsing history portals without creating expensive individual 3D meshes for all of them.
 * - Always keeps Central Sanctuary gateways detailed when within 120m.
 * - Selects the nearest `maxDetailed` world portals for detailed 3D archway rendering.
 * - Aggregates remaining distant portals into spatial cell clusters rendered via InstancedMesh.
 */
export function partitionPortalsForRendering(
  sanctuaryNodes: readonly SpatialPortalNode[],
  recordNodes: readonly SpatialPortalNode[],
  playerX: number,
  playerZ: number,
  maxDetailed = 18,
  clusterCellSize = 38,
): PortalLodPartition {
  const detailedNodes: SpatialPortalNode[] = [];
  const distantCandidates: SpatialPortalNode[] = [];

  for (const sNode of sanctuaryNodes) {
    const dist = Math.hypot(sNode.x - playerX, sNode.z - playerZ);
    if (dist <= 155) {
      detailedNodes.push(sNode);
    } else {
      distantCandidates.push(sNode);
    }
  }

  const scored = recordNodes.map((node) => {
    const dist = Math.hypot(node.x - playerX, node.z - playerZ);
    // Prioritize closer portals, with a gentle bias for active & pinned gateways
    const priorityBoost =
      node.visualState === 'active' ? -22 : node.visualState === 'pinned' ? -14 : 0;
    return { node, dist, score: dist + priorityBoost };
  });

  scored.sort((a, b) => a.score - b.score);

  const detailBudget = Math.max(4, maxDetailed);
  for (let i = 0; i < scored.length; i++) {
    const item = scored[i];
    if (i < detailBudget && item.dist <= 165) {
      detailedNodes.push(item.node);
    } else {
      distantCandidates.push(item.node);
    }
  }

  // Group distant portals into spatial clusters
  const clusterMap = new Map<
    string,
    {
      regionId: PortalRegionId;
      visualState: PortalVisualState;
      sumX: number;
      sumZ: number;
      count: number;
      representativeTitle: string;
      sampleRecordId: string;
    }
  >();

  for (const node of distantCandidates) {
    const cx = Math.floor(node.x / clusterCellSize);
    const cz = Math.floor(node.z / clusterCellSize);
    const key = `${node.regionId}:${cx}:${cz}`;
    const existing = clusterMap.get(key);
    if (existing) {
      existing.sumX += node.x;
      existing.sumZ += node.z;
      existing.count += 1;
      if (node.visualState === 'pinned' || node.visualState === 'active') {
        existing.visualState = node.visualState;
      }
    } else {
      clusterMap.set(key, {
        regionId: node.regionId,
        visualState: node.visualState,
        sumX: node.x,
        sumZ: node.z,
        count: 1,
        representativeTitle: node.title,
        sampleRecordId: node.id,
      });
    }
  }

  const distantClusters: SpatialPortalCluster[] = [];
  clusterMap.forEach((entry, key) => {
    distantClusters.push({
      id: `cluster-${key}`,
      regionId: entry.regionId,
      visualState: entry.visualState,
      x: Number((entry.sumX / entry.count).toFixed(2)),
      z: Number((entry.sumZ / entry.count).toFixed(2)),
      count: entry.count,
      representativeTitle:
        entry.count > 1 ? `${entry.representativeTitle} (+${entry.count - 1})` : entry.representativeTitle,
      sampleRecordId: entry.sampleRecordId,
    });
  });

  return {
    detailedNodes,
    distantClusters,
    totalPortalCount: sanctuaryNodes.length + recordNodes.length,
  };
}

/**
 * Determines which of the 6 Portal Memory world regions the player currently occupies.
 */
export function detectRegionAtPosition(x: number, z: number): PortalRegionId {
  const dist = Math.hypot(x, z);
  if (dist <= 38) return 'central_sanctuary';

  const angle = Math.atan2(x, z); // 0 = +Z (North), +PI/2 = +X (East), -PI/2 = -X (West)
  if (dist <= 82 && Math.abs(angle) <= 0.92) {
    return 'active_gateway';
  }
  if (angle >= -1.65 && angle < -0.35 && dist <= 200) {
    return 'portal_halls';
  }
  if (angle < -1.65 || (z < -42 && x < 24 && dist <= 200)) {
    return 'forgotten_ruins';
  }
  if (dist > 182 && x > -30) {
    return 'archive_mountains';
  }
  return 'memory_forest';
}

export function getRegionWaypointCoords(regionId: PortalRegionId): { x: number; z: number } {
  const meta = PORTAL_REGIONS[regionId];
  return { x: meta.centerX, z: meta.centerZ };
}
