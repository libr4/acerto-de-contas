import type {
  ArithmeticOperation,
  Expression,
  MathProgression,
  OperandBand,
  TermCount,
} from './types';

type RandomSource = () => number;

interface OperandRange {
  min: number;
  max: number;
  factorMax: number;
  maxIntermediate: number;
}

/** Numeric categories are deliberately separate from curriculum unlock timing. */
export const OPERAND_RANGES: Record<OperandBand, OperandRange> = {
  verySmall: { min: 1, max: 9, factorMax: 7, maxIntermediate: 60 },
  small: { min: 2, max: 12, factorMax: 10, maxIntermediate: 240 },
  medium: { min: 5, max: 40, factorMax: 12, maxIntermediate: 600 },
  large: { min: 10, max: 100, factorMax: 15, maxIntermediate: 1_500 },
};

export const ANTI_REPETITION_CONFIG = {
  historySize: 4,
  identicalCategoryLimit: 2,
  repeatedWeightMultiplier: 0.12,
  maxResampleAttempts: 8,
} as const;

export type OperationFamily =
  | 'addition'
  | 'subtraction'
  | 'multiplication'
  | 'division'
  | 'add-sub-chain'
  | 'high-chain'
  | 'mixed';

export interface ChallengeProfile {
  key: string;
  operationFamily: OperationFamily;
  termCount: TermCount;
  complexity: number;
  complexityTier: 'easy' | 'medium' | 'hard';
}

export function getExpressionComplexity(generated: Expression): number {
  const operators = generated.display.match(/[+−×÷]/g) ?? [];
  const operandsInDisplay = generated.display.match(/\d+/g)?.map(Number) ?? [];
  const terms = Math.max(2, operandsInDisplay.length);
  const hasLowPrecedence = operators.some((operator) => operator === '+' || operator === '−');
  const hasHighPrecedence = operators.some((operator) => operator === '×' || operator === '÷');
  const operationCost = operators.reduce((cost, operator) => {
    if (operator === '−') return cost + 0.15;
    if (operator === '×') return cost + 0.55;
    if (operator === '÷') return cost + 0.7;
    return cost;
  }, 0);
  const maximumOperand = Math.max(0, ...operandsInDisplay);
  const magnitudeCost = maximumOperand > 50 ? 0.9 : maximumOperand > 20 ? 0.55 : maximumOperand > 9 ? 0.25 : 0;
  const precedenceCost = hasLowPrecedence && hasHighPrecedence ? 0.45 : 0;
  return Math.round(((terms - 2) * 0.75 + operationCost + magnitudeCost + precedenceCost) * 100) / 100;
}

export function classifyExpression(generated: Expression): ChallengeProfile {
  const operators = generated.display.match(/[+−×÷]/g) ?? [];
  const termCount = Math.max(2, generated.display.match(/\d+/g)?.length ?? 2) as TermCount;
  const unique = new Set(operators);
  const hasLowPrecedence = operators.some((operator) => operator === '+' || operator === '−');
  const hasHighPrecedence = operators.some((operator) => operator === '×' || operator === '÷');
  let operationFamily: OperationFamily;

  if (hasLowPrecedence && hasHighPrecedence) operationFamily = 'mixed';
  else if (unique.size > 1 && hasHighPrecedence) operationFamily = 'high-chain';
  else if (unique.size > 1) operationFamily = 'add-sub-chain';
  else if (operators[0] === '−') operationFamily = 'subtraction';
  else if (operators[0] === '×') operationFamily = 'multiplication';
  else if (operators[0] === '÷') operationFamily = 'division';
  else operationFamily = 'addition';

  const complexity = getExpressionComplexity(generated);
  const complexityTier = complexity < 1 ? 'easy' : complexity < 2.5 ? 'medium' : 'hard';
  return {
    key: `${termCount}:${operationFamily}`,
    operationFamily,
    termCount,
    complexity,
    complexityTier,
  };
}

