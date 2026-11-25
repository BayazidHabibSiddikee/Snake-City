import boarPlate from './assets/images/beast_boar_plate_1795527257536.jpg';
import eaglePlate from './assets/images/beast_eagle_plate_1795527261403.jpg';
import guardianPlate from './assets/images/beast_guardian_plate_1795527260796.jpg';
import wolfPlate from './assets/images/beast_wolf_plate_1795527258729.jpg';
import { BeastKind, BestiaryEntryId, BestiaryRecord, BiomeId } from './types';

export type ThreatRating = 'common' | 'elite' | 'legendary';

export type BestiaryFilter =
  | 'all'
  | 'discovered'
  | 'mountain'
  | 'jungle'
  | 'common'
  | 'elite'
  | 'legendary';

export interface ThreatRatingInfo {
  rating: ThreatRating;
  label: 'Common' | 'Elite' | 'Legendary';
  rank: 1 | 2 | 3;
  powerScore: number;
  summary: string;
}

export interface BestiaryLoreChapter {
  chapterTitle: string;
  requiredDefeats: number;
  text: string;
}

export interface BestiaryEntryDef {
  id: BestiaryEntryId;
  kind: BeastKind;
  biome: BiomeId;
  name: string;
  epithet: string;
  classification: string;
  habitat: string;
  isBoss: boolean;
  minTier: number;
  portraitUrl: string;
  portraitToneClass: string;
  baseHp: number;
  baseSpeed: number;
  aggroRadius: number;
  xpReward: number;
  attackStyle: string;
  tacticalNote: string;
  fieldRumor: string;
  loreChapters: [BestiaryLoreChapter, BestiaryLoreChapter, BestiaryLoreChapter];
}

export interface BestiaryEntrySnapshot {
  def: BestiaryEntryDef;
  record: BestiaryRecord;
  threat: ThreatRatingInfo;
  discovered: boolean;
  sightedOnly: boolean;
  scaledHp: number;
  unlockedLoreCount: number;
  totalLoreCount: number;
  nextLoreThreshold: number | null;
}

export interface BestiarySnapshot {
  entries: BestiaryEntrySnapshot[];
  discoveredCount: number;
  totalSpeciesCount: number;
  totalDefeated: number;
  unlockedLoreCount: number;
  totalLoreCount: number;
  playerLevel: number;
}

