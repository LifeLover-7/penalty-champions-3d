// src/scene.js - Stadium, Pitch, Lights setup

import * as THREE from 'three';

// === PROCEDURAL PITCH TEXTURE ===
function createPitchTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Base green with stripes
  const stripeWidth = 64;
  for (let i = 0; i < canvas.width / stripeWidth; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#2d7a3a' : '#348a42';
    ctx.fillRect(i * stripeWidth, 0, stripeWidth, canvas.height);
  }

  // Penalty box lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.lineWidth = 5;

  // Penalty area (outer box)
  const boxW = 400;
  const boxH = 180;
  const boxX = (canvas.width - boxW) / 2;
  const boxY = 0;
  ctx.strokeRect(boxX, boxY, boxW, boxH);

  // Goal area (6-yard box)
  const gAreaW = 180;
  const gAreaH = 70;
  const gAreaX = (canvas.width - gAreaW) / 2;
  ctx.strokeRect(gAreaX, boxY, gAreaW, gAreaH);

  // Penalty spot
  ctx.fillStyle = 'rgba(255, 255, 255, 1)';
  ctx.beginPath();
  ctx.arc(canvas.width / 2, 120 / 180 * boxH + boxY, 7, 0, Math.PI * 2);
  ctx.fill();

  // Penalty arc
  ctx.beginPath();
  ctx.arc(canvas.width / 2, 120 / 180 * boxH + boxY, 70, 0.3 * Math.PI, 0.7 * Math.PI);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Goal line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(0, 3);
  ctx.lineTo(canvas.width, 3);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  return texture;
}

// === STADIUM STANDS (clean solid architecture, no floating particles) ===
function createStadiumStands(scene) {
  // Dark slate material for clean stands
  const standMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a2d3e,
    roughness: 0.85,
    metalness: 0.15
  });

  const standTopMaterial = new THREE.MeshStandardMaterial({
    color: 0x3a3d4e,
    roughness: 0.8,
    metalness: 0.1
  });

  // Create tiered solid bleachers around the pitch
  const standConfigs = [
    // Behind goal (far side - main stand)
    { x: 0, z: -30, rotY: 0, width: 50, tiers: 6, tierHeight: 2.5, tierDepth: 3 },
    // Left side
    { x: -22, z: 0, rotY: Math.PI / 2, width: 60, tiers: 5, tierHeight: 2.5, tierDepth: 3 },
    // Right side
    { x: 22, z: 0, rotY: -Math.PI / 2, width: 60, tiers: 5, tierHeight: 2.5, tierDepth: 3 },
    // Near side (behind camera) - lower
    { x: 0, z: 28, rotY: Math.PI, width: 50, tiers: 3, tierHeight: 2, tierDepth: 3 },
  ];

  standConfigs.forEach(cfg => {
    const standGroup = new THREE.Group();

    for (let tier = 0; tier < cfg.tiers; tier++) {
      const geo = new THREE.BoxGeometry(cfg.width, cfg.tierHeight, cfg.tierDepth);
      const mat = tier % 2 === 0 ? standMaterial : standTopMaterial;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(0, tier * cfg.tierHeight + cfg.tierHeight / 2, -tier * cfg.tierDepth * 0.8);
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      standGroup.add(mesh);
    }

    // Top railing/wall
    const railingGeo = new THREE.BoxGeometry(cfg.width, 0.8, 0.3);
    const railingMat = new THREE.MeshStandardMaterial({ color: 0x555566, roughness: 0.6, metalness: 0.3 });
    const railing = new THREE.Mesh(railingGeo, railingMat);
    railing.position.set(0, cfg.tiers * cfg.tierHeight + 0.4, -cfg.tiers * cfg.tierDepth * 0.8);
    standGroup.add(railing);

    standGroup.position.set(cfg.x, 0, cfg.z);
    standGroup.rotation.y = cfg.rotY;
    scene.add(standGroup);
  });
}

