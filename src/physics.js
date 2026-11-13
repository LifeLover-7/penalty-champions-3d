// src/physics.js - Physics Engine: Magnus Effect, Collisions, Swipe Input

import * as THREE from 'three';

// === CONSTANTS ===
const GRAVITY = -9.81;
const AIR_RESISTANCE = 0.02;
const MAGNUS_COEFFICIENT = 0.000015;
const BALL_RADIUS = 0.35;
const GROUND_FRICTION = 0.7;
const RESTITUTION = 0.5;

// === SWIPE INPUT TRACKER ===
export class SwipeTracker {
  constructor(canvas) {
    this.canvas = canvas;
    this.isTracking = false;
    this.startPos = null;
    this.path = [];
    this.startTime = 0;
    this.currentPos = null;

    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);

    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerUp);
  }

  onPointerDown(e) {
    this.isTracking = true;
    this.startPos = { x: e.clientX, y: e.clientY };
    this.currentPos = { x: e.clientX, y: e.clientY };
    this.path = [{ x: e.clientX, y: e.clientY }];
    this.startTime = performance.now();
  }

  onPointerMove(e) {
    if (!this.isTracking) return;
    this.currentPos = { x: e.clientX, y: e.clientY };
    this.path.push({ x: e.clientX, y: e.clientY });
    // Keep path manageable
    if (this.path.length > 50) this.path.shift();
  }

  onPointerUp(e) {
    if (!this.isTracking) return;
    this.isTracking = false;
    const endTime = performance.now();
    const dt = (endTime - this.startTime) / 1000;

    // Calculate release velocity from last few points
    const recentPoints = this.path.slice(-5);
    if (recentPoints.length < 2) return;

    const last = recentPoints[recentPoints.length - 1];
    const first = recentPoints[0];
    const dx = last.x - first.x;
    const dy = last.y - first.y;
    const recentDt = dt * (recentPoints.length / this.path.length);

    this.lastSwipe = {
      startX: this.startPos.x,
      startY: this.startPos.y,
      endX: last.x,
      endY: last.y,
      dx: dx,
      dy: dy,
      duration: Math.max(recentDt, 0.05),
      velocityX: dx / Math.max(recentDt, 0.05),
      velocityY: dy / Math.max(recentDt, 0.05),
      totalDistance: this.calculatePathLength(),
      curve: this.calculateCurve(),
    };
  }

  calculatePathLength() {
    let length = 0;
    for (let i = 1; i < this.path.length; i++) {
      const dx = this.path[i].x - this.path[i - 1].x;
      const dy = this.path[i].y - this.path[i - 1].y;
      length += Math.sqrt(dx * dx + dy * dy);
    }
    return length;
  }

  calculateCurve() {
    // Calculate lateral curvature from the swipe path
    if (this.path.length < 3) return 0;

    const start = this.path[0];
    const end = this.path[this.path.length - 1];
    const midIdx = Math.floor(this.path.length / 2);
    const mid = this.path[midIdx];

    // Distance from midpoint to the straight line
    const lineDx = end.x - start.x;
    const lineDy = end.y - start.y;
    const lineLen = Math.sqrt(lineDx * lineDx + lineDy * lineDy);
    if (lineLen < 10) return 0;

    // Cross product for signed distance
    const cross = (mid.x - start.x) * lineDy - (mid.y - start.y) * lineDx;
    return cross / lineLen;
  }

  getLastSwipe() {
    const swipe = this.lastSwipe;
    this.lastSwipe = null;
    return swipe;
  }

  getActivePath() {
    return this.isTracking ? this.path : [];
  }

  destroy() {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerUp);
  }
}

// === BALL PHYSICS STATE ===
export class BallPhysics {
  constructor() {
    this.position = new THREE.Vector3(0, BALL_RADIUS, 11);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.angularVelocity = new THREE.Vector3(0, 0, 0); // spin
    this.isFlying = false;
    this.hasLanded = false;
    this.hitPost = false;
    this.hitKeeper = false;
    this.isGoal = false;
    this.time = 0;
  }

