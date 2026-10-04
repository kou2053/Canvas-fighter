// Character rendering helpers and drawF. Requires game globals from script.js.
function limb(x, y, a, b, l1, l2, w, c1, c2) {
  const kx = x + l1 * Math.sin(a),
    ky = y + l1 * Math.cos(a),
    ex = kx + l2 * Math.sin(a + b),
    ey = ky + l2 * Math.cos(a + b);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (const k of [0, 1]) {
    g.lineWidth = k ? w : w + 5;
    g.strokeStyle = k ? c1 : '#111';
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(kx, ky);
    g.stroke();
    g.strokeStyle = k ? c2 : '#111';
    g.beginPath();
    g.moveTo(kx, ky);
    g.lineTo(ex, ey);
    g.stroke();
  }
  g.strokeStyle = 'rgba(255,255,255,.28)';
  g.lineWidth = Math.max(1, w * 0.12);
  g.beginPath();
  g.moveTo(x - w * 0.2, y);
  g.lineTo(kx - w * 0.2, ky);
  g.moveTo(kx - w * 0.2, ky);
  g.lineTo(ex - w * 0.2, ey);
  g.stroke();
  g.fillStyle = c1;
  g.beginPath();
  g.arc(kx, ky, Math.max(2, w * 0.28), 0, 7);
  g.fill();
  g.lineWidth = 1.5;
  g.strokeStyle = '#111';
  g.stroke();
  return [ex, ey];
}

function fighterHitParts(p) {
  const ci = CH.indexOf(p.ch),
    Y = SY[ci],
    q = p.pose || tgt(p),
    scale = Y.sc,
    hw = Math.max(9, Y.bw * 0.6),
    ls = Math.sin(q[0]),
    lc = Math.cos(q[0]),
    dr = (a, b) => Y.ul * Math.cos(a) + Y.ll * Math.cos(a + b),
    hy = p.y < GY
      ? (Y.ul + Y.ll) * 0.85
      : Math.max(dr(q[5], q[6]), dr(q[7], q[8])),
    hyy = -(p.hy ?? hy),
    at = (t) => [Y.tl * t * ls, hyy - Y.tl * t * lc],
    [sx, sy] = at(0.9),
    [nx, ny] = at(1),
    hr = Y.hr,
    hdx = nx + (hr + 2) * ls,
    hdy = ny - (hr + 2) * lc,
    world = ([x, y]) => ({ x: p.x + p.f * scale * (q[9] + x), y: p.y + scale * y }),
    parts = [{ zone: 'head', kind: 'circle', ...world([hdx, hdy]), r: hr * scale }];

  const addLimb = (zone, ox, oy, a, b, l1, l2, width) => {
    const k = [ox + l1 * Math.sin(a), oy + l1 * Math.cos(a)],
      e = [k[0] + l2 * Math.sin(a + b), k[1] + l2 * Math.cos(a + b)];
    parts.push({ zone, kind: 'segment', a: world([ox, oy]), b: world(k), r: width * scale * 0.52 });
    parts.push({ zone, kind: 'segment', a: world(k), b: world(e), r: width * scale * 0.52 });
    return e;
  };

  const shN = [sx - lc * hw * 0.3, sy - ls * hw * 0.3],
    shF = [sx + lc * hw * 0.35, sy + ls * hw * 0.35];
  addLimb('arms', ...shF, q[3], q[4], Y.ua, Y.la, Y.lw);
  addLimb('arms', ...shN, q[1], q[2], Y.ua, Y.la, Y.lw);
  addLimb('feet', hw * 0.28, hyy, q[7], q[8], Y.ul, Y.ll, Y.lw + 2);
  const frontFoot = addLimb('feet', -hw * 0.28, hyy, q[5], q[6], Y.ul, Y.ll, Y.lw + 2);

  parts.push({ zone: 'feet', kind: 'circle', ...world([frontFoot[0] + 5, frontFoot[1] + 2]), r: (Y.lw * 0.65 + 3) * scale });
  parts.push({ zone: 'torso', kind: 'segment', a: world(at(0.12)), b: world(at(0.92)), r: hw * 0.76 * scale });
  return parts;
}

function hitPartForRect(p, rect) {
  const pointRectDistance = (x, y) => Math.hypot(
      Math.max(rect.x - x, 0, x - (rect.x + rect.w)),
      Math.max(rect.y - y, 0, y - (rect.y + rect.h))
    ),
    pointSegmentDistance = (x, y, a, b) => {
      const dx = b.x - a.x, dy = b.y - a.y,
        u = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1)));
      return Math.hypot(x - (a.x + u * dx), y - (a.y + u * dy));
    },
    segmentRectDistance = (a, b) => {
      let t0 = 0, t1 = 1, miss = false;
      const dx = b.x - a.x, dy = b.y - a.y,
        checks = [[-dx, a.x - rect.x], [dx, rect.x + rect.w - a.x], [-dy, a.y - rect.y], [dy, rect.y + rect.h - a.y]];
      for (const [divisor, distance] of checks) {
        if (!divisor) {
          if (distance < 0) { miss = true; break; }
          continue;
        }
        const t = distance / divisor;
        if (divisor < 0) t0 = Math.max(t0, t);
        else t1 = Math.min(t1, t);
        if (t0 > t1) break;
      }
      if (!miss && t0 <= t1) return 0;
      const corners = [[rect.x, rect.y], [rect.x + rect.w, rect.y], [rect.x, rect.y + rect.h], [rect.x + rect.w, rect.y + rect.h]];
      return Math.min(
        pointRectDistance(a.x, a.y),
        pointRectDistance(b.x, b.y),
        ...corners.map(([x, y]) => pointSegmentDistance(x, y, a, b))
      );
    };

  for (const part of fighterHitParts(p)) {
    const distance = part.kind === 'circle'
      ? pointRectDistance(part.x, part.y)
      : segmentRectDistance(part.a, part.b);
    if (distance <= part.r) {
      return { zone: part.zone, y: part.kind === 'circle' ? part.y : (part.a.y + part.b.y) / 2 };
    }
  }
  return null;
}

function drawHitVolumes(p) {
  g.save();
  g.globalAlpha = 0.28;
  for (const part of fighterHitParts(p)) {
    g.fillStyle = g.strokeStyle = zoneInfo(p, part.zone).color;
    if (part.kind === 'circle') {
      g.beginPath();
      g.arc(part.x, part.y, part.r, 0, 7);
      g.fill();
    } else {
      g.lineCap = 'round';
      g.lineWidth = part.r * 2;
      g.beginPath();
      g.moveTo(part.a.x, part.a.y);
      g.lineTo(part.b.x, part.b.y);
      g.stroke();
    }
  }
  g.restore();
}

