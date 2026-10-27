// ============================================================
// elements.js … 新しいキャラ(ハヤテ・セツカ・シゲル・ギア・カルタ)だけが持つしくみ
//   読み込み順: script.js / effect.js / projectile.js / puppet.js のあと(index.html)
//   どれもゲームの状態を変える物は upd の中(elemTick / applyHit / step / begin から呼ぶ)、見た目だけの物は draw の中で使う。
//   乱数はゲーム用の R()(種から決まる)だけを使う → オンライン・リプレイでも両方の画面で同じになる
//
//   ■ 空中ダッシュ(ハヤテ)   stats.airDash: 1 … 空中で ← か → を2回押すと、横へ滑空する(着地するまでに airDash 回)
//       AIR_DASH の F数のあいだ横に進み、落ちない。無敵はない。途中(5F目から)で攻撃を出せる
//   ■ 凍結(セツカ)          技・弾に chill: 数値 … 当てると相手の「冷え」がたまる(ガードされると 1/3)
//       冷えが CHILL.slow 以上 → 相手の歩き・走りが遅くなる / CHILL.max に届く → 凍りつく(CHILL.freeze F 動けない)
//       凍った相手に攻撃を当てると氷が砕けて終わる。shatter: true の技なら「SHATTER!」でダメージ × CHILL.shatterMul
//       凍ったあと CHILL.immune F は冷えがたまらない(凍らせ続けることはできない)
//   ■ 光合成(シゲル)        stats.photosynthesis: { delay, rate } … 地上で何もせず立ち止まって delay F たつと、毎F rate ずつ体力が戻る
//   ■ 種(シゲル)            弾の path: 'seed' … 放物線で飛んで地面に落ちると芽になり、trap F のあいだ残る罠になる(踏むと当たる)
//       1人 SEED_MAX 個まで(多いと古い芽から消える)。技に bloom: true … 出した瞬間に自分の芽を全部「開花」させる(まわりに当たる)
//   ■ 熱(ギア)              heat: { max, decay, lock, color } … 技に heat: 数値 を書くと、出すたびに熱がたまる
//       max に届くと OVERHEAT: lock F のあいだ heat を書いた技が出せない(Z の技になる)。技に vent: true … 熱をすべて逃がす
//   ■ カードの順番(カルタ)  弾に luck: 'suit' … 投げるカードの絵柄は いつも ♠ → ♥ → ♦ → ♣ → ♠ … の順番(運の要素はない)
//       次に出る絵柄は HUD に出る。当たると絵柄ごとの効果 ♠ ダメージ×1.5 / ♥ 自分の体力+4 / ♦ SP+10 / ♣ 相手の硬直+10F
//       技に suitPick: true + variants … 次の絵柄で中身が決まる(ワイルドカード: ♠ ジャック / ♥ クイーン / ♦ キング / ♣ エース)。使うと絵柄が1つ進む
//   ■ ワープ(カルタ)        技に warp: 'behind'(相手の後ろへ) / 'swap'(相手と位置を入れかえる) … 発生の瞬間に移動する
//   ■ 回復                   技に heal: 数値 … 発生の瞬間に自分の体力が戻る
//   ■ 技の中身の切りかえ     技に variants: [ {上書き}, ... ] … suitPick なら次の絵柄の順番で、そうでなければゲーム用の乱数で1つ選ぶ
// ============================================================

const AIR_DASH = { frames: 14, speed: 9.5, attackFrom: 5 };
const CHILL = { max: 100, slow: 50, slowMul: 0.8, freeze: 34, immune: 120, decayDelay: 50, decay: 0.3, guardMul: 1 / 3, shatterMul: 1.4, shatterBonus: 4 };
const SEED_MAX = 3;
const FINISH = { hp: 0.3, mul: 1.5 };     // 決め技(技の finish: true。カルタのカードの刃): 相手の体力がこの割合以下ならダメージ × mul
const LUCK_SUITS = [
  { s: '♠', name: 'スペード', c: '#9fb4ff', mul: 1.5 },
  { s: '♥', name: 'ハート', c: '#ff5a7a', heal: 4 },
  { s: '♦', name: 'ダイヤ', c: '#ffb43a', sp: 10 },
  { s: '♣', name: 'クラブ', c: '#7aff9a', stun: 10 },
];

