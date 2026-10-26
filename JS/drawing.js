// ============================================================
// drawing.js … 実際の描画
//   戦闘キャラの描画 (drawF)・当たり判定の表示・頭の向きの計算(headView)・向き付きの頭(drawHeadTurned)。
//   テンプレートは drawing_template.js、キャラ設定は drawing_character.js。
// ============================================================

// Character rendering helpers and drawF. Requires game globals from script.js.
// ============================================================
// 設定 (見た目を調整する数値をここにまとめてある。説明はそれぞれを使う所のコメントも参照)
// ============================================================
// ---- 腕・脚の形 ----
const LIMB_SHAPES = {
  arm: {
    upper: [[0, 1.02], [0.28, 1.06], [0.62, 0.96], [1, 0.8]],          // 上腕: 肩(三角筋) → 力こぶ → 肘で細くなる
    lower: [[0, 0.82], [0.24, 1.0], [0.6, 0.86], [1, 0.62]],           // 前腕: 肘 → 前腕の筋肉 → 手首で細くなる
    offU: null, offL: null
  },
  leg: {
    upper: [[0, 1.06], [0.32, 1.05], [0.7, 0.93], [1, 0.82]],          // 太もも: 付け根が太く、ひざへ細くなる
    lower: [[0, 0.84], [0.3, 1.0], [0.66, 0.82], [1, 0.62]],           // すね: ひざ → ふくらはぎ → 足首
    offU: null, offL: [[0, 0], [0.3, 0.14], [0.66, 0.05], [1, 0]]      // ふくらはぎは後ろ側にふくらむ
  },
  block: {                                                           // 石・機械の体(ゴーレムなど): まっすぐな太さ。body.limbShape: 'block'
    upper: [[0, 1], [1, 1]], lower: [[0, 1], [1, 1]], offU: null, offL: null
  }
};
const LIMB_BLEND = { upperFrom: 0.35, lowerTo: 0.65 };
const LIMB_PERSPECTIVE = 0.28;     // 奥行きによる大きさの変化(手前へ節の長さ1本ぶん出ると 1+この値 倍)

// ---- セル影・服のシワ ----
const SHADE = { on: true, color: '#b8a2c0', deep: '#9a7fa6', skin: '#eab4a2', skinDeep: '#d6917f', width: 0.36 };   // 服・体 / 濃い影 / 肌 / 肌の濃い影
const SHADE_L = [0.45, -0.89];                                         // 光の来る向き(前・上)
const CLOTH_FOLDS = { on: true, strength: 1 };

// ---- 武器を持つ腕 ----
const KO_GROUND_PAD = 3;   // K.O. で倒れたとき、地面より下に描いてよい幅(px。輪郭の分)
const ELBOW_MIN = -0.1, ELBOW_MAX = 2.7;   // 武器を持つ腕の肘の曲げられる範囲(rad)

// ---- 頭の向き ----
const HEAD_PHI = [0, 0.56, 1.05, Math.PI / 2];        // [真横, 少し正面(約32°), まあまあ正面(約60°), 正面]
const HEAD_PHI_BACK = [0, 0.4, 0.95, Math.PI / 2];    // 背面側(負の向き) [真横, 少し背面, まあまあ背面, 背面]。-1 は顔の片目が少し見える程度

// ---- 顔(目の貼り方・頭の形・顔の形のテンプレート・額) ----
const FACE_CURVE = { strips: 6 };
const HEAD_SHAPE = {
  on: true,
  chin: [0.62, -1.04],                 // あご先 [前, 上下]
  chinW: 0.13,                         // あご先の幅(半分)
  jaw: [                               // あご先から耳の下までのあごの線 [前, 左右, 上下]
    [0.5, 0.38, -0.93],
    [0.3, 0.62, -0.77],
    [0.06, 0.8, -0.55],
    [-0.16, 0.88, -0.35]
  ],
  nape: -0.7                           // 後頭部が下へ続く高さ(首の付け根)
};
const FACE_ILLUST = {
  noseMerge: true,                      // 鼻を顔の輪郭とひとつの形にする(鼻と顔の間の線を消し、輪郭が鼻に沿ってなめらかにふくらむ)。false で以前の別々の鼻
  nose: true,                           // 正面寄りの鼻を、輪郭で囲まず影と鼻先の線だけで描く(false で以前の菱形)
  mouthWiden: 0.45                      // 正面を向いたときに口を横に広げる割合(以前は 0.9)
};
const FACE_TEMPLATES = {
  standard: {},                                                     // ふつう
  shonen:   { jaw: 1.02, chin: 0.98, chinW: 1.1 },                  // 少年: 少し骨太で、あご先は丸め
  heroine:  { jaw: 0.94, chin: 1.0, chinW: 0.72, cheek: 1.06 },     // ヒロイン: 細いあご先・ふっくらした頬
  elegant:  { jaw: 0.9, chin: 1.06, chinW: 0.62, cheek: 1.0 },      // 大人っぽい細面: 長めのとがったあご
  cool:     { jaw: 0.9, chin: 1.08, chinW: 0.58, cheek: 0.94 },     // クール: 頬がこけた鋭いあご
  wild:     { jaw: 1.12, chin: 0.95, chinW: 1.4, cheek: 1.02 },     // 野性的: 張ったエラと広いあご
  square:   { jaw: 1.15, chin: 0.9, chinW: 1.7 },                   // いかつい四角いあご
  round:    { jaw: 1.08, chin: 0.82, chinW: 1.3, cheek: 1.12 },     // 丸顔(子どもっぽい)
  // ---- アニメ・イラストの女の子の輪郭 ----
  //   chinPos=あご先の位置 [前, 上下] / jawLine=あご先〜耳の下のあごの線 [前, 左右, 上下] を直接決める(HEAD_SHAPE の形を置きかえる)
  //   skull=頭蓋の丸みが続く下端の高さ(省略 -0.3。高いほど頬から下が早くすぼまる)
  //   forehead=額の前の位置(頭の半径=1)。書くと額が縦にまっすぐ(ほぼ直角)になる(headFront / FOREHEAD_V)
  //   napeW=後頭部の下側の左右の幅(倍率。小さいほど正面から見たときに、あごの横がすっきりする)
  //   頬は目の高さあたりで丸くふくらみ、そこから細いあご先へ一気にすぼまる(V字の輪郭)
  //   顔の下半分(目より下)を短くして、頭(額)を大きく見せる(イラストの女の子のバランス)
  animeGirl: {                                                      // アニメの女の子: 丸い頬・小さく短いあご先(かわいい)
    chinPos: [0.4, -0.9], chinW: 0.5, cheek: 1.06, napeW: 0.55, skull: -0.2, forehead: 0.9,
    jawLine: []
  },
  illustGirl: {                                                     // イラストの女の子: すっきりした細いV字・少しとがったあご先
    chinPos: [0.7, -0.6], chinW: 0.4, cheek: 1.02, napeW: 0.5, skull: -0.12, forehead: 0.9,
    jawLine: []
  },
  Ruri: {                                                      // Ruri: 丸い頬・小さく短いあご先(かわいい)
    chinPos: [0.5, -1], chinW: 0.5, cheek: 1.06, napeW: 0.55, skull: -0.2, forehead: 0.9,
    jawLine: []
  },
};
const FOREHEAD_V = { from: 0.3, to: 0.38, top: 0.85, root: -0.3, round: 1 };   // round = 額の上の丸み(0〜1)   // まっすぐな所の下端・上端 / 頭頂の丸みへ戻りきる高さ / 鼻の付け根で元の丸みへ戻りきる高さ(from〜root の間をゆるいS字のカーブでつなぐ。間が広いほど額と鼻のつなぎ目がなだらか)

// ---- 鼻 ----
const NOSE_PROFILE = {
  normal: { top: -0.04, tip: [1.14, 0.3], bot: [0.86, 0.35], round: 1 },
  small:  { top: 0.03, tip: [1.03, 0.25], bot: [0.88, 0.29], round: 0.8 },
  long:   { top: -0.16, tip: [1.25, 0.28], bot: [0.82, 0.36], round: 1 },
  round:  { top: -0.03, tip: [1.1, 0.29], bot: [0.84, 0.35], round: 1.8 },
  girl:   { top: 0.01, tip: [1, 0.245], bot: [0.96, 0.33], round: 0.7, smooth: true, sharp: true, underAngle: 0.7 },   // underAngle: 鼻の下の角度の開き(0〜1)   // sharp: 鼻先をとがらせる   // イラストの女の子: 鼻先の突き出しが小さく、鼻筋は額からなだらかに続く(smooth)
  Rina:   { top: 0.03, tip: [0.98, 0.245], bot: [0.95, 0.1], round: 0.7, smooth: true, sharp: true },
  Ruri:   { top: 0.03, tip: [0.98, 0.245], bot: [1.05, 0.1], round: 0.7, smooth: true, sharp: true }
};
const NOSE_UNDER_LINE = { girl: { line: false, len: 0.15, drop: 0.04, w: 0.065 } };   // line: false で線を描かない(鼻先の小さなふくらみと小さな影だけ)

// ---- 揺れ物の物理 ----
const PHYS_GRAVITY = 0.25;
const PHYS_SMOOTH = 0.4;           // 見た目のなめらかさ。毎フレーム形をこの割合だけ計算結果へ近づける(小さいほどゆったり)
const PHYS_TIME = 0.8;             // 揺れの時間の進み方(1=実時間。小さいほどゆっくり揺れる)。PHYS_SMOOTH と組み合わせて、揺れの幅は前と同じくらいに合わせてある
const PHYS_DAMP = 1;               // 空気抵抗の倍率
const PHYS_FLUTTER_SPEED = 0.42;   // 布のはためきの速さ
// なびきの制限(変な形・細かすぎる動きを防ぐ)。各ひもの設定(maxBend / maxRoot / reach / maxV)で個別にも変えられる
const PHYS_MAX_BEND = 0.42;        // 節と節の間で曲がれる角度(ラジアン。0.42 ≒ 24°)
const PHYS_MAX_ROOT = 1.3;         // 根元の節が静止時の向きから回れる角度(1.3 ≒ 75°)
const PHYS_REACH = 0.7;            // 静止時の位置から離れられる距離(根元からの長さに対する割合)
const PHYS_MAX_SPEED = 3;          // 1フレームに動ける距離(px)
const PHYS_ROOT_FLEX = 0.6;        // 根元のやわらかさ(0〜1)。大きいほど先だけでなく根元から全体が振れる(0=以前の動き)

// ---- 髪の陰影 ----
const HAIR_SHADE = {
  on: true,
  shadow: '#b4a4c6',      // 影の色(乗算)。白に近いほど薄い
  warm: '#e8b48a',        // 黄色・金・オレンジ系の明るい髪の影の色(乗算)。髪の項目に shade: '#色' を書くとキャラごとに変えられる
  light: 0.7,             // ハイライトの強さ(0〜1)
  flow: 0.25,             // 毛流れの線の濃さ(0〜1)
  ring: 0.5,              // 天使の輪の高さ(頭の中心=0 / 頭頂=1)
  lines: 12,              // 毛流れの線の本数
  mid: false              // true で画質「中」でも描く(省略時は「高」「最高」だけ。重いため)
};

// ============================================================
// 腕・脚 (人の形)
//   根元(肩・股関節)→ 関節(肘・ひざ)→ 先(手首・足首)を、筋肉のふくらみと関節・手首・足首のくびれのある
//   なめらかな形で描く。関節に丸は描かず、上と下の形は輪郭をつなげて1つの形にする(継ぎ目の線が出ない)。
//   LIMB_SHAPES の数字 = 太さの倍率 [位置(0=根元側〜1=先), 倍率]。off = 後ろ側(ふくらはぎ)へのふくらみ
// ============================================================
// (LIMB_SHAPES はファイルの先頭「設定」にまとめてある)
// キャラの腕・脚の形の種類。body.limbShape: 'block' なら block、それ以外は base('arm' / 'leg')
function limbKindOf(ctx, base) {
  const b = ctx && ctx.charDraw && ctx.charDraw.body;
  return b && b.limbShape === 'block' ? 'block' : base;
}
function limbProf(arr, t) {
  if (!arr) return 0;
  if (t <= arr[0][0]) return arr[0][1];
  for (let i = 1; i < arr.length; i++) if (t <= arr[i][0]) {
    const a = arr[i - 1], b = arr[i], f = (t - a[0]) / (b[0] - a[0]), s = f * f * (3 - 2 * f);   // なめらかにつなぐ
    return a[1] + (b[1] - a[1]) * s;
  }
  return arr[arr.length - 1][1];
}
// 腕・脚の太さ(px)。kind='arm'|'leg' / part='upper'|'lower' / t=0〜1 / w=基本の太さ
function limbWidth(kind, part, t, w) {
  const L = limbEx.last, tt = Math.max(0, Math.min(1, t));
  // 直前に描いた脚の太ももとすねの太さが違うときは、ひざのまわりで太さをなめらかにつなぐ(limbBlendW と同じ形に合わせる)
  const k = L && L.blend ? limbBlendW(part, tt, L.w1, L.w2) / ((part === 'upper' ? L.w1 : L.w2) || 1) : 1;
  return w * k * limbProf((LIMB_SHAPES[kind] || LIMB_SHAPES.arm)[part], tt);
}
// 太もも(w1)とすね(w2)の太さが違うとき、ひざで急に太さが変わらないように、ひざの手前からゆるやかに変える
//   太ももは付け根(t=0〜0.35)は w1 のまま、ひざへ向かって中間の太さへ。すねはひざの中間の太さから、ふくらはぎ(t=0.65)までに w2 へ
// (LIMB_BLEND はファイルの先頭「設定」にまとめてある)
function limbBlendW(part, t, w1, w2) {
  if (w1 === w2) return part === 'upper' ? w1 : w2;
  const wk = (w1 + w2) / 2, sm = (f) => { f = Math.max(0, Math.min(1, f)); return f * f * (3 - 2 * f); };
  return part === 'upper'
    ? w1 + (wk - w1) * sm((t - LIMB_BLEND.upperFrom) / (1 - LIMB_BLEND.upperFrom))
    : wk + (w2 - wk) * sm(t / LIMB_BLEND.lowerTo);
}

// ---- 腕・脚の向き(X軸)による見え方 ----
//   部位の向き d (-3〜3) を「体の前後方向(真横の絵の左右)が、見ている人の方へどれだけ回っているか」の角度 θ にする。
//   1(標準)以下は真横の絵のまま。2〜3 で手前(見ている人)へ、0〜-3 で奥へ回る。±3 で真正面・真後ろを指す。
//   θ だけ回すと、節の前後方向の長さは cosθ 倍(縮んで見える)になり、手前へ出た分(奥行き z)だけ大きく、奥へ引っ込んだ分だけ小さく見える。
//   付け根(肩・股関節)の位置は変わらない。
// (LIMB_PERSPECTIVE はファイルの先頭「設定」にまとめてある)
function limbTheta(d) {
  if (d == null || !isFinite(d)) return 0;
  const th = d > 1 ? (d - 1) / 2 * (Math.PI / 2) : d < 0 ? d / 3 * (Math.PI / 2) : 0;
  return Math.max(-1.5, Math.min(1.5, th));
}
// 腕・脚の関節の位置(画面)と奥行き。th1/th2 = 上・下の節の θ
function limbGeom(x, y, a, b, l1, l2, th1 = 0, th2 = 0, dx = 0) {
  const v1x = l1 * Math.sin(a), v1y = l1 * Math.cos(a), v2x = l2 * Math.sin(a + b), v2y = l2 * Math.cos(a + b),
    k = [x + v1x * Math.cos(th1) + dx, y + v1y], e = [k[0] + v2x * Math.cos(th2), k[1] + v2y],
    z1 = v1x * Math.sin(th1), z2 = v2x * Math.sin(th2), Lm = (l1 + l2) / 2 || 1,
    sc = (z) => Math.max(0.6, Math.min(1.6, 1 + LIMB_PERSPECTIVE * z / Lm));
  return {
    k, e, z1, z2, sc,
    sU: (t) => sc(z1 * t), sL: (t) => sc(z1 + z2 * t),             // 節に沿った大きさの倍率
    fore1: Math.hypot(v1x * Math.cos(th1), v1y) / (l1 || 1),        // 画面上の長さ / 本当の長さ (縮み)
    fore2: Math.hypot(v2x * Math.cos(th2), v2y) / (l2 || 1),
    toward2: z2 / (l2 || 1)                                          // 下の節が手前を向く度合い(-1〜1)
  };
}

