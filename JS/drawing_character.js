// ============================================================
// drawing_character.js … キャラ描画設定
//   CHARACTER_DRAWS (キャラごとの見た目の設定) だけを置くファイル。
//   部品の描き方は drawing_template.js、実際の描画(drawF など)は drawing.js にある。
// ============================================================

// ============================================================
// CHARACTER_DRAWS の項目一覧 (すべて省略可。省略時は標準の見た目)
//
//   body: {                     // 体のことは全部ここ (character.js の look には color / skin だけ残る)。詳しくは setting.js の「body」
//     scale, headRadius, handRadius, torsoLength, torsoWidth, thighLength, shinLength, legWidth,   // 大きさ(px)
//     thighWidth, shinWidth,    // 太もも・すねの太さ(px)。省略時は legWidth
//     upperArm: { length, width, color, sleeve, wrap, band },   // 上腕の長さ・太さ(px)と見た目 (ARM_TEMPLATES 参照)
//     lowerArm: { length, width, color, sleeve, wrap, band },   // 前腕の長さ・太さ(px)と見た目
//     pantsColor, beltColor, buckleColor, sleeves, foreArmColor, handColor, shoesColor,   // 色
//     belt: false,              // ベルトを外す(buckleColor: false でバックルだけ外す)
//     top: "plain",            // 服(上): plain / none / tshirt / tank / shirt / jacket / hoodie / gi / vest / armor
//     bottom: "pants",         // ズボン(下): pants / shorts / jeans / cargo / wide / baggy / greaves  (setting.js の「服(上)・ズボン(下)」)
//     torsoType: "standard",    // 胴体の形: standard / slim / broad / barrel / hourglass / blocky (太さは torsoWidth)
//     torsoProfile, torsoBack,  // 独自の胴体の形(TORSO_TEMPLATES と同じ書式)
//     armType: "standard",      // 腕テンプレート: standard / slender / muscular / brawler / longArms / shortArms /
//                               //   gauntlet / bracer / longSleeve / shortSleeve / mageSleeve / puffSleeve / bandaged
//     elbowGuard: false,        // 肘当て: true / { color, r, spike }
//     armBand, hand, handOutline, shoeLegCover, legPatch, armDecoration,
//     limbShape: "human",      // 腕・脚の形: human(人の形) / block(まっすぐ。ゴーレムなど)
//   }
//   hair: "raiki",              // 髪 (raiki / shino / blade / berserk)。無しは null
//                               //   { type: 'long' | 'ponytail' | 'twinTails' | 'sideTail' | 'bun' | 'bangs' | 'jaggedBangs' | 'sideburns' | 'ahoge', ... }
//                               //   や、それらの配列 [ { type: 'long' }, { type: 'bangs' } ] も書ける
//   headgear: [ ... ],          // 頭の装飾: headband / horn / halo / witchHat / crown / goggles / ribbon / headdress
//   faceDeco: [ ... ],          // 顔の装飾: beard / scar / line / blush / star / dot
//   clothes:  [ ... ],          // 服: robe / cape / skirt / loincloth / scarf
//   nose, eyes, showEars, showMouth, torsoUsesSkin   // nose: none / normal / small / long / round / girl(イラストの女の子: 小さな鼻先)
//   headShape: 'heroine'        // 顔の形のテンプレート: standard / shonen / heroine / elegant / cool / wild / square / round /
//                               //   animeGirl(アニメの女の子) / illustGirl(イラストの女の子)  (drawing.js の FACE_TEMPLATES)
//              { type: 'heroine', jaw, chin, chinW, cheek } で一部だけ変える / { jaw, chin, chinW, cheek, chinPos, jawLine } で直接 / false で丸い頭
//   faceMask: { color, nose, side, end, endY }   // 口元の布(立体。どの向きでも1枚の布に見える)
//   moveDust: { color, color2, rate, size, life, from, to, behind, when }   // 移動中に体から舞い散る、きらきら光る粉(effect.js)。リリスは羽が生えている間だけ
//   eyes: "normal" のほか、{ type: "normal", x, y, size, width, height } で位置と大きさを変えられる
//   mouth: "smile" または { closed, open, x, y, size, width, height, lineWidth, color, openColor }
//     … 口のテンプレート(閉じた/開いた)・位置・大きさ・線の太さ (open: false で開かない / showMouth: false で口なし)
//        closed: smile / flat / frown / smirk / wavy / cat / small / o / none
//        open:   oval / round / shout / wide / laugh / fang / grin
//   weaponGrip: { angle: 85, aim: true }   // 武器の持ち方(weapon があるキャラ)。angle=こぶしを横切る角度(前腕から親指の側へ。度)
//                               //   aim=攻撃の持続の間、武器を当たり判定の方へ向け、腕の角度を合わせる。weaponGrip: false で以前の持ち方(前腕の延長)
//   torso / back / waist / shoulder / weapon / extraCollar / faceCover / earDetail / headCustom / headFront
//     … 従来どおりキャラ専用の自由描画 (上の項目で足りないときはここに書く)
//
//   揺れ物(物理で動く物): 鉢巻の tails / リボン / マフラー(scarf) / マント・スカート・ローブ・腰布のすそ / 髪の long・ponytail・twinTails・側髪 / トゲ髪の先 / アホ毛
//     … 服は physics: false で揺れなし。stiff / flutter / weight などで揺れ方を変えられる(setting.js の「服の揺れ(物理)」)
//     … キャラの動き(走る・跳ぶ・攻撃・振り向き)に遅れてなびき、背中・頭に当たると止まる(体と重ならない)。
//        headband は tailLength(長さの倍率) / flutter(はためき, 0で無し) も書ける。重さ・硬さは drawing.js の「揺れ物の物理」。
//     キャラ専用の描画(torso / waist / extraCollar など)で揺れ物を作るときは
//        const pts = ctx.strand('名前', 根元[x, y], { len: 長さ, dir: [静止時の向きx, y], collide: 'back' });
//        strandRibbon(ctx, pts, 根元の太さ, 先の太さ, 色, 縁取り)   … 例: シノの extraCollar(首巻き) / waist(帯)
//
//   例) clothes: [{ type: 'cape', color: '#a22', trim: '#fc3', clasp: '#6df' },
//                 { type: 'robe', color: '#445', trim: '#fc3', length: 0.7 }]
//       headgear: [{ type: 'headband', color: '#e33', color2: '#c22', y: -0.55, tails: 2 }]
// ============================================================
// ============================================================
// 輪郭線の太さ (全キャラ共通)  … 数値(px)で書く。0 で線なし
//   各部位の「いちばん外側の輪郭」の太さ。部位の中の細かい線(指・装飾の縁など)は同じ割合で太く/細くなる
//   いまの数値が、以前の見た目と同じ太さ
// ============================================================
const OUTLINE = {
  // ---- 頭 ----
  face: 1,         // 顔(頭の丸)の輪郭
  ear: 1,        // 耳
  eyes: 1,       // 目
  nose: 1,       // 鼻
  hair: 1,       // 髪(頭の髪・前髪・後ろ髪・毛束・トゲ髪・もみあげ)
  headgear: 1,     // 頭の装飾(鉢巻・角・帽子・王冠・ゴーグル・リボンなど)
  faceDeco: 2.2,   // 顔の装飾(ひげ・星など)
  faceCover: 2,    // 口元の布など(faceCover)

  // ---- 体 ----
  neck: 1.5,       // 首
  torso: 2,        // 胴体(服(上)の形・胸当てなど)
  clothes: 2.5,    // 服(マント・ローブ・スカート・腰布・マフラー)
  custom: 2.5,     // キャラ専用の描画(torso / back / waist / shoulder / extraCollar / headFront など)

  // ---- 腕 ----
  upperArm: 2.5,   // 上腕(袖・包帯・腕甲も)
  foreArm: 2.5,    // 前腕(袖・包帯・腕甲・腕輪・肘当ても)
  hand: 2,         // 手

  // ---- 脚 ----
  thigh: 2.5,      // 太もも(半ズボンのすそ・ポケットも)
  shin: 2.5,       // すね(すね当て・ブーツ・すその折り返しも)
  shoe: 2,         // 靴

  weapon: 2        // 武器
};

// スキンの色(CHARACTER_SKINS の palette)。書いていなければ d(元の色)
function PAL(ctx, k, d) {
  const p = ctx && ctx.charDraw && ctx.charDraw.palette;
  return p && k in p ? p[k] : d;                                     // null / false を書くと「無し」
}

// 毛皮の襟(首まわりのふさふさ)。バーサク・ガルドのバイキングのスキンで使う
function furCollar(ctx, col) {
  for (let i = 0; i < 4; i++) {
    const c = ctx.at(0.88);
    ctx.g.fillStyle = ctx.K(col, i % 2 ? 0 : -0.15);
    ctx.g.beginPath();
    ctx.g.arc(c[0] - 14 + i * 7, c[1] - 1 + (i % 2) * 3, 7, 0, 7);
    ctx.g.fill();
    ctx.ol(1.5);
  }
}

// アサカの光の花びらの羽を1枚描く(花びら4枚を扇に広げた形)。root=付け根 / k=大きさ / side=-1 後ろへ・1 前へ / far=奥の羽(少し暗く小さく)
//   fs=横の縮み(drawLilithWing と同じ) / col, col2 = 花びらの先・根元の色(スキンの palette の wing / wing2)
//   羽の座標(付け根から +x が外、+y が下)で花びらを作り、体の傾きに合わせて画面へ写す
function drawSunWing(ctx, root, k, side, far, fs, col, col2) {
  const { g } = ctx;
  if (k <= 0) return;
  const lean = Math.atan2(ctx.ls || 0, ctx.lc ?? 1), lc2 = Math.cos(lean), ls2 = Math.sin(lean),
    sway = Math.sin((typeof fr !== 'undefined' ? fr : 0) * 0.07 + (far ? 0.8 : 0)),               // ゆっくり揺れる
    sx = side * k * fs * (0.9 + 0.1 * sway), sy = k,
    M = (x, y) => { const rx = x * sx, ry = y * sy; return [root[0] + rx * lc2 - ry * ls2, root[1] + rx * ls2 + ry * lc2]; };
  const [r1, g1, b1] = hexRGB(col), [r2, g2, b2] = hexRGB(col2), a0 = far ? 0.55 : 0.8;
  // 花びら: [外への角度(rad。0=真横、マイナスが上), 長さ, 幅]
  const PET = [[0.35, 20, 6], [-0.2, 32, 9], [-0.75, 40, 11], [-1.25, 31, 9]];
  g.save();
  for (const [ang0, L, W] of PET) {
    const ang = ang0 - 0.05 * sway, cx = Math.cos(ang), cy = Math.sin(ang), nx = -cy, ny = cx,
      Q = (t, s) => M(cx * L * t + nx * W * s, cy * L * t + ny * W * s),
      tip = Q(1, 0), base = Q(0, 0);
    const path = () => {
      g.beginPath();
      g.moveTo(...base);
      g.bezierCurveTo(...Q(0.25, -0.9), ...Q(0.75, -1.05), ...Q(1, -0.18));
      g.lineTo(...Q(0.9, 0));                                                                  // 先の小さなくぼみ
      g.lineTo(...Q(1, 0.18));
      g.bezierCurveTo(...Q(0.75, 1.05), ...Q(0.25, 0.9), ...base);
    };
    const gr = g.createLinearGradient(base[0], base[1], tip[0], tip[1]);
    gr.addColorStop(0, `rgba(${r2},${g2},${b2},${a0})`);
    gr.addColorStop(1, `rgba(${r1},${g1},${b1},${a0 * 0.6})`);
    path();
    g.fillStyle = gr;
    g.fill();
    g.lineWidth = 1.3 * olScale('weapon');
    g.globalAlpha = far ? 0.55 : 0.9;
    g.strokeStyle = ctx.K(col, -0.35);                                                          // 縁は花びらの色を濃くした色
    g.stroke();
    g.globalCompositeOperation = 'lighter';                                                     // 光る芯(花びらの真ん中の筋)
    g.globalAlpha = far ? 0.25 : 0.45;
    g.strokeStyle = '#fff';
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(...Q(0.1, 0));
    g.lineTo(...Q(0.8, 0));
    g.stroke();
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  }
  // 付け根の光
  const rg = g.createRadialGradient(root[0], root[1], 0, root[0], root[1], 12 * k);
  rg.addColorStop(0, `rgba(255,255,255,${far ? 0.3 : 0.6})`);
  rg.addColorStop(1, `rgba(${r1},${g1},${b1},0)`);
  g.globalCompositeOperation = 'lighter';
  g.fillStyle = rg;
  g.beginPath();
  g.arc(root[0], root[1], 12 * k, 0, 7);
  g.fill();
  g.restore();
}

// リリスの蝶の羽を1枚描く(上の大きな羽 + 下の小さな羽)。root=付け根 / k=大きさ(0〜1) / open=開き具合(0〜1。はばたき)
//   side=-1 後ろへ広がる・1 前へ広がる / far=奥の羽(暗く) / fs=横の縮み(横向きの体では奥行き方向へ広がるので、画面の横幅が縮む)
//   羽の形は「羽の座標」(付け根から +x が外、+y が下)で作ってから画面へ写す(写し方は形を変えない一次変換なので、曲線もそのまま写せる)
function drawLilithWing(ctx, root, k, open, side, far, fs = 1) {
  const { g, K, C } = ctx;
  if (k <= 0) return;
  // 体の傾き: 胴の向き(腰→首)が真上からどれだけ傾いているか。羽を付け根のまわりで同じだけ回す
  const lean = Math.atan2(ctx.ls || 0, ctx.lc ?? 1), lc2 = Math.cos(lean), ls2 = Math.sin(lean);
  const lift = -0.3 * (1 - fs), cs = Math.cos(lift), sn = Math.sin(lift),
    size = 1,                                                       // 羽全体の大きさ(羽の座標で縦 約110 → 画面で約70px)
    sx = side * k * size * fs * (0.55 + 0.45 * open), sy = k * size,  // 開くほど横に広がる(蝶のはばたき)
    M = (x, y) => {
      const rx = (x * cs - y * sn) * sx, ry = (x * sn + y * cs) * sy;   // 羽の座標 → 画面(横の縮み・はばたき)
      return [root[0] + rx * lc2 - ry * ls2, root[1] + rx * ls2 + ry * lc2]; // 体の傾きの分だけ回す
    },
    path = (pts) => {                                                  // [始点, [c1, c2, 終点], ...] のベジェ曲線
      g.beginPath();
      const p0 = M(...pts[0]);
      g.moveTo(p0[0], p0[1]);
      for (let i = 1; i < pts.length; i++) {
        const [c1, c2, e] = pts[i], A = M(...c1), B = M(...c2), E = M(...e);
        g.bezierCurveTo(A[0], A[1], B[0], B[1], E[0], E[1]);
      }
      g.closePath();
    };
  const dk = far ? -0.3 : 0,
    base = K('#1a0d26', dk), mid = K('#3a1450', dk), trim = far ? K('#8a2a6a', -0.2) : C('#c03a8a'), spot = far ? K('#c04080', -0.2) : C('#ff4fa0');
  const fill = (x0, y0, x1, y1) => { const a = M(x0, y0), b = M(x1, y1); g.fillStyle = ctx.LG(a[0], a[1], b[0], b[1], base, mid); };
  // ---- 下の羽(後ろの小さな羽。しっぽ付き) ----
  const HIND = [[2, 4], [[18, 4], [38, 12], [40, 26]], [[42, 36], [34, 44], [30, 48]], [[30, 56], [24, 60], [22, 52]], [[16, 44], [6, 26], [2, 4]]];
  path(HIND);
  fill(0, 0, 40, 50);
  g.fill();
  ctx.ol(1.8);
  // 下の羽の縁取りと目玉模様
  g.save();
  path(HIND);
  g.clip();
  g.beginPath();
  { const a = M(40, 26), b = M(36, 40), c = M(30, 48); g.moveTo(a[0], a[1]); g.quadraticCurveTo(b[0], b[1], c[0], c[1]); }
  g.lineWidth = 3 * k * size;
  g.strokeStyle = trim;
  g.stroke();
  g.restore();
  { const c = M(26, 30), z = k * size; ctx.dot(c[0], c[1], 4.2 * z, trim); ctx.dot(c[0], c[1], 2.2 * z, spot); }
  // ---- 上の羽(前の大きな羽) ----
  const FORE = [[0, 0], [[4, -22], [20, -44], [42, -50]], [[56, -52], [62, -40], [56, -28]], [[50, -14], [30, -4], [0, 2]]];
  path(FORE);
  fill(0, 0, 56, -50);
  g.fill();
  ctx.ol(2);
  g.save();
  path(FORE);
  g.clip();
  // 翅脈(付け根から外へ広がる細い線)
  g.lineWidth = 1.1;
  g.strokeStyle = far ? 'rgba(160,80,170,.35)' : 'rgba(210,110,200,.5)';
  for (const [x, y] of [[44, -46], [54, -36], [50, -22], [34, -10]]) {
    const a = M(2, -1), m = M(x * 0.55, y * 0.6), e = M(x, y);
    g.beginPath();
    g.moveTo(a[0], a[1]);
    g.quadraticCurveTo(m[0], m[1], e[0], e[1]);
    g.stroke();
  }
  // 外側の縁取り(紫の帯)と、縁の白い点
  g.beginPath();
  { const a = M(30, -48), b = M(62, -50), c = M(58, -28), d = M(46, -12); g.moveTo(a[0], a[1]); g.bezierCurveTo(b[0], b[1], c[0], c[1], d[0], d[1]); }
  g.lineWidth = 4 * k * size;
  g.strokeStyle = trim;
  g.stroke();
  g.restore();
  for (const [x, y] of [[40, -47], [52, -44], [57, -34], [53, -22]]) { const c = M(x, y); ctx.dot(c[0], c[1], 1.1 * k * size + 0.3, far ? 'rgba(255,220,240,.5)' : '#ffe0f0'); }
  // 目玉模様
  { const c = M(36, -30), z = k * size; ctx.dot(c[0], c[1], 6 * z, trim); ctx.dot(c[0], c[1], 3.6 * z, base); ctx.dot(c[0], c[1], 2 * z, spot); }
}

// 首にかけたヘッドホン(仮)。体の向き(姿勢配列の body = ctx.bodyDir)に合わせて立体的に回す
//   体の座標: a = 前(+)・後ろ(-) / l = 右(手前, +)・左(奥, -) / y = 下(+)。首の付け根(nx, ny)が原点
//   layer: 'back' = うなじ側のバンド(首・胴の奥。back で描く) / 'front' = 首の前側のバンドと左右のイヤーカップ
//          (shoulder で描く = 手前の腕より後。肩の上に乗っているので、たれた腕に隠れない)
//   o: { color, accent, cupX(カップの前後の位置), cupL(首からの横の距離), cupY(高さ), radius(首まわりの輪の大きさ) }
function drawNeckHeadphones(ctx, layer, o = {}) {
  const { g, nx, ny } = ctx, lc = ctx.lc ?? 1, ls = ctx.ls ?? 0;
  if (layer === 'back' && ctx.backTorso) return;                       // 背面: うなじ側は手前に来るので front でまとめて描く
  const tb = ctx.bodyDir ?? 1, ab = Math.min(3, Math.abs(tb)), sb = tb < 0 ? -1 : 1,
    th = Math.max(0, Math.min(1, (ab - 1) / 2)) * Math.PI / 2,       // 体の回り具合: 1(横) → 0° / 2 → 45° / 3(正面) → 90°
    ct = Math.cos(th), st = Math.sin(th),
    col = o.color || '#2a2833', acc = o.accent || '#ffe14a',
    R = o.radius ?? 7, ca = o.cupX ?? 4, cl = o.cupL ?? 5, cy = o.cupY ?? 7,
    // 体の座標 → [画面x, 画面y, 奥行き(+が手前)]。少し上から見下ろした見え方(奥ほど上)にして、真横でも奥のカップが少しのぞく
    V = (a, l, y) => {
      const fx = a * ct - l * sb * st, d = a * sb * st + l * ct,
        X = fx - d * 0.18, Yd = y + d * 0.32;
      return [nx + lc * X - ls * Yd, ny + ls * X + lc * Yd, d];
    };
  // バンド: 手前のカップの上 → 首の横 → うなじ → 首の横 → 奥のカップの上
  const B3 = [[ca - 1, cl, cy - 4]];
  for (let i = 0; i <= 12; i++) { const ps = Math.PI / 2 + (i / 12) * Math.PI; B3.push([-1 + R * Math.cos(ps), R * Math.sin(ps), 3 + 4 * Math.cos(ps)]); }
  B3.push([ca - 1, -cl, cy - 4]);
  const pts = B3.map((v) => V(...v)), back = layer === 'back' || ctx.backTorso;
  const strokeBand = (w, c, part) => {
    g.beginPath();
    let on = false;
    for (let i = 0; i < pts.length - 1; i++) {
      const A = pts[i], Bp = pts[i + 1], d = (B3[i][0] + B3[i + 1][0]) / 2;   // うなじ側(a < 0) / 首の前側
      const isBack = d < -1 && (A[2] + Bp[2]) / 2 < 1;                      // うなじ側で、首より奥にある所
      if (part === 'back' ? !isBack : isBack && !ctx.backTorso) { on = false; continue; }
      if (!on) g.moveTo(A[0], A[1]);
      g.lineTo(Bp[0], Bp[1]);
      on = true;
    }
    g.lineWidth = w; g.strokeStyle = c; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke();
  };
  // イヤーカップ: 外向き(±l)の円盤。正面から見るほど横幅が細くなり、厚み(側面)が見える
  const cup = (side) => {
    const c = V(ca, side * cl, cy), n = V(ca, side * (cl + 2.6), cy),  // カップの内側 / 外側の面の中心
      face = side * ct > 0.05,                                           // 外側の面がこちらを向いている(手前のカップ)
      rx = 4.6, ry = 5.8, w = Math.max(1.4, rx * ct),                    // 面の横幅(体の前後方向が画面の横に出る分)
      rot = Math.atan2(ls, lc) - 0.35 * ct, dim = face ? 0 : -0.25;
    // 側面(厚み): 内側の面と外側の面をつなぐ
    g.fillStyle = ctx.K(col, dim - 0.12);
    g.beginPath(); g.ellipse(c[0], c[1], w, ry, rot, 0, 7); g.fill(); ctx.ol(1.6);
    g.beginPath(); g.moveTo(c[0], c[1]); g.lineTo(n[0], n[1]);
    g.lineWidth = ry * 1.84; g.strokeStyle = ctx.K(col, dim - 0.12); g.lineCap = 'butt'; g.stroke();
    // 外側の面
    g.fillStyle = ctx.K(col, dim);
    g.beginPath(); g.ellipse(n[0], n[1], w, ry, rot, 0, 7); g.fill(); ctx.ol(face ? 2 : 1.6);
    if (face && ct > 0.3) {                                               // 黄色い輪と稲妻(こちらを向いているときだけ。横幅に合わせて細くなる)
      const k = w / rx;
      g.save(); g.translate(n[0], n[1]); g.rotate(rot); g.scale(k, 1);
      g.fillStyle = ctx.C(acc);
      g.beginPath(); g.ellipse(0.6, 0, 3, 4, 0, 0, 7); g.fill();
      g.lineWidth = 1.2 / k; g.strokeStyle = '#111'; g.stroke();
      g.beginPath();
      [[1.2, -3], [-0.6, 0.4], [0.9, 0.2], [-0.2, 3.2], [1.8, -0.6], [0.4, -0.4]].forEach(([x, y], i) => g[i ? 'lineTo' : 'moveTo'](x, y));
      g.closePath(); g.fillStyle = '#1a1820'; g.fill();
      g.restore();
    }
  };
  if (back) {                                                            // うなじ側のバンド
    strokeBand(4 + 2.5 * olScale(), '#111', 'back');
    strokeBand(4, ctx.K(col, -0.2), 'back');
    if (layer === 'back') return;
  }
  // 首の前側: 奥のカップ → バンド → 手前のカップ(奥行きの小さい方から)
  const order = [1, -1].sort((a, b) => V(ca, a * cl, cy)[2] - V(ca, b * cl, cy)[2]);
  cup(order[0]);
  strokeBand(4 + 2.5 * olScale(), '#111', 'front');
  strokeBand(4, ctx.K(col, 0.1), 'front');
  strokeBand(1.2, ctx.C(acc), 'front');                                  // バンドの黄色いライン
  cup(order[1]);
}

