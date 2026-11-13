// src/scene.js - Stadium, Crisp Lighting, Procedural Pitch & Stands

import * as THREE from 'three';
import { COORDINATES } from './constants.js';

// === PROCEDURAL HIGH-RES PITCH TEXTURE (1024x1024) ===
function createPitchTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Alternating mowed grass stripes (#2e7d32 and #388e3c)
  const numStripes = 16;
  const stripeH = canvas.height / numStripes;
  for (let i = 0; i < numStripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#2e7d32' : '#388e3c';
    ctx.fillRect(0, i * stripeH, canvas.width, stripeH);
  }

  // Crisp white field markings (lineWidth = 6)
  ctx.strokeStyle = '#ffffff';
  ctx.fillStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Coordinate mapping for 54m (W) x 42m (L) pitch plane
  // z runs from -6m (y=0) to +36m (y=1024)
  // z = 0m (Goal line) is at y = (6 / 42) * 1024 = 146.3 px
  const goalLineY = 146.3;

  // z = 11m (Penalty Spot) is at y = (17 / 42) * 1024 = 414.5 px
  const penaltySpotY = 414.5;
  const centerX = 512;

  // 1. Goal Line
  ctx.beginPath();
  ctx.moveTo(80, goalLineY);
  ctx.lineTo(canvas.width - 80, goalLineY);
  ctx.stroke();

  // 2. Penalty Area (18-yard box: 40.3m wide x 16.5m deep)
  // 40.3 / 54 * 1024 = 764 px wide; 16.5 / 42 * 1024 = 402 px deep
  const pBoxW = 764;
  const pBoxH = 402;
  const pBoxX = (canvas.width - pBoxW) / 2;
  ctx.strokeRect(pBoxX, goalLineY, pBoxW, pBoxH);

  // 3. Goal Area (6-yard box: 18.3m wide x 5.5m deep)
  // 18.3 / 54 * 1024 = 347 px wide; 5.5 / 42 * 1024 = 134 px deep
  const gBoxW = 347;
  const gBoxH = 134;
  const gBoxX = (canvas.width - gBoxW) / 2;
  ctx.strokeRect(gBoxX, goalLineY, gBoxW, gBoxH);

  // 4. Penalty Spot
  ctx.beginPath();
  ctx.arc(centerX, penaltySpotY, 7, 0, Math.PI * 2);
  ctx.fill();

  // 5. Penalty Arc (Radius 9.15m: 9.15 / 42 * 1024 = 223 px)
  ctx.beginPath();
  ctx.arc(centerX, penaltySpotY, 223, 0.31 * Math.PI, 0.69 * Math.PI);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 16;
  return texture;
}

