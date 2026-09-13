import { describe, expect, it } from 'vitest';
import { getMathProgression } from './difficultySystem';
import {
  ANTI_REPETITION_CONFIG,
  classifyExpression,
  evaluateDisplay,
  generateExpression,
} from './expressionGenerator';

const termCount = (display: string) => display.match(/\d+/g)?.length ?? 0;
const highOperationCount = (display: string) => display.match(/[×÷]/g)?.length ?? 0;

function assertExactDivision(display: string) {
  const tokens = display.split(' ');
  let chainValue = Number(tokens[0]);
  for (let index = 1; index < tokens.length; index += 2) {
    const operation = tokens[index];
    const operand = Number(tokens[index + 1]);
    if (operation === '×') chainValue *= operand;
    else if (operation === '÷') {
      expect(operand).toBeGreaterThan(0);
      expect(chainValue % operand).toBe(0);
      chainValue /= operand;
    } else {
      chainValue = operand;
    }
  }
}

describe('expression generator', () => {
  it('constructs valid natural-number expressions throughout the curriculum', () => {
    for (const hits of [0, 5, 12, 21, 32, 46, 63, 100]) {
      const progression = getMathProgression(hits);
      for (let sample = 0; sample < 1_000; sample += 1) {
        const generated = generateExpression(progression);
        expect(Number.isInteger(generated.answer)).toBe(true);
        expect(generated.answer).toBeGreaterThanOrEqual(0);
        expect(evaluateDisplay(generated.display)).toBe(generated.answer);
        expect(generated.difficulty).toBe(progression.stage);
        assertExactDivision(generated.display);
      }
    }
  });

  it('generates only very-small two-term additions at the start', () => {
    for (let sample = 0; sample < 1_000; sample += 1) {
      const generated = generateExpression(getMathProgression(0));
      expect(generated.display).toMatch(/^\d+ \+ \d+$/);
      expect(termCount(generated.display)).toBe(2);
      expect(Math.max(...generated.display.match(/\d+/g)!.map(Number))).toBeLessThanOrEqual(9);
    }
  });

  it('introduces subtraction, multiplication, and division in that order', () => {
    const operatorsAt = (hits: number) => {
      const displays = Array.from({ length: 2_000 }, () => generateExpression(getMathProgression(hits)).display);
      return {
        subtract: displays.some((display) => display.includes('−')),
        multiply: displays.some((display) => display.includes('×')),
        divide: displays.some((display) => display.includes('÷')),
      };
    };

    expect(operatorsAt(5)).toEqual({ subtract: true, multiply: false, divide: false });
    expect(operatorsAt(12)).toEqual({ subtract: true, multiply: true, divide: false });
    expect(operatorsAt(21)).toEqual({ subtract: true, multiply: true, divide: true });
  });

  it('does not generate three or four terms before their stages', () => {
    const countsAt = (hits: number) => new Set(
      Array.from({ length: 2_000 }, () => termCount(generateExpression(getMathProgression(hits)).display)),
    );
    expect(countsAt(31)).toEqual(new Set([2]));
    expect(countsAt(32)).toEqual(new Set([2, 3]));
    expect(countsAt(45).has(4)).toBe(false);
    expect(countsAt(46)).toEqual(new Set([2, 3, 4]));
  });

  it('starts three-term expressions with at most one multiplication or division', () => {
    const introductory = Array.from(
      { length: 4_000 },
      () => generateExpression(getMathProgression(32)).display,
    );
    expect(introductory.every((display) => highOperationCount(display) <= 1)).toBe(true);
    expect(introductory.some((display) => termCount(display) === 3 && highOperationCount(display) === 1)).toBe(true);

    const practiced = Array.from(
      { length: 4_000 },
      () => generateExpression(getMathProgression(45)).display,
    );
    expect(practiced.some((display) => termCount(display) === 3 && highOperationCount(display) === 2)).toBe(true);
  });

  it('limits four-term expressions to two high-precedence operations', () => {
    for (let sample = 0; sample < 5_000; sample += 1) {
      const generated = generateExpression(getMathProgression(62));
      if (termCount(generated.display) === 4) {
        expect(highOperationCount(generated.display)).toBeLessThanOrEqual(2);
      }
    }
  });

  it('keeps easier expression shapes in the late-game mix', () => {
    const lateCounts = Array.from(
      { length: 5_000 },
      () => termCount(generateExpression(getMathProgression(100)).display),
    );
    expect(lateCounts).toContain(2);
    expect(lateCounts).toContain(3);
    expect(lateCounts).toContain(4);
  });

  it('can still generate a very-small addition in the late game', () => {
    const generated = generateExpression(getMathProgression(100), () => 0);
    expect(generated.display).toBe('1 + 1');
    expect(classifyExpression(generated)).toMatchObject({
      operationFamily: 'addition',
      termCount: 2,
      complexityTier: 'easy',
    });
  });

  it('uses recent categories to prevent pathological repetition', () => {
    let seed = 0x12345678;
    const random = () => {
      seed = (1664525 * seed + 1013904223) >>> 0;
      return seed / 0x100000000;
    };
    const history: string[] = [];
    let currentStreak = 0;
    let longestStreak = 0;
    let previous = '';

    for (let sample = 0; sample < 2_000; sample += 1) {
      const generated = generateExpression(getMathProgression(31), random, history);
      const category = classifyExpression(generated).key;
      currentStreak = category === previous ? currentStreak + 1 : 1;
      longestStreak = Math.max(longestStreak, currentStreak);
      previous = category;
      history.push(category);
      history.splice(0, Math.max(0, history.length - ANTI_REPETITION_CONFIG.historySize));
    }

    expect(longestStreak).toBeLessThanOrEqual(ANTI_REPETITION_CONFIG.identicalCategoryLimit);
  });
});
