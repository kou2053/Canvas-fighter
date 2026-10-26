// ============================================================
// effect.js … 技のエフェクト・炎・ヒット演出の処理
//   技の effect の書き方は setting.js の「技のエフェクト」、プリセットはこのファイルの EFFECT_PRESETS
//   読み込み順: character.js → drawing_template.js → drawing_character.js → drawing.js → effect.js → training.js → script.js
//   使っている script.js の変数: g(キャンバス) / fx(エフェクトの一覧) / PT(粒) / R / GY / fr / save / T
// ============================================================

// 技のエフェクトのプリセット(技の effect: 'fire' のように名前で使う。書き方は setting.js の「技のエフェクト」)
//  start=技の出始め(溜め) / attack=攻撃の瞬間 / hit=当たった瞬間。中身は「部品」の一覧
//  color などを書くと、その部品の既定の色になる(技の側で effect: { preset: 'fire', color: '#4cf' } のように変えられる)
const EFFECT_PRESETS = {
  // 打撃: 小さな弧と速度線、当たると小さく弾ける
  punch: {
    color: '#fff',
    attack: [{ type: 'slash', width: 7, span: 1.6 }, { type: 'lines', count: 3, at: 'body' }, { type: 'particles', count: 5, speed: 4 }],
    hit: [{ type: 'burst', r: 26, duration: 9 }],
  },
  // 斬撃: 大きく鋭い弧、当たると×字
  slash: {
    color: '#bdf',
    attack: [{ type: 'slash', width: 12, span: 2.8, duration: 10 }, { type: 'particles', count: 4, speed: 6, spread: 0.3 }],
    hit: [{ type: 'cross', r: 30, duration: 10 }],
  },
  // 重い一撃: 弧+足元の衝撃波+画面の揺れ
  heavy: {
    color: '#fc6',
    attack: [{ type: 'slash', width: 14 }, { type: 'wave', at: 'feet', width: 8 }, { type: 'shake', duration: 8, power: 3 }],
    hit: [{ type: 'burst', r: 46, count: 12 }, { type: 'flash', r: 50, blend: 'add', duration: 8 }, { type: 'shake', duration: 10, power: 6 }],
  },
  // 炎: 出始めに手元が光り、炎と火の粉が上へ
  fire: {
    color: '#f83',
    color2: '#ffd36b',
    start: [{ type: 'orb', at: 'front', r: 14, duration: 10, follow: true, blend: 'add' }],
    attack: [{ type: 'flame', count: 5, dir: 'up', buoyancy: 0.5}, { type: 'flash', blend: 'add', duration: 10 }, { type: 'particles', count: 12, dir: 'up', speed: 4, gravity: -0.05, life: 22 }],
    hit: [{ type: 'flame', r: 40 }, { type: 'particles', count: 14, dir: 'all', speed: 5 }],
  },
  // 雷: 稲妻が2本ずれて走り、当たると星がはじける
  thunder: {
    color: '#ffe95a',
    color2: '#fff',
    attack: [{ type: 'spark', length: 90 }, { type: 'spark', length: 70, delay: 2, x: 10 }, { type: 'flash', blend: 'add', duration: 6 }],
    hit: [{ type: 'spark', length: 80 }, { type: 'star', count: 4, r: 22, spin: 2 }, { type: 'shake', duration: 6, power: 4 }],
  },
  // 氷: 星形の結晶が回り、冷気の粒が落ちる
  ice: {
    color: '#9df',
    color2: '#fff',
    attack: [{ type: 'star', count: 6, spin: 3 }, { type: 'particles', count: 10, dir: 'down', speed: 2, gravity: 0.05, life: 26 }],
    hit: [{ type: 'ring', width: 4 }, { type: 'particles', count: 12, dir: 'all', speed: 4 }],
  },
  // 風: 輪と速度線
  wind: {
    color: '#cfe',
    attack: [{ type: 'ring', flat: true, width: 4 }, { type: 'lines', count: 5, length: 90, at: 'body' }],
    hit: [{ type: 'ring', r: 40, width: 3 }],
  },
  // 闇: 紫の光の玉と輪
  dark: {
    color: '#a5f',
    color2: '#f0d8ff',
    start: [{ type: 'orb', at: 'body', r: 30, duration: 14, follow: true, blend: 'add' }],
    attack: [{ type: 'ring', width: 8 }, { type: 'flash', blend: 'add' }],
    hit: [{ type: 'burst', count: 6, spin: 1.5 }],
  },
  // 昇り技: 上向きの弧と、足元の衝撃波、上へ舞う粒
  rising: {
    color: '#fb3',
    attack: [{ type: 'slash', angle: -1, width: 12 }, { type: 'wave', at: 'feet' }, { type: 'particles', count: 10, dir: 'up', speed: 6 }],
    hit: [{ type: 'burst', r: 40 }],
  },

  // ---- 技の種類ごとのプリセット(色は技の側で { preset: 'kick', color: '#7df' } のように変える) ----
  // 蹴り: 三日月の軌跡、当たるとはじける
  kick: {
    color: '#fff',
    attack: [{ type: 'crescent', width: 9, span: 2.2, duration: 10 }, { type: 'lines', count: 2, at: 'body' }, { type: 'particles', count: 5, speed: 4 }],
    hit: [{ type: 'impact', r: 26, duration: 9 }, { type: 'burst', r: 30, duration: 9 }],
  },
  // 振り下ろし(チョップなど): 下向きの弧
  chop: {
    color: '#fff',
    attack: [{ type: 'slash', angle: 1, width: 10, span: 2 }, { type: 'particles', count: 5, dir: 'down', speed: 4 }],
    hit: [{ type: 'impact', r: 26, duration: 9 }],
  },
  // 突き上げ: 上向きの弧と上へ舞う粒、当たると星
  upper: {
    color: '#fff',
    attack: [{ type: 'slash', angle: -1, width: 10, span: 2.2 }, { type: 'particles', count: 6, dir: 'up', speed: 5 }],
    hit: [{ type: 'burst', r: 32 }, { type: 'star', count: 4, r: 14, spin: 2 }],
  },
  // 足払い: 低い弧と足元の砂ぼこり
  sweep: {
    color: '#fff',
    attack: [{ type: 'slash', angle: 1, width: 9, span: 2.6 }, { type: 'wave', at: 'feet', width: 5 },
      { type: 'particles', count: 6, dir: 'back', speed: 3, gravity: 0.1, at: 'feet', color: '#cba' }],
    hit: [{ type: 'ring', flat: true, width: 4, r: 30 }, { type: 'burst', r: 24, duration: 9 }],
  },
  // 突進: 速度線が流れ、足元から砂ぼこり
  dash: {
    color: '#fff',
    start: [{ type: 'lines', count: 4, length: 80, at: 'body', duration: 10 }],
    attack: [{ type: 'lines', count: 5, length: 110, at: 'body' }, { type: 'crescent', width: 12, span: 1.8 },
      { type: 'particles', count: 6, dir: 'back', speed: 3, gravity: 0.1, at: 'feet', color: '#cba' }],
    hit: [{ type: 'impact', r: 36 }, { type: 'shake', duration: 6, power: 3 }],
  },
  // 体当たり: 速度線・足元の輪・光、当たると大きくはじける
  tackle: {
    color: '#fff',
    attack: [{ type: 'lines', count: 5, length: 100, at: 'body' }, { type: 'ring', flat: true, at: 'feet', width: 5 }, { type: 'flash', r: 40, blend: 'add', duration: 8 }],
    hit: [{ type: 'impact', r: 44 }, { type: 'burst', r: 46, count: 10 }, { type: 'shake', duration: 8, power: 5 }],
  },
  // 回転技: 体のまわりの輪と大きな三日月
  spin: {
    color: '#fff',
    attack: [{ type: 'ring', at: 'body', r: 55, width: 6, flat: true }, { type: 'crescent', width: 11, span: 3.6 }, { type: 'lines', count: 3, at: 'body' }],
    hit: [{ type: 'burst', r: 34, spin: 2 }],
  },
  // 空中の軽い技
  air: {
    color: '#fff',
    attack: [{ type: 'slash', width: 8, span: 2 }, { type: 'particles', count: 4, speed: 4 }],
    hit: [{ type: 'burst', r: 28, duration: 9 }],
  },
  // 踏みつけ(空中から下へ): 下向きの弧、当たると地面に輪
  stomp: {
    color: '#fff',
    attack: [{ type: 'slash', angle: 1, width: 12 }, { type: 'particles', count: 6, dir: 'down', speed: 5 }],
    hit: [{ type: 'impact', r: 34 }, { type: 'ring', flat: true, r: 40, width: 5 }, { type: 'shake', duration: 6, power: 4 }],
  },
  // 飛び道具を撃つ: 手元に光をためて放つ
  cast: {
    color: '#fff',
    start: [{ type: 'orb', at: 'front', r: 16, duration: 12, follow: true, blend: 'add' }],
    attack: [{ type: 'flash', at: 'front', r: 36, blend: 'add', duration: 8 }, { type: 'ring', at: 'front', r: 30, width: 4 }, { type: 'particles', at: 'front', count: 8, speed: 4 }],
    hit: [{ type: 'burst', r: 28 }],
  },
  // 突き: 前へ伸びる光の線(技の当たり判定の長さぶん)
  thrust: {
    color: '#fff',
    attack: [{ type: 'beam', at: 'base', width: 7, duration: 9 }, { type: 'lines', count: 2, at: 'body' }, { type: 'particles', count: 4, speed: 7, spread: 0.15 }],
    hit: [{ type: 'cross', r: 20, duration: 8 }, { type: 'burst', r: 28, duration: 9 }],
  },
  // 剣: 太い三日月の軌跡と細い光の弧、当たると×字
  blade: {
    color: '#bdf',
    attack: [{ type: 'crescent', width: 13, span: 2.8, duration: 11 }, { type: 'slash', width: 3, span: 3, duration: 8, color: '#fff' }, { type: 'particles', count: 5, speed: 6, spread: 0.3 }],
    hit: [{ type: 'cross', r: 30 }, { type: 'flash', r: 30, blend: 'add', duration: 6 }],
  },
  // 地響き: 足元の大きな衝撃波と飛び散る岩
  quake: {
    color: '#d8b48a',
    attack: [{ type: 'wave', at: 'feet', width: 10, grow: 1.6, duration: 16 }, { type: 'debris', at: 'feet', count: 8, speed: 6, dir: 'up', duration: 34 },
      { type: 'shake', duration: 10, power: 5 }],
    hit: [{ type: 'impact', r: 40 }, { type: 'shake', duration: 8, power: 5 }],
  },
  // バリア: 体のまわりに光の輪と結晶
  barrier: {
    color: '#9df',
    color2: '#fff',
    start: [{ type: 'orb', at: 'body', r: 34, duration: 10, follow: true, blend: 'add' }],
    attack: [{ type: 'ring', at: 'body', r: 70, width: 7, grow: 1.1, duration: 14 }, { type: 'star', at: 'body', count: 6, r: 26, spin: 2 }, { type: 'flash', at: 'body', r: 60, blend: 'add' }],
    hit: [{ type: 'burst', r: 34, spin: 1.5 }],
  },
  // 魔法の打撃: 細い弧ときらめく星
  magic: {
    color: '#ffe066',
    color2: '#c9f',
    attack: [{ type: 'slash', width: 7, span: 2 }, { type: 'star', count: 4, r: 12, spin: 3 }, { type: 'particles', count: 6, speed: 3, dir: 'all', gravity: -0.02, life: 22 }],
    hit: [{ type: 'star', count: 5, r: 22, spin: 2 }, { type: 'flash', r: 28, blend: 'add', duration: 8 }],
  },
  // 忍びの斬撃: 細く鋭い三日月と速度線
  shadow: {
    color: '#c6f',
    attack: [{ type: 'crescent', width: 7, span: 2.4, duration: 9 }, { type: 'lines', count: 3, at: 'body', length: 70 }, { type: 'particles', count: 5, speed: 6, spread: 0.4 }],
    hit: [{ type: 'cross', r: 22, duration: 8 }],
  },
  // 岩の打撃: 太い弧とこぼれる石、当たると岩が飛び散る
  rock: {
    color: '#d8b48a',
    color2: '#ffb060',
    attack: [{ type: 'slash', width: 14, span: 2 }, { type: 'debris', count: 3, speed: 4, duration: 26 }],
    hit: [{ type: 'impact', r: 40 }, { type: 'debris', count: 5, speed: 5, dir: 'all', duration: 28 }, { type: 'shake', duration: 8, power: 4 }],
  },
  // 狂戦士の打撃: 荒々しい弧と火の粉、当たると小さく燃える
  rage: {
    color: '#fb3',
    color2: '#f53',
    attack: [{ type: 'slash', width: 13, span: 2.4 }, { type: 'particles', count: 8, dir: 'up', speed: 4, gravity: -0.05, life: 20 }, { type: 'lines', count: 3, at: 'body' }],
    hit: [{ type: 'impact', r: 36 }, { type: 'flame', r: 26, duration: 10 }, { type: 'shake', duration: 6, power: 4 }],
  },
  // ---- 血(バーサク) ----
  // 血: 深紅の三日月と飛び散る血しぶき、当たると血が噴き出す
  blood: {
    color: '#b3001b',
    color2: '#ff5a64',
    attack: [{ type: 'crescent', width: 11, span: 2.4, duration: 11 }, { type: 'blood', count: 6, speed: 5, dir: 'forward', spread: 0.5 }],
    hit: [{ type: 'impact', r: 34, color: '#6a0010', color2: '#ff5a64' }, { type: 'blood', count: 14, speed: 6, dir: 'all' }, { type: 'shake', duration: 6, power: 4 }],
  },
  // 狂戦士の打撃(血): 獣の爪痕(3本の斬撃)と血しぶき、当たると血が噴き出す
  bloodRage: {
    color: '#c8102e',
    color2: '#ff9a9a',
    attack: [{ type: 'claw', count: 3, width: 8 }, { type: 'blood', count: 5, speed: 4.5, dir: 'forward', spread: 0.6 }, { type: 'lines', count: 3, at: 'body', color: '#7a0010' }],
    hit: [{ type: 'impact', r: 36, color: '#4a0010', color2: '#ff4a5a' }, { type: 'blood', count: 12, speed: 6, dir: 'all' }, { type: 'shake', duration: 6, power: 4 }],
  },
  // 血の咆哮: 体のまわりに赤黒い輪が広がり、血の霧が噴き出す
  bloodRoar: {
    color: '#a0001a',
    color2: '#ff6a70',
    start: [{ type: 'orb', at: 'body', r: 36, duration: 10, follow: true, color: '#5a0010' }],
    attack: [{ type: 'ring', at: 'body', r: 80, width: 9, grow: 1.4, duration: 16 }, { type: 'ring', at: 'body', r: 60, width: 5, grow: 1.6, duration: 18, delay: 4, color: '#ff4a5a' },
      { type: 'blood', at: 'head', count: 10, speed: 5, dir: 'up', spread: 1.2 }, { type: 'lines', count: 6, at: 'body', length: 110, color: '#7a0010' }, { type: 'shake', duration: 12, power: 5 }],
    hit: [{ type: 'impact', r: 30, color: '#4a0010', color2: '#ff4a5a' }, { type: 'blood', count: 8, speed: 5, dir: 'forward' }],
  },
  // ---- 水(ルリ) ----
  // 水: 水の三日月と、飛び散って水たまりになるしずく
  water: {
    color: '#3aa8ff',
    color2: '#e2f8ff',
    attack: [{ type: 'crescent', width: 10, span: 2.2 }, { type: 'drops', count: 5, speed: 4, dir: 'forward', spread: 0.5 }],
    hit: [{ type: 'impact', r: 26, color: '#2f8cff', color2: '#e8fbff' }, { type: 'drops', count: 10, speed: 5, dir: 'all' }],
  },
  // 水しぶき: その場で水が弾ける(輪・放射・しずく)
  splash: {
    color: '#3aa8ff',
    color2: '#e8fbff',
    attack: [{ type: 'flash', r: 44, blend: 'add', duration: 7, color: '#bff0ff' }, { type: 'ring', r: 40, width: 6, grow: 1.25 }, { type: 'burst', r: 46, count: 10 },
      { type: 'drops', count: 12, speed: 6, dir: 'all' }],
    hit: [{ type: 'impact', r: 34, color: '#2f8cff', color2: '#e8fbff' }, { type: 'drops', count: 10, speed: 5, dir: 'all' }],
  },
  // 水の噴射: 前へまっすぐ伸びる水流
  waterJet: {
    color: '#3aa8ff',
    color2: '#e8fbff',
    attack: [{ type: 'beam', at: 'base', width: 14, duration: 12 }, { type: 'drops', count: 8, speed: 6, dir: 'forward', spread: 0.35 }, { type: 'lines', count: 2, at: 'body', color: '#9fe4ff' }],
    hit: [{ type: 'impact', r: 28, color: '#2f8cff', color2: '#e8fbff' }, { type: 'drops', count: 8, speed: 5, dir: 'forward', spread: 0.8 }],
  },
  // 噴き上がる水柱: 前の地面から水が噴き上がる
  geyser: {
    color: '#2f8cff',
    color2: '#dff7ff',
    attack: [{ type: 'wave', at: 'feet', x: 46, width: 6, duration: 14 }, { type: 'spout', at: 'feet', x: 46, length: 165, width: 30, duration: 16 },
      { type: 'drops', at: 'feet', x: 46, y: -150, count: 12, speed: 6, dir: 'up', spread: 0.9 }],
    hit: [{ type: 'impact', r: 30, color: '#2f8cff', color2: '#e8fbff' }, { type: 'drops', count: 10, speed: 6, dir: 'up', spread: 0.8 }],
  },
  // 大津波: 足元から前へ、水しぶきが次々に立ちながら走る
  tide: {
    color: '#2f8cff',
    color2: '#dff7ff',
    attack: [{ type: 'wave', at: 'feet', x: 60, width: 12, grow: 2.2, duration: 22 }, { type: 'wave', at: 'feet', x: 150, width: 9, grow: 1.8, delay: 5, duration: 20 },
      { type: 'spout', at: 'feet', x: 45, length: 48, width: 30, duration: 14 }, { type: 'spout', at: 'feet', x: 100, length: 62, width: 34, duration: 14, delay: 3 },
      { type: 'spout', at: 'feet', x: 155, length: 72, width: 38, duration: 14, delay: 6 }, { type: 'spout', at: 'feet', x: 210, length: 60, width: 34, duration: 14, delay: 9 },
      { type: 'drops', at: 'feet', x: 100, count: 14, speed: 7, dir: 'up', spread: 0.9, delay: 3 }, { type: 'drops', at: 'feet', x: 200, count: 12, speed: 7, dir: 'up', spread: 0.9, delay: 8 },
      { type: 'shake', duration: 10, power: 4 }],
    hit: [{ type: 'impact', r: 34, color: '#2f8cff', color2: '#e8fbff' }, { type: 'drops', count: 10, speed: 6, dir: 'up', spread: 0.9 }],
  },
  // ---- 石(ゴーレム) ----
  // 巨岩の一撃: 太い岩の三日月・砂ぼこり、当たると岩が砕け散って重く揺れる
  boulder: {
    color: '#a89880',
    color2: '#fff0d0',
    start: [{ type: 'orb', at: 'front', r: 16, duration: 12, follow: true, color: '#d8b48a' }],
    attack: [{ type: 'crescent', width: 18, span: 2.2, duration: 12 }, { type: 'debris', count: 4, speed: 4, duration: 28, color: '#8a7a68' },
      { type: 'particles', at: 'feet', count: 8, dir: 'back', speed: 3, gravity: 0.1, color: '#b9a58a' }],
    hit: [{ type: 'impact', r: 50, color: '#5a4a38', color2: '#fff0d0' }, { type: 'debris', count: 9, speed: 6, dir: 'all', duration: 30, color: '#8a7a68' },
      { type: 'flash', r: 56, blend: 'add', duration: 7, color: '#ffe2b0' }, { type: 'shake', duration: 12, power: 7 }],
  },
  // 火炎の息: 手元から前へ炎を吹く
  breath: {
    color: '#f83',
    color2: '#ffd36b',
    start: [{ type: 'orb', at: 'front', r: 14, duration: 10, follow: true, blend: 'add' }],
    attack: [{ type: 'flame', at: 'front', dir: 'forward', count: 7, rise: 5, buoyancy: 0.25, life: 22, duration: 24, smoke: 0.1 }, { type: 'flash', at: 'front', blend: 'add' }],
    hit: [{ type: 'flame', r: 34 }, { type: 'particles', count: 10, dir: 'all' }],
  },
  // 闇の魔法少女(リリス): 紫の三日月と、きらめく星・ハート
  nightmare: {
    color: '#c03a8a',
    color2: '#f6d0ff',
    attack: [{ type: 'crescent', width: 9, span: 2.2, duration: 10 }, { type: 'star', count: 4, r: 10, spin: 3 }, { type: 'particles', count: 6, speed: 3, dir: 'all', gravity: -0.03, life: 22 }],
    hit: [{ type: 'heart', r: 14, duration: 12 }, { type: 'burst', r: 28, duration: 9 }],
  },
  // 奈落(リリス): 足元に闇の輪と、紫の炎が立ちのぼる
  abyss: {
    color: '#7a2aa8',
    color2: '#ff8adf',
    attack: [{ type: 'ring', at: 'feet', flat: true, r: 70, width: 6, grow: 1.2, duration: 18 }, { type: 'flame', at: 'feet', count: 5, r: 30, duration: 18, life: 22, smoke: 0.1 },
      { type: 'particles', at: 'feet', count: 10, dir: 'up', speed: 3, gravity: -0.04, life: 26 }],
    hit: [{ type: 'impact', r: 34 }, { type: 'heart', r: 16, duration: 12 }],
  },
  // ---- 呪(メイ＆ロロ) ----
  // 呪いの打撃: 細い糸の弧と黒紫の粒。当たると呪いの印が浮かぶ
  curse: {
    color: '#8a3ad0',
    color2: '#ffb3f0',
    attack: [{ type: 'slash', width: 5, span: 2.2, duration: 10 }, { type: 'lines', count: 2, at: 'body', length: 50, width: 1.5 }, { type: 'particles', count: 5, speed: 3, dir: 'all', gravity: -0.03, life: 22, color: '#3a1a4a' }],
    hit: [{ type: 'sigil', r: 22, duration: 14 }, { type: 'burst', r: 24, duration: 9 }],
  },
  // ---- 光(アサカ) ----
  // 陽光の打撃: 金色の弧と花びら・きらめく星。当たると小さな光の花が咲く
  sunlight: {
    color: '#ffc83a',
    color2: '#fffbe0',
    attack: [{ type: 'slash', width: 8, span: 2, duration: 10 }, { type: 'petals', count: 4, speed: 3, life: 30 }, { type: 'star', count: 4, r: 9, spin: 3 }],
    hit: [{ type: 'bloom', r: 24, duration: 14, blend: 'add' }, { type: 'flash', r: 26, blend: 'add', duration: 8 }, { type: 'petals', count: 6, dir: 'all', speed: 3 }],
  },
  // 開花: 体のまわりに大輪の光の花がぱっと開き、花びらが四方へ散る
  bloom: {
    color: '#ffd84a',
    color2: '#fff6d0',
    start: [{ type: 'orb', at: 'body', r: 30, duration: 8, follow: true, blend: 'add' }],
    attack: [{ type: 'bloom', at: 'body', r: 85, count: 10, duration: 20, blend: 'add' }, { type: 'flash', at: 'body', r: 90, blend: 'add', duration: 10 },
      { type: 'petals', at: 'body', count: 16, dir: 'all', speed: 6, life: 46 }],
    hit: [{ type: 'impact', r: 34, color: '#ffb02a', color2: '#fffbe0' }, { type: 'petals', count: 8, dir: 'all', speed: 4 }],
  },
  // 天光: 空から光の柱が降りてくる(当たり判定の真ん中の真下へ)。足元に光の輪と花びら
  solar: {
    color: '#ffc83a',
    color2: '#fffbe0',
    attack: [{ type: 'pillar', at: 'ground', width: 64, duration: 24 }, { type: 'ring', at: 'ground', flat: true, r: 60, width: 5, grow: 1.2, duration: 18 },
      { type: 'petals', at: 'ground', count: 10, dir: 'up', speed: 5, spread: 0.7, delay: 5 }],
    hit: [{ type: 'impact', r: 40, color: '#ffb02a', color2: '#fffbe0' }, { type: 'flash', r: 50, blend: 'add', duration: 10 }, { type: 'shake', duration: 8, power: 5 }],
  },
};

