import { BiomeId, FormationProp } from './types';

export type SentryArchetypeId =
  | 'lantern_watcher'
  | 'rift_sentinel'
  | 'whisper_hound'
  | 'ash_inquisitor'
  | 'soul_proctor';

export type SentryPatrolMode = 'circular' | 'search' | 'alert' | 'banished';

export type SoulArchiveCategory = 'sentry' | 'chronicle';

export interface SentryArchetypeProfile {
  id: SentryArchetypeId;
  name: string;
  subtitle: string;
  rankLabel: string;
  accentHex: string;
  accentColorNum: number;
  cloakColorNum: number;
  orbitRadius: number;
  orbitSpeed: number; // rad/s
  searchSpeed: number; // m/s
  visionRange: number; // m
  visionHalfAngle: number; // radians
  activitySenseRadius: number; // m
  maxHp: number;
  weaknessHint: string;
  patrolDoctrine: string;
}

export const SENTRY_ARCHETYPES: Record<SentryArchetypeId, SentryArchetypeProfile> = {
  lantern_watcher: {
    id: 'lantern_watcher',
    name: 'Lantern Watcher',
    subtitle: 'Censer-Bearer of the Outer Mist',
    rankLabel: 'Outer Watch',
    accentHex: '#c084fc',
    accentColorNum: 0xc084fc,
    cloakColorNum: 0x1c1430,
    orbitRadius: 11.2,
    orbitSpeed: 0.44,
    searchSpeed: 6.4,
    visionRange: 17.5,
    visionHalfAngle: 0.52,
    activitySenseRadius: 24,
    maxHp: 3,
    weaknessHint: 'Veil of Shadow (Shift / X) halves its lantern sight; Shockwave (Q) banishes instantly.',
    patrolDoctrine: 'Circles portal thresholds at a measured cadence; drifts into wide lantern sweeps if footsteps or Dou Qi ripple nearby.',
  },
  rift_sentinel: {
    id: 'rift_sentinel',
    name: 'Rift Sentinel',
    subtitle: 'Warden of the Fractured Arch',
    rankLabel: 'Gatekeeper',
    accentHex: '#38bdf8',
    accentColorNum: 0x38bdf8,
    cloakColorNum: 0x132033,
    orbitRadius: 12.6,
    orbitSpeed: 0.5,
    searchSpeed: 7.2,
    visionRange: 19.5,
    visionHalfAngle: 0.56,
    activitySenseRadius: 26,
    maxHp: 3,
    weaknessHint: 'Phase through its peripheral arc with Dash Strike (E) or break its seal with Shockwave (Q).',
    patrolDoctrine: 'Orbits wider than Lantern Watchers and rapidly pivots to comb the portal approach whenever dimensional ripples stir.',
  },
  whisper_hound: {
    id: 'whisper_hound',
    name: 'Whisper Hound',
    subtitle: 'Tracker of Dou Qi Echoes',
    rankLabel: 'Acoustic Scout',
    accentHex: '#3de095',
    accentColorNum: 0x3de095,
    cloakColorNum: 0x112523,
    orbitRadius: 10.4,
    orbitSpeed: 0.62,
    searchSpeed: 8.1,
    visionRange: 16.5,
    visionHalfAngle: 0.48,
    activitySenseRadius: 31,
    maxHp: 3,
    weaknessHint: 'Avoid boosting or firing bolts near its portal—enter Stealth Veil (Shift / X) early before closing in.',
    patrolDoctrine: 'Keenly attuned to movement and spell echoes; snaps out of circular orbit at long range to zig-zag across disturbances.',
  },
  ash_inquisitor: {
    id: 'ash_inquisitor',
    name: 'Ash-Veil Inquisitor',
    subtitle: 'Keeper of the Sealed Reliquary',
    rankLabel: 'High Sealer',
    accentHex: '#fb923c',
    accentColorNum: 0xfb923c,
    cloakColorNum: 0x2a1816,
    orbitRadius: 13.4,
    orbitSpeed: 0.47,
    searchSpeed: 7.5,
    visionRange: 21.5,
    visionHalfAngle: 0.6,
    activitySenseRadius: 27,
    maxHp: 4,
    weaknessHint: 'Broad cone of crimson ember-sight; cleanse it with Shockwave (Q) or Heavenly Flame Lotus (R).',
    patrolDoctrine: 'Sweeps slow, unforgiving arcs over high-altitude portals and lingers longer in Search mode once provoked.',
  },
  soul_proctor: {
    id: 'soul_proctor',
    name: 'Crowned Soul Proctor',
    subtitle: 'Emissary of the Ninth Hall',
    rankLabel: 'Inner Sanctum',
    accentHex: '#f2c14e',
    accentColorNum: 0xf2c14e,
    cloakColorNum: 0x241634,
    orbitRadius: 14.2,
    orbitSpeed: 0.56,
    searchSpeed: 8.4,
    visionRange: 23.0,
    visionHalfAngle: 0.62,
    activitySenseRadius: 30,
    maxHp: 4,
    weaknessHint: 'Combine Stealth Veil (Shift / X) to slip past its golden eye, or unleash Flame Lotus (R) for a 30s banishment.',
    patrolDoctrine: 'Commands the tightest portal wards on the peaks, alternating circular orbit with relentless multi-point search sweeps.',
  },
};

export const SENTRY_ARCHETYPE_ORDER: SentryArchetypeId[] = [
  'lantern_watcher',
  'rift_sentinel',
  'whisper_hound',
  'ash_inquisitor',
  'soul_proctor',
];

export interface SoulSentryEntity {
  id: string;
  portalId: string;
  portalX: number;
  portalZ: number;
  archetype: SentryArchetypeId;
  name: string;
  subtitle: string;
  x: number;
  y: number;
  z: number;
  heading: number;
  hoverPhase: number;
  patrolMode: SentryPatrolMode;
  orbitAngle: number;
  orbitRadius: number;
  orbitDir: 1 | -1;
  orbitSpeed: number;
  searchSpeed: number;
  visionRange: number;
  visionHalfAngle: number;
  activitySenseRadius: number;
  suspicion: number; // 0..1
  searchTimer: number;
  searchOriginX: number;
  searchOriginZ: number;
  searchWaypoints: Array<{ x: number; z: number }>;
  searchWaypointIdx: number;
  searchSweepPhase: number;
  alertTimer: number;
  alertShotCooldown: number;
  banishTimer: number;
  portalLockTimer: number;
  hp: number;
  maxHp: number;
  encounterRecorded: boolean;
}

