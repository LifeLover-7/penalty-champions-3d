// src/game.js - Game State Machine & Logic

import * as THREE from 'three';
import confetti from 'canvas-confetti';
import { createScene } from './scene.js';
import { createBall, createBallTrail } from './ball.js';
import { createGoalkeeper, updateGoalkeeper, getKeeperBounds } from './goalkeeper.js';
import { createGoal, animateNet, getPostColliders } from './goal.js';
import { SwipeTracker, BallPhysics, AIStriker, AIKeeper } from './physics.js';
import { initAudio, playKick, playWhistle, playPostHit, playNetSwish, playCrowdCheer, playCrowdGroan, playSave } from './audio.js';
import { GameUI } from './ui.js';

// Game states
const STATE = {
  WAITING: 'waiting',        // Waiting for player input
  PLAYER_SHOOTING: 'player_shooting',
  BALL_FLYING_PLAYER: 'ball_flying_player',
  AI_SHOOTING_PREP: 'ai_shooting_prep',
  BALL_FLYING_AI: 'ball_flying_ai',
  RESULT_DISPLAY: 'result_display',
  GAME_OVER: 'game_over',
};

export class Game {
  constructor() {
    // Core
    this.canvas = document.getElementById('game-canvas');
    this.state = STATE.WAITING;
    this.clock = new THREE.Clock();

    // Game settings
    this.difficulty = 0.5;
    this.maxRounds = 5;
    this.currentRound = 1;
    this.playerScore = 0;
    this.aiScore = 0;
    this.playerResults = [];
    this.aiResults = [];
    this.isPlayerTurnShoot = true; // alternates each sub-round

    // 3D Objects
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.ball = null;
    this.ballTrail = null;
    this.goal = null;
    this.playerKeeper = null; // keeper the player controls (when saving)
    this.aiKeeper = null;     // keeper the AI controls (when player shoots)
    this.aiStrikerKeeper = null; // visual keeper for AI when player is keeper

    // Physics
    this.ballPhysics = new BallPhysics();
    this.swipeTracker = null;
    this.aiStriker = new AIStriker(this.difficulty);
    this.aiKeeperLogic = new AIKeeper(this.difficulty);

    // UI
    this.ui = new GameUI();

    // Camera animation
    this.cameraTarget = new THREE.Vector3(0, 2, 5);
    this.cameraPosition = new THREE.Vector3(0, 3, 20);
    this.shakeIntensity = 0;
    this.slowMo = 1;

    // AI shot tracking
    this.currentAIShot = null;
    this.playerDiveZone = -1;
    this.keeperDiveTimer = 0;

    this.init();
  }

