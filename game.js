/**
 * Stay Close — Game constants (tweak these for balance)
 * Auto-runner: friend moves with the world, tap/button to jump over obstacles.
 */
const CONFIG = {
  /** World scroll speed (px per second) — map moves left; friend stays fixed on screen */
  SCROLL_SPEED: 130,
  /** Extra forward speed (px/s) so the character drifts right and can catch up — lower = harder to stay close */
  FRIEND_FORWARD_BOOST: 18,
  /** Level 1 duration (seconds) to win — timer counts down from this to 0 */
  LEVEL1_DURATION: 60,
  /** Friend fixed X on screen (pixels from left) — only vertical movement */
  FRIEND_FIXED_X: 110,
  /** Gravity (px/s²) applied when in air */
  GRAVITY: 520,
  /** Upward velocity (px/s) when jump is pressed */
  JUMP_VELOCITY: -345,
  /** Right 25% of screen: Plofferson stays in this zone */
  PLOFFERSON_ZONE_RIGHT_FRACTION: 0.25,
  PLOFFERSON_WANDER_AMPLITUDE: 30,
  PLOFFERSON_WANDER_SPEED: 1.2,
  /** How far friend can be off left of screen before game over (stuck / left behind) */
  FRIEND_OFF_LEFT_MARGIN: 40,
  /** Ground level (Y) for characters on screen — higher = less empty sky */
  GROUND_Y: 400,
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
    jeep: { width: 54, height: 36 },
    tank: { width: 94, height: 40 },
    house1: { width: 58, height: 42 },
    house2: { width: 58, height: 110 },
    house3: { width: 90, height: 58 },
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
  /** Lives before game over */
  MAX_LIVES: 3,
  /** Seconds of invincibility after respawn */
  INVINCIBILITY_DURATION: 2,
};

// TRENCH_CONFIG — adjust positions and size here. Keep trench positions outside 80px of early obstacle spawn (e.g. first spawn ~120 or ~580).
/** Trenches (loopgraven): width ~1.5x player, depth ~2x player. Positions in world X. */
const TRENCH_CONFIG = {
  width: 60,
  depth: 45,
  trenches: [
    { x: 680 },
    { x: 1200 },
  ],
};
const TRENCH_SAFETY_MARGIN = 80;

/**
 * Game state enum
 * @readonly
 */
const GameState = {
  MENU: 'menu',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAMEOVER: 'gameover',
  WIN: 'win',
};

// TODO: Replace with real database API call
/** Placeholder leaderboard scores (top 5 only). Swap data source when DB is connected. */
const PLACEHOLDER_SCORES = [
  { name: 'Plofferson', score: 844 },
  { name: 'Plofferson', score: 724 },
  { name: 'Plofferson', score: 623 },
  { name: 'Plofferson', score: 622 },
  { name: 'Plofferson', score: 590 },
];

/**
 * Render top 5 scores into a scoreboard list element. Accepts scores array so only data source needs swapping later.
 * @param {Array<{name: string, score: number}>} scores - Up to 5 entries (only first 5 shown)
 * @param {number} [currentScore] - If provided, the row with this score gets highlighted as current player
 * @param {HTMLUListElement} listEl - The <ul> to fill (e.g. gameover-scoreboard or win-scoreboard)
 */
function renderScoreboard(scores, currentScore, listEl) {
  if (!listEl) return;
  const top5 = (scores || []).slice(0, 5);
  listEl.innerHTML = '';
  top5.forEach((entry, index) => {
    const li = document.createElement('li');
    const rank = index + 1;
    li.textContent = `${rank}. ${entry.name} — ${entry.score} pts`;
    li.setAttribute('data-rank', rank);
    li.className = 'scoreboard-rank scoreboard-rank-' + rank;
    if (typeof currentScore === 'number' && entry.score === currentScore) {
      li.classList.add('scoreboard-current');
    }
    listEl.appendChild(li);
  });
}

