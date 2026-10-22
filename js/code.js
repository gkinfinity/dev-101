/* Draws a program two ways: as snap-together blocks, or as pseudocode text.
   Operators, numbers, NOT and optional lines are live controls in both views;
   the page listens for changes on the code panel (see app.js). */
(function () {
  'use strict';
  const TT = window.TT;
  const esc = TT.esc;

  TT.renderCode = function (prog, view) {
    return view === 'pseudo'
      ? '<div class="pseudo">' + pseudoList(prog.body, 0, false) + '</div>'
      : '<div class="blocks">' + blockList(prog.body, false) + '</div>';
  };

  /* ---------- shared controls ---------- */
  function opSelect(e, cls) {
    const opts = TT.OPS[e.k].map(o =>
      '<option value="' + esc(o) + '"' + (o === e.op ? ' selected' : '') + '>' + esc(e.k === 'logic' ? o : TT.sym(o)) + '</option>'
    ).join('');
    const kind = e.k === 'logic' ? 'logic' : e.k === 'cmp' ? 'comparison' : 'math';
    return '<select class="op ' + cls + '" data-eid="' + e.eid + '" aria-label="Change the ' + kind + ' operator" title="Click to change">' + opts + '</select>';
  }

  function numInput(e, cls) {
    const w = Math.max(2, String(e.v).length + 1);
    return '<input class="num ' + cls + '" type="number" value="' + e.v + '" data-eid="' + e.eid +
      '" aria-label="Number" title="Click to change" style="width:' + (w + 1.2) + 'ch">';
  }

  function notButton(e, cls) {
    return '<button type="button" class="not-btn ' + cls + (e.on ? '' : ' off') + '" data-eid="' + e.eid +
      '" aria-pressed="' + e.on + '" title="' + (e.on ? 'Click to remove NOT' : 'Click to put NOT back') + '">NOT</button>';
  }

  function optToggle(s) {
    return '<label class="opt" title="Turn this code on or off"><input type="checkbox" class="opt-toggle" data-sid="' + s.id + '"' +
      (s.on ? ' checked' : '') + '><span class="opt-track"></span><span class="opt-word">' + (s.on ? 'on' : 'off') + '</span></label>';
  }

  /* ---------- blocks ---------- */
  function rep(e, d) {
    const shade = ' d' + (d % 2);
    switch (e.k) {
      case 'var': return '<span class="rep rep-var">' + esc(e.name) + '</span>';
      case 'num': return numInput(e, 'rep-num');
      case 'str': return '<span class="rep rep-str">' + esc(e.v) + '</span>';
      case 'bool': return '<span class="hex hex-lit ' + (e.v ? 'is-t' : 'is-f') + '">' + (e.v ? 'TRUE' : 'FALSE') + '</span>';
      case 'math':
        return '<span class="rep rep-op' + shade + '">' + rep(e.a, d + 1) + ' ' + opSelect(e, 'blk-sel') + ' ' + rep(e.b, d + 1) + '</span>';
      case 'cmp':
      case 'logic':
        return '<span class="hex' + shade + '">' + rep(e.a, d + 1) + ' ' + opSelect(e, 'blk-sel') + ' ' + rep(e.b, d + 1) + '</span>';
      case 'not':
        return '<span class="hex hex-not' + shade + (e.on ? '' : ' not-off') + '">' + notButton(e, 'blk-not') + ' ' + rep(e.x, d + 1) + '</span>';
    }
    return '';
  }

  function blockList(list, off) {
    return list.map(s => block(s, off)).join('');
  }

  function block(s, parentOff) {
    const isOff = parentOff || (s.optional && !s.on);
    const offCls = isOff ? ' off' : '';
    const opt = s.optional ? optToggle(s) : '';
    const note = s.note ? '<span class="blk-note">' + esc(s.note) + '</span>' : '';
    if (s.k === 'set') {
      return '<div class="blk blk-var' + offCls + '" data-sid="' + s.id + '">' + opt +
        '<span class="kw">set</span> <span class="rep rep-name">' + esc(s.name) + '</span> <span class="kw">to</span> ' +
        rep(s.expr, 0) + note + '</div>';
    }
    if (s.k === 'out') {
      return '<div class="blk blk-out' + offCls + '" data-sid="' + s.id + '">' + opt +
        '<span class="kw">say</span> <span class="rep rep-str">' + esc(s.text) + '</span>' + note + '</div>';
    }
    // IF
    let h = '<div class="blk-c' + offCls + '" data-sid="' + s.id + '">';
    s.branches.forEach((b, i) => {
      h += '<div class="c-head' + (i ? ' c-mid' : '') + '" data-of="' + s.id + '" data-head="' + i + '">' + (i ? '' : opt) +
        '<span class="kw">' + (i ? 'else if' : 'if') + '</span> ' + rep(b.cond, 0) + ' <span class="kw">then</span>' +
        (i ? '' : note) + '<span class="res"></span></div>';
      h += '<div class="c-body" data-of="' + s.id + '" data-body="' + i + '">' + (blockList(b.body, isOff) || '<div class="c-empty"></div>') + '</div>';
    });
    if (s.else) {
      h += '<div class="c-head c-mid" data-of="' + s.id + '" data-head="else"><span class="kw">else</span><span class="res"></span></div>' +
        '<div class="c-body" data-of="' + s.id + '" data-body="else">' + blockList(s.else, isOff) + '</div>';
    }
    h += '<div class="c-foot" data-of="' + s.id + '" data-foot="1"><span class="res"></span></div></div>';
    return h;
  }

  /* ---------- pseudocode ---------- */
  function pexpr(e) {
    switch (e.k) {
      case 'var': return '<span class="t-var">' + esc(e.name) + '</span>';
      case 'num': return numInput(e, 'ps-num');
      case 'bool': return TT.valHTML(e.v);
      case 'str': return TT.valHTML(e.v);
      case 'not': return notButton(e, 'ps-not') + ' ' + pparen(e.x, e, false);
      default: {
        const op = e.k === 'logic' ? opSelect(e, 'ps-sel ps-log') : opSelect(e, 'ps-sel');
        return pparen(e.a, e, false) + ' ' + op + ' ' + pparen(e.b, e, true);
      }
    }
  }
  function pparen(c, p, right) {
    // A switched-off NOT still sits in the line, so keep the brackets it needs.
    const parent = p.k === 'not' ? { k: 'not', on: true } : p;
    const s = pexpr(c);
    return TT.needParens(c, parent, right) ? '<span class="t-par">(</span>' + s + '<span class="t-par">)</span>' : s;
  }

  function line(attrs, ind, content, off) {
    return '<div class="ln' + (off ? ' off' : '') + '" ' + attrs + ' style="--ind:' + ind + '"><span class="ln-code">' + content + '</span></div>';
  }

  function pseudoList(list, ind, off) {
    return list.map(s => pseudo(s, ind, off)).join('');
  }

  function pseudo(s, ind, parentOff) {
    const isOff = parentOff || (s.optional && !s.on);
    const opt = s.optional ? optToggle(s) : '';
    const note = s.note ? ' <span class="t-note">// ' + esc(s.note) + '</span>' : '';
    if (s.k === 'set') {
      return line('data-sid="' + s.id + '"', ind,
        opt + '<span class="t-var">' + esc(s.name) + '</span> <span class="t-op">' + esc(TT.settings.assign) + '</span> ' + pexpr(s.expr) + note, isOff);
    }
    if (s.k === 'out') {
      return line('data-sid="' + s.id + '"', ind,
        opt + '<span class="t-out">OUTPUT</span> <span class="t-str">"' + esc(s.text) + '"</span>' + note, isOff);
    }
    let h = '';
    s.branches.forEach((b, i) => {
      h += line('data-of="' + s.id + '" data-head="' + i + '"', ind,
        (i ? '' : opt) + '<span class="t-ctl">' + (i ? 'ELSE IF' : 'IF') + '</span> ' + pexpr(b.cond) +
        ' <span class="t-ctl">THEN</span>' + (i ? '' : note) + '<span class="res"></span>', isOff);
      h += pseudoList(b.body, ind + 1, isOff);
    });
    if (s.else) {
      h += line('data-of="' + s.id + '" data-head="else"', ind, '<span class="t-ctl">ELSE</span><span class="res"></span>', isOff);
      h += pseudoList(s.else, ind + 1, isOff);
    }
    h += line('data-of="' + s.id + '" data-foot="1"', ind, '<span class="t-ctl">END IF</span><span class="res"></span>', isOff);
    return h;
  }

  /* One step of a run, written out for the step-by-step panel: { html, cls }. */
  const work = lines => (lines.length ? '<div class="tr-work">' + lines.map(l => '<code>→ ' + l + '</code>').join('') + '</div>' : '');
  const assignHTML = name => '<span class="t-var">' + esc(name) + '</span> <span class="t-op">' + esc(TT.settings.assign) + '</span> ';
  function stmtText(s) {
    if (s.k === 'set') return assignHTML(s.name) + TT.exprHTML(TT.strip(s.expr));
    if (s.k === 'out') return '<span class="t-out">OUTPUT</span> <span class="t-str">"' + esc(s.text) + '"</span>';
    return TT.condHTML(s, 0) + ' <span class="t-ctl">THEN</span> …';
  }
  TT.stepHTML = function (st, n) {
    const num = '<span class="tr-n">' + n + '</span>';
    const line = code => '<div class="tr-line">' + num + '<code>' + code + '</code></div>';
    const note = html => '<div class="tr-note">' + html + '</div>';
    const name = '<span class="t-var">' + esc(st.name || '') + '</span>';
    switch (st.kind) {
      case 'set':
        return {
          cls: 'k-set',
          html: line(assignHTML(st.name) + st.lines[0]) + work(st.lines.slice(1)) +
            note(name + ' was ' + TT.valHTML(st.before)),
        };
      case 'cond':
        return {
          cls: st.value ? 'k-true' : 'k-false',
          html: line(TT.condHTML(st.stmt, st.branch)) + work(st.lines.slice(1)),
        };
      case 'else':
        return { cls: 'k-true', html: line('<span class="t-ctl">ELSE</span>') };
      case 'none':
        return { cls: 'k-false', html: line('<span class="t-ctl">END IF</span>') };
      case 'out':
        return { cls: 'k-out', html: line(stmtText(st.stmt)) };
      case 'off':
        return { cls: 'k-off', html: '<div class="tr-line">' + num + '<code class="struck">' + stmtText(st.stmt) + '</code></div>' + note('off') };
      case 'crash':
        return { cls: 'k-crash', html: line('CRASH') + note(esc(st.message)) };
      case 'done':
        return { cls: 'k-done', html: '<div class="tr-line">' + num + '<b>Done</b></div>' };
    }
    return { cls: '', html: '' };
  };

  /* Plain pseudocode (no controls) for text such as prediction choices. */
  TT.condText = function (s, branch) {
    if (branch === 'else') return 'ELSE';
    if (branch === 'none') return 'Nothing';
    return (branch ? 'ELSE IF ' : 'IF ') + TT.exprText(s.branches[branch].cond);
  };
  TT.condHTML = function (s, branch) {
    if (branch === 'else') return '<span class="t-ctl">ELSE</span>';
    if (branch === 'none') return 'Nothing';
    return '<span class="t-ctl">' + (branch ? 'ELSE IF' : 'IF') + '</span> ' + TT.exprHTML(TT.strip(s.branches[branch].cond));
  };
})();
