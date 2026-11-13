// src/ui.js - HUD, Scoreboard, Aim Trail & UI Controller

export class GameUI {
  constructor() {
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
    this.trailCtx = this.trailCanvas ? this.trailCanvas.getContext('2d') : null;

    this.zoneButtons = this.zoneSelectorEl ? this.zoneSelectorEl.querySelectorAll('.zone-btn') : [];

    this.messageTimer = null;
    this.resizeTrailCanvas();
    window.addEventListener('resize', () => this.resizeTrailCanvas());
  }

  resizeTrailCanvas() {
    if (!this.trailCanvas) return;
    this.trailCanvas.width = window.innerWidth;
    this.trailCanvas.height = window.innerHeight;
  }

  updateScore(playerScore, aiScore) {
    if (this.playerScoreEl) this.playerScoreEl.textContent = playerScore;
    if (this.aiScoreEl) this.aiScoreEl.textContent = aiScore;
  }

  updateRound(round, isSuddenDeath = false) {
    if (!this.roundLabelEl) return;
    if (isSuddenDeath) {
      this.roundLabelEl.textContent = `SUDDEN DEATH`;
      this.roundLabelEl.style.color = '#ff9800';
    } else {
      this.roundLabelEl.textContent = `ROUND ${round}`;
      this.roundLabelEl.style.color = 'rgba(255, 255, 255, 0.7)';
    }
  }

  updateDots(playerResults, aiResults) {
    const playerDots = this.playerDotsEl ? this.playerDotsEl.querySelectorAll('.dot') : [];
    const aiDots = this.aiDotsEl ? this.aiDotsEl.querySelectorAll('.dot') : [];

    playerResults.forEach((res, i) => {
      if (i < playerDots.length) {
        playerDots[i].className = `dot ${res}`;
      }
    });

    aiResults.forEach((res, i) => {
      if (i < aiDots.length) {
        aiDots[i].className = `dot ${res}`;
      }
    });
  }

  resetDots() {
    const allDots = document.querySelectorAll('.dot');
    allDots.forEach(d => { d.className = 'dot'; });
  }

  showRole(role) {
    if (!this.roleIndicatorEl) return;
    this.roleIndicatorEl.classList.remove('hidden');
    if (role === 'shoot') {
      this.roleTextEl.textContent = 'YOUR TURN: SWIPE TO SHOOT';
      this.roleTextEl.style.color = '#4fc3f7';
    } else {
      this.roleTextEl.textContent = 'YOUR TURN: CLICK A ZONE TO DIVE';
      this.roleTextEl.style.color = '#00e5ff';
    }
  }

  hideRole() {
    if (this.roleIndicatorEl) this.roleIndicatorEl.classList.add('hidden');
  }

  showPowerMeter(power, curve) {
    if (!this.powerMeterEl) return;
    this.powerMeterEl.classList.remove('hidden');
    if (this.powerFillEl) this.powerFillEl.style.width = `${Math.min(100, power * 100)}%`;
    if (this.curveFillEl) this.curveFillEl.style.width = `${Math.min(100, Math.abs(curve) * 100)}%`;
  }

  hidePowerMeter() {
    if (this.powerMeterEl) this.powerMeterEl.classList.add('hidden');
  }

  showZoneSelector() {
    if (!this.zoneSelectorEl) return;
    this.zoneSelectorEl.classList.remove('hidden');
    this.clearZoneSelection();
  }

  hideZoneSelector() {
    if (this.zoneSelectorEl) this.zoneSelectorEl.classList.add('hidden');
  }

  setZoneSelected(zoneId) {
    this.zoneButtons.forEach(btn => {
      if (parseInt(btn.dataset.zone) === zoneId) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    });
  }

  clearZoneSelection() {
    this.zoneButtons.forEach(btn => btn.classList.remove('selected'));
  }

  showMessage(text, duration = 1800, color = '#ffffff') {
    if (!this.messageOverlayEl || !this.messageTextEl) return;
    if (this.messageTimer) clearTimeout(this.messageTimer);

    this.messageOverlayEl.classList.remove('hidden');
    this.messageTextEl.textContent = text;
    this.messageTextEl.style.color = color;

    // Trigger pop CSS animation
    this.messageTextEl.style.animation = 'none';
    void this.messageTextEl.offsetWidth; // Force reflow
    this.messageTextEl.style.animation = 'messagePop 0.4s ease';

    this.messageTimer = setTimeout(() => {
      this.messageOverlayEl.classList.add('hidden');
    }, duration);
  }

  hideMessage() {
    if (this.messageTimer) clearTimeout(this.messageTimer);
    if (this.messageOverlayEl) this.messageOverlayEl.classList.add('hidden');
  }

  showStartScreen() {
    if (this.startScreenEl) this.startScreenEl.style.display = 'flex';
  }

  hideStartScreen() {
    if (this.startScreenEl) this.startScreenEl.style.display = 'none';
  }

  showEndScreen(playerScore, aiScore, playerWon) {
    if (!this.endScreenEl) return;
    this.endScreenEl.classList.remove('hidden');
    if (this.endTitleEl) {
      this.endTitleEl.textContent = playerWon ? '🏆 VICTORY!' : (playerScore === aiScore ? '🤝 DRAW MATCH' : '💔 DEFEAT');
      this.endTitleEl.style.color = playerWon ? '#ffea00' : (playerScore === aiScore ? '#ffffff' : '#ff5252');
    }
    if (this.endScoreEl) {
      this.endScoreEl.textContent = `${playerScore} - ${aiScore}`;
    }
  }

  hideEndScreen() {
    if (this.endScreenEl) this.endScreenEl.classList.add('hidden');
  }

  onStart(callback) {
    if (this.startBtnEl) {
      this.startBtnEl.addEventListener('click', callback);
    }
  }

  onReplay(callback) {
    if (this.replayBtnEl) {
      this.replayBtnEl.addEventListener('click', callback);
    }
  }

  onZoneSelect(callback) {
    this.zoneButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const zone = parseInt(btn.dataset.zone);
        this.setZoneSelected(zone);
        callback(zone);
      });
    });
  }

  // Draw 2D glowing swipe aim line on overlay canvas
  drawAimTrail(path, isSwiping) {
    if (!this.trailCtx || !this.trailCanvas) return;
    const ctx = this.trailCtx;
    ctx.clearRect(0, 0, this.trailCanvas.width, this.trailCanvas.height);

    if (!path || path.length < 2 || !isSwiping) return;

    ctx.save();
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 16;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.stroke();

    // Direction arrow at pointer tip
    const last = path[path.length - 1];
    const prev = path[Math.max(0, path.length - 3)];
    const angle = Math.atan2(last.y - prev.y, last.x - prev.x);

    ctx.fillStyle = '#ffea00';
    ctx.shadowColor = '#ffea00';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(last.x - 18 * Math.cos(angle - 0.45), last.y - 18 * Math.sin(angle - 0.45));
    ctx.lineTo(last.x - 18 * Math.cos(angle + 0.45), last.y - 18 * Math.sin(angle + 0.45));
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  clearTrail() {
    if (!this.trailCtx || !this.trailCanvas) return;
    this.trailCtx.clearRect(0, 0, this.trailCanvas.width, this.trailCanvas.height);
  }
}
