// src/physics.js - Fixed Timestep Physics, Swipe Input & Magnus Aerodynamics

import * as THREE from 'three';
import { COORDINATES, PHYSICS, GOAL_ZONES } from './constants.js';

const {
  BALL_RADIUS,
  POST_RADIUS,
  LEFT_POST_X,
  RIGHT_POST_X,
  CROSSBAR_Y,
  BALL_START
} = COORDINATES;

const {
  GRAVITY,
  AIR_DRAG,
  MAGNUS_FACTOR,
  MAX_DT,
  SUB_STEPS,
  MIN_SWIPE_PX,
  VZ_MIN,
  VZ_MAX,
  VY_MIN,
  VY_MAX,
  VX_MAX,
  OMEGA_MAX,
  POST_COLLISION_DIST,
  GOAL_INNER_X,
  GOAL_INNER_Y,
  NET_DEPTH_CLAMP,
  KEEPER_SAVE_Z_MAX,
  KEEPER_SAVE_Z_MIN,
  MISS_Z_LIMIT
} = PHYSICS;

// === RELIABLE SWIPE INPUT TRACKER ===
export class SwipeTracker {
  constructor(canvas) {
    this.canvas = canvas;
    this.isTracking = false;
    this.startX = 0;
    this.startY = 0;
    this.startTime = 0;
    this.path = [];
    this.lastProcessedSwipe = null;

    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);

    canvas.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
  }

  onPointerDown(e) {
    this.isTracking = true;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.startTime = performance.now();
    this.path = [{ x: e.clientX, y: e.clientY, time: this.startTime }];
  }

  onPointerMove(e) {
    if (!this.isTracking) return;
    const now = performance.now();
    this.path.push({ x: e.clientX, y: e.clientY, time: now });
    if (this.path.length > 60) this.path.shift();
  }

  onPointerUp(e) {
    if (!this.isTracking) return;
    this.isTracking = false;

    const endX = e.clientX;
    const endY = e.clientY;
    const endTime = performance.now();

    const dy = this.startY - endY; // Upward positive
    const dx = endX - this.startX;  // Right positive
    const dtSeconds = Math.max(0.04, (endTime - this.startTime) / 1000);

    // Require upward screen swipe (dy > 30px)
    if (dy < MIN_SWIPE_PX) {
      this.path = [];
      return;
    }

    const screenW = window.innerWidth;
    const screenH = window.innerHeight;

    // 1. Vertical speed & length -> Forward speed (vz: -16 to -27 m/s)
    const swipeSpeedPx = dy / dtSeconds;
    const normLen = Math.min(1.0, dy / (screenH * 0.45));
    const normSpeed = Math.min(1.0, Math.max(0, (swipeSpeedPx - 150) / 1600));
    const powerFactor = Math.min(1.0, Math.max(0, normLen * 0.5 + normSpeed * 0.5));

    const vz = THREE.MathUtils.lerp(VZ_MIN, VZ_MAX, powerFactor);

    // 2. Loft (vy: 3.5 to 8.8 m/s)
    const loftFactor = Math.min(1.0, normLen * 0.75 + normSpeed * 0.35);
    const vy = THREE.MathUtils.lerp(VY_MIN, VY_MAX, loftFactor);

    // 3. Horizontal swipe direction -> vx (-6.5 to +6.5 m/s)
    const normDx = Math.max(-1.0, Math.min(1.0, dx / (screenW * 0.32)));
    const vx = normDx * VX_MAX;

    // 4. Mid-swipe lateral deviation -> spin omegaY (-10 to +10 rad/s)
    const omegaY = this.calculateSpin(this.startX, this.startY, endX, endY);

    this.lastProcessedSwipe = {
      vx,
      vy,
      vz,
      omegaY,
      power: powerFactor,
      curve: omegaY / OMEGA_MAX
    };

    this.path = [];
  }

  calculateSpin(startX, startY, endX, endY) {
    if (this.path.length < 3) return 0;

    const lineDx = endX - startX;
    const lineDy = endY - startY;
    const lineLen = Math.hypot(lineDx, lineDy);
    if (lineLen < 20) return 0;

    let maxDeviation = 0;
    for (let i = 1; i < this.path.length - 1; i++) {
      const p = this.path[i];
      // Signed perpendicular distance from line
      const cross = (p.x - startX) * lineDy - (p.y - startY) * lineDx;
      const dist = cross / lineLen;
      if (Math.abs(dist) > Math.abs(maxDeviation)) {
        maxDeviation = dist;
      }
    }

    // Swiping bulging right (dist > 0) creates rightward spin, curling ball left
    const normDev = Math.max(-1.0, Math.min(1.0, -maxDeviation / 45.0));
    return normDev * OMEGA_MAX;
  }

  consumeSwipe() {
    const s = this.lastProcessedSwipe;
    this.lastProcessedSwipe = null;
    return s;
  }

  getActivePath() {
    return this.isTracking ? this.path : [];
  }

  destroy() {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
  }
}

