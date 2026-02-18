/**
 * Stay Close — Game constants (tweak these for balance)
 * Auto-runner: friend moves with the world, tap/button to jump over obstacles.
 */
const CONFIG = {
  /** World scroll speed (px per second) — map moves left; friend stays fixed on screen */
  SCROLL_SPEED: 140,
  /** Extra forward speed (px/s) so the character drifts right and can catch up */
  FRIEND_FORWARD_BOOST: 28,
  /** Level 1 duration (seconds) to win */
  LEVEL1_DURATION: 60,
  /** Friend fixed X on screen (pixels from left) — only vertical movement */
  FRIEND_FIXED_X: 200,
  /** Gravity (px/s²) applied when in air */
  GRAVITY: 520,
  /** Upward velocity (px/s) when jump is pressed */
  JUMP_VELOCITY: -320,
  /** Right 25% of screen: Plofferson stays in this zone */
  PLOFFERSON_ZONE_RIGHT_FRACTION: 0.25,
  PLOFFERSON_WANDER_AMPLITUDE: 50,
  PLOFFERSON_WANDER_SPEED: 1.2,
  /** How far friend can be off left of screen before game over (stuck / left behind) */
  FRIEND_OFF_LEFT_MARGIN: 60,
  /** Ground level (Y) for characters on screen */
  GROUND_Y: 380,
  /** Trench depth (px below ground); you land on the floor and can jump out */
  TRENCH_DEPTH: 70,
  CANVAS_WIDTH: 900,
  CANVAS_HEIGHT: 500,
  CHAR_SIZE: 48,
  GROUND_TILE_WIDTH: 256,
  PARALLAX_FACTOR: 0.3,
  /** Obstacle spawn: min/max world distance between obstacles */
  OBSTACLE_SPAWN_MIN: 220,
  OBSTACLE_SPAWN_MAX: 420,
  /** Obstacle definitions: width (world px), height (px from ground up) */
  OBSTACLES: {
    car: { width: 100, height: 36 },
    house: { width: 120, height: 90 },
    trench: { width: 80 }, // gap in ground, no height
  },
};

/**
 * Game state enum
 * @readonly
 */
const GameState = {
  MENU: 'menu',
  CHOOSE_PLAYER: 'choosePlayer',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAMEOVER: 'gameover',
  WIN: 'win',
};

/**
 * Character definitions for Choose Player screen (arcade soldiers)
 */
const CHARACTERS = [
  { id: 'jahaa', name: 'Jahaa', emoji: '🪖', color: '#4a9c5e' },
  { id: 'johncheese', name: 'Johncheese', emoji: '🪖', color: '#e8c547' },
  { id: 'mrhebowski', name: 'MrHebowski', emoji: '🪖', color: '#8b5a9b' },
  { id: 'ownerd', name: 'Ownerd', emoji: '🪖', color: '#c65d3b' },
  { id: 'scratchemm', name: 'Scratchemm', emoji: '🪖', color: '#4a7ba7' },
];

/** Current game state */
let state = GameState.MENU;
/** Selected character (object from CHARACTERS) or null */
let selectedCharacter = null;
/** Animation frame ID for game loop */
let animationId = null;
/** Last timestamp for delta time */
let lastTime = 0;

/** Level 1 state: world scroll offset (map moves left as this increases) */
let worldScrollX = 0;
/** Plofferson position in screen space (stays in right 25%) */
let ploffersonScreenX = 0;
/** Friend world X: advances with scroll unless stuck on obstacle; then they fall behind */
let friendWorldX = 0;
/** Friend Y and vertical velocity */
let friendY = 0;
let friendVelY = 0;
let levelStartTime = 0;
let keys = { jump: false };
/** Active obstacles: { type: 'car'|'house'|'trench', worldX: number, width, height? } */
let obstacles = [];
/** Next obstacle will spawn when world passes this X */
let nextObstacleAt = 0;

/** DOM refs */
const screens = {
  mainMenu: document.getElementById('main-menu'),
  choosePlayer: document.getElementById('choose-player-screen'),
  game: document.getElementById('game-screen'),
  gameover: document.getElementById('gameover-screen'),
  win: document.getElementById('win-screen'),
};
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const selectedPlayerDisplay = document.getElementById('selected-player-display');
const characterCardsContainer = document.getElementById('character-cards');
const timerDisplay = document.getElementById('timer-display');