// ============================================================
// アニメ塗りの影(セル影)
//   光は「前の上」から当たる(キャラの向きの座標で LX=前 / LY=上)。光と反対側に、境目のはっきりした影を重ねる。
//   影は乗算(multiply)で重ねるので、元の色の色味を残したまま少し暗く・少し紫がかった色になる。
//    ・腕・脚 … 節ごとに、光と反対側の約3割
//    ・胴体   … 背中側の約4割(服・胸の飾りの上にも重なる)
//    ・頭     … あご・後頭部の三日月形 / 首 … 頭の下の影
//    ・鼻     … 鼻の下・奥側に落ちる影(鼻を描かないアニメ顔のキャラは、鼻の位置に小さな影だけ)
//    ・スカート・ローブ … すその下の脚に落ちる影
//   SHADE.on = false か、設定の画質が「低」のときは描かない。色は SHADE.color / SHADE.deep(濃い影)
// ============================================================
// (SHADE / SHADE_L はファイルの先頭「設定」にまとめてある)
const shadeOn = () => SHADE.on && !(typeof save !== 'undefined' && save.cfg && save.cfg.quality === 'low');
// clip(Path2D か関数)の内側に、fn で作った形を影の色で乗算する
function celFill(clip, fn, deep = false) {
  if (!shadeOn()) return;
  g.save();
  if (clip instanceof Path2D) g.clip(clip); else if (clip) { clip(); g.clip(); }
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = deep === 'skin' ? SHADE.skin : deep === 'skinDeep' ? SHADE.skinDeep : deep ? SHADE.deep : SHADE.color;   // deep: true=濃い影 / 'skin'・'skinDeep'=肌の影
  g.beginPath();
  fn();
  g.fill();
  g.restore();
}
// 線分 p0→p1(半幅 h0, h1)の、光と反対側の帯を今のパスに足す
function celBandPath(p0, p1, h0, h1, k = SHADE.width) {
  const dx = p1[0] - p0[0], dy = p1[1] - p0[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
  let nx = -uy, ny = ux;
  if (nx * SHADE_L[0] + ny * SHADE_L[1] > 0) { nx = -nx; ny = -ny; }
  const i0 = h0 * (1 - 2 * k), i1 = h1 * (1 - 2 * k), e0 = h0 * 1.8, e1 = h1 * 1.8;
  g.moveTo(p0[0] - ux * h0 + nx * i0, p0[1] - uy * h0 + ny * i0);
  g.lineTo(p1[0] + ux * h1 + nx * i1, p1[1] + uy * h1 + ny * i1);
  g.lineTo(p1[0] + ux * h1 + nx * e1, p1[1] + uy * h1 + ny * e1);
  g.lineTo(p0[0] - ux * h0 + nx * e0, p0[1] - uy * h0 + ny * e0);
  g.closePath();
}
// 頭の、あご・後頭部側の三日月形の影 (path = 頭の形。省略時は円)
function celHead(hcx, hcy, Rh, path) {
  celFill(path || (() => { g.beginPath(); g.arc(hcx, hcy, Rh, 0, 7); }), () => {
    g.rect(hcx - Rh * 2, hcy - Rh * 2, Rh * 4, Rh * 4);
    g.arc(hcx + SHADE_L[0] * Rh * 0.42, hcy + SHADE_L[1] * Rh * 0.42, Rh * 1.02, 0, Math.PI * 2, true);
  }, 'skin');
}

// ---- 服のシワ ----
//   肘・ひざを曲げた内側のシワ / 胴体の腰から胸へ流れるシワ / スカートのひだ。乗算の濃い影(SHADE.deep)で、両端が細い筆の線のように描く
//   CLOTH_FOLDS.on = false で描かない。strength = シワの太さの倍率
// (CLOTH_FOLDS はファイルの先頭「設定」にまとめてある)
// p0 → p1 を、c の方へふくらむ両端の細い線(幅 w)にして今のパスへ足す
function foldLine(p0, c, p1, w) {
  const dx = p1[0] - p0[0], dy = p1[1] - p0[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L * w * CLOTH_FOLDS.strength, ny = dx / L * w * CLOTH_FOLDS.strength;
  g.moveTo(p0[0], p0[1]);
  g.quadraticCurveTo(c[0] + nx, c[1] + ny, p1[0], p1[1]);
  g.quadraticCurveTo(c[0] - nx, c[1] - ny, p0[0], p0[1]);
}

// 真横の顔の鼻の影。has=鼻を描くキャラ(鼻の下に落ちる影) / それ以外(アニメ顔)は鼻の位置に小さな影
function celNose(ctx, has) {
  const { hcx, hcy, Rh } = ctx;
  celFill(headPath(ctx), has
    ? () => { g.moveTo(hcx + Rh * 0.86, hcy + Rh * 0.33); g.lineTo(hcx + Rh * 1.04, hcy + Rh * 0.32); g.lineTo(hcx + Rh * 0.9, hcy + Rh * 0.43); g.closePath(); }
    : () => { g.moveTo(hcx + Rh * 0.99, hcy + Rh * 0.22); g.lineTo(hcx + Rh * 0.9, hcy + Rh * 0.33); g.lineTo(hcx + Rh * 0.99, hcy + Rh * 0.31); g.closePath(); }, 'skinDeep');
}

// 1つの節(上腕・前腕など)の形を Path2D にする。p0→p1、半幅 hw(t)、横へのふくらみ off(t)(px, +で法線側)
function limbSegPath(p0, p1, hw, off) {
  const dx = p1[0] - p0[0], dy = p1[1] - p0[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux,
    N = 8, A = [], B = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, h = hw(t), o = off ? off(t) : 0, cx = p0[0] + dx * t + nx * o, cy = p0[1] + dy * t + ny * o;
    A.push([cx + nx * h, cy + ny * h]);
    B.push([cx - nx * h, cy - ny * h]);
  }
  const path = new Path2D(), h0 = hw(0), h1 = hw(1);
  path.moveTo(A[0][0], A[0][1]);
  for (let i = 1; i < A.length - 1; i++) path.quadraticCurveTo(A[i][0], A[i][1], (A[i][0] + A[i + 1][0]) / 2, (A[i][1] + A[i + 1][1]) / 2);
  path.lineTo(A[N][0], A[N][1]);
  const a1 = Math.atan2(ny, nx), o1 = off ? off(1) : 0, o0 = off ? off(0) : 0;
  path.arc(p1[0] + nx * o1, p1[1] + ny * o1, h1, a1, a1 - Math.PI, true);                 // 先の丸み
  path.lineTo(B[N][0], B[N][1]);
  for (let i = N - 1; i > 0; i--) path.quadraticCurveTo(B[i][0], B[i][1], (B[i][0] + B[i - 1][0]) / 2, (B[i][1] + B[i - 1][1]) / 2);
  path.lineTo(B[0][0], B[0][1]);
  path.arc(p0[0] + nx * o0, p0[1] + ny * o0, h0, a1 + Math.PI, a1, true);                 // 根元の丸み
  path.closePath();
  return path;
}

// 腕・脚を描く。x,y=根元 / a,b=根元と関節の角度 / l1,l2=長さ / w1,w2=太さ / c1,c2=上・下の色 / dx=関節の横ずれ / kind='arm'|'leg'
//   戻り値は [先x, 先y](手首・足首)。描いた形は limbEx.last ({ upper, lower, all } の Path2D)に残るので、服の模様などの切り抜きに使える
function limbEx(x, y, a, b, l1, l2, w1, w2, c1, c2, dx = 0, kind = 'arm', th1 = 0, th2 = 0, parts = null) {   // parts = 輪郭の部位 [上, 下] (OUTLINE)
  const S = LIMB_SHAPES[kind] || LIMB_SHAPES.arm, GM = limbGeom(x, y, a, b, l1, l2, th1, th2, dx),
    [kx, ky] = GM.k, [ex, ey] = GM.e;
  // 脚(太もも・すね)は、太さが違うとき ひざのまわりでなめらかにつなぐ(limbBlendW)。腕は今まで通り
  const isLeg = (parts ? parts[0] : kind === 'leg' ? 'thigh' : '') === 'thigh', blend = isLeg && w1 !== w2,
    bU = blend ? (t) => limbBlendW('upper', t, w1, w2) : () => w1,
    bL = blend ? (t) => limbBlendW('lower', t, w1, w2) : () => w2;
  const hU = (t) => bU(t) / 2 * limbProf(S.upper, t) * GM.sU(t), hL = (t) => bL(t) / 2 * limbProf(S.lower, t) * GM.sL(t),
    oU = S.offU ? (t) => bU(t) / 2 * limbProf(S.offU, t) * GM.sU(t) : null,
    oL = S.offL ? (t) => bL(t) / 2 * limbProf(S.offL, t) * GM.sL(t) * GM.fore2 : null;   // ふくらはぎのふくらみは、正面・背面を向くと隠れる
  // 下の節の法線(ふくらはぎの向き)が体の後ろ側を向くようにする(脚は前へ曲がるので、法線 = 進む向きの左側)
  const up = limbSegPath([x, y], [kx, ky], hU, oU), lo = limbSegPath([kx, ky], [ex, ey], hL, oL),
    jr = Math.max(hU(1), hL(0)), joint = new Path2D();
  joint.arc(kx, ky, jr, 0, Math.PI * 2);                           // 関節(肘・ひざ)のまるみ。輪郭は外側だけに出る
  const all = new Path2D();
  all.addPath(up); all.addPath(lo); all.addPath(joint);
  // 輪郭を太く描いてから塗る(上・下・関節の境目に線が出ない)。根元(肩・股関節)の輪郭は細くして、体から生えているように見せる
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.strokeStyle = '#111';
  const PT = parts || (kind === 'leg' ? ['thigh', 'shin'] : ['upperArm', 'foreArm']),
    OU = olScale(PT[0]), OL = olScale(PT[1]), OS = OU;           // 上の節 / 下の節の輪郭の倍率
  const rr = hU(0) * 1.15;
  g.save();
  const cl = new Path2D();
  cl.rect(x - 2000, y - 2000, 4000, 4000);
  cl.arc(x, y, rr, 0, Math.PI * 2);
  g.clip(cl, 'evenodd');
  for (const [p, s] of [[up, OU], [lo, OL], [joint, (OU + OL) / 2]]) if (s > 0) { g.lineWidth = 5 * s; g.stroke(p); }
  g.restore();
  g.save();
  const cr = new Path2D();
  cr.arc(x, y, rr, 0, Math.PI * 2);
  g.clip(cr);
  g.lineWidth = 2.6 * OS;
  if (OS > 0) g.stroke(up);
  g.restore();
  g.fillStyle = c1;
  g.fill(up);
  g.fill(joint);
  g.fillStyle = c2;
  g.fill(lo);
  // つやの線(前側を少し明るく)
  g.strokeStyle = 'rgba(255,255,255,.26)';
  g.lineWidth = Math.max(1, (w1 + w2) * 0.06);
  const seg = (p0, p1, hw0, hw1) => {
    const ddx = p1[0] - p0[0], ddy = p1[1] - p0[1], L = Math.hypot(ddx, ddy) || 1, nx = -ddy / L, ny = ddx / L;
    g.beginPath();
    g.moveTo(p0[0] + ddx * 0.12 - nx * hw0 * 0.45, p0[1] + ddy * 0.12 - ny * hw0 * 0.45);
    g.lineTo(p0[0] + ddx * 0.82 - nx * hw1 * 0.45, p0[1] + ddy * 0.82 - ny * hw1 * 0.45);
    g.stroke();
  };
  seg([x, y], [kx, ky], hU(0.12), hU(0.82));
  seg([kx, ky], [ex, ey], hL(0.12), hL(0.82));
  if (!(c1 === '#fff' && c2 === '#fff')) {                             // セル影(光と反対側)。白く光っている間は描かない
    celFill(all, () => { celBandPath([x, y], [kx, ky], hU(0.5), hU(0.5)); celBandPath([kx, ky], [ex, ey], hL(0.5), hL(0.5)); });
    const L1 = Math.hypot(kx - x, ky - y) || 1, L2 = Math.hypot(ex - kx, ey - ky) || 1,
      ux = (kx - x) / L1, uy = (ky - y) / L1, vx = (ex - kx) / L2, vy = (ey - ky) / L2,
      bend = Math.acos(Math.max(-1, Math.min(1, ux * vx + uy * vy)));
    if (CLOTH_FOLDS.on && bend > 0.3) {                               // 肘・ひざの内側のシワ(曲げるほど太い)
      let ix = vx - ux, iy = vy - uy;
      const il = Math.hypot(ix, iy) || 1; ix /= il; iy /= il;
      const st = Math.min(1, (bend - 0.3) / 0.9), px = -iy, py = ix;
      celFill(all, () => {
        for (let i = 0; i < 2; i++) {
          const cx = kx + ix * jr * (0.35 + 0.32 * i), cy = ky + iy * jr * (0.35 + 0.32 * i), h = jr * (0.7 - 0.18 * i);
          foldLine([cx - px * h, cy - py * h], [cx - ix * jr * 0.28, cy - iy * jr * 0.28], [cx + px * h * 0.8, cy + py * h * 0.8], jr * 0.13 * st);
        }
      }, true);
    }
  }
  limbEx.last = { upper: up, lower: lo, joint, all, o: [x, y], k: [kx, ky], e: [ex, ey], w1, w2, blend, geom: GM, kind };
  return [ex, ey];
}

// 直前に描いた腕・脚(limbEx.last)の、節に沿った大きさの倍率。袖・すそ・ブーツなどを形に合わせるのに使う
function limbScaleAt(part, t) {
  const L = limbEx.last;
  return L && L.geom ? (part === 'upper' ? L.geom.sU(t) : L.geom.sL(t)) : 1;
}

// 従来の limb (上下同じ太さ)
function limb(x, y, a, b, l1, l2, w, c1, c2) {
  return limbEx(x, y, a, b, l1, l2, w, w, c1, c2);
}

// ---- 武器を持つ手 ----
//  武器は握りこぶしを横切るように持つ(前腕に対して grip の角度 = 既定 85°、親指の側へ)。前腕の延長に生えないようにする
//  攻撃の持続の間は、武器が技の当たり判定の方を向くように、腕の角度(肩・肘)を直す(握り方は変えない)
//  CHARACTER_DRAWS の weaponGrip: { angle: 85, aim: true } で変えられる(weaponGrip: false で以前の持ち方)
// (ELBOW_MIN / ELBOW_MAX はファイルの先頭「設定」にまとめてある)
const lerpAng = (a, b, t) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * t; };
// 中身が空の weapon(){} は「武器なし」として扱う(素手のキャラの腕を武器用に曲げない)
const _hasWeaponCache = new WeakMap();
function hasWeapon(cd) {
  if (!cd || typeof cd.weapon !== 'function') return false;
  if (_hasWeaponCache.has(cd.weapon)) return _hasWeaponCache.get(cd.weapon);
  const src = cd.weapon.toString().replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  const body = src.slice(src.indexOf('{') + 1, src.lastIndexOf('}')).trim();
  const r = body.length > 0;
  _hasWeaponCache.set(cd.weapon, r);
  return r;
}
function weaponArmPose(p, q, cd, Y, sh, sclX, sclY) {
  const WG = cd && cd.weaponGrip;
  if (!hasWeapon(cd) || WG === false) return null;
  const m = p.mv, base = { a: q[1], b: q[2], w: 0, grip: ((WG && WG.angle) ?? 85) * Math.PI / 180 };
  if (p.st === 'ko') {                                                // K.O.: 手の力が抜け、武器は前腕の向きへ寝る(倒れたとき地面に刺さらないように)
    const k = Math.min(1, (p.t || 0) / 14);
    base.grip *= 1 - k * (2 - k);
    return base;
  }
  if (!(p.st === 'atk' && m && m.rw > 0) || (WG && WG.aim === false)) return base;
  const s0 = m.st - 6, e1 = m.st + m.ac, e2 = e1 + Math.max(6, m.rc * 0.6);
  let w = p.t < s0 ? 0 : p.t < m.st ? (p.t - s0) / 6 : p.t <= e1 ? 1 : p.t < e2 ? 1 - (p.t - e1) / (e2 - e1) : 0;
  w = w * w * (3 - 2 * w);
  if (w <= 0) return base;
  const [ua, la] = armLengths(Y, cd),
    T = [(m.rx + m.rw / 2) / sclX - (q[9] || 0), (m.ry + m.rh / 2) / sclY],      // 技の当たり判定の真ん中(体の座標)
    v1 = [Math.sin(q[1]), Math.cos(q[1])], v2 = [Math.sin(q[1] + q[2]), Math.cos(q[1] + q[2])],
    H = [sh[0] + ua * v1[0] + la * v2[0], sh[1] + ua * v1[1] + la * v2[1]];       // モーションどおりの手の位置
  let dx = T[0] - sh[0], dy = T[1] - sh[1];
  const dl = Math.hypot(dx, dy) || 1;
  dx /= dl; dy /= dl;
  // 手も当たり判定の方へ伸ばす(モーションの手の位置と、肩から当たり判定の方へ腕を伸ばした位置の間)
  const reach = (ua + la) * 0.8;
  H[0] += (sh[0] + dx * reach - H[0]) * 0.65;
  H[1] += (sh[1] + dy * reach - H[1]) * 0.65;
  const psi = Math.atan2(dy, dx), g0 = base.grip;
  let best = null;
  // 武器の向き D から、握りの角度ぶん戻した向きが前腕(2通り)。手の位置はモーションのまま、肘の位置を決め直す
  // 手首は少し曲げられる(握りの角度 30°〜110°)。手が届く位置に近く、ふだんの握り(g0)に近い組み合わせを選ぶ
  for (const sg of [-1]) for (let gd = 30; gd <= 110; gd += 5) {   // 握り方は親指の側だけ(weaponDir と同じ)
    const gg = gd * Math.PI / 180, fa = psi - sg * gg + (q[21] || 0), f = [Math.cos(fa), Math.sin(fa)],   // 手首の角度(右手首)の分も戻す
      E = [H[0] - la * f[0], H[1] - la * f[1]], ux = E[0] - sh[0], uy = E[1] - sh[1], L = Math.hypot(ux, uy);
    if (L < 1e-3) continue;
    const a = Math.atan2(ux / L, uy / L);
    let b = Math.atan2(f[0], f[1]) - a;
    while (b > Math.PI) b -= 2 * Math.PI;
    while (b < -Math.PI) b += 2 * Math.PI;
    const score = (b < ELBOW_MIN - 0.05 || b > ELBOW_MAX ? 10 : 0) + 0.3 * (1 - (f[0] * v2[0] + f[1] * v2[1])) + 2 * Math.abs(L - ua) / ua + 0.6 * Math.abs(gg - g0);
    if (!best || score < best.score) best = { a, b, score, sg, gg };
  }
  if (!best) return base;
  // 肘は角度の近道でまわさない(180°を越えて逆に折れるのを防ぐ): 曲げられる範囲に収めてから直線で混ぜる
  const bb = Math.max(ELBOW_MIN, Math.min(ELBOW_MAX, best.b));
  return { a: lerpAng(q[1], best.a, w), b: q[2] + (bb - q[2]) * w, w, psi, sg: best.sg, grip: g0 + (best.gg - g0) * w };
}
// 武器の向き(画面の角度): ふだんは前腕から握りの角度ぶん親指の側へ / 攻撃中は当たり判定の方(weaponArmPose の psi)へ
function weaponDir(WP, ux, uy) {
  // 親指の側(hand と同じ: 画面の角度で前腕から -90°)へ握りの角度だけ回す。腕を振っても入れ替わらない
  // 攻撃中も、腕の角度(weaponArmPose で当たり判定の方へ合わせた角度)から同じ決め方で出す → 武器が腕といっしょに動き、急に回らない
  return Math.atan2(uy, ux) - WP.grip;
}

// 姿勢を1F進める(script.js の upd から、1Fに1回)。
//  見た目の姿勢 p.pose と、武器を持つ腕のなめらかな角度 p.wpArm は、食らい判定(fighterHitParts)にも使うので、
//  描く回数(フレームレート・画面のリフレッシュレート)ではなく、ゲームの1Fごとに進める。
//  → 30fps でも 144Hz の画面でも、オンラインの相手の画面でも、同じ入力なら同じ判定になる
function stepPose(p) {
  if (!p || !p.ch) return;
  p.pose = p.pose
    ? mix(p.pose, tgt(p), p.st === 'atk' ? (p.ch.sm.atk ?? 0.55) : p.st === 'jsq' || p.st === 'land' ? 0.55 : p.st === 'ko' ? 0.45 : (p.ch.sm.move ?? 0.3))
    : tgt(p);
  // 腰の高さ(足が地面に着く高さ)もなめらかに追いかける
  const q = p.pose, [legU, legL] = legLengths(SY[CH.indexOf(p.ch)], CHARACTER_DRAWS[p.ch.nm] || {}),
    dr = (a, b) => legU * Math.cos(a) + legL * Math.cos(a + b),
    hy = p.y < GY ? (legU + legL) * 0.85 : Math.max(dr(q[5], q[6]), dr(q[7], q[8]));
  p.hy = p.hy == null ? hy : p.hy + (hy - p.hy) * 0.4;
  fighterHitParts(p, true);                                          // 武器を持つ腕の角度もここで1F進める
}
function fighterHitParts(p, stepArm = false) {
  const ci = CH.indexOf(p.ch),
    Y = SY[ci],
    q = p.pose || tgt(p),
    cd = CHARACTER_DRAWS[p.ch.nm],
    weight = fighterWeight(p),
    // 描画(drawF)と同じ拡大縮小。見た目と当たり判定がずれないようにする
    scaleX = Y.sc * FIGHTER_SIZE * (1 + weight * 0.45),
    scaleY = Y.sc * FIGHTER_SIZE * (1 - weight),
    scale = (scaleX + scaleY) / 2,
    hw = bodyHalfWidth(Y, cd),
    [legU, legL] = legLengths(Y, cd),
    ls = Math.sin(q[0]),
    lc = Math.cos(q[0]),
    dr = (a, b) => legU * Math.cos(a) + legL * Math.cos(a + b),
    hy = p.y < GY
      ? (legU + legL) * 0.85
      : Math.max(dr(q[5], q[6]), dr(q[7], q[8])),
    hyy = -(p.hy ?? hy),
    at = (t) => [Y.tl * t * ls, hyy - Y.tl * t * lc],
    [sx, sy] = at(0.9),
    [nx, ny] = at(1),
    hr = Y.hr,
    hdx = nx + (hr + 2) * ls,
    hdy = ny - (hr + 2) * lc,
    world = ([x, y]) => ({ x: p.x + p.f * scaleX * (q[9] + x), y: p.y + scaleY * y }),
    parts = [{ zone: 'head', kind: 'circle', ...world([hdx, hdy]), r: hr * scale }];

  const addLimb = (zone, ox, oy, a, b, l1, l2, width, th1 = 0, th2 = 0) => {     // width: 太さ(px)。[根元側, 先側] で別々にも書ける / th = 向きの角度(見た目と同じ縮み)
    const [w1, w2] = Array.isArray(width) ? width : [width, width],
      { k, e } = limbGeom(ox, oy, a, b, l1, l2, th1, th2);
    parts.push({ zone, kind: 'segment', a: world([ox, oy]), b: world(k), r: w1 * scale * 0.52 });
    parts.push({ zone, kind: 'segment', a: world(k), b: world(e), r: w2 * scale * 0.52 });
    return e;
  };

  const G = bodyDirGeo(Y, cd, q),            // 体の向き(見た目と同じ形で判定を作る)
    shN = [sx - lc * hw * G.shN, sy - ls * hw * G.shN],
    shF = [sx + lc * hw * G.shF, sy + ls * hw * G.shF];
  const [armU, armL] = armLengths(Y, cd), armW = armWidths(Y, cd);   // 腕の長さ・太さ(見た目と同じ)
  const tb0 = q[14] ?? 1, pd = (i) => limbTheta(q[i] ?? tb0);
  let WPh;                                                            // 武器を持つ手の腕(見た目と同じ角度)
  if (stepArm) {                                                      // stepPose から: 急に腕が回らないよう、前のFの角度から少しずつ近づける
    const WP = weaponArmPose(p, q, cd, Y, shN, scaleX, scaleY), pv = p.wpArm;
    if (!WP) p.wpArm = null;
    else {
      if (pv) { WP.a = lerpAng(pv.a, WP.a, 0.45); WP.b = pv.b + (WP.b - pv.b) * 0.45; WP.grip = pv.grip + (WP.grip - pv.grip) * 0.45; }
      WP.a = lerpAng(q[1], WP.a, 1);                                  // 2π ずれがたまらないよう、モーションの角度の近くに戻す
      p.wpArm = { a: WP.a, b: WP.b, grip: WP.grip };
    }
    WPh = p.wpArm;
  } else WPh = p.wpArm || weaponArmPose(p, q, cd, Y, shN, scaleX, scaleY);
  for (const [sh, a, b, t1, t2] of [[shF, q[3], q[4], pd(17), pd(18)], [shN, WPh ? WPh.a : q[1], WPh ? WPh.b : q[2], pd(15), pd(16)]]) {
    const hand = addLimb('arms', ...sh, a, b, armU, armL, armW, t1, t2);
    parts.push({ zone: 'arms', kind: 'circle', ...world(hand), r: Y.hr2 * scale });   // 手
  }
  const legW = [Y.tw ?? Y.lgw, Y.sw ?? Y.lgw];   // 太もも・すねの太さ(body.thighWidth / shinWidth。無ければ legWidth)
  addLimb('feet', hw * G.hipF, hyy, q[7], q[8], legU, legL, legW, pd(20), pd(20));
  const frontFoot = addLimb('feet', -hw * G.hipN, hyy, q[5], q[6], legU, legL, legW, pd(19), pd(19));

  parts.push({ zone: 'feet', kind: 'circle', ...world([frontFoot[0] + 5, frontFoot[1] + 2]), r: (((Y.sw ?? Y.lgw) - 2) * 0.65 + 3) * scale });
  parts.push({ zone: 'torso', kind: 'segment', a: world(at(0.12)), b: world(at(0.92)), r: hw * 0.76 * (1 + (G.fm - 1) * 0.8) * scale });
  return parts;
}

function hitPartForRect(p, rect) {
  const pointRectDistance = (x, y) => Math.hypot(
      Math.max(rect.x - x, 0, x - (rect.x + rect.w)),
      Math.max(rect.y - y, 0, y - (rect.y + rect.h))
    ),
    pointSegmentDistance = (x, y, a, b) => {
      const dx = b.x - a.x, dy = b.y - a.y,
        u = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1)));
      return Math.hypot(x - (a.x + u * dx), y - (a.y + u * dy));
    },
    segmentRectDistance = (a, b) => {
      let t0 = 0, t1 = 1, miss = false;
      const dx = b.x - a.x, dy = b.y - a.y,
        checks = [[-dx, a.x - rect.x], [dx, rect.x + rect.w - a.x], [-dy, a.y - rect.y], [dy, rect.y + rect.h - a.y]];
      for (const [divisor, distance] of checks) {
        if (!divisor) {
          if (distance < 0) { miss = true; break; }
          continue;
        }
        const t = distance / divisor;
        if (divisor < 0) t0 = Math.max(t0, t);
        else t1 = Math.min(t1, t);
        if (t0 > t1) break;
      }
      if (!miss && t0 <= t1) return 0;
      const corners = [[rect.x, rect.y], [rect.x + rect.w, rect.y], [rect.x, rect.y + rect.h], [rect.x + rect.w, rect.y + rect.h]];
      return Math.min(
        pointRectDistance(a.x, a.y),
        pointRectDistance(b.x, b.y),
        ...corners.map(([x, y]) => pointSegmentDistance(x, y, a, b))
      );
    };

  for (const part of fighterHitParts(p)) {
    const distance = part.kind === 'circle'
      ? pointRectDistance(part.x, part.y)
      : segmentRectDistance(part.a, part.b);
    if (distance <= part.r) {
      return { zone: part.zone, y: part.kind === 'circle' ? part.y : (part.a.y + part.b.y) / 2 };
    }
  }
  return null;
}

