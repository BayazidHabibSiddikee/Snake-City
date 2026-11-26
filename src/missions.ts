export type PortalTrialType = 'quiz' | 'strategy' | 'network' | 'alchemy' | 'card_duel';

export interface QuizQuestionItem {
  prompt: string;
  options: string[];
  correctIndex: number;
  hint: string;
  explanation: string;
}

export interface StrategyChoiceItem {
  label: string;
  summary: string;
  success: boolean;
  timePenaltySec: number;
  outcomeText: string;
}

export interface NetworkPuzzleSpec {
  nodeLabels: [string, string, string, string];
  nodeWeights: [number, number, number, number];
  targetSignal: number;
  clue: string;
}

export interface AlchemyPuzzleSpec {
  reagents: Array<{ id: string; name: string; colorHex: string; trait: string }>;
  correctPair: [string, string];
  clue: string;
  formulaName: string;
}

export interface PortalMissionDef {
  id: string;
  floorNumber: 1 | 2 | 3 | 4 | 5;
  floorLabel: string;
  type: PortalTrialType;
  title: string;
  subtitle: string;
  briefing: string;
  xpReward: number;
  soulTitle: string;
  accentHex: string;
  quiz?: QuizQuestionItem;
  strategy?: {
    situation: string;
    choices: StrategyChoiceItem[];
  };
  network?: NetworkPuzzleSpec;
  alchemy?: AlchemyPuzzleSpec;
  cardDuel?: {
    rivalNames: [string, string, string];
    shadowBossName: string;
    loreQuote: string;
  };
}

export interface SoulMissionSaveState {
  collectedSouls: number;
  remainingSeconds: number;
  completedPortalKeys: string[];
  completedMissionIds: string[];
  hospitalRevelationSeen: boolean;
  fifteenthMysterySeen: boolean;
}

export interface CardDuelParticipant {
  id: string;
  name: string;
  isPlayer: boolean;
  alive: boolean;
  lastCard: number | null;
}

export interface CardDuelRoundResult {
  round: number;
  draws: Array<{ participantId: string; name: string; card: number; isReaper: boolean }>;
  eliminatedId: string | null;
  eliminatedName: string | null;
  playerSurvived: boolean;
  remainingAliveCount: number;
  logMessage: string;
}

export const SOUL_TARGET_COUNT = 14;
export const INITIAL_COMA_SECONDS = 40 * 3600; // 40:00:00 countdown
const STORAGE_KEY = 'SERPENT_PEAKS_SOUL_MISSIONS_V1';

export const HOSPITAL_REVELATION_TEXT =
  '"You understand now, don\'t you? The bells, the quiet white corridor, the 40-hour monitor... This mountain is the space between heartbeats. Gather the remaining Soul Fragments before the clock hits zero. Please—save me."';

export const FIFTEENTH_SOUL_EPILOGUE_TEXT =
  '"All 14 Soul Fragments resonate in unison across the Mirror-House... Wait. Look closely at the last reflection: there was never a fifteenth soul. The final witness waking up on the summit was always you."';

