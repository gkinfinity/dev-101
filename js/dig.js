/* The Dig Site: a small block world drawn with WebGL, no libraries.
   The page's pseudocode decides what digging does: every frame that the mouse
   button is held on a block, the program runs once with the live variables
   (distance, reach, isBedrock, holdTime, digTime). The world counts holdTime:
   seconds the button has been held on the same block. */
(function () {
  'use strict';
  const TT = window.TT;
  const esc = TT.esc;

  /* ===================================================================== */
  /* The world                                                              */
  /* ===================================================================== */
  const SX = 24, SY = 18, SZ = 24;
  const AIR = 0, GRASS = 1, DIRT = 2, STONE = 3, BEDROCK = 4, LOG = 5, LEAVES = 6, COAL = 7, GOLD = 8, DIAMOND = 9;
  const NAMES = ['air', 'grass', 'dirt', 'stone', 'bedrock', 'wood', 'leaves', 'coal ore', 'gold ore', 'diamond ore'];
  const TILE = [null, [0, 1, 2], [2, 2, 2], [3, 3, 3], [4, 4, 4], [6, 5, 6], [7, 7, 7], [8, 8, 8], [9, 9, 9], [10, 10, 10]];
  const DUST = [null, [0.36, 0.6, 0.25], [0.5, 0.34, 0.2], [0.55, 0.56, 0.58], [0.2, 0.2, 0.22], [0.45, 0.32, 0.18],
    [0.24, 0.52, 0.2], [0.25, 0.25, 0.27], [0.95, 0.78, 0.25], [0.4, 0.92, 0.95]];

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function makeWorld(seed) {
    const data = new Uint8Array(SX * SY * SZ);
    const idx = (x, y, z) => (y * SZ + z) * SX + x;
    const inside = (x, y, z) => x >= 0 && x < SX && y >= 0 && y < SY && z >= 0 && z < SZ;
    const W = {
      seed,
      get: (x, y, z) => (inside(x, y, z) ? data[idx(x, y, z)] : AIR),
      set: (x, y, z, b) => { if (inside(x, y, z)) data[idx(x, y, z)] = b; },
      top: [],
    };
    const rand = mulberry32(seed);
    const N = 9, lat = [];
    for (let i = 0; i < N * N; i++) lat.push(rand());
    const L = (i, j) => lat[(((j % N) + N) % N) * N + (((i % N) + N) % N)];
    const sm = t => t * t * (3 - 2 * t);
    const noise = (x, z) => {
      const i = Math.floor(x), j = Math.floor(z), fx = sm(x - i), fz = sm(z - j);
      const a = L(i, j), b = L(i + 1, j), c = L(i, j + 1), d = L(i + 1, j + 1);
      return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
    };
    for (let x = 0; x < SX; x++) {
      W.top[x] = [];
      for (let z = 0; z < SZ; z++) {
        const h = Math.max(4, Math.min(10, Math.round(6.5 + (noise(x / 6, z / 6) - 0.5) * 7 + (noise(x / 2.6 + 20, z / 2.6 + 20) - 0.5) * 2)));
        W.top[x][z] = h;
        for (let y = 0; y <= h; y++) {
          let b;
          if (y === 0 || (y === 1 && rand() < 0.4)) b = BEDROCK;
          else if (y < h - 3) {
            const r = rand();
            b = r < 0.02 && y <= 3 ? DIAMOND : r < 0.045 && y <= 5 ? GOLD : r < 0.11 ? COAL : STONE;
          } else if (y < h) b = DIRT;
          else b = GRASS;
          W.set(x, y, z, b);
        }
      }
    }
    const cx = SX >> 1, cz = SZ >> 1;
    const nearSpawn = (x, z, r) => Math.abs(x - cx) <= r && Math.abs(z - cz) <= r;
    // trees
    for (let t = 0, tries = 0; t < 7 && tries < 60; tries++) {
      const x = 2 + Math.floor(rand() * (SX - 4)), z = 2 + Math.floor(rand() * (SZ - 4));
      if (nearSpawn(x, z, 4) || W.get(x, W.top[x][z], z) !== GRASS) continue;
      const base = W.top[x][z] + 1;
      if (base + 6 >= SY) continue;
      for (let y = base; y < base + 4; y++) W.set(x, y, z, LOG);
      for (let dy = 2; dy <= 5; dy++) {
        const r = dy <= 3 ? 2 : 1;
        for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
          if (Math.abs(dx) === r && Math.abs(dz) === r && (r === 1 || rand() < 0.6)) continue;
          if (W.get(x + dx, base + dy, z + dz) === AIR) W.set(x + dx, base + dy, z + dz, LEAVES);
        }
      }
      t++;
    }
    // a bedrock pillar near the start: something you are not allowed to mine
    const ox = cx + 4, oz = cz - 4;
    const oh = W.top[ox][oz];
    for (let dx = 0; dx < 2; dx++) for (let dz = 0; dz < 2; dz++) for (let y = 1; y <= oh + 3; y++) W.set(ox + dx, y, oz + dz, BEDROCK);
    // a shaft with diamonds glinting at the bottom
    const px = cx - 5, pz = cz + 4;
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      for (let y = 2; y < SY; y++) W.set(px + dx, y, pz + dz, AIR);
      W.set(px + dx, 1, pz + dz, (dx + dz) % 2 === 0 ? DIAMOND : STONE);
    }
    W.spawn = [cx + 0.5, W.top[cx][cz] + 1, cz + 0.5];
    return W;
  }

  /* ===================================================================== */
  /* Turning blocks into triangles                                          */
  /* ===================================================================== */
  const FACES = [
    { n: [0, 1, 0], light: 1.0, c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], t: 0 },
    { n: [0, -1, 0], light: 0.5, c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], t: 2 },
    { n: [1, 0, 0], light: 0.8, c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], t: 1 },
    { n: [-1, 0, 0], light: 0.8, c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], t: 1 },
    { n: [0, 0, 1], light: 0.65, c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], t: 1 },
    { n: [0, 0, -1], light: 0.65, c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], t: 1 },
  ];
  const UV = [[0, 0], [1, 0], [1, 1], [0, 1]];
  const AO = [0.45, 0.65, 0.83, 1];
  const FLOATS = 10;  // x y z, u v, tile, light, nx ny nz

  function buildMesh(W) {
    const solid = (x, y, z) => (y < 0 ? true : W.get(x, y, z) !== AIR);
    const out = [];
    for (let y = 0; y < SY; y++) for (let z = 0; z < SZ; z++) for (let x = 0; x < SX; x++) {
      const b = W.get(x, y, z);
      if (b === AIR) continue;
      for (const f of FACES) {
        const nx = x + f.n[0], ny = y + f.n[1], nz = z + f.n[2];
        if (solid(nx, ny, nz)) continue;
        const axis = f.n[0] ? 0 : f.n[1] ? 1 : 2;
        const a = axis === 0 ? 1 : 0, bAx = axis === 2 ? 1 : 2;
        const tile = TILE[b][f.t];
        const verts = f.c.map((c, i) => {
          const da = c[a] ? 1 : -1, db = c[bAx] ? 1 : -1;
          const p1 = [nx, ny, nz], p2 = [nx, ny, nz], p3 = [nx, ny, nz];
          p1[a] += da; p2[bAx] += db; p3[a] += da; p3[bAx] += db;
          const s1 = solid(p1[0], p1[1], p1[2]) ? 1 : 0, s2 = solid(p2[0], p2[1], p2[2]) ? 1 : 0, s3 = solid(p3[0], p3[1], p3[2]) ? 1 : 0;
          const ao = s1 && s2 ? 0 : 3 - (s1 + s2 + s3);
          return { p: [x + c[0], y + c[1], z + c[2]], uv: UV[i], ao };
        });
        const order = verts[0].ao + verts[2].ao < verts[1].ao + verts[3].ao ? [1, 2, 3, 1, 3, 0] : [0, 1, 2, 0, 2, 3];
        for (const k of order) {
          const v = verts[k];
          out.push(v.p[0], v.p[1], v.p[2], v.uv[0], v.uv[1], tile, f.light * AO[v.ao], f.n[0], f.n[1], f.n[2]);
        }
      }
    }
    return new Float32Array(out);
  }

  /* ===================================================================== */
  /* Small matrix helpers (column-major, like WebGL wants)                  */
  /* ===================================================================== */
  function perspective(fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0];
  }
  function lookDir(e, d) {
    let zx = -d[0], zy = -d[1], zz = -d[2];
    let xx = zz, xy = 0, xz = -zx;               // cross(up, z) with up = (0, 1, 0)
    const xl = Math.hypot(xx, xy, xz) || 1;
    xx /= xl; xy /= xl; xz /= xl;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    return [xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0,
      -(xx * e[0] + xy * e[1] + xz * e[2]), -(yx * e[0] + yy * e[1] + yz * e[2]), -(zx * e[0] + zy * e[1] + zz * e[2]), 1];
  }
  function mul(a, b) {
    const o = new Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
    return o;
  }

  /* ===================================================================== */
  /* Shaders                                                                */
  /* ===================================================================== */
  const HEAD = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n' +
    'float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }\n';

  const WORLD_VS = [
    'attribute vec3 aPos; attribute vec2 aUV; attribute float aTile; attribute float aLight; attribute vec3 aNormal;',
    'uniform mat4 uMVP;',
    'varying vec2 vUV; varying float vTile; varying float vLight; varying vec3 vPos; varying vec3 vNormal;',
    'void main() { vUV = aUV; vTile = aTile; vLight = aLight; vPos = aPos; vNormal = aNormal; gl_Position = uMVP * vec4(aPos, 1.0); }',
  ].join('\n');

  const WORLD_FS = HEAD + [
    'varying vec2 vUV; varying float vTile; varying float vLight; varying vec3 vPos; varying vec3 vNormal;',
    'uniform vec3 uEye; uniform vec3 uFog;',
    'vec3 dirt(float n) { return mix(vec3(0.42, 0.28, 0.16), vec3(0.57, 0.39, 0.24), n); }',
    'vec3 stone(float n) { return mix(vec3(0.42, 0.43, 0.45), vec3(0.6, 0.61, 0.63), n); }',
    'vec3 grass(float n) { return mix(vec3(0.29, 0.55, 0.17), vec3(0.45, 0.72, 0.27), n); }',
    'vec3 tex(float t, vec2 uv) {',
    '  vec2 px = min(floor(uv * 16.0), 15.0);',
    '  float n = hash(px + t * 31.7);',
    '  float m = hash(px * 1.31 + t * 7.3 + 5.1);',
    '  if (t < 0.5) return grass(n);',
    '  if (t < 1.5) return px.y >= 12.0 + floor(m * 3.0) ? grass(n) : dirt(n);',
    '  if (t < 2.5) return dirt(n);',
    '  if (t < 3.5) return stone(n);',
    '  if (t < 4.5) return mix(vec3(0.06), vec3(0.4), n * n);',
    '  if (t < 5.5) return mix(vec3(0.33, 0.23, 0.13), vec3(0.47, 0.33, 0.19), n) * (0.82 + 0.18 * step(0.5, fract(px.x / 4.0 + m * 0.25)));',
    '  if (t < 6.5) return mix(vec3(0.56, 0.42, 0.26), vec3(0.72, 0.56, 0.35), step(0.5, fract(length(px - 7.5) / 3.0))) * (0.9 + 0.1 * n);',
    '  if (t < 7.5) return n < 0.18 ? vec3(0.08, 0.22, 0.07) : mix(vec3(0.16, 0.4, 0.12), vec3(0.3, 0.6, 0.2), m);',
    '  float spot = hash(floor(px / 3.0) + t * 3.1);',
    '  vec3 ore = t < 8.5 ? vec3(0.08) : t < 9.5 ? vec3(1.0, 0.8, 0.22) : vec3(0.35, 0.97, 0.97);',
    '  return (spot > 0.6 && m > 0.25) ? ore * (0.8 + 0.35 * n) : stone(n);',
    '}',
    'void main() {',
    '  vec3 col = tex(vTile, vUV) * vLight;',
    '  float fog = smoothstep(24.0, 48.0, distance(uEye, vPos));',
    '  gl_FragColor = vec4(mix(col, uFog, fog), 1.0);',
    '}',
  ].join('\n');

  const BOX_VS = [
    'attribute vec3 aPos; attribute vec2 aUV;',
    'uniform mat4 uMVP; uniform vec3 uAt;',
    'varying vec2 vUV;',
    'void main() { vUV = aUV; gl_Position = uMVP * vec4((aPos - 0.5) * 1.006 + 0.5 + uAt, 1.0); }',
  ].join('\n');

  const BOX_FS = HEAD + [
    'varying vec2 vUV; uniform float uProgress; uniform vec3 uColor;',
    'void main() {',
    '  vec2 px = min(floor(vUV * 16.0), 15.0);',
    '  float d = length(px - 7.5) / 10.6;',
    '  float crack = step(hash(px + 3.7), uProgress * 1.2 - d * 0.6);',
    '  float edge = min(1.0, step(vUV.x, 0.035) + step(0.965, vUV.x) + step(vUV.y, 0.035) + step(0.965, vUV.y));',
    '  vec4 c = vec4(uColor, 0.08);',
    '  if (crack > 0.5) c = vec4(0.03, 0.03, 0.03, 0.72);',
    '  if (edge > 0.5) c = vec4(uColor, 0.95);',
    '  gl_FragColor = c;',
    '}',
  ].join('\n');

  const DOT_VS = [
    'attribute vec3 aPos; attribute vec3 aColor;',
    'uniform mat4 uMVP; uniform float uScale;',
    'varying vec3 vColor;',
    'void main() { vColor = aColor; gl_Position = uMVP * vec4(aPos, 1.0); gl_PointSize = uScale / gl_Position.w; }',
  ].join('\n');
  const DOT_FS = 'precision mediump float; varying vec3 vColor; void main() { gl_FragColor = vec4(vColor, 1.0); }';

  function compile(gl, vs, fs) {
    const make = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, make(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, make(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const n = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES), a = {}, u = {};
    for (let i = 0; i < n; i++) { const info = gl.getActiveAttrib(p, i); a[info.name] = gl.getAttribLocation(p, info.name); }
    const m = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < m; i++) { const info = gl.getActiveUniform(p, i); u[info.name] = gl.getUniformLocation(p, info.name); }
    return { p, a, u };
  }

  // One unit cube (36 vertices) with face UVs, for the target box.
  const CUBE = (() => {
    const o = [];
    FACES.forEach(f => [0, 1, 2, 0, 2, 3].forEach(k => o.push(f.c[k][0], f.c[k][1], f.c[k][2], UV[k][0], UV[k][1])));
    return new Float32Array(o);
  })();

  /* ===================================================================== */
  /* Ray picking: walk the grid cell by cell                                */
  /* ===================================================================== */
  function raycast(W, o, d, maxDist) {
    let x = Math.floor(o[0]), y = Math.floor(o[1]), z = Math.floor(o[2]);
    const sx = Math.sign(d[0]), sy = Math.sign(d[1]), sz = Math.sign(d[2]);
    const tdx = sx ? Math.abs(1 / d[0]) : Infinity, tdy = sy ? Math.abs(1 / d[1]) : Infinity, tdz = sz ? Math.abs(1 / d[2]) : Infinity;
    let tx = sx ? ((sx > 0 ? x + 1 : x) - o[0]) / d[0] : Infinity;
    let ty = sy ? ((sy > 0 ? y + 1 : y) - o[1]) / d[1] : Infinity;
    let tz = sz ? ((sz > 0 ? z + 1 : z) - o[2]) / d[2] : Infinity;
    let t = 0;
    for (let i = 0; i < 200 && t <= maxDist; i++) {
      if (y >= 0 && W.get(x, y, z) !== AIR) return { x, y, z, t };
      if (tx < ty && tx < tz) { x += sx; t = tx; tx += tdx; }
      else if (ty < tz) { y += sy; t = ty; ty += tdy; }
      else { z += sz; t = tz; tz += tdz; }
      if (y < 0 || x < -1 || x > SX || z < -1 || z > SZ) break;
    }
    return null;
  }

  /* ===================================================================== */
  /* The page                                                               */
  /* ===================================================================== */
  let saved = null;  // the world and the player survive a trip to another page

  const round2 = x => Math.round(x * 100) / 100;

  TT.digPage = function (sc, app, ui) {
    const B = TT.B;
    if (!saved) {
      const parts = sc.parts(B);
      const prog = TT.prepare(sc.program(B, parts, 1));
      const vals = {};
      sc.vars.forEach(v => { vals[v.name] = v.init; });
      saved = { parts, step: 1, passed: {}, prog, vals, edited: false, world: null, player: null, mined: 0 };
    }
    const S = saved;
    const varDef = name => sc.vars.find(v => v.name === name);

    app.innerHTML =
      '<div class="sc-head">' +
      (ui.solo ? '' : '<a class="back-link" href="#/">← All scenarios</a>') +
      '<div class="sc-title">' + (ui.solo ? '' : '<span class="sc-num">' + sc.num + '</span>') + '<div><h1>' + esc(sc.title) + '</h1></div></div>' +
      (sc.goal ? '<div class="goal"><p><b>Goal:</b> ' + esc(sc.goal) + '</p>' +
        '<p>Build the code one colored step at a time: fill in the <b>?</b>s, press <b>Test my code</b>, then go to the next step. Play the game to figure out what each variable means; <b>Esc</b> pauses it so you can edit.</p></div>' : '') +
      '</div>' +
      '<div class="dig-cols">' +
      '<div class="col">' +
      '<section class="panel p-world">' +
      '<div class="world" id="world">' +
      '<canvas id="dig-canvas" tabindex="0" aria-label="3D block world. Click to play."></canvas>' +
      '<div class="xh" id="xh" aria-hidden="true"></div>' +
      '<div class="w-hud w-tl" id="hud-target">looking at: nothing</div>' +
      '<div class="dig-bar" id="dig-bar"><div id="dig-fill"></div></div>' +
      '<div class="pick" id="pick" aria-hidden="true"><svg viewBox="0 0 120 120"><g transform="rotate(-35 60 60)">' +
      '<rect x="55" y="38" width="10" height="78" rx="3" fill="#8b5a2b" stroke="#3b200c" stroke-width="2"/>' +
      '<path d="M14,44 Q60,14 106,44 L100,52 Q60,30 20,52Z" fill="#5ef2ff" stroke="#127c8c" stroke-width="2.5"/></g></svg></div>' +
      '<div class="w-overlay" id="w-overlay"><p class="paused-word">PAUSED</p><button type="button" class="btn btn-run" id="enter">▶ Play</button>' +
      '<p><b>WASD</b> move · <b>mouse</b> look · <b>hold click</b> dig · <b>space</b> jump</p>' +
      '<p><b>Esc</b> pauses the game so you can edit the code.</p></div>' +
      '<div class="w-overlay" id="no-gl" hidden><p>3D is not available in this browser.</p></div>' +
      '<div class="w-vars" id="mem" aria-label="Variables"></div>' +
      '</div>' +
      '<div class="screen-out" id="out"><span class="out-label">DISPLAY</span><span class="out-text"><i>nothing yet</i></span></div>' +
      '<div class="world-tools"><button type="button" class="btn btn-ghost" id="respawn">⤒ Respawn</button></div>' +
      '</section>' +
      '</div>' +
      '<div class="col">' +
      '<section class="panel p-code" id="code-panel"><div class="panel-head"><h2 id="code-title">Code</h2>' +
      '<button type="button" class="btn btn-ghost btn-small" id="to-questions" hidden>Questions</button>' +
      '<ol class="steps" id="steps" aria-label="Steps"></ol></div>' +
      '<div id="qbox" class="qbox"></div>' +
      '<div id="codebox">' +
      '<div class="code-wrap" id="code"></div>' +
      '<div class="code-actions"><button type="button" class="btn btn-run" id="test-btn">✓ Test my code</button>' +
      '<button type="button" class="btn btn-ghost" id="undo-btn">↺ Clear this step</button></div>' +
      '<ul class="tests" id="tests" hidden></ul></div></section>' +
      '<section class="panel p-trace"><div class="panel-head"><h2>Step by step</h2></div>' +
      '<ol class="trace live" id="trace"></ol></section>' +
      '</div></div>' +
      '<section class="panel p-chal p-end"><div class="panel-head"><h2>Challenges</h2><span class="panel-sub" id="chal-count"></span></div><ol class="chal" id="chal"></ol></section>' +
      (ui.solo ? '' : '<nav class="pager">' + (ui.prev ? '<a class="btn btn-ghost" href="#/' + ui.prev.id + '">← ' + esc(ui.prev.title) + '</a>' : '<span></span>') +
      '<a class="btn btn-ghost" href="#/">All scenarios</a></nav>');

    const $ = id => document.getElementById(id);
    const canvas = $('dig-canvas'), worldEl = $('world'), codeEl = $('code'), memEl = $('mem'), traceEl = $('trace');
    const xh = $('xh'), hudTarget = $('hud-target'), digBar = $('dig-bar'), digFill = $('dig-fill');
    const pick = $('pick'), overlay = $('w-overlay'), outEl = $('out');

    /* ----- code panel ----- */
    TT.blankVars = sc.vars.map(v => v.name).sort((a, b) => a.localeCompare(b));
    let lastSig = '';
    function drawCode() {
      codeEl.innerHTML = TT.renderCode(S.prog, 'pseudo');
      drawSteps();
      lastSig = '';
    }
    function codeEdited() { S.edited = true; $('tests').hidden = true; setOut(null); lastOut = ''; drawCode(); }
    codeEl.addEventListener('change', e => {
      const t = e.target;
      if (t.matches('select[data-slot="var"]')) { S.prog.nodes[t.dataset.eid].name = t.value; codeEdited(); }
      else if (t.matches('select.op')) { S.prog.nodes[t.dataset.eid].op = t.value; codeEdited(); }
      else if (t.matches('input.num')) { const n = parseFloat(t.value); S.prog.nodes[t.dataset.eid].v = isNaN(n) ? null : n; codeEdited(); }
    });
    codeEl.addEventListener('click', e => {
      const b = e.target.closest('.not-btn');
      if (!b) return;
      const n = S.prog.nodes[b.dataset.eid];
      n.on = !n.on;
      codeEdited();
    });
    codeEl.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('input.num')) e.target.blur(); });
    function buildProgram() { S.prog = TT.prepare(sc.program(B, S.parts, S.step)); }
    function drawSteps() {
      $('steps').innerHTML = sc.steps.map((st, i) => {
        const n = i + 1;
        const cls = n === S.step ? 'now' : S.passed[n] ? 'done' : n > S.step ? 'later' : '';
        return '<li class="step step-' + n + ' ' + cls + '" title="Step ' + n + '">' + (S.passed[n] ? '✓' : n) + '</li>';
      }).join('');
    }
    $('undo-btn').addEventListener('click', () => {
      const key = sc.partOrder[S.step - 1];
      S.parts[key] = sc.parts(B)[key];
      buildProgram();
      $('tests').hidden = true; setOut(null); lastOut = ''; drawCode();
    });
    function nextStep() {
      if (S.step >= sc.steps.length) return;
      S.step++;
      buildProgram();
      $('tests').hidden = true; setOut(null); lastOut = ''; drawCode(); drawChallenges();
    }
    $('tests').addEventListener('click', e => { if (e.target.closest('#next-step')) nextStep(); });

    // The confirmation when every test of a step passes.
    function confirmStep() {
      const n = S.step, last = n === sc.steps.length;
      const back = document.createElement('div');
      back.className = 'modal-back';
      back.innerHTML = '<div class="modal step-done step-' + n + '" role="dialog" aria-modal="true" aria-labelledby="sd">' +
        '<div class="big-check" aria-hidden="true">✓</div>' +
        '<h2 id="sd">' + (last ? 'All ' + n + ' steps correct!' : 'Step ' + n + ' is correct!') + '</h2>' +
        '<p>' + esc(sc.steps[n - 1].done) + '</p>' +
        '<div class="modal-foot">' +
        (last ? '<button type="button" class="btn btn-run" data-close>Done</button>'
          : '<button type="button" class="btn btn-ghost" data-close>Stay here</button><button type="button" class="btn btn-run" data-next>Next step →</button>') +
        '</div></div>';
      document.body.appendChild(back);
      const close = () => { back.remove(); document.removeEventListener('keydown', onKey); };
      const onKey = e => { if (e.key === 'Escape') close(); };
      document.addEventListener('keydown', onKey);
      back.addEventListener('click', e => {
        if (e.target === back || e.target.closest('[data-close]')) close();
        if (e.target.closest('[data-next]')) { close(); nextStep(); }
      });
      back.querySelector(last ? '[data-close]' : '[data-next]').focus();
    }

    // Run the code with set values and compare what it does with what it should do.
    function runTests() {
      const box = $('tests');
      // Each test runs once for every number RANDOM can give, so any code that
      // gives a diamond 1 time in 5 passes, whichever number it checks for.
      const DIAMOND_TEXT = 'You found a diamond!';
      const rand = S.prog.refs.rand;
      const lo = rand && rand.a.k === 'num' ? rand.a.v : 1, hi = rand && rand.b.k === 'num' ? rand.b.v : 1;
      const rolls = [];
      for (let v = Math.ceil(lo); v <= Math.floor(hi) && rolls.length < 1000; v++) rolls.push(v);
      if (!rolls.length) rolls.push(1);
      const said = list => (list.length ? list.map(v => '"' + esc(v) + '"').join(' then ') : 'nothing');
      // 2/7 reads as "2 times in 7"
      const howOften = f => {
        if (f === 1) return 'every time';
        if (f === 0) return 'never';
        for (let den = 2; den <= 100; den++) {
          const num = Math.round(f * den);
          if (Math.abs(num / den - f) < 1e-9) return num + (num === 1 ? ' time' : ' times') + ' in ' + den;
        }
        return Math.round(f * 100) + '% of the time';
      };
      const realRandom = TT.randInt;
      const tests = sc.steps[S.step - 1].tests;
      const rows = tests.map(t => {
        let diamonds = 0, why = null;
        try {
          for (const roll of rolls) {
            const vars = Object.assign({}, t.vals);
            const ctx = {};
            TT.randInt = () => roll;
            for (const st of TT.run(S.prog, vars, ctx)) { /* run it to the end */ }
            if (ctx.crashed) { why = ctx.crashed; break; }
            const got = (ctx.outputs || []).map(o => o.text);
            const rest = got.filter(x => x !== DIAMOND_TEXT);
            if (rest.join('|') !== t.expect.join('|')) {
              // a quoted message that already ends in . or ! needs no extra period
              const stop = list => (list.length && /[.!?]$/.test(list[list.length - 1]) && !rand ? ' ' : '. ');
              why = 'For ' + t.say + ', your code displayed ' + said(got) + (rand ? ' (when RANDOM gave ' + roll + ')' : '') + stop(got) +
                (t.expect.length ? 'It should display ' + said(t.expect) + stop(t.expect).trim() : 'It should not display anything yet.');
              break;
            }
            if (got.includes(DIAMOND_TEXT)) diamonds++;
          }
        } finally { TT.randInt = realRandom; }
        if (!why && Math.abs(diamonds / rolls.length - (t.diamond || 0)) > 1e-9) {
          why = 'For ' + t.say + ', a diamond should drop ' + howOften(t.diamond) + ', but your code drops one ' + diamonds + ' time' + (diamonds === 1 ? '' : 's') + ' out of ' + rolls.length + '.';
        }
        return { t, ok: !why, why };
      });
      // No test jargon for students: a pass is just "correct", a miss gets one tip.
      const miss = rows.find(r => !r.ok);
      if (!miss) {
        box.innerHTML = '<li class="summary pass">✓ Step ' + S.step + ' is correct!' +
          (S.step < sc.steps.length ? ' <button type="button" class="btn" id="next-step">Next step →</button>' : ' Your code is finished.') + '</li>';
      } else {
        box.innerHTML = '<li class="tip"><span class="tip-icon" aria-hidden="true">💡</span><div><b>Not quite yet.</b> ' + esc(miss.why) +
          '<div class="tip-hint"><b>Tip:</b> ' + esc(sc.steps[S.step - 1].tip) + '</div></div></li>';
      }
      box.hidden = false;
      if (!miss) {
        S.passed[S.step] = true;
        drawSteps();
        confirmStep();
      }
    }
    $('test-btn').addEventListener('click', runTests);

    // Light up the parts of the code that just ran.
    function markCode(steps) {
      const sig = steps.map(s => s.kind + ':' + s.sid + ':' + (s.branch == null ? '' : s.branch) + ':' + (s.value == null ? '' : s.value)).join('|');
      if (sig === lastSig) return;
      lastSig = sig;
      codeEl.querySelectorAll('.done, .skip, .is-true, .is-false').forEach(n => n.classList.remove('done', 'skip', 'is-true', 'is-false'));
      codeEl.querySelectorAll('.res').forEach(r => { r.className = 'res'; r.textContent = ''; });
      const q = sel => codeEl.querySelectorAll(sel);
      const badge = (sel, text, cls) => q(sel).forEach(n => {
        n.classList.add(cls === 't' ? 'is-true' : 'is-false');
        const r = n.querySelector(':scope > .res, :scope > .ln-code > .res');
        if (r) { r.textContent = text; r.className = 'res show ' + cls; }
      });
      const skipList = list => TT.allStatements(list).forEach(s => q('[data-sid="' + s.id + '"], [data-of="' + s.id + '"]').forEach(n => n.classList.add('skip')));
      steps.forEach(st => {
        const head = b => '[data-of="' + st.sid + '"][data-head="' + b + '"]';
        if (st.kind === 'set' || st.kind === 'out') q('[data-sid="' + st.sid + '"]').forEach(n => n.classList.add('done'));
        else if (st.kind === 'cond') badge(head(st.branch), st.value ? 'TRUE' : 'FALSE', st.value ? 't' : 'f');
        else if (st.kind === 'else') badge(head('else'), 'runs', 't');
        else if (st.kind === 'none') badge('[data-of="' + st.sid + '"][data-foot]', 'nothing ran', 'f');
        else if (st.kind === 'endif') {
          const s = st.stmt;
          s.branches.forEach((br, i) => {
            if (i === st.taken) return;
            q('[data-of="' + s.id + '"][data-body="' + i + '"]').forEach(n => n.classList.add('skip'));
            skipList(br.body);
            if (typeof st.taken === 'number' && i > st.taken) q(head(i)).forEach(n => n.classList.add('skip'));
          });
          if (s.else && st.taken !== 'else') {
            q(head('else') + ', [data-of="' + s.id + '"][data-body="else"]').forEach(n => n.classList.add('skip'));
            skipList(s.else);
          }
        }
      });
    }

    /* ----- memory panel ----- */
    const UNIT = { meters: 'm', seconds: 's' };
    const unitHTML = vd => (vd.unit ? '<span class="unit">' + (UNIT[vd.unit] || vd.unit) + '</span>' : '');
    function drawMem() {
      memEl.innerHTML = sc.vars.map(vd => {
        if (vd.slider) {
          const range = ' min="' + vd.min + '" max="' + vd.max + '" step="' + vd.step + '" data-var="' + vd.name + '"';
          return '<div class="wv wv-edit"><div class="wv-row"><span class="wv-name">' + vd.name + '</span>' +
            '<span><input type="number" class="wv-num"' + range + ' value="' + sliderText(vd, S.vals[vd.name]) + '" aria-label="' + vd.name + '">' + unitHTML(vd) + '</span></div>' +
            '<input type="range"' + range + ' value="' + S.vals[vd.name] + '" aria-label="' + vd.name + ' slider"></div>';
        }
        return '<div class="wv"><div class="wv-row"><span class="wv-name">' + vd.name + '</span>' +
          '<span><span class="wv-val" id="mv-' + vd.name + '"></span>' + unitHTML(vd) + '</span></div></div>';
      }).join('');
      updateMem();
    }
    function sliderText(vd, v) {
      const places = vd.step < 0.1 ? 2 : vd.step < 1 ? 1 : 0;
      return v.toFixed(places);
    }
    function badgeHTML(v) {
      if (v === true) return '<span class="vb vb-t">TRUE</span>';
      if (v === false) return '<span class="vb vb-f">FALSE</span>';
      return '<span class="vb vb-n">' + esc(TT.fmt(v)) + '</span>';
    }
    const lastMem = {};
    function updateMem() {
      sc.vars.forEach(vd => {
        if (vd.slider) return;
        const html = badgeHTML(S.vals[vd.name]);
        if (lastMem[vd.name] === html) return;
        lastMem[vd.name] = html;
        const el = $('mv-' + vd.name);
        if (el) el.innerHTML = html;
      });
    }
    // The slider and the number box show the same variable; keep them together.
    function setVar(name, n) {
      const vd = varDef(name);
      n = Math.min(vd.max, Math.max(vd.min, Math.round(n / vd.step) * vd.step));
      S.vals[name] = Math.round(n * 100) / 100;
      memEl.querySelectorAll('[data-var="' + name + '"]').forEach(el => {
        el.value = el.type === 'number' ? sliderText(vd, S.vals[name]) : S.vals[name];
      });
    }
    memEl.addEventListener('input', e => {
      if (e.target.type === 'range') setVar(e.target.dataset.var, parseFloat(e.target.value));
    });
    memEl.addEventListener('change', e => {
      if (e.target.type !== 'number') return;
      const n = parseFloat(e.target.value);
      setVar(e.target.dataset.var, isNaN(n) ? S.vals[e.target.dataset.var] : n);
    });
    memEl.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.type === 'number') e.target.blur(); });

    /* ----- challenges ----- */
    function drawChallenges(justDone) {
      const done = ui.progress()[sc.id] || {};
      $('chal').innerHTML = sc.challenges.map((ch, i) => {
        const locked = !done[i] && ch.step > S.step;
        return '<li class="' + (done[i] ? 'done' : '') + (locked ? ' locked' : '') + (justDone && justDone.includes(i) ? ' just' : '') + '">' +
          '<span class="tick" aria-hidden="true">' + (done[i] ? '✓' : i + 1) + '</span>' +
          '<span class="ch-step step-' + ch.step + '">Step ' + ch.step + '</span>' +
          '<span>' + ui.notate(esc(ch.text)) + (locked ? ' <i class="ch-lock">opens at step ' + ch.step + '</i>' : '') + '</span></li>';
      }).join('');
      $('chal-count').textContent = Object.keys(done).length + ' of ' + sc.challenges.length + ' done';
    }
    function checkChallenges(ev) {
      const all = ui.progress();
      const done = all[sc.id] || (all[sc.id] = {});
      const newly = [];
      sc.challenges.forEach((ch, i) => {
        if (done[i] || ch.step > S.step) return;
        let ok = false;
        try { ok = !!ch.check(ev); } catch (err) { ok = false; }
        if (ok) { done[i] = true; newly.push(i); }
      });
      if (!newly.length) return;
      ui.saveProgress();
      drawChallenges(newly);
      newly.forEach(i => ui.toast('Challenge ' + (i + 1) + ' done', 'good'));
    }

    function setOut(text, kind) {
      outEl.className = 'screen-out' + (kind ? ' ' + kind : '') + (text ? ' has' : '');
      outEl.innerHTML = '<span class="out-label">DISPLAY</span><span class="out-text">' + (text ? esc(text) : '<i>nothing yet</i>') + '</span>';
    }

    /* ----- questions: one at a time, then the code ----- */
    // Answers stay in this browser so a refresh does not lose them.
    const qs = sc.questions || [];
    const answerKey = v => 'teach-answers:' + sc.id + ':' + v;
    const answers = {};
    qs.forEach(v => { try { answers[v] = localStorage.getItem(answerKey(v)) || ''; } catch (err) { answers[v] = ''; } });
    const answered = v => answers[v].trim().length > 0;
    const allAnswered = () => qs.every(answered);
    if (S.qIndex == null) S.qIndex = 0;
    if (S.showCode == null) S.showCode = allAnswered();
    function drawQuestion() {
      const i = S.qIndex, v = qs[i], last = i === qs.length - 1;
      $('qbox').innerHTML =
        '<div class="q-dots">' + qs.map((x, k) => '<span class="q-dot' + (k === i ? ' now' : answered(x) ? ' done' : '') + '"></span>').join('') + '</div>' +
        '<label class="question"><span>Question ' + (i + 1) + ' of ' + qs.length + ': What do you think <span class="t-var">' + esc(v) + '</span> does?</span>' +
        '<textarea id="q-text" rows="4" placeholder="Play the game, watch ' + esc(v) + ' change, and describe what it does.">' + esc(answers[v]) + '</textarea></label>' +
        '<div class="q-nav"><button type="button" class="btn btn-ghost" id="q-back"' + (i === 0 ? ' disabled' : '') + '>← Back</button>' +
        (last
          ? '<button type="button" class="btn btn-run" id="q-done"' + (allAnswered() ? '' : ' disabled') + '>Show the code →</button>'
          : '<button type="button" class="btn btn-run" id="q-next"' + (answered(v) ? '' : ' disabled') + '>Next →</button>') + '</div>' +
        (last && !allAnswered() ? '<p class="q-left">Answer every question to see the code.</p>' : '');
    }
    function showView() {
      $('qbox').hidden = S.showCode;
      $('codebox').hidden = !S.showCode;
      $('steps').hidden = !S.showCode;
      $('to-questions').hidden = !S.showCode;
      $('code-title').textContent = S.showCode ? 'Code' : 'Questions';
      if (!S.showCode) drawQuestion();
    }
    $('qbox').addEventListener('input', e => {
      if (e.target.id !== 'q-text') return;
      const v = qs[S.qIndex];
      answers[v] = e.target.value;
      try { localStorage.setItem(answerKey(v), e.target.value); } catch (err) { /* private window */ }
      const next = $('q-next'), done = $('q-done');
      if (next) next.disabled = !answered(v);
      if (done) done.disabled = !allAnswered();
      const dot = $('qbox').querySelectorAll('.q-dot')[S.qIndex];
      if (dot) dot.classList.toggle('done', answered(v));
    });
    $('qbox').addEventListener('click', e => {
      if (e.target.closest('#q-back')) { S.qIndex = Math.max(0, S.qIndex - 1); drawQuestion(); }
      else if (e.target.closest('#q-next')) { S.qIndex = Math.min(qs.length - 1, S.qIndex + 1); drawQuestion(); }
      else if (e.target.closest('#q-done') && allAnswered()) { S.showCode = true; showView(); }
      const box = $('q-text');
      if (box && !e.target.closest('#q-done')) box.focus();
    });
    $('to-questions').addEventListener('click', () => { S.showCode = false; S.qIndex = 0; showView(); });
    showView();

    drawCode();
    drawMem();
    drawChallenges();
    traceEl.innerHTML = '';

    /* ----- WebGL setup ----- */
    const gl = canvas.getContext('webgl', { antialias: true, alpha: false }) || canvas.getContext('experimental-webgl');
    if (!gl) {
      $('no-gl').hidden = false;
      overlay.hidden = true;
      return () => {};
    }
    let world, worldProg, boxProg, dotProg, meshBuf, meshCount = 0;
    const cubeBuf = gl.createBuffer(), dotBuf = gl.createBuffer();
    try {
      worldProg = compile(gl, WORLD_VS, WORLD_FS);
      boxProg = compile(gl, BOX_VS, BOX_FS);
      dotProg = compile(gl, DOT_VS, DOT_FS);
    } catch (err) {
      $('no-gl').hidden = false;
      $('no-gl').innerHTML = '<p>The 3D view could not start: ' + esc(err.message) + '</p>';
      overlay.hidden = true;
      return () => {};
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuf);
    gl.bufferData(gl.ARRAY_BUFFER, CUBE, gl.STATIC_DRAW);
    meshBuf = gl.createBuffer();

    function rebuild() {
      const data = buildMesh(world);
      gl.bindBuffer(gl.ARRAY_BUFFER, meshBuf);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
      meshCount = data.length / FLOATS;
    }

    /* ----- player ----- */
    const HALF = 0.3, TALL = 1.8, EYE = 1.62;
    let P;
    function newWorld(seed) {
      world = makeWorld(seed);
      S.world = world;
      respawn();
      rebuild();
    }
    function respawn() {
      const sp = world.spawn;
      P = { x: sp[0], y: sp[1], z: sp[2], vy: 0, onGround: false, yaw: 2.0, pitch: -0.28 };
      S.player = P;
    }
    if (S.world) { world = S.world; P = S.player; rebuild(); } else newWorld(20261022);

    const solidAt = (x, y, z) => {
      if (x < 0 || x >= SX || z < 0 || z >= SZ || y < 0) return true;
      if (y >= SY) return false;
      return world.get(x, y, z) !== AIR;
    };
    function collides(x, y, z) {
      const x0 = Math.floor(x - HALF), x1 = Math.floor(x + HALF - 1e-4);
      const y0 = Math.floor(y), y1 = Math.floor(y + TALL - 1e-4);
      const z0 = Math.floor(z - HALF), z1 = Math.floor(z + HALF - 1e-4);
      for (let bx = x0; bx <= x1; bx++) for (let by = y0; by <= y1; by++) for (let bz = z0; bz <= z1; bz++) {
        if (solidAt(bx, by, bz)) return true;
      }
      return false;
    }
    function moveAxis(axis, d) {
      const n = Math.max(1, Math.ceil(Math.abs(d) / 0.3));
      const step = d / n;
      for (let i = 0; i < n; i++) {
        const nx = P.x + (axis === 0 ? step : 0), ny = P.y + (axis === 1 ? step : 0), nz = P.z + (axis === 2 ? step : 0);
        if (collides(nx, ny, nz)) {
          if (axis === 1 && step < 0) {
            const snap = Math.floor(P.y);
            if (!collides(P.x, snap, P.z)) P.y = snap;
          }
          return false;
        }
        P.x = nx; P.y = ny; P.z = nz;
      }
      return true;
    }

    /* ----- input ----- */
    const keys = {};
    let mouseDig = false, keyDig = false, dragLook = false, locked = false;
    const active = () => locked || document.activeElement === canvas;
    const onKeyDown = e => {
      if (e.target.matches && e.target.matches('input, select, textarea')) return;
      if (!active()) return;
      keys[e.code] = true;
      if (e.code === 'KeyF') keyDig = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    };
    const onKeyUp = e => {
      keys[e.code] = false;
      if (e.code === 'KeyF') keyDig = false;
    };
    let started = false;
    const onLockChange = () => {
      locked = document.pointerLockElement === canvas;
      worldEl.classList.toggle('playing', locked);
      if (locked) { started = true; overlay.hidden = true; return; }
      // Esc: pause, so the code can be edited
      mouseDig = false;
      canvas.blur();
      overlay.hidden = false;
      overlay.classList.toggle('paused', started);
    };
    const onMouseMove = e => {
      if (locked || dragLook) {
        P.yaw += e.movementX * 0.0026;
        P.pitch = Math.max(-1.55, Math.min(1.55, P.pitch - e.movementY * 0.0026));
      }
    };
    const onMouseUp = e => { if (e.button === 0) { mouseDig = false; dragLook = false; } };
    canvas.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      e.preventDefault();
      canvas.focus({ preventScroll: true });
      if (locked) { mouseDig = true; return; }
      dragLook = true;
      enter();
    });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('focus', () => { overlay.hidden = true; });
    canvas.addEventListener('blur', () => { if (!locked) overlay.hidden = false; for (const k in keys) keys[k] = false; keyDig = false; });
    function enter() {
      overlay.hidden = true;
      canvas.focus({ preventScroll: true });
      try {
        const r = canvas.requestPointerLock && canvas.requestPointerLock();
        if (r && r.catch) r.catch(() => {});
      } catch (err) { /* drag to look instead */ }
    }
    $('enter').addEventListener('click', enter);
    $('respawn').addEventListener('click', () => { respawn(); canvas.focus({ preventScroll: true }); });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    document.addEventListener('pointerlockchange', onLockChange);

    /* ----- particles ----- */
    let dots = [];
    function burst(x, y, z, b) {
      const c = DUST[b] || [0.5, 0.5, 0.5];
      for (let i = 0; i < 26; i++) {
        dots.push({
          p: [x + 0.2 + Math.random() * 0.6, y + 0.2 + Math.random() * 0.6, z + 0.2 + Math.random() * 0.6],
          v: [(Math.random() - 0.5) * 4, Math.random() * 4 + 1, (Math.random() - 0.5) * 4],
          c: c.map(k => k * (0.75 + Math.random() * 0.4)), life: 0.6 + Math.random() * 0.5,
        });
      }
    }

    /* ----- the frame loop ----- */
    let raf = 0, last = performance.now(), uiTimer = 0, holdKey = '', lastTargetKey = '', lastOut = '';
    let target = null, lastSteps = [], previewLines = null, keepSteps = [], keepUntil = 0;

    function frame(now) {
      raf = requestAnimationFrame(frame);
      if (document.hidden) { last = now; return; }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      // move
      const speed = 4.3;
      let fx = 0, fz = 0;
      const sin = Math.sin(P.yaw), cos = Math.cos(P.yaw);
      if (keys.KeyW) { fx += sin; fz -= cos; }
      if (keys.KeyS) { fx -= sin; fz += cos; }
      if (keys.KeyD) { fx += cos; fz += sin; }
      if (keys.KeyA) { fx -= cos; fz -= sin; }
      if (keys.ArrowLeft) P.yaw -= 2.2 * dt;
      if (keys.ArrowRight) P.yaw += 2.2 * dt;
      if (keys.ArrowUp) P.pitch = Math.min(1.55, P.pitch + 1.6 * dt);
      if (keys.ArrowDown) P.pitch = Math.max(-1.55, P.pitch - 1.6 * dt);
      const len = Math.hypot(fx, fz);
      if (len > 0) {
        const mx = fx / len * speed * dt, mz = fz / len * speed * dt;
        const okX = moveAxis(0, mx), okZ = moveAxis(2, mz);
        if ((!okX || !okZ) && P.onGround && !collides(P.x + Math.sign(mx) * 0.4, P.y + 1.05, P.z + Math.sign(mz) * 0.4)) P.vy = 7.4;
      }
      if (keys.Space && P.onGround) P.vy = 7.4;
      P.vy = Math.max(-28, P.vy - 24 * dt);
      const wasFalling = P.vy < 0;
      P.onGround = false;
      if (!moveAxis(1, P.vy * dt)) {
        if (wasFalling) P.onGround = true;
        P.vy = 0;
      }
      if (P.y < -5) respawn();

      // aim
      const eye = [P.x, P.y + EYE, P.z];
      const dir = [Math.cos(P.pitch) * Math.sin(P.yaw), Math.sin(P.pitch), -Math.cos(P.pitch) * Math.cos(P.yaw)];
      const hit = raycast(world, eye, dir, 40);
      target = hit;
      const V = S.vals;
      let condValue = null;
      if (hit) {
        const b = world.get(hit.x, hit.y, hit.z);
        // From your eyes to the exact spot the crosshair touches, so it changes as you aim.
        V.distance = round2(hit.t);
        V.isBedrock = b === BEDROCK;
        V.isDiamond = b === DIAMOND;
        const key = hit.x + ',' + hit.y + ',' + hit.z;
        if (key !== lastTargetKey) {
          lastTargetKey = key;
          hudTarget.innerHTML = 'looking at: <b>' + NAMES[b] + '</b>';
        }
      } else if (lastTargetKey !== '') {
        lastTargetKey = '';
        hudTarget.textContent = 'looking at: sky';
      }

      // run the code while digging
      const digging = (mouseDig || keyDig) && hit;
      if (digging) {
        const b = world.get(hit.x, hit.y, hit.z);
        const key = hit.x + ',' + hit.y + ',' + hit.z;
        if (key !== holdKey) { holdKey = key; V.holdTime = 0; } else V.holdTime += dt;
        const ctx = {};
        const steps = [];
        for (const st of TT.run(S.prog, V, ctx)) steps.push(st);
        lastSteps = steps;
        // A frame that mined a block stays in the step-by-step panel for a moment,
        // so the RANDOM roll can be read.
        if (steps.some(st => st.kind === 'out' && st.stmt.fx === 'mine')) { keepSteps = steps; keepUntil = now + 2000; }
        const outs = ctx.outputs || [];
        const o = outs.length ? outs[outs.length - 1] : null;
        if (ctx.crashed) {
          if (lastOut !== ctx.crashed) { setOut(ctx.crashed, 'crash'); lastOut = ctx.crashed; }
        } else if (o) {
          const gem = outs.some(x => x.fx === 'gem');
          if (outs.some(x => x.fx === 'mine')) {
            world.set(hit.x, hit.y, hit.z, AIR);
            burst(hit.x, hit.y, hit.z, b);
            rebuild();
            S.mined++;
            holdKey = '';
            V.holdTime = 0;
            if (gem) burst(hit.x, hit.y, hit.z, DIAMOND);
            checkChallenges({ block: NAMES[b], distance: V.distance, vals: Object.assign({}, V), refs: S.prog.refs, gem });
          }
          if (lastOut !== o.text) { setOut(o.text, o.fx === 'far' || o.fx === 'bedrock' ? 'warn' : ''); lastOut = o.text; }
        }
      } else {
        if (!(mouseDig || keyDig)) { V.holdTime = 0; holdKey = ''; }
        lastSteps = [];
      }

      // Green or red follows what the student's code would do with this block if
      // the button were held long enough; null while the code has blanks.
      const canMine = hit ? wouldMine(V, 1e9) : null;
      condValue = canMine;
      // The bar only matters when the code makes mining take time.
      const timed = !!canMine && !wouldMine(V, 0);

      // HUD
      xh.className = 'xh' + (canMine == null ? '' : canMine ? ' ok' : ' no');
      const prog = V.digTime > 0 ? Math.min(1, V.holdTime / V.digTime) : (digging ? 1 : 0);
      digBar.classList.toggle('on', !!digging && timed);
      digFill.style.width = (prog * 100).toFixed(1) + '%';
      pick.classList.toggle('swing', !!digging && !!canMine);

      // particles
      dots = dots.filter(d => (d.life -= dt) > 0);
      dots.forEach(d => {
        d.v[1] -= 18 * dt;
        d.p[0] += d.v[0] * dt; d.p[1] += d.v[1] * dt; d.p[2] += d.v[2] * dt;
        if (solidAt(Math.floor(d.p[0]), Math.floor(d.p[1]), Math.floor(d.p[2]))) { d.v[1] = 0; d.v[0] *= 0.5; d.v[2] *= 0.5; d.p[1] = Math.floor(d.p[1]) + 1.02; }
      });

      draw(eye, dir, prog, condValue);

      // the slower panels
      uiTimer -= dt;
      if (uiTimer <= 0) {
        uiTimer = 0.12;
        updateMem();
        const shown = now < keepUntil ? keepSteps : lastSteps;
        if (shown.length) {
          markCode(shown);
          const html = shown.filter(s => !s.silent && s.kind !== 'done' && s.kind !== 'none')
            .map((s, i) => { const h = TT.stepHTML(s, i + 1); return '<li class="tr ' + h.cls + '">' + h.html + '</li>'; }).join('');
          if (html !== previewLines) { traceEl.innerHTML = html; previewLines = html; }
        } else if (hit && S.prog.main) {
          markCode([]);
          const cond = S.prog.main.branches[0].cond;
          const problem = TT.programHasBlank(S.prog.body) ? 'Fill in every ? first.' : TT.check(cond, V);
          let html;
          if (problem) html = '<li class="tr k-crash"><div class="tr-line"><span>' + esc(problem) + '</span></div></li>';
          else {
            const r = TT.solve(cond, V, true);
            html = '<li class="tr k-predict"><div class="tr-work">' + r.lines.map((l, i) => '<code>' + (i ? '→ ' : '') + l + '</code>').join('') + '</div></li>';
          }
          if (html !== previewLines) { previewLines = html; traceEl.innerHTML = html; }
        }
      }
    }

    // Run the code on the side with a chosen holdTime: would it mine this block?
    function wouldMine(V, hold) {
      if (TT.programHasBlank(S.prog.body)) return null;
      const vars = Object.assign({}, V, { holdTime: hold });
      const ctx = {};
      try { for (const st of TT.run(S.prog, vars, ctx)) { /* run it to the end */ } } catch (err) { return null; }
      if (ctx.crashed) return null;
      return (ctx.outputs || []).some(o => o.fx === 'mine');
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr)), h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    }

    const SKY = [0.55, 0.77, 0.98];
    function draw(eye, dir, progress, condValue) {
      resize();
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(SKY[0], SKY[1], SKY[2], 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      const mvp = mul(perspective(1.22, canvas.width / canvas.height, 0.05, 120), lookDir(eye, dir));

      // the world
      const wp = worldProg;
      gl.useProgram(wp.p);
      gl.disable(gl.BLEND);
      gl.depthMask(true);
      gl.bindBuffer(gl.ARRAY_BUFFER, meshBuf);
      const stride = FLOATS * 4;
      const attr = (name, size, offset) => {
        const loc = wp.a[name];
        if (loc == null || loc < 0) return;
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, offset * 4);
      };
      attr('aPos', 3, 0); attr('aUV', 2, 3); attr('aTile', 1, 5); attr('aLight', 1, 6); attr('aNormal', 3, 7);
      gl.uniformMatrix4fv(wp.u.uMVP, false, mvp);
      gl.uniform3fv(wp.u.uEye, eye);
      gl.uniform3fv(wp.u.uFog, SKY);
      gl.drawArrays(gl.TRIANGLES, 0, meshCount);
      Object.values(wp.a).forEach(loc => gl.disableVertexAttribArray(loc));

      // the box around the block you are looking at, with cracks while digging
      if (target) {
        const bp = boxProg;
        gl.useProgram(bp.p);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false);
        gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuf);
        gl.enableVertexAttribArray(bp.a.aPos);
        gl.vertexAttribPointer(bp.a.aPos, 3, gl.FLOAT, false, 20, 0);
        gl.enableVertexAttribArray(bp.a.aUV);
        gl.vertexAttribPointer(bp.a.aUV, 2, gl.FLOAT, false, 20, 12);
        gl.uniformMatrix4fv(bp.u.uMVP, false, mvp);
        gl.uniform3f(bp.u.uAt, target.x, target.y, target.z);
        gl.uniform1f(bp.u.uProgress, progress);
        gl.uniform3fv(bp.u.uColor, condValue == null ? [0.9, 0.9, 0.9] : condValue ? [0.1, 1, 0.45] : [1, 0.25, 0.35]);
        gl.drawArrays(gl.TRIANGLES, 0, 36);
        gl.disableVertexAttribArray(bp.a.aPos);
        gl.disableVertexAttribArray(bp.a.aUV);
        gl.depthMask(true);
      }

      // flying bits of a mined block
      if (dots.length) {
        const dp = dotProg;
        gl.useProgram(dp.p);
        gl.disable(gl.BLEND);
        const arr = new Float32Array(dots.length * 6);
        dots.forEach((d, i) => { arr.set(d.p, i * 6); arr.set(d.c, i * 6 + 3); });
        gl.bindBuffer(gl.ARRAY_BUFFER, dotBuf);
        gl.bufferData(gl.ARRAY_BUFFER, arr, gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(dp.a.aPos);
        gl.vertexAttribPointer(dp.a.aPos, 3, gl.FLOAT, false, 24, 0);
        gl.enableVertexAttribArray(dp.a.aColor);
        gl.vertexAttribPointer(dp.a.aColor, 3, gl.FLOAT, false, 24, 12);
        gl.uniformMatrix4fv(dp.u.uMVP, false, mvp);
        gl.uniform1f(dp.u.uScale, canvas.height * 0.06);
        gl.drawArrays(gl.POINTS, 0, dots.length);
        gl.disableVertexAttribArray(dp.a.aPos);
        gl.disableVertexAttribArray(dp.a.aColor);
      }
    }

    raf = requestAnimationFrame(frame);

    // Exposed for automated checks: aim the player and dig without a mouse.
    TT.digDebug = {
      look(yaw, pitch) { P.yaw = yaw; P.pitch = pitch; },
      dig(on) { keyDig = on; },
      player: () => P,
      target: () => target,
      vals: S.vals,
      mined: () => S.mined,
    };

    return function cleanup() {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('pointerlockchange', onLockChange);
      if (document.pointerLockElement === canvas && document.exitPointerLock) document.exitPointerLock();
      S.vals.holdTime = 0;
      const lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
      delete TT.digDebug;
    };
  };
})();
