// ============================================================
// drawing_template.js … 描画テンプレート(部品の描き方)
//   胴体・腕・脚・髪・頭の装飾・顔の装飾・服・口・眉・顔(目鼻)・向き別の髪など、
//   「CHARACTER_DRAWS の設定から部品を描く」関数とテンプレート表をまとめたファイル。
//   読み込み順: character.js → drawing_template.js → drawing_character.js → drawing.js → script.js
// ============================================================

// ============================================================
// 胴体テンプレート
//   body.torsoType に名前を書くと胴体のシルエットが変わる。
//   profile = [[高さ(0=腰 〜 1=首), 幅の倍率], ...]
//   back    = 背中側の幅の倍率(前側を1としたとき)
//   body.torsoProfile / body.torsoBack を直接書けば独自の形も作れる。
//   胴体の太さは body.torsoWidth(px)。profile の幅はその太さに対する割合。当たり判定も一緒に変わる。
// ============================================================
// 輪郭線の太さ: 今描いている部位(outlinePart)の太さ OUTLINE[部位] (drawing_character.js) を、
//   もともとの太さ OUTLINE_BASE[部位] で割った倍率を、その部位のすべての輪郭にかける
const OUTLINE_BASE = {
  face: 2, ear: 1.8, eyes: 1.2, nose: 1.8, hair: 2.5, headgear: 2, faceDeco: 2.2, faceCover: 2,
  neck: 1.5, torso: 3, clothes: 2.5, custom: 3, upperArm: 3, foreArm: 3, hand: 2, thigh: 2.5, shin: 2.5, shoe: 2, weapon: 2
};
let outlinePart = 'custom';
function olScale(part = outlinePart) {
  const O = typeof OUTLINE !== 'undefined' ? OUTLINE : {}, base = OUTLINE_BASE[part];
  if (!base) return 1;
  const v = O[part];
  return v == null || !isFinite(v) ? 1 : Math.max(0, v) / base;
}
// 関数 fn を描くあいだだけ輪郭の部位を part にする
function withOutlinePart(part, fn) {
  return function (...args) {
    const prev = outlinePart;
    outlinePart = part;
    try { return fn.apply(this, args); } finally { outlinePart = prev; }
  };
}

const TORSO_TEMPLATES = {
  standard:  { profile: [[0, 0.85], [0.25, 0.75], [0.6, 1], [0.93, 1.06], [1.02, 0.6]], back: 0.82 },   // 標準
  slim:      { profile: [[0, 0.8], [0.25, 0.66], [0.6, 0.82], [0.93, 0.9], [1.02, 0.55]], back: 0.88 },   // 細身
  broad:     { profile: [[0, 0.68], [0.25, 0.74], [0.6, 1.1], [0.93, 1.26], [1.02, 0.72]], back: 0.86 },  // 逆三角形(肩幅が広い)
  barrel:    { profile: [[0, 0.95], [0.25, 1.05], [0.6, 1.12], [0.93, 1.0], [1.02, 0.66]], back: 0.92 },  // 樽型(ずんぐり)
  hourglass: { profile: [[0, 0.95], [0.25, 0.68], [0.6, 0.95], [0.93, 1.04], [1.02, 0.6]], back: 0.82 },  // くびれ
  blocky:    { profile: [[0, 1], [0.3, 1.04], [0.7, 1.08], [0.95, 1.08], [1.02, 0.85]], back: 1 }         // 四角(ゴーレム向き)
};

function torsoSpec(spec) {
  const b = (spec && spec.body) || {};
  const tpl = TORSO_TEMPLATES[b.torsoType] || TORSO_TEMPLATES.standard;
  return { profile: b.torsoProfile || tpl.profile, back: b.torsoBack ?? tpl.back };
}

// 胴体の半幅。描画(drawF)と当たり判定(fighterHitParts)で同じ値を使う
function bodyHalfWidth(Y, spec) {
  return Math.max(9, Y.bw * 0.6);                    // Y.bw = body.torsoWidth (px)
}

// 単体でも配列でも書けるようにする (null/false は空扱い)
function asList(v) {
  return v == null || v === false ? [] : Array.isArray(v) ? v : [v];
}

// ============================================================
// 腕テンプレート (上腕 / 下腕を別々に設定できる)
//   腕の長さ・太さは body.upperArm / body.lowerArm の length / width (px) で決める。
//   body.armType に名前を書くと、袖などの見た目と、太さ・長さの増減(px)がまとめて決まる。
//   さらに body.upperArm / body.lowerArm に書いた項目は、テンプレートより優先される。
//
//   upperArm / lowerArm に書ける項目 (すべて省略可):
//     length     長さ(px)          width      太さ(px)     … 当たり判定の長さ・太さも同じ値
//     lengthAdd  長さの増減(px)    widthAdd   太さの増減(px) … テンプレートが使う(length / width に足される)
//     color   この部分の色 (省略時は標準の腕の色)
//     sleeve  { color, trim, cover(0〜1), cuff(袖口の太さpx), flare(袖口の広がりpx) }
//     wrap    { color, stripe, from, to, count }          … 包帯
//     band    { color, from, to, pad(太さの追加px), rivet(鋲の色) } … 腕甲・ブレーサー
//     (sleeve / wrap / band は false で無効。from/to/cover は「根元=0 〜 先端=1」)
//   body.elbowGuard: true / { color, r, spike }            … 肘当て
// ============================================================
const ARM_TEMPLATES = {
  standard:    {},                                                                            // 標準
  slender:     { upperArm: { widthAdd: -2 }, lowerArm: { widthAdd: -3 } },                    // 細腕
  muscular:    { upperArm: { widthAdd: 4 }, lowerArm: { widthAdd: 2 } },                      // 筋肉質
  brawler:     { upperArm: { widthAdd: 3 }, lowerArm: { widthAdd: 7 } },                      // 前腕が極太(殴り手)
  longArms:    { upperArm: { lengthAdd: 4 }, lowerArm: { lengthAdd: 5 } },                    // 長い腕
  shortArms:   { upperArm: { lengthAdd: -4 }, lowerArm: { lengthAdd: -4 } },                  // 短い腕
  gauntlet:    { upperArm: { widthAdd: -0.5 },                                                // 篭手(前腕に金属)
                 lowerArm: { widthAdd: 4, band: { color: '#8a93a8', from: 0.1, to: 0.92, rivet: '#fc3' } } },
  bracer:      { lowerArm: { band: { color: '#6a4a24', from: 0.35, to: 0.85, rivet: '#c93' } } }, // 革の腕輪
  longSleeve:  { upperArm: { sleeve: { cover: 1 } },                                          // 長袖
                 lowerArm: { sleeve: { cover: 1, cuff: 3 } } },
  shortSleeve: { upperArm: { sleeve: { cover: 0.75, cuff: 2.5 } } },                          // 半袖
  mageSleeve:  { upperArm: { sleeve: { cover: 1 } },                                          // 広がり袖(魔法使い・巫女)
                 lowerArm: { widthAdd: -1, sleeve: { cover: 1, flare: 8, cuff: 3 } } },
  puffSleeve:  { upperArm: { widthAdd: 5, sleeve: { cover: 1, cuff: 3 } },                    // ふくらみ袖
                 lowerArm: { sleeve: { cover: 0.3, cuff: 3 } } },
  bandaged:    { upperArm: { wrap: { count: 4 } }, lowerArm: { wrap: { count: 5 } } }         // 包帯ぐるぐる
};

// 浅くない(2階層まで)マージ: sleeve などの中身だけ上書きできるようにする
function mergeDeep(a, b) {
  const o = Object.assign({}, a);
  for (const k in b) {
    const v = b[k];
    o[k] = v && typeof v === 'object' && !Array.isArray(v) && o[k] && typeof o[k] === 'object' ? mergeDeep(o[k], v) : v;
  }
  return o;
}

function armSpec(spec) {
  const b = (spec && spec.body) || {};
  const tpl = ARM_TEMPLATES[b.armType] || ARM_TEMPLATES.standard,
    top = typeof TOP_TEMPLATES !== 'undefined' ? topSpec(b) : {};      // 服(上)のテンプレートが決める袖
  return {
    upper: mergeDeep(mergeDeep(tpl.upperArm || {}, top.upperArm || {}), b.upperArm || {}),
    lower: mergeDeep(mergeDeep(tpl.lowerArm || {}, top.lowerArm || {}), b.lowerArm || {})
  };
}

// 上腕・下腕の長さ / 太さ(px)。描画(drawStandardArm)と当たり判定(fighterHitParts)で同じ値を使う
//   Y.ua / Y.la / Y.uaw / Y.law = body.upperArm / lowerArm の length / width。テンプレートの増減(lengthAdd / widthAdd)を足す
function armLengths(Y, spec) {
  const s = armSpec(spec);
  return [Math.max(1, Y.ua + (s.upper.lengthAdd ?? 0)), Math.max(1, Y.la + (s.lower.lengthAdd ?? 0))];
}
function armWidths(Y, spec) {
  const s = armSpec(spec);
  return [Math.max(1, Y.uaw + (s.upper.widthAdd ?? 0)), Math.max(1, Y.law + (s.lower.widthAdd ?? 0))];
}

// 太もも・すねの長さ(px。body.thighLength / shinLength)。描画(drawStandardLeg)・腰の高さ・当たり判定で同じ値を使う
function legLengths(Y, spec) {
  return [Y.ul, Y.ll];
}

// 着地・ジャンプ前隙・攻撃などでつぶれる量。描画(drawF)と当たり判定(fighterHitParts)で同じ値を使う
function fighterWeight(p) {
  const m = p.mv, air = p.y < GY;
  let weight = 0;
  if (p.st === 'land') weight = 0.1 * Math.max(0, 1 - p.t / Math.max(1, p.lg));
  else if (p.st === 'jsq') weight = 0.055 * p.t / Math.max(1, p.ch.jsq);
  else if (p.st === 'hit') weight = air ? 0.025 : 0.075 * Math.max(0, 1 - p.t / 16);
  else if (p.st === 'dash') weight = 0.035;
  else if (p.st === 'atk' && m) {
    weight = 0.035 * Math.max(0, 1 - p.t / Math.max(1, m.st));
    if (p.t >= m.st && p.t <= m.st + m.ac)
      weight += 0.035 * Math.sin(Math.PI * (p.t - m.st) / Math.max(1, m.ac));
  }
  return weight;
}
const FIGHTER_SIZE = 1.07; // drawF の描画倍率(当たり判定も同じ倍率を使う)

// ============================================================
// 向き (X軸の向き)   ※ 状態の持ち方は script.js の dirTarget / tgt を参照
//   0=真横  1=少し正面向き  2=まあまあ正面向き  3=正面向き   (小数は「回っている途中」の見た目)
//   頭(head=姿勢配列13番目)と体(body=14番目)は別々の値。何も指定しないと 頭=0 / 体=1。
//   ・体: 胴体の幅 / 肩と腰(脚の付け根)の左右の開き / 靴の向き / 服の見え方 が変わる。
//         腕・脚の角度は画面上の角度のまま(攻撃の見た目と当たり判定は向きで変わらない)
//   ・頭: 顔のパーツ・耳・髪・頭の装飾・顔の装飾が、CHARACTER_DRAWS の設定から向き別に描き直される
//   下のテーブルは [真横, 少し正面, まあまあ正面, 正面] の4つの値。小数の向きは間を直線で補間する。
//   数値を変えれば、向きごとの見た目を調整できる。
// ============================================================
function dirLerp(tbl, d) {
  const i = Math.max(0, Math.min(tbl.length - 1.0001, d)), k = Math.floor(i);
  return tbl[k] + (tbl[k + 1] - tbl[k]) * (i - k);
}

// 体の向きごとの形 (長さは胴体の半幅 hw に対する倍率)
const BODY_DIR = {
  shN:   [0.04, 0.30, 0.80, 1.12],   // 手前の腕の肩(後ろ側へずれる)。0.30 が従来の見た目
  shF:   [0.04, 0.35, 0.80, 1.12],   // 奥の腕の肩(前側へずれる)。0.35 が従来の見た目
  hipN:  [0.05, 0.28, 0.48, 0.60],   // 手前の脚の付け根
  hipF:  [0.05, 0.28, 0.48, 0.60],   // 奥の脚の付け根
  front: [1, 1, 1.12, 1.28],         // 胴体の前側の幅
  sym:   [0, 0, 0.55, 1],            // 背中側の幅を前側に合わせる割合(1=左右対称=正面)
  toe:   [0, 0, 0.5, 1]              // 靴を正面向き(足先が左右に広がる)にする割合
};

// 体の形。q = 姿勢配列(13=頭 14=胴 15=右上腕 16=右前腕 17=左上腕 18=左前腕 19=右足 20=左足。書いていない部位は胴の向きに従う)
//   胴の向きは幅・対称さ(|向き|で決まる。背面も正面と同じ幅)、各部位の向きは付け根の左右の位置を決める(負の向きは左右が入れ替わる)
function bodyDirGeo(Y, spec, q) {
  const tb = q[14] ?? 1, ab = Math.abs(tb), TS = torsoSpec(spec), fm = dirLerp(BODY_DIR.front, ab), sym = dirLerp(BODY_DIR.sym, ab),
    dr = (i) => q[i] ?? tb,
    sg = (d) => Math.max(-1, Math.min(1, d / 0.15)),               // 向きの符号(0付近はなめらかに0へ)
    lat = (tbl, d) => sg(d) * dirLerp(tbl, Math.abs(d)),
    shN = lat(BODY_DIR.shN, tb), shF = lat(BODY_DIR.shF, tb);       // 肩・股関節の位置は胴の向きだけで決まる(腕・脚の向きでは動かない)
  return {
    fm, sym, bm: 1 + (fm / TS.back - 1) * sym,    // 胴体の前側 / 背中側の幅の倍率 (P(t, o) の o にかかる)
    shN, shF,                                      // 右腕(手前) / 左腕(奥)の肩の位置
    hipN: lat(BODY_DIR.hipN, tb), hipF: lat(BODY_DIR.hipF, tb),     // 右足 / 左足の付け根
    elN: 0, elF: 0,                                // (以前の肘の横ずれ。今は腕の向きは limbTheta の縮みで表す)
    toeN: dirLerp(BODY_DIR.toe, Math.abs(dr(19))), toeF: dirLerp(BODY_DIR.toe, Math.abs(dr(20))),   // 靴の向き
    b: tb
  };
}

// ============================================================
// 頭の装飾 (CHARACTER_DRAWS の headgear)
//   [{ type: 'headband', ... }, { type: 'horn', ... }] のように並べる。
//   layer: 'front'(髪の上・省略時) / 'back'(髪の下)
//   type: headband / horn / halo / witchHat / crown / goggles / ribbon / headdress
//   座標の x, y は頭の半径(Rh)に対する割合。(0,0)=頭の中心、+x=顔の向き、-y=上
// ============================================================
function drawHeadgear(ctx, list, layer) {
  const { g, K, C, LG, ol, line, dot, poly, hcx, hcy, Rh, wv, tr } = ctx;
  for (const it of asList(list)) {
    if (it && ctx.hv && ctx.hv.turned) { drawHeadgearTurned(ctx, it, layer); continue; }   // 向きが付いているときは向き別の描画
    if (!it || (it.layer || 'front') !== layer) continue;
    switch (it.type) {

      // 鉢巻: color/color2(2本目のなびき)/y/w(太さ)/edge(縁の太さ)/span(横幅)/tails(0〜2)/drop,drop2(垂れ具合)
      case 'headband': {
        const y = hcy + Rh * (it.y ?? -0.45), w = it.w ?? 4.2, c = it.color || '#fff', span = it.span ?? 1,
          a = [hcx - Rh * span, y], b = [hcx + Rh * span, y], tails = it.tails ?? 0;
        line(a, b, it.edge ?? w + 2.3 * olScale(), '#111');
        line(a, b, w, C(c));
        headbandTails(ctx, it, a);
        break;
      }

      // 角: x/y/side(-1 or 1)。layer:'back' にすると髪の後ろに回る
      case 'horn':
        ctx.horn(hcx + Rh * (it.x ?? -0.1), hcy + Rh * (it.y ?? -0.8), it.side ?? 1, it.color);
        break;

      // 天使の輪: color/w/gap(頭からの距離)/rx/ry
      case 'halo':
        g.strokeStyle = C(it.color || '#fc3');
        g.lineWidth = it.w ?? 3;
        g.beginPath();
        g.ellipse(hcx, hcy - Rh - (it.gap ?? 11), it.rx ?? 15, it.ry ?? 4, 0, 0, 7);
        g.stroke();
        break;

      // とんがり帽子: color/dark/band/gem(false で無し)/height
      // レースのヘッドドレス(頭頂を横切る帯 + フリル + 横のリボン): color / frill / bow / knot / tilt / tails
      case 'headdress': drawLaceHeaddress(ctx, it, layer); break;
      case 'witchHat': {
        drawWitchHat(ctx, it);                                       // 揺れ物で動くとんがり帽子
        break;
      }

      // 王冠: color/width/height/gem
      case 'crown': {
        const c = it.color || '#fc3', w = Rh * (it.width ?? 0.8), h = Rh * (it.height ?? 0.75), y0 = hcy - Rh * 0.55;
        poly([
          [hcx - w, y0], [hcx - w, y0 - h * 0.9], [hcx - w * 0.5, y0 - h * 0.45], [hcx, y0 - h],
          [hcx + w * 0.5, y0 - h * 0.45], [hcx + w, y0 - h * 0.9], [hcx + w, y0]
        ]);
        g.fillStyle = LG(0, y0 - h, 0, y0, K(c, 0.3), K(c, -0.15));
        g.fill();
        ol(2.2);
        line([hcx - w, y0 - 1.5], [hcx + w, y0 - 1.5], 2.5, K(c, -0.4));
        if (it.gem) dot(hcx, y0 - h * 0.3, 2.4, C(it.gem));
        break;
      }

      // ゴーグル(額にかける): strap/frame/lens/y
      case 'goggles': {
        const y = hcy + Rh * (it.y ?? -0.62), lx = hcx + Rh * 0.28, ly = y - Rh * 0.15, r = Rh * 0.3;
        line([hcx - Rh, y], [hcx + Rh * 0.9, y], 3 + 2.5 * olScale(), '#111');
        line([hcx - Rh, y], [hcx + Rh * 0.9, y], 3, C(it.strap || '#6a4a24'));
        dot(lx, ly, r + 0.4 + 1.8 * olScale(), '#111');
        dot(lx, ly, r + 0.4, C(it.frame || '#c93'));
        dot(lx, ly, r - 1.6, C(it.lens || '#8cf'));
        dot(lx + r * 0.3, ly - r * 0.3, r * 0.25, C('rgba(255,255,255,.8)'));
        break;
      }

      // 後頭部のリボン: color
      case 'ribbon': {
        const c = C(it.color || '#e46'), bx = hcx - Rh * 0.72, by = hcy - Rh * 0.6;
        [[-9, 15], [-3, 18]].forEach(([dx, dy], k) => {             // リボンの垂れ(物理でなびく)
          const pts = ctx.strand ? ctx.strand('ribbon' + k, [bx, by], { len: Math.hypot(dx, dy), n: 4, dir: [dx * headDirX(ctx), dy], stiff: [0.3, 0.02], damp: 0.07,
            flutter: 0.8, seed: k * 1.7, collide: 'back', r: 2, head: true, anchor: [hcx, hcy], ...physLimits(it) }) : [[bx, by], [bx + dx, by + dy]];
          strandRibbon(ctx, pts, 3, 2.6, c, true);
        });
        for (const s of [-1, 1]) {
          g.fillStyle = c;
          g.beginPath();
          g.ellipse(bx - 8, by + s * 5.5, 9, 5, s * 0.5, 0, 7);
          g.fill();
          ol(1.8);
        }
        dot(bx, by, 2.6 + 1.2 * olScale(), '#111');
        dot(bx, by, 2.6, c);
        break;
      }
    }
  }
}

// ============================================================
// 顔の装飾 (CHARACTER_DRAWS の faceDeco)  ※通常の頭のときだけ描画
//   type: beard / scar / line / blush / star / dot
//   x, y は頭の半径(Rh)に対する割合
// ============================================================
function drawFaceDeco(ctx, list) {
  const { g, K, C, ol, line, dot, poly, hcx, hcy, Rh } = ctx;
  for (const it of asList(list)) {
    if (!it) continue;
    switch (it.type) {

      // ひげ: color/mouth(口元の線の色)
      case 'beard': {
        g.fillStyle = K(it.color || '#4a2c14', 0);
        g.beginPath();
        g.moveTo(hcx - Rh * 0.45, hcy + Rh * 0.15);
        g.quadraticCurveTo(hcx - Rh * 0.3, hcy + Rh * 1.25, hcx + Rh * 0.55, hcy + Rh * 1.2);
        g.quadraticCurveTo(hcx + Rh * 1.1, hcy + Rh * 0.8, hcx + Rh * 0.95, hcy + Rh * 0.3);
        g.quadraticCurveTo(hcx + Rh * 0.6, hcy + Rh * 0.55, hcx + Rh * 0.2, hcy + Rh * 0.4);
        g.closePath();
        g.fill();
        ol(2.2);
        line([hcx + Rh * 0.28, hcy + Rh * 0.5], [hcx + Rh * 0.75, hcy + Rh * 0.48], 2, C(it.mouth || '#2a180a'));
        break;
      }

      // 傷あと(scar) / 直線(line): from/to=[x,y]/w/color
      case 'scar':
      case 'line': {
        const scar = it.type === 'scar',
          a = it.from || (scar ? [0.55, -0.6] : [0.1, 0.3]),
          b = it.to || (scar ? [0.8, -0.2] : [0.85, 0.3]);
        line([hcx + Rh * a[0], hcy + Rh * a[1]], [hcx + Rh * b[0], hcy + Rh * b[1]],
          it.w ?? (scar ? 2 : 2.6), C(it.color || (scar ? 'rgba(160,60,50,.9)' : 'rgba(220,40,30,.85)')));
        break;
      }

      // ほお紅: x/y/r/color
      case 'blush':
        g.fillStyle = C(it.color || 'rgba(255,90,170,.55)');
        g.beginPath();
        g.arc(hcx + Rh * (it.x ?? 0.32), hcy + Rh * (it.y ?? 0.42), Rh * (it.r ?? 0.2), 0, 7);
        g.fill();
        break;

      // 星マーク: x/y/size/color
      case 'star': {
        const cx = hcx + Rh * (it.x ?? 0.62), cy = hcy + Rh * (it.y ?? 0.37), s = Rh * (it.size ?? 1);
        poly([[0, -0.25], [0.08, -0.07], [0.26, -0.07], [0.12, 0.05], [0.18, 0.25],
              [0, 0.13], [-0.18, 0.25], [-0.12, 0.05], [-0.26, -0.07], [-0.08, -0.07]]
          .map(([x, y]) => [cx + x * s, cy + y * s]));
        g.fillStyle = C(it.color || '#f4a');
        g.fill();
        ol(1);
        break;
      }

      // 点(額の印など): x/y/r(px)/color
      case 'dot':
        dot(hcx + Rh * (it.x ?? 0.62), hcy + Rh * (it.y ?? -0.52), it.r ?? 2.8, C(it.color || '#c22'));
        break;
    }
  }
}

// ============================================================
// 髪テンプレート (CHARACTER_DRAWS の hair)
//   hair: "raiki"                                      … 従来の名前指定 (raiki / shino / blade / berserk)
//   hair: { type: 'long', color: '#3a2a1a', length: 0.7 }
//   hair: [ { type: 'long', ... }, { type: 'bangs', ... } ]   … 重ねて使える (配列の後ろほど手前)
//   type: long / ponytail / twinTails / bun / bangs / sideburns / ahoge
//   各タイプは 'back'(頭・胴体より後ろ) と 'front'(頭の上) を自分で描き分ける。
//   座標の x, y は頭の半径(Rh)に対する割合。(0,0)=頭の中心、+x=顔の向き、-y=上
//   cap: false にすると頭頂の髪のベース(帽子型)を描かない (他の髪と重ねるとき用)
// ============================================================
// 髪の上に耳を描き直す (後頭部まで髪で覆ったとき用)
function hairEar(ctx) {
  const { g, K, ol, hcx, hcy, Rh, skinColor, charDraw } = ctx;
  if (charDraw.showEars === false) return;
  g.fillStyle = K(skinColor, -0.1);
  g.beginPath();
  const hv = ctx.hv, ex = hv && hv.turned ? hv.S(-0.28, 0.95) : hcx - Rh * 0.28;   // 向き対応: 手前側の耳の位置
  g.ellipse(ex, hcy + Rh * 0.12, Rh * 0.16 * (hv && hv.turned ? 1 - 0.35 * hv.as : 1), Rh * 0.24, 0, 0, 7);
  g.fill();
  ol(1.8);
  if (charDraw.earDetail) charDraw.earDetail(ctx, skinColor);
}

function hairCap(ctx, it, col) {
  if (it.cap !== false) ctx.cap(ctx.K(col, 0), 1.84, 0.1, it.back ?? 1);   // back: 後頭部の髪の長さ 0〜1 (省略時1=うなじまで / 0=従来の耳の高さまで)
}

// 鉢巻のなびき(結び目 a から tails 本)。物理で動き、走る・跳ぶ・振り向くとなびき、背中・頭に当たると止まる
//   tailLength(長さの倍率, 省略1) / drop, drop2(静止時の垂れ具合) / flutter(はためき, 省略1.2)
// 設定(it)に書かれた揺れ物の制限だけを取り出す(maxBend / maxRoot / reach / maxV / rootFlex)。書かれていない物はそのまま(全体の値を使う)
function physLimits(it) {
  const o = {};
  if (it) for (const k of ['maxBend', 'maxRoot', 'reach', 'maxV', 'rootFlex']) if (it[k] != null) o[k] = it[k];
  return o;
}

// 後頭部から垂れる物(鉢巻・リボン)の見える範囲。横〜正面では頭の後ろに隠れ、正面寄りでは胴体の後ろにも隠れる / 背面では全部見える
function behindHead(ctx, fn) {
  const { g, hv, hcx, hcy, Rh } = ctx;
  if (!hv || !hv.turned || hv.back) return fn();
  g.save();
  clipOutsideHead(ctx);                                            // 頭の形(あご付き・鼻も)の外側
  if (hv.as > 0.3 && ctx.torsoPoly) {                               // 正面寄りでは垂れた先が胴体の後ろに回る
    ctx.torsoPoly(1);
    g.rect(hcx - 400, hcy - 400, 800, 800);
    g.clip('evenodd');
  }
  fn();
  g.restore();
}

// 物理の静止時の向きを頭の向きに合わせる(横向きでは後ろへ流れ、正面・背面に近いほど真下へ垂れる)
function headDirX(ctx) {
  return ctx.hv && ctx.hv.turned ? ctx.hv.cs : 1;
}

function headbandTails(ctx, it, a) {
  const { C } = ctx, tails = Math.min(2, it.tails ?? 0), c = it.color || '#fff', vx = headDirX(ctx),
    defs = [[14, it.drop ?? 6, 4, c], [24, it.drop2 ?? 14, 3.5, it.color2 || c]];
  for (let k = 0; k < tails; k++) {
    const [dx, dy, w, col] = defs[k], len = Math.hypot(dx, dy) * (it.tailLength ?? 1);
    const pts = ctx.strand
      ? ctx.strand('headband' + k, a, { len, n: 6, dir: [-dx * vx, dy], curve: 0.05, stiff: [0.2, 0.008], damp: 0.07, grav: 1,
          flutter: it.flutter ?? 1.2, seed: k * 2.3, collide: 'back', r: w * 0.6, head: true, anchor: [ctx.hcx, ctx.hcy], ...physLimits(it) })
      : [a, [a[0] - dx, a[1] + dy]];
    strandRibbon(ctx, pts, w, w * 0.8, C(col));
  }
}

// 先細りの毛束 (ポニーテール / ツインテール / 側髪用)。R=根元, T=静止時の毛先, vol=根元の太さ
//   id を渡すと物理で揺れる(省略時は止まった形)。opt.collide='back'(背中で止まる, 省略時) / 'none' 、opt.stiff=[根元, 先]
function hairTail(ctx, R, T, vol, col, dim = 0, id = null, opt = {}) {
  const { g, K, ol } = ctx, dx = T[0] - R[0], dy = T[1] - R[1], len = Math.hypot(dx, dy);
  const pts = id && ctx.strand && len > 2
    ? ctx.strand(id, R, { len, n: opt.n ?? 5, dir: [dx, dy], curve: opt.curve ?? 0.04, stiff: opt.stiff || [0.4, 0.08], damp: 0.06,
        grav: opt.grav ?? 1, collide: opt.collide || 'back', r: vol * 0.7, head: opt.head ?? true, anchor: [ctx.hcx, ctx.hcy], ...physLimits(opt) })
    : [0, 0.25, 0.5, 0.75, 1].map((f) => [R[0] + dx * f, R[1] + dy * f]);
  const tip = opt.tip || (HAIR_TIPS.on ? 'split2' : 'point'),            // 毛先: 'split2'=2本の毛束に分かれる(HAIR_TIPS.on のとき) / 'point'
    wf = (f) => vol * (0.55 + 0.6 * Math.sin(Math.PI * Math.min(1, f * 1.4))) * (tip === 'point' ? 1 - 0.9 * f * f : 1 - 0.75 * f * f);
  g.fillStyle = K(col, dim);
  strandShape(g, pts, wf, 0, tip);
  g.fill();
  ol(2.3);
  g.strokeStyle = K(col, dim - 0.3);                               // 毛束の筋(中心線を少しずらして)
  g.lineWidth = 1.3;
  g.lineCap = 'round';
  g.beginPath();
  for (let i = 0; i < pts.length - 1; i++) {
    const p = pts[i], q = pts[i + 1], ex = q[0] - p[0], ey = q[1] - p[1], el = Math.hypot(ex, ey) || 1, o = vol * 0.25 * (1 - i / pts.length);
    const x = p[0] - ey / el * o, y = p[1] + ex / el * o;
    if (i) g.lineTo(x, y); else g.moveTo(x, y);
  }
  g.stroke();
}

// もみあげ: こめかみから頬へ垂れる毛束。len は頭の半径に対する長さ
function hairSideburn(ctx, col, len) {
  if (!(len > 0)) return;
  const { g, K, ol, hcx, hcy, Rh } = ctx,
    y0 = hcy - Rh * 0.6, y1 = hcy - Rh * 0.38 + Rh * len, ym = (y0 + y1) / 2,
    J = ctx.jiggle ? ctx.jiggle('sideburn', [hcx, y0], { k: 0.12, damp: 0.16, max: 4 }) : [0, 0], jx = J[0] * len, jy = J[1] * len * 0.5;   // 毛先は頭の動きに遅れてしなる
  const path = () => {
    g.moveTo(hcx - Rh * 0.14, y0);
    g.lineTo(hcx - Rh * 0.14, ym - Rh * 0.1);
    g.quadraticCurveTo(hcx - Rh * 0.12 + jx * 0.8, ym + Rh * 0.1, hcx + Rh * 0.04 + jx, y1 + jy);
    g.quadraticCurveTo(hcx + Rh * 0.3 + jx * 0.8, ym, hcx + Rh * 0.26, y0);
  };
  g.fillStyle = K(col, 0);
  g.beginPath();
  path();
  g.closePath();
  g.fill();
  g.beginPath();           // 上辺(髪との境目)には線を引かない
  path();
  ol(2);
}