export const BESTIARY_CATALOG: readonly BestiaryEntryDef[] = [
  {
    id: 'dire_ridge_wolf',
    kind: 'wolf',
    biome: 'mountain',
    name: 'Dire Ridge Wolf',
    epithet: 'Frost-Crowned Pack Stalker',
    classification: 'Alpine Predator',
    habitat: 'Lower Pine Foothills & Granite Passes',
    isBoss: false,
    minTier: 1,
    portraitUrl: wolfPlate,
    portraitToneClass: 'tone-alpine',
    baseHp: 3,
    baseSpeed: 7.4,
    aggroRadius: 30,
    xpReward: 75,
    attackStyle: 'Relentless Pursuit & Fang Lunge',
    tacticalNote: 'Strafe perpendicular during its windup crouch and strike with homing venom bolts.',
    fieldRumor: 'Howls echo along the lower alpine pines whenever a young serpent leaves the valley floor.',
    loreChapters: [
      {
        chapterTitle: 'I. Field Observation',
        requiredDefeats: 1,
        text: 'Long-limbed alpine wolves whose silver pelts accumulate hoarfrost even in mild mist. They patrol granite ledges in loose territory rings and break into an immediate sprint the moment an ascending serpent crosses their ridge.',
      },
      {
        chapterTitle: 'II. Arcane Ecology',
        requiredDefeats: 3,
        text: 'Rather than hunting for sustenance alone, ridge wolves drink from meltwater veins saturated with fallen shrine shards. The trace essence sharpens their eyes to amber-emerald luminescence and lets them scent magical creatures across wide valleys.',
      },
      {
        chapterTitle: 'III. Serpent Chronicle',
        requiredDefeats: 6,
        text: 'Old summit cairns depict the wolves as the First Gatekeepers of the foothills. Any hatchling that cannot outmaneuver a pack stalker is deemed unready for the thinner air and heavier trials awaiting above the treeline.',
      },
    ],
  },
  {
    id: 'shadow_panther_wolf',
    kind: 'wolf',
    biome: 'jungle',
    name: 'Shadow Panther-Wolf',
    epithet: 'Dusk-Fur Canopy Stalker',
    classification: 'Jungle Predator',
    habitat: 'Emerald Ravines & Bamboo Terraces',
    isBoss: false,
    minTier: 1,
    portraitUrl: wolfPlate,
    portraitToneClass: 'tone-jungle',
    baseHp: 3,
    baseSpeed: 7.4,
    aggroRadius: 30,
    xpReward: 75,
    attackStyle: 'Silent Flank Chase & Ambush Pounce',
    tacticalNote: 'Keep momentum through dense fern clearings and release a Shockwave if cornered.',
    fieldRumor: 'Low amber eyes gleam beneath wet jungle ferns, pacing intruders before springing from cover.',
    loreChapters: [
      {
        chapterTitle: 'I. Field Observation',
        requiredDefeats: 1,
        text: 'A lithe, dark-coated jungle kin of the alpine ridge wolf. Its pads muffle every footfall across sodden moss, allowing it to close distance rapidly between giant banyan roots before lunging with curved canines.',
      },
      {
        chapterTitle: 'II. Arcane Ecology',
        requiredDefeats: 3,
        text: 'Bioluminescent spores cling to the panther-wolf’s mane after monsoon showers, camouflaging its outline in misty hollows. When agitated, its fur bristles with faint emerald static drawn from humid canopy shrines.',
      },
      {
        chapterTitle: 'III. Serpent Chronicle',
        requiredDefeats: 6,
        text: 'Jungle folklore claims these stalkers remember the ancient truce between serpent and beast—and resent any serpent attempting to shed its scales for a human stride.',
      },
    ],
  },
  {
    id: 'ironhorn_boar',
    kind: 'boar',
    biome: 'mountain',
    name: 'Ironhorn Boar',
    epithet: 'Basalt-Plated Ridge Charger',
    classification: 'Armored Juggernaut',
    habitat: 'Mid-Altitude Scree Slopes & Cliff Trails',
    isBoss: false,
    minTier: 3,
    portraitUrl: boarPlate,
    portraitToneClass: 'tone-alpine',
    baseHp: 5,
    baseSpeed: 6.4,
    aggroRadius: 28,
    xpReward: 120,
    attackStyle: 'Braced Windup & High-Impact Tusk Ram',
    tacticalNote: 'Wait for its heavy hoof-scrape telegraph, curve outside its charge vector, and punish recovery.',
    fieldRumor: 'Deep furrows gouged through solid shale warn climbers of armored beasts patrolling the mid-ridges.',
    loreChapters: [
      {
        chapterTitle: 'I. Field Observation',
        requiredDefeats: 1,
        text: 'Broad-shouldered mountain boars whose hide calcifies into dark mineral plates from wallowing in iron-rich alpine springs. Their twin curved tusks can splinter fallen pine trunks during a full downhill charge.',
      },
      {
        chapterTitle: 'II. Arcane Ecology',
        requiredDefeats: 3,
        text: 'Friction between their mineralized shoulder ridges generates dull ember fissures whenever they brace for impact. Though slower on sharp turns than ridge wolves, their momentum easily shatters careless coils.',
      },
      {
        chapterTitle: 'III. Serpent Chronicle',
        requiredDefeats: 6,
        text: 'Carved monoliths along the Third Peak record that drake-stage serpents once tested newly grown horns by locking headlong against Ironhorn chargers until the rock beneath them cracked.',
      },
    ],
  },
  {
    id: 'ember_tusk_ravager',
    kind: 'boar',
    biome: 'jungle',
    name: 'Ember-Tusk Ravager',
    epithet: 'Volcanic Root-Breaker',
    classification: 'Armored Jungle Beast',
    habitat: 'Steaming Caldera Terraces & Mossy Basalt',
    isBoss: false,
    minTier: 3,
    portraitUrl: boarPlate,
    portraitToneClass: 'tone-jungle',
    baseHp: 5,
    baseSpeed: 6.4,
    aggroRadius: 28,
    xpReward: 120,
    attackStyle: 'Furious Ground Stomp & Scorching Gore',
    tacticalNote: 'Lure its straight-line bull rush past boulders, then unload twin magic spears into its flank.',
    fieldRumor: 'Smoldering bark shavings and scorched ferns mark the territory of a massive tusked jungle ravager.',
    loreChapters: [
      {
        chapterTitle: 'I. Field Observation',
        requiredDefeats: 1,
        text: 'Temperamental highland boars adapted to geothermal jungle fissures. Their dense bristles smell of cedar ash and wet iron, and glowing veins pulse beneath cracked shoulder armor as their anger builds.',
      },
      {
        chapterTitle: 'II. Arcane Ecology',
        requiredDefeats: 3,
        text: 'Ravagers root up buried essence crystals to grind against their tusks, infusing each charge with radiant kinetic force. The resulting impact disperses choking mist for dozens of paces.',
      },
      {
        chapterTitle: 'III. Serpent Chronicle',
        requiredDefeats: 6,
        text: 'In the mythic songs of the Naga Initiates, defeating an Ember-Tusk without yielding ground proves a serpent’s spirit has hardened enough to bear upright limbs.',
      },
    ],
  },
  {
    id: 'storm_talon_griffin',
    kind: 'eagle',
    biome: 'mountain',
    name: 'Storm Talon Griffin',
    epithet: 'High-Ridge Squall Hunter',
    classification: 'Aerial Arcanist',
    habitat: 'Wind-Scoured Crags & Cloudline Ridges',
    isBoss: false,
    minTier: 5,
    portraitUrl: eaglePlate,
    portraitToneClass: 'tone-alpine',
    baseHp: 5,
    baseSpeed: 8.6,
    aggroRadius: 38,
    xpReward: 165,
    attackStyle: 'High-Speed Swoop & Ranged Wind Bolts',
    tacticalNote: 'Its wide aggro radius triggers distant bolts—weave laterally and answer with homing volleys.',
    fieldRumor: 'Piercing cries drift down through freezing cloud banks where feathered hunters ride the mountain gales.',
    loreChapters: [
      {
        chapterTitle: 'I. Field Observation',
        requiredDefeats: 1,
        text: 'Regal high-altitude raptors whose slate-blue primaries crackle with alpine static. Hovering effortlessly over sheer drops, they track moving targets from far greater range than ground-bound beasts.',
      },
      {
        chapterTitle: 'II. Arcane Ecology',
        requiredDefeats: 3,
        text: 'Hollow bones lined with conductive quartz filaments allow the Storm Talon to condense shearing wind into razor-bright projectiles fired mid-glide without slowing its circle.',
      },
      {
        chapterTitle: 'III. Serpent Chronicle',
        requiredDefeats: 6,
        text: 'Winged serpents of the Sixth and Seventh Tiers view the Storm Talon as both rival and tutor; mastering their erratic updrafts teaches the agility needed to ascend past the storm line.',
      },
    ],
  },
  {
    id: 'tempest_canopy_hawk',
    kind: 'eagle',
    biome: 'jungle',
    name: 'Tempest Canopy Hawk',
    epithet: 'Monsoon Crown Sovereign',
    classification: 'Aerial Jungle Raptor',
    habitat: 'Upper Rainforest Crowns & Misty Cliffs',
    isBoss: false,
    minTier: 5,
    portraitUrl: eaglePlate,
    portraitToneClass: 'tone-jungle',
    baseHp: 5,
    baseSpeed: 8.6,
    aggroRadius: 38,
    xpReward: 165,
    attackStyle: 'Circling Gale Barrage & Razor Dive',
    tacticalNote: 'Use Boost sprints to break projectile lead prediction before firing multi-bolt counter-salvos.',
    fieldRumor: 'Sudden downdrafts bend the tallest jungle crowns whenever a tempest raptor locks onto movement below.',
    loreChapters: [
      {
        chapterTitle: 'I. Field Observation',
        requiredDefeats: 1,
        text: 'A swift emerald-and-indigo storm raptor that nests atop cloud-wrapped jungle monoliths. It dives through rain squalls with uncanny precision, loosing concentrated gale darts from above.',
      },
      {
        chapterTitle: 'II. Arcane Ecology',
        requiredDefeats: 3,
        text: 'Water droplets bead and spark across its oiled pinions, turning every wingbeat into a miniature thunderclap. Its shrill call scatters songbirds across entire valleys seconds before it strikes.',
      },
      {
        chapterTitle: 'III. Serpent Chronicle',
        requiredDefeats: 6,
        text: 'Ancient highland tablets hold that the Tempest Canopy Hawk carries messages between the mountain shrines, testing whether ascending serpents can read the sky as deftly as the earth.',
      },
    ],
  },
  {
    id: 'mythic_peak_guardian',
    kind: 'guardian',
    biome: 'mountain',
    name: 'Mythic Peak Guardian',
    epithet: 'Runic Warden of the Trial Peaks',
    classification: 'Peak Guardian Boss',
    habitat: 'Sacred Alpine Trial Shrines & Summit Plateaus',
    isBoss: true,
    minTier: 8,
    portraitUrl: guardianPlate,
    portraitToneClass: 'tone-alpine',
    baseHp: 10,
    baseSpeed: 5.8,
    aggroRadius: 42,
    xpReward: 310,
    attackStyle: 'Arcane Runic Salvos & Shockwave Nova',
    tacticalNote: 'Circle outside its violet shockwave ring, sustain pressure with multi-spear volleys, and save Boost for evasion.',
    fieldRumor: 'A towering antlered silhouette wreathed in violet-gold sigils stands sentinel over the highest alpine Trial Peaks.',
    loreChapters: [
      {
        chapterTitle: 'I. Field Observation',
        requiredDefeats: 1,
        text: 'Colossal spirit-bound wardens manifested directly from the continent’s summit ley lines. Crystalline antlers float with inscribed runes that brighten dramatically moments before an expanding shockwave erupts.',
      },
      {
        chapterTitle: 'II. Arcane Ecology',
        requiredDefeats: 2,
        text: 'Unlike mortal fauna, a Peak Guardian neither sleeps nor wanders far from its consecrated shrine. Its body is woven from alpine stone, glacial mist, and compressed essence harvested over centuries.',
      },
      {
        chapterTitle: 'III. Serpent Chronicle',
        requiredDefeats: 4,
        text: 'Every serpent that ever achieved Human form first endured a Guardian’s trial. Defeating one does not destroy the warden forever—it bows in recognition, releasing a torrent of pure ascension essence.',
      },
    ],
  },
  {
    id: 'ancient_spirit_stag',
    kind: 'guardian',
    biome: 'jungle',
    name: 'Ancient Spirit Stag',
    epithet: 'Sovereign of the Overgrown Sanctums',
    classification: 'Sanctum Guardian Boss',
    habitat: 'Sacred Jungle Shrines & Verdant Summits',
    isBoss: true,
    minTier: 8,
    portraitUrl: guardianPlate,
    portraitToneClass: 'tone-jungle',
    baseHp: 10,
    baseSpeed: 5.8,
    aggroRadius: 42,
    xpReward: 310,
    attackStyle: 'Sanctum Spirit Orbs & Radiant Pulse Ring',
    tacticalNote: 'Keep mid-range distance to dodge its arcane barrage and counter-cast Shockwave as it recovers.',
    fieldRumor: 'Where ancient moss blankets the jungle’s highest stone altars, antlers of living amethyst light drift through the mist.',
    loreChapters: [
      {
        chapterTitle: 'I. Field Observation',
        requiredDefeats: 1,
        text: 'An immense primordial spirit-stag draped in luminous moss and floating golden sigils. Wherever its hooves touch wet stone, ancient runes flare to life across the jungle summit.',
      },
      {
        chapterTitle: 'II. Arcane Ecology',
        requiredDefeats: 2,
        text: 'The Spirit Stag channels the collective resonance of the rainforest canopy into concentrated arcane orbs and pulsing barrier rings, repelling unworthy climbers from the upper shrines.',
      },
      {
        chapterTitle: 'III. Serpent Chronicle',
        requiredDefeats: 4,
        text: 'Naga elders revere the Spirit Stag as the mirror of metamorphosis itself—a reminder that true Humanity is not conquest over nature, but harmony forged through perilous trials.',
      },
    ],
  },
  {
    id: 'nether_earth_wraith',
    kind: 'wraith',
    biome: 'mountain',
    name: 'Nether Earth Wraith',
    epithet: 'Subterranean Hunter of the Soul Clan',
    classification: 'Ghost Clan Assassin',
    habitat: 'Cracked Earth Fissures & Buried Ley Faults',
    isBoss: false,
    minTier: 2,
    portraitUrl: guardianPlate,
    portraitToneClass: 'tone-nether',
    baseHp: 6,
    baseSpeed: 8.8,
    aggroRadius: 46,
    xpReward: 195,
    attackStyle: 'Earth-Fissure Ambush & Tracking Soul Chains',
    tacticalNote: 'Strike as the green-violet earth seal fractures or pierce their flank with Fang Dash (E).',
    fieldRumor: 'When the soil cracks with cold jade-violet smoke, assassins of the Soul Clan rise from beneath the earth.',
    loreChapters: [
      {
        chapterTitle: 'I. Field Observation',
        requiredDefeats: 1,
        text: 'Draped in tattered obsidian robes and crowned by pale bone visors, Nether Earth Wraiths burrow silently through subterranean ley veins. They erupt vertically out of glowing ground seals whenever a cultivating serpent draws the Soul Clan’s bounty.',
      },
      {
        chapterTitle: 'II. Arcane Ecology',
        requiredDefeats: 3,
        text: 'Rather than wielding mortal flesh, each wraith binds resentful earth-qi inside dark iron soul chains. Their ranged spectral bolts bend slightly toward fleeing prey, forcing agile dashes or dispelling Shockwaves.',
      },
      {
        chapterTitle: 'III. Serpent Chronicle',
        requiredDefeats: 6,
        text: 'Ancient Dou Di scrolls warn that the Hall of Souls harvests ascending beasts before they can attain human form—turning every rise in Clan Heat into a relentless subterranean manhunt.',
      },
    ],
  },
  {
    id: 'soul_hall_reaper',
    kind: 'soul_elder',
    biome: 'jungle',
    name: 'Soul Hall Reaper',
    epithet: 'Abyssal Protector of the Dark Clan',
    classification: 'Ghost Clan Sovereign Boss',
    habitat: 'Deep Earth Seals & High-Heat Ambush Zones',
    isBoss: true,
    minTier: 4,
    portraitUrl: guardianPlate,
    portraitToneClass: 'tone-nether',
    baseHp: 12,
    baseSpeed: 7.4,
    aggroRadius: 56,
    xpReward: 380,
    attackStyle: 'Triple Soul-Chain Salvo & Nether Quake Ring',
    tacticalNote: 'Unleash Flame Lotus (R) right after its ground emergence to shatter its soul-cage aura and reclaim vitality.',
    fieldRumor: 'At high Clan Heat, the ground splits wide for a horned Soul Hall Elder bearing a floating spectral scythe.',
    loreChapters: [
      {
        chapterTitle: 'I. Field Observation',
        requiredDefeats: 1,
        text: 'A towering black-robed elder of the dreaded Ghost Clan whose skeletal rib-cage core burns with sinister emerald-violet soul fire. Orbiting bone talismans spin around its shoulders as it rises from deep volcanic rifts.',
      },
      {
        chapterTitle: 'II. Arcane Ecology',
        requiredDefeats: 2,
        text: 'Commanding subordinate earth wraiths through resonant nether shockwaves, the Soul Hall Reaper fires fanned volleys of soul chains while draining the surrounding atmosphere into an eerie eclipse chill.',
      },
      {
        chapterTitle: 'III. Serpent Chronicle',
        requiredDefeats: 4,
        text: 'Legends of the Continent tell of a lone Flame Emperor who shattered seven Soul Hall Elders beneath a roaring lotus of heavenly fire—proving that even the underworld fears an unyielding ascending spirit.',
      },
    ],
  },
];

