const cv = document.getElementById('c'),
  g = cv.getContext('2d'),
  W = 960,
  H = 540,
  GY = 430;
let save = { coin: 300, own: {}, sk: {}, rp: 1000, w: 0, l: 0 };
try {
  Object.assign(save, JSON.parse(localStorage.getItem('cf') || '{}'));
} catch (e) {}
// キャラの並びが変わったとき(キャラの追加・削除・並べ替え)、保存データのキャラ番号を名前で付け直す
//  own(スキンの所持 '番号_スキン') / sk(選んでいるスキン) / tr.bch(トレーニングの相手)。消えたキャラの分は捨てる
//  save.chars に保存したときのキャラの並びを覚えておく(無い古いデータは、メイガ・ブレイドを消す前の並び)
(function migrateCharOrder() {
  const now = CHARACTERS.map((c) => c.name),
    old = save.chars || ['ライキ', 'ガルド', 'シノ', 'メイガ', 'ブレイド', 'ゴーレム', 'バーサク', 'リリス'],
    map = (i) => { const k = now.indexOf(old[+i]); return k < 0 ? null : k; };
  if (old.join() !== now.join()) {
    const own = {}, sk = {};
    for (const key in save.own || {}) {
      const [i, s] = key.split('_'), k = map(i);
      if (k != null) own[k + '_' + s] = save.own[key];
    }
    for (const i in save.sk || {}) {
      const k = map(i);
      if (k != null) sk[k] = save.sk[i];
    }
    save.own = own;
    save.sk = sk;
    if (save.tr && save.tr.bch != null) save.tr.bch = map(save.tr.bch);
  }
  save.chars = now;
})();
const sv = () => {
  try {
    localStorage.setItem('cf', JSON.stringify(save));
  } catch (e) {}
};
// ---- 乱数 R() ----
//  ゲームの処理(upd の中: CPU の判断・エフェクトの粒など)は「種(シード)から決まる乱数」を使い、
//  描く処理(draw の中: 画面の揺れ・稲妻のぎざぎざなど見た目だけ)は Math.random を使う。
//  → 描く回数(フレームレート)が違っても、ゲームの処理が使う乱数の並びは変わらない。
//    オンライン対戦では、両方の画面で rngSeed(同じ数) をしてから始めれば、同じ入力で同じ結果になる
let RNG_S = (Date.now() ^ 0x9e3779b9) >>> 0, inDraw = false;
function rngSeed(n) { RNG_S = (n >>> 0) || 1; }
function simRand() {                                 // mulberry32(速くて、種が同じなら同じ並びになる乱数)
  RNG_S = (RNG_S + 0x6d2b79f5) >>> 0;
  let t = RNG_S;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const R = () => (inDraw ? Math.random() : simRand());

// ================= 設定(キー配置など) =================
//  メニューの「設定」で変えられる。変えた内容はブラウザに保存される(save.keys / save.cfg)
//  キーは KeyboardEvent.code の名前(KeyZ / ArrowLeft / Space / ShiftLeft など)。1つの操作に2つまで
const KEY_ACTIONS = [
  ['left', '左'], ['right', '右'], ['up', '上'], ['down', '下(しゃがみ)'],
  ['attack', '攻撃'], ['special', '必殺'], ['shield', 'シールド'], ['jump', 'ジャンプ'], ['throw', '投げ'],
  ['airParry', '空中受け流し'],
  ['self', '本体の必殺(押しながら必殺)'],   // 人形を使うキャラ(メイ＆ロロ)だけ: 押しながら必殺で、人形を動かさず本体が必殺技を出す
];
// ほかの操作と同じキーを使ってよい操作(空中受け流しは空中でしか使わないので、地上の操作のシールドと同じ X を初期設定にしている)
//   空中受け流しは「しゃがみ(下)を2回」でもいつでも出せる。このキーはそれに足して使える
const KEY_SHARE = ['airParry'];
const DEFAULT_KEYS = {
  left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'],
  attack: ['KeyZ'], special: ['KeyA'], shield: ['KeyX'], jump: ['Space', 'KeyC'], throw: ['KeyG'],
  airParry: ['KeyX'],
  self: ['KeyS'],
};
const DEFAULT_CFG = { easyCmd: false, shake: true, help: true, quality: 'high', fps: 60 }; // 簡単コマンド / ヒット時の画面の揺れ / 操作説明の表示 / 画質(QUALITY) / フレームレート(FPS_LIST)
const RESERVED_KEYS = ['Escape']; // メニューに戻るキーは割り当てられない
function loadSettings() {
  const k = save.keys || {};
  save.keys = {};
  for (const [a] of KEY_ACTIONS) save.keys[a] = Array.isArray(k[a]) && k[a].length ? k[a].slice(0, 2) : DEFAULT_KEYS[a].slice();
  save.cfg = { ...DEFAULT_CFG, ...(save.cfg || {}) };
}
loadSettings();
const keyDown = (a) => save.keys[a].some((c) => K[c]); // 押している間
const keyHit = (a) => save.keys[a].some((c) => pr[c]); // 押した瞬間
const boundAction = (code) => KEY_ACTIONS.find(([a]) => save.keys[a].includes(code));
// キーの表示名
function keyName(c) {
  if (!c) return '-';
  const A = { ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Space: 'Space', Enter: 'Enter', Backspace: 'BS', Tab: 'Tab',
    ShiftLeft: '左Shift', ShiftRight: '右Shift', ControlLeft: '左Ctrl', ControlRight: '右Ctrl', AltLeft: '左Alt', AltRight: '右Alt',
    Comma: ',', Period: '.', Slash: '/', Semicolon: ';', Quote: "'", BracketLeft: '[', BracketRight: ']', Minus: '-', Equal: '=', Backslash: '\\' };
  if (A[c]) return A[c];
  if (/^Key[A-Z]$/.test(c)) return c[3];
  if (/^Digit\d$/.test(c)) return c[5];
  if (/^Numpad/.test(c)) return 'テンキー' + c.slice(6);
  return c;
}
// キーを割り当てる(ほかの操作で使っていたら、そちらと入れ替える)
//  ほかの操作のキーがなくなってしまうときは割り当てない(戻り値: 割り当てられなかった操作の名前)
function bindKey(a, slot, code) {
  const old = save.keys[a][slot];
  const share = (b) => KEY_SHARE.includes(a) || KEY_SHARE.includes(b);   // 空中受け流しのキーは、ほかの操作と重なってもよい(入れ替えない)
  for (const [b, nm] of KEY_ACTIONS) if (b !== a && !share(b) && !old && save.keys[b].length === 1 && save.keys[b][0] === code) return nm;
  for (const [b] of KEY_ACTIONS) {
    if (b === a || share(b)) continue;
    const i = save.keys[b].indexOf(code);
    if (i < 0) continue;
    if (old && !save.keys[b].includes(old)) save.keys[b][i] = old; // 入れ替え
    else save.keys[b].splice(i, 1);
  }
  const list = save.keys[a].slice();
  if (list.includes(code)) list.splice(list.indexOf(code), 1, ...(list[slot] && list[slot] !== code ? [list[slot]] : [])); // 同じ操作の別の枠にあれば入れ替え
  if (slot < list.length) list[slot] = code;
  else list.push(code);
  save.keys[a] = [...new Set(list)].slice(0, 2);
  sv();
  return null;
}

// ---- data ----
const SK = [
  { n: 'ノーマル', c: 0, p: 0 },
  { n: 'ゴールド', c: '#fc3', p: 300 },
  { n: 'ネオン', c: '#0ee', p: 400 },
  { n: 'シャドウ', c: '#446', p: 500 },
];
// ================= キャラクターデータの組み立て =================
// 性能・見た目・技・モーションは characters.js で編集します(このブロックは触らなくてOK)
// SP ゲージの既定値(説明は下の「SP ゲージ(ゲージ技・超必殺技)」)
const SP_DEFAULT = { max: 100, time: 0.012, hit: 0.6, combo: 1, hurt: 0.35, guard: 0.8, guardAtk: 0.5, jg: 6, parry: 4, pj: 0.6, color: '#4cf' };
const SL = ['n', 'f', 'b', 'u', 'd', 'da', 'an', 'af', 'au', 'ad', 's', 'sf', 'sb', 'su', 'sd', 'gx', 'sx'];
const SL_OPTIONAL = ['b', 'sb', 'sd', 'gx', 'sx']; // 後ろ+Z / 後ろ+A / 下+A / ゲージ技 / 超必殺技 は書かなくてもよい(無いキャラは 通常Z / 必殺A が出る)
// 技データ → ゲーム内で使う形
const buildMove = (c, k, m) => {
  const b = m.box || { x: 0, y: 0, w: 0, h: 0 };
  return { k, nm: m.name, turn: m.turn, lg: m.landLag, a: motionIn((c.motions && c.motions[k]) || m.motion), st: m.startup, ac: m.active, rc: m.recovery, d: m.damage, kx: m.knockX, ky: m.knockY, hs: m.hitstun, hst: m.hitStop, hits: m.hits, hiv: m.hitInterval, ghs: m.guardHitStop ?? HIT_STOP.guard, launch: m.launch, fx: m.effect, rx: b.x, ry: b.y, rw: b.w, rh: b.h,
    low: m.low, cost: m.cost || 0, sup: !!m.super, inv: m.invincible || 0, armor: m.armor || 0, ms: m.minScale, vadd: m.volt || 0, // ゲージ技・超必殺技(SP ゲージ)の項目
    spk: m.spike === true ? 6 : m.spike || 0, drain: m.drain || 0, bc: m.bloodCost || 0,
    pup: m.puppet || null, curse: m.curse || null, // パペット(ロロ)の行動 / 呪いの釘(puppet.js)
    bnc: m.bounce || null, flt: m.float ?? null, ub: !!m.unblockable, // unblockable: ガード・ジャストガード・しゃがみ受け流しができない(つかみ技)
    // 当たる(ガードされる)と自分が跳ね返る速さ / 空中で技の出始め〜持続の間、落ちる速さをこれ以下にする(浮いて止まる)
    fol: m.follow, veil: m.veil || 0, // 水まとい: 追撃の設定(follow) / ゲージ技で AQUA ゲージをためる量(veil)
    ctr: m.counter ? buildMove(c, k + '_ctr', m.counter) : null }; // カウンター: 構えの間に打撃を受けると出る技(character.js 冒頭の【counter】) // 水まとい: 追撃の設定(follow) / ゲージ技で AQUA ゲージをためる量(veil)。projectile.js の「水まとい」 // 叩きつけ(地面でバウンド) / 吸血(与えたダメージの割合だけ回復) / 血の代償(出すと自分の体力が減る)
};

// ================= コマンド技 =================
//  コマンドの書き方(character.js の moves の command):
//    方向は矢印か数字(テンキーの並び。6=前 4=後ろ 2=下 8=上 3=前下 1=後ろ下 9=前上 7=後ろ上 5=ニュートラル)。
//    矢印の → は「前(相手のいる方)」、← は「後ろ」。キャラが左を向いているときは左右が入れ替わる。
//    最後にボタン(Z=攻撃 / A=必殺)。+ は書いても書かなくてもよい。
//      例) "↓↘→+A" = "236A"(波動)   "→↓↘+Z" = "623Z"(昇龍)   "↓↙←+A" = "214A"   "↓↓+Z" = "22Z"   "←→+A" = "46A"
//    同じ方向を続けて書く(↓↓)と、間に「離す」が入る(↓ を2回押す)。
//  COMMAND_WINDOW … 最初の方向からボタンまでに使えるF数(技ごとに commandWindow で変えられる)
const COMMAND_WINDOW = 18;
//  COMMAND_EASY … true にすると、コマンドの途中の斜め(↓↘→ の ↘ など)を入れなくても成立する(キーボード向け)。最後の方向は省略できない
const COMMAND_EASY = false; // ※ 今は設定画面の「簡単コマンド」(save.cfg.easyCmd、初期値は DEFAULT_CFG)が優先される
let ddKeep = 0; // ヒットストップ中に入れた ↓↓(空中受け流し)
let gfr = 0; // ヒットストップを除いた経過フレーム(コマンドの受付時間に使う)
const CMD_ARROW = { '↓': 2, '↘': 3, '→': 6, '↗': 9, '↑': 8, '↖': 7, '←': 4, '↙': 1, '・': 5, N: 5, n: 5 };
function parseCommand(src) {
  const t = String(src).replace(/[\s+＋]/g, '');
  const m = t.match(/^(.*?)([ZzAaＺＡ])$/);
  if (!m) return null;
  const dirs = [];
  for (const ch of m[1]) {
    const d = CMD_ARROW[ch] ?? (/[1-9]/.test(ch) ? +ch : null);
    if (d == null) return null;
    if (dirs.length && dirs[dirs.length - 1] === d) dirs.push(5); // 同じ方向が続く → 間で離す
    dirs.push(d);
  }
  if (!dirs.length) return null;
  const easy = dirs.filter((d, n) => n === 0 || n === dirs.length - 1 || ![1, 3, 7, 9].includes(d)); // 途中の斜めを抜いた形
  return { dirs, easy: easy.length < dirs.length ? easy : null, btn: /[AaＡ]/.test(m[2]) ? 'sp' : 'at', text: src };
}
// 入力の記録(コマンド判定用)。向きに関係ない絶対の向きで覚え、判定のときに今の向きで前後を決める
function recordInput(p, i) {
  if (p.histFr === fr) return;
  p.histFr = fr;
  (p.hist = p.hist || []).push({ t: gfr, x: (i.r ? 1 : 0) - (i.l ? 1 : 0), y: i.u ? 1 : i.d ? -1 : 0 });
  if (p.hist.length > 40) p.hist.shift();
}
const numpadOf = (h, f) => 5 + h.x * f + (h.y < 0 ? -3 : h.y > 0 ? 3 : 0);
// コマンドが入力されたか(新しい方から順に、方向を後ろから探す。間に余計な方向が入っても良い)
function commandDone(p, mv) {
  return cmdMatch(p, mv.cmd.dirs, mv.win) || ((p.easy ?? save.cfg.easyCmd ?? COMMAND_EASY) && !!mv.cmd.easy && cmdMatch(p, mv.cmd.easy, mv.win));   // p.easy = オンラインで相手の設定(net.js)
}
function cmdMatch(p, d, win) {
  const h = p.hist || [];
  let j = d.length - 1;
  for (let n = h.length - 1; n >= 0 && j >= 0; n--) {
    if (gfr - h[n].t > win) break; // ヒットストップ中は時間を数えない(止まっている間に入れたコマンドも有効)
    if (numpadOf(h[n], p.f) === d[j]) j--;
  }
  return j < 0;
}
// 今押したボタンで出せるコマンド技(複数成立したら、コマンドの長いほうを優先)
function pickCommand(p, i, air) {
  let best = null;
  for (const k in p.ch.mv) {
    const m = p.ch.mv[k];
    if (!m.cmd || !i[m.cmd.btn]) continue;
    if (air ? !m.air : m.air === true) continue; // air: false=地上のみ / true=空中のみ / 'both'=どちらでも
    if (commandDone(p, m) && (!best || m.cmd.dirs.length > best.cmd.dirs.length)) best = m;
  }
  return best && best.k;
}
// キャンセルの優先度(ランク)。決まった技は RK、コマンド技は rank
const rankOf = (p, k) => (p.ch.mv[k] && p.ch.mv[k].rank != null ? p.ch.mv[k].rank : RK[k] ?? 0);
// 飛び道具を撃つ技か(必殺 s と、projectile: true のコマンド技)
const isPJMove = (m) => !!m && ((m.k === 's' && !m.pup) || m.proj);   // パペットを動かす必殺技(s に puppet を書いた技)は弾を撃たない

// ---- 向き(X軸の向き) ----
//  0=真横  1=少し正面向き  2=まあまあ正面向き  3=正面向き   -1=少し背面  -2=まあまあ背面  -3=背面   (小数も可。途中の値は回っている途中の見た目)
//  向きを持つ部位: 頭(head) と、体の7部位のうち 胴(torso) / 右上腕 / 右前腕 / 左上腕 / 左前腕 / 右足 / 左足
//    ・body は「体全体」= 胴の向き + 個別に指定していない部位の向き。何も指定しないキャラは 頭=真横 / 体=少し正面向き
//    ・右 = 手前側(姿勢配列の 前腕=1,2番目 / 前脚=5,6番目)  左 = 奥側(後腕=3,4番目 / 後脚=7,8番目)
//  指定方法は character.js の冒頭コメント(【向き】)を参照
const DIR_DEFAULT = { head: 0, body: 1 };
const DIR_MAX = 3;
const clampDir = (v) => Math.max(-DIR_MAX, Math.min(DIR_MAX, v));
// 姿勢配列の 16〜21番目(0始まりで15〜20)に入る部位。書かなかった部位は body(胴)の向きに従う
const DIR_PARTS = ['rUpperArm', 'rForeArm', 'lUpperArm', 'lForeArm', 'rLeg', 'lLeg'];
// ---- 姿勢配列の並び ----
//  character.js の書き方: [lean, 右肩, 右肘, 右手首, 左肩, 左肘, 左手首, 右腿, 右膝, 左腿, 左膝, 前後ずれ, 武器X, 武器Y, 武器角度, 頭, 胴, 右上腕, 右前腕, 左上腕, 左前腕, 右足, 左足]
//  ゲームの中の並び(以前と同じ): [lean, 右肩, 右肘, 左肩, 左肘, 右腿, 右膝, 左腿, 左膝, 前後ずれ, 武器X, 武器Y, 武器角度, 頭, 胴, 部位6つ, 右手首(21), 左手首(22)]
//  読み込むときに並べ替える(手首は 0=前腕と同じ向き / 正=前(親指の側)へ曲げる。rad)
const POSE_FROM_FILE = (j) => (j < 3 ? j : j === 3 ? 21 : j < 6 ? j - 1 : j === 6 ? 22 : j - 2);
function poseIn(a) {
  if (!Array.isArray(a) || a.length < 7 || a._in) return a;
  const r = [];
  for (let j = 0; j < a.length; j++) if (j in a && a[j] !== undefined) r[POSE_FROM_FILE(j)] = a[j];
  for (let i = 0; i < 13; i++) if (r[i] === undefined) r[i] = 0;
  if (r[21] === undefined) r[21] = 0;
  if (r[22] === undefined) r[22] = 0;
  Object.defineProperty(r, '_in', { value: true });
  return r;
}
const motionIn = (mo) => (mo && typeof mo === 'object' && !Array.isArray(mo) && (mo.w || mo.s) ? { ...mo, w: poseIn(mo.w), s: poseIn(mo.s) } : mo);
for (const k in MOTIONS) MOTIONS[k] = motionIn(MOTIONS[k]);
THROW_MOTIONS.reach = poseIn(THROW_MOTIONS.reach);
for (const k of ['f', 'b', 'u', 'd']) for (const s2 of ['hold', 'rel', 'held']) if (THROW_MOTIONS[k]) THROW_MOTIONS[k][s2] = poseIn(THROW_MOTIONS[k][s2]);
const AR = MOTIONS, FXC = EFFECT_COLORS;
const motionOf = (m) => (typeof m.a === 'object' ? m.a : AR[m.a]);
// ゆっくり歩き: 地上で ↓ と ← か → を同時に押す(斜め下)と、しゃがまずにゆっくり歩く。速さ = 歩きの速さ × SLOW_WALK
//   キャラごとに character.js の stats に slowWalk: 0.5 のように書くと上書きできる。走りにはならない
const SLOW_WALK = 0.4;
// しゃがみから出した攻撃の補正: しゃがんでいた(地上・↓だけ押していた)次のフレームで出した技は、ダメージがこの倍率になる
//   飛び道具も、撃った技がしゃがみからならこの倍率。キャンセルでつないだ次の技には乗らない(その技だけ)
const CROUCH_ATTACK = 0.6;
// ダッシュの無敵: ダッシュを始めてからのF数(t)がこれ未満の間は、攻撃・飛び道具・投げが当たらない
//   back=バックダッシュ(後ろへ) / front=前ダッシュ(前回避)
const DASH_INVULN = { back: 8, front: 5 };
// ジャストガード・シールドのタイミング(シールドを押したフレームを t=0 として数える)
//   t = 0 〜 window-1      … ジャストガード(window = キャラの stats の justGuardFrames。省略 4F)
//   次の gap F             … ガード判定なし(攻撃を受けるとふつうに当たる)
//   そのあと               … ふつうのガード
//   ジャストガード成功のあとシールドを押し続けていると、すき間(gap)なしで、すぐふつうのガードになる
//   (離せばすぐ動ける。シールド解除の 10F もない)
const JUST_GUARD = { window: 4, gap: 5 };
const jgWin = (o) => o.ch.jg ?? JUST_GUARD.window;
const isJustGuard = (o) => o.st === 'shield' && !o.jgFree && o.t < jgWin(o);
const isGuarding = (o) => o.st === 'shield' && (o.jgFree || o.t >= jgWin(o) + JUST_GUARD.gap);
const dashInvuln = (o) => o.st === 'dash' && o.t < (o.bd ? DASH_INVULN.back : DASH_INVULN.front);
// 空中受け流し: 空中でしゃがみ(下)を2回(14F 以内) か、空中受け流しのキー(設定。初期設定は X)。出てから startup F 後の active F の間に攻撃を受けると成功
//   成功: 地上のしゃがみ受け流しと同じ(CROUCH_PARRY / キャラの crouchParry の倍率)。
//         受けるダメージ・吹っ飛びが小さくなり、浮かない。攻撃した側は後隙が lag F 伸び、その技からキャンセルできない
//         自分は硬直なし(ヒットストップが解けたらすぐ動ける)ので、伸びた後隙に反撃できる。もう一度 ↓↓ で次の攻撃も受け流せる
//   失敗(受付が過ぎた): 空中で whiff F 動けない。そのあと着地するまでに着地すると、着地硬直が failLand F になる
//   受付の前(startup)と失敗の隙の間に攻撃を受けると、ふつうに当たる
const AIR_PARRY = { startup: 2, active: 8, whiff: 20, failLand: 16, window: 14 };
// 下段攻撃: しゃがみ受け流しができない攻撃(しゃがんでいても、ふつうに当たる)。空中受け流しには関係しない
//   技に low: true / false を書くと、その通りになる。書かない技は自動で決める:
//     地上で出す技で、当たり判定の下の端が足元から reach px 以内、上の端が足元から top px 以内(足元だけを払う技)なら下段
//     (上から下まで届く大きな判定の技は、下段にしない)
//   空中技・飛び道具・空中で当てたときは下段にならない
const LOW_ATTACK = { reach: 12, top: 50 };
const AIR_SLOTS = ['an', 'af', 'au', 'ad'];
const isLowMove = (m) => !!m && (m.low ?? (m.rw > 0 && m.air !== true && !AIR_SLOTS.includes(m.k) && m.ry + m.rh >= -LOW_ATTACK.reach && m.ry >= -LOW_ATTACK.top));
const STAT_MAP = { slowWalk: 'swk', speed: 'sp', jump: 'jp', airJumps: 'dj', jumpStartup: 'jsq', landLag: 'lgl', airLandLag: 'alg', gravityMul: 'gm', shield: 'shm', dashSpeed: 'dsh', knockbackTaken: 'wt', damageMul: 'dm', justGuardFrames: 'jg', shieldRegen: 'rg' };
const BODY_MAP = { limbW: 'lw', torso: 'tl', thigh: 'ul', shin: 'll', upperArm: 'ua', foreArm: 'la', headR: 'hr', torsoW: 'bw', scale: 'sc', pants: 'pn', belt: 'sh', sleeves: 'sl', foreColor: 'f2', handColor: 'hd', handR: 'hr2', shoes: 'so' };
// 体の大きさ・服の色は drawing_character.js の CHARACTER_DRAWS[名前].body に書く (説明は setting.js の「body」)
//   大きさはすべて px の数字。書かなかった項目は BODY_DEFAULT。前腕・手の色の省略時は肌の色(look.skin)
//   Y の中身: sc=全体の大きさ hr=頭 hr2=手 tl=胴の長さ bw=胴の太さ ua/uaw=上腕の長さ/太さ la/law=前腕の長さ/太さ
//             ul/ll=太もも/すねの長さ lgw=脚の太さ pn/sh/sl/f2/hd/so=色
const BODY_DRAW_MAP = { scale: 'sc', headRadius: 'hr', handRadius: 'hr2', torsoLength: 'tl', torsoWidth: 'bw',
  thighLength: 'ul', shinLength: 'll', legWidth: 'lgw', thighWidth: 'tw', shinWidth: 'sw',
  pantsColor: 'pn', beltColor: 'sh', sleeves: 'sl', foreArmColor: 'f2', handColor: 'hd', shoesColor: 'so' };
const BODY_DEFAULT = { sc: 1, hr: 13, hr2: 9, tl: 36, bw: 22, ua: 25, uaw: 11, la: 24, law: 11, ul: 21, ll: 21, lgw: 13, pn: '#2a2a3a', sh: '#fff', sl: 1, so: '#111' };
// 以前の書き方(倍率など)。見つけたら警告して、同じ見た目になる px に直して読む
const BODY_OLD_KEYS = ['limbWidth', 'torsoBaseWidth', 'upperArmLength', 'foreArmLength', 'armWidth', 'legLength'];
function bodyLook(c, bodyOverride) {
  const b = bodyOverride || (typeof CHARACTER_DRAWS !== 'undefined' && CHARACTER_DRAWS[c.name] && CHARACTER_DRAWS[c.name].body) || {},
    Y = { ...BODY_DEFAULT, f2: c.look.skin, hd: c.look.skin };
  if (c.look.body) {                                 // とても古い書き方(character.js の look.body)
    console.warn(c.name + ': look.body は drawing_character.js の body へ移してください');
    const o = remap(c.look.body, BODY_MAP);
    if (o.lw != null) { o.uaw = o.law = o.lw; o.lgw = o.lw + 2; delete o.lw; }
    Object.assign(Y, o);
  }
  const old = BODY_OLD_KEYS.filter((k) => b[k] !== undefined);
  if (old.length) {
    console.warn(c.name + ': body の ' + old.join(', ') + ' は廃止。upperArm / lowerArm の length・width、torsoWidth、thighLength / shinLength、legWidth を px で書いてください');
    const lw = b.limbWidth ?? 11, aw = b.armWidth ?? 1, k = b.legLength ?? 1;
    Object.assign(Y, { uaw: lw * aw, law: lw * aw, lgw: lw + 2, ua: b.upperArmLength ?? Y.ua, la: b.foreArmLength ?? Y.la });
    if (b.torsoBaseWidth != null) Y.bw = b.torsoBaseWidth * (typeof b.torsoWidth === 'number' && b.torsoWidth < 4 ? b.torsoWidth : 1);
    Y.ul = (b.thighLength ?? Y.ul) * k;
    Y.ll = (b.shinLength ?? Y.ll) * k;
  }
  for (const k in BODY_DRAW_MAP) if (b[k] !== undefined && !(old.length && /^(thighLength|shinLength|torsoWidth)$/.test(k))) Y[BODY_DRAW_MAP[k]] = b[k];
  // 腕の長さ・太さ (upperArm / lowerArm の中に書く)
  if (b.upperArm) { if (b.upperArm.length != null) Y.ua = b.upperArm.length; if (b.upperArm.width != null) Y.uaw = b.upperArm.width; }
  if (b.lowerArm) { if (b.lowerArm.length != null) Y.la = b.lowerArm.length; if (b.lowerArm.width != null) Y.law = b.lowerArm.width; }
  // 太もも・すねの太さ(thighWidth / shinWidth)。書かなければ legWidth
  if (Y.tw == null) Y.tw = Y.lgw;
  if (Y.sw == null) Y.sw = Y.lgw;
  Y.sl = Y.sl ? 1 : 0;
  return Y;
}
const PJ_MAP ={ speed: 'v', damage: 'd', radius: 'r', count: 'n', spread: 'sp', life: 'life' };
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
// 投げの表(character.js の throw)を処理で使う形にする
//   方向ごと(f / b / u / d)に motion(hold / rel / held) / effect / release / total / leap / swing / hold / hits / spike / drain を書ける(コマンド投げと同じ項目)
function throwIn(t) {
  if (!t) return t;
  const T = { ...t }, m = {}, conv = (o) => Object.fromEntries(Object.entries(o).map(([s2, v]) => [s2, poseIn(v)]));
  for (const k in t.motion || {}) m[k] = conv(t.motion[k]);
  for (const k of ['f', 'b', 'u', 'd']) {
    if (!t[k]) continue;
    const D = (T[k] = { ...t[k] });
    if (D.motion) m[k] = { ...(m[k] || {}), ...conv(D.motion) };
    if (D.spike === true) D.spike = 6;
    if (D.effect) { const B = t.box || DEFAULT_THROW.box; D.fxm = { k: 'throw_' + k, rx: B.x, rw: B.w, ry: B.y, rh: B.h, fx: D.effect }; }
  }
  for (const k in m) m[k] = { hold: m[k].hold || THROW_MOTIONS[k].hold, rel: m[k].rel || THROW_MOTIONS[k].rel, held: m[k].held || THROW_MOTIONS[k].held };
  T.motion = m;
  if (t.reach) T.reach = poseIn(t.reach);
  return T;
}
// 投げの方向ごとの設定(方向の値 → 投げ全体の値 の順に探す)
function thrDir(T, td) {
  const D = T[td] || {};
  return { release: D.release ?? T.release, total: D.total ?? T.total, leap: D.leap ?? T.leap ?? 0, swing: D.swing ?? T.swing ?? 0,
    hold: D.hold || T.hold || THROW_HOLD[td], hits: D.hits || T.hits || null, fxm: D.fxm || T.fxm || null };
}
// コマンド投げの設定(character.js の技の grab: {...})を、投げの処理(throwStep)で使う形にする
//   ふつうの投げの表(throw)と同じ項目(box / startup / active / whiff / release / total)に、投げの種類(dir)・威力など(throw の f と同じ項目)を足した物
function buildGrab(c, k, m) {
  const G = m.grab, dir = G.dir || 'f',
    pose = (v) => (v ? poseIn(v) : null),
    mot = G.motion || {};
  const T = {
    cmd: true, k, name: m.name, color: G.color || '#fa3', dir,
    box: G.box || { x: 0, y: -90, w: 70, h: 80 }, startup: m.startup ?? 6, active: m.active ?? 3, whiff: m.recovery ?? 30,
    release: G.release ?? 30, total: G.total ?? (G.release ?? 30) + 22, lunge: G.lunge || 0,
    leap: G.leap || 0, swing: G.swing || 0, hold: G.hold || null, hits: G.hits || null,
    reach: pose(mot.reach),
    motion: { [dir]: { hold: pose(mot.hold) || THROW_MOTIONS[dir].hold, rel: pose(mot.rel) || THROW_MOTIONS[dir].rel, held: pose(mot.held) || THROW_MOTIONS[dir].held } },
    [dir]: { name: m.name, damage: m.damage ?? 15, vx: m.knockX ?? 8, vy: m.knockY ?? -6, hitstun: m.hitstun ?? 28, spike: m.spike === true ? 6 : m.spike || 0, drain: m.drain || 0, stop: m.hitStop },
    turn: m.turn,
  };
  T.fxm = m.effect ? { k: 'grab_' + k, rx: T.box.x, rw: T.box.w, ry: T.box.y, rh: T.box.h, fx: m.effect } : null;
  return T;
}
function buildChar(c) {
  if (c.motions) for (const k in c.motions) c.motions[k] = motionIn(c.motions[k]);   // キャラ専用のモーションも並べ替える
  const mv = {};
  SL.forEach((k) => {
    const m = c.moves[k];
    if (!m) return SL_OPTIONAL.includes(k) ? null : console.warn(c.name + ': 技 ' + k + ' がありません');
    if (!(c.motions && c.motions[k]) && typeof m.motion === 'string' && !MOTIONS[m.motion]) console.warn(c.name + '/' + k + ': motion「' + m.motion + '」が未定義');
    mv[k] = buildMove(c, k, m);
    if (m.projectile && typeof m.projectile === 'object') mv[k].pjo = m.projectile; // 技ごとの弾の上書き(projectile.js の pjSpec)
    if (m.projectile && k !== 's') mv[k].proj = true;   // 通常技にも projectile を書くと、発生の瞬間に弾を撃つ(シノの散り苦無・ツキハの闇の雫など)
    if (k === 'gx' || k === 'sx') Object.assign(mv[k], { rank: m.rank ?? (k === 'sx' ? 8 : 7), air: m.air ?? false, proj: !!m.projectile }); // ゲージ技・超必殺技
    // solo: パペットがいない(クラッシュ中)ときに代わりに出る、本体だけの技(メイ＆ロロ。書き方は character.js 冒頭の【solo】)
    if (m.solo) {
      const so = m.solo, sm = { ...m, puppet: null, effect: undefined, launch: undefined, projectile: undefined, ...so };
      mv[k].solo = buildMove(c, k, sm);
      mv[k].solo.a = motionIn((c.motions && (c.motions[k + '_solo'] || c.motions[so.motionFrom])) || so.motion || m.motion);
      mv[k].solo.solo = true;
      if (so.projectile) { mv[k].solo.proj = true; if (typeof so.projectile === 'object') mv[k].solo.pjo = so.projectile; }
    }
  });
  // コマンド技: moves の中で command を書いた技(名前は自由。n や s などの決まった技以外)
  for (const k in c.moves) {
    const m = c.moves[k];
    if (SL.includes(k) || !m || !m.command) continue;
    const cmd = parseCommand(m.command);
    if (!cmd) {
      console.warn(c.name + '/' + k + ': command「' + m.command + '」が読めません(例: "↓↘→+A" / "236A")');
      continue;
    }
    if (!(c.motions && c.motions[k]) && typeof m.motion === 'string' && !MOTIONS[m.motion]) console.warn(c.name + '/' + k + ': motion「' + m.motion + '」が未定義');
    mv[k] = { ...buildMove(c, k, m), cmd, win: m.commandWindow ?? COMMAND_WINDOW, rank: m.rank ?? 3, air: m.air ?? false, proj: !!m.projectile, pjo: typeof m.projectile === 'object' ? m.projectile : null };
    if (m.grab) mv[k].grab = buildGrab(c, k, m);   // コマンド投げ
    // ground: air:'both' の技を地上で出したときだけ上書きする値(発生・launch・着地隙など。書き方は character.js 冒頭)
    if (m.ground) mv[k].gv = { ...mv[k], ...buildMove(c, k, { ...m, ...m.ground, box: { ...m.box, ...(m.ground.box || {}) } }), gnd: true };
  }
  // ボルテージ技: 技に voltage: { need, use, ...上書き } を書くと、ゲージが need 以上たまっているときに強化版が出る
  for (const k in mv) {
    const m = c.moves[k];
    if (!m || !m.voltage) continue;
    const V = m.voltage, ov = { ...V };
    delete ov.need; delete ov.use;
    mv[k].vb = { ...mv[k], ...buildMove(c, k, { ...m, ...ov, box: { ...(m.box || {}), ...(ov.box || {}) } }), boosted: true, vneed: V.need ?? 50, vuse: V.use ?? V.need ?? 50 };
    if (ov.projectile) { mv[k].vb.pjo = { ...(mv[k].pjo || {}), ...ov.projectile }; mv[k].vb.proj = true; delete mv[k].vb._pj; }   // 強化版の弾(リナのサンダーボルト・MAX など)
  }
  return { spg: spIn(c.sp), nm: c.name, ds: c.desc, vt: c.voltage ? { max: 100, perDamage: 1.6, guard: 3, hurt: 0.6, decay: 0, color: '#ffe14a', ...c.voltage } : null, dir: { ...DIR_DEFAULT, ...(c.look.dir || {}) }, col: c.look.color, sm: c.look.smooth || {}, ...remap(c.stats, STAT_MAP), pj: remap(c.projectile, PJ_MAP), pjRaw: c.projectile, cb: c.combos, zn: c.zones || {}, hm: Object.fromEntries(Object.entries(c.hitPoses || {}).map(([k, v]) => [k, poseIn(v)])), cg: { ...CROUCH_PARRY, ...(c.crouchParry || {}) }, ps: { ...DEFAULT_POSES, ...Object.fromEntries(Object.entries(c.poses || {}).map(([k, v]) => [k, k === 'walk' ? v : poseIn(v)])) }, th: throwIn(c.throw) || DEFAULT_THROW, ko: koIn(c.ko), rage: c.rage ? { hp: 0.35, dmg: 1.15, ...c.rage } : null, aq: c.aqua ? { max: 100, decay: 0.06, delay: 18, color: '#5fe0ff', ...c.aqua } : null, pupRaw: c.puppet ? { ...(typeof PUPPET_DEFAULT !== 'undefined' ? PUPPET_DEFAULT : {}), ...c.puppet } : null, mv };
}
const CH = CHARACTERS.map(buildChar),
  SY = CHARACTERS.map((c) => bodyLook(c)),
  SKN = CHARACTERS.map((c) => c.look.skin);
// スキンごとの体の色(服・靴・手袋など)。大きさ(当たり判定に使う値)はいつも元のキャラと同じ
const SY_SIZE_KEYS = ['sc', 'hr', 'hr2', 'tl', 'bw', 'ua', 'uaw', 'la', 'law', 'ul', 'll', 'lgw', 'tw', 'sw'];
const SY_SKIN = {};
function skinBodyLook(ci, s) {
  if (!s || typeof charDrawOf !== 'function') return SY[ci];
  const key = ci + '_' + s;
  if (!SY_SKIN[key]) {
    const cd = charDrawOf(CHARACTERS[ci].name, s);
    if (cd === CHARACTER_DRAWS[CHARACTERS[ci].name]) SY_SKIN[key] = SY[ci];
    else {
      const Y = bodyLook(CHARACTERS[ci], cd.body || {});
      for (const k of SY_SIZE_KEYS) Y[k] = SY[ci][k];
      SY_SKIN[key] = Y;
    }
  }
  return SY_SKIN[key];
}

// ※ 技のエフェクト・炎・ヒット演出の処理(atkFx / spawnEffect / drawFx など)は effect.js

const ST = [
    { nm: '道場', env: '通常', g: 0.8, acc: 0.3 },
    { nm: '氷原', env: '床が滑る', g: 0.8, acc: 0.04 },
    { nm: '月面', env: '低重力', g: 0.34, acc: 0.3 },
    { nm: '火山', env: '間欠泉でダメージ', g: 0.8, acc: 0.3 },
  ],
  RK = { n: 0, d: 1, an: 1, f: 2, b: 2, u: 2, au: 2, af: 2, ad: 2, da: 2, s: 4, sf: 5, sb: 5, sd: 5, su: 6 };

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
  cbMoves: {},
  airStunCanExpire: false,
  moveLock: 0,
  volt: 0, // ボルテージ(character.js の voltage があるキャラだけ使う)
  sg: 0, //   SP ゲージ(ゲージ技・超必殺技に使う。全キャラ共通の仕組み)
});

