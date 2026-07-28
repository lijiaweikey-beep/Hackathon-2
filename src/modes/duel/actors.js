import { PLAYER_SPEED } from "../../config/constants.js";
import { createLowPolyPerson } from "../../entities/lowPolyPerson.js";

const REMOTE_PALETTE = {
  jacket: 0xef4444,
  jacketDark: 0xdc2626,
  shorts: 0x1e3a5f,
  shortsDark: 0x172e4a,
  cap: 0xfbbf24,
  capAccent: 0xef4444,
  sock: 0xfca5a5,
};

export function createRemotePlayer() {
  const actor = createLowPolyPerson(REMOTE_PALETTE);
  actor.speed = PLAYER_SPEED;
  actor.punchTimer = 0;
  actor.cheer = false;
  return actor;
}