// ---- 従来の決まった見た目のエフェクト(effect が色の番号のとき) ----
function atkFx(p, m) {
  if (spawnEffect(p, m, 'attack')) return; // 部品で作ったエフェクト(数字以外の effect)
  const c = EFFECT_COLORS[m.fx | 0],
    cx = p.x + p.f * (m.rx + (m.rw || 60) / 2),
    cy = m.rh ? p.y + m.ry + m.rh / 2 : p.y - 70,
    r = Math.max(32, (m.rw || 60) * 0.55);
  fx.push({
    k: 'arc',
    x: cx,
    y: cy,
    r,
    f: p.f,
    t: 12,
    l: 12,
    c,
    a: /^(u|au|su)$/.test(m.k) ? -1 : /^(d|ad|sd)$/.test(m.k) ? 1 : 0,
  });
  for (let i = 0; i < 9; i++)
    PT.push({
      x: cx,
      y: cy,
      vx: p.f * (1 + R() * 6),
      vy: (R() - 0.5) * 4 - (m.fx === 1 ? R() * 3 : 0),
      t: 18,
      l: 18,
      c,
    });
  if (m.fx === 4) fx.push({ k: 'zig', x: cx, y: cy, f: p.f, t: 8, l: 8, c });
  if (m.fx === 3)
    fx.push({ k: 'ring', x: p.x, y: p.y - 50, r: 60, t: 14, l: 14, c });
  if (m.fx === 2 || m.k === 'ad' || m.k === 'su')
    fx.push({
      k: 'ring',
      x: p.x,
      y: Math.min(GY, p.y),
      r: 90,
      t: 14,
      l: 14,
      c,
      e: 1,
    });
  for (let i = 0; i < 3; i++)
    fx.push({
      k: 'line',
      x: p.x - p.f * 20,
      y: cy + (i - 1) * 14,
      f: p.f,
      t: 10,
      l: 10,
      c,
    });
}

