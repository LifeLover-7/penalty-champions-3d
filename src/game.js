// src/game.js - Strict State Machine, Unified Turn Loop & Interactive Gameplay

import * as THREE from 'three';
import confetti from 'canvas-confetti';
import { COORDINATES, STATES, GOAL_ZONES } from './constants.js';
import { createScene } from './scene.js';
import { createGoal, animateNet, updateNetAnimation, getPostColliders } from './goal.js';
import { createBall, createBallTrail } from './ball.js';
import { createGoalkeeper, updateGoalkeeper, getKeeperColliders } from './goalkeeper.js';
import { SwipeTracker, BallSimulation, AIStriker, AIKeeperDecision } from './physics.js';
import {
  initAudio,
  playKick,
  playWhistle,
  playPostHit,
  playNetSwish,
  playCrowdCheer,
  playCrowdGroan,
  playSave
} from './audio.js';
import { GameUI } from './ui.js';

const {
  STRIKER_CAMERA,
  GOALKEEPER_CAMERA,
  BALL_START,
  KEEPER_START,
  BALL_RADIUS
} = COORDINATES;

export class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.state = STATES.MENU;
    this.clock = new THREE.Clock();

    // Timer management to prevent overlapping turns
    this.activeTimers = new Set();

    // Score & Match Progression
    this.maxRounds = 5;
    this.currentRound = 1;
    this.playerScore = 0;
    this.aiScore = 0;
    this.playerResults = [];
    this.aiResults = [];
    this.difficulty = 0.55;

    // Three.js Core
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.camTargetPos = new THREE.Vector3(STRIKER_CAMERA.position.x, STRIKER_CAMERA.position.y, STRIKER_CAMERA.position.z);
    this.camLookAt = new THREE.Vector3(STRIKER_CAMERA.target.x, STRIKER_CAMERA.target.y, STRIKER_CAMERA.target.z);
    this.currentLookAt = new THREE.Vector3(STRIKER_CAMERA.target.x, STRIKER_CAMERA.target.y, STRIKER_CAMERA.target.z);
    this.screenShake = 0;

    // Entities
    this.goal = null;
    this.ball = null;
    this.ballTrail = null;
    this.aiKeeper = null;     // Defends when player shoots
    this.playerKeeper = null; // Defends when AI shoots

    // Physics & AI
    this.ballPhysics = new BallSimulation();
    this.swipeTracker = null;
    this.aiStriker = new AIStriker(this.difficulty);
    this.aiKeeperLogic = new AIKeeperDecision(this.difficulty);

    // Raycaster for 3D Goal Target Zones
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    // UI Controller
    this.ui = new GameUI();

    this.init();
  }

  // === SAFE TIMER UTILITIES ===
  setManagedTimeout(callback, ms) {
    const timerId = setTimeout(() => {
      this.activeTimers.delete(timerId);
      callback();
    }, ms);
    this.activeTimers.add(timerId);
    return timerId;
  }

  clearAllTimers() {
    for (const timerId of this.activeTimers) {
      clearTimeout(timerId);
    }
    this.activeTimers.clear();
  }

  // === INITIALIZATION ===
  init() {
    // 1. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    // 2. Perspective Camera
    this.camera = new THREE.PerspectiveCamera(
      48,
      window.innerWidth / window.innerHeight,
      0.1,
      150
    );
    this.camera.position.set(STRIKER_CAMERA.position.x, STRIKER_CAMERA.position.y, STRIKER_CAMERA.position.z);
    this.camera.lookAt(this.camLookAt);

    // 3. Crisp Stadium Scene
    this.scene = createScene();

    // 4. Regulation 3D Goal & Interactive Target Zones
    this.goal = createGoal();
    this.scene.add(this.goal);

    // 5. Ball & Dynamic Ground Shadow
    this.ball = createBall(this.scene);
    this.ballTrail = createBallTrail(this.scene);

    // 6. Goalkeepers (One AI Neon Yellow, One Player Cyan)
    this.aiKeeper = createGoalkeeper(false);
    this.scene.add(this.aiKeeper);

    this.playerKeeper = createGoalkeeper(true);
    this.playerKeeper.visible = false;
    this.scene.add(this.playerKeeper);

    // 7. Swipe Input Tracker
    this.swipeTracker = new SwipeTracker(this.canvas);

    // 8. Event Listeners
    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('pointermove', (e) => this.onPointerMove(e));
    this.canvas.addEventListener('click', (e) => this.onCanvasClick(e));

    this.ui.onStart(() => this.startGame());
    this.ui.onReplay(() => this.restartGame());
    this.ui.onZoneSelect((zoneId) => this.onZoneSelected(zoneId));

    // Show initial Start Menu
    this.state = STATES.MENU;
    this.ui.showStartScreen();

    // Start Animation Loop
    this.animate();
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.ui.resizeTrailCanvas();
  }

  // === RAYCASTING FOR 3D CLICKABLE GOAL ZONES ===
  onPointerMove(e) {
    if (this.state !== STATES.AI_READY) return;

    this.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const zones = this.goal.userData.targetZones;
    if (!zones) return;

    const intersects = this.raycaster.intersectObjects(zones.zoneMeshes, false);
    if (intersects.length > 0) {
      const zoneId = intersects[0].object.userData.zoneId;
      zones.setHover(zoneId);
      this.canvas.style.cursor = 'pointer';
    } else {
      zones.setHover(-1);
      this.canvas.style.cursor = 'default';
    }
  }

  onCanvasClick(e) {
    if (this.state !== STATES.AI_READY) return;

    this.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const zones = this.goal.userData.targetZones;
    if (!zones) return;

    const intersects = this.raycaster.intersectObjects(zones.zoneMeshes, false);
    if (intersects.length > 0) {
      const zoneId = intersects[0].object.userData.zoneId;
      this.onZoneSelected(zoneId);
    }
  }

  // === MATCH FLOW & LIFECYCLE ===
  startGame() {
    initAudio();
    this.clearAllTimers();
    this.ui.hideStartScreen();
    this.resetMatchData();
    playWhistle();
    this.enterPlayerAimState();
  }

  restartGame() {
    initAudio();
    this.clearAllTimers();
    this.ui.hideEndScreen();
    this.resetMatchData();
    playWhistle();
    this.enterPlayerAimState();
  }

  resetMatchData() {
    this.currentRound = 1;
    this.playerScore = 0;
    this.aiScore = 0;
    this.playerResults = [];
    this.aiResults = [];

    this.ui.updateScore(0, 0);
    this.ui.updateRound(1, false);
    this.ui.resetDots();

    this.resetFieldPositions();
  }

  resetFieldPositions() {
    this.ballPhysics.reset();
    this.ball.resetTransform();
    this.ballTrail.reset();

    this.aiKeeper.resetToIdle();
    this.playerKeeper.resetToIdle();

    if (this.goal.userData.targetZones) {
      this.goal.userData.targetZones.setVisible(false);
    }
  }

  // === 1. PLAYER STRIKER TURN (STATE: PLAYER_AIM) ===
  enterPlayerAimState() {
    this.state = STATES.PLAYER_AIM;
    this.resetFieldPositions();

    // Camera at Striker Camera: (0, 2.3, 15.8) looking at (0, 1.2, 0)
    this.camTargetPos.set(STRIKER_CAMERA.position.x, STRIKER_CAMERA.position.y, STRIKER_CAMERA.position.z);
    this.camLookAt.set(STRIKER_CAMERA.target.x, STRIKER_CAMERA.target.y, STRIKER_CAMERA.target.z);

    // Active Goalkeeper is AI Keeper
    this.aiKeeper.visible = true;
    this.playerKeeper.visible = false;

    // Hide dive target zones
    this.goal.userData.targetZones.setVisible(false);
    this.ui.hideZoneSelector();

    // HUD indications
    this.ui.showRole('shoot');
    this.ui.showMessage('SWIPE UP TO SHOOT!', 1600, '#4fc3f7');
  }

  // === 2. PLAYER BALL IN FLIGHT (STATE: BALL_IN_FLIGHT) ===
  launchPlayerShot(swipe) {
    if (this.state !== STATES.PLAYER_AIM) return;

    this.state = STATES.BALL_IN_FLIGHT;
    this.ui.hideRole();
    this.ui.clearTrail();
    this.ui.showPowerMeter(swipe.power, swipe.curve);

    playKick();

    // Launch Ball Simulation
    this.ballPhysics.launch(swipe.vx, swipe.vy, swipe.vz, swipe.omegaY);

    // AI Goalkeeper reaction logic
    const diveZone = this.aiKeeperLogic.chooseDiveZone(swipe.vx, swipe.vy, swipe.omegaY);
    const delay = this.aiKeeperLogic.getReactionDelay();

    this.setManagedTimeout(() => {
      if (this.state === STATES.BALL_IN_FLIGHT) {
        this.aiKeeper.startDive(diveZone);
      }
    }, delay * 1000);
  }

  // === 3. AI STRIKER TURN (STATE: AI_READY - Player is Goalkeeper) ===
  enterAIReadyState() {
    this.state = STATES.AI_READY;
    this.resetFieldPositions();

    // Camera at Goalkeeper Camera: (0, 2.6, 15.0) looking at (0, 1.2, 0)
    this.camTargetPos.set(GOALKEEPER_CAMERA.position.x, GOALKEEPER_CAMERA.position.y, GOALKEEPER_CAMERA.position.z);
    this.camLookAt.set(GOALKEEPER_CAMERA.target.x, GOALKEEPER_CAMERA.target.y, GOALKEEPER_CAMERA.target.z);

    // Active Goalkeeper is Player Keeper (Cyan)
    this.playerKeeper.visible = true;
    this.aiKeeper.visible = false;

    // Show 6 Glowing Clickable Target Zones on the Goal Plane
    this.goal.userData.targetZones.setVisible(true);
    this.ui.showZoneSelector();

    this.ui.showRole('save');
    this.ui.showMessage('CHOOSE YOUR DIVE ZONE!', 1800, '#00e5ff');

    // Pre-generate AI shot
    this.pendingAIShot = this.aiStriker.generateShot();

    // Fallback auto-dive timer if user doesn't pick within 3.5s
    this.autoDiveTimer = this.setManagedTimeout(() => {
      if (this.state === STATES.AI_READY) {
        const randomZone = Math.floor(Math.random() * 6);
        this.onZoneSelected(randomZone);
      }
    }, 3500);
  }

  onZoneSelected(zoneId) {
    if (this.state !== STATES.AI_READY) return;

    // Clear auto timer
    if (this.autoDiveTimer) {
      clearTimeout(this.autoDiveTimer);
      this.activeTimers.delete(this.autoDiveTimer);
    }

    // Lock chosen zone
    this.goal.userData.targetZones.setSelected(zoneId);
    this.ui.setZoneSelected(zoneId);
    this.canvas.style.cursor = 'default';

    // Player keeper begins dive
    this.playerKeeper.startDive(zoneId);

    // AI launches shot after a split-second delay (0.15s)
    this.setManagedTimeout(() => {
      this.launchAIShot();
    }, 150);
  }

  launchAIShot() {
    this.state = STATES.AI_SHOT_IN_FLIGHT;
    this.ui.hideRole();
    this.ui.hideZoneSelector();

    const shot = this.pendingAIShot || this.aiStriker.generateShot();
    playKick();

    this.ballPhysics.launch(shot.vx, shot.vy, shot.vz, shot.omegaY);
  }

  // === OUTCOME HANDLING (TRIGGERED ONCE PER SHOT) ===
  handlePhysicsEvent(eventType, eventData) {
    if (this.state !== STATES.BALL_IN_FLIGHT && this.state !== STATES.AI_SHOT_IN_FLIGHT) return;

    const isPlayerShooting = (this.state === STATES.BALL_IN_FLIGHT);

    if (eventType === 'POST_HIT') {
      playPostHit();
      this.screenShake = 0.28;
      return; // Ball continues trajectory after deflection
    }

    if (eventType === 'SAVED') {
      playSave();
      this.enterRoundResultState(isPlayerShooting, false, 'SAVED!');
      return;
    }

    if (eventType === 'GOAL') {
      playNetSwish();
      this.setManagedTimeout(() => playCrowdCheer(), 180);

      // Ripple net at impact point
      animateNet(this.goal, eventData, 1.2);

      // Check for top-shelf corner goal
      const isTopBins = eventData.y > 1.8 && Math.abs(eventData.x) > 2.3;
      const text = isTopBins ? 'TOP BINS! 🔥' : 'GOAL! ⚽';

      if (isPlayerShooting) {
        confetti({
          particleCount: 120,
          spread: 75,
          origin: { y: 0.6 }
        });
      }

      this.enterRoundResultState(isPlayerShooting, true, text);
      return;
    }

    if (eventType === 'MISS') {
      playCrowdGroan();
      const missText = this.ballPhysics.hasHitPost ? 'OFF THE POST!' : 'OFF TARGET!';
      this.enterRoundResultState(isPlayerShooting, false, missText);
      return;
    }
  }

  enterRoundResultState(isPlayerShooting, scored, message) {
    this.state = STATES.ROUND_RESULT;
    this.ui.hidePowerMeter();

    // Update Scores & Result Dots
    if (isPlayerShooting) {
      if (scored) {
        this.playerScore++;
        this.playerResults.push('goal');
      } else {
        this.playerResults.push('miss');
      }
    } else {
      if (scored) {
        this.aiScore++;
        this.aiResults.push('goal');
      } else {
        this.aiResults.push('miss');
      }
    }

    this.ui.updateScore(this.playerScore, this.aiScore);
    this.ui.updateDots(this.playerResults, this.aiResults);

    // Message color
    const msgColor = isPlayerShooting
      ? (scored ? '#76ff03' : '#ff5252')
      : (scored ? '#ff5252' : '#76ff03'); // If CPU scores, red for player; if saved, green

    this.ui.showMessage(message, 1900, msgColor);

    // Keeper celebration/dejection reaction
    const activeKeeper = isPlayerShooting ? this.aiKeeper : this.playerKeeper;
    if (scored) {
      activeKeeper.setDejected();
    } else {
      activeKeeper.setCelebrate();
    }

    // Advance to next turn after 2.2s delay
    this.setManagedTimeout(() => {
      this.advanceTurn(isPlayerShooting);
    }, 2200);
  }

  advanceTurn(justFinishedPlayerShot) {
    if (justFinishedPlayerShot) {
      // Half-round complete: Now AI shoots, Player saves
      this.enterAIReadyState();
    } else {
      // Full round complete: Both have shot!
      const isSuddenDeath = this.currentRound >= this.maxRounds;

      if (!isSuddenDeath) {
        // Regular 5-round check for early mathematical knockout
        const roundsRemaining = this.maxRounds - this.currentRound;
        if (this.playerScore > this.aiScore + roundsRemaining ||
            this.aiScore > this.playerScore + roundsRemaining) {
          this.endMatch();
          return;
        }

        this.currentRound++;
        this.ui.updateRound(this.currentRound, false);
        this.enterPlayerAimState();
      } else {
        // Sudden death progression
        if (this.playerScore !== this.aiScore) {
          this.endMatch();
        } else {
          // Still tied in sudden death, advance another round
          this.currentRound++;
          this.ui.updateRound(this.currentRound, true);
          this.enterPlayerAimState();
        }
      }
    }
  }

  endMatch() {
    this.state = STATES.MATCH_OVER;
    const playerWon = this.playerScore > this.aiScore;

    this.ui.showEndScreen(this.playerScore, this.aiScore, playerWon);

    if (playerWon) {
      confetti({ particleCount: 160, spread: 80, origin: { y: 0.55 } });
      this.setManagedTimeout(() => {
        confetti({ particleCount: 100, angle: 60, spread: 55, origin: { x: 0.1, y: 0.6 } });
        confetti({ particleCount: 100, angle: 120, spread: 55, origin: { x: 0.9, y: 0.6 } });
      }, 400);
    }
  }

  // === MAIN UPDATE & RENDER LOOP ===
  update(dt) {
    // 1. Camera interpolation
    this.camera.position.lerp(this.camTargetPos, 0.06);
    this.currentLookAt.lerp(this.camLookAt, 0.08);
    this.camera.lookAt(this.currentLookAt);

    // Screen Shake decay
    if (this.screenShake > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.screenShake;
      this.camera.position.y += (Math.random() - 0.5) * this.screenShake;
      this.screenShake *= 0.88;
      if (this.screenShake < 0.01) this.screenShake = 0;
    }

    // 2. Update Net Wave Animation
    updateNetAnimation(this.goal, dt);

    // 3. Pulse 3D Goal Target Zones during AI_READY
    if (this.state === STATES.AI_READY && this.goal.userData.targetZones) {
      this.goal.userData.targetZones.updatePulse(this.clock.getElapsedTime());
    }

    // 4. Update Goalkeepers
    if (this.aiKeeper.visible) {
      updateGoalkeeper(this.aiKeeper, dt);
    }
    if (this.playerKeeper.visible) {
      updateGoalkeeper(this.playerKeeper, dt);
    }

    // 5. Physics Sub-stepping
    if (this.state === STATES.BALL_IN_FLIGHT || this.state === STATES.AI_SHOT_IN_FLIGHT) {
      const activeKeeper = (this.state === STATES.BALL_IN_FLIGHT) ? this.aiKeeper : this.playerKeeper;
      const keeperColliders = getKeeperColliders(activeKeeper);
      const postColliders = getPostColliders();

      this.ballPhysics.step(dt, postColliders, keeperColliders, (eventType, data) => {
        this.handlePhysicsEvent(eventType, data);
      });

      // Update 3D Ball mesh, dynamic ground shadow, and spin
      this.ball.updateTransform(
        this.ballPhysics.position,
        this.ballPhysics.velocity,
        dt,
        this.ballPhysics.omegaY
      );

      // Update ball flight trail
      this.ballTrail.update(this.ballPhysics.position);
    }

    // 6. Swipe Input & Aim Trail during PLAYER_AIM
    if (this.state === STATES.PLAYER_AIM) {
      const activePath = this.swipeTracker.getActivePath();
      this.ui.drawAimTrail(activePath, activePath.length > 1);

      const swipe = this.swipeTracker.consumeSwipe();
      if (swipe) {
        this.launchPlayerShot(swipe);
      }
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const dt = Math.min(this.clock.getDelta(), 0.033);
    this.update(dt);
    this.renderer.render(this.scene, this.camera);
  }
}
