import { describe, expect, it } from 'vitest';
import { selectWeaponForTarget } from './weaponSystem';

describe('weapon selection', () => {
  it('uses the right-side arm for targets in the left third', () => {
    expect(selectWeaponForTarget(100, 900, 'left').side).toBe('right');
  });

  it('uses the left-side arm for targets in the right third', () => {
    expect(selectWeaponForTarget(800, 900, 'right').side).toBe('left');
  });

  it('alternates arms for targets in the middle third', () => {
    const first = selectWeaponForTarget(450, 900, 'left');
    const second = selectWeaponForTarget(450, 900, first.nextMiddleSide);
    expect(first.side).toBe('left');
    expect(second.side).toBe('right');
  });
});