// ================= 技のエフェクト(部品の組み合わせ) =================
//  effect: 3                                  … 今まで通り(色の番号。決まった見た目)
//  effect: 'fire'                             … プリセットの名前
//  effect: { preset: 'fire', color: '#4cf' }  … プリセットの色・大きさなどを変える
//  effect: [ {部品}, {部品} ]                  … 攻撃の瞬間に出す部品の一覧
//  effect: { start: [...], attack: [...], hit: [...] } … 出始め(溜め) / 攻撃の瞬間 / 当たった瞬間 に分けて書く
let shakeT = 0, shakeP = 0; // 画面の揺れ(部品 shake)
const FX_PHASES = ['start', 'attack', 'hit'];
const FX_COMMON = ['color', 'color2', 'size', 'duration', 'blend', 'strength'];
function effectSpec(m) {
  if (m._fxs !== undefined) return m._fxs;
  let e = m.fx;
  if (e == null || typeof e === 'number') return (m._fxs = null); // 今まで通りの決まった見た目
  if (typeof e === 'string') e = { preset: e };
  if (Array.isArray(e)) e = { attack: e };
  // 以前の書き方 { color, size, duration, particles, particleLife, shapes } を部品に読み替える
  if (!e.preset && !e.attack && !e.start && !e.hit && !e.layers) {
    const L = (e.shapes || [e.shape || 'slash']).map((s) => ({ type: s, at: s === 'wave' ? 'feet' : 'hitbox' }));
    L.push({ type: 'particles', count: e.particles ?? 6, life: e.particleLife || 18 });
    e = { ...e, attack: L };
  }
  const base = e.preset ? (typeof EFFECT_PRESETS !== 'undefined' && EFFECT_PRESETS[e.preset]) || null : null;
  if (e.preset && !base) console.warn('エフェクトのプリセット「' + e.preset + '」がありません(effect.js の EFFECT_PRESETS)');
  const b = Array.isArray(base) ? { attack: base } : base || {},
    spec = { common: {} };
  for (const k of FX_COMMON) {
    if (b[k] != null) spec.common[k] = b[k];
    if (e[k] != null) spec.common[k] = e[k];
  }
  spec.start = e.start ?? b.start ?? [];
  spec.attack = e.attack ?? e.layers ?? b.attack ?? b.layers ?? [];
  spec.hit = e.hit ?? b.hit ?? [];
  return (m._fxs = spec);
}
// 技のエフェクトの代表色(当たったときの火花などに使う)
function fxColor(m) {
  const sp = effectSpec(m);
  if (!sp) return EFFECT_COLORS[m.fx | 0];
  const L = [...sp.attack, ...sp.hit, ...sp.start].find((l) => l.color);
  return sp.common.color || (L && L.color) || EFFECT_COLORS[0];
}
// 技のエフェクトを出す。phase = 'start'(技の出始め) / 'attack'(攻撃の瞬間) / 'hit'(当たった瞬間。hx, hy=当たった場所)
function spawnEffect(p, m, phase, hx, hy) {
  const sp = effectSpec(m);
  if (!sp) return false;
  const layers = sp[phase] || [],
    cm = sp.common,
    bx = p.x + p.f * (m.rx + (m.rw || 60) / 2),
    by = m.rh ? p.y + m.ry + m.rh / 2 : p.y - 70,
    r0 = Math.max(32, (m.rw || 60) * 0.55),
    auto = /^(u|au|su)$/.test(m.k) ? -1 : /^(d|ad|sd)$/.test(m.k) ? 1 : 0;
  const AT = {
    hitbox: [bx, by], // 技の当たり判定の真ん中
    body: [p.x, p.y - 60], // 体の真ん中
    feet: [p.x, Math.min(GY, p.y)], // 足元
    front: [p.x + p.f * 34, p.y - 70], // 体の少し前
    head: [p.x, p.y - 110], // 頭の上
    hit: [hx ?? bx, hy ?? by], // 当たった場所
    base: [p.x + p.f * (m.rx || 0), by], // 技の当たり判定の手前の端(突きの光線の出どころ)
    ground: [bx, GY], // 技の当たり判定の真ん中の真下の地面(空から降りる光の柱など)
  };
  for (let L0 of layers) {
    // strength(強さ): 技全体の strength × 部品の strength。0 でその部品は出ない。大きいほど量・太さ・勢いが増える
    const st = Math.max(0, Math.min(5, (cm.strength ?? 1) * (L0.strength ?? 1)));
    if (st <= 0) continue;
    if (L0.type === 'drops') L0 = { ...L0, type: 'blood' };   // drops = 血しぶきと同じ動き(しずくが飛んで水たまりになる)。色は技の色
    const L = { ...cm, ...L0 },
      gain = 0.6 + 0.4 * st, //       太さ・勢いの倍率(強さ1で1倍、2で1.4倍)
      grow = 0.85 + 0.15 * st, //     炎・光など「かたまり」の大きさの倍率
      size = (cm.size || 1) * (L0.size || 1) * ({ flame: grow, flash: grow, orb: grow, star: grow, burst: grow, impact: grow, heart: grow, bloom: grow }[L0.type] || 1),
      [ax, ay] = AT[L.at || (phase === 'hit' ? 'hit' : 'hitbox')] || AT.hitbox,
      x = ax + p.f * (L.x || 0),
      y = ay + (L.y || 0),
      dur = Math.round((L.duration ?? (L.type === 'blood' ? 44 : L.type === 'petals' ? 40 : 12)) * (0.9 + 0.1 * st)),   // 血は地面に落ちて残るので長め / 花びらはゆっくり舞うので長め
      // 強さで増える数(炎の舌・放射線・速度線・粒・稲妻の本数・星の数)
      N0 = { flame: 4, burst: 8, lines: 3, particles: 8, debris: 6, impact: 10, blood: 10, petals: 8 }[L.type],
      n = N0 ? Math.max(1, Math.round((L.count ?? N0) * st)) : L.count,
      W0 = { sigil: 2.5, slash: 10, cross: 8, ring: 6, wave: 6, spark: 3, burst: 5, beam: 10, lines: 3, crescent: 10, impact: 3, claw: 7, spout: 20, pillar: 50 }[L.type],
      R0 = { sigil: r0 * 0.6, slash: r0, crescent: r0, claw: r0 * 0.9, blood: 3.2, petals: 4.5, bloom: r0 * 0.6, pillar: r0, spout: r0, impact: r0 * 0.7, debris: 7, ring: r0 * 0.7, wave: r0 * 0.9, spark: r0, flame: r0, burst: r0, beam: m.rw > 0 ? m.rw : r0, lines: 50, flash: r0 * 0.8, star: r0 * 0.5, heart: r0 * 0.45, orb: r0 * 0.4, cross: r0 * 0.6 }[L.type] ?? r0;
    fx.push({
      k: 'e', type: L.type, x, y, f: p.f, t: dur, l: dur, dl: L.delay | 0,
      r: (L.r ?? R0) * size, c: L.color || EFFECT_COLORS[0], c2: L.color2 || '#fff', w: W0 ? (L.width ?? W0) * gain : L.width, ang: L.angle == null || L.angle === 'auto' ? auto : L.angle,
      span: L.span, n, len: L.length, bolts: L.type === 'spark' ? Math.max(1, Math.round(st)) : 1, add: L.blend === 'add', spin: L.spin || 0, text: L.text, flat: L.flat, grow: L.grow ?? 1,
      own: L.follow ?? (L.type === 'flame' && phase !== 'hit') ? p : null, ox: x - p.x, oy: y - p.y, // 炎は既定でキャラに付いていく
      // 炎(flame)用: rate=1Fに出す火の粉の数 rise=昇る速さ buoy=上への加速 spread=横のばらつき push=前へ吹き出す速さ smoke=煙になる割合
      rate: (L.count ?? 4) * 0.7 * st, rise: (L.rise ?? 2.2) * size, buoy: (L.buoyancy ?? 0.17) * size, spread: (L.spread ?? 0.9) * size, push: L.push ?? 0,
      smoke: L.smoke ?? 0.2,
      ...(L.type === 'flame' ? flameDir(L.dir, p.f) : {}), // 炎の向き(fdx, fdy)。dir で変えられる(既定は上)
      // 粒(particles)用
      spd: (L.speed ?? 5) * size * (0.8 + 0.2 * st), dir: L.dir || 'forward', spr: L.spread ?? 0.8, grav: L.gravity ?? 0.15, life: Math.round((L.life ?? (L.type === 'flame' ? 24 : 18)) * (0.9 + 0.1 * st)), ps: L.particleSize ?? 1,
      pow: (L.power ?? 6) * st,
      seed: R() * 1000, // 形のばらつき(impact のぎざぎざなど)
    });
    // 星は強さ2以上で、まわりに小さい星が増える
    if (L.type === 'star') for (let k = 1; k < Math.round(st); k++) {
      const a = R() * Math.PI * 2, d = R() * 28 + 14;
      fx.push({ ...fx[fx.length - 1], x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, r: (L.r ?? R0) * size * 0.5, dl: (L.delay | 0) + k * 2, own: null });
    }
  }
  return true;
}

