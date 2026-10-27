// ============================================================
// net.js … オンライン対戦(ランク・カジュアル・プライベート)
//   サーバー(リポジトリの直下の server.js)と WebSocket でつながり、2人の入力を交換して同じ試合を両方の画面で進める。
//
//   ■ しくみ(ロールバック方式)
//     ・ゲームは「入力」だけで進み方が決まる(game_spec.js の【オンライン対戦に向けた決まり】)。
//       両方の画面で同じ種(seed)から試合を始め、毎Fの2人分の入力を同じ順番で使えば、同じ試合になる。
//     ・自分の入力は NET_DELAY(4)F 先のフレーム用として送る。2人とも同じ値(どちらかだけ有利にならないように)。
//       相手の入力が「使う時」までに届きやすくなるので、予想が外れる(ワープする)ことが減る。
//     ・相手の入力がまだ届いていないフレームは「相手は前と同じキーを押し続けている」と予想して先に進める。
//       届いたら、2人の入力がそろっている所(確定した状態)まで戻って進め直す(ロールバック)。
//       予想が外れて位置がずれたときは、見た目だけ数Fかけて正しい位置へなめらかに寄せる(netVisApply。試合の計算には使わない)。
//     ・予想で進めるのは NET_MAX_PREDICT(14)F まで。それより相手が遅れているときは待つ(画面に「通信待ち」)。
//     ・試合の結果(K.O.)は、確定した状態でしか決めない(予想の途中で勝負がついても、確定するまで待つ)。
//     ・左(side 0)= A、右(side 1)= B。自分がどちらかはサーバーが決める。
//     ・120F ごとに状態の要約(ハッシュ)を送り合い、ずれていたら「同期ずれ」と表示する(ブラウザの違いなどで起きうる)。
//
//   ■ サーバーの場所
//     ・ふつうは、ゲームを開いたページと同じサーバー(Render の Web Service で server.js を動かす)。
//     ・別のサーバーを使うときは、URL の後ろに ?server=wss://xxxx.onrender.com を付ける(または NET_SERVER を書きかえる)。
// ============================================================

const NET_SERVER = '';                 // 空 = ゲームを開いたページと同じサーバー
const NET_PROTO = 4;                   // 通信の決まりの版(変えたら古い版の相手とはマッチしない)
const NET_HASH_EVERY = 120;            // 状態の要約を送る間隔(F)
const NET_STALL_TEXT = 6;              // これ以上待ったら「通信待ち」を出す(F)

const NET = {
  on: false,          // オンライン対戦の試合中(または準備中)
  ws: null,
  state: 'off',       // off / privsel / connecting / waiting / matched / fight / closed / error
  msg: '',            // 画面に出す説明
  code: '',           // プライベートのルームコード
  side: 0,            // 0 = 左(A) / 1 = 右(B)
  delay: 4,           // 入力の遅れ(F)。いつも NET_DELAY
  vis: { off: [0, 0, 0, 0, 0, 0, 0, 0], pos: new Map(), lastF: -1, saved: null },   // 見た目のずれをなめらかにする(netVisApply)
  seed: 1,
  players: null,      // [左の情報, 右の情報] { ch, sk, name, rp, st }
  f: 0,               // 次に進めるフレーム番号
  sent: -1,           // 送った自分の入力の最後のフレーム番号
  inp: [new Map(), new Map()],   // フレーム番号 → 入力(ビット)。[左, 右]
  st: [{ tp: {}, ddKeep: 0 }, { tp: {}, ddKeep: 0 }],   // 入力から作る値(ダッシュの2回押しなど)の記録。[左, 右]
  pend: 0,            // 待っている間に押したボタン(押した瞬間のビット)。次に送る入力に足す
  stall: 0,           // 今、何F待っているか
  rtt: 0,             // サーバーまでの往復の時間(ms)
  hashes: new Map(),  // フレーム番号 → 自分の状態の要約
  desync: false,
  oppLeft: false,
  pingT: {},
};