  init() {
    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    // Camera
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.set(0, 3, 20);
    this.camera.lookAt(0, 1.5, 0);

    // Scene
    this.scene = createScene();

    // Ball
    this.ball = createBall();
    this.scene.add(this.ball);
    this.ballTrail = createBallTrail();
    this.scene.add(this.ballTrail.mesh);

    // Goal
    this.goal = createGoal();
    this.scene.add(this.goal);

    // Keepers
    this.aiKeeper = createGoalkeeper(false); // AI keeper defends when player shoots
    this.aiKeeper.position.z = 0.5;
    this.scene.add(this.aiKeeper);

    this.playerKeeper = createGoalkeeper(true); // Player's keeper (used in AI shot visuals)
    this.playerKeeper.position.z = 0.5;
    this.playerKeeper.visible = true;
    this.scene.add(this.playerKeeper);

    // Swipe tracker
    this.swipeTracker = new SwipeTracker(this.canvas);

    // UI events
    this.ui.onStart(() => this.startGame());
    this.ui.onReplay(() => this.restartGame());
    this.ui.onZoneSelect((zone) => this.onZoneSelected(zone));

    // Window resize
    window.addEventListener('resize', () => this.onResize());

    // Show start screen
    this.ui.showStartScreen();

    // Start render loop
    this.animate();
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  startGame() {
    initAudio();
    this.ui.hideStartScreen();
    this.resetGameState();
    playWhistle();
    this.startPlayerShootTurn();
  }

  restartGame() {
    this.ui.hideEndScreen();
    this.resetGameState();
    playWhistle();
    this.startPlayerShootTurn();
  }

  resetGameState() {
    this.currentRound = 1;
    this.playerScore = 0;
    this.aiScore = 0;
    this.playerResults = [];
    this.aiResults = [];
    this.isPlayerTurnShoot = true;
    this.ui.updateScore(0, 0);
    this.ui.updateRound(1);
    this.ui.updateDots([], []);
    this.ballPhysics.reset();
    this.resetPositions();
  }

  resetPositions() {
    this.ballPhysics.reset();
    this.ball.position.copy(this.ballPhysics.position);
    this.ball.rotation.set(0, 0, 0);
    this.ballTrail.reset();

    // Reset keepers
    this.aiKeeper.position.set(0, 0, 0.5);
    this.aiKeeper.rotation.set(0, 0, 0);
    this.aiKeeper.userData.animTime = 0;
    this.aiKeeper.userData.animState = 'idle';

    this.playerKeeper.position.set(0, 0, 0.5);
    this.playerKeeper.rotation.set(0, 0, 0);
    this.playerKeeper.userData.animTime = 0;
    this.playerKeeper.userData.animState = 'idle';
  }

  // === PLAYER SHOOTING TURN ===
  startPlayerShootTurn() {
    this.state = STATE.WAITING;
    this.isPlayerTurnShoot = true;
    this.resetPositions();

    // Show AI keeper
    this.aiKeeper.visible = true;
    this.aiKeeper.userData.animTime = 0;

    // Camera behind ball
    this.setCameraForShooter();

    this.ui.showRole('shoot');
    this.ui.hideZoneSelector();
    this.ui.showMessage('SWIPE TO SHOOT!', 2000, '#4fc3f7');
  }

  // === PLAYER SAVING TURN ===
  startPlayerSaveTurn() {
    this.state = STATE.AI_SHOOTING_PREP;
    this.isPlayerTurnShoot = false;
    this.resetPositions();

    // Show player keeper
    this.playerKeeper.visible = true;
    this.playerKeeper.userData.animTime = 0;

    // Camera behind keeper
    this.setCameraForKeeper();

    this.ui.showRole('save');
    this.ui.showZoneSelector();
    this.ui.showMessage('CHOOSE YOUR DIVE!', 2000, '#ff8a65');

    // AI generates shot after a brief delay
    this.currentAIShot = this.aiStriker.getShot();

    // Show ball being placed
    setTimeout(() => {
      if (this.state === STATE.AI_SHOOTING_PREP) {
        this.fireAIShot();
      }
    }, 2500);
  }

  fireAIShot() {
    this.state = STATE.BALL_FLYING_AI;
    this.ui.hideZoneSelector();

    const shot = this.currentAIShot;
    this.ballPhysics.position.set(0, 0.35, 15);
    this.ballPhysics.shoot(shot.power, shot.aimX, shot.aimY, shot.curve);

    playKick();

    // Determine keeper dive
    this.playerDiveZone = this.playerDiveZone >= 0 ? this.playerDiveZone : Math.floor(Math.random() * 6);
    this.applyKeeperDive(this.playerKeeper, this.playerDiveZone);
  }

  onZoneSelected(zone) {
    if (this.state !== STATE.AI_SHOOTING_PREP) return;
    this.playerDiveZone = zone;
    this.ui.hideZoneSelector();
    this.ui.showMessage('DIVING!', 800, '#ff8a65');
  }

  // === CAMERA POSITIONS ===
  setCameraForShooter() {
    this.cameraTarget.set(0, 1.5, 0);
    this.cameraPosition.set(0, 2.5, 19);
  }

  setCameraForKeeper() {
    this.cameraTarget.set(0, 1.5, 8);
    this.cameraPosition.set(0, 3, -4);
  }

  setCameraForShotFollow() {
    this.cameraTarget.set(0, 1.5, 3);
    this.cameraPosition.set(2, 4, 14);
  }

  // === KEEPER DIVE LOGIC ===
  applyKeeperDive(keeper, zone) {
    // Zones: 0=TL, 1=TC, 2=TR, 3=BL, 4=BC, 5=BR
    keeper.userData.animTime = 0;
    if (zone <= 2) {
      // High dive
      if (zone === 0) {
        keeper.userData.animState = 'dive_left';
        keeper.userData.diveDirection = -1;
        keeper.userData.diveHeight = 1;
      } else if (zone === 1) {
        keeper.userData.animState = 'dive_center';
      } else {
        keeper.userData.animState = 'dive_right';
        keeper.userData.diveDirection = 1;
        keeper.userData.diveHeight = 1;
      }
    } else {
      // Low dive
      if (zone === 3) {
        keeper.userData.animState = 'dive_left';
        keeper.userData.diveDirection = -1;
        keeper.userData.diveHeight = 0;
      } else if (zone === 4) {
        keeper.userData.animState = 'dive_center';
      } else {
        keeper.userData.animState = 'dive_right';
        keeper.userData.diveDirection = 1;
        keeper.userData.diveHeight = 0;
      }
    }
  }

  // === HANDLE PLAYER SWIPE SHOT ===
  handlePlayerShot(swipe) {
    if (this.state !== STATE.WAITING || !this.isPlayerTurnShoot) return;

    // Calculate shot parameters from swipe
    const canvasW = window.innerWidth;
    const canvasH = window.innerHeight;

    // Power based on swipe distance
    const swipeDist = Math.sqrt(swipe.dx * swipe.dx + swipe.dy * swipe.dy);
    const power = Math.min(swipeDist / (canvasH * 0.4), 1);

    // Aim from swipe direction
    const aimX = -swipe.dx / canvasW * 2; // left/right
    const aimY = Math.min(Math.max(-swipe.dy / canvasH, 0), 0.8); // upward swipe = higher aim

    // Curve from swipe curvature
    const curve = Math.max(-1, Math.min(1, swipe.curve / 100));

    this.state = STATE.BALL_FLYING_PLAYER;
    this.ui.hidePowerMeter();
    this.ui.hideRole();
    this.ui.clearTrail();

    // Shoot the ball
    this.ballPhysics.shoot(power, aimX, aimY, curve);
    playKick();

    // AI keeper decides where to dive (with reaction delay)
    const diveDir = this.aiKeeperLogic.getDiveDirection(aimX);
    const reactionDelay = this.aiKeeperLogic.getReactionDelay();

    setTimeout(() => {
      if (this.state === STATE.BALL_FLYING_PLAYER) {
        let zone;
        if (diveDir === 'left') zone = aimY > 0.5 ? 0 : 3;
        else if (diveDir === 'right') zone = aimY > 0.5 ? 2 : 5;
        else zone = aimY > 0.5 ? 1 : 4;
        this.applyKeeperDive(this.aiKeeper, zone);
      }
    }, reactionDelay * 1000);

    // Follow camera
    this.setCameraForShotFollow();
  }

  // === UPDATE LOOP ===
  update(dt) {
    const effectiveDt = dt * this.slowMo;

    // Update camera with lerp
    this.camera.position.lerp(this.cameraPosition, 0.04);

    // Smoothly move the lookAt target
    if (!this._currentLookAt) this._currentLookAt = this.cameraTarget.clone();
    this._currentLookAt.lerp(this.cameraTarget, 0.06);
    this.camera.lookAt(this._currentLookAt);

    // Camera shake
    if (this.shakeIntensity > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity *= 0.9;
      if (this.shakeIntensity < 0.01) this.shakeIntensity = 0;
    }

    // Slow motion recovery
    if (this.slowMo < 1) {
      this.slowMo = Math.min(1, this.slowMo + dt * 0.5);
    }

    // Update keepers
    if (this.aiKeeper.visible) {
      updateGoalkeeper(this.aiKeeper, effectiveDt, this.aiKeeper.userData.animState);
    }
    if (this.playerKeeper.visible) {
      updateGoalkeeper(this.playerKeeper, effectiveDt, this.playerKeeper.userData.animState);
    }

    // Update ball physics
    if (this.state === STATE.BALL_FLYING_PLAYER || this.state === STATE.BALL_FLYING_AI) {
      this.ballPhysics.update(effectiveDt);
      this.ball.position.copy(this.ballPhysics.position);

      // Ball rotation based on velocity
      if (this.ballPhysics.velocity.length() > 0.1) {
        const axis = new THREE.Vector3().crossVectors(this.ballPhysics.velocity, new THREE.Vector3(0, 1, 0)).normalize();
        this.ball.rotateOnWorldAxis(axis, this.ballPhysics.velocity.length() * effectiveDt * 2);
      }

      // Trail
      this.ballTrail.update(this.ballPhysics.position);

      // Check collisions
      this.checkCollisions();

      // Power meter during flight
      const speed = this.ballPhysics.velocity.length();
      const power = speed / 40;
      const curveMag = this.ballPhysics.angularVelocity.length() / 20;
      this.ui.showPowerMeter(power, curveMag);
    }

    // Swipe trail drawing
    if (this.state === STATE.WAITING && this.isPlayerTurnShoot) {
      const path = this.swipeTracker.getActivePath();
      this.ui.drawAimTrail(path, path.length > 2);

      // Live power meter while swiping
      if (path.length > 2) {
        const first = path[0];
        const last = path[path.length - 1];
        const dx = last.x - first.x;
        const dy = last.y - first.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const power = Math.min(dist / (window.innerHeight * 0.4), 1);
        const curve = Math.min(Math.abs(dx) / 200, 1);
        this.ui.showPowerMeter(power, curve);
      }
    }

    // Check for swipe completion
    if (this.state === STATE.WAITING && this.isPlayerTurnShoot) {
      const swipe = this.swipeTracker.getLastSwipe();
      if (swipe && swipe.totalDistance > 30) {
        this.handlePlayerShot(swipe);
      }
    }
  }

  checkCollisions() {
    if (!this.ballPhysics.isFlying) return;

    const postColliders = getPostColliders(this.goal);

    // Check post collisions
    const posts = [postColliders.leftPost, postColliders.rightPost, postColliders.crossbar];
    for (const post of posts) {
      if (this.ballPhysics.checkPostCollision(post.start, post.end, postColliders.leftPost.radius - 0.35)) {
        this.ballPhysics.hitPost = true;
        playPostHit();
        this.shakeIntensity = 0.15;
        break;
      }
    }

    // Check keeper collision
    const activeKeeper = this.isPlayerTurnShoot ? this.aiKeeper : this.playerKeeper;
    if (activeKeeper.visible) {
      const keeperBounds = getKeeperBounds(activeKeeper);
      if (this.ballPhysics.checkKeeperCollision(keeperBounds)) {
        this.ballPhysics.hitKeeper = true;
        playSave();
      }
    }

    // Check goal
    if (this.ballPhysics.checkGoal(7.32, 2.44)) {
      this.ballPhysics.isGoal = true;
      this.ballPhysics.isFlying = false;
      this.handleGoal();
      return;
    }

    // Check miss
    const missType = this.ballPhysics.checkMissed(7.32, 2.44);
    if (missType) {
      this.ballPhysics.isFlying = false;
      this.handleMiss(missType);
      return;
    }

    // Ball stopped
    if (this.ballPhysics.hasLanded) {
      this.ballPhysics.isFlying = false;
      if (this.ballPhysics.position.z > 5) {
        this.handleMiss('weak');
      } else {
        this.handleMiss('saved_low');
      }
    }
  }

  handleGoal() {
    // Determine who scored
    const playerScored = this.isPlayerTurnShoot;
    if (playerScored) {
      this.playerScore++;
      this.playerResults.push('goal');
    } else {
      this.aiScore++;
      this.aiResults.push('goal');
    }

    this.ui.updateScore(this.playerScore, this.aiScore);
    this.ui.updateDots(this.playerResults, this.aiResults);
    this.ui.hidePowerMeter();

    // Effects
    playNetSwish();
    setTimeout(() => playCrowdCheer(), 200);

    // Check for top bins (upper corner)
    const isTopBins = this.ballPhysics.position.y > 1.8 && Math.abs(this.ballPhysics.position.x) > 2.5;
    if (isTopBins) {
      this.ui.showMessage('TOP BINS! 🔥', 2000, '#ffd700');
      this.slowMo = 0.3;
      setTimeout(() => { this.slowMo = 1; }, 1000);
    } else {
      this.ui.showMessage('GOAL! ⚽', 1500, playerScored ? '#4caf50' : '#ff5252');
    }

    // Net animation
    animateNet(this.goal, this.ball.position.clone(), 1);

    // Confetti
    if (playerScored) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#4fc3f7', '#2196f3', '#ffffff']
      });
    }

    // Keeper reaction
    if (this.isPlayerTurnShoot) {
      this.aiKeeper.userData.animState = 'dejected';
      this.aiKeeper.userData.animTime = 0;
    } else {
      this.playerKeeper.userData.animState = 'dejected';
      this.playerKeeper.userData.animTime = 0;
    }

    // Move to next phase
    this.state = STATE.RESULT_DISPLAY;
    setTimeout(() => this.advanceTurn(), 2500);
  }

  handleMiss(type) {
    const playerMissed = this.isPlayerTurnShoot;
    if (playerMissed) {
      this.playerResults.push('miss');
    } else {
      this.aiResults.push('miss');
    }

    this.ui.updateDots(this.playerResults, this.aiResults);
    this.ui.hidePowerMeter();

    playCrowdGroan();

    let message = 'SAVED!';
    let color = '#ff8a65';
    if (type === 'wide') { message = 'WIDE!'; color = '#ff9800'; }
    else if (type === 'over') { message = 'OVER THE BAR!'; color = '#ff9800'; }
    else if (type === 'weak') { message = 'WEAK SHOT!'; color = '#ff5252'; }
    else if (this.ballPhysics.hitPost) { message = 'HIT THE POST!'; color = '#ffc107'; }

    this.ui.showMessage(message, 1500, color);

    // Keeper reaction
    if (this.isPlayerTurnShoot) {
      this.aiKeeper.userData.animState = 'celebrate';
      this.aiKeeper.userData.animTime = 0;
    } else {
      this.playerKeeper.userData.animState = 'celebrate';
      this.playerKeeper.userData.animTime = 0;
    }

    this.state = STATE.RESULT_DISPLAY;
    setTimeout(() => this.advanceTurn(), 2500);
  }

  advanceTurn() {
    if (this.isPlayerTurnShoot) {
      // Now AI shoots
      this.startPlayerSaveTurn();
    } else {
      // Both have shot this round
      // Check for early win/loss
      const roundsLeft = this.maxRounds - this.currentRound;
      if (this.playerScore > this.aiScore + roundsLeft) {
        this.endGame();
        return;
      }
      if (this.aiScore > this.playerScore + roundsLeft) {
        this.endGame();
        return;
      }

      this.currentRound++;

      if (this.currentRound > this.maxRounds) {
        if (this.playerScore === this.aiScore) {
          // Sudden death - continue
          this.ui.updateRound(this.currentRound);
          this.startPlayerShootTurn();
        } else {
          this.endGame();
        }
      } else {
        this.ui.updateRound(this.currentRound);
        this.startPlayerShootTurn();
      }
    }
  }

  endGame() {
    this.state = STATE.GAME_OVER;
    const playerWon = this.playerScore > this.aiScore;
    this.ui.showEndScreen(this.playerScore, this.aiScore, playerWon);

    if (playerWon) {
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.5 },
      });
      setTimeout(() => confetti({
        particleCount: 100,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
      }), 300);
      setTimeout(() => confetti({
        particleCount: 100,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
      }), 600);
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.update(dt);
    this.renderer.render(this.scene, this.camera);
  }
}
