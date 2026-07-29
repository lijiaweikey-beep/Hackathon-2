import { createNpc, createPlayer } from "./actors.js";
import { createDebtSmasherLevel } from "./createLevel.js";
import { createPreviewModel, renderPreview } from "./preview.js";
import { createWorld } from "./world.js";

export default {
  id: "debt-smasher",
  order: 60,
  track: "mainline",
  age: 30,
  timeLimit: 100,
  resourceLabel: "金币",
  resourceInitial: "0/100",
  actionIcon: "🫸",
  actionGuide: "推按钮/空格 按当前朝向推送",
  legacy: false,
  createLevel: createDebtSmasherLevel,
  actions: ["findHitTarget", "hitTarget", "getHudState", "getResultStats", "afterNpcUpdate"],
  extensions: { createWorld, createPlayer, createNpc, createPreviewModel, renderPreview },
  worldProfile: {
    background: 0xcfe2f3,
    fog: { color: 0xdbeafe, near: 36, far: 76 },
    hemisphere: { sky: 0xffffff, ground: 0x9fb4c7, intensity: 1.18 },
    ambient: { color: 0xffffff, intensity: 0.52 },
    directional: { color: 0xfff1bf, intensity: 1.36 },
    floor: { texture: "gaming", roughness: 0.52 },
  },
  sceneName: "爆金币",
  emoji: "🪙",
  cardStyle: {
    accent: "#facc15",
    glow: "rgba(250, 204, 21, 0.28)",
  },
  cardDesc: "把账单怪推入房贷车贷机关，爆出一百金币还债",
  mission: "用推送按钮按当前朝向推动账单怪，把它们送进车贷压车或房贷压楼区域，凑齐一百金币。",
  clue: "红色区域即将压落；每只账单怪随机爆出一至五金币",
  targetDesc: "房贷车贷账单",
  difficulty: 5,
  success: "一百金币落袋，房贷车贷一起被压成碎纸。半生至此，终于喘了口气。",
  failure: "账单还没压碎，你先被生活压扁了。",
  transition: {
    intro: "三十岁，房贷和车贷排成一条流水线，等着把每一天盖成欠款。",
    success: "一百金币落袋。回头看去，那些狼狈的年份都亮成了人生坐标。",
  },
  lighting: "day",
};