// ============================================================
// 新しい5人のスキン用の小物(palette で出す・出さないを決める)
// ============================================================
// 頭の上の小さな帽子・飾りを頭の座標(hcx, hcy, Rh。+x が顔の向き)で描く小さな道具
function hatAt(ctx, dx, dy, rot, fn) {
  const { g, hcx, hcy, Rh } = ctx;
  g.save(); g.translate(hcx + dx * Rh, hcy + dy * Rh); g.rotate(rot || 0);
  fn(g, Rh);
  g.restore();
}
// 頭襟(ときん): 山伏の小さな黒い六角の帽子(ハヤテ「山伏」)
function drawTokin(ctx, col) {
  hatAt(ctx, 0.15, -0.95, -0.15, (g, R) => {
    g.beginPath();
    for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i / 6) * Math.PI * 2; g.lineTo(Math.cos(a) * R * 0.42, Math.sin(a) * R * 0.34 - R * 0.12); }
    g.closePath(); g.fillStyle = ctx.K(col, 0); g.fill(); ctx.ol(1.8);
    ctx.line([-R * 0.5, R * 0.18], [R * 0.6, R * 0.18], 1.6, '#111');
  });
}
// 結袈裟(ゆいげさ): 胸の前の6つのぼんぼり(ハヤテ「山伏」)
function drawKesa(ctx, col) {
  const { P, hw } = ctx;
  ctx.line(P(0.95, -hw * 0.2), P(0.25, hw * 0.95), 3, ctx.C('#f4f0e8'));
  for (let i = 0; i < 3; i++) { const c = P(0.82 - i * 0.24, hw * (0.55 + i * 0.12)); ctx.dot(c[0], c[1], 4.4, '#111'); ctx.dot(c[0], c[1], 3.6, ctx.C(col)); }
}
// 羽団扇(はうちわ): 鳥の羽を重ねた扇(ハヤテ「山伏」)
function drawFeatherFan(ctx, e, ux, uy, col, col2) {
  const { g } = ctx, a0 = Math.atan2(uy, ux);
  ctx.line(e, [e[0] + ux * 10, e[1] + uy * 10], 4, '#111');
  ctx.line(e, [e[0] + ux * 10, e[1] + uy * 10], 2.6, ctx.C('#8a5a2a'));
  for (let i = -3; i <= 3; i++) {
    const a = a0 + i * 0.2, L = 26 - Math.abs(i) * 2, b = [e[0] + ux * 9, e[1] + uy * 9], t = [b[0] + Math.cos(a) * L, b[1] + Math.sin(a) * L], nx = -Math.sin(a), ny = Math.cos(a);
    g.beginPath(); g.moveTo(...b);
    g.quadraticCurveTo(b[0] + Math.cos(a) * L * 0.6 + nx * 5, b[1] + Math.sin(a) * L * 0.6 + ny * 5, ...t);
    g.quadraticCurveTo(b[0] + Math.cos(a) * L * 0.6 - nx * 5, b[1] + Math.sin(a) * L * 0.6 - ny * 5, ...b);
    g.fillStyle = ctx.K(i % 2 ? col2 : col, 0); g.fill(); ctx.ol(1.2);
  }
}
// 風袋(かざぶくろ): 頭の後ろに大きな輪になってなびく布(ハヤテ「風神」)
function drawWindBag(ctx, col) {
  const { g, P, hw } = ctx, c = P(1.25, -hw * 0.4), t = (typeof fr !== 'undefined' ? fr : 0) * 0.05;
  g.save(); g.translate(c[0], c[1]); g.rotate(Math.atan2(ctx.ls || 0, ctx.lc ?? 1));
  g.beginPath(); g.ellipse(-6, -4, 34 + Math.sin(t) * 2, 22, -0.2, 0, 7);
  g.lineWidth = 10 + 2.6 * olScale(); g.strokeStyle = '#111'; g.stroke();
  g.lineWidth = 10; g.strokeStyle = ctx.K(col, 0); g.stroke();
  g.lineWidth = 2; g.strokeStyle = ctx.K(col, 0.35);
  g.beginPath(); g.ellipse(-6, -4, 34 + Math.sin(t) * 2, 22, -0.2, 3.6, 5.6); g.stroke();
  g.restore();
}
// 氷の騎士の兜(額当てと結晶の羽飾り)(セツカ「氷の騎士」)
function drawIceHelm(ctx, col, gem) {
  hatAt(ctx, 0.05, -0.55, 0, (g, R) => {
    g.beginPath(); g.arc(0, R * 0.45, R * 1.08, Math.PI * 1.08, Math.PI * 1.95); g.lineTo(R * 1.05, R * 0.15); g.lineTo(-R * 1.0, R * 0.25); g.closePath();
    g.fillStyle = ctx.LG(-R, -R, R, R, ctx.K(col, 0.2), ctx.K(col, -0.15)); g.fill(); ctx.ol(2);
    ctx.poly([[-R * 0.2, -R * 0.55], [-R * 0.55, -R * 1.5], [R * 0.05, -R * 0.75]]);    // 結晶の羽飾り
    g.fillStyle = ctx.C(gem); g.fill(); ctx.ol(1.4);
    ctx.dot(R * 0.75, R * 0.05, 2.4, ctx.C(gem));
  });
}
// かんざし(氷の飾りを挿す)(セツカ「雪の巫女」)
function drawKanzashi(ctx, col) {
  hatAt(ctx, -0.55, -0.55, -0.6, (g, R) => {
    ctx.line([0, 0], [R * 1.1, 0], 2.4, '#111'); ctx.line([0, 0], [R * 1.1, 0], 1.4, ctx.C('#f0e8d8'));
    for (let i = 0; i < 3; i++) { ctx.poly([[-2 + i * 4, 0], [i * 4, R * (0.5 + i * 0.12)], [2 + i * 4, 0]]); g.fillStyle = ctx.C(col); g.fill(); ctx.ol(1); }
    ctx.dot(0, 0, 3.4, ctx.C(col));
  });
}
// どんぐりの帽子(シゲル「どんぐり探検家」)
function drawAcornCap(ctx, col) {
  hatAt(ctx, 0, -0.7, -0.1, (g, R) => {
    g.beginPath(); g.ellipse(0, 0, R * 1.12, R * 0.62, 0, Math.PI, 0); g.closePath();
    g.fillStyle = ctx.K(col, 0); g.fill(); ctx.ol(2);
    g.lineWidth = 1; g.strokeStyle = 'rgba(40,20,0,.45)';
    for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * R * 0.38 - R * 0.2, -R * 0.05); g.lineTo(i * R * 0.38 + R * 0.2, -R * 0.45); g.stroke(); }
    ctx.line([0, -R * 0.6], [R * 0.15, -R * 0.9], 3, '#111'); ctx.line([0, -R * 0.6], [R * 0.15, -R * 0.9], 1.8, ctx.C('#6a4a2a'));
  });
}
// 花の冠(シゲル「花の妖精」)
function drawFlowerWreath(ctx, cols) {
  for (let i = 0; i < 5; i++) {
    const a = Math.PI * (1.05 + i * 0.2);
    hatAt(ctx, Math.cos(a) * 0.92, Math.sin(a) * 0.82 - 0.05, 0, (g, R) => {
      for (let k = 0; k < 5; k++) { const b = (k / 5) * Math.PI * 2; ctx.dot(Math.cos(b) * 3, Math.sin(b) * 3, 2.6, ctx.C(cols[i % cols.length])); }
      ctx.dot(0, 0, 1.8, ctx.C('#fff3a0'));
    });
  }
}
// きのこの傘の帽子(シゲル「森の番人」)
function drawMushroomCap(ctx, col, dots) {
  hatAt(ctx, 0, -0.62, -0.12, (g, R) => {
    g.beginPath(); g.moveTo(-R * 1.45, R * 0.15); g.quadraticCurveTo(-R * 1.2, -R * 1.25, 0, -R * 1.3); g.quadraticCurveTo(R * 1.2, -R * 1.25, R * 1.45, R * 0.15);
    g.quadraticCurveTo(0, -R * 0.15, -R * 1.45, R * 0.15); g.closePath();
    g.fillStyle = ctx.LG(0, -R * 1.3, 0, R * 0.2, ctx.K(col, 0.15), ctx.K(col, -0.15)); g.fill(); ctx.ol(2);
    for (const [x, y, r] of [[-0.6, -0.65, 0.2], [0.3, -0.9, 0.16], [0.75, -0.35, 0.14], [-0.15, -0.35, 0.12]]) ctx.dot(x * R, y * R, r * R, ctx.C(dots));
  });
}
// 背負いかばん(シゲル「どんぐり探検家」)
function drawBackpack(ctx, col) {
  const { g, P, hw } = ctx, c = P(0.55, -hw * 1.15);
  g.save(); g.translate(c[0], c[1]); g.rotate(Math.atan2(ctx.ls || 0, ctx.lc ?? 1));
  g.beginPath(); if (g.roundRect) g.roundRect(-8, -16, 14, 30, 4); else g.rect(-8, -16, 14, 30);
  g.fillStyle = ctx.K(col, 0); g.fill(); ctx.ol(2);
  ctx.line([-8, -4], [6, -4], 1.4, ctx.K(col, -0.3)); ctx.dot(-1, 2, 1.8, ctx.C('#e8d070'));
  g.restore();
}
// 大きな肩当て(ギア「重装型」)
function drawPauldron(ctx, shN, col, trim) {
  const { g } = ctx;
  g.beginPath(); g.ellipse(shN[0], shN[1] - 2, 17, 13, -0.2, Math.PI * 1.02, Math.PI * 2.1); g.closePath();
  g.fillStyle = ctx.LG(shN[0] - 15, shN[1] - 14, shN[0] + 15, shN[1] + 4, ctx.K(col, 0.2), ctx.K(col, -0.2)); g.fill(); ctx.ol(2.4);
  ctx.line([shN[0] - 14, shN[1] + 1], [shN[0] + 15, shN[1] - 3], 2.4, ctx.C(trim));
  for (const dx of [-8, 0, 8]) ctx.dot(shN[0] + dx, shN[1] - 8, 1.6, '#2a3038');
}
// 道化の帽子(先が2つに分かれ、鈴がつく)(カルタ「ジョーカー」)
function drawJesterHat(ctx, c1, c2) {
  const p = ctx.p, sw = Math.sin((typeof fr !== 'undefined' ? fr : 0) * 0.12 + (p && p.vx ? p.vx * 0.2 : 0)) * 0.15;
  hatAt(ctx, -0.05, -0.75, 0, (g, R) => {
    for (const [s, col] of [[-1, c1], [1, c2]]) {
      g.beginPath(); g.moveTo(-R * 0.75 * (s < 0 ? 1 : 0), 0); g.lineTo(R * 0.75 * (s > 0 ? 1 : 0), 0);
      const tx = s * R * 1.45 + sw * R, ty = -R * 0.6 + R * 0.55;
      g.quadraticCurveTo(s * R * 1.0, -R * 1.5, tx, ty); g.quadraticCurveTo(s * R * 0.5, -R * 0.9, 0, 0); g.closePath();
      g.fillStyle = ctx.K(col, 0); g.fill(); ctx.ol(1.8);
      ctx.dot(tx, ty + 2, 3.4, '#111'); ctx.dot(tx, ty + 2, 2.6, ctx.C('#ffd84a'));
    }
    g.beginPath(); g.ellipse(0, 0, R * 0.95, R * 0.24, 0, 0, 7); g.fillStyle = ctx.C('#f4f0e8'); g.fill(); ctx.ol(1.4);
  });
}
// カジノのひさし(緑の半透明のつば)(カルタ「カジノディーラー」)
function drawEyeshade(ctx, col) {
  hatAt(ctx, 0.15, -0.55, -0.05, (g, R) => {
    ctx.line([-R * 0.95, 0], [R * 0.3, -R * 0.1], 3, '#111');
    g.beginPath(); g.moveTo(R * 0.1, -R * 0.12); g.lineTo(R * 1.55, R * 0.1); g.lineTo(R * 0.15, R * 0.2); g.closePath();
    g.globalAlpha = 0.85; g.fillStyle = ctx.C(col); g.fill(); g.globalAlpha = 1; ctx.ol(1.4);
  });
}
// 占い師のヴェール付きの頭巾(額に金貨の飾り)(カルタ「タロット占い師」)
function drawFortuneHood(ctx, col, gold) {
  hatAt(ctx, -0.1, -0.35, 0, (g, R) => {
    g.beginPath(); g.moveTo(-R * 1.25, R * 0.9); g.quadraticCurveTo(-R * 1.35, -R * 1.2, R * 0.2, -R * 1.0); g.quadraticCurveTo(R * 0.85, -R * 0.75, R * 0.95, -R * 0.15);
    g.lineTo(R * 0.55, -R * 0.2); g.quadraticCurveTo(-R * 0.2, -R * 0.65, -R * 0.75, R * 0.9); g.closePath();
    g.fillStyle = ctx.K(col, 0); g.fill(); ctx.ol(2);
    for (let i = 0; i < 5; i++) { const x = -R * 0.35 + i * R * 0.25, y = -R * 0.55 + i * R * 0.08; ctx.dot(x, y, 2.6, '#111'); ctx.dot(x, y, 2, ctx.C(gold)); }
  });
}

