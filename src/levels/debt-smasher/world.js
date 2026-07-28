function addBox(THREE, scene, size, color, position) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(...size),
    new THREE.MeshStandardMaterial({ color, roughness: 0.72 }),
  );
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

function createPerson(THREE, scene, color, x, z) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.3, 0.72, 3, 7),
    new THREE.MeshStandardMaterial({ color, roughness: 0.72 }),
  );
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0xf0b88c, roughness: 0.8 }),
  );
  body.position.y = 0.72;
  head.position.y = 1.46;
  group.add(body, head);
  group.position.set(x, 0, z);
  scene.add(group);
  return group;
}

function createMachine(THREE, scene, x, z, index) {
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(1.65, 1.65, 0.12, 28),
    new THREE.MeshStandardMaterial({ color: 0x374151, emissive: 0x000000 }),
  );
  pad.position.set(x, 0.08, z);
  const press = addBox(THREE, scene, [3.1, 0.72, 3.1], 0x64748b, [x, 4.6, z]);
  const postX = x < 0 ? x - 2.1 : x + 2.1;
  addBox(THREE, scene, [0.38, 5.5, 0.38], 0x1f2937, [postX, 2.75, z]);
  addBox(THREE, scene, [2.3, 0.35, 0.35], 0x1f2937, [(postX + x) / 2, 5.4, z]);
  scene.add(pad);
  return { x, z, radius: 1.65, pad, press, phase: "idle", timer: 1.4 + index * 0.65 };
}

export function createDebtWorld(host) {
  const THREE = host.rendering.THREE;
  const scene = host.rendering.createScene();
  scene.background = new THREE.Color(0x151922);
  const camera = host.rendering.createCamera({
    left: -12,
    right: 12,
    top: 7.5,
    bottom: -7.5,
    position: [0, 20, 14],
    lookAt: [0, 0, 0],
  });
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 16),
    new THREE.MeshStandardMaterial({ color: 0x262d38, roughness: 0.94 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor, new THREE.HemisphereLight(0xfff7d6, 0x111827, 1.8));
  const light = new THREE.DirectionalLight(0xffe7a1, 2.2);
  light.position.set(-5, 13, 8);
  scene.add(light);

  const machines = [
    [-7.5, -3.8], [7.5, -3.8], [-7.5, 3.8], [7.5, 3.8],
  ].map(([x, z], index) => createMachine(THREE, scene, x, z, index));
  const player = createPerson(THREE, scene, 0xf59e0b, 0, 0);
  const positions = [
    [-4.6, -3.8], [4.6, -3.8], [-4.6, 3.8], [4.6, 3.8],
    [-7.5, -0.9], [7.5, -0.9], [-7.5, 0.9], [7.5, 0.9],
    [-2.5, -1.8], [2.5, 1.8],
  ];
  const npcs = positions.map(([x, z], index) => {
    const group = createPerson(THREE, scene, 0x4f73a6 + index * 1900, x, z);
    return { x, z, group, stunRemaining: 0, flattened: false };
  });
  return { scene, camera, player, npcs, machines };
}
