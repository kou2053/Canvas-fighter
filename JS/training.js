// ============================================================
// training.js … トレーニングモードの機能
//   ・入力履歴(画面の左端=自分 / 右端=相手。新しい入力が上に来て、下へ流れる)
//   ・当たり判定の表示(自分 / 相手の食らい判定、攻撃判定・投げ判定・飛び道具の判定)
//   ・相手(ダミー)の行動: 棒立ち / しゃがみ / ジャンプ / シールド / ダッシュ / 投げ / 各技 / CPU
//     ガード(なし・ガード・ジャストガード)、硬直明けの行動(反撃)、行動の間隔
//   ・フレーム情報(最後に出した技の発生・持続・後隙、有利フレーム、ダメージ・コンボダメージ)
//   ・ポーズメニュー(Esc): キャラ変更・相手の行動・表示の切り替え・位置リセット など
//   読み込み順: … drawing.js → effect.js → training.js → script.js
//   使っている script.js の変数・関数: A / B / F / CH / opt / save / sv / fx / PJ / PT / hs / g / T / W / GY / fr /
//     ai / aiPress / aiSeqInput / aiHitIn / aiState / drawHitVolumes / keyName / boundAction / RK
// ============================================================

// ---- 設定(ポーズメニューで変えられる。ブラウザに保存される save.tr) ----
const TR_DEFAULT = {
  act: 'stand',      // 相手の行動(下の trActions の id)
  interval: 0,       // 行動の間隔(F)。0 = 動けるようになったらすぐ
  guard: 'none',     // 相手のガード: none / guard(攻撃が来たらシールド) / jg(ジャストガード)
  rev: 'none',       // 硬直明けの行動(やられ・ガードブレイクから動けるようになった瞬間): none / 行動の id
  hp: 'zero',        // 体力: zero(0になったら回復) / combo(コンボが終わったら回復)
  infShield: false,  // シールドが減らない
  hurtA: true,       // 自分の食らい判定
  hurtB: true,       // 相手の食らい判定
  atk: true,         // 攻撃判定・投げ判定
  hist: true,        // 入力履歴
  info: true,        // フレーム情報・ダメージ
  ftext: true,       // キャラの上に出る文字(着地 nF・後隙+nF など)
  pos: 'center',     // リセットの位置: center / leftWall(自分が左端) / rightWall(自分が右端)
  meter: true,       // 行動履歴(1F単位の状態を数字と文字で並べる)
  meterStop: false,
  gauge: 'full',      // SP ゲージ: full(いつも満タン) / normal(ふつうにたまる)  // フレーム表: false=いつも流れる / true=2人とも動ける状態が続くと止まる(次の行動で書き直す)
  bch: null,         // 相手のキャラ(null = ランダム)
};
const TR_INTERVALS = [0, 30, 60, 120];
const TR_GUARDS = [['none', 'なし'], ['guard', 'ガード'], ['jg', 'ジャストガード']];
const TR_HP = [['zero', '0になったら回復'], ['combo', 'コンボ後に回復']];
const TR_POS = [['center', '中央'], ['leftWall', '自分が左端'], ['rightWall', '自分が右端']];
const TR_SLOT_NAME = { n: 'Z', f: '→Z', b: '←Z', u: '↑Z', d: '↓Z', da: 'ダッシュZ', an: '空中Z', af: '空中→Z', au: '空中↑Z', ad: '空中↓Z',
  s: 'A', sf: '→A', sb: '←A', su: '↑A', sd: '↓A' };

let TR = null; // 設定と、動いている間の状態
function trInit() {
  if (TR) return;
  TR = { ...TR_DEFAULT, ...((typeof save !== 'undefined' && save.tr) || {}),
    paused: false, sel: 0, wait: 0, wasFree: true, revWait: 0, gHold: 0,
    swap: false, histA: [], histB: [], actA: [], actB: [], fA: [], fB: [], freeze: false, stepN: 0, prAcc: {}, last: null, lastId: -1, meas: null, adv: null, dmg: 0, combo: { n: 0, d: 0 }, prevHp: 0, prevCb: 0, prevSh: 0, hpWait: 0 };
}
function trSave() {
  const o = {};
  for (const k in TR_DEFAULT) o[k] = TR[k];
  save.tr = o;
  sv();
}
// キャラの上に出る文字(着地 nF など)を出すか
function trShowText() {
  return opt.mode === 'train' && (!TR || TR.ftext);
}

// ---- 相手の行動の一覧(相手のキャラの技から作る) ----
function trActions(p) {
  const L = [
    ['cpu', 'CPU(レベル ' + (opt.lv || '停止') + ')'],
    ['stand', '棒立ち'], ['crouch', 'しゃがみ(受け流し)'], ['jump', 'ジャンプ'], ['shield', 'シールド(ずっと)'],
    ['dash', '前ダッシュ'], ['backdash', 'バックダッシュ'], ['throw', '投げ'], ['apar', '空中受け流し(攻撃に合わせる)'],
  ];
  for (const k in p.ch.mv) {
    const m = p.ch.mv[k], how = m.cmd ? m.cmd.text + (m.air === true ? '(空中)' : '') : TR_SLOT_NAME[k] || k;
    L.push(['mv:' + k, m.nm + '  ' + how]);
  }
  return L;
}
function trRevActions(p) {
  return [['none', 'なし'], ...trActions(p).filter(([id]) => id !== 'cpu' && id !== 'stand' && id !== 'crouch' && id !== 'shield')];
}

