// ============================================================
// projectile.js … 飛び道具(弾)の見た目・エフェクト・軌道
//   キャラの projectile に look(見た目のプリセット) と path(軌道) を書くと、弾の見た目と飛び方が変わる
//   見た目のプリセットはこのファイルの PROJECTILE_LOOKS、軌道の種類は PROJECTILE_PATHS
//   書き方の説明は setting.js の「飛び道具の見た目・軌道」
//   読み込み順: character.js → drawing_template.js → drawing_character.js → drawing.js → effect.js → projectile.js → training.js → script.js
//   使っている script.js の変数・関数: g / PJ / PT / fx / R / W / GY / fr / SK / applyHit / hitPartForRect
//   使っている effect.js の変数・関数: spawnEffect(エフェクトの部品) / fireEmit・FIRE(炎) / DUST(きらきら)
// ============================================================

// ---- 見た目のプリセット ----
//  character.js で projectile: { look: 'darkOrb' } のように名前で使う。{ look: { preset: 'darkOrb', color: '#4cf' } } で一部だけ変えられる
//  color / color2 … 色(書かないとキャラのスキンの色) / size … 弾の絵の大きさ(radius に対する倍率。当たり判定は変わらない)
//  body   … 弾の絵。部品(下の「弾の絵の部品」)の一覧。上から順に重ねて描く
//  spin   … 回る速さ(1Fあたりの角度。rad) / face: 'velocity' … 飛んでいる向きに絵を傾ける(放物線・追尾で向きが変わる弾に)
//  pulse  … 大きさがゆらぐ量(0〜。0.1 で ±10%) / glow … 外側の光のにじみの大きさ(0 で無し)
//  trail  … 弾の後ろに残る物(下の「軌跡」。1つでも一覧でもよい)
//  spawn  … 撃った瞬間のエフェクト / hit … 当たった瞬間 / vanish … 消えたとき(寿命・地面) / reflect … ジャストガードで跳ね返されたとき
//           中身は技のエフェクトと同じ「部品」の一覧(setting.js の「技のエフェクト」。slash / ring / burst / flame / star / particles / shake など)
//           at は書かなくてよい(弾のいる場所に出る)
//
//  ■ 弾の絵の部品 (body の中)  type と、size(大きさの倍率) color color2 alpha(不透明度) add(true で光る重ね方) x y(ずらす) spin(この部品だけ回す)
//    orb      … 光の玉(外側のにじみ+芯+白い中心)
//    ring     … 輪 (width=太さ)
//    star     … 星 (points=とげの数 inner=くぼみの深さ 0〜1)
//    crescent … 三日月 (thick=太さ 0〜1)
//    blade    … 剣気の刃(縦に長い三日月。斬撃の衝撃波)
//    kunai    … 苦無(とがった刃と柄)
//    arrow    … 矢
//    shuriken … 手裏剣(とげ4本。spin と使う)
//    rock     … 岩(ごつごつした多角形)
//    bolt     … 雷の玉(ぎざぎざの稲妻が毎F変わる。count=稲妻の数)
//    flame    … 炎のかたまり(ゆらめく)
//    heart    … ハート
//    shard    … 氷のかけら(細長いひし形)
//    wave     … 地面を走る衝撃波(半円の波。path: 'ground' と使う)
//    petal    … 花びら(spin と使うと、くるくる回って飛ぶ)
//    sun      … 太陽(とがった光の筋と輪。points=筋の数)
//
//  ■ 軌跡 (trail の中)  type と、color color2 rate(1Fに出す量) life(残る時間F) size
//    particles … 粒が後ろに散る (spread=ばらつき gravity=重さ)
//    sparkle   … きらきら光る粉(ふわっと昇る)
//    fire      … 炎の尾(火の粉。rise=昇る速さ smoke=煙の割合)
//    smoke     … 煙の尾
//    ghost     … 弾の残像 (count=残像の数 gap=間隔F)
//    line      … 光の帯 (length=長さF width=太さの倍率)
const PROJECTILE_LOOKS = {
  // 今までの見た目(色の玉 + 粒)。look を書かないキャラはこれ
  basic: {
    body: [{ type: 'orb' }],
    trail: { type: 'particles', rate: 1, life: 12 },
  },
  // 火の玉: 炎のかたまり + 炎の尾。当たると炎がはじける
  fireball: {
    color: '#ff8a3a', color2: '#ffe08a', glow: 1.4, pulse: 0.08,
    body: [{ type: 'flame', size: 1.1 }, { type: 'orb', size: 0.55, color: '#ffd36b', add: true }],
    trail: [{ type: 'fire', rate: 2.5, life: 18, size: 0.8 }, { type: 'particles', rate: 0.5, life: 14, gravity: -0.05 }],
    spawn: [{ type: 'flash', r: 26, duration: 8, blend: 'add' }, { type: 'particles', count: 6, speed: 4 }],
    hit: [{ type: 'flame', r: 34, duration: 14 }, { type: 'burst', r: 30, duration: 9 }],
    vanish: [{ type: 'particles', count: 8, dir: 'up', speed: 2, gravity: -0.04, life: 20 }],
  },
  // 衝撃波: 地面を走る波(path: 'ground' と組み合わせる)
  shockwave: {
    color: '#ffcf6b', color2: '#fff4d0', glow: 0.6,
    body: [{ type: 'wave', size: 1.3 }],
    trail: [{ type: 'particles', rate: 1.5, life: 16, gravity: 0.2, spread: 1.4 }],
    spawn: [{ type: 'wave', r: 40, width: 6 }, { type: 'shake', duration: 6, power: 3 }],
    hit: [{ type: 'impact', r: 36 }, { type: 'debris', count: 5 }],
    vanish: [{ type: 'debris', count: 4, r: 5 }],
  },
  // 気弾(空気の塊): 三日月の衝撃 + 輪 + 残像。まっすぐ飛ぶ衝撃波
  pressure: {
    color: '#ffcf6b', color2: '#fff4d0', glow: 1,
    body: [{ type: 'crescent', size: 1.25, thick: 0.32, add: true }, { type: 'ring', size: 0.85, alpha: 0.5, width: 3 }],
    trail: { type: 'ghost', count: 3, gap: 2 },
    spawn: [{ type: 'ring', r: 30, width: 5, flat: true }, { type: 'shake', duration: 5, power: 2 }],
    hit: [{ type: 'impact', r: 36 }, { type: 'shake', duration: 6, power: 4 }],
    vanish: [{ type: 'ring', r: 24, width: 3, duration: 10 }],
  },
  // 苦無: 飛んでいる向きを向く刃 + 細い光の帯
  kunai: {
    color: '#d8d8f0', color2: '#ffffff', face: 'velocity', glow: 0,
    body: [{ type: 'kunai', size: 1.6 }],
    trail: { type: 'line', length: 6, width: 0.35, color: '#c6f' },
    spawn: [{ type: 'lines', count: 3, length: 40 }],
    hit: [{ type: 'cross', r: 18, duration: 8 }, { type: 'particles', count: 5, speed: 4 }],
  },
  // 雷の玉: ぎざぎざの稲妻が走る
  bolt: {
    color: '#ffe95a', color2: '#ffffff', glow: 1.6, pulse: 0.15,
    body: [{ type: 'orb', size: 0.7, add: true }, { type: 'bolt', count: 4, size: 1.3 }],
    trail: [{ type: 'line', length: 5, width: 0.5 }, { type: 'particles', rate: 0.6, life: 10, spread: 2 }],
    spawn: [{ type: 'spark', length: 50 }],
    hit: [{ type: 'spark', length: 60 }, { type: 'star', count: 3, r: 16, spin: 2 }],
    vanish: [{ type: 'flash', r: 20, duration: 6, blend: 'add' }],
  },
  // 剣気: 縦に長い光の刃 + 残像
  swordWave: {
    color: '#9fd8ff', color2: '#ffffff', glow: 0.8,
    body: [{ type: 'blade', size: 2.4 }],
    trail: { type: 'ghost', count: 3, gap: 2 },
    spawn: [{ type: 'slash', r: 40, width: 10, span: 2.4 }],
    hit: [{ type: 'slash', r: 34, width: 10 }, { type: 'particles', count: 6, speed: 5 }],
    vanish: [{ type: 'particles', count: 6, dir: 'forward', speed: 3, life: 14 }],
  },
  // 岩: ごろごろ回る岩。当たると砕ける
  stone: {
    color: '#8a7a68', color2: '#c9b89c', spin: 0.12, glow: 0,
    body: [{ type: 'rock', size: 1.05 }],
    trail: { type: 'particles', rate: 0.8, life: 18, gravity: 0.25, color: '#9a8a74' },
    spawn: [{ type: 'debris', count: 4, r: 5 }],
    hit: [{ type: 'debris', count: 8, r: 8 }, { type: 'impact', r: 34 }, { type: 'shake', duration: 6, power: 4 }],
    vanish: [{ type: 'debris', count: 6, r: 7 }],
  },
  // 炎のブレス: 短く大きな炎
  breath: {
    color: '#ff6a2a', color2: '#ffd36b', glow: 1.2, pulse: 0.2,
    body: [{ type: 'flame', size: 1.4 }],
    trail: [{ type: 'fire', rate: 4, life: 16, size: 1, smoke: 0.25 }],
    spawn: [{ type: 'flame', r: 26, dir: 'forward', duration: 12 }],
    hit: [{ type: 'flame', r: 40, duration: 14 }, { type: 'shake', duration: 5, power: 3 }],
    vanish: [{ type: 'particles', count: 6, dir: 'up', speed: 2, gravity: -0.05, life: 16 }],
  },
  // 血風刃: 深紅の三日月の刃。後ろに血のしずくをしたたらせ、当たると血が噴き出す(バーサク)
  bloodWave: {
    color: '#c8102e', color2: '#ff8a8a', glow: 0.9, pulse: 0.12,
    body: [{ type: 'crescent', size: 1.5, thick: 0.38 }, { type: 'crescent', size: 1.15, thick: 0.18, color: '#ff5a64', add: true }],
    trail: [{ type: 'particles', rate: 1.6, life: 22, gravity: 0.32, spread: 0.6, color: '#8a0012' }, { type: 'ghost', count: 2, gap: 2 }],
    spawn: [{ type: 'claw', r: 34, width: 7 }, { type: 'blood', count: 6, speed: 4 }],
    hit: [{ type: 'impact', r: 34, color: '#4a0010', color2: '#ff4a5a' }, { type: 'blood', count: 12, dir: 'all', speed: 6 }, { type: 'shake', duration: 5, power: 3 }],
    vanish: [{ type: 'blood', count: 7, speed: 2.5, dir: 'down', spread: 1.2 }],
  },
  // 闇の弾: 紫の玉の外側を三日月が回り、きらきらした粉を残す
  darkOrb: {
    color: '#9a3ad0', color2: '#ffb3ea', glow: 1.8, pulse: 0.1,
    body: [
      { type: 'orb', size: 1 },
      { type: 'crescent', size: 1.45, spin: 0.08, color: '#ff7ac0', alpha: 0.85, thick: 0.25 },
      { type: 'star', size: 0.45, spin: -0.05, color: '#fff', points: 4, inner: 0.35, add: true },
    ],
    trail: [{ type: 'sparkle', rate: 1.2, life: 36, color: '#ff7ac0', color2: '#e9d8ff' }, { type: 'line', length: 8, width: 0.6 }],
    spawn: [{ type: 'ring', r: 26, width: 4, duration: 12 }, { type: 'heart', r: 10, duration: 12, y: -24 }],
    hit: [{ type: 'heart', r: 18, duration: 14 }, { type: 'ring', r: 34, width: 5 }, { type: 'particles', count: 10, dir: 'all', speed: 4 }],
    vanish: [{ type: 'ring', r: 22, width: 3, duration: 14 }, { type: 'particles', count: 8, dir: 'all', speed: 2, gravity: -0.03, life: 24 }],
  },
  // ---- 水(ルリ) ----
  // 水弾: 飛ぶ向きに伸びた水のかたまり。しずくを散らし、当たると弾ける
  waterBolt: {
    color: '#4fc3ff', color2: '#e8fbff', face: 'velocity', glow: 0.9, pulse: 0.08,
    body: [{ type: 'orb', size: 0.95 }, { type: 'shard', size: 1.5, color: '#bff0ff', alpha: 0.75 }],
    trail: [{ type: 'particles', rate: 1.3, life: 14, gravity: 0.22, spread: 0.6 }, { type: 'line', length: 6, width: 0.55 }],
    spawn: [{ type: 'drops', count: 5, speed: 4, dir: 'forward', spread: 0.5 }, { type: 'ring', r: 18, width: 3, duration: 8 }],
    hit: [{ type: 'drops', count: 10, speed: 5, dir: 'all' }, { type: 'ring', r: 26, width: 4 }],
    vanish: [{ type: 'drops', count: 6, speed: 2.5, dir: 'down', spread: 1 }],
  },
  // 水の輪: くるくる回る水の輪(今は使っていない見本)
  waterRing: {
    color: '#2f8cff', color2: '#dff7ff', spin: 0.25, glow: 1, pulse: 0.1,
    body: [{ type: 'ring', size: 1.25, width: 4.5 }, { type: 'crescent', size: 1.1, thick: 0.3, color: '#bff0ff', alpha: 0.85 }, { type: 'orb', size: 0.45, alpha: 0.6 }],
    trail: [{ type: 'ghost', count: 3, gap: 2 }, { type: 'particles', rate: 1, life: 14, gravity: 0.2 }],
    spawn: [{ type: 'ring', r: 24, width: 4, duration: 10 }],
    hit: [{ type: 'drops', count: 12, speed: 5, dir: 'all' }, { type: 'impact', r: 28, color: '#2f8cff', color2: '#e8fbff' }],
    vanish: [{ type: 'drops', count: 6, speed: 2.5, dir: 'down', spread: 1 }],
  },
  // 水まといの追撃: 浮いた水から飛ぶ小さな水弾
  aquaDrop: {
    color: '#6fdcff', color2: '#ffffff', face: 'velocity', glow: 1.1,
    body: [{ type: 'orb', size: 0.95 }, { type: 'shard', size: 1.3, color: '#e8fbff', alpha: 0.7 }],
    trail: [{ type: 'line', length: 5, width: 0.5 }, { type: 'particles', rate: 0.8, life: 12, gravity: 0.2 }],
    hit: [{ type: 'drops', count: 7, speed: 4, dir: 'all' }, { type: 'ring', r: 20, width: 3 }],
    vanish: [{ type: 'drops', count: 4, speed: 2, dir: 'down' }],
  },
  // 水まといの追撃: 相手の場所で水が弾ける
  aquaBurst: {
    color: '#4fc3ff', color2: '#ffffff', glow: 1.2, pulse: 0.35,
    body: [{ type: 'ring', size: 1.1, width: 5, alpha: 0.85 }, { type: 'orb', size: 0.8, alpha: 0.55 }],
    spawn: [{ type: 'flash', r: 40, blend: 'add', duration: 6 }, { type: 'burst', r: 40, count: 10 }, { type: 'drops', count: 12, speed: 6, dir: 'all' }],
    hit: [{ type: 'impact', r: 30, color: '#2f8cff', color2: '#e8fbff' }],
  },
  // 水まといの追撃: 足元から噴き上がる水柱(水柱の絵は aquaFire が出す)
  aquaGeyser: {
    color: '#2f8cff', color2: '#dff7ff', glow: 0,
    body: [],
    hit: [{ type: 'drops', count: 10, speed: 6, dir: 'up', spread: 0.8 }],
  },
  // 水まといの追撃: 地面を走る水の波
  aquaWave: {
    color: '#3aa8ff', color2: '#e8fbff', glow: 0.6,
    body: [{ type: 'wave', size: 1.3 }],
    trail: [{ type: 'particles', rate: 2, life: 16, gravity: 0.25, spread: 1.2 }],
    spawn: [{ type: 'drops', count: 6, speed: 4, dir: 'up' }],
    hit: [{ type: 'drops', count: 10, speed: 6, dir: 'up', spread: 0.8 }, { type: 'impact', r: 26, color: '#2f8cff', color2: '#e8fbff' }],
    vanish: [{ type: 'drops', count: 6, speed: 3, dir: 'up' }],
  },
  // ---- 光(アサカ) ----
  // 陽光の矢: とても速く短い光の矢。光の帯ときらめきを残し、当たると小さな光の花が咲く
  sunRay: {
    color: '#ffc83a', color2: '#fffbe0', face: 'velocity', glow: 1.3, pulse: 0.1,
    body: [{ type: 'orb', size: 0.75, add: true }, { type: 'shard', size: 2.3, color: '#fff3b0', add: true }, { type: 'sun', size: 0.9, spin: 0.25, alpha: 0.8 }],
    trail: [{ type: 'line', length: 9, width: 0.75 }, { type: 'sparkle', rate: 0.7, life: 22, color: '#ffe27a', color2: '#ffffff' }],
    spawn: [{ type: 'flash', r: 26, blend: 'add', duration: 6 }, { type: 'bloom', r: 18, count: 6, duration: 10, blend: 'add' }],
    hit: [{ type: 'bloom', r: 26, count: 8, duration: 14, blend: 'add' }, { type: 'petals', count: 6, dir: 'all', speed: 3 }, { type: 'flash', r: 28, blend: 'add', duration: 8 }],
    vanish: [{ type: 'flash', r: 20, blend: 'add', duration: 8 }, { type: 'petals', count: 4, dir: 'all', speed: 1.5 }],
    reflect: [{ type: 'flash', r: 24, blend: 'add', duration: 8 }],
  },
  // 光の花びら: くるくる回りながら飛ぶ大きな花びら(ソーラーペタル)
  sunPetal: {
    color: '#ffd84a', color2: '#fffbe0', spin: 0.3, glow: 1.1, pulse: 0.08,
    body: [{ type: 'petal', size: 1.5 }, { type: 'petal', size: 1.1, color: '#fff3c0', alpha: 0.85, spin: -0.3, add: true }, { type: 'orb', size: 0.35, add: true }],
    trail: [{ type: 'ghost', count: 3, gap: 2 }, { type: 'sparkle', rate: 0.6, life: 26, color: '#ffe27a' }],
    hit: [{ type: 'bloom', r: 22, count: 6, duration: 12, blend: 'add' }, { type: 'petals', count: 6, dir: 'all', speed: 3 }],
    vanish: [{ type: 'petals', count: 5, dir: 'all', speed: 1.5 }],
  },
  // ---- 風(ハヤテ) ----
  // 鎌鼬: 回りながら飛ぶ風の刃。行って戻ってくる(boomerang)
  windBlade: {
    color: '#9ff0d6', color2: '#ffffff', spin: 0.45, glow: 0.9, pulse: 0.06,
    body: [{ type: 'crescent', size: 1.4, thick: 0.35 }, { type: 'crescent', size: 1.0, color: '#ffffff', alpha: 0.7, spin: 0.3, thick: 0.25, add: true }],
    trail: [{ type: 'ghost', count: 3, gap: 2 }, { type: 'particles', rate: 0.6, life: 14, gravity: 0, color: '#e8fff6' }],
    spawn: [{ type: 'gust', r: 30, duration: 10 }],
    hit: [{ type: 'gust', r: 34, duration: 12 }, { type: 'cross', r: 18, duration: 8 }],
    vanish: [{ type: 'gust', r: 24, duration: 10 }],
  },
  // 竜巻: その場で止まって浮き上がる(rise)。何回も当たる
  tornado: {
    color: '#bff5e6', color2: '#ffffff', glow: 0.6,
    body: [{ type: 'tornado', size: 1.25 }],
    trail: [{ type: 'particles', rate: 1.2, life: 18, gravity: -0.12, spread: 1.2, color: '#e8fff6' }],
    spawn: [{ type: 'gust', r: 40, duration: 14 }, { type: 'ring', flat: true, r: 34, duration: 12 }],
    hit: [{ type: 'gust', r: 30, duration: 10 }],
    vanish: [{ type: 'gust', r: 40, duration: 14 }],
  },
  // ---- 氷(セツカ) ----
  // 氷槍: だんだん速くなる長い氷のやり
  iceLance: {
    color: '#9fe6ff', color2: '#ffffff', face: 'velocity', glow: 1, pulse: 0.04,
    body: [{ type: 'shard', size: 2.6 }, { type: 'shard', size: 1.6, color: '#ffffff', alpha: 0.75, add: true }],
    trail: [{ type: 'line', length: 7, width: 0.5, color: '#cff4ff' }, { type: 'sparkle', rate: 0.8, life: 24, color: '#e8fbff', color2: '#9fe6ff' }],
    spawn: [{ type: 'snow', r: 26, count: 6, duration: 16 }],
    hit: [{ type: 'icicle', r: 26, count: 4, duration: 16, color: '#9fe6ff', color2: '#ffffff' }, { type: 'snow', r: 30, count: 8, duration: 20 }],
    vanish: [{ type: 'snow', r: 22, count: 5, duration: 16 }],
  },
  // 氷河走り: 地面を這う氷の波
  frostWave: {
    color: '#9fe6ff', color2: '#ffffff', glow: 0.5,
    body: [{ type: 'wave', size: 1.1 }],
    trail: [{ type: 'particles', rate: 1.5, life: 26, gravity: -0.02, color: '#e8fbff' }],
    hit: [{ type: 'icicle', r: 30, count: 5, duration: 18 }],
    vanish: [{ type: 'snow', r: 26, count: 6, duration: 18 }],
  },
  // ---- 草(シゲル) ----
  seed: {
    color: '#7ad04a', color2: '#ff8ac8', glow: 0.3,
    body: [{ type: 'seed', size: 1.1 }],
    trail: [{ type: 'particles', rate: 0.3, life: 12, gravity: 0.1, color: '#c8ff7a' }],
    hit: [{ type: 'leaves', r: 30, count: 8, duration: 26 }, { type: 'thorns', r: 22, count: 3, duration: 14, color: '#3a7a2a', color2: '#bff07a' }],
    vanish: [{ type: 'leaves', r: 18, count: 4, duration: 20 }],
  },
  leafBlade: {
    color: '#6ad04a', color2: '#e8ffb0', spin: 0.35, glow: 0.4,
    body: [{ type: 'petal', size: 1.6 }],
    trail: [{ type: 'ghost', count: 2, gap: 2 }],
    hit: [{ type: 'leaves', r: 24, count: 6, duration: 22 }],
  },
  // ---- 鋼(ギア) ----
  rocketFist: {
    color: '#c8d0da', color2: '#3ad0ff', glow: 0.4,
    body: [{ type: 'fist', size: 1.15 }],
    trail: [{ type: 'fire', rate: 2, life: 14, size: 0.6, color: '#ff8a3a' }, { type: 'smoke', rate: 0.6, life: 20 }],
    spawn: [{ type: 'flash', r: 22, blend: 'add', duration: 6, color: '#ffb070' }, { type: 'steam', r: 24, count: 5, duration: 14 }],
    hit: [{ type: 'impact', r: 30, color: '#ffb040', color2: '#fff8e0' }, { type: 'gear', r: 26, count: 4, duration: 18 }],
  },
  missile: {
    color: '#e8ecf0', color2: '#e03a3a', face: 'velocity', glow: 0.3,
    body: [{ type: 'missile', size: 1.0 }],
    trail: [{ type: 'smoke', rate: 0.7, life: 20, size: 0.6 }, { type: 'particles', rate: 1, life: 8, gravity: 0, color: '#ffb040' }],
    hit: [{ type: 'flame', r: 26, duration: 12, color: '#ff8a3a', color2: '#ffe08a' }, { type: 'burst', r: 26 }, { type: 'gear', r: 22, count: 3 }],
    vanish: [{ type: 'burst', r: 20 }, { type: 'steam', r: 18, count: 4 }],
  },
  // ---- 自由(カルタ) ----
  card: {
    color: '#e0304a', color2: '#ffffff', spin: 0.55, glow: 0.3,
    body: [{ type: 'card', size: 1.3 }],
    trail: [{ type: 'ghost', count: 3, gap: 1 }],
    hit: [{ type: 'cards', r: 24, count: 4, duration: 16 }],
    vanish: [{ type: 'cards', r: 18, count: 3, duration: 14 }],
  },
  dice: {
    color: '#e0304a', color2: '#ffffff', spin: 0.3, glow: 0.2,
    body: [{ type: 'dice', size: 1.0 }],
    trail: [{ type: 'ghost', count: 2, gap: 2 }, { type: 'particles', rate: 0.6, life: 12, gravity: 0.1, color: '#ffe14a' }],
    hit: [{ type: 'cards', r: 30, count: 6, duration: 18 }, { type: 'impact', r: 30 }],
  },
  // ---- 自由に使える見本 ----
  // 星: くるくる回る星 + きらきら
  star: {
    color: '#ffe36b', color2: '#fff', spin: 0.15, glow: 1.2,
    body: [{ type: 'star', size: 1.3 }],
    trail: { type: 'sparkle', rate: 1.5, life: 30 },
    hit: [{ type: 'star', count: 4, r: 20, spin: 2 }],
  },
  // 氷: 飛ぶ向きを向く氷のかけら + 冷気
  ice: {
    color: '#9df', color2: '#fff', face: 'velocity', glow: 0.8,
    body: [{ type: 'shard', size: 1.6 }],
    trail: [{ type: 'particles', rate: 1, life: 16, gravity: 0.05 }, { type: 'ghost', count: 2, gap: 2 }],
    hit: [{ type: 'star', count: 5, r: 18, spin: 3 }, { type: 'particles', count: 10, dir: 'all', speed: 4 }],
  },
  // 手裏剣
  shuriken: {
    color: '#bcc', color2: '#fff', spin: 0.5, glow: 0,
    body: [{ type: 'shuriken', size: 1.3 }],
    trail: { type: 'ghost', count: 2, gap: 1 },
    hit: [{ type: 'cross', r: 16 }],
  },
  // 矢
  arrow: {
    color: '#c9a06a', color2: '#eee', face: 'velocity', glow: 0,
    body: [{ type: 'arrow', size: 2 }],
    trail: { type: 'line', length: 5, width: 0.25, color: '#fff' },
    hit: [{ type: 'burst', r: 18, duration: 8 }],
  },
  // ハート
  heart: {
    color: '#ff5fa2', color2: '#fff', glow: 1.2, pulse: 0.15,
    body: [{ type: 'heart', size: 1.2 }],
    trail: { type: 'sparkle', rate: 1, life: 30, color: '#ff9ccc' },
    hit: [{ type: 'heart', r: 20, duration: 14 }],
  },
};