// ---- 炎(flame): 火の粉をたくさん出して昇らせる ----
//  炎の出どころ(エミッター)はキャラに付いていき、出た火の粉はその場で昇り続ける。
//  → キャラが動くと、古い火の粉が後ろに残って炎の尾が伸びる
let FIRE = [];
const FIRE_SPRITES = {};
const FIRE_MAX = 260; // 画面に出せる火の粉の上限(多すぎると重くなる。iPad などで重いときは減らす)
function hexRGB(c) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(c).trim());
  if (!m) return [255, 140, 50];
  let h = m[1];
  if (h.length === 3) h = h.replace(/./g, '$&$&');
  return [0, 2, 4].map((i) => parseInt(h.substr(i, 2), 16));
}
// 色ごとの火の粉の絵(ぼかした丸)を作って使い回す。stage: 0=芯 1=炎 2=炎の先(暗い) 3=煙
function fireSprite(c, c2, stage) {
  const key = c + '|' + c2 + '|' + stage;
  if (FIRE_SPRITES[key]) return FIRE_SPRITES[key];
  const s = document.createElement('canvas');
  s.width = s.height = 64;
  const x = s.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32),
    [r, g_, b] = hexRGB(c), [r2, g2, b2] = hexRGB(c2), rgba = (r, g, b, a) => `rgba(${r | 0},${g | 0},${b | 0},${a})`;
  if (stage === 0) {
    gr.addColorStop(0, rgba(r2 * 0.5 + 127, g2 * 0.5 + 127, b2 * 0.5 + 110, 0.85));
    gr.addColorStop(0.35, rgba(r2, g2, b2, 0.6));
    gr.addColorStop(0.75, rgba(r, g_, b, 0.2));
  } else if (stage === 1) {
    gr.addColorStop(0, rgba((r + r2) / 2, (g_ + g2) / 2, (b + b2) / 2, 0.75));
    gr.addColorStop(0.5, rgba(r, g_, b, 0.4));
  } else if (stage === 2) {
    gr.addColorStop(0, rgba(r * 0.9, g_ * 0.55, b * 0.45, 0.6));
    gr.addColorStop(0.5, rgba(r * 0.6, g_ * 0.2, b * 0.15, 0.25));
  } else {
    gr.addColorStop(0, 'rgba(70,64,60,0.45)');
    gr.addColorStop(0.6, 'rgba(50,46,44,0.18)');
  }
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = gr;
  x.fillRect(0, 0, 64, 64);
  return (FIRE_SPRITES[key] = s);
}
// 炎の向き。dir: 'up'(上・省略時) / 'down'(下) / 'forward'(前) / 'back'(後ろ) / 数字=角度(度)
//   角度は 0=前 90=上 -90=下 180=後ろ 45=斜め前上 のように書く(キャラが左を向くと自動で左右反転)
//   戻り値の fdx, fdy は火の粉が進む向き(画面上。fdy はマイナスが上)
const FLAME_DIRS = { up: 90, down: -90, forward: 0, back: 180 };
function flameDir(d, f) {
  const deg = typeof d === 'number' ? d : FLAME_DIRS[d] ?? 90, a = (deg * Math.PI) / 180;
  return { fdx: f * Math.cos(a), fdy: -Math.sin(a) };
}
// 毎フレーム: 炎の出どころから火の粉を出す(出ている時間の後ろ 3割は出さずに消えていく)
//   dx, dy = 炎の向き / nx, ny = それと直角な向き(横のばらつき・ゆらぎに使う)
function fireEmit(f) {
  const ex = f.own ? f.own.x + f.ox : f.x,
    ey = f.own ? f.own.y + f.oy : f.y,
    vx = f.lx == null ? 0 : ex - f.lx, // 出どころの動き(このぶん火の粉が後ろに残る)
    vy = f.ly == null ? 0 : ey - f.ly,
    dx = f.fdx ?? 0, dy = f.fdy ?? -1, nx = -dy, ny = dx;
  f.lx = ex;
  f.ly = ey;
  if (f.t < f.l * 0.3) return;
  const rate = Math.min(f.rate * (0.6 + 0.8 * R()), FIRE_MAX - FIRE.length);
  for (let i = 0; i < rate; i++) {
    const life = f.life * (0.7 + R() * 0.6),
      side = (R() - 0.5) * f.r * 0.6, back = (R() - 0.2) * f.r * 0.2, // 出る位置: 横のばらつき / 少し根元側
      jit = (R() - 0.5) * f.spread, sp = f.rise * (0.6 + R() * 0.8);  // 速さ: 横のばらつき / 炎の向きへの速さ
    FIRE.push({
      x: ex + nx * side - dx * back - vx * R(), // 動いているときは、前のフレームとの間にも出す(途切れない)
      y: ey + ny * side - dy * back - vy * R(),
      vx: vx * 0.25 + nx * jit + dx * sp + f.f * f.push,
      vy: vy * 0.25 + ny * jit + dy * sp,
      a: 0, life, size: f.r * (0.32 + R() * 0.24), seed: R() * 100, c: f.c, c2: f.c2, smoke: R() < f.smoke, buoy: f.buoy,
      dx, dy, rot: Math.atan2(dx, -dy), // rot = 炎の形を回す角度(上向きなら 0)
    });
  }
}
function fireStep() {
  FIRE = FIRE.filter((q) => {
    const dx = q.dx ?? 0, dy = q.dy ?? -1, nx = -dy, ny = dx;
    q.a += 1 / q.life;
    const b = q.buoy * (1 - q.a * 0.6); // 熱いうちは炎の向きへ加速
    q.vx += dx * b;
    q.vy += dy * b;
    const w = Math.sin(q.a * 9 + q.seed) * 0.22 + Math.sin(fr * 0.35 + q.seed * 0.1) * 0.06; // ゆらぎ(火の粉ごと + 全体のゆらめき)
    q.vx += nx * w;
    q.vy += ny * w;
    // 減速: 炎の向きは 0.95、横は 0.92(横のぶれは早く収まる)
    const along = q.vx * dx + q.vy * dy, perp = q.vx * nx + q.vy * ny;
    q.vx = dx * along * 0.95 + nx * perp * 0.92;
    q.vy = dy * along * 0.95 + ny * perp * 0.92;
    q.x += q.vx;
    q.y += q.vy;
    return q.a < 1;
  });
}
// 炎の形の絵(しずく形: 下が丸く上がとがる)を色ごとに作って使い回す。smoke=true で丸い煙
const FIRE_SHAPES = {};
function fireShape(col, smoke) {
  const key = col + (smoke ? '|s' : '');
  if (FIRE_SHAPES[key]) return FIRE_SHAPES[key];
  const s = document.createElement('canvas');
  s.width = s.height = 64;
  const x = s.getContext('2d');
  x.fillStyle = col;
  x.beginPath();
  if (smoke) x.arc(32, 32, 30, 0, 7);
  else {
    x.moveTo(32, 8);
    x.quadraticCurveTo(50, 28, 53, 41);
    x.arc(32, 41, 21.5, 0.15, Math.PI - 0.15);
    x.quadraticCurveTo(14, 28, 32, 8);
  }
  x.fill();
  return (FIRE_SHAPES[key] = s);
}
const rgbStr = ([r, g, b]) => `rgb(${r | 0},${g | 0},${b | 0})`;
// キャラの絵柄に合わせたアニメ調の炎: 暗い縁取り → 炎の色 → 中間の色 → 芯 の順に、くっきりした色の段で重ねる
function drawFire() {
  if (!FIRE.length) return;
  g.save();
  const pal = {};
  const palette = (c, c2) => {
    const k = c + '|' + c2;
    if (pal[k]) return pal[k];
    const a = hexRGB(c), b = hexRGB(c2);
    return (pal[k] = {
      line: rgbStr(a.map((v) => v * 0.42)), // 縁取り(炎の色を暗く)
      outer: rgbStr(a), //                     外側(炎の色)
      mid: rgbStr(a.map((v, i) => v * 0.45 + b[i] * 0.55)), // 中間
      core: rgbStr(b.map((v) => Math.min(255, v * 0.6 + 110))), // 芯(明るく)
    });
  };
  const LAYERS = [
    // [描くもの, 大きさの倍率, 描く年齢の上限(0〜1)]
    ['smoke', 1, 1],
    ['line', 1.16, 1],
    ['outer', 1, 1],
    ['mid', 0.66, 0.62],
    ['core', 0.36, 0.34],
  ];
  for (const [layer, mul, maxA] of LAYERS) {
    for (const q of FIRE) {
      const smokeNow = q.smoke && q.a > 0.55;
      if ((layer === 'smoke') !== smokeNow) continue;
      if (q.a > maxA) continue;
      // 生まれてふくらみ、昇るにつれて細くなり、最後は小さくなって消える(上の段ほど早く消える)
      const life = layer === 'smoke' ? 1 : Math.min(1, (maxA - q.a) / (maxA * 0.55)),
        grow = smokeNow ? 0.7 + q.a * 0.9 : (q.a < 0.15 ? 0.55 + q.a * 3 : 1) * life,
        s = q.size * grow * mul,
        sp = Math.hypot(q.vx, q.vy);
      if (s <= 0.6) continue;
      const P = palette(q.c, q.c2),
        img = layer === 'smoke' ? fireShape('#5b5550', true) : fireShape(P[layer], false);
      g.globalAlpha = smokeNow ? (1 - q.a) * 0.75 : 1;
      // 速く昇る火の粉ほど縦に長い(炎の舌の形)。炎の向きに合わせて形を回す
      const dw = s * 1.5, dh = s * 2 * (layer === 'smoke' ? 1 : 1 + Math.min(1, sp * 0.15));
      if (q.rot && layer !== 'smoke') {
        g.save();
        g.translate(q.x, q.y);
        g.rotate(q.rot);
        g.drawImage(img, -dw / 2, -dh * 0.62, dw, dh);
        g.restore();
      } else g.drawImage(img, q.x - dw / 2, q.y - dh * 0.62, dw, dh);
    }
  }
  g.restore();
}

