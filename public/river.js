/* =====================================================================
   DRC.Geo — "Le Fleuve" living background
   A bird's-eye view of the Congo River, rendered on canvas.
   Vanilla JS, no dependencies. Usage:

       const river = new RiverScene(document.getElementById('river'));
       river.start();            // river.destroy() to tear down

   Design notes
   ------------
   • Camera is top-down so it matches the map's perspective — the country
     floats on its river.
   • Everything is irregular on purpose: intervals, sizes, speeds and paths
     are randomised within bounds so nothing ever loops identically.
   • Wildlife behaves rather than animates: fish school and flee the cursor,
     crocodiles glide and submerge, hippos surface, blow rings and sink.
   • Honours prefers-reduced-motion (renders one calm static frame) and
     pauses when the tab is hidden.
   ===================================================================== */

class RiverScene {
  constructor(canvas, opts = {}) {
    this.c = canvas;
    this.x = canvas.getContext('2d', { alpha: false });
    this.o = Object.assign({
      density: 1,           // scales entity counts
      palette: {
        deep:   '#04100E',
        mid:    '#0A2320',
        shallow:'#123A33',
        silt:   '#1B4A3C',
        light:  '#6FA8BC',
        glint:  '#C9E6EF',
        hyacinth:'#2F6B45',
        copper: '#C87941'
      }
    }, opts);
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.t = 0;
    this.mouse = { x: -9999, y: -9999, active: false };
    this.ripples = [];
    this._onResize = () => this.resize();
    this._onMove = e => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; this.mouse.active = true; };
    this._onLeave = () => { this.mouse.active = false; this.mouse.x = this.mouse.y = -9999; };
    this._onClick = e => this.splash(e.clientX, e.clientY, 1);
    this._onVis = () => { if (document.hidden) this.pause(); else this.resume(); };
    this.resize();
    this.seed();
  }

  /* ---------- helpers ---------- */
  r(a, b) { return a + Math.random() * (b - a); }
  ri(a, b) { return Math.floor(this.r(a, b + 1)); }
  // cheap smooth value noise
  n(x, y) {
    const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return s - Math.floor(s);
  }
  nz(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = this.n(xi, yi), b = this.n(xi + 1, yi), c = this.n(xi, yi + 1), d = this.n(xi + 1, yi + 1);
    return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
  }

  resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.w = innerWidth; this.h = innerHeight;
    this.c.width = this.w * dpr; this.c.height = this.h * dpr;
    this.c.style.width = this.w + 'px'; this.c.style.height = this.h + 'px';
    this.x.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.buildGradients();
  }

  buildGradients() {
    const p = this.o.palette, x = this.x;
    const g = x.createLinearGradient(0, 0, this.w * .3, this.h);
    g.addColorStop(0, p.mid); g.addColorStop(.45, p.deep); g.addColorStop(1, '#030B0A');
    this.bg = g;
  }

  /* ---------- entities ---------- */
  seed() {
    const D = this.o.density, W = this.w, H = this.h;

    // current bands — long sinuous flows that carry everything
    this.currents = Array.from({ length: Math.round(9 * D) }, (_, i) => ({
      y: this.r(-.1, 1.1) * H,
      amp: this.r(18, 70),
      len: this.r(.5, 1.4),
      sp: this.r(6, 17),
      w: this.r(.6, 2.6),
      a: this.r(.05, .16),
      ph: this.r(0, 99),
      warm: Math.random() < .18
    }));

    // caustic light pools
    this.caustics = Array.from({ length: Math.round(7 * D) }, () => ({
      x: this.r(0, W), y: this.r(0, H), rad: this.r(120, 420),
      sp: this.r(.02, .07), ph: this.r(0, 99), a: this.r(.025, .07)
    }));

    // water hyacinth — real feature of the Congo, drifts in mats
    this.hyacinth = Array.from({ length: Math.round(9 * D) }, () => this.newHyacinth(true));

    // fish schools (seen as shadows from above)
    this.fish = Array.from({ length: Math.round(46 * D) }, () => ({
      x: this.r(0, W), y: this.r(0, H),
      vx: this.r(8, 26), vy: this.r(-6, 6),
      len: this.r(4, 11), spooked: 0, ph: this.r(0, 99)
    }));

    // slow big shapes
    this.crocs = [];
    this.hippos = [];
    this.canoes = [];
    this.birds = [];

    this.timers = { croc: this.r(2, 7), hippo: this.r(3, 9), canoe: this.r(8, 20), bird: this.r(4, 12) };
  }

  newHyacinth(anywhere) {
    const W = this.w, H = this.h;
    const n = this.ri(3, 9), pods = [];
    for (let i = 0; i < n; i++) pods.push({ dx: this.r(-26, 26), dy: this.r(-20, 20), r: this.r(4, 13) });
    return {
      x: anywhere ? this.r(0, W) : this.r(-120, -40),
      y: this.r(-40, H + 40), sp: this.r(5, 13), pods, spin: this.r(-.12, .12), rot: this.r(0, 6.3)
    };
  }

  spawnCroc() {
    const H = this.h;
    const dir = Math.random() < .5 ? 1 : -1;
    this.crocs.push({
      x: dir > 0 ? -140 : this.w + 140, y: this.r(.12, .88) * H,
      dir, sp: this.r(14, 26), len: this.r(46, 82),
      sub: 0, subT: this.r(3, 8), wob: this.r(0, 9), life: 0
    });
  }
  spawnHippo() {
    this.hippos.push({
      x: this.r(.1, .9) * this.w, y: this.r(.15, .85) * this.h,
      r: this.r(13, 22), state: 'rising', t: 0, hold: this.r(3.5, 9), blown: false
    });
  }
  spawnCanoe() {
    const dir = Math.random() < .5 ? 1 : -1;
    this.canoes.push({
      x: dir > 0 ? -160 : this.w + 160, y: this.r(.15, .85) * this.h,
      dir, sp: this.r(20, 34), len: this.r(52, 78), stroke: 0, paddlers: this.ri(1, 3)
    });
  }
  spawnBird() {
    const dir = Math.random() < .5 ? 1 : -1;
    this.birds.push({
      x: dir > 0 ? -80 : this.w + 80, y: this.r(.05, .95) * this.h,
      dir, sp: this.r(90, 150), size: this.r(7, 13), flap: this.r(0, 9), drift: this.r(-14, 14)
    });
  }

  splash(x, y, power = 1) {
    this.ripples.push({ x, y, r: 2, max: this.r(70, 130) * power, a: .5 * power, w: 2.2 });
    // scatter nearby fish
    this.fish.forEach(f => {
      const d = Math.hypot(f.x - x, f.y - y);
      if (d < 190) {
        const ang = Math.atan2(f.y - y, f.x - x);
        f.vx += Math.cos(ang) * (190 - d) * .5;
        f.vy += Math.sin(ang) * (190 - d) * .5;
        f.spooked = 1.6;
      }
    });
  }

  /* ---------- lifecycle ---------- */
  start() {
    addEventListener('resize', this._onResize);
    addEventListener('mousemove', this._onMove, { passive: true });
    addEventListener('mouseleave', this._onLeave);
    addEventListener('click', this._onClick);
    document.addEventListener('visibilitychange', this._onVis);
    if (this.reduced) { this.t = 6; this.draw(); return; }
    this.last = performance.now();
    this.loop();
  }
  pause() { this.paused = true; }
  resume() { if (this.paused) { this.paused = false; this.last = performance.now(); this.loop(); } }
  destroy() {
    this.dead = true;
    removeEventListener('resize', this._onResize);
    removeEventListener('mousemove', this._onMove);
    removeEventListener('mouseleave', this._onLeave);
    removeEventListener('click', this._onClick);
    document.removeEventListener('visibilitychange', this._onVis);
  }
  loop() {
    if (this.dead || this.paused) return;
    const now = performance.now();
    let dt = (now - this.last) / 1000; this.last = now;
    dt = Math.min(dt, .05);
    this.update(dt); this.draw();
    requestAnimationFrame(() => this.loop());
  }

  /* ---------- update ---------- */
  update(dt) {
    this.t += dt;
    const W = this.w, H = this.h, T = this.timers;

    for (const k in T) {
      T[k] -= dt;
      if (T[k] <= 0) {
        if (k === 'croc' && this.crocs.length < 2) { this.spawnCroc(); T.croc = this.r(9, 26); }
        else if (k === 'hippo' && this.hippos.length < 3) { this.spawnHippo(); T.hippo = this.r(7, 18); }
        else if (k === 'canoe' && this.canoes.length < 2) { this.spawnCanoe(); T.canoe = this.r(16, 42); }
        else if (k === 'bird' && this.birds.length < 3) { this.spawnBird(); T.bird = this.r(6, 20); }
        else T[k] = this.r(4, 12);
      }
    }

    // hyacinth drift
    this.hyacinth.forEach((h, i) => {
      h.x += h.sp * dt; h.rot += h.spin * dt;
      h.y += Math.sin(this.t * .3 + i) * 3 * dt;
      if (h.x > W + 140) this.hyacinth[i] = this.newHyacinth(false);
    });

    // fish: school, drift with current, flee cursor
    const mx = this.mouse.x, my = this.mouse.y;
    this.fish.forEach((f, i) => {
      if (this.mouse.active) {
        const d = Math.hypot(f.x - mx, f.y - my);
        if (d < 130) {
          const ang = Math.atan2(f.y - my, f.x - mx);
          const push = (130 - d) * 1.6;
          f.vx += Math.cos(ang) * push * dt; f.vy += Math.sin(ang) * push * dt;
          f.spooked = Math.max(f.spooked, 1);
        }
      }
      // gentle noise wander + return to cruise speed
      const nA = (this.nz(f.x * .004 + this.t * .12, f.y * .004) - .5) * 40;
      f.vy += nA * dt;
      f.vx += (16 - f.vx) * .5 * dt;
      f.vy *= (1 - .8 * dt);
      f.spooked = Math.max(0, f.spooked - dt);
      f.x += f.vx * dt; f.y += f.vy * dt;
      if (f.x > W + 30) { f.x = -30; f.y = this.r(0, H); }
      if (f.x < -30) { f.x = W + 30; f.y = this.r(0, H); }
      if (f.y > H + 30) f.y = -30; if (f.y < -30) f.y = H + 30;
    });

    // crocodiles
    this.crocs = this.crocs.filter(c => {
      c.life += dt;
      c.subT -= dt;
      if (c.subT <= 0) { c.sub = c.sub > .5 ? 0 : 1; c.subT = this.r(3.5, 9); }
      c.subA = (c.subA ?? 1) + ((c.sub ? 0 : 1) - (c.subA ?? 1)) * 1.2 * dt;
      c.x += c.dir * c.sp * dt;
      c.y += Math.sin(this.t * .5 + c.wob) * 5 * dt;
      return c.x > -260 && c.x < W + 260;
    });

    // hippos: rise, linger, blow, sink
    this.hippos = this.hippos.filter(h => {
      h.t += dt;
      if (h.state === 'rising') { h.a = Math.min(1, (h.a ?? 0) + dt * 1.1); if (h.a >= 1) { h.state = 'up'; h.t = 0; } }
      else if (h.state === 'up') {
        if (!h.blown && h.t > .8) { this.ripples.push({ x: h.x, y: h.y, r: h.r, max: h.r * 5.5, a: .3, w: 1.4 }); h.blown = true; }
        if (h.t > h.hold) h.state = 'sinking';
      } else { h.a = (h.a ?? 1) - dt * .9; if (h.a <= 0) return false; }
      h.x += Math.sin(this.t * .25 + h.r) * 2 * dt;
      return true;
    });

    // canoes
    this.canoes = this.canoes.filter(k => {
      k.stroke += dt * 2.2;
      k.x += k.dir * k.sp * dt;
      k.y += Math.sin(this.t * .4 + k.len) * 3 * dt;
      if (Math.random() < dt * 1.6) this.ripples.push({ x: k.x - k.dir * k.len * .4, y: k.y, r: 3, max: this.r(24, 46), a: .16, w: 1 });
      return k.x > -300 && k.x < W + 300;
    });

    // bird shadows
    this.birds = this.birds.filter(b => {
      b.flap += dt * 9;
      b.x += b.dir * b.sp * dt; b.y += b.drift * dt;
      return b.x > -160 && b.x < W + 160;
    });

    // ripples
    this.ripples = this.ripples.filter(rp => {
      rp.r += (rp.max - rp.r) * 1.6 * dt + 12 * dt;
      rp.a -= dt * .42;
      return rp.a > .01;
    });

    // cursor wake
    if (this.mouse.active && Math.random() < dt * 7) {
      this.ripples.push({ x: mx + this.r(-8, 8), y: my + this.r(-8, 8), r: 2, max: this.r(22, 46), a: .16, w: .9 });
    }
  }

  /* ---------- draw ---------- */
  draw() {
    const x = this.x, W = this.w, H = this.h, p = this.o.palette, T = this.t;
    x.fillStyle = this.bg; x.fillRect(0, 0, W, H);

    // silt / depth mottling
    x.save();
    for (let i = 0; i < 5; i++) {
      const nx = this.nz(i * 3.3 + T * .015, i * 1.7) * W;
      const ny = this.nz(i * 7.1, i * 2.3 + T * .012) * H;
      const g = x.createRadialGradient(nx, ny, 0, nx, ny, 340);
      g.addColorStop(0, 'rgba(27,74,60,.16)'); g.addColorStop(1, 'rgba(27,74,60,0)');
      x.fillStyle = g; x.fillRect(0, 0, W, H);
    }
    x.restore();

    // caustic pools
    x.save(); x.globalCompositeOperation = 'lighter';
    this.caustics.forEach(c => {
      const px = c.x + Math.sin(T * c.sp + c.ph) * 90;
      const py = c.y + Math.cos(T * c.sp * .8 + c.ph) * 60;
      const g = x.createRadialGradient(px, py, 0, px, py, c.rad);
      g.addColorStop(0, `rgba(111,168,188,${c.a})`);
      g.addColorStop(1, 'rgba(111,168,188,0)');
      x.fillStyle = g; x.fillRect(px - c.rad, py - c.rad, c.rad * 2, c.rad * 2);
    });
    x.restore();

    // current bands
    this.currents.forEach(c => {
      x.beginPath();
      const off = (T * c.sp + c.ph * 40) % (W + 400) - 200;
      for (let i = 0; i <= 26; i++) {
        const px = -200 + (i / 26) * (W + 400);
        const py = c.y + Math.sin((px + off) * .006 * c.len + c.ph) * c.amp
                       + Math.sin((px + off) * .019 * c.len) * c.amp * .3;
        i ? x.lineTo(px, py) : x.moveTo(px, py);
      }
      x.strokeStyle = c.warm ? `rgba(200,121,65,${c.a * .8})` : `rgba(111,168,188,${c.a})`;
      x.lineWidth = c.w; x.stroke();
    });

    // fish shadows (below surface → soft, dark)
    x.save();
    this.fish.forEach(f => {
      const ang = Math.atan2(f.vy, f.vx);
      const wob = Math.sin(T * 9 + f.ph) * .22;
      x.save(); x.translate(f.x, f.y); x.rotate(ang + wob);
      x.fillStyle = f.spooked > 0 ? 'rgba(4,16,14,.62)' : 'rgba(4,16,14,.45)';
      x.beginPath(); x.ellipse(0, 0, f.len, f.len * .34, 0, 0, 6.3); x.fill();
      x.beginPath(); x.moveTo(-f.len, 0); x.lineTo(-f.len - f.len * .5, -f.len * .28);
      x.lineTo(-f.len - f.len * .5, f.len * .28); x.closePath(); x.fill();
      x.restore();
    });
    x.restore();

    // crocodiles
    this.crocs.forEach(c => {
      const a = c.subA ?? 1;
      x.save(); x.translate(c.x, c.y); x.scale(c.dir, 1);
      // wake
      if (a > .3) {
        x.strokeStyle = `rgba(201,230,239,${.1 * a})`; x.lineWidth = 1.1;
        x.beginPath(); x.moveTo(-c.len * .5, 0);
        x.lineTo(-c.len * 2.6, -c.len * .5); x.moveTo(-c.len * .5, 0); x.lineTo(-c.len * 2.6, c.len * .5);
        x.stroke();
      }
      x.fillStyle = `rgba(6,26,22,${.55 + .3 * a})`;
      // body
      x.beginPath(); x.ellipse(0, 0, c.len * .5, c.len * .13, 0, 0, 6.3); x.fill();
      // tail
      x.beginPath(); x.moveTo(-c.len * .45, 0);
      x.quadraticCurveTo(-c.len * .8, Math.sin(T * 2 + c.wob) * c.len * .16, -c.len * .95, 0);
      x.quadraticCurveTo(-c.len * .8, -Math.sin(T * 2 + c.wob) * c.len * .16 + 3, -c.len * .45, 3);
      x.fill();
      // snout + eye ridges
      x.beginPath(); x.ellipse(c.len * .52, 0, c.len * .12, c.len * .07, 0, 0, 6.3); x.fill();
      if (a > .6) {
        x.fillStyle = `rgba(201,230,239,${.22 * a})`;
        x.beginPath(); x.arc(c.len * .42, -c.len * .06, 1.5, 0, 6.3); x.fill();
        x.beginPath(); x.arc(c.len * .42, c.len * .06, 1.5, 0, 6.3); x.fill();
      }
      x.restore();
    });

    // hippos
    this.hippos.forEach(h => {
      const a = Math.max(0, Math.min(1, h.a ?? 0));
      if (a <= 0) return;
      x.save(); x.translate(h.x, h.y);
      x.fillStyle = `rgba(8,30,26,${.5 + .35 * a})`;
      x.beginPath(); x.ellipse(0, 0, h.r * (0.6 + .4 * a), h.r * .62 * (0.6 + .4 * a), 0, 0, 6.3); x.fill();
      if (a > .7) { // ears + eyes breaking the surface
        x.fillStyle = `rgba(201,230,239,${.18 * a})`;
        [-1, 1].forEach(s => {
          x.beginPath(); x.arc(h.r * .42 * s, -h.r * .34, 1.9, 0, 6.3); x.fill();
          x.beginPath(); x.arc(h.r * .2 * s, h.r * .3, 1.5, 0, 6.3); x.fill();
        });
      }
      x.restore();
    });

    // pirogues — the human presence
    this.canoes.forEach(k => {
      x.save(); x.translate(k.x, k.y); x.scale(k.dir, 1);
      x.fillStyle = 'rgba(38,24,12,.72)';
      x.beginPath(); x.moveTo(-k.len * .5, 0);
      x.quadraticCurveTo(0, -k.len * .11, k.len * .5, 0);
      x.quadraticCurveTo(0, k.len * .11, -k.len * .5, 0); x.fill();
      x.fillStyle = 'rgba(24,16,8,.85)';
      for (let i = 0; i < k.paddlers; i++) {
        const px = -k.len * .22 + i * (k.len * .3);
        x.beginPath(); x.arc(px, 0, 2.6, 0, 6.3); x.fill();
        const sw = Math.sin(k.stroke + i * 1.2) * 4;
        x.strokeStyle = 'rgba(24,16,8,.6)'; x.lineWidth = 1.2;
        x.beginPath(); x.moveTo(px, 0); x.lineTo(px + 3, sw); x.stroke();
      }
      x.restore();
    });

    // ripples
    this.ripples.forEach(rp => {
      x.beginPath(); x.arc(rp.x, rp.y, rp.r, 0, 6.3);
      x.strokeStyle = `rgba(201,230,239,${rp.a})`; x.lineWidth = rp.w; x.stroke();
    });

    // surface glints
    x.save(); x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 34; i++) {
      const gx = (this.nz(i * 1.7, T * .05 + i) * 1.2 - .1) * W;
      const gy = (this.nz(i * 3.1 + 5, T * .04) * 1.2 - .1) * H;
      const tw = .5 + .5 * Math.sin(T * 2.2 + i * 1.7);
      x.fillStyle = `rgba(201,230,239,${.05 * tw})`;
      x.beginPath(); x.ellipse(gx, gy, 9 + tw * 7, 1.1, 0, 0, 6.3); x.fill();
    }
    x.restore();

    // bird shadows gliding over the water
    this.birds.forEach(b => {
      const f = Math.sin(b.flap) * .5;
      x.save(); x.translate(b.x, b.y); x.scale(b.dir, 1);
      x.fillStyle = 'rgba(3,12,10,.30)';
      x.beginPath();
      x.moveTo(0, 0);
      x.quadraticCurveTo(-b.size * .5, -b.size * (.5 + f), -b.size * 1.5, -b.size * .16 * (1 + f));
      x.quadraticCurveTo(-b.size * .6, -b.size * .06, 0, b.size * .12);
      x.quadraticCurveTo(b.size * .6, -b.size * .06, b.size * 1.5, -b.size * .16 * (1 + f));
      x.quadraticCurveTo(b.size * .5, -b.size * (.5 + f), 0, 0);
      x.fill();
      x.restore();
    });

    // vignette so UI stays readable
    const v = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.max(W, H) * .78);
    v.addColorStop(0, 'rgba(4,13,11,0)'); v.addColorStop(1, 'rgba(3,10,9,.72)');
    x.fillStyle = v; x.fillRect(0, 0, W, H);
  }
}

/* Exposed as a global so it works from a plain <script> tag.
   In the Vite/React app, either:
     import '/river.js';  const river = new window.RiverScene(canvasEl);
   or append `export default RiverScene;` to a copied module version. */
if (typeof window !== 'undefined') window.RiverScene = RiverScene;
if (typeof module !== 'undefined' && module.exports) module.exports = RiverScene;