// ================= SP ゲージ(ゲージ技・超必殺技) =================
//  全キャラ共通のゲージ。たまり方・最大値はキャラごとに character.js の sp で変えられる(省略した項目は SP_DEFAULT)
//   max   … 最大値
//   time  … 1F ごとに増える量(対戦中・動ける状態のとき。READY と K.O. のあとは増えない)
//   hit   … 当てたダメージ 1 あたり(コンボの4ヒット目からは半分 / 飛び道具は pj 倍 / ゲージ技・超必殺技そのものでは増えない)
//   combo … コンボの2ヒット目から、1ヒットごとに足す量
//   hurt  … 受けたダメージ 1 あたり(劣勢の側が少し追いつける)
//   guard … ガードしたとき(攻撃した側は guardAtk)
//   jg    … ジャストガード成功 / parry … 空中受け流し・しゃがみ受け流しの成功
//   color … ゲージの色
//  発動: Z と A を同時に押す(2F 以内のずれは同時とみなす)= ゲージ技(gx)/ ↓ を押しながら Z と A = 超必殺技(sx)
//   技を出した直後(3F 以内)にもう片方を押しても切り替わる。ゲージが足りなければ普通の技が出る。
//   ゲージ技はランク 7、超必殺技はランク 8 なので、当たった技からキャンセルしてつなげられる(超必殺技はゲージ技からもつながる)
// (SP_DEFAULT はキャラを作る前に要るので、ファイルの前の方(SL の上)にある)
const SUPER_FREEZE = 36;   // 超必殺技の暗転(この間は両者とも止まる)
function spIn(sp) { return { ...SP_DEFAULT, ...(sp || {}) }; }
const spOf = (p) => (p && p.ch && p.ch.spg) || SP_DEFAULT;
function spGain(p, v) {
  if (!p || !p.ch || !(v > 0) || p.st === 'ko') return;
  p.sg = Math.min(spOf(p).max, (p.sg || 0) + v);
}
// 技の無敵(超必殺技などの invincible F。出始めから)
const moveInvuln = (o) => o.st === 'atk' && !!o.mv && o.mv.inv > 0 && o.t <= o.mv.inv;
// Z と A を同時に押したか(2F 以内のずれは同時)
const gaugeInput = (p, i) => (i.at && i.sp) || (i.at && gfr - (p.spF ?? -99) <= 2) || (i.sp && gfr - (p.atF ?? -99) <= 2);
function gaugePick(p, i, air) {
  if (!(i.at || i.sp) || !gaugeInput(p, i)) return null;
  const mv = p.ch.mv, ok = (k) => mv[k] && (air ? mv[k].air : mv[k].air !== true) && (p.sg || 0) >= mv[k].cost;
  if (i.d) return ok('sx') ? 'sx' : null;
  return ok('gx') ? 'gx' : null;
}

// bounce(character.js の技の bounce: { x, y }): 当たる・ガードされると、技を出したキャラがこの速さで跳ね返る(x は前がプラス)
function hitBounce(p, m) {
  if (!p || !p.ch || !m || !m.bnc || p.st !== 'atk') return;
  if (m.bnc.x != null) p.vx = p.f * m.bnc.x;
  if (m.bnc.y != null) p.vy = m.bnc.y;
}
// 狂化(character.js の rage): 体力が rage.hp の割合以下になると、与えるダメージが rage.dmg 倍になる(バーサク)
const rageActive = (p) => !!(p && p.ch && p.ch.rage && p.hp > 0 && p.hp <= p.ch.hp * p.ch.rage.hp);
const rageMul = (p) => (rageActive(p) ? p.ch.rage.dmg : 1);
function applyHit(p, o, m, zn = 'torso', hy = null) {
  if (dashInvuln(o) || moveInvuln(o)) return;   // ダッシュの無敵(前 5F / 後ろ 8F)・技の無敵(超必殺技など)
  if ((o.st === 'throw' && o.tg >= 0) || o.st === 'held') return; // 投げ中は割り込めない
  if (typeof puppetShield === 'function' && puppetShield(p, o, m)) return;   // パペット(ロロ)が前にいれば身代わりになって受ける(puppet.js)
  // カウンター(ルリの逆流など): 構えの持続の間に攻撃を受けたら、ダメージを受けずに打ち返しの技(mv.ctr)へ移る。飛び道具は跳ね返す('jg' を返す)
  if (o.st === 'atk' && o.mv && o.mv.ctr && o.t > o.mv.st && o.t <= o.mv.st + o.mv.ac) {
    const att = p.ch ? p : p.own, C = o.mv.ctr;
    if (att) o.f = att.x < o.x ? -1 : 1;          // 攻撃してきた相手の方を向く
    o.mv = C; o.t = 0; o.hit = false; o.hitN = 0; o.contact = false; o.noCancel = false; o.rcExtra = 0; o.armorN = 0;
    o.mvId = (o.mvId || 0) + 1;
    hs = Math.max(hs, 12);
    fx.push({ k: 'ring', x: o.x, y: o.y - 60, r: 80, t: 14, l: 14, c: '#5fd6ff' });
    dust(o.x + o.f * 30, o.y - 60, 10, '#9fe8ff');
    spawnEffect(o, C, 'start');
    if (p.ch) p.noCancel = true;                    // カウンターされた側は、その技からキャンセルできない
    return p.ch ? 'ctr' : 'jg';
  }
  p.hit = true;
  p.contact = true; // この判定が相手に触れた(多段技の回数を数える)
  const owner = p.ch ? p : p.own, mid = p.ch ? p.mvId : p.mid; // 攻撃したキャラ / どの技か(飛び道具は撃った技)。試合の記録に使う
  const spAtk = owner && owner.ch && !(owner.st === 'atk' && owner.mv && owner.mv.cost); // ゲージ技・超必殺技そのものではゲージは増えない
  if (isJustGuard(o) && !m.ub) {
    msGuard(o, true);               // 試合の記録: ジャストガード
    spGain(o, spOf(o).jg);          // SP ゲージ: ジャストガードは大きく増える
    hs = HIT_STOP.justGuard;
    o.sh = Math.min(o.ch.shm || 60, o.sh + 12);
    o.st = 'shield';                // 押し続けていれば、すき間なしでふつうのガード / 離せばすぐ動ける
    o.t = jgWin(o) + JUST_GUARD.gap;
    o.jgFree = true;
    o.pg = 24;
    o.vx = 0;
    dust(o.x + p.f * 30, o.y - 60, 8, '#7df');
    if (p.st === 'atk') {
      p.st = 'hit';
      p.hz = 'torso';
      p.t = 30;
      p.hitStunFull = 30;           // 空中でジャストガードされたら、着地してからこの硬直が始まる
      p.airStunCanExpire = false;
      p.mv = null;
      p.vx = -p.f * 4;
    }
    fx.push({ x: o.x + p.f * 30, y: o.y - 60, t: 22, jg: 1 });
    return 'jg';
  }
  if (typeof aquaTrigger === 'function') aquaTrigger(owner, p, o);   // 水まとい: 当たった・ガードされた技の追撃を予約(projectile.js)
  if (isGuarding(o) && !m.ub) {
    msGuard(o, false);              // 試合の記録: ふつうのガード
    spGain(o, spOf(o).guard);
    if (spAtk) spGain(owner, spOf(owner).guardAtk);
    voltGain(p.ch ? p : p.own, 'guard', m.d);   // ガードされてもボルテージは少したまる
    p.noCancel = true; // ガードされた技からはキャンセルできない(当たったのを見てからキャンセルする=ヒット確認)
    o.sh -= Math.max(3, m.d) * 1.6;
    o.vx = p.f * m.kx * 0.4;
    p.vx = -p.f * 2.5;
    hitBounce(p, m);                // bounce: ガードされても跳ね返る
    hs = m.ghs ?? HIT_STOP.guard; // 飛び道具は guardHitStop を持たないので既定値
    fx.push({ x: o.x, y: o.y - 60, t: 8 });
    if (o.sh <= 0) {
      o.st = 'break';
      o.t = 100;
      o.sh = o.ch.shm || 60;
    }
    return;
  }
  // アーマー(ゲージ技など armor: 回数): 技の出始め〜持続の間は、その回数まで攻撃を受けてものけぞらない(ダメージは半分受ける)
  if (o.st === 'atk' && o.mv && o.mv.armor > 0 && o.t <= o.mv.st + o.mv.ac && (o.armorN | 0) < o.mv.armor) {
    o.armorN = (o.armorN | 0) + 1;
    const hp0 = o.hp, d = Math.max(1, Math.round(m.d * ((p.ch && p.ch.dm) || 1) * rageMul(owner) * 0.5));
    o.hp = Math.max(0, o.hp - d);
    msHit(owner, o, hp0 - o.hp, 0, mid);
    spGain(o, (hp0 - o.hp) * spOf(o).hurt);
    p.noCancel = true;
    hs = 10;
    fx.push({ k: 'ring', x: o.x, y: o.y - 60, r: 60, t: 12, l: 12, c: '#fff' });
    fx.push({ k: 'txt', text: 'ARMOR', x: o.x, y: o.y - 140, t: 30, l: 30, c: '#ffd36b', s: 18 });
    dust(o.x - o.f * 10, o.y - 60, 8, '#ffd36b');
    return;
  }
  const cy = hy == null ? o.y - 60 : hy,
    apOk = o.st === 'apar' && o.t > AIR_PARRY.startup && o.t <= AIR_PARRY.startup + AIR_PARRY.active,   // 空中受け流しの受付中
    lowHit = (!!p.ch || !!p.pup) && p.y >= GY && (isLowMove(m) || m.ub),   // つかみ技(unblockable)もしゃがみ受け流しできない                     // 下段攻撃(しゃがみ受け流しできない)
    cg = (o.dn && o.st === 'idle' && o.y >= GY && !lowHit) || apOk ? o.ch.cg : null; // しゃがみ中・空中受け流しの受付中に被弾 → 受け流し(倍率は同じ)
  if (cg && zn === 'head') zn = 'torso'; // 受け流したときは頭の補正(ダメージ・硬直・吹っ飛び・ヒットストップ・HEAD! の表示)をかけない。胴と同じ扱い
  const Z = zoneInfo(o, zn);
  if (apOk) {
    dust(o.x - p.f * 20, o.y - 60, 8, '#9ff');
    fx.push({ k: 'ring', x: o.x, y: o.y - 60, r: 70, t: 16, l: 16, c: '#9ff' });
    fx.push({ k: 'txt', text: '空中受け流し!', x: o.x, y: o.y - 130, t: 34, l: 34, c: '#9ff', s: 18 });
  }
  if (cg) {
    p.noCancel = true; // 受け流された側は、この技からキャンセルできない
    p.rcExtra = cg.lag || 0; // 受け流された側は、この技の後隙が伸びる
    if (p.rcExtra && trShowText() && p.ch) fx.push({ k: 'txt', text: '後隙+' + p.rcExtra + 'F', x: p.x, y: p.y - 140, t: 36, l: 36, c: '#f99', s: 16 });
  }
  if (o.st === 'hit') o.cb++;
  else {
    o.cb = 1;
    o.cbMoves = {};
    o.airStunCanExpire = false;
  }
  // 多段技の2発目以降は「同じ技の繰り返し」に数えない。ただしコンボが途切れて記録が空になったときは数える
  //   (数えないと下の repeatStun が NaN になり、硬直が終わらなくなる)
  if (!(p.hitN > 0) || !o.cbMoves[m.k]) o.cbMoves[m.k] = (o.cbMoves[m.k] || 0) + 1;
  if (o.cbMoves[m.k] >= 2) o.airStunCanExpire = true;
  const repeatStun = Math.max(0.8, 1 - 0.15 * (o.cbMoves[m.k] - 1));
  o.cbn = o.cb;
  o.cbT = 70;
  const d = Math.max(1, Math.round(m.d * ((p.ch && p.ch.dm) || 1) * rageMul(owner) * (p.crAtk ? CROUCH_ATTACK : 1) * Z.dmg * (cg ? cg.dmg : 1) * Math.max(m.ms ?? 0.5, 1 - 0.07 * (o.cb - 1))));   // ms = 補正の下限(超必殺技はコンボの最後でも威力が落ちにくい)
  const hp0 = o.hp;
  o.hp = Math.max(0, o.hp - d);
  msHit(owner, o, hp0 - o.hp, apOk ? 0 : o.cb, mid); // 試合の記録: ダメージ・コンボ・命中
  if (m.drain > 0 && owner && owner.ch && owner.hp > 0 && hp0 > o.hp) {   // 吸血: 与えたダメージの drain 倍だけ体力が戻る(最大体力まで)
    const heal = Math.max(1, Math.round((hp0 - o.hp) * m.drain)), h0 = owner.hp;
    owner.hp = Math.min(owner.ch.hp, owner.hp + heal);
    if (owner.hp > h0) {
      fx.push({ k: 'txt', text: '吸血 +' + (owner.hp - h0), x: owner.x, y: owner.y - 150, t: 34, l: 34, c: '#ff4a5a', s: 16 });
      dust(owner.x, owner.y - 60, 8, '#c8102e');
    }
  }
  { // SP ゲージ: 当てた側(コンボの4ヒット目からは半分・飛び道具は少なめ)/ 受けた側 / 受け流した側
    const dd = hp0 - o.hp, sa = spOf(owner);
    if (spAtk) spGain(owner, dd * sa.hit * (o.cb > 3 ? 0.5 : 1) * (p.ch ? 1 : sa.pj) + (o.cb >= 2 ? sa.combo : 0));
    spGain(o, dd * spOf(o).hurt + (apOk || cg ? spOf(o).parry : 0));
    if (owner && owner.st === 'atk' && owner.mv && owner.mv.sup && msOf(owner)) msOf(owner).sxHit++;
  }
  { const sa = msOf(owner), sd = msOf(o);           // 試合の記録: 頭・飛び道具・受け流し(実績用)
    if (sa) { if (zn === 'head') sa.head++; if (!p.ch) sa.pj++; }
    if (sd) { if (apOk) sd.apar++; else if (cg) sd.cparry++; } }
  voltGain(p.ch ? p : p.own, 'hit', d);      // 当てた側: ダメージに応じてボルテージがたまる
  voltGain(o, 'hurt', d);                     // 受けた側も少したまる
  o.st = 'hit';
  o.apFail = false;                 // 空中受け流しの失敗は、攻撃を受けたら消える(着地硬直はやられの方を使う)
  o.hz = zn;
  o.t = Math.round(m.hs * Z.stun * (cg ? cg.stun : 1) * Math.max(0.55, 1 - 0.07 * (o.cb - 1)) * repeatStun);
  o.hitStunFull = o.t;              // 技の硬直(空中で受けたら、着地してからこの分だけ硬直する)
  o.cr = !!cg && !apOk; // 硬直中もしゃがみ姿勢のまま(空中受け流しはしゃがまない)
  o.apHit = apOk;                   // 空中受け流しで受けた硬直: 空中でも減って切れ、着地しても伸びない
  if (apOk) o.airStunCanExpire = true;
  o.vx = p.f * m.kx * Z.knock * (cg ? cg.knock : 1) * (o.ch.wt || 1);
  o.vy = cg ? 0 : m.ky * Z.knock * (o.ch.wt || 1); // 受け流しは浮かない
  o.spike = cg || apOk ? 0 : m.spk || 0;   // 叩きつけ: 地面に落ちたら、この速さでバウンドする(受け流したときは無し)
  //if (!cg && Z.pop && o.y >= GY) o.vy = Math.min(o.vy, Z.pop); // 脚に当たると足をすくわれて浮く
  if (o.vy < -2) o.y -= 2;
  o.mv = null;
  if (apOk) {                       // 空中受け流し: 硬直なし(ヒットストップが解けたらすぐ動ける)。ダメージ・吹っ飛びは受け流しの倍率で受ける
    o.st = 'idle';
    o.t = 0;
    o.apHit = false;
    o.cb = 0;                       // やられていないので、コンボにも数えない
    o.cbMoves = {};
  }
  hitBounce(p, m);                  // bounce: 当てた側が跳ね返る(シノの空中二段蹴りなど)
  hs = cg ? cg.stop : (m.hst ?? Math.min(HIT_STOP.hitMax, Math.round(HIT_STOP.hitBase + d * HIT_STOP.hitPerDamage))) + (Z.stop || 0);
  const c = fxColor(m) || '#ff8',
    zc = Z.color || c;
  dust(o.x, cy, 10, c);
  fx.push({ x: o.x, y: cy, t: 12, l: 12, c: zn === 'torso' || zn === 'arms' ? c : zc });
  fx.push({ k: 'ring', x: o.x, y: cy, r: 55, t: 10, l: 10, c });
  if (p.ch) spawnEffect(p, m, 'hit', o.x, cy); // 技ごとの「当たった瞬間」のエフェクト
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
  p.thr = null;      // ふつうの投げ(キャラの throw の表)
}
// コマンド投げを始める(begin から。技の grab の設定 G で投げる。G の作り方は buildGrab)
function beginGrab(p, G) {
  p.st = 'throw';
  p.t = 0;
  p.tg = -1;
  p.hit = false;
  p.thr = G;
  p.td = G.dir;
  p.mv = null;
  p.thrHitN = 0;
  if (G.fxm) spawnEffect(p, G.fxm, 'start');
}
// 掴み判定の範囲に相手がいるか(状態は見ない)
function grabReach(p, o, T) {
  const bx = p.f > 0 ? p.x + T.box.x : p.x - T.box.x - T.box.w,
    by = p.y + T.box.y;
  return bx < o.x + 22 && bx + T.box.w > o.x - 22 && by < o.y && by + T.box.h > o.y - 100;
}
function canGrab(p, o, T) {
  // 掴める状態: 待機・ガード・着地隙・ダッシュ・攻撃中・ブレイク・硬直中、と まだ掴んでいない投げ(掴みが出る前・空振りの隙)
  if (!['idle', 'shield', 'sdown', 'land', 'dash', 'atk', 'break', 'hit'].includes(o.st) && !(o.st === 'throw' && o.tg < 0)) return false;
  if (o.y < GY) return false;
  if (dashInvuln(o) || moveInvuln(o)) return false;
  return grabReach(p, o, T);
}
// 投げ同士が同時に出たか(相手の掴みがほぼ同じタイミングで出ている)
function throwClash(p, o) {
  if (o.st !== 'throw' || o.tg >= 0 || !o.ch.th) return false;
  const To = o.ch.th, w = THROW_CLASH.window;
  return o.t >= To.startup + 1 - w && o.t <= To.startup + To.active && (grabReach(p, o, p.ch.th) || grabReach(o, p, To));
}
// 投げ相殺: お互い後ろへ弾かれて、同じだけ動けない
function doThrowClash(p, o) {
  for (const q of [p, o]) {
    q.st = 'hit';
    q.hz = 'torso';
    q.t = q.hitStunFull = THROW_CLASH.stun;
    q.airStunCanExpire = true;
    q.mv = null;
    q.tg = -1;
    q.throwCombo = false;
    q.cr = false;
    q.vx = -q.f * THROW_CLASH.push;
    q.vy = 0;
  }
  hs = THROW_CLASH.stop;
  const mx = (p.x + o.x) / 2, my = Math.min(p.y, o.y) - 70;
  fx.push({ k: 'ring', x: mx, y: my, r: 70, t: 14, l: 14, c: '#fff' });
  fx.push({ k: 'txt', text: '投げ相殺!', x: mx, y: my - 60, t: 36, l: 36, c: '#fff' });
  dust(mx, my, 12, '#fff');
}
function throwStep(p, o) {
  const T = p.thr || p.ch.th;
  p.t++;
  p.vx = 0;
  if (p.tg < 0) {
    if (T.cmd && p.t === T.startup + 1 && T.lunge) p.x = Math.max(30, Math.min(W - 30, p.x + p.f * T.lunge));   // 踏み込んでつかむ(コマンド投げ)
    if (!T.cmd && p.t > T.startup && p.t <= T.startup + T.active && throwClash(p, o)) {   // 投げ相殺はふつうの投げどうしだけ
      doThrowClash(p, o); // 同時に掴んだ → 投げ相殺
      return;
    }
    if (p.t > T.startup && p.t <= T.startup + T.active && canGrab(p, o, T)) {
      const comboContinue = o.st === 'hit' && o.cb > 0;
      p.tg = p.t;
      p.throwCombo = comboContinue;
      o.st = 'held';
      o.hd = p.td;
      o.hdPose = (T.motion && T.motion[p.td] && T.motion[p.td].held) || null;
      o.mv = null;
      o.vx = o.vy = 0;
      hs = HIT_STOP.grab;
      fx.push({ k: 'ring', x: o.x, y: o.y - 60, r: 60, t: 10, l: 10, c: T.color || '#fa3' });
      fx.push({ k: 'txt', text: T.cmd ? T.name + '!' : '掴み!', x: o.x, y: o.y - 125, t: 24, l: 24, c: T.color || '#fa3' });
      const FX = thrDir(T, p.td).fxm;
      if (FX) spawnEffect(p, FX, 'attack', o.x, o.y - 60);
    } else if (p.t > T.startup + T.active + T.whiff) { p.st = 'idle'; p.thr = null; }
    return;
  }
  const DS = thrDir(T, p.td), H = DS.hold, REL = DS.release, k = Math.min(1, (p.t - p.tg) / Math.max(1, REL - p.tg));
  if (p.t < REL) {
    const u = ez((p.t - p.tg) / Math.max(1, REL - p.tg - 4));
    if (DS.leap) { p.y = GY - DS.leap * Math.sin(Math.PI * k); p.vy = 0; }     // 跳び上がって、投げる瞬間に着地する(パイルドライバーなど)
    if (DS.swing) {                                                            // 相手を振り回す(ジャイアントスイング): 体のまわりを回る
      const a = k * Math.PI * 2 * DS.swing, R = H.x;
      o.x = Math.max(30, Math.min(W - 30, p.x + p.f * Math.cos(a) * R));
      o.y = p.y - H.y + Math.sin(a) * R * 0.25;
      o.f = Math.cos(a) >= 0 ? -p.f : p.f;
      if ((fr & 3) === 0) dust(o.x, o.y - 40, 2, T.color || '#fff');
    } else {
      o.x = Math.max(30, Math.min(W - 30, p.x + p.f * (30 + (H.x - 30) * u)));
      o.y = p.y - H.y * u;
      o.f = -p.f;
    }
    for (const h of DS.hits || []) if (p.t - p.tg === h.at) grabHitTick(p, o, T, h, DS.fxm);   // つかんでいる間の打撃(かみつき・しめつけ など)
  } else if (p.t === REL) {
    if (DS.leap) { p.y = GY; p.vy = 0; }
    releaseThrow(p, o, T);
  }
  if (p.t > DS.total) { p.st = 'idle'; p.thr = null; }
}
// コマンド投げ: つかんでいる間の打撃(T.hits の1つ)。ダメージ・吸血・エフェクト・小さなヒットストップ
function grabHitTick(p, o, T, h, FX = T.fxm) {
  const hp0 = o.hp, d = Math.max(1, Math.round((h.damage || 0) * (p.ch.dm || 1) * rageMul(p)));
  o.hp = Math.max(1, o.hp - d);                                              // つかんでいる間は倒れない(投げの最後で決まる)
  msHit(p, o, hp0 - o.hp, o.cb, null);
  spGain(p, (hp0 - o.hp) * spOf(p).hit);
  if (h.drain > 0 && p.hp > 0) {
    const h0 = p.hp;
    p.hp = Math.min(p.ch.hp, p.hp + Math.max(1, Math.round((hp0 - o.hp) * h.drain)));
    if (p.hp > h0) fx.push({ k: 'txt', text: '吸血 +' + (p.hp - h0), x: p.x, y: p.y - 150, t: 30, l: 30, c: '#ff4a5a', s: 15 });
  }
  hs = Math.max(hs, h.stop ?? 5);
  if (FX) spawnEffect(p, FX, 'hit', o.x, o.y - 50);
  fx.push({ x: o.x, y: o.y - 50, t: 10, l: 10, c: T.color || '#fff' });
}
// 後ろ投げで、相手を投げた側の後ろへ置くときの間隔(px)。押し合い(30px より近いと押し離す)より広くして、入れ替わった並びを保つ
const BACK_THROW_GAP = 40;
function releaseThrow(p, o, T) {
  const dd = T[p.td],
    d = Math.max(1, Math.round(dd.damage * (p.ch.dm || 1))),
    w = o.ch.wt || 1,
    sg = p.td === 'b' ? -1 : 1,
    continueCombo = !!p.throwCombo;
  const hp0 = o.hp;
  o.hp = Math.max(0, o.hp - d);
  voltGain(p.ch ? p : p.own, 'hit', d);      // 当てた側: ダメージに応じてボルテージがたまる
  voltGain(o, 'hurt', d);                     // 受けた側も少したまる
  o.st = 'hit';
  o.hz = 'torso';
  o.t = dd.hitstun;
  o.hitStunFull = o.t;
  o.spike = 0;
  o.mv = null;
  if (continueCombo && o.cb > 0) {
    o.cb++;
    o.cbMoves = o.cbMoves || {};
    o.cbMoves.throw = (o.cbMoves.throw || 0) + 1;
    if (o.cbMoves.throw >= 2) o.airStunCanExpire = true;
  } else {
    o.cb = 1;
    o.cbMoves = {};
    o.airStunCanExpire = false;
    o.cbMoves.throw = 1;
  }
  o.cbn = o.cb;
  o.cbT = 70;
  msHit(p, o, hp0 - o.hp, o.cb, null); // 試合の記録(投げは命中率には数えない)
  spGain(p, (hp0 - o.hp) * spOf(p).hit);          // SP ゲージ
  spGain(o, (hp0 - o.hp) * spOf(o).hurt);
  if (msOf(p)) msOf(p).thr++;
  p.throwCombo = false;
  o.vx = p.f * sg * dd.vx * w;
  o.vy = dd.vy * w;
  if (dd.spike) o.spike = dd.spike;                                          // コマンド投げ: 叩きつけ(地面でバウンド)
  if (dd.drain > 0 && hp0 > o.hp) { const h0 = p.hp; p.hp = Math.min(p.ch.hp, p.hp + Math.max(1, Math.round((hp0 - o.hp) * dd.drain))); if (p.hp > h0) fx.push({ k: 'txt', text: '吸血 +' + (p.hp - h0), x: p.x, y: p.y - 150, t: 30, l: 30, c: '#ff4a5a', s: 15 }); }
  { const FX = thrDir(T, p.td).fxm;                                          // 「投げた瞬間」のエフェクトと止まり(コマンド投げ・方向ごとに effect を書いた投げ)
    if (T.cmd || dd.stop != null) hs = Math.max(hs, dd.stop ?? 14);
    if (FX) spawnEffect(p, FX, 'hit', o.x, o.y - 40); }
  if (p.td === 'b') {                                  // 後ろ投げ: 相手を自分の後ろへ(立ち位置が入れ替わる)
    const want = p.x - p.f * BACK_THROW_GAP;
    o.x = Math.max(30, Math.min(W - 30, want));
    // 壁際で後ろに入る場所が足りないときは、投げた側が前へずれて、相手が後ろに収まるだけの間をあける(重なって入れ替わらないのを防ぐ)
    if (Math.abs(o.x - want) > 0.5) p.x = Math.max(30, Math.min(W - 30, o.x + p.f * BACK_THROW_GAP));
  }
  if (p.td === 'd') {
    o.x = Math.max(30, Math.min(W - 30, p.x + p.f * 38));
    o.y = GY; // 地面に叩きつけ→バウンド
    fx.push({ k: 'ring', x: o.x, y: GY, r: 110, e: 1, t: 16, l: 16, c: '#fa3' });
  }
  hs = Math.min(HIT_STOP.throwMax, Math.round(HIT_STOP.throwBase + d * HIT_STOP.throwPerDamage));
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
    fw = (i.r && p.f > 0) || (i.l && p.f < 0),
    bk = (i.l && p.f > 0) || (i.r && p.f < 0); // 後ろ(相手と反対)を押している
  const gk = gaugePick(p, i, air); // Z と A の同時押し → ゲージ技 / ↓ + Z と A → 超必殺技(ゲージが足りるときだけ)
  if (gk) return gk;
  const ck = pickCommand(p, i, air); // コマンドが成立していればコマンド技を優先
  if (ck) return ck;
  if (i.sp && !air) return i.u ? 'su' : i.d && p.ch.mv.sd ? 'sd' : fw ? 'sf' : bk && p.ch.mv.sb ? 'sb' : 's'; // ↓+A = 下必殺 sd
  if (air) return i.u ? 'au' : i.d ? 'ad' : fw ? 'af' : 'an';
  if (i.u) return 'u';
  if (i.d) return 'd';
  if (fw)
    return p.run > 14 || p.st === 'dash' || Math.abs(p.vx) > p.ch.sp * 1.3
      ? 'da'
      : 'f';
  if (bk && p.ch.mv.b) return 'b'; // 後ろ+Z
  return 'n';
}