export const PORTAL_MISSION_CATALOG: PortalMissionDef[] = [
  // --- FLOOR 1: KNOWLEDGE TRIALS (QUIZZES & ARCHIVE RIDDLES) ---
  {
    id: 'f1-archive-echo',
    floorNumber: 1,
    floorLabel: 'FLOOR 1 · KNOWLEDGE TRIAL',
    type: 'quiz',
    title: 'The Whispering Archive Exam',
    subtitle: 'Answer the spectral librarian’s riddle before the ink fades.',
    briefing:
      'Rows of floating mirrors hum with fragments of forgotten textbooks. Solve the core principle to crystallize a Soul Fragment.',
    xpReward: 420,
    soulTitle: 'Fragment of Lucid Recall',
    accentHex: '#38bdf8',
    quiz: {
      prompt:
        'In optics and a 360° Hall of Mirrors, why does an infinity mirror appear to stretch endlessly into depth?',
      options: [
        'Two parallel reflective surfaces bounce light back and forth while a partially silvered front glass lets a fraction escape to your eyes',
        'Mirrors generate their own photons whenever ambient temperature drops below freezing',
        'Curved glass slows the speed of light to zero inside the frame',
        'Sound waves bend light rays into circular loops',
      ],
      correctIndex: 0,
      hint: 'Think about a full mirror behind a semi-transparent two-way mirror.',
      explanation:
        'Each round-trip reflection travels twice the cavity distance, creating an infinite receding corridor of dimmer images.',
    },
  },
  {
    id: 'f1-serpent-meridian',
    floorNumber: 1,
    floorLabel: 'FLOOR 1 · KNOWLEDGE TRIAL',
    type: 'quiz',
    title: 'Cultivation Meridian Quiz',
    subtitle: 'Prove mastery of Serpent Peaks alpine traversal & climate tactics.',
    briefing:
      'The portal guardian demands tactical awareness of the peaks before surrendering the trapped soul ember.',
    xpReward: 420,
    soulTitle: 'Fragment of Alpine Focus',
    accentHex: '#22d3ee',
    quiz: {
      prompt:
        'During an Extreme Blizzard or Supercell Storm on Serpent Peaks, where can a cultivating serpent rapidly recover Vitality (HP) and Qi?',
      options: [
        'Inside the glowing radius of a Trial Peak Shrine shelter',
        'At the deepest bottom of a glacial lake',
        'By colliding directly with falling granite boulders',
        'By standing still at the outer cliff wall without moving',
      ],
      correctIndex: 0,
      hint: 'Severe climates drain HP across exposed ridges — seek glowing sanctuaries.',
      explanation:
        'Trial Peak Shrines act as sheltered sanctuaries that restore Vitality and Qi even during brutal storms.',
    },
  },
  {
    id: 'f1-temporal-clock',
    floorNumber: 1,
    floorLabel: 'FLOOR 1 · KNOWLEDGE TRIAL',
    type: 'quiz',
    title: 'The Forty-Hour Paradox',
    subtitle: 'Decode the temporal signal ticking inside the portal core.',
    briefing:
      'A ghostly digital readout flickers above the portal doorway. Only a sharp deduction stabilizes its frequency.',
    xpReward: 450,
    soulTitle: 'Fragment of Stolen Time',
    accentHex: '#60a5fa',
    quiz: {
      prompt:
        'If a spatial sound source orbits from the left wall of a Mirror-House to the right wall, which acoustic cues tell your brain its direction?',
      options: [
        'Interaural Time Difference (ITD), Interaural Level Difference (ILD), and HRTF ear-shape filtering',
        'Only the monitor refresh rate in Hertz',
        'Screen brightness and GPU memory bandwidth',
        'The DC voltage of the browser localStorage cache',
      ],
      correctIndex: 0,
      hint: 'Our two ears compare arrival time, loudness, and spectral reflections.',
      explanation:
        'HRTF 3D spatialization models arrival delay, ear shadowing, and pinna reflections to place shimmering sounds in 3D space.',
    },
  },
  {
    id: 'f1-network-protocol',
    floorNumber: 1,
    floorLabel: 'FLOOR 1 · KNOWLEDGE TRIAL',
    type: 'quiz',
    title: 'Ghost Drive Cipher',
    subtitle: 'Crack the computing architecture question locking this portal.',
    briefing:
      'An echo of a dim library terminal asks for the exact foundation of packet switching.',
    xpReward: 440,
    soulTitle: 'Fragment of Signal Logic',
    accentHex: '#34d399',
    quiz: {
      prompt:
        'Which transport-layer protocol guarantees ordered, reliable delivery with acknowledgments and retransmission?',
      options: [
        'TCP (Transmission Control Protocol)',
        'UDP (User Datagram Protocol)',
        'ICMP Echo Ping',
        'ARP (Address Resolution Protocol)',
      ],
      correctIndex: 0,
      hint: 'It uses a three-way handshake (SYN, SYN-ACK, ACK).',
      explanation:
        'TCP tracks sequence numbers and retransmits lost packets so every piece of data arrives intact and in order.',
    },
  },

  // --- FLOOR 2: TACTICAL RESCUE & STRATEGY TRIALS (LAST BELL / BUSINESS STRATEGY) ---
  {
    id: 'f2-last-bell-wing',
    floorNumber: 2,
    floorLabel: 'FLOOR 2 · TACTICAL RESCUE',
    type: 'strategy',
    title: 'Last Bell: Collapsed East Wing',
    subtitle: 'Assign your squad under rising mist pressure to save everyone.',
    briefing:
      'A spectral school bell rings twice. Three trapped echoes await extraction before the corridor seals. Choose the optimal strategy.',
    xpReward: 520,
    soulTitle: 'Fragment of the Last Bell',
    accentHex: '#fbbf24',
    strategy: {
      situation:
        'The North Stairwell is choked with Ashstorm smoke, the South Balcony holds a fragile rope bridge, and the East Archive has a jammed fire door with 3 survivors signaling inside. You have 1 Scout, 1 Vanguard, and 1 Medic.',
      choices: [
        {
          label: 'Vanguard braces the jammed East door · Scout clears South exit · Medic triages inside',
          summary: 'Balanced 3-role split — protects choke point while verifying safe escape path.',
          success: true,
          timePenaltySec: 0,
          outcomeText:
            'Flawless extraction! The Vanguard holds the frame, the Scout marks a clear balcony ledge, and all three echoes escape with zero casualties.',
        },
        {
          label: 'Send everyone blindly into the smoke-filled North Stairwell at full sprint',
          summary: 'High-speed gamble with zero visibility or choke-point cover.',
          success: false,
          timePenaltySec: 45,
          outcomeText:
            'The Ashstorm blinds the squad and costs precious minutes on the coma clock. Regroup and assign specialized roles!',
        },
        {
          label: 'Wait outside for the smoke to clear on its own while conserving stamina',
          summary: 'Passive delay — risks sealing the archive completely.',
          success: false,
          timePenaltySec: 60,
          outcomeText:
            'The portal seal tightens before anyone reaches the door! Active coordinated extraction is required.',
        },
      ],
    },
  },
  {
    id: 'f2-skybridge-escort',
    floorNumber: 2,
    floorLabel: 'FLOOR 2 · TACTICAL RESCUE',
    type: 'strategy',
    title: 'Strategy Trial: Glacier Supply Route',
    subtitle: 'Balance resource risk, shelter distance, and expedition tempo.',
    briefing:
      'A Blizzard approaches the high saddle between Sunstone Citadel and Crown of Humanity. Make the decisive command.',
    xpReward: 540,
    soulTitle: 'Fragment of Iron Resolve',
    accentHex: '#f59e0b',
    strategy: {
      situation:
        'Your expedition has 45% Vitality and 1 Portal Beacon left. A Soul Hall Wraith pack patrols the short ridge, while a Trial Shrine sits 60m west off the main path.',
      choices: [
        {
          label: 'Detour 60m to the Trial Shrine to restore HP & Qi, then shatter the Wraith pack with a Shockwave',
          summary: 'Converts terrain shelter into combat advantage before engaging.',
          success: true,
          timePenaltySec: 0,
          outcomeText:
            'Brilliant tactical discipline! Full Qi lets you stagger the Wraith pack cleanly and claim the Soul Fragment.',
        },
        {
          label: 'Charge straight into the Wraith pack at 45% HP during peak Blizzard drain',
          summary: 'Reckless head-on clash with compounding climate damage.',
          success: false,
          timePenaltySec: 50,
          outcomeText:
            'Freezing wind and Soul Chains overwhelm your guard. Re-plan using the Shrine shelter!',
        },
        {
          label: 'Discard the Portal Beacon to lighten weight and slide down into the glacial lake',
          summary: 'Abandons your lifeline into deep freezing water.',
          success: false,
          timePenaltySec: 40,
          outcomeText:
            'Plunging into icy waters drains stamina instantly. Keep your beacon and secure high-ground shelter!',
        },
      ],
    },
  },
  {
    id: 'f2-market-vault',
    floorNumber: 2,
    floorLabel: 'FLOOR 2 · BUSINESS & STRATEGY',
    type: 'strategy',
    title: 'Floor 2 Ledger: Sovereign Resource Split',
    subtitle: 'Allocate limited Qi Crystals across defense, scouting, and portal sync.',
    briefing:
      'To open the Floor 2 Vault, your allocation must survive both an unexpected storm and a Soul Hall raid.',
    xpReward: 510,
    soulTitle: 'Fragment of Balanced Scales',
    accentHex: '#fb923c',
    strategy: {
      situation:
        'You hold 100 Qi Shards. Investing 100% into offense leaves the Portal Relay unshielded; hoarding 100% yields zero momentum. What is the resilient split?',
      choices: [
        {
          label: '40% Relay Shielding · 35% High-Speed Scout Probes · 25% Reserve Emergency Qi',
          summary: 'Diversified resilient portfolio with a liquid emergency buffer.',
          success: true,
          timePenaltySec: 0,
          outcomeText:
            'The Vault Ledger chimes gold! Your balanced hedge absorbs the storm surge and unlocks the Soul Fragment.',
        },
        {
          label: '100% All-in on a single unverified glass-cannon strike with 0% reserve',
          summary: 'Zero margin of safety against storm volatility.',
          success: false,
          timePenaltySec: 45,
          outcomeText:
            'A single lightning gust disrupts the strike and leaves zero reserve to recover. Rebalance the allocation!',
        },
        {
          label: '0% deployed — lock all 100 shards in cold storage indefinitely',
          summary: 'Stagnation triggers automatic timeout penalties.',
          success: false,
          timePenaltySec: 35,
          outcomeText:
            'The relay starves of power while the clock ticks down. Deploy a balanced allocation!',
        },
      ],
    },
  },

  // --- FLOOR 3: NETWORK REPAIR TRIALS (INTERACTIVE PACKET-ROUTING PUZZLES) ---
  {
    id: 'f3-relay-alpha',
    floorNumber: 3,
    floorLabel: 'FLOOR 3 · NETWORK REPAIR',
    type: 'network',
    title: 'Mirror Relay: Frequency 11 Hz',
    subtitle: 'Toggle the 4 optical router nodes to hit exact throughput 11.',
    briefing:
      'Packets are bouncing endlessly between broken portal mirrors. Activate the exact subset of relay nodes whose weights sum to the target frequency.',
    xpReward: 580,
    soulTitle: 'Fragment of Clear Conduit',
    accentHex: '#a855f7',
    network: {
      nodeLabels: ['North Gate (+2)', 'Core Prism (+4)', 'Sky Bridge (+5)', 'Shadow Bus (+8)'],
      nodeWeights: [2, 4, 5, 8],
      targetSignal: 11,
      clue: 'Combine three lighter conduits—or pair the Core and Sky lines—to reach exactly 11 Hz without overloading Shadow Bus.',
    },
  },
  {
    id: 'f3-relay-beta',
    floorNumber: 3,
    floorLabel: 'FLOOR 3 · NETWORK REPAIR',
    type: 'network',
    title: 'Wormhole Packet Bridge: 15 Hz',
    subtitle: 'Synchronize the 4 portal routers to stabilize the Chromium tunnel.',
    briefing:
      'A severed cable splits Portal A from Portal B. Match the exact harmonic sum of 15 Hz to re-establish full-duplex sync.',
    xpReward: 600,
    soulTitle: 'Fragment of Synchronized Mesh',
    accentHex: '#c084fc',
    network: {
      nodeLabels: ['Pulse Node (+3)', 'Glacier Link (+6)', 'Apex Tower (+7)', 'Crown Trunk (+9)'],
      nodeWeights: [3, 6, 7, 9],
      targetSignal: 15,
      clue: 'Only one pair—or three-node bridge—lands on 15 Hz cleanly (try pairing Glacier Link + Crown Trunk).',
    },
  },
  {
    id: 'f3-relay-gamma',
    floorNumber: 3,
    floorLabel: 'FLOOR 3 · NETWORK REPAIR',
    type: 'network',
    title: 'Ghost Drive Firewall: 13 Hz',
    subtitle: 'Route clean packets around the Soul Hall jammer to hit 13 Hz.',
    briefing:
      'Activate the exact combination of network relays that matches the 13 Hz cryptographic checksum.',
    xpReward: 610,
    soulTitle: 'Fragment of Unbroken Packets',
    accentHex: '#e879f9',
    network: {
      nodeLabels: ['Echo Bus (+1)', 'Mist Switch (+4)', 'Lotus Fiber (+5)', 'Sovereign Core (+8)'],
      nodeWeights: [1, 4, 5, 8],
      targetSignal: 13,
      clue: 'Target is 13 Hz: pair the heavy Sovereign Core (+8) with the Lotus Fiber (+5), or balance with Echo + Mist.',
    },
  },

  // --- FLOOR 4: CHEMICAL ALCHEMY TRIALS (SAFE FICTIONAL COMPOUND STABILIZATION) ---
  {
    id: 'f4-alchemy-lumen',
    floorNumber: 4,
    floorLabel: 'FLOOR 4 · ALCHEMY LAB',
    type: 'alchemy',
    title: 'Celestial Dew Stabilization',
    subtitle: 'Select 2 fictional reagents from the apothecary ledger to calm the rift.',
    briefing:
      'Four glowing flasks hover above the crucible. Read the alchemist’s journal carefully and combine the exact stabilizing pair.',
    xpReward: 640,
    soulTitle: 'Fragment of Azure Catalyst',
    accentHex: '#2dd4bf',
    alchemy: {
      formulaName: 'Starlight Neutralizer',
      clue: 'Journal Note: "To cool a blazing Rift without shattering the mirror glass, bind the Mountain Frost Ether with the soothing Jade Lotus Dew."',
      reagents: [
        { id: 'frost-ether', name: 'Frost Ether', colorHex: '#38bdf8', trait: 'Sub-zero alpine coolant' },
        { id: 'cinder-resin', name: 'Cinder Resin', colorHex: '#f97316', trait: 'Volatile volcanic sap' },
        { id: 'jade-dew', name: 'Jade Lotus Dew', colorHex: '#34d399', trait: 'Harmonizing mirror binder' },
        { id: 'obsidian-ash', name: 'Obsidian Ash', colorHex: '#a855f7', trait: 'Heavy shadow sediment' },
      ],
      correctPair: ['frost-ether', 'jade-dew'],
    },
  },
  {
    id: 'f4-alchemy-prism',
    floorNumber: 4,
    floorLabel: 'FLOOR 4 · ALCHEMY LAB',
    type: 'alchemy',
    title: 'Mirror-Glass Elixir Synthesis',
    subtitle: 'Fuse two luminous compounds to repair the cracked portal lens.',
    briefing:
      'The portal’s outer prism is fractured. Only the luminous crystal reagent paired with liquid amber will mend it.',
    xpReward: 660,
    soulTitle: 'Fragment of Prismatic Glass',
    accentHex: '#14b8a6',
    alchemy: {
      formulaName: 'Prismatic Lens Seal',
      clue: 'Journal Note: "Pure Quartz Silver conducts light, while Sunstone Amber fuses hairline cracks. Avoid Void Mist—it clouds the lens."',
      reagents: [
        { id: 'quartz-silver', name: 'Quartz Silver', colorHex: '#e2e8f0', trait: 'Optical prism conductor' },
        { id: 'void-mist', name: 'Void Mist', colorHex: '#6366f1', trait: 'Light-absorbing fog' },
        { id: 'sunstone-amber', name: 'Sunstone Amber', colorHex: '#fbbf24', trait: 'Golden glass mender' },
        { id: 'iron-brine', name: 'Iron Brine', colorHex: '#94a3b8', trait: 'Corrosive mineral salt' },
      ],
      correctPair: ['quartz-silver', 'sunstone-amber'],
    },
  },

  // --- FLOOR 5: 29-CARD SOUL ELIMINATION & SHADOW DUEL ---
  {
    id: 'f5-29card-sanctum',
    floorNumber: 5,
    floorLabel: 'FLOOR 5 · 29-CARD SOUL TOURNAMENT',
    type: 'card_duel',
    title: 'The 29-Card Elimination & Shadow Duel',
    subtitle: 'Survive the 29-card Soul draw against 3 rivals, then win the 1v1 Shadow Duel!',
    briefing:
      'Four challengers sit around the Obsidian Table. A 29-card Soul Deck (Cards 1–28 + 1 Void Reaper) eliminates the lowest draw each round until 2 finalists clash in a Shadow Duel.',
    xpReward: 780,
    soulTitle: 'Fragment of the Final Table',
    accentHex: '#f43f5e',
    cardDuel: {
      rivalNames: ['Vesper the Archivist', 'Kael of Ironback', 'Mire the Whisperer'],
      shadowBossName: 'Mirror-Self Warden',
      loreQuote: '"Twenty-nine cards. Four seated shadows. Only one voice carries a Soul back to the living."',
    },
  },
  {
    id: 'f5-29card-crown',
    floorNumber: 5,
    floorLabel: 'FLOOR 5 · 29-CARD SOUL TOURNAMENT',
    type: 'card_duel',
    title: 'Soul Hall Grand Table: 29-Card Gambit',
    subtitle: 'Outlast three Soul Hall envoys in the 29-card draw and shatter the Shadow Sentinel.',
    briefing:
      'Use Steady Draw or Qi Gambit (bonus high-card resonance) to stay above the elimination cut, then outmaneuver the final Shadow Duelist.',
    xpReward: 820,
    soulTitle: 'Fragment of Sovereign Fate',
    accentHex: '#ec4899',
    cardDuel: {
      rivalNames: ['Elder Soren', 'Nyx the Lantern', 'Draven of Ash'],
      shadowBossName: 'Soul Hall Arbiter',
      loreQuote: '"Do not fear the Void Reaper card—fear drawing the smallest pulse when the bell tolls."',
    },
  },
];

