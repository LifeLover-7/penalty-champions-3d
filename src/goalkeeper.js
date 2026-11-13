// src/goalkeeper.js - 1.90m Articulated Goalkeeper with Procedural Animations & Collision Detection

import * as THREE from 'three';
import { COORDINATES, GOAL_ZONES } from './constants.js';

const { KEEPER_START, KEEPER_HEIGHT } = COORDINATES;

export function createGoalkeeper(isPlayer = false) {
  const rootGroup = new THREE.Group();
  rootGroup.name = isPlayer ? 'PlayerGoalkeeper' : 'AIGoalkeeper';
  rootGroup.userData.isPlayer = isPlayer;

  // Colors & Materials
  const jerseyColor = isPlayer ? 0x00e5ff : 0xffea00; // Cyan for Player, Neon Yellow for AI
  const shortsColor = 0x1a2332; // Dark slate shorts
  const skinColor = 0xf5c6a0;   // Natural skin tone
  const gloveColor = 0xffffff;  // Bright white oversized gloves
  const cleatColor = 0x111111;

  const jerseyMat = new THREE.MeshStandardMaterial({
    color: jerseyColor,
    roughness: 0.35,
    metalness: 0.1,
    emissive: jerseyColor,
    emissiveIntensity: 0.15
  });

  const shortsMat = new THREE.MeshStandardMaterial({
    color: shortsColor,
    roughness: 0.6,
    metalness: 0.1
  });

  const skinMat = new THREE.MeshStandardMaterial({
    color: skinColor,
    roughness: 0.6
  });

  const gloveMat = new THREE.MeshStandardMaterial({
    color: gloveColor,
    roughness: 0.25,
    metalness: 0.2,
    emissive: 0xffffff,
    emissiveIntensity: 0.15
  });

  const cleatMat = new THREE.MeshStandardMaterial({
    color: cleatColor,
    roughness: 0.4,
    metalness: 0.3
  });

  // Base Goalkeeper character group (scaled to exact 1.90m height)
  const bodyGroup = new THREE.Group();
  rootGroup.add(bodyGroup);
  rootGroup.userData.bodyGroup = bodyGroup;

  // === 1. PELVIS & SHORTS (y = 0.88) ===
  const pelvisGeo = new THREE.BoxGeometry(0.44, 0.24, 0.28);
  const pelvis = new THREE.Mesh(pelvisGeo, shortsMat);
  pelvis.position.set(0, 0.88, 0);
  pelvis.castShadow = true;
  bodyGroup.add(pelvis);

  // === 2. TORSO (y = 1.25) ===
  const torsoGeo = new THREE.BoxGeometry(0.52, 0.54, 0.30);
  const torso = new THREE.Mesh(torsoGeo, jerseyMat);
  torso.position.set(0, 1.25, 0);
  torso.castShadow = true;
  torso.receiveShadow = true;
  bodyGroup.add(torso);
  rootGroup.userData.torso = torso;

  // Jersey Number Badge on Chest
  const badgeGeo = new THREE.PlaneGeometry(0.18, 0.18);
  const badgeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
  const badge = new THREE.Mesh(badgeGeo, badgeMat);
  badge.position.set(0, 1.26, 0.155);
  bodyGroup.add(badge);

  // === 3. HEAD & NECK (y = 1.70) ===
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.68, 0);

  const headGeo = new THREE.SphereGeometry(0.14, 16, 16);
  const head = new THREE.Mesh(headGeo, skinMat);
  head.castShadow = true;
  headGroup.add(head);

  // Hair
  const hairGeo = new THREE.SphereGeometry(0.145, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.55);
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.9 });
  const hair = new THREE.Mesh(hairGeo, hairMat);
  hair.position.y = 0.02;
  headGroup.add(hair);

  // Eyes (facing +z towards penalty taker)
  const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  [-0.05, 0.05].forEach(ex => {
    const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), eyeWhiteMat);
    eyeWhite.position.set(ex, 0.02, 0.125);
    headGroup.add(eyeWhite);

    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.013, 8, 8), pupilMat);
    pupil.position.set(ex, 0.02, 0.143);
    headGroup.add(pupil);
  });

  bodyGroup.add(headGroup);
  rootGroup.userData.headGroup = headGroup;

  // === 4. ARTICULATED SHOULDERS & ARMS ===
  // Left Shoulder Pivot
  const leftShoulder = new THREE.Group();
  leftShoulder.position.set(-0.32, 1.45, 0);
  bodyGroup.add(leftShoulder);
  rootGroup.userData.leftShoulder = leftShoulder;

  const armGeo = new THREE.CylinderGeometry(0.07, 0.06, 0.44, 10);
  const leftArm = new THREE.Mesh(armGeo, jerseyMat);
  leftArm.position.set(0, -0.22, 0);
  leftArm.castShadow = true;
  leftShoulder.add(leftArm);

  // Oversized White Glove (Left)
  const gloveGeo = new THREE.SphereGeometry(0.14, 16, 16);
  const leftGlove = new THREE.Mesh(gloveGeo, gloveMat);
  leftGlove.position.set(0, -0.48, 0.02);
  leftGlove.castShadow = true;
  leftShoulder.add(leftGlove);
  rootGroup.userData.leftGlove = leftGlove;

  // Right Shoulder Pivot
  const rightShoulder = new THREE.Group();
  rightShoulder.position.set(0.32, 1.45, 0);
  bodyGroup.add(rightShoulder);
  rootGroup.userData.rightShoulder = rightShoulder;

  const rightArm = new THREE.Mesh(armGeo, jerseyMat);
  rightArm.position.set(0, -0.22, 0);
  rightArm.castShadow = true;
  rightShoulder.add(rightArm);

  // Oversized White Glove (Right)
  const rightGlove = new THREE.Mesh(gloveGeo, gloveMat);
  rightGlove.position.set(0, -0.48, 0.02);
  rightGlove.castShadow = true;
  rightShoulder.add(rightGlove);
  rootGroup.userData.rightGlove = rightGlove;

  // === 5. ARTICULATED LEGS & CLEATS ===
  const legGeo = new THREE.CylinderGeometry(0.08, 0.065, 0.50, 10);

  // Left Leg Pivot
  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.16, 0.76, 0);
  bodyGroup.add(leftLeg);
  rootGroup.userData.leftLeg = leftLeg;

  const leftThigh = new THREE.Mesh(legGeo, shortsMat);
  leftThigh.position.set(0, -0.25, 0);
  leftThigh.castShadow = true;
  leftLeg.add(leftThigh);

  const cleatGeo = new THREE.BoxGeometry(0.12, 0.08, 0.22);
  const leftCleat = new THREE.Mesh(cleatGeo, cleatMat);
  leftCleat.position.set(0, -0.52, 0.04);
  leftCleat.castShadow = true;
  leftLeg.add(leftCleat);

  // Right Leg Pivot
  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.16, 0.76, 0);
  bodyGroup.add(rightLeg);
  rootGroup.userData.rightLeg = rightLeg;

  const rightThigh = new THREE.Mesh(legGeo, shortsMat);
  rightThigh.position.set(0, -0.25, 0);
  rightThigh.castShadow = true;
  rightLeg.add(rightThigh);

  const rightCleat = new THREE.Mesh(cleatGeo, cleatMat);
  rightCleat.position.set(0, -0.52, 0.04);
  rightCleat.castShadow = true;
  rightLeg.add(rightCleat);

  // === INITIAL POSITION & STATE ===
  rootGroup.position.set(KEEPER_START.x, KEEPER_START.y, KEEPER_START.z);
  rootGroup.rotation.set(0, 0, 0); // facing +z

  rootGroup.userData.animState = 'idle';
  rootGroup.userData.animTime = 0;
  rootGroup.userData.diveTimer = 0;
  rootGroup.userData.diveDuration = 0.45; // 0.45s lerp
  rootGroup.userData.diveTarget = null;
  rootGroup.userData.diveStartX = 0;
  rootGroup.userData.diveStartY = 0;

  // Attached methods
  rootGroup.resetToIdle = function() {
    rootGroup.position.set(KEEPER_START.x, KEEPER_START.y, KEEPER_START.z);
    rootGroup.rotation.set(0, 0, 0);
    bodyGroup.position.set(0, 0, 0);
    bodyGroup.rotation.set(0, 0, 0);
    leftShoulder.rotation.set(0, 0, 0.25);
    rightShoulder.rotation.set(0, 0, -0.25);
    leftLeg.rotation.set(0, 0, 0);
    rightLeg.rotation.set(0, 0, 0);
    headGroup.rotation.set(0, 0, 0);
    rootGroup.userData.animState = 'idle';
    rootGroup.userData.animTime = 0;
    rootGroup.userData.diveTimer = 0;
    rootGroup.userData.diveTarget = null;
  };

  rootGroup.startDive = function(zoneId) {
    const zoneDef = GOAL_ZONES.find(z => z.id === zoneId) || GOAL_ZONES[1];
    rootGroup.userData.animState = 'dive';
    rootGroup.userData.diveTimer = 0;
    rootGroup.userData.diveStartX = rootGroup.position.x;
    rootGroup.userData.diveStartY = rootGroup.position.y;
    rootGroup.userData.diveTarget = zoneDef;
  };

  rootGroup.setCelebrate = function() {
    rootGroup.userData.animState = 'celebrate';
    rootGroup.userData.animTime = 0;
  };

  rootGroup.setDejected = function() {
    rootGroup.userData.animState = 'dejected';
    rootGroup.userData.animTime = 0;
  };

  return rootGroup;
}

