const cv = document.getElementById('c'),
  g = cv.getContext('2d'),
  W = 960,
  H = 540,
  GY = 430;
let save = { coin: 300, own: {}, sk: {}, rp: 1000, w: 0, l: 0 };
try {
  Object.assign(save, JSON.parse(localStorage.getItem('cf') || '{}'));
} catch (e) {}
const sv = () => {
  try {
    localStorage.setItem('cf', JSON.stringify(save));
  } catch (e) {}
};
const R = Math.random;

// ---- data ----
const SK = [
  { n: 'ノーマル', c: 0, p: 0 },
  { n: 'ゴールド', c: '#fc3', p: 300 },
  { n: 'ネオン', c: '#0ee', p: 400 },
  { n: 'シャドウ', c: '#446', p: 500 },
];
// ================= キャラクターデータの組み立て =================
// 性能・見た目・技・モーションは characters.js で編集します(このブロックは触らなくてOK)
const SL = ['n', 'f', 'u', 'd', 'da', 'an', 'af', 'au', 'ad', 's', 'sf', 'su'];
const AR = MOTIONS, FXC = EFFECT_COLORS;
const motionOf = (m) => (typeof m.a === 'object' ? m.a : AR[m.a]);
const STAT_MAP = { speed: 'sp', jump: 'jp', airJumps: 'dj', jumpStartup: 'jsq', landLag: 'lgl', airLandLag: 'alg', gravityMul: 'gm', shield: 'shm', dashSpeed: 'dsh', knockbackTaken: 'wt', damageMul: 'dm', justGuardFrames: 'jg', shieldRegen: 'rg' };
const BODY_MAP = { limbW: 'lw', torso: 'tl', thigh: 'ul', shin: 'll', upperArm: 'ua', foreArm: 'la', headR: 'hr', torsoW: 'bw', scale: 'sc', pants: 'pn', belt: 'sh', sleeves: 'sl', foreColor: 'f2', handColor: 'hd', handR: 'hr2', shoes: 'so' };
const PJ_MAP = { speed: 'v', damage: 'd', radius: 'r', count: 'n', spread: 'sp', life: 'life' };
const remap = (o, m) => { const r = {}; for (const k in o) r[m[k] || k] = o[k]; return r; };
const DEFAULT_THROW = { name: '投げ', box: { x: 0, y: -85, w: 55, h: 75 }, startup: 6, active: 3, whiff: 22, release: 34, total: 60,
  f: { name: '投げ', damage: 10, vx: 9, vy: -6, hitstun: 26 }, b: { name: '後方投げ', damage: 9, vx: 9, vy: -6, hitstun: 26 },
  u: { name: '上投げ', damage: 7, vx: 1, vy: -15, hitstun: 30 }, d: { name: '叩きつけ', damage: 11, vx: 3, vy: -7, hitstun: 30 } };
// キャラごとの基本姿勢(character.js の poses で上書き)。書かない項目はこの既定値
const DEFAULT_POSES = {
  idle: [0.08, 0.6, 1.7, 0.35, 1.9, 0.45, -0.5, -0.35, 0.4, 0],
  walk: [0.15, 0.5, 0.7, 0.9],
  guard: [0.05, 1.1, 2.1, 1.0, 2.3, 0.5, -0.4, -0.3, 0.3, 0],
  crouch: [0.35, 0.6, 1.7, 0.35, 1.9, 0.95, -1.3, -0.95, 1.3, 0],
  jumpSquat: [0.5, 0, 0.9, -0.2, 0.9, 1.15, -1.75, -1.0, 1.75, -2],
  landing: [0.45, 1.3, 0.4, 1.0, 0.5, 1.2, -1.6, -0.5, 0.9, 4],
  dashF: [0.5, 0.9, 1.3, -0.4, 1.4, 1.1, -0.5, -1, 0.5, 0],
  dashB: [-0.3, 0.6, 1.7, 0.4, 1.9, 0.7, -0.9, 0.1, -0.4, 0],
  jumpUp: [0, 0.9, 1.3, 0.4, 1.5, 0.8, -1.3, 0.3, -1, 0],
  fall: [0, 1.3, 0.9, 0.9, 0.9, 0.5, -0.7, 0.1, -0.4, 0],
};
function buildChar(c) {
  const mv = {};
  SL.forEach((k) => {
    const m = c.moves[k];
    if (!m) return console.warn(c.name + ': 技 ' + k + ' がありません');
    if (!(c.motions && c.motions[k]) && typeof m.motion === 'string' && !MOTIONS[m.motion]) console.warn(c.name + '/' + k + ': motion「' + m.motion + '」が未定義');
    mv[k] = { k, nm: m.name, lg: m.landLag, a: (c.motions && c.motions[k]) || m.motion, st: m.startup, ac: m.active, rc: m.recovery, d: m.damage, kx: m.knockX, ky: m.knockY, hs: m.hitstun, ghs: m.guardHitStop ?? 3, fx: m.effect, rx: m.box.x, ry: m.box.y, rw: m.box.w, rh: m.box.h };
  });
  return { nm: c.name, ds: c.desc, col: c.look.color, sm: c.look.smooth || {}, ...remap(c.stats, STAT_MAP), pj: remap(c.projectile, PJ_MAP), cb: c.combos, zn: c.zones || {}, hm: c.hitPoses || {}, cg: { ...CROUCH_PARRY, ...(c.crouchParry || {}) }, ps: { ...DEFAULT_POSES, ...(c.poses || {}) }, th: c.throw || DEFAULT_THROW, mv };
}
const CH = CHARACTERS.map(buildChar),
  SY = CHARACTERS.map((c) => remap(c.look.body, BODY_MAP)),
  SKN = CHARACTERS.map((c) => c.look.skin);


function atkFx(p, m) {
  const custom = m.fx && typeof m.fx === 'object',
    spec = custom ? m.fx : {},
    c = spec.color || FXC[m.fx | 0],
    cx = p.x + p.f * (m.rx + (m.rw || 60) / 2),
    cy = m.rh ? p.y + m.ry + m.rh / 2 : p.y - 70,
    size = spec.size || 1,
    r = Math.max(32, (m.rw || 60) * 0.55) * size;
  if (custom) {
    const duration = spec.duration || 12,
      shapes = spec.shapes || [spec.shape || 'slash'];
    for (const shape of shapes) {
      if (shape === 'slash') fx.push({ k: 'arc', x: cx, y: cy, r, f: p.f, t: duration, l: duration, c, a: /^(u|au|su)$/.test(m.k) ? -1 : /^(d|ad)$/.test(m.k) ? 1 : 0 });
      else if (shape === 'ring') fx.push({ k: 'ring', x: cx, y: cy, r: r * 0.7, t: duration, l: duration, c });
      else if (shape === 'wave') fx.push({ k: 'ring', x: p.x, y: Math.min(GY, p.y), r: r * 0.9, t: duration, l: duration, c, e: 1 });
      else if (shape === 'spark') fx.push({ k: 'zig', x: cx, y: cy, f: p.f, r, t: duration, l: duration, c });
      else if (shape === 'flame' || shape === 'burst' || shape === 'beam') fx.push({ k: shape, x: cx, y: cy, f: p.f, r, t: duration, l: duration, c });
    }
    const count = Math.max(0, spec.particles ?? 6),
      particleLife = spec.particleLife || 18;
    for (let i = 0; i < count; i++)
      PT.push({ x: cx, y: cy, vx: p.f * (1 + R() * 6) * size, vy: (R() - 0.5) * 4, t: particleLife, l: particleLife, c });
    return;
  }
  fx.push({
    k: 'arc',
    x: cx,
    y: cy,
    r,
    f: p.f,
    t: 12,
    l: 12,
    c,
    a: /^(u|au|su)$/.test(m.k) ? -1 : /^(d|ad)$/.test(m.k) ? 1 : 0,
  });
  for (let i = 0; i < 9; i++)
    PT.push({
      x: cx,
      y: cy,
      vx: p.f * (1 + R() * 6),
      vy: (R() - 0.5) * 4 - (m.fx === 1 ? R() * 3 : 0),
      t: 18,
      l: 18,
      c,
    });
  if (m.fx === 4) fx.push({ k: 'zig', x: cx, y: cy, f: p.f, t: 8, l: 8, c });
  if (m.fx === 3)
    fx.push({ k: 'ring', x: p.x, y: p.y - 50, r: 60, t: 14, l: 14, c });
  if (m.fx === 2 || m.k === 'ad' || m.k === 'su')
    fx.push({
      k: 'ring',
      x: p.x,
      y: Math.min(GY, p.y),
      r: 90,
      t: 14,
      l: 14,
      c,
      e: 1,
    });
  for (let i = 0; i < 3; i++)
    fx.push({
      k: 'line',
      x: p.x - p.f * 20,
      y: cy + (i - 1) * 14,
      f: p.f,
      t: 10,
      l: 10,
      c,
    });
}

