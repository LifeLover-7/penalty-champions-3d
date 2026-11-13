// src/scene.js - Stadium, Pitch, Lights, Fog setup

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
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 4;

  // Penalty area (outer box)
  const boxW = 400;
  const boxH = 160;
  const boxX = (canvas.width - boxW) / 2;
  const boxY = 0;
  ctx.strokeRect(boxX, boxY, boxW, boxH);

  // Goal area (6-yard box)
  const gAreaW = 180;
  const gAreaH = 60;
  const gAreaX = (canvas.width - gAreaW) / 2;
  ctx.strokeRect(gAreaX, boxY, gAreaW, gAreaH);

  // Penalty spot
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.beginPath();
  ctx.arc(canvas.width / 2, 110 / 160 * boxH + boxY, 5, 0, Math.PI * 2);
  ctx.fill();

  // Penalty arc
  ctx.beginPath();
  ctx.arc(canvas.width / 2, 110 / 160 * boxH + boxY, 60, 0.3 * Math.PI, 0.7 * Math.PI);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Goal line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, 2);
  ctx.lineTo(canvas.width, 2);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  return texture;
}

// === STADIUM STANDS ===
function createStadiumStands(scene) {
  const standMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1a2e,
    roughness: 0.9,
    metalness: 0.1
  });

  // Create tiered stands around the pitch
  const standPositions = [
    { x: 0, z: -25, rotY: 0, width: 40, depth: 8 },    // Behind goal (far)
    { x: -25, z: 5, rotY: Math.PI / 2, width: 50, depth: 6 },  // Left side
    { x: 25, z: 5, rotY: -Math.PI / 2, width: 50, depth: 6 },  // Right side
  ];

  standPositions.forEach(pos => {
    for (let tier = 0; tier < 4; tier++) {
      const geo = new THREE.BoxGeometry(pos.width, 3, pos.depth);
      const mesh = new THREE.Mesh(geo, standMaterial);
      mesh.position.set(pos.x, tier * 3 + 1.5, pos.z - tier * pos.depth * 0.3);
      mesh.rotation.y = pos.rotY;
      mesh.receiveShadow = true;
      scene.add(mesh);
    }

    // Add colored seats (dots)
    const seatGeo = new THREE.BufferGeometry();
    const seatPositions = [];
    const seatColors = [];
    const seatCount = 200;

    for (let i = 0; i < seatCount; i++) {
      const sx = (Math.random() - 0.5) * pos.width * 0.9;
      const sy = Math.random() * 10 + 2;
      const sz = pos.z - Math.random() * 6;
      seatPositions.push(sx, sy, sz);

      // Random team colors
      const colorChoice = Math.random();
      if (colorChoice < 0.3) seatColors.push(1, 0.2, 0.2);
      else if (colorChoice < 0.6) seatColors.push(0.2, 0.5, 1);
      else seatColors.push(0.9, 0.9, 0.1);
    }

    seatGeo.setAttribute('position', new THREE.Float32BufferAttribute(seatPositions, 3));
    seatGeo.setAttribute('color', new THREE.Float32BufferAttribute(seatColors, 3));

    const seatMat = new THREE.PointsMaterial({ size: 0.4, vertexColors: true, sizeAttenuation: true });
    const seats = new THREE.Points(seatGeo, seatMat);
    seats.rotation.y = pos.rotY;
    scene.add(seats);
  });
}

// === FLOODLIGHTS ===
function createFloodlights(scene) {
  const lightPositions = [
    { x: -18, y: 20, z: -10 },
    { x: 18, y: 20, z: -10 },
    { x: -18, y: 20, z: 20 },
    { x: 18, y: 20, z: 20 },
  ];

  lightPositions.forEach((pos, i) => {
    // Light tower
    const towerGeo = new THREE.CylinderGeometry(0.15, 0.2, pos.y, 6);
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.3 });
    const tower = new THREE.Mesh(towerGeo, towerMat);
    tower.position.set(pos.x, pos.y / 2, pos.z);
    tower.castShadow = true;
    scene.add(tower);

    // Light panel
    const panelGeo = new THREE.BoxGeometry(2, 1, 0.2);
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0xffffee,
      emissive: 0xffffaa,
      emissiveIntensity: 2
    });
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.set(pos.x, pos.y, pos.z);
    scene.add(panel);

    // SpotLight from each tower
    const spotlight = new THREE.SpotLight(0xfff5e0, 1.5, 60, Math.PI / 4, 0.5, 1.5);
    spotlight.position.set(pos.x, pos.y, pos.z);
    spotlight.target.position.set(0, 0, 5);
    spotlight.castShadow = true;
    spotlight.shadow.mapSize.set(1024, 1024);
    spotlight.shadow.camera.near = 5;
    spotlight.shadow.camera.far = 50;
    scene.add(spotlight);
    scene.add(spotlight.target);
  });

  // Ambient light
  const ambient = new THREE.AmbientLight(0x334466, 0.4);
  scene.add(ambient);

  // Hemisphere light for sky/ground coloring
  const hemi = new THREE.HemisphereLight(0x446688, 0x223311, 0.3);
  scene.add(hemi);
}

// === MAIN SCENE SETUP ===
export function createScene() {
  const scene = new THREE.Scene();

  // Night sky background
  scene.background = new THREE.Color(0x0a0e1a);

  // Atmospheric fog
  scene.fog = new THREE.FogExp2(0x0a0e1a, 0.012);

  // Ground / Pitch
  const pitchGeo = new THREE.PlaneGeometry(50, 50);
  const pitchMat = new THREE.MeshStandardMaterial({
    map: createPitchTexture(),
    roughness: 0.8,
    metalness: 0.0,
  });
  const pitch = new THREE.Mesh(pitchGeo, pitchMat);
  pitch.rotation.x = -Math.PI / 2;
  pitch.position.set(0, 0, 5);
  pitch.receiveShadow = true;
  scene.add(pitch);

  // Add floodlights
  createFloodlights(scene);

  // Add stadium stands
  createStadiumStands(scene);

  // Ground plane (surrounding pitch)
  const surroundGeo = new THREE.PlaneGeometry(100, 100);
  const surroundMat = new THREE.MeshStandardMaterial({ color: 0x1a3a1a, roughness: 1.0 });
  const surround = new THREE.Mesh(surroundGeo, surroundMat);
  surround.rotation.x = -Math.PI / 2;
  surround.position.y = -0.01;
  surround.receiveShadow = true;
  scene.add(surround);

  return scene;
}
