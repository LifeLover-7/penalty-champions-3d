// src/ball.js - Procedural Soccer Ball with classic pentagon/hexagon pattern

import * as THREE from 'three';

function createBallTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Bright white base
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 512, 512);

  // Draw pentagon/hexagon pattern
  const drawPentagon = (cx, cy, radius, rotation = 0) => {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = rotation + (i * 2 * Math.PI) / 5;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = '#1a1a1a';
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  // Place black pentagons in a pattern
  const positions = [
    { x: 256, y: 256, r: 50 },
    { x: 100, y: 100, r: 40 },
    { x: 412, y: 100, r: 40 },
    { x: 100, y: 412, r: 40 },
    { x: 412, y: 412, r: 40 },
    { x: 256, y: 50, r: 35 },
    { x: 256, y: 462, r: 35 },
    { x: 50, y: 256, r: 35 },
    { x: 462, y: 256, r: 35 },
    { x: 170, y: 170, r: 30 },
    { x: 342, y: 170, r: 30 },
    { x: 170, y: 342, r: 30 },
    { x: 342, y: 342, r: 30 },
  ];

  positions.forEach((p, i) => {
    drawPentagon(p.x, p.y, p.r, (i * 0.3) % (Math.PI / 5));
  });

  // Add hexagonal seam lines
  ctx.strokeStyle = 'rgba(50, 50, 50, 0.5)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const dx = positions[j].x - positions[i].x;
      const dy = positions[j].y - positions[i].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 200) {
        ctx.beginPath();
        ctx.moveTo(positions[i].x, positions[i].y);
        ctx.lineTo(positions[j].x, positions[j].y);
        ctx.stroke();
      }
    }
  }

  return new THREE.CanvasTexture(canvas);
}

function createBumpTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 256, 256);

  // Add subtle bumps
  for (let i = 0; i < 500; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = Math.random() * 3 + 1;
    const brightness = Math.random() * 60 + 100;
    ctx.fillStyle = `rgb(${brightness},${brightness},${brightness})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  return new THREE.CanvasTexture(canvas);
}

export function createBall() {
  const geometry = new THREE.SphereGeometry(0.35, 32, 32);
  const material = new THREE.MeshStandardMaterial({
    map: createBallTexture(),
    bumpMap: createBumpTexture(),
    bumpScale: 0.015,
    roughness: 0.5,
    metalness: 0.0,
    emissive: 0xffffff,
    emissiveIntensity: 0.08
  });

  const ball = new THREE.Mesh(geometry, material);
  ball.castShadow = true;
  ball.receiveShadow = true;
  ball.position.set(0, 0.35, 11); // penalty spot position

  // Create ground shadow marker (white circle beneath ball)
  const shadowGeo = new THREE.CircleGeometry(0.45, 32);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.3,
    depthWrite: false
  });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0, 0.01, 11);
  ball.add(shadow);
  ball.userData.shadow = shadow;

  return ball;
}

// Ball trail effect
export function createBallTrail() {
  const trailLength = 20;
  const positions = new Float32Array(trailLength * 3);
  const opacities = new Float32Array(trailLength);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.08,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const trail = new THREE.Points(geometry, material);
  trail.visible = false;

  return {
    mesh: trail,
    positions: [],
    maxPoints: trailLength,

    update(ballPos) {
      this.positions.push(ballPos.clone());
      if (this.positions.length > this.maxPoints) {
        this.positions.shift();
      }

      if (this.positions.length < 2) {
        trail.visible = false;
        return;
      }

      trail.visible = true;
      const posAttr = geometry.attributes.position;
      const opAttr = geometry.attributes.opacity;

      for (let i = 0; i < this.maxPoints; i++) {
        if (i < this.positions.length) {
          const p = this.positions[i];
          posAttr.setXYZ(i, p.x, p.y, p.z);
          opAttr.setX(i, i / this.positions.length);
        } else {
          posAttr.setXYZ(i, 0, -100, 0);
          opAttr.setX(i, 0);
        }
      }

      posAttr.needsUpdate = true;
      opAttr.needsUpdate = true;
    },

    reset() {
      this.positions = [];
      trail.visible = false;
    }
  };
}
