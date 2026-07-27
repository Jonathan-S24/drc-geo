/* =====================================================================
   DRC.Geo — "Le Fleuve" living background  ·  v2
   An aerial view of the Congo River: forested banks, a wide meandering
   channel, wooded islands and sandbars — animated.

       const river = new RiverScene(document.getElementById('river'));
       river.start();                    // river.destroy() to tear down

   Rendering strategy
   ------------------
   The landscape (forest canopy, channel bed, islands, sandbars) is painted
   ONCE to an offscreen canvas on load/resize. Every frame only redraws the
   things that actually move — current streaks, reflections, mist, wildlife.
   That keeps a photographic amount of detail at 60fps.

   Honours prefers-reduced-motion and pauses when the tab is hidden.
   ===================================================================== */

class RiverScene {
  constructor(canvas, opts = {}) {
    this.c = canvas;
    this.x = canvas.getContext('2d', { alpha: false });
    this.o = Object.assign({ density: 1 }, opts);
    this.P = {
      forestDeep: '#08221A', forestMid: '#0E3123', forestHi: '#17462F',
      forestDry: '#2A4A2C', water: '#20404C', waterDeep: '#16303A',
      waterHi: '#5E8FA3', silver: '#A9CBD8', sand: '#6A6750',
      sandHi: '#87805F', mist: '#BFE0DC'
    };
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.t = 0;
    this.mouse = { x: -9999, y: -9999, active: false };
    this.ripples = [];
    this._onResize = () => { clearTimeout(this._rt); this._rt = setTimeout(() => this.rebuild(), 180); };
    this._onMove = e => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; this.mouse.active = true; };
    this._onLeave = () => { this.mouse.active = false; this.mouse.x = this.mouse.y = -9999; };
    this._onClick = e => this.splash(e.clientX, e.clientY);
    this._onVis = () => { document.hidden ? this.pause() : this.resume(); };
    this.rebuild();
  }

  /* ---------------- helpers ---------------- */
  r(a, b) { return a + Math.random() * (b - a); }
  ri(a, b) { return Math.floor(this.r(a, b + 1)); }
  hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
  nz(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return this.hash(xi, yi) * (1 - u) * (1 - v) + this.hash(xi + 1, yi) * u * (1 - v)
         + this.hash(xi, yi + 1) * (1 - u) * v + this.hash(xi + 1, yi + 1) * u * v;
  }
  fbm(x, y) { return this.nz(x, y) * .55 + this.nz(x * 2.1, y * 2.1) * .28 + this.nz(x * 4.3, y * 4.3) * .17; }

  rebuild() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.w = innerWidth; this.h = innerHeight;
    this.c.width = this.w * dpr; this.c.height = this.h * dpr;
    this.c.style.width = this.w + 'px'; this.c.style.height = this.h + 'px';
    this.x.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.buildSpine();
    this.paintLandscape();
    this.seedLife();
  }

  /* ---------------- river geometry ----------------
     A meandering spine crossing the canvas diagonally, with a width that
     breathes along its length — wide in the straights, pinched at bends. */
  buildSpine() {
    const W = this.w, H = this.h;
    const seed = this.r(0, 100);
    const ctrl = [
      { x: -W * .18, y: H * this.r(.06, .16) },
      { x: W * .16,  y: H * this.r(.20, .30) },
      { x: W * .34,  y: H * this.r(.34, .46) },
      { x: W * .50,  y: H * this.r(.44, .56) },
      { x: W * .68,  y: H * this.r(.58, .70) },
      { x: W * .86,  y: H * this.r(.70, .84) },
      { x: W * 1.18, y: H * this.r(.86, .98) }
    ];
    // cardinal-spline sample
    const S = [], N = 260;
    const pt = (i, t) => {
      const p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2 = ctrl[Math.min(ctrl.length - 1, i + 1)],
            p3 = ctrl[Math.min(ctrl.length - 1, i + 2)];
      const t2 = t * t, t3 = t2 * t;
      return {
        x: .5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: .5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
      };
    };
    for (let i = 0; i < ctrl.length - 1; i++)
      for (let k = 0; k < N / ctrl.length; k++) S.push(pt(i, k / (N / ctrl.length)));
    // widths + normals
    const base = Math.min(W, H) * .17;
    S.forEach((p, i) => {
      const u = i / S.length;
      p.w = base * (.72 + this.fbm(u * 5 + seed, seed) * .95);
      const a = S[Math.max(0, i - 1)], b = S[Math.min(S.length - 1, i + 1)];
      const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
      p.tx = dx / L; p.ty = dy / L; p.nx = -p.ty; p.ny = p.tx;
    });
    this.spine = S;

    // river polygon (used for clipping + painting)
    const path = new Path2D();
    S.forEach((p, i) => { const x = p.x + p.nx * p.w, y = p.y + p.ny * p.w; i ? path.lineTo(x, y) : path.moveTo(x, y); });
    for (let i = S.length - 1; i >= 0; i--) { const p = S[i]; path.lineTo(p.x - p.nx * p.w, p.y - p.ny * p.w); }
    path.closePath();
    this.riverPath = path;

    // islands: leaf-shaped, aligned to the flow, sitting inside the channel
    this.islands = [];
    const n = this.ri(3, 6);
    for (let k = 0; k < n; k++) {
      const i = Math.floor(this.r(.12, .88) * S.length), p = S[i];
      const lat = this.r(-.42, .42) * p.w;
      this.islands.push({
        x: p.x + p.nx * lat, y: p.y + p.ny * lat,
        len: p.w * this.r(.5, 1.15), wid: p.w * this.r(.13, .3),
        ang: Math.atan2(p.ty, p.tx), seed: this.r(0, 99)
      });
    }
    // sandbars on the inside of bends
    this.sandbars = [];
    for (let k = 0; k < this.ri(4, 8); k++) {
      const i = Math.floor(this.r(.06, .94) * S.length), p = S[i];
      const side = Math.random() < .5 ? 1 : -1;
      this.sandbars.push({
        x: p.x + p.nx * side * p.w * this.r(.6, .92), y: p.y + p.ny * side * p.w * this.r(.6, .92),
        len: p.w * this.r(.35, .8), wid: p.w * this.r(.07, .18), ang: Math.atan2(p.ty, p.tx)
      });
    }
  }

  /* ---------------- static landscape ---------------- */
  paintLandscape() {
    const W = this.w, H = this.h, P = this.P;
    const off = document.createElement('canvas');
    const dpr = Math.min(devicePixelRatio || 1, 2);
    off.width = W * dpr; off.height = H * dpr;
    const g = off.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);

    // --- forest base
    const bg = g.createLinearGradient(0, 0, W * .4, H);
    bg.addColorStop(0, P.forestMid); bg.addColorStop(.5, P.forestDeep); bg.addColorStop(1, '#061A14');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);

    // broad relief — hills catching light, as in an aerial photo
    for (let i = 0; i < 26; i++) {
      const cx = this.r(-.1, 1.1) * W, cy = this.r(-.1, 1.1) * H, rad = this.r(90, 340);
      const rg = g.createRadialGradient(cx, cy, 0, cx, cy, rad);
      const lit = this.fbm(cx * .002, cy * .002);
      rg.addColorStop(0, `rgba(${lit > .5 ? '31,74,48' : '10,40,28'},${.28 * lit + .08})`);
      rg.addColorStop(1, 'rgba(8,34,26,0)');
      g.fillStyle = rg; g.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    }

    // --- canopy texture: thousands of tiny crowns
    const crowns = Math.round(5200 * this.o.density);
    for (let i = 0; i < crowns; i++) {
      const cx = Math.random() * W, cy = Math.random() * H;
      const n = this.fbm(cx * .006, cy * .006);
      const rr = 2 + n * 4.4;
      const tone = n > .62 ? P.forestHi : n > .38 ? P.forestMid : P.forestDeep;
      g.fillStyle = tone; g.globalAlpha = .5 + n * .4;
      g.beginPath(); g.ellipse(cx, cy, rr, rr * .78, n * 3, 0, 6.3); g.fill();
      if (n > .74) { // sunlit edge
        g.fillStyle = P.forestDry; g.globalAlpha = .22;
        g.beginPath(); g.ellipse(cx - rr * .3, cy - rr * .3, rr * .5, rr * .38, 0, 0, 6.3); g.fill();
      }
    }
    g.globalAlpha = 1;

    // --- carve the channel
    g.save();
    g.clip(this.riverPath);
    const wg = g.createLinearGradient(0, 0, W, H);
    wg.addColorStop(0, P.water); wg.addColorStop(.5, P.waterDeep); wg.addColorStop(1, '#1A3742');
    g.fillStyle = wg; g.fillRect(0, 0, W, H);
    // depth mottling + silt plumes
    for (let i = 0; i < 90; i++) {
      const cx = this.r(0, W), cy = this.r(0, H), rad = this.r(40, 210);
      const rg = g.createRadialGradient(cx, cy, 0, cx, cy, rad);
      const silt = Math.random() < .34;
      rg.addColorStop(0, silt ? 'rgba(122,110,85,.16)' : 'rgba(94,143,163,.13)');
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg; g.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    }
    // shallow water along the banks
    g.strokeStyle = 'rgba(122,150,140,.20)'; g.lineWidth = 16; g.stroke(this.riverPath);
    g.strokeStyle = 'rgba(169,203,216,.13)'; g.lineWidth = 5; g.stroke(this.riverPath);
    g.restore();

    // --- shoreline: a thin bright rim where forest meets water
    g.save();
    g.strokeStyle = 'rgba(122,120,90,.34)'; g.lineWidth = 2.4; g.stroke(this.riverPath);
    g.strokeStyle = 'rgba(8,26,20,.55)'; g.lineWidth = 6; g.globalAlpha = .5; g.stroke(this.riverPath);
    g.restore();

    // --- sandbars
    this.sandbars.forEach(s => {
      g.save(); g.translate(s.x, s.y); g.rotate(s.ang);
      const sg = g.createLinearGradient(0, -s.wid, 0, s.wid);
      sg.addColorStop(0, 'rgba(135,128,95,.55)'); sg.addColorStop(.5, 'rgba(106,103,80,.75)');
      sg.addColorStop(1, 'rgba(106,103,80,.25)');
      g.fillStyle = sg;
      g.beginPath(); g.ellipse(0, 0, s.len, s.wid, 0, 0, 6.3); g.fill();
      g.restore();
    });

    // --- islands (forested, sandy rim, aligned to flow)
    this.islands.forEach(is => {
      g.save(); g.translate(is.x, is.y); g.rotate(is.ang);
      // leaf outline
      const leaf = new Path2D();
      leaf.moveTo(-is.len, 0);
      leaf.quadraticCurveTo(-is.len * .2, -is.wid, is.len, 0);
      leaf.quadraticCurveTo(-is.len * .2, is.wid, -is.len, 0);
      g.fillStyle = 'rgba(122,116,88,.85)'; g.fill(leaf);           // sandy rim
      g.save(); g.clip(leaf);
      g.fillStyle = P.forestMid; g.fillRect(-is.len, -is.wid, is.len * 2, is.wid * 2);
      for (let i = 0; i < 260; i++) {
        const px = this.r(-is.len, is.len), py = this.r(-is.wid, is.wid);
        const n = this.fbm(px * .02 + is.seed, py * .02);
        g.fillStyle = n > .55 ? P.forestHi : P.forestDeep; g.globalAlpha = .55 + n * .35;
        g.beginPath(); g.ellipse(px, py, 1.6 + n * 3, 1.4 + n * 2.4, 0, 0, 6.3); g.fill();
      }
      g.globalAlpha = 1; g.restore();
      g.strokeStyle = 'rgba(169,203,216,.20)'; g.lineWidth = 1.2; g.stroke(leaf);
      g.restore();
    });

    this.bgCanvas = off;
  }

  /* ---------------- moving life ---------------- */
  seedLife() {
    const D = this.o.density, S = this.spine;
    const at = t => { const p = S[Math.max(0, Math.min(S.length - 1, Math.floor(t * S.length)))]; return p; };
    this.at = at;

    // current streaks travelling down the channel
    this.streaks = Array.from({ length: Math.round(190 * D) }, () => ({
      t: Math.random(), lat: this.r(-.92, .92), sp: this.r(.012, .035),
      len: this.r(14, 62), a: this.r(.05, .2), w: this.r(.5, 1.7)
    }));
    // sun glints on the surface
    this.glints = Array.from({ length: Math.round(90 * D) }, () => ({
      t: Math.random(), lat: this.r(-.9, .9), sp: this.r(.004, .012), ph: this.r(0, 9), sz: this.r(3, 13)
    }));
    // mist over the forest
    this.mists = Array.from({ length: Math.round(9 * D) }, () => ({
      x: this.r(0, this.w), y: this.r(0, this.h), rad: this.r(140, 420),
      sp: this.r(3, 11), a: this.r(.015, .05)
    }));
    // fish shoals in the shallows
    this.fish = Array.from({ length: Math.round(40 * D) }, () => ({
      t: Math.random(), lat: this.r(-.85, .85), sp: this.r(.004, .013),
      len: this.r(3.5, 9), wob: this.r(0, 9), spooked: 0, dx: 0, dy: 0
    }));
    this.crocs = []; this.hippos = []; this.canoes = []; this.birds = [];
    this.timers = { croc: this.r(3, 9), hippo: this.r(4, 10), canoe: this.r(1, 6), bird: this.r(3, 9) };
  }

  posAt(t, lat) {
    const S = this.spine;
    const i = Math.max(0, Math.min(S.length - 1, Math.floor(((t % 1) + 1) % 1 * S.length)));
    const p = S[i];
    return { x: p.x + p.nx * lat * p.w, y: p.y + p.ny * lat * p.w, tx: p.tx, ty: p.ty, w: p.w };
  }

  splash(x, y) {
    this.ripples.push({ x, y, r: 3, max: this.r(60, 120), a: .5, w: 2 });
    this.fish.forEach(f => {
      const p = this.posAt(f.t, f.lat);
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < 170) { f.spooked = 1.5; f.lat += (p.y > y ? .12 : -.12); }
    });
  }

  /* ---------------- lifecycle ---------------- */
  start() {
    addEventListener('resize', this._onResize);
    addEventListener('mousemove', this._onMove, { passive: true });
    addEventListener('mouseleave', this._onLeave);
    addEventListener('click', this._onClick);
    document.addEventListener('visibilitychange', this._onVis);
    if (this.reduced) { this.t = 4; this.draw(); return; }
    this.last = performance.now(); this.loop();
  }
  pause() { this.paused = true; }
  resume() { if (this.paused) { this.paused = false; this.last = performance.now(); this.loop(); } }
  destroy() {
    this.dead = true;
    removeEventListener('resize', this._onResize); removeEventListener('mousemove', this._onMove);
    removeEventListener('mouseleave', this._onLeave); removeEventListener('click', this._onClick);
    document.removeEventListener('visibilitychange', this._onVis);
  }
  loop() {
    if (this.dead || this.paused) return;
    const now = performance.now();
    let dt = (now - this.last) / 1000; this.last = now;
    this.update(Math.min(dt, .05)); this.draw();
    requestAnimationFrame(() => this.loop());
  }

  /* ---------------- update ---------------- */
  update(dt) {
    this.t += dt;
    const T = this.timers;
    for (const k in T) {
      T[k] -= dt;
      if (T[k] <= 0) {
        if (k === 'croc' && this.crocs.length < 3) { this.crocs.push({ t: this.r(0, 1), lat: this.r(-.8, .8) * (Math.random() < .5 ? 1 : -1), sp: this.r(.004, .009), len: this.r(30, 58), sub: 1, subT: this.r(4, 9), wob: this.r(0, 9) }); T.croc = this.r(10, 24); }
        else if (k === 'hippo' && this.hippos.length < 4) { this.hippos.push({ t: this.r(0, 1), lat: this.r(-.75, .75), r: this.r(9, 17), st: 'rise', a: 0, tm: 0, hold: this.r(4, 10), blown: false }); T.hippo = this.r(8, 18); }
        else if (k === 'canoe' && this.canoes.length < 4) { this.canoes.push({ t: Math.random() < .5 ? -.02 : 1.02, dir: Math.random() < .5 ? 1 : -1, lat: this.r(-.7, .7), sp: this.r(.006, .014), len: this.r(26, 46), stroke: 0, crew: this.ri(1, 3) }); T.canoe = this.r(6, 20); }
        else if (k === 'bird' && this.birds.length < 4) { const d = Math.random() < .5 ? 1 : -1; this.birds.push({ x: d > 0 ? -70 : this.w + 70, y: this.r(.05, .95) * this.h, dir: d, sp: this.r(70, 130), size: this.r(6, 12), flap: this.r(0, 9), drift: this.r(-12, 12) }); T.bird = this.r(5, 16); }
        else T[k] = this.r(4, 10);
      }
    }

    this.streaks.forEach(s => { s.t += s.sp * dt; if (s.t > 1.05) { s.t = -.05; s.lat = this.r(-.92, .92); } });
    this.glints.forEach(g => { g.t += g.sp * dt; if (g.t > 1.05) g.t = -.05; });
    this.mists.forEach(m => { m.x += m.sp * dt; if (m.x - m.rad > this.w) { m.x = -m.rad; m.y = this.r(0, this.h); } });

    const mx = this.mouse.x, my = this.mouse.y;
    this.fish.forEach(f => {
      f.t += f.sp * dt * (f.spooked > 0 ? 3.2 : 1);
      if (f.t > 1.05) f.t = -.05;
      f.lat += Math.sin(this.t * .7 + f.wob) * .05 * dt;
      f.lat = Math.max(-.92, Math.min(.92, f.lat));
      if (this.mouse.active) {
        const p = this.posAt(f.t, f.lat);
        const d = Math.hypot(p.x - mx, p.y - my);
        if (d < 120) { f.spooked = 1.2; f.lat += (p.y - my > 0 ? .5 : -.5) * dt * 2; }
      }
      f.spooked = Math.max(0, f.spooked - dt);
    });

    this.crocs = this.crocs.filter(c => {
      c.t += c.sp * dt; c.subT -= dt;
      if (c.subT <= 0) { c.sub = c.sub > .5 ? 0 : 1; c.subT = this.r(4, 9); }
      c.subA = (c.subA ?? 1) + ((c.sub ? 1 : .12) - (c.subA ?? 1)) * 1.1 * dt;
      return c.t < 1.06;
    });
    this.hippos = this.hippos.filter(h => {
      h.tm += dt;
      if (h.st === 'rise') { h.a = Math.min(1, h.a + dt * 1.2); if (h.a >= 1) { h.st = 'up'; h.tm = 0; } }
      else if (h.st === 'up') {
        if (!h.blown && h.tm > .7) { const p = this.posAt(h.t, h.lat); this.ripples.push({ x: p.x, y: p.y, r: h.r, max: h.r * 5, a: .28, w: 1.3 }); h.blown = true; }
        if (h.tm > h.hold) h.st = 'sink';
      } else { h.a -= dt; if (h.a <= 0) return false; }
      return true;
    });
    this.canoes = this.canoes.filter(k => {
      k.t += k.dir * k.sp * dt; k.stroke += dt * 2.4;
      if (Math.random() < dt * 1.4) { const p = this.posAt(k.t, k.lat); this.ripples.push({ x: p.x, y: p.y, r: 2, max: this.r(18, 40), a: .14, w: .9 }); }
      return k.t > -.08 && k.t < 1.08;
    });
    this.birds = this.birds.filter(b => {
      b.flap += dt * 9; b.x += b.dir * b.sp * dt; b.y += b.drift * dt;
      return b.x > -140 && b.x < this.w + 140;
    });
    this.ripples = this.ripples.filter(rp => { rp.r += (rp.max - rp.r) * 1.5 * dt + 10 * dt; rp.a -= dt * .4; return rp.a > .01; });
    if (this.mouse.active && Math.random() < dt * 5) {
      this.ripples.push({ x: mx + this.r(-6, 6), y: my + this.r(-6, 6), r: 2, max: this.r(16, 34), a: .13, w: .8 });
    }
  }

  /* ---------------- draw ---------------- */
  draw() {
    const x = this.x, W = this.w, H = this.h, P = this.P, T = this.t;
    x.drawImage(this.bgCanvas, 0, 0, W, H);

    // everything watery is clipped to the channel
    x.save(); x.clip(this.riverPath);

    // flowing current streaks
    this.streaks.forEach(s => {
      const p = this.posAt(s.t, s.lat);
      x.beginPath();
      x.moveTo(p.x - p.tx * s.len, p.y - p.ty * s.len);
      x.lineTo(p.x + p.tx * s.len * .35, p.y + p.ty * s.len * .35);
      x.strokeStyle = `rgba(169,203,216,${s.a})`; x.lineWidth = s.w; x.stroke();
    });

    // fish shadows
    this.fish.forEach(f => {
      const p = this.posAt(f.t, f.lat);
      const ang = Math.atan2(p.ty, p.tx) + Math.sin(T * 8 + f.wob) * .25;
      x.save(); x.translate(p.x, p.y); x.rotate(ang);
      x.fillStyle = `rgba(6,22,20,${f.spooked > 0 ? .6 : .42})`;
      x.beginPath(); x.ellipse(0, 0, f.len, f.len * .33, 0, 0, 6.3); x.fill();
      x.beginPath(); x.moveTo(-f.len, 0); x.lineTo(-f.len * 1.5, -f.len * .3); x.lineTo(-f.len * 1.5, f.len * .3);
      x.closePath(); x.fill(); x.restore();
    });

    // crocodiles
    this.crocs.forEach(c => {
      const p = this.posAt(c.t, c.lat), a = c.subA ?? 1;
      if (a < .05) return;
      const ang = Math.atan2(p.ty, p.tx);
      x.save(); x.translate(p.x, p.y); x.rotate(ang);
      if (a > .4) { x.strokeStyle = `rgba(169,203,216,${.10 * a})`; x.lineWidth = 1; x.beginPath();
        x.moveTo(-c.len * .4, 0); x.lineTo(-c.len * 2.2, -c.len * .45);
        x.moveTo(-c.len * .4, 0); x.lineTo(-c.len * 2.2, c.len * .45); x.stroke(); }
      x.fillStyle = `rgba(8,26,20,${.45 + .35 * a})`;
      x.beginPath(); x.ellipse(0, 0, c.len * .5, c.len * .12, 0, 0, 6.3); x.fill();
      x.beginPath(); x.moveTo(-c.len * .45, 0);
      x.quadraticCurveTo(-c.len * .78, Math.sin(T * 2 + c.wob) * c.len * .15, -c.len * .95, 0);
      x.quadraticCurveTo(-c.len * .78, -Math.sin(T * 2 + c.wob) * c.len * .15 + 2.4, -c.len * .45, 2.4); x.fill();
      x.beginPath(); x.ellipse(c.len * .53, 0, c.len * .11, c.len * .06, 0, 0, 6.3); x.fill();
      x.restore();
    });

    // hippos
    this.hippos.forEach(h => {
      const p = this.posAt(h.t, h.lat), a = Math.max(0, Math.min(1, h.a));
      if (a <= 0) return;
      x.save(); x.translate(p.x, p.y);
      x.fillStyle = `rgba(10,30,26,${.45 + .35 * a})`;
      x.beginPath(); x.ellipse(0, 0, h.r * (.6 + .4 * a), h.r * .6 * (.6 + .4 * a), 0, 0, 6.3); x.fill();
      if (a > .75) { x.fillStyle = `rgba(169,203,216,${.2 * a})`;
        [-1, 1].forEach(s => { x.beginPath(); x.arc(h.r * .4 * s, -h.r * .32, 1.7, 0, 6.3); x.fill(); }); }
      x.restore();
    });

    // pirogues
    this.canoes.forEach(k => {
      const p = this.posAt(k.t, k.lat);
      const ang = Math.atan2(p.ty, p.tx) + (k.dir < 0 ? Math.PI : 0);
      x.save(); x.translate(p.x, p.y); x.rotate(ang);
      x.fillStyle = 'rgba(34,22,11,.8)';
      x.beginPath(); x.moveTo(-k.len * .5, 0);
      x.quadraticCurveTo(0, -k.len * .1, k.len * .5, 0);
      x.quadraticCurveTo(0, k.len * .1, -k.len * .5, 0); x.fill();
      x.fillStyle = 'rgba(20,13,7,.9)';
      for (let i = 0; i < k.crew; i++) {
        const px = -k.len * .2 + i * (k.len * .28);
        x.beginPath(); x.arc(px, 0, 2.2, 0, 6.3); x.fill();
        x.strokeStyle = 'rgba(20,13,7,.6)'; x.lineWidth = 1;
        x.beginPath(); x.moveTo(px, 0); x.lineTo(px + 2.6, Math.sin(k.stroke + i) * 3.4); x.stroke();
      }
      x.restore();
    });

    // ripples + glints
    this.ripples.forEach(rp => { x.beginPath(); x.arc(rp.x, rp.y, rp.r, 0, 6.3);
      x.strokeStyle = `rgba(169,203,216,${rp.a})`; x.lineWidth = rp.w; x.stroke(); });
    x.globalCompositeOperation = 'lighter';
    this.glints.forEach(g => {
      const p = this.posAt(g.t, g.lat), tw = .5 + .5 * Math.sin(T * 2.4 + g.ph);
      x.fillStyle = `rgba(190,220,230,${.06 * tw})`;
      x.save(); x.translate(p.x, p.y); x.rotate(Math.atan2(p.ty, p.tx));
      x.beginPath(); x.ellipse(0, 0, g.sz + tw * 6, 1.1, 0, 0, 6.3); x.fill(); x.restore();
    });
    x.globalCompositeOperation = 'source-over';
    x.restore(); // end channel clip

    // mist drifting over the forest
    this.mists.forEach(m => {
      const gg = x.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.rad);
      gg.addColorStop(0, `rgba(191,224,220,${m.a})`); gg.addColorStop(1, 'rgba(191,224,220,0)');
      x.fillStyle = gg; x.fillRect(m.x - m.rad, m.y - m.rad, m.rad * 2, m.rad * 2);
    });

    // bird shadows over the canopy
    this.birds.forEach(b => {
      const f = Math.sin(b.flap) * .5;
      x.save(); x.translate(b.x, b.y); x.scale(b.dir, 1);
      x.fillStyle = 'rgba(3,14,10,.32)';
      x.beginPath(); x.moveTo(0, 0);
      x.quadraticCurveTo(-b.size * .5, -b.size * (.5 + f), -b.size * 1.5, -b.size * .15 * (1 + f));
      x.quadraticCurveTo(-b.size * .6, -b.size * .05, 0, b.size * .12);
      x.quadraticCurveTo(b.size * .6, -b.size * .05, b.size * 1.5, -b.size * .15 * (1 + f));
      x.quadraticCurveTo(b.size * .5, -b.size * (.5 + f), 0, 0);
      x.fill(); x.restore();
    });

    // vignette keeps the UI readable
    const v = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .32, W / 2, H / 2, Math.max(W, H) * .8);
    v.addColorStop(0, 'rgba(4,14,11,0)'); v.addColorStop(1, 'rgba(3,11,9,.78)');
    x.fillStyle = v; x.fillRect(0, 0, W, H);
  }
}

/* Global for plain <script> use. In Vite/React:
     import '/river.js';  const r = new window.RiverScene(el); r.start();  */
if (typeof window !== 'undefined') window.RiverScene = RiverScene;
if (typeof module !== 'undefined' && module.exports) module.exports = RiverScene;