// ---- 相手(ダミー)の入力 ----
const trFree = (p) => p.st === 'idle';
const trBlank = () => ({ l: 0, r: 0, u: 0, d: 0, at: 0, sh: 0, jp: 0, sp: 0, th: 0, dh: 0, dd: 0 });

// 行動 id を1F分の入力にする(できないときは何も押さない)。戻り値: 行動を始めたら true
function trDo(i, p, o, id) {
  const air = p.y < GY, tw = o.x > p.x ? 1 : -1;
  if (id === 'stand') return false;
  if (id === 'crouch') return (i.d = 1), false;
  if (id === 'shield') return (i.sh = 1), false;
  if (id === 'jump') return !air && trFree(p) ? ((i.jp = 1), true) : false;
  if (id === 'dash') return !air && trFree(p) ? ((i.dh = tw), true) : false;
  if (id === 'backdash') return !air && trFree(p) ? ((i.dh = -tw), true) : false;
  if (id === 'throw') return !air && trFree(p) ? ((i.th = 1), true) : false;
  if (id === 'apar') {                                              // 跳んで、攻撃が受付の真ん中に来るように ↓↓
    if (!air && trFree(p)) return (i.jp = 1), false;
    const k = air && trFree(p) ? trIncoming(p, o) : null, AP = AIR_PARRY;
    if (k != null && k <= AP.startup + AP.active - 1 && k > AP.startup + 1) return (i.dd = 1), true;   // 予測は少し遅めに出るので、受付の前寄りで押す
    return false;
  }
  if (!id.startsWith('mv:')) return false;
  const k = id.slice(3), m = p.ch.mv[k];
  if (!m) return false;
  const airMove = /^a[nfud]$/.test(k) || m.air === true;
  if (airMove) {
    if (!air && trFree(p)) return (i.jp = 1), false;                 // まず跳ぶ
    if (air && trFree(p) && p.vy > -3) return aiPress(i, p, k), true; // 頂点の近くで出す
    return false;
  }
  if (k === 'da') {
    if (!air && trFree(p)) return (i.dh = tw), false;               // まずダッシュ
    if (p.st === 'dash' && p.t > 6) return aiPress(i, p, k), true;
    return false;
  }
  if (air || !trFree(p)) return false;
  aiPress(i, p, k);
  return true;
}

// 攻撃が来るまでのF(来なければ null)。飛び道具も見る
function trIncoming(p, o) {
  const S = ST[opt.st];
  let best = null;
  if (o.st === 'atk' && o.mv && o.mv.rw > 0 && o.t <= o.mv.st + o.mv.ac) {
    const me = aiState(p, true);
    me.vx = 0;
    const h = aiHitIn(o, o.mv, o.f, aiState(o, true), me, S, o.t, 0, 0, -6);
    if (h) best = h.at;
  }
  for (const j of PJ) {
    if (j.own === p || (p.x - j.x) * j.vx <= 0) continue;
    const k = Math.max(1, (Math.abs(p.x - j.x) - 24 - j.r) / Math.abs(j.vx));
    // 弾が届くときの自分の高さ(空中なら落ち方も予測)で、体の上下に弾が重なるか
    const air = p.y < GY, py = air ? Math.min(GY, p.y + p.vy * k + 0.5 * S.g * ((p.ch.gm || 1)) * k * k) : p.y;
    if (j.y > py - 115 - j.r && j.y < py + j.r + 40 && k < 40) best = best == null ? k : Math.min(best, k);
  }
  return best;
}

function trainingInput(p, o, S) {
  trInit();
  let i = trBlank();
  // コマンド入力の途中なら続きを入れる
  if (p.aiSeq && p.aiSeq.length) {
    if (p.st === 'hit' || p.st === 'break' || p.st === 'held') p.aiSeq = null;
    else return trRecord(trHist(p), p, aiSeqInput(i, p, p.aiSeq.shift()));
  }
  if (TR.act === 'cpu') return trRecord(trHist(p), p, ai(p, o, opt.lv));
  const free = trFree(p);
  // 硬直(やられ・ガードブレイク)から動けるようになった瞬間 → 硬直明けの行動
  if (p.st === 'hit' || p.st === 'break' || p.st === 'held') TR.revWait = 10;
  else if (TR.revWait > 0) {
    TR.revWait--;
    if (TR.rev !== 'none' && free && p.y >= GY) {
      const started = trDo(i, p, o, TR.rev);
      if (started || TR.rev === 'jump') TR.revWait = 0;
      return trRecord(trHist(p), p, i);
    }
  }
  // ガード
  if (TR.guard !== 'none' && p.y >= GY && (free || p.st === 'shield')) {
    const k = trIncoming(p, o);
    // ガード: 相手が近いか攻撃が来るときはずっとシールド(早めに張るので、ふつうのガードになる)
    if (TR.guard === 'guard' && (k != null || Math.abs(o.x - p.x) < 220)) TR.gHold = Math.max(TR.gHold, (k ?? 0) + 4);
    // ジャストガード: 受付(6〜12F目)の真ん中で受けるように、当たる9F前に張る
    // ジャストガード: 押したフレームから受付(3F)なので、当たる直前(1F前)に押す。押し続けると成功のあとはふつうのガード
    if (TR.guard === 'jg' && k != null && (p.st === 'shield' || k <= 1)) TR.gHold = Math.max(TR.gHold, k + 3);
    if (TR.gHold > 0) {
      TR.gHold--;
      i.sh = 1;
      return trRecord(trHist(p), p, i);
    }
  } else TR.gHold = 0;
  // ふだんの行動(行動の間隔をあける)
  if (free && !TR.wasFree) TR.wait = TR.interval;
  TR.wasFree = free;
  if (TR.wait > 0 && free) TR.wait--;
  else trDo(i, p, o, TR.act);
  return trRecord(trHist(p), p, i);
}