  shoot(power, aimX, aimY, curve) {
    // power: 0-1
    // aimX: -1 to 1 (horizontal aim)
    // aimY: 0 to 1 (vertical aim)
    // curve: -1 to 1 (lateral spin)

    const speed = 15 + power * 25; // 15-40 m/s
    const angleH = aimX * 0.5; // horizontal angle in radians
    const angleV = 0.1 + aimY * 0.35; // vertical angle

    this.velocity.set(
      Math.sin(angleH) * speed,
      Math.sin(angleV) * speed * 0.7,
      -Math.cos(angleH) * Math.cos(angleV) * speed
    );

    // Apply Magnus effect spin
    this.angularVelocity.set(
      curve * 15, // side spin (creates lateral curve)
      curve * 5,  // top spin component
      0
    );

    this.isFlying = true;
    this.hasLanded = false;
    this.hitPost = false;
    this.hitKeeper = false;
    this.isGoal = false;
    this.time = 0;
  }

  update(dt) {
    if (!this.isFlying || this.hasLanded) return;

    this.time += dt;

    // Apply gravity
    this.velocity.y += GRAVITY * dt;

    // Apply air resistance
    const speed = this.velocity.length();
    if (speed > 0) {
      const dragForce = this.velocity.clone().normalize().multiplyScalar(-AIR_RESISTANCE * speed * speed);
      this.velocity.add(dragForce.multiplyScalar(dt));
    }

    // Apply Magnus force: F = C * (ω × v)
    if (this.angularVelocity.length() > 0.1) {
      const magnusForce = new THREE.Vector3();
      magnusForce.crossVectors(this.angularVelocity, this.velocity);
      magnusForce.multiplyScalar(MAGNUS_COEFFICIENT * speed);
      this.velocity.add(magnusForce.multiplyScalar(dt * 60));

      // Spin decay
      this.angularVelocity.multiplyScalar(0.995);
    }

    // Update position
    this.position.add(this.velocity.clone().multiplyScalar(dt));

    // Ground collision
    if (this.position.y < BALL_RADIUS) {
      this.position.y = BALL_RADIUS;
      if (this.velocity.y < -1) {
        this.velocity.y = -this.velocity.y * RESTITUTION;
        this.velocity.x *= GROUND_FRICTION;
        this.velocity.z *= GROUND_FRICTION;
      } else {
        this.velocity.y = 0;
        // Rolling friction
        this.velocity.x *= 0.98;
        this.velocity.z *= 0.98;

        if (this.velocity.length() < 0.5) {
          this.hasLanded = true;
        }
      }
    }
  }

  // Check collision with cylindrical post/crossbar
  checkPostCollision(postStart, postEnd, postRadius) {
    const ballPos = this.position;
    const effectiveRadius = postRadius + BALL_RADIUS;

    // Find closest point on cylinder (segment) to ball
    const segDir = new THREE.Vector3().subVectors(postEnd, postStart);
    const segLen = segDir.length();
    segDir.normalize();

    const toBall = new THREE.Vector3().subVectors(ballPos, postStart);
    let t = toBall.dot(segDir);
    t = Math.max(0, Math.min(segLen, t));

    const closestPoint = postStart.clone().add(segDir.clone().multiplyScalar(t));
    const dist = ballPos.distanceTo(closestPoint);

    if (dist < effectiveRadius) {
      // Collision! Calculate reflection
      const normal = new THREE.Vector3().subVectors(ballPos, closestPoint).normalize();

      // Reflect velocity
      const dot = this.velocity.dot(normal);
      this.velocity.sub(normal.multiplyScalar(2 * dot));
      this.velocity.multiplyScalar(0.6); // energy loss

      // Push ball out of post
      const overlap = effectiveRadius - dist;
      this.position.add(normal.clone().multiplyScalar(overlap + 0.01));

      return true;
    }
    return false;
  }

