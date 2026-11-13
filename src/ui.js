// src/ui.js - HUD & UI Management

export class GameUI {
  constructor() {
    // Cache DOM elements
    this.playerScoreEl = document.getElementById('player-score');
    this.aiScoreEl = document.getElementById('ai-score');
    this.roundLabelEl = document.getElementById('round-label');
    this.playerDotsEl = document.getElementById('player-dots');
    this.aiDotsEl = document.getElementById('ai-dots');
    this.roleIndicatorEl = document.getElementById('role-indicator');
    this.roleTextEl = document.getElementById('role-text');
    this.powerMeterEl = document.getElementById('power-meter');
    this.powerFillEl = document.getElementById('power-fill');
    this.curveFillEl = document.getElementById('curve-fill');
    this.zoneSelectorEl = document.getElementById('zone-selector');
    this.messageOverlayEl = document.getElementById('message-overlay');
    this.messageTextEl = document.getElementById('message-text');
    this.startScreenEl = document.getElementById('start-screen');
    this.endScreenEl = document.getElementById('end-screen');
    this.endTitleEl = document.getElementById('end-title');
    this.endScoreEl = document.getElementById('end-score');
    this.startBtnEl = document.getElementById('start-btn');
    this.replayBtnEl = document.getElementById('replay-btn');
    this.trailCanvas = document.getElementById('trail-canvas');
    this.trailCtx = this.trailCanvas.getContext('2d');

    this.resizeTrailCanvas();
    window.addEventListener('resize', () => this.resizeTrailCanvas());

    this.messageTimeout = null;
  }

  resizeTrailCanvas() {
    this.trailCanvas.width = window.innerWidth;
    this.trailCanvas.height = window.innerHeight;
  }

  updateScore(playerScore, aiScore) {
    this.playerScoreEl.textContent = playerScore;
    this.aiScoreEl.textContent = aiScore;
  }

  updateRound(round, maxRounds = 5) {
    if (round > maxRounds) {
      this.roundLabelEl.textContent = `SUDDEN DEATH`;
    } else {
      this.roundLabelEl.textContent = `ROUND ${round}`;
    }
  }

  updateDots(playerResults, aiResults) {
    const playerDots = this.playerDotsEl.querySelectorAll('.dot');
    const aiDots = this.aiDotsEl.querySelectorAll('.dot');

    playerResults.forEach((result, i) => {
      if (i < playerDots.length) {
        playerDots[i].className = 'dot' + (result === 'goal' ? ' goal' : result === 'miss' ? ' miss' : '');
      }
    });

    aiResults.forEach((result, i) => {
      if (i < aiDots.length) {
        aiDots[i].className = 'dot' + (result === 'goal' ? ' goal' : result === 'miss' ? ' miss' : '');
      }
    });
  }

  showRole(role) {
    this.roleIndicatorEl.classList.remove('hidden');
    if (role === 'shoot') {
      this.roleTextEl.textContent = 'YOUR TURN: SHOOT';
      this.roleTextEl.style.color = '#4fc3f7';
    } else {
      this.roleTextEl.textContent = 'YOUR TURN: SAVE';
      this.roleTextEl.style.color = '#ff8a65';
    }
  }

  hideRole() {
    this.roleIndicatorEl.classList.add('hidden');
  }

  showPowerMeter(power, curve) {
    this.powerMeterEl.classList.remove('hidden');
    this.powerFillEl.style.width = `${power * 100}%`;
    this.curveFillEl.style.width = `${Math.abs(curve) * 100}%`;
  }

  hidePowerMeter() {
    this.powerMeterEl.classList.add('hidden');
  }

  showZoneSelector() {
    this.zoneSelectorEl.classList.remove('hidden');
  }

  hideZoneSelector() {
    this.zoneSelectorEl.classList.add('hidden');
  }

  showMessage(text, duration = 1500, color = '#fff') {
    if (this.messageTimeout) clearTimeout(this.messageTimeout);
    this.messageOverlayEl.classList.remove('hidden');
    this.messageTextEl.textContent = text;
    this.messageTextEl.style.color = color;
    this.messageTextEl.style.animation = 'none';
    void this.messageTextEl.offsetWidth; // trigger reflow
    this.messageTextEl.style.animation = 'messagePop 0.4s ease';

    this.messageTimeout = setTimeout(() => {
      this.messageOverlayEl.classList.add('hidden');
    }, duration);
  }

  hideMessage() {
    this.messageOverlayEl.classList.add('hidden');
  }

  showStartScreen() {
    this.startScreenEl.style.display = 'flex';
  }

  hideStartScreen() {
    this.startScreenEl.style.display = 'none';
  }

  showEndScreen(playerScore, aiScore, playerWon) {
    this.endScreenEl.classList.remove('hidden');
    this.endTitleEl.textContent = playerWon ? '🏆 YOU WIN!' : (playerScore === aiScore ? 'DRAW!' : '😢 YOU LOSE');
    this.endScoreEl.textContent = `${playerScore} - ${aiScore}`;
  }

  hideEndScreen() {
    this.endScreenEl.classList.add('hidden');
  }

  onStart(callback) {
    this.startBtnEl.addEventListener('click', callback);
  }

  onReplay(callback) {
    this.replayBtnEl.addEventListener('click', callback);
  }

  onZoneSelect(callback) {
    const buttons = this.zoneSelectorEl.querySelectorAll('.zone-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        callback(parseInt(btn.dataset.zone));
      });
    });
  }

  // Draw swipe aim trail on the 2D overlay canvas
  drawAimTrail(path, isSwiping) {
    const ctx = this.trailCtx;
    ctx.clearRect(0, 0, this.trailCanvas.width, this.trailCanvas.height);

    if (!path || path.length < 2 || !isSwiping) return;

    // Draw glowing trail
    ctx.strokeStyle = '#4fc3f7';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#4fc3f7';
    ctx.shadowBlur = 15;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.stroke();

    // Draw arrow at end showing direction
    if (path.length >= 2) {
      const last = path[path.length - 1];
      const prev = path[path.length - 2];
      const angle = Math.atan2(last.y - prev.y, last.x - prev.x);

      ctx.fillStyle = '#4fc3f7';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(last.x - 15 * Math.cos(angle - 0.4), last.y - 15 * Math.sin(angle - 0.4));
      ctx.lineTo(last.x - 15 * Math.cos(angle + 0.4), last.y - 15 * Math.sin(angle + 0.4));
      ctx.closePath();
      ctx.fill();
    }

    ctx.shadowBlur = 0;
  }

  clearTrail() {
    this.trailCtx.clearRect(0, 0, this.trailCanvas.width, this.trailCanvas.height);
  }
}
