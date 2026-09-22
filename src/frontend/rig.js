// Stick-figure rig: side view, forward kinematics, pose keyframes.
//
// Angles are absolute directions in degrees: 0 = pointing down, 90 = forward
// (the figure faces right), 180 = up, -90 = back. Knees fold backward
// (shin = thigh - knee), elbows fold forward (forearm = upper arm + elbow).
// R limbs are the near side (bright), L limbs the far side (dim).
//
// A pose: { t, h, aR:[upper, elbow], aL, lR:[thigh, knee], lL, fR, fL, sR, sL, dx, dy, rope }
// Missing fields fall back to STAND.

const L = { torso: 52, neck: 7, head: 10, thigh: 45, shin: 43, foot: 13, uarm: 31, farm: 29 };

export const STAND = {
  t: 180, h: 0,
  aR: [6, 12], aL: [-6, 12],
  lR: [2, 0], lL: [-2, 0],
  fR: 90, fL: 90,
  sR: 1, sL: 1,           // arm length projection (arms swinging out of plane)
  dx: 0, dy: 0, rope: 0,
};

const rad = (d) => (d * Math.PI) / 180;
const dir = (d, len) => [Math.sin(rad(d)) * len, -Math.cos(rad(d)) * len];
const add = (p, v) => [p[0] + v[0], p[1] + v[1]];

export function pose(over = {}) {
  return { ...STAND, ...over };
}

// Joint positions in math coords (y up), before grounding.
function solve(p) {
  const hip = [0, 0];
  const sh = add(hip, dir(p.t, L.torso));
  const neck = add(sh, dir(p.t + p.h, L.neck));
  const head = add(neck, dir(p.t + p.h, L.head));
  const limb = (root, [a, b], l1, l2, sign) => {
    const j = add(root, dir(a, l1));
    return [j, add(j, dir(a + sign * b, l2))];
  };
  const [elR, haR] = limb(sh, p.aR, L.uarm * p.sR, L.farm * p.sR, 1);
  const [elL, haL] = limb(sh, p.aL, L.uarm * p.sL, L.farm * p.sL, 1);
  const [knR, anR] = limb(hip, p.lR, L.thigh, L.shin, -1);
  const [knL, anL] = limb(hip, p.lL, L.thigh, L.shin, -1);
  const toR = add(anR, dir(p.fR, L.foot));
  const toL = add(anL, dir(p.fL, L.foot));
  return { hip, sh, neck, head, elR, haR, elL, haL, knR, anR, knL, anL, toR, toL };
}

// Place the solved figure: anchor joint pinned at x = dx; lowest point on the
// ground (+dy for jumps), or — for hanging moves — the hands pinned to the bar.
export function place(p, ex) {
  const j = solve(p);
  const pts = Object.values(j);
  let sx, sy;
  if (ex.bar) {
    sx = -j.haR[0] + p.dx;
    sy = ex.bar - j.haR[1] + p.dy;
  } else {
    const a = j[ex.anchor || 'anR'];
    sx = -a[0] + p.dx;
    let minY = Infinity;
    for (const q of pts) minY = Math.min(minY, q[1]);
    minY = Math.min(minY, j.head[1] - L.head);
    sy = -minY + p.dy;
  }
  for (const k in j) j[k] = [j[k][0] + sx, j[k][1] + sy];
  return j;
}

export function lerpPose(a, b, k) {
  const out = {};
  for (const key in a) {
    const va = a[key], vb = b[key] ?? va;
    if (key === 'rope') {
      // the rope only ever turns forward: take the positive way round
      out.rope = va + (((vb - va) % 360) + 360) % 360 * k;
    } else {
      out[key] = Array.isArray(va) ? va.map((x, i) => x + (vb[i] - x) * k) : va + (vb - va) * k;
    }
  }
  return out;
}

const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

// Pose at time ms in a looping keyframe list: [{ p, d (move ms), hold? }]
export function sample(frames, ms) {
  const total = frames.reduce((s, f) => s + (f.hold || 0) + f.d, 0);
  let t = ms % total;
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    const next = frames[(i + 1) % frames.length];
    if (t < (f.hold || 0)) return f.p;
    t -= f.hold || 0;
    if (t < f.d) return lerpPose(f.p, next.p, ease(t / f.d));
    t -= f.d;
  }
  return frames[0].p;
}