// ロングヘアの後ろ髪。頭の後ろから垂れて背中に沿う「髪の束」と、頭(後頭部)をひとつの形として描く。
//   ・真横では薄く(背中に沿う厚み)、正面・背面では広く(肩の幅)なる
//   ・毛先は物理で動き、背中に当たると止まる(体と重ならない)
//   ・頭の輪郭が髪を横切って「結んでいる」ように見えないよう、頭を描いたあとに longHairSeam で境目を消す
function longHairGeom(ctx, it) {
  const { hcx, hcy, Rh, ny, Y } = ctx, hv = ctx.hv && ctx.hv.turned ? ctx.hv : { cs: 1, sn: 0 }, cs = hv.cs, sn = hv.sn;
  const len = it.length ?? 0.7, vol = it.volume ?? 4, wave = it.wave ?? 0.4, tip = it.tip || (HAIR_TIPS.on ? 'split' : 'point'),   // 毛先(省略時は3本の毛束に分かれる)
    a = Rh * 0.42 + vol * 0.3,                                      // 真横のときの半分の厚み
    b = Rh * 1.02 + vol * 0.6,                                      // 正面・背面のときの半分の幅
    hwid = Math.sqrt(a * a * cs * cs + b * b * sn * sn),
    ry = 0.42 * Math.abs(cs),                                      // 根元の高さ: 真横はうなじ寄り / 正面・背面は頭のいちばん広いところ(頭から真下へ垂れる)
    root = [hcx - Rh * 0.6 * cs, hcy + Rh * ry],                    // 束の根元(頭の中)
    tipY = ny + Y.tl * len,                                        // 毛先の高さ(首の付け根から胴の長さ×length)
    L = Math.max(Rh * 0.6, tipY - root[1]);
  let pts = ctx.strand
    ? ctx.strand('longHair', root, { len: L, n: 6, dir: [-0.1 * cs, 1], stiff: [0.5, 0.1], damp: 0.06, collide: 'back', r: 1, anchor: [hcx, hcy], ...physLimits(it) })
    : [0, 1, 2, 3, 4, 5, 6].map((i) => [root[0] - 0.1 * cs * L * i / 6, root[1] + L * i / 6]);
  pts = pts.map((p, i) => [p[0] + Math.sin(i * 1.7) * wave * Rh * 0.06 * (i / 6), p[1]]);   // 波打ち
  // 太さ: 根元から少し広がり(背中に広がる)、毛先へ向けて細くなる
  const wf = (f) => hwid * (1 + 0.12 * Math.sin(Math.PI * Math.min(1, f * 1.5))) *
    (tip === 'point' ? 1 - 0.8 * f * f : tip === 'round' ? 1 - 0.3 * f : tip === 'split' || tip === 'split2' ? 1 - 0.55 * f * f : 1 - 0.12 * f);
  // 根元は頭の幅(その高さの頭の円の幅)から始めて、肩へ向けて広げる(背面で頭と髪の間に段ができないように)
  const chord = Math.sqrt(Math.max(0, 1 - ry * ry)) * (Rh + 1.5), w0 = Math.min(1, chord / hwid),
    wfs = (f) => wf(f) * (w0 + (1 - w0) * Math.min(1, f / 0.3));
  // 形を描くときは、根元より上(頭の中)へ少し延ばす。根元の角が頭の外へ出ず、髪の縁が頭からなめらかに出てくる
  const d0 = [pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]], dl = Math.hypot(d0[0], d0[1]) || 1,
    up = [pts[0][0] - d0[0] / dl * Rh * 0.6, pts[0][1] - d0[1] / dl * Rh * 0.6],
    n = pts.length, dpts = [up, ...pts],
    dwf = (f) => { const i = f * n; return i < 1 ? wfs(0) * (0.75 + 0.25 * i) : wfs((i - 1) / (n - 1)); };
  return { pts, wf: wfs, dpts, dwf, tip, Rr: ctx.hairOver ? Rh + 1.5 : Rh + 0.25 };
}

// 髪の形(頭の円 + 垂れた束)を、外側だけ縁取りして塗る(2つの形の境目に線が出ない)
function longHairFill(ctx, G, col, backOnly = false) {
  const { g, K, hcx, hcy, Rh, hv } = ctx;
  // backOnly: 頭のまるい髪(dome)を後頭部の側だけに描く。顔の側まで描くと、髪の円の太い輪郭が顔のまわり(あご・鼻)にはみ出す
  const xm = hcx + Rh * (-0.3 - 0.7 * (hv && hv.turned ? hv.sn : 0)),
    dome = (forStroke) => {
      g.beginPath();
      if (backOnly && !ctx.hairOver) {
        if (xm <= hcx - G.Rr) return;
        const a = Math.acos(Math.max(-1, Math.min(1, (xm - hcx) / G.Rr)));
        g.arc(hcx, hcy, G.Rr, a, Math.PI * 2 - a);
        if (!forStroke) g.closePath();                               // 縁取りは円の弧だけ(切り口のまっすぐな線は描かない)
      } else g.arc(hcx, hcy, G.Rr, 0, Math.PI * 2);
    };
  g.strokeStyle = '#111';
  g.lineWidth = 5 * olScale();
  g.lineJoin = 'round';
  if (olScale() > 0) { dome(true); g.stroke(); strandShape(g, G.dpts, G.dwf, 0, G.tip); g.stroke(); }
  g.fillStyle = K(col, 0);
  dome(); g.fill();
  strandShape(g, G.dpts, G.dwf, 0, G.tip); g.fill();
}

function longHairBack(ctx, it, col) {
  const { g, K } = ctx, G = longHairGeom(ctx, it), pts = G.pts, wf = G.wf;
  longHairFill(ctx, G, col, true);
  g.strokeStyle = K(col, -0.32);                                   // 毛束の筋
  g.lineWidth = 1.4;
  g.lineCap = 'round';
  for (const s of [-0.45, 0.4]) {
    g.beginPath();
    for (let i = 1; i < pts.length - 1; i++) {
      const p = pts[i], q = pts[i + 1], ex = q[0] - p[0], ey = q[1] - p[1], el = Math.hypot(ex, ey) || 1, o = wf(i / (pts.length - 1)) * s;
      const x = p[0] - ey / el * o, y = p[1] + ex / el * o;
      if (i > 1) g.lineTo(x, y); else g.moveTo(x, y);
    }
    g.stroke();
  }
  if (!ctx.hairOver) (ctx.longHairSeams = ctx.longHairSeams || []).push({ G, col });   // 頭を描いたあとで境目を消す
}

// 頭の輪郭のうち、ロングヘアが垂れているところ(後頭部〜うなじ)を消して、髪と頭の外形を1本の線にする。
//   頭の輪郭の近く(帯状)だけ、後頭部側(顔側は触らない)だけを描き直す
function longHairSeam(ctx, S) {
  const { g, hcx, hcy, Rh, hv } = ctx, sn = hv && hv.turned ? hv.sn : 0,
    xm = hcx + Rh * (-0.3 - 0.7 * sn);                             // これより後ろ側だけ(正面を向くほど狭く、背面を向くほど広く)
  if (xm <= hcx - Rh * 1.05) return;
  g.save();
  g.beginPath();
  g.rect(hcx - 400, hcy - 400, xm - (hcx - 400), 800);
  g.clip();
  g.beginPath();
  g.arc(hcx, hcy, Rh + 3.2, 0, Math.PI * 2);
  g.arc(hcx, hcy, Math.max(1, Rh - 2.2), 0, Math.PI * 2, true);
  g.clip('evenodd');
  // 髪の形はいったん別のキャンバスに描いてから1回で貼る(縁取り→塗りを直接切り抜いて描くと、切り抜きの境目に縁取りの黒がうっすら残るため)
  const off = longHairOffscreen(g.canvas);
  if (off) {
    const o = off.getContext('2d');
    o.setTransform(1, 0, 0, 1, 0, 0);
    o.clearRect(0, 0, off.width, off.height);
    o.setTransform(g.getTransform());
    longHairFill({ ...ctx, g: o }, S.G, S.col);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(off, 0, 0);
  } else longHairFill(ctx, S.G, S.col);
  g.restore();
}

let LONG_HAIR_OFF = null;
function longHairOffscreen(cv) {
  if (typeof document === 'undefined' || !cv) return null;
  if (!LONG_HAIR_OFF) LONG_HAIR_OFF = document.createElement('canvas');
  if (LONG_HAIR_OFF.width !== cv.width || LONG_HAIR_OFF.height !== cv.height) { LONG_HAIR_OFF.width = cv.width; LONG_HAIR_OFF.height = cv.height; }
  return LONG_HAIR_OFF;
}


// ---- シースルーぱっつん(前髪 style: 'seeThrough') ----
//   短いぱっつん(length - drop まで)の下に、すき間から額が見える細い毛束を count 本たらす。毛束の先は length の高さ(ふつうのぱっつんと同じ)
//   書ける項目: length(毛先の低さ。ぱっつんと同じ 0〜1.6。省略 0.6) / drop(毛束の長さ。省略 0.38) / count(毛束の数。省略 9) /
//              width(毛束の太さの倍率。省略 1) / spread(毛束が並ぶ幅の倍率。省略 1)
function seeThroughLens(it) {
  const len = Math.max(0.1, Math.min(1.6, it.length ?? 0.6)), drop = it.drop ?? 0.38;
  return { len, top: Math.max(0, len - drop) };
}
function drawSeeThroughStrands(ctx, it, L, hv) {
  const { g, K, hcy, Rh } = ctx, col = it.color || '#4a2c14',
    n = Math.max(3, it.count ?? 9), Ut = 0.62 - 0.55 * L.top + 0.04, Ub = 0.62 - 0.55 * L.len,
    cs = hv.cs ?? 1, sn = hv.sn ?? 0, wk = it.width ?? 1, sp = it.spread ?? 1,
    sway = ctx.jiggle ? ctx.jiggle('seeThrough', [ctx.hcx, hcy], { k: 0.12, damp: 0.18, max: 4 })[0] : 0;
  const pt = (th, U) => { const r = Math.sqrt(Math.max(0, 1 - U * U)) * 1.06; return [hv.S(r * Math.cos(th), r * Math.sin(th)), hcy - Rh * U]; };
  const strands = [];
  for (let i = 0; i < n; i++) {
    const th = (-0.95 + (1.9 * i) / (n - 1)) * sp, depth = Math.cos(th) * sn + Math.sin(th) * cs;   // こちらを向いている度合い
    if (depth < -0.25) continue;                                        // 頭の向こう側の毛束は描かない
    const v = Math.sin(i * 12.9898) * 43758.5453, rnd = v - Math.floor(v),
      Ue = Ub + (rnd - 0.5) * 0.12 + (i % 2 ? 0.05 : 0);              // 毛先の高さを少しずつずらす
    strands.push({ th, Ue, depth, w: Rh * 0.055 * wk * (0.8 + 0.4 * rnd) });
  }
  strands.sort((a, b) => a.depth - b.depth);
  for (const S of strands) {
    const A = pt(S.th - 0.045, Ut), B = pt(S.th + 0.045, Ut), M = pt(S.th + 0.01, Ut * 0.45 + S.Ue * 0.55), E = pt(S.th + 0.02, S.Ue);
    E[0] += sway; M[0] += sway * 0.5;
    const half = Math.max(1.4, S.w);
    g.beginPath();
    g.moveTo(Math.min(A[0], B[0]) - half * 0.5, A[1]);
    g.quadraticCurveTo(M[0] - half * 0.6, M[1], E[0], E[1]);
    g.quadraticCurveTo(M[0] + half * 0.6, M[1], Math.max(A[0], B[0]) + half * 0.5, B[1]);
    g.closePath();
    g.fillStyle = K(col, -0.04);
    g.fill();
    g.lineWidth = 0.9 * olScale('hair');
    g.strokeStyle = '#111';
    g.stroke();
  }
}

const HAIR_STYLES = {

  // ロングヘア(結ばない): color / length(0=あご下 0.5=背中 1=腰) / volume(後ろへの広がりpx)
  //                       wave(波打ち 0〜1) / tip('point' | 'round' | 'flat' 毛先の形) / cap
  long(ctx, it, layer) {
    const col = it.color || '#3a2a1a';
    if (layer === 'front') return hairCap(ctx, it, col);
    longHairBack(ctx, it, col);
  },

  // ポニーテール: color / length / y(結び位置の高さ) / volume(根元の太さpx) / tie(結び目の色, false で無し) / cap
  ponytail(ctx, it, layer) {
    const { dot, C, hcx, hcy, Rh, Y, wv, tr } = ctx;
    const col = it.color || '#3a2a1a', len = it.length ?? 0.5, vol = it.volume ?? 7,
      R = [hcx - Rh * 0.98, hcy + Rh * (it.y ?? -0.45)],
      sway = 0,                                                    // なびきは物理(hairTail の id)で動く
      T = [R[0] - Rh * 0.55 + sway, R[1] + Y.tl * len + Rh * 0.2];
    if (layer === 'back') return hairTail(ctx, R, T, vol, col, 0, 'ponytail', physLimits(it));
    hairCap(ctx, it, col);
    if (it.tie !== false) {
      dot(R[0], R[1], vol * 0.5 + 1.8 * olScale(), '#111');
      dot(R[0], R[1], vol * 0.5, C(it.tie || '#e46'));
    }
  },

  // ツインテール: color / length / y(結び位置の高さ) / volume / tie / cap
  twinTails(ctx, it, layer) {
    const { dot, C, hcx, hcy, Rh, Y, wv, tr } = ctx;
    const col = it.color || '#3a2a1a', len = it.length ?? 0.6, vol = it.volume ?? 6, y = it.y ?? -0.3,
      sway = 0,                                                    // なびきは物理(hairTail の id)で動く
      Rf = [hcx - Rh * 0.62, hcy + Rh * (y - 0.12)], Rn = [hcx - Rh * 0.8, hcy + Rh * (y + 0.08)],
      Tf = [hcx - Rh * 1.6 + sway * 1.1, Rf[1] + Y.tl * len + Rh * 0.1],
      Tn = [hcx - Rh * 1.0 + sway, Rn[1] + Y.tl * len];
    if (layer === 'back') return hairTail(ctx, Rf, Tf, vol, col, -0.2, 'twinF', physLimits(it));      // 奥の房(少し暗い)
    hairCap(ctx, it, col);
    hairTail(ctx, Rn, Tn, vol, col, 0, 'twinN', physLimits(it));                                         // 手前の房
    if (it.tie !== false) {
      dot(Rn[0], Rn[1], vol * 0.5 + 1.8 * olScale(), '#111');
      dot(Rn[0], Rn[1], vol * 0.5, C(it.tie || '#e46'));
    }
  },

  // ぎざぎざの長い前髪: 細くとがった毛束を何本も額から垂らす。毛束の間から目が見える(メイ)。long などと重ねて、髪の一覧の後ろに書く
  //   color / length(毛先の長さ 0〜1) / count(毛束の数) / seed(長さのばらつき方)
  jaggedBangs(ctx, it, layer) { return HAIR_TURNED.jaggedBangs(ctx, it, layer); },

  // サイドテール: 頭の片側で1つに結んだ房。color / length / y(結び位置の高さ) / volume / tie(結び目の色) / flower(結び目の花飾りの色。false で無し)
  //   side(1=手前側 / -1=奥側。省略時 1) / cap … 向きを変えたときの描き方は HAIR_TURNED と同じ
  sideTail(ctx, it, layer) { return HAIR_TURNED.sideTail(ctx, it, layer); },

  // お団子: color / x / y / r(団子の大きさ) / tie / cap
  bun(ctx, it, layer) {
    if (layer !== 'front') return;
    const { g, K, C, dot, line, hcx, hcy, Rh } = ctx;
    const col = it.color || '#3a2a1a', r = Rh * (it.r ?? 0.42),
      x = hcx + Rh * (it.x ?? -0.35), y = hcy + Rh * (it.y ?? -1.0);
    hairCap(ctx, it, col);
    dot(x, y, r + 2 * olScale(), '#111');
    dot(x, y, r, K(col, 0));
    g.strokeStyle = K(col, -0.32);
    g.lineWidth = 1.3;
    g.beginPath();
    g.arc(x, y, r * 0.6, 0.3, 3.6);
    g.stroke();
    if (it.tie !== false) line([x - r * 0.75, y + r * 0.85], [x + r * 0.75, y + r * 0.85], 3, C(it.tie || '#e46'));
  },

  // 前髪: style('center'=センター分け / 'side'=横分け / 'straight'=ぱっつん) / color
  //       part(分け目の位置 -1〜1。省略時0)
  //            center: 分けた髪の角度(左右対称)。+1=partAngle 度(省略30)開く / -1=閉じる。生え際・側髪・耳も一緒に回る
  //            side:   分け目の線の前後位置(+で顔側、-で後頭部側)
  //       partY(生え際の上下 -1〜1。+で生え際が下がって額が狭く、-で上がって額が広い。
  //            省略時 center=0 / side=0.6) / partColor(分け目の線の色。省略時は髪色に合わせて自動で明暗を付ける)
  //            ※ straight は part=頭頂の始点x(省略時-0.2)で、partY は使わない
  //       length(前髪の生え際の低さ 0〜1。center/side の省略時=0.1 / straight=0.5)
  //       sideburn(側髪の長さ。center/side は 1.45 で胸元まで垂れる(省略時) / straight は頭の半径に対する割合で省略時=0.6。0で無し)
  //       sideburnColor / cap(false で頭頂のベースを描かず前髪だけ描く)
//       back(後頭部の髪の長さ 0〜1。省略時1=うなじ側まで髪で覆う / 0=従来の耳の高さまで)
  //   ※キャラは真横向きなので、センター分け/横分けは
  //     「頭頂から額へ降りる生え際が、顔の側面を斜めに流れてこめかみに届き、
  //       そこから長い側髪が耳の前に垂れる」形で描く(正面向きのV字ではない)
  bangs(ctx, it, layer) {
    if (layer !== 'front') return;
    if ((it.style || 'center') === 'center') return HAIR_TURNED.bangs(ctx, it, layer);
    if (it.style === 'seeThrough') {                                    // シースルーぱっつん: 短いぱっつんの下に、すき間のある細い毛束
      const L = seeThroughLens(it);
      HAIR_STYLES.bangs(ctx, { ...it, style: 'straight', length: L.top }, layer);
      drawSeeThroughStrands(ctx, it, L, { S: (F) => ctx.hcx + ctx.Rh * F, cs: 1, sn: 0 });
      return;
    }   // センター分けは向き対応の描画に統一(真横も同じ形から描く)
    const { g, K, ol, hcx, hcy, Rh, tr, wv } = ctx;
    const col = it.color || '#4a2c14', style = it.style || 'center',
      len = Math.max(0, Math.min(1.6, it.length ?? (style === 'straight' ? 0.5 : 0.1))),   // 1 より大きいと目にかかる長さ(シゲル)
      px = it.part ?? -0.2,                                           // straight 用(頭頂の始点x)
      R = Rh + 1.5,
      pUD = Math.max(-1, Math.min(1, it.partY ?? (style === 'side' ? 0.6 : 0))),   // 生え際の高さ(center/side)
      ty = -0.62 + 0.55 * len + (style === 'straight' ? 0 : 0.155 * pUD),         // 前髪の生え際の高さ(頭の中心から)
      aF = Math.asin(ty * Rh / R),                                    // 前髪が顔側に降りる角度
      pt = (a, r = R) => [hcx + r * Math.cos(a), hcy + r * Math.sin(a)],
      F = pt(aF), full = it.cap !== false,
      bk = Math.max(0, Math.min(1, it.back ?? 1)),                    // 後頭部の髪の長さ
      aS0 = Math.PI * (0.98 - 0.38 * bk);                             // 後頭部の髪の下端の角度(straight用)
    g.fillStyle = K(col, 0);
    g.beginPath();
    if (style === 'straight') {
      const aS = -Math.acos(Math.max(-0.95, Math.min(0.95, px * Rh / R))), S = pt(aS),   // 頭頂の始点
        by = hcy + Rh * (ty + 0.06);
      if (full) g.arc(hcx, hcy, R, bk > 0 ? aS0 : Math.PI * 0.98, aF);
      else { g.moveTo(S[0], S[1]); g.arc(hcx, hcy, R, aS, aF); }
      g.lineTo(F[0] - Rh * 0.02, by);
      if (full) {
        g.lineTo(hcx - Rh * 0.1, by);
        if (bk > 0) {                                                 // 後頭部の髪の内側の縁 (cap / センター分けと共通)
          g.lineTo(hcx - Rh * 0.44, hcy + Rh * 0.05);
          g.quadraticCurveTo(hcx + Rh * (-0.69 + 0.19 * bk), hcy + Rh * (0.09 + 0.41 * bk), ...pt(aS0));
          ctx.hairBackUsed = true;
        }
        else g.quadraticCurveTo(hcx - Rh * 0.7, by - Rh * 0.05, hcx - R, hcy + Rh * 0.1);
      } else g.lineTo(S[0], by);
      g.closePath();
      g.fill();
      ol(2.5);
      hairSideburn(ctx, it.sideburnColor || col, it.sideburn ?? 0.6);
      return;
    }
    // --- センター分け / 横分け (真横から見た形。座標は頭の半径Rh基準で P(x, y)) ---
    const side = style === 'side', sb = Math.max(0, it.sideburn ?? 1.45), k = Math.min(1.6, sb / 1.45),
      sway = ctx.jiggle ? ctx.jiggle('bangsLock', [hcx, hcy], { k: 0.1, damp: 0.16, max: 5 })[0] * (1 + 0.6 * k) : 0,   // 頭の動きに遅れて側髪の毛先がなびく
      P = (x, y) => [hcx + Rh * x, hcy + Rh * y],
      E = P(-0.03, 0.11),                                             // 生え際の終点(側髪の前の縁の根元)
      C = P(0.21 + 0.21 * pUD, ty - 0.015 * (1 - pUD)),               // 生え際のカーブの制御点(partY が大きいほど直線に近い)
      Lt = P(-0.44, 0.05),                                            // 側髪の後ろの縁の根元(耳の少し前)
      aB0 = Math.atan2(0.41, -0.89),
      aB = bk > 0 ? aS0 : aB0, B = pt(aB),                // 後頭部の髪の下端(back=1でうなじ側まで)                       // 後頭部の髪の下端(うなじ側)
      aA = -1.5, A = pt(aA),                                          // cap:false のときの頭頂側の端
      hasLock = sb > 0.05;
    let T = null, Lb = null;
    const trace = () => {                                             // 髪全体の輪郭(塗りと、分け目のはみ出し防止のクリップで使う)
      g.beginPath();
      if (full) g.arc(hcx, hcy, R, aB, aF);
      else { g.moveTo(A[0], A[1]); g.arc(hcx, hcy, R, aA, aF); }
      g.quadraticCurveTo(C[0], C[1], E[0], E[1]);                     // 額→こめかみへ斜めに流れる生え際
      if (hasLock) {
        T = P(-0.03 + 0.24 * k, 0.11 + 1.45 * k);                     // 側髪の毛先
        Lb = P(-0.44 + 0.36 * k, 0.05 + 1.44 * k);
        T[0] += sway;
        Lb[0] += sway * 0.8;
        const rc = P(-0.03, 0.11 + 0.72 * k), lc = P(-0.4, 0.05 + 0.72 * k);
        rc[0] += sway * 0.7;
        lc[0] += sway * 0.6;
        g.quadraticCurveTo(rc[0], rc[1], T[0], T[1]);                 // 側髪の前の縁
        g.lineTo(Lb[0], Lb[1]);                                       // 毛先は斜めにカット
        g.quadraticCurveTo(lc[0], lc[1], Lt[0], Lt[1]);               // 側髪の後ろの縁
      } else g.lineTo(Lt[0], Lt[1]);
      if (full) {
        if (bk > 0) ctx.hairBackUsed = true;
        const bc = P(-0.69 + 0.19 * bk, 0.09 + 0.41 * bk);                                  // 耳の上からうなじへ斜めに切れる後ろ髪の下端
        g.quadraticCurveTo(bc[0], bc[1], B[0], B[1]);
      } else g.quadraticCurveTo(hcx - Rh * 0.1, hcy - Rh * 0.5, A[0], A[1]);
      g.closePath();
    };
    trace();
    g.fill();
    ol(2.5);
    // 分け目: 頭に沿った弧。part で前後、partY で上下に動く。髪の外にははみ出さない
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v)),
      pFB = clamp(it.part ?? 0, -1, 1),
      rP = R * 0.88,
      aP0 = clamp(aF - 0.25 + pFB * 0.7, aF - 1.4, aF - 0.02),        // 前後: +で顔側へ
      aP1 = full ? aP0 - 1.7 : Math.max(aA, aP0 - 1.7),
      lum = (() => {                                                  // 髪色の明るさ(暗い髪なら分け目は明るく、明るい髪なら暗く)
        let h = typeof col === 'string' && col[0] === '#' ? col.slice(1) : '';
        if (h.length === 3) h = h.replace(/./g, '$&$&');
        const n = parseInt(h, 16);
        return h.length === 6 && !isNaN(n) ? (0.3 * ((n >> 16) & 255) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255)) / 255 : 0.3;
      })(),
      partCol = it.partColor || (lum < 0.4 ? K(col, 0.45) : K(col, -0.55));
    g.save();
    trace();
    g.clip();
    g.lineCap = 'round';
    g.strokeStyle = partCol;
    g.lineWidth = 2.2;
    g.beginPath();
    g.arc(hcx, hcy, rP, aP0, aP1, true);
    g.stroke();
    // 髪の筋: 分け目から生え際・こめかみ・うなじへ流れる + 側髪の筋
    g.strokeStyle = lum < 0.4 ? K(col, 0.2) : K(col, -0.3);
    g.lineWidth = 1.3;
    const Hm = [0.25 * F[0] + 0.5 * C[0] + 0.25 * E[0], 0.25 * F[1] + 0.5 * C[1] + 0.25 * E[1]],
      strands = [[aP0 - 0.3, Hm, 0.85], [aP0 - 0.8, E, 0.6]];
    if (full) strands.push([aP0 - 1.35, P(-0.69, 0.1), 0.7]);
    for (const [a, Q, f] of strands) {
      if (a < aP1) continue;
      const Ap = pt(a, rP), Bp = [Ap[0] + (Q[0] - Ap[0]) * f, Ap[1] + (Q[1] - Ap[1]) * f],
        mx = (Ap[0] + Bp[0]) / 2 + Math.cos(a) * Rh * 0.12, my = (Ap[1] + Bp[1]) / 2 + Math.sin(a) * Rh * 0.12;
      g.beginPath();
      g.moveTo(Ap[0], Ap[1]);
      g.quadraticCurveTo(mx, my, Bp[0], Bp[1]);
      g.stroke();
    }
    if (hasLock) {
      const S0 = P(-0.22, 0.2), S1 = P(-0.15 + 0.1 * k, 0.2 + 0.7 * k);
      g.beginPath();
      g.moveTo(S0[0], S0[1]);
      g.quadraticCurveTo(S1[0] + sway * 0.3, S1[1], T[0] - Rh * 0.1, T[1] - Rh * 0.14);
      g.stroke();
    }
    g.restore();
  },

  // もみあげだけ(他の髪型に足す用): color / length(頭の半径に対する長さ) / width(太さの倍率 1) / count(束の数 1。2本目からは後ろへずれる) / F(生える位置。+で顔の側 0.05) / top(生え始めの高さ 0.2)
  sideburns(ctx, it, layer) {
    if (it.count || it.width || it.F != null || it.top != null)       // 太さ・本数を書いたときは向き別と同じ描き方
      return HAIR_TURNED.sideburns(ctx.hv ? ctx : { ...ctx, hv: { S: (F) => ctx.hcx + ctx.Rh * F, cs: 1, sn: 0, as: 0 } }, it, layer);
    if (layer === 'front') hairSideburn(ctx, it.color || '#4a2c14', it.length ?? 0.6);
  },

  // アホ毛: color / x / length / curl(先の曲がり。+で顔側, -で後ろ側)
  ahoge(ctx, it, layer) {
    if (layer !== 'front') return;
    const { g, K, hcx, hcy, Rh, tr, wv } = ctx;
    const x0 = hcx + Rh * (it.x ?? 0.15), y0 = hcy - Rh * 0.95, L = Rh * (it.length ?? 0.9),
      curl = Rh * (it.curl ?? 0.5), J = ctx.jiggle ? ctx.jiggle('ahoge', [x0, y0], { k: 0.12, damp: 0.12, max: 7 }) : [0, 0], sway = J[0] * 1.6;   // 頭の動きに遅れてしなる
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(x0, y0);
    g.quadraticCurveTo(x0 + curl + sway * 0.7, y0 - L * 0.6, x0 - Rh * 0.1 + sway, y0 - L);
    g.lineWidth = 4.4;
    g.strokeStyle = '#111';
    g.stroke();
    g.lineWidth = 2.4;
    g.strokeStyle = K(it.color || '#4a2c14', 0);
    g.stroke();
  }
};

// 手前の腕より上(layer 'overArm')に描く髪の種類
const HAIR_OVER_ARM = ['sideTail'];
// layer: 'back' = 頭・胴体より後ろ / 'front' = 頭の上 / 'overArm' = 手前の腕より上(サイドテール。耳もこの下になる)
function drawHair(ctx, list, layer) {
  if (layer === 'front') ctx.hairBackUsed = false;
  // 奥のもみあげ(センター分けの側髪のうち顔の向こう側の物)は、キャラの中でいちばん後ろ(後ろ髪の 'back' のさらに前)に描く
  if (layer === 'back' && !ctx.hairOver) for (const it of asList(list)) {
    if (it && typeof it === 'object' && it.type === 'bangs' && (it.style || 'center') === 'center' && it.sideburn !== 0) HAIR_TURNED.bangs(ctx, it, 'farLock');
  }
  for (const it of asList(list)) {
    if (!it) continue;
    const name = typeof it === 'string' ? it : it.type, fn = (ctx.hv && ctx.hv.turned && HAIR_TURNED[name]) || HAIR_STYLES[name];
    if (layer === 'overArm' && !HAIR_OVER_ARM.includes(name)) continue;   // 'overArm'(手前の腕より上)を描くのはサイドテールだけ
    if (fn) fn(ctx, typeof it === 'string' ? { type: it } : it, layer);
    else if (layer === 'front') drawFaceTemplate(ctx, 'hair', name);      // 従来の髪 (raiki など)
  }
  // ロングヘアと頭の境目の線を消す(前髪など、頭の上の髪をすべて描いたあと)
  if (layer === 'front' && ctx.longHairSeams) { for (const S of ctx.longHairSeams) longHairSeam(ctx, S); ctx.longHairSeams = null; }
  // 描画順は 後頭部の髪 → もみあげ → 耳 に統一 (後頭部まで髪を伸ばしたときだけ耳を最後に描き直す)
  if (layer === 'front' && ctx.hairBackUsed) hairEar(ctx);
}

// ============================================================
// 服 (CHARACTER_DRAWS の clothes)
//   type: robe(ローブ) / cape(マント) / skirt(すそ) / loincloth(腰布) / scarf(マフラー)
//   共通: color / trim(縁取りの色) / length(腰〜地面を1とした丈) / flare(すその広がりpx)
//   cape: clasp(留め具の色)  scarf: color2 / length(px)
//   描画順: back(奥) → body(胴体の上) → skirt(手前の脚の上) → neck(首)
// ============================================================
// ---- 服の揺れ(物理) ----
//  スカート・ローブのすそ・マント・腰布は、すその端を「ひも」(髪・鉢巻と同じ物理)で動かす。
//  服ごとに physics: false で揺れなし(以前の形) / stiff: [根元, 先](形を保つ強さ) / flutter(はためき) / weight(重さの倍率)
//  maxBend / maxRoot / reach / maxV / rootFlex も書ける(setting.js の「揺れ物(なびき)」)
// 脚との当たり: side='front' の端は脚より前、'back' の端は脚より後ろに置く(脚を前に出すと、スカートの前が押される)
//   ctx.legs = 描いた脚の [付け根 o, ひざ k, 足首 e, 太ももの半径 r1, すねの半径 r2](drawing.js の drawF で入る)
function legLimit(ctx, side, pad = 1.5) {
  const legs = ctx.legs;
  if (!legs || !legs.length || !side) return null;
  return (pt) => {
    let lim = null;
    for (const lg of legs) for (const [a, b, r] of [[lg.o, lg.k, lg.r1], [lg.k, lg.e, lg.r2]]) {
      const dx = b[0] - a[0], dy = b[1] - a[1];
      if (legRaised(dx, dy)) continue;                                 // 上げた脚は下の legLift で扱う
      const y = pt[1], y0 = Math.min(a[1], b[1]) - r, y1 = Math.max(a[1], b[1]) + r;
      if (y < y0 || y > y1) continue;
      // その高さでの脚の横の位置(太さの分も足す)。端(付け根・足首)より上や下は、丸い端に沿って細くなる
      const t = Math.abs(dy) < 1e-3 ? 0.5 : Math.max(0, Math.min(1, (y - a[1]) / dy)),
        x = a[0] + dx * t, cy = a[1] + dy * t, ry = Math.sqrt(Math.max(0, r * r - (y - cy) * (y - cy))),
        edge = side === 'front' ? x + ry + pad : x - ry - pad;
      lim = lim == null ? edge : side === 'front' ? Math.max(lim, edge) : Math.min(lim, edge);
    }
    let q = pt;
    if (lim != null && ((side === 'front' && q[0] < lim) || (side === 'back' && q[0] > lim))) q = [lim, q[1]];
    return legLift(legs, q, pad);
  };
}
// 脚を上げているか: 先が根元とほぼ同じ高さか、それより上(蹴り上げ・膝上げ)。大きく踏み込んだ脚(先が下がっている)は含まない
const legRaised = (dx, dy) => dy < 0.35 * Math.abs(dx);
// 上げた脚(横に近い向きの太もも・すね)にスカートが入り込んだら、脚の上側へ押し出す
//  → 脚を高く上げると、スカートが脚の上にかぶさってめくれる(脚がスカートを突き抜けて見えない)
function legLift(legs, pt, pad = 1.5) {
  let q = pt;
  for (const lg of legs) for (const [a, b, r] of [[lg.o, lg.k, lg.r1], [lg.k, lg.e, lg.r2]]) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
    if (L2 < 1 || !legRaised(dx, dy)) continue;                      // 立っている・踏み込んだ脚は legLimit の横の押し出しで十分
    const t = Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / L2)),
      cx = a[0] + dx * t, cy = a[1] + dy * t, R = r + pad, d = Math.hypot(q[0] - cx, q[1] - cy);
    if (d >= R) continue;
    // 脚の向きに直角な2つの向きのうち、上を向く方へ出す
    const L = Math.sqrt(L2);
    let nx = -dy / L, ny = dx / L;
    if (ny > 0) { nx = -nx; ny = -ny; }
    const side = (q[0] - cx) * nx + (q[1] - cy) * ny;               // いまの点が脚の軸の上側(+)か下側(-)か
    q = [q[0] + nx * (R - side), q[1] + ny * (R - side)];           // 上側の表面(軸から R)まで動かす
  }
  return q;
}