function drawHitVolumes(p) {
  g.save();
  g.globalAlpha = typeof dashInvuln === 'function' && dashInvuln(p) ? 0.08 : 0.28;   // ダッシュの無敵中は薄く(当たらない)
  for (const part of fighterHitParts(p)) {
    g.fillStyle = g.strokeStyle = zoneInfo(p, part.zone).color;
    if (part.kind === 'circle') {
      g.beginPath();
      g.arc(part.x, part.y, part.r, 0, 7);
      g.fill();
    } else {
      g.lineCap = 'round';
      g.lineWidth = part.r * 2;
      g.beginPath();
      g.moveTo(part.a.x, part.a.y);
      g.lineTo(part.b.x, part.b.y);
      g.stroke();
    }
  }
  g.restore();
}

// 色を明るく(a>0)/暗く(a<0)する。a は -1〜1
function shade(c, a) {
  if (typeof c !== 'string' || c[0] !== '#') return c;
  let h = c.slice(1);
  if (h.length === 3) h = h.replace(/./g, '$&$&');
  const n = parseInt(h, 16),
        t = a < 0 ? 0 : 255,
        k = Math.abs(a);
  return 'rgb(' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (t - v) * k)) + ')';
}

// ============================================================
// 頭の向き (CHARACTER_DRAWS の設定から、向きごとに頭を描き直す)
//   頭の向き = 姿勢配列13番目 (0=真横 1=少し正面 2=まあまあ正面 3=正面)。0 のときは従来の真横の描画。
//   描き方: 頭を球として、顔のパーツ(目・眉・鼻・口)・耳・髪・頭の装飾・顔の装飾を
//           「横向きの座標(x=顔の前後, y=上下)」に「左右の位置」を足した3次元の位置から画面へ投影して描く。
//   ctx.hv (頭の見え方) の中身:
//     phi   顔の向きの角度(0=真横〜π/2=正面。背面側は負)   cs / sn = cos / sin   as / ap = sn, phi の絶対値
//     sf = 奥側の目が見える度合い(0〜1)   vn = 手前側の目   fv = 顔の中心線(鼻・口・眉・顔の装飾)   back = 背面側か
//     X(F, R)  顔の面の画面x。F=真横のときのx(頭の半径が1)、R=左右の位置(+=手前側 / -=奥側)
//     S(F, R)  頭に固定された点の画面x(髪や装飾など、顔の面から浮いていない物)
//     Y(U)     高さU(上がプラス)の画面y
//   HEAD_PHI を書き換えると、向きごとの角度を調整できる。
// ============================================================
// (HEAD_PHI / HEAD_PHI_BACK はファイルの先頭「設定」にまとめてある)

function headView(ctx, hd) {
  const { hcx, hcy, Rh } = ctx, ha = Math.abs(hd),
    phi = (hd < 0 ? -1 : 1) * dirLerp(hd < 0 ? HEAD_PHI_BACK : HEAD_PHI, ha),     // 負の向き(背面)は phi も負
    cs = Math.cos(phi), sn = Math.sin(phi), c01 = (v) => Math.max(0, Math.min(1, v));
  return {
    hd, phi, cs, sn, as: Math.abs(sn), ap: Math.abs(phi), back: phi < 0, turned: ha > 0.02,
    sf: c01((phi - 0.3) / 0.5),                                  // 奥側の目が見える度合い
    fv: phi >= 0 ? 1 : c01(1 - Math.abs(phi) / 0.5),             // 顔の中心線(鼻・口・眉・顔の装飾)が見える度合い。背面では 0
    vn: phi >= 0 ? 1 : c01((0.6 * sn + 0.34 * cs) / 0.2),        // 手前側の目が見える度合い
    X: (F, R = 0) => hcx + Rh * ((1 - (1 - F) * cs) * cs - R * sn),
    S: (F, R = 0) => hcx + Rh * (F * cs - R * sn),
    Y: (U) => hcy - Rh * U
  };
}

// 横向きの座標で描く関数 fn を、x0 にあった物を nx へ置き、横幅を sx 倍(mirror=左右反転)して描く
function atFeature(ctx, x0, nx, sx, mirror, fn) {
  const { g } = ctx;
  g.save();
  g.translate(nx, 0);
  g.scale(mirror ? -sx : sx, 1);
  g.translate(-x0, 0);
  fn();
  g.restore();
}

// 顔の面に貼り付いた物(目・眉)を、頭の丸みに沿って描く。
//   atFeature と同じ置き方(x0 → nx、横 sx 倍、mirror=左右反転)に加えて、横を細い短冊に分け、
//   短冊ごとに「その位置の顔の面がどれだけこちらを向いているか」で横幅を変える。
//   斜めから見ると、奥の目は目尻側ほど細く(頭の丸みの向こうへ回り込む)、手前の目は目尻側が少し広くなる。
//   R=左右の位置(+が手前) / U=高さ / hw=テンプレートの半分の幅(px)。FACE_CURVE.strips=0 か画質「低」で以前の平らな貼り方
// (FACE_CURVE はファイルの先頭「設定」にまとめてある)
function onFace(ctx, x0, nx, R, sx, mirror, U, hw, fn) {
  const { g, hv, Rh } = ctx, N = FACE_CURVE.strips;
  if (!N || !hv || (typeof save !== 'undefined' && save.cfg && save.cfg.quality === 'low')) return atFeature(ctx, x0, nx, sx, mirror, fn);
  const cs = hv.cs, sn = hv.sn, sg = Math.sign(R) || 1,
    d = (r) => { const fz = Math.sqrt(Math.max(0.04, 1 - r * r - U * U)); return -(r / fz) * cs - sn; },   // 顔の左右 r で、画面の横がどれだけ動くか
    d0 = d(R), T = hw / Rh * 1.25;
  if (Math.abs(d0) < 1e-3) return atFeature(ctx, x0, nx, sx, mirror, fn);
  const wv = Math.min(1, Math.abs(sn) / 0.45),                            // 真横に近いほど丸みの効果を弱める(真横の描き方となめらかにつなぐ)
    rel = (t) => Math.max(0, Math.min(2.5, 1 + (d(R - sg * t) / d0 - 1) * wv)),   // テンプレートの +t(鼻の側)は顔の中心へ向かう
    edges = [], dir = mirror ? -1 : 1;
  if (Math.abs(rel(-T * 0.8) - 1) < 0.06 && Math.abs(rel(T * 0.8) - 1) < 0.06) return atFeature(ctx, x0, nx, sx, mirror, fn);   // ほぼ平ら(正面など)
  const m = g.getTransform(), snap = (x) => m.a ? (Math.round(m.a * x + m.e) - m.e) / m.a : x;   // 短冊の境目を画面の画素にそろえる(境目に線が出ないように)
  for (let k = 0; k <= N; k++) edges.push(-T + (2 * T * k) / N);
  const cum = [0];                                                        // 中心(t=0)からの、画面上の位置(倍率込み)
  const pos = (t) => {                                                    // t までの積分(短冊ごとの一定の倍率で)
    let s = 0;
    for (let k = 0; k < N; k++) {
      const a = edges[k], b = edges[k + 1], r = rel((a + b) / 2);
      const lo = Math.max(Math.min(a, b), Math.min(0, t)), hi = Math.min(Math.max(a, b), Math.max(0, t));
      if (hi > lo) s += (t >= 0 ? 1 : -1) * (hi - lo) * r;
    }
    return s;
  };
  for (let k = 0; k < N; k++) {
    const a = edges[k], b = edges[k + 1], r = rel((a + b) / 2);
    if (r * sx < 0.03) continue;
    const xa = nx + dir * sx * Rh * pos(a), xb = nx + dir * sx * Rh * pos(b);
    g.save();
    g.beginPath();
    let L = snap(Math.min(xa, xb)), Rr = snap(Math.max(xa, xb));            // 端の短冊は外側へはみ出た分も描く
    if (k === 0) { if (xa < xb) L -= 40; else Rr += 40; }
    if (k === N - 1) { if (xb > xa) Rr += 40; else L -= 40; }
    g.rect(L, ctx.hcy - Rh * 3, Rr - L, Rh * 6);
    g.clip();
    g.translate(xa, 0);
    g.scale(dir * sx * r, 1);
    g.translate(-(x0 + a * Rh), 0);
    fn();
    g.restore();
  }
}

// 頭の外側だけに描く(頭の後ろにある物が、頭からはみ出た部分だけ見える)
function outsideHead(ctx, fn) {
  const { g, hcx, hcy, Rh } = ctx;
  g.save();
  clipOutsideHead(ctx);
  fn();
  g.restore();
}

// ============================================================
// 頭の形 (イラスト風: 丸い頭蓋 + 細くなるあご・とがったあご先)
//   頭を「上半分は球、下半分はあごの線」の立体として持ち、頭の向き(hv.phi)で回してから画面へ投影した外形を描く。
//   真横ではあご先が前下に出た横顔、斜めではあごの線が片側に寄り、正面では卵形の輪郭になる。
//   HEAD_SHAPE.on = false で以前の丸い頭に戻る。キャラごとに CHARACTER_DRAWS の headShape で変えられる:
//     headShape: { jaw: 1(あごの幅の倍率。大きいほどエラが張る), chin: 1(あご先の長さの倍率), chinW: 1(あご先の幅の倍率) }
//     headShape: false … そのキャラだけ丸い頭
//   座標はすべて頭の半径=1。f=顔の前方向 / r=左右(+が手前側) / u=上
// ============================================================
// (HEAD_SHAPE / FACE_ILLUST はファイルの先頭「設定」にまとめてある)
const _headPts = new Map();
// ---- 顔の形のテンプレート (CHARACTER_DRAWS の headShape: 'heroine' のように名前で選ぶ) ----
//   jaw=あごの幅(エラ) / chin=あご先の長さ / chinW=あご先の幅 / cheek=頬のふくらみ(あご先〜頬の幅)  … すべて倍率(省略1)
//   headShape: { type: 'heroine', chin: 1.1 } のように、テンプレートの一部だけ変えることもできる
// (FACE_TEMPLATES はファイルの先頭「設定」にまとめてある)
function faceSpec(spec) {
  if (typeof spec === 'string') return FACE_TEMPLATES[spec] || {};
  if (!spec || spec === true) return {};
  return spec.type ? { ...(FACE_TEMPLATES[spec.type] || {}), ...spec } : spec;
}
// 高さ u(上がプラス、頭の半径=1)での、頭の前側の出方(真横から見た顔の前の線)。
//   forehead: 数値(額の前の位置)を書くと、鼻の付け根〜額(FOREHEAD_V.from〜to)を縦にまっすぐな線にし(ほぼ直角)、
//   上は頭頂の丸みへ、下は鼻の付け根で元の丸みへなめらかにつなぐ。省略時はふつうの丸い頭
// (FOREHEAD_V はファイルの先頭「設定」にまとめてある)
function headFront(o, u) {
  const rho = Math.sqrt(Math.max(0, 1 - u * u)), F = o && o.forehead;
  if (F == null || F >= 1 || u <= FOREHEAD_V.root || u >= FOREHEAD_V.top) return rho;
  const sm = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); },
    from = Math.max(FOREHEAD_V.root + 0.05, Math.min(FOREHEAD_V.to, o.foreheadFrom ?? FOREHEAD_V.from));   // foreheadFrom: 鼻のある顔は鼻筋の始まりまで額をまっすぐにのばす(noseZone)
  if (u < from) return rho + (F - rho) * sm((u - FOREHEAD_V.root) / (from - FOREHEAD_V.root));
  if (u <= FOREHEAD_V.to) return Math.max(F, Math.min(rho, F));   // 縦にまっすぐ
  // 額の上: まっすぐな線から頭頂の丸みへ、円の弧のように丸く曲がる(round が大きいほど丸い。0 で以前のゆるやかなつなぎ)
  const t = Math.max(0, Math.min(1, (u - FOREHEAD_V.to) / (FOREHEAD_V.top - FOREHEAD_V.to))), R = FOREHEAD_V.round ?? 0,
    w = (1 - R) * sm(t) + R * (1 - Math.sqrt(1 - t * t));
  return F + (rho - F) * w;
}
function headShapePoints(spec, nz = null) {
  // nz: 顔と一体にした鼻のある所(鼻筋の始まり S 〜 鼻の下の先 E)。その間の顔の前の線を S〜E の直線より前へ出さない
  //   (頭の丸みが鼻の下に隠れていると、鼻の top / bot を変えても形が変わらないため。鼻の形はそこだけ鼻の線で決まる)
  const o = faceSpec(spec), key = JSON.stringify([o.skull ?? -0.3, o.napeW ?? 1, o.jaw ?? 1, o.chin ?? 1, o.chinW ?? 1, o.cheek ?? 1, o.chinPos || 0, o.jawLine || 0, o.forehead ?? 1, o.foreheadFrom ?? null, FOREHEAD_V, nz]);
  if (_headPts.has(key)) return _headPts.get(key);
  const P = [], J = o.jaw ?? 1, Cn = o.chin ?? 1, CW = o.chinW ?? 1, CK = o.cheek ?? 1, H = HEAD_SHAPE;
  for (let u = o.skull ?? -0.3; u <= 1.001; u += (u > 0.2 && u < 0.95 && o.forehead != null ? 0.04 : 0.1)) {   // 額の上の丸みは細かく              // 頭蓋(球の上側)。skull=頭蓋の丸みが続く下端(高いほど、頬から下が早くすぼまる)
    const rho = Math.sqrt(Math.max(0, 1 - u * u));
    // forehead: 額を縦にまっすぐ(ほぼ直角)にする。前側の点だけ、前への出方を headFront(額の線)に合わせる
    let FR = headFront(o, u);
    if (nz && u <= -nz.yt && u >= -nz.yE) FR = Math.min(FR, nz.xS + (nz.xE - nz.xS) * (-u - nz.yt) / (nz.yE - nz.yt));
    for (let k = 0; k < 32; k++) {
      const a = (k / 32) * Math.PI * 2, c = Math.cos(a);
      P.push([c > 0 ? FR * c : rho * c, rho * Math.sin(a), u]);
    }
  }
  const NW = o.napeW ?? 1;                                          // 後頭部の下側の左右の幅(正面から見たとき、あごの横にはみ出す分)
  for (let u = -0.38; u >= H.nape; u -= 0.08) {                     // 後頭部(下の方まで丸い)
    const rho = Math.sqrt(Math.max(0, 1 - u * u)), w = 1 + (NW - 1) * Math.min(1, (-0.38 - u) / 0.24);
    for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2; if (Math.cos(a) < -0.05) P.push([rho * Math.cos(a), rho * Math.sin(a) * w, u]); }
  }
  const C0 = o.chinPos || H.chin, JL = o.jawLine || H.jaw,             // テンプレートが決めたあご先・あごの線(無ければ標準)
    ch = [C0[0], H.chinW * CW, -0.3 + (C0[1] + 0.3) * Cn],                // あご先
    line = [ch, ...JL.map(([f, r, u], i) => {
      const t = (i + 1) / JL.length;                               // 耳に近いほど元の幅のまま(エラの張りはあごの途中だけ)
      const ck = 1 + (CK - 1) * Math.sin(Math.PI * Math.min(1, t * 1.6));   // 頬: あご先と耳の間がふくらむ
      return [f, r * (1 + (J - 1) * (1 - t * 0.6)) * ck, -0.3 + (u + 0.3) * (1 + (Cn - 1) * (1 - t))];
    })];
  for (let i = 0; i < line.length - 1; i++) for (let s = 0; s < 4; s++) {
    const a = line[i], b = line[i + 1], t = s / 4, p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    P.push(p, [p[0], -p[1], p[2]]);
  }
  const L = line[line.length - 1]; P.push(L, [L[0], -L[1], L[2]]);
  if (nz) for (const p of nz.keep) P.push([p[0], 0, -p[1]]);            // 鼻のある所の上下(元の顔の線の上の点を細かく)。ここより上・下の顔の線は変わらず、なめらかにした輪郭が鼻の端で内側へずれない
  _headPts.set(key, P);
  return P;
}
// 真横から見た頭の前の線: 高さ U(上がプラス)での顔の前の x(頭の半径=1)。鼻を付ける前の頭の形(凸包)から求める
const _sideProf = new Map();
function headSideFront(spec, U, nz = null) {
  const key = JSON.stringify(faceSpec(spec)) + JSON.stringify(FOREHEAD_V) + JSON.stringify(nz);
  let H = _sideProf.get(key);
  if (!H) {
    const pts = headShapePoints(spec, nz).map(([f, , u]) => [f, u]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
    for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    H = lo.slice(0, -1).concat(up.slice(0, -1));
    _sideProf.set(key, H);
  }
  let best = null;
  for (let j = 0; j < H.length; j++) {
    const a = H[j], b = H[(j + 1) % H.length];
    if ((a[1] - U) * (b[1] - U) > 0 || a[1] === b[1]) continue;
    const x = a[0] + (b[0] - a[0]) * (U - a[1]) / (b[1] - a[1]);
    if (best == null || x > best) best = x;
  }
  return best ?? Math.sqrt(Math.max(0, 1 - U * U));
}
// 顔と一体にした鼻(NOSE_PROFILE の smooth)のある所。S = 鼻筋の始まり(top の高さの顔の前の線)/ E = 鼻の下が顔へもどる所
//   座標は頭の半径=1、x=前、y=下。鼻を顔と一体にしないとき・頭の形が無いときは null
function noseZone(cd) {
  if (!cd || cd.headCustom || !FACE_ILLUST.noseMerge || !HEAD_SHAPE.on || cd.headShape === false) return null;
  const N = NOSE_PROFILE[noseName(cd.nose)];
  if (!N || !N.smooth) return null;
  const yt = N.top, by = Math.max(N.bot[1], N.tip[1] + 0.03), bx = Math.min(N.bot[0], N.tip[0] - 0.02);
  // 鼻の下が顔の線へもどる所(E): 鼻先 → 鼻の下の向きのまま下がって、元の顔の線にぶつかる高さ(lip より下。顔の線が奥にあるほど下)。
  //   鼻の下の線がそのまま上唇の線になり、横に平らな段ができない
  let yE = by + (N.lip ?? 0.16);
  {
    const ul = Math.hypot(bx - N.tip[0], by - N.tip[1]) || 1, ux = (bx - N.tip[0]) / ul, uy = Math.max(0.35, (by - N.tip[1]) / ul);
    const y0 = yE;
    for (let y = y0; y <= by + 0.7; y += 0.01) { yE = y; if (bx + ux / uy * (y - by) <= headSideFront(cd.headShape, -y) + 0.02) break; }
    yE = y0 + (yE - y0) * (N.lipReach ?? 0.45);                      // lipReach: 鼻の下の向きのまま顔の線まで下りる割合(1 で上唇まで一直線 / 0 で lip の所で顔へもどる)
  }
  const
    spec = { ...faceSpec(cd.headShape), foreheadFrom: -yt };          // 額のまっすぐな線を鼻筋の始まりまでのばす(額 → 鼻筋がまっすぐつながる)
  // 上(額)は額の線(headFront)のとおり、下(口・あご)は元の頭の形の線の上に点を置く。
  //   額は頭の丸みに飲みこまれない(下の顔が前へ出ていると、丸め込み(凸包)で額が斜めになるため。鼻のある所の顔の線を下げてあるので額がまっすぐ残る)
  const keep = [], o = faceSpec(spec), fh = (y) => headFront(o, -y);
  for (let j = 0; j <= 10; j++) { const y1 = yt - 0.3 * j / 10, y2 = yE + 0.3 * j / 10; keep.push([+fh(y1).toFixed(4), +y1.toFixed(4)], [+headSideFront(spec, -y2).toFixed(4), +y2.toFixed(4)]); }
  const nz = { yt, yE, xS: fh(yt), xE: headSideFront(spec, -yE), keep };
  return { ...nz, spec, prof: (y) => headSideFront(spec, -y, nz) };   // prof = 鼻を付けたあとの頭の形の、真横の顔の前の線
}
// 頭の外形の点の列(画面座標・凸包)。ctx に覚えておく(同じフレームで何度も使うため)
function headOutline(ctx) {
  const { hcx, hcy, Rh, hv, charDraw } = ctx, spec = charDraw && charDraw.headShape;
  const cs = hv ? hv.cs : 1, sn = hv ? hv.sn : 0, key = hcx + ',' + hcy + ',' + Rh + ',' + cs + ',' + sn;
  if (ctx._hoKey === key) return ctx._ho;
  let out;
  if (!HEAD_SHAPE.on || spec === false) {
    out = null;
  } else {
    const nz = noseZone(charDraw), pts = headShapePoints(nz ? nz.spec : spec, nz && { yt: nz.yt, yE: nz.yE, xS: nz.xS, xE: nz.xE, keep: nz.keep }).map(([f, r, u]) => [hcx + Rh * (f * cs - r * sn), hcy - Rh * u]);
    pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
    for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    out = lo.slice(0, -1).concat(up.slice(0, -1));
  }
  ctx._hoKey = key; ctx._ho = out;
  return out;
}
// 頭の形のパスを今のパスに足す(なめらかな曲線)。grow = 外側へ広げる px
function headPathTo(ctx, grow = 0, g = ctx.g) {
  const { hcx, hcy, Rh } = ctx, H = headOutline(ctx);
  if (!H) { g.moveTo(hcx + Rh + grow, hcy); g.arc(hcx, hcy, Rh + grow, 0, Math.PI * 2); return; }
  const n = H.length, cx = H.reduce((s, p) => s + p[0], 0) / n, cy = H.reduce((s, p) => s + p[1], 0) / n,
    Q = grow ? H.map(([x, y]) => { const d = Math.hypot(x - cx, y - cy) || 1; return [x + (x - cx) / d * grow, y + (y - cy) / d * grow]; }) : H,
    mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], m0 = mid(Q[n - 1], Q[0]);
  g.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) { const m = mid(Q[i], Q[(i + 1) % n]); g.quadraticCurveTo(Q[i][0], Q[i][1], m[0], m[1]); }
  g.closePath();
}
function headPath(ctx, grow = 0) {
  const P = new Path2D();
  headPathTo(ctx, grow, P);
  return P;
}
// 頭の外側(大きな四角から頭の形をくり抜いた物)。clip 用
function headOutsidePath(ctx) {
  const { hcx, hcy } = ctx, P = new Path2D();
  P.rect(hcx - 400, hcy - 400, 800, 800);
  const H = headPath(ctx, 1), Q = new Path2D();
  Q.addPath(P); Q.addPath(H);
  return Q;
}
// 頭(+顔と一体にした鼻)の外側だけに clip する。鼻は頭の形の外にふくらんでいるので、頭の後ろの物(奥側のもみあげ・リボンなど)が
//   鼻の上に描かれないよう、鼻の外側でも clip する(clip は重ねると両方の内側だけになる)
function clipOutsideHead(ctx) {
  const { g, hcx, hcy, Rh, hv } = ctx;
  g.clip(headOutsidePath(ctx), 'evenodd');
  const nose = hv && hv.turned ? (hv.fv >= 0.3 ? noseSilhouette(ctx, (F, y) => [hv.X(F), hcy + Rh * y]) : null) : noseSilhouette(ctx);
  if (!nose) return;
  const Q = new Path2D();
  Q.rect(hcx - 400, hcy - 400, 800, 800);
  Q.addPath(nose);
  g.clip(Q, 'evenodd');
}