function drawFx(f) {
  const u = f.l ? f.t / f.l : 1;
  g.save();
  g.globalAlpha = Math.min(1, u * 1.3);
  g.strokeStyle = g.fillStyle = f.c || '#ff0';
  if (f.k === 'arc') {
    g.translate(f.x, f.y);
    g.scale(f.f, 1);
    g.lineCap = 'round';
    g.lineWidth = 3 + u * 10;
    const r = f.r * (1.2 - u * 0.25);
    g.beginPath();
    g.arc(-f.r * 0.4, 0, r, -1.1 + f.a * 0.9, 1.1 + f.a * 0.9);
    g.stroke();
    g.lineWidth = 2;
    g.strokeStyle = '#fff';
    g.beginPath();
    g.arc(-f.r * 0.4, 0, r, -0.9 + f.a * 0.9, 0.9 + f.a * 0.9);
    g.stroke();
  } else if (f.k === 'ring') {
    g.lineWidth = 2 + u * 6;
    g.beginPath();
    if (f.e) g.ellipse(f.x, f.y, f.r * (1.2 - u), (1.2 - u) * 14, 0, 0, 7);
    else g.arc(f.x, f.y, f.r * (1.3 - u), 0, 7);
    g.stroke();
  } else if (f.k === 'zig') {
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(f.x, f.y - 40);
    for (let i = 1; i < 7; i++)
      g.lineTo(
        f.x + f.f * i * 12 * (1.4 - u) + (R() - 0.5) * 18,
        f.y - 40 + i * 14 + (R() - 0.5) * 10
      );
    g.stroke();
  } else if (f.k === 'flame') {
    g.save();
    g.translate(f.x, f.y);
    g.scale(f.f, 1);
    g.lineJoin = 'round';
    for (let i = 0; i < 4; i++) {
      const x = (i - 1.5) * f.r * 0.16,
        h = f.r * (0.35 + 0.45 * u) * (0.8 + (i % 2) * 0.2);
      g.fillStyle = i % 2 ? '#fff9' : f.c;
      g.beginPath();
      g.moveTo(x - f.r * 0.13, 0);
      g.quadraticCurveTo(x - f.r * 0.2, -h * 0.5, x + (R() - 0.5) * 8, -h);
      g.quadraticCurveTo(x + f.r * 0.22, -h * 0.48, x + f.r * 0.13, 0);
      g.fill();
    }
    g.restore();
  } else if (f.k === 'burst') {
    const radius = f.r * (1.15 - u * 0.7);
    g.lineWidth = 3 + u * 4;
    g.beginPath();
    g.arc(f.x, f.y, radius, 0, 7);
    g.stroke();
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4,
        inner = radius * 0.55;
      g.beginPath();
      g.moveTo(f.x + Math.cos(a) * inner, f.y + Math.sin(a) * inner);
      g.lineTo(f.x + Math.cos(a) * radius, f.y + Math.sin(a) * radius);
      g.stroke();
    }
  } else if (f.k === 'beam') {
    g.lineCap = 'round';
    g.lineWidth = 4 + u * 8;
    g.beginPath();
    g.moveTo(f.x, f.y);
    g.lineTo(f.x + f.f * f.r, f.y);
    g.stroke();
    g.strokeStyle = '#fff';
    g.lineWidth = 2;
    g.stroke();
  } else if (f.k === 'txt') {
    g.font = 'bold 28px sans-serif';
    g.textAlign = 'center';
    g.lineWidth = 5;
    g.strokeStyle = '#000';
    const ty = f.y - (1 - u) * 30;
    g.strokeText(f.text, f.x, ty);
    g.fillText(f.text, f.x, ty);
  } else if (f.k === 'line') {
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(f.x, f.y);
    g.lineTo(f.x - f.f * (40 + (1 - u) * 60), f.y);
    g.stroke();
  } else {
    g.beginPath();
    g.arc(f.x, f.y, 30 - f.t * 1.5, 0, 7);
    g.fill();
    g.lineWidth = 3;
    for (let k = 0; k < 8; k++) {
      const a = k * 0.785,
        r = 14 + (12 - f.t) * 3;
      g.beginPath();
      g.moveTo(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r);
      g.lineTo(f.x + Math.cos(a) * (r + 16), f.y + Math.sin(a) * (r + 16));
      g.stroke();
    }
  }
  g.restore();
}

const ST = [
    { nm: '道場', env: '通常', g: 0.8, acc: 0.3 },
    { nm: '氷原', env: '床が滑る', g: 0.8, acc: 0.04 },
    { nm: '月面', env: '低重力', g: 0.34, acc: 0.3 },
    { nm: '火山', env: '間欠泉でダメージ', g: 0.8, acc: 0.3 },
  ],
  RK = { n: 0, d: 1, an: 1, f: 2, u: 2, au: 2, af: 2, ad: 2, da: 2, s: 4, sf: 5, su: 6 },
  MV = { sf: [9], da: [9], su: [2, -12], af: [3, 5], ad: [0, 10] };

// ---- fighter ----
const F = (c, s, x, f) => ({
  ch: CH[c],
  sk: s,
  x,
  y: GY,
  vx: 0,
  vy: 0,
  f,
  hp: CH[c].hp,
  st: 'idle',
  t: 0,
  mv: null,
  hit: false,
  sh: CH[c].shm || 60,
  run: 0,
  ld: 0,
  cb: 0,
  cbn: 0,
  cbT: 0,
  nr: 0,
});

function applyHit(p, o, m, zn = 'torso', hy = null) {
  if (o.st === 'dash' && o.bd && o.t < 8) return;
  if ((o.st === 'throw' && o.tg >= 0) || o.st === 'held') return; // 投げ中は割り込めない
  p.hit = true;
  if (o.st === 'shield' && o.t > 5 && o.t <= (o.ch.jg || 12)) {
    hs = 10;
    o.sh = Math.min(o.ch.shm || 60, o.sh + 12);
    o.st = 'idle';
    o.pg = 24;
    o.vx = 0;
    dust(o.x + p.f * 30, o.y - 60, 8, '#7df');
    if (p.st === 'atk') {
      p.st = 'hit';
      p.hz = 'torso';
      p.t = 18;
      p.mv = null;
      p.vx = -p.f * 4;
    }
    fx.push({ x: o.x + p.f * 30, y: o.y - 60, t: 22, jg: 1 });
    return 'jg';
  }
  if (o.st === 'shield' && o.t > 5) {
    o.sh -= Math.max(3, m.d) * 1.6;
    o.vx = p.f * m.kx * 0.4;
    p.vx = -p.f * 2.5;
    hs = m.ghs;
    fx.push({ x: o.x, y: o.y - 60, t: 8 });
    if (o.sh <= 0) {
      o.st = 'break';
      o.t = 100;
      o.sh = o.ch.shm || 60;
    }
    return;
  }
  const Z = zoneInfo(o, zn),
    cy = hy == null ? o.y - 60 : hy,
    cg = o.dn && o.st === 'idle' && o.y >= GY ? o.ch.cg : null; // しゃがみ中に被弾 → 受け流し
  o.cb = o.st === 'hit' ? o.cb + 1 : 1;
  o.cbn = o.cb;
  o.cbT = 70;
  const d = Math.max(1, Math.round(m.d * ((p.ch && p.ch.dm) || 1) * Z.dmg * (cg ? cg.dmg : 1) * Math.max(0.5, 1 - 0.07 * (o.cb - 1))));
  o.hp = Math.max(0, o.hp - d);
  o.st = 'hit';
  o.hz = zn;
  o.t = Math.round(m.hs * Z.stun * (cg ? cg.stun : 1) * Math.max(0.55, 1 - 0.07 * (o.cb - 1)));
  o.cr = !!cg; // 硬直中もしゃがみ姿勢のまま
  o.vx = p.f * m.kx * Z.knock * (cg ? cg.knock : 1) * (o.ch.wt || 1);
  o.vy = cg ? 0 : m.ky * (o.ch.wt || 1); // 受け流しは浮かない
  if (!cg && Z.pop && o.y >= GY) o.vy = Math.min(o.vy, Z.pop); // 脚に当たると足をすくわれて浮く
  if (o.vy < -2) o.y -= 2;
  o.mv = null;
  hs = cg ? cg.stop : Math.min(8, 3 + ((d / 3) | 0)) + (Z.stop || 0);
  const c = (m.fx && typeof m.fx === 'object' ? m.fx.color : FXC[m.fx | 0]) || '#ff8',
    zc = Z.color || c;
  dust(o.x, cy, 10, c);
  fx.push({ x: o.x, y: cy, t: 12, l: 12, c: zn === 'torso' || zn === 'arms' ? c : zc });
  fx.push({ k: 'ring', x: o.x, y: cy, r: 55, t: 10, l: 10, c });
  if (zn === 'head') {
    dust(o.x, cy, 8, zc);
    fx.push({ k: 'ring', x: o.x, y: cy, r: 95, t: 16, l: 16, c: zc });
    fx.push({ x: o.x, y: cy, t: 16, l: 16, c: zc });
  }
  if (cg) {
    fx.push({ k: 'ring', x: o.x, y: o.y, r: 80, e: 1, t: 14, l: 14, c: cg.color });
    fx.push({ k: 'txt', text: cg.label + ' ×' + cg.dmg, x: o.x, y: o.y - 70, t: 36, l: 36, c: cg.color });
    dust(o.x - p.f * 10, o.y, 6, cg.color);
  } else if (zn === 'feet' || zn === 'legs') fx.push({ k: 'ring', x: o.x, y: o.y, r: 60, e: 1, t: 14, l: 14, c: zc });
  if (Z.label) fx.push({ k: 'txt', text: Z.label + (Z.dmg !== 1 ? ' ×' + Z.dmg : ''), x: o.x, y: o.y - bodyH(o) - 20, t: 36, l: 36, c: zc });
}

