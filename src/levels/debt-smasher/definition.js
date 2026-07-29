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
    background: 0x162235,
    fog: { color: 0x162235, near: 48, far: 90 },
    hemisphere: { sky: 0x8fb4df, ground: 0x1d2b3d, intensity: 0.82 },
    ambient: { color: 0x7aa2d8, intensity: 0.28 },
    directional: { color: 0xc7dcff, intensity: 0.95 },
    floor: { texture: "gaming", roughness: 0.58 },
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
  lighting: "night",
};
