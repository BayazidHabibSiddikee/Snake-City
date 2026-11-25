import { BiomeId, WeatherMode } from './types';

type TierTriggerKind =
  | 'cicadaPulse'
  | 'bambooClack'
  | 'woodenMarimba'
  | 'tribalDrum'
  | 'bambooFlute'
  | 'stormStaticChime'
  | 'canyonHorn'
  | 'singingBowl'
  | 'mysticHarp'
  | 'crystalChimes'
  | 'etherealChoir'
  | 'solarAscensionChime';

interface EvolutionSoundscapeProfile {
  level: number;
  name: string;
  rootHz: number;
  fifthHz: number;
  shimmerHz: number;
  oscTypeA: OscillatorType;
  oscTypeB: OscillatorType;
  filterHz: number;
  droneGain: number;
  shimmerGain: number;
  lfoHz: number;
  lfoDepth: number;
  windPitchBias: number;
  triggerKind: TierTriggerKind;
  minIntervalMs: number;
  maxIntervalMs: number;
}

/**
 * 12 unique ambient soundscape profiles spanning Tier 1 (Valley Hatchling)
 * through Tier 12 (Ascended Human). Progresses organically from low earthy
 * jungle-floor drones & insect/bamboo textures up to temple singing bowls,
 * crystalline ridge chimes, celestial choir swells, and radiant solar harmonies.
 */
const TIER_SOUNDSCAPES: readonly EvolutionSoundscapeProfile[] = [
  {
    level: 1,
    name: 'Valley Hatchling',
    rootHz: 73.42, // D2
    fifthHz: 110.0, // A2
    shimmerHz: 293.66, // D4
    oscTypeA: 'sine',
    oscTypeB: 'sine',
    filterHz: 310,
    droneGain: 0.024,
    shimmerGain: 0.003,
    lfoHz: 0.08,
    lfoDepth: 45,
    windPitchBias: -25,
    triggerKind: 'cicadaPulse',
    minIntervalMs: 3600,
    maxIntervalMs: 6200,
  },
  {
    level: 2,
    name: 'Foothill Viper',
    rootHz: 82.41, // E2
    fifthHz: 123.47, // B2
    shimmerHz: 329.63, // E4
    oscTypeA: 'sine',
    oscTypeB: 'triangle',
    filterHz: 350,
    droneGain: 0.026,
    shimmerGain: 0.004,
    lfoHz: 0.095,
    lfoDepth: 55,
    windPitchBias: -15,
    triggerKind: 'bambooClack',
    minIntervalMs: 3500,
    maxIntervalMs: 6000,
  },
  {
    level: 3,
    name: 'Mossback Cobra',
    rootHz: 92.5, // F#2
    fifthHz: 138.59, // C#3
    shimmerHz: 369.99, // F#4
    oscTypeA: 'sine',
    oscTypeB: 'triangle',
    filterHz: 400,
    droneGain: 0.028,
    shimmerGain: 0.005,
    lfoHz: 0.105,
    lfoDepth: 65,
    windPitchBias: -5,
    triggerKind: 'woodenMarimba',
    minIntervalMs: 3800,
    maxIntervalMs: 6500,
  },
  {
    level: 4,
    name: 'Horned Ridge Serpent',
    rootHz: 98.0, // G2
    fifthHz: 146.83, // D3
    shimmerHz: 392.0, // G4
    oscTypeA: 'triangle',
    oscTypeB: 'sine',
    filterHz: 440,
    droneGain: 0.031,
    shimmerGain: 0.006,
    lfoHz: 0.115,
    lfoDepth: 75,
    windPitchBias: 10,
    triggerKind: 'tribalDrum',
    minIntervalMs: 4200,
    maxIntervalMs: 7200,
  },
  {
    level: 5,
    name: 'Timber Wyrm',
    rootHz: 110.0, // A2
    fifthHz: 164.81, // E3
    shimmerHz: 440.0, // A4
    oscTypeA: 'sine',
    oscTypeB: 'triangle',
    filterHz: 500,
    droneGain: 0.032,
    shimmerGain: 0.008,
    lfoHz: 0.125,
    lfoDepth: 85,
    windPitchBias: 24,
    triggerKind: 'bambooFlute',
    minIntervalMs: 4400,
    maxIntervalMs: 7400,
  },
  {
    level: 6,
    name: 'Storm Drake',
    rootHz: 123.47, // B2
    fifthHz: 185.0, // F#3
    shimmerHz: 493.88, // B4
    oscTypeA: 'triangle',
    oscTypeB: 'triangle',
    filterHz: 580,
    droneGain: 0.035,
    shimmerGain: 0.01,
    lfoHz: 0.155,
    lfoDepth: 115,
    windPitchBias: 42,
    triggerKind: 'stormStaticChime',
    minIntervalMs: 3900,
    maxIntervalMs: 6800,
  },
  {
    level: 7,
    name: 'Cloud Serpent',
    rootHz: 138.59, // C#3
    fifthHz: 207.65, // G#3
    shimmerHz: 554.37, // C#5
    oscTypeA: 'sine',
    oscTypeB: 'triangle',
    filterHz: 650,
    droneGain: 0.036,
    shimmerGain: 0.012,
    lfoHz: 0.14,
    lfoDepth: 120,
    windPitchBias: 58,
    triggerKind: 'canyonHorn',
    minIntervalMs: 4600,
    maxIntervalMs: 7800,
  },
  {
    level: 8,
    name: 'Emerald Naga',
    rootHz: 146.83, // D3
    fifthHz: 220.0, // A3
    shimmerHz: 587.33, // D5
    oscTypeA: 'sine',
    oscTypeB: 'sine',
    filterHz: 740,
    droneGain: 0.038,
    shimmerGain: 0.015,
    lfoHz: 0.13,
    lfoDepth: 130,
    windPitchBias: 72,
    triggerKind: 'singingBowl',
    minIntervalMs: 4800,
    maxIntervalMs: 8000,
  },
  {
    level: 9,
    name: 'Mythic Naga Sage',
    rootHz: 164.81, // E3
    fifthHz: 246.94, // B3
    shimmerHz: 659.25, // E5
    oscTypeA: 'sine',
    oscTypeB: 'triangle',
    filterHz: 840,
    droneGain: 0.04,
    shimmerGain: 0.017,
    lfoHz: 0.145,
    lfoDepth: 145,
    windPitchBias: 88,
    triggerKind: 'mysticHarp',
    minIntervalMs: 4200,
    maxIntervalMs: 7200,
  },
  {
    level: 10,
    name: 'Awakened Stalker',
    rootHz: 185.0, // F#3
    fifthHz: 277.18, // C#4
    shimmerHz: 739.99, // F#5
    oscTypeA: 'sine',
    oscTypeB: 'triangle',
    filterHz: 940,
    droneGain: 0.042,
    shimmerGain: 0.019,
    lfoHz: 0.165,
    lfoDepth: 165,
    windPitchBias: 104,
    triggerKind: 'crystalChimes',
    minIntervalMs: 4000,
    maxIntervalMs: 6900,
  },
  {
    level: 11,
    name: 'Celestial Humanoid',
    rootHz: 196.0, // G3
    fifthHz: 293.66, // D4
    shimmerHz: 783.99, // G5
    oscTypeA: 'sine',
    oscTypeB: 'sine',
    filterHz: 1050,
    droneGain: 0.045,
    shimmerGain: 0.022,
    lfoHz: 0.12,
    lfoDepth: 180,
    windPitchBias: 120,
    triggerKind: 'etherealChoir',
    minIntervalMs: 4800,
    maxIntervalMs: 8000,
  },
  {
    level: 12,
    name: 'Ascended Human',
    rootHz: 220.0, // A3
    fifthHz: 329.63, // E4
    shimmerHz: 880.0, // A5
    oscTypeA: 'sine',
    oscTypeB: 'triangle',
    filterHz: 1180,
    droneGain: 0.048,
    shimmerGain: 0.025,
    lfoHz: 0.11,
    lfoDepth: 200,
    windPitchBias: 138,
    triggerKind: 'solarAscensionChime',
    minIntervalMs: 4500,
    maxIntervalMs: 7600,
  },
];

/**
 * Procedural Web Audio synthesizer + dynamic biome-, weather-, and 12-tier
 * evolution-adaptive ambient soundscape.
 * Generates zero-asset SFX and looping ambient mountain/jungle audio layers
 * (wind gusts, rustling leaves, mist/fog acoustics, light rain patter, distant
 * birds/hawks, plus a 12-tier shifting harmonic bed & unique tier ambient triggers).
 */
