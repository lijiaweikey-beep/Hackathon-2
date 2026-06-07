import * as THREE from "three";
import { createTempleLocalShadow } from "./templeShadows.js";

export function createTemplePerson(shadowStyle = "fan", shadowSeed = 0) {
  const group = new THREE.Group();
  const visual = new THREE.Group();
  group.add(visual);

  const skinMat = new THREE.MeshStandardMaterial({ color: 0xf0b88c, roughness: 0.72 });
  const robeMat = new THREE.MeshStandardMaterial({ color: 0xc8d4dc, roughness: 0.76 });
  const robeDarkMat = new THREE.MeshStandardMaterial({ color: 0x8796a4, roughness: 0.82 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x57666f, roughness: 0.82 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.92 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.7 });
  const paperMat = new THREE.MeshStandardMaterial({ color: 0xf7e9bc, roughness: 0.68 });
  const inkMat = new THREE.MeshBasicMaterial({ color: 0x3b2f2f, transparent: true, opacity: 0.62 });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.62, 4, 12), robeMat);
  body.position.y = 0.86;
  body.castShadow = true;
  visual.add(body);

  const robeFront = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.035), robeDarkMat);
  robeFront.position.set(0, 0.74, 0.31);
  robeFront.castShadow = true;
  visual.add(robeFront);

  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.38), robeDarkMat);
  belt.position.set(0, 0.72, 0.03);
  belt.castShadow = true;
  visual.add(belt);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 18, 16), skinMat);
  head.position.y = 1.54;
  head.castShadow = true;
  visual.add(head);

  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 8), hairMat);
  hair.scale.set(1, 0.6, 1);
  hair.position.set(0, 1.68, -0.02);
  hair.castShadow = true;
  visual.add(hair);

  const topknot = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), hairMat);
  topknot.scale.set(0.85, 0.72, 0.85);
  topknot.position.set(0, 1.94, -0.02);
  topknot.castShadow = true;
  visual.add(topknot);

  const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.055, 0.04), hairMat);
  ribbon.position.set(0, 1.82, 0.1);
  ribbon.castShadow = true;
  visual.add(ribbon);

  const leftEye = new THREE.Mesh(new THREE.CircleGeometry(0.036, 16), eyeMat);
  leftEye.position.set(-0.115, 1.56, 0.314);
  const rightEye = new THREE.Mesh(new THREE.CircleGeometry(0.036, 16), eyeMat);
  rightEye.position.set(0.115, 1.56, 0.314);
  visual.add(leftEye, rightEye);

  const beardMat = new THREE.MeshBasicMaterial({ color: 0x221815, transparent: true, opacity: 0.92 });
  const mustache = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.026, 0.014), beardMat);
  mustache.position.set(0, 1.45, 0.337);
  visual.add(mustache);

  const beard = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 8), beardMat.clone());
  beard.position.set(0, 1.33, 0.335);
  beard.rotation.x = Math.PI;
  visual.add(beard);

  const leftArm = new THREE.Group();
  const rightArm = new THREE.Group();
  const armGeo = new THREE.CapsuleGeometry(0.07, 0.46, 3, 8);
  const armL = new THREE.Mesh(armGeo, skinMat);
  const armR = new THREE.Mesh(armGeo, skinMat);
  armL.position.y = -0.24;
  armR.position.y = -0.24;
  leftArm.add(armL);
  rightArm.add(armR);

  const sleeveGeo = new THREE.BoxGeometry(0.2, 0.34, 0.17);
  const sleeveL = new THREE.Mesh(sleeveGeo, robeDarkMat);
  const sleeveR = new THREE.Mesh(sleeveGeo, robeDarkMat);
  sleeveL.position.y = -0.22;
  sleeveR.position.y = -0.22;
  sleeveL.castShadow = true;
  sleeveR.castShadow = true;
  leftArm.add(sleeveL);
  rightArm.add(sleeveR);

  leftArm.position.set(-0.39, 1.06, 0.02);
  rightArm.position.set(0.39, 1.06, 0.02);
  leftArm.rotation.z = 0.38;
  rightArm.rotation.z = -0.38;
  visual.add(leftArm, rightArm);

  const scroll = new THREE.Group();
  const scrollRoll = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.46, 12), paperMat);
  scrollRoll.rotation.z = Math.PI / 2;
  scrollRoll.castShadow = true;
  scroll.add(scrollRoll);
  const inkLine = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.01, 0.012), inkMat);
  inkLine.position.set(0, 0.052, 0);
  scroll.add(inkLine);
  scroll.position.set(0.5, 0.95, 0.26);
  scroll.rotation.set(0.18, 0.18, -0.38);
  visual.add(scroll);

  const legGeo = new THREE.CapsuleGeometry(0.08, 0.42, 3, 8);
  const leftLeg = new THREE.Mesh(legGeo, pantsMat);
  const rightLeg = new THREE.Mesh(legGeo, pantsMat);
  leftLeg.position.set(-0.14, 0.27, 0);
  rightLeg.position.set(0.14, 0.27, 0);
  leftLeg.castShadow = true;
  rightLeg.castShadow = true;
  visual.add(leftLeg, rightLeg);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.48, 24),
    new THREE.MeshBasicMaterial({ color: 0x061814, transparent: true, opacity: 0, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  shadow.userData.baseOpacity = 0.16;
  group.add(shadow);

  const localBambooShadow = createTempleLocalShadow(shadowStyle, shadowSeed);
  group.add(localBambooShadow);

  visual.traverse((child) => {
    if (child.isMesh) child.castShadow = false;
  });

  group.userData = {
    visual,
    body,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    blackMarks: [],
    lipMarks: [],
    groundShadow: shadow,
    localBambooShadow,
    baseArmRotations: {
      leftZ: leftArm.rotation.z,
      rightZ: rightArm.rotation.z,
    },
    colors: [0xc8d4dc, 0x57666f, 0xf0b88c, 0x111827, 0xf7e9bc],
  };

  return { group };
}
