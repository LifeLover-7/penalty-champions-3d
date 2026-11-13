// src/goal.js - 3D Regulation Goal, Reactive Net & Interactive Dive Zones

import * as THREE from 'three';
import { COORDINATES, GOAL_ZONES } from './constants.js';

const {
  GOAL_WIDTH,
  GOAL_HEIGHT,
  GOAL_DEPTH,
  POST_RADIUS,
  LEFT_POST_X,
  RIGHT_POST_X,
  CROSSBAR_Y
} = COORDINATES;

export function createGoal() {
  const goalGroup = new THREE.Group();
  goalGroup.name = 'GoalGroup';

  // Bright white metallic material for posts
  const postMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.85,
    roughness: 0.20,
    emissive: 0x222222,
    emissiveIntensity: 0.2
  });

  const thinPostMat = new THREE.MeshStandardMaterial({
    color: 0xdddddd,
    metalness: 0.7,
    roughness: 0.3
  });

  // 1. Left Post
  const postGeo = new THREE.CylinderGeometry(POST_RADIUS, POST_RADIUS, GOAL_HEIGHT, 16);
  const leftPost = new THREE.Mesh(postGeo, postMaterial);
  leftPost.position.set(LEFT_POST_X, GOAL_HEIGHT / 2, 0);
  leftPost.castShadow = true;
  leftPost.receiveShadow = true;
  goalGroup.add(leftPost);

  // 2. Right Post
  const rightPost = new THREE.Mesh(postGeo, postMaterial);
  rightPost.position.set(RIGHT_POST_X, GOAL_HEIGHT / 2, 0);
  rightPost.castShadow = true;
  rightPost.receiveShadow = true;
  goalGroup.add(rightPost);

  // 3. Crossbar
  const crossbarGeo = new THREE.CylinderGeometry(POST_RADIUS, POST_RADIUS, GOAL_WIDTH, 16);
  const crossbar = new THREE.Mesh(crossbarGeo, postMaterial);
  crossbar.rotation.z = Math.PI / 2;
  crossbar.position.set(0, CROSSBAR_Y, 0);
  crossbar.castShadow = true;
  crossbar.receiveShadow = true;
  goalGroup.add(crossbar);

  // Corner Elbows (smooth rounded joint caps)
  const elbowGeo = new THREE.SphereGeometry(POST_RADIUS * 1.05, 16, 16);
  const leftElbow = new THREE.Mesh(elbowGeo, postMaterial);
  leftElbow.position.set(LEFT_POST_X, CROSSBAR_Y, 0);
  goalGroup.add(leftElbow);

  const rightElbow = new THREE.Mesh(elbowGeo, postMaterial);
  rightElbow.position.set(RIGHT_POST_X, CROSSBAR_Y, 0);
  goalGroup.add(rightElbow);

  // 4. Back Ground Supports (Ground level depth frame)
  const backDepthRadius = POST_RADIUS * 0.6;
  const depthBarGeo = new THREE.CylinderGeometry(backDepthRadius, backDepthRadius, GOAL_DEPTH, 12);

  // Left bottom bar (z from 0 to -GOAL_DEPTH)
  const leftBottomBar = new THREE.Mesh(depthBarGeo, thinPostMat);
  leftBottomBar.rotation.x = Math.PI / 2;
  leftBottomBar.position.set(LEFT_POST_X, backDepthRadius, -GOAL_DEPTH / 2);
  goalGroup.add(leftBottomBar);

  // Right bottom bar
  const rightBottomBar = new THREE.Mesh(depthBarGeo, thinPostMat);
  rightBottomBar.rotation.x = Math.PI / 2;
  rightBottomBar.position.set(RIGHT_POST_X, backDepthRadius, -GOAL_DEPTH / 2);
  goalGroup.add(rightBottomBar);

  // Back bottom bar
  const backBarGeo = new THREE.CylinderGeometry(backDepthRadius, backDepthRadius, GOAL_WIDTH, 12);
  const backBottomBar = new THREE.Mesh(backBarGeo, thinPostMat);
  backBottomBar.rotation.z = Math.PI / 2;
  backBottomBar.position.set(0, backDepthRadius, -GOAL_DEPTH);
  goalGroup.add(backBottomBar);

  // 5. Angled Back Stanchions (from top elbows down to back bottom)
  const stanchionLength = Math.sqrt(GOAL_DEPTH * GOAL_DEPTH + (CROSSBAR_Y - 0.6) * (CROSSBAR_Y - 0.6));
  const stanchionAngle = Math.atan2(GOAL_DEPTH, CROSSBAR_Y - 0.6);
  const stanchionGeo = new THREE.CylinderGeometry(backDepthRadius * 0.8, backDepthRadius * 0.8, stanchionLength, 8);

  const leftStanchion = new THREE.Mesh(stanchionGeo, thinPostMat);
  leftStanchion.position.set(LEFT_POST_X, (CROSSBAR_Y + 0.6) / 2, -GOAL_DEPTH / 2);
  leftStanchion.rotation.x = stanchionAngle;
  goalGroup.add(leftStanchion);

  const rightStanchion = new THREE.Mesh(stanchionGeo, thinPostMat);
  rightStanchion.position.set(RIGHT_POST_X, (CROSSBAR_Y + 0.6) / 2, -GOAL_DEPTH / 2);
  rightStanchion.rotation.x = stanchionAngle;
  goalGroup.add(rightStanchion);

  // 6. Reactive 3D Net
  const net = createNetMesh();
  goalGroup.add(net.mesh);
  goalGroup.userData.net = net;

  // 7. Interactive 6 Target Zones on Goal Plane (z = 0.02)
  const targetZones = createTargetZones();
  goalGroup.add(targetZones.group);
  goalGroup.userData.targetZones = targetZones;

  // Store metadata
  goalGroup.userData.width = GOAL_WIDTH;
  goalGroup.userData.height = GOAL_HEIGHT;
  goalGroup.userData.depth = GOAL_DEPTH;
  goalGroup.userData.postRadius = POST_RADIUS;

  return goalGroup;
}