// ============================================================
// 顔を覆う布 (忍者の口元の布など)。CHARACTER_DRAWS の faceMask で設定する
//   faceMask: { color, nose(鼻の所の上端の高さ, 省略 -0.08), side(真横の所の上端, 省略 -0.55),
//               end(布の端の方位角(度), 省略 125。90=耳の下 / 180=真後ろ), endY(端の高さ, 省略 -0.85) }
//   頭に巻いた布を立体として持ち、上端の線を頭の向きで回して投影する。どの向きでも鼻から耳の下へ流れる1枚の布になる
//   (以前の faceCover は真横の形を左右にずらした2枚で近似していたため、斜めや正面で布が×の形に重なっていた)
// ============================================================
function drawFaceMask(ctx, spec) {
  if (!spec) return;
  const { g, hcx, hcy, Rh, hv, K } = ctx, cs = hv ? hv.cs : 1, sn = hv ? hv.sn : 0,
    U0 = spec.nose ?? -0.08, U1 = spec.side ?? -0.55, B = (spec.end ?? 125) * Math.PI / 180, UB = spec.endY ?? -0.85,
    Ut = (a) => { const t = Math.abs(a); return t <= Math.PI / 2 ? U0 + (U1 - U0) * Math.pow(t / (Math.PI / 2), 1.3) : U1 + (UB - U1) * (t - Math.PI / 2) / (B - Math.PI / 2); },
    runs = [], N = 48;
  let run = null;
  for (let i = 0; i <= N; i++) {
    const a = -B + (2 * B * i) / N, u = Ut(a), rho = Math.sqrt(Math.max(0, 1 - u * u)) * 1.02, vis = Math.cos(a) * sn + Math.sin(a) * cs > -0.02;   // こちらを向いている所だけ
    if (vis) { if (!run) runs.push(run = []); run.push([hcx + Rh * rho * (Math.cos(a) * cs - Math.sin(a) * sn), hcy - Rh * u]); }
    else run = null;
  }
  if (!runs.length) return;
  const head = headPath(ctx), col = spec.color || '#143', bot = hcy + Rh * 2.5;
  runs.forEach((R) => {
    if (R.length < 2) return;
    const poly = new Path2D(), first = R[0], last = R[R.length - 1];
    poly.moveTo(first[0], bot);
    R.forEach((p) => poly.lineTo(p[0], p[1]));
    poly.lineTo(last[0], bot);
    poly.closePath();
    g.save();
    g.clip(head);
    const gr = g.createLinearGradient(0, hcy - Rh * 0.2, 0, hcy + Rh * 1.05);
    gr.addColorStop(0, K(col, 0.12)); gr.addColorStop(1, K(col, -0.3));
    g.fillStyle = gr;
    g.fill(poly);
    g.clip(poly);
    if (!ctx.fl) celFill(null, () => {                                 // 上端の下に落ちるしわの影
      R.forEach((p, i) => i ? g.lineTo(p[0], p[1] + Rh * 0.14) : g.moveTo(p[0], p[1] + Rh * 0.14));
      for (let i = R.length - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1] + Rh * 0.3);
      g.closePath();
    }, true);
    g.beginPath();
    headPathTo(ctx);
    withOutlinePart('face', ctx.ol)(3);                                // 布に隠れた頭の輪郭を描き直す
    g.restore();
    g.save();
    g.clip(head);
    g.beginPath();
    R.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]));
    withOutlinePart('faceCover', ctx.ol)(2);                           // 布の上端
    g.restore();
  });
}

// ============================================================
// 鼻と顔をひとつの輪郭にする (FACE_ILLUST.noseMerge)
//   鼻を「顔から生えたふくらみ」として、頭の形と同じ塗りで塗り、外側にだけ輪郭を引く(鼻と顔の境目の線が出ない)。
//   形は真横から見た鼻の横顔(鼻筋 → 鼻先の丸み → 鼻の下のくぼみ)で、上下の端は頭の輪郭へなめらかに溶けこむ。
//   向きが付いたときは横顔の形を顔の向きで写すので、正面寄りでは鼻が顔の中に入って輪郭から消え、鼻の下の線と影だけになる。
//   座標は頭の半径=1。x=顔の前、y=下。top=鼻筋の始まりの高さ / tip=鼻先 / bot=鼻の下(小鼻)/ round=鼻先の丸みの大きさ
//   smooth: true の鼻(girl / Rina): 顔の線の top の高さから鼻筋が出て、tip → bot を通り、bot の lip(省略 0.16)下で顔の線へもどる。
//     top〜その間の顔の線は鼻の線に置きかわる(頭の丸みが鼻を隠さない)ので、top / tip / bot / lip を変えるとその通りに形が変わる。
//     top を小さく(上へ)すると鼻筋が長くなだらか / bot の x を大きくすると鼻の下が平ら / bot の y・lip を大きくすると鼻の下が長い。
//     bot は鼻先より後ろ・下に置く(逆の値は鼻先のすぐ後ろ・下に直す)
// ============================================================
// (NOSE_PROFILE はファイルの先頭「設定」にまとめてある)
// 鼻の下に短い線を入れる鼻(イラストの女の子の鼻)。len = 線の長さ(頭の半径に対する割合) / drop = 鼻先からの下がり / w = 線の太さ(頭の半径に対する割合)
// (NOSE_UNDER_LINE はファイルの先頭「設定」にまとめてある)
function noseName(n) { return typeof n === 'string' ? n : n && n.type; }
// 鼻の下の短い線の両端 [F(前), R(横), y(下)](頭の半径=1)。a = 正面への向き(0=真横 / 1=正面)。
//   真横では鼻先の下から小鼻へ(鼻の下側に沿う短い線)、正面では鼻先の下の横向きの短い線になるよう、間はなめらかに移る。
//   顔の側の端(B)は手前の頬(R+)の側へ寄せる(斜めの向きで線が点につぶれないように)
function noseUnderLinePts(nm, a) {
  const L = NOSE_UNDER_LINE[nm], N = NOSE_PROFILE[nm];
  if (!L || !N) return null;
  const [tx, ty] = N.tip, [bx, by] = N.bot, h = L.len / 2, yf = ty + L.drop,
    A0 = [tx - 0.035, 0, ty + 0.03], B0 = [tx - 0.035 - L.len, 0, by + 0.012],
    A1 = [bx + 0.02, -h, yf], B1 = [bx + 0.02, h, yf], m = (p, q) => p.map((v, i) => v + (q[i] - v) * a);
  return [m(A0, A1), m(B0, B1)];
}
// 真横の顔の、鼻の下の短い線
function noseUnderLineSide(ctx) {
  const { g, K, hcx, hcy, Rh } = ctx, nm = noseName(ctx.charDraw && ctx.charDraw.nose), P = noseUnderLinePts(nm, 0);
  if (!P || ctx.fl || NOSE_UNDER_LINE[nm].line === false) return;
  g.save();
  g.strokeStyle = K(ctx.skinColor, -0.6); g.lineCap = 'round'; g.lineWidth = Math.max(0.8, Rh * NOSE_UNDER_LINE[nm].w);
  g.beginPath(); g.moveTo(hcx + Rh * P[0][0], hcy + Rh * P[0][2]); g.lineTo(hcx + Rh * P[1][0], hcy + Rh * P[1][2]); g.stroke();
  g.restore();
}
// 鼻のふくらみの形(Path2D)。map(F, y) = 横顔の座標 → 画面。鼻を描かないキャラは null
function noseSilhouette(ctx, map) {
  const n = ctx.charDraw && ctx.charDraw.nose, N = FACE_ILLUST.noseMerge && NOSE_PROFILE[typeof n === 'string' ? n : n && n.type];
  if (!N || ctx.charDraw.headCustom) return null;
  const M = map || ((F, y) => [ctx.hcx + ctx.Rh * F, ctx.hcy + ctx.Rh * y]),
    front = (y) => Math.sqrt(Math.max(0, 1 - y * y)), k = N.round, P = new Path2D(),
    q = (cx, cy, x, y) => P.quadraticCurveTo(...M(cx, cy), ...M(x, y));
  const [tx, ty] = N.tip, yt = N.top, yb = N.bot[1] + 0.05, x0 = front(yt) - 0.04, x1 = front(yb) - 0.08;
  const Z = N.smooth && noseZone(ctx.charDraw);
  if (Z) {                                                                   // 額・頬の線から出入りする鼻(top / tip / bot の通りの形になる)
    //   S(top の高さの顔の前の線) → 鼻筋 → 鼻先(tip) → 鼻の下(bot) → E(顔の線へもどる所)。S〜E の間の顔の線は S〜E の直線まで下げてある(headShapePoints)
    O = new Path2D(), c = (x, y, X, Y, x2, y2) => { P.bezierCurveTo(...M(x, y), ...M(X, Y), ...M(x2, y2)); O.bezierCurveTo(...M(x, y), ...M(X, Y), ...M(x2, y2)); },
      bx = Math.min(N.bot[0], tx - 0.02), by = Math.max(N.bot[1], ty + 0.03),       // 鼻の下は鼻先より後ろ・下(逆になると形がねじれる)
      S = [Z.xS, Z.yt], E = [Z.xE, Z.yE], spec = Z.spec,
      dS = (() => { const a = Z.prof(S[1] - 0.03), b = Z.prof(S[1] + 0.03); const vx = (b - a) / 0.06; const l = Math.hypot(vx, 1); return [vx / l, 1 / l]; })(),   // S での顔の線の向き(下向き)
      dE = (() => { const a = Z.prof(E[1] - 0.03), b = Z.prof(E[1] + 0.03); const vx = (b - a) / 0.06; const l = Math.hypot(vx, 1); return [vx / l, 1 / l]; })(),
      Lb = Math.hypot(tx - S[0], ty - S[1]), Lu = Math.hypot(bx - E[0], by - E[1]),
      bd = [(tx - S[0]) / Lb, (ty - S[1]) / Lb];                            // 鼻筋の向き
    // 上下の端では、元の顔の線(pf)に少し沿ってから出入りする(頭の輪郭のなめらかにした角とのすき間・段を鼻の線で覆う)
    const pf = Z.prof, RUN = 0.12, NS = 6;
    P.moveTo(...M(pf(S[1] - RUN) - 0.03, S[1] - RUN));
    for (let j = 0; j <= NS; j++) { const y = S[1] - RUN + RUN * j / NS; P.lineTo(...M(pf(y), y)); O[j ? 'lineTo' : 'moveTo'](...M(pf(y), y)); }
    c(S[0] + dS[0] * Lb * 0.35, S[1] + dS[1] * Lb * 0.35, tx - bd[0] * Lb * 0.3, ty - bd[1] * Lb * 0.3, tx, ty);   // 鼻筋: 顔の線の向きで出て、鼻先へ
    // 鼻の下: 鼻先から bot へ向かう線の向き(ud)のまま bot を通り、顔の線へなめらかに入る(bot で角を作らない)。
    //   underAngle: 鼻の下の線と上唇の線の間の角度の開き(0〜1。大きいほど鼻の下から上唇へゆるやかに開く)
    const ul = Math.hypot(bx - tx, by - ty) || 1, ud = [(bx - tx) / ul, (by - ty) / ul], UA = N.underAngle ?? 0;
    if (N.sharp) c(tx + ud[0] * ul * 0.35, ty + ud[1] * ul * 0.35, bx - ud[0] * ul * 0.3, by - ud[1] * ul * 0.3, bx, by);   // 鼻先(とがる) → 鼻の下
    else { const r = 0.03 * k; c(tx + r * 0.4, ty + r * 0.5, tx - r, ty + r * 1.4, tx - r * 2, ty + r * 1.6); c(tx - r * 3, ty + r * 1.8, bx + 0.03, by, bx, by); }   // 丸い鼻先
    {                                                                        // 鼻の下 → 顔の線へ: bot では鼻の下の線の向き、E では顔の線の向きで、ふくらまずに曲がる
      // 2本の向きの線が交わる点 I を角として、その角を丸めた曲線にする(I が範囲外なら以前の決め方)
      const den = ud[0] * dE[1] - ud[1] * dE[0], sb = den ? ((E[0] - bx) * dE[1] - (E[1] - by) * dE[0]) / den : -1,
        I = [bx + ud[0] * sb, by + ud[1] * sb], tE = dE[1] ? (E[1] - I[1]) / dE[1] : -1;
      if (sb > 0 && tE > 0) c(bx + (I[0] - bx) * 0.7, by + (I[1] - by) * 0.7, E[0] + (I[0] - E[0]) * 0.7, E[1] + (I[1] - E[1]) * 0.7, E[0], E[1]);
      else { const k1 = Lu * (0.25 + 0.35 * UA), k2 = Lu * (0.75 - 0.35 * UA); c(bx + ud[0] * k1, by + ud[1] * k1 + (E[1] - by) * 0.12 * (1 - UA), E[0] - dE[0] * k2, E[1] - dE[1] * k2, E[0], E[1]); }
    }
    for (let j = 1; j <= NS; j++) { const y = E[1] + RUN * j / NS; P.lineTo(...M(pf(y), y)); O.lineTo(...M(pf(y), y)); }
    P.lineTo(...M(pf(E[1] + RUN) - 0.03, E[1] + RUN));
    P.lineTo(...M(0.4, (S[1] + E[1]) / 2));                                // 頭の内側を通って閉じる(線は塗りで隠れる)
    P.closePath();
    P.outline = O;                                                           // 縁取りは外側の線だけ(内側を通って閉じる線の縁取りが輪郭の外へはみ出さないように)
    return P;
  }
  P.moveTo(...M(x0, yt));                                                    // 頭の輪郭の少し内側から出る
  q(x0 + 0.04 + (tx - x0) * 0.2, (yt + ty) / 2 - 0.02, tx - 0.02 * k, ty - 0.05 * k);   // 鼻筋
  q(tx + 0.012 * k, ty + 0.005, tx - 0.07 * k, ty + 0.045 * k);               // 鼻先の丸み
  q(N.bot[0] + 0.06, yb, x1, yb);                                            // 鼻の下から顔へもどる
  P.lineTo(...M(0.45, (yt + yb) / 2));                                       // 頭の内側を通って閉じる(線は塗りで隠れる)
  P.closePath();
  return P;
}
// あごの線(内側の線): 横〜斜めの向きで、手前側のあごの線(あご先 → 耳の下)を頭の中に描く。
//   jawLine を持つ顔の形(animeGirl / illustGirl)だけ。頭の外形(凸包)はあご先から後頭部へまっすぐつながるので、
//   横顔ではあごと首の境目が見えなくなるため。JAW_LINE.on = false で描かない / w = 線の太さ / fade = 正面寄りで消える向き
const JAW_LINE = { on: true, w: 2.2, fade: [0.3, 0.4] };
function drawJawLine(ctx) {
  const { g, hcx, hcy, Rh, hv, charDraw } = ctx, o = faceSpec(charDraw && charDraw.headShape);
  if (!JAW_LINE.on || !o.jawLine || !HEAD_SHAPE.on || charDraw.headShape === false || charDraw.headCustom) return;
  const as = hv && hv.turned ? hv.as : 0, cs = hv && hv.turned ? hv.cs : 1, sn = hv && hv.turned ? hv.sn : 0,
    a = 1 - Math.max(0, Math.min(1, (as - JAW_LINE.fade[0]) / (JAW_LINE.fade[1] - JAW_LINE.fade[0])));
  if (a <= 0 || (hv && hv.back)) return;
  const C0 = o.chinPos || HEAD_SHAPE.chin, pts = [[C0[0], 0, C0[1]], ...o.jawLine.map(([f, r, u]) => [f, r * (o.cheek ?? 1), u])],
    P = pts.map(([f, r, u]) => [hcx + Rh * (f * cs - r * sn), hcy - Rh * u]);
  g.save();
  g.clip(headPath(ctx));
  g.globalAlpha *= a;
  g.beginPath();
  g.moveTo(P[0][0], P[0][1]);
  for (let i = 1; i < P.length - 1; i++) g.quadraticCurveTo(P[i][0], P[i][1], (P[i][0] + P[i + 1][0]) / 2, (P[i][1] + P[i + 1][1]) / 2);
  g.lineTo(P[P.length - 1][0], P[P.length - 1][1]);
  g.lineCap = 'round'; g.lineJoin = 'round';
  ctx.ol(JAW_LINE.w);
  g.restore();
}
// 頭(+鼻)を塗って輪郭を引く。鼻があるときは「太い輪郭 → 塗り」の順で、重なった所の線を塗りで消す
function fillHeadWithNose(ctx, fill, nose) {
  const { g } = ctx;
  if (!nose) {
    g.fillStyle = fill;
    g.beginPath();
    headPathTo(ctx);
    g.fill();
    ctx.ol(3);
    return;
  }
  const w = 3 * olScale();
  if (w > 0) {
    g.lineWidth = w * 2;                                                     // 内側の半分は塗りで隠れるので、2倍の太さで引く
    g.lineJoin = 'round';
    g.strokeStyle = '#111';
    g.beginPath();
    headPathTo(ctx);
    g.stroke();
    g.save(); g.lineJoin = 'miter'; g.miterLimit = 8; g.stroke(nose.outline || nose); g.restore();   // 鼻は角をとがったまま(丸い角だと鼻先が丸く見える)
  }
  g.fillStyle = fill;
  g.beginPath();
  headPathTo(ctx);
  g.fill();
  g.fill(nose);
}

