export function createSupermarketTargetSequence({
  members,
  interactionPoints,
  moveToward,
  faceToward,
  randomRange,
}) {
  let state = "approach";
  let eventId = 0;
  let timer = 0;
  let markerTimer = 3;
  let approachPoints = [];

  function setApproachPoint(index) {
    const point = interactionPoints[index % interactionPoints.length];
    approachPoints = [
      point.clone().add({ x: -0.45, y: 0, z: 0 }),
      point.clone().add({ x: 0.45, y: 0, z: 0 }),
    ];
  }

  function startNextApproach() {
    state = "approach";
    setApproachPoint(eventId);
  }

  function stabilizePair() {
    const [first, second] = members;
    const offset = second.group.position.clone().sub(first.group.position);
    offset.y = 0;
    const distance = offset.length();
    if (distance >= 0.8 && distance <= 1.5) return;

    if (distance === 0) offset.set(1, 0, 0);
    else offset.multiplyScalar(1 / distance);
    const targetDistance = Math.min(1.5, Math.max(0.8, distance));
    const midpoint = first.group.position.clone()
      .add(second.group.position)
      .multiplyScalar(0.5);
    const halfOffset = offset.multiplyScalar(targetDistance / 2);
    first.group.position.copy(midpoint).sub(halfOffset);
    second.group.position.copy(midpoint).add(halfOffset);
  }

  setApproachPoint(0);

  return Object.freeze({
    update(deltaSeconds) {
      const [first, second] = members;
      markerTimer = Math.max(0, markerTimer - deltaSeconds);
      if (state === "interaction") {
        first.walking = false;
        second.walking = false;
        faceToward(first, second.group.position);
        faceToward(second, first.group.position);
        timer -= deltaSeconds;
        if (timer <= 0) {
          const missedEventId = eventId;
          startNextApproach();
          return { missedEventId };
        }
        return null;
      }

      const firstDone = moveToward(first, approachPoints[0], 3.15, deltaSeconds);
      const secondDone = moveToward(second, approachPoints[1], 3.15, deltaSeconds);
      if (!firstDone || !secondDone) return null;

      state = "interaction";
      eventId += 1;
      timer = randomRange(5.5, 7);
      return null;
    },
    resolveCapture() {
      if (state !== "interaction") return false;
      startNextApproach();
      return true;
    },
    stabilizePair,
    snapshot: () => ({
      state,
      interacting: state === "interaction",
      eventId,
      introMarkerVisible: markerTimer > 0,
    }),
  });
}