// Bounding box over every keyframe (and midpoints), for a stable viewBox.
export function bounds(ex) {
  let x0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const fs = ex.frames;
  const probe = (p) => {
    const j = place(p, ex);
    for (const q of Object.values(j)) {
      x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]);
    }
    y1 = Math.max(y1, j.head[1] + L.head);
    if (ex.props?.includes('rope')) {
      const r = ropePoint(j, p.rope);
      x0 = Math.min(x0, r[0]); x1 = Math.max(x1, r[0]); y1 = Math.max(y1, r[1]);
    }
  };
  fs.forEach((f, i) => {
    probe(f.p);
    probe(lerpPose(f.p, fs[(i + 1) % fs.length].p, 0.5));
  });
  if (ex.bar) y1 = Math.max(y1, ex.bar + 14);
  return { x0: x0 - 22, x1: x1 + 22, y0: -8, y1: y1 + 14 };
}

// The rope swings on a circle around the body; rope = angle in degrees
// (0 = under the feet, 180 = overhead, going front-to-back).
function ropePoint(j, a) {
  const cx = (j.hip[0] + j.sh[0]) / 2;
  const cy = (j.anR[1] + j.head[1]) / 2 + 4;
  const ry = (j.head[1] + L.head - j.anR[1]) / 2 + 10;
  const rx = 34;
  return [cx + Math.sin(rad(a)) * rx, cy - Math.cos(rad(a)) * ry];
}

// ── rendering ───────────────────────────────────────────────────────────────

const NS = 'http://www.w3.org/2000/svg';
const el = (name, attrs) => {
  const e = document.createElementNS(NS, name);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
};

export class Figure {
  constructor(svg) {
    this.svg = svg;
    this.ex = null;
    this.raf = 0;
    this.t0 = 0;
    this.speed = 1;
  }

  load(ex) {
    this.ex = ex;
    const b = bounds(ex);
    // One scale for every exercise so the figure never changes size; the
    // viewBox takes the element's aspect, and only unusually wide or tall
    // moves (planks, the pull-up bar) zoom out.
    const w = b.x1 - b.x0, h = b.y1 - b.y0;
    const r = this.svg.clientWidth && this.svg.clientHeight
      ? this.svg.clientWidth / this.svg.clientHeight
      : parseFloat(this.svg.dataset.aspect) || 1;   // hidden element: use the declared aspect
    let H = Math.max(218, h);
    let W = H * r;
    if (w > W) { W = w; H = W / r; }
    const cx = (b.x0 + b.x1) / 2;
    const top = b.y0 + H - 4;          // ground sits near the bottom edge
    this.svg.setAttribute('viewBox', `${cx - W / 2} ${-top} ${W} ${H}`);
    const side = W;
    this.svg.replaceChildren();
    const g = (cls) => { const n = el('g', { class: cls }); this.svg.append(n); return n; };
    this.svg.append(el('line', { class: 'rig-ground', x1: cx - side, x2: cx + side, y1: 0, y2: 0 }));
    if (ex.bar) {
      // pull-up frame behind the figure; the bar itself is seen end-on
      this.svg.append(el('polyline', { class: 'rig-post', points: `-48,0 -48,${-ex.bar} 0,${-ex.bar}` }));
    }
    this.far = g('rig-far');
    this.body = g('rig-body');
    this.near = g('rig-near');
    const mk = (parent, name, attrs) => { const n = el(name, attrs); parent.append(n); return n; };
    this.n = {
      rope: ex.props?.includes('rope') ? mk(this.far, 'path', { class: 'rig-rope' }) : null,
      legL: mk(this.far, 'polyline', { class: 'rig-limb' }),
      armL: mk(this.far, 'polyline', { class: 'rig-limb' }),
      dbL: ex.props?.includes('db2') ? mk(this.far, 'g', { class: 'rig-db' }) : null,
      torso: mk(this.body, 'line', { class: 'rig-torso' }),
      head: mk(this.body, 'circle', { class: 'rig-head', r: L.head }),
      legR: mk(this.near, 'polyline', { class: 'rig-limb' }),
      armR: mk(this.near, 'polyline', { class: 'rig-limb' }),
      dbR: ex.props?.some((p) => p === 'db1' || p === 'db2' || p === 'dbR') ? mk(this.near, 'g', { class: 'rig-db' }) : null,
      bar: ex.bar ? mk(this.near, 'circle', { class: 'rig-bar', r: 4.5, cx: 0, cy: -ex.bar }) : null,
    };
    for (const k of ['dbL', 'dbR']) {
      if (!this.n[k]) continue;
      this.n[k].append(el('line', { class: 'rig-db-handle', x1: -9, x2: 9, y1: 0, y2: 0 }));
      this.n[k].append(el('rect', { class: 'rig-db-plate', x: -13, y: -6, width: 6, height: 12 }));
      this.n[k].append(el('rect', { class: 'rig-db-plate', x: 7, y: -6, width: 6, height: 12 }));
    }
    this.draw(0);
  }