// === TIERED SEMI-CIRCULAR STADIUM STANDS (z < -18) ===
function createStadiumStands(scene) {
  const standsGroup = new THREE.Group();
  standsGroup.name = 'StadiumStands';

  const tierMatDark = new THREE.MeshStandardMaterial({
    color: 0x161c28,
    roughness: 0.85,
    metalness: 0.15
  });

  const tierMatLight = new THREE.MeshStandardMaterial({
    color: 0x1f2838,
    roughness: 0.80,
    metalness: 0.15
  });

  const seatColor1 = 0x1565c0; // Stadium blue seats
  const seatColor2 = 0x0d47a1;
  const seatMat1 = new THREE.MeshStandardMaterial({ color: seatColor1, roughness: 0.6 });
  const seatMat2 = new THREE.MeshStandardMaterial({ color: seatColor2, roughness: 0.6 });

  // Curved tiered bleachers behind goal (radius 24m to 38m, angle from -140 deg to -40 deg)
  const numTiers = 8;
  const arcSegments = 24;
  const startAngle = Math.PI * 1.15;
  const endAngle = Math.PI * 1.85;
  const angleStep = (endAngle - startAngle) / arcSegments;

  for (let tier = 0; tier < numTiers; tier++) {
    const tierRadius = 24 + tier * 1.7;
    const tierY = tier * 1.1;
    const tierHeight = 1.1;
    const mat = tier % 2 === 0 ? tierMatDark : tierMatLight;

    for (let s = 0; s < arcSegments; s++) {
      const theta1 = startAngle + s * angleStep;
      const theta2 = startAngle + (s + 1) * angleStep;
      const midTheta = (theta1 + theta2) / 2;

      const x = Math.cos(midTheta) * tierRadius;
      const z = Math.sin(midTheta) * tierRadius;

      // Segment box
      const segmentWidth = 2 * tierRadius * Math.sin(angleStep / 2) * 1.02;
      const geo = new THREE.BoxGeometry(segmentWidth, tierHeight, 1.8);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, tierY + tierHeight / 2, z);
      mesh.rotation.y = -midTheta + Math.PI / 2;
      mesh.receiveShadow = true;
      standsGroup.add(mesh);

      // Seats strip on top
      if (tier > 0) {
        const seatGeo = new THREE.BoxGeometry(segmentWidth * 0.96, 0.25, 0.6);
        const seatMesh = new THREE.Mesh(seatGeo, s % 2 === 0 ? seatMat1 : seatMat2);
        seatMesh.position.set(x, tierY + tierHeight + 0.12, z);
        seatMesh.rotation.y = -midTheta + Math.PI / 2;
        standsGroup.add(seatMesh);
      }
    }
  }

  // Curved Grandstand Roof Canopy
  const roofRadius = 32;
  const roofHeight = numTiers * 1.1 + 4.5;
  for (let s = 0; s < arcSegments; s++) {
    const theta1 = startAngle + s * angleStep;
    const theta2 = startAngle + (s + 1) * angleStep;
    const midTheta = (theta1 + theta2) / 2;
    const x = Math.cos(midTheta) * roofRadius;
    const z = Math.sin(midTheta) * roofRadius;
    const segmentWidth = 2 * roofRadius * Math.sin(angleStep / 2) * 1.04;

    const roofGeo = new THREE.BoxGeometry(segmentWidth, 0.4, 16);
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x222a38,
      metalness: 0.5,
      roughness: 0.4
    });
    const roofSegment = new THREE.Mesh(roofGeo, roofMat);
    roofSegment.position.set(x * 0.9, roofHeight, z * 0.9);
    roofSegment.rotation.y = -midTheta + Math.PI / 2;
    roofSegment.rotation.x = -0.15; // Sloped down towards pitch
    standsGroup.add(roofSegment);
  }

  scene.add(standsGroup);
}

// === 4 FLOODLIGHT TOWERS ===
function createFloodlightTowers(scene) {
  const towers = [
    { x: -22, z: -14 },
    { x: 22,  z: -14 },
    { x: -22, z: 24 },
    { x: 22,  z: 24 }
  ];

  const poleMat = new THREE.MeshStandardMaterial({
    color: 0x37474f,
    metalness: 0.85,
    roughness: 0.3
  });

  const housingMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 3.5,
    roughness: 0.1
  });

  towers.forEach(t => {
    const towerGroup = new THREE.Group();
    const towerH = 22;

    // Main column
    const poleGeo = new THREE.CylinderGeometry(0.18, 0.32, towerH, 8);
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(0, towerH / 2, 0);
    pole.castShadow = true;
    towerGroup.add(pole);

    // Cross braces
    for (let h = 4; h < towerH; h += 4) {
      const braceGeo = new THREE.BoxGeometry(1.6, 0.12, 1.6);
      const brace = new THREE.Mesh(braceGeo, poleMat);
      brace.position.set(0, h, 0);
      towerGroup.add(brace);
    }

    // Light head panel
    const headGeo = new THREE.BoxGeometry(3.2, 1.8, 0.5);
    const head = new THREE.Mesh(headGeo, housingMat);
    head.position.set(0, towerH + 0.9, 0);
    // Angle light head towards goal line area
    head.lookAt(new THREE.Vector3(0, 1.5, 5));
    towerGroup.add(head);

    towerGroup.position.set(t.x, 0, t.z);
    scene.add(towerGroup);
  });
}

