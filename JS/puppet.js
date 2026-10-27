// ============================================================
// puppet.js … パペット(本体とは別に動く人形)。メイ＆ロロのロロ
//   character.js の puppet: { ... } を書いたキャラが持つ。技の puppet: { ... } でロロの行動を決める
//   読み込み順: projectile.js のあと(index.html)。script.js から呼ぶ:
//     puppetOnMove(p, k, m) … 技を出した瞬間(begin)        puppetTick(p, o) … 毎F(ヒットストップ中は呼ばれない)
//     puppetShield(p, o, m) … 攻撃を受ける前(applyHit)     puppetAI(p, o, lv) … CPU の入力(ai)
//     drawPuppets(layer)    … 'body' キャラの絵の前 / 'string' キャラの絵の後(超必殺技の呪いの糸)
//
// ■ キャラの puppet(書かない項目は PUPPET_DEFAULT)
//   hp        … 耐久値。前にいて身代わりになるたびに、受けたダメージだけ減る。0 でクラッシュ
//   regen     … 1F に戻る耐久値(最後に受けてから regenWait F たってから)
//   crash     … クラッシュしてから再召喚されるまでの F   repair … クラッシュ中に本体が与えたダメージ1につき、復活が早まる F
//   delay     … 通常技(トレース)で、本体の技から遅れて動き出すまでの F
//   guard     … 本体からこの距離(px)以内で、攻撃してきた相手の側にいると身代わりになる
//   home      … 定位置(本体の前 home px)   drag … 定位置からこれ以上ずれると、すぐに自分で歩いて戻る(px)   walk … 歩く速さ(最大)
//   stay      … 相手の向こう側(挟み撃ちの位置)にいるときは、この F だけ待ってから戻る
//   ※ 定位置へついてくるのは「ついてくる状態」のときだけ。突進・飛びかかり・置き去り・罠・転移などで離れたあとは「離れた状態」になり、
//     定位置へは戻らず、本体がロロから離れていく分だけ同じ向きへ動く(間合いが広がらない。本体が近づくときはその場で待つ)。おいで(cmd: 'pull')・再召喚・本体と rejoin px 以内に近づく で「ついてくる状態」に戻る
//   jump / jumpDelay / airJumps … 本体がジャンプすると、jumpDelay F 遅れてロロも跳ぶ(跳ぶ速さ jump)。空中ジャンプにも airJumps 回までついてくる
//   backDmg   … 相手の背中側から当てたときのダメージの倍率(背後からの攻撃はガードできない = 挟み撃ち)
//   throw     … ロロのつかみ投げ { box, f, b, u, d }(方向は本体の投げの入力。f=本体の方へ投げる b=向こうへ u=真上 d=たたきつけ)
//   color / label … HUD の耐久値の色・名前
//
// ■ 技の puppet
//   cmd を書かない … トレース: 本体の技から delay F 遅れて、ロロがその場で攻撃する(下の「攻撃の項目」)
//   cmd: 'pull'    … 呼び寄せ: ロロが自分で走って本体の目の前へ来る(すでに目の前なら、少し前へ出る)
//   cmd: 'dash'    … 突進: 前へ speed で突っ込む。A を押している間だけ進む(最低 min F・最大 time F)。CPU は相手を通り抜けたら向こう側で止まる
//   cmd: 'leap'    … 飛びかかり: 斜め前へ大きく跳び(vx, vy)、落ちながら振り下ろす
//   cmd: 'stay'    … 置き去り: ロロはその場に残って攻撃する(本体は技の launch で下がる)
//   cmd: 'trap'    … 罠: その場で屈み、wait F の間に相手が range px まで近づくと足元を払う
//   cmd: 'bomb'    … 自爆: その場で綿をふくらませ、fuse F 後にはじけてまわりを吹き飛ばす。ロロの耐久が cost 減る(0 ならクラッシュ)
//   motion(ロロの動き): stab swipe spin rise low slam dash leap crouch cast grab lunge roll corkscrew snip plunge quake bomb   trail: true … 速い動きに残像を付ける
//   cmd: 'warp'    … 呪いの転移: ロロが相手の背後へ消えて現れ、攻撃する
//   cmd: 'yank'    … 糸繰り: ロロから相手へ糸を飛ばし、当たると相手をロロの方へ引き寄せる
//   cmd: 'string'  … 呪糸: ロロが相手の背後へ転移し、本体とロロを結ぶ糸の上の相手に何度も当たる(超必殺技)
//   ※ メイが技の後隙・着地の隙で動けない間に A を押すと、メイは動かずロロだけが s / sf / su / sb / sd の動きをする(pupSoloCommand)
//     Z を押すと、ロロだけがその技の連携攻撃を出す(pupSoloNormal)。こちらはロロが待機しているときだけ(ロロの後隙は消せない)
//   攻撃の項目: startup active recovery damage knockX knockY hitstun hitStop hits hitInterval box effect low spike motion(ロロの動き)
//               delay(本体の技から遅れて動き出す F。トレースの既定は キャラの delay)
//               air: { ... } … ロロが空中にいるときに出す空中攻撃(an / af / au / ad に書く。地上の技でロロが空中にいるときは n・b→an f・da→af u→au d→ad の air を使う)
//               dive: { x, y } … 発生の瞬間にロロをこの速さで動かす(空中から突っ込む)   airOnly: true … 着地したら攻撃をやめる
// ■ 技の curse(呪いの釘)
//   curse: { delay, box, damage, ... } … 技を出した瞬間の相手の足元に呪いの印を置き、delay F 後にそこへ当たる
// ============================================================

const PUPPET_DEFAULT = {
  hp: 60, regen: 0.06, regenWait: 90, crash: 360, delay: 8, guard: 115, drag: 50, walk: 5.5, home: 40, stay: 40, rejoin: 70, jump: -13.5, jumpDelay: 6, airJumps: 1, backDmg: 0.85, color: '#c49ae8', label: '人形',
  throw: {
    box: { x: 0, y: -80, w: 55, h: 80 },
    f: { damage: 9, vx: 9, vy: -7, hitstun: 28 }, b: { damage: 9, vx: 9, vy: -6, hitstun: 26 },
    u: { damage: 7, vx: 1, vy: -15, hitstun: 30 }, d: { damage: 10, vx: 2, vy: -6, hitstun: 30, spike: 4 },
  },
};