// 2つの limit を順にかける
function joinLimits(a, b) {
  if (!a) return b || null;
  if (!b) return a;
  return (pt, i) => b(a(pt, i), i);
}
// ---- スカートの形を覚えて、マントがその外側を通るようにする ----
//  スカート(ローブのすそも)を描くたびに、前の端・後ろの端の点を ctx.mem.skirts に覚える。
//  マントは描く順番がスカートより先なので、直前のフレームに覚えた形を使う
function rememberSkirt(ctx, id, front, back) {
  if (!ctx.mem) return;
  (ctx.mem.skirts = ctx.mem.skirts || {})[id] = { f: front, b: back, fr: typeof fr !== 'undefined' ? fr : 0 };
}
// 高さ y での、スカートの端の横の位置(side: 'back' はいちばん後ろ / 'front' はいちばん前)。スカートが無い高さは null
function skirtEdgeAt(ctx, y, side) {
  const S = ctx.mem && ctx.mem.skirts;
  if (!S) return null;
  const now = typeof fr !== 'undefined' ? fr : 0;
  let lim = null;
  for (const k in S) {
    const sk = S[k];
    if (now - sk.fr > 3) continue;                                   // 古い形は使わない(服を変えたときなど)
    const pts = side === 'back' ? sk.b : sk.f;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], y0 = Math.min(a[1], b[1]), y1 = Math.max(a[1], b[1]);
      if (y < y0 || y > y1) continue;
      const t = y1 - y0 < 1e-3 ? 0.5 : (y - a[1]) / (b[1] - a[1]), x = a[0] + (b[0] - a[0]) * t;
      lim = lim == null ? x : side === 'back' ? Math.min(lim, x) : Math.max(lim, x);
    }
  }
  return lim;
}
function skirtLimit(ctx, side, pad = 2) {
  if (!ctx.mem || !ctx.mem.skirts) return null;
  return (pt) => {
    const x = skirtEdgeAt(ctx, pt[1], side);
    if (x == null) return pt;
    if (side === 'back' && pt[0] > x - pad) return [x - pad, pt[1]];
    if (side === 'front' && pt[0] < x + pad) return [x + pad, pt[1]];
    return pt;
  };
}

function clothStrand(ctx, it, id, root, end, def) {
  if (!ctx.strand || it.physics === false) return [root, end];
  const dx = end[0] - root[0], dy = end[1] - root[1];
  return ctx.strand(id, root, {
    limit: joinLimits(it.legs === false ? null : legLimit(ctx, def.side), def.limit),
    len: Math.hypot(dx, dy), n: def.n ?? 4, dir: [dx, dy], stiff: it.stiff || def.stiff, damp: def.damp ?? 0.09,
    grav: it.weight ?? def.grav ?? 1, flutter: it.flutter ?? def.flutter ?? 0.6, seed: def.seed ?? 0,
    collide: def.collide || 'none', r: def.r ?? 2, maxRoot: def.maxRoot, reach: def.reach, maxBend: def.maxBend, ...physLimits(it),
  });
}
// smoothThrough と同じ曲線の上の点を細かく取る(1区間 n 点)。曲線が角を丸めて脚の内側に入らないよう、取った点に limit をかけて描くのに使う
function sampleSmooth(pts, n = 6) {
  const out = [pts[0]];
  let cur = pts[0];
  for (let i = 1; i < pts.length - 1; i++) {
    const c = pts[i], m = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2];
    for (let k = 1; k <= n; k++) {
      const t = k / n, u = 1 - t;
      out.push([u * u * cur[0] + 2 * u * t * c[0] + t * t * m[0], u * u * cur[1] + 2 * u * t * c[1] + t * t * m[1]]);
    }
    cur = m;
  }
  const L = pts[pts.length - 1];
  for (let k = 1; k <= n; k++) out.push([cur[0] + (L[0] - cur[0]) * k / n, cur[1] + (L[1] - cur[1]) * k / n]);
  return out;
}
// すその前・後ろの線: なめらかな曲線の点を取り、脚の外側へ出してからつなぐ(脚がスカートを突き抜けて見えないように)
function clothEdge(ctx, it, pts, side) {
  if (pts.length < 3 || it.legs === false || it.physics === false) return null;
  const lim = legLimit(ctx, side, 2.5);
  if (!lim) return null;
  let E = sampleSmooth(pts).map((p) => lim(p));                     // 付け根(腰)も、脚の付け根が前に出たときは外へ広げる
  // 脚に押し出された所の角をならす: 外側へだけ動かす平均(へこんだ角が、脚の形に沿ったなめらかなふくらみになる)
  const out = side === 'front' ? Math.max : Math.min;
  for (let pass = 0; pass < 6; pass++) {
    E = E.map((p, i) => (i === 0 || i === E.length - 1 ? p : [out(p[0], (E[i - 1][0] + 2 * p[0] + E[i + 1][0]) / 4), p[1]]));
  }
  return E;
}
// 点の列を、角が出ないようになめらかにつないで描く(最初の点へは lineTo / moveTo は呼ぶ側)
function smoothThrough(g, pts) {
  for (let i = 1; i < pts.length - 1; i++) {
    const m = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2];
    g.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]);
  }
  const L = pts[pts.length - 1];
  g.lineTo(L[0], L[1]);
}

// 胴の太さの倍率(高さ t。0=腰〜1=首)。torsoType の profile を直線でつなぐ
function torsoWidthAt(ctx, t) {
  const pr = ctx.torsoProfile || TORSO_TEMPLATES.standard.profile;
  if (t <= pr[0][0]) return pr[0][1];
  for (let i = 1; i < pr.length; i++) if (t <= pr[i][0]) {
    const a = pr[i - 1], b = pr[i];
    return a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]);
  }
  return pr[pr.length - 1][1];
}
// 高さ y での、脚の表面の横の位置(side: 'front' はいちばん前 / 'back' はいちばん後ろ)。その高さに脚が無ければ null
function legEdgeAt(ctx, y, side) {
  let lim = null;
  for (const lg of ctx.legs || []) for (const [a, b, r] of [[lg.o, lg.k, lg.r1], [lg.k, lg.e, lg.r2]]) {
    const y0 = Math.min(a[1], b[1]) - r, y1 = Math.max(a[1], b[1]) + r;
    if (y < y0 || y > y1) continue;
    const dy = b[1] - a[1], t = Math.abs(dy) < 1e-3 ? 0.5 : Math.max(0, Math.min(1, (y - a[1]) / dy)), x = a[0] + (b[0] - a[0]) * t,
      cy = a[1] + dy * t, ry = Math.sqrt(Math.max(0, r * r - (y - cy) * (y - cy))), e = side === 'front' ? x + ry : x - ry;
    lim = lim == null ? e : side === 'front' ? Math.max(lim, e) : Math.min(lim, e);
  }
  return lim;
}
// スカート・ローブのすそを、体の傾きに合わせて描く。
//   hangCloth は「すそは腰から真下へ垂れる」形なので、体が大きく傾く(倒れる・吹っ飛ぶ)と、腰の向きと合わずに形が崩れる。
//   体が CLOTH_TILT.from より傾いたら、腰のまわりで画面を体の傾きだけ回して「立っているときの形」で描く(to で完全に体の向き)。
//   重力(揺れ物の物理)は画面の下向きのままなので、倒れたときはすそが地面の側へ垂れる
const CLOTH_TILT = { from: 0.35, to: 0.85 };
function hangClothBody(ctx, it, defLen, id) {
  const th0 = Math.atan2(ctx.ls ?? 0, ctx.lc ?? 1), a = Math.max(0, Math.min(1, (Math.abs(th0) - CLOTH_TILT.from) / (CLOTH_TILT.to - CLOTH_TILT.from))),
    k = a * a * (3 - 2 * a), th = th0 * k;
  if (Math.abs(th) < 0.01) return hangCloth(ctx, it, defLen, id);
  const { g } = ctx, H = [0, ctx.hyy], c = Math.cos(th), sn = Math.sin(th),
    rot = (p, s2) => { const x = p[0] - H[0], y = p[1] - H[1]; return [H[0] + x * c - y * sn * s2, H[1] + x * sn * s2 + y * c]; },
    toLoc = (p) => rot(p, -1), toUn = (p) => rot(p, 1),
    M = new DOMMatrix().translate(H[0], H[1]).rotate(-th * 180 / Math.PI).translate(-H[0], -H[1]);
  const legs = (ctx.legs || []).map((lg) => {
    const P2 = lg.path ? new Path2D() : null;
    if (P2) P2.addPath(lg.path, M);
    return { ...lg, o: toLoc(lg.o), k: toLoc(lg.k), e: toLoc(lg.e), path: P2 };
  });
  const lg0 = legs[0], legLen = lg0 ? Math.hypot(lg0.k[0] - lg0.o[0], lg0.k[1] - lg0.o[1]) + Math.hypot(lg0.e[0] - lg0.k[0], lg0.e[1] - lg0.k[1]) : -ctx.hyy;
  const ctx2 = {
    ...ctx, legs,
    P: (t, o) => toLoc(ctx.P(t, o)),
    hipDrop: -ctx.hyy + (legLen * 0.95 - -ctx.hyy) * k,                // 倒れても、すその長さは立っているときと同じ(脚の長さから)
    strand: ctx.strand && ((sid, root, o) => {                          // 揺れ物の物理は回す前の座標で動かす
      const d = o.dir ? [o.dir[0] * c - o.dir[1] * sn, o.dir[0] * sn + o.dir[1] * c] : o.dir;
      return ctx.strand(sid, toUn(root), { ...o, dir: d, limit: null }).map(toLoc);
    })
  };
  g.save();
  g.translate(H[0], H[1]); g.rotate(th); g.translate(-H[0], -H[1]);
  hangCloth(ctx2, it, defLen, id);
  g.restore();
}
function hangCloth(ctx, it, defLen, id) {
  const { g, K, LG, ol, line, P, hw, hyy, wv, tr } = ctx;
  const col = it.color || '#556', hemY = hyy + (ctx.hipDrop ?? -hyy) * (it.length ?? defLen), flare = it.flare ?? 6;   // hipDrop: 腰から地面までの長さ(体が倒れたときは hangClothBody が脚の長さにする)
  // waist … スカートをはく高さ(胴の上での位置。0=腰の付け根 / 0.3=胴の3割の高さ / 1=肩。省略時 -0.02 = 今まで通り)
  const wt = it.waist ?? -0.02;
  // 上の幅: はく高さでの胴の太さ(body.torsoType / torsoWidth の形)に合わせる。輪郭の分だけ少し外へ
  const tw = torsoWidthAt(ctx, wt), tback = ctx.torsoBack ?? 0.82, pad = 1.5;
  const tf = P(wt, hw * tw + pad), tb = P(wt, -(hw * tw * tback + pad)), still = it.physics === false || !ctx.strand;
  // すその前の端・後ろの端の目標: 脚に沿う(すその高さでの、いちばん前の脚の前・いちばん後ろの脚の後ろから flare だけ外)
  //  脚を前に出すと前のすそが前へ、後ろに引くと後ろのすそが後ろへ動く。脚が無い高さ(短いスカート)は付け根から下へ
  const follow = !still && it.legs !== false,
    lf = follow ? legEdgeAt(ctx, hemY, 'front') : null, lb = follow ? legEdgeAt(ctx, hemY, 'back') : null;
  const hf0 = [lf != null ? Math.max(tf[0] + 2, lf + flare * 0.6) : tf[0] + flare + (still ? tr * 0.3 : 0), hemY],
    hb0 = [lb != null ? Math.min(tb[0] - 2, lb - flare * 0.6) : tb[0] - flare + (still ? tr * 1.2 + wv * 0.6 : 0), hemY + (still ? wv * 0.3 : 0)];
  // 脚に沿って向きを変えても、布の長さは変えない(いつもの長さのまま振り上がる。足を前に出してもスカートが伸びない)
  const keepLen = (root, end, dx0) => {
    const L0 = Math.hypot(dx0, hemY - root[1]), vx = end[0] - root[0], vy = end[1] - root[1], L = Math.hypot(vx, vy) || 1;
    end[0] = root[0] + vx * L0 / L;
    end[1] = root[1] + vy * L0 / L;
  };
  if (lf != null) keepLen(tf, hf0, flare);
  if (lb != null) keepLen(tb, hb0, flare);
  const len = hemY - tf[1], soft = Math.max(0.6, Math.min(1.4, 30 / Math.max(10, len))),   // 短いスカートほど硬く、長いほどやわらかく揺れる
    // スカートはめくれすぎないよう、振れる角度(maxRoot 約35°)と距離(reach)を小さめにする
    F = clothStrand(ctx, it, id + 'f', tf, hf0, { n: 3, stiff: [0.42 * soft, 0.1 * soft], flutter: 0.5, seed: 0.3, grav: 0.8, maxRoot: 0.6, reach: 0.4, maxBend: 0.3, side: 'front' }),
    Bk = clothStrand(ctx, it, id + 'b', tb, hb0, { n: 3, stiff: [0.36 * soft, 0.07 * soft], flutter: 0.7, seed: 2.1, grav: 0.8, maxRoot: 0.6, reach: 0.4, maxBend: 0.3, side: 'back' }),
    hf0x = F[F.length - 1], hb0x = Bk[Bk.length - 1];
  let hf = hf0x, hb = hb0x;
  const hemCtl = [(hf[0] + hb[0]) / 2, Math.max(hf[1], hb[1]) + 5 + (still ? wv * 0.5 : 0)];
  rememberSkirt(ctx, id, F, Bk);                                    // マントがスカートの外側を通るように、形を覚える
  const EF = clothEdge(ctx, it, F, 'front'), EB = clothEdge(ctx, it, Bk, 'back');   // 脚の外側を通る前・後ろの線
  if (EF) hf = EF[EF.length - 1];
  if (EB) hb = EB[EB.length - 1];
  g.beginPath();
  g.moveTo((EF || [tf])[0][0], (EF || [tf])[0][1]);
  if (EF) for (const p of EF.slice(1)) g.lineTo(p[0], p[1]);
  else smoothThrough(g, F);
  g.quadraticCurveTo(hemCtl[0], hemCtl[1], hb[0], hb[1]);
  if (EB) for (const p of EB.slice().reverse().slice(1)) g.lineTo(p[0], p[1]);   // 最後(付け根)まで行き、closePath で前の付け根へ戻る
  else smoothThrough(g, Bk.slice().reverse());
  // 上の線(腰): 後ろの付け根 → 前の付け根。太ももの付け根の丸みがはみ出す所は、丸みを包むなめらかな線で少し盛り上げる(腰を包む)
  if (follow && ctx.legs && ctx.legs.length) {
    const b0 = EB ? EB[0] : tb, f0 = EF ? EF[0] : tf, x0 = Math.min(b0[0], f0[0]), x1 = Math.max(b0[0], f0[0]);
    const pts = [b0, f0];
    for (const lg of ctx.legs) {
      const r = (lg.w1 ? lg.w1 / 2 * 1.06 * (lg.sU || 1) : lg.r1 * 0.75) + 1;
      for (let a = Math.PI; a <= Math.PI * 2 + 1e-6; a += Math.PI / 8) {
        const x = lg.o[0] + Math.cos(a) * r, y = lg.o[1] + Math.sin(a) * r;
        if (x > x0 && x < x1) pts.push([x, y]);
      }
    }
    // 上側の凸包(画面の上 = y が小さい側)。くぼみの無い、腰の丸い線になる
    pts.sort((p, q) => p[0] - q[0]);
    const hull = [];
    for (const p of pts) {
      while (hull.length >= 2) {
        const a = hull[hull.length - 2], b = hull[hull.length - 1];
        if ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) <= 0) hull.pop(); else break;
      }
      hull.push(p);
    }
    const seq = b0[0] <= f0[0] ? hull : hull.slice().reverse();     // 後ろの付け根 → 前の付け根の順に
    for (const p of seq.slice(1, -1)) if (p[1] < Math.max(b0[1], f0[1]) + 0.5) g.lineTo(p[0], p[1]);
  }
  g.closePath();
  g.fillStyle = LG(0, tf[1], 0, hemY, K(col, 0.12), K(col, -0.3));
  g.fill();
  ol(2.5);
  // ひだ: 腰からすそへ広がる、両端の細いシワ(スカートの形の中だけ) + 後ろ側の影
  if (!ctx.fl && typeof CLOTH_FOLDS !== 'undefined' && CLOTH_FOLDS.on && typeof shadeOn === 'function' && shadeOn()) {
    g.save();
    g.clip();
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = SHADE.color;
    g.beginPath();                                                     // 後ろ側(光と反対)の影
    g.moveTo(tb[0] - 4, tb[1] - 2);
    g.lineTo(tb[0] + (tf[0] - tb[0]) * 0.32, tb[1] - 2);
    g.quadraticCurveTo(hb[0] + (hf[0] - hb[0]) * 0.4, (tb[1] + hb[1]) / 2, hb[0] + (hf[0] - hb[0]) * 0.36, hb[1] + 8);
    g.lineTo(hb[0] - 6, hb[1] + 8);
    g.closePath();
    g.fill();
    g.fillStyle = SHADE.deep;
    g.beginPath();
    for (const s of [0.18, 0.42, 0.62, 0.84]) {
      const a = [tf[0] + (tb[0] - tf[0]) * s, tf[1] + 3], b = [hf[0] + (hb[0] - hf[0]) * (s + (s - 0.5) * 0.25), hf[1] + (hb[1] - hf[1]) * s - 1];
      foldLine(a, [(a[0] + b[0]) / 2 + (s - 0.5) * 3, (a[1] + b[1]) / 2], b, 1.2);
    }
    g.fill();
    g.restore();
  }
  // すその下の脚に落ちる影(脚の形の中だけ)。光は前の上からなので、少し後ろ下へずらす
  if (!ctx.fl && ctx.legs && ctx.legs.length && typeof celFill === 'function') {
    const lp = new Path2D();
    for (const lg of ctx.legs) if (lg.path) lp.addPath(lg.path);
    const d = Math.max(7, (hemY - tf[1]) * 0.22);
    celFill(lp, () => {
      g.moveTo(hf[0] + 2, hf[1] - 4);
      g.quadraticCurveTo(hemCtl[0], hemCtl[1] - 4, hb[0] - 4, hb[1] - 4);
      g.lineTo(hb[0] - 6, hb[1] + d);
      g.quadraticCurveTo(hemCtl[0] - 3, hemCtl[1] + d, hf[0] - 1, hf[1] + d);
      g.closePath();
    }, true);
  }
  if (typeof CLOTH_FOLDS === 'undefined' || !CLOTH_FOLDS.on || ctx.fl) for (const s of [0.3, 0.6]) {   // 以前のひだの線(シワを描かないとき)
    line([tf[0] + (tb[0] - tf[0]) * s, tf[1] + 2], [hf[0] + (hb[0] - hf[0]) * s, hf[1] + (hb[1] - hf[1]) * s - 3], 1.5, 'rgba(0,0,0,.22)');
  }
  if (it.trim) {
    g.beginPath();
    g.moveTo(hf[0], hf[1] - 1);
    g.quadraticCurveTo(hemCtl[0], hemCtl[1] - 1, hb[0], hb[1] - 1);
    g.lineWidth = 3;
    g.lineCap = 'round';
    g.strokeStyle = ctx.C(it.trim);
    g.stroke();
  }
}

function drawClothes(ctx, list, layer) {
  const { g, K, C, LG, ol, line, dot, poly, P, hw, hyy, wv, tr } = ctx;
  const items = asList(list);
  for (let ci = 0; ci < items.length; ci++) {
    const it = items[ci], id = 'cloth' + ci + (it && it.type);              // 揺れ(物理)の名前。服ごとに別
    if (!it) continue;
    const col = it.color || '#556';
    // fadeBy: 'wing' … キャラの記憶 ctx.mem の値(0〜1)が大きくなるほど透けて消える(リリスの羽が生えている間はマントを消す など)
    const fade = it.fadeBy && ctx.mem ? Math.max(0, Math.min(1, ctx.mem[it.fadeBy] || 0)) : 0;
    if (fade >= 0.99) continue;
    if (fade > 0) {
      g.save();
      g.globalAlpha *= 1 - fade;
    }
    switch (it.type) {

      case 'cape':
        if (layer === 'back') {
          // 体が正面を向くほど(sym=1)、マントは背中の左右へ広がって見える
          const sy = ctx.G ? ctx.G.sym : 0, lp = (a, b) => a + (b - a) * sy, fmw = hw * (ctx.G ? ctx.G.fm : 1),
            hemY = hyy + -hyy * (it.length ?? 0.8), flare = it.flare ?? 10,
            A0 = P(0.98, -hw * 0.2), A1 = P(0.98, -fmw * 0.85 / (ctx.G ? ctx.G.fm : 1)), A = [lp(A0[0], A1[0]), lp(A0[1], A1[1])],
            TR = P(0.98, fmw * 0.85 / (ctx.G ? ctx.G.fm : 1)), B = P(0.8, -hw * 0.95),
            HB = [lp(-hw * 1.1 - flare, -(fmw + flare)) + tr * 1.6 + wv, hemY + wv * 0.5], HF = [lp(hw * 0.1, fmw + flare) + tr * 0.5, hemY],
            back = [lp(B[0] + tr * 0.6 - 4, A1[0] - flare * 0.5), B[1] + (hemY - B[1]) * 0.45];
          const still = it.physics === false || !ctx.strand;
          let edge, hb = HB, hf = HF;
          if (still) edge = null;
          else {
            // 後ろの端: 肩から、背中に沿って(背中より前には入らない)すそまで垂れるひも
            const HB0 = [lp(-hw * 1.1 - flare, -(fmw + flare)), hemY];
            // スカートの外側を通る(it.overSkirt: false で無し)。マントが後ろに広がったスカートの内側に入って、スカートがかぶさって見えないように
            const over = it.overSkirt !== false;
            edge = clothStrand(ctx, it, id + 'b', A, HB0, { n: 5, stiff: [0.3, 0.03], flutter: 1.1, seed: 0.9, collide: sy < 0.5 ? 'back' : 'none', r: 3,
              limit: over ? skirtLimit(ctx, 'back') : null });
            hb = edge[edge.length - 1];
            const HF0 = [lp(hw * 0.1, fmw + flare), hemY], F = clothStrand(ctx, it, id + 'f', P(0.8, hw * 0.1), HF0, { n: 3, stiff: [0.35, 0.08], flutter: 0.7, seed: 2.6, collide: sy < 0.5 ? 'back' : 'none', r: 2,
              limit: over && sy >= 0.5 ? skirtLimit(ctx, 'front') : null });   // 正面向きでマントが両側に広がるときは、前側もスカートの外側
            hf = F[F.length - 1];
          }
          const hemCtl = [(hb[0] + hf[0]) / 2, Math.max(hb[1], hf[1]) + 6 + (still ? wv : 0)];
          g.beginPath();
          g.moveTo(A[0], A[1]);
          if (edge) smoothThrough(g, edge);
          else g.quadraticCurveTo(back[0], back[1], HB[0], HB[1]);
          g.quadraticCurveTo(hemCtl[0], hemCtl[1], hf[0], hf[1]);
          if (sy > 0.01) g.lineTo(lp(A[0], TR[0]), lp(A[1], TR[1]));
          g.closePath();
          g.fillStyle = LG(HB[0], 0, A[0] + hw * 0.3, 0, K(col, -0.3), K(col, 0.05));
          g.fill();
          ol(2.5);
          line(B, [(hb[0] + hf[0]) / 2 + (still ? tr * 0.4 : 0), (hb[1] + hf[1]) / 2 - 4], 1.5, 'rgba(0,0,0,.22)');
          if (it.trim) {
            g.beginPath();
            g.moveTo(hb[0], hb[1] - 1);
            g.quadraticCurveTo(hemCtl[0], hemCtl[1] - 1, hf[0], hf[1] - 1);
            g.lineWidth = 3;
            g.lineCap = 'round';
            g.strokeStyle = C(it.trim);
            g.stroke();
          }
        } else if (layer === 'neck' && it.clasp) {
          const c = P(0.93, hw * 0.45);
          dot(c[0], c[1], 3 + 1.5 * olScale(), '#111');
          dot(c[0], c[1], 3, C(it.clasp));
        }
        break;

      case 'robe':
        if (layer === 'body') {
          const a = P(0.5, -hw * 0.8), b = P(0.5, hw), TW = ctx.torsoProfile;
          ctx.torsoPoly(1);
          g.fillStyle = LG(a[0], a[1], b[0], b[1], K(col, -0.4), K(col, -0.05), K(col, 0.18));
          g.fill();
          ol(3);
          if (it.trim) {
            g.beginPath();
            TW.forEach(([t, w], i) => {
              const v = P(t, hw * w * 0.9);
              if (i) g.lineTo(v[0], v[1]); else g.moveTo(v[0], v[1]);
            });
            g.lineWidth = 3;
            g.lineJoin = 'round';
            g.strokeStyle = C(it.trim);
            g.stroke();
          }
        } else if (layer === 'skirt') {
          hangClothBody(ctx, it, 0.7, id);
        }
        break;

      case 'skirt':
        if (layer === 'skirt') hangClothBody(ctx, it, 0.35, id);
        break;

      case 'loincloth':
        if (layer === 'skirt') {
          const sy = ctx.G ? ctx.G.sym : 0,                                   // 正面では腰布が中央に来る
            hemY = hyy + -hyy * (it.length ?? 0.3), t1 = P(-0.02, hw * (0.9 - 0.35 * sy)), t2 = P(-0.02, hw * (0.1 - 0.65 * sy)),
            still = it.physics === false || !ctx.strand,
            F = clothStrand(ctx, it, id + 'f', t1, [t1[0] + 7 + (still ? tr * 0.4 + wv * 0.3 : 0), hemY], { n: 3, stiff: [0.32, 0.05], flutter: 1, seed: 1.3, side: 'front' }),
            Bk = clothStrand(ctx, it, id + 'b', t2, [t2[0] + 1 + (still ? tr * 0.4 - wv * 0.3 : 0), hemY + 2], { n: 3, stiff: [0.32, 0.05], flutter: 1, seed: 3.1, side: 'back' }),
            hf = F[F.length - 1], hb = Bk[Bk.length - 1];
          g.beginPath();
          g.moveTo(t1[0], t1[1]);
          smoothThrough(g, F);
          g.lineTo(hb[0], hb[1]);
          smoothThrough(g, Bk.slice().reverse());
          g.closePath();
          g.fillStyle = LG(0, t1[1], 0, hemY, K(col, 0.12), K(col, -0.3));
          g.fill();
          ol(2);
          if (it.trim) line([hf[0], hf[1] - 1.5], [hb[0], hb[1] - 1.5], 2.5, C(it.trim));
        }
        break;

      case 'scarf':
        if (layer === 'neck') {
          const sy = ctx.G ? ctx.G.sym : 0, lp = (x, y) => x + (y - x) * sy, a0 = P(0.97, -hw * 0.4), len = it.length ?? 30,
            a = [lp(a0[0], P(0.97, hw * 0.12)[0]), a0[1]],                   // 正面ではマフラーの端が胸の前へ垂れる
            end = [lp(a[0] - len, a[0] + 5), lp(a[1] + 14, a[1] + len * 0.6)],   // 静止時の端の位置(なびきは物理)
            pts = ctx.strand ? ctx.strand('scarf', a, { len: Math.hypot(end[0] - a[0], end[1] - a[1]), n: 6, dir: [end[0] - a[0], end[1] - a[1]],
              curve: 0.04, stiff: [0.3, 0.01], damp: 0.07, flutter: 1.2, collide: sy < 0.5 ? 'back' : 'none', r: 3, ...physLimits(it) }) : [a, end];
          line(P(0.97, -hw * 0.55), P(0.97, hw * 0.55), 6.5 + 2.5 * olScale(), '#111');
          strandRibbon(ctx, pts, 5, 4, C(col), true);
          if (it.color2 && pts.length > 2) strandRibbon(ctx, pts.slice(Math.floor(pts.length / 2)), 4.4, 4, C(it.color2));
          line(P(0.97, -hw * 0.55), P(0.97, hw * 0.55), 6.5, C(col));
        }
        break;
    }
    if (fade > 0) g.restore();
  }
}

// ============================================================
// 服(上)・ズボン(下)のテンプレート (CHARACTER_DRAWS の body.top / body.bottom)
//   body.top:    "plain" | { type: "tshirt", color, inner, trim, ... }      … 胴体の服
//   body.bottom: "pants" | { type: "shorts", color, ... }                    … 脚の服
//   名前だけでも、{ type, 色など } でも書ける。省略時は plain / pants (以前と同じ見た目)。
//   色: color 省略時は 上=キャラの基本色(look.color。スキンで変わる) / 下=body.pantsColor
//   色の名前の代わりに "skin"(肌の色) / "main"(キャラの基本色) / "top"(上の服の色) / "inner"(中の服の色) も書ける
//   上の服のテンプレートは腕の袖も決める(upperArm / lowerArm)。body.upperArm / lowerArm に書いた物が優先
//   見た目だけ(当たり判定は変わらない)
// ============================================================
const TOP_TEMPLATES = {
  plain:  { seam: true },                                                               // 無地(標準)。胴の縫い目だけ
  none:   { skin: true, upperArm: { color: 'skin' } },                                  // 服なし(上半身裸)
  tshirt: { neck: true, hem: true,                                                       // Tシャツ: 丸首・すそ・半袖
            upperArm: { color: 'skin', sleeve: { color: 'top', cover: 0.55, cuff: 2.5 } } },
  tank:   { scoop: true, hem: true, upperArm: { color: 'skin' } },                     // タンクトップ: 胸元が開き、袖なし
  shirt:  { collar: true, buttons: 4, hem: true,                                         // シャツ: 襟・ボタン・長袖
            upperArm: { sleeve: { color: 'top', cover: 1 } }, lowerArm: { sleeve: { color: 'top', cover: 1, cuff: 2.5 } } },
  jacket: { inner: '#eeeeee', open: true, lapel: true,                                   // ジャケット: 前が開いて中の服が見える・長袖
            upperArm: { sleeve: { color: 'top', cover: 1 } }, lowerArm: { sleeve: { color: 'top', cover: 1, cuff: 3 } } },
  hoodie: { hood: true, pocket: true, strings: '#eeeeee', band: true,                    // パーカー: フード・ポケット・ひも・長袖
            upperArm: { sleeve: { color: 'top', cover: 1 } }, lowerArm: { sleeve: { color: 'top', cover: 1, cuff: 3.5 } } },
  gi:     { wrap: true, trim: '#ffffff',                                                 // 道着・着物: 打ち合わせの襟・広がり袖
            upperArm: { sleeve: { color: 'top', cover: 1 } }, lowerArm: { sleeve: { color: 'top', cover: 0.55, flare: 4, cuff: 2 } } },
  vest:   { inner: '#eeeeee', vest: true, buttons: 3,                                    // ベスト: シャツの上にベスト(袖は中の服)
            upperArm: { color: 'inner' }, lowerArm: { sleeve: { color: 'inner', cover: 1, cuff: 2 } } },
  armor:  { plate: '#aab4c8', rivet: '#ffcc33' }                                         // 胸当て: 金属の板(胸と背中)
};

const BOTTOM_TEMPLATES = {
  pants:   {},                                                                          // 長ズボン(標準)
  shorts:  { shin: 'skin', hem: 0.72 },                                                  // 半ズボン: ひざ上まで(hem=すその位置 0〜1)
  jeans:   { stitch: '#d9a64a', cuff: true },                                           // ジーンズ: 縫い目(stitch=糸の色)・すその折り返し
  cargo:   { pocket: true },                                                             // カーゴパンツ: ももにポケット
  wide:    { flare: 1.9, hemLine: true },                                                // 袴・ワイドパンツ: すそが広がる(flare=すその太さの倍)
  baggy:   { thighAdd: 4, shinAdd: 3, gather: true },                                    // だぼっとしたズボン: 太く、足首で絞る
  greaves: { greave: '#9aa4b8' },                                                        // すね当て: すねに金属の板・ひざ当て
  socks:   { thigh: 'skin', sock: '#ffffff', top: 0.04 }                                 // ハイソックス(素足+ひざ下までの靴下): sock=靴下の色 / top=はき口の位置(すねの 0 ひざ〜1 足首) / trim=はき口の線の色
};