// ---- 軌道の種類 ----
//  character.js で projectile: { path: 'wave' } のように名前で使う。{ path: { type: 'wave', amp: 30 } } で数値を変えられる
//  すべての軌道で使える: angle … 撃つ角度(度。0=まっすぐ前 / マイナス=上向き / プラス=下向き)
//                        from: { x: 40, y: -70 } … 弾が出る場所(キャラの足元から。x は前方向)
const PROJECTILE_PATHS = {
  straight: {},                                   // まっすぐ飛ぶ(今まで通り)
  wave: { amp: 22, period: 44 },                  // 上下に波打つ。amp=波の高さ(px) period=1往復のF
  arc: { up: 7, gravity: 0.25, bounce: 0, bounceMul: 0.6 }, // 放物線。up=最初の上向きの速さ gravity=重さ bounce=地面で跳ねる回数 bounceMul=跳ねる強さ
  ground: {},                                     // 地面を這う(高さは弾の半径ぶん地面から上。しゃがんでも当たる)
  accel: { start: 0.3, accel: 0.4 },              // だんだん速くなる。start=最初の速さ(speed に対する倍率) accel=1Fに増える速さ(最大 speed)
  stop: { decel: 0.94 },                          // だんだん遅くなって、その場に止まる(設置。寿命まで残る)。decel=1Fごとに速さに掛ける数
  homing: { turn: 0.05, delay: 10 },              // 相手を追いかける。turn=1Fに曲がれる角度(rad) delay=追い始めるまでのF
  boomerang: { back: 0.35 },                      // 前に飛んで戻ってくる(自分の所に戻ると消える)。back=戻る力(大きいほど早く戻る)
  seed: { up: 6, gravity: 0.3, trap: 420 },       // 種(シゲル): 放物線で飛び、地面に落ちると芽になって trap F 残る(踏むと当たる。elements.js)
  rise: { decel: 0.9, lift: 0.6 },                // 竜巻(ハヤテ): 前に進みながら止まり、少しずつ浮き上がる。lift=上がる速さ
};