// ================= ボルテージ =================
//  character.js の voltage: { max, perDamage, guard, hurt, decay, color } を書いたキャラだけが持つゲージ
//  当てる(ダメージ×perDamage)・ガードされる(guard)・攻撃を受ける(ダメージ×hurt)でたまり、decay(1Fごと)で減る
//  技の voltage: { need, use, ... } … ゲージが need 以上なら、use だけ使って強化版(... に書いた値で上書き)が出る
function voltGain(p, kind, d) {
  const V = p && p.ch && p.ch.vt;
  if (!V) return;
  const add = kind === 'hit' ? d * V.perDamage : kind === 'hurt' ? d * V.hurt : V.guard;
  const was = p.volt || 0;
  p.volt = Math.min(V.max, was + add);
  if (was < V.max && p.volt >= V.max) fx.push({ k: 'txt', text: 'VOLTAGE MAX!', x: p.x, y: p.y - 150, t: 40, l: 40, c: V.color, s: 18 });
}
function voltStep(p) {
  const V = p && p.ch && p.ch.vt;
  if (!V) return;
  if (V.decay) p.volt = Math.max(0, (p.volt || 0) - V.decay);
  // たまっているほど体のまわりに火花が散る(MAX では多く)
  const r = (p.volt || 0) / V.max;
  if (r > 0.5 && R() < (r >= 1 ? 0.5 : 0.15)) {
    const a = R() * Math.PI * 2, d = 18 + R() * 22;
    PT.push({ x: p.x + Math.cos(a) * d, y: p.y - 60 + Math.sin(a) * d * 1.4, vx: (R() - 0.5) * 2, vy: -R() * 2, t: 10, l: 10, c: R() < 0.4 ? '#fff' : V.color, g: 0, s: 0.5 });
  }
}
function voltBurst(p) {
  const V = p.ch.vt, c = (V && V.color) || '#ffe14a';
  fx.push({ k: 'ring', x: p.x, y: p.y - 60, r: 90, t: 14, l: 14, c });
  fx.push({ k: 'txt', text: p.mv.nm, x: p.x, y: p.y - 165, t: 36, l: 36, c, s: 18 });
  dust(p.x, p.y - 60, 12, c);
}

function begin(p, k, fromCrouch = false) {
  p.mvId = (p.mvId || 0) + 1; // 技を出すたびに番号を変える(CPU が「この技でつなぐか」を1回だけ判断するため)
  p.st = 'atk';
  p.t = 0;
  p.hit = false;
  p.hitN = 0; //        この技が当たった(ガードされた)回数(多段技用)
  p.noCancel = false; // ガード・受け流しされたら true(この技からキャンセルできない)
  p.rcExtra = 0; //       受け流されたら後隙が伸びる分(F)
  p.cx = 0;
  p.crAtk = !!fromCrouch; // しゃがみから出した技(ダメージ ×CROUCH_ATTACK)
  p.mv = p.ch.mv[k];
  if (p.mv.gv && p.y >= GY) p.mv = p.mv.gv; // 地上版がある技を地上で出した
  if (p.mv.vb && (p.volt || 0) >= p.mv.vb.vneed) {  // ボルテージがたまっている → 強化版(ゲージを使う)
    p.volt -= p.mv.vb.vuse;
    p.mv = p.mv.vb;
    voltBurst(p);
  }
  if (p.mv.solo && ((p.pup && p.pup.st === 'crash') || p.selfH)) p.mv = p.mv.solo;   // パペットがいない / 本体の必殺のキーを押しながら → 本体だけの技(solo)
  if (p.mv.grab) return beginGrab(p, p.mv.grab);   // コマンド投げ(技の grab)
  if (typeof puppetOnMove === 'function') puppetOnMove(p, k, p.mv);   // パペット(ロロ): 技に合わせて動く(puppet.js)
  if (p.mv.rw > 0 || isPJMove(p.mv)) { const st = msOf(p); if (st) st.att++; } // 試合の記録: 出した技の数(攻撃判定か飛び道具がある技)
  p.armorN = 0;
  if (p.mv.cost) {                   // ゲージ技・超必殺技: SP ゲージを使う
    p.sg = Math.max(0, (p.sg || 0) - p.mv.cost);
    if (msOf(p)) msOf(p)[p.mv.sup ? 'sxUse' : 'gxUse']++;
    if (p.mv.vadd && p.ch.vt) p.volt = Math.min(p.ch.vt.max, (p.volt || 0) + p.mv.vadd); // ボルテージも増やす技(リナ)
    if (p.mv.sup) {                  // 超必殺技: 暗転して両者が止まり、技名が出る
      hs = Math.max(hs, SUPER_FREEZE);
      p.sflash = SUPER_FREEZE;
    } else {
      fx.push({ k: 'ring', x: p.x, y: p.y - 60, r: 80, t: 14, l: 14, c: spOf(p).color });
      fx.push({ k: 'txt', text: p.mv.nm, x: p.x, y: p.y - 150, t: 34, l: 34, c: spOf(p).color, s: 18 });
    }
  }
  if (p.mv.bc > 0 && p.hp > 1) {     // 血の代償: 技を出すと自分の体力が減る(1 より下にはならない)
    const h0 = p.hp;
    p.hp = Math.max(1, p.hp - p.mv.bc);
    fx.push({ k: 'txt', text: '血の代償 -' + (h0 - p.hp), x: p.x, y: p.y - 130, t: 34, l: 34, c: '#ff4a5a', s: 16 });
    dust(p.x, p.y - 60, 10, '#a0001a');
  }
  if (p.mv.veil > 0 && p.ch.aq) {    // 水まとい(ルリのアクアヴェール): AQUA ゲージをためる
    p.aq = Math.min(p.ch.aq.max, (p.aq || 0) + p.mv.veil);
    p.aqQ = p.aqQ || [];
  }
  spawnEffect(p, p.mv, 'start'); // 技の出始めのエフェクト(溜めなど)
  if (p.mv.cmd && trShowText()) fx.push({ k: 'txt', text: p.mv.nm, x: p.x, y: p.y - 140, t: 30, l: 30, c: '#9df', s: 16 });
}

function step(p, i, o, S) {
  recordInput(p, i); // コマンド判定用の入力の記録
  if (i.at) p.atF = gfr; // Z / A を押したF(同時押し = ゲージ技の判定に使う)
  if (i.at) { p.atMv = p.mvId; p.atIn = { u: !!i.u, d: !!i.d, l: !!i.l, r: !!i.r }; }   // Z を押した: 技が出なければロロだけが動く(puppet.js)
  if (i.sp) { p.spF = gfr; p.spMv = p.mvId; p.spIn = { u: !!i.u, d: !!i.d, l: !!i.l, r: !!i.r }; }   // A を押した: 次のFに、技が出たかどうかを puppet.js が見る(出なければロロだけ動く)
  p.spH = !!i.spH; // A の長押し(puppet.js)
  p.selfH = !!i.selfH; // 本体の必殺のキーを押している(begin で技の solo を使う)
  p.humanIn = i.spH !== undefined; // キーで操作しているキャラ(CPU・トレーニングのダミーは spH を持たない)
  const c = p.ch,
    wa = p.y < GY;
  let takeoff = false; // ジャンプ前隙が終わって跳び上がったフレーム(このフレームは地上行動を受け付けない)
  if (p.st === 'held') {
    // 掴まれ中:動けない(攻撃側が離れたら解除)
    p.vx = p.vy = 0;
    if ((o.st !== 'throw' || o.tg < 0) && !p.pupHeld) p.st = 'idle';   // パペットにつかまれている間(pupHeld)は、パペットが離すまで
    return;
  }
  if (p.moveLock > 0) p.moveLock--;
  if (p.st === 'hit' || p.st === 'break') {
    // 空中の硬直: 着地するまで減らない(動けない)。着地すると、その技の硬直(hitStunFull)が始まる
    //   ※ 同じ技を2回以上受けたとき(airStunCanExpire)は、空中でも減って切れる
    if (!Number.isFinite(p.t)) p.t = 1; // 念のため: 硬直が数値でなくなったら(計算の誤りなど)すぐ終わらせる
    if (p.st === 'hit' && wa && !p.airStunCanExpire) p.t = Math.max(p.t, 1);
    else if (--p.t <= 0) p.st = 'idle';
    if (p.st !== 'hit') p.apHit = false;
  } else if (p.st === 'throw') {
    throwStep(p, o);
  } else if (p.st === 'atk' && p.t < 3 && !p.mv.cost && (i.at || i.sp) && gaugePick(p, i, wa)) {
    begin(p, gaugePick(p, i, wa)); // 技を出した直後にもう片方のボタン → ゲージ技・超必殺技に切り替える
  } else if (p.st === 'atk') {
    p.t++;
    const m = p.mv;
    if (isPJMove(m) && p.t === m.st) spawnProjectiles(p, m, o); // 弾を撃つ(見た目・軌道は projectile.js)
    if (p.t === m.st + 1) atkFx(p, m);
    if (m.flt != null && p.y < GY && p.t <= m.st + m.ac) p.vy = Math.min(p.vy, m.flt);   // float: 空中で技を出している間、ふわっと止まる
    const launch = m.launch;
    if (p.t === m.st && launch) {                     // 移動ロック中に出した技でも動く(launch は技そのものの動き)
      if (launch.x != null) p.vx = p.f * launch.x;
      if (launch.y != null) p.vy = launch.y;
    }
    // 当たり判定: hits 回まで当たる(多段技)。2回目からは前に当たってから hitInterval F たってから
    if (p.t > m.st && p.t <= m.st + m.ac && m.rw > 0) {
      const N = m.hits || 1, iv = m.hiv || Math.max(1, Math.floor(m.ac / N));
      if ((p.hitN | 0) < N && (!p.hitN || p.t - p.hitT >= iv)) {
        p.contact = false;
        tryHit(p, o, m);
        if (p.contact) {
          p.hitN = (p.hitN | 0) + 1;
          p.hitT = p.t;
        }
      }
    }
    if (p.st !== 'atk') {
      // ジャストガードされて硬直(hit)になった: ここで技の終わりの判定をすると、硬直の値(p.t)を技のフレームと
      // 取り違えてすぐ動けるようになってしまうので、技の処理はここで終える
    } else if (p.t > m.st + m.ac + m.rc + (p.rcExtra || 0)) {
      p.st = 'idle';
      p.moveLock = Math.ceil(m.rc / 2);
    }
    else if (
      p.hit &&
      !p.cx &&
      !p.noCancel && // ガード・受け流しされたらキャンセルできない(ヒット確認が必要)
      p.t > m.st &&
      (i.at || i.sp)
    ) {
      const k = pick(p, i);
      if (rankOf(p, k) > rankOf(p, m.k)) begin(p, k);
    }
  } else if (p.st === 'shield') {
    p.t++;
    p.sh -= 0.05;
    // ガードから直接出せる行動(シールドを解除せずに出る): 投げ / 下必殺(↓A) / ジャンプ
    //   ふつうのガードが張られてから(ジャストガードの受付 + ガード判定なしの間は出せない。ジャストガード成功のあとはすぐ出せる)
    const oos = isGuarding(p);
    if (!oos) {
      if (!i.sh && p.t > 5) {           // まだ出せない間に離したとき
        p.st = 'sdown';
        p.t = 0;
      }
    } else if (i.th) {
      p.jgFree = false;
      beginThrow(p, i);
    } else if (i.sp && i.d && c.mv.sd) {
      p.jgFree = false;
      begin(p, 'sd');
    } else if (i.jp && !p.moveLock) {
      p.jgFree = false;
      if ((c.jsq | 0) > 0) {
        p.st = 'jsq';
        p.t = 0;
      } else {
        p.st = 'idle';
        p.vy = c.jp;
        takeoff = true;               // このフレームは地上の行動を受け付けない(押したままのシールドに戻らないように)
        dust(p.x, GY, 4);
      }
    } else if (!i.sh && p.jgFree) {        // ジャストガード成功のあと離した: すぐ動ける
      p.st = 'idle';
      p.jgFree = false;
    } else if (!i.sh && p.t > 5) {
      p.st = 'sdown';
      p.t = 0;
    }
  } else if (p.st === 'sdown') {
    if (++p.t > 10) p.st = 'idle';
  } else if (p.st === 'apar') {
    // 空中受け流し: 受付が過ぎたら失敗(空中の隙 → 着地すると長い着地硬直)
    const AP = AIR_PARRY;
    p.t++;
    if (p.t === AP.startup + AP.active + 1) {
      p.apFail = true;
      if (trShowText()) fx.push({ k: 'txt', text: '受け流し失敗', x: p.x, y: p.y - 130, t: 30, l: 30, c: '#f99', s: 15 });
    }
    if (p.y >= GY && p.t > AP.startup + AP.active) {
      // 受付の途中で着地していた: 受付が終わったら失敗の着地硬直
      p.st = 'land'; p.t = 1; p.lg = AP.failLand; p.apFail = false; p.moveLock = 0;
    } else if (p.t > AP.startup + AP.active + AP.whiff) p.st = 'idle';
  } else if (p.st === 'land') {
    if (++p.t > (p.lg || 9)) p.st = 'idle'; // 着地隙(技・ジャンプごとに p.lg を設定)
  } else if (p.st === 'jsq') {
    // ジャンプ前隙:しゃがみ終わりに跳ぶ
    if (++p.t >= (c.jsq | 0)) {
      p.st = 'idle';
      p.vy = c.jp;
      takeoff = true;
      dust(p.x, GY, 4);
    }
  } else if (p.st === 'dash') {
    p.t++;
    p.vx = p.dd * (c.dsh || 9) * Math.max(0.2, 1 - p.t / 16);
    if (p.t % 4 === 1) dust(p.x, GY, 2);
    if (p.t > 14) p.st = 'idle';
    else if (p.t > 6 && (i.at || i.sp)) {
      begin(p, pick(p, i));
    }
  }
  if (p.st === 'idle' && p.y >= GY) p.f = o.x > p.x ? 1 : -1;
  if (p.st !== 'shield') p.sh = Math.min(c.shm || 60, p.sh + 0.12);
  if (p.st === 'idle') {
    p.cb = 0;
    p.cbMoves = {};
  }
  if (p.st !== 'hit') p.cr = false;
  if (p.cbT > 0) p.cbT--;
  if (c.rg && p.hp > 0) p.hp = Math.min(c.hp, p.hp + c.rg);
  if (p.pg > 0) p.pg--;
  if (p.ld > 0) p.ld--;
  const air = p.y < GY,
    dir = (i.r ? 1 : 0) - (i.l ? 1 : 0),
    moveDir = p.moveLock > 0 ? 0 : dir;
  // 斜め下(↓ + ← か →)= ゆっくり歩き。このときはしゃがみ扱いにしない(食らい判定は立ち・受け流しなし)
  //   移動できないとき(移動ロック中・左右同時押し)は今までどおりしゃがみ
  const wasCrouch = !!p.dn && p.st === 'idle' && !wa; // 前のフレームでしゃがんでいた(しゃがみから攻撃 → 補正)
  p.sw = !!(i.d && moveDir && !air);
  p.dn = i.d && !p.sw;
  if (p.st === 'idle' && !takeoff) {
    if (i.dd && air) {
      // 空中受け流し(空中でしゃがみ2回 / 空中受け流しのキー)
      p.st = 'apar';
      p.t = 0;
      fx.push({ k: 'ring', x: p.x, y: p.y - 60, r: 55, t: AIR_PARRY.startup + AIR_PARRY.active, l: AIR_PARRY.startup + AIR_PARRY.active, c: '#9ff' });
    } else if (i.dh && !air && !p.moveLock) {
      p.st = 'dash';
      p.t = 0;
      p.dd = i.dh;
      p.bd = i.dh * p.f < 0;
      dust(p.x, GY, 5);
    } else if (i.sh && !air) {
      p.st = 'shield';
      p.t = 0;
      p.jgFree = false;
    } else if (i.th && !air) {
      beginThrow(p, i);
    } else if (i.at || i.sp) {
      begin(p, pick(p, i), wasCrouch);
    } else if (i.jp && !p.moveLock && !air && (c.jsq | 0) > 0) {
      p.st = 'jsq';
      p.t = 0;
      if (trShowText()) fx.push({ k: 'txt', text: 'ジャンプ前 ' + c.jsq + 'F', x: p.x, y: p.y - 125, t: 30, l: 30, c: '#9f9', s: 15 });
    } else if (i.jp && !p.moveLock && (!air || (p.dj | 0) < (c.dj ?? 1))) {
      if (air) {
        p.dj = (p.dj | 0) + 1;
        dust(p.x, p.y, 4);
      }
      p.vy = air ? c.jp * 0.85 : c.jp;
    }
  }
  p.run = p.st === 'idle' && !air && moveDir && !p.sw ? p.run + 1 : 0;   // ゆっくり歩きは走りにならない
  if (p.run > 14 && p.run % 7 === 0) dust(p.x, GY, 1);
  if (!air && p.st !== 'dash') {
    const tx =
      p.st !== 'idle' ? 0
        : p.sw ? moveDir * c.sp * (c.swk ?? SLOW_WALK) * (moveDir * p.f < 0 ? 0.7 : 1)   // ゆっくり歩き
        : !i.d ? moveDir * c.sp * (p.run > 14 ? 1.6 : 1) * (moveDir * p.f < 0 ? 0.7 : 1)
        : 0;
    p.vx += (tx - p.vx) * S.acc;
  } else if (p.st === 'idle') p.vx += (moveDir * c.sp - p.vx) * 0.06;
  p.x = Math.max(30, Math.min(W - 30, p.x + p.vx));
  p.y += p.vy;
  p.vy += S.g * (c.gm || 1);
  if (p.y >= GY && p.st === 'hit' && p.spike > 0 && p.vy > 0) {
    // 叩きつけられて地面でバウンド(もう一度浮くので追い打ちできる)。硬直は空中のまま続く
    p.y = GY - 1;
    p.vy = -p.spike;
    p.vx *= 0.45;
    p.spike = 0;
    dust(p.x, GY, 12, '#cba');
    fx.push({ k: 'ring', x: p.x, y: GY, r: 90, e: 1, t: 16, l: 16, c: '#fff' });
    fx.push({ k: 'txt', text: 'BOUND!', x: p.x, y: GY - 120, t: 30, l: 30, c: '#ffd36b', s: 18 });
    if (save.cfg.shake) { shakeT = Math.max(shakeT, 8); shakeP = Math.max(shakeP, 5); }
  } else if (p.y >= GY) {
    p.y = GY;
    p.vy = 0;
    p.dj = 0;
    p.spike = 0;
    if (wa) {
      // 着地隙: 空中技のあと=技の landLag(なければ airLandLag) / 通常ジャンプ=landLag
      let lag = 0;
      if (p.st === 'atk') lag = (p.mv.lg ?? (/^a/.test(p.mv.k) ? c.alg ?? 9 : 0)) + (p.rcExtra || 0); // 受け流されていたら着地隙も伸びる
      else if (p.st === 'idle') lag = c.lgl ?? 3;
      // 受付の途中で着地したときは、受付が終わるまで地上で受け流しを続ける(足元への攻撃も受け流せる。apar の処理で失敗の着地硬直になる)
      const apKeep = p.st === 'apar' && p.t <= AIR_PARRY.startup + AIR_PARRY.active;
      if (p.st === 'apar' || (p.apFail && p.st === 'idle')) lag = apKeep ? 0 : Math.max(lag, AIR_PARRY.failLand);   // 空中受け流しの失敗
      if (apKeep) p.vx *= 0.3;
      p.apFail = false;
      p.ld = p.st === 'hit' ? 6 : Math.min(6, lag);
      dust(p.x, GY, 4 + Math.min(6, lag >> 1));
      if (p.st === 'hit') {
        // 空中で硬直したまま着地: 着地してから技に設定された分の硬直 / 空中でも切れる硬直のときは従来どおり最低16F
        p.t = p.apHit ? p.t : p.airStunCanExpire ? Math.max(p.t, 16) : Math.max(16, Math.ceil((p.hitStunFull ?? 0) / 2));
        p.vx *= 0.3;
        if (trShowText() && !p.airStunCanExpire && !p.apHit) fx.push({ k: 'txt', text: '着地硬直 ' + p.t + 'F', x: p.x, y: GY - 40, t: 30, l: 30, c: '#f99', s: 15 });
      } else if (lag > 0) {
        p.moveLock = 0;
        p.st = 'land';
        p.t = 1; // 着地した瞬間も1Fに数える(設定値=動けない総フレーム数)
        p.lg = lag;
        if (trShowText()) fx.push({ k: 'txt', text: '着地 ' + lag + 'F', x: p.x, y: GY - 40, t: 30, l: 30, c: '#9f9', s: 15 });
      }
    }
  }
  if (Math.abs(p.x - o.x) < 30 && p.y >= GY && o.y >= GY && p.st !== 'held' && o.st !== 'held') {
    const s = p.x < o.x ? -1 : 1;
    p.x += s * 1.5;
    o.x -= s * 1.5;
  }
}

