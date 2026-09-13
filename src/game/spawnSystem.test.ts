import { describe, expect, it } from 'vitest';
import { getTargetSpeed } from './difficultySystem';
import { TARGET_WIDTH } from './gameState';
import { getSpawnDelay, SPAWN_SPACING_CONFIG } from './spawnSystem';
import type { Expression } from './types';

const simple: Expression = { display: '3 + 4', answer: 7, difficulty: 1 };
const complex: Expression = { display: '8 × 7 + 13 − 2', answer: 67, difficulty: 6 };

const baseInput = {
  elapsedMs: 600_000,
  hits: 100,
  speed: getTargetSpeed(600_000),
  targetWidth: TARGET_WIDTH,
  nextExpression: simple,
};

describe('spawn spacing', () => {
  it('uses controlled randomness instead of a perfectly periodic cadence', () => {
    const shortest = getSpawnDelay({ ...baseInput, random: () => 0 });
    const longest = getSpawnDelay({ ...baseInput, random: () => 1 });
    expect(longest).toBeGreaterThan(shortest);
  });

  it('provides more spacing for a complex expression', () => {
    const simpleDelay = getSpawnDelay({ ...baseInput, random: () => 0 });
    const complexDelay = getSpawnDelay({
      ...baseInput,
      nextExpression: complex,
      random: () => 0,
    });
    expect(complexDelay).toBeGreaterThan(simpleDelay);
  });

  it('also accounts modestly for the previous target complexity', () => {
    const withoutPrevious = getSpawnDelay({ ...baseInput, random: () => 0 });
    const afterComplex = getSpawnDelay({
      ...baseInput,
      previousExpression: complex,
      random: () => 0,
    });
    expect(afterComplex).toBeGreaterThan(withoutPrevious);
  });

  it('partially compensates physical spacing at higher speeds', () => {
    const slowDelay = getSpawnDelay({
      ...baseInput,
      speed: 82,
      random: () => 0,
    });
    const fastDelay = getSpawnDelay({
      ...baseInput,
      speed: 164,
      random: () => 0,
    });
    expect(fastDelay).toBeGreaterThan(slowDelay / 2);
    const fastLeadingDistance = fastDelay * 164 / 1_000;
    expect(fastLeadingDistance - TARGET_WIDTH).toBeGreaterThanOrEqual(
      SPAWN_SPACING_CONFIG.baseGapPx,
    );
  });

  it('always returns an integer delay above the safety floor', () => {
    const delay = getSpawnDelay({ ...baseInput, random: () => 0.371 });
    expect(Number.isInteger(delay)).toBe(true);
    expect(delay).toBeGreaterThanOrEqual(SPAWN_SPACING_CONFIG.minimumDelayMs);
  });
});
