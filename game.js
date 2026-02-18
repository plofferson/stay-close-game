/**
 * Stay Close — Game constants (tweak these for balance)
 * Auto-runner: friend moves with the world, tap/button to jump over obstacles.
 */
const CONFIG = {
  /** World scroll speed (px per second) — map moves left; friend stays fixed on screen */
  SCROLL_SPEED: 161,
  /** Extra forward speed (px/s) so the character drifts right and can catch up — lower = harder to stay close */
  FRIEND_FORWARD_BOOST: 18,
  /** Level 1 duration (seconds) to win */
  LEVEL1_DURATION: 30,
  /** Friend fixed X on screen (pixels from left) — only vertical movement */
  FRIEND_FIXED_X: 110,
  /** Gravity (px/s²) applied when in air */
  GRAVITY: 520,
  /** Upward velocity (px/s) when jump is pressed */
  JUMP_VELOCITY: -320,
  /** Right 25% of screen: Plofferson stays in this zone */
  PLOFFERSON_ZONE_RIGHT_FRACTION: 0.25,
  PLOFFERSON_WANDER_AMPLITUDE: 30,
  PLOFFERSON_WANDER_SPEED: 1.2,
  /** How far friend can be off left of screen before game over (stuck / left behind) */
  FRIEND_OFF_LEFT_MARGIN: 40,
  /** Ground level (Y) for characters on screen — narrow portrait view */
  GROUND_Y: 520,
  /** Narrow portrait (Flappy Bird style): less horizontal view, less time to react */
  CANVAS_WIDTH: 360,
  CANVAS_HEIGHT: 640,
  CHAR_SIZE: 40,
  GROUND_TILE_WIDTH: 128,
  PARALLAX_FACTOR: 0.25,
  /** Obstacle spawn: tighter spacing for narrow view */
  OBSTACLE_SPAWN_MIN: 120,
  OBSTACLE_SPAWN_MAX: 220,
  /** Obstacle definitions: width (world px), height (px from ground up) */
  OBSTACLES: {
    car: { width: 55, height: 26 },
    tank: { width: 72, height: 32 },
    house1: { width: 58, height: 42 },
    house2: { width: 58, height: 80 },
  },
  /** Small gap between 1-story and 2-story in a house pair */
  HOUSE_PAIR_GAP: 6,
  /** Intro: plane flies in, then parachute drop to start position */
  PLANE_SPEED: 95,
  PLANE_ENTRY_X_OFFSET: 120,
  PLANE_DROP_X_FRACTION: 0.55,
  PLANE_ALTITUDE_Y: 130,
  PARACHUTE_DESCENT_SPEED: 72,
  PARACHUTE_HORIZONTAL_SPEED: 90,
  /** Score: when friend is within this distance (px) of Plofferson, earn points — smaller = harder to score */
  SCORE_CLOSE_RANGE: 65,
  /** Points per second when in close range */
  SCORE_POINTS_PER_SECOND: 12,
  /** After landing: first obstacle spawns this far (world px) beyond right edge, so player has room to react */
  LANDING_GRACE_DISTANCE: 220,
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
/** Active obstacles: { type: 'car'|'tank'|'house1'|'house2', worldX: number, width, height } */
let obstacles = [];
/** Next obstacle will spawn when world passes this X */
let nextObstacleAt = 0;

/** Intro phase: 'parachute' = plane + drop, 'running' = normal level */
let levelPhase = 'running';
let planeX = 0;
let planeY = 0;
let parachuteDropped = false;
let friendParachuteX = 0;
let friendParachuteY = 0;
let ploffersonParachuteX = 0;
let ploffersonParachuteY = 0;
let ploffersonTargetX = 0;

/** Current score (earned when close to Plofferson) */
let score = 0;

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
const scoreDisplay = document.getElementById('score-display');

/**
 * Show a single screen and hide others
 * @param {string} screenId - Id of the screen element (e.g. 'main-menu')
 */
function showScreen(screenId) {
  const all = document.querySelectorAll('.screen');
  all.forEach((el) => el.classList.remove('active'));
  const target = document.getElementById(screenId);
  if (target) target.classList.add('active');
  if (screenId === 'main-menu') updateMainMenuState();
}

/**
 * Update main menu: Start Game enabled only when a character is chosen
 */
function updateMainMenuState() {
  const btnStart = document.getElementById('btn-start');
  if (!btnStart) return;
  const hasCharacter = selectedCharacter !== null;
  btnStart.disabled = !hasCharacter;
  if (selectedPlayerDisplay) {
    selectedPlayerDisplay.textContent = hasCharacter ? `Playing as: ${selectedCharacter.name}` : 'Choose a character to start';
    selectedPlayerDisplay.classList.toggle('empty', !hasCharacter);
  }
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
    if (!selectedCharacter) return;
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
  setState(GameState.PLAYING, 'game-screen');
  requestAnimationFrame(() => startLevel1());
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
 * Spawn one obstacle or a house pair (1-story then 2-story). Tanks and cars single; houses always 1 then 2.
 */
function spawnObstacle() {
  const roll = Math.random();
  if (roll < 0.4) {
    const h1 = CONFIG.OBSTACLES.house1;
    const h2 = CONFIG.OBSTACLES.house2;
    const gap = CONFIG.HOUSE_PAIR_GAP;
    obstacles.push({ type: 'house1', worldX: nextObstacleAt, width: h1.width, height: h1.height });
    obstacles.push({ type: 'house2', worldX: nextObstacleAt + h1.width + gap, width: h2.width, height: h2.height });
    const pairWidth = h1.width + gap + h2.width;
    const spacing = CONFIG.OBSTACLE_SPAWN_MIN + Math.random() * (CONFIG.OBSTACLE_SPAWN_MAX - CONFIG.OBSTACLE_SPAWN_MIN);
    nextObstacleAt += pairWidth + spacing;
    return;
  }
  const types = ['car', 'tank'];
  const type = types[Math.floor(Math.random() * types.length)];
  const def = CONFIG.OBSTACLES[type];
  obstacles.push({
    type,
    worldX: nextObstacleAt,
    width: def.width,
    height: def.height,
  });
  const spacing = CONFIG.OBSTACLE_SPAWN_MIN + Math.random() * (CONFIG.OBSTACLE_SPAWN_MAX - CONFIG.OBSTACLE_SPAWN_MIN);
  nextObstacleAt += def.width + spacing;
}

/**
 * Remove obstacles that have scrolled off to the left
 */
function pruneObstacles() {
  obstacles = obstacles.filter((o) => o.worldX + o.width > worldScrollX - 50);
}

/** Solid ground everywhere (no trenches). */
function isGroundAt() {
  return true;
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
  ploffersonTargetX = zone.center;
  friendY = CONFIG.GROUND_Y - CONFIG.CHAR_SIZE;
  friendVelY = 0;
  levelStartTime = performance.now() / 1000;
  timerDisplay.textContent = '0:00';
  lastTime = performance.now();

  levelPhase = 'parachute';
  planeX = CONFIG.CANVAS_WIDTH + CONFIG.PLANE_ENTRY_X_OFFSET;
  planeY = CONFIG.PLANE_ALTITUDE_Y;
  parachuteDropped = false;

  score = 0;
  if (scoreDisplay) scoreDisplay.textContent = '0';
  const tauntEl = document.getElementById('taunt-message');
  if (tauntEl) tauntEl.classList.add('hidden');

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
    const oLeft = o.worldX - 2;
    const oRight = o.worldX + o.width + 2;
    if (friendRight <= oLeft || friendLeft >= oRight) continue;
    const obstacleTop = groundYLine - o.height;
    if (friendBottom >= obstacleTop - 3 && friendBottom <= obstacleTop + 28) {
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
 * Game over: show scorecard with player name, "Trainen. Melden.", and score
 */
function triggerGameOver() {
  cancelAnimationFrame(animationId);
  const tc = document.getElementById('touch-controls');
  if (tc) tc.classList.remove('visible');
  const nameEl = document.getElementById('gameover-player-name');
  const scoreEl = document.getElementById('gameover-score');
  if (nameEl) nameEl.textContent = selectedCharacter ? selectedCharacter.name : 'Speler';
  if (scoreEl) {
    scoreEl.textContent = '';
    scoreEl.style.display = 'none';
  }
  setState(GameState.GAMEOVER, 'gameover-screen');
}

/**
 * Win: show scorecard with player name, dream team quote, and score
 */
function triggerWin() {
  cancelAnimationFrame(animationId);
  const tc = document.getElementById('touch-controls');
  if (tc) tc.classList.remove('visible');
  const nameEl = document.getElementById('win-player-name');
  const scoreEl = document.getElementById('win-score');
  if (nameEl) nameEl.textContent = selectedCharacter ? selectedCharacter.name : 'Speler';
  if (scoreEl) scoreEl.textContent = `Score: ${Math.floor(score)}`;
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
 * Intro: plane flies in from right; at DROP_X both jump and parachute to start positions.
 */
function updateParachuteIntro(dt) {
  const groundY = CONFIG.GROUND_Y;
  const dropX = CONFIG.CANVAS_WIDTH * CONFIG.PLANE_DROP_X_FRACTION;

  if (!parachuteDropped) {
    planeX -= CONFIG.PLANE_SPEED * dt;
    if (planeX <= dropX) {
      parachuteDropped = true;
      friendParachuteX = planeX - 20;
      friendParachuteY = planeY;
      ploffersonParachuteX = planeX + 20;
      ploffersonParachuteY = planeY;
    }
    return;
  }

  const descent = CONFIG.PARACHUTE_DESCENT_SPEED * dt;
  friendParachuteY += descent;
  ploffersonParachuteY += descent;

  const moveX = (current, target) => {
    const dx = target - current;
    const step = CONFIG.PARACHUTE_HORIZONTAL_SPEED * dt;
    if (Math.abs(dx) <= step) return target;
    return current + Math.sign(dx) * step;
  };
  friendParachuteX = moveX(friendParachuteX, CONFIG.FRIEND_FIXED_X);
  ploffersonParachuteX = moveX(ploffersonParachuteX, ploffersonTargetX);

  const landY = groundY - CONFIG.CHAR_SIZE;
  if (friendParachuteY + CONFIG.CHAR_SIZE >= groundY - 2) friendParachuteY = landY;
  if (ploffersonParachuteY + CONFIG.CHAR_SIZE >= groundY - 2) ploffersonParachuteY = landY;

  const friendLanded = friendParachuteY >= landY - 1;
  const ploffersonLanded = ploffersonParachuteY >= landY - 1;
  if (friendLanded && ploffersonLanded) {
    levelPhase = 'running';
    friendY = landY;
    friendWorldX = CONFIG.FRIEND_FIXED_X;
    ploffersonScreenX = ploffersonParachuteX;
    levelStartTime = performance.now() / 1000;
    nextObstacleAt = worldScrollX + CONFIG.CANVAS_WIDTH + CONFIG.LANDING_GRACE_DISTANCE;
  }
}

/**
 * Draw intro: static background, then plane with soldiers or parachutes descending.
 */
function drawParachuteIntro() {
  drawSky();
  drawDistantSilhouettes();
  drawParallaxBackground();
  drawScrollingGround();

  const animTime = (performance.now() / 1000) - levelStartTime;
  if (!parachuteDropped) {
    drawPlane(planeX, planeY);
  } else {
    drawParachuteCanopy(friendParachuteX, friendParachuteY);
    drawParachuteCanopy(ploffersonParachuteX, ploffersonParachuteY);
    const color = selectedCharacter ? selectedCharacter.color : '#8b7355';
    const label = selectedCharacter ? selectedCharacter.name.charAt(0) : '?';
    drawSoldier(ctx, friendParachuteX, friendParachuteY, color, label, animTime, false);
    drawSoldier(ctx, ploffersonParachuteX, ploffersonParachuteY, '#2d5016', 'P', animTime, true);
  }
}

function drawPlane(x, y) {
  const w = 88;
  const h = 28;
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1.5;

  ctx.fillStyle = '#7d8a9a';
  ctx.fillRect(x, y + 4, w, h - 8);
  ctx.strokeRect(x, y + 4, w, h - 8);

  ctx.fillStyle = '#8a96a6';
  ctx.beginPath();
  ctx.moveTo(x + 4, y + 4);
  ctx.lineTo(x + 22, y);
  ctx.lineTo(x + 42, y);
  ctx.lineTo(x + 46, y + 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#37474f';
  ctx.fillRect(x + 24, y + 2, 22, 10);
  ctx.strokeRect(x + 24, y + 2, 22, 10);

  ctx.fillStyle = '#5a6a7a';
  ctx.beginPath();
  ctx.moveTo(x + w - 4, y + 8);
  ctx.lineTo(x + w + 6, y + 6);
  ctx.lineTo(x + w + 6, y + h - 10);
  ctx.lineTo(x + w - 4, y + h - 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#6b7b8b';
  ctx.beginPath();
  ctx.moveTo(x + w - 12, y + 6);
  ctx.lineTo(x + w + 2, y + 4);
  ctx.lineTo(x + w + 2, y + h - 6);
  ctx.lineTo(x + w - 12, y + h - 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#2a2a2a';
  ctx.beginPath();
  ctx.arc(x + 8, y + h / 2, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawParachuteCanopy(characterX, characterY) {
  const w = CONFIG.CHAR_SIZE;
  const cx = characterX + w / 2;
  const canopyY = characterY - 28;
  const canopyW = 36;
  const canopyH = 18;
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1.5;
  ctx.fillStyle = '#e74c3c';
  ctx.beginPath();
  ctx.moveTo(cx - canopyW / 2, canopyY + canopyH);
  ctx.lineTo(cx, canopyY);
  ctx.lineTo(cx + canopyW / 2, canopyY + canopyH);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#2c3e50';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 8, canopyY + canopyH);
  ctx.lineTo(characterX + 10, characterY);
  ctx.moveTo(cx + 8, canopyY + canopyH);
  ctx.lineTo(characterX + w - 10, characterY);
  ctx.moveTo(cx, canopyY + canopyH - 2);
  ctx.lineTo(cx, characterY + 4);
  ctx.stroke();
}

/**
 * Update game logic for Level 1 (auto-runner: jump over obstacles; stuck = fall behind)
 * @param {number} dt - Delta time in seconds
 */
function update(dt) {
  if (levelPhase === 'parachute') {
    updateParachuteIntro(dt);
    return;
  }

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

  const platformTopBefore = getPlatformTopUnderFriend();
  const onPlatformBefore = platformTopBefore !== null;

  if (onSolidGround && !onPlatformBefore) {
    friendY = Math.min(friendY, groundY);
    if (friendY >= groundY - 1) friendVelY = 0;
  }

  const canJumpFrom = onSolidGround || onPlatformBefore;
  if (keys.jump && canJumpFrom && friendVelY >= 0) {
    const standY = onPlatformBefore ? platformTopBefore - CONFIG.CHAR_SIZE : groundY;
    if (friendY >= standY - 6) friendVelY = CONFIG.JUMP_VELOCITY;
  }
  friendVelY += CONFIG.GRAVITY * dt;
  friendY += friendVelY * dt;

  if (onSolidGround && !onPlatformBefore) {
    friendY = Math.min(friendY, groundY);
    if (friendY >= groundY - 1) friendVelY = 0;
  }
  const platformTop = getPlatformTopUnderFriend();
  if (platformTop !== null && friendVelY >= 0 && friendY + CONFIG.CHAR_SIZE >= platformTop - 4) {
    friendY = platformTop - CONFIG.CHAR_SIZE;
    friendVelY = 0;
  }

  if (!isFriendStuckOnObstacle()) {
    friendWorldX += (CONFIG.SCROLL_SPEED + CONFIG.FRIEND_FORWARD_BOOST) * dt;
  }

  if (isFriendOffLeft()) {
    triggerGameOver();
    return;
  }
  if (isFriendOffScreen()) {
    triggerGameOver();
    return;
  }

  const elapsed = getLevelElapsed();
  const mins = Math.floor(elapsed / 60);
  const secs = Math.floor(elapsed % 60);
  timerDisplay.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;

  const friendScreenX = friendWorldX - worldScrollX;
  const dist = Math.abs(friendScreenX - ploffersonScreenX);
  if (dist <= CONFIG.SCORE_CLOSE_RANGE) {
    score += CONFIG.SCORE_POINTS_PER_SECOND * dt;
  }
  if (scoreDisplay) scoreDisplay.textContent = Math.floor(score);

  const tauntEl = document.getElementById('taunt-message');
  if (tauntEl) {
    if (dist > CONFIG.SCORE_CLOSE_RANGE) tauntEl.classList.remove('hidden');
    else tauntEl.classList.add('hidden');
  }

  if (elapsed >= CONFIG.LEVEL1_DURATION) {
    triggerWin();
  }
}

/**
 * Draw clean sky: light blue top, lighter at horizon (Flappy Bird style)
 */
function drawSky() {
  const groundY = CONFIG.GROUND_Y;
  const g = ctx.createLinearGradient(0, 0, 0, groundY);
  g.addColorStop(0, '#87ceeb');
  g.addColorStop(0.6, '#b0e0e6');
  g.addColorStop(1, '#dee8d5');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, groundY);
}

/**
 * Simple distant silhouettes — minimal city/trees, clean look
 */
function drawDistantSilhouettes() {
  const parallaxX = (worldScrollX * 0.12) % 200;
  const groundY = CONFIG.GROUND_Y;
  ctx.fillStyle = '#7ba3a8';
  for (let i = -1; i <= CONFIG.CANVAS_WIDTH / 200 + 2; i++) {
    const baseX = i * 200 - parallaxX;
    const h = 35 + (i * 11) % 25;
    ctx.fillRect(baseX + 10, groundY - h, 45, h);
    ctx.fillRect(baseX + 80, groundY - (h - 8), 35, h - 8);
    ctx.fillRect(baseX + 150, groundY - (h + 5), 40, h + 5);
  }
}

/**
 * Simple low parallax hills — one clean layer
 */
function drawParallaxBackground() {
  const parallaxX = (worldScrollX * CONFIG.PARALLAX_FACTOR) % 280;
  const groundY = CONFIG.GROUND_Y;
  ctx.fillStyle = '#8fbc8f';
  for (let i = -1; i <= CONFIG.CANVAS_WIDTH / 280 + 1; i++) {
    const x = i * 280 - parallaxX;
    ctx.beginPath();
    ctx.moveTo(x, CONFIG.CANVAS_HEIGHT);
    ctx.lineTo(x + 60, groundY + 30);
    ctx.lineTo(x + 180, groundY + 10);
    ctx.lineTo(x + 280, CONFIG.CANVAS_HEIGHT);
    ctx.closePath();
    ctx.fill();
  }
}

/**
 * Scrolling ground: simple two-tone, thin top edge — clean
 */
function drawScrollingGround() {
  const groundY = CONFIG.GROUND_Y;
  const tileW = CONFIG.GROUND_TILE_WIDTH;
  const offset = worldScrollX % tileW;
  const startTile = Math.floor(-offset / tileW);
  const numTiles = Math.ceil(CONFIG.CANVAS_WIDTH / tileW) + 2;
  for (let i = startTile; i < startTile + numTiles; i++) {
    const x = i * tileW + offset;
    ctx.fillStyle = i % 2 === 0 ? '#8b7355' : '#a0826d';
    ctx.fillRect(x, groundY, tileW, CONFIG.CANVAS_HEIGHT - groundY);
    ctx.fillStyle = '#6b5344';
    ctx.fillRect(x, groundY, tileW, 4);
  }
}

/**
 * Draw obstacles: cars, tanks, 1-story and 2-story houses (flat roof)
 */
function drawObstacles() {
  const groundY = CONFIG.GROUND_Y;
  for (const o of obstacles) {
    const screenX = o.worldX - worldScrollX;
    if (screenX + o.width < 0 || screenX > CONFIG.CANVAS_WIDTH) continue;

    if (o.type === 'car') {
      drawCar(screenX, groundY, o.width, o.height);
    } else if (o.type === 'tank') {
      drawTank(screenX, groundY, o.width, o.height);
    } else if (o.type === 'house1' || o.type === 'house2') {
      drawHouse(screenX, groundY, o.width, o.height, o.type === 'house2');
    }
  }
}

function drawCar(screenX, groundY, w, h) {
  const top = groundY - h;
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1.5;
  ctx.fillStyle = '#2c3e50';
  ctx.fillRect(screenX, top, w, h * 0.5);
  ctx.strokeRect(screenX, top, w, h * 0.5);
  ctx.fillStyle = '#c0392b';
  ctx.fillRect(screenX + 2, top + 2, w - 4, h * 0.45);
  ctx.strokeRect(screenX + 2, top + 2, w - 4, h * 0.45);
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(screenX + w * 0.15, top + h * 0.2, w * 0.25, h * 0.22);
  ctx.fillRect(screenX + w * 0.6, top + h * 0.2, w * 0.25, h * 0.22);
  ctx.fillStyle = '#34495e';
  ctx.fillRect(screenX + 4, top + 4, w - 8, h * 0.18);
  ctx.fillStyle = '#2c3e50';
  const wheelR = Math.min(6, h * 0.35);
  ctx.beginPath();
  ctx.arc(screenX + w * 0.22, groundY - wheelR, wheelR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(screenX + w * 0.78, groundY - wheelR, wheelR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawTank(screenX, groundY, w, h) {
  const top = groundY - h;
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1.5;
  ctx.fillStyle = '#4a5d4a';
  ctx.fillRect(screenX, top + h * 0.35, w, h * 0.65);
  ctx.strokeRect(screenX, top + h * 0.35, w, h * 0.65);
  ctx.fillStyle = '#3d4d3d';
  ctx.fillRect(screenX + 2, top + h * 0.38, w - 4, h * 0.25);
  ctx.fillStyle = '#5a6d5a';
  ctx.fillRect(screenX + w * 0.15, top, w * 0.7, h * 0.4);
  ctx.strokeRect(screenX + w * 0.15, top, w * 0.7, h * 0.4);
  ctx.fillStyle = '#2a352a';
  ctx.fillRect(screenX + w * 0.5, top + h * 0.08, w * 0.35, h * 0.2);
  ctx.strokeRect(screenX + w * 0.5, top + h * 0.08, w * 0.35, h * 0.2);
  const barrelW = w * 0.45;
  const barrelH = Math.max(4, h * 0.12);
  const barrelY = top + h * 0.18 - barrelH / 2;
  ctx.fillStyle = '#2a352a';
  ctx.fillRect(screenX + w * 0.82, barrelY, barrelW, barrelH);
  ctx.strokeRect(screenX + w * 0.82, barrelY, barrelW, barrelH);
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(screenX + w * 0.82 + barrelW - 4, barrelY, 4, barrelH);
  const trackH = Math.min(10, h * 0.28);
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(screenX + 4, groundY - trackH, w - 8, trackH);
  ctx.strokeRect(screenX + 4, groundY - trackH, w - 8, trackH);
  for (let i = 0; i < 6; i++) {
    const tx = screenX + 8 + (i / 5) * (w - 16);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(tx, groundY - trackH + 2, 4, trackH - 4);
  }
}

function drawHouse(screenX, groundY, w, h, isTwoStory) {
  const top = groundY - h;
  ctx.strokeStyle = '#2c2c2c';
  ctx.lineWidth = 1.5;
  ctx.fillStyle = '#8b7355';
  ctx.fillRect(screenX, top, w, h);
  ctx.strokeRect(screenX, top, w, h);
  ctx.fillStyle = '#a0826d';
  const storyH = h / (isTwoStory ? 2 : 1);
  ctx.fillRect(screenX + 3, top + 3, w - 6, storyH - 4);
  if (isTwoStory) {
    ctx.fillRect(screenX + 3, top + storyH + 2, w - 6, storyH - 5);
    ctx.fillStyle = '#6b5344';
    ctx.fillRect(screenX, top + storyH - 2, w, 4);
  }
  ctx.fillStyle = '#37474f';
  const winW = w * 0.28;
  const winH = storyH * 0.35;
  ctx.fillRect(screenX + (w - winW) * 0.35, top + storyH * 0.35, winW, winH);
  if (isTwoStory) {
    ctx.fillRect(screenX + (w - winW) * 0.35, top + storyH + storyH * 0.35, winW, winH);
  }
  ctx.fillStyle = '#5a4a3a';
  ctx.fillRect(screenX, top + h - 6, w, 6);
  ctx.strokeRect(screenX, top + h - 6, w, 6);
}

/**
 * Draw the game world, obstacles, and characters.
 * Game logic uses logical size (CONFIG); scale to fill canvas (full viewport on mobile).
 */
function draw() {
  const scaleX = canvas.width / CONFIG.CANVAS_WIDTH;
  const scaleY = canvas.height / CONFIG.CANVAS_HEIGHT;
  ctx.save();
  ctx.scale(scaleX, scaleY);

  if (levelPhase === 'parachute') {
    drawParachuteIntro();
  } else {
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
  }

  ctx.restore();
}

/**
 * Soldier-style character: helmet, vest, legs with walk cycle; optional rifle.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - Left of character (screen)
 * @param {number} y - Top of character (screen)
 * @param {string} color - Body/vest color
 * @param {string} label - One letter for ID
 * @param {number} animTime - Seconds since level start for walk cycle
 * @param {boolean} isElite - If true, bandana + tactical (Plofferson)
 */
function drawSoldier(ctx, x, y, color, label, animTime, isElite) {
  const w = CONFIG.CHAR_SIZE;
  const h = CONFIG.CHAR_SIZE;
  const cx = x + w / 2;
  const legW = 8;
  const legH = 12;
  const walkPhase = Math.floor(animTime * 6) % 2;
  const legOffset = walkPhase === 0 ? 4 : -4;

  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1.5;

  // Head: helmet (rounded) or bandana (elite)
  const headTop = y + 2;
  const headH = 12;
  if (isElite) {
    ctx.fillStyle = '#8b0000';
    ctx.beginPath();
    ctx.roundRect(x + 3, headTop, w - 6, headH - 2, 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#1a3d0a';
    ctx.beginPath();
    ctx.arc(cx, headTop + 6, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#2d5016';
    ctx.fillRect(x + 4, headTop + 8, w - 8, 4);
  } else {
    ctx.fillStyle = '#4a4a4a';
    ctx.beginPath();
    ctx.roundRect(x + 4, headTop, w - 8, headH, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(x + 6, headTop + 2, 4, 3);
    ctx.fillRect(x + w - 10, headTop + 2, 4, 3);
    ctx.fillStyle = '#c4a574';
    ctx.beginPath();
    ctx.arc(cx, headTop + 7, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 8px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, headTop + 7);
  }

  // Vest / body armor
  const bodyY = headTop + headH;
  const bodyH = 14;
  ctx.fillStyle = isElite ? '#1a3d0a' : color;
  ctx.fillRect(x + 5, bodyY, w - 10, bodyH);
  ctx.strokeRect(x + 5, bodyY, w - 10, bodyH);
  ctx.fillStyle = isElite ? '#2d5016' : 'rgba(0,0,0,0.15)';
  ctx.fillRect(cx - 2, bodyY + 2, 4, bodyH - 4);

  // Rifle (small silhouette on right side)
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(x + w - 4, bodyY + 2, 6, bodyH - 2);
  ctx.strokeRect(x + w - 4, bodyY + 2, 6, bodyH - 2);

  // Legs + boots
  const baseY = y + h - legH;
  ctx.fillStyle = isElite ? '#1a3d0a' : '#5c4a3a';
  ctx.fillRect(x + 6 + legOffset, baseY, legW, legH - 2);
  ctx.strokeRect(x + 6 + legOffset, baseY, legW, legH - 2);
  ctx.fillRect(x + w - 14 - legOffset, baseY, legW, legH - 2);
  ctx.strokeRect(x + w - 14 - legOffset, baseY, legW, legH - 2);
  ctx.fillStyle = '#3d3025';
  ctx.fillRect(x + 5 + legOffset, baseY + legH - 3, legW + 2, 3);
  ctx.fillRect(x + w - 15 - legOffset, baseY + legH - 3, legW + 2, 3);
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
  document.getElementById('btn-win-retry').addEventListener('click', () => {
    setState(GameState.PLAYING, 'game-screen');
    requestAnimationFrame(() => startLevel1());
  });
  document.getElementById('btn-win-menu').addEventListener('click', () => {
    setState(GameState.MENU, 'main-menu');
  });
}

/**
 * Start screen: click to open main menu
 */
function initStartScreen() {
  const startEl = document.getElementById('start-screen');
  if (!startEl) return;
  startEl.addEventListener('click', () => showScreen('main-menu'));
}

/**
 * Initialize the game: menus, input, and navigation
 */
function init() {
  initStartScreen();
  initMainMenu();
  initChoosePlayer();
  initModal();
  initInput();
  initTouchControls();
  initGameOverAndWin();
  window.addEventListener('resize', () => {
    if (state === GameState.PLAYING) resizeCanvas();
  });
  showScreen('start-screen');
}

init();