export function resolveBestiaryId(kind: BeastKind, biome: BiomeId): BestiaryEntryId {
  if (kind === 'wraith') return 'nether_earth_wraith';
  if (kind === 'soul_elder') return 'soul_hall_reaper';
  if (kind === 'wolf') return biome === 'jungle' ? 'shadow_panther_wolf' : 'dire_ridge_wolf';
  if (kind === 'boar') return biome === 'jungle' ? 'ember_tusk_ravager' : 'ironhorn_boar';
  if (kind === 'eagle') return biome === 'jungle' ? 'tempest_canopy_hawk' : 'storm_talon_griffin';
  return biome === 'jungle' ? 'ancient_spirit_stag' : 'mythic_peak_guardian';
}

export function createEmptyBestiaryRecord(): BestiaryRecord {
  return {
    encountered: false,
    inspected: false,
    defeatedCount: 0,
    firstDefeatedAt: null,
    firstDefeatedLevel: 1,
    lowestTierDefeated: null,
    highestAltitudeMeters: 0,
  };
}

export function sanitizeBestiaryRecords(
  raw: unknown,
): Partial<Record<BestiaryEntryId, BestiaryRecord>> {
  if (!raw || typeof raw !== 'object') return {};
  const validIds = new Set<string>(BESTIARY_CATALOG.map((e) => e.id));
  const out: Partial<Record<BestiaryEntryId, BestiaryRecord>> = {};
  const source = raw as Record<string, Partial<BestiaryRecord> | undefined>;

  for (const key of Object.keys(source)) {
    if (!validIds.has(key)) continue;
    const entry = source[key];
    if (!entry || typeof entry !== 'object') continue;
    const defeatedCount =
      typeof entry.defeatedCount === 'number' && Number.isFinite(entry.defeatedCount)
        ? Math.max(0, Math.floor(entry.defeatedCount))
        : 0;
    const encountered = Boolean(entry.encountered || defeatedCount > 0);
    const inspected = Boolean(entry.inspected);
    if (!encountered && defeatedCount === 0 && !inspected) continue;

    out[key as BestiaryEntryId] = {
      encountered,
      inspected,
      defeatedCount,
      firstDefeatedAt:
        typeof entry.firstDefeatedAt === 'number' && Number.isFinite(entry.firstDefeatedAt)
          ? entry.firstDefeatedAt
          : null,
      firstDefeatedLevel:
        typeof entry.firstDefeatedLevel === 'number' && Number.isFinite(entry.firstDefeatedLevel)
          ? Math.max(1, Math.min(12, Math.floor(entry.firstDefeatedLevel)))
          : 1,
      lowestTierDefeated:
        typeof entry.lowestTierDefeated === 'number' && Number.isFinite(entry.lowestTierDefeated)
          ? Math.max(1, Math.min(12, Math.floor(entry.lowestTierDefeated)))
          : null,
      highestAltitudeMeters:
        typeof entry.highestAltitudeMeters === 'number' && Number.isFinite(entry.highestAltitudeMeters)
          ? Math.max(0, Math.round(entry.highestAltitudeMeters))
          : 0,
    };
  }
  return out;
}