// ---- ここから下は処理(ふだんは触らなくてOK) ----

// キャラ・技ごとの弾の設定をまとめる(技の projectile: { ... } に書いた値で、キャラの projectile を上書きできる)
function pjSpec(ch, m) {
  const key = '_pj';
  if (m && m[key]) return m[key];
  const raw = { ...(ch.pjRaw || {}), ...((m && m.pjo) || {}) };
  let look = raw.look ?? 'basic';
  if (typeof look === 'string') look = { preset: look };
  const base = PROJECTILE_LOOKS[look.preset || 'basic'] || (console.warn('飛び道具の見た目「' + look.preset + '」がありません(projectile.js の PROJECTILE_LOOKS)'), PROJECTILE_LOOKS.basic);
  look = { ...base, ...look };
  let path = raw.path ?? 'straight';
  if (typeof path === 'string') path = { type: path };
  const pbase = PROJECTILE_PATHS[path.type || 'straight'] || (console.warn('飛び道具の軌道「' + path.type + '」がありません(projectile.js の PROJECTILE_PATHS)'), {});
  path = { type: path.type || 'straight', ...pbase, ...path };
  const s = {
    v: raw.speed ?? 6, d: raw.damage ?? 6, r: raw.radius ?? 12, n: raw.count ?? 1, sp: raw.spread ?? 0, life: raw.life ?? 90,
    kx: raw.knockX ?? 4, ky: raw.knockY ?? -4, hs: raw.hitstun ?? 22,
    hitsN: raw.hits ?? 1, hitEvery: raw.hitEvery ?? 10, chill: raw.chill || 0, luck: raw.luck || null,   // 多段(hits 回まで当たる)/ 凍結 / 運(elements.js)
    from: { x: 40, y: -70, ...(path.from || raw.from || {}) }, look, path,
  };
  if (m) m[key] = s;
  return s;
}