export interface SentryStepInput {
  playerX: number;
  playerZ: number;
  playerSpeed: number;
  isStealth: boolean;
  isBoosting: boolean;
  isDashing: boolean;
  recentSpellPulse: number; // 0..1
  spellOriginX: number;
  spellOriginZ: number;
}

export interface SentryStepOutcome {
  encounteredNow: boolean;
  switchedToSearch: boolean;
  returnedToCircular: boolean;
  triggeredAlert: boolean;
  fireAlertBolt: boolean;
  reformedFromBanish: boolean;
  distToPlayer: number;
}

export interface SoulArchiveEntryDef {
  id: string;
  category: SoulArchiveCategory;
  archetypeId?: SentryArchetypeId;
  eraLabel: string;
  title: string;
  subtitle: string;
  accentHex: string;
  unlockHint: string;
  excerpt: string;
  bodyParagraphs: string[];
  fieldNotes: string;
}

export const SOUL_ARCHIVE_CATALOG: readonly SoulArchiveEntryDef[] = [
  {
    id: 'lantern_watcher',
    category: 'sentry',
    archetypeId: 'lantern_watcher',
    eraLabel: 'First Watch · Era of Pale Cinders',
    title: 'Lantern Watcher',
    subtitle: 'Censer-Bearer of the Outer Mist',
    accentHex: '#c084fc',
    unlockHint: 'Encounter a Lantern Watcher patrolling near any mountain portal.',
    excerpt: 'Bound to cold-iron spirit lanterns, the Watchers were the Soul Clan’s earliest attempt to seal mountain rifts against ascending beasts.',
    bodyParagraphs: [
      'When the first fractures opened across the Serpent Peaks, Soul Hall elders distilled lingering battle-mist into suspended brass censers. Each Lantern Watcher is tethered to a single portal ring, tracing an unbroken circle so no stray spirit may slip across without paying tribute.',
      'Though their gaze appears tranquil in circular orbit, their lantern flames shiver violently the moment uncloaked Dou Qi approaches. Any swift footstep or careless spark pulls them off their circular path into an active sweeping search across the portal steps.',
    ],
    fieldNotes: 'Engage Stealth Veil (Shift / X) to shrink their detection cone by more than half, or shatter their tether with Shockwave (Q).',
  },
  {
    id: 'rift_sentinel',
    category: 'sentry',
    archetypeId: 'rift_sentinel',
    eraLabel: 'Second Watch · The Mirror Schism',
    title: 'Rift Sentinel',
    subtitle: 'Warden of the Fractured Arch',
    accentHex: '#38bdf8',
    unlockHint: 'Encounter a Rift Sentinel hovering near a dimensional portal.',
    excerpt: 'Forged from shattered mirror-glass and frozen meridian shards, Rift Sentinels stand vigil over portals linking to the 360° Hall of Mirrors.',
    bodyParagraphs: [
      'During the Mirror Schism, dozens of rogue cultivators escaped the Soul Clan by diving into rolling browser pocket-worlds concealed inside mountain archways. In answer, the Clan’s artificers clad veteran wraiths in faceted azure bone masks that drink reflected light.',
      'Rift Sentinels patrol wider perimeters than outer Watchers. If they sense movement near the arch, they break orbit and sweep along three staggered sightlines before locking the portal frame in crimson chains.',
    ],
    fieldNotes: 'Time your approach behind their back arc, phase past with Dash Strike (E), or banish them cleanly with Shockwave (Q).',
  },
  {
    id: 'whisper_hound',
    category: 'sentry',
    archetypeId: 'whisper_hound',
    eraLabel: 'Third Watch · Listening Cliffs',
    title: 'Whisper Hound',
    subtitle: 'Tracker of Dou Qi Echoes',
    accentHex: '#3de095',
    unlockHint: 'Encounter a Whisper Hound patrolling near a portal.',
    excerpt: 'Half-blind by design, Whisper Hounds hunt by listening to the hum of racing footsteps, climbing boosts, and unmuted spells.',
    bodyParagraphs: [
      'Soul Hall scholars discovered that serpents nearing human ascension emit a resonant vibration through alpine stone whenever they surge uphill. Whisper Hounds were woven from emerald echo-wisps to intercept that exact frequency.',
      'Even when their narrow vision cone points away from you, boosting or discharging a stray bolt within thirty paces snaps a Whisper Hound out of circular patrol into a rapid zig-zagging search across your last known coordinates.',
    ],
    fieldNotes: 'Release boost and activate Stealth Veil (Shift / X) well before reaching the portal ring; Whisper Hounds calm quickly when the valley falls silent.',
  },
  {
    id: 'ash_inquisitor',
    category: 'sentry',
    archetypeId: 'ash_inquisitor',
    eraLabel: 'Fourth Watch · Cinder Tribunal',
    title: 'Ash-Veil Inquisitor',
    subtitle: 'Keeper of the Sealed Reliquary',
    accentHex: '#fb923c',
    unlockHint: 'Encounter an Ash-Veil Inquisitor guarding a high-ridge portal.',
    excerpt: 'Crowned in smoldering volcanic ash, Inquisitors were dispatched to burn away rebellious memories hidden inside the 14 Soul Trials.',
    bodyParagraphs: [
      'When fragments of an outsider’s spirit scattered into the portal trials, the Cinder Tribunal feared what truth might awaken if all fourteen shards reunited. Ash-Veil Inquisitors were posted along the upper trails with broad ember-lenses capable of piercing blizzard and fog alike.',
      'Provoked Inquisitors refuse to abandon a disturbance quickly, lingering in wide sweeping searches around the archway until every ember dies out.',
    ],
    fieldNotes: 'Their broad sight cone rewards decisive spell counterplay: unleash Shockwave (Q) or Heavenly Flame Lotus (R) to disperse their ash mantle.',
  },
  {
    id: 'soul_proctor',
    category: 'sentry',
    archetypeId: 'soul_proctor',
    eraLabel: 'Ninth Hall · Imperial Ward Edict',
    title: 'Crowned Soul Proctor',
    subtitle: 'Emissary of the Ninth Hall',
    accentHex: '#f2c14e',
    unlockHint: 'Encounter a Crowned Soul Proctor hovering beside a portal.',
    excerpt: 'Wearing gilded bone diadems of the Ninth Hall, Proctors command the strongest portal lockdown seals on the continent.',
    bodyParagraphs: [
      'Only the highest Soul Clan proctors are trusted to bear the golden seal-bell. Where lesser ghosts merely guard a threshold, a Proctor records every trespasser’s essence and transmits alarm tremors straight down into the subterranean fissures.',
      'Yet even a Ninth Hall Emissary cannot pierce a disciplined Jade Shadow cloak—and a full-power Heavenly Flame Lotus shatters their gilded bell for thirty full seconds.',
    ],
    fieldNotes: 'Approach under Stealth Veil (Shift / X) for a Shadow Infiltration bonus, or purify them with Flame Lotus (R) before entering.',
  },
  {
    id: 'chronicle_circular_doctrine',
    category: 'chronicle',
    eraLabel: 'Archive Scroll I · Tactical Treatise',
    title: 'Edict of the Shifting Watch',
    subtitle: 'Circular Orbit & Active Search Protocol',
    accentHex: '#f59e0b',
    unlockHint: 'Witness a Soul Clan Sentry switch from Circular Patrol into Search behavior.',
    excerpt: 'An intercepted Soul Hall manual explaining how portal sentries abandon predictable rings the instant mortal activity disturbs the ridge.',
    bodyParagraphs: [
      '“A motionless sentry is a blind statue; a circular sentry is a metronome any clever serpent can time. Therefore let every threshold ghost carry two minds: the Circle of Vigilance, and the Loom of Search.”',
      'Whenever a patrolling sentry senses hurried movement, lingering footsteps, or spell echoes near its portal, its lantern shifts from violet to amber. It leaves orbit, glides to the disturbance, sweeps its gaze left and right across the shadows, and combs the portal mouth before returning to its circle.',
    ],
    fieldNotes: 'Watch the sentry’s vision cone and radar wedge: Violet = Circular Patrol, Amber = Active Search, Crimson = Detected & Portal Sealed.',
  },
  {
    id: 'chronicle_shadow_veil',
    category: 'chronicle',
    eraLabel: 'Archive Scroll II · Hidden Art',
    title: 'Art of the Jade Shadow',
    subtitle: 'Infiltrating Guarded Portals Undetected',
    accentHex: '#3de095',
    unlockHint: 'Enter any sentry-guarded portal without tripping the Soul Bell alarm.',
    excerpt: 'Ancient mountain serpents learned to fold their aura inward like mist over pine needles, slipping past Soul Clan eyes without spilling a drop of Qi.',
    bodyParagraphs: [
      'Before the first serpent ever walked on two legs, mountain elders observed that Soul Clan spirits do not see flesh—they see restless heat and untamed Dou Qi. By slowing one’s glide and drawing scales beneath a quiet Stealth Veil, a climber becomes scarcely distinguishable from drifting mountain fog.',
      'Cultivators who breach a sentry-guarded portal without tripping its Soul Bell earn a Shadow Infiltration surge of Essence XP and preserve the tranquility of the ridge.',
    ],
    fieldNotes: 'Hold Shift or tap X to toggle Stealth Veil. Moving calmly under the veil lets you slip right behind a sentry’s sweeping arc.',
  },
  {
    id: 'chronicle_ward_breaking',
    category: 'chronicle',
    eraLabel: 'Archive Scroll III · Exorcism Rite',
    title: 'Breaking the Soul Bell',
    subtitle: 'Banishing Portal Sentries with Dou Qi',
    accentHex: '#f43f5e',
    unlockHint: 'Banish a Soul Clan Sentry using Shockwave (Q), Flame Lotus (R), or Qi Bolts.',
    excerpt: 'When stealth fails and a crimson ward seals the archway, resonant Dou Qi pulses can shatter a sentry’s spectral anchor in a single breath.',
    bodyParagraphs: [
      'A Soul Clan Sentry’s greatest pride—its suspended iron bell—is also its frailest link to the mortal peaks. A concentrated Qi Shockwave ripples through the bell’s harmonic rim, unravelling the ghost into harmless violet embers and instantly snapping open any sealed portal.',
      'Higher-realm cultivators wielding the Heavenly Flame Lotus can scour an entire ridge clear of patrolling sentries, buying precious time to enter the trials unopposed.',
    ],
    fieldNotes: 'Cast Shockwave (Q / 2 / Right-Click) for a 22s banish, Flame Lotus (R / 4) for a 30s mass banish, or land 3 direct Primary Qi Bolts (F / 1).',
  },
  {
    id: 'chronicle_azure_rift',
    category: 'chronicle',
    eraLabel: 'Archive Scroll IV · Rift Cartography',
    title: 'The Azure Rift Anchors',
    subtitle: 'Channel A Mountain Thresholds',
    accentHex: '#2de3ff',
    unlockHint: 'Enter a new Azure Rift Portal (Channel A) anywhere across the peaks.',
    excerpt: 'Long before mortal climbers charted the continent, Soul Hall artificers drove azure resonance rings into glacial fault lines to bind distant valleys together.',
    bodyParagraphs: [
      'Every Cyan Channel A portal hums along the mountain’s deep qi arteries. When a serpent slips through an Azure Rift Anchor, its awareness briefly bridges into the Hall of Mirrors—an astral chamber where forgotten trials and mortal signals echo across folded space.',
      'Soul Clan Sentries orbit these anchors because each completed trial weakens their clan’s grip on the valley, forcing the rift itself to tear free and rematerialize on a new ridge.',
    ],
    fieldNotes: 'Enter fresh Channel A portals across the continent to uncover new trials and expand your Soul Clan Archives.',
  },
  {
    id: 'chronicle_crimson_mirror',
    category: 'chronicle',
    eraLabel: 'Archive Scroll V · Twin Channels',
    title: 'The Crimson Mirror Loom',
    subtitle: 'Channel B Harmonic Relays',
    accentHex: '#ff6be0',
    unlockHint: 'Enter a new Crimson Mirror Portal (Channel B) across the highlands.',
    excerpt: 'Paired opposite the Azure Anchors, Magenta Channel B portals weave twin warp threads that let daring serpents leap across entire mountain ranges.',
    bodyParagraphs: [
      'Soul Clan chroniclers called the magenta archways the Mirror Loom. Unlike solitary shrines, each Channel B archway resonates with its Channel A counterpart, folding dozens of kilometers of avalanche slope into a single heartbeat.',
      'Whenever an intruder clears a trial inside a Crimson Mirror portal, a chromatic shockwave ripples across the sky as the loom shifts five nearby portals to untouched coordinates.',
    ],
    fieldNotes: 'Use Quick-Warp after clearing a Channel B trial to ride the Mirror Loom straight toward freshly shifted portals.',
  },
  {
    id: 'chronicle_shifting_lattice',
    category: 'chronicle',
    eraLabel: 'Archive Scroll VI · Living Geography',
    title: 'The Shifting Lattice',
    subtitle: 'Why Mountain Portals Never Stay Still',
    accentHex: '#a855f7',
    unlockHint: 'Enter 3 distinct portals during your mountain expedition.',
    excerpt: 'No map of the Serpent Peaks remains true for long; the Soul Clan’s portal network migrates like migratory cranes across the 360-meter continent.',
    bodyParagraphs: [
      'Early explorers believed the portals vanished after use. In truth, the Soul Clan engineered the Shifting Lattice as a defensive labyrinth: whenever one seal breaks, the remaining nodes recoil and anchor atop fresh ridges and hidden valleys.',
      'By tracking the radar’s glowing rings—and watching where patrolling sentries gather—an attentive cultivator can read the lattice’s pulse and turn the Soul Clan’s own network into a staircase toward Ascension.',
    ],
    fieldNotes: 'After each mission ripple, check your Continent Radar for freshly relocated portal rings and newly stationed sentries.',
  },
  {
    id: 'chronicle_celestial_stele',
    category: 'chronicle',
    eraLabel: 'Archive Scroll VII · Sovereign Rift',
    title: 'Stele of the Ninth Horizon',
    subtitle: 'The Periodic Global Ranking Portal',
    accentHex: '#f2c14e',
    unlockHint: 'Step through a Sovereign Golden Global Ranking Portal when it manifests.',
    excerpt: 'Once every cycle, an Imperial Gold archway pierces the mountain clouds—a neutral celestial stele even the Soul Clan dares not seal.',
    bodyParagraphs: [
      'Older than the Soul Hall itself, the Stele of the Ninth Horizon descends for brief windows across the continent, marked by an eight-pointed golden star on every climber’s compass.',
      'Cultivators who reach its archway before the window closes may inscribe their stage, Essence XP, and recovered Soul Fragments into the eternal ledger shared across realms.',
    ],
    fieldNotes: 'Watch the radar rim for the golden star arrow and step through the Sovereign Portal to claim the wave bonus and compare your progress.',
  },
];

