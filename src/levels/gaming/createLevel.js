export function createGamingLevel(context) {
  let target = null;

  function start() {
    const computer = context.computers[2];
    target = context.createNpc(0, { gamingTarget: true });
    target.levelManaged = true;
    target.group.position.copy(computer);
    target.group.position.x += 0.2;
    target.script = {
      state: "play",
      timer: 2.6,
      playDuration: 2.6,
      computerIndex: 2,
      waypoint: null,
    };
    context.faceNpcToward(target, computer.clone().setZ(computer.z - 1.2));
    context.setBlackEye(target, 0.62);
    context.addNpc(target);

    for (let id = 1; id < context.npcCount; id += 1) {
      context.addWanderNpc(id);
    }
  }

  function update(deltaSeconds) {
    context.updateEnvironment(deltaSeconds);
    if (!target?.alive) return;

    const script = target.script;
    if (script.state === "play") {
      target.walking = false;
      script.timer -= deltaSeconds;
      const computer = context.computers[script.computerIndex];
      const facingPoint = computer.clone();
      facingPoint.z += computer.z > 0 ? -1.1 : 1.1;
      context.faceNpcToward(target, facingPoint);
      const progress = 1 - script.timer / (script.playDuration || script.timer || 1);
      context.setBlackEye(target, 0.62 + progress * 0.28);
      if (script.timer <= 0) {
        context.setBlackEye(target, 1);
        script.state = "leave";
        script.timer = context.randomRange(5, 7);
        script.waypoint = context.randomOpenPosition();
      }
      return;
    }

    if (script.state === "leave") {
      target.walking = true;
      const reached = context.moveNpcToward(
        target,
        script.waypoint,
        context.npcSpeed * 1.08,
        deltaSeconds,
      );
      script.timer -= deltaSeconds;
      if (reached || script.timer <= 0) {
        script.computerIndex = Math.floor(context.randomRange(0, context.computers.length));
        script.waypoint = context.computers[script.computerIndex].clone();
        script.state = "seek";
      }
      return;
    }

    if (script.state === "seek") {
      target.walking = true;
      const reached = context.moveNpcToward(
        target,
        script.waypoint,
        context.npcSpeed * 1.12,
        deltaSeconds,
      );
      if (reached) {
        script.state = "play";
        script.timer = context.randomRange(2.2, 3.4);
        script.playDuration = script.timer;
        context.setBlackEye(target, 0.62);
      }
    }
  }

  return {
    start,
    update,
    handleAction() {},
    dispose() {
      target = null;
    },
  };
}
