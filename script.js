let language = localStorage.getItem("parkour-language") === "en" ? "en" : "ru";
const englishText = {
  "Парк паркура": "Parkour Park",
  "Прыжки по платформам": "Jump Blocks",
  "Игра про паркур": "Parkour game",
  "Герой прыгает по платформам": "Player jumping on platforms",
  "Заново": "Restart",
  "Широкие долины": "Wide Valleys",
  "Каменистые долины": "Rocky Valleys",
  "Страна вулканов": "Volcano Land",
  "Темные пещеры": "Dark Caves",
  "Удаление включено": "Remove On",
  "Удаление": "Remove",
  "Удаление: нажми на блок, чтобы убрать его. Нажми R, чтобы выйти из режима.": "Remove mode: click a block to delete it. Press R to exit.",
  "Ходьба: A/D или стрелки. Бег: Shift. Удерживай пробел для высокого прыжка. Нажми ещё раз для двойного прыжка.": "Walk: A/D or arrows. Run: Shift. Hold Space to jump higher. Press again for a double jump.",
  "Нажми пробел": "Press Space",
  "Прыгай с блока на блок": "Jump from block to block",
  "Найдено:": "Found:",
  "Игрок умер": "You died",
  "Меня убило крылатое создание": "A winged creature got me",
  "Игрок умер от враждебного монстра": "You were killed by a monster",
  "Игрок умер в горячей картошке": "You died in hot potato",
  "Игрок умер в облаках": "You died in the clouds",
  "Игрок умер от неизвестной штуки": "You were killed by something unknown",
  "Игрок погиб от стрелы скелета": "You were hit by a skeleton arrow",
  "Игра окончена": "Game over",
  "Нажми «Заново» или пробел": "Press Restart or Space",
  "ПОБЕДА": "VICTORY",
  "ПАРК ПАРКУРА": "PARKOUR PARK",
  "НОВАЯ ИГРА": "NEW GAME",
  "Выберите уровень:": "Choose a level:",
  "← → выбор, пробел или ввод — начать": "← → select, Space/Enter — start",
  "Музыка: ": "Music: ",
  "Жизни: ": "Lives: ",
  "Монеты: ": "Coins: ",
  "Осталось жизней: ": "Lives left: ",
  "Уровень ": "Level "
};

function t(text) {
  if (!text) return text;
  // Normalize existing UI text so switching languages also updates open messages.
  let russian = text;
  for (const [ru, en] of Object.entries(englishText)) {
    if (text === en) { russian = ru; break; }
    if (ru.endsWith(" ") && text.startsWith(en) && /^\d+$/.test(text.slice(en.length))) {
      russian = ru + text.slice(en.length);
      break;
    }
  }
  if (language === "ru") return russian;
  if (englishText[russian]) return englishText[russian];
  for (const [ru, en] of Object.entries(englishText)) {
    if (ru.endsWith(" ") && russian.startsWith(ru) && /^\d+$/.test(russian.slice(ru.length))) {
      return en + russian.slice(ru.length);
    }
  }
  return russian;
}

function applyLanguage() {
  document.documentElement.lang = language;
  document.title = t("Парк паркура");
  document.querySelectorAll("[data-i18n]").forEach(element => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-aria]").forEach(element => {
    element.setAttribute("aria-label", t(element.dataset.i18nAria));
  });
  for (const element of [coinsText, livesText, musicButton, toolButton, helpText,
    deathNotification, message.querySelector("strong"), message.querySelector("span")]) {
    element.textContent = t(element.textContent);
  }
  document.getElementById("language-select").value = language;
}

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreText = document.getElementById("score");
const coinsText = document.getElementById("coins");
const livesText = document.getElementById("lives");
const bestScoreText = document.getElementById("best-score");
const message = document.getElementById("message");
const deathNotification = document.getElementById("death-notification");
let deathNotificationUntil = 0;
const restartButton = document.getElementById("restart-button");
const toolButton = document.getElementById("tool-button");
const musicButton = document.getElementById("music-button");
const helpText = document.getElementById("help-text");

const keys = new Set();
const gravity = 0.58;
const fallGravity = 0.72;
const jumpHoldGravity = 0.28;
const jumpCutMultiplier = 0.62;
const friction = 0.82;
const walkSpeed = 0.52;
const runSpeed = 1.0;
const maxWalkSpeed = 5.6;
const maxRunSpeed = 10.2;
const jumpPower = 10.7;
const doubleJumpPower = 10.4;
const jumpHoldLimit = 10;
const climbSpeed = 4.2;
let levelEndX = 11300;
const portalWidth = 132;
const portalHeight = 176;
const blockColors = [
  { base: "#4b7f52", top: "#74b25e", shade: "rgba(30, 36, 30, 0.22)" },
  { base: "#3c7a89", top: "#61b2c2", shade: "rgba(16, 44, 52, 0.22)" },
  { base: "#8a6f3f", top: "#c49a4a", shade: "rgba(53, 37, 18, 0.24)" },
  { base: "#6d5cae", top: "#9584dd", shade: "rgba(32, 23, 68, 0.24)" },
  { base: "#a2574c", top: "#d07a6b", shade: "rgba(68, 24, 21, 0.24)" },
  { base: "#24262a", top: "#3b3f44", shade: "rgba(0, 0, 0, 0.36)" },
];

let bestScore = Number(localStorage.getItem("parkour-best-score")) || 0;
let cameraX = 0;
let score = 0;
let coinsCollected = 0;
let lives = 3;
let nextLifeAt = 50;
let gameOver = false;
let started = false;
let removeMode = false;
let player = null;
let blocks = [];
let rocks = [];
let coins = [];
let ladders = [];
let zombies = [];
let poopParticles = [];
let bats = [];
let chests = [];
let stalactites = [];
let zombieSpawnCounter = 0;
let fireballs = [];
let fireballSpots = [];
let fireballNextIndex = 0;
let lastFireballTime = 0;
const fireballInterval = 5000; // ms between launches
const lavaHeight = 110;
let audioCtx;
let musicTimer;
let musicStep = 0;
let musicLevel = 0;
let musicMode = "background";
let fallSoundPlayed = false;
let animationTime = 0;
let zombieStepSoundAt = 0;
let jumpHeld = false;
let lastGroundBlock;
let groundPlatformsGenerated = 0;
let portal;
let victory = false;
let victoryScale = 0;
let victoryFrames = 0;
let screen = "menu";
let currentLevel = 1;
const newGameButton = {
  x: 0,
  y: 0,
  width: 260,
  height: 58,
};

// World map state
let mapSelectedLevel = 1;
let mapUnlocked = {};
const levelNames = {
  1: "Широкие долины",
  2: "Каменистые долины",
  3: "Страна вулканов",
  4: "Темные пещеры",
};

function updateUnlockedLevels() {
  // Unlock all currently defined levels in LEVEL_CONFIGS by default
  mapUnlocked = {};
  for (const k of Object.keys(LEVEL_CONFIGS)) {
    const n = Number(k);
    mapUnlocked[n] = true;
  }
}

function showMap(preserveStats = true) {
  updateUnlockedLevels();
  screen = "map";
  started = false;
  message.hidden = true;
  // default selection: current level if unlocked, else first unlocked
  if (mapUnlocked[currentLevel]) {
    mapSelectedLevel = currentLevel;
  } else {
    mapSelectedLevel = Object.keys(mapUnlocked).map(Number)[0] || 1;
  }
}

const LEVEL_CONFIGS = {
  1: {
    endX: 7600,
    initialGeneratedCount: 5,
    initialBlocks: [
      makeBlock(20, 430, 240, 34, 0),
      makeBlock(300, 404, 170, 40, 1),
      makeBlock(500, 372, 160, 34, 2),
      makeBlock(700, 330, 170, 32, 3),
      makeBlock(900, 360, 170, 34, 4),
      makeBlock(1080, 318, 160, 32, 1),
      makeBlock(1260, 360, 160, 34, 2),
      makeBlock(1460, 322, 170, 32, 3),
      makeBlock(1640, 356, 170, 34, 4),
    ],
    initialLadders: [
      [1, 2],
      [4, 5],
      [6, 7],
    ],
    initialRockDefinitions: [],
    initialZombieIndices: [4],
    rockChance: 0,
    zombieChance: 0.154,
    zombieInterval: 7,
    forceZombieSpawn: false,
    gapBase: 34,
    gapStep: 12,
    widthBase: 180,
    widthStep: 18,
    heightBase: 28,
    heightStep: 4,
    yBase: 352,
    yStep: 11,
    upperEvery: 4,
    upperWidthBase: 174,
    upperWidthStep: 18,
    upperYMin: 115,
  },
  2: {
    endX: 11300,
    initialGeneratedCount: 7,
    initialBlocks: [
      makeBlock(20, 430, 250, 34, 0),
      makeBlock(330, 405, 190, 42, 1),
      makeBlock(430, 165, 220, 32, 3),
      makeBlock(590, 380, 185, 30, 2),
      makeBlock(850, 410, 190, 50, 3),
      makeBlock(960, 160, 190, 36, 1),
      makeBlock(1120, 380, 200, 36, 4),
      makeBlock(1400, 350, 185, 44, 1),
      makeBlock(1490, 135, 230, 34, 4),
      makeBlock(1660, 390, 210, 32, 2),
    ],
    initialLadders: [
      [1, 2],
      [4, 5],
      [7, 8],
    ],
    initialRockDefinitions: [
      { blockIndex: 3, offset: 94, size: 32 },
      { blockIndex: 6, offset: 96, size: 36 },
      { blockIndex: 9, offset: 92, size: 30 },
    ],
    initialZombieIndices: [4, 8],
    rockChance: 0.38,
    zombieChance: 0.22,
    zombieInterval: 5,
    forceZombieSpawn: true,
    gapBase: 58,
    gapStep: 18,
    widthBase: 220,
    widthStep: 24,
    heightBase: 30,
    heightStep: 6,
    yBase: 358,
    yStep: 18,
    upperEvery: 4,
    upperWidthBase: 210,
    upperWidthStep: 26,
    upperYMin: 115,
  },
  3: {
    endX: 16000,
    initialGeneratedCount: 7,
    blockColorIndex: 5,
    initialBlocks: [
      makeBlock(20, 440, 260, 36, 5),
      makeBlock(340, 412, 200, 42, 5),
      makeBlock(560, 380, 180, 36, 5),
      makeBlock(820, 420, 210, 46, 5),
      makeBlock(1080, 396, 170, 34, 5),
      makeBlock(1320, 420, 200, 36, 5),
      makeBlock(1560, 384, 220, 40, 5),
      makeBlock(390, 220, 190, 30, 3),
      makeBlock(1380, 230, 190, 30, 3),
    ],
    initialLadders: [
      [1, 2],
      [3, 4],
      [1, 7],
      [5, 8],
    ],
    initialRockDefinitions: [
      { blockIndex: 2, offset: 92, size: 30 },
      { blockIndex: 5, offset: 110, size: 34 },
    ],
    flyingIndices: [7, 8],
    initialZombieIndices: [3, 6],
    rockChance: 0.28,
    zombieChance: 0.28,
    zombieInterval: 5,
    zombiePairEvery: 5,
    forceZombieSpawn: true,
    gapBase: 64,
    gapStep: 20,
    widthBase: 210,
    widthStep: 20,
    heightBase: 36,
    heightStep: 6,
    yBase: 382,
    yStep: 16,
    upperEvery: 4,
    upperWidthBase: 200,
    upperWidthStep: 22,
    upperYMin: 110,
  },
  4: {
    endX: 19000,
    initialGeneratedCount: 8,
    blockColorIndex: 5,
    initialBlocks: [
      makeBlock(20, 450, 260, 38, 5),
      makeBlock(340, 418, 210, 42, 5),
      makeBlock(620, 392, 210, 42, 5),
      makeBlock(910, 360, 200, 38, 5),
      makeBlock(1220, 418, 220, 40, 5),
      makeBlock(1540, 388, 240, 44, 5),
      makeBlock(1860, 344, 210, 38, 5),
    ],
    initialLadders: [
      [1, 3],
      [3, 6],
      [5, 6],
    ],
    initialRockDefinitions: [],
    // doubled initial zombies on platforms for level 4
    initialZombieIndices: [1, 2, 3, 4, 5, 6],
    rockChance: 0.18,
    // increase spawn chance so roughly twice as many zombies appear on platforms
    zombieChance: 0.64,
    zombieInterval: 4,
    zombiePairEvery: 4,
    forceZombieSpawn: true,
    gapBase: 52,
    gapStep: 18,
    widthBase: 200,
    widthStep: 16,
    heightBase: 34,
    heightStep: 5,
    yBase: 380,
    yStep: 18,
    upperEvery: 5,
    upperWidthBase: 190,
    upperWidthStep: 20,
    upperYMin: 120,
  },
};

function makeBlock(x, y, width, height = 34, colorIndex = null) {
  const color = colorIndex ?? Math.floor(Math.random() * blockColors.length);
  return { x, y, width, height, color };
}

function makeLadder(x, topY, bottomY) {
  return {
    x,
    y: topY,
    width: 44,
    height: bottomY - topY,
    bottomX: x,
  };
}

function makePlatformLadder(lowerBlock, upperBlock, upperAnchor = "middle") {
  const lowerX = lowerBlock.x + lowerBlock.width / 2 - 22;
  const ladder = makeLadder(lowerX, upperBlock.y, lowerBlock.y);
  ladder.bottomX = lowerX;
  ladder.lowerBlock = lowerBlock;
  ladder.upperBlock = upperBlock;
  return ladder;
}

function sortBlocks() {
  blocks.sort((first, second) => first.x - second.x);
}

function isOnLadder() {
  const playerCenter = player.x + player.width / 2;
  return ladders.find((ladder) => {
    const insideX = playerCenter >= ladder.x - 10 && playerCenter <= ladder.x + ladder.width + 10;
    const insideY = player.y + player.height > ladder.y && player.y < ladder.y + ladder.height;
    return insideX && insideY;
  });
}