// ---- 毎F(upd から。両方のキャラ) ----
function elemTick(A, B) {
  for (const p of [A, B]) {
    const o = p === A ? B : A;
    chillStep(p);
    heatStep(p);
    photoStep(p);
  }
}

// ---- 空中ダッシュ ----
function airDashStart(p, dir) {
  p.st = 'dash';
  p.t = 0;
  p.dd = dir;
  p.bd = false;
  p.airDash = true;
  p.adn = (p.adn | 0) + 1;
  p.vy = 0;
  fx.push({ k: 'e', type: 'gust', x: p.x - dir * 20, y: p.y - 60, f: dir, t: 16, l: 16, dl: 0, r: 46, c: '#bff5e6', c2: '#ffffff', w: 3, seed: R() * 1000 });
}
// dash の処理の中(script.js step)。戻り値 true = 空中ダッシュとして処理した
function airDashStep(p, i) {
  if (!p.airDash) return false;
  p.t++;
  p.vx = p.dd * AIR_DASH.speed * Math.max(0.35, 1 - p.t / (AIR_DASH.frames + 6));
  p.vy = 0;                                                          // ほとんど落ちない(このあと重力の分だけ少し下がる)
  if (p.t % 3 === 0) PT.push({ x: p.x - p.dd * 24, y: p.y - 40 - R() * 50, vx: -p.dd * 2, vy: 0, t: 12, l: 12, c: '#d8fff2', g: 0, s: 0.45 });
  if (p.t > AIR_DASH.frames) { p.st = 'idle'; p.airDash = false; }
  else if (p.t >= AIR_DASH.attackFrom && (i.at || i.sp)) { p.airDash = false; begin(p, pick(p, i)); }
  return true;
}

