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
   block is mined, with { block, distance, vals, refs, holdCount }. */
(function () {
  'use strict';
  const TT = window.TT;

  TT.scenarios = [
    /* 1 ------------------------------------------------------------------ */
    {
      id: 'door',
      title: 'The Locked Door',
      concepts: ['OR', 'ELSE IF', 'Comparison'],
      blurb: 'A key OR a lockpick opens the vault. No tools? Maybe you are strong enough to smash it.',
      story: 'A heavy vault door blocks the way. Having a key OR a lockpick opens it. With neither, a strong enough hero can smash it down. Only ONE part of an IF / ELSE IF / ELSE ever runs: the first one that is TRUE.',
      vars: [
        { name: 'hasKey', type: 'bool', init: false, hint: 'is there a key in the bag?' },
        { name: 'hasLockpick', type: 'bool', init: false, hint: 'is there a lockpick in the bag?' },
        { name: 'strength', type: 'num', init: 50, min: 0, max: 100, step: 5, hint: 'how strong the hero is' },
        { name: 'door', type: 'str', init: 'closed', role: 'output', hint: 'set by the code' },
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
        { label: 'Key AND super strong', set: { hasKey: true, hasLockpick: false, strength: 95, door: 'closed' } },
        { label: 'Nothing at all', set: { hasKey: false, hasLockpick: false, strength: 30, door: 'closed' } },
      ],
      challenges: [
        { text: 'Open the door WITHOUT the key.', check: c => c.main === 0 && !c.before.hasKey },
        { text: 'Smash the door down.', check: c => c.main === 1 },
        { text: 'Give the hero the key AND 100 strength. Predict which part runs, then run it.', check: c => c.before.hasKey && c.before.strength >= 100 && c.main === 0 },
        { text: 'Change > to ≥ and smash the door with exactly 80 strength.', check: c => c.refs.cmp.op === '>=' && c.before.strength === 80 && c.main === 1 },
      ],
      think: [
        'When the hero has a key AND is super strong, why is the door opened and not smashed?',
        'How many rows of the truth table for <code>hasKey OR hasLockpick</code> open the door?',
        'What would change if the strength check came first?',
      ],
    },

    /* 2 ------------------------------------------------------------------ */
    {
      id: 'shield',
      title: 'Power-Up Shield',
      concepts: ['NOT', 'AND', 'ELSE IF'],
      blurb: 'The drone hurts you only when the shield is NOT on.',
      story: 'While the shield power-up is on, the drone cannot hurt the hero — it bounces off for bonus points. NOT flips a value: NOT TRUE is FALSE, and NOT FALSE is TRUE.',
      vars: [
        { name: 'touchingEnemy', type: 'bool', init: true, hint: 'is the drone touching the hero?' },
        { name: 'shieldOn', type: 'bool', init: false, hint: 'is the power-up shield active?' },
        { name: 'health', type: 'num', init: 3, min: 0, max: 5, step: 1, hint: 'hearts left' },
        { name: 'score', type: 'num', init: 0, min: 0, max: 5000, step: 100, hint: 'points' },
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
        { label: 'Full health again', set: { health: 3, score: 0 } },
      ],
      challenges: [
        { text: 'Bounce the drone off the shield.', check: c => c.main === 1 },
        { text: 'Click the NOT block to turn it off. Now get hurt WHILE the shield is on. Why?', check: c => !c.refs.not.on && c.before.shieldOn && c.before.touchingEnemy && c.main === 0 },
        { text: 'Score 500 points.', check: c => c.after.score >= 500 },
      ],
      think: [
        'Say <code>touchingEnemy AND NOT shieldOn</code> as a normal English sentence.',
        'If <code>shieldOn</code> is FALSE, what is <code>NOT shieldOn</code>?',
        'Could the ELSE IF be written using NOT instead? Is there a shorter way to write it?',
      ],
    },

    /* 3 ------------------------------------------------------------------ */
    {
      id: 'shop',
      title: 'The Item Shop',
      concepts: ['AND', 'Comparison', 'Math', 'ELSE IF'],
      blurb: 'Buy only if you have enough gold AND room in your bag.',
      story: 'The robot vendor will sell you an item if you have enough gold AND there is room in your bag. If not, it tells you which problem you have.',
      vars: [
        { name: 'gold', type: 'num', init: 100, min: 0, max: 999, step: 5, hint: 'gold in your pouch' },
        { name: 'price', type: 'num', init: 25, min: 0, max: 999, step: 5, hint: 'cost of the item' },
        { name: 'items', type: 'num', init: 2, min: 0, max: 10, step: 1, hint: 'things in your bag' },
        { name: 'bagSize', type: 'num', init: 4, min: 1, max: 10, step: 1, hint: 'how many things fit' },
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
        { label: 'Payday: 200 gold, empty bag', set: { gold: 200, items: 0 } },
      ],
      challenges: [
        { text: 'Buy the laser sword.', check: c => c.main === 0 && c.before.price === 150 },
        { text: 'Make the shop say your bag is full.', check: c => c.main === 'else' },
        { text: 'Spend your gold down to exactly 0.', check: c => c.main === 0 && c.after.gold === 0 },
        { text: 'Change ≥ to >. Now try to buy something with EXACTLY enough gold.', check: c => c.refs.cmp.op === '>' && c.before.gold === c.before.price && c.main !== 0 },
      ],
      think: [
        'If you are out of gold AND your bag is full, which message do you see? Why that one?',
        'Why does the second check only need <code>gold &lt; price</code>, and not the bag at all?',
        'What should happen to <code>items</code> when you buy something? Find that line.',
      ],
    },

    /* 4 ------------------------------------------------------------------ */
    {
      id: 'dig',
      kind: 'dig',
      title: 'The Dig Site',
      concepts: ['Every frame', 'Variables', 'Math', 'AND', 'NOT', 'ELSE IF'],
      blurb: 'A 3D block world. You set the reach and the dig time, and the code decides what you can mine.',
      story: 'A block world, built from code. While you hold the mouse button on a block, the computer runs this code every frame, about 60 times a second. You choose two numbers: how far away you can dig (reach) and how many seconds a block takes (digTime). Let go of the button and holdTime goes back to 0.',
      vars: [
        { name: 'reach', type: 'num', init: 4.5, min: 1, max: 12, step: 0.5, slider: true, unit: 'blocks', hint: 'how far away you can dig' },
        { name: 'digTime', type: 'num', init: 1, min: 0, max: 5, step: 0.1, slider: true, unit: 'seconds', hint: 'how long one block takes' },
        { name: 'distance', type: 'num', init: 0, role: 'calc', hint: 'from your eyes to the block' },
        { name: 'isBedrock', type: 'bool', init: false, role: 'calc', hint: 'is it the unbreakable black rock?' },
        { name: 'holdTime', type: 'num', init: 0, role: 'calc', hint: 'seconds you have held the button' },
        { name: 'frameTime', type: 'num', init: 0, role: 'calc', hint: 'seconds since the last frame' },
      ],
      code: B => [
        B.iff([
          [B.and(B.cmp(B.v('distance'), '<=', B.v('reach'), 'reachCmp'), B.not(B.v('isBedrock'), 'not'), 'logic'), [
            B.set('holdTime', B.math(B.v('holdTime'), '+', B.v('frameTime'))),
            B.iff([[B.cmp(B.v('holdTime'), '>=', B.v('digTime'), 'doneCmp'), [
              B.set('holdTime', 0, { optional: true, on: true, ref: 'reset' }),
              B.out('Block mined!', 'mine'),
            ]]], null),
          ]],
          [B.v('isBedrock'), [B.out('Bedrock cannot be mined.', 'bedrock')]],
        ], [B.out('Too far away!', 'far')], { main: true }),
      ],
      challenges: [
        { text: 'Mine any block.', check: e => true },
        { text: 'Mine a diamond ore block. (Dig down: they hide deep, near the bedrock.)', check: e => e.block === 'diamond ore' },
        { text: 'Shrink reach to 2 or less, then mine a block.', check: e => e.vals.reach <= 2 },
        { text: 'Mine a block that is more than 8 blocks away.', check: e => e.distance > 8 },
        { text: 'Make digging instant (digTime 0) and mine 15 blocks without letting go.', check: e => e.vals.digTime === 0 && e.holdCount >= 15 },
        { text: 'Bug hunt: change AND to OR, then mine bedrock. Why does that work?', check: e => e.refs.logic.op === 'OR' && e.block === 'bedrock' },
        { text: 'Turn off the holdTime ← 0 block, hold the button, and mine 5 blocks in one go. Why so fast?', check: e => !e.refs.reset.on && e.holdCount >= 5 },
      ],
      think: [
        'The computer runs this code about 60 times every second. Why add <code>frameTime</code> to <code>holdTime</code> instead of adding 1?',
        'Say the first condition in plain English. What job is NOT doing?',
        'What is a fair reach? What goes wrong if it is too big, or too small?',
        'Why does <code>holdTime ← 0</code> matter? Turn it off and find out.',
      ],
    },
  ];

  TT.scenarios.forEach((s, i) => { s.num = i + 1; s.scene = s.kind === 'dig' ? TT.scenes.digThumb : TT.scenes[s.id]; });
})();
