/* The Dig Site: a small block world drawn with WebGL, no libraries.
   The page's pseudocode decides what digging does: every frame that the mouse
   button is held on a block, the program runs once with the live variables
   (distance, reach, isBedrock, holdTime, digTime, frameTime). */
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
    'uniform vec3 uEye; uniform vec3 uFog; uniform float uReach; uniform float uOp; uniform float uShowReach;',
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
    'bool inReach(float d) {',
    '  if (uOp < 0.5) return d < uReach;',
    '  if (uOp < 1.5) return d <= uReach;',
    '  if (uOp < 2.5) return d > uReach;',
    '  if (uOp < 3.5) return d >= uReach;',
    '  if (uOp < 4.5) return abs(d - uReach) < 0.005;',
    '  return abs(d - uReach) >= 0.005;',
    '}',
    'void main() {',
    '  vec3 col = tex(vTile, vUV) * vLight;',
    '  if (uShowReach > 0.5) {',
    '    vec3 center = floor(vPos - vNormal * 0.5) + 0.5;',
    '    float d = floor(distance(uEye, center) * 100.0 + 0.5) / 100.0;',
    '    if (inReach(d)) {',
    '      float edge = min(1.0, step(vUV.x, 0.035) + step(0.965, vUV.x) + step(vUV.y, 0.035) + step(0.965, vUV.y));',
    '      col = mix(col, vec3(0.0, 1.0, 0.42), 0.07 + 0.38 * edge);',
    '    }',
    '  }',
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

  const OP_INDEX = { '<': 0, '<=': 1, '>': 2, '>=': 3, '==': 4, '!=': 5 };
  const round2 = x => Math.round(x * 100) / 100;

  TT.digPage = function (sc, app, ui) {
    const B = TT.B;
    if (!saved) {
      const prog = TT.prepare(sc.code(B));
      const vals = {};
      sc.vars.forEach(v => { vals[v.name] = v.init; });
      saved = { prog, vals, edited: false, world: null, player: null, mined: 0, showReach: true };
    }
    const S = saved;
    const varDef = name => sc.vars.find(v => v.name === name);

    app.innerHTML =
      '<div class="sc-head">' +
      '<a class="back-link" href="#/">← All scenarios</a>' +
      '<div class="sc-title"><span class="sc-num">' + sc.num + '</span><div><h1>' + esc(sc.title) + '</h1>' +
      '<div class="chips">' + ui.chips(sc.concepts) + '</div></div></div>' +
      '<p class="story">' + esc(sc.story) + '</p></div>' +
      '<div class="dig-cols">' +
      '<div class="col">' +
      '<section class="panel p-world">' +
      '<div class="world" id="world">' +
      '<canvas id="dig-canvas" tabindex="0" aria-label="3D block world. Click to play."></canvas>' +
      '<div class="xh" id="xh" aria-hidden="true"></div>' +
      '<div class="w-hud w-tl" id="hud-target">looking at: nothing</div>' +
      '<div class="w-hud w-tr" id="hud-count">mined 0</div>' +
      '<div class="dig-bar" id="dig-bar"><div id="dig-fill"></div></div>' +
      '<div class="pick" id="pick" aria-hidden="true"><svg viewBox="0 0 120 120"><g transform="rotate(-35 60 60)">' +
      '<rect x="55" y="38" width="10" height="78" rx="3" fill="#8b5a2b" stroke="#3b200c" stroke-width="2"/>' +
      '<path d="M14,44 Q60,14 106,44 L100,52 Q60,30 20,52Z" fill="#5ef2ff" stroke="#127c8c" stroke-width="2.5"/></g></svg></div>' +
      '<div class="w-overlay" id="w-overlay"><button type="button" class="btn btn-run" id="enter">▶ Enter the world</button>' +
      '<p><b>W A S D</b> move · <b>mouse</b> look · <b>hold click</b> dig · <b>space</b> jump · <b>Esc</b> get your mouse back</p>' +
      '<p class="muted small">No mouse? Arrow keys look around and <b>F</b> digs.</p></div>' +
      '<div class="w-overlay" id="no-gl" hidden><p>This browser cannot draw 3D (WebGL is turned off). The rest of the page still works.</p></div>' +
      '</div>' +
      '<div class="screen-out" id="out"><span class="out-label">OUTPUT</span><span class="out-text"><i>nothing yet</i></span></div>' +
      '<div class="world-tools"><label class="mini"><input type="checkbox" id="show-reach"' + (S.showReach ? ' checked' : '') + '> Show blocks in reach</label>' +
      '<button type="button" class="btn btn-ghost" id="respawn">⤒ Back to the start</button>' +
      '<button type="button" class="btn btn-ghost" id="new-world">↺ New world</button></div>' +
      '</section>' +
      '<section class="panel p-mem"><div class="panel-head"><h2>Memory</h2><span class="panel-sub">drag the sliders · the rest change by themselves</span></div>' +
      '<div class="mem" id="mem"></div></section>' +
      '<section class="panel p-chal"><div class="panel-head"><h2>Challenges</h2><span class="panel-sub" id="chal-count"></span></div><ol class="chal" id="chal"></ol></section>' +
      '<section class="panel p-think"><div class="panel-head"><h2>Think about it</h2></div><ul class="think">' +
      sc.think.map(t => '<li>' + ui.notate(t) + '</li>').join('') + '</ul></section>' +
      '</div>' +
      '<div class="col">' +
      '<section class="panel p-code" id="code-panel"><div class="panel-head"><h2>Code</h2><span class="every-frame">runs every frame</span>' +
      '<div class="seg" role="group" aria-label="How to show the code"><button type="button" data-view="blocks">Blocks</button><button type="button" data-view="pseudo">Pseudocode</button></div></div>' +
      '<div class="code-wrap" id="code"></div>' +
      '<div class="undo-bar" id="undo" hidden><span>✎ You changed the code.</span> <button type="button" class="link-btn" id="undo-btn">Undo my changes</button></div>' +
      '<p class="code-hint">Change an operator, a number or NOT and go try it in the world. The code is live.</p></section>' +
      '<section class="panel p-trace"><div class="panel-head"><h2>This frame</h2><span class="panel-sub">what the computer just worked out</span></div>' +
      '<ol class="trace" id="trace"></ol></section>' +
      '</div></div>' +
      '<nav class="pager">' + (ui.prev ? '<a class="btn btn-ghost" href="#/' + ui.prev.id + '">← ' + esc(ui.prev.title) + '</a>' : '<span></span>') +
      '<a class="btn btn-ghost" href="#/">All scenarios</a></nav>';

    const $ = id => document.getElementById(id);
    const canvas = $('dig-canvas'), worldEl = $('world'), codeEl = $('code'), memEl = $('mem'), traceEl = $('trace');
    const xh = $('xh'), hudTarget = $('hud-target'), hudCount = $('hud-count'), digBar = $('dig-bar'), digFill = $('dig-fill');
    const pick = $('pick'), overlay = $('w-overlay'), outEl = $('out');

    /* ----- code panel ----- */
    let lastSig = '';
    function drawCode() {
      codeEl.innerHTML = TT.renderCode(S.prog, TT.settings.view);
      document.querySelectorAll('.seg [data-view]').forEach(b => {
        const on = b.dataset.view === TT.settings.view;
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', on);
      });
      $('undo').hidden = !S.edited;
      lastSig = '';
    }
    function codeEdited() { S.edited = true; drawCode(); }
    codeEl.addEventListener('change', e => {
      const t = e.target;
      if (t.matches('select.op')) { S.prog.nodes[t.dataset.eid].op = t.value; codeEdited(); }
      else if (t.matches('input.num')) { const n = parseFloat(t.value); if (!isNaN(n)) S.prog.nodes[t.dataset.eid].v = n; codeEdited(); }
      else if (t.matches('input.opt-toggle')) { S.prog.stmts[t.dataset.sid].on = t.checked; codeEdited(); }
    });
    codeEl.addEventListener('click', e => {
      const b = e.target.closest('.not-btn');
      if (!b) return;
      const n = S.prog.nodes[b.dataset.eid];
      n.on = !n.on;
      codeEdited();
    });
    codeEl.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('input.num')) e.target.blur(); });
    $('undo-btn').addEventListener('click', () => { S.prog = TT.prepare(sc.code(B)); S.edited = false; drawCode(); });
    document.querySelectorAll('.seg [data-view]').forEach(b => b.addEventListener('click', () => {
      TT.settings.view = b.dataset.view;
      ui.saveSettings();
      drawCode();
    }));

    // Light up the parts of the code that ran this frame.
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
    function drawMem() {
      memEl.innerHTML = sc.vars.map(vd => {
        const role = vd.role || 'input';
        if (vd.slider) {
          return '<div class="box box-slider"><div class="box-top"><span class="box-name">' + vd.name + '</span><span class="vb vb-n" id="sv-' + vd.name + '">' +
            TT.fmt(S.vals[vd.name]) + '</span><span class="unit">' + vd.unit + '</span></div>' +
            '<input type="range" min="' + vd.min + '" max="' + vd.max + '" step="' + vd.step + '" value="' + S.vals[vd.name] + '" data-var="' + vd.name + '" aria-label="' + vd.name + '">' +
            '<div class="box-hint">' + esc(vd.hint) + '</div></div>';
        }
        return '<div class="box role-' + role + '"><div class="box-top"><span class="box-name">' + vd.name + '</span></div>' +
          '<div class="mem-val" id="mv-' + vd.name + '"></div><div class="box-hint">' + esc(vd.hint) + '</div></div>';
      }).join('');
      updateMem();
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
    memEl.addEventListener('input', e => {
      const t = e.target;
      if (!t.dataset.var) return;
      const n = parseFloat(t.value);
      S.vals[t.dataset.var] = n;
      $('sv-' + t.dataset.var).textContent = TT.fmt(n);
    });
    memEl.addEventListener('change', () => canvas.focus({ preventScroll: true }));

    /* ----- challenges ----- */
    function drawChallenges(justDone) {
      const done = ui.progress()[sc.id] || {};
      $('chal').innerHTML = sc.challenges.map((ch, i) =>
        '<li class="' + (done[i] ? 'done' : '') + (justDone && justDone.includes(i) ? ' just' : '') + '">' +
        '<span class="tick" aria-hidden="true">' + (done[i] ? '✓' : i + 1) + '</span><span>' + ui.notate(esc(ch.text)) + '</span></li>').join('');
      $('chal-count').textContent = Object.keys(done).length + ' of ' + sc.challenges.length + ' done';
    }
    function checkChallenges(ev) {
      const all = ui.progress();
      const done = all[sc.id] || (all[sc.id] = {});
      const newly = [];
      sc.challenges.forEach((ch, i) => {
        if (done[i]) return;
        let ok = false;
        try { ok = !!ch.check(ev); } catch (err) { ok = false; }
        if (ok) { done[i] = true; newly.push(i); }
      });
      if (!newly.length) return;
      ui.saveProgress();
      drawChallenges(newly);
      newly.forEach(i => ui.toast('⭐ Challenge ' + (i + 1) + ' complete!', 'good'));
    }

    function setOut(text, kind) {
      outEl.className = 'screen-out' + (kind ? ' ' + kind : '') + (text ? ' has' : '');
      outEl.innerHTML = '<span class="out-label">OUTPUT</span><span class="out-text">' + (text ? esc(text) : '<i>nothing yet</i>') + '</span>';
    }

    drawCode();
    drawMem();
    drawChallenges();
    traceEl.innerHTML = '<li class="tr-empty">Enter the world and hold the mouse button on a block. Each frame, this panel shows what the code worked out.</li>';

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
    const onLockChange = () => {
      locked = document.pointerLockElement === canvas;
      overlay.hidden = locked || document.activeElement === canvas;
      worldEl.classList.toggle('playing', locked);
      if (!locked) mouseDig = false;
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
    $('new-world').addEventListener('click', () => { newWorld((Math.random() * 1e9) | 0); canvas.focus({ preventScroll: true }); });
    $('show-reach').addEventListener('change', e => { S.showReach = e.target.checked; });
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
    let raf = 0, last = performance.now(), uiTimer = 0, holdCount = 0, lastTargetKey = '', lastOut = '';
    let target = null, lastSteps = [], previewLines = null;

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
      V.frameTime = dt;
      let condValue = null;
      if (hit) {
        const b = world.get(hit.x, hit.y, hit.z);
        V.distance = round2(Math.hypot(hit.x + 0.5 - eye[0], hit.y + 0.5 - eye[1], hit.z + 0.5 - eye[2]));
        V.isBedrock = b === BEDROCK;
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
        const ctx = {};
        const steps = [];
        for (const st of TT.run(S.prog, V, ctx)) steps.push(st);
        lastSteps = steps;
        const outs = ctx.outputs || [];
        const o = outs.length ? outs[outs.length - 1] : null;
        if (ctx.crashed) {
          if (lastOut !== ctx.crashed) { setOut('CRASH! ' + ctx.crashed, 'crash'); lastOut = ctx.crashed; }
        } else if (o) {
          if (o.fx === 'mine') {
            world.set(hit.x, hit.y, hit.z, AIR);
            burst(hit.x, hit.y, hit.z, b);
            rebuild();
            S.mined++;
            holdCount++;
            hudCount.textContent = 'mined ' + S.mined;
            pulseEl(hudCount);
            checkChallenges({ block: NAMES[b], distance: V.distance, vals: Object.assign({}, V), refs: S.prog.refs, holdCount });
          }
          if (lastOut !== o.text) { setOut(o.text, o.fx === 'far' || o.fx === 'bedrock' ? 'warn' : ''); lastOut = o.text; }
        }
        const main = S.prog.main;
        condValue = main && ctx.taken ? ctx.taken[main.id] === 0 : null;
      } else {
        if (!(mouseDig || keyDig)) { V.holdTime = 0; holdCount = 0; }
        lastSteps = [];
        if (hit && S.prog.main) {
          try { condValue = TT.evaluate(S.prog.main.branches[0].cond, V) === true; } catch (err) { condValue = null; }
        }
      }

      // HUD
      xh.className = 'xh' + (hit ? (condValue ? ' ok' : ' no') : '');
      const prog = V.digTime > 0 ? Math.min(1, V.holdTime / V.digTime) : (digging ? 1 : 0);
      digBar.classList.toggle('on', !!digging && condValue);
      digFill.style.width = (prog * 100).toFixed(1) + '%';
      pick.classList.toggle('swing', !!digging && !!condValue);

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
        if (lastSteps.length) {
          markCode(lastSteps);
          traceEl.innerHTML = lastSteps.filter(s => !s.silent && s.kind !== 'done')
            .map((s, i) => { const h = TT.stepHTML(s, i + 1); return '<li class="tr ' + h.cls + '">' + h.html + '</li>'; }).join('');
          previewLines = null;
        } else if (hit && S.prog.main) {
          markCode([]);
          const r = TT.solve(S.prog.main.branches[0].cond, V);
          const sig = r.lines.join('');
          if (sig !== previewLines) {
            previewLines = sig;
            traceEl.innerHTML = '<li class="tr k-predict"><div class="tr-line"><span class="tr-n">?</span><span>Not digging. If you held the button now, the first check would be:</span></div>' +
              '<div class="tr-work">' + r.lines.map((l, i) => '<code>' + (i ? '→ ' : '') + l + '</code>').join('') + '</div></li>';
          }
        }
      }
    }

    function pulseEl(el) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }

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
      gl.uniform1f(wp.u.uReach, S.vals.reach);
      const rc = S.prog.refs.reachCmp;
      gl.uniform1f(wp.u.uOp, rc ? OP_INDEX[rc.op] : 1);
      gl.uniform1f(wp.u.uShowReach, S.showReach ? 1 : 0);
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
        gl.uniform3fv(bp.u.uColor, condValue ? [0.1, 1, 0.45] : [1, 0.25, 0.35]);
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
        gl.uniform1f(dp.u.uScale, canvas.height * 0.09);
        gl.drawArrays(gl.POINTS, 0, dots.length);
        gl.disableVertexAttribArray(dp.a.aPos);
        gl.disableVertexAttribArray(dp.a.aColor);
      }
    }

    hudCount.textContent = 'mined ' + S.mined;
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