/**
 * Show a single screen and hide others
 * @param {string} screenId - Id of the screen element (e.g. 'main-menu')
 */
function showScreen(screenId) {
  const all = document.querySelectorAll('.screen');
  all.forEach((el) => el.classList.remove('active'));
  const target = document.getElementById(screenId);
  if (target) target.classList.add('active');
}

/**
 * Set game state and optionally switch UI
 * @param {string} newState - One of GameState
 * @param {string} [screenId] - Optional screen to show
 */
function setState(newState, screenId) {
  state = newState;
  if (screenId) showScreen(screenId);
}

/**
 * Bind main menu buttons
 */
function initMainMenu() {
  document.getElementById('btn-start').addEventListener('click', () => {
    setState(GameState.PLAYING, 'game-screen');
    requestAnimationFrame(() => startLevel1());
  });
  document.getElementById('btn-choose-player').addEventListener('click', () => {
    setState(GameState.CHOOSE_PLAYER, 'choose-player-screen');
    updateChoosePlayerSelection();
  });
  document.getElementById('btn-how-to-play').addEventListener('click', () => {
    document.getElementById('how-to-play-modal').classList.remove('hidden');
  });
}

/**
 * Close How to Play modal
 */
function closeHowToPlayModal() {
  document.getElementById('how-to-play-modal').classList.add('hidden');
}

/**
 * Build and bind Choose Player screen
 */
function initChoosePlayer() {
  characterCardsContainer.innerHTML = '';
  CHARACTERS.forEach((char, index) => {
    const card = document.createElement('div');
    card.className = 'character-card';
    card.dataset.id = char.id;
    card.dataset.index = String(index);
    card.innerHTML = `<span class="char-emoji">${char.emoji}</span><span class="char-name">${char.name}</span>`;
    card.addEventListener('click', () => selectCharacterCard(index));
    characterCardsContainer.appendChild(card);
  });
  document.getElementById('btn-confirm-player').addEventListener('click', confirmPlayerSelection);
}

/**
 * Set selected character index and update card visuals
 * @param {number} index - Index in CHARACTERS array
 */
function selectCharacterCard(index) {
  document.querySelectorAll('.character-card').forEach((c, i) => {
    c.classList.toggle('selected', i === index);
  });
  selectedCharacter = CHARACTERS[index];
}

/**
 * Sync character card selected state with selectedCharacter
 */
function updateChoosePlayerSelection() {
  const index = selectedCharacter ? CHARACTERS.findIndex((c) => c.id === selectedCharacter.id) : -1;
  document.querySelectorAll('.character-card').forEach((c, i) => {
    c.classList.toggle('selected', i === index);
  });
}

/**
 * Confirm player choice and return to main menu
 */
function confirmPlayerSelection() {
  if (selectedCharacter) {
    selectedPlayerDisplay.textContent = `Playing as: ${selectedCharacter.name}`;
    selectedPlayerDisplay.classList.remove('empty');
  }
  setState(GameState.MENU, 'main-menu');
}

/**
 * Initialize How to Play modal close button
 */
function initModal() {
  document.getElementById('btn-close-modal').addEventListener('click', closeHowToPlayModal);
}

/**
 * Right-edge zone for Plofferson (left X and right X in canvas pixels)
 * @returns {{ min: number, max: number, center: number }}
 */
function getPloffersonZone() {
  const zoneMin = (1 - CONFIG.PLOFFERSON_ZONE_RIGHT_FRACTION) * CONFIG.CANVAS_WIDTH;
  const zoneMax = CONFIG.CANVAS_WIDTH - CONFIG.CHAR_SIZE;
  const center = (zoneMin + zoneMax) / 2;
  return { min: zoneMin, max: zoneMax, center };
}

/** World X position of the friend (used for ground, obstacles, and drawing) */
function getFriendWorldX() {
  return friendWorldX;
}

/**
 * Spawn one obstacle at worldX; schedule next spawn
 */
