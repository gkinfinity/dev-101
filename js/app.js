/* Turner’s Teach Tree pages: home, the scenarios, the warm-up and the cheat sheet. */
(function () {
  'use strict';
  const TT = window.TT;
  const B = TT.B;
  const esc = TT.esc;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const app = $('#app');

  /* ---------- saved choices (each viewer's own browser) ---------- */
  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem('teachtree:' + key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem('teachtree:' + key, JSON.stringify(value)); } catch (e) { /* private window */ }
    },
  };
  Object.assign(TT.settings, store.get('settings', {}));
  const saveSettings = () => store.set('settings', TT.settings);
  let progress = store.get('progress', {});

  const SPEEDS = { slow: 1500, normal: 850, fast: 350, instant: 0 };
  const clone = o => JSON.parse(JSON.stringify(o));

  // Text in the scenario files is written with ← and ≤ ≥ ≠; match the chosen style.
  function notate(s) {
    s = s.replace(/←/g, TT.settings.assign);
    if (TT.settings.cmp === 'code') s = s.replace(/≤/g, '&lt;=').replace(/≥/g, '&gt;=').replace(/≠/g, '!=');
    return s;
  }

  const CHIP = {
    'Variables': 'var', 'Math': 'var',
    'IF / ELSE': 'ctl', 'ELSE IF': 'ctl',
    'Comparison': 'op', 'AND': 'op', 'OR': 'op', 'NOT': 'op', 'Booleans': 'op', 'Parentheses': 'op',
  };
  const chips = list => list.map(c => '<span class="chip chip-' + (CHIP[c] || 'op') + '">' + esc(c) + '</span>').join('');

  function toast(html, kind) {
    const box = $('#toasts');
    const t = document.createElement('div');
    t.className = 'toast ' + (kind || '');
    t.innerHTML = html;
    box.appendChild(t);
    setTimeout(() => t.classList.add('out'), 3600);
    setTimeout(() => t.remove(), 4100);
  }

  function pulse(el) {
    el.classList.remove('pulse');
    void el.offsetWidth;
    el.classList.add('pulse');
  }

  const initVals = sc => { const o = {}; sc.vars.forEach(v => { o[v.name] = v.init; }); return o; };
  const doneCount = sc => Object.keys(progress[sc.id] || {}).length;

  /* ---------- routing ---------- */
  let cleanup = null;
  function route() {
    if (cleanup) { cleanup(); cleanup = null; }
    const id = location.hash.replace(/^#\/?/, '');
    document.querySelectorAll('.nav a').forEach(a => {
      const href = a.getAttribute('href').replace(/^#\/?/, '');
      a.classList.toggle('active', href === id || (!href && TT.scenarios.some(s => s.id === id)));
    });
    const sc = TT.scenarios.find(s => s.id === id);
    if (sc) scenarioPage(sc);
    else if (id === 'warmup') warmupPage();
    else if (id === 'cheatsheet') cheatPage();
    else homePage();
    window.scrollTo(0, 0);
  }

  /* ===================================================================== */
  /* Home                                                                   */
  /* ===================================================================== */
  function homePage() {
    document.title = 'Turner’s Teach Tree — Learn to Code One Branch at a Time';
    const cards = TT.scenarios.map(sc => {
      const prog = TT.prepare(sc.code(B));
      const done = doneCount(sc);
      const total = sc.challenges.length;
      return '<a class="card" href="#/' + sc.id + '">' +
        '<div class="card-art">' + sc.scene(initVals(sc), { refs: prog.refs }) + '</div>' +
        '<div class="card-body">' +
        '<div class="card-top"><span class="card-num">' + sc.num + '</span><h3>' + esc(sc.title) + '</h3></div>' +
        '<p>' + esc(sc.blurb) + '</p>' +
        '<div class="chips">' + chips(sc.concepts) + '</div>' +
        '<div class="card-progress' + (done === total ? ' all' : '') + '">' +
        (done ? (done === total ? '★ All challenges done' : done + ' of ' + total + ' challenges done') : total + ' challenges') +
        '</div></div></a>';
    }).join('');

    app.innerHTML =
      '<section class="intro">' +
      '<div class="intro-text">' +
      '<p class="kicker">Turner’s Teach Tree</p>' +
      '<h1>Build the rules behind every jump, door and level-up.</h1>' +
      '<p class="lead">Each scenario is a short piece of pseudocode that decides what happens on screen — whether a character can jump, whether a door opens, whether a guard spots you. Change the inputs, edit the code, and watch the computer work out every condition, one step at a time.</p>' +
      '<p class="pun">A <b>tech tree</b> unlocks new abilities one branch at a time. This is a <b>teach tree</b>: every scenario unlocks a new piece of programming — variables, math, comparisons, AND, OR and NOT.</p>' +
      '<div class="intro-ctas"><a class="btn btn-run" href="#/warmup">Start with the warm-up</a><a class="btn" href="#/' + TT.scenarios[0].id + '">Jump into scenario 1</a></div>' +
      '</div>' +
      '<ol class="how">' +
      '<li><b>Set the memory.</b> Click a variable to change it, or pick a ready-made situation.</li>' +
      '<li><b>Predict.</b> Which part of the IF will run? Decide before you click.</li>' +
      '<li><b>Run or Step.</b> Watch each condition get worked out until it is TRUE or FALSE.</li>' +
      '<li><b>Change the code.</b> Swap AND for OR, change ' + esc(TT.sym('>=')) + ' to &gt;, switch off a NOT — and see what breaks.</li>' +
      '</ol></section>' +
      '<h2 class="section-title">Scenarios</h2>' +
      '<div class="cards">' + cards + '</div>' +
      '<details class="teacher"><summary>Tips for running this in class</summary><ul>' +
      '<li>Turn on <b>Predict first</b> on a scenario page. Students must pick which part of the IF will run before the code runs — great for a quick show of hands.</li>' +
      '<li>Use <b>Step</b> instead of Run to talk through one line at a time. The <b>Step by step</b> panel shows every condition being simplified, like working out a math problem.</li>' +
      '<li>Each scenario has a deliberate "what if we change this?" bug: AND to OR in the jump, removing NOT on the shield, ≥ versus &gt; for coins, and a missing check on damage.</li>' +
      '<li>The ⚙ button switches notation: <code>←</code> or <code>=</code> for assignment, and <code>= ≠ ≤ ≥</code> or <code>== != &lt;= &gt;=</code> for comparisons, to match your course.</li>' +
      '<li>Challenge progress is saved in each student\'s own browser. Nothing is sent anywhere.</li>' +
      '</ul></details>';
  }

  /* ===================================================================== */
  /* A scenario                                                             */
  /* ===================================================================== */
  const pages = {};  // each scenario keeps its memory and code while the tab is open

  function scenarioPage(sc) {
    document.title = sc.title + ' — Turner’s Teach Tree';
    const P = pages[sc.id] || (pages[sc.id] = {
      prog: TT.prepare(sc.code(B)), vals: initVals(sc), fx: null, lastOut: null, edited: false, marks: [],
    });
    P.run = null;
    P.marks = [];

    const speedOpts = ['slow', 'normal', 'fast', 'instant'].map(s =>
      '<option value="' + s + '"' + (TT.settings.speed === s ? ' selected' : '') + '>' + s[0].toUpperCase() + s.slice(1) + '</option>').join('');
    const prev = TT.scenarios[sc.num - 2], next = TT.scenarios[sc.num];

    app.innerHTML =
      '<div class="sc-head">' +
      '<a class="back-link" href="#/">← All scenarios</a>' +
      '<div class="sc-title"><span class="sc-num">' + sc.num + '</span><div><h1>' + esc(sc.title) + '</h1>' +
      '<div class="chips">' + chips(sc.concepts) + '</div></div></div>' +
      '<p class="story">' + esc(sc.story) + '</p></div>' +
      '<div class="sc-cols">' +
      '<div class="col">' +
      '<section class="panel p-scene">' +
      '<div class="scene" id="scene"></div>' +
      '<div class="screen-out" id="out"></div>' +
      '<div class="presets"><span class="presets-label">Try a situation:</span>' +
      sc.presets.map((p, i) => '<button type="button" class="chip-btn' + (p.run ? ' runs' : '') + '" data-preset="' + i + '">' +
        (p.run ? '<span aria-hidden="true">▶ </span>' : '') + esc(p.label) + '</button>').join('') + '</div>' +
      '</section>' +
      '<section class="panel p-mem">' +
      '<div class="panel-head"><h2>Memory</h2><span class="panel-sub">each box is a variable — click to change it</span></div>' +
      '<div class="mem" id="mem"></div></section>' +
      '<section class="panel p-chal"><div class="panel-head"><h2>Challenges</h2><span class="panel-sub" id="chal-count"></span></div>' +
      '<ol class="chal" id="chal"></ol></section>' +
      '<section class="panel p-think"><div class="panel-head"><h2>Think about it</h2></div>' +
      '<ul class="think">' + sc.think.map(t => '<li>' + notate(t) + '</li>').join('') + '</ul></section>' +
      '</div>' +
      '<div class="col">' +
      '<section class="panel p-code" id="code-panel">' +
      '<div class="panel-head"><h2>Code</h2>' +
      '<div class="seg" role="group" aria-label="How to show the code">' +
      '<button type="button" data-view="blocks">Blocks</button><button type="button" data-view="pseudo">Pseudocode</button></div></div>' +
      '<div class="run-bar">' +
      '<button type="button" class="btn btn-run" id="run">▶ Run</button>' +
      '<button type="button" class="btn" id="step">Step ⏵</button>' +
      '<button type="button" class="btn btn-ghost" id="reset" title="Put the memory back to how it started">↺ Reset</button>' +
      '<span class="spacer"></span>' +
      '<label class="mini"><input type="checkbox" id="predict"' + (TT.settings.predict ? ' checked' : '') + '> Predict first</label>' +
      '<label class="mini">Speed <select id="speed">' + speedOpts + '</select></label>' +
      '</div>' +
      '<div class="code-wrap" id="code"></div>' +
      '<div class="undo-bar" id="undo" hidden><span>✎ You changed the code.</span> <button type="button" class="link-btn" id="undo-btn">Undo my changes</button></div>' +
      '<p class="code-hint">Click an operator like <b>AND</b> or <b>' + esc(TT.sym('>=')) + '</b>, a number, or <b>NOT</b> to change the code.</p>' +
      '</section>' +
      '<section class="panel p-trace"><div class="panel-head"><h2>Step by step</h2><span class="panel-sub">what the computer is thinking</span></div>' +
      '<ol class="trace" id="trace"></ol></section>' +
      '</div></div>' +
      '<nav class="pager">' +
      (prev ? '<a class="btn btn-ghost" href="#/' + prev.id + '">← ' + esc(prev.title) + '</a>' : '<span></span>') +
      (next ? '<a class="btn btn-ghost" href="#/' + next.id + '">' + esc(next.title) + ' →</a>' : '<a class="btn btn-ghost" href="#/">All scenarios</a>') +
      '</nav>';

    const sceneEl = $('#scene'), outEl = $('#out'), codeEl = $('#code'), memEl = $('#mem'),
      traceEl = $('#trace'), chalEl = $('#chal'), runBtn = $('#run'), stepBtn = $('#step'),
      resetBtn = $('#reset'), codePanel = $('#code-panel');

    /* ----- drawing ----- */
    function drawScene(vals, fresh) {
      const before = P.run ? P.run.before : P.lastBefore;
      sceneEl.innerHTML = sc.scene(vals, { fx: P.fx, fresh: !!fresh, before, refs: P.prog.refs });
    }

    function setOut(text, kind) {
      outEl.className = 'screen-out' + (kind ? ' ' + kind : '') + (text != null ? ' has' : '');
      outEl.innerHTML = '<span class="out-label">OUTPUT</span><span class="out-text">' +
        (text == null ? '<i>nothing yet</i>' : esc(text)) + '</span>';
      if (text != null) pulse(outEl);
    }

    const varDef = name => sc.vars.find(v => v.name === name);

    function valBadge(v) {
      if (v === true) return '<span class="vb vb-t">TRUE</span>';
      if (v === false) return '<span class="vb vb-f">FALSE</span>';
      if (typeof v === 'string') return '<span class="vb vb-s">"' + esc(v) + '"</span>';
      return '<span class="vb vb-n">' + esc(TT.fmt(v)) + '</span>';
    }

    // changed: { name: oldValue } for boxes to light up
    function drawMem(vals, changed) {
      changed = changed || {};
      const locked = !!P.run;
      memEl.innerHTML = sc.vars.map(vd => {
        const v = vals[vd.name];
        const role = vd.role || 'input';
        const dis = locked ? ' disabled' : '';
        let ctl;
        if (role !== 'input') ctl = '<div class="mem-val">' + valBadge(v) + '</div>';
        else if (vd.type === 'bool') {
          ctl = '<button type="button" class="tog ' + (v ? 'on' : 'off') + '" data-var="' + vd.name + '" aria-pressed="' + v + '"' + dis +
            '><span class="tog-knob"></span><span class="tog-word">' + (v ? 'TRUE' : 'FALSE') + '</span></button>';
        } else {
          ctl = '<div class="numctl"><button type="button" class="nb" data-dec="' + vd.name + '" aria-label="Make ' + vd.name + ' smaller"' + dis + '>−</button>' +
            '<input type="number" data-var="' + vd.name + '" value="' + esc(TT.fmt(v)) + '" step="' + (vd.step || 1) + '" aria-label="' + vd.name + '"' + dis + '>' +
            '<button type="button" class="nb" data-inc="' + vd.name + '" aria-label="Make ' + vd.name + ' bigger"' + dis + '>+</button></div>';
        }
        const ch = Object.prototype.hasOwnProperty.call(changed, vd.name);
        const tag = role === 'calc' ? 'worked out by the code' : role === 'output' ? 'set by the code' : '';
        return '<div class="box role-' + role + (ch ? ' changed' : '') + '">' +
          '<div class="box-top"><span class="box-name">' + esc(vd.name) + '</span></div>' + ctl +
          '<div class="box-hint">' + (ch ? 'was ' + esc(TT.fmt(changed[vd.name])) : esc(tag || vd.hint || '')) + '</div></div>';
      }).join('');
    }

    function drawCode() {
      codeEl.innerHTML = TT.renderCode(P.prog, TT.settings.view);
      document.querySelectorAll('.seg [data-view]').forEach(b => {
        const on = b.dataset.view === TT.settings.view;
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', on);
      });
      $('#undo').hidden = !P.edited;
      P.marks.forEach(applyMark);
    }

    function drawChallenges(justDone) {
      const done = progress[sc.id] || {};
      chalEl.innerHTML = sc.challenges.map((ch, i) =>
        '<li class="' + (done[i] ? 'done' : '') + (justDone && justDone.includes(i) ? ' just' : '') + '">' +
        '<span class="tick" aria-hidden="true">' + (done[i] ? '✓' : i + 1) + '</span><span>' + notate(esc(ch.text)) + '</span></li>').join('');
      $('#chal-count').textContent = doneCount(sc) + ' of ' + sc.challenges.length + ' done';
    }

    function traceEmpty() {
      traceEl.innerHTML = '<li class="tr-empty">Press <b>Run</b> to watch the computer work through the code, or <b>Step</b> to go one line at a time.</li>';
    }

    /* ----- highlighting the running code ----- */
    const sidSel = id => '[data-sid="' + id + '"]';
    const headSel = (id, b) => '[data-of="' + id + '"][data-head="' + b + '"]';
    const footSel = id => '[data-of="' + id + '"][data-foot]';

    function applyMark(m) {
      codeEl.querySelectorAll(m.sel).forEach(n => {
        if (m.cls) n.classList.add(m.cls);
        if (m.res) {
          const r = n.querySelector(':scope > .res, :scope > .ln-code > .res');
          if (r) { r.textContent = m.res.text; r.className = 'res show ' + m.res.cls; }
        }
      });
    }
    function mark(sel, cls, res) { const m = { sel, cls, res }; P.marks.push(m); applyMark(m); }
    function unmarkNow() {
      P.marks = P.marks.filter(m => m.cls !== 'now');
      codeEl.querySelectorAll('.now').forEach(n => n.classList.remove('now'));
    }
    function clearMarks() { P.marks = []; drawCode(); }

    function markSkipped(list) {
      TT.allStatements(list).forEach(s => mark(sidSel(s.id) + ', [data-of="' + s.id + '"]', 'skip'));
    }
    function markIfDone(s, taken) {
      s.branches.forEach((b, i) => {
        if (i === taken) return;
        mark('[data-of="' + s.id + '"][data-body="' + i + '"]', 'skip');
        markSkipped(b.body);
        if (typeof taken === 'number' && i > taken) mark(headSel(s.id, i), 'skip');
      });
      if (s.else && taken !== 'else') {
        mark(headSel(s.id, 'else'), 'skip');
        mark('[data-of="' + s.id + '"][data-body="else"]', 'skip');
        markSkipped(s.else);
      }
    }

    /* ----- the step-by-step panel ----- */
    let stepNo = 0;
    function addTrace(html, cls) {
      const li = document.createElement('li');
      li.className = 'tr ' + (cls || '');
      li.innerHTML = html;
      traceEl.appendChild(li);
      traceEl.scrollTop = traceEl.scrollHeight;
      return li;
    }
    const num = () => '<span class="tr-n">' + ++stepNo + '</span>';
    const work = lines => lines.length ? '<div class="tr-work">' + lines.map(l => '<code>→ ' + l + '</code>').join('') + '</div>' : '';
    const assignHTML = name => '<span class="t-var">' + esc(name) + '</span> <span class="t-op">' + esc(TT.settings.assign) + '</span> ';

    function stmtText(s) {
      if (s.k === 'set') return assignHTML(s.name) + TT.exprHTML(TT.strip(s.expr));
      if (s.k === 'out') return '<span class="t-out">OUTPUT</span> <span class="t-str">"' + esc(s.text) + '"</span>';
      return TT.condHTML(s, 0) + ' <span class="t-ctl">THEN</span> …';
    }

    function traceStep(st) {
      switch (st.kind) {
        case 'set': {
          const same = st.before === st.after;
          addTrace('<div class="tr-line">' + num() + '<code>' + assignHTML(st.name) + st.lines[0] + '</code></div>' + work(st.lines.slice(1)) +
            '<div class="tr-note">' + (same
              ? '<span class="t-var">' + esc(st.name) + '</span> stays ' + TT.valHTML(st.after)
              : '<span class="t-var">' + esc(st.name) + '</span> was ' + TT.valHTML(st.before) + ', now it is ' + TT.valHTML(st.after)) + '</div>', 'k-set');
          break;
        }
        case 'cond':
          addTrace('<div class="tr-line">' + num() + '<code>' + TT.condHTML(st.stmt, st.branch) + '</code></div>' + work(st.lines.slice(1)) +
            '<div class="tr-note">' + (st.value
              ? '<b class="ok">TRUE</b> — so the code inside runs.'
              : '<b class="no">FALSE</b> — so the code inside is skipped.') + '</div>', st.value ? 'k-true' : 'k-false');
          break;
        case 'else':
          addTrace('<div class="tr-line">' + num() + '<code><span class="t-ctl">ELSE</span></code></div>' +
            '<div class="tr-note">Nothing above was TRUE, so the <b>ELSE</b> part runs.</div>', 'k-true');
          break;
        case 'none':
          addTrace('<div class="tr-line">' + num() + '<code><span class="t-ctl">END IF</span></code></div>' +
            '<div class="tr-note">Nothing was TRUE and there is no ELSE, so nothing inside this IF runs.</div>', 'k-false');
          break;
        case 'out':
          addTrace('<div class="tr-line">' + num() + '<code>' + stmtText(st.stmt) + '</code></div>' +
            '<div class="tr-note">The message appears on the screen.</div>', 'k-out');
          break;
        case 'off':
          addTrace('<div class="tr-line">' + num() + '<code class="struck">' + stmtText(st.stmt) + '</code></div>' +
            '<div class="tr-note">This code is switched <b>off</b>, so the computer skips it.</div>', 'k-off');
          break;
        case 'crash':
          addTrace('<div class="tr-line">' + num() + '<code>CRASH</code></div><div class="tr-note">' + esc(st.message) + '</div>', 'k-crash');
          break;
        case 'done':
          addTrace('<div class="tr-line"><span class="tr-n">✓</span><b>Finished.</b></div>', 'k-done');
          break;
      }
    }

    /* ----- running ----- */
    function applyStep(st) {
      const R = P.run;
      if (!st.silent) unmarkNow();
      switch (st.kind) {
        case 'set':
          mark(sidSel(st.sid), 'now'); mark(sidSel(st.sid), 'done');
          drawMem(R.work, { [st.name]: st.before });
          drawScene(R.work, false);
          break;
        case 'cond':
          mark(headSel(st.sid, st.branch), 'now');
          mark(headSel(st.sid, st.branch), st.value ? 'is-true' : 'is-false', { text: st.value ? 'TRUE' : 'FALSE', cls: st.value ? 't' : 'f' });
          break;
        case 'else':
          mark(headSel(st.sid, 'else'), 'now');
          mark(headSel(st.sid, 'else'), 'is-true', { text: 'runs', cls: 't' });
          break;
        case 'none':
          mark(footSel(st.sid), 'now');
          mark(footSel(st.sid), 'is-false', { text: 'nothing ran', cls: 'f' });
          break;
        case 'endif':
          markIfDone(st.stmt, st.taken);
          break;
        case 'out':
          mark(sidSel(st.sid), 'now'); mark(sidSel(st.sid), 'done');
          P.fx = st.fx; P.lastOut = st.text; R.outSeen = true;
          setOut(st.text);
          drawScene(R.work, true);
          break;
        case 'off':
          mark(sidSel(st.sid) + ', .pseudo ' + headSel(st.sid, 0), 'now');
          break;
        case 'crash':
          if (st.sid) mark(sidSel(st.sid), 'crash');
          P.lastOut = 'CRASH! ' + st.message;
          setOut(P.lastOut, 'crash');
          break;
      }
      traceStep(st);
    }

    function updateButtons() {
      const R = P.run;
      codePanel.classList.toggle('running', !!R);
      runBtn.disabled = !!(R && R.auto);
      runBtn.innerHTML = R ? (R.auto ? 'Running…' : '▶ Finish') : '▶ Run';
      stepBtn.innerHTML = R ? 'Next step ⏵' : 'Step ⏵';
      resetBtn.innerHTML = R ? '■ Stop' : '↺ Reset';
      resetBtn.title = R ? 'Stop this run' : 'Put the memory back to how it started';
      document.querySelectorAll('[data-preset]').forEach(b => { b.disabled = !!R; });
    }

    function start(manual) {
      if (P.run) {
        P.run.auto = !manual;
        advance();
        return;
      }
      if (TT.settings.predict && P.prog.main) askPredict(choice => begin(manual, choice));
      else begin(manual);
    }

    function begin(manual, prediction) {
      const R = P.run = {
        before: clone(P.vals), work: clone(P.vals), ctx: {}, auto: !manual, timer: null, prediction, outSeen: false,
      };
      R.gen = TT.run(P.prog, R.work, R.ctx);
      P.fx = null;
      P.marks = [];
      drawCode();
      traceEl.innerHTML = '';
      stepNo = 0;
      setOut(null);
      if (prediction !== undefined) {
        addTrace('<div class="tr-line"><span class="tr-n">?</span><span>Your prediction: <code>' + TT.condHTML(P.prog.main, prediction) + '</code></span></div>', 'k-predict');
      }
      drawMem(R.work);
      updateButtons();
      advance();
    }

    function advance() {
      const R = P.run;
      if (!R) return;
      clearTimeout(R.timer);
      let st;
      do {
        st = R.gen.next().value;
        if (st) applyStep(st);
      } while (st && st.silent);
      if (!st || st.kind === 'done' || st.kind === 'crash') { finish(); return; }
      if (R.auto) R.timer = setTimeout(advance, SPEEDS[TT.settings.speed] == null ? 850 : SPEEDS[TT.settings.speed]);
      updateButtons();
    }

    function finish() {
      const R = P.run;
      if (!R) return;
      clearTimeout(R.timer);
      P.run = null;
      unmarkNow();
      const changed = {};
      if (!R.ctx.crashed) {
        P.vals = R.work;
        Object.keys(R.before).forEach(k => { if (R.before[k] !== R.work[k]) changed[k] = R.before[k]; });
      } else {
        addTrace('<div class="tr-note">Because the program crashed, none of the changes were kept.</div>', 'k-crash');
      }
      P.lastBefore = R.before;
      drawMem(P.vals, changed);
      if (!R.outSeen && !R.ctx.crashed) drawScene(P.vals, true);
      const main = P.prog.main ? R.ctx.taken[P.prog.main.id] : undefined;
      if (R.prediction !== undefined && main !== undefined) {
        const ok = R.prediction === main;
        addTrace('<div class="verdict">' + (ok
          ? '<b class="ok">Your prediction was right!</b>'
          : '<b class="no">Not this time.</b> You picked <code>' + TT.condHTML(P.prog.main, R.prediction) + '</code> but <code>' +
            TT.condHTML(P.prog.main, main) + '</code> ran.') + '</div>', ok ? 'k-true' : 'k-false');
        toast(ok ? '🎯 Prediction correct!' : 'Prediction missed — check the step-by-step panel.', ok ? 'good' : 'bad');
      }
      if (!R.ctx.crashed) checkChallenges({ before: R.before, after: P.vals, main, refs: P.prog.refs });
      updateButtons();
    }

    function stop() {
      const R = P.run;
      if (!R) return;
      clearTimeout(R.timer);
      P.run = null;
      P.fx = null;
      addTrace('<div class="tr-note">Stopped. The memory was put back to how it was before this run.</div>', 'k-off');
      clearMarks();
      drawMem(P.vals);
      drawScene(P.vals, false);
      setOut(P.lastOut = null);
      updateButtons();
    }

    function resetMemory() {
      P.vals = initVals(sc);
      P.fx = null;
      P.lastOut = null;
      clearMarks();
      drawMem(P.vals);
      drawScene(P.vals, false);
      setOut(null);
      traceEmpty();
    }

    function checkChallenges(c) {
      const done = progress[sc.id] || (progress[sc.id] = {});
      const newly = [];
      sc.challenges.forEach((ch, i) => {
        if (done[i]) return;
        let ok = false;
        try { ok = !!ch.check(c); } catch (e) { ok = false; }
        if (ok) { done[i] = true; newly.push(i); }
      });
      if (!newly.length) return;
      store.set('progress', progress);
      drawChallenges(newly);
      newly.forEach(i => toast('⭐ Challenge ' + (i + 1) + ' complete!', 'good'));
    }

    function askPredict(cb) {
      const s = P.prog.main;
      const opts = s.branches.map((b, i) => i).concat([s.else ? 'else' : 'none']);
      const back = document.createElement('div');
      back.className = 'modal-back';
      back.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="pq">' +
        '<h2 id="pq">Predict: which part will run?</h2>' +
        '<p class="muted">Look at the memory and the code, then make your guess.</p>' +
        '<div class="pred-opts">' + opts.map(o => '<button type="button" class="pred" data-o="' + o + '"><code>' + TT.condHTML(s, o) + '</code></button>').join('') + '</div>' +
        '<div class="modal-foot"><button type="button" class="link-btn" data-cancel>Cancel</button></div></div>';
      document.body.appendChild(back);
      const close = () => { back.remove(); document.removeEventListener('keydown', onKey); };
      const onKey = e => { if (e.key === 'Escape') close(); };
      document.addEventListener('keydown', onKey);
      back.addEventListener('click', e => {
        const b = e.target.closest('button');
        if (e.target === back || (b && b.hasAttribute('data-cancel'))) { close(); return; }
        if (b && b.dataset.o != null) {
          close();
          const o = b.dataset.o;
          cb(/^\d+$/.test(o) ? +o : o);
        }
      });
      back.querySelector('.pred').focus();
    }

    /* ----- user changes ----- */
    function userChanged() {
      P.fx = null;
      P.lastOut = null;
      clearMarks();
      drawMem(P.vals);
      drawScene(P.vals, false);
      setOut(null);
    }

    function clampVar(vd, n) {
      if (vd.min != null) n = Math.max(vd.min, n);
      if (vd.max != null) n = Math.min(vd.max, n);
      return n;
    }

    memEl.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b || P.run) return;
      if (b.dataset.var) { P.vals[b.dataset.var] = !P.vals[b.dataset.var]; userChanged(); }
      const name = b.dataset.inc || b.dataset.dec;
      if (name) {
        const vd = varDef(name);
        const step = (vd.step || 1) * (b.dataset.inc ? 1 : -1);
        P.vals[name] = clampVar(vd, Math.round((P.vals[name] + step) * 100) / 100);
        userChanged();
      }
    });
    memEl.addEventListener('change', e => {
      const inp = e.target;
      if (inp.tagName !== 'INPUT' || P.run) return;
      const vd = varDef(inp.dataset.var);
      let n = parseFloat(inp.value);
      if (isNaN(n)) n = P.vals[vd.name];
      P.vals[vd.name] = clampVar(vd, n);
      userChanged();
    });

    function codeEdited() {
      P.edited = true;
      P.fx = null;
      clearMarks();
      drawScene(P.vals, false);
    }
    codeEl.addEventListener('change', e => {
      const t = e.target;
      if (P.run) { drawCode(); return; }
      if (t.matches('select.op')) { P.prog.nodes[t.dataset.eid].op = t.value; codeEdited(); }
      else if (t.matches('input.num')) {
        const n = parseFloat(t.value);
        if (!isNaN(n)) P.prog.nodes[t.dataset.eid].v = n;
        codeEdited();
      } else if (t.matches('input.opt-toggle')) { P.prog.stmts[t.dataset.sid].on = t.checked; codeEdited(); }
    });
    codeEl.addEventListener('input', e => {
      if (e.target.matches('input.num')) e.target.style.width = (Math.max(2, e.target.value.length + 1) + 1.2) + 'ch';
    });
    codeEl.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.target.matches('input.num')) e.target.blur();
    });
    codeEl.addEventListener('click', e => {
      const b = e.target.closest('.not-btn');
      if (!b || P.run) return;
      const n = P.prog.nodes[b.dataset.eid];
      n.on = !n.on;
      codeEdited();
    });

    $('#undo-btn').addEventListener('click', () => {
      P.prog = TT.prepare(sc.code(B));
      P.edited = false;
      codeEdited();
      P.edited = false;
      drawCode();
    });

    document.querySelectorAll('.seg [data-view]').forEach(b => b.addEventListener('click', () => {
      TT.settings.view = b.dataset.view;
      saveSettings();
      drawCode();
    }));

    $('.presets').addEventListener('click', e => {
      const b = e.target.closest('[data-preset]');
      if (!b || P.run) return;
      const p = sc.presets[+b.dataset.preset];
      Object.assign(P.vals, typeof p.set === 'function' ? p.set(P.vals) : p.set);
      userChanged();
      if (p.run) start(false);
      else pulse(runBtn);
    });

    runBtn.addEventListener('click', () => start(false));
    stepBtn.addEventListener('click', () => start(true));
    resetBtn.addEventListener('click', () => (P.run ? stop() : resetMemory()));
    $('#predict').addEventListener('change', e => { TT.settings.predict = e.target.checked; saveSettings(); });
    $('#speed').addEventListener('change', e => { TT.settings.speed = e.target.value; saveSettings(); });

    cleanup = () => {
      if (P.run) { clearTimeout(P.run.timer); P.run = null; }
      document.querySelectorAll('.modal-back').forEach(m => m.remove());
    };

    drawCode();
    drawMem(P.vals);
    drawScene(P.vals, false);
    setOut(P.lastOut);
    drawChallenges();
    traceEmpty();
    updateButtons();
  }

  /* ===================================================================== */
  /* Warm-up                                                                */
  /* ===================================================================== */
  const rnd = n => Math.floor(Math.random() * n);
  const pick = a => a[rnd(a.length)];
  const coin = () => !!rnd(2);

  function randCmp() {
    const a = rnd(10);
    const b = rnd(4) === 0 ? a : rnd(10);
    return B.cmp(a, pick(TT.OPS.cmp), b);
  }

  function makeQuestion(level) {
    const join = () => (coin() ? B.and : B.or);
    if (level === 0) {
      const t = rnd(3);
      if (t === 0) return { e: join()(B.bool(coin()), B.bool(coin())) };
      if (t === 1) return { e: B.not(B.bool(coin())) };
      return { e: randCmp() };
    }
    if (level === 1) {
      const t = rnd(3);
      if (t === 0) return { e: join()(randCmp(), randCmp()) };
      if (t === 1) return { e: B.not(randCmp()) };
      return { e: join()(B.bool(coin()), B.not(B.bool(coin()))) };
    }
    const vars = { x: rnd(10), y: rnd(10), ready: coin() };
    const t = rnd(3);
    let e;
    if (t === 0) e = B.and(B.or(B.cmp(B.v('x'), pick(TT.OPS.cmp), rnd(10)), B.cmp(B.v('y'), pick(TT.OPS.cmp), rnd(10))), B.not(B.v('ready')));
    else if (t === 1) e = B.or(B.and(B.cmp(B.v('x'), pick(TT.OPS.cmp), B.v('y')), B.v('ready')), B.cmp(B.math(B.v('x'), '+', B.v('y')), '>', rnd(15)));
    else e = B.not(B.and(B.cmp(B.v('x'), '>=', rnd(10)), B.cmp(B.v('y'), '<', rnd(10))));
    return { e, vars };
  }

  function warmupPage() {
    document.title = 'Logic Warm-Up — Turner’s Teach Tree';
    const W = { a: true, b: false, x: 7, op: '>', y: 3, score: 10, add: 5, busy: false, streak: 0, right: 0, tries: 0, best: store.get('best', 0) };
    const opOptions = TT.OPS.cmp.map(o => '<option value="' + esc(o) + '"' + (o === W.op ? ' selected' : '') + '>' + esc(TT.sym(o)) + '</option>').join('');

    app.innerHTML =
      '<div class="page-head"><a class="back-link" href="#/">← All scenarios</a><h1>Logic Warm-Up</h1>' +
      '<p class="lead">Four quick tools to review AND, OR, NOT, comparisons and assignment — then a rapid-fire quiz.</p></div>' +
      '<div class="warm-grid">' +
      // 1 logic
      '<section class="panel"><div class="panel-head"><h2>1 · AND, OR, NOT</h2></div>' +
      '<div class="ab-row"><div class="box"><div class="box-top"><span class="box-name">A</span></div><div id="wa"></div></div>' +
      '<div class="box"><div class="box-top"><span class="box-name">B</span></div><div id="wb"></div></div></div>' +
      '<div class="logic-out" id="wl"></div>' +
      '<table class="tt" id="wtt"></table><p class="muted small">Click a row to try it.</p></section>' +
      // 2 comparisons
      '<section class="panel"><div class="panel-head"><h2>2 · Comparisons</h2></div>' +
      '<div class="cmp-row"><input type="number" id="wx" value="' + W.x + '" aria-label="left number">' +
      '<select id="wop" class="op big-op" aria-label="comparison">' + opOptions + '</select>' +
      '<input type="number" id="wy" value="' + W.y + '" aria-label="right number"><span class="arrow">→</span><span id="wcr"></span></div>' +
      '<p class="cmp-words" id="wcw"></p>' +
      '<div class="cmp-grid" id="wcg"></div></section>' +
      // 3 assignment
      '<section class="panel"><div class="panel-head"><h2>3 · Assignment</h2><span class="panel-sub">changing a variable</span></div>' +
      '<div class="assign-line"><code class="assign-code">' + assignLine() + '</code>' +
      '<button type="button" class="btn btn-run" id="wrun">▶ Run this line</button><button type="button" class="btn btn-ghost" id="wreset" title="Set score back to 10">↺</button></div>' +
      '<div class="assign-demo"><div class="box big"><div class="box-top"><span class="box-name">score</span></div><div class="mem-val" id="wscore"></div></div>' +
      '<ol class="assign-steps" id="wsteps"></ol></div>' +
      '<p class="muted small">In math class, <code>score = score + 5</code> could never be true. In code, <code>' + esc(TT.settings.assign) +
      '</code> means <b>store</b>: the right side is worked out first using the OLD value, then the answer replaces it.</p></section>' +
      // 4 quiz
      '<section class="panel quiz-panel"><div class="panel-head"><h2>4 · Rapid fire: TRUE or FALSE?</h2><span class="panel-sub" id="wqs"></span></div>' +
      '<div class="quiz" id="wq"></div><p class="muted small">Keyboard: <b>T</b> = TRUE, <b>F</b> = FALSE, <b>Enter</b> = next. Questions get harder as your streak grows.</p></section>' +
      '</div>';

    function assignLine() {
      return '<span class="t-var">score</span> <span class="t-op">' + esc(TT.settings.assign) + '</span> <span class="t-var">score</span> <span class="t-op">+</span> ' +
        '<input type="number" class="num ps-num" id="wadd" value="' + W.add + '" aria-label="amount to add" style="width:4ch">';
    }

    function tog(id, val) {
      $(id).innerHTML = '<button type="button" class="tog ' + (val ? 'on' : 'off') + '" aria-pressed="' + val + '"><span class="tog-knob"></span><span class="tog-word">' + (val ? 'TRUE' : 'FALSE') + '</span></button>';
    }

    function drawLogic() {
      tog('#wa', W.a); tog('#wb', W.b);
      const row = (expr, val, words) => '<div class="lo-row"><code>' + expr + '</code><span class="arrow">→</span>' + TT.valHTML(val) + '<span class="lo-words">' + words + '</span></div>';
      const A = '<span class="t-var">A</span>', Bv = '<span class="t-var">B</span>';
      $('#wl').innerHTML =
        row(A + ' <span class="t-log">AND</span> ' + Bv, W.a && W.b, 'TRUE only when <b>both</b> are TRUE') +
        row(A + ' <span class="t-log">OR</span> ' + Bv, W.a || W.b, 'TRUE when <b>at least one</b> is TRUE') +
        row('<span class="t-log">NOT</span> ' + A, !W.a, '<b>flips</b> TRUE and FALSE');
      const rows = [[true, true], [true, false], [false, true], [false, false]];
      $('#wtt').innerHTML = '<thead><tr><th>A</th><th>B</th><th>A AND B</th><th>A OR B</th><th>NOT A</th></tr></thead><tbody>' +
        rows.map(([a, b]) => '<tr data-a="' + a + '" data-b="' + b + '" class="' + (a === W.a && b === W.b ? 'cur' : '') + '">' +
          [a, b, a && b, a || b, !a].map(v => '<td>' + TT.valHTML(v) + '</td>').join('') + '</tr>').join('') + '</tbody>';
    }
    $('#wa').addEventListener('click', () => { W.a = !W.a; drawLogic(); });
    $('#wb').addEventListener('click', () => { W.b = !W.b; drawLogic(); });
    $('#wtt').addEventListener('click', e => {
      const tr = e.target.closest('tr[data-a]');
      if (!tr) return;
      W.a = tr.dataset.a === 'true'; W.b = tr.dataset.b === 'true';
      drawLogic();
    });

    function drawCmp() {
      const x = W.x, y = W.y;
      const res = TT.evaluate(B.cmp(x, W.op, y), {});
      $('#wcr').innerHTML = TT.valHTML(res);
      $('#wcw').innerHTML = 'Is ' + x + ' <b>' + TT.opWords(W.op) + '</b> ' + y + '? ' + (res ? 'Yes, so it is TRUE.' : 'No, so it is FALSE.');
      $('#wcg').innerHTML = TT.OPS.cmp.map(o => {
        const v = TT.evaluate(B.cmp(x, o, y), {});
        return '<button type="button" class="cmp-cell' + (o === W.op ? ' cur' : '') + '" data-op="' + esc(o) + '"><code>' + x + ' ' + esc(TT.sym(o)) + ' ' + y + '</code>' + TT.valHTML(v) + '</button>';
      }).join('');
    }
    const readNum = (el, fallback) => { const n = parseFloat(el.value); return isNaN(n) ? fallback : n; };
    $('#wx').addEventListener('input', e => { W.x = readNum(e.target, W.x); drawCmp(); });
    $('#wy').addEventListener('input', e => { W.y = readNum(e.target, W.y); drawCmp(); });
    $('#wop').addEventListener('change', e => { W.op = e.target.value; drawCmp(); });
    $('#wcg').addEventListener('click', e => {
      const b = e.target.closest('[data-op]');
      if (!b) return;
      W.op = b.dataset.op;
      $('#wop').value = W.op;
      drawCmp();
    });

    let timers = [];
    function drawScore(flash) {
      const el = $('#wscore');
      el.innerHTML = '<span class="vb vb-n">' + TT.fmt(W.score) + '</span>';
      if (flash) pulse(el.parentElement);
    }
    function stepsList(active, oldV, add, newV) {
      const items = [
        'Look up <span class="t-var">score</span>' + (active >= 1 ? ': it holds <b>' + TT.fmt(oldV) + '</b>' : ''),
        'Work out the right side' + (active >= 2 ? ': <code>' + TT.fmt(oldV) + ' + ' + TT.fmt(add) + '</code> = <b>' + TT.fmt(newV) + '</b>' : ''),
        'Store the answer in <span class="t-var">score</span>' + (active >= 3 ? ' — the old ' + TT.fmt(oldV) + ' is replaced by <b>' + TT.fmt(newV) + '</b>' : ''),
      ];
      $('#wsteps').innerHTML = items.map((t, i) => '<li class="' + (i + 1 === active ? 'cur' : i + 1 < active ? 'past' : '') + '">' + t + '</li>').join('');
    }
    $('#wrun').addEventListener('click', () => {
      if (W.busy) return;
      W.busy = true;
      W.add = readNum($('#wadd'), W.add);
      const oldV = W.score, newV = Math.round((oldV + W.add) * 100) / 100;
      stepsList(1, oldV, W.add, newV);
      timers.push(setTimeout(() => stepsList(2, oldV, W.add, newV), 800));
      timers.push(setTimeout(() => { stepsList(3, oldV, W.add, newV); W.score = newV; drawScore(true); W.busy = false; }, 1600));
    });
    $('#wreset').addEventListener('click', () => { timers.forEach(clearTimeout); W.busy = false; W.score = 10; drawScore(true); stepsList(0); });

    /* quiz */
    let q = null, answered = false;
    const level = () => Math.min(2, Math.floor(W.streak / 3));
    function newQ() {
      q = makeQuestion(level());
      answered = false;
      const vars = q.vars ? '<div class="q-vars">' + Object.keys(q.vars).map(k => '<span><span class="t-var">' + k + '</span> = ' + TT.valHTML(q.vars[k]) + '</span>').join('') + '</div>' : '';
      $('#wq').innerHTML = vars + '<div class="q-expr"><code>' + TT.exprHTML(q.e) + '</code></div>' +
        '<div class="q-btns"><button type="button" class="q-btn q-t" data-a="1">TRUE</button><button type="button" class="q-btn q-f" data-a="0">FALSE</button></div>' +
        '<div class="q-fb" id="wqfb"></div>';
      drawQS();
    }
    function drawQS() {
      $('#wqs').textContent = 'level ' + (level() + 1) + ' · streak ' + W.streak + ' · best ' + W.best;
    }
    function answer(a) {
      if (answered) return;
      answered = true;
      const r = TT.solve(q.e, q.vars || {});
      const ok = a === r.value;
      W.tries++;
      if (ok) { W.right++; W.streak++; if (W.streak > W.best) { W.best = W.streak; store.set('best', W.best); } } else W.streak = 0;
      document.querySelectorAll('.q-btn').forEach(b => {
        b.disabled = true;
        if ((b.dataset.a === '1') === r.value) b.classList.add('correct');
      });
      $('#wqfb').innerHTML = '<div class="q-verdict ' + (ok ? 'ok' : 'no') + '">' + (ok ? 'Correct!' : 'Not quite.') + ' It is ' + TT.valHTML(r.value) + '.</div>' +
        '<div class="tr-work">' + r.lines.slice(1).map(l => '<code>→ ' + l + '</code>').join('') + '</div>' +
        '<button type="button" class="btn" id="wnext">Next question →</button>';
      $('#wnext').addEventListener('click', newQ);
      $('#wnext').focus();
      drawQS();
    }
    $('#wq').addEventListener('click', e => {
      const b = e.target.closest('[data-a]');
      if (b) answer(b.dataset.a === '1');
    });
    const onKey = e => {
      if (e.target.matches('input, select, textarea')) return;
      const k = e.key.toLowerCase();
      if (k === 't') answer(true);
      else if (k === 'f') answer(false);
      else if (k === 'enter' && answered && e.target.id !== 'wnext') newQ();
    };
    document.addEventListener('keydown', onKey);
    cleanup = () => { document.removeEventListener('keydown', onKey); timers.forEach(clearTimeout); };

    drawLogic();
    drawCmp();
    drawScore();
    stepsList(0);
    newQ();
  }

  /* ===================================================================== */
  /* Cheat sheet                                                            */
  /* ===================================================================== */
  function cheatPage() {
    document.title = 'Pseudocode Cheat Sheet — Turner’s Teach Tree';
    const a = esc(TT.settings.assign);
    const v = n => '<span class="t-var">' + n + '</span>';
    const k = w => '<span class="t-ctl">' + w + '</span>';
    const l = w => '<span class="t-log">' + w + '</span>';
    const o = w => '<span class="t-op">' + esc(w) + '</span>';
    const n = x => '<span class="t-num">' + x + '</span>';
    const T = TT.valHTML(true), F = TT.valHTML(false);

    const example = TT.prepare([
      B.iff([
        [B.cmp(B.v('score'), '>=', 90), [B.out('Gold medal!', null)]],
        [B.cmp(B.v('score'), '>=', 50), [B.out('Silver medal!', null)]],
      ], [B.out('Try again!', null)]),
    ]);

    const cmpRows = [['<', 3, 5], ['>', 3, 5], ['<=', 5, 5], ['>=', 4, 5], ['==', 5, 5], ['!=', 5, 5]].map(([op, x, y]) =>
      '<tr><td><code>' + o(TT.sym(op)) + '</code></td><td>' + TT.opWords(op) + '</td><td><code>' + n(x) + ' ' + o(TT.sym(op)) + ' ' + n(y) + '</code></td><td>' +
      TT.valHTML(TT.evaluate(B.cmp(x, op, y), {})) + '</td></tr>').join('');

    const truth = (title, f) => '<table class="tt small"><thead><tr><th>A</th><th>B</th><th>' + title + '</th></tr></thead><tbody>' +
      [[true, true], [true, false], [false, true], [false, false]].map(([x, y]) => '<tr><td>' + TT.valHTML(x) + '</td><td>' + TT.valHTML(y) + '</td><td>' + TT.valHTML(f(x, y)) + '</td></tr>').join('') + '</tbody></table>';

    app.innerHTML =
      '<div class="page-head"><a class="back-link" href="#/">← All scenarios</a><h1>Pseudocode Cheat Sheet</h1>' +
      '<p class="lead">Everything the scenarios use, on one page. Change the notation with the ⚙ button.</p></div>' +
      '<div class="cheat">' +
      '<section class="panel"><h2>Variables and assignment</h2>' +
      '<p>A variable is a named box in memory. <code>' + o(TT.settings.assign) + '</code> stores a value in it.</p>' +
      '<pre class="code-ex">' + v('lives') + ' ' + o(a) + ' ' + n(3) + '\n' + v('name') + ' ' + o(a) + ' <span class="t-str">"Ada"</span>\n' +
      v('isReady') + ' ' + o(a) + ' ' + T + '\n' + v('lives') + ' ' + o(a) + ' ' + v('lives') + ' ' + o('+') + ' ' + n(1) + '   <span class="t-note">// lives is now 4</span></pre></section>' +
      '<section class="panel"><h2>Math</h2>' +
      '<table class="ref"><tr><td><code>' + o('+') + '</code></td><td>add</td><td><code>' + v('total') + ' ' + o(a) + ' ' + v('price') + ' ' + o('+') + ' ' + v('tax') + '</code></td></tr>' +
      '<tr><td><code>' + o('-') + '</code></td><td>subtract</td><td><code>' + v('health') + ' ' + o(a) + ' ' + v('health') + ' ' + o('-') + ' ' + n(10) + '</code></td></tr>' +
      '<tr><td><code>' + o('*') + '</code></td><td>multiply</td><td><code>' + v('area') + ' ' + o(a) + ' ' + v('width') + ' ' + o('*') + ' ' + v('height') + '</code></td></tr>' +
      '<tr><td><code>' + o('/') + '</code></td><td>divide</td><td><code>' + v('half') + ' ' + o(a) + ' ' + v('total') + ' ' + o('/') + ' ' + n(2) + '</code></td></tr></table>' +
      '<p class="muted small">The right side is always worked out first, then stored.</p></section>' +
      '<section class="panel"><h2>Comparisons</h2><p>A comparison asks a question. The answer is always ' + T + ' or ' + F + '.</p>' +
      '<table class="ref"><thead><tr><th>symbol</th><th>means</th><th>example</th><th>result</th></tr></thead><tbody>' + cmpRows + '</tbody></table></section>' +
      '<section class="panel"><h2>AND, OR, NOT</h2>' +
      '<div class="tt-row">' + truth('A AND B', (x, y) => x && y) + truth('A OR B', (x, y) => x || y) +
      '<table class="tt small"><thead><tr><th>A</th><th>NOT A</th></tr></thead><tbody><tr><td>' + T + '</td><td>' + F + '</td></tr><tr><td>' + F + '</td><td>' + T + '</td></tr></tbody></table></div>' +
      '<p><b>' + l('AND') + '</b>: both must be TRUE. <b>' + l('OR') + '</b>: at least one must be TRUE. <b>' + l('NOT') + '</b>: flips the value.</p></section>' +
      '<section class="panel wide"><h2>IF / ELSE IF / ELSE</h2>' +
      '<p>The computer checks each condition from the top. The <b>first</b> one that is TRUE runs, and the rest are skipped. ELSE runs only if nothing above was TRUE.</p>' +
      '<div class="side-by-side readonly"><div>' + TT.renderCode(example, 'blocks') + '</div><div>' + TT.renderCode(example, 'pseudo') + '</div></div></section>' +
      '<section class="panel wide"><h2>Order of operations</h2>' +
      '<p>Brackets first, then math, then comparisons, then ' + l('NOT') + ', then ' + l('AND') + ', then ' + l('OR') + '. When in doubt, add brackets — they make your meaning clear.</p>' +
      '<pre class="code-ex">' + k('IF') + ' (' + v('hasKey') + ' ' + l('OR') + ' ' + v('hasMap') + ') ' + l('AND') + ' ' + l('NOT') + ' ' + v('isLocked') + ' ' + k('THEN') + '\n' +
      '    <span class="t-out">OUTPUT</span> <span class="t-str">"Go!"</span>\n' + k('END IF') + '</pre></section>' +
      '</div>';
  }

  /* ===================================================================== */
  /* Settings                                                               */
  /* ===================================================================== */
  function openSettings() {
    const back = document.createElement('div');
    back.className = 'modal-back';
    const radio = (name, value, label, cur) => '<label class="radio"><input type="radio" name="' + name + '" value="' + esc(value) + '"' + (cur === value ? ' checked' : '') + '> ' + label + '</label>';
    back.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="st">' +
      '<h2 id="st">Settings</h2>' +
      '<fieldset><legend>Assignment is written as</legend>' +
      radio('assign', '←', '<code>score ← 10</code>', TT.settings.assign) + radio('assign', '=', '<code>score = 10</code>', TT.settings.assign) + '</fieldset>' +
      '<fieldset><legend>Comparisons are written as</legend>' +
      radio('cmp', 'math', '<code>= ≠ ≤ ≥</code>', TT.settings.cmp) + radio('cmp', 'code', '<code>== != &lt;= &gt;=</code>', TT.settings.cmp) + '</fieldset>' +
      '<fieldset><legend>Progress</legend><button type="button" class="btn btn-ghost" id="clear-progress">Clear my challenge progress</button></fieldset>' +
      '<div class="modal-foot"><button type="button" class="btn btn-run" data-close>Done</button></div></div>';
    document.body.appendChild(back);
    const close = () => { back.remove(); document.removeEventListener('keydown', onKey); route(); };
    const onKey = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    back.addEventListener('change', e => {
      if (e.target.name === 'assign') TT.settings.assign = e.target.value;
      if (e.target.name === 'cmp') TT.settings.cmp = e.target.value;
      saveSettings();
    });
    back.addEventListener('click', e => {
      if (e.target === back || e.target.closest('[data-close]')) close();
      if (e.target.closest('#clear-progress')) {
        progress = {};
        store.set('progress', progress);
        e.target.closest('#clear-progress').textContent = 'Progress cleared';
      }
    });
    back.querySelector('input').focus();
  }

  $('#settings-btn').addEventListener('click', openSettings);
  window.addEventListener('hashchange', route);
  route();
})();
