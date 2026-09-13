import { describe, expect, it } from 'vitest';
import {
  BASE_SPEED,
  MAX_SPEED,
  SPAWN_CONFIG,
  SPEED_CONFIG,
  getDifficulty,
  getMathProgression,
  getTargetSpawnInterval,
  getTargetSpeed,
} from './difficultySystem';

describe('independent progression dimensions', () => {
  it('advances the curriculum from hits, with explicit stage boundaries', () => {
    expect([0, 5, 12, 21, 32, 46, 63].map(getDifficulty)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(getDifficulty(10_000)).toBe(7);
  });

  it('starts with only two-term, very-small additions', () => {
    const start = getMathProgression(0);
    expect(start.operationWeights).toEqual({ '+': 1, '−': 0, '×': 0, '÷': 0 });
    expect(start.termCountWeights).toEqual({ 2: 1, 3: 0, 4: 0 });
    expect(start.operandBandWeights).toEqual({ verySmall: 1, small: 0, medium: 0, large: 0 });
  });

  it('ramps new operations in without replacing previous operations', () => {
    const earlySubtraction = getMathProgression(5);
    const lateSubtraction = getMathProgression(11);
    expect(earlySubtraction.operationWeights['−']).toBeCloseTo(0.1);
    expect(lateSubtraction.operationWeights['−']).toBeCloseTo(0.45);
    expect(lateSubtraction.operationWeights['+']).toBeGreaterThan(0);

    const multiplication = getMathProgression(12);
    expect(multiplication.operationWeights['×']).toBeGreaterThan(0);
    expect(multiplication.operationWeights['×']).toBeLessThan(0.2);
    expect(getMathProgression(20).operationWeights['×']).toBeGreaterThan(
      multiplication.operationWeights['×'],
    );
    expect(multiplication.operationWeights['÷']).toBe(0);
    expect(multiplication.termCountWeights[2]).toBe(1);

    const division = getMathProgression(21);
    expect(division.operationWeights['÷']).toBeCloseTo(0.1);
    expect(division.operationWeights['+']).toBeGreaterThan(0);
    expect(division.operationWeights['−']).toBeGreaterThan(0);
    expect(division.operationWeights['×']).toBeGreaterThan(0);
    expect(getMathProgression(31).operationWeights['÷']).toBeGreaterThan(
      division.operationWeights['÷'],
    );
  });

  it('unlocks terms and precedence separately from operand magnitude', () => {
    const threeTerms = getMathProgression(32);
    expect(threeTerms.termCountWeights).toEqual({ 2: 0.8, 3: 0.2, 4: 0 });
    expect(threeTerms.mixedPrecedenceChance).toBeCloseTo(0.35);
    expect(threeTerms.repeatedHighOperationChance).toBe(0);
    expect(threeTerms.operandBandWeights.verySmall).toBeCloseTo(0.15);
    expect(threeTerms.operandBandWeights.small).toBeCloseTo(0.85);

    const practicedThreeTerms = getMathProgression(45);
    expect(practicedThreeTerms.termCountWeights[3]).toBeGreaterThan(threeTerms.termCountWeights[3]);
    expect(practicedThreeTerms.repeatedHighOperationChance).toBeCloseTo(0.3);

    const fourTerms = getMathProgression(46);
    expect(fourTerms.termCountWeights[4]).toBeCloseTo(0.1);
    expect(fourTerms.termCountWeights[2]).toBeGreaterThan(0);
    expect(fourTerms.termCountWeights[3]).toBeGreaterThan(0);
    expect(fourTerms.operandBandWeights.medium).toBe(0);
    expect(fourTerms.repeatedHighOperationChance).toBeCloseTo(0.3);
    expect(getMathProgression(62).termCountWeights[4]).toBeGreaterThan(fourTerms.termCountWeights[4]);

    const largerOperands = getMathProgression(100);
    expect(largerOperands.termCountWeights[2]).toBeCloseTo(0.3);
    expect(largerOperands.operandBandWeights.verySmall).toBeCloseTo(0.12);
    expect(largerOperands.operandBandWeights.small).toBeCloseTo(0.28);
    expect(largerOperands.operandBandWeights.medium).toBeCloseTo(0.45);
    expect(largerOperands.operandBandWeights.large).toBeCloseTo(0.15);
  });
});

describe('continuous target speed', () => {
  it('rises smoothly with elapsed time without score-based jumps', () => {
    expect(getTargetSpeed(0)).toBe(BASE_SPEED);
    expect(getTargetSpeed(10_000)).toBeCloseTo(BASE_SPEED + SPEED_CONFIG.accelerationPerSecond * 10);
    expect(getTargetSpeed(10_001) - getTargetSpeed(10_000)).toBeCloseTo(
      SPEED_CONFIG.accelerationPerSecond / 1_000,
      8,
    );
  });

  it('caps at the configured maximum', () => {
    expect(getTargetSpeed(10_000_000)).toBe(MAX_SPEED);
  });

  it('shortens the spawn interval smoothly as survival time increases', () => {
    expect(getTargetSpawnInterval(0)).toBe(SPAWN_CONFIG.initialIntervalMs);
    expect(getTargetSpawnInterval(60_000)).toBe(
      SPAWN_CONFIG.initialIntervalMs - SPAWN_CONFIG.intervalDecreasePerSecond * 60,
    );
    expect(getTargetSpawnInterval(60_001)).toBeLessThan(getTargetSpawnInterval(60_000));
    expect(getTargetSpawnInterval(10_000_000)).toBe(SPAWN_CONFIG.minimumIntervalMs);
  });

  it('eases spawn pressure to 75% when three and four terms unlock', () => {
    const elapsedMs = 120_000;
    const baseline = getTargetSpawnInterval(elapsedMs, 31);
    expect(getTargetSpawnInterval(elapsedMs, 32)).toBeCloseTo(
      baseline / SPAWN_CONFIG.termUnlockRateFactor,
    );
    expect(getTargetSpawnInterval(elapsedMs, 45)).toBeCloseTo(baseline);
    expect(getTargetSpawnInterval(elapsedMs, 46)).toBeCloseTo(
      baseline / SPAWN_CONFIG.termUnlockRateFactor,
    );
    expect(getTargetSpawnInterval(elapsedMs, 62)).toBeCloseTo(baseline);
  });
});
