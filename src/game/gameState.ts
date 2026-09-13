import { getMathProgression, getTargetSpeed, getTargetTravelDistance } from './difficultySystem';
import type {
  Expression,
  GameState,
  TargetState,
  VultureAnimationVariant,
} from './types';

export const TARGET_WIDTH = 220;
export const MIN_TARGET_WIDTH = 128;
export const MAX_TARGET_POINTS = 100;
export const MIN_TARGET_POINTS = 1;

export function getResponsiveTargetWidth(
  arenaWidth: number,
  arenaHeight = Number.POSITIVE_INFINITY,
): number {
  return Math.round(Math.max(
    MIN_TARGET_WIDTH,
    Math.min(TARGET_WIDTH, arenaWidth * 0.44, arenaHeight * 0.38),
  ));
}

export function createReadyState(): GameState {
  const progression = getMathProgression(0);
  return {
    status: 'READY',
    elapsedMs: 0,
    score: 0,
    hits: 0,
    targets: [],
    difficulty: progression.stage,
    progression,
    speed: getTargetSpeed(0),
    failure: null,
  };
}

export function pickVultureAnimationVariant(
  random: () => number = Math.random,
): VultureAnimationVariant {
  const normalized = Math.max(0, Math.min(0.999_999, random()));
  return Math.floor(normalized * 3) as VultureAnimationVariant;
}

export function startRun(
  expression: Expression,
  arenaWidth: number,
  id = 1,
  animationVariant: VultureAnimationVariant = 0,
  arenaHeight = Number.POSITIVE_INFINITY,
): GameState {
  return {
    ...createReadyState(),
    status: 'PLAYING',
    targets: [createTarget(expression, arenaWidth, id, animationVariant, arenaHeight)],
  };
}

export function createTarget(
  expression: Expression,
  arenaWidth: number,
  id: number,
  animationVariant: VultureAnimationVariant = 0,
  arenaHeight = Number.POSITIVE_INFINITY,
): TargetState {
  const spawnX = arenaWidth + 18;
  return {
    id,
    expression,
    animationVariant,
    x: spawnX,
    spawnX,
    width: getResponsiveTargetWidth(arenaWidth, arenaHeight),
  };
}

export function getTargetPoints(target: TargetState): number {
  const fullPath = target.spawnX + target.width;
  if (fullPath <= 0) return MIN_TARGET_POINTS;
  const remainingProgress = Math.max(0, Math.min(1, (target.x + target.width) / fullPath));
  return Math.round(
    MIN_TARGET_POINTS + (MAX_TARGET_POINTS - MIN_TARGET_POINTS) * remainingProgress,
  );
}

export function advanceFrame(state: GameState, deltaMs: number): GameState {
  if (state.status !== 'PLAYING') return state;
  const elapsedMs = state.elapsedMs + Math.max(0, deltaMs);
  const speed = getTargetSpeed(elapsedMs);
  const progression = state.progression;
  const difficulty = state.difficulty;
  const travelDistance = getTargetTravelDistance(state.elapsedMs, elapsedMs);
  const targets = state.targets.map((target) => ({ ...target, x: target.x - travelDistance }));
  const escapedTarget = targets.find((target) => target.x + target.width < 0);

  if (escapedTarget) {
    return {
      ...state,
      status: 'GAME_OVER',
      elapsedMs,
      speed,
      difficulty,
      progression,
      targets,
      failure: { reason: 'escaped', expression: escapedTarget.expression },
    };
  }
  return { ...state, elapsedMs, speed, difficulty, progression, targets };
}

export interface SubmitAnswerResult {
  state: GameState;
  correct: boolean;
  hitTarget?: TargetState;
  pointsAwarded?: number;
}

export function submitAnswer(state: GameState, rawAnswer: string): SubmitAnswerResult {
  if (state.status !== 'PLAYING' || state.targets.length === 0) return { state, correct: false };
  const submitted = rawAnswer === '' ? Number.NaN : Number(rawAnswer);
  const orderedTargets = [...state.targets].sort((left, right) => left.x - right.x);
  const hitTarget = orderedTargets.find((target) => target.expression.answer === submitted);
  if (!hitTarget) {
    const nearestTarget = orderedTargets[0];
    return {
      correct: false,
      state: {
        ...state,
        status: 'GAME_OVER',
        failure: {
          reason: 'wrong',
          expression: nearestTarget.expression,
          submitted,
        },
      },
    };
  }
  const hits = state.hits + 1;
  const pointsAwarded = getTargetPoints(hitTarget);
  const progression = getMathProgression(hits);
  return {
    correct: true,
    state: {
      ...state,
      hits,
      score: state.score + pointsAwarded,
      targets: state.targets.filter((target) => target.id !== hitTarget.id),
      difficulty: progression.stage,
      progression,
      speed: getTargetSpeed(state.elapsedMs),
    },
    hitTarget,
    pointsAwarded,
  };
}
