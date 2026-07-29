function getMission(phase) {
  if (phase === "attack") return "击打发光目标";
  if (phase === "done") return "教学完成！";
  return "走到绿色光圈处";
}

export function createTutorialViewModel(state) {
  return {
    mission: getMission(state.phase),
    timerText: "∞",
    resourceLabel: "出拳",
    resourceText: "∞",
    clue: "",
    hideClue: true,
    attackIcon: "打",
    theme: "tutorial",
    attackLocked: state.phase === "move",
    attackPulse: state.phase === "attack",
    joystickGuide: state.phase === "move",
    resultResource: {
      label: "出拳",
      value: "∞",
      attemptsLeft: 3,
      rating: { grade: "S", rating: 1 },
    },
  };
}
