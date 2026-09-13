import { describe, expect, it } from 'vitest';
import { BEST_HITS_KEY, BEST_SCORE_KEY, loadBestScores, updateBestScores } from './storage';

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe('personal best persistence', () => {
  it('persists higher records without replacing them with lower runs', () => {
    const storage = new MemoryStorage();
    updateBestScores(storage, { score: 1_240, hits: 7 });
    updateBestScores(storage, { score: 1_000, hits: 5 });
    expect(loadBestScores(storage)).toEqual({ score: 1_240, hits: 7 });
    expect(storage.getItem(BEST_SCORE_KEY)).toBe('1240');
    expect(storage.getItem(BEST_HITS_KEY)).toBe('7');
  });

  it('recovers safely from malformed stored values', () => {
    const storage = new MemoryStorage();
    storage.setItem(BEST_SCORE_KEY, 'not-a-number');
    storage.setItem(BEST_HITS_KEY, '-8');
    expect(loadBestScores(storage)).toEqual({ score: 0, hits: 0 });
  });

  it('stores scores and hits as natural numbers', () => {
    const storage = new MemoryStorage();
    expect(updateBestScores(storage, { score: 123.9, hits: 4.8 })).toEqual({ score: 123, hits: 4 });
  });
});
