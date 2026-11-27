import * as THREE from 'three';
import {
  PORTAL_REGIONS,
  PortalRegionId,
  PortalVisualState,
  formatRelativeVisitTime,
} from '../../ecosystem/memory/RetentionPolicy';

export interface PortalStateVisualProfile {
  state: PortalVisualState;
  label: string;
  primaryHex: string;
  primaryNum: number;
  secondaryHex: string;
  secondaryNum: number;
  emissiveIntensity: number;
  ringSpinSpeed: number;
  pulseAmp: number;
  pulseFreq: number;
  fragmentedParticles: boolean;
  goldenFrame: boolean;
  persistentBeacon: boolean;
}

export const PORTAL_VISUAL_PROFILES: Record<PortalVisualState, PortalStateVisualProfile> = {
  active: {
    state: 'active',
    label: 'ACTIVE TAB',
    primaryHex: '#2de3ff',
    primaryNum: 0x2de3ff,
    secondaryHex: '#7ef2ff',
    secondaryNum: 0x7ef2ff,
    emissiveIntensity: 1.55,
    ringSpinSpeed: 2.15,
    pulseAmp: 0.34,
    pulseFreq: 3.1,
    fragmentedParticles: false,
    goldenFrame: false,
    persistentBeacon: true,
  },
  saved: {
    state: 'saved',
    label: 'SAVED MEMORY',
    primaryHex: '#3de095',
    primaryNum: 0x3de095,
    secondaryHex: '#a7f3d0',
    secondaryNum: 0xa7f3d0,
    emissiveIntensity: 1.05,
    ringSpinSpeed: 0.58,
    pulseAmp: 0.09,
    pulseFreq: 1.35,
    fragmentedParticles: false,
    goldenFrame: false,
    persistentBeacon: false,
  },
  lost: {
    state: 'lost',
    label: 'LOST · RECOVERABLE',
    primaryHex: '#a855f7',
    primaryNum: 0xa855f7,
    secondaryHex: '#e9d5ff',
    secondaryNum: 0xe9d5ff,
    emissiveIntensity: 1.38,
    ringSpinSpeed: -1.2,
    pulseAmp: 0.28,
    pulseFreq: 2.6,
    fragmentedParticles: true,
    goldenFrame: false,
    persistentBeacon: false,
  },
  pinned: {
    state: 'pinned',
    label: 'PINNED GATEWAY',
    primaryHex: '#f2c14e',
    primaryNum: 0xf2c14e,
    secondaryHex: '#fef08a',
    secondaryNum: 0xfef08a,
    emissiveIntensity: 1.4,
    ringSpinSpeed: 0.92,
    pulseAmp: 0.14,
    pulseFreq: 1.8,
    fragmentedParticles: false,
    goldenFrame: true,
    persistentBeacon: true,
  },
};

export interface PortalSignageDescriptor {
  title: string;
  domain: string;
  faviconGlyph: string;
  visualState: PortalVisualState;
  regionId: PortalRegionId;
  lastVisitedAt: number;
  tabCount: number;
  recoverable: boolean;
  isSanctuaryHub?: boolean;
  loading?: boolean;
  customBadge?: string;
}

function truncateLabel(text: string, maxChars: number): string {
  const clean = String(text ?? '').trim();
  if (clean.length <= maxChars) return clean;
  return `${clean.slice(0, Math.max(1, maxChars - 1))}…`;
}

/**
 * Draws a crisp power-of-2 (512×256) procedural CanvasTexture identity plaque for a 3D portal
 * showing website monogram/favicon, title, domain, last visited time, tab counter, and status.
 */
