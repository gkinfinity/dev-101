/* The scenarios. Each one is a tiny program plus the picture it drives.

   vars:       the memory boxes. role 'input' can be changed by students,
               'calc' and 'output' are only ever set by the program.
   code(B):    builds the program (see TT.B in engine.js). Parts given a ref
               name can be checked by the challenges.
   presets:    one-click situations. run: true also runs the program.
   challenges: check(c) gets { before, after, main, refs, crashed } after
               each run; main is which part of the main IF ran
               (0 = IF, 1 = first ELSE IF, ..., 'else', or 'none'). */
(function () {
  'use strict';
  const TT = window.TT;

  TT.scenarios = [
    /* 1 ------------------------------------------------------------------ */
    {
      id: 'damage',
      title: 'Taking a Hit',
      concepts: ['Variables', 'Math', 'IF / ELSE', 'Comparison'],
      blurb: 'Work out the damage, subtract it from health, then decide: knocked out or still standing?',
      story: 'A slime bonks our hero. The computer works out how much damage the hit does, takes it away from the hero\'s health, and then checks whether the hero has been knocked out.',
      vars: [
        { name: 'health', type: 'num', init: 100, min: -50, max: 150, step: 5, hint: 'the hero\'s health points' },
        { name: 'attack', type: 'num', init: 25, min: 0, max: 80, step: 5, hint: 'how hard the slime hits' },
        { name: 'armor', type: 'num', init: 10, min: 0, max: 80, step: 5, hint: 'blocks some of each hit' },
        { name: 'damage', type: 'num', init: 0, role: 'calc', hint: 'worked out by the code' },
      ],
      code: B => [
        B.set('damage', B.math(B.v('attack'), '-', B.v('armor'))),
        B.iff([[B.cmp(B.v('damage'), '<', 0), [B.set('damage', 0)]]], null,
          { optional: true, on: false, ref: 'fix', note: 'bug fix: turn me on!' }),
        B.set('health', B.math(B.v('health'), '-', B.v('damage'))),
        B.iff([[B.cmp(B.v('health'), '<=', 0, 'ko'), [B.out('Knocked out!', 'ko')]]],
          [B.out('Still standing!', 'hit')], { main: true }),
      ],
      presets: [
        { label: 'A normal hit', set: { health: 100, attack: 25, armor: 10 } },
        { label: 'Hero is almost out', set: { health: 10, attack: 25, armor: 10 } },
        { label: 'Exactly enough damage', set: { health: 15, attack: 25, armor: 10 } },
        { label: 'Super-thick armor', set: { health: 50, attack: 20, armor: 35 } },
      ],
      challenges: [
        { text: 'Knock the hero out with one hit.', check: c => c.main === 0 },
        { text: 'Leave the hero with EXACTLY 0 health. Is 0 ≤ 0 TRUE or FALSE?', check: c => c.after.health === 0 },
        { text: 'Bug hunt: find a hit that makes the hero GAIN health.', check: c => c.after.health > c.before.health },
        { text: 'Turn on the "bug fix" block. Now armor bigger than attack does 0 damage.', check: c => c.refs.fix.on && c.before.armor > c.before.attack && c.after.health === c.before.health },
      ],
      think: [
        'Why does the code work out <code>damage</code> before it changes <code>health</code>?',
        'Read <code>health ← health - damage</code> out loud. Which <code>health</code> is the old value and which is the new one?',
        'The hero should NOT be knocked out at exactly 0 health in some apps. Which operator would you change, and to what?',
      ],
    },

    /* 2 ------------------------------------------------------------------ */
    {
      id: 'coins',
      title: 'Coin Collector',
      concepts: ['Variables', 'Math', 'Comparison', 'IF / ELSE'],
      blurb: 'Every pickup adds to your total. Reach 100 and you earn an extra life.',
      story: 'Every coin, gem or chest adds to the total. When the total reaches 100, the hero earns an extra life and 100 coins are taken away. The memory keeps its values between runs, so keep collecting!',
      vars: [
        { name: 'coins', type: 'num', init: 80, min: 0, max: 300, step: 5, hint: 'coins collected so far' },
        { name: 'pickup', type: 'num', init: 10, min: 0, max: 100, step: 1, hint: 'worth of the thing you grab' },
        { name: 'lives', type: 'num', init: 3, min: 0, max: 20, step: 1, hint: 'extra tries' },
      ],
      code: B => [
        B.set('coins', B.math(B.v('coins'), '+', B.v('pickup'))),
        B.iff([[B.cmp(B.v('coins'), '>=', B.num(100, 'goal'), 'cmp'), [
          B.set('lives', B.math(B.v('lives'), '+', 1)),
          B.set('coins', B.math(B.v('coins'), '-', 100), { optional: true, on: true, ref: 'pay' }),
          B.out('Extra life!', 'oneup'),
        ]]], [B.out('Collected!', 'coin')], { main: true }),
      ],
      presets: [
        { label: 'Grab a coin (+1)', set: { pickup: 1 }, run: true },
        { label: 'Grab a gem (+10)', set: { pickup: 10 }, run: true },
        { label: 'Open a chest (+50)', set: { pickup: 50 }, run: true },
        { label: 'Start at 90 coins', set: { coins: 90, lives: 3 } },
      ],
      challenges: [
        { text: 'Earn an extra life.', check: c => c.main === 0 },
        { text: 'Off by one: start at 90 coins and grab a gem. Then change ≥ to > and try again. What happened?', check: c => c.refs.cmp.op === '>' && c.before.coins + c.before.pickup === 100 && c.main === 'else' },
        { text: 'Collect your way up to 6 lives.', check: c => c.after.lives >= 6 },
        { text: 'Turn OFF the block that takes 100 coins away, then grab 3 more coins. What goes wrong?', check: c => !c.refs.pay.on && c.before.coins >= 100 && c.main === 0 },
      ],
      think: [
        'What is the difference between <code>coins ≥ 100</code> and <code>coins &gt; 100</code>? When do they give different answers?',
        'Why does the code subtract 100 after giving a life, instead of setting <code>coins ← 0</code>? (Try 95 coins and a chest worth 50.)',
      ],
    },

    /* 3 ------------------------------------------------------------------ */
    {
      id: 'jump',
      title: 'The Jump Button',
      concepts: ['AND', 'Booleans', 'IF / ELSE'],
      blurb: 'Jump only when the button is pressed AND your feet are on the ground.',
      story: 'The hero should only jump when the jump button is pressed AND their feet are on the ground. If either one is FALSE, there is no jump. Otherwise the hero could jump again and again in mid-air.',
      vars: [
        { name: 'jumpPressed', type: 'bool', init: true, hint: 'is the jump button down?' },
        { name: 'onGround', type: 'bool', init: true, hint: 'are the hero\'s feet touching the ground?' },
        { name: 'height', type: 'num', init: 0, min: 0, max: 600, step: 50, hint: 'how high the hero is' },
      ],
      code: B => [
        B.iff([[B.and(B.v('jumpPressed'), B.v('onGround'), 'logic'), [
          B.set('height', B.math(B.v('height'), '+', B.num(100, 'power'))),
          B.set('onGround', B.bool(false)),
          B.out('Boing!', 'jump'),
        ]]], [B.out('No jump.', 'nojump')], { main: true }),
      ],
      presets: [
        { label: 'Standing, press jump', set: { jumpPressed: true, onGround: true, height: 0 } },
        { label: 'In the air, press jump', set: { jumpPressed: true, onGround: false, height: 100 } },
        { label: 'Standing, no button', set: { jumpPressed: false, onGround: true, height: 0 } },
        { label: 'Land on the ground', set: { onGround: true, height: 0 } },
      ],
      challenges: [
        { text: 'Make the hero jump.', check: c => c.main === 0 },
        { text: 'Press jump while the hero is already in the air. Does the hero jump?', check: c => c.before.jumpPressed && !c.before.onGround && c.main === 'else' },
        { text: 'Create the "flying" bug: change AND to OR, then get the hero higher than 300.', check: c => c.refs.logic.op === 'OR' && c.after.height > 300 },
        { text: 'Change the jump power so one jump goes exactly 250 high from the ground.', check: c => c.main === 0 && c.before.height === 0 && c.after.height === 250 },
      ],
      think: [
        'Fill in the truth table for <code>jumpPressed AND onGround</code>. In how many of the 4 rows does the hero jump?',
        'Why is OR the wrong choice here? Describe what the player would see.',
        'Why does the code set <code>onGround ← FALSE</code> right after a jump?',
      ],
    },

    /* 4 ------------------------------------------------------------------ */
    {
      id: 'door',
      title: 'The Locked Door',
      concepts: ['OR', 'ELSE IF', 'Comparison'],
      blurb: 'A key OR a lockpick opens it. No tools? Maybe you are strong enough to smash it.',
      story: 'A heavy door blocks the way. Having a key OR a lockpick opens it. With neither, a strong enough hero can smash it down. Only ONE part of an IF / ELSE IF / ELSE ever runs — the first one that is TRUE.',
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

    /* 5 ------------------------------------------------------------------ */
    {
      id: 'shield',
      title: 'Power-Up Shield',
      concepts: ['NOT', 'AND', 'ELSE IF'],
      blurb: 'Enemies hurt you only when the shield is NOT on.',
      story: 'While the shield power-up is on, enemies cannot hurt the hero — they bounce off for bonus points. NOT flips a value: NOT TRUE is FALSE, and NOT FALSE is TRUE.',
      vars: [
        { name: 'touchingEnemy', type: 'bool', init: true, hint: 'is an enemy touching the hero?' },
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
        { label: 'Enemy touches you', set: { touchingEnemy: true, shieldOn: false } },
        { label: 'Enemy touches your shield', set: { touchingEnemy: true, shieldOn: true } },
        { label: 'Nobody nearby', set: { touchingEnemy: false, shieldOn: false } },
        { label: 'Full health again', set: { health: 3, score: 0 } },
      ],
      challenges: [
        { text: 'Bounce an enemy off the shield.', check: c => c.main === 1 },
        { text: 'Click the NOT block to turn it off. Now get hurt WHILE the shield is on. Why?', check: c => !c.refs.not.on && c.before.shieldOn && c.before.touchingEnemy && c.main === 0 },
        { text: 'Score 500 points.', check: c => c.after.score >= 500 },
      ],
      think: [
        'Say <code>touchingEnemy AND NOT shieldOn</code> as a normal English sentence.',
        'If <code>shieldOn</code> is FALSE, what is <code>NOT shieldOn</code>?',
        'Could the ELSE IF be written using NOT instead? Is there a shorter way to write it?',
      ],
    },

    /* 6 ------------------------------------------------------------------ */
    {
      id: 'shop',
      title: 'The Item Shop',
      concepts: ['AND', 'Comparison', 'Math', 'ELSE IF'],
      blurb: 'Buy only if you have enough gold AND room in your bag.',
      story: 'The shopkeeper will sell you an item if you have enough gold AND there is room in your bag. If not, the shop tells you which problem you have.',
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
        { label: 'Buy a sword (150)', set: { price: 150 }, run: true },
        { label: 'Payday: 200 gold, empty bag', set: { gold: 200, items: 0 } },
      ],
      challenges: [
        { text: 'Buy the sword.', check: c => c.main === 0 && c.before.price === 150 },
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

    /* 7 ------------------------------------------------------------------ */
    {
      id: 'guard',
      title: 'Sneak Past the Guard',
      concepts: ['AND', 'OR', 'NOT', 'Parentheses', 'ELSE IF'],
      blurb: 'Close AND not hiding — or too noisy — and the guard spots you.',
      story: 'The guard spots you if you are close AND not hiding — OR if you make too much noise from anywhere. A little noise only makes the guard suspicious. The parentheses decide which part is worked out first.',
      vars: [
        { name: 'distance', type: 'num', init: 6, min: 0, max: 10, step: 1, hint: 'steps away from the guard' },
        { name: 'hiding', type: 'bool', init: false, hint: 'behind a bush?' },
        { name: 'noise', type: 'num', init: 2, min: 0, max: 10, step: 1, hint: 'how loud you are (0-10)' },
        { name: 'guard', type: 'str', init: 'calm', role: 'output', hint: 'set by the code' },
      ],
      code: B => [
        B.iff([
          [B.or(B.and(B.cmp(B.v('distance'), '<', B.num(4, 'sight')), B.not(B.v('hiding'), 'not'), 'inner'), B.cmp(B.v('noise'), '>', B.num(7, 'loud')), 'outer'),
            [B.set('guard', B.str('alert')), B.out('Intruder! Stop right there!', 'alert')]],
          [B.cmp(B.v('noise'), '>', B.num(3, 'hmm')), [B.set('guard', B.str('suspicious')), B.out('Huh? What was that noise?', 'sus')]],
        ], [B.set('guard', B.str('calm')), B.out('All quiet...', 'calm')], { main: true }),
      ],
      presets: [
        { label: 'Tiptoe up close', set: { distance: 2, hiding: false, noise: 1 } },
        { label: 'Hide in a bush up close', set: { distance: 2, hiding: true, noise: 1 } },
        { label: 'Knock over a vase', set: { distance: 8, hiding: false, noise: 9 } },
        { label: 'Far away and quiet', set: { distance: 9, hiding: false, noise: 0 } },
      ],
      challenges: [
        { text: 'Get within 1 step of the guard without being spotted.', check: c => c.before.distance <= 1 && c.main !== 0 },
        { text: 'Get spotted even though you are hiding.', check: c => c.before.hiding && c.main === 0 },
        { text: 'Make the guard suspicious, but not alert.', check: c => c.main === 1 },
        { text: 'Change the middle OR to AND. Now can you get close, not hiding, and stay unseen?', check: c => c.refs.outer.op === 'AND' && c.before.distance < 4 && !c.before.hiding && c.main !== 0 },
      ],
      think: [
        'Read the first condition out loud. Where do the parentheses make you pause?',
        'Is <code>(distance &lt; 4 AND NOT hiding) OR noise &gt; 7</code> the same as <code>distance &lt; 4 AND (NOT hiding OR noise &gt; 7)</code>? Find values that give different answers.',
      ],
    },

    /* 8 ------------------------------------------------------------------ */
    {
      id: 'levelup',
      title: 'Level Up!',
      concepts: ['Variables', 'Math', 'Comparison', 'IF / ELSE'],
      blurb: 'Earn XP from each enemy. Fill the bar to level up — and the next level needs more.',
      story: 'Each defeated enemy gives XP (experience points). When XP reaches the target, the hero goes up a level, the extra XP carries over, and the next level needs twice as much.',
      vars: [
        { name: 'xp', type: 'num', init: 0, min: 0, max: 5000, step: 10, hint: 'experience points so far' },
        { name: 'enemyXP', type: 'num', init: 20, min: 0, max: 1000, step: 10, hint: 'XP from this enemy' },
        { name: 'level', type: 'num', init: 1, min: 1, max: 99, step: 1, hint: 'the hero\'s level' },
        { name: 'xpNeeded', type: 'num', init: 100, min: 10, max: 10000, step: 10, hint: 'XP for the next level' },
      ],
      code: B => [
        B.set('xp', B.math(B.v('xp'), '+', B.v('enemyXP'))),
        B.iff([[B.cmp(B.v('xp'), '>=', B.v('xpNeeded')), [
          B.set('level', B.math(B.v('level'), '+', 1)),
          B.set('xp', B.math(B.v('xp'), '-', B.v('xpNeeded'))),
          B.set('xpNeeded', B.math(B.v('xpNeeded'), '*', B.num(2, 'grow'), 'growOp')),
          B.out('LEVEL UP!', 'levelup'),
        ]]], [B.out('Keep going!', 'xp')], { main: true }),
      ],
      presets: [
        { label: 'Defeat a bat (+20 XP)', set: { enemyXP: 20 }, run: true },
        { label: 'Defeat a troll (+60 XP)', set: { enemyXP: 60 }, run: true },
        { label: 'Defeat a dragon (+300 XP)', set: { enemyXP: 300 }, run: true },
        { label: 'Start over at level 1', set: { xp: 0, level: 1, xpNeeded: 100 } },
      ],
      challenges: [
        { text: 'Reach level 3.', check: c => c.after.level >= 3 },
        { text: 'Earn enough XP in ONE fight for two level-ups. How many levels do you actually get?', check: c => c.main === 0 && c.before.xp + c.before.enemyXP >= c.before.xpNeeded * 3 },
        { text: 'Change the code so every level needs the SAME amount of XP, then level up.', check: c => c.main === 0 && c.after.xpNeeded === c.before.xpNeeded },
      ],
      think: [
        'Why does the code do <code>xp ← xp - xpNeeded</code> instead of <code>xp ← 0</code>?',
        'What would go wrong if <code>xpNeeded</code> were doubled BEFORE the line that subtracts it?',
        'An IF only checks once. What kind of code could keep leveling up while there is enough XP? (A sneak peek at loops!)',
      ],
    },
  ];

  TT.scenarios.forEach((s, i) => { s.num = i + 1; s.scene = TT.scenes[s.id]; });
})();