// ---- 頭まるごと (頭の球 / 耳 / 鼻 / 目 / 眉 / 口 / 顔の装飾 / 顔を覆う物) ----
function drawHeadTurned(ctx) {
  const { g, K, C, RG, ol, hcx, hcy, Rh, charDraw, skinColor, hv, hurt } = ctx, cs = hv.cs, sn = hv.sn, skin = ctx.skinColor;
  // 耳。正面・背面に近いほど左右の耳を頭の縁へ寄せ、頭の後ろに置いて「縁から飛び出した耳」にそろえる(左右対称になる)
  const eT = Math.max(0, Math.min(1, (hv.as - 0.7) / 0.3)), eBehind = hv.as > 0.96, pth = hairPartAngle(ctx);
  const ear = withOutlinePart('ear', (side) => {
    if (charDraw.showEars === false) return;
    const F = -0.28 * (1 - eT), R = side * (0.95 + 0.1 * eT), x0 = partS(hv.phi, 0, F, R), a1 = hv.phi + side * pth;
    let xe = partS(hv.phi, side * pth, F, R);                        // part で髪(側髪)が回ると耳も一緒に回る(手前の耳は +、奥の耳は -)
    if (F * Math.sin(a1) + R * Math.cos(a1) < 0 && side > 0 && Math.abs(xe) < Math.abs(x0)) xe = x0;   // 手前の耳が頭の裏へ回るときは、縁より内側へ寄せない
    const x = hcx + Rh * xe;
    g.fillStyle = K(skin, -0.1);
    g.beginPath();
    g.ellipse(x, hcy + Rh * 0.12, Rh * 0.16 * (1 - 0.2 * hv.as), Rh * 0.24, 0, 0, 7);
    g.fill();
    ol(1.8);
    return x;
  });

  // 奥側の耳 (頭の球の後ろ)。正面・背面ではどちらの耳も球の後ろ
  if (hv.as > 0.2) ear(-1);
  if (eBehind) ear(1);

  // 頭の球(鼻が輪郭から出る向きでは、鼻も頭と同じ塗りのひとつの形にする)
  const noseM = hv.fv >= 0.3 ? noseSilhouette(ctx, (F, y) => [hv.X(F), hcy + Rh * y]) : null;
  fillHeadWithNose(ctx, RG(hcx + Rh * 0.3, hcy - Rh * 0.35, 1, Rh * 1.4, K(skin, 0.3), C(skin), K(skin, -0.28)), noseM);   // 頭の形(あご付き。HEAD_SHAPE)
  if (!ctx.fl) celHead(hcx, hcy, Rh, headPath(ctx));                   // あご・後頭部のセル影
  drawJawLine(ctx);                                                  // あごの線

  // 手前側の耳
  const ex = eBehind ? hcx + Rh * partS(hv.phi, pth, -0.28 * (1 - eT), 0.95 + 0.1 * eT) : ear(1);
  if (charDraw.earDetail && charDraw.showEars !== false) {
    withOutlinePart('ear', charDraw.earDetail)({ ...ctx, hcx: hcx + (ex - (hcx - Rh * 0.28)) }, skin);
  }

  // 鼻 (鼻筋・先・小鼻を3次元の点にして投影)
  if (charDraw.nose && charDraw.nose !== 'none' && hv.fv >= 0.3) {
    const NP = {
      normal: [[0.9, 0.05], [1.14, 0.3], [0.84, 0.34], 0.14], small: [[0.9, 0.1], [1.02, 0.25], [0.88, 0.28], 0.1],
      long: [[0.85, -0.08], [1.25, 0.28], [0.8, 0.35], 0.15], round: [[0.88, 0.05], [1.08, 0.3], [0.82, 0.34], 0.2],
      girl: [[0.93, 0.0], [1.07, 0.245], [0.93, 0.32], 0.12]
    }[noseName(charDraw.nose)] || null;
    const UL = NOSE_UNDER_LINE[noseName(charDraw.nose)];
    if (NP) {
      const [B, T, Lb, nw] = NP, nf = Math.max(0, Math.min(1, (hv.as - 0.45) / 0.5)),     // nf: 正面ほど鼻を小さな菱形につぶす(真横の形のまま正面から見ると骸骨の鼻のようになるため)
        pB = [hv.X(B[0]), hcy + Rh * (B[1] + (Lb[1] - 0.1 - B[1]) * nf)], pT = [hv.X(T[0]), hcy + Rh * (T[1] + (Lb[1] + 0.06 - T[1]) * nf)],
        pN = [hv.X(Lb[0], nw * 0.8), hcy + Rh * Lb[1]], pF = [hv.X(Lb[0], -nw * 0.8), hcy + Rh * Lb[1]];
      const ill = FACE_ILLUST.nose && hv.as > 0.5 ? Math.min(1, (hv.as - 0.5) / 0.3) : 0;     // 正面寄り: 輪郭で囲まず、影と鼻先の線だけ(イラストの鼻)
      if (ill < 1) {
        g.save();
        g.globalAlpha *= 1 - ill;
        const brown = FACE_ILLUST.nose ? Math.max(0, Math.min(1, (hv.as - 0.33) / 0.2)) : 0;                  // 顔の内側に入った鼻は、黒い輪郭ではなく肌の暗い色の細い線(黒くつぶれないように)
        if (!noseM) {                                                                      // (鼻を顔と一体にしないときだけ)鼻を別の形として塗る
          g.fillStyle = K(skin, 0.05);
          g.beginPath();
          g.moveTo(...pB);
          if (hv.as > 0.3) { g.lineTo(...pF); g.lineTo(...pT); g.lineTo(...pN); } else { g.lineTo(...pT); g.lineTo(...pN); }
          g.closePath();
          g.fill();
        }
        if (brown < 1 && !noseM) { g.save(); g.globalAlpha *= 1 - brown; withOutlinePart('nose', ol)(1.8 - 0.7 * hv.as); g.restore(); }
        if (brown > 0 && !UL) {                                                            // 鼻先から奥の小鼻へ、鼻の下の線だけ
          g.save(); g.globalAlpha *= brown; g.strokeStyle = K(skin, -0.5); g.lineCap = 'round'; g.lineWidth = Math.max(0.8, Rh * 0.07);
          g.beginPath(); g.moveTo(pT[0] + (pB[0] - pT[0]) * 0.35, pT[1] + (pB[1] - pT[1]) * 0.35); g.lineTo(...pT); g.lineTo(pF[0] + (pT[0] - pF[0]) * 0.2, pF[1]); g.stroke(); g.restore();
        }
        g.restore();
      }
      if (ill > 0 && !UL) {
        g.save();
        g.globalAlpha *= ill;
        g.strokeStyle = K(skin, -0.5); g.lineCap = 'round'; g.lineWidth = Math.max(0.8, Rh * 0.065);
        g.beginPath(); g.moveTo(pN[0] + (pT[0] - pN[0]) * 0.25, pN[1] + Rh * 0.02); g.quadraticCurveTo(pT[0], pT[1] + Rh * 0.06, pF[0], pF[1] - Rh * 0.01); g.stroke();   // 鼻の下の線
        g.restore();
      }
      if (!ctx.fl && !(UL && UL.line !== false && hv.as > 0.5)) celFill(UL ? headPath(ctx) : null, () => {   // (女の子の鼻は正面寄りでは影を付けず、線だけ)                            // 鼻の影: 奥側と鼻の下に落ちる(女の子の鼻は小さく)
        const k = UL ? 0.5 : 1, pE = [pT[0] + (pF[0] - pT[0]) * k, pT[1] + (pF[1] - pT[1]) * k], pD = [pT[0] + (pF[0] - pT[0]) * 0.4 * k, Math.max(pT[1], pE[1]) + Rh * 0.08 * k];
        g.moveTo(...pT); g.lineTo(...pE); g.lineTo(...pD); g.closePath();
      }, 'skinDeep');
      if (UL && UL.line !== false && !ctx.fl) {                                                                 // イラストの女の子の鼻: 鼻の下に短い線(真横では鼻の下側に沿い、正面では横向き)
        const P = noseUnderLinePts(noseName(charDraw.nose), hv.as), yo = (pT[1] - (hcy + Rh * T[1]));   // yo = 正面寄りで鼻先を下げた分
        g.save(); g.strokeStyle = K(skin, -0.6); g.lineCap = 'round'; g.lineWidth = Math.max(0.8, Rh * UL.w);
        g.beginPath(); g.moveTo(hv.X(P[0][0], P[0][1]), hcy + Rh * P[0][2] + yo * 0.5); g.lineTo(hv.X(P[1][0], P[1][1]), hcy + Rh * P[1][2] + yo * 0.5); g.stroke();
        g.restore();
      }
    }
  } else if (hv.fv >= 0.3 && !ctx.fl && !charDraw.headCustom) {                          // 鼻を描かないアニメ顔: 鼻の位置に小さな影だけ
    const tx = hv.X(0.98), ty = hcy + Rh * 0.24, w = Rh * (0.05 + 0.05 * hv.as);
    celFill(headPath(ctx), () => { g.moveTo(tx, ty); g.lineTo(tx - w * 1.2, ty + Rh * 0.09); g.lineTo(tx + w * 0.4 * hv.as, ty + Rh * 0.08); g.closePath(); }, 'skinDeep');
  }

  // 目 (奥の目は左右反転。瞳は顔の向きへ寄る度合い cs)
  const es = charDraw.eyes && typeof charDraw.eyes === 'object' ? charDraw.eyes : {},
    eF = es.x ?? 0.6, x0 = hcx + Rh * eF, eR = 0.34 * (es.spacing ?? 1);
  const eyeAt = (R, sx, mirror) => onFace(ctx, x0, hv.X(eF, R), R, sx, mirror, -(es.y ?? -0.1), Rh * 0.34 * (es.size ?? 1) * (es.width ?? 1), () =>
    drawFaceTemplate({ ...ctx, eyeLook: mirror ? -cs : cs }, 'eyes', charDraw.eyes));
  if (charDraw.eyes) {
    if (hv.sf > 0.05) eyeAt(-eR, hv.sf, true);
    if (hv.vn > 0.05) eyeAt(eR, hv.vn, false);
  }

  // 眉毛
  if (charDraw.brows && hv.fv >= 0.3) {
    const bx0 = hcx + Rh * ((typeof charDraw.brows === 'object' && charDraw.brows.x) ?? es.x ?? 0.6);
    const brow = (R, sx, mirror) => onFace(ctx, bx0, hv.X(eF, R), R, sx, mirror, 0.35, Rh * 0.5, () => drawBrows(ctx, charDraw.brows));
    if (hv.sf > 0.05) brow(-eR, hv.sf, true);
    brow(eR, hv.vn, false);
  }

  // 口 (正面ほど横に広く、顔の中心線に合わせて動く)
  if (charDraw.showMouth !== false && hv.fv >= 0.3) {
    const m = typeof charDraw.mouth === 'string' ? { closed: charDraw.mouth } : (charDraw.mouth || {}),
      mx = hv.X(m.x ?? 0.5), my = hcy + Rh * (m.y ?? 0.5), ms = m.size ?? 1,
      ws = 1 + FACE_ILLUST.mouthWiden * (hv.ap / (Math.PI / 2)), sw = ms * (m.width ?? 1) * ws, sh = ms * (m.height ?? 1),
      M = {
        g, ol, ux: Rh * sw, uy: Rh * sh,
        P: (dx, dy) => [mx + Rh * sw * dx, my + Rh * sh * dy],
        color: m.color || '#7a2a20', inside: m.openColor || '#6a1818'
      },
      closedName = MOUTH_CLOSED[m.closed] ? m.closed : 'smile',
      openName = m.open === false || m.open === 'none' ? null : (MOUTH_OPEN[m.open] ? m.open : 'oval');
    const lt = FACE_ILLUST.nose ? 1 - 0.25 * hv.as : 1;                                      // 正面寄りほど口の線を細く(イラストの口)
    if (ctx.open && openName) MOUTH_OPEN[openName]({ ...M, lw: (m.lineWidth ?? 1.8) * lt });
    else MOUTH_CLOSED[closedName]({ ...M, lw: (m.lineWidth ?? Math.max(1.2, 2 * ms)) * lt });
  }

  g.save();
  const decoClip = headPath(ctx);                                      // 顔の装飾(傷・ペイント)は顔の形からはみ出さない(あごより下へ垂れるひげはそのまま)
  decoClip.rect(hcx - Rh * 3, hcy + Rh * 0.75, Rh * 6, Rh * 4);
  g.clip(decoClip);
  drawFaceDecoTurned(ctx, charDraw.faceDeco);
  g.restore();

  // 顔を覆う物 (口元の布など)。faceMask は立体の布(drawFaceMask)。faceCover は真横用の形を、手前側(左右にずらす)と奥側(反転)の2枚で近似する
  if (charDraw.faceMask) drawFaceMask(ctx, charDraw.faceMask);
  else if (charDraw.faceCoverTurned && hv.fv >= 0.3) withOutlinePart('faceCover', charDraw.faceCoverTurned)(ctx);      // 向きごとに専用の形を描きたいとき(省略時は下の近似)
  else if (charDraw.faceCover && hv.fv >= 0.3) {
    g.save();
    g.beginPath();
    g.arc(hcx, hcy, Rh + 0.5, 0, 7);
    g.clip();
    const sh = Rh * 1.1 * hv.as;
    g.save();
    g.translate(-sh, 0);
    withOutlinePart('faceCover', charDraw.faceCover)(ctx);
    g.restore();
    if (hv.as > 0.3) {
      const xm = hcx + Rh * 1.1 * cs - sh * 0;
      g.save();
      g.translate(2 * xm - sh * 0, 0);
      g.scale(-1, 1);
      g.translate(-sh, 0);
      withOutlinePart('faceCover', charDraw.faceCover)(ctx);
      g.restore();
    }
    g.restore();
  }
}

// ============================================================
// 揺れ物の物理 (髪・鉢巻のなびき)
//   髪の毛束や鉢巻のなびきを「点をつないだひも」として、ワールド座標でフレームごとに動かす。
//   根元はキャラの体(頭)にくっついて動くので、走る・跳ぶ・攻撃する・振り向くと遅れてなびく。
//   体との当たり: 背中より前には入らない(背中で止まる) / 頭を突き抜けない / 地面より下に行かない。
//   ctx.strand(id, 根元, 設定) … ひもの点の列(描画座標)を返す
//   ctx.jiggle(id, 位置, 設定) … バネで遅れて付いてくるずれ[dx, dy](トゲ髪・アホ毛用)
//   PHYS_GRAVITY / 各テンプレートの設定値で、重さ・硬さ・空気抵抗を調整できる。
// ============================================================
// (PHYS_GRAVITY 〜 PHYS_ROOT_FLEX はファイルの先頭「設定」にまとめてある)
const PHYS = new WeakMap(), PHYS_TMP = new Map();
const PHYS_MENU_WARM = 90;   // メニュー画面のキャラの揺れ物を、最初に何フレーム分ならしておくか

// キャラごとの揺れ物の状態。対戦中のキャラはオブジェクトごと、メニュー画面のように毎フレーム作り直すキャラは
//   キャラ・スキン・向き・倒れているか・位置 で引き継ぐ(同じキャラを2体描いても混ざらないように)
//   描くのが何フレームか飛んでも(30fps の設定・処理落ち)作り直さない。作り直すと、なびいていた形が一瞬まっすぐに戻ってしまう
const PHYS_TMP_KEEP = 8;   // stepsOf が作り直す間隔と同じ
function physState(p, ci) {
  let s = PHYS.get(p);
  if (s) return s;
  const key = [ci, p.sk | 0, p.f < 0 ? 'L' : 'R', p.st === 'ko' ? 'ko' : '', Math.round(p.x), Math.round(p.y)].join(',');
  s = PHYS_TMP.get(key);
  if (!s || !(s.fr >= fr - PHYS_TMP_KEEP)) s = { strands: {}, jigs: {}, fr: -1, map: null, menu: typeof sc !== 'undefined' && sc !== 'fight' };
  if (PHYS_TMP.size > 64) PHYS_TMP.clear();
  PHYS_TMP.set(key, s);
  PHYS.set(p, s);
  return s;
}

