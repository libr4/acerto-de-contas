import { describe, expect, it } from 'vitest';
import { getMathProgression } from './difficultySystem';
import {
  advanceFrame,
  createTarget,
  getResponsiveTargetWidth,
  getTargetPoints,
  pickVultureAnimationVariant,
  startRun,
  submitAnswer,
  TARGET_WIDTH,
} from './gameState';
import type { Expression } from './types';

const problem: Expression = { display: '8 + 7', answer: 15, difficulty: 1 };
const secondProblem: Expression = { display: '3 + 4', answer: 7, difficulty: 1 };

describe('game rules', () => {
  it('scales target geometry for narrow arenas without exceeding safe limits', () => {
    expect(getResponsiveTargetWidth(320)).toBe(141);
    expect(getResponsiveTargetWidth(390)).toBe(172);
    expect(getResponsiveTargetWidth(800)).toBe(TARGET_WIDTH);
    expect(getResponsiveTargetWidth(900, 360)).toBe(137);
  });

  it('selects each of the three vulture animation patterns', () => {
    expect(pickVultureAnimationVariant(() => 0)).toBe(0);
    expect(pickVultureAnimationVariant(() => 0.5)).toBe(1);
    expect(pickVultureAnimationVariant(() => 0.999)).toBe(2);
  });

  it('destroys the target and records a hit only for a correct submitted answer', () => {
    const playing = startRun(problem, 800);
    const result = submitAnswer(playing, '15');
    expect(result.correct).toBe(true);
    expect(result.state.hits).toBe(1);
    expect(result.pointsAwarded).toBe(100);
    expect(result.state.score).toBe(100);
    expect(result.state.targets).toHaveLength(0);
    expect(result.hitTarget?.expression).toBe(problem);
    expect(result.state.status).toBe('PLAYING');
  });

  it('reduces each target score linearly from 100 to 1 using natural numbers', () => {
    const target = createTarget(problem, 800, 1);
    expect(getTargetPoints(target)).toBe(100);

    const halfwayX = (target.spawnX - target.width) / 2;
    expect(getTargetPoints({ ...target, x: halfwayX })).toBe(51);
    expect(getTargetPoints({ ...target, x: -target.width })).toBe(1);

    for (let step = 0; step <= 100; step += 1) {
      const progress = step / 100;
      const x = progress * (target.spawnX + target.width) - target.width;
      const points = getTargetPoints({ ...target, x });
      expect(Number.isInteger(points)).toBe(true);
      expect(points).toBeGreaterThanOrEqual(1);
      expect(points).toBeLessThanOrEqual(100);
    }
  });

  it('awards points based on the matched target position', () => {
    const playing = startRun(problem, 800);
    const target = playing.targets[0];
    const halfwayX = (target.spawnX - target.width) / 2;
    const result = submitAnswer({ ...playing, targets: [{ ...target, x: halfwayX }] }, '15');
    expect(result.pointsAwarded).toBe(51);
    expect(result.state.score).toBe(51);
  });

  it('can destroy any matching visible target and leaves the others moving', () => {
    const playing = startRun(problem, 800);
    const second = { ...createTarget(secondProblem, 800, 2), x: 600 };
    const withTwo = { ...playing, targets: [{ ...playing.targets[0], x: 200 }, second] };
    const result = submitAnswer(withTwo, '7');
    expect(result.correct).toBe(true);
    expect(result.hitTarget?.id).toBe(2);
    expect(result.state.targets.map((target) => target.id)).toEqual([1]);
  });

  it('chooses the nearest target when multiple targets share an answer', () => {
    const playing = startRun(problem, 800);
    const nearer = { ...createTarget(problem, 800, 2), x: 150 };
    const withDuplicateAnswers = { ...playing, targets: [{ ...playing.targets[0], x: 500 }, nearer] };
    const result = submitAnswer(withDuplicateAnswers, '15');
    expect(result.hitTarget?.id).toBe(2);
    expect(result.state.targets.map((target) => target.id)).toEqual([1]);
  });

  it('ends immediately after a wrong answer', () => {
    const result = submitAnswer(startRun(problem, 800), '14');
    expect(result.correct).toBe(false);
    expect(result.state.status).toBe('GAME_OVER');
    expect(result.state.failure).toMatchObject({ reason: 'wrong', submitted: 14 });
  });

  it('does not fail while any part of the target is visible', () => {
    const playing = startRun(problem, 800);
    const nearEdge = { ...playing, targets: [{ ...playing.targets[0], x: -TARGET_WIDTH }] };
    expect(advanceFrame(nearEdge, 0).status).toBe('PLAYING');
  });

  it('fails as soon as any full target passes the left edge', () => {
    const playing = startRun(problem, 800);
    const safeTarget = { ...createTarget(secondProblem, 800, 2), x: 500 };
    const escaped = {
      ...playing,
      targets: [{ ...playing.targets[0], x: -TARGET_WIDTH - 0.01 }, safeTarget],
    };
    const result = advanceFrame(escaped, 0);
    expect(result.status).toBe('GAME_OVER');
    expect(result.failure?.reason).toBe('escaped');
    expect(result.failure?.expression).toBe(problem);
  });

  it('uses elapsed time rather than frame count for movement', () => {
    const playing = startRun(problem, 800);
    const oneFrame = advanceFrame(playing, 1_000);
    const tenFrames = Array.from({ length: 10 }).reduce<typeof playing>(
      (state) => advanceFrame(state, 100),
      playing,
    );
    expect(tenFrames.targets[0].x).toBeCloseTo(oneFrame.targets[0].x, 1);
  });

  it('lets time increase speed without advancing the math curriculum', () => {
    const playing = startRun(problem, 800);
    const survived = advanceFrame(playing, 60_000);
    expect(survived.speed).toBeGreaterThan(playing.speed);
    expect(survived.progression).toEqual(playing.progression);
    expect(survived.difficulty).toBe(1);
  });

  it('starting a new run resets time, hits, progression, and failure', () => {
    const progressed = {
      ...startRun(problem, 800),
      elapsedMs: 82_000,
      hits: 18,
      difficulty: 3,
      progression: getMathProgression(18),
      speed: 150,
    };
    const failed = submitAnswer(progressed, '0').state;
    expect(failed.status).toBe('GAME_OVER');
    const restarted = startRun(problem, 800);
    expect(restarted).toMatchObject({
      status: 'PLAYING',
      elapsedMs: 0,
      score: 0,
      hits: 0,
      difficulty: 1,
      failure: null,
    });
    expect(restarted.progression).toEqual(getMathProgression(0));
    expect(restarted.speed).toBeLessThan(progressed.speed);
  });
});
