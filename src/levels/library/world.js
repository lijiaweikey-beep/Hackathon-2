export function createWorld(world) {
  const {
    THREE,
    scene,
    addWall,
    registerObstacle,
    textures,
  } = world;
  const wallMaterial = new THREE.MeshStandardMaterial({
    map: textures.getWallTexture("library"),
    color: 0xf0dfbf,
    roughness: 0.62,
  });
  addWall(0, -11.8, 0, wallMaterial);
  addWall(-12.2, 0, Math.PI / 2, wallMaterial);
  addWall(12.2, 0, -Math.PI / 2, wallMaterial);

  const shelfMaterial = new THREE.MeshStandardMaterial({ color: 0x785a3a, roughness: 0.7 });
  const tableMaterial = new THREE.MeshStandardMaterial({ color: 0x926c44, roughness: 0.68 });
  const chairMaterial = new THREE.MeshStandardMaterial({ color: 0x3f6f7d, roughness: 0.78 });
  const bookColors = [0xb91c1c, 0x1d4ed8, 0x047857, 0xf59e0b, 0x7c3aed];

  [-9.5, -6.2, -2.9, 2.9, 6.2, 9.5].forEach((x) => {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.45, 0.65), shelfMaterial);
    shelf.position.set(x, 0.74, -9.2);
    shelf.castShadow = true;
    shelf.receiveShadow = true;
    scene.add(shelf);
    for (let index = 0; index < 8; index += 1) {
      const book = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.44 + Math.random() * 0.22, 0.08),
        new THREE.MeshStandardMaterial({
          color: bookColors[index % bookColors.length],
          roughness: 0.82,
        }),
      );
      book.position.set(x - 0.84 + index * 0.24, 1.02, -8.82);
      scene.add(book);
    }
  });

  [-10.2, 10.2].forEach((x) => {
    [-5.8, -2.5, 0.8, 4.1, 7.4].forEach((z) => {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.74, 1.35, 2.2), shelfMaterial);
      shelf.position.set(x, 0.68, z);
      shelf.castShadow = true;
      shelf.receiveShadow = true;
      scene.add(shelf);
      registerObstacle(x, z, 0.37, 1.1);
    });
  });

  [-9.5, -6.2, -2.9, 2.9, 6.2, 9.5].forEach((x) => {
    registerObstacle(x, -9.2, 1.1, 0.33);
  });
  registerObstacle(-10.9, 0, 0.35, 10.6);
  registerObstacle(10.9, 0, 0.35, 10.6);
  registerObstacle(0, -10.9, 10.6, 0.35);

  [
    [-3.4, -1.4],
    [3.4, -1.4],
    [-3.4, 2.4],
    [3.4, 2.4],
  ].forEach(([x, z]) => {
    const table = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.35, 1.35), tableMaterial);
    table.position.set(x, 0.38, z);
    table.castShadow = true;
    table.receiveShadow = true;
    scene.add(table);
    registerObstacle(x, z, 1.35, 0.675);

    const lamp = new THREE.PointLight(0xffe0a8, 0.48, 5.2);
    lamp.position.set(x, 1.6, z);
    scene.add(lamp);

    [-1, 1].forEach((side) => {
      const chair = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.42, 0.58), chairMaterial);
      chair.position.set(x + side * 1.15, 0.26, z);
      chair.castShadow = true;
      chair.receiveShadow = true;
      scene.add(chair);
    });
  });
}
