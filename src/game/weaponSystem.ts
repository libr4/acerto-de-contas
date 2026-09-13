export type WeaponSide = 'left' | 'right';

export interface WeaponSelection {
  side: WeaponSide;
  nextMiddleSide: WeaponSide;
}

export function selectWeaponForTarget(
  targetCenterX: number,
  arenaWidth: number,
  middleSide: WeaponSide,
): WeaponSelection {
  const safeWidth = Math.max(1, arenaWidth);
  const screenPosition = targetCenterX / safeWidth;

  if (screenPosition <= 1 / 3) {
    return { side: 'right', nextMiddleSide: middleSide };
  }
  if (screenPosition >= 2 / 3) {
    return { side: 'left', nextMiddleSide: middleSide };
  }
  return {
    side: middleSide,
    nextMiddleSide: middleSide === 'left' ? 'right' : 'left',
  };
}