export class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private biome: BiomeId = 'mountain';
  private weather: WeatherMode = 'mist';
  private rainIntensity = 0;
  private evolutionLevel = 1;
  private pausedDuck = false;
  private tabHidden = false;

  // Volume levels: 0..1
  private masterVolume = 0.82;
  private ambientVolume = 1.0;
  private sfxVolume = 1.0;
  // A single master gain node that all SFX route through
  private sfxBus: GainNode | null = null;

  // Ambient soundscape graph nodes
  private ambientStarted = false;
  private pinkNoiseBuffer: AudioBuffer | null = null;
  private ambientMasterGain: GainNode | null = null;
  private weatherToneFilter: BiquadFilterNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;
  private windLfoGain: GainNode | null = null;
  private leafFilter: BiquadFilterNode | null = null;
  private leafGain: GainNode | null = null;
  private streamFilter: BiquadFilterNode | null = null;
  private streamGain: GainNode | null = null;
  private rainBodyGain: GainNode | null = null;
  private rainHighGain: GainNode | null = null;
  private birdBus: GainNode | null = null;
  private ambientTimer = 0;

  // 12-Tier Evolution Soundscape nodes
  private tierOscA: OscillatorNode | null = null;
  private tierOscB: OscillatorNode | null = null;
  private tierOscShimmer: OscillatorNode | null = null;
  private tierShimmerGain: GainNode | null = null;
  private tierDroneFilter: BiquadFilterNode | null = null;
  private tierDroneGain: GainNode | null = null;
  private tierLfo: OscillatorNode | null = null;
  private tierLfoGain: GainNode | null = null;
  private tierTriggerBus: GainNode | null = null;
  private tierAmbientTimer = 0;
  private tierTransitionTimer = 0;

  private ensureContext(): AudioContext | null {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended' && !this.muted) {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(m: boolean): void {
    this.muted = m;
    this.updateAmbientGain();
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    if (!this.muted) {
      this.unlock();
      this.playClick();
    } else {
      this.updateAmbientGain();
    }
    return this.muted;
  }

  /** Master volume 0..1 — scales both ambient and SFX. */
  public getMasterVolume(): number { return this.masterVolume; }
  public setMasterVolume(v: number): void {
    this.masterVolume = Math.max(0, Math.min(1, v));
    this.updateAmbientGain();
  }

  /** Ambient-layer volume 0..1 (wind, birds, rain). */
  public getAmbientVolume(): number { return this.ambientVolume; }
  public setAmbientVolume(v: number): void {
    this.ambientVolume = Math.max(0, Math.min(1, v));
    this.updateAmbientGain();
  }

  /** SFX volume 0..1 (clicks, spells, combat). */
  public getSfxVolume(): number { return this.sfxVolume; }
  public setSfxVolume(v: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, v));
    if (this.ctx && this.sfxBus) {
      this.sfxBus.gain.setTargetAtTime(this.muted ? 0.0001 : this.sfxVolume * this.masterVolume, this.ctx.currentTime, 0.05);
    }
  }

  public setPausedDuck(ducked: boolean): void {
    this.pausedDuck = ducked;
    this.updateAmbientGain();
  }

  public setTabHidden(hidden: boolean): void {
    this.tabHidden = hidden;
    this.updateAmbientGain();
  }

  /**
   * Unlocks Web Audio on the first user gesture and starts the procedural ambient layer.
   */
  public unlock(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (!this.ambientStarted) {
      this.startAmbientLayers(ctx);
    }
    this.updateAmbientGain();
  }

  /**
   * Smoothly adapts wind, leaf rustling, stream, and distant bird synthesis to the active biome.
   */
  public setBiome(biome: BiomeId): void {
    this.biome = biome;
    if (!this.ctx || !this.ambientStarted) return;
    this.applyBiomeParams(this.ctx, true);
  }

  public setWeather(weather: WeatherMode): void {
    this.weather = weather;
    if (weather !== 'rain') {
      this.rainIntensity = 0;
    } else if (this.rainIntensity < 0.2) {
      this.rainIntensity = 0.65;
    }
    if (!this.ctx || !this.ambientStarted) return;
    this.applyBiomeParams(this.ctx, true);
  }

  public setRainIntensity(intensity01: number): void {
    const clamped = Math.max(0, Math.min(1, intensity01));
    if (Math.abs(clamped - this.rainIntensity) < 0.03) return;
    this.rainIntensity = clamped;
    if (!this.ctx || !this.ambientStarted) return;
    const now = this.ctx.currentTime;
    const active = this.weather === 'rain' ? clamped : 0;
    if (this.rainBodyGain) {
      this.rainBodyGain.gain.setTargetAtTime(active * 0.24, now, 0.55);
    }
    if (this.rainHighGain) {
      this.rainHighGain.gain.setTargetAtTime(active * 0.11, now, 0.55);
    }
  }

  /**
   * Shifts the continuous ambient harmonic bed and periodic soundscape triggers
   * to match the snake's active evolution tier (1..12).
   * When announceTransition is true, immediately plays a gentle tier-shift resonance
   * and introduces the newly unlocked tier's signature ambient trigger.
   */
  public setEvolutionTier(level: number, announceTransition = false): void {
    const clamped = Math.max(1, Math.min(TIER_SOUNDSCAPES.length, Math.round(level)));
    const changed = clamped !== this.evolutionLevel;
    this.evolutionLevel = clamped;
    if (!this.ctx || !this.ambientStarted) return;

    this.applyEvolutionTierParams(this.ctx, true);
    this.applyBiomeParams(this.ctx, true);

    if (announceTransition && !this.muted && !this.tabHidden && this.ctx.state === 'running') {
      const profile = this.getTierProfile(clamped);
      this.playTierTransitionSwell(this.ctx, profile);
      window.clearTimeout(this.tierTransitionTimer);
      this.tierTransitionTimer = window.setTimeout(() => {
        if (this.ctx && this.tierTriggerBus && !this.muted && !this.tabHidden && this.ctx.state === 'running') {
          this.playTierTrigger(this.ctx, this.tierTriggerBus, this.getTierProfile(this.evolutionLevel), true);
        }
      }, 420);
      this.scheduleNextTierEvent(4600);
    } else if (changed) {
      this.scheduleNextTierEvent(2200);
    }
  }

  private getTierProfile(level = this.evolutionLevel): EvolutionSoundscapeProfile {
    const idx = Math.max(0, Math.min(TIER_SOUNDSCAPES.length - 1, Math.round(level) - 1));
    return TIER_SOUNDSCAPES[idx];
  }

  private createPinkNoiseBuffer(ctx: AudioContext, seconds = 6): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      let b3 = 0;
      let b4 = 0;
      let b5 = 0;
      let b6 = 0;

      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.055;
        b6 = white * 0.115926;
      }

      // Crossfade loop seam (last 0.15s blended with first 0.15s) for click-free looping
      const fadeSamples = Math.floor(ctx.sampleRate * 0.15);
      for (let i = 0; i < fadeSamples; i++) {
        const t = i / fadeSamples;
        const endIdx = length - fadeSamples + i;
        data[endIdx] = data[endIdx] * (1 - t) + data[i] * t;
      }
    }
    return buffer;
  }

  private startAmbientLayers(ctx: AudioContext): void {
    this.ambientStarted = true;
    const noiseBuffer = this.createPinkNoiseBuffer(ctx, 6);
    this.pinkNoiseBuffer = noiseBuffer;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, ctx.currentTime);
    master.connect(ctx.destination);
    this.ambientMasterGain = master;

    // Weather acoustic shaper (bright in clear air, softly damped in mist, muffled in dense fog)
    const weatherTone = ctx.createBiquadFilter();
    weatherTone.type = 'lowpass';
    weatherTone.frequency.value = 9500;
    weatherTone.Q.value = 0.5;
    weatherTone.connect(master);
    this.weatherToneFilter = weatherTone;

    // 1. Looping Wind Bed (filtered pink noise + slow organic gust LFOs)
    const windSrc = ctx.createBufferSource();
    windSrc.buffer = noiseBuffer;
    windSrc.loop = true;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 340;
    windFilter.Q.value = 1.6;

    const windGain = ctx.createGain();
    windGain.gain.value = 0.24;

    const windLfo = ctx.createOscillator();
    windLfo.type = 'sine';
    windLfo.frequency.value = 0.11;
    const windLfoGain = ctx.createGain();
    windLfoGain.gain.value = 130;
    windLfo.connect(windLfoGain);
    windLfoGain.connect(windFilter.frequency);

    const windAmpLfo = ctx.createOscillator();
    windAmpLfo.type = 'sine';
    windAmpLfo.frequency.value = 0.075;
    const windAmpLfoGain = ctx.createGain();
    windAmpLfoGain.gain.value = 0.08;
    windAmpLfo.connect(windAmpLfoGain);
    windAmpLfoGain.connect(windGain.gain);

    windSrc.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(weatherTone);

    windSrc.start(ctx.currentTime, 0);
    windLfo.start(ctx.currentTime);
    windAmpLfo.start(ctx.currentTime);

    this.windFilter = windFilter;
    this.windGain = windGain;
    this.windLfoGain = windLfoGain;

    // 2. Looping Rustling Leaves / Pine Needles Layer (offset start so no phasing)
    const leafSrc = ctx.createBufferSource();
    leafSrc.buffer = noiseBuffer;
    leafSrc.loop = true;

    const leafFilter = ctx.createBiquadFilter();
    leafFilter.type = 'bandpass';
    leafFilter.frequency.value = 2850;
    leafFilter.Q.value = 1.1;

    const leafGain = ctx.createGain();
    leafGain.gain.value = 0.11;

    const leafLfo = ctx.createOscillator();
    leafLfo.type = 'sine';
    leafLfo.frequency.value = 0.24;
    const leafLfoGain = ctx.createGain();
    leafLfoGain.gain.value = 0.055;
    leafLfo.connect(leafLfoGain);
    leafLfoGain.connect(leafGain.gain);

    leafSrc.connect(leafFilter);
    leafFilter.connect(leafGain);
    leafGain.connect(weatherTone);

    leafSrc.start(ctx.currentTime, 2.3);
    leafLfo.start(ctx.currentTime);

    this.leafFilter = leafFilter;
    this.leafGain = leafGain;

    // 3. Distant Jungle River / Alpine Ridge Air Shimmer
    const streamSrc = ctx.createBufferSource();
    streamSrc.buffer = noiseBuffer;
    streamSrc.loop = true;

    const streamFilter = ctx.createBiquadFilter();
    streamFilter.type = 'bandpass';
    streamFilter.frequency.value = 1050;
    streamFilter.Q.value = 0.7;

    const streamGain = ctx.createGain();
    streamGain.gain.value = 0.08;

    streamSrc.connect(streamFilter);
    streamFilter.connect(streamGain);
    streamGain.connect(weatherTone);
    streamSrc.start(ctx.currentTime, 4.1);

    this.streamFilter = streamFilter;
    this.streamGain = streamGain;

    // 4. Procedural Dual-Band Light Rain Patter Layer (body rainfall + sparkling needle hiss)
    const rainBodySrc = ctx.createBufferSource();
    rainBodySrc.buffer = noiseBuffer;
    rainBodySrc.loop = true;
    const rainBodyFilter = ctx.createBiquadFilter();
    rainBodyFilter.type = 'bandpass';
    rainBodyFilter.frequency.value = 1850;
    rainBodyFilter.Q.value = 0.65;
    const rainBodyGain = ctx.createGain();
    rainBodyGain.gain.value = 0.0001;
    rainBodySrc.connect(rainBodyFilter);
    rainBodyFilter.connect(rainBodyGain);
    rainBodyGain.connect(master);
    rainBodySrc.start(ctx.currentTime, 1.15);
    this.rainBodyGain = rainBodyGain;

    const rainHighSrc = ctx.createBufferSource();
    rainHighSrc.buffer = noiseBuffer;
    rainHighSrc.loop = true;
    const rainHighFilter = ctx.createBiquadFilter();
    rainHighFilter.type = 'highpass';
    rainHighFilter.frequency.value = 4600;
    const rainHighGain = ctx.createGain();
    rainHighGain.gain.value = 0.0001;
    rainHighSrc.connect(rainHighFilter);
    rainHighFilter.connect(rainHighGain);
    rainHighGain.connect(master);
    rainHighSrc.start(ctx.currentTime, 3.45);
    this.rainHighGain = rainHighGain;

    // 5. Distant Birds & Natural Wildlife Bus (with subtle canyon/canopy slapback echo)
    const birdBus = ctx.createGain();
    birdBus.gain.value = 0.9;

    const delay = ctx.createDelay(0.6);
    delay.delayTime.value = 0.26;
    const echoGain = ctx.createGain();
    echoGain.gain.value = 0.28;
    const echoFilter = ctx.createBiquadFilter();
    echoFilter.type = 'lowpass';
    echoFilter.frequency.value = 1800;

    birdBus.connect(weatherTone);
    birdBus.connect(delay);
    delay.connect(echoFilter);
    echoFilter.connect(echoGain);
    echoGain.connect(weatherTone);

    this.birdBus = birdBus;

    // 6. 12-Tier Evolution Ambient Harmonic Bed & Spatial Trigger Bus
    const tierDroneFilter = ctx.createBiquadFilter();
    tierDroneFilter.type = 'lowpass';
    tierDroneFilter.frequency.value = 340;
    tierDroneFilter.Q.value = 0.7;

    const tierDroneGain = ctx.createGain();
    tierDroneGain.gain.value = 0.024;

    const tierOscA = ctx.createOscillator();
    tierOscA.type = 'sine';
    tierOscA.frequency.value = 73.42;

    const tierOscB = ctx.createOscillator();
    tierOscB.type = 'sine';
    tierOscB.frequency.value = 110.0;
    tierOscB.detune.value = 3;
    const tierOscBGain = ctx.createGain();
    tierOscBGain.gain.value = 0.55;

    const tierOscShimmer = ctx.createOscillator();
    tierOscShimmer.type = 'sine';
    tierOscShimmer.frequency.value = 293.66;
    tierOscShimmer.detune.value = -4;
    const tierShimmerGain = ctx.createGain();
    tierShimmerGain.gain.value = 0.004;

    const tierLfo = ctx.createOscillator();
    tierLfo.type = 'sine';
    tierLfo.frequency.value = 0.09;
    const tierLfoGain = ctx.createGain();
    tierLfoGain.gain.value = 50;
    tierLfo.connect(tierLfoGain);
    tierLfoGain.connect(tierDroneFilter.frequency);

    tierOscA.connect(tierDroneFilter);
    tierOscB.connect(tierOscBGain);
    tierOscBGain.connect(tierDroneFilter);
    tierOscShimmer.connect(tierShimmerGain);
    tierShimmerGain.connect(tierDroneFilter);
    tierDroneFilter.connect(tierDroneGain);
    tierDroneGain.connect(weatherTone);

    tierOscA.start(ctx.currentTime);
    tierOscB.start(ctx.currentTime);
    tierOscShimmer.start(ctx.currentTime);
    tierLfo.start(ctx.currentTime);

    this.tierOscA = tierOscA;
    this.tierOscB = tierOscB;
    this.tierOscShimmer = tierOscShimmer;
    this.tierShimmerGain = tierShimmerGain;
    this.tierDroneFilter = tierDroneFilter;
    this.tierDroneGain = tierDroneGain;
    this.tierLfo = tierLfo;
    this.tierLfoGain = tierLfoGain;

    // Dedicated spacious echo bus for the 12 unique periodic tier ambient triggers
    const tierTriggerBus = ctx.createGain();
    tierTriggerBus.gain.value = 0.92;

    const tierDelay = ctx.createDelay(0.8);
    tierDelay.delayTime.value = 0.34;
    const tierEchoFilter = ctx.createBiquadFilter();
    tierEchoFilter.type = 'lowpass';
    tierEchoFilter.frequency.value = 2400;
    const tierEchoGain = ctx.createGain();
    tierEchoGain.gain.value = 0.34;
    const tierEchoFeedback = ctx.createGain();
    tierEchoFeedback.gain.value = 0.24;

    tierTriggerBus.connect(weatherTone);
    tierTriggerBus.connect(tierDelay);
    tierDelay.connect(tierEchoFilter);
    tierEchoFilter.connect(tierEchoGain);
    tierEchoGain.connect(weatherTone);
    tierEchoFilter.connect(tierEchoFeedback);
    tierEchoFeedback.connect(tierDelay);

    this.tierTriggerBus = tierTriggerBus;

    this.applyEvolutionTierParams(ctx, false);
    this.applyBiomeParams(ctx, false);
    this.scheduleNextWildlifeEvent(1100);
    this.scheduleNextTierEvent(1900);
  }

  private applyEvolutionTierParams(ctx: AudioContext, smooth: boolean): void {
    const now = ctx.currentTime;
    const tau = smooth ? 1.15 : 0.06;
    const profile = this.getTierProfile();

    if (this.tierOscA) {
      this.tierOscA.type = profile.oscTypeA;
      this.tierOscA.frequency.setTargetAtTime(profile.rootHz, now, tau);
    }
    if (this.tierOscB) {
      this.tierOscB.type = profile.oscTypeB;
      this.tierOscB.frequency.setTargetAtTime(profile.fifthHz, now, tau);
    }
    if (this.tierOscShimmer) {
      this.tierOscShimmer.frequency.setTargetAtTime(profile.shimmerHz, now, tau);
    }
    if (this.tierShimmerGain) {
      this.tierShimmerGain.gain.setTargetAtTime(profile.shimmerGain, now, tau);
    }
    if (this.tierDroneFilter) {
      this.tierDroneFilter.frequency.setTargetAtTime(profile.filterHz, now, tau);
    }
    if (this.tierDroneGain) {
      this.tierDroneGain.gain.setTargetAtTime(profile.droneGain, now, tau);
    }
    if (this.tierLfo) {
      this.tierLfo.frequency.setTargetAtTime(profile.lfoHz, now, tau);
    }
    if (this.tierLfoGain) {
      this.tierLfoGain.gain.setTargetAtTime(profile.lfoDepth, now, tau);
    }
  }

  private applyBiomeParams(ctx: AudioContext, smooth: boolean): void {
    const now = ctx.currentTime;
    const tau = smooth ? 0.9 : 0.05;
    const isJungle = this.biome === 'jungle';
    const alt = this.altitudeFactor;
    const w = this.weather;

    // Acoustic brightness per weather (clear bright air -> misty softness -> muffled dense fog)
    if (this.weatherToneFilter) {
      const cutoff =
        w === 'fog' ? 2600 : w === 'mist' ? 6800 : w === 'rain' ? 9200 : 14000;
      this.weatherToneFilter.frequency.setTargetAtTime(cutoff, now, tau);
    }

    const tierProfile = this.getTierProfile();
    const windMult = w === 'fog' ? 0.72 : w === 'mist' ? 0.88 : w === 'rain' ? 1.1 : 1.0;
    if (this.windFilter && this.windGain && this.windLfoGain) {
      const baseFreq = isJungle ? 310 : 520;
      const freqShift = w === 'fog' ? -130 : w === 'mist' ? -55 : 0;
      this.windFilter.frequency.setTargetAtTime(
        Math.max(180, baseFreq + alt * 260 + freqShift + tierProfile.windPitchBias),
        now,
        tau,
      );
      this.windFilter.Q.setTargetAtTime(isJungle ? 1.4 : (w === 'fog' ? 1.8 : 2.8 + alt * 1.1), now, tau);
      this.windGain.gain.setTargetAtTime(((isJungle ? 0.22 : 0.3) + alt * 0.14) * windMult, now, tau);
      this.windLfoGain.gain.setTargetAtTime(((isJungle ? 110 : 220) + alt * 90) * windMult, now, tau);
    }

    if (this.leafFilter && this.leafGain) {
      const leafMult = w === 'fog' ? 0.45 : w === 'mist' ? 0.75 : w === 'rain' ? 1.2 : 1.0;
      this.leafFilter.frequency.setTargetAtTime(isJungle ? 2750 : 4100, now, tau);
      this.leafFilter.Q.setTargetAtTime(isJungle ? 1.0 : 1.7, now, tau);
      this.leafGain.gain.setTargetAtTime((isJungle ? 0.14 : 0.085) * leafMult, now, tau);
    }

    if (this.streamFilter && this.streamGain) {
      this.streamFilter.frequency.setTargetAtTime(isJungle ? 980 : 1450, now, tau);
      this.streamGain.gain.setTargetAtTime(
        (isJungle ? 0.095 : 0.055) * (1 - alt * 0.45),
        now,
        tau,
      );
    }

    if (this.birdBus) {
      const wildlifeLevel = w === 'rain' ? 0.42 : w === 'fog' ? 0.55 : w === 'mist' ? 0.8 : 0.92;
      this.birdBus.gain.setTargetAtTime(wildlifeLevel, now, tau);
    }

    const activeRain = w === 'rain' ? this.rainIntensity : 0;
    if (this.rainBodyGain) {
      this.rainBodyGain.gain.setTargetAtTime(activeRain * 0.24, now, tau);
    }
    if (this.rainHighGain) {
      this.rainHighGain.gain.setTargetAtTime(activeRain * 0.11, now, tau);
    }
  }

  private altitudeFactor = 0;

  public setAltitudeFactor(factor01: number): void {
    const clamped = Math.max(0, Math.min(1, factor01));
    if (Math.abs(clamped - this.altitudeFactor) < 0.04) return;
    this.altitudeFactor = clamped;
    if (!this.ctx || !this.ambientStarted) return;
    this.applyBiomeParams(this.ctx, true);
  }

  private updateAmbientGain(): void {
    if (!this.ctx || !this.ambientMasterGain) return;
    const now = this.ctx.currentTime;
    let target = 0.52 * this.ambientVolume * this.masterVolume;
    if (this.muted || this.tabHidden) {
      target = 0.0001;
    } else if (this.pausedDuck) {
      target = 0.24 * this.ambientVolume * this.masterVolume;
    }
    this.ambientMasterGain.gain.setTargetAtTime(target, now, 0.35);
    if (this.sfxBus) {
      this.sfxBus.gain.setTargetAtTime(this.muted ? 0.0001 : this.sfxVolume * this.masterVolume, now, 0.1);
    }
  }

  private scheduleNextWildlifeEvent(delayMs?: number): void {
    window.clearTimeout(this.ambientTimer);
    const nextMs =
      delayMs ??
      (this.weather === 'rain'
        ? 1400 + Math.random() * 2400
        : this.weather === 'fog'
          ? 3400 + Math.random() * 4800
          : this.biome === 'jungle'
            ? 1900 + Math.random() * 3400
            : 3100 + Math.random() * 4800);

    this.ambientTimer = window.setTimeout(() => {
      if (this.ctx && this.birdBus && !this.muted && !this.tabHidden && this.ctx.state === 'running') {
        if (this.weather === 'rain' && this.rainIntensity > 0.2) {
          const r = Math.random();
          if (r < 0.62) {
            this.playRainDrip(this.ctx, this.birdBus);
          } else if (r < 0.78) {
            this.playDistantThunder(this.ctx, this.birdBus);
          } else {
            this.playLocalizedLeafRustle(this.ctx, this.birdBus, this.biome === 'jungle');
          }
        } else if (this.biome === 'jungle') {
          const roll = Math.random();
          if (roll < 0.44) {
            this.playJungleSongbird(this.ctx, this.birdBus);
          } else if (roll < 0.72) {
            this.playJungleChirpTrill(this.ctx, this.birdBus);
          } else if (roll < 0.88) {
            this.playJungleDoveCoo(this.ctx, this.birdBus);
          } else {
            this.playLocalizedLeafRustle(this.ctx, this.birdBus, true);
          }
        } else {
          const roll = Math.random();
          if (roll < 0.45) {
            this.playMountainWindWhistle(this.ctx, this.birdBus);
          } else if (roll < 0.78) {
            this.playMountainHawkCall(this.ctx, this.birdBus);
          } else {
            this.playLocalizedLeafRustle(this.ctx, this.birdBus, false);
          }
        }
      }
      this.scheduleNextWildlifeEvent();
    }, nextMs);
  }

  /**
   * Schedules periodic tier-specific ambient soundscape motifs unique to each of the 12 tiers.
   */
  private scheduleNextTierEvent(delayMs?: number): void {
    window.clearTimeout(this.tierAmbientTimer);
    const profile = this.getTierProfile();
    const span = Math.max(800, profile.maxIntervalMs - profile.minIntervalMs);
    const nextMs = delayMs ?? (profile.minIntervalMs + Math.random() * span);

    this.tierAmbientTimer = window.setTimeout(() => {
      if (
        this.ctx &&
        this.tierTriggerBus &&
        !this.muted &&
        !this.tabHidden &&
        this.ctx.state === 'running'
      ) {
        this.playTierTrigger(this.ctx, this.tierTriggerBus, this.getTierProfile(), false);
      }
      this.scheduleNextTierEvent();
    }, nextMs);
  }

  /**
   * Smooth harmonic bridge swell played when crossing into a new evolution tier's soundscape.
   */
  private playTierTransitionSwell(ctx: AudioContext, profile: EvolutionSoundscapeProfile): void {
    if (!this.tierTriggerBus) return;
    const now = ctx.currentTime;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.max(240, profile.filterHz * 0.65), now);
    filter.frequency.exponentialRampToValueAtTime(profile.filterHz * 2.2, now + 0.9);
    filter.frequency.exponentialRampToValueAtTime(profile.filterHz, now + 2.1);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.06, now + 0.55);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.25);

    const voices = [profile.rootHz * 2, profile.fifthHz * 2, profile.shimmerHz];
    voices.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = idx === 1 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.detune.value = (idx - 1) * 5;
      osc.connect(filter);
      osc.start(now);
      osc.stop(now + 2.35);
    });

    filter.connect(gain);
    gain.connect(this.tierTriggerBus);
  }

  /**
   * Synthesizes one of 12 distinct ambient soundscape triggers, uniquely tied to the active tier.
   */
  private playTierTrigger(
    ctx: AudioContext,
    dest: AudioNode,
    profile: EvolutionSoundscapeProfile,
    prominent: boolean,
  ): void {
    const boost = prominent ? 1.45 : 1.0;
    const pan = (Math.random() - 0.5) * 1.45;
    const out = this.createPanner(ctx, dest, pan);
    const now = ctx.currentTime;

    switch (profile.triggerKind) {
      case 'cicadaPulse': {
        // Tier 1: Valley Hatchling — rhythmic jungle-floor cicada/cricket chirps
        const chirps = 4 + Math.floor(Math.random() * 3);
        const carrierHz = 4150 + Math.random() * 550;
        for (let i = 0; i < chirps; i++) {
          const t = now + i * 0.082;
          const osc = ctx.createOscillator();
          const bp = ctx.createBiquadFilter();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(carrierHz + (i % 2) * 140, t);
          bp.type = 'bandpass';
          bp.frequency.value = carrierHz;
          bp.Q.value = 6.5;
          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.linearRampToValueAtTime(0.026 * boost, t + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.068);
          osc.connect(bp);
          bp.connect(gain);
          gain.connect(out);
          osc.start(t);
          osc.stop(t + 0.075);
        }
        break;
      }

      case 'bambooClack': {
        // Tier 2: Foothill Viper — hollow jungle bamboo clacks + subtle dry grass hiss
        const hits = [0, 0.14 + Math.random() * 0.06];
        hits.forEach((offset, idx) => {
          const t = now + offset;
          const osc = ctx.createOscillator();
          const bp = ctx.createBiquadFilter();
          const gain = ctx.createGain();
          const pitch = (idx === 0 ? 780 : 940) + Math.random() * 80;
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(pitch * 1.25, t);
          osc.frequency.exponentialRampToValueAtTime(pitch, t + 0.045);
          bp.type = 'bandpass';
          bp.frequency.value = pitch;
          bp.Q.value = 5.0;
          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.linearRampToValueAtTime(0.045 * boost, t + 0.006);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
          osc.connect(bp);
          bp.connect(gain);
          gain.connect(out);
          osc.start(t);
          osc.stop(t + 0.12);
        });
        if (this.pinkNoiseBuffer) {
          const src = ctx.createBufferSource();
          src.buffer = this.pinkNoiseBuffer;
          const hp = ctx.createBiquadFilter();
          hp.type = 'bandpass';
          hp.frequency.setValueAtTime(3400, now + 0.06);
          hp.Q.value = 2.4;
          const nGain = ctx.createGain();
          nGain.gain.setValueAtTime(0.0001, now + 0.05);
          nGain.gain.linearRampToValueAtTime(0.032 * boost, now + 0.12);
          nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
          src.connect(hp);
          hp.connect(nGain);
          nGain.connect(out);
          src.start(now + 0.05, Math.random() * 4, 0.32);
        }
        break;
      }

      case 'woodenMarimba': {
        // Tier 3: Mossback Cobra — mossy jungle kalimba / hollow wooden marimba 3-note plink
        const scale = [369.99, 415.3, 493.88, 554.37, 659.25];
        const startIdx = Math.floor(Math.random() * 3);
        [0, 1, 2].forEach((step) => {
          const t = now + step * 0.16;
          const freq = scale[(startIdx + step) % scale.length];
          const osc = ctx.createOscillator();
          const overtone = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          overtone.type = 'triangle';
          osc.frequency.setValueAtTime(freq, t);
          overtone.frequency.setValueAtTime(freq * 3.98, t);
          const otGain = ctx.createGain();
          otGain.gain.setValueAtTime(0.18, t);
          otGain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.linearRampToValueAtTime(0.042 * boost, t + 0.008);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.36);

          osc.connect(gain);
          overtone.connect(otGain);
          otGain.connect(gain);
          gain.connect(out);
          osc.start(t);
          overtone.start(t);
          osc.stop(t + 0.38);
          overtone.stop(t + 0.08);
        });
        break;
      }

      case 'tribalDrum': {
        // Tier 4: Horned Ridge Serpent — distant resonant jungle log-drum heartbeat double-thump
        const beats = [
          { t: 0, f1: 142, f2: 88, amp: 0.068 },
          { t: 0.24, f1: 122, f2: 76, amp: 0.054 },
        ];
        beats.forEach((b) => {
          const t = now + b.t;
          const osc = ctx.createOscillator();
          const lp = ctx.createBiquadFilter();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(b.f1, t);
          osc.frequency.exponentialRampToValueAtTime(b.f2, t + 0.16);
          lp.type = 'lowpass';
          lp.frequency.value = 320;
          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.linearRampToValueAtTime(b.amp * boost, t + 0.012);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
          osc.connect(lp);
          lp.connect(gain);
          gain.connect(out);
          osc.start(t);
          osc.stop(t + 0.42);
        });
        break;
      }

      case 'bambooFlute': {
        // Tier 5: Timber Wyrm — breathy wooden mountain flute pentatonic sigh
        const pairs = [
          [440.0, 493.88],
          [554.37, 493.88],
          [659.25, 587.33],
        ];
        const [f1, f2] = pairs[Math.floor(Math.random() * pairs.length)];
        const osc = ctx.createOscillator();
        const vib = ctx.createOscillator();
        const vibGain = ctx.createGain();
        const lp = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(f1, now);
        osc.frequency.exponentialRampToValueAtTime(f2, now + 0.48);

        vib.type = 'sine';
        vib.frequency.value = 5.2;
        vibGain.gain.value = 6.5;
        vib.connect(vibGain);
        vibGain.connect(osc.frequency);

        lp.type = 'lowpass';
        lp.frequency.value = 1400;

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.036 * boost, now + 0.18);
        gain.gain.setValueAtTime(0.032 * boost, now + 0.56);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.05);

        osc.connect(lp);
        lp.connect(gain);
        gain.connect(out);
        osc.start(now);
        vib.start(now);
        osc.stop(now + 1.1);
        vib.stop(now + 1.1);

        if (this.pinkNoiseBuffer) {
          const breath = ctx.createBufferSource();
          breath.buffer = this.pinkNoiseBuffer;
          const bp = ctx.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.value = f1 * 2.1;
          bp.Q.value = 4.5;
          const bGain = ctx.createGain();
          bGain.gain.setValueAtTime(0.0001, now);
          bGain.gain.linearRampToValueAtTime(0.02 * boost, now + 0.2);
          bGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);
          breath.connect(bp);
          bp.connect(bGain);
          bGain.connect(out);
          breath.start(now, Math.random() * 3, 1.0);
        }
        break;
      }

      case 'stormStaticChime': {
        // Tier 6: Storm Drake — crackling storm-front shimmer + low thunder hum
        const sparks = 3 + Math.floor(Math.random() * 2);
        for (let i = 0; i < sparks; i++) {
          const t = now + i * 0.095 + Math.random() * 0.04;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const f = 1240 + Math.random() * 980;
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, t);
          osc.frequency.exponentialRampToValueAtTime(f * 0.68, t + 0.11);
          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.linearRampToValueAtTime(0.025 * boost, t + 0.008);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
          osc.connect(gain);
          gain.connect(out);
          osc.start(t);
          osc.stop(t + 0.15);
        }
        const hum = ctx.createOscillator();
        const humLp = ctx.createBiquadFilter();
        const humGain = ctx.createGain();
        hum.type = 'sawtooth';
        hum.frequency.setValueAtTime(123.47, now);
        hum.frequency.exponentialRampToValueAtTime(92.5, now + 1.15);
        humLp.type = 'lowpass';
        humLp.frequency.value = 240;
        humGain.gain.setValueAtTime(0.0001, now);
        humGain.gain.linearRampToValueAtTime(0.032 * boost, now + 0.25);
        humGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.25);
        hum.connect(humLp);
        humLp.connect(humGain);
        humGain.connect(out);
        hum.start(now);
        hum.stop(now + 1.3);
        break;
      }

      case 'canyonHorn': {
        // Tier 7: Cloud Serpent — distant echoing alpine canyon horn fifth swell
        const freqs = [207.65, 311.13]; // G#3 + D#4
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(420, now);
        lp.frequency.exponentialRampToValueAtTime(1150, now + 0.55);
        lp.frequency.exponentialRampToValueAtTime(380, now + 1.7);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.036 * boost, now + 0.45);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

        freqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(f, now);
          osc.detune.value = idx === 0 ? -4 : 4;
          osc.connect(lp);
          osc.start(now);
          osc.stop(now + 1.85);
        });
        lp.connect(gain);
        gain.connect(out);
        break;
      }

      case 'singingBowl': {
        // Tier 8: Emerald Naga — resonant bronze temple singing bowl with gentle beating overtones
        const base = [293.66, 329.63, 440.0][Math.floor(Math.random() * 3)];
        const partials = [
          { mult: 1.0, detune: 0, amp: 0.038, dur: 2.3 },
          { mult: 1.0, detune: 5.5, amp: 0.022, dur: 2.1 },
          { mult: 2.756, detune: -3, amp: 0.014, dur: 1.5 },
        ];
        partials.forEach((p) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(base * p.mult, now);
          osc.detune.value = p.detune;
          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.linearRampToValueAtTime(p.amp * boost, now + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + p.dur);
          osc.connect(gain);
          gain.connect(out);
          osc.start(now);
          osc.stop(now + p.dur + 0.08);
        });
        break;
      }

      case 'mysticHarp': {
        // Tier 9: Mythic Naga Sage — plucked temple harp / sitar pentatonic glissando
        const notes = [329.63, 392.0, 493.88, 587.33, 659.25];
        const ascending = Math.random() > 0.35;
        const seq = ascending ? notes.slice(0, 4) : notes.slice(1).reverse();
        seq.forEach((freq, idx) => {
          const t = now + idx * 0.115;
          const osc = ctx.createOscillator();
          const lp = ctx.createBiquadFilter();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, t);
          lp.type = 'lowpass';
          lp.frequency.setValueAtTime(freq * 4.2, t);
          lp.frequency.exponentialRampToValueAtTime(freq * 1.4, t + 0.75);
          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.linearRampToValueAtTime(0.036 * boost, t + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
          osc.connect(lp);
          lp.connect(gain);
          gain.connect(out);
          osc.start(t);
          osc.stop(t + 0.9);
        });
        break;
      }

      case 'crystalChimes': {
        // Tier 10: Awakened Stalker — shimmering high-altitude jade/ice wind-chime cluster
        const bellSet = [739.99, 880.0, 1108.73, 1318.51, 1479.98];
        const count = 4;
        for (let i = 0; i < count; i++) {
          const t = now + i * (0.08 + Math.random() * 0.09);
          const freq = bellSet[Math.floor(Math.random() * bellSet.length)];
          const osc = ctx.createOscillator();
          const shimmer = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          shimmer.type = 'sine';
          osc.frequency.setValueAtTime(freq, t);
          shimmer.frequency.setValueAtTime(freq * 2.005, t);
          const sGain = ctx.createGain();
          sGain.gain.value = 0.25;
          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.linearRampToValueAtTime(0.028 * boost, t + 0.012);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.15);
          osc.connect(gain);
          shimmer.connect(sGain);
          sGain.connect(gain);
          gain.connect(out);
          osc.start(t);
          shimmer.start(t);
          osc.stop(t + 1.2);
          shimmer.stop(t + 1.2);
        }
        break;
      }

      case 'etherealChoir': {
        // Tier 11: Celestial Humanoid — ethereal dual-formant vocal choir pad swell
        const chord = [392.0, 493.88, 587.33]; // G4, B4, D5
        const formantA = ctx.createBiquadFilter();
        formantA.type = 'bandpass';
        formantA.frequency.value = 720;
        formantA.Q.value = 3.2;

        const formantB = ctx.createBiquadFilter();
        formantB.type = 'bandpass';
        formantB.frequency.value = 1280;
        formantB.Q.value = 4.0;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.044 * boost, now + 0.72);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.35);

        chord.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now);
          osc.detune.value = (idx - 1) * 6;
          osc.connect(formantA);
          osc.connect(formantB);
          osc.start(now);
          osc.stop(now + 2.45);
        });

        formantA.connect(gain);
        formantB.connect(gain);
        gain.connect(out);
        break;
      }

      case 'solarAscensionChime': {
        // Tier 12: Ascended Human — radiant solar harp cascade & golden harmonic bell chord
        const chord = [440.0, 554.37, 659.25, 880.0, 1108.73]; // A major celestial ninth
        chord.forEach((freq, idx) => {
          const t = now + idx * 0.095;
          const osc = ctx.createOscillator();
          const over = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          over.type = 'sine';
          osc.frequency.setValueAtTime(freq, t);
          over.frequency.setValueAtTime(freq * 2, t);
          const overGain = ctx.createGain();
          overGain.gain.value = 0.28;

          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.linearRampToValueAtTime(0.032 * boost, t + 0.025);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.85);

          osc.connect(gain);
          over.connect(overGain);
          overGain.connect(gain);
          gain.connect(out);
          osc.start(t);
          over.start(t);
          osc.stop(t + 1.9);
          over.stop(t + 1.9);
        });
        break;
      }
    }
  }

  /**
   * Soft stereo-panned water droplet plink off pine boughs / jungle foliage during light rain.
   */
  private playRainDrip(ctx: AudioContext, dest: AudioNode): void {
    const now = ctx.currentTime;
    const out = this.createPanner(ctx, dest, (Math.random() - 0.5) * 1.7);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const startF = 1150 + Math.random() * 850;
    osc.frequency.setValueAtTime(startF, now);
    osc.frequency.exponentialRampToValueAtTime(startF * 1.48, now + 0.055);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.032, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  /**
   * Very gentle distant mountain valley thunder roll during light rain showers.
   */
  private playDistantThunder(ctx: AudioContext, dest: AudioNode): void {
    const now = ctx.currentTime;
    const dur = 2.6 + Math.random() * 1.6;
    const out = this.createPanner(ctx, dest, (Math.random() - 0.5) * 1.2);
    const buf = this.createPinkNoiseBuffer(ctx, Math.ceil(dur + 0.5));
    const src = ctx.createBufferSource();
    src.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(140, now);
    filter.frequency.exponentialRampToValueAtTime(58, now + dur);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.16, now + 0.45);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(out);
    src.start(now);
    src.stop(now + dur + 0.1);
  }

  private createPanner(ctx: AudioContext, dest: AudioNode, panVal: number): AudioNode {
    if (typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.value = Math.max(-0.85, Math.min(0.85, panVal));
      panner.connect(dest);
      return panner;
    }
    return dest;
  }

  /**
   * Distant melodic tropical bird warble (2-3 flute-like glided notes).
   */
  private playJungleSongbird(ctx: AudioContext, dest: AudioNode): void {
    const now = ctx.currentTime;
    const out = this.createPanner(ctx, dest, (Math.random() - 0.5) * 1.5);
    const base = 1450 + Math.random() * 650;
    const notes = [
      { t: 0, f1: base, f2: base * 1.24, dur: 0.14 },
      { t: 0.17, f1: base * 1.28, f2: base * 1.06, dur: 0.18 },
      ...(Math.random() > 0.45
        ? [{ t: 0.39, f1: base * 1.15, f2: base * 1.38, dur: 0.16 }]
        : []),
    ];

    for (const n of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(n.f1, now + n.t);
      osc.frequency.exponentialRampToValueAtTime(n.f2, now + n.t + n.dur);

      const peak = 0.028 + Math.random() * 0.022;
      gain.gain.setValueAtTime(0.0001, now + n.t);
      gain.gain.linearRampToValueAtTime(peak, now + n.t + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.dur);

      osc.connect(gain);
      gain.connect(out);
      osc.start(now + n.t);
      osc.stop(now + n.t + n.dur + 0.03);
    }
  }

  /**
   * Rapid distant canopy bird trill (3-5 crisp chirps).
   */
  private playJungleChirpTrill(ctx: AudioContext, dest: AudioNode): void {
    const now = ctx.currentTime;
    const out = this.createPanner(ctx, dest, (Math.random() - 0.5) * 1.6);
    const count = 3 + Math.floor(Math.random() * 3);
    const startFreq = 2500 + Math.random() * 900;

    for (let i = 0; i < count; i++) {
      const t = now + i * 0.085;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const f = startFreq - i * 110;
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 0.76, t + 0.06);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.024, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.068);

      osc.connect(gain);
      gain.connect(out);
      osc.start(t);
      osc.stop(t + 0.08);
    }
  }

  /**
   * Soft warm jungle dove / owl coo in the distance.
   */
  private playJungleDoveCoo(ctx: AudioContext, dest: AudioNode): void {
    const now = ctx.currentTime;
    const out = this.createPanner(ctx, dest, (Math.random() - 0.5) * 1.3);
    const f = 490 + Math.random() * 90;

    for (let i = 0; i < 2; i++) {
      const t = now + i * 0.34;
      const dur = i === 0 ? 0.24 : 0.38;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f * (i === 0 ? 1 : 0.94), t);
      osc.frequency.exponentialRampToValueAtTime(f * (i === 0 ? 1.06 : 0.84), t + dur);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.032, t + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      osc.connect(gain);
      gain.connect(out);
      osc.start(t);
      osc.stop(t + dur + 0.04);
    }
  }

  /**
   * Spacious distant mountain hawk / eagle cry gliding down a valley.
   */
  private playMountainHawkCall(ctx: AudioContext, dest: AudioNode): void {
    const now = ctx.currentTime;
    const out = this.createPanner(ctx, dest, (Math.random() - 0.5) * 1.5);
    const dur = 0.72 + Math.random() * 0.25;

    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(2450 + Math.random() * 350, now);
    osc.frequency.exponentialRampToValueAtTime(1480 + Math.random() * 180, now + dur);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2100, now);
    filter.Q.value = 4.5;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.035, now + 0.09);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + dur + 0.04);
  }

  /**
   * High-altitude mountain ridge wind whistle swell.
   */
  private playMountainWindWhistle(ctx: AudioContext, dest: AudioNode): void {
    const now = ctx.currentTime;
    const out = this.createPanner(ctx, dest, (Math.random() - 0.5) * 1.4);
    const dur = 1.8 + Math.random() * 1.2;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const startF = 440 + Math.random() * 220;
    osc.frequency.setValueAtTime(startF, now);
    osc.frequency.linearRampToValueAtTime(startF * 1.22, now + dur * 0.45);
    osc.frequency.linearRampToValueAtTime(startF * 0.92, now + dur);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.022, now + dur * 0.4);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + dur + 0.05);
  }

  /**
   * Localized stereo gust of rustling leaves or pine boughs.
   */
  private playLocalizedLeafRustle(ctx: AudioContext, dest: AudioNode, isJungle: boolean): void {
    const now = ctx.currentTime;
    const dur = 0.75 + Math.random() * 0.7;
    const out = this.createPanner(ctx, dest, (Math.random() - 0.5) * 1.6);

    const buf = this.createPinkNoiseBuffer(ctx, 1.6);
    const src = ctx.createBufferSource();
    src.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(isJungle ? 3100 : 4200, now);
    filter.frequency.linearRampToValueAtTime(isJungle ? 2100 : 3000, now + dur);
    filter.Q.value = 1.4;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(isJungle ? 0.085 : 0.055, now + dur * 0.35);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(out);
    src.start(now);
    src.stop(now + dur + 0.05);
  }

  // ==================== TACTILE GAMEPLAY SFX ====================

  public playClick(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(780, now + 0.045);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  public playTurn(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.035);
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.045);
  }

  public playEat(combo: number, golden: boolean): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const scale = [330, 392, 440, 523.25, 587.33, 659.25, 783.99, 880];
    const baseFreq = scale[Math.min(Math.max(combo - 1, 0), scale.length - 1)];

    const notes = golden ? [baseFreq, baseFreq * 1.25, baseFreq * 1.5] : [baseFreq, baseFreq * 1.25];
    notes.forEach((freq, idx) => {
      const start = now + idx * 0.055;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = golden ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, start);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.03, start + 0.14);
      gain.gain.setValueAtTime(0.14, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.24);
    });
  }

  public playPortal(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc2.type = 'triangle';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(840, now + 0.18);
    osc2.frequency.setValueAtTime(520, now);
    osc2.frequency.exponentialRampToValueAtTime(1260, now + 0.18);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.24);
    osc2.stop(now + 0.24);
  }

  public playBoost(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(2400, now + 0.18);
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(480, now + 0.18);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  public playPlaceBlock(isErase = false): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    if (isErase) {
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);
    } else {
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(290, now + 0.07);
    }
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playCrash(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.32);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(650, now);
    filter.frequency.exponentialRampToValueAtTime(90, now + 0.32);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.36);
  }

  public playGraze(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(92, now + 0.11);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playLandmark(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [392, 523.25, 659.25, 783.99];
    notes.forEach((freq, idx) => {
      const start = now + idx * 0.085;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.13, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.38);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.4);
    });
  }

  public playLevelUp(level: number, isHuman: boolean): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const base = isHuman ? 261.63 : 220 * Math.pow(1.045, Math.min(12, level));
    const ratios = isHuman ? [1, 1.25, 1.5, 2, 2.5, 3, 4] : [1, 1.25, 1.5, 2, 2.5];
    ratios.forEach((r, idx) => {
      const start = now + idx * (isHuman ? 0.11 : 0.08);
      const osc = ctx.createOscillator();
      const shimmer = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      shimmer.type = 'sine';
      osc.frequency.setValueAtTime(base * r, start);
      shimmer.frequency.setValueAtTime(base * r * 2, start);

      const dur = isHuman ? 0.9 : 0.55;
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(isHuman ? 0.14 : 0.11, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

      osc.connect(gain);
      shimmer.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      shimmer.start(start);
      osc.stop(start + dur + 0.05);
      shimmer.stop(start + dur + 0.05);
    });
  }

  public playCastSpell(level: number): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const base = 360 + Math.min(12, level) * 38;

    const osc = ctx.createOscillator();
    const shimmer = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = level >= 7 ? 'triangle' : 'sine';
    shimmer.type = 'sine';
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(base * 1.9, now + 0.14);
    shimmer.frequency.setValueAtTime(base * 1.5, now);
    shimmer.frequency.exponentialRampToValueAtTime(base * 2.6, now + 0.16);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.095, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    shimmer.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    shimmer.start(now);
    osc.stop(now + 0.2);
    shimmer.stop(now + 0.2);
  }

  public playShockwave(level: number): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const sub = ctx.createOscillator();
    const chime = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900 + level * 140, now);
    filter.frequency.exponentialRampToValueAtTime(220, now + 0.42);

    sub.type = 'sawtooth';
    sub.frequency.setValueAtTime(160 + level * 8, now);
    sub.frequency.exponentialRampToValueAtTime(48, now + 0.42);

    chime.type = 'triangle';
    chime.frequency.setValueAtTime(420 + level * 42, now);
    chime.frequency.exponentialRampToValueAtTime(840 + level * 60, now + 0.34);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.16, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.46);

    sub.connect(filter);
    chime.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    sub.start(now);
    chime.start(now);
    sub.stop(now + 0.48);
    chime.stop(now + 0.48);
  }

  public playBeastGrowl(kind: 'wolf' | 'boar' | 'eagle' | 'guardian' | 'wraith' | 'soul_elder'): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    if (kind === 'wraith' || kind === 'soul_elder') {
      const isElder = kind === 'soul_elder';
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(isElder ? 210 : 540, now);
      osc.frequency.exponentialRampToValueAtTime(isElder ? 96 : 260, now + 0.36);
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(isElder ? 480 : 1220, now);
      filter.Q.value = 4.2;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(isElder ? 0.13 : 0.085, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    } else if (kind === 'eagle') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1900, now);
      osc.frequency.exponentialRampToValueAtTime(1050, now + 0.28);
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1600, now);
      filter.Q.value = 3.5;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.07, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    } else if (kind === 'guardian') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(125, now);
      osc.frequency.exponentialRampToValueAtTime(82, now + 0.42);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(520, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.11, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    } else {
      const startF = kind === 'boar' ? 118 : 175;
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(startF, now);
      osc.frequency.exponentialRampToValueAtTime(startF * 0.62, now + 0.24);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(480, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    }

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.48);
  }

  public playDashStrike(level: number): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const crack = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(750 + level * 120, now);
    filter.frequency.exponentialRampToValueAtTime(2400 + level * 180, now + 0.16);
    filter.Q.value = 1.8;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220 + level * 22, now);
    osc.frequency.exponentialRampToValueAtTime(760 + level * 52, now + 0.18);

    crack.type = 'triangle';
    crack.frequency.setValueAtTime(920 + level * 55, now);
    crack.frequency.exponentialRampToValueAtTime(180, now + 0.22);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(filter);
    crack.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    crack.start(now);
    osc.stop(now + 0.3);
    crack.stop(now + 0.3);
  }

  public playUltimateLotus(level: number): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. Deep Qi detonation boom
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(150 + level * 6, now);
    sub.frequency.exponentialRampToValueAtTime(34, now + 0.72);
    subGain.gain.setValueAtTime(0.001, now);
    subGain.gain.linearRampToValueAtTime(0.24, now + 0.03);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    sub.connect(subGain);
    subGain.connect(ctx.destination);
    sub.start(now);
    sub.stop(now + 0.84);

    // 2. Fiery lotus roar + ascending heavenly chord
    const notes = [293.66, 440, 587.33, 880, 1174.66];
    notes.forEach((freq, idx) => {
      const start = now + idx * 0.045;
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = idx < 2 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq * (1 + level * 0.015), start);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.18, start + 0.42);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2400, start);
      filter.frequency.exponentialRampToValueAtTime(620, start + 0.56);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.09, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.62);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.65);
    });
  }

  public playGhostEmerge(isElder: boolean): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Ground crack rumble
    const rumble = ctx.createOscillator();
    const rGain = ctx.createGain();
    rumble.type = 'sawtooth';
    rumble.frequency.setValueAtTime(isElder ? 72 : 92, now);
    rumble.frequency.exponentialRampToValueAtTime(34, now + 0.65);
    const rFilter = ctx.createBiquadFilter();
    rFilter.type = 'lowpass';
    rFilter.frequency.setValueAtTime(260, now);
    rGain.gain.setValueAtTime(0.001, now);
    rGain.gain.linearRampToValueAtTime(isElder ? 0.16 : 0.11, now + 0.08);
    rGain.gain.exponentialRampToValueAtTime(0.001, now + 0.72);
    rumble.connect(rFilter);
    rFilter.connect(rGain);
    rGain.connect(ctx.destination);
    rumble.start(now);
    rumble.stop(now + 0.76);

    // Rising ghostly chorus wail
    const freqs = isElder ? [220, 261.63, 311.13] : [329.63, 392.0];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f * 0.78, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(f * 1.12, now + 0.52);
      osc.frequency.exponentialRampToValueAtTime(f * 0.92, now + 0.92);
      gain.gain.setValueAtTime(0.0001, now + 0.08);
      gain.gain.linearRampToValueAtTime(0.055 - idx * 0.01, now + 0.28);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.96);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + 0.08);
      osc.stop(now + 1.0);
    });
  }

  public playClanAmbushAlert(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const tones = [220, 207.65, 311.13];
    tones.forEach((freq, i) => {
      const start = now + i * 0.11;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.1, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.34);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.36);
    });
  }

  public playBeastHit(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(310, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.09);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  public playBeastDefeat(isBoss: boolean): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = isBoss ? [293.66, 369.99, 440, 587.33, 739.99] : [329.63, 440, 587.33];
    notes.forEach((freq, idx) => {
      const start = now + idx * 0.06;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = isBoss ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(isBoss ? 0.13 : 0.1, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + (isBoss ? 0.42 : 0.26));
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + (isBoss ? 0.45 : 0.28));
    });
  }

  public playPlayerHurt(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(185, now);
    osc.frequency.exponentialRampToValueAtTime(72, now + 0.2);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  /**
   * Triumphant, high-rarity orchestral-crystalline fanfare triggered the first time
   * a player opens the details of a Legendary creature in the Bestiary catalog.
   */
  public playLegendaryReveal(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Master output + short spacious hall echo bus for regal decay
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.linearRampToValueAtTime(0.95, now + 0.03);
    master.gain.setValueAtTime(0.95, now + 1.45);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 2.55);
    master.connect(ctx.destination);

    const delay = ctx.createDelay(0.5);
    delay.delayTime.value = 0.19;
    const echoFilter = ctx.createBiquadFilter();
    echoFilter.type = 'lowpass';
    echoFilter.frequency.value = 3400;
    const echoFeedback = ctx.createGain();
    echoFeedback.gain.value = 0.28;
    const echoWet = ctx.createGain();
    echoWet.gain.value = 0.34;

    delay.connect(echoFilter);
    echoFilter.connect(echoWet);
    echoWet.connect(master);
    echoFilter.connect(echoFeedback);
    echoFeedback.connect(delay);

    const routeBus = ctx.createGain();
    routeBus.gain.value = 1.0;
    routeBus.connect(master);
    routeBus.connect(delay);

    // 1. Warm Heroic Brass-Pad Foundation (D3 + A3 + D4 with resonant lowpass bloom)
    const brassFilter = ctx.createBiquadFilter();
    brassFilter.type = 'lowpass';
    brassFilter.Q.value = 1.4;
    brassFilter.frequency.setValueAtTime(340, now);
    brassFilter.frequency.exponentialRampToValueAtTime(2450, now + 0.52);
    brassFilter.frequency.exponentialRampToValueAtTime(920, now + 1.85);

    const brassGain = ctx.createGain();
    brassGain.gain.setValueAtTime(0.0001, now);
    brassGain.gain.linearRampToValueAtTime(0.095, now + 0.08);
    brassGain.gain.setValueAtTime(0.085, now + 0.85);
    brassGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.95);

    const brassVoices = [
      { freq: 146.83, detune: -5 }, // D3
      { freq: 220.0, detune: 4 },   // A3
      { freq: 293.66, detune: 0 },  // D4
    ];
    brassVoices.forEach((v) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(v.freq, now);
      osc.detune.value = v.detune;
      osc.connect(brassFilter);
      osc.start(now);
      osc.stop(now + 2.0);
    });
    brassFilter.connect(brassGain);
    brassGain.connect(routeBus);

    // 2. Ascending Triumphant Lydian/Major-9th Fanfare Arpeggio
    const fanfareNotes = [
      { t: 0.0, freq: 293.66, amp: 0.085, dur: 0.55, pan: -0.38 },   // D4
      { t: 0.075, freq: 369.99, amp: 0.09, dur: 0.55, pan: -0.22 },  // F#4
      { t: 0.15, freq: 440.0, amp: 0.098, dur: 0.62, pan: -0.08 },   // A4
      { t: 0.23, freq: 587.33, amp: 0.105, dur: 0.72, pan: 0.08 },   // D5
      { t: 0.32, freq: 659.25, amp: 0.108, dur: 0.78, pan: 0.22 },   // E5
      { t: 0.415, freq: 739.99, amp: 0.115, dur: 0.92, pan: 0.34 },  // F#5
      { t: 0.52, freq: 880.0, amp: 0.13, dur: 1.45, pan: 0.0 },      // A5 Apex
    ];
    fanfareNotes.forEach((n) => {
      const start = now + n.t;
      const panner = this.createPanner(ctx, routeBus, n.pan);

      const core = ctx.createOscillator();
      core.type = 'triangle';
      core.frequency.setValueAtTime(n.freq, start);

      const octave = ctx.createOscillator();
      octave.type = 'sine';
      octave.frequency.setValueAtTime(n.freq * 2, start);
      const octGain = ctx.createGain();
      octGain.gain.setValueAtTime(0.35, start);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, start);
      env.gain.linearRampToValueAtTime(n.amp, start + 0.018);
      env.gain.exponentialRampToValueAtTime(0.0001, start + n.dur);

      core.connect(env);
      octave.connect(octGain);
      octGain.connect(env);
      env.connect(panner);

      core.start(start);
      octave.start(start);
      core.stop(start + n.dur + 0.06);
      octave.stop(start + n.dur + 0.06);
    });

    // 3. High-Rarity Crystalline Crown Chord & Metallic Bell Shimmer at Apex
    const apexTime = now + 0.52;
    const shimmerPartials = [
      { freq: 1174.66, amp: 0.062, dur: 1.65, pan: -0.45 }, // D6
      { freq: 1479.98, amp: 0.052, dur: 1.55, pan: 0.45 },  // F#6
      { freq: 1760.0, amp: 0.044, dur: 1.45, pan: 0.0 },    // A6
      { freq: 2425.28, amp: 0.022, dur: 1.1, pan: 0.25 },   // Bell harmonic (~2.756 * A5)
    ];
    shimmerPartials.forEach((p, idx) => {
      const start = apexTime + idx * 0.028;
      const panner = this.createPanner(ctx, routeBus, p.pan);
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(p.freq, start);
      osc.detune.value = idx % 2 === 0 ? 3 : -3;

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, start);
      env.gain.linearRampToValueAtTime(p.amp, start + 0.022);
      env.gain.exponentialRampToValueAtTime(0.0001, start + p.dur);

      osc.connect(env);
      env.connect(panner);
      osc.start(start);
      osc.stop(start + p.dur + 0.06);
    });
  }

  public dispose(): void {
    window.clearTimeout(this.ambientTimer);
    window.clearTimeout(this.tierAmbientTimer);
    window.clearTimeout(this.tierTransitionTimer);
    this.ctx?.close().catch(() => {});
    this.ctx = null;
    this.ambientStarted = false;
  }
}
