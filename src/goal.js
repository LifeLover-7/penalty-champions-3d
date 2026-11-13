// src/goal.js - 3D Goal with Posts, Crossbar & Reactive Net

import * as THREE from 'three';

// Regulation goal dimensions (scaled): 7.32m wide x 2.44m tall
const GOAL_WIDTH = 7.32;
const GOAL_HEIGHT = 2.44;
const GOAL_DEPTH = 2.0;
const POST_RADIUS = 0.06;

export function createGoal() {
  const goal = new THREE.Group();

  const postMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.8,
    roughness: 0.2,
  });

  // Left post
  const leftPostGeo = new THREE.CylinderGeometry(POST_RADIUS, POST_RADIUS, GOAL_HEIGHT, 12);
  const leftPost = new THREE.Mesh(leftPostGeo, postMat);
  leftPost.position.set(-GOAL_WIDTH / 2, GOAL_HEIGHT / 2, 0);
  leftPost.castShadow = true;
  goal.add(leftPost);

  // Right post
  const rightPost = new THREE.Mesh(leftPostGeo, postMat);
  rightPost.position.set(GOAL_WIDTH / 2, GOAL_HEIGHT / 2, 0);
  rightPost.castShadow = true;
  goal.add(rightPost);

  // Crossbar
  const crossbarGeo = new THREE.CylinderGeometry(POST_RADIUS, POST_RADIUS, GOAL_WIDTH, 12);
  const crossbar = new THREE.Mesh(crossbarGeo, postMat);
  crossbar.rotation.z = Math.PI / 2;
  crossbar.position.set(0, GOAL_HEIGHT, 0);
  crossbar.castShadow = true;
  goal.add(crossbar);

  // Back support posts (angled)
  const backPostGeo = new THREE.CylinderGeometry(POST_RADIUS * 0.7, POST_RADIUS * 0.7, GOAL_DEPTH * 1.1, 8);
  const leftBack = new THREE.Mesh(backPostGeo, postMat);
  leftBack.position.set(-GOAL_WIDTH / 2, GOAL_HEIGHT * 0.5, -GOAL_DEPTH * 0.5);
  leftBack.rotation.x = Math.PI * 0.25;
  goal.add(leftBack);

  const rightBack = new THREE.Mesh(backPostGeo, postMat);
  rightBack.position.set(GOAL_WIDTH / 2, GOAL_HEIGHT * 0.5, -GOAL_DEPTH * 0.5);
  rightBack.rotation.x = Math.PI * 0.25;
  goal.add(rightBack);

  // === NET ===
  const net = createNet();
  goal.add(net);
  goal.userData.net = net;

  // Position goal at z=0
  goal.position.set(0, 0, 0);

  // Store dimensions for collision detection
  goal.userData.width = GOAL_WIDTH;
  goal.userData.height = GOAL_HEIGHT;
  goal.userData.depth = GOAL_DEPTH;
  goal.userData.postRadius = POST_RADIUS;

  return goal;
}