export type LoreUnlockSource = 'sentry' | 'portal' | 'chronicle';

export interface LoreUnlockNotice {
  entryId: string;
  title: string;
  subtitle: string;
  eraLabel: string;
  accentHex: string;
  source: LoreUnlockSource;
  unlockedCount: number;
  totalCount: number;
}

export interface SoulArchiveRecord {
  unlocked: boolean;
  firstSeenAt: number;
  encounters: number;
  searchesTriggered: number;
  evadedCount: number;
  banishedCount: number;
}

export interface SoulArchiveSnapshotEntry {
  def: SoulArchiveEntryDef;
  record: SoulArchiveRecord;
}

export interface SoulArchiveSnapshot {
  entries: SoulArchiveSnapshotEntry[];
  unlockedCount: number;
  totalCount: number;
}

const SOUL_ARCHIVES_STORAGE_KEY = 'SERPENT_PEAKS_SOUL_ARCHIVES_V1';

export function createEmptyArchiveRecord(): SoulArchiveRecord {
  return {
    unlocked: false,
    firstSeenAt: 0,
    encounters: 0,
    searchesTriggered: 0,
    evadedCount: 0,
    banishedCount: 0,
  };
}

export function loadSoulArchiveRecords(): Record<string, SoulArchiveRecord> {
  const out: Record<string, SoulArchiveRecord> = {};
  for (const def of SOUL_ARCHIVE_CATALOG) {
    out[def.id] = createEmptyArchiveRecord();
  }
  if (typeof window === 'undefined' || !window.localStorage) return out;
  try {
    const raw = window.localStorage.getItem(SOUL_ARCHIVES_STORAGE_KEY);
    if (!raw) return out;
    const parsed = JSON.parse(raw) as Record<string, Partial<SoulArchiveRecord>>;
    if (!parsed || typeof parsed !== 'object') return out;
    for (const def of SOUL_ARCHIVE_CATALOG) {
      const rec = parsed[def.id];
      if (!rec || typeof rec !== 'object') continue;
      out[def.id] = {
        unlocked: Boolean(rec.unlocked),
        firstSeenAt: Number.isFinite(rec.firstSeenAt) ? Number(rec.firstSeenAt) : 0,
        encounters: Math.max(0, Math.floor(Number(rec.encounters) || 0)),
        searchesTriggered: Math.max(0, Math.floor(Number(rec.searchesTriggered) || 0)),
        evadedCount: Math.max(0, Math.floor(Number(rec.evadedCount) || 0)),
        banishedCount: Math.max(0, Math.floor(Number(rec.banishedCount) || 0)),
      };
    }
  } catch {
    // Ignore storage read errors
  }
  return out;
}