/**
 * Pure deterministic hash mapping any portalKey (e.g. "rand-portal-4-120_-85" or "spawn-guard-portal-a")
 * to a consistent playable PortalMissionDef across all 5 Floors.
 */
export function assignMissionForPortal(portalKey: string, fallbackIndex = 0): PortalMissionDef {
  const clean = String(portalKey || '').trim();
  if (!clean) {
    return PORTAL_MISSION_CATALOG[Math.abs(fallbackIndex) % PORTAL_MISSION_CATALOG.length];
  }
  let hash = 2166136261;
  for (let i = 0; i < clean.length; i++) {
    hash ^= clean.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const idx = Math.abs(hash) % PORTAL_MISSION_CATALOG.length;
  return PORTAL_MISSION_CATALOG[idx];
}

/**
 * Pure helper evaluating Floor 3 Network Repair toggles against target frequency.
 */
export function evaluateNetworkCircuit(
  toggles: [boolean, boolean, boolean, boolean],
  spec: NetworkPuzzleSpec,
): { currentSignal: number; solved: boolean; delta: number } {
  let sum = 0;
  for (let i = 0; i < 4; i++) {
    if (toggles[i]) sum += spec.nodeWeights[i];
  }
  return {
    currentSignal: sum,
    solved: sum === spec.targetSignal,
    delta: spec.targetSignal - sum,
  };
}

/**
 * Pure helper evaluating Floor 4 Chemical Alchemy 2-reagent synthesis (order-independent).
 */
export function evaluateAlchemyMix(
  selectedIds: string[],
  spec: AlchemyPuzzleSpec,
): { validCount: boolean; solved: boolean } {
  if (selectedIds.length !== 2) {
    return { validCount: false, solved: false };
  }
  const [a, b] = selectedIds;
  const [c1, c2] = spec.correctPair;
  const solved = (a === c1 && b === c2) || (a === c2 && b === c1);
  return { validCount: true, solved };
}

/**
 * Pure helper running one elimination round of the Floor 5 29-Card Soul Tournament.
 * Deck holds cards 1..28 plus 0 (the Void Reaper). Lowest card among living participants is eliminated.
 * If player uses 'gambit' (Qi Sense), they draw 2 cards and keep the higher value!
 */
export function resolve29CardEliminationRound(
  participants: CardDuelParticipant[],
  roundNumber: number,
  playerAction: 'steady' | 'gambit',
  rng: () => number = Math.random,
): CardDuelRoundResult {
  const alive = participants.filter((p) => p.alive);
  if (alive.length <= 2) {
    return {
      round: roundNumber,
      draws: [],
      eliminatedId: null,
      eliminatedName: null,
      playerSurvived: alive.some((p) => p.isPlayer),
      remainingAliveCount: alive.length,
      logMessage: 'Two finalists remain — the Shadow Duel begins!',
    };
  }

  // Build shuffled 29-card Soul Deck (0 = Void Reaper, 1..28 = Soul Values)
  const deck: number[] = [];
  for (let c = 0; c <= 28; c++) deck.push(c);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = deck[i];
    deck[i] = deck[j];
    deck[j] = tmp;
  }

  const draws: Array<{ participantId: string; name: string; card: number; isReaper: boolean }> = [];
  for (const p of alive) {
    let card = deck.pop() ?? 1;
    if (p.isPlayer && playerAction === 'gambit') {
      const second = deck.pop() ?? 1;
      card = Math.max(card, second);
    } else if (p.isPlayer && card === 0) {
      // Gentle mercy check on round 1 steady draw: slight chance to deflect Reaper if Qi resonates
      if (roundNumber === 1 && rng() < 0.45) {
        card = Math.max(8, deck.pop() ?? 12);
      }
    }
    p.lastCard = card;
    draws.push({
      participantId: p.id,
      name: p.name,
      card,
      isReaper: card === 0,
    });
  }

  // Eliminate the participant with the lowest card (0 = Void Reaper always loses immediately)
  let lowest = draws[0];
  for (let i = 1; i < draws.length; i++) {
    if (draws[i].card < lowest.card) {
      lowest = draws[i];
    }
  }

  const loser = participants.find((p) => p.id === lowest.participantId);
  if (loser) loser.alive = false;

  const remaining = participants.filter((p) => p.alive);
  const playerSurvived = remaining.some((p) => p.isPlayer);

  const cardLabel = lowest.isReaper ? 'Card #0 (Void Reaper)' : `Soul Card #${lowest.card}`;
  const logMessage = loser?.isPlayer
    ? `You drew ${cardLabel} — lowest at the table! Reset the 29-Card Table to try again.`
    : `${lowest.name} drew ${cardLabel} and vanished into the mirror! ${remaining.length} challengers remain.`;

  return {
    round: roundNumber,
    draws,
    eliminatedId: lowest.participantId,
    eliminatedName: lowest.name,
    playerSurvived,
    remainingAliveCount: remaining.length,
    logMessage,
  };
}