  // Check collision with keeper (simplified box)
  checkKeeperCollision(keeperBounds) {
    const ballPos = this.position;

    const boxes = [keeperBounds.body, keeperBounds.leftHand, keeperBounds.rightHand];

    for (const box of boxes) {
      const dx = Math.abs(ballPos.x - box.center.x);
      const dy = Math.abs(ballPos.y - box.center.y);
      const dz = Math.abs(ballPos.z - box.center.z);

      const halfX = box.size.x / 2 + BALL_RADIUS;
      const halfY = box.size.y / 2 + BALL_RADIUS;
      const halfZ = box.size.z / 2 + BALL_RADIUS;

      if (dx < halfX && dy < halfY && dz < halfZ) {
        // Collision - reflect outward from keeper center
        const normal = new THREE.Vector3().subVectors(ballPos, box.center).normalize();
        const dot = this.velocity.dot(normal);
        if (dot < 0) {
          this.velocity.sub(normal.multiplyScalar(2 * dot));
          this.velocity.multiplyScalar(0.4);
        } else {
          // Ball is deflected
          this.velocity.multiplyScalar(0.3);
          this.velocity.add(normal.multiplyScalar(3));
        }

        // Push ball out
        this.position.add(normal.multiplyScalar(0.1));
        return true;
      }
    }
    return false;
  }

  // Check if ball crossed goal line between posts
  checkGoal(goalWidth, goalHeight) {
    if (this.position.z <= 0.2 && this.position.z >= -0.5) {
      if (Math.abs(this.position.x) < goalWidth / 2 - BALL_RADIUS &&
          this.position.y > 0 &&
          this.position.y < goalHeight - BALL_RADIUS * 0.5) {
        return true;
      }
    }
    return false;
  }

  // Check if ball went wide or over
  checkMissed(goalWidth, goalHeight) {
    if (this.position.z <= 0.5) {
      if (Math.abs(this.position.x) > goalWidth / 2 + 1) return 'wide';
      if (this.position.y > goalHeight + 1) return 'over';
      if (this.position.y < 0.1 && this.velocity.length() < 2) return 'saved_low';
    }
    // Ball stopped before reaching goal
    if (this.position.z > 2 && this.velocity.length() < 1 && this.time > 1) return 'weak';
    return null;
  }

  reset() {
    this.position.set(0, BALL_RADIUS, 11);
    this.velocity.set(0, 0, 0);
    this.angularVelocity.set(0, 0, 0);
    this.isFlying = false;
    this.hasLanded = false;
    this.hitPost = false;
    this.hitKeeper = false;
    this.isGoal = false;
    this.time = 0;
  }
}

// === AI SHOOTER ===
export class AIStriker {
  constructor(difficulty = 0.5) {
    this.difficulty = difficulty; // 0-1
  }

  getShot() {
    // AI generates a shot based on difficulty
    const accuracy = 0.3 + this.difficulty * 0.5; // 0.3 to 0.8
    const power = 0.5 + this.random() * 0.4;

    // Aim towards a corner based on difficulty
    let aimX, aimY;
    if (this.random() < accuracy) {
      // Good shot - towards corner
      aimX = (this.random() > 0.5 ? 1 : -1) * (0.5 + this.random() * 0.4);
      aimY = this.random() > 0.4 ? 0.6 + this.random() * 0.3 : this.random() * 0.4;
    } else {
      // Less accurate
      aimX = (this.random() - 0.5) * 1.2;
      aimY = this.random() * 0.7;
    }

    // Some curve
    const curve = (this.random() - 0.5) * this.difficulty * 0.8;

    return { power, aimX, aimY, curve };
  }

  random() {
    return Math.random();
  }
}

// === AI KEEPER ===
export class AIKeeper {
  constructor(difficulty = 0.5) {
    this.difficulty = difficulty;
  }

  getDiveDirection(shotAimX) {
    // Based on difficulty, keeper guesses correctly more often
    const guessAccuracy = 0.2 + this.difficulty * 0.5;

    let direction;
    if (Math.random() < guessAccuracy) {
      // Correct guess
      if (shotAimX < -0.2) direction = 'left';
      else if (shotAimX > 0.2) direction = 'right';
      else direction = 'center';
    } else {
      // Wrong guess
      const choices = ['left', 'right', 'center'];
      direction = choices[Math.floor(Math.random() * choices.length)];
    }

    return direction;
  }

  getReactionDelay() {
    // Higher difficulty = shorter delay
    return 0.15 + (1 - this.difficulty) * 0.25;
  }
}
