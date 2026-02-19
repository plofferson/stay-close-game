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
    jeep: { width: 54, height: 28 },
    tank: { width: 94, height: 40 },
    house1: { width: 58, height: 42 },
    house2: { width: 58, height: 80 },
  },
  /** Small gap between 1-story and 2-story in a house pair */
  HOUSE_PAIR_GAP: 6,
  /** Intro: tooltip first, then plane flies in, then parachute drop */
  L1_INTRO_DURATION: 3,
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

  /** Level 2: Chopper — Flappy-style: flap = impulse up, no input = gravity down. Score = seconds survived. */
  LEVEL2_DURATION: 60,
  L2_SCROLL_SPEED: 195,
  L2_INTRO_DURATION: 3,
  HELI_FIXED_X: 100,
  HELI_FLAP_VELOCITY: -220,
  HELI_GRAVITY: 480,
  HELI_SIZE: 36,
  L2_GRACE_DISTANCE: 120,
  L2_SPAWN_MIN: 90,
  L2_SPAWN_MAX: 200,
  L2_BUILDING_WIDTH_MIN: 42,
  L2_BUILDING_WIDTH_MAX: 88,
  L2_BUILDING_HEIGHT_MIN: 80,
  L2_BUILDING_HEIGHT_MAX: 420,
  L2_BUILDING_LOW_THRESHOLD: 180,
  L2_MINE_RADIUS: 12,
  /** Mines in upper half of screen only (Y = 0 is top) */
  L2_MINE_Y_MIN: 70,
  L2_MINE_Y_MAX: 310,
  L2_BALLOON_SIZE: 38,
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
let keys = { jump: false, heliFlap: false };
/** Active obstacles: { type: 'jeep'|'tank'|'house1'|'house2', worldX: number, width, height } */
let obstacles = [];
/** Next obstacle will spawn when world passes this X */
let nextObstacleAt = 0;

/** Intro phase: 'intro_tooltip' = L1 tooltip, 'parachute' = plane + drop, 'running' = normal level */
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

/** Which level is playing (1 or 2) */
let currentLevel = 1;

/** Level 2: helicopter Y, velocity, last control (up/stable/down) */
let heliY = 0;
let heliVelY = 0;
/** Plofferson head image (photo with helmet); drawn when loaded */
let ploffersonHeadImage = null;

/** Level 2: explosion phase (crash/ground) before game over */
let l2ExplosionStartTime = 0;
/** Level 2: seconds survived when defeated (score); set when crash starts */
let level2ScoreAtDeath = 0;
const L2_EXPLOSION_DURATION = 0.9;

/** Level 2 obstacles: { type: 'building'|'mine', worldX, width?, height?, y?, radius? } */
let l2Obstacles = [];
let nextL2ObstacleAt = 0;

/** Level 1 completed (unlocks Level 2); persisted in localStorage */
let level1Completed = false;

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
 * Update main menu: Level 1 enabled when character chosen; Level 2 when L1 completed
 */
