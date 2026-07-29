import { createLowPolyPerson } from "../../entities/lowPolyPerson.js";
import { LOW_POLY_NPC_PALETTES } from "../../entities/palettes.js";

export const SUPERMARKET_PLAYER_PALETTE = {
  jacket: 0xf97316,
  jacketDark: 0xc2410c,
  shorts: 0x334155,
  shortsDark: 0x1e293b,
  cap: 0x0f766e,
  capAccent: 0xfacc15,
  sock: 0xbae6fd,
};

export function createSupermarketPerson(palette, x, z) {
  const { group } = createLowPolyPerson(palette);
  group.position.set(x, 0, z);
  group.scale.setScalar(0.86);
  return group;
}

export function createSupermarketCast(scene) {
  const customers = Array.from({ length: 14 }, (_, index) => {
    const x = -9 + (index % 7) * 3;
    const z = index < 7 ? -5.4 : 5.2;
    return createSupermarketPerson(
      LOW_POLY_NPC_PALETTES[index % LOW_POLY_NPC_PALETTES.length],
      x,
      z,
    );
  });
  const player = createSupermarketPerson(SUPERMARKET_PLAYER_PALETTE, 0, 6.2);
  const couple = [
    createSupermarketPerson(LOW_POLY_NPC_PALETTES[1], -1.2, -5.4),
    createSupermarketPerson(LOW_POLY_NPC_PALETTES[0], 1.2, -5.4),
  ];

  scene.add(...customers, player, ...couple);
  return { player, couple, customers };
}
