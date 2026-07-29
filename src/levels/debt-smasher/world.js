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

function createPressShape(THREE, debtKind) {
  const group = new THREE.Group();
  if (debtKind === "car-loan") {
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x6f86a8, roughness: 0.62 });
    const windowMat = new THREE.MeshStandardMaterial({ color: 0x8ee7ff, emissive: 0x1d8cff, emissiveIntensity: 0.8, roughness: 0.28 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x070b10, roughness: 0.58 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.48, 1.12), bodyMat);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.46, 0.92), bodyMat);
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.26, 0.06), windowMat);
    const wheelA = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.16, 10), wheelMat);
    const wheelB = wheelA.clone();
    cab.position.y = 0.42;
    windshield.position.set(0.12, 0.48, 0.5);
    wheelA.rotation.z = Math.PI / 2;
    wheelB.rotation.z = Math.PI / 2;
    wheelA.position.set(-0.72, -0.34, 0.48);
    wheelB.position.set(0.72, -0.34, 0.48);
    group.add(body, cab, windshield, wheelA, wheelB);
  } else {
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x506684, roughness: 0.7 });
    const litMat = new THREE.MeshStandardMaterial({ color: 0x8ee7ff, emissive: 0x1d8cff, emissiveIntensity: 0.65, roughness: 0.3 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x1b2435, roughness: 0.78 });
    const tower = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.25, 1.55), wallMat);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.22, 0.56, 4), roofMat);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 0.9;
    [-0.42, 0.42].forEach((x) => {
      const window = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.06), litMat);
      window.position.set(x, 0.3, 0.8);
      group.add(window);
    });
    group.add(tower, roof);
  }
  group.traverse((child) => {
    child.castShadow = true;
    child.receiveShadow = true;
  });
  return group;
}

function createMachine(THREE, scene, x, z, index, debtKind, registerObstacle) {
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(1.68, 1.68, 0.08, 28),
    new THREE.MeshStandardMaterial({ color: 0x334155, emissive: 0x000000, roughness: 0.64 }),
  );
  pad.position.set(x, 0.055, z);
  scene.add(pad);

  const press = createPressShape(THREE, debtKind);
  press.position.set(x, 4.45, z);
  scene.add(press);

  const postX = x < 0 ? x - 2.1 : x + 2.1;
  addBox(THREE, scene, [0.32, 5.3, 0.32], 0x111827, [postX, 2.65, z]);
  addBox(THREE, scene, [2.25, 0.28, 0.28], 0x111827, [(postX + x) / 2, 5.25, z]);
  registerObstacle?.(postX, z, 0.28, 0.28);
  return { x, z, radius: 1.68, debtKind, pad, press, phase: "idle", timer: 1.25 + index * 0.7 };
}

export function createWorld(world) {
  const { THREE, scene, addWall, registerObstacle } = world;
  const wallTex = world.textures.getWallTexture("gaming");
  const wallMaterial = new THREE.MeshStandardMaterial({
    map: wallTex,
    color: 0x3f5472,
    roughness: 0.72,
  });
  addWall(0, -11.8, 0, wallMaterial);
  addWall(-12.2, 0, Math.PI / 2, wallMaterial);
  addWall(12.2, 0, -Math.PI / 2, wallMaterial);

  const beltMat = new THREE.MeshStandardMaterial({ color: 0x34445c, roughness: 0.82 });
  const paperMat = new THREE.MeshStandardMaterial({ color: 0xfffbeb, roughness: 0.86 });
  [-6, 0, 6].forEach((x) => {
    addBox(THREE, scene, [2.2, 0.05, 15.5], 0x314158, [x, 0.04, 0]);
  });
  [-8.5, -4.2, 0, 4.2, 8.5].forEach((x, index) => {
    const bill = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.035, 0.48), index % 2 ? paperMat : beltMat);
    bill.position.set(x, 0.1, -6.9);
    scene.add(bill);
  });

  const machines = [
    [-7.5, -3.8, "car-loan"],
    [7.5, -3.8, "mortgage"],
    [-7.5, 3.8, "mortgage"],
    [7.5, 3.8, "car-loan"],
  ].map(([x, z, debtKind], index) =>
    createMachine(THREE, scene, x, z, index, debtKind, registerObstacle));

  function updateEnvironment(deltaSeconds) {
    machines.forEach((machine) => {
      if (machine.phase === "warning") {
        machine.pad.material.color.set(0xef4444);
        machine.pad.material.emissive.set(0x5b0b0b);
      } else {
        machine.pad.material.color.set(0x334155);
        machine.pad.material.emissive.set(0x000000);
      }
      if (machine.phase === "smash") machine.press.position.y = 0.62;
      else machine.press.position.y += (4.45 - machine.press.position.y) * Math.min(1, deltaSeconds * 9);
    });
  }

  return { machines, updateEnvironment };
}
