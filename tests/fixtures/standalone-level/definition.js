import { createStandaloneExperience } from "./createExperience.js";

export default {
  id: "standalone-sample",
  order: 1000,
  hidden: true,
  sceneName: "独立玩法样例",
  emoji: "🎯",
  cardDesc: "不使用经典角色、战斗和界面的点击玩法",
  cardStyle: {
    accent: "#f97316",
    glow: "rgba(249, 115, 22, 0.28)",
  },
  difficulty: 1,
  success: "独立玩法挑战完成。",
  failure: "独立玩法挑战失败。",
  extensions: {
    createExperience: createStandaloneExperience,
  },
};