// === BALL PHYSICS ENGINE ===
export class BallSimulation {
  constructor() {
    this.position = new THREE.Vector3(BALL_START.x, BALL_START.y, BALL_START.z);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.omegaY = 0; // Magnus spin rad/s

    this.isFlying = false;
    this.isInNet = false;
    this.hasHitPost = false;
    this.isSaved = false;
    this.outcomeTriggered = false;
    this.flightTime = 0;
  }

  launch(vx, vy, vz, omegaY) {
    this.position.set(BALL_START.x, BALL_START.y, BALL_START.z);
    this.velocity.set(vx, vy, vz);
    this.omegaY = omegaY;

    this.isFlying = true;
    this.isInNet = false;
    this.hasHitPost = false;
    this.isSaved = false;
    this.outcomeTriggered = false;
    this.flightTime = 0;
  }

  reset() {
    this.position.set(BALL_START.x, BALL_START.y, BALL_START.z);
    this.velocity.set(0, 0, 0);
    this.omegaY = 0;
    this.isFlying = false;
    this.isInNet = false;
    this.hasHitPost = false;
    this.isSaved = false;
    this.outcomeTriggered = false;
    this.flightTime = 0;
  }

  // Run sub-stepped physics frame
  step(rawDelta, postColliders, keeperColliders, onEvent) {
    if (!this.isFlying) return;

    // Fixed timestep clamp
    const dt = Math.min(rawDelta, MAX_DT);
    const subDt = dt / SUB_STEPS;

    for (let s = 0; s < SUB_STEPS; s++) {
      if (!this.isFlying) break;
      this.flightTime += subDt;

      // 1. Apply Gravity
      this.velocity.y -= GRAVITY * subDt;

      // 2. Apply Air Drag
      this.velocity.multiplyScalar(Math.max(0, 1.0 - AIR_DRAG * subDt));

      // 3. Apply Magnus Curve Force (ax = omegaY * vz * 0.045)
      if (Math.abs(this.omegaY) > 0.05 && !this.isInNet) {
        const ax = this.omegaY * this.velocity.z * MAGNUS_FACTOR;
        this.velocity.x += ax * subDt;
        // Gradual spin dampening
        this.omegaY *= Math.max(0, 1.0 - 0.15 * subDt);
      }

      // 4. Update Position
      this.position.addScaledVector(this.velocity, subDt);

      // 5. Decelerate if inside net
      if (this.isInNet) {
        this.velocity.multiplyScalar(0.85);
        if (this.position.z < NET_DEPTH_CLAMP) {
          this.position.z = NET_DEPTH_CLAMP;
          this.velocity.z = 0;
        }
      }

      // 6. Ground Collision (y = 0)
      if (this.position.y < BALL_RADIUS) {
        this.position.y = BALL_RADIUS;
        if (this.velocity.y < -1.0) {
          this.velocity.y = -this.velocity.y * 0.45; // Bounce
          this.velocity.x *= 0.85;
          this.velocity.z *= 0.85;
        } else {
          this.velocity.y = 0;
          this.velocity.x *= 0.94;
          this.velocity.z *= 0.94;
        }
      }

      // 7. Check Collisions & Outcomes (Sub-step accuracy avoids tunneling)
      this.checkCollisionsAndOutcomes(postColliders, keeperColliders, onEvent);
    }
  }

  checkCollisionsAndOutcomes(postColliders, keeperColliders, onEvent) {
    // A. Check Post / Crossbar Hit (Segment distance check at z = 0)
    if (!this.isInNet && !this.isSaved && Math.abs(this.position.z) < 0.6) {
      this.checkPostCollisions(postColliders, onEvent);
    }

    // B. Check Goalkeeper Save (when z is between 0.6 and -0.1)
    if (!this.isInNet && !this.isSaved && !this.outcomeTriggered) {
      if (this.position.z <= KEEPER_SAVE_Z_MAX && this.position.z >= KEEPER_SAVE_Z_MIN) {
        this.checkKeeperSaves(keeperColliders, onEvent);
      }
    }

    // C. Check Goal Scored (Ball crosses z <= 0 with |x| < 3.55 and y < 2.34 without being saved)
    if (!this.outcomeTriggered && !this.isSaved && this.position.z <= 0.0) {
      if (Math.abs(this.position.x) < GOAL_INNER_X &&
          this.position.y < GOAL_INNER_Y &&
          this.position.y >= BALL_RADIUS * 0.5) {
        this.isInNet = true;
        this.outcomeTriggered = true;
        if (onEvent) onEvent('GOAL', this.position.clone());
        return;
      }
    }

    // D. Check Miss (Ball wide, over bar, or stopped before goal)
    if (!this.outcomeTriggered && !this.isInNet && !this.isSaved) {
      if (this.position.z < MISS_Z_LIMIT) {
        this.outcomeTriggered = true;
        this.isFlying = false;
        if (onEvent) onEvent('MISS', { reason: 'wide_or_over' });
        return;
      }

      // Ball stopped dead before goal
      if (this.position.z > 0.5 && this.velocity.length() < 0.35 && this.flightTime > 1.2) {
        this.outcomeTriggered = true;
        this.isFlying = false;
        if (onEvent) onEvent('MISS', { reason: 'stopped' });
        return;
      }
    }
  }