// ---- 入力履歴 ----
const TR_ARROW = { 1: '↙', 2: '↓', 3: '↘', 4: '←', 5: '・', 6: '→', 7: '↖', 8: '↑', 9: '↗' };
const TR_BTNS = [['at', 'Z', '#f66'], ['sp', 'A', '#6af'], ['sh', 'X', '#6df'], ['jp', 'J', '#7e7'], ['th', 'G', '#fb4'], ['dh', '»', '#ddd'], ['dd', '⇊', '#9ff']];
function trRecord(list, p, i) {
  if (!TR) return i;
  const fx_ = (i.r ? 1 : 0) - (i.l ? 1 : 0), dir = 5 + fx_ * p.f + (i.d ? -3 : i.u ? 3 : 0),
    btn = TR_BTNS.filter(([k]) => i[k]).map(([k]) => k).join(','),
    last = list[0];
  if (last && last.dir === dir && last.btn === btn && !btn.includes('at') && !btn.includes('sp') && !btn.includes('jp') && !btn.includes('th') && !btn.includes('dh') && !btn.includes('dd')) last.n = Math.min(999, last.n + 1);
  else {
    list.unshift({ dir, btn, n: 1 });
    if (list.length > 20) list.pop();
  }
  return i;
}
function trDrawHist(list, x, right) {
  const rh = 19, y0 = 128;
  // フレーム表(地面の下)を出しているときは、それにかからない数だけ表示する
  const max = TR.meter ? Math.max(1, Math.floor((GY - y0 + 10) / rh)) : 20;
  list = list.slice(0, max);
  g.fillStyle = '#0007';
  g.fillRect(right ? x - 98 : x, y0 - 16, 98, rh * Math.max(1, list.length) + 6);
  list.forEach((e, k) => {
    const y = y0 + k * rh, a = 1 - k / 26;
    g.globalAlpha = a;
    const bx = right ? x - 92 : x + 4;
    T(String(e.n), bx + 22, y, 12, '#aaa', 'right');
    T(TR_ARROW[e.dir], bx + 36, y, 15, e.dir === 5 ? '#888' : '#fff');
    let cx = bx + 50;
    for (const [k2, label, col] of TR_BTNS) {
      if (!e.btn.split(',').includes(k2)) continue;
      g.fillStyle = col;
      g.beginPath();
      g.arc(cx + 6, y - 5, 7.5, 0, 7);
      g.fill();
      T(label, cx + 6, y - 1, 11, '#111');
      cx += 16;
    }
  });
  g.globalAlpha = 1;
}

// ---- 毎フレームの処理(script.js の upd から) ----
// 操作の入れ替え(Tab / ポーズメニュー): プレイヤーが動かすキャラ / ダミー(相手の行動の設定で動くキャラ)
const trPC = () => (TR && TR.swap ? B : A);
const trDummy = () => (TR && TR.swap ? A : B);
const trHist = (p) => (p === A ? TR.histA : TR.histB);
function trSwap() {
  TR.swap = !TR.swap;
  for (const p of [A, B]) p.aiSeq = null;
  TR.wait = TR.gHold = TR.revWait = 0;
  TR.meas = null;
  trFixAct();
}
function trainingRecordPlayer(i) {
  trInit();
  trRecord(trHist(trPC()), trPC(), i);
}
function trainingAfterStep() {
  trInit();
  trMeterRecord();
  const A = trPC(), B = trDummy();   // 技・有利フレーム・ダメージは「操作しているキャラ」から見る(入れ替え中は相手側から)
  // 最後に出した技(自分)
  if (A.st === 'atk' && A.mv && A.mvId !== TR.lastId) {
    TR.lastId = A.mvId;
    TR.last = A.mv;
  }
  // 当たった・ガードされた → 有利フレームを測りはじめる
  const hitNow = B.st === 'hit' && (TR.prevSt !== 'hit' || B.cb > TR.prevCb || B.hp < TR.prevHp),
    guardNow = B.st === 'shield' && B.sh < TR.prevSh - 1;
  if (hitNow || guardNow || (B.st === 'break' && TR.prevSt !== 'break')) TR.meas = { t: 0, a: null, b: null, kind: guardNow ? 'ガード' : 'ヒット' };
  if (TR.meas) {
    const m = TR.meas;
    m.t++;
    if (m.a == null && (A.st === 'idle' || A.st === 'shield')) m.a = m.t;
    if (m.b == null && (B.st === 'idle' || B.st === 'shield' || B.st === 'sdown')) m.b = m.t;
    if (m.a != null && m.b != null) {
      TR.adv = { v: m.b - m.a, kind: m.kind };
      TR.meas = null;
    } else if (m.t > 400) TR.meas = null;
  }
  // ダメージ
  if (B.hp < TR.prevHp) {
    const d = TR.prevHp - B.hp;
    TR.dmg = d;
    TR.combo = B.cb > 1 ? { n: B.cb, d: TR.combo.d + d } : { n: 1, d };
  }
  // 体力・シールド
  for (const p of [A, B]) {
    if (p.hp <= 0) p.hp = p.ch.hp;
    if (TR.infShield) p.sh = p.ch.shm || 60;
    if (TR.gauge === 'full') p.sg = spOf(p).max;   // SP ゲージ満タン
  }
  if (TR.hp === 'combo') {
    if (B.st !== 'hit' && B.st !== 'held' && B.st !== 'break' && A.st !== 'hit') TR.hpWait++;
    else TR.hpWait = 0;
    if (TR.hpWait > 40) for (const p of [A, B]) p.hp = p.ch.hp;
  }
  TR.prevHp = B.hp;
  TR.prevCb = B.cb;
  TR.prevSh = B.sh;
  TR.prevSt = B.st;
}

