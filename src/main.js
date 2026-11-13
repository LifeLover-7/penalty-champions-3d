// src/main.js - Application Entry Point

import { Game } from './game.js';

// Initialize the 3D Penalty Shootout Game
const game = new Game();

// Optional debug / developer access
if (typeof window !== 'undefined') {
  window.__PENALTY_GAME__ = game;
}

export default game;
