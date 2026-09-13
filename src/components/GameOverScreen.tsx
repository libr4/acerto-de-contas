import type { FailureDetails } from '../game/types';
import { formatScore } from './HUD';

interface GameOverScreenProps {
  failure: FailureDetails;
  score: number;
  hits: number;
  bestScore: number;
  isNewBest: boolean;
  onRestart: () => void;
}

export function GameOverScreen({ failure, score, hits, bestScore, isNewBest, onRestart }: GameOverScreenProps) {
  const submitted = Number.isNaN(failure.submitted) ? 'NO ANSWER' : failure.submitted;
  return (
    <div className="overlay overlay--game-over">
      <section className="game-over-panel" aria-labelledby="game-over-title">
        <span className="overlay__kicker">SIGNAL LOST</span>
        <h1 id="game-over-title">GAME OVER!</h1>
        <div className="game-over-panel__reason">
          <span className="warning-icon" aria-hidden="true">!</span>
          <div>
            <small>FAILURE // {failure.reason === 'wrong' ? 'BAD CALCULATION' : 'TARGET ESCAPED'}</small>
            <strong>{failure.expression.display} = {failure.expression.answer}</strong>
            {failure.reason === 'wrong' && <p>YOUR SHOT: <b>{submitted}</b></p>}
          </div>
        </div>
        <div className="game-over-panel__stats">
          <div><span>SCORE</span><strong>{formatScore(score)}</strong></div>
          <div><span>TARGETS</span><strong>{hits}</strong></div>
          <div><span>{isNewBest ? 'NEW BEST' : 'BEST'}</span><strong>{formatScore(bestScore)}</strong></div>
        </div>
        <button type="button" onClick={onRestart}>RUN IT AGAIN <kbd>ENTER</kbd></button>
      </section>
    </div>
  );
}