// ---- 移動中のきらきら光る粉塵 ----
//  drawing_character.js の CHARACTER_DRAWS[キャラ名].moveDust を書いたキャラは、動いている間(歩き・走り・ダッシュ・ジャンプ)に
//  体のまわりから光る粉が舞い散る。速く動くほどたくさん出て、ふわっと漂いながら、またたいて消える
//  moveDust: { color: '#ff7ac0', color2: '#fff', rate: 1, size: 1, life: 40, from: 0.1, to: 0.7 }
//    color / color2 = 粉の色(2色が混ざる) / rate = 出る量の倍率 / size = 粉の大きさの倍率 / life = 残る長さF
//    from / to = 出る高さ(足元=0 〜 頭=1 の割合)。省略時は腰〜胸のあたり / behind = 体の後ろへずらす量(px)
//    when = 出す条件: 省略時はいつでも / 'wing' などの名前 = キャラの記憶(揺れ物の状態)のその値が 0.3 より大きい間だけ
//           (リリスは when: 'wing' … 夢幻蝶で羽が生えている間だけ)
let DUST = [];
const DUST_MAX = 220; // 画面に出せる粉の上限(重いときは減らす)
function dustSettingOf(p) {
  const d = typeof CHARACTER_DRAWS !== 'undefined' && p && p.ch && CHARACTER_DRAWS[p.ch.nm];
  return d && d.moveDust;
}
function updateMoveDust() {
  if (typeof A === 'undefined' || !A) return;
  for (const p of [A, B]) {
    const D = dustSettingOf(p);
    if (!D || p.st === 'hit' || p.st === 'held' || p.st === 'break') continue;
    if (D.when) {                                                      // 条件: 羽が生えている間だけ など
      const mem = typeof PHYS !== 'undefined' ? PHYS.get(p) : null;
      if (!mem || !((mem[D.when] || 0) > 0.3)) continue;
    }
    const sp = Math.hypot(p.vx || 0, p.vy || 0);                     // 動く速さ
    if (sp < 1) continue;
    const cd = CHARACTER_DRAWS[p.ch.nm], H = 100 * ((cd.body && cd.body.scale) || 1),   // 体の高さ(だいたい)
      rate = Math.min(4, sp * 0.22) * (D.rate ?? 1);
    for (let n = rate; n > 0; n--) {
      if (n < 1 && R() > n) break;                                     // 1未満の分は確率で出す
      if (DUST.length >= DUST_MAX) DUST.shift();
      const h = (D.from ?? 0.1) + R() * ((D.to ?? 0.7) - (D.from ?? 0.1)),
        life = (D.life ?? 40) * (0.6 + R() * 0.8);
      DUST.push({
        x: p.x - p.f * ((D.behind ?? 0) + R() * 14) + (R() - 0.5) * 18, y: p.y - H * h + (R() - 0.5) * 8,
        vx: -(p.vx || 0) * (0.08 + R() * 0.12) + (R() - 0.5) * 0.6,   // 少しだけ後ろへ残って、漂う
        vy: -(p.vy || 0) * 0.08 - 0.15 - R() * 0.45,                   // ふわっと昇る
        a: 0, life, size: (1.6 + R() * 2.2) * (D.size ?? 1), seed: R() * 6.3,
        c: R() < 0.35 ? D.color2 || '#fff' : D.color || '#ffd0f0',
      });
    }
  }
  DUST = DUST.filter((d) => {
    d.a += 1 / d.life;
    d.vx *= 0.96;
    d.vy = d.vy * 0.97 - 0.01;
    d.x += d.vx + Math.sin(d.a * 8 + d.seed) * 0.2;                    // ゆらゆら
    d.y += d.vy;
    return d.a < 1;
  });
}
// 粉を描く: 光のにじみ + 十字のきらめき。またたく(大きさと明るさが揺れる)
function drawMoveDust() {
  if (!DUST.length) return;
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (const d of DUST) {
    const tw = 0.55 + 0.45 * Math.sin(d.a * 22 + d.seed * 3),          // またたき
      fade = d.a < 0.15 ? d.a / 0.15 : 1 - (d.a - 0.15) / 0.85,
      s = d.size * (0.6 + 0.6 * tw);
    if (fade <= 0) continue;
    g.globalAlpha = fade * 0.35;
    g.fillStyle = d.c;
    g.beginPath();
    g.arc(d.x, d.y, s * 1.8, 0, 7);                                    // にじみ
    g.fill();
    g.globalAlpha = fade * (0.6 + 0.4 * tw);
    g.beginPath();                                                     // 十字のきらめき(細い菱形を2つ)
    g.moveTo(d.x, d.y - s * 2.2); g.lineTo(d.x + s * 0.4, d.y); g.lineTo(d.x, d.y + s * 2.2); g.lineTo(d.x - s * 0.4, d.y); g.closePath();
    g.moveTo(d.x - s * 2.2, d.y); g.lineTo(d.x, d.y + s * 0.4); g.lineTo(d.x + s * 2.2, d.y); g.lineTo(d.x, d.y - s * 0.4); g.closePath();
    g.fill();
    g.fillStyle = '#fff';
    g.beginPath();
    g.arc(d.x, d.y, s * 0.45, 0, 7);                                   // 真ん中の白い点
    g.fill();
  }
  g.restore();
}

