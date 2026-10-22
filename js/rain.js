/* The falling-code background. It pauses on the 3D page, in hidden tabs, and
   for anyone whose system asks for reduced motion. */
(function () {
  'use strict';
  const TT = window.TT;
  const canvas = document.getElementById('rain');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  const GLYPHS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789<>=+-*/IFANDORNOT';
  const SIZE = 16;
  const still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let drops = [], wanted = true, raf = 0, last = 0;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const cols = Math.ceil(canvas.width / SIZE);
    drops = Array.from({ length: cols }, () => Math.random() * canvas.height / SIZE * 1.2 - 10);
    ctx.fillStyle = '#020604';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let k = 0; k < 24; k++) paint();  // start with streams already on screen
  }

  function tick(t) {
    raf = requestAnimationFrame(tick);
    if (t - last < 55) return;
    last = t;
    paint();
  }

  function paint() {
    ctx.fillStyle = 'rgba(2, 6, 4, 0.13)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = SIZE + 'px ui-monospace, Consolas, monospace';
    for (let i = 0; i < drops.length; i++) {
      const y = drops[i] * SIZE;
      if (y > 0) {
        ctx.fillStyle = Math.random() < 0.04 ? '#e6ffee' : '#00ff6a';
        ctx.fillText(GLYPHS[(Math.random() * GLYPHS.length) | 0], i * SIZE, y);
      }
      if (y > canvas.height && Math.random() > 0.975) drops[i] = 0;
      drops[i] += 1;
    }
  }

  function update() {
    const run = wanted && !still && !document.hidden;
    if (run && !raf) raf = requestAnimationFrame(tick);
    if (!run && raf) { cancelAnimationFrame(raf); raf = 0; }
    canvas.classList.toggle('dim', !wanted);
  }

  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', update);
  resize();
  update();

  TT.rain = { set(on) { wanted = on; update(); } };
})();