// ---- 当たり部位(頭/胴/脚)。設定は character.js の HIT_ZONES ----
let zv = false; // トレーニングで H キー → 部位表示
const bodyH = (o) => ((o.dn && o.st === 'idle') || (o.cr && o.st === 'hit') ? 44 : 100); // しゃがみ中は食らい判定が低い
function zoneOf(o, cy) {
  const rel = (o.y - cy) / bodyH(o); // 0=足元 1=頭頂
  return rel >= ZONE_RANGE.head ? 'head' : rel <= ZONE_RANGE.legs ? 'legs' : 'torso';
}
const zoneInfo = (o, zn) => {
  const zones = o.ch.zn || {};
  if (zn === 'arms') return { ...HIT_ZONES.torso, ...(zones.torso || {}), ...(zones.arms || {}) };
  if (zn === 'feet' || zn === 'legs') return { ...HIT_ZONES.feet, ...(zones.legs || {}), ...(zones.feet || {}) };
  return { ...HIT_ZONES[zn], ...(zones[zn] || {}) };
};
function drawZones(o) {
  drawHitVolumes(o);
}

// ================= 投げ =================
function beginThrow(p, i) {
  const bk = (i.r && p.f < 0) || (i.l && p.f > 0);
  p.td = i.u ? 'u' : i.d ? 'd' : bk ? 'b' : 'f'; // 入力方向(なしは前)
  p.st = 'throw';
  p.t = 0;
  p.tg = -1;
  p.hit = false;
}
function canGrab(p, o, T) {
  const bx = p.f > 0 ? p.x + T.box.x : p.x - T.box.x - T.box.w,
    by = p.y + T.box.y;
  if (!['idle', 'shield', 'sdown', 'land', 'dash', 'atk', 'break'].includes(o.st) || o.y < GY) return false;
  if (o.st === 'dash' && o.bd && o.t < 8) return false;
  return bx < o.x + 22 && bx + T.box.w > o.x - 22 && by < o.y && by + T.box.h > o.y - 100;
}
function throwStep(p, o) {
  const T = p.ch.th;
  p.t++;
  p.vx = 0;
  if (p.tg < 0) {
    if (p.t > T.startup && p.t <= T.startup + T.active && canGrab(p, o, T)) {
      p.tg = p.t;
      o.st = 'held';
      o.hd = p.td;
      o.mv = null;
      o.vx = o.vy = 0;
      hs = 4;
      fx.push({ k: 'ring', x: o.x, y: o.y - 60, r: 60, t: 10, l: 10, c: '#fa3' });
      fx.push({ k: 'txt', text: '掴み!', x: o.x, y: o.y - 125, t: 24, l: 24, c: '#fa3' });
    } else if (p.t > T.startup + T.active + T.whiff) p.st = 'idle';
    return;
  }
  const H = THROW_HOLD[p.td];
  if (p.t < T.release) {
    const u = ez((p.t - p.tg) / Math.max(1, T.release - p.tg - 4));
    o.x = Math.max(30, Math.min(W - 30, p.x + p.f * (30 + (H.x - 30) * u)));
    o.y = p.y - H.y * u;
    o.f = -p.f;
  } else if (p.t === T.release) releaseThrow(p, o, T);
  if (p.t > T.total) p.st = 'idle';
}
function releaseThrow(p, o, T) {
  const dd = T[p.td],
    d = Math.max(1, Math.round(dd.damage * (p.ch.dm || 1))),
    w = o.ch.wt || 1,
    sg = p.td === 'b' ? -1 : 1;
  o.hp = Math.max(0, o.hp - d);
  o.st = 'hit';
  o.hz = 'torso';
  o.t = dd.hitstun;
  o.mv = null;
  o.cb = 1;
  o.cbn = 1;
  o.vx = p.f * sg * dd.vx * w;
  o.vy = dd.vy * w;
  if (p.td === 'b') o.x = Math.max(30, Math.min(W - 30, p.x - p.f * 30));
  if (p.td === 'd') {
    o.x = Math.max(30, Math.min(W - 30, p.x + p.f * 38));
    o.y = GY; // 地面に叩きつけ→バウンド
    fx.push({ k: 'ring', x: o.x, y: GY, r: 110, e: 1, t: 16, l: 16, c: '#fa3' });
  }
  hs = Math.min(12, 6 + ((d / 2) | 0));
  dust(o.x, o.y - 50, 14, '#fa3');
  fx.push({ k: 'ring', x: o.x, y: o.y - 50, r: 100, t: 16, l: 16, c: '#fff' });
  fx.push({ k: 'txt', text: dd.name + ' ' + d, x: o.x, y: Math.min(o.y, GY) - 130, t: 44, l: 44, c: '#fa3' });
}

function tryHit(p, o, m) {
  const bx = p.f > 0 ? p.x + m.rx : p.x - m.rx - m.rw,
    by = p.y + m.ry,
    hit = m.rw > 0 && m.rh > 0 ? hitPartForRect(o, { x: bx, y: by, w: m.rw, h: m.rh }) : null;
  if (hit) applyHit(p, o, m, hit.zone, hit.y);
}

function pick(p, i) {
  const air = p.y < GY,
    fw = (i.r && p.f > 0) || (i.l && p.f < 0);
  if (i.sp && !air) return i.u ? 'su' : fw ? 'sf' : 's';
  if (air) return i.u ? 'au' : i.d ? 'ad' : fw ? 'af' : 'an';
  if (i.u) return 'u';
  if (i.d) return 'd';
  if (fw)
    return p.run > 14 || p.st === 'dash' || Math.abs(p.vx) > p.ch.sp * 1.3
      ? 'da'
      : 'f';
  return 'n';
}

function begin(p, k) {
  p.st = 'atk';
  p.t = 0;
  p.hit = false;
  p.cx = 0;
  p.mv = p.ch.mv[k];
}

