const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');

function game(savedLanguage = null) {
  const elements = new Map();
  const saved = new Map([['parkour-language', savedLanguage]]);
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      textContent: '', handlers: {},
      getContext: () => ({}),
      addEventListener(name, handler) { this.handlers[name] = handler; },
      querySelector: selector => element(`${id} ${selector}`),
    });
    return elements.get(id);
  }
  const document = {
    documentElement: {}, getElementById: element,
    querySelectorAll: () => [], addEventListener() {},
  };
  const context = vm.createContext({ document, localStorage: {
    getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value),
  }});
  vm.runInContext(readFileSync(`${__dirname}/script.js`, 'utf8').replace(/showMenu\(\);\s*loop\(\);\s*$/, ''), context);
  return { element, saved, document, run: code => vm.runInContext(code, context) };
}

test('switch language during play and translate existing messages without resetting progress', () => {
  const g = game();
  g.run('lives = 2; coinsCollected = 17; score = 120;');
  g.element('coins').textContent = 'Монеты: 17';
  g.element('message strong').textContent = 'Игрок умер в облаках';
  g.element('message span').textContent = 'Осталось жизней: 2';
  const change = g.element('language-select').handlers.change;
  change({ target: { value: 'en' } });
  assert.equal(g.element('coins').textContent, 'Coins: 17');
  assert.equal(g.element('message strong').textContent, 'You died in the clouds');
  assert.equal(g.element('message span').textContent, 'Lives left: 2');
  assert.equal(g.run('t(levelNames[4])'), 'Dark Caves');
  assert.equal(g.document.documentElement.lang, 'en');
  assert.equal(g.saved.get('parkour-language'), 'en');
  assert.equal(g.run('score'), 120);
  assert.equal(g.run('lives'), 2);
  change({ target: { value: 'ru' } });
  assert.equal(g.element('coins').textContent, 'Монеты: 17');
  assert.equal(g.element('message span').textContent, 'Осталось жизней: 2');
  assert.equal(g.run('t(levelNames[4])'), 'Темные пещеры');
});

test('restores English and translates new status updates', () => {
  const g = game('en');
  g.run('lives = 3; updateLivesText();');
  assert.equal(g.element('lives').textContent, 'Lives: 3');
  assert.equal(g.run('t("НОВАЯ ИГРА")'), 'NEW GAME');
  assert.equal(game('unknown').run('language'), 'ru');
});