function spawnObstacle() {
  const types = ['car', 'house', 'trench'];
  const type = types[Math.floor(Math.random() * types.length)];
  const def = CONFIG.OBSTACLES[type];
  obstacles.push({
    type,
    worldX: nextObstacleAt,
    width: def.width,
    height: def.height,
  });
  const gap = CONFIG.OBSTACLE_SPAWN_MIN + Math.random() * (CONFIG.OBSTACLE_SPAWN_MAX - CONFIG.OBSTACLE_SPAWN_MIN);
  nextObstacleAt += gap + def.width;
}

/**
 * Remove obstacles that have scrolled off to the left
 */
function pruneObstacles() {
  obstacles = obstacles.filter((o) => o.worldX + o.width > worldScrollX - 50);
}

/**
 * Is there solid ground at world X? (false over a trench)
 */
function isGroundAt(worldX) {
  for (const o of obstacles) {
    if (o.type !== 'trench') continue;
    if (worldX >= o.worldX && worldX <= o.worldX + o.width) return false;
  }
  return true;
}

/**
 * If the friend is over a trench, returns the Y (screen) of the trench floor. Otherwise null.
 * Used to land in the trench and jump out.
 */
function getTrenchFloorUnderFriend() {
  const friendWX = getFriendWorldX();
  const friendLeft = friendWX;
  const friendRight = friendWX + CONFIG.CHAR_SIZE;
  for (const o of obstacles) {
    if (o.type !== 'trench') continue;
    const oRight = o.worldX + o.width;
    if (friendRight <= o.worldX || friendLeft >= oRight) continue;
    return CONFIG.GROUND_Y + CONFIG.TRENCH_DEPTH;
  }
  return null;
}

/**
 * Resize canvas to fill its container (full viewport on mobile); keeps logical size 900x500.
 */
function resizeCanvas() {
  const wrap = canvas.parentElement;
  if (!wrap) return;
  const w = wrap.clientWidth || CONFIG.CANVAS_WIDTH;
  const h = wrap.clientHeight || CONFIG.CANVAS_HEIGHT;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
}

function startLevel1() {
  resizeCanvas();
  worldScrollX = 0;
  friendWorldX = CONFIG.FRIEND_FIXED_X;
  obstacles = [];
  nextObstacleAt = CONFIG.OBSTACLE_SPAWN_MIN;
  const zone = getPloffersonZone();
  ploffersonScreenX = zone.center;
  friendY = CONFIG.GROUND_Y - CONFIG.CHAR_SIZE;
  friendVelY = 0;
  levelStartTime = performance.now() / 1000;
  timerDisplay.textContent = '0:00';
  lastTime = performance.now();
  if (isTouchDevice()) {
    const tc = document.getElementById('touch-controls');
    if (tc) tc.classList.add('visible');
  }
  requestAnimationFrame(gameLoop);
}

/**
 * Get current level elapsed time in seconds
 * @returns {number}
 */
function getLevelElapsed() {
  return (performance.now() / 1000) - levelStartTime;
}

/** Plofferson's current Y (screen space) */
function getPloffersonY() {
  return CONFIG.GROUND_Y - CONFIG.CHAR_SIZE;
}

/**
 * Check if friend fell off bottom of screen (e.g. into trench)
 * @returns {boolean}
 */
function isFriendOffScreen() {
  return friendY > CONFIG.CANVAS_HEIGHT - CONFIG.CHAR_SIZE + 10;
}

/** Margin: feet at or above (obstacleTop + this) = standing on top, not stuck */
const PLATFORM_STAND_MARGIN = 8;

/**
 * Friend is stuck on an obstacle (car/house): overlapping in X and feet below the top.
 * Standing ON a house/car = not stuck (can move forward).
 * @returns {boolean}
 */
function isFriendStuckOnObstacle() {
  const friendWX = getFriendWorldX();
  const friendLeft = friendWX;
  const friendRight = friendWX + CONFIG.CHAR_SIZE;
  const friendBottom = friendY + CONFIG.CHAR_SIZE;
  const groundYLine = CONFIG.GROUND_Y;

  for (const o of obstacles) {
    if (o.type === 'trench') continue;
    const oRight = o.worldX + o.width;
    if (friendRight <= o.worldX || friendLeft >= oRight) continue;
    const obstacleTop = groundYLine - o.height;
    if (friendBottom > obstacleTop + PLATFORM_STAND_MARGIN) return true;
  }
  return false;
}

