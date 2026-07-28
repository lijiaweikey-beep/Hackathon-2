const TARGET_HITS = 3;

export function createStandaloneExperience(host) {
  let active = false;
  let completed = false;
  let hits = 0;
  let elapsed = 0;

  function updateCounter() {
    const counter = host.surface.root.querySelector?.("[data-hit-count]");
    if (counter) counter.textContent = `${hits} / ${TARGET_HITS}`;
  }

  function strike() {
    if (!active || completed) return;
    hits += 1;
    updateCounter();
    if (hits < TARGET_HITS) return;
    active = false;
    completed = true;
    host.flow.finish({
      won: true,
      stats: {
        label: "命中次数",
        value: `${hits} 次`,
        attemptsLeft: TARGET_HITS,
      },
    });
  }

  return {
    presentation: "standalone",

    mount() {
      host.surface.setContent(`
        <main class="reaction-game">
          <h1>独立玩法样例</h1>
          <p>连续命中三次目标</p>
          <button type="button" data-start>开始挑战</button>
          <button type="button" data-strike>出击</button>
          <strong data-hit-count>0 / ${TARGET_HITS}</strong>
        </main>
      `);
      host.input.listen(host.surface.root, "click", (event) => {
        if (event.target?.closest?.("[data-start]")) {
          host.flow.start();
          return;
        }
        if (event.target?.closest?.("[data-strike]")) strike();
      });
      host.input.listen(host.input.windowTarget, "keydown", (event) => {
        if (event.code === "Space") strike();
      });
    },

    start() {
      active = true;
    },

    update(deltaSeconds) {
      if (active) elapsed += deltaSeconds;
    },

    pause() {
      active = false;
    },

    resume() {
      if (!completed) active = true;
    },

    handleInput(action) {
      if (action?.type === "primary") strike();
    },

    render() {},

    getResultStats() {
      return {
        label: "命中次数",
        value: `${hits} 次`,
        attemptsLeft: hits,
        elapsed,
      };
    },

    showResult({ won }) {
      host.surface.setContent(`
        <main class="reaction-game result">
          <h1>${won ? "挑战成功" : "挑战失败"}</h1>
          <button type="button" data-leave>返回选关</button>
        </main>
      `);
      host.input.listen(host.surface.root, "click", (event) => {
        if (event.target?.closest?.("[data-leave]")) host.flow.leave();
      });
    },

    dispose() {
      active = false;
      host.surface.clear();
    },
  };
}
