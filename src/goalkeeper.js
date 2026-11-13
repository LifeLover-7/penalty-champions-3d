// src/goalkeeper.js - Articulated Chibi/Low-Poly Goalkeeper (Bright & Visible)

import * as THREE from 'three';

export function createGoalkeeper(isPlayer = false) {
  const keeper = new THREE.Group();
  keeper.userData.isPlayer = isPlayer;

  // Bright colors for visibility
  const skinColor = 0xf5c6a0; // warm skin tone
  const shirtColor = isPlayer ? 0x00e5ff : 0xffd600; // cyan or bright yellow
  const shortsColor = isPlayer ? 0x006064 : 0x5d4037;
  const gloveColor = 0xffffff; // bright white oversized gloves

  // Scale up to ~1.9 units tall (realistic keeper in 2.44m goal)
  const scale = 1.3;

  // === TORSO ===
  const torsoGeo = new THREE.BoxGeometry(0.7 * scale, 0.85 * scale, 0.4 * scale);
  const torsoMat = new THREE.MeshStandardMaterial({
    color: shirtColor,
    roughness: 0.4,
    metalness: 0.1,
    emissive: shirtColor,
    emissiveIntensity: 0.15
  });
  const torso = new THREE.Mesh(torsoGeo, torsoMat);
  torso.position.y = 1.15 * scale;
  torso.castShadow = true;
  keeper.add(torso);
  keeper.userData.torso = torso;

  // === HEAD ===
  const headGroup = new THREE.Group();
  headGroup.position.y = 1.75 * scale;

  const headGeo = new THREE.SphereGeometry(0.22 * scale, 16, 16);
  const headMat = new THREE.MeshStandardMaterial({
    color: skinColor,
    roughness: 0.7
  });
  const head = new THREE.Mesh(headGeo, headMat);
  head.castShadow = true;
  headGroup.add(head);

  // Eyes (white with black pupils)
  const eyeWhiteGeo = new THREE.SphereGeometry(0.05 * scale, 8, 8);
  const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const leftEyeWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
  leftEyeWhite.position.set(-0.08 * scale, 0.03 * scale, 0.18 * scale);
  headGroup.add(leftEyeWhite);
  const rightEyeWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
  rightEyeWhite.position.set(0.08 * scale, 0.03 * scale, 0.18 * scale);
  headGroup.add(rightEyeWhite);

  const pupilGeo = new THREE.SphereGeometry(0.025 * scale, 8, 8);
  const pupilMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
  const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
  leftPupil.position.set(-0.08 * scale, 0.03 * scale, 0.22 * scale);
  headGroup.add(leftPupil);
  const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
  rightPupil.position.set(0.08 * scale, 0.03 * scale, 0.22 * scale);
  headGroup.add(rightPupil);

  // Cap (bright colored)
  const capGeo = new THREE.CylinderGeometry(0.24 * scale, 0.24 * scale, 0.1 * scale, 16);
  const capMat = new THREE.MeshStandardMaterial({
    color: shirtColor,
    roughness: 0.4,
    emissive: shirtColor,
    emissiveIntensity: 0.1
  });
  const cap = new THREE.Mesh(capGeo, capMat);
  cap.position.y = 0.18 * scale;
  headGroup.add(cap);

  const brimGeo = new THREE.CylinderGeometry(0.28 * scale, 0.28 * scale, 0.03 * scale, 16);
  const brim = new THREE.Mesh(brimGeo, capMat);
  brim.position.set(0, 0.13 * scale, 0.08 * scale);
  brim.rotation.x = -0.3;
  headGroup.add(brim);

  keeper.add(headGroup);
  keeper.userData.head = headGroup;

  // === ARMS (with oversized white gloves) ===
  const armGeo = new THREE.CylinderGeometry(0.07 * scale, 0.06 * scale, 0.5 * scale, 8);
  const armMat = new THREE.MeshStandardMaterial({
    color: shirtColor,
    roughness: 0.4,
    emissive: shirtColor,
    emissiveIntensity: 0.1
  });

  // Left arm group
  const leftArmGroup = new THREE.Group();
  leftArmGroup.position.set(-0.42 * scale, 1.25 * scale, 0);

  const leftArm = new THREE.Mesh(armGeo, armMat);
  leftArm.position.y = -0.18 * scale;
  leftArm.castShadow = true;
  leftArmGroup.add(leftArm);

  // Oversized white glove
  const gloveGeo = new THREE.SphereGeometry(0.14 * scale, 12, 12);
  const gloveMat = new THREE.MeshStandardMaterial({
    color: gloveColor,
    roughness: 0.3,
    emissive: 0xffffff,
    emissiveIntensity: 0.1
  });
  const leftGlove = new THREE.Mesh(gloveGeo, gloveMat);
  leftGlove.position.y = -0.42 * scale;
  leftGlove.castShadow = true;
  leftArmGroup.add(leftGlove);

  keeper.add(leftArmGroup);
  keeper.userData.leftArm = leftArmGroup;

  // Right arm group
  const rightArmGroup = new THREE.Group();
  rightArmGroup.position.set(0.42 * scale, 1.25 * scale, 0);

  const rightArm = new THREE.Mesh(armGeo, armMat);
  rightArm.position.y = -0.18 * scale;
  rightArm.castShadow = true;
  rightArmGroup.add(rightArm);

  const rightGlove = new THREE.Mesh(gloveGeo, gloveMat);
  rightGlove.position.y = -0.42 * scale;
  rightGlove.castShadow = true;
  rightArmGroup.add(rightGlove);

  keeper.add(rightArmGroup);
  keeper.userData.rightArm = rightArmGroup;

  // === LEGS ===
  const legGeo = new THREE.CylinderGeometry(0.08 * scale, 0.07 * scale, 0.55 * scale, 8);
  const legMat = new THREE.MeshStandardMaterial({
    color: shortsColor,
    roughness: 0.7
  });

  // Left leg
  const leftLegGroup = new THREE.Group();
  leftLegGroup.position.set(-0.18 * scale, 0.55 * scale, 0);

  const leftLeg = new THREE.Mesh(legGeo, legMat);
  leftLeg.position.y = -0.18 * scale;
  leftLeg.castShadow = true;
  leftLegGroup.add(leftLeg);

  // Boot
  const bootGeo = new THREE.BoxGeometry(0.12 * scale, 0.08 * scale, 0.22 * scale);
  const bootMat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.4,
    metalness: 0.3
  });
  const leftBoot = new THREE.Mesh(bootGeo, bootMat);
  leftBoot.position.set(0, -0.44 * scale, 0.04 * scale);
  leftLegGroup.add(leftBoot);

  keeper.add(leftLegGroup);
  keeper.userData.leftLeg = leftLegGroup;

  // Right leg
  const rightLegGroup = new THREE.Group();
  rightLegGroup.position.set(0.18 * scale, 0.55 * scale, 0);

  const rightLeg = new THREE.Mesh(legGeo, legMat);
  rightLeg.position.y = -0.18 * scale;
  rightLeg.castShadow = true;
  rightLegGroup.add(rightLeg);

  const rightBoot = new THREE.Mesh(bootGeo, bootMat);
  rightBoot.position.set(0, -0.44 * scale, 0.04 * scale);
  rightLegGroup.add(rightBoot);

  keeper.add(rightLegGroup);
  keeper.userData.rightLeg = rightLegGroup;

  // Position in front of goal
  keeper.position.set(0, 0, 0.5);

  // Animation state
  keeper.userData.animState = 'idle';
  keeper.userData.animTime = 0;
  keeper.userData.diveDirection = 0;
  keeper.userData.diveHeight = 0;

  return keeper;
}

