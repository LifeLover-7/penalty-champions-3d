// src/ball.js - Procedural Soccer Ball & Dynamic Ground Shadow

import * as THREE from 'three';
import { COORDINATES } from './constants.js';

const { BALL_START, BALL_RADIUS } = COORDINATES;

// === PROCEDURAL CLASSIC SOCCER BALL TEXTURE ===
function createBallTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Crisp white base
  ctx.fillStyle = '#f8f9fa';
  ctx.fillRect(0, 0, 512, 512);

  const drawPentagon = (cx, cy, radius, rotation = 0) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();

    // Subtle dark gradient for 3D look
    const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, radius);
    grad.addColorStop(0, '#263238');
    grad.addColorStop(1, '#0a0d0f');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  };

  // Pentagon centers evenly distributed
  const pentagons = [
    { x: 256, y: 256, r: 48, rot: 0 },
    { x: 110, y: 110, r: 42, rot: 0.4 },
    { x: 402, y: 110, r: 42, rot: -0.4 },
    { x: 110, y: 402, r: 42, rot: -0.4 },
    { x: 402, y: 402, r: 42, rot: 0.4 },
    { x: 256, y: 55,  r: 36, rot: 0.2 },
    { x: 256, y: 457, r: 36, rot: -0.2 },
    { x: 55,  y: 256, r: 36, rot: 0.3 },
    { x: 457, y: 256, r: 36, rot: -0.3 }
  ];

  pentagons.forEach(p => drawPentagon(p.x, p.y, p.r, p.rot));

  // Subtle panel seam lines connecting pentagons
  ctx.strokeStyle = 'rgba(100, 100, 100, 0.4)';
  ctx.lineWidth = 2;
  for (let i = 0; i < pentagons.length; i++) {
    for (let j = i + 1; j < pentagons.length; j++) {
      const p1 = pentagons[i];
      const p2 = pentagons[j];
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      if (dist < 220) {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function createBall(scene) {
  // Sphere radius 0.22
  const geometry = new THREE.SphereGeometry(BALL_RADIUS, 32, 32);
  const material = new THREE.MeshStandardMaterial({
    map: createBallTexture(),
    roughness: 0.35,
    metalness: 0.1,
    emissive: 0xffffff,
    emissiveIntensity: 0.05
  });

  const ball = new THREE.Mesh(geometry, material);
  ball.name = 'SoccerBall';
  ball.castShadow = true;
  ball.receiveShadow = true;
  ball.position.set(BALL_START.x, BALL_START.y, BALL_START.z);

  // Dynamic ground shadow disc
  const shadowGeo = new THREE.CircleGeometry(BALL_RADIUS * 1.35, 32);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x051008,
    transparent: true,
    opacity: 0.45,
    depthWrite: false
  });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.name = 'BallGroundShadow';
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(BALL_START.x, 0.005, BALL_START.z);

  if (scene) {
    scene.add(ball);
    scene.add(shadow);
  }

  ball.userData.shadow = shadow;
  ball.userData.initialPos = new THREE.Vector3(BALL_START.x, BALL_START.y, BALL_START.z);

  // Helper method to update 3D mesh position, dynamic shadow, and realistic spin
  ball.updateTransform = function(pos, vel, dt, omegaY = 0) {
    ball.position.copy(pos);

    // Update Ground Shadow directly on y = 0.005
    if (shadow) {
      shadow.position.set(pos.x, 0.005, pos.z);
      const height = Math.max(0, pos.y - BALL_RADIUS);
      const scale = Math.max(0.4, 1.0 - height * 0.08);
      shadow.scale.set(scale, scale, 1);
      shadowMat.opacity = Math.max(0.04, 0.45 * Math.exp(-height * 0.7));
    }

    // Apply 3D visual ball rotation based on forward movement
    const speed = Math.hypot(vel.x, vel.z);
    if (speed > 0.1 && dt > 0) {
      // Rotation axis perpendicular to ground velocity
      const moveDir = new THREE.Vector3(vel.x, 0, vel.z).normalize();
      const rotAxis = new THREE.Vector3(-moveDir.z, 0, moveDir.x);
      const angle = (speed / BALL_RADIUS) * dt;
      ball.rotateOnWorldAxis(rotAxis, angle);
    }

    // Apply Magnus lateral spin around Y axis
    if (Math.abs(omegaY) > 0.1 && dt > 0) {
      ball.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), omegaY * dt);
    }
  };

  ball.resetTransform = function() {
    ball.position.set(BALL_START.x, BALL_START.y, BALL_START.z);
    ball.rotation.set(0, 0, 0);
    if (shadow) {
      shadow.position.set(BALL_START.x, 0.005, BALL_START.z);
      shadow.scale.set(1, 1, 1);
      shadowMat.opacity = 0.45;
    }
  };

  return ball;
}

// === SMOOTH BALL FLIGHT TRAIL ===
export function createBallTrail(scene) {
  const trailLength = 24;
  const positions = new Float32Array(trailLength * 3);
  const opacities = new Float32Array(trailLength);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));

  const material = new THREE.PointsMaterial({
    color: 0x80d8ff,
    size: 0.18,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const trailPoints = new THREE.Points(geometry, material);
  trailPoints.name = 'BallTrail';
  trailPoints.visible = false;

  if (scene) {
    scene.add(trailPoints);
  }

  const history = [];

  return {
    mesh: trailPoints,
    history,
    maxPoints: trailLength,

    update(currentPos) {
      history.push(currentPos.clone());
      if (history.length > trailLength) {
        history.shift();
      }

      if (history.length < 2) {
        trailPoints.visible = false;
        return;
      }

      trailPoints.visible = true;
      const posAttr = geometry.attributes.position;
      const opAttr = geometry.attributes.opacity;

      for (let i = 0; i < trailLength; i++) {
        if (i < history.length) {
          const p = history[i];
          posAttr.setXYZ(i, p.x, p.y, p.z);
          opAttr.setX(i, (i + 1) / history.length);
        } else {
          posAttr.setXYZ(i, 0, -100, 0);
          opAttr.setX(i, 0);
        }
      }

      posAttr.needsUpdate = true;
      opAttr.needsUpdate = true;
    },

    reset() {
      history.length = 0;
      trailPoints.visible = false;
    }
  };
}
