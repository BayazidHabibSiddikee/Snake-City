import type { BiomeId } from '../../types';
import {
  PORTAL_REGIONS,
  PortalRegionId,
  PortalVisualState,
} from '../../ecosystem/memory/RetentionPolicy';
import { MemoryService } from '../../ecosystem/memory/MemoryService';
import {
  PortalLodPartition,
  SpatialPortalNode,
  buildCentralSanctuaryGateways,
  detectRegionAtPosition,
  layoutPortalRecordsInWorld,
  partitionPortalsForRendering,
} from './PortalClusters';
import { PortalInteraction, PortalProximityPrompt } from './PortalInteraction';
import { PortalRenderer } from './PortalRenderer';

export interface PortalMinimapBlip {
  id: string;
  x: number;
  z: number;
  visualState: PortalVisualState;
  regionId: PortalRegionId;
  isSanctuary: boolean;
  count: number;
}

export interface PortalWorldUpdateResult {
  prompt: PortalProximityPrompt | null;
  promptChanged: boolean;
  regionId: PortalRegionId;
  regionChanged: boolean;
  walkInNode: SpatialPortalNode | null;
}

/**
 * Coordinates spatial layout, proximity LOD partitioning, Three.js rendering,
 * region transition tracking, and player interaction for Portal Memory.
 */
export class PortalManager {
  public readonly memory: MemoryService;
  public readonly interaction = new PortalInteraction();
  private renderer: PortalRenderer | null = null;

  private readonly sanctuaryNodes: SpatialPortalNode[];
  private recordNodes: SpatialPortalNode[] = [];
  private currentPartition: PortalLodPartition = {
    detailedNodes: [],
    distantClusters: [],
    totalPortalCount: 0,
  };

  private currentRegion: PortalRegionId = 'central_sanctuary';
  private lastLodX = Number.NaN;
  private lastLodZ = Number.NaN;
  private layoutDirty = true;

  constructor(memoryService: MemoryService) {
    this.memory = memoryService;
    this.sanctuaryNodes = buildCentralSanctuaryGateways();
    this.memory.subscribe(() => {
      this.rebuildRecordLayout();
    });
    this.rebuildRecordLayout();
  }

  public attachRenderer(renderer: PortalRenderer): void {
    this.renderer = renderer;
    this.layoutDirty = true;
    this.recomputeLod(0, 0, true);
  }

  public setBiome(biome: BiomeId): void {
    this.renderer?.setBiome(biome);
  }

  public rebuildRecordLayout(): void {
    this.recordNodes = layoutPortalRecordsInWorld(this.memory.getAllRecords());
    this.layoutDirty = true;
    if (Number.isFinite(this.lastLodX) && Number.isFinite(this.lastLodZ)) {
      this.recomputeLod(this.lastLodX, this.lastLodZ, true);
    } else {
      this.recomputeLod(0, 0, true);
    }
  }

  public recomputeLod(playerX: number, playerZ: number, force = false): PortalLodPartition {
    const moved =
      !Number.isFinite(this.lastLodX) ||
      Math.hypot(playerX - this.lastLodX, playerZ - this.lastLodZ) >= 16;

    if (!force && !this.layoutDirty && !moved) {
      return this.currentPartition;
    }

    this.lastLodX = playerX;
    this.lastLodZ = playerZ;
    this.layoutDirty = false;

    this.currentPartition = partitionPortalsForRendering(
      this.sanctuaryNodes,
      this.recordNodes,
      playerX,
      playerZ,
      18,
      38,
    );

    this.renderer?.syncLayout(
      this.currentPartition.detailedNodes,
      this.currentPartition.distantClusters,
    );
    return this.currentPartition;
  }

  public update(
    dt: number,
    elapsedSec: number,
    playerX: number,
    playerZ: number,
    allowWalkIn: boolean,
  ): PortalWorldUpdateResult {
    this.recomputeLod(playerX, playerZ, false);
    this.renderer?.update(dt, elapsedSec, playerX, playerZ);

    const nextRegion = detectRegionAtPosition(playerX, playerZ);
    const regionChanged = nextRegion !== this.currentRegion;
    this.currentRegion = nextRegion;

    const evalRes = this.interaction.evaluate(
      this.currentPartition.detailedNodes,
      playerX,
      playerZ,
      allowWalkIn,
    );

    return {
      prompt: evalRes.prompt,
      promptChanged: evalRes.promptChanged,
      regionId: this.currentRegion,
      regionChanged,
      walkInNode: evalRes.walkInTriggeredNode,
    };
  }

  public getCurrentRegion(): PortalRegionId {
    return this.currentRegion;
  }

  public getCurrentRegionName(): string {
    return PORTAL_REGIONS[this.currentRegion]?.name ?? 'Central Sanctuary';
  }

  public getAllSpatialNodes(): SpatialPortalNode[] {
    return [...this.sanctuaryNodes, ...this.recordNodes];
  }

  public findNodeById(id: string): SpatialPortalNode | null {
    const sanctuary = this.sanctuaryNodes.find((n) => n.id === id);
    if (sanctuary) return sanctuary;
    return this.recordNodes.find((n) => n.id === id) ?? null;
  }

  public getPartition(): Readonly<PortalLodPartition> {
    return this.currentPartition;
  }

  public getMinimapBlips(): PortalMinimapBlip[] {
    const blips: PortalMinimapBlip[] = [];
    for (const node of this.currentPartition.detailedNodes) {
      blips.push({
        id: node.id,
        x: node.x,
        z: node.z,
        visualState: node.visualState,
        regionId: node.regionId,
        isSanctuary: Boolean(node.sanctuaryAction),
        count: node.tabCount,
      });
    }
    for (const cluster of this.currentPartition.distantClusters) {
      blips.push({
        id: cluster.id,
        x: cluster.x,
        z: cluster.z,
        visualState: cluster.visualState,
        regionId: cluster.regionId,
        isSanctuary: false,
        count: cluster.count,
      });
    }
    return blips;
  }

  public dispose(): void {
    this.renderer?.dispose();
    this.renderer = null;
  }
}
