import * as THREE from "three";
import { PLAYER_SPEED, TEMPLE_DECOY_SHADOW_STYLES } from "../config/constants.js";
import {
  LOW_POLY_PLAYER_PALETTE,
  LOW_POLY_NPC_PALETTES,
  LOW_POLY_WOLF_PALETTE,
  LOW_POLY_REMOTE_PALETTE,
} from "./palettes.js";
import { createLowPolyPerson } from "./lowPolyPerson.js";
import { createTemplePerson } from "./templePerson.js";
import { decorateAsWerewolf, decorateAsWolfGuard } from "./werewolf.js";

function defaultRandomRange(min, max) {
  return min + Math.random() * (max - min);
}

export function createPlayer(levelId) {
  const isTemple = levelId === "temple";
  const isBloodmoon = levelId === "bloodmoon";
  const actor = isTemple
    ? createTemplePerson("window", -1)
    : createLowPolyPerson(isBloodmoon ? LOW_POLY_WOLF_PALETTE : LOW_POLY_PLAYER_PALETTE);
  actor.speed = PLAYER_SPEED;
  actor.punchTimer = 0;
  actor.cheer = false;
  return isBloodmoon ? decorateAsWerewolf(actor) : actor;
}

export function createRemotePlayer() {
  const actor = createLowPolyPerson(LOW_POLY_REMOTE_PALETTE);
  actor.speed = PLAYER_SPEED;
  actor.punchTimer = 0;
  actor.cheer = false;
  return actor;
}

export function createNpc(id, flags, levelId, randomRange = defaultRandomRange) {
  const isTemple = flags.templeClone || flags.suShiTarget || levelId === "temple";
  const shadowStyle = flags.suShiTarget ? "bamboo" : TEMPLE_DECOY_SHADOW_STYLES[id % TEMPLE_DECOY_SHADOW_STYLES.length];
  let actor = isTemple
    ? createTemplePerson(shadowStyle, id)
    : createLowPolyPerson(flags.wolfGuard ? LOW_POLY_WOLF_PALETTE : LOW_POLY_NPC_PALETTES[id % LOW_POLY_NPC_PALETTES.length]);
  if (flags.wolfGuard) actor = decorateAsWolfGuard(actor);
  actor.id = id;
  actor.isGamingTarget = Boolean(flags.gamingTarget);
  actor.isLover = Boolean(flags.lover);
  actor.isSuShiTarget = Boolean(flags.suShiTarget);
  actor.isBloodmoonTarget = Boolean(flags.bloodmoonTarget);
  actor.isWolfGuard = Boolean(flags.wolfGuard);
  actor.alive = true;
  actor.marked = false;
  actor.markIntensity = 0;
  actor.velocity = new THREE.Vector2();
  actor.wanderTimer = randomRange(0.8, 2.8);
  actor.pauseTimer = randomRange(0.4, 1.8);
  actor.walking = false;
  actor.walkCycle = Math.random() * 10;
  return actor;
}