// 弾を作る(撃つ瞬間と、CPU の予測の両方で使う)。tgt=追いかける相手(x, y を持つ物)
function makeProjectiles(ch, m, x, y, f, tgt, own) {
  const s = pjSpec(ch, m), P = s.path, list = [];
  const ang = ((P.angle || 0) * Math.PI) / 180;
  for (let n = 0; n < s.n; n++) {
    const spd = P.type === 'accel' ? s.v * (P.start ?? 0.3) : s.v;
    const j = {
      x: x + f * s.from.x, y: y + s.from.y,
      vx: f * spd * Math.cos(ang), vy: spd * Math.sin(ang) + (n - (s.n - 1) / 2) * s.sp,
      f, f0: f, ni: n, own, tgt, s, P, d: s.d * (own && own.crAtk ? CROUCH_ATTACK : 1), r: s.r, life: s.life, age: 0, spin: 0, hist: [],
    };
    if (P.type === 'ground') { j.y = GY - j.r; j.vy = 0; }
    if (P.type === 'arc' || P.type === 'seed') j.vy -= P.up ?? 7;
    if (P.type === 'wave') { j.bx = j.x; j.by = j.y; j.ph = n * 0.8; }
    list.push(j);
  }
  return list;
}

// 1F 動かす。戻り値 false = 消える(地面に落ちた・ブーメランが戻った)
function stepProjectile(j) {
  const P = j.P;
  j.age++;
  switch (P.type) {
    case 'wave': {
      j.bx += j.vx;
      j.by += j.vy;
      j.x = j.bx;
      j.y = j.by + Math.sin((j.age / (P.period || 44)) * Math.PI * 2 + (j.ph || 0)) * (P.amp ?? 22);
      break;
    }
    case 'arc': {
      j.vy += P.gravity ?? 0.25;
      j.x += j.vx;
      j.y += j.vy;
      if (j.y >= GY - j.r) {
        if ((j.bounced | 0) < (P.bounce | 0)) {
          j.bounced = (j.bounced | 0) + 1;
          j.y = GY - j.r;
          j.vy = -Math.abs(j.vy) * (P.bounceMul ?? 0.6);
        } else return (j.y = GY - j.r), false;
      }
      break;
    }
    case 'ground':
      j.x += j.vx;
      j.y = GY - j.r;
      break;
    case 'seed': {                                 // 種: 落ちたら芽(罠)になってその場に残る
      if (j.burst) break;
      if (!j.planted) {
        j.vy += P.gravity ?? 0.3;
        j.x += j.vx;
        j.y += j.vy;
        if (j.y >= GY - j.r) {
          j.planted = true;
          j.y = GY - j.r;
          j.vx = j.vy = 0;
          j.life = P.trap ?? 420;
          j.r = Math.max(j.r, 16);
          j.pass = null;
          pjEffect(j, [{ type: 'leaves', count: 5, r: 20, duration: 24 }, { type: 'ring', flat: true, r: 18, duration: 10 }], 'attack');
        }
      }
      break;
    }
    case 'rise':
      j.vx *= P.decel ?? 0.9;
      if (Math.abs(j.vx) < 0.05) j.vx = 0;
      j.x += j.vx;
      j.y = Math.max(GY - 220, j.y - (P.lift ?? 0.6) * (j.age > 20 ? 1 : 0));
      break;
    case 'accel': {
      const sp = Math.min(j.s.v, Math.hypot(j.vx, j.vy) + (P.accel ?? 0.4)), a = Math.atan2(j.vy, j.vx);
      j.vx = Math.cos(a) * sp;
      j.vy = Math.sin(a) * sp;
      j.x += j.vx;
      j.y += j.vy;
      break;
    }
    case 'stop':
      j.vx *= P.decel ?? 0.94;
      j.vy *= P.decel ?? 0.94;
      if (Math.abs(j.vx) < 0.05) j.vx = 0;
      j.x += j.vx;
      j.y += j.vy;
      break;
    case 'homing': {
      if (j.tgt && j.age > (P.delay ?? 10)) {
        const sp = Math.hypot(j.vx, j.vy) || j.s.v, a = Math.atan2(j.vy, j.vx),
          want = Math.atan2(j.tgt.y - 60 - j.y, j.tgt.x - j.x);
        let d = want - a;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        const na = a + Math.max(-(P.turn ?? 0.05), Math.min(P.turn ?? 0.05, d));
        j.vx = Math.cos(na) * sp;
        j.vy = Math.sin(na) * sp;
      }
      j.x += j.vx;
      j.y += j.vy;
      if (j.y > GY - j.r) j.y = GY - j.r;
      break;
    }
    case 'boomerang': {
      j.vx -= j.f0 * (P.back ?? 0.35) * (j.s.v / 10);
      j.x += j.vx;
      j.y += j.vy;
      // 戻ってきて持ち主を通り過ぎたら消える(受け止める)
      if (j.vx * j.f0 < 0 && j.own && (j.x - j.own.x) * j.f0 < 0) return false;
      break;
    }
    default:
      j.x += j.vx;
      j.y += j.vy || 0;
  }
  if (j.vx) j.f = j.vx > 0 ? 1 : -1;
  return true;
}

// CPU の予測用: 弾をコピーして動かす
const cloneProjectile = (j) => ({ ...j, hist: [] });