export function saveSoulArchiveRecords(records: Record<string, SoulArchiveRecord>): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(SOUL_ARCHIVES_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Ignore quota errors
  }
}

export function unlockSoulArchiveEntry(
  records: Record<string, SoulArchiveRecord>,
  entryId: string,
  metric: 'encounter' | 'search' | 'evade' | 'banish',
  nowMs = Date.now(),
): { newlyUnlocked: boolean; def: SoulArchiveEntryDef | null } {
  const def = SOUL_ARCHIVE_CATALOG.find((d) => d.id === entryId) ?? null;
  if (!def) return { newlyUnlocked: false, def: null };
  const rec = records[entryId] ?? createEmptyArchiveRecord();
  records[entryId] = rec;

  const newlyUnlocked = !rec.unlocked;
  if (newlyUnlocked) {
    rec.unlocked = true;
    rec.firstSeenAt = nowMs;
  }
  if (metric === 'encounter') rec.encounters += 1;
  else if (metric === 'search') rec.searchesTriggered += 1;
  else if (metric === 'evade') rec.evadedCount += 1;
  else if (metric === 'banish') rec.banishedCount += 1;

  return { newlyUnlocked, def };
}

export function buildSoulArchiveSnapshot(
  records: Record<string, SoulArchiveRecord>,
): SoulArchiveSnapshot {
  const entries = SOUL_ARCHIVE_CATALOG.map((def) => ({
    def,
    record: records[def.id] ? { ...records[def.id] } : createEmptyArchiveRecord(),
  }));
  const unlockedCount = entries.reduce((acc, e) => acc + (e.record.unlocked ? 1 : 0), 0);
  return {
    entries,
    unlockedCount,
    totalCount: entries.length,
  };
}