/**
 * If the friend is on top of a car/house (or landing on it), returns the platform top Y (screen). Otherwise null.
 * @returns {number|null}
 */
function getPlatformTopUnderFriend() {
  const friendWX = getFriendWorldX();
  const friendLeft = friendWX;
  const friendRight = friendWX + CONFIG.CHAR_SIZE;
  const friendBottom = friendY + CONFIG.CHAR_SIZE;
  const groundYLine = CONFIG.GROUND_Y;
  let bestTop = null;

  for (const o of obstacles) {
    if (o.type === 'trench') continue;
    const oRight = o.worldX + o.width;
    if (friendRight <= o.worldX || friendLeft >= oRight) continue;
    const obstacleTop = groundYLine - o.height;
    if (friendBottom >= obstacleTop - 4 && friendBottom <= obstacleTop + 24) {
      if (bestTop === null || obstacleTop < bestTop) bestTop = obstacleTop;
    }
  }
  return bestTop;
}

/** Friend has fallen off the left (stuck and left behind) */
function isFriendOffLeft() {
  const friendScreenX = friendWorldX - worldScrollX;
  return friendScreenX < -CONFIG.CHAR_SIZE - CONFIG.FRIEND_OFF_LEFT_MARGIN;
}

/**
 * Game over: show screen and stop loop
 * @param {string} message - Death message
 */
function triggerGameOver(message) {
  cancelAnimationFrame(animationId);
  const tc = document.getElementById('touch-controls');
  if (tc) tc.classList.remove('visible');
  document.getElementById('gameover-message').textContent = message;
  setState(GameState.GAMEOVER, 'gameover-screen');
}

/**
 * Win: show level complete screen
 */
function triggerWin() {
  cancelAnimationFrame(animationId);
  const tc = document.getElementById('touch-controls');
  if (tc) tc.classList.remove('visible');
  document.getElementById('win-message').textContent = 'You actually stayed! Battlefield miracle.';
  setState(GameState.WIN, 'win-screen');
}

/**
 * Keyboard input: jump only (Space, Up, W)
 */
function initInput() {
  const jumpCodes = ['Space', 'ArrowUp', 'KeyW'];
  document.addEventListener('keydown', (e) => {
    if (jumpCodes.includes(e.code)) {
      keys.jump = true;
      e.preventDefault();
    }
  });
  document.addEventListener('keyup', (e) => {
    if (jumpCodes.includes(e.code)) keys.jump = false;
  });
}

/**
 * Whether the device supports touch (show on-screen D-pad)
 * @returns {boolean}
 */
function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Bind touch/pointer events to on-screen Jump button
 */
function initTouchControls() {
  const jumpBtn = document.getElementById('btn-jump');
  if (!jumpBtn) return;

  const setJump = (value) => { keys.jump = value; };
  jumpBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); setJump(true); }, { passive: false });
  jumpBtn.addEventListener('pointerup', (e) => { e.preventDefault(); setJump(false); }, { passive: false });
  jumpBtn.addEventListener('pointerleave', () => setJump(false));
  jumpBtn.addEventListener('pointercancel', () => setJump(false));
  jumpBtn.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
}

/**
 * Update game logic for Level 1 (auto-runner: jump over obstacles; stuck = fall behind)
 * @param {number} dt - Delta time in seconds
 */