export function countUnlockedLoreForEntry(def: BestiaryEntryDef, defeatedCount: number): number {
  let count = 0;
  for (const ch of def.loreChapters) {
    if (defeatedCount >= ch.requiredDefeats) count++;
  }
  return count;
}

export function computeBestiaryPowerScore(def: BestiaryEntryDef): number {
  const raw =
    def.baseHp * 4.0 +
    def.baseSpeed * 1.1 +
    def.aggroRadius * 0.25 +
    def.xpReward * 0.095 +
    (def.isBoss ? 10 : 0);
  return Math.max(10, Math.min(100, Math.round(raw)));
}

export function getThreatRatingInfo(def: BestiaryEntryDef): ThreatRatingInfo {
  const powerScore = computeBestiaryPowerScore(def);
  if (def.isBoss || powerScore >= 80) {
    return {
      rating: 'legendary',
      label: 'Legendary',
      rank: 3,
      powerScore,
      summary: `Apex Shrine Boss · Recommended Tier ${def.minTier}+`,
    };
  }
  if (powerScore >= 44) {
    return {
      rating: 'elite',
      label: 'Elite',
      rank: 2,
      powerScore,
      summary: `High-Danger Specialist · Recommended Tier ${def.minTier}+`,
    };
  }
  return {
    rating: 'common',
    label: 'Common',
    rank: 1,
    powerScore,
    summary: `Foothill Stalker · Encountered from Tier ${def.minTier}+`,
  };
}