// drawF の中で1回呼ぶ。描画座標(ローカル)⇔ワールド座標の変換と、体との当たり判定を用意して ctx.strand / ctx.jiggle を作る
function physSetup(ctx, p, ci, M, body) {
  const s = physState(p, ci),
    W = (pt) => [M.ox + M.sx * pt[0], M.oy + M.sy * pt[1]],
    L = (pt) => [(pt[0] - M.ox) / M.sx, (pt[1] - M.oy) / M.sy],
    ks = Math.sqrt(Math.abs(M.sx * M.sy));
  // 振り向いた(左右反転した)ときは、揺れ物も一緒に反転させる(体を突き抜けて反対側へ飛ばないように)
  if (s.map && (Math.sign(s.map.sx) !== Math.sign(M.sx))) {
    const oldL = (pt) => [(pt[0] - s.map.ox) / s.map.sx, (pt[1] - s.map.oy) / s.map.sy], re = (pt) => W(oldL(pt));
    const rv = (v) => [v[0] * M.sx / s.map.sx, v[1] * M.sy / s.map.sy];
    for (const st of Object.values(s.strands)) { st.P = st.P.map(re); st.Q = st.Q.map(re); st.D = st.D.map(rv); }
    for (const j of Object.values(s.jigs)) { j.m = re(j.m); j.v = [0, 0]; j.d = rv(j.d); }
  }
  s.map = { ...M };
  // 地面の高さ: ふだんは戦闘の地面(GY)。メニュー画面のように地面より下に描くキャラは、その足元を地面にする
  //   (GY のままだと、スカートやマントのすそが地面より下とみなされて、上へ押しつぶされる)
  const ground = Math.max(GY, p.y);
  ctx.mem = s; // キャラごとに残る記憶(スカートの形を覚えて、次のフレームのマントが避ける など)
  // ヒットストップ中は揺れ物も止める
  const frozen = typeof hs !== 'undefined' && hs > 0 && typeof sc !== 'undefined' && sc === 'fight';
  const stepsOf = (st) => {
    const gap = fr - st.fr;
    st.fr = fr;
    return gap < 0 || gap > 8 ? -1 : frozen ? 0 : gap;            // -1 = 作り直す
  };
  s.fr = fr;

  // 体との当たり(描画座標)。mode: 'back' 背中より前に入らない / 'head' 頭を突き抜けない
  const { H, u, n, tl, hw, prof, back, side, hcx, hcy, Rh, headSide } = body;
  const widthAt = (t) => {
    if (t <= prof[0][0]) return prof[0][1];
    for (let i = 1; i < prof.length; i++) if (t <= prof[i][0]) {
      const a = prof[i - 1], b = prof[i];
      return a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]);
    }
    return prof[prof.length - 1][1];
  };
  const collide = (pt, r, mode, useHead, sm = 1) => {             // sm: 背中の当たりの効き(頭に付いた物は頭が正面・背面を向くほど弱める)
    let [x, y] = pt;
    const sd = side * sm;
    if (mode === 'back' && sd > 0.15) {
      const dx = x - H[0], dy = y - H[1], t = (dx * u[0] + dy * u[1]) / tl, o = dx * n[0] + dy * n[1];
      if (t > -0.3 && t < 1.04) {
        const lim = -(hw * widthAt(Math.max(0, Math.min(1, t))) * back) * sd - r;
        if (o > lim) { x += (lim - o) * n[0]; y += (lim - o) * n[1]; }
      }
    }
    const hk = Math.max(0, Math.min(1, (headSide - 0.3) / 0.4));     // 頭の当たり: 横向きほど効き、正面・背面へ向くほど小さくなる(切り替わりで跳ねないように連続で)
    if (useHead && hk > 0) {
      const dx = x - hcx, dy = y - hcy, d = Math.hypot(dx, dy), R = (Rh * 0.92 + r * 0.5) * hk;
      if (d < R && d > 0.001) { x = hcx + dx / d * R; y = hcy + dy / d * R; }
    }
    return [x, y];
  };

  // ひも: root=根元(描画座標) / o.len=長さ / o.n=節の数 / o.dir=静止時の向き[dx,dy] / o.curve=節ごとの曲がり(ラジアン)
  //       o.stiff=[根元側, 先側] 形を保つ強さ(0〜1) / o.damp=空気抵抗 / o.grav=重さの倍率 / o.flutter=はためき(布用)
  //       o.collide='back' | 'none' / o.r=太さ(当たりの余白) / o.head=頭の当たりも使う
  ctx.strand = (id, root, o) => {
    const N = o.n ?? 5, len = Math.max(1, o.len), seg = len * ks / N, damp = (o.damp ?? 0.08) * PHYS_DAMP, T2 = PHYS_TIME * PHYS_TIME, grav = (o.grav ?? 1) * PHYS_GRAVITY * PHYS_TIME * PHYS_TIME,
      st0 = o.stiff?.[0] ?? 0.2, st1 = o.stiff?.[1] ?? 0.05, curve = o.curve ?? 0, mode = o.collide || 'none', r = o.r ?? 0,
      dl = Math.hypot(o.dir[0], o.dir[1]) || 1;
    // 静止時の節の向き(ワールド)。根元から順に curve ずつ曲げる
    const rest = [];
    for (let i = 0; i < N; i++) {
      const a = curve * i, c = Math.cos(a), sn = Math.sin(a),
        dx = (o.dir[0] * c - o.dir[1] * sn) / dl, dy = (o.dir[0] * sn + o.dir[1] * c) / dl, w = W([dx, dy]), w0 = W([0, 0]),
        vx = w[0] - w0[0], vy = w[1] - w0[1], vl = Math.hypot(vx, vy) || 1;
      rest.push([vx / vl * seg, vy / vl * seg]);
    }
    const R0 = W(root);
    let st = s.strands[id], steps = st ? stepsOf(st) : -1;
    if (!st || steps < 0 || st.P.length !== N + 1) {
      const P = [R0];
      for (let i = 0; i < N; i++) P.push([P[i][0] + rest[i][0], P[i][1] + rest[i][1]]);
      st = s.strands[id] = { P, Q: P.map((q) => q.slice()), D: P.map((q) => [q[0] - P[0][0], q[1] - P[0][1]]), fr };
      steps = s.menu ? PHYS_MENU_WARM : 0;   // メニュー画面のキャラは、垂れて落ち着いた形から始める(出た瞬間にゆれて落ちてこないように)
      st.warm = s.menu;
    }
    const nIt = st.warm ? steps : Math.min(steps, 3);
    st.warm = false;
    // 頭の向きが変わって根元が頭のまわりを回ったときは、ひも全体も一緒に運ぶ(引きずられて暴れないように)。o.anchor=頭の中心
    if (o.anchor) {
      const A0 = W(o.anchor), rel = [R0[0] - A0[0], R0[1] - A0[1]];
      if (st.rel && steps > 0) {
        const dvx = rel[0] - st.rel[0], dvy = rel[1] - st.rel[1];
        for (let i = 1; i <= N; i++) {
          const c = 1 - 0.3 * (i / N);
          st.P[i] = [st.P[i][0] + dvx * c, st.P[i][1] + dvy * c];
          st.Q[i] = [st.Q[i][0] + dvx * c, st.Q[i][1] + dvy * c];
        }
      }
      st.rel = rel;
    }
    // 頭に付いた物は、頭が正面・背面を向くと奥行き方向に垂れるので、背中との当たり(画面上の左右)を弱める
    const sm = o.anchor ? Math.max(0, Math.min(1, (headSide - 0.2) / 0.5)) : 1;
    const P = st.P, Q = st.Q, coll = (q, i) => {
      if (mode === 'none' && !o.head && !o.limit) return q;
      let c = mode === 'none' && !o.head ? L(q) : collide(L(q), r, mode, o.head && i >= 2, sm);
      if (o.limit) c = o.limit(c, i);                                // o.limit = 点を動かす関数(描画座標)。服が脚を突き抜けないようにする など
      return W(c);
    };
    // はためきの強さは、根元(体)が空気を切る速さで決める(ひも自身の速さで決めると揺れが自分で大きくなり続けるため)
    const rf = Math.max(0, Math.min(1, o.rootFlex ?? PHYS_ROOT_FLEX)),   // 根元のやわらかさ: 根元の硬さを下げ、根元の節を体の動きに引きずられにくくする
      st0r = st0 * (1 - 0.8 * rf);
    const bend = (o.bend ?? 0.12) * PHYS_TIME,
      maxBend = o.maxBend ?? PHYS_MAX_BEND, maxRoot = o.maxRoot ?? PHYS_MAX_ROOT, reach = (o.reach ?? PHYS_REACH) * (1 + 0.5 * rf), maxV = (o.maxV ?? PHYS_MAX_SPEED) * ks;
    const wind = Math.min(8, st.r0 ? Math.hypot(R0[0] - st.r0[0], R0[1] - st.r0[1]) / Math.max(1, steps) : 0);
    st.r0 = R0;
    for (let k = 0; k < nIt; k++) {
      const rvx = R0[0] - P[0][0], rvy = R0[1] - P[0][1];            // 根元の速さ
      Q[0] = P[0]; P[0] = R0;
      let pvx = rvx, pvy = rvy;
      for (let i = 1; i <= N; i++) {
        // 速さ: 空気抵抗 + 曲げの抵抗(ひとつ根元側の点との速さの差を少し消す。節ごとにばらばらに暴れて折れ曲がるのを防ぐ)
        let vx = (P[i][0] - Q[i][0]) * (1 - damp), vy = (P[i][1] - Q[i][1]) * (1 - damp);
        const bi = i === 1 ? bend * (1 - rf) : bend;                 // 根元の節は体と一緒に動かず、遅れて振れる
        vx -= (vx - pvx) * bi; vy -= (vy - pvy) * bi;
        pvx = vx; pvy = vy;
        Q[i] = P[i];
        let ax = 0, ay = grav;
        if (o.flutter) {                                            // 布のはためき: 速く動くほど大きく、先ほど大きい
          const sx = P[i][0] - P[i - 1][0], sy = P[i][1] - P[i - 1][1], sl = Math.hypot(sx, sy) || 1,
            spd = wind, wav = Math.sin(fr * PHYS_FLUTTER_SPEED + i * 1.9 + (o.seed ?? 0)) * o.flutter * (0.03 + spd * 0.1) * (i / N) * T2;
          ax += -sy / sl * wav; ay += sx / sl * wav;
        }
        let nvx = vx + ax, nvy = vy + ay;
        const sp = Math.hypot(nvx, nvy);                              // 1フレームに動ける距離の上限(急に飛ばないように)
        if (sp > maxV) { nvx *= maxV / sp; nvy *= maxV / sp; }
        P[i] = [P[i][0] + nvx, P[i][1] + nvy];
      }
      const restPos = [R0];                                          // 静止時の形(根元から rest をつないだ位置)
      for (let i = 0; i < N; i++) restPos.push([restPos[i][0] + rest[i][0], restPos[i][1] + rest[i][1]]);
      for (let it = 0; it < 2; it++) {
        for (let i = 1; i <= N; i++) {
          const f = N > 1 ? (i - 1) / (N - 1) : 0, stf = (st1 + (st0r - st1) * (1 - f) * (1 - f) * (1 - f)) * T2,      // 根元ほど硬く、先ほどやわらかい
            stfOld = (st1 + (st0 - st1) * (1 - f) * (1 - f) * (1 - f)) * T2,
            sag = (k2) => { const s2 = 1 - (1 - k2) * (1 - k2); return grav * (1 - s2) / Math.max(1e-3, s2); },   // 重力で垂れる量(硬さ k2 のとき)
            tx = P[i - 1][0] + rest[i - 1][0], ty = P[i - 1][1] + rest[i - 1][1] - (sag(stf) - sag(stfOld));     // 根元をやわらかくした分だけ垂れないよう持ち上げる(止まっている形は以前と同じ)
          let x = P[i][0] + (tx - P[i][0]) * stf, y = P[i][1] + (ty - P[i][1]) * stf;
          let dx = x - P[i - 1][0], dy = y - P[i - 1][1], d = Math.hypot(dx, dy) || 1;
          dx /= d; dy /= d;
          const ux0 = P[i - 1][0] + dx * seg, uy0 = P[i - 1][1] + dy * seg;   // 制限をかける前の位置
          // 曲がりの制限: 根元の節は静止時の向きから maxRoot まで、それ以外はひとつ前の節から maxBend までしか曲がらない(折れ曲がり・ジグザグを防ぐ)
          {
            let px, py;
            if (i === 1) { const rl = Math.hypot(rest[0][0], rest[0][1]) || 1; px = rest[0][0] / rl; py = rest[0][1] / rl; }
            else { px = P[i - 1][0] - P[i - 2][0]; py = P[i - 1][1] - P[i - 2][1]; const pl = Math.hypot(px, py) || 1; px /= pl; py /= pl; }
            const lim = i === 1 ? maxRoot : maxBend, ang = Math.atan2(px * dy - py * dx, px * dx + py * dy);
            if (Math.abs(ang) > lim) {
              const a = Math.sign(ang) * lim, c = Math.cos(a), s = Math.sin(a);
              dx = px * c - py * s; dy = px * s + py * c;
            }
          }
          x = P[i - 1][0] + dx * seg; y = P[i - 1][1] + dy * seg;
          // 距離の制限: 静止時の位置から reach(×根元からの長さ)より遠くへは行かない
          {
            const rx = restPos[i][0], ry = restPos[i][1], ex = x - rx, ey = y - ry, ed = Math.hypot(ex, ey), mx = reach * seg * i;
            if (ed > mx) {
              x = rx + ex / ed * mx; y = ry + ey / ed * mx;
              const fx = x - P[i - 1][0], fy = y - P[i - 1][1], fl = Math.hypot(fx, fy) || 1;
              x = P[i - 1][0] + fx / fl * seg; y = P[i - 1][1] + fy / fl * seg;
            }
          }
          // 制限で動かした分は速さに加えない(はね返って細かく震えないように、境目に沿ってなめらかに止まる)
          if (x !== ux0 || y !== uy0) Q[i] = [Q[i][0] + (x - ux0), Q[i][1] + (y - uy0)];
          let q = coll([x, y], i);
          if (q[1] > ground - 1) q = [q[0], ground - 1];             // 地面より下には行かない
          P[i] = q;
        }
      }
    }
    P[0] = R0;
    if (P.some((q) => !isFinite(q[0]) || !isFinite(q[1]))) { delete s.strands[id]; return [root, root]; }
    // 見た目はなめらかに追いかける(根元からの形を少しずつ計算結果へ近づける)。体にめり込まないよう当たりもかけ直す
    for (let k = 0; k < nIt; k++) st.D = st.D.map((v, i) => [v[0] + (P[i][0] - R0[0] - v[0]) * PHYS_SMOOTH, v[1] + (P[i][1] - R0[1] - v[1]) * PHYS_SMOOTH]);
    const out = [R0];                                               // ならした形でも節の長さは保つ(縮んでくしゃっとならないように)
    for (let i = 1; i <= N; i++) {
      const a = out[i - 1], dx = R0[0] + st.D[i][0] - a[0], dy = R0[1] + st.D[i][1] - a[1], dd = Math.hypot(dx, dy) || 1;
      out.push([a[0] + dx / dd * seg, a[1] + dy / dd * seg]);
    }
    return out.map((w, i) => {
      if (!i) return root;
      let q = L(w);
      if (!(mode === 'none' && !o.head)) q = collide(q, r, mode, o.head && i >= 2, sm);
      return o.limit ? o.limit(q, i) : q;
    });
  };

  // バネで遅れて付いてくるずれ (トゲ髪の先・アホ毛など)。anchor=付け根(描画座標) / o.k=バネの強さ / o.damp / o.max=最大のずれ(px)
  ctx.jiggle = (id, anchor, o = {}) => {
    const A = W(anchor), k = (o.k ?? 0.14) * PHYS_TIME * PHYS_TIME, damp = (o.damp ?? 0.2) * PHYS_TIME, max = (o.max ?? 5) * ks;
    let j = s.jigs[id], steps = j ? stepsOf(j) : -1;
    if (!j || steps < 0) { j = s.jigs[id] = { m: A.slice(), v: [0, 0], d: [0, 0], fr }; steps = 0; }
    for (let i = 0; i < Math.min(steps, 3); i++) {
      j.v = [(j.v[0] + (A[0] - j.m[0]) * k) * (1 - damp), (j.v[1] + (A[1] - j.m[1]) * k) * (1 - damp)];
      j.m = [j.m[0] + j.v[0], j.m[1] + j.v[1]];
      const dx = j.m[0] - A[0], dy = j.m[1] - A[1], d = Math.hypot(dx, dy);
      if (d > max) j.m = [A[0] + dx / d * max, A[1] + dy / d * max];
    }
    for (let i = 0; i < Math.min(steps, 3); i++) j.d = [j.d[0] + (j.m[0] - A[0] - j.d[0]) * PHYS_SMOOTH, j.d[1] + (j.m[1] - A[1] - j.d[1]) * PHYS_SMOOTH];
    return [j.d[0] / M.sx, j.d[1] / M.sy];
  };
}

// ひもの点の列を、根元 w0 → 先 w1 の太さの毛束として描く(輪郭あり)。points は描画座標
function strandShape(g, pts, w0, w1, tip = 'point') {
  const n = pts.length, Lft = [], Rgt = [], wf = typeof w0 === 'function' ? w0 : (f) => w0 + (w1 - w0) * f;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1,
      f = i / (n - 1), w = wf(f) * (tip === 'point' && i === n - 1 ? 0 : 1);
    Lft.push([pts[i][0] - dy / d * w, pts[i][1] + dx / d * w]);
    Rgt.push([pts[i][0] + dy / d * w, pts[i][1] - dx / d * w]);
  }
  const smooth = (arr, first) => {
    if (first) g.moveTo(arr[0][0], arr[0][1]); else g.lineTo(arr[0][0], arr[0][1]);
    for (let i = 1; i < arr.length - 1; i++) g.quadraticCurveTo(arr[i][0], arr[i][1], (arr[i][0] + arr[i + 1][0]) / 2, (arr[i][1] + arr[i + 1][1]) / 2);
    g.lineTo(arr[arr.length - 1][0], arr[arr.length - 1][1]);
  };
  g.beginPath();
  smooth(Lft, true);
  if (tip === 'split' || tip === 'split2') {                          // 毛先が何本かの毛束に分かれてとがる
    const e = pts[n - 1], a = pts[n - 2], ex = e[0] - a[0], ey = e[1] - a[1], ed = Math.hypot(ex, ey) || 1, ux = ex / ed, uy = ey / ed,
      L0 = Lft[n - 1], R0 = Rgt[n - 1], we = wf(1), m = tip === 'split2' ? 2 : 3, lens = [1.5, 2.3, 1.3, 1.9];
    for (let j = 0; j < m; j++) {
      const f0 = (j + 0.55) / m, f1 = (j + 1) / m, tl = we * lens[j % 4],
        T = [L0[0] + (R0[0] - L0[0]) * f0 + ux * tl, L0[1] + (R0[1] - L0[1]) * f0 + uy * tl],
        Nn = [L0[0] + (R0[0] - L0[0]) * f1 - ux * we * 0.25, L0[1] + (R0[1] - L0[1]) * f1 - uy * we * 0.25];
      const S = j ? [L0[0] + (R0[0] - L0[0]) * (j / m) - ux * we * 0.25, L0[1] + (R0[1] - L0[1]) * (j / m) - uy * we * 0.25] : L0;
      g.quadraticCurveTo(S[0] + ux * tl * 0.7, S[1] + uy * tl * 0.7, T[0], T[1]);
      if (j < m - 1) g.quadraticCurveTo(Nn[0] + ux * we * 0.3, Nn[1] + uy * we * 0.3, Nn[0], Nn[1]);
      else g.quadraticCurveTo(R0[0] + ux * tl * 0.4, R0[1] + uy * tl * 0.4, R0[0], R0[1]);
    }
  }
  if (tip === 'round') {
    const e = pts[n - 1], a = pts[n - 2], dx = e[0] - a[0], dy = e[1] - a[1], d = Math.hypot(dx, dy) || 1;
    const we = wf(1);
    g.quadraticCurveTo(e[0] + dx / d * we * 1.3, e[1] + dy / d * we * 1.3, Rgt[n - 1][0], Rgt[n - 1][1]);
  }
  smooth(Rgt.slice().reverse(), false);
  g.closePath();
}