const integer = (min: number, max: number, random: RandomSource) =>
  Math.floor(random() * (max - min + 1)) + min;

function weightedKey<K extends string>(weights: Record<K, number>, random: RandomSource): K {
  const entries = Object.entries(weights) as [K, number][];
  const total = entries.reduce((sum, [, weight]) => sum + Math.max(0, weight), 0);
  if (total <= 0) throw new Error('At least one generation weight must be positive');
  let roll = random() * total;
  for (const [key, weight] of entries) {
    roll -= Math.max(0, weight);
    if (roll < 0) return key;
  }
  return entries[entries.length - 1][0];
}

function chooseOperation(
  progression: MathProgression,
  allowed: readonly ArithmeticOperation[],
  random: RandomSource,
): ArithmeticOperation {
  const weights = Object.fromEntries(
    allowed.map((operation) => [operation, progression.operationWeights[operation]]),
  ) as Record<ArithmeticOperation, number>;
  return weightedKey(weights, random);
}

function chooseTermCount(progression: MathProgression, random: RandomSource): TermCount {
  const selected = weightedKey(
    Object.fromEntries(Object.entries(progression.termCountWeights)) as Record<string, number>,
    random,
  );
  return Number(selected) as TermCount;
}

function chooseOperandBand(progression: MathProgression, random: RandomSource): OperandBand {
  return weightedKey(progression.operandBandWeights, random);
}

function expression(display: string, answer: number, difficulty: number): Expression {
  if (!Number.isInteger(answer) || answer < 0) {
    throw new Error(`Invalid generated answer: ${display} = ${answer}`);
  }
  return { display, answer, difficulty };
}

function generateBinary(
  operation: ArithmeticOperation,
  range: OperandRange,
  difficulty: number,
  random: RandomSource,
): Expression {
  if (operation === '+') {
    const left = integer(range.min, range.max, random);
    const right = integer(range.min, range.max, random);
    return expression(`${left} + ${right}`, left + right, difficulty);
  }

  if (operation === '−') {
    const left = integer(range.min, range.max, random);
    const right = integer(1, left, random);
    return expression(`${left} − ${right}`, left - right, difficulty);
  }

  if (operation === '×') {
    const left = integer(2, range.factorMax, random);
    const right = integer(2, range.factorMax, random);
    return expression(`${left} × ${right}`, left * right, difficulty);
  }

  const divisor = integer(2, range.factorMax, random);
  const quotient = integer(1, range.factorMax, random);
  return expression(`${divisor * quotient} ÷ ${divisor}`, quotient, difficulty);
}

function generateLowPrecedenceChain(
  termCount: TermCount,
  progression: MathProgression,
  range: OperandRange,
  random: RandomSource,
): Expression {
  let answer = integer(range.min, range.max, random);
  let display = String(answer);

  for (let term = 1; term < termCount; term += 1) {
    let operation = chooseOperation(progression, ['+', '−'], random);
    if (operation === '−' && answer === 0) operation = '+';
    const operand = operation === '−'
      ? integer(1, Math.max(1, Math.min(answer, range.max)), random)
      : integer(range.min, range.max, random);
    answer = operation === '+' ? answer + operand : answer - operand;
    display += ` ${operation} ${operand}`;
  }

  return expression(display, answer, progression.stage);
}

function divisors(value: number, maximum: number): number[] {
  const result: number[] = [];
  for (let candidate = 2; candidate <= Math.min(value, maximum); candidate += 1) {
    if (value % candidate === 0) result.push(candidate);
  }
  return result;
}