// === FLOODLIGHTS (subtle glowing towers) ===
function createFloodlights(scene) {
  const towerConfigs = [
    { x: -20, z: -15 },
    { x: 20, z: -15 },
    { x: -20, z: 22 },
    { x: 20, z: 22 },
  ];

  towerConfigs.forEach((pos) => {
    const towerHeight = 18;

    // Tower pole
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.18, towerHeight, 8);
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0x444444,
      metalness: 0.9,
      roughness: 0.2
    });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(pos.x, towerHeight / 2, pos.z);
    pole.castShadow = true;
    scene.add(pole);

    // Light housing (glowing panel)
    const housingGeo = new THREE.BoxGeometry(2.5, 1.2, 0.3);
    const housingMat = new THREE.MeshStandardMaterial({
      color: 0xffffee,
      emissive: 0xffffcc,
      emissiveIntensity: 3.0,
      roughness: 0.3
    });
    const housing = new THREE.Mesh(housingGeo, housingMat);
    housing.position.set(pos.x, towerHeight + 0.6, pos.z);
    scene.add(housing);

    // Glow sphere (subtle light bloom effect)
    const glowGeo = new THREE.SphereGeometry(1.5, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffffdd,
      transparent: true,
      opacity: 0.15
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.set(pos.x, towerHeight + 0.5, pos.z);
    scene.add(glow);

    // SpotLight from each tower
    const spotlight = new THREE.SpotLight(0xfff8e0, 2.5, 70, Math.PI / 3.5, 0.6, 1.2);
    spotlight.position.set(pos.x, towerHeight, pos.z);
    spotlight.target.position.set(0, 0, 3);
    spotlight.castShadow = true;
    spotlight.shadow.mapSize.set(1024, 1024);
    spotlight.shadow.camera.near = 5;
    spotlight.shadow.camera.far = 60;
    scene.add(spotlight);
    scene.add(spotlight.target);
  });
}

// === MAIN SCENE SETUP ===
export function createScene() {
  const scene = new THREE.Scene();

  // Night sky - slightly brighter for visibility
  scene.background = new THREE.Color(0x0f1525);

  // Minimal fog - just enough for depth, not blocking visibility
  scene.fog = new THREE.FogExp2(0x0f1525, 0.006);

  // === MAIN LIGHTING ===

  // Bright hemisphere light (sky white, ground green)
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x2e7d32, 1.4);
  hemiLight.position.set(0, 50, 0);
  scene.add(hemiLight);

  // Main directional light (stadium main flood)
  const dirLight = new THREE.DirectionalLight(0xfff8e0, 2.2);
  dirLight.position.set(5, 25, 10);
  dirLight.target.position.set(0, 0, 3);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(2048, 2048);
  dirLight.shadow.camera.near = 1;
  dirLight.shadow.camera.far = 60;
  dirLight.shadow.camera.left = -20;
  dirLight.shadow.camera.right = 20;
  dirLight.shadow.camera.top = 20;
  dirLight.shadow.camera.bottom = -20;
  dirLight.shadow.bias = -0.001;
  scene.add(dirLight);
  scene.add(dirLight.target);

  // Fill light from opposite side
  const fillLight = new THREE.DirectionalLight(0xe8e0ff, 0.8);
  fillLight.position.set(-10, 15, 5);
  scene.add(fillLight);

  // Ground / Pitch
  const pitchGeo = new THREE.PlaneGeometry(50, 50);
  const pitchMat = new THREE.MeshStandardMaterial({
    map: createPitchTexture(),
    roughness: 0.75,
    metalness: 0.0,
  });
  const pitch = new THREE.Mesh(pitchGeo, pitchMat);
  pitch.rotation.x = -Math.PI / 2;
  pitch.position.set(0, 0, 5);
  pitch.receiveShadow = true;
  scene.add(pitch);

  // Add floodlights (with spotlights)
  createFloodlights(scene);

  // Add stadium stands (solid architecture, no particles)
  createStadiumStands(scene);

  // Ground plane (surrounding pitch - dark green)
  const surroundGeo = new THREE.PlaneGeometry(120, 120);
  const surroundMat = new THREE.MeshStandardMaterial({
    color: 0x1a4a1a,
    roughness: 0.95,
    metalness: 0.0
  });
  const surround = new THREE.Mesh(surroundGeo, surroundMat);
  surround.rotation.x = -Math.PI / 2;
  surround.position.y = -0.01;
  surround.receiveShadow = true;
  scene.add(surround);

  return scene;
}