/**
 * Formats the 40-hour Coma Countdown clock as HH:MM:SS.
 */
export function formatComaClock(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(clamped / 3600);
  const mins = Math.floor((clamped % 3600) / 60);
  const secs = clamped % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export class PortalMissionManager {
  private state: SoulMissionSaveState = {
    collectedSouls: 0,
    remainingSeconds: INITIAL_COMA_SECONDS,
    completedPortalKeys: [],
    completedMissionIds: [],
    hospitalRevelationSeen: false,
    fifteenthMysterySeen: false,
  };

  private saveThrottleSec = 0;

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<SoulMissionSaveState>;
      this.state = {
        collectedSouls:
          typeof parsed.collectedSouls === 'number' && Number.isFinite(parsed.collectedSouls)
            ? Math.max(0, Math.min(SOUL_TARGET_COUNT, Math.floor(parsed.collectedSouls)))
            : 0,
        remainingSeconds:
          typeof parsed.remainingSeconds === 'number' && Number.isFinite(parsed.remainingSeconds)
            ? Math.max(0, Math.min(INITIAL_COMA_SECONDS, parsed.remainingSeconds))
            : INITIAL_COMA_SECONDS,
        completedPortalKeys: Array.isArray(parsed.completedPortalKeys)
          ? parsed.completedPortalKeys.filter((k): k is string => typeof k === 'string').slice(0, 120)
          : [],
        completedMissionIds: Array.isArray(parsed.completedMissionIds)
          ? parsed.completedMissionIds.filter((k): k is string => typeof k === 'string').slice(0, 60)
          : [],
        hospitalRevelationSeen: Boolean(parsed.hospitalRevelationSeen),
        fifteenthMysterySeen: Boolean(parsed.fifteenthMysterySeen),
      };
    } catch {
      // ignore storage issues
    }
  }

  private save(): void {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      }
    } catch {
      // ignore quota issues
    }
  }

  public getState(): Readonly<SoulMissionSaveState> {
    return this.state;
  }

  public getCollectedSouls(): number {
    return this.state.collectedSouls;
  }

  public getRemainingSeconds(): number {
    return this.state.remainingSeconds;
  }

  public getFormattedClock(): string {
    return formatComaClock(this.state.remainingSeconds);
  }

  public tickClock(dt: number): void {
    if (dt <= 0 || this.state.remainingSeconds <= 0) return;
    this.state.remainingSeconds = Math.max(0, this.state.remainingSeconds - dt);
    this.saveThrottleSec += dt;
    if (this.saveThrottleSec >= 10) {
      this.saveThrottleSec = 0;
      this.save();
    }
  }

  public applyTimePenalty(seconds: number): void {
    const loss = Math.max(0, Math.floor(seconds));
    if (loss <= 0) return;
    this.state.remainingSeconds = Math.max(0, this.state.remainingSeconds - loss);
    this.save();
  }

  public getMissionForPortal(portalKey: string): PortalMissionDef {
    return assignMissionForPortal(portalKey);
  }

  public isPortalCompleted(portalKey: string): boolean {
    return this.state.completedPortalKeys.includes(portalKey);
  }

  public completePortalMission(
    portalKey: string,
    mission: PortalMissionDef,
  ): {
    firstTimeForPortal: boolean;
    soulAwarded: boolean;
    collectedSouls: number;
    triggeredHospitalRevelation: boolean;
    triggeredFifteenthMystery: boolean;
  } {
    const firstTimeForPortal = !this.state.completedPortalKeys.includes(portalKey);
    if (firstTimeForPortal && portalKey) {
      this.state.completedPortalKeys.push(portalKey);
    }
    if (!this.state.completedMissionIds.includes(mission.id)) {
      this.state.completedMissionIds.push(mission.id);
    }

    let soulAwarded = false;
    if (firstTimeForPortal && this.state.collectedSouls < SOUL_TARGET_COUNT) {
      this.state.collectedSouls += 1;
      soulAwarded = true;
    }

    let triggeredHospitalRevelation = false;
    if (this.state.collectedSouls >= 7 && !this.state.hospitalRevelationSeen) {
      this.state.hospitalRevelationSeen = true;
      triggeredHospitalRevelation = true;
    }

    let triggeredFifteenthMystery = false;
    if (this.state.collectedSouls >= SOUL_TARGET_COUNT && !this.state.fifteenthMysterySeen) {
      this.state.fifteenthMysterySeen = true;
      triggeredFifteenthMystery = true;
    }

    this.save();
    return {
      firstTimeForPortal,
      soulAwarded,
      collectedSouls: this.state.collectedSouls,
      triggeredHospitalRevelation,
      triggeredFifteenthMystery,
    };
  }
}