function getLadderXAtY(ladder, y) {
  return ladder.x;
}

function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}

function playTone(frequency, duration, type = "sine", volume = 0.12, delay = 0) {
  if (!audioCtx) {
    return;
  }

  const start = audioCtx.currentTime + delay;
  const oscillator = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  oscillator.connect(gain);
  gain.connect(audioCtx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.03);
}

function playNoise(duration, volume = 0.14, delay = 0) {
  if (!audioCtx) {
    return;
  }

  const start = audioCtx.currentTime + delay;
  const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * duration, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  const source = audioCtx.createBufferSource();
  const gain = audioCtx.createGain();

  for (let i = 0; i < data.length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }

  source.buffer = buffer;
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(gain);
  gain.connect(audioCtx.destination);
  source.start(start);
}

function playJumpSound(isDouble = false) {
  ensureAudio();
  playTone(isDouble ? 620 : 420, 0.12, "square", 0.08);
  playTone(isDouble ? 880 : 650, 0.1, "triangle", 0.06, 0.04);
}

function playCoinSound() {
  ensureAudio();
  playTone(1046, 0.08, "sine", 0.08);
  playTone(1568, 0.1, "sine", 0.07, 0.05);
}

function playRockSound() {
  ensureAudio();
  playNoise(0.22, 0.18);
  playTone(95, 0.25, "sawtooth", 0.12);
}

function playFallSound() {
  ensureAudio();
  playTone(220, 0.45, "sawtooth", 0.11);
  playTone(82, 0.5, "triangle", 0.12, 0.08);
}

function playZombieGrumble() {
  ensureAudio();
  playTone(72 + Math.random() * 18, 0.16, "sawtooth", 0.045);
  playTone(118 + Math.random() * 30, 0.12, "square", 0.025, 0.05);
}

function playZombieFallSound() {
  ensureAudio();
  playTone(260, 0.12, "square", 0.09);
  playTone(170, 0.2, "sawtooth", 0.09, 0.08);
  playTone(88, 0.28, "triangle", 0.1, 0.2);
}

function playMusicBeat() {
  if (musicLevel === 0 || !audioCtx) {
    return;
  }

  const musicVolume = [0, 0.75, 1, 1.25][musicLevel];
  if (musicMode === "victory") {
    const melody = [523, 659, 784, 1046, 784, 1046, 1318, 1568];
    const note = melody[musicStep % melody.length];
    playTone(note, 0.18, "triangle", 0.08 * musicVolume);
    playTone(note / 2, 0.26, "sine", 0.045 * musicVolume);
    if (musicStep % 4 === 0) {
      playTone(196, 0.12, "square", 0.055 * musicVolume);
    }
    musicStep += 1;
    return;
  }

  const bassNotes = [55, 55, 82, 73, 55, 98, 82, 73];
  const note = bassNotes[musicStep % bassNotes.length];

  playTone(note, 0.22, "sawtooth", 0.075 * musicVolume);

  if (musicStep % 2 === 0) {
    playTone(42, 0.08, "sine", 0.14 * musicVolume);
  }

  if (musicStep % 4 === 2) {
    playNoise(0.06, 0.055 * musicVolume);
  }

  if (musicStep % 8 === 5) {
    playTone(note * 3, 0.12, "square", 0.035 * musicVolume);
  }

  musicStep += 1;
}

function updateMusicButton() {
  musicButton.textContent = t(`Музыка: ${musicLevel}`);
  musicButton.classList.toggle("is-on", musicLevel > 0);
  musicButton.setAttribute("aria-pressed", String(musicLevel > 0));
}

function toggleMusic() {
  ensureAudio();
  musicLevel = (musicLevel + 1) % 4;
  updateMusicButton();

  if (musicLevel > 0) {
    clearInterval(musicTimer);
    playMusicBeat();
    musicTimer = setInterval(playMusicBeat, 185);
    return;
  }

  clearInterval(musicTimer);
}

function makeRock(block, offset = null, size = null) {
  const rockSize = size ?? 28 + Math.random() * 15;
  const edgePadding = Math.min(70, Math.max(42, block.width * 0.25));
  const minOffset = edgePadding;
  const maxOffset = Math.max(minOffset, block.width - edgePadding - rockSize);
  const rockOffset = offset ?? minOffset + Math.random() * Math.max(0, maxOffset - minOffset);
  return {
    x: block.x + rockOffset,
    y: block.y - rockSize,
    width: rockSize,
    height: rockSize,
  };
}

function addRockOnBlock(block, chance = 0.38) {
  if (block.width < 130 || Math.random() > chance) {
    return;
  }

  rocks.push(makeRock(block));
}

function makeZombie(block, kind = "zombie") {
  const width = 30;
  const height = 46;
  return {
    x: block.x + Math.max(34, block.width * 0.18),
    y: block.y - height,
    width,
    height,
    vx: kind === "troll" ? 0.75 : 0.55,
    vy: 0,
    left: block.x + 18,
    right: block.x + block.width - width - 18,
    alive: true,
    falling: false,
    facing: 1,
    walk: Math.random() * Math.PI * 2,
    kind,
    shotCooldown: 100,
  };
}

function addZombieOnBlock(block, force = false, chance = 0.22) {
  if (block.width < 170) {
    return false;
  }

  if (!force && Math.random() > chance) {
    return false;
  }

  const kind = currentLevel === 4 ? "troll" : currentLevel === 3 ? "skeleton" : "zombie";
  zombies.push(makeZombie(block, kind));
  return true;
}

function makeBat(x, y) {
  return {
    x,
    y,
    width: 42,
    height: 24,
    // reduced speed: half of previous (flies slower)
    vx: -2.5,
    // smaller vertical wiggle
    vy: 0,
    // flies straight horizontally; no phase/mode needed
    phase: 0,
    mode: "straight",
  };
}

function spawnBat() {
  const startX = cameraX + canvas.width + 50;
  // spawn at vertical center so bats fly across the middle of the screen
  const startY = Math.floor(canvas.height / 2);
  bats.push(makeBat(startX, startY));
}

function updateBats() {
  if (currentLevel !== 4) {
    bats = [];
    return;
  }

  // allow only one bat at a time and spawn three times less often
  const chestOpened = chests && chests.some((c) => c.opened);
  if (!chestOpened && bats.length < 1 && animationTime % 510 === 0) {
    spawnBat();
  }

  for (let i = bats.length - 1; i >= 0; i -= 1) {
    const bat = bats[i];
    // move straight left; keep a fixed Y
    bat.x += bat.vx;

    // remove when fully off-screen to the left
    if (bat.x < cameraX - 180) {
      bats.splice(i, 1);
      continue;
    }

    const playerRight = player.x + player.width;
    const playerBottom = player.y + player.height;
    const previousBottom = player.y + player.height - player.vy;
    const batRight = bat.x + bat.width;
    const batBottom = bat.y + bat.height;
    const overlapsX = playerRight > bat.x + 2 && player.x < batRight - 2;
    const overlapsY = playerBottom > bat.y + 2 && player.y < batBottom - 2;
    // stomp detection: player is moving down and was above the bat in the previous frame
    const stomped = player.vy > 0 && previousBottom <= bat.y + 8 && playerBottom >= bat.y && overlapsX;

    if (stomped) {
      spawnPoop();
      bats.splice(i, 1);
      playZombieFallSound();
      player.vy = -9.5;
      player.jumpHold = 0;
      player.canDoubleJump = true;
      continue;
    }

    if (overlapsX && overlapsY) {
      // if player has armor active, break armor and bounce
      if (player.armorActive) {
        player.armorActive = false;
        player.vy = -7;
        // revert visuals handled in drawPlayer
        playFallSound();
        bats.splice(i, 1);
        continue;
      }
      bats.splice(i, 1);
      playRockSound();
      loseLife(t("Меня убило крылатое создание"));
      return;
    }
  }
}

function makePortal(block) {
  return {
    x: block.x + block.width - portalWidth - 72,
    y: block.y - portalHeight,
    width: portalWidth,
    height: portalHeight,
    blockSize: 44,
  };
}

function makeCoin(x, y) {
  return {
    x,
    y,
    radius: 11,
    spin: Math.random() * Math.PI * 2,
  };
}

function addJumpPathCoins(fromBlock, toBlock) {
  const startX = fromBlock.x + fromBlock.width * 0.72;
  const endX = toBlock.x + toBlock.width * 0.32;
  const startY = fromBlock.y - 54;
  const endY = toBlock.y - 54;
  const arcLift = Math.max(70, Math.min(120, Math.abs(endX - startX) * 0.32));

  for (let i = 1; i <= 5; i += 1) {
    const progress = i / 6;
    const x = startX + (endX - startX) * progress;
    const baseY = startY + (endY - startY) * progress;
    const y = baseY - Math.sin(progress * Math.PI) * arcLift;
    coins.push(makeCoin(x, Math.max(52, y)));
  }
}

function addCoinsForBlocks() {
  for (let i = 0; i < blocks.length - 1; i += 1) {
    addJumpPathCoins(blocks[i], blocks[i + 1]);
  }
}

function getKeyName(event) {
  return event.key.length === 1 ? event.key.toLowerCase() : event.key;
}

function getWorldPoint(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (clientX - rect.left) * scaleX + cameraX,
    y: (clientY - rect.top) * scaleY,
  };
}

function updateToolText() {
  toolButton.textContent = removeMode ? t("Удаление включено") : t("Удаление");
  toolButton.classList.toggle("is-remove", removeMode);
  toolButton.setAttribute("aria-pressed", String(removeMode));
  helpText.textContent = removeMode
    ? t("Удаление: нажми на блок, чтобы убрать его. Нажми R, чтобы выйти из режима.")
    : t("Ходьба: A/D или стрелки. Бег: Shift. Удерживай пробел для высокого прыжка. Нажми ещё раз для двойного прыжка.");
}

function updateLivesText() {
  livesText.textContent = t(`Жизни: ${lives}`);
}

function getRespawnBlock() {
  if (blocks.length === 0) {
    return makeBlock(20, 430, 250, 34, 0);
  }

  const playerCenter = player.x + player.width / 2;
  let respawnBlock = blocks[0];

  for (const block of blocks) {
    const blockCenter = block.x + block.width / 2;

    if (blockCenter < playerCenter - 30) {
      respawnBlock = block;
    }
  }

  return respawnBlock;
}

function respawnPlayer() {
  enemyArrows = [];
  const block = getRespawnBlock();
  player.x = block.x + Math.min(48, block.width * 0.25);
  player.y = block.y - player.height;
  player.vx = 0;
  player.vy = 0;
  player.grounded = true;
  player.jumpHold = 0;
  player.canDoubleJump = true;
  cameraX = Math.max(0, player.x - 210);
  fallSoundPlayed = false;
}

function loseLife(deathMessage = t("Игрок умер")) {
  if (gameOver) return;
  deathNotification.textContent = deathMessage;
  deathNotificationUntil = Date.now() + 5000;
  deathNotification.hidden = false;
  lives -= 1;
  updateLivesText();

  if (lives > 0) {
    respawnPlayer();
    started = false;
    message.hidden = false;
    message.querySelector("strong").textContent = deathMessage;
    message.querySelector("span").textContent = t(`Осталось жизней: ${lives}`);
    return;
  }

  endGame(deathMessage);
}

function startVictory() {
  // After finishing a level, unlock the next level (if exists) and show map
  const next = currentLevel + 1;
  if (LEVEL_CONFIGS[next]) {
    updateUnlockedLevels();
    mapUnlocked[next] = true;
    showMap(true);
    return;
  }

  if (victory) {
    return;
  }

  victory = true;
  victoryFrames = 0;
  screen = "victory";
  started = false;
  musicMode = "victory";
  musicStep = 0;
  if (musicLevel === 0) {
    musicLevel = 1;
    updateMusicButton();
  }
  clearInterval(musicTimer);
  playMusicBeat();
  musicTimer = setInterval(playMusicBeat, 185);
}

function hitPortal() {
  if (!portal) {
    return false;
  }

  const playerRight = player.x + player.width;
  const playerBottom = player.y + player.height;
  const portalPassageX = portal.x + portal.blockSize;
  const portalPassageWidth = portal.blockSize;
  return (
    playerRight > portalPassageX &&
    player.x < portalPassageX + portalPassageWidth &&
    playerBottom > portal.y + portal.blockSize &&
    player.y < portal.y + portal.height
  );
}

function buildLevelData(level) {
  const config = LEVEL_CONFIGS[level];
  const blocks = config.initialBlocks.map((block) => ({ ...block }));
  for (const index of config.flyingIndices || []) {
    blocks[index].floatBaseY = blocks[index].y;
  }
  const ladders = config.initialLadders.map(([lowerIndex, upperIndex]) =>
    makePlatformLadder(blocks[lowerIndex], blocks[upperIndex], "middle")
  );
  const rocks = config.initialRockDefinitions.map((rock) =>
    makeRock(blocks[rock.blockIndex], rock.offset, rock.size)
  );
  const zombies = config.initialZombieIndices.map((index) => makeZombie(blocks[index], currentLevel === 4 ? "troll" : currentLevel === 3 ? "skeleton" : "zombie"));

  return { blocks, ladders, rocks, zombies };
}