  checkPostCollisions(postColliders, onEvent) {
    if (!postColliders) return;

    const posts = [postColliders.leftPost, postColliders.rightPost, postColliders.crossbar];

    for (const post of posts) {
      const segDir = new THREE.Vector3().subVectors(post.end, post.start);
      const segLen = segDir.length();
      segDir.normalize();

      const toBall = new THREE.Vector3().subVectors(this.position, post.start);
      const t = Math.max(0, Math.min(segLen, toBall.dot(segDir)));
      const closestPoint = post.start.clone().addScaledVector(segDir, t);

      const dist = this.position.distanceTo(closestPoint);
      if (dist < POST_COLLISION_DIST) {
        // Post hit!
        this.hasHitPost = true;
        const normal = new THREE.Vector3().subVectors(this.position, closestPoint).normalize();

        // Outward reflection with damping
        const dot = this.velocity.dot(normal);
        if (dot < 0) {
          this.velocity.subScaledVector(normal, 2 * dot);
          this.velocity.multiplyScalar(0.55);
        }

        // Push ball out of cylinder surface
        const overlap = POST_COLLISION_DIST - dist;
        this.position.addScaledVector(normal, overlap + 0.02);

        if (onEvent) onEvent('POST_HIT', closestPoint);
        break;
      }
    }
  }

  checkKeeperSaves(keeperColliders, onEvent) {
    if (!keeperColliders || keeperColliders.length === 0) return;

    for (const col of keeperColliders) {
      const dist = this.position.distanceTo(col.center);
      const threshold = BALL_RADIUS + col.radius;

      if (dist < threshold) {
        // SAVED! Deflect ball away
        this.isSaved = true;
        this.outcomeTriggered = true;

        const normal = new THREE.Vector3().subVectors(this.position, col.center).normalize();
        normal.z = Math.max(0.4, normal.z); // Deflect forward back towards pitch

        this.velocity.copy(normal.multiplyScalar(6.5));
        this.velocity.y = Math.max(2.0, this.velocity.y);

        if (onEvent) onEvent('SAVED', col.center);
        break;
      }
    }
  }
}

// === AI STRIKER LOGIC ===
export class AIStriker {
  constructor(difficulty = 0.5) {
    this.difficulty = difficulty;
  }

  generateShot() {
    // Pick one of the 6 zones with intelligent weighting
    const targetZone = GOAL_ZONES[Math.floor(Math.random() * GOAL_ZONES.length)];

    // Target coordinates around the zone
    const jitterX = (Math.random() - 0.5) * 0.6;
    const jitterY = (Math.random() - 0.5) * 0.4;
    const targetX = targetZone.x + jitterX;
    const targetY = Math.max(0.3, Math.min(2.2, targetZone.y + jitterY));

    // Distance to goal line is 11.0m
    const distanceZ = 11.0;
    const speedFactor = 0.55 + this.difficulty * 0.35 + Math.random() * 0.1;
    const vz = THREE.MathUtils.lerp(VZ_MIN, VZ_MAX, speedFactor); // e.g. -20 to -25 m/s

    // Time to reach goal plane: t = distance / |vz|
    const t = distanceZ / Math.abs(vz);

    // Required vx to land at targetX
    const vx = targetX / t;

    // Required vy taking gravity into account: targetY = 0.22 + vy * t - 0.5 * g * t^2
    const vy = (targetY - 0.22 + 0.5 * GRAVITY * t * t) / t;

    // Lateral spin
    const omegaY = (Math.random() - 0.5) * 8.0 * this.difficulty;

    return {
      vx,
      vy,
      vz,
      omegaY,
      targetZoneId: targetZone.id
    };
  }
}

// === AI GOALKEEPER LOGIC ===
export class AIKeeperDecision {
  constructor(difficulty = 0.5) {
    this.difficulty = difficulty;
  }

  chooseDiveZone(shotVx, shotVy, shotOmegaY) {
    // Predict where the shot is heading
    const isHigh = shotVy > 5.5;
    let col = 1; // Center
    if (shotVx < -1.8) col = 0; // Left
    else if (shotVx > 1.8) col = 2; // Right

    let bestZone = isHigh ? col : col + 3;

    // Difficulty probability check: does AI guess correctly?
    const correctGuessProb = 0.35 + this.difficulty * 0.45;
    if (Math.random() < correctGuessProb) {
      return bestZone;
    } else {
      // Wrong guess or late dive
      const randomZone = Math.floor(Math.random() * 6);
      return randomZone;
    }
  }

  getReactionDelay() {
    // 0.12s to 0.35s delay based on difficulty
    return THREE.MathUtils.lerp(0.32, 0.14, this.difficulty);
  }
}