// 点の列をなめらかな線として描く(鉢巻のなびき用)。太さは根元 w0 → 先 w1。outline=true で黒い縁取り
function strandRibbon(ctx, pts, w0, w1, col, outline = false) {
  const { g } = ctx, n = pts.length, mid = (i) => [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2];
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (const [ww, c] of outline && olScale() > 0 ? [[2.3 * olScale(), '#111'], [0, col]] : [[0, col]]) {
    g.strokeStyle = c;
    for (let i = 0; i < n - 1; i++) {                               // 節ごとに太さを変えて、先ほど細くする
      const a = i === 0 ? pts[0] : mid(i - 1), e = i === n - 2 ? pts[n - 1] : mid(i), f = (i + 0.5) / (n - 1);
      g.lineWidth = w0 + (w1 - w0) * f + ww;
      g.beginPath();
      g.moveTo(a[0], a[1]);
      if (i === 0 || i === n - 2) g.lineTo(e[0], e[1]); else g.quadraticCurveTo(pts[i][0], pts[i][1], e[0], e[1]);
      g.stroke();
    }
  }
}
function drawF(p) {
  outlinePart = 'custom';
  const ci = CH.indexOf(p.ch),
    name = p.ch.nm;
  // スキン: 服・髪・小物・色をスキンごとに着替える(drawing_character.js の CHARACTER_SKINS)。大きさ・当たり判定は変わらない
  const charDraw = charDrawOf(name, p.sk),
    Y = skinBodyLook(ci, p.sk),
    main = skinMainColor(ci, p.sk),
    skinBase = skinSkinColor(ci, p.sk),                              // 肌の色(スキンで変わることがある)
    fl = p.st === 'hit' && fr % 4 < 2,
    C = (c) => (fl ? '#fff' : c),
    skin = C(skinBase);

  if (!p.pose) p.pose = tgt(p);                                       // 姿勢はゲームの1Fごとに stepPose で進める(ここでは読むだけ)

  const q = p.pose,
    m = p.mv,
    air = p.y < GY,
    act = p.st === 'atk' && p.t > m.st && p.t <= m.st + m.ac;

  const [legU, legL] = legLengths(Y, charDraw),   // body.thighLength / shinLength(脚が地面にめり込む/浮くのを防ぐ)
    dr = (a, b) => legU * Math.cos(a) + legL * Math.cos(a + b),
    hy = air
      ? (legU + legL) * 0.85
      : Math.max(dr(q[5], q[6]), dr(q[7], q[8]));

  if (p.hy == null) p.hy = hy;                                        // 腰の高さも stepPose で1Fごとに進める(ここでは読むだけ)
  const weight = fighterWeight(p);
  const size = FIGHTER_SIZE,
    scaleX = size * (1 + weight * 0.45),
    scaleY = size * (1 - weight);

  // 影の描画
  g.fillStyle = '#0005';
  g.beginPath();
  g.ellipse(
    p.x,
    GY + 2,
    Math.max(8, 28 * Y.sc * size * (1 - (GY - p.y) / 400)),
    6,
    0,
    0,
    7
  );
  g.fill();

  g.save();
  if (p.st === 'ko' && p.y >= GY - 1) {                                // K.O. で倒れているとき: 地面より下にはみ出した物(髪・武器など)は描かない
    g.beginPath(); g.rect(p.x - 2000, GY - 4000, 4000, 4000 + KO_GROUND_PAD); g.clip();
  }
  g.translate(p.x, p.y);
  g.scale(p.f * Y.sc * scaleX, Y.sc * scaleY);
  g.translate(q[9], 0);

  const hyy = -p.hy,
    ls = Math.sin(q[0]),
    lc = Math.cos(q[0]),
    at = (t) => [Y.tl * t * ls, hyy - Y.tl * t * lc],
    [sx, sy] = at(0.9),
    [nx, ny] = at(1),
    hr = Y.hr,
    hdx = nx + (hr + 2) * ls,
    hdy = ny - (hr + 2) * lc,
    pn = C(Y.pn),
    sl = C(Y.sl ? main : skin),
    f2 = C(Y.f2),
    wv = Math.sin(fr * 0.25) * 3,
    tr = -p.vx * p.f * 2;

  const TS = torsoSpec(charDraw),
    hipF = TS.profile[0][1] / 0.85,
    hipB = hipF * TS.back / 0.82;

  const hw = bodyHalfWidth(Y, charDraw),
    G = bodyDirGeo(Y, charDraw, q),                   // 体の向きで決まる形 (肩・腰の開き / 胴体の幅 / 部位ごとの向き)
    P0 = (t, o = 0) => [Y.tl * t * ls + lc * o, hyy - Y.tl * t * lc + ls * o],
    // 胴体まわりの座標。o(正=前側 / 負=背中側)は「真横のときの厚み」で書き、向きに合わせて幅が伸びる
    // (キャラ専用の torso / waist / shoulder などの描画も、そのまま向きに追従する)
    P = (t, o = 0) => P0(t, o >= 0 ? o * G.fm : o * G.bm),
    K = (c, a) => (fl ? '#fff' : shade(c, a)),
    LG = (x0, y0, x1, y1, ...cs) => {
      if (fl) return '#fff';
      const r = g.createLinearGradient(x0, y0, x1, y1);
      cs.forEach((c, i) => r.addColorStop(i / (cs.length - 1), c));
      return r;
    },
    RG = (x, y, r0, r1, ...cs) => {
      if (fl) return '#fff';
      const r = g.createRadialGradient(x, y, r0, x, y, r1);
      cs.forEach((c, i) => r.addColorStop(i / (cs.length - 1), c));
      return r;
    },
    ol = (w) => {
      const sw = (w || 3) * olScale();                              // 輪郭の太さ(OUTLINE の倍率)
      if (sw <= 0) return;
      g.lineWidth = sw;
      g.lineJoin = 'round';
      g.strokeStyle = '#111';
      g.stroke();
    },
    poly = (a) => {
      g.beginPath();
      a.forEach((v, i) => (i ? g.lineTo(v[0], v[1]) : g.moveTo(v[0], v[1])));
      g.closePath();
    },
    torsoPoly = (grow = 0) => poly(
      TS.profile.map(([t, w]) => P(t, hw * w + grow))
        .concat(TS.profile.map(([t, w]) => P(t, -(hw * w * TS.back + grow))).reverse())
    ),
    line = (a, b, w, c) => {
      g.lineWidth = w;
      g.strokeStyle = c;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(a[0], a[1]);
      g.lineTo(b[0], b[1]);
      g.stroke();
    },
    dot = (x, y, r, c) => {
      g.fillStyle = c;
      g.beginPath();
      g.arc(x, y, r, 0, 7);
      g.fill();
    },
    shN = [sx - lc * hw * G.shN, sy - ls * hw * G.shN],
    shF = [sx + lc * hw * G.shF, sy + ls * hw * G.shF],
    slB = Y.sl ? main : skinBase,
    open = p.st === 'atk' || p.st === 'hit' || p.st === 'break',
    hurt = p.st === 'hit' || p.st === 'break';

  // 背面(負の向き)のときの描き順: 胴が背面なら背中の装飾・マントが胴の手前 / 頭が背面なら後ろ髪が胴の手前
  const tb = q[14] ?? 1, backTorso = tb <= -1.5, hairOver = (q[13] ?? 0) <= -1.5;

  const ctxHelper = {
    g, P, K, LG, RG, ol, poly, line, dot, hw, hyy, at, sx, sy, nx, ny, Rh: hr, hcx: hdx, hcy: hdy,
    wv, tr, fr, fl, C, hurt, Y, main, sl, f2, slB, pn, charDraw, skinColor: skinBase,
    torsoProfile: TS.profile, torsoBack: TS.back, torsoPoly, ls, lc,
    G, bodyDir: q[14], headDir: q[13], partDir: Object.fromEntries(['rUpperArm', 'rForeArm', 'lUpperArm', 'lForeArm', 'rLeg', 'lLeg'].map((n, i) => [n, q[15 + i] ?? tb])), open
  };
  ctxHelper.p = p;                                       // キャラの状態(p.st / p.mv / p.t)。技を出している間だけ描く物(リリスの翼など)に使う
  ctxHelper.backTorso = backTorso;                       // 胴が背面を向いている(back は胴の後で描かれる)
  ctxHelper.hairOver = hairOver;                         // 頭が背面: 後ろ髪は最後(最前面)に描く
  ctxHelper.hv = headView(ctxHelper, q[13] ?? 0);        // 頭の向き(見え方)。hv.turned が false(真横)のときは従来の描画
  // 揺れ物(髪・鉢巻)の物理。ワールド座標との変換と、体(背中・頭)との当たりを渡す
  physSetup(ctxHelper, p, ci,
    { ox: p.x + p.f * Y.sc * scaleX * q[9], oy: p.y, sx: p.f * Y.sc * scaleX, sy: Y.sc * scaleY },
    { H: [0, hyy], u: [ls, -lc], n: [lc, ls], tl: Y.tl, hw, prof: TS.profile, back: TS.back,
      side: Math.abs(Math.cos(dirLerp(HEAD_PHI, Math.min(3, Math.abs(tb))))), hcx: hdx, hcy: hdy, Rh: hr, headSide: ctxHelper.hv.cs });

  // 手。dir=[ux, uy](前腕の向き。指の方へ)を渡すと握りこぶしの形(親指・指の付け根つき)、省略すると丸
  // view = { fore: 前腕の画面上の縮み(0〜1), toward: 前腕が手前を向く度合い(-1〜1) } … こぶしの見え方が変わる
  const hand = (handPoint, radius, color, dir, lines = false, view = null) => {
    const [hx, hy] = handPoint, r = radius;
    if (!dir) {
      g.fillStyle = RG(hx - r * 0.3, hy - r * 0.35, 1, r * 1.4, K(color, 0.4), K(color, 0), K(color, -0.35));
      g.beginPath();
      g.arc(hx, hy, r, 0, 7);
      g.fill();
      ol(2);
      return;
    }
    const fore = view ? Math.max(0.5, Math.min(1, view.fore)) : 1, tw = view ? view.toward : 0,   // 手前・奥を向くとこぶしが縮んで見える
      ux = dir[0], uy = dir[1], nx = -uy, ny = ux,
      side = -1,                                                    // 親指は (uy, -ux) の側 = 腕の角度で +90° の側(下に垂らした腕なら前、前に伸ばした腕なら上)。向きで入れ替わらない
      P = (u, n) => [hx + ux * u * r + nx * n * r * side, hy + uy * u * r + ny * n * r * side],
      fill = () => RG(hx - r * 0.3, hy - r * 0.4, 1, r * 1.5, K(color, 0.35), K(color, 0), K(color, -0.3));
    // こぶし(角の丸い四角): 手首側は少し細く、指の側は丸く
    const pts = [];
    for (let i = 0; i < 24; i++) {
      const th = (i / 24) * Math.PI * 2, c = Math.cos(th), s = Math.sin(th),
        ex = Math.sign(c) * Math.pow(Math.abs(c), 0.62), ey = Math.sign(s) * Math.pow(Math.abs(s), 0.62),
        wid = c < 0 ? 0.78 + 0.1 * (1 + c) : 0.88;                    // 手首側(c<0)はすぼまる
      pts.push(P((0.18 + ex * 0.92) * fore, ey * (wid + 0.12 * Math.abs(tw))));
    }
    g.fillStyle = fill();
    g.beginPath();
    pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    g.closePath();
    g.fill();
    ol(2);
    // 指の付け根の線
    if (tw > 0.35) {                                                 // 手前を向いたこぶし: 指(拳の正面)が見える
      g.strokeStyle = 'rgba(0,0,0,.4)';
      g.lineWidth = 1.3;
      g.lineCap = 'round';
      for (const n of [-0.45, -0.1, 0.25]) {
        const a = P(0.1 * fore, n), b = P(0.75 * fore, n + 0.02);
        g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
      }
    } else if (lines) {
      g.strokeStyle = 'rgba(0,0,0,.28)';
      g.lineWidth = 1.2;
      g.lineCap = 'round';
      for (const n of [-0.3, 0.12]) {
        const a = P(0.55 * fore, n), b = P(1.0 * fore, n);
        g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
      }
    }
    // 親指 (こぶしの上側に重なる。奥を向くとこぶしの陰に隠れる)
    if (tw > -0.5) {
      const tc = P(0.05 * fore, 0.62), ang = Math.atan2(uy, ux);
      g.fillStyle = fill();
      g.beginPath();
      g.ellipse(tc[0], tc[1], r * 0.58 * (0.6 + 0.4 * fore), r * 0.34, ang + side * 0.35, 0, Math.PI * 2);
      g.fill();
      ol(1.8);
    }
  };
  ctxHelper.hand = hand;

  // 頭頂の髪のベース(帽子型)。back(0〜1)=後頭部の髪を首元(うなじ側)まで伸ばす割合。省略時0=従来どおり耳の高さまで
  const cap = (c, a1, d, back = 0) => {
    if (ctxHelper.hv.turned) return capTurned(ctxHelper, c, a1, d, back);
    const bk = Math.max(0, Math.min(1, back));
    g.fillStyle = c;
    g.beginPath();
    if (bk <= 0) {
      g.arc(hdx, hdy, hr + 1.5, Math.PI * 0.98, Math.PI * a1);
      g.quadraticCurveTo(hdx + hr * 0.55, hdy - hr * (0.5 + d), hdx + hr * 0.05, hdy - hr * (0.35 + d));
      g.quadraticCurveTo(hdx - hr * 0.6, hdy - hr * 0.3, hdx - hr - 1.5, hdy + hr * 0.1);
    } else {
      const aS = Math.PI * (0.98 - 0.38 * bk),                       // 後頭部の髪の下端(頭の外周上の角度)
        S = [hdx + (hr + 1.5) * Math.cos(aS), hdy + (hr + 1.5) * Math.sin(aS)];
      g.arc(hdx, hdy, hr + 1.5, aS, Math.PI * a1);
      g.quadraticCurveTo(hdx + hr * 0.55, hdy - hr * (0.5 + d), hdx + hr * 0.05, hdy - hr * (0.35 + d));
      g.quadraticCurveTo(hdx - hr * 0.2, hdy - hr * 0.3, hdx - hr * 0.44, hdy + hr * 0.05);   // 耳の前の縁 (bangs の Lt と同じ点)
      g.quadraticCurveTo(hdx + hr * (-0.69 + 0.19 * bk), hdy + hr * (0.09 + 0.41 * bk), S[0], S[1]);   // 後頭部の髪の内側の縁 (bangs と共通)
      ctxHelper.hairBackUsed = true;                                  // 耳は髪をすべて描いたあとに drawHair が描く
    }
    g.closePath();
    g.fill();
    ol(2.5);
  };

  const spikes = (c, n, a0, a1, L0, L1, sway = true) => {        // sway=false で毛先を揺らさない
    if (ctxHelper.hv.turned) a1 += (-0.03 * Math.PI - a1) * (ctxHelper.hv.ap / (Math.PI / 2));   // 向きが正面に近いほど、前側にも髪が広がる
    g.fillStyle = c;
    const J = sway ? ctxHelper.jiggle('spikes', [hdx, hdy], { k: 0.16, damp: 0.22, max: 6 }) : [0, 0];   // 頭の動きに遅れて毛先がしなる
    for (let i = 0; i < n; i++) {
      const an = a0 + ((a1 - a0) * i) / (n - 1),
            L = (i % 2 ? L0 : L1);
      g.beginPath();
      g.moveTo(hdx + Math.cos(an - 0.26) * hr * 0.9, hdy + Math.sin(an - 0.26) * hr * 0.9);
      g.lineTo(hdx + Math.cos(an) * hr * L + J[0] * (L - 0.6), hdy + Math.sin(an) * hr * L + J[1] * (L - 0.6));
      g.lineTo(hdx + Math.cos(an + 0.26) * hr * 0.9, hdy + Math.sin(an + 0.26) * hr * 0.9);
      g.closePath();
      g.fill();
      ol(2.2);
    }
  };

  const horn = (x, y, s, col) => {                                   // col = 角の色(省略時は白。スキンで変えられる)
    g.fillStyle = LG(x, y, x + 12 * s, y - 24, K(col ? shade(col, -0.25) : '#bbb', 0), K(col || '#fff', 0));
    g.beginPath();
    g.moveTo(x - 5, y);
    g.quadraticCurveTo(x - 8 * s, y - 16, x + 8 * s, y - 26);
    g.quadraticCurveTo(x + 2 * s, y - 12, x + 5, y);
    g.closePath();
    g.fill();
    ol(2);
  };

  ctxHelper.cap = cap;
  ctxHelper.spikes = spikes;
  ctxHelper.horn = horn;

  const arm = (a, b, o, far, wp, h = 0) => drawStandardArm(ctxHelper, a, b, o, far, wp, charDraw.body || {}, 0, h);   // h = 手首の角度(姿勢配列の右手首・左手首)
  // 脚: 描いた脚の位置(付け根・ひざ・足首と太さ)を ctxHelper.legs に覚える。スカートなどが脚を突き抜けないようにするため
  ctxHelper.legs = [];
  const leg = (x, a, b, far) => {
    const e = drawStandardLeg(ctxHelper, x, a, b, far, charDraw.body || {}), L = limbEx.last;
    if (L && L.kind !== 'arm' && L.o) {
      // 見た目と同じ太さ: 形のふくらみ(太もも 1.06 倍・ふくらはぎの後ろへのふくらみ)・手前を向いたときの大きさ(geom)・輪郭の線の太さ を足す
      const GM = L.geom, sU = GM ? Math.max(GM.sU(0), GM.sU(1)) : 1, sL = GM ? Math.max(GM.sL(0), GM.sL(1)) : 1;
      ctxHelper.legs.push({ o: L.o, k: L.k, e: L.e, w1: L.w1, w2: L.w2, sU, sL, path: L.all,   // path: 脚の形(スカートの影を脚の上だけに描く)
        r1: (L.w1 || 12) / 2 * 1.07 * sU + 2.5 * olScale('thigh'),
        r2: (L.w2 || 12) / 2 * 1.14 * sL + 2.5 * olScale('shin') });
    }
    return e;
  };

  // ---- 服: 奥(マントなど・パーカーのフード) ----
  if (!backTorso) { drawTop(ctxHelper, 'hood'); drawClothes(ctxHelper, charDraw.clothes, 'back'); }

  // ---- 奥の腕・奥の脚 ----
  arm(q[3], q[4], shF, true, null, q[22] || 0);
  leg(hw * G.hipF, q[7], q[8], true);

  // ---- 背中側の装飾 ----
  if (charDraw.back && !backTorso) charDraw.back(ctxHelper);

  // ---- 後ろ髪(ロングヘア・ポニーテールなど) ----
  if (!hairOver) drawHair(ctxHelper, charDraw.hair, 'back');

  // ---- 胴体 ----
  // 服(上): body.top のテンプレート。胴体の塗り → 胸側の飾り(背面では背中側)
  drawTop(ctxHelper, 'base');
  drawTop(ctxHelper, backTorso ? 'backside' : 'front');

  // 服: 胴体の上(ローブの上半身)
  drawClothes(ctxHelper, charDraw.clothes, 'body');

  // キャラごとの胴体装飾 (背面では胸側の装飾は見えず、代わりに背中側の装飾・マントが手前に来る)
  if (backTorso) {
    drawTop(ctxHelper, 'hood');
    drawClothes(ctxHelper, charDraw.clothes, 'back');
    if (charDraw.back) charDraw.back(ctxHelper);
  } else if (charDraw.torso) charDraw.torso(ctxHelper);

  // 胴体のセル影: 背中側の約4割(胸の飾り・服の上にも重ねる)
  if (!fl) celFill(() => torsoPoly(), () => {
    const back = TS.profile.map(([t, w]) => P(t, -(hw * w * TS.back) - 6)), inner = TS.profile.map(([t, w]) => P(t, -hw * w * TS.back * 0.22));
    back.unshift(P(TS.profile[0][0] - 0.1, -(hw * 2))); inner.unshift(P(TS.profile[0][0] - 0.1, hw * 0.1));
    back.push(P(1.2, -(hw * 2))); inner.push(P(1.2, hw * 0.1));
    back.forEach((pt, i) => (i ? g.lineTo(pt[0], pt[1]) : g.moveTo(pt[0], pt[1])));
    inner.reverse().forEach((pt) => g.lineTo(pt[0], pt[1]));
    g.closePath();
  });
  if (!fl && CLOTH_FOLDS.on && !charDraw.torsoUsesSkin) celFill(() => torsoPoly(), () => {   // 胴体のシワ: 腰から胸・脇へ流れる
    foldLine(P(0.1, hw * 0.72), P(0.3, hw * 0.52), P(0.5, hw * 0.12), hw * 0.09);
    foldLine(P(0.06, hw * 0.22), P(0.2, -hw * 0.02), P(0.36, -hw * 0.32), hw * 0.06);
    foldLine(P(0.86, -hw * 0.02), P(0.76, -hw * 0.28), P(0.64, -hw * 0.55), hw * 0.06);
  }, true);

  // 腰まわり(ベルト+バックル)。body.belt: false か beltColor: false で外せる / buckleColor: false でバックルだけ外せる
  const bodyD = charDraw.body || {}, hasBelt = bodyD.belt !== false && Y.sh !== false && Y.sh != null;
  if (hasBelt) {
    poly([P(-0.02, hw * 0.88 * hipF), P(0.17, hw * 0.8 * hipF), P(0.17, -hw * 0.7 * hipB), P(-0.02, -hw * 0.75 * hipB)]);
    g.fillStyle = K(Y.sh, 0);
    g.fill();
    ol(2.2);
  }

  if (hasBelt && tb > -1 && bodyD.buckleColor !== false) {
    const b = P(0.08, hw * 0.55 * hipF * (1 - G.sym));   // バックル(正面では中央へ)
    g.fillStyle = C(bodyD.buckleColor || '#fc3');   // バックルの色 (body.buckleColor)
    g.fillRect(b[0] - 4, b[1] - 5, 8, 10);
    g.strokeStyle = '#111';
    g.lineWidth = 1.6;
    g.strokeRect(b[0] - 4, b[1] - 5, 8, 10);
  }

  if (charDraw.waist) charDraw.waist(ctxHelper, P(0.05, -hw * 0.6), tr, wv);

  // ---- 手前の脚 ----
  const fe = leg(-hw * G.hipN, q[5], q[6], false);

  // 服: 脚の上(ローブのすそ・腰布など)
  drawClothes(ctxHelper, charDraw.clothes, 'skirt');

  // ---- 首まわり ----
  line(at(0.95), [hdx, hdy + hr * 0.5], hr * 0.8 + 3 * olScale('neck'), '#111');   // 首(輪郭は OUTLINE.neck)
  line(at(0.95), [hdx, hdy + hr * 0.5], hr * 0.8, charDraw.neckColor ? charDraw.neckColor(ctxHelper) : K(skinBase, -0.12));
  if (!fl && shadeOn()) {                                            // 首: 頭の下に落ちる影
    const n0 = [hdx, hdy + hr * 0.5], n1 = at(0.95), ns = [n0[0] + (n1[0] - n0[0]) * 0.55, n0[1] + (n1[1] - n0[1]) * 0.55];
    g.save(); g.globalCompositeOperation = 'multiply'; line(n0, ns, hr * 0.8, SHADE.skinDeep); g.restore();
  }

  // 服: 首まわり(マフラー・マントの留め具)
  drawClothes(ctxHelper, charDraw.clothes, 'neck');

  // キャラごとの襟元装飾
  if (charDraw.extraCollar) charDraw.extraCollar(ctxHelper, nx, ny, tr, wv);

  // 頭が背面を向いているときの後ろ髪は、最後(腕よりも手前)に描く

// ==========================================================
// 頭
// ==========================================================
outlinePart = 'face';

const Rh = hr,
      hcx = hdx,
      hcy = hdy;

// ゴーレムなど完全特殊な頭
const isCustomHead =
  charDraw.headCustom
    ? withOutlinePart('face', charDraw.headCustom)(ctxHelper)
    : false;

if (!isCustomHead && ctxHelper.hv.turned) {
  drawHeadTurned(ctxHelper);                           // 向きが付いた頭(真横以外)
} else if (!isCustomHead) {

  // --------------------------------------------------------
  // 頭本体
  // --------------------------------------------------------

  // 鼻は頭と同じ塗りのひとつの形(鼻と顔の境目の線を出さない。FACE_ILLUST.noseMerge)
  const noseM = noseSilhouette(ctxHelper);
  fillHeadWithNose(ctxHelper, RG(
    hcx + Rh * 0.3,
    hcy - Rh * 0.35,
    1,
    Rh * 1.4,
    K(skinBase, 0.3),
    C(skinBase),
    K(skinBase, -0.28)
  ), noseM);                                                         // 頭の形(あご付き。HEAD_SHAPE)
  if (!fl) celHead(hcx, hcy, Rh, headPath(ctxHelper));               // あご・後頭部のセル影
  drawJawLine(ctxHelper);                                            // あごの線


  // --------------------------------------------------------
  // 耳
  // --------------------------------------------------------

  const earSX = hcx + Rh * partS(0, hairPartAngle(ctxHelper), -0.28, 0.95);
  if (charDraw.showEars !== false) {

    g.fillStyle = K(
      skinBase,
      -0.1
    );

    g.beginPath();

    g.ellipse(
      earSX,                                             // part で髪(側髪)が回ると耳も一緒に回る
      hcy + Rh * 0.12,
      Rh * 0.16,
      Rh * 0.24,
      0,
      0,
      7
    );

    g.fill();

    withOutlinePart('ear', ol)(1.8);
  }


  if (charDraw.earDetail) {
    withOutlinePart('ear', charDraw.earDetail)(
      { ...ctxHelper, hcx: hcx + (earSX - (hcx - Rh * 0.28)) },
      skinBase
    );
  }


  // --------------------------------------------------------
  // 鼻
  // --------------------------------------------------------

  if (charDraw.nose && charDraw.nose !== 'none' && !noseM) {         // 顔と一体にした鼻は、頭の形といっしょに描いてある

    drawFaceTemplate(
      ctxHelper,
      "nose",
      noseName(charDraw.nose) === 'girl' ? 'small' : charDraw.nose   // 鼻を顔と一体にしないとき、女の子の鼻は小さい鼻の形で代用
    );
  }
  if (!fl) celNose(ctxHelper, charDraw.nose && charDraw.nose !== 'none' && !NOSE_UNDER_LINE[noseName(charDraw.nose)]);   // 鼻の影(鼻先の小さい女の子の鼻は、アニメ顔と同じ小さな影)
  noseUnderLineSide(ctxHelper);                                      // イラストの女の子の鼻: 鼻の下の短い線


  // --------------------------------------------------------
  // 目
  // --------------------------------------------------------

  if (charDraw.eyes) {

    drawFaceTemplate(
      ctxHelper,
      "eyes",
      charDraw.eyes
    );
  }

  // --------------------------------------------------------
  // 眉毛 (brows を書いたキャラだけ。false で無し)
  // --------------------------------------------------------

  if (charDraw.brows) {
    drawBrows(ctxHelper, charDraw.brows);
  }


  // --------------------------------------------------------
  // 口
  // --------------------------------------------------------

  if (charDraw.showMouth !== false) {

    // mouth: "smile" (閉じた口の名前だけ) または
    //   { closed: "smile", open: "oval" | false,        … 閉じているとき / 開いているときのテンプレート
    //     x, y, size, width, height,                    … 位置(省略 0.5)・大きさ
    //     lineWidth, color, openColor }                 … 線の太さ・線の色・開いた口の中の色
    const m = typeof charDraw.mouth === 'string' ? { closed: charDraw.mouth } : (charDraw.mouth || {}),
      mx = hcx + Rh * (m.x ?? 0.5), my = hcy + Rh * (m.y ?? 0.5),
      ms = m.size ?? 1, sw = ms * (m.width ?? 1), sh = ms * (m.height ?? 1),
      M = {
        g, ol, ux: Rh * sw, uy: Rh * sh,
        P: (dx, dy) => [mx + Rh * sw * dx, my + Rh * sh * dy],
        color: m.color || '#7a2a20', inside: m.openColor || '#6a1818'
      },
      closedName = MOUTH_CLOSED[m.closed] ? m.closed : 'smile',
      openName = m.open === false || m.open === 'none' ? null : (MOUTH_OPEN[m.open] ? m.open : 'oval');

    if (open && openName) MOUTH_OPEN[openName]({ ...M, lw: m.lineWidth ?? 1.8 });
    else MOUTH_CLOSED[closedName]({ ...M, lw: m.lineWidth ?? Math.max(1.2, 2 * ms) });
  }


  // 顔の装飾(ひげ・傷・ほお紅など)
  drawFaceDeco(ctxHelper, charDraw.faceDeco);

  // 顔を覆う装飾などは例外として個別処理可能
  if (charDraw.faceMask) drawFaceMask(ctxHelper, charDraw.faceMask);
  else if (charDraw.faceCover) {
    withOutlinePart('faceCover', charDraw.faceCover)(ctxHelper);
  }
}


// 頭の装飾(髪の後ろ側)→ 髪 → 頭の装飾(髪の前側)
drawHeadgear(ctxHelper, charDraw.headgear, 'back');

drawHair(ctxHelper, charDraw.hair, 'front');

if (!hairOver) drawHeadgear(ctxHelper, charDraw.headgear, 'front');   // 背面のときは後ろ髪の上に描くので最後へ回す

// 前髪・装飾などの完全特殊処理
if (charDraw.headFront) {
  charDraw.headFront(ctxHelper);
}

  outlinePart = 'custom';
  // ---- 手前の腕(武器) ----
  // 姿勢配列の11〜13番目 = 武器の位置X/Y(px。Xは前方向・Yは下がプラス)/向き(rad。腕の向きからの差分。プラスで前方向へ傾く)
  // 武器はこぶしを横切るように持ち、攻撃中は当たり判定の方へ向ける(weaponArmPose)。weaponGrip: false で以前の持ち方
  const WP = weaponArmPose(p, q, charDraw, Y, shN, Y.sc * scaleX, Y.sc * scaleY);
  if (WP && p.wpArm) { WP.a = p.wpArm.a; WP.b = p.wpArm.b; WP.grip = p.wpArm.grip; }   // なめらかにした角度(stepPose で1Fごとに進めた物)
  const he = arm(WP ? WP.a : q[1], WP ? WP.b : q[2], shN, false, (e, ux, uy) => {
    if (!charDraw.weapon) return;
    const wa = q[12] || 0;
    if (!WP) {                                                       // 以前の持ち方: 前腕の向き(+ 姿勢の13番目の角度)
      const ca = Math.cos(wa), sa = Math.sin(wa);
      charDraw.weapon(ctxHelper, [e[0] + (q[10] || 0), e[1] + (q[11] || 0)], ux * ca + uy * sa, -ux * sa + uy * ca);
      return;
    }
    const ang = weaponDir(WP, ux, uy) + wa, wx = Math.cos(ang), wy = Math.sin(ang),
      gr = Y.hr2 * 0.25;                                              // 握る位置: こぶしの真ん中(手首より少し指の側)
    charDraw.weapon(ctxHelper, [e[0] + ux * gr + (q[10] || 0), e[1] + uy * gr + (q[11] || 0)], wx, wy);
  }, q[21] || 0);

  // 肩当てなどの追加描画
  if (charDraw.shoulder) {
    charDraw.shoulder(ctxHelper, shN);
  }

  // 手前の腕より上に描く髪(サイドテールなど。耳・腕の上に重ねる)。背面では下の hairOver でまとめて描く
  if (!hairOver) drawHair(ctxHelper, charDraw.hair, 'overArm');

  // 頭が背面を向いているとき: 後ろ髪(ロング・ポニーテール・ツインテールなど)は見ている側に垂れるので最前面
  // (体・腕・武器・頭より手前)に描き、その上に頭の装飾(鉢巻など)を描く
  if (hairOver) {
    drawHair(ctxHelper, charDraw.hair, 'back');
    drawHeadgear(ctxHelper, charDraw.headgear, 'front');
  }

  const ef = act && (m.k === 'd' || m.k === 'af') ? fe : he;
  g.restore();

  if (act) {
    p.tr = (p.tr || [])
      .concat([[p.x + p.f * Y.sc * (q[9] + ef[0]), p.y + Y.sc * ef[1]]])
      .slice(-8);
    // ※ 以前はここで攻撃判定を白い四角で描いていた。判定はトレーニングの「攻撃判定」表示(training.js)で見る
  } else {
    p.tr = [];
  }

  g.lineCap = 'round';
  for (let i = 1; i < p.tr.length; i++) {
    g.strokeStyle = `rgba(255,255,255,${(i / p.tr.length) * 0.8})`;
    g.lineWidth = 2 + i * 2;
    g.beginPath();
    g.moveTo(p.tr[i - 1][0], p.tr[i - 1][1]);
    g.lineTo(p.tr[i][0], p.tr[i][1]);
    g.stroke();
  }

  // ※ 以前はここで投げの掴み判定をオレンジの四角で描いていた。判定はトレーニングの「攻撃判定」表示(training.js)で見る

  if (p.pg > 0) {
    g.strokeStyle = '#7df';
    g.lineWidth = 5;
    g.beginPath();
    g.arc(p.x, p.y - 55, 40 + (24 - p.pg) * 2, 0, 7);
    g.stroke();
  }

  if (p.st === 'break') {
    T('★ ★ ★', p.x, p.y - 150, 20, '#fd0');
  }

  if (p.st === 'shield' || p.st === 'sdown') {
    const on = p.st === 'shield' && p.t > 5;
    g.fillStyle = on
      ? `rgba(110,200,255,${0.2 + (p.sh / 60) * 0.4})`
      : 'rgba(110,200,255,.12)';
    g.beginPath();
    g.arc(p.x, p.y - 55, on ? 50 + p.sh / 6 : 40, 0, 7);
    g.fill();
  }
}