// Animate goalkeeper
export function updateGoalkeeper(keeper, dt, state = 'idle') {
  const ud = keeper.userData;
  ud.animTime += dt;
  ud.animState = state;

  const t = ud.animTime;

  if (state === 'idle') {
    // Bouncy idle animation
    const bounce = Math.sin(t * 4) * 0.04;
    keeper.position.y = bounce;

    // Slight arm sway
    ud.leftArm.rotation.z = Math.sin(t * 3) * 0.15 + 0.3;
    ud.rightArm.rotation.z = -Math.sin(t * 3) * 0.15 - 0.3;
    ud.leftArm.rotation.x = 0;
    ud.rightArm.rotation.x = 0;

    // Legs slight shuffle
    ud.leftLeg.rotation.x = Math.sin(t * 4) * 0.1;
    ud.rightLeg.rotation.x = -Math.sin(t * 4) * 0.1;

    // Reset head
    ud.head.rotation.y = 0;
    ud.head.rotation.x = 0;
  } else if (state === 'dive_left' || state === 'dive_right') {
    const dir = state === 'dive_left' ? -1 : 1;
    const progress = Math.min(t * 2.5, 1);
    const eased = 1 - Math.pow(1 - progress, 3);

    // Body slides and rotates
    keeper.position.x = dir * eased * 2.0;
    keeper.position.y = state.includes('high') ? eased * 0.4 : -eased * 0.25;
    keeper.rotation.z = dir * eased * 0.7;

    // Arms stretch out
    ud.leftArm.rotation.z = dir > 0 ? 0.3 + eased * 1.8 : eased * 2.2;
    ud.rightArm.rotation.z = dir > 0 ? -eased * 2.2 : -0.3 - eased * 1.8;
    ud.leftArm.rotation.x = -eased * 0.5;
    ud.rightArm.rotation.x = -eased * 0.5;

    // Legs push off
    ud.leftLeg.rotation.x = dir > 0 ? -eased * 0.9 : eased * 0.3;
    ud.rightLeg.rotation.x = dir > 0 ? eased * 0.3 : -eased * 0.9;

    // Head looks at ball
    ud.head.rotation.y = dir * eased * 0.3;
  } else if (state === 'dive_center') {
    const progress = Math.min(t * 3, 1);
    const eased = 1 - Math.pow(1 - progress, 2);

    // Crouch forward
    keeper.position.y = -eased * 0.35;
    keeper.rotation.x = eased * 0.5;

    // Arms forward and out
    ud.leftArm.rotation.z = eased * 1.0;
    ud.rightArm.rotation.z = -eased * 1.0;
    ud.leftArm.rotation.x = -eased * 1.4;
    ud.rightArm.rotation.x = -eased * 1.4;

    ud.leftLeg.rotation.x = eased * 0.3;
    ud.rightLeg.rotation.x = eased * 0.3;
  } else if (state === 'celebrate') {
    // Arms up celebration
    const bounce = Math.abs(Math.sin(t * 6)) * 0.12;
    keeper.position.y = bounce;

    ud.leftArm.rotation.z = 2.8 + Math.sin(t * 8) * 0.3;
    ud.rightArm.rotation.z = -2.8 - Math.sin(t * 8) * 0.3;
    ud.leftArm.rotation.x = 0;
    ud.rightArm.rotation.x = 0;

    ud.leftLeg.rotation.x = Math.sin(t * 6) * 0.2;
    ud.rightLeg.rotation.x = -Math.sin(t * 6) * 0.2;
  } else if (state === 'dejected') {
    keeper.position.y = -0.12;
    ud.leftArm.rotation.z = 0.1;
    ud.rightArm.rotation.z = -0.1;
    ud.head.rotation.x = 0.3;
  }
}

