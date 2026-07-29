import { createNpc, createPlayer } from "./actors.js";
import { createStagedDirectorLevel } from "./createLevel.js";
import { createPreviewModel, renderPreview } from "./preview.js";
import { createWorld } from "./world.js";

export default {
  id: "staged-director",
  order: 120,
  track: "extra",
  legacy: false,
  createLevel: createStagedDirectorLevel,
  extensions: { createWorld, createPlayer, createNpc, createPreviewModel, renderPreview },
  actions: [
    "beforeAttack",
    "findHitTarget",
    "hitTarget",
    "actorDissolved",
    "getHudState",
    "getResultStats",
  ],
  worldProfile: {
    background: 0x102033,
    fog: { color: 0x102033, near: 30, far: 56 },
    hemisphere: { sky: 0xc7d2fe, ground: 0x334155, intensity: 0.7 },
    ambient: { color: 0x93c5fd, intensity: 0.32 },
    directional: { color: 0xfff2b0, intensity: 0.84 },
    floor: { texture: "library", roughness: 0.82 },
  },
  decoyCount: 0,
  npcCountText: "14人",
  sceneName: "谁喊的开拍",
  emoji: "🎬",
  cardStyle: {
    accent: "#f97316",
    glow: "rgba(249, 115, 22, 0.26)",
  },
  cardDesc: "观察摆拍演员看向谁，找出真正的幕后导演",
  mission: "先移动找到自己，再观察摆拍结束后演员会同时看向谁。",
  hudMission: "观察演员回看方向，找出真正导演。",
  clue: "目标特征：表演结束后，演员会同时看向真正的导演",
  hudClue: "表演结束后，演员会同时看向真正的导演",
  targetDesc: "幕后导演",
  difficulty: 3,
  timeLimit: 60,
  attempts: 3,
  success: "一拳打停摆拍，剧本和流量数字炸了满地。",
  failure: "导演拍完剧本，虚假的事故已经传遍网络。",
  lighting: "day",
};