export function createPortalIdentityTexture(
  desc: PortalSignageDescriptor,
  maxAnisotropy = 4,
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const profile = PORTAL_VISUAL_PROFILES[desc.visualState] ?? PORTAL_VISUAL_PROFILES.saved;
  const regionMeta = PORTAL_REGIONS[desc.regionId] ?? PORTAL_REGIONS.central_sanctuary;

  // Deep obsidian plate background
  const grad = ctx.createLinearGradient(0, 0, 512, 256);
  grad.addColorStop(0, 'rgba(7, 17, 23, 0.96)');
  grad.addColorStop(1, 'rgba(13, 27, 35, 0.96)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);

  // Accent top band
  ctx.fillStyle = profile.primaryHex;
  ctx.fillRect(0, 0, 512, 7);

  // Outer frame border (extra golden double-trim for pinned portals)
  ctx.strokeStyle = profile.goldenFrame ? '#f2c14e' : profile.primaryHex;
  ctx.lineWidth = profile.goldenFrame ? 6 : 3;
  ctx.strokeRect(5, 5, 502, 246);
  if (profile.goldenFrame) {
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(13, 13, 486, 230);
  }

  // Favicon identity square
  const iconX = 28;
  const iconY = 34;
  const iconSize = 68;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.fillRect(iconX, iconY, iconSize, iconSize);
  ctx.strokeStyle = profile.primaryHex;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(iconX, iconY, iconSize, iconSize);

  ctx.fillStyle = profile.secondaryHex;
  ctx.font = '800 30px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(truncateLabel(desc.faviconGlyph || 'PT', 2), iconX + iconSize / 2, iconY + iconSize / 2 + 1);

  // State label top-left next to icon
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const badgeText = desc.customBadge
    ? desc.customBadge
    : desc.isSanctuaryHub
      ? 'SANCTUARY GATEWAY'
      : desc.loading
        ? 'ACTIVE · LOADING'
        : profile.label;

  ctx.fillStyle = profile.primaryHex;
  ctx.font = '800 15px "JetBrains Mono", monospace, sans-serif';
  ctx.fillText(badgeText, 114, 52);

  // Tab counter on top-right if > 1 or collection
  if (desc.tabCount > 1) {
    const countLabel = `${desc.tabCount} TABS`;
    ctx.font = '800 14px "JetBrains Mono", monospace, sans-serif';
    const w = ctx.measureText(countLabel).width + 20;
    ctx.fillStyle = 'rgba(45, 227, 255, 0.16)';
    ctx.fillRect(486 - w, 30, w, 26);
    ctx.strokeStyle = profile.primaryHex;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(486 - w, 30, w, 26);
    ctx.fillStyle = '#f2fbf8';
    ctx.textAlign = 'center';
    ctx.fillText(countLabel, 486 - w / 2, 48);
    ctx.textAlign = 'left';
  }

  // Website Title
  ctx.fillStyle = '#f3fbf8';
  ctx.font = '700 28px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText(truncateLabel(desc.title || desc.domain, 23), 114, 92);

  // Domain
  ctx.fillStyle = '#9ac4b6';
  ctx.font = '500 18px "JetBrains Mono", monospace, sans-serif';
  ctx.fillText(truncateLabel(desc.domain, 34), 28, 146);

  // Divider line
  ctx.strokeStyle = 'rgba(182, 224, 206, 0.16)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(28, 168);
  ctx.lineTo(484, 168);
  ctx.stroke();

  // Footer metadata: Region + Last Visited + Restore/Action status
  ctx.fillStyle = '#7ba89a';
  ctx.font = '600 15px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText(regionMeta.name.toUpperCase(), 28, 200);

  const visitedText = desc.isSanctuaryHub
    ? 'ALWAYS READY'
    : desc.lastVisitedAt > 0
      ? `VISITED ${formatRelativeVisitTime(desc.lastVisitedAt).toUpperCase()}`
      : 'SAVED GATEWAY';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#b9dcd0';
  ctx.fillText(visitedText, 484, 200);

  // Bottom prompt line
  ctx.textAlign = 'left';
  const promptText = desc.isSanctuaryHub
    ? 'WALK THROUGH OR PRESS [U] TO OPEN'
    : desc.visualState === 'lost'
      ? 'RECOVERABLE SESSION · PRESS [U] TO RESTORE'
      : desc.visualState === 'active'
        ? 'OPEN SESSION · PRESS [U] TO ENTER TAB'
        : 'PRESS [U] TO REOPEN DESTINATION';
  ctx.fillStyle = profile.secondaryHex;
  ctx.font = '700 14px "JetBrains Mono", monospace, sans-serif';
  ctx.fillText(promptText, 28, 232);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, Math.max(1, maxAnisotropy));
  texture.needsUpdate = true;
  return texture;
}
