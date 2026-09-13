import { BASE_SPEED, getTargetSpawnInterval } from './difficultySystem';
import { getExpressionComplexity } from './expressionGenerator';
import type { Expression } from './types';

type RandomSource = () => number;

export const SPAWN_SPACING_CONFIG = {
  baseGapPx: 120,
  speedCompensationPxPerSpeedUnit: 0.75,
  complexityGapPx: 45,
  previousComplexityWeight: 0.3,
  randomGapFactorMin: 1,
  randomGapFactorMax: 1.3,
  cadenceJitterMin: 0.92,
  cadenceJitterMax: 1.12,
  minimumDelayMs: 1_600,
} as const;

interface SpawnDelayInput {
  elapsedMs: number;
  hits: number;
  speed: number;
  targetWidth: number;
  nextExpression: Expression;
  previousExpression?: Expression | null;
  random?: RandomSource;
}

const interpolate = (minimum: number, maximum: number, random: RandomSource) =>
  minimum + (maximum - minimum) * Math.max(0, Math.min(1, random()));

/**
 * Combines the evolving cadence with a safe physical gap. The gap grows modestly
 * with speed and cognitive cost, then receives controlled random variation.
 */
export function getSpawnDelay({
  elapsedMs,
  hits,
  speed,
  targetWidth,
  nextExpression,
  previousExpression,
  random = Math.random,
}: SpawnDelayInput): number {
  const safeSpeed = Math.max(1, speed);
  const nextComplexity = getExpressionComplexity(nextExpression);
  const previousComplexity = previousExpression ? getExpressionComplexity(previousExpression) : 0;
  const speedCompensation = Math.max(0, safeSpeed - BASE_SPEED)
    * SPAWN_SPACING_CONFIG.speedCompensationPxPerSpeedUnit;
  const complexityCompensation = (
    nextComplexity
    + previousComplexity * SPAWN_SPACING_CONFIG.previousComplexityWeight
  ) * SPAWN_SPACING_CONFIG.complexityGapPx;
  const minimumLeadingDistance = targetWidth
    + SPAWN_SPACING_CONFIG.baseGapPx
    + speedCompensation
    + complexityCompensation;
  const randomizedDistance = minimumLeadingDistance * interpolate(
    SPAWN_SPACING_CONFIG.randomGapFactorMin,
    SPAWN_SPACING_CONFIG.randomGapFactorMax,
    random,
  );
  const spacingDelayMs = randomizedDistance / safeSpeed * 1_000;
  const cadenceDelayMs = getTargetSpawnInterval(elapsedMs, hits) * interpolate(
    SPAWN_SPACING_CONFIG.cadenceJitterMin,
    SPAWN_SPACING_CONFIG.cadenceJitterMax,
    random,
  );

  return Math.ceil(Math.max(
    SPAWN_SPACING_CONFIG.minimumDelayMs,
    spacingDelayMs,
    cadenceDelayMs,
  ));
}
