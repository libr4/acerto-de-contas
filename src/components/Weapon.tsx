import type { WeaponSide } from '../game/weaponSystem';

interface WeaponProps {
  firingSide: WeaponSide | null;
}

export function Weapon({ firingSide }: WeaponProps) {
  return (
    <div className="weapons" aria-hidden="true">
      <div className={`weapon weapon--left ${firingSide === 'left' ? 'weapon--firing' : ''}`}>
        <span className="weapon__sprite" />
      </div>
      <div className={`weapon weapon--right ${firingSide === 'right' ? 'weapon--firing' : ''}`}>
        <span className="weapon__sprite" />
      </div>
    </div>
  );
}