// ---- 始め・リセット・キャラ変更 ----
function trainingStart() {
  trInit();
  TR.swap = false; // 始めはいつも自分のキャラを操作
  if (TR.bch != null && CH[TR.bch]) B = F(TR.bch, 0, B.x, B.f);
  trFixAct();
  trReset();
}
function trFixAct() {
  const ids = trActions(trDummy()).map(([id]) => id);
  if (!ids.includes(TR.act)) TR.act = 'stand';
  if (TR.rev !== 'none' && !ids.includes(TR.rev)) TR.rev = 'none';
}
function trReset() {
  const P = { center: [300, 660], leftWall: [60, 180], rightWall: [W - 60, W - 180] }[TR.pos] || [300, 660];
  for (const [p, x] of [[A, P[0]], [B, P[1]]]) {
    Object.assign(p, { x, y: GY, vx: 0, vy: 0, st: 'idle', t: 0, mv: null, hp: p.ch.hp, sh: p.ch.shm || 60, cb: 0, cbMoves: {}, moveLock: 0, aiSeq: null, hit: false });
    p.f = x < (p === A ? P[1] : P[0]) ? 1 : -1;
  }
  for (const p of [A, B]) if (p.pup) p.pup = null;   // パペット(ロロ)は次のフレームに本人の前へ置き直す(puppet.js)
  PJ = [];
  fx = [];
  PT = [];
  FIRE = [];
  hs = 0;
  TR.meas = null;
  TR.wait = 0;
  TR.gHold = 0;
  TR.prevHp = B.hp;
  TR.prevSh = B.sh;
}
function trSetChar(isA, c) {
  if (isA) {
    opt.ch = c;
    A = F(c, save.sk[c] || 0, A.x, A.f);
  } else {
    TR.bch = c;
    B = F(c, 0, B.x, B.f);
    trFixAct();
  }
  trReset();
}

// ---- ポーズメニュー ----
const onoff = (v) => (v ? 'ON' : 'OFF');
function trMenuRows() {
  const acts = trActions(trDummy()), revs = trRevActions(trDummy()), nm = (L, id) => (L.find(([k]) => k === id) || L[0])[1];
  const rows = [
    ['resume', '再開'],
    ['swap', '操作するキャラ(Tab): ◀ ' + (TR.swap ? '相手(' + B.ch.nm + ')' : '自分(' + A.ch.nm + ')') + ' ▶'],
    ['charA', '自分のキャラ: ◀ ' + A.ch.nm + ' ▶'],
    ['charB', '相手のキャラ: ◀ ' + B.ch.nm + ' ▶'],
    ['act', (TR.swap ? '自分のキャラの行動' : '相手の行動') + ': ◀ ' + nm(acts, TR.act) + ' ▶'],
  ];
  if (TR.act === 'cpu') rows.push(['lv', 'CPUレベル: ◀ ' + (opt.lv || '停止') + ' ▶']);
  else rows.push(['interval', '行動の間隔: ◀ ' + (TR.interval ? TR.interval + 'F' : 'すぐ') + ' ▶']);
  rows.push(
    ['guard', '相手のガード: ◀ ' + nm(TR_GUARDS, TR.guard) + ' ▶'],
    ['rev', '硬直明けの行動: ◀ ' + nm(revs, TR.rev) + ' ▶'],
    ['hp', '体力: ◀ ' + nm(TR_HP, TR.hp) + ' ▶'],
    ['infShield', 'シールドが減らない: ' + onoff(TR.infShield)],
    ['gauge', 'SP ゲージ: ◀ ' + (TR.gauge === 'full' ? 'いつも満タン' : 'ふつうにたまる') + ' ▶'],
    ['hurtA', '自分の食らい判定: ' + onoff(TR.hurtA)],
    ['hurtB', '相手の食らい判定: ' + onoff(TR.hurtB)],
    ['atk', '攻撃判定・投げ判定: ' + onoff(TR.atk)],
    ['hist', '入力履歴: ' + onoff(TR.hist)],
    ['info', 'フレーム情報・ダメージ: ' + onoff(TR.info)],
    ['ftext', 'キャラの上の文字(着地 nF など): ' + onoff(TR.ftext)],
    ['meter', '行動履歴(F): ' + onoff(TR.meter)],
    ['meterStop', 'フレーム表の流れ方: ◀ ' + (TR.meterStop ? '動きがないと止まる' : 'いつも流れる') + ' ▶'],
    ['pos', 'リセットの位置: ◀ ' + nm(TR_POS, TR.pos) + ' ▶'],
    ['reset', '位置をリセット(R)'],
    ['quit', 'メニューに戻る'],
  );
  return rows;
}
const cycle = (L, v, h) => L[(L.indexOf(v) + h + L.length) % L.length];
function trMenuChange(id, h, ok) {
  const acts = trActions(trDummy()).map(([k]) => k), revs = trRevActions(trDummy()).map(([k]) => k);
  if (id === 'resume' && ok) TR.paused = false;
  else if (id === 'swap' && (h || ok)) trSwap();
  else if (id === 'charA' && h) trSetChar(true, (CH.indexOf(A.ch) + h + CH.length) % CH.length);
  else if (id === 'charB' && h) trSetChar(false, (CH.indexOf(B.ch) + h + CH.length) % CH.length);
  else if (id === 'act' && h) TR.act = cycle(acts, TR.act, h);
  else if (id === 'lv' && h) opt.lv = Math.max(0, Math.min(10, opt.lv + h));
  else if (id === 'interval' && h) TR.interval = cycle(TR_INTERVALS, TR.interval, h);
  else if (id === 'guard' && h) TR.guard = cycle(TR_GUARDS.map(([k]) => k), TR.guard, h);
  else if (id === 'rev' && h) TR.rev = cycle(revs, TR.rev, h);
  else if (id === 'hp' && h) TR.hp = cycle(TR_HP.map(([k]) => k), TR.hp, h);
  else if (id === 'pos' && h) TR.pos = cycle(TR_POS.map(([k]) => k), TR.pos, h);
  else if (id === 'gauge' && (h || ok)) TR.gauge = TR.gauge === 'full' ? 'normal' : 'full';
  else if (['infShield', 'hurtA', 'hurtB', 'atk', 'hist', 'info', 'ftext', 'meter', 'meterStop'].includes(id) && (h || ok)) TR[id] = !TR[id];
  else if (id === 'reset' && ok) {
    trReset();
    TR.paused = false;
  } else if (id === 'quit' && ok) {
    TR.paused = false;
    sc = 'main';
    sel = 0;
  } else return;
  trSave();
}