/** Curse words (Dutch + English) — nickname must not contain these as whole words */
const CURSE_WORDS = [
  'fuck', 'shit', 'ass', 'bitch', 'damn', 'crap', 'dick', 'cock', 'pussy', 'cunt', 'whore', 'slut',
  'kut', 'kanker', 'tyfus', 'tering', 'klootzak', 'lul', 'hoer', 'flikker', 'kak', 'reet', 'neuk',
  'godver', 'godverdomme', 'verdomme', 'potverdorrie', 'sodemieter', 'mieters', 'pleuris', 'tering',
  'mongool', 'idioot', 'debiel', 'imbeciel', 'retard', 'fag', 'faggot', 'nigger', 'nigga',
  'fock', 'fuk', 'shyt', 'b1tch', 'd1ck', 'c0ck', 'kutje', 'kutjes',
];

/** Current game state */
let state = GameState.MENU;
/** Player nickname (set after nickname screen) */
let playerNickname = '';
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
/** Horizontal velocity (used during trench exit jump to keep up with scroll; 0 during normal movement) */
let friendVelX = 0;
/** When non-null, friend is in a trench (IN_TRENCH state): { trench, leftBound, rightBound, bottomY } */
let friendInTrench = null;
let lives = 3;
let isInvincible = false;
let invincibilityTimer = 0;
/** Toggle for flashing friend when invincible (skip draw every other frame) */
let invincibleFlashToggle = false;
let levelStartTime = 0;
let keys = { jump: false };
/** Active obstacles: { type: 'jeep'|'tank'|'house1'|'house2'|'house3', worldX: number, width, height } */
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

/** Plofferson head image (photo with helmet); drawn when loaded */
let ploffersonHeadImage = null;

/** DOM refs */
const screens = {
  mainMenu: document.getElementById('main-menu'),
  game: document.getElementById('game-screen'),
  gameover: document.getElementById('gameover-screen'),
  win: document.getElementById('win-screen'),
};
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const selectedPlayerDisplay = document.getElementById('selected-player-display');
const timerDisplay = document.getElementById('timer-display');
const scoreDisplay = document.getElementById('score-display');

/**
 * Check if nickname contains any curse word (whole-word match, case-insensitive)
 * @param {string} nickname
 * @returns {boolean}
 */