function loadLevel(level, options = {}) {
  poopParticles = [];
  deathNotificationUntil = 0;
  deathNotification.hidden = true;
  const config = LEVEL_CONFIGS[level];
  const preserveStats = options.preserveStats ?? false;

  currentLevel = level;
  levelEndX = config.endX;
  cameraX = 0;
  gameOver = false;
  victory = false;
  victoryScale = 0;
  victoryFrames = 0;
  screen = "game";
  portal = null;
  fallSoundPlayed = false;
  jumpHeld = false;
  started = false;
  musicMode = "background";

  if (!preserveStats) {
    score = 0;
    coinsCollected = 0;
    lives = 3;
    nextLifeAt = 50;
  }

  player = {
    x: 70,
    y: 382,
    width: 34,
    height: 48,
    vx: 0,
    vy: 0,
    grounded: true,
    jumpHold: 0,
    canDoubleJump: true,
    facing: 1,
    // upgrades
    armorActive: false,
    hasSword: false,
    hasBow: false,
  };

  const levelData = buildLevelData(level);
  blocks = levelData.blocks;
  ladders = levelData.ladders;
  rocks = levelData.rocks;
  zombies = levelData.zombies;
  bats = [];
  arrows = [];
  enemyArrows = [];
  stalactites = [];
  if (level === 4) {
    for (let i = 0; i < 24; i += 1) {
      const x = i * 220 + 80;
      // Disable falling stalactites for level 4 (remove hazard)
      const falling = false;
      stalactites.push({
        x,
        y: 42 + (i % 4) * 8,
        width: 22 + (i % 3) * 10,
        height: 62 + (i % 5) * 18,
        falling,
        vy: 0,
      });
    }
  }
  // reset level-3 / level-4 hazards
  fireballs = [];
  fireballSpots = [];
  fireballNextIndex = 0;
  lastFireballTime = Date.now();
  zombieSpawnCounter = zombies.length || 0;
  coins = [];
  chests = [];
  sortBlocks();
  lastGroundBlock = blocks[blocks.length - 1];
  groundPlatformsGenerated = config.initialGeneratedCount;
  addCoinsForBlocks();

  // generate three chests evenly across the level, placed on blocks when possible
  (function generateChests() {
    const prizeTypes = ["armor", "sword", "bow"];
    // ensure armor appears at least once by including it
    const assignments = prizeTypes.slice();
    const segWidth = Math.max(800, Math.floor(levelEndX / 4));

    for (let i = 0; i < 3; i += 1) {
      const segStart = i * segWidth + 200;
      const segEnd = Math.min(levelEndX - 600, (i + 1) * segWidth + 200);
      // find candidate blocks in segment (blocks that intersect the segment)
      const candidates = blocks.filter((b) => b.x + b.width > segStart && b.x < segEnd);
      if (candidates.length === 0) {
        // expand search slightly if none found in exact segment
        const expanded = blocks.filter((b) => b.x + b.width > segStart - 220 && b.x < segEnd + 220);
        if (expanded.length > 0) {
          candidates.push(...expanded);
        }
      }
      if (candidates.length === 0) {
        // as a last resort use any block on the level
        candidates.push(...blocks);
      }

      if (candidates.length === 0) {
        // no blocks at all (very small level) - skip this chest
        continue;
      }

      let bx;
      let by;
      // choose a random block and place chest on its top surface, centered within safe margins
      const b = candidates[Math.floor(Math.random() * candidates.length)];
      const chestW = 34;
      const padding = 8;
      const minX = Math.floor(b.x + padding);
      const maxX = Math.floor(b.x + b.width - chestW - padding);
      bx = Math.max(minX, Math.min(maxX, Math.floor(b.x + b.width / 2 - chestW / 2)));
      by = b.y - 24; // place chest flush above block

      const prize = assignments[i % assignments.length];
      chests.push({ x: bx, y: by, width: 34, height: 24, prize, opened: false });
    }
  })();

  scoreText.textContent = `${score}`;
  coinsText.textContent = t(`Монеты: ${coinsCollected}`);
  updateLivesText();
  bestScoreText.textContent = `${bestScore}`;
  updateToolText();
  updateMusicButton();
  message.hidden = false;
  message.querySelector("strong").textContent = t("Нажми пробел");
  message.querySelector("span").textContent = t("Прыгай с блока на блок");
}

function resetGame() {
  // If currently in an active level, restart that level.
  // Otherwise (game over / not in-game) return to the main menu (the old behaviour).
  if (screen === "game" && !gameOver) {
    loadLevel(currentLevel, { preserveStats: false });
  } else {
    // reset run-wide stats to fresh start and show menu
    score = 0;
    coinsCollected = 0;
    lives = 3;
    nextLifeAt = 50;
    scoreText.textContent = `${score}`;
    coinsText.textContent = t(`Монеты: ${coinsCollected}`);
    updateLivesText();
    bestScore = Number(localStorage.getItem("parkour-best-score")) || 0;
    bestScoreText.textContent = `${bestScore}`;
    updateToolText();
    updateMusicButton();
    showMenu();
  }
}

function showMenu() {
  applyLanguage();
  deathNotificationUntil = 0;
  deathNotification.hidden = true;
  screen = "menu";
  victory = false;
  victoryScale = 0;
  victoryFrames = 0;
  started = false;
  gameOver = false;
  cameraX = 0;
  jumpHeld = false;
  musicMode = "background";
  message.hidden = true;
}

function addMoreBlocks() {
  if (blocks.length === 0) {
    return;
  }

  const config = LEVEL_CONFIGS[currentLevel];

  while (!portal && lastGroundBlock.x < cameraX + canvas.width + 650) {
    const gap = config.gapBase + (groundPlatformsGenerated % 3) * config.gapStep;
    const width = config.widthBase + (groundPlatformsGenerated % 4) * config.widthStep;
    const height = config.heightBase + (groundPlatformsGenerated % 3) * config.heightStep;
    const y = config.yBase + (groundPlatformsGenerated % 4) * config.yStep;
    const nextX = lastGroundBlock.x + lastGroundBlock.width + gap;
    const previousBlock = lastGroundBlock;
    const isFinalBlock = nextX > levelEndX - 620;
    const block = isFinalBlock
      ? makeBlock(levelEndX - 520, 392, 520, 38, 3)
      : makeBlock(nextX, y, width, height, config.blockColorIndex ?? null);

    blocks.push(block);
    const oldGroundCount = groundPlatformsGenerated;
    groundPlatformsGenerated += 1;

    if (!isFinalBlock && config.rockChance > 0) {
      addRockOnBlock(block, config.rockChance);
    }

    // if any chest on this level has been opened, stop spawning new enemies
    const chestOpened = chests && chests.some((c) => c.opened);
    if (!isFinalBlock && !chestOpened && groundPlatformsGenerated % config.zombieInterval === 0) {
      const added = addZombieOnBlock(block, config.forceZombieSpawn, config.zombieChance);
      if (added) {
        zombieSpawnCounter += 1;
        if (config.zombiePairEvery && zombieSpawnCounter % config.zombiePairEvery === 0) {
          // spawn a pair
          const added2 = addZombieOnBlock(block, true, config.zombieChance);
          if (added2) {
            zombieSpawnCounter += 1;
          }
        }
      }
    }

    addJumpPathCoins(previousBlock, block);

    if (!isFinalBlock && groundPlatformsGenerated % config.upperEvery === 0) {
      const upperWidth = config.upperWidthBase + (groundPlatformsGenerated % 3) * config.upperWidthStep;
      const upperX = block.x + Math.max(48, block.width * 0.3);
      const upperY = Math.max(config.upperYMin, block.y - 205);
      const upperBlock = makeBlock(upperX, upperY, upperWidth, 34, (groundPlatformsGenerated + 2) % blockColors.length);
      if (currentLevel === 3) upperBlock.floatBaseY = upperY;
      blocks.push(upperBlock);
      ladders.push(makePlatformLadder(block, upperBlock, "middle"));
      addJumpPathCoins(block, upperBlock);
    }

    lastGroundBlock = block;

    const fireballGapEvery = currentLevel === 4 ? 3 : 5;
    if ((currentLevel === 3 || currentLevel === 4) && oldGroundCount % fireballGapEvery === 0 && !isFinalBlock && !chestOpened) {
      const gapStart = previousBlock.x + previousBlock.width;
      const gapCenter = gapStart + (block.x - gapStart) / 2;
      fireballSpots.push({ x: gapCenter });
    }

    if (!chestOpened && currentLevel === 4 && oldGroundCount % 6 === 0 && !isFinalBlock) {
      const batX = block.x + block.width + 120;
      if (batX < levelEndX - 520) {
        bats.push(makeBat(cameraX + canvas.width + 80 + Math.random() * 70, Math.floor(canvas.height / 2)));
      }
    }

    if (isFinalBlock) {
      portal = makePortal(block);
      break;
    }
  }

  blocks = blocks.filter((block) => block.x + block.width > cameraX - 260);
  rocks = rocks.filter((rock) => rock.x + rock.width > cameraX - 260);
  coins = coins.filter((coin) => coin.x + coin.radius > cameraX - 260);
  ladders = ladders.filter((ladder) => ladder.x + ladder.width > cameraX - 260);
  zombies = zombies.filter((zombie) => zombie.x + zombie.width > cameraX - 260 && zombie.y < canvas.height + 220);
  fireballSpots = fireballSpots.filter((spot) => spot.x > cameraX - 260);
  sortBlocks();
}

function removeBlock(clientX, clientY) {
  const point = getWorldPoint(clientX, clientY);
  let index = -1;

  for (let i = blocks.length - 1; i >= 0; i -= 1) {
    const block = blocks[i];
    const insideX = point.x >= block.x && point.x <= block.x + block.width;
    const insideY = point.y >= block.y && point.y <= block.y + block.height;

    if (insideX && insideY) {
      index = i;
      break;
    }
  }

  if (index !== -1) {
    const block = blocks[index];
    ladders = ladders.filter((ladder) => {
      const connectedX = ladder.x + ladder.width > block.x && ladder.x < block.x + block.width;
      const connectedY =
        Math.abs(ladder.y - block.y) < 8 || Math.abs(ladder.y + ladder.height - block.y) < 8;
      return !(connectedX && connectedY);
    });
    rocks = rocks.filter((rock) => {
      const onBlock = rock.x + rock.width > block.x && rock.x < block.x + block.width;
      const touchesTop = rock.y + rock.height <= block.y + 2;
      return !(onBlock && touchesTop);
    });
    zombies = zombies.filter((zombie) => {
      const onBlock = zombie.x + zombie.width > block.x && zombie.x < block.x + block.width;
      const touchesTop = zombie.y + zombie.height <= block.y + 2;
      return !(onBlock && touchesTop);
    });
    blocks.splice(index, 1);
  }
}

function hitRock() {
  return rocks.some((rock) => {
    const playerRight = player.x + player.width;
    const playerBottom = player.y + player.height;
    const rockRight = rock.x + rock.width;
    const rockBottom = rock.y + rock.height;
    return (
      playerRight > rock.x + 7 &&
      player.x < rockRight - 7 &&
      playerBottom > rock.y + 6 &&
      player.y < rockBottom - 4
    );
  });
}

function updateZombies(previousBottom) {
  for (const zombie of zombies) {
    if (zombie.alive) {
      zombie.x += zombie.vx;
      zombie.walk += 0.12;
      zombie.facing = zombie.vx > 0 ? 1 : -1;

      if (zombie.x <= zombie.left || zombie.x >= zombie.right) {
        zombie.x = Math.max(zombie.left, Math.min(zombie.right, zombie.x));
        zombie.vx *= -1;
      }

      if (zombie.kind === "skeleton") {
        const dx = player.x + player.width / 2 - (zombie.x + zombie.width / 2);
        zombie.facing = dx >= 0 ? 1 : -1;
        if (started && Math.abs(dx) < 580) {
          zombie.shotCooldown -= 1;
          if (zombie.shotCooldown <= 0) {
            const x = zombie.x + zombie.width / 2 + zombie.facing * 24;
            const y = zombie.y + 22;
            const dy = player.y + player.height / 2 - y;
            const aimX = player.x + player.width / 2 - x;
            const distance = Math.hypot(aimX, dy) || 1;
            enemyArrows.push({ x, y, vx: aimX / distance * 6, vy: dy / distance * 6, ttl: 160 });
            zombie.shotCooldown = 145;
          }
        }
      }

      if (zombie.kind !== "skeleton" && Math.abs(zombie.x - player.x) < 520 && animationTime > zombieStepSoundAt) {
        zombieStepSoundAt = animationTime + 70 + Math.floor(Math.random() * 50);
        playZombieGrumble();
      }
    } else {
      zombie.x += zombie.vx;
      zombie.vy += gravity * 0.82;
      zombie.y += zombie.vy;
      zombie.walk += 0.2;
      continue;
    }

    const playerRight = player.x + player.width;
    const playerBottom = player.y + player.height;
    const zombieRight = zombie.x + zombie.width;
    const zombieBottom = zombie.y + zombie.height;
    const overlapsX = playerRight > zombie.x + 5 && player.x < zombieRight - 5;
    const overlapsY = playerBottom > zombie.y + 4 && player.y < zombieBottom - 4;
    const stomped = player.vy > 0 && previousBottom <= zombie.y + 8 && playerBottom >= zombie.y && overlapsX;

    if (stomped) {
      spawnPoop();
      zombie.alive = false;
      zombie.falling = true;
      zombie.vy = -5;
      zombie.vx = player.vx * 0.35;
      player.vy = -10.5;
      player.jumpHold = 0;
      player.canDoubleJump = true;
      playZombieFallSound();
      continue;
    }

    if (overlapsX && overlapsY) {
      if (player.armorActive) {
        player.armorActive = false;
        player.vy = -7;
        playFallSound();
        zombie.alive = false;
        zombie.falling = true;
        zombie.vy = -3;
        continue;
      }
      playRockSound();
      loseLife(t("Игрок умер от враждебного монстра"));
      return;
    }
  }
}

function spawnFireballAt(x) {
  const lavaTop = canvas.height - lavaHeight;
  const fb = {
    x,
    y: lavaTop + 8,
    vy: -10,
    state: "rising",
    radius: 16,
  };
  fireballs.push(fb);
}

