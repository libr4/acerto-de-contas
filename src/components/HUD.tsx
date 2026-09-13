interface HUDProps {
  score: number;
  hits: number;
  bestScore: number;
}

export function formatScore(points: number): string {
  return String(Math.floor(Math.max(0, points))).padStart(6, '0');
}

export function HUD({ score, hits, bestScore }: HUDProps) {
  return (
    <header className="hud" aria-label="Run statistics">
      <dl className="hud__stats">
        <div>
          <dt>POINTS</dt>
          <dd>{formatScore(score)}</dd>
        </div>
        <div>
          <dt>HITS</dt>
          <dd>{String(hits).padStart(2, '0')}</dd>
        </div>
        <div>
          <dt>BEST</dt>
          <dd>{formatScore(bestScore)}</dd>
        </div>
      </dl>
    </header>
  );
}