function containsCurseWord(nickname) {
  const lower = nickname.toLowerCase().trim();
  for (const word of CURSE_WORDS) {
    const re = new RegExp('\\b' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
    if (re.test(lower)) return true;
  }
  return false;
}

/**
 * Validate nickname: non-empty, trimmed length 1–20, no curse words
 * @param {string} nickname
 * @returns {{ valid: boolean, error?: string }}
 */
function validateNickname(nickname) {
  const trimmed = (nickname || '').trim();
  if (trimmed.length === 0) return { valid: false, error: 'Please enter a nickname.' };
  if (trimmed.length > 20) return { valid: false, error: 'Nickname must be 20 characters or less.' };
  if (containsCurseWord(trimmed)) return { valid: false, error: 'That nickname is not allowed.' };
  return { valid: true };
}

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
 * Update main menu: Level 1 enabled when nickname is set
 */
function updateMainMenuState() {
  const hasNickname = playerNickname.length > 0;
  const btnL1 = document.getElementById('btn-level1');
  if (btnL1) btnL1.disabled = !hasNickname;
  if (selectedPlayerDisplay) {
    selectedPlayerDisplay.textContent = hasNickname ? `Playing as: ${playerNickname}` : '';
    selectedPlayerDisplay.classList.toggle('empty', !hasNickname);
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
    if (!playerNickname) return;
    setState(GameState.PLAYING, 'game-screen');
    requestAnimationFrame(() => startLevel1());
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
 * Bind nickname screen: input + Start button; validate and go to main menu
 */
function initNicknameScreen() {
  const input = document.getElementById('nickname-input');
  const btn = document.getElementById('btn-nickname-start');
  const errEl = document.getElementById('nickname-error');
  if (!input || !btn) return;

  const submit = () => {
    const result = validateNickname(input.value);
    if (errEl) {
      errEl.classList.toggle('hidden', result.valid);
      errEl.textContent = result.error || '';
    }
    if (result.valid) {
      playerNickname = input.value.trim();
      showScreen('main-menu');
    }
  };

  btn.addEventListener('click', submit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submit();
  });
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

/** Return true if world X range [xLeft, xRight] overlaps any trench (with TRENCH_SAFETY_MARGIN each side). */
function obstacleOverlapsTrench(xLeft, xRight) {
  for (const t of TRENCH_CONFIG.trenches) {
    const tw = t.width ?? TRENCH_CONFIG.width;
    const zoneLeft = t.x - TRENCH_SAFETY_MARGIN;
    const zoneRight = t.x + tw + TRENCH_SAFETY_MARGIN;
    if (xRight > zoneLeft && xLeft < zoneRight) return true;
  }
  return false;
}

/** Shift nextObstacleAt forward until it clears all trenches (with safety margin). */
function shiftSpawnPastTrenches(obstacleWidth) {
  while (obstacleOverlapsTrench(nextObstacleAt, nextObstacleAt + obstacleWidth)) {
    for (const t of TRENCH_CONFIG.trenches) {
      const tw = t.width ?? TRENCH_CONFIG.width;
      const zoneRight = t.x + tw + TRENCH_SAFETY_MARGIN;
      if (nextObstacleAt < zoneRight && nextObstacleAt + obstacleWidth > t.x - TRENCH_SAFETY_MARGIN) {
        nextObstacleAt = zoneRight;
        break;
      }
    }
  }
}

/**
 * Spawn one obstacle or a house pair (1-story then 2-story). Jeeps and tanks single; houses always 1 then 2.
 * Spawn position is shifted forward if it would overlap a trench (safety margin 80px each side).
 */
function spawnObstacle() {
  const roll = Math.random();
  if (roll < 0.4) {
    const h1 = CONFIG.OBSTACLES.house1;
    const h2 = CONFIG.OBSTACLES.house2;
    const gap = CONFIG.HOUSE_PAIR_GAP;
    const pairWidth = h1.width + gap + h2.width;
    shiftSpawnPastTrenches(pairWidth);
    obstacles.push({ type: 'house1', worldX: nextObstacleAt, width: h1.width, height: h1.height });
    obstacles.push({ type: 'house2', worldX: nextObstacleAt + h1.width + gap, width: h2.width, height: h2.height });
    const spacing = CONFIG.OBSTACLE_SPAWN_MIN + Math.random() * (CONFIG.OBSTACLE_SPAWN_MAX - CONFIG.OBSTACLE_SPAWN_MIN);
    nextObstacleAt += pairWidth + spacing;
    return;
  }
  const types = ['jeep', 'tank', 'house3'];
  const type = types[Math.floor(Math.random() * types.length)];
  const def = CONFIG.OBSTACLES[type];
  shiftSpawnPastTrenches(def.width);
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

/** Return the trench object if friend's horizontal span [friendWX, friendWX+CHAR_SIZE] overlaps it, else null. */
function getTrenchUnderFriend(friendWX) {
  const left = friendWX;
  const right = friendWX + CONFIG.CHAR_SIZE;
  for (const t of TRENCH_CONFIG.trenches) {
    const tw = t.width ?? TRENCH_CONFIG.width;
    if (right > t.x && left < t.x + tw) return { ...t, width: tw };
  }
  return null;
}

/** True if there is solid ground under the friend (no trench overlap). */
function isGroundAt(friendWX) {
  return getTrenchUnderFriend(friendWX) === null;
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
  cancelAnimationFrame(animationId);
  animationId = null;
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
  friendVelX = 0;
  friendInTrench = null;
  lives = CONFIG.MAX_LIVES;
  isInvincible = false;
  invincibilityTimer = 0;
  invincibleFlashToggle = false;
  levelStartTime = performance.now() / 1000;
  timerDisplay.textContent = '0:60';
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
    if (friendRight <= o.worldX) continue;
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
 * Decrease lives by 1. If 0, trigger game over. Otherwise restart level from the beginning (no parachute),
 * timer resets, and set invincibility. Game over is only triggered from here.
 */
function loseLife() {
  lives -= 1;
  if (lives <= 0) {
    triggerGameOver();
    return;
  }
  worldScrollX = 0;
  obstacles = [];
  nextObstacleAt = CONFIG.CANVAS_WIDTH + CONFIG.LANDING_GRACE_DISTANCE;
  const zone = getPloffersonZone();
  ploffersonScreenX = zone.center;
  ploffersonTargetX = zone.center;
  friendWorldX = CONFIG.FRIEND_FIXED_X;
  friendY = CONFIG.GROUND_Y - CONFIG.CHAR_SIZE;
  friendVelY = 0;
  friendVelX = 0;
  friendInTrench = null;
  levelPhase = 'running';
  levelStartTime = performance.now() / 1000;
  lastTime = performance.now();
  isInvincible = true;
  invincibilityTimer = CONFIG.INVINCIBILITY_DURATION;
}

/**
 * Game over: show retry and menu buttons, display score, render scoreboard
 */
function triggerGameOver() {
  cancelAnimationFrame(animationId);
  const tc = document.getElementById('touch-controls');
  if (tc) tc.classList.remove('visible');
  const finalScore = Math.floor(score);
  const scoreEl = document.getElementById('gameover-score');
  if (scoreEl) scoreEl.textContent = 'Je score: ' + finalScore;
  const listEl = document.getElementById('gameover-scoreboard');
  renderScoreboard(PLACEHOLDER_SCORES, finalScore, listEl);
  setState(GameState.GAMEOVER, 'gameover-screen');
}

/**
 * Win: show retry and menu buttons, display score, render scoreboard
 * @param {number} [finalScore] - Score at moment of win; defaults to Math.floor(score) if omitted
 */
function triggerWin(finalScore) {
  cancelAnimationFrame(animationId);
  const tc = document.getElementById('touch-controls');
  if (tc) tc.classList.remove('visible');
  const scoreToShow = typeof finalScore === 'number' ? finalScore : Math.floor(score);
  setState(GameState.WIN, 'win-screen');
  const scoreEl = document.getElementById('win-score');
  if (scoreEl) scoreEl.textContent = 'Je score: ' + scoreToShow;
  const listEl = document.getElementById('win-scoreboard');
  renderScoreboard(PLACEHOLDER_SCORES, scoreToShow, listEl);
}

/**
 * Keyboard input: jump (Space, Up, W)
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
    drawParachuteCanopyOnly(friendParachuteX, friendParachuteY);
    drawParachuteCanopyOnly(ploffersonParachuteX, ploffersonParachuteY);
    drawParachuteRopesOnly(friendParachuteX, friendParachuteY);
    drawParachuteRopesOnly(ploffersonParachuteX, ploffersonParachuteY);
    const color = '#4a9c5e';
    const label = playerNickname ? playerNickname.trim().charAt(0).toUpperCase() : '?';
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

/**
 * Update game logic (auto-runner: jump over obstacles; stuck = fall behind)
 * @param {number} dt - Delta time in seconds
 */
function update(dt) {
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

  if (isInvincible) {
    invincibilityTimer -= dt;
    if (invincibilityTimer <= 0) {
      isInvincible = false;
      invincibilityTimer = 0;
    }
  }

  const groundY = CONFIG.GROUND_Y - CONFIG.CHAR_SIZE;
  const friendWX = getFriendWorldX();

  // —— IN_TRENCH state: gravity to bottom, clamp X to trench, jump to escape ——
  if (friendInTrench !== null) {
    if (keys.jump) {
      friendVelY = CONFIG.JUMP_VELOCITY;
      friendVelX = CONFIG.SCROLL_SPEED + CONFIG.FRIEND_FORWARD_BOOST * 0.35;
      friendInTrench = null;
    } else {
      const bottomY = friendInTrench.bottomY - CONFIG.CHAR_SIZE;
      friendVelY += CONFIG.GRAVITY * dt;
      friendY += friendVelY * dt;
      if (friendY + CONFIG.CHAR_SIZE >= friendInTrench.bottomY) {
        friendY = bottomY;
        friendVelY = 0;
      }
      friendWorldX = Math.max(friendInTrench.leftBound, Math.min(friendInTrench.rightBound, friendWorldX));
    }
  } else {
    // Check if standing over a trench opening (feet at/below ground) → fall in
    const trench = getTrenchUnderFriend(friendWX);
    if (trench && friendY + CONFIG.CHAR_SIZE >= CONFIG.GROUND_Y - 2) {
      friendInTrench = {
        trench,
        leftBound: trench.x + 4,
        rightBound: trench.x + trench.width - CONFIG.CHAR_SIZE - 4,
        bottomY: CONFIG.GROUND_Y + TRENCH_CONFIG.depth,
      };
    }
  }

  // —— Normal ground/platform/jump and horizontal advance (only when not in trench) ——
  if (friendInTrench === null) {
    const onSolidGround = isGroundAt(friendWX);
    const platformTopBefore = getPlatformTopUnderFriend();
    const onPlatformBefore = platformTopBefore !== null;

    if (onSolidGround && !onPlatformBefore) {
      friendY = Math.min(friendY, groundY);
      if (friendY >= groundY - 1) {
        friendVelY = 0;
        friendVelX = 0;
      }
    }

    const canJumpFrom = onSolidGround || onPlatformBefore;
    if (keys.jump && canJumpFrom && friendVelY >= 0) {
      const standY = onPlatformBefore ? platformTopBefore - CONFIG.CHAR_SIZE : groundY;
      if (friendY >= standY - 6) {
        friendVelY = CONFIG.JUMP_VELOCITY;
        friendVelX = CONFIG.SCROLL_SPEED + CONFIG.FRIEND_FORWARD_BOOST * 0.2;
      }
    }
    friendVelY += CONFIG.GRAVITY * dt;
    friendY += friendVelY * dt;

    if (onSolidGround && !onPlatformBefore) {
      friendY = Math.min(friendY, groundY);
      if (friendY >= groundY - 1) {
        friendVelY = 0;
        friendVelX = 0;
      }
    }
    const platformTop = getPlatformTopUnderFriend();
    if (platformTop !== null && friendVelY > 0 && friendY + CONFIG.CHAR_SIZE >= platformTop - 4) {
      friendY = platformTop - CONFIG.CHAR_SIZE;
      friendVelY = 0;
      friendVelX = 0;
    }

    if (friendVelX !== 0) {
      friendWorldX += friendVelX * dt;
    } else if (!isFriendStuckOnObstacle()) {
      friendWorldX += (CONFIG.SCROLL_SPEED + CONFIG.FRIEND_FORWARD_BOOST) * dt;
    }
    const groundYLine = CONFIG.GROUND_Y;
    for (const o of obstacles) {
      const friendRight = friendWorldX + CONFIG.CHAR_SIZE;
      const friendLeft = friendWorldX;
      const friendBottom = friendY + CONFIG.CHAR_SIZE;
      const obstacleTop = groundYLine - o.height;
      if (friendRight > o.worldX && friendLeft < o.worldX && friendBottom > obstacleTop) {
        friendWorldX = o.worldX - CONFIG.CHAR_SIZE;
        friendVelX = 0;
      }
    }
  }

  if (!isInvincible) {
    if (isFriendOffLeft()) {
      loseLife();
      return;
    }
    if (isFriendOffScreen()) {
      loseLife();
      return;
    }
  }

  const elapsed = getLevelElapsed();
  const remaining = Math.max(0, CONFIG.LEVEL1_DURATION - elapsed);
  const mins = Math.floor(remaining / 60);
  const secs = Math.floor(remaining % 60);
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
    triggerWin(Math.floor(score));
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
 * Scrolling ground: simple two-tone, thin top edge — clean. Trenches drawn on top by drawTrenches().
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
 * Draw trenches (loopgraven): gap with visible depth, darker brown walls/bottom, broken top edge.
 */
function drawTrenches() {
  const groundY = CONFIG.GROUND_Y;
  const depth = TRENCH_CONFIG.depth;
  const darkDirt = '#5c4a3a';
  const darkerDirt = '#4a3d30';
  const edgeDark = '#6b5344';

  for (const t of TRENCH_CONFIG.trenches) {
    const w = t.width ?? TRENCH_CONFIG.width;
    const screenX = t.x - worldScrollX;
    if (screenX + w < 0 || screenX > CONFIG.CANVAS_WIDTH) continue;

    const bottomY = groundY + depth;
    ctx.fillStyle = darkDirt;
    ctx.fillRect(screenX, groundY, w, depth);
    ctx.fillStyle = darkerDirt;
    ctx.fillRect(screenX + 2, groundY + 4, w - 4, depth - 4);
    ctx.fillStyle = edgeDark;
    ctx.fillRect(screenX, bottomY - 6, w, 6);

    // Broken / jagged top edge (deterministic from trench x so it doesn't flicker)
    ctx.strokeStyle = '#3d3025';
    ctx.lineWidth = 1.5;
    const seed = t.x * 0.1;
    ctx.beginPath();
    ctx.moveTo(screenX, groundY);
    for (let i = 1; i <= 8; i++) {
      const t_ = i / 8;
      const jx = screenX + w * t_ + (Math.sin(seed + i) * 2);
      const jy = groundY + (Math.sin(seed + i * 1.3) * 2);
      ctx.lineTo(jx, jy);
    }
    ctx.lineTo(screenX + w, groundY);
    ctx.stroke();
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
    } else if (o.type === 'house1' || o.type === 'house2' || o.type === 'house3') {
      drawHouse(screenX, groundY, o.width, o.height, o.type === 'house2');
    }
  }
}

function drawJeep(screenX, groundY, w, h) {
  // Referentie: zijaanzicht SUV/Jeep – wielen, fenders over wielen, vlakke daklijn,
  // motorkap, vier ramen (voorruit schuin + 3 rechthoekig), bumpers, reservespaan achter
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#1a1a1a';
  const olive = '#4a5d3a';
  const oliveDark = '#3d4d2e';
  const oliveRim = '#556b45';

  const wheelR = Math.min(8, h * 0.4);
  const wheelY = groundY - wheelR;
  const wheelFrontX = screenX + w * 0.28;
  const wheelRearX = screenX + w * 0.72;
  const bodyBottom = wheelY - wheelR;
  const bodyH = h - wheelR * 2 - 2;
  const bodyTop = bodyBottom - bodyH;
  const bodyLeft = screenX + 2;
  const bodyW = w - 4;

  // —— 1) Twee wielen (grond), met naaf ——
  [wheelFrontX, wheelRearX].forEach((wx) => {
    ctx.fillStyle = '#1a1a1a';
    ctx.strokeStyle = '#333';
    ctx.beginPath();
    ctx.arc(wx, wheelY, wheelR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = oliveRim;
    ctx.beginPath();
    ctx.arc(wx, wheelY, wheelR * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = oliveDark;
    ctx.stroke();
  });

  // —— 2) Fenders: bogen over de bovenhelft van elk wiel ——
  const fenderR = wheelR + 1;
  [wheelFrontX, wheelRearX].forEach((wx) => {
    ctx.fillStyle = olive;
    ctx.beginPath();
    ctx.arc(wx, wheelY, fenderR, Math.PI, 0, false);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = oliveDark;
    ctx.stroke();
  });

  // —— 3) Carrosserie: vlakke daklijn (één rechthoek) ——
  ctx.fillStyle = olive;
  ctx.fillRect(bodyLeft, bodyTop, bodyW, bodyH);
  ctx.strokeStyle = oliveDark;
  ctx.strokeRect(bodyLeft, bodyTop, bodyW, bodyH);

  // —— 4) Motorkap (voor, iets lager dan dak) ——
  const hoodW = bodyW * 0.26;
  const hoodH = bodyH * 0.55;
  const hoodTop = bodyBottom - hoodH;
  ctx.fillStyle = olive;
  ctx.fillRect(bodyLeft, hoodTop, hoodW, hoodH);
  ctx.strokeRect(bodyLeft, hoodTop, hoodW, hoodH);

  // —— 5) Bumper voor (onder motorkap) ——
  ctx.fillStyle = oliveDark;
  ctx.fillRect(bodyLeft, bodyBottom, 8, 3);
  ctx.strokeRect(bodyLeft, bodyBottom, 8, 3);

  // —— 6) DERDE LAAG: cabine bovenop de carrosserie (dak groter + voorruit die omhoog loopt) ——
  const cabinLeft = bodyLeft + hoodW - 2;
  const cabinW = bodyW - hoodW - 10;
  const cabinH = Math.max(14, bodyH * 0.7);   // dak groter: hogere cabine
  const cabinRoofTop = bodyTop - cabinH;       // dak van de cabine (boven bodyTop)
  const glassFill = 'rgba(90,110,130,0.8)';
  ctx.strokeStyle = oliveDark;

  // 6a) Cabinedak – rechthoek boven de body (duidelijke derde laag)
  ctx.fillStyle = olive;
  ctx.fillRect(cabinLeft, cabinRoofTop, cabinW, cabinH);
  ctx.strokeRect(cabinLeft, cabinRoofTop, cabinW, cabinH);

  // 6b) Voorruit – loopt van body omhoog naar cabinedak (schuin vlak)
  ctx.fillStyle = glassFill;
  ctx.beginPath();
  ctx.moveTo(cabinLeft, bodyTop);
  ctx.lineTo(cabinLeft, cabinRoofTop);
  ctx.lineTo(cabinLeft + cabinW * 0.28, cabinRoofTop);
  ctx.lineTo(cabinLeft + cabinW * 0.28 + 2, bodyTop);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 6c) Drie zijramen in de cabine (in de derde laag)
  const winInCabinH = cabinH - 4;
  const winInCabinTop = cabinRoofTop + 2;
  const sideWinW = (cabinW * 0.72 - 8) / 3;
  for (let i = 0; i < 3; i++) {
    const wx = cabinLeft + cabinW * 0.28 + 6 + i * (sideWinW + 2);
    ctx.fillRect(wx, winInCabinTop, sideWinW, winInCabinH);
    ctx.strokeRect(wx, winInCabinTop, sideWinW, winInCabinH);
  }

  // —— 7) Grille + koplamp voor ——
  ctx.fillStyle = '#353d2a';
  ctx.fillRect(bodyLeft + 3, hoodTop + 2, 6, hoodH - 4);
  ctx.strokeRect(bodyLeft + 3, hoodTop + 2, 6, hoodH - 4);
  ctx.fillStyle = '#f1c40f';
  ctx.beginPath();
  ctx.arc(bodyLeft + 6, hoodTop + hoodH * 0.5, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // —— 8) Reservespaan achter (ovaal/cirkel) + bumper achter ——
  const spareX = screenX + w - 10;
  const spareY = bodyTop + bodyH * 0.5;
  const spareR = Math.min(6, wheelR * 0.6);
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(spareX, spareY, spareR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = oliveRim;
  ctx.beginPath();
  ctx.arc(spareX, spareY, spareR * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = oliveDark;
  ctx.fillRect(screenX + w - 10, bodyBottom, 8, 3);
  ctx.strokeRect(screenX + w - 10, bodyBottom, 8, 3);
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

  if (levelPhase === 'intro_tooltip') {
    drawSky();
    drawDistantSilhouettes();
    drawParallaxBackground();
    drawScrollingGround();
    drawTrenches();
  } else if (levelPhase === 'parachute') {
    drawParachuteIntro();
  } else {
    drawSky();
    drawDistantSilhouettes();
    drawParallaxBackground();
    drawScrollingGround();
    drawTrenches();
    drawObstacles();
    ctx.font = '22px sans-serif';
    ctx.textBaseline = 'top';
    for (let i = 0; i < CONFIG.MAX_LIVES; i++) {
      ctx.fillText(i < lives ? '❤️' : '🖤', 12 + i * 26, 14);
    }
    const animTime = (performance.now() / 1000) - levelStartTime;
    drawSoldier(ctx, ploffersonScreenX, getPloffersonY(), '#2d5016', 'P', animTime, true);
    if (isInvincible) invincibleFlashToggle = !invincibleFlashToggle;
    const friendScreenX = friendWorldX - worldScrollX;
    const color = '#4a9c5e';
    const label = playerNickname ? playerNickname.trim().charAt(0).toUpperCase() : '?';
    if (!isInvincible || invincibleFlashToggle) {
      drawSoldier(ctx, friendScreenX, friendY, color, label, animTime, false);
    }
  }

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
  startEl.addEventListener('click', () => showScreen('nickname-screen'));
}

/**
 * Initialize the game: menus, input, and navigation
 */
function init() {
  ploffersonHeadImage = new Image();
  ploffersonHeadImage.src = 'assets/plofferson-head.png';
  initStartScreen();
  initMainMenu();
  initNicknameScreen();
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