// 部位ごとの輪郭の太さ(OUTLINE)を使うため、描く関数に部位を割り当てる
drawHair = withOutlinePart('hair', drawHair);

// ============================================================
// 髪の陰影 (アニメ塗りの髪: 影・天使の輪のハイライト・毛流れの線)
//   髪を描くあいだ、描いた形を「髪の形のマスク」(別のキャンバス)にも同じように描いておき、
//   影・ハイライト・毛流れは そのマスクの内側だけに重ねる(どの髪型でも、髪からはみ出さない)。
//   影 = 頭の上の髪の、光と反対側(後ろ・下)の三日月 + 垂れた髪の毛束の筋状の影
//   ハイライト = 頭の丸みに沿った、ぎざぎざの「天使の輪」(頭の向きに合わせて回る)
//   毛流れ = 頭頂から毛先へ向かう細い線
//   HAIR_SHADE.on = false で描かない(画質「低」でも描かない)。shadow / light / flow で強さを変えられる
// ============================================================
// (HAIR_SHADE はファイルの先頭「設定」にまとめてある)
const HAIR_TEE = ['save', 'restore', 'beginPath', 'closePath', 'moveTo', 'lineTo', 'quadraticCurveTo', 'bezierCurveTo', 'arc', 'arcTo', 'ellipse', 'rect',
  'clip', 'fill', 'stroke', 'setTransform', 'transform', 'translate', 'scale', 'rotate', 'resetTransform', 'fillRect', 'strokeRect', 'drawImage'];
let HAIR_MASK = null, HAIR_FX = null, HAIR_TEE_MODE = 'add', HAIR_TEE_N = 0;
// 髪のまわりだけの小さなキャンバス(画面の画素で、髪が入る範囲 HB だけ)。全画面で重ねると重いため
let HB = { x: 0, y: 0, w: 1, h: 1 };
function hairCanvas(c) {
  if (typeof document === 'undefined' || !g || !g.canvas) return null;
  if (!c) c = document.createElement('canvas');
  if (c.width < HB.w || c.height < HB.h) { c.width = Math.max(c.width, HB.w); c.height = Math.max(c.height, HB.h); }
  return c;
}
// 頭のまわり(後ろ髪・毛束が垂れる下の方まで)の範囲を、画面の画素で求める
function hairBounds(ctx, T) {
  const { hcx, hcy, Rh } = ctx, pts = [[hcx - Rh * 6, hcy - Rh * 4], [hcx + Rh * 4, hcy - Rh * 4], [hcx - Rh * 6, hcy + Rh * 14], [hcx + Rh * 4, hcy + Rh * 14]]
    .map(([x, y]) => [T.a * x + T.c * y + T.e, T.b * x + T.d * y + T.f]);
  const x0 = Math.max(0, Math.floor(Math.min(...pts.map((p) => p[0])))), y0 = Math.max(0, Math.floor(Math.min(...pts.map((p) => p[1])))),
    x1 = Math.min(g.canvas.width, Math.ceil(Math.max(...pts.map((p) => p[0])))), y1 = Math.min(g.canvas.height, Math.ceil(Math.max(...pts.map((p) => p[1]))));
  return { x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0) };
}
// 髪を描くあいだ、g への描画をマスクにも写す(マスクは HB の範囲だけ。座標は HB の左上を原点にずらす)
function hairTeeBegin(ctx, T0) {
  HB = hairBounds(ctx, T0);
  if (HB.w < 2 || HB.h < 2) return null;
  HAIR_MASK = hairCanvas(HAIR_MASK);
  if (!HAIR_MASK || typeof CanvasRenderingContext2D === 'undefined') return null;
  const m = HAIR_MASK.getContext('2d'), P = CanvasRenderingContext2D.prototype, ox = HB.x, oy = HB.y;
  m.setTransform(1, 0, 0, 1, 0, 0);
  m.globalCompositeOperation = 'source-over';
  m.clearRect(0, 0, HB.w + 2, HB.h + 2);
  m.setTransform(1, 0, 0, 1, -ox, -oy);
  m.transform(T0.a, T0.b, T0.c, T0.d, T0.e, T0.f);
  m.fillStyle = m.strokeStyle = '#fff';
  for (const name of HAIR_TEE) {
    const orig = P[name];
    g[name] = function (...a) {
      if (name === 'setTransform' || name === 'resetTransform') {      // マスクでは HB の分だけずらしてから同じ変換
        m.setTransform(1, 0, 0, 1, -ox, -oy);
        if (name === 'setTransform') { const M = a.length === 1 ? a[0] : { a: a[0], b: a[1], c: a[2], d: a[3], e: a[4], f: a[5] }; if (M) m.transform(M.a, M.b, M.c, M.d, M.e, M.f); }
        return orig.apply(g, a);
      }
      if (name === 'stroke' || name === 'strokeRect') { m.lineWidth = g.lineWidth; m.lineCap = g.lineCap; m.lineJoin = g.lineJoin; }
      if (name === 'fill' || name === 'stroke' || name === 'fillRect' || name === 'strokeRect' || name === 'drawImage') {
        const op = g.globalCompositeOperation;                           // 乗算などの重ね塗りは形を変えないのでマスクには写さない
        if (op === 'source-over' && HAIR_TEE_MODE === 'add') HAIR_TEE_N++;
        if (op === 'source-over' || op === 'destination-out') {
          m.globalAlpha = g.globalAlpha;
          m.globalCompositeOperation = HAIR_TEE_MODE === 'erase' ? 'destination-out' : op;   // erase: 髪の上に描く髪以外の物(耳)はマスクから抜く
          try { orig.apply(m, a); } catch (e) {}
        }
      } else { try { orig.apply(m, a); } catch (e) {} }
      return orig.apply(g, a);
    };
  }
  return m;
}
function hairTeeEnd() { for (const name of HAIR_TEE) delete g[name]; }

// 頭の球の上の点(f=前, r=手前, u=上。半径1) → 画面。vis = こちらを向いている度合い
function hairSphere(ctx, f, r, u) {
  const { hcx, hcy, Rh, hv } = ctx, cs = hv ? hv.cs : 1, sn = hv ? hv.sn : 0;
  return { x: hcx + Rh * (f * cs - r * sn), y: hcy - Rh * u, vis: f * sn + r * cs };
}
// 髪の影の色(乗算)。キャラの髪の項目に shade: '#色' があればそれ。無ければ髪の色から選ぶ:
//   黄色・金・オレンジ系の明るい髪 → 赤みのある影(金髪の影はオレンジ寄りにすると自然) / それ以外 → HAIR_SHADE.shadow(青紫寄り)
function hairShadowColor(ctx) {
  const list = ctx.charDraw && ctx.charDraw.hair, items = Array.isArray(list) ? list : [list];
  for (const it of items) if (it && typeof it === 'object' && it.shade) return it.shade;
  const col = items.map((it) => it && typeof it === 'object' && it.color).find(Boolean);
  if (typeof col === 'string' && col[0] === '#') {
    let h = col.slice(1); if (h.length === 3) h = h.replace(/./g, '$&$&');
    const n = parseInt(h, 16), r = ((n >> 16) & 255) / 255, gg = ((n >> 8) & 255) / 255, b = (n & 255) / 255,
      mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), l = (mx + mn) / 2;
    let hue = 0;
    if (mx > mn) hue = mx === r ? ((gg - b) / (mx - mn) + 6) % 6 * 60 : mx === gg ? ((b - r) / (mx - mn) + 2) * 60 : ((r - gg) / (mx - mn) + 4) * 60;
    if (mx - mn > 0.2 && l > 0.45 && hue >= 20 && hue <= 95) return HAIR_SHADE.warm;
  }
  return HAIR_SHADE.shadow;
}
function hairShadeApply(ctx, T0) {
  HAIR_FX = hairCanvas(HAIR_FX);
  if (!HAIR_FX) return;
  const e = HAIR_FX.getContext('2d'), { hcx, hcy, Rh, hv } = ctx, u1 = Rh / 13, W2 = HB.w, H2 = HB.h;
  const begin = () => {
    e.setTransform(1, 0, 0, 1, 0, 0); e.globalCompositeOperation = 'source-over'; e.globalAlpha = 1; e.clearRect(0, 0, W2 + 2, H2 + 2);
    e.setTransform(1, 0, 0, 1, -HB.x, -HB.y); e.transform(T0.a, T0.b, T0.c, T0.d, T0.e, T0.f);
  };
  const finish = (op, alpha = 1) => {
    e.setTransform(1, 0, 0, 1, 0, 0);
    e.globalCompositeOperation = 'destination-in';                    // 髪の形の内側だけ残す
    e.drawImage(HAIR_MASK, 0, 0, W2, H2, 0, 0, W2, H2);
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = op;
    g.globalAlpha = alpha;
    g.drawImage(HAIR_FX, 0, 0, W2, H2, HB.x, HB.y, W2, H2);
    g.restore();
  };
  // ---- 影(乗算) ----
  begin();
  e.fillStyle = hairShadowColor(ctx);
  e.save();                                                           // 頭の上の髪: 光(前・上)と反対側の三日月
  e.beginPath(); e.arc(hcx, hcy, Rh + 3, 0, Math.PI * 2); e.clip();
  e.beginPath();
  e.rect(hcx - Rh * 3, hcy - Rh * 3, Rh * 6, Rh * 6);
  e.arc(hcx + Rh * 0.3, hcy - Rh * 0.42, Rh * 1.12, 0, Math.PI * 2, true);
  e.fill();
  e.restore();
  e.save();                                                           // 頭より下の髪(後ろ髪・毛束): 頭の真下に落ちる影 + 毛束の筋
  e.beginPath(); e.rect(hcx - Rh * 6, hcy - Rh * 3, Rh * 12, Rh * 30); e.arc(hcx, hcy, Rh + 2.5, 0, Math.PI * 2, true); e.clip();
  e.beginPath(); e.ellipse(hcx - Rh * 0.2, hcy + Rh * 0.95, Rh * 1.35, Rh * 0.55, 0, 0, Math.PI * 2); e.fill();
  e.globalAlpha = 0.7;
  for (let i = -5; i <= 5; i++) {
    const x0 = hcx + i * Rh * 0.55 + (i % 2) * Rh * 0.12, w = Rh * (0.06 + 0.04 * ((i + 6) % 3)), y0 = hcy + Rh * 1.1, y1 = hcy + Rh * (6 + 2 * ((i + 6) % 3));
    e.beginPath();
    e.moveTo(x0 - w, y0);
    e.quadraticCurveTo(x0 - w * 0.6, (y0 + y1) / 2, x0 + w * 0.2, y1);
    e.quadraticCurveTo(x0 + w * 0.5, (y0 + y1) / 2, x0 + w, y0);
    e.closePath();
    e.fill();
  }
  e.globalAlpha = 1;
  e.restore();
  // ---- 毛流れ(乗算の細い線): 毛並みに沿って、両端の細い線をたくさん。影と同じ1回の重ね塗りで描く(軽くするため) ----
  const FL = hairFlowLines(ctx);
  if (HAIR_SHADE.flow > 0) {
    e.fillStyle = `rgba(70,45,100,${Math.min(1, HAIR_SHADE.flow * 1.8)})`;
    for (const L of FL) hairStroke(e, L.pts, 0, 1, (L.thin ? 0.4 : 0.6) * u1);
  }
  finish('multiply');
  // ---- ハイライト: 天使の輪のあたりで、毛並みに沿った細い光の筋(サラサラ感) ----
  if (HAIR_SHADE.light > 0) {
    begin();
    e.fillStyle = '#fff';
    const U = HAIR_SHADE.ring;
    FL.forEach((L, j) => {                                            // 毛流れの線のうち、天使の輪の高さを通る所だけを光らせる
      const lo = U - 0.13 - 0.04 * (j % 3), hi = U + 0.12 + 0.05 * ((j + 1) % 2);
      hairStroke(e, L.pts, 0, 1, (0.95 + 0.35 * (j % 2)) * u1, (p) => p.u > lo && p.u < hi && p.vis > 0.15 && p.s > 0.22);   // 分け目・つむじのすぐ近くは光らせない
      if (j % 3 === 0) hairStroke(e, L.pts, 0, 1, 0.6 * u1, (p) => p.u > hi - 0.02 && p.u < hi + 0.22 && p.vis > 0.2 && p.s > 0.3);   // 輪の上へ伸びる細い筋
    });
    e.globalAlpha = 1;
    finish('source-over', 0.55 * HAIR_SHADE.light);
  }
}

// 毛並みの流れの線(頭の球の上の線の集まり)。
//   センター分けの前髪のキャラは、分け目(額の上)から左右・後ろへ流れる(顔の正面へは流れない = 分け目で割れる)。
//   それ以外は頭頂(つむじ)から四方へ流れる。線ごとに長さ・始まる位置・流れの曲がりを少しずつ変える
function hairFlowLines(ctx) {
  const list = ctx.charDraw && ctx.charDraw.hair, items = Array.isArray(list) ? list : [list],
    center = items.some((it) => it && typeof it === 'object' && it.type === 'bangs' && (it.style || 'center') === 'center');
  const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; },
    O = norm(center ? [0.5, 0, 0.86] : [-0.12, 0, 1]),
    dotF = O[0], Ft = norm([1 - dotF * O[0], -dotF * O[1], -dotF * O[2]]),            // 分け目での「前」の向き(球に沿う)
    St = [O[1] * Ft[2] - O[2] * Ft[1], O[2] * Ft[0] - O[0] * Ft[2], O[0] * Ft[1] - O[1] * Ft[0]];   // 横の向き
  const out = [], n = HAIR_SHADE.lines, gap = center ? 0.7 : 0;      // 分け目の前は gap(rad)だけ空ける
  for (let j = 0; j < n; j++) {
    const th = gap + (Math.PI * 2 - 2 * gap) * (j + 0.5 + 0.3 * Math.sin(j * 2.3)) / n,
      t0 = (center ? 0.2 : 0.06) + 0.16 * ((j * 7) % 5) / 4, t1 = 1.0 + 0.55 * ((j * 3) % 4) / 3, curl = 0.12 * Math.sin(j * 1.7), pts = [];   // t0: センター分けは分け目のすぐ近くに線を集めない
    for (let k = 0; k <= 16; k++) {
      const t = t0 + (t1 - t0) * k / 16, a = th + curl * t, D = [Ft[0] * Math.cos(a) + St[0] * Math.sin(a), Ft[1] * Math.cos(a) + St[1] * Math.sin(a), Ft[2] * Math.cos(a) + St[2] * Math.sin(a)],
        P = [O[0] * Math.cos(t) + D[0] * Math.sin(t), O[1] * Math.cos(t) + D[1] * Math.sin(t), O[2] * Math.cos(t) + D[2] * Math.sin(t)],
        S = hairSphere(ctx, P[0] * 1.01, P[1] * 1.01, P[2] * 1.01);
      pts.push({ x: S.x, y: S.y, vis: S.vis, u: P[2], s: k / 16 });
    }
    out.push({ pts, thin: j % 2 === 1 });
  }
  return out;
}
// 点の列を、両端の細い筆の線(太さ w)にして塗る。ok(点) が false の所と、こちらを向いていない所は描かない
function hairStroke(e, pts, s0, s1, w, ok = null) {
  let run = [];
  const flush = () => {
    if (run.length >= 2) {
      const L = [], R = [], a0 = run[0].s, a1 = run[run.length - 1].s;
      for (let i = 0; i < run.length; i++) {
        const p = run[i], q = run[Math.min(run.length - 1, i + 1)], o = run[Math.max(0, i - 1)], dx = q.x - o.x, dy = q.y - o.y, d = Math.hypot(dx, dy) || 1,
          f = (p.s - a0) / ((a1 - a0) || 1), ww = w * Math.sin(Math.PI * Math.max(0.02, Math.min(0.98, f)));
        L.push([p.x - dy / d * ww, p.y + dx / d * ww]); R.push([p.x + dy / d * ww, p.y - dx / d * ww]);
      }
      e.beginPath();
      e.moveTo(L[0][0], L[0][1]);
      for (let i = 1; i < L.length; i++) e.lineTo(L[i][0], L[i][1]);
      for (let i = R.length - 1; i >= 0; i--) e.lineTo(R[i][0], R[i][1]);
      e.closePath();
      e.fill();
    }
    run = [];
  };
  for (const p of pts) {
    if (p.s >= s0 && p.s <= s1 && p.vis > 0.05 && (!ok || ok(p))) run.push(p); else flush();
  }
  flush();
}
{
  const baseEar = hairEar;                                            // 髪のあとに描き直す耳は、髪の陰影を付けない
  hairEar = function (ctx) { const pm = HAIR_TEE_MODE; HAIR_TEE_MODE = 'erase'; try { return baseEar(ctx); } finally { HAIR_TEE_MODE = pm; } };
  const baseHair = drawHair;
  drawHair = function (ctx, list, layer) {
    const q = typeof save !== 'undefined' && save.cfg && save.cfg.quality, low = q === 'low' || (q === 'mid' && !HAIR_SHADE.mid);   // 画質「中」以下では描かない(重いため)
    if (!HAIR_SHADE.on || low || ctx.fl || !list || (Array.isArray(list) && !list.length)) return baseHair(ctx, list, layer);
    const T0 = g.getTransform(), m = hairTeeBegin(ctx, T0);
    if (!m) return baseHair(ctx, list, layer);
    HAIR_TEE_N = 0;
    try { baseHair(ctx, list, layer); } finally { hairTeeEnd(); }
    if (HAIR_TEE_N > 0) hairShadeApply(ctx, T0);                      // 何も描かなかった(この髪型に後ろ髪が無い)ときは重ねない
  };
}
hairEar = withOutlinePart('ear', hairEar);
drawHeadgear = withOutlinePart('headgear', drawHeadgear);
drawFaceDeco = withOutlinePart('faceDeco', drawFaceDeco);
drawFaceDecoTurned = withOutlinePart('faceDeco', drawFaceDecoTurned);
drawClothes = withOutlinePart('clothes', drawClothes);
drawTop = withOutlinePart('torso', drawTop);
drawStandardArm = withOutlinePart('upperArm', drawStandardArm);
drawStandardLeg = withOutlinePart('thigh', drawStandardLeg);
{
  const dft = drawFaceTemplate;                                      // 髪 / 鼻 / 目 はそれぞれの太さ
  drawFaceTemplate = function (ctx, type, name) {
    const part = type === 'hair' ? 'hair' : type === 'nose' ? 'nose' : type === 'eyes' ? 'eyes' : outlinePart;
    return withOutlinePart(part, dft)(ctx, type, name);
  };
}