/**
 * Selects the next locked Soul Clan Archives portal chronicle to unlock when a player
 * steps into a newly discovered portal archway.
 */
export function selectPortalLoreEntryId(
  variant: 'A' | 'B' | 'ranking',
  visitedNewPortalCount: number,
  records: Record<string, SoulArchiveRecord>,
): string | null {
  if (variant === 'ranking') {
    return records.chronicle_celestial_stele?.unlocked ? null : 'chronicle_celestial_stele';
  }
  if (variant === 'A' && !records.chronicle_azure_rift?.unlocked) {
    return 'chronicle_azure_rift';
  }
  if (variant === 'B' && !records.chronicle_crimson_mirror?.unlocked) {
    return 'chronicle_crimson_mirror';
  }
  if (visitedNewPortalCount >= 3 && !records.chronicle_shifting_lattice?.unlocked) {
    return 'chronicle_shifting_lattice';
  }
  return null;
}

/**
 * Generates deterministic multi-point investigation waypoints around detected player
 * activity near a portal so searching sentries comb both the disturbance and the portal mouth.
 */
export function buildSentrySearchWaypoints(
  portalX: number,
  portalZ: number,
  activityX: number,
  activityZ: number,
  orbitRadius: number,
): Array<{ x: number; z: number }> {
  const dx = activityX - portalX;
  const dz = activityZ - portalZ;
  const dist = Math.hypot(dx, dz);
  const maxLeash = Math.max(orbitRadius + 10, 22);
  const clampedDist = Math.min(dist, maxLeash);
  const dirX = dist > 0.01 ? dx / dist : 1;
  const dirZ = dist > 0.01 ? dz / dist : 0;

  // Point 1: Approach the disturbance point directly
  const p1x = portalX + dirX * Math.max(5.5, clampedDist * 0.85);
  const p1z = portalZ + dirZ * Math.max(5.5, clampedDist * 0.85);

  // Point 2: Flank perpendicular right around the portal perimeter
  const perpX = -dirZ;
  const perpZ = dirX;
  const flankDist = Math.max(7.5, orbitRadius * 0.82);
  const p2x = portalX + dirX * (flankDist * 0.45) + perpX * flankDist;
  const p2z = portalZ + dirZ * (flankDist * 0.45) + perpZ * flankDist;

  // Point 3: Sweep opposite flank near the portal threshold
  const p3x = portalX + dirX * (flankDist * 0.35) - perpX * (flankDist * 0.9);
  const p3z = portalZ + dirZ * (flankDist * 0.35) - perpZ * (flankDist * 0.9);

  return [
    { x: Number(p1x.toFixed(2)), z: Number(p1z.toFixed(2)) },
    { x: Number(p2x.toFixed(2)), z: Number(p2z.toFixed(2)) },
    { x: Number(p3x.toFixed(2)), z: Number(p3z.toFixed(2)) },
  ];
}

function normalizeAngle(a: number): number {
  let res = a;
  while (res > Math.PI) res -= Math.PI * 2;
  while (res < -Math.PI) res += Math.PI * 2;
  return res;
}

/**
 * Spawns patrolling Soul Clan Sentries around a curated subset of 3D portals across the map.
 * Keeps the immediate spawn portal safe while ensuring early-valley portals have sentries
 * and all 5 Soul Clan Sentry archetypes appear for Soul Clan Archives discovery.
 */
export function spawnPortalSentries(
  props: readonly FormationProp[],
  _biome: BiomeId,
  maxSentries = 10,
): SoulSentryEntity[] {
  const portals = props.filter((p) => p.type === 'portalA' || p.type === 'portalB');
  if (portals.length === 0) return [];

  // Keep the very first spawn-in portal (around z = -12, x = 0) unguarded so new players can breathe,
  // while sorting remaining portals by distance from origin to cover near, mid, and outer peaks.
  const eligible = portals
    .filter((p) => Math.hypot(p.x, p.z + 12) > 9)
    .sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z));

  if (eligible.length === 0) return [];

  const targetCount = Math.min(maxSentries, eligible.length);
  const chosen: FormationProp[] = [];
  if (targetCount === eligible.length) {
    chosen.push(...eligible);
  } else {
    // Always include the nearest eligible valley portal so players encounter a sentry promptly,
    // then spread remaining sentries across the continent.
    chosen.push(eligible[0]);
    const step = (eligible.length - 1) / Math.max(1, targetCount - 1);
    for (let i = 1; i < targetCount; i++) {
      const idx = Math.min(eligible.length - 1, Math.round(i * step));
      if (!chosen.includes(eligible[idx])) {
        chosen.push(eligible[idx]);
      }
    }
  }

  return chosen.map((portal, idx) => {
    const archetypeId = SENTRY_ARCHETYPE_ORDER[idx % SENTRY_ARCHETYPE_ORDER.length];
    const profile = SENTRY_ARCHETYPES[archetypeId];
    const orbitAngle = ((idx * 2.399963) % (Math.PI * 2));
    const orbitDir: 1 | -1 = idx % 2 === 0 ? 1 : -1;
    const x = portal.x + Math.cos(orbitAngle) * profile.orbitRadius;
    const z = portal.z + Math.sin(orbitAngle) * profile.orbitRadius;
    const tangentHeading = Math.atan2(-Math.sin(orbitAngle) * orbitDir, Math.cos(orbitAngle) * orbitDir);

    return {
      id: `sentry-${portal.id}`,
      portalId: portal.id,
      portalX: portal.x,
      portalZ: portal.z,
      archetype: archetypeId,
      name: profile.name,
      subtitle: profile.subtitle,
      x,
      y: 0,
      z,
      heading: tangentHeading,
      hoverPhase: idx * 1.37,
      patrolMode: 'circular',
      orbitAngle,
      orbitRadius: profile.orbitRadius,
      orbitDir,
      orbitSpeed: profile.orbitSpeed,
      searchSpeed: profile.searchSpeed,
      visionRange: profile.visionRange,
      visionHalfAngle: profile.visionHalfAngle,
      activitySenseRadius: profile.activitySenseRadius,
      suspicion: 0,
      searchTimer: 0,
      searchOriginX: portal.x,
      searchOriginZ: portal.z,
      searchWaypoints: [],
      searchWaypointIdx: 0,
      searchSweepPhase: 0,
      alertTimer: 0,
      alertShotCooldown: 0,
      banishTimer: 0,
      portalLockTimer: 0,
      hp: profile.maxHp,
      maxHp: profile.maxHp,
      encounterRecorded: false,
    };
  });
}