function step(p, i, o, S) {
  const c = p.ch,
    wa = p.y < GY;
  if (p.st === 'held') {
    // 掴まれ中:動けない(攻撃側が離れたら解除)
    p.vx = p.vy = 0;
    if (o.st !== 'throw' || o.tg < 0) p.st = 'idle';
    return;
  }
  if (p.st === 'hit' || p.st === 'break') {
    if (p.st === 'hit' && wa) p.t = Math.max(p.t, 3);
    if (--p.t <= 0) p.st = 'idle';
  } else if (p.st === 'throw') {
    throwStep(p, o);
  } else if (p.st === 'atk') {
    p.t++;
    const m = p.mv;
    if (m.k === 's' && p.t === m.st) {
      const N = c.pj.n || 1;
      for (let n = 0; n < N; n++)
        PJ.push({
          x: p.x + p.f * 40,
          y: p.y - 70,
          vx: p.f * c.pj.v,
          vy: (n - (N - 1) / 2) * (c.pj.sp || 0),
          f: p.f,
          own: p,
          d: c.pj.d,
          r: c.pj.r,
          life: c.pj.life || 90,
        });
    }
    if (p.t === m.st + 1) atkFx(p, m);
    if (p.t === m.st && MV[m.k]) {
      p.vx = p.f * MV[m.k][0];
      p.vy = MV[m.k][1] ?? p.vy;
    }
    if (p.t > m.st && p.t <= m.st + m.ac && !p.hit && m.rw > 0) tryHit(p, o, m);
    if (p.t > m.st + m.ac + m.rc) p.st = 'idle';
    else if (
      p.hit &&
      !p.cx &&
      p.t > m.st &&
      (i.at || i.sp)
    ) {
      const k = pick(p, i);
      if (RK[k] > RK[m.k] || (k === 'n' && m.k === 'n' && p.nr < 2)) {
        if (k === 'n') p.nr++;
        begin(p, k);
      }
    }
  } else if (p.st === 'shield') {
    p.t++;
    p.sh -= 0.05;
    if (!i.sh && p.t > 5) {
      p.st = 'sdown';
      p.t = 0;
    }
  } else if (p.st === 'sdown') {
    if (++p.t > 10) p.st = 'idle';
  } else if (p.st === 'land') {
    if (++p.t > (p.lg || 9)) p.st = 'idle'; // 着地隙(技・ジャンプごとに p.lg を設定)
  } else if (p.st === 'jsq') {
    // ジャンプ前隙:しゃがみ終わりに跳ぶ
    if (++p.t >= (c.jsq | 0)) {
      p.st = 'idle';
      p.vy = c.jp;
      dust(p.x, GY, 4);
    }
  } else if (p.st === 'dash') {
    p.t++;
    p.vx = p.dd * (c.dsh || 9) * Math.max(0.2, 1 - p.t / 16);
    if (p.t % 4 === 1) dust(p.x, GY, 2);
    if (p.t > 14) p.st = 'idle';
    else if (p.t > 6 && (i.at || i.sp)) {
      p.nr = 0;
      begin(p, pick(p, i));
    }
  }
  if (p.st === 'idle' && p.y >= GY) p.f = o.x > p.x ? 1 : -1;
  if (p.st !== 'shield') p.sh = Math.min(c.shm || 60, p.sh + 0.12);
  if (p.st === 'idle') p.cb = 0;
  if (p.st !== 'hit') p.cr = false;
  if (p.cbT > 0) p.cbT--;
  if (c.rg && p.hp > 0) p.hp = Math.min(c.hp, p.hp + c.rg);
  if (p.pg > 0) p.pg--;
  if (p.ld > 0) p.ld--;
  p.dn = i.d;
  const air = p.y < GY,
    dir = (i.r ? 1 : 0) - (i.l ? 1 : 0);
  if (p.st === 'idle') {
    if (i.dh && !air) {
      p.st = 'dash';
      p.t = 0;
      p.dd = i.dh;
      p.bd = i.dh * p.f < 0;
      dust(p.x, GY, 5);
    } else if (i.sh && !air) {
      p.st = 'shield';
      p.t = 0;
    } else if (i.th && !air) {
      beginThrow(p, i);
    } else if (i.at || i.sp) {
      p.nr = 0;
      begin(p, pick(p, i));
    } else if (i.jp && !air && (c.jsq | 0) > 0) {
      p.st = 'jsq';
      p.t = 0;
      if (opt.mode === 'train') fx.push({ k: 'txt', text: 'ジャンプ前 ' + c.jsq + 'F', x: p.x, y: p.y - 125, t: 30, l: 30, c: '#9f9' });
    } else if (i.jp && (!air || (p.dj | 0) < (c.dj ?? 1))) {
      if (air) {
        p.dj = (p.dj | 0) + 1;
        dust(p.x, p.y, 4);
      }
      p.vy = air ? c.jp * 0.85 : c.jp;
    }
  }
  p.run = p.st === 'idle' && !air && dir ? p.run + 1 : 0;
  if (p.run > 14 && p.run % 7 === 0) dust(p.x, GY, 1);
  if (!air && p.st !== 'dash') {
    const tx =
      p.st === 'idle' && !i.d
        ? dir * c.sp * (p.run > 14 ? 1.6 : 1) * (dir * p.f < 0 ? 0.7 : 1)
        : 0;
    p.vx += (tx - p.vx) * S.acc;
  } else if (p.st === 'idle') p.vx += (dir * c.sp - p.vx) * 0.06;
  p.x = Math.max(30, Math.min(W - 30, p.x + p.vx));
  p.y += p.vy;
  p.vy += S.g * (c.gm || 1);
  if (p.y >= GY) {
    p.y = GY;
    p.vy = 0;
    p.dj = 0;
    if (wa) {
      // 着地隙: 空中技のあと=技の landLag(なければ airLandLag) / 通常ジャンプ=landLag
      let lag = 0;
      if (p.st === 'atk') lag = p.mv.lg ?? (/^a/.test(p.mv.k) ? c.alg ?? 9 : 0);
      else if (p.st === 'idle') lag = c.lgl ?? 3;
      p.ld = p.st === 'hit' ? 6 : Math.min(6, lag);
      dust(p.x, GY, 4 + Math.min(6, lag >> 1));
      if (p.st === 'hit') {
        p.t = Math.max(p.t, 16);
        p.vx *= 0.3;
      } else if (lag > 0) {
        p.st = 'land';
        p.t = 1; // 着地した瞬間も1Fに数える(設定値=動けない総フレーム数)
        p.lg = lag;
        if (opt.mode === 'train') fx.push({ k: 'txt', text: '着地 ' + lag + 'F', x: p.x, y: GY - 40, t: 30, l: 30, c: '#9f9' });
      }
    }
  }
  if (Math.abs(p.x - o.x) < 30 && p.y >= GY && o.y >= GY && p.st !== 'held' && o.st !== 'held') {
    const s = p.x < o.x ? -1 : 1;
    p.x += s * 1.5;
    o.x -= s * 1.5;
  }
}

function ai(p, o, lv) {
  const i = { l: 0, r: 0, u: 0, d: 0, at: 0, sh: 0, jp: 0, sp: 0 };
  if (!lv || p.st === 'hit' || p.st === 'break') return i;
  const d = o.x - p.x,
    ad = Math.abs(d),
    rk = lv / 5,
    tw = d > 0 ? 'r' : 'l',
    aw = d > 0 ? 'l' : 'r';
  if (p.st === 'atk' && p.hit && lv >= 2 && R() < 0.12 + rk * 0.2) {
    i.at = 1;
    const r = R();
    if (r < 0.3) i.d = 1;
    else if (r < 0.5) i[tw] = 1;
    else if (r < 0.65) i.u = 1;
    else if (lv > 3) {
      i.sp = 1;
      i.at = 0;
      if (R() < 0.5) i[tw] = 1;
    }
    return i;
  }
  if (p.st === 'shield') {
    i.sh = (o.st === 'atk' && ad < 140) || R() < 0.8 - rk * 0.2 ? 1 : 0;
    return i;
  }
  if (o.st === 'atk' && ad < 120 && R() < 0.03 + rk * 0.1) {
    i.sh = 1;
    return i;
  }
  if (p.st !== 'idle') return i;
  if (p.ct > 0) {
    p.ct--;
    i.d = 1; // しゃがみ継続
    return i;
  }
  if (o.st === 'atk' && ad < 130 && lv >= 2 && R() < 0.03 + rk * 0.07) {
    p.ct = 18; // 攻撃をしゃがんで受け流す
    i.d = 1;
    return i;
  }
  if (ad < 65 && (o.st === 'shield' ? R() < 0.04 + rk * 0.08 : R() < 0.003 * lv)) {
    i.th = 1; // CPUも投げる(方向はランダム)
    const r = R();
    if (r < 0.25) i[aw] = 1;
    else if (r < 0.4) i.u = 1;
    else if (r < 0.55) i.d = 1;
    return i;
  }
  if (ad > 75 + R() * 25) {
    if (R() < 0.25 + rk * 0.6) i[tw] = 1;
    if (R() < 0.003 * lv) i.jp = 1;
    if (ad > 250 && R() < 0.01 * lv) {
      i.sp = 1;
      i.l = i.r = 0;
    }
  } else if (lv > 2 && R() < 0.015) i[aw] = 1;
  if (ad < 110 && R() < 0.015 + rk * 0.05) {
    i.at = 1;
    const r = R();
    if (r < 0.3) i[tw] = 1;
    else if (r < 0.5) i.u = 1;
    else if (r < 0.6) i.d = 1;
    else if (lv > 2 && r < 0.75) {
      i.at = 0;
      i.sp = 1;
      if (R() < 0.5) i[tw] = 1;
    }
  }
  return i;
}

