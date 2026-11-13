# ⚽ Penalty Champions 3D

A complete, production-ready 3D Penalty Shootout game built with **Vite**, **Three.js**, and the **Web Audio API** — featuring 100% procedurally generated assets (zero external files).

![Game Screenshot](https://img.shields.io/badge/Three.js-r170-blue) ![Vite](https://img.shields.io/badge/Vite-8-purple) ![License](https://img.shields.io/badge/License-MIT-green)

## 🎮 Features

### Gameplay
- **5-round penalty shootout** (+ Sudden Death if tied)
- **Dual role mechanics**: Alternate between shooting and saving
- **Swipe-to-shoot** with power, aim, and curve control
- **Zone-based diving** for goalkeeper mode (6 target zones)
- **AI opponent** with difficulty-scaled reactions

### Graphics (100% Procedural)
- **Night stadium** with floodlights, atmospheric fog, and tiered stands
- **Procedural pitch** with striped grass texture and penalty markings
- **Classic soccer ball** with pentagon/hexagon canvas texture + bump mapping
- **Articulated chibi goalkeeper** with idle, dive, celebrate, and dejected animations
- **Metallic goalposts** with reactive net mesh (wave propagation on impact)
- **Ball trail** effect during flight
- **Dynamic camera** with smooth lerp, screen shake, and slow-motion top-bins

### Physics
- **Magnus Effect** curve shots (bend around the keeper!)
- Gravity, air resistance, and ground friction
- Sphere-to-cylinder rebound for post/crossbar hits
- Sphere-to-box collision for goalkeeper saves

### Audio (Web Audio API Synthesizer)
- 🏁 Referee whistle (FM modulated sine trill)
- 👟 Ball kick thud (noise burst + pitch-dropping sine)
- 🔔 Post/crossbar metallic clang
- 🥅 Net swish
- 🎉 Crowd roar on goal / groan on miss
- 🧤 Save impact sound

### UI
- TV broadcast-style scoreboard with round indicator dots
- Power/curve meter during swipe
- Glowing aim trail overlay
- Start screen, role indicator, and end-game modal
- Confetti celebrations

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/your-username/penalty-champions-3d.git
cd penalty-champions-3d

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 📁 Project Structure

```
penalty-champions-3d/
├── index.html          # Main HTML with HUD overlay
├── vite.config.js      # Vite configuration
├── package.json        # Dependencies (three, canvas-confetti)
└── src/
    ├── main.js         # Entry point
    ├── game.js         # Game state machine & loop
    ├── scene.js        # Stadium, pitch, lights, fog
    ├── ball.js         # Procedural soccer ball + trail
    ├── goalkeeper.js   # Articulated chibi keeper
    ├── goal.js         # Goal posts + reactive net
    ├── physics.js      # Magnus effect, collisions, AI
    ├── audio.js        # Web Audio API synthesizer
    ├── ui.js           # HUD & UI management
    └── style.css       # Broadcast-style HUD styles
```

## 🎯 How to Play

### Shooting
1. Wait for "YOUR TURN: SHOOT" indicator
2. **Swipe up** on the screen to shoot
3. Swipe **distance** controls power
4. Swipe **direction** controls aim (left/right)
5. Swipe **curvature** applies spin (Magnus effect)

### Saving
1. Wait for "YOUR TURN: SAVE" indicator
2. Watch the AI striker prepare their shot
3. **Click one of 6 zones** to dive:
   - Top: ↖ ↑ ↗
   - Bottom: ← ↓ →
4. Time your dive to parry the ball!

## 🛠️ Tech Stack

- **Three.js** - 3D rendering
- **Vite** - Build tool & dev server
- **Web Audio API** - Procedural sound synthesis
- **Canvas API** - Procedural textures
- **canvas-confetti** - Celebration effects
- **Vanilla JS (ES6 Modules)** - No framework overhead

## 📝 License

MIT