// ================= CPU =================
//  レベル 0 = 何もしない(棒立ち) / 1〜5 = 通常のCPU / 6〜10 = 上級CPU(レベルが上がるほど精度が上がる)
//  上級CPUの能力(aiSkill: Lv6=0.2 → Lv10=1 で精度が上がる)
//   ・飛び道具をジャストガード / ジャンプで避ける       ・最大火力のコンボ(キャンセルの順番を計算)
//   ・ジャストガードの精度(押すタイミングのズレが減る)   ・回避(バックダッシュ)・透かし(しゃがんで高い技を空振りさせる)
//   ・投げ方向の思考(ダメージ・画面端・追撃)            ・間合い管理(相手の技が届かない距離で待つ / 自分の技が届く距離で刺す)
//   ・ガード、受け流し、空振りへの反撃(確定反撃)        ・瞬時の判断(相手の行動に気づくまでのF数が短くなる)
//  全レベル共通: 相手が硬直中(食らい・ガードブレイク)なら攻撃しに行く
const AI_MAX_LV = 10;
const aiSkill = (lv) => Math.max(0, Math.min(1, (lv - 5) / 5));
// 上級CPUの「人間らしさ」(Lv6〜10)。人間の反応はだいたい 15〜20F
const aiLv = (lv) => Math.max(0, Math.min(4, lv - 6)); // Lv6=0 … Lv10=4
// CPU の反応の速さ(F。大きいほど遅い)
//  adv   … 上級CPU(Lv6〜10)が相手の行動に「気づく」までのF。気づいてから、ジャストガード・割り込み・しゃがみで透かす・
//           空中受け流し・対空・飛び道具の対処を考える(空振りなどの隙への反撃は、この 6割のF)
//  basic … Lv1〜5 が相手の攻撃にシールド・しゃがみ受け流しで反応できるまでのF。上級CPUが気づく前の「とっさの守り」もこのF(Lv5 の値)
//           これより発生の速い技には反応できない(読みで先にしゃがんでいたときは別)
const AI_REACTION = { adv: [30, 27, 24, 21, 18], basic: [24, 22, 20, 18, 16] };
const AI_REACT = (lv) => AI_REACTION.adv[aiLv(lv)]; //        気づくまでのF: Lv6=30 / Lv7=27 / Lv8=24 / Lv9=21 / Lv10=18
const AI_REACT_BASIC = (lv) => AI_REACTION.basic[Math.max(1, Math.min(5, lv)) - 1]; // Lv1=24 / Lv2=22 / Lv3=20 / Lv4=18 / Lv5〜=16
// 空中受け流しを使う確率(上級CPU。空中で攻撃が来ると気づけたとき、攻撃1回ごとに判定): Lv6=15% … Lv10=55%
const AI_APAR = (lv) => 0.15 + 0.1 * aiLv(lv);
const AI_SUCC = (lv) => 0.3 + 0.125 * aiLv(lv); // 判断が正しい確率: 30% / 42.5% / 55% / 67.5% / 80%
const AI_ERR = (lv) => 6 - aiLv(lv); //          タイミングのズレ(±F): 6 / 5 / 4 / 3 / 2
// コンボの精度(コンボ1回ごとに「本気のコンボか、適当なコンボか」を決める)
const AI_MAXCOMBO = (lv) => [0.05, 0.1, 0.15, 0.22, 0.3][aiLv(lv)]; // 最大火力のコンボをする確率: Lv6=5% / 10% / 15% / 22% / Lv10=30%
const AI_DROP = (lv) => [0.5, 0.42, 0.34, 0.25, 0.16][aiLv(lv)]; //     適当なコンボのとき、次の技につなぎ損ねる確率(1つつなぐごと): 50% / 42% / 34% / 25% / 16%
//   適当なコンボ = つながる技の中からランダムに選ぶ(つなぎ損ねたらそこでコンボが終わる)。最大火力のコンボのときはつなぎ損ねない
const AI_CUTIN = (lv) => lv >= 10; //               相手の技の発生中に、速い技で割り込む(気づけた時だけ)
const AI_GROUND = ['n', 'd', 'f', 'b', 'u', 'da', 's', 'sf', 'sb', 'su', 'sd'],
  AI_AIR = ['an', 'af', 'au', 'ad'];

// 技 k を出す入力を i に書く(前 = 今向いている方向)
function aiPress(i, p, k) {
  const fw = p.f > 0 ? 'r' : 'l',
    cm = p.ch.mv[k] && p.ch.mv[k].cmd;
  if (cm) {
    // コマンド技: 方向を1Fずつ入れ、最後の方向と同時にボタン(次のフレームからは ai() の先頭で続きを入れる)
    p.aiSeq = cm.dirs.map((d, n) => ({ d, b: n === cm.dirs.length - 1 ? cm.btn : null }));
    return aiSeqInput(i, p, p.aiSeq.shift());
  }
  if (k === 'gx' || k === 'sx') {        // ゲージ技 = Z と A の同時押し / 超必殺技 = ↓ + Z と A
    i.at = i.sp = 1;
    if (k === 'sx') i.d = 1;
    return i;
  }
  if (k[0] === 's') i.sp = 1;
  else i.at = 1;
  if (k === 'f' || k === 'sf' || k === 'af' || k === 'da') i[fw] = 1;
  if (k === 'b' || k === 'sb') i[p.f > 0 ? 'l' : 'r'] = 1; // 後ろ
  if (k === 'u' || k === 'su' || k === 'au') i.u = 1;
  if (k === 'd' || k === 'ad' || k === 'sd') i.d = 1;
  return i;
}
// コマンドの1F分(テンキーの方向 d とボタン b)を入力にする
function aiSeqInput(i, p, s) {
  const fx = ((s.d - 1) % 3) - 1, // -1=後ろ 0 1=前
    fy = s.d >= 7 ? 1 : s.d <= 3 ? -1 : 0;
  if (fx * p.f > 0) i.r = 1;
  else if (fx * p.f < 0) i.l = 1;
  if (fy > 0) i.u = 1;
  else if (fy < 0) i.d = 1;
  if (s.b) i[s.b] = 1;
  return i;
}
const aiCmdLen = (p, k) => (p.ch.mv[k] && p.ch.mv[k].cmd ? p.ch.mv[k].cmd.dirs.length - 1 : 0); // コマンド入力にかかるF
const aiCmdMoves = (p, air) => Object.keys(p.ch.mv).filter((k) => {
  const m = p.ch.mv[k];
  return m.cmd && (air ? m.air : m.air !== true);
});
// 今の状態で、前+Z が da(ダッシュ攻撃)になるか(script.js pick と同じ条件)
const aiDashy = (p) => p.run > 14 || p.st === 'dash' || Math.abs(p.vx) > p.ch.sp * 1.3;
// 地上・空中で出せる技の一覧(前Z は状況で f か da のどちらかになる)
// 飛び道具を撃ってよい距離か: 相手の技(Z・前Z・下Z・前A・ダッシュ攻撃)が届く距離では撃たない
//  (撃った後の後隙に、相手のリーチの長い技を差し込まれるため。コンボの途中でも同じ)
const AI_PJ_KEEP = ['n', 'f', 'd', 'sf', 'da'];
const aiPJOk = (p, o, S) => Math.abs(o.x - p.x) > Math.max(...AI_PJ_KEEP.map((k) => aiReach(o.ch, k, S))) + 10;
const aiNoClosePJ = (p, o, S, list) => (aiPJOk(p, o, S) ? list : list.filter((k) => !isPJMove(p.ch.mv[k])));
// ゲージ技・超必殺技(SP ゲージが足りるときだけ候補に入れる)
//  超必殺技の半分以上たまっていて、まだ足りないときは、ゲージ技を使わずに超必殺技のためにとっておく
function aiGaugeMoves(p, air) {
  const mv = p.ch.mv, v = p.sg || 0, sx = mv.sx, saving = sx && v >= sx.cost * 0.5 && v < sx.cost;
  return ['gx', 'sx'].filter((k) => mv[k] && (air ? mv[k].air : mv[k].air !== true) && v >= mv[k].cost && !(k === 'gx' && saving));
}
const aiMoves = (p, air) => (air ? AI_AIR : AI_GROUND.filter((k) => (k === 'da' ? aiDashy(p) : k === 'f' ? !aiDashy(p) : true))).concat(aiCmdMoves(p, air), aiGaugeMoves(p, air));

// e={x,y,vx,vy,gm} を n フレーム進めた状態(地上は床で減速・空中は重力。だいたいの予測)
function aiSim(e, n, S) {
  let { x, y, vx, vy } = e;
  for (let k = 0; k < n; k++) {
    if (y >= GY) vx -= vx * S.acc;
    x = Math.max(30, Math.min(W - 30, x + vx));
    y += vy;
    vy += S.g * (e.gm || 1);
    if (y >= GY) {
      y = GY;
      vy = 0;
    }
  }
  return { ...e, x, y, vx, vy };
}
// 予測に使う状態。体の広がり(lo〜hi: 足元からの横の範囲 / top: 頭の高さ)は今の姿勢の食らい判定から取る
function aiExtent(p) {
  let lo = 1e9, hi = -1e9, top = 0;
  const parts = []; // 食らい判定の部位(足元からの位置。線の部位は点を並べて近似)
  for (const t of fighterHitParts(p)) {
    const pts = t.kind === 'circle' ? [t] : [t.a, t.b];
    for (const v of pts) {
      lo = Math.min(lo, v.x - t.r - p.x);
      hi = Math.max(hi, v.x + t.r - p.x);
      top = Math.min(top, v.y - t.r - p.y);
    }
    if (t.kind === 'circle') parts.push([t.x - p.x, t.y - p.y, t.r]);
    else {
      const n = Math.max(1, Math.ceil(Math.hypot(t.b.x - t.a.x, t.b.y - t.a.y) / Math.max(4, t.r)));
      for (let k = 0; k <= n; k++) parts.push([t.a.x + ((t.b.x - t.a.x) * k) / n - p.x, t.a.y + ((t.b.y - t.a.y) * k) / n - p.y, t.r]);
    }
  }
  if (!(hi > lo)) (lo = -24), (hi = 24), (top = -bodyH(p)), parts.push([0, -50, 24]);
  return { lo, hi, top, sets: [parts], all: false };
}
// 四角形(足元からの位置 x0..x1 / y0..y1)が部位のどれかに触れるか
const aiRectParts = (parts, x0, x1, y0, y1) =>
  parts.some(([x, y, r]) => Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(y0 - y, 0, y - y1)) <= r);
//  攻撃中・硬直中は姿勢が動くので、今と 6F 先の姿勢を比べて
//  def=false(自分が当てる側)なら狭いほう / def=true(守る側)なら広いほうを使う
const aiCache = new Map();
function aiState(p, def = false) {
  const key = (p === A ? 'A' : 'B') + def;
  let c = aiCache.get(key);
  if (!c || c.fr !== fr || c.x !== p.x || c.y !== p.y || c.st !== p.st || c.t !== p.t) {
    const a = aiExtent(p);
    if (p.st === 'atk' || p.st === 'hit' || p.st === 'throw') {
      const b = aiExtent({ ...p, t: p.st === 'hit' ? Math.max(0, p.t - 6) : p.t + 6, pose: null });
      const mn = def ? Math.min : Math.max, mx = def ? Math.max : Math.min;
      a.lo = mn(a.lo, b.lo);
      a.hi = mx(a.hi, b.hi);
      a.top = mn(a.top, b.top);
      a.sets = [a.sets[0], b.sets[0]];
      a.all = !def; // 当てる側: 両方の姿勢で当たるときだけ / 守る側: どちらかで当たれば当たる扱い
    }
    c = { fr, x: p.x, y: p.y, st: p.st, t: p.t, ext: a };
    aiCache.set(key, c);
  }
  return { x: p.x, y: p.y, vx: p.vx, vy: p.vy, gm: p.ch.gm || 1, ...c.ext };
}
// 攻撃の箱が体に重なるか。mg = 余裕(プラスで判定を小さく見る=確実に当たるときだけ / マイナスで大きく見る=守りに使う)
function aiBox(ax, ay, f, m, b, mg = 0) {
  const bx = f > 0 ? ax + m.rx : ax - m.rx - m.rw,
    by = ay + m.ry;
  return m.rw > 0 && m.rh > 0 && aiRectHits(b, bx + mg, bx + m.rw - mg, by + mg, by + m.rh - mg);
}
// 四角形(画面上の位置)が b の体に当たるか(実際の当たり判定と同じく、部位ごとに調べる)
function aiRectHits(b, x0, x1, y0, y1) {
  if (x1 <= x0 || y1 <= y0) return false;
  const sets = b.sets || [[[0, -50, 24]]],
    hit = (ps) => aiRectParts(ps, x0 - b.x, x1 - b.x, y0 - b.y, y1 - b.y);
  return b.all ? sets.every(hit) : sets.some(hit);
}

// a(向き f)の技 m が、今 t0 フレーム目のとき、相手 b に当たるのは何F後か(当たらなければ null)
//  me / you は予測の状態。delay = 技が始まるまでのF(今すぐなら 0)。lock = moveLock(今は使っていない。移動ロック中でも launch は効く)
function aiHitIn(a, m, f, me, you, S, t0 = 0, delay = 0, lock = 0, mg = 4) {
  if (!m) return null;
  if (m.gv && me.y >= GY && !t0) m = m.gv; // 地上で出すなら地上版の性能で予測する
  let A_ = delay ? aiSim(me, delay, S) : { ...me },
    B_ = delay ? aiSim(you, delay, S) : { ...you };
  if (isPJMove(m) && !(m.rw > 0)) {
    // 飛び道具: 発生の瞬間に出て、軌道どおりに動く(projectile.js の stepProjectile で予測)
    if (!a.ch.pjRaw) return null;
    if (t0 >= m.st) return null;
    const w = m.st - t0;
    A_ = aiSim(A_, w, S);
    B_ = aiSim(B_, w, S);
    const js = makeProjectiles(a.ch, m, A_.x, A_.y, f, B_, null);
    for (let k = 1; k <= Math.min(80, js[0].life); k++) {
      B_ = aiSim(B_, 1, S);
      for (const j of js) {
        if (j.dead) continue;
        j.tgt = B_;
        if (!stepProjectile(j)) j.dead = 1;
        const r = j.r;
        if (!j.dead && aiRectHits(B_, j.x - r + mg, j.x + r - mg, j.y - r + mg, j.y + r - mg)) return { at: delay + w + k, me: A_, you: B_, pj: 1 };
      }
    }
    return null;
  }
  for (let t = t0 + 1; t <= m.st + m.ac; t++) {
    if (t === m.st && m.launch) {
      if (m.launch.x != null) A_.vx = f * m.launch.x;
      if (m.launch.y != null) A_.vy = m.launch.y;
    }
    if (t > m.st && aiBox(A_.x, A_.y, f, m, B_, mg)) return { at: delay + (t - t0), me: A_, you: B_ };
    A_ = aiSim(A_, 1, S);
    B_ = aiSim(B_, 1, S);
  }
  return null;
}

// コンボの計算: 技 k から始めて、キャンセルでつなげたときの最大ダメージ
//  stun = 相手の残り硬直(この F 数以内に当たらないとつながらない。null = 制限なし)
function aiChain(p, o, k, me, you, delay, stun, cb, used, S, depth, cg = null) {
  const m = p.ch.mv[k];
  if (!m) return null;
  const h = aiHitIn(p, m, p.f, me, you, S, 0, delay + aiCmdLen(p, k), depth ? 0 : p.moveLock); // コマンド技は入力にかかるF分遅れる
  if (!h || (stun != null && h.at > stun)) return null;
  if (h.pj) return { dmg: pjSpec(p.ch, m).d * (p.ch.dm || 1), k, path: [k] }; // 飛び道具はキャンセルできないので最後
  if (cg && cg === o.ch.cg && h.me.y >= GY && isLowMove(m)) cg = null; // 下段攻撃はしゃがみ受け流しされない
  const rep = (used[k] || 0) + 1,
    dec = Math.max(0.5, 1 - 0.07 * (cb - 1)),
    dmg = m.d * (p.ch.dm || 1) * dec * (cg ? cg.dmg : 1), // 受け流されるなら軽減され、キャンセルもできない
    expire = rep >= 2 || Object.values(used).some((v) => v >= 2),
    st2 = Math.round(m.hs * Math.max(0.55, 1 - 0.07 * (cb - 1)) * Math.max(0.8, 1 - 0.15 * (rep - 1))),
    wt = o.ch.wt || 1,
    you2 = { ...h.you, vx: p.f * m.kx * wt, vy: m.ky * wt, y: h.you.y - (m.ky * wt < -2 ? 2 : 0) },
    lockAir = you2.y < GY && !expire;
  let best = null;
  if (depth < 5 && !cg) {
    const u2 = { ...used, [k]: rep },
      air = h.me.y < GY;
    for (const k2 of (air ? AI_AIR : AI_GROUND).concat(aiCmdMoves(p, air), aiGaugeMoves(p, air))) {
      if (k2 === 'da' || !(rankOf(p, k2) > rankOf(p, k))) continue;
      const r = aiChain(p, o, k2, h.me, you2, 1, lockAir ? null : st2, cb + 1, u2, S, depth + 1);
      if (r && (!best || r.dmg > best.dmg)) best = r;
    }
  }
  return { dmg: dmg + (best ? best.dmg : 0), k, path: [k, ...(best ? best.path : [])] };
}
// 当たる始動技の一覧
function aiAllStarts(p, o, list, stun, S, delay = 0) {
  const cb = o.st === 'hit' ? o.cb + 1 : 1,
    used = o.st === 'hit' ? { ...(o.cbMoves || {}) } : {},
    out = [];
  for (const k of list) {
    const r = aiChain(p, o, k, aiState(p), aiState(o), delay, stun, cb, used, S, 0, null);
    if (r) out.push(r);
  }
  return out;
}
// 出せる技の中で一番ダメージが取れる始動技
function aiBestStart(p, o, list, stun, S, delay = 0) {
  let best = null;
  const cb = o.st === 'hit' ? o.cb + 1 : 1,
    used = o.st === 'hit' ? { ...(o.cbMoves || {}) } : {},
    cg = o.st === 'shield' ? { dmg: 0 } // 相手がシールド中 → ガードされてダメージなし・キャンセルもできない
      : o.dn && o.st === 'idle' && o.y >= GY ? o.ch.cg : null; // 相手がしゃがんでいる → 受け流される
  for (const k of list) {
    const r = aiChain(p, o, k, aiState(p), aiState(o), delay, stun, cb, used, S, 0, cg);
    if (r && (!best || r.dmg > best.dmg)) best = r;
  }
  return best;
}

// 相手が動けない残りF数(反撃のチャンス)。null = 動ける
function aiOpening(o) {
  const m = o.mv;
  if (o.st === 'atk' && m) return o.t > m.st + m.ac ? m.st + m.ac + m.rc + (o.rcExtra || 0) - o.t : null;
  if (o.st === 'land') return (o.lg || 9) - o.t;
  if (o.st === 'sdown') return 10 - o.t;
  if (o.st === 'break') return o.t;
  if (o.st === 'throw' && o.tg < 0 && (o.thr || o.ch.th)) {
    const T = o.thr || o.ch.th;
    return o.t > T.startup + T.active ? T.startup + T.active + T.whiff - o.t : null;
  }
  return null;
}
// 投げの方向を考える(ダメージ + 硬直 + 画面端)。思考しないときはランダム
function aiThrowDir(p, o, q) {
  if (R() > q) {
    const r = R();
    return r < 0.25 ? 'b' : r < 0.4 ? 'u' : r < 0.55 ? 'd' : 'f';
  }
  const T = p.ch.th || DEFAULT_THROW,
    back = p.f > 0 ? p.x - 30 : W - 30 - p.x, // 自分の後ろの壁まで
    front = p.f > 0 ? W - 30 - o.x : o.x - 30; // 相手の後ろの壁まで
  let best = 'f',
    bs = -1e9;
  for (const d of ['f', 'b', 'u', 'd']) {
    const t = T[d] || DEFAULT_THROW[d];
    let s = t.damage + t.hitstun * 0.15;
    if (d === 'b' && back < 140) s += 6; // 自分が端を背負っている → 入れ替えて相手を端へ
    if (d === 'f' && front < 220) s += 3; // 相手を端へ運ぶ
    if (d === 'u' && t.hitstun >= 25) s += 3; // 浮かせて追撃しやすい
    if (d === 'b' && back >= 140 && front < 140) s -= 6; // 端に追い詰めているのを手放さない
    if (s > bs) {
      bs = s;
      best = d;
    }
  }
  return best;
}
function aiThrow(i, p, o, q) {
  const d = aiThrowDir(p, o, q),
    bk = p.f > 0 ? 'l' : 'r';
  i.th = 1;
  if (d === 'b') i[bk] = 1;
  else if (d === 'u') i.u = 1;
  else if (d === 'd') i.d = 1;
  return i;
}
// 投げが届く距離か
function aiCanThrow(p, o) {
  const T = p.ch.th || DEFAULT_THROW,
    dx = (o.x - p.x) * p.f;
  return o.y >= GY && dx + 22 > T.box.x && dx - 22 < T.box.x + T.box.w;
}
// 技の届く距離(前方向・おおよそ)
function aiReach(c, k, S) {
  const m = c.mv[k];
  if (!m || !(m.rw > 0)) return 0;
  const lx = m.launch && m.launch.x ? Math.min(m.launch.x, 12) * (1 - Math.pow(1 - S.acc, m.ac)) / S.acc : 0;
  return m.rx + m.rw + 22 + lx;
}

// 相手の行動が変わったら、その行動に対する「判断」をやり直す(サイコロ・タイミングのズレ)
function aiNotice(p, o, q) {
  const key = o.st + ':' + (o.mv ? o.mv.k : '') + ':' + (o.y < GY ? 'a' : 'g');
  const down = o.st === 'hit' || o.st === 'break'; // この2つは t が減っていく
  if (key !== p.aiKey || (down ? o.t > (p.aiT ?? 0) : o.t < (p.aiT ?? 0))) {
    p.aiKey = key;
    p.aiRoll = R();
    const E = AI_ERR(p.aiLvNow || 6); // タイミングのズレ
    p.aiErr = Math.round((R() * 2 - 1) * E);
    p.aiSince = 0;
  } else p.aiSince = (p.aiSince || 0) + 1;
  p.aiT = o.t;
}