function generateHighPrecedenceChain(
  termCount: TermCount,
  progression: MathProgression,
  range: OperandRange,
  random: RandomSource,
): Expression {
  let answer = integer(2, range.factorMax, random);
  let display = String(answer);

  for (let term = 1; term < termCount; term += 1) {
    let operation = chooseOperation(progression, ['×', '÷'], random);
    let operand: number;

    if (operation === '÷') {
      const exactDivisors = divisors(answer, range.factorMax);
      if (exactDivisors.length > 0) {
        operand = exactDivisors[integer(0, exactDivisors.length - 1, random)];
      } else {
        operation = '×';
        operand = integer(2, range.factorMax, random);
      }
    } else {
      const safeMaximum = Math.min(range.factorMax, Math.floor(range.maxIntermediate / answer));
      if (safeMaximum >= 2) {
        operand = integer(2, safeMaximum, random);
      } else {
        const exactDivisors = divisors(answer, range.factorMax);
        operation = exactDivisors.length > 0 ? '÷' : '×';
        operand = exactDivisors.length > 0
          ? exactDivisors[integer(0, exactDivisors.length - 1, random)]
          : 1;
      }
    }

    answer = operation === '×' ? answer * operand : answer / operand;
    display += ` ${operation} ${operand}`;
  }

  return expression(display, answer, progression.stage);
}

interface HighPair {
  display: string;
  answer: number;
}

function generateHighPair(
  operation: '×' | '÷',
  range: OperandRange,
  random: RandomSource,
): HighPair {
  if (operation === '×') {
    const left = integer(2, range.factorMax, random);
    const right = integer(2, range.factorMax, random);
    return { display: `${left} × ${right}`, answer: left * right };
  }
  const divisor = integer(2, range.factorMax, random);
  const quotient = integer(1, range.factorMax, random);
  return { display: `${divisor * quotient} ÷ ${divisor}`, answer: quotient };
}

function appendLowOperation(
  display: string,
  answer: number,
  progression: MathProgression,
  range: OperandRange,
  random: RandomSource,
): { display: string; answer: number } {
  const requestedOperation = chooseOperation(progression, ['+', '−'], random) as '+' | '−';
  const canSubtract = requestedOperation === '−' && answer > 0;
  const operand = canSubtract
    ? integer(1, Math.max(1, Math.min(answer, range.max)), random)
    : integer(range.min, range.max, random);
  return {
    display: `${display} ${canSubtract ? '−' : '+'} ${operand}`,
    answer: canSubtract ? answer - operand : answer + operand,
  };
}

function generateMixedPrecedence(
  termCount: 3 | 4,
  progression: MathProgression,
  range: OperandRange,
  random: RandomSource,
): Expression {
  const highOperation = chooseOperation(progression, ['×', '÷'], random) as '×' | '÷';
  const pair = generateHighPair(highOperation, range, random);
  let lowOperation = chooseOperation(progression, ['+', '−'], random) as '+' | '−';
  const highPairFirst = random() < 0.5;
  let display: string;
  let answer: number;

  if (highPairFirst) {
    if (lowOperation === '−' && pair.answer === 0) lowOperation = '+';
    const finalOperand = lowOperation === '−'
      ? integer(1, Math.max(1, Math.min(pair.answer, range.max)), random)
      : integer(range.min, range.max, random);
    display = `${pair.display} ${lowOperation} ${finalOperand}`;
    answer = lowOperation === '+' ? pair.answer + finalOperand : pair.answer - finalOperand;
  } else {
    const firstOperand = integer(range.min, range.max, random);
    display = `${firstOperand} + ${pair.display}`;
    answer = firstOperand + pair.answer;
  }

  if (termCount === 4) {
    ({ display, answer } = appendLowOperation(display, answer, progression, range, random));
  }

  return expression(display, answer, progression.stage);
}

function generateCandidate(
  progression: MathProgression,
  random: RandomSource = Math.random,
): Expression {
  const termCount = chooseTermCount(progression, random);
  const range = OPERAND_RANGES[chooseOperandBand(progression, random)];

  if (termCount === 2) {
    return generateBinary(
      chooseOperation(progression, ['+', '−', '×', '÷'], random),
      range,
      progression.stage,
      random,
    );
  }

  if (random() < progression.repeatedHighOperationChance) {
    const repeatedHigh = generateHighPrecedenceChain(3, progression, range, random);
    if (termCount === 3) return repeatedHigh;
    const extended = appendLowOperation(
      repeatedHigh.display,
      repeatedHigh.answer,
      progression,
      range,
      random,
    );
    return expression(extended.display, extended.answer, progression.stage);
  }

  if (random() < progression.mixedPrecedenceChance) {
    return generateMixedPrecedence(termCount, progression, range, random);
  }
  return generateLowPrecedenceChain(termCount, progression, range, random);
}

