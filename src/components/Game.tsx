import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { SPAWN_CONFIG } from '../game/difficultySystem';
import {
  ANTI_REPETITION_CONFIG,
  classifyExpression,
  generateExpression,
} from '../game/expressionGenerator';
import {
  advanceFrame,
  createReadyState,
  createTarget,
  getResponsiveTargetWidth,
  pickVultureAnimationVariant,
  startRun,
  submitAnswer,
  TARGET_WIDTH,
} from '../game/gameState';
import { getSpawnDelay } from '../game/spawnSystem';
import { loadBestScores, updateBestScores, type BestScores } from '../game/storage';
import { selectWeaponForTarget, type WeaponSide } from '../game/weaponSystem';
import type {
  Expression,
  GameState,
  MathProgression,
  VultureAnimationVariant,
} from '../game/types';
import { AnswerInput } from './AnswerInput';
import { GameOverScreen } from './GameOverScreen';
import { HUD } from './HUD';
import { Target } from './Target';
import { Weapon } from './Weapon';

interface Impact {
  id: number;
  x: number;
  width: number;
  points: number;
  animationVariant: VultureAnimationVariant;
}

function playTone(kind: 'shot' | 'failure') {
  try {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.connect(gain);
    gain.connect(context.destination);
    const now = context.currentTime;
    if (kind === 'shot') {
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(150, now);
      oscillator.frequency.exponentialRampToValueAtTime(62, now + 0.075);
      gain.gain.setValueAtTime(0.075, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      oscillator.stop(now + 0.09);
    } else {
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(110, now);
      oscillator.frequency.exponentialRampToValueAtTime(42, now + 0.25);
      gain.gain.setValueAtTime(0.045, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.27);
      oscillator.stop(now + 0.27);
    }
    oscillator.start(now);
    oscillator.addEventListener('ended', () => void context.close());
  } catch {
    // Audio feedback is an enhancement; gameplay remains fully functional without it.
  }
}

export function Game() {
  const [game, setGame] = useState<GameState>(() => createReadyState());
  const [answer, setAnswer] = useState('');
  const [best, setBest] = useState<BestScores>(() => loadBestScores(localStorage));
  const [impact, setImpact] = useState<Impact | null>(null);
  const [firingSide, setFiringSide] = useState<WeaponSide | null>(null);
  const [newBest, setNewBest] = useState(false);
  const arenaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const stateRef = useRef(game);
  const nextTargetId = useRef(1);
  const spawnAt = useRef<number | null>(null);
  const pendingExpression = useRef<Expression | null>(null);
  const lastSpawnedExpression = useRef<Expression | null>(null);
  const recentCategories = useRef<string[]>([]);
  const nextMiddleWeapon = useRef<WeaponSide>('left');
  const firingTimer = useRef<number | null>(null);

  const commit = useCallback((next: GameState) => {
    stateRef.current = next;
    setGame(next);
  }, []);

  const generateQueuedExpression = useCallback((progression: MathProgression) => {
    const generated = generateExpression(progression, Math.random, recentCategories.current);
    recentCategories.current = [
      ...recentCategories.current,
      classifyExpression(generated).key,
    ].slice(-ANTI_REPETITION_CONFIG.historySize);
    return generated;
  }, []);

  const finishRun = useCallback((finished: GameState) => {
    const previous = loadBestScores(localStorage);
    const saved = updateBestScores(localStorage, { score: finished.score, hits: finished.hits });
    setNewBest(finished.score > previous.score);
    setBest(saved);
    commit(finished);
    setAnswer('');
    setFiringSide(null);
    playTone('failure');
  }, [commit]);

  const start = useCallback(() => {
    const width = arenaRef.current?.clientWidth ?? window.innerWidth;
    const height = arenaRef.current?.clientHeight ?? window.innerHeight;
    const ready = createReadyState();
    recentCategories.current = [];
    const first = generateQueuedExpression(ready.progression);
    const nextExpression = generateQueuedExpression(ready.progression);
    const started = startRun(
      first,
      width,
      nextTargetId.current + 1,
      pickVultureAnimationVariant(),
      height,
    );
    pendingExpression.current = nextExpression;
    lastSpawnedExpression.current = first;
    spawnAt.current = performance.now() + getSpawnDelay({
      elapsedMs: 0,
      hits: 0,
      speed: started.speed,
      targetWidth: getResponsiveTargetWidth(width, height),
      nextExpression,
      previousExpression: first,
    });
    nextTargetId.current += 1;
    setAnswer('');
    setImpact(null);
    setFiringSide(null);
    nextMiddleWeapon.current = 'left';
    if (firingTimer.current !== null) window.clearTimeout(firingTimer.current);
    setNewBest(false);
    commit(started);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [commit, generateQueuedExpression]);

  const fire = useCallback(() => {
    const current = stateRef.current;
    if (current.status !== 'PLAYING' || current.targets.length === 0) return;
    const result = submitAnswer(current, answer);
    if (!result.correct) {
      finishRun(result.state);
      return;
    }
    const hitTarget = result.hitTarget!;
    commit(result.state);
    setAnswer('');
    setImpact({
      id: hitTarget.id,
      x: hitTarget.x,
      width: hitTarget.width,
      points: result.pointsAwarded!,
      animationVariant: hitTarget.animationVariant,
    });
    const weaponSelection = selectWeaponForTarget(
      hitTarget.x + hitTarget.width / 2,
      arenaRef.current?.clientWidth ?? window.innerWidth,
      nextMiddleWeapon.current,
    );
    nextMiddleWeapon.current = weaponSelection.nextMiddleSide;
    setFiringSide(weaponSelection.side);
    playTone('shot');
    const now = performance.now();
    const enteredTermUnlockStage = result.state.progression.stage !== current.progression.stage
      && (result.state.progression.stage === 5 || result.state.progression.stage === 6);
    if (enteredTermUnlockStage) {
      const nextExpression = pendingExpression.current;
      if (nextExpression) {
        const width = arenaRef.current?.clientWidth ?? window.innerWidth;
        const height = arenaRef.current?.clientHeight ?? window.innerHeight;
        spawnAt.current = now + getSpawnDelay({
          elapsedMs: result.state.elapsedMs,
          hits: result.state.hits,
          speed: result.state.speed,
          targetWidth: getResponsiveTargetWidth(width, height),
          nextExpression,
          previousExpression: lastSpawnedExpression.current,
        });
      }
    }
    if (result.state.targets.length === 0) {
      const emptyArenaSpawn = now + SPAWN_CONFIG.emptyArenaDelayMs;
      spawnAt.current = spawnAt.current === null
        ? emptyArenaSpawn
        : Math.min(spawnAt.current, emptyArenaSpawn);
    }
    if (firingTimer.current !== null) window.clearTimeout(firingTimer.current);
    firingTimer.current = window.setTimeout(() => setFiringSide(null), 300);
    window.setTimeout(() => setImpact(null), 600);
  }, [answer, commit, finishRun]);

  useEffect(() => {
    if (game.status !== 'PLAYING') return;
    let animationFrame = 0;
    let lastTime = performance.now();

    const frame = (now: number) => {
      const current = stateRef.current;
      if (current.status !== 'PLAYING') return;
      const delta = Math.min(50, now - lastTime);
      lastTime = now;
      let next = advanceFrame(current, delta);

      if (next.status === 'GAME_OVER') {
        finishRun(next);
        return;
      }

      if (spawnAt.current !== null && now >= spawnAt.current) {
        const width = arenaRef.current?.clientWidth ?? window.innerWidth;
        const height = arenaRef.current?.clientHeight ?? window.innerHeight;
        const expression = pendingExpression.current ?? generateQueuedExpression(next.progression);
        nextTargetId.current += 1;
        next = {
          ...next,
          targets: [
            ...next.targets,
            createTarget(
              expression,
              width,
              nextTargetId.current,
              pickVultureAnimationVariant(),
              height,
            ),
          ],
        };
        lastSpawnedExpression.current = expression;
        const followingExpression = generateQueuedExpression(next.progression);
        pendingExpression.current = followingExpression;
        spawnAt.current = now + getSpawnDelay({
          elapsedMs: next.elapsedMs,
          hits: next.hits,
          speed: next.speed,
          targetWidth: getResponsiveTargetWidth(width, height),
          nextExpression: followingExpression,
          previousExpression: expression,
        });
      }
      commit(next);
      animationFrame = requestAnimationFrame(frame);
    };

    animationFrame = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animationFrame);
  }, [game.status, commit, finishRun, generateQueuedExpression]);

  useEffect(() => {
    const handleGlobalKey = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || event.defaultPrevented) return;
      if (stateRef.current.status !== 'PLAYING') {
        event.preventDefault();
        start();
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [start]);

  useEffect(() => () => {
    if (firingTimer.current !== null) window.clearTimeout(firingTimer.current);
  }, []);

  return (
    <main className={`game-shell ${firingSide ? 'game-shell--firing' : ''} ${game.status === 'GAME_OVER' ? 'game-shell--failed' : ''}`}>
      <div className="arena" ref={arenaRef}>
        <HUD score={game.score} hits={game.hits} bestScore={best.score} />
        <div className="arena__skyline" />
        <div className="arena__grid" />
        {game.status !== 'READY' && game.targets.map((target) => <Target key={target.id} target={target} />)}
        {impact && (
          <div
            className="impact"
            key={impact.id}
            style={{
              transform: `translate3d(${impact.x}px, 0, 0)`,
              '--target-width': `${impact.width}px`,
              '--target-scale': impact.width / TARGET_WIDTH,
            } as CSSProperties}
            aria-hidden="true"
          >
            <span
              className={`impact__sprite vulture-sprite--variant-${impact.animationVariant}`}
            />
            <span className="impact__word">+{impact.points}</span>
          </div>
        )}
        {/* Tracer disabled: the revolver sprite already contains the complete shot effect. */}
        {/* {firingSide && <div className="tracer" aria-hidden="true" />} */}
        <Weapon firingSide={firingSide} />

        <AnswerInput
          inputRef={inputRef}
          value={answer}
          disabled={game.status !== 'PLAYING'}
          onChange={setAnswer}
          onSubmit={fire}
        />

        {game.status === 'READY' && (
          <div className="overlay overlay--ready">
            <section className="ready-panel">
              <h1>ACERTO DE CONTAS<br /><em>NO SERTÃO</em></h1>
              <p>Digite o resultado e aperte ATIRAR antes que o urubu escape. Um erro encerra o jogo.</p>
              <button type="button" onClick={start}>JOGAR <kbd>ENTER</kbd></button>
            </section>
          </div>
        )}

        {game.status === 'GAME_OVER' && game.failure && (
          <GameOverScreen
            failure={game.failure}
            score={game.score}
            hits={game.hits}
            bestScore={best.score}
            isNewBest={newBest}
            onRestart={start}
          />
        )}
      </div>
    </main>
  );
}