function dust(x, y, n, c = '#ddd') {
  for (let i = 0; i < n; i++)
    PT.push({ x, y, vx: (R() - 0.5) * 4, vy: -R() * 2, t: 18, l: 18, c });
}

function drawPJ(j) {
  const c = SK[j.own.sk].c || j.own.ch.col;
  g.fillStyle = c;
  g.globalAlpha = 0.4;
  g.beginPath();
  g.arc(j.x - j.f * j.r * 0.8, j.y, j.r * 1.2, 0, 7);
  g.fill();
  g.globalAlpha = 1;
  g.beginPath();
  g.arc(j.x, j.y, j.r, 0, 7);
  g.fill();
  g.fillStyle = '#fff';
  g.beginPath();
  g.arc(j.x, j.y, j.r * 0.5, 0, 7);
  g.fill();
}

// ---- state ----
let ko = 0,
  PT = [],
  tp = {},
  hs = 0,
  PJ = [],
  sc = 'title',
  sel = 0,
  fr = 0,
  msg = '',
  pend = -1,
  cd = 0,
  A,
  B,
  G,
  fx = [],
  opt = { ch: 0, st: 0, lv: 3, mode: 'cpu', v: 0, vs: 0 },
  res = '',
  K = {},
  pr = {};

const own = (c, s) => s == 0 || save.own[c + '_' + s],
  MN = ['オフライン', 'オンライン', 'キャラ一覧', 'ショップ'],
  OF = ['CPU対戦', 'トレーニング', '戻る'],
  ON = ['ランクルーム', 'カジュアルルーム', 'プライベートルーム', '戻る'];

function startFight() {
  const lv =
    opt.mode === 'rank'
      ? Math.max(1, Math.min(5, Math.round(save.rp / 400) - 1))
      : opt.lv;
  opt.lv = opt.mode === 'cpu' || opt.mode === 'train' ? opt.lv : lv;
  if (opt.mode === 'train' && opt.lv > 5) opt.lv = 0;
  A = F(opt.ch, save.sk[opt.ch] || 0, 300, 1);
  B = F(R() * CH.length | 0, R() * 4 | 0, 660, -1);
  G = { x: 480, t: 0 };
  fx = [];
  PJ = [];
  PT = [];
  ko = 0;
  hs = 0;
  cd = 90;
  sc = 'fight';
}

function endFight(w) {
  let t = '';
  const co = w ? 60 : 15;
  save.coin += co;
  t = (w ? 'WIN!' : 'LOSE...') + '  +' + co + 'コイン';
  if (opt.mode === 'rank') {
    const d = w ? 25 : -18;
    save.rp += d;
    t += '  RP ' + (d > 0 ? '+' : '') + d;
  }
  w ? save.w++ : save.l++;
  sv();
  res = t;
  sc = 'result';
}

function cfgGo() {
  if (['rank', 'casual', 'priv'].includes(opt.mode)) {
    sc = 'match';
    cd = opt.mode === 'priv' ? 240 : 150;
    opt.code = Math.random().toString(36).slice(2, 6).toUpperCase();
  } else startFight();
}

function nav(k) {
  const up = k === 'ArrowUp',
    dn = k === 'ArrowDown',
    lf = k === 'ArrowLeft',
    rt = k === 'ArrowRight',
    ok = k === 'Enter' || (k === 'Space' && sc !== 'fight'),
    esc = k === 'Escape',
    h = rt - lf;
  const L = (n) => {
    if (up) sel = (sel + n - 1) % n;
    if (dn) sel = (sel + 1) % n;
    if (up || dn) pend = -1;
  };
  if (sc === 'title') {
    if (k === 'Space') {
      sc = 'main';
      sel = 0;
    }
  } else if (sc === 'main') {
    L(4);
    if (ok) {
      const m = [['off'], ['onl'], ['chars'], ['shop']][sel][0];
      sc = m;
      sel = 0;
      opt.v = 0;
      opt.vs = save.sk[0] || 0;
      msg = '';
    }
  } else if (sc === 'off') {
    L(3);
    if (esc) sc = 'main';
    if (ok) {
      if (sel == 2) {
        sc = 'main';
        sel = 0;
      } else {
        opt.mode = sel ? 'train' : 'cpu';
        sc = 'cfg';
        sel = 0;
      }
    }
  } else if (sc === 'onl') {
    L(4);
    if (esc) sc = 'main';
    if (ok) {
      if (sel == 3) {
        sc = 'main';
        sel = 1;
      } else {
        opt.mode = ['rank', 'casual', 'priv'][sel];
        sc = 'cfg';
        sel = 0;
      }
    }
  } else if (sc === 'cfg') {
    const n = opt.mode === 'cpu' || opt.mode === 'train' ? 4 : 3,
      rows = n == 4 ? [0, 1, 2, 3] : [0, 1, 3];
    L(n);
    const r = rows[sel];
    if (esc) {
      sc = opt.mode === 'cpu' || opt.mode === 'train' ? 'off' : 'onl';
      sel = 0;
    }
    if (h) {
      if (r == 0) opt.ch = (opt.ch + h + CH.length) % CH.length;
      if (r == 1) opt.st = (opt.st + h + 4) % 4;
      if (r == 2)
        opt.lv = Math.max(
          opt.mode === 'train' ? 0 : 1,
          Math.min(5, opt.lv + h)
        );
    }
    if (ok) cfgGo();
  } else if (sc === 'match') {
    if (esc) {
      sc = 'onl';
      sel = 0;
    }
  } else if (sc === 'chars') {
    if (h) {
      opt.v = (opt.v + h + CH.length) % CH.length;
      opt.vs = save.sk[opt.v] || 0;
    }
    if (up) opt.vs = (opt.vs + 3) % 4;
    if (dn) opt.vs = (opt.vs + 1) % 4;
    if (ok) {
      if (own(opt.v, opt.vs)) {
        save.sk[opt.v] = opt.vs;
        sv();
        msg = 'スキンを装備しました';
      } else msg = '未所持:ショップで購入できます';
    }
    if (esc) {
      sc = 'main';
      sel = 2;
    }
  } else if (sc === 'shop') {
    L(1 + CH.length * 3);
    if (esc) {
      sc = 'main';
      sel = 3;
    }
    if (ok) {
      if (pend !== sel) {
        pend = sel;
        msg = 'もう一度Enterで確定(デモ:実際の課金は発生しません)';
      } else {
        pend = -1;
        if (sel == 0) {
          save.coin += 500;
          msg = '500コインを追加しました(課金デモ)';
        } else {
          const c = (sel - 1) / 3 | 0,
            s = (sel - 1) % 3 + 1,
            id = c + '_' + s;
          if (save.own[id]) msg = '所持済み';
          else if (save.coin < SK[s].p) msg = 'コインが足りません';
          else {
            save.coin -= SK[s].p;
            save.own[id] = 1;
            msg = '購入しました!';
          }
        }
        sv();
      }
    }
  } else if (sc === 'fight') {
    if (esc) {
      sc = 'main';
      sel = 0;
    }
    if (opt.mode === 'train') {
      if (/^Digit[0-5]$/.test(k)) opt.lv = +k[5];
      if (k === 'KeyH') zv = !zv;
      if (k === 'KeyR') {
        A.x = 300;
        B.x = 660;
        A.hp = A.ch.hp;
        B.hp = B.ch.hp;
      }
    }
  } else if (sc === 'result') {
    if (ok) {
      sc = 'main';
      sel = 0;
    }
  }
}

addEventListener('keydown', (e) => {
  if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
  if (e.repeat && !e.code.startsWith('Arrow')) return;
  if (!e.repeat) {
    K[e.code] = 1;
    pr[e.code] = 1;
  }
  nav(e.code);
});
addEventListener('keyup', (e) => (K[e.code] = 0));