// ---- ロロの動き(姿勢)。lean=体の傾き armF/armB=手前・奥の腕(0=下 正=前) legF/legB=脚 head=首のかしげ sq=つぶれ(1=ふつう) hop=浮き(px) ----
const LOLO_POSES = {
  idle: { lean: 0.06, armF: 0.35, armB: -0.25, legF: 0.08, legB: -0.08, head: 0.3, sq: 1, hop: 0 },
  drag: { lean: -0.45, armF: -0.9, armB: -1.2, legF: 0.7, legB: 0.3, head: 0.65, sq: 1, hop: 4 },     // (未使用)後ろへ傾いた姿勢
  hit: { lean: -0.5, armF: -0.6, armB: -0.9, legF: 0.3, legB: -0.3, head: -0.4, sq: 0.92, hop: 0 },
  down: { lean: 1.45, armF: 1.2, armB: 0.6, legF: 0.4, legB: 0.1, head: 0.8, sq: 0.9, hop: 0 },
  rise: { lean: -0.15, armF: 2.4, armB: 2.0, legF: 0.7, legB: -0.5, head: -0.2, sq: 1.06, hop: 0 },    // 跳び上がり(両手を上げてぴょーんと)
  fall: { lean: 0.15, armF: 1.3, armB: 1.6, legF: -0.3, legB: 0.4, head: 0.45, sq: 1, hop: 0 },     // 落ちる(手足がぶらんと浮く)
};
const LOLO_MOTIONS = {
  stab: { w: { lean: -0.25, armF: -0.4, armB: 0.2, legF: 0.3, legB: -0.3, head: 0.1 }, s: { lean: 0.4, armF: 1.55, armB: -0.4, legF: 0.5, legB: -0.4, head: -0.1 } },        // 針で突く
  swipe: { w: { lean: -0.3, armF: -1.3, armB: 0.6, head: 0.4 }, s: { lean: 0.45, armF: 2.1, armB: -0.6, legF: 0.4, legB: -0.3, head: -0.2 } },                           // 腕を振り回してひっかく
  spin: { w: { lean: 0.2, armF: 1.5, armB: -1.5, head: 0.2 }, s: { lean: 0.1, armF: 1.6, armB: -1.6, head: 0.2, spin: 1 } },                                          // くるっと回る(前後に当たる)
  rise: { w: { lean: 0.3, armF: 0.6, armB: 0.5, legF: 0.9, legB: -0.7, sq: 0.8 }, s: { lean: -0.35, armF: 2.9, armB: 2.4, legF: 0.2, legB: -0.2, sq: 1.08, hop: 22 } },  // 跳ね上がって突き上げる
  low: { w: { lean: 0.4, armF: 0.3, legF: 0.9, legB: -0.9, sq: 0.8 }, s: { lean: 0.65, armF: 1.3, armB: -0.5, legF: 1.5, legB: -0.6, sq: 0.72 } },                        // 低く足元を払う
  slam: { w: { lean: -0.3, armF: 2.8, armB: 2.6, head: -0.2, hop: 6 }, s: { lean: 0.75, armF: 0.9, armB: 0.8, legF: 0.3, legB: -0.3, head: 0.2 } },                      // 振りかぶってたたきつける
  dash: { w: { lean: 0.5, armF: -0.8, armB: -1.0, legF: 0.9, legB: -0.8, head: 0.3 }, s: { lean: 0.85, armF: 1.6, armB: -1.2, legF: 1.1, legB: -0.9, head: 0.1, hop: 4 } }, // 前のめりに突っ込む
  leap: { w: { lean: 0.2, armF: 2.6, armB: 2.2, legF: 1.0, legB: -0.6, sq: 0.85 }, s: { lean: 0.6, armF: 1.0, armB: 0.8, legF: 0.4, legB: -0.5, head: 0.2 } },           // 跳びかかって振り下ろす
  crouch: { w: { lean: 0.5, armF: 0.4, armB: 0.2, legF: 1.3, legB: -1.0, head: 0.6, sq: 0.66 }, s: { lean: 0.55, armF: 0.6, armB: 0.3, legF: 1.3, legB: -1.0, head: 0.7, sq: 0.62 } }, // 罠: 屈んで待つ
  cast: { w: { lean: -0.1, armF: 2.0, armB: 1.6, head: -0.3 }, s: { lean: 0.2, armF: 1.6, armB: -1.2, head: 0.3 } },                                                       // 糸を投げる・転移
  grab: { w: { lean: 0.3, armF: 1.6, armB: 1.4 }, s: { lean: -0.2, armF: 2.9, armB: 2.8, legF: 0.3, legB: -0.3, hop: 4 } },                                                // つかんで持ち上げる
  // ---- 技ごとに見分けがつくように足した動き ----
  lunge: { w: { lean: -0.45, armF: -0.7, armB: 0.6, legF: 0.5, legB: -0.6, head: 0.2, sq: 0.9 }, s: { lean: 1.05, armF: 1.62, armB: -1.5, legF: 0.15, legB: -1.5, head: -0.35, hop: 8 } },   // 体ごと真横に伸びて、大針で長く突く
  roll: { w: { lean: 0.5, armF: 1.5, armB: 1.3, legF: 1.4, legB: 1.1, head: 0.6, sq: 0.78 }, s: { lean: 0.5, armF: 1.5, armB: 1.3, legF: 1.4, legB: 1.1, head: 0.6, sq: 0.78, hop: 10 }, roll: true },   // 丸まって転がる
  corkscrew: { w: { lean: 0.35, armF: 0.4, armB: 0.3, legF: 1.2, legB: -1.0, sq: 0.72 }, s: { lean: -0.1, armF: 3.0, armB: 2.8, legF: 0.1, legB: -0.1, head: -0.3, sq: 1.14, spin: 1, hop: 26 } },   // きりもみしながら真上へ
  snip: { w: { lean: -0.25, armF: -1.5, armB: 2.0, head: 0.4, sq: 0.95 }, s: { lean: 0.4, armF: 1.45, armB: 1.45, legF: 0.4, legB: -0.4, head: -0.25 } },   // 両腕を大きく開いて、ハサミのように閉じる
  plunge: { w: { lean: -0.3, armF: 3.05, armB: 2.4, legF: 0.3, legB: -0.2, head: -0.3, hop: 12 }, s: { lean: 0.55, armF: 0.25, armB: 0.7, legF: 0.7, legB: -0.7, head: 0.3, sq: 0.86 } },   // 跳んで、大針を地面へ突き刺す
  quake: { w: { lean: -0.15, armF: 2.8, armB: 2.6, legF: 0.9, legB: -0.9, head: -0.2, sq: 1.05, hop: 16 }, s: { lean: 0.35, armF: 0.6, armB: 0.5, legF: 1.0, legB: -1.0, head: 0.5, sq: 0.74 } },   // 跳び上がって、両足で地面を踏み鳴らす
  bomb: { w: { lean: 0, armF: 0.6, armB: 0.5, legF: 0.3, legB: -0.3, head: 0.1, sq: 1.0 }, s: { lean: -0.05, armF: 1.9, armB: 1.8, legF: 0.7, legB: -0.7, head: -0.4, sq: 1.32 } },   // 綿がふくらんで、はじける
};

const pupOf = (p) => (p && p.ch && p.ch.pupRaw ? p.pup || puppetInit(p) : null);
function puppetInit(p) {
  const S = p.ch.pupRaw;
  p.pup = { x: Math.max(30, Math.min(W - 30, p.x + p.f * 55)), y: GY, vx: 0, vy: 0, f: p.f, st: 'idle', t: 0, hp: S.hp, crashT: 0, lastHit: -999,
    act: null, grab: null, shake: 0, fade: 1, jolt: 0, pose: { ...LOLO_POSES.idle }, curses: [], free: false, mayX: p.x };
  return p.pup;
}
// 技の puppet を、当たり判定の処理(applyHit)で使える形にする(buildMove と同じ)。一度作ったら覚えておく
function pupMove(spec, key) {
  if (spec._m) return spec._m;
  const B = spec.box || { x: 0, y: 0, w: 0, h: 0 };
  const m = buildMove({ motions: {} }, key || 'pup', { motion: 'jab', ...spec, box: B });
  m.k = key || 'pup';
  m.low = spec.low;
  return (spec._m = m);
}

// ---- 技を出した瞬間(script.js の begin から) ----
function puppetOnMove(p, k, m) {
  const P = pupOf(p);
  if (m && m.curse) castCurse(p, m);
  if (P && m && m.pup && m.pup.revive && P.st === 'crash') {           // revive: クラッシュ中でも、その場で呼び戻す(超必殺技)
    Object.assign(P, { st: 'idle', x: Math.max(30, Math.min(W - 30, p.x + p.f * 55)), y: GY, vx: 0, vy: 0, hp: p.ch.pupRaw.hp * 0.5, fade: 0.2, act: null, crashT: 0, free: false });
  }
  if (!P || !m || !m.pup || P.st === 'crash' || P.grab || p.st === 'ko') return;
  const S = p.ch.pupRaw, o = p === A ? B : A;
  let U = m.pup, key = 'pup_' + k;
  if (!U.cmd && P.y < GY - 8) {                                        // ロロが空中にいる: 空中攻撃(air)を出す。無い技なら出さない
    const ak = { n: 'an', b: 'an', f: 'af', da: 'af', u: 'au', d: 'ad', an: 'an', af: 'af', au: 'au', ad: 'ad' }[k], am = ak && p.ch.mv[ak];
    if (!am || !am.pup || !am.pup.air) return;
    U = am.pup.air; key = 'pup_air_' + ak;
  }
  const cmd = U.cmd || 'trace';
  const delay = U.delay ?? (cmd === 'trace' ? (U === m.pup ? S.delay : 4) : 0);   // 空中攻撃は落ちてしまう前に出す(遅れ 4F)
  P.act = { cmd, U, m: U.damage != null || U.box ? pupMove(U, key) : null, t: -delay, hitN: 0, hitT: 0, k, dir: p.f, done: false };
  const A_ = P.act;
  if (cmd === 'pull') P.free = false;                                 // おいで: ついてくる状態に戻る
  else if (['dash', 'leap', 'stay', 'trap', 'warp', 'string', 'bomb'].includes(cmd)) P.free = true;   // 離れた状態(定位置へ戻らない)
  if (cmd === 'dash') A_.cpuHold = p.humanIn ? null : (U.min ?? 6) + Math.floor(R() * ((U.time ?? 40) - (U.min ?? 6)));   // CPU・ダミーは長押しの長さをランダムに決める
  if (cmd === 'pull') {                                              // おいで: 定位置(前 home px)へ走ってくる。すでに近ければ前(push px)へ出て、しばらくそこを定位置にする
    const near = p.x + p.f * (S.home ?? 40), far = p.x + p.f * (U.push ?? 115), push = Math.abs(P.x - near) < 40;
    A_.target = push ? far : near;
    P.homeOff = push ? (U.push ?? 115) : 0;
    P.homeOffT = push ? (U.hold ?? 150) : 0;
    A_.t = 0;
    puppetFx(p, P, [{ type: 'lines', at: 'body', count: 3, length: 60 }]);
  }
  if (cmd === 'warp' || cmd === 'string') A_.t = -(U.delay ?? 4);
  if (cmd === 'trap') A_.wait = U.wait ?? 240;
  if (cmd === 'dash') { A_.dir = Math.sign(o.x - P.x) || p.f; P.f = A_.dir; }
  if (cmd === 'leap') { A_.dir = Math.sign(o.x - P.x) || p.f; P.f = A_.dir; }
}
// ロロの場所に、技のエフェクトの部品を出す
function puppetFx(p, P, layers, phase = 'attack', hx, hy) {
  if (typeof spawnEffect !== 'function') return;
  spawnEffect({ x: P.x, y: P.y, f: P.f }, { k: 'pupfx', rx: 0, rw: 40, ry: -60, rh: 50, fx: { color: p.ch.pupRaw.color, color2: '#ffffff', [phase]: layers } }, phase, hx, hy);
}

