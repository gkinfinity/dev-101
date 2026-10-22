/* Game Dev 101 pages: home, the scenarios, the warm-up and the cheat sheet. */
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
        const raw = localStorage.getItem('gamedev101:' + key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem('gamedev101:' + key, JSON.stringify(value)); } catch (e) { /* private window */ }
    },
  };
  // No settings button on the page, so stored notation choices are ignored.
  const stored = store.get('settings', {});
  if (!$('#settings-btn')) { delete stored.assign; delete stored.cmp; }
  Object.assign(TT.settings, stored);
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
    'Every frame': 'ctl',
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

  // Shared with the 3D page (dig.js).
  TT.ui = {
    chips, toast, notate, pulse, saveSettings,
    progress: () => progress,
    saveProgress: () => store.set('progress', progress),
  };

  const initVals = sc => { const o = {}; sc.vars.forEach(v => { o[v.name] = v.init; }); return o; };
  const doneCount = sc => Object.keys(progress[sc.id] || {}).length;

  /* ---------- routing ---------- */
  // Only this page is shown; the other pages stay in the code, hidden.
  // Set ONLY to null to bring back the home page, warm-up and cheat sheet.
  const ONLY = 'dig';
  document.querySelector('.nav').hidden = !!ONLY;

  let cleanup = null;
  function route() {
    if (cleanup) { cleanup(); cleanup = null; }
    const id = ONLY || location.hash.replace(/^#\/?/, '');
    document.querySelectorAll('.nav a').forEach(a => {
      const href = a.getAttribute('href').replace(/^#\/?/, '');
      a.classList.toggle('active', href === id || (!href && TT.scenarios.some(s => s.id === id)));
    });
    const sc = TT.scenarios.find(s => s.id === id);
    if (TT.rain) TT.rain.set(!(sc && sc.kind === 'dig'));
    if (sc && sc.kind === 'dig') {
      document.title = ONLY ? 'Game Dev 101' : sc.title + ' — Game Dev 101';
      cleanup = TT.digPage(sc, app, Object.assign({ prev: TT.scenarios[sc.num - 2], solo: !!ONLY }, TT.ui));
    } else if (sc) scenarioPage(sc);
    else if (id === 'warmup') warmupPage();
    else if (id === 'cheatsheet') cheatPage();
    else homePage();
    window.scrollTo(0, 0);
  }

  /* ===================================================================== */
  /* Home                                                                   */
  /* ===================================================================== */
  function homePage() {
    document.title = 'Game Dev 101';
    const cards = TT.scenarios.map(sc => {
      const prog = TT.prepare(sc.code(B));
      const done = doneCount(sc);
      const total = sc.challenges.length;
      return '<a class="card" href="#/' + sc.id + '">' +
        '<div class="card-art">' + sc.scene(initVals(sc), { refs: prog.refs }) + (sc.kind === 'dig' ? '<span class="card-new">3D</span>' : '') + '</div>' +
        '<div class="card-body">' +
        '<div class="card-top"><span class="card-num">' + sc.num + '</span><h3>' + esc(sc.title) + '</h3></div>' +
        '<div class="chips">' + chips(sc.concepts) + '</div>' +
        '<div class="card-progress' + (done === total ? ' all' : '') + '">' +
        'Challenges ' + done + '/' + total +
        '</div></div></a>';
    }).join('');

    app.innerHTML = '<div class="cards">' + cards + '</div>';
  }

  /* ===================================================================== */
  /* A scenario                                                             */
  /* ===================================================================== */
  const pages = {};  // each scenario keeps its memory and code while the tab is open

  function scenarioPage(sc) {
    document.title = sc.title + ' — Game Dev 101';
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
      '</div>' +
      '<div class="sc-cols">' +
      '<div class="col">' +
      '<section class="panel p-scene">' +
      '<div class="scene" id="scene"></div>' +
      '<div class="screen-out" id="out"></div>' +
      '<div class="presets">' +
      sc.presets.map((p, i) => '<button type="button" class="chip-btn' + (p.run ? ' runs' : '') + '" data-preset="' + i + '">' +
        (p.run ? '<span aria-hidden="true">▶ </span>' : '') + esc(p.label) + '</button>').join('') + '</div>' +
      '</section>' +
      '<section class="panel p-mem">' +
      '<div class="panel-head"><h2>Memory</h2></div>' +
      '<div class="mem" id="mem"></div></section>' +
      '<section class="panel p-chal"><div class="panel-head"><h2>Challenges</h2><span class="panel-sub" id="chal-count"></span></div>' +
      '<ol class="chal" id="chal"></ol></section>' +
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
      '<div class="undo-bar" id="undo" hidden><button type="button" class="link-btn" id="undo-btn">Undo code changes</button></div>' +
      '</section>' +
      '<section class="panel p-trace"><div class="panel-head"><h2>Step by step</h2></div>' +
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
        return '<div class="box role-' + role + (ch ? ' changed' : '') + '">' +
          '<div class="box-top"><span class="box-name">' + esc(vd.name) + '</span></div>' + ctl +
          '<div class="box-hint">' + (ch ? 'was ' + esc(TT.fmt(changed[vd.name])) : '') + '</div></div>';
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
      traceEl.innerHTML = '';
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
    function traceStep(st) {
      if (st.kind === 'endif') return;
      const h = TT.stepHTML(st, st.kind === 'done' ? '✓' : ++stepNo);
      addTrace(h.html, h.cls);
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
        addTrace('<div class="tr-line"><span class="tr-n">?</span><span>Prediction: <code>' + TT.condHTML(P.prog.main, prediction) + '</code></span></div>', 'k-predict');
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
      }
      P.lastBefore = R.before;
      drawMem(P.vals, changed);
      if (!R.outSeen && !R.ctx.crashed) drawScene(P.vals, true);
      const main = P.prog.main ? R.ctx.taken[P.prog.main.id] : undefined;
      if (R.prediction !== undefined && main !== undefined) {
        const ok = R.prediction === main;
        addTrace('<div class="verdict">' + (ok
          ? '<b class="ok">Correct</b>'
          : '<b class="no">Wrong:</b> <code>' +
            TT.condHTML(P.prog.main, main) + '</code> ran.') + '</div>', ok ? 'k-true' : 'k-false');
        toast(ok ? 'Correct' : 'Wrong', ok ? 'good' : 'bad');
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
      addTrace('<div class="tr-note">Stopped.</div>', 'k-off');
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
      newly.forEach(i => toast('Challenge ' + (i + 1) + ' done', 'good'));
    }

    function askPredict(cb) {
      const s = P.prog.main;
      const opts = s.branches.map((b, i) => i).concat([s.else ? 'else' : 'none']);
      const back = document.createElement('div');
      back.className = 'modal-back';
      back.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="pq">' +
        '<h2 id="pq">Which part will run?</h2>' +
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
    document.title = 'Warm-Up — Game Dev 101';
    const W = { a: true, b: false, x: 7, op: '>', y: 3, score: 10, add: 5, busy: false, streak: 0, right: 0, tries: 0, best: store.get('best', 0) };
    const opOptions = TT.OPS.cmp.map(o => '<option value="' + esc(o) + '"' + (o === W.op ? ' selected' : '') + '>' + esc(TT.sym(o)) + '</option>').join('');

    app.innerHTML =
      '<div class="page-head"><a class="back-link" href="#/">← All scenarios</a><h1>Warm-Up</h1></div>' +
      '<div class="warm-grid">' +
      // 1 logic
      '<section class="panel"><div class="panel-head"><h2>AND, OR, NOT</h2></div>' +
      '<div class="ab-row"><div class="box"><div class="box-top"><span class="box-name">A</span></div><div id="wa"></div></div>' +
      '<div class="box"><div class="box-top"><span class="box-name">B</span></div><div id="wb"></div></div></div>' +
      '<div class="logic-out" id="wl"></div>' +
      '<table class="tt" id="wtt"></table></section>' +
      // 2 comparisons
      '<section class="panel"><div class="panel-head"><h2>Comparisons</h2></div>' +
      '<div class="cmp-row"><input type="number" id="wx" value="' + W.x + '" aria-label="left number">' +
      '<select id="wop" class="op big-op" aria-label="comparison">' + opOptions + '</select>' +
      '<input type="number" id="wy" value="' + W.y + '" aria-label="right number"><span class="arrow">→</span><span id="wcr"></span></div>' +
      '<div class="cmp-grid" id="wcg"></div></section>' +
      // 3 assignment
      '<section class="panel"><div class="panel-head"><h2>Assignment</h2></div>' +
      '<div class="assign-line"><code class="assign-code">' + assignLine() + '</code>' +
      '<button type="button" class="btn btn-run" id="wrun">▶ Run this line</button><button type="button" class="btn btn-ghost" id="wreset" title="Set score back to 10">↺</button></div>' +
      '<div class="assign-demo"><div class="box big"><div class="box-top"><span class="box-name">score</span></div><div class="mem-val" id="wscore"></div></div>' +
      '<ol class="assign-steps" id="wsteps"></ol></div></section>' +
      // 4 quiz
      '<section class="panel quiz-panel"><div class="panel-head"><h2>TRUE or FALSE?</h2><span class="panel-sub" id="wqs"></span></div>' +
      '<div class="quiz" id="wq"></div></section>' +
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
      const row = (expr, val) => '<div class="lo-row"><code>' + expr + '</code><span class="arrow">→</span>' + TT.valHTML(val) + '</div>';
      const A = '<span class="t-var">A</span>', Bv = '<span class="t-var">B</span>';
      $('#wl').innerHTML =
        row(A + ' <span class="t-log">AND</span> ' + Bv, W.a && W.b) +
        row(A + ' <span class="t-log">OR</span> ' + Bv, W.a || W.b) +
        row('<span class="t-log">NOT</span> ' + A, !W.a);
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
        '<span class="t-var">score</span>' + (active >= 1 ? ' = <b>' + TT.fmt(oldV) + '</b>' : ''),
        (active >= 2 ? '<code>' + TT.fmt(oldV) + ' + ' + TT.fmt(add) + '</code> = <b>' + TT.fmt(newV) + '</b>' : 'score + ' + TT.fmt(add)),
        '<span class="t-var">score</span> ' + esc(TT.settings.assign) + (active >= 3 ? ' <b>' + TT.fmt(newV) + '</b>' : ''),
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
      $('#wqs').textContent = 'streak ' + W.streak + ' · best ' + W.best;
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
      $('#wqfb').innerHTML = '<div class="q-verdict ' + (ok ? 'ok' : 'no') + '">' + (ok ? 'Correct' : 'Wrong') + '</div>' +
        '<div class="tr-work">' + r.lines.slice(1).map(l => '<code>→ ' + l + '</code>').join('') + '</div>' +
        '<button type="button" class="btn" id="wnext">Next →</button>';
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
    document.title = 'Cheat Sheet — Game Dev 101';
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
      '<div class="page-head"><a class="back-link" href="#/">← All scenarios</a><h1>Cheat Sheet</h1></div>' +
      '<div class="cheat">' +
      '<section class="panel"><h2>Variables and assignment</h2>' +
      '<pre class="code-ex">' + v('lives') + ' ' + o(a) + ' ' + n(3) + '\n' + v('name') + ' ' + o(a) + ' <span class="t-str">"Ada"</span>\n' +
      v('isReady') + ' ' + o(a) + ' ' + T + '\n' + v('lives') + ' ' + o(a) + ' ' + v('lives') + ' ' + o('+') + ' ' + n(1) + '</pre></section>' +
      '<section class="panel"><h2>Math</h2>' +
      '<table class="ref"><tr><td><code>' + o('+') + '</code></td><td>add</td><td><code>' + v('total') + ' ' + o(a) + ' ' + v('price') + ' ' + o('+') + ' ' + v('tax') + '</code></td></tr>' +
      '<tr><td><code>' + o('-') + '</code></td><td>subtract</td><td><code>' + v('health') + ' ' + o(a) + ' ' + v('health') + ' ' + o('-') + ' ' + n(10) + '</code></td></tr>' +
      '<tr><td><code>' + o('*') + '</code></td><td>multiply</td><td><code>' + v('area') + ' ' + o(a) + ' ' + v('width') + ' ' + o('*') + ' ' + v('height') + '</code></td></tr>' +
      '<tr><td><code>' + o('/') + '</code></td><td>divide</td><td><code>' + v('half') + ' ' + o(a) + ' ' + v('total') + ' ' + o('/') + ' ' + n(2) + '</code></td></tr></table>' +
      '</section>' +
      '<section class="panel"><h2>Comparisons</h2>' +
      '<table class="ref"><thead><tr><th>symbol</th><th>means</th><th>example</th><th>result</th></tr></thead><tbody>' + cmpRows + '</tbody></table></section>' +
      '<section class="panel"><h2>AND, OR, NOT</h2>' +
      '<div class="tt-row">' + truth('A AND B', (x, y) => x && y) + truth('A OR B', (x, y) => x || y) +
      '<table class="tt small"><thead><tr><th>A</th><th>NOT A</th></tr></thead><tbody><tr><td>' + T + '</td><td>' + F + '</td></tr><tr><td>' + F + '</td><td>' + T + '</td></tr></tbody></table></div>' +
      '</section>' +
      '<section class="panel wide"><h2>IF / ELSE IF / ELSE</h2>' +
      '<div class="side-by-side readonly"><div>' + TT.renderCode(example, 'blocks') + '</div><div>' + TT.renderCode(example, 'pseudo') + '</div></div></section>' +
      '<section class="panel wide"><h2>Order of operations</h2>' +
      '<p><code>( )</code> → math → comparisons → ' + l('NOT') + ' → ' + l('AND') + ' → ' + l('OR') + '</p>' +
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
      '<fieldset><legend>Assignment</legend>' +
      radio('assign', '←', '<code>score ← 10</code>', TT.settings.assign) + radio('assign', '=', '<code>score = 10</code>', TT.settings.assign) + '</fieldset>' +
      '<fieldset><legend>Comparisons</legend>' +
      radio('cmp', 'math', '<code>= ≠ ≤ ≥</code>', TT.settings.cmp) + radio('cmp', 'code', '<code>== != &lt;= &gt;=</code>', TT.settings.cmp) + '</fieldset>' +
      '<fieldset><legend>Progress</legend><button type="button" class="btn btn-ghost" id="clear-progress">Reset challenges</button></fieldset>' +
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
        e.target.closest('#clear-progress').textContent = 'Done';
      }
    });
    back.querySelector('input').focus();
  }

  if ($('#settings-btn')) $('#settings-btn').addEventListener('click', openSettings);
  window.addEventListener('hashchange', route);
  route();
})();
