const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function game() {
  const element = { width: 960, height: 540, getContext: () => ({}), addEventListener() {}, classList: { toggle() {} }, setAttribute() {}, querySelector() { return this; } };
  const context = vm.createContext({ document: { getElementById: () => element, addEventListener() {} }, localStorage: { getItem() {}, setItem() {} } });
  vm.runInContext(fs.readFileSync(`${__dirname}/script.js`, 'utf8').replace(/showMenu\(\);\s*loop\(\);\s*$/, ''), context);
  const run = code => vm.runInContext(code, context);
  run('playRockSound = playZombieFallSound = () => {}; loadLevel(3);');
  return run;
}
test('Level three has archers, rocks, moving platforms and connected ladders', () => {
  const run = game();
  assert.ok(run('zombies.every(z => z.kind === "skeleton") && rocks.length >= 2'));
  assert.ok(run('ladders.filter(l => l.upperBlock.floatBaseY !== undefined).length === 2'));
  run('const moving = blocks.find(b => b.floatBaseY !== undefined); player.x = moving.x + 30; player.y = moving.y - player.height; player.grounded = true; animationTime = 50; updateFlyingPlatforms();');
  assert.ok(run('Math.abs(player.y + player.height - moving.y) < 0.001'));
  assert.ok(run('ladders.find(l => l.upperBlock === moving).y === moving.y'));
});
test('Archers aim, arrows hurt, armor absorbs a hit and restart clears shots', () => {
  const run = game();
  run('started = true; const archer = zombies[0]; player.x = archer.x - 200; player.y = archer.y; archer.shotCooldown = 1; updateZombies(player.y + player.height);');
  assert.ok(run('enemyArrows.length === 1 && enemyArrows[0].vx < 0'));
  run('player.y = 100; enemyArrows = [{ x: player.x + 15, y: player.y + 15, vx: 0, vy: 0, ttl: 10 }]; player.armorActive = true; updateEnemyArrows();');
  assert.ok(run('lives === 3 && !player.armorActive && enemyArrows.length === 0'));
  run('player.y = 100; enemyArrows = [{ x: player.x + 15, y: player.y + 15, vx: 0, vy: 0, ttl: 10 }]; updateEnemyArrows();');
  assert.equal(run('lives'), 2);
  run('enemyArrows.push({}); loadLevel(2);');
  assert.ok(run('enemyArrows.length === 0 && zombies.every(z => z.kind === "zombie")'));
});
test('Rocks block enemy arrows and defeated archers cannot shoot', () => {
  const run = game();
  run('enemyArrows = [{ x: rocks[0].x + 10, y: rocks[0].y + 10, vx: 0, vy: 0, ttl: 10 }]; updateEnemyArrows();');
  assert.equal(run('enemyArrows.length'), 0);
  run('started = true; zombies.forEach(z => { z.alive = false; z.shotCooldown = 0; }); updateZombies(0);');
  assert.equal(run('enemyArrows.length'), 0);
});