function wearSpec(v, table, def) {
  const name = typeof v === 'string' ? v : (v && v.type) || def;
  return { ...(table[name] || table[def]), ...(v && typeof v === 'object' ? v : {}), type: table[name] ? name : def };
}
function topSpec(body) { return wearSpec(body && body.top, TOP_TEMPLATES, 'plain'); }
function bottomSpec(body) { return wearSpec(body && body.bottom, BOTTOM_TEMPLATES, 'pants'); }

// 色の名前("skin" / "main" / "top" / "inner")を実際の色にする
function wearColor(ctx, c, top) {
  if (c === 'skin') return ctx.skinColor;
  if (c === 'main') return ctx.main;
  if (c === 'top') return (top && top.color) || ctx.main;
  if (c === 'inner') return (top && top.inner) || '#eeeeee';
  return c;
}
// 腕の設定(色・袖・包帯・腕甲)の色の名前を実際の色にする
function wearArmSeg(ctx, seg, top) {
  const o = { ...seg }, fix = (x) => (x && typeof x === 'object' && x.color ? { ...x, color: wearColor(ctx, x.color, top) } : x);
  if (o.color) o.color = wearColor(ctx, o.color, top);
  o.sleeve = fix(o.sleeve);
  if (o.sleeve && o.sleeve.trim) o.sleeve = { ...o.sleeve, trim: wearColor(ctx, o.sleeve.trim, top) };
  o.wrap = fix(o.wrap);
  o.band = fix(o.band);
  return o;
}

// 胴体の前側・背中側の幅(px。胴の高さ t=0 腰〜1 首)。服の形を胴体に沿わせるのに使う
function torsoEdge(ctx, t) {
  const prof = ctx.torsoProfile;
  let w = prof[prof.length - 1][1];
  if (t <= prof[0][0]) w = prof[0][1];
  else for (let i = 1; i < prof.length; i++) if (t <= prof[i][0]) {
    const a = prof[i - 1], b = prof[i];
    w = a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]);
    break;
  }
  return { f: ctx.hw * w, b: ctx.hw * w * ctx.torsoBack };
}

// 服(上)を描く。layer: 'base' 胴体の塗り / 'front' 胸側の飾り / 'backside' 背面を向いたときの背中側 / 'hood' フード(体の後ろ)
//   胸側の飾りの位置は fk(t, k) で書く: t=胴の高さ(0 腰〜1 首) / k=胸の中心線までの割合(1=胸の中心線、真横では体の前の縁)。
//   体が正面を向くほど k=1 が胴の真ん中へ来る。左右対称の飾りは k と 2-k の2つを描く(真横では 2-k 側は体の外なので切り取られる)
function drawTop(ctx, layer) {
  const { g, K, C, LG, ol, line, dot, poly, P, hw, charDraw } = ctx, T = topSpec(charDraw.body || {}),
    col = (c) => wearColor(ctx, c, T), topC = col('top'), E = (t) => torsoEdge(ctx, t), sym = ctx.G ? ctx.G.sym : 0,
    fk = (t, k) => P(t, E(t).f * (k - sym)),                       // 胸側の位置
    clip = (fn) => { g.save(); ctx.torsoPoly(); g.clip(); fn(); g.restore(); },
    path = (pts) => { g.beginPath(); pts.forEach((v, i) => (i ? g.lineTo(v[0], v[1]) : g.moveTo(v[0], v[1]))); },
    curve = (a, c, b) => { g.beginPath(); g.moveTo(...a); g.quadraticCurveTo(...c, ...b); };

  if (layer === 'base') {
    const tc = charDraw.torsoUsesSkin || T.skin ? ctx.skinColor : topC;
    ctx.torsoPoly();
    const a = P(0.5, -hw * 0.8), b = P(0.5, hw);
    g.fillStyle = LG(a[0], a[1], b[0], b[1], K(tc, -0.4), K(tc, -0.05), K(tc, 0.18));
    g.fill();
    ol(3);
    if (T.seam) line(P(0.1, hw * 0.3 * (1 - sym)), P(0.95, hw * 0.3 * (1 - sym)), 2, K(tc, -0.42));   // 胴の縦の縫い目(正面では中央へ)
    if (T.hem) clip(() => line(P(0.1, -E(0.1).b - 2), P(0.1, E(0.1).f + 2), 2, K(tc, -0.35)));     // すそ
    if (T.band) clip(() => {                                        // パーカーのすその帯
      poly([P(-0.02, -E(0).b - 3), P(0.12, -E(0.12).b - 3), P(0.12, E(0.12).f + 3), P(-0.02, E(0).f + 3)]);
      g.fillStyle = K(topC, -0.2); g.fill(); ol(1.5);
    });
    if (T.plate) clip(() => {                                       // 胸当て(背中側にも板が回る)
      poly([P(0.3, E(0.3).f + 2), P(0.95, E(0.95).f + 2), P(0.92, -E(0.92).b - 2), P(0.3, -E(0.3).b - 2)]);
      const a = P(0.6, -hw * 0.7), b = P(0.6, hw);
      g.fillStyle = LG(a[0], a[1], b[0], b[1], K(T.plate, -0.35), K(T.plate, 0), K(T.plate, 0.3));
      g.fill(); ol(2.5);
      line(P(0.32, hw * 0.2 * (1 - sym)), P(0.92, hw * 0.2 * (1 - sym)), 1.6, K(T.plate, -0.45));
    });
    return;
  }

  if (layer === 'hood' && T.hood) {                                 // フード
    const hc = K(topC, -0.15);
    if (ctx.bodyDir <= -1.5) {                                      // 背面: 背中の上に垂れたフード(左右対称)
      const c = P(0.86, 0), r = hw * 0.62;
      g.beginPath();
      g.moveTo(...P(1.04, -r)); g.quadraticCurveTo(...P(1.12, 0), ...P(1.04, r));
      g.quadraticCurveTo(...P(0.72, r * 1.05), ...P(0.66, 0)); g.quadraticCurveTo(...P(0.72, -r * 1.05), ...P(1.04, -r));
      g.fillStyle = hc; g.fill(); ol(2.5);
      line(P(1.0, -r * 0.55), P(0.76, 0), 1.5, K(topC, -0.45)); line(P(1.0, r * 0.55), P(0.76, 0), 1.5, K(topC, -0.45));
      return;
    }
    // 真横〜正面: 首の後ろ(体の後ろに描くので、はみ出た分だけ見える)。正面を向くほど首の後ろへ隠れる
    const ss = 1 - sym, n = P(1.0, -hw * 0.05 * ss), e1 = E(0.95).b * ss, e2 = E(0.75).b * ss;
    path([n, P(1.13, -e1 * 0.6), P(1.0, -e1 - 6 * ss), P(0.75, -e2 - 3 * ss), P(0.78, -e2 * 0.3)]);
    g.closePath();
    g.fillStyle = hc; g.fill(); ol(2.5);
    if (ss > 0.3) line(P(1.03, -e1 * 0.45), P(0.85, -e2 - 1), 1.5, K(topC, -0.45));
    return;
  }

  if (layer !== 'front') return;                                    // 背面: 胸側の飾りは見えない
  clip(() => {
    const both = (fn) => { fn((k) => k); fn((k) => 2 - k); };       // 左右対称に2回描く(m(k) = k / 2-k)
    if (T.scoop) {                                                  // タンクトップ: U字に開いた胸元(肌)
      const A = (m) => fk(1.0, m(-0.25)), Cc = (m) => fk(0.66, m(0.35)), B = fk(0.8, 1);
      path([fk(1.08, -0.25), A((k) => k)]);
      g.quadraticCurveTo(...Cc((k) => k), ...B); g.quadraticCurveTo(...Cc((k) => 2 - k), ...A((k) => 2 - k));
      g.lineTo(...fk(1.08, 2.25)); g.closePath();
      g.fillStyle = K(ctx.skinColor, 0); g.fill();
      both((m) => { curve(A(m), Cc(m), B); ol(2); });
    }
    if (T.neck) both((m) => {                                       // Tシャツの丸首
      curve(fk(0.99, m(-0.1)), fk(0.8, m(0.45)), fk(0.86, 1));
      g.lineWidth = 3; g.strokeStyle = K(topC, -0.4); g.lineCap = 'round'; g.stroke();
    });
    if (T.collar) {                                                 // シャツの襟・前立て・ボタン
      both((m) => { poly([fk(1.02, m(-0.15)), fk(0.8, m(0.78)), fk(0.97, m(1.05))]); g.fillStyle = K(topC, 0.25); g.fill(); ol(1.8); });
      const kc = 1 - 0.14 * (1 - sym);                              // 前立て: 真横では前の縁の少し内側 / 正面では真ん中
      line(fk(0.8, kc), fk(0.05, kc), 1.6, K(topC, -0.4));
      for (let i = 0; i < (T.buttons ?? 4); i++) { const t = 0.16 + 0.15 * i; dot(...fk(t, kc), 1.7, C(T.button || '#f4f4f4')); }
    }
    if (T.open) {                                                   // ジャケット: 前の開き(中の服)・襟
      path([fk(-0.02, 0.62), fk(0.6, 0.62), fk(1.04, 0.15), fk(1.04, 1.85), fk(0.6, 1.38), fk(-0.02, 1.38)]);
      g.closePath();
      g.fillStyle = K(col('inner'), 0); g.fill();
      both((m) => { path([fk(-0.02, m(0.62)), fk(0.6, m(0.62)), fk(1.04, m(0.15))]); ol(2.2); });
      if (T.lapel) both((m) => { poly([fk(1.0, m(0.18)), fk(0.6, m(0.62)), fk(0.86, m(0.0))]); g.fillStyle = K(topC, -0.12); g.fill(); ol(1.8); });
    }
    if (T.vest) {                                                   // ベスト: 中のシャツ(V字)・ボタン
      path([fk(-0.02, 0.62), fk(0.62, 0.62), fk(1.04, 0.1), fk(1.04, 1.9), fk(0.62, 1.38), fk(-0.02, 1.38)]);
      g.closePath();
      g.fillStyle = K(col('inner'), 0); g.fill();
      both((m) => { path([fk(-0.02, m(0.62)), fk(0.62, m(0.62)), fk(1.04, m(0.1))]); ol(2.2); });
      for (let i = 0; i < (T.buttons ?? 3); i++) { const t = 0.12 + 0.16 * i; both((m) => dot(...fk(t, m(0.56)), 1.8, C(T.button || '#ddd'))); }
    }
    if (T.pocket) {                                                 // パーカーのポケット(お腹の前。正面では左右に広がる)
      path([fk(0.14, 0.3), fk(0.42, 0.42), fk(0.42, 1.58), fk(0.14, 1.7)]);
      g.closePath(); g.fillStyle = K(topC, -0.1); g.fill(); ol(1.8);
    }
    if (T.strings) both((m) => {                                    // パーカーのひも
      line(fk(0.97, m(0.8)), fk(0.66, m(0.84)), 1.6, C(T.strings));
      dot(...fk(0.66, m(0.84)), 1.8, C(T.strings));
    });
    if (T.wrap) {                                                   // 道着: 打ち合わせの襟(左前が上に重なる)
      const c = C(T.trim || '#fff');
      line(fk(0.98, 1.9), fk(0.6, 1.0), 2, K(topC, -0.4));
      for (const [w, cc] of [[4 + 2.5 * olScale(), '#111'], [4, c]]) line(fk(1.02, -0.15), fk(0.4, 1.05), w, cc);
    }
    if (T.plate && T.rivet) for (const t of [0.4, 0.82]) both((m) => dot(...fk(t, m(0.55)), 1.8, C(T.rivet)));
  });
}