function update(dt) {
  const now = performance.now() / 1000;
  worldScrollX += CONFIG.SCROLL_SPEED * dt;

  const zone = getPloffersonZone();
  const wander = CONFIG.PLOFFERSON_WANDER_AMPLITUDE * Math.sin(now * CONFIG.PLOFFERSON_WANDER_SPEED);
  ploffersonScreenX = Math.max(zone.min, Math.min(zone.max, zone.center + wander));

  while (nextObstacleAt < worldScrollX + CONFIG.CANVAS_WIDTH + 100) spawnObstacle();
  pruneObstacles();

  const groundY = CONFIG.GROUND_Y - CONFIG.CHAR_SIZE;
  const friendWX = getFriendWorldX();
  const onSolidGround = isGroundAt(friendWX);
  const trenchFloorY = getTrenchFloorUnderFriend();
  const onTrenchFloor = trenchFloorY !== null;

  if (onSolidGround) {
    friendY = Math.min(friendY, groundY);
    if (friendY >= groundY - 1) friendVelY = 0;
  }

  const platformTopBefore = getPlatformTopUnderFriend();
  const onPlatformBefore = platformTopBefore !== null;
  const canJumpFrom = onSolidGround || onPlatformBefore || onTrenchFloor;
  if (keys.jump && canJumpFrom && friendVelY >= 0) {
    const standY = onPlatformBefore ? platformTopBefore - CONFIG.CHAR_SIZE : (onTrenchFloor ? trenchFloorY - CONFIG.CHAR_SIZE : groundY);
    if (friendY >= standY - 2) friendVelY = CONFIG.JUMP_VELOCITY;
  }
  friendVelY += CONFIG.GRAVITY * dt;
  friendY += friendVelY * dt;

  if (onSolidGround) {
    friendY = Math.min(friendY, groundY);
    if (friendY >= groundY - 1) friendVelY = 0;
  }
  const platformTop = getPlatformTopUnderFriend();
  if (platformTop !== null && friendY + CONFIG.CHAR_SIZE >= platformTop - 2) {
    friendY = platformTop - CONFIG.CHAR_SIZE;
    friendVelY = 0;
  }
  if (trenchFloorY !== null && friendY + CONFIG.CHAR_SIZE >= trenchFloorY - 2) {
    friendY = trenchFloorY - CONFIG.CHAR_SIZE;
    friendVelY = 0;
  }

  const standingInTrench = trenchFloorY !== null && (friendY + CONFIG.CHAR_SIZE >= trenchFloorY - 2);
  if (!isFriendStuckOnObstacle() && !standingInTrench) {
    friendWorldX += (CONFIG.SCROLL_SPEED + CONFIG.FRIEND_FORWARD_BOOST) * dt;
  }

  if (isFriendOffLeft()) {
    triggerGameOver('You got stuck and left behind. Classic.');
    return;
  }
  if (isFriendOffScreen()) {
    triggerGameOver('You fell in. Classic.');
    return;
  }

  const elapsed = getLevelElapsed();
  const mins = Math.floor(elapsed / 60);
  const secs = Math.floor(elapsed % 60);
  timerDisplay.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;

  if (elapsed >= CONFIG.LEVEL1_DURATION) {
    triggerWin();
  }
}

/**
 * Draw Battlefield-style sky: overcast, dusty horizon
 */
function drawSky() {
  const groundY = CONFIG.GROUND_Y;
  const g = ctx.createLinearGradient(0, 0, 0, groundY);
  g.addColorStop(0, '#3d4045');
  g.addColorStop(0.5, '#4a4540');
  g.addColorStop(0.85, '#5c5044');
  g.addColorStop(1, '#6b5a48');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, groundY);
}

/**
 * Distant ruined silhouettes (slow parallax) — Battlefield atmosphere
 */
function drawDistantSilhouettes() {
  const parallaxX = (worldScrollX * 0.15) % 320;
  const groundY = CONFIG.GROUND_Y;
  ctx.fillStyle = '#2a2520';
  for (let i = -1; i <= CONFIG.CANVAS_WIDTH / 320 + 2; i++) {
    const baseX = i * 320 - parallaxX;
    const h1 = 60 + (i * 17) % 40;
    const h2 = 45 + (i * 23) % 35;
    ctx.fillRect(baseX + 20, groundY - h1, 50, h1);
    ctx.fillRect(baseX + 100, groundY - h2, 40, h2);
    ctx.fillRect(baseX + 180, groundY - (h1 - 10), 55, h1 - 10);
    ctx.fillRect(baseX + 260, groundY - (h2 + 15), 45, h2 + 15);
  }
}

/**
 * Parallax hills / rubble in military colors
 */
function drawParallaxBackground() {
  const parallaxX = (worldScrollX * CONFIG.PARALLAX_FACTOR) % 400;
  const groundY = CONFIG.GROUND_Y;
  const colors = ['#3d3830', '#4a4438', '#35302a', '#42402a'];
  for (let i = -1; i <= CONFIG.CANVAS_WIDTH / 400 + 1; i++) {
    const x = i * 400 - parallaxX;
    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath();
    ctx.moveTo(x, CONFIG.CANVAS_HEIGHT);
    ctx.lineTo(x + 80, groundY + 60);
    ctx.lineTo(x + 220, groundY + 20);
    ctx.lineTo(x + 400, CONFIG.CANVAS_HEIGHT);
    ctx.closePath();
    ctx.fill();
  }
}