// ---- update ----
function upd() {
  fr++;
  if (sc === 'match') {
    if (--cd <= 0) startFight();
  }
  if (sc !== 'fight') return;
  const S = ST[opt.st];
  if (cd > 0) {
    cd--;
    return;
  }
  let dh = 0;
  for (const [k, v] of [
    ['ArrowRight', 1],
    ['ArrowLeft', -1],
  ])
    if (pr[k]) {
      if (fr - (tp[k] || -99) < 14) dh = v;
      tp[k] = fr;
    }
  const i1 = {
    dh,
    l: K.ArrowLeft,
    r: K.ArrowRight,
    u: K.ArrowUp,
    d: K.ArrowDown,
    at: pr.KeyZ,
    sh: K.KeyX,
    jp: pr.Space || pr.KeyC,
    sp: pr.KeyA,
    th: pr.KeyG,
  };
  if (ko && fr % 2) return;
  if (hs > 0) {
    hs--;
    return;
  }
  step(A, i1, B, S);
  step(B, ai(B, A, opt.lv), A, S);
  PJ = PJ.filter((j) => {
    j.x += j.vx;
    j.y += j.vy || 0;
    PT.push({
      x: j.x,
      y: j.y,
      vx: -j.f,
      vy: (R() - 0.5) * 2,
      t: 12,
      l: 12,
      c: SK[j.own.sk].c || j.own.ch.col,
    });
    const t = j.own === A ? B : A;
    const hit = hitPartForRect(t, { x: j.x - j.r, y: j.y - j.r, w: j.r * 2, h: j.r * 2 });
    if (hit) {
      if (applyHit({ f: j.f, vx: 0 }, t, { d: j.d, kx: 4, ky: -4, hs: 22 }, hit.zone, hit.y) === 'jg') {
        j.vx *= -1.3;
        j.f *= -1;
        j.own = t;
        j.x += j.vx * 2;
        return true;
      }
      return false;
    }
    return --j.life > 0 && j.x > 0 && j.x < W;
  });
  if (opt.st == 3) {
    if (++G.t >= 300) {
      G.t = 0;
      G.x = 100 + R() * 760;
    }
    if (G.t === 90)
      for (const p of [A, B])
        if (Math.abs(p.x - G.x) < 45) {
          p.hp = Math.max(0, p.hp - 8);
          p.st = 'hit';
          p.hz = 'torso';
          p.t = 24;
          p.vy = -11;
          p.y -= 2;
          p.mv = null;
        }
  }
  fx = fx.filter((f) => --f.t > 0);
  PT = PT.filter((q) => {
    q.x += q.vx;
    q.y += q.vy;
    q.vy += 0.15;
    return --q.t > 0;
  });
  if (opt.mode === 'train') {
    if (B.hp <= 0) B.hp = B.ch.hp;
    if (A.hp <= 0) A.hp = A.ch.hp;
  } else if (A.hp <= 0 || B.hp <= 0) {
    if (++ko > 90) {
      ko = 0;
      endFight(B.hp <= 0);
    }
  }
}

// ---- draw ----
const T = (s, x, y, z = 24, c = '#fff', a = 'center') => {
  g.font = 'bold ' + z + 'px sans-serif';
  g.fillStyle = c;
  g.textAlign = a;
  g.fillText(s, x, y);
};

function bg(si) {
  const P = [
      ['#7ec8ff', '#fde7b0'],
      ['#cfefff', '#eaf8ff'],
      ['#000', '#101830'],
      ['#400', '#f60'],
    ][si],
    gr = g.createLinearGradient(0, 0, 0, GY);
  gr.addColorStop(0, P[0]);
  gr.addColorStop(1, P[1]);
  g.fillStyle = gr;
  g.fillRect(0, 0, W, H);
  if (si == 0) {
    g.fillStyle = '#fff8';
    g.beginPath();
    g.arc(780, 90, 45, 0, 7);
    g.fill();
    g.fillStyle = '#4a6';
    for (let i = 0; i < 4; i++) {
      if (i !== 2){
        g.beginPath();
        g.moveTo(i * 260 - 60, GY);
        g.lineTo(i * 260 + 70, 230);
        g.lineTo(i * 260 + 200, GY);
        g.fill();
      }
    }
  }
  if (si == 1) {
    g.fillStyle = '#fff';
    for (let i = 0; i < 60; i++) {
      g.fillRect(
        (i * 97 + fr * (0.4 + (i % 3) * 0.3)) % W,
        (i * 53 + fr * (1 + (i % 3))) % GY,
        3,
        3
      );
    }
    g.fillStyle = '#9cd';
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.moveTo(i * 280, GY);
      g.lineTo(i * 280 + 120, 260);
      g.lineTo(i * 280 + 240, GY);
      g.fill();
    }
  }
  if (si == 2) {
    g.fillStyle = '#fff';
    for (let i = 0; i < 70; i++) g.fillRect((i * 137) % W, (i * 71) % 330, 2, 2);
    g.fillStyle = '#38c';
    g.beginPath();
    g.arc(740, 110, 60, 0, 7);
    g.fill();
    g.fillStyle = '#4a5';
    g.beginPath();
    g.arc(725, 100, 22, 0, 7);
    g.fill();
  }
  if (si == 3) {
    g.fillStyle = '#200';
    g.beginPath();
    g.moveTo(250, GY);
    g.lineTo(480, 180);
    g.lineTo(710, GY);
    g.fill();
    g.fillStyle = '#f50';
    g.fillRect(468, 170, 24, 30 + Math.sin(fr * 0.1) * 8);
    g.fillStyle = '#f84';
    for (let i = 0; i < 20; i++) {
      g.fillRect(
        480 + Math.sin(i + fr * 0.02) * 80 + i * 3 - 30,
        190 - ((fr * (1 + (i % 3)) + i * 40) % 160),
        4,
        4
      );
    }
  }
  g.fillStyle = ['#8a5a2b', '#bfe6ff', '#777', '#2a1410'][si];
  g.fillRect(0, GY, W, H - GY);
  g.fillStyle = '#0004';
  g.fillRect(0, GY, W, 6);
  if (si == 3 && sc === 'fight' && cd <= 0) {
    const t = G.t;
    if (t < 90) {
      g.fillStyle = '#f00a';
      g.fillRect(G.x - 45, GY - 4, 90, 8);
    } else if (t < 120) {
      const gh = GY * Math.min(1, (t - 90) / 6);
      g.fillStyle = '#fa3c';
      g.fillRect(G.x - 45, GY - gh, 90, gh);
    }
  }
}

// pose=[lean,aF1,aF2,aB1,aB2,lF1,lF2,lB1,lB2,xoff]
const ID = [0.08, 0.6, 1.7, 0.35, 1.9, 0.45, -0.5, -0.35, 0.4, 0];
const PW = {
    n: [-0.1, -0.3, 2.1, 0.5, 1.9, 0.4, -0.5, -0.3, 0.4, -6],
    f: [-0.25, -0.6, 2.3, 0.6, 1.8, 0.7, -0.6, -0.5, 0.5, -10],
    u: [-0.1, 0.2, 1.5, 0.3, 1.5, 0.5, -0.9, -0.3, 0.9, 0],
    d: [-0.2, 0.4, 1.8, 0.4, 1.8, 1.0, -1.6, -0.5, 0.9, -4],
    an: [0, -0.2, 2.0, 0.5, 1.8, 0.9, -1, 0.3, -0.8, 0],
    af: [0.1, 0.3, 1.5, 0.5, 1.5, 0.9, -1.2, 0.2, -0.9, 0],
  },
  PS = {
    n: [0.2, 1.55, 0.05, 0.3, 1.9, 0.5, -0.5, -0.4, 0.4, 14],
    f: [0.4, 1.6, 0, 0.1, 2.0, 0.9, -0.4, -0.7, 0.2, 26],
    u: [-0.15, 2.9, 0.1, 0.5, 1.7, 0.2, -0.2, -0.2, 0.2, 6],
    d: [0.2, 0.7, 1.5, 0.5, 1.7, 1.5, 0.05, -0.5, -1.2, 18],
    an: [0.2, 1.55, 0.05, 2.0, 0.3, 0.9, -1, 0.2, -1, 10],
    af: [-0.45, 0.9, 1.2, 0.5, 1.5, 1.35, 0.05, 0.2, -1.3, 20],
  };

