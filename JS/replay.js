// ============================================================
// replay.js … リプレイ(試合データの記録と再生)と戦績画面
//
//  【しくみ】動画ではなく「試合の始まりの状態」と「毎フレームの入力」を保存する。
//    ・始まりの状態 = 乱数の種・キャラ・スキン・ステージ・CPUレベル・簡単コマンドの設定
//    ・入力 = 自分の操作 9種類(←→↑↓ 攻撃 必殺 シールド ジャンプ 投げ)の「押している / 押した瞬間」を 1F ごとに
//    CPU の動きや乱数は、種と入力が同じなら同じになる(script.js の upd はゲームの1Fごとに決まった処理をするだけ)。
//    → 再生では同じ upd をもう一度動かして、元の試合をそのまま再現する。
//  【場面の移動・1F戻る】RP_SNAP F ごとに、その時の状態(キャラ・弾・エフェクト・乱数など)を丸ごと覚えておき、
//    いちばん近い覚えた場面から目的のFまで upd を進める。
//  【保存】ブラウザの localStorage('cf_replay')。最大 RP_MAX 件。入力は同じ値の続きをまとめて小さくする。
//  ※ script.js に、この中の関数を呼ぶ所がいくつかある(startFight / endFight / upd / loop / nav / draw)
// ============================================================
const RP_MAX = 30;                  // 保存できるリプレイの数
const RP_SNAP = 30;                 // 何Fごとに途中の状態を覚えるか(小さいほど戻るのが速く、メモリを使う)
const RP_STORE = 'cf_replay';
const RP_VER = 1;                   // 保存形式の番号
const RP_ACTS = ['left', 'right', 'up', 'down', 'attack', 'special', 'shield', 'jump', 'throw'];
const RP_BIT = Object.fromEntries(RP_ACTS.map((a, i) => [a, i]));
const RP_AP_BIT = 18;               // 空中受け流しのキー(あとから足した操作。前の記録と同じ並びのまま、空いている 18番目のビットを使う)
const RP_SELF_BIT = 19;             // 本体の必殺のキー(押している間。メイ＆ロロ: 押しながら必殺で、メイ自身の必殺技)
const RP_SPEEDS = [0.25, 0.5, 1, 2, 4];
const RP_SORTS = ['新しい順', '古い順', 'お気に入り優先'];
const RP_MODE_NAME = { cpu: 'CPU対戦', rank: 'ランク', casual: 'カジュアル', priv: 'プライベート', watch: 'CPU観戦' };
const RP_FRAME_TOP = 96;            // 再生中のフレーム表の位置(上の方。下は操作バー)

let RP_LIST = rpLoad();
const RP = {
  rec: null,       // 記録中の試合
  pending: null,   // 終わった試合(結果画面で保存するか選ぶ)
  play: null,      // 再生中
  back: null,      // 再生前の設定(終わったら戻す)
  ui: { sort: 0, fFav: 0, fRes: 0, fMine: 0, fOpp: 0, sel: 0, top: 0, menu: null, from: 'main', msg: '', resSel: 0, resMsg: '', fullSel: 0, fullOk: -1, recSel: 0, drag: false },
};

// ---------------- 保存 ----------------
function rpLoad() {
  try {
    const a = JSON.parse(localStorage.getItem(RP_STORE) || '[]');
    return Array.isArray(a) ? a.filter((e) => e && e.inp != null) : [];
  } catch (e) {
    return [];
  }
}
function rpStore() {
  try {
    localStorage.setItem(RP_STORE, JSON.stringify(RP_LIST));
    return true;
  } catch (e) {
    return false;
  }
}
// 入力の並びを文字にする: 同じ値が続く所は「値*個数」(36進数)
function rpEncode(arr) {
  const out = [];
  for (let i = 0; i < arr.length; ) {
    let j = i;
    while (j < arr.length && arr[j] === arr[i]) j++;
    out.push(arr[i].toString(36) + (j - i > 1 ? '*' + (j - i).toString(36) : ''));
    i = j;
  }
  return out.join(',');
}
function rpDecode(s) {
  const a = [];
  if (!s) return a;
  for (const t of s.split(',')) {
    const [v, n] = t.split('*'), x = parseInt(v, 36) || 0, c = n ? parseInt(n, 36) : 1;
    for (let k = 0; k < c; k++) a.push(x);
  }
  return a;
}