// === REACTIVE NET MESH ===
function createNetMesh() {
  const group = new THREE.Group();
  group.name = 'NetGroup';

  const netMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    wireframe: true,
    transparent: true,
    opacity: 0.40,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  // Net Back Wall Plane
  const segmentsX = 24;
  const segmentsY = 16;
  const backNetGeo = new THREE.PlaneGeometry(GOAL_WIDTH, GOAL_HEIGHT, segmentsX, segmentsY);
  // Center plane so bottom is at y=0, top at y=GOAL_HEIGHT
  backNetGeo.translate(0, GOAL_HEIGHT / 2, -GOAL_DEPTH);

  const backNetMesh = new THREE.Mesh(backNetGeo, netMaterial);
  group.add(backNetMesh);

  // Save original positions for ripple physics
  const originalBackPositions = Float32Array.from(backNetGeo.attributes.position.array);

  // Net Top Roof
  const topSegmentsZ = 12;
  const topNetGeo = new THREE.PlaneGeometry(GOAL_WIDTH, GOAL_DEPTH, segmentsX, topSegmentsZ);
  topNetGeo.rotateX(Math.PI / 2);
  topNetGeo.translate(0, GOAL_HEIGHT, -GOAL_DEPTH / 2);
  const topNetMesh = new THREE.Mesh(topNetGeo, netMaterial);
  group.add(topNetMesh);

  // Net Left Side
  const leftNetGeo = new THREE.PlaneGeometry(GOAL_DEPTH, GOAL_HEIGHT, topSegmentsZ, segmentsY);
  leftNetGeo.rotateY(Math.PI / 2);
  leftNetGeo.translate(LEFT_POST_X, GOAL_HEIGHT / 2, -GOAL_DEPTH / 2);
  const leftNetMesh = new THREE.Mesh(leftNetGeo, netMaterial);
  group.add(leftNetMesh);

  // Net Right Side
  const rightNetGeo = new THREE.PlaneGeometry(GOAL_DEPTH, GOAL_HEIGHT, topSegmentsZ, segmentsY);
  rightNetGeo.rotateY(Math.PI / 2);
  rightNetGeo.translate(RIGHT_POST_X, GOAL_HEIGHT / 2, -GOAL_DEPTH / 2);
  const rightNetMesh = new THREE.Mesh(rightNetGeo, netMaterial);
  group.add(rightNetMesh);

  return {
    mesh: group,
    backNetMesh,
    originalBackPositions,
    animating: false,
    waveTime: 0,
    impactPos: new THREE.Vector3(),
    intensity: 0
  };
}

// Animate net ripple when hit by ball
export function animateNet(goal, impactPoint, intensity = 1.0) {
  const net = goal?.userData?.net;
  if (!net || !net.backNetMesh) return;

  net.animating = true;
  net.waveTime = 0;
  net.impactPos.copy(impactPoint);
  net.intensity = intensity;
}

export function updateNetAnimation(goal, dt) {
  const net = goal?.userData?.net;
  if (!net || !net.animating) return;

  net.waveTime += dt;
  const posAttr = net.backNetMesh.geometry.attributes.position;
  const orig = net.originalBackPositions;

  if (net.waveTime > 1.8) {
    // Reset back to rest
    for (let i = 0; i < posAttr.count; i++) {
      posAttr.setXYZ(i, orig[i * 3], orig[i * 3 + 1], orig[i * 3 + 2]);
    }
    posAttr.needsUpdate = true;
    net.animating = false;
    return;
  }

  const decay = Math.exp(-net.waveTime * 2.8) * net.intensity;
  const freq = 12.0;

  for (let i = 0; i < posAttr.count; i++) {
    const ox = orig[i * 3];
    const oy = orig[i * 3 + 1];
    const oz = orig[i * 3 + 2];

    const dx = ox - net.impactPos.x;
    const dy = oy - net.impactPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Dynamic wave ripples outward
    const wave = Math.sin(dist * 3.5 - net.waveTime * freq) * decay * 0.22;
    const zPush = wave * Math.exp(-dist * 0.4);

    // Displace backwards (negative Z)
    posAttr.setXYZ(i, ox, oy, oz - Math.max(0, zPush));
  }
  posAttr.needsUpdate = true;
}