/**
 * Steps a single Soul Clan Sentry's variable patrol AI (Circular Patrol <-> Search <-> Alert <-> Banished),
 * evaluating player proximity, Stealth Veil reduction, spell activity noise, and spectral vision cone detection.
 */
export function stepSoulSentry(
  sentry: SoulSentryEntity,
  input: SentryStepInput,
  dt: number,
): SentryStepOutcome {
  const outcome: SentryStepOutcome = {
    encounteredNow: false,
    switchedToSearch: false,
    returnedToCircular: false,
    triggeredAlert: false,
    fireAlertBolt: false,
    reformedFromBanish: false,
    distToPlayer: Math.hypot(input.playerX - sentry.x, input.playerZ - sentry.z),
  };

  sentry.hoverPhase += dt * 2.4;
  if (sentry.portalLockTimer > 0) {
    sentry.portalLockTimer = Math.max(0, sentry.portalLockTimer - dt);
  }

  // 1. Banished cooldown -> reform cleanly into circular orbit
  if (sentry.patrolMode === 'banished') {
    sentry.banishTimer = Math.max(0, sentry.banishTimer - dt);
    sentry.suspicion = 0;
    if (sentry.banishTimer <= 0) {
      sentry.patrolMode = 'circular';
      sentry.hp = sentry.maxHp;
      sentry.x = sentry.portalX + Math.cos(sentry.orbitAngle) * sentry.orbitRadius;
      sentry.z = sentry.portalZ + Math.sin(sentry.orbitAngle) * sentry.orbitRadius;
      outcome.reformedFromBanish = true;
    }
    return outcome;
  }

  const distToPlayer = outcome.distToPlayer;
  const distPlayerToPortal = Math.hypot(
    input.playerX - sentry.portalX,
    input.playerZ - sentry.portalZ,
  );

  // Record first lore encounter once the player comes within sight/presence of this sentry
  if (!sentry.encounterRecorded && distToPlayer <= 34) {
    sentry.encounterRecorded = true;
    outcome.encounteredNow = true;
  }

  // Compute vision cone & stealth modifiers
  const stealthRangeMult = input.isDashing ? 0.32 : input.isStealth ? 0.46 : 1.0;
  const effectiveVisionRange = sentry.visionRange * stealthRangeMult;
  const effectiveHalfAngle = input.isStealth
    ? sentry.visionHalfAngle * 0.78
    : sentry.visionHalfAngle;

  const toPlayerX = input.playerX - sentry.x;
  const toPlayerZ = input.playerZ - sentry.z;
  const angleToPlayer = Math.atan2(toPlayerX, toPlayerZ);
  const angleDiff = Math.abs(normalizeAngle(angleToPlayer - sentry.heading));

  const insideCone =
    distToPlayer <= effectiveVisionRange &&
    (angleDiff <= effectiveHalfAngle || distToPlayer <= (input.isStealth ? 2.6 : 4.8));

  // Detect non-visual player activity near the portal (loud footsteps/boost or spell discharge)
  const spellDistToPortal = Math.hypot(
    input.spellOriginX - sentry.portalX,
    input.spellOriginZ - sentry.portalZ,
  );
  const loudSpellNearby =
    input.recentSpellPulse > 0.2 && spellDistToPortal <= sentry.activitySenseRadius + 8;
  const noisyMovementNearPortal =
    !input.isStealth &&
    distPlayerToPortal <= sentry.activitySenseRadius &&
    (input.isBoosting || input.playerSpeed >= 6.8 || distPlayerToPortal <= 16.5);

  const playerActivityDetected = loudSpellNearby || noisyMovementNearPortal;
  const activityX = loudSpellNearby ? input.spellOriginX : input.playerX;
  const activityZ = loudSpellNearby ? input.spellOriginZ : input.playerZ;

  // Update suspicion gauge
  if (insideCone) {
    const closeness = 1 - Math.min(1, distToPlayer / Math.max(1, effectiveVisionRange));
    const speedFactor = input.isDashing
      ? 0.2
      : input.isStealth
        ? 0.3
        : input.isBoosting
          ? 1.55
          : 1.0;
    const rate = (0.68 + closeness * 0.85) * speedFactor;
    sentry.suspicion = Math.min(1, sentry.suspicion + rate * dt);
  } else {
    const coolRate = input.isStealth ? 0.46 : 0.28;
    sentry.suspicion = Math.max(0, sentry.suspicion - coolRate * dt);
  }

  // 2. Alerted state (full detection -> locks portal and tracks intruder briefly)
  if (sentry.patrolMode === 'alert') {
    sentry.alertTimer = Math.max(0, sentry.alertTimer - dt);
    sentry.alertShotCooldown = Math.max(0, sentry.alertShotCooldown - dt);

    // Face player smoothly & hover near portal edge
    const turnDiff = normalizeAngle(angleToPlayer - sentry.heading);
    sentry.heading = normalizeAngle(sentry.heading + turnDiff * Math.min(1, dt * 6.5));

    const leashDist = Math.hypot(sentry.x - sentry.portalX, sentry.z - sentry.portalZ);
    if (distToPlayer > 7.5 && leashDist < sentry.orbitRadius + 9) {
      const step = sentry.searchSpeed * 0.9 * dt;
      sentry.x += Math.sin(angleToPlayer) * step;
      sentry.z += Math.cos(angleToPlayer) * step;
    }

    if (sentry.alertShotCooldown <= 0 && distToPlayer <= 28) {
      sentry.alertShotCooldown = 2.6;
      outcome.fireAlertBolt = true;
    }

    if (sentry.alertTimer <= 0) {
      // Transition from Alert down into Search behavior around last seen player spot
      sentry.patrolMode = 'search';
      sentry.suspicion = 0.52;
      sentry.searchTimer = 7.5;
      sentry.searchOriginX = input.playerX;
      sentry.searchOriginZ = input.playerZ;
      sentry.searchWaypoints = buildSentrySearchWaypoints(
        sentry.portalX,
        sentry.portalZ,
        input.playerX,
        input.playerZ,
        sentry.orbitRadius,
      );
      sentry.searchWaypointIdx = 0;
      sentry.searchSweepPhase = 0;
    }
    return outcome;
  }

  // Escalate to Alert if suspicion hits 100%
  if (sentry.suspicion >= 0.999) {
    sentry.patrolMode = 'alert';
    sentry.alertTimer = 6.2;
    sentry.portalLockTimer = Math.max(sentry.portalLockTimer, 10.0);
    sentry.alertShotCooldown = 0.55;
    outcome.triggeredAlert = true;
    return outcome;
  }

  // 3. Circular Patrol <-> Search state switching
  if (sentry.patrolMode === 'circular') {
    if (playerActivityDetected || sentry.suspicion >= 0.22) {
      sentry.patrolMode = 'search';
      sentry.searchTimer = sentry.archetype === 'ash_inquisitor' ? 10.8 : 8.6;
      sentry.searchOriginX = activityX;
      sentry.searchOriginZ = activityZ;
      sentry.searchWaypoints = buildSentrySearchWaypoints(
        sentry.portalX,
        sentry.portalZ,
        activityX,
        activityZ,
        sentry.orbitRadius,
      );
      sentry.searchWaypointIdx = 0;
      sentry.searchSweepPhase = 0;
      outcome.switchedToSearch = true;
    } else {
      // Smooth circular orbit around the guarded portal
      sentry.orbitAngle =
        (sentry.orbitAngle + sentry.orbitSpeed * sentry.orbitDir * dt) % (Math.PI * 2);
      const targetX = sentry.portalX + Math.cos(sentry.orbitAngle) * sentry.orbitRadius;
      const targetZ = sentry.portalZ + Math.sin(sentry.orbitAngle) * sentry.orbitRadius;
      const moveLerp = 1 - Math.exp(-4.5 * dt);
      sentry.x += (targetX - sentry.x) * moveLerp;
      sentry.z += (targetZ - sentry.z) * moveLerp;

      // Tangent heading with a slight outward spectral glance so the cone sweeps the portal approach
      const tangentAngle = Math.atan2(
        -Math.sin(sentry.orbitAngle) * sentry.orbitDir,
        Math.cos(sentry.orbitAngle) * sentry.orbitDir,
      );
      const outwardGlance = Math.sin(sentry.hoverPhase * 0.55) * 0.34;
      const desiredHeading = normalizeAngle(tangentAngle + outwardGlance);
      const hDiff = normalizeAngle(desiredHeading - sentry.heading);
      sentry.heading = normalizeAngle(sentry.heading + hDiff * Math.min(1, dt * 5.2));
    }
    return outcome;
  }

  // 4. Active 'search' behavior — glide to investigation waypoints & sweep gaze left/right
  sentry.searchTimer = Math.max(0, sentry.searchTimer - dt);
  sentry.searchSweepPhase += dt * 3.1;

  if (playerActivityDetected && distPlayerToPortal <= sentry.activitySenseRadius) {
    // Refresh search path toward fresh activity near the portal
    const shiftDist = Math.hypot(activityX - sentry.searchOriginX, activityZ - sentry.searchOriginZ);
    if (shiftDist > 4.5) {
      sentry.searchOriginX = activityX;
      sentry.searchOriginZ = activityZ;
      sentry.searchWaypoints = buildSentrySearchWaypoints(
        sentry.portalX,
        sentry.portalZ,
        activityX,
        activityZ,
        sentry.orbitRadius,
      );
      sentry.searchWaypointIdx = 0;
    }
    sentry.searchTimer = Math.min(11.5, Math.max(sentry.searchTimer, 6.2));
  }

  const wp = sentry.searchWaypoints[sentry.searchWaypointIdx] ?? {
    x: sentry.searchOriginX,
    z: sentry.searchOriginZ,
  };
  const wpDx = wp.x - sentry.x;
  const wpDz = wp.z - sentry.z;
  const wpDist = Math.hypot(wpDx, wpDz);

  if (wpDist > 1.8) {
    const step = Math.min(wpDist, sentry.searchSpeed * dt);
    sentry.x += (wpDx / wpDist) * step;
    sentry.z += (wpDz / wpDist) * step;
    const travelHeading = Math.atan2(wpDx, wpDz);
    // Actively sweep lantern head left/right while advancing
    const sweepOffset = Math.sin(sentry.searchSweepPhase) * 0.55;
    const hDiff = normalizeAngle(travelHeading + sweepOffset - sentry.heading);
    sentry.heading = normalizeAngle(sentry.heading + hDiff * Math.min(1, dt * 5.8));
  } else {
    // Pause briefly while sweeping side-to-side, then advance to next search waypoint
    const scanOffset = Math.sin(sentry.searchSweepPhase * 1.35) * 0.95;
    const baseAngle = Math.atan2(sentry.portalX - sentry.x, sentry.portalZ - sentry.z) + Math.PI;
    const hDiff = normalizeAngle(baseAngle + scanOffset - sentry.heading);
    sentry.heading = normalizeAngle(sentry.heading + hDiff * Math.min(1, dt * 4.5));
    if (sentry.searchWaypoints.length > 0 && Math.sin(sentry.searchSweepPhase * 0.7) > 0.92) {
      sentry.searchWaypointIdx = (sentry.searchWaypointIdx + 1) % sentry.searchWaypoints.length;
    }
  }

  if (sentry.searchTimer <= 0 && sentry.suspicion < 0.14) {
    // Re-sync orbitAngle smoothly to current position so transition back to circular patrol never snaps
    sentry.orbitAngle = Math.atan2(sentry.z - sentry.portalZ, sentry.x - sentry.portalX);
    sentry.patrolMode = 'circular';
    sentry.searchWaypoints = [];
    outcome.returnedToCircular = true;
  }

  return outcome;
}

