import type { ArithmeticOperation, MathProgression, OperandBand, TermCount } from './types';

export const SPEED_CONFIG = {
  baseSpeed: 82,
  accelerationPerSecond: 0.45,
  maxSpeed: 184,
} as const;

/** Independent arrival-pressure curve. Values are milliseconds between spawns. */
export const SPAWN_CONFIG = {
  initialIntervalMs: 6_500,
  intervalDecreasePerSecond: 20,
  minimumIntervalMs: 1_700,
  emptyArenaDelayMs: 560,
  termUnlockRateFactor: 0.75,
} as const;

export const BASE_SPEED = SPEED_CONFIG.baseSpeed;
export const MAX_SPEED = SPEED_CONFIG.maxSpeed;

type OperationWeights = Record<ArithmeticOperation, number>;
type TermCountWeights = Record<TermCount, number>;
type OperandBandWeights = Record<OperandBand, number>;

interface CurriculumStage {
  stage: number;
  name: string;
  startHit: number;
  endHit: number;
  operations: { start: OperationWeights; end: OperationWeights };
  terms: { start: TermCountWeights; end: TermCountWeights };
  operands: { start: OperandBandWeights; end: OperandBandWeights };
  mixedPrecedence: { start: number; end: number };
  repeatedHighOperations: { start: number; end: number };
}

const operations = (add: number, subtract: number, multiply: number, divide: number): OperationWeights => ({
  '+': add,
  '−': subtract,
  '×': multiply,
  '÷': divide,
});

const terms = (two: number, three: number, four: number): TermCountWeights => ({ 2: two, 3: three, 4: four });

const operands = (verySmall: number, small: number, medium: number, large: number): OperandBandWeights => ({
  verySmall,
  small,
  medium,
  large,
});

/** Central balancing table for the mathematical curriculum. */
export const MATH_STAGES: readonly CurriculumStage[] = [
  {
    stage: 1,
    name: 'Basic addition',
    startHit: 0,
    endHit: 4,
    operations: { start: operations(1, 0, 0, 0), end: operations(1, 0, 0, 0) },
    terms: { start: terms(1, 0, 0), end: terms(1, 0, 0) },
    operands: { start: operands(1, 0, 0, 0), end: operands(1, 0, 0, 0) },
    mixedPrecedence: { start: 0, end: 0 },
    repeatedHighOperations: { start: 0, end: 0 },
  },
  {
    stage: 2,
    name: 'Subtraction introduction',
    startHit: 5,
    endHit: 11,
    operations: { start: operations(0.9, 0.1, 0, 0), end: operations(0.55, 0.45, 0, 0) },
    terms: { start: terms(1, 0, 0), end: terms(1, 0, 0) },
    operands: { start: operands(1, 0, 0, 0), end: operands(1, 0, 0, 0) },
    mixedPrecedence: { start: 0, end: 0 },
    repeatedHighOperations: { start: 0, end: 0 },
  },
  {
    stage: 3,
    name: 'Multiplication introduction',
    startHit: 12,
    endHit: 20,
    operations: { start: operations(0.425, 0.425, 0.15, 0), end: operations(0.3, 0.3, 0.4, 0) },
    terms: { start: terms(1, 0, 0), end: terms(1, 0, 0) },
    operands: { start: operands(0.35, 0.65, 0, 0), end: operands(0.2, 0.8, 0, 0) },
    mixedPrecedence: { start: 0, end: 0 },
    repeatedHighOperations: { start: 0, end: 0 },
  },
  {
    stage: 4,
    name: 'Division introduction',
    startHit: 21,
    endHit: 31,
    operations: { start: operations(0.3, 0.3, 0.3, 0.1), end: operations(0.25, 0.25, 0.25, 0.25) },
    terms: { start: terms(1, 0, 0), end: terms(1, 0, 0) },
    operands: { start: operands(0.2, 0.8, 0, 0), end: operands(0.15, 0.85, 0, 0) },
    mixedPrecedence: { start: 0, end: 0 },
    repeatedHighOperations: { start: 0, end: 0 },
  },
  {
    stage: 5,
    name: 'Three-term expressions',
    startHit: 32,
    endHit: 45,
    operations: { start: operations(0.25, 0.25, 0.25, 0.25), end: operations(0.25, 0.25, 0.25, 0.25) },
    terms: { start: terms(0.8, 0.2, 0), end: terms(0.45, 0.55, 0) },
    operands: { start: operands(0.15, 0.85, 0, 0), end: operands(0.12, 0.88, 0, 0) },
    mixedPrecedence: { start: 0.35, end: 0.48 },
    repeatedHighOperations: { start: 0, end: 0.3 },
  },
  {
    stage: 6,
    name: 'Four-term expressions',
    startHit: 46,
    endHit: 62,
    operations: { start: operations(0.25, 0.25, 0.25, 0.25), end: operations(0.25, 0.25, 0.25, 0.25) },
    terms: { start: terms(0.4, 0.5, 0.1), end: terms(0.3, 0.45, 0.25) },
    operands: { start: operands(0.12, 0.88, 0, 0), end: operands(0.1, 0.9, 0, 0) },
    mixedPrecedence: { start: 0.48, end: 0.55 },
    repeatedHighOperations: { start: 0.3, end: 0.58 },
  },
  {
    stage: 7,
    name: 'Operand magnitude',
    startHit: 63,
    endHit: 100,
    operations: { start: operations(0.25, 0.25, 0.25, 0.25), end: operations(0.25, 0.25, 0.25, 0.25) },
    terms: { start: terms(0.3, 0.45, 0.25), end: terms(0.3, 0.42, 0.28) },
    operands: { start: operands(0.1, 0.9, 0, 0), end: operands(0.12, 0.28, 0.45, 0.15) },
    mixedPrecedence: { start: 0.55, end: 0.62 },
    repeatedHighOperations: { start: 0.58, end: 0.75 },
  },
] as const;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const mix = (start: number, end: number, progress: number) => start + (end - start) * progress;