// ---- 毎F ----
function puppetTick(p, o) {
  const P = pupOf(p);
  if (!P) return;
  const S = p.ch.pupRaw;
  P.t++;
  if (P.shake > 0) P.shake--;
  if (P.jolt > 0) P.jolt--;
  tickCurses(p, o, P);
  if (p.st === 'ko') {                                                // 本体が倒れたら、力が抜けて崩れ落ちる
    if (P.grab) releasePupGrab(p, o, P, true);
    if (P.st !== 'crash') P.st = 'down';
    P.act = null;
    pupPhysics(P);
    return;
  }
  if (P.st === 'crash') {                                            // クラッシュ中: 消えて、時間がたつと本体の前に戻る
    if (o && P.oHp != null && o.hp < P.oHp) P.crashT -= (P.oHp - o.hp) * (S.repair ?? 0);   // 本体が相手にダメージを与えると、復活が早まる(ダメージ×repair F)
    if (o) P.oHp = o.hp;
    if (--P.crashT <= 0) {
      Object.assign(P, { st: 'idle', x: Math.max(30, Math.min(W - 30, p.x + p.f * 55)), y: GY, vx: 0, vy: 0, hp: S.hp * 0.6, fade: 0, act: null, free: false });
      puppetFx(p, P, [{ type: 'sigil', at: 'feet', r: 46, flat: true, duration: 24 }, { type: 'particles', at: 'body', count: 12, dir: 'up', speed: 3, gravity: -0.03, life: 26 }]);
      fx.push({ k: 'txt', text: '再召喚', x: P.x, y: P.y - 100, t: 30, l: 30, c: S.color, s: 16 });
    }
    return;
  }
  if (P.fade < 1) P.fade = Math.min(1, P.fade + 0.08);
  if (P.st === 'down') P.st = 'idle';
  if (fr - P.lastHit > S.regenWait) P.hp = Math.min(S.hp, P.hp + S.regen);
  pupJumpWatch(p, P, S);
  pupSoloCommand(p, o, P);
  if (P.grab) { pupGrabTick(p, o, P, S); pupPhysics(P); return; }
  pupTryGrab(p, o, P, S);
  if (P.grab) return;
  P.walkV = 0;
  if (P.act) pupAct(p, o, P, S);
  else pupIdle(p, o, P, S);
  pupPhysics(P);
  P.mayX = p.x;                                                        // 本体の位置(離れた状態で、本体が動いた分だけ動く)
}
function pupPhysics(P) {
  if (P.y < GY || P.vy < 0) P.vy += 0.75;
  P.x += P.vx;
  P.y += P.vy;
  if (P.y >= GY) { P.y = GY; P.vy = 0; }
  P.x = Math.max(24, Math.min(W - 24, P.x));
}
// 歩きの緩急: 30F で1回、速く進む → ゆるむ をくり返す(ぬいぐるみが、ちょこちょこっと進んではゆるむ)。速さはなめらかに変わる
function pupPace(P) {
  const c = (P.paceT = ((P.paceT || 0) + 1) % 30);
  return 0.85 + 0.45 * Math.sin((c / 30) * Math.PI * 2);
}
// 姿勢の緩急(イージング)
const PUP_EASE = {
  inOut: (u) => u * u * (3 - 2 * u),                                                 // ゆっくり → ゆっくり
  in3: (u) => u * u * u,                                                             // ためて、最後に一気に
  back: (u) => { const c = 2.2; return 1 + (c + 1) * (u - 1) ** 3 + c * (u - 1) ** 2; },   // 行きすぎて戻る(打ち出しのキレ)
};
// 何もしていないとき: メイの少し前(home px)が定位置。そこから drag px 以上ずれると、すぐに自分で歩いて戻る
//   相手の向こう側(挟み撃ちの位置)にいるときだけは、stay F の間その場で待ってから戻る
function pupIdle(p, o, P, S) {
  if (P.y >= GY) P.vx *= 0.6;
  if (P.free && Math.abs(P.x - p.x) < (S.rejoin ?? 70)) P.free = false;   // 離れた状態でも、メイと近づいたら自動でついてくる状態に戻る
  if (P.free) {                                                       // 離れた状態: 定位置へは戻らず、本体が離れていく分だけ同じ向きへ動く
    const dx0 = p.x - (P.mayX ?? p.x), away = Math.sign(P.x - (P.mayX ?? p.x)),
      dx = dx0 * away < 0 ? dx0 : 0;                                  // メイがロロから離れる向きに動いたときだけ付いていく(近づく向きなら、ロロは待つ → 近づける)
    P.x = Math.max(24, Math.min(W - 24, P.x + dx));
    P.walking = Math.abs(dx) > 0.4;
    P.walkV = dx;
    if (o) P.f = o.x >= P.x ? 1 : -1;
    return;
  }
  const side = o ? (Math.sign(o.x - p.x) || p.f) : p.f,
    off = P.homeOffT > 0 ? P.homeOff : (S.home ?? 40),                 // おいで で前へ出たあとは、しばらくそこが定位置
    home = Math.max(30, Math.min(W - 30, p.x + side * off)), d = home - P.x,
    behind = o && (P.x - o.x) * side > 0;                               // 相手の向こう側にいる
  P.idleT = (P.idleT || 0) + 1;
  if (P.homeOffT > 0) P.homeOffT--;
  if (P.y >= GY && (P.walking ? Math.abs(d) > 6 : Math.abs(d) > S.drag && (!behind || P.idleT > (S.stay ?? 40)))) {
    P.walking = true;
    const sp = Math.min(S.walk ?? 5.5, Math.abs(d) * 0.3 + 1.5);        // 遠いほど速く、近づくとゆるめる
    P.vx = Math.sign(d) * sp * pupPace(P);                              // 緩急: ちょこちょこっと速く進んでは、一瞬止まる
    P.f = Math.sign(d) || P.f;
    return;
  }
  P.walking = false;
  if (o) P.f = o.x >= P.x ? 1 : -1;
}
// メイが動けない間(技の後隙・着地の隙など)に A を押したら、メイは動かずロロだけが命令どおりに動く
//   前のFに A を押して、メイの技が出なかった(p.mvId が変わっていない)ときに、押したときの方向で s / sf / su / sb / sd のロロの動きを出す
const PUP_SOLO_STATES = ['atk', 'land', 'sdown', 'throw'];   // throw = メイが投げている間(つかみ・投げの動き・空振りの隙)も、ロロを動かせる
function pupSoloCommand(p, o, P) {
  pupSoloNormal(p, o, P);
  if (p.spF == null || p.spF !== gfr - 1 || p.mvId !== p.spMv) return;
  if (p.selfH) { p.spF = null; return; }                               // 本体の必殺のキーを押しながらの A は、ロロを動かさない
  p.spF = null;
  if (!PUP_SOLO_STATES.includes(p.st) || P.st !== 'idle' || P.grab || (P.act && P.act.cmd !== 'trace')) return;
  const d = p.spIn || {}, fw = (d.r && p.f > 0) || (d.l && p.f < 0), bk = (d.l && p.f > 0) || (d.r && p.f < 0),
    k = d.u ? 'su' : d.d && p.ch.mv.sd ? 'sd' : fw ? 'sf' : bk && p.ch.mv.sb ? 'sb' : 's', m = p.ch.mv[k];
  if (!m || !m.pup) return;
  puppetOnMove(p, k, m);
  fx.push({ k: 'txt', text: m.nm, x: P.x, y: P.y - 110, t: 22, l: 22, c: p.ch.pupRaw.color, s: 13 });
}
// Z も同じ: メイが動けない間に Z を押したら、ロロだけがその技の連携攻撃(トレース)を出す
//   A の命令と違って、ロロが何かしている間(攻撃の後隙も)は出せない。ロロが待機しているときだけ
function pupSoloNormal(p, o, P) {
  if (p.atF == null || p.atF !== gfr - 1 || p.mvId !== p.atMv || p.atDone === p.atF) return;
  p.atDone = p.atF;
  if (p.spF === p.atF) return;                                         // Z と A の同時押し(ゲージ技)は使わない
  if (!PUP_SOLO_STATES.includes(p.st) || P.st !== 'idle' || P.grab || P.act) return;   // ロロが空中なら空中攻撃(air)になる
  const d = p.atIn || {}, air = p.y < GY, fw = (d.r && p.f > 0) || (d.l && p.f < 0), bk = (d.l && p.f > 0) || (d.r && p.f < 0),
    k = air ? (d.u ? 'au' : d.d ? 'ad' : fw ? 'af' : 'an') : d.u ? 'u' : d.d ? 'd' : fw ? 'f' : bk && p.ch.mv.b ? 'b' : 'n', m = p.ch.mv[k];
  if (!m || !m.pup) return;
  puppetOnMove(p, k, m);
  if (P.act) P.act.t = -2;                                             // ロロだけのときは、すぐ動く
  fx.push({ k: 'txt', text: m.nm, x: P.x, y: P.y - 110, t: 22, l: 22, c: p.ch.pupRaw.color, s: 13 });
}
// ジャンプ: 本体が跳んだら、jumpDelay F 遅れてロロも跳ぶ。空中ジャンプにも airJumps 回までついてくる
//   本体の跳び上がりは「ジャンプの速さの6割より速く上へ動き出した」で見分ける(技の launch で少し浮くだけの時は跳ばない)
function pupJumpWatch(p, P, S) {
  const th = (p.ch.jp ?? -13) * 0.6, onG = P.mayG ?? true, vy0 = P.mayVy ?? 0;
  if (p.y < GY && p.vy < th && p.st !== 'atk' && p.st !== 'hit' && (onG || vy0 > th + 3)) {
    P.jumpIn = S.jumpDelay ?? 6;
    P.jumpAir = !onG;
    P.jumpVx = p.vx;
  }
  P.mayG = p.y >= GY;
  P.mayVy = p.vy;
  if (!(P.jumpIn > 0) || --P.jumpIn > 0) return;
  if (P.act || P.grab || P.st !== 'idle') return;                       // 何かしている間は跳ばない
  if (P.y >= GY) {
    P.vy = S.jump ?? -13.5;
    P.vx = P.free ? 0 : (P.jumpVx || 0) * 0.9;                         // ついてくる状態なら、本体と同じ向きへ跳ぶ
    P.airN = 0;
    P.walking = false;
    puppetFx(p, P, [{ type: 'particles', at: 'feet', count: 5, dir: 'up', speed: 2, life: 14 }]);
  } else if (P.jumpAir && (P.airN | 0) < (S.airJumps ?? 1)) {
    P.vy = (S.jump ?? -13.5) * 0.85;
    if (!P.free) P.vx = (P.jumpVx || 0) * 0.9;
    P.airN = (P.airN | 0) + 1;
  }
}
// 行動中
function pupAct(p, o, P, S) {
  const A_ = P.act, U = A_.U, m = A_.m;
  A_.t++;
  P.idleT = 0;
  if (A_.t <= 0) return;                                             // 動き出すまで(本体の技から遅れる)
  const st = U.startup ?? 4, ac = U.active ?? 4, rc = U.recovery ?? 10;
  switch (A_.cmd) {
    case 'pull': {                                                   // 目標まで、自分で走ってくる(走り出しは遅く、ぐんと加速して、手前でぴたっと止まる)
      const d = A_.target - P.x;
      P.vx = Math.sign(d) * Math.min((U.speed ?? 8) * Math.min(1, 0.2 + (A_.t / 7) ** 2), Math.abs(d) * 0.45 + 1);
      P.f = Math.abs(d) > 6 ? Math.sign(d) : p.f;
      P.walking = true;
      if (Math.abs(d) < 4 || A_.t > 40) { P.vx = 0; P.act = null; P.walking = false; P.f = p.f; }
      return;
    }
    case 'dash': {
      if (A_.t === 1) P.f = A_.dir;
      const tt = A_.t - st;
      if (tt > 0 && !A_.end) {                                        // A を押している間だけ進む(最低 min F・最大 time F)
        const hold = A_.cpuHold == null ? p.spH : tt <= A_.cpuHold;
        // 緩急: 1〜2F はじりっと出て、そこから一気に最高速
        P.vx = A_.dir * (U.speed ?? 12) * (tt <= 2 ? 0.25 : Math.min(1.15, 0.6 + tt * 0.15));
        pupHitWindow(p, o, P, A_, m, U, tt);
        if (!A_.passed && (P.x - o.x) * A_.dir > 0) A_.passed = true;   // 相手を通り抜けた
        const cpuStop = A_.cpuHold != null && A_.passed && (P.x - o.x) * A_.dir > (U.past ?? 60);   // CPU: 相手の向こう側で止まる(挟み込み)
        if (tt >= (U.time ?? 40) || (tt >= (U.min ?? 6) && !hold) || cpuStop || P.x <= 24 || P.x >= W - 24) A_.end = A_.t;
      } else if (A_.end) {
        P.vx *= 0.5;
        if (A_.t > A_.end + rc) { P.act = null; P.f = o.x >= P.x ? 1 : -1; }
      }
      return;
    }
    case 'leap': {
      if (A_.t === st) { P.vx = A_.dir * (U.vx ?? 6); P.vy = U.vy ?? -13; }
      if (A_.t > st && P.y < GY) {                                    // 緩急: 頂点でふわっと止まりかけ、落ち始めたら一気に急降下
        if (Math.abs(P.vy) < 2.5 && !A_.dove) { P.vy -= 0.55; P.vx *= 0.9; }
        else if (P.vy >= 2.5) { if (!A_.dove) { A_.dove = 1; P.vx = A_.dir * (U.vx ?? 6) * 1.2; } P.vy += 0.6; }
      }
      if (A_.t > st) {
        if (P.y < GY && P.vy > -2) pupHitWindow(p, o, P, A_, m, U, 1);   // 頂点を越えて落ち始めたら振り下ろす
        if (P.y >= GY && A_.t > st + 4) {
          if (!A_.landed) { A_.landed = A_.t; P.vx = 0; puppetFx(p, P, [{ type: 'ring', at: 'feet', flat: true, r: 40, width: 4 }]); }
          if (A_.t > A_.landed + rc) { P.act = null; P.f = o.x >= P.x ? 1 : -1; }
        }
      }
      return;
    }
    case 'trap': {                                                   // 屈んで待つ。相手が近づいたら足元を払う
      if (!A_.sprung) {
        if (A_.t > st && o.y >= GY && Math.abs(o.x - P.x) < (U.range ?? 70) && o.st !== 'held') { A_.sprung = A_.t; P.f = o.x >= P.x ? 1 : -1; puppetFx(p, P, [{ type: 'sigil', at: 'feet', r: 34, flat: true, duration: 12 }]); }
        else if (A_.t > A_.wait) P.act = null;
        return;
      }
      const tt = A_.t - A_.sprung;
      if (tt > (U.fire ?? 3) && tt <= (U.fire ?? 3) + ac) pupHitWindow(p, o, P, A_, m, U, tt - (U.fire ?? 3));
      if (tt > (U.fire ?? 3) + ac + rc) P.act = null;
      return;
    }
    case 'bomb': {                                                   // 自爆: その場で綿をふくらませ、fuse F 後にはじけてまわりを吹き飛ばす(ロロの耐久を cost 減らす)
      const fuse = U.fuse ?? 40;
      P.vx *= 0.6;
      if (!A_.boom) {
        if (A_.t === 1) { P.f = o.x >= P.x ? 1 : -1; puppetFx(p, P, [{ type: 'sigil', at: 'feet', r: 48, flat: true, duration: fuse + 6 }]); }
        if (A_.t % 8 === 0) puppetFx(p, P, [{ type: 'particles', at: 'body', count: 3, dir: 'up', speed: 1.5, gravity: -0.02, life: 18, color: '#f4efe6', color2: '#ff8ad0' }]);
        if (A_.t >= fuse) {
          A_.boom = A_.t;
          P.hp -= U.cost ?? 10;
          P.lastHit = fr;
          puppetFx(p, P, [{ type: 'burst', at: 'body', r: 70, count: 12 }, { type: 'impact', at: 'body', r: 60, color: '#3a1a4a', color2: '#ffb3f0' },
            { type: 'particles', at: 'body', count: 26, dir: 'all', speed: 7, gravity: 0.18, life: 34, color: '#f4efe6', color2: '#c49ae8' },
            { type: 'ring', at: 'feet', flat: true, r: 70, width: 5 }, { type: 'shake', duration: 10, power: 6 }]);
          dust(P.x, P.y - 30, 16, '#f4efe6');
        }
        return;
      }
      const tt = A_.t - A_.boom;
      if (tt >= 1 && tt <= ac) pupHitWindow(p, o, P, A_, m, U, tt);
      if (tt > ac + rc) { P.act = null; if (P.hp <= 0) puppetCrash(p, P, S); }
      return;
    }
    case 'warp':
    case 'string': {                                                 // 消えて、相手の背後(本体と反対側)に現れる
      if (A_.t === 1) {
        puppetFx(p, P, [{ type: 'sigil', at: 'feet', r: 40, flat: true, duration: 14 }, { type: 'particles', at: 'body', count: 10, dir: 'up', speed: 3, gravity: -0.04, life: 20 }]);
        P.fade = 0.05;
        const side = Math.sign(o.x - p.x) || p.f;
        A_.to = Math.max(30, Math.min(W - 30, o.x + side * (U.behind ?? 55)));
        if (Math.abs(A_.to - o.x) < 20) A_.to = Math.max(30, Math.min(W - 30, o.x - side * (U.behind ?? 55)));   // 壁際で後ろに入れないときは手前に
      }
      if (A_.t === (U.blink ?? 8)) {
        P.x = A_.to; P.y = GY; P.vx = P.vy = 0; P.f = o.x >= P.x ? 1 : -1; P.fade = 0.3;
        puppetFx(p, P, [{ type: 'sigil', at: 'feet', r: 44, flat: true, duration: 18 }, { type: 'flash', at: 'body', r: 40, blend: 'add', duration: 8 }]);
      }
      const t0 = U.blink ?? 8;
      if (A_.t > t0 + st && A_.t <= t0 + st + ac) {
        if (A_.cmd === 'string') pupStringHits(p, o, P, A_, m, U, A_.t - t0 - st);
        else pupHitWindow(p, o, P, A_, m, U, A_.t - t0 - st);
      }
      if (A_.t > t0 + st + ac + rc) P.act = null;
      return;
    }
    case 'yank': {                                                   // 糸を相手へ飛ばす
      if (A_.t === 1) P.f = o.x >= P.x ? 1 : -1;
      if (A_.t > st && A_.t <= st + ac) pupHitWindow(p, o, P, A_, m, U, A_.t - st);
      if (A_.t > st + ac + rc) P.act = null;
      return;
    }
    default: {                                                       // trace / stay: その場で攻撃
      if (A_.t === 1) P.f = o.x >= P.x ? 1 : -1;
      if (U.hop && A_.t === st) P.vy = U.hop;
      if (U.slide && A_.t === st) P.vx = P.f * U.slide;
      if (U.dive && A_.t === st) { P.vx = P.f * (U.dive.x || 0); P.vy = U.dive.y || 0; }   // 空中から突っ込む
      if (U.airOnly && A_.t > st && P.y >= GY && !A_.landed) {         // 着地したら攻撃をやめる
        A_.landed = 1;
        A_.t = Math.max(A_.t, st + ac);
        puppetFx(p, P, [{ type: 'ring', at: 'feet', flat: true, r: 34, width: 3 }]);
      }
      if (A_.t > st && A_.t <= st + ac) pupHitWindow(p, o, P, A_, m, U, A_.t - st);
      if (P.y >= GY) P.vx *= 0.75;
      if (A_.t > st + ac + rc) P.act = null;
    }
  }
}
// 攻撃判定のある間: 多段(hits)・hitInterval を守って当てる
function pupHitWindow(p, o, P, A_, m, U, tt) {
  if (!m || !(m.rw > 0)) return;
  if (tt === 1 && !A_.fxDone) { A_.fxDone = 1; if (typeof spawnEffect === 'function') spawnEffect({ x: P.x, y: P.y, f: P.f }, m, 'attack'); }
  const N = m.hits || 1, iv = m.hiv || Math.max(1, Math.floor(m.ac / N));
  if (A_.hitN >= N || (A_.hitN && A_.t - A_.hitT < iv)) return;
  const bx = P.f > 0 ? P.x + m.rx : P.x - m.rx - m.rw;
  if (pupStrike(p, o, P, m, { x: bx, y: P.y + m.ry, w: m.rw, h: m.rh })) { A_.hitN++; A_.hitT = A_.t; }
}
// 1回当てる。相手の背中側から当てたときはガードできない(挟み撃ち)。当たったら true
function pupStrike(p, o, P, m, rect, guardable = false) {   // guardable: 背中側から当ててもガードできる(超必殺技の呪糸)
  if (o.st === 'held' || o.st === 'ko') return false;
  const hit = hitPartForRect(o, rect);
  if (!hit) return false;
  const S = p.ch.pupRaw, back = (P.x - o.x) * (p.x - o.x) < 0 && Math.abs(P.x - o.x) > 12;   // ロロが相手の向こう側(本体と反対側)
  let M = m;
  if (o.escG > 0) guardable = true;                                   // コンボ抜けの直後は、背後からでもガードできる(script.js の COMBO_BREAK)
  if (back && guardable) M = m._backG || (m._backG = { ...m, d: Math.max(1, Math.round(m.d * S.backDmg)) });   // ダメージは背中側の倍率のまま、ガードはできる
  else if (back) M = m._back || (m._back = { ...m, ub: true, d: Math.max(1, Math.round(m.d * S.backDmg)) });
  const proxy = { f: P.x <= o.x ? 1 : -1, vx: 0, own: p, x: P.x, y: m.low ? GY : P.y, pup: true, mid: null };   // low の技は空中から当てても、しゃがみ受け流しできない
  const hp0 = o.hp, st0 = o.st;
  applyHit(proxy, o, M, hit.zone, hit.y);
  const landed = o.hp < hp0 || o.st === 'hit';
  if (landed && typeof spawnEffect === 'function') spawnEffect({ x: P.x, y: P.y, f: proxy.f }, M, 'hit', o.x, hit.y);
  if (landed && back && st0 !== 'hit') fx.push({ k: 'txt', text: '挟撃!', x: o.x, y: o.y - 150, t: 30, l: 30, c: S.color, s: 18 });
  return true;
}
// 呪糸(超必殺技): 本体の手とロロを結ぶ線の上にいる相手に当たる
function pupStringHits(p, o, P, A_, m, U, tt) {
  const N = m.hits || 1, iv = m.hiv || Math.max(1, Math.floor(m.ac / N));
  if (tt === 1 && typeof spawnEffect === 'function') spawnEffect({ x: (p.x + P.x) / 2, y: GY, f: p.f }, m, 'attack');
  A_.str = 1;
  if (A_.hitN >= N || (A_.hitN && A_.t - A_.hitT < iv)) return;
  const x0 = Math.min(p.x, P.x), x1 = Math.max(p.x, P.x);
  if (o.x < x0 - 10 || o.x > x1 + 10) return;                         // 二人の間にいないと当たらない
  if (pupStrike(p, o, P, m, { x: o.x - 15, y: GY - 110, w: 30, h: 90 }, true)) {   // 超必殺技はシールドでガードできる
    A_.hitN++; A_.hitT = A_.t;
    o.x += (((p.x + P.x) / 2) - o.x) * 0.25;                          // 糸に絡めとられて、二人の真ん中へ寄せられる
  }
}