function hasChallengeVariety(progression: MathProgression): boolean {
  return Object.values(progression.operationWeights).filter((weight) => weight > 0).length > 1
    || Object.values(progression.termCountWeights).filter((weight) => weight > 0).length > 1
    || Object.values(progression.operandBandWeights).filter((weight) => weight > 0).length > 1
    || progression.mixedPrecedenceChance > 0
    || progression.repeatedHighOperationChance > 0;
}

function applyRecentCategoryPenalty(
  progression: MathProgression,
  repeatedCategory: ChallengeProfile,
): MathProgression {
  const operationWeights = { ...progression.operationWeights };
  const termCountWeights = { ...progression.termCountWeights };
  const multiplier = ANTI_REPETITION_CONFIG.repeatedWeightMultiplier;
  const familyOperation: Partial<Record<OperationFamily, ArithmeticOperation>> = {
    addition: '+',
    subtraction: '−',
    multiplication: '×',
    division: '÷',
  };
  const operation = familyOperation[repeatedCategory.operationFamily];
  if (operation && Object.values(operationWeights).filter((weight) => weight > 0).length > 1) {
    operationWeights[operation] *= multiplier;
  }
  if (Object.values(termCountWeights).filter((weight) => weight > 0).length > 1) {
    termCountWeights[repeatedCategory.termCount] *= multiplier;
  }

  return {
    ...progression,
    operationWeights,
    termCountWeights,
    mixedPrecedenceChance: repeatedCategory.operationFamily === 'mixed'
      ? progression.mixedPrecedenceChance * multiplier
      : progression.mixedPrecedenceChance,
    repeatedHighOperationChance: repeatedCategory.operationFamily === 'high-chain'
      ? progression.repeatedHighOperationChance * multiplier
      : progression.repeatedHighOperationChance,
  };
}

export function generateExpression(
  progression: MathProgression,
  random: RandomSource = Math.random,
  recentCategories: readonly string[] = [],
): Expression {
  const recent = recentCategories.slice(-ANTI_REPETITION_CONFIG.identicalCategoryLimit);
  const repeatedKey = recent.length === ANTI_REPETITION_CONFIG.identicalCategoryLimit
    && recent.every((key) => key === recent[0])
    ? recent[0]
    : null;
  if (!repeatedKey || !hasChallengeVariety(progression)) {
    return generateCandidate(progression, random);
  }

  const [termText, familyText] = repeatedKey.split(':');
  const repeatedCategory: ChallengeProfile = {
    key: repeatedKey,
    termCount: Number(termText) as TermCount,
    operationFamily: familyText as OperationFamily,
    complexity: 0,
    complexityTier: 'easy',
  };
  const adjusted = applyRecentCategoryPenalty(progression, repeatedCategory);
  let candidate = generateCandidate(adjusted, random);
  for (let attempt = 0; attempt < ANTI_REPETITION_CONFIG.maxResampleAttempts; attempt += 1) {
    if (classifyExpression(candidate).key !== repeatedKey) return candidate;
    candidate = generateCandidate(adjusted, random);
  }
  return candidate;
}

export function evaluateDisplay(display: string): number {
  const normalized = display
    .replaceAll('×', '*')
    .replaceAll('÷', '/')
    .replaceAll('−', '-')
    .replaceAll('Ã—', '*')
    .replaceAll('Ã·', '/')
    .replaceAll('âˆ’', '-');
  if (!/^[\d\s()+*/.-]+$/.test(normalized)) throw new Error('Unexpected expression token');
  return Function(`"use strict"; return (${normalized});`)() as number;
}