// ---------------- 記録(script.js から呼ぶ) ----------------
// startFight の最初: 乱数の種を返す。記録を始める(トレーニングは記録しない)
function rpBeginFight() {
  if (RP.play) return RP.play.d.seed;
  const seed = ((Math.random() * 4294967296) >>> 0) || 1;
  RP.pending = null;
  RP.ui.resMsg = '';
  RP.rec = opt.mode === 'train' ? null : {
    v: RP_VER, seed, inp: [], mode: opt.mode, st: opt.st, easy: !!save.cfg.easyCmd, date: Date.now(),
    wla: opt.wla, wlb: opt.wlb, wr: [opt.wa >= CH.length, opt.wb >= CH.length], cv: CH.map((c) => c.nm).join('|'),
  };
  return seed;
}
// startFight でキャラを作った直後。記録: キャラと CPU レベルを覚える / 再生: 記録したキャラ・スキンにする
function rpFixFighters() {
  const P = RP.play;
  if (P) {
    A = F(P.ia, P.d.a.sk, 300, 1);
    B = F(P.ib, P.d.b.sk, 660, -1);
    opt.lv = P.d.lv;
    return;
  }
  if (RP.rec) Object.assign(RP.rec, { lv: opt.lv, a: { name: A.ch.nm, sk: A.sk }, b: { name: B.ch.nm, sk: B.sk } });
}
// upd の中で毎フレーム: このフレームの入力(ビットの集まり)。記録中なら覚える / 再生中なら記録から読む
function rpFrameInput() {
  const P = RP.play;
  if (P) return P.inp[P.f++] || 0;
  let w = 0;
  for (let i = 0; i < RP_ACTS.length; i++) {
    if (keyDown(RP_ACTS[i])) w |= 1 << i;
    if (keyHit(RP_ACTS[i])) w |= 1 << (i + 9);
  }
  if (keyHit('airParry')) w |= 1 << RP_AP_BIT;                     // 空中受け流しのキー(押した瞬間だけ使う)
  if (keyDown('self')) w |= 1 << RP_SELF_BIT;                       // 本体の必殺のキー(押している間)
  if (RP.rec) RP.rec.inp.push(w);
  return w;
}
const iwDown = (w, a) => a === 'airParry' ? false : a === 'self' ? !!(w & (1 << RP_SELF_BIT)) : !!(w & (1 << RP_BIT[a]));
const iwHit = (w, a) => !!(w & (1 << (a === 'airParry' ? RP_AP_BIT : RP_BIT[a] + 9)));
// endFight: 記録を終える(結果画面で保存するか選ぶ)
function rpEndRecord(w) {
  if (!RP.rec || RP.play) return;
  RP.pending = { ...RP.rec, frames: RP.rec.inp.length, win: !!w, hpA: A.hp, hpB: B.hp, rounds: 1, memo: '', fav: false };
  RP.rec = null;
  RP.ui.resSel = 0;
  RP.ui.resMsg = '';
}
function rpSavePending() {
  const e = RP.pending;
  e.id = e.date.toString(36) + ((Math.random() * 1e6) | 0).toString(36);
  e.inp = rpEncode(e.inp);
  RP_LIST.push(e);
  RP.pending = null;
  if (!rpStore()) {
    RP_LIST.pop();
    RP.ui.resMsg = '保存できませんでした(ブラウザの保存容量がいっぱいです)';
    return false;
  }
  RP.ui.resMsg = 'リプレイを保存しました(メニュー → リプレイ / 戦績 から見られます)';
  return true;
}