// 上級CPU(Lv6〜10)の思考。行動を決めたら true
function aiAdvanced(i, p, o, lv, S) {
  p.aiLvNow = lv;
  aiNotice(p, o, aiSkill(lv));
  const q = aiSkill(lv),
    react = AI_REACT(lv), // 相手の行動に気づくまでのF
    succ = AI_SUCC(lv), // 判断が正しくできる確率
    air = p.y < GY,
    ad = Math.abs(o.x - p.x),
    tw = o.x > p.x ? 'r' : 'l',
    aw = o.x > p.x ? 'l' : 'r',
    jg = jgWin(p), gStart = jg + JUST_GUARD.gap,                  // ジャストガードの受付 / ふつうのガードが始まるF
    jgLead = (jg >> 1) + (p.aiErr || 0), // シールドを押してから攻撃が当たるまでのF(ジャストガードの受付の真ん中を狙う)
    ok = p.aiRoll < succ;
  const free = p.st === 'idle' || (p.st === 'dash' && p.t > 6);
  // 跳んだときに「対空を読んで空中受け流しするか」を決めておく(読みなので、気づくまでのF を待たない)
  if (air && !p.aiWasAir) p.aiRead = R() < AI_APAR(lv) * 0.6;
  p.aiWasAir = air;

  // シールド中: 守る理由がある間は押し続ける / 相手に大きな隙ができたら離して反撃へ
  if (p.st === 'shield') {
    if (p.aiSh > 0) p.aiSh--;
    const open = aiOpening(o);
    if (open != null && ok && open >= 12 + 4) return true; // 離す(シールド解除10F)→ 反撃
    // ガードからの投げ: 相手が目の前で動ける状態なら、シールドを張ったまま投げる(ふつうのガードが張られてから)
    if (isGuarding(p) && (o.st === 'idle' || o.st === 'land') && o.y >= GY && aiCanThrow(p, o) && p.aiSince >= react >> 1 && R() < 0.04 + 0.08 * q) return aiThrow(i, p, o, q), true;
    const danger = (o.st === 'atk' && o.mv && o.t <= o.mv.st + o.mv.ac) || PJ.some((j) => j.own !== p && (p.x - j.x) * j.vx > 0 && Math.abs(p.x - j.x) < 260);
    i.sh = p.aiSh > 0 || danger ? 1 : 0;
    return true;
  }

  // ① 飛び道具: ジャストガード(跳ね返す)か、ジャンプで飛び越える
  if (p.st === 'idle' && !air) {
    const me = aiState(p, true),
      hits = []; // 飛んでくる弾と、当たるまでのF
    for (const j of PJ) {
      if (j.own === p || (p.x - j.x) * j.vx <= 0) continue;
      const c = cloneProjectile(j); // 軌道どおりに動かして予測(projectile.js)
      for (let n = 1; n <= 70; n++) {
        if (!stepProjectile(c)) break;
        const x = c.x,
          y = c.y;
        if (aiRectHits(me, x - j.r - 4, x + j.r + 4, y - j.r - 4, y + j.r + 4)) {
          hits.push({ j, k: n });
          break;
        }
      }
    }
    if (hits.length) {
      hits.sort((a, b) => a.k - b.k);
      const { j, k } = hits[0],
        multi = hits.some((h) => h !== hits[0] && h.k - k < 10); // 続けてもう1発来る(3連弾など)
      if (p.aiPJ !== j) {
        p.aiPJ = j;
        p.aiPJroll = R();
        p.aiPJerr = Math.round((R() * 2 - 1) * AI_ERR(lv));
        p.aiPJjump = R() > 0.5 + 0.4 * q; // 低いレベルほどジャンプでよける
      }
      const age = j.age;
      if (age >= react && p.aiPJroll <= succ) {
        // ジャンプで越えられるか: 弾が通り過ぎる間、足が弾より上にあるか(頂点の真下を通すように跳ぶ)
        const g = S.g * (p.ch.gm || 1),
          v0 = -p.ch.jp,
          apex = v0 / g,
          pass = (me.hi - me.lo + 2 * j.r) / Math.max(0.5, Math.abs(j.vx)),
          need = p.y - (j.y - j.r) + 6,
          hAt = (t) => v0 * t - (g * t * t) / 2,
          canJump = hAt(Math.max(0, apex - pass / 2)) > need,
          jumpAt = (p.ch.jsq | 0) + Math.round(apex - pass / 2) + p.aiPJerr;
        if ((p.aiPJjump || multi || p.sh < 15) && canJump) {
          if (k <= jumpAt) i.jp = 1;
          return true;
        }
        // 1発だけ → ジャストガード(跳ね返す) / 続けて来る → 早めに普通のガードで全部受ける
        const lead = multi ? gStart + 3 : (jg >> 1) + p.aiPJerr;   // 続けて来る弾は、すき間を越えてふつうのガードで受ける
        if (k <= lead) {
          i.sh = 1;
          p.aiSh = (multi ? hits[hits.length - 1].k : k) + 3;
        }
        return true; // タイミングを待つ
      }
      if (p.aiPJroll <= succ) return true; // 弾が来ている間は前に出ない(気づく前でも様子を見る)
    }
  }

  // ② 相手の攻撃: ジャストガード / 先に当てる / バックダッシュ / しゃがんで透かす・受け流す
  if (p.st === 'idle' && o.st === 'atk' && o.mv && o.mv.rw > 0 && o.t <= o.mv.st + o.mv.ac && !air) {
    const m = o.mv,
      me = aiState(p, true);
    me.vx = 0;
    const h = aiHitIn(o, m, o.f, aiState(o, true), me, S, o.t, 0, 0, -4);
    if (h && o.t < react - 1) return false; // まだ気づいていない → とっさの守り(Lv5 と同じ)
    if (h) {
      // 見えてから判断
      const k = h.at;
      if (!ok) {
        // 判断ミス: とりあえずシールド(早すぎ・遅すぎもある)
        if (k >= gStart && p.sh > 15) {
          i.sh = 1;
          p.aiSh = k + 2;
        }
        return true;
      }
      // 先に当てられるなら割り込む(Lv8〜)
      if (AI_CUTIN(lv)) {
        const mine = aiBestStart(p, o, aiMoves(p, false), k - 1, S);
        if (mine && mine.dmg >= 6) {
          aiPress(i, p, mine.k);
          return true;
        }
      }
      // しゃがむと当たらない高い技 → しゃがんで透かす
      const cr = { ...me, ...aiExtent({ ...p, dn: 1, st: 'idle', pose: null }) }; // しゃがんだときの食らい判定
      if (!aiHitIn(o, m, o.f, aiState(o, true), cr, S, o.t, 0, 0, -4)) {
        i.d = 1;
        p.ct = Math.max(p.ct || 0, k + m.ac + 2);
        return true;
      }
      if (k >= 1 && p.sh > 12) {
        if (k <= Math.max(0, jgLead)) {
          i.sh = 1;
          p.aiSh = k + 2;
        }
        return true; // ちょうどいいタイミングまで待つ
      }
      // 間に合わない: バックダッシュ(無敵8F)で避けるか、しゃがみ受け流し
      if (q >= 0.4 && k + Math.min(m.ac, 4) <= 9 && R() < 0.5 + 0.5 * q) {
        i.dh = p.f > 0 ? -1 : 1;
        return true;
      }
      i.d = 1;
      p.ct = Math.max(p.ct || 0, k + 2);
      return true;
    }
  }
  // ②-2 空中: 相手の攻撃が来る → 空中受け流し / 当たる空中技があれば出す
  if (p.st === 'idle' && air) {
    if (o.st === 'atk' && o.mv && o.mv.rw > 0 && o.t <= o.mv.st + o.mv.ac && (o.t >= react || p.aiRead)) {
      if (p.aiAparKey !== p.aiKey) { p.aiAparKey = p.aiKey; p.aiAparGo = p.aiRead || (ok && R() < AI_APAR(lv)); }   // 攻撃1回ごとに1回だけ決める
      const h = p.aiAparGo ? aiHitIn(o, o.mv, o.f, aiState(o, true), aiState(p, true), S, o.t, 0, 0, -4) : null, AP = AIR_PARRY;
      if (h && h.at > AP.startup + 1 + (p.aiErr > 0 ? 1 : 0) && h.at <= AP.startup + AP.active - 1) return (i.dd = 1), true;   // 受付の前寄りに来るように ↓↓
      if (p.aiAparGo) return true;                                                                                         // 受け流すつもり → 受付に合うまで待つ(空中技は出さない)
    }
    if (o.st !== 'hit' && Math.abs(o.x - p.x) < 260 && R() < 0.25 + 0.5 * q) {
      const best = aiBestStart(p, o, aiMoves(p, true).filter((k) => !isPJMove(p.ch.mv[k])), null, S);
      if (best && best.dmg >= 4) return aiPress(i, p, best.k), true;
    }
  }
  if (p.ct > 0 && free) {
    p.ct--;
    i.d = 1;
    return true;
  }

  // ③ 相手の隙(空振り・着地・シールド解除・ガードブレイク)に反撃
  const open = aiOpening(o),
    seen = o.st === 'atk' && o.mv ? o.t - (o.mv.st + o.mv.ac) : p.aiSince; // 隙に気づいてからのF
  if (free && open != null && open > 0 && seen >= Math.round(react * 0.6)) {
    if (ok) {
      const best = aiBestStart(p, o, aiMoves(p, air), open, S);
      let thr = null;
      if (!air && o.y >= GY && aiCanThrow(p, o) && open >= (p.ch.th || DEFAULT_THROW).startup + 2) {
        const T = p.ch.th || DEFAULT_THROW;
        thr = Math.max(...['f', 'b', 'u', 'd'].map((d) => (T[d] || DEFAULT_THROW[d]).damage));
      }
      if (thr != null && (!best || thr > best.dmg)) return aiThrow(i, p, o, q), true;
      if (best) return aiPress(i, p, best.k), true;
      // 届かない: 大きな隙なら走って近づく
      if (open > 20 && !air) {
        if (ad > 180 && q >= 0.4) i.dh = tw === 'r' ? 1 : -1;
        else i[tw] = 1;
        return true;
      }
    }
  }

  // ④ 対空・瞬時の判断: 跳んでくる相手に当たる技があれば出す
  if (free && !air && o.y < GY && o.st !== 'hit' && ok && p.aiSince >= react) {
    const best = aiBestStart(p, o, aiMoves(p, false).filter((k) => !isPJMove(p.ch.mv[k])), null, S);
    if (best && best.dmg >= 5) return aiPress(i, p, best.k), true;
  }

  // ⑤ シールドしている相手は投げる
  if (free && !air && (o.st === 'shield' || o.st === 'sdown')) {
    if (aiCanThrow(p, o)) {
      if (R() < 0.15 + 0.6 * q) return aiThrow(i, p, o, q), true;
      return true;
    }
    if (ad < 160) {
      i[tw] = 1;
      return true;
    }
  }

  // 相手が飛び道具を撃とうとしている → 大きな技は出さずに待つ(飛んできたら①で対処)
  if (free && !air && o.st === 'atk' && o.mv && isPJMove(o.mv) && o.t < o.mv.st && R() < q) return true;

  // ⑥ 間合い管理: 相手の技が届かない所で待ち、自分の技が届く距離に入ったら刺す
  if (free && !air && o.y >= GY && o.st !== 'hit') {
    const pk = ['n', 'f', 'd'],
      myR = Math.max(...pk.map((k) => aiReach(p.ch, k, S))),
      opR = Math.max(...pk.map((k) => aiReach(o.ch, k, S))),
      back = p.f > 0 ? p.x - 30 : W - 30 - p.x;
    // 様子見が続いたら自分から攻める(相手が攻撃してこないと、いつまでも待ってしまうのを防ぐ)
    //  相手が攻撃していない時間を数え、我慢の限界(30〜100F。毎回ランダム)を超えたら攻め込む
    const calm = o.st !== 'atk' && o.st !== 'throw';
    p.aiOppCr = o.dn && o.st === 'idle' ? (p.aiOppCr || 0) + 1 : 0; // 相手がしゃがんでいるF
    p.aiWait = calm ? (p.aiWait || 0) + 1 : 0;
    if (p.aiPat == null) p.aiPat = 30 + R() * 70;
    const rush = p.aiWait > p.aiPat,
      acted = () => {
        p.aiWait = 0;
        p.aiPat = 30 + R() * 70;
        return true;
      },
      target = rush || myR >= opR - 4 ? myR - 10 : opR + 14;
    // 届く距離なら刺す(相手が動けるときは控えめ。攻め込み中は積極的に)
    //  (今の場所から当たる技があるかは、技の判定と相手の体の判定で予測する)
    const reach = ad <= myR + 40 ? aiBestStart(p, o, aiMoves(p, false).filter((k) => !isPJMove(p.ch.mv[k])), null, S) : null;
    // ダッシュからの択: 攻め込みでダッシュして近づいたら、投げ・下段・いちばん当たる技 のどれか
    if (p.aiMix > 0 && p.st === 'dash' && p.t > 6) {
      p.aiMix = 0;
      const r = R(), low = aiBestStart(p, o, aiMoves(p, false).filter((k) => isLowMove(p.ch.mv[k]) && !isPJMove(p.ch.mv[k])), null, S);
      if (r < 0.35 && aiCanThrow(p, o) && o.st !== 'atk') return aiThrow(i, p, o, q), acted();
      if (r < 0.7 && low) return aiPress(i, p, low.k), acted();
      if (reach) return aiPress(i, p, reach.k), acted();
    }
    if (p.aiMix > 0) p.aiMix--;
    // しゃがんで待つ相手には下段(しゃがみ受け流しされない)
    if (p.aiOppCr >= react && o.st !== 'shield' && R() < 0.04 + 0.12 * q) {
      const low = aiBestStart(p, o, aiMoves(p, false).filter((k) => isLowMove(p.ch.mv[k]) && !isPJMove(p.ch.mv[k])), null, S);
      if (low) return aiPress(i, p, low.k), acted();
    }
    if (reach && o.st !== 'shield' && R() < (rush ? 0.12 + 0.2 * q : 0.04 + 0.12 * q)) return aiPress(i, p, reach.k), acted();
    // 近すぎたら投げも混ぜる
    if (aiCanThrow(p, o) && o.st === 'idle' && R() < (rush ? 0.04 + 0.06 * q : 0.01 + 0.03 * q)) return aiThrow(i, p, o, q), acted();
    // 遠距離は飛び道具
    if (ad > 280 && aiPJOk(p, o, S) && p.ch.pjRaw && R() < (rush ? 0.03 : 0.008 + 0.012 * q) && aiHitIn(p, p.ch.mv.s, p.f, aiState(p), aiState(o), S))
      return aiPress(i, p, 's'), acted(); // 弾が届くときだけ
    // 攻め込み中: 遠ければダッシュ(近づいたら択をかける)、たまに跳び込み
    if (rush && ad > myR + 60) {
      if (R() < 0.04 + 0.04 * q) return (i.dh = tw === 'r' ? 1 : -1), (p.aiMix = ad < myR + 200 ? 24 : 0), true;
      if (ad < myR + 160 && R() < 0.01) return (i.jp = 1), (i[tw] = 1), true;
    }
    // 様子見の間の動き(ばらつき): 跳び込み / 相手の技の届く所からバックダッシュ / しゃがんで受け流しを狙って待つ
    if (!rush && o.st === 'idle') {
      if (ad > 110 && ad < 230 && R() < 0.003 + 0.006 * q) return (i.jp = 1), (i[tw] = 1), acted();   // 跳び込み(空中で②-2が技を選ぶ)
      if (ad < opR - 10 && back > 120 && R() < 0.004 + 0.008 * q) return (i.dh = aw === 'r' ? 1 : -1), true;
      if (ad < opR + 10 && R() < 0.004 + 0.008 * q) return (p.ct = 20 + ((R() * 25) | 0)), (i.d = 1), true;
    }
    // 攻め込み中: 今いる場所から当たる技がなければ、当たる距離まで歩いて詰める
    if (rush && !aiCanThrow(p, o) && !reach) {
      i[tw] = 1;
      return true;
    }
    if (rush && reach) return true; // 当たる距離にいる → 次のフレームも刺すチャンスを待つ
    if (rush || R() < q) {
      if (!(p.aiSlowT > 0)) { p.aiSlow = R() < 0.3; p.aiSlowT = 40 + ((R() * 40) | 0); }   // ときどきゆっくり歩きで詰める(しゃがまない)
      p.aiSlowT--;
      if (ad > target + 14) {
        if (ad > target + 170 && R() < 0.03 + 0.05 * q) i.dh = tw === 'r' ? 1 : -1;
        else {
          i[tw] = 1;
          if (p.aiSlow && !rush && ad < target + 90) i.d = 1;
        }
      } else if (ad < target - 14 && back > 60) i[aw] = 1;
      else if (ad < target - 14 && back <= 60 && R() < 0.02) i.jp = 1; // 端に追い詰められたら跳んで逃げる
      return true;
    }
  }
  return false;
}

