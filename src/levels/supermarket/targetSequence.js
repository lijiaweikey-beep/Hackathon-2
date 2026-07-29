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
  let approachPoints = [];
  let scatterPoints = [];

  function setApproachPoint(index) {
    const point = interactionPoints[index % interactionPoints.length];
    approachPoints = [
      point.clone().add({ x: -0.38, y: 0, z: 0 }),
      point.clone().add({ x: 0.38, y: 0, z: 0 }),
    ];
  }

  function startScatter() {
    state = "scatter";
    scatterPoints = [
      interactionPoints[(eventId + 1) % interactionPoints.length].clone(),
      interactionPoints[(eventId + 2) % interactionPoints.length].clone(),
    ];
  }

  setApproachPoint(0);

  return Object.freeze({
    update(deltaSeconds) {
      const [first, second] = members;
      if (state === "interaction") {
        first.walking = false;
        second.walking = false;
        faceToward(first, second.group.position);
        faceToward(second, first.group.position);
        timer -= deltaSeconds;
        if (timer <= 0) {
          const missedEventId = eventId;
          startScatter();
          return { missedEventId };
        }
        return null;
      }

      const destinations = state === "approach" ? approachPoints : scatterPoints;
      const firstDone = moveToward(first, destinations[0], 3.15, deltaSeconds);
      const secondDone = moveToward(second, destinations[1], 3.15, deltaSeconds);
      if (!firstDone || !secondDone) return null;

      if (state === "approach") {
        state = "interaction";
        eventId += 1;
        timer = randomRange(5.5, 7);
      } else {
        state = "approach";
        setApproachPoint(eventId);
      }
      return null;
    },
    resolveCapture() {
      if (state !== "interaction") return false;
      startScatter();
      return true;
    },
    snapshot: () => ({
      state,
      interacting: state === "interaction",
      eventId,
    }),
  });
}