// === INTERACTIVE 6 DIVE TARGET ZONES ON GOAL PLANE (z = 0.02) ===
function createTargetZones() {
  const group = new THREE.Group();
  group.name = 'GoalTargetZones';
  group.position.set(0, 0, 0.02);
  group.visible = false; // Hidden during striker turn

  const zoneMeshes = [];
  const colWidth = (GOAL_WIDTH - POST_RADIUS * 2) / 3; // ~2.37m
  const rowHeight = (GOAL_HEIGHT - POST_RADIUS) / 2;   // ~1.17m

  GOAL_ZONES.forEach(zone => {
    // Semi-transparent interactive quad
    const geo = new THREE.PlaneGeometry(colWidth * 0.94, rowHeight * 0.92);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(zone.x, zone.y, 0);
    mesh.userData = {
      zoneId: zone.id,
      zoneName: zone.name,
      isZoneMesh: true,
      baseColor: 0x00e5ff,
      hoverColor: 0xffea00,
      activeColor: 0x76ff03
    };

    // Edge outline for crisp target box appearance
    const edgesGeo = new THREE.EdgesGeometry(geo);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.75,
      linewidth: 2
    });
    const edgeLines = new THREE.LineSegments(edgesGeo, lineMat);
    mesh.add(edgeLines);
    mesh.userData.edgeLines = edgeLines;

    group.add(mesh);
    zoneMeshes.push(mesh);
  });

  return {
    group,
    zoneMeshes,
    hoveredZoneId: -1,
    selectedZoneId: -1,

    setVisible(visible) {
      group.visible = visible;
      if (!visible) {
        this.resetHighlights();
      }
    },

    setHover(zoneId) {
      if (this.hoveredZoneId === zoneId) return;
      this.hoveredZoneId = zoneId;
      zoneMeshes.forEach(m => {
        const isHovered = m.userData.zoneId === zoneId;
        const isSelected = m.userData.zoneId === this.selectedZoneId;
        if (isSelected) {
          m.material.color.setHex(m.userData.activeColor);
          m.material.opacity = 0.50;
        } else if (isHovered) {
          m.material.color.setHex(m.userData.hoverColor);
          m.material.opacity = 0.38;
        } else {
          m.material.color.setHex(m.userData.baseColor);
          m.material.opacity = 0.18;
        }
      });
    },

    setSelected(zoneId) {
      this.selectedZoneId = zoneId;
      zoneMeshes.forEach(m => {
        const isSelected = m.userData.zoneId === zoneId;
        if (isSelected) {
          m.material.color.setHex(m.userData.activeColor);
          m.material.opacity = 0.60;
          m.userData.edgeLines.material.color.setHex(m.userData.activeColor);
          m.userData.edgeLines.material.opacity = 1.0;
        } else {
          m.material.color.setHex(m.userData.baseColor);
          m.material.opacity = 0.12;
          m.userData.edgeLines.material.color.setHex(m.userData.baseColor);
          m.userData.edgeLines.material.opacity = 0.4;
        }
      });
    },

    resetHighlights() {
      this.hoveredZoneId = -1;
      this.selectedZoneId = -1;
      zoneMeshes.forEach(m => {
        m.material.color.setHex(m.userData.baseColor);
        m.material.opacity = 0.18;
        m.userData.edgeLines.material.color.setHex(m.userData.baseColor);
        m.userData.edgeLines.material.opacity = 0.75;
      });
    },

    updatePulse(time) {
      if (!group.visible) return;
      const pulse = (Math.sin(time * 5) + 1) * 0.5; // 0 to 1
      zoneMeshes.forEach(m => {
        if (m.userData.zoneId !== this.selectedZoneId) {
          m.userData.edgeLines.material.opacity = 0.5 + pulse * 0.45;
        }
      });
    }
  };
}

// Cylindrical Post Colliders
export function getPostColliders() {
  return {
    leftPost: {
      start: new THREE.Vector3(LEFT_POST_X, 0, 0),
      end: new THREE.Vector3(LEFT_POST_X, GOAL_HEIGHT, 0),
      radius: POST_RADIUS
    },
    rightPost: {
      start: new THREE.Vector3(RIGHT_POST_X, 0, 0),
      end: new THREE.Vector3(RIGHT_POST_X, GOAL_HEIGHT, 0),
      radius: POST_RADIUS
    },
    crossbar: {
      start: new THREE.Vector3(LEFT_POST_X, CROSSBAR_Y, 0),
      end: new THREE.Vector3(RIGHT_POST_X, CROSSBAR_Y, 0),
      radius: POST_RADIUS
    }
  };
}