Object.assign(PW, {
  au: [0, 0.3, 1.2, 0.3, 1.2, 0.7, -1.2, 0.4, -0.9, 0],
  ad: [0.2, 0.5, 1.5, 0.5, 1.5, 0.7, -1.4, 0.3, -1, 0],
  da: [0.5, -0.8, 2.0, 0.8, 1.5, 0.9, -0.8, -0.7, 0.6, -12],
  s: [0, 0.4, 2.0, 0.4, 2.0, 0.5, -0.4, -0.3, 0.3, -8],
  sf: [0.3, -0.9, 2.4, 0.7, 1.6, 1.2, -0.9, -0.7, 0.6, -14],
  su: [0.1, 0.3, 1.6, 0.4, 1.8, 0.6, -0.8, -0.4, 0.7, 0],
});
Object.assign(PS, {
  au: [-0.1, 2.9, 0.1, 2.2, 0.1, 0.3, -0.3, 0.2, -0.3, 4],
  ad: [0.1, 1.0, 1.0, 1.0, 1.0, 0.15, 0, -0.15, 0, 0],
  da: [0.6, 1.7, 0, 0.2, 1.5, 1.0, -0.2, -0.9, 0.4, 28],
  s: [0.15, 1.6, 0, 1.5, 0.1, 0.5, -0.4, -0.3, 0.3, 8],
  sf: [0.7, 1.5, 0.1, 1.4, 0.2, 1.0, -0.2, -0.9, 0.5, 24],
  su: [-0.3, 3.0, 0.1, 0.6, 0.3, 0.9, -1.4, 0, -0.3, 6],
});

const mix = (a, b, t) => {
    t = Math.max(0, Math.min(1, t));
    return a.map((v, i) => v + (b[i] - v) * t);
  },
  ez = (x) => {
    x = Math.max(0, Math.min(1, x));
    return x * x * (3 - 2 * x);
  },
  mo = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

function tgt(p) {
  const air = p.y < GY,
    ps = p.ch.ps,
    IDL = ps.idle; // このキャラの待機姿勢
  if (p.st === 'held') return THROW_MOTIONS[p.hd || 'f'].held;
  if (p.st === 'throw') {
    const T = p.ch.th,
      TM = (T.motion && T.motion[p.td]) || THROW_MOTIONS[p.td],
      RC = THROW_MOTIONS.reach;
    if (p.tg < 0) {
      if (p.t <= T.startup) return mo(IDL, RC, ez(p.t / T.startup));
      if (p.t <= T.startup + T.active) return RC;
      return mo(RC, IDL, ez((p.t - T.startup - T.active) / T.whiff));
    }
    if (p.t < T.release) return mo(RC, TM.hold, ez((p.t - p.tg) / Math.max(1, T.release - p.tg - 6)));
    if (p.t < T.release + 6) return mo(TM.hold, TM.rel, (p.t - T.release) / 6);
    return mo(TM.rel, IDL, ez((p.t - T.release - 6) / Math.max(1, T.total - T.release - 6)));
  }
  if (p.st === 'hit' && p.cr && !air) return ps.crouch; // 受け流し中はしゃがみのまま
  if (p.st === 'hit' && p.hz && p.ch.hm[p.hz]) return p.ch.hm[p.hz];
  if (p.st === 'hit')
    return air && p.vy < -1
      ? [-0.9, 2.4, 0.5, 2, 0.6, 0.8, -0.5, 0.4, -0.6, 0]
      : air && p.vy > 3
      ? [0.6, 2.6, 0.3, 2.4, 0.2, 0.1, -0.1, -0.2, 0.1, 0]
      : [-0.5, -0.4, 0.6, -0.8, 0.9, 0.5, -0.4, -0.4, 0.3, -6];
  if (p.st === 'break') return [0.35, 0.1, 0.4, 0.1, 0.4, 0.5, -0.6, 0.3, -0.5, 0];
  if (p.st === 'atk') {
    const m = p.mv,
      W_ = motionOf(m).w,
      S_ = motionOf(m).s,
      A_ = W_.map((v, i) => (i == 0 ? v - 0.12 : i == 9 ? v * 1.4 - 2 : v)),
      F_ = mix(S_, IDL, 0.35).map((v, i) =>
        i == 0 ? S_[0] * 0.8 + 0.08 : i == 9 ? S_[9] * 0.7 : v
      );
    if (p.t <= m.st) {
      const u = p.t / m.st;
      return u < 0.35 ? mo(IDL, A_, ez(u / 0.35)) : mo(A_, W_, ez((u - 0.35) / 0.65));
    }
    if (p.t <= m.st + m.ac) {
      const u = (p.t - m.st) / m.ac;
      return u < 0.4 ? mo(W_, S_, 1.15) : mo(S_, F_, ((u - 0.4) / 0.6) * 0.5);
    }
    return mo(F_, IDL, ez((p.t - m.st - m.ac) / m.rc * 1.1));
  }
  if (p.st === 'shield' || p.st === 'sdown') {
    const s = ps.guard;
    return p.st === 'sdown' ? mix(s, IDL, p.t / 10) : mix(IDL, s, p.t / 5);
  }
  if (p.st === 'dash')
    return p.bd ? ps.dashB : ps.dashF;
  if (!air && p.dn && p.st === 'idle')
    return ps.crouch;
  if (!air && p.st === 'jsq') return mo(IDL, ps.jumpSquat, ez(p.t / Math.max(1, p.ch.jsq))); // ジャンプ前隙:跳ぶ前にため込む
  if (!air && p.st === 'land') {
    // 着地隙:衝撃を受け止めてから立ち上がる
    const u = p.t / Math.max(1, p.lg || 9);
    return u < 0.4 ? ps.landing : mo(ps.landing, IDL, ez((u - 0.4) / 0.6));
  }
  if (air)
    return p.vy < 0 ? ps.jumpUp : ps.fall;
  if (Math.abs(p.vx) > 0.8) {
    const s = Math.sin(p.x * 0.09),
      q = Math.max(0, s),
      r = Math.max(0, -s);
    const W = ps.walk,
      I = IDL;
    return [W[0], I[1] + s * W[1], I[2], I[3] - s * W[1], I[4], 0.3 + s * W[2], -0.3 - r * W[3], 0.3 - s * W[2], -0.3 - q * W[3], 0];
  }
  return IDL.map((v, i) => (i ? v : v + Math.sin(fr * 0.1) * 0.03));
}

function bar(x, y, w, v, mx, col, r) {
  g.fillStyle = '#000a';
  g.fillRect(x - 2, y - 2, w + 4, 24);
  g.fillStyle = '#444';
  g.fillRect(x, y, w, 20);
  g.fillStyle = col;
  const ww = w * Math.max(0, v / mx);
  g.fillRect(r ? x + w - ww : x, y, ww, 20);
}

function menu(a, y = 190) {
  a.forEach((s, i) =>
    T(
      (i == sel ? '▶ ' : '') + s,
      W / 2,
      y + i * 50,
      i == sel ? 32 : 26,
      i == sel ? '#fd0' : '#ccc'
    )
  );
}

function dark(t) {
  g.fillStyle = '#10142a';
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#fff1';
  for (let i = 0; i < 12; i++) g.fillRect(((i * 90 + fr) % W), 0, 40, H);
  T(t, W / 2, 70, 40, '#fff');
}

