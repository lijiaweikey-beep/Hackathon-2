const NORMAL_PUNCH_COOLDOWN = 2;
const MISTAKE_LOCK_SECONDS = 2.5;
const MISTAKE_HINT_SECONDS = 1.5;
const MISTAKE_HINT = "打我鹅腿阿姨干嘛";
const GOOSE_VENDOR_COUNT = 10;

export function createGooseMarketLevel(context) {
  let vendors = [];
  let duckCount = 0;
  let remainingDucks = 0;
  let mistakeHintTimer = 0;

  function addVendor(id, isGoose) {
    const npc = context.actors.createNpc(id, {
      gooseVendor: isGoose,
      levelTarget: !isGoose,
    });
    npc.group.position.copy(context.movement.randomOpenPosition());
    context.actors.addNpc(npc);
    vendors.push(npc);
  }

  function start() {
    vendors = [];
    duckCount = Math.floor(context.random.range(3, 6));
    remainingDucks = duckCount;
    mistakeHintTimer = 0;
    for (let id = 0; id < GOOSE_VENDOR_COUNT; id += 1) {
      addVendor(id, true);
    }
    for (let id = GOOSE_VENDOR_COUNT; id < GOOSE_VENDOR_COUNT + duckCount; id += 1) {
      addVendor(id, false);
    }
    context.sceneData.placeSwitch(context.movement.randomOpenPosition());
  }

  function update(deltaSeconds) {
    mistakeHintTimer = Math.max(0, mistakeHintTimer - deltaSeconds);
    const environmentEvent = context.sceneData.updateEnvironment(
      deltaSeconds,
      context.actors.getPlayer?.()?.group.position,
    );
    if (environmentEvent?.refreshSwitch) {
      context.sceneData.placeSwitch(context.movement.randomOpenPosition());
    }
    vendors.forEach((vendor) => {
      if (!vendor.alive) return;
      const glow = context.sceneData.getLegGlow(
        vendor.group.position,
        vendor.isGoose,
      );
      vendor.setLegGlow?.(glow);
    });
  }

  function createViewModel() {
    return {
      resourceLabel: "剩余鸭腿",
      resourceText: String(remainingDucks),
      clue: mistakeHintTimer > 0
        ? MISTAKE_HINT
        : "🔍 探照灯下发绿的是鸭腿阿姨，打爆全部鸭腿才通关",
      resultResource: {
        label: "剩余鸭腿",
        value: `${remainingDucks} 个`,
        attemptsLeft: duckCount,
      },
    };
  }

  function handleDuckHit(npc) {
    if (!npc.alive) return { handled: true };
    context.actors.dissolve(npc);
    context.actors.compactDead();
    context.combat.triggerHitstop(0.08);
    context.combat.triggerShake(0.35, 0.2);
    context.audio.playSound("hit");
    remainingDucks = Math.max(0, remainingDucks - 1);
    context.ui.refreshHud();
    if (remainingDucks === 0) {
      context.combat.finishLevel(true, null, 760);
    }
    return { handled: true };
  }

  function handleGooseHit() {
    mistakeHintTimer = MISTAKE_HINT_SECONDS;
    context.combat.triggerShake(0.12, 0.1);
    context.audio.playSound("miss");
    context.ui.refreshHud();
    return { handled: true, cooldown: MISTAKE_LOCK_SECONDS };
  }

  function handleAction(action) {
    if (action.type === "beforeAttack") {
      return {
        blocked: false,
        cooldown: NORMAL_PUNCH_COOLDOWN,
        resetCombo: false,
      };
    }
    if (action.type === "hitTarget") {
      if (action.hit?.npc?.isDuckVendor) return handleDuckHit(action.hit.npc);
      if (action.hit?.npc?.isGoose) return handleGooseHit();
      return { handled: false };
    }
    if (action.type === "getHudState") return createViewModel();
    if (action.type === "getResultStats") return createViewModel().resultResource;
    return undefined;
  }

  return {
    start,
    update,
    handleAction,
    dispose() {
      vendors = [];
      duckCount = 0;
      remainingDucks = 0;
      mistakeHintTimer = 0;
    },
  };
}