export function matchesBestiaryQuery(entry: BestiaryEntrySnapshot, rawQuery: string): boolean {
  const normalized = rawQuery.trim().toLowerCase();
  if (!normalized) return true;
  const tokens = normalized.split(/\s+/u).filter(Boolean);
  if (tokens.length === 0) return true;

  const { def, threat } = entry;
  const biomeAliases = def.biome === 'jungle' ? 'jungle rainforest canopy' : 'alpine mountain peak';
  const loreText = def.loreChapters
    .map((ch) => `${ch.chapterTitle} ${ch.text}`)
    .join(' ');
  const haystack = [
    def.name,
    def.epithet,
    def.classification,
    def.habitat,
    def.kind,
    biomeAliases,
    threat.label,
    def.attackStyle,
    def.tacticalNote,
    def.fieldRumor,
    loreText,
  ]
    .join(' ')
    .toLowerCase();

  return tokens.every((tok) => haystack.includes(tok));
}

export function buildBestiarySnapshot(
  records: Partial<Record<BestiaryEntryId, BestiaryRecord>>,
  playerLevel: number,
): BestiarySnapshot {
  const lvlScale = 1 + (Math.max(1, playerLevel) - 1) * 0.08;
  let discoveredCount = 0;
  let totalDefeated = 0;
  let unlockedLoreCount = 0;
  let totalLoreCount = 0;

  const entries: BestiaryEntrySnapshot[] = BESTIARY_CATALOG.map((def) => {
    const rec = records[def.id] ?? createEmptyBestiaryRecord();
    const threat = getThreatRatingInfo(def);
    const discovered = rec.defeatedCount > 0;
    const sightedOnly = !discovered && rec.encountered;
    const rawBaseHp =
      def.kind === 'soul_elder'
        ? 210
        : def.kind === 'guardian'
          ? 175
          : def.kind === 'wraith'
            ? 84
            : def.kind === 'boar'
              ? 74
              : def.kind === 'eagle'
                ? 68
                : 46;
    const scaledHp = Math.round(rawBaseHp * lvlScale);
    const unlockedLore = countUnlockedLoreForEntry(def, rec.defeatedCount);
    const totalLore = def.loreChapters.length;
    const nextChapter = def.loreChapters.find((c) => rec.defeatedCount < c.requiredDefeats);

    if (discovered) discoveredCount++;
    totalDefeated += rec.defeatedCount;
    unlockedLoreCount += unlockedLore;
    totalLoreCount += totalLore;

    return {
      def,
      record: rec,
      threat,
      discovered,
      sightedOnly,
      scaledHp,
      unlockedLoreCount: unlockedLore,
      totalLoreCount: totalLore,
      nextLoreThreshold: nextChapter ? nextChapter.requiredDefeats : null,
    };
  });

  return {
    entries,
    discoveredCount,
    totalSpeciesCount: BESTIARY_CATALOG.length,
    totalDefeated,
    unlockedLoreCount,
    totalLoreCount,
    playerLevel,
  };
}