// 対戦中のキー(script.js の nav から)。処理したら true
function trainingNav(k) {
  trInit();
  if (k === 'Escape') {
    TR.paused = !TR.paused;
    TR.sel = 0;
    return true;
  }
  if (TR.paused) {
    const rows = trMenuRows(), n = rows.length;
    if (k === 'ArrowUp') TR.sel = (TR.sel + n - 1) % n;
    if (k === 'ArrowDown') TR.sel = (TR.sel + 1) % n;
    const h = (k === 'ArrowRight') - (k === 'ArrowLeft'), ok = k === 'Enter' || k === 'Space';
    TR.sel = Math.min(TR.sel, n - 1);
    if (h || ok) trMenuChange(rows[TR.sel][0], h, ok);
    return true;
  }
  if (boundAction(k)) return false; // 操作に割り当てたキーはトレーニングの機能に使わない
  if (/^Digit[0-9]$/.test(k)) (opt.lv = +k[5]), (TR.act = 'cpu'); // 0=棒立ち 1〜9
  else if (k === 'Minus') (opt.lv = 10), (TR.act = 'cpu');
  else if (k === 'KeyH') {
    const on = !(TR.hurtA && TR.hurtB);
    TR.hurtA = TR.hurtB = on;
  } else if (k === 'KeyR') trReset();
  else if (k === 'Tab') trSwap();                                      // 操作するキャラの入れ替え
  else if (k === 'KeyF') TR.meter = !TR.meter;                        // 行動履歴の表示
  else if (k === 'KeyP') { TR.freeze = !TR.freeze; TR.stepN = 0; TR.prAcc = {}; return true; }   // 一時停止(コマ送り)
  else if (k === 'KeyN' || k === 'Period') { if (TR.freeze) TR.stepN++; return true; }           // 一時停止中に 1F 進める
  else return false;
  trSave();
  return true;
}
function trainingPaused() {
  return opt.mode === 'train' && TR && TR.paused;
}

// ---- 描画 ----
// 戦っている場所に描く物(食らい判定・攻撃判定)。キャラを描いたあとに呼ぶ
function trainingDrawWorld() {
  trInit();
  if (TR.hurtB) drawHitVolumes(B);
  if (TR.hurtA) drawHitVolumes(A);
  if (!TR.atk) return;
  g.save();
  for (const p of [A, B]) {
    const m = p.mv;
    if (p.st === 'atk' && m && m.rw > 0 && p.t <= m.st + m.ac) {
      const bx = p.f > 0 ? p.x + m.rx : p.x - m.rx - m.rw, by = p.y + m.ry, active = p.t > m.st;
      if (active) {                                     // 当たり判定が出ている: 赤く塗る
        g.fillStyle = 'rgba(255,40,40,.35)';
        g.fillRect(bx, by, m.rw, m.rh);
        g.strokeStyle = '#ff3b3b';
        g.lineWidth = 2.5;
        g.setLineDash([]);
      } else {                                          // 発生前: これから出る場所を点線で
        g.strokeStyle = 'rgba(255,170,90,.8)';
        g.lineWidth = 1.5;
        g.setLineDash([5, 4]);
      }
      g.strokeRect(bx, by, m.rw, m.rh);
      g.setLineDash([]);
      if (active) T(m.nm, bx + m.rw / 2, by - 4, 11, '#fbb');
    }
    if (p.st === 'throw' && p.tg < 0 && (p.thr || p.ch.th)) {      // 投げの掴み判定(コマンド投げは技の設定)
      const Tw = p.thr || p.ch.th, B_ = Tw.box, bx = p.f > 0 ? p.x + B_.x : p.x - B_.x - B_.w, active = p.t > Tw.startup && p.t <= Tw.startup + Tw.active;
      if (p.t <= Tw.startup + Tw.active) {
        g.fillStyle = active ? 'rgba(255,200,0,.35)' : 'rgba(255,200,0,.08)';
        g.fillRect(bx, p.y + B_.y, B_.w, B_.h);
        g.strokeStyle = '#fc3';
        g.lineWidth = active ? 2.5 : 1;
        g.strokeRect(bx, p.y + B_.y, B_.w, B_.h);
      }
    }
  }
  for (const j of PJ) {                                  // 飛び道具の判定
    g.strokeStyle = '#ff3b3b';
    g.lineWidth = 2;
    g.strokeRect(j.x - j.r, j.y - j.r, j.r * 2, j.r * 2);
  }
  g.restore();
}