const CHARACTER_DRAWS = {
  'ライキ': {
    body: {
      // ---- 大きさ (px) ----
      scale: 1,               // 全体の大きさ (見た目・当たり判定の両方)
      headRadius: 13,          // 頭の半径
      handRadius: 9,           // 手の半径
      torsoLength: 36,         // 胴の長さ
      torsoWidth: 22,          // 胴の太さ
      upperArm: { length: 25, width: 11 },   // 上腕の長さ・太さ
      lowerArm: { length: 24, width: 11 },   // 前腕の長さ・太さ
      thighLength: 21,         // 太ももの長さ
      shinLength: 21,          // すねの長さ
      legWidth: 13,           // 脚の太さ
      // thighWidth: 13,   // 太ももの太さ(省略時 legWidth)
      // shinWidth: 13,    // すねの太さ(省略時 legWidth)

      // ---- 色 ----
      pantsColor: '#2a2a3a',
      beltColor: '#fff',
      sleeves: true,           // true=上腕が服の色(袖あり) / false=上腕が肌の色
      foreArmColor: '#f2c79c',
      handColor: '#fff',
      shoesColor: '#111',

      // ---- 形 ----
      torsoType: "standard",
      armBand: null,
      hand: "normal",
      handOutline: true,
      shoeLegCover: false,
      legPatch: false,
      armDecoration: false
    },

    hair: "raiki",
    headShape: 'shonen',     // 顔の形: 少年(少し骨太で、あご先は丸め)
    headgear: [
      { type: 'headband', color: '#fff', color2: '#eee', y: -0.42, tails: 2, drop: 6, drop2: 14 }
    ],
    faceDeco: [],
    clothes: [],
    nose: "normal",
    eyes: "normal",

    torso(ctx) {
      const c = PAL(ctx, 'stripe', '#fff');
      if (!c) return;
      ctx.line(ctx.P(0.1, ctx.hw * 0.8), ctx.P(0.9, ctx.hw * 0.98), 3.5, ctx.C(c));
      ctx.line(ctx.P(0.95, -ctx.hw * 0.4), ctx.P(0.7, ctx.hw * 0.1), 3, ctx.C(c));
    },

    back(ctx) {},
    weapon(ctx, e, ux, uy) {}
  },


  'ガルド': {
    body: {
      // ---- 大きさ (px) ----
      scale: 1.12,               // 全体の大きさ (見た目・当たり判定の両方)
      headRadius: 15,          // 頭の半径
      handRadius: 12,           // 手の半径
      torsoLength: 36,         // 胴の長さ
      torsoWidth: 40,          // 胴の太さ
      upperArm: { length: 26, width: 21.25 },   // 上腕の長さ・太さ
      lowerArm: { length: 25, width: 21.25 },   // 前腕の長さ・太さ
      thighLength: 17.1,         // 太ももの長さ
      shinLength: 17.1,          // すねの長さ
      legWidth: 19,           // 脚の太さ
      // thighWidth: 19,   // 太ももの太さ(省略時 legWidth)
      // shinWidth: 19,    // すねの太さ(省略時 legWidth)

      // ---- 色 ----
      pantsColor: '#445',
      beltColor: '#fc3',
      sleeves: false,           // true=上腕が服の色(袖あり) / false=上腕が肌の色
      foreArmColor: '#d9a273',
      handColor: '#d9a273',
      shoesColor: '#654',

      // ---- 形 ----
      torsoType: "standard",
      armBand: "#a8842c",
      hand: "normal",
      handOutline: true,
      shoeLegCover: true,
      legPatch: false,
      armDecoration: false
    },

    hair: null,
    headShape: 'square',     // 顔の形のテンプレート(drawing.js の FACE_TEMPLATES): いかつい四角いあご
    headgear: [],
    faceDeco: [
      { type: 'beard', color: '#4a2c14' },
      { type: 'scar' }
    ],
    clothes: [],
    nose: "round",
    eyes: "black",

    torso(ctx) {
      ctx.poly([ctx.P(0.3, ctx.hw * 0.95), ctx.P(0.93, ctx.hw * 1.0), ctx.P(0.9, -ctx.hw * 0.75), ctx.P(0.3, -ctx.hw * 0.7)]);
      const a = ctx.P(0.6, -ctx.hw * 0.7), b = ctx.P(0.6, ctx.hw);
      ctx.g.fillStyle = ctx.LG(a[0], a[1], b[0], b[1], ctx.K(PAL(ctx, 'armorLo', '#6a7388'), 0), ctx.K(PAL(ctx, 'armorMid', '#aab4c8'), 0), ctx.K(PAL(ctx, 'armorHi', '#d8deea'), 0));
      ctx.g.fill();
      ctx.ol(2.5);
      for (const t of [0.4, 0.82]) ctx.dot(...ctx.P(t, ctx.hw * 0.55), 1.8, ctx.C(PAL(ctx, 'rivet', '#fc3')));
      ctx.line(ctx.P(0.35, ctx.hw * 0.3), ctx.P(0.9, ctx.hw * 0.3), 2, ctx.K(PAL(ctx, 'armorLine', '#556'), 0));
      const em = PAL(ctx, 'emblem', null);                                 // 胸の紋章(スキン)
      if (em) { const c = ctx.P(0.66, ctx.hw * 0.62); ctx.dot(c[0], c[1], 5.5, '#111'); ctx.dot(c[0], c[1], 4.2, ctx.C(em)); ctx.dot(c[0] - 1, c[1] - 1, 1.5, '#fff8'); }
    },

    back(ctx) {},
    shoulder(ctx, shN) {
      ctx.g.fillStyle = ctx.RG(shN[0] - 4, shN[1] - 6, 1, 20, ctx.K(PAL(ctx, 'armorHi', '#d8deea'), 0), ctx.K(PAL(ctx, 'padMid', '#8a93a8'), 0), ctx.K(PAL(ctx, 'armorLine', '#556'), 0));
      ctx.g.beginPath();
      ctx.g.arc(shN[0], shN[1] - 3, 15, 0, 7);
      ctx.g.fill();
      ctx.ol(3);
      if (PAL(ctx, 'spikes', false)) for (const [dx, dy] of [[-6, -14], [4, -16]]) {   // 肩当てのトゲ(スキン)
        ctx.poly([[shN[0] + dx - 3.5, shN[1] - 9], [shN[0] + dx + 1, shN[1] + dy - 6], [shN[0] + dx + 3.5, shN[1] - 9]]);
        ctx.g.fillStyle = ctx.K(PAL(ctx, 'armorHi', '#d8deea'), 0); ctx.g.fill(); ctx.ol(1.5);
      }
      ctx.dot(shN[0] + 2, shN[1] - 4, 3.5, ctx.C(PAL(ctx, 'rivet', '#fc3')));
      ctx.dot(shN[0] + 2, shN[1] - 4, 1.4, PAL(ctx, 'rivetDark', '#a70'));
    },
    weapon(ctx, e, ux, uy) {}
  },


  'シノ': {
    body: {
      // ---- 大きさ (px) ----
      scale: 0.97,               // 全体の大きさ (見た目・当たり判定の両方)
      headRadius: 12,          // 頭の半径
      handRadius: 7,           // 手の半径
      torsoLength: 32,         // 胴の長さ
      torsoWidth: 15,          // 胴の太さ
      upperArm: { length: 23, width: 6.8 },   // 上腕の長さ・太さ
      lowerArm: { length: 23, width: 6.8 },   // 前腕の長さ・太さ
      thighLength: 26.25,         // 太ももの長さ
      shinLength: 26.25,          // すねの長さ
      legWidth: 10,           // 脚の太さ
      // thighWidth: 10,   // 太ももの太さ(省略時 legWidth)
      // shinWidth: 10,    // すねの太さ(省略時 legWidth)

      // ---- 色 ----
      pantsColor: '#143',
      beltColor: '#e33',
      sleeves: true,           // true=上腕が服の色(袖あり) / false=上腕が肌の色
      foreArmColor: '#143',
      handColor: '#143',
      shoesColor: '#111',

      // ---- 形 ----
      torsoType: "standard",
      armBand: "#c33",
      hand: "normal",
      handOutline: false,
      shoeLegCover: true,
      legPatch: false,
      armDecoration: false
    },

    hair: "shino",
    headShape: 'cool',       // 顔の形: 頬がこけた鋭いあご
    headgear: [
      { type: 'headband', color: '#e33', color2: '#c22', y: -0.55, tails: 2, drop: 8, drop2: 18 }
    ],
    faceDeco: [],
    clothes: [],
    nose: "none",
    eyes: {
      type: "shinosClosed",   // 目の種類(normal / sharp / black / purple / blue / red / cyan / golem / closed / anime)
      x: 0.5,           // 前後の位置(大きいほど顔の前側)
      y: -0.15,          // 上下の位置(大きいほど下)
      size: 1,          // 全体の大きさ倍率
      width: 1.5,         // 横だけの倍率(size と掛け算)
      height: 0.2         // 縦だけの倍率(size と掛け算。眉の高さも連動)
    },
    brows: false,

    showEars: false,
    showMouth: false,

    torso(ctx) {
      const c = PAL(ctx, 'strap', '#0a2a14');
      ctx.line(ctx.P(0.96, -ctx.hw * 0.1), ctx.P(0.62, ctx.hw * 0.35), 2.8, ctx.K(c, 0));
      ctx.line(ctx.P(0.96, ctx.hw * 0.75), ctx.P(0.62, ctx.hw * 0.35), 2.8, ctx.K(c, 0));
      const mk = PAL(ctx, 'crest', null);                                   // 胸の家紋(スキン)
      if (mk) { const o = ctx.P(0.72, ctx.hw * 0.62); ctx.dot(o[0], o[1], 4.6, '#111'); ctx.dot(o[0], o[1], 3.6, ctx.C(mk)); ctx.dot(o[0], o[1], 1.4, ctx.K(c, 0)); }
    },

    back(ctx) {},

    waist(ctx, b, tr, wv) {                                       // 帯の垂れ(物理でなびく)
      [[-14, 16, 0], [-8, 22, -0.15]].forEach(([dx, dy, dim], k) => {
        const pts = ctx.strand('sash' + k, b, { len: Math.hypot(dx, dy), n: 4, dir: [dx, dy], stiff: [0.3, 0.02], damp: 0.07, flutter: 0.8, seed: k * 2.1, collide: 'back', r: 2 });
        strandRibbon(ctx, pts, 4, 3.6, ctx.K(ctx.Y.sh, dim));
      });
    },

    faceMask: { color: '#143', nose: -0.08, side: -0.5, end: 125, endY: -0.85 },   // 口元の布(立体。どの向きでも鼻から耳の下へ流れる)

    extraCollar(ctx, nx, ny, tr, wv) {                            // 首巻きのなびき(物理で動き、背中で止まる)
      const s0 = ctx.strand('collar0', [nx - 3, ny + 2], { len: 44, n: 7, dir: [-43, 6], curve: 0.03, stiff: [0.25, 0.008], damp: 0.06, flutter: 1.4, seed: 0.7, collide: 'back', r: 3 }),
        s1 = ctx.strand('collar1', [nx - 3, ny + 5], { len: 33, n: 6, dir: [-31, 11], curve: 0.04, stiff: [0.25, 0.008], damp: 0.06, flutter: 1.4, seed: 2.9, collide: 'back', r: 2.5 });
      const c1 = PAL(ctx, 'scarf', '#e33'), c2 = PAL(ctx, 'scarf2', '#c22');
      strandRibbon(ctx, s1, 4.5, 3.5, ctx.C(c2), true);
      strandRibbon(ctx, s0, 6, 4.5, ctx.C(c1), true);
      ctx.line([nx - 6, ny + 2], [nx + 8, ny + 6], 8, ctx.C(c1));
    },

    weapon(ctx, e, ux, uy) {}
  },


  'ゴーレム': {
    body: {
      // ---- 大きさ (px) ----
      scale: 1.2,               // 全体の大きさ (見た目・当たり判定の両方)
      headRadius: 14,          // 頭の半径
      handRadius: 13,           // 手の半径
      torsoLength: 34,         // 胴の長さ
      torsoWidth: 44,          // 胴の太さ
      upperArm: { length: 24, width: 28.8 },   // 上腕の長さ・太さ
      lowerArm: { length: 24, width: 28.8 },   // 前腕の長さ・太さ
      thighLength: 15.3,         // 太ももの長さ
      shinLength: 15.3,          // すねの長さ
      legWidth: 20,           // 脚の太さ
      // thighWidth: 20,   // 太ももの太さ(省略時 legWidth)
      // shinWidth: 20,    // すねの太さ(省略時 legWidth)

      // ---- 色 ----
      pantsColor: '#667',
      beltColor: '#888',
      sleeves: true,           // true=上腕が服の色(袖あり) / false=上腕が肌の色
      foreArmColor: '#778',
      handColor: '#99a',
      shoesColor: '#445',

      // ---- 形 ----
      torsoType: "standard",
      armBand: null,
      hand: "block",
      handOutline: false,
      shoeLegCover: false,
      legPatch: true,
      limbShape: "block",      // 腕・脚の形: "human"(人の形。省略時) / "block"(まっすぐな石の形)
      armDecoration: false
    },

    // ゴーレムは普通の頭ではないので特殊処理
    headCustom(ctx) {
      const hcx = ctx.hcx;
      const hcy = ctx.hcy;
      const Rh = ctx.Rh;
      const hv = ctx.hv, tn = hv && hv.turned, mid = tn ? hv.cs : 1, sp = tn ? 0.28 * hv.cs + 0.3 * hv.as : 0.28;

      ctx.g.beginPath();

      ctx.g.moveTo(
        hcx - Rh,
        hcy - Rh * 0.8
      );

      ctx.g.lineTo(
        hcx + Rh * 0.9,
        hcy - Rh
      );

      ctx.g.lineTo(
        hcx + Rh * 1.1,
        hcy + Rh * 0.7
      );

      ctx.g.lineTo(
        hcx + Rh * 0.3,
        hcy + Rh * 1.05
      );

      ctx.g.lineTo(
        hcx - Rh * 0.9,
        hcy + Rh * 0.8
      );

      ctx.g.closePath();

      ctx.g.fillStyle = ctx.LG(
        hcx - Rh,
        hcy - Rh,
        hcx + Rh,
        hcy + Rh,
        ctx.K(PAL(ctx, 'stoneHi', '#aab'), 0.15),
        ctx.K(PAL(ctx, 'stone', '#8a8f9c'), 0),
        ctx.K(PAL(ctx, 'stoneLo', '#5a5f6c'), 0)
      );

      ctx.g.fill();
      ctx.ol(3);

      ctx.line(
        [hcx - Rh * 0.2, hcy - Rh * 0.9],
        [hcx + Rh * 0.1, hcy - Rh * 0.3],
        2,
        PAL(ctx, 'crack', '#0005')
      );

      ctx.line(
        [hcx + Rh * 0.1, hcy - Rh * 0.3],
        [hcx - Rh * 0.2, hcy + Rh * 0.1],
        2,
        PAL(ctx, 'crack', '#0005')
      );
      if (PAL(ctx, 'moss', null)) {                                         // 頭の上の苔(スキン)
        ctx.g.fillStyle = ctx.C(PAL(ctx, 'moss', null));
        ctx.g.beginPath();
        ctx.g.moveTo(hcx - Rh, hcy - Rh * 0.8);
        ctx.g.lineTo(hcx + Rh * 0.9, hcy - Rh);
        for (let k = 0; k <= 6; k++) { const t = k / 6; ctx.g.lineTo(hcx + Rh * (0.9 - 1.9 * t), hcy - Rh * (1 - 0.2 * t) + Rh * (k % 2 ? 0.45 : 0.25)); }
        ctx.g.closePath(); ctx.g.fill(); ctx.ol(1.6);
      }
      if (PAL(ctx, 'crystal', null)) {                                      // 頭の結晶(スキン)
        for (const [x, h, w] of [[-0.5, 1.0, 0.22], [0.0, 1.5, 0.28], [0.45, 0.9, 0.2]]) {
          ctx.poly([[hcx + Rh * (x - w), hcy - Rh * 0.85], [hcx + Rh * x, hcy - Rh * (0.85 + h)], [hcx + Rh * (x + w), hcy - Rh * 0.88]]);
          ctx.g.fillStyle = ctx.LG(hcx + Rh * x, hcy - Rh * 2, hcx + Rh * x, hcy - Rh * 0.8, ctx.K(PAL(ctx, 'crystal', '#bff'), 0.4), ctx.K(PAL(ctx, 'crystal', '#bff'), -0.1));
          ctx.g.fill(); ctx.ol(1.6);
        }
      }

      if (!(tn && hv.fv < 0.3)) ctx.line(
        tn ? [hcx + Rh * (0.425 * mid - 0.62 - 0.1 * hv.as), hcy - Rh * 0.2] : [hcx - Rh * 0.2, hcy - Rh * 0.2],
        tn ? [hcx + Rh * (0.425 * mid + 0.62 + 0.1 * hv.as), hcy - Rh * 0.2] : [hcx + Rh * 1.05, hcy - Rh * 0.2],
        5,
        '#111'
      );

      // 目 (向きが付いているときは顔の中心線に合わせて左右へ)
      for (const x of tn && hv.fv < 0.3 ? [] : tn ? [hcx + Rh * (0.4 * mid - sp), hcx + Rh * (0.4 * mid + sp)] : [
        hcx + Rh * 0.12,
        hcx + Rh * 0.68
      ]) {
        ctx.g.fillStyle = ctx.RG(
        x,
        hcy + 1,
        1,
        6,
        PAL(ctx, 'eyeCore', '#fff6c0'),
        PAL(ctx, 'eye', '#ff9020'),
        PAL(ctx, 'eyeFade', 'rgba(255,90,0,0)')
      );

        ctx.g.beginPath();

        ctx.g.arc(
          x,
          hcy + 1,
          6,
          0,
          7
        );

        ctx.g.fill();

        ctx.dot(
          x,
          hcy + 1,
          ctx.hurt ? 1.2 : 2.4,
          ctx.C(PAL(ctx, 'eyeDot', '#fff3a0'))
        );
      }

      if (!(tn && hv.fv < 0.3)) ctx.line(
        tn ? [hcx + Rh * (0.575 * mid - 0.28 - 0.25 * hv.as), hcy + Rh * 0.6] : [hcx + Rh * 0.3, hcy + Rh * 0.6],
        tn ? [hcx + Rh * (0.575 * mid + 0.28 + 0.25 * hv.as), hcy + Rh * 0.6] : [hcx + Rh * 0.85, hcy + Rh * 0.6],
        2.5,
        '#222'
      );

      return true;
    },

    nose: "none",
    eyes: "golem",
    headgear: [],
    faceDeco: [],
    clothes: [],

    torso(ctx) {
      const ck = PAL(ctx, 'crack', '#0005'), glow = PAL(ctx, 'glowCrack', null);
      for (const t of [0.3, 0.62]) ctx.line(ctx.P(t, -ctx.hw * 0.8), ctx.P(t, ctx.hw * 0.95), 2, ck);
      ctx.line(ctx.P(0.62, ctx.hw * 0.2), ctx.P(0.8, ctx.hw * 0.7), 2, ck);
      if (glow) {                                                         // 光るひび(溶岩など。スキン)
        const W2 = 2.2 + 0.8 * Math.sin((ctx.fr || 0) * 0.15);
        for (const [a, b] of [[[0.12, -0.5], [0.3, 0.1]], [[0.3, 0.1], [0.22, 0.7]], [[0.8, -0.6], [0.66, 0.0]], [[0.45, 0.8], [0.62, 0.4]]])
          ctx.line(ctx.P(a[0], ctx.hw * a[1]), ctx.P(b[0], ctx.hw * b[1]), W2, ctx.C(glow));
      }
      if (PAL(ctx, 'vine', null)) {                                        // つた(スキン)
        const v = PAL(ctx, 'vine', null);
        for (let k = 0; k < 5; k++) ctx.line(ctx.P(0.95 - k * 0.17, ctx.hw * (k % 2 ? 0.7 : -0.3)), ctx.P(0.8 - k * 0.17, ctx.hw * (k % 2 ? -0.3 : 0.7)), 2.4, ctx.C(v));
        for (let k = 0; k < 6; k++) { const o = ctx.P(0.9 - k * 0.15, ctx.hw * (k % 2 ? 0.45 : 0.05)); ctx.g.fillStyle = ctx.C(v); ctx.g.beginPath(); ctx.g.ellipse(o[0], o[1], 3.6, 2, k, 0, 7); ctx.g.fill(); ctx.ol(1); }
      }
      const c = ctx.P(0.64, ctx.hw * 0.35);
      ctx.g.fillStyle = ctx.RG(c[0], c[1], 1, 15, PAL(ctx, 'eyeCore', '#fff6c0'), PAL(ctx, 'core', '#ffa030'), PAL(ctx, 'eyeFade', 'rgba(255,100,20,0)'));
      ctx.g.beginPath();
      ctx.g.arc(c[0], c[1], 15, 0, 7);
      ctx.g.fill();
      ctx.dot(c[0], c[1], 4, ctx.C(PAL(ctx, 'eyeDot', '#fff3a0')));
    },

    back(ctx) {},
    shoulder(ctx, shN) {
      ctx.g.fillStyle = ctx.LG(shN[0] - 12, shN[1] - 12, shN[0] + 12, shN[1] + 6, ctx.K(PAL(ctx, 'stoneHi', '#aab'), 0.2), ctx.K(PAL(ctx, 'stoneLo', '#667'), 0));
      ctx.g.beginPath();
      ctx.g.moveTo(shN[0] - 12, shN[1] + 2);
      ctx.g.lineTo(shN[0] - 8, shN[1] - 11);
      ctx.g.lineTo(shN[0] + 8, shN[1] - 10);
      ctx.g.lineTo(shN[0] + 11, shN[1] + 3);
      ctx.g.closePath();
      ctx.g.fill();
      ctx.ol(2.5);
      if (PAL(ctx, 'crystal', null)) for (const [dx, h] of [[-6, 16], [3, 22], [9, 12]]) {   // 肩の結晶(スキン)
        ctx.poly([[shN[0] + dx - 3.5, shN[1] - 9], [shN[0] + dx + 1, shN[1] - 9 - h], [shN[0] + dx + 4, shN[1] - 9]]);
        ctx.g.fillStyle = ctx.LG(shN[0], shN[1] - 30, shN[0], shN[1] - 8, ctx.K(PAL(ctx, 'crystal', '#bff'), 0.45), ctx.K(PAL(ctx, 'crystal', '#bff'), -0.15));
        ctx.g.fill(); ctx.ol(1.5);
      }
      if (PAL(ctx, 'moss', null)) { ctx.g.fillStyle = ctx.C(PAL(ctx, 'moss', null)); ctx.g.beginPath(); ctx.g.ellipse(shN[0] - 1, shN[1] - 9, 10, 4, -0.1, 0, 7); ctx.g.fill(); ctx.ol(1.4); }
    },

    weapon(ctx, e, ux, uy) {}
  },
  'バーサク': {
    body: {
      // ---- 大きさ (px) ----
      scale: 1.1,               // 全体の大きさ (見た目・当たり判定の両方)
      headRadius: 14,          // 頭の半径
      handRadius: 11,           // 手の半径
      torsoLength: 38,         // 胴の長さ
      torsoWidth: 38,          // 胴の太さ
      upperArm: { length: 25, width: 20.25 },   // 上腕の長さ・太さ
      lowerArm: { length: 24, width: 20.25,     // 前腕の長さ・太さ
        wrap: { color: '#e2d6bc', stripe: '#a0645a', from: 0.12, to: 0.55, count: 3 } },   // 血と泥のにじんだ包帯
      thighLength: 19.95,         // 太ももの長さ
      shinLength: 19.95,          // すねの長さ
      legWidth: 17,           // 脚の太さ
      // thighWidth: 17,   // 太ももの太さ(省略時 legWidth)
      // shinWidth: 17,    // すねの太さ(省略時 legWidth)

      // ---- 色 ----
      pantsColor: '#533',
      beltColor: '#a22',
      sleeves: false,           // true=上腕が服の色(袖あり) / false=上腕が肌の色
      foreArmColor: '#c8845a',
      handColor: '#c8845a',
      shoesColor: '#322',

      // ---- 形 ----
      torsoType: "standard",
      armBand: "#3a3a3a",
      hand: "normal",
      handOutline: true,
      shoeLegCover: true,
      legPatch: false,
      armDecoration: "berserk"
    },

    hair: "berserk",
    headShape: 'wild',       // 顔の形: 張ったエラと広いあご
    headgear: [
      { type: 'horn', x: -0.1, y: -0.8, side: -1, layer: 'back' },
      { type: 'horn', x: 0.55, y: -0.78, side: 1 }
    ],
    faceDeco: [
      { type: 'line', from: [0.1, 0.3], to: [0.85, 0.3], w: 2.6, color: 'rgba(220,40,30,.85)' }
    ],
    clothes: [],
    nose: "long",
    eyes: "red",

    torsoUsesSkin: true,
    weaponGrip: false,         // 狂爪は前腕の向きのまま(腕の動き・当たり判定は変えない)

    torso(ctx) {
      const st = PAL(ctx, 'strap', '#5a3a1a'), sc = PAL(ctx, 'scar', 'rgba(140,30,30,.85)');
      if (st) {
        ctx.line(ctx.P(0.96, -ctx.hw * 0.7), ctx.P(0.12, ctx.hw * 0.9), 7, '#111');
        ctx.line(ctx.P(0.96, -ctx.hw * 0.7), ctx.P(0.12, ctx.hw * 0.9), 4.5, ctx.K(st, 0));
      }
      ctx.line(ctx.P(0.8, ctx.hw * 0.1), ctx.P(0.55, ctx.hw * 0.6), 2, sc);
      ctx.line(ctx.P(0.72, ctx.hw * 0.0), ctx.P(0.5, ctx.hw * 0.45), 2, sc);
      const paint = PAL(ctx, 'paint', null);                                 // 体の模様(戦化粧・虎柄など。スキン)
      if (paint) for (let k = 0; k < 3; k++) {
        const t = 0.3 + k * 0.2;
        ctx.poly([ctx.P(t, ctx.hw * 0.98), ctx.P(t + 0.06, ctx.hw * 0.45), ctx.P(t + 0.03, ctx.hw * 0.98)]);
        ctx.g.fillStyle = ctx.C(paint); ctx.g.fill();
      }
      const plate = PAL(ctx, 'plate', null);                                 // 片方の肩の革当て(剣闘士。スキン)
      if (plate) {
        ctx.poly([ctx.P(0.98, -ctx.hw * 0.95), ctx.P(1.02, ctx.hw * 0.4), ctx.P(0.72, ctx.hw * 0.55), ctx.P(0.7, -ctx.hw * 0.8)]);
        const a = ctx.P(1, 0), b = ctx.P(0.7, 0);
        ctx.g.fillStyle = ctx.LG(a[0], a[1], b[0], b[1], ctx.K(plate, 0.25), ctx.K(plate, -0.2)); ctx.g.fill(); ctx.ol(2);
        for (const t of [0.78, 0.9]) ctx.dot(...ctx.P(t, ctx.hw * 0.25), 1.6, ctx.C(PAL(ctx, 'rivet', '#ddd')));
      }
      const bl = PAL(ctx, 'blood', 'rgba(130,8,20,.8)');                    // 返り血(手形としぶき・したたり。スキンの palette で blood: null なら無し)
      if (bl) {
        const g = ctx.g, hw = ctx.hw, c = ctx.C(bl);
        g.fillStyle = c; g.strokeStyle = c; g.lineCap = 'round';
        const hp = ctx.P(0.26, hw * 0.05);                                  // お腹の手形(てのひら+指4本。腕に隠れない所)
        g.beginPath(); g.ellipse(hp[0], hp[1], 4.6, 3.6, -0.3, 0, 7); g.fill();
        for (let k = 0; k < 4; k++) { const f0 = ctx.P(0.3 + k * 0.03, hw * (0.18 + k * 0.08)), f1 = ctx.P(0.4 + k * 0.035, hw * (0.3 + k * 0.1)); g.lineWidth = 2; g.beginPath(); g.moveTo(...f0); g.lineTo(...f1); g.stroke(); }
        for (const [t, o, r] of [[0.72, -0.55, 1.8], [0.8, -0.7, 1.2], [0.64, -0.75, 1.4], [0.58, -0.4, 1.1], [0.18, 0.5, 1.2], [0.14, -0.35, 1]]) ctx.dot(...ctx.P(t, hw * o), r, c);   // しぶき(背中側にも)
        g.lineWidth = 1.5;                                                   // したたり
        for (const [t, o, L] of [[0.24, -0.12, 0.12], [0.22, 0.2, 0.09], [0.7, -0.6, 0.14]]) { g.beginPath(); g.moveTo(...ctx.P(t, hw * o)); g.lineTo(...ctx.P(t - L, hw * o)); g.stroke(); ctx.dot(...ctx.P(t - L, hw * o), 1.3, c); }
      }
    },
    back(ctx) {},
    extraCollar(ctx, nx, ny, tr, wv) {
      if (PAL(ctx, 'fur', '#6a4a30') === false) return;                     // 毛皮の襟なし(スキン)
      furCollar(ctx, PAL(ctx, 'fur', '#6a4a30'));
    },

    // 狂爪: 手の甲から伸びる3本の鉄の爪。先は血で赤い(palette: claw=爪の色 / clawBlood=先の血。claw: null で爪なし)
    weapon(ctx, e, ux, uy) {
      const cl = PAL(ctx, 'claw', '#cfd3da'), bd = PAL(ctx, 'clawBlood', '#a01020');
      if (!cl) return;
      const g = ctx.g, px = -uy, py = ux, A = (d, s) => [e[0] + ux * d + px * s, e[1] + uy * d + py * s];
      for (const s of [-5.5, 0, 5.5]) {
        const L = s ? 27 : 32, bend = 3.5;                                    // 真ん中の爪がいちばん長い。少し内へ曲がる
        g.beginPath();
        g.moveTo(...A(2, s - 2.2));
        g.quadraticCurveTo(...A(L * 0.6, s - 1.6), ...A(L, s + bend));
        g.quadraticCurveTo(...A(L * 0.6, s + 1.6), ...A(2, s + 2.2));
        g.closePath();
        const p0 = A(2, s), p1 = A(L, s + bend);
        g.fillStyle = bd ? ctx.LG(p0[0], p0[1], p1[0], p1[1], ctx.K(cl, 0.1), ctx.K(cl, -0.15), ctx.C(bd)) : ctx.K(cl, 0);
        g.fill();
        ctx.ol(1.4);
      }
    }
  },
  'ツキハ': {
    // 闇の魔法少女: 黒紫のドレス(コルセット・ふくらみ袖・二段スカート・短いマント)、長手袋とブーツ、
    //               銀髪ロング+前髪、後ろの大きなリボンと小さなティアラ、赤い瞳、三日月のステッキ
    body: {
      // ---- 大きさ (px) ----
      scale: 0.75,               // 全体の大きさ (見た目・当たり判定の両方)
      headRadius: 13,          // 頭の半径
      handRadius: 6,           // 手の半径
      torsoLength: 40,         // 胴の長さ
      torsoWidth: 12,          // 胴の太さ
      upperArm: { length: 25, width: 6 },   // 上腕の長さ・太さ
      lowerArm: { length: 24, width: 6, band: { color: '#c03a8a', from: 0.08, to: 0.2, pad: 1.5 } }, // 前腕の長さ・太さ(手袋の口の飾り)
      thighLength: 35,         // 太ももの長さ
      shinLength: 40,          // すねの長さ
      legWidth: 8,            // 脚の太さ
      thighWidth: 8,   // 太ももの太さ(省略時 legWidth)
      shinWidth: 6,    // すねの太さ(省略時 legWidth)

      // ---- 色 ----
      pantsColor: '#16111e',   // 黒いタイツ
      beltColor: '#c03a8a',    // 腰のリボン
      buckleColor: '#ff7ac0',
      sleeves: true,           // ふくらみ袖(ドレスの色)
      foreArmColor: '#16111e', // 黒い長手袋
      handColor: '#16111e',
      shoesColor: '#3a1a3a',   // ブーツ

      // ---- 形 ----
      torsoType: "hourglass",
      armType: "puffSleeve",   // ふくらみ袖
      armBand: null,
      hand: "normal",
      handOutline: false,
      shoeLegCover: true,      // ブーツ(すねまで)
      legPatch: false,
      armDecoration: false,
      belt: false, 
    },

    headShape: 'illustGirl', // 顔の形: イラストの女の子(すっきりした細いV字・少しとがったあご先)
    hair: [
      { type: "long",  color: '#e9e2f5', length: 0.95, wave: 0.25, volume: 5 },
      { type: "bangs", color: "#e9e2f5", length: 0.6, partY: -1, sideburn: 1.1 }
    ],
    headgear: [
      { type: 'ribbon', color: '#c03a8a' },                                   // 後ろの大きなリボン(なびく)
      { type: 'crown', color: '#b9a6d8', width: 0.5, height: 0.45, gem: '#ff4fa0' } // 小さなティアラ
    ],
    faceDeco: [
      { type: 'star', x: 0.3, y: 0.25, size: 0.6, color: '#c03a8a' }        // 目の下の星のしるし
    ],
    clothes: [
      { type: 'cape', color: '#1a0f24', trim: '#c03a8a', clasp: '#ff4fa0', length: 0.55, flare: 8, fadeBy: 'wing' }, // 短いマント(羽が生えている間は消える)
      { type: 'skirt', color: '#5a2a6a', length: 0.5, flare: 13, waist: 0.2},           // 下のスカート(紫)
      { type: 'skirt', color: '#2a1838', trim: '#c03a8a', length: 0.38, flare: 10, waist: 0.2} // 上のスカート(黒紫・縁取り)
    ],

    nose: "girl",            // イラストの女の子の鼻(鼻先の突き出しが小さい)
    eyes: {
      type: "anime",
      color: '#d0305a',        // 赤い瞳
      x: 0.6,
      y: 0.1,
      size: 1,
      width: 1,
      height: 0.85             // 少し細めで、すました目つき
    },
    brows: false,
    mouth: {
      closed: "small",         // ふだんは不敵な笑み
      open: "fang",            // 攻撃・やられで小さな牙
      x: 0.65,
      y: 0.58,                 // あごを短くした分、少し上へ
      size: 0.8,
      width: 0.6,
      height: 1,
      lineWidth: 1,
      color: "#3a1020",
      openColor: "#6a1818"
    },

    // 羽が生えている間(夢幻蝶)、動くと羽から舞い散る、きらきら光る粉(effect.js の「移動中のきらきら光る粉塵」)
    moveDust: { color: '#ff7ac0', color2: '#e9d8ff', rate: 1.6, size: 1, life: 40, from: 0.45, to: 0.95, behind: 16, when: 'wing' },

    // 胸元: コルセットの編み上げと、大きなリボン
    torso(ctx) {
      const { P, hw } = ctx;
      // コルセット(腰〜胸の下)を少し暗く
      const corset = PAL(ctx, 'corset', '#1a0f24'), acc = PAL(ctx, 'accent', '#c03a8a'), gem = PAL(ctx, 'gem', '#ff4fa0');
      ctx.poly([P(0.04, hw * 0.95), P(0.55, hw * 0.98), P(0.55, -hw * 0.6), P(0.04, -hw * 0.6)]);
      ctx.g.fillStyle = ctx.K(corset, 0);
      ctx.g.fill();
      ctx.ol(2);
      // 編み上げのひも(×字)
      for (let i = 0; i < 4; i++) {
        const t0 = 0.08 + i * 0.11, t1 = t0 + 0.11;
        ctx.line(P(t0, hw * 0.55), P(t1, hw * 0.9), 1.4, ctx.C(acc));
        ctx.line(P(t0, hw * 0.9), P(t1, hw * 0.55), 1.4, ctx.C(acc));
      }
      // 胸のリボン
      const c = P(0.86, hw * 0.88);
      for (const s of [-1, 1]) {
        ctx.g.fillStyle = ctx.C(acc);
        ctx.g.beginPath();
        ctx.g.ellipse(c[0] + s * 5, c[1], 5.5, 3.5, s * 0.4, 0, 7);
        ctx.g.fill();
        ctx.ol(1.5);
      }
      ctx.line(c, [c[0] - 3, c[1] + 9], 2.4, ctx.C(acc));
      ctx.line(c, [c[0] + 3, c[1] + 9], 2.4, ctx.C(acc));
      ctx.dot(c[0], c[1], 2.6, ctx.C(gem));
    },

    // 背中の黒い蝶の羽: 夢幻蝶(c1)を出している間だけ生えて、技が終わると縮んで消える
    back(ctx) {
      const p = ctx.p, m = ctx.mem;
      if (!m) return;
      const on = p && p.st === 'atk' && p.mv && p.mv.k === 'c1';
      // 出し入れをなめらかに: 生える時は 4F ほど、消える時は 6F ほどで(技がやられ・着地で終わっても急に消えない)
      const dt = m.wingFr == null ? 1 : Math.max(0, Math.min(3, fr - m.wingFr));
      m.wingFr = fr;
      m.wing = Math.max(0, Math.min(1, (m.wing || 0) + (on ? 0.25 : -0.17) * dt));
      if (m.wing <= 0.01) return;
      const k = 1 - (1 - m.wing) * (1 - m.wing);                      // 大きさ(ふわっと開く)
      const open = on ? 0.5 + 0.5 * Math.sin(fr * 0.32) : 1;           // 蝶のはばたき(羽を開いたり閉じたり)
      // 正面らしさ: 体の向き 0(真横)〜2(まあまあ正面)は横向きの翼、3(正面)に近づくほど両側に広がる翼へ
      const sym = ctx.G ? ctx.G.sym : 0, hw = ctx.hw,
        fr2 = Math.max(0, Math.min(1, (sym - 0.6) / 0.4)), front = fr2 * fr2 * (3 - 2 * fr2),
        fs = 1 + 0.7 * front;                                        // 横向きほど翼の横幅が縮む(奥行き方向へ広がっているので)
      // 奥の翼 → 手前の翼。横向きでは、奥の翼は少し上・前寄りに重なって見える。正面では手前の翼は反対側(前側)へ広がる
      const open2 = on ? 0.5 + 0.5 * Math.sin(fr * 0.32 - 0.5) : 1;   // 奥の羽は少し遅れてはばたく
      drawLilithWing(ctx, ctx.P(0.86 + 0.06 * (1 - front), -hw * (0.4 - 0.25 * (1 - front))), k * 0.9, open2, -1, true, fs);
      drawLilithWing(ctx, ctx.P(0.82, -hw * 0.85), k, open, front > 0.5 ? 1 : -1, false, fs);
    },

    // 三日月のステッキ
    weapon(ctx, e, ux, uy) {
      const px = -uy, py = ux, A = (d, s = 0) => [e[0] + ux * d + px * s, e[1] + uy * d + py * s];
      // 柄(黒に紫の巻き)
      ctx.line(A(-16), A(40), 5.5, '#111');
      const shaft = PAL(ctx, 'staff', '#2a1838'), acc = PAL(ctx, 'accent', '#c03a8a'), gem = PAL(ctx, 'gem', '#ff4fa0'),
        moon = PAL(ctx, 'moon', '#b9a6d8'), moon2 = PAL(ctx, 'moon2', '#6a4a9a'), aura = PAL(ctx, 'aura', 'rgba(255,120,200,.45)');
      ctx.line(A(-16), A(40), 3.2, ctx.K(shaft, 0));
      for (const d of [-8, 8, 24]) ctx.line(A(d - 2, -2), A(d + 2, 2), 1.6, ctx.C(acc));
      ctx.dot(...A(-17), 3, ctx.C(gem));
      // 三日月(先端)
      const o = A(52), r = 11, ang = Math.atan2(uy, ux);
      ctx.g.fillStyle = ctx.RG(o[0], o[1], 1, r * 2.2, aura, 'rgba(160,60,200,0)');
      ctx.g.beginPath();
      ctx.g.arc(o[0], o[1], r * 2.2, 0, 7);
      ctx.g.fill();
      ctx.g.save();
      ctx.g.translate(o[0], o[1]);
      ctx.g.rotate(ang - Math.PI / 2);
      ctx.g.beginPath();
      ctx.g.arc(0, 0, r, Math.PI * 0.15, Math.PI * 1.85);
      ctx.g.arc(r * 0.45, 0, r * 0.78, Math.PI * 1.75, Math.PI * 0.25, true);
      ctx.g.closePath();
      ctx.g.fillStyle = ctx.LG(-r, 0, r, 0, ctx.K(moon, 0.2), ctx.K(moon2, 0));
      ctx.g.fill();
      ctx.ol(2);
      ctx.g.restore();
      // 月の中の宝石
      ctx.dot(o[0] + ux * 2, o[1] + uy * 2, 3.6 + 1.2 * olScale(), '#111');
      ctx.dot(o[0] + ux * 2, o[1] + uy * 2, 3.6, ctx.C(gem));
      ctx.dot(o[0] + ux * 2 - 1, o[1] + uy * 2 - 1, 1.2, '#fff');
      ctx.line(A(40), A(43), 6, '#111');
      ctx.line(A(40), A(43), 4, ctx.C(moon));
    }
  },


    'リナ': {
    body: {
      // ---- 大きさ (px) ----
      scale: 0.85,               // 全体の大きさ (見た目・当たり判定の両方)
      headRadius: 13,          // 頭の半径
      handRadius: 6,           // 手の半径
      torsoLength: 38,         // 胴の長さ
      torsoWidth: 12,          // 胴の太さ
      upperArm: { length: 25, width: 6 },   // 上腕の長さ・太さ
      lowerArm: { length: 24, width: 6, band: { color: '#ffe14a', from: 0.78, to: 0.9, pad: 1.2 } },   // 前腕の長さ・太さ(袖口に黄色いライン)
      thighLength: 30,         // 太ももの長さ
      shinLength: 35,          // すねの長さ
      legWidth: 13,           // 脚の太さ
      thighWidth: 12,   // 太ももの太さ(省略時 legWidth)
      shinWidth: 5,    // すねの太さ(省略時 legWidth)

      // ---- 色 ----
      pantsColor: '#f2c79c',   // 素足
      beltColor: '#f2c79c',
      sleeves: true,           // true=上腕が服の色(袖あり) / false=上腕が肌の色
      foreArmColor: '#f2c79c',
      handColor: '#1a1820',    // 黒いグローブ
      shoesColor: '#1f1d26',   // 黒いロングブーツ

      // ---- 服 ----
      top: { type: 'jacket', color: '#1d1b24', inner: '#2e2c38' },   // 黒いライダースジャケット + 中に黒いシャツ(稲妻の柄は torso で描く)

      // ---- 形 ----
      torsoType: "hourglass",
      armBand: null,
      hand: "normal",
      handOutline: true,
      shoeLegCover: true,      // ブーツ(すねまで)
      legPatch: false,
      armDecoration: false,
      belt: false, 
    },

    
    headShape: 'animeGirl',  // 顔の形: アニメの女の子(丸い頬・小さく短いあご先)
    hair: [
      { type: "twinTails",  color: '#ebf579', length: 1.5, wave: 0.25, volume: 5 },
      { type: "bangs", color: "#ebf579", length: 0.6, partY: -1, part: 0.1,sideburn: 1.1 }
    ],
    faceDeco: [],
    clothes: [
      { type: 'skirt', color: '#262431', trim: '#ffe14a', length: 0.2, flare: 10, waist: 0.4 } // 黒いプリーツのミニスカート(黄色い縁)。waist=はく高さ
    ],
    nose: "Rina",            // イラストの女の子の鼻(鼻先の突き出しが小さい)
    eyes: {
      type: "anime",
      color: '#00f2ff',        // 赤い瞳
      x: 0.6,
      y: 0.1,
      size: 1.1,
      width: 1,
      height: 0.75             // 少し細めで、すました目つき
    },
    brows: false,
    mouth: {
      closed: "flat",
      open: "wide",
      x: 0.55,
      y: 0.55,                 // あごを短くした分、少し上へ
      size: 0.9,
      width: 0.4,
      height: 1,
      lineWidth: 1,
      color: "#3a1020",
      openColor: "#6a1818"
    },
    // シャツの稲妻の柄・胸の安全ピン
    torso(ctx) {
      const { P, hw, g } = ctx, Y = ctx.C(PAL(ctx, 'bolt', '#ffe14a'));
      // 稲妻(シャツの胸。ジャケットの開いた所に見える)
      ctx.poly([P(0.86, hw * 0.55), P(0.66, hw * 0.92), P(0.66, hw * 0.7), P(0.46, hw * 0.98), P(0.62, hw * 0.62), P(0.62, hw * 0.8)]);
      g.fillStyle = Y; g.fill(); ctx.ol(1.2);
      // 胸ポケットのファスナー(斜めの線)
      ctx.line(P(0.68, -hw * 0.05), P(0.8, hw * 0.25), 1.4, '#9aa0aa');
    },

    // ヘッドホン(首にかけている)。体の向き(姿勢配列の body)に合わせて回る(drawNeckHeadphones)
    //   うなじ側は back(首・胴より奥)、首の前側とイヤーカップは shoulder(手前の腕より後。肩の上に乗っている)で描く
    back(ctx) { if (PAL(ctx, 'phones', '#2a2833')) drawNeckHeadphones(ctx, 'back', { color: PAL(ctx, 'phones', '#2a2833'), accent: PAL(ctx, 'phonesAccent', '#ffe14a') }); },
    shoulder(ctx) { if (PAL(ctx, 'phones', '#2a2833')) drawNeckHeadphones(ctx, 'front', { color: PAL(ctx, 'phones', '#2a2833'), accent: PAL(ctx, 'phonesAccent', '#ffe14a') }); },

    // エレキギター: 手でネックを持ち、ボディが先(振り回して殴る)。ボルテージがたまるとボディから火花が散る
    weapon(ctx, e, ux, uy) {
      const { g } = ctx, px = -uy, py = ux, A = (d, s = 0) => [e[0] + ux * d + px * s, e[1] + uy * d + py * s];
      const body = PAL(ctx, 'guitar', '#ffe14a'), dark = PAL(ctx, 'guitarDark', '#1a1424'), pick = '#111';
      // ヘッド(握った手のすぐ後ろ。腕に重ならないよう短く)
      ctx.poly([A(-11, -2.6), A(-5, -3), A(-5, 3), A(-11, 3.4)]);
      g.fillStyle = ctx.K(dark, 0); g.fill(); ctx.ol(1.4);
      // ネック(指板とフレット)
      ctx.line(A(-6), A(32), 6.5, '#111');
      ctx.line(A(-6), A(32), 4.5, ctx.K('#5a3a22', 0));
      for (let d = 0; d <= 28; d += 5) ctx.line(A(d, -2), A(d, 2), 0.8, '#ccc');
      // ボディ: 上の丸(小)と下の丸(大)をつないだ形。角のようにとがった電気ギター
      const B = (d, s) => A(d, s);
      g.beginPath();
      { const p0 = B(30, -6); g.moveTo(p0[0], p0[1]); }
      for (const [c1, c2, en] of [
        [[34, -15], [44, -13], [46, -9]],        // 上の丸
        [[48, -6], [50, -8], [55, -15]],         // 角(ツノ)
        [[62, -14], [66, -8], [64, 0]],          // 下の丸(先)
        [[63, 10], [54, 15], [46, 12]],
        [[42, 10], [38, 14], [32, 9]],
        [[29, 6], [29, -2], [30, -6]],
      ]) { const a = B(...c1), b = B(...c2), c = B(...en); g.bezierCurveTo(a[0], a[1], b[0], b[1], c[0], c[1]); }
      g.closePath();
      { const a = A(30, -12), b = A(64, 12); g.fillStyle = ctx.LG(a[0], a[1], b[0], b[1], ctx.K(body, 0.2), ctx.K(body, -0.15)); }
      g.fill();
      ctx.ol(2);
      // 稲妻のデザイン
      ctx.poly([A(40, -8), A(48, -1), A(45, 0), A(56, 8), A(46, 3), A(49, 2)]);
      g.fillStyle = ctx.K(dark, 0); g.fill();
      // ピックアップとブリッジ
      ctx.line(A(38, -4), A(38, 4), 3, pick);
      ctx.line(A(46, -4), A(46, 4), 3, pick);
      ctx.line(A(55, -3.5), A(55, 3.5), 2.2, '#aaa');
      // 弦
      for (const s of [-1.3, 0, 1.3]) ctx.line(A(-6, s), A(55, s), 0.5, 'rgba(255,255,255,.75)');
      // ボルテージ: たまっていると、ボディから小さな稲妻が走る
      const p = ctx.p, V = p && p.ch && p.ch.vt, r = V ? (p.volt || 0) / V.max : 0;
      if (r >= 0.5 && typeof fr !== 'undefined' && fr % (r >= 1 ? 3 : 7) === 0) {
        let q = A(50 + Math.random() * 12, (Math.random() - 0.5) * 20);
        g.beginPath(); g.moveTo(q[0], q[1]);
        for (let k = 0; k < 3; k++) { q = [q[0] + (Math.random() - 0.5) * 14, q[1] + (Math.random() - 0.5) * 14]; g.lineTo(q[0], q[1]); }
        g.strokeStyle = r >= 1 ? '#fff' : body; g.lineWidth = 1.6; g.stroke();
      }
    }
  },

  // ルリ … 水流使いの身軽な少女格闘家。白と水色の冒険者の服・濃紺のショートパンツ・片側だけの腰布・手首の水流の装具
  //   palette: hair / hairTip(髪の根元・毛先) / cloth / clothTrim(腰布) / strap(肩のベルト) / gem(胸と装具のしずく)
  'ルリ': {
    body: {
      // ---- 大きさ (px) ----
      scale: 0.84,
      headRadius: 13,
      handRadius: 6.5,
      torsoLength: 35,
      torsoWidth: 13,
      upperArm: { length: 23, width: 6.5, sleeve: { color: '#8fe0f2', cover: 0.55, cuff: 2, trim: '#ffffff' } },   // 水色の半袖
      lowerArm: { length: 22, width: 6.5, sleeve: false,
        band: { color: '#46c4ee', from: 0.6, to: 0.95, pad: 2.2, rivet: '#e8ffff' } },                              // 手首の水流の装具(水色の腕甲)
      thighLength: 28,
      shinLength: 31,
      legWidth: 11,
      thighWidth: 10,
      shinWidth: 4,

      // ---- 色 ----
      pantsColor: '#ffe4d0',   // 素足
      beltColor: '#1d2b5c',
      buckleColor: '#7fe6ff',
      sleeves: true,
      foreArmColor: '#ffe4d0',
      handColor: '#f4f9fc',    // 白い指なしグローブ
      shoesColor: '#eef3f9',   // 白い軽いブーツ

      // ---- 服 ----
      top: { type: 'vest', color: '#f7fbff', inner: '#8fe0f2', buttons: 2, button: '#46c4ee' },   // 白いベスト + 水色のシャツ
      bottom: { type: 'shorts', color: '#1d2b5c', hem: 0.38 },                                    // 濃紺のショートパンツ

      // ---- 形 ----
      torsoType: 'slim',
      armBand: null,
      hand: 'normal',
      handOutline: true,
      shoeLegCover: true,      // ブーツ(すねまで)
      legPatch: false,
      armDecoration: false,
    },

    headShape: 'Ruri',
    hair: [
      'ruri',                                                                                   // 頭をおおう髪・ギザギザの後ろ髪・斜めの前髪・長いもみあげ(毛先が水色)
    ],
    faceDeco: [],
    clothes: [],
    nose: 'Ruri',
    eyes: { type: 'anime', color: '#22e0cc', x: 0.6, y: 0.08, size: 1.15, width: 1, height: 0.9 },   // 明るいターコイズの大きな目
    brows: false,
    mouth: { closed: 'smile', open: 'grin', x: 0.55, y: 0.55, size: 0.9, width: 0.45, height: 1, lineWidth: 1, color: '#3a1020', openColor: '#7a1c24' },   // いたずらっぽい笑顔

    // 斜めがけのベルトと、胸のしずくの飾り
    torso(ctx) {
      const { P, hw, g } = ctx, st = PAL(ctx, 'strap', '#1d2b5c'), gem = PAL(ctx, 'gem', '#5fe0ff');
      if (st) {                                                            // 斜めがけのベルト(スキンの palette で strap: null なら無し)
        ctx.line(P(0.97, hw * 0.75), P(0.2, -hw * 0.75), 3.2, '#111');
        ctx.line(P(0.97, hw * 0.75), P(0.2, -hw * 0.75), 2, ctx.K(st, 0));
      }
      if (!gem) return;
      const o = P(0.74, hw * 0.42);                                        // しずくの形(とがった方が上)
      g.beginPath();
      g.moveTo(o[0], o[1] - 5.5);
      g.quadraticCurveTo(o[0] + 4, o[1] - 0.5, o[0] + 3, o[1] + 1.8);
      g.arc(o[0], o[1] + 1.8, 3, 0, Math.PI);
      g.quadraticCurveTo(o[0] - 4, o[1] - 0.5, o[0], o[1] - 5.5);
      g.fillStyle = ctx.C(gem); g.fill(); ctx.ol(1.2);
      ctx.dot(o[0] - 1, o[1] + 0.5, 1, '#fff');
    },

    // 片側だけの腰布(物理でなびく)。手前の腰から垂れる、すそが斜めに切れた布
    //   手前の脚より上に重ねたいので、脚のあとに描かれる extraCollar で描く
    extraCollar(ctx) {
      const { P, hw, g } = ctx, c = PAL(ctx, 'cloth', '#7fd6ee'), trim = PAL(ctx, 'clothTrim', '#ffffff');
      if (!c) return;                                                      // スキンの palette で cloth: null なら腰布なし
      const o = { n: 4, stiff: [0.3, 0.03], damp: 0.07, flutter: 1, collide: 'none', r: 2 };
      const L = ctx.strand('wcloth0', P(0.07, -hw * 0.05), { ...o, len: 18, dir: [0, 18], seed: 0.4 }),     // 前側の端(短い)
        R = ctx.strand('wcloth1', P(0.07, -hw * 1.0), { ...o, len: 29, dir: [-5, 29], seed: 1.7 });    // 後ろ側の端(長い) … すそが斜めになる
      const n = L.length - 1;
      g.beginPath();
      g.moveTo(L[0][0], L[0][1]);
      for (let i = 1; i <= n; i++) g.lineTo(L[i][0], L[i][1]);
      const m = [(L[n][0] + R[n][0]) / 2 + 2, (L[n][1] + R[n][1]) / 2 + 3];   // すそは少しふくらむ
      g.quadraticCurveTo(m[0], m[1], R[n][0], R[n][1]);
      for (let i = n - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1]);
      g.closePath();
      g.fillStyle = ctx.C(c); g.fill(); ctx.ol(1.8);
      g.beginPath(); g.moveTo(L[n][0], L[n][1]); g.quadraticCurveTo(m[0], m[1], R[n][0], R[n][1]);   // すその縁
      g.strokeStyle = ctx.C(trim); g.lineWidth = 2.6; g.stroke();
      for (const t of [0.35, 0.68]) {                                      // ひだ
        const a = [L[0][0] + (R[0][0] - L[0][0]) * t, L[0][1] + (R[0][1] - L[0][1]) * t],
          b = [L[n][0] + (R[n][0] - L[n][0]) * t, L[n][1] + (R[n][1] - L[n][1]) * t];
        ctx.line(a, b, 1.1, 'rgba(0,40,80,.28)');
      }
    },
  },
  // アサカ(朝華) … ツキハ(月葉)の対になる陽光の魔法少女。薄いオレンジのサイドテール(花の髪飾り)、青い目、
  //   白と黄色のドレス(ふくらみ袖・二段スカート・胸の太陽のブローチ)、背中の光の花びらの羽、白いハイソックス、太陽と花びらのタクト
  'アサカ': {
    body: {
      // ---- 大きさ (px) ----
      scale: 0.76,
      headRadius: 13,
      handRadius: 6,
      torsoLength: 39,
      torsoWidth: 12,
      upperArm: { length: 24, width: 6 },
      lowerArm: { length: 23, width: 6, band: { color: '#ffd84a', from: 0.84, to: 0.96, pad: 1.6 } },   // 手首の黄色いフリル
      thighLength: 33,
      shinLength: 38,
      legWidth: 8,
      thighWidth: 8,
      shinWidth: 5.5,

      // ---- 色 ----
      pantsColor: '#ffe8d4',   // 素足
      beltColor: '#ffb02a',    // 腰のリボン
      buckleColor: '#fff6c0',
      sleeves: true,           // ふくらみ袖(ドレスの色)
      foreArmColor: '#ffe8d4', // 素手(ツキハの黒い長手袋の逆)
      handColor: '#ffe8d4',
      shoesColor: '#f0a030',   // オレンジの靴

      // ---- 服 ----
      bottom: { type: 'socks', sock: '#ffffff', top: 0.06, trim: '#ffc83a' },   // 白いハイソックス(はき口に黄色い線)

      // ---- 形 ----
      torsoType: 'hourglass',
      armType: 'puffSleeve',
      armBand: null,
      hand: 'normal',
      handOutline: false,
      shoeLegCover: false,
      legPatch: false,
      armDecoration: false,
      belt: false,
    },

    headShape: 'illustGirl',  // 丸い頬・小さなあご(ツキハの大人っぽい顔の逆で、元気な丸顔)
    hair: [
      { type: 'bangs', color: '#ffbf80', length: 0.6, partY: -1, sideburn: 0.9 },
      { type: 'sideTail', color: '#ffbf80', length: 1.0, volume: 5, y: -0.7, flower: '#ffd84a', tie: '#ff8a3a', cap: false },   // 薄いオレンジのサイドテール(右の側頭部で結ぶ。花の髪飾り)。前髪の上に描くので後ろに書く
    ],
    faceDeco: [
      { type: 'star', x: 0.3, y: 0.25, size: 0.55, color: '#ffb02a' },        // 目の下の星のしるし(ツキハとおそろいで、色は金)
    ],
    clothes: [
      { type: 'skirt', color: '#ffffff', length: 0.46, flare: 14, waist: 0.2 },                  // 下のスカート(白いペチコート)
      { type: 'skirt', color: '#ffc43a', trim: '#ffffff', length: 0.36, flare: 12, waist: 0.2 },  // 上のスカート(黄色・白い縁)
    ],
    nose: 'girl',
    eyes: { type: 'anime', color: '#2f7fe0', x: 0.6, y: 0.1, size: 1.1, width: 1, height: 1 },   // 青い大きな丸い目
    brows: false,
    mouth: { closed: 'smile', open: 'wide', x: 0.6, y: 0.57, size: 0.85, width: 0.5, height: 1, lineWidth: 1, color: '#3a1a10', openColor: '#8a2a20' },

    // 動くと、羽から光の粉が舞う(いつでも)
    moveDust: { color: '#ffe27a', color2: '#ffffff', rate: 0.8, size: 0.9, life: 34, from: 0.55, to: 0.95, behind: 14 },

    // 胸元: 黄色い胴着(白いレースの縁)と、太陽のブローチ
    //   palette: bodice(胴着) / lace(レース) / brooch(ブローチ。null で無し)
    torso(ctx) {
      const { P, hw, g } = ctx, bod = PAL(ctx, 'bodice', '#ffd84a'), lace = PAL(ctx, 'lace', '#ffffff'), br = PAL(ctx, 'brooch', '#ff9a3a');
      if (bod) {
        ctx.poly([P(0.04, hw * 0.95), P(0.58, hw * 0.98), P(0.58, -hw * 0.6), P(0.04, -hw * 0.6)]);
        g.fillStyle = ctx.K(bod, 0);
        g.fill();
        ctx.ol(1.8);
        for (const t of [0.58, 0.04]) ctx.line(P(t, -hw * 0.6), P(t, hw * 0.98), 1.8, ctx.C(lace));     // 上下の白い縁
        for (let i = 0; i < 3; i++) ctx.dot(...P(0.14 + i * 0.15, hw * 0.78), 1.4, ctx.C(lace));        // 前の白いボタン
      }
      if (!br) return;
      const c = P(0.82, hw * 0.82);                                          // 太陽のブローチ(光の筋8本 + 宝石)
      g.fillStyle = ctx.C('#ffc83a');
      g.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2, r = i % 2 ? 3.6 : 7;
        g.lineTo(c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r);
      }
      g.closePath();
      g.fill();
      ctx.ol(1.3);
      ctx.dot(c[0], c[1], 3.2, ctx.C(br));
      ctx.dot(c[0] - 1, c[1] - 1, 1, '#fff');
    },

    // 背中の光の花びらの羽(いつも生えている)。天降花(c1)・超必殺技の間は大きく広がって明るくなる
    //   palette: wing(花びらの先) / wing2(根元)。wing: null で羽なし
    back(ctx) {
      const col = PAL(ctx, 'wing', '#ffd25a'), col2 = PAL(ctx, 'wing2', '#fffbe0');
      if (!col) return;
      const p = ctx.p, m = ctx.mem, hw = ctx.hw;
      const on = p && p.st === 'atk' && p.mv && (p.mv.k === 'c1' || p.mv.k === 'sx');
      let w = 0;
      if (m) {
        const dt = m.wingFr == null ? 1 : Math.max(0, Math.min(3, fr - m.wingFr));
        m.wingFr = fr;
        w = m.wing = Math.max(0, Math.min(1, (m.wing || 0) + (on ? 0.25 : -0.12) * dt));
      }
      const k = 1 + 0.45 * w;                                              // ふだんは小さめ、天降花で大きく
      const sym = ctx.G ? ctx.G.sym : 0, f2 = Math.max(0, Math.min(1, (sym - 0.6) / 0.4)), front = f2 * f2 * (3 - 2 * f2), fs = 1 + 0.6 * front;
      drawSunWing(ctx, ctx.P(0.84 + 0.05 * (1 - front), -hw * (0.35 - 0.2 * (1 - front))), k * 0.85, -1, true, fs, col, col2);
      drawSunWing(ctx, ctx.P(0.8, -hw * 0.8), k, front > 0.5 ? 1 : -1, false, fs, col, col2);
    },

    // 太陽と花びらのタクト: 白い柄・金の巻き、先に花びらに囲まれた太陽
    //   palette: tact(柄) / tactGold(金の飾り) / sun(太陽) / petal(花びら) / aura(先の光)
    weapon(ctx, e, ux, uy) {
      const { g } = ctx, px = -uy, py = ux, A = (d, s = 0) => [e[0] + ux * d + px * s, e[1] + uy * d + py * s];
      const shaft = PAL(ctx, 'tact', '#fffaf0'), gold = PAL(ctx, 'tactGold', '#e8a020'), sun = PAL(ctx, 'sun', '#ffc83a'),
        pet = PAL(ctx, 'petal', '#fff3c0'), aura = PAL(ctx, 'aura', 'rgba(255,210,90,.5)');
      ctx.line(A(-9), A(30), 5, '#111');                                      // 柄
      ctx.line(A(-9), A(30), 3, ctx.K(shaft, 0));
      for (const d of [-2, 6, 14]) ctx.line(A(d - 1.5, -1.8), A(d + 1.5, 1.8), 1.4, ctx.C(gold));
      ctx.dot(...A(-10), 2.8 + 1.2 * olScale(), '#111');
      ctx.dot(...A(-10), 2.8, ctx.C(gold));
      const o = A(37), ang = Math.atan2(uy, ux), spin = (typeof fr !== 'undefined' ? fr : 0) * 0.02;
      g.fillStyle = ctx.RG(o[0], o[1], 1, 22, aura, 'rgba(255,200,80,0)');   // 先の光
      g.beginPath();
      g.arc(o[0], o[1], 22, 0, 7);
      g.fill();
      for (let i = 0; i < 6; i++) {                                          // 花びら(6枚。ゆっくり回る)
        const a = ang + spin + (i / 6) * Math.PI * 2, cx = Math.cos(a), cy = Math.sin(a),
          b = [o[0] + cx * 4, o[1] + cy * 4], t = [o[0] + cx * 13, o[1] + cy * 13];
        g.beginPath();
        g.moveTo(...b);
        g.quadraticCurveTo(o[0] + cx * 9 - cy * 5, o[1] + cy * 9 + cx * 5, ...t);
        g.quadraticCurveTo(o[0] + cx * 9 + cy * 5, o[1] + cy * 9 - cx * 5, ...b);
        g.fillStyle = ctx.K(pet, 0);
        g.fill();
        ctx.ol(1.3);
      }
      ctx.line(A(29), A(31), 6, '#111');                                      // 太陽を留める金具
      ctx.line(A(29), A(31), 4, ctx.C(gold));
      ctx.dot(o[0], o[1], 6.2 + 1.3 * olScale(), '#111');                     // 太陽
      g.fillStyle = ctx.RG(o[0] - 1.5, o[1] - 1.5, 0.5, 6.2, '#fff6c8', ctx.K(sun, 0));
      g.beginPath();
      g.arc(o[0], o[1], 6.2, 0, 7);
      g.fill();
      ctx.dot(o[0] - 2, o[1] - 2, 1.4, '#fff');
    },
  },
  // メイ(と人形のロロ) … 呪いの人形遣い。ゴシックロリータ(黒いドレス・白いフリル・リボンのヘッドドレス)、
  //   薄紫の長い髪、ぎざぎざの長い前髪(毛束の間から赤紫の目がのぞく)。指に指輪をはめ、命じるだけでロロが自分で動く(糸ではつながっていない)
  //   ロロ(人形)の見た目は puppet.js の drawLoloBody。色は下の palette(lolo など)
  'メイ＆ロロ': {
    body: {
      // ---- 大きさ (px) ----
      scale: 0.76,
      headRadius: 13,
      handRadius: 5.5,
      torsoLength: 37,
      torsoWidth: 11.5,
      upperArm: { length: 23, width: 5.5 },
      lowerArm: { length: 22, width: 5, band: { color: '#ffffff', from: 0.86, to: 0.96, pad: 1.2 } },   // 手首の白いフリル
      thighLength: 33,
      shinLength: 37,
      legWidth: 8,
      thighWidth: 7.5,
      shinWidth: 5,

      // ---- 色 ----
      pantsColor: '#1a1420',   // 黒いタイツ
      beltColor: '#7a1a3a',    // 腰の臙脂のリボン
      buckleColor: '#d8b8ff',
      sleeves: true,           // ふくらみ袖(黒)
      foreArmColor: '#f6ece8', // 白い肌
      handColor: '#f6ece8',
      shoesColor: '#2a1a26',   // 黒いストラップシューズ

      // ---- 服 ----
      bottom: { type: 'socks', sock: '#1a1420', top: 0.1, trim: '#ffffff' },   // 黒いタイツ(はき口に白いレース)

      // ---- 形 ----
      torsoType: 'hourglass',
      armType: 'puffSleeve',
      armBand: null,
      hand: 'normal',
      handOutline: false,
      shoeLegCover: false,
      legPatch: false,
      armDecoration: false,
      belt: false,
    },

    headShape: 'illustGirl',
    hair: [
      { type: 'long', color: '#c8b4e8', length: 1.0, volume: 9, wave: 0.15, tip: 'point' },        // 薄紫の長い髪(腰まで)
      { type: 'jaggedBangs', color: '#c8b4e8', length: 0.5, count: 8, seed: 2, width: 0.2 },
      { type: 'sideburns', color: '#c8b4e8', length: 1, width: 1, count: 2, F: 0.0, top: 0.35 },   // 胸元まで垂れる長いもみあげ(顔の両側に2束ずつ)                // ぎざぎざの長い前髪。毛束の間から目が見える
    ],
    headgear: [
      { type: 'headdress', color: '#1a1420', frill: '#ffffff', bow: '#1a1420', knot: '#7a1a3a', tails: 11 },   // 黒いレースのヘッドドレス(白いフリル・横に小さなリボン)
    ],
    showEars: false,
    faceDeco: [],
    clothes: [
      { type: 'skirt', color: '#ffffff', length: 0.5, flare: 15, waist: 0.2 },                  // 白いパニエ(下のスカート)
      { type: 'skirt', color: '#1a1420', trim: '#ffffff', length: 0.42, flare: 13, waist: 0.2 }, // 黒いスカート(白いフリルの縁)
      { type: 'skirt', color: '#2a1c30', trim: '#7a1a3a', length: 0.22, flare: 9, waist: 0.2 },  // 上に重ねた短いスカート(臙脂の縁)
    ],
    nose: 'girl',
    eyes: { type: 'anime', color: '#b0206a', x: 0.6, y: 0.12, size: 1.15, width: 1, height: 0.85 },   // 赤紫の、少し伏せた目
    brows: false,
    mouth: { closed: 'small', open: 'o', x: 0.6, y: 0.58, size: 0.75, width: 0.4, height: 1, lineWidth: 1, color: '#3a1020', openColor: '#5a1a2a' },   // 小さく閉じた口(感情を見せない)

    // 呪いの粉: 動くと紫の小さな光が裾からこぼれる
    moveDust: { color: '#b070ff', color2: '#ffb3f0', rate: 0.35, size: 0.7, life: 30, from: 0.6, to: 1, behind: 8 },

    weaponGrip: false,
    palette: {
      thread: '#d8b8ff',                                                                       // 超必殺技の呪いの糸
      lolo: '#c9a7d8', loloDark: '#8a6aa0', loloPatch: '#e8d2a0', loloInner: '#f2e6ef',        // ロロの布・暗い所・つぎはぎ・耳の内側
      loloButton: '#2a2030', needle: '#d0d4dc', loloEye: '#ff3a8a',                            // ボタンの目・針・光る目
      bodice: '#1a1420', frill: '#ffffff', brooch: '#7a1a3a', gem: '#ff4aa0',
    },

    // 胸元: 黒い胴着(白い編み上げのひも)・白いフリルの襟・臙脂のリボンと赤紫の宝石
    torso(ctx) {
      const { P, hw, g } = ctx, bod = PAL(ctx, 'bodice', '#1a1420'), fr2 = PAL(ctx, 'frill', '#ffffff'), br = PAL(ctx, 'brooch', '#7a1a3a'), gem = PAL(ctx, 'gem', '#ff4aa0');
      ctx.poly([P(0.04, hw * 0.96), P(0.7, hw * 1.0), P(0.7, -hw * 0.7), P(0.04, -hw * 0.7)]);
      g.fillStyle = ctx.K(bod, 0);
      g.fill();
      ctx.ol(1.6);
      for (let i = 0; i < 4; i++) {                                         // 編み上げ(前のひものバツ印)
        const t = 0.1 + i * 0.13;
        ctx.line(P(t, hw * 0.55), P(t + 0.11, hw * 0.95), 1, ctx.C(fr2));
        ctx.line(P(t, hw * 0.95), P(t + 0.11, hw * 0.55), 1, ctx.C(fr2));
      }
      for (let i = 0; i < 5; i++) {                                         // 襟のフリル(白い小さな波)
        const a = P(0.86, hw * (1 - i * 0.42));
        ctx.dot(a[0], a[1], 3 + 1.4 * olScale(), '#111');
      }
      for (let i = 0; i < 5; i++) {
        const a = P(0.86, hw * (1 - i * 0.42));
        ctx.dot(a[0], a[1], 3, ctx.C(fr2));
      }
      if (!br) return;
      const c = P(0.8, hw * 0.85);                                          // 胸のリボン + 宝石
      for (const s of [-1, 1]) {
        g.beginPath();
        g.moveTo(c[0], c[1]);
        g.lineTo(c[0] + s * 6, c[1] - 3.5);
        g.lineTo(c[0] + s * 6, c[1] + 3.5);
        g.closePath();
        g.fillStyle = ctx.C(br); g.fill(); ctx.ol(1);
      }
      ctx.line(c, [c[0] - 2, c[1] + 8], 2, ctx.C(br));
      ctx.line(c, [c[0] + 2, c[1] + 8], 2, ctx.C(br));
      ctx.dot(c[0], c[1], 2.6 + olScale(), '#111');
      ctx.dot(c[0], c[1], 2.6, ctx.C(gem));
      ctx.dot(c[0] - 0.8, c[1] - 0.8, 0.8, '#fff');
    },

    // 指の輪(3本の指に細い指輪)
    //   palette: ring(指輪)
    weapon(ctx, e, ux, uy) {
      const { g } = ctx, ring = PAL(ctx, 'ring', '#e8d8ff'), px = -uy, py = ux;
      for (let i = 0; i < 3; i++) {
        const s = (i - 1) * 2.4, o = [e[0] + ux * 3.5 + px * s, e[1] + uy * 3.5 + py * s];
        g.beginPath(); g.arc(o[0], o[1], 1.4, 0, 7);
        g.strokeStyle = ctx.C(ring); g.lineWidth = 1; g.stroke();
      }
    },

  },

  // ============================================================
  //  新しい5人の見た目
  // ============================================================
  // ハヤテ(疾風) … 風の舞い手の青年。青緑の高いポニーテール、白い長いマフラー、深緑の袖なし羽織に生成りの袴、
  //   腰に長くなびく帯。手には鉄扇(開くと半円。疾風突きのときは閉じる)
  'ハヤテ': {
    body: {
      scale: 0.95,
      headRadius: 12.5,
      handRadius: 7,
      torsoLength: 35,
      torsoWidth: 17,
      upperArm: { length: 24, width: 7.5 },
      lowerArm: { length: 23, width: 7, wrap: { color: '#eef8f2', stripe: '#9cc8b8', from: 0.5, to: 0.95, count: 3 } },   // 手首に白い布を巻く
      thighLength: 25,
      shinLength: 25,
      legWidth: 11,
      thighWidth: 12,
      shinWidth: 9,
      pantsColor: '#e8e2cc',
      beltColor: '#2f8a72',
      buckleColor: false,
      sleeves: false,
      foreArmColor: '#f4d2b0',
      handColor: '#f4d2b0',
      shoesColor: '#6a4a2a',
      top: { type: 'vest', color: '#2f7a66', inner: '#eef8f2', buttons: 0 },
      bottom: { type: 'wide', color: '#e8e2cc', flare: 1.7 },
      torsoType: 'slim',
      armType: 'standard',
      armBand: null,
      hand: 'normal',
      handOutline: true,
      shoeLegCover: false,
      legPatch: false,
      armDecoration: false,
    },
    headShape: 'standard',
    hair: [
      { type: 'ponytail', color: '#2f6f68', length: 0.95, y: -0.75, volume: 6, tie: '#eef8f2', back: 1 },
      { type: 'bangs', style: 'side', color: '#2f6f68', length: 0.45, sideburn: 0.55, partY: 0.2 },
    ],
    headgear: [],
    faceDeco: [{ type: 'line', from: [0.42, 0.18], to: [0.62, 0.3], w: 1.6, color: '#2f9a80' }],   // 目の下の風のしるし
    clothes: [{ type: 'scarf', color: '#f4fbf8', color2: '#cfeee2', length: 54, flutter: 1.6 }],
    nose: 'small',
    eyes: { type: 'sharp', x: 0.6, y: -0.05, size: 1, width: 1.05, height: 0.9 },
    brows: { type: 'straight', thickness: 2, color: '#1f4f48' },
    mouth: { closed: 'smirk', open: 'oval', x: 0.6, y: 0.55, size: 0.85 },
    moveDust: { color: '#bff5e6', color2: '#ffffff', rate: 0.45, size: 0.8, life: 26, from: 0.3, to: 0.9, behind: 18 },
    weaponGrip: { angle: 80, aim: true },
    palette: { fan: '#4fbfa0', fan2: '#eefff8', rib: '#3a2a1a', sash: '#2f8a72' },

    // 胸: 羽織の合わせ目の白い紐
    torso(ctx) {
      const { P, hw } = ctx, c = PAL(ctx, 'cord', '#eef8f2'), ks = PAL(ctx, 'kesa', null);
      if (c) { ctx.line(P(0.55, hw * 0.75), P(0.5, hw * 1.0), 2, ctx.C(c)); ctx.dot(...P(0.5, hw * 1.0), 2.2, ctx.C(c)); }
      if (ks) drawKesa(ctx, ks);                                            // 山伏の結袈裟(スキン)
    },
    back(ctx) { const wb = PAL(ctx, 'windbag', null); if (wb) drawWindBag(ctx, wb); },   // 風神の風袋(スキン)
    headFront(ctx) { const tk = PAL(ctx, 'tokin', null); if (tk) drawTokin(ctx, tk); },  // 山伏の頭襟(スキン)
    // 腰の帯: 長い2本の垂れが風になびく
    waist(ctx, b, tr, wv) {
      const col = PAL(ctx, 'sash', '#2f8a72');
      [[-16, 22, 0], [-10, 30, -0.18]].forEach(([dx, dy, dim], k) => {
        const pts = ctx.strand('hsash' + k, b, { len: Math.hypot(dx, dy) * 1.15, n: 5, dir: [dx, dy], stiff: [0.25, 0.01], damp: 0.06, flutter: 1.3, seed: k * 1.7 + 0.4, collide: 'back', r: 2 });
        strandRibbon(ctx, pts, 4.5, 3.2, ctx.K(col, dim), true);
      });
    },
    // 鉄扇: こぶしを要(かなめ)に、技の方向へ半円に開く(疾風突き・空舞いの間は閉じて1本の棒)
    weapon(ctx, e, ux, uy) {
      if (PAL(ctx, 'feather', null)) return drawFeatherFan(ctx, e, ux, uy, PAL(ctx, 'feather', '#fff'), PAL(ctx, 'feather2', '#ddd'));   // 羽団扇(スキン)
      const { g } = ctx, p = ctx.p, closed = p && p.st === 'atk' && p.mv && /^(da|c2)$/.test(p.mv.k);
      const fan = PAL(ctx, 'fan', '#4fbfa0'), fan2 = PAL(ctx, 'fan2', '#eefff8'), rib = PAL(ctx, 'rib', '#3a2a1a');
      const a0 = Math.atan2(uy, ux), R = 30, span = closed ? 0.12 : 1.55;
      if (closed) {
        const t = [e[0] + ux * R, e[1] + uy * R];
        ctx.line(e, t, 7, '#111');
        ctx.line(e, t, 5, ctx.K(rib, 0.1));
        ctx.line([e[0] + ux * 8, e[1] + uy * 8], t, 2, ctx.C(fan));
        ctx.dot(e[0], e[1], 2.6, ctx.C('#d8b060'));
        return;
      }
      const s0 = a0 - span / 2, s1 = a0 + span / 2;
      g.beginPath();
      g.moveTo(e[0] + Math.cos(s0) * 8, e[1] + Math.sin(s0) * 8);
      g.arc(e[0], e[1], R, s0, s1);
      g.lineTo(e[0] + Math.cos(s1) * 8, e[1] + Math.sin(s1) * 8);
      g.arc(e[0], e[1], 8, s1, s0, true);
      g.closePath();
      const gr = g.createRadialGradient(e[0], e[1], 6, e[0], e[1], R);
      gr.addColorStop(0, ctx.K(fan2, 0));
      gr.addColorStop(0.55, ctx.K(fan, 0.2));
      gr.addColorStop(1, ctx.K(fan, -0.1));
      g.fillStyle = gr;
      g.fill();
      ctx.ol(1.8);
      g.lineWidth = 1;
      g.strokeStyle = 'rgba(30,40,30,.45)';
      for (let i = 1; i < 7; i++) {                                         // 骨(リブ)
        const a = s0 + (span * i) / 7;
        g.beginPath(); g.moveTo(e[0] + Math.cos(a) * 8, e[1] + Math.sin(a) * 8); g.lineTo(e[0] + Math.cos(a) * R, e[1] + Math.sin(a) * R); g.stroke();
      }
      g.strokeStyle = ctx.C(fan2);                                          // 風の模様(渦)
      g.lineWidth = 1.4;
      g.beginPath(); g.arc(e[0] + Math.cos(a0) * R * 0.66, e[1] + Math.sin(a0) * R * 0.66, 5, a0, a0 + 4.2); g.stroke();
      ctx.dot(e[0], e[1], 2.8, '#111');
      ctx.dot(e[0], e[1], 2, ctx.C('#d8b060'));
    },
  },

  // セツカ(雪華) … 氷の槍使いの女性。銀白の姫カット(まっすぐな前髪・切りそろえた長い髪)、氷の結晶のティアラ、
  //   白い毛皮の襟と、薄青の長い外套。手には透きとおった氷の槍
  'セツカ': {
    body: {
      scale: 0.82,
      headRadius: 13,
      handRadius: 6,
      torsoLength: 40,
      torsoWidth: 13,
      upperArm: { length: 25, width: 6.5 },
      lowerArm: { length: 24, width: 6 },
      thighLength: 34,
      shinLength: 38,
      legWidth: 8.5,
      thighWidth: 9,
      shinWidth: 6.5,
      pantsColor: '#cfe2f6',
      beltColor: '#5ab8ff',
      buckleColor: '#ffffff',
      sleeves: true,
      foreArmColor: '#d8ecff',
      handColor: '#eef6ff',
      shoesColor: '#6aa8e0',
      armType: 'longSleeve',
      torsoType: 'hourglass',
      armBand: null,
      hand: 'normal',
      handOutline: false,
      shoeLegCover: true,
      legPatch: false,
      armDecoration: false,
    },
    headShape: 'elegant',
    hair: [
      { type: 'long', color: '#eaf2ff', length: 1.15, volume: 8, wave: 0.05, tip: 'flat' },
      { type: 'bangs', style: 'straight', color: '#eaf2ff', length: 0.55, sideburn: 1.1 },
    ],
    headgear: [{ type: 'crown', color: '#bfefff', width: 0.75, height: 0.7, gem: '#5ad8ff' }],
    faceDeco: [],
    clothes: [
      { type: 'robe', color: '#d8ecff', trim: '#5ab8ff', length: 0.86, flare: 12 },
    ],
    nose: 'girl',
    eyes: { type: 'anime', color: '#4aa8f0', x: 0.6, y: 0.1, size: 1.0, width: 1.05, height: 0.78 },   // 切れ長の青い目
    brows: { type: 'straight', thickness: 1.4, color: '#9ab0c8', width: 0.9 },
    mouth: { closed: 'flat', open: 'o', x: 0.6, y: 0.58, size: 0.7, width: 0.45, lineWidth: 1, color: '#6a3a4a' },
    moveDust: { color: '#e8fbff', color2: '#9fe6ff', rate: 0.4, size: 0.75, life: 34, from: 0.6, to: 1, behind: 10 },
    weaponGrip: { angle: 90, aim: true },
    palette: { fur: '#f6faff', coat: '#d8ecff', clasp: '#5ad8ff', shaft: '#e8f6ff', blade: '#9fe6ff', blade2: '#ffffff' },

    // 胸: 氷の結晶の留め具と、白い毛皮の襟
    torso(ctx) {
      const { P, hw, g } = ctx, cl = PAL(ctx, 'clasp', '#5ad8ff'), ob = PAL(ctx, 'obi', null);
      if (ob) {                                                             // 雪の巫女の帯(スキン)
        ctx.poly([P(0.02, hw * 1.0), P(0.3, hw * 1.02), P(0.3, -hw * 0.9), P(0.02, -hw * 0.9)]);
        g.fillStyle = ctx.K(ob, 0); g.fill(); ctx.ol(1.4);
        ctx.line(P(0.16, -hw * 0.9), P(0.16, hw * 1.0), 1.4, ctx.C(PAL(ctx, 'obiCord', '#ffffff')));
        return;
      }
      ctx.line(P(0.1, hw * 0.98), P(0.85, hw * 0.98), 1.6, ctx.C(PAL(ctx, 'coatLine', '#9cc8f0')));
      const c = P(0.7, hw * 0.85);
      g.fillStyle = ctx.C(cl);
      g.beginPath();
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2, r = i % 2 ? 2.4 : 5.4; g.lineTo(c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r); }
      g.closePath(); g.fill(); ctx.ol(1.1);
      ctx.dot(c[0] - 1, c[1] - 1, 1, '#fff');
    },
    extraCollar(ctx) { const f = PAL(ctx, 'fur', '#f6faff'); if (f) furCollar(ctx, f); },
    headFront(ctx) {                                                        // 氷の騎士の兜 / 雪の巫女のかんざし(スキン)
      const hm = PAL(ctx, 'helm', null), kz = PAL(ctx, 'kanzashi', null);
      if (hm) drawIceHelm(ctx, hm, PAL(ctx, 'clasp', '#5ad8ff'));
      if (kz) drawKanzashi(ctx, kz);
    },
    // 氷の槍: 白い柄・結晶のつば・透きとおった長い穂先
    weapon(ctx, e, ux, uy) {
      const { g } = ctx, px = -uy, py = ux, A = (d, s = 0) => [e[0] + ux * d + px * s, e[1] + uy * d + py * s];
      const sh = PAL(ctx, 'shaft', '#e8f6ff'), bl = PAL(ctx, 'blade', '#9fe6ff'), bl2 = PAL(ctx, 'blade2', '#ffffff');
      ctx.line(A(-34), A(46), 5.5, '#111');
      ctx.line(A(-34), A(46), 3.6, ctx.K(sh, 0));
      for (const d of [-26, -12, 8, 24]) ctx.line(A(d - 1, -2), A(d + 1, 2), 1.3, ctx.C(bl));   // 柄に巻いた青いひも
      ctx.poly([A(44, -6), A(50, 0), A(44, 6), A(40, 0)]);                  // つば(結晶)
      g.fillStyle = ctx.C(bl); g.fill(); ctx.ol(1.2);
      ctx.poly([A(48, -4.5), A(78, -1.5), A(88, 0), A(78, 1.5), A(48, 4.5)]);   // 穂先(透きとおった氷)
      g.globalAlpha = 0.85;
      g.fillStyle = ctx.LG(...A(48), ...A(88), ctx.K(bl, -0.05), ctx.K(bl2, 0));
      g.fill();
      g.globalAlpha = 1;
      ctx.ol(1.4);
      ctx.line(A(52, 0), A(82, 0), 1, 'rgba(255,255,255,.85)');
      ctx.dot(...A(-35), 3, '#111');
      ctx.dot(...A(-35), 2.2, ctx.C(bl));
    },
  },

  // シゲル(茂) … 森の子の少年。もじゃっとした苔色の髪の上に双葉の芽、葉っぱのフードのパーカー、茶色の半ズボン、
  //   腕に巻きついたつる、背中に葉を重ねた小さなマント
  'シゲル': {
    body: {
      scale: 0.9,
      headRadius: 14,
      handRadius: 8,
      torsoLength: 33,
      torsoWidth: 21,
      upperArm: { length: 22, width: 9.5 },
      lowerArm: { length: 21, width: 9, wrap: { color: '#3a8a2a', stripe: '#2a6a1a', from: 0.1, to: 0.9, count: 5 } },   // 腕に巻きついたつる
      thighLength: 20,
      shinLength: 21,
      legWidth: 12,
      thighWidth: 13,
      shinWidth: 10,
      pantsColor: '#f0cfa8',
      beltColor: '#7a5a3a',
      buckleColor: '#c8e07a',
      sleeves: true,
      foreArmColor: '#f0cfa8',
      handColor: '#f0cfa8',
      shoesColor: '#6a4a2a',
      top: { type: 'hoodie', color: '#5aa83a', strings: '#e8d8a0', pocket: true },
      bottom: { type: 'shorts', color: '#8a6a40', hem: 0.62 },
      torsoType: 'barrel',
      armType: 'shortSleeve',
      armBand: null,
      hand: 'normal',
      handOutline: true,
      shoeLegCover: true,
      legPatch: false,
      armDecoration: false,
    },
    headShape: 'round',
    hair: [
      { type: 'bangs', style: 'straight', color: '#5a7a2a', length: 1.4, sideburn: 0.5 },          // 目が隠れるほど長い、もさっとした前髪
    ],
    headgear: [],
    faceDeco: [{ type: 'blush', x: 0.4, y: 0.4, r: 0.16, color: '#f8a888' }, { type: 'dot', x: 0.5, y: 0.32, r: 1.1, color: '#c8865a' }, { type: 'dot', x: 0.38, y: 0.38, r: 1.1, color: '#c8865a' }],   // ほっぺとそばかす
    clothes: [],
    nose: 'round',
    eyes: { type: 'anime', color: '#3aa83a', x: 0.6, y: 0.0, size: 1.1, width: 1.05, height: 1.0 },   // 前髪に隠れている
    brows: { type: 'maro', color: '#3a5a1a' },
    mouth: { closed: 'smile', open: 'laugh', x: 0.6, y: 0.56, size: 0.9 },
    moveDust: { color: '#9adf6a', color2: '#f0ffb0', rate: 0.3, size: 0.8, life: 30, from: 0.1, to: 0.5, behind: 6 },
    palette: { sprout: '#7ad04a', sprout2: '#4a9a2a', cape: '#5ab83a', cape2: '#3a8a2a', flower: null },

    // 頭の上の双葉(芽)。動くと揺れる
    headFront(ctx) {
      const { g, hcx, hcy, Rh } = ctx, c1 = PAL(ctx, 'sprout', '#7ad04a'), c2 = PAL(ctx, 'sprout2', '#4a9a2a'), fl = PAL(ctx, 'flower', null), hat = PAL(ctx, 'hat', null);
      if (hat === 'acorn') return drawAcornCap(ctx, PAL(ctx, 'hatColor', '#8a5a2a'));                 // スキンの帽子(芽は帽子の中)
      if (hat === 'mushroom') return drawMushroomCap(ctx, PAL(ctx, 'hatColor', '#c83a2a'), PAL(ctx, 'hatDots', '#fff6e8'));
      if (hat === 'wreath') drawFlowerWreath(ctx, PAL(ctx, 'wreath', ['#ff8ac0', '#fff', '#ffd84a']));
      const J = ctx.jiggle ? ctx.jiggle('sprout', [hcx, hcy - Rh], { k: 0.2, damp: 0.2, max: 7 }) : [0, 0];
      const b = [hcx - Rh * 0.1, hcy - Rh * 0.92], t = [b[0] + J[0] * 0.6, b[1] - 9 + J[1] * 0.4];
      ctx.line(b, t, 3.4, '#111');
      ctx.line(b, t, 2.2, ctx.C(c2));
      for (const s of [-1, 1]) {
        g.save(); g.translate(t[0], t[1]); g.rotate(s * 0.75 + J[0] * 0.03);
        g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(s * 5, -9, s * 13, -4); g.quadraticCurveTo(s * 6, 2, 0, 0);
        g.fillStyle = ctx.C(c1); g.fill(); ctx.ol(1.4);
        g.restore();
      }
      if (fl) { ctx.dot(t[0], t[1] - 2, 4.2, '#111'); ctx.dot(t[0], t[1] - 2, 3.4, ctx.C(fl)); ctx.dot(t[0], t[1] - 2, 1.4, '#fff6a0'); }
    },
    // 背中の葉のマント(葉を3段に重ねる)
    back(ctx) {
      const { P, hw, g } = ctx, c1 = PAL(ctx, 'cape', '#5ab83a'), c2 = PAL(ctx, 'cape2', '#3a8a2a'), pk = PAL(ctx, 'pack', null);
      if (pk) drawBackpack(ctx, pk);                                        // 背負いかばん(スキン)
      if (!c1) return;
      for (let row = 0; row < 3; row++) for (let i = 0; i < 3; i++) {
        const c = P(0.95 - row * 0.3, -hw * (0.6 + i * 0.25)), s = 9 - row;
        g.save(); g.translate(c[0], c[1]); g.rotate(Math.atan2(ctx.ls || 0, ctx.lc ?? 1) + 2.4 - i * 0.25);
        g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-s * 0.7, s, 0, s * 2.2); g.quadraticCurveTo(s * 0.7, s, 0, 0);
        g.fillStyle = ctx.K((row + i) % 2 ? c1 : c2, 0); g.fill(); ctx.ol(1.4);
        g.restore();
      }
    },
  },

  // ギア(GEAR) … 鋼の機兵。丸い装甲の頭と光る横長のバイザー・アンテナ、胸の炉心(熱がたまると赤く光る)、
  //   肩のミサイルポッド、背中の2本のスラスター(ダッシュ・噴射技のときに炎)、四角い手
  'ギア': {
    body: {
      scale: 1.06,
      headRadius: 13,
      handRadius: 8,
      torsoLength: 36,
      torsoWidth: 30,
      upperArm: { length: 24, width: 14 },
      lowerArm: { length: 24, width: 14, band: { color: '#e03a3a', from: 0.7, to: 0.8, pad: 1.4 } },
      thighLength: 20,
      shinLength: 21,
      legWidth: 16,
      thighWidth: 15,
      shinWidth: 18,
      pantsColor: '#5a6470',
      beltColor: '#3a4048',
      buckleColor: '#ffb040',
      sleeves: true,
      foreArmColor: '#c8d0da',
      handColor: '#8a96a4',
      shoesColor: '#3a4048',
      top: { type: 'armor', color: '#7a8694', plate: '#d8dee6', rivet: '#e03a3a' },
      bottom: { type: 'greaves', color: '#5a6470', greave: '#c8d0da' },
      torsoType: 'blocky',
      armType: 'standard',
      elbowGuard: { color: '#e03a3a', r: 4 },
      armBand: null,
      hand: 'block',
      handOutline: false,
      shoeLegCover: true,
      legPatch: false,
      limbShape: 'block',
      armDecoration: false,
    },
    hair: null,
    headgear: [],
    faceDeco: [],
    showEars: false,
    palette: { helm: '#d8dee6', helm2: '#8a96a4', visor: '#3ad0ff', core: '#3ad0ff', stripe: '#e03a3a', pod: '#9aa6b2', thruster: '#5a6470' },
    // 頭: 丸い装甲のヘルメット + 横長のバイザー + 耳のパーツ + アンテナ
    headCustom(ctx) {
      const { g, hcx, hcy, Rh } = ctx, hv = ctx.hv, cs = hv && hv.turned ? hv.cs : 1;
      const h1 = PAL(ctx, 'helm', '#d8dee6'), h2 = PAL(ctx, 'helm2', '#8a96a4'), vi = PAL(ctx, 'visor', '#3ad0ff'), st = PAL(ctx, 'stripe', '#e03a3a');
      const p = ctx.p, hot = p && p.oh > 0;
      // アンテナ
      ctx.line([hcx - Rh * 0.3, hcy - Rh * 0.8], [hcx - Rh * 0.55, hcy - Rh * 1.55], 2.6, '#111');
      ctx.line([hcx - Rh * 0.3, hcy - Rh * 0.8], [hcx - Rh * 0.55, hcy - Rh * 1.55], 1.4, ctx.C(h2));
      ctx.dot(hcx - Rh * 0.55, hcy - Rh * 1.58, 2.6, ctx.C(hot ? '#ff5a3a' : vi));
      // ヘルメット(角の丸い四角)
      g.beginPath();
      const x0 = hcx - Rh * 1.0, y0 = hcy - Rh * 1.0, w = Rh * 2.05, h = Rh * 1.95, r = Rh * 0.55;
      if (g.roundRect) g.roundRect(x0, y0, w, h, r); else g.rect(x0, y0, w, h);
      g.fillStyle = ctx.LG(x0, y0, x0 + w, y0 + h, ctx.K(h1, 0.15), ctx.K(h1, 0), ctx.K(h2, 0));
      g.fill();
      ctx.ol(2.5);
      // 赤い線(頭頂)
      ctx.line([hcx - Rh * 0.9, hcy - Rh * 0.55], [hcx + Rh * 0.2, hcy - Rh * 0.98], 2.4, ctx.C(st));
      // 耳のパーツ
      ctx.dot(hcx - Rh * 0.25 * cs, hcy + Rh * 0.05, Rh * 0.42, '#111');
      ctx.dot(hcx - Rh * 0.25 * cs, hcy + Rh * 0.05, Rh * 0.34, ctx.K(h2, 0));
      ctx.dot(hcx - Rh * 0.25 * cs, hcy + Rh * 0.05, Rh * 0.14, ctx.C(st));
      // バイザー(顔の前側。光る)
      const vx = hcx + Rh * (0.05 + 0.3 * cs), vy = hcy - Rh * 0.2, mono = PAL(ctx, 'mono', false), crest = PAL(ctx, 'crest', null);
      if (crest) {                                                          // 兜の前立て(V字の金の飾り。スキン)
        const b0 = [hcx + Rh * 0.35, hcy - Rh * 0.85];
        for (const [dx, dy] of [[-0.9, -1.0], [0.6, -1.1]]) { ctx.line(b0, [b0[0] + dx * Rh, b0[1] + dy * Rh], 4.4, '#111'); ctx.line(b0, [b0[0] + dx * Rh, b0[1] + dy * Rh], 2.8, ctx.C(crest)); }
        ctx.dot(b0[0], b0[1], 3.4, ctx.C(crest));
      }
      if (mono) {                                                           // 丸い1つ目(スキン)
        const ex = hcx + Rh * (0.35 + 0.25 * cs), ey = hcy - Rh * 0.1, hot2 = p && p.oh > 0;
        ctx.dot(ex, ey, Rh * 0.42, '#111'); ctx.dot(ex, ey, Rh * 0.34, '#10161c');
        g.globalCompositeOperation = 'lighter';
        g.fillStyle = ctx.RG(ex, ey, 0.5, Rh * 0.45, hot2 ? '#ff5a3a' : vi, 'rgba(0,0,0,0)'); g.beginPath(); g.arc(ex, ey, Rh * 0.45, 0, 7); g.fill();
        g.globalCompositeOperation = 'source-over';
        ctx.dot(ex, ey, Rh * 0.16, ctx.C(hot2 ? '#ff5a3a' : vi)); ctx.dot(ex - 1.5, ey - 1.5, 1.2, '#fff');
        return true;
      }
      g.beginPath();
      if (g.roundRect) g.roundRect(vx - Rh * 0.35, vy - Rh * 0.22, Rh * 1.32, Rh * 0.48, Rh * 0.2); else g.rect(vx - Rh * 0.35, vy - Rh * 0.22, Rh * 1.32, Rh * 0.48);
      g.fillStyle = '#10161c';
      g.fill();
      ctx.ol(1.6);
      const vc = hot ? '#ff5a3a' : vi, blink = p && p.st === 'hit' ? 0.4 : 1;
      g.globalAlpha = blink;
      g.fillStyle = ctx.LG(vx - Rh * 0.3, vy, vx + Rh * 0.95, vy, ctx.K(vc, -0.2), ctx.K(vc, 0.3));
      g.fillRect(vx - Rh * 0.2, vy - Rh * 0.08, Rh * 1.05, Rh * 0.18);
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.35 * blink;
      g.fillRect(vx - Rh * 0.3, vy - Rh * 0.2, Rh * 1.25, Rh * 0.42);
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
      // あごの通気口
      for (let i = 0; i < 3; i++) ctx.line([hcx + Rh * (0.35 + i * 0.18), hcy + Rh * 0.5], [hcx + Rh * (0.35 + i * 0.18), hcy + Rh * 0.78], 1.2, '#2a3038');
      return true;
    },
    shoulder(ctx, shN) { const pd = PAL(ctx, 'pauldron', null); if (pd) drawPauldron(ctx, shN, pd, PAL(ctx, 'stripe', '#e03a3a')); },   // 大きな肩当て(スキン)
    // 胸の炉心(熱がたまるほど橙→赤に。オーバーヒート中は点滅)
    torso(ctx) {
      const { P, hw, g } = ctx, p = ctx.p, H = p && p.ch && p.ch.ht, r = H ? Math.min(1, (p.heat || 0) / H.max) : 0;
      const c0 = PAL(ctx, 'core', '#3ad0ff'), hot = p && p.oh > 0;
      const col = hot ? (fr % 10 < 5 ? '#ff3a1a' : '#ffb040') : r > 0.66 ? '#ff7a3a' : r > 0.33 ? '#ffd040' : c0;
      const c = P(0.62, hw * 0.5);
      ctx.dot(c[0], c[1], 7.5, '#111');
      ctx.dot(c[0], c[1], 6.4, '#2a3038');
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = ctx.RG(c[0], c[1], 0.5, 9, col, 'rgba(0,0,0,0)');
      g.beginPath(); g.arc(c[0], c[1], 9, 0, 7); g.fill();
      g.globalCompositeOperation = 'source-over';
      ctx.dot(c[0], c[1], 3.6, ctx.C(col));
      ctx.dot(c[0] - 1, c[1] - 1, 1.2, '#fff');
      ctx.line(P(0.2, hw * 0.95), P(0.95, hw * 0.95), 2.2, ctx.C(PAL(ctx, 'stripe', '#e03a3a')));
    },
    // 背中の2本のスラスター(ダッシュ・噴射の技のときに炎)
    back(ctx) {
      const { P, hw, g } = ctx, p = ctx.p, col = PAL(ctx, 'thruster', '#5a6470'), pod = PAL(ctx, 'pod', '#9aa6b2');
      if (pod) {                                                         // 背中から肩の上へ出たミサイルポッド
        const c = P(1.08, -hw * 0.75);
        g.save(); g.translate(c[0], c[1]); g.rotate(Math.atan2(ctx.ls || 0, ctx.lc ?? 1));
        g.beginPath(); if (g.roundRect) g.roundRect(-12, -10, 20, 13, 3); else g.rect(-12, -10, 20, 13);
        g.fillStyle = ctx.K(pod, 0); g.fill(); ctx.ol(2);
        for (let i = 0; i < 3; i++) ctx.dot(-8 + i * 6, -4, 1.9, '#2a3038');
        g.restore();
      }
      const on = p && (p.st === 'dash' || (p.st === 'atk' && p.mv && /^(da|su|b|af|sf)$/.test(p.mv.k)));
      for (const [t, k] of [[0.75, 0], [0.38, 1]]) {
        const a = P(t, -hw * 0.95), b2 = P(t - 0.18, -hw * 1.35);
        ctx.line(a, b2, 9, '#111');
        ctx.line(a, b2, 7, ctx.K(col, k ? -0.1 : 0));
        if (on) {
          const L = 14 + Math.sin((typeof fr !== 'undefined' ? fr : 0) * 1.3 + k) * 4, dx = b2[0] - a[0], dy = b2[1] - a[1], d = Math.hypot(dx, dy) || 1;
          g.globalCompositeOperation = 'lighter';
          g.fillStyle = ctx.RG(b2[0], b2[1], 1, L, 'rgba(255,200,90,.9)', 'rgba(255,90,30,0)');
          g.beginPath(); g.arc(b2[0] + (dx / d) * L * 0.5, b2[1] + (dy / d) * L * 0.5, L * 0.7, 0, 7); g.fill();
          g.globalCompositeOperation = 'source-over';
        }
      }
    },
  },

  // カルタ … カードの奇術師の女性。深紅のゆるい巻き髪、シルクハット(赤い帯にトランプを差す)、
  //   黒い燕尾のジャケットに白いシャツと赤い蝶ネクタイ、短いスカートと黒いタイツ。手にはトランプの扇
  'カルタ': {
    body: {
      scale: 0.8,
      headRadius: 13,
      handRadius: 6,
      torsoLength: 38,
      torsoWidth: 12.5,
      upperArm: { length: 24, width: 6 },
      lowerArm: { length: 23, width: 5.5, band: { color: '#ffffff', from: 0.86, to: 0.98, pad: 1.4 } },   // 白いカフス
      thighLength: 34,
      shinLength: 37,
      legWidth: 8,
      thighWidth: 8.5,
      shinWidth: 6,
      pantsColor: '#f6dccc',
      beltColor: '#e0304a',
      buckleColor: '#ffd84a',
      sleeves: true,
      foreArmColor: '#1e1a2a',
      handColor: '#ffffff',
      shoesColor: '#1a1420',
      top: { type: 'jacket', color: '#1e1a2a', inner: '#ffffff' },
      bottom: { type: 'socks', sock: '#2a2030', top: 0.02, trim: '#e0304a' },
      torsoType: 'hourglass',
      armType: 'longSleeve',
      armBand: null,
      hand: 'normal',
      handOutline: false,
      shoeLegCover: false,
      legPatch: false,
      armDecoration: false,
    },
    headShape: 'heroine',
    hair: [
      { type: 'long', color: '#b81e3a', length: 0.7, volume: 8, wave: 0.6, tip: 'round' },
      { type: 'bangs', style: 'side', color: '#b81e3a', length: 0.5, sideburn: 0.9, partY: 0.3 },
    ],
    headgear: [],
    faceDeco: [{ type: 'star', x: 0.3, y: 0.28, size: 0.45, color: '#e0304a' }],   // 目の下の小さなダイヤのしるし(星で代用)
    clothes: [
      { type: 'skirt', color: '#1e1a2a', trim: '#e0304a', length: 0.3, flare: 9, waist: 0.05 },
    ],
    nose: 'girl',
    eyes: { type: 'anime', color: '#d4a020', x: 0.6, y: 0.1, size: 1.05, width: 1, height: 0.9 },   // 金色の目
    brows: { type: 'arch', thickness: 1.5, color: '#7a1020' },
    mouth: { closed: 'smirk', open: 'laugh', x: 0.6, y: 0.57, size: 0.8, width: 0.5, lineWidth: 1.1, color: '#8a1a2a' },
    moveDust: { color: '#ffd84a', color2: '#ff5a7a', rate: 0.25, size: 0.7, life: 28, from: 0.4, to: 0.9, behind: 10 },
    weaponGrip: false,
    palette: { hat: '#1a1622', hatBand: '#e0304a', bow: '#e0304a', tails: '#1e1a2a', card: '#e0304a', vest: '#e0304a' },

    // 胸: 赤い蝶ネクタイとベストのボタン
    torso(ctx) {
      const { P, hw, g } = ctx, bw = PAL(ctx, 'bow', '#e0304a'), vs = PAL(ctx, 'vest', '#e0304a');
      if (vs) for (let i = 0; i < 3; i++) ctx.dot(...P(0.2 + i * 0.16, hw * 0.92), 1.5, ctx.C(vs));
      const c = P(0.9, hw * 0.92);
      for (const s of [-1, 1]) {
        g.beginPath(); g.moveTo(c[0], c[1]); g.lineTo(c[0] + s * 6, c[1] - 3.5); g.lineTo(c[0] + s * 6, c[1] + 3.5); g.closePath();
        g.fillStyle = ctx.C(bw); g.fill(); ctx.ol(1);
      }
      ctx.dot(c[0], c[1], 2, ctx.C(ctx.K(bw, -0.3)));
      const rf = PAL(ctx, 'ruff', null);                                   // 道化のひだ襟(スキン)
      if (rf) for (let i = 0; i < 6; i++) { const a = P(0.98, hw * (1.05 - i * 0.38)); ctx.dot(a[0], a[1], 4.4, '#111'); ctx.dot(a[0], a[1], 3.6, ctx.C(i % 2 ? rf : '#ffffff')); }
    },
    // 燕尾(ジャケットの後ろの2本の長いすそ)
    waist(ctx, b, tr, wv) {
      const col = PAL(ctx, 'tails', '#1e1a2a');
      if (!col) return;
      [[-12, 30, 0], [-6, 34, -0.15]].forEach(([dx, dy, dim], k) => {
        const pts = ctx.strand('ktail' + k, [b[0] - 4, b[1] - 6], { len: Math.hypot(dx, dy), n: 4, dir: [dx, dy], stiff: [0.45, 0.05], damp: 0.08, flutter: 0.7, seed: k * 1.3, collide: 'back', r: 2 });
        strandRibbon(ctx, pts, 7, 5, ctx.K(col, dim), true);
      });
    },
    // シルクハット(赤い帯にトランプを1枚差す)。頭の動きに合わせて少し傾く
    headFront(ctx) {
      const { g, hcx, hcy, Rh } = ctx, hat = PAL(ctx, 'hat', '#1a1622'), band = PAL(ctx, 'hatBand', '#e0304a'), ht = PAL(ctx, 'hatType', 'top');
      if (ht === 'jester') return drawJesterHat(ctx, hat, band);           // スキンの帽子
      if (ht === 'shade') return drawEyeshade(ctx, hat);
      if (ht === 'hood') return drawFortuneHood(ctx, hat, band);
      if (!hat) return;
      const cx = hcx - Rh * 0.05, by = hcy - Rh * 0.78, tilt = -0.12;
      g.save(); g.translate(cx, by); g.rotate(tilt);
      g.beginPath(); g.ellipse(0, 0, Rh * 1.25, Rh * 0.3, 0, 0, 7);           // つば
      g.fillStyle = ctx.K(hat, 0); g.fill(); ctx.ol(2);
      g.beginPath(); g.moveTo(-Rh * 0.72, 0); g.lineTo(-Rh * 0.65, -Rh * 1.25); g.quadraticCurveTo(0, -Rh * 1.38, Rh * 0.65, -Rh * 1.25); g.lineTo(Rh * 0.72, 0); g.closePath();
      g.fillStyle = ctx.LG(-Rh, 0, Rh, 0, ctx.K(hat, 0.15), ctx.K(hat, -0.1)); g.fill(); ctx.ol(2);
      g.fillStyle = ctx.C(band); g.fillRect(-Rh * 0.7, -Rh * 0.42, Rh * 1.4, Rh * 0.3);
      g.lineWidth = 1; g.strokeStyle = '#111'; g.strokeRect(-Rh * 0.7, -Rh * 0.42, Rh * 1.4, Rh * 0.3);
      g.restore();
      if (typeof fxCard === 'function') fxCard(cx - Rh * 0.55, by - Rh * 0.55, 4.5, -0.35, PAL(ctx, 'card', '#e0304a'), '♠', '#111');   // 帯に差したトランプ
    },
    // トランプの扇(手の上に3枚)。投げる技の発生の後は1枚少なく見える
    weapon(ctx, e, ux, uy) {
      if (typeof fxCard !== 'function') return;
      const a = Math.atan2(uy, ux), col = PAL(ctx, 'card', '#e0304a');
      for (let i = 0; i < 3; i++) fxCard(e[0] + ux * 9, e[1] + uy * 9, 5.5, a + Math.PI / 2 + (i - 1) * 0.35, col, '♠♥♦'[i], '#111');
    },
  },


};