function createNet() {
  const netGroup = new THREE.Group();

  const netMat = new THREE.LineBasicMaterial({
    color: 0xcccccc,
    transparent: true,
    opacity: 0.6,
  });

  const netSegments = 20;
  const netDepthSegments = 8;

  // Create net as a grid of lines (back, sides, top)
  const createNetPanel = (vertices, indices) => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(vertices);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setIndex(indices);

    const lineSegments = [];
    // Generate line segments from grid
    const cols = netSegments + 1;
    const rows = netDepthSegments + 1;

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        // Horizontal lines
        if (j < cols - 1) {
          lineSegments.push(i * cols + j, i * cols + j + 1);
        }
        // Vertical lines
        if (i < rows - 1) {
          lineSegments.push(i * cols + j, (i + 1) * cols + j);
        }
      }
    }

    geometry.setIndex(lineSegments);
    return geometry;
  };

  // Back net panel
  const backVerts = [];
  for (let i = 0; i <= netDepthSegments; i++) {
    const y = (i / netDepthSegments) * GOAL_HEIGHT;
    for (let j = 0; j <= netSegments; j++) {
      const x = -GOAL_WIDTH / 2 + (j / netSegments) * GOAL_WIDTH;
      const z = -GOAL_DEPTH + (i / netDepthSegments) * 0.3; // slight curve
      backVerts.push(x, y, z);
    }
  }

  const backNetGeo = new THREE.BufferGeometry();
  backNetGeo.setAttribute('position', new THREE.Float32BufferAttribute(backVerts, 3));
  const backIndices = [];
  const cols = netSegments + 1;
  const rows = netDepthSegments + 1;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (j < cols - 1) backIndices.push(i * cols + j, i * cols + j + 1);
      if (i < rows - 1) backIndices.push(i * cols + j, (i + 1) * cols + j);
    }
  }
  backNetGeo.setIndex(backIndices);
  const backNet = new THREE.LineSegments(backNetGeo, netMat);
  netGroup.add(backNet);
  netGroup.userData.backNet = backNet;
  netGroup.userData.originalPositions = new Float32Array(backVerts);

  // Top net
  const topVerts = [];
  for (let i = 0; i <= 4; i++) {
    const z = -(i / 4) * GOAL_DEPTH;
    for (let j = 0; j <= netSegments; j++) {
      const x = -GOAL_WIDTH / 2 + (j / netSegments) * GOAL_WIDTH;
      topVerts.push(x, GOAL_HEIGHT, z);
    }
  }

  const topNetGeo = new THREE.BufferGeometry();
  topNetGeo.setAttribute('position', new THREE.Float32BufferAttribute(topVerts, 3));
  const topIndices = [];
  const topCols = netSegments + 1;
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < topCols; j++) {
      if (j < topCols - 1) topIndices.push(i * topCols + j, i * topCols + j + 1);
      topIndices.push(i * topCols + j, (i + 1) * topCols + j);
    }
  }
  topNetGeo.setIndex(topIndices);
  const topNet = new THREE.LineSegments(topNetGeo, netMat.clone());
  netGroup.add(topNet);

  // Side nets
  [-1, 1].forEach(side => {
    const sideVerts = [];
    for (let i = 0; i <= netDepthSegments; i++) {
      const y = (i / netDepthSegments) * GOAL_HEIGHT;
      for (let j = 0; j <= 4; j++) {
        const z = -(j / 4) * GOAL_DEPTH;
        sideVerts.push(side * GOAL_WIDTH / 2, y, z);
      }
    }

    const sideNetGeo = new THREE.BufferGeometry();
    sideNetGeo.setAttribute('position', new THREE.Float32BufferAttribute(sideVerts, 3));
    const sideIndices = [];
    const sCols = 5;
    for (let i = 0; i <= netDepthSegments; i++) {
      for (let j = 0; j < sCols; j++) {
        if (j < sCols - 1) sideIndices.push(i * sCols + j, i * sCols + j + 1);
        if (i < netDepthSegments) sideIndices.push(i * sCols + j, (i + 1) * sCols + j);
      }
    }
    sideNetGeo.setIndex(sideIndices);
    const sideNet = new THREE.LineSegments(sideNetGeo, netMat.clone());
    netGroup.add(sideNet);
  });

  return netGroup;
}

// Animate net ripple effect on ball impact
export function animateNet(goal, impactPoint, intensity = 1) {
  const net = goal.userData.net;
  if (!net || !net.userData.backNet) return;

  const backNet = net.userData.backNet;
  const posAttr = backNet.geometry.attributes.position;
  const original = net.userData.originalPositions;
  const time = { value: 0 };

  const animate = () => {
    time.value += 0.05;
    if (time.value > 2) {
      // Reset to original
      for (let i = 0; i < posAttr.count; i++) {
        posAttr.setXYZ(i, original[i * 3], original[i * 3 + 1], original[i * 3 + 2]);
      }
      posAttr.needsUpdate = true;
      return;
    }

    const decay = Math.exp(-time.value * 2) * intensity;

    for (let i = 0; i < posAttr.count; i++) {
      const ox = original[i * 3];
      const oy = original[i * 3 + 1];
      const oz = original[i * 3 + 2];

      // Distance from impact
      const dx = ox - impactPoint.x;
      const dy = oy - impactPoint.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Wave propagation
      const wave = Math.sin(dist * 3 - time.value * 8) * decay * 0.15;
      const zOffset = wave * Math.exp(-dist * 0.5);

      posAttr.setXYZ(i, ox, oy, oz - zOffset);
    }
    posAttr.needsUpdate = true;

    requestAnimationFrame(animate);
  };

  animate();
}

// Get post collision data
export function getPostColliders(goal) {
  const ud = goal.userData;
  return {
    leftPost: {
      start: new THREE.Vector3(-ud.width / 2, 0, 0),
      end: new THREE.Vector3(-ud.width / 2, ud.height, 0),
      radius: ud.postRadius + 0.35, // post radius + ball radius
    },
    rightPost: {
      start: new THREE.Vector3(ud.width / 2, 0, 0),
      end: new THREE.Vector3(ud.width / 2, ud.height, 0),
      radius: ud.postRadius + 0.35,
    },
    crossbar: {
      start: new THREE.Vector3(-ud.width / 2, ud.height, 0),
      end: new THREE.Vector3(ud.width / 2, ud.height, 0),
      radius: ud.postRadius + 0.35,
    }
  };
}

export { GOAL_WIDTH, GOAL_HEIGHT, GOAL_DEPTH };
