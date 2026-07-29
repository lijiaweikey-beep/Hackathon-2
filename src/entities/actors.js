import * as THREE from "three";
import { PLAYER_SPEED } from "../config/constants.js";
import {
  LOW_POLY_PLAYER_PALETTES,
  LOW_POLY_NPC_PALETTES,
} from "./palettes.js";
import { createLowPolyPerson } from "./lowPolyPerson.js";

function defaultRandomRange(min, max) {
  return min + Math.random() * (max - min);
}

function pickPlayerPalette(randomRange) {
  const index = Math.max(
    0,
    Math.min(
      LOW_POLY_PLAYER_PALETTES.length - 1,
      Math.floor(randomRange(0, LOW_POLY_PLAYER_PALETTES.length)),
    ),
  );
  return LOW_POLY_PLAYER_PALETTES[index];
}

export function createPlayer(options = {}) {
  const randomRange = options.randomRange ?? defaultRandomRange;
  const createBody = options.createBody
    ?? (() => createLowPolyPerson(pickPlayerPalette(randomRange)));
  const baseActor = createBody();
  const actor = options.decorate?.(baseActor) ?? baseActor;
  actor.speed = PLAYER_SPEED;
  actor.punchTimer = 0;
  actor.cheer = false;
  return actor;
}

export function createNpc(id, options = {}, randomRange = defaultRandomRange) {
  const createBody = options.createBody
    ?? (() => createLowPolyPerson(LOW_POLY_NPC_PALETTES[id % LOW_POLY_NPC_PALETTES.length]));
  const baseActor = createBody();
  const actor = options.decorate?.(baseActor) ?? baseActor;
  actor.id = id;
  Object.assign(actor, options.traits);
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