// ============================================================
// スキン(着せ替え)   CHARACTER_SKINS[キャラ名] = [ スキン1, スキン2, スキン3 ]
//   スキンの番号は script.js の SK と同じ(0 = ノーマル。値段も SK の p)。ここに書くのは 1〜3 番
//   name    … スキンの名前(ショップ・キャラクター画面に出る)
//   color   … キャラの基本色(上の服の色を省略したときの色など。character.js の look.color の代わり)
//   skin    … 肌の色(省略時は character.js の look.skin)
//   pj      … 飛び道具の色(省略時は元の色)
//   palette … キャラ専用の描画(torso / shoulder / weapon など)が使う色。キャラごとに使える名前が違う(下の各キャラのコメント)
//   draw    … CHARACTER_DRAWS と同じ書き方で、変えたい項目だけ書く(書いた項目が入れかわる。body は書いた項目だけ上書き)
//             hair / headgear / faceDeco / clothes / eyes / faceMask や、torso などの関数も変えられる
//   ※ 体の大きさ・胴体と腕の形(torsoType / armType / limbShape)は変えられない(当たり判定が変わらないように、元の値を使う)
// ============================================================
const CD = (n) => CHARACTER_DRAWS[n];
const CHARACTER_SKINS = {
  // ライキ  palette: stripe(胴の2本線。null で無し)
  'ライキ': [
    { name: '白の道着', color: '#f3f0e6', palette: { stripe: null },
      draw: {
        body: { top: { type: 'gi', color: '#f3f0e6', trim: '#e6e0d0' }, bottom: { type: 'wide', color: '#f3f0e6', flare: 1.5 },
          pantsColor: '#f3f0e6', beltColor: '#1a1a1a', buckleColor: false, handColor: '#f3f0e6', shoesColor: '#f2c79c' },
        headgear: [{ type: 'headband', color: '#d22', color2: '#b11', y: -0.42, tails: 2, drop: 6, drop2: 14, tailLength: 1.3 }] } },
    { name: 'ストリート', color: '#ff7a1a', palette: { stripe: null },
      draw: {
        body: { top: { type: 'hoodie', color: '#ff7a1a', strings: '#fff' }, bottom: { type: 'jeans', color: '#3a5a9a' },
          pantsColor: '#3a5a9a', beltColor: '#3a2a1a', buckleColor: '#c0c0c0', handColor: '#26262e', shoesColor: '#f4f4f4' },
        headgear: [{ type: 'goggles', strap: '#222', frame: '#444', lens: '#ffb347', y: -0.62 }] } },
    { name: '紅蓮の拳士', color: '#1a1a1a', pj: '#ff7a1a', palette: { stripe: '#ffcc33' },
      draw: {
        body: { top: { type: 'tank', color: '#1a1a1a' }, bottom: { type: 'wide', color: '#b31b1b', flare: 1.6 },
          pantsColor: '#b31b1b', beltColor: '#ffcc33', handColor: '#c22', shoesColor: '#111' },
        headgear: [{ type: 'headband', color: '#ffcc33', color2: '#e0a020', y: -0.42, tails: 2, drop: 6, drop2: 14, tailLength: 1.6 }],
        clothes: [{ type: 'scarf', color: '#c22', color2: '#ff7a1a', length: 34 }] } },
  ],
  // ガルド  palette: armorLo / armorMid / armorHi(鎧の色 暗→明) / padMid(肩当て) / armorLine(線) / rivet / rivetDark(鋲) / emblem(胸の紋章) / spikes(肩当てのトゲ)
  'ガルド': [
    { name: '黄金の聖騎士', color: '#f4f0e0',
      palette: { armorLo: '#8a6a1a', armorMid: '#e0b440', armorHi: '#fff2b0', padMid: '#c8962a', armorLine: '#6a4a10', rivet: '#fff', rivetDark: '#c90', emblem: '#3a7aff' },
      draw: {
        body: { pantsColor: '#f0ead8', beltColor: '#8a5a20', shoesColor: '#c8962a', armBand: '#fff' },
        clothes: [{ type: 'cape', color: '#f8f6ee', trim: '#e0b440', clasp: '#3a7aff', length: 0.75, flare: 10 }] } },
    { name: 'バイキング', color: '#7a4a2a',
      palette: { armorLo: '#4a3020', armorMid: '#7a5434', armorHi: '#a87a50', padMid: '#6a4a30', armorLine: '#3a2414', rivet: '#d8d8d8', rivetDark: '#777' },
      draw: {
        body: { pantsColor: '#5a6a3a', beltColor: '#3a2414', shoesColor: '#5a4030', armBand: '#b0b0b0' },
        headgear: [{ type: 'horn', x: -0.25, y: -0.75, side: -1, layer: 'back' }, { type: 'horn', x: 0.45, y: -0.8, side: 1 }],
        faceDeco: [{ type: 'beard', color: '#c8641e' }, { type: 'scar' }],
        clothes: [{ type: 'loincloth', color: '#6a4a30', trim: '#3a2414', length: 0.35 }],
        extraCollar(ctx) { furCollar(ctx, '#8a6a4a'); } } },
    { name: '黒鉄の重騎士', color: '#2a2236',
      palette: { armorLo: '#16121e', armorMid: '#3a3248', armorHi: '#6a5e80', padMid: '#2a2236', armorLine: '#0a080e', rivet: '#c03aff', rivetDark: '#601a80', emblem: '#c03aff', spikes: true },
      draw: {
        body: { pantsColor: '#1a1622', beltColor: '#3a3248', shoesColor: '#2a2236', armBand: '#c03aff' },
        eyes: 'red',
        faceDeco: [{ type: 'beard', color: '#2a2a2a' }, { type: 'scar' }],
        clothes: [{ type: 'cape', color: '#2a0f3a', trim: '#c03aff', clasp: '#c03aff', length: 0.85, flare: 12 }] } },
  ],
  // シノ  palette: strap(胴のたすき) / scarf / scarf2(首巻き) / crest(胸の家紋)
  'シノ': [
    { name: '白影', color: '#e8ecef', pj: '#9ac0ff',
      palette: { strap: '#8a96a2', scarf: '#3a6ad0', scarf2: '#2a50a8', crest: '#3a6ad0' },
      draw: {
        body: { pantsColor: '#c9d0d6', beltColor: '#3a6ad0', foreArmColor: '#c9d0d6', handColor: '#c9d0d6', armBand: '#3a6ad0', shoesColor: '#5a6470' },
        headgear: [{ type: 'headband', color: '#3a6ad0', color2: '#2a50a8', y: -0.55, tails: 2, drop: 8, drop2: 18 }],
        faceMask: { ...CD('シノ').faceMask, color: '#c9d0d6' } } },
    { name: '紅蓮忍', color: '#b8202a', pj: '#ffcc33',
      palette: { strap: '#5a0a14', scarf: '#ffcc33', scarf2: '#d9a020', crest: '#ffcc33' },
      draw: {
        body: { pantsColor: '#3a0a10', beltColor: '#ffcc33', foreArmColor: '#3a0a10', handColor: '#3a0a10', armBand: '#ffcc33', shoesColor: '#1a0508' },
        headgear: [{ type: 'headband', color: '#1a1a1a', color2: '#000', y: -0.55, tails: 2, drop: 8, drop2: 18 }],
        faceMask: { ...CD('シノ').faceMask, color: '#3a0a10' } } },
    { name: '夜鴉', color: '#1c1c26', pj: '#b07aff',
      palette: { strap: '#2a2a3a', scarf: '#5a2aa0', scarf2: '#3a1a70', crest: '#b07aff' },
      draw: {
        body: { pantsColor: '#121218', beltColor: '#7a3ad0', foreArmColor: '#121218', handColor: '#121218', armBand: '#7a3ad0', shoesColor: '#000' },
        headgear: [{ type: 'headband', color: '#7a3ad0', color2: '#5a2aa0', y: -0.55, tails: 2, drop: 8, drop2: 18 }],
        faceMask: { ...CD('シノ').faceMask, color: '#121218' },
        clothes: [{ type: 'cape', color: '#15151c', trim: '#7a3ad0', clasp: '#b07aff', length: 0.45, flare: 8 }] } },
  ],
  // ゴーレム  palette: stoneHi / stone / stoneLo(石の色 明→暗) / crack(ひび) / glowCrack(光るひび) / moss(苔) / vine(つた) / crystal(結晶)
  //           eye / eyeCore / eyeFade / eyeDot(目の光) / core(胸の核)
  'ゴーレム': [
    { name: '苔むした遺跡', color: '#7d8a72', skin: '#8a9a80', pj: '#6ad05a',
      palette: { stoneHi: '#a8b49a', stone: '#7d8a72', stoneLo: '#4f5a46', moss: '#4f8a2a', vine: '#3f7a2a',
        eye: '#40ff90', eyeCore: '#e0ffe8', eyeFade: 'rgba(40,255,120,0)', eyeDot: '#e0ffe8', core: '#40ff90' },
      draw: { body: { pantsColor: '#5f6a58', beltColor: '#5a4a30', foreArmColor: '#6f7a64', handColor: '#8a967c', shoesColor: '#3f4a38' } } },
    { name: '溶岩ゴーレム', color: '#2e2626', skin: '#3a302e', pj: '#ff6a1a',
      palette: { stoneHi: '#5a4e4a', stone: '#3a3030', stoneLo: '#1e1818', crack: '#ff6a1a', glowCrack: '#ffa030',
        eye: '#ff4a10', eyeCore: '#fff0a0', eyeFade: 'rgba(255,60,0,0)', eyeDot: '#fff0a0', core: '#ff5a10' },
      draw: { body: { pantsColor: '#241e1e', beltColor: '#ff6a1a', foreArmColor: '#2e2626', handColor: '#3a302e', shoesColor: '#1a1414' } } },
    { name: '氷晶ゴーレム', color: '#9ad8f0', skin: '#bde8fa', pj: '#9af0ff',
      palette: { stoneHi: '#e8f8ff', stone: '#9ad8f0', stoneLo: '#4a88b0', crack: '#ffffffaa', crystal: '#bff4ff',
        eye: '#40c8ff', eyeCore: '#ffffff', eyeFade: 'rgba(60,200,255,0)', eyeDot: '#ffffff', core: '#40c8ff' },
      draw: { body: { pantsColor: '#6aa8c8', beltColor: '#e8f8ff', foreArmColor: '#8ac8e8', handColor: '#bde8fa', shoesColor: '#4a88b0' } } },
  ],
  // バーサク  palette: strap(たすきの革。null で無し) / scar(胸の傷) / fur(毛皮の襟。false で無し) / paint(体の模様) / plate(片方の肩の革当て) / rivet /
  //           claw / clawBlood(狂爪の色・先の血。claw: null で爪なし) / blood(胸の返り血。null で無し)
  'バーサク': [
    { name: '氷原の狂戦士', color: '#4a6a9a', pj: '#9ad8ff',
      palette: { strap: '#4a5a7a', scar: 'rgba(60,120,220,.9)', fur: '#eef0f4', claw: '#dff2ff' },
      draw: {
        body: { pantsColor: '#2a3a5a', beltColor: '#c8d0e0', armBand: '#c8d0e0', shoesColor: '#5a6070' },
        headgear: [{ type: 'horn', x: -0.1, y: -0.8, side: -1, layer: 'back', color: '#cfe8ff' }, { type: 'horn', x: 0.55, y: -0.78, side: 1, color: '#cfe8ff' }],
        faceDeco: [{ type: 'line', from: [0.1, 0.3], to: [0.85, 0.3], w: 2.6, color: 'rgba(60,140,240,.9)' }],
        clothes: [{ type: 'cape', color: '#e6e8ee', trim: '#9aa8c0', clasp: '#9ad8ff', length: 0.55, flare: 10 }] } },
    { name: '剣闘士', color: '#a0743a',
      palette: { strap: null, fur: false, plate: '#a0743a', rivet: '#e8d090', claw: '#d8b060' },
      draw: {
        body: { bottom: { type: 'greaves', color: '#5a3a22', greave: '#c8a050' }, pantsColor: '#5a3a22', beltColor: '#3a2414', armBand: '#c8a050', shoesColor: '#4a2e1a' },
        headgear: [{ type: 'headband', color: '#a8201a', color2: '#801810', y: -0.5, tails: 1, drop: 10 }],
        faceDeco: [],
        clothes: [{ type: 'loincloth', color: '#a8201a', trim: '#e8c050', length: 0.4 }] } },
    { name: '鬼神', color: '#c8402e', skin: '#c8402e', pj: '#ffcc33',
      palette: { strap: '#1a1a1a', fur: '#1a1a1a', paint: '#6a120a', scar: 'rgba(255,210,80,.9)', claw: '#2a2a2a', blood: 'rgba(70,0,8,.75)' },
      draw: {
        body: { pantsColor: '#1a1a1a', beltColor: '#e8a020', armBand: '#e8c050', shoesColor: '#1a1a1a', foreArmColor: '#c8402e', handColor: '#c8402e' },
        headgear: [{ type: 'horn', x: -0.1, y: -0.8, side: -1, layer: 'back', color: '#ffd24a' }, { type: 'horn', x: 0.55, y: -0.78, side: 1, color: '#ffd24a' }],
        faceDeco: [{ type: 'line', from: [0.1, 0.3], to: [0.85, 0.3], w: 2.6, color: 'rgba(255,210,60,.95)' }],
        clothes: [{ type: 'loincloth', color: '#e8a020', trim: '#1a1a1a', length: 0.38 }] } },
  ],
  // ツキハ  palette: corset(胴の暗い所) / accent(ひも・リボン・杖の巻き) / gem(宝石) / staff(杖の柄) / moon / moon2(三日月) / aura(杖の光)
  'ツキハ': [
    { name: '白月の聖女', color: '#f4f0fa', pj: '#fff2a8',
      palette: { corset: '#e6def4', accent: '#d4a020', gem: '#7ad0ff', staff: '#f4f0fa', moon: '#fff6c8', moon2: '#d4a020', aura: 'rgba(255,240,160,.5)' },
      draw: {
        body: { pantsColor: '#f4f0fa', beltColor: '#d4a020', buckleColor: '#7ad0ff', foreArmColor: '#ffffff', handColor: '#ffffff', shoesColor: '#e8e0f0',
          lowerArm: { band: { color: '#d4a020', from: 0.08, to: 0.2, pad: 1.5 } } },
        eyes: { ...CD('ツキハ').eyes, color: '#3a8ad0' },
        headgear: [{ type: 'ribbon', color: '#7ad0ff' }, { type: 'crown', color: '#e8c050', width: 0.5, height: 0.45, gem: '#7ad0ff' }, { type: 'halo', color: '#ffe680', w: 2.4, gap: 9, rx: 12, ry: 3.5 }],
        faceDeco: [{ type: 'star', x: 0.3, y: 0.25, size: 0.6, color: '#d4a020' }],
        clothes: [
          { type: 'cape', color: '#ffffff', trim: '#d4a020', clasp: '#7ad0ff', length: 0.55, flare: 8, fadeBy: 'wing' },
          { type: 'skirt', color: '#dcd4ee', length: 0.5, flare: 13, waist: 0.2 },
          { type: 'skirt', color: '#ffffff', trim: '#d4a020', length: 0.38, flare: 10, waist: 0.2 }] } },
    { name: '真紅の吸血姫', color: '#7a0f1e', pj: '#ff3a4a',
      palette: { corset: '#1a0a10', accent: '#e02a3a', gem: '#ff2a3a', staff: '#1a0a10', moon: '#e8e0e0', moon2: '#7a0f1e', aura: 'rgba(255,40,60,.45)' },
      draw: {
        body: { pantsColor: '#120a0e', beltColor: '#1a1a1a', buckleColor: '#ff3a4a', foreArmColor: '#120a0e', handColor: '#120a0e', shoesColor: '#1a0a10',
          lowerArm: { band: { color: '#e02a3a', from: 0.08, to: 0.2, pad: 1.5 } } },
        headgear: [{ type: 'ribbon', color: '#1a1a1a' }, { type: 'crown', color: '#3a3a3a', width: 0.5, height: 0.45, gem: '#ff2a3a' }],
        faceDeco: [{ type: 'star', x: 0.3, y: 0.25, size: 0.6, color: '#e02a3a' }],
        clothes: [
          { type: 'cape', color: '#120a0e', trim: '#c01a2a', clasp: '#ff2a3a', length: 0.75, flare: 12, fadeBy: 'wing' },
          { type: 'skirt', color: '#a0162a', length: 0.5, flare: 13, waist: 0.2 },
          { type: 'skirt', color: '#3a0610', trim: '#ff3a4a', length: 0.38, flare: 10, waist: 0.2 }] } },
    { name: '星夜の魔女', color: '#1a2450', pj: '#9ad8ff',
      palette: { corset: '#0e1230', accent: '#e8c050', gem: '#9ad8ff', staff: '#2a2050', moon: '#fff2a8', moon2: '#e8a020', aura: 'rgba(150,200,255,.45)' },
      draw: {
        body: { pantsColor: '#0e1230', beltColor: '#e8c050', buckleColor: '#9ad8ff', foreArmColor: '#0e1230', handColor: '#0e1230', shoesColor: '#2a2050',
          lowerArm: { band: { color: '#e8c050', from: 0.08, to: 0.2, pad: 1.5 } } },
        eyes: { ...CD('ツキハ').eyes, color: '#8a6aff' },
        headgear: [{ type: 'witchHat', color: '#1a2450', dark: '#0e1230', band: '#e8c050', gem: '#9ad8ff', height: 34 }],
        faceDeco: [{ type: 'star', x: 0.3, y: 0.25, size: 0.6, color: '#e8c050' }],
        clothes: [
          { type: 'cape', color: '#0e1230', trim: '#e8c050', clasp: '#9ad8ff', length: 0.7, flare: 10, fadeBy: 'wing' },
          { type: 'skirt', color: '#2a3a80', length: 0.5, flare: 13, waist: 0.2 },
          { type: 'skirt', color: '#1a2450', trim: '#e8c050', length: 0.38, flare: 10, waist: 0.2 }] } },
  ],
  // リナ  palette: bolt(シャツの稲妻) / phones / phonesAccent(ヘッドホン。phones: null で無し) / guitar / guitarDark(ギター)
  'リナ': [
    { name: 'アイドルステージ', color: '#ff7ab8', pj: '#ff9ccc',
      palette: { bolt: '#ff7ab8', phones: '#ffffff', phonesAccent: '#ff7ab8', guitar: '#ff9ccc', guitarDark: '#ffffff' },
      draw: {
        body: { top: { type: 'jacket', color: '#ffffff', inner: '#ffd0e6' }, handColor: '#ffffff', shoesColor: '#ffffff',
          lowerArm: { band: { color: '#ff7ab8', from: 0.78, to: 0.9, pad: 1.2 } } },
        headgear: [{ type: 'ribbon', color: '#ff7ab8' }],
        clothes: [
          { type: 'skirt', color: '#ffffff', length: 0.26, flare: 13, waist: 0.4 },
          { type: 'skirt', color: '#ff7ab8', trim: '#ffffff', length: 0.2, flare: 11, waist: 0.4 }] } },
    { name: 'パンクロック', color: '#c01a2a', pj: '#ff3a3a',
      palette: { bolt: '#c01a2a', phones: '#c01a2a', phonesAccent: '#111', guitar: '#c01a2a', guitarDark: '#111' },
      draw: {
        body: { top: { type: 'tank', color: '#1a1a1a' }, pantsColor: '#1a1a1a', handColor: '#1a1820', shoesColor: '#111',
          lowerArm: { band: { color: '#c0c0c0', from: 0.78, to: 0.9, pad: 1.4 } } },
        faceDeco: [{ type: 'star', x: 0.3, y: 0.25, size: 0.5, color: '#111' }],
        clothes: [{ type: 'skirt', color: '#b01a2a', trim: '#111', length: 0.2, flare: 10, waist: 0.4 }] } },
    { name: 'ネオンサイバー', color: '#00e5ff', pj: '#00e5ff',
      palette: { bolt: '#00e5ff', phones: '#14141e', phonesAccent: '#00e5ff', guitar: '#14141e', guitarDark: '#00e5ff' },
      draw: {
        body: { top: { type: 'hoodie', color: '#14141e', strings: '#00e5ff' }, handColor: '#14141e', shoesColor: '#14141e',
          lowerArm: { band: { color: '#00e5ff', from: 0.78, to: 0.9, pad: 1.2 } } },
        headgear: [{ type: 'goggles', strap: '#14141e', frame: '#2a2a3a', lens: '#00e5ff', y: -0.62 }],
        clothes: [{ type: 'skirt', color: '#14141e', trim: '#00e5ff', length: 0.2, flare: 10, waist: 0.4 }] } },
  ],
  // ルリ  palette: cloth / clothTrim(腰布。cloth: null で無し) / strap(斜めがけのベルト。null で無し) / gem(胸のしずく。null で無し)
  //   髪の色はどのスキンでも同じ(青・毛先は水色)
  'ルリ': [
    // マリンセーラー: 白いセーラー服・胸の赤い飾り・紺のプリーツスカート・紺のリボン。港町の元気な水兵さん
    { name: 'マリンセーラー', color: '#ffffff', pj: '#4fc3ff',
      palette: { cloth: null, strap: null, gem: '#e33a3a' },
      draw: {
        body: { top: { type: 'tshirt', color: '#ffffff' }, bottom: { type: 'shorts', color: '#1d2b5c', hem: 0.3 },
          upperArm: { sleeve: { color: '#ffffff', cover: 0.6, cuff: 2.5, trim: '#1d2b5c' } }, lowerArm: { band: { color: '#46c4ee', from: 0.7, to: 0.94, pad: 1.6 } },
          beltColor: '#1d2b5c', buckleColor: '#ffd24a', handColor: '#ffffff', shoesColor: '#1d2b5c' },
        headgear: [{ type: 'ribbon', color: '#1d2b5c' }],
        clothes: [{ type: 'skirt', color: '#1d2b5c', trim: '#ffffff', length: 0.24, flare: 11, waist: -0.1 }] } },
    // 水の巫女: 白い道着・長い袖・藍色の袴・白いリボン。泉を守る巫女の正装
    { name: '水の巫女', color: '#ffffff', pj: '#9fe8ff',
      palette: { cloth: null, strap: null, gem: '#9fe8ff' },
      draw: {
        body: { top: { type: 'gi', color: '#ffffff', trim: '#3a6ad0' }, bottom: { type: 'wide', color: '#2a3f8f', flare: 2 },
          upperArm: { sleeve: { color: '#ffffff', cover: 1, cuff: 0 } }, lowerArm: { sleeve: { color: '#ffffff', cover: 0.85, cuff: 3, trim: '#3a6ad0', flare: 7 }, band: false },
          beltColor: '#3a6ad0', buckleColor: false, handColor: '#ffe4d0', shoesColor: '#f4f4f4' },
        headgear: [{ type: 'ribbon', color: '#ffffff' }] } },
    // 深海ダイバー: 紺のウェットスーツ・頭にゴーグル・黄色の差し色。海の底を探検する
    { name: '深海ダイバー', color: '#16263f', pj: '#3ad0ff',
      palette: { cloth: '#ffd24a', clothTrim: '#16263f', strap: '#ffd24a', gem: '#3ad0ff' },
      draw: {
        body: { top: { type: 'jacket', color: '#16263f', inner: '#3ad0ff', lapel: false }, bottom: { type: 'pants', color: '#16263f' },
          upperArm: { sleeve: { color: '#16263f', cover: 1, cuff: 0 } }, lowerArm: { sleeve: { color: '#16263f', cover: 0.9, cuff: 2.5, trim: '#ffd24a' }, band: { color: '#ffd24a', from: 0.62, to: 0.95, pad: 2.2, rivet: '#16263f' } },
          beltColor: '#ffd24a', buckleColor: '#16263f', pantsColor: '#16263f', handColor: '#16263f', shoesColor: '#ffd24a' },
        headgear: [{ type: 'goggles', strap: '#16263f', frame: '#ffd24a', lens: '#3ad0ff', y: -0.62 }] } },
  ],
  // アサカ  palette: bodice(胸の胴着) / lace(レースの縁) / brooch(太陽のブローチ。null で無し) / wing / wing2(光の羽の先・根元。wing: null で羽なし)
  //   tact(タクトの柄) / tactGold(金の飾り) / sun(先の太陽) / petal(先の花びら) / aura(先の光)   ※髪の色はどのスキンでも同じ
  'アサカ': [
    // 陽光の天使: 真っ白なドレス・金の縁・天使の輪・白く輝く羽(ツキハの「真紅の吸血姫」の対)
    { name: '陽光の天使', color: '#ffffff', pj: '#fff2a8',
      palette: { bodice: '#ffffff', lace: '#e8c050', brooch: '#7ad0ff', wing: '#fff6d8', wing2: '#ffffff', tact: '#ffffff', tactGold: '#e8c050', sun: '#fff2a8', petal: '#ffffff', aura: 'rgba(255,250,210,.6)' },
      draw: {
        body: { beltColor: '#e8c050', buckleColor: '#7ad0ff', shoesColor: '#f4efe0', lowerArm: { band: { color: '#ffffff', from: 0.84, to: 0.96, pad: 1.6 } },
          bottom: { type: 'socks', sock: '#ffffff', top: 0.06, trim: '#e8c050' } },
        headgear: [{ type: 'halo', color: '#ffe680', w: 2.4, gap: 9, rx: 12, ry: 3.5 }],
        faceDeco: [{ type: 'star', x: 0.3, y: 0.25, size: 0.55, color: '#e8c050' }],
        clothes: [
          { type: 'skirt', color: '#f4efe6', length: 0.5, flare: 15, waist: 0.2 },
          { type: 'skirt', color: '#ffffff', trim: '#e8c050', length: 0.36, flare: 11, waist: 0.2 }] } },
    // 青空の魔女: 空色のドレス・白い魔女の帽子・金の縁(ツキハの「星夜の魔女」の対)
    { name: '青空の魔女', color: '#8fd0ff', pj: '#bfe8ff',
      palette: { bodice: '#ffffff', lace: '#e8c050', brooch: '#ffd84a', wing: '#bfe8ff', wing2: '#ffffff', tact: '#ffffff', tactGold: '#e8c050', sun: '#ffd84a', petal: '#dff3ff', aura: 'rgba(170,220,255,.55)' },
      draw: {
        body: { beltColor: '#2f7fe0', buckleColor: '#ffd84a', shoesColor: '#2f6fc0', lowerArm: { band: { color: '#ffffff', from: 0.84, to: 0.96, pad: 1.6 } },
          bottom: { type: 'socks', sock: '#ffffff', top: 0.06, trim: '#8fd0ff' } },
        headgear: [{ type: 'witchHat', color: '#ffffff', dark: '#dfe8f4', band: '#8fd0ff', gem: '#ffd84a', height: 30 }],
        faceDeco: [{ type: 'star', x: 0.3, y: 0.25, size: 0.55, color: '#2f7fe0' }],
        clothes: [
          { type: 'skirt', color: '#ffffff', length: 0.48, flare: 14, waist: 0.2 },
          { type: 'skirt', color: '#8fd0ff', trim: '#ffffff', length: 0.36, flare: 11, waist: 0.2 }] } },
    // 桜の姫: 薄桃色のドレス・桜色の羽・桜の花びらのタクト(ツキハの「白月の聖女」の対。春の朝)
    { name: '桜の姫', color: '#ffd6e4', pj: '#ffb0cc',
      palette: { bodice: '#ff9ec0', lace: '#ffffff', brooch: '#ff5a8a', wing: '#ffb0cc', wing2: '#fff0f6', tact: '#fff6fa', tactGold: '#d88aa8', sun: '#ffd0e0', petal: '#ffc4d8', aura: 'rgba(255,170,200,.5)' },
      draw: {
        body: { beltColor: '#ff7aa8', buckleColor: '#ffffff', shoesColor: '#ff8ab0', lowerArm: { band: { color: '#ff9ec0', from: 0.84, to: 0.96, pad: 1.6 } },
          bottom: { type: 'socks', sock: '#ffffff', top: 0.06, trim: '#ff9ec0' } },
        hair: [
          CD('アサカ').hair[0],
          { ...CD('アサカ').hair[1], flower: '#ffc4d8', tie: '#ff5a8a' }],
        faceDeco: [{ type: 'star', x: 0.3, y: 0.25, size: 0.55, color: '#ff7aa8' }],
        clothes: [
          { type: 'skirt', color: '#ff9ec0', length: 0.48, flare: 14, waist: 0.2 },
          { type: 'skirt', color: '#fff0f6', trim: '#ff7aa8', length: 0.36, flare: 11, waist: 0.2 }] } },
  ],
  // メイ＆ロロ  palette: bodice(胴着) / frill(フリル) / brooch / gem(胸のリボン・宝石。brooch: null で無し) / ring(指輪) / thread(超必殺技の糸)
  //   ロロ: lolo(布) / loloDark(暗い所) / loloPatch(つぎはぎ) / loloInner(耳の内側) / loloButton(ボタンの目) / needle(針) / loloEye(光る目)
  'メイ＆ロロ': [
    // 白薔薇の人形姫: 白いドレス・薄桃のフリル。ロロは古い白うさぎ
    { name: '白薔薇の人形姫', color: '#f4eef4', pj: '#ffb3f0',
      palette: { bodice: '#f4eef4', frill: '#ffc8dc', brooch: '#c03060', gem: '#ff7ab0', thread: '#ffd0e8',
        lolo: '#ece4dc', loloDark: '#b0a49a', loloPatch: '#ffc8dc', loloInner: '#ffd8e4', loloEye: '#ff4a8a' },
      draw: {
        body: { pantsColor: '#ffffff', beltColor: '#ffc8dc', shoesColor: '#e8dce4', bottom: { type: 'socks', sock: '#ffffff', top: 0.1, trim: '#ffc8dc' },
          lowerArm: { band: { color: '#ffc8dc', from: 0.86, to: 0.96, pad: 1.2 } } },
        headgear: [{ type: 'headdress', color: '#ffffff', frill: '#ffc8dc', bow: '#ffc8dc', knot: '#c03060', tails: 11 }],
        clothes: [
          { type: 'skirt', color: '#ffe4ee', length: 0.5, flare: 15, waist: 0.2 },
          { type: 'skirt', color: '#f4eef4', trim: '#ffc8dc', length: 0.42, flare: 13, waist: 0.2 },
          { type: 'skirt', color: '#ffffff', trim: '#c03060', length: 0.22, flare: 9, waist: 0.2 }] } },
    // 血染めの喪服: 黒と深紅。ロロは黒いうさぎ、目が赤く光る
    { name: '血染めの喪服', color: '#14080c', pj: '#ff2a4a',
      palette: { bodice: '#14080c', frill: '#8a0a1e', brooch: '#ff2a4a', gem: '#ff2a4a', ring: '#c0a0a8', thread: '#ff4a6a',
        lolo: '#2a2026', loloDark: '#120c10', loloPatch: '#8a0a1e', loloInner: '#5a2030', loloButton: '#c0c0c8', loloEye: '#ff2a3a' },
      draw: {
        body: { pantsColor: '#0a0608', beltColor: '#8a0a1e', shoesColor: '#0a0608', bottom: { type: 'socks', sock: '#0a0608', top: 0.1, trim: '#8a0a1e' },
          lowerArm: { band: { color: '#8a0a1e', from: 0.86, to: 0.96, pad: 1.2 } } },
        eyes: { ...CD('メイ＆ロロ').eyes, color: '#e0102a' },
        headgear: [{ type: 'headdress', color: '#14080c', frill: '#8a0a1e', bow: '#14080c', knot: '#ff2a4a', tails: 14 }],
        clothes: [
          { type: 'skirt', color: '#3a0a14', length: 0.5, flare: 15, waist: 0.2 },
          { type: 'skirt', color: '#14080c', trim: '#8a0a1e', length: 0.42, flare: 13, waist: 0.2 },
          { type: 'skirt', color: '#14080c', trim: '#ff2a4a', length: 0.22, flare: 9, waist: 0.2 }] } },
    // 夜明けの魔女見習い: 紺のドレス・水色のフリル。ロロは継ぎはぎだらけの青いうさぎ
    { name: '夜明けの魔女見習い', color: '#1c2448', pj: '#9ad8ff',
      palette: { bodice: '#1c2448', frill: '#bfe4ff', brooch: '#3a6ad0', gem: '#9ad8ff', thread: '#bfe4ff',
        lolo: '#7a9ad0', loloDark: '#3a4e80', loloPatch: '#ffd88a', loloInner: '#d8e8ff', loloEye: '#ffd84a' },
      draw: {
        body: { pantsColor: '#141a34', beltColor: '#3a6ad0', shoesColor: '#141a34', bottom: { type: 'socks', sock: '#141a34', top: 0.1, trim: '#bfe4ff' },
          lowerArm: { band: { color: '#bfe4ff', from: 0.86, to: 0.96, pad: 1.2 } } },
        eyes: { ...CD('メイ＆ロロ').eyes, color: '#8a4ae0' },
        headgear: [{ type: 'witchHat', color: '#1c2448', dark: '#0e1230', band: '#bfe4ff', gem: '#9ad8ff', height: 30 }],
        clothes: [
          { type: 'skirt', color: '#bfe4ff', length: 0.5, flare: 15, waist: 0.2 },
          { type: 'skirt', color: '#1c2448', trim: '#bfe4ff', length: 0.42, flare: 13, waist: 0.2 },
          { type: 'skirt', color: '#2a3a70', trim: '#ffd84a', length: 0.22, flare: 9, waist: 0.2 }] } },
  ],
  // ---- 新しい5人のスキン(髪の色は変えない。衣装・小物そのものを着がえる) ----
  // ハヤテ  palette: fan / fan2 / rib(鉄扇) / sash(腰の帯) / cord(胸の紐。null で無し) /
  //         feather / feather2(羽団扇にする) / kesa(結袈裟のぼんぼり) / tokin(頭襟) / windbag(風神の風袋)
  'ハヤテ': [
    // 山伏: 白い鈴懸(すずかけ)の道着と袴・黒い頭襟・山吹のぼんぼりの結袈裟・羽団扇
    { name: '山伏', color: '#f4f0e8', pj: '#ffe0a0',
      palette: { tokin: '#1a1a22', kesa: '#e8a030', cord: null, feather: '#f4f0e8', feather2: '#3a3a40', sash: '#e8a030' },
      draw: {
        body: { top: { type: 'gi', color: '#f4f0e8', trim: '#e8a030' }, bottom: { type: 'wide', color: '#e8e4d8', flare: 1.9 }, beltColor: '#e8a030', shoesColor: '#6a4a2a', lowerArm: { wrap: false } },
        clothes: [] } },
    // 街の疾風: フードのパーカー・カーゴパンツ・ゴーグル・スニーカー・黒とオレンジの扇
    { name: '街の疾風', color: '#3a6a5a', pj: '#ffb070',
      palette: { cord: null, fan: '#2a2a30', fan2: '#ff8a4a', rib: '#111', sash: '#ff6a3a' },
      draw: {
        body: { top: { type: 'hoodie', color: '#3a6a5a', strings: '#ffffff', pocket: true }, bottom: { type: 'cargo', color: '#4a4a52' }, beltColor: '#ff6a3a', shoesColor: '#e8e8e8', lowerArm: { wrap: false } },
        headgear: [{ type: 'goggles', strap: '#2a2a30', frame: '#ff6a3a', lens: '#8cf', y: -0.62 }],
        clothes: [] } },
    // 風神: 上半身は裸に金の腕輪、頭の角、背中に大きくなびく風袋、青い袴と腰布
    { name: '風神', color: '#3a7aa8', pj: '#c8f0ff',
      palette: { windbag: '#e8f8ff', cord: null, sash: '#e8c050', fan: '#e8c050', fan2: '#fff6d8', rib: '#5a3a1a' },
      draw: {
        body: { top: { type: 'none' }, bottom: { type: 'baggy', color: '#3a7aa8' }, beltColor: '#e8c050', armBand: '#e8c050', shoesColor: '#3a2a1a', lowerArm: { wrap: false } },
        headgear: [{ type: 'horn', x: -0.1, y: -0.8, side: -1, layer: 'back' }, { type: 'horn', x: 0.2, y: -0.85, side: 1, layer: 'front' }],
        clothes: [{ type: 'loincloth', color: '#e8c050', trim: '#3a7aa8', length: 0.32 }] } },
  ],
  // セツカ  palette: fur(毛皮の襟。null で無し) / clasp(結晶の留め具) / coatLine / shaft / blade / blade2(槍) /
  //         helm(氷の兜) / kanzashi(かんざし) / obi / obiCord(帯)
  'セツカ': [
    // 氷の騎士: 氷の鎧とすね当て・結晶の羽飾りの兜・短いマント
    { name: '氷の騎士', color: '#5a7aa8', pj: '#bfe8ff',
      palette: { helm: '#dff2ff', fur: null, clasp: '#5ab8ff', coatLine: null, shaft: '#8aa8c8', blade: '#bfe8ff', blade2: '#ffffff' },
      draw: {
        body: { top: { type: 'armor', color: '#3a5a88', plate: '#dff2ff', rivet: '#5ab8ff' }, bottom: { type: 'greaves', color: '#3a5a88', greave: '#dff2ff' }, shoesColor: '#dff2ff', foreArmColor: '#dff2ff', handColor: '#dff2ff', beltColor: '#5ab8ff' },
        headgear: [],
        clothes: [{ type: 'cape', color: '#3a5a88', trim: '#dff2ff', clasp: '#5ab8ff', length: 0.7, flare: 10 }, { type: 'skirt', color: '#5a7aa8', trim: '#dff2ff', length: 0.3, flare: 8, waist: 0 }] } },
    // 雪の巫女: 白い着物に水色の袴・帯・氷のかんざし・なぎなたのような槍
    { name: '雪の巫女', color: '#ffffff', pj: '#e8f8ff',
      palette: { obi: '#5ab8ff', obiCord: '#ffffff', fur: null, kanzashi: '#9fe6ff', shaft: '#5a3a3a', blade: '#e8f8ff', blade2: '#ffffff' },
      draw: {
        body: { top: { type: 'gi', color: '#ffffff', trim: '#5ab8ff' }, bottom: { type: 'wide', color: '#bfe0ff', flare: 2.1 }, foreArmColor: '#ffffff', shoesColor: '#e8e8f0', beltColor: '#5ab8ff' },
        headgear: [],
        clothes: [] } },
    // 冬の舞踏会: 何重にも広がるドレスと小さなティアラ
    { name: '冬の舞踏会', color: '#e8f4ff', pj: '#cfe8ff',
      palette: { fur: '#ffffff', clasp: '#9fd0ff', coatLine: null },
      draw: {
        body: { foreArmColor: '#ffffff', handColor: '#ffffff', shoesColor: '#bfe0ff' },
        headgear: [{ type: 'crown', color: '#e8f4ff', width: 0.55, height: 0.45, gem: '#9fd0ff' }],
        clothes: [{ type: 'skirt', color: '#bfe0ff', length: 0.98, flare: 28, waist: 0.15 }, { type: 'skirt', color: '#e8f4ff', trim: '#9fd0ff', length: 0.78, flare: 22, waist: 0.15 }, { type: 'skirt', color: '#ffffff', trim: '#bfe0ff', length: 0.4, flare: 14, waist: 0.15 }] } },
  ],
  // シゲル  palette: sprout / sprout2(頭の芽) / flower(芽の花。null で無し) / cape / cape2(背中の葉。cape: null で無し) /
  //         hat('acorn' どんぐり / 'mushroom' きのこ / 'wreath' 花の冠) / hatColor / hatDots / wreath(花の色の配列) / pack(背負いかばん)
  'シゲル': [
    // どんぐり探検家: どんぐりの帽子・ベスト・半ズボン・背負いかばん
    { name: 'どんぐり探検家', color: '#a8743a', pj: '#c8904a',
      palette: { hat: 'acorn', hatColor: '#8a5a2a', pack: '#7a5a2a', cape: null },
      draw: {
        body: { top: { type: 'vest', color: '#a8743a', inner: '#f0e8c8', buttons: 2, button: '#e8d070' }, bottom: { type: 'shorts', color: '#6a5a3a', hem: 0.6 }, shoesColor: '#5a3a1a', lowerArm: { wrap: false } } } },
    // 花の妖精: 花の冠・袖なしの服・花びらの腰みの・花びらのマント
    { name: '花の妖精', color: '#9ae07a', pj: '#ff9ac8',
      palette: { hat: 'wreath', wreath: ['#ff8ac0', '#ffffff', '#ffd84a'], flower: '#ff7ab8', cape: '#ffb0d0', cape2: '#ff8ac0' },
      draw: {
        body: { top: { type: 'tank', color: '#9ae07a' }, bottom: { type: 'shorts', color: '#f0e0c0', hem: 0.5 }, shoesColor: '#e87aa8' },
        clothes: [{ type: 'loincloth', color: '#ffb0d0', trim: '#ff7ab8', length: 0.3 }],
        faceDeco: [{ type: 'blush', x: 0.4, y: 0.4, r: 0.18, color: '#ff9ab8' }] } },
    // 森の番人: 赤いきのこの帽子・茶色の上着・苔のマント
    { name: '森の番人', color: '#6a4a2a', pj: '#e85a4a',
      palette: { hat: 'mushroom', hatColor: '#c83a2a', hatDots: '#fff6e8', cape: null },
      draw: {
        body: { top: { type: 'jacket', color: '#6a4a2a', inner: '#3a6a2a' }, bottom: { type: 'pants', color: '#3a2a1a' }, shoesColor: '#2a1a10' },
        clothes: [{ type: 'cape', color: '#2a5a2a', trim: '#5a8a3a', length: 0.75, flare: 10 }] } },
  ],
  // ギア  palette: helm / helm2(頭の装甲) / visor(目) / core(胸の炉心) / stripe(赤い線) / pod(背中のポッド。null で無し) / thruster(背中の噴射口) /
  //       mono(true で丸い1つ目) / crest(兜の前立て) / pauldron(大きな肩当て)
  'ギア': [
    // 試作機: 白い装甲・丸い1つ目・ポッドなしの軽い形
    { name: '試作機', color: '#e8eef4', skin: '#c8d4e0', pj: '#9ad8ff',
      palette: { helm: '#ffffff', helm2: '#b8c8d8', visor: '#5ab0ff', core: '#5ab0ff', stripe: '#2a6ad8', pod: null, thruster: '#8a9aaa', mono: true },
      draw: { body: { pantsColor: '#8a9aaa', handColor: '#b8c8d8', foreArmColor: '#e8eef4', top: { type: 'armor', color: '#b8c8d8', plate: '#ffffff', rivet: '#2a6ad8' }, bottom: { type: 'greaves', color: '#8a9aaa', greave: '#ffffff' },
        elbowGuard: { color: '#2a6ad8', r: 4 }, lowerArm: { band: { color: '#2a6ad8', from: 0.7, to: 0.8, pad: 1.4 } } } } },
    // 重装型: 大きな肩当て・深緑の軍用の装甲・黄色い目
    { name: '重装型', color: '#5a6a3a', skin: '#4a5a32', pj: '#ffd040',
      palette: { helm: '#7a8a52', helm2: '#4a5a32', visor: '#ffd040', core: '#ffd040', stripe: '#ffd040', pod: '#6a7a42', thruster: '#3a4228', pauldron: '#7a8a52' },
      draw: { body: { pantsColor: '#3a4228', handColor: '#4a5a32', foreArmColor: '#6a7a42', top: { type: 'armor', color: '#4a5a32', plate: '#7a8a52', rivet: '#ffd040' }, bottom: { type: 'greaves', color: '#3a4228', greave: '#6a7a42' },
        elbowGuard: { color: '#ffd040', r: 4 }, lowerArm: { band: { color: '#ffd040', from: 0.7, to: 0.8, pad: 1.4 } } } } },
    // 鎧武者: 黒い兜に金の前立て・赤い草摺(くさずり)・大きな肩当て(袖)
    { name: '鎧武者', color: '#2a2a30', skin: '#3a3a42', pj: '#ff5a3a',
      palette: { helm: '#2a2a30', helm2: '#1a1a20', visor: '#ff3a2a', core: '#ff3a2a', stripe: '#c81e1e', pod: null, thruster: '#1a1a20', crest: '#e8c040', pauldron: '#8a1a1a' },
      draw: { body: { pantsColor: '#1a1a20', handColor: '#2a2a30', foreArmColor: '#3a3a42', top: { type: 'armor', color: '#1a1a20', plate: '#8a1a1a', rivet: '#e8c040' }, bottom: { type: 'greaves', color: '#1a1a20', greave: '#8a1a1a' },
        elbowGuard: { color: '#e8c040', r: 4 }, lowerArm: { band: { color: '#e8c040', from: 0.7, to: 0.8, pad: 1.4 } } },
        clothes: [{ type: 'loincloth', color: '#8a1a1a', trim: '#e8c040', length: 0.42 }] } },
  ],
  // カルタ  palette: hat / hatBand(帽子の色) / hatType('top' シルクハット / 'jester' 道化 / 'shade' カジノのひさし / 'hood' 占い師の頭巾) /
  //         bow(蝶ネクタイ) / vest(ボタン) / tails(燕尾。null で無し) / card(トランプの縁) / ruff(道化のひだ襟)
  'カルタ': [
    // ジョーカー: 2つに分かれた道化の帽子(鈴つき)・ひだ襟・紫と緑の服
    { name: 'ジョーカー', color: '#7a3ad0', pj: '#7aff7a',
      palette: { hatType: 'jester', hat: '#7a3ad0', hatBand: '#3ad04a', ruff: '#3ad04a', tails: null, bow: '#3ad04a', vest: '#3ad04a', card: '#7a3ad0' },
      draw: {
        body: { top: { type: 'plain', color: '#7a3ad0' }, foreArmColor: '#7a3ad0', handColor: '#ffffff', beltColor: '#3ad04a', bottom: { type: 'socks', sock: '#3ad04a', top: 0.02, trim: '#7a3ad0' } },
        clothes: [{ type: 'skirt', color: '#3ad04a', trim: '#7a3ad0', length: 0.32, flare: 13, waist: 0.05 }] } },
    // カジノディーラー: 緑のひさし・赤いベストと白いシャツ・黒いズボン・腕のガーター
    { name: 'カジノディーラー', color: '#8a1a2a', pj: '#ffd84a',
      palette: { hatType: 'shade', hat: '#3ad08a', tails: null, bow: '#1a1622', vest: '#ffd84a', card: '#1a6a3a' },
      draw: {
        body: { top: { type: 'vest', color: '#8a1a2a', inner: '#ffffff', buttons: 3, button: '#ffd84a' }, bottom: { type: 'pants', color: '#1a1622' }, foreArmColor: '#ffffff', handColor: '#ffffff', beltColor: '#1a1622', armBand: '#e0304a', shoesColor: '#1a1622' },
        clothes: [] } },
    // タロット占い師: 金貨の飾りの頭巾・星の模様の長いローブ・金のタロットカード
    { name: 'タロット占い師', color: '#4a2a6a', pj: '#e8c040',
      palette: { hatType: 'hood', hat: '#4a2a6a', hatBand: '#e8c040', tails: null, bow: '#e8c040', vest: null, card: '#e8c040' },
      draw: {
        body: { top: { type: 'plain', color: '#4a2a6a' }, foreArmColor: '#4a2a6a', beltColor: '#e8c040', shoesColor: '#2a1a3a', bottom: { type: 'socks', sock: '#2a1a3a', top: 0.02, trim: '#e8c040' } },
        faceDeco: [{ type: 'dot', x: 0.15, y: -0.55, r: 2, color: '#e8c040' }],
        clothes: [{ type: 'robe', color: '#4a2a6a', trim: '#e8c040', length: 0.88, flare: 12 }] } },
  ],
};