// ---- 狂化のオーラ(character.js の rage を持つキャラ。体力が少ないと、体から血の霧が立ちのぼり、血がしたたる) ----
//  rageActive(p) は script.js。狂化した瞬間に「狂化!」の文字と赤い輪が出る
let RAGE = [];
const RAGE_MAX = 160;
function updateRageAura() {
  if (typeof A === 'undefined' || !A || typeof rageActive !== 'function') return;
  for (const p of [A, B]) {
    const on = rageActive(p) && p.st !== 'ko';
    if (on && !p.rageShown) {                                           // 狂化した瞬間
      fx.push({ k: 'ring', x: p.x, y: p.y - 60, r: 110, t: 18, l: 18, c: '#c8102e' });
      fx.push({ k: 'txt', text: '狂化!', x: p.x, y: p.y - 170, t: 44, l: 44, c: '#ff3a4a', s: 22 });
      if (save.cfg.shake) { shakeT = Math.max(shakeT, 10); shakeP = Math.max(shakeP, 4); }
    }
    p.rageShown = on;
    if (!on) continue;
    const H = 100 * (((CHARACTER_DRAWS[p.ch.nm] || {}).body || {}).scale || 1);
    for (let n = 0; n < 2; n++) {                                       // 血の霧(ゆらゆら昇る)
      if (RAGE.length >= RAGE_MAX) RAGE.shift();
      RAGE.push({ k: 0, x: p.x + (R() - 0.5) * 44, y: p.y - R() * H * 0.95, vx: (R() - 0.5) * 0.6 - (p.vx || 0) * 0.1, vy: -0.6 - R() * 1.3,
        a: 0, life: 28 + R() * 26, size: 7 + R() * 9, c: R() < 0.3 ? '#ff2a3a' : R() < 0.6 ? '#a0001a' : '#5a0010' });
    }
    if (R() < 0.18) RAGE.push({ k: 1, x: p.x + (R() - 0.5) * 30, y: p.y - H * (0.3 + R() * 0.5), vx: (R() - 0.5) * 0.4, vy: 0, a: 0, life: 60, size: 2 + R() * 1.5, c: '#9a0016' }); // したたる血
  }
  RAGE = RAGE.filter((d) => {
    d.a += 1 / d.life;
    if (d.k === 1) {
      if (d.y < GY) { d.vy += 0.3; d.x += d.vx; d.y = Math.min(GY, d.y + d.vy); }
    } else {
      d.vx *= 0.97;
      d.x += d.vx + Math.sin(d.a * 9 + d.size) * 0.3;
      d.y += d.vy;
    }
    return d.a < 1;
  });
}
// 狂化のオーラを描く(キャラの絵の後ろ。script.js の描画から呼ぶ)
function drawRageAura() {
  if (typeof A === 'undefined' || !A) return;
  g.save();
  for (const p of [A, B]) {                                             // 体のまわりの、脈打つ赤い光
    if (typeof rageActive !== 'function' || !rageActive(p) || p.st === 'ko') continue;
    const pulse = 0.5 + 0.5 * Math.sin(fr * 0.2), cy = p.y - 55, rr = 70 + pulse * 10,
      gr = g.createRadialGradient(p.x, cy, 8, p.x, cy, rr);
    gr.addColorStop(0, 'rgba(200,16,46,' + (0.22 + pulse * 0.12) + ')');
    gr.addColorStop(1, 'rgba(120,0,20,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.ellipse(p.x, cy, rr * 0.8, rr * 1.15, 0, 0, 7);
    g.fill();
  }
  for (const d of RAGE) {
    const fade = d.a < 0.2 ? d.a / 0.2 : 1 - (d.a - 0.2) / 0.8;
    if (fade <= 0) continue;
    g.fillStyle = d.c;
    if (d.k === 1) {                                                    // しずく(地面に落ちたら小さな血だまり)
      g.globalAlpha = fade * 0.9;
      g.beginPath();
      if (d.y >= GY) g.ellipse(d.x, GY + 1, d.size * 2.2, d.size * 0.5, 0, 0, 7);
      else g.ellipse(d.x, d.y, d.size * 0.8, d.size * 1.5, 0, 0, 7);
      g.fill();
    } else {
      g.globalAlpha = fade * 0.32;
      g.beginPath();
      g.arc(d.x, d.y, d.size * (0.7 + d.a * 0.8), 0, 7);
      g.fill();
    }
  }
  g.restore();
}

// 部品が出た瞬間の処理(粒をばらまく・画面を揺らす)
function effectFire(f) {
  if (f.type === 'particles') {
    const n = f.n ?? 8, base = { forward: f.f > 0 ? 0 : Math.PI, back: f.f > 0 ? Math.PI : 0, up: -Math.PI / 2, down: Math.PI / 2 }[f.dir];
    for (let i = 0; i < n; i++) {
      const a = f.dir === 'all' ? R() * Math.PI * 2 : base + (R() - 0.5) * 2 * f.spr,
        v = f.spd * (0.4 + R() * 0.8);
      PT.push({ x: f.x, y: f.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: f.life, l: f.life, c: R() < 0.3 ? f.c2 : f.c, g: f.grav, s: f.ps });
    }
    f.t = 1;
  } else if (f.type === 'debris') {
    // 岩のかけら: 形・回転・速さがばらばらの小さな多角形を飛ばす(地面で跳ねる)
    const n = f.n ?? 6, base = { forward: f.f > 0 ? 0 : Math.PI, back: f.f > 0 ? Math.PI : 0, up: -Math.PI / 2, down: Math.PI / 2 }[f.dir] ?? -Math.PI / 2;
    f.chunks = [];
    for (let i = 0; i < n; i++) {
      const a = f.dir === 'all' ? R() * Math.PI * 2 : base + (R() - 0.5) * 2 * Math.max(0.6, f.spr),
        v = f.spd * (0.5 + R() * 0.8), s = f.r * (0.6 + R() * 0.8);
      f.chunks.push({ x: f.x + (R() - 0.5) * 16, y: f.y - R() * 4, vx: Math.cos(a) * v, vy: Math.sin(a) * v, rot: R() * 6.3, vr: (R() - 0.5) * 0.5, s,
        pts: [0, 1, 2, 3, 4].map((k) => [k / 5 * Math.PI * 2, 0.7 + R() * 0.5]) });
    }
  } else if (f.type === 'blood') {
    // 血しぶき: しずくを飛ばす(重さで落ち、地面に落ちると血だまりになって消えていく)
    const n = f.n ?? 10, base = { forward: f.f > 0 ? 0 : Math.PI, back: f.f > 0 ? Math.PI : 0, up: -Math.PI / 2, down: Math.PI / 2 }[f.dir] ?? (f.f > 0 ? 0 : Math.PI);
    f.drops = [];
    for (let i = 0; i < n; i++) {
      const a = f.dir === 'all' ? R() * Math.PI * 2 : base + (R() - 0.5) * 2 * f.spr,
        v = f.spd * (0.35 + R() * 0.9);
      f.drops.push({ x: f.x + (R() - 0.5) * 10, y: f.y + (R() - 0.5) * 10, vx: Math.cos(a) * v, vy: Math.sin(a) * v - R() * 1.5,
        s: f.r * (0.55 + R() * 0.8) * f.ps, land: 0, w: 0 });
    }
  } else if (f.type === 'petals') {
    // 花びら: ひらひら回りながら舞い、ゆっくり落ちて消える(updateEffects で動かす)
    const n = f.n ?? 8, base = { forward: f.f > 0 ? 0 : Math.PI, back: f.f > 0 ? Math.PI : 0, up: -Math.PI / 2, down: Math.PI / 2 }[f.dir] ?? (f.f > 0 ? 0 : Math.PI);
    f.petals = [];
    for (let i = 0; i < n; i++) {
      const a = f.dir === 'all' ? R() * Math.PI * 2 : base + (R() - 0.5) * 2 * f.spr,
        v = f.spd * (0.35 + R() * 0.8);
      f.petals.push({ x: f.x + (R() - 0.5) * 12, y: f.y + (R() - 0.5) * 12, vx: Math.cos(a) * v, vy: Math.sin(a) * v, rot: R() * 6.3, vr: (R() - 0.5) * 0.35,
        s: f.r * (0.7 + R() * 0.6) * f.ps, ph: R() * 6.3, c: R() < 0.3 ? f.c2 : f.c });
    }
  } else if (f.type === 'shake') {
    if (save.cfg.shake) {
      shakeT = Math.max(shakeT, f.l);
      shakeP = Math.max(shakeP, f.pow);
    }
    f.t = 1;
  }
}

// 毎フレームのエフェクトの更新(script.js の upd から呼ぶ。ヒットストップ中は呼ばれない)
function updateEffects() {
  fx = fx.filter((f) => {
    if (f.dl > 0) return f.dl--, true; // delay: 出るまで待つ
    if (f.k === 'e' && !f.fired) (f.fired = 1), effectFire(f);
    if (f.k === 'e' && f.type === 'flame') fireEmit(f); // 炎は出ている間ずっと火の粉を出す
    if (f.k === 'e' && f.chunks) for (const c of f.chunks) { // 岩のかけらを動かす(重さで落ち、地面で跳ねる)
      c.vy += 0.45;
      c.x += c.vx;
      c.y += c.vy;
      c.rot += c.vr;
      if (c.y > GY - c.s * 0.5) { c.y = GY - c.s * 0.5; c.vy *= -0.35; c.vx *= 0.6; c.vr *= 0.6; }
    }
    if (f.k === 'e' && f.drops) for (const d of f.drops) { // 血のしずくを動かす(地面に落ちたら血だまりになる)
      if (d.land) { d.w = Math.min(d.w + 0.6, d.s * 3.2); continue; }
      d.vy += 0.38;
      d.vx *= 0.985;
      d.x += d.vx;
      d.y += d.vy;
      if (d.y >= GY) { d.y = GY; d.land = 1; d.w = d.s * 1.2; }
    }
    if (f.k === 'e' && f.petals) for (const d of f.petals) { // 花びらを動かす(空気に押されて減速し、ゆらゆら落ちる)
      d.vx *= 0.93;
      d.vy = d.vy * 0.93 + 0.07;
      d.ph += 0.18;
      d.x += d.vx + Math.sin(d.ph) * 0.7;
      d.y = Math.min(GY - 2, d.y + d.vy);
      d.rot += d.vr + Math.sin(d.ph) * 0.04;
    }
    return --f.t > 0;
  });
  fireStep();
  updateMoveDust(); // 移動中のきらきら光る粉塵
  updateRageAura(); // 狂化のオーラ(バーサク)
  if (shakeT > 0 && --shakeT <= 0) shakeP = 0;
}

// 部品の描き方。u = 残り(1→0) / q = 進み(0→1)
function drawEffect(f) {
  if (f.dl > 0 || f.type === 'particles' || f.type === 'shake' || (f.type === 'debris' && !f.chunks) || (f.type === 'blood' && !f.drops) || (f.type === 'petals' && !f.petals)) return;
  const u = f.t / f.l, q = 1 - u,
    x = f.own ? f.own.x + f.ox : f.x,
    y = f.own ? f.own.y + f.oy : f.y,
    r = f.r;
  g.save();
  if (f.add) g.globalCompositeOperation = 'lighter';
  g.globalAlpha = Math.min(1, u * 1.4);
  g.strokeStyle = g.fillStyle = f.c;
  g.lineCap = g.lineJoin = 'round';
  switch (f.type) {
    case 'slash': { // 斬撃の弧  width=太さ span=弧の長さ(rad) angle=傾き(-1=上 1=下 'auto'=技の向き)
      const sp = (f.span ?? 2.2) / 2, a = f.ang * 0.9, rr = r * (1.2 - u * 0.25 * f.grow);
      g.translate(x, y);
      g.scale(f.f, 1);
      g.lineWidth = (f.w ?? 10) * (0.3 + u);
      g.beginPath();
      g.arc(-r * 0.4, 0, rr, -sp + a, sp + a);
      g.stroke();
      g.lineWidth = Math.max(1, (f.w ?? 10) * 0.2);
      g.strokeStyle = f.c2;
      g.beginPath();
      g.arc(-r * 0.4, 0, rr, -sp * 0.8 + a, sp * 0.8 + a);
      g.stroke();
      break;
    }
    case 'cross': { // ×字の斬撃
      const s = r * (0.7 + q * 0.5);
      g.lineWidth = (f.w ?? 8) * (0.3 + u);
      for (const k of [-1, 1]) {
        g.beginPath();
        g.moveTo(x - s, y - s * k);
        g.lineTo(x + s, y + s * k);
        g.stroke();
      }
      g.strokeStyle = f.c2;
      g.lineWidth = Math.max(1, (f.w ?? 8) * 0.25);
      for (const k of [-1, 1]) {
        g.beginPath();
        g.moveTo(x - s * 0.8, y - s * 0.8 * k);
        g.lineTo(x + s * 0.8, y + s * 0.8 * k);
        g.stroke();
      }
      break;
    }
    case 'ring': // 広がる輪  flat=true で地面の楕円  grow=広がる量
    case 'wave': { // 地面を走る衝撃波(足元に置く)
      const rr = r * (0.3 + q * f.grow), flat = f.flat ?? f.type === 'wave';
      g.lineWidth = (f.w ?? 6) * (0.3 + u);
      g.beginPath();
      if (flat) g.ellipse(x, y, rr * 1.2, rr * 0.18 + 4, 0, 0, 7);
      else g.arc(x, y, rr, 0, 7);
      g.stroke();
      break;
    }
    case 'spark': { // 稲妻  length=長さ  count=折れ目の数  (強さで本数が増える)
      const n = f.n ?? 6, len = f.len ?? r * 1.6, lw0 = f.w ?? 3;
      for (let b = 0; b < (f.bolts || 1); b++) {
        const bx = x + (b - ((f.bolts || 1) - 1) / 2) * 14;
        for (const [col, lw] of [[f.c, lw0], [f.c2, Math.max(1, lw0 * 0.4)]]) {
          g.strokeStyle = col;
          g.lineWidth = lw;
          g.beginPath();
          g.moveTo(bx, y - len / 2);
          for (let i = 1; i <= n; i++) g.lineTo(bx + f.f * i * (len / n) * 0.5 * (1.4 - u) + (R() - 0.5) * 16, y - len / 2 + (i * len) / n + (R() - 0.5) * 8);
          g.stroke();
        }
      }
      break;
    }
    case 'crescent': { // 三日月の軌跡(塗りつぶした斬撃・蹴りの跡)  width=いちばん太いところ span=弧の長さ angle=傾き
      const sp = (f.span ?? 2.2) / 2, a = f.ang * 0.9, rr = r * (1.2 - u * 0.25 * f.grow), th = (f.w ?? 10) * (0.4 + u * 0.9),
        cx = -r * 0.4;
      g.translate(x, y);
      g.scale(f.f, 1);
      g.rotate(a);
      g.beginPath();
      g.arc(cx, 0, rr, -sp, sp);                                    // 外側の弧
      g.arc(cx - th, 0, rr - th * 0.15, sp * 0.92, -sp * 0.92, true); // 内側の弧(真ん中ほど太くなる)
      g.closePath();
      g.globalAlpha *= 0.85;
      g.fill();
      g.globalAlpha /= 0.85;
      g.lineWidth = Math.max(1, th * 0.18);
      g.strokeStyle = f.c2;
      g.beginPath();
      g.arc(cx, 0, rr, -sp * 0.85, sp * 0.85);
      g.stroke();
      break;
    }
    case 'impact': { // 漫画のような、ぎざぎざの衝撃(当たった瞬間向き)  count=とがりの数
      const n = Math.max(5, f.n ?? 10), rr = r * (0.55 + 0.65 * Math.sqrt(q)) ;
      let sd = f.seed;
      const rnd = () => ((sd = (sd * 9301 + 49297) % 233280) / 233280);  // 毎フレーム同じ形になるように決まった乱数
      g.translate(x, y);
      g.rotate(f.seed);
      g.beginPath();
      for (let i = 0; i < n * 2; i++) {
        const ang = (i * Math.PI) / n, d = i % 2 ? rr * (0.45 + rnd() * 0.15) : rr * (0.85 + rnd() * 0.35);
        g.lineTo(Math.cos(ang) * d, Math.sin(ang) * d);
      }
      g.closePath();
      g.fillStyle = f.c2;
      g.fill();
      g.lineWidth = f.w ?? 3;
      g.strokeStyle = f.c;
      g.stroke();
      break;
    }
    case 'debris': { // 岩のかけら(effectFire で作り、updateEffects で動かす)
      g.globalAlpha = Math.min(1, u * 3);
      g.lineWidth = 1.5;
      g.strokeStyle = '#0008';
      for (const c of f.chunks) {
        g.save();
        g.translate(c.x, c.y);
        g.rotate(c.rot);
        g.beginPath();
        c.pts.forEach(([ang, k], i) => g[i ? 'lineTo' : 'moveTo'](Math.cos(ang) * c.s * k, Math.sin(ang) * c.s * k));
        g.closePath();
        g.fillStyle = f.c;
        g.fill();
        g.stroke();
        g.restore();
      }
      break;
    }
    case 'blood': { // 血しぶき(effectFire で作り、updateEffects で動かす)。飛んでいる間は速さの向きに伸びたしずく、落ちたら血だまり
      for (const d of f.drops) {
        if (d.land) {
          g.globalAlpha = Math.min(1, u * 2.2) * 0.85;
          g.fillStyle = f.c;
          g.beginPath();
          g.ellipse(d.x, GY + 1, d.w, Math.max(1.2, d.w * 0.22), 0, 0, 7);
          g.fill();
          continue;
        }
        const sp = Math.hypot(d.vx, d.vy), ang = Math.atan2(d.vy, d.vx), len = d.s * (1 + Math.min(3, sp * 0.3));
        g.globalAlpha = Math.min(1, u * 3);
        g.save();
        g.translate(d.x, d.y);
        g.rotate(ang);
        g.fillStyle = f.c;
        g.beginPath();                                                 // 後ろがとがったしずく
        g.moveTo(-len * 1.4, 0);
        g.quadraticCurveTo(-len * 0.2, -d.s, d.s * 0.2, -d.s * 0.9);
        g.arc(0, 0, d.s * 0.9, -Math.PI / 2, Math.PI / 2);
        g.quadraticCurveTo(-len * 0.2, d.s, -len * 1.4, 0);
        g.fill();
        g.fillStyle = f.c2;                                            // 光の当たる所
        g.globalAlpha *= 0.7;
        g.beginPath();
        g.arc(d.s * 0.15, -d.s * 0.35, d.s * 0.3, 0, 7);
        g.fill();
        g.restore();
      }
      break;
    }
    case 'claw': { // 獣の爪痕  count=本数(3) width=太さ angle=傾き(-1=下から上 0=斜め下 1=上から真下へ)
      const n = Math.max(1, f.n ?? 3), gap = r * 0.3, reveal = Math.min(1, q * 4), w0 = (f.w ?? 7) * (0.35 + u * 0.75),
        rot = f.ang === 0 ? 0.55 : f.ang * 0.75;
      g.translate(x, y);
      g.scale(f.f, 1);
      g.rotate(rot);
      for (let i = 0; i < n; i++) {
        const off = (i - (n - 1) / 2) * gap, top = [], bot = [], N = 12;
        for (let k = 0; k <= N; k++) {
          const t = (k / N) * reveal, px = -r + t * r * 2, py = off + Math.sin(t * Math.PI) * r * 0.18,
            hw = w0 * 0.5 * Math.sin(Math.max(0.08, t / Math.max(reveal, 0.01)) * Math.PI);
          top.push([px, py - hw]);
          bot.push([px, py + hw]);
        }
        g.beginPath();
        top.forEach(([a, b], k) => g[k ? 'lineTo' : 'moveTo'](a, b));
        for (let k = bot.length - 1; k >= 0; k--) g.lineTo(bot[k][0], bot[k][1]);
        g.closePath();
        g.fillStyle = f.c;
        g.fill();
        g.strokeStyle = f.c2;
        g.lineWidth = Math.max(1, w0 * 0.18);
        g.beginPath();
        top.forEach(([a, b], k) => g[k ? 'lineTo' : 'moveTo'](a, (b + bot[k][1]) / 2));
        g.stroke();
      }
      break;
    }
    case 'spout': { // 水柱  length=高さ width=太さ dir='down' で下向き(省略時は上向き)。根元から一気に伸び、細くなりながら消える
      const s = f.dir === 'down' ? 1 : -1, L = (f.len ?? r * 2) * Math.min(1, q * 4.5), w = (f.w ?? 20) * (0.45 + 0.55 * Math.min(1, u * 1.6)), N = 12;
      if (L < 2) break;
      const left = [], right = [];
      for (let k = 0; k <= N; k++) {
        const t = k / N, yy = y + s * L * t, wob = Math.sin(t * 9 + fr * 0.55 + f.seed) * w * 0.12, half = w * 0.5 * (0.7 + 0.45 * t);
        left.push([x - half + wob, yy]);
        right.push([x + half + wob, yy]);
      }
      const gr = g.createLinearGradient(x, y, x, y + s * L);
      gr.addColorStop(0, f.c);
      gr.addColorStop(1, f.c2);
      g.globalAlpha = Math.min(1, u * 2.5) * 0.88;
      g.fillStyle = gr;
      g.beginPath();
      left.forEach(([a, b], k) => g[k ? 'lineTo' : 'moveTo'](a, b));
      for (let k = N; k >= 0; k--) g.lineTo(right[k][0], right[k][1]);
      g.closePath();
      g.fill();
      g.lineWidth = 2;
      g.strokeStyle = 'rgba(10,40,90,.55)';
      g.stroke();
      g.globalAlpha *= 0.75;                                         // 光の筋
      g.strokeStyle = '#ffffff';
      g.lineWidth = Math.max(1.5, w * 0.12);
      g.beginPath();
      left.forEach(([a, b], k) => { const xx = a + (right[k][0] - a) * 0.3; g[k ? 'lineTo' : 'moveTo'](xx, b); });
      g.stroke();
      const tip = [(left[N][0] + right[N][0]) / 2, y + s * L];          // 先の水しぶき(丸いかたまり)
      g.fillStyle = f.c2;
      for (let k = 0; k < 5; k++) {
        const a = f.seed + k * 1.26, d = w * 0.35;
        g.beginPath();
        g.arc(tip[0] + Math.cos(a) * d, tip[1] + Math.sin(a) * d * 0.6, w * (0.16 + 0.05 * (k % 2)), 0, 7);
        g.fill();
      }
      break;
    }
    case 'petals': { // 花びら  count=枚数 speed=散る勢い dir=向き(all で四方) r=花びらの大きさ  (ひらひら舞い、ゆっくり落ちて消える)
      g.globalAlpha = Math.min(1, u * 2.2);
      for (const d of f.petals) {
        const s = d.s, flip = 0.35 + 0.65 * Math.abs(Math.cos(d.ph * 0.7));   // ひらひら: 裏返る途中は細く見える
        g.save();
        g.translate(d.x, d.y);
        g.rotate(d.rot);
        g.scale(1, flip);
        g.fillStyle = d.c;
        g.beginPath();
        g.moveTo(-s * 1.2, 0);
        g.quadraticCurveTo(-s * 0.2, -s * 0.95, s * 1.1, -s * 0.15);
        g.lineTo(s * 0.8, 0);
        g.lineTo(s * 1.1, s * 0.15);
        g.quadraticCurveTo(-s * 0.2, s * 0.95, -s * 1.2, 0);
        g.fill();
        g.globalCompositeOperation = 'lighter';
        g.globalAlpha *= 0.5;
        g.fillStyle = f.c2;
        g.beginPath();
        g.ellipse(-s * 0.2, 0, s * 0.6, s * 0.25, 0, 0, 7);
        g.fill();
        g.globalAlpha /= 0.5;
        g.globalCompositeOperation = f.add ? 'lighter' : 'source-over';
        g.restore();
      }
      break;
    }
    case 'bloom': { // 光の花が咲く  count=花びらの数 r=大きさ flat=true で地面に咲く(つぶれた形) spin=回転
      const n = f.n ?? 8, e = 1 - (1 - q) * (1 - q) * (1 - q), rr = r * (0.3 + 0.8 * e), sq = f.flat ? 0.32 : 1;
      g.translate(x, y);
      g.scale(1, sq);
      g.rotate(f.spin * q + (f.seed % 6.3));
      g.globalAlpha = Math.min(1, u * 1.8);
      for (const [k0, len, wd, col, off] of [[0, 0.62, 0.26, f.c, 0], [1, 0.42, 0.2, f.c2, Math.PI / n]]) {
        g.fillStyle = col;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + off;
          g.save();
          g.rotate(a);
          g.beginPath();
          g.moveTo(rr * 0.08, 0);
          g.quadraticCurveTo(rr * len * 0.55, -rr * wd, rr * len, 0);
          g.quadraticCurveTo(rr * len * 0.55, rr * wd, rr * 0.08, 0);
          g.fill();
          g.restore();
        }
      }
      const cg = g.createRadialGradient(0, 0, 0, 0, 0, rr * 0.22);
      cg.addColorStop(0, '#fff');
      cg.addColorStop(1, f.c);
      g.fillStyle = cg;
      g.beginPath();
      g.arc(0, 0, rr * 0.2, 0, 7);
      g.fill();
      break;
    }
    case 'pillar': { // 空から降りる光の柱  x,y=柱の根元(地面) width=太さ length=高さ(省略時は画面の上まで)
      const top = y - (f.len ?? y + 40), H = y - top, drop = Math.min(1, q * 4.5),            // はじめの 2割で空から降りてくる
        bot = top + H * drop, w = (f.w ?? 50) * (drop < 1 ? 0.45 : 0.75 + 0.5 * Math.sin(Math.min(1, (q - 0.22) * 2.2) * Math.PI * 0.5)) * (0.35 + 0.65 * Math.min(1, u * 2)),
        [cr, cg2, cb] = hexRGB(f.c), [wr, wg, wb] = hexRGB(f.c2);
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = Math.min(1, u * 2);
      const lg = g.createLinearGradient(x - w, 0, x + w, 0);
      lg.addColorStop(0, `rgba(${cr},${cg2},${cb},0)`);
      lg.addColorStop(0.3, `rgba(${cr},${cg2},${cb},0.55)`);
      lg.addColorStop(0.5, `rgba(${wr},${wg},${wb},0.95)`);
      lg.addColorStop(0.7, `rgba(${cr},${cg2},${cb},0.55)`);
      lg.addColorStop(1, `rgba(${cr},${cg2},${cb},0)`);
      g.fillStyle = lg;
      g.fillRect(x - w, top, w * 2, bot - top);
      g.fillStyle = '#fff';                                              // 芯の白い光
      g.globalAlpha *= 0.8;
      g.fillRect(x - w * 0.12, top, w * 0.24, bot - top);
      if (drop >= 1) {                                                   // 地面に当たった所の光
        const rg = g.createRadialGradient(x, y, 0, x, y, w * 1.6);
        rg.addColorStop(0, `rgba(${wr},${wg},${wb},0.9)`);
        rg.addColorStop(1, `rgba(${cr},${cg2},${cb},0)`);
        g.fillStyle = rg;
        g.beginPath();
        g.ellipse(x, y, w * 1.6, w * 0.45, 0, 0, 7);
        g.fill();
      } else {                                                           // 降りてくる先端の光の玉
        const rg = g.createRadialGradient(x, bot, 0, x, bot, w * 1.2);
        rg.addColorStop(0, '#fff');
        rg.addColorStop(1, `rgba(${cr},${cg2},${cb},0)`);
        g.fillStyle = rg;
        g.beginPath();
        g.arc(x, bot, w * 1.2, 0, 7);
        g.fill();
      }
      break;
    }
    case 'sigil': { // 呪いの印(回る魔法陣)  r=大きさ flat=true で地面に描く(つぶれた形) width=線の太さ
      const rr = r * (0.7 + 0.3 * Math.min(1, q * 4)), rot = (f.seed % 6.3) + q * 2.5;
      g.translate(x, y);
      if (f.flat) g.scale(1, 0.3);
      g.globalAlpha = Math.min(1, u * 2) * 0.9;
      g.lineWidth = f.w ?? 2.5;
      g.beginPath(); g.arc(0, 0, rr, 0, 7); g.stroke();
      g.lineWidth = (f.w ?? 2.5) * 0.6;
      g.beginPath(); g.arc(0, 0, rr * 0.78, 0, 7); g.stroke();
      g.rotate(rot);
      g.beginPath();                                                  // 中の五芒星
      for (let i = 0; i <= 5; i++) { const a = (i * 4 * Math.PI) / 5 - Math.PI / 2; g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr * 0.75, Math.sin(a) * rr * 0.75); }
      g.stroke();
      g.fillStyle = f.c2;
      for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; g.beginPath(); g.arc(Math.cos(a) * rr * 0.89, Math.sin(a) * rr * 0.89, Math.max(1, rr * 0.05), 0, 7); g.fill(); }   // 外の輪の上の小さな印
      break;
    }
    case 'flame': // 炎は火の粉で描く(drawFire)
      break;
    case 'burst': { // 放射状の衝撃(当たった瞬間向き)  count=線の数
      const n = f.n ?? 8, rr = r * (1.15 - u * 0.7 * f.grow);
      g.lineWidth = (f.w ?? 5) * (0.4 + u);
      g.beginPath();
      g.arc(x, y, rr, 0, 7);
      g.stroke();
      g.strokeStyle = f.c2;
      for (let i = 0; i < n; i++) {
        const a = (i * Math.PI * 2) / n + f.spin * q;
        g.beginPath();
        g.moveTo(x + Math.cos(a) * rr * 0.55, y + Math.sin(a) * rr * 0.55);
        g.lineTo(x + Math.cos(a) * rr * 1.25, y + Math.sin(a) * rr * 1.25);
        g.stroke();
      }
      break;
    }
    case 'beam': { // 前へ伸びる光線  length=長さ width=太さ
      const len = (f.len ?? r) * Math.min(1, q * 3);
      g.lineWidth = (f.w ?? 10) * (0.3 + u);
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + f.f * len, y);
      g.stroke();
      g.strokeStyle = f.c2;
      g.lineWidth = Math.max(1, (f.w ?? 10) * 0.25);
      g.stroke();
      break;
    }
    case 'lines': { // 速度線(体の後ろに流れる線)  count=本数 length=長さ
      const n = f.n ?? 3, len = f.len ?? 60;
      g.lineWidth = f.w ?? 3;
      for (let i = 0; i < n; i++) {
        const yy = y + (i - (n - 1) / 2) * 14;
        g.beginPath();
        g.moveTo(x - f.f * 20, yy);
        g.lineTo(x - f.f * (20 + len * (0.5 + q)), yy);
        g.stroke();
      }
      break;
    }
    case 'flash': { // 光(ふわっと光る円)
      const rr = r * (0.6 + q * 0.6 * f.grow), gr = g.createRadialGradient(x, y, 0, x, y, rr);
      gr.addColorStop(0, f.c2);
      gr.addColorStop(0.4, f.c);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.beginPath();
      g.arc(x, y, rr, 0, 7);
      g.fill();
      break;
    }
    case 'orb': { // 光の玉(溜めなど)。follow:true でキャラに付いていく
      const rr = r * (0.8 + Math.sin(q * Math.PI * 4) * 0.15), gr = g.createRadialGradient(x, y, 0, x, y, rr);
      gr.addColorStop(0, f.c2);
      gr.addColorStop(0.5, f.c);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.beginPath();
      g.arc(x, y, rr, 0, 7);
      g.fill();
      break;
    }
    case 'star': { // 星  count=とがりの数 spin=回転
      const n = f.n ?? 5, rr = r * (0.5 + q * 0.7 * f.grow);
      g.translate(x, y);
      g.rotate(f.spin * q);
      g.beginPath();
      for (let i = 0; i < n * 2; i++) {
        const a = (i * Math.PI) / n - Math.PI / 2, d = i % 2 ? rr * 0.42 : rr;
        g.lineTo(Math.cos(a) * d, Math.sin(a) * d);
      }
      g.closePath();
      g.fill();
      g.strokeStyle = f.c2;
      g.lineWidth = 2;
      g.stroke();
      break;
    }
    case 'heart': { // ハート(ふくらみながら少し昇る)
      const rr = r * (0.6 + q * 0.6 * f.grow);
      g.translate(x, y - q * 12);
      g.beginPath();
      g.moveTo(0, rr * 0.9);
      g.bezierCurveTo(-rr * 1.5, -rr * 0.1, -rr * 0.6, -rr * 1.15, 0, -rr * 0.4);
      g.bezierCurveTo(rr * 0.6, -rr * 1.15, rr * 1.5, -rr * 0.1, 0, rr * 0.9);
      g.closePath();
      g.fill();
      g.strokeStyle = f.c2;
      g.lineWidth = 2;
      g.stroke();
      break;
    }
    case 'text': { // 文字
      g.font = 'bold ' + Math.round(24 * (f.r / 30)) + 'px sans-serif';
      g.textAlign = 'center';
      g.lineWidth = 5;
      g.strokeStyle = '#000';
      const ty = y - q * 30;
      g.strokeText(f.text || '', x, ty);
      g.fillText(f.text || '', x, ty);
      break;
    }
  }
  g.restore();
}

