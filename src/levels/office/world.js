export function createWorld(world) {
  const {
    THREE,
    scene,
    addWall,
    registerObstacle,
  } = world;

  // ---- 材质 ----
  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x2a3545, roughness: 0.78 });
  const deskMat = new THREE.MeshStandardMaterial({ color: 0x4a5568, roughness: 0.7 });
  const screenMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.2, metalness: 0.6 });
  const screenGlow = new THREE.MeshBasicMaterial({ color: 0x99ccff, transparent: true, opacity: 0.55 });
  const keyboardMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.35, metalness: 0.2 });
  const mugMat = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.5 });
  const paperMat = new THREE.MeshStandardMaterial({ color: 0xf1ede4, roughness: 0.9 });
  const plantMat = new THREE.MeshStandardMaterial({ color: 0x2d8b4e, roughness: 0.75 });
  const potMat = new THREE.MeshStandardMaterial({ color: 0xd4a574, roughness: 0.65 });
  const dispenserMat = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.4, metalness: 0.3 });
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x60a5fa, roughness: 0.3, transparent: true, opacity: 0.7 });
  const shelfMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.7 });
  const shelfBoardMat = new THREE.MeshStandardMaterial({ color: 0x6b4c3b, roughness: 0.65 });
  const cabinetMat = new THREE.MeshStandardMaterial({ color: 0x3d4855, roughness: 0.6, metalness: 0.15 });
  const cabinetDoorMat = new THREE.MeshStandardMaterial({ color: 0x4b5a6a, roughness: 0.55, metalness: 0.2 });
  const bookMats = [
    new THREE.MeshStandardMaterial({ color: 0x1e40af, roughness: 0.75 }),
    new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.75 }),
    new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.75 }),
    new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.75 }),
    new THREE.MeshStandardMaterial({ color: 0x5b21b6, roughness: 0.75 }),
    new THREE.MeshStandardMaterial({ color: 0x0e7490, roughness: 0.75 }),
    new THREE.MeshStandardMaterial({ color: 0x9f1239, roughness: 0.75 }),
  ];
  const sofaMat = new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.85 });
  const sofaLegMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4, metalness: 0.5 });
  const tableMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.5, metalness: 0.2 });

  // ---- 隐藏墙壁（碰撞用，视觉由书架/柜子覆盖） ----
  addWall(0, -11.8, 0, wallMaterial);
  addWall(0, 11.8, Math.PI, wallMaterial);
  addWall(-12.2, 0, Math.PI / 2, wallMaterial);
  addWall(12.2, 0, -Math.PI / 2, wallMaterial);

  // ==== 边界装饰：用书架和柜子铺满四面墙 ====

  // 辅助函数：创建一个书架（朝向玩家，能看到书）
  function addBookshelf(x, z, rotY) {
    const group = new THREE.Group();
    // 书架背板
    const back = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 2.2, 0.1),
      shelfMat,
    );
    back.position.set(0, 1.1, -0.25);
    group.add(back);
    // 侧板
    [-1.05, 1.05].forEach((sx) => {
      const side = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 2.2, 0.5),
        shelfMat,
      );
      side.position.set(sx, 1.1, 0);
      group.add(side);
    });
    // 隔板（4层）
    for (let layer = 0; layer < 4; layer += 1) {
      const board = new THREE.Mesh(
        new THREE.BoxGeometry(2.02, 0.05, 0.48),
        shelfBoardMat,
      );
      board.position.set(0, 0.02 + layer * 0.55, 0);
      group.add(board);
    }
    // 顶板
    const topBoard = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.06, 0.5),
      shelfMat,
    );
    topBoard.position.set(0, 2.2, 0);
    group.add(topBoard);

    // 每层放书（大小/颜色随机变化）
    for (let layer = 0; layer < 3; layer += 1) {
      const baseY = 0.07 + layer * 0.55;
      let bx = -0.88;
      let bookIdx = layer * 5;
      while (bx < 0.85) {
        const bWidth = 0.08 + (bookIdx % 3) * 0.03;
        const bHeight = 0.32 + (bookIdx % 4) * 0.05;
        const book = new THREE.Mesh(
          new THREE.BoxGeometry(bWidth, bHeight, 0.3),
          bookMats[bookIdx % bookMats.length],
        );
        book.position.set(bx, baseY + bHeight / 2, 0.02);
        group.add(book);
        bx += bWidth + 0.04;
        bookIdx += 1;
      }
    }

    group.position.set(x, 0, z);
    group.rotation.y = rotY;
    group.traverse((child) => { if (child.isMesh) child.castShadow = true; });
    scene.add(group);
  }

  // 辅助函数：创建一个柜子
  function addCabinet(x, z, rotY) {
    const group = new THREE.Group();
    // 柜体
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 1.8, 0.5),
      cabinetMat,
    );
    body.position.set(0, 0.9, 0);
    group.add(body);
    // 双门
    [-0.35, 0.35].forEach((dx) => {
      const door = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 1.6, 0.04),
        cabinetDoorMat,
      );
      door.position.set(dx, 0.9, 0.26);
      group.add(door);
      // 门把手
      const handle = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.18, 0.04),
        sofaLegMat,
      );
      handle.position.set(dx + (dx > 0 ? -0.22 : 0.22), 0.9, 0.3);
      group.add(handle);
    });

    group.position.set(x, 0, z);
    group.rotation.y = rotY;
    group.traverse((child) => { if (child.isMesh) child.castShadow = true; });
    scene.add(group);
  }

  // 左墙（x = -11.5）：书架为主
  addBookshelf(-11.5, -8, Math.PI / 2);
  addBookshelf(-11.5, -5.3, Math.PI / 2);
  addBookshelf(-11.5, -2.6, Math.PI / 2);
  addBookshelf(-11.5, 0.1, Math.PI / 2);
  addBookshelf(-11.5, 2.8, Math.PI / 2);
  addBookshelf(-11.5, 5.5, Math.PI / 2);
  addCabinet(-11.5, 8.2, Math.PI / 2);
  addCabinet(-11.5, 10, Math.PI / 2);

  // 右墙（x = 11.5）：柜子为主，穿插书架
  addCabinet(11.5, -9, -Math.PI / 2);
  addCabinet(11.5, -7, -Math.PI / 2);
  addBookshelf(11.5, -4.5, -Math.PI / 2);
  addCabinet(11.5, -2, -Math.PI / 2);
  addCabinet(11.5, 0, -Math.PI / 2);
  addBookshelf(11.5, 2.5, -Math.PI / 2);
  addCabinet(11.5, 5, -Math.PI / 2);
  addCabinet(11.5, 7.5, -Math.PI / 2);
  addBookshelf(11.5, 10, -Math.PI / 2);

  // 后墙（z = -11）：书架+柜子交替
  addBookshelf(-8, -11, Math.PI);
  addCabinet(-5, -11, Math.PI);
  addBookshelf(-2.2, -11, Math.PI);
  addCabinet(0.8, -11, Math.PI);
  addBookshelf(3.5, -11, Math.PI);
  addCabinet(6.2, -11, Math.PI);
  addBookshelf(9, -11, Math.PI);

  // 前墙（z = 11）：柜子为主
  addCabinet(-8.5, 11, 0);
  addCabinet(-6, 11, 0);
  addBookshelf(-3.2, 11, 0);
  addCabinet(-0.5, 11, 0);
  addCabinet(2, 11, 0);
  addBookshelf(4.5, 11, 0);
  addCabinet(7, 11, 0);
  addCabinet(9.5, 11, 0);

  // ---- 办公桌阵列（一排三个，两排） ----
  const deskPositions = [
    [-6.5, -3.5], [0, -3.5], [6.5, -3.5],
    [-6.5, 2], [0, 2], [6.5, 2],
  ];

  deskPositions.forEach(([x, z], index) => {
    const desk = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.7, 1.25),
      deskMat,
    );
    desk.position.set(x, 0.38, z);
    desk.castShadow = true;
    desk.receiveShadow = true;
    scene.add(desk);
    registerObstacle(x, z, 1.6, 0.63);

    // 显示器
    const monX = x + (index % 2 === 0 ? -0.4 : 0.4);
    const monitor = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.45, 0.04),
      screenMat,
    );
    monitor.position.set(monX, 1.0, z - 0.3);
    monitor.castShadow = true;
    scene.add(monitor);

    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.52, 0.36),
      screenGlow,
    );
    screen.position.set(monX, 1.0, z - 0.275);
    scene.add(screen);

    const stand = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.26, 0.08),
      screenMat,
    );
    stand.position.set(monX, 0.78, z - 0.3);
    scene.add(stand);

    const keyboard = new THREE.Mesh(
      new THREE.BoxGeometry(0.44, 0.03, 0.16),
      keyboardMat,
    );
    keyboard.position.set(monX, 0.74, z + 0.15);
    scene.add(keyboard);

    // 桌面物品
    if (index % 3 === 0) {
      const mug = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.055, 0.14, 8),
        mugMat,
      );
      mug.position.set(x + 0.9, 0.8, z + 0.2);
      mug.castShadow = true;
      scene.add(mug);
    } else if (index % 3 === 1) {
      const papers = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.06, 0.3),
        paperMat,
      );
      papers.position.set(x + 0.85, 0.75, z + 0.1);
      papers.rotation.y = 0.12;
      scene.add(papers);
    } else {
      const pot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.05, 0.09, 8),
        potMat,
      );
      pot.position.set(x - 1.0, 0.78, z + 0.3);
      scene.add(pot);
      const plant = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 6, 5),
        plantMat,
      );
      plant.position.set(x - 1.0, 0.89, z + 0.3);
      plant.castShadow = true;
      scene.add(plant);
    }
  });

  // ---- 沙发休息区（场景中间偏右后方） ----
  const sofaSeat = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.4, 0.9),
    sofaMat,
  );
  sofaSeat.position.set(8, 0.3, 7);
  sofaSeat.castShadow = true;
  scene.add(sofaSeat);
  const sofaBack = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.6, 0.2),
    sofaMat,
  );
  sofaBack.position.set(8, 0.7, 7.5);
  scene.add(sofaBack);
  [-1.1, 1.1].forEach((ax) => {
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.5, 0.9),
      sofaMat,
    );
    arm.position.set(8 + ax, 0.45, 7);
    scene.add(arm);
  });
  registerObstacle(8, 7, 1.3, 0.6);

  // 茶几
  const coffeeTable = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 0.06, 0.5),
    tableMat,
  );
  coffeeTable.position.set(8, 0.38, 5.8);
  coffeeTable.castShadow = true;
  scene.add(coffeeTable);
  registerObstacle(8, 5.8, 0.5, 0.25);

  // ---- 饮水机 ----
  const dispenser = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 1.1, 0.35),
    dispenserMat,
  );
  dispenser.position.set(9, 0.55, -7.5);
  dispenser.castShadow = true;
  scene.add(dispenser);
  registerObstacle(9, -7.5, 0.4, 0.35);
  const tank = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.32, 8),
    waterMat,
  );
  tank.position.set(9, 1.28, -7.5);
  scene.add(tank);

  // ---- 绿植点缀 ----
  [[- 8, 8.5], [7, -8.5], [-8, -8.5]].forEach(([px, pz]) => {
    const bigPot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.18, 0.35, 8),
      potMat,
    );
    bigPot.position.set(px, 0.18, pz);
    bigPot.castShadow = true;
    scene.add(bigPot);
    const bigPlant = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 8, 6),
      plantMat,
    );
    bigPlant.position.set(px, 0.6, pz);
    bigPlant.castShadow = true;
    scene.add(bigPlant);
  });

  return { deskPositions, scene, THREE };
}
