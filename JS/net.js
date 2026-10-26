// ============================================================
// net.js … オンライン対戦(ランク・カジュアル・プライベート)
//   サーバー(リポジトリの直下の server.js)と WebSocket でつながり、2人の入力を交換して同じ試合を両方の画面で進める。
//
//   ■ しくみ(ロックステップ方式)
//     ・ゲームは「入力」だけで進み方が決まる(game_spec.js の【オンライン対戦に向けた決まり】)。
//       両方の画面で同じ種(seed)から試合を始め、毎Fの2人分の入力を同じ順番で使えば、同じ試合になる。
//     ・自分の入力は「DELAY F 先のフレーム用」として相手へ送る(入力の遅れ)。両方の入力がそろったフレームだけ進める。
//       相手の入力が届いていないときはそのフレームで待つ(画面に「通信待ち」)。
//     ・遅れ(DELAY)は、つながったときに測った2人の通信の速さ(ping)から、サーバーが決めて両方に同じ値を送る。
//     ・左(side 0)= A、右(side 1)= B。自分がどちらかはサーバーが決める。
//     ・120F ごとに状態の要約(ハッシュ)を送り合い、ずれていたら「同期ずれ」と表示する(ブラウザの違いなどで起きうる)。
//
//   ■ サーバーの場所
//     ・ふつうは、ゲームを開いたページと同じサーバー(Render の Web Service で server.js を動かす)。
//     ・別のサーバーを使うときは、URL の後ろに ?server=wss://xxxx.onrender.com を付ける(または NET_SERVER を書きかえる)。
// ============================================================

const NET_SERVER = '';                 // 空 = ゲームを開いたページと同じサーバー
const NET_PROTO = 3;                   // 通信の決まりの版(変えたら古い版の相手とはマッチしない)
const NET_HASH_EVERY = 120;            // 状態の要約を送る間隔(F)
const NET_STALL_TEXT = 10;             // これ以上待ったら「通信待ち」を出す(F)

const NET = {
  on: false,          // オンライン対戦の試合中(または準備中)
  ws: null,
  state: 'off',       // off / privsel / connecting / waiting / matched / fight / closed / error
  msg: '',            // 画面に出す説明
  code: '',           // プライベートのルームコード
  side: 0,            // 0 = 左(A) / 1 = 右(B)
  delay: 4,           // 入力の遅れ(F)
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
  Object.assign(NET, { f: 0, sent: -1, inp: [new Map(), new Map()], st: [{ tp: {}, ddKeep: 0 }, { tp: {}, ddKeep: 0 }], pend: 0, stall: 0, hashes: new Map(), desync: false, oppLeft: false });
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
    let n = 0, sum = 0;
    const ping = () => { NET.pingT[n] = performance.now(); netSend({ t: 'ping', c: n }); };
    NET.onPong = (c) => {
      sum += performance.now() - NET.pingT[c];
      if (++n < 3) return ping();
      NET.rtt = sum / n;
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
    NET.delay = m.delay;
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

// ---- 試合中: このフレームの2人の入力。そろっていなければ null(待つ) ----
//   自分の入力は DELAY F 先のフレーム用として、まだ送っていなければ作って送る
function netFrameInputs() {
  const me = NET.side, D = NET.delay, mine = NET.inp[me];
  const w = netLocalBits();
  NET.pend |= w & NET_HIT_MASK;                                   // 待っている間に押したボタンも、次に送る入力に入れる
  if (NET.sent < 0) {                                             // 最初の D F は、両方とも「何も押していない」入力にする
    for (let f = 0; f < D; f++) { NET.inp[0].set(f, 0); NET.inp[1].set(f, 0); }
    NET.sent = D - 1;
  }
  if (NET.sent < NET.f + D) {
    const f = NET.sent + 1, v = (w & ~NET_HIT_MASK) | NET.pend;
    NET.pend = 0;
    mine.set(f, v);
    netSend({ t: 'i', f, w: [v] });
    NET.sent = f;
  }
  const a = NET.inp[0].get(NET.f), b = NET.inp[1].get(NET.f);
  if (a == null || b == null) { NET.stall++; return null; }
  NET.stall = 0;
  NET.inp[0].delete(NET.f - 120); NET.inp[1].delete(NET.f - 120);   // 古い入力は捨てる
  const fN = NET.f++;
  if (fN % NET_HASH_EVERY === 0 && fN > 0) netSendHash(fN);
  return [a, b];
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
    if (NET.rtt) T('サーバーまで ' + Math.round(NET.rtt) + 'ms' + (NET.state === 'matched' ? '  入力の遅れ ' + NET.delay + 'F' : ''), W / 2, 440, 14, '#888');
  }
  T('Esc でキャンセル', W / 2, 480, 18, '#aaa');
}
const MODE_NAME_NET = { rank: 'ランクマッチ', casual: 'カジュアルマッチ', priv: 'プライベートルーム' };
// 試合中の表示(通信待ち・同期ずれ・遅れ)
function netDrawHUD() {
  if (!NET.on || sc !== 'fight') return;
  if (NET.stall > NET_STALL_TEXT) T('通信待ち…', W / 2, 300, 28, '#fd0');
  if (NET.desync) T('同期ずれが起きました(ブラウザの違いなど)。試合の結果が相手と違うかもしれません', W / 2, 124, 13, '#d33');
  T((NET.side === 0 ? '◀ あなた' : 'あなた ▶') + '   入力の遅れ ' + NET.delay + 'F', W / 2, 104, 12, '#556', 'center');
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