// ---- 凍結 ----
function chillAdd(p, o, amt, guarded) {
  if (!amt || !o || !o.ch || o.hp <= 0) return;
  if ((o.chillCD | 0) > 0 || o.frz > 0) return;
  o.chill = Math.min(CHILL.max, (o.chill || 0) + amt * (guarded ? CHILL.guardMul : 1));
  o.chillT = 0;
  if (o.chill >= CHILL.max && !guarded) freezeStart(o);
}
function freezeStart(o) {
  o.frz = CHILL.freeze;
  o.chill = 0;
  o.chillCD = CHILL.freeze + CHILL.immune;
  o.st = 'hit';
  o.t = Math.max(o.t | 0, CHILL.freeze);
  o.hitStunFull = o.t;
  o.airStunCanExpire = true;
  o.vx *= 0.3;
  fx.push({ k: 'txt', text: 'FREEZE!', x: o.x, y: o.y - 160, t: 40, l: 40, c: '#bfefff', s: 22 });
  fx.push({ k: 'e', type: 'icicle', x: o.x, y: Math.min(GY, o.y), f: 1, t: 22, l: 22, dl: 0, r: 70, c: '#9fe6ff', c2: '#ffffff', n: 7, seed: R() * 1000 });
  for (let k = 0; k < 14; k++) PT.push({ x: o.x + (R() - 0.5) * 50, y: o.y - R() * 110, vx: (R() - 0.5) * 3, vy: -R() * 2, t: 22, l: 22, c: R() < 0.5 ? '#ffffff' : '#9fe6ff', g: 0.05, s: 0.6 });
}
// 凍った相手に当てた: 氷が砕ける(shatter の技なら大ダメージ)。戻り値 = ダメージの倍率
function shatterCheck(p, o, m) {
  if (!(o.frz > 0)) return 1;
  o.frz = 0;
  fx.push({ k: 'e', type: 'icicle', x: o.x, y: Math.min(GY, o.y), f: 1, t: 16, l: 16, dl: 0, r: 60, c: '#e0f8ff', c2: '#ffffff', n: 5, seed: R() * 1000, burst: 1 });
  for (let k = 0; k < 18; k++) {
    const a = R() * Math.PI * 2, s = 2 + R() * 5;
    PT.push({ x: o.x, y: o.y - 60, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2, t: 26, l: 26, c: R() < 0.5 ? '#ffffff' : '#a8ecff', g: 0.25, s: 0.7 });
  }
  if (!m.shatter) return 1;
  fx.push({ k: 'txt', text: 'SHATTER!', x: o.x, y: o.y - 170, t: 44, l: 44, c: '#e8fbff', s: 24 });
  if (save.cfg.shake) { shakeT = Math.max(shakeT, 10); shakeP = Math.max(shakeP, 6); }
  return CHILL.shatterMul;
}
function chillStep(p) {
  if (p.chillCD > 0) p.chillCD--;
  if (p.frz > 0) {
    p.frz--;
    if (p.st !== 'hit') p.frz = 0;                                   // 投げられた・K.O. などで硬直が解けた
    else { p.t = Math.max(p.t, 1); p.vx *= 0.85; }
    if (p.frz === 0 && p.st === 'hit') p.t = Math.min(p.t, 2);
  }
  if (p.chill > 0) {
    if ((p.chillT = (p.chillT | 0) + 1) > CHILL.decayDelay) p.chill = Math.max(0, p.chill - CHILL.decay);
    if (R() < p.chill / 300) PT.push({ x: p.x + (R() - 0.5) * 40, y: p.y - 20 - R() * 90, vx: 0, vy: 0.4 + R() * 0.6, t: 20, l: 20, c: R() < 0.5 ? '#ffffff' : '#bfefff', g: 0, s: 0.4 });
  }
}
const chillSlow = (p) => ((p.chill || 0) >= CHILL.slow ? CHILL.slowMul : 1);

// ---- 熱(オーバーヒート) ----
function heatAdd(p, m) {
  const H = p.ch.ht;
  if (!H || !m) return;
  if (m.vent) {
    p.heat = 0; p.oh = 0;
    fx.push({ k: 'txt', text: 'HEAT 0', x: p.x, y: p.y - 150, t: 30, l: 30, c: '#9ff', s: 16 });
    return;
  }
  if (!(m.heat > 0)) return;
  p.heat = Math.min(H.max, (p.heat || 0) + m.heat);
  if (p.heat >= H.max && !(p.oh > 0)) {
    p.oh = H.lock;
    fx.push({ k: 'txt', text: 'OVERHEAT!', x: p.x, y: p.y - 165, t: 46, l: 46, c: '#ff6a3a', s: 22 });
    fx.push({ k: 'e', type: 'steam', x: p.x, y: p.y - 70, f: p.f, t: 30, l: 30, dl: 0, r: 60, c: '#e8eef4', c2: '#ffffff', n: 10, seed: R() * 1000 });
  }
}
// オーバーヒート中に heat の技を出そうとした → 代わりの技(地上 n / 空中 an)
function heatBlock(p, k) {
  const m = p.ch.mv[k];
  if (!p.ch.ht || !(p.oh > 0) || !m || !(m.heat > 0) || m.vent) return k;
  if (trShowText() || R() < 0.5) fx.push({ k: 'txt', text: 'オーバーヒート中', x: p.x, y: p.y - 140, t: 24, l: 24, c: '#ff9a6a', s: 14 });
  return p.y < GY ? 'an' : 'n';
}
function heatStep(p) {
  const H = p.ch && p.ch.ht;
  if (!H) return;
  if (p.oh > 0) {
    if (--p.oh <= 0) { p.heat = 0; fx.push({ k: 'txt', text: 'COOL DOWN', x: p.x, y: p.y - 150, t: 30, l: 30, c: '#9ff', s: 15 }); }
    if (R() < 0.35) PT.push({ x: p.x + (R() - 0.5) * 30, y: p.y - 70 - R() * 40, vx: (R() - 0.5) * 1.2, vy: -1.2 - R(), t: 26, l: 26, c: R() < 0.5 ? '#f4f6f8' : '#c8d0d8', g: -0.02, s: 0.9 });
  } else if (p.heat > 0) {
    p.heat = Math.max(0, p.heat - H.decay * (p.st === 'idle' ? 1.4 : 1));
    if (p.heat > H.max * 0.7 && R() < 0.12) PT.push({ x: p.x - p.f * 14, y: p.y - 80, vx: -p.f * 0.5, vy: -1, t: 18, l: 18, c: '#ffb070', g: -0.02, s: 0.6 });
  }
}

