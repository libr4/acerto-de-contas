export type GameStatus = 'READY' | 'PLAYING' | 'GAME_OVER';

export interface Expression {
  display: string;
  answer: number;
  difficulty: number;
}

export type ArithmeticOperation = '+' | '−' | '×' | '÷';
export type TermCount = 2 | 3 | 4;
export type OperandBand = 'verySmall' | 'small' | 'medium' | 'large';
export type VultureAnimationVariant = 0 | 1 | 2;

export interface MathProgression {
  stage: number;
  stageName: string;
  stageProgress: number;
  operationWeights: Record<ArithmeticOperation, number>;
  termCountWeights: Record<TermCount, number>;
  operandBandWeights: Record<OperandBand, number>;
  mixedPrecedenceChance: number;
  repeatedHighOperationChance: number;
}

export interface TargetState {
  id: number;
  expression: Expression;
  animationVariant: VultureAnimationVariant;
  x: number;
  spawnX: number;
  width: number;
}

export interface FailureDetails {
  reason: 'wrong' | 'escaped';
  expression: Expression;
  submitted?: number;
}

export interface GameState {
  status: GameStatus;
  elapsedMs: number;
  score: number;
  hits: number;
  targets: TargetState[];
  difficulty: number;
  progression: MathProgression;
  speed: number;
  failure: FailureDetails | null;
}
