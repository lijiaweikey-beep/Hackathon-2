import { OFFICE_HP_MAX } from "./constants.js";
import { createNpc, createPlayer } from "./actors.js";
import { createOfficeLevel } from "./createLevel.js";
import { createWorld } from "./world.js";

export default {
  id: "office",
  order: 50,
  track: "mainline",
  age: 27,
  legacy: false,
  createLevel: createOfficeLevel,
  extensions: { createWorld, createPlayer, createNpc },
  worldProfile: {
    background: 0x1a2332,
    fog: { color: 0x1a2332, near: 24, far: 50 },
    hemisphere: { sky: 0xe8f0ff, ground: 0x1a2332, intensity: 1.4 },
    ambient: { color: 0x8899bb, intensity: 0.5 },
    directional: { color: 0xe8f4ff, intensity: 1.6 },
    floor: { texture: "office", roughness: 0.82 },
  },
  actions: [
    "beforeAttack",
    "hitTarget",
    "getHudState",
    "getResultStats",
  ],
  timeLimit: 90,
  resourceLabel: "生命",
  resourceInitial: OFFICE_HP_MAX,
  decoyCount: 15,
  sceneName: "躲老板黑锅",
  emoji: "🍳",
  cardStyle: {
    accent: "#fb7185",
    glow: "rgba(251, 113, 133, 0.28)",
  },
  cardDesc: ({ npcCount }) => `在 ${npcCount} 人中找到甩锅老板并一拳打爆`,
  mission: "观察地面红圈躲开黑锅，同时在人群中找到老板。",
  clue: "红圈是黑锅落点；老板戴红领带且不会被锅砸",
  targetDesc: "甩锅老板",
  difficulty: 4,
  success: "老板倒下，黑锅雨也停了。这个锅，终于不用你背。",
  failure: "锅接住了，老板却还在若无其事地巡逻。",
  transition: {
    intro: "二十七岁，职场的锅从不打招呼，总是在你抬头前先落下来。",
    success: "这一拳打停了黑锅雨。三年后，更大的房贷和车贷一起压了下来。",
  },
  lighting: "day",
};