/**
 * Distinct inline vector insignias for Common, Elite, and Legendary threat badges.
 */
export function renderThreatBadgeIconSvg(rating: ThreatRating): string {
  switch (rating) {
    case 'common':
      return `
        <svg class="threat-badge-icon" viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
          <path d="M8 2.2 L12.8 8 L8 13.8 L3.2 8 Z" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
          <circle cx="8" cy="8" r="1.4" fill="currentColor" />
        </svg>
      `;
    case 'elite':
      return `
        <svg class="threat-badge-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path d="M3 10.5 L8 5.2 L13 10.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M4.6 13.4 L8 9.8 L11.4 13.4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M8 1.8 L9.9 3.7 L8 5.6 L6.1 3.7 Z" fill="currentColor" />
        </svg>
      `;
    case 'legendary':
      return `
        <svg class="threat-badge-icon" viewBox="0 0 18 16" width="15" height="14" aria-hidden="true">
          <path d="M2.2 12.2 L3.4 5.2 L6.8 8.4 L9 2.6 L11.2 8.4 L14.6 5.2 L15.8 12.2 Z" fill="currentColor" fill-opacity="0.22" stroke="currentColor" stroke-width="1.45" stroke-linejoin="round" />
          <line x1="3" y1="14.2" x2="15" y2="14.2" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" />
          <circle cx="9" cy="1.8" r="1.15" fill="currentColor" />
        </svg>
      `;
  }
}