// 体の大きさ・形の項目(スキンでは変えない。当たり判定と同じにするため)
const SKIN_LOCK = ['scale', 'headRadius', 'handRadius', 'torsoLength', 'torsoWidth', 'thighLength', 'shinLength', 'legWidth', 'thighWidth', 'shinWidth',
  'torsoType', 'torsoProfile', 'torsoBack', 'armType', 'limbShape'];
const skinOf = (name, s) => (s > 0 && CHARACTER_SKINS[name] && CHARACTER_SKINS[name][s - 1]) || null;
const CHAR_DRAW_CACHE = {};
// スキンを着たときの見た目の設定(CHARACTER_DRAWS + スキンの draw / palette)
function charDrawOf(name, s) {
  const base = CHARACTER_DRAWS[name] || {}, sk = skinOf(name, s);
  if (!sk) return base;
  const key = name + '_' + s;
  if (CHAR_DRAW_CACHE[key]) return CHAR_DRAW_CACHE[key];
  const d = sk.draw || {}, bb = base.body || {}, db = d.body || {}, body = { ...bb, ...db };
  for (const k of ['upperArm', 'lowerArm']) if (db[k] || bb[k]) body[k] = { ...(bb[k] || {}), ...(db[k] || {}), length: bb[k] && bb[k].length, width: bb[k] && bb[k].width };
  for (const k of SKIN_LOCK) { if (k in bb) body[k] = bb[k]; else delete body[k]; }
  return (CHAR_DRAW_CACHE[key] = { ...base, ...d, body, palette: { ...(base.palette || {}), ...(sk.palette || {}) } });
}
// スキンの名前 / 基本色 / 肌の色 / 飛び道具の色(ci = キャラの番号、s = スキンの番号)
const skinName = (ci, s) => { const sk = skinOf(CH[ci].nm, s); return sk ? sk.name : SK[s] ? SK[s].n : ''; };
const skinMainColor = (ci, s) => { const sk = skinOf(CH[ci].nm, s); return sk ? sk.color || CH[ci].col : (SK[s] && SK[s].c) || CH[ci].col; };
const skinSkinColor = (ci, s) => { const sk = skinOf(CH[ci].nm, s); return (sk && sk.skin) || SKN[ci]; };
const skinProjColor = (p) => { const ci = CH.indexOf(p.ch), sk = skinOf(p.ch.nm, p.sk); return sk ? sk.pj || p.ch.col : (SK[p.sk] && SK[p.sk].c) || p.ch.col; };