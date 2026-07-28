import { BLOODMOON_PHASE2_HP_MAX } from "../../config/constants.js";

const HUNT_CLUE = "🟢 机制：玩家和 NPC 已随机散开，NPC 暂停攻击。绿区外会被血月秒杀。";

const HUNT_MECHANIC_HTML = `
        <div class="mechanic-hint-row"><span class="mechanic-hint-label">台词</span><span class="mechanic-hint-text">认不出自己的人，都会留在月光外。</span></div>
        <div class="mechanic-hint-row"><span class="mechanic-hint-label">机制</span><span class="mechanic-hint-text">找到自己，进入任意绿色区域。</span></div>
        <div class="mechanic-hint-row"><span class="mechanic-hint-label">处决</span><span class="mechanic-hint-text">倒计时结束时，绿区外全部秒杀。</span></div>
      `;

function getMission(state) {
  if (state.mode === "huntIntro") return "血月引路人正在发动猎杀时刻...";
  if (state.mode === "huntBriefing") {
    return "阅读猎杀时刻机制，点击卡片按钮后开始倒计时。";
  }
  if (state.mode === "hunt") {
    return `猎杀时刻：${Math.ceil(state.huntTimer)} 秒内找到自己，进入任意绿色区域`;
  }
  if (state.mode === "phase2") {
    return `二阶段：首领剩余 ${state.bossHp}/${BLOODMOON_PHASE2_HP_MAX} 格血`;
  }
  return "为了你，我变成狼人模样。找出血月引路人。";
}

export function createBloodmoonViewModel(state) {
  const mechanicVisible = state.mode === "hunt" || state.mode === "huntBriefing";
  const sanity = Math.ceil(state.sanity);

  return {
    mission: getMission(state),
    timerText: "∞",
    resourceLabel: "理智",
    resourceText: String(sanity),
    clue: mechanicVisible
      ? HUNT_CLUE
      : "🔍 电光照亮时，真正的血月引路人脚下会露出狼爪影。",
    mechanicVisible,
    mechanicHtml: mechanicVisible ? HUNT_MECHANIC_HTML : "",
    attackIcon: "爪",
    theme: "bloodmoon",
    resultResource: {
      label: "理智",
      value: `${sanity} 点`,
      attemptsLeft: sanity,
    },
  };
}
