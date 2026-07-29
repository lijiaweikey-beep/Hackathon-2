export function createWorld(world) {
  const {
    THREE,
    scene,
    baseLight,
    addWall = () => {},
    registerObstacle = () => {},
  } = world;
  let phase = "prepare";

  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x9ab3b4,
    roughness: 0.82,
  });
  const laneMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.74,
  });
  const curbMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.7,
  });

  if (baseLight) baseLight.intensity = Math.max(baseLight.intensity ?? 0.7, 0.78);

  addWall(0, -11.8, 0, curbMat);
  addWall(-12.2, 0, Math.PI / 2, curbMat);
  addWall(12.2, 0, -Math.PI / 2, curbMat);

  const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(21, 0.08, 14), floorMat);
  sidewalk.position.set(0, -0.02, 0);
  sidewalk.receiveShadow = true;
  scene.add(sidewalk);

  const blindLane = new THREE.Mesh(new THREE.BoxGeometry(15.8, 0.035, 0.7), laneMat);
  blindLane.position.set(0, 0.035, 0);
  blindLane.userData.role = "blind-lane";
  scene.add(blindLane);

  for (let x = -7; x <= 7; x += 0.7) {
    const dot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.03, 8),
      laneMat,
    );
    dot.rotation.x = Math.PI / 2;
    dot.position.set(x, 0.075, 0);
    scene.add(dot);
  }

  const scooter = new THREE.Group();
  scooter.userData.role = "parked-scooter";
  const scooterMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.58 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.68 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.24, 0.42), scooterMat);
  body.position.set(0, 0.36, 0);
  const wheelA = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.035, 8, 14), tireMat);
  const wheelB = wheelA.clone();
  wheelA.rotation.y = Math.PI / 2;
  wheelB.rotation.y = Math.PI / 2;
  wheelA.position.set(-0.36, 0.18, 0.25);
  wheelB.position.set(0.36, 0.18, 0.25);
  scooter.add(body, wheelA, wheelB);
  scooter.position.set(4.9, 0, -1.2);
  scooter.rotation.y = -0.2;
  scene.add(scooter);
  registerObstacle(4.9, -1.2, 0.72, 0.46);

  const tripod = new THREE.Group();
  tripod.userData.role = "tripod-camera";
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.62 });
  const camera = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.34, 0.34), darkMat);
  camera.position.set(0, 1.28, 0);
  const legA = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.2, 6), darkMat);
  const legB = legA.clone();
  const legC = legA.clone();
  legA.position.set(-0.22, 0.58, 0.1);
  legB.position.set(0.22, 0.58, 0.1);
  legC.position.set(0, 0.58, -0.22);
  legA.rotation.z = -0.22;
  legB.rotation.z = 0.22;
  legC.rotation.x = 0.24;
  tripod.add(camera, legA, legB, legC);
  tripod.position.set(0, 0, 3.2);
  scene.add(tripod);
  registerObstacle(0, 3.2, 0.42, 0.42);

  const recording = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 10, 10),
    new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.25,
    }),
  );
  recording.position.set(0.36, 1.42, 3.2);
  recording.userData.role = "recording-light";
  scene.add(recording);

  const stagePoints = {
    player: new THREE.Vector3(0, 0, 5.8),
    blindStart: new THREE.Vector3(-3.4, 0, 0),
    riderStart: new THREE.Vector3(3.4, 0, -0.72),
    collision: new THREE.Vector3(0, 0, -0.08),
    camera: new THREE.Vector3(0, 0, 2.75),
    directorSpots: [
      new THREE.Vector3(-2.7, 0, 3.25),
      new THREE.Vector3(0.9, 0, 3.6),
      new THREE.Vector3(2.8, 0, 2.7),
    ],
    crowdSpots: [
      new THREE.Vector3(-7.2, 0, 4.5),
      new THREE.Vector3(-6.2, 0, -3.8),
      new THREE.Vector3(-3.6, 0, 4.2),
      new THREE.Vector3(-1.2, 0, -4.4),
      new THREE.Vector3(2.3, 0, 4.6),
      new THREE.Vector3(5.6, 0, -3.9),
      new THREE.Vector3(7.2, 0, 4.1),
    ],
  };

  function setPerformancePhase(nextPhase) {
    phase = nextPhase;
    const active = phase === "cue" || phase === "perform" || phase === "reveal";
    recording.visible = active;
    recording.userData.recordingActive = active;
    recording.material.opacity = active ? 0.92 : 0.25;
  }

  setPerformancePhase("prepare");

  return {
    stagePoints,
    setPerformancePhase,
    getPerformancePhase: () => phase,
  };
}