export function renderThreatBadgeHtml(
  threat: ThreatRatingInfo,
  variant: 'compact' | 'hero' | 'inline',
  muted = false,
): string {
  const pips =
    variant === 'compact'
      ? ''
      : `<span class="threat-pips" aria-hidden="true">${[1, 2, 3]
          .map((n) => `<span class="threat-pip${n <= threat.rank ? ' lit' : ''}"></span>`)
          .join('')}</span>`;
  const powerSuffix =
    variant === 'hero'
      ? `<span class="threat-badge-pwr">PWR ${threat.powerScore}</span>`
      : '';
  const mutedClass = muted ? ' is-muted' : '';

  return `
    <span class="threat-badge threat-${threat.rating} variant-${variant}${mutedClass}" aria-label="Threat rating: ${threat.label}, power level ${threat.powerScore} of 100">
      ${renderThreatBadgeIconSvg(threat.rating)}
      <span class="threat-badge-label">${threat.label}</span>
      ${pips}
      ${powerSuffix}
    </span>
  `;
}

/**
 * Crisp inline vector emblem fallback if a portrait asset is unavailable or masked for uncharted beasts.
 */
export function renderBestiaryCrestSvg(kind: BeastKind): string {
  switch (kind) {
    case 'wolf':
      return `
        <svg viewBox="0 0 64 64" width="44" height="44" aria-hidden="true">
          <path d="M16 46 L20 22 L28 30 L36 30 L44 22 L48 46 L32 54 Z" fill="none" stroke="#9fd8c4" stroke-width="2.1" stroke-linejoin="round" />
          <path d="M25 38 L29 40 M39 38 L35 40 M29 46 L32 49 L35 46" fill="none" stroke="#f2c14e" stroke-width="2" stroke-linecap="round" />
        </svg>
      `;
    case 'boar':
      return `
        <svg viewBox="0 0 64 64" width="44" height="44" aria-hidden="true">
          <path d="M18 36 C18 22 46 22 46 36 C46 47 38 52 32 52 C26 52 18 47 18 36 Z" fill="none" stroke="#d9a679" stroke-width="2.1" />
          <path d="M20 43 C11 40 10 31 15 26 M44 43 C53 40 54 31 49 26" fill="none" stroke="#f2c14e" stroke-width="2.4" stroke-linecap="round" />
          <circle cx="28" cy="43" r="1.6" fill="#f2c14e" />
          <circle cx="36" cy="43" r="1.6" fill="#f2c14e" />
        </svg>
      `;
    case 'eagle':
      return `
        <svg viewBox="0 0 64 64" width="44" height="44" aria-hidden="true">
          <path d="M10 26 C20 18 28 24 32 32 C36 24 44 18 54 26 C46 34 40 38 32 50 C24 38 18 34 10 26 Z" fill="none" stroke="#7fe4ff" stroke-width="2.1" stroke-linejoin="round" />
          <path d="M28 22 L32 14 L36 22" fill="none" stroke="#f2c14e" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      `;
    case 'guardian':
      return `
        <svg viewBox="0 0 64 64" width="44" height="44" aria-hidden="true">
          <path d="M26 30 C16 24 14 14 18 10 M22 20 L14 18 M38 30 C48 24 50 14 46 10 M42 20 L50 18" fill="none" stroke="#d8a8ff" stroke-width="2.1" stroke-linecap="round" />
          <path d="M24 34 L32 28 L40 34 L36 52 L32 56 L28 52 Z" fill="none" stroke="#f2c14e" stroke-width="2.1" stroke-linejoin="round" />
          <circle cx="32" cy="18" r="3" fill="#ffe48f" />
        </svg>
      `;
    case 'wraith':
      return `
        <svg viewBox="0 0 64 64" width="44" height="44" aria-hidden="true">
          <path d="M20 50 L23 22 C25 13 39 13 41 22 L44 50 L37 44 L32 52 L27 44 Z" fill="none" stroke="#a78bfa" stroke-width="2.1" stroke-linejoin="round" />
          <circle cx="28" cy="26" r="2.2" fill="#4af2b8" />
          <circle cx="36" cy="26" r="2.2" fill="#4af2b8" />
          <path d="M16 54 Q32 48 48 54" fill="none" stroke="#4af2b8" stroke-width="1.8" stroke-linecap="round" />
        </svg>
      `;
    case 'soul_elder':
      return `
        <svg viewBox="0 0 64 64" width="44" height="44" aria-hidden="true">
          <path d="M18 18 L26 24 L32 10 L38 24 L46 18 L43 50 L32 56 L21 50 Z" fill="none" stroke="#e879f9" stroke-width="2.1" stroke-linejoin="round" />
          <circle cx="27" cy="29" r="2.3" fill="#4af2b8" />
          <circle cx="37" cy="29" r="2.3" fill="#4af2b8" />
          <path d="M48 14 C56 20 56 34 46 42 M50 14 L50 54" fill="none" stroke="#f2c14e" stroke-width="2" stroke-linecap="round" />
        </svg>
      `;
  }
}