// 撃つ(script.js の step から、技の発生の瞬間に呼ぶ)
function spawnProjectiles(p, m, o) {
  const list = makeProjectiles(p.ch, m, p.x, p.y, p.f, o, p);
  const s = list[0] && list[0].s;
  for (const j of list) { j.mid = p.mvId; j.aqk = m.k; if (s.luck === 'suit' && typeof nextSuit === 'function') j.suit = nextSuit(p); PJ.push(j); }   // カードの絵柄は順番(elements.js)
  if (s && s.path.type === 'seed' && typeof seedLimit === 'function') seedLimit(p);   // 種は SEED_MAX 個まで(elements.js) // mid = 撃った技(試合の記録の「命中」に使う) / aqk = 水まといの追撃をどの技の設定で出すか
  if (s && s.look.spawn) pjEffect(list[0], s.look.spawn, 'attack');
}

// 弾のエフェクト(effect.js の部品)をその場所に出す
function pjEffect(j, layers, phase) {
  if (!layers || !layers.length || typeof spawnEffect !== 'function') return;
  const L = j.s.look, col = pjColor(j);
  const spot = { x: j.x, y: j.y, f: j.f };
  const m = { k: 'pj', rx: -30, rw: 60, ry: -30, rh: 60, fx: { color: col, color2: L.color2 || '#fff', [phase]: layers.map((l) => ({ at: 'hitbox', ...l })) } };
  spawnEffect(spot, m, phase, j.x, j.y);
}
const pjColor = (j) => j.s.look.color || (j.own && (typeof skinProjColor === 'function' ? skinProjColor(j.own) : (SK[j.own.sk] && SK[j.own.sk].c) || j.own.ch.col)) || '#fff'; // スキンの色(drawing_character.js の CHARACTER_SKINS の pj)

// 毎F: 弾を動かす・当てる・軌跡を出す(script.js の upd から呼ぶ)
function updateProjectiles(A, B) {
  PJ = PJ.filter((j) => {
    const alive = stepProjectile(j);
    j.hist.unshift({ x: j.x, y: j.y, a: pjAngle(j) });
    if (j.hist.length > 16) j.hist.pop();
    pjTrail(j);
    if (!alive) return pjEffect(j, j.s.look.vanish, 'attack'), false;
    const t = j.own === A ? B : A;
    const hit = hitPartForRect(t, { x: j.x - j.r, y: j.y - j.r, w: j.r * 2, h: j.r * 2 });
    // 無敵(ダッシュの無敵など)で重なった弾はすり抜ける。重なっている間に無敵が切れても当たらない(体から離れたら、また当たるようになる)
    if (j.cd > 0) { j.cd--; if (--j.life <= 0) return pjEffect(j, j.s.look.vanish, 'attack'), false; return true; }   // 多段の弾: 次に当たれるまで待つ
    if (j.gone) return false;
    if (hit && (j.pass === t || (typeof dashInvuln === 'function' && (dashInvuln(t) || moveInvuln(t))))) j.pass = t;
    else if (!hit && j.pass === t) j.pass = null;
    if (hit && j.pass !== t) {
      const r = applyHit({ f: j.f || (t.x > j.x ? 1 : -1), vx: 0, own: j.own, mid: j.mid, aqk: j.aqk, aqf: j.aqf }, t, { d: j.d, kx: j.kx ?? j.s.kx, ky: j.ky ?? j.s.ky, hs: j.s.hs, chill: j.s.chill, suit: j.suit }, hit.zone, hit.y);
      if (r === 'jg') {
        // ジャストガード: 跳ね返す(軌道はまっすぐに変わり、1.3倍の速さで撃った側へ飛ぶ)
        const sp = Math.max(Math.abs(j.vx), j.s.v) * 1.3;
        j.f = j.own ? (j.own.x > j.x ? 1 : -1) : -j.f;
        j.vx = j.f * sp;
        j.vy = 0;
        j.P = { type: 'straight' };
        j.own = t;
        j.mid = null;               // 跳ね返した弾は、跳ね返した側の「出した技」ではないので命中率に数えない
        j.tgt = t === A ? B : A;
        j.x += j.vx * 2;
        pjEffect(j, j.s.look.reflect, 'attack');
        return true;
      }
      pjEffect(j, j.s.look.hit, 'hit');
      if (j.s.hitsN > 1 && !j.burst) {             // 多段の弾(竜巻など): hits 回まで当たる
        j.hitsLeft = (j.hitsLeft ?? j.s.hitsN) - 1;
        if (j.hitsLeft > 0) { j.cd = j.s.hitEvery; return true; }
      }
      return false;
    }
    if (--j.life <= 0) return pjEffect(j, j.s.look.vanish, 'attack'), false;
    return j.x > -40 && j.x < W + 40;
  });
}

// 絵の向き(face: 'velocity' のときは飛ぶ向きに傾ける)
function pjAngle(j) {
  if (j.s.look.face !== 'velocity' || (!j.vx && !j.vy)) return 0;
  return Math.atan2(j.vy, Math.abs(j.vx) || 0.001) * (j.f > 0 ? 1 : -1);
}

// 軌跡: 粒・きらきら・炎・煙は毎F出す(残像・光の帯は描くときに履歴から描く)
function pjTrail(j) {
  const T = j.s.look.trail;
  if (!T) return;
  const col = pjColor(j), c2 = j.s.look.color2 || '#fff';
  const list = Array.isArray(T) ? T : [T];
  for (let ti = 0; ti < list.length; ti++) {
    const t = list[ti], c = t.color || col, cc = t.color2 || c2, rate = t.rate ?? 1;
    let n = rate;
    if (t.type === 'particles') {
      for (; n > 0; n--) {
        if (n < 1 && R() > n) break;
        PT.push({ x: j.x - j.f * j.r * 0.5, y: j.y + (R() - 0.5) * j.r, vx: -j.vx * 0.15 - j.f * (R() * (t.spread ?? 1)), vy: (R() - 0.5) * 2 * (t.spread ?? 1),
          t: t.life ?? 12, l: t.life ?? 12, c: R() < 0.25 ? cc : c, g: t.gravity ?? 0.15, s: t.size ?? 1 });
      }
    } else if (t.type === 'sparkle') {
      if (typeof DUST === 'undefined') continue;
      for (; n > 0; n--) {
        if (n < 1 && R() > n) break;
        if (DUST.length >= DUST_MAX) DUST.shift();
        const life = (t.life ?? 36) * (0.6 + R() * 0.8);
        DUST.push({ x: j.x - j.f * R() * j.r + (R() - 0.5) * j.r, y: j.y + (R() - 0.5) * j.r * 1.4, vx: -j.vx * 0.08 + (R() - 0.5) * 0.6, vy: -0.2 - R() * 0.4,
          a: 0, life, size: (1.4 + R() * 2) * (t.size ?? 1), seed: R() * 6.3, c: R() < 0.35 ? cc : c });
      }
    } else if (t.type === 'fire' || t.type === 'smoke') {
      if (typeof fireEmit !== 'function') continue;
      if (!j.fe) j.fe = [];
      const e = j.fe[ti] || (j.fe[ti] = { own: j, ox: 0, oy: 0, t: 1, l: 1, f: j.f, r: j.r * 1.6 * (t.size ?? 1), c: t.type === 'smoke' ? t.color || '#777' : c, c2: t.type === 'smoke' ? t.color2 || '#bbb' : cc,
        rate: rate, life: t.life ?? 18, rise: t.rise ?? 1.2, buoy: 0.08, spread: 0.8, push: 0, smoke: t.type === 'smoke' ? 1 : t.smoke ?? 0.15, fdx: 0, fdy: -1 });
      e.f = j.f;
      fireEmit(e);
    }
  }
}

// ---- 描く ----
function drawProjectile(j) {
  const L = j.s.look, col = pjColor(j), c2 = L.color2 || '#fff', base = j.r * (L.size ?? 1);
  const pul = 1 + (L.pulse || 0) * Math.sin(j.age * 0.4);
  j.spin += L.spin || 0;
  const T = L.trail ? (Array.isArray(L.trail) ? L.trail : [L.trail]) : [];
  g.save();
  // 光の帯(履歴をなぞる太い線。後ろほど細く薄く)
  for (const t of T) if (t.type === 'line' && j.hist.length > 1) {
    const n = Math.min(j.hist.length, t.length ?? 6);
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = t.color || col;
    g.lineCap = 'round';
    for (let i = 1; i < n; i++) {
      const a = j.hist[i - 1], b = j.hist[i], u = 1 - i / n;
      g.globalAlpha = 0.5 * u;
      g.lineWidth = base * 2 * (t.width ?? 0.5) * u;
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.lineTo(b.x, b.y);
      g.stroke();
    }
    g.globalCompositeOperation = 'source-over';
  }
  // 残像
  for (const t of T) if (t.type === 'ghost') {
    const n = t.count ?? 3, gap = t.gap ?? 2;
    for (let i = n; i >= 1; i--) {
      const h = j.hist[i * gap];
      if (!h) continue;
      drawPJBody(j, h.x, h.y, h.a, base * pul, col, c2, (1 - i / (n + 1)) * 0.35);
    }
  }
  // 外側の光のにじみ
  if (L.glow ?? 1) {
    g.globalAlpha = 0.16;
    g.fillStyle = col;
    g.beginPath();
    g.arc(j.x, j.y, base * (1 + (L.glow ?? 1) * 0.4) * pul, 0, 7);
    g.fill();
    g.globalAlpha = 0.1;
    g.beginPath();
    g.arc(j.x, j.y, base * (1 + (L.glow ?? 1) * 0.8) * pul, 0, 7);
    g.fill();
  }
  drawPJBody(j, j.x, j.y, pjAngle(j), base * pul, col, c2, 1);
  g.restore();
}