function draw() {
  if (sc === 'title') {
    bg(0);
    A = A || F(0, 0, 300, 1);
    const a = F(0, save.sk[0] || 0, 300, 1),
      b = F(2, 0, 660, -1);
    drawF(a);
    drawF(b);
    g.fillStyle = '#0008';
    g.fillRect(0, 100, W, 150);
    T('CANVAS FIGHTERS', W / 2, 190, 72, '#fd0');
    if (fr % 60 < 40) T('PRESS SPACE TO START', W / 2, 340, 32);
    return;
  }
  if (sc === 'main') {
    dark('MENU');
    menu(MN);
    T(
      'コイン: ' + save.coin + '   RP: ' + save.rp + '   ' + save.w + '勝' + save.l + '敗',
      W / 2,
      480,
      22,
      '#9cf'
    );
    T('↑↓ 選択 / Enter 決定 / Esc 戻る', W / 2, 515, 16, '#aaa');
  } else if (sc === 'off') {
    dark('オフライン');
    menu(OF);
  } else if (sc === 'onl') {
    dark('オンライン');
    menu(ON);
    T('※サーバー未接続のためCPUが対戦相手を務めます', W / 2, 500, 16, '#aaa');
  } else if (sc === 'cfg') {
    dark(
      {
        cpu: 'CPU対戦',
        train: 'トレーニング',
        rank: 'ランクルーム',
        casual: 'カジュアルルーム',
        priv: 'プライベートルーム',
      }[opt.mode]
    );
    const tr = opt.mode === 'cpu' || opt.mode === 'train',
      rows = [
        'キャラ: ◀ ' + CH[opt.ch].nm + ' ▶',
        'ステージ: ◀ ' + ST[opt.st].nm + '(' + ST[opt.st].env + ') ▶',
      ];
    if (tr) rows.push('CPUレベル: ◀ ' + (opt.lv || '棒立ち') + ' ▶');
    rows.push('START');
    menu(rows, 180);
    const p = F(opt.ch, save.sk[opt.ch] || 0, W / 2, 1);
    p.y = 470;
    drawF(p);
    if (opt.mode === 'train')
      T('戦闘中: 0-5 でCPUレベル変更 / R リセット', W / 2, 520, 16, '#aaa');
  } else if (sc === 'match') {
    dark(opt.mode === 'priv' ? 'プライベートルーム' : 'マッチング');
    if (opt.mode === 'priv') {
      T('ルームコード: ' + opt.code, W / 2, 220, 44, '#fd0');
      T(
        cd > 120 ? 'ゲストの参加を待っています...' : 'ゲストが参加しました!',
        W / 2,
        300,
        26
      );
    } else T('対戦相手を探しています' + '.'.repeat((fr / 20) % 4 | 0), W / 2, 260, 30);
    T('Esc でキャンセル', W / 2, 480, 18, '#aaa');
  } else if (sc === 'chars') {
    dark('キャラ一覧');
    const c = CH[opt.v],
      p = F(opt.v, opt.vs, 200, 1);
    p.y = 300;
    const ks = SL,
      k = ks[((fr / 70) | 0) % 12];
    p.mv = c.mv[k];
    p.st = 'atk';
    p.t = fr % 70 < 45 ? c.mv[k].st + 1 : 0;
    if (p.t === 0) p.st = 'idle';
    drawF(p);
    T('◀ ' + c.nm + ' ▶', 200, 130, 30, '#fd0');
    T(c.ds, 200, 350, 15, '#ccc');
    T(
      'スキン(↑↓): ' +
        SK[opt.vs].n +
        (own(opt.v, opt.vs)
          ? save.sk[opt.v] == opt.vs
            ? ' [装備中]'
            : ''
          : ' [未所持]'),
      200,
      390,
      18
    );
    T('HP ' + c.hp + '  速度 ' + c.sp + '  ジャンプ ' + (-c.jp), 200, 420, 16, '#9cf');
    T('Enter: 装備', 200, 450, 16, '#aaa');
    T('技一覧', 640, 130, 24, '#fd0');
    T('技名', 470, 160, 14, '#9cf', 'left');
    T('発生 持続 後隙 威力', 930, 160, 14, '#9cf', 'right');
    ks.forEach((q, i) => {
      const m = c.mv[q],
        cc = q === k ? '#fd0' : '#fff';
      T(m.nm, 470, 186 + i * 24, 14, cc, 'left');
      T(m.st + 'F  ' + m.ac + 'F  ' + m.rc + 'F  ' + m.d, 930, 186 + i * 24, 14, cc, 'right');
    });
    T('コンボ例(Z=攻撃 A=必殺)', 480, 468, 15, '#fd0');
    T(c.cb[0], 480, 488, 13, '#fff');
    T(c.cb[1], 480, 506, 13, '#fff');
    T('ジャスガ:シールド発動6〜12Fで受ける→相手硬直・飛び道具反射', 480, 524, 12, '#9cf');
    T(msg, 200, 490, 14, '#fd0');
  } else if (sc === 'shop') {
    dark('ショップ');
    T('所持コイン: ' + save.coin, W / 2, 105, 22, '#fd0');
    const rows = ['コインを購入 +500 (課金・デモ)'];
    CH.forEach((c, ci) => {
      for (let s = 1; s < 4; s++)
        rows.push(
          c.nm +
            ' スキン「' +
            SK[s].n +
            '」 ' +
            (save.own[ci + '_' + s] ? '[所持済]' : SK[s].p + 'コイン')
        );
    });
    const o0 = Math.max(0, Math.min(rows.length - 10, sel - 4));
    rows.slice(o0, o0 + 10).forEach((s, j) => {
      const i = o0 + j;
      T(
        (i == sel ? '▶ ' : '') + s,
        W / 2,
        150 + j * 34,
        i == sel ? 24 : 20,
        i == sel ? '#fd0' : '#ccc'
      );
    });
    T(msg, W / 2, 515, 17, '#9f9');
  } else if (sc === 'fight' || sc === 'result') {
    const S = ST[opt.st];
    g.save();
    if (hs > 0) g.translate((R() - 0.5) * 8, (R() - 0.5) * 8);
    bg(opt.st);
    drawF(B);
    if (opt.mode === 'train' && zv) drawZones(B);
    drawF(A);
    PJ.forEach(drawPJ);
    PT.forEach((q) => {
      g.globalAlpha = q.t / q.l;
      g.fillStyle = q.c;
      g.beginPath();
      g.arc(q.x, q.y, 3 + q.t / 6, 0, 7);
      g.fill();
    });
    g.globalAlpha = 1;
    g.restore();
    [A, B].forEach((p) => {
      if (p.cbT > 0 && p.cbn > 1) T(p.cbn + ' HIT!', p.x, p.y - 175, 28, '#fd0');
    });
    fx.forEach((f) => {
      if (f.jg) {
        g.strokeStyle = '#7df';
        g.lineWidth = 5;
        g.beginPath();
        g.arc(f.x, f.y, (22 - f.t) * 5, 0, 7);
        g.stroke();
        g.strokeStyle = '#fff';
        g.lineWidth = 3;
        for (let k = 0; k < 8; k++) {
          const a = k * 0.785,
            r = (22 - f.t) * 3;
          g.beginPath();
          g.moveTo(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r);
          g.lineTo(
            f.x + Math.cos(a) * (r + 18),
            f.y + Math.sin(a) * (r + 18)
          );
          g.stroke();
        }
        T('JUST GUARD!', f.x, f.y - 50 - (22 - f.t), 20, '#7df');
      } else drawFx(f);
    });
    bar(30, 20, 380, A.hp, A.ch.hp, '#4d4');
    bar(550, 20, 380, B.hp, B.ch.hp, '#e55', 1);
    bar(30, 48, 150, A.sh, A.ch.shm || 60, '#6cf');
    bar(780, 48, 150, B.sh, B.ch.shm || 60, '#6cf', 1);
    T(A.ch.nm + ' ' + Math.ceil(A.hp), 30, 90, 18, '#fff', 'left');
    T(B.ch.nm + ' ' + Math.ceil(B.hp), 930, 90, 18, '#fff', 'right');
    T(S.nm + ' [' + S.env + ']', W / 2, 40, 18, '#fff');
    if (opt.mode === 'train') {
      T('TRAINING  CPU Lv:' + (opt.lv || '停止') + '  H:当たり部位表示', W / 2, 70, 16, '#fd0');
    }
    T(
      '←→移動(←←/→→ダッシュ) ↓しゃがみ ↑↓+Z攻撃 A必殺 G投げ(+方向) X防御 Space跳躍(2段可)',
      W / 2,
      H - 10,
      13,
      '#fff9'
    );
    if (ko > 0 && sc === 'fight') T('K.O.!', W / 2, 250, 100, '#f55');
    if (cd > 0 && sc === 'fight') T(cd > 30 ? 'READY' : 'FIGHT!', W / 2, 240, 64, '#fd0');
    if (sc === 'result') {
      g.fillStyle = '#000a';
      g.fillRect(0, 0, W, H);
      T(res, W / 2, 260, 44, '#fd0');
      T('Enter で戻る', W / 2, 330, 20);
    }
  }
}

let last = 0,
  acc = 0;
function loop(t) {
  acc += Math.min(100, t - last);
  last = t;
  while (acc >= 16.67) {
    upd();
    pr = {};
    acc -= 16.67;
  }
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame((t) => {
  last = t;
  loop(t);
});