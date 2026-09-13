import type { CSSProperties } from 'react';
import { TARGET_WIDTH } from '../game/gameState';
import type { TargetState } from '../game/types';

interface TargetProps {
  target: TargetState;
}

export function Target({ target }: TargetProps) {
  const termCount = target.expression.display.split(/[+−×÷]/).length;

  return (
    <div
      className="target"
      style={{
        transform: `translate3d(${target.x}px, 0, 0)`,
        '--target-width': `${target.width}px`,
        '--target-scale': target.width / TARGET_WIDTH,
      } as CSSProperties}
      aria-label={`Target: ${target.expression.display}`}
    >
      <span
        className={`target__sprite vulture-sprite--variant-${target.animationVariant}`}
        aria-hidden="true"
      />
      <div className={`target__readout target__readout--${termCount}-terms`}>
        <strong>{target.expression.display}</strong>
        <small>LEVEL {target.expression.difficulty}</small>
      </div>
    </div>
  );
}
