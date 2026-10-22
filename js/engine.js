/* Game Dev 101 engine
   A program is a list of plain objects (statements and expressions). The engine
   can print it as text, and run it one step at a time so a page can show the
   computer "thinking": every condition is shown being worked out, piece by piece. */
(function () {
  'use strict';
  const TT = (window.TT = window.TT || {});

  /* How code is written on screen. The app loads saved choices over these. */
  TT.settings = {
    assign: '←',      // '←' or '='
    cmp: 'math',      // 'math' writes = ≠ ≤ ≥ ; 'code' writes == != <= >=
    view: 'blocks',   // 'blocks' or 'pseudo'
    speed: 'normal',
    predict: false,
    parenConds: true, // (distance ≤ reach) AND (NOT isBedrock): brackets around each condition
  };

  TT.OPS = {
    math: ['+', '-', '*', '/'],
    cmp: ['<', '>', '<=', '>=', '==', '!='],
    logic: ['AND', 'OR'],
  };

  /* ---------- building programs ---------- */
  const wrap = x => (typeof x === 'number' ? { k: 'num', v: x } : typeof x === 'boolean' ? { k: 'bool', v: x } : x);

  TT.B = {
    num: (v, ref) => ({ k: 'num', v, ref }),
    bool: v => ({ k: 'bool', v }),
    str: v => ({ k: 'str', v }),
    v: name => ({ k: 'var', name }),
    math: (a, op, b, ref) => ({ k: 'math', a: wrap(a), op, b: wrap(b), ref }),
    cmp: (a, op, b, ref) => ({ k: 'cmp', a: wrap(a), op, b: wrap(b), ref }),
    and: (a, b, ref) => ({ k: 'logic', op: 'AND', a: wrap(a), b: wrap(b), ref }),
    or: (a, b, ref) => ({ k: 'logic', op: 'OR', a: wrap(a), b: wrap(b), ref }),
    not: (x, ref) => ({ k: 'not', x: wrap(x), on: true, ref }),
    // Blanks for students to fill in: a variable to pick, an operator to pick,
    // and a NOT they can switch on in front of a condition.
    blankVar: () => ({ k: 'var', name: null, blank: true }),
    blankCmp: ref => ({ k: 'cmp', a: { k: 'var', name: null, blank: true }, op: null, b: { k: 'var', name: null, blank: true }, blank: true, ref }),
    blankLogic: (a, b, ref) => ({ k: 'logic', op: null, a, b, blank: true, ref }),
    maybeNot: (x, ref) => ({ k: 'not', x, on: false, blank: true, ref }),
    blankNum: ref => ({ k: 'num', v: null, blank: true, ref }),
    // RANDOM(a, b): a whole number from a to b, both included.
    random: (a, b, ref) => ({ k: 'rand', a: wrap(a), b: wrap(b), ref }),
    set: (name, expr, o) => Object.assign({ k: 'set', name, expr: wrap(expr) }, o),
    out: (text, fx, o) => Object.assign({ k: 'out', text, fx }, o),
    // branches: [[cond, [body], comment?], ...]   elseBody: [body] or null
    // A comment is shown on its own line above that IF or ELSE IF.
    iff: (branches, elseBody, o) =>
      Object.assign({ k: 'if', branches: branches.map(([cond, body, comment]) => ({ cond, body, comment })), else: elseBody || null }, o),
  };

  /* Give every statement and expression an id, and collect named parts. */
  TT.prepare = function (body) {
    let ns = 0, ne = 0, main = null, firstIf = null;
    const refs = {}, nodes = {}, stmts = {};
    const ex = e => {
      if (!e) return;
      e.eid = 'e' + ++ne;
      nodes[e.eid] = e;
      if (e.ref) refs[e.ref] = e;
      ex(e.a); ex(e.b); ex(e.x);
    };
    const walk = (list, top) => list.forEach(s => {
      s.id = 's' + ++ns;
      stmts[s.id] = s;
      if (s.ref) refs[s.ref] = s;
      if (s.k === 'set') ex(s.expr);
      if (s.k === 'if') {
        if (s.main && !main) main = s;
        if (top && !firstIf) firstIf = s;
        s.branches.forEach(b => { ex(b.cond); walk(b.body, false); });
        if (s.else) walk(s.else, false);
      }
    });
    walk(body, true);
    return { body, refs, nodes, stmts, main: main || firstIf };
  };

  /* ---------- values ---------- */
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  TT.esc = esc;

  const fmtNum = x => (Number.isInteger(x) ? String(x) : String(Math.round(x * 100) / 100));
  TT.fmt = function (val) {
    if (val === true) return 'TRUE';
    if (val === false) return 'FALSE';
    if (typeof val === 'number') return fmtNum(val);
    if (typeof val === 'string') return '"' + val + '"';
    return String(val);
  };

  TT.sym = function (op) {
    const code = TT.settings.cmp === 'code';
    switch (op) {
      case '==': return code ? '==' : '=';
      case '!=': return code ? '!=' : '≠';
      case '<=': return code ? '<=' : '≤';
      case '>=': return code ? '>=' : '≥';
      default: return op;
    }
  };

  const OP_WORDS = {
    '<': 'less than', '>': 'greater than', '<=': 'less than or equal to',
    '>=': 'greater than or equal to', '==': 'equal to', '!=': 'not equal to',
  };
  TT.opWords = op => OP_WORDS[op] || op;

  class Crash extends Error {}
  TT.Crash = Crash;

  // Tests can swap this out to make RANDOM give a known number.
  TT.randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

  function apply(e, a, b) {
    switch (e.k) {
      case 'not': return !a;
      case 'rand': return TT.randInt(Math.ceil(a), Math.floor(b));
      case 'logic': return e.op === 'AND' ? a && b : a || b;
      case 'cmp':
        switch (e.op) {
          case '<': return a < b;
          case '>': return a > b;
          case '<=': return a <= b;
          case '>=': return a >= b;
          case '==': return a === b;
          case '!=': return a !== b;
        }
        break;
      case 'math': {
        let r;
        switch (e.op) {
          case '+': r = a + b; break;
          case '-': r = a - b; break;
          case '*': r = a * b; break;
          case '/':
            if (b === 0) throw new Crash('Division by zero! A computer cannot divide ' + TT.fmt(a) + ' by 0.');
            r = a / b; break;
        }
        return Math.round(r * 1e6) / 1e6;
      }
    }
    throw new Error('unknown expression ' + e.k);
  }

  /* ---------- working out an expression, one layer at a time ---------- */
  const lit = value => ({ k: 'lit', value });

  // A NOT that has been switched off is not part of the program at all.
  function strip(e) {
    if (e.k === 'not') return e.on ? { k: 'not', on: true, x: strip(e.x) } : strip(e.x);
    if (e.a) return { k: e.k, op: e.op, a: strip(e.a), b: strip(e.b) };
    return e;
  }
  TT.strip = strip;

  function subst(e, vars) {
    switch (e.k) {
      case 'num': case 'bool': case 'str': return lit(e.v);
      case 'var': return lit(vars[e.name]);
      case 'not': return { k: 'not', on: true, x: subst(e.x, vars) };
      default: return { k: e.k, op: e.op, a: subst(e.a, vars), b: subst(e.b, vars) };
    }
  }

  // Reduce every part whose inputs are already plain values.
  function reduce(e) {
    if (e.k === 'lit') return e;
    if (e.k === 'not') return e.x.k === 'lit' ? lit(apply(e, e.x.value)) : { k: 'not', on: true, x: reduce(e.x) };
    if (e.a.k === 'lit' && e.b.k === 'lit') return lit(apply(e, e.a.value, e.b.value));
    return { k: e.k, op: e.op, a: reduce(e.a), b: reduce(e.b) };
  }

  /* ---------- checking a condition before working it out ---------- */
  const BLANK = 'Fill in every ? first.';
  TT.hasBlank = function (e) {
    if (!e) return false;
    if (e.k === 'var' && !e.name) return true;
    if (e.k === 'num' && e.v == null) return true;
    if ((e.k === 'cmp' || e.k === 'logic') && !e.op) return true;
    return TT.hasBlank(e.a) || TT.hasBlank(e.b) || TT.hasBlank(e.x);
  };
  // Every condition anywhere in a list of statements.
  TT.programHasBlank = function (list) {
    return (list || []).some(s => s.k === 'if' &&
      (s.branches.some(b => TT.hasBlank(b.cond) || TT.programHasBlank(b.body)) || TT.programHasBlank(s.else)));
  };
  // An error message in plain words when a condition mixes up data types, or null.
  TT.check = function (expr, vars) {
    if (TT.hasBlank(expr)) return BLANK;
    const name = e => (e.k === 'var' ? e.name : TT.exprText(e));
    const kind = t => (t === 'boolean' ? 'TRUE or FALSE' : t === 'number' ? 'a number' : 'text');
    function type(e) {
      switch (e.k) {
        case 'num': return 'number';
        case 'bool': return 'boolean';
        case 'str': return 'string';
        case 'var': return typeof vars[e.name];
        case 'math': return 'number';
        case 'rand': {
          [e.a, e.b].forEach(side => { if (type(side) !== 'number') throw 'RANDOM needs two numbers.'; });
          if (e.a.k === 'num' && e.b.k === 'num' && e.a.v > e.b.v) throw 'RANDOM needs the smaller number first.';
          return 'number';
        }
        case 'not': {
          const x = type(e.x);
          if (x !== 'boolean') throw 'NOT only works on TRUE or FALSE, but ' + name(e.x) + ' is ' + kind(x) + '.';
          return 'boolean';
        }
        case 'cmp': {
          const a = type(e.a), b = type(e.b);
          if (['<', '>', '<=', '>='].includes(e.op)) {
            [[e.a, a], [e.b, b]].forEach(([side, t]) => {
              if (t !== 'number') throw name(side) + ' is ' + kind(t) + ', not a number, so it cannot be compared with ' + TT.sym(e.op) + '.';
            });
          } else if (a !== b) {
            throw name(e.a) + ' is ' + kind(a) + ' but ' + name(e.b) + ' is ' + kind(b) + ', so they cannot be compared.';
          }
          return 'boolean';
        }
        case 'logic': {
          [e.a, e.b].forEach(side => {
            const t = type(side);
            if (t !== 'boolean') throw name(side) + ' is ' + kind(t) + ', not TRUE or FALSE, so it cannot be used with ' + e.op + '.';
          });
          return 'boolean';
        }
      }
      return 'unknown';
    }
    try {
      const clean = strip(expr);
      const t = type(clean);
      if (t !== 'boolean') return name(clean) + ' is ' + kind(t) + '. An IF needs something that is TRUE or FALSE.';
      return null;
    } catch (msg) {
      if (typeof msg === 'string') return msg;
      throw msg;
    }
  };

  TT.evaluate = function (expr, vars) {
    let cur = subst(strip(expr), vars);
    while (cur.k !== 'lit') cur = reduce(cur);
    return cur.value;
  };

  // Returns every line of working: the expression, then with values filled in,
  // then each simplification down to one value.
  // isCond: the expression is a whole IF condition, so it gets its brackets.
  TT.solve = function (expr, vars, isCond) {
    const show = e => (isCond ? TT.condTop(e, TT.exprHTML(e)) : TT.exprHTML(e));
    const clean = strip(expr);
    const lines = [show(clean)];
    let cur = subst(clean, vars);
    const push = () => {
      const h = show(cur);
      if (h !== lines[lines.length - 1]) lines.push(h);
    };
    push();
    for (let i = 0; cur.k !== 'lit' && i < 60; i++) { cur = reduce(cur); push(); }
    return { lines, value: cur.value };
  };

  /* ---------- printing an expression ---------- */
  function prec(e) {
    switch (e.k) {
      case 'logic': return e.op === 'OR' ? 1 : 2;
      case 'cmp': return 3;
      case 'math': return e.op === '+' || e.op === '-' ? 4 : 5;
      case 'not': return 6;
      default: return 9;
    }
  }

  // A single condition: a comparison or a TRUE/FALSE variable. A NOT sits
  // outside the brackets: (distance ≤ reach) AND NOT (isBedrock).
  const condPart = e => e.k === 'cmp' || e.k === 'var';
  const bracket = html => '<span class="t-par">(</span>' + html + '<span class="t-par">)</span>';
  // Brackets around a whole IF condition when it is a single condition.
  TT.condTop = (e, html) => (TT.settings.parenConds && condPart(e) ? bracket(html) : html);

  TT.needParens = function (child, parent, right) {
    if (TT.settings.parenConds && (parent.k === 'logic' || parent.k === 'not') && condPart(child)) return true;
    if (child.k === 'not' && !child.on) child = child.x;
    const cp = prec(child), pp = prec(parent);
    if (cp === 9) return false;
    if (parent.k === 'not') return child.k !== 'not';
    if (child.k === 'logic' && parent.k === 'logic') return child.op !== parent.op;
    if (cp < pp) return true;
    if (right && cp === pp && parent.k === 'math' && (parent.op === '-' || parent.op === '/')) return true;
    return false;
  };

  TT.valHTML = function (v) {
    if (v === true) return '<span class="t-bool t-true">TRUE</span>';
    if (v === false) return '<span class="t-bool t-false">FALSE</span>';
    if (typeof v === 'number') return '<span class="t-num">' + fmtNum(v) + '</span>';
    return '<span class="t-str">' + esc(TT.fmt(v)) + '</span>';
  };

  const opHTML = e => (e.k === 'logic'
    ? '<span class="t-log">' + e.op + '</span>'
    : '<span class="t-op">' + esc(TT.sym(e.op)) + '</span>');

  TT.exprHTML = function h(e) {
    switch (e.k) {
      case 'lit': return TT.valHTML(e.value);
      case 'num': case 'bool': case 'str': return TT.valHTML(e.v);
      case 'var': return e.name ? '<span class="t-var">' + esc(e.name) + '</span>' : '<span class="t-blank">?</span>';
      case 'not': return '<span class="t-log">NOT</span> ' + paren(e.x, e, false);
      case 'rand': return '<span class="t-fn">RANDOM</span>(' + h(e.a) + ', ' + h(e.b) + ')';
      default: return paren(e.a, e, false) + ' ' + (e.op ? opHTML(e) : '<span class="t-blank">?</span>') + ' ' + paren(e.b, e, true);
    }
  };
  function paren(c, p, right) {
    const s = TT.exprHTML(c);
    return TT.needParens(c, p, right) ? '<span class="t-par">(</span>' + s + '<span class="t-par">)</span>' : s;
  }

  TT.plain = html => html.replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');

  TT.exprText = e => TT.plain(TT.exprHTML(strip(e)));

  /* ---------- running a program ---------- */
  // A generator: each yield is one thing the computer does.
  TT.run = function* (prog, vars, ctx) {
    ctx.taken = {};
    ctx.outputs = [];
    if (TT.programHasBlank(prog.body)) {
      ctx.crashed = BLANK;
      yield { kind: 'crash', message: BLANK };
      return;
    }
    try {
      yield* block(prog.body, vars, ctx);
    } catch (err) {
      if (!(err instanceof Crash)) throw err;
      ctx.crashed = err.message;
      yield { kind: 'crash', sid: err.sid, message: err.message };
      return;
    }
    yield { kind: 'done' };
  };

  function* block(list, vars, ctx) {
    for (const s of list) {
      if (s.optional && !s.on) { yield { kind: 'off', sid: s.id, stmt: s }; continue; }
      try {
        if (s.k === 'set') {
          const before = vars[s.name];
          const r = TT.solve(s.expr, vars);
          vars[s.name] = r.value;
          yield { kind: 'set', sid: s.id, stmt: s, name: s.name, before, after: r.value, lines: r.lines };
        } else if (s.k === 'out') {
          ctx.outputs.push(s);
          yield { kind: 'out', sid: s.id, stmt: s, text: s.text, fx: s.fx };
        } else if (s.k === 'if') {
          let taken = null;
          for (let i = 0; i < s.branches.length; i++) {
            const problem = TT.check(s.branches[i].cond, vars);
            if (problem) throw new Crash(problem);
            const r = TT.solve(s.branches[i].cond, vars, true);
            yield { kind: 'cond', sid: s.id, stmt: s, branch: i, lines: r.lines, value: r.value };
            if (r.value === true) {
              taken = i;
              yield* block(s.branches[i].body, vars, ctx);
              break;
            }
          }
          if (taken === null) {
            if (s.else) {
              taken = 'else';
              yield { kind: 'else', sid: s.id, stmt: s };
              yield* block(s.else, vars, ctx);
            } else {
              taken = 'none';
              yield { kind: 'none', sid: s.id, stmt: s };
            }
          }
          ctx.taken[s.id] = taken;
          yield { kind: 'endif', sid: s.id, stmt: s, taken, silent: true };
        }
      } catch (err) {
        if (err instanceof Crash && !err.sid) err.sid = s.id;
        throw err;
      }
    }
  }

  /* Every statement inside a list, nested ones included. */
  TT.allStatements = function (list, out) {
    out = out || [];
    (list || []).forEach(s => {
      out.push(s);
      if (s.k === 'if') {
        s.branches.forEach(b => TT.allStatements(b.body, out));
        TT.allStatements(s.else, out);
      }
    });
    return out;
  };
})();