// ---- 光合成 ----
function photoStep(p) {
  const P = p.ch && p.ch.photo;
  if (!P || p.hp <= 0 || ko > 0) return;
  const still = p.st === 'idle' && p.y >= GY && Math.abs(p.vx) < 0.6 && !p.dn;
  p.still = still ? (p.still | 0) + 1 : 0;
  if (p.still > (P.delay ?? 40) && p.hp < p.ch.hp) {
    p.hp = Math.min(p.ch.hp, p.hp + (P.rate ?? 0.04));
    if (R() < 0.18) PT.push({ x: p.x + (R() - 0.5) * 44, y: p.y - 10 - R() * 100, vx: 0, vy: -0.6 - R() * 0.6, t: 30, l: 30, c: R() < 0.6 ? '#9dff7a' : '#fff6a0', g: 0, s: 0.5 });
  }
}

// ---- カードの順番 ----
//  次の絵柄の番号(0=♠ 1=♥ 2=♦ 3=♣)を返して、1つ進める
function nextSuit(p) {
  const i = (p.suitIdx | 0) % 4;
  p.suitIdx = (i + 1) % 4;
  return i;
}
//  当たったカードの効果。m.suit = そのカードの絵柄の番号(弾を投げた瞬間に決まる)
//  戻り値: { mul, heal, sp, stun, text, c } (当たったときの効果)
function luckRoll(m) {
  if (!m || m.suit == null) return null;
  const S = LUCK_SUITS[m.suit & 3];
  return { mul: S.mul || 1, heal: S.heal || 0, sp: S.sp || 0, stun: S.stun || 0, text: S.s + ' ' + S.name, c: S.c, suit: S.s };
}
function luckApply(L, owner, o, x, y) {
  if (!L) return;
  if (L.heal && owner && owner.ch && owner.hp > 0) owner.hp = Math.min(owner.ch.hp, owner.hp + L.heal);
  if (L.sp && owner && owner.ch && typeof spGain === 'function') spGain(owner, L.sp);
  if (L.stun && o.st === 'hit') o.t += L.stun;
  fx.push({ k: 'txt', text: L.text, x, y: y - 40, t: 34, l: 34, c: L.c, s: 17 });
  fx.push({ k: 'e', type: 'cards', x, y, f: 1, t: 18, l: 18, dl: 0, r: 34, c: L.c, c2: '#ffffff', n: 4, seed: R() * 1000, text: L.suit || '' });
}