  draw(ms) {
    const ex = this.ex;
    const p = sample(ex.frames, ms);
    const j = place(p, ex);
    const P = (q) => `${q[0].toFixed(1)},${(-q[1]).toFixed(1)}`;
    const n = this.n;
    n.legL.setAttribute('points', [j.hip, j.knL, j.anL, j.toL].map(P).join(' '));
    n.armL.setAttribute('points', [j.sh, j.elL, j.haL].map(P).join(' '));
    n.legR.setAttribute('points', [j.hip, j.knR, j.anR, j.toR].map(P).join(' '));
    n.armR.setAttribute('points', [j.sh, j.elR, j.haR].map(P).join(' '));
    n.torso.setAttribute('x1', j.hip[0]); n.torso.setAttribute('y1', -j.hip[1]);
    n.torso.setAttribute('x2', j.neck[0]); n.torso.setAttribute('y2', -j.neck[1]);
    n.head.setAttribute('cx', j.head[0]); n.head.setAttribute('cy', -j.head[1]);
    const dbAt = (node, el, ha) => {
      if (!node) return;
      // handle runs across the forearm line
      const ang = Math.atan2(-(ha[1] - el[1]), ha[0] - el[0]) * 180 / Math.PI + 90;
      node.setAttribute('transform', `translate(${ha[0].toFixed(1)},${(-ha[1]).toFixed(1)}) rotate(${ang.toFixed(1)})`);
    };
    if (ex.props?.includes('db1')) {
      // one bell held in both hands (swing, goblet)
      const mid = [(j.haR[0] + j.haL[0]) / 2, (j.haR[1] + j.haL[1]) / 2];
      dbAt(n.dbR, [(j.elR[0] + j.elL[0]) / 2, (j.elR[1] + j.elL[1]) / 2], mid);
      n.dbR.setAttribute('transform', n.dbR.getAttribute('transform') + ' rotate(90)');
    } else {
      dbAt(n.dbR, j.elR, j.haR);
      dbAt(n.dbL, j.elL, j.haL);
    }
    if (n.rope) {
      // The rope is a U between the hands seen slightly from the side: a thin
      // lens from the near hand out to the swing point and back to the far hand.
      const r = ropePoint(j, p.rope);
      const m = [(j.haR[0] + j.haL[0]) / 2, (j.haR[1] + j.haL[1]) / 2];
      const vx = r[0] - m[0], vy = r[1] - m[1];
      const len = Math.hypot(vx, vy) || 1;
      const nx = -vy / len, ny = vx / len;                  // normal to the rope line
      const bow = Math.min(18, len * 0.22);
      const c = (s) => [m[0] + vx * 0.62 + nx * bow * s, m[1] + vy * 0.62 + ny * bow * s];
      n.rope.setAttribute('d',
        `M${P(j.haR)} Q${P(c(1))} ${P(r)} Q${P(c(-1))} ${P(j.haL)}`);
    }
  }

  play() {
    cancelAnimationFrame(this.raf);
    this.t0 = performance.now();
    const loop = (now) => {
      this.draw((now - this.t0) * this.speed);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }
}