// 色を明るく(a>0)/暗く(a<0)する。a は -1〜1
function shade(c, a) {
  if (typeof c !== 'string' || c[0] !== '#') return c;
  let h = c.slice(1);
  if (h.length === 3) h = h.replace(/./g, '$&$&');
  const n = parseInt(h, 16),
        t = a < 0 ? 0 : 255,
        k = Math.abs(a);
  return 'rgb(' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (t - v) * k)) + ')';
}

function drawF(p) {
  const ci = CH.indexOf(p.ch),
    name = p.ch.nm,
    is = (characterName) => name === characterName,
    Y = SY[ci],
    main = SK[p.sk].c || p.ch.col,
    fl = p.st === 'hit' && fr % 4 < 2,
    C = (c) => (fl ? '#fff' : c),
    skin = C(SKN[ci]);

  p.pose = p.pose
    ? mix(
        p.pose,
        tgt(p),
        p.st === 'atk' ? (p.ch.sm.atk ?? 0.55) : p.st === 'jsq' || p.st === 'land' ? 0.55 : (p.ch.sm.move ?? 0.3)
      )
    : tgt(p);

  const q = p.pose,
    m = p.mv,
    air = p.y < GY,
    act = p.st === 'atk' && p.t > m.st && p.t <= m.st + m.ac;

  const dr = (a, b) => Y.ul * Math.cos(a) + Y.ll * Math.cos(a + b),
    hy = air
      ? (Y.ul + Y.ll) * 0.85
      : Math.max(dr(q[5], q[6]), dr(q[7], q[8]));

  p.hy = p.hy == null ? hy : p.hy + (hy - p.hy) * 0.4;
  let weight = 0;
  if (p.st === 'land') weight = 0.1 * Math.max(0, 1 - p.t / Math.max(1, p.lg));
  else if (p.st === 'jsq') weight = 0.055 * p.t / Math.max(1, p.ch.jsq);
  else if (p.st === 'hit') weight = air ? 0.025 : 0.075 * Math.max(0, 1 - p.t / 16);
  else if (p.st === 'dash') weight = 0.035;
  else if (p.st === 'atk' && m) {
    weight = 0.035 * Math.max(0, 1 - p.t / Math.max(1, m.st));
    if (p.t >= m.st && p.t <= m.st + m.ac)
      weight += 0.035 * Math.sin(Math.PI * (p.t - m.st) / Math.max(1, m.ac));
  }
  const size = 1.07,
    scaleX = size * (1 + weight * 0.45),
    scaleY = size * (1 - weight);

  // 影の描画
  g.fillStyle = '#0005';
  g.beginPath();
  g.ellipse(
    p.x,
    GY + 2,
    Math.max(8, 28 * Y.sc * size * (1 - (GY - p.y) / 400)),
    6,
    0,
    0,
    7
  );
  g.fill();

  g.save();
  g.translate(p.x, p.y);
  g.scale(p.f * Y.sc * scaleX, Y.sc * scaleY);
  g.translate(q[9], 0);

  const hyy = -p.hy,
    ls = Math.sin(q[0]),
    lc = Math.cos(q[0]),
    at = (t) => [Y.tl * t * ls, hyy - Y.tl * t * lc],
    [sx, sy] = at(0.9),
    [nx, ny] = at(1),
    hr = Y.hr,
    hdx = nx + (hr + 2) * ls,
    hdy = ny - (hr + 2) * lc,
    pn = C(Y.pn),
    sl = C(Y.sl ? main : skin),
    f2 = C(Y.f2),
    wv = Math.sin(fr * 0.25) * 3,
    tr = -p.vx * p.f * 2;

  // キャラ固有の描画は、下の胴体・背面・頭・装備の各ブロックへ追加します。
  // 分岐は配列番号ではなくキャラ名で指定するため、CHARACTERS の順番を変えても崩れません。
  // ================= 見た目(3/4ビュー:少し手前を向く) =================
  const hw = Math.max(9, Y.bw * 0.6),
    P = (t, o = 0) => [Y.tl * t * ls + lc * o, hyy - Y.tl * t * lc + ls * o], // 背骨上の点t + 前方向オフセットo
    K = (c, a) => (fl ? '#fff' : shade(c, a)),
    LG = (x0, y0, x1, y1, ...cs) => {
      if (fl) return '#fff';
      const r = g.createLinearGradient(x0, y0, x1, y1);
      cs.forEach((c, i) => r.addColorStop(i / (cs.length - 1), c));
      return r;
    },
    RG = (x, y, r0, r1, ...cs) => {
      if (fl) return '#fff';
      const r = g.createRadialGradient(x, y, r0, x, y, r1);
      cs.forEach((c, i) => r.addColorStop(i / (cs.length - 1), c));
      return r;
    },
    ol = (w) => {
      g.lineWidth = w || 3;
      g.lineJoin = 'round';
      g.strokeStyle = '#111';
      g.stroke();
    },
    poly = (a) => {
      g.beginPath();
      a.forEach((v, i) => (i ? g.lineTo(v[0], v[1]) : g.moveTo(v[0], v[1])));
      g.closePath();
    },
    line = (a, b, w, c) => {
      g.lineWidth = w;
      g.strokeStyle = c;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(a[0], a[1]);
      g.lineTo(b[0], b[1]);
      g.stroke();
    },
    dot = (x, y, r, c) => {
      g.fillStyle = c;
      g.beginPath();
      g.arc(x, y, r, 0, 7);
      g.fill();
    },
    shN = [sx - lc * hw * 0.3, sy - ls * hw * 0.3], // 手前側の肩(少し後ろへ)
    shF = [sx + lc * hw * 0.35, sy + ls * hw * 0.35], // 奥側の肩(少し前へ)
    slB = Y.sl ? main : SKN[ci],
    BND = { 0: '#e33', 1: '#a8842c', 2: '#c33', 4: '#6a4a24', 7: '#3a3a3a', 8: '#e4a', 9: '#fff' }[ci],
    BOOTS = is('ガルド') || is('シノ') || is('ブレイド') || is('バーサク') || is('トリック'),
    open = p.st === 'atk' || p.st === 'hit' || p.st === 'break',
    hurt = p.st === 'hit' || p.st === 'break';

  const hand = (e, r, c) => {
    g.fillStyle = RG(e[0] - r * 0.3, e[1] - r * 0.35, 1, r * 1.4, K(c, 0.4), K(c, 0), K(c, -0.35));
    g.beginPath();
    if (is('ゴーレム')) g.rect(e[0] - r, e[1] - r, 2 * r, 1.8 * r);
    else g.arc(e[0], e[1], r, 0, 7);
    g.fill();
    ol(2);
    if (is('ライキ') || is('バーサク') || is('ガルド')) { // 拳の指関節
      g.strokeStyle = '#0004';
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(e[0] + r * 0.2, e[1], r * 0.55, -1.2, 1.2);
      g.stroke();
    }
  };

  const arm = (a, b, o, far, wp) => {
    const sc_ = far ? K(slB, -0.22) : sl,
      fc = far ? K(Y.f2, -0.22) : f2,
      kx = o[0] + Y.ua * Math.sin(a),
      ky = o[1] + Y.ua * Math.cos(a),
      e = limb(o[0], o[1], a, b, Y.ua, Y.la, Y.lw, sc_, fc),
      dx = e[0] - kx,
      dy = e[1] - ky,
      l = Math.hypot(dx, dy) || 1,
      ux = dx / l,
      uy = dy / l;

    if (BND) { // 手首のバンド/袖口
      const m1 = [e[0] - ux * Y.la * 0.42, e[1] - uy * Y.la * 0.42],
            m2 = [e[0] - ux * Y.la * 0.2, e[1] - uy * Y.la * 0.2];
      g.lineCap = 'butt';
      line(m1, m2, Y.lw + 1, far ? K(BND, -0.22) : K(BND, 0));
      g.lineCap = 'round';
      if (is('バーサク')) { // スパイク付きブレーサー
        const cx = (m1[0] + m2[0]) / 2,
              cy = (m1[1] + m2[1]) / 2;
        g.fillStyle = K('#ddd', 0);
        for (const s of [-1, 1]) {
          g.beginPath();
          g.moveTo(cx + -uy * s * Y.lw * 0.5 - ux * 3, cy + ux * s * Y.lw * 0.5 - uy * 3);
          g.lineTo(cx + -uy * s * (Y.lw * 0.5 + 8), cy + ux * s * (Y.lw * 0.5 + 8));
          g.lineTo(cx + -uy * s * Y.lw * 0.5 + ux * 3, cy + ux * s * Y.lw * 0.5 + uy * 3);
          g.fill();
          ol(1.5);
        }
      }
    }
    if (wp) wp(e, ux, uy);
    hand(e, Y.hr2, far ? K(Y.hd, -0.22) : C(Y.hd));
    return e;
  };

  const leg = (x, a, b, far) => {
    const kx = x + Y.ul * Math.sin(a),
          ky = hyy + Y.ul * Math.cos(a),
          pc = far ? K(Y.pn, -0.22) : pn,
          sc_ = far ? K(Y.so, -0.2) : C(Y.so),
          e = limb(x, hyy, a, b, Y.ul, Y.ll, Y.lw + 2, pc, pc);

    if (BOOTS) {
      line([kx + (e[0] - kx) * 0.5, ky + (e[1] - ky) * 0.5], e, Y.lw + 2, sc_); // ブーツ
    }
    if (is('ゴーレム')) {
      g.fillStyle = '#0003';
      g.fillRect(e[0] - 6, e[1] - 12, 12, 3); // 岩のひび
    }

    const h = Y.lw * 0.8 + 2,
          bt = e[1] + Y.lw * 0.5 + 3.5;
    g.fillStyle = sc_;
    g.beginPath();
    g.moveTo(e[0] - 6, bt - h);
    g.lineTo(e[0] + 4, bt - h);
    g.quadraticCurveTo(e[0] + 13, bt - h * 0.7, e[0] + 16, bt - 2);
    g.lineTo(e[0] + 16, bt);
    g.lineTo(e[0] - 6, bt);
    g.closePath();
    g.fill();
    ol(2);
    line([e[0] - 5, bt - 1], [e[0] + 15, bt - 1], 2.2, '#ccc');
    return e;
  };

  // ---- 奥の腕・奥の脚 ----
  arm(q[3], q[4], shF, true);
  leg(hw * 0.28, q[7], q[8], true);

  // ---- 背中側の装飾 ----
  if (is('フェザー')) { // 羽
    for (const [dk, k] of [[-0.18, 0], [0, 12]]) {
      const base = [-6, sy + 10],
            fl2 = Math.sin(fr * 0.35) * 0.35;
      for (let i = 0; i < 5; i++) {
        const ang = -2.55 + i * 0.3 + fl2 * (1 - i * 0.12) + k * 0.004,
              L = 58 - i * 4 + k * 0.5;
        g.save();
        g.translate(base[0] - k * 0.3, base[1]);
        g.rotate(ang);
        g.fillStyle = LG(0, 0, L, 0, K('#dde6ff', dk), K('#fff', dk));
        g.beginPath();
        g.ellipse(L / 2, 0, L / 2, 7.5, 0, 0, 7);
        g.fill();
        ol(1.8);
        g.restore();
      }
    }
  }
  if (is('ブレイド')) { // 腰の鞘
    line(P(0.08, -hw * 0.7), [-32, hyy + 22], 6, '#111');
    line(P(0.08, -hw * 0.7), [-32, hyy + 22], 3.5, K('#4a2c14', 0));
    line([-30, hyy + 20], [-34, hyy + 25], 4, K('#c93', 0));
  }

  // ---- 胴体 ----
  const TW = [[0, 0.85], [0.25, 0.75], [0.6, 1], [0.93, 1.06], [1.02, 0.6]],
        tc = is('バーサク') ? SKN[ci] : main;

  poly(TW.map(([t, w]) => P(t, hw * w)).concat(TW.map(([t, w]) => P(t, -hw * w * 0.82)).reverse()));
  {
    const a = P(0.5, -hw * 0.8),
          b = P(0.5, hw);
    g.fillStyle = LG(a[0], a[1], b[0], b[1], K(tc, -0.4), K(tc, -0.05), K(tc, 0.18));
    g.fill();
    ol(3);
  }
  line(P(0.1, hw * 0.3), P(0.95, hw * 0.3), 2, K(tc, -0.42)); // 胸の正中線(手前にずれている=少し正面向き)

  switch (name) {
    case 'ライキ':
      line(P(0.1, hw * 0.8), P(0.9, hw * 0.98), 3.5, C('#fff'));
      line(P(0.95, -hw * 0.4), P(0.7, hw * 0.1), 3, C('#fff'));
      break;
    case 'ガルド': { // 胸当て
      poly([P(0.3, hw * 0.95), P(0.93, hw * 1.0), P(0.9, -hw * 0.75), P(0.3, -hw * 0.7)]);
      const a = P(0.6, -hw * 0.7),
            b = P(0.6, hw);
      g.fillStyle = LG(a[0], a[1], b[0], b[1], K('#6a7388', 0), K('#aab4c8', 0), K('#d8deea', 0));
      g.fill();
      ol(2.5);
      for (const t of [0.4, 0.82]) dot(...P(t, hw * 0.55), 1.8, C('#fc3'));
      line(P(0.35, hw * 0.3), P(0.9, hw * 0.3), 2, K('#556', 0));
      break;
    }
    case 'シノ':
      line(P(0.96, -hw * 0.1), P(0.62, hw * 0.35), 2.8, K('#0a2a14', 0));
      line(P(0.96, hw * 0.75), P(0.62, hw * 0.35), 2.8, K('#0a2a14', 0));
      break;
    case 'メイガ':
      line(P(0.96, hw * 0.0), P(0.7, hw * 0.35), 3, C('#fc3'));
      line(P(0.96, hw * 0.7), P(0.7, hw * 0.35), 3, C('#fc3'));
      dot(...P(0.7, hw * 0.35), 3.5, C('#6df'));
      break;
    case 'ブレイド':
      line(P(0.96, -hw * 0.55), P(0.18, hw * 0.8), 6, '#111');
      line(P(0.96, -hw * 0.55), P(0.18, hw * 0.8), 3.5, K('#c93', 0));
      line(P(0.1, hw * 0.98), P(0.93, hw * 1.04), 2, K('#c93', 0));
      break;
    case 'ゴーレム': { // 岩の継ぎ目と発光コア
      for (const t of [0.3, 0.62]) line(P(t, -hw * 0.8), P(t, hw * 0.95), 2, '#0005');
      line(P(0.62, hw * 0.2), P(0.8, hw * 0.7), 2, '#0005');
      const c = P(0.64, hw * 0.35);
      g.fillStyle = RG(c[0], c[1], 1, 15, '#fff6c0', '#ffa030', 'rgba(255,100,20,0)');
      g.beginPath();
      g.arc(c[0], c[1], 15, 0, 7);
      g.fill();
      dot(c[0], c[1], 4, C('#fff3a0'));
      break;
    }
    case 'フェザー':
      for (let i = 0; i < 4; i++) {
        const c = P(0.9, -hw * 0.5 + i * hw * 0.42);
        g.fillStyle = C('#fff');
        g.beginPath();
        g.arc(c[0], c[1], 5.5, 0.2, 3.3);
        g.fill();
        ol(1.5);
      }
      break;
    case 'バーサク': // たすき掛けの革帯+傷
      line(P(0.96, -hw * 0.7), P(0.12, hw * 0.9), 7, '#111');
      line(P(0.96, -hw * 0.7), P(0.12, hw * 0.9), 4.5, K('#5a3a1a', 0));
      line(P(0.8, hw * 0.1), P(0.55, hw * 0.6), 2, 'rgba(140,30,30,.85)');
      line(P(0.72, hw * 0.0), P(0.5, hw * 0.45), 2, 'rgba(140,30,30,.85)');
      break;
    case 'トリック':
      for (const t of [0.55, 0.3]) {
        const c = P(t, hw * 0.3);
        g.fillStyle = K('#7ee', 0);
        poly([[c[0], c[1] - 6], [c[0] + 5, c[1]], [c[0], c[1] + 6], [c[0] - 5, c[1]]]);
        g.fill();
        ol(1.5);
      }
      break;
    case 'モンク':
      line(P(0.96, -hw * 0.1), P(0.6, hw * 0.4), 3, C('#fff'));
      line(P(0.96, hw * 0.75), P(0.6, hw * 0.4), 3, C('#fff'));
      break;
  }

  // 腰まわり(ベルト+バックル)
  poly([P(-0.02, hw * 0.88), P(0.17, hw * 0.8), P(0.17, -hw * 0.7), P(-0.02, -hw * 0.75)]);
  g.fillStyle = K(Y.sh, 0);
  g.fill();
  ol(2.2);

  {
    const b = P(0.08, hw * 0.55);
    g.fillStyle = C(is('バーサク') || is('ブレイド') ? '#ddc060' : '#fc3');
    g.fillRect(b[0] - 4, b[1] - 5, 8, 10);
    g.strokeStyle = '#111';
    g.lineWidth = 1.6;
    g.strokeRect(b[0] - 4, b[1] - 5, 8, 10);
  }

  if (is('シノ') || is('モンク')) { // 帯の結び目
    const b = P(0.05, -hw * 0.6);
    line(b, [b[0] - 14 + tr * 0.5, b[1] + 16 + wv], 4, K(Y.sh, 0));
    line(b, [b[0] - 8 + tr * 0.5, b[1] + 22 - wv], 4, K(Y.sh, -0.15));
  }
  if (is('メイガ')) { // ローブの裾
    const hf = P(0.12, hw * 0.9),
          hb = P(0.12, -hw * 0.8),
          hm = hyy + Y.ul * 0.85;
    poly([hf, [hf[0] + 13 + wv * 0.4, hm], [hb[0] - 12 + wv, hm], hb]);
    g.fillStyle = LG(hb[0], 0, hf[0] + 13, 0, K(main, -0.35), K(main, 0), K(main, 0.12));
    g.fill();
    ol(2.5);
    line([hb[0] - 11 + wv, hm - 2], [hf[0] + 12 + wv * 0.4, hm - 2], 3, C('#fc3'));
  }

  // ---- 手前の脚 ----
  const fe = leg(-hw * 0.28, q[5], q[6], false);

  // ---- 首まわり ----
  line(at(0.95), [hdx, hdy + hr * 0.5], hr * 0.8 + 3, '#111');
  line(at(0.95), [hdx, hdy + hr * 0.5], hr * 0.8, is('ゴーレム') ? K('#778', 0) : K(SKN[ci], -0.12));

  if (is('シノ')) { // マフラー
    line([nx - 2, ny + 2], [nx - 22 + tr, ny + wv + 6], 8, '#111');
    line([nx - 3, ny + 2], [nx - 46 + tr * 1.5, ny + 8 + wv * 2], 6, C('#e33'));
    line([nx - 3, ny + 5], [nx - 34 + tr * 1.5, ny + 16 - wv * 2], 4.5, C('#c22'));
    line([nx - 6, ny + 2], [nx + 8, ny + 6], 8, C('#e33'));
  }
  if (is('トリック')) { // フリルの襟とリボン
    for (let i = 0; i < 5; i++) dot(nx - 8 + i * 5, ny + 4 + Math.abs(i - 2) * -1, 5.5, C('#f8e'));
    g.fillStyle = C('#f4a');
    poly([[nx + 3, ny + 9], [nx + 14, ny + 4], [nx + 14, ny + 14]]);
    g.fill();
    ol(1.5);
    poly([[nx + 3, ny + 9], [nx - 8, ny + 4], [nx - 8, ny + 14]]);
    g.fill();
    ol(1.5);
    dot(nx + 3, ny + 9, 2.5, C('#c28'));
  }
  if (is('モンク')) { // 数珠
    const A = P(0.98, -hw * 0.55),
          Cc = P(0.4, hw * 0.55),
          D = P(0.78, hw * 0.75);
    for (let i = 0; i < 8; i++) {
      const t = i / 7,
            u = 1 - t,
            x = u * u * A[0] + 2 * u * t * Cc[0] + t * t * D[0],
            y = u * u * A[1] + 2 * u * t * Cc[1] + t * t * D[1],
            r = i == 4 ? 4.2 : 3.2;
      dot(x, y, r + 1, '#111');
      dot(x, y, r, K('#7a4420', 0));
      dot(x - 1, y - 1, 1, '#ffd9a8');
    }
  }
  if (is('バーサク')) { // 毛皮の肩当て
    for (let i = 0; i < 4; i++) {
      const c = at(0.88);
      g.fillStyle = K('#6a4a30', i % 2 ? 0 : -0.15);
      g.beginPath();
      g.arc(c[0] - 14 + i * 7, c[1] - 1 + (i % 2) * 3, 7, 0, 7);
      g.fill();
      ol(1.5);
    }
  }

  // ---- 頭 ----
  const Rh = hr,
        hcx = hdx,
        hcy = hdy;

  const cap = (c, a1, d) => {
    g.fillStyle = c;
    g.beginPath();
    g.arc(hcx, hcy, Rh + 1.5, Math.PI * 0.98, Math.PI * a1);
    g.quadraticCurveTo(hcx + Rh * 0.55, hcy - Rh * (0.5 + d), hcx + Rh * 0.05, hcy - Rh * (0.35 + d));
    g.quadraticCurveTo(hcx - Rh * 0.6, hcy - Rh * 0.3, hcx - Rh - 1.5, hcy + Rh * 0.1);
    g.closePath();
    g.fill();
    ol(2.5);
  };

  const spikes = (c, n, a0, a1, L0, L1) => {
    g.fillStyle = c;
    for (let i = 0; i < n; i++) {
      const an = a0 + ((a1 - a0) * i) / (n - 1),
            L = (i % 2 ? L0 : L1) + (i < 2 ? wv * 0.08 : 0);
      g.beginPath();
      g.moveTo(hcx + Math.cos(an - 0.26) * Rh * 0.9, hcy + Math.sin(an - 0.26) * Rh * 0.9);
      g.lineTo(hcx + Math.cos(an) * Rh * L + tr * 0.1, hcy + Math.sin(an) * Rh * L);
      g.lineTo(hcx + Math.cos(an + 0.26) * Rh * 0.9, hcy + Math.sin(an + 0.26) * Rh * 0.9);
      g.closePath();
      g.fill();
      ol(2.2);
    }
  };

  const horn = (x, y, s) => {
    g.fillStyle = LG(x, y, x + 12 * s, y - 24, K('#bbb', 0), K('#fff', 0));
    g.beginPath();
    g.moveTo(x - 5, y);
    g.quadraticCurveTo(x - 8 * s, y - 16, x + 8 * s, y - 26);
    g.quadraticCurveTo(x + 2 * s, y - 12, x + 5, y);
    g.closePath();
    g.fill();
    ol(2);
  };

  // 後ろ髪・後ろの装飾
  switch (name) {
    case 'ライキ':
      spikes(C('#1c1c24'), 6, -Math.PI * 0.98, -Math.PI * 0.25, 1.45, 1.75);
      break;
    case 'メイガ': { // 長い髪
      g.fillStyle = K('#cdb8ff', 0);
      g.beginPath();
      g.moveTo(hcx - Rh * 0.3, hcy - Rh * 0.8);
      g.quadraticCurveTo(hcx - Rh * 1.6 + wv * 0.4, hcy, hcx - Rh * 1.2 + wv, hcy + Rh * 2.1);
      g.quadraticCurveTo(hcx - Rh * 0.4, hcy + Rh * 1.3, hcx + Rh * 0.2, hcy + Rh * 0.6);
      g.closePath();
      g.fill();
      ol(2.5);
      break;
    }
    case 'ブレイド': { // ポニーテール
      g.fillStyle = K('#4a2c14', 0);
      g.beginPath();
      g.moveTo(hcx - Rh * 0.7, hcy - Rh * 0.5);
      g.quadraticCurveTo(hcx - Rh * 1.8 + tr * 0.5, hcy - Rh * 0.3 + wv, hcx - Rh * 2.1 + tr * 1.2, hcy + Rh * 1.4 + wv * 1.5);
      g.quadraticCurveTo(hcx - Rh * 1.0, hcy + Rh * 0.5, hcx - Rh * 0.4, hcy + Rh * 0.2);
      g.closePath();
      g.fill();
      ol(2.5);
      break;
    }
    case 'フェザー':
      for (let i = 0; i < 3; i++) { // 羽冠
        g.save();
        g.translate(hcx - Rh * 0.3, hcy - Rh * 0.8);
        g.rotate(-2.3 + i * 0.4 + wv * 0.02);
        g.fillStyle = K(['#fd5', '#fff', '#fb3'][i], 0);
        g.beginPath();
        g.ellipse(Rh * 1.0, 0, Rh * 1.1, 4.5, 0, 0, 7);
        g.fill();
        ol(1.8);
        g.restore();
      }
      break;
    case 'バーサク':
      spikes(C('#7a2418'), 7, -Math.PI * 1.0, -Math.PI * 0.12, 1.5, 1.95);
      horn(hcx - Rh * 0.1, hcy - Rh * 0.8, -1);
      break;
    case 'トリック': // 道化帽の垂れ
      for (const [c, x, y] of [['#e4a', -Rh - 18, -Rh - 14 + wv], ['#4af', Rh * 0.4 + 10, -Rh - 22 - wv]]) {
        g.fillStyle = K(c, 0);
        g.beginPath();
        g.moveTo(hcx, hcy - Rh * 0.6);
        g.quadraticCurveTo(hcx + x * 0.5, hcy + y - 10, hcx + x, hcy + y);
        g.quadraticCurveTo(hcx + x * 0.4, hcy - Rh * 0.2, hcx + Rh * 0.5, hcy - Rh * 0.2);
        g.closePath();
        g.fill();
        ol(2.2);
        dot(hcx + x, hcy + y, 4.5, '#111');
        dot(hcx + x, hcy + y, 3.3, C('#ff0'));
      }
      break;
  }

  // 頭本体
  if (is('ゴーレム')) { // 岩の頭
    g.beginPath();
    g.moveTo(hcx - Rh, hcy - Rh * 0.8);
    g.lineTo(hcx + Rh * 0.9, hcy - Rh);
    g.lineTo(hcx + Rh * 1.1, hcy + Rh * 0.7);
    g.lineTo(hcx + Rh * 0.3, hcy + Rh * 1.05);
    g.lineTo(hcx - Rh * 0.9, hcy + Rh * 0.8);
    g.closePath();
    g.fillStyle = LG(hcx - Rh, hcy - Rh, hcx + Rh, hcy + Rh, K('#aab', 0.15), K('#8a8f9c', 0), K('#5a5f6c', 0));
    g.fill();
    ol(3);
    line([hcx - Rh * 0.2, hcy - Rh * 0.9], [hcx + Rh * 0.1, hcy - Rh * 0.3], 2, '#0005');
    line([hcx + Rh * 0.1, hcy - Rh * 0.3], [hcx - Rh * 0.2, hcy + Rh * 0.1], 2, '#0005');
    line([hcx - Rh * 0.2, hcy - Rh * 0.2], [hcx + Rh * 1.05, hcy - Rh * 0.2], 5, '#111'); // 眉の岩棚
    
    const e = [hcx + Rh * 0.12, hcx + Rh * 0.68];
    for (const x of e) {
      g.fillStyle = RG(x, hcy + 1, 1, 6, '#fff6c0', '#ff9020', 'rgba(255,90,0,0)');
      g.beginPath();
      g.arc(x, hcy + 1, 6, 0, 7);
      g.fill();
      dot(x, hcy + 1, hurt ? 1.2 : 2.4, C('#fff3a0'));
    }
    line([hcx + Rh * 0.3, hcy + Rh * 0.6], [hcx + Rh * 0.85, hcy + Rh * 0.6], 2.5, '#222');
  } else {
    g.fillStyle = RG(hcx + Rh * 0.3, hcy - Rh * 0.35, 1, Rh * 1.4, K(SKN[ci], 0.3), C(SKN[ci]), K(SKN[ci], -0.28));
    g.beginPath();
    g.arc(hcx, hcy, Rh, 0, 7);
    g.fill();
    ol(3);

    // 耳
    if (ci != 2 && ci != 9) {
      g.fillStyle = K(SKN[ci], -0.1);
      g.beginPath();
      g.ellipse(hcx - Rh * 0.28, hcy + Rh * 0.12, Rh * 0.16, Rh * 0.24, 0, 0, 7);
      g.fill();
      ol(1.8);
    }
    if (is('モンク')) {
      g.fillStyle = K(SKN[ci], -0.1);
      g.beginPath();
      g.ellipse(hcx - Rh * 0.28, hcy + Rh * 0.25, Rh * 0.15, Rh * 0.36, 0, 0, 7);
      g.fill();
      ol(1.8);
    }

    // 鼻
    g.fillStyle = K(SKN[ci], 0.05);
    g.beginPath();
    g.moveTo(hcx + Rh * 0.9, hcy - Rh * 0.02);
    g.lineTo(hcx + Rh * 1.14, hcy + Rh * 0.3);
    g.lineTo(hcx + Rh * 0.84, hcy + Rh * 0.34);
    g.closePath();
    g.fill();
    ol(1.8);

    // 目(両目が見える=少し正面寄り)
    const ey = hcy - Rh * 0.1,
          ew = Rh * 0.17,
          eh = Rh * 0.25,
          bc = { 0: '#1c1c24', 1: '#4a2c14', 3: '#8a6ad0', 4: '#4a2c14', 6: '#c9a020', 7: '#5a1a10', 9: '#6a4a30' }[ci] || '#222',
          ec = { 3: '#a5e', 6: '#38f', 7: '#c22', 8: '#2cc', 4: '#269' }[ci] || '#222';

    // 目（奥側の目だけを描画）
    const x = hcx + Rh * 0.6;
    const w = ew * 0.82; // 0番目（i=1）のサイズを適用
    
    if (is('シノ')) { // 忍者:細い目
      g.fillStyle = '#fff';
      g.beginPath();
      g.ellipse(x, ey, w, eh * 0.45, -0.08, 0, 7);
      g.fill();
      ol(1.5);
      dot(x + w * 0.35, ey, eh * 0.35, '#111');
      line([x - w * 1.2, ey - eh * 0.8], [x + w * 1.1, ey - eh * 0.3], 3, '#111');
    } else if (hurt) {
      g.strokeStyle = '#111';
      g.lineWidth = 2.5;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(x - w, ey - eh * 0.6);
      g.lineTo(x + w * 0.6, ey);
      g.lineTo(x - w, ey + eh * 0.6);
      g.stroke();
    } else {
      g.fillStyle = '#fff';
      g.beginPath();
      g.ellipse(x, ey, w, eh, 0, 0, 7);
      g.fill();
      ol(1.2);
      g.fillStyle = ec;
      g.beginPath();
      g.ellipse(x + w * 0.4, ey, w * 0.62, eh * 0.85, 0, 0, 7);
      g.fill();
      dot(x + w * 0.5, ey, eh * 0.38, '#000');
      dot(x + w * 0.6, ey - eh * 0.4, 1.1, '#fff');
      line([x - w * 1.3, ey - Rh * 0.4], [x + w * 1.2, ey - Rh * 0.3], is('ガルド') ? 3.6 : 2.4, bc);
    }

    // 口
    if (ci != 2) {
      if (open) {
        g.fillStyle = '#6a1818';
        g.beginPath();
        g.ellipse(hcx + Rh * 0.52, hcy + Rh * 0.52, Rh * 0.2, Rh * 0.17, 0, 0, 7);
        g.fill();
        ol(1.8);
      } else {
        g.strokeStyle = '#7a2a20';
        g.lineWidth = 2;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(hcx + Rh * 0.28, hcy + Rh * 0.5);
        g.quadraticCurveTo(hcx + Rh * 0.48, hcy + Rh * 0.62, hcx + Rh * 0.72, hcy + Rh * 0.47);
        g.stroke();
      }
    }
    if (is('シノ')) { // 口布
      g.fillStyle = K('#143', 0);
      g.beginPath();
      g.arc(hcx, hcy, Rh, 0.02, Math.PI * 0.62);
      g.lineTo(hcx + Rh * 1.12, hcy + Rh * 0.28);
      g.lineTo(hcx + Rh * 0.5, hcy + Rh * 0.05);
      g.closePath();
      g.fill();
      ol(2);
    }
  }

  // 前髪・かぶりもの・顔のペイント
  switch (name) {
    case 'ライキ':
      cap(C('#1c1c24'), 1.84, 0.1);
      line([hcx - Rh, hcy - Rh * 0.42], [hcx + Rh, hcy - Rh * 0.42], 6.5, '#111');
      line([hcx - Rh, hcy - Rh * 0.42], [hcx + Rh, hcy - Rh * 0.42], 4.2, C('#fff'));
      line([hcx - Rh, hcy - Rh * 0.42], [hcx - Rh - 14 + tr, hcy - Rh * 0.42 + wv + 6], 4, C('#fff'));
      line([hcx - Rh, hcy - Rh * 0.42], [hcx - Rh - 24 + tr * 1.5, hcy - Rh * 0.42 + 14 - wv * 2], 3.5, C('#eee'));
      break;
    case 'ガルド': { // ヒゲ
      g.fillStyle = K('#4a2c14', 0);
      g.beginPath();
      g.moveTo(hcx - Rh * 0.45, hcy + Rh * 0.15);
      g.quadraticCurveTo(hcx - Rh * 0.3, hcy + Rh * 1.25, hcx + Rh * 0.55, hcy + Rh * 1.2);
      g.quadraticCurveTo(hcx + Rh * 1.1, hcy + Rh * 0.8, hcx + Rh * 0.95, hcy + Rh * 0.3);
      g.quadraticCurveTo(hcx + Rh * 0.6, hcy + Rh * 0.55, hcx + Rh * 0.2, hcy + Rh * 0.4);
      g.closePath();
      g.fill();
      ol(2.2);
      line([hcx + Rh * 0.28, hcy + Rh * 0.5], [hcx + Rh * 0.75, hcy + Rh * 0.48], 2, '#2a180a');
      line([hcx + Rh * 0.55, hcy - Rh * 0.6], [hcx + Rh * 0.8, hcy - Rh * 0.2], 2, 'rgba(160,60,50,.9)');
      break;
    }
    case 'シノ':
      cap(K('#143', 0), 2.0, 0.08);
      line([hcx - Rh, hcy - Rh * 0.55], [hcx + Rh, hcy - Rh * 0.55], 6.5, '#111');
      line([hcx - Rh, hcy - Rh * 0.55], [hcx + Rh, hcy - Rh * 0.55], 4.2, C('#e33'));
      line([hcx - Rh, hcy - Rh * 0.55], [hcx - Rh - 14 + tr, hcy - Rh * 0.55 + wv + 8], 4, C('#e33'));
      line([hcx - Rh, hcy - Rh * 0.55], [hcx - Rh - 24 + tr * 1.5, hcy - Rh * 0.55 + 18 - wv * 2], 3.5, C('#c22'));
      break;
    case 'メイガ': { // とんがり帽子
      g.fillStyle = LG(hcx - Rh, hcy - Rh * 2, hcx + Rh, hcy, K('#7a5ac0', 0), K('#3a2a6a', 0));
      g.beginPath();
      g.moveTo(hcx - Rh * 0.75, hcy - Rh * 0.6);
      g.quadraticCurveTo(hcx - Rh * 0.5, hcy - Rh - 18, hcx - 16 + wv, hcy - Rh - 38 + wv * 0.5);
      g.quadraticCurveTo(hcx + Rh * 0.2, hcy - Rh - 14, hcx + Rh * 0.8, hcy - Rh * 0.62);
      g.closePath();
      g.fill();
      ol(2.5);
      line([hcx - Rh * 0.78, hcy - Rh * 0.68], [hcx + Rh * 0.82, hcy - Rh * 0.7], 6, '#111');
      line([hcx - Rh * 0.78, hcy - Rh * 0.68], [hcx + Rh * 0.82, hcy - Rh * 0.7], 3.6, C('#fc3'));
      g.fillStyle = K('#3a2a6a', -0.1);
      g.beginPath();
      g.ellipse(hcx + 1, hcy - Rh * 0.62, Rh + 11, 5.5, -0.06, 0, 7);
      g.fill();
      ol(2.5);
      dot(hcx + Rh * 0.1, hcy - Rh * 0.66, 2.6, C('#6df'));
      break;
    }
    case 'ブレイド':
      cap(K('#4a2c14', 0), 1.86, 0.14);
      line([hcx - Rh, hcy - Rh * 0.5], [hcx + Rh, hcy - Rh * 0.5], 6, '#111');
      line([hcx - Rh, hcy - Rh * 0.5], [hcx + Rh, hcy - Rh * 0.5], 3.6, C('#c93'));
      break;
    case 'フェザー':
      cap(K('#ffe27a', 0), 1.8, 0.1);
      break;
    case 'バーサク':
      cap(K('#7a2418', 0), 1.78, 0.18);
      horn(hcx + Rh * 0.55, hcy - Rh * 0.78, 1);
      line([hcx + Rh * 0.1, hcy + Rh * 0.3], [hcx + Rh * 0.85, hcy + Rh * 0.3], 2.6, 'rgba(220,40,30,.85)');
      break;
    case 'トリック': { // 道化帽の帯 + メイク
      line([hcx - Rh * 0.95, hcy - Rh * 0.55], [hcx + Rh * 0.95, hcy - Rh * 0.55], 6, '#111');
      line([hcx - Rh * 0.95, hcy - Rh * 0.55], [hcx + Rh * 0.95, hcy - Rh * 0.55], 3.6, C('#ff0'));
      g.fillStyle = 'rgba(255,90,170,.55)';
      g.beginPath();
      g.arc(hcx + Rh * 0.32, hcy + Rh * 0.42, Rh * 0.2, 0, 7);
      g.fill();
      g.fillStyle = C('#f4a');
      poly([[hcx + Rh * 0.62, hcy + Rh * 0.12], [hcx + Rh * 0.7, hcy + Rh * 0.3], [hcx + Rh * 0.88, hcy + Rh * 0.3], [hcx + Rh * 0.74, hcy + Rh * 0.42], [hcx + Rh * 0.8, hcy + Rh * 0.62], [hcx + Rh * 0.62, hcy + Rh * 0.5], [hcx + Rh * 0.44, hcy + Rh * 0.62], [hcx + Rh * 0.5, hcy + Rh * 0.42], [hcx + Rh * 0.36, hcy + Rh * 0.3], [hcx + Rh * 0.54, hcy + Rh * 0.3]]);
      g.fill();
      ol(1);
      break;
    }
    case 'モンク':
      g.strokeStyle = C('#fc3');
      g.lineWidth = 3;
      g.beginPath();
      g.ellipse(hcx, hcy - Rh - 11, 15, 4, 0, 0, 7);
      g.stroke();
      dot(hcx + Rh * 0.62, hcy - Rh * 0.52, 2.8, '#c22');
      break;
  }

  // ---- 手前の腕(武器は手の下に描いて握っているように) ----
  const he = arm(q[1], q[2], shN, false, (e, ux, uy) => {
    if (is('ブレイド')) { // 剣
      const px = -uy,
            py = ux,
            A = (d, s) => [e[0] + ux * d + px * s, e[1] + uy * d + py * s];
      line(A(-9, 0), A(10, 0), 6, '#111');
      line(A(-9, 0), A(10, 0), 3.6, K('#5a3a1a', 0));
      dot(...A(-10, 0), 3.8, C('#c93'));
      line(A(10, -9), A(10, 9), 6, '#111');
      line(A(10, -9), A(10, 9), 3.6, C('#c93'));
      poly([A(12, -4.5), A(70, -3.5), A(84, 0), A(70, 3.5), A(12, 4.5)]);
      g.fillStyle = LG(...A(0, -5), ...A(0, 5), K('#9aa8b8', 0), K('#f2f8ff', 0), K('#aab8c8', 0));
      g.fill();
      ol(2);
      line(A(16, 0), A(72, 0), 1.4, 'rgba(90,110,130,.7)');
    }
    if (is('メイガ')) { // 杖
      const A = (d) => [e[0] + ux * d, e[1] + uy * d];
      line(A(-34, 0), A(52, 0), 6.5, '#111');
      line(A(-34, 0), A(52, 0), 3.8, K('#7a4a24', 0));
      const o = A(60),
            r = 9;
      g.fillStyle = RG(o[0], o[1], 1, r * 2, 'rgba(160,230,255,.55)', 'rgba(160,230,255,0)');
      g.beginPath();
      g.arc(o[0], o[1], r * 2, 0, 7);
      g.fill();
      g.fillStyle = RG(o[0] - 2, o[1] - 2, 1, r, '#fff', '#6df', '#38b');
      g.beginPath();
      g.arc(o[0], o[1], r, 0, 7);
      g.fill();
      ol(2);
      line(A(48, 0), A(52, 0), 7, '#111');
      line(A(48, 0), A(52, 0), 4.5, C('#fc3'));
    }
  });

  if (is('ガルド')) { // 肩当て
    g.fillStyle = RG(shN[0] - 4, shN[1] - 6, 1, 20, K('#d8deea', 0), K('#8a93a8', 0), K('#556', 0));
    g.beginPath();
    g.arc(shN[0], shN[1] - 3, 15, 0, 7);
    g.fill();
    ol(3);
    dot(shN[0] + 2, shN[1] - 4, 3.5, C('#fc3'));
    dot(shN[0] + 2, shN[1] - 4, 1.4, '#a70');
  }
  if (is('ゴーレム') || is('ブレイド')) { // 肩の岩/肩甲
    g.fillStyle = LG(shN[0] - 12, shN[1] - 12, shN[0] + 12, shN[1] + 6, K(is('ゴーレム') ? '#aab' : '#c93', 0.2), K(is('ゴーレム') ? '#667' : '#7a5a1a', 0));
    g.beginPath();
    g.moveTo(shN[0] - 12, shN[1] + 2);
    g.lineTo(shN[0] - 8, shN[1] - 11);
    g.lineTo(shN[0] + 8, shN[1] - 10);
    g.lineTo(shN[0] + 11, shN[1] + 3);
    g.closePath();
    g.fill();
    ol(2.5);
  }

  const ef = act && (m.k === 'd' || m.k === 'af') ? fe : he;
  g.restore();

  if (act) {
    p.tr = (p.tr || [])
      .concat([[p.x + p.f * Y.sc * (q[9] + ef[0]), p.y + Y.sc * ef[1]]])
      .slice(-8);
    const bx = p.f > 0 ? p.x + m.rx : p.x - m.rx - m.rw;
    g.fillStyle = '#fff3';
    g.fillRect(bx, p.y + m.ry, m.rw, m.rh);
  } else {
    p.tr = [];
  }

  g.lineCap = 'round';
  for (let i = 1; i < p.tr.length; i++) {
    g.strokeStyle = `rgba(255,255,255,${(i / p.tr.length) * 0.8})`;
    g.lineWidth = 2 + i * 2;
    g.beginPath();
    g.moveTo(p.tr[i - 1][0], p.tr[i - 1][1]);
    g.lineTo(p.tr[i][0], p.tr[i][1]);
    g.stroke();
  }

  if (p.st === 'throw' && p.tg < 0 && p.t > p.ch.th.startup && p.t <= p.ch.th.startup + p.ch.th.active) {
    const B = p.ch.th.box; // 掴み判定を一瞬表示
    g.fillStyle = '#fa34';
    g.fillRect(p.f > 0 ? p.x + B.x : p.x - B.x - B.w, p.y + B.y, B.w, B.h);
  }

  if (p.pg > 0) {
    g.strokeStyle = '#7df';
    g.lineWidth = 5;
    g.beginPath();
    g.arc(p.x, p.y - 55, 40 + (24 - p.pg) * 2, 0, 7);
    g.stroke();
  }

  if (p.st === 'break') {
    T('★ ★ ★', p.x, p.y - 150, 20, '#fd0');
  }

  if (p.st === 'shield' || p.st === 'sdown') {
    const on = p.st === 'shield' && p.t > 5;
    g.fillStyle = on
      ? `rgba(110,200,255,${0.2 + (p.sh / 60) * 0.4})`
      : 'rgba(110,200,255,.12)';
    g.beginPath();
    g.arc(p.x, p.y - 55, on ? 50 + p.sh / 6 : 40, 0, 7);
    g.fill();
  }
}