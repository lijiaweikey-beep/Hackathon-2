import * as THREE from "three";
import { LOW_POLY_PLAYER_PALETTE } from "./palettes.js";
import { makeLowPolyMat, addFacetedBox } from "./lowPolyMesh.js";

export function createLowPolyPerson(palette = LOW_POLY_PLAYER_PALETTE, options = {}) {
  const group = new THREE.Group();
  const visual = new THREE.Group();
  group.add(visual);

  const isTempleStyle = options.temple === true;
  const skin = makeLowPolyMat(0xf0b88c);
  const jacket = makeLowPolyMat(palette.jacket);
  const jacketDark = makeLowPolyMat(palette.jacketDark);
  const shirt = makeLowPolyMat(0xf8fafc, 0.55);
  const shorts = makeLowPolyMat(palette.shorts);
  const shortsDark = makeLowPolyMat(palette.shortsDark);
  const boot = makeLowPolyMat(0x7c4a1e);
  const sock = makeLowPolyMat(palette.sock);
  const cap = makeLowPolyMat(palette.cap);
  const capAccent = makeLowPolyMat(palette.capAccent);
  const eye = makeLowPolyMat(0x111111, 0.4);
  const mouth = makeLowPolyMat(0x1a1a1a, 0.5);
  const blackEyeMat = new THREE.MeshBasicMaterial({
    color: 0x2a1450,
    transparent: true,
    opacity: 0,
    depthTest: false,
  });
  const lipMat = new THREE.MeshBasicMaterial({ color: 0xe11d48, transparent: true, opacity: 0 });
  const moonShadowMat = new THREE.MeshBasicMaterial({ color: 0x12352f, transparent: true, opacity: 0, depthWrite: false });

  if (isTempleStyle) {
    jacket.emissive = new THREE.Color(0xb8dcff);
    jacket.emissiveIntensity = 0;
    jacketDark.emissive = new THREE.Color(0xb8dcff);
    jacketDark.emissiveIntensity = 0;
  }

  addFacetedBox(visual, 0.54, 0.5, 0.48, skin, 0, 1.44, 0);
  addFacetedBox(visual, 0.58, 0.07, 0.34, cap, 0, 1.7, 0.1);
  addFacetedBox(visual, 0.5, 0.16, 0.46, cap, 0, 1.78, -0.03);
  addFacetedBox(visual, 0.5, 0.16, 0.1, capAccent, 0, 1.78, 0.24);
  if (isTempleStyle) {
    addFacetedBox(visual, 0.2, 0.18, 0.2, cap, 0, 1.96, -0.02);
    addFacetedBox(visual, 0.38, 0.05, 0.04, cap, 0, 1.86, 0.15);
  }
  addFacetedBox(visual, 0.11, 0.13, 0.05, eye, -0.13, 1.46, 0.26);
  addFacetedBox(visual, 0.11, 0.13, 0.05, eye, 0.13, 1.46, 0.26);
  addFacetedBox(visual, 0.2, 0.06, 0.04, mouth, 0, 1.3, 0.26);
  if (isTempleStyle) {
    addFacetedBox(visual, 0.25, 0.03, 0.04, cap, 0, 1.36, 0.285);
    addFacetedBox(visual, 0.1, 0.18, 0.04, cap, 0, 1.23, 0.285);
  }
  const blackLeft = addFacetedBox(visual, 0.17, 0.14, 0.04, blackEyeMat, -0.13, 1.4, 0.27);
  const blackRight = addFacetedBox(visual, 0.17, 0.14, 0.04, blackEyeMat.clone(), 0.13, 1.4, 0.27);
  const blackTopLeft = addFacetedBox(visual, 0.16, 0.05, 0.16, blackEyeMat.clone(), -0.13, 1.67, -0.02);
  const blackTopRight = addFacetedBox(visual, 0.16, 0.05, 0.16, blackEyeMat.clone(), 0.13, 1.67, -0.02);
  blackTopLeft.userData.isTopView = true;
  blackTopRight.userData.isTopView = true;
  const lipMark = addFacetedBox(visual, 0.16, 0.08, 0.03, lipMat, 0, 1.28, 0.27);
  addFacetedBox(visual, 0.56, 0.4, 0.22, jacketDark, 0, 1.52, -0.3, 0.18, 0, 0);

  const torso = addFacetedBox(visual, 0.46, 0.44, 0.34, jacket, 0, 1.04, 0);
  addFacetedBox(visual, 0.2, 0.3, 0.05, shirt, 0, 1.06, 0.18);
  addFacetedBox(visual, 0.13, 0.34, 0.12, jacketDark, -0.15, 1.06, 0.1, 0, 0.22, 0);
  addFacetedBox(visual, 0.13, 0.34, 0.12, jacketDark, 0.15, 1.06, 0.1, 0, -0.22, 0);
  const moonMarks = [];
  let moonGlow = null;
  let scroll = null;
  if (isTempleStyle) {
    [-0.14, 0.02, 0.16].forEach((x, i) => {
      const mark = addFacetedBox(visual, 0.055, 0.46, 0.025, moonShadowMat.clone(), x, 1.0 + i * 0.03, 0.205, 0, 0, -0.22 + i * 0.2);
      moonMarks.push(mark);
    });
    moonGlow = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.018, 8, 36),
      new THREE.MeshBasicMaterial({ color: 0xdbeafe, transparent: true, opacity: 0, depthWrite: false }),
    );
    moonGlow.rotation.x = Math.PI / 2;
    moonGlow.position.set(0, 0.96, 0);
    visual.add(moonGlow);
  }
  addFacetedBox(visual, 0.44, 0.24, 0.36, shorts, 0, 0.74, 0);
  addFacetedBox(visual, 0.46, 0.08, 0.38, shortsDark, 0, 0.62, 0);

  const leftArm = new THREE.Group();
  const rightArm = new THREE.Group();
  leftArm.position.set(-0.3, 1.1, 0);
  rightArm.position.set(0.3, 1.1, 0);
  addFacetedBox(leftArm, 0.13, 0.38, 0.13, jacket, 0, -0.2, 0);
  addFacetedBox(rightArm, 0.13, 0.38, 0.13, jacket, 0, -0.2, 0);
  addFacetedBox(leftArm, 0.11, 0.11, 0.11, skin, 0, -0.42, 0);
  addFacetedBox(rightArm, 0.11, 0.11, 0.11, skin, 0, -0.42, 0);
  if (isTempleStyle) {
    addFacetedBox(leftArm, 0.21, 0.28, 0.18, jacketDark, 0, -0.22, 0);
    addFacetedBox(rightArm, 0.21, 0.28, 0.18, jacketDark, 0, -0.22, 0);
    scroll = new THREE.Group();
    const paperMat = makeLowPolyMat(0xf7e9bc, 0.68);
    const inkMat = new THREE.MeshBasicMaterial({ color: 0x3b2f2f, transparent: true, opacity: 0.62 });
    const scrollRoll = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.46, 12), paperMat);
    scrollRoll.rotation.z = Math.PI / 2;
    scrollRoll.castShadow = true;
    scroll.add(scrollRoll);
    addFacetedBox(scroll, 0.3, 0.01, 0.012, inkMat, 0, 0.052, 0);
    scroll.position.set(0.5, 0.95, 0.26);
    scroll.rotation.set(0.18, 0.18, -0.38);
    scroll.visible = false;
    visual.add(scroll);
  }
  leftArm.rotation.z = 0.35;
  rightArm.rotation.z = -0.35;
  visual.add(leftArm, rightArm);

  const leftLeg = new THREE.Group();
  const rightLeg = new THREE.Group();
  leftLeg.position.set(-0.12, 0.6, 0);
  rightLeg.position.set(0.12, 0.6, 0);
  addFacetedBox(leftLeg, 0.15, 0.18, 0.15, shorts, 0, -0.09, 0);
  addFacetedBox(rightLeg, 0.15, 0.18, 0.15, shorts, 0, -0.09, 0);
  addFacetedBox(leftLeg, 0.14, 0.26, 0.14, skin, 0, -0.31, 0);
  addFacetedBox(rightLeg, 0.14, 0.26, 0.14, skin, 0, -0.31, 0);
  addFacetedBox(leftLeg, 0.15, 0.1, 0.15, sock, 0, -0.48, 0);
  addFacetedBox(rightLeg, 0.15, 0.1, 0.15, sock, 0, -0.48, 0);
  addFacetedBox(leftLeg, 0.17, 0.13, 0.22, boot, 0, -0.58, 0.04);
  addFacetedBox(rightLeg, 0.17, 0.13, 0.22, boot, 0, -0.58, 0.04);
  visual.add(leftLeg, rightLeg);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.48, 8),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  group.userData = {
    visual,
    body: torso,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    blackMarks: [blackLeft, blackRight, blackTopLeft, blackTopRight],
    lipMarks: [lipMark],
    moonMarks,
    moonGlow,
    scroll,
    robeMaterials: isTempleStyle ? [jacket, jacketDark] : [],
    baseArmRotations: {
      leftZ: leftArm.rotation.z,
      rightZ: rightArm.rotation.z,
    },
    colors: isTempleStyle
      ? [palette.jacket, palette.shorts, 0xf0b88c, palette.cap, palette.capAccent, 0xf7e9bc, 0x12352f]
      : [palette.jacket, palette.shorts, 0xf0b88c, palette.cap, palette.capAccent, 0xf8fafc],
  };

  return { group };
}