// ---------------- 再生 ----------------
const rpPlaying = () => !!RP.play;
function rpStart(e) {
  const ia = CH.findIndex((c) => c.nm === e.a.name), ib = CH.findIndex((c) => c.nm === e.b.name);
  if (ia < 0 || ib < 0) {
    RP.ui.msg = 'このリプレイのキャラ(' + (ia < 0 ? e.a.name : e.b.name) + ')がいないため再生できません';
    return;
  }
  RP.back = { opt: { ...opt }, easy: save.cfg.easyCmd, sc, sel };
  RP.play = { d: e, inp: rpDecode(e.inp), f: 0, ia, ib, snaps: new Map(), playing: true, speed: 1, acc: 0, end: false, seek: null, table: true, warn: '' };
  RP.play.n = e.frames || RP.play.inp.length;
  // 記録したときの設定にする(観戦で「ランダム」を選んでいたときは、同じように乱数を使わせる)
  Object.assign(opt, { mode: e.mode, st: e.st, ch: ia, lv: e.lv, wla: e.wla, wlb: e.wlb, wa: e.wr && e.wr[0] ? CH.length : ia, wb: e.wr && e.wr[1] ? CH.length : ib });
  save.cfg.easyCmd = !!e.easy;
  trInit();
  Object.assign(TR, { actA: [], actB: [], fA: [], fB: [], quiet: 0 });
  startFight();
  rpSnap();
  if (e.cv && e.cv !== CH.map((c) => c.nm).join('|')) RP.play.warn = 'キャラの構成が記録時と違うため、正しく再現できない可能性があります';
}
function rpExit() {
  const P = RP.play;
  if (!P) return;
  RP.play = null;
  Object.assign(opt, RP.back.opt);
  save.cfg.easyCmd = RP.back.easy;
  sc = RP.back.sc;
  sel = RP.back.sel;
  RP.back = null;
}
// ゲームの 1F 分(16.67ms)ごとに loop から呼ぶ
function rpTick() {
  const P = RP.play;
  if (sc !== 'fight') return;
  if (P.seek != null) return rpSeekWork();
  if (!P.playing || P.end) return;
  P.acc += P.speed;
  while (P.acc >= 1 && !P.end) {
    P.acc -= 1;
    rpStep();
  }
}
function rpStep() {
  const P = RP.play;
  if (P.f >= P.n) return rpReachedEnd();
  upd();
  if (P.f % RP_SNAP === 0 && !P.snaps.has(P.f)) rpSnap();
  if (P.f >= P.n && !P.end) rpReachedEnd();
}
// 試合の終わり(K.O. のあと)まで来た
function rpReachedEnd() {
  const P = RP.play;
  P.end = true;
  P.playing = false;
  if (P.f >= P.n && (Math.abs(A.hp - P.d.hpA) > 0.01 || Math.abs(B.hp - P.d.hpB) > 0.01))
    P.warn = '記録したときと結果が違います(ゲームの内容が変わったため、正しく再現できていない可能性があります)';
}
// 目的のFへ移動。近い覚えた場面から進める(遠いときは数回の描画に分けて進める)
function rpSeek(t) {
  const P = RP.play;
  t = Math.max(0, Math.min(P.n, t | 0));
  let best = -1;
  for (const k of P.snaps.keys()) if (k <= t && k > best) best = k;
  if (t < P.f || best > P.f) rpRestore(best);
  P.seek = t;
  rpSeekWork();
}
function rpSeekWork() {
  const P = RP.play, t0 = performance.now();
  while (P.f < P.seek && !P.end && performance.now() - t0 < 14) rpStep();
  if (P.f >= P.seek || P.end) P.seek = null;
}
// ---- 途中の状態を丸ごと覚える / 戻す ----
//  キャラの技のデータなど、試合中に変わらない物は同じ物を指したまま(コピーしない)
let RP_STATIC = null;
function rpStatic() {
  if (RP_STATIC) return RP_STATIC;
  const s = new Set(), stack = [CH, CHARACTERS, ST];
  if (typeof SK !== 'undefined') stack.push(SK);
  while (stack.length) {
    const o = stack.pop();
    if (!o || typeof o !== 'object' || s.has(o)) continue;
    s.add(o);
    if (Array.isArray(o)) for (const v of o) stack.push(v);
    else for (const k in o) stack.push(o[k]);
  }
  return (RP_STATIC = s);
}
function rpClone(v, memo) {
  if (v === null || typeof v !== 'object') return v;
  if (RP_STATIC.has(v)) return v;
  let c = memo.get(v);
  if (c) return c;
  if (Array.isArray(v)) {
    c = new Array(v.length);
    memo.set(v, c);
    for (let i = 0; i < v.length; i++) c[i] = rpClone(v[i], memo);
    return c;
  }
  const pr0 = Object.getPrototypeOf(v);
  if (pr0 !== Object.prototype && pr0 !== null) return v; // 特別な物(画像など)はそのまま
  c = {};
  memo.set(v, c);
  for (const k in v) c[k] = rpClone(v[k], memo);
  return c;
}
function rpState() {
  return { A, B, G, fx, PJ, PT, FIRE, DUST, ko, hs, cd, fr, gfr, tp, ddKeep, RNG_S, shakeT, shakeP, MS,
    m: { actA: TR.actA, actB: TR.actB, fA: TR.fA, fB: TR.fB, quiet: TR.quiet } };
}
function rpSnap() {
  rpStatic();
  RP.play.snaps.set(RP.play.f, rpClone(rpState(), new Map()));
}
function rpRestore(f) {
  const P = RP.play, s = rpClone(P.snaps.get(f), new Map());
  ({ A, B, G, fx, PJ, PT, FIRE, DUST, ko, hs, cd, fr, gfr, tp, ddKeep, RNG_S, shakeT, shakeP, MS } = s);
  Object.assign(TR, s.m);
  aiCache.clear();
  P.f = f;
  P.end = false;
  P.acc = 0;
}