// 弾の絵(body の部品を重ねる)
function drawPJBody(j, x, y, ang, R0, col, c2, alpha) {
  const L = j.s.look;
  for (const b of L.body || [{ type: 'orb' }]) {
    const r = R0 * (b.size ?? 1), c = b.color || col, cc = b.color2 || c2;
    g.save();
    g.translate(x + j.f * (b.x || 0), y + (b.y || 0));
    g.rotate(ang + j.spin * (L.spin && !b.spin ? 1 : 0) + (b.spin ? j.age * b.spin : 0));
    g.scale(j.f, 1);
    g.globalAlpha = alpha * (b.alpha ?? 1);
    if (b.add) g.globalCompositeOperation = 'lighter';
    g.fillStyle = c;
    g.strokeStyle = cc;
    g.lineJoin = g.lineCap = 'round';
    PJ_SHAPES[b.type] ? PJ_SHAPES[b.type](r, c, cc, b, j) : PJ_SHAPES.orb(r, c, cc, b, j);
    g.restore();
  }
}

// 弾の絵の部品の描き方(原点が弾の中心・右が前)
const PJ_SHAPES = {
  orb(r, c, cc) {
    g.globalAlpha *= 0.45;
    g.beginPath();
    g.arc(-r * 0.5, 0, r * 1.15, 0, 7);
    g.fill();
    g.globalAlpha /= 0.45;
    g.beginPath();
    g.arc(0, 0, r, 0, 7);
    g.fill();
    g.fillStyle = cc;
    g.beginPath();
    g.arc(r * 0.1, -r * 0.1, r * 0.5, 0, 7);
    g.fill();
  },
  ring(r, c, cc, b) {
    g.lineWidth = b.width ?? r * 0.3;
    g.strokeStyle = c;
    g.beginPath();
    g.arc(0, 0, r, 0, 7);
    g.stroke();
  },
  star(r, c, cc, b) {
    const n = b.points ?? 5, inn = b.inner ?? 0.45;
    g.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * inn : r;
      g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    g.closePath();
    g.fill();
    g.lineWidth = Math.max(1, r * 0.12);
    g.stroke();
  },
  crescent(r, c, cc, b) {
    const t = b.thick ?? 0.35;
    g.beginPath();
    g.arc(0, 0, r, -Math.PI / 2, Math.PI / 2);
    g.arc(-r * t * 1.6, 0, r * (1 - t * 0.2), Math.PI / 2, -Math.PI / 2, true);
    g.closePath();
    g.fill();
  },
  blade(r, c, cc) {
    g.beginPath();
    g.moveTo(-r * 0.15, -r);
    g.quadraticCurveTo(r * 0.75, 0, -r * 0.15, r);
    g.quadraticCurveTo(r * 0.25, 0, -r * 0.15, -r);
    g.fill();
    g.strokeStyle = cc;
    g.lineWidth = Math.max(1, r * 0.06);
    g.beginPath();
    g.moveTo(-r * 0.1, -r * 0.9);
    g.quadraticCurveTo(r * 0.62, 0, -r * 0.1, r * 0.9);
    g.stroke();
  },
  kunai(r, c, cc) {
    g.beginPath();                       // 刃
    g.moveTo(r, 0);
    g.lineTo(0, -r * 0.28);
    g.lineTo(-r * 0.15, 0);
    g.lineTo(0, r * 0.28);
    g.closePath();
    g.fill();
    g.strokeStyle = '#3a3040';            // 柄
    g.lineWidth = r * 0.14;
    g.beginPath();
    g.moveTo(-r * 0.15, 0);
    g.lineTo(-r * 0.7, 0);
    g.stroke();
    g.lineWidth = Math.max(1, r * 0.07);  // 輪
    g.beginPath();
    g.arc(-r * 0.82, 0, r * 0.12, 0, 7);
    g.stroke();
    g.strokeStyle = cc;                   // 刃の光
    g.lineWidth = Math.max(1, r * 0.05);
    g.beginPath();
    g.moveTo(r * 0.85, 0);
    g.lineTo(0, 0);
    g.stroke();
  },
  arrow(r, c, cc) {
    g.strokeStyle = c;
    g.lineWidth = Math.max(1.5, r * 0.08);
    g.beginPath();
    g.moveTo(-r, 0);
    g.lineTo(r * 0.7, 0);
    g.stroke();
    g.fillStyle = cc;
    g.beginPath();
    g.moveTo(r, 0);
    g.lineTo(r * 0.6, -r * 0.18);
    g.lineTo(r * 0.6, r * 0.18);
    g.closePath();
    g.fill();
    g.beginPath();
    g.moveTo(-r, 0);
    g.lineTo(-r * 1.15, -r * 0.2);
    g.lineTo(-r * 0.8, 0);
    g.lineTo(-r * 1.15, r * 0.2);
    g.closePath();
    g.fill();
  },
  shuriken(r, c, cc) {
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2, rr = i % 2 ? r * 0.25 : r;
      g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    g.closePath();
    g.fill();
    g.fillStyle = '#222';
    g.beginPath();
    g.arc(0, 0, r * 0.14, 0, 7);
    g.fill();
  },
  rock(r, c, cc, b, j) {
    if (!j.rk) j.rk = [0, 1, 2, 3, 4, 5, 6].map((k) => 0.75 + R() * 0.35);
    const pts = j.rk.map((k, i) => [Math.cos((i / j.rk.length) * Math.PI * 2) * r * k, Math.sin((i / j.rk.length) * Math.PI * 2) * r * k]);
    g.beginPath();
    pts.forEach(([px, py]) => g.lineTo(px, py));
    g.closePath();
    g.fill();
    g.fillStyle = cc;                      // 光の当たる面
    g.globalAlpha *= 0.5;
    g.beginPath();
    g.moveTo(pts[4][0], pts[4][1]);
    g.lineTo(pts[5][0], pts[5][1]);
    g.lineTo(pts[6][0], pts[6][1]);
    g.lineTo(0, 0);
    g.closePath();
    g.fill();
    g.globalAlpha /= 0.5;
    g.strokeStyle = 'rgba(0,0,0,0.35)';
    g.lineWidth = Math.max(1, r * 0.08);
    g.beginPath();
    pts.forEach(([px, py]) => g.lineTo(px, py));
    g.closePath();
    g.stroke();
  },
  bolt(r, c, cc, b) {
    for (let k = 0; k < (b.count ?? 4); k++) {
      let a = R() * Math.PI * 2;
      const pts = [[0, 0]];
      for (let s = 1; s <= 3; s++) {
        a += (R() - 0.5) * 1.2;
        pts.push([Math.cos(a) * r * (s / 3), Math.sin(a) * r * (s / 3)]);
      }
      for (const [col, w] of [[c, 0.16], [cc, 0.06]]) { // 色の太い線の上に、白い細い線
        g.strokeStyle = col;
        g.lineWidth = Math.max(1, r * w);
        g.beginPath();
        pts.forEach(([x, y]) => g.lineTo(x, y));
        g.stroke();
      }
    }
  },
  flame(r, c, cc) {
    for (let k = 0; k < 3; k++) {
      const w = Math.sin(fr * 0.5 + k * 2) * r * 0.12;
      g.fillStyle = k === 2 ? cc : c;
      g.globalAlpha *= k === 0 ? 0.6 : 1;
      const rr = r * (1 - k * 0.28);
      g.beginPath();
      g.moveTo(rr, 0);
      g.quadraticCurveTo(rr * 0.6, -rr * 0.9 + w, -rr * 1.4, -rr * 0.2 + w);
      g.quadraticCurveTo(-rr * 0.6, 0, -rr * 1.4, rr * 0.25 - w);
      g.quadraticCurveTo(rr * 0.6, rr * 0.9 - w, rr, 0);
      g.fill();
      if (k === 0) g.globalAlpha /= 0.6;
    }
  },
  heart(r, c, cc) {
    g.beginPath();
    g.moveTo(0, r * 0.8);
    g.bezierCurveTo(-r * 1.2, -r * 0.1, -r * 0.6, -r * 1, 0, -r * 0.4);
    g.bezierCurveTo(r * 0.6, -r * 1, r * 1.2, -r * 0.1, 0, r * 0.8);
    g.fill();
    g.fillStyle = cc;
    g.beginPath();
    g.arc(-r * 0.35, -r * 0.45, r * 0.15, 0, 7);
    g.fill();
  },
  shard(r, c, cc) {
    g.beginPath();
    g.moveTo(r, 0);
    g.lineTo(0, -r * 0.3);
    g.lineTo(-r * 0.8, 0);
    g.lineTo(0, r * 0.3);
    g.closePath();
    g.fill();
    g.strokeStyle = cc;
    g.lineWidth = Math.max(1, r * 0.06);
    g.beginPath();
    g.moveTo(r * 0.9, 0);
    g.lineTo(-r * 0.7, 0);
    g.stroke();
  },
  petal(r, c, cc) {
    // 花びら: 根元が細く、先が丸くふくらんで、先の真ん中が少しくぼむ
    g.beginPath();
    g.moveTo(-r, 0);
    g.bezierCurveTo(-r * 0.3, -r * 0.75, r * 0.7, -r * 0.7, r, -r * 0.12);
    g.lineTo(r * 0.78, 0);
    g.lineTo(r, r * 0.12);
    g.bezierCurveTo(r * 0.7, r * 0.7, -r * 0.3, r * 0.75, -r, 0);
    g.fill();
    g.strokeStyle = cc;
    g.lineWidth = Math.max(1, r * 0.08);
    g.beginPath();
    g.moveTo(-r * 0.8, 0);
    g.lineTo(r * 0.55, 0);
    g.stroke();
  },
  sun(r, c, cc, b) {
    // 太陽: とがった光の筋(points 本)と輪
    const n = b.points ?? 8;
    g.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = (i / (n * 2)) * Math.PI * 2, rr = i % 2 ? r * 0.55 : r * 1.25;
      g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    g.closePath();
    g.fill();
    g.strokeStyle = cc;
    g.lineWidth = Math.max(1, r * 0.12);
    g.beginPath();
    g.arc(0, 0, r * 0.5, 0, 7);
    g.stroke();
  },
  // ---- 新しいキャラの弾の部品 ----
  tornado(r, c, cc, b, j) {
    // 竜巻: 下が細く上が広い。回る楕円の重なり(弾の中心が真ん中)
    const rot = (j ? j.age : 0) * 0.5, H = r * 3.2;
    g.lineWidth = Math.max(2, r * 0.14);
    for (let i = 0; i < 8; i++) {
      const t = i / 7, yy = H * 0.5 - H * t, rw = r * (0.25 + 0.95 * t);
      g.strokeStyle = i % 3 === 0 ? cc : c;
      g.beginPath();
      g.ellipse(Math.sin(rot * 0.6 + t * 3) * r * 0.15, yy, rw, rw * 0.24 + 1, 0, rot + i, rot + i + 4.6);
      g.stroke();
    }
  },
  seed(r, c, cc, b, j) {
    if (!j || !j.planted) {                       // 飛んでいる種(しずく形のどんぐり)
      g.fillStyle = '#8a5a2a';
      g.beginPath(); g.ellipse(0, 0, r * 0.7, r * 0.55, 0, 0, 7); g.fill();
      g.strokeStyle = '#3a2410'; g.lineWidth = 1.5; g.stroke();
      g.fillStyle = c;
      g.beginPath(); g.ellipse(-r * 0.15, -r * 0.35, r * 0.5, r * 0.22, -0.3, 0, 7); g.fill();
      return;
    }
    // 芽(罠): 土の盛り上がりと双葉。開花の直前(burst)は大きなつぼみ
    const grow = Math.min(1, (j.age - (j.plantAge ?? 0)) / 20 + 0.3), sway = Math.sin(j.age * 0.1) * 0.15;
    g.fillStyle = '#6a4a2a';
    g.beginPath(); g.ellipse(0, r * 0.8, r * 1.1, r * 0.35, 0, Math.PI, 0); g.fill();
    g.strokeStyle = '#2a5a1a'; g.lineWidth = 2.4;
    g.beginPath(); g.moveTo(0, r * 0.8); g.quadraticCurveTo(r * 0.1, 0, sway * r * 2, -r * 0.6 * grow); g.stroke();
    for (const s2 of [-1, 1]) {
      g.save(); g.translate(sway * r * 2, -r * 0.6 * grow); g.rotate(s2 * 0.9 + sway);
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(s2 * r * 0.5, -r * 0.6, s2 * r * 1.0 * grow, -r * 0.15);
      g.quadraticCurveTo(s2 * r * 0.5, r * 0.15, 0, 0);
      g.fillStyle = c; g.fill(); g.strokeStyle = '#1e4a12'; g.lineWidth = 1.2; g.stroke();
      g.restore();
    }
    if (j.burst) { g.fillStyle = cc; g.beginPath(); g.arc(sway * r * 2, -r * 0.8, r * 0.5, 0, 7); g.fill(); }
  },
  fist(r, c, cc) {
    // 鉄のこぶし(ロケットパンチ): 指の段と手首のノズル
    g.fillStyle = '#5a6068';
    g.fillRect(-r * 1.5, -r * 0.45, r * 0.7, r * 0.9);           // 手首(ノズル)
    g.fillStyle = c;
    g.beginPath();
    g.moveTo(-r * 0.9, -r * 0.75); g.lineTo(r * 0.6, -r * 0.8); g.quadraticCurveTo(r * 1.05, -r * 0.6, r * 1.0, 0);
    g.quadraticCurveTo(r * 1.05, r * 0.65, r * 0.6, r * 0.8); g.lineTo(-r * 0.9, r * 0.75); g.closePath();
    g.fill();
    g.strokeStyle = '#1a1c20'; g.lineWidth = 1.8; g.stroke();
    g.lineWidth = 1.2;
    for (const yy of [-0.4, 0, 0.4]) { g.beginPath(); g.moveTo(r * 0.25, yy * r); g.lineTo(r * 0.95, yy * r); g.stroke(); }
    g.fillStyle = cc; g.fillRect(-r * 0.7, -r * 0.2, r * 0.5, r * 0.4);
  },
  missile(r, c, cc) {
    g.fillStyle = c;
    g.beginPath();
    g.moveTo(r * 1.4, 0); g.quadraticCurveTo(r * 0.9, -r * 0.5, 0, -r * 0.45); g.lineTo(-r * 1.1, -r * 0.45);
    g.lineTo(-r * 1.1, r * 0.45); g.lineTo(0, r * 0.45); g.quadraticCurveTo(r * 0.9, r * 0.5, r * 1.4, 0); g.closePath();
    g.fill();
    g.strokeStyle = '#1a1c20'; g.lineWidth = 1.4; g.stroke();
    g.fillStyle = cc;
    g.beginPath(); g.moveTo(-r * 0.7, -r * 0.45); g.lineTo(-r * 1.3, -r * 0.95); g.lineTo(-r * 1.1, -r * 0.45); g.fill();
    g.beginPath(); g.moveTo(-r * 0.7, r * 0.45); g.lineTo(-r * 1.3, r * 0.95); g.lineTo(-r * 1.1, r * 0.45); g.fill();
    g.fillStyle = '#ffb040';
    g.beginPath(); g.moveTo(-r * 1.1, -r * 0.3); g.lineTo(-r * 1.9, 0); g.lineTo(-r * 1.1, r * 0.3); g.fill();
  },
  card(r, c, cc, b, j) {
    const w = r * 1.2, h = r * 1.7;
    g.fillStyle = '#fffdf6';
    g.fillRect(-w / 2, -h / 2, w, h);
    g.strokeStyle = '#1a1a24'; g.lineWidth = 1.4; g.strokeRect(-w / 2, -h / 2, w, h);
    g.strokeStyle = c; g.lineWidth = 1.2; g.strokeRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);
    const suit = '♠♥♦♣'[(j && j.suit != null ? j.suit : j ? j.ni | 0 : 0) & 3];
    g.fillStyle = suit === '♥' || suit === '♦' ? '#e0304a' : '#1a1a24';
    g.font = 'bold ' + Math.round(r * 0.95) + 'px sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(suit, 0, 1);
  },
  dice(r, c, cc) {
    g.fillStyle = '#fffdf6';
    g.beginPath();
    if (g.roundRect) g.roundRect(-r, -r, r * 2, r * 2, r * 0.35); else g.rect(-r, -r, r * 2, r * 2);
    g.fill();
    g.strokeStyle = '#1a1a24'; g.lineWidth = 2; g.stroke();
    g.fillStyle = c;
    for (const [dx, dy] of [[-0.5, -0.5], [0.5, 0.5], [0, 0], [0.5, -0.5], [-0.5, 0.5]]) { g.beginPath(); g.arc(dx * r, dy * r, r * 0.17, 0, 7); g.fill(); }
  },
  wave(r, c, cc) {
    // 地面を走る衝撃波: 下が地面。前に向かって立ち上がる半円の波を3重に
    for (let k = 0; k < 3; k++) {
      const rr = r * (1 - k * 0.25);
      g.globalAlpha *= k ? 0.7 : 1;
      g.strokeStyle = k === 2 ? cc : c;
      g.lineWidth = Math.max(2, r * 0.18);
      g.beginPath();
      g.ellipse(-k * r * 0.25, r * 0.9 / 1, rr * 0.7, rr * 1.4, 0, -Math.PI / 2, 0.15);
      g.stroke();
      if (k) g.globalAlpha /= 0.7;
    }
  },
};