/**
 * Scrolling ground: mud/dirt, Battlefield-style
 */
function drawScrollingGround() {
  const groundY = CONFIG.GROUND_Y;
  const tileW = CONFIG.GROUND_TILE_WIDTH;
  const offset = worldScrollX % tileW;
  const startTile = Math.floor(-offset / tileW);
  const numTiles = Math.ceil(CONFIG.CANVAS_WIDTH / tileW) + 2;
  for (let i = startTile; i < startTile + numTiles; i++) {
    const x = i * tileW + offset;
    ctx.fillStyle = i % 2 === 0 ? '#4a4035' : '#3d352c';
    ctx.fillRect(x, groundY, tileW, CONFIG.CANVAS_HEIGHT - groundY);
    ctx.fillStyle = '#5c5040';
    ctx.fillRect(x, groundY, tileW, 6);
    ctx.fillStyle = '#2a231c';
    ctx.fillRect(x, groundY + 6, tileW, 4);
  }
}

/**
 * Draw obstacles (cars, house) and trench gaps (dark strip)
 */
function drawObstacles() {
  const groundY = CONFIG.GROUND_Y;
  for (const o of obstacles) {
    const screenX = o.worldX - worldScrollX;
    if (screenX + o.width < 0 || screenX > CONFIG.CANVAS_WIDTH) continue;
    if (o.type === 'trench') {
      const trenchBottom = CONFIG.GROUND_Y + CONFIG.TRENCH_DEPTH;
      ctx.fillStyle = '#1e1814';
      ctx.fillRect(screenX, groundY, o.width, trenchBottom - groundY);
      ctx.fillStyle = '#2a231c';
      ctx.fillRect(screenX, trenchBottom - 6, o.width, 6);
      ctx.strokeStyle = '#3d352c';
      ctx.lineWidth = 2;
      ctx.strokeRect(screenX, groundY, o.width, 4);
      ctx.strokeRect(screenX, trenchBottom - 6, o.width, 6);
      continue;
    }
    if (o.type === 'car') {
      ctx.fillStyle = '#c62828';
      ctx.fillRect(screenX, groundY - o.height, o.width, o.height);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.strokeRect(screenX, groundY - o.height, o.width, o.height);
      ctx.fillStyle = '#333';
      ctx.fillRect(screenX + 10, groundY - 8, 25, 12);
      ctx.fillRect(screenX + o.width - 35, groundY - 8, 25, 12);
    } else if (o.type === 'house') {
      ctx.fillStyle = '#5d4037';
      ctx.fillRect(screenX, groundY - o.height, o.width, o.height);
      ctx.fillStyle = '#8d6e63';
      ctx.fillRect(screenX + 4, groundY - o.height + 4, o.width - 8, o.height - 20);
      ctx.fillStyle = '#37474f';
      ctx.fillRect(screenX + 20, groundY - o.height + 30, 25, 35);
      ctx.fillStyle = '#3e2723';
      ctx.beginPath();
      ctx.moveTo(screenX - 5, groundY - o.height);
      ctx.lineTo(screenX + o.width / 2, groundY - o.height - 25);
      ctx.lineTo(screenX + o.width + 5, groundY - o.height);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.strokeRect(screenX, groundY - o.height, o.width, o.height);
    }
  }
}

/**
 * Draw the game world, obstacles, and characters.
 * Game logic uses logical size 900x500; scale to fill canvas (full viewport on mobile).
 */
function draw() {
  const scaleX = canvas.width / CONFIG.CANVAS_WIDTH;
  const scaleY = canvas.height / CONFIG.CANVAS_HEIGHT;
  ctx.save();
  ctx.scale(scaleX, scaleY);

  drawSky();
  drawDistantSilhouettes();
  drawParallaxBackground();
  drawScrollingGround();
  drawObstacles();

  const animTime = (performance.now() / 1000) - levelStartTime;
  drawSoldier(ctx, ploffersonScreenX, getPloffersonY(), '#2d5016', 'P', animTime, true);
  const friendScreenX = friendWorldX - worldScrollX;
  const color = selectedCharacter ? selectedCharacter.color : '#8b7355';
  const label = selectedCharacter ? selectedCharacter.name.charAt(0) : '?';
  drawSoldier(ctx, friendScreenX, friendY, color, label, animTime, false);

  ctx.restore();
}

