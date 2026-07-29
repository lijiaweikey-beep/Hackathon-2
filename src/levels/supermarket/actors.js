import { createLowPolyPerson } from "../../entities/lowPolyPerson.js";
import { LOW_POLY_NPC_PALETTES } from "../../entities/palettes.js";
import { createNpc, createPlayer } from "../../entities/actors.js";

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

export function createSupermarketCast(scene, randomRange) {
  const customerPositions = [
    [-9, -4.8], [-6, -4.8], [-3, -4.8], [3, -4.8], [6, -4.8], [9, -4.8],
    [-9, -0.1], [-3.2, -0.1], [3.2, -0.1], [9, -0.1],
    [-9, 4.6], [-4.4, 4.6], [4.4, 4.6], [9, 4.6],
  ];
  const createBody = (palette, x, z) => () => ({
    group: createSupermarketPerson(palette, x, z),
  });
  const customers = customerPositions.map(([x, z], index) => createNpc(
    index + 2,
    {
      createBody: createBody(
        LOW_POLY_NPC_PALETTES[index % LOW_POLY_NPC_PALETTES.length],
        x,
        z,
      ),
    },
    randomRange,
  ));
  const player = createPlayer({
    createBody: createBody(SUPERMARKET_PLAYER_PALETTE, 0, 5.8),
  });
  const couple = [
    createNpc(0, {
      createBody: createBody(LOW_POLY_NPC_PALETTES[1], -1.2, -0.1),
    }, randomRange),
    createNpc(1, {
      createBody: createBody(LOW_POLY_NPC_PALETTES[0], 1.2, -0.1),
    }, randomRange),
  ];
  player.group.userData.role = "player";
  couple.forEach(({ group }) => {
    group.userData.role = "target";
  });
  customers.forEach(({ group }) => {
    group.userData.role = "customer";
  });

  scene.add(
    ...customers.map(({ group }) => group),
    player.group,
    ...couple.map(({ group }) => group),
  );
  return { player, couple, customers };
}