// ---- 身代わり(script.js の applyHit から)。ロロが本体の前(攻撃してきた側)にいれば、ロロが受ける ----
function puppetShield(atk, o, m) {
  if (!o || !o.ch || !o.ch.pupRaw || atk.pup) return false;
  const P = o.pup;
  if (!P || P.st !== 'idle' || P.grab || P.fade < 0.6 || P.y < GY - 30 || (m && m.ub)) return false;
  if (P.act && !['trace', 'stay', 'pull', 'trap'].includes(P.act.cmd)) return false;   // 突進・跳躍・転移の最中は盾にならない
  const S = o.ch.pupRaw, ax = atk.x, s = Math.sign(ax - o.x) || 1, dl = (P.x - o.x) * s;
  if (dl < 8 || dl > S.guard || Math.abs(ax - o.x) + 25 < dl) return false;   // ロロが本体と相手の間にいない
  const d = Math.max(1, m.d || 1);
  P.hp -= d;
  P.lastHit = fr;
  P.shake = 10;
  P.vx = s * 2.5;
  hs = Math.max(hs, m.ghs ?? 6);
  if (atk.ch) { atk.noCancel = true; atk.vx = -atk.f * 2; }
  dust(P.x, P.y - 40, 8, '#f0e6f6');
  fx.push({ x: P.x, y: P.y - 40, t: 8 });
  if (P.hp <= 0) puppetCrash(o, P, S);
  else fx.push({ k: 'txt', text: '身代わり', x: P.x, y: P.y - 100, t: 22, l: 22, c: S.color, s: 14 });
  return true;
}
function puppetCrash(p, P, S) {
  P.st = 'crash';
  P.crashT = S.crash;
  P.act = null;
  P.hp = 0;
  P.crashX = P.x;
  P.crashY = P.y;
  P.crashFr = fr;
  P.oHp = null;
  hs = Math.max(hs, 14);
  dust(P.x, P.y - 40, 18, '#f4efe6');                                  // 中の綿が飛び散る
  puppetFx(p, P, [{ type: 'particles', at: 'body', count: 24, dir: 'all', speed: 6, gravity: 0.2, life: 40, color: '#f4efe6', color2: '#c49ae8' }, { type: 'burst', at: 'body', r: 50 }]);
  fx.push({ k: 'txt', text: '人形クラッシュ!', x: P.x, y: P.y - 110, t: 44, l: 44, c: '#ff8ac0', s: 18 });
}

