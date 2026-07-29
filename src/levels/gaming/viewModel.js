function getMission(phase) {
  if (phase === "attack") return "击打发光目标";
  if (phase === "done") return "教学完成！";
  return "靠近发光目标";
}

export function createTutorialViewModel(state) {
  return {
    mission: getMission(state.phase),
    timerText: "∞",
    resourceLabel: "出拳",
    resourceText: "∞",
    clue: "",
    hideClue: true,
    attackIcon: "拳",
    theme: "tutorial",
    attackLocked: false,
    attackPulse: false,
    joystickGuide: false,
    resultResource: {
      label: "出拳",
      value: "∞",
      attemptsLeft: 3,
      rating: { grade: "S", rating: 1 },
    },
  };
}