// ---------------- 一覧(並び替え・絞り込み) ----------------
const rpNames = (side) => [...new Set(RP_LIST.map((e) => e[side].name))];
function rpFiltered() {
  const u = RP.ui, mine = u.fMine ? rpNames('a')[u.fMine - 1] : null, opp = u.fOpp ? rpNames('b')[u.fOpp - 1] : null;
  const L = RP_LIST.filter((e) => (!u.fFav || e.fav) && (!u.fRes || (u.fRes === 1) === !!e.win) && (!mine || e.a.name === mine) && (!opp || e.b.name === opp));
  L.sort((x, y) => (u.sort === 2 && x.fav !== y.fav ? (y.fav ? 1 : -1) : u.sort === 1 ? x.date - y.date : y.date - x.date));
  return L;
}
const rpPad = (n) => String(n).padStart(2, '0');
const rpDate = (t) => { const d = new Date(t); return d.getFullYear() + '/' + rpPad(d.getMonth() + 1) + '/' + rpPad(d.getDate()) + ' ' + rpPad(d.getHours()) + ':' + rpPad(d.getMinutes()); };
const rpTime = (f) => { const s = Math.max(0, f) / 60; return ((s / 60) | 0) + ':' + rpPad((s % 60) | 0); };
const rpTimeF = (f) => rpTime(f) + '.' + rpPad(Math.floor(((Math.max(0, f) % 60) / 60) * 100));
const rpFightTime = (e) => rpTime((e.frames || 0) - 90);           // 試合時間(始まりの READY の 90F は除く)
const rpResult = (e) => (e.mode === 'watch' ? (e.win ? '左の勝ち' : '右の勝ち') : e.win ? 'WIN' : 'LOSE');
function rpOpen(m, from) {
  sc = m;
  RP.ui.from = from;
  RP.ui.sel = m === 'rplist' ? 5 : 0;
  RP.ui.top = 0;
  RP.ui.menu = null;
  RP.ui.msg = '';
  RP.ui.recSel = 0;
}
function rpBackFrom(m) {
  if (m === 'rplist' && RP.ui.from === 'records') return rpOpen('records', 'main');
  sc = 'main';
  sel = m === 'records' ? 4 : 5;
}