// ---- サーバーへつなぐ ----
function netUrl() {
  const q = new URLSearchParams(location.search).get('server');
  if (q) return q.replace(/\/$/, '') + '/ws';
  if (NET_SERVER) return NET_SERVER.replace(/\/$/, '') + '/ws';
  return (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';
}
function netVersion() { return NET_PROTO + ':' + CH.map((c) => c.nm).join('|'); }
function netSend(o) { if (NET.ws && NET.ws.readyState === 1) NET.ws.send(JSON.stringify(o)); }
function netReset() {
  Object.assign(NET, { lf: 0, fc: 0, conf: null, inject: null, predicting: false, lastKnown: [0, 0], lastKnownF: -1,
    vis: { off: [0, 0, 0, 0, 0, 0, 0, 0], pos: new Map(), lastF: -1, saved: null },
    inp: [new Map(), new Map()], st: [{ tp: {}, ddKeep: 0 }, { tp: {}, ddKeep: 0 }], pend: 0, stall: 0, hashes: new Map(), desync: false, oppLeft: false });
}
// オンラインのモードを始める(キャラ選択の START から)。プライベートは、まずコードの入力(作る / 入る)
function netBegin() {
  netClose();
  NET.on = true;
  NET.code = '';
  NET.msg = '';
  sc = 'match';
  if (opt.mode === 'priv') { NET.state = 'privsel'; return; }
  netConnect();
}
function netConnect() {
  NET.state = 'connecting';
  NET.msg = 'サーバーに接続しています…(しばらく使われていないと、起動に1分ほどかかります)';
  let ws;
  try { ws = new WebSocket(netUrl()); } catch (e) { return netError('サーバーに接続できません'); }
  NET.ws = ws;
  ws.onopen = () => {
    NET.msg = '通信の速さを測っています…';
    let n = 0;
    const ts = [];
    const ping = () => { NET.pingT[n] = performance.now(); netSend({ t: 'ping', c: n }); };
    NET.onPong = (c) => {
      ts.push(performance.now() - NET.pingT[c]);
      if (++n < 5) return ping();
      ts.sort((a, b) => a - b);
      NET.rtt = (ts[0] + ts[1] + ts[2]) / 3;           // 遅かった2回は除く(一時的なゆれで入力の遅れが増えないように)
      NET.onPong = null;
      netJoin();
    };
    ping();
  };
  ws.onmessage = (e) => { let m; try { m = JSON.parse(e.data); } catch (er) { return; } netOnMessage(m); };
  ws.onclose = () => {
    if (NET.ws !== ws) return;
    NET.ws = null;
    if (NET.state === 'fight' && sc === 'fight') return netOppGone('サーバーとの接続が切れました');
    if (NET.state !== 'closed' && NET.state !== 'off') netError('サーバーとの接続が切れました');
  };
  ws.onerror = () => {};
}
function netJoin() {
  const info = { ch: CH[opt.ch].nm, sk: save.sk[opt.ch] || 0, name: save.pname || 'PLAYER', rp: save.rp, st: opt.st, easy: !!(save.cfg && save.cfg.easyCmd) };
  netSend({ t: 'join', mode: opt.mode, code: NET.code || undefined, create: opt.mode === 'priv' && !NET.code, ver: netVersion(), info, rtt: Math.round(NET.rtt) });
  NET.state = 'waiting';
  NET.msg = opt.mode === 'priv' ? (NET.code ? 'ルーム ' + NET.code + ' に参加しています…' : 'ルームを作っています…') : '対戦相手を探しています';
}
function netError(t) {
  NET.state = 'error';
  NET.msg = t;
  if (NET.ws) { const w = NET.ws; NET.ws = null; try { w.close(); } catch (e) {} }
}
// 接続を切る(試合が終わった・やめた)
function netClose() {
  if (NET.ws) { netSend({ t: 'leave' }); const w = NET.ws; NET.ws = null; try { w.close(); } catch (e) {} }
  NET.state = 'off';
  NET.on = false;
}

// ---- サーバーからの知らせ ----
function netOnMessage(m) {
  if (m.t === 'pong') return NET.onPong && NET.onPong(m.c);
  if (m.t === 'room') { NET.code = m.code; NET.msg = 'ルームコードを相手に伝えてください'; return; }
  if (m.t === 'err') return netError(m.msg || 'エラー');
  if (m.t === 'start') {
    NET.side = m.side;
    // 入力の遅れは2人とも同じ NET_DELAY F(片方だけ少なくすると、その人だけ操作が快適で、相手の画面ではワープが増えて不公平になるため)
    NET.delay = NET_DELAY;
    NET.seed = m.seed >>> 0;
    NET.players = m.p;
    NET.state = 'matched';
    NET.msg = '対戦相手が見つかりました!';
    netReset();
    NET.matchT = 50;                   // 少し見せてから試合へ(両方とも同じ間合いで始まる必要はない。入力がそろうまで待つため)
    return;
  }
  if (m.t === 'i') {                   // 相手の入力(まとめて届く)
    const other = 1 - NET.side, M = NET.inp[other];
    for (let k = 0; k < m.w.length; k++) M.set(m.f + k, m.w[k]);
    if (m.f + m.w.length - 1 >= (NET.lastKnownF ?? -1)) { NET.lastKnownF = m.f + m.w.length - 1; NET.lastKnown[other] = m.w[m.w.length - 1]; }
    return;
  }
  if (m.t === 'h') {                   // 相手の状態の要約
    const mine = NET.hashes.get(m.f);
    if (mine != null && mine !== m.h) NET.desync = true;
    return;
  }
  if (m.t === 'left') return netOppGone('相手が切断しました');
}
function netOppGone(t) {
  NET.oppLeft = true;
  if (sc === 'fight' && NET.state === 'fight') {
    NET.state = 'closed';
    netClose();
    endFight(true, t);                 // 相手が抜けた: 自分の勝ち
    return;
  }
  netError(t);
}

// ---- マッチの画面(upd の中で毎F) ----
function netMatchStep() {
  if (NET.state === 'matched' && --NET.matchT <= 0) {
    NET.state = 'fight';
    startFight();
  }
}

// ---- 試合中(ロールバック方式): upd から毎F呼ばれる ----
//   1) 自分の入力を作って送る(NET.delay F 先のフレーム用)。表示するフレーム(lf)を1つ進める
//   2) 確定した状態(conf)に戻し、2人の入力がそろったフレームを本当の入力で進めて、新しい確定の状態を覚える
//   3) その先(まだ相手の入力が届いていない所)は、相手は「最後に届いた入力のまま押し続けている」と予想して進める
//      → 相手の入力が届いたら、次のFで確定の状態からやり直すので、予想が外れても自動で正しい試合に直る
//   予想で進められるのは NET_MAX_PREDICT F まで。それ以上相手が遅れたら待つ(「通信待ち」)
const NET_DELAY = 4;                   // 入力の遅れ(F)。2人とも同じ。これより遅い分は予想とロールバックでかくす
const NET_MAX_PREDICT = 14;            // 予想で先に進める最大のF
function netTick() {
  const me = NET.side, L = NET.delay;
  const V = NET.vis, oldPos = V.pos;
  V.pos = new Map();
  const w = netLocalBits();
  NET.pend |= w & NET_HIT_MASK;                                   // 待っている間に押したボタンも、次に送る入力に入れる
  if (NET.lf === 0 && !NET.conf) {                                // 最初の L F は「何も押していない」入力(相手の分は相手が送ってくる)
    const z = [];
    for (let f = 0; f < L; f++) { NET.inp[me].set(f, 0); z.push(0); }
    if (z.length) netSend({ t: 'i', f: 0, w: z });
    NET.conf = netSnap();
  }
  if (NET.lf - NET.fc < NET_MAX_PREDICT) {
    const f = NET.lf + L, v = (w & ~NET_HIT_MASK) | NET.pend;
    NET.pend = 0;
    NET.inp[me].set(f, v);
    netSend({ t: 'i', f, w: [v] });
    NET.lf++;
    NET.stall = 0;
  } else NET.stall++;
  // 確定した所まで進める
  netRestore(NET.conf);
  let adv = false;
  while (NET.fc < NET.lf && NET.inp[0].has(NET.fc) && NET.inp[1].has(NET.fc) && sc === 'fight') {
    netSim(NET.inp[0].get(NET.fc), NET.inp[1].get(NET.fc));
    const f = NET.fc++;
    netVisRec(f);
    adv = true;
    if (f % NET_HASH_EVERY === 0 && f > 0) netSendHash(f);
    NET.inp[0].delete(f - 30); NET.inp[1].delete(f - 30);           // 古い入力は捨てる
  }
  if (sc !== 'fight') return;                                     // 確定した試合が終わった(結果画面へ)
  if (adv) NET.conf = netSnap();
  // その先は相手の入力を予想して進める(見せるだけ。次のFでやり直す)
  NET.predicting = true;
  try {
    const other = 1 - me;
    let last = NET.lastKnown[other] ?? 0;
    for (let f = NET.fc; f < NET.lf && sc === 'fight'; f++) {
      const known = NET.inp[other].get(f);
      const ow = known != null ? known : last & ~NET_HIT_MASK;   // 押しっぱなしのキーは続け、押した瞬間のボタンはくり返さない
      if (known != null) last = known;
      const mw = NET.inp[me].get(f) ?? 0;
      netSim(me === 0 ? mw : ow, me === 0 ? ow : mw);
      netVisRec(f);
    }
  } finally { NET.predicting = false; }
  netVisFix(oldPos);
}
// ---- 見た目のずれをなめらかにする ----
//   前のFに画面に出した位置と、やり直した後の同じフレームの位置を比べて、その差を「見た目のずれ」にためる。
//   描くときだけ、ずれの分だけ前の位置寄りに描き、ずれは毎F少しずつ 0 に戻す(瞬間移動に見えない)
const NET_VIS_KEEP = 0.72;             // 毎F残すずれの割合(小さいほど早く正しい位置へ)
const NET_VIS_MAX = 140;               // これより大きいずれはなめらかにしない(ラウンドの始まりなど)
function netVisRec(f) {
  const q = (p) => (p && p.pup ? [p.pup.x, p.pup.y] : [0, 0]);
  NET.vis.pos.set(f, [A.x, A.y, B.x, B.y, ...q(A), ...q(B)]);
}
function netVisFix(oldPos) {
  const V = NET.vis, o = V.off, f = V.lastF, a = oldPos.get(f), b = V.pos.get(f);
  for (let i = 0; i < 8; i++) o[i] *= NET_VIS_KEEP;
  if (a && b) for (let i = 0; i < 8; i++) {
    const d = a[i] - b[i];
    if (Math.abs(d) > 0.01 && Math.abs(d) < NET_VIS_MAX) o[i] += d;
  }
  for (let i = 0; i < 8; i++) if (Math.abs(o[i]) < 0.05 || Math.abs(o[i]) > NET_VIS_MAX) o[i] = 0;
  V.lastF = NET.lf - 1;
  // 次に比べられるように、画面に出すフレームの位置だけ残す
  const keep = V.pos.get(V.lastF);
  V.pos = new Map(keep ? [[V.lastF, keep]] : []);
}
// 描く前にずれを足す / 描いた後に戻す(loop の draw の前後)
function netVisApply() {
  const V = NET.vis;
  V.saved = null;
  if (!NET.on || sc !== 'fight' || !A || !B) return;
  const o = V.off;
  V.saved = [A.x, A.y, B.x, B.y, A.pup && A.pup.x, A.pup && A.pup.y, B.pup && B.pup.x, B.pup && B.pup.y];
  A.x += o[0]; A.y += o[1]; B.x += o[2]; B.y += o[3];
  if (A.pup) { A.pup.x += o[4]; A.pup.y += o[5]; }
  if (B.pup) { B.pup.x += o[6]; B.pup.y += o[7]; }
}
function netVisRevert() {
  const s = NET.vis.saved;
  if (!s) return;
  NET.vis.saved = null;
  [A.x, A.y, B.x, B.y] = s;
  if (A.pup) { A.pup.x = s[4]; A.pup.y = s[5]; }
  if (B.pup) { B.pup.x = s[6]; B.pup.y = s[7]; }
}
// 1F 進める(upd に入力を渡して呼ぶ)
function netSim(a, b) {
  NET.inject = [a, b];
  try { upd(); } finally { NET.inject = null; }
}
// 試合の状態を覚える / 戻す(リプレイの場面移動と同じしくみ。replay.js の rpClone)
function netSnap() {
  rpStatic();
  return rpClone({ A, B, G, fx, PJ, PT, FIRE, DUST, RAGE, ko, hs, cd, fr, gfr, RNG_S, shakeT, shakeP, MS, st: NET.st }, new Map());
}
function netRestore(S0) {
  const s = rpClone(S0, new Map());
  ({ A, B, G, fx, PJ, PT, FIRE, DUST, RAGE, ko, hs, cd, fr, gfr, RNG_S, shakeT, shakeP, MS } = s);
  NET.st = s.st;
  aiCache.clear();
}
// 自分のキーの状態をビットにする(replay.js の rpFrameInput と同じ並び。記録はしない)
const NET_HIT_MASK = ((1 << 9) - 1) << 9 | (1 << 18);
function netLocalBits() {
  let w = 0;
  for (let i = 0; i < RP_ACTS.length; i++) {
    if (keyDown(RP_ACTS[i])) w |= 1 << i;
    if (keyHit(RP_ACTS[i])) w |= 1 << (i + 9);
  }
  if (keyHit('airParry')) w |= 1 << RP_AP_BIT;
  if (keyDown('self')) w |= 1 << RP_SELF_BIT;
  return w;
}
// 状態の要約(体力・位置・乱数の種)。ずれていたら同期ずれ
function netSendHash(f) {
  let h = (RNG_S ^ (f * 2654435761)) >>> 0;
  for (const p of [A, B]) {
    h = (Math.imul(h ^ Math.round(p.hp * 100), 16777619) ^ Math.round(p.x * 10)) >>> 0;
    h = (Math.imul(h ^ Math.round(p.y * 10), 16777619) ^ (p.st || '').length) >>> 0;
  }
  NET.hashes.set(f, h);
  NET.hashes.delete(f - NET_HASH_EVERY * 10);
  netSend({ t: 'h', f, h });
}

// ---- 試合の準備(startFight の中) ----
function netSetupFight() {
  const P = NET.players, ci = (nm) => Math.max(0, CH.findIndex((c) => c.nm === nm));
  opt.st = P[0].st ?? 0;
  A = F(ci(P[0].ch), P[0].sk | 0, 300, 1);
  B = F(ci(P[1].ch), P[1].sk | 0, 660, -1);
  A.easy = !!P[0].easy;                // 簡単コマンドの設定は、それぞれのプレイヤーの物を使う(両方の画面で同じ結果にするため)
  B.easy = !!P[1].easy;
}

// ---- 画面 ----
function netDrawMatch() {
  dark(MODE_NAME_NET[opt.mode] || 'オンライン');
  if (NET.state === 'privsel') {
    T('ルームコードを入力して Enter で参加', W / 2, 190, 22, '#fff');
    T('何も入力せずに Enter で、新しいルームを作る', W / 2, 222, 16, '#aaa');
    const s = (NET.code + '____').slice(0, 4).split('').join(' ');
    T(s, W / 2, 300, 54, '#fd0');
    T('英字・数字 4文字 / BackSpace で消す', W / 2, 345, 15, '#aaa');
  } else {
    if (opt.mode === 'priv' && NET.code) T('ルームコード: ' + NET.code, W / 2, 210, 44, '#fd0');
    const dots = NET.state === 'waiting' || NET.state === 'connecting' ? '.'.repeat((Date.now() / 330) % 4 | 0) : '';
    T(NET.msg + dots, W / 2, opt.mode === 'priv' && NET.code ? 280 : 250, 22, NET.state === 'error' ? '#f88' : '#fff');
    if (NET.state === 'matched' && NET.players) {
      const P = NET.players, me = NET.side;
      T((P[0].name || 'PLAYER') + '(' + P[0].ch + ')' + (me === 0 ? ' ← あなた' : ''), W / 2, 320, 20, '#9cf');
      T('VS', W / 2, 352, 22, '#fd0');
      T((P[1].name || 'PLAYER') + '(' + P[1].ch + ')' + (me === 1 ? ' ← あなた' : ''), W / 2, 384, 20, '#f99');
    }
    if (NET.rtt) T('サーバーまで ' + Math.round(NET.rtt) + 'ms', W / 2, 440, 14, '#888');
  }
  T('Esc でキャンセル', W / 2, 480, 18, '#aaa');
}
const MODE_NAME_NET = { rank: 'ランクマッチ', casual: 'カジュアルマッチ', priv: 'プライベートルーム' };
// 試合中の表示(通信待ち・同期ずれ・遅れ)
function netDrawHUD() {
  if (!NET.on || sc !== 'fight') return;
  if (NET.stall > NET_STALL_TEXT) T('通信待ち…', W / 2, 300, 28, '#fd0');
  const ahead = NET.lf - NET.fc;                                   // 予想で先に進めているF(相手の入力の届く遅さ)
  if (NET.desync) T('同期ずれが起きました(ブラウザの違いなど)。試合の結果が相手と違うかもしれません', W / 2, 124, 13, '#d33');
  T((NET.side === 0 ? '◀ あなた' : 'あなた ▶') + '   入力の遅れ ' + NET.delay + 'F / 予想 ' + ahead + 'F', W / 2, 104, 12, '#556', 'center');
}

// ---- メニューの操作(nav から) ----
function netNav(k) {
  if (sc !== 'match' || !NET.on) return false;
  if (k === 'Escape') { netClose(); sc = 'cfg'; sel = 0; return true; }
  if (NET.state === 'privsel') {
    const m = /^(Key([A-Z])|Digit([0-9]))$/.exec(k);
    if (m && NET.code.length < 4) NET.code += m[2] || m[3];
    else if (k === 'Backspace') NET.code = NET.code.slice(0, -1);
    else if (k === 'Enter') {
      if (NET.code.length === 0 || NET.code.length === 4) netConnect();
    }
    return true;
  }
  if (NET.state === 'error' && (k === 'Enter' || k === 'Space')) { netClose(); sc = 'cfg'; sel = 0; return true; }
  return true;
}