// ---- つかみ投げ: 本体が投げを出すと、ロロもその場でつかもうとする(本体がつかめなかったときだけ) ----
function pupTryGrab(p, o, P, S) {
  if (p.st !== 'throw' || p.tg >= 0 || p.thr || !p.ch.th || P.act || P.y < GY) return;
  const T = p.ch.th;
  if (p.t <= T.startup || p.t > T.startup + T.active) return;
  const f = o.x >= P.x ? 1 : -1, TB = (S.throw && S.throw.box) || PUPPET_DEFAULT.throw.box;
  if (!canGrab({ x: P.x, y: P.y, f }, o, { box: TB })) return;
  P.f = f;
  P.grab = { t: 0, dir: p.td || 'f' };
  o.st = 'held'; o.hd = 'f'; o.hdPose = null; o.mv = null; o.vx = o.vy = 0; o.pupHeld = true;
  p.st = 'idle'; p.t = 0; p.moveLock = 10;                            // 本体はすぐ動ける(ロロが投げている間に動ける)
  hs = HIT_STOP.grab;
  fx.push({ k: 'ring', x: o.x, y: o.y - 60, r: 60, t: 10, l: 10, c: S.color });
  fx.push({ k: 'txt', text: 'ロロ掴み!', x: o.x, y: o.y - 125, t: 24, l: 24, c: S.color });
}
function pupGrabTick(p, o, P, S) {
  const G = P.grab;
  G.t++;
  if (o.st !== 'held') { P.grab = null; o.pupHeld = false; return; }
  const u = Math.min(1, G.t / 18), shk = G.t % 4 < 2 ? 2 : -2;          // 持ち上げて、ぶるぶる振る
  o.x = Math.max(30, Math.min(W - 30, P.x + P.f * (24 + shk)));
  o.y = P.y - 42 * u;
  o.f = -P.f;
  if (G.t === 12) puppetFx(p, P, [{ type: 'lines', at: 'body', count: 3, length: 40 }]);
  if (G.t >= 28) releasePupGrab(p, o, P, false);
}
function releasePupGrab(p, o, P, cancel) {
  const S = p.ch.pupRaw, G = P.grab, TT = { ...PUPPET_DEFAULT.throw, ...(S.throw || {}) }, dd = TT[G.dir] || TT.f;
  P.grab = null;
  o.pupHeld = false;
  if (cancel) { o.st = 'idle'; return; }
  const toMay = Math.sign(p.x - P.x) || -P.f,                         // f: 本体の方へ(挟み込んだ相手を本体へ投げ返す) / b: 本体と反対へ
    sg = G.dir === 'b' ? -toMay : G.dir === 'f' ? toMay : P.f;
  const d = Math.max(1, Math.round(dd.damage * (p.ch.dm || 1))), hp0 = o.hp;
  o.hp = Math.max(0, o.hp - d);
  msHit(p, o, hp0 - o.hp, 1, null);
  spGain(p, (hp0 - o.hp) * spOf(p).hit);
  spGain(o, (hp0 - o.hp) * spOf(o).hurt);
  Object.assign(o, { st: 'hit', hz: 'torso', t: dd.hitstun, hitStunFull: dd.hitstun, mv: null, cb: 1, cbMoves: { throw: 1 }, airStunCanExpire: false, cbn: 1, cbT: 70 });
  o.vx = sg * dd.vx * (o.ch.wt || 1);
  o.vy = dd.vy * (o.ch.wt || 1);
  o.spike = dd.spike || 0;
  if (G.dir === 'd') { o.y = GY; }
  hs = Math.max(hs, 12);
  puppetFx(p, P, [{ type: 'impact', r: 40 }, { type: 'particles', count: 10, dir: 'all', speed: 5 }], 'hit', o.x, o.y - 50);
  fx.push({ k: 'txt', text: (dd.name || 'ロロ投げ') + ' ' + d, x: o.x, y: Math.min(o.y, GY) - 130, t: 40, l: 40, c: S.color });
}

