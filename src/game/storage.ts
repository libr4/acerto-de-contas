export const BEST_SCORE_KEY = 'dead-reckoning.best-score';
export const BEST_HITS_KEY = 'dead-reckoning.best-hits';

export interface BestScores {
  score: number;
  hits: number;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const validStoredNumber = (value: string | null) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
};

export function loadBestScores(storage: StorageLike): BestScores {
  return {
    score: validStoredNumber(storage.getItem(BEST_SCORE_KEY)),
    hits: validStoredNumber(storage.getItem(BEST_HITS_KEY)),
  };
}

export function updateBestScores(storage: StorageLike, run: BestScores): BestScores {
  const previous = loadBestScores(storage);
  const best = {
    score: Math.max(previous.score, Math.floor(Math.max(0, run.score))),
    hits: Math.max(previous.hits, Math.floor(Math.max(0, run.hits))),
  };
  storage.setItem(BEST_SCORE_KEY, String(best.score));
  storage.setItem(BEST_HITS_KEY, String(best.hits));
  return best;
}
