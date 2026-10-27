// ============================================================
// ui.js … 画面全体のデザイン(タイトル・メニュー・キャラ選択・対戦の HUD・K.O.・結果画面)
//
//  【デザインの方向】「マンガの1ページ」
//   キャラの絵は太い黒の線で描いた手描き風なので、画面も同じ「墨の線」と「スクリーントーン(網点)」で作る。
//    ・紙(paper)の上に、墨(ink)の太い枠のコマ(パネル)を斜めに並べる。枠の線は少しだけ手描きのように揺れる
//    ・色は 墨 / 紙 / 網点のグレー に、自分=朱色(p1)・相手=藍色(p2)・選んでいる物=黄色(hl) の3色だけを足す
//    ・見出しは極太の「Dela Gothic One」、本文は「M PLUS 1p」(index.html で読み込む。無いときはふつうのゴシック)
//    ・いちばん派手にするのは「タイトル」と「K.O.」だけ。ほかの画面は落ち着いた紙とコマ
//  【操作】どの画面もキーボードのほかに、マウス・タッチで項目を押せる(uiHit で押せる場所を登録する)
//  【しくみ】script.js の draw から uiScene(タイトル・メニュー・キャラ選択)/ uiFightHUD / uiFightOverlay を呼ぶ。
//   dark(各画面の背景と見出し)/ menu(縦に並ぶ項目)/ drawResult(結果画面)はここで作り直す
// ============================================================
const UI = {
  ink: '#1d1826',     // 墨(線・暗いコマ)
  ink2: '#2c2537',    // 暗いコマの中の項目
  paper: '#f1f1ec',   // 紙
  tone: '#c9c6cf',    // 網点・影
  p1: '#ff4632',      // 自分(朱)
  p2: '#2f5eff',      // 相手(藍)
  hl: '#ffd23f',      // 選んでいる物・強調(黄)
  mute: '#6f6878',    // 説明の文字(紙の上)
  soft: '#e6e3ec',    // 暗いコマの上の文字
};
const FONT_DISP = '"Dela Gothic One", "M PLUS 1p", "Hiragino Sans", sans-serif';
// 見出しの書体。Dela Gothic One が読み込めていないとき(オフラインなど)は、太いゴシックで代わりに描く
try { document.fonts.load('40px "Dela Gothic One"', 'A字'); document.fonts.load('800 16px "M PLUS 1p"', 'A字'); } catch (e) {} // 先に読み込みを始める
let uiDelaOk = false, uiDelaT = -999;
const dispFont = (z) => {
  if (!uiDelaOk && fr - uiDelaT > 30) {                              // 読み込めたか(30F ごとに確かめる)
    uiDelaT = fr;
    try { document.fonts.forEach((f) => { if (f.family.replace(/["']/g, '') === 'Dela Gothic One' && f.status === 'loaded') uiDelaOk = true; }); } catch (e) {}
  }
  return uiDelaOk ? z + 'px "Dela Gothic One"' : '900 ' + z + 'px "Hiragino Sans", "Noto Sans CJK JP", "Yu Gothic", sans-serif';
};
const STAGE_CHIP = ['#7ec8ff', '#bfe6ff', '#1a2346', '#ff6a1a'];
const MODE_NAME = { cpu: 'CPU対戦', train: 'トレーニング', rank: 'ランクルーム', casual: 'カジュアルルーム', priv: 'プライベートルーム', watch: 'CPU観戦' };

// ---------------- マウス・タッチ ----------------
const UIH = [];
function uiFrameStart() { UIH.length = 0; }
function uiHit(x, y, w, h, fn, hover) { UIH.push({ x, y, w, h, fn, hover }); }
function uiPt(ev) {
  const r = cv.getBoundingClientRect();
  return { x: ((ev.clientX - r.left) / r.width) * W, y: ((ev.clientY - r.top) / r.height) * H };
}
const uiFind = (p) => { for (let i = UIH.length - 1; i >= 0; i--) { const h = UIH[i]; if (p.x >= h.x && p.x <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h) return h; } return null; };
cv.addEventListener('pointerdown', (ev) => {
  if (sc === 'fight' && !(opt.mode === 'train' && typeof TR !== 'undefined' && TR && TR.paused)) return; // 対戦中はリプレイの操作バーなどに任せる
  const h = uiFind(uiPt(ev));
  if (h) { ev.preventDefault(); h.fn(uiPt(ev)); }
});
cv.addEventListener('pointermove', (ev) => {
  if (ev.pointerType !== 'mouse' || sc === 'fight') return;
  const h = uiFind(uiPt(ev));
  if (h && h.hover) h.hover();
  cv.style.cursor = h ? 'pointer' : 'default';
});

// ---------------- 描く道具 ----------------
const uh = (n) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };   // 決まった揺れ(毎フレーム同じ)
// 少し手描きの揺れがある多角形
function roughPath(pts, seed = 0, amp = 1.1) {
  g.beginPath();
  pts.forEach(([x, y], i) => {
    const dx = (uh(seed + i * 3.1) - 0.5) * amp * 2, dy = (uh(seed + i * 7.7) - 0.5) * amp * 2;
    i ? g.lineTo(x + dx, y + dy) : g.moveTo(x + dx, y + dy);
  });
  g.closePath();
}
// 斜めのコマ(sk = 上の辺を右へずらす量)
const slab = (x, y, w, h, sk = 0) => [[x + sk, y], [x + w + sk, y], [x + w, y + h], [x, y + h]];
// コマを描く: 影(ずらした色)→ 塗り → 墨の枠
function panel(x, y, w, h, o = {}) {
  const pts = slab(x, y, w, h, o.sk || 0), seed = o.seed ?? x * 0.13 + y * 0.71;
  if (o.shadow) {
    g.fillStyle = o.shadow;
    roughPath(pts.map(([a, b]) => [a + (o.sx ?? 6), b + (o.sy ?? 6)]), seed + 5);
    g.fill();
  }
  if (o.fill) { g.fillStyle = o.fill; roughPath(pts, seed); g.fill(); }
  if (o.lw !== 0) {
    g.strokeStyle = o.stroke || UI.ink;
    g.lineWidth = o.lw || 3;
    g.lineJoin = 'round';
    roughPath(pts, seed);
    g.stroke();
  }
}
// 網点(スクリーントーン)。f(x, y) = 0〜1 の濃さ
function halftone(x, y, w, h, col, step, f) {
  g.fillStyle = col;
  g.beginPath();
  for (let yy = y + step / 2, r = 0; yy < y + h; yy += step, r++)
    for (let xx = x + step / 2 + (r % 2 ? step / 2 : 0); xx < x + w; xx += step) {
      const k = f(xx, yy);
      if (k <= 0.03) continue;
      const rr = (step / 2) * Math.min(1, k);
      g.moveTo(xx + rr, yy);
      g.arc(xx, yy, rr, 0, 7);
    }
  g.fill();
}
// 集中線
function speedLines(cx, cy, r0, r1, n, col, a, seed = 0) {
  g.save();
  g.globalAlpha = a;
  g.fillStyle = col;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2 + uh(seed + i) * 0.2, w = 0.006 + uh(seed + i * 2.3) * 0.016, ra = r0 * (0.8 + uh(seed + i * 5.1) * 0.5);
    g.beginPath();
    g.moveTo(cx + Math.cos(t) * ra, cy + Math.sin(t) * ra);
    g.lineTo(cx + Math.cos(t - w) * r1, cy + Math.sin(t - w) * r1);
    g.lineTo(cx + Math.cos(t + w) * r1, cy + Math.sin(t + w) * r1);
    g.fill();
  }
  g.restore();
}
// 見出しの文字(極太・墨のふち・ずらした影)
function TD(s, x, y, z, fill, a = 'center', o = {}) {
  g.save();
  g.translate(x, y);
  if (o.rot) g.rotate(o.rot);
  if (o.scale) g.scale(o.scale, o.scale);
  g.font = dispFont(z);
  g.textAlign = a;
  g.lineJoin = 'round';
  const sw = o.sw ?? Math.max(2, z * 0.1);
  if (o.shadow) {
    const [dx, dy] = o.sh || [z * 0.06, z * 0.06];
    g.fillStyle = g.strokeStyle = o.shadow;
    g.lineWidth = sw * 2;
    if (sw) g.strokeText(s, dx, dy);
    g.fillText(s, dx, dy);
  }
  if (sw) { g.strokeStyle = o.stroke || UI.ink; g.lineWidth = sw * 2; g.strokeText(s, 0, 0); }
  g.fillStyle = fill;
  g.fillText(s, 0, 0);
  g.restore();
}
// 操作の説明(キーの形の小さな箱 + 説明)。dark=true は暗い所に置くとき
function hints(list, x, y, a = 'center', dark = false) {
  const mw = (t, z) => ((g.font = '800 ' + z + 'px ' + FONT_BODY), g.measureText(t).width);
  const ws = list.map(([k, l]) => [mw(k, 12) + 12, mw(l, 13)]);
  const tw = ws.reduce((s2, [kw, lw]) => s2 + kw + 6 + lw + 18, -18);
  let cx = a === 'center' ? x - tw / 2 : a === 'right' ? x - tw : x;
  list.forEach(([k, l], i) => {
    const [kw, lw] = ws[i];
    g.fillStyle = dark ? '#ffffff22' : '#fff';
    g.strokeStyle = dark ? '#ffffff66' : UI.ink;
    g.lineWidth = 1.5;
    g.beginPath();
    g.roundRect ? g.roundRect(cx, y - 13, kw, 18, 4) : g.rect(cx, y - 13, kw, 18);
    g.fill();
    g.stroke();
    T(k, cx + kw / 2, y + 1, 12, dark ? '#fff' : UI.ink);
    T(l, cx + kw + 6, y + 1, 13, dark ? UI.soft : UI.mute, 'left');
    cx += kw + 6 + lw + 18;
  });
}
// キャラを好きな場所・大きさで描く(足元 = feet)。紙芝居のように止まった絵(待機の姿勢)
function drawFighterAt(ci, sk, x, feet, s, f = 1, extra) {
  const p = F(ci, sk || 0, 0, f);
  if (extra) Object.assign(p, extra);
  g.save();
  g.translate(x, feet);
  g.scale(s, s);
  g.translate(0, -GY);
  drawF(p);
  g.restore();
}
// 紙の背景(角に網点)
function paperBg(dots = true) {
  g.fillStyle = UI.paper;
  g.fillRect(0, 0, W, H);
  if (!dots) return;
  halftone(W - 300, 0, 300, 220, UI.tone, 11, (x, y) => ((x - (W - 300)) / 300) * (1 - y / 220) * 1.1);
  halftone(0, H - 180, 260, 180, UI.tone, 11, (x, y) => (1 - x / 260) * ((y - (H - 180)) / 180) * 1.1);
}
// 選べる横長の項目(斜めのコマ)。label の中に ◀ ▶ があれば、左右の端を押すと値が変わる
function uiItem(label, x, y, w, h, on, opts = {}) {
  const dx = on ? -10 : 0;
  panel(x + dx, y, w, h, { fill: on ? UI.hl : opts.fill || UI.ink2, stroke: on ? UI.ink : opts.stroke || '#4c4458', lw: on ? 3 : 2, sk: 10, shadow: on ? UI.p1 : null, seed: y });
  T(label, x + dx + (opts.left ? 22 : w / 2 + 5), y + h * 0.68, on ? opts.zOn || 21 : opts.z || 18, on ? UI.ink : opts.col || UI.soft, opts.left ? 'left' : 'center');
  if (on) {                                                        // 選んでいる印(墨の三角)
    g.fillStyle = UI.ink;
    g.beginPath();
    g.moveTo(x + dx - 14, y + h / 2 - 8); g.lineTo(x + dx - 2, y + h / 2); g.lineTo(x + dx - 14, y + h / 2 + 8);
    g.fill();
  }
}

// ---------------- 共通の背景と縦の項目(script.js の dark / menu を作り直す) ----------------
//  見出しは紙の上に、中身は大きな墨のコマの中に描く(各画面の明るい色の文字はそのまま読める)
dark = function (t) {
  paperBg();
  TD(t, 34, 64, 34, UI.ink, 'left', { sw: 0, shadow: UI.p1, sh: [3, 3] });
  g.font = dispFont(34);
  const tw = g.measureText(t).width;
  g.fillStyle = UI.ink;                                            // 見出しの下の筆の線
  roughPath([[34, 74], [34 + tw + 40, 72], [34 + tw + 30, 79], [34, 80]], 9, 0.8);
  g.fill();
  panel(18, 90, W - 36, H - 104, { fill: UI.ink, lw: 3, shadow: UI.tone, sx: 6, sy: 6, seed: 3 });
  halftone(W - 330, 92, 310, 160, '#ffffff0d', 10, (x, y) => ((x - (W - 330)) / 310) * (1 - (y - 92) / 160));
};
menu = function (a, y = 190, step = 50) {
  const w = 480, h = Math.min(42, step - 8);
  a.forEach((s, i) => {
    const on = i == sel, x = W / 2 - w / 2, yy = y + i * step - h * 0.72;
    uiItem(s, x, yy, w, h, on);
    uiHit(x - 10, yy, w + 20, h, (pt) => {
      sel = i;
      if (s.includes('◀')) {                                       // 値の行: 左右の端で値を変える
        const k = (pt.x - x) / w;
        if (k < 0.3) return nav('ArrowLeft');
        if (k > 0.7) return nav('ArrowRight');
      }
      nav('Enter');
    }, () => { if (sel !== i) { sel = i; pend = -1; } });
  });
};

// ---------------- 画面ごと ----------------
function uiScene() {
  if (sc === 'title') return uiTitle(), true;
  if (sc === 'main') return uiMain(), true;
  if (sc === 'cfg') return uiCfg(), true;
  return false;
}

// タイトル: 朱と藍に斜めに分かれた表紙。2人がにらみ合い、真ん中に題字
function uiTitle() {
  if (!A) A = F(0, 0, 300, 1);
  g.fillStyle = UI.paper;
  g.fillRect(0, 0, W, H);
  const split = (t) => 560 - t * 160;                                // 斜めの境目(上が 560、下が 400)
  g.fillStyle = UI.p1;
  g.beginPath(); g.moveTo(0, 0); g.lineTo(split(0), 0); g.lineTo(split(1), H); g.lineTo(0, H); g.fill();
  g.fillStyle = UI.p2;
  g.beginPath(); g.moveTo(split(0), 0); g.lineTo(W, 0); g.lineTo(W, H); g.lineTo(split(1), H); g.fill();
  halftone(0, 0, W, H, '#0000001f', 12, (x, y) => Math.abs(x - split(y / H)) / 500);
  speedLines(480, 330, 210, 900, 46, '#fff', 0.16, 4);
  g.strokeStyle = UI.ink;                                          // 境目の墨の線
  g.lineWidth = 12;
  g.beginPath(); g.moveTo(split(0), -10); g.lineTo(split(1), H + 10); g.stroke();
  g.strokeStyle = UI.paper;
  g.lineWidth = 3;
  g.stroke();
  const b = Math.sin(fr * 0.05) * 3;
  drawFighterAt(0, save.sk[0] || 0, 240, 520 + b, 2.3, 1);
  drawFighterAt(2, 0, 720, 520 - b, 2.3, -1);
  TD('CANVAS', W / 2 - 30, 128, 82, '#fff', 'center', { sw: 8, shadow: UI.ink, sh: [7, 7], rot: -0.05 });
  TD('FIGHTERS', W / 2 + 40, 214, 82, UI.hl, 'center', { sw: 8, shadow: UI.ink, sh: [7, 7], rot: -0.05 });
  T('手描きの格闘ゲーム', W / 2 + 120, 252, 15, '#fff', 'center');
  if (fr % 70 < 48) {
    panel(W / 2 - 170, 448, 340, 44, { fill: UI.ink, lw: 0, sk: 12, seed: 2 });
    T('Space か タップで はじめる', W / 2 + 6, 477, 19, '#fff');
  }
  uiHit(0, 0, W, H, () => nav('Space'));
}

// メインメニュー: 左に大きなコマ(題字と日替わりのキャラ)、右に項目
const MN_DESC = { オフライン: 'CPU対戦・トレーニング・CPU観戦', オンライン: 'ランク・カジュアル・プライベート', キャラクター: 'スキンの変更・技の詳しい性能', ショップ: 'スキンを買う',
  戦績: '勝敗と最近のリプレイ', リプレイ: '保存した試合を見返す', プロフィール: '実績と称号', 設定: 'キー配置・画質・揺れ' };
function uiMain() {
  paperBg();
  const ci = Math.floor(fr / 300) % CH.length, c = CH[ci];
  panel(20, 18, 470, 500, { fill: UI.ink, lw: 3, sk: 22, shadow: UI.tone, seed: 1 });
  g.save();
  roughPath(slab(20, 18, 470, 500, 22), 1);
  g.clip();
  halftone(20, 18, 492, 500, c.col || UI.p1, 12, (x, y) => 1 - Math.hypot(x - 260, y - 340) / 230);
  speedLines(260, 330, 160, 520, 30, '#ffffff', 0.08, ci);
  drawFighterAt(ci, save.sk[ci] || 0, 262, 470, 2.25, 1);
  g.restore();
  TD('CANVAS', 46, 88, 50, '#fff', 'left', { sw: 6, shadow: UI.p1, sh: [4, 4], rot: -0.05 });
  TD('FIGHTERS', 70, 140, 50, UI.hl, 'left', { sw: 6, shadow: UI.p1, sh: [4, 4], rot: -0.05 });
  panel(40, 470, 230, 34, { fill: '#fff', lw: 3, sk: 8, seed: 4 });
  T(c.nm, 58, 494, 18, UI.ink, 'left');
  g.font = '800 18px ' + FONT_BODY;
  T(c.ds.split(':')[0], 66 + g.measureText(c.nm).width, 493, 12, UI.mute, 'left');
  // 項目
  const x0 = 545, w = 370, h = 44, gap = 56, y0 = 30;
  MN.forEach((s, i) => {
    const on = i === sel, y = y0 + i * gap;
    uiItem(s, x0, y, w, h, on, { left: true, fill: '#fff', stroke: UI.ink, col: UI.ink, z: 19, zOn: 21 });
    if (on) T(MN_DESC[s] || '', x0 + w - 12, y + 29, 12, UI.ink, 'right');
    uiHit(x0 - 12, y, w + 24, h, () => { sel = i; nav('Enter'); }, () => (sel = i));
  });
  // プレイヤーの情報
  const title = typeof pfTitleName === 'function' ? pfTitleName() : '';
  panel(545, 486, 370, 34, { fill: UI.ink, lw: 0, sk: 10, seed: 6 });
  T((save.pname || 'PLAYER') + (title ? '「' + title + '」' : ''), 562, 509, 13, '#fff', 'left');
  T('コイン ' + save.coin + '   RP ' + save.rp + '   ' + save.w + '勝' + save.l + '敗', 902, 509, 12, UI.hl, 'right');
  hints([['↑↓', '選ぶ'], ['Enter', '決定'], ['Esc', '戻る']], 730, 534, 'center');
}

// キャラ選択: 左に選んだキャラの大きなコマ、右に全員のコマとステージ・CPUレベル・スタート
function uiCfg() {
  const tr = opt.mode === 'cpu' || opt.mode === 'train', rows = cfgRows(), r = rows[sel], c = CH[opt.ch], vs = opt.mode === 'cpu';
  paperBg();
  TD(MODE_NAME[opt.mode] || '', 34, 56, 30, UI.ink, 'left', { sw: 0, shadow: UI.p1, sh: [3, 3] });
  g.font = dispFont(30);
  T('キャラクターとステージを選ぶ', 46 + g.measureText(MODE_NAME[opt.mode] || '').width, 54, 14, UI.mute, 'left');
  // 選んだキャラ
  panel(18, 74, 420, 444, { fill: UI.ink, lw: 3, shadow: r === 0 ? UI.p1 : UI.tone, seed: 11 });
  g.save();
  roughPath(slab(18, 74, 420, 444), 11);
  g.clip();
  halftone(18, 74, 420, 444, c.col || UI.p1, 12, (x, y) => 1 - Math.hypot(x - 230, y - 360) / 240);
  drawFighterAt(opt.ch, save.sk[opt.ch] || 0, 232, 498, 2.4, 1);
  g.restore();
  TD(c.nm, 38, 128, 44, '#fff', 'left', { sw: 5, shadow: c.col || UI.p1, sh: [4, 4] });
  T(c.ds, 40, 154, 13, UI.soft, 'left');
  // 全員のコマ
  //   9人以上は5列にする(コマを細く)。3段以上になるときはコマを低くして、下の性能の欄に重ならないようにする
  const cols = CH.length > 8 ? 5 : 4, nrow = Math.ceil(CH.length / cols), gx0 = 458,
    gap = nrow > 2 ? 6 : 10,
    cw = cols === 5 ? 88 : 112, chh = nrow > 2 ? Math.floor((196 - (nrow - 1) * gap) / nrow) : 92, fs = Math.min(0.58, chh / 92 * 0.58);
  CH.forEach((q, i) => {
    const col = i % cols, row = (i / cols) | 0, x = gx0 + col * (cw + 8), y = 74 + row * (chh + gap), on = i === opt.ch;
    panel(x, y, cw, chh, { fill: on ? UI.hl : '#fff', lw: on ? 4 : 2.5, shadow: on ? UI.p1 : null, sx: 5, sy: 5, seed: i * 7 });
    g.save();
    roughPath(slab(x, y, cw, chh), i * 7);
    g.clip();
    drawFighterAt(i, save.sk[i] || 0, x + cw / 2, y + chh - 20, fs, 1);
    g.restore();
    panel(x + 4, y + chh - 22, cw - 8, 18, { fill: UI.ink, lw: 0, seed: i });
    T(q.nm, x + cw / 2, y + chh - 8, 12, '#fff');
    uiHit(x, y, cw, chh, () => { opt.ch = i; sel = 0; }, null);
  });
  // 性能
  const sy = vs ? 288 : 290, sgap = vs ? 16 : 19, stat = (nm, v, max, y) => {
    T(nm, gx0, y, 12, UI.ink, 'left');
    g.fillStyle = UI.tone;
    g.fillRect(gx0 + 70, y - 9, 170, 9);
    g.fillStyle = c.col || UI.p1;
    g.fillRect(gx0 + 70, y - 9, 170 * Math.min(1, v / max), 9);
    g.strokeStyle = UI.ink;
    g.lineWidth = 1.5;
    g.strokeRect(gx0 + 70, y - 9, 170, 9);
  };
  stat('体力 ' + c.hp, c.hp, 170, sy);
  stat('速さ', c.sp, 6, sy + sgap);
  stat('ジャンプ', -c.jp, 16, sy + sgap * 2);
  stat('SP ' + (c.spg ? c.spg.max : 100), c.spg ? c.spg.max : 100, 120, sy + sgap * 3);
  T('ゲージ技', gx0 + 262, sy, 11, UI.mute, 'left');
  T(c.mv.gx ? c.mv.gx.nm : '—', gx0 + 262, sy + 16, 13, UI.ink, 'left');
  T('超必殺技', gx0 + 262, sy + 38, 11, UI.mute, 'left');
  T(c.mv.sx ? c.mv.sx.nm : '—', gx0 + 262, sy + 54, 13, UI.ink, 'left');
  // ステージ・CPUレベル・スタート
  const rowAt = (id, y, label, val, chip) => {
    const on = r === id, x = gx0, w = 470, h = 34;
    panel(x + (on ? -8 : 0), y, w, h, { fill: on ? UI.hl : '#fff', lw: on ? 3 : 2, sk: 8, shadow: on ? UI.p1 : null, seed: y });
    T(label, x + 18, y + 23, 13, UI.mute, 'left');
    if (chip) { g.fillStyle = chip; g.fillRect(x + 128, y + 9, 18, 16); g.strokeStyle = UI.ink; g.lineWidth = 2; g.strokeRect(x + 128, y + 9, 18, 16); }
    T('◀', x + 110, y + 23, 15, UI.ink);
    T(val, x + (chip ? 156 : 130), y + 23, 16, UI.ink, 'left');
    T('▶', x + w - 22, y + 23, 15, UI.ink);
    uiHit(x, y, w * 0.45, h, () => { sel = rows.indexOf(id); nav('ArrowLeft'); }, () => (sel = rows.indexOf(id)));
    uiHit(x + w * 0.45, y, w * 0.55, h, () => { sel = rows.indexOf(id); nav('ArrowRight'); }, () => (sel = rows.indexOf(id)));
  };
  // CPU対戦は「相手」の行が増えるので、行の間を詰める
  const yOpp = 350, yStage = vs ? 388 : 372, yLv = vs ? 426 : 414;
  if (vs) {                                                          // 相手のキャラ(CPU)。最後は「ランダム」
    const oc = opt.oc != null && opt.oc < CH.length ? opt.oc : -1;
    rowAt(4, yOpp, '相手(CPU)', cfgOppName(), oc >= 0 ? CH[oc].col : null);
  }
  rowAt(1, yStage, 'ステージ', ST[opt.st].nm + '(' + ST[opt.st].env + ')', STAGE_CHIP[opt.st]);
  if (tr) {
    rowAt(2, yLv, 'CPUレベル', '', null);
    for (let i = 1; i <= 10; i++) {                                 // レベルの目盛り
      const x = gx0 + 150 + (i - 1) * 24, onv = i <= opt.lv;
      g.fillStyle = onv ? (i > 7 ? UI.p1 : UI.ink) : '#fff';
      g.fillRect(x, yLv + 9, 18, 16);
      g.strokeStyle = UI.ink;
      g.lineWidth = 1.5;
      g.strokeRect(x, yLv + 9, 18, 16);
    }
    T(opt.lv ? 'Lv' + opt.lv : '棒立ち', gx0 + 400, yLv + 23, 13, UI.ink, 'left');
  }
  const on = r === 3, bx = gx0 + 150, by = vs ? 468 : 462, bw = 300, bh = 44;
  panel(bx + (on ? -8 : 0), by, bw, bh, { fill: on ? UI.p1 : UI.ink, lw: 3, sk: 12, shadow: on ? UI.ink : UI.tone, seed: 21 });
  TD('START', bx + bw / 2 + (on ? -2 : 6), by + 34, 26, on ? '#fff' : UI.hl, 'center', { sw: on ? 4 : 0, stroke: UI.ink });
  uiHit(bx - 8, by, bw + 16, bh, () => { sel = rows.indexOf(3); nav('Enter'); }, () => (sel = rows.indexOf(3)));
  hints([['←→', '変える'], ['↑↓', '項目'], ['Enter', 'スタート'], ['Esc', '戻る']], gx0 + 140, 532, 'center');
  if (opt.mode === 'train') T('対戦中: Esc でポーズメニュー / R でリセット', gx0 - 6, 532, 11, UI.mute, 'left');
}

// ---------------- 対戦の HUD ----------------
//  上の左右に 体力(斜めの帯)・名前の札・シールド・SP ゲージ。体力が減ると、減った分が赤く残ってから縮む
const HUDV = new WeakMap();
function hpTrail(p) {
  let v = HUDV.get(p);
  if (!v) HUDV.set(p, (v = { t: p.hp, hold: 0, last: p.hp }));
  if (p.hp < v.last) v.hold = 26;                                  // 減った直後は少し止めてから縮める
  v.last = p.hp;
  if (v.hold > 0) v.hold--;
  else v.t = Math.max(p.hp, v.t - p.ch.hp * 0.012);
  if (p.hp > v.t) v.t = p.hp;
  return v.t;
}
function hudSide(p, right) {
  const X = (v) => (right ? W - v : v), mx = p.ch.hp, L = 404, y = 12, h = 24, sk = 14;
  const poly = (a, b, yy, hh, s) => (right ? [[X(a) - s, yy], [X(b) - s, yy], [X(b), yy + hh], [X(a), yy + hh]].map(([px, py]) => [px, py]) : [[a + s, yy], [b + s, yy], [b, yy + hh], [a, yy + hh]]);
  const shape = (pts, fill, stroke, lw) => { g.beginPath(); pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } };
  // 体力
  shape(poly(10, 18 + L, y - 4, h + 8, sk), UI.ink, null);
  shape(poly(16, 16 + L - 4, y, h, sk), '#3a3146', null);
  const k = Math.max(0, p.hp / mx), kt = Math.max(0, hpTrail(p) / mx), low = k < 0.3;
  const fillTo = (kk, col) => { const len = (L - 4) * kk; shape(poly(16, 16 + len, y, h, sk), col, null); };
  if (!right) { fillTo(kt, '#ff3b2f'); fillTo(k, low ? (fr % 20 < 10 ? '#ff7a3c' : '#ffb03c') : '#ffe36a'); }
  else {
    const fillR = (kk, col) => { const len = (L - 4) * kk; shape(poly(16, 16 + len, y, h, sk), col, null); };
    fillR(kt, '#ff3b2f'); fillR(k, low ? (fr % 20 < 10 ? '#ff7a3c' : '#ffb03c') : '#ffe36a');
  }
  g.globalAlpha = 0.35;                                            // つやの線
  shape(poly(16, 16 + (L - 4) * k, y + 3, 4, sk * 0.16), '#fff', null);
  g.globalAlpha = 1;
  shape(poly(16, 16 + L - 4, y, h, sk), null, UI.ink, 2);
  // 名前の札
  const ny = 42, nw = 156;
  shape(poly(10, 10 + nw, ny, 24, 8), UI.ink, null);
  shape(poly(10, 18, ny, 24, 8), p.ch.col || (right ? UI.p2 : UI.p1), null);
  g.save();
  g.font = dispFont(15);
  g.fillStyle = '#fff';
  g.textAlign = right ? 'right' : 'left';
  g.fillText(p.ch.nm, X(26), ny + 18);
  g.font = '800 12px ' + FONT_BODY;                                 // 残りの体力(札の内側の端)
  g.fillStyle = UI.hl;
  g.textAlign = right ? 'left' : 'right';
  g.fillText(String(Math.ceil(p.hp)), X(10 + nw - 10), ny + 17);
  g.restore();
  // シールド・ボルテージ(名前の札の横の細い帯)
  const bar2 = (yy, v, vmax, col) => {
    const len = 150, x0 = right ? W - 176 - len : 176;
    g.fillStyle = UI.ink; g.fillRect(x0 - 2, yy - 2, len + 4, 9);
    g.fillStyle = '#3a3146'; g.fillRect(x0, yy, len, 5);
    g.fillStyle = col;
    const ww = len * Math.max(0, Math.min(1, v / vmax));
    g.fillRect(right ? x0 + len - ww : x0, yy, ww, 5);
  };
  bar2(46, p.sh, p.ch.shm || 60, p.st === 'break' ? '#ff6a6a' : '#63d4ff');
  T('盾', right ? W - 176 - 156 : 176 + 156, 53, 10, UI.ink, right ? 'right' : 'left');
  if (p.ch.vt) {
    const full = p.volt >= p.ch.vt.max;
    bar2(58, p.volt || 0, p.ch.vt.max, full && fr % 20 < 10 ? '#fff' : p.ch.vt.color);
    T('VOLT', right ? W - 176 - 156 : 176 + 156, 65, 10, UI.ink, right ? 'right' : 'left');
  }
  if (p.ch.pupRaw && p.pup) {                                      // パペット(ロロ)の耐久値。クラッシュ中は再召喚までの残り時間
    const P = p.pup, S = p.ch.pupRaw, cr = P.st === 'crash';
    bar2(58, cr ? S.crash - P.crashT : P.hp, cr ? S.crash : S.hp, cr ? (fr % 20 < 10 ? '#7a5a8a' : '#4a3a5a') : P.hp < S.hp * 0.3 && fr % 16 < 8 ? '#ff8ac0' : S.color);
    T(cr ? '復活' : (S.label || '人形'), right ? W - 176 - 156 : 176 + 156, 65, 10, UI.ink, right ? 'right' : 'left');
  }
  if (p.ch.ht) {                                                    // 熱(ギア): たまるとオーバーヒート。オーバーヒート中は赤く点滅
    const oh = p.oh > 0;
    bar2(58, oh ? p.oh : p.heat || 0, oh ? p.ch.ht.lock : p.ch.ht.max, oh ? (fr % 12 < 6 ? '#ff3a1a' : '#ffb040') : (p.heat || 0) > p.ch.ht.max * 0.7 ? '#ff7a3a' : '#ffd040');
    T(oh ? 'OVERHEAT' : 'HEAT', right ? W - 176 - 156 : 176 + 156, 65, 10, UI.ink, right ? 'right' : 'left');
  }
  if ((p.chill || 0) > 0 || p.frz > 0) {                            // 冷え(セツカの技を受けた側): 満タンで凍る
    const fz = p.frz > 0;
    bar2(70, fz ? CHILL.max : p.chill, CHILL.max, fz ? (fr % 12 < 6 ? '#ffffff' : '#9fe6ff') : p.chill >= CHILL.slow ? '#5ab8ff' : '#9fe6ff');
    T(fz ? '凍結' : '冷え', right ? W - 176 - 156 : 176 + 156, 77, 10, UI.ink, right ? 'right' : 'left');
  }
  if (p.ch.aq && p.aq > 0) {                                        // 水まとい(ルリ): まとっている間だけ出る AQUA ゲージ
    const low = p.aq < 15;
    bar2(58, p.aq, p.ch.aq.max, low && fr % 16 < 8 ? '#ffffff' : p.ch.aq.color);
    T('AQUA', right ? W - 176 - 156 : 176 + 156, 65, 10, UI.ink, right ? 'right' : 'left');
  }
  // SP ゲージ(ゲージ技の量ごとに区切ったブロック)
  const S_ = spOf(p), v = p.sg || 0, gxm = p.ch.mv.gx, sxm = p.ch.mv.sx, sy2 = 74, sl = 266, full = sxm && v >= sxm.cost, can = gxm && v >= gxm.cost;
  const x0 = right ? W - 12 - sl : 12;
  g.fillStyle = UI.ink;
  g.fillRect(x0 - 2, sy2 - 2, sl + 4, 14);
  g.fillStyle = '#3a3146';
  g.fillRect(x0, sy2, sl, 10);
  const ww = sl * Math.min(1, v / S_.max);
  g.fillStyle = full ? (fr % 16 < 8 ? UI.hl : '#fff3b0') : can ? S_.color : '#6b6280';
  g.fillRect(right ? x0 + sl - ww : x0, sy2, ww, 10);
  if (gxm) { g.fillStyle = UI.ink; for (let cst = gxm.cost; cst < S_.max - 0.01; cst += gxm.cost) { const tx = right ? x0 + sl - (sl * cst) / S_.max : x0 + (sl * cst) / S_.max; g.fillRect(tx - 1, sy2, 2, 10); } }
  if (sxm && sxm.cost < S_.max) { const tx = right ? x0 + sl - (sl * sxm.cost) / S_.max : x0 + (sl * sxm.cost) / S_.max; g.fillStyle = UI.hl; g.fillRect(tx - 1.5, sy2 - 3, 3, 16); }
  const lab = full ? 'SUPER' : 'SP ' + Math.floor(v);
  const lx = right ? x0 - 8 : x0 + sl + 8;
  if (full) { g.font = dispFont(13); const lw = g.measureText(lab).width + 12; g.fillStyle = UI.ink; g.fillRect(right ? lx - lw : lx, sy2 - 3, lw, 17); }
  g.save();
  g.font = dispFont(full ? 13 : 12);
  g.textAlign = right ? 'right' : 'left';
  g.fillStyle = full ? UI.hl : UI.ink;
  g.lineWidth = 3;
  g.strokeStyle = '#ffffffaa';
  if (!full) g.strokeText(lab, right ? lx : lx, sy2 + 10);
  g.fillText(lab, right ? lx - (full ? 6 : 0) : lx + (full ? 6 : 0), sy2 + 10);
  g.restore();
}
function uiFightHUD(S) {
  hudSide(A, false);
  hudSide(B, true);
  // 真ん中: ステージ名の札
  g.save();
  g.font = '800 13px ' + FONT_BODY;
  const st = S.nm + '  ' + S.env, tw = g.measureText(st).width + 30;
  g.restore();
  panel(W / 2 - tw / 2, 8, tw, 24, { fill: UI.ink, lw: 0, sk: 6, seed: 31 });
  T(st, W / 2 + 3, 25, 13, '#fff');
  if (opt.mode === 'watch' && !rpPlaying()) T('CPU観戦  Lv' + opt.wla + ' 対 Lv' + opt.wlb + (opt.wspd > 1 ? '  ×' + opt.wspd : '') + '   Esc で終了', W / 2, 50, 13, UI.ink);
  // コンボ数(攻めている側の画面の端に大きく)
  for (const [v, atkRight] of [[A, true], [B, false]]) {
    if (!(v.cbT > 0 && v.cbn > 1)) continue;
    const k = Math.min(1, (70 - v.cbT) / 5), x = atkRight ? W - 40 : 40, a = atkRight ? 'right' : 'left';
    g.save();
    g.globalAlpha = Math.min(1, v.cbT / 12);
    TD(String(v.cbn), x, 200, 64 * (1.25 - 0.25 * k), UI.hl, a, { sw: 6, shadow: atkRight ? UI.p2 : UI.p1, sh: [4, 4] });
    TD('HIT', x + (atkRight ? -4 : 4), 228, 22, '#fff', a, { sw: 4 });
    g.restore();
  }
  // 操作の説明(下の細い帯)
  if (save.cfg.help && opt.mode !== 'watch' && !rpPlaying() && !(opt.mode === 'train' && typeof TR !== 'undefined' && TR && TR.meter)) {
    const kn = (a) => save.keys[a].map(keyName).join('/');
    g.fillStyle = '#1d1826b0';
    g.fillRect(0, H - 24, W, 24);
    hints([[kn('left') + kn('right'), '移動'], [kn('down'), 'しゃがみ'], [kn('attack'), '攻撃'], [kn('special'), '必殺'], [kn('throw'), '投げ'], [kn('shield'), '防御'], [kn('jump'), 'ジャンプ'], [kn('airParry'), '空中受け流し'], [kn('attack') + '+' + kn('special'), 'ゲージ技']], W / 2, H - 8, 'center', true);
  }
}
// READY / FIGHT! / K.O.
function uiFightOverlay() {
  if (sc !== 'fight') return;
  if (cd > 0) {
    if (cd > 30) {
      const k = Math.min(1, (90 - cd) / 10);
      g.save();
      g.globalAlpha = k;
      g.fillStyle = UI.ink;
      g.beginPath(); g.moveTo(0, 222); g.lineTo(W, 206); g.lineTo(W, 290); g.lineTo(0, 306); g.fill();
      halftone(0, 206, W, 100, '#ffffff12', 10, (x) => x / W);
      TD('READY', W / 2 + (1 - k) * 200, 278, 64, '#fff', 'center', { sw: 0, shadow: UI.p1, sh: [5, 5], rot: -0.017 });
      g.restore();
    } else {
      const k = 1 - cd / 30, s = cd > 24 ? 1.5 - (30 - cd) / 12 : 1;
      speedLines(W / 2, 260, 120, 700, 40, UI.ink, 0.22 * (1 - k * 0.6), 7);
      g.save();
      g.globalAlpha = Math.min(1, cd / 8);
      TD('FIGHT!', W / 2, 285, 92, UI.hl, 'center', { sw: 9, shadow: UI.p1, sh: [7, 7], scale: s, rot: -0.04 });
      g.restore();
    }
  }
  if (ko > 0) {
    const t = ko;
    if (t < 8) { g.fillStyle = 'rgba(255,255,255,' + (0.85 * (1 - t / 8)) + ')'; g.fillRect(0, 0, W, H); }
    speedLines(W / 2, 250, 150, 760, 54, UI.ink, 0.2, 13);
    const s = t < 10 ? 1.7 - (0.7 * t) / 10 : 1 + Math.sin(t * 0.25) * 0.015;
    TD('K.O.', W / 2, 300, 150, UI.p1, 'center', { sw: 12, stroke: '#fff', shadow: UI.ink, sh: [9, 9], scale: s, rot: -0.06 });
  }
}

// ---------------- 結果画面(script.js の drawResult を作り直す) ----------------
//  紙のページに、勝者の大きなコマ(朱か藍の網点)と「勝」のはんこ、真ん中に試合の詳細、下にボタン
drawResult = function () {
  const R_ = RESULT, wA = R_.win, watch = R_.mode === 'watch';
  paperBg(false);
  // 勝者・敗者のコマ
  for (const [side, x, f] of [['A', 18, 1], ['B', W - 18 - 250, -1]]) {
    const r = R_[side], won = side === 'A' ? wA : !wA, col = side === 'A' ? UI.p1 : UI.p2, sk = side === 'A' ? 16 : -16;
    panel(x, 18, 250, 420, { fill: won ? col : '#d9d6dd', lw: 3, sk, shadow: won ? UI.ink : null, seed: x });
    g.save();
    roughPath(slab(x, 18, 250, 420, sk), x);
    g.clip();
    halftone(x - 20, 18, 290, 420, won ? '#00000026' : '#0000001a', 11, (px, py) => Math.abs(py - 230) / 260 + 0.2);
    if (won) speedLines(x + 125, 300, 90, 360, 26, '#fff', 0.18, x);
    if (r.ci >= 0) drawFighterAt(r.ci, r.sk || 0, x + 125, 372, won ? 2 : 1.25, f, won ? null : { st: 'ko', t: 999, koLand: 1, koK0: 0 });
    g.restore();
    const nm = (watch ? (side === 'A' ? '左' : '右') : side === 'A' ? '自分' : '相手');
    panel(x + 10, 384, 230, 44, { fill: UI.ink, lw: 0, sk: 8, seed: x + 3 });
    T(nm + '  ' + r.name, x + 26, 404, 15, '#fff', 'left');
    const lv = side === 'A' ? R_.lvA : R_.lvB;
    T('体力 ' + Math.ceil(r.hp) + ' / ' + r.hpMax + (lv != null ? '   CPU Lv' + lv : ''), x + 26, 421, 11, UI.soft, 'left');
    if (side === 'A' && !watch && typeof pfTitleName === 'function' && pfTitleName()) T('「' + pfTitleName() + '」', x + 125, 452, 12, UI.ink);
    // はんこ
    const hx = x + (side === 'A' ? 205 : 45), hy = 72;
    g.save();
    g.translate(hx, hy);
    g.rotate(side === 'A' ? 0.18 : -0.18);
    g.globalAlpha = 0.92;
    g.strokeStyle = won ? '#d1121a' : '#8f8a96';
    g.fillStyle = won ? '#d1121a' : '#8f8a96';
    g.lineWidth = 4;
    g.beginPath(); g.arc(0, 0, 34, 0, 7); g.stroke();
    g.beginPath(); g.arc(0, 0, 28, 0, 7); g.lineWidth = 1.5; g.stroke();
    g.font = dispFont(34);
    g.textAlign = 'center';
    g.fillText(won ? '勝' : '敗', 0, 12);
    g.restore();
  }
  // 勝敗の見出し
  const head = watch ? (wA ? '左の勝ち' : '右の勝ち') : wA ? 'YOU WIN!' : 'YOU LOSE';
  TD(head, W / 2, 62, 42, wA || watch ? UI.hl : '#fff', 'center', { sw: 6, shadow: watch ? UI.ink : wA ? UI.p1 : UI.p2, sh: [4, 4], rot: -0.02 });
  T(res, W / 2, 90, 14, UI.ink);
  // 詳細(自分と相手を並べる。良いほうに黄色の印)
  const x0 = 292, x1 = 668, cA = 548, cB = 630, rate = (a, b) => (b ? Math.round((a / b) * 100) + '%' : '—');
  const rows = [
    ['与えたダメージ', R_.A.dealt, R_.B.dealt, 1],
    ['受けたダメージ', R_.A.taken, R_.B.taken, -1],
    ['最大コンボ', R_.A.maxCombo + ' HIT', R_.B.maxCombo + ' HIT', 1, R_.A.maxCombo, R_.B.maxCombo],
    ['最大コンボダメージ', R_.A.maxComboDmg, R_.B.maxComboDmg, 1],
    ['ジャスガ率', rate(R_.A.jg, R_.A.guarded), rate(R_.B.jg, R_.B.guarded), 1, R_.A.guarded ? R_.A.jg / R_.A.guarded : -1, R_.B.guarded ? R_.B.jg / R_.B.guarded : -1, R_.A.jg + ' / ' + R_.A.guarded, R_.B.jg + ' / ' + R_.B.guarded],
    ['攻撃命中率', rate(R_.A.hit, R_.A.att), rate(R_.B.hit, R_.B.att), 1, R_.A.att ? R_.A.hit / R_.A.att : -1, R_.B.att ? R_.B.hit / R_.B.att : -1, R_.A.hit + ' / ' + R_.A.att, R_.B.hit + ' / ' + R_.B.att],
  ];
  panel(x0, 104, x1 - x0, 300, { fill: UI.ink, lw: 3, shadow: UI.tone, seed: 77 });
  T('試合の詳細', x0 + 16, 128, 15, UI.hl, 'left');
  T(watch ? '左' : '自分', cA, 128, 13, '#ff9a8c');
  T(watch ? '右' : '相手', cB, 128, 13, '#9cb3ff');
  rows.forEach(([nm, a, b, better, va = a, vb = b, sa, sb], i) => {
    const y = 162 + i * 38;
    g.fillStyle = i % 2 ? '#ffffff08' : '#ffffff12';
    g.fillRect(x0 + 8, y - 22, x1 - x0 - 16, 34);
    T(nm, x0 + 18, y, 14, UI.soft, 'left');
    const ga = va * better > vb * better, gb = vb * better > va * better;
    for (const [val, cx, good, sub] of [[a, cA, ga, sa], [b, cB, gb, sb]]) {
      if (good) { g.fillStyle = UI.hl; g.fillRect(cx - 34, y - 2, 68, 3); }
      T(String(val), cx, y - 4, 17, good ? UI.hl : '#fff');
      if (sub) T(sub, cx, y + 9, 9, '#a9a3b3');
    }
  });
  T('試合時間 ' + ((R_.time / 3600) | 0) + ':' + String(((R_.time / 60) % 60) | 0).padStart(2, '0'), x0 + 18, 392, 12, '#a9a3b3', 'left');
  // ボタン(リプレイの保存 → 次の行き先)
  const btn = (label, x, y, on, fn, hov) => {
    panel(x + (on ? -6 : 0), y, 210, 38, { fill: on ? UI.hl : '#fff', lw: 3, sk: 10, shadow: on ? UI.p1 : null, seed: x });
    T(label, x + 110 + (on ? -6 : 0), y + 26, on ? 17 : 15, UI.ink);
    uiHit(x - 6, y, 222, 38, fn, hov);
  };
  if (RP.pending) {
    T('リプレイを保存しますか(' + RP_LIST.length + ' / ' + RP_MAX + ')', W / 2, 432, 14, UI.ink);
    btn('保存する', W / 2 - 230, 448, RP.ui.resSel === 0, () => { RP.ui.resSel = 0; nav('Enter'); }, () => (RP.ui.resSel = 0));
    btn('保存しない', W / 2 + 20, 448, RP.ui.resSel === 1, () => { RP.ui.resSel = 1; nav('Enter'); }, () => (RP.ui.resSel = 1));
  } else {
    if (RP.ui.resMsg) T(RP.ui.resMsg, W / 2, 432, 13, '#127a3a');
    btn('キャラクター選択へ', W / 2 - 230, 448, resSel === 0, () => { resSel = 0; nav('Enter'); }, () => (resSel = 0));
    btn('メニューへ', W / 2 + 20, 448, resSel === 1, () => { resSel = 1; nav('Enter'); }, () => (resSel = 1));
  }
  hints([['←→', '選ぶ'], ['Enter', '決定']], W / 2, 508, 'center');
  T('命中率 = 当たった技 ÷ 出した技(投げは除く・ガードされた技は外れ)  ジャスガ率 = ジャストガード ÷ シールドで受けた攻撃', W / 2, 532, 10, UI.mute);
};