// Get keeper bounding boxes for collision
export function getKeeperBounds(keeper) {
  const worldPos = new THREE.Vector3();
  keeper.getWorldPosition(worldPos);

  const bounds = {
    body: {
      center: new THREE.Vector3(worldPos.x, worldPos.y + 1.2, worldPos.z),
      size: new THREE.Vector3(0.6, 1.3, 0.5),
    },
    leftHand: {
      center: new THREE.Vector3(worldPos.x - 0.6, worldPos.y + 1.3, worldPos.z),
      size: new THREE.Vector3(0.35, 0.35, 0.35),
    },
    rightHand: {
      center: new THREE.Vector3(worldPos.x + 0.6, worldPos.y + 1.3, worldPos.z),
      size: new THREE.Vector3(0.35, 0.35, 0.35),
    }
  };

  // Adjust based on dive state
  const state = keeper.userData.animState;
  if (state === 'dive_left') {
    bounds.body.center.x -= 1.0;
    bounds.body.center.y -= 0.2;
    bounds.leftHand.center.x -= 1.5;
    bounds.leftHand.center.y += 0.3;
    bounds.rightHand.center.x -= 0.6;
  } else if (state === 'dive_right') {
    bounds.body.center.x += 1.0;
    bounds.body.center.y -= 0.2;
    bounds.leftHand.center.x += 0.6;
    bounds.rightHand.center.x += 1.5;
    bounds.rightHand.center.y += 0.3;
  } else if (state === 'dive_center') {
    bounds.body.center.y -= 0.35;
    bounds.body.center.z -= 0.2;
    bounds.leftHand.center.x -= 0.4;
    bounds.leftHand.center.z -= 0.5;
    bounds.rightHand.center.x += 0.4;
    bounds.rightHand.center.z -= 0.5;
  }

  return bounds;
}