// ---------------- キー操作(nav の最初) ----------------
function rpNav(k) {
  const up = k === 'ArrowUp', dn = k === 'ArrowDown', lf = k === 'ArrowLeft', rt = k === 'ArrowRight',
    ok = k === 'Enter' || k === 'Space', esc = k === 'Escape', h = rt - lf, u = RP.ui;
  // 再生中
  if (RP.play && sc === 'fight') {
    const P = RP.play;
    if (esc) rpExit();
    else if (ok) rpToggle();
    else if (lf || rt) rpStepBy(h);
    else if (up || dn) P.speed = RP_SPEEDS[Math.max(0, Math.min(RP_SPEEDS.length - 1, RP_SPEEDS.indexOf(P.speed) + (up ? 1 : -1)))];
    else if (k === 'PageUp' || k === 'BracketLeft') rpSeek(P.f - 300);
    else if (k === 'PageDown' || k === 'BracketRight') rpSeek(P.f + 300);
    else if (k === 'Home' || k === 'KeyR') rpRestart();
    else if (k === 'End') rpSeek(P.n);
    else if (k === 'KeyF') P.table = !P.table;
    return true;
  }
  // 結果画面: リプレイを保存するか
  if (sc === 'result' && RP.pending) {
    if (up || dn || lf || rt) u.resSel ^= 1;
    if (k === 'Enter' || k === 'Space') {
      if (u.resSel === 1) { RP.pending = null; u.resMsg = 'リプレイは保存しませんでした'; return true; }
      if (RP_LIST.length >= RP_MAX) { sc = 'rpfull'; u.fullSel = 0; u.fullOk = -1; return true; }
      rpSavePending();
    }
    return true;
  }
  if (sc === 'result') { if (ok) u.resMsg = ''; return false; }
  // 上限: 消すリプレイを選ぶ
  if (sc === 'rpfull') {
    const L = RP_LIST.slice().sort((x, y) => y.date - x.date), n = L.length + 1;
    if (up) u.fullSel = (u.fullSel + n - 1) % n;
    if (dn) u.fullSel = (u.fullSel + 1) % n;
    if (up || dn) u.fullOk = -1;
    if (esc) sc = 'result';
    if (k === 'Enter' || k === 'Space') {
      if (u.fullSel === L.length) { RP.pending = null; sc = 'result'; u.resMsg = 'リプレイは保存しませんでした'; }
      else if (u.fullOk !== u.fullSel) u.fullOk = u.fullSel;           // もう一度 Enter で決定
      else {
        const old = L[u.fullSel];
        RP_LIST = RP_LIST.filter((e) => e !== old);
        sc = 'result';
        if (rpSavePending()) u.resMsg = '「' + rpDate(old.date) + '」を消して保存しました';
      }
    }
    return true;
  }
  // 戦績
  if (sc === 'records') {
    const recent = RP_LIST.slice().sort((x, y) => y.date - x.date).slice(0, 6), n = recent.length + 2;
    if (up) u.recSel = (u.recSel + n - 1) % n;
    if (dn) u.recSel = (u.recSel + 1) % n;
    if (esc) rpBackFrom('records');
    if (ok) {
      if (u.recSel < recent.length) rpStart(recent[u.recSel]);
      else if (u.recSel === recent.length) rpOpen('rplist', 'records');
      else rpBackFrom('records');
    }
    return true;
  }
  // リプレイ一覧
  if (sc === 'rplist') {
    const L = rpFiltered();
    if (u.menu) return rpMenuNav(k, L), true;
    const n = 5 + L.length;
    if (up) u.sel = (u.sel + n - 1) % n;
    if (dn) u.sel = (u.sel + 1) % n;
    if (up || dn) u.msg = '';
    if (esc) return rpBackFrom('rplist'), true;
    if (u.sel < 5 && (h || ok)) {
      const d = h || 1, cyc = (v, m) => (v + d + m) % m;
      if (u.sel === 0) u.sort = cyc(u.sort, 3);
      if (u.sel === 1) u.fFav = cyc(u.fFav, 2);
      if (u.sel === 2) u.fRes = cyc(u.fRes, 3);
      if (u.sel === 3) u.fMine = cyc(u.fMine, rpNames('a').length + 1);
      if (u.sel === 4) u.fOpp = cyc(u.fOpp, rpNames('b').length + 1);
      u.top = 0;
    }
    const e = L[u.sel - 5];
    if (e) {
      if (ok) u.menu = { id: e.id, sel: 0, del: false };
      if (k === 'KeyF') rpFav(e);
      if (k === 'KeyM') rpMemo(e);
      if (k === 'Delete' || k === 'Backspace') u.menu = { id: e.id, sel: 3, del: true };
    }
    return true;
  }
  return false;
}
const RP_MENU = ['再生する', 'お気に入り', 'メモを書く', '削除する', '戻る'];
function rpMenuNav(k, L) {
  const u = RP.ui, m = u.menu, e = RP_LIST.find((x) => x.id === m.id);
  if (!e) return (u.menu = null);
  if (k === 'ArrowUp') { m.sel = (m.sel + 4) % 5; m.del = false; }
  if (k === 'ArrowDown') { m.sel = (m.sel + 1) % 5; m.del = false; }
  if (k === 'Escape') u.menu = null;
  if (k === 'Enter' || k === 'Space') {
    if (m.sel === 0) { u.menu = null; rpStart(e); }
    else if (m.sel === 1) rpFav(e);
    else if (m.sel === 2) rpMemo(e);
    else if (m.sel === 3) {
      if (!m.del) m.del = true;                                    // もう一度 Enter で削除
      else {
        RP_LIST = RP_LIST.filter((x) => x !== e);
        rpStore();
        u.menu = null;
        u.msg = 'リプレイを削除しました';
        u.sel = Math.min(u.sel, 4 + rpFiltered().length);
        if (u.sel < 5 && rpFiltered().length) u.sel = 5;
      }
    } else u.menu = null;
  }
}
function rpFav(e) {
  e.fav = !e.fav;
  rpStore();
  RP.ui.msg = e.fav ? 'お気に入りにしました' : 'お気に入りを外しました';
}
function rpMemo(e) {
  let m = null;
  try { m = prompt('メモ(40文字まで)', e.memo || ''); } catch (er) {}
  if (m == null) return;
  e.memo = m.slice(0, 40);
  rpStore();
  RP.ui.msg = 'メモを保存しました';
}
// ---- 再生の操作 ----
function rpToggle() {
  const P = RP.play;
  if (P.end) { rpRestart(); P.playing = true; return; }
  P.playing = !P.playing;
}
function rpRestart() {
  const P = RP.play;
  rpRestore(0);
  P.seek = null;
}
function rpStepBy(d) {
  const P = RP.play;
  P.playing = false;
  rpSeek(P.f + d);
}

