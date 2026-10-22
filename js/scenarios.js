/* The scenarios. Each one is a tiny program plus the picture it drives.

   vars:       the memory boxes. role 'input' can be changed by students,
               'calc' and 'output' are only ever set by the program.
   code(B):    builds the program (see TT.B in engine.js). Parts given a ref
               name can be checked by the challenges.
   presets:    one-click situations. run: true also runs the program.
   challenges: check(c) gets { before, after, main, refs, crashed } after
               each run; main is which part of the main IF ran
               (0 = IF, 1 = first ELSE IF, ..., 'else', or 'none').

   The Dig Site (kind: 'dig') is different: its program runs every frame
   inside a 3D world (dig.js), and its challenges are checked each time a
   block is mined, with { block, distance, vals, refs }. */
(function () {
  'use strict';
  const TT = window.TT;

  TT.scenarios = [
    /* 1 ------------------------------------------------------------------ */
    {
      id: 'door',
      title: 'The Locked Door',
      concepts: ['OR', 'ELSE IF', 'Comparison'],
      vars: [
        { name: 'hasKey', type: 'bool', init: false },
        { name: 'hasLockpick', type: 'bool', init: false },
        { name: 'strength', type: 'num', init: 50, min: 0, max: 100, step: 5 },
        { name: 'door', type: 'str', init: 'closed', role: 'output' },
      ],
      code: B => [
        B.iff([
          [B.or(B.v('hasKey'), B.v('hasLockpick'), 'logic'), [B.set('door', B.str('open')), B.out('The door creaks open.', 'open')]],
          [B.cmp(B.v('strength'), '>', B.num(80, 'need'), 'cmp'), [B.set('door', B.str('smashed')), B.out('CRASH! You smashed it.', 'smash')]],
        ], [B.set('door', B.str('locked')), B.out('It will not budge.', 'locked')], { main: true }),
      ],
      presets: [
        { label: 'Has the key', set: { hasKey: true, hasLockpick: false, strength: 50, door: 'closed' } },
        { label: 'Has a lockpick', set: { hasKey: false, hasLockpick: true, strength: 50, door: 'closed' } },
        { label: 'Super strong, no tools', set: { hasKey: false, hasLockpick: false, strength: 95, door: 'closed' } },
        { label: 'Key and super strong', set: { hasKey: true, hasLockpick: false, strength: 95, door: 'closed' } },
        { label: 'Nothing', set: { hasKey: false, hasLockpick: false, strength: 30, door: 'closed' } },
      ],
      challenges: [
        { text: 'Open the door without the key.', check: c => c.main === 0 && !c.before.hasKey },
        { text: 'Smash the door.', check: c => c.main === 1 },
        { text: 'Run it with the key and 100 strength.', check: c => c.before.hasKey && c.before.strength >= 100 && c.main === 0 },
        { text: 'Change > to ≥, then smash the door with exactly 80 strength.', check: c => c.refs.cmp.op === '>=' && c.before.strength === 80 && c.main === 1 },
      ],
    },

    /* 2 ------------------------------------------------------------------ */
    {
      id: 'shield',
      title: 'Power-Up Shield',
      concepts: ['NOT', 'AND', 'ELSE IF'],
      vars: [
        { name: 'touchingEnemy', type: 'bool', init: true },
        { name: 'shieldOn', type: 'bool', init: false },
        { name: 'health', type: 'num', init: 3, min: 0, max: 5, step: 1 },
        { name: 'score', type: 'num', init: 0, min: 0, max: 5000, step: 100 },
      ],
      code: B => [
        B.iff([
          [B.and(B.v('touchingEnemy'), B.not(B.v('shieldOn'), 'not')), [B.set('health', B.math(B.v('health'), '-', 1)), B.out('Ouch!', 'ouch')]],
          [B.and(B.v('touchingEnemy'), B.v('shieldOn')), [B.set('score', B.math(B.v('score'), '+', 100)), B.out('Bounced off the shield!', 'bounce')]],
        ], [B.out('Safe.', 'safe')], { main: true }),
      ],
      presets: [
        { label: 'Drone hits you', set: { touchingEnemy: true, shieldOn: false } },
        { label: 'Drone hits your shield', set: { touchingEnemy: true, shieldOn: true } },
        { label: 'Nothing nearby', set: { touchingEnemy: false, shieldOn: false } },
        { label: 'Reset health and score', set: { health: 3, score: 0 } },
      ],
      challenges: [
        { text: 'Bounce the drone off the shield.', check: c => c.main === 1 },
        { text: 'Turn off NOT, then get hurt with the shield on.', check: c => !c.refs.not.on && c.before.shieldOn && c.before.touchingEnemy && c.main === 0 },
        { text: 'Score 500.', check: c => c.after.score >= 500 },
      ],
    },

    /* 3 ------------------------------------------------------------------ */
    {
      id: 'shop',
      title: 'The Item Shop',
      concepts: ['AND', 'Comparison', 'Math', 'ELSE IF'],
      vars: [
        { name: 'gold', type: 'num', init: 100, min: 0, max: 999, step: 5 },
        { name: 'price', type: 'num', init: 25, min: 0, max: 999, step: 5 },
        { name: 'items', type: 'num', init: 2, min: 0, max: 10, step: 1 },
        { name: 'bagSize', type: 'num', init: 4, min: 1, max: 10, step: 1 },
      ],
      code: B => [
        B.iff([
          [B.and(B.cmp(B.v('gold'), '>=', B.v('price'), 'cmp'), B.cmp(B.v('items'), '<', B.v('bagSize'))), [
            B.set('gold', B.math(B.v('gold'), '-', B.v('price'))),
            B.set('items', B.math(B.v('items'), '+', 1)),
            B.out('Thanks for your purchase!', 'buy'),
          ]],
          [B.cmp(B.v('gold'), '<', B.v('price')), [B.out('You need more gold.', 'poor')]],
        ], [B.out('Your bag is full!', 'full')], { main: true }),
      ],
      presets: [
        { label: 'Buy a potion (25)', set: { price: 25 }, run: true },
        { label: 'Buy a shield (80)', set: { price: 80 }, run: true },
        { label: 'Buy a laser sword (150)', set: { price: 150 }, run: true },
        { label: '200 gold, empty bag', set: { gold: 200, items: 0 } },
      ],
      challenges: [
        { text: 'Buy the laser sword.', check: c => c.main === 0 && c.before.price === 150 },
        { text: 'Get "Your bag is full!"', check: c => c.main === 'else' },
        { text: 'Spend down to exactly 0 gold.', check: c => c.main === 0 && c.after.gold === 0 },
        { text: 'Change ≥ to >, then try to buy with exactly enough gold.', check: c => c.refs.cmp.op === '>' && c.before.gold === c.before.price && c.main !== 0 },
      ],
    },

    /* 4 ------------------------------------------------------------------ */
    {
      id: 'dig',
      kind: 'dig',
      title: 'The Dig Site',
      concepts: ['Every frame', 'Variables', 'Math', 'AND', 'NOT', 'ELSE IF'],
      vars: [
        { name: 'reach', type: 'num', init: 4.5, min: 1, max: 12, step: 0.5, slider: true, unit: 'meters' },
        { name: 'digTime', type: 'num', init: 1, min: 0, max: 5, step: 0.1, slider: true, unit: 'seconds' },
        { name: 'distance', type: 'num', init: 0, role: 'calc', unit: 'meters' },
        { name: 'isBedrock', type: 'bool', init: false, role: 'calc' },
        { name: 'holdTime', type: 'num', init: 0, role: 'calc', unit: 'seconds' },
      ],
      code: B => [
        B.iff([
          [B.and(B.cmp(B.v('distance'), '<=', B.v('reach'), 'reachCmp'), B.not(B.v('isBedrock'), 'not'), 'logic'), [
            B.iff([[B.cmp(B.v('holdTime'), '>=', B.v('digTime'), 'doneCmp'), [B.out('Block mined!', 'mine')]]], null),
          ]],
          [B.v('isBedrock'), [B.out('Bedrock cannot be mined.', 'bedrock')]],
        ], [B.out('Too far away!', 'far')], { main: true }),
      ],
      challenges: [
        { text: 'Mine a block.', check: e => true },
        { text: 'Mine a diamond.', check: e => e.block === 'diamond ore' },
        { text: 'Mine a block with reach 2 meters or less.', check: e => e.vals.reach <= 2 },
        { text: 'Mine a block more than 8 meters away.', check: e => e.distance > 8 },
        { text: 'Mine a block with digTime 0.', check: e => e.vals.digTime === 0 },
        { text: 'Change AND to OR, then mine bedrock.', check: e => e.refs.logic.op === 'OR' && e.block === 'bedrock' },
      ],
    },
  ];

  TT.scenarios.forEach((s, i) => { s.num = i + 1; s.scene = s.kind === 'dig' ? TT.scenes.digThumb : TT.scenes[s.id]; });
})();