function updateMainMenuState() {
  const hasCharacter = selectedCharacter !== null;
  const btnL1 = document.getElementById('btn-level1');
  const btnL2 = document.getElementById('btn-level2');
  if (btnL1) btnL1.disabled = !hasCharacter;
  if (btnL2) btnL2.disabled = !hasCharacter || !level1Completed;
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
  document.getElementById('btn-level1').addEventListener('click', () => {
    if (!selectedCharacter) return;
    currentLevel = 1;
    setState(GameState.PLAYING, 'game-screen');
    requestAnimationFrame(() => startLevel1());
  });
  document.getElementById('btn-level2').addEventListener('click', () => {
    if (!selectedCharacter || !level1Completed) return;
    currentLevel = 2;
    setState(GameState.PLAYING, 'game-screen');
    requestAnimationFrame(() => startLevel2());
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
 * Spawn one obstacle or a house pair (1-story then 2-story). Jeeps and tanks single; houses always 1 then 2.
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
  const types = ['jeep', 'tank'];
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
  if (timerDisplay) timerDisplay.classList.remove('hidden');
  lastTime = performance.now();

  levelPhase = 'intro_tooltip';
  planeX = CONFIG.CANVAS_WIDTH + CONFIG.PLANE_ENTRY_X_OFFSET;
  planeY = CONFIG.PLANE_ALTITUDE_Y;
  parachuteDropped = false;

  score = 0;
  if (scoreDisplay) { scoreDisplay.textContent = '0'; scoreDisplay.classList.remove('hidden'); }
  const tauntEl = document.getElementById('taunt-message');
  if (tauntEl) tauntEl.classList.add('hidden');

  if (isTouchDevice()) {
    const tc = document.getElementById('touch-controls');
    if (tc) tc.classList.add('visible');
    const tapZone = document.getElementById('l2-tap-zone');
    if (tapZone) tapZone.classList.add('hidden');
  }
  requestAnimationFrame(gameLoop);
}

function startLevel2() {
  resizeCanvas();
  currentLevel = 2;
  worldScrollX = 0;
  heliY = CONFIG.CANVAS_HEIGHT / 2 - CONFIG.HELI_SIZE / 2;
  heliVelY = 0;
  keys.heliFlap = false;
  l2Obstacles = [];
  nextL2ObstacleAt = CONFIG.CANVAS_WIDTH + CONFIG.L2_GRACE_DISTANCE;
  levelStartTime = performance.now() / 1000;
  l2ExplosionStartTime = 0;
  level2ScoreAtDeath = 0;
  timerDisplay.textContent = '0:00';
  if (timerDisplay) timerDisplay.classList.remove('hidden');
  lastTime = performance.now();
  if (scoreDisplay) scoreDisplay.classList.add('hidden');
  const tauntEl = document.getElementById('taunt-message');
  if (tauntEl) tauntEl.classList.add('hidden');

  while (nextL2ObstacleAt < CONFIG.CANVAS_WIDTH + 200) spawnL2Obstacle();

  if (isTouchDevice()) {
    const tc = document.getElementById('touch-controls');
    if (tc) tc.classList.remove('visible');
    const tapZone = document.getElementById('l2-tap-zone');
    if (tapZone) { tapZone.classList.remove('hidden'); tapZone.classList.add('visible'); }
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
 * Game over: show only retry and menu buttons; for L2 show score (seconds survived)
 */
function triggerGameOver() {
  cancelAnimationFrame(animationId);
  const tc = document.getElementById('touch-controls');
  if (tc) tc.classList.remove('visible');
  const tapZone = document.getElementById('l2-tap-zone');
  if (tapZone) tapZone.classList.add('hidden');
  const l2ScoreEl = document.getElementById('gameover-l2-score');
  if (l2ScoreEl) {
    if (currentLevel === 2) {
      l2ScoreEl.textContent = `Score: ${level2ScoreAtDeath}s`;
      l2ScoreEl.classList.remove('hidden');
    } else {
      l2ScoreEl.classList.add('hidden');
    }
  }
  setState(GameState.GAMEOVER, 'gameover-screen');
}

/**
 * Win: show only retry and menu buttons
 */
function triggerWin() {
  cancelAnimationFrame(animationId);
  const tc = document.getElementById('touch-controls');
  if (tc) tc.classList.remove('visible');
  const tapZone = document.getElementById('l2-tap-zone');
  if (tapZone) tapZone.classList.add('hidden');
  if (currentLevel === 1) {
    level1Completed = true;
    try { localStorage.setItem('stayClose_level1Completed', '1'); } catch (_) {}
  }
  setState(GameState.WIN, 'win-screen');
}

/**
 * Keyboard input: Level 1 jump; Level 2 up/stable/down (last key wins)
 */
function initInput() {
  const jumpCodes = ['Space', 'ArrowUp', 'KeyW'];
  const flapCodes = ['Space', 'ArrowUp', 'KeyW'];
  document.addEventListener('keydown', (e) => {
    if (currentLevel === 2) {
      if (flapCodes.includes(e.code) && !e.repeat) {
        keys.heliFlap = true;
        e.preventDefault();
      }
    } else if (jumpCodes.includes(e.code)) {
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
 * Level 2 touch: bottom 33% of screen = flap (one tap = one impulse)
 */
function initTouchControlsL2() {
  const tapZone = document.getElementById('l2-tap-zone');
  if (!tapZone) return;
  const flap = () => { keys.heliFlap = true; };
  tapZone.addEventListener('pointerdown', (e) => { e.preventDefault(); flap(); }, { passive: false });
  tapZone.addEventListener('touchstart', (e) => { e.preventDefault(); flap(); }, { passive: false });
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
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/2a1a30c2-e1ba-46c1-a5c2-9acdecdfcce3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'dcaaa3'},body:JSON.stringify({sessionId:'dcaaa3',location:'game.js:drawParachuteIntro',message:'Parachute draw order',data:{phase:levelPhase,friendY:friendParachuteY,ploffY:ploffersonParachuteY,animTime},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    drawParachuteCanopyOnly(friendParachuteX, friendParachuteY);
    drawParachuteCanopyOnly(ploffersonParachuteX, ploffersonParachuteY);
    drawParachuteRopesOnly(friendParachuteX, friendParachuteY);
    drawParachuteRopesOnly(ploffersonParachuteX, ploffersonParachuteY);
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

/** Parachute: domed canopy with scalloped base and panel lines (no ropes). */
function drawParachuteCanopyOnly(characterX, characterY) {
  const w = CONFIG.CHAR_SIZE;
  const cx = characterX + w / 2;
  const canopyTopY = characterY - 28;
  const canopyW = 44;
  const domeH = 14;
  const baseY = canopyTopY + domeH;
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1.5;
  ctx.fillStyle = '#e74c3c';
  ctx.beginPath();
  // Scalloped base (wavy bottom edge, closest to the character)
  ctx.moveTo(cx - canopyW / 2, baseY);
  ctx.quadraticCurveTo(cx - canopyW / 4, baseY + 3, cx, baseY - 2);
  ctx.quadraticCurveTo(cx + canopyW / 4, baseY + 3, cx + canopyW / 2, baseY);
  // Right edge up to dome
  ctx.lineTo(cx + canopyW / 2, canopyTopY + domeH / 2);
  // Dome arc = upper half of circle (bulges upward, away from character)
  ctx.arc(cx, canopyTopY + domeH / 2, canopyW / 2, 0, Math.PI, true);
  // Left edge back down to base
  ctx.lineTo(cx - canopyW / 2, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Panel segments (vertical curved lines)
  const panelCount = 5;
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1;
  for (let i = 1; i < panelCount; i++) {
    const t = i / panelCount;
    const px = cx - canopyW / 2 + t * canopyW;
    ctx.beginPath();
    ctx.moveTo(px, baseY);
    ctx.quadraticCurveTo(px + (cx - px) * 0.15, (canopyTopY + baseY) / 2, cx + (px - cx) * 0.6, canopyTopY + domeH * 0.4);
    ctx.stroke();
  }
}

/** Parachute: harness ropes from scalloped canopy base to torso (converging to center). */
function drawParachuteRopesOnly(characterX, characterY) {
  const w = CONFIG.CHAR_SIZE;
  const cx = characterX + w / 2;
  const canopyTopY = characterY - 28;
  const domeH = 14;
  const baseY = canopyTopY + domeH;
  const canopyW = 44;
  const torsoTop = characterY + 21;
  const harnessY = torsoTop + 2;
  ctx.strokeStyle = '#5a6a6a';
  ctx.lineWidth = 1;
  const ropeCount = 7;
  for (let i = 0; i < ropeCount; i++) {
    const t = (i + 0.5) / ropeCount;
    const bx = cx - canopyW / 2 + t * canopyW;
    const by = baseY - (t === 0.5 ? 2 : 0) + (Math.abs(t - 0.5) * 2);
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(cx + (bx - cx) * 0.4, harnessY);
    ctx.stroke();
  }
}

function drawParachuteCanopy(characterX, characterY) {
  drawParachuteCanopyOnly(characterX, characterY);
  drawParachuteRopesOnly(characterX, characterY);
}

/** Spawn one Level 2 obstacle: always a building; often a mine above low buildings (upper half, random height) */
function spawnL2Obstacle() {
  const gap = CONFIG.L2_SPAWN_MIN + Math.random() * (CONFIG.L2_SPAWN_MAX - CONFIG.L2_SPAWN_MIN);
  const width = CONFIG.L2_BUILDING_WIDTH_MIN + Math.random() * (CONFIG.L2_BUILDING_WIDTH_MAX - CONFIG.L2_BUILDING_WIDTH_MIN);
  const height = CONFIG.L2_BUILDING_HEIGHT_MIN + Math.random() * (CONFIG.L2_BUILDING_HEIGHT_MAX - CONFIG.L2_BUILDING_HEIGHT_MIN);
  const worldX = nextL2ObstacleAt;
  l2Obstacles.push({
    type: 'building',
    worldX,
    width,
    height,
  });
  nextL2ObstacleAt += gap + width;
  const isLow = height < CONFIG.L2_BUILDING_LOW_THRESHOLD;
  if (isLow && Math.random() < 0.82) {
    const mineY = CONFIG.L2_MINE_Y_MIN + Math.random() * (CONFIG.L2_MINE_Y_MAX - CONFIG.L2_MINE_Y_MIN);
    l2Obstacles.push({
      type: 'mine',
      worldX: worldX + width / 2 - CONFIG.L2_MINE_RADIUS,
      y: mineY,
      radius: CONFIG.L2_MINE_RADIUS,
    });
  }
}

function updateLevel2(dt) {
  const elapsed = getLevelElapsed();
  const inIntro = elapsed < CONFIG.L2_INTRO_DURATION;

  if (inIntro) {
    timerDisplay.textContent = '0:00';
    return;
  }

  worldScrollX += CONFIG.L2_SCROLL_SPEED * dt;

  if (l2ExplosionStartTime > 0) {
    if ((performance.now() / 1000) - l2ExplosionStartTime >= L2_EXPLOSION_DURATION) {
      triggerGameOver();
    }
    return;
  }

  if (keys.heliFlap) {
    heliVelY = CONFIG.HELI_FLAP_VELOCITY;
    keys.heliFlap = false;
  }
  heliVelY += CONFIG.HELI_GRAVITY * dt;
  heliVelY = Math.max(-320, Math.min(320, heliVelY));
  heliY += heliVelY * dt;
  heliY = Math.max(0, Math.min(CONFIG.CANVAS_HEIGHT - CONFIG.HELI_SIZE, heliY));

  if (heliY + CONFIG.HELI_SIZE > CONFIG.GROUND_Y) {
    level2ScoreAtDeath = Math.floor(elapsed);
    l2ExplosionStartTime = performance.now() / 1000;
    return;
  }

  while (nextL2ObstacleAt < worldScrollX + CONFIG.CANVAS_WIDTH + 150) spawnL2Obstacle();
  l2Obstacles = l2Obstacles.filter((o) => {
    if (o.type === 'building') return o.worldX + o.width > worldScrollX - 50;
    return o.worldX + o.radius * 2 > worldScrollX - 50;
  });

  const heliLeft = CONFIG.HELI_FIXED_X;
  const heliRight = CONFIG.HELI_FIXED_X + CONFIG.HELI_SIZE;
  const heliTop = heliY;
  const heliBottom = heliY + CONFIG.HELI_SIZE;
  const heliCx = CONFIG.HELI_FIXED_X + CONFIG.HELI_SIZE / 2;
  const heliCy = heliY + CONFIG.HELI_SIZE / 2;

  for (const o of l2Obstacles) {
    if (o.type === 'building') {
      const screenX = o.worldX - worldScrollX;
      if (screenX + o.width < heliLeft || screenX > heliRight) continue;
      const top = CONFIG.GROUND_Y - o.height;
      const bottom = CONFIG.GROUND_Y;
      if (heliRight > screenX && heliLeft < screenX + o.width && heliBottom > top && heliTop < bottom) {
        level2ScoreAtDeath = Math.floor(elapsed);
        l2ExplosionStartTime = performance.now() / 1000;
        return;
      }
    } else {
      const screenX = o.worldX - worldScrollX;
      const dx = heliCx - (screenX + o.radius);
      const dy = heliCy - o.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < o.radius + CONFIG.HELI_SIZE / 2) {
        level2ScoreAtDeath = Math.floor(elapsed);
        l2ExplosionStartTime = performance.now() / 1000;
        return;
      }
    }
  }

  const mins = Math.floor(elapsed / 60);
  const secs = Math.floor(elapsed % 60);
  timerDisplay.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;

  if (elapsed >= CONFIG.LEVEL2_DURATION) triggerWin();
}

/**
 * Update game logic for Level 1 (auto-runner: jump over obstacles; stuck = fall behind)
 * @param {number} dt - Delta time in seconds
 */
function update(dt) {
  if (currentLevel === 2) {
    updateLevel2(dt);
    return;
  }
  if (levelPhase === 'intro_tooltip') {
    if (getLevelElapsed() >= CONFIG.L1_INTRO_DURATION) {
      levelPhase = 'parachute';
    }
    return;
  }
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
 * Draw obstacles: jeeps, tanks, 1-story and 2-story houses (flat roof)
 */
function drawObstacles() {
  const groundY = CONFIG.GROUND_Y;
  for (const o of obstacles) {
    const screenX = o.worldX - worldScrollX;
    if (screenX + o.width < 0 || screenX > CONFIG.CANVAS_WIDTH) continue;

    if (o.type === 'jeep') {
      drawJeep(screenX, groundY, o.width, o.height);
    } else if (o.type === 'tank') {
      drawTank(screenX, groundY, o.width, o.height);
    } else if (o.type === 'house1' || o.type === 'house2') {
      drawHouse(screenX, groundY, o.width, o.height, o.type === 'house2');
    }
  }
}

function drawJeep(screenX, groundY, w, h) {
  const top = groundY - h;
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1.5;
  // Olive / military green body
  ctx.fillStyle = '#4a5d3a';
  ctx.fillRect(screenX, top + h * 0.22, w, h * 0.78);
  ctx.strokeRect(screenX, top + h * 0.22, w, h * 0.78);
  // Flat front (grille)
  ctx.fillStyle = '#3d4d2e';
  ctx.fillRect(screenX, top + h * 0.2, w * 0.22, h * 0.82);
  ctx.strokeRect(screenX, top + h * 0.2, w * 0.22, h * 0.82);
  // Grille slots (vertical lines)
  for (let i = 0; i < 4; i++) {
    const gx = screenX + 4 + (i / 3) * (w * 0.14);
    ctx.strokeStyle = '#2a3520';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gx, top + h * 0.35);
    ctx.lineTo(gx, groundY - 4);
    ctx.stroke();
  }
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1.5;
  // Round headlights
  ctx.fillStyle = '#f1c40f';
  ctx.beginPath();
  ctx.arc(screenX + w * 0.06, top + h * 0.45, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(screenX + w * 0.06, top + h * 0.7, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Cabin: open top, windshield frame
  ctx.strokeStyle = '#2a3520';
  ctx.fillStyle = 'rgba(60,80,50,0.4)';
  ctx.fillRect(screenX + w * 0.24, top + h * 0.25, w * 0.52, h * 0.5);
  ctx.strokeRect(screenX + w * 0.24, top + h * 0.25, w * 0.52, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(screenX + w * 0.24, top + h * 0.5);
  ctx.lineTo(screenX + w * 0.38, top + h * 0.28);
  ctx.lineTo(screenX + w * 0.76, top + h * 0.28);
  ctx.lineTo(screenX + w * 0.76, top + h * 0.5);
  ctx.stroke();
  // Star on hood
  ctx.fillStyle = '#8b7355';
  ctx.beginPath();
  ctx.moveTo(screenX + w * 0.5, top + h * 0.6);
  ctx.lineTo(screenX + w * 0.52, top + h * 0.68);
  ctx.lineTo(screenX + w * 0.48, top + h * 0.68);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Big wheels (4 visible as circles)
  const wheelR = Math.min(7, h * 0.36);
  ctx.fillStyle = '#1a1a1a';
  ctx.strokeStyle = '#2c2c2c';
  [0.2, 0.42, 0.58, 0.8].forEach((frac) => {
    ctx.beginPath();
    ctx.arc(screenX + w * frac, groundY - wheelR, wheelR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
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

  if (currentLevel === 2) {
    drawLevel2();
    ctx.restore();
    return;
  }
  if (levelPhase === 'intro_tooltip') {
    drawSky();
    drawDistantSilhouettes();
    drawParallaxBackground();
    drawScrollingGround();
  } else if (levelPhase === 'parachute') {
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

function drawLevel2() {
  drawSky();
  drawDistantSilhouettes();
  drawParallaxBackground();
  drawScrollingGround();
  const groundY = CONFIG.GROUND_Y;
  for (const o of l2Obstacles) {
    const screenX = o.worldX - worldScrollX;
    if (o.type === 'building') {
      if (screenX + o.width < 0 || screenX > CONFIG.CANVAS_WIDTH) continue;
      drawL2Building(screenX, groundY, o.width, o.height);
    } else {
      if (screenX + o.radius * 2 + CONFIG.L2_BALLOON_SIZE < 0 || screenX > CONFIG.CANVAS_WIDTH + 20) continue;
      drawL2Mine(screenX, o.y, o.radius);
    }
  }
  const elapsed = getLevelElapsed();
  const inIntro = elapsed < CONFIG.L2_INTRO_DURATION;
  let heliDrawX = CONFIG.HELI_FIXED_X;
  if (inIntro) {
    const t = Math.min(1, elapsed / CONFIG.L2_INTRO_DURATION);
    const easeOut = 1 - (1 - t) * (1 - t);
    heliDrawX = -60 + (CONFIG.HELI_FIXED_X + 60) * easeOut;
  }
  if (l2ExplosionStartTime > 0) {
    const explosionT = (performance.now() / 1000) - l2ExplosionStartTime;
    const progress = Math.min(1, explosionT / L2_EXPLOSION_DURATION);
    const cx = heliDrawX + CONFIG.HELI_SIZE / 2;
    const cy = heliY + CONFIG.HELI_SIZE / 2;
    const baseR = CONFIG.HELI_SIZE * 0.5;
    const maxR = CONFIG.HELI_SIZE * 2.2;
    const r = baseR + (maxR - baseR) * progress;
    const alpha = 1 - progress * progress;
    ctx.save();
    ctx.globalAlpha = alpha;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, 'rgba(255,180,50,0.9)');
    g.addColorStop(0.4, 'rgba(255,100,0,0.6)');
    g.addColorStop(0.7, 'rgba(220,50,0,0.3)');
    g.addColorStop(1, 'rgba(180,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  } else {
    drawHelicopter(heliDrawX, heliY);
  }
}

function drawL2Building(x, groundY, w, h) {
  const top = groundY - h;
  ctx.strokeStyle = '#2c2c2c';
  ctx.lineWidth = 1.5;
  ctx.fillStyle = '#5a6a7a';
  ctx.fillRect(x, top, w, h);
  ctx.strokeRect(x, top, w, h);
  ctx.fillStyle = '#37474f';
  const winW = Math.min(14, w * 0.25);
  const winH = 12;
  for (let row = 0; row < Math.floor(h / 28); row++) {
    for (let col = 0; col < Math.floor(w / (winW + 4)); col++) {
      ctx.fillRect(x + 4 + col * (winW + 4), top + 6 + row * 28, winW, winH);
    }
  }
}

function drawL2Mine(x, y, radius) {
  const balloonY = y - CONFIG.L2_BALLOON_SIZE - radius - 6;
  const cx = x + radius;
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1.5;
  ctx.fillStyle = '#e74c3c';
  ctx.beginPath();
  ctx.arc(cx, balloonY, CONFIG.L2_BALLOON_SIZE / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#2c3e50';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 4, balloonY + CONFIG.L2_BALLOON_SIZE / 2);
  ctx.lineTo(cx, y - radius);
  ctx.moveTo(cx + 4, balloonY + CONFIG.L2_BALLOON_SIZE / 2);
  ctx.lineTo(cx, y - radius);
  ctx.stroke();
  ctx.fillStyle = '#2a2a2a';
  ctx.strokeStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(cx, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  const spikeCount = 10;
  const spikeLen = radius * 1.1;
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 2;
  for (let i = 0; i < spikeCount; i++) {
    const angle = (i / spikeCount) * Math.PI * 2;
    const sx = cx + Math.cos(angle) * radius;
    const sy = y + Math.sin(angle) * radius;
    const ex = cx + Math.cos(angle) * spikeLen;
    const ey = y + Math.sin(angle) * spikeLen;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
  }
}

function drawHelicopter(x, y) {
  const w = CONFIG.HELI_SIZE;
  const h = CONFIG.HELI_SIZE * 0.9;
  const cx = x + w / 2;
  const cy = y + h / 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(-1, 1);
  ctx.translate(-cx, -cy);

  // Rotor angle: spin main + tail rotor (tail 3x faster for effect)
  const t = performance.now() / 1000;
  const mainRotorAngle = t * 12;
  const tailRotorAngle = t * 24;

  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // —— Fuselage (egg-shaped body) ——
  ctx.fillStyle = '#3d5a3d';
  ctx.strokeStyle = '#1e3d1e';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 2, w * 0.42, h * 0.48, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Side stripes + star (character)
  ctx.strokeStyle = '#2a4a2a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - 6, y + h * 0.35);
  ctx.lineTo(cx - 6, y + h * 0.65);
  ctx.moveTo(cx - 2, y + h * 0.4);
  ctx.lineTo(cx - 2, y + h * 0.6);
  ctx.moveTo(cx + 2, y + h * 0.35);
  ctx.lineTo(cx + 2, y + h * 0.65);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx - 4, y + h * 0.52, 3, 0, Math.PI * 2);
  ctx.stroke();

  // Cockpit (lighter oval)
  ctx.fillStyle = 'rgba(180,220,200,0.6)';
  ctx.strokeStyle = '#2a4a2a';
  ctx.beginPath();
  ctx.ellipse(cx - 2, y + h * 0.32, 6, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // —— Tail boom ——
  ctx.strokeStyle = '#1e3d1e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.38, cy);
  ctx.lineTo(cx + w * 0.7, cy - 2);
  ctx.stroke();

  // Tail fin
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.7, cy - 2);
  ctx.lineTo(cx + w * 0.72, cy - 8);
  ctx.lineTo(cx + w * 0.78, cy - 2);
  ctx.closePath();
  ctx.fillStyle = '#3d5a3d';
  ctx.fill();
  ctx.stroke();

  // —— Tail rotor (spinning) ——
  ctx.save();
  ctx.translate(cx + w * 0.74, cy - 6);
  ctx.rotate(tailRotorAngle);
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-6, 0);
  ctx.lineTo(6, 0);
  ctx.moveTo(0, -4);
  ctx.lineTo(0, 4);
  ctx.stroke();
  ctx.restore();

  // —— Main rotor mast ——
  ctx.strokeStyle = '#2a352a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, y + h * 0.08);
  ctx.lineTo(cx, y - 2);
  ctx.stroke();

  // —— Main rotor (spinning) ——
  ctx.save();
  ctx.translate(cx, y - 2);
  ctx.rotate(mainRotorAngle);
  ctx.strokeStyle = '#1a1a1a';
  ctx.fillStyle = 'rgba(40,50,40,0.9)';
  ctx.lineWidth = 2;
  const bladeLen = w * 0.52;
  ctx.beginPath();
  ctx.ellipse(0, 0, bladeLen, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-bladeLen, 0);
  ctx.lineTo(bladeLen, 0);
  ctx.stroke();
  ctx.restore();

  // —— Skids ——
  ctx.strokeStyle = '#2a352a';
  ctx.lineWidth = 2;
  const skidY = y + h * 0.88;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.32, skidY);
  ctx.quadraticCurveTo(cx - w * 0.2, skidY - 4, cx, skidY - 2);
  ctx.quadraticCurveTo(cx + w * 0.2, skidY, cx + w * 0.32, skidY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.22, skidY);
  ctx.lineTo(cx - w * 0.22, skidY + 6);
  ctx.moveTo(cx + w * 0.22, skidY);
  ctx.lineTo(cx + w * 0.22, skidY + 6);
  ctx.stroke();

  ctx.restore();
}

/**
 * Chibi soldier: big head, helmet + goggles, olive uniform, walk cycle, rifle.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - Left of character (screen)
 * @param {number} y - Top of character (screen)
 * @param {string} color - Vest/strap tint (olive base; elite = darker green)
 * @param {string} label - One letter for ID (on vest)
 * @param {number} animTime - Seconds since level start for walk cycle
 * @param {boolean} isElite - If true, Plofferson (slightly different accent)
 */
function drawSoldier(ctx, x, y, color, label, animTime, isElite) {
  ctx.save();

  const w = CONFIG.CHAR_SIZE;   // 40
  const h = CONFIG.CHAR_SIZE;   // 40
  const cx = x + w / 2;

  // All Y positions relative to character top (y); feet must be at y + h
  const headTop = y + 1;
  const headH = 20;
  const headCx = cx;
  const headCy = headTop + headH / 2;
  const bodyY = y + 21;   // fixed: head 1..21, body starts 21
  const bodyH = 11;
  const legY = y + 32;    // fixed: body 21..32, legs 32..40
  const legH = 8;         // fixed: from y+32 to y+40
  const walkPhase = Math.floor(animTime * 6) % 2;
  let legOffset = walkPhase === 0 ? 3 : -3;
  if (typeof levelPhase !== 'undefined' && levelPhase === 'parachute') {
    legOffset = 0;
  }

  // #region agent log
  if (typeof levelPhase !== 'undefined' && levelPhase === 'parachute') {
    fetch('http://127.0.0.1:7243/ingest/2a1a30c2-e1ba-46c1-a5c2-9acdecdfcce3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'dcaaa3'},body:JSON.stringify({sessionId:'dcaaa3',location:'game.js:drawSoldier',message:'Soldier parachute pose',data:{legOffset:0,runId:'post-fix'},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
  }
  // #endregion

  // —— Head: Plofferson uses photo (larger than player head); others use drawn chibi head ——
  const headRadiusX = w * 0.42;
  const headRadiusY = headH * 0.52;
  const ploffHeadRx = headRadiusX * 1.3;
  const ploffHeadRy = headRadiusY * 1.3;
  if (isElite && ploffersonHeadImage && ploffersonHeadImage.complete && ploffersonHeadImage.naturalWidth) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(headCx, headCy, ploffHeadRx, ploffHeadRy, 0, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(ploffersonHeadImage, headCx - ploffHeadRx, headCy - ploffHeadRy, ploffHeadRx * 2, ploffHeadRy * 2);
    ctx.restore();
  } else {
    ctx.fillStyle = isElite ? '#3d4a28' : '#5a6b3d';
    ctx.beginPath();
    ctx.ellipse(headCx, headCy, headRadiusX, headRadiusY, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7eb8da';
    ctx.beginPath();
    ctx.ellipse(headCx - 5, headTop + 5, 5, 3.5, 0, 0, Math.PI * 2);
    ctx.ellipse(headCx + 5, headTop + 5, 5, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e0b890';
    ctx.beginPath();
    ctx.ellipse(headCx, headCy + 2, w * 0.28, headH * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(headCx - 4, headCy + 3, 2, 0, Math.PI * 2);
    ctx.arc(headCx + 4, headCy + 3, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(headCx - 4.5, headCy + 2.2, 0.8, 0, Math.PI * 2);
    ctx.arc(headCx + 3.5, headCy + 2.2, 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8b6914';
    ctx.beginPath();
    ctx.arc(headCx, headCy + 6, 2, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.lineTo(headCx, headCy + 6);
    ctx.fill();
    ctx.fillStyle = 'rgba(220,140,120,0.5)';
    ctx.beginPath();
    ctx.arc(headCx - 7, headCy + 4, 2, 0, Math.PI * 2);
    ctx.arc(headCx + 7, headCy + 4, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // —— Body: olive uniform — fill only, no strokeRect ——
  ctx.fillStyle = isElite ? '#3d4a28' : '#5a6b3d';
  ctx.fillRect(x + 6, bodyY, w - 12, bodyH);
  ctx.fillStyle = '#3d4a28';
  ctx.fillRect(cx - 5, bodyY + 1, 10, bodyH - 2);

  // Label on vest
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 6px "Press Start 2P"';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, cx, bodyY + bodyH / 2);

  // Rifle (black) — fill only
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(x + w - 6, bodyY + 2, 8, 4);
  ctx.fillRect(x + w - 8, bodyY + 3, 4, 2);

  // —— Legs + boots: always at bottom of sprite (legY = y+32 to y+40) ——
  const bootH = 4;
  const isParachuting = typeof levelPhase !== 'undefined' && levelPhase === 'parachute';
  const shinH = legH - bootH;  // 4
  if (isParachuting) {
    const legW = 4;
    const bootW = 5;
    const leftX = x + 10;
    const rightX = x + w - 14;
    ctx.fillStyle = isElite ? '#3d4a28' : '#5a6b3d';
    ctx.fillRect(leftX, legY, legW, shinH);
    ctx.fillRect(rightX, legY, legW, shinH);
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(leftX, legY + shinH, bootW, bootH);
    ctx.fillRect(rightX - 1, legY + shinH, bootW, bootH);
  } else {
    ctx.fillStyle = isElite ? '#3d4a28' : '#5a6b3d';
    ctx.fillRect(x + 8 + legOffset, legY, 7, shinH);
    ctx.fillRect(x + w - 15 - legOffset, legY, 7, shinH);
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(x + 7 + legOffset, legY + shinH, 9, bootH);
    ctx.fillRect(x + w - 16 - legOffset, legY + shinH, 9, bootH);
  }

  ctx.restore();
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
    requestAnimationFrame(() => currentLevel === 2 ? startLevel2() : startLevel1());
  });
  document.getElementById('btn-gameover-menu').addEventListener('click', () => {
    setState(GameState.MENU, 'main-menu');
  });
  document.getElementById('btn-win-retry').addEventListener('click', () => {
    setState(GameState.PLAYING, 'game-screen');
    requestAnimationFrame(() => currentLevel === 2 ? startLevel2() : startLevel1());
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
  ploffersonHeadImage = new Image();
  ploffersonHeadImage.src = 'assets/plofferson-head.png';
  try { level1Completed = localStorage.getItem('stayClose_level1Completed') === '1'; } catch (_) {}
  initStartScreen();
  initMainMenu();
  initChoosePlayer();
  initModal();
  initInput();
  initTouchControls();
  initTouchControlsL2();
  initGameOverAndWin();
  window.addEventListener('resize', () => {
    if (state === GameState.PLAYING) resizeCanvas();
  });
  showScreen('start-screen');
}

init();
