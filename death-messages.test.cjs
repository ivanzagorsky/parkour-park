const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');

function createGame() {
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      width: 960, height: 540, hidden: true, textContent: '',
      getContext: () => ({}), addEventListener() {},
      querySelector: selector => element(`${id} ${selector}`),
    });
    return elements.get(id);
  }
  const context = vm.createContext({
    document: { getElementById: element, addEventListener() {} },
    localStorage: { getItem: () => null, setItem() {} },
  });
  const source = readFileSync(`${__dirname}/script.js`, 'utf8');
  // Skip browser startup; exercise the actual update and death functions.
  vm.runInContext(source.replace(/showMenu\(\);\s*loop\(\);\s*$/, ''), context);
  vm.runInContext(`
    playFallSound = () => {};
    isOnLadder = () => null;
    collectCoins = updateZombies = updateBats = updateCaveStalactites = () => {};
    hitPortal = hitRock = () => false;
    player = { x: 100, y: 700, width: 30, height: 50, vx: 0, vy: 5 };
  `, context);
  return { context, element, run: code => vm.runInContext(code, context) };
}

for (const level of [1, 2, 3, 4]) {
  for (const initialLives of [3, 1]) {
    test(`Level ${level}, ${initialLives} lives: fall and death message`, () => {
      const game = createGame();
      game.run(`currentLevel = ${level}; lives = ${initialLives}; updatePlayer();`);
      const expected = level >= 3 ? 'Игрок умер в горячей картошке' : 'Игрок умер в облаках';
      assert.equal(game.element('death-notification').textContent, expected);
      assert.equal(game.element('death-notification').hidden, false);
      assert.equal(game.element('message strong').textContent, expected);
      assert.equal(game.run('lives'), initialLives - 1);
      assert.equal(game.run('gameOver'), initialLives === 1);
      assert.ok(game.run('deathNotificationUntil > Date.now()'));
      if (initialLives > 1) {
        assert.ok(game.run('player.y < canvas.height'));
        game.run('updatePlayer()');
        assert.equal(game.run('lives'), initialLives - 1);
      }
    });
  }
}