// ジャストガードのエフェクト(青いリング + JUST GUARD!)
function drawJustGuard(f) {
  g.strokeStyle = '#7df';
  g.lineWidth = 5;
  g.beginPath();
  g.arc(f.x, f.y, (22 - f.t) * 5, 0, 7);
  g.stroke();
  g.strokeStyle = '#fff';
  g.lineWidth = 3;
  for (let k = 0; k < 8; k++) {
    const a = k * 0.785,
      r = (22 - f.t) * 3;
    g.beginPath();
    g.moveTo(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r);
    g.lineTo(f.x + Math.cos(a) * (r + 18), f.y + Math.sin(a) * (r + 18));
    g.stroke();
  }
  T('JUST GUARD!', f.x, f.y - 50 - (22 - f.t), 20, '#7df');
}

// fx の1つを描く(部品のエフェクト・従来のエフェクト・ジャストガード・文字など)
function drawFx(f) {
  if (f.jg) return drawJustGuard(f);
  if (f.k === 'e') return drawEffect(f); // 部品で作った技のエフェクト
  if (f.dl > 0) return;
  const u = f.l ? f.t / f.l : 1;
  g.save();
  g.globalAlpha = Math.min(1, u * 1.3);
  g.strokeStyle = g.fillStyle = f.c || '#ff0';
  if (f.k === 'arc') {
    g.translate(f.x, f.y);
    g.scale(f.f, 1);
    g.lineCap = 'round';
    g.lineWidth = 3 + u * 10;
    const r = f.r * (1.2 - u * 0.25);
    g.beginPath();
    g.arc(-f.r * 0.4, 0, r, -1.1 + f.a * 0.9, 1.1 + f.a * 0.9);
    g.stroke();
    g.lineWidth = 2;
    g.strokeStyle = '#fff';
    g.beginPath();
    g.arc(-f.r * 0.4, 0, r, -0.9 + f.a * 0.9, 0.9 + f.a * 0.9);
    g.stroke();
  } else if (f.k === 'ring') {
    g.lineWidth = 2 + u * 6;
    g.beginPath();
    if (f.e) g.ellipse(f.x, f.y, f.r * (1.2 - u), (1.2 - u) * 14, 0, 0, 7);
    else g.arc(f.x, f.y, f.r * (1.3 - u), 0, 7);
    g.stroke();
  } else if (f.k === 'zig') {
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(f.x, f.y - 40);
    for (let i = 1; i < 7; i++)
      g.lineTo(
        f.x + f.f * i * 12 * (1.4 - u) + (R() - 0.5) * 18,
        f.y - 40 + i * 14 + (R() - 0.5) * 10
      );
    g.stroke();
  } else if (f.k === 'flame') {
    g.save();
    g.translate(f.x, f.y);
    g.scale(f.f, 1);
    g.lineJoin = 'round';
    for (let i = 0; i < 4; i++) {
      const x = (i - 1.5) * f.r * 0.16,
        h = f.r * (0.35 + 0.45 * u) * (0.8 + (i % 2) * 0.2);
      g.fillStyle = i % 2 ? '#fff9' : f.c;
      g.beginPath();
      g.moveTo(x - f.r * 0.13, 0);
      g.quadraticCurveTo(x - f.r * 0.2, -h * 0.5, x + (R() - 0.5) * 8, -h);
      g.quadraticCurveTo(x + f.r * 0.22, -h * 0.48, x + f.r * 0.13, 0);
      g.fill();
    }
    g.restore();
  } else if (f.k === 'burst') {
    const radius = f.r * (1.15 - u * 0.7);
    g.lineWidth = 3 + u * 4;
    g.beginPath();
    g.arc(f.x, f.y, radius, 0, 7);
    g.stroke();
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4,
        inner = radius * 0.55;
      g.beginPath();
      g.moveTo(f.x + Math.cos(a) * inner, f.y + Math.sin(a) * inner);
      g.lineTo(f.x + Math.cos(a) * radius, f.y + Math.sin(a) * radius);
      g.stroke();
    }
  } else if (f.k === 'beam') {
    g.lineCap = 'round';
    g.lineWidth = 4 + u * 8;
    g.beginPath();
    g.moveTo(f.x, f.y);
    g.lineTo(f.x + f.f * f.r, f.y);
    g.stroke();
    g.strokeStyle = '#fff';
    g.lineWidth = 2;
    g.stroke();
  } else if (f.k === 'txt') {
    g.font = 'bold ' + (f.s ?? 28) + 'px sans-serif'; // s = 文字の大きさ(トレーニングの「着地 nF」などは小さめ)
    g.textAlign = 'center';
    g.lineWidth = f.s ? 4 : 5;
    g.strokeStyle = '#000';
    const ty = f.y - (1 - u) * (f.s ? 18 : 30);
    g.strokeText(f.text, f.x, ty);
    g.fillText(f.text, f.x, ty);
  } else if (f.k === 'line') {
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(f.x, f.y);
    g.lineTo(f.x - f.f * (40 + (1 - u) * 60), f.y);
    g.stroke();
  } else {
    g.beginPath();
    g.arc(f.x, f.y, 30 - f.t * 1.5, 0, 7);
    g.fill();
    g.lineWidth = 3;
    for (let k = 0; k < 8; k++) {
      const a = k * 0.785,
        r = 14 + (12 - f.t) * 3;
      g.beginPath();
      g.moveTo(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r);
      g.lineTo(f.x + Math.cos(a) * (r + 16), f.y + Math.sin(a) * (r + 16));
      g.stroke();
    }
  }
  g.restore();
}