function ai(p, o, lv) {
  const i = { l: 0, r: 0, u: 0, d: 0, at: 0, sh: 0, jp: 0, sp: 0 };
  // コマンド入力の途中なら続きを入れる(やられたら中止)
  if (p.aiSeq && p.aiSeq.length) {
    if (p.st === 'hit' || p.st === 'break' || p.st === 'held') p.aiSeq = null;
    else return aiSeqInput(i, p, p.aiSeq.shift());
  }
  if (!lv || p.st === 'hit' || p.st === 'break') return i;
  if (typeof puppetAI === 'function') { const pa = puppetAI(p, o, lv); if (pa) return Object.assign(i, pa); }   // パペットを動かす必殺技(puppet.js)
  const S = ST[opt.st],
    q = aiSkill(lv),
    d = o.x - p.x,
    ad = Math.abs(d),
    L = Math.min(lv, 5), // Lv1〜5 の行動の確率(Lv6以上は Lv5 と同じ)
    rk = L / 5,
    tw = d > 0 ? 'r' : 'l',
    aw = d > 0 ? 'l' : 'r';
  // 技が当たった → キャンセルでつなぐ
  if (p.st === 'atk' && p.hit) {
    if (p.noCancel) return i; // ガード・受け流しされた → キャンセルできないので何もしない
    if (lv >= 6) {
      // 上級: この技からつなぐかを1回だけ判断する
      //   コンボの1ヒット目で「最大火力のコンボ(AI_MAXCOMBO)」か「適当なコンボ」かを決める
      //   適当なコンボ: AI_DROP の確率でつなぎ損ね、つなぐときは、つながる技からランダムに選ぶ
      if (p.aiCanDone === p.mvId) return i; // この技ではもう判断した
      p.aiCanDone = p.mvId;
      if (o.cb <= 1 || !p.aiPlan) p.aiPlan = R() < AI_MAXCOMBO(lv) ? 'max' : 'casual';
      const m = p.mv,
        air = p.y < GY,
        stun = o.y < GY && !o.airStunCanExpire ? null : o.t,
        opts = [];
      for (const k of aiNoClosePJ(p, o, S, (air ? AI_AIR : AI_GROUND).concat(aiCmdMoves(p, air), aiGaugeMoves(p, air)))) {
        if (k === 'da' || !(rankOf(p, k) > rankOf(p, m.k))) continue;
        const r = aiChain(p, o, k, aiState(p), aiState(o), 0, stun, o.cb + 1, { ...(o.cbMoves || {}) }, S, 1);
        if (r) opts.push(r);
      }
      if (!opts.length) return i;
      if (p.aiPlan !== 'max' && R() < AI_DROP(lv)) return i; // つなぎ損ね
      const pick = p.aiPlan === 'max' ? opts.reduce((a, b) => (b.dmg > a.dmg ? b : a)) : opts[(R() * opts.length) | 0];
      aiPress(i, p, pick.k);
      return i;
    }
    if (lv >= 2 && R() < 0.12 + rk * 0.2) {
      i.at = 1;
      const r = R();
      if (r < 0.3) i.d = 1;
      else if (r < 0.5) i[tw] = 1;
      else if (r < 0.65) i.u = 1;
      else if (L > 3) {
        i.sp = 1;
        i.at = 0;
        if (R() < 0.5) i[tw] = 1;
      }
    }
    return i;
  }
  // 全レベル共通: 相手が硬直中なら攻撃しに行く
  const freeMe = p.st === 'idle' || (p.st === 'dash' && p.t > 6);
  if (freeMe && (o.st === 'hit' || o.st === 'break')) {
    const stun = o.st === 'hit' && o.y < GY && !o.airStunCanExpire ? null : o.t;
    if (lv >= 6) {
      // 相手の硬直1回ごとに「攻めるか(AI_DROP で見逃す)」「最大火力か適当か」を決める
      const tok = o.st + '/' + o.cb + '/' + (o.hitStunFull || 0);
      if (p.aiStunTok !== tok) {
        p.aiStunTok = tok;
        p.aiStunGo = R() >= AI_DROP(lv);
        if (o.cb <= 1) p.aiPlan = R() < AI_MAXCOMBO(lv) ? 'max' : 'casual';
      }
      const opts = p.aiStunGo ? aiAllStarts(p, o, aiNoClosePJ(p, o, S, aiMoves(p, p.y < GY)), stun, S) : [];
      if (opts.length) {
        const pick = p.aiPlan === 'max' ? opts.reduce((a, b) => (b.dmg > a.dmg ? b : a)) : opts[(R() * opts.length) | 0];
        return aiPress(i, p, pick.k);
      }
      if (o.st === 'break' && p.y >= GY && aiCanThrow(p, o) && p.aiStunGo) return aiThrow(i, p, o, q);
    } else if (ad < 110 && R() < 0.3 + 0.14 * L) {
      // Lv1〜5: 近ければ攻撃(技はランダム)
      i.at = 1;
      const r = R();
      if (r < 0.3) i[tw] = 1;
      else if (r < 0.5) i.u = 1;
      else if (r < 0.6) i.d = 1;
      return i;
    }
    // 届かない → 近づく
    if (ad > 60 && p.y >= GY) {
      if (lv >= 7 && ad > 200 && p.st === 'idle') i.dh = tw === 'r' ? 1 : -1;
      else i[tw] = 1;
    }
    return i;
  }
  // 上級CPU(Lv6〜10)の思考。行動を決めなかったときは下の通常の行動
  if (lv >= 6 && aiAdvanced(i, p, o, lv, S)) return i;
  if (p.st === 'shield') {
    i.sh = (o.st === 'atk' && ad < 140) || R() < 0.8 - rk * 0.2 ? 1 : 0;
    return i;
  }
  const rb = AI_REACT_BASIC(lv); // 相手の攻撃に反応できるまでのF
  if (o.st === 'atk' && o.t >= rb && ad < 120 && R() < 0.03 + rk * 0.1) {
    i.sh = 1;
    return i;
  }
  if (p.st !== 'idle') return i;
  if (p.ct > 0) {
    p.ct--;
    i.d = 1; // しゃがみ継続
    return i;
  }
  if (o.st === 'atk' && o.t >= rb && ad < 130 && L >= 2 && R() < 0.03 + rk * 0.07) {
    p.ct = 18; // 攻撃をしゃがんで受け流す
    i.d = 1;
    return i;
  }
  // いろいろな行動(Lv1〜5。上級CPUが何もしなかったときも)
  if (p.y >= GY) {
    if (ad > 100 && ad < 220 && o.st !== 'atk' && R() < 0.002 * L) return (i.jp = 1), (i[tw] = 1), i;                  // 跳び込み
    if (ad < 90 && L >= 3 && R() < 0.003) return (i.dh = aw === 'r' ? 1 : -1), i;                                         // バックダッシュで離れる
    if (ad < 140 && L >= 2 && R() < 0.003) return (p.ct = 15 + ((R() * 20) | 0)), (i.d = 1), i;                         // しゃがんで待つ
    if (o.dn && o.st === 'idle' && ad < 110 && L >= 2 && R() < 0.02 * rk) {                                             // しゃがんでいる相手に下段
      const low = Object.keys(p.ch.mv).find((k) => (k === 'd' || k === 'sd') && isLowMove(p.ch.mv[k]));
      if (low) return aiPress(i, p, low);
    }
  } else if (ad < 130 && p.vy > -3 && R() < 0.04 + 0.06 * rk) return aiPress(i, p, AI_AIR[(R() * AI_AIR.length) | 0]); // 空中技(頂点の近くから)
  if (ad < 65 && (o.st === 'shield' ? R() < 0.04 + rk * 0.08 : R() < 0.003 * L)) {
    if (lv >= 6) return aiThrow(i, p, o, q); // 上級は投げ方向を考える
    i.th = 1; // CPUも投げる(方向はランダム)
    const r = R();
    if (r < 0.25) i[aw] = 1;
    else if (r < 0.4) i.u = 1;
    else if (r < 0.55) i.d = 1;
    return i;
  }
  if (ad > 75 + R() * 25) {
    if (R() < 0.25 + rk * 0.6) i[tw] = 1;
    if (R() < 0.003 * L) i.jp = 1;
    if (ad > 250 && R() < 0.01 * L && (lv < 6 || aiHitIn(p, p.ch.mv.s, p.f, aiState(p), aiState(o), S))) {
      i.sp = 1;
      i.l = i.r = 0;
    }
  } else if (L > 2 && R() < 0.015) i[aw] = 1;
  if (ad < 110 && R() < (0.015 + rk * 0.05) * (lv >= 6 ? 1 - q * 0.8 : 1)) {
    // 上級ほど、当たらない距離での適当な攻撃は減る
    i.at = 1;
    const r = R();
    if (r < 0.3) i[tw] = 1;
    else if (r < 0.5) i.u = 1;
    else if (r < 0.6) i.d = 1;
    else if (L > 2 && r < 0.75) {
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
  opt = { ch: 0, st: 0, lv: 3, mode: 'cpu', v: 0, vs: 0, wa: 0, wb: 1, wla: 6, wlb: 6, wspd: 1 }, // wa/wb=観戦の左右のキャラ wla/wlb=レベル wspd=速さ
  res = '',
  K = {},
  pr = {},
  setWait = false, // 設定画面: キーの入力待ち
  setSlot = 0; //     設定画面: 0=メインのキー / 1=サブのキー

const own = (c, s) => s == 0 || save.own[c + '_' + s],
  MN = ['オフライン', 'オンライン', 'キャラクター', 'ショップ', '戦績', 'リプレイ', 'プロフィール', '設定'],
  OF = ['CPU対戦', 'トレーニング', 'CPU観戦', '戻る'],
  ON = ['ランクルーム', 'カジュアルルーム', 'プライベートルーム', '戻る'];

// ================= 試合の記録(結果画面の詳細データ) =================
//  MS.A = 左(自分) / MS.B = 右(相手)。startFight で毎回作り直す(前の試合の値は残らない)
//   dealt   与えたダメージ  … 自分の攻撃(打撃・飛び道具・投げ)で相手の体力が実際に減った量の合計(0 より下は数えない)
//   taken   受けたダメージ  … 自分の体力が減った量の合計(相手の攻撃 + ステージのダメージ)
//   maxCombo / maxComboDmg  … 1回のコンボで当てた最大のヒット数 / 最大のダメージ(1発だけも 1HIT のコンボとして数える)
//   jg / guarded            … ジャストガードの回数 / シールドで受けた攻撃の回数(ジャストガード + ふつうのガード)
//                             ジャスガ率 = jg ÷ guarded
//   att / hit               … 出した技の数(攻撃判定か飛び道具がある技。投げは除く) / そのうち相手に当たった技の数
//                             (ガード・ジャストガードされた技は当たりに数えない。多段技・何発も撃つ技は1回と数える)
//                             攻撃命中率 = hit ÷ att
//   time                    … 試合時間(F)。READY の間と K.O. のあとは数えない
//   head / pj / thr         … 頭に当てた回数 / 飛び道具が当たった回数 / 投げが決まった回数(実績に使う。profile.js)
//   apar / cparry           … 空中受け流し / しゃがみ受け流しで攻撃を受けた回数(実績に使う)
//   gxUse / sxUse / sxHit   … ゲージ技を出した回数 / 超必殺技を出した回数 / 超必殺技が当たった回数(実績に使う)
let MS = null, RESULT = null, resSel = 0;
const msNew = () => ({ dealt: 0, taken: 0, maxCombo: 0, maxComboDmg: 0, comboDmg: 0, jg: 0, guarded: 0, att: 0, hit: 0, hitIds: {}, head: 0, pj: 0, thr: 0, apar: 0, cparry: 0, gxUse: 0, sxUse: 0, sxHit: 0 });
const msReset = () => (MS = { A: msNew(), B: msNew(), time: 0 });
const msOf = (p) => (!MS || !p ? null : p === A ? MS.A : p === B ? MS.B : null);
function msHit(att, def, d, cb, mid) {
  const a = msOf(att), b = msOf(def);
  if (b) b.taken += d;
  if (!a) return;
  a.dealt += d;
  if (cb > 0) {
    a.comboDmg = cb <= 1 ? d : a.comboDmg + d;
    a.maxCombo = Math.max(a.maxCombo, cb);
    a.maxComboDmg = Math.max(a.maxComboDmg, a.comboDmg);
  }
  if (mid != null && !a.hitIds[mid]) {
    a.hitIds[mid] = 1;
    a.hit++;
  }
}
function msGuard(def, jg) {
  const b = msOf(def);
  if (!b) return;
  b.guarded++;
  if (jg) b.jg++;
}

// ================= K.O. の演出 =================
//  体力が 0 になった瞬間から: 両者の操作を受け付けない(入力・CPU・通常の戦闘処理を止める)。飛んでいる弾は消える
//   ・勝った側: その位置で止まる(空中なら真下に落ちるだけ)。勝利ポーズは取らない
//   ・負けた側: キャラごとの K.O. アニメーション(character.js の ko)。倒れて止まってから KO_TIME.rest F 待って結果画面へ
//   ・最初の KO_TIME.slow F はスロー(2F に1回だけ進む)
const KO_TIME = { slow: 30, rest: 60, max: 260 };
//  K.O. で使う姿勢(ゲームの中の並び: [lean, 右肩, 右肘, 左肩, 左肘, 右腿, 右膝, 左腿, 左膝, 前後ずれ])
//   角度は 0=真下 / 正=前(向いている方)。back=あお向け(頭が後ろ) / front=うつぶせ(頭が前)
const KO_POSES = {
  blown: [-0.9, 2.4, 0.5, 2, 0.6, 0.8, -0.5, 0.4, -0.6, 0],          // 吹っ飛ぶ(体が後ろへ反る)
  tuck: [0.4, 1.2, 1.7, 1.0, 1.9, 1.7, -2.3, 1.4, -2.0, 0],          // 体を丸める(回転用)
  float: [-0.6, 2.8, 0.3, 2.4, 0.5, 0.5, -0.4, 0.2, -0.3, 0],        // ふわっと浮く(両腕が上へ流れる)
  stagger: [-0.45, -0.5, 0.3, -0.8, 0.4, 0.35, -0.3, -0.45, 0.25, -4], // よろける(後ろへ)
  stagger2: [0.35, 0.3, 0.2, 0.0, 0.3, 0.5, -0.7, -0.2, 0.3, 4],     // よろける(前へ)
  kneel: [0.55, 0.25, 0.1, -0.1, 0.15, 0.9, -2.4, 0.2, -1.75, 0],    // ひざをつく
  kneelLow: [0.95, 0.6, 0.2, 0.4, 0.3, 0.9, -2.4, 0.25, -1.8, 4],    // ひざをついて前へ崩れる
  fallBack: [-0.95, -1.2, 0.3, -1.5, 0.4, 0.9, -0.3, 0.6, -0.2, -6], // 後ろへ倒れていく途中
  fallFront: [1.15, 1.3, 0.3, 1.0, 0.4, -0.5, -0.4, -0.2, -0.6, 6],  // 前へ倒れていく途中
  back: [-1.45, -1.75, 0.3, -1.2, -0.4, 1.35, 0.15, 1.15, 0.5, 0],   // あお向けに倒れた
  front: [1.45, 1.7, 0.2, 1.5, 0.5, -1.35, -0.1, -1.2, -0.5, 0],     // うつぶせに倒れた
};
const KO_DEFAULT = { type: 'fly', vx: 7, vy: -9, gravity: 1, spin: 0, bounce: 1, slide: 0.85, air: 'blown', lie: 'back' };
const KO_ROT = [0, 1, 3, 5, 7]; // 体ごと回すときに足す角度(lean・両肩・両腿)
const koPose = (n) => (typeof n === 'string' ? KO_POSES[n] || KO_POSES.back : n || KO_POSES.back);
const koCfg = (p) => p.ch.ko || KO_DEFAULT;
// character.js の ko を読み込む(自作の姿勢配列は【姿勢配列】の並びなので並べ替える)
function koIn(k) {
  if (!k) return null;
  const P = (v) => (Array.isArray(v) ? poseIn(v) : v);
  return { ...k, air: P(k.air), lie: P(k.lie), keys: k.keys && k.keys.map(([n, v]) => [n, P(v)]) };
}
function koStart() {
  const L = B.hp <= 0 ? B : A, Wn = L === A ? B : A, K = koCfg(L), S = ST[opt.st];
  ko = 1;
  PJ = [];
  const dir = L.x === Wn.x ? -L.f : Math.sign(L.x - Wn.x);
  L.f = -dir; // 勝った側の方を向いて倒れる
  Object.assign(L, { st: 'ko', t: 0, mv: null, dn: false, sw: false, run: 0, aiSeq: null, moveLock: 0, koLand: 0, koRest: -1, koB: K.bounce | 0, koK0: null });
  if (K.type === 'collapse') {
    L.vx = dir * (K.drift || 0);
    if (L.y >= GY) L.koK0 = 0;
  } else {
    L.vx = dir * (K.vx ?? 7);
    L.vy = K.vy ?? -9;
    if (L.y >= GY) L.y = GY - 1;
    L.koSpinT = K.spinTime || Math.max(10, (2 * Math.abs(L.vy)) / (S.g * (K.gravity ?? 1) * (L.ch.gm || 1)));
  }
  if (Wn.st === 'atk' && Wn.mv && Wn.mv.sup && msOf(Wn)) msOf(Wn).sxKO = 1; // 試合の記録: 超必殺技で決着(実績用)
  Object.assign(Wn, { st: 'idle', t: 0, mv: null, vx: 0, dn: false, sw: false, run: 0, aiSeq: null, moveLock: 0 });
}
// K.O. 中の 1F(upd から)
function koUpdate(S) {
  if (hs > 0) return void hs--;                       // 決め手のヒットストップ
  if (ko <= KO_TIME.slow && fr % 2) return;            // 決着の瞬間はスロー
  ko++;
  for (const p of [A, B]) (p.st === 'ko' ? koStep : koWinStep)(p, S);
  updateEffects();
  stepParticles();
  if (rpPlaying()) trMeterRecord();
  const L = A.st === 'ko' ? A : B;
  if ((L.koRest >= 0 && L.t - L.koRest > KO_TIME.rest) || ko > KO_TIME.max) {
    if (typeof NET !== 'undefined' && NET.on && NET.predicting) return;   // オンライン: 予想で進めている間は勝負を決めない(確定してから)
    ko = 0;
    if (rpPlaying()) rpReachedEnd(); // リプレイは結果画面に行かず、最後の場面で止まる
    else endFight(B.hp <= 0);
  }
}
function koWinStep(p, S) {
  p.t++;
  p.vx = 0;
  if (p.y < GY || p.vy < 0) {
    p.y += p.vy;
    p.vy += S.g * (p.ch.gm || 1);
    if (p.y >= GY) { p.y = GY; p.vy = 0; dust(p.x, GY, 4); }
  }
}
function koThud(p, K) {
  p.koLand = p.t;
  dust(p.x, GY, K.thud ?? 12, K.dust || '#ddd');
  dust(p.x - p.f * 40, GY, (K.thud ?? 12) >> 1, K.dust || '#ddd');
  fx.push({ k: 'ring', x: p.x, y: GY, r: 70 + (K.thud ?? 12) * 2, e: 1, t: 14, l: 14, c: K.dust || '#ddd' });
  if (save.cfg.shake && typeof shakeT !== 'undefined') { shakeT = Math.max(shakeT, 10); shakeP = Math.max(shakeP, (K.thud ?? 12) / 3); }
  const lie = koPose(K.lie);                           // 回転した分を戻して、倒れた姿勢へなめらかに移るようにする
  if (p.pose) for (const i of KO_ROT) p.pose[i] -= Math.PI * 2 * Math.round((p.pose[i] - lie[i]) / (Math.PI * 2));
}
function koStep(p, S) {
  const K = koCfg(p), air0 = p.y < GY;
  p.t++;
  p.x = Math.max(30, Math.min(W - 30, p.x + p.vx));
  if (air0 || p.vy < 0) {
    p.y += p.vy;
    p.vy += S.g * (K.gravity ?? 1) * (p.ch.gm || 1);
    if (p.y >= GY) {
      p.y = GY;
      if (p.koB > 0 && p.vy > 4) {                   // バウンド
        p.koB--;
        p.vy = -p.vy * 0.35;
        p.y = GY - 1;
        dust(p.x, GY, 8, K.dust || '#ddd');
      } else {
        p.vy = 0;
        if (K.type === 'collapse') { if (p.koK0 == null) p.koK0 = p.t; }
        else if (!p.koLand) koThud(p, K);
      }
    }
  }
  if (p.y >= GY) {
    p.vx *= K.type === 'collapse' ? 0.85 : p.koLand ? K.slide ?? 0.85 : 1;
    if (Math.abs(p.vx) > 2 && p.t % 3 === 0) dust(p.x, GY, 2, K.dust || '#ddd');   // 地面をすべる
  }
  if (K.type === 'collapse' && p.koK0 != null && !p.koLand && p.t - p.koK0 >= koKeysLen(K)) koThud(p, K);
  if (p.koLand && p.koRest < 0 && p.y >= GY && Math.abs(p.vx) < 0.3) p.koRest = p.t;
}
const koKeysLen = (K) => (K.keys || []).reduce((s, k) => s + k[0], 0);
// 負けた側の姿勢(tgtBase から)
function koTarget(p) {
  const K = koCfg(p), lie = koPose(K.lie);
  if (K.type === 'collapse') {
    if (p.koK0 == null) return koPose(K.air || 'blown');            // 空中で決着: 着地するまで
    let t = p.t - p.koK0, prev = p.ch.ps.idle;
    for (const [n, ps] of K.keys || []) {
      const q = koPose(ps);
      if (t < n) return mo(prev, q, ez(t / n));
      t -= n;
      prev = q;
    }
    return t < 8 ? mo(prev, lie, ez(t / 8)) : lie;
  }
  if (p.koLand) return lie;
  const th = (K.spin || 0) * Math.min(1, p.t / (p.koSpinT || 30)), q = koPose(K.air || 'blown').slice();
  for (const i of KO_ROT) q[i] += th;
  return q;
}
function stepParticles() {
  PT = PT.filter((q) => {
    q.x += q.vx;
    q.y += q.vy;
    q.vy += q.g ?? 0.15;
    return --q.t > 0;
  });
}

function startFight() {
  // 試合の始まりの状態をそろえる(リプレイで同じ試合を再現するため)。乱数の種もここで決める
  rngSeed(rpBeginFight());   // 記録の開始 / リプレイの種(replay.js)
  if (NET.on) { rngSeed(NET.seed); RP.rec = null; }   // オンライン: 両方の画面で同じ種から始める(記録はしない)
  fr = 0;
  gfr = 0;
  tp = {};
  ddKeep = 0;
  aiCache.clear();
  msReset(); // 試合の記録を作り直す(前の試合の値は残さない)
  RESULT = null;
  resSel = 0;
  const lv =
    opt.mode === 'rank'
      ? Math.max(1, Math.min(5, Math.round(save.rp / 400) - 1))
      : opt.lv;
  opt.lv = opt.mode === 'cpu' || opt.mode === 'train' ? opt.lv : lv;
  if (opt.mode === 'cpu') opt.lv = Math.max(1, opt.lv); // CPU対戦に棒立ち(0)は無い
  if (opt.mode === 'train' && opt.lv > AI_MAX_LV) opt.lv = 0;
  if (opt.mode === 'watch') {
    // CPU観戦: 左右とも CPU(ランダムを選んだらここで決める)
    const pickCh = (c) => (c >= CH.length ? (R() * CH.length) | 0 : c);
    A = F(pickCh(opt.wa), 0, 300, 1);
    B = F(pickCh(opt.wb), 0, 660, -1);
    opt.lv = opt.wlb;
  } else if (NET.on) {
    netSetupFight();   // オンライン: 左右のキャラ・スキン・ステージはサーバーから届いた値(net.js)
  } else {
    A = F(opt.ch, save.sk[opt.ch] || 0, 300, 1);
    const rc = R() * CH.length | 0, rs = R() * 4 | 0;   // 乱数の使い方は相手を選んでも変えない(リプレイの再現のため)
    B = F(opt.mode === 'cpu' && opt.oc != null && opt.oc < CH.length ? opt.oc : rc, rs, 660, -1);   // CPU対戦: 選んだ相手(opt.oc。CH.length = ランダム)
  }
  if (!NET.on) rpFixFighters(); // リプレイ: 記録したキャラ・スキンにする(乱数の使い方は変えない)
  G = { x: 480, t: 0 };
  fx = [];
  PJ = [];
  PT = [];
  FIRE = [];
  DUST = [];
  if (typeof RAGE !== 'undefined') RAGE = [];
  shakeT = shakeP = 0;
  ko = 0;
  hs = 0;
  cd = 90;
  sc = 'fight';
  if (opt.mode === 'train') trainingStart(); // トレーニングの準備(相手のキャラ・位置。training.js)
  if (opt.mode === 'train' && typeof pfOnTraining === 'function') pfOnTraining(); // 実績(profile.js)
}

function endFight(w, why) {
  if (NET.on) {                                   // オンライン: w は「左(A)の勝ち」。自分が右なら逆にする。終わったら接続を切る
    if (why == null && NET.side === 1) w = !w;
    netClose();
  }
  rpEndRecord(w); // 記録を終える → 結果画面で保存するか選ぶ(replay.js)
  // 結果画面に出す値(試合の記録 MS から)
  const pick = (p, st) => ({ name: p.ch.nm, ci: CH.indexOf(p.ch), sk: p.sk, hp: p.hp, hpMax: p.ch.hp, ...st });
  RESULT = { win: !!w, mode: opt.mode, time: MS.time, A: pick(A, MS.A), B: pick(B, MS.B), lvA: opt.mode === 'watch' ? opt.wla : null, lvB: opt.mode === 'watch' ? opt.wlb : opt.lv, st: opt.st };
  resSel = 0;
  if (opt.mode === 'watch') {
    // 観戦はコインや勝敗の記録は増えない
    const win = w ? A : B;
    res = (w ? '左' : '右') + 'の ' + win.ch.nm + '(Lv' + (w ? opt.wla : opt.wlb) + ') の勝ち!';
    sc = 'result';
    if (typeof pfOnMatchEnd === 'function') pfOnMatchEnd(w); // プロフィール・実績(profile.js)
    return;
  }
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
  res = (why ? why + '  ' : '') + t;
  sc = 'result';
  if (typeof pfOnMatchEnd === 'function') pfOnMatchEnd(w); // プロフィール・実績(profile.js)
}

// キャラ選択の画面の行(0 キャラ / 4 相手のキャラ / 1 ステージ / 2 CPUレベル / 3 START)。相手を選べるのは CPU対戦だけ
const cfgRows = () => (opt.mode === 'cpu' ? [0, 4, 1, 2, 3] : opt.mode === 'train' ? [0, 1, 2, 3] : [0, 1, 3]);
const cfgOppName = () => (opt.oc != null && opt.oc < CH.length ? CH[opt.oc].nm : 'ランダム');
function cfgGo() {
  if (['rank', 'casual', 'priv'].includes(opt.mode)) netBegin();   // オンライン対戦: サーバーにつないで相手を探す(net.js)
  else startFight();
}

// ================= キャラクター画面(メニューの「キャラクター」) =================
//  行: 0 = キャラ(←→で切り替え) / 1 = スキン(←→で選ぶ・Enterで装備) / 2〜 = 技(選んだ技をくり返し再生)
//  技の行: Enter = 一時停止/再生、←→ = 1Fずつ送る(止まる)、H = 食らい判定の表示
//  左のプレビューでは、技の当たり判定(赤=出ている間 / 点線=出る前・後)とフレームの帯(前隙・持続・後隙)を見られる
const CV_SLOT = { n: 'Z', f: '→Z', b: '←Z', u: '↑Z', d: '↓Z', da: 'ダッシュ中→Z', an: '空中Z', af: '空中→Z', au: '空中↑Z', ad: '空中↓Z',
  s: 'A', sf: '→A', sb: '←A', su: '↑A', sd: '↓A', gx: 'Z+A(同時)', sx: '↓+Z+A(同時)' };
const CV_AIR_Y = 95;          // 空中技のプレビューの高さ(地面からの px)
const CV_HOLD = 36;           // 技が終わってから次に再生するまでの待ち(F)
const CV_COL = { st: '#3fbf6a', ac: '#ff4632', rc: '#3f7bff', none: '#3a3346' };
const CV = { ci: -1, row: -1, t: 0, hold: 0, play: true, hb: false, p: null, scroll: 0 };
// 技の行の一覧(強化版・地上版・投げ・コンボ例も1行ずつ)
function cvRows(ci) {
  const c = CH[ci], rows = [];
  for (const k in c.mv) {
    const m = c.mv[k],
      inp = m.cmd ? m.cmd.text + (m.air === true ? '(空中)' : m.air === 'both' ? '(地上・空中)' : '') : CV_SLOT[k] || k;
    rows.push({ kind: 'mv', m, inp, air: m.air === true || AIR_SLOTS.includes(k) || (m.air === 'both' && !m.gv) });
    if (m.gv) rows.push({ kind: 'mv', m: m.gv, inp: inp.replace(/\(.*\)$/, '') + '(地上)', tag: '地上版', air: false });
    if (m.vb) rows.push({ kind: 'mv', m: m.vb, inp: inp + ' ボルテージ' + m.vb.vneed + '以上', tag: '強化', air: rows[rows.length - 1].air });
  }
  const T = c.th || DEFAULT_THROW;
  rows.push({ kind: 'throw', inp: '投げボタン(+方向)', m: { nm: T.name, st: T.startup, ac: T.active, rc: T.whiff, rx: T.box.x, ry: T.box.y, rw: T.box.w, rh: T.box.h }, T });
  if (c.cb && c.cb.length) rows.push({ kind: 'combo', inp: '', m: { nm: 'コンボ例' } });
  return rows;
}
const cvTotal = (r) => (r && r.kind !== 'combo' ? r.m.st + r.m.ac + r.m.rc : 0);
// 選んでいる行の再生を最初から
function cvReset() {
  const r = cvRows(opt.v)[sel - 2];
  CV.ci = opt.v; CV.row = sel; CV.t = 0; CV.hold = 0;
  CV.p = F(opt.v, opt.vs, 0, 1);
  CV.p.y = r && r.air ? GY - CV_AIR_Y : GY;
  cvApply();
  stepPose(CV.p);
}
// t(今のF)に合わせて状態を決める
function cvApply() {
  const p = CV.p, r = cvRows(opt.v)[CV.row - 2];
  p.sk = opt.vs;
  if (!r || r.kind === 'combo' || CV.t > cvTotal(r) || CV.hold > 0) { p.st = 'idle'; p.t = 0; p.mv = null; return; }
  if (r.kind === 'throw') { p.st = 'throw'; p.td = 'f'; p.tg = -1; p.t = CV.t; return; }
  p.st = 'atk'; p.mv = r.m; p.t = CV.t;
}
// 1F進める(upd から60回/秒)
function cvTick() {
  const r = cvRows(opt.v)[CV.row - 2], p = CV.p, N = cvTotal(r);
  if (CV.t < N) {
    CV.t++;
    const m = r.m;
    if (r.kind === 'mv' && m.launch && CV.t === m.st) {             // 技の移動(昇り技など)
      if (m.launch.x != null) p.vx = m.launch.x;
      if (m.launch.y != null) p.vy = m.launch.y;
    }
  } else if (++CV.hold > CV_HOLD) return cvReset();
  const fixedAir = r && r.air && !(r.m.launch && r.m.launch.y != null);   // 空中技は(上下に動く技でなければ)その高さで止めて見せる
  p.x += p.vx;
  if (!fixedAir || p.vy) { p.y += p.vy; if (p.y < GY) p.vy += ST[0].g * (p.ch.gm || 1); }
  if (p.y >= GY) { p.y = GY; p.vy = 0; p.vx *= 0.7; }
  if (CV.hold > 0 && p.y >= GY) p.vx = 0;
  cvApply();
  stepPose(p);
}
// t のFまで進めた形にする(フレームの帯を押したとき・1F戻すとき)
function cvSeek(t) {
  cvReset();
  const N = cvTotal(cvRows(opt.v)[sel - 2]);
  for (let i = 0; i < Math.max(0, Math.min(N, t)); i++) cvTick();
  CV.play = false;
}
function cvStep() {
  if (CV.ci !== opt.v || CV.row !== sel || !CV.p) cvReset();
  if (CV.play) cvTick();
  else { cvApply(); stepPose(CV.p); }
}
function cvNav(k, up, dn, h, ok, esc) {
  const rows = cvRows(opt.v), n = rows.length + 2;
  if (up) sel = (sel + n - 1) % n;
  if (dn) sel = (sel + 1) % n;
  if (up || dn) { CV.play = true; msg = ''; }
  if (k === 'KeyH') CV.hb = !CV.hb;
  if (sel === 0 && h) {
    opt.v = (opt.v + h + CH.length) % CH.length;
    opt.vs = save.sk[opt.v] || 0;
    msg = '';
  } else if (sel === 1) {
    if (h) { opt.vs = (opt.vs + h + SK.length) % SK.length; msg = ''; }
    if (ok) {
      if (own(opt.v, opt.vs)) { save.sk[opt.v] = opt.vs; sv(); msg = 'スキンを装備しました'; }
      else msg = '未所持:ショップで購入できます(' + SK[opt.vs].p + 'コイン)';
    }
  } else if (sel >= 2) {
    if (ok) CV.play = !CV.play;
    if (h > 0) { CV.play = false; cvTick(); }
    if (h < 0) cvSeek(CV.hold > 0 ? cvTotal(rows[sel - 2]) - 1 : CV.t - 1);
  }
  if (esc) { sc = 'main'; sel = 2; msg = ''; }
}
// ui.js(UI・uiItem・uiHit・panel・hints)が無いときも描けるように、ここで代わりを用意する
const CVU = { ink: '#1d1826', ink2: '#2c2537', hl: '#ffd23f', soft: '#e6e3ec', line: '#4c4458' };
const cvHit = (...a) => { if (typeof uiHit === 'function') uiHit(...a); };
function cvItem(label, x, y, w, h, on, o) {
  if (typeof uiItem === 'function') return uiItem(label, x, y, w, h, on, o);
  g.fillStyle = on ? CVU.hl : CVU.ink2;
  g.fillRect(x, y, w, h);
  T(label, x + w / 2, y + h * 0.68, on ? o.zOn : o.z, on ? CVU.ink : CVU.soft);
}
function cvPanel(x, y, w, h) {
  if (typeof panel === 'function') return panel(x, y, w, h, { fill: CVU.ink2, stroke: CVU.line, lw: 2, seed: 11 });
  g.fillStyle = CVU.ink2;
  g.fillRect(x, y, w, h);
}
function cvHints(list) {
  if (typeof hints === 'function') return hints(list, W / 2, 514, 'center', true);
  T(list.map(([k, l]) => k + ' ' + l).join('   '), W / 2, 514, 13, '#aaa');
}
const cvUD = (v) => (v > 0 ? '下 ' + v : '上 ' + -v); // 縦の速さ(マイナス=上)
// 幅に収まるように文字を小さくして書く
function cvText(s, x, y, z, c, a, maxW) {
  g.font = '800 ' + z + 'px ' + FONT_BODY;
  const w = g.measureText(s).width;
  T(s, x, y, w > maxW ? Math.max(9, Math.floor((z * maxW) / w)) : z, c, a);
}
function cvDraw() {
  dark('キャラクター');
  if (CV.ci !== opt.v || CV.row !== sel || !CV.p) cvReset();
  const c = CH[opt.v], rows = cvRows(opt.v), r = rows[sel - 2], p = CV.p;
  // ---- 左: キャラ・スキン ----
  const LX = 40, LW = 380;
  cvItem('◀  ' + c.nm + '  ▶', LX, 100, LW, 36, sel === 0, { zOn: 21, z: 19 });
  cvHit(LX - 10, 100, LW + 20, 36, (pt) => { sel = 0; const k = (pt.x - LX) / LW; nav(k < 0.5 ? 'ArrowLeft' : 'ArrowRight'); }, () => { if (sel !== 0) sel = 0; });
  const skSt = own(opt.v, opt.vs) ? (save.sk[opt.v] == opt.vs ? '装備中' : 'Enterで装備') : '未所持 ' + SK[opt.vs].p + 'コイン';
  cvItem('スキン ◀ ' + skinName(opt.v, opt.vs) + ' ▶  ' + skSt, LX, 142, LW, 30, sel === 1, { zOn: 16, z: 15 });
  cvHit(LX - 10, 142, LW + 20, 30, (pt) => {
    const k = (pt.x - LX) / LW;
    if (sel !== 1) sel = 1;
    else if (k < 0.3) nav('ArrowLeft');
    else if (k > 0.7) nav('ArrowRight');
    else nav('Enter');
  });
  cvText(c.ds, LX + 4, 192, 12, CVU.soft, 'left', LW - 8);
  T('HP ' + c.hp + '   速度 ' + c.sp + '   ジャンプ ' + -c.jp , LX + 4, 210, 12, '#9cf', 'left');
  // ---- 左: プレビュー ----
  const PX = 34, PY = 218, PW = 392, PH = 206, ground = PY + PH - 16, s = 0.92, ox = PX + 120;
  g.save();
  g.fillStyle = '#ffffff10';
  g.fillRect(PX, PY, PW, PH);
  g.beginPath(); g.rect(PX, PY, PW, PH); g.clip();
  g.strokeStyle = '#ffffff22'; g.lineWidth = 1;                       // 目盛り(50px ごと)
  for (let x = -100; x <= 300; x += 50) { g.beginPath(); g.moveTo(ox + x * s, PY); g.lineTo(ox + x * s, ground); g.stroke(); }
  g.strokeStyle = '#ffffff88'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(PX, ground); g.lineTo(PX + PW, ground); g.stroke();
  g.translate(ox, ground); g.scale(s, s); g.translate(0, -GY);
  drawF(p);
  if (CV.hb) drawHitVolumes(p);
  if (r && r.kind !== 'combo' && r.m.rw > 0) {                          // 当たり判定(投げは掴み判定)
    const m = r.m, bx = p.x + m.rx, by = p.y + m.ry,
      on = (r.kind === 'throw' ? p.st === 'throw' : p.st === 'atk') && CV.t > m.st && CV.t <= m.st + m.ac,
      col = r.kind === 'throw' ? '#ffd23f' : '#ff4632';
    g.save();
    g.lineWidth = 2 / s;
    if (on) { g.fillStyle = col + '66'; g.fillRect(bx, by, m.rw, m.rh); g.strokeStyle = col; }
    else { g.setLineDash([5, 4]); g.strokeStyle = col + '88'; }
    g.strokeRect(bx, by, m.rw, m.rh);
    g.restore();
  }
  g.restore();
  g.strokeStyle = '#4c4458'; g.lineWidth = 2; g.strokeRect(PX, PY, PW, PH);
  cvHit(PX, PY, PW, PH, () => { if (sel >= 2) CV.play = !CV.play; });
  if (r && r.kind === 'mv' && isPJMove(r.m)) T('※ 飛び道具は表示していません', PX + PW - 8, PY + 16, 11, '#ccc', 'right');
  if (r && r.kind !== 'combo' && !CV.play) T('一時停止中', PX + 8, PY + 16, 12, CVU.hl, 'left');
  // ---- 左: フレームの帯 ----
  const N = cvTotal(r);
  if (N > 0) {
    const m = r.m, BX = PX, BY = 432, BW = PW, cw = BW / N, cur = CV.hold > 0 ? -1 : CV.t;
    for (let i = 1; i <= N; i++) {
      const kind = i <= m.st ? 'st' : i <= m.st + m.ac ? 'ac' : 'rc';
      g.fillStyle = CV_COL[kind];
      g.globalAlpha = i === cur ? 1 : 0.55;
      g.fillRect(BX + (i - 1) * cw + (cw > 3 ? 0.5 : 0), BY, cw - (cw > 3 ? 1 : 0), 16);
    }
    g.globalAlpha = 1;
    if (cur > 0) { g.strokeStyle = '#fff'; g.lineWidth = 2; g.strokeRect(BX + (cur - 1) * cw, BY - 2, Math.max(2, cw), 20); }
    cvHit(BX, BY - 4, BW, 24, (pt) => cvSeek(Math.max(1, Math.ceil((pt.x - BX) / cw))));
    const ph = cur <= 0 ? '終わり' : cur <= m.st ? '前隙' : cur <= m.st + m.ac ? '持続' : '後隙';
    T((cur > 0 ? cur : N) + ' / ' + N + 'F  ' + ph, BX, 468, 14, '#fff', 'left');
    [['前隙', 'st'], ['持続', 'ac'], ['後隙', 'rc']].forEach(([l, kk], i) => {
      g.fillStyle = CV_COL[kk]; g.fillRect(BX + BW - 186 + i * 64, 458, 12, 12);
      T(l, BX + BW - 170 + i * 64, 469, 12, CVU.soft, 'left');
    });
  }
  T(msg, LX + LW / 2, 490, 14, CVU.hl);
  // ---- 右: 技の一覧 ----
  const RX = 448, RW = 476, RY = 100, rh = 23, vis = 8;
  T('技', RX, RY + 12, 14, '#9cf', 'left');
  T('前隙 持続 後隙', RX + RW, RY + 12, 12, '#9cf', 'right');
  if (sel >= 2) CV.scroll = Math.max(Math.min(CV.scroll, sel - 2), sel - 2 - vis + 1);
  CV.scroll = Math.max(0, Math.min(CV.scroll, Math.max(0, rows.length - vis)));
  for (let j = 0; j < vis && CV.scroll + j < rows.length; j++) {
    const i = CV.scroll + j, q = rows[i], on = sel === i + 2, y = RY + 20 + j * rh;
    g.fillStyle = on ? CVU.hl : j % 2 ? '#ffffff08' : '#ffffff12';
    g.fillRect(RX, y, RW, rh - 2);
    const cc = on ? CVU.ink : q.tag ? '#ffd9a0' : '#fff';
    g.font = '800 13px ' + FONT_BODY;
    const nm = (q.tag ? '└ ' : '') + q.m.nm;
    T(nm, RX + 8, y + 15, 13, cc, 'left');
    cvText(q.inp, RX + 16 + g.measureText(nm).width, y + 15, 11, on ? '#3a3346' : '#9df', 'left', RW - 140 - g.measureText(nm).width);
    if (q.kind !== 'combo') T(q.m.st + '  ' + q.m.ac + '  ' + q.m.rc, RX + RW - 8, y + 15, 12, cc, 'right');
    cvHit(RX, y, RW, rh - 2, () => { if (sel === i + 2) CV.play = !CV.play; else { sel = i + 2; CV.play = true; } });
  }
  if (CV.scroll > 0) T('▲', RX + RW / 2, RY + 14, 11, '#9cf');
  if (CV.scroll + vis < rows.length) T('▼ ' + (rows.length - CV.scroll - vis), RX + RW / 2, RY + 20 + vis * rh + 9, 11, '#9cf');
  // ---- 右: 選んだ技の詳しい情報 ----
  const DY = 314;
  cvPanel(RX, DY, RW, 178);
  if (!r) {
    T('↓で技を選ぶと、動きと当たり判定を再生します', RX + RW / 2, DY + 94, 14, CVU.soft);
  } else if (r.kind === 'combo') {
    T('コンボ例(Z=攻撃 A=必殺)', RX + 16, DY + 28, 16, CVU.hl, 'left');
    c.cb.forEach((s2, i) => cvText(s2, RX + 16, DY + 56 + i * 24, 13, '#fff', 'left', RW - 32));
    T('ジャスガ:シールド発動6〜12Fで受ける→相手硬直・飛び道具反射', RX + 16, DY + 160, 12, '#9cf', 'left');
  } else {
    const m = r.m, th = r.kind === 'throw';
    T(m.nm, RX + 16, DY + 28, 18, CVU.hl, 'left');
    g.font = '800 18px ' + FONT_BODY;
    cvText(r.inp, RX + 26 + g.measureText(m.nm).width, DY + 27, 13, '#9df', 'left', RW - 50 - g.measureText(m.nm).width);
    const hits = m.hits > 1 ? m.hits : 1,
      L1 = [
        ['前隙', m.st + 'F', CV_COL.st],
        ['発生', (m.st + 1) + 'F目'],
        ['持続', m.ac + 'F', CV_COL.ac],
        [th ? '空振りの隙' : '後隙', m.rc + 'F', CV_COL.rc],
        ['全体', (m.st + m.ac + m.rc) + 'F'],
        ...(th ? [] : [['着地隙', m.lg != null ? m.lg + 'F' : '-']]),
      ],
      L2 = th
        ? [['判定', m.rw > 0 ? '前' + m.rx + '〜' + (m.rx + m.rw) + '  高さ' + -(m.ry + m.rh) + '〜' + -m.ry : 'なし'],
           ...['f', 'b', 'u', 'd'].map((d) => [{ f: '前投げ', b: '後ろ投げ', u: '上投げ', d: '下投げ' }[d], r.T[d] ? r.T[d].name + '  ' + r.T[d].damage + 'ダメ' : '-'])]
        : [['ダメージ', m.d + (hits > 1 ? ' × ' + hits + 'ヒット' : '')],
           ['のけぞり', (m.hs ?? '-') + 'F' + (m.hst != null ? '  ヒットストップ ' + m.hst + 'F' : '')],
           ['吹っ飛び', '横 ' + (m.kx ?? 0) + ' / ' + cvUD(m.ky ?? 0)],
           ...(isLowMove(m) ? [['下段', 'しゃがみ受け流しできない']] : []),
           ['判定', m.rw > 0 ? '前' + m.rx + '〜' + (m.rx + m.rw) + '  高さ' + -(m.ry + m.rh) + '〜' + -m.ry : isPJMove(m) ? '飛び道具' : 'なし'],
           ...(hits > 1 ? [['多段の間隔', (m.hiv || Math.max(1, Math.floor(m.ac / hits))) + 'F']] : []),
           ...(m.launch ? [['移動', (m.launch.x != null ? '横 ' + m.launch.x + ' ' : '') + (m.launch.y != null ? cvUD(m.launch.y) : '')]] : []),
           ...(m.inv ? [['無敵', m.inv + 'F']] : []),
           ...(m.armor ? [['アーマー', m.armor + '回']] : []),
           ...(m.spk ? [['叩きつけ', '地面でバウンド(' + m.spk + ')']] : []),
           ...(m.drain ? [['吸血', '与えたダメージの' + Math.round(m.drain * 100) + '%回復']] : []),
           ...(m.bc ? [['血の代償', '出すと体力 -' + m.bc]] : []),
           ...(m.veil ? [['水まとい', 'AQUA ゲージ +' + m.veil]] : []),
           ...(m.ctr ? [['カウンター', '構え中に打撃→打ち返し ' + m.ctr.d + 'ダメ(無敵' + m.ctr.inv + 'F)・飛び道具は跳ね返す']] : []),
           ...(m.bnc ? [['跳ね返り', '当たる・ガードされると自分が跳ね返る']] : []),
           ...(m.ub ? [['ガード不能', 'シールド・しゃがみ受け流しで防げない(跳べば避けられる)']] : []),
           ...(m.grab ? [['コマンド投げ', 'ガード不能・空中は不可 / 範囲 ' + (m.grab.box.x + m.grab.box.w) + 'px']] : []),
           ...(m.flt != null ? [['空中で止まる', '出している間はふわっと止まる']] : []),
           ...(c && c.aq && m.k && m.fol !== null && typeof aquaFollowSpec === 'function' && aquaFollowSpec({ ch: c }, m.k) ? (() => { const f = aquaFollowSpec({ ch: c }, m.k);
             return [['水の追撃', { shot: '水弾', burst: '弾ける水', geyser: '水柱', rain: '水の雨', wave: '地を走る波' }[f.kind] + ' ' + f.d + 'ダメ' + (f.n > 1 ? '×' + f.n : '') + ' / AQUA -' + f.cost]]; })() : []),
           ...(m.cost ? [['SPゲージ', m.cost + (m.sup ? '(超必殺技)' : '')]] : []),
           ...(m.vneed ? [['ボルテージ', m.vneed + '以上で発動・' + m.vuse + '使う']] : []),
           ...(m.vadd ? [['ボルテージ', '+' + m.vadd]] : [])];
    L1.forEach(([l, v, col], i) => {
      const y = DY + 56 + i * 22;
      if (col) { g.fillStyle = col; g.fillRect(RX + 16, y - 10, 8, 10); }
      T(l, RX + 30, y, 13, CVU.soft, 'left');
      T(v, RX + 160, y, 15, '#fff', 'right');
    });
    const st2 = L2.length > 6 ? Math.max(15, Math.floor(118 / (L2.length - 1))) : 20;   // 行が多いときは詰める
    L2.forEach(([l, v], i) => {
      const y = DY + 56 + i * st2;
      T(l, RX + 186, y, 12, CVU.soft, 'left');
      cvText(v, RX + 266, y, 13, '#fff', 'left', RW - 280);
    });
  }
  cvHints(sel === 0 ? [['←→', 'キャラ'], ['↑↓', '選ぶ'], ['Esc', '戻る']]
    : sel === 1 ? [['←→', 'スキン'], ['Enter', '装備'], ['↑↓', '選ぶ'], ['Esc', '戻る']]
    : [['↑↓', '技'], ['Enter', '一時停止'], ['←→', '1F送り'], ['H', '食らい判定' + (CV.hb ? ' ON' : '')], ['Esc', '戻る']]);
}

function nav(k) {
  const up = k === 'ArrowUp',
    dn = k === 'ArrowDown',
    lf = k === 'ArrowLeft',
    rt = k === 'ArrowRight',
    ok = k === 'Enter' || (k === 'Space' && sc !== 'fight'),
    esc = k === 'Escape',
    h = rt - lf;
  if (typeof rpNav !== 'function') return;
  if (typeof pfNav === 'function' && pfNav(k)) return; // プロフィール・実績・称号(profile.js)
  if (typeof netNav === 'function' && netNav(k)) return; // オンライン: マッチングの画面(net.js)
  if (rpNav(k)) return; // 戦績・リプレイの画面 / リプレイ再生中 / 結果画面の保存確認(replay.js)
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
    L(MN.length);
    if (ok) {
      const m = ['off', 'onl', 'chars', 'shop', 'records', 'rplist', 'profile', 'set'][sel];
      if (m === 'profile') { pfOpen(); return; } // プロフィール・実績・称号(profile.js)
      if (m === 'records' || m === 'rplist') { rpOpen(m, 'main'); return; } // 戦績・リプレイ(replay.js)
      sc = m;
      sel = 0;
      opt.v = 0;
      opt.vs = save.sk[0] || 0;
      msg = '';
    }
  } else if (sc === 'off') {
    L(OF.length);
    if (esc) sc = 'main';
    if (ok) {
      if (sel == 3) {
        sc = 'main';
        sel = 0;
      } else if (sel == 2) {
        opt.mode = 'watch'; // CPU観戦
        sc = 'wcfg';
        sel = 0;
      } else {
        // CPU対戦とトレーニングでレベルを別々に覚える(トレーニングの「棒立ち=0」が CPU対戦に持ち越されないように)
        if (opt.mode === 'train') opt.trLv = opt.lv;
        else if (opt.mode === 'cpu') opt.cpuLv = opt.lv;
        opt.mode = sel ? 'train' : 'cpu';
        opt.lv = opt.mode === 'train' ? opt.trLv ?? 0 : Math.max(1, opt.cpuLv ?? opt.lv); // トレーニングの最初は 0(棒立ち)
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
  } else if (sc === 'wcfg') {
    // CPU観戦の設定: 左のキャラ / 左のレベル / 右のキャラ / 右のレベル / ステージ / 速さ / START
    L(7);
    if (esc) {
      sc = 'off';
      sel = 2;
    }
    const nc = CH.length + 1; // 最後は「ランダム」
    if (h) {
      if (sel == 0) opt.wa = (opt.wa + h + nc) % nc;
      if (sel == 1) opt.wla = Math.max(1, Math.min(AI_MAX_LV, opt.wla + h));
      if (sel == 2) opt.wb = (opt.wb + h + nc) % nc;
      if (sel == 3) opt.wlb = Math.max(1, Math.min(AI_MAX_LV, opt.wlb + h));
      if (sel == 4) opt.st = (opt.st + h + 4) % 4;
      if (sel == 5) opt.wspd = [1, 2, 4][([1, 2, 4].indexOf(opt.wspd) + h + 3) % 3];
    }
    if (ok && sel == 6) startFight();
  } else if (sc === 'cfg') {
    // 行: 0 キャラ / 4 相手のキャラ(CPU対戦だけ) / 1 ステージ / 2 CPUレベル / 3 START
    const rows = cfgRows(), n = rows.length;
    L(n);
    const r = rows[sel];
    if (esc) {
      sc = opt.mode === 'cpu' || opt.mode === 'train' ? 'off' : 'onl';
      sel = 0;
    }
    if (h) {
      if (r == 0) opt.ch = (opt.ch + h + CH.length) % CH.length;
      if (r == 4) opt.oc = ((opt.oc ?? CH.length) + h + CH.length + 1) % (CH.length + 1);   // 最後は「ランダム」
      if (r == 1) opt.st = (opt.st + h + 4) % 4;
      if (r == 2)
        opt.lv = Math.max(
          opt.mode === 'train' ? 0 : 1,
          Math.min(AI_MAX_LV, opt.lv + h)
        );
    }
    if (ok) cfgGo();
  } else if (sc === 'match') {
    if (esc) {
      sc = 'onl';
      sel = 0;
    }
  } else if (sc === 'chars') {
    cvNav(k, up, dn, h, ok, esc);
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
  } else if (sc === 'set') {
    // 設定画面: キー配置 / 簡単コマンド / 画面の揺れ / 操作説明 / 画質 / フレームレート / 初期値に戻す / 戻る
    const n = KEY_ACTIONS.length + 7;
    L(n);
    if (sel < KEY_ACTIONS.length && (lf || rt)) setSlot = rt ? 1 : 0;
    if (esc) {
      sc = 'main';
      sel = MN.length - 1;
      return;
    }
    if (sel < KEY_ACTIONS.length) {
      if (ok) setWait = true; // 次に押したキーを割り当てる(keydown で受け取る)
      if ((k === 'Backspace' || k === 'Delete') && setSlot === 1) {
        save.keys[KEY_ACTIONS[sel][0]].splice(1, 1); // サブのキーを消す
        sv();
      }
    } else {
      const r = sel - KEY_ACTIONS.length;
      if (r < 3 && (ok || lf || rt)) {
        const key = ['easyCmd', 'shake', 'help'][r];
        save.cfg[key] = !save.cfg[key];
        sv();
      }
      if (r === 3 && (ok || lf || rt)) {                 // 画質: ←→ / Enter で切り替え
        const ids = QUALITY.map((q) => q[0]), i = Math.max(0, ids.indexOf(save.cfg.quality));
        save.cfg.quality = ids[(i + (lf ? -1 : 1) + ids.length) % ids.length];
        fitCanvas();
        sv();
      }
      if (r === 4 && (ok || lf || rt)) {                 // フレームレート: ←→ / Enter で切り替え
        const ids = FPS_LIST.map((q) => q[0]), i = Math.max(0, ids.indexOf(save.cfg.fps));
        save.cfg.fps = ids[(i + (lf ? -1 : 1) + ids.length) % ids.length];
        sv();
      }
      if (r === 5 && ok) {
        save.keys = {};
        save.cfg = {};
        loadSettings();
        sv();
        msg = '初期値に戻しました';
      }
      if (r === 6 && ok) {
        sc = 'main';
        sel = MN.length - 1;
      }
    }
  } else if (sc === 'fight') {
    if (opt.mode === 'train' && trainingNav(k)) return; // トレーニング: Esc=ポーズメニュー / R / H / 数字 (training.js)
    if (esc && NET.on) { endFight(false, '途中でやめました'); return; }   // オンライン: Esc は降参(相手の勝ち)
    if (esc) {
      sc = 'main';
      sel = 0;
    }
  } else if (sc === 'result') {
    // 結果画面: キャラクター選択へ / メニューへ(リプレイの保存確認は replay.js の rpNav が先に受け取る)
    if (up || dn || lf || rt) resSel ^= 1;
    if (esc || (ok && resSel === 1)) {
      RESULT = null;
      sc = 'main';
      sel = 0;
    } else if (ok) {
      RESULT = null;                              // 前の試合の結果・記録は持ち越さない(次の startFight でも作り直す)
      sc = opt.mode === 'watch' ? 'wcfg' : 'cfg'; // 観戦は観戦の設定画面(キャラ選択)へ
      sel = 0;
    }
  }
}

addEventListener('keydown', (e) => {
  if (sc === 'set' && setWait) {
    // 設定画面でキーの割り当て待ち
    e.preventDefault();
    if (e.repeat) return;
    setWait = false;
    if (e.code === 'Escape') return; // 取り消し
    if (RESERVED_KEYS.includes(e.code)) return;
    const ng = bindKey(KEY_ACTIONS[sel][0], setSlot, e.code);
    msg = ng ? keyName(e.code) + ' は「' + ng + '」の唯一のキーなので、サブには割り当てられません' : KEY_ACTIONS[sel][1] + ' に ' + keyName(e.code) + ' を割り当てました';
    return;
  }
  if (e.code.startsWith('Arrow') || e.code === 'Space' || (sc === 'fight' && (boundAction(e.code) || e.code === 'Tab'))) e.preventDefault();
  if (e.repeat && !e.code.startsWith('Arrow')) return;
  if (!e.repeat) {
    K[e.code] = 1;
    pr[e.code] = 1;
  }
  nav(e.code);
});
addEventListener('keyup', (e) => (K[e.code] = 0));

// このフレームの入力のビット(IW)から、キャラが使う入力を作る。ST = { tp: 前に押したF, ddKeep: 空中受け流しの先行入力 }(キャラごと)
function inputFromBits(IW, PC, ST) {
  const tp = ST.tp;
  let dh = 0;
  for (const [a, v] of [
    ['right', 1],
    ['left', -1],
  ])
    if (iwHit(IW, a)) {
      if (fr - (tp[a] || -99) < 14) dh = v;
      tp[a] = fr;
    }
  // 空中受け流し: しゃがみ(設定の「下(しゃがみ)」のキー)を2回 / 空中受け流しのキー(設定。初期設定は X)を空中で押す
  //   ヒットストップ中に入れた分は覚えておき、止まりが解けたフレームに使う
  let dd = 0;
  if (iwHit(IW, 'down')) {
    if (fr - (tp.down2 ?? -99) < AIR_PARRY.window) { dd = 1; tp.down2 = -99; }
    else tp.down2 = fr;
  }
  if (iwHit(IW, 'airParry') && PC && PC.y < GY) dd = 1;   // 空中にいるときだけ(地上では同じキーのシールドなどに使う)
  // ヒットストップ中・空中受け流し中に入れた ↓↓ は 12F 覚えておき、動けるようになったフレームに使う
  if (dd && (hs > 0 || (PC && (PC.st === 'hit' || PC.st === 'apar')))) { ST.ddKeep = 12; dd = 0; }
  else if (ST.ddKeep > 0 && hs <= 0) {
    if (PC && PC.st === 'idle') { dd = 1; ST.ddKeep = 0; } else ST.ddKeep--;
  }
  // キー配置は設定画面で変えられる(save.keys)
  const i1 = {
    dh,
    dd,
    l: iwDown(IW, 'left'),
    r: iwDown(IW, 'right'),
    u: iwDown(IW, 'up'),
    d: iwDown(IW, 'down'),
    at: iwHit(IW, 'attack'),
    sh: iwDown(IW, 'shield'),
    jp: iwHit(IW, 'jump'),
    sp: iwHit(IW, 'special'),
    spH: iwDown(IW, 'special'),   // A を押し続けている(長押しの技: メイ＆ロロの突進など)
    selfH: iwDown(IW, 'self'),    // 本体の必殺のキーを押している(メイ＆ロロ: 押しながら A でメイ自身の必殺技)
    th: iwHit(IW, 'throw'),
  };
  return i1;
}

// ---- update ----
function upd() {
  if (sc === 'fight' && opt.mode === 'train' && typeof trFrozenGate === 'function' && trFrozenGate()) return;   // トレーニングの一時停止(コマ送り)
  let netIn = null;
  if (sc === 'fight' && NET.on) {                 // オンライン: net.js の netTick が、確定した状態から入力を渡して何Fか進め直す(ロールバック)
    if (!NET.inject) return netTick();
    netIn = NET.inject;
  }
  fr++;
  // 姿勢(見た目と食らい判定の形)を1F進める。描く回数ではなくゲームの1Fごとなので、フレームレートの設定で動きは変わらない
  if (typeof A !== 'undefined' && A) stepPose(A);
  if (typeof B !== 'undefined' && B) stepPose(B);
  if (sc === 'match') {
    if (NET.on) netMatchStep();   // オンライン: 相手が見つかったら試合へ(net.js)
    return; // 試合は次の upd から(リプレイと同じ始まり方にする)
  }
  if (sc === 'chars') cvStep(); // キャラクター画面の技の再生
  if (sc !== 'fight') return;
  if (trainingPaused()) return; // トレーニングのポーズ中は止める
  let IW, IWB = 0;
  if (netIn) [IW, IWB] = netIn;                  // オンライン: 上でそろえた2人分の入力
  else IW = rpFrameInput(); // このフレームの入力(記録する / リプレイなら記録から読む。replay.js)
  // プレイヤーが操作するキャラ。トレーニングで「操作の入れ替え」をしているときは相手(B)を動かす(training.js)
  const PC = opt.mode === 'train' && TR && TR.swap ? B : A;
  const S = ST[opt.st];
  if (cd > 0) {
    cd--;
    return;
  }
  if (ko > 0 && opt.mode !== 'train') return koUpdate(S); // K.O. の演出中: 入力・CPU・通常の戦闘処理はしない
  if (MS) MS.time++;
  let i1, iB = null;
  if (NET.on) {                                   // オンライン: 左は A、右は B。それぞれの入力から、ダッシュの2回押しなども別々に作る
    i1 = inputFromBits(IW, A, NET.st[0]);
    iB = inputFromBits(IWB, B, NET.st[1]);
    recordInput(B, iB);
  } else {
    const LST = { tp, ddKeep };
    i1 = inputFromBits(IW, PC, LST);
    ddKeep = LST.ddKeep;
  }
  if (opt.mode === 'watch' && hs <= 0) Object.assign(i1, { l: 0, r: 0, u: 0, d: 0, at: 0, sh: 0, jp: 0, sp: 0, spH: undefined, selfH: 0, th: 0, dh: 0, dd: 0 }, ai(A, B, opt.wla)); // 観戦: 左も CPU(キーの入力は使わない)
  recordInput(PC, i1); // コマンド判定用(ヒットストップ中の入力も覚える)
  if (opt.mode === 'train') trainingRecordPlayer(i1); // 入力履歴(training.js)
  if (hs > 0) {
    hs--;
    for (const p of [A, B]) if (p.sflash > 0) p.sflash--; // 超必殺技の暗転
    // 先行入力: ヒットストップ中に押したボタンは覚えておき、止まりが解けたフレームに使う(方向キーはその時の状態)
    prKeep = {};
    for (const a of ['attack', 'special', 'jump', 'throw']) for (const k of save.keys[a]) if (pr[k]) prKeep[k] = 1;
    return;
  }
  gfr++;
  for (const p of [A, B]) spGain(p, spOf(p).time); // SP ゲージ: 時間でも少しずつ増える
  if (typeof aquaTick === 'function') for (const p of [A, B]) aquaTick(p, p === A ? B : A);
  if (typeof puppetTick === 'function') for (const p of [A, B]) puppetTick(p, p === A ? B : A); // パペット(ロロ)を動かす(puppet.js) // 水まとい: ゲージが減る・予約した追撃を出す(projectile.js)
  if (PC === B) {
    // トレーニングの操作の入れ替え: 自分のキャラ(A)がダミー、相手(B)をプレイヤーが動かす。動かす順番はいつもどおり A → B
    step(A, trainingInput(A, B, S), B, S);
    step(B, i1, A, S);
  } else {
    step(A, i1, B, S);
    step(B, iB || (opt.mode === 'train' ? trainingInput(B, A, S) : ai(B, A, opt.lv)), A, S); // トレーニングは相手の行動を選べる(training.js) / オンラインは相手の入力
  }
  updateProjectiles(A, B); // 弾を動かす・当てる・軌跡(projectile.js)
  voltStep(A);
  voltStep(B);
  if (opt.st == 3) {
    if (++G.t >= 300) {
      G.t = 0;
      G.x = 100 + R() * 760;
    }
    if (G.t === 90)
      for (const p of [A, B])
        if (Math.abs(p.x - G.x) < 45) {
          const hp0 = p.hp;
          p.hp = Math.max(0, p.hp - 8);
          msHit(null, p, hp0 - p.hp, 0, null); // 試合の記録: ステージのダメージ(受けたダメージだけに数える)
          p.st = 'hit';
          p.hz = 'torso';
          p.t = 24;
          p.vy = -11;
          p.y -= 2;
          p.mv = null;
        }
  }
  updateEffects(); // 技のエフェクト・炎・画面の揺れ(effect.js)
  stepParticles();
  if (opt.mode === 'train') {
    trainingAfterStep(); // 体力の回復・有利フレーム・ダメージ(training.js)
  } else {
    if (rpPlaying()) trMeterRecord(); // リプレイ: フレーム表(training.js)を記録する
    if (A.hp <= 0 || B.hp <= 0) koStart(); // 決着: K.O. の演出へ(次のフレームから koUpdate)
  }
}

// ---- draw ----
// 文字の書体(index.html で読み込む Web フォント。読み込めないときはふつうのゴシック体)
const FONT_BODY = '"M PLUS 1p", "Hiragino Sans", "Noto Sans CJK JP", "Yu Gothic", sans-serif';
const T = (s, x, y, z = 24, c = '#fff', a = 'center') => {
  g.font = '800 ' + z + 'px ' + FONT_BODY;
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

// 姿勢配列どうしを混ぜる。13,14番目(頭・体の向き)は、片方が未指定なら相手側の値を使う(0=真横に引っ張られないように)
const mo = (a, b, t) => Array.from({ length: Math.max(a.length, b.length) }, (_, i) => {
    let x = a[i], y = b[i];
    if (i >= 13 && i <= 20) {                 // 向き(13〜20)だけ特別。手首(21・22)は 0 として混ぜる
      if (x === undefined) x = y;
      else if (y === undefined) y = x;
      return x === undefined ? undefined : x + (y - x) * t;
    }
    return (x ?? 0) + ((y ?? 0) - (x ?? 0)) * t;
  }),
  mix = (a, b, t) => mo(a, b, Math.max(0, Math.min(1, t))),
  ez = (x) => {
    x = Math.max(0, Math.min(1, x));
    return x * x * (3 - 2 * x);
  };

// ---- 向きの目標値 ----
//  優先順: 実行時の上書き(setFighterDir) > 技・投げのタイムライン(turn) > 姿勢配列の14〜21番目 > キャラの既定(look.dir)
//  技の turn: [{ at: 0 | 'startup' | 'active' | 'recovery' (技開始からのF数 or 区間の頭), head: -3〜3, body: -3〜3, ... }, ...]
//    指定できる項目 (書いた物だけが変わり、次の指定が来るまで保たれる):
//      head      頭
//      body      体全体(胴と、全部位) ※ 同じ項目に部位を書いた場合は、その部位だけ個別の値になる
//      torso     胴だけ
//      arms / rArm / lArm            両腕 / 右腕(上腕+前腕) / 左腕
//      rUpperArm rForeArm lUpperArm lForeArm   各腕の部位
//      legs / rLeg / lLeg            両足 / 右足 / 左足
//  投げの turn(character.js の throw.turn): at は数値F か 'grab'(掴む瞬間) / 'release'(投げる瞬間)
function dirApply(st, k) {
  if (k.head != null) st.h = k.head;
  if (k.body != null) {
    st.b = k.body;
    st.parts = st.parts.map(() => k.body);
  }
  if (k.torso != null) st.b = k.torso;
  const pt = st.parts;
  if (k.arms != null) pt[0] = pt[1] = pt[2] = pt[3] = k.arms;
  if (k.rArm != null) pt[0] = pt[1] = k.rArm;
  if (k.lArm != null) pt[2] = pt[3] = k.lArm;
  if (k.legs != null) pt[4] = pt[5] = k.legs;
  DIR_PARTS.forEach((n, i) => {
    if (k[n] != null) pt[i] = k[n];
  });
}
function dirTarget(p, q) {
  const st = { h: 0, b: 1, parts: [] };
  st.parts = DIR_PARTS.map(() => undefined);
  const { head: dh, body: db, ...dp } = p.ch.dir;           // キャラの既定(部位ごとの指定を含む)
  st.h = dh;
  st.b = db;
  dirApply(st, dp);
  if (q[13] != null) st.h = q[13];
  if (q[14] != null) st.b = q[14];
  DIR_PARTS.forEach((_, i) => {
    if (q[15 + i] != null) st.parts[i] = q[15 + i];
  });
  const tl = p.st === 'atk' && p.mv ? p.mv.turn : p.st === 'throw' && (p.thr || p.ch.th) ? (p.thr || p.ch.th).turn : null;
  if (tl) {
    const at = (k) => {
      if (typeof k.at === 'number') return k.at;
      if (p.st === 'throw') return k.at === 'release' ? thrDir(p.thr || p.ch.th, p.td).release : k.at === 'grab' ? (p.thr || p.ch.th).startup : 0;
      return k.at === 'active' ? p.mv.st : k.at === 'recovery' ? p.mv.st + p.mv.ac : 0;
    };
    for (const k of tl.slice().sort((x, y) => at(x) - at(y))) {
      if (at(k) > p.t) break;
      dirApply(st, k);
    }
  }
  if (p.dirOv && fr < p.dirOv.until) dirApply(st, p.dirOv);
  return [clampDir(st.h), clampDir(st.b), ...st.parts.map((v) => clampDir(v ?? st.b))];
}
// スクリプトから向きを変える: setFighterDir(p, 頭, 体, 保つF数, 部位ごとの指定)  ※null を渡した項目は変えない
//   例) setFighterDir(p, 2, 3, 20, { rArm: 0, legs: 1 })
function setFighterDir(p, head, body, frames = 30, parts = {}) {
  p.dirOv = { ...parts, head, body, until: fr + frames };
}
function tgt(p) {
  const q = tgtBase(p), r = Array.from({ length: 23 }, (_, i) => q[i] ?? (i < 13 || i > 20 ? 0 : undefined));
  const d = dirTarget(p, r);
  for (let i = 0; i < 8; i++) r[13 + i] = d[i];
  return r;
}

function tgtBase(p) {
  const air = p.y < GY,
    ps = p.ch.ps,
    IDL = ps.idle; // このキャラの待機姿勢
  if (p.st === 'ko') return koTarget(p); // K.O. のアニメーション
  if (p.st === 'held') return p.hdPose || THROW_MOTIONS[p.hd || 'f'].held;   // コマンド投げは技ごとの「掴まれている側」の姿勢
  if (p.st === 'throw') {
    const T = p.thr || p.ch.th,
      TM = (T.motion && T.motion[p.td]) || THROW_MOTIONS[p.td],
      RC = T.reach || THROW_MOTIONS.reach;
    if (p.tg < 0) {
      if (p.t <= T.startup) return mo(IDL, RC, ez(p.t / T.startup));
      if (p.t <= T.startup + T.active) return RC;
      return mo(RC, IDL, ez((p.t - T.startup - T.active) / T.whiff));
    }
    const DS = thrDir(T, p.td), REL = DS.release;
    if (p.t < REL) return mo(RC, TM.hold, ez((p.t - p.tg) / Math.max(1, REL - p.tg - 6)));
    if (p.t < REL + 6) return mo(TM.hold, TM.rel, (p.t - REL) / 6);
    return mo(TM.rel, IDL, ez((p.t - REL - 6) / Math.max(1, DS.total - REL - 6)));
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
    return mo(F_, IDL, ez((p.t - m.st - m.ac) / (m.rc + (p.rcExtra || 0)) * 1.1)); // 受け流されて後隙が伸びたら、戻りもゆっくり
  }
  if (p.st === 'shield' || p.st === 'sdown') {
    const s = ps.guard;
    return p.st === 'sdown' ? mix(s, IDL, p.t / 10) : mix(IDL, s, p.t / 5);
  }
  if (p.st === 'dash')
    return p.bd ? ps.dashB : ps.dashF;
  if (!air && p.dn && p.st === 'idle')
    return ps.crouch;
  if (p.st === 'apar') {                             // 空中受け流し: 受付の間は身構える / 失敗の隙はだらんと落ちる
    const AP = AIR_PARRY;
    return p.t <= AP.startup + AP.active ? mix(ps.fall, ps.guard, 0.85) : mix(ps.fall, ps.landing, 0.35);
  }
  if (!air && p.st === 'jsq') return mo(IDL, ps.jumpSquat, ez(p.t / Math.max(1, p.ch.jsq))); // ジャンプ前隙:跳ぶ前にため込む
  if (!air && p.st === 'land') {
    // 着地隙:衝撃を受け止めてから立ち上がる
    const u = p.t / Math.max(1, p.lg || 9);
    return u < 0.4 ? ps.landing : mo(ps.landing, IDL, ez((u - 0.4) / 0.6));
  }
  if (air)
    return p.vy < 0 ? ps.jumpUp : ps.fall;
  if (Math.abs(p.vx) > (p.sw ? 0.3 : 0.8)) {
    const s = Math.sin(p.x * (p.sw ? 0.14 : 0.09)) * (p.sw ? 0.6 : 1),     // ゆっくり歩きは歩幅を小さく
      q = Math.max(0, s),
      r = Math.max(0, -s);
    const W = ps.walk,
      I = IDL;
    const wk = [W[0], I[1] + s * W[1], I[2], I[3] - s * W[1], I[4], 0.3 + s * W[2], -0.3 - r * W[3], 0.3 - s * W[2], -0.3 - q * W[3], 0, I[10] || 0, I[11] || 0, I[12] || 0];
    wk[21] = I[21] || 0; wk[22] = I[22] || 0;   // 手首は待機と同じ
    return wk;
  }
  return IDL.map((v, i) => (i ? v : v + Math.sin(fr * 0.1) * 0.03));
}

// ---- 結果画面 ----
//  勝敗 / 両者のキャラ(勝者は立ち姿、敗者は倒れた姿) / 試合の詳細(自分と相手を並べて表示) / リプレイの保存 / 次の行き先
function drawResult() {
  const R_ = RESULT, wA = R_.win, watch = R_.mode === 'watch', wc = (wA ? CH[R_.A.ci] : CH[R_.B.ci]).col || '#fd0';
  // 背景(対戦の背景とは別)
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, '#0b0f24');
  gr.addColorStop(1, '#1b1030');
  g.fillStyle = gr;
  g.fillRect(0, 0, W, H);
  g.save();
  g.globalAlpha = 0.16;
  g.fillStyle = wc;
  g.beginPath();                                                       // 勝った側に光の帯
  if (wA) { g.moveTo(0, 0); g.lineTo(330, 0); g.lineTo(180, H); g.lineTo(0, H); }
  else { g.moveTo(W, 0); g.lineTo(W - 330, 0); g.lineTo(W - 180, H); g.lineTo(W, H); }
  g.fill();
  g.globalAlpha = 0.05;
  g.fillStyle = '#fff';
  for (let i = 0; i < 9; i++) g.fillRect(((i * 130 + fr * 0.5) % (W + 130)) - 130, 0, 26, H);
  g.restore();
  // 勝敗
  const head = watch ? (wA ? '左' : '右') + 'の勝ち' : wA ? 'YOU WIN!' : 'YOU LOSE...';
  T(head, W / 2, 62, 46, wA || watch ? '#fd0' : '#8ab');
  T(res, W / 2, 96, 16, '#cde');
  // キャラ(左=自分 / 右=相手)
  for (const [side, x, f] of [['A', 128, 1], ['B', W - 128, -1]]) {
    const r = R_[side], won = side === 'A' ? wA : !wA;
    if (r.ci < 0) continue;
    const p = F(r.ci, r.sk || 0, x, f);           // 地面(GY)に立たせて描き、画面の上へずらす(空中扱いにしない)
    if (!won) Object.assign(p, { st: 'ko', t: 999, koLand: 1, koK0: 0, dn: false });
    g.save();
    g.translate(0, 350 - GY);
    if (!won) g.globalAlpha = 0.75;
    drawF(p);
    g.restore();
    T(won ? 'WINNER' : 'LOSER', x, 140, won ? 26 : 20, won ? '#fd0' : '#99a');
    T((watch ? (side === 'A' ? '左' : '右') : side === 'A' ? '自分' : '相手') + ': ' + r.name, x, 386, 17, side === 'A' ? '#bdf' : '#fbb');
    if (side === 'A' && !watch && typeof pfTitleName === 'function' && pfTitleName()) T('「' + pfTitleName() + '」', x, 422, 12, '#fd9'); // 装備中の称号
    const lv = side === 'A' ? R_.lvA : R_.lvB;
    T('体力 ' + Math.ceil(r.hp) + ' / ' + r.hpMax + (lv != null ? '   CPU Lv' + lv : ''), x, 406, 12, '#aab');
  }
  // 詳細(自分と相手を並べる)。良いほうを金色に
  const x0 = 270, x1 = 690, cA = 545, cB = 645, rate = (a, b) => (b ? Math.round((a / b) * 100) + '%' : '—');
  const rows = [
    ['与えたダメージ', R_.A.dealt, R_.B.dealt, 1],
    ['受けたダメージ', R_.A.taken, R_.B.taken, -1],
    ['最大コンボ', R_.A.maxCombo + ' HIT', R_.B.maxCombo + ' HIT', 1, R_.A.maxCombo, R_.B.maxCombo],
    ['最大コンボダメージ', R_.A.maxComboDmg, R_.B.maxComboDmg, 1],
    ['ジャスガ率', rate(R_.A.jg, R_.A.guarded), rate(R_.B.jg, R_.B.guarded), 1, R_.A.guarded ? R_.A.jg / R_.A.guarded : -1, R_.B.guarded ? R_.B.jg / R_.B.guarded : -1, R_.A.jg + ' / ' + R_.A.guarded, R_.B.jg + ' / ' + R_.B.guarded],
    ['攻撃命中率', rate(R_.A.hit, R_.A.att), rate(R_.B.hit, R_.B.att), 1, R_.A.att ? R_.A.hit / R_.A.att : -1, R_.B.att ? R_.B.hit / R_.B.att : -1, R_.A.hit + ' / ' + R_.A.att, R_.B.hit + ' / ' + R_.B.att],
  ];
  g.fillStyle = '#0008';
  g.fillRect(x0 - 10, 122, x1 - x0 + 20, 40 + rows.length * 38 + 26);
  T('試合の詳細', x0, 145, 17, '#fd0', 'left');
  T(watch ? '左' : '自分', cA, 145, 15, '#bdf');
  T(watch ? '右' : '相手', cB, 145, 15, '#fbb');
  rows.forEach(([nm, a, b, better, va = a, vb = b, sa, sb], i) => {
    const y = 186 + i * 38;
    g.fillStyle = i % 2 ? '#ffffff08' : '#ffffff12';
    g.fillRect(x0 - 4, y - 22, x1 - x0 + 8, 34);
    T(nm, x0 + 4, y, 15, '#ddd', 'left');
    const ga = va * better > vb * better, gb = vb * better > va * better;
    T(String(a), cA, y, 18, ga ? '#fd0' : '#fff');
    T(String(b), cB, y, 18, gb ? '#fd0' : '#fff');
    if (sa) { T(sa, cA, y + 11, 9, '#99a'); T(sb, cB, y + 11, 9, '#99a'); }
  });
  T('試合時間 ' + ((R_.time / 3600) | 0) + ':' + String(((R_.time / 60) % 60) | 0).padStart(2, '0'), x0 + 4, 186 + rows.length * 38, 13, '#aab', 'left');
  // リプレイの保存 → 次の行き先
  if (!rpDrawResult(440)) {
    ['キャラクター選択へ', 'メニューへ'].forEach((s2, i) => {
      const on = resSel === i, x = W / 2 + (i ? 120 : -120);
      if (on) { g.fillStyle = '#fd03'; g.fillRect(x - 105, 456, 210, 34); }
      T(s2, x, 480, on ? 19 : 17, on ? '#fd0' : '#ccc');
    });
    T('←→ 選択 / Enter 決定', W / 2, 508, 13, '#aaa');
  }
  T('命中率 = 当たった技 ÷ 出した技(投げは除く・ガードされた技は外れ) / ジャスガ率 = ジャストガード ÷ シールドで受けた攻撃', W / 2, 530, 11, '#889');
}

// SP ゲージの表示: ゲージ技・超必殺技に必要な量の目盛り / 足りると明るく、超必殺技が出せると金色に光る
function spBar(p, x, right) {
  const S_ = spOf(p), w = 250, h = 10, y = 74, mx = S_.max, v = p.sg || 0, gx = p.ch.mv.gx, sx = p.ch.mv.sx,
    x0 = right ? x - w : x, full = sx && v >= sx.cost, can = gx && v >= gx.cost;
  g.fillStyle = '#000a';
  g.fillRect(x0 - 2, y - 2, w + 4, h + 4);
  g.fillStyle = '#223';
  g.fillRect(x0, y, w, h);
  const ww = w * Math.min(1, v / mx);
  g.fillStyle = full ? (fr % 16 < 8 ? '#ffe36b' : '#fff6c0') : can ? S_.color : '#2a5a7a';
  g.fillRect(right ? x0 + w - ww : x0, y, ww, h);
  g.fillStyle = '#fff8';                                             // 目盛り: ゲージ技の消費量ごと・超必殺技の量
  if (gx) for (let c = gx.cost; c < mx - 0.01; c += gx.cost) { const tx = right ? x0 + w - (w * c) / mx : x0 + (w * c) / mx; g.fillRect(tx - 0.5, y, 1, h); }
  if (sx && sx.cost < mx) { const tx = right ? x0 + w - (w * sx.cost) / mx : x0 + (w * sx.cost) / mx; g.fillStyle = '#fd0'; g.fillRect(tx - 1, y - 2, 2, h + 4); }
  T('SP ' + Math.floor(v) + (full ? '  SUPER!' : ''), right ? x0 - 6 : x0 + w + 6, y + 9, 11, full ? '#fd0' : can ? '#9df' : '#789', right ? 'right' : 'left');
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

function menu(a, y = 190, step = 50) {
  a.forEach((s, i) =>
    T(
      (i == sel ? '▶ ' : '') + s,
      W / 2,
      y + i * step,
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
  if (rpDrawScene()) return; // 戦績・リプレイ一覧などの画面(replay.js)
  if (typeof pfDrawScene === 'function' && pfDrawScene()) return; // プロフィール・実績・称号の画面(profile.js)
  if (typeof uiScene === 'function' && uiScene()) return; // タイトル・メニュー・キャラ選択など(ui.js)
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
    menu(MN, 134, 40);
    T(
      'コイン: ' + save.coin + '   RP: ' + save.rp + '   ' + save.w + '勝' + save.l + '敗',
      W / 2,
      480,
      22,
      '#9cf'
    );
    T('↑↓ 選択 / Enter 決定 / Esc 戻る', W / 2, 515, 16, '#aaa');
  } else if (sc === 'set') {
    dark('設定');
    const x0 = 250, y0 = 96, rh = 19;   // 行が多いので詰める(キー配置 12行 + 設定 7行)
    T('キー配置', x0, y0, 18, '#9cf', 'left');
    T('メイン', 560, y0, 15, '#9cf', 'center');
    T('サブ', 700, y0, 15, '#9cf', 'center');
    KEY_ACTIONS.forEach(([a, nm], i) => {
      const y = y0 + 28 + i * rh, on = sel === i;
      T((on ? '▶ ' : '') + nm, x0, y, on ? 19 : 17, on ? '#fd0' : '#ddd', 'left');
      for (const sl of [0, 1]) {
        const cx = sl ? 700 : 560, act = on && setSlot === sl;
        if (act) {
          g.fillStyle = setWait ? '#a33' : '#fd03';
          g.fillRect(cx - 60, y - 18, 120, 24);
        }
        T(act && setWait ? 'キーを押す…' : keyName(save.keys[a][sl]), cx, y, 17, act ? '#fff' : '#bbb');
      }
    });
    const rows = [
      '簡単コマンド(途中の斜めを省略): ' + (save.cfg.easyCmd ? 'ON' : 'OFF'),
      'ヒット時の画面の揺れ: ' + (save.cfg.shake ? 'ON' : 'OFF'),
      '対戦中の操作説明: ' + (save.cfg.help ? 'ON' : 'OFF'),
      '画質: ◀ ' + qualityOf()[1] + ' ▶',
      'フレームレート: ◀ ' + fpsOf()[1] + ' ▶',
      '初期値に戻す',
      '戻る',
    ];
    rows.forEach((t, j) => {
      const i = KEY_ACTIONS.length + j, y = y0 + 40 + i * rh, on = sel === i;
      T((on ? '▶ ' : '') + t, x0, y, on ? 19 : 17, on ? '#fd0' : '#ddd', 'left');
    });
    T(msg, W / 2, 508, 15, '#9f9');
    T(setWait ? '割り当てるキーを押してください(Esc で取り消し)' : '↑↓ 選択 / ←→ メイン・サブ / Enter 変更 / BS サブを消す / Esc 戻る', W / 2, 520, 15, '#aaa');
  } else if (sc === 'off') {
    dark('オフライン');
    menu(OF);
  } else if (sc === 'onl') {
    dark('オンライン');
    menu(ON);
    T('サーバーにつないで、ほかのプレイヤーと対戦します', W / 2, 500, 16, '#aaa');
  } else if (sc === 'wcfg') {
    dark('CPU観戦');
    const cn = (c) => (c >= CH.length ? 'ランダム' : CH[c].nm);
    menu(
      [
        '左のキャラ: ◀ ' + cn(opt.wa) + ' ▶',
        '左のレベル: ◀ ' + opt.wla + ' ▶',
        '右のキャラ: ◀ ' + cn(opt.wb) + ' ▶',
        '右のレベル: ◀ ' + opt.wlb + ' ▶',
        'ステージ: ◀ ' + ST[opt.st].nm + '(' + ST[opt.st].env + ') ▶',
        '速さ: ◀ ×' + (opt.wspd || 1) + ' ▶',
        '観戦スタート',
      ],
      130
    );
    for (const [c, x, f] of [[opt.wa, 110, 1], [opt.wb, W - 110, -1]]) {
      if (c >= CH.length) {
        T('?', x, 380, 90, '#fff6');
        continue;
      }
      const p = F(c, 0, x, f);
      p.y = 470;
      drawF(p);
    }
    T('↑↓ 選択 / ←→ 変更 / Enter 決定 / Esc 戻る', W / 2, 520, 15, '#aaa');
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
      ];
    if (opt.mode === 'cpu') rows.push('相手: ◀ ' + cfgOppName() + ' ▶');
    rows.push('ステージ: ◀ ' + ST[opt.st].nm + '(' + ST[opt.st].env + ') ▶');
    if (tr) rows.push('CPUレベル: ◀ ' + (opt.lv || '棒立ち') + ' ▶');
    rows.push('START');
    menu(rows, 180);
    const p = F(opt.ch, save.sk[opt.ch] || 0, W / 2, 1);
    p.y = 470;
    drawF(p);
    if (opt.mode === 'train')
      T('戦闘中: Esc でポーズメニュー(キャラ・相手の行動・表示の切り替え) / R リセット', W / 2, 520, 16, '#aaa');
  } else if (sc === 'match' && NET.on) {
    netDrawMatch();   // オンライン: マッチングの画面(net.js)
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
    cvDraw(); // キャラクター画面(スキン・技の詳しい情報)
  } else if (sc === 'shop') {
    dark('ショップ');
    T('所持コイン: ' + save.coin, W / 2, 105, 22, '#fd0');
    const rows = ['コインを購入 +500 (課金・デモ)'];
    CH.forEach((c, ci) => {
      for (let s = 1; s < 4; s++)
        rows.push(
          c.nm +
            '「' +
            skinName(ci, s) +
            '」 ' +
            (save.own[ci + '_' + s] ? '[所持済]' : SK[s].p + 'コイン')
        );
    });
    // 選んでいるスキンの試着(左)。コインの行ではそのキャラのノーマル
    const pci = sel > 0 ? ((sel - 1) / 3) | 0 : 0, psk = sel > 0 ? ((sel - 1) % 3) + 1 : 0;
    if (typeof drawFighterAt === 'function') {
      const b2 = Math.sin(fr * 0.05) * 2;
      drawFighterAt(pci, psk, 190, 470 + b2, 1.9, 1);
      T(CH[pci].nm + (psk ? ' 「' + skinName(pci, psk) + '」' : ''), 190, 500, 16, '#fd0');
    }
    const o0 = Math.max(0, Math.min(rows.length - 10, sel - 4));
    rows.slice(o0, o0 + 10).forEach((s, j) => {
      const i = o0 + j;
      T(
        (i == sel ? '▶ ' : '') + s,
        620,
        150 + j * 34,
        i == sel ? 22 : 18,
        i == sel ? '#fd0' : '#ccc'
      );
    });
    T(msg, 620, 515, 17, '#9f9');
  } else if (sc === 'result' && RESULT) {
    drawResult(); // 結果画面(専用の背景)
  } else if (sc === 'fight' || sc === 'result') {
    const S = ST[opt.st];
    // 画面の揺れ: ヒットストップ中の揺れ + エフェクトの部品 shake。背景・キャラ・エフェクトを同じだけずらす(HUD は揺らさない)
    let shx = 0, shy = 0;
    if (save.cfg.shake) {
      if (hs > 0 && !(A.sflash > 0 || B.sflash > 0)) { shx += (R() - 0.5) * 8; shy += (R() - 0.5) * 8; } // 設定で揺れを切れる(超必殺技の暗転中は揺らさない)
      if (shakeT > 0) { shx += (R() - 0.5) * shakeP * 2; shy += (R() - 0.5) * shakeP * 2; }
    }
    g.save();
    g.translate(shx, shy);
    bg(opt.st);
    if (typeof drawSuperDark === 'function') drawSuperDark(); // 超必殺技の暗転(effect.js)
    if (typeof drawRageAura === 'function') drawRageAura(); // 狂化のオーラ(バーサク。effect.js)
    if (typeof drawAquaVeil === 'function') drawAquaVeil('back'); // 水まといの水の玉(体の奥側。effect.js)
    if (typeof drawPuppets === 'function') drawPuppets('body'); // パペット(ロロ)の体(puppet.js)
    drawF(B);
    drawF(A);
    if (typeof drawPuppets === 'function') drawPuppets('string'); // 操り糸(キャラの手からパペットへ)
    PJ.forEach(drawProjectile); // 弾の絵(projectile.js)
    if (opt.mode === 'train') trainingDrawWorld(); // 食らい判定・攻撃判定(training.js)
    PT.forEach((q) => {
      g.globalAlpha = q.t / q.l;
      g.fillStyle = q.c;
      g.beginPath();
      g.arc(q.x, q.y, (3 + q.t / 6) * (q.s ?? 1), 0, 7);
      g.fill();
    });
    g.globalAlpha = 1;
    g.restore();
    if (typeof uiFightHUD !== 'function') [A, B].forEach((p) => {        // (ui.js があれば、コンボ数は画面の端に出す)
      if (p.cbT > 0 && p.cbn > 1) T(p.cbn + ' HIT!', p.x, p.y - 175, 28, '#fd0');
    });
    g.save();
    g.translate(shx, shy);                                             // エフェクトも画面といっしょに揺らす
    drawEffects(); // 炎の火の粉 + エフェクト(effect.js)
    g.restore();
    if (typeof drawSuperCutin === 'function') drawSuperCutin(); // 超必殺技のカットイン(effect.js)
    if (typeof uiFightHUD === 'function') uiFightHUD(S); // 対戦画面の HUD(体力・シールド・SP ゲージ・名前・コンボ。ui.js)
    else {
      bar(30, 20, 380, A.hp, A.ch.hp, '#4d4');
      bar(550, 20, 380, B.hp, B.ch.hp, '#e55', 1);
      bar(30, 48, 150, A.sh, A.ch.shm || 60, '#6cf');
      bar(780, 48, 150, B.sh, B.ch.shm || 60, '#6cf', 1);
      // ボルテージのゲージ(持っているキャラだけ。MAX で点滅)
      for (const [p, x, rr] of [[A, 190, 0], [B, 650, 1]]) {
        const V = p.ch.vt;
        if (!V) continue;
        const full = p.volt >= V.max;
        bar(x, 48, 120, p.volt || 0, V.max, full && fr % 20 < 10 ? '#fff' : V.color, rr);
        T('VOLT', rr ? x + 116 : x + 4, 64, 12, '#222', rr ? 'right' : 'left');
      }
      spBar(A, 30, 0);                                   // SP ゲージ(ゲージ技・超必殺技)
      spBar(B, 930, 1);
      T(A.ch.nm + ' ' + Math.ceil(A.hp), 30, 106, 18, '#fff', 'left');
      T(B.ch.nm + ' ' + Math.ceil(B.hp), 930, 106, 18, '#fff', 'right');
      T(S.nm + ' [' + S.env + ']', W / 2, 40, 18, '#fff');
    }
    if (opt.mode === 'train') trainingDrawHUD(); // 入力履歴・フレーム情報(training.js)
    if (opt.mode === 'watch' && !rpPlaying() && typeof uiFightHUD !== 'function') {
      T('CPU観戦  Lv' + opt.wla + ' vs Lv' + opt.wlb + (opt.wspd > 1 ? '  ×' + opt.wspd : '') + '   Esc で終了', W / 2, 70, 16, '#9df');
    }
    if (save.cfg.help && opt.mode !== 'watch' && !rpPlaying() && typeof uiFightHUD !== 'function') {
      const kn = (a) => save.keys[a].map(keyName).join('/');
      T(
        kn('left') + kn('right') + '移動(2回でダッシュ) ' + kn('down') + 'しゃがみ ' + kn('attack') + '攻撃 ' + kn('special') + '必殺 ' +
          kn('throw') + '投げ ' + kn('shield') + '防御 ' + kn('jump') + 'ジャンプ ' + kn('airParry') + '空中受け流し  (設定で変更可)',
        W / 2,
        H - 10,
        13,
        '#fff9'
      );
    }
    if (typeof uiFightOverlay === 'function') uiFightOverlay(); // READY / FIGHT! / K.O. の演出(ui.js)
    else {
      if (ko > 0 && sc === 'fight') T('K.O.!', W / 2, 250, 100, '#f55');
      if (cd > 0 && sc === 'fight') T(cd > 30 ? 'READY' : 'FIGHT!', W / 2, 240, 64, '#fd0');
    }
    if (sc === 'result') {
      g.fillStyle = '#000a';
      g.fillRect(0, 0, W, H);
      T(res, W / 2, 260, 44, '#fd0');
      if (!rpDrawResult()) T('Enter で戻る', W / 2, 330, 20); // リプレイを保存するかの確認(replay.js)
    }
    if (opt.mode === 'train' && sc === 'fight') trainingDrawPause(); // ポーズメニュー(training.js)
    if (NET.on) netDrawHUD(); // オンライン: 通信待ち・同期ずれ(net.js)
    if (sc === 'fight' && rpPlaying()) rpDrawHUD(); // リプレイの操作バー・フレーム表(replay.js)
  }
}

// ---- 画面の大きさに合わせる ----
//  canvas の見た目の大きさは style.css が画面に合わせて決める(16:9 のまま、入るいちばん大きいサイズ)。
//  ここでは中の絵の細かさ(canvas の画素数)を「見た目の大きさ × 画質の倍率」に合わせ、
//  毎フレーム拡大の倍率をかけてから描く。ゲームの座標はいつも W × H (960 × 540) のままなので、ほかの処理は変わらない。
//  画質は設定画面で選ぶ(save.cfg.quality)。[id, 表示名, 倍率]。倍率 = 見た目の 1px あたりの画素数
//    'dpr' は画面の細かさ(devicePixelRatio。Retina なら 2〜3)に合わせる。数字の後ろの上限まで
//    低いほど軽く(少しぼやける)、高いほどくっきり(重い)
const QUALITY = [
  ['low', '低(軽い)', 0.6],
  ['mid', '中', 1],
  ['high', '高', ['dpr', 2]],
  ['max', '最高(重い)', ['dpr', 3]],
];
const qualityOf = () => QUALITY.find((q) => q[0] === (save.cfg && save.cfg.quality)) || QUALITY[2];
function fitCanvas() {
  const r = cv.getBoundingClientRect();
  if (!r.width) return;
  const qv = qualityOf()[2],
    k = Array.isArray(qv) ? Math.min(qv[1], window.devicePixelRatio || 1) : qv,
    w = Math.max(W / 4, Math.round(r.width * k)), h = Math.round((w * H) / W);
  if (cv.width !== w || cv.height !== h) {
    cv.width = w;                                  // 大きさを変えると canvas の中身と設定は消える(毎フレーム描き直すので問題ない)
    cv.height = h;
  }
}
addEventListener('resize', fitCanvas);
addEventListener('orientationchange', () => setTimeout(fitCanvas, 200));
fitCanvas();

// ---- フレームレート(描く回数) ----
//  ゲームの処理(upd)はいつも 1秒に60回(1F = 1/60秒)。変えられるのは「画面を描く回数」だけ。
//  → 30fps にしても技の発生F・当たり判定・CPU は60fpsと同じ(重い端末で描く手間だけ半分になる)。
//    オンライン対戦でも、相手と自分で描く回数が違ってもゲームの進み方はそろう(入力と upd の回数だけで決まる)。
//  [id, 表示名, 1秒に描く回数]。60 より多くしても upd が60回なので、絵は増えない(同じ絵を描き直すだけ)
const FPS_LIST = [
  [30, '30fps(軽い)', 30],
  [60, '60fps', 60],
];
const fpsOf = () => FPS_LIST.find((q) => q[0] === (save.cfg && save.cfg.fps)) || FPS_LIST[1];
let lastDraw = -1e9;

let last = 0,
  acc = 0,
  prKeep = null; // ヒットストップ中の先行入力
function loop(t) {
  if (typeof rpTick !== 'function') return requestAnimationFrame(loop); // replay.js の読み込みを待つ
  acc += Math.min(100, t - last);
  last = t;
  while (acc >= 16.67) {
    const rep = sc === 'fight' && opt.mode === 'watch' ? opt.wspd || 1 : 1; // 観戦の早送り
    if (rpPlaying()) rpTick(); // リプレイ: 再生速度・一時停止・場面の移動(replay.js)
    else for (let k = 0; k < rep; k++) upd();
    pr = prKeep || {};
    prKeep = null;
    acc -= 16.67;
  }
  // 描くのは、設定したフレームレートの間隔がたったときだけ(ゲームの処理は上で、時間どおりに60回/秒進んでいる)
  const gap = 1000 / fpsOf()[2];
  if (t - lastDraw >= gap - 3) {                     // 3ms の余裕(画面の更新のゆらぎで1回飛ばさないように)
    lastDraw = t - lastDraw < gap * 2 ? lastDraw + gap : t;   // 間隔をためて、平均がちょうど設定の回数になるように
    if (lastDraw > t) lastDraw = t;
    fitCanvas();
    g.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);   // ゲームの座標(W × H)→ canvas の画素へ拡大
    g.imageSmoothingEnabled = true;
    inDraw = true;                                   // 描く間は見た目用の乱数(ゲームの乱数を減らさない)
    if (typeof uiFrameStart === 'function') uiFrameStart(); // クリックできる場所の登録を作り直す(ui.js)
    if (NET.on) netVisApply();                       // オンライン: 予想が外れた位置のずれを、見た目だけなめらかに(net.js)
    try { draw(); if (typeof pfOverlay === 'function') pfOverlay(); } finally { inDraw = false; if (NET.on) netVisRevert(); } // pfOverlay: 実績解除の通知(profile.js)
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame((t) => {
  last = t;
  loop(t);
});