// === MAIN SCENE INITIALIZER ===
export function createScene() {
  const scene = new THREE.Scene();

  // 1. Background & Fog (Crisp night theme)
  scene.background = new THREE.Color(0x0a1118);
  scene.fog = new THREE.FogExp2(0x0a1118, 0.008);

  // 2. Bright Hemisphere Lighting
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1b5e20, 1.5);
  hemiLight.position.set(0, 40, 0);
  scene.add(hemiLight);

  // 3. Two Stadium DirectionalLight Floodlights (intensity 2.0, soft shadows)
  const dirLight1 = new THREE.DirectionalLight(0xffffff, 2.0);
  dirLight1.position.set(-16, 26, 18);
  dirLight1.target.position.set(0, 0, 4);
  dirLight1.castShadow = true;
  dirLight1.shadow.mapSize.set(2048, 2048);
  dirLight1.shadow.camera.near = 5;
  dirLight1.shadow.camera.far = 70;
  dirLight1.shadow.camera.left = -22;
  dirLight1.shadow.camera.right = 22;
  dirLight1.shadow.camera.top = 22;
  dirLight1.shadow.camera.bottom = -22;
  dirLight1.shadow.bias = -0.0008;
  scene.add(dirLight1);
  scene.add(dirLight1.target);

  const dirLight2 = new THREE.DirectionalLight(0xffffff, 2.0);
  dirLight2.position.set(16, 26, 18);
  dirLight2.target.position.set(0, 0, 4);
  dirLight2.castShadow = true;
  dirLight2.shadow.mapSize.set(2048, 2048);
  dirLight2.shadow.camera.near = 5;
  dirLight2.shadow.camera.far = 70;
  dirLight2.shadow.camera.left = -22;
  dirLight2.shadow.camera.right = 22;
  dirLight2.shadow.camera.top = 22;
  dirLight2.shadow.camera.bottom = -22;
  dirLight2.shadow.bias = -0.0008;
  scene.add(dirLight2);
  scene.add(dirLight2.target);

  // 4. Pitch Geometry: 54m wide x 42m long
  // Center is at (0, 0, 15), meaning z ranges from -6 to +36
  const pitchGeo = new THREE.PlaneGeometry(54, 42);
  const pitchMat = new THREE.MeshStandardMaterial({
    map: createPitchTexture(),
    roughness: 0.85,
    metalness: 0.05
  });
  const pitch = new THREE.Mesh(pitchGeo, pitchMat);
  pitch.rotation.x = -Math.PI / 2;
  pitch.position.set(0, 0, 15);
  pitch.receiveShadow = true;
  scene.add(pitch);

  // 5. Crisp 3D Penalty Spot Disk at exact world (0, 0.008, 11.0)
  const spotGeo = new THREE.CircleGeometry(0.16, 32);
  const spotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const penaltySpotMesh = new THREE.Mesh(spotGeo, spotMat);
  penaltySpotMesh.rotation.x = -Math.PI / 2;
  penaltySpotMesh.position.set(0, 0.008, 11.0);
  scene.add(penaltySpotMesh);

  // 6. Crisp 3D Goal Line Strip at exact world z = 0, y = 0.006
  const goalLineGeo = new THREE.PlaneGeometry(COORDINATES.GOAL_WIDTH + 0.3, 0.12);
  const goalLineMesh = new THREE.Mesh(goalLineGeo, spotMat);
  goalLineMesh.rotation.x = -Math.PI / 2;
  goalLineMesh.position.set(0, 0.006, 0);
  scene.add(goalLineMesh);

  // 7. Outer Apron / Stadium Surrounding Field
  const apronGeo = new THREE.PlaneGeometry(140, 120);
  const apronMat = new THREE.MeshStandardMaterial({
    color: 0x143318,
    roughness: 0.95,
    metalness: 0.0
  });
  const apron = new THREE.Mesh(apronGeo, apronMat);
  apron.rotation.x = -Math.PI / 2;
  apron.position.set(0, -0.015, 10);
  apron.receiveShadow = true;
  scene.add(apron);

  // 8. Stadium Stands in Semi-Circle (z < -18)
  createStadiumStands(scene);

  // 9. 4 Glowing Floodlight Towers
  createFloodlightTowers(scene);

  return scene;
}