// ---------------- 描画 ----------------
// 戦績・リプレイ一覧・保存上限の画面。描いたら true
function rpDrawScene() {
  if (sc === 'records') return rpDrawRecords(), true;
  if (sc === 'rplist') return rpDrawList(), true;
  if (sc === 'rpfull') return rpDrawFull(), true;
  return false;
}
function rpRow(e, x, y, on, w = W - 2 * x) {
  if (on) { g.fillStyle = '#fd03'; g.fillRect(x - 6, y - 19, w + 12, 28); }
  const c = on ? '#fff' : '#ccc';
  T(e.fav ? '★' : '☆', x + 8, y, 16, e.fav ? '#fd0' : '#666');
  T(rpDate(e.date), x + 26, y, 14, c, 'left');
  T(rpResult(e), x + 190, y, 14, e.mode === 'watch' ? '#9df' : e.win ? '#7f7' : '#f88', 'left');
  T(e.a.name + ' vs ' + e.b.name, x + 262, y, 14, c, 'left');
  T(RP_MODE_NAME[e.mode] || '', x + 470, y, 11, '#9ab', 'left');
  T(rpFightTime(e), x + 560, y, 14, c, 'left');
  T((e.rounds || 1) + 'R', x + 610, y, 14, c, 'left');
  if (e.memo) {
    let s = e.memo;
    g.font = 'bold 13px sans-serif';
    while (s.length > 1 && g.measureText(s).width > w - 650) s = s.slice(0, -1);
    T(s + (s !== e.memo ? '…' : ''), x + 645, y, 13, '#fd9', 'left');
  }
}
function rpRowHead(x, y, w = W - 2 * x) {
  g.fillStyle = '#fff2';
  g.fillRect(x - 6, y - 15, w + 12, 21);
  for (const [s, dx] of [['対戦日時', 26], ['勝敗', 190], ['キャラ(自分 vs 相手)', 262], ['時間', 560], ['R', 610], ['メモ', 645]]) T(s, x + dx, y, 12, '#9cf', 'left');
}
function rpDrawList() {
  const u = RP.ui, L = rpFiltered(), x0 = 50;
  dark('リプレイ');
  T('保存数 ' + RP_LIST.length + ' / ' + RP_MAX, W - 40, 40, 15, '#9cf', 'right');
  const mineN = rpNames('a'), oppN = rpNames('b');
  const rows = [
    '並び順: ◀ ' + RP_SORTS[u.sort] + ' ▶',
    'お気に入り: ◀ ' + (u.fFav ? '★ のみ' : 'すべて') + ' ▶',
    '勝敗: ◀ ' + ['すべて', '勝ち', '負け'][u.fRes] + ' ▶',
    '自分のキャラ: ◀ ' + (u.fMine ? mineN[u.fMine - 1] : 'すべて') + ' ▶',
    '相手のキャラ: ◀ ' + (u.fOpp ? oppN[u.fOpp - 1] : 'すべて') + ' ▶',
  ];
  rows.forEach((s, i) => {
    const on = u.sel === i, x = i < 3 ? 120 + i * 260 : 250 + (i - 3) * 300, y = i < 3 ? 110 : 136;
    T((on ? '▶ ' : '') + s, x, y, on ? 16 : 15, on ? '#fd0' : '#ccc');
  });
  rpRowHead(x0, 172);
  const vis = 9, rh = 31;
  if (u.sel >= 5) {
    const i = u.sel - 5;
    if (i < u.top) u.top = i;
    if (i >= u.top + vis) u.top = i - vis + 1;
  }
  u.top = Math.max(0, Math.min(u.top, Math.max(0, L.length - vis)));
  if (!L.length) T(RP_LIST.length ? '条件に合うリプレイがありません' : 'リプレイはまだありません(試合のあとに保存できます)', W / 2, 260, 18, '#aaa');
  L.slice(u.top, u.top + vis).forEach((e, j) => rpRow(e, x0, 200 + j * rh, u.sel === 5 + u.top + j));
  if (u.top > 0) T('▲', W / 2, 186, 12, '#aaa');
  if (u.top + vis < L.length) T('▼ ほか ' + (L.length - u.top - vis) + '件', W / 2, 200 + vis * rh - 8, 12, '#aaa');
  if (u.menu) {
    const e = RP_LIST.find((x) => x.id === u.menu.id);
    if (e) {
      const bx = W / 2 - 150, by = 170, bh = 5 * 30 + 64;
      g.fillStyle = '#000b';
      g.fillRect(0, 0, W, H);
      g.fillStyle = '#141a33';
      g.fillRect(bx, by, 300, bh);
      g.strokeStyle = '#fd0';
      g.lineWidth = 2;
      g.strokeRect(bx, by, 300, bh);
      T(e.a.name + ' vs ' + e.b.name + '  ' + rpResult(e), W / 2, by + 26, 15, '#fd0');
      RP_MENU.forEach((s, i) => {
        const on = u.menu.sel === i;
        const t = i === 1 ? (e.fav ? 'お気に入りを外す' : 'お気に入りにする') : i === 3 && u.menu.del ? 'もう一度 Enter で削除' : s;
        T((on ? '▶ ' : '') + t, W / 2, by + 60 + i * 30, on ? 18 : 16, on ? (i === 3 && u.menu.del ? '#f88' : '#fd0') : '#ddd');
      });
    }
  }
  T(u.msg || RP.ui.msg, W / 2, 492, 15, '#9f9');
  T('↑↓ 選択 / ←→ 並び順・絞り込みの変更 / Enter 決定 / F お気に入り / M メモ / Delete 削除 / Esc 戻る', W / 2, 520, 13, '#aaa');
}
function rpDrawRecords() {
  const u = RP.ui, all = save.w + save.l;
  dark('戦績');
  T('通算  ' + save.w + '勝 ' + save.l + '敗   勝率 ' + (all ? Math.round((save.w / all) * 100) : 0) + '%   RP ' + save.rp, W / 2, 120, 22, '#fd0');
  // 保存したリプレイから: よく使うキャラ
  const use = {};
  for (const e of RP_LIST) if (e.mode !== 'watch') use[e.a.name] = (use[e.a.name] || 0) + 1;
  const top3 = Object.entries(use).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n, c]) => n + '(' + c + ')').join('  ');
  T('保存したリプレイ ' + RP_LIST.length + '件' + (top3 ? '   よく使うキャラ: ' + top3 : ''), W / 2, 152, 15, '#9cf');
  T('最近のリプレイ', 60, 196, 16, '#fd0', 'left');
  const recent = RP_LIST.slice().sort((x, y) => y.date - x.date).slice(0, 6);
  rpRowHead(60, 222);
  if (!recent.length) T('リプレイはまだありません(試合のあとに保存できます)', W / 2, 262, 16, '#aaa');
  recent.forEach((e, j) => rpRow(e, 60, 250 + j * 31, u.recSel === j));
  [['リプレイ一覧(並び替え・絞り込み)', recent.length], ['戻る', recent.length + 1]].forEach(([s, i], j) => {
    const on = u.recSel === i;
    T((on ? '▶ ' : '') + s, W / 2, 448 + j * 30, on ? 20 : 17, on ? '#fd0' : '#ccc');
  });
  T(RP.ui.msg, W / 2, 500, 15, '#f99');
  T('↑↓ 選択 / Enter 再生・決定 / Esc 戻る', W / 2, 522, 14, '#aaa');
}
function rpDrawFull() {
  const u = RP.ui, L = RP_LIST.slice().sort((x, y) => y.date - x.date);
  dark('保存数がいっぱいです');
  T('リプレイは ' + RP_MAX + ' 件まで保存できます。消すリプレイを選んでください(★=お気に入り)', W / 2, 112, 16, '#fd9');
  rpRowHead(50, 146);
  const vis = 9, top = Math.max(0, Math.min(u.fullSel - 4, L.length + 1 - vis));
  L.slice(top, top + vis).forEach((e, j) => {
    const i = top + j;
    rpRow(e, 50, 174 + j * 31, u.fullSel === i);
    if (u.fullOk === i) T('もう一度 Enter で消して保存', W - 56, 174 + j * 31, 13, '#f88', 'right');
  });
  const on = u.fullSel === L.length;
  T((on ? '▶ ' : '') + '今回のリプレイは保存しない', W / 2, 174 + vis * 31 + 10, on ? 18 : 16, on ? '#fd0' : '#ccc');
  T('↑↓ 選択 / Enter 決定 / Esc 戻る', W / 2, 522, 14, '#aaa');
}
// 結果画面: 保存するかの確認(y0 = 上の位置)。確認中なら true(結果画面のメニューは出さない)
function rpDrawResult(y0 = 320) {
  const u = RP.ui;
  if (RP.pending) {
    T('リプレイを保存しますか?(' + RP_LIST.length + ' / ' + RP_MAX + ')', W / 2, y0, 18, '#fff');
    ['保存する', '保存しない'].forEach((s, i) => {
      const on = u.resSel === i, x = W / 2 + (i ? 90 : -90);
      if (on) { g.fillStyle = '#fd03'; g.fillRect(x - 70, y0 + 14, 140, 32); }
      T(s, x, y0 + 37, on ? 19 : 17, on ? '#fd0' : '#ccc');
    });
    T('←→ 選択 / Enter 決定', W / 2, y0 + 68, 13, '#aaa');
    return true;
  }
  if (u.resMsg) T(u.resMsg, W / 2, y0, 14, '#9f9');
  return false;
}
// ---- 再生中の画面(操作バー・フレーム表) ----
const RP_BAR_Y = 486;
function rpButtons() {
  const P = RP.play, y = RP_BAR_Y + 26, b = [];
  const add = (id, label, w) => b.push({ id, label, w });
  add('restart', '⏮ 最初', 70);
  add('back', '◀ 1F', 56);
  add('play', P.playing ? '⏸ 停止' : '▶ 再生', 78);
  add('fwd', '1F ▶', 56);
  add('slow', '－', 30);
  add('speed', '×' + P.speed, 52);
  add('fast', '＋', 30);
  add('table', 'フレーム表 ' + (P.table ? 'ON' : 'OFF'), 118);
  add('exit', '✕ 終了', 70);
  const gap = 8, tw = b.reduce((s, q) => s + q.w, 0) + gap * (b.length - 1);
  let x = W / 2 - tw / 2;
  for (const q of b) { q.x = x; q.y = y; q.h = 24; x += q.w + gap; }
  return b;
}
const RP_TL = { x: 70, w: W - 140, y: RP_BAR_Y + 8, h: 8 };
function rpDrawHUD() {
  const P = RP.play, e = P.d;
  T('REPLAY  ' + rpDate(e.date) + '  ' + (RP_MODE_NAME[e.mode] || '') + (e.mode === 'watch' ? '  Lv' + e.wla + ' vs Lv' + e.wlb : ''), W / 2, 72, 14, '#f9d');
  if (P.table) trDrawMeter(RP_FRAME_TOP);
  // 操作バー
  g.fillStyle = '#000c';
  g.fillRect(0, RP_BAR_Y - 6, W, H - RP_BAR_Y + 6);
  const t = P.seek != null ? P.seek : P.f, k = P.n ? t / P.n : 0;
  g.fillStyle = '#333';
  g.fillRect(RP_TL.x, RP_TL.y, RP_TL.w, RP_TL.h);
  g.fillStyle = '#e58';
  g.fillRect(RP_TL.x, RP_TL.y, RP_TL.w * k, RP_TL.h);
  g.fillStyle = '#fff';
  g.beginPath();
  g.arc(RP_TL.x + RP_TL.w * k, RP_TL.y + RP_TL.h / 2, 7, 0, 7);
  g.fill();
  T(rpTimeF(t), RP_TL.x - 8, RP_TL.y + 8, 12, '#fff', 'right');
  T(rpTimeF(P.n), RP_TL.x + RP_TL.w + 8, RP_TL.y + 8, 12, '#aaa', 'left');
  for (const q of rpButtons()) {
    const on = (q.id === 'table' && P.table) || (q.id === 'play' && P.playing);
    g.fillStyle = on ? '#5a3a66' : '#2a2f45';
    g.fillRect(q.x, q.y, q.w, q.h);
    g.strokeStyle = '#889';
    g.lineWidth = 1;
    g.strokeRect(q.x + 0.5, q.y + 0.5, q.w - 1, q.h - 1);
    T(q.label, q.x + q.w / 2, q.y + 17, 13, '#fff');
  }
  T('F ' + t + ' / ' + P.n, W - 12, RP_BAR_Y + 43, 11, '#aaa', 'right');
  T('Space 再生/停止  ←→ 1F  ↑↓ 速さ  PgUp/PgDn ±5秒  Home 最初  F フレーム表  Esc 終了', W / 2, RP_BAR_Y - 12, 12, '#fffa');
  if (P.seek != null) T('移動中… ' + Math.round((P.f / Math.max(1, P.seek)) * 100) + '%', W / 2, 250, 24, '#fff');
  else if (P.end) T('最後まで再生しました(Space で最初から)', W / 2, 330, 18, '#fd0');
  else if (!P.playing) T('一時停止中', W / 2, 330, 18, '#9df');
  if (P.warn) T(P.warn, W / 2, 360, 13, '#f99');
}
// ---- マウス・タッチ(操作バーのボタンとタイムライン) ----
function rpPointer(ev) {
  const r = cv.getBoundingClientRect();
  return { x: ((ev.clientX - r.left) / r.width) * W, y: ((ev.clientY - r.top) / r.height) * H };
}
function rpTimelineAt(x) {
  const P = RP.play;
  rpSeek(Math.round(((x - RP_TL.x) / RP_TL.w) * P.n));
}
cv.addEventListener('pointerdown', (ev) => {
  const P = RP.play;
  if (!P || sc !== 'fight') return;
  const p = rpPointer(ev);
  if (p.y >= RP_TL.y - 8 && p.y <= RP_TL.y + RP_TL.h + 8 && p.x >= RP_TL.x - 10 && p.x <= RP_TL.x + RP_TL.w + 10) {
    RP.ui.drag = true;
    P.playing = false;
    rpTimelineAt(p.x);
    ev.preventDefault();
    return;
  }
  for (const q of rpButtons()) {
    if (p.x < q.x || p.x > q.x + q.w || p.y < q.y || p.y > q.y + q.h) continue;
    ev.preventDefault();
    if (q.id === 'restart') rpRestart();
    if (q.id === 'back') rpStepBy(-1);
    if (q.id === 'play') rpToggle();
    if (q.id === 'fwd') rpStepBy(1);
    if (q.id === 'slow' || q.id === 'fast') P.speed = RP_SPEEDS[Math.max(0, Math.min(RP_SPEEDS.length - 1, RP_SPEEDS.indexOf(P.speed) + (q.id === 'fast' ? 1 : -1)))];
    if (q.id === 'speed') P.speed = 1;
    if (q.id === 'table') P.table = !P.table;
    if (q.id === 'exit') rpExit();
    return;
  }
});
addEventListener('pointermove', (ev) => {
  if (!RP.ui.drag || !RP.play) return;
  rpTimelineAt(rpPointer(ev).x);
});
addEventListener('pointerup', () => (RP.ui.drag = false));