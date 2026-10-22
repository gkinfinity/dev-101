/* Scene pictures, drawn as SVG from the current variables.
   Each scene is draw(vals, ctx) where ctx = { fx, fresh, before, refs }:
     fx     - the effect of the last OUTPUT that ran (or null)
     fresh  - true only at the moment that OUTPUT runs, so animations play once
     before - the variables at the start of the run (for "-15" style pop-ups)
     refs   - named parts of the program (some pictures follow the code's numbers) */
(function () {
  'use strict';
  const TT = window.TT;
  const esc = TT.esc;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  /* ---------- small drawing helpers ---------- */
  const svg = inner => '<svg class="scene-svg" viewBox="0 0 480 240" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' + inner + '</svg>';

  function text(x, y, s, o) {
    o = o || {};
    return '<text x="' + x + '" y="' + y + '" font-size="' + (o.size || 14) + '" font-weight="' + (o.weight || 800) +
      '" fill="' + (o.fill || '#1f2937') + '" text-anchor="' + (o.anchor || 'middle') + '"' +
      (o.stroke ? ' stroke="' + o.stroke + '" stroke-width="' + (o.sw || 4) + '" paint-order="stroke" stroke-linejoin="round"' : '') +
      (o.cls ? ' class="' + o.cls + '"' : '') + (o.style ? ' style="' + o.style + '"' : '') + '>' + esc(s) + '</text>';
  }

  // A group placed at (x, y); the inner group is free for CSS animation.
  const at = (x, y, inner, cls, style) =>
    '<g transform="translate(' + x + ',' + y + ')"><g' + (cls ? ' class="' + cls + '"' : '') + (style ? ' style="' + style + '"' : '') + '>' + inner + '</g></g>';

  const scaled = (s, inner) => '<g transform="scale(' + s + ')">' + inner + '</g>';

  function clouds() {
    return '<g fill="#fff" opacity=".9">' +
      '<ellipse cx="80" cy="44" rx="34" ry="13"/><ellipse cx="104" cy="36" rx="22" ry="14"/>' +
      '<ellipse cx="370" cy="30" rx="30" ry="11"/><ellipse cx="392" cy="24" rx="18" ry="11"/></g>';
  }

  function field(o) {
    o = o || {};
    const gy = o.groundY || 200;
    return '<rect width="480" height="240" fill="' + (o.sky || '#d0ebff') + '"/>' + (o.noClouds ? '' : clouds()) +
      '<rect y="' + gy + '" width="480" height="' + (240 - gy) + '" fill="' + (o.grass || '#69db7c') + '"/>' +
      '<rect y="' + (gy + 9) + '" width="480" height="' + (240 - gy - 9) + '" fill="' + (o.dirt || '#d9a066') + '"/>' +
      '<g fill="' + (o.dirtDots || '#c58a4f') + '"><circle cx="40" cy="' + (gy + 22) + '" r="3"/><circle cx="150" cy="' + (gy + 30) + '" r="2.5"/>' +
      '<circle cx="260" cy="' + (gy + 20) + '" r="3"/><circle cx="350" cy="' + (gy + 31) + '" r="2"/><circle cx="440" cy="' + (gy + 24) + '" r="3"/></g>';
  }

  /* The hero. Feet at (0,0), about 50 units tall. */
  function hero(o) {
    o = o || {};
    const body = o.color || '#4c6ef5';
    const edge = o.edge || '#364fc7';
    let eyes;
    if (o.eyes === 'ko') {
      eyes = '<path d="M-12,-37 l7,7 M-5,-37 l-7,7 M5,-37 l7,7 M12,-37 l-7,7" stroke="#1f2937" stroke-width="2.8" stroke-linecap="round"/>';
    } else if (o.eyes === 'happy') {
      eyes = '<path d="M-12,-31 q4.5,-7 9,0 M3,-31 q4.5,-7 9,0" stroke="#1f2937" stroke-width="2.8" fill="none" stroke-linecap="round"/>';
    } else if (o.eyes === 'hurt') {
      eyes = '<path d="M-12,-37 l7,3.5 l-7,3.5 M12,-37 l-7,3.5 l7,3.5" stroke="#1f2937" stroke-width="2.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
    } else {
      eyes = '<circle cx="-7" cy="-33" r="5.8" fill="#fff"/><circle cx="7" cy="-33" r="5.8" fill="#fff"/>' +
        '<circle cx="-5.8" cy="-32.5" r="3" fill="#1f2937"/><circle cx="8.2" cy="-32.5" r="3" fill="#1f2937"/>';
    }
    return '<g class="hero">' +
      '<path d="M15,-27 q16,1 22,11 q-12,1 -22,-4z" fill="#f03e3e"/>' +
      '<ellipse cx="-9" cy="-3.5" rx="8.5" ry="4.5" fill="#343a40"/><ellipse cx="9" cy="-3.5" rx="8.5" ry="4.5" fill="#343a40"/>' +
      '<rect x="-19" y="-50" width="38" height="46" rx="15" fill="' + body + '" stroke="' + edge + '" stroke-width="2.5"/>' +
      '<rect x="-19" y="-24" width="38" height="6" fill="#fab005"/>' +
      '<rect x="-4" y="-25" width="8" height="8" rx="1.5" fill="#f08c00"/>' +
      '<ellipse cx="-10" cy="-44" rx="5" ry="2.5" fill="#fff" opacity=".35"/>' +
      eyes +
      (o.blush ? '<circle cx="-13" cy="-26" r="3" fill="#ff8787" opacity=".7"/><circle cx="13" cy="-26" r="3" fill="#ff8787" opacity=".7"/>' : '') +
      '</g>';
  }

  function slime(color, edge) {
    return '<g class="slime"><path d="M-27,0 Q-29,-36 0,-38 Q29,-36 27,0 Z" fill="' + (color || '#40c057') + '" stroke="' + (edge || '#2b8a3e') + '" stroke-width="2.5"/>' +
      '<ellipse cx="-9" cy="-20" rx="3.6" ry="5.2" fill="#1f2937"/><ellipse cx="9" cy="-20" rx="3.6" ry="5.2" fill="#1f2937"/>' +
      '<path d="M-15,-30 l9,4.5 M15,-30 l-9,4.5" stroke="#1f2937" stroke-width="2.6" stroke-linecap="round"/>' +
      '<ellipse cx="-14" cy="-27" rx="4" ry="2" fill="#fff" opacity=".45"/></g>';
  }

  function spiky() {
    let spikes = '';
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const x1 = Math.cos(a - 0.22) * 17, y1 = Math.sin(a - 0.22) * 17;
      const x2 = Math.cos(a) * 27, y2 = Math.sin(a) * 27;
      const x3 = Math.cos(a + 0.22) * 17, y3 = Math.sin(a + 0.22) * 17;
      spikes += 'M' + x1.toFixed(1) + ',' + y1.toFixed(1) + ' L' + x2.toFixed(1) + ',' + y2.toFixed(1) + ' L' + x3.toFixed(1) + ',' + y3.toFixed(1) + ' ';
    }
    return '<g class="spiky" transform="translate(0,-24)"><path d="' + spikes + '" fill="#9c36b5" stroke="#862e9c" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<circle r="19" fill="#be4bdb" stroke="#862e9c" stroke-width="2.5"/>' +
      '<circle cx="-6" cy="-3" r="4.5" fill="#fff"/><circle cx="6" cy="-3" r="4.5" fill="#fff"/>' +
      '<circle cx="-7" cy="-2" r="2.3" fill="#1f2937"/><circle cx="5" cy="-2" r="2.3" fill="#1f2937"/>' +
      '<path d="M-6,8 q6,-5 12,0" stroke="#1f2937" stroke-width="2.4" fill="none" stroke-linecap="round"/></g>';
  }

  const heart = (fill, stroke) =>
    '<path d="M0,6 C0,6 -10,-1 -10,-7.5 C-10,-12.5 -5,-15 0,-9.5 C5,-15 10,-12.5 10,-7.5 C10,-1 0,6 0,6Z" fill="' + fill + '" stroke="' + (stroke || '#c92a2a') + '" stroke-width="1.8"/>';

  const coin = r => {
    r = r || 9;
    return '<circle r="' + r + '" fill="#fcc419" stroke="#e67700" stroke-width="2"/><rect x="-1.6" y="' + (-r * 0.55) + '" width="3.2" height="' + (r * 1.1) + '" rx="1.5" fill="#e67700"/>';
  };

  function gem() {
    return '<path d="M-12,-4 L-6,-12 L6,-12 L12,-4 L0,12 Z" fill="#4dabf7" stroke="#1971c2" stroke-width="2" stroke-linejoin="round"/>' +
      '<path d="M-12,-4 H12 M-6,-12 L0,-4 L6,-12 M0,-4 V12" stroke="#1971c2" stroke-width="1.2" fill="none"/>' +
      '<path d="M-5,-9 L-2,-6" stroke="#fff" stroke-width="2" stroke-linecap="round"/>';
  }

  function chest() {
    return '<rect x="-20" y="-6" width="40" height="22" rx="3" fill="#a0522d" stroke="#5c3317" stroke-width="2"/>' +
      '<path d="M-20,-6 Q-20,-20 0,-20 Q20,-20 20,-6 Z" fill="#b5651d" stroke="#5c3317" stroke-width="2"/>' +
      '<rect x="-20" y="-7" width="40" height="5" fill="#fab005" stroke="#e67700" stroke-width="1.2"/>' +
      '<rect x="-4" y="-5" width="8" height="10" rx="1.5" fill="#fab005" stroke="#e67700" stroke-width="1.2"/>';
  }

  function keyIcon(on) {
    const c = on ? '#fab005' : 'none', s = on ? '#e67700' : '#adb5bd';
    return '<g opacity="' + (on ? 1 : 0.6) + '"><circle cx="-9" cy="0" r="7" fill="' + c + '" stroke="' + s + '" stroke-width="2.4"/>' +
      '<circle cx="-9" cy="0" r="2.5" fill="' + (on ? '#fff3bf' : 'none') + '" stroke="' + s + '" stroke-width="1.4"/>' +
      '<path d="M-2,0 H14 M9,0 V6 M14,0 V5" stroke="' + s + '" stroke-width="3" stroke-linecap="round" fill="none"/></g>';
  }

  function pickIcon(on) {
    const s = on ? '#495057' : '#adb5bd';
    return '<g opacity="' + (on ? 1 : 0.6) + '"><path d="M-14,6 L8,-6 l4,-2" stroke="' + s + '" stroke-width="3" stroke-linecap="round" fill="none"/>' +
      '<path d="M12,-8 l2,4 M-14,6 l-1,-5" stroke="' + s + '" stroke-width="2.2" stroke-linecap="round"/>' +
      '<rect x="-18" y="2" width="9" height="7" rx="2" fill="' + (on ? '#e64980' : 'none') + '" stroke="' + (on ? '#a61e4d' : '#adb5bd') + '" stroke-width="1.6" transform="rotate(-28 -13 5)"/></g>';
  }

  function hudPanel(x, y, w, h) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="9" fill="#fff" fill-opacity=".86" stroke="#1f2937" stroke-opacity=".12"/>';
  }

  function bar(x, y, w, h, frac, color) {
    const f = clamp(frac, 0, 1);
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + h / 2 + '" fill="#e9ecef" stroke="#adb5bd"/>' +
      (f > 0 ? '<rect x="' + x + '" y="' + y + '" width="' + Math.max(h, w * f).toFixed(1) + '" height="' + h + '" rx="' + h / 2 + '" fill="' + color + '"/>' : '');
  }

  // A number that floats up and fades (only when the moment is fresh).
  function floater(x, y, s, color, fresh, delay) {
    if (!fresh) return '';
    return at(x, y, text(0, 0, s, { size: 20, fill: color, stroke: '#fff', sw: 5 }), 'fx-float', delay ? 'animation-delay:' + delay + 's' : '');
  }

  function bigWord(x, y, s, color, fresh, size) {
    return at(x, y, text(0, 0, s, { size: size || 34, fill: color, stroke: '#fff', sw: 7 }), fresh ? 'fx-pop' : '');
  }

  const S = {};

  /* 1. Taking a hit -------------------------------------------------------- */
  S.damage = function (v, c) {
    const ko = c.fx === 'ko';
    const fresh = c.fresh;
    const hit = fresh && (c.fx === 'hit' || c.fx === 'ko');
    const hp = v.health;
    const color = hp > 50 ? '#40c057' : hp > 25 ? '#fab005' : '#fa5252';
    let s = field();
    // health
    s += hudPanel(12, 12, 210, 40) + text(26, 38, 'HP', { size: 15, anchor: 'start', fill: '#c92a2a' }) +
      bar(56, 24, 110, 14, hp / 100, color) + text(174, 37, hp + ' / 100', { size: 13, anchor: 'start' });
    if (hp > 100) s += text(115, 66, 'over max!', { size: 12, fill: '#1971c2', stroke: '#fff', sw: 3 });
    // stat tags
    s += hudPanel(278, 12, 190, 40) +
      text(294, 37, 'attack ' + v.attack, { size: 13, anchor: 'start', fill: '#2b8a3e' }) +
      text(380, 37, 'armor ' + v.armor, { size: 13, anchor: 'start', fill: '#364fc7' });
    // hero
    const heroArt = scaled(1.35, hero({ eyes: ko ? 'ko' : hit ? 'hurt' : 'normal' }));
    s += '<ellipse cx="150" cy="202" rx="30" ry="5" fill="#000" opacity=".12"/>';
    s += ko ? at(150, 200, heroArt, fresh ? 'fx-fall ko-pose' : 'ko-pose')
      : at(150, 200, heroArt, hit ? 'fx-shake' : '');
    // slime
    s += '<ellipse cx="330" cy="202" rx="34" ry="5" fill="#000" opacity=".12"/>';
    s += at(330, 200, scaled(1.4, slime()), hit ? 'fx-lunge' : '');
    // pop-ups
    if (fresh && c.before) {
      const d = hp - c.before.health;
      const label = d < 0 ? String(d) : d > 0 ? '+' + d : '0';
      const col = d < 0 ? '#e03131' : d > 0 ? '#2f9e44' : '#495057';
      s += floater(150, 112, label, col, true);
      if (d > 0) s += floater(150, 136, 'healed?!', '#2f9e44', true, 0.25);
    }
    if (ko) s += bigWord(240, 110, 'K.O.', '#e03131', fresh, 44);
    return svg(s);
  };

  /* 2. Coin collector ------------------------------------------------------ */
  S.coins = function (v, c) {
    const fresh = c.fresh;
    const val = v.pickup;
    const item = val >= 50 ? chest() : val >= 10 ? gem() : coin(11);
    const name = val >= 50 ? 'chest' : val >= 10 ? 'gem' : 'coin';
    let s = field({ sky: '#e7f5ff' });
    s += hudPanel(12, 12, 150, 40) + at(34, 32, coin(11)) + text(52, 38, '× ' + v.coins, { size: 18, anchor: 'start' });
    // lives
    const lives = Math.max(0, v.lives);
    s += hudPanel(300, 12, 168, 40);
    const shown = Math.min(lives, 6);
    for (let i = 0; i < shown; i++) s += at(322 + i * 22, 33, heart('#fa5252'), fresh && c.fx === 'oneup' && i === shown - 1 ? 'fx-pop' : '');
    if (lives > 6) s += text(460, 38, '+' + (lives - 6), { size: 13, anchor: 'end' });
    if (lives === 0) s += text(384, 38, 'no lives', { size: 13, fill: '#868e96' });
    // a floating block with the item above the hero
    s += '<rect x="214" y="78" width="52" height="40" rx="6" fill="#f59f00" stroke="#d9480f" stroke-width="2.5"/>' +
      '<text x="240" y="106" font-size="22" font-weight="900" fill="#fff3bf" text-anchor="middle">?</text>';
    s += at(240, 64, item, fresh ? 'fx-collect' : 'fx-hover');
    s += text(276, 103, name + ' = +' + val, { size: 13, anchor: 'start', fill: '#495057', stroke: '#e7f5ff', sw: 3 });
    s += '<ellipse cx="240" cy="202" rx="26" ry="5" fill="#000" opacity=".12"/>';
    s += at(240, 200, scaled(1.3, hero({ eyes: fresh ? 'happy' : 'normal', blush: fresh })), fresh ? 'fx-hop' : '');
    if (fresh) s += floater(110, 80, '+' + val, '#e67700', true);
    if (c.fx === 'oneup') s += bigWord(380, 110, '+1 LIFE!', '#2f9e44', fresh, 30);
    return svg(s);
  };

  /* 3. The jump button ----------------------------------------------------- */
  S.jump = function (v, c) {
    const fresh = c.fresh;
    const scale = 0.5;
    const h = Math.max(0, v.height);
    const lift = h * scale;
    const maxLift = 172;
    const y = 200 - Math.min(lift, maxLift);
    let s = field({ sky: '#d0ebff' });
    // height ruler
    s += '<g stroke="#74c0fc" stroke-dasharray="4 5">';
    for (let k = 100; k <= 300; k += 100) s += '<line x1="40" x2="440" y1="' + (200 - k * scale) + '" y2="' + (200 - k * scale) + '"/>';
    s += '</g>' + text(36, 200 - 100 * scale + 4, '100', { size: 11, anchor: 'end', fill: '#1971c2' }) +
      text(36, 200 - 200 * scale + 4, '200', { size: 11, anchor: 'end', fill: '#1971c2' }) +
      text(36, 200 - 300 * scale + 4, '300', { size: 11, anchor: 'end', fill: '#1971c2' }) +
      text(36, 204, '0', { size: 11, anchor: 'end', fill: '#1971c2' });
    // shadow shrinks as the hero rises
    const sh = clamp(1 - lift / 220, 0.25, 1);
    s += '<ellipse cx="240" cy="202" rx="' + (26 * sh).toFixed(1) + '" ry="' + (5 * sh).toFixed(1) + '" fill="#000" opacity=".14"/>';
    let dy = 0;
    if (fresh && c.fx === 'jump' && c.before) dy = (Math.min(h * scale, maxLift) - Math.min(Math.max(0, c.before.height) * scale, maxLift));
    s += at(240, y, scaled(1.3, hero({ eyes: c.fx === 'nojump' ? 'hurt' : 'normal' })),
      fresh && c.fx === 'jump' ? 'fx-rise' : fresh && c.fx === 'nojump' ? 'fx-shake' : '',
      dy ? '--dy:' + dy.toFixed(1) + 'px' : '');
    if (lift > maxLift) {
      s += at(300, 82, '<path d="M0,-12 L10,2 H4 V12 H-4 V2 H-10 Z" fill="#e03131"/>', fresh ? 'fx-pop' : '') +
        text(316, 88, 'height ' + h + ': off the top!', { size: 14, anchor: 'start', fill: '#c92a2a', stroke: '#d0ebff', sw: 4 });
    }
    if (fresh && c.fx === 'nojump') s += at(240, y - 80, text(0, 0, '?', { size: 30, fill: '#495057', stroke: '#fff', sw: 5 }), 'fx-pop');
    // the jump button
    const p = v.jumpPressed;
    s += hudPanel(12, 12, 132, 46) +
      '<circle cx="38" cy="35" r="15" fill="' + (p ? '#c92a2a' : '#ff6b6b') + '" stroke="#862e2e" stroke-width="2"' + (p ? '' : ' transform="translate(0,-2)"') + '/>' +
      text(38, 40, 'A', { size: 14, fill: '#fff' }) +
      text(60, 32, 'jump', { size: 12, anchor: 'start', fill: '#495057' }) +
      text(60, 47, p ? 'PRESSED' : 'not pressed', { size: 11, anchor: 'start', fill: p ? '#c92a2a' : '#868e96' });
    s += hudPanel(336, 12, 132, 46) +
      text(402, 31, 'feet on ground?', { size: 11, fill: '#495057' }) +
      text(402, 49, v.onGround ? 'TRUE' : 'FALSE', { size: 15, fill: v.onGround ? '#2f9e44' : '#e03131' });
    if (fresh && c.fx === 'jump') s += floater(300, y - 40, 'boing!', '#7048e8', true);
    return svg(s);
  };

  /* 4. The locked door ----------------------------------------------------- */
  S.door = function (v, c) {
    const fresh = c.fresh;
    const st = v.door;
    let s = '<rect width="480" height="240" fill="#495057"/>';
    // stone wall
    s += '<g stroke="#343a40" stroke-width="2">';
    for (let row = 0; row < 7; row++) {
      const y = row * 30;
      s += '<line x1="0" x2="480" y1="' + y + '" y2="' + y + '"/>';
      for (let x = (row % 2) * 30; x < 480; x += 60) s += '<line x1="' + x + '" x2="' + x + '" y1="' + y + '" y2="' + (y + 30) + '"/>';
    }
    s += '</g><rect x="0" y="200" width="480" height="40" fill="#868e96"/><rect x="0" y="200" width="480" height="5" fill="#adb5bd"/>';
    // doorway
    const dx = 300, dw = 92, dtop = 72;
    s += '<path d="M' + (dx - 8) + ',200 V' + (dtop + 10) + ' Q' + (dx + dw / 2) + ',' + (dtop - 22) + ' ' + (dx + dw + 8) + ',' + (dtop + 10) + ' V200 Z" fill="#212529"/>';
    const doorShape = '<path d="M0,128 V18 Q46,-12 92,18 V128 Z" fill="#a9662f" stroke="#5c3317" stroke-width="3"/>' +
      '<path d="M23,128 V8 M46,128 V2 M69,128 V8" stroke="#8b4f21" stroke-width="2.5"/>' +
      '<rect x="-2" y="30" width="96" height="9" fill="#495057"/><rect x="-2" y="94" width="96" height="9" fill="#495057"/>';
    const lock = '<rect x="62" y="58" width="22" height="18" rx="3" fill="#fab005" stroke="#e67700" stroke-width="2"/>' +
      '<path d="M66,58 v-6 a7,7 0 0 1 14,0 v6" fill="none" stroke="#e67700" stroke-width="3"/><circle cx="73" cy="67" r="2.5" fill="#5c3317"/>';
    if (st === 'open') {
      s += '<path d="M' + (dx + 4) + ',200 V' + (dtop + 6) + ' Q' + (dx + dw / 2) + ',' + (dtop - 16) + ' ' + (dx + dw - 4) + ',' + (dtop + 6) + ' V200 Z" fill="#ffe8a1" opacity=".9"/>';
      s += at(dx, dtop, '<g class="door-open">' + doorShape + '</g>', fresh ? 'fx-swing' : '');
    } else if (st === 'smashed') {
      s += '<path d="M' + (dx + 4) + ',200 V' + (dtop + 6) + ' Q' + (dx + dw / 2) + ',' + (dtop - 16) + ' ' + (dx + dw - 4) + ',' + (dtop + 6) + ' V200 Z" fill="#ffe8a1" opacity=".75"/>';
      const planks = [[-50, 196, -20], [-6, 192, 14], [40, 197, -8], [92, 193, 24], [128, 196, -30]];
      planks.forEach((p, i) => {
        s += at(dx + 30 + p[0], p[1], '<rect x="-20" y="-5" width="40" height="10" rx="2" fill="#a9662f" stroke="#5c3317" stroke-width="2" transform="rotate(' + p[2] + ')"/>',
          fresh ? 'fx-debris' : '', fresh ? '--dx:' + (p[0] * 0.6) + 'px;--dy:-' + (40 + i * 12) + 'px' : '');
      });
      if (fresh) s += bigWord(dx + 46, 60, 'CRASH!', '#e8590c', true, 30);
    } else {
      s += at(dx, dtop, doorShape + lock, fresh && st === 'locked' ? 'fx-shake' : '');
      if (st === 'locked' && fresh) s += at(dx + 73, dtop + 40, text(0, 0, 'locked', { size: 14, fill: '#e03131', stroke: '#fff', sw: 4 }), 'fx-pop');
    }
    // hero
    s += at(170, 200, scaled(1.35, hero({ eyes: st === 'locked' && fresh ? 'hurt' : st === 'open' || st === 'smashed' ? 'happy' : 'normal' })),
      fresh && st === 'smashed' ? 'fx-charge' : '');
    // inventory + strength
    s += hudPanel(12, 12, 236, 46) +
      at(40, 35, keyIcon(v.hasKey)) + text(40, 54, 'key', { size: 10, fill: '#495057' }) +
      at(88, 35, pickIcon(v.hasLockpick)) + text(88, 54, 'lockpick', { size: 10, fill: '#495057' }) +
      text(124, 31, 'strength', { size: 11, anchor: 'start', fill: '#495057' }) +
      bar(124, 38, 80, 10, v.strength / 100, '#e8590c') + text(212, 48, String(v.strength), { size: 13, anchor: 'start' });
    return svg(s);
  };

  /* 5. Power-up shield ----------------------------------------------------- */
  S.shield = function (v, c) {
    const fresh = c.fresh;
    let s = field({ sky: '#fff4e6', grass: '#a9e34b', dirt: '#c9a26a', dirtDots: '#b08a55' });
    // hearts
    const hp = Math.max(0, v.health);
    s += hudPanel(12, 12, 150, 40);
    for (let i = 0; i < 5; i++) s += at(32 + i * 26, 33, i < hp ? heart('#fa5252') : heart('none', '#adb5bd'));
    if (hp > 5) s += text(155, 38, '+' + (hp - 5), { size: 12, anchor: 'end' });
    s += hudPanel(330, 12, 138, 40) + text(346, 38, 'score ' + v.score, { size: 16, anchor: 'start' });
    // hero + shield bubble
    const hurt = fresh && c.fx === 'ouch';
    s += '<ellipse cx="200" cy="202" rx="26" ry="5" fill="#000" opacity=".12"/>';
    s += at(200, 200, scaled(1.3, hero({ eyes: hurt ? 'hurt' : v.shieldOn ? 'happy' : 'normal' })), hurt ? 'fx-knock' : '');
    if (v.shieldOn) {
      s += at(200, 168, '<circle r="50" fill="#74c0fc" fill-opacity=".25" stroke="#339af0" stroke-width="3"/>' +
        '<path d="M-30,-30 a42,42 0 0 1 22,-12" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".8"/>', 'fx-shimmer');
    }
    // enemy
    const ex = v.touchingEnemy ? 262 : 410;
    s += '<ellipse cx="' + ex + '" cy="202" rx="22" ry="4" fill="#000" opacity=".12"/>';
    s += at(ex, 200, scaled(1.2, spiky()), fresh && c.fx === 'bounce' ? 'fx-fly' : '');
    if (!v.touchingEnemy) s += text(410, 140, 'far away', { size: 12, fill: '#868e96' });
    if (hurt) {
      s += '<rect width="480" height="240" fill="#fa5252" class="fx-flash" opacity="0"/>';
      s += floater(200, 96, '-1 heart', '#e03131', true);
    }
    if (fresh && c.fx === 'bounce') s += floater(300, 100, '+100', '#2f9e44', true);
    return svg(s);
  };

  /* 6. The item shop ------------------------------------------------------- */
  function shopItem(price) {
    if (price === 25) return { name: 'Potion', art: '<path d="M-6,-26 h12 v8 l10,14 q4,16 -16,18 q-20,-2 -16,-18 l10,-14z" fill="#ff8787" stroke="#c92a2a" stroke-width="2.5"/><rect x="-8" y="-31" width="16" height="7" rx="2" fill="#a9662f"/><ellipse cx="-6" cy="-2" rx="3" ry="5" fill="#fff" opacity=".5"/>' };
    if (price === 80) return { name: 'Shield', art: '<path d="M0,-30 L22,-22 Q22,6 0,18 Q-22,6 -22,-22 Z" fill="#4dabf7" stroke="#1864ab" stroke-width="3"/><path d="M0,-20 V10 M-12,-10 H12" stroke="#fab005" stroke-width="4"/>' };
    if (price === 150) return { name: 'Sword', art: '<g transform="rotate(-40)"><path d="M-4,-38 L0,-46 L4,-38 V6 H-4Z" fill="#dee2e6" stroke="#495057" stroke-width="2"/><rect x="-13" y="6" width="26" height="6" rx="2" fill="#fab005" stroke="#e67700" stroke-width="1.5"/><rect x="-3" y="12" width="6" height="14" fill="#5c3317"/></g>' };
    return { name: 'Mystery box', art: '<rect x="-18" y="-30" width="36" height="34" rx="4" fill="#9775fa" stroke="#5f3dc4" stroke-width="2.5"/><text x="0" y="-5" font-size="22" font-weight="900" text-anchor="middle" fill="#fff">?</text>' };
  }

  S.shop = function (v, c) {
    const fresh = c.fresh;
    const it = shopItem(v.price);
    let s = '<rect width="480" height="240" fill="#ffe8cc"/>';
    s += '<g fill="#ffd8a8">' + [0, 1, 2, 3, 4, 5, 6, 7].map(i => '<rect x="' + (i * 60) + '" y="0" width="30" height="160"/>').join('') + '</g>';
    // shelves
    s += '<rect x="20" y="70" width="150" height="8" fill="#a9662f"/><rect x="310" y="70" width="150" height="8" fill="#a9662f"/>';
    s += at(50, 70, '<rect x="-8" y="-18" width="16" height="18" rx="3" fill="#69db7c" stroke="#2b8a3e" stroke-width="2"/>') +
      at(90, 70, '<rect x="-8" y="-22" width="16" height="22" rx="3" fill="#74c0fc" stroke="#1971c2" stroke-width="2"/>') +
      at(130, 70, '<rect x="-8" y="-16" width="16" height="16" rx="3" fill="#ffa8a8" stroke="#c92a2a" stroke-width="2"/>');
    // shopkeeper
    const keeperFx = fresh && c.fx === 'poor' ? 'fx-shake' : fresh && c.fx === 'buy' ? 'fx-hop' : '';
    s += at(360, 168,
      '<rect x="-30" y="-60" width="60" height="62" rx="20" fill="#e599f7" stroke="#9c36b5" stroke-width="2.5"/>' +
      '<rect x="-18" y="-34" width="36" height="36" rx="6" fill="#fff" stroke="#ced4da" stroke-width="1.5"/>' +
      '<circle cx="0" cy="-76" r="22" fill="#ffd8a8" stroke="#e8a46b" stroke-width="2"/>' +
      '<circle cx="-8" cy="-80" r="3" fill="#1f2937"/><circle cx="8" cy="-80" r="3" fill="#1f2937"/>' +
      '<path d="M-12,-68 q6,6 12,0 q6,6 12,0" fill="#5c3317"/>' +
      '<path d="M-22,-86 q22,-24 44,0 z" fill="#5c3317"/>', keeperFx);
    // counter
    s += '<rect x="0" y="168" width="480" height="72" fill="#a9662f"/><rect x="0" y="168" width="480" height="9" fill="#c47f3c"/>';
    s += '<g stroke="#8b4f21" stroke-width="2">' + [60, 140, 220, 300, 380, 460].map(x => '<line x1="' + x + '" x2="' + x + '" y1="180" y2="240"/>').join('') + '</g>';
    // item for sale
    const bought = fresh && c.fx === 'buy';
    s += at(200, 162, it.art, bought ? 'fx-tobag' : '');
    s += hudPanel(132, 196, 136, 32) + text(200, 217, it.name + ': ' + v.price + ' gold', { size: 13 });
    // hero (customer)
    s += at(80, 236, scaled(1.3, hero({ eyes: fresh && c.fx === 'buy' ? 'happy' : fresh ? 'hurt' : 'normal' })));
    // gold
    s += hudPanel(12, 12, 132, 40) + at(34, 32, coin(11)) + text(52, 38, String(v.gold), { size: 18, anchor: 'start' });
    // bag slots
    const size = clamp(v.bagSize, 1, 10);
    const w = 22, gap = 4, bw = size * (w + gap) + 54;
    s += hudPanel(468 - bw, 12, bw, 40) + text(476 - bw, 37, 'bag', { size: 13, anchor: 'start', fill: '#495057' });
    let slots = '';
    for (let i = 0; i < size; i++) {
      const x = 468 - bw + 44 + i * (w + gap);
      const full = i < v.items;
      slots += '<rect x="' + x + '" y="21" width="' + w + '" height="22" rx="5" fill="' + (full ? '#ffd43b' : '#f1f3f5') + '" stroke="' + (full ? '#e67700' : '#adb5bd') + '" stroke-width="1.8"/>';
      if (full) slots += '<circle cx="' + (x + w / 2) + '" cy="32" r="4" fill="#e67700"/>';
    }
    s += at(0, 0, slots, fresh && c.fx === 'full' ? 'fx-shake' : '');
    if (v.items > size) s += text(468, 66, (v.items - size) + ' too many!', { size: 12, anchor: 'end', fill: '#e03131' });
    if (bought && c.before) s += floater(84, 150, '-' + (c.before.gold - v.gold) + ' gold', '#e67700', true);
    return svg(s);
  };

  /* 7. Sneak past the guard ------------------------------------------------ */
  S.guard = function (v, c) {
    const fresh = c.fresh;
    const gx = 430, unit = 34;
    const sight = c.refs && c.refs.sight ? c.refs.sight.v : 4;
    const loud = c.refs && c.refs.loud ? c.refs.loud.v : 7;
    let s = '<rect width="480" height="240" fill="#1c2541"/>' +
      '<circle cx="70" cy="46" r="20" fill="#fff9db"/><circle cx="78" cy="40" r="18" fill="#1c2541"/>' +
      '<g fill="#fff" opacity=".7"><circle cx="160" cy="30" r="1.5"/><circle cx="250" cy="52" r="1.2"/><circle cx="330" cy="22" r="1.6"/><circle cx="400" cy="60" r="1.2"/><circle cx="210" cy="16" r="1"/></g>';
    s += '<rect y="200" width="480" height="40" fill="#3a506b"/><rect y="200" width="480" height="5" fill="#5bc0be" opacity=".5"/>';
    // distance ticks
    for (let d = 0; d <= 10; d++) {
      const x = gx - d * unit;
      if (x < 0) break;
      s += '<line x1="' + x + '" x2="' + x + '" y1="205" y2="213" stroke="#9fb3c8" stroke-width="2"/>' +
        text(x, 228, String(d), { size: 11, fill: '#9fb3c8', weight: 700 });
    }
    // vision cone: everything closer than "sight" steps
    const coneEnd = gx - sight * unit;
    const alert = v.guard === 'alert';
    s += '<path d="M' + (gx - 10) + ',150 L' + coneEnd + ',112 L' + coneEnd + ',200 L' + (gx - 10) + ',200 Z" fill="' + (alert ? '#ff6b6b' : '#ffe066') + '" opacity=".28"/>';
    s += text(coneEnd + 4, 106, 'sees closer than ' + sight, { size: 11, anchor: 'start', fill: '#ffe066' });
    // hero
    const d = clamp(v.distance, 0, 12);
    const hx = gx - Math.max(d, 0.6) * unit;
    // noise rings
    const rings = clamp(Math.ceil(v.noise / 2.5), 0, 4);
    let ring = '';
    for (let i = 1; i <= rings; i++) {
      ring += '<path d="M' + (-14 - i * 9) + ',-40 a' + (20 + i * 9) + ',' + (20 + i * 9) + ' 0 0 1 0,' + (24 + i * 6) +
        ' M' + (14 + i * 9) + ',-40 a' + (20 + i * 9) + ',' + (20 + i * 9) + ' 0 0 0 0,' + (24 + i * 6) + '" stroke="' + (v.noise > loud ? '#ff8787' : '#a5d8ff') + '" stroke-width="2.5" fill="none" opacity="' + (1 - i * 0.18) + '"/>';
    }
    s += at(hx, 200, ring);
    s += at(hx, 200, scaled(1.2, hero({ color: '#5f3dc4', edge: '#3b2a8c', eyes: alert && fresh ? 'hurt' : 'normal' })));
    if (v.hiding) {
      s += at(hx, 202, '<g fill="#2b8a3e" stroke="#1b5e2b" stroke-width="2"><circle cx="-20" cy="-18" r="17"/><circle cx="18" cy="-18" r="17"/><circle cx="0" cy="-30" r="20"/><circle cx="-4" cy="-10" r="16"/></g>' +
        '<g fill="#51cf66"><circle cx="-12" cy="-34" r="3"/><circle cx="10" cy="-22" r="2.5"/><circle cx="-22" cy="-16" r="2"/></g>');
    }
    // guard
    s += at(gx, 200,
      '<rect x="-12" y="-22" width="9" height="22" fill="#2b2d42"/><rect x="3" y="-22" width="9" height="22" fill="#2b2d42"/>' +
      '<rect x="-17" y="-66" width="34" height="48" rx="9" fill="#8d99ae" stroke="#4a4e69" stroke-width="2.5"/>' +
      '<circle cx="0" cy="-80" r="14" fill="#ffd8a8" stroke="#e8a46b" stroke-width="2"/>' +
      '<path d="M-16,-82 Q0,-104 16,-82 Z" fill="#adb5bd" stroke="#4a4e69" stroke-width="2"/>' +
      '<path d="M2,-100 q8,-10 14,-2" stroke="#e03131" stroke-width="4" fill="none" stroke-linecap="round"/>' +
      '<circle cx="-7" cy="-79" r="2.6" fill="#1f2937"/>' +
      '<line x1="-26" y1="-112" x2="-26" y2="0" stroke="#a9662f" stroke-width="4"/>' +
      '<path d="M-31,-110 L-26,-124 L-21,-110 Z" fill="#dee2e6" stroke="#495057" stroke-width="1.5"/>');
    // guard mood
    const mood = v.guard === 'alert' ? { t: '!', fill: '#fa5252' } : v.guard === 'suspicious' ? { t: '?', fill: '#fab005' } : { t: 'z z', fill: '#74c0fc' };
    s += at(gx - 4, 70, '<rect x="-20" y="-24" width="40" height="32" rx="10" fill="#fff"/><path d="M-4,8 l4,8 l4,-8z" fill="#fff"/>' +
      text(0, 0, mood.t, { size: mood.t.length > 1 ? 15 : 24, fill: mood.fill }), fresh ? 'fx-pop' : '');
    if (alert && fresh) s += '<rect width="480" height="240" fill="#fa5252" class="fx-flash" opacity="0"/>';
    // labels
    s += hudPanel(12, 12, 160, 34) + text(24, 34, 'distance ' + v.distance + ' · noise ' + v.noise, { size: 12, anchor: 'start' });
    return svg(s);
  };

  /* 8. Level up ------------------------------------------------------------ */
  function foe(xp) {
    if (xp >= 150) return { name: 'dragon', art: '<path d="M-34,-30 L-60,-56 L-40,-26 Z M20,-32 L48,-62 L34,-24 Z" fill="#e03131" stroke="#a51111" stroke-width="2"/>' +
      '<ellipse cx="0" cy="-26" rx="34" ry="26" fill="#fa5252" stroke="#a51111" stroke-width="2.5"/>' +
      '<path d="M-14,-50 l-4,-12 l9,8 M10,-50 l4,-12 l-9,8" fill="#ffe066" stroke="#a51111" stroke-width="1.5"/>' +
      '<circle cx="-12" cy="-32" r="4" fill="#fff"/><circle cx="12" cy="-32" r="4" fill="#fff"/><circle cx="-12" cy="-32" r="2" fill="#1f2937"/><circle cx="12" cy="-32" r="2" fill="#1f2937"/>' +
      '<path d="M-10,-14 h20" stroke="#a51111" stroke-width="3" stroke-linecap="round"/><path d="M-6,-14 l2,5 l2,-5 M2,-14 l2,5 l2,-5" fill="#fff"/>' };
    if (xp >= 50) return { name: 'troll', art: '<ellipse cx="0" cy="-30" rx="30" ry="32" fill="#8ce99a" stroke="#2b8a3e" stroke-width="2.5"/>' +
      '<circle cx="-10" cy="-40" r="4" fill="#1f2937"/><circle cx="10" cy="-40" r="4" fill="#1f2937"/>' +
      '<path d="M-14,-20 q14,-6 28,0" stroke="#2b8a3e" stroke-width="3" fill="none"/><path d="M-10,-22 l-2,-8 l5,6 M10,-22 l2,-8 l-5,6" fill="#fff" stroke="#adb5bd"/>' +
      '<ellipse cx="-18" cy="0" rx="9" ry="4" fill="#2b8a3e"/><ellipse cx="18" cy="0" rx="9" ry="4" fill="#2b8a3e"/>' };
    return { name: 'bat', art: '<g transform="translate(0,-60)"><path d="M-6,0 Q-24,-18 -40,-6 Q-30,-4 -28,6 Q-18,0 -6,6 Z M6,0 Q24,-18 40,-6 Q30,-4 28,6 Q18,0 6,6 Z" fill="#7048e8" stroke="#4c2fb0" stroke-width="2"/>' +
      '<circle r="11" fill="#845ef7" stroke="#4c2fb0" stroke-width="2"/><circle cx="-4" cy="-2" r="2.2" fill="#fff"/><circle cx="4" cy="-2" r="2.2" fill="#fff"/>' +
      '<path d="M-3,5 l1.5,3 l1.5,-3 M0,5 l1.5,3 l1.5,-3" fill="#fff"/></g>' };
  }

  S.levelup = function (v, c) {
    const fresh = c.fresh;
    const up = c.fx === 'levelup';
    let s = field({ sky: '#f3f0ff', grass: '#8ce99a', dirt: '#c9a26a', dirtDots: '#b08a55' });
    // XP bar
    const need = v.xpNeeded || 1;
    s += hudPanel(12, 12, 456, 40) + text(26, 38, 'XP', { size: 15, anchor: 'start', fill: '#7048e8' }) +
      bar(56, 24, 280, 14, v.xp / need, '#845ef7') + text(346, 37, v.xp + ' / ' + v.xpNeeded, { size: 13, anchor: 'start' });
    // rays behind the hero on a level up
    if (up) {
      let rays = '';
      for (let i = 0; i < 12; i++) rays += '<path d="M0,0 L-9,-110 L9,-110 Z" fill="#ffe066" opacity=".6" transform="rotate(' + i * 30 + ')"/>';
      s += at(180, 160, rays, 'fx-spin');
    }
    s += '<ellipse cx="180" cy="202" rx="28" ry="5" fill="#000" opacity=".12"/>';
    s += at(180, 200, scaled(1.4, hero({ eyes: up ? 'happy' : 'normal', blush: up })), fresh && up ? 'fx-hop' : '');
    // level badge
    s += at(180, 112, '<rect x="-30" y="-15" width="60" height="26" rx="13" fill="#7048e8" stroke="#fff" stroke-width="2.5"/>' +
      text(0, 4, 'LV ' + v.level, { size: 15, fill: '#fff' }), fresh && up ? 'fx-pop' : '');
    // enemy
    const f = foe(v.enemyXP);
    s += '<ellipse cx="370" cy="202" rx="30" ry="5" fill="#000" opacity=".12"/>';
    s += at(370, 200, f.art, fresh ? 'fx-poof' : '');
    s += text(370, 226, f.name + ' · ' + v.enemyXP + ' XP', { size: 12, fill: '#495057' });
    if (fresh) s += floater(370, 120, '+' + v.enemyXP + ' XP', '#7048e8', true);
    if (up) s += bigWord(180, 82, 'LEVEL UP!', '#f08c00', fresh, 30);
    return svg(s);
  };

  TT.scenes = S;
})();
