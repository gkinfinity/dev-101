/* Scene pictures, drawn as SVG from the current variables.
   Each scene is draw(vals, ctx) where ctx = { fx, fresh, before, refs }:
     fx     - the effect of the last OUTPUT that ran (or null)
     fresh  - true only at the moment that OUTPUT runs, so animations play once
     before - the variables at the start of the run (for "-25 gold" style pop-ups)
     refs   - named parts of the program (some pictures follow the code's numbers)
   Gradients and patterns are shared: they live in the hidden <svg> in index.html. */
(function () {
  'use strict';
  const TT = window.TT;
  const esc = TT.esc;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  // Repeatable "random" numbers, so decorations stay put between redraws.
  const rnd = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  const NEON = '#00ff6a';
  const svg = inner => '<svg class="scene-svg" viewBox="0 0 480 240" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' + inner + '</svg>';

  // Glows are drawn as a soft wide stroke underneath, not an SVG filter:
  // a filter is redrawn every frame while anything in the picture animates.
  function text(x, y, s, o) {
    o = o || {};
    const fill = o.fill || '#d7ffe0';
    const base = '<text x="' + x + '" y="' + y + '" font-size="' + (o.size || 13) + '" font-weight="' + (o.weight || 700) +
      '" text-anchor="' + (o.anchor || 'middle') + '"' + (o.ls ? ' letter-spacing="' + o.ls + '"' : '');
    const halo = o.glow ? base + ' fill="' + fill + '" stroke="' + fill + '" stroke-opacity=".28" stroke-width="' + ((o.sw || 0) + 6) +
      '" stroke-linejoin="round" opacity=".7">' + esc(s) + '</text>' : '';
    return halo + base + ' fill="' + fill + '"' +
      (o.stroke ? ' stroke="' + o.stroke + '" stroke-width="' + (o.sw || 4) + '" paint-order="stroke" stroke-linejoin="round"' : '') +
      '>' + esc(s) + '</text>';
  }

  // A group placed at (x, y); the inner group is free for CSS animation, and its
  // local (0, 0) is the anchor: feet for characters, hinge for the door.
  const at = (x, y, inner, cls, style) =>
    '<g transform="translate(' + x + ',' + y + ')"><g' + (cls ? ' class="' + cls + '"' : '') + (style ? ' style="' + style + '"' : '') + '>' + inner + '</g></g>';
  const scaled = (s, inner) => '<g transform="scale(' + s + ')">' + inner + '</g>';

  function hud(x, y, w, h) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="7" fill="#020a06" fill-opacity=".78" stroke="' + NEON + '" stroke-opacity=".45"/>' +
      '<path d="M' + (x + 1) + ',' + (y + 10) + ' v-9 h9 M' + (x + w - 1) + ',' + (y + h - 10) + ' v9 h-9" stroke="' + NEON + '" stroke-width="2" fill="none"/>';
  }

  function segBar(x, y, segs, filled, color, markAt) {
    let s = '';
    for (let i = 0; i < segs; i++) {
      const on = i < filled;
      s += '<rect x="' + (x + i * 9) + '" y="' + y + '" width="7" height="12" rx="1.5" fill="' + (on ? color : '#16261c') + '"' + '' + '/>';
    }
    if (markAt != null) {
      const mx = x + markAt * 9 - 1;
      s += '<path d="M' + mx + ',' + (y - 4) + ' v20" stroke="#fff" stroke-width="1.5" stroke-dasharray="2 2"/>';
    }
    return s;
  }

  // A number that floats up and fades (only when the moment is fresh).
  function floater(x, y, s, color, fresh, delay) {
    if (!fresh) return '';
    return at(x, y, text(0, 0, s, { size: 19, fill: color, stroke: '#020a06', sw: 5, weight: 800 }), 'fx-float', delay ? 'animation-delay:' + delay + 's' : '');
  }
  function bigWord(x, y, s, color, fresh, size) {
    return at(x, y, text(0, 0, s, { size: size || 32, fill: color, stroke: '#020a06', sw: 6, weight: 900, glow: true, ls: 2 }), fresh ? 'fx-pop' : '');
  }

  /* ---------- the hero: a hooded runner with a glowing visor ---------- */
  function hero(o) {
    o = o || {};
    const mood = o.mood || 'normal';
    const visorColor = mood === 'hurt' || mood === 'ko' ? '#ff4d6d' : NEON;
    let visor;
    if (mood === 'happy') visor = '<path d="M0,-55 q3,-6 6,0 M6.5,-55 q3,-6 6,0" stroke="' + visorColor + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>';
    else if (mood === 'hurt') visor = '<path d="M0,-60 l5,3 l-5,3 M12,-60 l-5,3 l5,3" stroke="' + visorColor + '" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
    else if (mood === 'ko') visor = '<path d="M0,-60 l5,5 M5,-60 l-5,5 M7,-60 l5,5 M12,-60 l-5,5" stroke="' + visorColor + '" stroke-width="2.2" stroke-linecap="round"/>';
    else visor = '<rect x="-0.5" y="-59.5" width="13" height="4.2" rx="2.1" fill="' + visorColor + '"/>';
    const visorHalo = '<rect x="-3.5" y="-62.5" width="19" height="10" rx="5" fill="' + visorColor + '" opacity=".22"/>';
    return '<g class="hero">' +
      '<g class="scarf"><path d="M-6,-46 C-20,-47 -29,-42 -38,-34 C-30,-35 -22,-36 -15,-38 C-22,-33 -26,-28 -30,-21 C-20,-27 -14,-34 -8,-40Z" fill="' + NEON + '" opacity=".85"/></g>' +
      '<rect x="-15" y="-43" width="7" height="21" rx="3.5" fill="#0f141c"/>' +
      '<rect x="-9" y="-23" width="8" height="21" rx="3" fill="#10161f"/>' +
      '<rect x="1" y="-23" width="8" height="21" rx="3" fill="#18202c"/>' +
      '<path d="M-1,-11 h2 M9,-11 h-2" stroke="' + NEON + '" stroke-width="1" opacity=".6"/>' +
      '<path d="M-11,-4 h10 v4 h-11 q-1,-4 1,-4z" fill="#04070a"/><path d="M0,-4 h11 q3,0 3,4 h-14z" fill="#04070a"/>' +
      '<path d="M-12,-45 Q-14,-26 -11,-20 H11 Q14,-26 12,-45 Q0,-49 -12,-45Z" fill="url(#tt-g-suit)" stroke="#2b3a4d" stroke-width="1"/>' +
      '<path d="M3,-45 V-21" stroke="' + NEON + '" stroke-width="1.4" opacity=".75"/>' +
      '<rect x="-12" y="-25" width="24" height="4" fill="#070b10"/>' +
      '<rect x="0" y="-25.5" width="6" height="5" rx="1" fill="' + NEON + '"/>' +
      '<rect x="8" y="-43" width="7" height="21" rx="3.5" fill="#1b2431"/>' +
      '<circle cx="11.5" cy="-21.5" r="3.6" fill="#0a0e14"/>' +
      '<path d="M-12,-50 Q-14,-70 1,-71 Q15,-70 14,-53 Q13,-44 1,-44 Q-12,-44 -12,-50Z" fill="#182130" stroke="#2b3a4d" stroke-width="1"/>' +
      '<path d="M-3,-63 Q9,-66 12.5,-58 Q12.5,-49 4,-48 Q-3,-49 -3,-56Z" fill="#05080c"/>' +
      visorHalo + visor +
      '</g>';
  }

  const heroShadow = (x, y, w) => '<ellipse cx="' + x + '" cy="' + (y + 1) + '" rx="' + (w || 26) + '" ry="5" fill="#000" opacity=".45"/>';

  /* ---------- icons ---------- */
  function keyIcon(on) {
    const c = on ? '#ffd23f' : 'none', s = on ? '#ffb000' : '#3f5c49';
    return '<g>' + (on ? '<circle r="17" fill="#ffd23f" opacity=".14"/>' : '') + '<circle cx="-9" cy="0" r="7" fill="' + c + '" stroke="' + s + '" stroke-width="2.4"/>' +
      '<circle cx="-9" cy="0" r="2.4" fill="' + (on ? '#3a2a00' : 'none') + '" stroke="' + s + '" stroke-width="1.2"/>' +
      '<path d="M-2,0 H14 M9,0 V6 M14,0 V5" stroke="' + s + '" stroke-width="3" stroke-linecap="round" fill="none"/></g>';
  }
  function pickIcon(on) {
    const s = on ? '#5ef2ff' : '#3f5c49';
    return '<g><path d="M-14,7 L9,-6 l4,-2" stroke="' + s + '" stroke-width="3" stroke-linecap="round" fill="none"/>' +
      '<path d="M13,-8 l2,4 M-14,7 l-1,-5" stroke="' + s + '" stroke-width="2.2" stroke-linecap="round"/></g>';
  }
  const heart = on =>
    (on ? '<path d="M0,6 C0,6 -10,-1 -10,-7.5 C-10,-12.5 -5,-15 0,-9.5 C5,-15 10,-12.5 10,-7.5 C10,-1 0,6 0,6Z" fill="none" stroke="#ff3b6b" stroke-width="6" opacity=".3"/>' : '') +
    '<path d="M0,6 C0,6 -10,-1 -10,-7.5 C-10,-12.5 -5,-15 0,-9.5 C5,-15 10,-12.5 10,-7.5 C10,-1 0,6 0,6Z" fill="' + (on ? '#ff3b6b' : 'none') +
    '" stroke="' + (on ? '#ff8aa6' : '#3f5c49') + '" stroke-width="1.6"' + '' + '/>';
  const coin = r => '<circle r="' + (r + 4) + '" fill="#ffd23f" opacity=".18"/><circle r="' + r + '" fill="#ffd23f" stroke="#ffb000" stroke-width="1.6"/><rect x="-1.4" y="' + (-r * 0.55) + '" width="2.8" height="' + (r * 1.1) + '" rx="1.2" fill="#a86b00"/>';

  const S = {};

  /* ======================================================================
     The Locked Door: a dungeon vault lit by two torches
     ====================================================================== */
  function torch(x) {
    return '<circle cx="' + x + '" cy="96" r="78" fill="url(#tt-g-torch)" class="glow-flicker"/>' +
      '<path d="M' + (x - 10) + ',122 h20 l-4,7 h-12z" fill="#2c313c" stroke="#121419"/>' +
      '<rect x="' + (x - 3) + '" y="100" width="6" height="24" rx="2" fill="#5a3a22"/>' +
      at(x, 101, '<path d="M0,-24 C9,-13 10,-4 6,2 C3,6 -3,6 -6,2 C-10,-4 -8,-13 0,-24Z" fill="url(#tt-g-flame)"/>' +
        '<path d="M0,-13 C4,-7 4,-1 2,2 C1,3 -1,3 -2,2 C-4,-1 -4,-7 0,-13Z" fill="#fff6d0"/>', 'flame');
  }

  function vaultDoor(lockGlow, lockFx) {
    // local (0, 0) is the top-left of the doorway; the hinge is on the left
    let d = '<path d="M0,127 V18 Q46,-18 92,18 V127 Z" fill="url(#tt-g-wood)" stroke="#2a1608" stroke-width="2.5"/>';
    [23, 46, 69].forEach(x => { d += '<path d="M' + x + ',127 V' + (x === 46 ? 1 : 7) + '" stroke="#3b200c" stroke-width="2"/>'; });
    d += '<path d="M0,40 H92 M0,98 H92" stroke="#2a2e37" stroke-width="10"/><path d="M0,36 H92 M0,94 H92" stroke="#6f7a8c" stroke-width="1.5" opacity=".7"/>';
    [8, 30, 54, 78].forEach(x => { d += '<circle cx="' + x + '" cy="40" r="2.6" fill="#b8c2d0"/><circle cx="' + x + '" cy="98" r="2.6" fill="#b8c2d0"/>'; });
    d += '<g class="' + (lockFx ? 'fx-shake' : '') + '">' +
      '<path d="M65,58 v-7 a8,8 0 0 1 16,0 v7" fill="none" stroke="#9aa4b2" stroke-width="3.5"/>' +
      '<rect x="61" y="57" width="24" height="22" rx="4" fill="url(#tt-g-metal)" stroke="#2a2e37" stroke-width="1.5"/>' +
      '<path d="M73,63 a3,3 0 1 1 0.1,0 M73,66 v7" stroke="' + lockGlow + '" stroke-width="8" stroke-linecap="round" fill="none" opacity=".3"/>' +
      '<path d="M73,63 a3,3 0 1 1 0.1,0 M73,66 v7" stroke="' + lockGlow + '" stroke-width="3" stroke-linecap="round" fill="none"/></g>';
    return d;
  }

  S.door = function (v, c) {
    const fresh = c.fresh;
    const st = v.door;
    const need = c.refs && c.refs.need ? c.refs.need.v : 80;
    let s = '<rect width="480" height="240" fill="url(#tt-g-wall)"/>';
    // stone wall
    const shades = ['#2a2f3b', '#262a35', '#2e3441', '#232731'];
    for (let row = 0; row < 8; row++) {
      for (let col = -1; col < 9; col++) {
        const x = col * 60 + (row % 2) * 30, y = row * 26 - 4, k = row * 17 + col + 40;
        s += '<rect x="' + (x + 1.5) + '" y="' + (y + 1.5) + '" width="57" height="23" rx="2" fill="' + shades[Math.floor(rnd(k) * 4)] + '"/>';
        if (rnd(k + 9) > 0.8) s += '<path d="M' + (x + 10 + rnd(k) * 30).toFixed(1) + ',' + (y + 4) + ' l4,8 l-3,6" stroke="#191c23" stroke-width="1.2" fill="none"/>';
      }
    }
    // floor
    s += '<rect y="197" width="480" height="43" fill="url(#tt-g-floor)"/><rect y="196" width="480" height="2" fill="#4a5163"/>';
    for (let x = -120; x <= 600; x += 52) s += '<path d="M' + x + ',198 L' + (x + (x - 240) * 0.35) + ',240" stroke="#0b0d12" stroke-width="1.5"/>';
    s += '<path d="M0,214 H480 M0,230 H480" stroke="#0b0d12" stroke-width="1.2"/>';
    // torches
    s += torch(262) + torch(430);
    // arch + doorway
    const dx = 300, dw = 92, dtop = 70, bottom = 197;
    s += '<path d="M' + (dx - 15) + ',' + bottom + ' V' + (dtop + 18) + ' Q' + (dx + dw / 2) + ',' + (dtop - 38) + ' ' + (dx + dw + 15) + ',' + (dtop + 18) + ' V' + bottom + ' Z" fill="#4a5162" stroke="#15181f" stroke-width="2"/>';
    s += '<path d="M' + (dx - 15) + ',' + (dtop + 18) + ' Q' + (dx + dw / 2) + ',' + (dtop - 38) + ' ' + (dx + dw + 15) + ',' + (dtop + 18) + '" stroke="#626b7e" stroke-width="2" fill="none"/>';
    s += '<rect x="' + (dx + dw / 2 - 9) + '" y="' + (dtop - 16) + '" width="18" height="16" rx="2" fill="#5a6275" stroke="#15181f" stroke-width="1.5"/>';
    const inner = 'M' + dx + ',' + bottom + ' V' + (dtop + 18) + ' Q' + (dx + dw / 2) + ',' + (dtop - 18) + ' ' + (dx + dw) + ',' + (dtop + 18) + ' V' + bottom + ' Z';
    if (st === 'open' || st === 'smashed') {
      s += '<path d="' + inner + '" fill="url(#tt-g-light)"/>';
      s += '<path d="M' + dx + ',' + bottom + ' H' + (dx + dw) + ' L' + (dx + dw + 30) + ',240 H' + (dx - 140) + ' Z" fill="#ffd77a" opacity=".22"/>';
      s += '<g opacity=".7">' + [0, 1, 2, 3].map(i => '<circle cx="' + (dx + 16 + i * 20) + '" cy="' + (110 + i * 17) + '" r="1.6" fill="#fff3c4" class="mote" style="animation-delay:' + (i * 0.6) + 's"/>').join('') + '</g>';
    } else {
      s += '<path d="' + inner + '" fill="#07080b"/>';
    }
    if (st === 'open') {
      s += at(dx, dtop, '<g class="door-open">' + vaultDoor('#2a2e37', false) + '</g>', fresh ? 'fx-swing' : '');
    } else if (st === 'smashed') {
      const planks = [[-58, 194, -20], [-16, 190, 12], [24, 196, -8], [70, 192, 26], [108, 195, -32], [140, 199, 8]];
      planks.forEach((p, i) => {
        s += at(dx + 30 + p[0], p[1], '<rect x="-21" y="-5" width="42" height="10" rx="2" fill="#7b4a22" stroke="#2a1608" stroke-width="2" transform="rotate(' + p[2] + ')"/>',
          fresh ? 'fx-debris' : '', fresh ? '--dx:' + (p[0] * 0.6) + 'px;--dy:-' + (40 + i * 12) + 'px' : '');
      });
      s += '<path d="M' + dx + ',' + bottom + ' l6,-30 l-4,-20 l8,-14 V' + bottom + 'Z M' + (dx + dw) + ',' + bottom + ' l-7,-24 l5,-22 l-6,-16 V' + bottom + 'Z" fill="#5a3518"/>';
      if (fresh) {
        s += [0, 1, 2, 3, 4].map(i => at(dx + 20 + i * 14, 180 - (i % 2) * 10, '<circle r="' + (9 + i % 3 * 3) + '" fill="#8a8f9a" opacity=".55"/>', 'fx-dust', 'animation-delay:' + (i * 0.05) + 's')).join('');
        s += bigWord(dx + 46, 52, 'CRASH!', '#ff9f1a', true, 30);
      }
    } else {
      const locked = st === 'locked';
      s += at(dx, dtop, vaultDoor(locked ? '#ff3b5c' : NEON, fresh && locked));
      if (locked && fresh) s += at(dx + 73, dtop - 24, text(0, 0, 'LOCKED', { size: 14, fill: '#ff3b5c', stroke: '#020a06', sw: 4, weight: 900, glow: true, ls: 2 }), 'fx-pop');
    }
    // hero
    const mood = st === 'locked' && fresh ? 'hurt' : st === 'open' || st === 'smashed' ? 'happy' : 'normal';
    s += heroShadow(170, 198, 24);
    s += at(170, 198, scaled(1.25, hero({ mood })), fresh && st === 'smashed' ? 'fx-charge' : '');
    // inventory + strength (the dashed line is the number in the code)
    s += hud(10, 10, 272, 50) +
      at(36, 30, keyIcon(v.hasKey)) + text(36, 50, 'KEY', { size: 9, fill: v.hasKey ? '#ffd23f' : '#5c7f66', ls: 1 }) +
      at(84, 31, pickIcon(v.hasLockpick)) + text(84, 50, 'LOCKPICK', { size: 9, fill: v.hasLockpick ? '#5ef2ff' : '#5c7f66', ls: 1 }) +
      text(122, 26, 'STRENGTH ' + v.strength, { size: 10, anchor: 'start', fill: '#ffb27a', ls: 1 }) +
      segBar(122, 34, 10, Math.round(clamp(v.strength, 0, 100) / 10), '#ff8a2a', clamp(need, 0, 100) / 10) +
      text(122 + clamp(need, 0, 100) / 10 * 9 - 1, 58, String(need), { size: 8, fill: '#fff' });
    return svg(s);
  };

  /* ======================================================================
     Power-Up Shield: a neon arena with a perspective grid
     ====================================================================== */
  function drone() {
    let spikes = '';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const p = (r, d) => (Math.cos(a + d) * r).toFixed(1) + ',' + (Math.sin(a + d) * r).toFixed(1);
      spikes += 'M' + p(16, -0.28) + ' L' + p(29, 0) + ' L' + p(16, 0.28) + ' ';
    }
    return '<circle r="40" fill="url(#tt-g-redhaze)"/><g class="spin-slow"><path d="' + spikes + '" fill="#ff3b6b" stroke="#ff8aa6" stroke-width="1"/></g>' +
      '<circle r="18" fill="url(#tt-g-orb)" stroke="#ff8aa6" stroke-width="1.5"/>' +
      '<circle cx="-3" cy="-1" r="7" fill="#200008"/><circle cx="-4" cy="-1" r="3.6" fill="#ffd0da"/>' +
      '<ellipse cx="6" cy="-9" rx="5" ry="2.5" fill="#fff" opacity=".35"/>';
  }

  S.shield = function (v, c) {
    const fresh = c.fresh;
    let s = '<rect width="480" height="240" fill="url(#tt-g-space)"/>';
    for (let i = 0; i < 40; i++) s += '<circle cx="' + (rnd(i) * 480).toFixed(1) + '" cy="' + (rnd(i + 99) * 140).toFixed(1) + '" r="' + (0.5 + rnd(i + 7) * 1.1).toFixed(2) + '" fill="#cfffe0" opacity="' + (0.3 + rnd(i + 3) * 0.6).toFixed(2) + '"/>';
    // distant skyline
    for (let i = 0; i < 16; i++) {
      const w = 18 + rnd(i + 200) * 22, h = 18 + rnd(i + 300) * 46, x = i * 31 - 6;
      s += '<rect x="' + x.toFixed(1) + '" y="' + (150 - h).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" fill="#06121a"/>';
      if (rnd(i + 400) > 0.4) s += '<rect x="' + (x + 4).toFixed(1) + '" y="' + (154 - h).toFixed(1) + '" width="3" height="3" fill="' + NEON + '" opacity=".6"/>';
    }
    s += '<ellipse cx="240" cy="150" rx="320" ry="26" fill="url(#tt-g-haze)"/>';
    // perspective grid floor
    s += '<rect y="150" width="480" height="90" fill="#020b07"/>';
    let grid = '';
    for (let i = -10; i <= 10; i++) {
      const xb = 240 + i * 56, xt = 240 + (xb - 240) * 0.25;
      grid += '<path d="M' + xt.toFixed(1) + ',150 L' + xb.toFixed(1) + ',240"/>';
    }
    [0, 0.07, 0.17, 0.31, 0.5, 0.74, 1].forEach(t => { grid += '<path d="M0,' + (150 + t * 90).toFixed(1) + ' H480"/>'; });
    s += '<g stroke="' + NEON + '" stroke-width="1.2" opacity=".42">' + grid + '</g>';
    s += '<path d="M0,150 H480" stroke="' + NEON + '" stroke-width="7" opacity=".18"/><path d="M0,150 H480" stroke="' + NEON + '" stroke-width="2" opacity=".85"/>';
    // HUD
    const hp = Math.max(0, v.health);
    s += hud(10, 10, 158, 40);
    for (let i = 0; i < 5; i++) s += at(32 + i * 27, 32, heart(i < hp));
    if (hp > 5) s += text(160, 36, '+' + (hp - 5), { size: 11, anchor: 'end' });
    s += hud(316, 10, 154, 40) + text(330, 36, 'SCORE', { size: 11, anchor: 'start', fill: '#7fb894', ls: 1 }) +
      text(458, 37, String(Math.max(0, v.score)).padStart(6, '0'), { size: 17, anchor: 'end', fill: NEON, glow: true, weight: 800 });
    // hero + shield
    const hurt = fresh && c.fx === 'ouch';
    s += heroShadow(200, 212, 26);
    s += at(200, 212, scaled(1.25, hero({ mood: hurt ? 'hurt' : v.shieldOn ? 'happy' : 'normal' })), hurt ? 'fx-knock' : '');
    if (v.shieldOn) {
      s += at(200, 170,
        '<circle r="58" fill="url(#tt-g-shield)"/>' +
        '<circle r="58" fill="url(#tt-hex)" opacity=".55"/>' +
        '<circle r="58" fill="none" stroke="#5effc8" stroke-width="9" opacity=".18"/><circle r="58" fill="none" stroke="#5effc8" stroke-width="2.5"/>' +
        '<path d="M-38,-36 a52,52 0 0 1 30,-17" stroke="#e8fff6" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/>', 'fx-shimmer');
    }
    // enemy drone
    const ex = v.touchingEnemy ? (v.shieldOn ? 290 : 262) : 418;
    s += '<ellipse cx="' + ex + '" cy="213" rx="26" ry="6" fill="url(#tt-g-redhaze)"/>';
    s += at(ex, 168, at(0, 0, drone(), 'bob'), fresh && c.fx === 'bounce' ? 'fx-fly' : '');
    if (!v.touchingEnemy) s += text(418, 128, 'FAR AWAY', { size: 10, fill: '#7fb894', ls: 1 });
    if (fresh && c.fx === 'bounce') {
      let sparks = '';
      for (let i = 0; i < 9; i++) {
        const a = -1.2 + i * 0.3;
        sparks += '<path d="M0,0 L' + (Math.cos(a) * 26).toFixed(1) + ',' + (Math.sin(a) * 26).toFixed(1) + '" stroke="#5effc8" stroke-width="2.4" stroke-linecap="round"/>';
      }
      s += at(258, 168, sparks, 'fx-burst');
      s += floater(310, 110, '+100', NEON, true);
    }
    if (hurt) {
      s += '<rect width="480" height="240" fill="#ff1744" class="fx-flash" opacity="0"/>';
      s += floater(200, 96, '-1 HEART', '#ff4d6d', true);
    }
    return svg(s);
  };

  /* ======================================================================
     The Item Shop: a neon market stall with a robot vendor
     ====================================================================== */
  function shopItem(price) {
    if (price === 25) return { name: 'POTION', art: '<path d="M-7,-30 h14 v9 l11,15 q5,19 -18,21 q-23,-2 -18,-21 l11,-15z" fill="#0c2a1a" fill-opacity=".6" stroke="#9dffc6" stroke-width="2"/><circle cy="3" r="22" fill="#00ff6a" opacity=".14"/><path d="M-15,-4 q15,-6 30,0 q2,14 -15,15 q-17,-1 -15,-15z" fill="#00ff6a"/><rect x="-8" y="-35" width="16" height="7" rx="2" fill="#8a5a2b"/><circle cx="-5" cy="2" r="2" fill="#eafff2"/><circle cx="4" cy="-1" r="1.4" fill="#eafff2"/>' };
    if (price === 80) return { name: 'SHIELD', art: '<path d="M0,-32 L24,-23 Q24,6 0,19 Q-24,6 -24,-23 Z" fill="#082a33" stroke="#5ef2ff" stroke-width="2.5"/><path d="M0,-21 L13,-16 Q13,1 0,9 Q-13,1 -13,-16 Z" fill="none" stroke="#5ef2ff" stroke-width="1.5" opacity=".8"/><circle cy="-6" r="4" fill="#5ef2ff"/>' };
    if (price === 150) return { name: 'LASER SWORD', art: '<g transform="rotate(-38)"><rect x="-9" y="-57" width="18" height="60" rx="9" fill="#ff4ddb" opacity=".22"/><rect x="-3.5" y="-52" width="7" height="50" rx="3.5" fill="#ff4ddb"/><rect x="-1.6" y="-50" width="3.2" height="46" rx="1.6" fill="#ffe6fa"/><rect x="-6" y="-3" width="12" height="20" rx="2" fill="#3a4152" stroke="#9aa4b2" stroke-width="1"/><rect x="-8" y="-4" width="16" height="4" rx="1.5" fill="#9aa4b2"/></g>' };
    return { name: 'MYSTERY BOX', art: '<rect x="-18" y="-30" width="36" height="34" rx="4" fill="#1a0d2e" stroke="#b07cff" stroke-width="2.5"/><text x="0" y="-6" font-size="22" font-weight="900" text-anchor="middle" fill="#d9c2ff">?</text>' };
  }

  function robot(mood, fx) {
    const screen = mood === 'poor'
      ? '<path d="M-14,-90 l8,8 M-6,-90 l-8,8 M6,-90 l8,8 M14,-90 l-8,8" stroke="#ff3b5c" stroke-width="2.6" stroke-linecap="round"/>'
      : mood === 'full'
        ? '<text x="0" y="-77" font-size="20" font-weight="900" text-anchor="middle" fill="#ffd23f">!</text>'
        : mood === 'buy'
          ? '<path d="M-14,-82 q4,-7 8,0 M6,-82 q4,-7 8,0" stroke="#5ef2ff" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M-7,-76 q7,5 14,0" stroke="#5ef2ff" stroke-width="2" fill="none" stroke-linecap="round"/>'
          : '<rect x="-14" y="-90" width="8" height="9" rx="2" fill="#5ef2ff"/><rect x="6" y="-90" width="8" height="9" rx="2" fill="#5ef2ff" class="blink"/>';
    return '<g class="' + (fx || '') + '">' +
      '<path d="M0,-118 V-108" stroke="#9aa4b2" stroke-width="2"/><circle cy="-121" r="3.5" fill="#ff4ddb" class="blink"/>' +
      '<rect x="-30" y="-108" width="60" height="44" rx="10" fill="#2a3142" stroke="#59627a" stroke-width="2"/>' +
      '<rect x="-23" y="-101" width="46" height="31" rx="6" fill="#031418"/>' +
      screen +
      '<rect x="-36" y="-92" width="6" height="14" rx="2" fill="#3a4152"/><rect x="30" y="-92" width="6" height="14" rx="2" fill="#3a4152"/>' +
      '<rect x="-34" y="-62" width="68" height="64" rx="12" fill="#252c3b" stroke="#59627a" stroke-width="2"/>' +
      '<rect x="-18" y="-50" width="36" height="20" rx="4" fill="#0b1018"/>' +
      '<circle cx="-9" cy="-40" r="3" fill="' + NEON + '"/><circle cx="0" cy="-40" r="3" fill="#ffd23f" class="blink"/><circle cx="9" cy="-40" r="3" fill="#ff4ddb"/>' +
      '</g>';
  }

  S.shop = function (v, c) {
    const fresh = c.fresh;
    const it = shopItem(v.price);
    let s = '<rect width="480" height="240" fill="url(#tt-g-alley)"/>';
    // city behind the stall
    for (let i = 0; i < 12; i++) {
      const x = i * 42 - 10, w = 34 + rnd(i + 50) * 12, h = 70 + rnd(i + 60) * 80;
      s += '<rect x="' + x.toFixed(1) + '" y="' + (170 - h).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" fill="#120a24"/>';
      for (let j = 0; j < 8; j++) {
        if (rnd(i * 13 + j) > 0.55) {
          const col = rnd(i + j * 7) > 0.5 ? '#5ef2ff' : '#ff4ddb';
          s += '<rect x="' + (x + 5 + (j % 3) * 10).toFixed(1) + '" y="' + (176 - h + Math.floor(j / 3) * 14 + 6).toFixed(1) + '" width="5" height="6" fill="' + col + '" opacity=".55"/>';
        }
      }
    }
    // neon sign
    s += '<rect x="174" y="14" width="132" height="38" rx="8" fill="#0b0414" stroke="#ff4ddb" stroke-width="8" stroke-opacity=".25"/>' +
      '<rect x="174" y="14" width="132" height="38" rx="8" fill="none" stroke="#ff4ddb" stroke-width="2"/>' +
      text(240, 41, 'SHOP', { size: 24, fill: '#ffd6f6', stroke: '#ff4ddb', sw: 2, weight: 900, glow: true, ls: 6 }) +
      text(288, 26, '24/7', { size: 9, fill: '#5ef2ff', glow: true });
    // vendor robot behind the counter
    const mood = fresh ? c.fx : 'idle';
    s += at(370, 172, robot(mood, fresh && c.fx === 'poor' ? 'fx-shake' : fresh && c.fx === 'buy' ? 'fx-hop' : ''));
    // counter
    s += '<rect x="0" y="168" width="480" height="72" fill="url(#tt-g-counter)"/>' +
      '<rect x="0" y="162" width="480" height="12" fill="#5ef2ff" opacity=".16"/><rect x="0" y="166" width="480" height="4" fill="#5ef2ff"/>' +
      '<g stroke="#0a0e15" stroke-width="2">' + [70, 160, 250, 340, 430].map(x => '<path d="M' + x + ',178 V240"/>').join('') + '</g>';
    // hologram projector + item
    const bought = fresh && c.fx === 'buy';
    s += '<path d="M176,166 L194,72 H246 L264,166 Z" fill="url(#tt-g-holo)" opacity=".8"/>';
    s += '<g stroke="#5ef2ff" opacity=".15">' + [84, 96, 108, 120, 132, 144, 156].map(y => '<path d="M' + (176 + (166 - y) * 0.19).toFixed(1) + ',' + y + ' H' + (264 - (166 - y) * 0.19).toFixed(1) + '"/>').join('') + '</g>';
    s += '<ellipse cx="220" cy="167" rx="40" ry="9" fill="#5ef2ff" opacity=".2"/><ellipse cx="220" cy="167" rx="30" ry="5" fill="#5ef2ff" opacity=".9"/>';
    s += at(220, 128, at(0, 0, it.art, 'holo-bob'), bought ? 'fx-tobag' : '');
    s += hud(166, 194, 108, 36) + text(220, 209, it.name, { size: 9, fill: '#5ef2ff', ls: 1 }) +
      text(220, 224, v.price + ' GOLD', { size: 12, fill: '#ffd23f', weight: 800 });
    // the customer
    s += at(78, 236, scaled(1.25, hero({ mood: bought ? 'happy' : fresh ? 'hurt' : 'normal' })));
    // gold + bag
    s += hud(10, 10, 132, 40) + at(32, 30, coin(10)) + text(50, 36, String(v.gold), { size: 18, anchor: 'start', fill: '#ffd23f', weight: 800, glow: true });
    const size = clamp(v.bagSize, 1, 10);
    const w = 20, gap = 4, bw = size * (w + gap) + 50;
    s += hud(470 - bw, 10, bw, 40) + text(478 - bw, 35, 'BAG', { size: 10, anchor: 'start', fill: '#7fb894', ls: 1 });
    let slots = '';
    for (let i = 0; i < size; i++) {
      const x = 470 - bw + 40 + i * (w + gap);
      const full = i < v.items;
      slots += '<rect x="' + x + '" y="20" width="' + w + '" height="20" rx="4" fill="' + (full ? NEON : '#0b1a12') + '" fill-opacity="' + (full ? 0.85 : 1) +
        '" stroke="' + (full ? '#9dffc6' : '#2c5a3e') + '" stroke-width="1.5"' + '' + '/>';
    }
    s += at(0, 0, slots, fresh && c.fx === 'full' ? 'fx-shake fx-redglow' : '');
    if (v.items > size) s += text(470, 64, (v.items - size) + ' too many!', { size: 11, anchor: 'end', fill: '#ff4d6d' });
    if (bought && c.before) s += floater(84, 140, '-' + (c.before.gold - v.gold) + ' GOLD', '#ffd23f', true);
    return svg(s);
  };

  /* ======================================================================
     The Dig Site card picture: a little block island (the real thing is 3D)
     ====================================================================== */
  S.digThumb = function () {
    const cw = 22, ch = 11, hh = 22, ox = 240, oy = 92;
    const COL = {
      grass: ['#62b73a', '#8b5a2b', '#6e4521'], dirt: ['#9a6a3a', '#8b5a2b', '#6e4521'],
      diamond: ['#8d939b', '#747a82', '#5d6269'],
      log: ['#b58b52', '#6b4423', '#55361b'], leaves: ['#3d8c2a', '#2f7020', '#255a19'],
    };
    const H = [[1, 1, 2, 2, 1], [1, 2, 2, 3, 2], [2, 2, 3, 3, 2], [1, 2, 2, 2, 1], [1, 1, 2, 1, 1]];
    const blocks = [];
    for (let x = 0; x < 5; x++) for (let z = 0; z < 5; z++) {
      const h = H[x][z];
      for (let y = 0; y < h; y++) blocks.push([x, y, z, y === h - 1 ? 'grass' : y === 0 && x === 4 && z === 1 ? 'diamond' : 'dirt']);
    }
    blocks.push([1, 2, 1, 'log'], [1, 3, 1, 'log'], [1, 4, 1, 'leaves'], [0, 4, 1, 'leaves'], [1, 4, 0, 'leaves'], [2, 4, 1, 'leaves'], [1, 4, 2, 'leaves'], [1, 5, 1, 'leaves']);
    blocks.sort((a, b) => (a[0] + a[2]) - (b[0] + b[2]) || a[1] - b[1]);
    let s = '<rect width="480" height="240" fill="url(#tt-g-day)"/>';
    s += '<g fill="#fff" opacity=".85"><rect x="40" y="30" width="70" height="14"/><rect x="56" y="22" width="34" height="10"/><rect x="360" y="44" width="80" height="14"/><rect x="380" y="36" width="40" height="10"/></g>';
    blocks.forEach(([x, y, z, kind]) => {
      const sx = ox + (x - z) * cw, sy = oy + (x + z) * ch - y * hh;
      const [top, left, right] = COL[kind];
      s += '<path d="M' + sx + ',' + sy + ' l' + cw + ',' + ch + ' l' + (-cw) + ',' + ch + ' l' + (-cw) + ',' + (-ch) + 'Z" fill="' + top + '"/>' +
        '<path d="M' + (sx - cw) + ',' + (sy + ch) + ' l' + cw + ',' + ch + ' v' + hh + ' l' + (-cw) + ',' + (-ch) + 'Z" fill="' + left + '"/>' +
        '<path d="M' + (sx + cw) + ',' + (sy + ch) + ' l' + (-cw) + ',' + ch + ' v' + hh + ' l' + cw + ',' + (-ch) + 'Z" fill="' + right + '"/>';
      if (kind === 'grass') s += '<path d="M' + (sx - cw) + ',' + (sy + ch) + ' l' + cw + ',' + ch + ' l' + cw + ',' + (-ch) + ' v5 l' + (-cw) + ',' + ch + ' l' + (-cw) + ',' + (-ch) + 'Z" fill="#4f9a2c"/>';
      if (kind === 'diamond') s += '<g fill="#5ef2ff"><rect x="' + (sx + 5) + '" y="' + (sy + ch + 8) + '" width="4" height="4"/><rect x="' + (sx + 12) + '" y="' + (sy + ch + 3) + '" width="4" height="4"/><rect x="' + (sx + 8) + '" y="' + (sy + ch + 16) + '" width="4" height="4"/></g>';
    });
    s += '<ellipse cx="240" cy="148" rx="118" ry="58" fill="none" stroke="' + NEON + '" stroke-width="7" opacity=".15"/>' +
      '<ellipse cx="240" cy="148" rx="118" ry="58" fill="none" stroke="' + NEON + '" stroke-width="2" stroke-dasharray="6 6"/>';
    s += at(384, 118, '<g transform="rotate(-30)"><rect x="-3" y="-6" width="6" height="52" rx="2" fill="#8b5a2b" stroke="#3b200c"/><path d="M-30,-6 Q0,-24 30,-6 L26,0 Q0,-14 -26,0Z" fill="#5ef2ff" stroke="#1a8fa0" stroke-width="1.5"/></g>', 'pick-swing');
    s += hud(10, 10, 170, 34) + text(22, 32, 'IF distance ≤ reach', { size: 12, anchor: 'start', fill: NEON, glow: true });
    return svg(s);
  };

  TT.scenes = S;
})();