// 画面の上に重ねる物(入力履歴・フレーム情報・案内・ポーズメニュー)
function trainingDrawHUD() {
  trInit();
  g.fillStyle = '#1d1826c8';
  g.fillRect(W / 2 - 250, 90, 500, 20);
  T('Esc:メニュー  R:リセット  H:判定  F:フレーム  P:停止  N:1F  Tab:操作入れ替え', W / 2, 104, 12, '#ffd23f');
  if (TR.swap) {   // 操作の入れ替え中
    g.fillStyle = '#000a';
    g.fillRect(W / 2 - 260, 180, 520, 22);
    T('相手(' + B.ch.nm + ')を操作中   自分のキャラは「行動」の設定で動きます   Tab で戻す', W / 2, 196, 14, '#fc8');
  }
  if (TR.freeze) { g.fillStyle = '#1d1826c8'; g.fillRect(W / 2 - 330, 208, 660, 26); }
  if (TR.freeze) T('一時停止中   N(または .)で 1F 進む / キーを押しながら N でその入力のまま進む / P で再開', W / 2, 226, 15, '#7ff');
  if (TR.meter) trDrawMeter();
  if (TR.hist) {
    trDrawHist(TR.histA, 6, false);
    trDrawHist(TR.histB, W - 6, true);
  }
  if (TR.info) {
    const lines = [];
    if (TR.last) lines.push(['技: ' + TR.last.nm + '   発生 ' + TR.last.st + 'F / 持続 ' + TR.last.ac + 'F / 後隙 ' + TR.last.rc + 'F', '#fff']);
    if (TR.adv) lines.push(['有利フレーム(' + TR.adv.kind + '): ' + (TR.adv.v > 0 ? '+' : '') + TR.adv.v + 'F', TR.adv.v >= 0 ? '#7f7' : '#f88']);
    if (TR.combo.n) lines.push(['ダメージ: ' + TR.dmg + '   コンボ: ' + TR.combo.n + 'HIT ' + TR.combo.d, '#9df']);
    if (lines.length) {
      g.fillStyle = '#0007';
      g.fillRect(W / 2 - 190, 114, 380, lines.length * 17 + 8);
      lines.forEach(([s, c], k) => T(s, W / 2, 128 + k * 17, 13, c));
    }
  }
}
function trainingDrawPause() {
  if (!TR || !TR.paused) return;
  const rows = trMenuRows(), rh = Math.min(23, Math.floor((H - 90) / rows.length)), h = rows.length * rh + 50, y0 = (H - h) / 2;
  g.fillStyle = '#000b';
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#1d1826';
  g.fillRect(W / 2 - 250, y0, 500, h);
  g.strokeStyle = '#ffd23f';
  g.lineWidth = 2;
  g.strokeRect(W / 2 - 250, y0, 500, h);
  T('ポーズ', W / 2, y0 + 26, 20, '#fd0');
  rows.forEach(([, s], k) => {
    const on = k === TR.sel;
    T((on ? '▶ ' : '') + s, W / 2 - 220, y0 + 52 + k * rh, on ? 16 : 15, on ? '#fd0' : '#ddd', 'left');
  });
  T('↑↓ 選択 / ←→ 変更 / Enter 決定 / Esc 閉じる', W / 2, y0 + h + 18, 13, '#aaa');
}