// 脚の服(ズボン)を描いて、足首の位置を返す。o=股関節, a/b=角度, ul/ll=長さ, far=奥の脚
function drawBottom(ctx, x, a, b, ul, ll, far, setting) {
  const { Y, K, hyy, ol, g } = ctx, B = bottomSpec(setting), T = topSpec(setting), dim = far ? -0.22 : 0,
    base = B.thigh ? wearColor(ctx, B.thigh, T) : B.color ? wearColor(ctx, B.color, T) : null,   // ハイソックス(socks)は太ももが thigh の色(肌)
    pc = base ? K(base, dim) : far ? K(ctx.pn, -0.22) : ctx.pn,          // 標準は以前と同じ色
    wT = (Y.tw ?? Y.lgw) + (B.thighAdd || 0), wS = (Y.sw ?? Y.lgw) + (B.shinAdd || 0),   // 太もも・すねの太さ(body.thighWidth / shinWidth。無ければ legWidth)
    skin = K(ctx.skinColor, dim),
    sc = B.shin === 'skin' ? skin : B.sock ? K(wearColor(ctx, B.sock, T), dim) : pc;
  const pdir = ctx.partDir || {}, th = limbTheta(far ? pdir.lLeg : pdir.rLeg);   // 脚の向き(X軸)。太もも・すねとも同じ向きに回る
  const LK = limbKindOf(ctx, 'leg'), e = limbEx(x, hyy, a, b, ul, ll, wT, wS, pc, sc, 0, LK, th, th, ['thigh', 'shin']);
  const k = limbEx.last.k, h = [x, hyy],
    seg = (p0, p1) => {                                             // p0→p1 の位置 t(0〜1)・横のずれ s(px)
      const dx = p1[0] - p0[0], dy = p1[1] - p0[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
      return (t, s = 0) => [p0[0] + dx * t + nx * s, p0[1] + dy * t + ny * s];
    },
    TH = seg(h, k), SH = seg(k, e), pcol = base || Y.pn,
    band = (S, part, t0, t1, add, c, outline = true) => {       // 脚を横切る帯(脚の形に沿う。端は平ら)。add=脚より太くする量(px)
      const prevPart = outlinePart; outlinePart = part === 'upper' ? 'thigh' : 'shin';
      try { bandBody(S, part, t0, t1, add, c, outline); } finally { outlinePart = prevPart; }
    },
    bandBody = (S, part, t0, t1, add, c, outline) => {
      const base = part === 'upper' ? wT : wS, wf = (t) => limbWidth(LK, part, t, base) * limbScaleAt(part, t) + add,
        Lseg = Math.hypot(...[0, 1].map((i) => S(1)[i] - S(0)[i])) || 1, dl = 1.4 / Lseg;
      if (outline && olScale() > 0) { g.fillStyle = '#111'; g.beginPath(); limbBandPath(g, S, t0 - dl * olScale(), t1 + dl * olScale(), (t) => wf(t) + 3 * olScale()); g.fill(); }
      g.fillStyle = c; g.beginPath(); limbBandPath(g, S, t0, t1, wf); g.fill();
    };
  if (B.shin === 'skin') {                                          // 半ズボン: すそ(ひざの上)で切る
    const t = Math.min(1, B.hem ?? 0.72);
    const L = limbEx.last;                                          // すそから下の太ももとひざを肌の色に(脚の形の内側だけ)
    g.save(); g.clip(L.all);
    g.fillStyle = skin; g.beginPath(); limbBandPath(g, TH, t, 1.05, () => wT * 1.4); g.fill(); g.fill(L.joint);
    g.restore();
    band(TH, 'upper', t - 0.1, t, 1.5, K(pcol, dim - 0.15));        // すその折り返し
  }
  if (B.sock) {                                                     // ハイソックス: ひざの少し下にはき口(少し太い帯と線)
    const t0 = Math.max(0, B.top ?? 0.04), sk = wearColor(ctx, B.sock, T);
    band(SH, 'lower', t0, t0 + 0.12, 1.2, K(sk, dim - 0.04));
    if (B.trim) ctx.line(SH(t0 + 0.06, -wS * 0.6), SH(t0 + 0.06, wS * 0.6), 1.3, K(wearColor(ctx, B.trim, T), dim));
  }
  if (B.flare) {                                                    // 袴・ワイド: すそへ広がる
    const w0 = wS / 2, w1 = wS * B.flare / 2, P0 = SH(-0.12, -w0), P1 = SH(1.05, -w1), P2 = SH(1.05, w1), P3 = SH(-0.12, w0);
    g.fillStyle = pc;
    g.beginPath(); g.moveTo(...P0); g.lineTo(...P1); g.lineTo(...P2); g.lineTo(...P3); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(...P0); g.lineTo(...P1); g.lineTo(...P2); g.lineTo(...P3); ol(2.5);
    if (B.hemLine) ctx.line(SH(0.3, 0), SH(1.0, 0), 1.6, K(pcol, dim - 0.3));
  }
  if (B.gather) band(SH, 'lower', 0.82, 1.0, -1 - (B.shinAdd || 0), K(pcol, dim - 0.18));   // だぼっとしたズボン: 足首で絞る
  if (B.stitch) for (const S of [TH, SH]) {                          // ジーンズの縫い目
    g.setLineDash([2.5, 2.5]); ctx.line(S(0.05, wT * 0.22), S(0.95, wT * 0.22), 1.2, K(B.stitch, dim)); g.setLineDash([]);
  }
  if (B.cuff) band(SH, 'lower', 0.86, 1.0, 1.5, K(pcol, dim + 0.25));    // ジーンズのすその折り返し
  if (B.pocket) withOutlinePart('thigh', () => {                    // カーゴのポケット
    const q = [TH(0.4, -wT * 0.1), TH(0.4, wT * 0.45), TH(0.7, wT * 0.45), TH(0.7, -wT * 0.1)];
    ctx.poly(q); g.fillStyle = K(pcol, dim - 0.12); g.fill(); ol(1.6);
    ctx.line(TH(0.48, -wT * 0.1), TH(0.48, wT * 0.45), 1.4 * olScale(), '#111');
  })();
  if (B.greave) {                                                   // すね当て・ひざ当て
    band(SH, 'lower', 0.12, 0.88, 3, K(B.greave, dim));
    ctx.line(SH(0.18, -wS * 0.2), SH(0.82, -wS * 0.2), 1.4, K(B.greave, dim + 0.4));
    ctx.dot(k[0], k[1], wS * 0.5 + 1.6 * olScale('shin'), '#111');
    ctx.dot(k[0], k[1], wS * 0.5, K(B.greave, dim + 0.1));
  }
  return e;
}

// ==========================================
// キャラクターごとの固有描画定義（すべてCHARACTER_DRAWS内で個別定義）
// ==========================================
// ============================================================
// 共通キャラクター描画
// CHARACTER_DRAWS には「設定」だけを書く。通常の腕・脚・手・靴はここで自動描画する。
// ============================================================
// 上腕/下腕ごとの装飾: 袖(sleeve) / 包帯(wrap) / 腕甲(band)。p0=根元側, p1=先端側, w=その部分の太さ
// 腕・脚に沿った帯の形(t0〜t1、太さ wf(t))をパスに足す。at(t, s) = 位置 t・横のずれ s の点
function limbBandPath(g, at, t0, t1, wf) {
  const n = 8, A = [], B = [];
  for (let i = 0; i <= n; i++) { const t = t0 + (t1 - t0) * i / n, h = wf(t) / 2; A.push(at(t, -h)); B.push(at(t, h)); }
  A.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
  for (let i = n; i >= 0; i--) g.lineTo(B[i][0], B[i][1]);
  g.closePath();
}

function armSegDeco(ctx, seg, p0, p1, w, dim, part = 'upper') {
  if (!seg || !(seg.sleeve || seg.wrap || seg.band)) return;
  const prevPart = outlinePart;
  outlinePart = part === 'upper' ? 'upperArm' : 'foreArm';           // 袖などの輪郭はその節の太さ
  try { armSegDecoBody(ctx, seg, p0, p1, w, dim, part); } finally { outlinePart = prevPart; }
}
function armSegDecoBody(ctx, seg, p0, p1, w, dim, part) {
  const { g, K, ol, main } = ctx,
    dx = p1[0] - p0[0], dy = p1[1] - p0[1], L = Math.hypot(dx, dy) || 1,
    ux = dx / L, uy = dy / L, nx = -uy, ny = ux,
    at = (t, s = 0) => [p0[0] + dx * t + nx * s, p0[1] + dy * t + ny * s],
    W = (t, ww) => limbWidth(limbKindOf(ctx, 'arm'), part, t, w) * limbScaleAt(part, t) + (ww - w),       // 腕の形(手首・肘のくびれ)に沿った太さ
    bar = (t0, t1, ww, c) => {                     // 腕の形に沿った帯(端は平ら)
      g.fillStyle = c;
      g.beginPath();
      limbBandPath(g, at, t0, t1, (t) => W(t, ww));
      g.fill();
    },
    cut = (t, ww, th, c) => {                      // 腕を横切る線(袖口・縁など)
      const A = at(t, -W(t, ww) / 2), B = at(t, W(t, ww) / 2);
      g.lineCap = 'butt';
      g.lineWidth = th;
      g.strokeStyle = c;
      g.beginPath();
      g.moveTo(A[0], A[1]);
      g.lineTo(B[0], B[1]);
      g.stroke();
      g.lineCap = 'round';
    };

  const sv = seg.sleeve;
  if (sv) {
    const col = K(sv.color || main, dim), cover = Math.max(0, Math.min(1, sv.cover ?? 1)), fl = sv.flare ?? 0;
    if (fl > 0) {
      const A1 = at(0, -(w / 2 + 1)), A2 = at(0, w / 2 + 1),
        B1 = at(cover, -(w / 2 + 1 + fl)), B2 = at(cover, w / 2 + 1 + fl);
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(A1[0], A1[1]);
      g.lineTo(B1[0], B1[1]);
      g.lineTo(B2[0], B2[1]);
      g.lineTo(A2[0], A2[1]);
      g.closePath();
      g.fill();
      ol(2);
    } else {
      bar(0, cover, w + 1 + 4 * olScale(), '#111');
      bar(0, cover, w + 1, col);
      if (cover < 1) cut(cover, w + 1 + 4 * olScale(), 1.8 * olScale(), '#111');
    }
    if (sv.cuff) cut(Math.max(0, cover - (sv.cuff / 2) / L), w + 1.5 + fl * 2, sv.cuff, K(sv.trim || shade(sv.color || main, -0.35), dim));
  }

  const wr = seg.wrap;
  if (wr) {
    const t0 = wr.from ?? 0.08, t1 = wr.to ?? 0.92, n = wr.count ?? 4;
    bar(t0, t1, w + 1.5 + 3.5 * olScale(), '#111');
    bar(t0, t1, w + 1.5, K(wr.color || '#e8e0c8', dim));
    g.lineWidth = 1.4;
    g.strokeStyle = K(wr.stripe || '#a89a78', dim);
    for (let i = 0; i < n; i++) {
      const t = t0 + (t1 - t0) * (i + 0.5) / n, hw = W(t, w) / 2, A = at(t - 1.5 / L, -hw), B = at(t + 1.5 / L, hw);
      g.beginPath();
      g.moveTo(A[0], A[1]);
      g.lineTo(B[0], B[1]);
      g.stroke();
    }
  }

  const bd = seg.band;
  if (bd) {
    const t0 = bd.from ?? 0.2, t1 = bd.to ?? 0.85, pad = bd.pad ?? 2.5, col = bd.color || '#8a93a8', ww = w + pad;
    bar(t0, t1, ww + 5 * olScale(), '#111');
    bar(t0, t1, ww, K(col, dim));
    cut(t0 + 0.9 / L, ww + 4 * olScale(), 1.8 * olScale(), '#111');
    cut(t1 - 0.9 / L, ww + 4 * olScale(), 1.8 * olScale(), '#111');
    const H0 = at(t0 + 0.04, -W(t0, ww) * 0.25), H1 = at(t1 - 0.04, -W(t1, ww) * 0.25);
    g.strokeStyle = K(col, 0.4 + dim);
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(H0[0], H0[1]);
    g.lineTo(H1[0], H1[1]);
    g.stroke();
    if (bd.rivet) {
      for (const t of [t0 + (t1 - t0) * 0.15, t1 - (t1 - t0) * 0.15]) {
        const c = at(t, W(t, ww) * 0.18);
        ctx.dot(c[0], c[1], 1.8, K(bd.rivet, dim));
      }
    }
  }
}

// 肘当て: o=肩, k=肘, e=手先
function armElbowGuard(ctx, eg, o, k, e, w, dim) {
  const { g, K, ol } = ctx, c = eg === true ? {} : eg,
    r = c.r ?? (w * 0.55 + 1.5), col = K(c.color || '#8a93a8', dim),
    n1 = Math.hypot(k[0] - o[0], k[1] - o[1]) || 1, n2 = Math.hypot(e[0] - k[0], e[1] - k[1]) || 1;
  if (c.spike) {                                   // 肘の外側(曲がりと反対側)にトゲ。まっすぐなら後ろ向き
    let d = [(k[0] - o[0]) / n1 - (e[0] - k[0]) / n2, (k[1] - o[1]) / n1 - (e[1] - k[1]) / n2];
    const dl = Math.hypot(d[0], d[1]);
    d = dl < 0.25 ? [-1, 0] : [d[0] / dl, d[1] / dl];
    const L = r + (c.spike === true ? 7 : c.spike), p = [-d[1], d[0]];
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(k[0] + p[0] * r * 0.75, k[1] + p[1] * r * 0.75);
    g.lineTo(k[0] + d[0] * L, k[1] + d[1] * L);
    g.lineTo(k[0] - p[0] * r * 0.75, k[1] - p[1] * r * 0.75);
    g.closePath();
    g.fill();
    ol(2);
  }
  g.fillStyle = col;
  g.beginPath();
  g.arc(k[0], k[1], r, 0, 7);
  g.fill();
  ol(2);
}

function drawStandardArm(ctx, a, b, o, far, wp, setting, elbowDx = 0, wrist = 0) {   // wrist = 手首の角度(rad。正=前へ曲げる)
  // 腕の向き(X軸): 上腕・前腕それぞれ、手前(正面)へ向くほど縮んで手前ほど大きく、奥へ向くほど縮んで先ほど小さく見える
  const pdir = ctx.partDir || {}, th1 = limbTheta(far ? pdir.lUpperArm : pdir.rUpperArm), th2 = limbTheta(far ? pdir.lForeArm : pdir.rForeArm);
  const { Y, K, sl, f2, slB, C } = ctx;
  // 上腕(upper) / 下腕(lower) を別々に設定できる (ARM_TEMPLATES 参照)
  const AS0 = armSpec({ body: setting }), TS = topSpec(setting),
    AS = { upper: wearArmSeg(ctx, AS0.upper, TS), lower: wearArmSeg(ctx, AS0.lower, TS) };   // "skin" / "top" などの色の名前を実際の色に
  const [ua, la] = armLengths(Y, { body: setting }), [w1, w2] = armWidths(Y, { body: setting });
  const armWidth = (w1 + w2) / 2;                  // 腕輪など「腕全体」の装飾に使う代表の太さ
  const dim = far ? -0.22 : 0;
  const sc = AS.upper.color ? K(AS.upper.color, dim) : far ? K(slB, -0.22) : sl;
  const fc = AS.lower.color ? K(AS.lower.color, dim) : far ? K(f2, -0.22) : f2;
  const GM = limbGeom(o[0], o[1], a, b, ua, la, th1, th2, elbowDx), [kx, ky] = GM.k, e0 = GM.e;
  const dx = e0[0] - kx, dy = e0[1] - ky;
  const len = Math.hypot(dx, dy);
  // 手の向き: 前腕が真正面・真後ろを向いて画面上の長さがほぼ無いときは、本来の向きを使う
  const fx0 = len > 2 ? dx / len : Math.sin(a + b) || 0, fy0 = len > 2 ? dy / len : Math.cos(a + b) || 1;
  // 手(こぶし)と武器の向き = 前腕の向きを手首の角度だけ回したもの(角度は肩・肘と同じ向き: 0=真下 / 正=前)
  const wth = Math.atan2(fx0, fy0) + (wrist || 0), ux = wrist ? Math.sin(wth) : fx0, uy = wrist ? Math.cos(wth) : fy0;
  const handScale = GM.sc(GM.z1 + GM.z2), handAway = GM.toward2 < -0.25;   // 手は奥行きの分だけ大きさが変わる / 前腕が奥を向くと手は前腕の後ろ
  const drawHand = withOutlinePart('hand', () => {
    if (setting.hand === 'block') {
      const hr = Y.hr2 * handScale;
      ctx.g.fillStyle = ctx.RG(e0[0] - hr * 0.3, e0[1] - hr * 0.35, 1, hr * 1.4, K(Y.hd, 0.4), K(Y.hd, 0), K(Y.hd, -0.35));
      ctx.g.beginPath();
      ctx.g.rect(e0[0] - hr, e0[1] - hr, 2 * hr, 1.8 * hr);
      ctx.g.fill();
      ctx.ol(2);
    } else {
      ctx.hand(e0, Y.hr2 * handScale, far ? K(Y.hd, -0.22) : C(Y.hd), [ux, uy], setting.handOutline, { fore: GM.fore2, toward: GM.toward2 });   // 前腕の向きに握ったこぶし(handOutline で指の線)
    }
  });
  if (handAway) drawHand();
  const e = limbEx(o[0], o[1], a, b, ua, la, w1, w2, sc, fc, elbowDx, limbKindOf(ctx, 'arm'), th1, th2, ['upperArm', 'foreArm']);

  armSegDeco(ctx, AS.upper, o, [kx, ky], w1, dim, 'upper');
  armSegDeco(ctx, AS.lower, [kx, ky], e, w2, dim, 'lower');
  if (setting.elbowGuard) withOutlinePart('foreArm', armElbowGuard)(ctx, setting.elbowGuard, o, [kx, ky], e, armWidth, dim);

  if (setting.armBand) {
    const m1 = [e[0] - fx0 * la * 0.42, e[1] - fy0 * la * 0.42];
    const m2 = [e[0] - fx0 * la * 0.20, e[1] - fy0 * la * 0.20];
    {                                              // 腕輪(前腕の形に沿う)
      const at = (t, s = 0) => [kx + dx * t + -fy0 * s, ky + dy * t + fx0 * s];
      ctx.g.fillStyle = far ? K(setting.armBand, -0.22) : K(setting.armBand, 0);
      ctx.g.beginPath();
      limbBandPath(ctx.g, at, 0.58, 0.8, (t) => limbWidth(limbKindOf(ctx, 'arm'), 'lower', t, w2) * limbScaleAt('lower', t) + 1);
      ctx.g.fill();
    }

    if (setting.armDecoration === 'berserk') {
      const cx = (m1[0] + m2[0]) / 2;
      const cy = (m1[1] + m2[1]) / 2;
      ctx.g.fillStyle = K('#ddd', 0);
      for (const side of [-1, 1]) {
        ctx.g.beginPath();
        ctx.g.moveTo(cx + -fy0 * side * w2 * 0.5 - fx0 * 3, cy + fx0 * side * w2 * 0.5 - fy0 * 3);
        ctx.g.lineTo(cx + -fy0 * side * (w2 * 0.5 + 8), cy + fx0 * side * (w2 * 0.5 + 8));
        ctx.g.lineTo(cx + -fy0 * side * w2 * 0.5 + fx0 * 3, cy + fx0 * side * w2 * 0.5 + fy0 * 3);
        ctx.g.fill();
        ctx.ol(1.5);
      }
    }
  }

  if (wp) withOutlinePart('weapon', wp)(e, ux, uy);

  if (!handAway) drawHand();
  return e;
}

function drawStandardLeg(ctx, x, a, b, far, setting) {
  const { Y, K, pn, hyy, ol, line, C } = ctx;
  const [ul, ll] = legLengths(Y);
  const legWidth = (Y.sw ?? Y.lgw) - 2;           // すねの太さ(body.shinWidth。無ければ legWidth)。靴の大きさはこれに合わせる
  const e = drawBottom(ctx, x, a, b, ul, ll, far, setting);   // ズボン(body.bottom のテンプレート)

  if (setting.shoeLegCover) {                     // ブーツ: すねの下半分を覆う(脚の形に沿う)
    const [kx, ky] = limbEx.last.k, ddx = e[0] - kx, ddy = e[1] - ky, L = Math.hypot(ddx, ddy) || 1,
      at = (t, s = 0) => [kx + ddx * t - ddy / L * s, ky + ddy * t + ddx / L * s],
      wS = (Y.sw ?? Y.lgw) + (bottomSpec(setting).shinAdd || 0), wf = (t) => limbWidth(limbKindOf(ctx, 'leg'), 'lower', t, wS) * limbScaleAt('lower', t) + 1.5;
    const bs = olScale('shin'); ctx.g.fillStyle = '#111'; ctx.g.beginPath(); limbBandPath(ctx.g, at, 0.5 - 0.03 * bs, 1.0, (t) => wf(t) + 4 * bs); ctx.g.fill();
    ctx.g.fillStyle = far ? K(Y.so, -0.2) : C(Y.so); ctx.g.beginPath(); limbBandPath(ctx.g, at, 0.5, 1.0, wf); ctx.g.fill();
  }

  if (setting.legPatch) {
    ctx.g.fillStyle = '#0003';
    ctx.g.fillRect(e[0] - 6, e[1] - 12, 12, 3);
  }

  // 靴: 横から見た形(かかと→つま先)を、脚の向き θ に合わせて回して描く。
  //   前後の長さは cosθ 倍に縮み、靴の幅(左右の厚み)が sinθ の分だけ見えてくる。正面ではつま先、背面ではかかとが見える
  const pdir = ctx.partDir || {}, th = limbTheta(far ? pdir.lLeg : pdir.rLeg), cs = Math.cos(th), sn = Math.sin(th),
    sz = (limbEx.last && limbEx.last.geom ? limbEx.last.geom.sc(limbEx.last.geom.z1 + limbEx.last.geom.z2) : 1),   // 奥行きの分の大きさ
    h = (legWidth * 0.8 + 2) * sz, bt = e[1] + legWidth * 0.5 + 3.5, half = (legWidth * 0.55 + 2) * sz;
  const prof = [[-6, bt - h], [4, bt - h]];                          // 横から見た形(x は足首からの前後)
  for (let i = 1; i <= 6; i++) {                                     // つま先の丸み
    const u = i / 6, my = (bt - h) * (1 - u) * (1 - u) + 2 * u * (1 - u) * (bt - h * 0.7) + u * u * (bt - 2);
    prof.push([(1 - u) * (1 - u) * 4 + 2 * u * (1 - u) * 13 + u * u * 16, my]);
  }
  prof.push([16, bt], [-6, bt]);
  const pts = [];
  for (const [px, py] of prof) for (const s of [-1, 1]) pts.push([e[0] + px * sz * cs + s * half * sn, py]);
  const hull = (P) => {                                              // 凸包(靴の輪郭)
    P = P.slice().sort((p, q) => p[0] - q[0] || p[1] - q[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
    for (const p of P) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (const p of P.reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  };
  const H = hull(pts), shoeColor = far ? K(Y.so, -0.2) : C(Y.so), prevPart = outlinePart;
  outlinePart = 'shoe';
  ctx.g.fillStyle = shoeColor;
  ctx.g.beginPath();                                                 // 角を丸めた輪郭
  const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], n = H.length;
  ctx.g.moveTo(...mid(H[n - 1], H[0]));
  for (let i = 0; i < n; i++) ctx.g.quadraticCurveTo(H[i][0], H[i][1], ...mid(H[i], H[(i + 1) % n]));
  ctx.g.closePath();
  ctx.g.fill();
  ol(2);
  const xs = H.map((p) => p[0]), x0 = Math.min(...xs), x1 = Math.max(...xs);
  line([x0 + 1, bt - 1], [x1 - 1, bt - 1], 2.2, '#ccc');           // 靴底
  const as = Math.abs(sn);
  if (as > 0.35) {                                                   // 正面: つま先の丸い線 / 背面: かかとの線
    const cx = e[0] + (sn > 0 ? 10 : -3) * sz * cs, w = half * as * 0.8;
    ctx.g.strokeStyle = 'rgba(0,0,0,.35)';
    ctx.g.lineWidth = 1.4;
    ctx.g.beginPath();
    if (sn > 0) ctx.g.ellipse(cx, bt - h * 0.45, w, h * 0.32, 0, Math.PI * 1.05, Math.PI * 1.95);
    else { ctx.g.moveTo(cx - w * 0.7, bt - h * 0.75); ctx.g.lineTo(cx + w * 0.7, bt - h * 0.75); }
    ctx.g.stroke();
  }
  outlinePart = prevPart;
  return e;
}

// ============================================================
// 口のテンプレート
//   CHARACTER_DRAWS の mouth: { closed: "smile", open: "oval", ... } で選ぶ
//   closed … 閉じているとき / open … 開いている(攻撃・やられ)とき。open: false なら開かず閉じた口のまま
//   各テンプレートは M = { g, ol, P(dx,dy), ux, uy, color, inside, lw } を受け取る
//   P(dx,dy) は口の中心からの位置(頭の半径Rh基準 × 口の width/height の倍率)を画面座標にする
// ============================================================
const mouthStroke = (M, draw) => {
  const { g } = M;
  g.strokeStyle = M.color;
  g.lineWidth = M.lw;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  draw(g, M.P);
  g.stroke();
};

// 開いた口: 塗り → (extras は口の内側だけに描く: 舌・歯など) → 輪郭
const mouthOpen = (M, shape, extras) => {
  const { g } = M;
  g.fillStyle = M.inside;
  g.beginPath();
  shape(g, M.P);
  g.fill();
  if (extras) {
    g.save();
    g.beginPath();
    shape(g, M.P);
    g.clip();
    extras(g, M.P);
    g.restore();
  }
  g.beginPath();
  shape(g, M.P);
  M.ol(M.lw);
};

const MOUTH_CLOSED = {
  none: () => { },                                                     // 何も描かない
  smile: (M) => mouthStroke(M, (g, P) => {                             // 標準(にっこり)
    g.moveTo(...P(-0.22, 0));
    g.quadraticCurveTo(...P(-0.02, 0.12), ...P(0.22, -0.03));
  }),
  flat: (M) => mouthStroke(M, (g, P) => {                              // 一直線
    g.moveTo(...P(-0.2, 0.02));
    g.lineTo(...P(0.2, 0));
  }),
  frown: (M) => mouthStroke(M, (g, P) => {                             // への字
    g.moveTo(...P(-0.22, 0.07));
    g.quadraticCurveTo(...P(0, -0.08), ...P(0.22, 0.05));
  }),
  smirk: (M) => mouthStroke(M, (g, P) => {                             // にやり(前側が上がる)
    g.moveTo(...P(-0.2, 0.04));
    g.quadraticCurveTo(...P(0.05, 0.1), ...P(0.22, -0.08));
  }),
  wavy: (M) => mouthStroke(M, (g, P) => {                              // 波線
    g.moveTo(...P(-0.22, 0));
    g.quadraticCurveTo(...P(-0.11, -0.1), ...P(0, 0));
    g.quadraticCurveTo(...P(0.11, 0.1), ...P(0.22, 0));
  }),
  cat: (M) => mouthStroke(M, (g, P) => {                               // ω
    g.moveTo(...P(-0.2, 0));
    g.quadraticCurveTo(...P(-0.1, 0.14), ...P(0, 0));
    g.quadraticCurveTo(...P(0.1, 0.14), ...P(0.2, 0));
  }),
  small: (M) => mouthStroke(M, (g, P) => {                             // 小さな微笑み
    g.moveTo(...P(-0.1, 0));
    g.quadraticCurveTo(...P(0, 0.07), ...P(0.1, -0.01));
  }),
  o: (M) => mouthStroke(M, (g, P) => {                                 // 小さな「o」
    g.ellipse(...P(0, 0.02), 0.07 * M.ux, 0.07 * M.uy, 0, 0, 7);
  })
};

const MOUTH_OPEN = {
  oval: (M) => mouthOpen(M, (g, P) => {                                // 標準(楕円)
    g.ellipse(...P(0.02, 0.02), 0.2 * M.ux, 0.17 * M.uy, 0, 0, 7);
  }),
  round: (M) => mouthOpen(M, (g, P) => {                               // 小さな丸
    g.ellipse(...P(0.02, 0.02), 0.13 * M.ux, 0.13 * M.uy, 0, 0, 7);
  }),
  shout: (M) => mouthOpen(M, (g, P) => {                               // 叫び(縦長)
    g.ellipse(...P(0.02, 0.05), 0.15 * M.ux, 0.25 * M.uy, 0, 0, 7);
  }),
  wide: (M) => mouthOpen(M, MOUTH_SHAPE_WIDE),                         // 大きく開けた口(上が平ら)
  laugh: (M) => mouthOpen(M, MOUTH_SHAPE_WIDE, (g, P) => {             // 笑い口(舌つき)
    g.fillStyle = '#e66';
    g.beginPath();
    g.ellipse(...P(0, 0.2), 0.14 * M.ux, 0.1 * M.uy, 0, 0, 7);
    g.fill();
  }),
  fang: (M) => mouthOpen(M, (g, P) => {                                // 牙つき
    g.ellipse(...P(0.02, 0.02), 0.2 * M.ux, 0.17 * M.uy, 0, 0, 7);
  }, (g, P) => {
    g.fillStyle = '#fff';
    for (const x0 of [-0.1, 0.1]) {
      g.beginPath();
      g.moveTo(...P(x0 - 0.06, -0.18));
      g.lineTo(...P(x0 + 0.06, -0.18));
      g.lineTo(...P(x0, 0));
      g.closePath();
      g.fill();
    }
  }),
  grin: (M) => mouthOpen(M, MOUTH_SHAPE_WIDE, (g, P) => {              // ぎざぎざの歯
    g.fillStyle = '#fff';
    g.beginPath();
    g.moveTo(...P(-0.32, -0.14));
    g.lineTo(...P(0.32, -0.14));
    for (let i = 0; i <= 6; i++) g.lineTo(...P(0.32 - 0.64 * i / 6, i % 2 ? -0.02 : 0.06));
    g.closePath();
    g.fill();
  })
};

function MOUTH_SHAPE_WIDE(g, P) {
  g.moveTo(...P(-0.26, -0.05));
  g.quadraticCurveTo(...P(0, 0), ...P(0.26, -0.05));
  g.bezierCurveTo(...P(0.2, 0.3), ...P(-0.2, 0.3), ...P(-0.26, -0.05));
  g.closePath();
}

// ============================================================
// 髪・鼻・目のテンプレート
//
// キャラクター側では
//
// hair: "raiki"
// nose: "small"
// eyes: "blue"
//
// のように名前だけ指定する。
// ============================================================
// ---- イラスト風の目 ----
//   EYE_ILLUST.on = false で以前の丸い目に戻る。types の各目の設定:
//     iris(瞳の色。キャラの eyes.color があればそちら) / w, h(白目の横・縦の倍率) / irisW(瞳の横の倍率)
//     lash(上まぶたの太さの倍率) / wing(目尻のはね) / lower(下まぶたの線の長さ。目尻から 0〜1。0=なし / 1=目頭まで。省略1) / upper(上まぶたの線の長さ。目尻から。省略1)
//     brow, browW, browB, browF(テンプレ内蔵の眉の色・太さ・後ろ端/前端の高さ)
const EYE_ILLUST = {
  on: true,
  types: {
    // normal / black / red(ライキ・ガルド・バーサク)は元の丸い目のまま(きらきらさせない)。イラスト風にしたいときは
    //   normal: { iris: '#3a2c24', h: 0.9, irisW: 0.92, lash: 0.6, wing: false } のように足す
    purple: { iris: '#a5e', brow: '#8a6ad0' },
    blue:   { iris: '#269', brow: '#c9a020' },
    cyan:   { iris: '#2cc' },
    anime:  { iris: '#39f', w: 1.1, h: 1.12, irisW: 1.2, lash: 1.1, wing: true, lower: 0.4, upper: 0.85, browW: 2.8, browB: 0.5, browF: 0.4 }
  }
};
function illustEye(ctx, x, y, w, h, iris, lk, o) {
  const { g, C } = ctx, u = ctx.Rh / 13, cx = x + w * 0.26 * lk, cy = y + h * 0.1, rx = w * 0.6 * (o.irisW ?? 1), ry = h * 0.86,
    O = [x - w * 1.02, y + h * 0.1], I = [x + w, y + h * 0.24],
    U1 = [x - w * 0.55, y - h * 1.2], U2 = [x + w * 0.55, y - h * 1.12], L1 = [x + w * 0.5, y + h * 1.02], L2 = [x - w * 0.6, y + h * 0.98];
  const shape = () => { g.beginPath(); g.moveTo(...O); g.bezierCurveTo(...U1, ...U2, ...I); g.bezierCurveTo(...L1, ...L2, ...O); g.closePath(); };
  g.save();
  shape();
  g.fillStyle = C('#fff');
  g.fill();
  g.clip();
  let gr = g.createLinearGradient(0, y - h * 1.1, 0, y - h * 0.1);   // 白目の上側: まぶたの影
  gr.addColorStop(0, C('#c9bfd8')); gr.addColorStop(1, C('#ffffff'));
  g.fillStyle = gr;
  g.fillRect(x - w * 1.5, y - h * 1.3, w * 3, h * 1.3);
  gr = g.createLinearGradient(0, cy - ry, 0, cy + ry);               // 瞳: 上が暗く、下が明るい
  gr.addColorStop(0, C(shade(iris, -0.55))); gr.addColorStop(0.45, C(iris)); gr.addColorStop(1, C(shade(iris, 0.4)));
  g.fillStyle = gr;
  g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, 7); g.fill();
  g.strokeStyle = C(shade(iris, -0.6)); g.lineWidth = 0.6 * u; g.stroke();
  g.fillStyle = C('#120c10');                                         // 瞳孔
  g.beginPath(); g.ellipse(cx + rx * 0.08 * lk, cy + ry * 0.05, rx * 0.42, ry * 0.5, 0, 0, 7); g.fill();
  g.fillStyle = C('#fff');                                            // ハイライト
  g.beginPath(); g.ellipse(cx - rx * 0.32, cy - ry * 0.42, Math.max(0.6 * u, ry * 0.3), Math.max(0.6 * u, ry * 0.3), 0, 0, 7); g.fill();
  g.beginPath(); g.arc(cx + rx * 0.38, cy + ry * 0.42, Math.max(0.35 * u, ry * 0.14), 0, 7); g.fill();
  g.restore();
  g.lineCap = 'round';
  // 下まぶたの線: 目尻(O)から目頭(I)へ向かう下の曲線のうち、目尻側から lower の割合だけ描く
  const lo = Math.max(0, Math.min(1, o.lower ?? 1)),
    lerp2 = (a, b, s) => [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s],
    lowerPart = (s) => {                                              // 曲線 O→L2→L1→I の 0〜s の部分(ベジェ曲線の分割)
      const a = lerp2(O, L2, s), b = lerp2(L2, L1, s), c = lerp2(L1, I, s), d = lerp2(a, b, s), e = lerp2(b, c, s), f = lerp2(d, e, s);
      g.beginPath(); g.moveTo(...O); g.bezierCurveTo(...a, ...d, ...f);
    };
  if (lo > 0) {
    g.strokeStyle = C('#4a3040');                                     // 下まぶた(細く、目尻側だけ)
    g.lineWidth = 0.7 * u;
    lowerPart(Math.min(lo, 0.7)); g.stroke();
  }
  const lw = Math.max(1.1 * u, h * 0.42) * (o.lash ?? 1), lc = C(o.lashColor || '#17101a');
  g.strokeStyle = lc; g.fillStyle = lc;                               // 上まぶた(まつ毛)
  g.lineWidth = lw;
  {                                                                   // 目尻(O)から目頭(I)へ、upper の割合だけ(目頭側を縮める)
    const s = Math.max(0, Math.min(1, o.upper ?? 1)), a = lerp2(O, U1, s), b = lerp2(U1, U2, s), c = lerp2(U2, I, s), d = lerp2(a, b, s), e = lerp2(b, c, s), f = lerp2(d, e, s);
    g.beginPath(); g.moveTo(...O); g.bezierCurveTo(...a, ...d, ...f); g.stroke();
  }
  if (lo > 0) { g.lineWidth = lw * 0.45; lowerPart(lo); g.stroke(); }   // 白目の下の縁(細い線。lower の割合だけ)
  if (o.wing !== false) {                                             // 目尻のはね
    g.beginPath();
    g.moveTo(O[0] + w * 0.1, O[1] - h * 0.05);
    g.lineTo(x - w * 1.38, y - h * 0.38);
    g.lineTo(x - w * 0.6, y - h * 0.95);
    g.closePath(); g.fill();
  }
}

function drawFaceTemplate(ctx, type, name) {

  // name は名前(文字列)でも、設定({ type: 'normal', x, y, size, ... })でもよい
  const spec = name && typeof name === 'object' ? name : {};
  if (spec.type !== undefined) name = spec.type;

  const {
    g,
    K,
    LG,
    RG,
    C,
    ol,
    line,
    dot,
    hcx,
    hcy,
    Rh,
    wv,
    tr,
    hurt
  } = ctx;


  // ==========================================================
  // 髪型
  // ==========================================================
  if (type === "hair") {

    // ※ 鉢巻・角・帽子・ひげ・傷などは髪ではなく
    //    CHARACTER_DRAWS の headgear / faceDeco で指定する
    switch (name) {

      // ライキ(トゲ髪)
      case "raiki":
        ctx.spikes(C('#1c1c24'), 6, -Math.PI * 0.98, -Math.PI * 0.25, 1.45, 1.75, false);   // ライキの髪は動かさない
        ctx.cap(C('#1c1c24'), 1.84, 0.1);
        break;

      // シノ(短髪)
      case "shino":
        ctx.cap(K('#143', 0), 1.9, 0.08);
        break;

      // 短髪
      case "blade":
        ctx.cap(K('#4a2c14', 0), 1.86, 0.14);
        break;

      // ルリ(はねた短い毛束。根元は青、毛先は水色。スキンの palette の hair / hairTip で色が変わる)
      case "ruri": {
        // 軽くふんわりしたショートカット + 真ん中に集まる前髪 + 長いもみあげ。根元は青、毛先は水色(スキンの palette の hair / hairTip で色が変わる)
        const base = PAL(ctx, 'hair', '#1f63d6'), tip = PAL(ctx, 'hairTip', '#7fe8ff');
        const hv = ctx.hv, g = ctx.g, u = hv && hv.turned ? Math.min(1, hv.ap / (Math.PI / 2)) : 0;   // u = 正面向きの度合い(0=真横 1=正面)
        // ======== 横向き(ふだんの向き): 頭の上〜後ろをおおう髪。後ろ髪はあごの下までで毛先はギザギザ。前髪は前へ斜めに流れ、耳の前に長いもみあげ ========
        //   座標は頭の半径を1として [前(+)/後ろ(-), 上(-)/下(+)]。頭の中心が [0, 0]
        if (!hv || !hv.turned || u < 0.35 && !hv.back) {
          const P = (x, y) => [hcx + Rh * x, hcy + Rh * y],
            Jb = ctx.jiggle ? ctx.jiggle('ruriBack', [hcx, hcy], { k: 0.12, damp: 0.2, max: 4 }) : [0, 0],
            jig = (x, y, k) => { const q = P(x, y); return [q[0] + Jb[0] * k, q[1] + Jb[1] * k]; },
            dark = K(base, -0.35), olw = 2.2 * (typeof olScale === 'function' ? olScale('hair') : 1),
            fill = LG(hcx, hcy - Rh, hcx, hcy + Rh * 1.25, C(base), C(base), C(base), C(tip));
          // ---- 髪全体の形(前髪の先 → 頭の上 → 後ろ → ギザギザの毛先 → 首の後ろ → 耳の後ろ → 耳の上 → もみあげ → 前髪の下の縁) ----
          //   もみあげも同じ1つの形に入れる(髪から離れて見えないように)
          const T = jig(0.19, 1.32, 1.4);                                                // もみあげの先
          const shape = () => {
            g.beginPath();
            g.moveTo(...P(0.97, 0.2));                                                   // 前髪の先(目の高さの少し上。顔より少し前へ出る)
            g.quadraticCurveTo(...P(1.14, -0.2), ...P(1.02, -0.55));                    // 顔の前の縁
            g.bezierCurveTo(...P(0.9, -0.94), ...P(0.3, -1.14), ...P(-0.12, -1.1));     // 頭の上
            g.bezierCurveTo(...P(-0.62, -1.04), ...P(-1.06, -0.62), ...P(-1.08, -0.05));   // 後頭部
            g.bezierCurveTo(...P(-1.1, 0.4), ...P(-1.06, 0.72), ...jig(-0.96, 0.9, 0.6));  // 後ろ髪(少しふくらんで下へ)
            const zig = [[-0.92, 1.12], [-0.84, 0.92], [-0.76, 1.16], [-0.67, 0.94], [-0.58, 1.18], [-0.49, 0.96], [-0.41, 1.18], [-0.33, 0.96], [-0.27, 1.1], [-0.22, 0.9]];
            zig.forEach(([x, y], i) => g.lineTo(...jig(x, y, i % 2 ? 0.8 : 1.2)));      // 毛先はギザギザ
            g.lineTo(...P(-0.21, 0.62));                                                 // 首の後ろ(耳の下)
            g.quadraticCurveTo(...P(-0.24, 0.12), ...P(-0.08, 0.0));                     // 耳の後ろ〜上
            g.quadraticCurveTo(...P(-0.01, 0.0), ...P(-0.03, 0.18));                     // 耳の前へ回りこむ
            g.quadraticCurveTo(...P(0.03, 0.85), T[0], T[1]);                            // もみあげの後ろの縁(耳のすぐ前を下へ)
            g.bezierCurveTo(...P(0.19, 0.5), ...P(0.19, -0.12), ...P(0.36, -0.3));         // もみあげの前の縁(上へ。上のほうで前髪の側へ丸くカーブ)
            g.quadraticCurveTo(...P(0.68, -0.32), ...P(0.97, 0.2));                      // 前髪の下の縁(斜めに前へ)
            g.closePath();
          };
          shape();
          g.fillStyle = fill; g.fill();
          if (olw > 0) { g.strokeStyle = '#111'; g.lineWidth = olw; g.lineJoin = 'round'; g.stroke(); }
          // 毛の流れの線とつや
          g.save(); shape(); g.clip();
          g.strokeStyle = dark; g.lineWidth = 1.1; g.lineCap = 'round'; g.globalAlpha = 0.5;
          for (const [a, c, b] of [[[0.25, -0.98], [-0.6, -0.6], [-0.65, 1.05]], [[0.0, -1.0], [-0.95, -0.4], [-0.86, 0.98]], [[0.3, -0.95], [-0.3, -0.2], [-0.4, 1.06]],
            [[0.45, -0.9], [0.95, -0.55], [0.82, 0.12]], [[0.3, -0.85], [0.7, -0.4], [0.62, -0.02]]]) {
            g.beginPath(); g.moveTo(...P(...a)); g.quadraticCurveTo(...P(...c), ...P(...b)); g.stroke();
          }
          g.globalAlpha = 0.3; g.strokeStyle = '#ffffff'; g.lineWidth = Rh * 0.16;       // つや(頭の上の光の帯)
          g.beginPath(); g.arc(hcx - Rh * 0.05, hcy - Rh * 0.05, Rh * 0.78, -Math.PI * 0.86, -Math.PI * 0.5); g.stroke();
          g.restore();
          // もみあげの毛の流れ
          g.strokeStyle = dark; g.lineWidth = 1.1;
          g.beginPath(); g.moveTo(...P(0.15, -0.1)); g.quadraticCurveTo(...P(0.11, 0.7), ...P(0.17, 1.15)); g.stroke();
          ctx.hairBackUsed = true;                                                       // 耳は髪のあとに描き直す(髪の中に耳が見える)
          break;
        }
        // ======== 正面寄りを向いたとき: ふんわりしたショートカット + 真ん中に集まる前髪 ========
        const cs = hv ? hv.cs : 1, sn = hv ? hv.sn : 0,
          J = ctx.jiggle ? ctx.jiggle('ruriTufts', [hcx, hcy], { k: 0.12, damp: 0.2, max: 3 }) : [0, 0],   // ふわっと小さく揺れる
          dark = K(base, -0.35), fill = LG(hcx, hcy - Rh, hcx, hcy + Rh * 1.15, C(base), C(base), C(base), C(tip), C(tip)),
          olw = 1.8 * (typeof olScale === 'function' ? olScale('hair') : 1),
          sides = u > 0.25 ? [-1, 1] : [-1];
        // ---- 1. 頭のまわりのふくらみ(丸いかたまりを並べて、ふわっとした輪郭にする)。髪のベースの下に描く ----
        g.fillStyle = K(base, 0);
        for (const sd of sides) for (const [a0, r, rr] of [[-0.6, 0.86, 0.3], [-0.76, 0.88, 0.32], [-0.92, 0.88, 0.32], [-1.04, 0.84, 0.3]]) {
          const a = sd > 0 ? -Math.PI - a0 * Math.PI : a0 * Math.PI;
          g.beginPath(); g.arc(hcx + Math.cos(a) * Rh * r, hcy + Math.sin(a) * Rh * r, Rh * rr, 0, 7); g.fill(); ol(2);
        }
        ctx.cap(K(base, 0), 1.86, 0.12, 1);
        if (u < 0.3) {                                                      // 頭の上の毛の流れ(前から後ろへ)
          g.strokeStyle = dark; g.lineWidth = 1.1; g.globalAlpha = 0.55 * (1 - u / 0.3);
          for (const [r, a1, a2] of [[0.78, -0.42, -0.86], [0.55, -0.5, -0.95], [0.82, -0.7, -1.02]]) { g.beginPath(); g.arc(hcx - Rh * 0.08, hcy + Rh * 0.05, Rh * r, a1 * Math.PI, a2 * Math.PI, true); g.stroke(); }
          g.globalAlpha = 1;
        }
        // ---- 2. 毛束: 頭の後ろ〜えり足へ、頭に沿って垂れ、毛先はまっすぐ下へ(はねない・内へ巻かない) ----
        //   [根元の角度(πの倍数), 毛先の横の位置(頭の半径。後ろへ), 毛先の高さ(頭の中心から下へ), 太さ]
        const T = [[-0.64, 0.9, 0.42, 0.28], [-0.78, 1.0, 0.68, 0.3], [-0.92, 1.0, 0.9, 0.31], [-1.04, 0.88, 1.04, 0.3], [-1.13, 0.68, 1.1, 0.27]];
        const lock = ([a0, tx, ty, w], side) => {
          const a = side > 0 ? -Math.PI - a0 * Math.PI : a0 * Math.PI, sx = side > 0 ? 1 : -1,
            P0 = [hcx + Math.cos(a) * Rh * 0.72, hcy + Math.sin(a) * Rh * 0.72],                 // 根元は髪のベースの内側から
            P3 = [hcx + sx * Rh * tx + J[0], hcy + Rh * ty + J[1]],                           // 毛先(まっすぐ下へ。内へ巻かない)
            C1 = [hcx + sx * Rh * (tx + 0.06), P0[1] + (hcy + Rh * ty - P0[1]) * 0.3],         // 少しだけ外へふくらむ
            C2 = [hcx + sx * Rh * tx, hcy + Rh * (ty - 0.3)];                                  // 毛先の手前はまっすぐ下へ
          const N = 14, Lp = [], Rp = [];
          let tipC = null, tipA = 0, tipR = 0;
          for (let q = 0; q <= N; q++) {
            const t = q / N, m = 1 - t,
              bx = m * m * m * P0[0] + 3 * m * m * t * C1[0] + 3 * m * t * t * C2[0] + t * t * t * P3[0],
              by = m * m * m * P0[1] + 3 * m * m * t * C1[1] + 3 * m * t * t * C2[1] + t * t * t * P3[1],
              dx = 3 * m * m * (C1[0] - P0[0]) + 6 * m * t * (C2[0] - C1[0]) + 3 * t * t * (P3[0] - C2[0]),
              dy = 3 * m * m * (C1[1] - P0[1]) + 6 * m * t * (C2[1] - C1[1]) + 3 * t * t * (P3[1] - C2[1]), dl = Math.hypot(dx, dy) || 1,
              hw = Rh * w * (0.45 + 0.55 * Math.sin(Math.PI * Math.min(1, 0.2 + t * 0.8))) * (1 - 0.35 * t);   // 毛先へ少し細く(毛先は丸い)
            Lp.push([bx - dy / dl * hw, by + dx / dl * hw]);
            Rp.push([bx + dy / dl * hw, by - dx / dl * hw]);
            if (q === N) { tipC = [bx, by]; tipA = Math.atan2(dy, dx); tipR = hw; }
          }
          const path = () => {
            g.beginPath();
            Lp.forEach(([x, y], q) => g[q ? 'lineTo' : 'moveTo'](x, y));
            g.arc(tipC[0], tipC[1], tipR, tipA + Math.PI / 2, tipA - Math.PI / 2, true);   // 丸い毛先
            for (let q = N; q >= 0; q--) g.lineTo(Rp[q][0], Rp[q][1]);
          };
          path(); g.closePath(); g.fillStyle = fill; g.fill();
          if (olw > 0) {                                                    // 輪郭は根元を描かない(髪のベースとつながる)
            const from = Math.round(N * 0.35);
            g.beginPath();
            for (let q = from; q <= N; q++) g[q > from ? 'lineTo' : 'moveTo'](Lp[q][0], Lp[q][1]);
            g.arc(tipC[0], tipC[1], tipR, tipA + Math.PI / 2, tipA - Math.PI / 2, true);
            for (let q = N; q >= from; q--) g.lineTo(Rp[q][0], Rp[q][1]);
            g.strokeStyle = '#111'; g.lineWidth = olw; g.lineJoin = 'round'; g.stroke();
          }
          g.strokeStyle = dark; g.lineWidth = 1.1;                         // 毛の流れの線
          g.beginPath();
          for (let q = 3; q <= N - 2; q++) { const x = (Lp[q][0] * 0.65 + Rp[q][0] * 0.35), y = (Lp[q][1] * 0.65 + Rp[q][1] * 0.35); g[q > 3 ? 'lineTo' : 'moveTo'](x, y); }
          g.stroke();
        };
        for (let q = T.length - 1; q >= 0; q--) lock(T[q], -1);
        if (u > 0.25) T.slice(0, Math.round(T.length * u)).forEach((it) => lock(it, 1));
        // ---- 3. 前髪(真ん中に集まる形)ともみあげ。頭の表面に沿って描く ----
        if (!hv || hv.fv > 0.2) {
          const rho = 1.07,
            surf = (z, U) => {                                             // 頭の表面の点(z=顔の左右 / U=上下 下がプラス)→ [画面x, 画面y, 見えているか]
              const zm = Math.sqrt(Math.max(0, rho * rho - U * U)) * 0.999;
              z = Math.max(-zm, Math.min(zm, z));
              const F = Math.sqrt(Math.max(0, rho * rho - z * z - U * U)), dep = F * sn + z * cs;
              let x = F * cs - z * sn;
              if (dep < 0) x = Math.sign(x || 1) * Math.hypot(F, z);        // 頭の向こう側へ回る所は、頭のふちに寄せる
              return [hcx + Rh * x, hcy + Rh * U, dep];
            },
            sfc = (z, U) => surf(z, U).slice(0, 2),
            bez = (a, b, c, t) => [(1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * b[0] + t * t * c[0], (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * b[1] + t * t * c[1]];
          // 毛束1本(頭の表面の座標で、根元 r → 曲がり c → 毛先 e。w=根元の太さ)。左右の縁を作って塗り、外側の縁に線
          const strand = (r, c, e, w, fillStyle, lineW = olw) => {
            const N = 12, Lp = [], Rp = [];
            for (let q = 0; q <= N; q++) {
              const t = q / N, p0 = bez(r, c, e, t), p1 = bez(r, c, e, Math.min(1, t + 0.02)), p2 = bez(r, c, e, Math.max(0, t - 0.02)),
                dz = p1[0] - p2[0], du = p1[1] - p2[1], dl = Math.hypot(dz, du) || 1, hw = w * Math.pow(1 - t, 0.85);
              Lp.push(sfc(p0[0] - du / dl * hw, p0[1] + dz / dl * hw));
              Rp.push(sfc(p0[0] + du / dl * hw, p0[1] - dz / dl * hw));
            }
            g.beginPath();
            Lp.forEach(([x, y], q) => g[q ? 'lineTo' : 'moveTo'](x, y));
            for (let q = N; q >= 0; q--) g.lineTo(Rp[q][0], Rp[q][1]);
            g.closePath();
            g.fillStyle = fillStyle; g.fill();
            if (lineW > 0) {                                                // 線は根元を描かず、毛先の方だけ(ほかの毛束・髪とつながって見える)
              const from = 4;
              g.beginPath();
              for (let q = from; q <= N; q++) g[q > from ? 'lineTo' : 'moveTo'](Lp[q][0], Lp[q][1]);
              for (let q = N; q >= from; q--) g.lineTo(Rp[q][0], Rp[q][1]);
              g.strokeStyle = '#111'; g.lineWidth = lineW; g.lineJoin = 'round'; g.stroke();
            }
          };
          const fFill = LG(hcx, hcy - Rh * 0.8, hcx, hcy + Rh * 0.35, C(base), C(base), C(tip));
          // もみあげ(長い。向き対応の描画を使う)
          (HAIR_TURNED.sideburns || HAIR_STYLES.sideburns)(ctx, { type: 'sideburns', color: base, length: 1.5 }, 'front');
          // 前髪: 左右から生えた毛束の毛先が真ん中へ集まる。真ん中がいちばん長く(眉間まで)、外側ほど短い
          //   [根元z, 毛先z, 毛先の高さU(下がプラス), 太さ]
          const B = [[-0.95, -0.6, -0.26, 0.24], [-0.68, -0.36, -0.14, 0.24], [-0.4, -0.15, -0.04, 0.22], [0, 0, 0.06, 0.2], [0.4, 0.15, -0.04, 0.22], [0.68, 0.36, -0.14, 0.24], [0.95, 0.6, -0.26, 0.24]];
          g.beginPath();                                                     // 前髪の地(毛束のすき間から肌が見えないように)
          const fr0 = [...B.map(([, ez, eu]) => sfc(ez, eu - 0.14)), ...[0.95, 0, -0.95].map((z) => sfc(z, -0.8))];
          fr0.forEach(([x, y], q) => g[q ? 'lineTo' : 'moveTo'](x, y));
          g.closePath(); g.fillStyle = K(base, 0); g.fill();
          for (const q of [0, 6, 1, 5, 2, 4, 3]) {                          // 外側から描いて、真ん中の毛束がいちばん手前
            const [rz, ez, eu, w] = B[q];
            strand([rz, -0.82], [rz * 0.85, (eu - 0.82) / 2 + 0.06], [ez, eu], w, fFill);
          }
        }
        break;
      }

      // バーサク(逆立つ髪)
      case "berserk":
        ctx.spikes(C('#7a2418'), 7, -Math.PI * 1.0, -Math.PI * 0.12, 1.5, 1.95);
        ctx.cap(K('#7a2418', 0), 1.78, 0.18);
        break;
    }

    return;
  }


  // ==========================================================
  // 鼻
  // ==========================================================
  if (type === "nose") {

    // 鼻なし
    if (name === "none") return;


    // 普通
    if (name === "normal") {

      g.fillStyle = K(ctx.skinColor, 0.05);

      g.beginPath();

      g.moveTo(
        hcx + Rh * 0.9,
        hcy + Rh * 0.05
      );

      g.lineTo(
        hcx + Rh * 1.14,
        hcy + Rh * 0.3
      );

      g.lineTo(
        hcx + Rh * 0.84,
        hcy + Rh * 0.34
      );

      g.closePath();
      g.fill();

      ol(1.8);

      return;
    }


    // 小さい鼻
    if (name === "small") {

      g.fillStyle = K(ctx.skinColor, 0.05);

      g.beginPath();

      g.moveTo(
        hcx + Rh * 0.9,
        hcy + Rh * 0.1
      );

      g.lineTo(
        hcx + Rh * 1.02,
        hcy + Rh * 0.25
      );

      g.lineTo(
        hcx + Rh * 0.88,
        hcy + Rh * 0.28
      );

      g.closePath();
      g.fill();

      ol(1.8);

      return;
    }


    // 長い鼻
    if (name === "long") {

      g.fillStyle = K(ctx.skinColor, 0.05);

      g.beginPath();

      g.moveTo(
        hcx + Rh * 0.85,
        hcy - Rh * 0.08
      );

      g.lineTo(
        hcx + Rh * 1.25,
        hcy + Rh * 0.28
      );

      g.lineTo(
        hcx + Rh * 0.8,
        hcy + Rh * 0.35
      );

      g.closePath();
      g.fill();

      ol(1.8);

      return;
    }


    // ガルド系の丸い鼻
    if (name === "round") {

      g.fillStyle = K(ctx.skinColor, 0.05);

      g.beginPath();

      g.moveTo(
        hcx + Rh * 0.88,
        hcy + Rh * 0.05
      );

      g.quadraticCurveTo(
        hcx + Rh * 1.15,
        hcy + Rh * 0.15,
        hcx + Rh * 1.05,
        hcy + Rh * 0.32
      );

      g.lineTo(
        hcx + Rh * 0.82,
        hcy + Rh * 0.34
      );

      g.closePath();
      g.fill();

      ol(1.8);

      return;
    }
  }


  // ==========================================================
  // 目
  // ==========================================================
  if (type === "eyes") {

    // eyes: { type, x(顔の前後 0=頭の中心 / 省略0.6), y(上下 0=頭の中心 -で上 / 省略-0.1),
    //         size(全体の大きさ倍率), width / height(横・縦だけの倍率) }
    const es = spec.size ?? 1;
    const ey = hcy + Rh * (spec.y ?? -0.1);
    const ew = Rh * 0.17 * es * (spec.width ?? 1);
    const eh = Rh * 0.25 * es * (spec.height ?? 1);
    const bk = eh / (Rh * 0.25);                  // 眉の高さ(目の縦の大きさに合わせる)
    const noBrow = ctx.charDraw.brows !== undefined;   // brows を設定したキャラは、眉は drawBrows が描く(目のテンプレ内の眉は描かない)

    const x = hcx + Rh * (spec.x ?? 0.6);
    const w = ew * 0.82;
    const lk = ctx.eyeLook ?? 1;                   // 瞳の寄り(1=顔の向きへ寄る / 0=中央)。向きを変えたとき drawHeadTurned が設定する


    // --------------------------------------------------------
    // ダメージ時
    // --------------------------------------------------------
    if (hurt) {

      g.strokeStyle = '#111';
      g.lineWidth = 2.5;
      g.lineCap = 'round';

      g.beginPath();

      g.moveTo(
        x - w,
        ey - eh * 0.6
      );

      g.lineTo(
        x + w * 0.6,
        ey
      );

      g.lineTo(
        x - w,
        ey + eh * 0.6
      );

      g.stroke();

      return;
    }


    // --------------------------------------------------------
    // イラスト風の目 (EYE_ILLUST.on のとき EYE_ILLUST.types にある目(purple / blue / cyan / anime) をこの描き方にする)
    //   まつ毛の太い上まぶた(目尻ははね上げ) / 下まぶたの細い線 / 上から下へ明るくなる瞳 / 瞳孔 / ハイライト2つ
    //   / 白目の上側に落ちるまぶたの影。テンプレートの横は顔の前後(+が鼻の側)なので、目尻は -x 側
    // --------------------------------------------------------
    const IL = EYE_ILLUST.on && EYE_ILLUST.types[name];
    if (IL) {
      illustEye(ctx, x, ey, w * (IL.w ?? 1), eh * (IL.h ?? 1), spec.color || IL.iris, lk, IL);
      if (!noBrow) line(
        [x - w * 1.3, ey - Rh * (IL.browB ?? 0.4) * bk],
        [x + w * 1.2, ey - Rh * (IL.browF ?? 0.3) * bk],
        IL.browW ?? 2.4,
        IL.brow || '#222'
      );
      return;
    }

    // --------------------------------------------------------
    // 通常の目
    // --------------------------------------------------------
    if (name === "normal") {

      g.fillStyle = '#fff';

      g.beginPath();

      g.ellipse(
        x,
        ey,
        w,
        eh,
        0,
        0,
        7
      );

      g.fill();
      ol(1.2);

      g.fillStyle = '#222';

      g.beginPath();

      g.ellipse(
        x + w * 0.4 * lk,
        ey,
        w * 0.62,
        eh * 0.85,
        0,
        0,
        7
      );

      g.fill();

      dot(
        x + w * 0.5 * lk,
        ey,
        eh * 0.38,
        '#000'
      );

      dot(
        x + w * 0.6 * lk,
        ey - eh * 0.4,
        1.1,
        '#fff'
      );

      if (!noBrow) line(
        [x - w * 1.3, ey - Rh * 0.4 * bk],
        [x + w * 1.2, ey - Rh * 0.3 * bk],
        2.4,
        '#222'
      );

      return;
    }


// --------------------------------------------------------
    // 鋭い目（忍者風・キリッとしたつり目）
    // --------------------------------------------------------
    if (name === "sharp") {

      g.fillStyle = '#fff';

      g.beginPath();
      // よりシャープで切れ長なつり目のパス
      g.moveTo(
        x - w * 1.2,
        ey - eh * 0.1
      );

      // 上まぶた（強く吊り上がる曲線）
      g.quadraticCurveTo(
        x,
        ey - eh * 1.2,
        x + w * 1.3,
        ey - eh * 0.5
      );

      // 下まぶた（引き締まったライン）
      g.quadraticCurveTo(
        x,
        ey + eh * 0.2,
        x - w * 1.2,
        ey - eh * 0.1
      );

      g.closePath();
      g.fill();

      ol(1.5);

      // 忍者らしい冷徹な黒目（縦長・スリット風）
      dot(
        x + w * 0.4 * lk,
        ey - eh * 0.45,
        eh * 0.35,
        '#111'
      );

      return;
    }


    // --------------------------------------------------------  
    // 黒い目
    // --------------------------------------------------------
    if (name === "black") {

      g.fillStyle = '#fff';

      g.beginPath();

      g.ellipse(
        x,
        ey,
        w,
        eh,
        0,
        0,
        7
      );

      g.fill();
      ol(1.2);

      g.fillStyle = '#222';

      g.beginPath();

      g.ellipse(
        x + w * 0.4 * lk,
        ey,
        w * 0.62,
        eh * 0.85,
        0,
        0,
        7
      );

      g.fill();

      dot(
        x + w * 0.5 * lk,
        ey,
        eh * 0.38,
        '#000'
      );

      if (!noBrow) line(
        [x - w * 1.3, ey - Rh * 0.4 * bk],
        [x + w * 1.2, ey - Rh * 0.3 * bk],
        2.4,
        '#222'
      );

      return;
    }


    // --------------------------------------------------------
    // 紫の目
    // --------------------------------------------------------
    if (name === "purple") {

      g.fillStyle = '#fff';

      g.beginPath();

      g.ellipse(
        x,
        ey,
        w,
        eh,
        0,
        0,
        7
      );

      g.fill();
      ol(1.2);

      g.fillStyle = '#a5e';

      g.beginPath();

      g.ellipse(
        x + w * 0.4 * lk,
        ey,
        w * 0.62,
        eh * 0.85,
        0,
        0,
        7
      );

      g.fill();

      dot(
        x + w * 0.5 * lk,
        ey,
        eh * 0.38,
        '#000'
      );

      dot(
        x + w * 0.6 * lk,
        ey - eh * 0.4,
        1.1,
        '#fff'
      );

      if (!noBrow) line(
        [x - w * 1.3, ey - Rh * 0.4 * bk],
        [x + w * 1.2, ey - Rh * 0.3 * bk],
        2.4,
        '#8a6ad0'
      );

      return;
    }


    // --------------------------------------------------------
    // 青い目
    // --------------------------------------------------------
    if (name === "blue") {

      g.fillStyle = '#fff';

      g.beginPath();

      g.ellipse(
        x,
        ey,
        w,
        eh,
        0,
        0,
        7
      );

      g.fill();
      ol(1.2);

      g.fillStyle = '#269';

      g.beginPath();

      g.ellipse(
        x + w * 0.4 * lk,
        ey,
        w * 0.62,
        eh * 0.85,
        0,
        0,
        7
      );

      g.fill();

      dot(
        x + w * 0.5 * lk,
        ey,
        eh * 0.38,
        '#000'
      );

      dot(
        x + w * 0.6 * lk,
        ey - eh * 0.4,
        1.1,
        '#fff'
      );

      if (!noBrow) line(
        [x - w * 1.3, ey - Rh * 0.4 * bk],
        [x + w * 1.2, ey - Rh * 0.3 * bk],
        2.4,
        '#c9a020'
      );

      return;
    }


    // --------------------------------------------------------
    // 赤い目
    // --------------------------------------------------------
    if (name === "red") {

      g.fillStyle = '#fff';

      g.beginPath();

      g.ellipse(
        x,
        ey,
        w,
        eh,
        0,
        0,
        7
      );

      g.fill();
      ol(1.2);

      g.fillStyle = '#c22';

      g.beginPath();

      g.ellipse(
        x + w * 0.4 * lk,
        ey,
        w * 0.62,
        eh * 0.85,
        0,
        0,
        7
      );

      g.fill();

      dot(
        x + w * 0.5 * lk,
        ey,
        eh * 0.38,
        '#000'
      );

      if (!noBrow) line(
        [x - w * 1.3, ey - Rh * 0.4 * bk],
        [x + w * 1.2, ey - Rh * 0.3 * bk],
        2.6,
        '#5a1a10'
      );

      return;
    }


    // --------------------------------------------------------
    // 水色
    // --------------------------------------------------------
    if (name === "cyan") {

      g.fillStyle = '#fff';

      g.beginPath();

      g.ellipse(
        x,
        ey,
        w,
        eh,
        0,
        0,
        7
      );

      g.fill();
      ol(1.2);

      g.fillStyle = '#2cc';

      g.beginPath();

      g.ellipse(
        x + w * 0.4 * lk,
        ey,
        w * 0.62,
        eh * 0.85,
        0,
        0,
        7
      );

      g.fill();

      dot(
        x + w * 0.5 * lk,
        ey,
        eh * 0.38,
        '#000'
      );

      dot(
        x + w * 0.6 * lk,
        ey - eh * 0.4,
        1.1,
        '#fff'
      );

      if (!noBrow) line(
        [x - w * 1.3, ey - Rh * 0.4 * bk],
        [x + w * 1.2, ey - Rh * 0.3 * bk],
        2.4,
        '#222'
      );

      return;
    }


    // --------------------------------------------------------
    // ゴーレム
    // --------------------------------------------------------
    if (name === "golem") {

      const gsx = Rh * ((spec.x ?? 0.6) - 0.6),                          // golem は目が2つ。x を省略(0.6)すると標準の位置
        gy = spec.y !== undefined ? hcy + Rh * spec.y : hcy + 1,
        gs = spec.size ?? 1;
      for (const dx of [Rh * 0.12 * gs + Rh * 0.4 * (1 - gs), Rh * 0.68 * gs + Rh * 0.4 * (1 - gs)].map((v) => v + gsx)) {

        g.fillStyle = RG(
          hcx + dx,
          gy,
          1,
          6 * gs,
          '#fff6c0',
          '#ff9020',
          'rgba(255,90,0,0)'
        );

        g.beginPath();

        g.arc(
          hcx + dx,
          gy,
          6 * gs,
          0,
          7
        );

        g.fill();

        dot(
          hcx + dx,
          gy,
          (hurt ? 1.2 : 2.4) * gs,
          C('#fff3a0')
        );
      }

      return;
    }

    // --------------------------------------------------------
    // 目をつぶっている（逆さの円弧）
    // --------------------------------------------------------
    if (name === "closed") {
      g.strokeStyle = '#222';
      g.lineWidth = 2.4;
      
      // 全体を少し下へずらすためのオフセット
      const offsetY = ey + eh * 0.2;

      g.beginPath();
      g.moveTo(x - w, offsetY);
      g.quadraticCurveTo(
        x,
        offsetY + eh * 0.8, // 制御点を下に配置して向きを反転
        x + w,
        offsetY
      );
      g.stroke();

      if (!noBrow) line(
        [x - w * 1.3, offsetY - Rh * 0.4 * bk],
        [x + w * 1.2, offsetY - Rh * 0.3 * bk],
        2.4,
        '#222'
      );

      return;
    }

    // --------------------------------------------------------
    // 目をつぶっている（斜めに傾けた逆さの円弧）
    // --------------------------------------------------------
    if (name === "shinosClosed") {
      g.strokeStyle = '#222';
      g.lineWidth = 2.4;
      
      const offsetY = ey + eh * 0.2;
      
      // 傾きの角度（ラジアン）※プラスで右下がり、マイナスで右上がりになります
      const angle = 0.2; // ここを変えると傾きを調整できます

      g.save();
      g.translate(x, offsetY);
      g.rotate(angle); // 座標全体を傾ける

      g.beginPath();
      g.moveTo(-w, 0);
      g.quadraticCurveTo(
        0,
        eh * 0.8, // 制御点を下に配置して向きを反転
        w,
        0
      );
      g.stroke();

      g.restore(); // 傾きを元に戻す

      // 眉毛も目と平行に傾かせる
      if (!noBrow) {
        // 眉の中央基準で同じように回転させるか、シンプルなオフセットで追従
        const browY = offsetY - Rh * 0.35 * bk;
        line(
          [x - w * 1.3, browY - w * Math.sin(angle) * 1.2],
          [x + w * 1.2, browY + w * Math.sin(angle) * 1.2],
          2.4,
          '#222'
        );
      }

      return;
    }

    // --------------------------------------------------------
    // アニメのようなかわいい目
    // --------------------------------------------------------
    if (name === "anime") {
      g.fillStyle = '#fff';

      g.beginPath();
      g.ellipse(
        x,
        ey,
        w * 1.1,
        eh * 1.1,
        0,
        0,
        7
      );
      g.fill();
      ol(1.5);

      // 鮮やかな瞳のベース
      g.fillStyle = spec.color || '#39f'; // 瞳の色(eyes の color で変えられる)

      g.beginPath();

      g.ellipse(
        x,
        ey,
        w * 0.8,
        eh * 0.85,
        0,
        0,
        7
      );

      g.fill();

      // 瞳孔
      dot(
        x,
        ey + eh * 0.1,
        eh * 0.4,
        '#111'
      );

      // 大きなハイライト（上部）
      dot(
        x - w * 0.25,
        ey - eh * 0.3,
        eh * 0.35,
        '#fff'
      );

      // 小さなハイライト（下部）
      dot(
        x + w * 0.3,
        ey + eh * 0.35,
        eh * 0.15,
        '#fff'
      );

      // 眉毛や上まぶたのライン
      if (!noBrow) line(
        [x - w * 1.3, ey - Rh * 0.5 * bk],
        [x + w * 1.2, ey - Rh * 0.4 * bk],
        2.8,
        '#222'
      );

      return;
    }
  }
}

// ============================================================
// 眉毛 (CHARACTER_DRAWS の brows)
//   brows: false                 … 眉毛なし
//   brows: "angry"               … テンプレ名だけ
//   brows: { type, x, y, size, width, thickness, color, tilt }
//   未指定(brows を書かない)のキャラは、従来どおり目のテンプレ内蔵の眉のまま
// ============================================================
const BROW_TYPES = {
  // back/front=後ろ端・前端の高さ(+で下), mid=真ん中の山(+で下)。単位は頭の半径の 0.1
  normal:   { back: -0.5, front: 0.5, mid: 0 },
  straight: { back: 0, front: 0, mid: 0 },
  angry:    { back: -1.2, front: 1.4, mid: 0 },
  sad:      { back: 0.9, front: -1.1, mid: 0 },
  arch:     { back: 0.3, front: 0.5, mid: -1.6 },
  maro:     { dot: true }
};

function drawBrows(ctx, spec) {
  if (!spec) return;
  if (typeof spec === 'string') spec = { type: spec };
  const { g, C, hurt, hcx, hcy, Rh, charDraw } = ctx,
    T = BROW_TYPES[spec.type || 'normal'] || BROW_TYPES.normal,
    e = charDraw.eyes && typeof charDraw.eyes === 'object' ? charDraw.eyes : {},
    es = e.size ?? 1, eh = es * (e.height ?? 1), ew = Rh * 0.17 * es * (e.width ?? 1) * 0.82,
    sz = spec.size ?? 1, U = Rh * 0.1 * sz,
    L = ew * 1.25 * sz * (spec.width ?? 1),                                  // 眉の半分の長さ
    x = hcx + Rh * (spec.x ?? e.x ?? 0.6),                                    // 省略時は目と同じ前後位置
    y = hcy + Rh * (spec.y ?? ((e.y ?? -0.1) - 0.35 * eh)),                   // 省略時は目の少し上
    th = spec.thickness ?? 2.4,
    tilt = (spec.tilt ?? 0) + (hurt ? -1 : 0),                                // やられ時は困り眉になる
    col = C(spec.color || '#222');
  g.strokeStyle = col;
  g.fillStyle = col;
  g.lineWidth = th;
  g.lineCap = 'round';
  g.beginPath();
  if (T.dot) {                                                                // まろ眉(丸い点)
    g.ellipse(x, y + tilt * U * 0.3, L * 0.45, Math.max(th * 0.8, U * 0.5), 0, 0, 7);
    g.fill();
    return;
  }
  const yb = y + (T.back - tilt) * U, yf = y + (T.front + tilt) * U, ym = y + T.mid * U;
  g.moveTo(x - L, yb);
  g.quadraticCurveTo(x, (yb + yf) / 2 + (ym - y) * 2, x + L, yf);
  g.stroke();
}


// ---- 髪の生え際(境目)を向きに合わせて描く ----
//   髪の範囲 = 「高さ U ≥ ub(a)」。a = 顔の正面から測った方位角(0=正面, π/2=真横, π=真後ろ)。
//   頭を回すと見える範囲は方位角 -phi〜π-phi の半周で、その輪郭を画面に投影して多角形にする。
function hairBoundary(Uc, bk) {
  const Ub = -0.06 - 0.89 * bk, Ut = Math.min(0.1, Uc + 0.05),
    K = [[0, Uc], [1.25, Uc - 0.04], [1.7, Ut], [2.0, -0.04 + Math.min(0, Ub + 0.06) * 0.2], [2.6, Ub], [Math.PI, Ub]];
  return (a) => {
    for (let i = 1; i < K.length; i++) {
      if (a <= K[i][0]) return K[i - 1][1] + (K[i][1] - K[i - 1][1]) * (a - K[i - 1][0]) / (K[i][0] - K[i - 1][0]);
    }
    return K[K.length - 1][1];
  };
}

// センター分けの生え際。正面から見たとき「中央の幅 pw だけ平ら(高さ Uc) → そこから傾き k の直線で両脇へ下りる」形になるように、
// 各方位角 a(0=正面, π/2=真横)での高さ U を逆算する (U = Uc - k * max(0, 画面x - pw), 画面x = sqrt(1-U²) * sin a)。
// 真横から見ると、額から側頭部へ斜めに流れる生え際になる。a が後ろへ進むと後頭部の髪(bk)へなめらかに繋ぐ。
function hairBoundaryCenter(Uc, bk, k = 1.45, pw = 0.12) {
  // 画面上の横位置 lat(0=頭の中心 / 1=頭の端)から生え際の高さ U を逆算する
  const Ub = -0.06 - 0.89 * bk, solve = (lat, kk) => {
    const f = (U) => U - Uc + kk * Math.max(0, Math.sqrt(Math.max(0, 1 - U * U)) * lat - pw);
    let lo = -1, hi = Uc;
    for (let i = 0; i < 30; i++) {
      const m = (lo + hi) / 2;
      if (f(m) > 0) hi = m; else lo = m;
    }
    return (lo + hi) / 2;
  };
  // a=顔の向きからの角度(0=顔の正面)、phi=頭の回転、al=符号つきの角度。顔側(a<=π/2)は画面上の横位置で、後ろ側は後頭部の髪(Ub)へなめらかに繋ぐ
  return (a, phi, al) => {
    const kk = k * (0.55 + 0.45 * Math.min(1, Math.abs(phi) / 1.2));     // 真横に近いほど傾きをゆるめる(目が生え際に隠れないように)
    if (a <= Math.PI / 2) return solve(Math.abs(Math.cos(al + phi)), kk);
    const e0 = solve(Math.abs(Math.cos((al < 0 ? -1 : 1) * Math.PI / 2 + phi)), kk),
      t = Math.min(1, (a - Math.PI / 2) / (2.5 - Math.PI / 2)), e = t * t * (3 - 2 * t);
    return e0 + (Ub - e0) * e;
  };
}

function hairPolyTurned(ctx, fill, ub, steps = 30) {
  const { g, hcx, hcy, Rh, hv } = ctx, Rr = Rh + 1.5;
  let first, last;
  g.fillStyle = fill;
  g.beginPath();
  for (let i = 0; i <= steps; i++) {
    const al = -hv.phi + (Math.PI * i) / steps, U = ub(al > Math.PI ? 2 * Math.PI - al : Math.abs(al), hv.phi, al) * Rh,
      rho = Math.sqrt(Math.max(0, Rr * Rr - U * U)), x = hcx + rho * Math.cos(al + hv.phi), y = hcy - U;
    if (i) g.lineTo(x, y); else g.moveTo(x, y);
    if (!i) first = [x, y];
    last = [x, y];
  }
  const ang = (p) => { let a = Math.atan2(p[1] - hcy, p[0] - hcx); return a < 0 ? a + Math.PI * 2 : a; };
  const aL = ang(last); let aR = ang(first);
  if (aR < aL) aR += Math.PI * 2;
  g.arc(hcx, hcy, Rr, aL, aR);
  g.closePath();
  g.fill();
  ctx.ol(2.5);
}

// ---- センター分け(参考イラストから起こした形) ----
//   座標は頭の半径=1。x は顔の向き(+)、U は頭の中心からの高さ(上がプラス)。
//   CENTER_HAIR[i] = 向き i (0=真横 1=少し正面 2=まあまあ正面 3=正面) の形:
//     Ua      … 分けの頂点(平らな部分)の高さ
//     L / R   … 頂点から U=-0.9 まで13段の、肌が見える範囲の左端・右端 (1.4 = 頭の外まで肌=髪なし)
//     lockL/R … 側髪(左・右)。Ut〜Ub の高さを10段で、外側 o と内側 i の x
const CENTER_HAIR = [
  { Ua: 0.439,
    L: [0.75, 0.602, 0.483, 0.383, 0.28, 0.188, 0.12, 0.091, 0.076, 0.06, 0.054, 0.043, 0.037],
    R: [0.882, 0.926, 1.4, 1.4, 1.4, 1.4, 1.4, 1.4, 1.4, 1.4, 1.4, 1.4, 1.4],
    lockL: { Ut: -0.1, Ub: -1.4, o: [-1.004, -0.98, -0.933, -0.86, -0.753, -0.592, -0.328, -0.148, -0.096, -0.014], i: [0.204, 0.113, 0.083, 0.061, 0.051, 0.037, 0.033, 0.033, 0.033, 0.043] },
    lockR: { Ut: -1.05, Ub: -1.4, o: [0.313, 0.313, 0.313, 0.315, 0.322, 0.334, 0.35, 0.366, 0.381, 0.394], i: [0.159, 0.171, 0.187, 0.204, 0.223, 0.247, 0.274, 0.3, 0.327, 0.357] } },
  { Ua: 0.443,
    L: [0.61, 0.396, 0.315, 0.241, 0.19, 0.142, 0.111, 0.091, 0.078, 0.06, 0.054, 0.043, 0.037],
    R: [0.769, 0.87, 1.4, 1.4, 1.4, 1.4, 1.4, 1.4, 1.4, 1.4, 1.4, 1.4, 1.4],
    lockL: { Ut: -0.1, Ub: -1.4, o: [-1.004, -0.98, -0.933, -0.86, -0.753, -0.592, -0.328, -0.148, -0.096, -0.014], i: [0.148, 0.104, 0.083, 0.061, 0.051, 0.037, 0.033, 0.033, 0.033, 0.043] },
    lockR: { Ut: -0.4, Ub: -1.1, o: [0.955, 0.947, 0.937, 0.929, 0.921, 0.91, 0.898, 0.885, 0.868, 0.845], i: [0.913, 0.874, 0.829, 0.804, 0.817, 0.824, 0.828, 0.822, 0.813, 0.804] } },
  { Ua: 0.283,
    L: [0.317, 0.029, -0.054, -0.13, -0.188, -0.247, -0.311, -0.365, -0.416, -0.464, -0.499, -0.513, -1.4],
    R: [0.561, 0.682, 0.775, 0.845, 0.901, 0.936, 1.4, 1.4, 1.4, 1.4, 1.4, 1.4, 1.4],
    lockL: { Ut: -0.1, Ub: -1.65, o: [-1.004, -0.973, -0.909, -0.806, -0.761, -0.727, -0.675, -0.586, -0.471, -0.369], i: [-0.183, -0.288, -0.387, -0.472, -0.513, -0.52, -0.495, -0.445, -0.388, -0.33] },
    lockR: { Ut: -0.1, Ub: -1.35, o: [1.012, 1.012, 1.027, 1.043, 1.047, 1.038, 1.011, 0.981, 0.944, 0.874], i: [0.897, 0.943, 0.949, 0.967, 0.962, 0.944, 0.923, 0.902, 0.868, 0.831] } },
  { Ua: 0.536,
    L: [-0.15, -0.276, -0.371, -0.456, -0.534, -0.6, -0.658, -0.709, -0.748, -0.775, -1.4, -1.4, -1.4],
    R: [0.148, 0.274, 0.369, 0.454, 0.532, 0.598, 0.656, 0.707, 0.746, 0.771, 1.4, 1.4, 1.4],
    lockL: { Ut: -0.1, Ub: -1.6, o: [-1.004, -0.998, -0.994, -0.983, -0.961, -0.919, -0.874, -0.84, -0.779, -0.717], i: [-0.619, -0.696, -0.752, -0.779, -0.786, -0.771, -0.753, -0.736, -0.704, -0.674] },
    lockR: { Ut: -0.1, Ub: -1.6, o: [1.002, 0.996, 0.992, 0.981, 0.959, 0.917, 0.872, 0.838, 0.777, 0.715], i: [0.617, 0.694, 0.75, 0.777, 0.784, 0.769, 0.751, 0.734, 0.702, 0.672] } }
];

// 向き hd のときの形を、向きの間を線形に補間して返す
function centerHairShape(hd) {
  const t = Math.min(3, Math.abs(hd)), i = Math.min(2, Math.floor(t)), f = t - i, a = CENTER_HAIR[i], b = CENTER_HAIR[i + 1],
    mix = (p, q) => p + (q - p) * f, mixA = (p, q) => p.map((v, k) => mix(v, q[k]));
  return {
    Ua: mix(a.Ua, b.Ua), L: mixA(a.L, b.L), R: mixA(a.R, b.R),
    lockL: { Ut: mix(a.lockL.Ut, b.lockL.Ut), Ub: mix(a.lockL.Ub, b.lockL.Ub), o: mixA(a.lockL.o, b.lockL.o), i: mixA(a.lockL.i, b.lockL.i) },
    lockR: { Ut: mix(a.lockR.Ut, b.lockR.Ut), Ub: mix(a.lockR.Ub, b.lockR.Ub), o: mixA(a.lockR.o, b.lockR.o), i: mixA(a.lockR.i, b.lockR.i) }
  };
}

// ---- 前髪の part(分け目の開き) ----
//   センター分けの part(-1〜1)は「分けた髪の角度」。分け目(顔の真ん中)をはさんで、左右の髪を頭の縦の軸のまわりに
//   反対向きに同じ角度だけ回す(左右対称)。手前側の髪は +角度、奥側の髪は -角度。生え際・側髪(もみあげ)・耳も一緒に回る
//   +1 で partAngle 度(省略 30°)開く(額が広く、もみあげ・耳が後ろへ) / -1 で閉じる(前髪が顔を覆い、もみあげ・耳が前へ)
function hairPartAngle(ctx) {
  const cd = ctx && ctx.charDraw;
  for (const it of asList(cd && cd.hair)) {
    if (!it || typeof it !== 'object' || it.type !== 'bangs' || (it.style || 'center') !== 'center') continue;
    const p = Math.max(-1, Math.min(1, +it.part || 0));
    return p * (it.partAngle ?? 30) * Math.PI / 180;
  }
  return 0;
}
// 頭の表面の点 (x, U) を th 回したときの画面x の移動量。裏側へ回る分は頭の縁で止める(縁より内側へは戻らない)
function partShiftX(x, U, th) {
  const r2 = 1 - U * U;
  if (!th || r2 <= 1e-6) return 0;
  let x2 = partRotX(x, U, th);
  if (Math.abs(x2) >= 1.39) x2 = Math.sign(x2) * Math.sqrt(r2);
  return x2 - x;
}
// 頭に固定された点 (F=前後, R=左右 +手前) の画面x を、頭の向き phi に part の回転 th を足して出す(頭の半径=1、頭の中心から)
function partS(phi, th, F, R) { const a = phi + th; return F * Math.cos(a) - R * Math.sin(a); }
// 頭の球の表面で見えている点 (x, U) を、縦の軸のまわりに th 回す(頭の半径=1)。頭の外を表す値(|x|>=1.39)はそのまま。
//   回って裏側へ行った点は、頭の縁の外(±1.4)にする
function partRotX(x, U, th) {
  if (!th || Math.abs(x) >= 1.39) return x;
  const r2 = 1 - U * U;
  if (r2 <= 1e-6) return x;
  const rr = Math.sqrt(r2), xr = Math.max(-rr, Math.min(rr, x)), z = Math.sqrt(Math.max(0, r2 - xr * xr)),
    c = Math.cos(th), s = Math.sin(th), x2 = xr * c - z * s, z2 = xr * s + z * c;
  return z2 < 0 ? (x2 < 0 ? -1.4 : 1.4) : x2;
}

// センター分けの前髪を描く。 partY=分けの頂点の高さ(+で下がる) / length=生え際全体の高さ / sideburn=側髪の長さ
// ---- 毛先(毛束の先) ----
//   センター分けの前髪は、分け目から左右へ流れる毛束を生え際に沿って重ね、先をこめかみ・頬の方へとがらせる。
//   HAIR_TIPS.on = false で以前のなめらかな縁 / depth = 毛先の長さ(頭の半径に対する割合) / lowest = 毛束を付ける縁の下限の高さ
//   キャラごとに前髪(bangs)・ロングヘアなどの tips: 0〜2(長さの倍率) / false(付けない) で変えられる
const HAIR_TIPS = { on: true, depth: 0.42, width: 0.26, line: 1.3, lowest: -0.55 };   // depth=毛先の長さ / width=毛先の毛束の太さ(半分) / line=縁取り・流れの線の太さ
function drawCenterBangs(ctx, it, col, pUD, len, sb, mode = 'front') {   // mode: 'far' = 奥のもみあげだけ描く(いちばん後ろ) / 'front' = それ以外
  const { g, K, hcx, hcy, Rh, hv } = ctx, Rr = Rh + 1.5, back = hv.hd < 0;
  const X = (x) => hcx + Rh * x, Yv = (U) => hcy - Rh * U;
  // 背面側へ回すと、真横の形を顔ごと奥へずらし(肌が隠れる)、側髪は正面の形(左右対称)へ寄せる
  const wb = back ? Math.min(1, Math.abs(hv.hd) / 3) : 0, shift = back ? Math.sin(hv.ap) : 0;
  const sh = centerHairShape(back ? 0 : hv.hd), A = CENTER_HAIR[3];
  const dU = -0.55 * (len - 0.1) - 0.28 * pUD;                      // 頂点の移動量(下端 U=-0.9 は動かさず、上ほど大きく動く)
  const warp = (U) => U + dU * Math.max(0, Math.min(1, (U + 0.9) / (sh.Ua + 0.9)));
  // 髪が無い側(頭の外)は、髪の円(Rr)より外まで肌の範囲を広げる(顔の前に髪の円の線・すき間が出ないように。顔の輪郭は頭の形の線だけになる)
  const edge = (v, U) => Math.abs(v) >= 1.39 ? Math.sign(v) * ((Rr / Rh) * Math.sqrt(Math.max(0, 1 - U * U)) + 0.4) : v;
  const th = hairPartAngle(ctx), phi = hv.phi || 0;                // part: 分け目を頭のまわりに回す角度
  const N = 13, U0 = sh.Ua - 0.012, pts = [];
  for (let k = 0; k < N; k++) {
    const U = U0 + (-0.9 - U0) * k / (N - 1), Uw = warp(U);
    let xl = partRotX(sh.L[k] + shift, Uw, th), xr = partRotX(sh.R[k] + shift, Uw, -th);   // 手前側の縁は +th、奥側の縁は -th(左右対称に開く)
    if (xl > xr) xl = xr = (xl + xr) / 2;                           // 閉じすぎて左右の縁が交差したら、その高さは髪で埋める
    pts.push([U, edge(xl, U), edge(xr, U), Math.abs(xl) >= 1.39, Math.abs(xr) >= 1.39]);   // 4,5番目 = その縁は頭の外(髪が無い)
  }
  // 側髪(もみあげ)。頭の髪(cap)・前髪のあとに描く(drawLocks)。形は表(CENTER_HAIR の lockL/R)を元に、頭の形に合わせて sideLockFit で直す
  const holeX = (side, U) => {                                     // 高さ U での生え際の x(頭の半径=1)。その高さが頭の外(髪が無い)なら null
    for (let k = 1; k < N; k++) {
      const a = pts[k - 1], b = pts[k], ua = warp(a[0]), ub = warp(b[0]);
      if ((U - ua) * (U - ub) > 0) continue;
      if (a[side + 2] || b[side + 2]) return null;
      const t = ub === ua ? 0 : (U - ua) / (ub - ua);
      return a[side] + (b[side] - a[side]) * t;
    }
    return null;
  };
  const drawLocks = () => { if (sb > 0) {
    const scale = Math.min(1.6, sb / 1.45);
    for (const key of ['lockL', 'lockR']) {
      let lk = sh[key];
      if (wb > 0) {
        const ak = A[key], m = (p, q) => p + (q - p) * wb;
        lk = { Ut: m(lk.Ut, ak.Ut), Ub: m(lk.Ub, ak.Ub), o: lk.o.map((v, k) => m(v, ak.o[k])), i: lk.i.map((v, k) => m(v, ak.i[k])) };
      }
      const Ub = lk.Ut + (lk.Ub - lk.Ut) * scale, n = lk.o.length,
        tl = key === 'lockL' ? th : -th,                              // 手前の側髪は +th、奥の側髪は -th 回る
        dxl = th ? partShiftX(lk.i[0], lk.Ut, tl) : 0,                // part: 側髪の付け根が、生え際と同じだけ回った分ずらす(正面では外/内へ、真横では後ろ/前へ)
        sgn = lk.o[0] < lk.i[0] ? -1 : 1, side = sgn < 0 ? 1 : 2;     // sgn = 顔から外へ向かう向き / side = その側の生え際
      const far = key === 'lockR' && !back ? Math.max(0, Math.min(1, 0.9 * Math.cos(phi) / 0.45)) : 0;   // 奥側の側髪(斜めの向きで顔の向こう側)
      if (far > 0 && lk.Ut < -0.1) lk = { ...lk, Ut: lk.Ut + (-0.1 - lk.Ut) * far };   // 奥側は頬の高さから垂らす(付け根を顔の後ろに隠し、上の端が見えないように)
      // センター分けから続く毛束: 分け目(生え際の頂点)から生え際に沿って下り、そのまま側髪として垂れる。
      //   生え際が頭の中に見えている側だけ(真横の向きの奥側などは、以前どおり側髪だけ)
      const Hl = [];
      if (far <= 0.5 && !lockUnder) for (let k = 0; k < N && !pts[k][side + 2]; k++) { const U = warp(pts[k][0]); if (U <= lk.Ut + 0.02) break; Hl.push([pts[k][side], U]); }
      const conn = Hl.length >= 2;
      lk = sideLockFit(ctx, lk, Ub, dxl, sgn, far, (U) => holeX(side, U), conn);
      const Uk = (k) => lk.Ut + (Ub - lk.Ut) * k / (n - 1);
      const inner = [], outer = [];                                      // 顔の側の縁(上→毛先) / 外側の縁(毛先→上)
      if (conn) for (const [x, U] of Hl) inner.push([X(x), Yv(U)]);
      for (let k = 0; k < n; k++) inner.push([X(lk.i[k] + dxl), Yv(Uk(k))]);
      const tips = [];
      if (HAIR_TIPS.on && it.tips !== false) {                        // 側髪の先: 2本の毛束の先に分かれてとがる
        const xo = X(lk.o[n - 1] + dxl), xi = X(lk.i[n - 1] + dxl), yb = Yv(Ub), d = Rh * HAIR_TIPS.depth * (it.tips ?? 1);
        tips.push([xo + (xi - xo) * 0.8, yb + d * 1.05], [xo + (xi - xo) * 0.55, yb + d * 0.35], [xo + (xi - xo) * 0.3, yb + d * 1.5]);
      }
      for (let k = n - 1; k >= 0; k--) outer.push([X(lk.o[k] + dxl), Yv(Uk(k))]);
      if (conn) {                                                     // 生え際の外側を、側髪の太さから分け目へ向かって細くしながら上る
        const w0 = (lk.o[0] - lk.i[0]) * sgn, Ua = Hl[0][1], Ue = lk.Ut;
        for (let j = Hl.length - 1; j >= 0; j--) {
          const [x, U] = Hl[j], t = Math.max(0, Math.min(1, (Ua - U) / (Ua - Ue))), s2 = Math.sqrt(t);
          outer.push([X(x + sgn * w0 * s2), Yv(U)]);
        }
      }
      const line = (P, first) => { for (let j = 0; j < P.length; j++) g[first && !j ? 'moveTo' : 'lineTo'](P[j][0], P[j][1]); };
      if ((far > 0.5) !== (mode === 'far')) continue;
      g.save();                  // 奥のもみあげは 'far'(キャラのいちばん後ろ)で、それ以外は 'front' で描く
      g.fillStyle = K(it.sideburnColor || col, 0);
      g.beginPath(); line(inner, true); line(tips); line(outer); g.closePath();
      g.fill();
      if (!conn) { ctx.ol(2.2); g.restore(); continue; }
      // 縁取り: 顔の側の縁と毛先は黒い線。外側の縁は、頭の外に出た所だけ黒い線、髪の上では髪の暗い色の細い線(付け根に線を作らない)
      g.beginPath(); line(inner, true); line(tips); line(outer.slice(0, 1)); ctx.ol(2.2);
      g.save();
      g.beginPath(); g.rect(hcx - 400, hcy - 400, 800, 800); g.arc(hcx, hcy, Rr, 0, Math.PI * 2); g.clip('evenodd');
      g.beginPath(); line(outer, true); ctx.ol(2.2);
      g.restore();
      g.save();
      g.beginPath(); g.arc(hcx, hcy, Rr, 0, Math.PI * 2); g.clip();
      g.beginPath(); line(outer, true);
      g.strokeStyle = K(col, -0.45); g.lineWidth = 1.1 * olScale(); g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke();
      g.restore();
      g.restore();
    }
  } };
  // 側髪(もみあげ)は頭の髪・前髪の上に描く(髪の下に描くと、ほかの髪に隠れて見えなくなるため)。
  //   背面寄り(顔がほとんど見えない向き)では側髪が顔の側(向こう側)にあるので、以前どおり頭の髪の下に描いて隠す
  const lockUnder = hv.hd < -0.9;                                   // 顔がほとんど見えない背面寄り
  if (mode === 'far') { if (!lockUnder) drawLocks(); return; }
  if (lockUnder || it.cap === false) drawLocks();
  if (it.cap === false) return;
  if ((it.back ?? 1) > 0) ctx.hairBackUsed = true;
  // 肌が見える範囲の多角形(頂点から下へ、左側 → 下 → 右側)
  const holePath = () => {
    g.moveTo(X(pts[0][1]), Yv(warp(pts[0][0])));
    for (const p of pts) g.lineTo(X(p[1]), Yv(warp(p[0])));
    g.lineTo(X(pts[N - 1][1]), Yv(-1.8));
    g.lineTo(X(pts[N - 1][2]), Yv(-1.8));
    for (let k = N - 1; k >= 0; k--) g.lineTo(X(pts[k][2]), Yv(warp(pts[k][0])));
    g.closePath();
  };
  g.save();
  g.beginPath();
  g.arc(hcx, hcy, Rr, 0, Math.PI * 2);
  g.clip();
  g.fillStyle = K(col, 0);
  g.beginPath();
  g.rect(hcx - 400, hcy - 400, 800, 800);
  holePath();
  g.fill('evenodd');
  g.restore();
  // 輪郭: 髪の生え際(円の内側だけ) と、髪が覆っている頭の外周
  g.save();
  g.beginPath();
  g.arc(hcx, hcy, Rr, 0, Math.PI * 2);
  g.clip();
  g.beginPath();
  holePath();
  ctx.ol(2.2);
  g.restore();
  g.save();
  g.beginPath();
  g.rect(hcx - 400, hcy - 400, 800, 800);
  holePath();
  g.clip('evenodd');
  g.beginPath();
  g.arc(hcx, hcy, Rr, 0, Math.PI * 2);
  ctx.ol(2.5);
  g.restore();
  if (HAIR_TIPS.on && it.tips !== false) bangStrands(ctx, col, pts, X, Yv, warp, Rr, it.tips ?? 1, holePath, sb > 0 && !lockUnder);   // もみあげがあるときは、顔の側に出る毛先(丸い毛束)を描かない
  if (!lockUnder) drawLocks();                                           // 側髪(もみあげ): 頭の髪・前髪の毛束の上
}

// 側髪(もみあげ)の形を頭の形に合わせる。
//   表の形は丸い頭で作ってあるので、あごの細い顔(animeGirl など)では側髪が顔の外にぶら下がり、
//   見える所が縁取りの線より細い「黒い棒」になっていた。そこで
//   ・顔の輪郭の近くに垂れる側髪(正面寄りの向き)は、内側の縁を生え際(肌が見える範囲の縁)の続きにして、そのまま下へ垂らす。
//     生え際がある高さでは生え際より顔の側へは出さない(前髪の毛先と重ならない)。その下は輪郭より SIDE_LOCK.over 以上内側にし、外側の縁は輪郭の外まで出す
//     あごへ向かって輪郭がすぼまっても、頬の幅の SIDE_LOCK.hang 倍より内側へは寄せない(あごに沿わず、まっすぐ垂れる)
//   ・どの向きでも太さを 付け根 SIDE_LOCK.top → 毛先 SIDE_LOCK.bottom 以上にする(縁取りの線の太さの分も足す)
//   太さ・かぶせる量は頭の半径に対する割合。far = 奥側の側髪の度合い(0〜1) / hole(U) = 高さ U の生え際の x(髪が無い高さは null)
const SIDE_LOCK = { top: 0.34, bottom: 0.22, over: 0.02, hang: 0.88, widest: 0.3, end: 0.5, max: 0.3 };   // widest = いちばん太い所(付け根0〜毛先1) / end = 毛先の太さの割合 / max = いちばん太い所の太さの上限
function sideLockFit(ctx, lk, Ub, dxl, sgn, far, hole, connected = false) {   // connected: 付け根を生え際の毛束につなぐ(付け根を細くしない)
  const { hcx, hcy, Rh } = ctx, n = lk.o.length, lw = 2.2 * olScale() / Rh, rr = 1 + 1.5 / Rh,   // rr = 頭の髪の円(Rh + 1.5)
    H = typeof headOutline === 'function' ? headOutline(ctx) : null,
    Uat = (k) => lk.Ut + (Ub - lk.Ut) * k / (n - 1);
  // 高さ U での頭の輪郭の x(sgn の側の端。頭の半径=1、頭の中心から)。その高さに頭が無ければ null
  const silX = (U) => {
    if (!H) { const r2 = 1 - U * U; return r2 > 0 ? sgn * Math.sqrt(r2) : null; }
    const y = hcy - Rh * U; let best = null;
    for (let j = 0; j < H.length; j++) {
      const a = H[j], b = H[(j + 1) % H.length];
      if ((a[1] - y) * (b[1] - y) > 0 || a[1] === b[1]) continue;
      const x = (a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) - hcx) / Rh;
      if (best == null || (x - best) * sgn > 0) best = x;
    }
    return best;
  };
  let cheek = 0;
  const S = [];
  for (let k = 0; k < n; k++) { const x = silX(Uat(k)); S.push(x); if (x != null) cheek = Math.max(cheek, x * sgn); }
  if (!(cheek > 0)) return lk;
  // 輪郭の近くに垂れている側髪ほど、輪郭に合わせる(m=1)。顔の奥(真横の向きの耳の前など)は表の形のまま(m=0)
  // 側髪は髪の上に描くので、どの向きでも顔の側の縁を生え際の続きにする(生え際と側髪の間に髪のすき間を作らない)
  const m = 1;
  const i = [], o = [];
  let lastH = null, lastS = sgn * cheek;
  for (let k = 0; k < n; k++) {
    const f = k / (n - 1), w = SIDE_LOCK.top + (SIDE_LOCK.bottom - SIDE_LOCK.top) * f + lw,
      ti = lk.i[k], to = (lk.o[k] - ti) * sgn >= w ? lk.o[k] : ti + sgn * w;      // 表の形: 顔の側の縁はそのまま、外側を広げて太さを保つ
    let fi = ti, fo = to;
    if (m > 0) {
      const U = Uat(k), h = hole ? hole(U) : null;
      if (S[k] != null) lastS = S[k];                                // 頭より下は、最後の高さの輪郭のまま
      if (h != null && (h - lastS) * sgn < 0) lastH = h + dxl;       // 生え際(頭の内側にある所だけ)
      const sx = sgn * Math.max(lastS * sgn, cheek * SIDE_LOCK.hang) - dxl, base = lastH != null ? lastH - dxl : ti;
      fi = h != null && lastH != null ? base : sgn * Math.min(base * sgn, sx * sgn - SIDE_LOCK.over);   // 生え際がある高さは生え際の所まで(顔に食い込まない)。その下はまっすぐ垂らす
      fo = sgn * Math.max((fi + sgn * w) * sgn, sx * sgn + 0.08);
      if (far > 0) {                                                 // 奥側: 奥の頬の後ろに垂れ、輪郭の外へ少しだけのぞく(顔の上は描かない。drawCenterBangs で頭の外だけに切り抜く)
        const bi = sx - sgn * 0.06, bo = sx + sgn * w * 0.6;
        fi += (bi - fi) * far; fo += (bo - fo) * far;
      }
    }
    const ii = ti + (fi - ti) * m;
    let oo = to + (fo - to) * m;
    if ((oo - ii) * sgn < 0.12) oo = ii + sgn * 0.12;
    if ((oo - ii) * sgn > SIDE_LOCK.max + lw) oo = ii + sgn * (SIDE_LOCK.max + lw);   // 太すぎない(真横の表の形は耳の後ろまで広がっているので、髪の上に描くと耳を覆ってしまう)
    const r = connected ? 1 : Math.min(1, k / 4), e = Math.max(0, Math.min(1, (f - SIDE_LOCK.widest) / (1 - SIDE_LOCK.widest)));
    oo = ii + (oo - ii) * (0.12 + 0.88 * r * r * (3 - 2 * r)) * (1 - (1 - SIDE_LOCK.end) * e * e * (3 - 2 * e));
    i.push(ii);
    o.push(oo);
  }
  return { ...lk, i, o };
}

// 前髪の毛束: 生え際(肌が見える範囲の縁)から、顔の側へ垂れる先のとがった毛束を数本重ねる。
//   毛束は1本ずつ別の形として塗って縁取りするので、隣どうしが重なって見える。縁が頭の外(髪が無い所)には付けない
function bangStrands(ctx, col, pts, X, Yv, warp, Rr, k, holePath, noTip = false) {
  // センター分け: 前髪は分け目(額の真ん中)から左右へ流れる。毛束は生え際の縁に沿って寝かせ、
  //   分け目 → こめかみ → 頬へと流れて、先だけ少し顔の側へとがって出る。分け目に近い毛束ほど上に重なる
  const { g, K, hcx, hcy, Rh } = ctx, N = pts.length, P = (i, s) => [X(pts[i][s]), Yv(warp(pts[i][0]))];
  const C = [X((pts[0][1] + pts[0][2]) / 2), Yv(-0.3)];
  const topOK = !pts[0][3] && !pts[0][4] && Math.abs(P(0, 2)[0] - P(0, 1)[0]) > Rh * 0.08, M = [(P(0, 1)[0] + P(0, 2)[0]) / 2, (P(0, 1)[1] + P(0, 2)[1]) / 2];
  const paths = [];
  for (const [s, ei] of [[1, 3], [2, 4]]) {                           // 左の縁 / 右の縁
    if (pts[0][ei]) continue;
    const Q = topOK ? [M] : [];
    for (let i = 0; i < N && pts[i][0] >= HAIR_TIPS.lowest && !pts[i][ei]; i++) Q.push(P(i, s));
    if (Q.length >= (topOK ? 5 : 4)) paths.push(Q);                  // 生え際が少ししか見えない側(真横を向いたときの奥側)には描かない
  }
  if (!paths.length) return;
  const strands = [];
  for (const Q of paths) {
    const cum = [0];
    for (let i = 1; i < Q.length; i++) cum.push(cum[i - 1] + Math.hypot(Q[i][0] - Q[i - 1][0], Q[i][1] - Q[i - 1][1]));
    const Ltot = cum[cum.length - 1];
    if (Ltot < Rh * 0.55) continue;
    const at = (s) => {                                               // 縁の上の、分け目からの長さ s の点と向き
      s = Math.max(0, Math.min(Ltot, s));
      let i = 1; while (i < Q.length - 1 && cum[i] < s) i++;
      const f = (s - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1), x = Q[i - 1][0] + (Q[i][0] - Q[i - 1][0]) * f, y = Q[i - 1][1] + (Q[i][1] - Q[i - 1][1]) * f;
      let tx = Q[i][0] - Q[i - 1][0], ty = Q[i][1] - Q[i - 1][1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      let nx = -ty, ny = tx; if (nx * (C[0] - x) + ny * (C[1] - y) < 0) { nx = -nx; ny = -ny; }   // n = 顔の側(内側)
      return { x, y, tx, ty, nx, ny };
    };
    strands.push({ at, Ltot });
  }
  if (!strands.length) return;
  g.save();
  g.beginPath();
  g.arc(hcx, hcy, Rr, 0, Math.PI * 2);
  g.clip();
  const w = Rh * HAIR_TIPS.width;
  for (const S of strands) {
    const { at, Ltot } = S;
    // 1) 流れの線: 分け目から外・下へ、生え際と並んで流れ、下の方で生え際に合流する(髪の中に引く細い線)
    //    両端が細い筆の線(サラサラ感)。長さ・離れ方を少しずつ変えた3本
    g.fillStyle = K(col, -0.6);                                       // 髪の色を暗くした色(黒い輪郭より軽く見せる)
    for (const [off, e0, e1, wk] of [[0.2, 0.1, 0.82, 1], [0.42, 0.25, 0.96, 0.75]]) {
      const P2 = [];
      for (let i = 0; i <= 14; i++) {
        const f = e0 + (e1 - e0) * i / 14, A = at(Ltot * f), o = Rh * off * (1 - Math.pow(f, 2.2)) + Rh * 0.03;
        P2.push({ x: A.x - A.nx * o, y: A.y - A.ny * o, vis: 1, s: i / 14 });
      }
      if (olScale() > 0) hairStroke(g, P2, 0, 1, HAIR_TIPS.line * 0.42 * wk * olScale());
    }
    if (noTip) continue;                                              // もみあげが生え際から続くときは毛先を描かない(もみあげの顔の側に丸い髪が出ないように)
    // 2) 毛先: 生え際の下の端から、流れる向き(こめかみ・頬の方)へとがって伸びる毛束1本
    const s0 = Ltot * 0.5, E = at(Ltot), tl = Rh * HAIR_TIPS.depth * k, n = 6, outer = [], inner = [],
      oo = Rh * 0.06 + 1.4 * olScale();                              // 外側の縁は、生え際の縁取りの線(太さ 2.2)の外まで(線の残りが細い線になって見えないように)
    for (let i = 0; i <= n; i++) {
      const A = at(s0 + (Ltot - s0) * i / n), ww = w * Math.sin(Math.PI * 0.5 * i / n) * 0.9;
      outer.push([A.x - A.nx * oo, A.y - A.ny * oo]);
      inner.push([A.x + A.nx * ww, A.y + A.ny * ww]);
    }
    const T = [E.x + E.tx * tl + E.nx * w * 0.15, E.y + E.ty * tl + E.ny * w * 0.15], oL = outer[n], iL = inner[n];
    const side = (arr, first) => {
      if (first) g.moveTo(arr[0][0], arr[0][1]); else g.lineTo(arr[0][0], arr[0][1]);
      for (let i = 1; i < arr.length - 1; i++) g.quadraticCurveTo(arr[i][0], arr[i][1], (arr[i][0] + arr[i + 1][0]) / 2, (arr[i][1] + arr[i + 1][1]) / 2);
      g.lineTo(arr[arr.length - 1][0], arr[arr.length - 1][1]);
    };
    const tipTo = () => {
      g.quadraticCurveTo(oL[0] + E.tx * tl * 0.6, oL[1] + E.ty * tl * 0.6, T[0], T[1]);
      g.quadraticCurveTo(iL[0] + E.tx * tl * 0.5, iL[1] + E.ty * tl * 0.5, iL[0], iL[1]);
    };
    // 毛先は顔の上(肌が見える範囲)だけに描く。髪の上にはみ出した所は、縁取りが髪の中の余計な線に見えるため
    g.save();
    if (holePath) { g.beginPath(); holePath(); g.clip(); }
    g.beginPath(); side(outer, true); tipTo(); side(inner.slice().reverse(), false); g.closePath();
    g.fillStyle = K(col, 0);
    g.fill();
    g.beginPath(); g.moveTo(oL[0], oL[1]); tipTo(); side(inner.slice().reverse(), false);   // 縁取り: 顔の側の辺と毛先だけ
    ctx.ol(HAIR_TIPS.line);
    g.restore();
  }
  g.restore();
}

// センター分けの側髪(もみあげ)と、頭の髪の境目の線。
//   真横の形で「耳の上 → 耳の前 → 頭の下で垂れた側髪の後ろの縁」へつながる線を決め、
//   向きが変わったときは、顔側の髪の縁(sh.L)が真横からずれた分だけ一緒にずらす(側髪の形と同じ表から動くので、ずれない)。
//   顔の向き ±40°くらいまで描く。sideburnSeam: false で描かない
function centerBangsSeam(ctx, sh, shift, sb, Rr, edge, th = 0) {
  const { g, hcx, hcy, Rh, hv } = ctx;
  const fade = Math.max(0, Math.min(1, (0.36 - Math.abs(hv.phi)) / 0.2));   // 顔の向き 9°〜21° でだんだん消える(それより正面寄りでは、線が側髪の縁から離れて髪の中の余計な線に見えるため)
  if (fade <= 0) return;
  const S0 = CENTER_HAIR[0], rr = Rr / Rh,
    Lat = (shape, U) => {                                          // 顔側の髪の縁の x (高さ U)
      const U0 = shape.Ua - 0.012, f = Math.max(0, Math.min(12, (U - U0) / (-0.9 - U0) * 12)), k = Math.min(11, Math.floor(f)), t = f - k;
      const a = edge(shape.L[k], U), b = edge(shape.L[k + 1], U);
      return a + (b - a) * t;
    },
    dx = (U) => { const u = Math.max(-0.9, Math.min(-0.3, U)); return Lat(sh, u) + shift - Lat(S0, u); };   // 耳より上は耳の高さと同じだけずらす(額の近くは縁の形が向きで大きく変わり、線が折れるため)
  // 終点: 真横の側髪の後ろの縁が頭の外へ出るところ(側髪が短くて頭の中で終わるときは毛先)
  const lk = S0.lockL, n = lk.o.length, Ub = lk.Ut + (lk.Ub - lk.Ut) * Math.min(1.6, sb / 1.45),
    at = (k) => [lk.o[k], lk.Ut + (Ub - lk.Ut) * k / (n - 1)], out = (p) => p[0] * p[0] + p[1] * p[1] - rr * rr;
  let E = at(n - 1);
  for (let k = 1; k < n; k++) {
    const a = at(k - 1), b = at(k);
    if (out(a) < 0 && out(b) >= 0) {
      let lo = 0, hi = 1;
      for (let j = 0; j < 20; j++) {
        const m = (lo + hi) / 2;
        if (out([a[0] + (b[0] - a[0]) * m, a[1] + (b[1] - a[1]) * m]) < 0) lo = m; else hi = m;
      }
      E = [a[0] + (b[0] - a[0]) * lo, a[1] + (b[1] - a[1]) * lo];
      break;
    }
  }
  const S = [-0.11, 0.2], C = [-0.08, -0.55];                      // 始点(耳の上) / 曲がり(耳の前)
  g.save();
  g.beginPath();
  g.arc(hcx, hcy, Rr, 0, Math.PI * 2);
  g.clip();
  g.beginPath();
  for (let i = 0; i <= 16; i++) {
    const t = i / 16, x = (1 - t) * (1 - t) * S[0] + 2 * t * (1 - t) * C[0] + t * t * E[0],
      U = (1 - t) * (1 - t) * S[1] + 2 * t * (1 - t) * C[1] + t * t * E[1];
    g[i ? 'lineTo' : 'moveTo'](hcx + Rh * partRotX(x + dx(U), U, th), hcy - Rh * U);   // part の回転も同じだけ
  }
  g.lineCap = 'round';
  g.globalAlpha *= fade;
  ctx.ol(2.2);
  g.restore();
}

// 頭頂の髪のベース(cap)。a1 は従来の引数(顔側の端の角度)から生え際の高さを出す
function capTurned(ctx, c, a1, d, back) {
  const bk = Math.max(0, Math.min(1, back));
  if (bk > 0) ctx.hairBackUsed = true;
  hairPolyTurned(ctx, c, hairBoundary(-Math.sin(Math.PI * a1), bk));
}

// 側髪(もみあげ・横に垂れる髪)。len は頭の半径に対する長さ
function lockTurned(ctx, col, len, sway = 0, o = {}) {
  if (!(len > 0)) return;
  const { hcx, hcy, Rh, hv } = ctx, y0 = hcy - Rh * (o.top ?? 0.2), y1 = hcy + Rh * (0.25 + len),
    vol = Rh * 0.26 * (o.width ?? 1) * (1 - 0.2 * hv.as);
  for (const s of [-1, 1]) {
    // 側髪は頭の左右(R=±0.9)・耳の少し前(F=0.05)に生えている。頭の向きに合わせて画面位置を出し、奥側(頭の裏)になる側髪は描かない。
    const F = o.F ?? 0.05, R = s * Math.sqrt(Math.max(0, 0.81 - F * F * 0.5)), z = F * hv.sn + R * hv.cs;       // z = 手前(+)/奥(-)
    if (z < -0.3) continue;
    const x = hv.S(F, R), out = Math.sign(x - hcx) || s,
      tx = x + sway * 0.6 + out * Rh * 0.12 * (0.4 + hv.as);       // 毛先は外側へ少し流す
    hairTail(ctx, [x, y0], [tx, y1], vol * (z > 0 ? 1 : 0.7 + z), col, s < 0 ? -0.12 : 0, 'lock' + (o.id || '') + s, { collide: 'none', stiff: [0.6, 0.25], head: false });
  }
}

// ---- 向き別の髪(後ろ髪・毛束など。cap / spikes は drawF の中で向き対応済み) ----
const HAIR_TURNED = {
  long(ctx, it, layer) {
    const col = it.color || '#3a2a1a';
    if (layer === 'front') return hairCap(ctx, it, col);
    longHairBack(ctx, it, col);
  },

  ponytail(ctx, it, layer) {
    const { dot, C, hcx, hcy, Rh, Y, wv, tr, hv } = ctx;
    const col = it.color || '#3a2a1a', len = it.length ?? 0.5, vol = it.volume ?? 7,
      R = [hv.S(-0.98, 0), hcy + Rh * (it.y ?? -0.45)],
      sway = 0,                                                    // なびきは物理(hairTail の id)で動く
      T = [R[0] - Rh * 0.55 * hv.cs + sway, R[1] + Y.tl * len + Rh * 0.2];
    // 背面寄りでは結んだ髪が頭の手前(見ている側)に垂れる。背面(hairOver)では 'back' が最後に描かれるので、毛束と結び目をそこで描く
    const onTop = hv.back && hv.as > 0.5 && !ctx.hairOver,
      tie = () => {
        if (it.tie !== false && hv.phi < 0.25) {                  // 結び目は後ろ向きの面にあるので、少し回ると隠れる
          dot(R[0], R[1], vol * 0.5 + 1.8 * olScale(), '#111');
          dot(R[0], R[1], vol * 0.5, C(it.tie || '#e46'));
        }
      };
    if (layer === 'back') {
      if (onTop) return;
      hairTail(ctx, R, T, vol, col, 0, 'ponytail', physLimits(it));
      if (ctx.hairOver) tie();
      return;
    }
    hairCap(ctx, it, col);
    if (onTop) hairTail(ctx, R, T, vol, col, 0, 'ponytail', physLimits(it));
    if (!ctx.hairOver) tie();
  },

  twinTails(ctx, it, layer) {
    const { dot, C, hcy, Rh, Y, wv, tr, hv } = ctx;
    const col = it.color || '#3a2a1a', len = it.length ?? 0.6, vol = it.volume ?? 6, y = it.y ?? -0.3,
      sway = 0, yy = hcy + Rh * y,                                 // なびきは物理(hairTail の id)で動く
      Rn = [hv.S(-0.7, 0.88), yy], Rf = [hv.S(-0.7, -0.88), yy],
      Tn = [Rn[0] + Rh * (-0.2 * hv.cs - 0.15 * hv.sn) + sway, yy + Y.tl * len],
      Tf = [Rf[0] + Rh * (-0.98 * hv.cs + 0.15 * hv.sn) + sway * 1.1, yy + Y.tl * len + Rh * 0.1];
    const ties = () => {
      if (it.tie === false) return;
      for (const R of hv.as > 0.3 ? [Rn, Rf] : [Rn]) {
        dot(R[0], R[1], vol * 0.5 + 1.8 * olScale(), '#111');
        dot(R[0], R[1], vol * 0.5, C(it.tie || '#e46'));
      }
    };
    if (layer === 'back') {                                        // 背面(hairOver)では 'back' が最後に描かれるので、両方の房と結び目をここで描く
      hairTail(ctx, Rf, Tf, vol, col, ctx.hairOver ? 0 : -0.2, 'twinF', physLimits(it));
      if (ctx.hairOver) { hairTail(ctx, Rn, Tn, vol, col, 0, 'twinN', physLimits(it)); ties(); }
      return;
    }
    hairCap(ctx, it, col);
    if (ctx.hairOver) return;
    hairTail(ctx, Rn, Tn, vol, col, 0, 'twinN', physLimits(it));
    ties();
  },

  // ぎざぎざの長い前髪(頭を球として、額の生え際から毛束を垂らす。向きを変えても額に沿う)
  jaggedBangs(ctx, it, layer) {
    if (layer !== 'front') return;
    const { g, K, hcx, hcy, Rh } = ctx,
      hv = ctx.hv || { S: (F, R = 0) => hcx + Rh * F, cs: 1, sn: 0 },
      col = it.color || '#3a2a1a', n = it.count ?? 7, len = it.length ?? 0.7, Ur = 0.62,
      P = (U, a) => { const r = Math.sqrt(Math.max(0, 1 - U * U)) * 1.03, F = r * Math.cos(a), R = r * Math.sin(a); return { x: hv.S(F, R), y: hcy - Rh * U, z: F * hv.sn + R * hv.cs }; };
    const strands = [];
    for (let i = 0; i < n; i++) {
      const a = -1.25 + (2.5 * i) / Math.max(1, n - 1) + (it.shift ?? 0.1),
        jag = [0.15, 0.95, 0.35, 1, 0.5, 0.8, 0.25, 0.9, 0.4][(i + (it.seed | 0)) % 9],
        Ut = -0.05 - len * (0.35 + 0.65 * jag) * 0.75;
      const mid = P((Ur + Ut) / 2, a);
      if (mid.z < -0.2) continue;                                         // 頭の向こう側の毛束は描かない
      strands.push({ a, Ut, z: mid.z });
    }
    strands.sort((p, q) => p.z - q.z);                                    // 奥の毛束から描く
    const d = it.width ?? 0.2;
    for (const st of strands) {
      const r0 = P(Ur, st.a - d), r1 = P(Ur, st.a + d), m0 = P((Ur + st.Ut) / 2, st.a - d * 0.75), m1 = P((Ur + st.Ut) / 2, st.a + d * 0.85),
        tip = P(st.Ut, st.a + d * 0.35);
      g.beginPath();
      g.moveTo(r0.x, r0.y);
      g.quadraticCurveTo(m0.x, m0.y, tip.x, tip.y);
      g.quadraticCurveTo(m1.x, m1.y, r1.x, r1.y);
      g.closePath();
      g.fillStyle = K(col, st.z < 0 ? -0.15 : 0);
      g.fill();
      g.lineWidth = 1.6 * olScale('hair');
      g.strokeStyle = '#111';
      g.beginPath();                                                      // 根元(髪の中)には線を引かない
      g.moveTo(r0.x, r0.y);
      g.quadraticCurveTo(m0.x, m0.y, tip.x, tip.y);
      g.quadraticCurveTo(m1.x, m1.y, r1.x, r1.y);
      g.stroke();
      g.strokeStyle = K(col, 0.25);                                       // 毛束の光の筋
      g.lineWidth = 1;
      const q0 = P(Ur - 0.05, st.a), q1 = P((Ur + st.Ut) / 2 - 0.1, st.a + d * 0.2);
      g.beginPath(); g.moveTo(q0.x, q0.y); g.lineTo(q1.x, q1.y); g.stroke();
    }
  },

  // サイドテール(頭の片側で1つに結ぶ)。結び目が頭の手前側にあるときは頭の上('front')に、奥側にあるときは頭の後ろ('back')に描く
  sideTail(ctx, it, layer) {
    const { dot, C, hcx, hcy, Rh, Y } = ctx,
      hv = ctx.hv || { S: (F, R = 0) => hcx + Rh * F, cs: 1, sn: 0, as: 0, back: false, phi: 0 };
    const col = it.color || '#3a2a1a', len = it.length ?? 0.6, vol = it.volume ?? 7, yy = hcy + Rh * (it.y ?? -0.5),
      F = it.x ?? -0.3, Rl = (it.side ?? 1) * 0.86, z = F * hv.sn + Rl * hv.cs,                    // z = 結び目の奥行き(+ 手前 / - 奥)
      R = [hv.S(F, Rl), yy],
      out = Math.sign(R[0] - hcx) || -1,                                                     // 房は頭の外側へ少し張り出してから垂れる
      T = [R[0] + Rh * (0.3 * out - 0.5 * hv.cs), yy + Y.tl * len + Rh * 0.2];   // 側頭部から、頭の横を通って下へ垂れる
    const front = z > -0.15 && !ctx.hairOver,
      tie = () => {
        if (it.tie === false) return;
        const fl = it.flower ?? '#ffd84a', r = vol * 0.42;
        if (fl) {                                                                             // 花飾り: 5枚の花びら + 真ん中
          for (let k = 0; k < 5; k++) {
            const a = k * 1.2566 + 0.3, px = R[0] + Math.cos(a) * r * 0.95, py = R[1] + Math.sin(a) * r * 0.95;
            dot(px, py, r * 0.62 + 1.6 * olScale(), '#111');
          }
          for (let k = 0; k < 5; k++) {
            const a = k * 1.2566 + 0.3;
            dot(R[0] + Math.cos(a) * r * 0.95, R[1] + Math.sin(a) * r * 0.95, r * 0.62, C(fl));
          }
          dot(R[0], R[1], r * 0.5, C(it.tie || '#ff9a3a'));
          dot(R[0] - r * 0.15, R[1] - r * 0.15, r * 0.18, 'rgba(255,255,255,.85)');
        } else {
          dot(R[0], R[1], vol * 0.5 + 1.8 * olScale(), '#111');
          dot(R[0], R[1], vol * 0.5, C(it.tie || '#e46'));
        }
      };
    if (layer === 'back') {
      if (front) return;
      hairTail(ctx, R, T, vol, col, ctx.hairOver ? 0 : -0.15, 'sideTail', { stiff: [0.6, 0.12], collide: 'none', ...physLimits(it) });
      tie();
      return;
    }
    if (layer === 'front') return hairCap(ctx, it, col);
    if (layer !== 'overArm' || !front) return;                              // 手前側の房は、手前の腕・耳より上に描く(drawing.js の 'overArm')
    hairTail(ctx, R, T, vol, col, 0, 'sideTail', { stiff: [0.6, 0.12], collide: 'none', ...physLimits(it) });   // 腕・体には当たらない(頭だけ避ける)
    tie();
  },

  bun(ctx, it, layer) {
    if (layer !== 'front') return;
    const { g, K, C, dot, line, hcy, Rh, hv } = ctx;
    const col = it.color || '#3a2a1a', r = Rh * (it.r ?? 0.42), x = hv.S(it.x ?? -0.35, 0), y = hcy + Rh * (it.y ?? -1.0);
    hairCap(ctx, it, col);
    dot(x, y, r + 2 * olScale(), '#111');
    dot(x, y, r, K(col, 0));
    g.strokeStyle = K(col, -0.32);
    g.lineWidth = 1.3;
    g.beginPath();
    g.arc(x, y, r * 0.6, 0.3, 3.6);
    g.stroke();
    if (it.tie !== false) line([x - r * 0.75, y + r * 0.85], [x + r * 0.75, y + r * 0.85], 3, C(it.tie || '#e46'));
  },

  bangs(ctx, it, layer) {
    if (layer !== 'front' && layer !== 'farLock') return;
    if (it.style === 'seeThrough') {                                    // シースルーぱっつん(向きが付いた頭)
      const L = seeThroughLens(it);
      HAIR_TURNED.bangs(ctx, { ...it, style: 'straight', length: L.top }, layer);
      if (layer === 'front') drawSeeThroughStrands(ctx, it, L, ctx.hv);
      return;
    }
    const { g, K, hcy, Rh, tr, wv, hv } = ctx;
    const col = it.color || '#4a2c14', style = it.style || 'center',
      len = Math.max(0, Math.min(1.6, it.length ?? (style === 'straight' ? 0.5 : 0.1))),   // 1 より大きいと目にかかる長さ(シゲル)
      pUD = Math.max(-1, Math.min(1, it.partY ?? (style === 'side' ? 0.6 : 0))),
      Uc = 0.62 - 0.55 * len - (style === 'straight' ? 0 : 0.155 * pUD),
      bk = Math.max(0, Math.min(1, it.back ?? 1));
    const sb = style === 'straight' ? (it.sideburn ?? 0.6) : Math.max(0, it.sideburn ?? 1.45);
    if (style === 'center') return drawCenterBangs(ctx, it, col, pUD, len, sb, layer === 'farLock' ? 'far' : 'front');
    if (layer === 'farLock') return;
    lockTurned(ctx, it.sideburnColor || col, sb, 0);     // 側髪(頭の髪の下に先に描き、付け根の線を隠す)
    if (it.cap !== false) {
      if (bk > 0) ctx.hairBackUsed = true;
      hairPolyTurned(ctx, K(col, 0), style === 'center' ? hairBoundaryCenter(Uc, bk, it.slope ?? 1.45, it.partWidth ?? 0.12) : hairBoundary(Uc, bk));
    }
    if (style === 'side' && hv.phi > -0.4) {                     // 分け目(センター分けは参考画像に合わせて線を描かない): 頭頂へ向かう線
      const Rr = Rh + 1.5, ap = style === 'side' ? 0.55 : 0, lum = (() => {
        let h = typeof col === 'string' && col[0] === '#' ? col.slice(1) : '';
        if (h.length === 3) h = h.replace(/./g, '$&$&');
        const n = parseInt(h, 16);
        return h.length === 6 && !isNaN(n) ? (0.3 * ((n >> 16) & 255) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255)) / 255 : 0.3;
      })();
      g.strokeStyle = it.partColor || (lum < 0.4 ? K(col, 0.45) : K(col, -0.55));
      g.lineWidth = 2;
      g.lineCap = 'round';
      g.beginPath();
      for (let i = 0; i <= 8; i++) {
        const U = (Uc * 0.95 + (0.98 - Uc * 0.95) * i / 8) * Rh, rho = Math.sqrt(Math.max(0, Rr * Rr - U * U) * 0.98);
        const x = ctx.hcx + rho * Math.cos(ap + hv.phi), y = hcy - U;
        if (i) g.lineTo(x, y); else g.moveTo(x, y);
      }
      g.stroke();
    }
  },

  sideburns(ctx, it, layer) {
    if (layer !== 'front') return;
    const n = it.count ?? 1;                                      // count 本を、耳の前から後ろへずらして重ねる(後ろの束ほど短い)
    for (let i = n - 1; i >= 0; i--)
      lockTurned(ctx, it.color || '#4a2c14', (it.length ?? 0.6) * (1 - i * 0.18), 0, { F: (it.F ?? 0.05) - i * 0.25, width: it.width ?? 1, top: it.top, id: i ? 'b' + i : '' });
  },

  ahoge(ctx, it, layer) {
    if (layer !== 'front') return;
    const { g, K, hcy, Rh, tr, wv, hv } = ctx;
    const x0 = hv.S(it.x ?? 0.15, 0), y0 = hcy - Rh * 0.95, L = Rh * (it.length ?? 0.9),
      curl = Rh * (it.curl ?? 0.5), J = ctx.jiggle ? ctx.jiggle('ahoge', [x0, y0], { k: 0.12, damp: 0.12, max: 7 }) : [0, 0], sway = J[0] * 1.6;   // 頭の動きに遅れてしなる
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(x0, y0);
    g.quadraticCurveTo(x0 + curl + sway * 0.7, y0 - L * 0.6, x0 - Rh * 0.1 + sway, y0 - L);
    g.lineWidth = 4.4;
    g.strokeStyle = '#111';
    g.stroke();
    g.lineWidth = 2.4;
    g.strokeStyle = K(it.color || '#4a2c14', 0);
    g.stroke();
  }
};

// ---- 向き別の顔の装飾 ----
function drawFaceDecoTurned(ctx, list) {
  const { g, K, C, ol, line, dot, poly, hcx, hcy, Rh, hv } = ctx, cs = hv.cs, sn = hv.sn, u = hv.ap / (Math.PI / 2);
  if (hv.fv < 0.3) return;                                       // 背面では顔の装飾は見えない
  // 顔の表面(球)に貼り付いた点: 横向きの座標 (F, U[下がプラス]) → 画面
  const surf = (F, yy) => {
    const U = -yy, R = Math.sqrt(Math.max(0, 1 - F * F - U * U));
    return [hcx + Rh * (F * cs - R * sn), hcy + Rh * yy];
  };
  for (const it of asList(list)) {
    if (!it) continue;
    switch (it.type) {
      case 'beard': {
        const L = [[-0.45, 0.15], [-0.3, 1.25], [0.55, 1.2], [1.1, 0.8], [0.95, 0.3], [0.6, 0.55], [0.2, 0.4]],
          Fr = [[-0.85, 0.1], [-0.7, 1.3], [0, 1.3], [0.7, 1.3], [0.85, 0.1], [0.4, 0.55], [0, 0.42]],
          m = L.map((p, i) => [hcx + Rh * (p[0] + (Fr[i][0] - p[0]) * u), hcy + Rh * (p[1] + (Fr[i][1] - p[1]) * u)]);
        g.fillStyle = K(it.color || '#4a2c14', 0);
        g.beginPath();
        const c7 = [hcx + Rh * (-0.125 + (-0.4 + 0.125) * u), hcy + Rh * (0.275 + (0.55 - 0.275) * u)];   // 閉じる辺の中間点(正面では左右対称になる)
        g.moveTo(...m[0]);
        g.quadraticCurveTo(...m[1], ...m[2]);
        g.quadraticCurveTo(...m[3], ...m[4]);
        g.quadraticCurveTo(...m[5], ...m[6]);
        g.quadraticCurveTo(...c7, ...m[0]);
        g.closePath();
        g.fill();
        ol(2.2);
        const a = hv.X(0.5, -0.32 * sn * 0), my = hcy + Rh * 0.5, hwm = Rh * (0.235 + 0.27 * u);
        line([hv.X(0.5) - hwm * (1 - u * 0.35), my], [hv.X(0.5) + hwm * (1 + 0.0), my - 0.02 * Rh], 2, C(it.mouth || '#2a180a'));
        break;
      }
      case 'scar':
      case 'line': {
        const scar = it.type === 'scar',
          a = it.from || (scar ? [0.55, -0.6] : [0.1, 0.3]), b = it.to || (scar ? [0.8, -0.2] : [0.85, 0.3]);
        g.strokeStyle = C(it.color || (scar ? 'rgba(160,60,50,.9)' : 'rgba(220,40,30,.85)'));
        g.lineWidth = it.w ?? (scar ? 2 : 2.6);
        g.lineCap = 'round';
        // 傷(scar)は片側だけ。線(line)は顔のペイントなので左右の頬に描く(球の上の点が手前側にあるところだけ描く)
        for (const sg of scar ? [1] : [1, -1]) {
          let pen = false;
          g.beginPath();
          for (let i = 0; i <= 10; i++) {
            const t = i / 10, F = a[0] + (b[0] - a[0]) * t, yy = a[1] + (b[1] - a[1]) * t, U = -yy,
              R = sg * Math.sqrt(Math.max(0, 1 - F * F - U * U));
            if (!scar && F * sn + R * cs < -0.02) { pen = false; continue; }
            const p = [hcx + Rh * (F * cs - R * sn), hcy + Rh * yy];
            if (pen) g.lineTo(...p); else g.moveTo(...p);
            pen = true;
          }
          g.stroke();
        }
        break;
      }
      case 'blush':
        for (const s of hv.as > 0.3 ? [1, -1] : [1]) {
          g.fillStyle = C(it.color || 'rgba(255,90,170,.55)');
          g.beginPath();
          g.ellipse(hv.X(it.x ?? 0.32, s * 0.52), hcy + Rh * (it.y ?? 0.42), Rh * (it.r ?? 0.2) * (s < 0 ? hv.sf : 1), Rh * (it.r ?? 0.2), 0, 0, 7);
          g.fill();
        }
        break;
      case 'star': {
        const cx = hv.X(it.x ?? 0.62, 0.5), cy = hcy + Rh * (it.y ?? 0.37), s = Rh * (it.size ?? 1);
        poly([[0, -0.25], [0.08, -0.07], [0.26, -0.07], [0.12, 0.05], [0.18, 0.25],
              [0, 0.13], [-0.18, 0.25], [-0.12, 0.05], [-0.26, -0.07], [-0.08, -0.07]]
          .map(([x, y]) => [cx + x * s, cy + y * s]));
        g.fillStyle = C(it.color || '#f4a');
        g.fill();
        ol(1);
        break;
      }
      case 'dot':
        dot(hv.X(it.x ?? 0.62, 0), hcy + Rh * (it.y ?? -0.52), it.r ?? 2.8, C(it.color || '#c22'));
        break;
    }
  }
}

// ---- レースのヘッドドレス(headdress): 頭頂を耳から耳へ横切る布の帯 + 前の縁の白いフリル + 横の小さなリボン(メイ) ----
//   color(帯) / frill(フリル。false で無し) / bow(リボン。false で無し) / tilt(帯の前への傾き。0.35) / tails(リボンの垂れの長さ px。0 で無し)
function drawLaceHeaddress(ctx, it, layer) {
  if (layer !== (it.layer || 'front')) return;
  const { g, C, ol, line, dot, hcx, hcy, Rh } = ctx,
    hv = ctx.hv || { S: (F) => hcx + Rh * F, cs: 1, sn: 0 },
    al = it.tilt ?? 0.35, col = it.color || '#1a1420', fr2 = it.frill ?? '#ffffff', bw = it.bow ?? col,
    P = (t, a, r = 1.04) => { const u = Math.cos(t), F = u * Math.sin(a) * r, U = u * Math.cos(a) * r, R = Math.sin(t) * r; return { x: hv.S(F, R), y: hcy - Rh * U, z: F * hv.sn + R * hv.cs }; };
  const N = 18, band = [], fr = [];
  for (let i = 0; i <= N; i++) {
    const t = -1.2 + (2.4 * i) / N;                                   // 耳の少し上まで
    band.push(P(t, al));
    fr.push(P(t, al + 0.2, 1.06));
  }
  const vis = (q) => q.z > -0.08;
  // 前の縁の白いフリル(帯の少し前に、小さな丸を並べる)
  if (fr2) for (const lay of [0, 1]) for (let i = 0; i <= N; i++) {
    const q = fr[i];
    if (!vis(q)) continue;
    dot(q.x, q.y, lay ? 2.4 : 2.4 + 1.2 * olScale('headgear'), lay ? C(fr2) : '#111');
  }
  // 帯
  for (const [w, c] of [[3.4 + 2 * olScale('headgear'), '#111'], [3.4, C(col)]]) {
    g.lineCap = 'round';
    g.strokeStyle = c; g.lineWidth = w;
    g.beginPath();
    let on = false;
    for (const q of band) {
      if (!vis(q)) { on = false; continue; }
      if (!on) { g.moveTo(q.x, q.y); on = true; } else g.lineTo(q.x, q.y);
    }
    g.stroke();
  }
  // 横のリボン(見えている側の耳の上)
  if (!bw) return;
  const side = hv.cs >= 0 ? 1 : -1, b = P(side * 0.95, al - 0.8);   // 頭の横の、少し後ろ寄りの高い所
  if (!vis(b) && Math.abs(hv.cs) > 0.2) return;
  const T = it.tails ?? 14;
  if (T > 0) for (const k of [0, 1]) {                                 // リボンの垂れ(物理でなびく)
    const dx = (k ? -7 : -3) * (typeof headDirX === 'function' ? headDirX(ctx) : 1), dy = T * (k ? 1.2 : 1);   // 後ろへ垂らす(顔にかからない)
    const pts = ctx.strand ? ctx.strand('headdress' + k, [b.x, b.y], { len: Math.hypot(dx, dy), n: 4, dir: [dx, dy], stiff: [0.3, 0.02], damp: 0.07,
      flutter: 0.7, seed: k * 1.3, collide: 'none', r: 2 }) : [[b.x, b.y], [b.x + dx, b.y + dy]];
    strandRibbon(ctx, pts, 2.6, 2.2, C(bw), true);
  }
  for (const s of [-1, 1]) {
    g.fillStyle = C(bw);
    g.beginPath();
    g.ellipse(b.x + s * 4.5, b.y - 1, 5, 3.2, s * 0.35, 0, 7);
    g.fill();
    ol(1.5);
  }
  dot(b.x, b.y, 2.4 + olScale('headgear'), '#111');
  dot(b.x, b.y, 2.4, C(it.knot || '#7a1a3a'));
}

// ---- 向き別の頭の装飾 (headgear)。layer は従来どおり 'back'(髪の下) / 'front'(髪の上) ----
// ------------------------------------------------------------
// とんがり帽子(witchHat)。布の帽子らしく動く:
//   ・とんがりの上の半分は揺れ物(ctx.strand)。少し後ろへ折れて垂れ、走る・跳ぶ・振り向くと遅れてしなる(先ほどやわらかい)。
//     根元の半分は硬く、つばと一緒に動くだけ(つばから離れない)
//   ・帽子全体は頭の動きに少し遅れて傾く(ctx.jiggle)。急に止まる・着地するとぐらっと揺れて戻る
//   ・つばは跳ぶと端が下がり、落ちると端が持ち上がる。走ると後ろ側のつばが風であおられる
//   書ける項目: color / dark / band / gem(false で無し) / height(とんがりの高さ px) / bend(先の折れ具合。0 でまっすぐ 0.3) /
//               soft(先のやわらかさ 0〜1。0.5) / brim(つばの半径の足し分 px。11)
// ------------------------------------------------------------
const BRIM_MOVE = 0.35;   // つばのたわみ・風であおられる強さ(0 で動かない)
function drawWitchHat(ctx, it) {
  const { g, K, C, LG, ol, line, dot, hcx, hcy, Rh } = ctx, hv = ctx.hv;
  const c1 = it.color || '#7a5ac0', c2 = it.dark || '#3a2a6a', H = it.height ?? 38, bendA = it.bend ?? 0.3, soft = Math.max(0, Math.min(1, it.soft ?? 0.5));
  // 帽子全体の傾き: 頭の上の重さが遅れて付いてくる量から
  const jt = ctx.jiggle ? ctx.jiggle('witchHatTilt', [hcx, hcy - Rh - H * 0.6], { k: 0.12, damp: 0.22, max: 6 }) : [0, 0];
  const tilt = Math.max(-0.16, Math.min(0.16, jt[0] / (H * 1.2))),
    ct = Math.cos(tilt), st = Math.sin(tilt),
    rot = (x, y) => [hcx + (x - hcx) * ct - (y - hcy) * st, hcy + (x - hcx) * st + (y - hcy) * ct];   // 頭の中心のまわりに回す
  // つばのたわみ(上下の遅れ)と風(横の遅れ)
  const jb = ctx.jiggle ? ctx.jiggle('witchHatBrim', [hcx, hcy - Rh * 0.62], { k: 0.22, damp: 0.3, max: 3 }) : [0, 0];
  const bc = [hcx + 1, hcy - Rh * 0.62], rx = Rh + (it.brim ?? 11), ry = 5.5;
  const brimPt = (th) => {
    const cx = Math.cos(th), droop = jb[1] * BRIM_MOVE * cx * cx,                // 左右の端ほど大きくたわむ
      wind = Math.max(0, -jb[0]) * BRIM_MOVE * Math.max(0, -cx) * Math.max(0, -cx);  // 進む向きと反対(後ろ)の端があおられて上がる
    return rot(bc[0] + rx * cx, bc[1] + ry * Math.sin(th) + droop - wind);
  };
  // つば(先に描く。とんがりはその上に立つ)
  g.beginPath();
  for (let i = 0; i <= 32; i++) { const p = brimPt((i / 32) * Math.PI * 2); i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }
  g.closePath();
  g.fillStyle = K(c2, -0.1);
  g.fill();
  ol(2.5);
  // とんがり: 根元(つばの中心の少し上)から揺れ物で伸ばす
  const N = 5, root = rot(hcx - 1, hcy - Rh * 0.66), up = [-st, -ct];               // 帽子の「上」(傾いた分だけ回す)
  const dir = [up[0] - 0.14 * ct, up[1] - 0.14 * st];                              // 少し後ろへ傾けて立てる
  // 根元の半分は硬い(つばに縫い付けてあるので、つばと一緒に動くだけ)。上の半分だけが揺れ物としてしなる
  const total = H + Rh * 0.3, rigid = total * 0.45, dl = Math.hypot(dir[0], dir[1]) || 1, ud = [dir[0] / dl, dir[1] / dl];
  const mid = [root[0] + ud[0] * rigid * 0.5, root[1] + ud[1] * rigid * 0.5], top = [root[0] + ud[0] * rigid, root[1] + ud[1] * rigid];
  let soft3;
  if (ctx.strand) {
    soft3 = ctx.strand('witchHatTip', top, { len: total - rigid, n: N - 2, dir, curve: -bendA * 0.7, stiff: [0.6, 0.3 - 0.24 * soft], damp: 0.1, grav: 0.35 + 0.5 * soft,
      collide: 'none', maxRoot: 0.12 + 0.2 * soft, maxBend: 0.3 + 0.3 * soft, reach: 0.42, rootFlex: 0, bend: 0.2 });
  } else {                                                                           // 揺れ物が使えない所(念のため): 止まった形
    soft3 = [top];
    let a = Math.atan2(dir[1], dir[0]);
    for (let i = 0; i < N - 2; i++) { a += -bendA * 0.7; const q = soft3[i], l = (total - rigid) / (N - 2); soft3.push([q[0] + Math.cos(a) * l, q[1] + Math.sin(a) * l]); }
  }
  const pts = [root, mid, ...soft3];
  const bw = Rh * 0.9, wAt = (i) => Math.max(0.8, bw * (1 - i / N) * (1 + 0.15 * (i / N))),  // 円すい(根元から先へまっすぐ細くなる。根元が細くくびれない)
    Lp = [], Rp = [];
  for (let i = 0; i <= N; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1,
      nx = -dy / d, ny = dx / d, w = wAt(i);
    Lp.push([pts[i][0] + nx * w, pts[i][1] + ny * w]);
    Rp.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
  }
  // 根元は つばに沿ってまっすぐ(つばの楕円の上にのる)
  Lp[0] = rot(hcx - bw, hcy - Rh * 0.62); Rp[0] = rot(hcx + bw, hcy - Rh * 0.62);
  const conePath = () => {
    g.beginPath();
    // 根元〜1つ目の節はまっすぐ(円すいの裾)。その先は曲がりに沿ってなめらかに
    g.moveTo(Lp[0][0], Lp[0][1]);
    g.lineTo(Lp[1][0], Lp[1][1]);
    for (let i = 2; i < N; i++) { const m = [(Lp[i][0] + Lp[i + 1][0]) / 2, (Lp[i][1] + Lp[i + 1][1]) / 2]; g.quadraticCurveTo(Lp[i][0], Lp[i][1], m[0], m[1]); }
    g.lineTo(pts[N][0], pts[N][1]);
    for (let i = N - 1; i >= 2; i--) { const m = [(Rp[i][0] + Rp[i - 1][0]) / 2, (Rp[i][1] + Rp[i - 1][1]) / 2]; g.quadraticCurveTo(Rp[i][0], Rp[i][1], m[0], m[1]); }
    g.lineTo(Rp[1][0], Rp[1][1]);
    g.lineTo(Rp[0][0], Rp[0][1]);
    g.closePath();
  };
  conePath();
  g.fillStyle = LG(Lp[0][0], Lp[0][1], Rp[0][0], Rp[0][1], K(c1, 0.12), K(c1, 0), K(c2, 0));
  g.fill();
  ol(2.5);
  // 折れ目のしわ(先が大きく曲がっているほど濃い)
  for (let i = 2; i < N; i++) {
    const ax = pts[i][0] - pts[i - 1][0], ay = pts[i][1] - pts[i - 1][1], bx = pts[i + 1][0] - pts[i][0], by = pts[i + 1][1] - pts[i][1],
      turn = Math.abs(Math.atan2(ax * by - ay * bx, ax * bx + ay * by));
    if (turn < 0.15) continue;
    g.save(); conePath(); g.clip();
    line(Lp[i], [(Lp[i][0] + Rp[i][0]) / 2, (Lp[i][1] + Rp[i][1]) / 2 + 1], 1.4, `rgba(0,0,0,${Math.min(0.45, turn * 0.6).toFixed(2)})`);
    g.restore();
  }
  // 帯と宝石(根元の少し上)
  const t = 0.42, bl = [Lp[0][0] + (Lp[1][0] - Lp[0][0]) * t, Lp[0][1] + (Lp[1][1] - Lp[0][1]) * t], br = [Rp[0][0] + (Rp[1][0] - Rp[0][0]) * t, Rp[0][1] + (Rp[1][1] - Rp[0][1]) * t];
  const b0 = [(Lp[0][0] + bl[0]) / 2, (Lp[0][1] + bl[1]) / 2 + 1], b1 = [(Rp[0][0] + br[0]) / 2, (Rp[0][1] + br[1]) / 2 + 1];
  line(b0, b1, 3.6 + 2.4 * olScale(), '#111');
  line(b0, b1, 3.6, C(it.band || '#fc3'));
  if (it.gem !== false && (!hv || hv.phi == null || hv.phi > -0.4)) {
    const fx = hv && hv.turned ? 0.5 + 0.35 * (hv.cs ?? 1) : 0.6;                    // 顔の向きに合わせて、宝石は帽子の前側へ
    dot(b0[0] + (b1[0] - b0[0]) * fx, b0[1] + (b1[1] - b0[1]) * fx, 2.6, C(it.gem || '#6df'));
  }
}

function drawHeadgearTurned(ctx, it, layer) {
  const { g, K, C, LG, ol, line, dot, poly, hcx, hcy, Rh, wv, tr, hv } = ctx, cs = hv.cs, sn = hv.sn;
  switch (it.type) {
    case 'headband': {                                          // 帯は頭を一周するので、どの向きでも頭を横切る線になる
      const y = hcy + Rh * (it.y ?? -0.45), w = it.w ?? 4.2, c = it.color || '#fff', span = it.span ?? 1,
        a = [hv.S(-span, 0), y], tails = it.tails ?? 0;
      if (layer !== (it.layer || 'front')) return;
      line([hcx - Rh * span, y], [hcx + Rh * span, y], it.edge ?? w + 2.3 * olScale(), '#111');
      line([hcx - Rh * span, y], [hcx + Rh * span, y], w, C(c));
      behindHead(ctx, () => {                                     // 結び目は後頭部。横〜正面では頭(と胴体)からはみ出たなびきだけ / 背面では全部見える
        headbandTails(ctx, it, a);
      });
      break;
    }
    case 'horn': {
      if (layer !== (it.layer || 'front')) return;
      const near = (it.layer || 'front') !== 'back', R = near ? 0.35 : -0.35,
        side = (it.side ?? 1) * cs + (near ? -1 : 1) * sn;
      ctx.horn(hv.S(it.x ?? -0.1, R), hcy + Rh * (it.y ?? -0.8), side, it.color);
      break;
    }
    case 'goggles': {
      if (layer !== (it.layer || 'front')) return;
      const y = hcy + Rh * (it.y ?? -0.62), ly = y - Rh * 0.15, r = Rh * 0.3;
      line([hcx - Rh, y], [hcx + Rh * 0.9, y], 3 + 2.5 * olScale(), '#111');
      line([hcx - Rh, y], [hcx + Rh * 0.9, y], 3, C(it.strap || '#6a4a24'));
      for (const s of hv.as > 0.3 ? [-1, 1] : [1]) {
        if (s < 0 && hv.back) continue;
        const vis = hv.back ? Math.max(0, Math.min(1, (0.28 * sn + 0.45 * cs) / 0.3)) : 1;   // 背面ではレンズが隠れる
        if (vis < 0.1) continue;
        const lx = hv.S(0.28, 0.45 * s), rr = r * (0.4 + 0.6 * vis) * (s < 0 ? 0.55 + 0.45 * hv.sf : 1);
        dot(lx, ly, rr + 0.4 + 1.8 * olScale(), '#111');
        dot(lx, ly, rr + 0.4, C(it.frame || '#c93'));
        dot(lx, ly, rr - 1.6, C(it.lens || '#8cf'));
        dot(lx + rr * 0.3, ly - rr * 0.3, rr * 0.25, C('rgba(255,255,255,.8)'));
      }
      break;
    }
    case 'ribbon': {
      if (layer !== 'front') return;
      const c = C(it.color || '#e46'), bx = hv.S(-0.72, 0), by = hcy - Rh * 0.6;
      behindHead(ctx, () => {
        [[-9, 15], [-3, 18]].forEach(([dx, dy], k) => {             // リボンの垂れ(物理でなびく)
          const pts = ctx.strand ? ctx.strand('ribbon' + k, [bx, by], { len: Math.hypot(dx, dy), n: 4, dir: [dx * headDirX(ctx), dy], stiff: [0.3, 0.02], damp: 0.07,
            flutter: 0.8, seed: k * 1.7, collide: 'back', r: 2, head: true, anchor: [hcx, hcy], ...physLimits(it) }) : [[bx, by], [bx + dx, by + dy]];
          strandRibbon(ctx, pts, 3, 2.6, c, true);
        });
        for (const s of [-1, 1]) {
          g.fillStyle = c;
          g.beginPath();
          g.ellipse(bx - 8, by + s * 5.5, 9, 5, s * 0.5, 0, 7);
          g.fill();
          ol(1.8);
        }
      });
      break;
    }
    case 'headdress': drawLaceHeaddress(ctx, it, layer); break;   // レースのヘッドドレス
    case 'witchHat': {
      if (layer !== (it.layer || 'front')) return;
      drawWitchHat(ctx, it);                                         // 揺れ物で動くとんがり帽子
      break;
    }
    default: {
      // halo / crown などは頭の真上に乗る物で、向きで見た目が変わらない → 従来の描画
      const fake = { ...ctx, hv: { ...hv, turned: false } };
      drawHeadgear(fake, [it], layer);
    }
  }
}