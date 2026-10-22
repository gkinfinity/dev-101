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
   inside a 3D world (dig.js). Students fill in its blanks one colored step at
   a time; the Test button runs that step's `tests` once for every number
   RANDOM can give (`diamond` is how often a diamond should appear), and challenges are checked each
   time a block is mined, with { block, distance, vals, refs }. */
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
      concepts: ['Every frame', 'Variables', 'AND', 'NOT', 'ELSE IF', 'RANDOM'],
      vars: [
        { name: 'reach', type: 'num', init: 4.5, min: 1, max: 12, step: 0.01, slider: true, unit: 'meters' },
        { name: 'digTime', type: 'num', init: 1, min: 0, max: 5, step: 0.1, slider: true, unit: 'seconds' },
        { name: 'distance', type: 'num', init: 0, role: 'calc', unit: 'meters' },
        { name: 'isBedrock', type: 'bool', init: false, role: 'calc' },
        { name: 'isDiamond', type: 'bool', init: false, role: 'calc' },
        { name: 'holdTime', type: 'num', init: 0, role: 'calc', unit: 'seconds' },
      ],
      // The code is built in four colored steps, easiest first. parts(B) makes the
      // blanks once, so answers carry over; program(B, p, step) puts together the
      // code for one step. The last number in each IF branch is its step, which
      // sets its color and badge. Each step has its own tests.
      parts: B => ({
        bedrock: B.maybeNot(B.blankVar()),
        timeOk: B.maybeNot(B.blankCmp()),
        reachOk: B.blankLogic(B.maybeNot(B.blankCmp()), B.maybeNot(B.blankVar()), 'logic'),
        diamond: B.blankLogic(B.maybeNot(B.blankVar()), B.maybeNot({ k: 'cmp', a: B.random(1, 5, 'rand'), op: null, b: B.blankNum() }), 'gemLogic'),
      }),
      partOrder: ['bedrock', 'timeOk', 'reachOk', 'diamond'],
      program: (B, p, step) => {
        const NOTE = {
          bedrock: 'Check for specific block type',
          timeOk: 'Mine the block once it has been held long enough',
          reachOk: 'The block must be close enough AND bedrock cannot be mined',
          diamond: 'Diamond from diamond ore, OR a 1/5 bonus on any block',
        };
        const mined = [B.out('Block mined!', 'mine')];
        const bedrockMsg = [B.out('Bedrock cannot be mined.', 'bedrock')];
        if (step === 1) return [B.iff([[p.bedrock, bedrockMsg, NOTE.bedrock, 1]], mined, { main: true })];
        if (step === 2) return [B.iff([[p.bedrock, bedrockMsg, NOTE.bedrock, 1], [p.timeOk, mined, NOTE.timeOk, 2]], null, { main: true })];
        if (step >= 4) mined.push(B.iff([[p.diamond, [B.out('You found a diamond!', 'gem')], NOTE.diamond, 4]], null));
        return [B.iff([
          [p.reachOk, [B.iff([[p.timeOk, mined, NOTE.timeOk, 2]], null)], NOTE.reachOk, 3],
          [p.bedrock, bedrockMsg, NOTE.bedrock, 1],
        ], [B.out('Too far away!', 'far')], { main: true })];
      },
      // The whole program, for anything that wants it in one piece.
      code(B) { return this.program(B, this.parts(B), 4); },
      goal: 'Make every block minable except bedrock. Mining should take time, and diamonds can drop.',
      // diamond: how often a diamond should appear (the test runs once for every number RANDOM can give)
      steps: [
        { done: "Bedrock can't be mined, and every other block can.", tests: [
          { say: 'Dirt', vals: { distance: 2, reach: 4.5, isBedrock: false, isDiamond: false, holdTime: 0, digTime: 1 }, expect: ['Block mined!'] },
          { say: 'Bedrock', vals: { distance: 2, reach: 4.5, isBedrock: true, isDiamond: false, holdTime: 0, digTime: 1 }, expect: ['Bedrock cannot be mined.'] },
          { say: 'Diamond ore', vals: { distance: 2, reach: 4.5, isBedrock: false, isDiamond: true, holdTime: 0, digTime: 1 }, expect: ['Block mined!'] },
        ] },
        { done: 'Blocks now take digTime seconds to mine.', tests: [
          { say: 'Dirt, held long enough', vals: { distance: 2, reach: 4.5, isBedrock: false, isDiamond: false, holdTime: 1.5, digTime: 1 }, expect: ['Block mined!'] },
          { say: 'Dirt, not held long enough', vals: { distance: 2, reach: 4.5, isBedrock: false, isDiamond: false, holdTime: 0.4, digTime: 1 }, expect: [] },
          { say: 'Bedrock, held long enough', vals: { distance: 2, reach: 4.5, isBedrock: true, isDiamond: false, holdTime: 3, digTime: 1 }, expect: ['Bedrock cannot be mined.'] },
          { say: 'A slow block, held long enough', vals: { distance: 2, reach: 4.5, isBedrock: false, isDiamond: false, holdTime: 2.5, digTime: 2 }, expect: ['Block mined!'] },
          { say: 'A slow block, not held long enough', vals: { distance: 2, reach: 4.5, isBedrock: false, isDiamond: false, holdTime: 1.5, digTime: 2 }, expect: [] },
        ] },
        { done: 'Blocks must be within reach, and bedrock still cannot be mined.', tests: [
          { say: 'A block in reach, held long enough', vals: { distance: 2, reach: 4.5, isBedrock: false, isDiamond: false, holdTime: 1.5, digTime: 1 }, expect: ['Block mined!'] },
          { say: 'A block in reach, not held long enough', vals: { distance: 2, reach: 4.5, isBedrock: false, isDiamond: false, holdTime: 0.4, digTime: 1 }, expect: [] },
          { say: 'A block too far away', vals: { distance: 7, reach: 4.5, isBedrock: false, isDiamond: false, holdTime: 3, digTime: 1 }, expect: ['Too far away!'] },
          { say: 'Bedrock in reach', vals: { distance: 2, reach: 4.5, isBedrock: true, isDiamond: false, holdTime: 3, digTime: 1 }, expect: ['Bedrock cannot be mined.'] },
          { say: 'Bedrock too far away', vals: { distance: 7, reach: 4.5, isBedrock: true, isDiamond: false, holdTime: 3, digTime: 1 }, expect: ['Bedrock cannot be mined.'] },
          { say: 'A far block with a long reach', vals: { distance: 6, reach: 8, isBedrock: false, isDiamond: false, holdTime: 2.5, digTime: 2 }, expect: ['Block mined!'] },
        ] },
        { done: 'Diamond ore always gives a diamond, and any block has a 1 in 5 bonus. Your code is finished!', tests: [
          { say: 'Dirt in reach, held long enough', vals: { distance: 2, reach: 4.5, isBedrock: false, isDiamond: false, holdTime: 1.5, digTime: 1 }, expect: ['Block mined!'], diamond: 1 / 5 },
          { say: 'Diamond ore in reach, held long enough', vals: { distance: 2, reach: 4.5, isBedrock: false, isDiamond: true, holdTime: 1.5, digTime: 1 }, expect: ['Block mined!'], diamond: 1 },
          { say: 'Diamond ore, not held long enough', vals: { distance: 2, reach: 4.5, isBedrock: false, isDiamond: true, holdTime: 0.4, digTime: 1 }, expect: [], diamond: 0 },
          { say: 'A block too far away', vals: { distance: 7, reach: 4.5, isBedrock: false, isDiamond: false, holdTime: 3, digTime: 1 }, expect: ['Too far away!'], diamond: 0 },
          { say: 'Bedrock in reach', vals: { distance: 2, reach: 4.5, isBedrock: true, isDiamond: false, holdTime: 3, digTime: 1 }, expect: ['Bedrock cannot be mined.'], diamond: 0 },
          { say: 'A far block with a long reach', vals: { distance: 6, reach: 8, isBedrock: false, isDiamond: false, holdTime: 2.5, digTime: 2 }, expect: ['Block mined!'], diamond: 1 / 5 },
        ] },
      ],
      // step: the challenge opens once that step's code is on screen.
      challenges: [
        { step: 1, text: 'Mine any block that is not bedrock.', check: e => e.block !== 'bedrock' },
        { step: 2, text: 'Set digTime to 3 or more, then hold the mouse button until the block breaks.', check: e => e.vals.digTime >= 3 && e.vals.holdTime >= 3 },
        { step: 2, text: 'Set digTime to 0, then break a block instantly.', check: e => e.vals.digTime === 0 },
        { step: 3, text: 'Set reach to 2 or less, then mine a block right next to you.', check: e => e.vals.reach <= 2 && e.distance <= e.vals.reach },
        { step: 3, text: 'Set reach to more than 8, then mine a block more than 8 meters away.', check: e => e.vals.reach > 8 && e.distance > 8 },
        { step: 3, text: 'Bug hunt: change the AND in step 3 to OR, then mine bedrock. Why can you?', check: e => e.refs.logic && e.refs.logic.op === 'OR' && e.block === 'bedrock' },
        { step: 4, text: 'Mine a diamond ore block and get its diamond.', check: e => e.block === 'diamond ore' && e.gem },
        { step: 4, text: 'Get a bonus diamond from a block that is NOT diamond ore.', check: e => e.gem && !e.vals.isDiamond },
      ],
      // One question per variable: students describe it, then use that to fill in the blanks.
      questions: ['reach', 'digTime', 'distance', 'isBedrock', 'isDiamond', 'holdTime'],
    },
  ];

  TT.scenarios.forEach((s, i) => { s.num = i + 1; s.scene = s.kind === 'dig' ? TT.scenes.digThumb : TT.scenes[s.id]; });
})();
