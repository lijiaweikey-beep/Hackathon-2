export function createWorld(world) {
  const {
    THREE,
    scene,
    addWall,
    registerObstacle,
  } = world;
  let elapsed = 0;
  const lightPositions = [
    new THREE.Vector3(-5, 0, -1),
    new THREE.Vector3(5, 0, 3),
  ];

  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x9f1d2d,
    roughness: 0.82,
  });
  addWall(0, -11.8, 0, wallMaterial);
  addWall(-12.2, 0, Math.PI / 2, wallMaterial);
  addWall(12.2, 0, -Math.PI / 2, wallMaterial);

  const stallMaterial = new THREE.MeshStandardMaterial({
    color: 0x6b3d24,
    roughness: 0.76,
  });
  const awningMaterial = new THREE.MeshStandardMaterial({
    color: 0xd9485f,
    roughness: 0.72,
  });
  [-8.5, -4.2, 0, 4.2, 8.5].forEach((x, index) => {
    const z = index % 2 === 0 ? -8.3 : 7.4;
    const stall = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 0.72, 1.25),
      stallMaterial,
    );
    stall.position.set(x, 0.38, z);
    stall.castShadow = true;
    scene.add(stall);
    const awning = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.14, 1.55),
      awningMaterial,
    );
    awning.position.set(x, 1.7, z);
    scene.add(awning);
    registerObstacle(x, z, 1.25, 0.64);
  });

  const poles = lightPositions.map((position, index) => {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.14, 5.6, 8),
      new THREE.MeshStandardMaterial({ color: 0x2f3745, roughness: 0.62 }),
    );
    pole.position.set(index === 0 ? -10.4 : 10.4, 2.8, index === 0 ? -4 : 4);
    scene.add(pole);
    const spot = new THREE.SpotLight(0xffd36b, 4.8, 18, Math.PI / 7, 0.48, 1);
    spot.position.copy(pole.position);
    spot.position.y = 5.2;
    spot.target.position.copy(position);
    scene.add(spot, spot.target);
    return { spot, baseX: position.x };
  });

  function updateEnvironment(deltaSeconds) {
    elapsed += deltaSeconds;
    lightPositions.forEach((position, index) => {
      position.x = poles[index].baseX + Math.sin(elapsed * 0.72 + index * 2.2) * 4;
      position.z = (index === 0 ? -1 : 3) + Math.cos(elapsed * 0.46 + index) * 2.4;
      poles[index].spot.target.position.copy(position);
    });
  }

  function getLegGlow(position, isGoose) {
    if (isGoose) return 0;
    return lightPositions.reduce((highest, light) => {
      const distance = Math.hypot(position.x - light.x, position.z - light.z);
      return Math.max(highest, Math.max(0, 1 - distance / 3.2));
    }, 0);
  }

  return { lightPositions, updateEnvironment, getLegGlow };
}
