import * as THREE from 'three';
import type { BiomeId } from '../../types';
import {
  PORTAL_REGIONS,
  PortalRegionId,
  PortalRegionMeta,
} from '../../ecosystem/memory/RetentionPolicy';
import { MemoryService } from '../../ecosystem/memory/MemoryService';
import type { SpatialPortalNode } from './PortalClusters';
import type { PortalProximityPrompt } from './PortalInteraction';
import { PortalManager, PortalMinimapBlip } from './PortalManager';
import { PortalRenderer } from './PortalRenderer';

export interface PortalWorldEvents {
  onPromptChange?: (prompt: PortalProximityPrompt | null) => void;
  onRegionChange?: (region: PortalRegionMeta) => void;
  onActivatePortal?: (node: SpatialPortalNode) => void;
}

/**
 * Public facade for the 3D Portal Memory subsystem (`src/game/portal-world`).
 * Mounts cleanly into WorldEngine's Three.js scene and exposes controlled methods
 * to SnakeGameController and GameUI without exposing raw storage or mesh internals.
 */
export class PortalWorld {
  public readonly memory: MemoryService;
  public readonly manager: PortalManager;
  private renderer: PortalRenderer | null = null;
  private events: PortalWorldEvents = {};

  constructor(memoryService?: MemoryService) {
    this.memory = memoryService ?? new MemoryService();
    this.manager = new PortalManager(this.memory);
  }

  public setEvents(events: PortalWorldEvents): void {
    this.events = events;
  }

  public attachToScene(scene: THREE.Scene, maxAnisotropy = 4): void {
    if (this.renderer) {
      scene.remove(this.renderer.rootGroup);
      this.renderer.dispose();
    }
    this.renderer = new PortalRenderer(maxAnisotropy);
    scene.add(this.renderer.rootGroup);
    this.manager.attachRenderer(this.renderer);
  }

  public setBiome(biome: BiomeId): void {
    this.manager.setBiome(biome);
  }

  public update(
    dt: number,
    elapsedSec: number,
    playerX: number,
    playerZ: number,
    allowWalkIn = true,
  ): void {
    const res = this.manager.update(dt, elapsedSec, playerX, playerZ, allowWalkIn);
    if (res.regionChanged) {
      const meta = PORTAL_REGIONS[res.regionId];
      if (meta) this.events.onRegionChange?.(meta);
    }
    if (res.promptChanged) {
      this.events.onPromptChange?.(res.prompt);
    }
    if (res.walkInNode) {
      this.events.onActivatePortal?.(res.walkInNode);
    }
  }

  public activateNearestPortal(): SpatialPortalNode | null {
    const prompt = this.manager.interaction.getPrompt();
    if (!prompt) return null;
    this.manager.interaction.suppressWalkInBriefly(prompt.node.id);
    this.events.onActivatePortal?.(prompt.node);
    return prompt.node;
  }

  public activatePortalById(nodeId: string): SpatialPortalNode | null {
    const node = this.manager.findNodeById(nodeId);
    if (!node) return null;
    this.manager.interaction.suppressWalkInBriefly(node.id);
    this.events.onActivatePortal?.(node);
    return node;
  }

  public getProximityPrompt(): PortalProximityPrompt | null {
    return this.manager.interaction.getPrompt();
  }

  public getCurrentRegion(): PortalRegionMeta {
    const id: PortalRegionId = this.manager.getCurrentRegion();
    return PORTAL_REGIONS[id] ?? PORTAL_REGIONS.central_sanctuary;
  }

  public getMinimapBlips(): PortalMinimapBlip[] {
    return this.manager.getMinimapBlips();
  }

  public dispose(scene?: THREE.Scene): void {
    if (this.renderer && scene) {
      scene.remove(this.renderer.rootGroup);
    }
    this.manager.dispose();
    this.renderer = null;
  }
}