function updateFireballs() {
  if (currentLevel !== 3 && currentLevel !== 4) return;

  const fireballDelay = currentLevel === 4 ? Math.floor(fireballInterval / 2) : fireballInterval;
  const now = Date.now();
  const chestOpened = chests && chests.some((c) => c.opened);
  if (!chestOpened && fireballSpots.length > 0 && now - lastFireballTime > fireballDelay) {
    const spot = fireballSpots[fireballNextIndex % fireballSpots.length];
    spawnFireballAt(spot.x);
    fireballNextIndex = (fireballNextIndex + 1) % fireballSpots.length;
    lastFireballTime = now;
  }

  for (let i = fireballs.length - 1; i >= 0; i -= 1) {
    const fb = fireballs[i];

    if (fb.state === "rising") {
      fb.y += fb.vy;
      fb.vy += 0.28; // slow decel
      if (fb.y < 48) {
        fb.state = "falling";
        fb.vy = 6;
      }
    } else if (fb.state === "falling") {
      fb.vy += gravity * 0.6;
      fb.y += fb.vy;
    }

    // remove when below screen
    if (fb.y > canvas.height + 80) {
      fireballs.splice(i, 1);
      continue;
    }

    // collision with player
    const fbLeft = fb.x - fb.radius;
    const fbRight = fb.x + fb.radius;
    const fbTop = fb.y - fb.radius;
    const fbBottom = fb.y + fb.radius;
    const playerRight = player.x + player.width;
    const playerBottom = player.y + player.height;

    const overlapsX = playerRight > fbLeft && player.x < fbRight;
    const overlapsY = playerBottom > fbTop && player.y < fbBottom;

    if (overlapsX && overlapsY) {
      // fireball hits player -> lose life
      fireballs.splice(i, 1);
      if (player.armorActive) {
        player.armorActive = false;
        player.vy = -7;
        playFallSound();
        continue;
      }
      playRockSound();
      loseLife();
      return;
    }
  }
}

function collectCoins() {
  coins = coins.filter((coin) => {
    const closestX = Math.max(player.x, Math.min(coin.x, player.x + player.width));
    const closestY = Math.max(player.y, Math.min(coin.y, player.y + player.height));
    const distanceX = coin.x - closestX;
    const distanceY = coin.y - closestY;
    const touching = distanceX * distanceX + distanceY * distanceY < coin.radius * coin.radius;

    if (touching) {
      coinsCollected += 1;
      coinsText.textContent = t(`Монеты: ${coinsCollected}`);
      playCoinSound();

      while (coinsCollected >= nextLifeAt) {
        lives += 1;
        nextLifeAt += 50;
        updateLivesText();
        playTone(1760, 0.16, "triangle", 0.08, 0.08);
      }
    }

    return !touching;
  });
}

function openChestAt(index) {
  const chest = chests[index];
  if (!chest || chest.opened) return;
  chest.opened = true;
  const prize = chest.prize;
  // show symbol briefly via message element
  message.hidden = false;
  message.querySelector("strong").textContent = t("Найдено:");
  const sym = prize === "armor" ? "🛡️" : prize === "sword" ? "🗡️" : "🏹";
  message.querySelector("span").textContent = sym;
  setTimeout(() => {
    message.hidden = true;
  }, 900);

  if (prize === "armor") {
    player.armorActive = true;
  }

  if (prize === "sword") {
    player.hasSword = true;
  }

  if (prize === "bow") {
    player.hasBow = true;
  }
}

function useTool(clientX, clientY) {
  if (removeMode) {
    removeBlock(clientX, clientY);
  }
}

function jump() {
  if (gameOver) {
    resetGame();
    return;
  }

  started = true;

  if (player.grounded) {
    player.vy = -jumpPower;
    player.grounded = false;
    player.jumpHold = jumpHoldLimit;
    player.canDoubleJump = true;
    playJumpSound(false);
    return;
  }

  if (player.canDoubleJump) {
    player.vy = -doubleJumpPower;
    player.canDoubleJump = false;
    player.jumpHold = Math.floor(jumpHoldLimit * 0.65);
    playJumpSound(true);
  }
}

function updateFlyingPlatforms() {
  for (const block of blocks) {
    if (block.floatBaseY === undefined) continue;
    const oldY = block.y;
    block.y = block.floatBaseY + Math.sin(animationTime * 0.025 + block.x * 0.01) * 26;
    const dy = block.y - oldY;
    if (player.grounded && Math.abs(player.y + player.height - oldY) < 2 &&
        player.x + player.width > block.x + 8 && player.x < block.x + block.width - 8) {
      player.y += dy;
    }
    for (const chest of chests) {
      if (Math.abs(chest.y + chest.height - oldY) < 2 && chest.x >= block.x && chest.x < block.x + block.width) chest.y += dy;
    }
  }
  for (const ladder of ladders) {
    if (ladder.upperBlock?.floatBaseY === undefined) continue;
    ladder.y = ladder.upperBlock.y;
    ladder.height = ladder.lowerBlock.y - ladder.y;
  }
}

function updatePlayer() {
  animationTime += 1;
  const isRunning = keys.has("Shift");
  const speed = isRunning ? runSpeed : walkSpeed;
  const maxSpeed = isRunning ? maxRunSpeed : maxWalkSpeed;
  const ladder = isOnLadder();
  const climbingUp = keys.has("ArrowUp") || keys.has("w");
  const climbingDown = keys.has("ArrowDown") || keys.has("s");

  if (keys.has("ArrowLeft") || keys.has("a")) {
    player.vx -= speed;
    player.facing = -1;
  }

  if (keys.has("ArrowRight") || keys.has("d")) {
    player.vx += speed;
    player.facing = 1;
  }

  player.vx = Math.max(-maxSpeed, Math.min(maxSpeed, player.vx));
  player.vx *= friction;

  if (ladder && (climbingUp || climbingDown)) {
    const ladderX = getLadderXAtY(ladder, player.y + player.height / 2);
    player.x += (ladderX + ladder.width / 2 - (player.x + player.width / 2)) * 0.18;
    player.vy = 0;
    player.grounded = false;

    if (climbingUp) {
      player.vy = -climbSpeed;
    }

    if (climbingDown) {
      player.vy = climbSpeed;
    }
  } else {
    if (player.vy < 0 && jumpHeld && player.jumpHold > 0) {
      player.vy += jumpHoldGravity;
      player.jumpHold -= 1;
    } else if (player.vy < 0) {
      player.vy += gravity;
    } else {
      player.vy += fallGravity;
    }
  }

  const previousBottom = player.y + player.height;
  player.x += player.vx;
  player.y += player.vy;
  player.grounded = false;

  if (ladder && climbingUp && player.y + player.height <= ladder.y + 12) {
    player.y = ladder.y - player.height;
    player.vy = 0;
    player.grounded = true;
    player.jumpHold = 0;
    player.canDoubleJump = true;
  }

  for (const block of blocks) {
    const playerBottom = player.y + player.height;
    const playerRight = player.x + player.width;
    const blockRight = block.x + block.width;
    const blockBottom = block.y + block.height;
    const crossesTop = previousBottom <= block.y && playerBottom >= block.y;
    const crossesBottom = previousBottom >= blockBottom && player.y <= blockBottom;
    const overlapsX = playerRight > block.x + 8 && player.x < blockRight - 8;

    if (player.vy >= 0 && crossesTop && overlapsX) {
      player.y = block.y - player.height;
      player.vy = 0;
      player.grounded = true;
      player.jumpHold = 0;
      player.canDoubleJump = true;
    }

    if (player.vy < 0 && !ladder && crossesBottom && overlapsX) {
      player.y = blockBottom;
      player.vy = 0;
    }
  }

  cameraX = Math.max(0, player.x - 210);
  score = Math.max(score, Math.floor(player.x / 10));
  scoreText.textContent = `${score}`;
  collectCoins();
  updateZombies(previousBottom);
  updateBats();
  updateCaveStalactites();

  // chest collision / pickup
  for (let i = 0; i < chests.length; i += 1) {
    const chest = chests[i];
    if (!chest || chest.opened) continue;
    const chestRight = chest.x + chest.width;
    const chestBottom = chest.y + chest.height;
    const playerRight = player.x + player.width;
    const playerBottom = player.y + player.height;
    const overlapsX = playerRight > chest.x + 2 && player.x < chestRight - 2;
    const overlapsY = playerBottom > chest.y + 2 && player.y < chestBottom - 2;
    if (overlapsX && overlapsY) {
      openChestAt(i);
      // if chest gave armor, equip immediately (handled in openChestAt)
      // If sword/bow, they persist via player.hasSword/hasBow
    }
  }

  if (hitPortal()) {
    startVictory();
    return;
  }

  if (player.y > canvas.height + 40 && !fallSoundPlayed) {
    fallSoundPlayed = true;
    playFallSound();
  }

  if (player.y > canvas.height + 140) {
    loseLife(currentLevel === 3 || currentLevel === 4
      ? t("Игрок умер в горячей картошке")
      : t("Игрок умер в облаках"));
    return;
  }

  if (hitRock()) {
    // if armor, consume it and bounce; otherwise lose life
    if (player.armorActive) {
      player.armorActive = false;
      player.vy = -7;
      playFallSound();
    } else {
      playRockSound();
      loseLife(t("Игрок умер от неизвестной штуки"));
      return;
    }
  }
}

function endGame(deathMessage = t("Игра окончена")) {
  gameOver = true;
  bestScore = Math.max(bestScore, score);
  localStorage.setItem("parkour-best-score", String(bestScore));
  bestScoreText.textContent = `${bestScore}`;
  message.hidden = false;
  message.querySelector("strong").textContent = deathMessage;
  message.querySelector("span").textContent = t("Нажми «Заново» или пробел");
}

function wrapX(x, width) {
  return ((x % width) + width) % width;
}

function drawDistantVillage(offset) {
  for (let i = 0; i < 9; i += 1) {
    const x = wrapX(i * 210 - offset, canvas.width + 260) - 120;
    const baseY = 306 + (i % 2) * 12;
    const houseWidth = 54 + (i % 3) * 10;

    ctx.fillStyle = i % 2 === 0 ? "#fff0c2" : "#f7d7a6";
    ctx.fillRect(x, baseY, houseWidth, 36);
    ctx.fillStyle = i % 2 === 0 ? "#d9554f" : "#8d5a3b";
    ctx.beginPath();
    ctx.moveTo(x - 7, baseY);
    ctx.lineTo(x + houseWidth / 2, baseY - 27);
    ctx.lineTo(x + houseWidth + 7, baseY);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#6aa0d8";
    ctx.fillRect(x + 12, baseY + 12, 12, 12);
    ctx.fillStyle = "#795548";
    ctx.fillRect(x + houseWidth - 18, baseY + 17, 10, 19);
  }
}