/**
 * Arcade-style soldier: head, body, legs with simple walk cycle.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - Left of character (screen)
 * @param {number} y - Top of character (screen)
 * @param {string} color - Body/outfit color
 * @param {string} label - One letter for face/helmet
 * @param {number} animTime - Seconds since level start for walk cycle
 * @param {boolean} isElite - If true, draw Rambo-style (bandana, elite look)
 */
function drawSoldier(ctx, x, y, color, label, animTime, isElite) {
  const w = CONFIG.CHAR_SIZE;
  const h = CONFIG.CHAR_SIZE;
  const cx = x + w / 2;
  const legW = 10;
  const legH = 16;
  const walkPhase = Math.floor(animTime * 6) % 2;
  const legOffset = walkPhase === 0 ? 6 : -6;

  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;

  if (isElite) {
    ctx.fillStyle = '#8b0000';
    ctx.fillRect(x + 2, y, w - 4, 12);
    ctx.strokeRect(x + 2, y, w - 4, 12);
    ctx.fillStyle = '#1a3d0a';
    ctx.fillRect(x + 4, y + 14, w - 8, 18);
    ctx.strokeRect(x + 4, y + 14, w - 8, 18);
    ctx.fillStyle = '#2d5016';
    ctx.fillRect(x + 8, y + 16, w - 16, 12);
    ctx.fillStyle = '#c4a574';
    ctx.beginPath();
    ctx.arc(cx, y + 22, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#000';
    ctx.font = 'bold 10px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('P', cx, y + 22);
  } else {
    ctx.fillStyle = '#5c4a3a';
    ctx.fillRect(x + 4, y + 2, w - 8, 10);
    ctx.strokeRect(x + 4, y + 2, w - 8, 10);
    ctx.fillStyle = color;
    ctx.fillRect(x + 6, y + 14, w - 12, 16);
    ctx.strokeRect(x + 6, y + 14, w - 12, 16);
    ctx.fillStyle = '#c4a574';
    ctx.beginPath();
    ctx.arc(cx, y + 20, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, y + 20);
  }

  const baseY = y + h - legH;
  ctx.fillStyle = isElite ? '#1a3d0a' : '#5c4a3a';
  ctx.fillRect(x + 8 + legOffset, baseY, legW, legH);
  ctx.strokeRect(x + 8 + legOffset, baseY, legW, legH);
  ctx.fillRect(x + w - 18 - legOffset, baseY, legW, legH);
  ctx.strokeRect(x + w - 18 - legOffset, baseY, legW, legH);
}

/**
 * Main game loop
 * @param {number} time - requestAnimationFrame timestamp
 */
function gameLoop(time) {
  const dt = Math.min((time - lastTime) / 1000, 0.1);
  lastTime = time;
  if (state === GameState.PLAYING) {
    update(dt);
    draw();
  }
  animationId = requestAnimationFrame(gameLoop);
}

/**
 * Bind game over and win screen buttons (single handler each; defer start so screen updates)
 */
function initGameOverAndWin() {
  document.getElementById('btn-retry').addEventListener('click', () => {
    setState(GameState.PLAYING, 'game-screen');
    requestAnimationFrame(() => startLevel1());
  });
  document.getElementById('btn-gameover-menu').addEventListener('click', () => {
    setState(GameState.MENU, 'main-menu');
  });
  document.getElementById('btn-next-level').addEventListener('click', () => {
    setState(GameState.MENU, 'main-menu');
  });
  document.getElementById('btn-win-menu').addEventListener('click', () => {
    setState(GameState.MENU, 'main-menu');
  });
}

/**
 * Initialize the game: menus, input, and navigation
 */
function init() {
  initMainMenu();
  initChoosePlayer();
  initModal();
  initInput();
  initTouchControls();
  initGameOverAndWin();
  window.addEventListener('resize', () => {
    if (state === GameState.PLAYING) resizeCanvas();
  });
  showScreen('main-menu');
}

init();