// ---- 呪いの釘(技の curse): 技を出した瞬間の相手の足元に印を置き、delay F 後にそこへ当たる ----
function castCurse(p, m) {
  const o = p === A ? B : A, P = pupOf(p) || { curses: (p.curses = p.curses || []) }, C = m.curse;
  const list = P.curses || (P.curses = []);
  const spot = { x: o.x, t: C.delay ?? 30, C, m: pupMove(C, 'curse'), f: p.f };
  list.push(spot);
  if (typeof spawnEffect === 'function') spawnEffect({ x: spot.x, y: GY, f: p.f }, { k: 'curse', rx: -30, rw: 60, ry: -10, rh: 10, fx: { color: '#8a3ad0', color2: '#ffb3f0', attack: [{ type: 'sigil', at: 'feet', r: 42, flat: true, duration: spot.t + 6 }] } }, 'attack');
}
function tickCurses(p, o, P) {
  const list = P.curses;
  if (!list || !list.length) return;
  for (const c of list) {
    if (--c.t > 0) continue;
    const m = c.m, rect = { x: c.x - m.rw / 2, y: GY + m.ry, w: m.rw, h: m.rh };
    if (typeof spawnEffect === 'function') spawnEffect({ x: c.x, y: GY, f: c.f }, m, 'attack');
    const hit = hitPartForRect(o, rect);
    if (hit && o.st !== 'held' && o.st !== 'ko') {
      const hp0 = o.hp;
      applyHit({ f: c.f, vx: 0, own: p, x: c.x, y: GY, pup: true, mid: null }, o, m, hit.zone, hit.y);
      if (o.hp < hp0 && typeof spawnEffect === 'function') spawnEffect({ x: c.x, y: GY, f: c.f }, m, 'hit', o.x, hit.y);
    }
    c.done = true;
  }
  P.curses = list.filter((c) => !c.done);
}

// ---- CPU: ときどきロロを動かす必殺技を使う(入力を返す。使わないときは null) ----
function puppetAI(p, o, lv) {
  const P = p.ch && p.ch.pupRaw ? pupOf(p) : null;
  if (P && p.st === 'atk' && p.mv && p.y >= GY && p.t > p.mv.st + p.mv.ac && P.st === 'idle' && !P.grab && (!P.act || P.act.cmd === 'trace') && R() < 0.04 * Math.min(lv, 5) / 5) {
    const fw = o.x >= p.x ? 'r' : 'l', ad = Math.abs(o.x - p.x);                         // メイの後隙の間に、ロロだけを動かす(後隙を守る・追撃する)
    if (o.y < GY - 40) return { sp: 1, u: 1 };
    if (o.st === 'hit') return ad > 90 ? { sp: 1, [fw]: 1 } : { sp: 1, d: 1 };
    return R() < 0.5 ? { sp: 1 } : { sp: 1, d: 1 };
  }
  if (!P || p.st !== 'idle' || p.y < GY || P.act || P.grab) return null;
  const rk = Math.min(lv, 5) / 5;
  const fw = o.x >= p.x ? 'r' : 'l', bw = fw === 'r' ? 'l' : 'r', ad = Math.abs(o.x - p.x);
  if (P.st === 'crash') {                                                                // ロロがいない: メイだけの技(solo)で戦う
    if (R() > 0.01 + 0.015 * rk) return null;
    if (o.y < GY - 40 && ad < 130) return { sp: 1, u: 1 };                               // 吊るし糸(対空)
    if (ad > 220) return { sp: 1 };                                                      // 呪い針
    if (ad > 120 && R() < 0.5) return { sp: 1, [fw]: 1 };                                // 糸渡り
    if (ad < 160 && R() < 0.4) return { sp: 1, d: 1 };                                   // 影縫い
    if (ad < 80) return { sp: 1, [bw]: 1 };                                              // 糸張り退き
    return null;
  }
  if (R() > 0.012 + 0.02 * rk) return null;
  if (R() < 0.3) {                                                                       // ときどきメイ自身の必殺技(本体の必殺のキー + A)
    if (ad > 240) return { sp: 1, selfH: 1 };                                            // 呪い針
    if (ad < 110 && o.st !== 'shield') return { sp: 1, selfH: 1, [bw]: 1 };              // 呪縛払い(前へ大きく吹き飛ばす)
  }
  const between = (P.x - p.x) * (o.x - p.x) > 0 && Math.abs(P.x - p.x) < Math.abs(o.x - p.x);
  const behind = (P.x - o.x) * (p.x - o.x) < 0;
  if (Math.abs(P.x - p.x) > 200 && !behind) return { sp: 1 };                          // 離れすぎ → 引き寄せ
  if (o.y < GY - 40 && ad < 200) return { sp: 1, u: 1 };                                 // 跳んでいる相手 → 飛びかかり
  if (!behind && ad > 110 && R() < 0.55) return { sp: 1, [fw]: 1 };                     // 突進で挟み込む
  if (ad < 90 && R() < 0.4) return { sp: 1, [bw]: 1 };                                   // 近すぎ → 置き去り
  if (!between && !behind) return { sp: 1 };                                             // 盾として前へ
  if (R() < 0.3) return { sp: 1, d: 1 };                                                 // 罠
  return null;
}

