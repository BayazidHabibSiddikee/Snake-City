export type WeatherMode = 'clear' | 'mist' | 'fog' | 'rain' | 'storm' | 'blizzard' | 'ashstorm';

export interface WorldSimulationMetrics {
  vitality: number;
  altitudeNorm: number;
  weather: WeatherMode;
  isSheltered: boolean;
  score: number;
}

/**
 * Standalone World Simulation & Climate Hazard Engine (`src/game/engine/WorldSimulationEngine.ts`).
 * Computes altitude vitality drain/regen, blizzard frost buildup, and climate penalties.
 */
export function simulateWorldTick(metrics: WorldSimulationMetrics, dt: number): WorldSimulationMetrics {
  let vitalityDelta = 0.5; // Base passive regen

  // Altitude strain
  if (metrics.altitudeNorm > 0.75 && !metrics.isSheltered) {
    vitalityDelta -= (metrics.altitudeNorm - 0.75) * 3.5;
  }

  // Weather hazards
  if (metrics.weather === 'blizzard' && !metrics.isSheltered) {
    vitalityDelta -= 4.2;
  } else if (metrics.weather === 'ashstorm' && !metrics.isSheltered) {
    vitalityDelta -= 5.0;
  } else if (metrics.weather === 'rain' && metrics.isSheltered) {
    vitalityDelta += 1.5; // Sheltered shrine recovery bonus
  }

  const newVitality = Math.max(0, Math.min(100, metrics.vitality + vitalityDelta * dt));

  return {
    ...metrics,
    vitality: newVitality,
  };
}
