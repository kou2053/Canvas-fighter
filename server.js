// ============================================================
// server.js … CANVAS FIGHTERS のサーバー(Render の Web Service で動かす)
//   ・ゲームのファイル(index.html / JS / CSS など)をそのまま配る
//   ・/ws で WebSocket を受け付け、オンライン対戦の相手を探して、2人の入力を中継する(試合の計算は両方のブラウザがする)
//
//   動かし方: npm install → npm start(PORT は Render が決める。手元では http://localhost:3000)
//
//   ■ やりとり(JSON)
//     ブラウザ → サーバー
//       { t:'ping', c }                       … 通信の速さを測る(pong で返す)
//       { t:'join', mode, code, create, ver, info, rtt }   … 相手を探す。mode = rank / casual / priv
//            priv: create=true なら新しいルームを作る(ルームコードを返す)/ code を付けるとそのルームに入る
//            ver(ゲームの版)が同じ人どうしだけマッチする。info = { ch, sk, name, rp, st, easy }
//       { t:'i', f, w:[...] }                 … 自分の入力(フレーム f から)。相手へそのまま送る
//       { t:'h', f, h }                       … 状態の要約。相手へそのまま送る
//       { t:'leave' }                         … やめる
//     サーバー → ブラウザ
//       { t:'pong', c } / { t:'room', code } / { t:'err', msg }
//       { t:'start', side, seed, delay, p:[左の info, 右の info] }   … 試合開始。side = 0(左)/ 1(右)
//       { t:'i', ... } / { t:'h', ... }      … 相手から
//       { t:'left' }                          … 相手が抜けた
// ============================================================
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8',
};
const HIDDEN = new Set(['server.js', 'package.json', 'package-lock.json', 'node_modules', '.git']);

// ---- ファイルを配る ----
const server = http.createServer((req, res) => {
  let p;
  try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
  if (p === '/health') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('ok'); }
  if (p.endsWith('/')) p += 'index.html';
  const file = path.normalize(path.join(ROOT, p));
  if (!file.startsWith(ROOT) || HIDDEN.has(p.split('/')[1])) { res.writeHead(404); return res.end('not found'); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      // 大文字・小文字だけが違うファイル名でも見つける(Windows で作ったファイルを Linux のサーバーで配るとき用)
      const dir = path.dirname(file), base = path.basename(file).toLowerCase();
      return fs.readdir(dir, (e2, list) => {
        const hit = !e2 && list.find((n) => n.toLowerCase() === base);
        if (!hit) { res.writeHead(404); return res.end('not found'); }
        send(path.join(dir, hit));
      });
    }
    send(file);
  });
  function send(f) {
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(f).pipe(res);
  }
});

// ---- オンライン対戦 ----
const wss = new WebSocketServer({ server, path: '/ws' });
const queues = { rank: [], casual: [] };   // 相手を待っている人(ver ごとに見る)
const rooms = new Map();                   // プライベートのルームコード → 待っている人
const LAG = Number(process.env.LAG_MS) || 0;   // 試験用: 送る前に待つ時間(ms)。ふつうは 0
const send = (ws, o) => {
  if (!ws || ws.readyState !== 1) return;
  const d = JSON.stringify(o);
  if (LAG) setTimeout(() => ws.readyState === 1 && ws.send(d), LAG); else ws.send(d);
};
const randCode = () => { let c; do { c = Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[(Math.random() * 32) | 0]).join(''); } while (rooms.has(c)); return c; };

function unqueue(ws) {
  for (const q of Object.values(queues)) { const i = q.indexOf(ws); if (i >= 0) q.splice(i, 1); }
  if (ws.room && rooms.get(ws.room) === ws) rooms.delete(ws.room);
}
// 2人を組ませて試合を始める
function pair(a, b) {
  unqueue(a); unqueue(b);
  a.peer = b; b.peer = a;
  const seed = (Math.random() * 4294967296) >>> 0 || 1,
    oneWay = ((a.rtt || 100) + (b.rtt || 100)) / 2,                        // 片方からもう片方まで(サーバー経由)のおよその時間
    delay = Math.max(2, Math.min(12, Math.ceil(oneWay / 16.7) + 1));
  const p = [a.info, b.info];
  send(a, { t: 'start', side: 0, seed, delay, p });
  send(b, { t: 'start', side: 1, seed, delay, p });
}

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => (ws.isAlive = true));
  ws.on('message', (data) => {
    let m;
    try { m = JSON.parse(data); } catch (e) { return; }
    if (m.t === 'ping') return send(ws, { t: 'pong', c: m.c });
    if (m.t === 'i' || m.t === 'h') return send(ws.peer, m);               // 入力・要約は相手へそのまま
    if (m.t === 'leave') { leave(ws); return; }
    if (m.t !== 'join' || ws.peer) return;
    ws.info = m.info || {};
    ws.ver = String(m.ver || '');
    ws.rtt = Number(m.rtt) || 100;
    if (m.mode === 'priv') {
      if (m.create || !m.code) {
        const code = randCode();
        ws.room = code;
        rooms.set(code, ws);
        return send(ws, { t: 'room', code });
      }
      const code = String(m.code).toUpperCase(), host = rooms.get(code);
      if (!host || host.readyState !== 1) return send(ws, { t: 'err', msg: 'ルーム ' + code + ' が見つかりません' });
      if (host.ver !== ws.ver) return send(ws, { t: 'err', msg: '相手とゲームの版が違います(ページを読み込み直してください)' });
      rooms.delete(code);
      return pair(host, ws);                                                  // ルームを作った人が左
    }
    const q = queues[m.mode === 'rank' ? 'rank' : 'casual'];
    // ランクは RP が近い人を優先(同じ版の人の中で)
    let best = -1, bd = Infinity;
    q.forEach((o, i) => {
      if (o === ws || o.ver !== ws.ver || o.readyState !== 1) return;
      const d = m.mode === 'rank' ? Math.abs((o.info.rp || 0) - (ws.info.rp || 0)) : i;
      if (d < bd) { bd = d; best = i; }
    });
    if (best >= 0) return pair(q[best], ws);
    q.push(ws);
  });
  ws.on('close', () => leave(ws));
});
function leave(ws) {
  unqueue(ws);
  if (ws.peer) { send(ws.peer, { t: 'left' }); ws.peer.peer = null; ws.peer = null; }
}
// 切れた接続を片付ける(30秒ごと)
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) { ws.terminate(); continue; }
    ws.isAlive = false;
    try { ws.ping(); } catch (e) {}
  }
}, 30000);

server.listen(PORT, () => console.log('CANVAS FIGHTERS server: http://localhost:' + PORT));