// ---- 描く ----
function drawPuppets(layer) {
  if (typeof A === 'undefined' || !A) return;
  for (const p of [A, B]) {
    if (!p || !p.ch || !p.ch.pupRaw || !p.pup) continue;
    if (layer === 'body') drawLoloBody(p, p.pup);
    else drawLoloStrings(p, p.pup);   // 超必殺技の呪いの糸だけ(ふだんは糸でつながっていない。ロロは自分で動く)
  }
}
// 今の姿勢(動きのキーフレームを、行動の進み具合で混ぜる)
function loloPose(p, P) {
  const base = LOLO_POSES.idle, mix = (a, b, t) => { const r = {}; for (const k of ['lean', 'armF', 'armB', 'legF', 'legB', 'head', 'sq', 'hop', 'spin']) r[k] = (a[k] ?? base[k] ?? 0) + ((b[k] ?? base[k] ?? 0) - (a[k] ?? base[k] ?? 0)) * t; return r; };
  if (P.st === 'down' || (p.st === 'ko' && P.st !== 'crash')) return mix(base, LOLO_POSES.down, 1);
  if (P.grab) { const M = LOLO_MOTIONS.grab; return mix(M.w, M.s, Math.min(1, P.grab.t / 14)); }
  if (P.shake > 0) return mix(base, LOLO_POSES.hit, P.shake / 10);
  const A_ = P.act;
  if (A_ && A_.t > 0) {
    const U = A_.U, st = U.startup ?? 4, ac = U.active ?? 4, rc = U.recovery ?? 10;
    const name = U.motion || { dash: 'dash', leap: 'leap', trap: 'crouch', warp: 'stab', string: 'cast', yank: 'cast', pull: 'walk' }[A_.cmd] || 'stab';
    if (name === 'walk') return loloWalk(P, base, 1.4);
    const M = LOLO_MOTIONS[name] || LOLO_MOTIONS.stab;
    let t = A_.t;
    if (A_.cmd === 'warp' || A_.cmd === 'string') t -= U.blink ?? 8;
    if (A_.cmd === 'trap') {
      if (!A_.sprung) return mix(M.w, M.s, 0.5 + 0.5 * Math.sin(fr * 0.1));
      const L = LOLO_MOTIONS.low, tt = A_.t - A_.sprung;
      return tt < 3 ? mix(L.w, L.s, tt / 3) : mix(L.s, base, Math.min(1, (tt - 3 - ac) / Math.max(1, rc)));
    }
    if (A_.cmd === 'leap') { const k = P.vy < 0 ? 0 : Math.min(1, P.vy / 6); return mix(M.w, M.s, P.y >= GY && A_.landed ? 1 : k); }
    if (A_.cmd === 'bomb') {                                             // 自爆: 導火線の間はぶるぶる震えながらふくらみ、はじけたら元に戻る
      if (!A_.boom) { const u = Math.min(1, A_.t / Math.max(1, U.fuse ?? 40)), w = mix(M.w, M.s, u * u); w.lean += Math.sin(fr * (1.2 + u * 2.5)) * 0.08 * (0.3 + u); w.head += Math.sin(fr * 2.3) * 0.15 * u; return w; }
      return mix(M.s, base, Math.min(1, (A_.t - A_.boom) / 10));
    }
    if (M.roll && t > st && t <= st + ac + 4) return { ...mix(M.s, M.s, 1), lean: 0.5 + (t - st) * 0.62, raw: true };   // 転がる: 体ごと回る(なめらかにせずそのまま)
    // 緩急: 振りかぶりはゆっくり溜めて(最後に小さく震える)、打ち出しは 2F で行きすぎるほど一気に、
    //       打ち終わりの形でぴたっと止まってから、力が抜けたようにゆっくり戻る
    if (t <= st) {
      const u = Math.max(0, t) / Math.max(1, st), w = mix(base, M.w, PUP_EASE.inOut(u));
      if (u > 0.7) w.head += Math.sin(fr * 2.1) * 0.12, w.armF += Math.sin(fr * 1.7) * 0.08;
      return w;
    }
    const snap = Math.min(ac, 3);
    if (t <= st + snap) return mix(M.w, M.s, PUP_EASE.back((t - st) / snap));
    if (t <= st + ac || (A_.cmd === 'dash' && !A_.end)) return mix(M.s, M.s, 1);
    const hold = Math.min(8, Math.round(rc * 0.4)), r = A_.cmd === 'dash' ? t - A_.end : t - st - ac;   // 打ち終わりの形で止まる
    if (r <= hold) return mix(M.s, M.s, 1);
    return mix(M.s, base, PUP_EASE.inOut(Math.min(1, (r - hold) / Math.max(1, rc - hold))));
  }
  if (P.y < GY - 4) return mix(base, P.vy < 0 ? LOLO_POSES.rise : LOLO_POSES.fall, Math.min(1, (GY - P.y) / 20));   // 空中: 跳び上がり / 落ちる
  if (P.walking || Math.abs(P.vx) > 2) return loloWalk(P, base, 1);
  return base;
}
// 自分で歩く: 短い脚を大きく交互に振り、左右に体をゆすって、ぴょこぴょこ跳ねる(ぬいぐるみの歩き方)。ときどき首がカクッと傾く
function loloWalk(P, base, k) {
  const ph = (P.walkPh = (P.walkPh || 0) + 0.32 * k * Math.min(1.6, 0.15 + Math.max(Math.abs(P.vx), Math.abs(P.walkV || 0) * 1.5) / 4)),   // 速く進むときは脚もせかせか、止まるときは脚も止まる
    s = Math.sin(ph), jerk = Math.sin(ph * 0.37) > 0.92 ? 0.5 : 0;
  return { ...base, lean: 0.18 + 0.12 * Math.abs(s), legF: 0.75 * s, legB: -0.75 * s, armF: 0.5 - 0.6 * s, armB: -0.3 + 0.6 * s,
    head: 0.25 + 0.15 * s + jerk, sq: 1 - 0.05 * Math.abs(Math.cos(ph)), hop: 4 * Math.abs(Math.cos(ph)), spin: 0 };
}
// なめらかにする: 本体の look.smooth と同じように、表示する姿勢を目標の姿勢へ毎F少しずつ近づける(状態が切り替わってもパッと変わらない)
//   近づく割合は場面ごと: 打ち出しの瞬間は速く(キレを残す)、溜め・戻り・待機はゆっくり。転がる(lean が回り続ける)ときはそのまま
const LOLO_SMOOTH = { idle: 0.22, walk: 0.35, air: 0.28, hit: 0.45, wind: 0.3, strike: 0.5, recover: 0.24, down: 0.16 };
const LOLO_KEYS = ['lean', 'armF', 'armB', 'legF', 'legB', 'head', 'sq', 'hop'];
function loloSmooth(P, tgt) {
  const D = P.dpose || (P.dpose = { ...tgt });
  if (P.dposeFr === fr) return D;                                       // 1F に1回だけ進める
  P.dposeFr = fr;
  const A_ = P.act;
  let k = LOLO_SMOOTH.idle;
  if (P.st === 'down') k = LOLO_SMOOTH.down;
  else if (P.shake > 0) k = LOLO_SMOOTH.hit;
  else if (A_ && A_.t > 0) {
    const U = A_.U, st = U.startup ?? 4, ac = U.active ?? 4;
    k = A_.t <= st ? LOLO_SMOOTH.wind : A_.t <= st + Math.max(ac, 3) || (A_.cmd === 'dash' && !A_.end) ? LOLO_SMOOTH.strike : LOLO_SMOOTH.recover;
  } else if (P.y < GY - 4) k = LOLO_SMOOTH.air;
  else if (P.walking) k = LOLO_SMOOTH.walk;
  if (tgt.raw) { Object.assign(D, tgt); return D; }                     // 転がるなど、そのまま使う姿勢
  const TAU = Math.PI * 2;                                              // 転がったあと: 体の角度を一番近い向きに直してから戻す(逆回りしない)
  D.lean = (tgt.lean ?? 0) + ((((D.lean ?? 0) - (tgt.lean ?? 0) + Math.PI) % TAU + TAU) % TAU - Math.PI);
  for (const key of LOLO_KEYS) D[key] += ((tgt[key] ?? 0) - (D[key] ?? 0)) * k;
  D.spin = tgt.spin;
  return D;
}
// 向きを変えるときも、パッと反転せず横に細くなってから振り向く(紙人形がくるっと回るように)
function loloTurn(P) {
  if (P.fdFr !== fr) { P.fdFr = fr; P.fd = (P.fd ?? P.f) + (P.f - (P.fd ?? P.f)) * 0.35; }
  const v = P.fd ?? P.f;
  return Math.abs(v) < 0.18 ? (v < 0 ? -0.18 : 0.18) : v;
}
// ロロ: ぼろぼろのウサギのぬいぐるみ(片耳がちぎれかけ・ボタンの目とバツの縫い目・つぎはぎ・はみ出た綿・大きな針)
// 残像(技の puppet に trail: true): 速い動きの間、少し前の姿を薄く残す
function loloGhosts(p, P) {
  const A_ = P.act, on = A_ && A_.U && A_.U.trail && A_.t > (A_.U.startup ?? 4) && (A_.cmd === 'dash' ? !A_.end : A_.t <= (A_.U.startup ?? 4) + (A_.U.active ?? 4) + 2);
  const L = (P.ghosts = P.ghosts || []);
  if (on && fr % 2 === 0) { L.push({ x: P.x, y: P.y, f: P.f, pose: loloPose(p, P), t: fr }); if (L.length > 5) L.shift(); }
  while (L.length && fr - L[0].t > (on ? 12 : 6)) L.shift();
  L.forEach((G, i) => drawLoloBody(p, P, { ...G, alpha: 0.12 + 0.22 * (i / Math.max(1, L.length)) }));
}
function drawLoloBody(p, P, G) {
  const S = p.ch.pupRaw, cd = typeof CHARACTER_DRAWS !== 'undefined' && CHARACTER_DRAWS[p.ch.nm],
    pal = (k, d) => { const sk = typeof skinOf === 'function' ? skinOf(p.ch.nm, p.sk) : null, v = sk && sk.palette && k in sk.palette ? sk.palette[k] : cd && cd.palette && k in cd.palette ? cd.palette[k] : undefined; return v === undefined ? d : v; };
  let alpha = G ? G.alpha : P.fade;
  if (!G && P.st === 'crash') {                                        // クラッシュ: 崩れて消える(最初の 30F だけ見える)
    const tt = fr - (P.crashFr || 0);
    if (tt > 30) return;
    alpha = 1 - tt / 30;
  }
  if (!G && P.st !== 'crash') loloGhosts(p, P);                        // 残像を先に(後ろに)描く
  const X = G ? G.x : P.x, Y = G ? G.y : P.y, FF = G ? G.f : loloTurn(P);
  const pose = G ? G.pose : loloSmooth(P, loloPose(p, P)), sc = (S.scale ?? 0.82) * (cd && cd.body ? cd.body.scale / 0.78 : 1),
    fab = pal('lolo', '#b9a6c8'), fab2 = pal('loloDark', '#8a7698'), patch = pal('loloPatch', '#e0c8a8'), patch2 = pal('loloPatch2', '#7a9a9a'),
    stitch = '#2a1e2e', stuff = '#f4efe6', needle = pal('needle', '#c8ccd6'), eye = pal('loloEye', '#1a1418');
  const g2 = g, jit = P.jolt > 0 ? (R() - 0.5) * 3 : 0;
  g2.save();
  g2.globalAlpha = Math.max(0, Math.min(1, alpha));
  g2.translate(X + (!G && P.shake > 0 ? (R() - 0.5) * 4 : 0), Y - (pose.hop || 0));
  g2.scale(FF * sc, sc * (pose.sq || 1));
  // 影
  g2.save(); g2.scale(1, 0.3); g2.fillStyle = 'rgba(0,0,0,.18)'; g2.beginPath(); g2.arc(0, (pose.hop || 0) / sc / 0.3, 26, 0, 7); g2.fill(); g2.restore();
  const OL = (w = 2.2) => { g2.lineWidth = w; g2.strokeStyle = '#111'; g2.stroke(); },
    limb = (x, y, ang, len, w, col) => {                               // 布の筒(腕・脚)。先は丸い
      const ex = x + Math.sin(ang) * len, ey = y + Math.cos(ang) * len;
      g2.lineCap = 'round';
      g2.strokeStyle = '#111'; g2.lineWidth = w + 4; g2.beginPath(); g2.moveTo(x, y); g2.lineTo(ex, ey); g2.stroke();
      g2.strokeStyle = col; g2.lineWidth = w; g2.beginPath(); g2.moveTo(x, y); g2.lineTo(ex, ey); g2.stroke();
      g2.strokeStyle = stitch; g2.lineWidth = 0.8; g2.setLineDash([2, 2.5]);                       // 縫い目
      g2.beginPath(); g2.moveTo(x + Math.cos(ang) * w * 0.25, y - Math.sin(ang) * w * 0.25); g2.lineTo(ex + Math.cos(ang) * w * 0.25, ey - Math.sin(ang) * w * 0.25); g2.stroke(); g2.setLineDash([]);
      return [ex, ey];
    };
  // 体全体を足元のまわりで傾ける
  g2.rotate(pose.lean + jit * 0.02);
  if (pose.spin) g2.scale(Math.cos(fr * 0.5) >= 0 ? 1 : -1, 1);       // 回転: 向きがくるくる入れ替わる
  // 奥の脚・奥の腕
  limb(-6, -20, pose.legB || 0, 18, 9, fab2);
  const hipY = -20, shY = -44;
  limb(-8, shY, pose.armB || 0, 19, 8, fab2);
  // 体(布袋のような胴)
  g2.beginPath();
  g2.moveTo(-14, -18); g2.bezierCurveTo(-19, -30, -15, -48, -2, -50); g2.bezierCurveTo(12, -50, 18, -36, 15, -20); g2.bezierCurveTo(12, -12, -10, -11, -14, -18); g2.closePath();
  g2.fillStyle = fab; g2.fill(); OL();
  // つぎはぎ(お腹)と、脇の裂け目からはみ出た綿
  g2.save(); g2.translate(2, -30); g2.rotate(0.15);
  g2.fillStyle = patch; g2.fillRect(-6, -6, 12, 11); g2.lineWidth = 1.4; g2.strokeStyle = '#111'; g2.strokeRect(-6, -6, 12, 11);
  g2.strokeStyle = stitch; g2.lineWidth = 1; for (let i = -5; i <= 5; i += 3.3) { g2.beginPath(); g2.moveTo(-7.5, i); g2.lineTo(-4.5, i + 1); g2.stroke(); g2.beginPath(); g2.moveTo(7.5, i); g2.lineTo(4.5, i + 1); g2.stroke(); }
  g2.restore();
  g2.fillStyle = stuff; for (const [x, y, r] of [[-15, -32, 3.2], [-17, -28, 2.6], [-14.5, -26, 2.2]]) { g2.beginPath(); g2.arc(x, y, r, 0, 7); g2.fill(); g2.lineWidth = 1; g2.strokeStyle = '#999'; g2.stroke(); }
  g2.strokeStyle = stitch; g2.lineWidth = 1.2; g2.beginPath(); g2.moveTo(-13, -36); g2.lineTo(-11, -24); g2.stroke();
  // 手前の脚
  limb(5, hipY, pose.legF || 0, 18, 9.5, fab);
  // 頭(大きくて丸い。首がかしいでいる)
  g2.save();
  g2.translate(1, -52);
  g2.rotate((pose.head || 0) * 0.6 + jit * 0.05);
  // 耳: 奥はぴんと立ち、手前はちぎれかけて垂れている(縫い目つき)
  g2.save(); g2.translate(-6, -16); g2.rotate(-0.25);
  g2.beginPath(); g2.ellipse(0, -14, 5.5, 15, 0, 0, 7); g2.fillStyle = fab2; g2.fill(); OL(2);
  g2.beginPath(); g2.ellipse(0, -13, 2.6, 10, 0, 0, 7); g2.fillStyle = pal('loloInner', '#d9a0b8'); g2.fill();
  g2.restore();
  const ear = Math.sin(fr * 0.08) * 0.12;
  g2.save(); g2.translate(6, -14); g2.rotate(1.25 + ear);
  g2.beginPath(); g2.ellipse(0, -11, 5.5, 13, 0, 0, 7); g2.fillStyle = fab; g2.fill(); OL(2);
  g2.strokeStyle = stitch; g2.lineWidth = 1.2; for (let i = 0; i < 3; i++) { g2.beginPath(); g2.moveTo(-4, -2 - i * 3); g2.lineTo(4, -1 - i * 3); g2.stroke(); }
  g2.restore();
  g2.beginPath(); g2.ellipse(0, 0, 17, 16, 0, 0, 7); g2.fillStyle = fab; g2.fill(); OL(2.4);
  // 頭の縫い目(額を横切る)
  g2.strokeStyle = stitch; g2.lineWidth = 1.1; g2.setLineDash([2.5, 2]); g2.beginPath(); g2.moveTo(-14, -6); g2.quadraticCurveTo(0, -11, 15, -3); g2.stroke(); g2.setLineDash([]);
  for (let i = 0; i < 5; i++) { const x = -12 + i * 6.5, y = -8 + (i > 2 ? 2 : 0) - (i === 2 ? 2 : 0); g2.beginPath(); g2.moveTo(x, y - 2.2); g2.lineTo(x + 1, y + 2.2); g2.stroke(); }
  // 目: 手前は大きなボタン(糸の十字)、奥はバツの縫い目
  g2.beginPath(); g2.arc(8, 1, 5.2, 0, 7); g2.fillStyle = eye; g2.fill(); g2.lineWidth = 1.5; g2.strokeStyle = '#000'; g2.stroke();
  g2.fillStyle = pal('loloButton', '#6a2a7a'); g2.beginPath(); g2.arc(8, 1, 3.8, 0, 7); g2.fill();
  g2.fillStyle = '#111'; for (const [dx, dy] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]]) { g2.beginPath(); g2.arc(8 + dx, 1 + dy, 0.7, 0, 7); g2.fill(); }
  g2.strokeStyle = '#e8d8f0'; g2.lineWidth = 0.8; g2.beginPath(); g2.moveTo(6.7, -0.3); g2.lineTo(9.3, 2.3); g2.moveTo(9.3, -0.3); g2.lineTo(6.7, 2.3); g2.stroke();
  g2.strokeStyle = stitch; g2.lineWidth = 1.8; g2.beginPath(); g2.moveTo(-6, -2); g2.lineTo(-1, 3); g2.moveTo(-1, -2); g2.lineTo(-6, 3); g2.stroke();
  // 縫い付けた口(ぎざぎざ)
  g2.lineWidth = 1.2; g2.beginPath(); g2.moveTo(-3, 9); for (let i = 1; i <= 5; i++) g2.lineTo(-3 + i * 2.4, 9 + (i % 2 ? 1.8 : -0.4)); g2.stroke();
  g2.restore();
  // 手前の腕(大きな針を持つ)
  const hand = limb(6, shY, (pose.armF || 0), 19, 8.5, fab);
  g2.save(); g2.translate(hand[0], hand[1]); g2.rotate(-(pose.armF || 0) + Math.PI / 2 - 0.15);
  g2.lineCap = 'round';
  g2.strokeStyle = '#111'; g2.lineWidth = 5; g2.beginPath(); g2.moveTo(-8, 0); g2.lineTo(30, 0); g2.stroke();
  g2.strokeStyle = needle; g2.lineWidth = 3; g2.beginPath(); g2.moveTo(-8, 0); g2.lineTo(30, 0); g2.stroke();
  g2.fillStyle = '#111'; g2.beginPath(); g2.ellipse(-5, 0, 2.6, 1.3, 0, 0, 7); g2.fill();          // 針の穴
  g2.strokeStyle = pal('thread', '#d8b8ff'); g2.lineWidth = 1; g2.beginPath(); g2.moveTo(-5, 0); g2.quadraticCurveTo(-12, 6 + Math.sin(fr * 0.2) * 2, -16, 2); g2.stroke();
  g2.restore();
  g2.beginPath(); g2.arc(hand[0], hand[1], 4.6, 0, 7); g2.fillStyle = fab; g2.fill(); OL(1.8);
  g2.restore();
}
function drawLoloStrings(p, P) {
  if (P.st === 'crash' || P.fade < 0.2 || p.st === 'ko') return;
  if (!(P.act && P.act.cmd === 'string' && P.act.str)) return;        // ふだんは糸でつながっていない(ロロは自分で動く)
  // 呪糸(超必殺技): 本体とロロを結ぶ太い光の糸
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (const [w, a] of [[10, 0.25], [4, 0.6], [1.5, 1]]) {
    g.globalAlpha = a;
    g.lineWidth = w;
    g.strokeStyle = w > 2 ? '#a050e0' : '#ffffff';
    for (const yy of [-90, -60, -30]) { g.beginPath(); g.moveTo(p.x, p.y + yy); g.lineTo(P.x, P.y + yy + Math.sin(fr * 0.4 + yy) * 4); g.stroke(); }
  }
  g.restore();
}

// キャラのデータ(script.js の buildChar)は puppet.js より先に作られるので、ここで既定値を足しておく
if (typeof CH !== 'undefined') for (const c of CH) if (c && c.pupRaw) c.pupRaw = { ...PUPPET_DEFAULT, ...c.pupRaw, throw: { ...PUPPET_DEFAULT.throw, ...(c.pupRaw.throw || {}) } };