// 対戦画面のエフェクトをまとめて描く(炎の火の粉 → fx の順)
// ---- 水まといの水の玉(ルリ) ----  layer: 'back' = キャラの絵の前に呼ぶ(体の奥側の玉) / 'front' = 後に呼ぶ(手前の玉)
function drawAquaVeil(layer) {
  if (typeof A === 'undefined' || !A || typeof aquaOrbs !== 'function') return;
  for (const p of [A, B]) {
    if (!p || !p.ch || !p.ch.aq || !(p.aq > 0) || p.st === 'ko') continue;
    const Q = p.ch.aq, glow = (p.aqFlash || 0) / 10, orbs = aquaOrbs(p);
    g.save();
    if (layer === 'back') {                                          // 水の通り道(うすい楕円)
      g.globalAlpha = 0.18 + glow * 0.3;
      g.strokeStyle = Q.color;
      g.lineWidth = 2;
      g.beginPath();
      g.ellipse(p.x, p.y - 66, 42, 13, 0, 0, 7);
      g.stroke();
    }
    for (const b of orbs) {
      if (b.front !== (layer === 'front')) continue;
      const r = (b.front ? 8 : 6.5) * (1 + glow * 0.35) + Math.sin(fr * 0.2 + b.x * 0.05) * 0.8;
      g.globalAlpha = b.front ? 0.92 : 0.6;
      const gr = g.createRadialGradient(b.x - r * 0.3, b.y - r * 0.35, r * 0.1, b.x, b.y, r);
      gr.addColorStop(0, '#ffffff');
      gr.addColorStop(0.35, '#bff0ff');
      gr.addColorStop(1, Q.color);
      g.fillStyle = gr;
      g.beginPath();
      g.ellipse(b.x, b.y, r * 1.05, r * 0.92, 0, 0, 7);
      g.fill();
      g.lineWidth = 1.4;
      g.strokeStyle = 'rgba(10,60,120,.55)';
      g.stroke();
      if (glow > 0) {
        g.globalCompositeOperation = 'lighter';
        g.globalAlpha = glow * 0.6;
        g.fillStyle = Q.color;
        g.beginPath();
        g.arc(b.x, b.y, r * 2, 0, 7);
        g.fill();
        g.globalCompositeOperation = 'source-over';
      }
    }
    g.restore();
  }
}
function drawEffects() {
  drawAquaVeil('front'); // 水まといの手前の水の玉
  drawMoveDust(); // 移動中のきらきら光る粉塵
  drawFire();
  fx.forEach(drawFx);
}
// ================= 超必殺技の演出(暗転・カットイン) =================
//  超必殺技を出すと p.sflash = SUPER_FREEZE(script.js)になり、その間は両者が止まる。ここではその間の見た目を描く
//   drawSuperDark  … 背景を暗くして、技を出したキャラにスポットライトと集中線(キャラの絵の前に描く)
//   drawSuperCutin … 画面を横切る帯に技名とキャラ名(HUD の手前に描く。画面の揺れは受けない)
const superUser = () => (A && A.sflash > 0 ? A : B && B.sflash > 0 ? B : null);
function drawSuperDark() {
  const p = superUser();
  if (!p) return;
  const k = p.sflash / SUPER_FREEZE, a = Math.min(1, (1 - k) * 6, k * 5) * 0.72, col = (p.ch.spg && p.ch.spg.color) || '#fd0';
  g.save();
  g.globalAlpha = a;
  g.fillStyle = '#05030c';
  g.fillRect(-20, -20, W + 40, H + 40);
  const cx = p.x, cy = p.y - 70, rg = g.createRadialGradient(cx, cy, 10, cx, cy, 190);   // スポットライト
  rg.addColorStop(0, col);
  rg.addColorStop(1, 'rgba(0,0,0,0)');
  g.globalCompositeOperation = 'lighter';
  g.globalAlpha = a * 0.55;
  g.fillStyle = rg;
  g.fillRect(cx - 200, cy - 200, 400, 400);
  g.globalAlpha = a * 0.5;                                           // 集中線
  g.strokeStyle = col;
  for (let i = 0; i < 26; i++) {
    const t = (i / 26) * Math.PI * 2 + (fr % 7) * 0.05, r0 = 120 + R() * 40, r1 = 520;
    g.lineWidth = 1 + R() * 3;
    g.beginPath();
    g.moveTo(cx + Math.cos(t) * r0, cy + Math.sin(t) * r0);
    g.lineTo(cx + Math.cos(t) * r1, cy + Math.sin(t) * r1);
    g.stroke();
  }
  g.restore();
}
function drawSuperCutin() {
  const p = superUser();
  if (!p) return;
  const k = 1 - p.sflash / SUPER_FREEZE, col = (p.ch.spg && p.ch.spg.color) || '#fd0', left = p === A,
    slide = Math.min(1, k * 4), out = Math.max(0, (k - 0.85) / 0.15), y = 200, h = 78;
  const dx = (left ? -1 : 1) * W * (1 - slide) + (left ? 1 : -1) * W * out;
  g.save();
  g.translate(dx, 0);
  g.globalAlpha = 0.92;
  const lg = g.createLinearGradient(0, y, W, y);
  lg.addColorStop(left ? 0 : 1, col);
  lg.addColorStop(0.55, '#000');
  lg.addColorStop(left ? 1 : 0, '#000');
  g.fillStyle = lg;
  g.beginPath();                                                     // 斜めに切った帯
  g.moveTo(0, y + 14); g.lineTo(W, y); g.lineTo(W, y + h - 14); g.lineTo(0, y + h);
  g.closePath();
  g.fill();
  g.globalAlpha = 1;
  g.fillStyle = '#fff';
  g.fillRect(0, y + 2, W, 2);
  g.fillRect(0, y + h - 4, W, 2);
  T(p.mv ? p.mv.nm : '', W / 2, y + 50, 38, '#fff');
  T('SUPER ART  ' + p.ch.nm, left ? 40 : W - 40, y + 26, 14, col, left ? 'left' : 'right');
  g.restore();
}