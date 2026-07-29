import * as THREE from "three";
import {
  createNpc as createNpcEntity,
  createPlayer as createPlayerEntity,
} from "../../entities/actors.js";
import { createLowPolyPerson } from "../../entities/lowPolyPerson.js";
import { LOW_POLY_NPC_PALETTES } from "../../entities/palettes.js";
import { makeLowPolyMat, addFacetedBox } from "../../entities/lowPolyMesh.js";

/**
 * 给boss添加红领带装饰 — 在默认彩色人群中突出boss的唯一视觉特征
 * 领带由三段组成：领结、主体、尖端，挂在shirt前方
 */
function decorateWithRedTie(actor) {
  const visual = actor.group.userData.visual;
  const tieMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    emissive: 0xdc2626,
    emissiveIntensity: 0.3,
    roughness: 0.4,
    metalness: 0.05,
    flatShading: true,
  });
  // 领带结（领口位置）
  const tieKnot = addFacetedBox(visual, 0.1, 0.08, 0.06, tieMat, 0, 1.2, 0.22);
  // 领带主体（沿胸口垂下）
  const tieBody = addFacetedBox(visual, 0.08, 0.24, 0.04, tieMat, 0, 1.0, 0.22);
  // 领带尖端（倒三角）
  const tieTip = addFacetedBox(visual, 0.06, 0.06, 0.04, tieMat, 0, 0.86, 0.22);

  actor.group.userData.tieMark = tieBody;
  actor.group.userData.tieParts = [tieKnot, tieBody, tieTip];
  return actor;
}

const actorProfile = Object.freeze({});

export function createPlayer() {
  return createPlayerEntity(actorProfile);
}

export function createNpc(id, flags, randomRange) {
  const isBoss = Boolean(flags.isBoss);
  return createNpcEntity(id, {
    createBody: () => createLowPolyPerson(
      LOW_POLY_NPC_PALETTES[id % LOW_POLY_NPC_PALETTES.length],
    ),
    decorate: isBoss ? decorateWithRedTie : undefined,
    traits: {
      isBoss,
      isLevelTarget: Boolean(flags.levelTarget),
    },
  }, randomRange);
}