function drawFarTreeLine(offset) {
  for (let i = 0; i < 22; i += 1) {
    const x = wrapX(i * 76 - offset, canvas.width + 120) - 60;
    const y = 286 + (i % 4) * 8;

    ctx.fillStyle = "#6f8f67";
    ctx.fillRect(x + 8, y + 18, 8, 32);
    ctx.fillStyle = i % 2 === 0 ? "#7fa978" : "#8bb77e";
    ctx.beginPath();
    ctx.arc(x + 12, y + 12, 22, 0, Math.PI * 2);
    ctx.arc(x - 2, y + 23, 18, 0, Math.PI * 2);
    ctx.arc(x + 28, y + 24, 18, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMidground(offset) {
  ctx.fillStyle = "#76d765";
  for (let i = 0; i < 6; i += 1) {
    const x = wrapX(i * 260 - offset * 0.75, canvas.width + 360) - 180;
    ctx.beginPath();
    ctx.ellipse(x + 120, 430 + (i % 2) * 18, 180, 78, 0, Math.PI, 0);
    ctx.fill();
  }

  for (let i = 0; i < 12; i += 1) {
    const x = wrapX(i * 135 - offset, canvas.width + 180) - 90;
    const trunkY = 344 + (i % 3) * 18;
    const treeHeight = 84 + (i % 4) * 10;

    ctx.fillStyle = "#7a4f2e";
    ctx.fillRect(x + 20, trunkY, 16, treeHeight);
    ctx.fillStyle = i % 2 === 0 ? "#1fa85a" : "#2fc46a";
    ctx.beginPath();
    ctx.arc(x + 27, trunkY - 2, 34, 0, Math.PI * 2);
    ctx.arc(x + 4, trunkY + 22, 26, 0, Math.PI * 2);
    ctx.arc(x + 52, trunkY + 24, 28, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = "#2f4858";
  ctx.lineWidth = 3;
  for (let i = 0; i < 10; i += 1) {
    const x = wrapX(i * 150 - offset * 1.25, canvas.width + 200) - 100;
    const y = 120 + Math.sin(animationTime * 0.035 + i) * 16 + (i % 3) * 22;

    ctx.beginPath();
    ctx.arc(x, y, 10, Math.PI * 1.08, Math.PI * 1.82);
    ctx.arc(x + 20, y, 10, Math.PI * 1.18, Math.PI * 1.92);
    ctx.stroke();
  }
}

function updateCaveStalactites() {
  if (currentLevel !== 4) return;

  for (const stalactite of stalactites) {
    if (!stalactite.falling) continue;
    stalactite.vy += 0.12;
    stalactite.y += stalactite.vy + 1.4 + Math.random() * 0.7;

    const playerRight = player.x + player.width;
    const playerBottom = player.y + player.height;
    const stalRight = stalactite.x + stalactite.width;
    const stalBottom = stalactite.y + stalactite.height;
    const overlapsX = playerRight > stalactite.x + 4 && player.x < stalRight - 4;
    const overlapsY = playerBottom > stalactite.y + 2 && player.y < stalBottom - 2;

    if (overlapsX && overlapsY) {
      if (player.armorActive) {
        player.armorActive = false;
        player.vy = -7;
        playFallSound();
      } else {
        playRockSound();
        loseLife();
        return;
      }
    }

    if (stalactite.y > canvas.height + 120) {
      stalactite.falling = true;
      stalactite.y = 30 + Math.random() * 30;
      stalactite.vy = 0;
    }
  }
}

function drawBackground() {
  if (currentLevel === 4) {
    const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
    sky.addColorStop(0, "#0d1116");
    sky.addColorStop(0.3, "#1a232d");
    sky.addColorStop(1, "#0f1318");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(43, 57, 67, 0.9)";
    for (let i = 0; i < 14; i += 1) {
      const x = (i * 160) - (cameraX * 0.18 % 160);
      ctx.fillRect(x, 0, 120, canvas.height);
    }

    const lavaTop = canvas.height - lavaHeight;
    const lavaGrad = ctx.createLinearGradient(0, lavaTop, 0, canvas.height);
    lavaGrad.addColorStop(0, "#ff7a1a");
    lavaGrad.addColorStop(0.4, "#ff3d00");
    lavaGrad.addColorStop(1, "#420800");
    ctx.fillStyle = lavaGrad;
    ctx.fillRect(0, lavaTop, canvas.width, lavaHeight);

    ctx.globalAlpha = 0.2;
    ctx.fillStyle = "#fff4d8";
    for (let i = 0; i < 18; i += 1) {
      const x = (i * 130) - (animationTime * 0.7 % 130);
      const y = lavaTop + 22 + Math.sin(animationTime * 0.05 + i) * 5;
      ctx.beginPath();
      ctx.ellipse(x, y, 56, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (let i = 0; i < 5; i += 1) {
      const x = i * (canvas.width / 5) + (((cameraX * 0.28) % 140) - 80);
      const width = 34 + (i % 3) * 8;
      const height = 120 + (i % 4) * 18;
      const y = 18 + (i % 2) * 12;
      ctx.fillStyle = "rgba(18, 22, 26, 0.92)";
      ctx.beginPath();
      ctx.moveTo(x, y + height);
      ctx.lineTo(x + width / 2, y);
      ctx.lineTo(x + width, y + height);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(150, 170, 185, 0.18)";
      ctx.stroke();
    }

    const visibleStalactites = stalactites.filter((stalactite) => stalactite.x > cameraX - 200 && stalactite.x < cameraX + canvas.width + 200);
    for (const stalactite of visibleStalactites) {
      const x = stalactite.x - cameraX;
      const y = stalactite.y;
      const width = stalactite.width;
      const height = stalactite.height;
      ctx.fillStyle = "rgba(120, 77, 48, 0.98)";
      ctx.beginPath();
      ctx.moveTo(x, y + height);
      ctx.lineTo(x + width / 2, y);
      ctx.lineTo(x + width, y + height);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(198, 142, 94, 0.34)";
      ctx.fillRect(x + 5, y + 18, 5, height - 24);
    }

    ctx.fillStyle = "#170d0d";
    ctx.fillRect(0, lavaTop - 8, canvas.width, 8);
    return;
  }

  if (currentLevel === 3) {
    // grey sky
    const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
    sky.addColorStop(0, "#8e9498");
    sky.addColorStop(0.6, "#7a7f83");
    sky.addColorStop(1, "#6b6e71");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // distant dark mountains
    ctx.fillStyle = "#2b2d30";
    for (let i = -1; i < 6; i += 1) {
      const base = (i * 300) - (cameraX * 0.08 % 300);
      ctx.beginPath();
      ctx.moveTo(base - 120, 420);
      ctx.lineTo(base + 60, 220 - (i % 3) * 18);
      ctx.lineTo(base + 300, 420);
      ctx.closePath();
      ctx.fill();
    }

    // volcanoes with ash columns
    for (let v = 0; v < 3; v += 1) {
      const vx = 200 + v * 360 - (cameraX * 0.12 % 360);
      const peakY = 230 + (v % 2) * 10;
      ctx.fillStyle = "#1e1f22";
      ctx.beginPath();
      ctx.moveTo(vx - 120, 420);
      ctx.lineTo(vx, peakY);
      ctx.lineTo(vx + 120, 420);
      ctx.closePath();
      ctx.fill();

      // lava glow at peak
      ctx.fillStyle = "rgba(255,90,20,0.14)";
      ctx.beginPath();
      ctx.ellipse(vx, peakY + 6, 28, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // ash pillars
      ctx.fillStyle = "rgba(12,12,12,0.9)";
      for (let a = 0; a < 4; a += 1) {
        const ax = vx - 80 + a * 60;
        ctx.fillRect(ax - (animationTime * 0.06 % 6), 80 + (a % 2) * 8, 8, 160 + (a % 3) * 12);
      }
    }

    // lava layer at bottom
    const lavaTop = canvas.height - lavaHeight;
    const lavaGrad = ctx.createLinearGradient(0, lavaTop, 0, canvas.height);
    lavaGrad.addColorStop(0, "#ff6a1a");
    lavaGrad.addColorStop(0.5, "#ff2a00");
    lavaGrad.addColorStop(1, "#6b0b00");
    ctx.fillStyle = lavaGrad;
    ctx.fillRect(0, lavaTop, canvas.width, lavaHeight);

    // lava ripples
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#fff4c8";
    for (let i = 0; i < 16; i += 1) {
      const x = (i * 140) - (animationTime * 0.8 % 140);
      const y = lavaTop + 18 + Math.sin((animationTime * 0.025) + i) * 6;
      ctx.beginPath();
      ctx.ellipse(x, y, 60, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ground dark strip above lava area
    ctx.fillStyle = "#231f20";
    ctx.fillRect(0, lavaTop - 12, canvas.width, 12);

    return;
  }
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#61c8ff");
  sky.addColorStop(0.48, "#b8ecff");
  sky.addColorStop(1, "#f7ffd4");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const farOffset = cameraX * 0.12;
  const midOffset = cameraX * 0.36;

  ctx.fillStyle = "#ffe58a";
  ctx.beginPath();
  ctx.arc(86, 72, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255, 255, 255, 0.42)";
  ctx.beginPath();
  ctx.arc(75, 60, 9, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#a8c486";
  ctx.beginPath();
  ctx.ellipse(175, 350, 260, 90, 0, Math.PI, 0);
  ctx.ellipse(585, 344, 320, 110, 0, Math.PI, 0);
  ctx.ellipse(925, 360, 260, 82, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "rgba(83, 125, 76, 0.22)";
  for (let stripe = 0; stripe < 9; stripe += 1) {
    ctx.fillRect(stripe * 130 - (farOffset % 130), 336 + (stripe % 2) * 18, 80, 5);
  }

  drawFarTreeLine(farOffset);
  drawDistantVillage(farOffset * 0.85);

  ctx.fillStyle = "#d8c97b";
  for (let i = 0; i < 16; i += 1) {
    const x = wrapX(i * 92 - farOffset * 1.1, canvas.width + 120) - 60;
    ctx.fillRect(x, 340, 50, 70);
  }

  drawMidground(midOffset);

  ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
  for (let sparkle = 0; sparkle < 12; sparkle += 1) {
    const x = wrapX(sparkle * 91 - midOffset * 0.5, canvas.width + 80) - 40;
    const y = 388 + (sparkle % 4) * 19;
    ctx.fillRect(x, y, 4, 4);
  }

  ctx.fillStyle = "#4f8f45";
  ctx.fillRect(0, 500, canvas.width, 40);
}

function drawBlocks() {
  for (const block of blocks) {
    const x = block.x - cameraX;
    const colors = blockColors[block.color % blockColors.length];

    ctx.fillStyle = "rgba(8, 14, 10, 0.34)";
    ctx.fillRect(x + 7, block.y + 9, block.width, block.height);
    ctx.fillStyle = "#162417";
    ctx.fillRect(x - 2, block.y - 2, block.width + 4, block.height + 4);
    ctx.fillStyle = colors.base;
    ctx.fillRect(x, block.y, block.width, block.height);
    ctx.fillStyle = colors.top;
    ctx.fillRect(x, block.y, block.width, 12);
    ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
    ctx.fillRect(x + 5, block.y + 3, block.width - 10, 3);
    ctx.fillStyle = colors.shade;
    ctx.fillRect(x, block.y + block.height - 8, block.width, 8);
    ctx.fillStyle = "rgba(0, 0, 0, 0.16)";
    for (let tileX = x + 18; tileX < x + block.width - 12; tileX += 36) {
      ctx.fillRect(tileX, block.y + 17, 14, 4);
      ctx.fillRect(tileX + 8, block.y + block.height - 15, 18, 3);
    }
    ctx.strokeStyle = "#f5f7da";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, block.y + 1, block.width - 2, block.height - 2);
    ctx.strokeStyle = "rgba(9, 18, 12, 0.55)";
    ctx.strokeRect(x + 4, block.y + 4, block.width - 8, block.height - 8);
  }
}

function drawLadders() {
  for (const ladder of ladders) {
    const x = ladder.x - cameraX;
    const left = x + 8;
    const right = x + ladder.width - 8;

    ctx.strokeStyle = "#8b5a2b";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(left, ladder.y);
    ctx.lineTo(left, ladder.y + ladder.height);
    ctx.moveTo(right, ladder.y);
    ctx.lineTo(right, ladder.y + ladder.height);
    ctx.stroke();

    ctx.strokeStyle = "#d1a15f";
    ctx.lineWidth = 4;
    for (let y = ladder.y + 14; y < ladder.y + ladder.height - 4; y += 22) {
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
    }
  }
}

function drawRocks() {
  for (const rock of rocks) {
    const x = rock.x - cameraX;

    ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
    ctx.beginPath();
    ctx.ellipse(x + rock.width * 0.52, rock.y + rock.height + 4, rock.width * 0.55, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#202936";
    ctx.beginPath();
    ctx.moveTo(x + rock.width * 0.2 - 2, rock.y + rock.height + 2);
    ctx.lineTo(x + rock.width * 0.02, rock.y + rock.height * 0.48);
    ctx.lineTo(x + rock.width * 0.35, rock.y + rock.height * 0.02);
    ctx.lineTo(x + rock.width * 0.8, rock.y + rock.height * 0.12);
    ctx.lineTo(x + rock.width, rock.y + rock.height * 0.62);
    ctx.lineTo(x + rock.width * 0.72, rock.y + rock.height + 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#4b5563";
    ctx.beginPath();
    ctx.moveTo(x + rock.width * 0.2, rock.y + rock.height);
    ctx.lineTo(x + rock.width * 0.05, rock.y + rock.height * 0.48);
    ctx.lineTo(x + rock.width * 0.35, rock.y + rock.height * 0.08);
    ctx.lineTo(x + rock.width * 0.76, rock.y + rock.height * 0.18);
    ctx.lineTo(x + rock.width * 0.95, rock.y + rock.height * 0.62);
    ctx.lineTo(x + rock.width * 0.72, rock.y + rock.height);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#6b7280";
    ctx.beginPath();
    ctx.moveTo(x + rock.width * 0.35, rock.y + rock.height * 0.18);
    ctx.lineTo(x + rock.width * 0.7, rock.y + rock.height * 0.25);
    ctx.lineTo(x + rock.width * 0.46, rock.y + rock.height * 0.52);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#9ca3af";
    ctx.fillRect(x + rock.width * 0.28, rock.y + rock.height * 0.28, 5, 3);
    ctx.fillRect(x + rock.width * 0.58, rock.y + rock.height * 0.52, 7, 3);
  }
}

function drawCoins() {
  for (const coin of coins) {
    const x = coin.x - cameraX;
    const shine = Math.cos(coin.spin) * 3;
    coin.spin += 0.12;

    ctx.fillStyle = "rgba(0, 0, 0, 0.14)";
    ctx.beginPath();
    ctx.ellipse(x + 2, coin.y + 14, 10, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#7c4d08";
    ctx.beginPath();
    ctx.ellipse(x, coin.y, coin.radius + shine + 2, coin.radius + 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f6c84c";
    ctx.beginPath();
    ctx.ellipse(x, coin.y, coin.radius + shine, coin.radius, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#9a6a12";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#fff2a8";
    ctx.beginPath();
    ctx.arc(x - 4, coin.y - 4, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.fillRect(x - 2, coin.y - 8, 3, 13);
  }
}

function drawZombies() {
  for (const zombie of zombies) {
    const x = zombie.x - cameraX;
    const y = zombie.y;
    const wobble = Math.sin(zombie.walk) * (zombie.alive ? 2 : 6);
    const fallTilt = zombie.alive ? 0 : Math.min(1.3, zombie.vy * 0.08);
    const isTroll = zombie.kind === "troll";

    ctx.save();
    ctx.translate(x + zombie.width / 2, y + zombie.height / 2);
    ctx.rotate(fallTilt);
    ctx.scale(zombie.facing, 1);

    ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
    ctx.beginPath();
    ctx.ellipse(0, 27, 20, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    if (zombie.kind === "skeleton") {
      ctx.fillStyle = "#eee9cf";
      ctx.fillRect(-10, -23, 20, 17);
      ctx.fillRect(-7, -6, 14, 4);
      ctx.fillRect(-2, -3, 4, 22);
      for (let rib = 0; rib < 3; rib += 1) ctx.fillRect(-9, rib * 5, 18, 3);
      ctx.fillRect(-9, 16, 18, 4);
      ctx.fillRect(-9, 19, 4, 5 +  Math.sin(zombie.walk) * 2);
      ctx.fillRect(5, 19, 4, 5 - Math.sin(zombie.walk) * 2);
      ctx.fillRect(4, 1, 18, 4);
      ctx.fillStyle = "#241e27";
      ctx.fillRect(-7, -18, 5, 6);
      ctx.fillRect(3, -18, 5, 6);
      ctx.fillStyle = zombie.shotCooldown < 30 ? "#ff753e" : "#bd5039";
      ctx.fillRect(-5, -16, 2, 2);
      ctx.fillRect(5, -16, 2, 2);
      ctx.strokeStyle = "#c58e54";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(20, -17);
      ctx.quadraticCurveTo(38, 2, 20, 21);
      ctx.stroke();
      ctx.strokeStyle = "#eee9cf";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(20, -17);
      ctx.lineTo(zombie.shotCooldown < 30 ? 12 : 20, 2);
      ctx.lineTo(20, 21);
      ctx.stroke();
      ctx.restore();
      continue;
    }

    if (isTroll) {
      ctx.fillStyle = "#3a3d41";
      ctx.fillRect(-13, -26 + wobble, 26, 26);
      ctx.fillRect(-12, -3 + wobble, 24, 31);
      ctx.fillStyle = "#5d6066";
      ctx.fillRect(-10, -1 + wobble, 20, 27);
      ctx.fillStyle = "#8f9398";
      ctx.fillRect(-8, 1 + wobble, 8, 21);
      ctx.fillStyle = "#1e2023";
      ctx.fillRect(3, -1 + wobble, 7, 27);
      ctx.fillStyle = "#181b1e";
      ctx.fillRect(-10, 21 + wobble, 20, 5);

      ctx.fillStyle = "#4f5358";
      ctx.fillRect(-11, -24 + wobble, 22, 22);
      ctx.fillStyle = "#2a2d30";
      ctx.fillRect(4, -24 + wobble, 7, 22);
      ctx.fillStyle = "#d33f3f";
      ctx.fillRect(-7, -16 + wobble, 3, 3);
      ctx.fillRect(4, -16 + wobble, 3, 3);
      ctx.fillStyle = "#ff9a9a";
      ctx.fillRect(-6, -15 + wobble, 2, 2);
      ctx.fillRect(5, -15 + wobble, 2, 2);
      ctx.fillStyle = "#1d1f22";
      ctx.fillRect(4, -7 + wobble, 6, 2);
      ctx.fillStyle = "#3d4044";
      ctx.fillRect(-9, -2 + wobble, 18, 2);
    } else {
      ctx.fillStyle = "#10231d";
      ctx.fillRect(-13, -26 + wobble, 26, 26);
      ctx.fillRect(-12, -3 + wobble, 24, 31);

      ctx.fillStyle = "#2f6f4e";
      ctx.fillRect(-10, -1 + wobble, 20, 27);
      ctx.fillStyle = "#3c8760";
      ctx.fillRect(-8, 1 + wobble, 8, 21);
      ctx.fillStyle = "#254b3c";
      ctx.fillRect(3, -1 + wobble, 7, 27);
      ctx.fillStyle = "#172f2a";
      ctx.fillRect(-10, 21 + wobble, 20, 5);

      ctx.fillStyle = "#79a66b";
      ctx.fillRect(-11, -24 + wobble, 22, 22);
      ctx.fillStyle = "#4f7c55";
      ctx.fillRect(4, -24 + wobble, 7, 22);
      ctx.fillStyle = "#a1c98b";
      ctx.fillRect(-8, -21 + wobble, 7, 5);
      ctx.fillStyle = "#1b2f28";
      ctx.fillRect(-5, -16 + wobble, 4, 4);
      ctx.fillRect(4, -16 + wobble, 4, 4);
      ctx.fillStyle = "#d4ef8f";
      ctx.fillRect(-4, -15 + wobble, 2, 2);
      ctx.fillRect(5, -15 + wobble, 2, 2);
      ctx.fillStyle = "#24332d";
      ctx.fillRect(4, -7 + wobble, 6, 2);
      ctx.fillStyle = "#315444";
      ctx.fillRect(-9, -2 + wobble, 18, 2);
    }

    ctx.strokeStyle = isTroll ? "#272b2f" : "#18392c";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(-8, 5 + wobble);
    ctx.lineTo(-19, 17 + Math.sin(zombie.walk + 1) * 4);
    ctx.moveTo(8, 5 + wobble);
    ctx.lineTo(19, 15 + Math.sin(zombie.walk) * 4);
    ctx.stroke();
    ctx.strokeStyle = isTroll ? "#767b81" : "#6f9a61";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-8, 5 + wobble);
    ctx.lineTo(-19, 17 + Math.sin(zombie.walk + 1) * 4);
    ctx.moveTo(8, 5 + wobble);
    ctx.lineTo(19, 15 + Math.sin(zombie.walk) * 4);
    ctx.stroke();

    ctx.strokeStyle = isTroll ? "#0c1015" : "#0f1d38";
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(-5, 24 + wobble);
    ctx.lineTo(-8, 38 + Math.sin(zombie.walk) * 3);
    ctx.moveTo(5, 24 + wobble);
    ctx.lineTo(8, 38 + Math.sin(zombie.walk + Math.PI) * 3);
    ctx.stroke();
    ctx.strokeStyle = isTroll ? "#4f5358" : "#263f69";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-5, 24 + wobble);
    ctx.lineTo(-8, 38 + Math.sin(zombie.walk) * 3);
    ctx.moveTo(5, 24 + wobble);
    ctx.lineTo(8, 38 + Math.sin(zombie.walk + Math.PI) * 3);
    ctx.stroke();

    ctx.restore();
  }
}

function drawBats() {
  if (currentLevel !== 4) return;

  for (const bat of bats) {
    const x = bat.x - cameraX;
    const y = bat.y;
    const wingShift = Math.sin(bat.phase) * 10;

    ctx.save();
    ctx.translate(x + bat.width / 2, y + bat.height / 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
    ctx.beginPath();
    ctx.ellipse(0, 18, 18, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#1d1f24";
    ctx.beginPath();
    ctx.ellipse(-10, 2, 14, 6, -0.8 + wingShift * 0.02, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(10, 2, 14, 6, 0.8 - wingShift * 0.02, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#4d5057";
    ctx.beginPath();
    ctx.ellipse(0, 1, 12, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#101317";
    ctx.fillRect(-3, -2, 6, 7);
    ctx.fillStyle = "#ff4f4f";
    ctx.fillRect(-3, -1, 2, 2);
    ctx.fillRect(1, -1, 2, 2);

    ctx.restore();
  }
}

let enemyArrows = [];

function updateEnemyArrows() {
  for (let i = enemyArrows.length - 1; i >= 0; i -= 1) {
    const arrow = enemyArrows[i];
    arrow.x += arrow.vx;
    arrow.y += arrow.vy;
    arrow.ttl -= 1;
    const hits = rect => arrow.x + 4 > rect.x && arrow.x - 4 < rect.x + rect.width &&
      arrow.y + 3 > rect.y && arrow.y - 3 < rect.y + rect.height;
    if (arrow.ttl <= 0 || blocks.some(hits) || rocks.some(hits)) {
      enemyArrows.splice(i, 1);
      continue;
    }
    if (hits(player)) {
      enemyArrows.splice(i, 1);
      if (player.armorActive) {
        player.armorActive = false;
        playRockSound();
      } else {
        playRockSound();
        loseLife(t("Игрок погиб от стрелы скелета"));
        return;
      }
    }
  }
}

function drawEnemyArrows() {
  for (const arrow of enemyArrows) {
    ctx.save();
    ctx.translate(arrow.x - cameraX, arrow.y);
    ctx.rotate(Math.atan2(arrow.vy, arrow.vx));
    ctx.fillStyle = "#edc98e";
    ctx.fillRect(-19, -1, 23, 2);
    ctx.fillStyle = "#f2f3ed";
    ctx.beginPath();
    ctx.moveTo(5, 0);
    ctx.lineTo(-3, -4);
    ctx.lineTo(-3, 4);
    ctx.fill();
    ctx.fillStyle = "#e67048";
    ctx.fillRect(-19, -3, 5, 6);
    ctx.restore();
  }
}

// arrows for bow
let arrows = [];

function spawnArrow(startX, startY, dir) {
  arrows.push({ x: startX, y: startY, vx: dir * 14, radius: 5 });
}

function updateArrows() {
  for (let i = arrows.length - 1; i >= 0; i -= 1) {
    const a = arrows[i];
    a.x += a.vx;
    if (a.x < cameraX - 200 || a.x > cameraX + canvas.width + 200) {
      arrows.splice(i, 1);
      continue;
    }

    // collide with zombies
    for (let z = zombies.length - 1; z >= 0; z -= 1) {
      const zom = zombies[z];
      const zomRight = zom.x + zom.width;
      const zomBottom = zom.y + zom.height;
      const overlapsX = a.x > zom.x && a.x < zomRight;
      const overlapsY = a.y > zom.y && a.y < zomBottom;
      if (overlapsX && overlapsY) {
        arrows.splice(i, 1);
        zom.alive = false;
        zom.falling = true;
        zom.vy = -3;
        playZombieFallSound();
        break;
      }
    }

    // collide with bats
    for (let b = bats.length - 1; b >= 0; b -= 1) {
      const bat = bats[b];
      if (a.x > bat.x && a.x < bat.x + bat.width && a.y > bat.y && a.y < bat.y + bat.height) {
        arrows.splice(i, 1);
        bats.splice(b, 1);
        playZombieFallSound();
        break;
      }
    }
  }
}

function drawArrows() {
  for (const a of arrows) {
    const x = a.x - cameraX;
    const y = a.y;
    ctx.fillStyle = "#2b2b2b";
    ctx.fillRect(x - 8, y - 2, 16, 4);
  }
}

function drawFireballs() {
  if (currentLevel !== 3 && currentLevel !== 4) return;

  for (const fb of fireballs) {
    const x = fb.x - cameraX;
    const y = fb.y;
    const r = fb.radius;
    const grd = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 2);
    grd.addColorStop(0, "rgba(255,200,80,0.95)");
    grd.addColorStop(0.4, "rgba(255,120,40,0.85)");
    grd.addColorStop(1, "rgba(120,20,8,0.06)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ff6a00";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255,160,60,0.22)";
    ctx.beginPath();
    ctx.ellipse(x, y + r * 1.2, r * 0.9, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPortal() {
  if (!portal) {
    return;
  }

  const x = portal.x - cameraX;
  const y = portal.y;
  const size = portal.blockSize;
  const shimmer = 0.5 + Math.sin(animationTime * 0.12) * 0.5;

  ctx.fillStyle = `rgba(255, 87, 224, ${0.12 + shimmer * 0.08})`;
  ctx.fillRect(x - 18, y - 18, size * 3 + 36, size * 4 + 36);

  ctx.fillStyle = "#12071f";
  ctx.fillRect(x - 4, y - 4, size * 3 + 8, size * 4 + 8);
  ctx.fillStyle = "#26103f";
  for (let row = 0; row < 4; row += 1) {
    ctx.fillRect(x, y + row * size, size, size);
    ctx.fillRect(x + size * 2, y + row * size, size, size);
  }
  for (let col = 0; col < 3; col += 1) {
    ctx.fillRect(x + col * size, y, size, size);
  }
  ctx.fillStyle = "#4c1d95";
  for (let row = 0; row < 4; row += 1) {
    ctx.fillRect(x + 7, y + row * size + 7, size - 14, 8);
    ctx.fillRect(x + size * 2 + 7, y + row * size + 7, size - 14, 8);
  }

  ctx.fillStyle = `rgba(255, 87, 224, ${0.42 + shimmer * 0.22})`;
  ctx.fillRect(x + size + 5, y + size + 6, size - 10, size * 3 - 12);
  ctx.fillStyle = `rgba(255, 194, 252, ${0.28 + shimmer * 0.18})`;
  ctx.fillRect(x + size + 16, y + size + 18, size - 32, size * 3 - 36);

  ctx.strokeStyle = "#6d28d9";
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 1, y + 1, size * 3 - 2, size * 4 - 2);
}

function drawVictoryOverlay() {
  if (!victory) {
    return;
  }

  victoryScale = Math.min(1, victoryScale + 0.025);
  victoryFrames += 1;
  ctx.fillStyle = `rgba(10, 4, 18, ${0.22 + victoryScale * 0.28})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(victoryScale, victoryScale);
  ctx.font = "900 96px Inter, Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 8;
  ctx.strokeStyle = "#3b0764";
  ctx.strokeText(t("ПОБЕДА"), 0, 0);
  ctx.fillStyle = "#f0abfc";
  ctx.fillText(t("ПОБЕДА"), 0, 0);
  ctx.restore();
  // draw equipment overlays (outside player transform): armor / sword / bow
  const px = player.x - cameraX;
  const py = player.y;
  if (player.armorActive) {
    // silver chestplate
    ctx.fillStyle = "#dfe6e8";
    ctx.fillRect(px - 8, py + 2, player.width + 16, 16);
    ctx.strokeStyle = "#9ea6a8";
    ctx.lineWidth = 2;
    ctx.strokeRect(px - 8, py + 2, player.width + 16, 16);
    // helmet
    ctx.fillStyle = "#e7edf0";
    ctx.beginPath();
    ctx.arc(px + player.width / 2, py - 6, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#9ea6a8";
    ctx.stroke();
  }

  if (player.hasSword) {
    // blade
    ctx.fillStyle = "#d7dfe2";
    const sx = player.facing === 1 ? px + player.width + 6 : px - 22;
    const sy = py + 8;
    ctx.fillRect(sx, sy - 2, 18, 4);
    // hilt
    ctx.fillStyle = "#6b4b2b";
    ctx.fillRect(sx + (player.facing === 1 ? -2 : 18), sy + 2, 6, 3);
  }

  if (player.hasBow) {
    // bow body
    ctx.strokeStyle = "#7a4f2f";
    ctx.lineWidth = 3;
    const bx = player.facing === 1 ? px + player.width + 6 : px - 6;
    const by = py + 8;
    ctx.beginPath();
    ctx.moveTo(bx, by - 8);
    ctx.quadraticCurveTo(bx + (player.facing * 8), by, bx, by + 8);
    ctx.stroke();
    // string
    ctx.strokeStyle = "#ddd";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx + (player.facing === 1 ? 4 : -4), by - 8);
    ctx.lineTo(bx + (player.facing === 1 ? 4 : -4), by + 8);
    ctx.stroke();
  }
}

function drawPixelSteve(x, y, scale = 2.7) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.rotate(-0.35);

  ctx.fillStyle = "#244a91";
  ctx.fillRect(-6, 18, 7, 17);
  ctx.fillRect(4, 15, 7, 17);
  ctx.fillStyle = "#4fd3df";
  ctx.fillRect(-9, -2, 20, 22);
  ctx.fillStyle = "#00a8b8";
  ctx.fillRect(-18, 0, 8, 18);
  ctx.fillRect(12, -6, 8, 18);
  ctx.fillStyle = "#c68642";
  ctx.fillRect(-10, -24, 20, 20);
  ctx.fillStyle = "#6b3f22";
  ctx.fillRect(-10, -24, 20, 5);
  ctx.fillRect(-10, -19, 5, 6);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(4, -15, 4, 4);
  ctx.fillStyle = "#2c5aa8";
  ctx.fillRect(6, -14, 2, 2);

  ctx.restore();
}

function drawPixelZombie(x, y, scale = 2.7) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  ctx.fillStyle = "#263f69";
  ctx.fillRect(-8, 18, 7, 17);
  ctx.fillRect(3, 18, 7, 17);
  ctx.fillStyle = "#2f6f4e";
  ctx.fillRect(-10, -1, 20, 24);
  ctx.fillStyle = "#6f9a61";
  ctx.fillRect(-20, 0, 9, 18);
  ctx.fillRect(12, 0, 9, 18);
  ctx.fillStyle = "#79a66b";
  ctx.fillRect(-11, -24, 22, 22);
  ctx.fillStyle = "#1b2f28";
  ctx.fillRect(4, -16, 4, 4);
  ctx.fillStyle = "#24332d";
  ctx.fillRect(3, -7, 7, 2);

  ctx.restore();
}

function drawMenuOverlay() {
  if (screen !== "menu") {
    return;
  }

  ctx.fillStyle = "rgba(8, 16, 18, 0.58)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#f0f9ff";
  ctx.font = "900 58px Inter, Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.strokeStyle = "#1d3557";
  ctx.strokeText(t("ПАРК ПАРКУРА"), canvas.width / 2, 78);
  ctx.fillText(t("ПАРК ПАРКУРА"), canvas.width / 2, 78);

  const groundY = 365;
  ctx.fillStyle = "#5f8f42";
  ctx.fillRect(canvas.width / 2 - 250, groundY, 500, 34);
  ctx.fillStyle = "#8fd35d";
  ctx.fillRect(canvas.width / 2 - 250, groundY, 500, 10);

  drawPixelZombie(canvas.width / 2 + 80, groundY - 6, 3.2);
  drawPixelSteve(canvas.width / 2 - 90, groundY - 72 + Math.sin(animationTime * 0.08) * 7, 3.2);

  newGameButton.x = canvas.width / 2 - newGameButton.width / 2;
  newGameButton.y = 442;

  ctx.fillStyle = "#f4c95d";
  ctx.fillRect(newGameButton.x, newGameButton.y, newGameButton.width, newGameButton.height);
  ctx.strokeStyle = "#17202a";
  ctx.lineWidth = 4;
  ctx.strokeRect(newGameButton.x + 2, newGameButton.y + 2, newGameButton.width - 4, newGameButton.height - 4);
  ctx.fillStyle = "#17202a";
  ctx.font = "900 28px Inter, Segoe UI, sans-serif";
  ctx.fillText(t("НОВАЯ ИГРА"), canvas.width / 2, newGameButton.y + newGameButton.height / 2 + 1);
}

function getMapLayout() {
  const margin = 42;
  return {
    x: margin,
    y: margin,
    width: canvas.width - margin * 2,
    height: canvas.height - margin * 2,
  };
}

function getMapNodePositions() {
  const map = getMapLayout();
  const fallbackY = map.y + map.height / 2;
  const positions = {
    1: { x: map.x + map.width * 0.19, y: map.y + map.height * 0.66 },
    2: { x: map.x + map.width * 0.34, y: map.y + map.height * 0.43 },
    3: { x: map.x + map.width * 0.57, y: map.y + map.height * 0.35 },
    4: { x: map.x + map.width * 0.73, y: map.y + map.height * 0.58 },
  };

  return Object.keys(LEVEL_CONFIGS).map((level) => {
    const levelIndex = Number(level);
    const p = positions[levelIndex] || {
      x: map.x + map.width * (0.16 + levelIndex * 0.16),
      y: fallbackY,
    };
    return { ...p, levelIndex };
  });
}

function drawMapHouse(x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = "rgba(34, 58, 38, 0.22)";
  ctx.fillRect(-18, 18, 44, 8);
  ctx.fillStyle = "#f1d49b";
  ctx.fillRect(-18, -6, 36, 28);
  ctx.fillStyle = "#8c4a2f";
  ctx.beginPath();
  ctx.moveTo(-23, -5);
  ctx.lineTo(0, -24);
  ctx.lineTo(23, -5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#6d3b27";
  ctx.fillRect(-4, 6, 8, 16);
  ctx.fillStyle = "#7fc7d9";
  ctx.fillRect(-14, 2, 8, 8);
  ctx.fillRect(7, 2, 8, 8);
  ctx.restore();
}

function drawMapTree(x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = "#6b4a2f";
  ctx.fillRect(-4, -2, 8, 22);
  ctx.fillStyle = "#2d7b4e";
  ctx.beginPath();
  ctx.arc(0, -10, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#4aa766";
  ctx.beginPath();
  ctx.arc(-6, -15, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawMapCastle(x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = "#d8d6c7";
  ctx.fillRect(-28, -22, 56, 42);
  ctx.fillRect(-39, -36, 17, 56);
  ctx.fillRect(22, -36, 17, 56);
  ctx.fillStyle = "#898b91";
  for (const tx of [-39, -30, -21, 22, 31]) {
    ctx.fillRect(tx, -45, 8, 9);
  }
  ctx.fillRect(-24, -31, 8, 9);
  ctx.fillRect(-4, -31, 8, 9);
  ctx.fillRect(16, -31, 8, 9);
  ctx.fillStyle = "#513b35";
  ctx.fillRect(-8, 2, 16, 18);
  ctx.fillStyle = "#6ea5bd";
  ctx.fillRect(-30, -18, 8, 10);
  ctx.fillRect(22, -18, 8, 10);
  ctx.restore();
}

function drawMapOverlay() {
  if (screen !== "map") return;

  ctx.fillStyle = "rgba(6, 8, 10, 0.6)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const map = getMapLayout();
  const mapX = map.x;
  const mapY = map.y;
  const mapW = map.width;
  const mapH = map.height;

  ctx.fillStyle = "#c9e487";
  ctx.fillRect(mapX, mapY, mapW, mapH);
  ctx.strokeStyle = "#483d2d";
  ctx.lineWidth = 5;
  ctx.strokeRect(mapX + 2, mapY + 2, mapW - 4, mapH - 4);

  const lake = {
    x: mapX + mapW * 0.18,
    y: mapY + mapH * 0.22,
    rx: mapW * 0.16,
    ry: mapH * 0.17,
  };
  ctx.fillStyle = "#4aa5c7";
  ctx.beginPath();
  ctx.ellipse(lake.x, lake.y, lake.rx, lake.ry, -0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#78d8e7";
  ctx.beginPath();
  ctx.ellipse(lake.x - 24, lake.y - 16, lake.rx * 0.52, lake.ry * 0.35, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#6ea85f";
  ctx.beginPath();
  ctx.ellipse(lake.x + 18, lake.y + 8, lake.rx * 0.38, lake.ry * 0.32, 0.18, 0, Math.PI * 2);
  ctx.fill();
  drawMapCastle(lake.x + 18, lake.y + 8, 0.66);

  ctx.fillStyle = "#85c95c";
  ctx.beginPath();
  ctx.moveTo(mapX, mapY + mapH * 0.57);
  ctx.bezierCurveTo(mapX + mapW * 0.15, mapY + mapH * 0.48, mapX + mapW * 0.27, mapY + mapH * 0.58, mapX + mapW * 0.42, mapY + mapH * 0.44);
  ctx.lineTo(mapX + mapW * 0.47, mapY + mapH);
  ctx.lineTo(mapX, mapY + mapH);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#5daf55";
  ctx.beginPath();
  ctx.moveTo(mapX, mapY + mapH * 0.8);
  ctx.bezierCurveTo(mapX + mapW * 0.18, mapY + mapH * 0.65, mapX + mapW * 0.28, mapY + mapH * 0.86, mapX + mapW * 0.48, mapY + mapH * 0.68);
  ctx.lineTo(mapX + mapW * 0.5, mapY + mapH);
  ctx.lineTo(mapX, mapY + mapH);
  ctx.closePath();
  ctx.fill();

  drawMapHouse(mapX + mapW * 0.14, mapY + mapH * 0.56, 0.85);
  drawMapHouse(mapX + mapW * 0.27, mapY + mapH * 0.71, 0.72);
  drawMapHouse(mapX + mapW * 0.31, mapY + mapH * 0.33, 0.62);
  drawMapTree(mapX + mapW * 0.11, mapY + mapH * 0.74, 0.8);
  drawMapTree(mapX + mapW * 0.24, mapY + mapH * 0.52, 0.7);
  drawMapTree(mapX + mapW * 0.37, mapY + mapH * 0.63, 0.75);

  ctx.fillStyle = "#183423";
  ctx.fillRect(mapX + mapW * 0.72, mapY, mapW * 0.28, mapH);
  ctx.fillStyle = "#243b29";
  ctx.beginPath();
  ctx.moveTo(mapX + mapW * 0.72, mapY + mapH);
  ctx.lineTo(mapX + mapW * 0.85, mapY + mapH * 0.18);
  ctx.lineTo(mapX + mapW, mapY + mapH);
  ctx.closePath();
  ctx.fill();

  const mountainBaseX = mapX + mapW * 0.4;
  const mountainBaseY = mapY + mapH * 0.8;
  const mountainColors = ["#222832", "#2f3540", "#171b22", "#3c414b"];
  const mountains = [
    [mountainBaseX - 20, mountainBaseY, 116, 246, 0],
    [mountainBaseX + 72, mountainBaseY + 4, 148, 300, 1],
    [mountainBaseX + 188, mountainBaseY + 8, 118, 238, 2],
    [mountainBaseX + 284, mountainBaseY + 12, 152, 284, 3],
  ];

  for (const [x, y, width, height, colorIndex] of mountains) {
    ctx.fillStyle = mountainColors[colorIndex];
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width / 2, y - height);
    ctx.lineTo(x + width, y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
    ctx.beginPath();
    ctx.moveTo(x + width / 2, y - height);
    ctx.lineTo(x + width * 0.38, y - height * 0.72);
    ctx.lineTo(x + width * 0.52, y - height * 0.79);
    ctx.lineTo(x + width * 0.62, y - height * 0.7);
    ctx.closePath();
    ctx.fill();
  }

  const nodePositions = getMapNodePositions();

  ctx.strokeStyle = "#8c6d45";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  for (let i = 0; i < nodePositions.length; i += 1) {
    const p = nodePositions[i];
    if (i === 0) ctx.moveTo(p.x, p.y);
    else {
      const prev = nodePositions[i - 1];
      ctx.quadraticCurveTo((prev.x + p.x) / 2, Math.max(prev.y, p.y) + 46, p.x, p.y);
    }
  }
  ctx.stroke();
  ctx.lineCap = "butt";

  for (let i = 0; i < nodePositions.length; i += 1) {
    const p = nodePositions[i];
    const levelIndex = p.levelIndex;
    const unlocked = !!mapUnlocked[levelIndex];
    ctx.beginPath();
    ctx.fillStyle = "rgba(0, 0, 0, 0.24)";
    ctx.ellipse(p.x + 3, p.y + 8, 27, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = unlocked ? "#ffd166" : "#8f9692";
    ctx.arc(p.x, p.y, 23, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = levelIndex === 3 ? "#101820" : "#6b4f3a";
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = "#17202a";
    ctx.font = "900 18px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(levelIndex), p.x, p.y + 1);

    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#17202a";
    ctx.lineWidth = 4;
    ctx.lineJoin = "round";
    ctx.font = "900 17px Inter, sans-serif";
    ctx.textBaseline = "alphabetic";
    const label = t(levelNames[levelIndex]) || t(`Уровень ${levelIndex}`);
    const labelWidth = ctx.measureText(label).width;
    ctx.fillStyle = "rgba(10, 18, 30, 0.92)";
    ctx.fillRect(p.x - labelWidth / 2 - 10, p.y + 24, labelWidth + 20, 29);
    ctx.fillStyle = "#ffffff";
    ctx.strokeText(label, p.x, p.y + 44);
    ctx.fillText(label, p.x, p.y + 44);
    ctx.restore();
  }

  const selPos = nodePositions.find((p) => p.levelIndex === mapSelectedLevel) || nodePositions[0];
  const markerY = selPos.y - 34 + Math.sin(animationTime * 0.08) * 3;
  ctx.save();
  ctx.fillStyle = "#ffe66d";
  ctx.strokeStyle = "#17202a";
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(selPos.x - 10, markerY - 14);
  ctx.lineTo(selPos.x + 10, markerY - 14);
  ctx.lineTo(selPos.x, markerY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = "#17202a";
  ctx.font = "800 19px Inter, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(t("Выберите уровень:"), mapX + 12, mapY + 28);
  const name = t(levelNames[mapSelectedLevel]) || t(`Уровень ${mapSelectedLevel}`);
  ctx.save();
  ctx.font = "900 28px Inter, sans-serif";
  ctx.fillStyle = "#ffe66d";
  ctx.strokeStyle = "#17202a";
  ctx.lineWidth = 4;
  ctx.lineJoin = "round";
  ctx.strokeText(name, mapX + 12, mapY + 64);
  ctx.fillText(name, mapX + 12, mapY + 64);
  ctx.restore();

  ctx.font = "500 14px Inter, sans-serif";
  ctx.fillText(t("← → выбор, пробел или ввод — начать"), mapX + 12, mapY + mapH - 18);
}

function drawPlayer() {
  if (!player) {
    return;
  }

  const x = player.x - cameraX;
  const y = player.y;
  const fallAmount = Math.max(0, Math.min(1, (player.y - 470) / 140));
  const rotation = fallAmount * Math.PI;
  const speed = Math.min(1, Math.abs(player.vx) / maxRunSpeed);
  const stride = animationTime * (0.16 + speed * 0.18);
  const walkSwing = Math.sin(stride) * speed;
  const isAirborne = !player.grounded;
  const jumpPose = isAirborne ? Math.max(-1, Math.min(1, -player.vy / 18)) : 0;
  const headBob = player.grounded ? Math.abs(Math.sin(stride)) * speed * 2 : 0;
  const armSwing = isAirborne ? -0.55 - jumpPose * 0.25 : walkSwing * 0.85;
  const backArmSwing = isAirborne ? 0.45 + jumpPose * 0.18 : -walkSwing * 0.85;
  const frontLegSwing = isAirborne ? 0.45 - jumpPose * 0.2 : -walkSwing * 0.8;
  const backLegSwing = isAirborne ? -0.55 + jumpPose * 0.1 : walkSwing * 0.8;

  ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
  ctx.beginPath();
  ctx.ellipse(x + 17, y + 51, 22, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(x + player.width / 2, y + player.height / 2);
  ctx.rotate(rotation);
  ctx.scale(player.facing, 1);
  ctx.translate(0, -headBob);

  function drawLimb(originX, originY, width, height, angle, color, shade) {
    ctx.save();
    ctx.translate(originX, originY);
    ctx.rotate(angle);
    ctx.fillStyle = "#152033";
    ctx.fillRect(-width / 2 - 2, -2, width + 4, height + 4);
    ctx.fillStyle = shade;
    ctx.fillRect(-width / 2 + 2, 2, width, height);
    ctx.fillStyle = color;
    ctx.fillRect(-width / 2, 0, width, height);
    ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
    ctx.fillRect(-width / 2 + 2, 2, Math.max(2, width * 0.35), height - 5);
    ctx.restore();
  }

  drawLimb(-6, 4, 9, 22, backArmSwing, "#0096a8", "#006f83");
  drawLimb(6, 14, 10, 28, backLegSwing, "#244a91", "#18346b");

  ctx.fillStyle = "#102033";
  ctx.fillRect(-13, -6, 26, 32);
  ctx.fillStyle = "#4fd3df";
  ctx.fillRect(-10, -3, 20, 25);
  ctx.fillStyle = "#2299aa";
  ctx.fillRect(4, -3, 6, 25);
  ctx.fillStyle = "#9ff4f3";
  ctx.fillRect(-7, 0, 7, 17);
  ctx.fillStyle = "#2f6f9f";
  ctx.fillRect(-9, 18, 18, 8);
  ctx.fillStyle = "#1d426d";
  ctx.fillRect(-9, 24, 18, 4);

  drawLimb(6, 4, 9, 22, armSwing, "#00b6c7", "#007d90");
  drawLimb(-5, 14, 10, 28, frontLegSwing, "#2c5aa8", "#193b78");

  ctx.fillStyle = "#2a160c";
  ctx.fillRect(-13, -29, 26, 28);
  ctx.fillStyle = "#7a4b2a";
  ctx.fillRect(-11, -27, 22, 8);
  ctx.fillRect(-11, -27, 6, 23);

  ctx.fillStyle = "#c68642";
  ctx.fillRect(-10, -22, 20, 22);
  ctx.fillStyle = "#8d5524";
  ctx.fillRect(3, -22, 7, 22);
  ctx.fillStyle = "#6b3f22";
  ctx.fillRect(-10, -22, 20, 5);
  ctx.fillRect(-10, -17, 5, 7);
  ctx.fillStyle = "#e0a164";
  ctx.fillRect(-6, -14, 6, 7);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(4, -13, 4, 4);
  ctx.fillStyle = "#2c5aa8";
  ctx.fillRect(6, -12, 2, 2);
  ctx.fillStyle = "#6b3f22";
  ctx.fillRect(6, -5, 4, 2);
  ctx.fillStyle = "#4a2817";
  ctx.fillRect(-1, -7, 3, 2);

  ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
  ctx.fillRect(-8, -20, 5, 11);
  ctx.restore();
}

function spawnPoop() {
  poopParticles.push({
    x: player.x + player.width / 2,
    y: player.y + player.height * 0.7,
    vx: -player.facing * 3 + player.vx * 0.25,
    vy: -5,
    age: 0,
    rotation: 0,
  });
}

function updatePoopParticles() {
  for (const particle of poopParticles) {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += 0.22;
    particle.rotation += particle.vx * 0.035;
    particle.age += 1;
  }
  poopParticles = poopParticles.filter(particle => particle.age < 75);
}

function drawPoopParticles() {
  for (const particle of poopParticles) {
    ctx.save();
    ctx.translate(particle.x - cameraX, particle.y);
    ctx.rotate(particle.rotation);
    ctx.globalAlpha = Math.min(1, (75 - particle.age) / 20);
    ctx.fillStyle = "#854624";
    ctx.strokeStyle = "#4c2818";
    ctx.lineWidth = 2;
    for (const [x, y, rx, ry] of [[0, 6, 12, 6], [0, -1, 9, 5], [1, -7, 5, 4]]) {
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-6, -1, 4, 5);
    ctx.fillRect(3, -1, 4, 5);
    ctx.fillStyle = "#24160f";
    ctx.fillRect(-4, 1, 2, 2);
    ctx.fillRect(4, 1, 2, 2);
    ctx.beginPath();
    ctx.arc(0, 5, 3, 0, Math.PI);
    ctx.stroke();
    ctx.restore();
  }
}

function draw() {
  drawBackground();
  drawLadders();
  drawBlocks();
  drawPortal();
  drawRocks();
  drawCoins();
  drawChests();
  drawBats();
  drawZombies();
  drawFireballs();
  drawArrows();
  drawEnemyArrows();
  drawPlayer();
  drawPoopParticles();
  drawVictoryOverlay();
  drawMenuOverlay();
  drawMapOverlay();
}

function drawChests() {
  if (!chests || chests.length === 0) return;
  for (const chest of chests) {
    if (chest.opened) continue;
    const x = chest.x - cameraX;
    const y = chest.y;
    ctx.fillStyle = "#6b3f22";
    ctx.fillRect(x, y, chest.width, chest.height);
    ctx.fillStyle = "#d9b36b";
    ctx.fillRect(x + 6, y + 6, chest.width - 12, 6);
    ctx.strokeStyle = "#331a0a";
    ctx.strokeRect(x, y, chest.width, chest.height);
  }
}

function loop() {
  if (screen === "game" && !gameOver && !victory) {
    updatePoopParticles();
    updateFlyingPlatforms();
    updatePlayer();
    updateEnemyArrows();
    addMoreBlocks();
    updateFireballs();
    updateArrows();
  } else if (screen === "menu") {
    animationTime += 1;
  } else if (screen === "map") {
    animationTime += 1;
  } else if (screen === "victory") {
    animationTime += 1;
    if (victoryFrames > 180) {
      showMenu();
    }
  }

  deathNotification.hidden = screen !== "game" || Date.now() >= deathNotificationUntil;
  message.hidden = screen === "menu" || (started && !gameOver) || victory;
  draw();
  requestAnimationFrame(loop);
}

document.addEventListener("keydown", (event) => {
  if (event.target?.tagName === "SELECT") return;
  ensureAudio();
  const key = getKeyName(event);
  const code = event.code || "";
  keys.add(key);

  if (screen === "menu" && (key === " " || key === "Enter")) {
    event.preventDefault();
    showMap(false);
    return;
  }

  if ((screen === "victory" || victory) && (key === " " || key === "Enter")) {
    event.preventDefault();
    showMenu();
    return;
  }

  // Map navigation
  if (screen === "map") {
    const totalLevels = Object.keys(LEVEL_CONFIGS).length || 1;

    if (key === "ArrowLeft" || key === "a") {
      event.preventDefault();
      // move selection left
      mapSelectedLevel = Math.max(1, mapSelectedLevel - 1);
      return;
    }
    if (key === "ArrowRight" || key === "d") {
      event.preventDefault();
      mapSelectedLevel = Math.min(totalLevels, mapSelectedLevel + 1);
      return;
    }
    if (key === " " || key === "Enter") {
      event.preventDefault();
      if (mapUnlocked[mapSelectedLevel]) {
        loadLevel(mapSelectedLevel, { preserveStats: true });
      }
      return;
    }
  }

  if (screen !== "game") {
    return;
  }

  if (key === " ") {
    event.preventDefault();
    jumpHeld = true;
    if (!event.repeat) {
      jump();
    }
  }

  // Up / Jump: ArrowUp always jumps; W acts as melee when player has sword, otherwise jump
  if ((key === "ArrowUp" || ((key === "w" || code === "KeyW") && !player.hasSword)) && !isOnLadder()) {
    event.preventDefault();
    jumpHeld = true;
    if (!event.repeat) {
      jump();
    }
  }

  // Melee with sword on W when not on ladder
  if ((key === "w" || code === "KeyW") && player.hasSword && !isOnLadder()) {
    event.preventDefault();
    if (!event.repeat) {
      // perform melee: destroy first enemy within one player width in front
      const frontX = player.facing === 1 ? player.x + player.width : player.x - player.width;
      // check zombies
      for (let z = zombies.length - 1; z >= 0; z -= 1) {
        const zom = zombies[z];
        const zomRight = zom.x + zom.width;
        const overlapsX = player.facing === 1 ? zom.x <= frontX && zom.x + zom.width >= player.x + player.width : zomRight >= frontX && zom.x <= player.x;
        const overlapsY = player.y + player.height > zom.y + 4 && player.y < zom.y + zom.height - 4;
        if (overlapsX && overlapsY) {
          zom.alive = false;
          zom.falling = true;
          zom.vy = -4;
          playZombieFallSound();
          break;
        }
      }
      // check bats
      for (let b = bats.length - 1; b >= 0; b -= 1) {
        const bat = bats[b];
        const batRight = bat.x + bat.width;
        const overlapsX = player.facing === 1 ? bat.x <= frontX && batRight >= player.x + player.width : batRight >= frontX && bat.x <= player.x;
        const overlapsY = player.y + player.height > bat.y + 2 && player.y < bat.y + bat.height - 2;
        if (overlapsX && overlapsY) {
          bats.splice(b, 1);
          playZombieFallSound();
          break;
        }
      }
    }
  }

  // Bow: press E to shoot if player has bow
  if ((key === "e" || code === "KeyE") && player.hasBow) {
    event.preventDefault();
    if (!event.repeat) {
      const startX = player.facing === 1 ? player.x + player.width + 6 : player.x - 6;
      const startY = player.y + player.height / 2;
      spawnArrow(startX, startY, player.facing);
    }
  }

  if ((key === "ArrowUp" || key === "ArrowDown" || key === "w" || key === "s" || code === "KeyW" || code === "KeyS") && isOnLadder()) {
    event.preventDefault();
    started = true;
  }

  if (key === "r" && !event.repeat) {
    removeMode = !removeMode;
    updateToolText();
  }
});

document.addEventListener("keyup", (event) => {
  const key = getKeyName(event);
  const code = event.code || "";
  keys.delete(key);

  if ([" ", "ArrowUp"].includes(key) || ((key === "w" || code === "KeyW") && !player.hasSword)) {
    jumpHeld = false;

    if (player && player.vy < 0 && !isOnLadder()) {
      player.vy *= jumpCutMultiplier;
      player.jumpHold = 0;
    }
  }
});

restartButton.addEventListener("click", resetGame);

toolButton.addEventListener("click", () => {
  removeMode = !removeMode;
  updateToolText();
});

musicButton.addEventListener("click", toggleMusic);

canvas.addEventListener("click", (event) => {
  ensureAudio();
  if (screen === "menu") {
    const point = getWorldPoint(event.clientX, event.clientY);
    const clickedNewGame =
      point.x >= newGameButton.x &&
      point.x <= newGameButton.x + newGameButton.width &&
      point.y >= newGameButton.y &&
      point.y <= newGameButton.y + newGameButton.height;

    if (clickedNewGame) {
      showMap(false);
    }
    return;
  }
  // map click handling: select node or start
  if (screen === "map") {
    const point = getWorldPoint(event.clientX, event.clientY);
    for (const node of getMapNodePositions()) {
      const dx = point.x - node.x;
      const dy = point.y - node.y;
      if (dx * dx + dy * dy < 28 * 28) {
        const levelIndex = node.levelIndex;
        mapSelectedLevel = levelIndex;
        if (mapUnlocked[levelIndex]) {
          loadLevel(levelIndex, { preserveStats: true });
        }
        return;
      }
    }
    return;
  }

  useTool(event.clientX, event.clientY);
});

canvas.addEventListener("touchstart", (event) => {
  event.preventDefault();
  ensureAudio();
  const touch = event.touches[0];
  if (screen === "menu") {
    const point = getWorldPoint(touch.clientX, touch.clientY);
    const touchedNewGame =
      point.x >= newGameButton.x &&
      point.x <= newGameButton.x + newGameButton.width &&
      point.y >= newGameButton.y &&
      point.y <= newGameButton.y + newGameButton.height;

    if (touchedNewGame) {
      showMap(false);
    }
    return;
  }
  if (screen === "map") {
    const point = getWorldPoint(touch.clientX, touch.clientY);
    for (const node of getMapNodePositions()) {
      const dx = point.x - node.x;
      const dy = point.y - node.y;
      if (dx * dx + dy * dy < 28 * 28) {
        const levelIndex = node.levelIndex;
        mapSelectedLevel = levelIndex;
        if (mapUnlocked[levelIndex]) {
          loadLevel(levelIndex, { preserveStats: true });
        }
        return;
      }
    }
    return;
  }

  useTool(touch.clientX, touch.clientY);
});

document.getElementById("language-select").addEventListener("change", (event) => {
  language = event.target.value === "en" ? "en" : "ru";
  localStorage.setItem("parkour-language", language);
  keys.clear();
  applyLanguage();
});

showMenu();
loop();
