import { createDebtSmasherExperience } from "./createExperience.js";

export default {
  id: "debt-smasher",
  order: 60,
  track: "mainline",
  age: 30,
  sceneName: "爆金币",
  emoji: "🪙",
  cardStyle: {
    accent: "#facc15",
    glow: "rgba(250, 204, 21, 0.28)",
  },
  cardDesc: "打晕并推入粉碎区，爆出一百金币还清债务",
  mission: "先打晕路人，再把他们推入粉碎机区域，凑齐一百金币。",
  clue: "红色区域即将粉碎；每名路人爆出二十金币",
  targetDesc: "房贷车贷",
  difficulty: 5,
  success: "一百金币落袋，房贷车贷一起被粉碎。半生至此，终于喘了口气。",
  failure: "债没压扁，你先被生活压扁了。",
  transition: {
    intro: "三十岁，房贷和车贷像两台粉碎机，等着把每一天压成账单。",
    success: "一百金币落袋。回头看去，那些狼狈的年份都亮成了人生坐标。",
  },
  extensions: {
    createExperience: createDebtSmasherExperience,
  },
};
