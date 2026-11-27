import {
  PORTAL_REGIONS,
  formatRelativeVisitTime,
} from '../../ecosystem/memory/RetentionPolicy';
import { PORTAL_VISUAL_PROFILES } from './PortalEffects';
import type { SpatialPortalNode } from './PortalClusters';

export interface PortalProximityPrompt {
  node: SpatialPortalNode;
  distanceM: number;
  regionName: string;
  stateLabel: string;
  accentHex: string;
  lastVisitedLabel: string;
  actionLabel: string;
  canRecover: boolean;
  canPin: boolean;
  canDelete: boolean;
  isSanctuaryHub: boolean;
}

const PROMPT_RADIUS = 14.5;
const WALKIN_RADIUS = 3.5;
const WALKIN_COOLDOWN_MS = 4200;

/**
 * Tracks player proximity to Portal Memory archways and Central Sanctuary gateways.
 * Never loads website content automatically on proximity — content only loads when
 * the user explicitly activates the portal (presses [U], clicks the prompt, or walks
 * directly through the glowing portal core).
 */
export class PortalInteraction {
  private activePrompt: PortalProximityPrompt | null = null;
  private lastTriggeredNodeId: string | null = null;
  private lastTriggerAtMs = 0;

  public getPrompt(): PortalProximityPrompt | null {
    return this.activePrompt;
  }

  public suppressWalkInBriefly(nodeId?: string): void {
    this.lastTriggeredNodeId = nodeId ?? this.activePrompt?.node.id ?? null;
    this.lastTriggerAtMs = Date.now();
  }

  public evaluate(
    detailedNodes: readonly SpatialPortalNode[],
    playerX: number,
    playerZ: number,
    allowWalkIn: boolean,
  ): {
    prompt: PortalProximityPrompt | null;
    promptChanged: boolean;
    walkInTriggeredNode: SpatialPortalNode | null;
  } {
    let bestNode: SpatialPortalNode | null = null;
    let bestDist = PROMPT_RADIUS;

    for (const node of detailedNodes) {
      const dist = Math.hypot(node.x - playerX, node.z - playerZ);
      if (dist < bestDist) {
        bestDist = dist;
        bestNode = node;
      }
    }

    const prevId = this.activePrompt?.node.id ?? null;
    const prevState = this.activePrompt?.node.visualState ?? null;
    const prevPinned = this.activePrompt?.node.pinned ?? false;

    if (!bestNode) {
      this.activePrompt = null;
      return {
        prompt: null,
        promptChanged: prevId !== null,
        walkInTriggeredNode: null,
      };
    }

    const profile = PORTAL_VISUAL_PROFILES[bestNode.visualState] ?? PORTAL_VISUAL_PROFILES.saved;
    const regionMeta = PORTAL_REGIONS[bestNode.regionId] ?? PORTAL_REGIONS.central_sanctuary;
    const isSanctuaryHub = Boolean(bestNode.sanctuaryAction);

    const actionLabel = isSanctuaryHub
      ? bestNode.sanctuaryAction === 'atlas'
        ? 'Open Portal Atlas'
        : `Open ${bestNode.title}`
      : bestNode.visualState === 'lost'
        ? 'Recover Lost Session'
        : bestNode.collectionId
          ? 'Open Gateway Collection'
          : bestNode.visualState === 'active'
            ? 'Enter Active Tab'
            : 'Reopen Memory Portal';

    const nextPrompt: PortalProximityPrompt = {
      node: bestNode,
      distanceM: Number(bestDist.toFixed(1)),
      regionName: regionMeta.name,
      stateLabel: isSanctuaryHub ? 'SANCTUARY HUB' : profile.label,
      accentHex: profile.primaryHex,
      lastVisitedLabel: isSanctuaryHub
        ? 'Central Sanctuary'
        : formatRelativeVisitTime(bestNode.lastVisitedAt),
      actionLabel,
      canRecover: bestNode.visualState === 'lost' && bestNode.recoverable,
      canPin: !isSanctuaryHub && Boolean(bestNode.recordId),
      canDelete: !isSanctuaryHub && Boolean(bestNode.recordId),
      isSanctuaryHub,
    };

    this.activePrompt = nextPrompt;
    const promptChanged =
      prevId !== bestNode.id ||
      prevState !== bestNode.visualState ||
      prevPinned !== bestNode.pinned;

    let walkInTriggeredNode: SpatialPortalNode | null = null;
    if (allowWalkIn && bestDist <= WALKIN_RADIUS) {
      const now = Date.now();
      const cooledDown =
        this.lastTriggeredNodeId !== bestNode.id || now - this.lastTriggerAtMs >= WALKIN_COOLDOWN_MS;
      if (cooledDown) {
        this.lastTriggeredNodeId = bestNode.id;
        this.lastTriggerAtMs = now;
        walkInTriggeredNode = bestNode;
      }
    }

    return {
      prompt: nextPrompt,
      promptChanged,
      walkInTriggeredNode,
    };
  }
}