function interpolateRecord<K extends string | number>(
  start: Record<K, number>,
  end: Record<K, number>,
  progress: number,
): Record<K, number> {
  return Object.fromEntries(
    (Object.keys(start) as K[]).map((key) => [key, mix(start[key], end[key], progress)]),
  ) as Record<K, number>;
}

export function getMathProgression(hits: number): MathProgression {
  const safeHits = Math.max(0, Math.floor(hits));
  let stage = MATH_STAGES[0];
  for (const candidate of MATH_STAGES) {
    if (safeHits < candidate.startHit) break;
    stage = candidate;
  }
  const span = Math.max(1, stage.endHit - stage.startHit);
  const stageProgress = clamp01((safeHits - stage.startHit) / span);

  return {
    stage: stage.stage,
    stageName: stage.name,
    stageProgress,
    operationWeights: interpolateRecord(stage.operations.start, stage.operations.end, stageProgress),
    termCountWeights: interpolateRecord(stage.terms.start, stage.terms.end, stageProgress),
    operandBandWeights: interpolateRecord(stage.operands.start, stage.operands.end, stageProgress),
    mixedPrecedenceChance: mix(stage.mixedPrecedence.start, stage.mixedPrecedence.end, stageProgress),
    repeatedHighOperationChance: mix(
      stage.repeatedHighOperations.start,
      stage.repeatedHighOperations.end,
      stageProgress,
    ),
  };
}

/** Kept as the compact stage number used by the HUD and expression metadata. */
export function getDifficulty(hits: number): number {
  return getMathProgression(hits).stage;
}

/** Dino-style speed curve: time is the only input, so it never jumps after a hit. */
export function getTargetSpeed(elapsedMs: number): number {
  const elapsedSeconds = Math.max(0, elapsedMs) / 1_000;
  return Math.min(MAX_SPEED, BASE_SPEED + SPEED_CONFIG.accelerationPerSecond * elapsedSeconds);
}

export function getTargetSpawnInterval(elapsedMs: number, hits = 0): number {
  const elapsedSeconds = Math.max(0, elapsedMs) / 1_000;
  const baselineInterval = Math.max(
    SPAWN_CONFIG.minimumIntervalMs,
    SPAWN_CONFIG.initialIntervalMs - SPAWN_CONFIG.intervalDecreasePerSecond * elapsedSeconds,
  );
  const progression = getMathProgression(hits);
  const isTermUnlockStage = progression.stage === 5 || progression.stage === 6;
  if (!isTermUnlockStage) return baselineInterval;

  const rateFactor = mix(
    SPAWN_CONFIG.termUnlockRateFactor,
    1,
    progression.stageProgress,
  );
  return baselineInterval / rateFactor;
}

/** Exact integral of the speed curve, keeping movement independent of frame size. */
export function getTargetTravelDistance(startElapsedMs: number, endElapsedMs: number): number {
  const startSeconds = Math.max(0, startElapsedMs) / 1_000;
  const endSeconds = Math.max(startElapsedMs, endElapsedMs, 0) / 1_000;
  const acceleration = SPEED_CONFIG.accelerationPerSecond;
  const capTime = acceleration > 0 ? (MAX_SPEED - BASE_SPEED) / acceleration : 0;
  const linearStart = Math.min(startSeconds, capTime);
  const linearEnd = Math.min(endSeconds, capTime);
  const linearDistance = linearEnd > linearStart
    ? BASE_SPEED * (linearEnd - linearStart)
      + 0.5 * acceleration * (linearEnd ** 2 - linearStart ** 2)
    : 0;
  const cappedDistance = endSeconds > capTime
    ? MAX_SPEED * (endSeconds - Math.max(startSeconds, capTime))
    : 0;
  return linearDistance + cappedDistance;
}