// ============================================================
// 行動履歴(1F 単位の自分・相手の状態)。入力履歴と同じ形: 新しいものが上、古いものは下へ流れる
//   1行 = 同じ状態が続いた区間。左の数字 = その区間の F 数(いまの区間は「経過/全体」)
//   右に状態の名前(色つき)と、技名などの補足
//   ヒットストップ中は数えない(技データの F と同じ数え方)
// ============================================================
const TR_KINDS = {
  idle: ['#2a3040', '動ける'], crouch: ['#4a5878', 'しゃがみ'], air: ['#3a4a70', '空中'], lock: ['#555a66', '移動ロック'],
  startup: ['#2fcf66', '前隙'], active: ['#ff4455', '持続'], recovery: ['#3a8cff', '後隙'],
  hit: ['#ffcc22', '硬直'], brk: ['#ff8800', 'ガードブレイク'], held: ['#b05ab0', '掴まれ'],
  jg: ['#66ffff', 'ジャスガ受付'], gap: ['#a050ff', 'ガード判定なし'], guard: ['#139a88', 'ガード'], sdown: ['#68788a', 'ガード解除'],
  inv: ['#ffffff', '無敵'], dash: ['#93a8aa', 'ダッシュ'], jsq: ['#c9c955', 'ジャンプ前'], land: ['#c8843c', '着地硬直'],
  apS: ['#4d9a8a', '空受け流し 出始め'], apA: ['#88ffee', '空受け流し 受付'], apW: ['#cc5555', '空受け流し 隙'],
  thS: ['#ff88ff', '投げ 発生'], thA: ['#ff3cff', '投げ 掴み判定'], thW: ['#c070c0', '投げ 隙'],
};
// いまのフレームの状態の種類
function trFrameKind(p) {
  const m = p.mv, air = p.y < GY;
  switch (p.st) {
    case 'atk':
      if (!m) return 'recovery';
      return p.t <= m.st ? 'startup' : p.t <= m.st + m.ac ? 'active' : 'recovery';
    case 'hit': return 'hit';
    case 'break': return 'brk';
    case 'held': return 'held';
    case 'shield': return isJustGuard(p) ? 'jg' : isGuarding(p) ? 'guard' : 'gap';
    case 'sdown': return 'sdown';
    case 'dash': return dashInvuln(p) ? 'inv' : 'dash';
    case 'jsq': return 'jsq';
    case 'land': return 'land';
    case 'apar': return p.t <= AIR_PARRY.startup ? 'apS' : p.t <= AIR_PARRY.startup + AIR_PARRY.active ? 'apA' : 'apW';
    case 'throw': {
      const T = p.thr || p.ch.th;
      if (p.tg >= 0 || !T) return 'thW';
      return p.t <= T.startup ? 'thS' : p.t <= T.startup + T.active ? 'thA' : 'thW';
    }
    default:
      return air ? 'air' : p.moveLock > 0 ? 'lock' : p.dn ? 'crouch' : 'idle';   // しゃがみ(↓だけ押して待機)は別の表示
  }
}
const trNeutral = (k) => k === 'idle' || k === 'air' || k === 'crouch';
const TR_ACT_TEXT = { idle: '#999', crouch: '#9cf', air: '#9ab', lock: '#bbb', recovery: '#6af', guard: '#3dc', sdown: '#9ab', held: '#d8d', thW: '#c7c', apW: '#f88', land: '#e9a050' };
// 区間の補足(技名など)と、同じ区間かどうかを見分ける印
function trActTag(p, k) {
  const m = p.mv;
  switch (p.st) {
    case 'atk': return { id: 'a' + p.mvId, s: (m ? m.nm : '') + (p.crAtk ? ' ×' + CROUCH_ATTACK : '') + (p.rcExtra && k === 'recovery' ? ' 受け流され+' + p.rcExtra : '') };
    case 'hit': return { id: 'h' + (p.cb | 0), s: (p.cr ? '受け流し' : p.y < GY && !p.airStunCanExpire ? '空中(着地まで)' : '') };
    case 'shield': return { id: 's', s: k === 'guard' ? (p.jgFree ? 'ジャスガ後' : '') : '' };
    case 'dash': return { id: 'd', s: p.bd ? 'バック' : '前' };
    case 'throw': return { id: 't', s: p.tg >= 0 ? '投げ中' : '' };
    default: return { id: '', s: k === 'air' && p.apFail ? '受け流し失敗' : '' };
  }
}
// いまの区間の全体の F 数(わかるものだけ。わからなければ 0)
function trActTotal(p, k, n) {
  const m = p.mv, A_ = AIR_PARRY, Th = p.thr || p.ch.th;
  switch (k) {
    case 'startup': return m ? m.st : 0;
    case 'active': return m ? m.ac : 0;
    case 'recovery': return m ? m.rc + (p.rcExtra || 0) : 0;
    case 'hit': case 'brk': return p.y < GY && p.st === 'hit' && !p.airStunCanExpire ? 0 : n + Math.max(0, p.t - 1);
    case 'jg': return jgWin(p);
    case 'gap': return JUST_GUARD.gap;
    case 'sdown': return 10;
    case 'inv': return p.bd ? DASH_INVULN.back : DASH_INVULN.front;
    case 'dash': return 14 - (p.bd ? DASH_INVULN.back : DASH_INVULN.front);
    case 'jsq': return p.ch.jsq | 0;
    case 'land': return p.lg || 0;
    case 'lock': return n + Math.max(0, p.moveLock - 1);
    case 'apS': return A_.startup;
    case 'apA': return A_.active;
    case 'apW': return A_.whiff;
    case 'thS': return Th ? Th.startup : 0;
    case 'thA': return Th ? Th.active : 0;
    default: return 0;
  }
}
function trActRecord(list, p) {
  const k = trFrameKind(p), tag = trActTag(p, k), last = list[0];
  if (last && last.k === k && last.id === tag.id) {
    last.n = Math.min(999, last.n + 1);
    last.s = tag.s;
  } else {
    if (last) last.done = true;
    list.unshift({ k, id: tag.id, s: tag.s, n: 1 });
    if (list.length > 20) list.pop();
  }
  list[0].tot = trActTotal(p, k, list[0].n);
}
const TR_FRAMES = 20;   // 横に並べるF数(新しい 20F だけ残す)
// 1F の状態の短い名前(色は TR_KINDS / TR_ACT_TEXT)
const TR_ABBR = {
  idle: '動ける', crouch: 'しゃがみ', air: '空中', lock: 'ロック', startup: '前隙', active: '持続', recovery: '後隙', hit: '硬直', brk: '崩れ', held: '掴まれ',
  jg: 'ジャスガ', gap: '判定無', guard: 'ガード', sdown: '解除', inv: '無敵', dash: 'ダッシュ', jsq: '踏切', land: '着地',
  apS: '出始め', apA: '受流し', apW: '失敗', thS: '投げ', thA: '掴み', thW: '投隙',
};
// 止まっている = 地上で動ける状態(立ち・歩き・ゆっくり歩き)。空中・しゃがみは止まっていない扱い
const trStill = (p) => trFrameKind(p) === 'idle';
function trMeterRecord() {
  // 設定(ポーズメニュー「フレーム表の流れ方」)
  //   いつも流れる: 毎フレーム記録する(2人とも動ける状態でも止めない)
  //   動きがないと止まる: 2人とも地上で動ける状態(歩きも含む。空中・しゃがみは除く)が 4F 続いたら止める。20F 以上あいて次の行動が始まったら表を書き直す
  const quiet = trStill(A) && trStill(B);
  if (quiet) TR.quiet = (TR.quiet | 0) + 1;
  else {
    if (TR.meterStop && (TR.quiet | 0) > 20) TR.actA.length = TR.actB.length = TR.fA.length = TR.fB.length = 0;
    TR.quiet = 0;
  }
  trActRecord(TR.actA, A);
  trActRecord(TR.actB, B);
  if (TR.meterStop && quiet && TR.quiet > 4) return;
  for (const [L, F] of [[TR.actA, TR.fA], [TR.actB, TR.fB]]) {
    const e = L[0];
    F.push({ k: e.k, n: e.n, tot: e.tot, s: e.s, id: e.id });
    if (F.length > TR_FRAMES) F.shift();
  }
}
// 地面の下に 1F ずつ並べる。上の段=自分 / 下の段=相手。左が古く、右が新しい(2人の同じ列は同じF)
//   1マス = 1F。上の文字 = 状態(前=前隙 持=持続 後=後隙 …) / 下の数字 = その状態の何F目か
//   いちばん上の行に、いまの状態をくわしく(何F目/全体)
function trDrawMeter(top = GY + 4) {   // top: 表の上の位置(リプレイでは別の場所に出す)
  const cw = 42, x0 = W / 2 - (TR_FRAMES * cw) / 2 + 16, rows = [TR.fA, TR.fB];
  g.save();
  g.fillStyle = '#000c';
  g.fillRect(x0 - 42, top, TR_FRAMES * cw + 50, 80);
  // いまの状態
  [[TR.actA, '自分', '#bdf', x0 - 36, 'left'], [TR.actB, '相手', '#fbb', x0 + TR_FRAMES * cw, 'right']].forEach(([L, nm, c, x, al]) => {
    const e = L[0];
    if (!e) return;
    const t = TR_KINDS[e.k][1] + ' ' + (e.tot && !trNeutral(e.k) ? e.n + '/' + e.tot : e.n) + 'F' + (e.s ? '  ' + e.s : '');
    T(nm + ': ' + t, x, top + 13, 12, c, al);
  });
  rows.forEach((F, r) => {
    const y = top + 19 + r * 30;
    T(r ? '相手' : '自分', x0 - 21, y + 18, 12, r ? '#fbb' : '#bdf');
    for (let i = 0; i < TR_FRAMES; i++) {
      const x = x0 + i * cw, e = F[i];
      g.fillStyle = e ? '#1c2230' : '#111';
      g.fillRect(x, y, cw - 2, 28);
      if (!e) continue;
      const [col] = TR_KINDS[e.k], tc = TR_ACT_TEXT[e.k] || col, last = !!F[i + 1] && (F[i + 1].k !== e.k || F[i + 1].id !== e.id);
      if (last && !trNeutral(e.k)) { g.fillStyle = '#ffffff22'; g.fillRect(x, y, cw - 2, 28); }   // 区間の最後のF
      if (i === F.length - 1) { g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.strokeRect(x + 0.75, y + 0.75, cw - 3.5, 26.5); }   // いまのF
      T(TR_ABBR[e.k] || '?', x + cw / 2 - 1, y + 12, 10, tc);
      T(e.tot && !trNeutral(e.k) ? e.n + '/' + e.tot : String(e.n), x + cw / 2 - 1, y + 25, 11, last || i === F.length - 1 ? '#fff' : '#aaa');   // 何F目/全体
    }
  });
  g.restore();
}
// 一時停止(コマ送り)。script.js の upd の最初から呼ぶ。止めるときは true
//   止まっている間に押したキーは覚えておき、N で 1F 進めるときにまとめて入力する(押しっぱなしのキーはそのまま効く)
function trFrozenGate() {
  if (!TR || !TR.freeze || TR.paused) return false;
  if (TR.stepN > 0) {
    TR.stepN--;
    Object.assign(pr, TR.prAcc);
    TR.prAcc = {};
    return false;
  }
  for (const k in pr) if (pr[k]) TR.prAcc[k] = 1;
  return true;
}