// === PROCEDURAL ANIMATIONS ===
export function updateGoalkeeper(keeper, dt) {
  const ud = keeper.userData;
  ud.animTime += dt;

  const t = ud.animTime;
  const leftShoulder = ud.leftShoulder;
  const rightShoulder = ud.rightShoulder;
  const leftLeg = ud.leftLeg;
  const rightLeg = ud.rightLeg;
  const headGroup = ud.headGroup;
  const bodyGroup = ud.bodyGroup;

  if (ud.animState === 'idle') {
    // Subtle rhythmic knee bounce and arm sway
    const bounce = Math.sin(t * 5.0) * 0.04;
    bodyGroup.position.y = bounce;

    // Rhythmic ready stance arm sway
    leftShoulder.rotation.z = 0.28 + Math.sin(t * 3.5) * 0.08;
    rightShoulder.rotation.z = -0.28 - Math.sin(t * 3.5) * 0.08;
    leftShoulder.rotation.x = -0.15 + Math.sin(t * 2.5) * 0.05;
    rightShoulder.rotation.x = -0.15 + Math.sin(t * 2.5) * 0.05;

    // Subtle leg stance bend
    leftLeg.rotation.x = Math.sin(t * 5.0) * 0.06;
    rightLeg.rotation.x = -Math.sin(t * 5.0) * 0.06;

    // Head focused straight forward at ball (+z)
    headGroup.rotation.y = Math.sin(t * 2.0) * 0.04;
    headGroup.rotation.x = 0;
  }
  else if (ud.animState === 'dive' && ud.diveTarget) {
    ud.diveTimer += dt;
    const progress = Math.min(1.0, ud.diveTimer / ud.diveDuration);

    // Smooth cubic ease-out
    const tEased = 1.0 - Math.pow(1.0 - progress, 3);
    const target = ud.diveTarget;

    // Body position and roll rotation interpolation
    keeper.position.x = THREE.MathUtils.lerp(ud.diveStartX, target.diveX, tEased);
    keeper.position.y = THREE.MathUtils.lerp(ud.diveStartY, target.diveY, tEased);
    keeper.rotation.z = THREE.MathUtils.lerp(0, target.rollZ, tEased);

    // Stretch arms toward target zone
    if (target.diveX < -0.5) {
      // Diving Left
      leftShoulder.rotation.z = THREE.MathUtils.lerp(0.28, 2.2, tEased);
      rightShoulder.rotation.z = THREE.MathUtils.lerp(-0.28, 1.6, tEased);
      leftShoulder.rotation.x = THREE.MathUtils.lerp(0, -0.3, tEased);
      rightShoulder.rotation.x = THREE.MathUtils.lerp(0, -0.3, tEased);
      leftLeg.rotation.z = THREE.MathUtils.lerp(0, 0.4, tEased);
      rightLeg.rotation.z = THREE.MathUtils.lerp(0, -0.2, tEased);
    } else if (target.diveX > 0.5) {
      // Diving Right
      leftShoulder.rotation.z = THREE.MathUtils.lerp(0.28, -1.6, tEased);
      rightShoulder.rotation.z = THREE.MathUtils.lerp(-0.28, -2.2, tEased);
      leftShoulder.rotation.x = THREE.MathUtils.lerp(0, -0.3, tEased);
      rightShoulder.rotation.x = THREE.MathUtils.lerp(0, -0.3, tEased);
      leftLeg.rotation.z = THREE.MathUtils.lerp(0, 0.2, tEased);
      rightLeg.rotation.z = THREE.MathUtils.lerp(0, -0.4, tEased);
    } else {
      // Center dive (high jump or low crouch)
      if (target.high) {
        leftShoulder.rotation.z = THREE.MathUtils.lerp(0.28, 2.8, tEased);
        rightShoulder.rotation.z = THREE.MathUtils.lerp(-0.28, -2.8, tEased);
      } else {
        leftShoulder.rotation.x = THREE.MathUtils.lerp(0, -1.2, tEased);
        rightShoulder.rotation.x = THREE.MathUtils.lerp(0, -1.2, tEased);
        keeper.rotation.x = THREE.MathUtils.lerp(0, 0.4, tEased);
      }
    }
  }
  else if (ud.animState === 'celebrate') {
    // Joyful double fist pump celebration
    const bounce = Math.abs(Math.sin(t * 6.0)) * 0.16;
    bodyGroup.position.y = bounce;

    leftShoulder.rotation.z = 2.6 + Math.sin(t * 8.0) * 0.25;
    rightShoulder.rotation.z = -2.6 - Math.sin(t * 8.0) * 0.25;
    leftShoulder.rotation.x = 0;
    rightShoulder.rotation.x = 0;

    leftLeg.rotation.x = Math.sin(t * 6.0) * 0.3;
    rightLeg.rotation.x = -Math.sin(t * 6.0) * 0.3;
    headGroup.rotation.x = -0.2; // Look up in triumph
  }
  else if (ud.animState === 'dejected') {
    // Slumped shoulders, head hung low
    bodyGroup.position.y = -0.08;
    leftShoulder.rotation.z = 0.15;
    rightShoulder.rotation.z = -0.15;
    leftShoulder.rotation.x = 0.2;
    rightShoulder.rotation.x = 0.2;
    headGroup.rotation.x = 0.45; // Looking down
  }
}

// === ACCURATE KEEPER COLLIDERS (TORSO & GLOVES) ===
export function getKeeperColliders(keeper) {
  const torsoPos = new THREE.Vector3();
  const leftGlovePos = new THREE.Vector3();
  const rightGlovePos = new THREE.Vector3();

  keeper.userData.torso.getWorldPosition(torsoPos);
  keeper.userData.leftGlove.getWorldPosition(leftGlovePos);
  keeper.userData.rightGlove.getWorldPosition(rightGlovePos);

  return [
    { name: 'torso',      center: torsoPos,      radius: 0.44 },
    { name: 'leftGlove',  center: leftGlovePos,  radius: 0.28 },
    { name: 'rightGlove', center: rightGlovePos, radius: 0.28 }
  ];
}