// ---- 技の発生の瞬間(script.js step から): ワープ・回復・開花 ----
function elemOnStartup(p, m, o) {
  if (m.warp && o) {
    const from = p.x;
    if (m.warp === 'swap') {
      const ox = o.x;
      o.x = p.x;
      p.x = ox;
      o.f = p.x > o.x ? 1 : -1;
    } else {
      const side = o.x >= p.x ? 1 : -1;                             // 相手の向こう側
      let nx = o.x + side * 62;
      if (nx < 30 || nx > W - 30) nx = o.x - side * 62;              // 壁際で入れないときは手前に
      p.x = Math.max(30, Math.min(W - 30, nx));
    }
    p.f = o.x > p.x ? 1 : -1;
    p.vx = 0;
    for (const x of [from, p.x]) fx.push({ k: 'e', type: 'cards', x, y: p.y - 60, f: 1, t: 20, l: 20, dl: 0, r: 46, c: '#e33a5a', c2: '#ffffff', n: 8, seed: R() * 1000 });
  }
  if (m.heal > 0 && p.hp > 0) {
    const h0 = p.hp;
    p.hp = Math.min(p.ch.hp, p.hp + m.heal);
    if (p.hp > h0) fx.push({ k: 'txt', text: '回復 +' + Math.round(p.hp - h0), x: p.x, y: p.y - 150, t: 36, l: 36, c: '#8dff7a', s: 17 });
  }
  if (m.bloom) seedBloom(p);
}

// ---- 種 ----
function seedLimit(p) {
  const mine = PJ.filter((j) => j.own === p && j.P && j.P.type === 'seed');
  while (mine.length > SEED_MAX) {
    const j = mine.shift();
    j.life = 0;
    j.gone = true;
  }
}
// 自分の芽を全部「開花」させる: 大きくはじけて、まわりに当たる
function seedBloom(p) {
  let n = 0;
  for (const j of PJ) {
    if (j.own !== p || !j.P || j.P.type !== 'seed' || j.burst) continue;
    j.burst = true;
    j.planted = true;
    j.vx = j.vy = 0;
    j.y = GY - 30;
    j.r = 46;
    j.d = 9;
    j.ky = -10;
    j.kx = 3;
    j.life = 8;
    j.pass = null;
    n++;
    fx.push({ k: 'e', type: 'bloom', x: j.x, y: GY - 10, f: 1, t: 20, l: 20, dl: 0, r: 46, c: '#ff8ac8', c2: '#fff6a0', n: 8, flat: true, add: true, spin: 0, grow: 1, seed: R() * 1000 });
    fx.push({ k: 'e', type: 'leaves', x: j.x, y: GY - 30, f: 1, t: 30, l: 30, dl: 0, r: 50, c: '#6ad04a', c2: '#c8ff7a', n: 10, seed: R() * 1000 });
  }
  if (!n) fx.push({ k: 'txt', text: '芽がない', x: p.x, y: p.y - 140, t: 24, l: 24, c: '#9c9', s: 14 });
}

// ---- 見た目(draw の中) ----
// 凍ったキャラの氷・冷えのしるし(キャラを描いたあとに重ねる)
function drawElementsOver() {
  for (const p of [A, B]) {
    if (!p) continue;
    if (p.frz > 0) {
      const k = Math.min(1, p.frz / 8), h = 128 * (p.ch && p.ch.sc ? 1 : 1), x = p.x, y = p.y;
      g.save();
      g.globalAlpha = 0.55 * k;
      const gr = g.createLinearGradient(x - 40, y - h, x + 40, y);
      gr.addColorStop(0, '#e8fbff');
      gr.addColorStop(0.5, '#9fdcff');
      gr.addColorStop(1, '#bff0ff');
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(x - 34, y + 2); g.lineTo(x - 42, y - h * 0.55); g.lineTo(x - 22, y - h); g.lineTo(x + 18, y - h - 8);
      g.lineTo(x + 40, y - h * 0.6); g.lineTo(x + 34, y + 2);
      g.closePath();
      g.fill();
      g.globalAlpha = 0.9 * k;
      g.strokeStyle = '#ffffff';
      g.lineWidth = 2;
      g.stroke();
      g.globalAlpha = 0.6 * k;
      g.beginPath();
      g.moveTo(x - 20, y - h * 0.85); g.lineTo(x - 8, y - h * 0.5);
      g.moveTo(x + 14, y - h * 0.9); g.lineTo(x + 22, y - h * 0.65);
      g.stroke();
      g.restore();
    }
  }
}