/**
 * Banishes a Soul Clan Sentry via spell counterplay, immediately lifting any portal lockdown.
 */
export function banishSoulSentry(sentry: SoulSentryEntity, durationSec = 22): void {
  sentry.patrolMode = 'banished';
  sentry.banishTimer = Math.max(sentry.banishTimer, durationSec);
  sentry.portalLockTimer = 0;
  sentry.alertTimer = 0;
  sentry.searchTimer = 0;
  sentry.suspicion = 0;
  sentry.hp = 0;
}

/**
 * Procedural SVG insignia crests for the Soul Clan Archives lore gallery (zero external images).
 */
export function renderSoulArchiveEmblemSvg(entryId: string, accentHex: string, unlocked: boolean): string {
  const stroke = unlocked ? accentHex : '#475569';
  const glow = unlocked ? `${accentHex}33` : 'rgba(71, 85, 105, 0.14)';
  let inner = '';
  switch (entryId) {
    case 'lantern_watcher':
      inner = `<path d="M24 8v5M17 17h14l2 14-9 7-9-7 2-14z" stroke="${stroke}" stroke-width="1.8" fill="${glow}"/><circle cx="24" cy="24" r="3.4" fill="${stroke}"/>`;
      break;
    case 'rift_sentinel':
      inner = `<polygon points="24,7 38,24 24,41 10,24" stroke="${stroke}" stroke-width="1.8" fill="${glow}"/><line x1="24" y1="12" x2="24" y2="36" stroke="${stroke}" stroke-width="1.5"/><circle cx="24" cy="24" r="4.2" stroke="${stroke}" stroke-width="1.6" fill="none"/>`;
      break;
    case 'whisper_hound':
      inner = `<path d="M12 24c4-8 20-8 24 0-4 8-20 8-24 0z" stroke="${stroke}" stroke-width="1.8" fill="${glow}"/><path d="M16 14c5-4 11-4 16 0M16 34c5 4 11 4 16 0" stroke="${stroke}" stroke-width="1.4" fill="none"/><circle cx="24" cy="24" r="3" fill="${stroke}"/>`;
      break;
    case 'ash_inquisitor':
      inner = `<path d="M24 8c5 7 11 11 11 19a11 11 0 1 1-22 0c0-8 6-12 11-19z" stroke="${stroke}" stroke-width="1.8" fill="${glow}"/><path d="M24 18l4 8-4 5-4-5 4-8z" fill="${stroke}"/>`;
      break;
    case 'soul_proctor':
      inner = `<path d="M11 32l4-15 9 6 9-6 4 15H11z" stroke="${stroke}" stroke-width="1.8" fill="${glow}"/><circle cx="24" cy="12" r="3" fill="${stroke}"/><line x1="12" y1="37" x2="36" y2="37" stroke="${stroke}" stroke-width="1.8"/>`;
      break;
    case 'chronicle_circular_doctrine':
      inner = `<circle cx="24" cy="24" r="14" stroke="${stroke}" stroke-width="1.6" stroke-dasharray="5 3" fill="${glow}"/><path d="M24 24l11-6M24 24l9 8" stroke="${stroke}" stroke-width="1.8"/><circle cx="24" cy="24" r="3.2" fill="${stroke}"/>`;
      break;
    case 'chronicle_shadow_veil':
      inner = `<path d="M11 26c4-11 22-11 26 0" stroke="${stroke}" stroke-width="1.8" fill="none"/><path d="M15 31c4-6 14-6 18 0" stroke="${stroke}" stroke-width="1.6" fill="none"/><circle cx="24" cy="20" r="5" stroke="${stroke}" stroke-width="1.7" fill="${glow}"/>`;
      break;
    case 'chronicle_azure_rift':
      inner = `<ellipse cx="24" cy="24" rx="13" ry="16" stroke="${stroke}" stroke-width="1.8" fill="${glow}"/><ellipse cx="24" cy="24" rx="7" ry="10" stroke="${stroke}" stroke-width="1.4" fill="none"/><circle cx="24" cy="24" r="2.6" fill="${stroke}"/>`;
      break;
    case 'chronicle_crimson_mirror':
      inner = `<polygon points="24,8 37,24 24,40 11,24" stroke="${stroke}" stroke-width="1.8" fill="${glow}"/><polygon points="24,14 31,24 24,34 17,24" stroke="${stroke}" stroke-width="1.4" fill="none"/><circle cx="24" cy="24" r="2.5" fill="${stroke}"/>`;
      break;
    case 'chronicle_shifting_lattice':
      inner = `<circle cx="15" cy="17" r="4" stroke="${stroke}" stroke-width="1.6" fill="${glow}"/><circle cx="33" cy="17" r="4" stroke="${stroke}" stroke-width="1.6" fill="${glow}"/><circle cx="24" cy="33" r="4.5" stroke="${stroke}" stroke-width="1.6" fill="${glow}"/><path d="M19 17h10M17 20.5L22 29M31 20.5L26 29" stroke="${stroke}" stroke-width="1.5"/>`;
      break;
    case 'chronicle_celestial_stele':
      inner = `<path d="M24 7l3.6 9.8L37 20l-9.4 3.2L24 33l-3.6-9.8L11 20l9.4-3.2L24 7z" stroke="${stroke}" stroke-width="1.7" fill="${glow}"/><line x1="14" y1="38" x2="34" y2="38" stroke="${stroke}" stroke-width="1.8"/>`;
      break;
    default:
      inner = `<path d="M14 34c0-11 4-19 10-22 6 3 10 11 10 22H14z" stroke="${stroke}" stroke-width="1.8" fill="${glow}"/><line x1="10" y1="34" x2="38" y2="34" stroke="${stroke}" stroke-width="1.8"/><circle cx="24" cy="38" r="2.6" fill="${stroke}"/>`;
      break;
  }
  return `<svg viewBox="0 0 48 48" width="38" height="38" aria-hidden="true">${inner}</svg>`;
}