// ============================================================
// 水まとい(ルリ)  … character.js の aqua / 技の follow / ゲージ技の veil
//   ゲージ技(veil)で AQUA ゲージがたまり、まわりに水の玉が浮く(玉の数はゲージの量で 1〜4 個)
//   技が当たる(ガードされる)と delay F 後に、浮いた水がその技の follow で自動追撃し、ゲージを cost だけ使う
//   1回の技(多段技も)につき1回。飛び道具は弾ごとに1回。追撃の弾そのものは、さらに追撃を呼ばない
// ============================================================
// 追撃の種類(技の follow の kind)。follow に書かない項目はここの値
//   shot   … 浮いた水の玉から相手へまっすぐ飛ぶ水弾(count で数、spread でばらけ方。path で軌道も変えられる)
//   burst  … 相手の体の場所で水が弾ける
//   geyser … 相手の足元から水柱が噴き上がる(浮いていれば、その高さまで届く)
//   rain   … 相手の真上から水のしずくが降る(count 個)
//   wave   … ルリの足元から相手へ、地面を走る水の波
const AQUA_KINDS = {
  default: { kind: 'shot', cost: 8, damage: 3 },                   // follow を書いていない技
  shot: { speed: 11, damage: 4, radius: 9, life: 50, knockX: 3, knockY: -2, hitstun: 18, look: 'aquaDrop', path: 'straight' },
  burst: { damage: 5, radius: 32, life: 8, knockX: 5, knockY: -3, hitstun: 20, look: 'aquaBurst' },
  geyser: { damage: 5, radius: 24, life: 12, knockX: 1, knockY: -9, hitstun: 24, look: 'aquaGeyser' },
  rain: { speed: 8, damage: 2, radius: 8, life: 60, knockX: 1, knockY: 2, hitstun: 14, look: 'aquaDrop', count: 3 },
  wave: { speed: 8, damage: 4, radius: 16, life: 70, knockX: 3, knockY: -3, hitstun: 20, look: 'aquaWave' },
};
const aquaOf = (p) => p && p.ch && p.ch.aq;
// 浮いた水の玉の位置(描くときと、追撃の水弾の出どころの両方で使う)。front = 体より手前にあるか
function aquaOrbs(p) {
  const n = Math.max(1, Math.min(4, Math.ceil((p.aq || 0) / 25))), a0 = fr * 0.06, out = [];
  for (let i = 0; i < n; i++) {
    const a = a0 + (i * Math.PI * 2) / n;
    out.push({ x: p.x + Math.cos(a) * 42, y: p.y - 66 + Math.sin(a) * 13 + Math.sin(fr * 0.11 + i) * 4, front: Math.sin(a) > 0 });
  }
  return out;
}
// 技ごとの追撃の設定(AQUA_KINDS の値と合わせて、飛び道具の形にしておく)
function aquaFollowSpec(p, k) {
  const ch = p.ch, cache = ch._aqs || (ch._aqs = {});
  if (k in cache) return cache[k];
  const m = ch.mv[k] || ch.mv[String(k).replace(/_ctr$/, '')];        // カウンターの打ち返し(c2_ctr)は、構えの技(c2)の follow を使う
  let fo = m ? m.fol : undefined;
  if (fo === null || !m) return (cache[k] = null);
  fo = { ...AQUA_KINDS.default, ...(fo || {}) };
  const K = { ...(AQUA_KINDS[fo.kind] || AQUA_KINDS.shot), ...fo };
  let look = K.look;
  if (typeof look === 'string') look = { preset: look };
  look = { ...(PROJECTILE_LOOKS[look.preset] || PROJECTILE_LOOKS.basic), ...look };
  let path = K.path ?? 'straight';
  if (typeof path === 'string') path = { type: path };
  path = { ...(PROJECTILE_PATHS[path.type] || {}), ...path };
  if (K.kind === 'burst' || K.kind === 'geyser') path = { type: 'stop', decel: 0 };
  if (K.kind === 'wave') path = { type: 'ground' };
  if (K.kind === 'rain') path = { type: 'arc', up: 0, gravity: 0.25 };
  const s = { v: K.speed ?? 10, d: K.damage, r: K.radius ?? 10, n: K.count ?? 1, sp: K.spread ?? 1, life: K.life ?? 50, kx: K.knockX ?? 3, ky: K.knockY ?? -2, hs: K.hitstun ?? 18,
    from: { x: 0, y: 0 }, look, path, kind: K.kind, cost: K.cost ?? 8 };
  return (cache[k] = s);
}
// 技が当たった(ガードされた)とき: 追撃の予約(script.js の applyHit から)。src = 攻撃したキャラ か 飛び道具
function aquaTrigger(owner, src, o) {
  const Q = aquaOf(owner);
  if (!Q || !(owner.aq > 0) || !owner.ch) return;
  let k;
  if (src.ch) {
    if (!src.mv || owner.aqMid === owner.mvId) return;              // 1回の技につき1回
    k = src.mv.k;
  } else {
    if (!src.aqk || src.aqf) return;                                 // 追撃の弾は、さらに追撃を呼ばない
    k = src.aqk;
  }
  const s = aquaFollowSpec(owner, k);
  if (!s || owner.aq < s.cost) return;
  if (src.ch) owner.aqMid = owner.mvId;
  owner.aq = Math.max(0, owner.aq - s.cost);
  (owner.aqQ || (owner.aqQ = [])).push({ t: Q.delay ?? 18, k });
  owner.aqFlash = 10;                                                // 浮いた水が光る(撃つ準備)
}
// 毎F(ヒットストップ中は呼ばれない): ゲージが少しずつ減る・予約した追撃を出す
function aquaTick(p, o) {
  const Q = aquaOf(p);
  if (!Q) return;
  if (p.aqFlash > 0) p.aqFlash--;
  if (p.aq > 0) {
    p.aq = Math.max(0, p.aq - (Q.decay ?? 0.06));
    if (p.aq <= 0 && typeof spawnEffect === 'function')             // 水がほどけて落ちる
      for (const b of aquaOrbs({ ...p, aq: 1 })) spawnEffect({ x: b.x, y: b.y, f: p.f }, { k: 'aq', rx: -10, rw: 20, ry: -10, rh: 20, fx: { color: Q.color, color2: '#fff', attack: [{ type: 'drops', count: 6, speed: 2, dir: 'down' }] } }, 'attack');
  }
  if (!p.aqQ || !p.aqQ.length) return;
  for (const q of p.aqQ) q.t--;
  while (p.aqQ.length && p.aqQ[0].t <= 0) aquaFire(p, o, p.aqQ.shift().k);
}
// 追撃を出す
function aquaFire(p, o, k) {
  const s = aquaFollowSpec(p, k);
  if (!s || !o || p.st === 'ko') return;
  const dir = o.x >= p.x ? 1 : -1, tx = o.x, ty = o.y - 55, list = [], orbs = aquaOrbs({ ...p, aq: Math.max(p.aq || 0, 25) });
  const mk = (x, y, vx, vy, f) => ({ x, y, vx, vy, f, f0: f, own: p, tgt: o, s, P: s.path, d: s.d, r: s.r, life: s.life, age: 0, spin: 0, hist: [], mid: null, aqf: true });
  const fxAt = (x, y, layers) => spawnEffect({ x, y, f: dir }, { k: 'aq', rx: -10, rw: 20, ry: -10, rh: 20, fx: { color: s.look.color, color2: s.look.color2 || '#fff', attack: layers } }, 'attack');
  switch (s.kind) {
    case 'burst':
      list.push(mk(tx, ty, 0, 0, dir));
      break;
    case 'geyser': {
      const y = Math.min(GY - s.r, o.y - 40);
      list.push(mk(tx, y, 0, 0, dir));
      fxAt(tx, GY, [{ type: 'spout', length: GY - y + 50, width: s.r * 1.5, duration: 16 }, { type: 'wave', width: 5, duration: 12 }, { type: 'drops', y: y - GY - 30, count: 10, speed: 6, dir: 'up', spread: 0.9 }]);
      break;
    }
    case 'rain':
      for (let i = 0; i < s.n; i++) list.push(mk(tx + (i - (s.n - 1) / 2) * 26, o.y - 200 - i * 16, 0, s.v * 0.4, dir));
      fxAt(tx, o.y - 210, [{ type: 'ring', r: 36, width: 4, flat: true, duration: 12 }]);
      break;
    case 'wave':
      list.push(mk(p.x + dir * 30, GY - s.r, dir * s.v, 0, dir));
      break;
    default: {                                                        // shot: 浮いた水の玉から相手へ
      for (let i = 0; i < s.n; i++) {
        const b = orbs[i % orbs.length], a = Math.atan2(ty - b.y, tx - b.x) + (i - (s.n - 1) / 2) * 0.16 * s.sp;
        const j = mk(b.x, b.y, Math.cos(a) * s.v, Math.sin(a) * s.v, Math.cos(a) >= 0 ? 1 : -1);
        if (s.path.type === 'homing') j.age = 0;
        list.push(j);
        fxAt(b.x, b.y, [{ type: 'flash', r: 14, blend: 'add', duration: 5 }, { type: 'drops', count: 3, speed: 2.5, dir: 'all' }]);
      }
    }
  }
  for (const j of list) { PJ.push(j); if (s.look.spawn) pjEffect(j, s.look.spawn, 'attack'); }
}
