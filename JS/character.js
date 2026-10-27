// ============================================================
//  characters.js  ―  キャラクターのデータ(ここを編集すれば性能・見た目・技が変わります)
// ============================================================
// 【フレーム単位】 startup=発生(出る前の隙) active=持続(当たり判定がある間)
//   recovery=後隙(出したあとの硬直) hitstun=相手の食らい硬直 ※1F=1/60秒
//   damage=威力 knockX/knockY=吹っ飛び(Yがマイナスで上方向)
//   guardHitStop=ガード時に両者が止まるF(省略時 HIT_STOP.guard)
//   hitStop=当たった時に両者が止まるF(省略時は HIT_STOP の式でダメージから決まる)
//   launch={x,y}=技開始時に加える移動速度(px/F)。省略した軸は変更しない
//   hits=当たる回数(多段技。省略時 1)。damage・hitstun・knockX/knockY・hitStop は「1回ごと」の値
//   hitInterval=多段技の、当たってから次に当たれるまでのF(省略時 active ÷ hits)。active の間に全部当たるようにする
//     例) hits: 6, active: 36 → 6Fごとに最大6回当たる。多段技は hitStop を小さく(3〜5)すると、止まりが長くなりすぎない
//   effect=技のエフェクト。部品を組み合わせて自由に作れる(書き方は setting.js の「技のエフェクト」)
//     effect: 3 (色の番号・従来の見た目) / effect: 'fire' (プリセット名。effect.js の EFFECT_PRESETS) /
//     effect: { preset: 'fire', color: '#4cf' } / effect: { start: [...], attack: [...], hit: [...] }
//     以前の { color, size, duration, particles, particleLife, shapes } もそのまま使える
//   box={x,y,w,h}=当たり判定(x:前方向の開始位置 y:足元からの高さ(マイナスが上) w,h:大きさ)
//   spike=叩きつけ。当たった相手が地面に落ちたとき、この速さで1回バウンドする(true で 6)。knockY をプラス(下向き)にして使う
//   bounce={x,y}=当たる(ガードされる)と、技を出した自分がこの速さで跳ね返る(x は前がプラス。シノの空中二段蹴り)
//   float=空中で技の出始め〜持続の間、落ちる速さをこの値以下にする(0 でその場に止まる / 1.5 でゆっくり落ちる。ツキハの空中技)
//   projectile={...}=通常技(n や ad など)にも書ける。発生の瞬間に弾を撃つ(シノの散り苦無・ツキハの闇の雫)。書き方は下の【projectile】
//   drain=吸血。与えたダメージ × drain だけ自分の体力が戻る(0.3 で 30%) / bloodCost=血の代償。技を出すと自分の体力がこれだけ減る(1 より下にはならない)
//   low=下段かどうか(true / false)。下段はしゃがみ受け流しができない。省略時は自動(地上の技で、判定が足元だけにあると下段。
//     くわしくは game_spec.js の 10-1章 / script.js の LOW_ATTACK)
// 【look.smooth】 atk=攻撃時 move=通常時 の動きの追従速度(0〜1)。省略可(既定 0.55 / 0.3)
// 【zones】 部位ごとの効果を上書き(head/torso/arms/feet)。旧 legs 指定も feet に適用されます
// 【hitPoses】部位ごとの被弾姿勢を上書き(head/torso/arms/feet)。各値は poses と同じ並び(下の【姿勢配列】)
// 【throw】 投げ(Gキー)。押した時の方向入力(前/後/上/下。なしは前)で投げ分け。box=掴み判定の範囲(キャラごとに変更可)
//   reach=つかみに行く姿勢。方向ごと(f / b / u / d)に、コマンド投げと同じ項目を書ける:
//     motion: { hold, rel, held }(持ち上げ・投げる瞬間・つかまれた相手の姿勢) effect(attack=つかんだ瞬間 / hit=多段・投げた瞬間)
//     release / total(その方向だけの投げるまで・全体のF) leap(跳ぶ高さ) swing(ふり回す回数) hold: { x, y }(相手を持つ位置)
//     hits: [{ at, damage, drain }](つかんでいる間の打撃) spike(叩きつけ) drain(吸血) stop(投げた瞬間の止まり)
// 【projectile】 飛び道具。speed=速さ damage=威力 radius=当たり判定の半径 life=消えるまでのF count=発射数 spread=ばらけ方
//   knockX / knockY / hitstun … 当たったときの吹き飛び・硬直(省略時 4 / -4 / 22)
//   look … 見た目(projectile.js の PROJECTILE_LOOKS の名前)。{ preset: 'darkOrb', color: '#4cf', size: 1.2 } で一部だけ変えられる
//   path … 軌道(PROJECTILE_PATHS の名前: straight / wave / arc / ground / accel / stop / homing / boomerang)
//          { type: 'arc', up: 9, angle: -10 } で数値も変えられる。from: { x: 40, y: -70 } = 弾の出る場所
//   技の側に projectile: { path: 'arc' } のように書くと、その技だけ弾の設定を上書きできる(s / コマンド技)
// 【voltage】 ボルテージ(ためて使うゲージ。書いたキャラだけ持つ。HUD のシールドの横に黄色いゲージが出る)
//   voltage: { max: 100, perDamage: 1.6, guard: 3, hurt: 0.6, decay: 0, color: '#ffe14a' }
//     当てた(ダメージ×perDamage) / ガードされた(guard) / 攻撃を受けた(ダメージ×hurt) でたまり、decay(1Fごと)で減る
//   技に voltage: { need: 50, use: 50, name: '強化版の名前', damage: 19, ... } を書くと、ゲージが need 以上のとき
//     use だけ使って強化版が出る(書いた項目だけ上書き。effect / box / hits / launch なども書ける)
// 【ジャンプ】 stats.jumpStartup=ジャンプ前隙(F) landLag=通常ジャンプの着地隙(F) airLandLag=空中技の既定の着地隙(F)
//   空中技ごとの着地隙は moves の an/af/au/ad にある landLag で変更(他の技にも landLag を足せばその技に着地隙がつく)
// 【poses】キャラごとの基本姿勢(待機・歩き・ガード・しゃがみ・ダッシュ・ジャンプ)。省略した項目は共通の既定値
// 【姿勢配列】 poses / hitPoses / MOTIONS・motions の w・s / THROW_MOTIONS はすべて同じ並び(角度は rad。0=真下 / 正=前方向)
//   [ lean, 右肩, 右肘, 右手首, 左肩, 左肘, 左手首, 右腿, 右膝, 左腿, 左膝, 前後ずれ,      ← ここまで12個(必須)
//     武器X, 武器Y, 武器角度, 頭の向き, 胴の向き, 右上腕, 右前腕, 左上腕, 左前腕, 右足, 左足 ]  ← 省略可
//   右 = 手前側の腕・脚 / 左 = 奥側。手首 = こぶし(と持っている武器)の向き。0 = 前腕と同じ向き / 正 = 前(親指の側)へ曲げる
//   武器X/Y = 武器の位置(px、Xは前方向・Yは下がプラス) / 武器角度 = 持ち方からの差分(rad)
// 【motions】技スロット(n,f,u...)ごとの専用モーション。書くと moves の motion 名より優先
// 【SP ゲージ】 全キャラ共通のゲージ(HP の下の細いゲージ)。ためてゲージ技・超必殺技を出す
//   sp: { max: 100, time: 0.012, hit: 0.6, combo: 1, hurt: 0.35, guard: 0.8, guardAtk: 0.5, jg: 6, parry: 4, pj: 0.6, color: '#4cf' }
//     max=最大値 / time=1F ごとに増える量 / hit=当てたダメージ1あたり(4ヒット目からは半分) / combo=2ヒット目から1ヒットごとに足す量 /
//     hurt=受けたダメージ1あたり / guard=ガードしたとき / guardAtk=ガードされたとき(攻撃側) / jg=ジャストガード / parry=受け流し /
//     pj=飛び道具で当てたときの倍率 / color=ゲージの色。書かなかった項目は script.js の SP_DEFAULT
//   moves.gx … ゲージ技(Z と A を同時押し。2F までのずれは同時。技の出始め 3F 以内にもう片方を押しても切り替わる)
//   moves.sx … 超必殺技(↓ を押しながら Z と A)。super: true で暗転・カットイン(SUPER_FREEZE F 両者が止まる)
//     cost: 25        … 使う SP ゲージの量(足りないときは普通の技が出る)
//     invincible: 12  … 出始めから何F 無敵か(打撃・飛び道具・投げが当たらない)
//     armor: 2        … 出始め〜持続の間、この回数まで攻撃を受けてものけぞらない(ダメージは半分受ける)
//     minScale: 0.75  … コンボ補正の下限(ふつうは 0.5。超必殺技はコンボの最後でも威力が落ちにくい)
//     volt: 50        … 出した瞬間にボルテージを足す(voltage を持つキャラ)
//     rank は省略時 gx=7 / sx=8(ほとんどの技からキャンセルでつながる)。ほかの項目は普通の技と同じ
//   ※ ゲージ技・超必殺技そのものが当たっても SP ゲージは増えない
// 【ko】 K.O. されたときのアニメーション(キャラごと。省略時は KO_DEFAULT = 吹っ飛んであお向け)
//   type: 'fly'      … 吹っ飛んで倒れる。vx / vy=飛ばされる速さ(px/F。vy はマイナスで上) gravity=重力の倍率(小さいとふわっと落ちる)
//                      spin=空中で体ごと回る角度(rad。マイナスで後ろ回り。-6.28 で1回転) spinTime=回り終わるF(省略時は空中にいる時間)
//                      bounce=地面ではねる回数 slide=倒れたあとすべるときの減り方(1に近いほど長くすべる) air=空中の姿勢
//   type: 'collapse' … その場で崩れ落ちる。keys=[[F数, 姿勢], ...] を順に再生して最後に lie の姿勢になる。drift=後ろへずれる速さ
//   共通: lie='back'(あお向け) / 'front'(うつぶせ) = 倒れた姿勢  thud=倒れたときの土煙の量  dust=土煙の色
//   姿勢は script.js の KO_POSES の名前(blown / tuck / float / stagger / stagger2 / kneel / kneelLow / fallBack / fallFront / back / front)か、
//   【姿勢配列】と同じ並びの配列で自作できる
// 【水まとい(aqua)】 aqua: { max: 100, decay: 0.06, delay: 18, color } … ゲージ技の veil: 100 で AQUA ゲージがたまり、まわりに水が浮く(ルリ)
//   ゲージがある間、技が当たる(ガードされる)と delay F 後に、浮いた水がその技の follow の設定で自動で追撃し、ゲージを follow.cost だけ使う
//   follow: { kind: 'shot' | 'burst' | 'geyser' | 'rain' | 'wave', cost: 10, damage, knockX, knockY, hitstun, speed, radius, count, spread, look, path }
//   書かない項目は projectile.js の AQUA_KINDS の値。follow: null で追撃しない。follow を書かない技は AQUA_KINDS.default
// 【solo】 パペット(メイ＆ロロのロロ)を持つキャラの技に solo: { ... } を書くと、ロロがクラッシュしているあいだは代わりにこちらが出る(本体だけで戦う技)
//   書き方はふつうの技と同じ(書かない項目は元の技の値。puppet は使わない)。motionFrom: 'n' のように書くと、そのスロットのモーションを使う
//   s の solo は飛び道具(projectile)を撃つ技にする(s は弾を撃つ決まり)
// 【コマンド投げ】 コマンド技に grab: { ... } を書くと、打撃ではなく「つかんで投げる技」になる(ガードできない。空中の相手・無敵の相手はつかめない)
//   技の側: startup(つかみが出るまで) active(つかめる時間) recovery(空振りの隙) damage knockX knockY hitstun(投げたときの威力・飛ばし方・硬直)
//           spike(叩きつけ) drain(吸血) hitStop(投げた瞬間の止まり) effect(start=出始め / attack=つかんだ瞬間 / hit=しめつけ・投げた瞬間)
//   grab の中: dir('f' 前 / 'b' 後ろへ振り捨てる / 'u' 真上へ / 'd' 前の地面へたたきつける) box(つかむ範囲) release(つかんでから投げるまでのF) total(全体のF)
//              lunge(つかむ瞬間に前へ踏み込む px) leap(つかんでから高く跳ぶ高さ px。投げる瞬間に着地) swing(相手をふり回す回数)
//              hold: { x, y }(持ち上げた相手の位置) hits: [{ at, damage, drain }](つかんでいる間の打撃) color(つかんだときの文字・輪の色)
//              motion: { reach(つかみに行く) hold(持ち上げ) rel(投げる瞬間) held(つかまれた相手) }(姿勢配列。書かない物はふつうの投げの姿勢)
// 【counter】 カウンター。技に counter: { 技の項目 } を書くと、その技の持続の間に打撃を受けたとき、ダメージを受けずに counter の技が出る(ルリの逆流)
//   飛び道具を受けたときは跳ね返す(ジャストガードと同じ)。counter の技の見た目は motions の「技の名前_ctr」(例: c2_ctr)。invincible で無敵を付けられる
// 【新しい5人のしくみ】(処理は elements.js、説明は game_spec.js の 15-2章)
//   技: chill=相手を冷やす(100 で凍る) shatter=凍った相手に大ダメージ heat=熱がたまる vent=熱を0に luck: 'suit'(弾)=カードの絵柄が ♠♥♦♣ の順番で効果が変わる suitPick=次の絵柄で variants を選ぶ
//       warp='behind'/'swap'=瞬間移動・位置の入れかえ heal=体力回復 bloom=自分の芽を開花 variants=[{...}]=出すたびにどれか1つ
//   キャラ: stats.airDash=空中ダッシュの回数 stats.photosynthesis={ delay, rate }=立ち止まると回復 heat={ max, decay, lock, color }
//   弾: hits / hitEvery=何回も当たる chill / luck。軌道 path: 'seed'(落ちると芽の罠) / 'rise'(止まって浮き上がる竜巻)
// 【rage】 狂化。rage: { hp: 0.35, dmg: 1.15 } = 体力が35%以下になると与えるダメージ ×1.15、体から血の霧が立ちのぼる(バーサク)
// 【crouchParry】 しゃがみ受け流しの性能をキャラごとに上書き(省略可)
// 【poses】 jumpSquat=ジャンプ前隙 / landing=着地隙 / crouch=しゃがみ(受け流し中も) は別々のモーション
// 【motion】 MOTIONS の名前 か、{w:[...],s:[...]} を直接書いて自作できます
// 【技スロット】 n=通常 f=前+Z b=後ろ+Z u=上+Z d=下+Z da=ダッシュ中 an/af/au/ad=空中(通常/前/上/下)
//   s=必殺(A) sf=→+A sb=後ろ+A su=↑+A sd=↓+A(下必殺)   (b / sb / sd は省略可。無いキャラは 通常Z / 必殺A が出る)
// 【コマンド技】 moves に好きな名前(c1 など。n や s など上の技スロットの名前以外)で技を足し、command に入力を書く
//   command: '↓↘→+A'   … 方向(矢印 ↓↘→↗↑↖←↙ か テンキーの数字 1〜9)のあとにボタン(Z か A)。+ は省略可
//       → は「前(相手の方)」、← は「後ろ」(左向きのときは自動で入れ替わる)。'236A' と '↓↘→+A' は同じ
//       同じ方向を続けて書くと(↓↓)、その間で一度離す必要がある
//   commandWindow: 18  … 最初の方向からボタンまでの受付F(省略時 18。ヒットストップ中は数えない)
//   air: false         … false=地上だけ(省略時) / true=空中だけ / 'both'=どちらでも
//   ground: { ... }    … air:'both' の技を地上で出したときだけ使う値(省略可)。startup / launch / landLag / box など、
//                        書いた項目だけ上書きする(例: ground: { startup: 8, launch: { x: 9, y: -5 } } = 地上版は遅く低く跳ぶ)
//   rank: 3            … キャンセルの順番(ランク)。n=0 / d・an=1 / f・u・au・af・ad・da=2 / s=4 / sf・sb・sd=5 / su=6。省略時 3
//                        (今の技よりランクが高い技にだけキャンセルできる)
//   projectile: true   … 発生の瞬間に飛び道具(このキャラの projectile)を撃つ。box は書かなくてよい
//                        projectile: { look: 'ice', path: 'arc' } のように書くと、この技だけ弾の見た目・軌道・性能を変えられる
//   ほかの項目(startup / damage / box / launch / landLag / turn など)は普通の技と同じ。motions にも同じ名前で書ける
//   ※ コマンドが成立していると、同じボタンの普通の技よりコマンド技が優先される(長いコマンドほど優先)
// 【向き】 X軸の向き。頭 と 体の7部位(胴・右上腕・右前腕・左上腕・左前腕・右足・左足)がそれぞれ向きを持つ。
//   0=真横  1=少し正面向き  2=まあまあ正面向き  3=正面向き   -1=少し背面  -2=まあまあ背面  -3=背面   (小数も可=回っている途中)
//   何も書かないと 頭=0(真横) / 体=1(少し正面向き) = 従来の見た目。向きごとの絵は drawing.js が CHARACTER_DRAWS の設定から描く。
//   body は「体全体」= 胴の向き + 個別に指定していない部位の向き。右 = 手前側(姿勢配列の右肩・右肘・右腿・右膝) / 左 = 奥側。
//   ・キャラの基本の向き: look: { dir: { head: 0, body: 1, rArm: 0, ... } }   (部位の名前は下の turn と同じ)
//   ・姿勢配列の 16番目=頭 / 17番目=胴(body) / 18〜23番目=右上腕,右前腕,左上腕,左前腕,右足,左足 (poses / motions の w・s / hitPoses など)
//       省略した部位は胴の向きに従う。例) s: [..12要素.., 0, 0, 0,  2, 3,  0, 0]  ← 武器3要素(13〜15番目)のあと 頭=2, 胴=3, 右上腕=0, 右前腕=0
//       打ち出しの姿勢 s に書けば「振りかぶりは横向き→打ち出しで正面向き」のように、動作の途中で滑らかに切り替わる
//   ・技のタイムライン: moves.xx に turn: [{ at: 0 | 'startup' | 'active' | 'recovery' | 発生からのF数, head: -3〜3, body: -3〜3, ... }, ...]
//       書いた項目だけが変わり、次の指定が来るまで保たれる。指定できる項目:
//         head=頭  body=体全体(胴+全部位)  torso=胴だけ  arms / rArm / lArm=両腕・右腕・左腕  legs / rLeg / lLeg=両足・右足・左足
//         rUpperArm / rForeArm / lUpperArm / lForeArm=各腕の部位
//       同じ項目の中では body が先に効き、そのあと部位の指定が上書きする。
//       例) turn: [{ at: 0, body: 2 }, { at: 'active', head: 3, torso: 3, rArm: 0 }, { at: 'recovery', body: 1, head: 0 }]
//   ・投げ: throw.turn は at に 数値F / 'grab'(掴む瞬間) / 'release'(投げる瞬間) を書ける
//   ・ゲーム中に変える: setFighterDir(p, 頭, 体, 保つF数, { rArm: 0, legs: 1 })  (null を渡した項目は変えない)
//   ・腕・脚の角度は画面上の角度のまま(攻撃の見た目・当たり判定は向きで変わらない)。向きで変わるのは
//       頭=顔・髪・装飾 / 胴=幅・服 / 腕=肩の位置(上腕)・肘の横ずれ(前腕の向きが上腕と違うとき) / 足=付け根の位置・靴の向き
// ============================================================

// エフェクトの色(技の effect に番号で指定)
const EFFECT_COLORS = ["#fff", "#fb3", "#7df", "#c6f", "#ff4", "#fd6", "#6f9", "#f6c"];

// 当たり部位の効果(頭・胴・腕・脚)。胴体と腕は同じ、脚は低ダメージ・長硬直
//  dmg=ダメージ倍率 stun=食らい硬直倍率 knock=吹っ飛び倍率 stop=ヒットストップ追加F
//  pop=脚などで浮かせる速さ(マイナスで上へ) label=ヒット時の表示文字 color=演出色
// ZONE_RANGE: 身長を 足元0〜頭頂1 としたときの境目(head以上=頭 / legs以下=脚 / 間=胴)
const HIT_ZONES = {
  head: { label: 'HEAD!', dmg: 1.5, stun: 1, knock: 1.15, stop: 6, pop: 0, color: '#f55' },
  torso: { label: '', dmg: 1, stun: 1, knock: 1, stop: 0, pop: 0, color: '#fff' },
  arms: { label: '', dmg: 1, stun: 1, knock: 1, stop: 0, pop: 0, color: '#fff' },
  feet: { label: 'FEET', dmg: 0.6, stun: 1.3, knock: 0.9, stop: 0, pop: -4, color: '#6cf' },
  legs: { label: 'FEET', dmg: 0.6, stun: 1.3, knock: 0.9, stop: 0, pop: -4, color: '#6cf' },
};
const ZONE_RANGE = { head: 0.78, legs: 0.38 };

// ヒットストップ(当たった瞬間に両者が止まるF数)。大きいほど「重い手応え」になる
//  当たり   = min(hitMax, hitBase + ダメージ × hitPerDamage) + 部位の stop   (技ごとに moves の hitStop で上書き可)
//  ガード   = 技の guardHitStop(省略時 guard)。当たりより短くして、止まりの長さで「当たった/ガードされた」が分かるようにする
//  投げ     = min(throwMax, throwBase + ダメージ × throwPerDamage) / 掴んだ瞬間 = grab
//  ジャストガード = justGuard / しゃがみ受け流し = CROUCH_PARRY の stop
//  ※ ヒットストップ中に押した Z / A / ジャンプ / 投げ は覚えておき、止まりが解けた瞬間に出る(先行入力)
const HIT_STOP = { hitBase: 9, hitPerDamage: 0.6, hitMax: 22, guard: 4, throwBase: 12, throwPerDamage: 0.7, throwMax: 24, grab: 9, justGuard: 20 };

// 投げ同士がぶつかったとき(お互いの掴みが同時に出た): 両者とも後ろへ弾かれて、同じだけ動けない(仕切り直し)
//  push=弾かれる速さ(px/F)  stun=動けないF  stop=ヒットストップF  window=何F差までを「同時」とみなすか
//  ※ 相手の投げの掴みが出る前(window より早い)に自分の掴みが出れば、普通に掴める(先に出した投げが勝つ)
const THROW_CLASH = { push: 8, stun: 14, stop: 8, window: 2 };

// しゃがみ受け流し: しゃがんでいる間に攻撃を受けると発動(倍率。小さいほど軽減。stop=ヒットストップF)
//  硬直中もしゃがみ姿勢のまま。浮かされません。受け流された側は、その技からキャンセルできません。
//  lag=受け流された側の後隙が伸びるF数(空中技なら着地隙が伸びる)
//  キャラごとに crouchParry: { dmg: 0.2 } のように上書き可(lag は「受け流した側」のキャラの値を使う)
const CROUCH_PARRY = { label: '受け流し', dmg: 0.3, stun: 0.4, knock: 0.25, stop: 5, lag: 12, color: '#6fd' };

// 投げのモーション  (前/後/上/下 それぞれ hold=持ち上げ rel=投げる瞬間 held=掴まれている側のポーズ)
//  reach=掴みに行く腕。キャラごとに throw.motion = { f: {hold,rel,held}, ... } で上書き可
const THROW_MOTIONS = {
  reach: [0.35, 1.5, 0.2, 0, 1.4, 0.2, 0, 0.8, -0.4, -0.5, 0.3, 10],
  f: { hold: [-0.25, 2.9, 0.2, 0, 2.9, 0.2, 0, 0.5, -0.4, -0.4, 0.4, 0], rel: [0.55, 1.2, 0.1, 0, 1.2, 0.1, 0, 0.8, -0.3, -0.7, 0.4, 14], held: [-1.45, 2.4, 0.3, 0, 2.2, 0.4, 0, 0.3, -0.2, -0.1, 0.2, 0] },
  b: { hold: [-0.1, 1.6, 1.4, 0, 1.4, 1.4, 0, 0.5, -0.4, -0.4, 0.4, -4], rel: [-0.5, 2.6, 0.3, 0, 2.6, 0.3, 0, 0.4, -0.4, -0.4, 0.4, -12], held: [-1.1, 2.4, 0.3, 0, 2.2, 0.4, 0, 0.3, -0.2, -0.1, 0.2, 0] },
  u: { hold: [0.15, 1, 1, 0, 1, 1, 0, 0.9, -1.3, -0.8, 1.2, 0], rel: [-0.35, 3, 0.1, 0, 3, 0.1, 0, 0.3, -0.2, -0.2, 0.2, 2], held: [-0.6, 2.4, 0.3, 0, 2.2, 0.4, 0, 0.3, -0.2, -0.1, 0.2, 0] },
  d: { hold: [-0.3, 3, 0.2, 0, 3, 0.2, 0, 0.4, -0.4, -0.4, 0.4, 0], rel: [0.8, 0.3, 0.3, 0, 0.3, 0.3, 0, 1, -1.3, -0.8, 1.2, 10], held: [3, 0.2, 0.2, 0, 0.2, 0.2, 0, 3.1, 0.1, 3.1, -0.1, 0] },
};
// 掴んでいる間、掴まれた相手が来る位置(攻撃側の前方向x / 足元からの高さy)
const THROW_HOLD = { f: { x: 14, y: 75 }, b: { x: -12, y: 55 }, u: { x: 22, y: 45 }, d: { x: 6, y: 100 } };

// モーション定義  [lean,右肩,右肘,右手首,左肩,左肘,左手首,右腿,右膝,左腿,左膝,前後ずれ,武器X,武器Y,武器角度](上の【姿勢配列】)
//  w=振りかぶり s=打ち出し (角度はラジアン。0=真下、正=前方向)
//  手首は 0=前腕と同じ向き / 正=前へ曲げる。武器X/Yは手からの位置(px、Xは前方向)、武器角度は持ち方からの差分(rad)。省略時は0
const MOTIONS = {
  jab: { w: [-0.1, -0.3, 2.1, 0, 0.5, 1.9, 0, 0.4, -0.5, -0.3, 0.4, -6], s: [0.2, 1.55, 0.05, 0, 0.3, 1.9, 0, 0.5, -0.5, -0.4, 0.4, 14] },
  cross: { w: [-0.35, 0.5, 1.9, 0, -0.6, 2.3, 0, 0.55, -0.5, -0.5, 0.5, -8], s: [0.55, 0.4, 1.9, 0, 1.55, 0.05, 0, 0.8, -0.4, -0.8, 0.3, 24] },
  hook: { w: [-0.3, -0.8, 0.6, 0, 0.5, 1.9, 0, 0.5, -0.5, -0.3, 0.4, -8], s: [0.4, 2, 1.1, 0, 0.4, 1.9, 0, 0.7, -0.5, -0.5, 0.4, 16] },
  uppercut: { w: [-0.1, 0.2, 1.5, 0, 0.3, 1.5, 0, 0.5, -0.9, -0.3, 0.9, 0], s: [-0.15, 2.9, 0.1, 0, 0.5, 1.7, 0, 0.2, -0.2, -0.2, 0.2, 6] },
  chop: { w: [-0.35, 3, 0.4, 0, 0.6, 1.8, 0, 0.4, -0.5, -0.3, 0.4, -6], s: [0.5, 1.1, 0.1, 0, 0.4, 1.9, 0, 0.8, -0.4, -0.6, 0.3, 16] },
  frontKick: { w: [-0.15, 0.8, 1.6, 0, 0.4, 1.8, 0, 1, -1.7, -0.3, 0.4, -4], s: [-0.1, 0.8, 1.6, 0, 0.4, 1.8, 0, 1.35, 0, -0.2, 0.2, 14] },
  roundKick: { w: [-0.4, 0.6, 1.7, 0, 0.6, 1.5, 0, 0.6, -1.9, -0.4, 0.3, -6], s: [-0.5, 0.6, 1.7, 0, 0.5, 1.6, 0, 1.9, 0.05, -0.1, 0.2, 12] },
  sweep: { w: [-0.2, 0.4, 1.8, 0, 0.4, 1.8, 0, 1, -1.6, -0.5, 0.9, -4], s: [0.2, 0.7, 1.5, 0, 0.5, 1.7, 0, 1.5, 0.05, -0.5, -1.2, 18] },
  knee: { w: [0, 0.5, 1.8, 0, 0.4, 1.8, 0, 0.2, -0.3, -0.2, 0.3, -4], s: [0.25, 0.9, 1.5, 0, 1, 1.5, 0, 1.5, -1.6, -0.2, 0.2, 16] },
  shoulder: { w: [0.6, -0.8, 2, 0, 0.8, 1.5, 0, 0.9, -0.8, -0.7, 0.6, -12], s: [0.9, -0.2, 0.5, 0, 0.3, 0.6, 0, 1, -0.2, -0.9, 0.4, 28] },
  palm: { w: [-0.1, 0.3, 2, 0, 0.3, 2, 0, 0.5, -0.4, -0.3, 0.3, -8], s: [0.2, 1.6, 0, 0, 1.55, 0, 0, 0.5, -0.4, -0.3, 0.3, 10] },
  spinBack: { w: [-0.7, -0.2, 0.5, 0, -0.2, 0.5, 0, 0.5, -0.5, -0.4, 0.5, -10], s: [0.7, 1.6, 0.1, 0, -0.3, 1, 0, 0.6, -0.4, -0.8, 0.3, 18] },
  stomp: { w: [0.2, 0.5, 1.5, 0, 0.5, 1.5, 0, 0.7, -1.4, 0.3, -1, 0], s: [0.1, 1, 1, 0, 1, 1, 0, 0.15, 0, -0.15, 0, 0] },
  diveKick: { w: [0.1, 0.3, 1.5, 0, 0.5, 1.5, 0, 0.9, -1.2, 0.2, -0.9, 0], s: [-0.45, 0.9, 1.2, 0, 0.5, 1.5, 0, 1.35, 0.05, 0.2, -1.3, 20] },
  flipKick: { w: [0, 0.3, 1.2, 0, 0.3, 1.2, 0, 0.7, -1.2, 0.4, -0.9, 0], s: [-0.7, 1.2, 0.4, 0, 1, 0.4, 0, 2.6, 0.1, 0.3, -0.2, 4] },
  cast: { w: [0, 0.4, 2, 0, 0.4, 2, 0, 0.5, -0.4, -0.3, 0.3, -8], s: [0.15, 1.6, 0, 0, 1.5, 0.1, 0, 0.5, -0.4, -0.3, 0.3, 8] },
  lunge: { w: [0.3, -0.9, 2.4, 0, 0.7, 1.6, 0, 1.2, -0.9, -0.7, 0.6, -14], s: [0.7, 1.5, 0.1, 0, 1.4, 0.2, 0, 1, -0.2, -0.9, 0.5, 24] },
  rising: { w: [0.1, 0.3, 1.6, 0, 0.4, 1.8, 0, 0.6, -0.8, -0.4, 0.7, 0], s: [-0.3, 3, 0.1, 0, 0.6, 0.3, 0, 0.9, -1.4, 0, -0.3, 6] },
  risingKick: { w: [0.2, 0.3, 1.6, 0, 0.4, 1.8, 0, 0.5, -0.9, -0.5, 1, 0], s: [-0.9, 2.2, 0.3, 0, 2, 0.4, 0, 2.4, 0.1, 0.2, -0.2, 2] },
  slam: { w: [-0.4, 3, 0.2, 0, 3, 0.2, 0, 0.4, -0.5, -0.4, 0.4, -6], s: [0.7, 0.7, 0.2, 0, 0.7, 0.2, 0, 0.7, -0.4, -0.7, 0.4, 16] },
};

// ============ キャラクター一覧 ============
const CHARACTERS = [
  {
    name: 'ライキ',
    desc: 'バランス型:連携と飛び道具(速)',
    // 性能
    stats: { hp: 126, jumpStartup: 4, landLag: 3, airLandLag: 8, speed: 4.2, jump: -14 },
    ko: { type: 'fly', vx: 7, vy: -10, bounce: 1, slide: 0.85, air: 'blown', lie: 'back' }, // 大きく吹っ飛んで一度はね、あお向けに倒れる
    sp: { max: 100, color: '#ff8a3c' }, // SP ゲージ: 標準(たまり方はすべて既定値)
    // 飛び道具(Aキー)  speed=速度 damage=威力 radius=大きさ life=飛距離F count=発射数
    projectile: { speed: 9, damage: 6, radius: 12, look: 'fireball' }, // look=見た目 path=軌道(projectile.js)
    // 見た目  color=体の色(服・スキンの基準) skin=肌の色  ※体の大きさ・服の色は drawing_character.js の body に書く
    look: {
      smooth: { atk: 0.7, move: 0.3 }, // 動きの追従の速さ(0〜1。大きいほどキビキビ、小さいほど重い)
      color: '#e44', skin: '#f2c79c',
    },
    throw: {
      reach: [0.4, 1.55, 0.2, 0, 1.45, 0.2, 0, 0.8, -0.4, -0.5, 0.3, 12], // つかみに行く姿勢
      name: '投げ', box: { x: 0, y: -85, w: 70, h: 75 }, // 掴み判定(x:前方向の開始位置 y:足元から(マイナスが上) w,h:大きさ)
      startup: 6, active: 3, whiff: 22, release: 34, total: 80, // 発生/持続/空振り後隙/投げる瞬間/全体F(60F≒1秒)
      f: { name: '背負い投げ', damage: 10, vx: 9, vy: -6, hitstun: 26, hold: { x: 0, y: 95 }, release: 30,
        motion: { hold: [0.45, 2.6, 1.2, 0, 2.4, 1.3, 0, 0.8, -1.0, -0.5, 0.7, -2], rel: [1.05, 1.2, 0.2, 0, 1.1, 0.2, 0, 1.0, -0.8, -0.8, 0.6, 10], held: [-1.5, 2.6, 0.2, 0, 2.6, 0.2, 0, 0.1, 0, -0.1, 0, 0] },
        effect: { color: '#f83', color2: '#ffd36b', hit: [{ type: 'flame', r: 40, duration: 16 }, { type: 'impact', r: 40 }, { type: 'shake', duration: 8, power: 5 }] } },
      b: { name: '炎の巴投げ', damage: 9, vx: 9, vy: -7, hitstun: 26, hold: { x: -10, y: 70 },
        motion: { hold: [-0.5, 2.6, 0.4, 0, 2.6, 0.4, 0, 0.4, -0.6, -0.3, 0.5, -2], rel: [-1.25, 3.0, 0.2, 0, 3.0, 0.2, 0, 0.9, -1.6, 0.6, -1.2, -8], held: [0.3, 2.0, 1.5, 0, 1.8, 1.6, 0, 1.4, -1.8, 1.2, -1.6, 0] },
        effect: { color: '#f83', color2: '#ffd36b', hit: [{ type: 'flame', r: 30, duration: 14 }, { type: 'burst', r: 34 }] } },
      u: { name: '昇炎掌', damage: 4, vx: 4, vy: -15, hitstun: 30, release: 30, hits: [{ at: 10, damage: 4 }],
        motion: { hold: [0.35, 1.5, 1.2, 0, 1.4, 1.2, 0, 0.9, -1.3, -0.6, 1.0, 0], rel: [-0.3, 3.1, 0.05, 0, 3.0, 0.05, 0, 0.2, -0.2, -0.2, 0.2, 4], held: [-0.4, 2.2, 1.0, 0, 1.6, 1.2, 0, 0.8, -1.0, -0.4, 0.6, 0] },
        effect: { color: '#f83', color2: '#ffd36b', hit: [{ type: 'flame', r: 36, dir: 'up', duration: 18 }, { type: 'burst', r: 30 }] } },
      d: { name: '膝落とし', damage: 11, vx: 3, vy: -7, hitstun: 30, spike: 4,
        motion: { hold: [-0.25, 3.0, 0.2, 0, 2.9, 0.2, 0, 0.5, -0.5, -0.4, 0.4, 0], rel: [0.5, 1.0, 0.6, 0, 0.9, 0.6, 0, 1.5, -1.8, -0.3, 0.3, 8] },
        effect: { color: '#f83', color2: '#ffd36b', hit: [{ type: 'impact', r: 44 }, { type: 'ring', at: 'feet', flat: true, r: 70, width: 6 }, { type: 'shake', duration: 10, power: 6 }] } },
    },
    hitPoses: { head: [0.2, 0.9, 1.9, 0, 0.7, 2, 0, 1.5, -1.3, 0, -1.5, 0]},
    poses: {
      // 全モーション共通の基本姿勢(角度。0=真下/正=前) [lean,右肩,右肘,右手首,左肩,左肘,左手首,右腿,右膝,左腿,左膝,前後ずれ]
      idle: [0.12, 0.9, 1.9, 0, 0.7, 2, 0, -0.3, 0.2, 0.5, -0.1, 0], // 待機
      walk: [0.12, 0.45, 0.7, 0.8], // 歩き [lean,腕の振り,脚の振り,膝の曲げ]
      guard: [0.09, 1, 2.3, 0, 0.9, 2.4, 0, 0.35, -0.45, -0.3, 0.35, 0], // シールド
      crouch: [0.2, 0.9, 1.9, 0, 0.7, 2, 0, 0, -1.5, 1.5, -1.3, 0], // しゃがみ・着地・ジャンプ前
      jumpSquat: [0.57, -0.06, 0.9, 0, -0.13, 0.9, 0, 1.15, -1.75, -1, 1.75, -2], // ジャンプ前隙(跳ぶ前にため込む)
      landing: [0.57, 1.41, 0.4, 0, 0.9, 0.5, 0, 1.2, -1.6, -0.5, 0.9, 4], // 着地隙(衝撃を受け止める)
      dashF: [0.47, 0.9, 1.3, 0, -0.4, 1.4, 0, 1.1, -0.5, -1, 0.5, 0], // 前ダッシュ
      dashB: [-0.23, 0.6, 1.7, 0, 0.4, 1.9, 0, 0.7, -0.9, 0.1, -0.4, 0], // バックステップ
      jumpUp: [0, 0.9, 1.3, 0, 0.4, 1.5, 0, 0.8, -1.3, 0.3, -1, 0], // 上昇
      fall: [0, 1.3, 0.9, 0, 0.9, 0.9, 0, 0.5, -0.7, 0.1, -0.4, 0], // 落下
    },
    // 技ごとのモーション(w=振りかぶり s=打ち出し)。書き換えると、その技の動きが変わります
    motions: {
      n: { w: [-0.06, -0.12, 2.23, 0, 0.75, 2.01, 0, 0.46, -0.41, -0.44, 0.37, -5.11], s: [0.2, 1.8, 0.09, 0, 0.47, 1.91, 0, 0.51, -0.46, -0.54, 0.33, 16.5] },
      f: { w: [-0.32, 0.85, 1.95, 0, -0.54, 2.42, 0, 0.47, -0.53, -0.49, 0.45, -9.61], s: [0.63, 0.66, 1.97, 0, 1.5, 0.16, 0, 0.84, -0.31, -0.78, 0.21, 24.54] },
      u: { w: [0.2, -1, 1.58, 0, 1, 1.53, 0, -0.4, 0.2, 0.6, -0.1, 1.89], s: [-0.12, 2.5, 0.5, 0, -0.5, 1.68, 0, 0.18, -0.19, -0.16, 0.23, 4.8] },
      d: { w: [0.2, 0.9, 1.9, 0, 0.7, 2, 0, 1.5, -1.3, 0, -1.5, 0], s: [-0.5, -0.5, 0, 0, 0.7, 2, 0, 1.5, -0.1, -0.5, -1.5, 20] },
      da: { w: [0.24, -0.8, 2.5, 0, 0.89, 1.64, 0, 1.22, -0.88, -0.72, 0.53, -15.47], s: [0.74, 1.72, 0.13, 0, 1.54, 0.24, 0, 1.01, -0.18, -0.84, 0.54, 22.21] },
      an: { w: [-0.08, 0.38, 2.04, 0, 0.51, 2.06, 0, 0.53, -0.4, -0.34, 0.33, -9.41], s: [0.27, 1.7, 0.04, 0, 1.78, -0.02, 0, 0.54, -0.31, -0.24, 0.26, 7.79] },
      af: { w: [-0.14, 0.89, 1.71, 0, 0.69, 1.87, 0, 1, -1.7, -0.41, 0.45, -5.5], s: [-0.04, 0.97, 1.73, 0, 0.67, 1.82, 0, 1.31, -0.02, -0.2, 0.24, 11.84] },
      au: { w: [0.04, 0.56, 1.31, 0, 0.4, 1.32, 0, 0.68, -1.13, 0.26, -0.97, 1.89], s: [-0.63, 1.24, 0.5, 0, 1.16, 0.41, 0, 2.5, 0.1, 0.19, -0.27, 3.14] },
      ad: { w: [0.2, 0.65, 1.53, 0, 0.74, 1.5, 0, 0.75, -1.45, 0.22, -1.02, 2.4], s: [0.1, 1.13, 1.07, 0, 1.14, 1.08, 0, 0.23, -0.02, -0.12, -0.05, 1.48] },
      s: { w: [-0, 0.59, 2.17, 0, 0.68, 1.99, 0, 0.48, -0.34, -0.37, 0.29, -10.61], s: [0.2, 1.66, 0.11, 0, 1.57, 0.09, 0, 0.52, -0.34, -0.32, 0.21, 5.33] },
      sf: { w: [0.58, -0.66, 2.04, 0, 0.99, 1.59, 0, 0.9, -0.7, -0.7, 0.51, -12.09], s: [0.94, 0.02, 0.57, 0, 0.53, 0.6, 0, 1.09, -0.17, -0.97, 0.37, 27.65] },
      su: { w: [0.5, -1, 1.67, 0, 0.57, 1.91, 0, 1, -0.79, -0.5, -0.1, 2.79], s: [-0.25, 3.07, 0.15, 0, -0.1, 0.39, 0, 0.99, -1.4, -0.08, -0.3, 8.13] },
    },
    combos: ['Z→↓Z→→Z→→A (4HIT/26ダメ)', '難:Z×3→8F待ち→ジャンプ×2→空中→Z (4HIT/17ダメ)'],
    moves: {
      n: { name: 'ジャブ', motion: 'jab', startup: 4, active: 2, recovery: 6, damage: 5, knockX: 4, knockY: -2, hitstun: 17, effect: 'punch', box: { x: 30, y: -70, w: 45, h: 24 } },
      f: { name: 'ストレート', motion: 'cross', startup: 8, active: 3, recovery: 14, damage: 10, knockX: 6, knockY: -3, hitstun: 22, effect: { preset: 'punch', strength: 1.4 }, box: { x: 50, y: -65, w: 70, h: 22 } },
      b: { name: '旋回裏拳', motion: 'roundKick', startup: 8, active: 4, recovery: 16, damage: 7, knockX: 6, knockY: -3, hitstun: 22, effect: 'kick', box: { x: -70, y: -80, w: 130, h: 34 } }, // 振り向きざまに前後を払う(めくられたときの対策)
      u: { name: 'アッパー', motion: 'uppercut', startup: 7, active: 4, recovery: 16, damage: 8, knockX: 1, knockY: -11, hitstun: 24, effect: 'upper', box: { x: 10, y: -135, w: 30, h: 75 } },
      d: { name: 'ボディフック', motion: 'hook', startup: 6, active: 3, recovery: 10, damage: 5, knockX: 4, knockY: 1, hitstun: 22, effect: 'punch', box: { x: 25, y: -22, w: 75, h: 20 } }, // 当てて有利な下段(→Z や 必殺技につなぐ)
      da: { name: 'ダッシュラッシュ', motion: 'lunge', startup: 8, active: 5, recovery: 14, damage: 9, knockX: 8, knockY: -4, hitstun: 22, effect: 'dash', launch: { x: 17 }, box: { x: 25, y: -80, w: 65, h: 60 } },
      an: { name: '空中掌打', motion: 'palm', landLag: 6, startup: 4, active: 7, recovery: 8, damage: 5, knockX: 2, knockY: -3, hitstun: 16, effect: 'air', box: { x: 20, y: -80, w: 55, h: 40 } },
      af: { name: '空中ドロップキック', motion: 'frontKick', landLag: 10, startup: 7, active: 5, recovery: 12, damage: 8, knockX: 5, knockY: 2, hitstun: 18, effect: 'kick',　box: { x: 5, y: -50, w: 83, h: 30 } },
      au: { name: '空中バク転蹴り', motion: 'flipKick', landLag: 7, startup: 5, active: 4, recovery: 10, damage: 6, knockX: 1, knockY: -9, hitstun: 20, effect: { preset: 'upper', size: 0.9 }, box: { x: 0, y: -100, w: 30, h: 80 } },
      ad: { name: 'ストンプ', motion: 'stomp', landLag: 14, startup: 9, active: 5, recovery: 14, damage: 8, knockX: 2, knockY: 9, hitstun: 22, effect: 'stomp', launch: { x: 0, y: 10 }, box: { x: -25, y: -65, w: 50, h: 80 } },
      s: { name: 'ファイアボール', motion: 'cast', startup: 12, active: 3, recovery: 22, damage: 0, knockX: 0, knockY: 0, hitstun: 0, effect: { color: '#ff9b42', size: 1.25, duration: 16, particles: 12, particleLife: 22, shapes: ['flame', 'burst'] }, box: { x: 0, y: 0, w: 0, h: 0 } },
      sf: { name: 'ショルダーチャージ', motion: 'shoulder', startup: 10, active: 7, recovery: 20, damage: 12, knockX: 7, knockY: -6, hitstun: 26, effect: { preset: 'tackle', color: '#ff4' }, launch: { x: 9 }, box: { x: 20, y: -85, w: 70, h: 60 } },
      sb: { name: '旋風脚', motion: 'spinBack', startup: 12, active: 8, recovery: 24, damage: 13, knockX: 7, knockY: -6, hitstun: 26, effect: { preset: 'spin', color: '#fb3' }, launch: { x: -8 }, box: { x: 0, y: -90, w: 120, h: 70 } },
      su: { name: 'ライジングフレア', motion: 'rising', startup: 6, invincible: 6, active: 6, recovery: 28, damage: 18, knockX: 2, knockY: -12, hitstun: 30, guardHitStop: 50, effect: { preset: 'rising', color: '#f83', hit: [{ type: 'flame', r: 44 }, { type: 'shake', duration: 10, power: 5 }] }, launch: { x: 2, y: -12 }, box: { x: -15, y: -140, w: 30, h: 80 } },
      sd: { name: 'バーニングスイープ', motion: 'sweep', startup: 10, active: 5, recovery: 22, damage: 12, knockX: 5, knockY: -7, hitstun: 28, effect: { preset: 'sweep', color: '#f83', hit: [{ type: 'flame', r: 30 }, { type: 'impact', r: 30 }] }, box: { x: -20, y: -25, w: 135, h: 25 } },
      // ---- コマンド技(command に入力を書く。書き方は character.js 冒頭の【コマンド技】) ----
      c1: { name: '烈風跳脚', command: '↓↘→+Z', motion: 'frontKick', startup: 6, active: 18, recovery: 16, damage: 11, knockX: 6, knockY: -4, hitstun: 26, effect: { preset: 'kick', color: '#fb3', strength: 1.4 }, launch: { x: 5, y: -9 }, landLag: 10, box: { x: 10, y: -55, w: 75, h: 40 } },
      c2: { name: '流星炎脚', command: '→↓↘+A', air: true, motion: 'diveKick', startup: 8, active: 12, recovery: 16, damage: 12, knockX: 5, knockY: -6, hitstun: 26, effect: 'fire', rank: 5, launch: { x: 6, y: 9 }, landLag: 14, box: { x: 10, y: -50, w: 70, h: 60 } },
      // ---- ゲージ技(Z と A を同時押し)・超必殺技(↓ を押しながら Z と A)。cost=使う SP ゲージ(書き方は冒頭の【SP ゲージ】) ----
      gx: { name: 'バーニングナックル', cost: 25, motion: 'cross', startup: 9, active: 6, recovery: 22, damage: 15, knockX: 10, knockY: -7, hitstun: 30, launch: { x: 11 }, box: { x: 20, y: -95, w: 120, h: 55 },
        effect: { preset: 'fire', strength: 1.8, start: [{ type: 'orb', at: 'front', r: 22, duration: 9, follow: true, blend: 'add' }], attack: [{ type: 'flame', dir: 'forward', rise: 4, life: 26, strength: 2 }, { type: 'lines', count: 5, at: 'body' }, { type: 'flash', blend: 'add', r: 60 }], hit: [{ type: 'flame', r: 50, strength: 2 }, { type: 'impact', r: 46, color: '#f83', color2: '#ffd36b' }, { type: 'shake', duration: 8, power: 5 }] } },
      sx: { name: '紅蓮・爆炎拳', super: true, cost: 100, invincible: 12, minScale: 0.75, motion: 'hook', startup: 5, active: 28, recovery: 34, damage: 7, hits: 5, hitInterval: 5, hitStop: 6, knockX: 3, knockY: -2, hitstun: 30, launch: { x: 8 }, box: { x: 10, y: -115, w: 105, h: 95 },
        effect: { color: '#f83', color2: '#ffd36b', start: [{ type: 'orb', at: 'body', r: 50, duration: 6, follow: true, blend: 'add' }],
          attack: [{ type: 'flame', dir: 'forward', rise: 5, life: 30, strength: 3 }, { type: 'burst', r: 70, count: 14, delay: 6 }, { type: 'burst', r: 90, count: 16, delay: 14 }, { type: 'flame', r: 60, strength: 3, delay: 20 }, { type: 'flash', blend: 'add', r: 130, delay: 22 }, { type: 'text', text: '爆炎!', at: 'head', delay: 22 }, { type: 'shake', duration: 24, power: 6 }],
          hit: [{ type: 'impact', r: 40, color: '#f83', color2: '#ffd36b' }, { type: 'particles', count: 10, dir: 'all', speed: 6 }] } },
    },
  },
  {
    name: 'ガルド',
    desc: '重量級:高火力・鈍足・大型火球',
    // 性能
    stats: { hp: 130, jumpStartup: 6, landLag: 5, airLandLag: 12, speed: 3, jump: -12 },
    ko: { type: 'collapse', drift: 2, keys: [[14, 'stagger'], [20, 'fallBack']], lie: 'back', thud: 20 }, // よろけてから大木のように後ろへ倒れる
    sp: { max: 120, time: 0.01, hit: 0.7, hurt: 0.45, color: '#7df' }, // SP ゲージ: 大きくたまりにくいが、殴っても殴られてもよくたまる
    // 飛び道具(Aキー)  speed=速度 damage=威力 radius=大きさ life=飛距離F count=発射数
    projectile: { speed: 5, damage: 11, radius: 20, look: 'pressure' },
    // 見た目  color=体の色(服・スキンの基準) skin=肌の色  ※体の大きさ・服の色は drawing_character.js の body に書く
    look: {
      smooth: { atk: 0.5, move: 0.22 }, // 動きの追従の速さ(0〜1。大きいほどキビキビ、小さいほど重い)
      color: '#58f', skin: '#d9a273',
    },
    zones: { head: { dmg: 1.25 } }, // 石頭ぎみ:頭ダメージ少なめ
    throw: {
      reach: [0.35, 1.5, 0.3, 0, 1.4, 0.3, 0, 0.9, -0.5, -0.6, 0.4, 10], // つかみに行く姿勢
      name: '投げ', box: { x: 0, y: -95, w: 85, h: 90 }, // 掴み判定(x:前方向の開始位置 y:足元から(マイナスが上) w,h:大きさ)
      startup: 8, active: 4, whiff: 30, release: 38, total: 66, // 発生/持続/空振り後隙/投げる瞬間/全体F(60F≒1秒)
      f: { name: 'ボディスラム', damage: 16, vx: 6, vy: -6, hitstun: 26, hold: { x: 20, y: 110 }, spike: 4, stop: 16,
        motion: { hold: [-0.25, 3.0, 0.2, 0, 2.9, 0.2, 0, 0.5, -0.5, -0.4, 0.4, 0], rel: [0.85, 1.0, 0.2, 0, 0.9, 0.2, 0, 1.0, -1.2, -0.7, 1.0, 12], held: [-1.5, 2.6, 0.2, 0, 2.6, 0.2, 0, 0.1, 0, -0.1, 0, 0] },
        effect: { color: '#7df', hit: [{ type: 'impact', r: 56, color: '#2a4a8a', color2: '#ffffff' }, { type: 'ring', at: 'feet', flat: true, r: 100, width: 8 }, { type: 'shake', duration: 12, power: 7 }] } },
      b: { name: 'ジャーマン', damage: 15, vx: 8, vy: -6, hitstun: 26, hold: { x: -6, y: 85 }, release: 40, total: 68, stop: 16,
        motion: { hold: [-0.5, 2.6, 0.4, 0, 2.6, 0.4, 0, 0.4, -0.6, -0.3, 0.5, -2], rel: [-1.25, 3.0, 0.2, 0, 3.0, 0.2, 0, 0.9, -1.6, 0.6, -1.2, -8], held: [-1.5, 2.6, 0.2, 0, 2.6, 0.2, 0, 0.1, 0, -0.1, 0, 0] },
        effect: { color: '#7df', hit: [{ type: 'impact', r: 52, color: '#2a4a8a', color2: '#ffffff' }, { type: 'debris', at: 'hit', count: 8, speed: 6, duration: 30, color: '#8a7a68' }, { type: 'text', text: 'GERMAN!', at: 'head' }, { type: 'shake', duration: 12, power: 7 }] } },
      u: { name: 'ブレーンバスター', damage: 11, vx: 1, vy: -13, hitstun: 30, hold: { x: 10, y: 120 }, release: 40,
        motion: { hold: [-0.25, 3.0, 0.2, 0, 2.9, 0.2, 0, 0.5, -0.5, -0.4, 0.4, 0], rel: [-0.3, 3.1, 0.05, 0, 3.0, 0.05, 0, 0.2, -0.2, -0.2, 0.2, 4], held: [-1.5, 2.6, 0.2, 0, 2.6, 0.2, 0, 0.1, 0, -0.1, 0, 0] },
        effect: { color: '#7df', hit: [{ type: 'burst', r: 40 }, { type: 'lines', count: 4, at: 'hit', length: 60 }] } },
      d: { name: 'パイルドライバー', damage: 20, vx: 3, vy: -7, hitstun: 30, leap: 90, hold: { x: 10, y: 50 }, release: 38, spike: 5, stop: 18,
        motion: { hold: [-0.6, 2.6, 0.4, 0, 2.4, 0.4, 0, 1.5, -1.6, 0.6, -1.2, 0], rel: [1.1, 1.0, 0.2, 0, 1.0, 0.2, 0, 0.3, -0.4, -0.2, -0.3, 6] },
        effect: { color: '#7df', hit: [{ type: 'impact', r: 60, color: '#2a4a8a', color2: '#ffffff' }, { type: 'debris', at: 'hit', count: 10, speed: 7, duration: 30, color: '#8a7a68' }, { type: 'shake', duration: 14, power: 8 }] } },
    },
    poses: {
      // 全モーション共通の基本姿勢(角度。0=真下/正=前) [lean,右肩,右肘,右手首,左肩,左肘,左手首,右腿,右膝,左腿,左膝,前後ずれ]
      idle: [0.2, 0.2, 1.5, 0, 0.2, 1.5, 0, -0.4, 0, 0.7, -0.5, 0], // 待機
      walk: [0.05, 0.25, 0.45, 0.4], // 歩き [lean,腕の振り,脚の振り,膝の曲げ]
      guard: [-0.08, 1.4, 1.6, 0, 1.3, 1.7, 0, 0.55, -0.3, -0.5, 0.3, 0], // シールド
      crouch: [0.4, 1.5, 1.5, 0, 1.5, 1.5, 0, 0.95, -1.3, -0.95, -0.01, 0], // しゃがみ・着地・ジャンプ前
      jumpSquat: [0.4, -0.03, 0.9, 0, -0.11, 0.9, 0, 1.32, -2.01, -1.15, 2.01, -2], // ジャンプ前隙(跳ぶ前にため込む)
      landing: [0.41, 1.15, 0.4, 0, 1.08, 0.5, 0, 1.38, -1.84, -0.57, 1.03, 4], // 着地隙(衝撃を受け止める)
      dashF: [0.25, 0.9, 1.3, 0, -0.4, 1.4, 0, 1.1, -0.5, -1, 0.5, 0], // 前ダッシュ
      dashB: [-0.35, 0.6, 1.7, 0, 0.4, 1.9, 0, 0.7, -0.9, 0.1, -0.4, 0], // バックステップ
      jumpUp: [0.05, 0.54, 1.3, 0, 0.24, 1.5, 0, 0.4, -0.65, 0.3, -0.5, 0], // 上昇
      fall: [0.05, 0.78, 0.9, 0, 0.54, 0.9, 0, 0.25, -0.35, 0.1, -0.2, 0], // 落下
    },
    // 技ごとのモーション(w=振りかぶり s=打ち出し)。書き換えると、その技の動きが変わります
    motions: {
      n: { w: [-0.36, 3.69, -0.09, 0, 0.74, 1.6, 0, 0.52, -0.44, -0.43, 0.3, -6.57], s: [0.56, 1.01, -0.2, 0, 0.57, 1.73, 0, 1.01, -0.3, -0.74, 0.27, 19.18] },
      f: { w: [-0.11, 0.26, 1.94, 0, 0.31, 1.87, 0, 0.74, -0.26, -0.44, 0.26, -8.08], s: [0.29, 1.71, -0.27, 0, 1.71, -0.37, 0, 0.74, -0.26, -0.4, 0.28, 11.96] },
      u: { w: [-0.11, 0.48, 1.78, 0, 0.51, 1.55, 0, 0.22, -0.17, -0.41, 0.26, -2.76], s: [0.35, 0.84, 1.38, 0, 1.14, 1.27, 0, 1.66, -1.57, -0.37, 0.09, 15.66] },
      d: { w: [-0.21, 0.26, 1.73, 0, 0.51, 1.58, 0, 1.22, -1.82, -0.77, 1.03, -3.66], s: [0.29, 0.59, 1.37, 0, 0.53, 1.46, 0, 1.71, 0.25, -0.65, -1.39, 22.36] },
      da: { w: [0.59, -1.29, 1.94, 0, 1.03, 1.14, 0, 1.18, -0.81, -0.94, 0.57, -18.17], s: [0.97, -0.42, 0.3, 0, 0.47, 0.31, 0, 1.27, -0.11, -1.19, 0.33, 28.82] },
      an: { w: [-0.74, -0.54, -0.01, 0, -0.33, -0.08, 0, 0.61, -0.37, -0.62, 0.47, -15.61], s: [0.78, 1.72, -0.14, 0, -0.34, 0.67, 0, 0.76, -0.25, -0.94, 0.19, 22.41] },
      af: { w: [0.05, 3, 0.2, 0, 3, 0.2, 0, 0, -1.5, 1.5, -1.3, -2.75], s: [1, 0.81, 1.02, 0, 0.49, 1.25, 0, 0, -1.5, 1.5, -1.3, 20.45] },
      au: { w: [-0.15, -0.06, 1.36, 0, 0.42, 1.13, 0, 0.76, -0.91, -0.53, 1.02, -0.69], s: [-0.02, 3.04, -0.17, 0, 0.53, 1.49, 0, 0.29, -0.03, -0.35, 0.11, 8.78] },
      ad: { w: [0.18, 0.52, 1.32, 0, 0.65, 1.18, 0, 0.9, -1.55, 0.27, -1.46, 2.77], s: [0.25, 1.05, 0.79, 0, 1.2, 0.65, 0, 0.21, 0.11, -0.25, -0.09, 0.9] },
      s: { w: [-0.47, 3.74, -0.38, 0, 3.91, -0.56, 0, 0.44, -0.46, -0.56, 0.4, -5.74], s: [0.75, 0.66, -0.04, 0, 0.85, -0.18, 0, 0.81, -0.27, -0.81, 0.29, 18.83] },
      sf: { w: [0.27, -1.41, 2.51, 0, 0.82, 1.34, 0, 1.52, -0.89, -1, 0.63, -20.98], s: [0.85, 1.63, -0.21, 0, 1.66, -0.22, 0, 1.28, -0.06, -1.11, 0.48, 25.89] },
      su: { w: [-0.3, 3.0, 0.3, 0, 2.8, 0.4, 0, 0.5, -0.5, -0.4, 0.4, -4], s: [0.45, 1.3, 0.2, 0, 1.2, 0.3, 0, 0.8, -0.4, -0.6, 0.4, 10] },   // アイアンハンマー: 両腕を頭上に組み、前へたたき下ろす
      sx: { w: [0.35, 1.5, 0.2, 0, 1.4, 0.2, 0, 0.8, -0.4, -0.5, 0.3, 10], s: [-0.55, 2.9, 0.3, 0, 2.9, 0.3, 0, 0.4, -0.4, -0.4, 0.4, -6] },   // ギガント・スープレックス: 両腕でつかみ、後ろへ反り投げる
    },
    crouchParry: { dmg: 0.4, knock: 0.18 }, // どっしり構えて受ける
    combos: ['Z×3→↓Z→→A (5HIT/40ダメ)', '難:該当なし(探索範囲では未発見)'],
    moves: {
      n: { name: 'チョップ', motion: 'chop', startup: 6, active: 2, recovery: 10, damage: 6, knockX: 0.8, knockY: -1, hitstun: 20, effect: { preset: 'chop', color: '#7df' }, box: { x: 30, y: -70, w: 52, h: 24 } }, // 相手を押さない(当てたら次は投げ)
      f: { name: '踏み込み張り手', motion: 'palm', startup: 13, active: 3, recovery: 18, damage: 11, knockX: 2, knockY: -2, hitstun: 24, effect: { preset: 'heavy', color: '#7df' }, launch: { x: 5 }, box: { x: 30, y: -72, w: 70, h: 30 } }, // 前に出ながら張る。押し返しが小さく、そのまま投げ間合い
      b: { name: '突き放し', motion: 'palm', startup: 7, active: 3, recovery: 14, damage: 6, knockX: 15, knockY: -2, hitstun: 18, effect: { preset: 'punch', color: '#7df' }, box: { x: 25, y: -85, w: 55, h: 45 } }, // 大きく突き放す(仕切り直し・端へ)
      u: { name: 'ニーリフト', motion: 'knee', startup: 10, active: 4, recovery: 24, damage: 13, armor: 1, knockX: 1.5, knockY: -11, hitstun: 28, effect: { preset: 'upper', color: '#7df', strength: 1.3 }, box: { x: -10, y: -135, w: 60, h: 75 } }, // アーマー1回。相打ち覚悟で落とす対空
      d: { name: 'ローキック', motion: 'sweep', startup: 9, active: 3, recovery: 14, damage: 7, knockX: 0.5, knockY: -1, hitstun: 22, effect: { preset: 'sweep', color: '#7df' }, box: { x: 25, y: -22, w: 80, h: 20 } }, // 足を止める下段。相手はその場に残る
      da: { name: 'ショルダータックル', motion: 'shoulder', startup: 12, active: 5, recovery: 22, damage: 14, armor: 1, knockX: 12, knockY: -4, hitstun: 25, effect: { preset: 'tackle', color: '#7df' }, launch: { x: 10 }, box: { x: 25, y: -80, w: 75, h: 60 } }, // アーマー1回で突っ込む
      an: { name: '空中ラリアット', motion: 'spinBack', landLag: 3, startup: 6, active: 30, recovery: 5, damage: 8, knockX: 2.8, knockY: -3, hitstun: 18, effect: { preset: 'spin', color: '#7df' }, box: { x: 20, y: -70, w: 61, h: 40 } },
      af: { name: 'ダイビングニー', motion: 'diveKick', landLag: 22, startup: 14, active: 10, recovery: 20, damage: 14, knockX: 5, knockY: -10, hitstun: 40, effect: { preset: 'kick', color: '#7df', strength: 1.5 }, launch: { x: 3 }, box: { x: 25, y: -80, w: 91, h: 100 } },
      au: { name: '空中アッパー', motion: 'uppercut', landLag: 10, startup: 8, active: 4, recovery: 14, damage: 10, knockX: 1.4, knockY: -9, hitstun: 22, effect: { preset: 'upper', color: '#7df' }, box: { x: -30, y: -140, w: 66, h: 80 } },
      ad: { name: 'ヒップドロップ', motion: 'stomp', landLag: 14, startup: 13, active: 5, recovery: 16, damage: 12, knockX: 1, knockY: 8, hitstun: 34, effect: { preset: 'stomp', color: '#fd6', strength: 1.4 }, launch: { x: 0, y: 13 }, box: { x: -25, y: -10, w: 55, h: 80 } }, // 速く落ちて着地隙が小さい → そのまま投げ
      s: { name: 'ショックウェーブ', motion: 'slam', startup: 17, active: 3, recovery: 31, damage: 0, knockX: 0, knockY: 0, hitstun: 0, effect: { preset: 'quake', color: '#fd6' }, box: { x: 0, y: 0, w: 0, h: 0 } },
      sf: { name: 'ブルタックル', motion: 'lunge', startup: 14, active: 7, recovery: 28, damage: 20, knockX: 10.5, knockY: -6, hitstun: 31, effect: { preset: 'tackle', color: '#fd6', strength: 1.4 }, launch: { x: 9 }, box: { x: 20, y: -85, w: 80, h: 60 } },
      sb: { name: 'リバースエルボー', motion: 'spinBack', startup: 9, active: 5, recovery: 20, damage: 10, knockX: 8, knockY: -4, hitstun: 22, effect: { preset: 'spin', color: '#7df' }, launch: { x: -7 }, box: { x: -60, y: -90, w: 130, h: 50 } },
      su: { name: 'アイアンハンマー', motion: 'chop', startup: 10, active: 6, recovery: 30, damage: 16, armor: 2, knockX: 3, knockY: 9, spike: 6, hitstun: 32, hitStop: 16, box: { x: -10, y: -170, w: 95, h: 125 }, // 地上のまま、アーマー2回で飛び込みを受け止め、頭上から地面へたたき落とす(叩きつけ)
        effect: { preset: 'heavy', color: '#7df', attack: [{ type: 'slash', angle: 1, width: 16, span: 2.6, r: 70 }, { type: 'wave', at: 'feet', width: 6 }], hit: [{ type: 'impact', r: 46 }, { type: 'shake', duration: 10, power: 6 }] } },
      sd: { name: 'アースクエイク', motion: 'slam', startup: 20, active: 5, recovery: 32, damage: 18, knockX: 2, knockY: -10, hitstun: 34, effect: { preset: 'quake', color: '#7df', strength: 1.4 }, box: { x: -60, y: -30, w: 180, h: 30 } },
      // ---- コマンド技(command に入力を書く。書き方は character.js 冒頭の【コマンド技】) ----
      c1: { name: '頭突き', command: '↓↓+Z', motion: 'shoulder', startup: 7, active: 2, recovery: 18, damage: 12, knockX: 3, knockY: -2, hitstun: 28, effect: { preset: 'heavy', color: '#7df' }, box: { x: 15, y: -105, w: 35, h: 35 } },
      c2: { name: 'フライングボディプレス', command: '←→+A', motion: 'slam', startup: 10, active: 22, recovery: 20, damage: 15, knockX: 3, knockY: -8, hitstun: 30, effect: { preset: 'stomp', color: '#7df', strength: 1.5 }, launch: { x: 6, y: -10 }, landLag: 16, box: { x: -20, y: -60, w: 110, h: 60 } },
      // ---- コマンド投げ(grab を書いた技。ガードできない・空中の相手はつかめない。書き方は character.js 冒頭の【コマンド投げ】) ----
      // ジャイアントスイング: 相手の足をつかんで2回半ふり回し、遠くへ放り投げる(画面の端へ運ぶ)
      c3: { name: 'ジャイアントスイング', command: '↓↙←+Z', motion: 'palm', startup: 7, active: 3, recovery: 34, damage: 18, knockX: 14, knockY: -7, hitstun: 30, hitStop: 16,
        grab: { dir: 'f', box: { x: 0, y: -95, w: 80, h: 90 }, release: 54, total: 74, swing: 2.5, hold: { x: 64, y: 50 }, color: '#7df',
          motion: { hold: [-0.4, 1.6, 0.2, 0, 1.5, 0.2, 0, 0.6, -0.6, -0.5, 0.5, 0], rel: [0.5, 1.5, 0.1, 0, 1.4, 0.1, 0, 0.8, -0.3, -0.7, 0.4, 12], held: [-1.5, 2.6, 0.2, 0, 2.6, 0.2, 0, 0.1, 0, -0.1, 0, 0] } },
        effect: { color: '#7df', color2: '#ffffff', attack: [{ type: 'ring', at: 'body', r: 70, width: 5, flat: true, duration: 40 }], hit: [{ type: 'impact', r: 50 }, { type: 'lines', count: 5, at: 'hit', length: 100 }, { type: 'text', text: 'スイング!', at: 'head' }, { type: 'shake', duration: 10, power: 6 }] } },
      // パワーボム: 頭上高く持ち上げて、前の地面へたたきつける。威力が高く、相手がはね上がるので追い打ちできる
      c4: { name: 'パワーボム', command: '↓↘→+Z', motion: 'palm', startup: 6, active: 3, recovery: 36, damage: 22, knockX: 2, knockY: -6, spike: 6, hitstun: 36, hitStop: 20,
        grab: { dir: 'd', box: { x: 0, y: -95, w: 70, h: 90 }, release: 42, total: 66, hold: { x: 20, y: 125 }, color: '#7df',
          motion: { hold: [-0.3, 3.0, 0.2, 0, 3.0, 0.2, 0, 0.4, -0.4, -0.4, 0.4, 0], rel: [0.9, 0.8, 0.2, 0, 0.8, 0.2, 0, 1.0, -1.3, -0.8, 1.2, 10] } },
        effect: { color: '#7df', color2: '#ffffff', hit: [{ type: 'impact', r: 70, color: '#2a4a8a', color2: '#ffffff' }, { type: 'ring', at: 'feet', flat: true, r: 130, width: 9 }, { type: 'debris', at: 'hit', count: 12, speed: 8, duration: 34, color: '#8a7a68' }, { type: 'text', text: 'POWER BOMB!', at: 'head' }, { type: 'shake', duration: 16, power: 9 }] } },
      // ---- ゲージ技(Z と A を同時押し)・超必殺技(↓ を押しながら Z と A) ----
      gx: { name: 'アイアンバッファロー', cost: 30, armor: 2, motion: 'lunge', startup: 16, active: 8, recovery: 30, damage: 18, knockX: 12, knockY: -6, hitstun: 34, launch: { x: 9 }, box: { x: 20, y: -100, w: 85, h: 75 },
        effect: { preset: 'tackle', color: '#7df', strength: 2, start: [{ type: 'orb', at: 'body', r: 42, duration: 16, follow: true, blend: 'add', color: '#bef' }], hit: [{ type: 'impact', r: 52, color: '#7df' }, { type: 'shake', duration: 10, power: 7 }] } },
      sx: { name: 'ギガント・スープレックス', super: true, cost: 120, invincible: 6, minScale: 0.9, unblockable: true, motion: 'palm', startup: 5, active: 4, recovery: 55, damage: 36, knockX: 4, knockY: -14, hitstun: 50, hitStop: 22, box: { x: 10, y: -76, w: 60, h: 76 }, // ガード不能のつかみ。届くのは目の前だけで、空振りすると隙だらけ(跳べば避けられる)
        effect: { color: '#7df', color2: '#ffffff', start: [{ type: 'orb', at: 'front', r: 40, duration: 6, follow: true, blend: 'add' }],
          attack: [{ type: 'lines', count: 4, at: 'body', length: 60 }],
          hit: [{ type: 'impact', r: 64, color: '#2a4a8a', color2: '#ffffff' }, { type: 'ring', at: 'feet', flat: true, r: 120, width: 10, delay: 6 }, { type: 'debris', at: 'feet', count: 12, speed: 8, delay: 6, duration: 36, color: '#8a7a68' }, { type: 'text', text: 'GIGANT!', at: 'head', delay: 4 }, { type: 'shake', duration: 22, power: 10, delay: 4 }] } },
    },
  },
  {
    name: 'シノ',
    desc: '高速型:軽い技・低HP・高速苦無',
    // 性能
    stats: { hp: 108, jumpStartup: 3, landLag: 2, airLandLag: 5, speed: 5.6, jump: -15.5 },
    ko: { type: 'fly', vx: 6, vy: -12, spin: -6.9, bounce: 0, slide: 0.8, air: 'tuck', lie: 'front' }, // 後ろへ宙返りしながら飛ばされ、うつぶせに落ちる
    sp: { max: 80, time: 0.015, hit: 0.75, hurt: 0.3, combo: 1.2, color: '#c6f' }, // SP ゲージ: 小さくて早くたまる(ゲージ技を何度も使う)
    // 飛び道具(Aキー)  speed=速度 damage=威力 radius=大きさ life=飛距離F count=発射数
    projectile: { speed: 14, damage: 4, radius: 8, look: 'kunai' },
    // 見た目  color=体の色(服・スキンの基準) skin=肌の色  ※体の大きさ・服の色は drawing_character.js の body に書く
    look: {
      smooth: { atk: 0.85, move: 0.38 }, // 動きの追従の速さ(0〜1。大きいほどキビキビ、小さいほど重い)
      color: '#3b5', skin: '#f2c79c',
    },
    throw: {
      reach: [0.6, 1.6, 0.1, 0, 1.5, 0.1, 0, 1.0, -0.4, -0.9, 0.5, 16], // つかみに行く姿勢
      name: '投げ', box: { x: 0, y: -80, w: 80, h: 70 }, // 掴み判定(x:前方向の開始位置 y:足元から(マイナスが上) w,h:大きさ)
      startup: 10, active: 3, whiff: 16, release: 30, total: 50, // 発生/持続/空振り後隙/投げる瞬間/全体F(60F≒1秒)
      f: { name: '飛ばし投げ', damage: 8, vx: 11, vy: -6, hitstun: 26, release: 20, total: 38,
        motion: { hold: [0.1, 1.5, 0.9, 0, 1.4, 0.9, 0, 0.5, -0.4, -0.4, 0.4, 0], rel: [0.5, 1.6, 0.05, 0, 1.5, 0.05, 0, 0.8, -0.3, -0.8, 0.3, 14], held: [-0.4, 2.2, 1.0, 0, 1.6, 1.2, 0, 0.8, -1.0, -0.4, 0.6, 0] },
        effect: { color: '#c6f', hit: [{ type: 'lines', count: 4, at: 'hit', length: 80 }, { type: 'cross', r: 24 }] } },
      b: { name: '影返し', damage: 8, vx: 11, vy: -6, hitstun: 26, leap: 50, release: 24, total: 42,
        motion: { hold: [-0.6, 2.6, 0.4, 0, 2.4, 0.4, 0, 1.5, -1.6, 0.6, -1.2, 0], rel: [-0.9, 2.4, 0.3, 0, 2.3, 0.4, 0, 1.8, -0.6, 0.5, -0.9, -10], held: [0.3, 2.0, 1.5, 0, 1.8, 1.6, 0, 1.4, -1.8, 1.2, -1.6, 0] },
        effect: { color: '#c6f', start: [{ type: 'particles', at: 'feet', count: 8, dir: 'up', speed: 4 }], hit: [{ type: 'cross', r: 26 }, { type: 'particles', count: 8, dir: 'all', speed: 4 }] } },
      u: { name: '跳ね上げ', damage: 4, vx: 3, vy: -12, hitstun: 26, release: 22, total: 40, hits: [{ at: 8, damage: 2 }, { at: 14, damage: 2 }],
        motion: { hold: [0.35, 1.5, 1.2, 0, 1.4, 1.2, 0, 0.9, -1.3, -0.6, 1.0, 0], rel: [-0.6, 1.4, 0.8, 0, 1.2, 0.8, 0, 2.6, -0.1, -0.2, 0.2, 2], held: [-0.4, 2.2, 1.0, 0, 1.6, 1.2, 0, 0.8, -1.0, -0.4, 0.6, 0] },
        effect: { color: '#c6f', hit: [{ type: 'crescent', angle: -1, width: 8, span: 2 }, { type: 'particles', count: 5, dir: 'up', speed: 4 }] } },
      d: { name: '落とし', damage: 9, vx: 3, vy: -7, hitstun: 30, leap: 70, release: 28, total: 46, spike: 3,
        motion: { hold: [-0.6, 2.6, 0.4, 0, 2.4, 0.4, 0, 1.5, -1.6, 0.6, -1.2, 0], rel: [1.1, 1.0, 0.2, 0, 1.0, 0.2, 0, 0.3, -0.4, -0.2, -0.3, 6] },
        effect: { color: '#c6f', hit: [{ type: 'impact', r: 40, color: '#3a1a5a', color2: '#ffffff' }, { type: 'ring', at: 'feet', flat: true, r: 60, width: 5 }] } },
    },
    poses: {
      // 全モーション共通の基本姿勢(角度。0=真下/正=前) [lean,右肩,右肘,右手首,左肩,左肘,左手首,右腿,右膝,左腿,左膝,前後ずれ]
      idle: [0.2, -0.4, 1, 0, 0, 2, 0, -0.2, 0.2, 0.5, -0.4, 0], // 待機
      walk: [0.4, 0.7, 1, 1.3], // 歩き [lean,腕の振り,脚の振り,膝の曲げ]
      guard: [0.27, 0.9, 2.4, 0, 0.8, 2.5, 0, 0.8, -0.9, -0.5, 0.9, 0], // シールド
      crouch: [0.2, 0.5, 1.5, 0, 1, 2, 0, 1, -2.5, 2, -2, 0], // しゃがみ・着地・ジャンプ前
      jumpSquat: [0.75, 0.19, 0.9, 0, -0.3, 0.9, 0, 1.03, -1.57, -0.9, 1.57, -2], // ジャンプ前隙(跳ぶ前にため込む)
      landing: [0.74, 1.39, 0.4, 0, 0.86, 0.5, 0, 1.08, -1.44, -0.45, 0.81, 4], // 着地隙(衝撃を受け止める)
      dashF: [0.85, 0.9, 1.3, 0, -0.4, 1.4, 0, 1.1, -0.5, -1, 0.5, 0], // 前ダッシュ
      dashB: [-0.25, 0.6, 1.7, 0, 0.4, 1.9, 0, 0.7, -0.9, 0.1, -0.4, 0], // バックステップ
      jumpUp: [0.1, 0.9, 1.3, 0, 0.4, 1.5, 0, 1.12, -1.82, 0.3, -1.4, 0], // 上昇
      fall: [0.1, 1.3, 0.9, 0, 0.9, 0.9, 0, 0.7, -0.98, 0.1, -0.56, 0], // 落下
    },
    // 技ごとのモーション(w=振りかぶり s=打ち出し)。書き換えると、その技の動きが変わります
    motions: {
      n: { w: [-0.46, -1.3, 0.47, 0, 0.39, 1.95, 0, 0.78, -0.81, -0.39, 0.68, -9.19], s: [0.53, 2.19, 1.15, 0, 0.48, 2.04, 0, 0.81, -0.64, -0.85, 0.66, 21.41] },
      f: { w: [-0.49, 0.31, 1.75, 0, 0.42, 1.56, 0, 1.01, -2.3, -0.57, 0.45, -5.29], s: [-0.42, 0.32, 1.83, 0, 0.34, 1.73, 0, 2.44, -0.09, -0.07, 0.5, 15.62] },
      u: { w: [-0.11, 0.1, 1.27, 0, 0.21, 1.2, 0, 0.89, -1.5, 0.3, -0.8, 2.77], s: [-0.67, 1.06, 0.23, 0, 1.08, 0.36, 0, 3.42, -0.03, 0.33, 0.02, 6.71] },
      d: { w: [0.2, -1, 1.5, 0, 1, 0, 0, 1, -2.5, 2, -2, 0], s: [0.2, 1.4, 0, 0, 1, 2, 0, 1, 4, 2, -2, 0] },
      da: { w: [0.3, 0.5, 1.6, 0, 0.5, 1.6, 0, 1.0, -1.4, -0.4, 0.8, -4], s: [-0.5, 1.2, 0.6, 0, 0.9, 1.0, 0, 1.55, 0.05, -0.3, -1.6, 26] },   // 影滑り: 体をそらせて前の脚を伸ばし、滑り込む
      an: { w: [-0.8, -0.3, 0.27, 0, -0.56, 0.48, 0, 0.62, -0.58, -0.57, 0.7, -10.57], s: [0.73, 1.53, -0.2, 0, -0.63, 0.92, 0, 0.85, -0.57, -1.2, 0.48, 21.71] },
      af: { w: [-0.14, 0.85, 1.8, 0, 0.5, 2.04, 0, 1.26, -2.25, -0.47, 0.66, -2.02], s: [-0.01, 0.89, 1.77, 0, 0.36, 2.01, 0, 1.72, -0.18, -0.52, 0.46, 18.11] },
      au: { w: [-0.1, 0.07, 1.61, 0, 0.23, 1.55, 0, 0.95, -1.29, -0.28, 1.19, 1.14], s: [0.03, 3.16, -0.04, 0, 0.37, 1.93, 0, 0.33, -0.22, -0.45, 0.46, 4.34] },
      ad: { w: [0.22, 0.28, 1.52, 0, 0.57, 1.67, 0, 1.2, -1.72, 0.27, -0.91, 2.06], s: [0.13, 1.08, 1.05, 0, 1.01, 1.02, 0, 0.53, -0.06, -0.11, 0.27, -2.05] },
      s: { w: [0.04, 0.07, 2.23, 0, 0.24, 2.07, 0, 0.83, -0.54, -0.63, 0.49, -12.49], s: [0.17, 1.81, -0.33, 0, 1.59, -0.13, 0, 0.61, -0.48, -0.53, 0.45, 8.17] },
      sf: { w: [0.21, -1.29, 2.54, 0, 0.51, 1.57, 0, 1.8, -1.19, -0.82, 0.88, -15.86], s: [0.7, 1.51, -0.14, 0, 1.66, 0.05, 0, 1.38, -0.22, -1.04, 0.69, 25.86] },
      su: { w: [0.23, 0.06, 1.74, 0, 0.4, 1.89, 0, 0.67, -1.17, -0.62, 1.31, -1.03], s: [-0.86, 2.24, 0.08, 0, 2.43, 0.28, 0, 3.21, 0.14, 0.31, -0.05, 5.2] },   // 昇り燕・連: 蹴り上げを重ねながら昇る
    },
    combos: ['Z→↓Z→↑A→Z×2→↓Z→→A (7HIT/24ダメ)', '難:Z×2→↑A→Z→4F待ち→ジャンプ→空中→Z (5HIT/19ダメ)'],
    moves: {
      n: { name: '苦無二連', motion: 'hook', startup: 3, active: 6, recovery: 5, damage: 3, hits: 2, hitInterval: 3, hitStop: 4, knockX: 1.5, knockY: 0, hitstun: 16, effect: 'shadow', box: { x: 30, y: -70, w: 45, h: 24 } }, // 3F の2段。連打して投げ・下段に混ぜる
      f: { name: '踏み込み回し蹴り', motion: 'roundKick', startup: 7, active: 3, recovery: 10, damage: 8, knockX: 5, knockY: -3, hitstun: 20, effect: { preset: 'kick', color: '#c6f' }, launch: { x: 8 }, box: { x: 30, y: -65, w: 70, h: 22 } }, // 一歩で間合いを詰める
      b: { name: '背面斬り', motion: 'spinBack', startup: 4, active: 4, recovery: 9, damage: 5, knockX: -4, knockY: -2, hitstun: 18, effect: 'shadow', box: { x: -65, y: -80, w: 70, h: 32 } }, // 振り向かずに背中側を斬る(めくった後・後ろに回られたとき)
      u: { name: 'バク転蹴り', motion: 'flipKick', startup: 5, active: 4, recovery: 12, damage: 5, knockX: 4, knockY: -11, hitstun: 20, effect: { preset: 'upper', color: '#c6f' }, launch: { x: -6 }, box: { x: -30, y: -135, w: 60, h: 75 } }, // 下がりながらの対空
      d: { name: 'しゃがみ突き', motion: 'sweep', startup: 4, active: 2, recovery: 6, damage: 4, knockX: 2, knockY: -1, hitstun: 18, effect: { preset: 'thrust', color: '#c6f' }, box: { x: 25, y: -22, w: 68, h: 20 } }, // 最速の下段。連打できる
      da: { name: '影滑り', motion: 'sweep', startup: 6, active: 8, recovery: 12, damage: 8, knockX: 3, knockY: -6, hitstun: 22, effect: { preset: 'sweep', color: '#c6f', attack: [{ type: 'lines', count: 4, at: 'feet', length: 90 }, { type: 'crescent', angle: 1, width: 8, span: 2 }] }, launch: { x: 13 }, box: { x: 15, y: -20, w: 70, h: 20 } }, // 遠くから届く下段スライディング。当たると浮く
      an: { name: '空中回転斬り', motion: 'spinBack', landLag: 4, startup: 3, active: 7, recovery: 5, damage: 5, knockX: 2, knockY: -3, hitstun: 14, effect: { preset: 'spin', color: '#c6f', size: 0.8 }, box: { x: -45, y: -72, w: 100, h: 44 } }, // 前後に当たる(めくりの飛び込み)
      af: { name: '空中二段蹴り', motion: 'frontKick', landLag: 4, startup: 5, active: 8, recovery: 8, damage: 4, hits: 2, hitInterval: 4, hitStop: 5, knockX: 3, knockY: 1, hitstun: 18, bounce: { x: -2, y: -7 }, effect: { preset: 'kick', color: '#c6f' }, box: { x: 25, y: -55, w: 70, h: 34 } }, // 当たる(ガードされる)と蹴って跳ね返る → もう一度飛び込む
      au: { name: '空中昇り蹴り', motion: 'uppercut', landLag: 4, startup: 3, active: 4, recovery: 6, damage: 5, knockX: 1, knockY: -9, hitstun: 18, effect: { preset: 'upper', color: '#c6f', size: 0.85 }, box: { x: -30, y: -140, w: 60, h: 80 } },
      ad: { name: '散り苦無', motion: 'stomp', landLag: 6, startup: 6, active: 3, recovery: 10, damage: 0, knockX: 0, knockY: 0, hitstun: 0, float: 1, effect: { preset: 'shadow', attack: [{ type: 'lines', count: 3, at: 'body', length: 50 }] }, box: { x: 0, y: 0, w: 0, h: 0 }, // 空中で少し止まり、斜め下へ苦無を3本ばらまく
        projectile: { speed: 11, damage: 4, radius: 9, life: 34, count: 3, spread: 2.2, knockX: 2, knockY: -2, hitstun: 16, look: 'kunai', path: { type: 'arc', up: 0, gravity: 0.05, angle: 55 }, from: { x: 20, y: -50 } } },
      s: { name: '苦無投げ', motion: 'cast', startup: 8, active: 3, recovery: 15, damage: 0, knockX: 0, knockY: 0, hitstun: 0, effect: { preset: 'cast', color: '#c6f' }, box: { x: 0, y: 0, w: 0, h: 0 } },
      sf: { name: '影走り', motion: 'lunge', startup: 12, active: 7, recovery: 18, damage: 10, knockX: 7, knockY: -2, hitstun: 23, effect: { preset: 'dash', color: '#c6f', strength: 1.4 }, launch: { x: 100 }, box: { x: 20, y: -85, w: 70, h: 60 } },
      sb: { name: '霞隠れ', motion: 'lunge', startup: 6, active: 4, recovery: 16, damage: 6, knockX: 5, knockY: -3, hitstun: 20, effect: { preset: 'shadow', strength: 1.3 }, launch: { x: -9 }, box: { x: 20, y: -85, w: 70, h: 50 } },
      su: { name: '昇り燕・連', motion: 'risingKick', startup: 4, active: 18, recovery: 22, damage: 3, hits: 5, hitInterval: 3, hitStop: 3, knockX: 1, knockY: -7, hitstun: 22, launch: { x: 2, y: -13 }, box: { x: -15, y: -150, w: 65, h: 130 }, // 蹴りを重ねながら真上へ昇る5段。1発は軽いが、相手を上へ運び続ける(無敵なし)
        effect: { preset: 'rising', color: '#c6f', attack: [{ type: 'crescent', angle: -1, width: 9, span: 2.4 }, { type: 'crescent', angle: -1, width: 7, span: 2, delay: 5 }, { type: 'crescent', angle: -1, width: 9, span: 2.4, delay: 10 }, { type: 'lines', count: 3, at: 'body', length: 70 }],
          hit: [{ type: 'cross', r: 18, duration: 8 }, { type: 'particles', count: 5, speed: 4, dir: 'up' }] } },
      sd: { name: '撒菱', motion: 'cast', startup: 10, active: 20, recovery: 16, damage: 5, knockX: 1, knockY: -6, hitstun: 30, effect: { preset: 'shadow', attack: [{ type: 'star', at: 'feet', x: 70, y: -6, count: 4, r: 8, spin: 4 }, { type: 'particles', at: 'feet', x: 70, count: 8, dir: 'up', speed: 2 }] }, box: { x: 20, y: -12, w: 110, h: 12 } },
      // ---- コマンド技(command に入力を書く。書き方は character.js 冒頭の【コマンド技】) ----
      c1: { name: '鎖分銅', command: '↓↘→+A', motion: 'cross', startup: 14, active: 4, recovery: 22, damage: 6, knockX: -7, knockY: -2, hitstun: 28, effect: { preset: 'thrust', color: '#c6f' }, box: { x: 30, y: -75, w: 170, h: 18 } },
      c2: { name: '影縫い', command: '↓↙←+Z', motion: 'sweep', startup: 6, active: 4, recovery: 14, damage: 6, knockX: 4, knockY: -1, hitstun: 24, effect: { color: '#6f9', attack: [{ type: 'slash', angle: 1, width: 8 }, { type: 'lines', count: 4, at: 'body' }], hit: [{ type: 'cross', r: 24 }] }, launch: { x: 6 }, box: { x: 20, y: -22, w: 80, h: 20 } },
      c3: { name: '空中苦無', command: '↓↘→+A', air: true, motion: 'cast', landLag: 6, startup: 7, active: 3, recovery: 14, damage: 0, knockX: 0, knockY: 0, hitstun: 0, effect: { preset: 'cast', color: '#c6f' }, projectile: true },
      // ---- コマンド投げ ----
      // 飯綱落とし: 一気に踏み込んでつかみ、高く跳び上がって頭から地面へ落とす。発生が速いが、つかめる範囲はせまい
      c4: { name: '飯綱落とし', command: '→↓↘+Z', motion: 'palm', startup: 4, active: 3, recovery: 26, damage: 15, knockX: 3, knockY: -6, spike: 4, hitstun: 32, hitStop: 16,
        grab: { dir: 'd', box: { x: 0, y: -90, w: 55, h: 85 }, lunge: 24, release: 34, total: 52, leap: 160, hold: { x: 18, y: 45 }, color: '#c6f',
          motion: { reach: [0.6, 1.6, 0.1, 0, 1.5, 0.1, 0, 1.0, -0.4, -0.9, 0.5, 14], hold: [-0.6, 2.6, 0.4, 0, 2.4, 0.4, 0, 1.5, -1.6, 0.6, -1.2, 0], rel: [1.1, 1.0, 0.2, 0, 1.0, 0.2, 0, 0.3, -0.4, -0.2, -0.3, 6] } },
        effect: { color: '#c6f', color2: '#ffffff', start: [{ type: 'lines', count: 4, at: 'body', length: 80 }], attack: [{ type: 'particles', at: 'feet', count: 12, dir: 'up', speed: 6, color: '#c6f' }],
          hit: [{ type: 'impact', r: 56, color: '#3a1a5a', color2: '#ffffff' }, { type: 'ring', at: 'feet', flat: true, r: 100, width: 7 }, { type: 'text', text: '飯綱!', at: 'head' }, { type: 'shake', duration: 12, power: 7 }] } },
      // ---- ゲージ技(Z と A を同時押し)・超必殺技(↓ を押しながら Z と A) ----
      gx: { name: '瞬影', cost: 20, invincible: 8, motion: 'lunge', startup: 5, active: 7, recovery: 18, damage: 9, knockX: 12, knockY: -4, hitstun: 26, launch: { x: 16 }, box: { x: 0, y: -95, w: 75, h: 75 },
        effect: { preset: 'shadow', strength: 2, attack: [{ type: 'lines', count: 8, length: 140, at: 'body' }, { type: 'crescent', width: 10, span: 2.6 }], hit: [{ type: 'cross', r: 36, color: '#c6f' }, { type: 'star', count: 4, r: 18, spin: 2 }] } },
      sx: { name: '千本桜・苦無時雨', super: true, cost: 80, invincible: 12, minScale: 0.75, motion: 'cast', startup: 8, active: 3, recovery: 30, damage: 0, knockX: 0, knockY: 0, hitstun: 0, box: { x: 0, y: 0, w: 0, h: 0 }, // 空から苦無が10本、扇のように降りそそぐ(画面の前半分をおおう)
        projectile: { speed: 12, damage: 5, radius: 11, life: 90, count: 10, spread: 0.9, knockX: 2, knockY: -4, hitstun: 26, look: 'kunai', path: { type: 'arc', up: 0, gravity: 0.08, angle: 35 }, from: { x: 30, y: -260 } },
        effect: { color: '#ff9ccc', color2: '#ffffff', start: [{ type: 'orb', at: 'body', r: 40, duration: 8, follow: true, blend: 'add', color: '#c6f' }],
          attack: [{ type: 'flash', at: 'head', y: -150, r: 120, blend: 'add', duration: 14 }, { type: 'particles', at: 'head', y: -150, count: 30, dir: 'all', speed: 5, gravity: 0.05, life: 40 }, { type: 'text', text: '千本桜', at: 'head' }] } },
    },
  },
  {
    name: 'ゴーレム',
    desc: '岩石:一撃が重い・アーマー技・叩きつけ・吹っ飛びにくい・盾100',
    // 性能
    stats: { hp: 125, jumpStartup: 8, landLag: 6, airLandLag: 14, speed: 2.4, jump: -10, airJumps: 0, gravityMul: 1.1, knockbackTaken: 0.6, shield: 100, dashSpeed: 6 },
    ko: { type: 'collapse', drift: 1.5, keys: [[16, 'kneel'], [14, 'kneelLow'], [18, 'fallFront']], lie: 'front', thud: 26, dust: '#b9a58a' }, // ひざから崩れ落ち、前へ倒れて土煙
    sp: { max: 120, time: 0.01, hit: 0.5, hurt: 0.5, guard: 1.4, jg: 8, color: '#d8b48a' }, // SP ゲージ: 守ってためる(ガード・ジャスガで多く増える)
    // 飛び道具(Aキー)  speed=速度 damage=威力 radius=大きさ life=飛距離F count=発射数
    projectile: { speed: 3, damage: 10, radius: 26, life: 150, look: 'stone' },
    // 見た目  color=体の色(服・スキンの基準) skin=肌の色  ※体の大きさ・服の色は drawing_character.js の body に書く
    look: {
      smooth: { atk: 0.4, move: 0.18 }, // 動きの追従の速さ(0〜1。大きいほどキビキビ、小さいほど重い)
      color: '#8a8f9c', skin: '#99a',
    },
    zones: { head: { dmg: 1.15, label: 'HEAD' }, legs: { dmg: 0.6 } }, // 頑丈
    throw: {
      reach: [0.3, 1.5, 0.4, 0, 1.4, 0.4, 0, 0.8, -0.5, -0.5, 0.4, 8], // つかみに行く姿勢
      name: '投げ', box: { x: -10, y: -100, w: 100, h: 100 }, // 掴み判定(x:前方向の開始位置 y:足元から(マイナスが上) w,h:大きさ)
      startup: 9, active: 5, whiff: 34, release: 40, total: 68, // 発生/持続/空振り後隙/投げる瞬間/全体F(60F≒1秒)
      f: { name: '岩落とし', damage: 15, vx: 7, vy: -6, hitstun: 26, hold: { x: 30, y: 120 }, release: 42, total: 70, stop: 16,
        motion: { hold: [-0.25, 3.0, 0.2, 0, 2.9, 0.2, 0, 0.5, -0.5, -0.4, 0.4, 0], rel: [0.85, 1.0, 0.2, 0, 0.9, 0.2, 0, 1.0, -1.2, -0.7, 1.0, 12], held: [0.1, 0.4, 0.2, 0, 0.3, 0.2, 0, 0.2, -0.3, -0.2, 0.3, 0] },
        effect: { preset: 'boulder', hit: [{ type: 'impact', r: 56, color: '#5a4a38', color2: '#fff0d0' }, { type: 'debris', at: 'hit', count: 10, speed: 7, duration: 30 }, { type: 'shake', duration: 12, power: 7 }] } },
      b: { name: '後方岩投げ', damage: 14, vx: 9, vy: -7, hitstun: 26, swing: 0.5, hold: { x: 55, y: 60 }, release: 40, total: 66,
        motion: { hold: [-0.4, 1.6, 0.2, 0, 1.5, 0.2, 0, 0.6, -0.6, -0.5, 0.5, 0], rel: [-0.5, 2.6, 0.3, 0, 2.6, 0.3, 0, 0.4, -0.4, -0.4, 0.4, -12], held: [-1.5, 2.6, 0.2, 0, 2.6, 0.2, 0, 0.1, 0, -0.1, 0, 0] },
        effect: { preset: 'boulder', hit: [{ type: 'impact', r: 48, color: '#5a4a38', color2: '#fff0d0' }, { type: 'debris', at: 'hit', count: 8, speed: 6, duration: 30 }] } },
      u: { name: '岩の打ち上げ', damage: 6, vx: 1, vy: -12, hitstun: 30, hold: { x: 30, y: 60 }, release: 40, hits: [{ at: 12, damage: 6 }],
        motion: { hold: [0.35, 1.5, 1.2, 0, 1.4, 1.2, 0, 0.9, -1.3, -0.6, 1.0, 0], rel: [-0.3, 3.1, 0.05, 0, 3.0, 0.05, 0, 0.2, -0.2, -0.2, 0.2, 4], held: [0.1, 0.4, 0.2, 0, 0.3, 0.2, 0, 0.2, -0.3, -0.2, 0.3, 0] },
        effect: { preset: 'boulder', hit: [{ type: 'impact', r: 40, color: '#5a4a38', color2: '#fff0d0' }, { type: 'debris', at: 'hit', count: 6, dir: 'up', speed: 7, duration: 30 }] } },
      d: { name: '地割れ叩き', damage: 17, vx: 3, vy: -7, hitstun: 30, hold: { x: 20, y: 125 }, release: 44, total: 72, spike: 6, stop: 20,
        motion: { hold: [-0.25, 3.0, 0.2, 0, 2.9, 0.2, 0, 0.5, -0.5, -0.4, 0.4, 0], rel: [0.85, 1.0, 0.2, 0, 0.9, 0.2, 0, 1.0, -1.2, -0.7, 1.0, 12], held: [-1.5, 2.6, 0.2, 0, 2.6, 0.2, 0, 0.1, 0, -0.1, 0, 0] },
        effect: { preset: 'quake', hit: [{ type: 'impact', r: 64, color: '#5a4a38', color2: '#fff0d0' }, { type: 'wave', at: 'feet', width: 12, grow: 1.5 }, { type: 'debris', at: 'hit', count: 14, speed: 8, duration: 34 }, { type: 'shake', duration: 16, power: 10 }] } },
    },
    poses: {
      // 全モーション共通の基本姿勢(角度。0=真下/正=前) [lean,右肩,右肘,右手首,左肩,左肘,左手首,右腿,右膝,左腿,左膝,前後ずれ]
      idle: [0, 0.4, 1, 0, 0.4, 1, 0, 0.3, -0.1, -0.3, 0.1, 0], // 待機
      walk: [0.02, 0.15, 0.35, 0.15], // 歩き [lean,腕の振り,脚の振り,膝の曲げ]
      guard: [-0.03, 1.5, 1, 0, 1.5, 1, 0, 0.3, -0.1, -0.3, 0.1, 0], // シールド
      crouch: [0.25, 0.4, 1, 0, 0.4, 1, 0, 0.95, -1.3, -0.95, 1.3, 0], // しゃがみ・着地・ジャンプ前
      jumpSquat: [0.45, -0, 0.9, 0, -0.1, 0.9, 0, 1.38, -2.1, -1.2, 2.1, -2], // ジャンプ前隙(跳ぶ前にため込む)
      landing: [0.47, 1.48, 0.4, 0, 1.17, 0.5, 0, 1.44, -1.92, -0.6, 1.08, 4], // 着地隙(衝撃を受け止める)
      dashF: [0.15, 0.9, 1.3, 0, -0.4, 1.4, 0, 1.1, -0.5, -1, 0.5, 0], // 前ダッシュ
      dashB: [-0.15, 0.6, 1.7, 0, 0.4, 1.9, 0, 0.7, -0.9, 0.1, -0.4, 0], // バックステップ
      jumpUp: [0, 0.45, 1.3, 0, 0.2, 1.5, 0, 0.16, -0.26, 0.3, -0.2, 0], // 上昇
      fall: [0, 0.65, 0.9, 0, 0.45, 0.9, 0, 0.1, -0.14, 0.1, -0.08, 0], // 落下
    },
    // 技ごとのモーション(w=振りかぶり s=打ち出し)。書き換えると、その技の動きが変わります
    motions: {
      n: { w: [-0.1, -0.84, 1.92, 0, 0.57, 1.49, 0, 0.31, -0.27, -0.3, 0.25, -11.24], s: [0.22, 1.45, -0.27, 0, 0.36, 1.46, 0, 0.55, -0.26, -0.51, 0.21, 16.27] },
      f: { w: [-0.14, 0.1, 1.78, 0, 0.33, 1.59, 0, 0.51, -0.16, -0.29, 0.13, -12.42], s: [0.25, 1.49, -0.39, 0, 1.51, -0.47, 0, 0.49, -0.23, -0.28, 0.2, 12.67] },
      u: { w: [0.25, -0.75, 0.55, 0, 0.45, 1.15, 0, 0.55, -0.55, -0.45, 0.4, -8], s: [-0.3, 3.45, 0.2, 0, 0.55, 1.3, 0, 0.3, -0.15, -0.45, 0.3, 4] }, // 腕を後ろ下から頭の上まで大きく振り上げて払う
      d: { w: [-0.12, 0.55, 1.1, 0, 0.5, 1.1, 0, 1.35, -1.55, -0.3, 0.2, -3], s: [0.2, 0.75, 0.95, 0, 0.65, 1, 0, 0.5, -0.05, -0.4, 0.3, 8] }, // 片足を高く上げて、前の地面を踏み抜く
      da: { w: [0.54, -1.39, 1.76, 0, 1.02, 0.93, 0, 1.1, -0.7, -0.91, 0.51, -17.67], s: [0.94, -0.24, 0.11, 0, 0.33, 0.13, 0, 1, 0.02, -0.91, 0.29, 30.64] },
      an: { w: [-0.37, 3.82, -0.45, 0, 0.7, 1.35, 0, 0.3, -0.3, -0.35, 0.24, -7.97], s: [0.55, 1.07, -0.2, 0, 0.46, 1.47, 0, 0.74, -0.18, -0.65, 0.13, 14.25] },
      af: { w: [-0.45, 3.35, 0.35, 0, 3.25, 0.35, 0, 0.95, -1.25, 0.35, -1.05, -4], s: [0.6, 0.75, 0.05, 0, 0.68, 0.05, 0, 0.7, -0.9, 0.2, -0.8, 10] }, // 両拳を頭の上で組み、斜め下へ振り下ろす
      au: { w: [-0.1, -0.05, 1.1, 0, 0.25, 0.92, 0, 0.47, -0.88, -0.38, 0.93, 0.93], s: [-0.08, 2.75, -0.24, 0, 0.47, 1.23, 0, 0.19, -0.04, -0.18, 0.07, 7.75] },
      ad: { w: [0.18, 0.37, 1.07, 0, 0.6, 0.88, 0, 0.85, -1.57, 0.51, -1.68, -0.32], s: [0.12, 0.95, 0.68, 0, 1.07, 0.56, 0, 0.19, 0.22, -0.13, -0.17, -0.43] },
      s: { w: [-0.4, 3.92, -0.8, 0, 4.1, -0.92, 0, 0.36, -0.32, -0.55, 0.25, -6.04], s: [0.73, 0.58, -0.11, 0, 0.8, -0.22, 0, 0.67, -0.22, -0.67, 0.26, 13.97] },
      sf: { w: [0.31, -1.66, 2.36, 0, 0.83, 1.06, 0, 1.46, -0.83, -0.85, 0.54, -17.51], s: [0.73, 1.34, -0.21, 0, 1.45, -0.26, 0, 1.04, -0, -0.9, 0.33, 26.26] },
      su: { w: [0.08, 0.06, 1.24, 0, 0.39, 1.34, 0, 0.67, -0.74, -0.39, 0.71, 1.53], s: [-0.26, 2.98, -0.21, 0, 0.63, -0.15, 0, 0.88, -1.22, 0.02, -0.49, 5.89] },
    },
    crouchParry: { dmg: 0.25, stun: 0.3, knock: 0.12 }, // 最も硬い
    combos: ['↓Z→→A→↑A (3HIT・重い3連撃)', '空中→Z(双岩槌で叩きつけ)→バウンドに↑Z(岩腕払い)'],
    moves: {
      // 石の体: 出が遅いかわりに一撃が重い。重い技はアーマー(armor: 回数)で殴られても止まらない。spike=叩きつけ(地面でバウンド)
      n: { name: '岩拳', motion: 'jab', startup: 8, active: 3, recovery: 12, damage: 9, knockX: 1.6, knockY: -1.2, hitstun: 24, effect: { preset: 'rock', hit: [{ type: 'impact', r: 34, color: '#5a4a38', color2: '#fff0d0' }, { type: 'debris', count: 4, speed: 4, dir: 'all', duration: 24 }, { type: 'shake', duration: 6, power: 3 }] }, box: { x: 30, y: -72, w: 52, h: 26 } }, // 全キャラで一番遅いジャブ
      f: { name: '双岩掌', motion: 'palm', startup: 17, active: 4, recovery: 26, damage: 20, armor: 1, hitStop: 18, knockX: 8, knockY: -2.5, hitstun: 32, effect: { preset: 'boulder', strength: 1.2 }, box: { x: 30, y: -80, w: 95, h: 40 } },
      b: { name: '裏拳岩撃', motion: 'spinBack', startup: 14, active: 5, recovery: 24, damage: 13, hitStop: 14, knockX: 6, knockY: -3, hitstun: 26, effect: { preset: 'boulder', size: 0.85 }, box: { x: -85, y: -95, w: 170, h: 50 } }, // 体を回して前後をまとめて殴る(回り込み対策)
      u: { name: '岩腕払い', motion: 'uppercut', startup: 11, active: 8, recovery: 24, damage: 15, hitStop: 16, knockX: 6, knockY: -10, hitstun: 32, box: { x: -45, y: -190, w: 140, h: 110 }, // 頭上を巨大な腕で払う。頭の上と前上をまとめて守る対空。当たると斜め上へ飛ばす
        effect: { preset: 'boulder', attack: [{ type: 'crescent', angle: -1, width: 22, span: 3.4, r: 78, duration: 14 }, { type: 'crescent', angle: -1, width: 8, span: 3, r: 60, duration: 10, delay: 2, color: '#e8d8b8' },
          { type: 'debris', count: 5, dir: 'up', speed: 5, duration: 28, color: '#8a7a68' }, { type: 'lines', count: 3, at: 'body' }] } },
      d: { name: '地響き', motion: 'stomp', startup: 14, active: 4, recovery: 20, damage: 9, hitStop: 14, knockX: 2, knockY: -4, hitstun: 26, box: { x: 20, y: -22, w: 130, h: 22 }, // 地面を踏み鳴らし、遠くまで揺らす下段
        effect: { preset: 'quake', size: 0.75, attack: [{ type: 'wave', at: 'feet', x: 90, width: 8, grow: 1.6, duration: 16 }, { type: 'debris', at: 'feet', x: 110, count: 6, speed: 6, dir: 'up', duration: 30 }, { type: 'shake', duration: 8, power: 4 }] } },
      da: { name: '岩盤ショルダー', motion: 'shoulder', startup: 14, active: 6, recovery: 24, damage: 18, armor: 1, hitStop: 16, knockX: 8, knockY: -3, hitstun: 31, effect: { preset: 'tackle', color: '#d8b48a', hit: [{ type: 'impact', r: 48, color: '#5a4a38', color2: '#fff0d0' }, { type: 'debris', count: 8, speed: 6, dir: 'forward', duration: 30 }, { type: 'shake', duration: 10, power: 6 }] }, launch: { x: 9 }, box: { x: 25, y: -85, w: 72, h: 65 } },
      an: { name: '空中岩槌', motion: 'chop', landLag: 11, startup: 7, active: 6, recovery: 12, damage: 11, hitStop: 12, knockX: 2, knockY: -1.5, hitstun: 22, effect: { preset: 'rock', strength: 1.2 }, box: { x: 20, y: -72, w: 62, h: 44 } },
      af: { name: '双岩槌', motion: 'slam', landLag: 18, startup: 12, active: 5, recovery: 18, damage: 16, hitStop: 18, knockX: 3, knockY: 13, hitstun: 28, spike: 7, launch: { x: 2, y: 4 }, box: { x: 10, y: -50, w: 88, h: 88 }, // 斜め下へ両拳を振り下ろす。叩きつけ(地面でバウンド)
        effect: { preset: 'boulder', attack: [{ type: 'crescent', angle: 1, width: 20, span: 2.4, duration: 12 }, { type: 'particles', count: 6, dir: 'down', speed: 5, color: '#b9a58a' }],
          hit: [{ type: 'impact', r: 50, color: '#5a4a38', color2: '#fff0d0' }, { type: 'debris', count: 8, speed: 6, dir: 'down', duration: 30, color: '#8a7a68' }, { type: 'flash', r: 50, blend: 'add', duration: 6, color: '#ffe2b0' }, { type: 'shake', duration: 12, power: 8 }] } },
      au: { name: '天衝岩掌', motion: 'uppercut', landLag: 13, startup: 8, active: 5, recovery: 15, damage: 12, hitStop: 12, knockX: 1, knockY: -6, hitstun: 28, effect: { preset: 'upper', color: '#d8b48a', hit: [{ type: 'impact', r: 36, color: '#5a4a38', color2: '#fff0d0' }, { type: 'debris', count: 5, dir: 'up', duration: 26 }] }, box: { x: -30, y: -145, w: 70, h: 85 } },
      ad: { name: 'メテオスタンプ', motion: 'stomp', landLag: 25, startup: 14, active: 6, recovery: 21, damage: 16, hitStop: 16, knockX: 1.4, knockY: 8, hitstun: 31, spike: 5, effect: { preset: 'stomp', color: '#d8b48a', strength: 1.5, hit: [{ type: 'impact', r: 44, color: '#5a4a38', color2: '#fff0d0' }, { type: 'debris', count: 8, speed: 6, duration: 30 }, { type: 'ring', flat: true, r: 50, width: 6 }, { type: 'shake', duration: 10, power: 7 }] }, launch: { x: 0, y: 10 }, box: { x: -25, y: -10, w: 55, h: 80 } },
      s: { name: 'ストーンボール', motion: 'slam', startup: 19, active: 3, recovery: 33, damage: 0, knockX: 0, knockY: 0, hitstun: 0, effect: { preset: 'quake', size: 0.8 }, box: { x: 0, y: 0, w: 0, h: 0 } },
      sf: { name: '岩盤タックル', motion: 'lunge', startup: 16, active: 7, recovery: 30, damage: 24, armor: 1, hitStop: 18, knockX: 7, knockY: -3.6, hitstun: 36, effect: { preset: 'tackle', color: '#d8b48a', strength: 1.5, hit: [{ type: 'impact', r: 52, color: '#5a4a38', color2: '#fff0d0' }, { type: 'debris', count: 10, speed: 7, dir: 'forward', duration: 30 }, { type: 'shake', duration: 12, power: 7 }] }, launch: { x: 9 }, box: { x: 20, y: -85, w: 77, h: 60 } },
      sb: { name: 'ストーンウォール', motion: 'cast', startup: 10, active: 12, recovery: 26, damage: 8, knockX: 10, knockY: -2, hitstun: 20, effect: { preset: 'barrier', color: '#d8b48a', attack: [{ type: 'debris', at: 'hitbox', count: 8, dir: 'up', speed: 6, duration: 30 }, { type: 'ring', at: 'body', r: 70, width: 7, grow: 1.1, duration: 14 }, { type: 'shake', duration: 6, power: 3 }] }, box: { x: 10, y: -120, w: 60, h: 120 } },
      su: { name: '大地の怒り', motion: 'rising', startup: 15, active: 6, recovery: 46, damage: 13, armor: 1, hitStop: 16, knockX: 4, knockY: -12, hitstun: 32, box: { x: -60, y: -170, w: 120, h: 170 }, // 跳ばずに、まわり全体から岩が噴き上がる。アーマー1回(前後の飛び込みをまとめて落とす)
        effect: { preset: 'quake', strength: 1.4, attack: [{ type: 'debris', at: 'feet', x: -40, count: 6, dir: 'up', speed: 9, duration: 30 }, { type: 'debris', at: 'feet', x: 40, count: 6, dir: 'up', speed: 9, duration: 30 }, { type: 'wave', at: 'feet', width: 9, grow: 1.4 }, { type: 'shake', duration: 12, power: 6 }],
          hit: [{ type: 'impact', r: 46, color: '#5a4a38', color2: '#fff0d0' }, { type: 'debris', count: 8, dir: 'up', speed: 7, duration: 30 }] } },
      sd: { name: '大地割り', motion: 'slam', startup: 22, active: 6, recovery: 34, damage: 24, hitStop: 18, knockX: 2, knockY: -12, hitstun: 40, effect: { preset: 'quake', strength: 1.8 }, box: { x: -30, y: -30, w: 200, h: 30 } },
      // ---- コマンド技(command に入力を書く。書き方は character.js 冒頭の【コマンド技】) ----
      c1: { name: '岩柱', command: '↓↓+A', motion: 'slam', startup: 18, active: 8, recovery: 28, damage: 14, knockX: 1, knockY: -11, hitstun: 32, effect: { preset: 'quake', attack: [{ type: 'debris', at: 'feet', x: 120, count: 10, speed: 7, dir: 'up', duration: 34 }, { type: 'wave', at: 'feet', x: 120, width: 8 }, { type: 'shake', duration: 8, power: 4 }] }, box: { x: 90, y: -140, w: 60, h: 140 } },
      c2: { name: '岩砕拳', command: '←→+Z', motion: 'cross', startup: 24, active: 4, recovery: 30, damage: 32, armor: 2, hitStop: 22, knockX: 12, knockY: -5, hitstun: 36, effect: { preset: 'boulder', strength: 2, hit: [{ type: 'impact', r: 64, color: '#5a4a38', color2: '#fff0d0' }, { type: 'debris', count: 14, speed: 8, dir: 'forward', duration: 34 }, { type: 'flash', r: 70, blend: 'add', duration: 8, color: '#ffe2b0' }, { type: 'text', text: 'ゴシャッ!', at: 'hit' }, { type: 'shake', duration: 16, power: 10 }] }, box: { x: 30, y: -90, w: 90, h: 45 } },
      // ---- コマンド投げ ----
      // 岩締め: 大きな手で遠くからつかみ、3回しめつけてから放り投げる。出は遅いが、つかめる範囲が広い
      c3: { name: '岩締め', command: '↓↘→+Z', motion: 'palm', startup: 11, active: 4, recovery: 40, damage: 8, knockX: 9, knockY: -5, hitstun: 30, hitStop: 14,
        grab: { dir: 'f', box: { x: 0, y: -105, w: 105, h: 100 }, release: 46, total: 70, hold: { x: 58, y: 70 }, color: '#d8b48a',
          hits: [{ at: 12, damage: 5 }, { at: 22, damage: 5 }, { at: 32, damage: 5 }],
          motion: { hold: [0.1, 2.0, 0.6, 0, 1.9, 0.7, 0, 0.5, -0.5, -0.4, 0.4, 0], rel: [0.6, 1.4, 0.1, 0, 1.3, 0.1, 0, 0.9, -0.3, -0.8, 0.4, 14], held: [0.1, 0.4, 0.2, 0, 0.3, 0.2, 0, 0.2, -0.3, -0.2, 0.3, 0] } },
        effect: { color: '#d8b48a', color2: '#fff0d0', attack: [{ type: 'debris', at: 'hit', count: 4, speed: 4, duration: 24 }], hit: [{ type: 'impact', r: 40, color: '#5a4a38', color2: '#fff0d0' }, { type: 'debris', at: 'hit', count: 6, speed: 5, dir: 'all', duration: 26 }, { type: 'shake', duration: 8, power: 5 }] } },
      // ---- ゲージ技(Z と A を同時押し)・超必殺技(↓ を押しながら Z と A) ----
      gx: { name: '岩鎧拳', cost: 40, armor: 3, motion: 'cross', startup: 16, active: 5, recovery: 30, damage: 20, knockX: 13, knockY: -5, hitstun: 36, box: { x: 30, y: -100, w: 95, h: 50 },
        effect: { preset: 'rock', strength: 2, start: [{ type: 'orb', at: 'body', r: 48, duration: 16, follow: true, color: '#d8b48a' }], hit: [{ type: 'debris', count: 10, speed: 7, duration: 30 }, { type: 'impact', r: 56, color: '#d8b48a' }, { type: 'shake', duration: 12, power: 8 }] } },
      sx: { name: '大地崩壊', super: true, cost: 120, invincible: 26, minScale: 0.8, motion: 'slam', startup: 24, active: 12, recovery: 44, damage: 15, hits: 3, hitInterval: 4, knockX: 1, knockY: -2, hitstun: 44, low: true, box: { x: -300, y: -40, w: 700, h: 40 }, // 画面の地面全部が割れる。地上にいれば必ず当たる下段だが、跳んでいれば当たらない
        effect: { preset: 'quake', strength: 3, start: [{ type: 'orb', at: 'body', r: 70, duration: 24, follow: true, color: '#d8b48a' }],
          attack: [{ type: 'ring', flat: true, at: 'feet', r: 320, width: 10 }, { type: 'wave', at: 'feet', width: 14, strength: 2 }, { type: 'debris', at: 'feet', x: 120, count: 14, speed: 9, duration: 36 }, { type: 'debris', at: 'feet', x: -120, count: 14, speed: 9, duration: 36 },
            { type: 'debris', at: 'feet', x: 260, count: 8, speed: 8, delay: 4, duration: 36 }, { type: 'debris', at: 'feet', x: -260, count: 8, speed: 8, delay: 4, duration: 36 }, { type: 'text', text: 'ゴゴゴ…', at: 'head' }, { type: 'shake', duration: 30, power: 10 }],
          hit: [{ type: 'impact', r: 40, color: '#5a4a38', color2: '#fff0d0' }, { type: 'debris', count: 6, dir: 'up', speed: 7, duration: 30 }] } },
    },
  },
  {
    name: 'バーサク',
    desc: '狂戦士(血):瀕死で狂化(火力×1.15)・吸血・血の代償・盾30',
    // 性能
    stats: { hp: 110, jumpStartup: 4, landLag: 4, airLandLag: 10, speed: 4.8, jump: -13.5, knockbackTaken: 1.25, shield: 30, damageMul: 1.05 },
    ko: { type: 'collapse', drift: 2, keys: [[8, 'stagger'], [8, 'stagger2'], [8, 'stagger'], [14, 'kneel'], [16, 'fallFront']], lie: 'front', thud: 16, dust: '#8a0016' }, // よろめきながらひざをつき、前のめりに倒れる(血だまり)
    sp: { max: 100, time: 0.008, hit: 0.5, hurt: 0.65, combo: 1.5, color: '#e0203a' }, // SP ゲージ: 殴られるほどたまる(逆転の超必殺技)
    rage: { hp: 0.35, dmg: 1.15 }, // 狂化: 体力が35%以下になると与えるダメージ ×1.15。体から血の霧が立ちのぼる(effect.js の狂化のオーラ)
    // 飛び道具(Aキー)  speed=速度 damage=威力 radius=大きさ life=飛距離F count=発射数
    projectile: { speed: 7, damage: 11, radius: 18, life: 26, look: 'bloodWave' }, // 血風刃: 短い距離を飛ぶ血の刃
    // 見た目  color=体の色(服・スキンの基準) skin=肌の色  ※体の大きさ・服の色は drawing_character.js の body に書く
    look: {
      smooth: { atk: 0.75, move: 0.32 }, // 動きの追従の速さ(0〜1。大きいほどキビキビ、小さいほど重い)
      color: '#c33', skin: '#c8845a',
    },
    throw: {
      reach: [0.6, 1.6, 0.2, 0, 1.5, 0.2, 0, 1.0, -0.5, -0.8, 0.5, 14], // つかみに行く姿勢
      name: '投げ', box: { x: 0, y: -85, w: 65, h: 75 }, // 掴み判定(x:前方向の開始位置 y:足元から(マイナスが上) w,h:大きさ)
      startup: 5, active: 3, whiff: 28, release: 36, total: 60, // 発生/持続/空振り後隙/投げる瞬間/全体F(60F≒1秒)
      f: { name: '喰らいつき投げ', damage: 10, vx: 10, vy: -6, hitstun: 26, hold: { x: 32, y: 60 }, release: 32, drain: 0.3, hits: [{ at: 10, damage: 4, drain: 0.5 }],
        motion: { hold: [0.6, 1.6, 0.5, 0, 1.4, 0.6, 0, 0.8, -0.8, -0.5, 0.6, 4], rel: [0.5, 1.6, 0.05, 0, 1.5, 0.05, 0, 0.8, -0.3, -0.8, 0.3, 14], held: [-0.4, 2.2, 1.0, 0, 1.6, 1.2, 0, 0.8, -1.0, -0.4, 0.6, 0] },
        effect: { color: '#c8102e', color2: '#ff8a8a', hit: [{ type: 'impact', r: 30, color: '#4a0010', color2: '#ff4a5a' }, { type: 'blood', at: 'hit', count: 10, speed: 5, dir: 'all' }] } },
      b: { name: '振り回し投げ', damage: 13, vx: 11, vy: -7, hitstun: 26, swing: 1.5, hold: { x: 58, y: 50 }, release: 44, total: 66,
        motion: { hold: [-0.4, 1.6, 0.2, 0, 1.5, 0.2, 0, 0.6, -0.6, -0.5, 0.5, 0], rel: [-0.5, 2.6, 0.3, 0, 2.6, 0.3, 0, 0.4, -0.4, -0.4, 0.4, -12], held: [-1.5, 2.6, 0.2, 0, 2.6, 0.2, 0, 0.1, 0, -0.1, 0, 0] },
        effect: { color: '#c8102e', color2: '#ff8a8a', hit: [{ type: 'impact', r: 44, color: '#4a0010', color2: '#ff4a5a' }, { type: 'blood', at: 'hit', count: 14, speed: 6, dir: 'all' }, { type: 'shake', duration: 10, power: 6 }] } },
      u: { name: '放り投げ', damage: 6, vx: 1, vy: -14, hitstun: 30, release: 30, hits: [{ at: 18, damage: 3 }],
        motion: { hold: [0.35, 1.5, 1.2, 0, 1.4, 1.2, 0, 0.9, -1.3, -0.6, 1.0, 0], rel: [-0.3, 3.1, 0.05, 0, 3.0, 0.05, 0, 0.2, -0.2, -0.2, 0.2, 4], held: [0.3, 2.0, 1.5, 0, 1.8, 1.6, 0, 1.4, -1.8, 1.2, -1.6, 0] },
        effect: { color: '#c8102e', color2: '#ff8a8a', hit: [{ type: 'claw', angle: -1, count: 3, width: 9 }, { type: 'blood', at: 'hit', count: 8, speed: 5, dir: 'up' }] } },
      d: { name: '血祭り叩き', damage: 9, vx: 3, vy: -7, hitstun: 30, hold: { x: 25, y: 105 }, release: 42, total: 66, spike: 5, hits: [{ at: 14, damage: 3 }, { at: 26, damage: 3 }],
        motion: { hold: [-0.25, 3.0, 0.2, 0, 2.9, 0.2, 0, 0.5, -0.5, -0.4, 0.4, 0], rel: [0.85, 1.0, 0.2, 0, 0.9, 0.2, 0, 1.0, -1.2, -0.7, 1.0, 12], held: [0.1, 0.4, 0.2, 0, 0.3, 0.2, 0, 0.2, -0.3, -0.2, 0.3, 0] },
        effect: { color: '#c8102e', color2: '#ff8a8a', hit: [{ type: 'impact', r: 44, color: '#4a0010', color2: '#ff4a5a' }, { type: 'blood', at: 'hit', count: 12, speed: 6, dir: 'all' }, { type: 'shake', duration: 8, power: 5 }] } },
    },
    poses: {
      // 全モーション共通の基本姿勢(角度。0=真下/正=前) [lean,右肩,右肘,右手首,左肩,左肘,左手首,右腿,右膝,左腿,左膝,前後ずれ]
      idle: [0.5, 0.3, 1.9, 0, 0.2, 2, 0, 0.7, -0.6, -0.3, 0.7, 0], // 待機
      walk: [0.45, 0.5, 0.8, 0.9], // 歩き [lean,腕の振り,脚の振り,膝の曲げ]
      guard: [0.47, 1, 2.2, 0, 1, 2.2, 0, 0.7, -0.6, -0.3, 0.7, 0], // シールド
      crouch: [0.75, 0.3, 1.9, 0, 0.2, 2, 0, 0.95, -1.3, -0.95, 1.3, 0], // しゃがみ・着地・ジャンプ前
      jumpSquat: [0.95, 0.05, 0.9, 0, -0.25, 0.9, 0, 1.26, -1.93, -1.1, 1.93, -2], // ジャンプ前隙(跳ぶ前にため込む)
      landing: [0.96, 1.35, 0.4, 0, 0.9, 0.5, 0, 1.32, -1.76, -0.55, 0.99, 4], // 着地隙(衝撃を受け止める)
      dashF: [1.1, 0.9, 1.3, 0, -0.4, 1.4, 0, 1.1, -0.5, -1, 0.5, 0], // 前ダッシュ
      dashB: [-0.1, 0.6, 1.7, 0, 0.4, 1.9, 0, 0.7, -0.9, 0.1, -0.4, 0], // バックステップ
      jumpUp: [0.3, 0.72, 1.3, 0, 0.32, 1.5, 0, 0.72, -1.17, 0.3, -0.9, 0], // 上昇
      fall: [0.3, 1.04, 0.9, 0, 0.72, 0.9, 0, 0.45, -0.63, 0.1, -0.36, 0], // 落下
    },
    // 技ごとのモーション(w=振りかぶり s=打ち出し)。書き換えると、その技の動きが変わります
    motions: {
      n: { w: [-0.32, -1.55, 0.47, 0, 0.64, 1.95, 0, 0.61, -0.62, -0.52, 0.49, -12.71], s: [0.64, 2.05, 1.15, 0, 0.27, 2.06, 0, 1.07, -0.57, -0.46, 0.53, 22.28] },
      f: { w: [-0.51, 3.74, 0.02, 0, 0.49, 1.72, 0, 0.66, -0.51, -0.42, 0.61, -7.78], s: [0.69, 1.13, -0.24, 0, 0.26, 1.94, 0, 0.91, -0.32, -0.91, 0.44, 18.42] },
      u: { w: [-0.27, 0, 1.46, 0, 0.31, 1.42, 0, 0.82, -1.03, -0.16, 1.15, 0.61], s: [0.06, 3.48, -0.18, 0, 0.41, 1.64, 0, 0.23, -0.06, -0.18, 0.39, 5.02] },
      d: { w: [-0.33, 0.05, 1.82, 0, 0.31, 1.76, 0, 1.49, -1.9, -0.7, 1.11, -7.76], s: [0.49, 0.39, 1.61, 0, 0.48, 1.61, 0, 2.03, 0.24, -0.58, -1.36, 24.19] },
      da: { w: [0.57, -1.24, 2.08, 0, 0.77, 1.38, 0, 1.15, -1, -0.86, 0.7, -17.76], s: [1.2, -0.61, 0.37, 0, 0.35, 0.36, 0, 1.33, -0.28, -0.94, 0.54, 32.05] },
      an: { w: [-0.79, -0.45, 0.31, 0, -0.4, 0.22, 0, 0.83, -0.48, -0.59, 0.79, -12.65], s: [0.82, 1.68, -0.25, 0, -0.38, 0.71, 0, 0.83, -0.5, -0.81, 0.52, 25] },
      af: { w: [-0.08, 0.44, 1.93, 0, 0.3, 1.9, 0, 0.49, -0.39, -0.21, 0.53, -3.9], s: [0.5, 0.78, 1.67, 0, 1.17, 1.54, 0, 2.1, -2.02, -0.37, 0.29, 22.06] },
      au: { w: [-0.05, 0.04, 1.14, 0, 0.01, 1.11, 0, 0.87, -1.56, 0.52, -1.04, 0.12], s: [-0.43, 1.38, 0.25, 0, 1.07, 0.01, 0, 3.34, 0.24, 0.24, -0.09, 6.2] },
      ad: { w: [0.17, 0.24, 1.45, 0, 0.62, 1.44, 0, 0.99, -1.79, 0.26, -1.36, -2.61], s: [0.35, 0.96, 0.93, 0, 1.07, 0.74, 0, 0.31, 0.07, -0.07, 0.15, -2.85] },
      s: { w: [-0.35, 3.35, 0.45, 0, 0.4, 1.8, 0, 0.6, -0.5, -0.4, 0.5, -8], s: [0.65, 0.85, 0.1, 0, 0.3, 1.9, 0, 0.95, -0.4, -0.7, 0.4, 16] }, // 爪を頭の上から斜めに振り下ろし、血の刃を飛ばす
      sf: { w: [0.16, -1.46, 2.71, 0, 0.63, 1.47, 0, 1.84, -1.02, -0.78, 0.93, -15.77], s: [0.88, 1.39, -0.12, 0, 1.66, -0.17, 0, 1.18, -0.1, -1.17, 0.71, 28.07] },
      su: { w: [-0.1, 0.02, 1.78, 0, 0.39, 1.84, 0, 1.02, -0.86, -0.45, 0.98, 2.94], s: [-0.11, 3.58, -0.3, 0, 0.75, -0.07, 0, 1.2, -1.69, 0.11, -0.36, 7.94] },
      c1: { w: [0.6, 0.5, 1.7, 0, 0.45, 1.7, 0, 0.85, -0.85, -0.5, 0.6, -4], s: [-0.45, 2.3, 0.7, 0, 2.05, 0.75, 0, 0.5, -0.3, -0.5, 0.3, 0] }, // 背中を丸めてから、胸を反らして両腕を広げ吠える
    },
    combos: ['Z×2→↓Z→→A(喰らいつきで吸血)', '難:ジャンプ→空中↓Z(叩きつけ)→バウンドに↑Z→↑A'],
    moves: {
      // 血の狂戦士: 爪痕と血しぶき(effect の bloodRage / blood)。drain=吸血(与えたダメージの割合だけ回復) / bloodCost=血の代償(出すと自分の体力が減る)
      n: { name: '狂爪', motion: 'hook', startup: 3, active: 2, recovery: 12, damage: 5, drain: 0.2, knockX: 2.6, knockY: -2.3, hitstun: 17, effect: { preset: 'bloodRage', size: 0.8 }, box: { x: 30, y: -70, w: 50, h: 24 } }, // 速いが後隙が大きい。少し吸血
      f: { name: '頭蓋割り', motion: 'chop', startup: 10, active: 3, recovery: 22, damage: 13, armor: 1, knockX: 7.8, knockY: -3.4, hitstun: 22, effect: { preset: 'blood', strength: 1.4, attack: [{ type: 'claw', angle: 1, count: 3, width: 10 }, { type: 'blood', count: 7, speed: 5, dir: 'forward', spread: 0.6 }] }, box: { x: 30, y: -65, w: 91, h: 22 } }, // アーマー1回。殴られながら殴り返す
      b: { name: '噛みつき', motion: 'lunge', startup: 7, active: 3, recovery: 16, damage: 7, drain: 0.5, knockX: 2, knockY: -1, hitstun: 22, effect: { preset: 'bloodRage', attack: [{ type: 'claw', count: 2, width: 9 }, { type: 'blood', count: 8, speed: 4, dir: 'forward', spread: 0.6 }] }, box: { x: 20, y: -88, w: 42, h: 34 } }, // 密着で噛みつく。与えたダメージの半分を吸う
      u: { name: '昇り血爪', motion: 'uppercut', startup: 6, active: 4, recovery: 24, damage: 10, knockX: 1.3, knockY: -14, hitstun: 26, effect: { preset: 'bloodRage', strength: 1.3, attack: [{ type: 'claw', angle: -1, count: 3, width: 9 }, { type: 'blood', count: 8, speed: 6, dir: 'up', spread: 0.5 }] }, box: { x: -30, y: -135, w: 66, h: 75 } }, // 高く打ち上げて追撃する対空
      d: { name: '足狩り', motion: 'sweep', startup: 6, active: 3, recovery: 16, damage: 6, knockX: 2, knockY: -6, hitstun: 24, effect: { preset: 'sweep', color: '#c8102e', color2: '#ff8a8a', hit: [{ type: 'impact', r: 26, color: '#4a0010', color2: '#ff4a5a' }, { type: 'blood', count: 8, speed: 4, dir: 'up' }] }, box: { x: 25, y: -22, w: 82, h: 20 } }, // 足をすくって転ばせ、浮いた所を殴る下段
      da: { name: '狂奔', motion: 'shoulder', startup: 7, active: 5, recovery: 21, damage: 11, knockX: 10.4, knockY: -4.6, hitstun: 22, effect: { preset: 'tackle', color: '#c8102e', attack: [{ type: 'lines', count: 6, length: 110, at: 'body', color: '#7a0010' }, { type: 'blood', at: 'body', count: 6, speed: 3, dir: 'back', spread: 0.5 }, { type: 'ring', flat: true, at: 'feet', width: 5 }],
        hit: [{ type: 'impact', r: 44, color: '#4a0010', color2: '#ff4a5a' }, { type: 'blood', count: 14, speed: 7, dir: 'forward' }, { type: 'shake', duration: 8, power: 5 }] }, launch: { x: 9 }, box: { x: 25, y: -80, w: 72, h: 60 } },
      an: { name: '空中乱爪', motion: 'spinBack', landLag: 8, startup: 3, active: 9, recovery: 12, damage: 3, hits: 3, hitInterval: 3, hitStop: 4, knockX: 1.5, knockY: -2, hitstun: 16, effect: { preset: 'bloodRage', size: 0.8 }, box: { x: 20, y: -70, w: 61, h: 40 } }, // 3段の引っかき
      af: { name: '喰らい膝', motion: 'knee', landLag: 13, startup: 6, active: 5, recovery: 18, damage: 10, knockX: 6.5, knockY: 2.3, hitstun: 18, effect: { preset: 'kick', color: '#c8102e', color2: '#ff8a8a', strength: 1.3, hit: [{ type: 'impact', r: 30, color: '#4a0010', color2: '#ff4a5a' }, { type: 'blood', count: 10, speed: 5, dir: 'forward' }] }, launch: { x: 3, y: 5 }, box: { x: 25, y: -50, w: 91, h: 30 } },
      au: { name: '逆さ血爪', motion: 'flipKick', landLag: 9, startup: 4, active: 4, recovery: 15, damage: 7, knockX: 1.3, knockY: -10.3, hitstun: 20, effect: { preset: 'bloodRage', attack: [{ type: 'claw', angle: -1, count: 3, width: 8 }, { type: 'blood', count: 6, speed: 5, dir: 'up' }] }, box: { x: -30, y: -140, w: 66, h: 80 } },
      ad: { name: '血の落下', motion: 'stomp', landLag: 18, startup: 8, active: 5, recovery: 21, damage: 10, knockX: 2.6, knockY: 10.3, hitstun: 22, spike: 4, effect: { preset: 'stomp', color: '#c8102e', strength: 1.4, hit: [{ type: 'impact', r: 36, color: '#4a0010', color2: '#ff4a5a' }, { type: 'blood', count: 14, speed: 6, dir: 'all' }, { type: 'ring', flat: true, r: 40, width: 5 }, { type: 'shake', duration: 6, power: 4 }] }, launch: { x: 0, y: 10 }, box: { x: -25, y: -10, w: 55, h: 80 } },
      s: { name: '血風刃', motion: 'chop', startup: 10, active: 3, recovery: 32, damage: 0, knockX: 0, knockY: 0, hitstun: 0, effect: { color: '#c8102e', color2: '#ff8a8a', attack: [{ type: 'claw', angle: 1, count: 3, width: 9, at: 'front' }, { type: 'blood', at: 'front', count: 6, speed: 4, dir: 'forward' }] }, box: { x: 0, y: 0, w: 0, h: 0 } },
      sf: { name: '喰らいつき', motion: 'lunge', startup: 8, active: 7, recovery: 32, damage: 15, drain: 0.35, knockX: 9.8, knockY: -6.9, hitstun: 26, launch: { x: 9 }, box: { x: 20, y: -85, w: 77, h: 60 }, // 飛びかかって噛みつく。与えたダメージの35%を吸い取る
        effect: { preset: 'tackle', color: '#c8102e', attack: [{ type: 'lines', count: 5, length: 100, at: 'body', color: '#7a0010' }, { type: 'claw', count: 4, width: 9 }],
          hit: [{ type: 'impact', r: 46, color: '#4a0010', color2: '#ff4a5a' }, { type: 'blood', count: 18, speed: 7, dir: 'all' }, { type: 'text', text: 'ガブッ!', at: 'hit' }, { type: 'shake', duration: 8, power: 5 }] } },
      sb: { name: '血旋風', motion: 'spinBack', startup: 10, active: 10, recovery: 28, damage: 12, knockX: 8, knockY: -5, hitstun: 26, box: { x: -40, y: -90, w: 130, h: 60 }, // 回転しながら、まわりに血をまき散らす
        effect: { preset: 'spin', color: '#c8102e', color2: '#ff8a8a', strength: 1.4, attack: [{ type: 'ring', at: 'body', r: 60, width: 7, flat: true }, { type: 'crescent', width: 12, span: 3.8 }, { type: 'blood', at: 'body', count: 16, speed: 6, dir: 'all' }],
          hit: [{ type: 'impact', r: 34, color: '#4a0010', color2: '#ff4a5a' }, { type: 'blood', count: 8, speed: 5, dir: 'all' }] } },
      su: { name: '血昇拳', motion: 'rising', startup: 5, active: 6, recovery: 42, damage: 18, armor: 1, bloodCost: 5, drain: 0.5, knockX: 2.8, knockY: -13.8, hitstun: 30, launch: { x: 2, y: -12 }, box: { x: -20, y: -150, w: 66, h: 130 }, // 無敵ではなくアーマー1回。出すと体力5を払い、当てると半分吸う(殴り合いの切り返し)
        effect: { color: '#c8102e', color2: '#ff8a8a', start: [{ type: 'blood', at: 'body', count: 8, speed: 3, dir: 'up' }], attack: [{ type: 'claw', angle: -1, count: 3, width: 11 }, { type: 'blood', at: 'feet', count: 16, speed: 8, dir: 'up', spread: 0.35 }, { type: 'wave', at: 'feet', width: 7 }],
          hit: [{ type: 'impact', r: 42, color: '#4a0010', color2: '#ff4a5a' }, { type: 'blood', count: 16, speed: 7, dir: 'up', spread: 0.8 }, { type: 'shake', duration: 10, power: 5 }] } },
      sd: { name: '血溜まり落とし', motion: 'stomp', startup: 12, active: 5, recovery: 30, damage: 16, knockX: 4, knockY: -9, hitstun: 30, box: { x: -20, y: -35, w: 120, h: 35 }, // 踏みつけた足元から血の波が広がる
        effect: { preset: 'blood', strength: 1.5, attack: [{ type: 'wave', at: 'feet', width: 10, grow: 1.5, color: '#8a0016' }, { type: 'ring', flat: true, at: 'feet', r: 70, width: 6, grow: 1.3 }, { type: 'blood', at: 'feet', count: 18, speed: 7, dir: 'up', spread: 0.9 }, { type: 'shake', duration: 8, power: 5 }] } },
      // ---- コマンド技(command に入力を書く。書き方は character.js 冒頭の【コマンド技】) ----
      c1: { name: '血の咆哮', command: '↓↘→+Z', motion: 'cast', startup: 10, active: 6, recovery: 26, damage: 4, knockX: 14, knockY: -3, hitstun: 18, effect: 'bloodRoar', box: { x: -40, y: -120, w: 150, h: 120 } },
      c2: { name: '狂跳斬', command: '↓↓+A', motion: 'risingKick', startup: 8, active: 24, recovery: 20, damage: 13, knockX: 5, knockY: -4, hitstun: 30, rank: 5, launch: { x: 6, y: -13 }, landLag: 16, box: { x: -10, y: -60, w: 90, h: 60 },
        effect: { color: '#c8102e', color2: '#ff8a8a', attack: [{ type: 'claw', angle: -1, count: 3, width: 10 }, { type: 'blood', count: 8, speed: 5, dir: 'back' }], hit: [{ type: 'impact', r: 36, color: '#4a0010', color2: '#ff4a5a' }, { type: 'blood', count: 12, speed: 6, dir: 'all' }] } },
      // ---- コマンド投げ ----
      // 血吸い: 組みついて3回かみつき(1回ごとに吸血)、そのまま後ろへ振り捨てる(立ち位置が入れ替わる)
      c3: { name: '血吸い', command: '↓↙←+Z', motion: 'palm', startup: 5, active: 3, recovery: 30, damage: 7, knockX: 10, knockY: -6, hitstun: 28, drain: 0.3, hitStop: 14,
        grab: { dir: 'b', box: { x: 0, y: -95, w: 62, h: 90 }, release: 36, total: 56, hold: { x: 34, y: 58 }, color: '#c8102e',
          hits: [{ at: 8, damage: 4, drain: 0.6 }, { at: 16, damage: 4, drain: 0.6 }, { at: 24, damage: 4, drain: 0.6 }],
          motion: { hold: [0.6, 1.6, 0.5, 0, 1.4, 0.6, 0, 0.8, -0.8, -0.5, 0.6, 4], rel: [-0.5, 2.6, 0.3, 0, 2.6, 0.3, 0, 0.4, -0.4, -0.4, 0.4, -12] } },
        effect: { color: '#c8102e', color2: '#ff8a8a', attack: [{ type: 'claw', count: 2, width: 9 }], hit: [{ type: 'impact', r: 30, color: '#4a0010', color2: '#ff4a5a' }, { type: 'blood', at: 'hit', count: 12, speed: 5, dir: 'up', spread: 0.8 }] } },
      // ---- ゲージ技(Z と A を同時押し)・超必殺技(↓ を押しながら Z と A) ----
      gx: { name: '血の代償・狂撃', cost: 25, armor: 1, bloodCost: 8, motion: 'lunge', startup: 9, active: 8, recovery: 28, damage: 22, knockX: 10, knockY: -7, hitstun: 28, launch: { x: 12 }, box: { x: 20, y: -95, w: 80, h: 70 }, // 自分の血(体力8)を代償に、アーマー付きの重い一撃
        effect: { color: '#c8102e', color2: '#ff8a8a', start: [{ type: 'blood', at: 'body', count: 12, speed: 4, dir: 'up', spread: 1 }, { type: 'orb', at: 'body', r: 40, duration: 9, follow: true, color: '#7a0010' }],
          attack: [{ type: 'lines', count: 6, at: 'body', color: '#7a0010' }, { type: 'claw', count: 4, width: 12 }, { type: 'blood', count: 8, speed: 5, dir: 'back' }],
          hit: [{ type: 'impact', r: 52, color: '#4a0010', color2: '#ff4a5a' }, { type: 'blood', count: 20, speed: 8, dir: 'forward', spread: 0.9 }, { type: 'shake', duration: 10, power: 7 }] } },
      sx: { name: '修羅・血の突撃', super: true, cost: 100, armor: 99, bloodCost: 10, drain: 0.5, minScale: 0.85, motion: 'shoulder', startup: 8, active: 22, recovery: 40, damage: 30, knockX: 14, knockY: -8, hitstun: 44, hitStop: 20, launch: { x: 13 }, box: { x: 15, y: -100, w: 75, h: 90 }, // 無敵なし。体力10を払い、どんな攻撃も止まらない(アーマー)まま突っ込む一撃。当てると半分吸う
        effect: { color: '#c8102e', color2: '#ff8a8a', start: [{ type: 'blood', at: 'body', count: 14, speed: 4, dir: 'up', spread: 1 }, { type: 'orb', at: 'body', r: 56, duration: 8, follow: true, color: '#7a0010' }],
          attack: [{ type: 'lines', count: 7, at: 'body', length: 140, color: '#7a0010' }, { type: 'blood', at: 'body', count: 12, speed: 4, dir: 'back', spread: 0.6 }, { type: 'flash', at: 'body', r: 70, follow: true, duration: 20, color: '#c8102e' }],
          hit: [{ type: 'impact', r: 70, color: '#4a0010', color2: '#ff4a5a' }, { type: 'claw', count: 4, width: 14 }, { type: 'blood', count: 28, speed: 9, dir: 'all' }, { type: 'text', text: '修羅', at: 'head' }, { type: 'shake', duration: 16, power: 9 }] } },
    },
  },
  {
    name: 'ツキハ',
    desc: '闇の魔法少女:ゆっくり漂う闇の弾と設置技で戦う・ふわっと跳ぶ・低HP',
    // 性能  gravityMul<1 でふわっと跳ぶ / dashSpeed が速い(影のように滑る)
    stats: { hp: 100, jumpStartup: 4, landLag: 3, airLandLag: 8, speed: 4.0, jump: -13, airJumps: 1, gravityMul: 0.82, dashSpeed: 11, shield: 55 },
    ko: { type: 'fly', vx: 4, vy: -6.5, gravity: 0.4, spin: -1.0, bounce: 0, slide: 0.9, air: 'float', lie: 'back', dust: '#d9b3ff' }, // ふわりと浮いて、ゆっくり落ちる
    sp: { max: 100, time: 0.015, hit: 0.6, hurt: 0.35, pj: 0.9, color: '#e050b0' }, // SP ゲージ: 時間と飛び道具でよくたまる
    // 飛び道具(Aキー): とても遅いが大きく、長く残る闇の弾(相手の動きを縛る)
    projectile: { speed: 3.5, damage: 7, radius: 16, life: 200, look: 'darkOrb', path: 'straight' },
    // 見た目  color=体の色(服・スキンの基準) skin=肌の色  ※体の大きさ・服の色は drawing_character.js の body に書く
    look: {
      smooth: { atk: 0.7, move: 0.3 }, // 動きの追従の速さ(0〜1。大きいほどキビキビ、小さいほど重い)
      color: '#2a1838', skin: '#ffe5cb',
    },
    throw: {
      reach: [0.25, 1.7, 0.2, 0, 1.0, 0.8, 0, 0.6, -0.4, -0.5, 0.3, 8], // つかみに行く姿勢
      name: '投げ', box: { x: 0, y: -85, w: 70, h: 75 }, // 掴み判定(x:前方向の開始位置 y:足元から(マイナスが上) w,h:大きさ)
      startup: 7, active: 3, whiff: 22, release: 32, total: 58, // 発生/持続/空振り後隙/投げる瞬間/全体F(60F≒1秒)
      f: { name: '影縛り', damage: 5, vx: 9, vy: -6, hitstun: 26, hold: { x: 50, y: 40 }, release: 34, hits: [{ at: 10, damage: 2 }, { at: 20, damage: 2 }],
        motion: { hold: [0.0, 1.7, 0.3, 0, 0.6, 1.2, 0, 0.4, -0.3, -0.3, 0.3, 0], rel: [0.25, 1.65, 0.05, 0, 1.5, 0.1, 0, 0.6, -0.4, -0.45, 0.35, 8], held: [-0.4, 2.2, 1.0, 0, 1.6, 1.2, 0, 0.8, -1.0, -0.4, 0.6, 0] },
        effect: { preset: 'nightmare', attack: [{ type: 'ring', at: 'hit', r: 40, width: 5, duration: 30 }], hit: [{ type: 'heart', r: 16, duration: 12 }, { type: 'star', count: 4, r: 12, spin: 2 }] } },
      b: { name: '月返し', damage: 9, vx: 9, vy: -6, hitstun: 26, leap: 60, hold: { x: -10, y: 60 }, release: 30,
        motion: { hold: [-0.2, 2.9, 0.1, 0.2, 2.6, 0.2, 0, 0.4, -0.3, -0.3, 0.3, 2], rel: [0.25, 1.65, 0.05, 0, 1.5, 0.1, 0, 0.6, -0.4, -0.45, 0.35, 8], held: [0.3, 2.0, 1.5, 0, 1.8, 1.6, 0, 1.4, -1.8, 1.2, -1.6, 0] },
        effect: { preset: 'nightmare', hit: [{ type: 'crescent', width: 10, span: 3 }, { type: 'particles', count: 10, dir: 'all', speed: 4, gravity: -0.03 }] } },
      u: { name: '夜空投げ', damage: 7, vx: 2, vy: -15, hitstun: 28, hold: { x: 40, y: 130 }, release: 36,
        motion: { hold: [-0.2, 2.9, 0.1, 0.2, 2.6, 0.2, 0, 0.4, -0.3, -0.3, 0.3, 2], rel: [-0.2, 2.9, 0.1, 0.2, 2.6, 0.2, 0, 0.4, -0.3, -0.3, 0.3, 2], held: [0.3, 2.0, 1.5, 0, 1.8, 1.6, 0, 1.4, -1.8, 1.2, -1.6, 0] },
        effect: { preset: 'nightmare', attack: [{ type: 'orb', at: 'hit', r: 40, duration: 30, color: '#c03a8a' }], hit: [{ type: 'star', count: 6, r: 20, spin: 2 }, { type: 'flash', r: 40, blend: 'add' }] } },
      d: { name: '奈落落とし', damage: 10, vx: 3, vy: -7, hitstun: 30, hold: { x: 40, y: 90 }, release: 34, spike: 4,
        motion: { hold: [-0.2, 2.9, 0.1, 0.2, 2.6, 0.2, 0, 0.4, -0.3, -0.3, 0.3, 2], rel: [0.25, 1.65, 0.05, 0, 1.5, 0.1, 0, 0.6, -0.4, -0.45, 0.35, 8], held: [-1.5, 2.6, 0.2, 0, 2.6, 0.2, 0, 0.1, 0, -0.1, 0, 0] },
        effect: { preset: 'abyss', hit: [{ type: 'ring', at: 'feet', flat: true, r: 70, width: 6 }, { type: 'flame', at: 'feet', count: 4, r: 30, duration: 16, life: 22, smoke: 0.1 }, { type: 'impact', r: 36 }] } },
    },
    hitPoses: { head: [0.2, 0.9, 1.9, 0, 0.7, 2, 0, 1.5, -1.3, 0, -1.5, 0]},
    poses: {
      // 全モーション共通の基本姿勢(角度。0=真下/正=前) [lean,右肩,右肘,右手首,左肩,左肘,左手首,右腿,右膝,左腿,左膝,前後ずれ]
      idle: [0, 0.3, 1, 0, 0.2, 0.2, 0, -0.3, 0.2, 0.3, -0.1, 0,,,,, 2,,,,, 2, ], // 待機(ステッキを胸の前に構える)
      walk: [0.08, 0.3, 0.6, 0.7], // 歩き [lean,腕の振り,脚の振り,膝の曲げ]
      guard: [0.09, 1, 2.3, 0, 0.9, 2.4, 0, 0.35, -0.45, -0.3, 0.35, 0], // シールド
      crouch: [0.2, 0.9, 1.9, 0, 0.7, 2, 0, 0, -1.5, 1.5, -1.3, 0], // しゃがみ・着地・ジャンプ前
      jumpSquat: [0.45, -0.06, 0.9, 0, -0.13, 0.9, 0, 1.15, -1.75, -1, 1.75, -2], // ジャンプ前隙(跳ぶ前にため込む)
      landing: [0.45, 1.41, 0.4, 0, 0.9, 0.5, 0, 1.2, -1.6, -0.5, 0.9, 4], // 着地隙(衝撃を受け止める)
      dashF: [0.35, 0.9, 1.3, 0, -0.4, 1.4, 0, 0.9, -0.8, -0.6, 0.6, 0], // 前ダッシュ(滑るように)
      dashB: [-0.23, 0.6, 1.7, 0, 0.4, 1.9, 0, 0.7, -0.9, 0.1, -0.4, 0], // バックステップ
      jumpUp: [-0.05, 1.2, 1.3, 0, 0.6, 1.5, 0, 0.5, -1.1, 0.2, -0.8, 0], // 上昇
      fall: [-0.05, 1.6, 0.9, 0, 1.2, 0.9, 0, 0.3, -0.5, 0.1, -0.3, 0], // 落下(スカートをなびかせて漂う)
    },
    // 技ごとのモーション(w=振りかぶり s=打ち出し)。右腕(手前)=ステッキを持つ手 / 左腕(奥)=魔法を放つ手
    //   [lean,右肩,右肘,右手首,左肩,左肘,左手首,右腿,右膝,左腿,左膝,前後ずれ]
    motions: {
      n: { w: [-0.05, 0.2, 1.9, 0.2, 0.3, 1.3, 0, 0.4, -0.4, -0.3, 0.3, -4], s: [0.15, 1.5, 0.05, 0, -0.3, 0.8, 0, 0.55, -0.4, -0.45, 0.35, 12] },        // ステッキ突き: 胸の前からまっすぐ突く
      f: { w: [-0.35, -0.6, 1.6, 0.3, 0.8, 1, 0, 0.5, -0.4, -0.5, 0.5, -8], s: [0.4, 1.55, 0, 0.2, 0.4, 1.2, 0, 0.8, -0.3, -0.7, 0.3, 18] },            // 闇の鞭: 後ろへ引いて、前へ振り抜く
      b: { w: [0, 0.6, 1.8, 0, 0.5, 1.6, 0, 0.3, -0.3, -0.2, 0.3, 0], s: [-0.2, 1.4, 0.1, 0, 0.6, 1, 0, 0.2, -0.2, -0.6, 0.8, -6] },                 // 羽ばたき退き: 突き放しながら片足を引いて退く
      u: { w: [0.1, 0.3, 1.8, 0, 0.4, 1.6, 0, 0.7, -1, -0.3, 0.8, 0], s: [-0.25, 3, 0.15, 0.3, 1.2, 1.4, 0, 0.2, -0.2, -0.3, 0.2, 4] },                // 闇月: しゃがんでから頭上へ弧を描く
      d: { w: [0.3, 0.2, 1.9, 0, 0.4, 1.6, 0, 1, -1.5, 0.3, -1.1, -2], s: [0.5, 1, 0.05, 0.4, 0.3, 1.4, 0, 1.3, -1.2, -0.6, -1, 16] },                // 影の棘: 低くしゃがんで足元を突く
      da: { w: [0.4, -0.4, 1.6, 0, 0.9, 0.9, 0, 1, -0.9, -0.6, 0.6, -10], s: [0.65, 1.5, 0.05, 0, -0.6, 0.6, 0, 0.9, -0.3, -1, 0.4, 22] },            // ナイトグライド: 前へ滑り込みながら突く
      an: { w: [-0.4, -0.8, 0.6, 0, 0.2, 1.2, 0, 0.9, -1.4, 0.3, -1, -6], s: [0.4, 1.9, 0.1, 0.5, -0.5, 1, 0, 0.6, -0.9, -0.2, -0.6, 10] },             // ステッキ回し: 後ろから前へ大きく回す
      af: { w: [-0.35, 3, 0.5, -0.3, 0.8, 1.2, 0, 0.8, -1.4, 0.2, -0.8, -4], s: [0.45, 1, 0.1, 0.3, -0.2, 1, 0, 1, -0.5, -0.2, -0.7, 14] },             // ルナスラッシュ: 頭上から斜め下へ振り下ろす
      au: { w: [0.2, 0.4, 1.6, 0, 0.4, 1.5, 0, 1, -1.5, 0.5, -1.2, 0], s: [-0.6, 2.9, 0.1, 0.2, 2.2, 0.6, 0, 1.6, -0.3, 0.3, -0.6, 2] },               // スターライズ: 体を反らせて真上へ振り上げる
      ad: { w: [0.1, 2.6, 0.6, 0, 2.3, 0.8, 0, 0.9, -1.5, 0.5, -1.2, 0], s: [0.25, 0.15, 0.05, 0, 0.4, 0.5, 0, 0.3, -0.2, -0.2, -0.3, 0] },             // 闇の雫: 振り上げたステッキを真下へ向け、闇の玉を落とす
      s: { w: [-0.1, 2.2, 1, 0, 0.6, 1.9, 0, 0.4, -0.3, -0.3, 0.3, -4], s: [0.15, 1.6, 0.05, 0.2, 1.3, 0.3, 0, 0.4, -0.3, -0.3, 0.3, 6] },              // ダークオーブ: 胸で闇をためて、前へ放つ
      sf: { w: [-0.3, 2.6, 1.2, 0, 2, 1.6, 0, 0.3, -0.3, -0.4, 0.4, -8], s: [0.45, 1.45, 0, 0.1, 1.35, 0.15, 0, 0.9, -0.4, -0.8, 0.3, 20] },            // ナイトメアブレイク: 頭の後ろから両手で突き出す
      sb: { w: [-0.5, -0.5, 0.6, 0, 0.5, 0.6, 0, 0.6, -1, 0.2, -0.8, 0], s: [-0.2, 2.2, 0.2, 0.5, -1.2, 0.4, 0, -0.2, -0.3, 0.4, -0.8, -10] },           // 影隠れ: 両腕を広げてマントのように身をひるがえす
      su: { w: [0.1, 0.6, 1.8, 0, 0.5, 1.7, 0, 0.4, -0.3, -0.3, 0.3, -2], s: [-0.25, 2.6, 0.2, 0.3, 2.3, 0.3, 0, 0.4, -0.3, -0.3, 0.3, 2] },   // ルナライズ: ステッキを斜め上へ掲げ、月を昇らせる
      sd: { w: [-0.1, 2.8, 0.4, 0, 1.6, 1, 0, 0.4, -0.3, -0.3, 0.3, -2], s: [0.4, 0.7, 0.1, 0.6, -0.6, 0.6, 0, 0.9, -1.2, -0.4, -0.6, 8] },             // 奈落の門: 掲げたステッキを地面へ突き立てる
      c1: { w: [-0.4, -0.6, 0.5, 0, -0.2, 0.5, 0, 0.7, -1.2, 0.2, -0.8, -6], s: [0.5, 1.8, 0.1, 0.4, -0.9, 0.3, 0, 0.4, -0.5, -0.6, 0.2, 14] },        // 夢幻蝶: 羽のように両腕を広げて舞う
      c2: { w: [-0.1, 1, 1.8, 0, 0.6, 1.9, 0, 0.4, -0.3, -0.3, 0.3, -2], s: [0.1, 2.6, 0.3, 0.3, 1.5, 0.1, 0, 0.3, -0.2, -0.3, 0.2, 4] },              // 月蝕の檻: ステッキを掲げ、もう片手で檻を操る
    },
    combos: ['Z→↓Z→→A (3HIT)', '↓Z→↑A (切り返しで締める)'],
    moves: {
      // ---- 地上の通常技 ----
      n: { name: 'ステッキ突き', motion: 'jab', startup: 5, active: 6, recovery: 10, damage: 4, knockX: 3.5, knockY: -2, hitstun: 16, effect: { preset: 'nightmare', size: 0.7 }, box: { x: 30, y: -72, w: 48, h: 22 } }, // 遅いが長く残る(置いておく)
      f: { name: '闇の鞭', motion: 'cross', startup: 11, active: 4, recovery: 22, damage: 8, knockX: 6, knockY: -3, hitstun: 22, effect: { preset: 'nightmare', attack: [{ type: 'beam', at: 'base', length: 160, width: 6, duration: 10 }, { type: 'heart', x: 140, r: 9, duration: 12 }] }, box: { x: 30, y: -70, w: 160, h: 18 } }, // 全キャラで一番長い。外すと隙が大きい
      b: { name: '羽ばたき退き', motion: 'palm', startup: 6, active: 3, recovery: 12, damage: 4, knockX: 6, knockY: -2, hitstun: 16, effect: { preset: 'nightmare', size: 0.7 }, launch: { x: -11 }, box: { x: 25, y: -80, w: 50, h: 32 } }, // 下がりながら打つのはツキハだけ
      u: { name: '闇月', motion: 'uppercut', startup: 9, active: 10, recovery: 18, damage: 7, knockX: 1, knockY: -11, hitstun: 24, effect: { preset: 'upper', color: '#c03a8a', color2: '#f6d0ff', duration: 16 }, box: { x: -40, y: -150, w: 90, h: 95 } }, // 遅いが大きく長く残る置き対空
      d: { name: '影の棘', motion: 'sweep', startup: 7, active: 4, recovery: 12, damage: 5, knockX: 2, knockY: -4, hitstun: 20, effect: { preset: 'nightmare', attack: [{ type: 'crescent', angle: 1, width: 8, span: 2 }, { type: 'star', at: 'feet', x: 100, y: -6, count: 4, r: 8, spin: 3 }] }, box: { x: 70, y: -24, w: 60, h: 24 } }, // 少し離れた所から棘が出る下段(密着では当たらない)
      da: { name: 'ナイトグライド', motion: 'lunge', landLag: 6, startup: 7, active: 8, recovery: 14, damage: 7, knockX: 6, knockY: -4, hitstun: 22, effect: { preset: 'dash', color: '#c03a8a' }, launch: { x: 9, y: -6 }, box: { x: 25, y: -80, w: 60, h: 58 } }, // 浮き上がりながら滑る(そのまま空中へ逃げられる)
      // ---- 空中の通常技 ----
      an: { name: 'ステッキ回し', motion: 'spinBack', landLag: 6, startup: 4, active: 14, recovery: 8, damage: 4, float: 1.5, knockX: 2, knockY: -3, hitstun: 16, effect: { preset: 'nightmare', size: 0.8, duration: 16 }, box: { x: -10, y: -80, w: 70, h: 50 } }, // ふわっと浮いて、長く回し続ける
      af: { name: 'ルナスラッシュ', motion: 'chop', landLag: 8, startup: 7, active: 5, recovery: 12, damage: 7, float: 0.5, knockX: 5, knockY: 2, hitstun: 18, effect: { preset: 'nightmare', attack: [{ type: 'crescent', angle: 1, width: 11, span: 2.6 }, { type: 'particles', count: 6, dir: 'down', speed: 4 }] }, launch: { y: -3 }, box: { x: 20, y: -60, w: 80, h: 55 } }, // 振ると少し浮く(滞空が伸びる)
      au: { name: 'スターライズ', motion: 'flipKick', landLag: 7, startup: 6, active: 12, recovery: 10, damage: 5, knockX: 1, knockY: -9, hitstun: 20, effect: { preset: 'upper', color: '#c03a8a', color2: '#f6d0ff', duration: 16, hit: [{ type: 'star', count: 5, r: 18, spin: 2 }] }, box: { x: -30, y: -140, w: 60, h: 80 } }, // 星が長く残る
      ad: { name: '闇の雫', motion: 'cast', landLag: 6, startup: 8, active: 4, recovery: 12, damage: 0, knockX: 0, knockY: 0, hitstun: 0, float: 0, effect: { preset: 'cast', color: '#c03a8a', color2: '#f6d0ff' }, box: { x: 0, y: 0, w: 0, h: 0 }, // 空中で止まり、真下へゆっくり落ちる闇の玉を置く
        projectile: { speed: 3, damage: 6, radius: 14, life: 80, knockX: 1, knockY: -6, hitstun: 22, look: { preset: 'darkOrb', size: 0.9 }, path: { type: 'arc', up: 0, gravity: 0.02, angle: 90 }, from: { x: 0, y: -20 } } },
      // ---- 必殺技 ----
      s: { name: 'ダークオーブ', motion: 'cast', startup: 12, active: 3, recovery: 18, damage: 0, knockX: 0, knockY: 0, hitstun: 0, effect: { preset: 'cast', color: '#c03a8a', color2: '#f6d0ff' }, box: { x: 0, y: 0, w: 0, h: 0 } },
      sf: { name: 'ナイトメアブレイク', motion: 'cast', startup: 13, active: 5, recovery: 26, damage: 16, knockX: 8, knockY: -6, hitstun: 30, effect: { preset: 'nightmare', strength: 1.7, hit: [{ type: 'impact', r: 40 }, { type: 'heart', r: 22, duration: 16 }, { type: 'shake', duration: 8, power: 5 }] }, box: { x: 30, y: -110, w: 90, h: 90 } },
      sb: { name: '影隠れ', motion: 'spinBack', startup: 5, active: 6, recovery: 20, damage: 3, knockX: 9, knockY: -2, hitstun: 16, effect: { preset: 'abyss', size: 0.8, attack: [{ type: 'ring', at: 'body', r: 50, width: 6 }, { type: 'particles', at: 'body', count: 14, dir: 'all', speed: 4, gravity: -0.03, life: 24 }] }, launch: { x: -14 }, box: { x: -40, y: -110, w: 100, h: 110 } },
      su: { name: 'ルナライズ', motion: 'cast', startup: 10, active: 3, recovery: 22, damage: 0, knockX: 0, knockY: 0, hitstun: 0, box: { x: 0, y: 0, w: 0, h: 0 }, // 跳ばずに、斜め上へゆっくり昇って止まる闇の月を置く(置き対空。近くで出すと間に合わない)
        effect: { preset: 'cast', color: '#c03a8a', color2: '#f6d0ff', start: [{ type: 'orb', at: 'front', r: 18, duration: 10, follow: true, blend: 'add' }] },
        projectile: { speed: 4.5, damage: 9, radius: 18, life: 110, knockX: 2, knockY: -10, hitstun: 26, look: { preset: 'darkOrb', size: 1.15 }, path: { type: 'stop', decel: 0.96, angle: -58 }, from: { x: 30, y: -90 } } },
      sd: { name: '奈落の門', motion: 'cast', startup: 14, active: 8, recovery: 30, damage: 12, knockX: 2, knockY: -9, hitstun: 30, effect: { preset: 'abyss', strength: 1.4 }, box: { x: -60, y: -40, w: 200, h: 40 } },
      // ---- コマンド技(command に入力を書く。書き方は character.js 冒頭の【コマンド技】) ----
      c1: { name: '夢幻蝶', command: '↓↘→+Z', air: true, motion: 'spinBack', startup: 5, active: 16, recovery: 12, damage: 7, knockX: 5, knockY: -5, hitstun: 22, rank: 0, effect: { preset: 'nightmare', attack: [{ type: 'crescent', width: 10, span: 3.2 }, { type: 'lines', count: 4, at: 'body', length: 80 }, { type: 'particles', at: 'body', count: 10, dir: 'back', speed: 3, gravity: -0.03, life: 26 }] }, landLag: 8, launch: { x: 10, y: -6 }, box: { x: -10, y: -90, w: 85, h: 60 } },
      c2: { name: '月蝕の檻', command: '↓↙←+A', motion: 'cast', startup: 18, active: 40, recovery: 22, damage: 3, knockX: 0, knockY: -1, hitstun: 30, hits: 6, hitInterval: 6, hitStop: 4, rank: 3, effect: { preset: 'abyss', attack: [{ type: 'ring', at: 'hitbox', r: 50, width: 6, grow: 1, duration: 40 }, { type: 'flame', at: 'hitbox', y: 30, color: '#7a2aa8', color2: '#ff8adf', count: 3, duration: 40, life: 20, smoke: 0 }] }, box: { x: 50, y: -100, w: 90, h: 100 } },
      // ---- ゲージ技(Z と A を同時押し)・超必殺技(↓ を押しながら Z と A) ----
      gx: { name: 'ルナティックオーブ', cost: 25, motion: 'cast', startup: 12, active: 3, recovery: 20, damage: 0, knockX: 0, knockY: 0, hitstun: 0, box: { x: 0, y: 0, w: 0, h: 0 },
        projectile: { speed: 3, damage: 13, radius: 28, life: 230, hitstun: 32, knockX: 6, knockY: -6, look: { preset: 'darkOrb', size: 1.8 } },
        effect: { preset: 'cast', color: '#c03a8a', color2: '#f6d0ff', strength: 2, start: [{ type: 'orb', at: 'front', r: 30, duration: 12, follow: true, blend: 'add', color: '#e050b0' }] } },
      sx: { name: 'エクリプス・ノクターン', super: true, cost: 100, invincible: 12, minScale: 0.75, motion: 'cast', startup: 10, active: 36, recovery: 30, damage: 5, hits: 6, hitInterval: 6, hitStop: 4, knockX: -2, knockY: -3, hitstun: 30, box: { x: -100, y: -220, w: 320, h: 220 },
        effect: { preset: 'abyss', strength: 3, start: [{ type: 'orb', at: 'body', r: 60, duration: 10, follow: true, blend: 'add', color: '#e050b0' }],
          attack: [{ type: 'ring', at: 'body', r: 160, width: 10, color: '#c03a8a' }, { type: 'ring', at: 'body', r: 220, width: 6, delay: 10, color: '#f6d0ff' }, { type: 'star', count: 6, r: 40, spin: 2, at: 'head', delay: 6, color: '#f6d0ff' },
            { type: 'heart', r: 28, at: 'hitbox', delay: 14, color: '#e050b0', color2: '#fff' }, { type: 'flash', blend: 'add', r: 210, delay: 20, color: '#c03a8a' }, { type: 'text', text: 'Eclipse', at: 'head', delay: 20 }],
          hit: [{ type: 'heart', r: 18, color: '#e050b0', color2: '#fff' }, { type: 'star', count: 4, r: 14 }] } },
    },
  },
  {
    name: 'リナ',
    desc: '電撃ロッカー:エレキギターで殴る中距離戦・当ててボルテージをため、必殺技を強化する',
    // 性能  ふつうの速さ。ギターのリーチで中距離を制する
    stats: { hp: 104, jumpStartup: 4, landLag: 3, airLandLag: 8, speed: 4.2, jump: -13.5, airJumps: 1, dashSpeed: 10, shield: 55 },
    ko: { type: 'fly', vx: 12, vy: -5, bounce: 0, slide: 0.965, air: 'blown', lie: 'back' }, // 低く飛ばされて地面を長くすべる
    sp: { max: 100, time: 0.012, hit: 0.6, hurt: 0.35, color: '#ffe14a' }, // SP ゲージ: 標準。ゲージ技でボルテージもためられる
    // 飛び道具(Aキー): 電気の玉(見た目は projectile.js の bolt)
    projectile: { speed: 7, damage: 6, radius: 13, life: 70, look: 'bolt', path: 'straight' },
    // ボルテージ: 当てる(ダメージ×perDamage)・ガードされる(guard)・攻撃を受ける(ダメージ×hurt)でたまる。max でゲージが満タン
    //   技に voltage: { need, use, ...強化版の値 } を書くと、ゲージが need 以上のとき use だけ使って強化版が出る(→A / ↑A / ギターソロ)
    voltage: { max: 100, perDamage: 1.6, guard: 3, hurt: 0.6, decay: 0, color: '#ffe14a' },
    // 見た目  color=体の色(服・スキンの基準) skin=肌の色  ※体の大きさ・服の色は drawing_character.js の body に書く
    look: {
      smooth: { atk: 0.7, move: 0.3 }, // 動きの追従の速さ(0〜1。大きいほどキビキビ、小さいほど重い)
      color: '#ffe14a', skin: '#ffe5cb',   // 黒いジャケット(スキンを買うとこの色が変わる)
    },
    throw: {
      reach: [0.35, 1.5, 0.3, -0.3, 1.4, 0.3, 0, 0.8, -0.4, -0.5, 0.3, 10], // つかみに行く姿勢
      name: '投げ', box: { x: 0, y: -85, w: 70, h: 75 }, // 掴み判定(x:前方向の開始位置 y:足元から(マイナスが上) w,h:大きさ)
      startup: 7, active: 3, whiff: 22, release: 32, total: 58, // 発生/持続/空振り後隙/投げる瞬間/全体F(60F≒1秒)
      f: { name: 'ビリビリ投げ', damage: 4, vx: 9, vy: -6, hitstun: 26, hold: { x: 30, y: 60 }, release: 34, hits: [{ at: 8, damage: 2 }, { at: 16, damage: 2 }, { at: 24, damage: 2 }],
        motion: { hold: [0.6, 1.6, 0.5, 0, 1.4, 0.6, 0, 0.8, -0.8, -0.5, 0.6, 4], rel: [0.5, 1.6, 0.05, 0, 1.5, 0.05, 0, 0.8, -0.3, -0.8, 0.3, 14], held: [-0.4, 2.2, 1.0, 0, 1.6, 1.2, 0, 0.8, -1.0, -0.4, 0.6, 0] },
        effect: { preset: 'thunder', hit: [{ type: 'spark', length: 50 }, { type: 'burst', r: 24 }] } },
      b: { name: 'バックドロップ', damage: 9, vx: 9, vy: -6, hitstun: 26, hold: { x: -8, y: 80 },
        motion: { hold: [-0.5, 2.6, 0.4, 0, 2.6, 0.4, 0, 0.4, -0.6, -0.3, 0.5, -2], rel: [-1.25, 3.0, 0.2, 0, 3.0, 0.2, 0, 0.9, -1.6, 0.6, -1.2, -8], held: [-1.5, 2.6, 0.2, 0, 2.6, 0.2, 0, 0.1, 0, -0.1, 0, 0] },
        effect: { preset: 'thunder', hit: [{ type: 'spark', length: 70 }, { type: 'impact', r: 40 }, { type: 'shake', duration: 8, power: 5 }] } },
      u: { name: 'モッシュ', damage: 7, vx: 2, vy: -15, hitstun: 28, hold: { x: 10, y: 120 }, release: 36,
        motion: { hold: [-0.25, 3.0, 0.2, 0, 2.9, 0.2, 0, 0.5, -0.5, -0.4, 0.4, 0], rel: [-0.3, 3.1, 0.05, 0, 3.0, 0.05, 0, 0.2, -0.2, -0.2, 0.2, 4], held: [-1.5, 2.6, 0.2, 0, 2.6, 0.2, 0, 0.1, 0, -0.1, 0, 0] },
        effect: { preset: 'thunder', hit: [{ type: 'spark', length: 60 }, { type: 'star', count: 5, r: 18, spin: 2 }, { type: 'text', text: 'MOSH!', at: 'head' }] } },
      d: { name: 'アンプ落とし', damage: 10, vx: 3, vy: -7, hitstun: 30, hold: { x: 20, y: 105 }, spike: 4,
        motion: { hold: [-0.25, 3.0, 0.2, 0, 2.9, 0.2, 0, 0.5, -0.5, -0.4, 0.4, 0], rel: [0.85, 1.0, 0.2, 0, 0.9, 0.2, 0, 1.0, -1.2, -0.7, 1.0, 12], held: [-1.5, 2.6, 0.2, 0, 2.6, 0.2, 0, 0.1, 0, -0.1, 0, 0] },
        effect: { preset: 'thunder', hit: [{ type: 'spark', length: 80 }, { type: 'wave', at: 'feet', width: 7 }, { type: 'shake', duration: 10, power: 6 }] } },
    },
    hitPoses: { head: [0.2, 0.9, 1.9, 0, 0.7, 2, 0, 1.5, -1.3, 0, -1.5, 0]},
    poses: {
      // 全モーション共通の基本姿勢(角度。0=真下/正=前) [lean,右肩,右肘,右手首,左肩,左肘,左手首,右腿,右膝,左腿,左膝,前後ずれ]
      idle: [0, 0.2, 0.5, -0.8, 0.2, 0.2, 0, -0.3, 0.2, 0.3, -0.1, 0,,,,, 2,,,,, 2, ], // 待機(ギターを前に構える)
      walk: [0.08, 0.3, 0.6, 0.7], // 歩き [lean,腕の振り,脚の振り,膝の曲げ]
      guard: [0.09, 1, 2.3, 0, 0.9, 2.4, 0, 0.35, -0.45, -0.3, 0.35, 0], // シールド
      crouch: [0.2, 0.9, 1.9, 0, 0.7, 2, 0, 0, -1.5, 1.5, -1.3, 0], // しゃがみ・着地・ジャンプ前
      jumpSquat: [0.45, -0.06, 0.9, 0, -0.13, 0.9, 0, 1.15, -1.75, -1, 1.75, -2], // ジャンプ前隙
      landing: [0.45, 1.41, 0.4, 0, 0.9, 0.5, 0, 1.2, -1.6, -0.5, 0.9, 4], // 着地隙
      dashF: [0.35, 0.9, 1.3, 0, -0.4, 1.4, 0, 0.9, -0.8, -0.6, 0.6, 0], // 前ダッシュ
      dashB: [-0.23, 0.6, 1.7, 0, 0.4, 1.9, 0, 0.7, -0.9, 0.1, -0.4, 0], // バックステップ
      jumpUp: [-0.05, 1.2, 1.3, 0, 0.6, 1.5, 0, 0.5, -1.1, 0.2, -0.8, 0], // 上昇
      fall: [-0.05, 1.6, 0.9, 0, 1.2, 0.9, 0, 0.3, -0.5, 0.1, -0.3, 0], // 落下
    },
    // 技ごとのモーション(w=振りかぶり s=打ち出し)。右腕(手前)=ギターのネックを持つ手 / 左腕(奥)=弦をかき鳴らす手
    //   [lean,右肩,右肘,右手首,左肩,左肘,左手首,右腿,右膝,左腿,左膝,前後ずれ]
    motions: {
      n: { w: [-0.1, 0.1, 1.7, -0.4, 0.5, 1.6, 0, 0.4, -0.4, -0.3, 0.3, -5], s: [0.2, 1.5, 0.05, 0, 1.2, 0.6, 0, 0.5, -0.5, -0.4, 0.4, 14] },          // ネックスタブ: ギターの頭で突く
      f: { w: [-0.35, -0.7, 1.4, 0.3, 0.2, 1.8, 0, 0.4, -0.4, -0.5, 0.5, -8], s: [0.45, 1.7, 0.1, 0.2, -0.3, 1, 0, 0.9, -0.4, -0.8, 0.3, 22] },        // フルスイング: 肩の後ろから横へ振り抜く
      b: { w: [-0.1, 0.5, 1.4, -0.5, 0.8, 1.8, 0, 0.3, -0.3, -0.2, 0.3, -2], s: [0.15, 1.2, 0.3, -0.2, 1.5, 0.3, 0, 0.4, -0.3, -0.3, 0.3, 6] },         // フィードバック: 前へ一歩出て、強くかき鳴らして音波を出す
      u: { w: [0.3, 0.3, 1.6, -0.3, 0.5, 1.6, 0, 0.7, -1, -0.3, 0.8, 0], s: [-0.3, 3, 0.2, 0.3, 2, 0.9, 0, 0.2, -0.2, -0.2, 0.2, 5] },                // ヘッドバンガー: 頭を振り下ろしてから、ギターを真上へ
      d: { w: [0.2, 0.6, 1.6, 0, 0.5, 1.6, 0, 1, -1.5, 0.3, -1.1, -2], s: [0.55, 0.9, 0.05, 0.6, 0, 1.2, 0, 1.3, -1.3, -0.6, -1.1, 18] },             // ローカット: 低くしゃがんで足元を払う
      da: { w: [0.2, 0.2, 1.6, -0.3, 0.6, 1.6, 0, 1, -0.8, -0.6, 0.4, -10], s: [-0.35, 1.4, 0.3, -0.5, 1, 1, 0, 1.5, -1.7, -0.6, -1.2, 24] },          // ニースライド: ひざで滑り込みながら、ギターを前へ
      an: { w: [-0.5, -0.6, 0.9, 0, 0.2, 1.4, 0, 0.9, -1.4, 0.3, -1, -6], s: [0.5, 2, 0.15, 0.4, -0.5, 1, 0, 0.6, -0.9, -0.2, -0.6, 10] },             // エアリフ: 空中で体ごと回して振る
      af: { w: [-0.4, 2.9, 0.6, -0.3, 1.2, 1.4, 0, 0.9, -1.4, 0.3, -0.9, -4], s: [0.45, 1, 0.1, 0.3, -0.3, 1, 0, 1, -0.4, -0.3, -0.6, 14] },             // 空中スイング: 頭上から斜め下へ
      au: { w: [0.2, 0.5, 1.5, -0.3, 0.4, 1.5, 0, 1, -1.5, 0.5, -1.2, 0], s: [-0.55, 2.95, 0.1, 0.2, 2.3, 0.5, 0, 1.4, -0.4, 0.3, -0.7, 2] },          // スカイピック: 反りながら真上へ振り上げる
      ad: { w: [-0.2, 2.8, 0.5, -0.2, 2.6, 0.7, 0, 1, -1.6, 0.6, -1.3, 0], s: [0.5, 0.3, 0.1, 0.2, 0.5, 0.5, 0, 0.4, -0.3, -0.3, -0.2, 0] },             // ギタークラッシュ: 両手で振りかぶって真下へたたきつける
      s: { w: [-0.1, 0.6, 1, -0.9, 0.9, 1.8, 0, 0.4, -0.3, -0.3, 0.3, -4], s: [0.15, 0.9, 0.7, -0.6, 1.3, 0.1, 0, 0.4, -0.3, -0.3, 0.3, 6] },           // サンダーボール: 腰の前でかき鳴らして、電気の玉を撃つ
      sf: { w: [-0.3, -0.2, 1.5, -0.6, 2.4, 1.2, 0, 0.3, -0.3, -0.4, 0.4, -6], s: [0.4, 1.4, 0.2, -0.4, 0.6, 0.2, 0, 0.9, -0.4, -0.8, 0.3, 18] },        // パワーコード: 腕を大きく回して(ウインドミル)かき下ろす
      sb: { w: [0.2, 0.5, 1.5, 0, 0.8, 1.6, 0, 0.7, -1, -0.3, 0.8, 0], s: [-0.2, 2.4, 0.6, -0.6, 2.5, 0.8, 0, 0.5, -0.3, -0.5, 0.3, -4] },             // フィードバック: ギターを頭上に掲げて鳴らす
      su: { w: [0.4, -0.7, 1.1, -0.3, 0.4, 1.6, 0, 1, -1.5, 0.3, -1.1, -4], s: [-0.4, 3.1, 0.1, 0.2, 1.2, 0.4, 0, 0.9, -1.4, 0, -0.3, 6] },   // ライトニングリフ: 腰の後ろに引いたギターを、大きく振り上げて跳ぶ
      sd: { w: [-0.35, 3, 0.3, -0.2, 2.7, 0.5, 0, 0.3, -0.3, -0.3, 0.3, -4], s: [0.7, 0.6, 0.1, 0.5, 0.6, 0.4, 0, 1.1, -1.3, -0.5, -0.6, 14] },          // アンプクラッシュ: 頭上から地面へたたきつける
      c1: { w: [0, 0.3, 1.2, -0.8, 0.6, 1.9, 0, 0.4, -0.3, -0.3, 0.3, -2], s: [-0.35, 1, 0.7, -0.7, 1, 1, 0, 0.6, -0.6, -0.6, 0.3, 8] },                // ギターソロ: 体を反らせて弾きまくる
      c2: { w: [0.1, 1.5, 1.4, 0, 0.5, 1.5, 0, 0.9, -1.4, 0.3, -1, 0], s: [0.55, 1.3, 0.1, 0.2, -0.4, 0.6, 0, 0.6, -0.4, -0.4, -0.6, 20] },              // ステージダイブ: ギターを前へ向けて飛び込む
    },
    combos: ['Z→↓Z→→A (3HIT・ボルテージがあれば→Aが強化)', '↑Z→↑A (対空から切り返し)', '↓↘→+Z ギターソロ (ゲージMAXでライブ版)'],
    moves: {
      // ---- 地上の通常技 ----
      n: { name: 'ネックスタブ', motion: 'jab', startup: 6, active: 2, recovery: 9, damage: 5, knockX: 3.5, knockY: -1, hitstun: 17, effect: { preset: 'punch', color: '#ffe14a' }, box: { x: 30, y: -72, w: 75, h: 22 } }, // ギターの先で突く。遅いが長い
      f: { name: 'フルスイング', motion: 'cross', startup: 11, active: 4, recovery: 19, damage: 9, knockX: 7, knockY: -3, hitstun: 22, effect: { preset: 'slash', color: '#ffe14a', color2: '#fff', hit: [{ type: 'spark', length: 50 }, { type: 'burst', r: 26 }] }, box: { x: 30, y: -84, w: 115, h: 36 } }, // 主力の中距離技
      b: { name: 'フィードバック', motion: 'palm', startup: 9, active: 4, recovery: 16, damage: 2, knockX: 1, knockY: 0, hitstun: 34, effect: { preset: 'thunder', size: 0.7, attack: [{ type: 'beam', at: 'base', length: 150, width: 5, duration: 10 }, { type: 'ring', at: 'front', r: 30, width: 4, flat: true }] }, box: { x: 30, y: -76, w: 150, h: 18 } }, // 細く長い音波。ダメージは小さいが、当たると相手が長く止まる
      u: { name: 'ヘッドバンガー', motion: 'uppercut', startup: 8, active: 5, recovery: 18, damage: 8, knockX: 3, knockY: -11, hitstun: 24, effect: { preset: 'upper', color: '#ffe14a', color2: '#fff', hit: [{ type: 'spark', length: 50 }] }, box: { x: 20, y: -155, w: 90, h: 95 } }, // 前の斜め上へ振り上げる、遠めの対空
      d: { name: 'ローカット', motion: 'sweep', startup: 8, active: 3, recovery: 14, damage: 6, knockX: 3, knockY: -1, hitstun: 18, effect: { preset: 'sweep', color: '#ffe14a' }, box: { x: 25, y: -22, w: 110, h: 20 } }, // 長い下段
      da: { name: 'ニースライド', motion: 'lunge', startup: 8, active: 8, recovery: 15, damage: 8, knockX: 7, knockY: -4, hitstun: 22, effect: { preset: 'dash', color: '#ffe14a', attack: [{ type: 'lines', count: 4, at: 'body' }, { type: 'spark', at: 'feet', length: 40 }] }, launch: { x: 11 }, box: { x: 20, y: -45, w: 65, h: 45 } },
      // ---- 空中の通常技 ----
      an: { name: 'エアリフ', motion: 'spinBack', landLag: 6, startup: 5, active: 8, recovery: 8, damage: 5, knockX: 3, knockY: -3, hitstun: 16, effect: { preset: 'thunder', size: 0.6 }, box: { x: 10, y: -84, w: 100, h: 40 } }, // 前へ長い空中技
      af: { name: '空中スイング', motion: 'chop', landLag: 10, startup: 8, active: 5, recovery: 12, damage: 8, knockX: 5, knockY: 2, hitstun: 18, effect: { preset: 'slash', color: '#ffe14a', angle: 1 }, box: { x: 20, y: -62, w: 110, h: 70 } }, // 斜め下へ長いリーチ
      au: { name: 'スカイピック', motion: 'flipKick', landLag: 7, startup: 6, active: 5, recovery: 10, damage: 6, knockX: 2, knockY: -9, hitstun: 20, effect: { preset: 'upper', color: '#ffe14a', color2: '#fff' }, box: { x: -5, y: -150, w: 85, h: 90 } }, // 前上へ長い
      ad: { name: 'ギタークラッシュ', motion: 'stomp', landLag: 14, startup: 9, active: 6, recovery: 14, damage: 9, knockX: 4, knockY: -5, hitstun: 22, effect: { preset: 'thunder', hit: [{ type: 'spark', length: 60 }, { type: 'shake', duration: 6, power: 4 }], attack: [{ type: 'wave', at: 'feet', width: 6, grow: 1.4 }, { type: 'spark', at: 'feet', length: 60 }] }, launch: { x: 0, y: 12 }, box: { x: -65, y: -28, w: 130, h: 34 } }, // 着地の衝撃が前後に広がる(低く広い判定)
      // ---- 必殺技 ----
      s: { name: 'サンダーボール', motion: 'cast', startup: 12, active: 3, recovery: 20, damage: 0, knockX: 0, knockY: 0, hitstun: 0, effect: { preset: 'cast', color: '#ffe14a', color2: '#fff' }, box: { x: 0, y: 0, w: 0, h: 0 } },
      sf: { name: 'パワーコード', motion: 'cross', startup: 12, active: 5, recovery: 24, damage: 13, knockX: 10, knockY: -5, hitstun: 28, effect: { preset: 'thunder', strength: 1.3, attack: [{ type: 'ring', at: 'hitbox', r: 46, width: 6 }, { type: 'spark', length: 80 }, { type: 'shake', duration: 5, power: 3 }] }, box: { x: 30, y: -110, w: 82, h: 90 },
        // ボルテージ50以上: 大きな音の衝撃波(強く吹き飛ばす)
        voltage: { need: 50, use: 50, name: 'パワーコード・MAX', damage: 19, knockX: 14, knockY: -7, hitstun: 32, effect: { preset: 'thunder', strength: 2.4, attack: [{ type: 'ring', at: 'hitbox', r: 70, width: 9 }, { type: 'spark', length: 110 }, { type: 'flash', r: 70, blend: 'add' }, { type: 'shake', duration: 10, power: 6 }] }, box: { x: 30, y: -125, w: 110, h: 115 } } },
      sb: { name: 'フィードバック', motion: 'cast', startup: 6, active: 10, recovery: 20, damage: 4, knockX: 8, knockY: -3, hitstun: 16, effect: { preset: 'barrier', color: '#ffe14a' }, box: { x: -30, y: -112, w: 95, h: 112 } },
      su: { name: 'ライトニングリフ', motion: 'rising', startup: 6, active: 7, recovery: 32, damage: 15, knockX: 3, knockY: -12, hitstun: 30, launch: { x: 3, y: -12 }, box: { x: -10, y: -165, w: 85, h: 145 }, // 腰の後ろからギターを大きく振り上げて跳ぶ。前の上まで広く届く(無敵なし)
        effect: { preset: 'rising', color: '#ffe14a', attack: [{ type: 'slash', angle: -1, width: 15, span: 3, r: 70 }, { type: 'spark', length: 70 }, { type: 'particles', count: 10, dir: 'up', speed: 6 }], hit: [{ type: 'spark', length: 70 }, { type: 'impact', r: 36 }] },
        // ボルテージ50以上: 雷をまとって高く跳ぶ
        voltage: { need: 50, use: 50, name: 'ライトニングリフ・MAX', damage: 20, hitstun: 34, launch: { x: 3, y: -14 }, effect: { preset: 'rising', color: '#ffe14a', strength: 2, attack: [{ type: 'slash', angle: -1, width: 18, span: 3, r: 80 }, { type: 'spark', length: 100 }], hit: [{ type: 'spark', length: 100 }, { type: 'impact', r: 46 }, { type: 'shake', duration: 8, power: 5 }] } } },
      sd: { name: 'アンプクラッシュ', motion: 'cast', startup: 14, active: 8, recovery: 28, damage: 12, knockX: 2, knockY: -9, hitstun: 30, effect: { preset: 'thunder', attack: [{ type: 'spark', at: 'feet', length: 60 }, { type: 'spark', at: 'feet', x: 60, length: 50, delay: 2 }, { type: 'wave', at: 'feet' }, { type: 'shake', duration: 6, power: 3 }] }, box: { x: -50, y: -40, w: 190, h: 40 } },
      // ---- コマンド技(command に入力を書く。書き方は character.js 冒頭の【コマンド技】) ----
      c1: { name: 'ギターソロ', command: '↓↘→+Z', motion: 'cross', startup: 10, active: 30, recovery: 22, damage: 2, knockX: 2, knockY: -1, hitstun: 26, hits: 5, hitInterval: 6, hitStop: 4, rank: 3, effect: { preset: 'thunder', attack: [{ type: 'spark', length: 70, duration: 30 }, { type: 'spark', length: 60, delay: 8, x: 10 }, { type: 'spark', length: 60, delay: 16 }] }, box: { x: 25, y: -95, w: 85, h: 65 },
        // ボルテージMAX(100): ギターソロ・ライブ(12段・長く鳴らす)
        voltage: { need: 100, use: 100, name: 'ギターソロ・ライブ', damage: 8, hits: 3, active: 30, hitInterval: 10, hitstun: 30, knockX: 5, effect: { preset: 'thunder', strength: 2, attack: [{ type: 'spark', length: 110, duration: 60 }, { type: 'spark', length: 90, delay: 10, x: 15 }, { type: 'spark', length: 90, delay: 25 }, { type: 'spark', length: 90, delay: 40, x: 20 }, { type: 'ring', at: 'body', r: 80, width: 6, duration: 30 }, { type: 'shake', duration: 20, power: 3 }] }, box: { x: 20, y: -110, w: 110, h: 90 } } },
      c2: { name: 'ステージダイブ', command: '→↓↘+A', air: true, motion: 'diveKick', startup: 8, active: 12, recovery: 16, damage: 11, knockX: 5, knockY: -6, hitstun: 26, rank: 7, effect: { preset: 'thunder', hit: [{ type: 'spark', length: 70 }, { type: 'impact', r: 34 }] }, launch: { x: 7, y: 9 }, landLag: 14, box: { x: 10, y: -55, w: 72, h: 62 } },
      // ---- ゲージ技(Z と A を同時押し)・超必殺技(↓ を押しながら Z と A) ----
      //   アンプブースト: 出すとボルテージが 50 たまる(次の →A / ↑A が強化版になる)
      gx: { name: 'アンプブースト', cost: 25, volt: 50, motion: 'cast', startup: 8, active: 8, recovery: 22, damage: 6, knockX: 9, knockY: -4, hitstun: 22, box: { x: -60, y: -135, w: 185, h: 135 },
        effect: { preset: 'thunder', strength: 2, attack: [{ type: 'ring', at: 'body', r: 115, width: 8 }, { type: 'spark', length: 110 }, { type: 'spark', length: 90, delay: 3, x: -30 }, { type: 'text', text: 'BOOST!', at: 'head' }], hit: [{ type: 'spark', length: 60 }] } },
      sx: { name: 'ギャラクシー・ライブ', super: true, cost: 100, invincible: 10, minScale: 0.85, motion: 'cross', startup: 10, active: 3, recovery: 28, damage: 0, knockX: 0, knockY: 0, hitstun: 0, box: { x: 0, y: 0, w: 0, h: 0 }, // ギターを鳴らし、背の高い音の壁を地面に走らせる(速い。跳び越すのは難しい)
        projectile: { speed: 10, damage: 24, radius: 55, life: 70, knockX: 13, knockY: -8, hitstun: 40, look: { preset: 'shockwave', color: '#ffe14a', color2: '#ffffff', size: 1.3 }, path: 'ground' },
        effect: { preset: 'thunder', strength: 2, start: [{ type: 'orb', at: 'front', r: 40, duration: 10, follow: true, blend: 'add', color: '#ffe14a' }],
          attack: [{ type: 'ring', at: 'front', r: 90, width: 8 }, { type: 'spark', length: 120 }, { type: 'flash', at: 'front', blend: 'add', r: 110 }, { type: 'text', text: 'LIVE!', at: 'head' }] },
        // ボルテージ100: アンコール(音の壁がもっと大きく、強くなる)
        voltage: { need: 100, use: 100, name: 'ギャラクシー・ライブ・アンコール', projectile: { damage: 34, radius: 70, look: { preset: 'shockwave', color: '#ffe14a', color2: '#ffffff', size: 1.6 } } } },
    },
  },
  {
    name: 'ルリ',
    desc: '水流使い:曲がる水弾・逆流・水まといの自動追撃',
    // 性能  身軽で速い。体力はやや少なめ
    stats: { hp: 94, jumpStartup: 4, landLag: 3, airLandLag: 8, speed: 4.5, jump: -14, airJumps: 1, dashSpeed: 10.5, shield: 50, knockbackTaken: 1.05 },
    ko: { type: 'fly', vx: 8, vy: -11, spin: -6.28, bounce: 1, slide: 0.88, air: 'tuck', lie: 'back' }, // くるっと回りながら飛ばされ、あお向けに倒れる
    sp: { max: 100, time: 0.012, hit: 0.65, combo: 1.2, hurt: 0.35, color: '#4fd8ff' }, // SP ゲージ: 当てるとややたまりやすい
    // 飛び道具(Aキー): 速い水の弾。軌道は技ごとに曲げられる(↓↘→+A 曲水弾)。↓↙←+A 逆流 は打撃を打ち返し、飛び道具を跳ね返すカウンター
    projectile: { speed: 9.5, damage: 5, radius: 10, life: 66, look: 'waterBolt', path: 'straight', from: { x: 42, y: -68 } },
    // 水まとい(ゲージ技 アクアヴェール で発動): まわりに浮いた水を AQUA ゲージぶんまとう。ゲージは少しずつ減る
    //   まとっている間、技が当たる(ガードされる)と、その技の follow の設定で 0.3 秒後に浮いた水が自動で追撃し、ゲージを cost だけ使う
    //   follow の書き方は character.js 冒頭の【水まとい】、追撃の種類は projectile.js の AQUA_KINDS
    aqua: { max: 100, decay: 0.06, delay: 18, color: '#5fe0ff' },
    // 見た目  color=体の色(服・スキンの基準) skin=肌の色  ※体の大きさ・服の色は drawing_character.js の body に書く
    look: {
      smooth: { atk: 0.75, move: 0.34 }, // 動きの追従の速さ(0〜1。大きいほどキビキビ)
      color: '#3fb8e8', skin: '#ffe4d0',
    },
    throw: {
      reach: [0.4, 1.55, 0.2, 0, 1.45, 0.2, 0, 0.8, -0.4, -0.5, 0.3, 12], // つかみに行く姿勢
      name: '投げ', box: { x: 0, y: -85, w: 68, h: 75 },
      startup: 6, active: 3, whiff: 22, release: 32, total: 58,
      f: { name: '渦巻き投げ', damage: 9, vx: 10, vy: -6, hitstun: 26, swing: 1, hold: { x: 52, y: 55 }, release: 34,
        motion: { hold: [-0.4, 1.6, 0.2, 0, 1.5, 0.2, 0, 0.6, -0.6, -0.5, 0.5, 0], rel: [0.5, 1.6, 0.05, 0, 1.5, 0.05, 0, 0.8, -0.3, -0.8, 0.3, 14], held: [-1.5, 2.6, 0.2, 0, 2.6, 0.2, 0, 0.1, 0, -0.1, 0, 0] },
        effect: { preset: 'splash', attack: [{ type: 'ring', at: 'body', r: 60, width: 5, flat: true, duration: 30 }], hit: [{ type: 'drops', at: 'hit', count: 12, speed: 6, dir: 'all' }, { type: 'ring', r: 30, width: 4 }] } },
      b: { name: '引き潮投げ', damage: 9, vx: 9, vy: -6, hitstun: 26, hold: { x: -10, y: 50 },
        motion: { hold: [0.1, 1.5, 0.9, 0, 1.4, 0.9, 0, 0.5, -0.4, -0.4, 0.4, 0], rel: [-0.5, 2.6, 0.3, 0, 2.6, 0.3, 0, 0.4, -0.4, -0.4, 0.4, -12], held: [-0.4, 2.2, 1.0, 0, 1.6, 1.2, 0, 0.8, -1.0, -0.4, 0.6, 0] },
        effect: { preset: 'water', hit: [{ type: 'wave', at: 'feet', width: 7, grow: 1.3 }, { type: 'drops', at: 'hit', count: 10, speed: 5, dir: 'back' }] } },
      u: { name: '噴水投げ', damage: 7, vx: 2, vy: -15, hitstun: 28, hold: { x: 30, y: 50 }, release: 30,
        motion: { hold: [0.35, 1.5, 1.2, 0, 1.4, 1.2, 0, 0.9, -1.3, -0.6, 1.0, 0], rel: [-0.2, 2.9, 0.1, 0.2, 2.6, 0.2, 0, 0.4, -0.3, -0.3, 0.3, 2], held: [0.3, 2.0, 1.5, 0, 1.8, 1.6, 0, 1.4, -1.8, 1.2, -1.6, 0] },
        effect: { preset: 'geyser', hit: [{ type: 'spout', at: 'feet', length: 180, width: 40, duration: 16 }, { type: 'drops', at: 'hit', count: 14, speed: 7, dir: 'up' }] } },
      d: { name: '水たまり落とし', damage: 10, vx: 3, vy: -7, hitstun: 30, hold: { x: 20, y: 100 }, spike: 4,
        motion: { hold: [-0.25, 3.0, 0.2, 0, 2.9, 0.2, 0, 0.5, -0.5, -0.4, 0.4, 0], rel: [0.85, 1.0, 0.2, 0, 0.9, 0.2, 0, 1.0, -1.2, -0.7, 1.0, 12], held: [-1.5, 2.6, 0.2, 0, 2.6, 0.2, 0, 0.1, 0, -0.1, 0, 0] },
        effect: { preset: 'splash', hit: [{ type: 'drops', at: 'feet', count: 16, speed: 6, dir: 'up', spread: 0.9 }, { type: 'ring', at: 'feet', flat: true, r: 70, width: 6 }, { type: 'impact', r: 36, color: '#2f8cff', color2: '#e8fbff' }] } },
    },
    hitPoses: { head: [0.2, 0.9, 1.9, 0, 0.7, 2, 0, 1.5, -1.3, 0, -1.5, 0] },
    poses: {
      // [lean,右肩,右肘,右手首,左肩,左肘,左手首,右腿,右膝,左腿,左膝,前後ずれ]
      idle: [0.1, 0.85, 1.95, 0, 0.55, 2.15, 0, -0.25, 0.25, 0.45, -0.2, 0], // 待機(軽く拳を上げ、つま先立ちぎみ)
      walk: [0.12, 0.5, 0.75, 0.85], // 歩き [lean,腕の振り,脚の振り,膝の曲げ]
      guard: [0.08, 1.05, 2.3, 0, 0.95, 2.4, 0, 0.35, -0.45, -0.3, 0.35, 0], // シールド
      crouch: [0.22, 0.85, 1.95, 0, 0.6, 2.1, 0, 0, -1.5, 1.5, -1.3, 0], // しゃがみ
      jumpSquat: [0.5, -0.1, 0.9, 0, -0.2, 0.9, 0, 1.15, -1.75, -1, 1.75, -2], // ジャンプ前隙
      landing: [0.5, 1.35, 0.4, 0, 0.9, 0.5, 0, 1.2, -1.6, -0.5, 0.9, 4], // 着地隙
      dashF: [0.5, -0.4, 1.2, 0, 1.1, 1.3, 0, 1.1, -0.6, -0.9, 0.6, 0], // 前ダッシュ(腕を後ろへ流して走る)
      dashB: [-0.25, 0.6, 1.7, 0, 0.4, 1.9, 0, 0.7, -0.9, 0.1, -0.4, 0], // バックステップ
      jumpUp: [-0.1, 1.4, 1.1, 0, 0.7, 1.3, 0, 0.9, -1.4, 0.2, -0.6, 0], // 上昇(片ひざを上げる)
      fall: [0, 1.7, 0.8, 0, 1.3, 0.9, 0, 0.35, -0.6, 0.1, -0.3, 0], // 落下(腕を広げてバランスを取る)
    },
    // 技ごとのモーション(w=振りかぶり s=打ち出し)
    motions: {
      b: { w: [0.15, 0.4, 1.9, 0, 0.5, 1.9, 0, 0.5, -0.5, -0.3, 0.4, 0], s: [-0.35, 1.55, 0.05, 0.4, 1.5, 0.1, 0.4, 0.3, -0.3, -0.7, 0.6, -4] },             // 逆噴射: 両手を前へ突き出し、反動でのけぞる
      d: { w: [0.15, 0.6, 1.6, 0, 0.5, 1.7, 0, 0.2, -0.9, -0.3, 0.4, -2], s: [-0.2, 0.45, 1.7, 0, 0.7, 1.6, 0, 1.25, -0.05, -0.3, 0.35, 6] },               // 引き波: 低い所から前へ蹴り上げる
      u: { w: [0.35, 0.3, 1.5, 0, 0.3, 1.5, 0, 0.8, -1.2, -0.4, 0.9, 0], s: [-0.25, 2.6, 0.25, 0.5, 2.5, 0.3, 0.5, 0.25, -0.2, -0.3, 0.25, 6] },              // 噴き上げ: しゃがんでから両手を前上へ
      an: { w: [0.3, 0.6, 1.8, 0, 0.6, 1.8, 0, 1.1, -1.6, 0.5, -1.3, 0], s: [-0.1, 2.4, 0.2, 0, 2.2, 0.3, 0, 0.9, -0.2, -0.7, -0.2, 0] },                    // 水泡破裂: 体を丸めてから、手足を大きく広げる
      ad: { w: [-0.25, 2.6, 0.5, 0, 2.5, 0.6, 0, 0.9, -1.4, 0.4, -1.1, 0], s: [0.2, 0.15, 0.1, 0.3, 0.25, 0.15, 0.3, 0.6, -0.9, 0.2, -0.7, 0] },             // 下方噴射: 両手を真下へ向けて水を噴く
      s: { w: [-0.15, 0.3, 2, 0, 0.6, 1.9, 0, 0.45, -0.4, -0.35, 0.35, -6], s: [0.25, 1.55, 0.05, 0.3, 0.5, 1.9, 0, 0.6, -0.4, -0.45, 0.35, 10] },            // 水弾: 片手で弾くように撃つ
      sf: { w: [-0.35, 0.2, 2.1, 0, 0.3, 2.1, 0, 0.5, -0.5, -0.4, 0.4, -10], s: [0.45, 1.6, 0.05, 0.5, 1.5, 0.1, 0.5, 0.9, -0.4, -0.8, 0.3, 18] },           // 大水爆: 両手をためてから前へ押し出す
      sd: { w: [-0.1, 1.6, 1.2, 0, 1.4, 1.2, 0, 1.5, -1.9, -0.3, 0.3, -2], s: [0.35, 0.7, 1.4, 0, 0.6, 1.5, 0, 0.35, -0.05, -0.55, 0.9, 6] },                // 大津波: 片足を高く上げ、地面を踏みつける
      su: { w: [0.4, 0.4, 1.6, 0, 0.4, 1.6, 0, 1, -1.5, 0.3, -1.1, 0], s: [-0.3, 3.0, 0.15, 0, 2.9, 0.2, 0, 0.7, -1, -0.1, -0.4, 4] },                       // 水爆昇: 両手を真上へ突き上げる
      c1: { w: [-0.2, 0.2, 2, 0, 0.5, 1.9, 0, 0.45, -0.4, -0.35, 0.35, -6], s: [0.15, 1.9, 0.6, 0.7, 0.7, 1.7, 0, 0.6, -0.4, -0.45, 0.35, 8] },              // 曲水弾: 手首をひねって、曲がる弾を放つ
      c2: { w: [0.1, 0.6, 1.8, 0, 0.5, 1.9, 0, 0.4, -0.4, -0.3, 0.3, -2], s: [-0.08, 1.3, 0.9, 0.6, 1.15, 1.0, 0.6, 0.45, -0.5, -0.4, 0.35, -4] },        // 逆流(構え): 両手のひらを前に出し、水流を受け止める
      c2_ctr: { w: [-0.2, 0.6, 1.9, 0, 0.5, 2, 0, 0.5, -0.5, -0.4, 0.4, -6], s: [0.5, 1.6, 0.05, 0.5, 1.5, 0.1, 0.5, 0.9, -0.4, -0.8, 0.3, 18] },           // 逆流・返し: 受け止めた水を両手で押し返す
      gx: { w: [0.3, 0.5, 1.8, 0, 0.5, 1.8, 0, 0.6, -0.9, -0.4, 0.7, 0], s: [-0.15, 2.2, 0.6, 0, 2.1, 0.7, 0, 0.35, -0.25, -0.35, 0.25, 0] },                // アクアヴェール: 両腕を広げて水を呼ぶ
      sx: { w: [0.3, 0.3, 1.8, 0, 0.3, 1.8, 0, 0.9, -1.3, -0.4, 0.9, 0], s: [-0.2, 2.7, 0.4, 0, 2.6, 0.5, 0, 0.4, -0.3, -0.4, 0.3, 0] },   // メイルシュトロム: 両手を掲げて渦を起こす
    },
    combos: ['Z→↓Z→→A (3HIT)', '↓Z→↓A 大津波 (下段から)', 'Z+A アクアヴェール中: どの技にも水の追撃が付く'],
    moves: {
      // follow = 水まとい中の追撃。cost=使う AQUA ゲージ / kind=種類(shot 水弾 / burst 相手の場所で弾ける / geyser 足元から噴き上がる /
      //   rain 上から降る / wave 地面を走る) / ほかは飛び道具と同じ(damage knockX knockY hitstun speed radius count …)。書かない項目は AQUA_KINDS の値
      // ---- 地上の通常技 ----
      n: { name: '水拳ジャブ', motion: 'jab', startup: 4, active: 5, recovery: 7, damage: 2, hits: 2, hitInterval: 3, hitStop: 4, knockX: 2, knockY: -1, hitstun: 16, effect: { preset: 'water', size: 0.7 }, box: { x: 30, y: -72, w: 50, h: 22 }, // 水の拳がもう一度当たる2段
        follow: { kind: 'shot', cost: 8, damage: 3 } },
      f: { name: 'しぶき弾け', motion: 'palm', startup: 10, active: 4, recovery: 16, damage: 8, knockX: 3, knockY: -7, hitstun: 26, effect: { preset: 'splash', size: 0.8 }, box: { x: 35, y: -72, w: 68, h: 46 }, // 当たると浮かせる(コンボの起点)
        follow: { kind: 'burst', cost: 12, damage: 5, knockX: 5 } },
      b: { name: '受け水', motion: 'palm', startup: 3, active: 10, recovery: 14, damage: 0, knockX: 0, knockY: 0, hitstun: 0, rank: 1, box: { x: 0, y: 0, w: 0, h: 0 }, // 小さなカウンター: 構えの間(10F)に打撃を受けると、軽く打ち返す(逆流の小さい版)
        effect: { preset: 'water', size: 0.6, attack: [{ type: 'ring', at: 'body', r: 34, width: 4 }] },
        counter: { name: '受け水・返し', motion: 'palm', startup: 2, active: 4, recovery: 14, damage: 6, knockX: 7, knockY: -4, hitstun: 24, invincible: 8, box: { x: 10, y: -100, w: 75, h: 80 }, effect: { preset: 'splash', size: 0.7 } },
        follow: { kind: 'shot', cost: 10, damage: 2, count: 2, spread: 1.2, speed: 13 } },
      u: { name: '噴き上げ', motion: 'uppercut', startup: 8, active: 6, recovery: 18, damage: 8, knockX: 1.5, knockY: -11, hitstun: 24, box: { x: 18, y: -165, w: 58, h: 165 }, // 前の地面から水が噴き上がる(対空)
        effect: { preset: 'geyser', size: 0.85 }, follow: { kind: 'geyser', cost: 14, damage: 5, knockY: -9 } },
      d: { name: '引き波', motion: 'sweep', startup: 6, active: 4, recovery: 13, damage: 5, knockX: -5, knockY: -1, hitstun: 22, box: { x: 20, y: -22, w: 95, h: 22 }, // 足元をすくって手前へ引き寄せる下段(バーサクの足狩りと違い、浮かせない)
        effect: { preset: 'water', angle: -1, attack: [{ type: 'crescent', angle: -1, width: 9, span: 2 }, { type: 'wave', at: 'feet', x: 55, width: 6, grow: 1.1 }, { type: 'drops', at: 'feet', x: 55, count: 6, speed: 4, dir: 'up', spread: 0.6 }] },
        follow: { kind: 'wave', cost: 10, damage: 4 } },
      da: { name: '水歩踏み込み', motion: 'lunge', startup: 8, active: 8, recovery: 15, damage: 4, hits: 2, hitInterval: 4, hitStop: 5, knockX: 4, knockY: -3, hitstun: 22, launch: { x: 11 }, box: { x: 25, y: -72, w: 68, h: 50 }, // 2段
        effect: { preset: 'dash', color: '#5fd6ff', attack: [{ type: 'lines', count: 5, length: 100, at: 'body' }, { type: 'crescent', width: 11, span: 1.8 }, { type: 'drops', at: 'feet', count: 6, speed: 3, dir: 'back' }] },
        follow: { kind: 'shot', cost: 10, damage: 4, path: { type: 'homing', turn: 0.09, delay: 2 } } },
      // ---- 空中の通常技 ----
      an: { name: '水泡破裂', motion: 'spinBack', landLag: 6, startup: 5, active: 5, recovery: 10, damage: 6, knockX: 4, knockY: -3, hitstun: 18, box: { x: -48, y: -112, w: 96, h: 100 }, // まわりの水を一気に破裂させる(全方位)
        effect: { preset: 'splash', attack: [{ type: 'ring', at: 'body', r: 55, width: 7, grow: 1.2 }, { type: 'drops', at: 'body', count: 14, speed: 6, dir: 'all' }, { type: 'flash', at: 'body', r: 50, blend: 'add', duration: 6 }] },
        follow: { kind: 'shot', cost: 12, damage: 2, count: 3, spread: 2.2 } },
      af: { name: '水纏い蹴り', motion: 'frontKick', landLag: 9, startup: 6, active: 8, recovery: 12, damage: 4, hits: 2, hitInterval: 4, hitStop: 5, knockX: 4, knockY: 2, hitstun: 18, box: { x: 10, y: -58, w: 82, h: 30 }, // 2段
        effect: { preset: 'water', attack: [{ type: 'crescent', width: 11, span: 2.2 }, { type: 'drops', count: 6, speed: 5, dir: 'forward', spread: 0.5 }] }, follow: { kind: 'shot', cost: 8, damage: 4 } },
      au: { name: 'アッパー', motion: 'uppercut', landLag: 7, startup: 5, active: 4, recovery: 11, damage: 6, knockX: 1, knockY: -10, hitstun: 20, box: { x: -25, y: -150, w: 62, h: 90 },
        effect: { preset: 'water', angle: -1, attack: [{ type: 'crescent', angle: -1, width: 10, span: 2.2 }, { type: 'drops', count: 6, speed: 5, dir: 'up' }] }, follow: { kind: 'shot', cost: 8, damage: 4 } },
      ad: { name: '下方噴射', motion: 'stomp', landLag: 10, startup: 8, active: 7, recovery: 13, damage: 8, knockX: 2, knockY: 8, hitstun: 22, launch: { x: 0, y: -4 }, box: { x: -22, y: -10, w: 44, h: 95 }, // 真下へ水を噴く。反動で少し浮く
        effect: { preset: 'waterJet', angle: 1, attack: [{ type: 'spout', at: 'feet', length: 95, width: 18, dir: 'down', duration: 14 }, { type: 'drops', at: 'feet', y: 60, count: 10, speed: 5, dir: 'all' }] },
        follow: { kind: 'rain', cost: 12, damage: 2, count: 3 } },
      // ---- 必殺技 ----
      s: { name: '水弾', motion: 'cast', startup: 12, active: 3, recovery: 23, damage: 0, knockX: 0, knockY: 0, hitstun: 0, effect: { preset: 'cast', color: '#5fd6ff', color2: '#e8fbff' }, box: { x: 0, y: 0, w: 0, h: 0 },
        follow: { kind: 'shot', cost: 10, damage: 4 } },
      sf: { name: '大水爆', motion: 'cross', startup: 14, active: 6, recovery: 26, damage: 12, knockX: 11, knockY: -6, hitstun: 30, box: { x: 30, y: -128, w: 118, h: 118 }, // 正面で大きく水を爆発させる
        effect: { preset: 'splash', strength: 1.8, start: [{ type: 'orb', at: 'front', r: 18, duration: 12, follow: true, blend: 'add' }] }, follow: { kind: 'burst', cost: 20, damage: 8, knockX: 9, radius: 40 } },
      sb: { name: '双水掌', motion: 'palm', startup: 9, active: 5, recovery: 22, damage: 12, knockX: 9, knockY: -4, hitstun: 26, box: { x: 25, y: -72, w: 80, h: 50 }, // 水をまとった両手で打つ
        effect: { preset: 'water', strength: 1.4, start: [{ type: 'orb', at: 'front', r: 14, duration: 9, follow: true, blend: 'add' }],
          attack: [{ type: 'crescent', width: 13, span: 2 }, { type: 'crescent', width: 9, span: 1.8, delay: 3, y: 18 }, { type: 'drops', count: 10, speed: 6, dir: 'forward', spread: 0.6 }] },
        follow: { kind: 'shot', cost: 15, damage: 4, count: 2, spread: 1.5 } },
      su: { name: '水爆昇', motion: 'rising', startup: 6, active: 16, recovery: 30, damage: 5, hits: 4, hitInterval: 4, hitStop: 4, knockX: 1, knockY: -8, hitstun: 26, launch: { x: 2, y: -9 }, box: { x: -28, y: -175, w: 80, h: 140 }, // 水をまといながら昇る4段。相手をそばに浮かせたまま運ぶ(空中のコンボへ)
        effect: { preset: 'splash', strength: 1.4, attack: [{ type: 'ring', at: 'head', r: 50, width: 8, grow: 1.3 }, { type: 'drops', at: 'head', count: 16, speed: 7, dir: 'up', spread: 1.1 }, { type: 'flash', at: 'head', r: 60, blend: 'add', duration: 8 }] },
        follow: { kind: 'burst', cost: 18, damage: 6, knockX: 2, knockY: -7, radius: 38 } },
      sd: { name: '大津波', motion: 'stomp', startup: 16, active: 8, recovery: 30, damage: 11, knockX: 6, knockY: -8, hitstun: 30, box: { x: -20, y: -48, w: 200, h: 48 }, // 地面を踏みつけ、前へ大きな水の衝撃波
        effect: { preset: 'tide' }, follow: { kind: 'wave', cost: 18, damage: 7, radius: 22, speed: 9 } },
      // ---- コマンド技(command に入力を書く。書き方は character.js 冒頭の【コマンド技】) ----
      c1: { name: '曲水弾', command: '↓↘→+A', motion: 'cast', startup: 13, active: 3, recovery: 24, damage: 0, knockX: 0, knockY: 0, hitstun: 0, effect: { preset: 'cast', color: '#5fd6ff', color2: '#e8fbff' }, box: { x: 0, y: 0, w: 0, h: 0 },
        // 撃った弾が相手の方へ曲がる(上へ撃ち出してから曲がるので、飛び越えても追いかける)
        projectile: { speed: 8, damage: 7, life: 110, look: 'waterBolt', path: { type: 'homing', turn: 0.07, delay: 6, angle: -35 } },
        follow: { kind: 'geyser', cost: 12, damage: 5, knockY: -9 } },
      c2: { name: '逆流', command: '↓↙←+A', motion: 'palm', startup: 3, active: 24, recovery: 22, damage: 0, knockX: 0, knockY: 0, hitstun: 0, box: { x: 0, y: 0, w: 0, h: 0 },
        // カウンター: 構えている間(持続 24F)に打撃を受けると、ダメージを受けずに水流を逆流させて打ち返す(counter の技が出る。無敵つき)
        //   飛び道具を受けたときは、跳ね返す。空振りすると後隙が大きい。投げには負ける
        effect: { color: '#5fd6ff', color2: '#e8fbff', start: [{ type: 'orb', at: 'front', r: 14, duration: 6, follow: true, blend: 'add' }],
          attack: [{ type: 'ring', at: 'body', r: 46, width: 4, grow: 0.25, duration: 24 }, { type: 'ring', at: 'body', r: 34, width: 3, grow: 0.3, duration: 24, delay: 4, color: '#bff0ff' }, { type: 'drops', at: 'front', count: 4, speed: 2, dir: 'down' }] },
        counter: { name: '逆流・返し', startup: 3, active: 6, recovery: 18, damage: 14, knockX: 10, knockY: -6, hitstun: 30, invincible: 14, launch: { x: 4 }, box: { x: -5, y: -125, w: 125, h: 125 },
          effect: { preset: 'splash', strength: 1.6, start: [{ type: 'text', text: '逆流!', at: 'head' }, { type: 'ring', at: 'body', r: 60, width: 7, grow: 1.4, duration: 14 }, { type: 'flash', at: 'body', r: 60, blend: 'add', duration: 8 }],
            attack: [{ type: 'beam', at: 'base', width: 24, duration: 12 }, { type: 'drops', count: 16, speed: 7, dir: 'forward', spread: 0.6 }, { type: 'spout', at: 'feet', x: 70, length: 120, width: 34, duration: 14 }, { type: 'shake', duration: 10, power: 5 }],
            hit: [{ type: 'impact', r: 44, color: '#2f8cff', color2: '#e8fbff' }, { type: 'drops', count: 14, speed: 6, dir: 'all' }] } },
        follow: { kind: 'geyser', cost: 12, damage: 5, knockY: -9 } },   // 水まとい中は、打ち返しのあとに水柱
      // ---- コマンド投げ ----
      // 水牢: つかんだ相手を水の玉に閉じこめて持ち上げ、水柱で真上へ打ち上げる。ダメージは小さいが、高く浮くので追撃できる
      c3: { name: '水牢', command: '↓↘→+Z', motion: 'palm', startup: 6, active: 3, recovery: 30, damage: 9, knockX: 1, knockY: -15, hitstun: 44, hitStop: 12,
        grab: { dir: 'u', box: { x: 0, y: -95, w: 70, h: 90 }, release: 32, total: 50, hold: { x: 42, y: 95 }, color: '#5fd6ff',
          motion: { hold: [-0.1, 2.6, 0.4, 0, 2.5, 0.4, 0, 0.4, -0.4, -0.4, 0.4, 0], rel: [-0.3, 3.0, 0.1, 0, 2.9, 0.1, 0, 0.4, -0.4, -0.4, 0.4, 2], held: [0.3, 2.0, 1.5, 0, 1.8, 1.6, 0, 1.4, -1.8, 1.2, -1.6, 0] } },
        effect: { color: '#2f8cff', color2: '#dff7ff', attack: [{ type: 'ring', at: 'hit', r: 46, width: 6, duration: 30 }, { type: 'orb', at: 'hit', r: 44, duration: 30, color: '#5fd6ff' }, { type: 'drops', at: 'hit', count: 10, speed: 3, dir: 'all' }],
          hit: [{ type: 'spout', at: 'feet', length: 200, width: 46, duration: 18 }, { type: 'drops', at: 'hit', count: 16, speed: 7, dir: 'up', spread: 0.9 }, { type: 'text', text: '水牢!', at: 'head' }] },
        follow: null },
      // ---- ゲージ技(Z と A を同時押し)・超必殺技(↓ を押しながら Z と A) ----
      //   アクアヴェール: 出すと AQUA ゲージが満タンになり、まわりに水が浮く(veil=ためる量)。攻撃判定は無い
      gx: { name: 'アクアヴェール', cost: 50, veil: 100, motion: 'cast', startup: 8, active: 6, recovery: 18, damage: 0, knockX: 0, knockY: 0, hitstun: 0, box: { x: 0, y: 0, w: 0, h: 0 },
        effect: { preset: 'splash', start: [{ type: 'orb', at: 'body', r: 40, duration: 12, follow: true, blend: 'add' }],
          attack: [{ type: 'ring', at: 'body', r: 70, width: 6, grow: 1.2, duration: 16 }, { type: 'drops', at: 'feet', count: 14, speed: 6, dir: 'up', spread: 1.2 }, { type: 'text', text: 'AQUA VEIL!', at: 'head' }], hit: [] } },
      sx: { name: 'メイルシュトロム', super: true, cost: 100, invincible: 12, minScale: 0.75, motion: 'rising', startup: 8, active: 36, recovery: 32, damage: 4, hits: 6, hitInterval: 6, hitStop: 4, knockX: -1, knockY: -4, hitstun: 30, box: { x: -90, y: -190, w: 260, h: 190 }, // 大渦を起こし、まわりの相手を6段巻き込む(1段4)
        effect: { preset: 'tide', strength: 2.5, start: [{ type: 'ring', at: 'body', r: 120, width: 10, color: '#2f8cff' }, { type: 'orb', at: 'body', r: 50, duration: 8, follow: true, blend: 'add', color: '#5fd6ff' }],
          attack: [{ type: 'ring', at: 'body', r: 150, width: 10, grow: 1.3, duration: 36 }, { type: 'spout', at: 'feet', length: 220, width: 60, duration: 24, delay: 10 }, { type: 'drops', at: 'body', count: 24, speed: 8, dir: 'all', delay: 6 }, { type: 'text', text: '大渦!', at: 'head' }],
          hit: [{ type: 'drops', count: 8, speed: 5, dir: 'all' }, { type: 'ring', r: 30, width: 4 }] },
        follow: { kind: 'geyser', cost: 20, damage: 6, knockY: -12 } },
    },
  },
  {
    name: 'アサカ',
    desc: '陽光の魔法少女:速い光の矢と踏み込みで攻める・ストンと落ちる',
    // 性能  ツキハ(月葉)の対。ツキハが「遠くから遅い闇を置いて待つ」なら、アサカは「速い光で間合いを詰めて攻める」
    //   歩きが速く、ジャンプは高いが重力が強くてストンと落ちる(gravityMul>1)。ダッシュはツキハより遅い。体力はツキハと同じ、シールドはやや多め
    stats: { hp: 100, jumpStartup: 4, landLag: 3, airLandLag: 8, speed: 4.6, jump: -14.5, airJumps: 1, gravityMul: 1.15, dashSpeed: 9.5, shield: 60 },
    ko: { type: 'fly', vx: 9, vy: -8, gravity: 1.15, spin: 0, bounce: 1, slide: 0.9, air: 'blown', lie: 'front', dust: '#ffe9a8' }, // 強く飛ばされ、はねてうつぶせに倒れる
    sp: { max: 100, time: 0.007, hit: 0.85, combo: 1.3, hurt: 0.45, pj: 0.45, color: '#ffc83a' }, // SP ゲージ: 時間ではほとんどたまらず、当てて(攻めて)ためる
    // 飛び道具(Aキー): とても速いが小さく、すぐ消える光の矢(中距離まで。ツキハの遅く長く残る闇の弾と逆)
    projectile: { speed: 15, damage: 5, radius: 9, life: 32, knockX: 5, knockY: -2, hitstun: 18, look: 'sunRay', path: 'straight', from: { x: 46, y: -76 } },
    // 見た目  color=体の色(服・スキンの基準) skin=肌の色  ※体の大きさ・服の色は drawing_character.js の body に書く
    look: {
      smooth: { atk: 0.78, move: 0.36 }, // 動きの追従の速さ(0〜1。大きいほどキビキビ)
      color: '#fffaf0', skin: '#ffe8d4',
    },
    throw: {
      reach: [0.4, 1.6, 0.2, 0, 1.5, 0.2, 0, 0.9, -0.4, -0.6, 0.3, 14], // つかみに行く姿勢
      name: '投げ', box: { x: 0, y: -85, w: 70, h: 75 },
      startup: 6, active: 3, whiff: 22, release: 32, total: 58,
      f: { name: '陽だまり投げ', damage: 10, vx: 10, vy: -6, hitstun: 26, hold: { x: 26, y: 55 }, release: 28,
        motion: { hold: [0.1, 1.5, 0.9, 0, 1.4, 0.9, 0, 0.5, -0.4, -0.4, 0.4, 0], rel: [0.5, 1.6, 0.05, 0, 1.5, 0.05, 0, 0.8, -0.3, -0.8, 0.3, 14], held: [-0.4, 2.2, 1.0, 0, 1.6, 1.2, 0, 0.8, -1.0, -0.4, 0.6, 0] },
        effect: { preset: 'sunlight', hit: [{ type: 'bloom', r: 36, count: 8, duration: 14, blend: 'add' }, { type: 'petals', at: 'hit', count: 10, dir: 'forward', speed: 5 }, { type: 'flash', r: 40, blend: 'add' }] } },
      b: { name: '日返し', damage: 9, vx: 9, vy: -6, hitstun: 26, leap: 70, hold: { x: 0, y: 60 }, release: 30,
        motion: { hold: [-0.6, 2.6, 0.4, 0, 2.4, 0.4, 0, 1.5, -1.6, 0.6, -1.2, 0], rel: [-0.9, 2.4, 0.3, 0, 2.3, 0.4, 0, 1.8, -0.6, 0.5, -0.9, -10], held: [0.3, 2.0, 1.5, 0, 1.8, 1.6, 0, 1.4, -1.8, 1.2, -1.6, 0] },
        effect: { preset: 'sunlight', hit: [{ type: 'flash', r: 50, blend: 'add' }, { type: 'petals', at: 'hit', count: 12, dir: 'all', speed: 4 }] } },
      u: { name: '朝空投げ', damage: 7, vx: 2, vy: -15, hitstun: 28, release: 30,
        motion: { hold: [0.35, 1.5, 1.2, 0, 1.4, 1.2, 0, 0.9, -1.3, -0.6, 1.0, 0], rel: [-0.2, 2.9, 0.1, 0.2, 2.6, 0.2, 0, 0.4, -0.3, -0.3, 0.3, 2], held: [-0.4, 2.2, 1.0, 0, 1.6, 1.2, 0, 0.8, -1.0, -0.4, 0.6, 0] },
        effect: { preset: 'sunlight', hit: [{ type: 'bloom', r: 40, count: 10, duration: 16, blend: 'add' }, { type: 'petals', at: 'hit', count: 12, dir: 'up', speed: 6 }] } },
      d: { name: '天光落とし', damage: 10, vx: 3, vy: -7, hitstun: 30, hold: { x: 20, y: 105 }, spike: 4,
        motion: { hold: [-0.25, 3.0, 0.2, 0, 2.9, 0.2, 0, 0.5, -0.5, -0.4, 0.4, 0], rel: [0.85, 1.0, 0.2, 0, 0.9, 0.2, 0, 1.0, -1.2, -0.7, 1.0, 12], held: [-1.5, 2.6, 0.2, 0, 2.6, 0.2, 0, 0.1, 0, -0.1, 0, 0] },
        effect: { preset: 'solar', hit: [{ type: 'pillar', at: 'feet', width: 50, duration: 20 }, { type: 'impact', r: 40, color: '#ffb02a', color2: '#fffbe0' }, { type: 'shake', duration: 10, power: 6 }] } },
    },
    hitPoses: { head: [0.2, 0.9, 1.9, 0, 0.7, 2, 0, 1.5, -1.3, 0, -1.5, 0] },
    poses: {
      // [lean,右肩,右肘,右手首,左肩,左肘,左手首,右腿,右膝,左腿,左膝,前後ずれ]
      idle: [0.06, 0.45, 1.15, -0.2, 0.35, 0.6, 0, -0.2, 0.15, 0.35, -0.2, 0, , , , , 2, , , , , 2], // 待機(タクトを前に掲げ、少し前のめり)
      walk: [0.12, 0.45, 0.75, 0.8], // 歩き(はずむように) [lean,腕の振り,脚の振り,膝の曲げ]
      guard: [0.09, 1, 2.3, 0, 0.9, 2.4, 0, 0.35, -0.45, -0.3, 0.35, 0], // シールド
      crouch: [0.2, 0.9, 1.9, 0, 0.7, 2, 0, 0, -1.5, 1.5, -1.3, 0], // しゃがみ
      jumpSquat: [0.45, -0.06, 0.9, 0, -0.13, 0.9, 0, 1.15, -1.75, -1, 1.75, -2], // ジャンプ前隙
      landing: [0.45, 1.41, 0.4, 0, 0.9, 0.5, 0, 1.2, -1.6, -0.5, 0.9, 4], // 着地隙
      dashF: [0.45, -0.3, 1.2, 0, 1.0, 1.3, 0, 1.0, -0.7, -0.8, 0.6, 0], // 前ダッシュ(駆け出す)
      dashB: [-0.23, 0.6, 1.7, 0, 0.4, 1.9, 0, 0.7, -0.9, 0.1, -0.4, 0], // バックステップ
      jumpUp: [-0.1, 2.2, 0.6, 0, 1.0, 1.2, 0, 0.9, -1.4, 0.2, -0.6, 0], // 上昇(タクトを空へ)
      fall: [0.05, 1.5, 1.0, 0, 1.1, 0.9, 0, 0.2, -0.3, 0.1, -0.2, 0], // 落下(脚をそろえてストンと)
    },
    // 技ごとのモーション(w=振りかぶり s=打ち出し)。右腕(手前)=タクトを持つ手 / 左腕(奥)=光を放つ手
    //   [lean,右肩,右肘,右手首,左肩,左肘,左手首,右腿,右膝,左腿,左膝,前後ずれ]
    motions: {
      n: { w: [-0.05, 0.4, 1.9, 0.2, 0.3, 1.3, 0, 0.4, -0.4, -0.3, 0.3, -4], s: [0.2, 1.55, 0.05, 0, -0.2, 0.8, 0, 0.55, -0.4, -0.45, 0.35, 12] },          // タクト突き
      f: { w: [-0.25, 0.3, 1.8, 0, -0.5, 2.3, 0, 0.5, -0.4, -0.4, 0.4, -6], s: [0.45, 0.5, 1.7, 0, 1.6, 0.05, 0, 0.9, -0.3, -0.8, 0.35, 20] },             // 陽光掌: 踏み込んで、奥の手で光の掌打
      b: { w: [-0.1, -0.5, 1.4, 0.2, 0.5, 1.6, 0, 0.3, -0.3, -0.2, 0.3, 4], s: [-0.25, 1.4, 0.1, 0, 0.7, 1.2, 0, 0.1, -0.2, -0.5, 0.7, -6] },             // 陽だまり寄せ: タクトの光で相手を引き寄せる
      u: { w: [0.2, 0.3, 1.8, 0, 0.4, 1.6, 0, 0.7, -1, -0.3, 0.8, 0], s: [-0.25, 3, 0.15, 0.3, 1.0, 1.4, 0, 0.2, -0.2, -0.3, 0.2, 4] },                    // 旭光: しゃがんでから頭上へ弧を描く
      d: { w: [0.3, 0.3, 1.9, 0, 0.4, 1.6, 0, 1, -1.5, 0.3, -1.1, -2], s: [0.5, 0.9, 0.05, 0.5, 0.3, 1.4, 0, 1.3, -1.2, -0.6, -1, 14] },                  // 芽吹き: 低くしゃがんで、足元にタクトを向ける
      da: { w: [0.4, -0.4, 1.6, 0, 0.9, 0.9, 0, 1, -0.9, -0.6, 0.6, -10], s: [0.65, 1.5, 0.05, 0, -0.6, 0.6, 0, 0.9, -0.3, -1, 0.4, 22] },              // デイブレイク: 駆け込みながら突く
      an: { w: [-0.4, -0.8, 0.6, 0, 0.2, 1.2, 0, 0.9, -1.4, 0.3, -1, -6], s: [0.4, 1.9, 0.1, 0.5, -0.5, 1, 0, 0.6, -0.9, -0.2, -0.6, 10] },             // ペタルスピン: 体ごと回してタクトを振る
      af: { w: [0.35, 0.2, 1.4, 0.3, 0.4, 1.3, 0, 1, -1.4, 0.2, -0.8, -4], s: [-0.35, 2.6, 0.1, 0.3, 1.2, 1.2, 0, 0.6, -0.6, -0.2, -0.5, 12] },           // ソルスラッシュ: 斜め下から斜め上へ切り上げる
      au: { w: [0.2, 0.4, 1.6, 0, 0.4, 1.5, 0, 1, -1.5, 0.5, -1.2, 0], s: [-0.6, 2.9, 0.1, 0.2, 2.2, 0.6, 0, 1.6, -0.3, 0.3, -0.6, 2] },               // サンフレア: 反りながら真上へ
      ad: { w: [0.1, 2.6, 0.6, 0, 2.3, 0.8, 0, 0.9, -1.5, 0.5, -1.2, 0], s: [0.25, 0.15, 0.05, 0, 0.4, 0.5, 0, 0.3, -0.2, -0.2, -0.3, 0] },             // シャインフォール: 掲げたタクトを真下へ
      s: { w: [-0.15, 0.5, 2.1, 0.4, 0.5, 1.9, 0, 0.45, -0.4, -0.35, 0.35, -5], s: [0.2, 1.6, 0.05, 0.1, 0.6, 1.6, 0, 0.55, -0.4, -0.4, 0.35, 8] },         // サンレイ: タクトの先から光の矢を撃つ
      sf: { w: [0.3, -0.6, 1.7, 0, 0.8, 1.2, 0, 1.1, -1, -0.6, 0.6, -10], s: [0.7, 1.55, 0.05, 0, 1.4, 0.2, 0, 1.0, -0.2, -1, 0.5, 24] },                // サンシャインラッシュ: 光をまとって突進
      sb: { w: [0.5, -0.6, 1.2, 0, -0.4, 1.2, 0, 1.1, -1, -0.7, 0.6, -6], s: [0.8, 0.6, 1.5, 0, -0.6, 1.4, 0, 1.2, -0.3, -1, 0.3, 26] },                  // 陽炎渡り: 身を低くして相手をすり抜ける
      su: { w: [0.35, 0.2, 1.8, 0, 0.4, 1.6, 0, 1, -1.5, 0.3, -1.1, 0], s: [-0.3, 3.05, 0.1, 0.2, 1.4, 0.6, 0, 1.0, -1.3, -0.1, -0.3, 6] },               // サンライズ・ブルーム: タクトを突き上げて昇る
      sd: { w: [0.1, 0.8, 1.6, 0, 0.6, 1.5, 0, 0.4, -0.3, -0.3, 0.3, -2], s: [-0.25, 2.9, 0.2, 0.4, 2.2, 0.6, 0, 0.35, -0.2, -0.35, 0.25, 0] },             // 天光の柱: タクトを空へ掲げて光を呼ぶ
      c1: { w: [-0.1, 2.5, 0.5, 0, 1.9, 0.8, 0, 0.9, -1.4, 0.4, -1.1, 0], s: [0.65, 1.15, 0.05, 0.25, 0.4, 1.1, 0, 0.5, -0.5, -0.5, -0.4, 16] },          // 天降花: タクトを掲げてから、斜め下へ突き出して飛び込む
      c2: { w: [0.35, 0.5, 2.1, 0, 0.5, 2.1, 0, 0.9, -1.3, -0.4, 0.9, 0], s: [-0.2, 2.4, 0.3, 0.3, 2.3, 0.3, 0, 0.45, -0.3, -0.45, 0.3, 0] },            // フルブルーム: 体を丸めてから、両腕を開いて咲く
      gx: { w: [-0.15, 0.6, 2.1, 0.4, 0.6, 1.9, 0, 0.45, -0.4, -0.35, 0.35, -6], s: [0.25, 1.75, 0.05, 0, 1.4, 0.3, 0, 0.6, -0.4, -0.45, 0.35, 10] },     // ソーラーペタル
      sx: { w: [-0.2, 0.4, 2.2, 0.3, 0.4, 2.2, 0, 0.6, -0.6, -0.4, 0.5, -8], s: [0.25, 1.6, 0.05, 0, 1.55, 0.1, 0, 0.75, -0.4, -0.6, 0.35, 8] },          // ソレイユ・オーバード: 両手を前へ突き出して光を放つ
    },
    combos: ['Z→→Z→A (3HIT)', '↓Z→↓↙←+A フルブルーム (近距離で突き放す)', '←Z 陽だまり寄せ→Z (引き寄せて攻め続ける)', 'ジャンプ中 ↓↘→+Z 天降花→着地して Z (斜め下へ飛び込んで攻める)'],
    moves: {
      // ---- 地上の通常技 ----  ※ツキハと対になるように作っている(長い↔短い、遅い↔速い、離れる↔寄る、下から↔上から)
      n: { name: 'タクト突き', motion: 'jab', startup: 4, active: 2, recovery: 5, damage: 4, knockX: 3, knockY: -2, hitstun: 16, launch: { x: 3 }, effect: { preset: 'sunlight', size: 0.7 }, box: { x: 30, y: -74, w: 46, h: 22 } }, // 一歩踏み込みながら突く(攻め続けるための小技)
      // 陽光掌: 闇の鞭(長く細い・遅い)の逆。短いが速く重い
      f: { name: '陽光掌', motion: 'palm', startup: 8, active: 4, recovery: 12, damage: 8, knockX: 6, knockY: -3, hitstun: 22, effect: { preset: 'sunlight', attack: [{ type: 'flash', r: 34, blend: 'add', duration: 8 }, { type: 'bloom', r: 26, count: 6, duration: 10, blend: 'add' }, { type: 'petals', count: 5, speed: 4 }] }, launch: { x: 6 }, box: { x: 25, y: -88, w: 52, h: 40 } }, // 前に出ながら打つ
      // 陽だまり寄せ: 羽ばたき退き(突き放して下がる)の逆。光の糸で相手を引き寄せる(knockX がマイナス)
      b: { name: '陽だまり寄せ', motion: 'palm', startup: 9, active: 4, recovery: 13, damage: 5, knockX: -7, knockY: -2, hitstun: 20, effect: { preset: 'sunlight', attack: [{ type: 'beam', at: 'base', width: 5, duration: 10 }, { type: 'petals', count: 4, dir: 'back', speed: 3 }] }, box: { x: 30, y: -80, w: 95, h: 26 } },
      u: { name: '旭光', motion: 'uppercut', startup: 6, active: 5, recovery: 17, damage: 7, knockX: 2, knockY: -11, hitstun: 24, effect: { preset: 'upper', color: '#ffc83a', color2: '#fffbe0', hit: [{ type: 'bloom', r: 22, blend: 'add', duration: 12 }, { type: 'star', count: 4, r: 14, spin: 2 }] }, launch: { x: 5 }, box: { x: -15, y: -145, w: 60, h: 85 } }, // 前に出ながらの対空
      // 芽吹き: 影の棘(遠くまで届く)の逆。届かないが速く、当たると浮かせる光の芽
      d: { name: '芽吹き', motion: 'sweep', startup: 5, active: 3, recovery: 8, damage: 5, knockX: 2, knockY: -1, hitstun: 22, effect: { preset: 'sunlight', attack: [{ type: 'bloom', at: 'feet', x: 52, flat: true, r: 26, count: 6, duration: 12, blend: 'add' }, { type: 'petals', at: 'feet', x: 50, y: -6, count: 5, dir: 'up', speed: 3, spread: 0.5 }] }, box: { x: 28, y: -26, w: 50, h: 26 } }, // 短いが、当てると大きく有利な下段
      da: { name: 'デイブレイク', motion: 'lunge', startup: 7, active: 8, recovery: 14, damage: 5, hits: 2, hitInterval: 4, hitStop: 5, knockX: 4, knockY: -3, hitstun: 22, effect: { preset: 'dash', color: '#ffc83a', hit: [{ type: 'impact', r: 34, color: '#ffb02a', color2: '#fffbe0' }, { type: 'petals', count: 6, dir: 'all', speed: 3 }] }, launch: { x: 12 }, box: { x: 25, y: -80, w: 60, h: 58 } }, // 2段の突進
      // ---- 空中の通常技 ----
      an: { name: 'ペタルスピン', motion: 'spinBack', landLag: 3, startup: 4, active: 8, recovery: 8, damage: 4, knockX: 2, knockY: -3, hitstun: 16, effect: { preset: 'sunlight', size: 0.8, attack: [{ type: 'crescent', width: 8, span: 3 }, { type: 'petals', at: 'body', count: 6, dir: 'all', speed: 3 }] }, box: { x: -10, y: -80, w: 70, h: 50 } }, // 着地隙が最小。飛び込んですぐ地上で攻める
      // ソルスラッシュ: ルナスラッシュ(頭上から斜め下)の逆。斜め下から斜め上へ切り上げて浮かせる
      af: { name: 'ソルスラッシュ', motion: 'chop', landLag: 9, startup: 6, active: 5, recovery: 12, damage: 7, knockX: 4, knockY: -7, hitstun: 20, effect: { preset: 'sunlight', attack: [{ type: 'crescent', angle: -1, width: 11, span: 2.6 }, { type: 'petals', count: 5, dir: 'up', speed: 4 }] }, box: { x: 15, y: -100, w: 75, h: 60 } },
      au: { name: 'サンフレア', motion: 'flipKick', landLag: 7, startup: 5, active: 5, recovery: 10, damage: 5, knockX: 2, knockY: -9, hitstun: 20, effect: { preset: 'upper', color: '#ffc83a', color2: '#fffbe0', hit: [{ type: 'bloom', r: 22, blend: 'add', duration: 12 }, { type: 'star', count: 5, r: 18, spin: 2 }] }, launch: { x: 5 }, box: { x: -30, y: -140, w: 60, h: 80 } }, // 前へ進みながら当てる(追いかける空対空)
      ad: { name: 'シャインフォール', motion: 'stomp', landLag: 8, startup: 8, active: 6, recovery: 14, damage: 8, knockX: 4, knockY: -4, hitstun: 22, effect: { preset: 'stomp', color: '#ffc83a', attack: [{ type: 'ring', at: 'feet', flat: true, r: 70, width: 5 }, { type: 'bloom', at: 'feet', r: 50, flat: true, blend: 'add', duration: 14 }], hit: [{ type: 'impact', r: 34 }, { type: 'shake', duration: 6, power: 4 }] }, launch: { x: 0, y: 16 }, box: { x: -60, y: -26, w: 120, h: 34 } }, // 一気に落ちて、着地のまわりに光の衝撃(左右どちらにも当たる)
      // ---- 必殺技 ----
      // サンレイ: ダークオーブ(とても遅い・長く残る)の逆。とても速いが、すぐ消える光の矢
      s: { name: 'サンレイ', motion: 'cast', startup: 9, active: 3, recovery: 16, damage: 0, knockX: 0, knockY: 0, hitstun: 0, effect: { preset: 'cast', color: '#ffc83a', color2: '#fffbe0' }, box: { x: 0, y: 0, w: 0, h: 0 } },
      // サンシャインラッシュ: ナイトメアブレイク(その場で大きく放つ)の逆。光をまとって突っ込む3段
      sf: { name: 'サンシャインラッシュ', motion: 'lunge', startup: 9, active: 15, recovery: 20, damage: 4, hits: 3, hitInterval: 4, hitStop: 5, knockX: 2.5, knockY: -2, hitstun: 24, launch: { x: 16 }, effect: { preset: 'sunlight', start: [{ type: 'orb', at: 'body', r: 34, duration: 9, follow: true, blend: 'add' }], attack: [{ type: 'lines', count: 5, at: 'body', length: 110 }, { type: 'petals', at: 'body', count: 10, dir: 'back', speed: 4 }, { type: 'flash', at: 'body', r: 50, blend: 'add', duration: 12, follow: true }] }, box: { x: 10, y: -90, w: 75, h: 70 } },
      // 陽炎渡り: 影隠れ(下がって離れる)の逆。無敵で前へ走り、相手をすり抜けながら打つ(当たると相手は向こう側へ飛ぶ)
      sb: { name: '陽炎渡り', motion: 'lunge', startup: 4, active: 12, recovery: 20, damage: 6, invincible: 14, knockX: -6, knockY: -3, hitstun: 20, launch: { x: 40 }, effect: { preset: 'sunlight', attack: [{ type: 'lines', count: 4, at: 'body', length: 90 }, { type: 'flash', at: 'body', r: 44, blend: 'add', follow: true }, { type: 'petals', at: 'body', count: 8, dir: 'back', speed: 2 }] }, box: { x: -35, y: -100, w: 80, h: 90 } },
      // サンライズ・ブルーム: ムーンサルトリガー(宙返り)の逆。出始め無敵で真上へ昇る切り返し
      su: { name: 'サンライズ・ブルーム', motion: 'rising', startup: 6, active: 9, recovery: 26, damage: 12, knockX: 5, knockY: -10, hitstun: 28, effect: { preset: 'rising', color: '#ffc83a', attack: [{ type: 'slash', angle: -1, width: 12 }, { type: 'petals', at: 'feet', count: 10, dir: 'up', speed: 6 }, { type: 'lines', count: 4, at: 'body', length: 80 }], hit: [{ type: 'bloom', r: 30, blend: 'add', duration: 14 }, { type: 'impact', r: 36, color: '#ffb02a', color2: '#fffbe0' }] }, launch: { x: 9, y: -10 }, box: { x: 0, y: -150, w: 70, h: 130 } }, // 無敵なし。斜め前へ飛び出して追いかける対空(後隙は短め)
      // 天光の柱: 奈落の門(足元から闇が噴き上がる・浮かす)の逆。離れた所へ空から光の柱が落ち、相手を地面へたたきつける
      sd: { name: '天光の柱', motion: 'cast', startup: 16, active: 8, recovery: 26, damage: 13, knockX: 2, knockY: 7, spike: 5, hitstun: 30, effect: { preset: 'solar', start: [{ type: 'orb', at: 'head', y: -20, r: 22, duration: 14, follow: true, blend: 'add' }] }, box: { x: 105, y: -80, w: 70, h: 80 } }, // 判定は低め(光の柱の絵は空から地面まで)
      // ---- コマンド技 ----
      // 天降花(あまふりばな): 夢幻蝶(空中で前へ水平に滑空)の逆。光の花びら羽を広げ、空中から斜め下へ突撃する(空中だけ)
      //   着地まで突っ込む。当たると相手を浮かせ、花びらが舞う。ガードされたり空振りすると着地隙が大きい
      c1: { name: '天降花', command: '↓↘→+Z', air: true, motion: 'diveKick', startup: 6, active: 18, recovery: 14, damage: 10, knockX: 6, knockY: -6, hitstun: 26, rank: 5, landLag: 13, launch: { x: 10, y: 2 },
        effect: { preset: 'sunlight', start: [{ type: 'flash', at: 'body', r: 34, blend: 'add', duration: 8, follow: true }],
          attack: [{ type: 'crescent', angle: 1, width: 11, span: 2.4 }, { type: 'lines', count: 4, at: 'body', length: 90 }, { type: 'petals', at: 'body', count: 12, dir: 'back', speed: 3, spread: 1 }],
          hit: [{ type: 'bloom', r: 30, blend: 'add', duration: 14 }, { type: 'impact', r: 34, color: '#ffb02a', color2: '#fffbe0' }, { type: 'petals', count: 10, dir: 'up', speed: 4, spread: 1 }] },
        box: { x: 10, y: -55, w: 72, h: 62 } },
      // フルブルーム: 月蝕の檻(前に長く残って6回当たる檻)の逆。自分のまわりに一瞬で大輪の花が咲き、一発で大きく突き放す
      c2: { name: 'フルブルーム', command: '↓↙←+A', motion: 'cast', startup: 7, active: 4, recovery: 24, damage: 12, knockX: 13, knockY: -6, hitstun: 30, rank: 3, effect: 'bloom', box: { x: -60, y: -82, w: 150, h: 82 } },
      // ---- ゲージ技(Z と A を同時押し)・超必殺技(↓ を押しながら Z と A) ----
      // ソーラーペタル: ルナティックオーブ(大きく遅い1発)の逆。速い光の花びらを3枚、扇に撃つ
      gx: { name: 'ソーラーペタル', cost: 25, motion: 'cast', startup: 10, active: 3, recovery: 20, damage: 0, knockX: 0, knockY: 0, hitstun: 0, box: { x: 0, y: 0, w: 0, h: 0 },
        projectile: { speed: 12, damage: 6, radius: 14, life: 44, count: 3, spread: 1.6, hitstun: 24, knockX: 6, knockY: -4, look: 'sunPetal' },
        effect: { preset: 'cast', color: '#ffc83a', color2: '#fffbe0', strength: 1.6, start: [{ type: 'bloom', at: 'front', r: 30, count: 8, duration: 12, follow: true, blend: 'add' }] } },
      // ソレイユ・オーバード(朝の歌): エクリプス・ノクターン(夜想曲。まわりを包んで引き寄せる)の逆。前へまっすぐ伸びる光の奔流で押し出す
      sx: { name: 'ソレイユ・オーバード', super: true, cost: 100, invincible: 12, minScale: 0.75, motion: 'cast', startup: 10, active: 30, recovery: 30, damage: 5, hits: 6, hitInterval: 5, hitStop: 4, knockX: 3, knockY: -2, hitstun: 30, box: { x: 20, y: -82, w: 520, h: 60 },
        effect: { preset: 'sunlight', strength: 2, start: [{ type: 'bloom', at: 'front', r: 50, count: 10, duration: 12, follow: true, blend: 'add' }, { type: 'orb', at: 'front', r: 40, duration: 10, follow: true, blend: 'add' }],
          attack: [{ type: 'beam', at: 'base', length: 520, width: 60, duration: 32 }, { type: 'beam', at: 'base', length: 520, width: 26, duration: 32, color: '#fffbe0' }, { type: 'flash', at: 'front', blend: 'add', r: 90, duration: 14 },
            { type: 'petals', at: 'front', count: 18, dir: 'forward', speed: 9, spread: 0.4, life: 40 }, { type: 'bloom', at: 'front', r: 70, count: 12, delay: 6, duration: 18, blend: 'add' }, { type: 'text', text: 'Aubade', at: 'head', delay: 12 }],
          hit: [{ type: 'bloom', r: 22, blend: 'add', duration: 10 }, { type: 'petals', count: 4, dir: 'forward', speed: 4 }] } },
    },
  },
  {
    name: 'メイ＆ロロ',
    desc: '呪の人形使い:人形ロロを必殺技で動かし、相手を前後から挟む・ロロが盾になる',
    // 性能  本体のメイは非力で打たれ弱い(体力90・シールド45)。人形のロロが前にいれば、ロロが身代わりになって攻撃を受ける
    //   ふつうの技(Z)を出すと、ロロが少し遅れて自動で連携攻撃をする(トレース)。ロロが相手の背後にいれば、背後からの攻撃はガードできない(挟み撃ち)
    //   必殺技(A)はロロを動かす技: A=おいで(呼び寄せ) →A=突進 ↑A=飛びかかり ←A=置き去り ↓A=罠   ロロの仕組みは puppet.js
    stats: { hp: 90, jumpStartup: 4, landLag: 3, airLandLag: 8, speed: 3.8, jump: -13, airJumps: 1, gravityMul: 0.92, dashSpeed: 9, shield: 45 },
    ko: { type: 'collapse', drift: 1, keys: [[16, 'kneel'], [18, 'kneelLow']], lie: 'front', thud: 8, dust: '#c49ae8' }, // 糸が切れた人形のように、ひざから崩れ落ちる
    sp: { max: 100, time: 0.012, hit: 0.6, hurt: 0.4, color: '#a050e0' },
    projectile: { speed: 6, damage: 4, radius: 10, life: 40, look: 'basic' },   // (使わない。A はロロを動かす技)
    // ロロ(人形): hp=耐久値 crash=クラッシュから再召喚までのF delay=トレースの遅れF guard=身代わりになる距離 home=定位置(メイの前) drag=定位置からこれ以上ずれるとすぐ歩いて戻る距離 walk=歩く速さ stay=挟み撃ちの位置で待つF backDmg=背後から当てたときの倍率
    //   throw=ロロのつかみ投げ(本体が投げを出すと、本体がつかめなかったときにロロがつかむ)。f=メイの方へ投げ返す b=向こうへ u=真上 d=たたきつけ
    puppet: { hp: 50, regen: 0.06, regenWait: 90, crash: 300, delay: 8, repair: 2, guard: 115, drag: 50, walk: 5.5, home: 40, stay: 40, backDmg: 0.8, scale: 0.82, color: '#c49ae8', label: 'ロロ',
      throw: { box: { x: 0, y: -80, w: 55, h: 80 },
        f: { name: '抱きつき返し', damage: 9, vx: 9, vy: -7, hitstun: 30 }, b: { name: '放り捨て', damage: 9, vx: 10, vy: -6, hitstun: 26 },
        u: { name: 'ぶん投げ', damage: 7, vx: 1, vy: -15, hitstun: 30 }, d: { name: 'ぬいぐるみ落とし', damage: 10, vx: 2, vy: -6, hitstun: 30, spike: 4 } } },
    look: {
      smooth: { atk: 0.62, move: 0.26 },   // エレガントで、少しゆっくりした動き
      color: '#1e1824', skin: '#f6ece8',
    },
    throw: {
      name: '投げ', box: { x: 0, y: -85, w: 62, h: 75 },
      startup: 7, active: 3, whiff: 24, release: 34, total: 60,
      reach: [0.3, 1.6, 0.4, 0.4, 1.2, 0.8, 0, 0.6, -0.4, -0.5, 0.3, 8], // 指の輪の糸を、相手へ投げかける
      f: { name: '糸縛り投げ', damage: 5, vx: 9, vy: -6, hitstun: 26, hold: { x: 50, y: 40 }, hits: [{ at: 10, damage: 2 }, { at: 18, damage: 2 }],
        motion: { hold: [0, 1.7, 0.6, 0.3, 0.8, 1.2, 0, 0.4, -0.3, -0.3, 0.3, 0], rel: [0.3, 1.5, 0.05, 0.4, 1.4, 0.1, 0, 0.6, -0.4, -0.5, 0.35, 8], held: [-0.3, 0.2, 0.1, 0, 0.2, 0.1, 0, 0.1, 0, -0.1, 0, 0] },
        effect: { preset: 'curse', attack: [{ type: 'sigil', at: 'hit', r: 40, duration: 26 }], hit: [{ type: 'lines', at: 'hit', count: 3, length: 50 }, { type: 'burst', r: 26 }] } },
      b: { name: '人形遊び', damage: 9, vx: 10, vy: -6, hitstun: 26, swing: 1, hold: { x: 55, y: 70 }, release: 38,
        motion: { hold: [-0.2, 2.6, 0.5, 0.3, 2.2, 0.6, 0, 0.4, -0.4, -0.3, 0.3, 0], rel: [-0.4, 2.8, 0.3, 0, 2.4, 0.3, 0, 0.4, -0.4, -0.4, 0.4, -8], held: [0.2, 2.6, 0.3, 0, 2.6, 0.3, 0, 0.3, -0.2, -0.2, 0.2, 0] },
        effect: { preset: 'curse', hit: [{ type: 'sigil', r: 30, duration: 16 }, { type: 'particles', count: 10, dir: 'all', speed: 4, color: '#3a1a4a' }] } },
      u: { name: '吊るし上げ', damage: 7, vx: 1, vy: -15, hitstun: 30, hold: { x: 40, y: 125 }, release: 40,
        motion: { hold: [-0.15, 3.0, 0.3, 0.4, 2.7, 0.4, 0, 0.4, -0.3, -0.3, 0.3, 0], rel: [-0.25, 3.1, 0.05, 0.3, 2.9, 0.1, 0, 0.3, -0.2, -0.3, 0.2, 2], held: [0.15, 2.9, 0.4, 0, 2.7, 0.5, 0, 0.1, 0, -0.1, 0.1, 0] },   // 操り人形のように両腕を吊られる
        effect: { preset: 'curse', attack: [{ type: 'lines', at: 'hit', count: 3, length: 60 }], hit: [{ type: 'sigil', r: 34, duration: 16 }, { type: 'particles', count: 8, dir: 'up', speed: 5 }] } },
      d: { name: '呪いの墓標', damage: 10, vx: 3, vy: -7, hitstun: 30, spike: 4, hold: { x: 30, y: 95 },
        motion: { hold: [-0.1, 2.9, 0.3, 0.3, 2.6, 0.4, 0, 0.4, -0.4, -0.3, 0.3, 0], rel: [0.55, 0.9, 0.2, 0.3, 0.8, 0.3, 0, 0.8, -1.0, -0.6, 0.8, 8] },
        effect: { preset: 'curse', hit: [{ type: 'sigil', at: 'feet', r: 60, flat: true, duration: 24 }, { type: 'impact', r: 40, color: '#3a1a4a', color2: '#ffb3f0' }, { type: 'shake', duration: 8, power: 5 }] } },
    },
    hitPoses: { head: [0.2, 0.9, 1.9, 0, 0.7, 2, 0, 1.5, -1.3, 0, -1.5, 0] },
    poses: {
      // [lean,右肩,右肘,右手首,左肩,左肘,左手首,右腿,右膝,左腿,左膝,前後ずれ]
      idle: [-0.06, 1.25, 0.35, 0.95, 0.2, 0.35, 0.2, -0.05, 0.08, 0.1, -0.06, 0, , , , , 1.5, , , , , 2], // 待機(手前の手を前へ差し出し、手首を垂らして糸を吊る。奥の手は下ろしてスカートのそば。足をそろえて背すじを伸ばす)
      walk: [0.04, 0.25, 0.4, 0.6], // 歩き(小さな歩幅で、しずしずと)
      guard: [-0.1, 1.3, 1.9, 0.5, 1.1, 2.1, 0.4, 0.15, -0.25, -0.15, 0.2, 0],   // ガード(両手を胸の前で交差させ、身を引く)
      crouch: [0.2, 0.9, 1.9, 0, 0.7, 2, 0, 0, -1.5, 1.5, -1.3, 0],
      jumpSquat: [0.4, -0.06, 0.9, 0, -0.13, 0.9, 0, 1.15, -1.75, -1, 1.75, -2],
      landing: [0.4, 1.4, 0.4, 0, 0.9, 0.5, 0, 1.2, -1.6, -0.5, 0.9, 4],
      dashF: [0.25, 0.5, 1.4, 0, 0.2, 1.5, 0, 0.8, -0.8, -0.6, 0.6, 0], // 前ダッシュ(すべるように)
      dashB: [-0.25, 0.6, 1.7, 0, 0.4, 1.9, 0, 0.7, -0.9, 0.1, -0.4, 0],
      jumpUp: [-0.05, 1.4, 1.2, 0, 1.1, 1.3, 0, 0.6, -1.2, 0.2, -0.8, 0],
      fall: [0, 1.7, 0.9, 0, 1.4, 0.9, 0, 0.3, -0.5, 0.1, -0.3, 0], // 落下(スカートをふくらませてゆっくり)
    },
    // メイのモーション(w=振りかぶり s=打ち出し)。指に付けた糸の輪で、糸を操る動き
    motions: {
      n: { w: [-0.08, 0.5, 1.8, 0.5, 0.4, 1.6, 0, 0.3, -0.3, -0.25, 0.25, -2], s: [0.12, 1.45, 0.15, 0.6, 0.4, 1.5, 0, 0.4, -0.3, -0.35, 0.3, 6] },       // 糸弾き: 指先で糸をはじく
      f: { w: [-0.2, -0.3, 1.6, 0.4, 0.6, 1.4, 0, 0.4, -0.3, -0.4, 0.4, -4], s: [0.25, 1.6, 0.05, 0.5, 0.5, 1.3, 0, 0.6, -0.3, -0.5, 0.3, 10] },        // 絡め糸: 腕を横へ払って糸を伸ばす
      b: { w: [0.1, 0.5, 2.0, 0.4, 0.6, 1.9, 0.3, 0.3, -0.3, -0.2, 0.3, 0], s: [0.2, 1.55, 0.1, 0.9, 1.45, 0.2, 0.8, 0.4, -0.3, -0.4, 0.4, 6] },          // 呪爆: 胸元で呪いを練り、両手を突き出して目の前で爆発させる
      u: { w: [0.15, 0.4, 1.7, 0.3, 0.4, 1.6, 0, 0.6, -0.9, -0.3, 0.7, 0], s: [-0.2, 2.9, 0.2, 0.6, 1.8, 0.8, 0, 0.3, -0.3, -0.3, 0.2, 2] },            // 吊り糸: 指を頭上へ引き上げる
      d: { w: [0.25, 0.6, 1.8, 0.3, 0.5, 1.7, 0, 1.4, -1.9, 0.2, -1.0, -2], s: [-0.35, 1.0, 1.2, 0.3, 1.2, 1.4, 0, 2.5, -0.1, -0.2, 0.1, 6] },          // 呪脚蹴り: しゃがんでひざをたたみ、呪いをまとった脚で高く蹴り上げる
      da: { w: [0.3, -0.2, 1.4, 0.3, 0.6, 1.2, 0, 0.9, -0.8, -0.6, 0.6, -8], s: [0.45, 1.5, 0.1, 0.5, 0.2, 1.0, 0, 0.8, -0.3, -0.9, 0.4, 18] },         // すべり糸: すべり込みながら糸を突き出す
      an: { w: [0.2, 1.3, 2.2, 0.5, 1.2, 2.2, 0.5, 1.0, -1.6, 0.6, -1.2, 0], s: [-0.1, 2.5, 0.1, 0.6, -0.9, 0.2, 0.6, 0.6, -0.4, -0.5, 0.3, 0] },        // 呪波: 体を抱えこんでから、両手を大きく広げて呪いを放つ
      af: { w: [-0.3, 2.8, 0.5, 0.3, 0.7, 1.2, 0, 0.8, -1.3, 0.2, -0.8, -4], s: [0.4, 1.0, 0.1, 0.5, -0.2, 1.0, 0, 0.9, -0.5, -0.2, -0.6, 10] },         // 糸鎌: 頭上から斜め下へ糸を振り下ろす
      au: { w: [0.2, 0.4, 1.6, 0.3, 0.4, 1.5, 0, 1.0, -1.5, 0.5, -1.2, 0], s: [-0.4, 2.9, 0.1, 0.5, 2.3, 0.5, 0, 1.4, -0.4, 0.3, -0.7, 2] },            // 天井糸: 反って真上へ
      ad: { w: [0.1, 2.6, 0.6, 0.3, 2.3, 0.8, 0, 0.9, -1.5, 0.5, -1.2, 0], s: [0.25, 0.3, 0.1, 0.6, 0.4, 0.5, 0, 0.3, -0.2, -0.2, -0.3, 0] },           // 落とし糸: 糸を真下へ垂らして降りる
      s: { w: [0.05, 1.3, 0.4, 0.3, 0.3, 0.4, 0.2, 0.1, -0.1, -0.15, 0.1, 0], s: [-0.05, 1.5, 1.2, 1.1, 0.25, 0.4, 0.2, 0.1, -0.1, -0.15, 0.1, 0] },         // おいで: 手のひらを上にして差し出し、指先を手前へ曲げて呼ぶ
      sf: { w: [-0.15, 0.6, 1.9, 0.4, 0.5, 1.8, 0, 0.4, -0.3, -0.3, 0.3, -4], s: [0.3, 1.6, 0.05, 0.6, 1.5, 0.1, 0.4, 0.7, -0.4, -0.6, 0.35, 10] },       // 突進ハサミ撃ち: 両手を前へ突き出して糸を放つ
      sb: { w: [0.1, 1.2, 1.4, 0.3, 1.0, 1.4, 0, 0.3, -0.3, -0.2, 0.3, 0], s: [-0.4, 1.6, 0.3, 0.6, 1.4, 0.4, 0, 0.1, -0.3, -0.6, 0.7, -14] },          // 置き去り: 糸を残して後ろへ下がる
      su: { w: [0.2, 0.6, 1.8, 0.4, 0.6, 1.8, 0, 0.6, -0.8, -0.4, 0.6, 0], s: [-0.25, 2.8, 0.3, 0.6, 2.6, 0.4, 0.4, 0.4, -0.4, -0.3, 0.3, 2] },          // 飛びかかり: 両手を高く振り上げて、ロロを放り上げる
      sd: { w: [0.2, 1.2, 1.2, 0.4, 1.0, 1.3, 0, 0.6, -0.8, -0.4, 0.6, 0], s: [0.45, 0.7, 0.4, 0.8, 0.6, 0.5, 0.4, 1.0, -1.3, -0.5, 0.9, 4] },           // 罠: しゃがんで、指を下へ向ける
      c1: { w: [-0.25, 2.9, 0.6, 0.5, 0.6, 1.4, 0, 0.4, -0.4, -0.3, 0.3, -2], s: [0.5, 0.8, 0.3, 0.9, 0.6, 1.3, 0, 0.8, -0.9, -0.5, 0.6, 8] },           // 呪いの釘: 藁人形へ釘を打ち下ろす
      c2: { w: [0.1, 0.4, 1.9, 0.4, 0.4, 1.8, 0, 0.4, -0.3, -0.3, 0.3, 0], s: [-0.2, 2.0, 0.5, 0.6, 1.8, 0.6, 0.4, 0.3, -0.3, -0.4, 0.4, -6] },          // 糸繰り: 糸をぐいっと引く
      gx: { w: [0.0, 1.8, 0.8, 0.5, 1.6, 0.9, 0.4, 0.4, -0.3, -0.3, 0.3, 0], s: [0.2, 2.4, 0.3, 0.8, -0.4, 0.8, 0, 0.5, -0.4, -0.4, 0.3, 4] },           // 呪縛・身代わり: 指を鳴らしてロロを消す
      sx: { w: [0.25, 0.5, 2.1, 0.5, 0.5, 2.1, 0.4, 0.6, -0.8, -0.4, 0.6, -4], s: [-0.3, 2.9, 0.2, 0.7, 2.8, 0.2, 0.5, 0.4, -0.4, -0.3, 0.3, 0] },        // カースド・マリオネット: 両手を掲げて糸を張る
    },
    combos: ['Z(ロロも追撃)→↓Z→→A (ロロが突進して挟む)', '→A でロロを相手の向こうへ → Z連打(前後から挟み撃ち・背後はガード不能)', '↓↙←+A 糸繰りでロロの方へ引き寄せ → Z'],
    moves: {
      // ---- 地上の通常技(メイの技 + puppet=ロロが少し遅れて出す連携攻撃) ----
      n: { name: '糸弾き', motion: 'jab', startup: 4, active: 2, recovery: 9, damage: 3, knockX: 2, knockY: -1, hitstun: 16, effect: { preset: 'curse', size: 0.6 }, box: { x: 30, y: -76, w: 44, h: 18 },
        puppet: { motion: 'stab', startup: 3, active: 3, recovery: 10, damage: 3, knockX: 2, knockY: -1, hitstun: 16, box: { x: 14, y: -58, w: 42, h: 24 }, effect: { preset: 'curse', size: 0.5, attack: [{ type: 'lines', at: 'body', count: 2, length: 40 }], hit: [{ type: 'cross', r: 16 }, { type: 'particles', count: 6, speed: 3, life: 20, color: '#f4efe6', color2: '#c49ae8' }] } } },
      f: { name: '絡め糸', motion: 'cross', startup: 8, active: 4, recovery: 16, damage: 6, knockX: 3, knockY: -2, hitstun: 20, effect: { preset: 'curse', attack: [{ type: 'beam', at: 'base', length: 100, width: 3, duration: 10 }, { type: 'sigil', x: 100, r: 12, duration: 12 }] }, box: { x: 30, y: -72, w: 100, h: 14 },
        puppet: { motion: 'swipe', startup: 4, active: 4, recovery: 12, damage: 5, knockX: 4, knockY: -2, hitstun: 20, box: { x: 8, y: -62, w: 50, h: 36 }, effect: { preset: 'curse', size: 0.7, attack: [{ type: 'claw', count: 3, width: 6, angle: 0 }], hit: [{ type: 'particles', count: 6, speed: 3, life: 20, color: '#f4efe6', color2: '#c49ae8' }] } } },
      b: { name: '呪爆', motion: 'palm', startup: 9, active: 4, recovery: 18, damage: 8, knockX: 13, knockY: -4, hitstun: 22, box: { x: 25, y: -96, w: 70, h: 62 },   // 目の前で呪いを爆発させ、相手を大きく吹き飛ばす
        effect: { preset: 'curse', attack: [{ type: 'burst', at: 'hitbox', r: 48, count: 10 }, { type: 'sigil', at: 'hitbox', r: 26, duration: 12 }, { type: 'particles', at: 'hitbox', count: 14, dir: 'all', speed: 5, color: '#8a3ad0', color2: '#ffb3f0' }], hit: [{ type: 'impact', r: 44, color: '#3a1a4a', color2: '#ffb3f0' }, { type: 'shake', duration: 6, power: 4 }] },
        puppet: { motion: 'spin', startup: 4, active: 8, recovery: 12, damage: 3, hits: 2, hitInterval: 4, knockX: 3, knockY: -3, hitstun: 18, box: { x: -42, y: -60, w: 84, h: 44 }, effect: { preset: 'curse', attack: [{ type: 'ring', at: 'body', r: 40, width: 4, flat: true }] } } },   // ロロがくるっと回り、前後どちらにも当たる
      u: { name: '吊り糸', motion: 'uppercut', startup: 6, active: 5, recovery: 17, damage: 5, knockX: 1, knockY: -10, hitstun: 22, effect: { preset: 'curse', angle: -1 }, box: { x: -10, y: -150, w: 50, h: 85 },
        puppet: { motion: 'rise', startup: 4, active: 5, recovery: 12, damage: 4, knockX: 1, knockY: -9, hitstun: 20, hop: -8, box: { x: -10, y: -110, w: 50, h: 70 }, effect: { preset: 'curse', angle: -1, size: 0.7, attack: [{ type: 'crescent', angle: -1, width: 7, span: 2 }], hit: [{ type: 'impact', r: 24 }] } } },
      d: { name: '呪脚蹴り', motion: 'sweep', startup: 7, active: 4, recovery: 15, damage: 6, knockX: 2, knockY: -10, hitstun: 24, box: { x: 15, y: -110, w: 55, h: 95 },   // 呪いをまとった脚で蹴り上げる(浮かせる)
        effect: { preset: 'curse', angle: -1, attack: [{ type: 'crescent', angle: -1, width: 10, span: 2.4 }, { type: 'particles', at: 'hitbox', count: 10, dir: 'up', speed: 4, color: '#8a3ad0', color2: '#ffb3f0' }], hit: [{ type: 'impact', r: 34, color: '#3a1a4a', color2: '#ffb3f0' }] },
        // ロロ: 跳び上がって両足で踏み鳴らし、地面に呪いの衝撃波を走らせる(下段)
        puppet: { motion: 'quake', startup: 6, active: 4, recovery: 14, damage: 4, knockX: 2, knockY: -6, hitstun: 20, low: true, box: { x: -10, y: -22, w: 120, h: 22 },
          effect: { preset: 'curse', attack: [{ type: 'wave', at: 'feet', grow: 1.2 }, { type: 'ring', at: 'feet', flat: true, r: 50, width: 4 }, { type: 'debris', at: 'feet', count: 5, dir: 'up', speed: 4, r: 4, duration: 24 }], hit: [{ type: 'impact', r: 26 }] } } },
      da: { name: 'すべり糸', motion: 'lunge', startup: 7, active: 6, recovery: 15, damage: 6, knockX: 5, knockY: -3, hitstun: 20, effect: { preset: 'curse', attack: [{ type: 'lines', at: 'body', count: 4, length: 90 }] }, launch: { x: 9 }, box: { x: 22, y: -76, w: 55, h: 50 },
        puppet: { motion: 'roll', trail: true, startup: 3, active: 8, recovery: 12, damage: 4, knockX: 4, knockY: -3, hitstun: 20, slide: 10, box: { x: -6, y: -50, w: 50, h: 46 }, effect: { preset: 'curse', size: 0.7, hit: [{ type: 'impact', r: 24 }, { type: 'particles', count: 6, speed: 3, life: 20, color: '#f4efe6', color2: '#c49ae8' }] } } },
      // ---- 空中の通常技(ロロが地上にいれば地上から合わせる。ロロも跳んでいれば air の空中攻撃を出す) ----
      an: { name: '呪波', motion: 'spinBack', landLag: 6, startup: 5, active: 12, recovery: 10, damage: 2, hits: 3, hitInterval: 4, knockX: 2, knockY: -2, hitstun: 14, box: { x: -60, y: -110, w: 120, h: 100 },   // 自分のまわりに呪いの衝撃波を放つ(3段)
        effect: { preset: 'curse', attack: [{ type: 'ring', at: 'body', r: 62, width: 5 }, { type: 'ring', at: 'body', r: 44, width: 3, delay: 4 }, { type: 'sigil', at: 'body', r: 42, duration: 16 }, { type: 'particles', at: 'body', count: 12, dir: 'all', speed: 4, color: '#8a3ad0', color2: '#ffb3f0' }], hit: [{ type: 'cross', r: 18 }] },
        puppet: { motion: 'rise', startup: 4, active: 5, recovery: 10, damage: 3, knockX: 1, knockY: -6, hitstun: 16, hop: -9, box: { x: -10, y: -110, w: 50, h: 70 }, effect: { preset: 'curse', size: 0.6 },
          // 空中: ロロ回転 … 空中でくるくる回り、針で前後をひっかく(2段)
          air: { motion: 'spin', startup: 3, active: 8, recovery: 10, damage: 2, hits: 2, hitInterval: 4, knockX: 2, knockY: -4, hitstun: 16, box: { x: -38, y: -66, w: 76, h: 58 }, effect: { preset: 'curse', attack: [{ type: 'ring', at: 'body', r: 38, width: 3 }] } } } },
      af: { name: '糸鎌', motion: 'chop', landLag: 10, startup: 7, active: 5, recovery: 12, damage: 6, knockX: 4, knockY: 2, hitstun: 18, effect: { preset: 'curse', angle: 1, attack: [{ type: 'crescent', angle: 1, width: 6, span: 2.4 }] }, box: { x: 20, y: -60, w: 80, h: 55 },
        puppet: { motion: 'swipe', startup: 4, active: 4, recovery: 12, damage: 4, knockX: 3, knockY: -2, hitstun: 18, box: { x: 8, y: -62, w: 50, h: 36 }, effect: { preset: 'curse', size: 0.6 },
          // 空中: 針ダイブ … 針を前へ構えて、斜め下へ突っ込む(着地で終わる)
          air: { motion: 'lunge', trail: true, startup: 4, active: 12, recovery: 12, damage: 4, knockX: 4, knockY: 2, hitstun: 18, dive: { x: 6, y: 7 }, airOnly: true, box: { x: 4, y: -56, w: 46, h: 40 }, effect: { preset: 'curse', angle: 1, attack: [{ type: 'lines', at: 'body', count: 3, length: 50 }] } } } },
      au: { name: '天井糸', motion: 'flipKick', landLag: 7, startup: 5, active: 5, recovery: 10, damage: 4, knockX: 1, knockY: -9, hitstun: 20, effect: { preset: 'curse', angle: -1, size: 0.7 }, box: { x: -30, y: -140, w: 60, h: 80 },
        puppet: { motion: 'rise', startup: 4, active: 5, recovery: 10, damage: 3, knockX: 1, knockY: -8, hitstun: 18, hop: -10, box: { x: -10, y: -115, w: 50, h: 75 }, effect: { preset: 'curse', angle: -1, size: 0.6 },
          // 空中: 突き上げ … 両手の針で頭上を突き上げる
          air: { motion: 'corkscrew', trail: true, startup: 3, active: 6, recovery: 10, damage: 3, knockX: 1, knockY: -8, hitstun: 18, box: { x: -20, y: -112, w: 46, h: 70 }, effect: { preset: 'curse', angle: -1, size: 0.6, attack: [{ type: 'ring', at: 'body', r: 30, width: 3 }] } } } },
      ad: { name: '落とし糸', motion: 'stomp', landLag: 12, startup: 8, active: 6, recovery: 14, damage: 6, knockX: 2, knockY: 8, hitstun: 22, effect: { preset: 'curse', angle: 1 }, launch: { x: 0, y: 9 }, box: { x: -25, y: -10, w: 50, h: 80 },
        puppet: { motion: 'slam', startup: 5, active: 4, recovery: 14, damage: 4, knockX: 2, knockY: -3, hitstun: 20, box: { x: 6, y: -50, w: 48, h: 50 }, effect: { preset: 'curse', size: 0.7 },
          // 空中: ぬいぐるみプレス … 真下へどすんと落ちて押しつぶす(着地で終わる)
          air: { motion: 'slam', trail: true, startup: 5, active: 14, recovery: 14, damage: 5, knockX: 2, knockY: 6, hitstun: 20, dive: { x: 0, y: 11 }, airOnly: true, box: { x: -26, y: -34, w: 52, h: 40 }, effect: { preset: 'curse', angle: 1, hit: [{ type: 'impact', r: 30, color: '#3a1a4a', color2: '#ffb3f0' }, { type: 'debris', count: 5, dir: 'up', speed: 4, r: 4 }, { type: 'shake', duration: 5, power: 3 }] } } } },
      // ---- 必殺技(A): ロロを動かす。メイ自身は攻撃しない ----
      //   solo = メイ自身の必殺技。S(本体の必殺のキー)を押しながら A で出す。ロロがクラッシュしている間は、ふつうの A でもこちらが出る
      //          S+A 呪い針(飛び道具) / S+→A 糸渡り(踏み込み) / S+↑A 吊るし糸(対空) / S+←A 呪縛払い(前へ大きく吹き飛ばす) / S+↓A 影縫い(下段)
      //   ↓A は綿爆弾(ロロがその場でふくらんで自爆する)
      s: { name: 'おいで', motion: 'cast', startup: 5, active: 2, recovery: 12, damage: 0, knockX: 0, knockY: 0, hitstun: 0, box: { x: 0, y: 0, w: 0, h: 0 }, effect: { preset: 'curse', attack: [{ type: 'lines', at: 'front', count: 3, length: 50 }] },
        solo: { name: '呪い針', puppet: { motion: 'lunge', trail: true, startup: 5, active: 5, recovery: 14, damage: 3, knockX: 3, knockY: -2, hitstun: 18, slide: 7, box: { x: 6, y: -60, w: 80, h: 26 }, effect: { preset: 'curse', attack: [{ type: 'lines', at: 'body', count: 3, length: 70 }], hit: [{ type: 'cross', r: 18 }, { type: 'particles', count: 6, speed: 3, life: 20, color: '#f4efe6', color2: '#c49ae8' }] } },   // ロロ: 体ごと真横に伸びて、大針で長く突く
motionFrom: 'n', startup: 8, active: 2, recovery: 18, damage: 0, knockX: 0, knockY: 0, hitstun: 0, box: { x: 0, y: 0, w: 0, h: 0 }, projectile: { speed: 10, damage: 6, radius: 8, life: 46, look: 'kunai', hitstun: 22 }, effect: { preset: 'curse', attack: [{ type: 'sigil', at: 'front', r: 14, duration: 10 }] } },   // ロロがいないとき: 呪いの針を投げる(速い飛び道具)
        puppet: { cmd: 'pull', push: 95, hold: 150, speed: 8 } },   // 呼ばれたロロが自分で走って目の前へ来る。すでに目の前なら、少し前へ出て 150F そこを定位置にする(盾の位置)
      sf: { name: '突進ハサミ撃ち', motion: 'cast', startup: 8, active: 2, recovery: 14, damage: 0, knockX: 0, knockY: 0, hitstun: 0, box: { x: 0, y: 0, w: 0, h: 0 }, effect: { preset: 'curse', attack: [{ type: 'lines', at: 'front', count: 3, length: 70 }] },
        solo: { name: '糸渡り', puppet: { motion: 'roll', trail: true, startup: 3, active: 10, recovery: 12, damage: 4, knockX: 4, knockY: -4, hitstun: 20, slide: 11, box: { x: -10, y: -50, w: 54, h: 46 }, effect: { preset: 'curse', hit: [{ type: 'impact', r: 24 }, { type: 'particles', count: 6, speed: 3, life: 20, color: '#f4efe6', color2: '#c49ae8' }] } },   // ロロ: 丸まって転がり、メイを追いかけて体当たり
motionFrom: 'da', startup: 7, active: 8, recovery: 18, damage: 7, knockX: 6, knockY: -3, hitstun: 22, launch: { x: 15 }, box: { x: 10, y: -84, w: 80, h: 64 }, effect: { preset: 'curse', attack: [{ type: 'lines', at: 'body', count: 4, length: 90 }, { type: 'beam', at: 'base', length: 90, width: 3, duration: 10 }] } },   // ロロがいないとき: 張った糸の上をすべるように踏み込んで切る
        puppet: { cmd: 'dash', delay: 2, motion: 'dash', trail: true, startup: 8, active: 24, recovery: 4, speed: 12, min: 6, time: 36, past: 60, damage: 7, knockX: 10, knockY: -4, hitstun: 24, box: { x: 0, y: -66, w: 42, h: 56 },
          effect: { preset: 'curse', attack: [{ type: 'lines', at: 'body', count: 4, length: 80 }], hit: [{ type: 'cross', r: 24 }, { type: 'sigil', r: 24, duration: 14 }] } } },   // ロロが前へ突っ込む。A を押している間だけ進む(最低6F・最大36F)。相手の向こう側で止めれば挟み込み
      su: { name: '飛びかかり', motion: 'cast', startup: 7, active: 2, recovery: 16, damage: 0, knockX: 0, knockY: 0, hitstun: 0, box: { x: 0, y: 0, w: 0, h: 0 }, effect: { preset: 'curse', attack: [{ type: 'lines', at: 'head', count: 3, length: 60 }] },
        solo: { name: '吊るし糸', puppet: { motion: 'corkscrew', trail: true, startup: 4, active: 8, recovery: 14, damage: 2, hits: 2, hitInterval: 4, knockX: 1, knockY: -9, hitstun: 20, hop: -13, box: { x: -24, y: -130, w: 48, h: 90 }, effect: { preset: 'curse', angle: -1, attack: [{ type: 'ring', at: 'body', r: 34, width: 3 }, { type: 'lines', at: 'body', count: 3, length: 50 }] } },   // ロロ: きりもみしながら真上へ跳ね上がる(2段)
motionFrom: 'u', invincible: 5, startup: 5, active: 6, recovery: 24, damage: 8, knockX: 1, knockY: -11, hitstun: 26, box: { x: -15, y: -195, w: 75, h: 150 }, effect: { preset: 'curse', angle: -1, attack: [{ type: 'beam', at: 'base', length: 150, width: 4, duration: 12, angle: -1.4 }] } },   // ロロがいないとき: 頭上へ糸を張り上げる対空(出始め5F無敵)
        puppet: { cmd: 'leap', delay: 2, motion: 'leap', trail: true, startup: 3, active: 30, recovery: 12, vx: 6, vy: -14, damage: 8, knockX: 3, knockY: -7, hitstun: 26, low: true, box: { x: -10, y: -45, w: 60, h: 60 },
          effect: { preset: 'curse', hit: [{ type: 'impact', r: 34, color: '#3a1a4a', color2: '#ffb3f0' }, { type: 'sigil', r: 26, duration: 14 }] } } },   // ロロが斜め前へ大きく跳び、落ちながら振り下ろす(対空・飛び道具を越える・しゃがみ受け流しできない)
      sb: { name: '置き去り', motion: 'cast', startup: 4, active: 4, recovery: 18, damage: 0, knockX: 0, knockY: 0, hitstun: 0, launch: { x: -8, y: -5 }, box: { x: 0, y: 0, w: 0, h: 0 }, effect: { preset: 'curse', attack: [{ type: 'lines', at: 'body', count: 3, length: 60 }] },
        solo: { name: '呪縛払い', puppet: { motion: 'snip', startup: 6, active: 4, recovery: 14, damage: 3, hits: 2, hitInterval: 2, knockX: 5, knockY: -4, hitstun: 22, box: { x: 4, y: -66, w: 62, h: 44 }, effect: { preset: 'curse', attack: [{ type: 'cross', width: 6 }], hit: [{ type: 'impact', r: 30 }, { type: 'particles', count: 6, speed: 3, life: 20, color: '#f4efe6', color2: '#c49ae8' }] } },   // ロロ: 両腕を大きく開いて、ハサミのように閉じる(2段)
motionFrom: 'f', startup: 11, active: 6, recovery: 24, damage: 11, knockX: 10, knockY: -5, hitstun: 26, launch: { x: 3 }, box: { x: 25, y: -88, w: 100, h: 56 },
          effect: { preset: 'curse', strength: 1.4, attack: [{ type: 'crescent', angle: 0, width: 9, span: 2.4 }, { type: 'beam', at: 'base', length: 120, width: 5, duration: 10 }], hit: [{ type: 'impact', r: 40, color: '#3a1a4a', color2: '#ffb3f0' }, { type: 'sigil', r: 28, duration: 14 }, { type: 'shake', duration: 6, power: 4 }] } },   // メイの技: 呪いの糸を束ねて大きく横に払い、相手を前へ大きく吹き飛ばす(出は遅いが強い)
        puppet: { cmd: 'stay', delay: 6, motion: 'spin', startup: 4, active: 8, recovery: 12, damage: 4, hits: 2, hitInterval: 4, knockX: 5, knockY: -4, hitstun: 22, box: { x: -42, y: -64, w: 84, h: 50 }, effect: { preset: 'curse', attack: [{ type: 'ring', at: 'body', r: 44, width: 4 }] } } },   // メイは大きく後ろへ下がり、ロロはその場に残って回り斬る
      sd: { name: '綿爆弾', motion: 'cast', startup: 6, active: 2, recovery: 12, damage: 0, knockX: 0, knockY: 0, hitstun: 0, box: { x: 0, y: 0, w: 0, h: 0 }, effect: { preset: 'curse', attack: [{ type: 'sigil', at: 'front', r: 20, duration: 12 }] },
        solo: { name: '影縫い', puppet: { motion: 'plunge', startup: 6, active: 6, recovery: 14, damage: 3, knockX: 2, knockY: -5, hitstun: 20, low: true, box: { x: 10, y: -20, w: 120, h: 20 }, effect: { preset: 'curse', attack: [{ type: 'wave', at: 'feet', grow: 0.8 }, { type: 'debris', at: 'feet', x: 50, count: 4, dir: 'up', speed: 3, r: 4 }] } },   // ロロ: 跳んで大針を地面へ突き刺し、地面を裂く(下段)
motionFrom: 'd', startup: 8, active: 5, recovery: 18, damage: 7, knockX: 2, knockY: -6, hitstun: 26, low: true, box: { x: 20, y: -18, w: 150, h: 18 }, effect: { preset: 'curse', attack: [{ type: 'beam', at: 'base', length: 150, width: 2, duration: 12 }], hit: [{ type: 'sigil', at: 'feet', r: 30, flat: true, duration: 14 }] } },   // ロロがいないとき: 地面を這う長い糸で足元を縫い止める(下段)
        // ロロ: その場で中の綿をふくらませ、36F 後にはじけてまわりを大きく吹き飛ばす(ロロの耐久が 10 減る。0 ならクラッシュ)
        puppet: { cmd: 'bomb', fuse: 36, cost: 10, motion: 'bomb', startup: 0, active: 4, recovery: 18, damage: 12, knockX: 8, knockY: -9, hitstun: 30, box: { x: -62, y: -100, w: 124, h: 100 },
          effect: { preset: 'curse', hit: [{ type: 'impact', r: 44, color: '#3a1a4a', color2: '#ffb3f0' }] } } },
      // ---- コマンド技 ----
      // 呪いの釘: 藁人形に釘を打つ。技を出した瞬間に相手がいた場所に呪いの印が浮かび、少しあとで巨大な釘が落ちる(その場から動けば避けられる)
      c1: { name: '呪いの釘', command: '↓↘→+Z', motion: 'chop', startup: 10, active: 2, recovery: 22, damage: 0, knockX: 0, knockY: 0, hitstun: 0, box: { x: 0, y: 0, w: 0, h: 0 }, effect: { preset: 'curse', attack: [{ type: 'sigil', at: 'front', r: 18, duration: 14 }] },
        curse: { delay: 32, damage: 11, knockX: 1, knockY: -9, hitstun: 30, box: { x: 0, y: -140, w: 54, h: 140 },
          effect: { color: '#3a1a4a', color2: '#ffb3f0', attack: [{ type: 'pillar', at: 'ground', width: 34, duration: 18, color: '#8a3ad0', color2: '#ffffff' }, { type: 'text', text: '釘', at: 'ground', y: -150 }], hit: [{ type: 'impact', r: 40, color: '#3a1a4a', color2: '#ffb3f0' }, { type: 'shake', duration: 8, power: 5 }] } } },
      // 糸繰り: ロロから相手へ糸を飛ばし、当たると相手をロロの方へ引き寄せる(挟み込みに引き込む)
      c2: { name: '糸繰り', command: '↓↙←+A', motion: 'cast', startup: 6, active: 2, recovery: 18, damage: 0, knockX: 0, knockY: 0, hitstun: 0, box: { x: 0, y: 0, w: 0, h: 0 },
        puppet: { cmd: 'yank', motion: 'cast', startup: 6, active: 6, recovery: 18, damage: 4, knockX: -9, knockY: -3, hitstun: 26, box: { x: 10, y: -72, w: 220, h: 16 },
          effect: { preset: 'curse', attack: [{ type: 'beam', at: 'base', length: 220, width: 3, duration: 12 }], hit: [{ type: 'sigil', r: 24, duration: 14 }] } } },
      // ---- ゲージ技(Z と A を同時押し)・超必殺技(↓ を押しながら Z と A) ----
      // 呪縛・身代わり: ロロが消えて相手の背後に現れ、針で刺してメイの方へ突き飛ばす
      gx: { name: '呪縛・身代わり', cost: 25, motion: 'cast', startup: 6, active: 2, recovery: 18, damage: 0, knockX: 0, knockY: 0, hitstun: 0, box: { x: 0, y: 0, w: 0, h: 0 }, effect: { preset: 'curse', attack: [{ type: 'sigil', at: 'front', r: 24, duration: 14 }] },
        puppet: { cmd: 'warp', blink: 8, behind: 55, motion: 'lunge', startup: 4, active: 4, recovery: 16, damage: 10, knockX: 8, knockY: -5, hitstun: 32, revive: false, box: { x: 0, y: -72, w: 56, h: 60 },
          effect: { preset: 'curse', hit: [{ type: 'impact', r: 40, color: '#3a1a4a', color2: '#ffb3f0' }, { type: 'sigil', r: 30, duration: 16 }, { type: 'text', text: '呪縛', at: 'head' }] } } },
      // カースド・マリオネット: ロロが相手の背後へ転移し、メイとロロを結ぶ呪いの糸で、間にいる相手を8回切り刻む(ロロがクラッシュしていても呼び戻す)
      sx: { name: 'カースド・マリオネット', super: true, cost: 100, invincible: 12, minScale: 0.75, motion: 'cast', startup: 6, active: 2, recovery: 30, damage: 0, knockX: 0, knockY: 0, hitstun: 0, box: { x: 0, y: 0, w: 0, h: 0 },
        effect: { preset: 'curse', strength: 2, start: [{ type: 'orb', at: 'body', r: 50, duration: 8, follow: true, color: '#8a3ad0' }], attack: [{ type: 'sigil', at: 'feet', r: 70, flat: true, duration: 50 }, { type: 'text', text: 'Marionette', at: 'head', delay: 10 }] },
        puppet: { cmd: 'string', revive: true, blink: 8, behind: 70, startup: 6, active: 42, recovery: 20, damage: 4, hits: 8, hitInterval: 5, hitStop: 4, minScale: 0.75, knockX: 0, knockY: -2, hitstun: 30,
          effect: { color: '#a050e0', color2: '#ffffff', attack: [{ type: 'flash', at: 'body', r: 120, blend: 'add', duration: 14 }], hit: [{ type: 'cross', r: 20 }, { type: 'sigil', r: 18, duration: 10 }] } } },
    },
  },
  // ============================================================
  //  ここから下は 新しい5人(風・氷・草・鋼・自由)。しくみの説明は elements.js の先頭
  // ============================================================
  {
    name: 'ハヤテ',
    desc: '風の舞い手:3段ジャンプと空中ダッシュ・戻る鎌鼬',
    // 性能  地上戦は軽く、空中にいる時間が長い。ジャンプが3回(airJumps 2)、空中で ←← / →→ の空中ダッシュ(1回)。
    //   落ちるのが遅く(gravityMul 0.85)、空中技は着地隙が小さい。体力・シールドは少なめ。鉄扇(てっせん)を持つ
    stats: { hp: 100, jumpStartup: 3, landLag: 3, airLandLag: 6, speed: 4.8, jump: -13, airJumps: 2, gravityMul: 0.9, dashSpeed: 10, shield: 55, airDash: 1 },
    ko: { type: 'fly', vx: 6, vy: -13, gravity: 0.7, spin: -4.2, bounce: 0, slide: 0.9, air: 'tuck', lie: 'back', dust: '#d8fff2' }, // 風に巻かれて高く舞い、ゆっくり落ちてあお向け
    sp: { max: 100, time: 0.011, hit: 0.6, combo: 1.2, hurt: 0.35, color: '#7fe8c8' },
    // 飛び道具(A): 鎌鼬(かまいたち)。回りながら飛んで戻ってくる風の刃。行きと帰りで2回まで当たる
    projectile: { speed: 11, damage: 6, radius: 14, life: 70, hits: 2, hitEvery: 14, knockX: 3, knockY: -3, hitstun: 20, look: 'windBlade', path: { type: 'boomerang', back: 0.3 }, from: { x: 46, y: -82 } },
    look: { smooth: { atk: 0.7, move: 0.34 }, color: '#4fbfa0', skin: '#f4d2b0' },
    throw: {
      reach: [0.35, 1.5, 0.3, 0, 1.4, 0.3, 0, 0.8, -0.4, -0.5, 0.3, 10],
      name: '投げ', box: { x: 0, y: -85, w: 60, h: 75 },
      startup: 6, active: 3, whiff: 22, release: 30, total: 56,
      f: { name: '風送り', damage: 9, vx: 12, vy: -7, hitstun: 26, effect: { preset: 'gale', hit: [{ type: 'gust', r: 46, count: 4 }, { type: 'lines', count: 4, at: 'hit', length: 90 }] } },
      b: { name: '追い風投げ', damage: 9, vx: 11, vy: -7, hitstun: 26, leap: 40, effect: { preset: 'gale', hit: [{ type: 'gust', r: 46, count: 4 }] } },
      u: { name: '竜巻上げ', damage: 7, vx: 1, vy: -17, hitstun: 32, swing: 1, effect: { preset: 'cyclone', hit: [{ type: 'tornado', at: 'hit', r: 40, length: 160, duration: 22 }] } },
      d: { name: '颪(おろし)落とし', damage: 10, vx: 3, vy: -6, hitstun: 30, leap: 60, spike: 4, effect: { preset: 'gale', hit: [{ type: 'ring', flat: true, r: 70, width: 5 }, { type: 'gust', r: 50, count: 5 }, { type: 'shake', duration: 8, power: 5 }] } },
    },
    hitPoses: { head: [-0.3, 0.8, 1.8, 0, 0.6, 1.9, 0, 0.4, -0.6, -0.4, 0.4, 0] },
    poses: {
      idle: [0.1, 0.5, 0.9, 0.5, 0.25, 1.6, 0, 0.5, -0.5, -0.45, 0.35, 0, , , , , 1.6], // 待機(扇を腰の前に低く構え、体を開く)
      walk: [0.14, 0.4, 0.75, 0.85],
      guard: [0.05, 1.3, 2.2, 0.4, 0.9, 2.3, 0, 0.35, -0.45, -0.3, 0.35, 0],
      crouch: [0.3, 1.0, 1.5, 0.4, 0.5, 1.8, 0, 1.0, -1.5, -1.0, 1.3, 0],
      jumpSquat: [0.4, 0.1, 1.0, 0, -0.1, 1.0, 0, 1.15, -1.75, -1, 1.75, -2],
      landing: [0.4, 1.3, 0.5, 0, 0.8, 0.6, 0, 1.2, -1.6, -0.5, 0.9, 4],
      dashF: [0.7, -0.6, 1.0, 0.3, -0.4, 1.0, 0, 1.0, -1.2, -0.9, 0.4, 0], // 前かがみで低く滑る(風に乗る)
      dashB: [-0.3, 0.8, 1.6, 0, 0.4, 1.9, 0, 0.7, -0.9, 0.1, -0.4, 0],
      jumpUp: [-0.15, 2.6, 0.5, 0.3, 1.8, 0.8, 0, 1.1, -1.7, 0.3, -0.9, 0], // 扇を高く掲げて舞い上がる
      fall: [0.1, 1.8, 0.8, 0, 1.4, 0.8, 0, 0.6, -1.0, -0.2, -0.6, 0],     // 両手を広げてふわりと落ちる
    },
    // 右腕(手前)= 鉄扇を持つ手 / 左腕(奥)= 風を放つ手
    motions: {
      n: { w: [-0.1, 0.2, 2.0, 0.6, 0.4, 1.6, 0, 0.4, -0.4, -0.3, 0.3, -4], s: [0.2, 1.5, 0.2, -0.3, 0.3, 1.7, 0, 0.5, -0.4, -0.4, 0.35, 12] },                 // 扇打ち: 手首を返して扇の縁で打つ
      f: { w: [-0.35, -0.6, 1.2, 0.4, 0.8, 1.4, 0, 0.6, -0.6, -0.5, 0.5, -8], s: [0.45, 1.9, 0.3, -0.4, -0.4, 1.0, 0, 0.9, -0.3, -0.8, 0.3, 20] },              // 風薙ぎ: 後ろから大きく横へ払う
      b: { w: [0.2, 1.6, 0.4, 0, 0.6, 1.5, 0, 0.5, -0.6, -0.3, 0.5, 4], s: [-0.3, 2.2, 0.2, 0.3, 0.2, 1.3, 0, 0.3, -0.3, -0.6, 0.8, -12] },                    // 逆風: 跳び退きながら扇を振り上げる
      u: { w: [0.2, 0.6, 1.4, 0, 0.5, 1.5, 0, 0.6, -1.0, -0.4, 0.9, 0], s: [-0.8, 2.4, 0.3, 0, 1.8, 0.6, 0, 2.5, 0.0, 0.3, -0.4, 4] },                         // 旋風脚: 体を倒して足を高く振り上げる
      d: { w: [0.4, 0.3, 1.6, 0, 0.5, 1.5, 0, 1.1, -1.6, 0.2, -1.0, -2], s: [0.6, 1.2, 0.1, -0.3, 0.4, 1.4, 0, 1.4, -1.4, -0.8, -1.0, 14] },                   // 吹き払い: 低くしゃがんで足元を払う
      da: { w: [0.5, -0.8, 2.2, 0, 0.9, 1.2, 0, 1.2, -0.9, -0.7, 0.6, -12], s: [0.8, 1.55, 0.05, 0, -0.5, 0.8, 0, 1.0, -0.2, -1.0, 0.4, 26] },               // 疾風突き: 閉じた扇で突き抜ける
      an: { w: [-0.5, -0.5, 1.0, 0.4, 0.4, 1.2, 0, 0.9, -1.4, 0.3, -1.0, -6], s: [0.4, 2.0, 0.2, -0.3, -0.6, 1.0, 0, 0.7, -1.0, -0.2, -0.7, 10] },           // 舞扇
      af: { w: [0.3, 0.6, 1.5, 0, 0.6, 1.5, 0, 1.2, -1.6, 0.3, -1.0, 0], s: [-0.4, 1.6, 0.5, 0, 2.2, 0.4, 0, 1.6, 0.0, -0.9, -0.1, 8] },                       // 風車: 両脚を開いて回る
      au: { w: [0.3, 0.5, 1.6, 0.3, 0.4, 1.5, 0, 1.0, -1.4, 0.4, -1.0, 0], s: [-0.5, 3.0, 0.1, 0.4, 1.8, 0.8, 0, 1.4, -0.4, 0.2, -0.8, 2] },                  // 昇り風: 頭上へ弧を描く
      ad: { w: [0.1, 1.8, 0.8, 0, 1.5, 0.9, 0, 0.9, -1.4, 0.4, -1.0, 0], s: [-0.5, 0.8, 1.2, 0, 0.4, 1.4, 0, 1.2, 0.05, 0.2, -1.3, 16] },                     // 風穿ち: 斜め下へ蹴り込む
      s: { w: [-0.3, -1.0, 1.8, 0.5, 0.7, 1.5, 0, 0.5, -0.5, -0.4, 0.4, -8], s: [0.35, 1.7, 0.1, -0.6, -0.3, 1.2, 0, 0.8, -0.3, -0.6, 0.3, 14] },            // 鎌鼬: 扇を横に振り抜いて風の刃を飛ばす
      sf: { w: [0.2, 0.4, 1.4, 0.3, 0.4, 1.4, 0, 0.9, -0.9, -0.5, 0.5, -6], s: [0.5, 2.2, 0.3, -0.3, 2.0, 0.3, 0, 1.1, -0.4, -0.8, 0.4, 22] },               // 颶風連舞: 両手を広げて回りながら進む
      sb: { w: [0.3, 0.5, 1.8, 0, 0.5, 1.8, 0, 1.0, -1.6, -0.3, 1.0, 0], s: [-0.6, 2.4, 0.4, 0, 2.2, 0.5, 0, 1.4, -1.6, 0.6, -1.2, -8] },                     // 風隠れ: 後ろの空へ跳ぶ
      su: { w: [0.3, 0.4, 1.8, 0, 0.4, 1.6, 0, 1.0, -1.5, 0.2, -1.1, 0], s: [-0.3, 3.1, 0.05, 0.2, 0.6, 0.5, 0, 0.3, -0.2, -0.3, -0.4, 6] },                 // 風の盾: 扇を突き上げて体のまわりに突風
      sd: { w: [-0.2, 2.8, 0.4, 0.3, 1.0, 1.2, 0, 0.5, -0.4, -0.4, 0.4, -4], s: [0.5, 0.9, 0.1, -0.4, 0.3, 1.4, 0, 0.9, -0.9, -0.6, 0.5, 14] },                // 大旋風: 振りかぶった扇を振り下ろす
      c1: { w: [0.3, 1.8, 0.2, -0.4, 0.5, 1.5, 0, 0.8, -0.5, -0.6, 0.4, 10], s: [-0.3, -0.4, 1.6, 0.6, 1.2, 0.6, 0, 0.4, -0.5, -0.2, 0.4, -6] },              // 巻き風: 前の扇を手前へあおぐ
      c2: { w: [0.0, 0.8, 1.6, 0, 0.6, 1.6, 0, 1.0, -1.6, 0.2, -1.0, 0], s: [0.9, 0.3, 1.3, 0, -0.3, 1.4, 0, 1.6, 0.05, 1.3, -0.4, 18] },                     // 空舞い: 水平に滑空して蹴る
      gx: { w: [-0.3, 0.2, 2.2, 0.4, 0.3, 2.2, 0, 0.5, -0.5, -0.4, 0.4, -10], s: [0.35, 1.6, 0.05, -0.2, 1.5, 0.05, 0, 0.9, -0.3, -0.7, 0.3, 16] },          // 天つ風: 両手で押し出す
      sx: { w: [0.3, 2.8, 0.3, 0.3, 2.6, 0.4, 0, 0.9, -1.4, -0.3, 1.0, 0], s: [0.6, 1.4, 0.1, -0.4, -0.4, 1.0, 0, 1.0, -0.3, -0.9, 0.4, 24] },                 // 神風・八重嵐
    },
    combos: ['Z→→Z→A 鎌鼬 (戻る刃でもう一度)', 'ジャンプ→空中ダッシュ→空中→Z (3段ジャンプで高い所から)', '↓Z→↓↘→+A 巻き風 (遠くから引き寄せる)', '↓A 大旋風→ジャンプして空中Z (竜巻で浮いた相手を追う)'],
    moves: {
      n: { name: '扇打ち', startup: 4, active: 2, recovery: 6, damage: 5, knockX: 8, knockY: -1, hitstun: 14, effect: { preset: 'gale', size: 0.7, attack: [{ type: 'gust', r: 34, count: 3 }] }, box: { x: 26, y: -82, w: 66, h: 26 } }, // 風で大きく突き放す(間合いを取り直す小技)
      f: { name: '風薙ぎ', startup: 8, active: 4, recovery: 12, damage: 8, knockX: 7, knockY: -3, hitstun: 20, effect: { preset: 'gale', attack: [{ type: 'crescent', width: 9, span: 2.8, color: '#c8fff0' }, { type: 'gust', r: 50, count: 4 }] }, box: { x: 30, y: -96, w: 82, h: 50 } },
      b: { name: '逆風', startup: 6, active: 4, recovery: 12, damage: 5, knockX: 9, knockY: -2, hitstun: 18, launch: { x: -6 }, effect: { preset: 'gale', attack: [{ type: 'gust', r: 46, count: 4 }, { type: 'lines', count: 3, at: 'body', length: 70 }] }, box: { x: 20, y: -92, w: 62, h: 52 } }, // 下がりながら突き放す
      u: { name: '旋風脚', startup: 5, active: 5, recovery: 14, damage: 7, knockX: 1, knockY: -13, hitstun: 26, turn: [{ at: 'startup', body: 3 }, { at: 'active', body: -2 }, { at: 'recovery', body: 1 }], effect: { preset: 'gale', attack: [{ type: 'tornado', at: 'feet', r: 46, length: 140, duration: 14 }, { type: 'gust', at: 'body', r: 50, count: 4 }] }, box: { x: -55, y: -150, w: 110, h: 95 } }, // 体のまわりに風の柱。前にも後ろにも当たって高く浮かせる
      d: { name: '旋風払い', startup: 5, active: 3, recovery: 10, damage: 5, knockX: 3, knockY: -1, hitstun: 22, effect: { preset: 'gale', attack: [{ type: 'ring', at: 'feet', flat: true, r: 60, width: 4 }, { type: 'gust', at: 'feet', y: -10, r: 50, count: 3 }] }, box: { x: -40, y: -24, w: 110, h: 24 } }, // 足元を一周する風の下段(後ろに回られても当たる)
      da: { name: '疾風突き', startup: 6, active: 8, recovery: 13, damage: 6, hits: 2, hitInterval: 4, hitStop: 5, knockX: 4, knockY: -3, hitstun: 22, launch: { x: 13 }, effect: { preset: 'gale', attack: [{ type: 'lines', count: 5, at: 'body', length: 110 }, { type: 'gust', at: 'body', r: 40, count: 3 }] }, box: { x: 25, y: -82, w: 62, h: 50 } },
      an: { name: '舞扇', landLag: 4, startup: 4, active: 7, recovery: 9, damage: 4, knockX: 2, knockY: -3, hitstun: 16, effect: { preset: 'gale', size: 0.8 }, box: { x: -10, y: -88, w: 72, h: 52 } },
      af: { name: '風車', landLag: 7, startup: 6, active: 10, recovery: 10, damage: 4, hits: 3, hitInterval: 3, hitStop: 4, knockX: 2, knockY: -3, hitstun: 16, turn: [{ at: 'startup', body: 3 }, { at: 9, body: -3 }, { at: 13, body: 3 }, { at: 'recovery', body: 1 }], effect: { preset: 'gale', attack: [{ type: 'gust', at: 'body', r: 50, count: 5 }] }, box: { x: -10, y: -100, w: 90, h: 80 } }, // 3回当たる回転蹴り
      au: { name: '昇り風', landLag: 7, startup: 5, active: 8, recovery: 10, damage: 3, hits: 2, hitInterval: 4, hitStop: 4, knockX: 1, knockY: -8, hitstun: 20, float: 1, effect: { preset: 'gale', attack: [{ type: 'crescent', angle: -1, width: 8, span: 3 }, { type: 'gust', at: 'body', y: -30, r: 40, count: 3 }] }, box: { x: -25, y: -150, w: 70, h: 80 } }, // 2回当たり、ふわっと止まる(空中で追い続ける)
      ad: { name: '風穿ち', landLag: 10, startup: 7, active: 10, recovery: 12, damage: 7, knockX: 3, knockY: 6, hitstun: 22, launch: { x: 6, y: 11 }, effect: { preset: 'gale', attack: [{ type: 'lines', count: 4, at: 'body', length: 80 }], hit: [{ type: 'gust', r: 40, count: 4 }, { type: 'ring', flat: true, r: 40 }] }, box: { x: 0, y: -42, w: 60, h: 52 } },
      s: { name: '鎌鼬', startup: 10, active: 3, recovery: 18, damage: 0, knockX: 0, knockY: 0, hitstun: 0, effect: { preset: 'gale', attack: [{ type: 'gust', at: 'front', r: 34, count: 3 }] }, box: { x: 0, y: 0, w: 0, h: 0 } },
      sf: { name: '颶風連舞', startup: 9, active: 18, recovery: 20, damage: 4, hits: 4, hitInterval: 4, hitStop: 4, knockX: 2, knockY: -2, hitstun: 22, launch: { x: 12 },
        turn: [{ at: 'startup', body: 3 }, { at: 12, body: -3 }, { at: 16, body: 3 }, { at: 20, body: -3 }, { at: 24, body: 3 }, { at: 'recovery', body: 1 }],
        effect: { preset: 'cyclone', attack: [{ type: 'tornado', at: 'body', y: 60, r: 40, length: 130, duration: 20, follow: true }, { type: 'gust', at: 'body', r: 56, count: 5, duration: 18, follow: true }] }, box: { x: 0, y: -100, w: 82, h: 86 } },
      // 風隠れ: 出始め無敵で後ろの空へ跳ぶ(当たり判定なし)。そのまま空中ダッシュ・空中技につなげる
      sb: { name: '風隠れ', startup: 3, active: 6, recovery: 12, damage: 0, knockX: 0, knockY: 0, hitstun: 0, invincible: 12, launch: { x: -7, y: -12 }, effect: { preset: 'gale', start: [{ type: 'gust', at: 'body', r: 50, count: 5, duration: 14 }], attack: [{ type: 'lines', count: 4, at: 'body', length: 90 }] }, box: { x: 0, y: 0, w: 0, h: 0 } },
      // 風の盾: その場で体のまわりに突風を起こし、無敵のまま相手を大きく吹き飛ばす(飛び上がらない切り返し)
      su: { name: '風の盾', startup: 4, active: 8, recovery: 24, invincible: 8, damage: 8, knockX: 12, knockY: -5, hitstun: 24, effect: { preset: 'cyclone', attack: [{ type: 'gust', at: 'body', r: 80, count: 6, width: 4, duration: 16 }, { type: 'ring', at: 'body', r: 80, width: 5 }, { type: 'tornado', at: 'feet', r: 60, length: 150, duration: 16 }] }, box: { x: -60, y: -132, w: 150, h: 132 } },
      // 大旋風: 前に竜巻を置く(何回も当たって浮かせる。ゆっくり止まって少しずつ上がる)
      sd: { name: '大旋風', startup: 14, active: 3, recovery: 22, damage: 0, knockX: 0, knockY: 0, hitstun: 0, box: { x: 0, y: 0, w: 0, h: 0 },
        projectile: { speed: 6, damage: 2, radius: 30, life: 75, hits: 5, hitEvery: 9, knockX: 0.5, knockY: -4.5, hitstun: 18, look: 'tornado', path: { type: 'rise', decel: 0.92, lift: 0.5 }, from: { x: 60, y: -60 } },
        effect: { preset: 'gale', attack: [{ type: 'gust', at: 'front', r: 44, count: 4 }] } },
      // 巻き風: 遠くの相手を風で手前へ引き寄せる(knockX がマイナス)
      c1: { name: '巻き風', command: '↓↘→+A', startup: 10, active: 6, recovery: 15, damage: 6, knockX: -9, knockY: -2, hitstun: 30, rank: 4,
        effect: { preset: 'gale', attack: [{ type: 'gust', r: 70, count: 6, width: 3 }, { type: 'lines', at: 'hitbox', count: 5, length: 140 }] }, box: { x: 40, y: -92, w: 170, h: 72 } },
      // 空舞い: 空中で真横に滑空して蹴る(空中だけ)
      c2: { name: '空舞い', command: '↓↘→+Z', air: true, startup: 5, active: 14, recovery: 12, damage: 7, knockX: 6, knockY: -4, hitstun: 22, rank: 5, landLag: 10, launch: { x: 13, y: -1 }, float: 0,
        effect: { preset: 'gale', attack: [{ type: 'lines', count: 5, at: 'body', length: 110 }, { type: 'gust', at: 'body', r: 44, count: 3, follow: true }] }, box: { x: 10, y: -70, w: 72, h: 46 } },
      // 天つ風: 全身で巨大な突風を起こし、相手を画面の端まで吹き飛ばす(ガードしても大きく押す)
      gx: { name: '天つ風', cost: 25, startup: 9, active: 6, recovery: 22, damage: 6, knockX: 18, knockY: -3, hitstun: 24,
        effect: { preset: 'gale', strength: 2, attack: [{ type: 'gust', r: 120, count: 7, width: 4, duration: 20 }, { type: 'lines', at: 'body', count: 8, length: 200 }, { type: 'shake', duration: 8, power: 3 }] }, box: { x: 20, y: -112, w: 260, h: 112 } },
      // 神風・八重嵐(やえあらし): 巨大な竜巻に相手を閉じ込めて10回切り刻む
      sx: { name: '神風・八重嵐', super: true, cost: 100, invincible: 12, minScale: 0.75, startup: 10, active: 40, recovery: 30, damage: 3, hits: 10, hitInterval: 4, hitStop: 3, knockX: 0.5, knockY: -3.5, hitstun: 30, launch: { x: 9 },
        effect: { preset: 'cyclone', strength: 2, attack: [{ type: 'tornado', at: 'hitbox', y: 100, r: 90, length: 260, duration: 44 }, { type: 'gust', at: 'hitbox', r: 110, count: 8, duration: 40 }, { type: 'text', text: '八重嵐', at: 'head', delay: 10 }], hit: [{ type: 'cross', r: 22 }] },
        box: { x: 20, y: -200, w: 140, h: 200 } },
    },
  },
  {
    name: 'セツカ',
    desc: '氷の槍使い:長い槍で冷やし、凍らせて砕く',
    // 性能  槍が長く、通常技のリーチは全キャラでいちばん長いが、出は少し遅い。当てると相手の「冷え」がたまり(chill)、
    //   半分たまると相手の動きが遅くなり、満タンで凍りつく。凍った相手には「砕氷」「ダイヤモンドダスト」(shatter)が大ダメージ
    stats: { hp: 100, jumpStartup: 4, landLag: 3, airLandLag: 9, speed: 3.6, jump: -13, airJumps: 1, dashSpeed: 8.5, shield: 65 },
    ko: { type: 'collapse', drift: 1.2, keys: [[12, 'stagger'], [16, 'kneel'], [18, 'fallBack']], lie: 'back', thud: 14, dust: '#e0f6ff' }, // 槍を落としてひざをつき、静かに倒れる
    sp: { max: 100, time: 0.013, hit: 0.55, combo: 0.8, hurt: 0.4, color: '#8fdcff' },
    projectile: { speed: 13, damage: 6, radius: 12, life: 80, knockX: 5, knockY: -2, hitstun: 20, chill: 18, look: 'iceLance', path: { type: 'accel', start: 0.25, accel: 0.5 }, from: { x: 50, y: -80 } },
    look: { smooth: { atk: 0.62, move: 0.3 }, color: '#e8f4ff', skin: '#f8e8e4' },
    throw: {
      reach: [0.3, 1.4, 0.3, 0, 1.5, 0.2, 0, 0.8, -0.4, -0.5, 0.3, 8],
      name: '投げ', box: { x: 0, y: -85, w: 60, h: 75 },
      startup: 6, active: 3, whiff: 24, release: 32, total: 60,
      f: { name: '氷突き放し', damage: 10, vx: 10, vy: -5, hitstun: 26, effect: { preset: 'frost', hit: [{ type: 'icicle', at: 'hit', r: 30, count: 4, duration: 16 }, { type: 'snow', r: 34, count: 8 }] } },
      b: { name: '凍て返し', damage: 9, vx: 9, vy: -6, hitstun: 26, effect: { preset: 'frost' } },
      u: { name: '氷柱上げ', damage: 7, vx: 1, vy: -15, hitstun: 30, effect: { preset: 'glacier', hit: [{ type: 'icicle', at: 'feet', r: 30, count: 3, length: 90, duration: 18 }] } },
      d: { name: '氷床落とし', damage: 11, vx: 3, vy: -6, hitstun: 30, spike: 3, effect: { preset: 'glacier', hit: [{ type: 'icicle', at: 'feet', r: 60, count: 6, duration: 20 }, { type: 'shake', duration: 8, power: 5 }] } },
    },
    hitPoses: { head: [-0.25, 0.9, 1.8, 0, 0.7, 1.9, 0, 0.4, -0.5, -0.3, 0.4, 0] },
    poses: {
      idle: [0.02, 0.85, 0.75, -0.1, 0.5, 1.4, 0, 0.3, -0.2, -0.3, 0.2, 0, , , , , 1.4],  // 待機(槍を斜め前に構え、背筋をのばす)
      walk: [0.06, 0.25, 0.6, 0.6],                                                        // 歩き(すべるように静かに)
      guard: [0.0, 1.2, 1.6, 0.6, 1.0, 2.0, 0, 0.3, -0.35, -0.3, 0.3, 0],                // 槍を横にして受ける
      crouch: [0.25, 1.1, 0.6, 0, 0.6, 1.8, 0, 1.1, -1.6, -0.9, 1.3, 0],
      jumpSquat: [0.35, 0.6, 0.9, 0, 0.2, 1.0, 0, 1.1, -1.7, -1, 1.7, -2],
      landing: [0.35, 1.3, 0.5, 0, 0.9, 0.6, 0, 1.2, -1.6, -0.5, 0.9, 4],
      dashF: [0.55, 1.4, 0.2, 0, 0.6, 1.2, 0, 1.0, -0.5, -0.7, 0.3, 0],                  // 氷の上をすべる(槍を前へ)
      dashB: [-0.25, 0.8, 1.2, 0, 0.5, 1.6, 0, 0.6, -0.8, 0.1, -0.4, 0],
      jumpUp: [-0.1, 1.9, 0.5, 0, 1.2, 1.0, 0, 0.9, -1.4, 0.2, -0.6, 0],
      fall: [0.05, 1.4, 0.6, 0, 1.0, 0.9, 0, 0.3, -0.4, 0.1, -0.3, 0],
    },
    // 右腕(手前)= 氷の槍を持つ手 / 左腕(奥)= 冷気を放つ手
    motions: {
      n: { w: [-0.1, 0.6, 1.4, 0, 0.5, 1.5, 0, 0.4, -0.4, -0.3, 0.3, -6], s: [0.2, 1.55, 0.05, 0, 0.4, 1.4, 0, 0.5, -0.4, -0.4, 0.35, 14] },                  // 氷槍突き
      f: { w: [-0.3, 0.3, 1.9, 0, 0.4, 1.8, 0, 0.6, -0.6, -0.5, 0.5, -12], s: [0.5, 1.6, 0.0, 0, -0.2, 1.0, 0, 1.1, -0.3, -0.9, 0.3, 28] },                  // 穿氷: 大きく踏み込んで突く
      b: { w: [0.1, 1.4, 0.4, 0, 0.6, 1.5, 0, 0.5, -0.4, -0.3, 0.4, 2], s: [0.35, 0.6, 0.3, 0, 0.3, 1.6, 0, 0.3, -0.4, -0.7, 0.8, -14] },                     // 霜返し: 下がりながら足元を払う
      u: { w: [0.2, 0.7, 1.0, 0, 0.4, 1.5, 0, 0.6, -0.9, -0.3, 0.8, 0], s: [-0.25, 2.9, 0.1, 0, 0.9, 1.2, 0, 0.3, -0.2, -0.3, 0.2, 4] },                      // 氷柱突き上げ: 槍を真上へ
      d: { w: [0.35, 1.0, 0.6, 0, 0.5, 1.6, 0, 1.1, -1.6, 0.2, -1.0, -2], s: [0.55, 1.1, 0.0, 0, 0.4, 1.5, 0, 1.4, -1.4, -0.8, -1.0, 16] },                   // 凍て払い: しゃがんで足元を薙ぐ
      da: { w: [0.5, 1.3, 0.3, 0, 0.7, 1.3, 0, 1.1, -0.8, -0.7, 0.5, -10], s: [0.75, 1.55, 0.0, 0, 0.0, 1.0, 0, 1.0, -0.3, -1.0, 0.3, 24] },                  // 氷滑り: すべりながら突く
      an: { w: [-0.4, 0.2, 1.2, 0, 0.4, 1.3, 0, 0.9, -1.4, 0.3, -1.0, -4], s: [0.5, 2.3, 0.1, 0, -0.4, 1.0, 0, 0.7, -1.0, -0.2, -0.7, 8] },                  // 氷輪: 槍を回す
      af: { w: [0.2, 1.0, 0.8, 0, 0.5, 1.4, 0, 1.0, -1.4, 0.3, -0.9, -4], s: [0.0, 1.55, 0.0, 0, 0.3, 1.5, 0, 0.8, -0.8, -0.1, -0.6, 14] },                   // 氷槍・空
      au: { w: [0.3, 0.8, 1.0, 0, 0.4, 1.5, 0, 1.0, -1.5, 0.4, -1.1, 0], s: [-0.4, 3.0, 0.05, 0, 1.6, 0.8, 0, 1.3, -0.5, 0.3, -0.8, 2] },                     // 霜柱
      ad: { w: [0.0, 2.7, 0.5, 0, 2.2, 0.8, 0, 0.9, -1.5, 0.5, -1.2, 0], s: [0.3, 0.1, 0.05, 0, 0.5, 0.6, 0, 0.3, -0.2, -0.2, -0.3, 0] },                     // 氷墜: 槍を真下へ突き立てて落ちる
      s: { w: [-0.2, 0.2, 2.0, 0, 0.8, 1.4, 0, 0.5, -0.5, -0.4, 0.4, -8], s: [0.25, 0.8, 1.4, 0, 1.6, 0.05, 0, 0.6, -0.4, -0.5, 0.35, 10] },                 // フロストランス: 奥の手から氷の槍を放つ
      sf: { w: [0.2, 0.9, 1.0, 0, 0.6, 1.4, 0, 0.9, -0.9, -0.5, 0.5, -6], s: [0.45, 1.6, 0.0, 0, 0.3, 1.4, 0, 1.0, -0.4, -0.8, 0.4, 20] },                    // 氷華連突
      sb: { w: [-0.1, 2.4, 0.6, 0, 1.4, 1.2, 0, 0.6, -0.6, -0.4, 0.5, -4], s: [0.4, 1.0, 0.2, 0, 0.6, 1.4, 0, 0.9, -0.5, -0.7, 0.4, 14] },                    // 氷鎧: 氷をまとい、振り下ろす
      su: { w: [0.35, 0.8, 1.0, 0, 0.4, 1.6, 0, 1.0, -1.5, 0.3, -1.1, 0], s: [-0.25, 3.05, 0.05, 0, 1.2, 0.8, 0, 0.9, -1.2, -0.1, -0.3, 6] },                // 氷柱の壁: 槍を突き上げて目の前に氷柱
      sd: { w: [0.0, 2.6, 0.5, 0, 1.6, 1.0, 0, 0.5, -0.5, -0.4, 0.4, -2], s: [0.45, 0.3, 0.1, 0, 0.6, 0.6, 0, 0.8, -0.9, -0.6, 0.5, 8] },                     // 氷柱の森: 槍を地面へ突き立てる
      c1: { w: [0.3, 1.0, 0.6, 0, 0.5, 1.6, 0, 1.0, -1.5, 0.2, -1.0, -2], s: [0.6, 0.6, 0.2, 0, 1.2, 0.4, 0, 1.3, -1.3, -0.8, -0.9, 12] },                    // 氷河走り: 低く構えて地面を凍らせる
      c2: { w: [-0.4, 3.0, 0.3, 0, 2.6, 0.5, 0, 0.6, -0.7, -0.5, 0.5, -6], s: [0.7, 0.8, 0.1, 0, 0.6, 0.3, 0, 1.0, -0.8, -0.8, 0.4, 18] },                    // 砕氷: 頭上から叩き割る
      gx: { w: [0.1, 1.8, 0.5, 0, 1.8, 0.5, 0, 0.5, -0.5, -0.4, 0.4, 0], s: [-0.1, 2.6, 0.2, 0, 2.4, 0.3, 0, 0.5, -0.4, -0.4, 0.3, 0] },                      // ブリザード: 両手を広げて吹雪を起こす
      sx: { w: [-0.3, 0.2, 2.1, 0, 0.6, 1.6, 0, 0.6, -0.6, -0.5, 0.5, -12], s: [0.55, 1.6, 0.0, 0, 1.3, 0.2, 0, 1.1, -0.3, -0.9, 0.3, 26] },                // ダイヤモンドダスト
    },
    combos: ['Z→→Z→A フロストランス (冷えをためる)', '↓Z→↓↘→+Z 氷河走り (遠くから大きく冷やす)', '凍らせて→↓↙←+A 砕氷 (SHATTER! で大ダメージ)', 'ゲージ技ブリザード→Z→砕氷 (凍らせてすぐ砕く)'],
    moves: {
      n: { name: '氷槍突き', startup: 6, active: 3, recovery: 9, damage: 4, knockX: 3, knockY: -1, hitstun: 15, chill: 4, effect: { preset: 'frost', size: 0.6 }, box: { x: 30, y: -84, w: 72, h: 20 } },
      f: { name: '穿氷', startup: 11, active: 4, recovery: 19, damage: 8, knockX: 6, knockY: -2, hitstun: 22, chill: 8, launch: { x: 4 }, effect: { preset: 'frost', attack: [{ type: 'beam', at: 'base', width: 6, duration: 8, color: '#cff4ff' }, { type: 'snow', r: 30, count: 6 }] }, box: { x: 40, y: -86, w: 110, h: 22 } }, // 全キャラでいちばん長い通常技
      b: { name: '霜返し', startup: 7, active: 4, recovery: 14, damage: 5, knockX: 5, knockY: -1, hitstun: 20, chill: 8, launch: { x: -7 }, effect: { preset: 'frost', attack: [{ type: 'crescent', angle: 1, width: 8, span: 2 }, { type: 'snow', at: 'feet', x: 50, r: 30, count: 6 }] }, box: { x: 20, y: -42, w: 92, h: 32 } },
      u: { name: '氷柱突き上げ', startup: 8, active: 5, recovery: 20, damage: 7, knockX: 3, knockY: -10, hitstun: 24, chill: 8, effect: { preset: 'frost', attack: [{ type: 'crescent', angle: -1, width: 8, span: 1.6 }, { type: 'star', count: 6, r: 16, spin: 2 }] }, box: { x: 40, y: -172, w: 72, h: 100 } }, // 槍を斜め上へ。遠くの跳び込みを落とす(真上は苦手)
      d: { name: '凍て払い', startup: 7, active: 4, recovery: 13, damage: 5, knockX: 3, knockY: -1, hitstun: 20, chill: 10, effect: { preset: 'frost', attack: [{ type: 'crescent', angle: 1, width: 8, span: 2.2 }, { type: 'icicle', at: 'feet', x: 70, r: 26, count: 3, length: 30 }] }, box: { x: 30, y: -24, w: 100, h: 24 } },
      da: { name: '氷滑り', startup: 7, active: 12, recovery: 16, damage: 7, knockX: 6, knockY: -3, hitstun: 22, chill: 10, launch: { x: 15 }, effect: { preset: 'frost', attack: [{ type: 'lines', count: 5, at: 'body', length: 110, color: '#cff4ff' }, { type: 'snow', at: 'feet', r: 30, count: 8 }] }, box: { x: 30, y: -78, w: 82, h: 30 } },
      an: { name: '氷輪', landLag: 5, startup: 5, active: 6, recovery: 9, damage: 5, knockX: 2, knockY: -3, hitstun: 16, chill: 6, effect: { preset: 'frost', attack: [{ type: 'crescent', width: 9, span: 4 }] }, box: { x: -30, y: -100, w: 110, h: 60 } },
      af: { name: '氷槍・空', landLag: 9, startup: 7, active: 5, recovery: 11, damage: 7, knockX: 5, knockY: -2, hitstun: 20, chill: 8, effect: { preset: 'frost', attack: [{ type: 'beam', at: 'base', width: 5, duration: 8, color: '#cff4ff' }] }, box: { x: 30, y: -78, w: 102, h: 30 } },
      au: { name: '霜柱', landLag: 8, startup: 6, active: 5, recovery: 11, damage: 6, knockX: 2, knockY: -9, hitstun: 20, chill: 6, effect: { preset: 'frost', attack: [{ type: 'crescent', angle: -1, width: 8, span: 3 }] }, box: { x: -10, y: -162, w: 62, h: 92 } },
      ad: { name: '氷墜', landLag: 12, startup: 8, active: 8, recovery: 14, damage: 8, knockX: 2, knockY: 8, spike: 4, hitstun: 22, chill: 10, launch: { x: 0, y: 12 }, effect: { preset: 'frost', hit: [{ type: 'icicle', at: 'feet', r: 40, count: 5, length: 50 }, { type: 'shake', duration: 6, power: 4 }] }, box: { x: -5, y: -22, w: 42, h: 92 } },
      s: { name: 'フロストランス', startup: 12, active: 3, recovery: 18, damage: 0, knockX: 0, knockY: 0, hitstun: 0, effect: { preset: 'frost', start: [{ type: 'snow', at: 'front', r: 22, count: 6, duration: 14, follow: true }] }, box: { x: 0, y: 0, w: 0, h: 0 } },
      sf: { name: '氷華連突', startup: 9, active: 15, recovery: 20, damage: 3, hits: 5, hitInterval: 3, hitStop: 4, knockX: 1.5, knockY: -1, hitstun: 22, chill: 5, launch: { x: 5 },
        effect: { preset: 'frost', attack: [{ type: 'beam', at: 'base', width: 6, duration: 14, color: '#cff4ff' }, { type: 'star', count: 6, r: 22, spin: 3, delay: 4 }, { type: 'snow', r: 40, count: 10, duration: 20 }] }, box: { x: 30, y: -92, w: 112, h: 40 } },
      // 氷鎧: 出始めから2回まで攻撃を受けても止まらない(アーマー)。そのまま振り下ろす
      sb: { name: '氷鎧', startup: 10, active: 5, recovery: 18, armor: 2, damage: 9, knockX: 9, knockY: -3, hitstun: 24, chill: 12,
        effect: { preset: 'frost', start: [{ type: 'icicle', at: 'feet', r: 34, count: 5, length: 50, duration: 16 }, { type: 'flash', at: 'body', r: 50, blend: 'add', color: '#bfefff' }], attack: [{ type: 'crescent', angle: 1, width: 12, span: 2.6 }] }, box: { x: 10, y: -98, w: 102, h: 72 } },
      // 氷柱の壁: 自分は動かず、目の前の地面から高い氷柱を突き上げる(無敵)
      su: { name: '氷柱の壁', startup: 6, active: 9, recovery: 28, invincible: 6, damage: 12, knockX: 4, knockY: -11, hitstun: 28, chill: 15,
        effect: { preset: 'glacier', attack: [{ type: 'icicle', at: 'ground', r: 30, count: 3, length: 170, duration: 24 }, { type: 'snow', at: 'hitbox', r: 50, count: 10 }] }, box: { x: 30, y: -176, w: 62, h: 176 } },
      sd: { name: '氷柱の森', startup: 16, active: 9, recovery: 24, damage: 4, hits: 3, hitInterval: 3, hitStop: 4, knockX: 1, knockY: -7, hitstun: 26, chill: 9, effect: { preset: 'glacier', attack: [{ type: 'icicle', at: 'ground', r: 56, count: 6, length: 100, duration: 26 }, { type: 'snow', at: 'ground', y: -40, r: 50, count: 10, duration: 26 }] }, box: { x: 110, y: -82, w: 112, h: 82 } },
      c1: { name: '氷河走り', command: '↓↘→+Z', startup: 13, active: 3, recovery: 20, damage: 0, knockX: 0, knockY: 0, hitstun: 0, rank: 4, box: { x: 0, y: 0, w: 0, h: 0 },
        projectile: { speed: 7, damage: 5, radius: 16, life: 90, chill: 30, knockX: 2, knockY: -1, hitstun: 22, look: 'frostWave', path: 'ground', from: { x: 40, y: -16 } },
        effect: { preset: 'frost', attack: [{ type: 'icicle', at: 'feet', x: 40, r: 24, count: 3, length: 30 }] } },
      // 砕氷: 頭上から槍を叩きつける。凍った相手に当てると SHATTER!(ダメージ ×1.6 +6)
      c2: { name: '砕氷', command: '↓↙←+A', startup: 14, active: 5, recovery: 22, damage: 12, knockX: 10, knockY: -6, hitstun: 30, shatter: true, chill: 5, rank: 4,
        effect: { preset: 'glacier', attack: [{ type: 'crescent', angle: 1, width: 14, span: 2.4 }, { type: 'icicle', at: 'ground', r: 40, count: 4, length: 60 }, { type: 'shake', duration: 6, power: 4 }] }, box: { x: 20, y: -122, w: 102, h: 122 } },
      gx: { name: 'ブリザード', cost: 25, startup: 8, active: 30, recovery: 22, damage: 2, hits: 6, hitInterval: 5, hitStop: 3, knockX: 0.5, knockY: -1, hitstun: 18, chill: 9,
        effect: { preset: 'frost', strength: 1.5, attack: [{ type: 'snow', at: 'body', r: 120, count: 18, duration: 34 }, { type: 'gust', at: 'body', r: 110, count: 6, duration: 32, color: '#e8fbff' }, { type: 'ring', at: 'feet', flat: true, r: 110, duration: 20 }] }, box: { x: -70, y: -132, w: 222, h: 132 } },
      sx: { name: 'ダイヤモンドダスト', super: true, cost: 100, invincible: 12, minScale: 0.75, startup: 10, active: 28, recovery: 30, damage: 4, hits: 6, hitInterval: 4, hitStop: 4, knockX: 1, knockY: -2, hitstun: 30, chill: 20, shatter: true,
        effect: { preset: 'frost', strength: 2, start: [{ type: 'snow', at: 'body', r: 70, count: 14, duration: 20, follow: true }],
          attack: [{ type: 'beam', at: 'base', length: 360, width: 40, duration: 30, color: '#bfefff' }, { type: 'beam', at: 'base', length: 360, width: 14, duration: 30, color: '#ffffff' }, { type: 'icicle', at: 'ground', r: 140, count: 9, length: 120, duration: 32 }, { type: 'snow', at: 'hitbox', r: 160, count: 24, duration: 36 }, { type: 'text', text: 'Diamond Dust', at: 'head', delay: 12 }] },
        box: { x: 20, y: -132, w: 362, h: 132 } },
    },
  },
  {
    name: 'シゲル',
    desc: '森の子:種の罠とつる・立ち止まると回復',
    // 性能  打たれ強い(体力115)が足は遅い。地上で立ち止まっていると光合成で体力が少しずつ戻る(photosynthesis)。
    //   A で種をまくと地面に芽が残り(3つまで)、相手が踏むと浮かせる。↓↓+A「開花」で芽を一斉にはじけさせる。つるの技は細くて長い
    stats: { hp: 115, jumpStartup: 5, landLag: 4, airLandLag: 9, speed: 3.8, jump: -12.5, airJumps: 1, dashSpeed: 8, shield: 65, photosynthesis: { delay: 50, rate: 0.025 } },
    ko: { type: 'collapse', drift: 1.5, keys: [[10, 'stagger'], [14, 'kneel'], [18, 'fallFront']], lie: 'front', thud: 16, dust: '#9adf6a' }, // 葉を散らしながら前へ倒れる
    sp: { max: 100, time: 0.012, hit: 0.6, combo: 1, hurt: 0.4, color: '#7ad04a' },
    projectile: { speed: 6, damage: 7, radius: 10, life: 120, knockX: 2, knockY: -9, hitstun: 26, look: 'seed', path: { type: 'seed', up: 7, gravity: 0.3, trap: 420 }, from: { x: 30, y: -84 } },
    look: { smooth: { atk: 0.6, move: 0.3 }, color: '#5aa83a', skin: '#f0cfa8' },
    throw: {
      reach: [0.35, 1.5, 0.3, 0, 1.5, 0.3, 0, 0.8, -0.4, -0.5, 0.3, 8],
      name: '投げ', box: { x: 0, y: -85, w: 62, h: 75 },
      startup: 6, active: 3, whiff: 22, release: 32, total: 58,
      f: { name: 'つる投げ', damage: 10, vx: 10, vy: -6, hitstun: 26, effect: { preset: 'verdant' } },
      b: { name: '根返し', damage: 9, vx: 9, vy: -6, hitstun: 26, effect: { preset: 'thorn', hit: [{ type: 'thorns', at: 'feet', r: 40, count: 4, length: 50 }] } },
      u: { name: '若木上げ', damage: 7, vx: 1, vy: -15, hitstun: 30, effect: { preset: 'verdant', hit: [{ type: 'vine', at: 'feet', angle: -2, length: 120, width: 7 }, { type: 'leaves', r: 40, count: 10 }] } },
      d: { name: '土返し', damage: 12, vx: 3, vy: -6, hitstun: 30, spike: 3, effect: { preset: 'thorn', hit: [{ type: 'thorns', at: 'feet', r: 60, count: 6, length: 60 }, { type: 'debris', count: 6, dir: 'up', speed: 5, color: '#7a5a3a' }, { type: 'shake', duration: 8, power: 5 }] } },
    },
    hitPoses: { head: [-0.3, 0.8, 1.9, 0, 0.6, 2, 0, 0.5, -0.6, -0.3, 0.5, 0] },
    poses: {
      idle: [0.12, 0.5, 1.6, 0, 0.5, 1.4, 0, 0.35, -0.4, -0.4, 0.4, 0, , , , , 1.5],    // 待機(両手をゆるく前に、少し猫背)
      walk: [0.18, 0.55, 0.65, 0.9],                                                      // 歩き(のしのし)
      guard: [0.1, 1.2, 2.2, 0, 1.1, 2.2, 0, 0.4, -0.5, -0.4, 0.4, 0],
      crouch: [0.4, 0.9, 1.6, 0, 0.8, 1.6, 0, 1.2, -1.7, -1.0, 1.4, 0],
      jumpSquat: [0.5, 0.1, 0.9, 0, 0.0, 0.9, 0, 1.2, -1.8, -1, 1.8, -2],
      landing: [0.5, 1.3, 0.5, 0, 1.2, 0.6, 0, 1.3, -1.7, -0.6, 1.0, 4],
      dashF: [0.6, 1.0, 1.2, 0, 0.8, 1.2, 0, 1.1, -1.1, -0.8, 0.5, 0],
      dashB: [-0.25, 0.7, 1.6, 0, 0.6, 1.7, 0, 0.7, -0.9, 0.1, -0.4, 0],
      jumpUp: [-0.1, 1.4, 1.2, 0, 1.6, 1.0, 0, 1.0, -1.5, 0.2, -0.7, 0],
      fall: [0.1, 1.6, 0.6, 0, 1.4, 0.7, 0, 0.4, -0.6, 0.1, -0.4, 0],
    },
    motions: {
      n: { w: [-0.05, 0.3, 1.9, 0, 0.4, 1.4, 0, 0.4, -0.4, -0.3, 0.3, -4], s: [0.2, 1.6, 0.1, 0, 0.4, 1.4, 0, 0.5, -0.4, -0.4, 0.35, 10] },                  // つる打ち: 手からつるを伸ばす
      f: { w: [-0.3, -0.5, 1.6, 0, 0.5, 1.4, 0, 0.5, -0.5, -0.4, 0.4, -8], s: [0.35, 1.55, 0.0, 0, 0.2, 1.2, 0, 0.8, -0.3, -0.6, 0.3, 14] },                // 長つる鞭: 振りかぶって遠くへ
      b: { w: [0.3, 1.6, 0.1, 0, 0.6, 1.4, 0, 0.6, -0.4, -0.4, 0.4, 8], s: [-0.35, 0.2, 2.0, 0, 0.5, 1.6, 0, 0.3, -0.4, -0.3, 0.6, -8] },                    // つる引き: 伸ばしたつるを引き戻す
      u: { w: [0.3, 0.4, 1.6, 0, 0.4, 1.6, 0, 0.9, -1.4, -0.2, 1.0, 0], s: [-0.25, 2.9, 0.2, 0, 2.6, 0.3, 0, 0.3, -0.2, -0.3, 0.2, 4] },                     // つる落とし: 両手を突き上げてつるを伸ばす
      d: { w: [0.4, 0.6, 1.6, 0, 0.6, 1.6, 0, 1.1, -1.6, 0.2, -1.1, -2], s: [0.6, 0.6, 0.4, 0, 0.5, 0.5, 0, 1.3, -1.4, -0.8, -1.0, 8] },                     // つる絡め: 両手を地面に
      da: { w: [0.6, 1.0, 1.6, 0, 0.9, 1.6, 0, 1.4, -2.0, 0.6, -1.6, -6], s: [1.2, 1.4, 1.6, 0, 1.3, 1.6, 0, 1.6, -2.2, 1.1, -2.0, 16] },                     // 転がり種: 体を丸めて転がる
      an: { w: [-0.4, -0.4, 1.4, 0, 0.4, 1.2, 0, 0.9, -1.4, 0.3, -1.0, -6], s: [0.4, 2.0, 0.3, 0, -0.5, 1.0, 0, 0.7, -1.0, -0.2, -0.7, 8] },                // 葉回し
      af: { w: [0.3, 2.5, 0.4, 0, 1.0, 1.2, 0, 1.0, -1.5, 0.3, -0.9, -4], s: [0.3, 1.0, 0.1, 0, 0.6, 1.2, 0, 0.7, -0.8, -0.2, -0.6, 12] },                  // 葉刃: 振り下ろす
      au: { w: [0.3, 0.6, 1.4, 0, 0.5, 1.4, 0, 1.0, -1.5, 0.4, -1.1, 0], s: [-0.5, 3.0, 0.1, 0, 2.6, 0.3, 0, 1.3, -0.5, 0.3, -0.8, 2] },                      // つる上げ
      ad: { w: [0.3, 1.5, 1.6, 0, 1.4, 1.6, 0, 1.2, -1.8, 0.8, -1.6, 0], s: [0.5, 0.6, 1.0, 0, 0.6, 1.0, 0, 0.6, -0.4, 0.1, -0.4, 4] },                      // 種落とし: 丸まって真下へ種を落とす
      s: { w: [-0.3, -0.9, 1.6, 0, 0.6, 1.4, 0, 0.5, -0.5, -0.4, 0.4, -6], s: [0.2, 2.3, 0.3, 0, 0.4, 1.4, 0, 0.7, -0.4, -0.5, 0.35, 8] },                 // 種まき: 下から上へ放り投げる
      sf: { w: [0.4, 0.4, 1.8, 0, 0.6, 1.8, 0, 1.0, -1.0, -0.6, 0.6, -10], s: [0.85, 1.5, 0.3, 0, 1.4, 0.3, 0, 1.0, -0.2, -1.0, 0.4, 24] },                 // いばらの突進
      sb: { w: [0.1, 0.9, 1.3, 0, 0.9, 1.3, 0, 0.6, -0.8, -0.6, 0.8, 0], s: [0.25, 0.4, 0.6, 0, 0.4, 0.6, 0, 0.7, -1.2, -0.7, 1.2, 0] },                     // 根張り: 腰を落として根を下ろす
      su: { w: [0.4, 0.5, 1.6, 0, 0.5, 1.6, 0, 1.1, -1.6, 0.2, -1.1, 0], s: [-0.2, 3.0, 0.1, 0, 2.8, 0.2, 0, 0.6, -1.0, -0.2, -0.4, 4] },                    // 大樹の盾
      sd: { w: [0.2, 2.6, 0.5, 0, 2.4, 0.6, 0, 0.6, -0.6, -0.4, 0.5, 0], s: [0.6, 0.5, 0.3, 0, 0.5, 0.3, 0, 0.9, -1.2, -0.6, 0.7, 6] },                     // 茨の檻: 両手を地面へ叩きつける
      c1: { w: [-0.3, -0.5, 1.6, 0, 0.6, 1.4, 0, 0.5, -0.5, -0.4, 0.4, -8], s: [0.4, 1.55, 0.0, 0, 1.5, 0.1, 0, 0.8, -0.3, -0.6, 0.3, 12] },               // つる捕縛: 両手から伸ばす
      c2: { w: [0.2, 0.6, 1.8, 0, 0.6, 1.8, 0, 0.5, -0.6, -0.4, 0.5, 0], s: [-0.15, 2.6, 0.5, 0, 2.6, 0.5, 0, 0.4, -0.4, -0.4, 0.4, 0] },                  // 開花: 両手を空へ開く
      gx: { w: [0.2, 1.4, 1.0, 0, 1.4, 1.0, 0, 0.6, -0.8, -0.5, 0.7, 0], s: [-0.1, 2.4, 0.4, 0, 2.4, 0.4, 0, 0.4, -0.4, -0.4, 0.4, 0] },                    // 森の恵み
      sx: { w: [0.5, 0.6, 1.6, 0, 0.6, 1.6, 0, 1.1, -1.6, 0.2, -1.1, 0], s: [-0.2, 3.0, 0.2, 0, 2.9, 0.2, 0, 0.4, -0.4, -0.4, 0.4, 0] },                     // 世界樹
    },
    combos: ['A 種まき→相手が芽を踏んで浮く→→Z 長つる鞭', '↓Z つる絡め→↓↘→+A つる捕縛 (足止めしてつかむ)', '芽を3つまいて→↓↓+A 開花 (まとめてはじける)', '離れて立ち止まる→光合成で回復'],
    moves: {
      n: { name: 'つる打ち', startup: 5, active: 3, recovery: 8, damage: 4, knockX: 3, knockY: -2, hitstun: 16, effect: { preset: 'verdant', attack: [{ type: 'vine', at: 'base', width: 4, length: 60, duration: 10 }] }, box: { x: 24, y: -82, w: 62, h: 22 } },
      f: { name: '長つる鞭', startup: 12, active: 4, recovery: 19, damage: 7, knockX: 5, knockY: -2, hitstun: 20, effect: { preset: 'verdant', attack: [{ type: 'vine', at: 'base', width: 5, length: 150, duration: 14 }, { type: 'leaves', at: 'hitbox', x: 60, r: 20, count: 4 }] }, box: { x: 30, y: -80, w: 152, h: 16 } }, // 細いが全キャラでいちばん遠くまで届く
      b: { name: 'つる引き', startup: 9, active: 4, recovery: 16, damage: 5, knockX: -8, knockY: -2, hitstun: 22, effect: { preset: 'verdant', attack: [{ type: 'vine', at: 'base', width: 5, length: 130, duration: 14 }] }, box: { x: 30, y: -72, w: 132, h: 24 } }, // 引き寄せる
      u: { name: 'つる落とし', startup: 7, active: 5, recovery: 17, damage: 7, knockX: 1, knockY: 7, spike: 3, hitstun: 26, effect: { preset: 'verdant', attack: [{ type: 'vine', at: 'body', angle: -2.4, width: 6, length: 120, duration: 14 }, { type: 'leaves', at: 'head', r: 30, count: 6 }] }, box: { x: -10, y: -162, w: 80, h: 100 } }, // 跳んできた相手につるを巻きつけ、地面へ引きずり落とす対空
      d: { name: 'つる絡め', startup: 8, active: 4, recovery: 13, damage: 4, knockX: 0, knockY: 0, hitstun: 30, effect: { preset: 'verdant', attack: [{ type: 'vine', at: 'feet', x: 20, y: -6, width: 4, length: 80, duration: 18 }, { type: 'thorns', at: 'ground', r: 20, count: 3, length: 24, duration: 18 }] }, box: { x: 30, y: -30, w: 72, h: 30 } }, // 足をつるで絡めて、その場に長く止める下段(吹っ飛ばない)
      da: { name: '転がり種', startup: 7, active: 12, recovery: 16, damage: 6, knockX: 5, knockY: -4, hitstun: 22, launch: { x: 11 }, effect: { preset: 'verdant', attack: [{ type: 'leaves', at: 'body', r: 40, count: 8, duration: 20 }, { type: 'lines', count: 3, at: 'body', length: 80 }] }, box: { x: 0, y: -72, w: 72, h: 62 } },
      an: { name: '葉回し', landLag: 5, startup: 5, active: 8, recovery: 9, damage: 4, knockX: 2, knockY: -3, hitstun: 16, effect: { preset: 'verdant', attack: [{ type: 'leaves', at: 'body', r: 44, count: 8 }] }, box: { x: -20, y: -92, w: 82, h: 62 } },
      af: { name: '葉刃', landLag: 9, startup: 6, active: 5, recovery: 12, damage: 7, knockX: 5, knockY: -3, hitstun: 20, effect: { preset: 'verdant', attack: [{ type: 'crescent', angle: 1, width: 10, span: 2.4, color: '#7ad04a' }, { type: 'leaves', r: 30, count: 5 }] }, box: { x: 20, y: -96, w: 82, h: 56 } },
      au: { name: 'つる上げ', landLag: 7, startup: 6, active: 5, recovery: 10, damage: 5, knockX: 2, knockY: -9, hitstun: 20, effect: { preset: 'verdant', attack: [{ type: 'vine', at: 'body', angle: -2.4, width: 5, length: 100 }] }, box: { x: -20, y: -172, w: 62, h: 102 } },
      ad: { name: '種落とし', landLag: 6, startup: 7, active: 3, recovery: 12, damage: 0, knockX: 0, knockY: 0, hitstun: 0, float: 0, box: { x: 0, y: 0, w: 0, h: 0 },
        projectile: { speed: 1, damage: 7, radius: 10, life: 120, knockX: 2, knockY: -9, hitstun: 26, look: 'seed', path: { type: 'seed', up: -5, gravity: 0.45, trap: 420 }, from: { x: 4, y: -10 } },
        effect: { preset: 'verdant', attack: [{ type: 'leaves', at: 'feet', r: 24, count: 5 }] } }, // 空中で止まって、真下に種を落とす(落ちた所が罠の芽になる)
      s: { name: '種まき', startup: 11, active: 3, recovery: 16, damage: 0, knockX: 0, knockY: 0, hitstun: 0, effect: { preset: 'verdant', attack: [{ type: 'leaves', at: 'front', r: 20, count: 4 }] }, box: { x: 0, y: 0, w: 0, h: 0 } },
      sf: { name: 'いばらの突進', startup: 10, active: 14, recovery: 20, damage: 4, hits: 3, hitInterval: 4, hitStop: 4, knockX: 3, knockY: -3, hitstun: 22, launch: { x: 12 }, effect: { preset: 'thorn', attack: [{ type: 'thorns', at: 'body', y: 60, r: 30, count: 4, length: 40, duration: 16, follow: true }, { type: 'leaves', at: 'body', r: 40, count: 8 }, { type: 'lines', count: 4, at: 'body', length: 90 }] }, box: { x: 0, y: -92, w: 82, h: 82 } },
      // 根張り: その場に根を下ろして3回まで攻撃を受け止め(アーマー)、体力が6戻る。まわりにとげが生える
      sb: { name: '根張り', startup: 8, active: 30, recovery: 16, armor: 3, heal: 6, damage: 5, knockX: 6, knockY: -2, hitstun: 20, launch: { x: 0 },
        effect: { preset: 'thorn', start: [{ type: 'leaves', at: 'body', r: 40, count: 8 }], attack: [{ type: 'thorns', at: 'feet', r: 60, count: 6, length: 50, duration: 30 }, { type: 'flash', at: 'body', r: 50, blend: 'add', color: '#bfff8a' }] }, box: { x: -30, y: -102, w: 112, h: 102 } },
      // 大樹の盾: 足元から太い幹が立ち上がる。2回まで攻撃を受け止め(アーマー)、跳んできた相手を高く打ち上げる(無敵はない)
      su: { name: '大樹の盾', startup: 8, active: 10, recovery: 26, armor: 2, damage: 14, knockX: 4, knockY: -11, hitstun: 28,
        effect: { preset: 'verdant', attack: [{ type: 'thorns', at: 'feet', r: 34, count: 4, length: 120, duration: 22 }, { type: 'vine', at: 'feet', angle: -2.5, width: 12, length: 170, duration: 20 }, { type: 'leaves', at: 'head', r: 50, count: 12 }] }, box: { x: -15, y: -172, w: 82, h: 172 } },
      sd: { name: '茨の檻', startup: 15, active: 10, recovery: 24, damage: 4, hits: 3, hitInterval: 4, hitStop: 4, knockX: 1, knockY: -5, hitstun: 24, low: true, effect: 'thorn', box: { x: 70, y: -62, w: 122, h: 62 } },
      // つる捕縛: 遠くまで伸びるつるで相手をつかみ、引き寄せて地面へたたきつける(コマンド投げ)
      c1: { name: 'つる捕縛', command: '↓↘→+A', startup: 12, active: 5, recovery: 28, damage: 13, knockX: 6, knockY: -8, hitstun: 28, rank: 4,
        grab: { dir: 'd', box: { x: 20, y: -112, w: 162, h: 102 }, release: 30, total: 54, hold: { x: 40, y: 60 }, color: '#7ad04a' },
        effect: { preset: 'verdant', start: [{ type: 'vine', at: 'front', width: 6, length: 160, duration: 16 }], attack: [{ type: 'leaves', r: 30, count: 8 }], hit: [{ type: 'thorns', at: 'feet', r: 50, count: 5, length: 50 }, { type: 'shake', duration: 8, power: 5 }] } },
      // 開花: 自分がまいた芽をすべてはじけさせる(芽のまわりに当たって浮かせる)
      c2: { name: '開花', command: '↓↓+A', startup: 8, active: 3, recovery: 18, damage: 0, knockX: 0, knockY: 0, hitstun: 0, bloom: true, rank: 3,
        effect: { preset: 'verdant', attack: [{ type: 'bloom', at: 'head', r: 30, count: 8, duration: 16, color: '#ff8ac8', color2: '#fff6a0', blend: 'add' }] }, box: { x: 0, y: 0, w: 0, h: 0 } },
      // 森の恵み: 体力が15戻り、まわりに葉の嵐を起こして突き放す
      gx: { name: '森の恵み', cost: 25, startup: 8, active: 10, recovery: 20, heal: 15, damage: 5, knockX: 8, knockY: -4, hitstun: 24,
        effect: { preset: 'verdant', strength: 1.6, attack: [{ type: 'leaves', at: 'body', r: 110, count: 20, duration: 30 }, { type: 'bloom', at: 'body', r: 60, count: 10, duration: 18, color: '#9dff7a', color2: '#fff6a0', blend: 'add' }, { type: 'ring', at: 'feet', flat: true, r: 100 }] }, box: { x: -60, y: -122, w: 182, h: 122 } },
      // 世界樹: 相手の足元から大樹が突き上げ、6回当てて高く持ち上げる
      sx: { name: '世界樹', super: true, cost: 100, invincible: 12, minScale: 0.75, startup: 12, active: 30, recovery: 30, damage: 5, hits: 6, hitInterval: 5, hitStop: 4, knockX: 1, knockY: -5, hitstun: 30,
        effect: { preset: 'verdant', strength: 2, attack: [{ type: 'thorns', at: 'ground', r: 70, count: 7, length: 240, duration: 34 }, { type: 'vine', at: 'ground', x: -40, angle: -2.6, width: 14, length: 260, duration: 34 }, { type: 'vine', at: 'ground', x: 40, angle: -2.4, width: 10, length: 230, duration: 34 },
          { type: 'leaves', at: 'hitbox', y: -60, r: 120, count: 24, duration: 40 }, { type: 'text', text: 'Yggdrasil', at: 'head', delay: 12 }], hit: [{ type: 'leaves', r: 24, count: 4 }] },
        box: { x: 60, y: -262, w: 162, h: 262 } },
    },
  },
  {
    name: 'ギア',
    desc: '鋼の機兵:重装甲・ミサイル・熱でオーバーヒート',
    // 性能  いちばん重く(体力120・シールド80)吹っ飛びにくいが、空中ジャンプができない。必殺技を出すたびに「熱」がたまり(heat)、
    //   満タンでオーバーヒート(150F の間、必殺技が出ない)。ゲージ技「クーラント・パージ」で熱を0にできる
    stats: { hp: 120, jumpStartup: 6, landLag: 5, airLandLag: 10, speed: 3.4, jump: -12, airJumps: 0, gravityMul: 1.1, dashSpeed: 11, shield: 80, knockbackTaken: 0.85 },
    heat: { max: 100, decay: 0.28, lock: 150, color: '#ff7a3a' },
    ko: { type: 'collapse', drift: 1, keys: [[10, 'stagger'], [10, 'stagger2'], [16, 'kneel'], [20, 'fallFront']], lie: 'front', thud: 26, dust: '#c8d0d8' }, // 火花を散らしてひざから崩れ、うつぶせに倒れる
    sp: { max: 100, time: 0.012, hit: 0.55, combo: 0.9, hurt: 0.4, color: '#ff8a3a' },
    projectile: { speed: 12, damage: 7, radius: 14, life: 80, knockX: 5, knockY: -3, hitstun: 22, look: 'rocketFist', path: { type: 'boomerang', back: 0.3 }, from: { x: 50, y: -88 } },
    look: { smooth: { atk: 0.7, move: 0.28 }, color: '#b8c2cc', skin: '#9aa6b2' },
    crouchParry: { dmg: 0.35, knock: 0.15 },
    throw: {
      reach: [0.3, 1.5, 0.2, 0, 1.4, 0.2, 0, 0.8, -0.4, -0.5, 0.3, 8],
      name: '投げ', box: { x: 0, y: -90, w: 62, h: 80 },
      startup: 7, active: 3, whiff: 26, release: 34, total: 62,
      f: { name: 'アームスロー', damage: 11, vx: 11, vy: -6, hitstun: 26, effect: { preset: 'steel', hit: [{ type: 'impact', r: 34 }, { type: 'gear', r: 30, count: 4 }] } },
      b: { name: 'リバースブースト投げ', damage: 10, vx: 10, vy: -7, hitstun: 26, leap: 30, effect: { preset: 'thruster' } },
      u: { name: 'カタパルト', damage: 8, vx: 1, vy: -17, hitstun: 32, effect: { preset: 'thruster', hit: [{ type: 'flame', at: 'feet', r: 30, dir: 'down', duration: 12, color: '#ff8a3a', color2: '#ffe08a' }, { type: 'steam', at: 'feet', r: 40, count: 6 }] } },
      d: { name: 'プレスダウン', damage: 13, vx: 2, vy: -6, hitstun: 30, spike: 4, effect: { preset: 'steel', hit: [{ type: 'impact', r: 44 }, { type: 'gear', r: 40, count: 6 }, { type: 'shake', duration: 10, power: 6 }] } },
    },
    hitPoses: { head: [-0.2, 0.9, 1.6, 0, 0.8, 1.7, 0, 0.4, -0.4, -0.3, 0.3, 0] },
    poses: {
      idle: [0.05, 0.5, 1.4, 0, 0.6, 1.3, 0, 0.35, -0.35, -0.35, 0.35, 0, , , , , 1.3],   // 待機(両こぶしを胸の前に、どっしり)
      walk: [0.06, 0.25, 0.5, 0.5],                                                       // 歩き(重く、ゆれない)
      guard: [0.0, 1.0, 2.4, 0, 1.0, 2.4, 0, 0.4, -0.4, -0.4, 0.4, 0],
      crouch: [0.25, 0.8, 1.6, 0, 0.8, 1.6, 0, 1.1, -1.6, -1.0, 1.4, 0],
      jumpSquat: [0.35, 0.3, 1.2, 0, 0.3, 1.2, 0, 1.2, -1.8, -1, 1.8, -2],
      landing: [0.4, 1.0, 0.8, 0, 1.0, 0.8, 0, 1.3, -1.8, -0.6, 1.1, 4],
      dashF: [0.45, -0.3, 1.0, 0, -0.2, 1.0, 0, 0.6, -0.6, -0.5, 0.5, 0],               // スラスターで滑る(腕を後ろへ)
      dashB: [-0.2, 0.9, 1.6, 0, 0.8, 1.6, 0, 0.5, -0.6, 0.0, -0.3, 0],
      jumpUp: [0.0, 1.0, 1.4, 0, 1.0, 1.4, 0, 0.7, -1.0, 0.1, -0.6, 0],
      fall: [0.05, 1.2, 1.0, 0, 1.2, 1.0, 0, 0.3, -0.4, 0.0, -0.3, 0],
    },
    motions: {
      n: { w: [-0.05, 0.4, 1.9, 0, 0.6, 1.3, 0, 0.35, -0.35, -0.35, 0.35, -4], s: [0.15, 1.55, 0.05, 0, 0.6, 1.3, 0, 0.4, -0.35, -0.4, 0.35, 10] },          // ピストンジャブ
      f: { w: [-0.3, -0.6, 2.4, 0, 0.6, 1.4, 0, 0.5, -0.5, -0.4, 0.4, -10], s: [0.4, 1.55, 0.0, 0, -0.2, 1.0, 0, 0.8, -0.3, -0.6, 0.3, 18] },                // パイルバンカー
      b: { w: [0.2, 1.4, 1.6, 0, 0.6, 1.4, 0, 0.4, -0.4, -0.4, 0.4, 6], s: [-0.4, -0.6, 2.2, 0, 0.6, 1.4, 0, 0.3, -0.4, -0.6, 0.6, -16] },                  // バックブースト: 後ろへ噴射しながらひじ
      u: { w: [0.3, 0.4, 1.9, 0, 0.6, 1.4, 0, 0.7, -1.0, -0.3, 0.9, 0], s: [-0.2, 2.95, 0.1, 0, 0.8, 1.3, 0, 0.3, -0.2, -0.3, 0.2, 6] },                      // バルカンアッパー
      d: { w: [0.3, 0.6, 1.5, 0, 0.6, 1.5, 0, 1.0, -1.5, 0.2, -1.0, -2], s: [0.45, 0.8, 1.3, 0, 0.7, 1.3, 0, 1.45, -0.05, -0.8, -1.0, 14] },                 // キャタピラスライド
      da: { w: [0.6, 0.2, 1.4, 0, 0.3, 1.4, 0, 0.8, -0.6, -0.6, 0.5, -10], s: [0.85, 1.0, 1.0, 0, 0.8, 1.0, 0, 0.9, -0.2, -0.9, 0.4, 26] },                  // ブーストタックル(肩から)
      an: { w: [-0.3, 0.2, 1.6, 0, 0.6, 1.2, 0, 0.6, -1.0, 0.1, -0.6, -4], s: [0.3, 1.9, 0.3, 0, -0.3, 1.2, 0, 0.6, -0.8, -0.1, -0.5, 8] },                  // スピンアーム
      af: { w: [0.2, 0.8, 1.4, 0, 0.8, 1.4, 0, 1.1, -1.6, 0.2, -1.0, 0], s: [-0.3, 0.8, 1.4, 0, 0.8, 1.4, 0, 1.5, 0.0, -0.2, -0.6, 12] },                    // ジェットキック
      au: { w: [0.3, 0.5, 1.6, 0, 0.5, 1.6, 0, 0.8, -1.2, 0.2, -0.8, 0], s: [-0.4, 2.8, 0.4, 0, 2.6, 0.4, 0, 0.9, -0.6, 0.0, -0.5, 2] },                     // アンテナスパーク: 両手を上へ
      ad: { w: [-0.2, 2.9, 0.3, 0, 2.9, 0.3, 0, 0.8, -1.3, 0.3, -1.0, 0], s: [0.4, 0.8, 0.2, 0, 0.8, 0.2, 0, 0.5, -0.6, 0.2, -0.6, 4] },                      // ドロップハンマー: 両こぶしを振り下ろす
      s: { w: [-0.2, -0.4, 2.3, 0, 0.6, 1.4, 0, 0.5, -0.5, -0.4, 0.4, -8], s: [0.25, 1.55, 0.0, 0, 0.6, 1.4, 0, 0.6, -0.4, -0.5, 0.35, 8] },                 // ロケットパンチ: 腕を突き出す(こぶしが飛ぶ)
      sf: { w: [0.2, 0.0, 2.3, 0, 0.6, 1.4, 0, 0.8, -0.8, -0.5, 0.5, -8], s: [0.55, 1.55, 0.0, 0, 0.4, 1.2, 0, 1.0, -0.3, -0.8, 0.3, 22] },                 // ドリルブレイカー
      sb: { w: [0.0, 1.4, 1.8, 0, 1.4, 1.8, 0, 0.5, -0.6, -0.5, 0.6, 0], s: [-0.05, 1.7, 0.4, 0, 1.7, 0.4, 0, 0.6, -0.7, -0.6, 0.7, 0] },                    // フォースフィールド: 両手を広げて壁を張る
      su: { w: [0.35, 0.4, 1.8, 0, 0.5, 1.6, 0, 1.0, -1.5, 0.2, -1.1, 0], s: [-0.2, 3.05, 0.05, 0, 1.0, 1.0, 0, 0.6, -0.5, -0.3, -0.2, 6] },                  // ジェットアッパー
      sd: { w: [0.1, 0.9, 1.4, 0, 0.9, 1.4, 0, 0.5, -0.6, -0.4, 0.5, 0], s: [-0.15, 1.4, 1.4, 0, 1.3, 1.4, 0, 0.6, -0.7, -0.5, 0.6, -2] },                   // ミサイルポッド: 肩のポッドを開く
      c1: { w: [0.0, 0.6, 1.4, 0, 0.6, 1.4, 0, 0.4, -0.4, -0.4, 0.4, 0, , , , 0.3], s: [0.1, 0.6, 1.4, 0, 0.6, 1.4, 0, 0.45, -0.45, -0.45, 0.45, 0, , , , 0.3] },   // レーザーアイ: 構えたまま目から撃つ
      c2: { w: [0.3, 1.5, 0.2, 0, 1.4, 0.2, 0, 0.8, -0.4, -0.5, 0.3, 10], s: [0.3, 1.5, 0.2, 0, 1.4, 0.2, 0, 0.8, -0.4, -0.5, 0.3, 10] },                     // ギガントプレス(つかみに行く)
      gx: { w: [0.2, 0.6, 1.6, 0, 0.6, 1.6, 0, 0.6, -0.8, -0.5, 0.7, 0], s: [-0.2, 2.0, 0.6, 0, 2.0, 0.6, 0, 0.4, -0.4, -0.4, 0.4, 0] },                     // クーラント・パージ: 全身から蒸気
      sx: { w: [-0.2, 0.6, 1.8, 0, 0.6, 1.8, 0, 0.6, -0.6, -0.5, 0.5, -10], s: [0.2, 1.55, 0.0, 0, 1.5, 0.05, 0, 0.8, -0.4, -0.7, 0.4, 6] },                 // フルバースト: 両腕を前へ
    },
    combos: ['Z→→Z→A ロケットパンチ (戻るこぶしでもう一度)', '↓Z→↓↘→+Z レーザーアイ', '熱が7割をこえたら ZとA同時 クーラント・パージで冷やす', '相手が跳んだら ↓A ミサイルポッド→↑Z バルカンアッパー'],
    moves: {
      n: { name: 'ピストンジャブ', startup: 6, active: 2, recovery: 9, armor: 1, damage: 6, knockX: 4, knockY: -1, hitstun: 16, effect: { preset: 'steel', size: 0.6, start: [{ type: 'steam', at: 'front', r: 16, count: 3, duration: 8 }] }, box: { x: 30, y: -88, w: 54, h: 24 } }, // 少し遅いが、1回まで攻撃を受けても止まらないジャブ
      f: { name: 'パイルバンカー', startup: 11, active: 4, recovery: 18, damage: 10, knockX: 8, knockY: -3, hitstun: 24, launch: { x: 4 }, effect: { preset: 'steel', attack: [{ type: 'impact', at: 'hitbox', x: 30, r: 26 }, { type: 'steam', at: 'front', r: 30, count: 5 }], hit: [{ type: 'impact', r: 38 }, { type: 'gear', r: 30, count: 5 }, { type: 'shake', duration: 6, power: 4 }] }, box: { x: 30, y: -92, w: 92, h: 34 } },
      b: { name: 'バックブースト', startup: 6, active: 5, recovery: 13, damage: 6, knockX: 6, knockY: -2, hitstun: 20, launch: { x: -8 }, effect: { preset: 'thruster', attack: [{ type: 'flame', at: 'body', x: 20, dir: 'forward', rise: 3, count: 3, duration: 10 }] }, box: { x: 10, y: -92, w: 62, h: 52 } },
      u: { name: 'バルカンアッパー', startup: 7, active: 9, recovery: 18, damage: 3, hits: 3, hitInterval: 3, hitStop: 4, knockX: 1, knockY: -6, hitstun: 22, effect: { preset: 'steel', attack: [{ type: 'laser', at: 'base', angle: -1, length: 120, width: 3, duration: 10, color: '#ffb040', color2: '#fff8e0' }, { type: 'particles', count: 10, dir: 'up', speed: 6, color: '#ffd07a' }] }, box: { x: 20, y: -176, w: 92, h: 106 } }, // 斜め上へ3連射。遠めの跳び込みに強い
      d: { name: 'キャタピラスライド', startup: 8, active: 10, recovery: 14, damage: 6, knockX: 3, knockY: -1, hitstun: 22, launch: { x: 8 }, effect: { preset: 'steel', attack: [{ type: 'particles', at: 'feet', count: 10, color: '#ffd07a', gravity: 0.3, speed: 4, dir: 'back' }, { type: 'steam', at: 'feet', x: -20, r: 20, count: 4 }] }, box: { x: 20, y: -24, w: 72, h: 24 } }, // 低い姿勢で前へすべる下段
      da: { name: 'ブーストタックル', startup: 9, active: 10, recovery: 18, armor: 1, damage: 8, knockX: 7, knockY: -4, hitstun: 24, heat: 10, launch: { x: 14 }, effect: 'thruster', box: { x: 10, y: -100, w: 72, h: 80 } }, // 1回まで攻撃を受けても止まらない
      an: { name: 'スピンアーム', landLag: 6, startup: 5, active: 6, recovery: 10, damage: 5, knockX: 2, knockY: -3, hitstun: 16, effect: { preset: 'steel', size: 0.8 }, box: { x: -20, y: -96, w: 82, h: 62 } },
      af: { name: 'ジェットキック', landLag: 10, startup: 7, active: 6, recovery: 12, damage: 7, knockX: 5, knockY: -3, hitstun: 20, launch: { x: 5 }, effect: { preset: 'thruster', attack: [{ type: 'flame', at: 'body', x: -20, dir: 'back', rise: 3, count: 3, duration: 8 }] }, box: { x: 15, y: -70, w: 72, h: 46 } },
      au: { name: 'アンテナスパーク', landLag: 8, startup: 8, active: 5, recovery: 12, damage: 8, knockX: 2, knockY: -8, hitstun: 26, effect: { preset: 'thunder', color: '#7ae0ff', attack: [{ type: 'spark', at: 'head', length: 70 }, { type: 'flash', at: 'head', blend: 'add', r: 30 }] }, box: { x: -25, y: -162, w: 70, h: 92 } }, // 遅いがしびれて長く動けない
      ad: { name: 'ドロップハンマー', landLag: 14, startup: 9, active: 10, recovery: 16, damage: 10, knockX: 2, knockY: 8, spike: 5, hitstun: 24, launch: { x: 0, y: 15 }, effect: { preset: 'steel', hit: [{ type: 'impact', r: 40 }, { type: 'ring', flat: true, r: 60, width: 5 }, { type: 'shake', duration: 8, power: 5 }] }, box: { x: -20, y: -15, w: 62, h: 92 } },
      s: { name: 'ロケットパンチ', startup: 12, active: 3, recovery: 20, damage: 0, knockX: 0, knockY: 0, hitstun: 0, heat: 22, effect: { preset: 'thruster', attack: [{ type: 'steam', at: 'front', r: 30, count: 6 }] }, box: { x: 0, y: 0, w: 0, h: 0 } },
      sf: { name: 'ドリルブレイカー', startup: 10, active: 16, recovery: 22, damage: 3, hits: 5, hitInterval: 3, hitStop: 4, knockX: 2, knockY: -2, hitstun: 24, heat: 25, launch: { x: 8 },
        effect: { preset: 'steel', attack: [{ type: 'burst', at: 'hitbox', x: 20, r: 30, count: 10, spin: 4, duration: 16 }, { type: 'particles', count: 14, speed: 7, color: '#ffd07a', gravity: 0.3 }, { type: 'flame', at: 'body', x: -24, dir: 'back', rise: 4, count: 3, duration: 14 }] }, box: { x: 20, y: -96, w: 92, h: 40 } },
      // フォースフィールド: 体の前に力場を張る。3回まで攻撃を受け止め(アーマー)、大きく押し返す
      sb: { name: 'フォースフィールド', startup: 6, active: 16, recovery: 18, armor: 3, damage: 6, knockX: 12, knockY: -3, hitstun: 22, heat: 20,
        effect: { preset: 'barrier', color: '#5ad8ff', color2: '#e8fbff', attack: [{ type: 'ring', at: 'body', r: 80, width: 6, duration: 18, follow: true }, { type: 'flash', at: 'body', r: 70, blend: 'add', duration: 16, follow: true, color: '#5ad8ff' }] }, box: { x: -40, y: -132, w: 152, h: 132 } },
      // ジェットアッパー: 無敵はないが、2回まで攻撃を受け止めながら噴射で真上へ昇る
      su: { name: 'ジェットアッパー', startup: 7, active: 10, recovery: 28, armor: 2, damage: 13, knockX: 3, knockY: -12, hitstun: 28, heat: 25, launch: { x: 1, y: -14 },
        effect: { preset: 'thruster', attack: [{ type: 'flame', at: 'feet', dir: 'down', rise: 5, count: 6, duration: 16 }, { type: 'slash', angle: -1, width: 12 }, { type: 'steam', at: 'feet', r: 40, count: 6 }] }, box: { x: -10, y: -162, w: 72, h: 162 } },
      sd: { name: 'ミサイルポッド', startup: 14, active: 3, recovery: 22, damage: 0, knockX: 0, knockY: 0, hitstun: 0, heat: 30, box: { x: 0, y: 0, w: 0, h: 0 },
        projectile: { speed: 7, damage: 6, count: 2, spread: 1.2, radius: 10, life: 110, knockX: 3, knockY: -6, hitstun: 22, look: 'missile', path: { type: 'homing', turn: 0.06, delay: 12, angle: -60 }, from: { x: -10, y: -112 } },
        effect: { preset: 'steel', attack: [{ type: 'steam', at: 'head', x: -10, r: 30, count: 6 }, { type: 'flash', at: 'head', r: 30, blend: 'add', color: '#ffb070' }] } },
      // レーザーアイ: 目から細く長い光線(頭の高さ。しゃがんだ相手には当たらない)
      c1: { name: 'レーザーアイ', command: '↓↘→+Z', startup: 9, active: 6, recovery: 16, damage: 6, knockX: 3, knockY: -1, hitstun: 20, heat: 15, rank: 4,
        effect: { color: '#ff3a3a', color2: '#ffffff', start: [{ type: 'flash', at: 'head', y: 30, r: 16, blend: 'add', duration: 9, follow: true }], attack: [{ type: 'laser', at: 'base', length: 300, width: 5, duration: 10 }], hit: [{ type: 'burst', r: 22 }, { type: 'gear', r: 18, count: 2 }] },
        box: { x: 30, y: -114, w: 302, h: 14 } },
      // ギガントプレス: つかんで真上へ跳び、地面へ押しつぶす(コマンド投げ)
      c2: { name: 'ギガントプレス', command: '↓↙←+A', startup: 7, active: 3, recovery: 30, damage: 16, knockX: 4, knockY: -5, hitstun: 30, heat: 20, rank: 4, spike: 4,
        grab: { dir: 'd', box: { x: 0, y: -102, w: 72, h: 92 }, release: 34, total: 60, leap: 90, color: '#ff8a3a' },
        effect: { preset: 'thruster', hit: [{ type: 'impact', r: 50 }, { type: 'gear', r: 46, count: 6 }, { type: 'steam', at: 'feet', r: 60, count: 8 }, { type: 'shake', duration: 12, power: 7 }] } },
      // クーラント・パージ: 熱をすべて逃がし(オーバーヒートも直る)、蒸気で突き放す
      gx: { name: 'クーラント・パージ', cost: 25, vent: true, startup: 6, active: 8, recovery: 18, damage: 6, knockX: 10, knockY: -4, hitstun: 24,
        effect: { color: '#e8eef4', color2: '#ffffff', attack: [{ type: 'steam', at: 'body', r: 120, count: 18, duration: 34 }, { type: 'ring', at: 'body', r: 100, width: 5 }, { type: 'flash', at: 'body', r: 80, blend: 'add', color: '#9fe6ff' }] }, box: { x: -70, y: -132, w: 202, h: 132 } },
      // フルバースト: ミサイルとビームを一斉に撃つ(撃つと熱が60たまる)
      sx: { name: 'フルバースト', super: true, cost: 100, invincible: 12, minScale: 0.75, startup: 12, active: 30, recovery: 34, damage: 5, hits: 7, hitInterval: 4, hitStop: 4, knockX: 2, knockY: -2, hitstun: 30, heat: 60,
        effect: { preset: 'steel', strength: 2, start: [{ type: 'flash', at: 'front', r: 40, blend: 'add', duration: 12, follow: true, color: '#ffb070' }],
          attack: [{ type: 'laser', at: 'base', length: 520, width: 26, duration: 32, color: '#ff6a3a', color2: '#fff8e0' }, { type: 'missile', at: 'head', x: -10, r: 30, duration: 24 }, { type: 'missile', at: 'head', x: -10, y: -20, r: 30, duration: 24, delay: 6 },
            { type: 'gear', at: 'hitbox', r: 120, count: 10, duration: 30 }, { type: 'steam', at: 'body', r: 60, count: 10, duration: 30 }, { type: 'text', text: 'FULL BURST', at: 'head', delay: 12 }],
          hit: [{ type: 'impact', r: 26 }] },
        box: { x: 30, y: -112, w: 522, h: 72 } },
    },
  },
  {
    name: 'カルタ',
    desc: 'カードの奇術師:絵柄の順番で効果が変わるカード・瞬間移動',
    // 性能  技の性能そのものは平均的。投げるカードの絵柄は ♠ → ♥ → ♦ → ♣ の順番で決まっていて(運の要素はない)、次の絵柄は HUD に出る。
    //   当たると絵柄ごとの効果(♠ ダメージ×1.5 / ♥ 体力+4 / ♦ SP+10 / ♣ 相手の硬直+10F)。ワイルドカード(ゲージ技)も次の絵柄で中身が決まる。
    //   「イリュージョン」で相手の後ろへ、「すりかえ」で相手と位置を入れかえる
    stats: { hp: 100, jumpStartup: 4, landLag: 3, airLandLag: 8, speed: 4.3, jump: -13.5, airJumps: 1, dashSpeed: 9.5, shield: 60 },
    ko: { type: 'fly', vx: 7, vy: -9, spin: -6.28, bounce: 1, slide: 0.88, air: 'tuck', lie: 'back', dust: '#ffd0d8' }, // くるりと回って飛ばされ、帽子が落ちる
    sp: { max: 100, time: 0.012, hit: 0.6, combo: 1, hurt: 0.35, color: '#e0304a' },
    projectile: { speed: 12, damage: 5, radius: 11, life: 60, knockX: 4, knockY: -2, hitstun: 20, luck: 'suit', look: 'card', path: 'straight', from: { x: 40, y: -84 } },
    look: { smooth: { atk: 0.72, move: 0.34 }, color: '#1e1a2a', skin: '#f6dccc' },
    throw: {
      reach: [0.35, 1.5, 0.3, 0, 1.4, 0.3, 0, 0.8, -0.4, -0.5, 0.3, 10],
      name: '投げ', box: { x: 0, y: -85, w: 58, h: 75 },
      startup: 6, active: 3, whiff: 22, release: 30, total: 56,
      f: { name: 'カードトス', damage: 10, vx: 10, vy: -6, hitstun: 26, effect: { preset: 'card', hit: [{ type: 'cards', r: 40, count: 8 }] } },
      b: { name: 'ミスディレクション', damage: 9, vx: 9, vy: -6, hitstun: 26, effect: { preset: 'card', hit: [{ type: 'cards', r: 40, count: 6 }, { type: 'flash', r: 40, blend: 'add', color: '#ffe14a' }] } },
      u: { name: 'シルクハット・リフト', damage: 7, vx: 1, vy: -15, hitstun: 30, effect: { preset: 'card', hit: [{ type: 'cards', r: 50, count: 10 }, { type: 'star', count: 5, r: 20, spin: 2, color: '#ffe14a' }] } },
      d: { name: 'ラストカード', damage: 11, vx: 3, vy: -6, hitstun: 30, spike: 3, effect: { preset: 'card', hit: [{ type: 'cards', r: 50, count: 8 }, { type: 'impact', r: 36, color: '#e0304a' }, { type: 'shake', duration: 8, power: 5 }] } },
    },
    hitPoses: { head: [-0.3, 0.9, 1.9, 0, 0.7, 2, 0, 0.5, -0.6, -0.3, 0.5, 0] },
    poses: {
      idle: [0.0, 1.0, 1.4, 0.3, 0.3, 0.9, 0, 0.2, -0.1, -0.5, 0.4, 0, , , , , 1.8],      // 待機(カードを扇に開いて胸の前に。片足を引いて立つ)
      walk: [0.08, 0.35, 0.7, 0.7],
      guard: [0.05, 1.4, 2.0, 0.3, 1.0, 2.3, 0, 0.35, -0.45, -0.3, 0.35, 0],
      crouch: [0.3, 1.1, 1.6, 0, 0.7, 1.8, 0, 1.2, -1.6, -0.9, 1.4, 0],
      jumpSquat: [0.4, 0.2, 1.0, 0, 0.0, 1.0, 0, 1.15, -1.75, -1, 1.75, -2],
      landing: [0.4, 1.3, 0.5, 0, 0.8, 0.6, 0, 1.2, -1.6, -0.5, 0.9, 4],
      dashF: [0.5, 1.6, 0.6, 0, -0.4, 1.0, 0, 1.0, -0.7, -0.8, 0.6, 0],
      dashB: [-0.25, 1.0, 1.4, 0, 0.4, 1.9, 0, 0.7, -0.9, 0.1, -0.4, 0],
      jumpUp: [-0.1, 2.4, 0.4, 0.3, 1.0, 1.2, 0, 0.9, -1.4, 0.2, -0.6, 0],
      fall: [0.05, 1.6, 0.9, 0, 1.0, 0.9, 0, 0.3, -0.4, 0.1, -0.5, 0],
    },
    // 右腕(手前)= カードの束を持つ手 / 左腕(奥)= カードを放つ手
    motions: {
      n: { w: [-0.1, 0.4, 2.0, 0.4, 0.4, 1.5, 0, 0.4, -0.4, -0.3, 0.3, -4], s: [0.2, 1.7, 0.1, -0.4, 0.4, 1.4, 0, 0.5, -0.4, -0.4, 0.35, 12] },               // カードフリック
      f: { w: [-0.3, -0.5, 1.4, 0.4, 0.7, 1.4, 0, 0.6, -0.6, -0.5, 0.5, -8], s: [0.4, 2.0, 0.3, -0.5, -0.3, 1.1, 0, 0.9, -0.3, -0.8, 0.3, 18] },             // トランプフラッシュ
      b: { w: [0.2, 1.0, 1.6, 0, 0.6, 1.6, 0, 0.6, -0.6, -0.3, 0.5, 2], s: [-0.4, 0.8, 1.6, 0, 1.6, 0.1, 0, 0.9, -1.4, 0.4, -0.9, -10] },                   // ダブルダウン: 後ろへ跳んでカードを投げる
      u: { w: [0.2, 0.4, 1.8, 0, 0.5, 1.6, 0, 0.6, -1.0, -0.3, 0.9, 0], s: [-0.3, 2.9, 0.4, 0.4, 0.8, 1.3, 0, 0.3, -0.2, -0.3, 0.2, 4] },                    // シルクハット: 帽子をはね上げる
      d: { w: [0.4, 0.6, 1.5, 0, 0.6, 1.5, 0, 1.1, -1.6, 0.2, -1.0, -2], s: [0.5, 1.0, 1.2, 0, 0.8, 1.2, 0, 1.5, -0.05, -0.9, -1.1, 18] },                  // ローカード: 低く投げる
      da: { w: [0.5, -0.6, 2.0, 0, 0.9, 1.2, 0, 1.1, -0.9, -0.7, 0.6, -10], s: [0.7, 1.8, 0.2, -0.4, -0.5, 0.8, 0, 1.0, -0.2, -1.0, 0.4, 22] },             // ラッシュディール
      an: { w: [-0.4, -0.4, 1.2, 0.3, 0.4, 1.2, 0, 0.9, -1.4, 0.3, -1.0, -4], s: [0.4, 2.1, 0.2, -0.3, -0.5, 1.0, 0, 0.7, -1.0, -0.2, -0.7, 10] },          // カードスピン
      af: { w: [0.3, 2.4, 0.5, 0.3, 1.0, 1.2, 0, 1.0, -1.4, 0.3, -0.9, -4], s: [0.3, 0.9, 0.2, -0.3, 0.6, 1.2, 0, 0.7, -0.8, -0.2, -0.6, 12] },             // ハイカード
      au: { w: [0.3, 0.5, 1.6, 0, 0.4, 1.5, 0, 1.0, -1.4, 0.4, -1.0, 0], s: [-0.6, 3.0, 0.1, 0.3, 2.0, 0.6, 0, 1.6, -0.3, 0.3, -0.6, 2] },                   // ジョーカーフリップ: 宙返り
      ad: { w: [-0.1, 2.2, 0.5, 0.3, 1.4, 0.8, 0, 0.9, -1.5, 0.5, -1.2, 4], s: [-0.45, 0.3, 0.6, -0.4, 0.8, 1.0, 0, 1.1, -1.4, 0.6, -1.4, -10] },             // エスケープカット: 後ろへ反りながら足元を切る
      s: { w: [-0.2, 0.4, 1.9, 0, -0.2, 2.2, 0.4, 0.5, -0.5, -0.4, 0.4, -6], s: [0.25, 1.0, 1.4, 0, 1.6, 0.05, -0.3, 0.6, -0.4, -0.5, 0.35, 10] },          // カードショット: 奥の手で弾く
      sf: { w: [0.2, 0.4, 1.4, 0.3, 0.4, 1.4, 0, 0.9, -0.9, -0.5, 0.5, -6], s: [0.55, 1.9, 0.2, -0.4, 1.6, 0.2, 0, 1.1, -0.4, -0.8, 0.4, 22] },             // ロイヤルストレート
      sb: { w: [0.1, 2.6, 0.4, 0, 0.5, 1.2, 0, 0.4, -0.4, -0.3, 0.3, 0], s: [0.3, 1.6, 0.2, -0.3, 0.6, 1.4, 0, 0.6, -0.5, -0.5, 0.4, 10] },                  // イリュージョン: マントを翻して消える → 後ろから
      su: { w: [0.3, 0.4, 1.8, 0, 0.4, 1.6, 0, 1.0, -1.5, 0.2, -1.1, 0], s: [-0.4, 3.0, 0.2, 0.3, 2.6, 0.3, 0, 1.0, -1.0, 0.0, -0.4, 4] },                   // ハットトリック
      sd: { w: [-0.1, -0.2, 1.8, 0, 0.5, 1.6, 0, 0.6, -0.8, -0.4, 0.6, -6], s: [0.4, 0.7, 0.3, 0, 0.6, 1.4, 0, 1.0, -1.0, -0.7, 0.5, 12] },                 // ダイスロール: 低く転がす
      c1: { w: [-0.2, 0.6, 1.8, 0.3, 0.6, 1.8, 0, 0.5, -0.5, -0.4, 0.4, -6], s: [0.3, 1.9, 0.2, -0.5, 1.4, 0.2, 0, 0.7, -0.4, -0.6, 0.35, 10] },              // デッキシャッフル: 両手から扇に放つ
      c2: { w: [0.0, 2.8, 0.2, 0.4, 0.3, 1.6, 0, 0.3, -0.3, -0.3, 0.3, 0], s: [-0.1, 2.0, 1.4, 0.4, 0.3, 1.6, 0, 0.3, -0.3, -0.3, 0.3, 0] },                  // すりかえ: 指を鳴らす
      gx: { w: [0.0, 2.6, 0.3, 0.3, 0.4, 1.6, 0, 0.4, -0.4, -0.3, 0.3, 0], s: [0.35, 1.6, 0.1, -0.3, 1.5, 0.1, 0, 0.8, -0.4, -0.7, 0.4, 14] },              // ワイルドカード: 1枚引いて突き出す
      sx: { w: [-0.2, 2.6, 0.4, 0.3, 2.6, 0.4, 0, 0.5, -0.5, -0.4, 0.4, 0], s: [0.3, 1.6, 0.1, -0.3, 1.6, 0.1, 0, 0.8, -0.4, -0.7, 0.4, 12] },               // ジャックポット
    },
    combos: ['Z→→Z→A カードショット (絵柄で効果が変わる)', '↓Z→↓↘→+A デッキシャッフル (5枚の扇)', '←A イリュージョン (相手の後ろへ回って攻める)', '画面端で ↓↙←+Z すりかえ (位置を入れかえる)'],
    moves: {
      n: { name: 'カードフリック', startup: 4, active: 3, recovery: 6, damage: 4, knockX: 2, knockY: -4, hitstun: 15, effect: { preset: 'card', size: 0.6, attack: [{ type: 'crescent', angle: -1, width: 6, span: 1.8, color: '#ffffff' }] }, box: { x: 15, y: -120, w: 52, h: 48 } }, // 斜め上へはじく。高い所に当たる(跳ぼうとした相手を止める)
      f: { name: 'トランプフラッシュ', startup: 8, active: 4, recovery: 12, damage: 8, knockX: 6, knockY: -3, hitstun: 20, effect: { preset: 'card', attack: [{ type: 'crescent', width: 8, span: 2.6, color: '#ffffff' }, { type: 'cards', r: 34, count: 5 }] }, box: { x: 28, y: -96, w: 86, h: 46 } },
      // ダブルダウン: 後ろへ跳びながらカードを1枚、斜め下へ投げる(絵柄の順番どおりの効果)
      b: { name: 'ダブルダウン', startup: 8, active: 3, recovery: 14, damage: 0, knockX: 0, knockY: 0, hitstun: 0, launch: { x: -7, y: -6 }, box: { x: 0, y: 0, w: 0, h: 0 },
        projectile: { speed: 10, damage: 4, radius: 10, life: 40, path: { type: 'straight', angle: 18 } }, effect: { preset: 'card', attack: [{ type: 'cards', at: 'body', r: 24, count: 3 }] } },
      u: { name: 'ハットスロー', startup: 7, active: 3, recovery: 18, damage: 0, knockX: 0, knockY: 0, hitstun: 0, box: { x: 0, y: 0, w: 0, h: 0 },
        projectile: { speed: 9, damage: 6, radius: 16, life: 34, knockX: 2, knockY: -10, hitstun: 24, look: { preset: 'card', size: 1.6 }, path: { type: 'straight', angle: -72 }, from: { x: 20, y: -120 } },
        effect: { preset: 'card', attack: [{ type: 'star', at: 'head', count: 4, r: 14, spin: 2, color: '#ffe14a' }] } }, // 斜め上へ大きなカードを投げる対空(絵柄の順番どおりの効果)
      d: { name: 'ローカード', startup: 6, active: 3, recovery: 12, damage: 0, knockX: 0, knockY: 0, hitstun: 0, box: { x: 0, y: 0, w: 0, h: 0 },
        projectile: { speed: 11, damage: 4, radius: 9, life: 22, knockX: 3, knockY: -1, hitstun: 20, path: 'ground', from: { x: 30, y: -10 } },
        effect: { preset: 'card', attack: [{ type: 'lines', count: 2, at: 'feet', y: -10, length: 50 }] } }, // 地面すれすれにカードを飛ばす(短い距離。絵柄の効果つき)
      da: { name: 'ラッシュディール', startup: 6, active: 9, recovery: 14, damage: 3, hits: 3, hitInterval: 3, hitStop: 4, knockX: 3, knockY: -2, hitstun: 20, launch: { x: 12 }, effect: { preset: 'card', attack: [{ type: 'lines', count: 4, at: 'body', length: 100 }, { type: 'cards', r: 40, count: 6 }] }, box: { x: 20, y: -86, w: 66, h: 52 } },
      an: { name: 'カードスピン', landLag: 4, startup: 4, active: 7, recovery: 9, damage: 4, knockX: 2, knockY: -3, hitstun: 16, effect: { preset: 'card', attack: [{ type: 'crescent', width: 6, span: 3.4, color: '#ffffff' }, { type: 'cards', at: 'body', r: 34, count: 4 }] }, box: { x: -15, y: -90, w: 75, h: 52 } },
      af: { name: 'ハイカード', landLag: 9, startup: 6, active: 5, recovery: 11, damage: 7, knockX: 5, knockY: -4, hitstun: 20, effect: { preset: 'card', attack: [{ type: 'crescent', angle: 1, width: 9, span: 2.4, color: '#ffffff' }] }, box: { x: 20, y: -96, w: 80, h: 56 } },
      au: { name: 'ジョーカーフリップ', landLag: 7, startup: 5, active: 3, recovery: 12, damage: 0, knockX: 0, knockY: 0, hitstun: 0, box: { x: 0, y: 0, w: 0, h: 0 },
        projectile: { speed: 11, damage: 4, radius: 10, life: 28, knockX: 1, knockY: -8, hitstun: 20, path: { type: 'straight', angle: -88 }, from: { x: 10, y: -110 } },
        effect: { preset: 'card', attack: [{ type: 'crescent', angle: -1, width: 6, span: 2 }] } }, // 宙返りしながら真上へカードを投げる
      ad: { name: 'エスケープカット', landLag: 8, startup: 6, active: 8, recovery: 12, damage: 6, knockX: 3, knockY: 4, hitstun: 20, float: 1.2, launch: { x: -5, y: -4 }, effect: { preset: 'card', attack: [{ type: 'crescent', angle: 1, width: 8, span: 2.4, color: '#ffffff' }, { type: 'cards', at: 'feet', r: 30, count: 4 }] }, box: { x: -20, y: -30, w: 80, h: 50 } }, // 後ろへ跳ねながら足元を切る(下がりながら当てる空中技)
      s: { name: 'カードショット', startup: 9, active: 3, recovery: 15, damage: 0, knockX: 0, knockY: 0, hitstun: 0, effect: { preset: 'card', attack: [{ type: 'cards', at: 'front', r: 20, count: 2 }] }, box: { x: 0, y: 0, w: 0, h: 0 } },
      sf: { name: 'ロイヤルストレート', startup: 9, active: 18, recovery: 20, damage: 4, hits: 5, hitInterval: 3, hitStop: 4, knockX: 2, knockY: -2, hitstun: 22, launch: { x: 13 },
        effect: { preset: 'card', attack: [{ type: 'lines', count: 5, at: 'body', length: 120 }, { type: 'cards', at: 'body', r: 60, count: 10, duration: 22, follow: true }, { type: 'text', text: '10 J Q K A', at: 'head', delay: 4 }] }, box: { x: 10, y: -96, w: 82, h: 72 } },
      // イリュージョン: 出始め無敵で消え、相手の後ろに現れて打つ
      sb: { name: 'イリュージョン', startup: 10, active: 4, recovery: 12, invincible: 14, warp: 'behind', damage: 6, knockX: 5, knockY: -3, hitstun: 22,
        effect: { preset: 'card', start: [{ type: 'cards', at: 'body', r: 50, count: 10, duration: 14 }], attack: [{ type: 'crescent', width: 9, span: 2.4, color: '#ffffff' }, { type: 'flash', at: 'body', r: 40, blend: 'add', color: '#ffe14a' }] }, box: { x: 10, y: -92, w: 62, h: 62 } },
      // ハットトリック: その場で回ってカードの渦を作る。無敵で3回当たり、まわりの相手を浮かせる(飛び上がらない)
      su: { name: 'ハットトリック', startup: 5, active: 12, recovery: 24, invincible: 6, damage: 4, hits: 3, hitInterval: 4, hitStop: 4, knockX: 2, knockY: -8, hitstun: 26,
        turn: [{ at: 'startup', body: 3 }, { at: 8, body: -3 }, { at: 12, body: 3 }, { at: 'recovery', body: 1 }],
        effect: { preset: 'card', attack: [{ type: 'cards', at: 'body', r: 70, count: 12, duration: 20, follow: true }, { type: 'star', count: 5, r: 18, spin: 2, color: '#ffe14a' }] }, box: { x: -55, y: -152, w: 120, h: 152 } },
      // ダイスロール: 地面を転がる大きなサイコロ。2回まで当たる
      sd: { name: 'ダイスロール', startup: 14, active: 3, recovery: 22, damage: 0, knockX: 0, knockY: 0, hitstun: 0, box: { x: 0, y: 0, w: 0, h: 0 },
        projectile: { speed: 6.5, damage: 5, radius: 18, life: 100, hits: 2, hitEvery: 14, knockX: 2, knockY: -6, hitstun: 24, look: 'dice', path: 'ground', from: { x: 40, y: -20 } },
        effect: { preset: 'card', attack: [{ type: 'cards', at: 'front', r: 24, count: 3 }] } },
      c1: { name: 'デッキシャッフル', command: '↓↘→+A', startup: 12, active: 3, recovery: 22, damage: 0, knockX: 0, knockY: 0, hitstun: 0, rank: 4, box: { x: 0, y: 0, w: 0, h: 0 },
        projectile: { speed: 11, damage: 3, count: 5, spread: 1.4, radius: 10, life: 50 },
        effect: { preset: 'card', start: [{ type: 'cards', at: 'front', r: 30, count: 6, duration: 12, follow: true }] } },
      // すりかえ: 指を鳴らして、相手と立ち位置を入れかえる(ダメージなし)
      c2: { name: 'すりかえ', command: '↓↙←+Z', startup: 12, active: 1, recovery: 14, damage: 0, knockX: 0, knockY: 0, hitstun: 0, warp: 'swap', rank: 3,
        effect: { preset: 'card', start: [{ type: 'star', at: 'front', count: 4, r: 14, spin: 2, color: '#ffe14a' }] }, box: { x: 0, y: 0, w: 0, h: 0 } },
      // ワイルドカード: 次に出る絵柄(HUD に出る)で中身が決まる。♠ ジャック=大ダメージ / ♥ クイーン=回復 / ♦ キング=3枚の大きなカード / ♣ エース=長く動けなくする
      gx: { name: 'ワイルドカード', cost: 25, suitPick: true, startup: 8, active: 5, recovery: 20, damage: 8, knockX: 8, knockY: -4, hitstun: 26, box: { x: 20, y: -112, w: 112, h: 92 },
        effect: { preset: 'card', strength: 1.5, start: [{ type: 'cards', at: 'body', r: 40, count: 6, duration: 12 }] },
        variants: [
          { name: 'ワイルドカード:ジャック', damage: 15, knockX: 11, knockY: -6, hitstun: 30, effect: { preset: 'card', strength: 2, attack: [{ type: 'crescent', width: 14, span: 3, color: '#ffffff' }, { type: 'cards', r: 60, count: 10 }, { type: 'text', text: 'J', at: 'head' }] } },
          { name: 'ワイルドカード:クイーン', heal: 18, damage: 5, knockX: 10, knockY: -3, hitstun: 22, effect: { preset: 'card', attack: [{ type: 'bloom', at: 'body', r: 50, count: 10, color: '#ff5a7a', color2: '#ffffff', blend: 'add' }, { type: 'cards', at: 'body', r: 60, count: 8 }, { type: 'text', text: 'Q', at: 'head' }] } },
          { name: 'ワイルドカード:キング', damage: 0, knockX: 0, knockY: 0, hitstun: 0, box: { x: 0, y: 0, w: 0, h: 0 }, projectile: { speed: 9, damage: 8, count: 3, spread: 1.0, radius: 18, life: 70, luck: null, look: { preset: 'card', size: 1.6 } },   // 大きなカードは絵柄の順番を進めない
            effect: { preset: 'card', attack: [{ type: 'cards', at: 'front', r: 40, count: 6 }, { type: 'text', text: 'K', at: 'head' }] } },
          { name: 'ワイルドカード:エース', damage: 6, knockX: 2, knockY: -2, hitstun: 46, effect: { preset: 'card', attack: [{ type: 'cross', r: 40, width: 10, color: '#7aff9a' }, { type: 'cards', r: 50, count: 8 }, { type: 'text', text: 'A', at: 'head' }] } },
        ] },
      // ジャックポット: スロットの絵柄が回り、7回切り刻む
      sx: { name: 'ジャックポット', super: true, cost: 100, invincible: 12, minScale: 0.75, startup: 10, active: 35, recovery: 30, damage: 5, hits: 7, hitInterval: 5, hitStop: 4, knockX: 1, knockY: -2, hitstun: 30,
        effect: { preset: 'card', strength: 2, attack: [{ type: 'cards', at: 'hitbox', r: 110, count: 20, duration: 38 }, { type: 'star', at: 'head', count: 7, r: 26, spin: 3, color: '#ffe14a', duration: 30 }, { type: 'text', text: '7 7 7', at: 'head', delay: 10 }], hit: [{ type: 'cards', r: 22, count: 3 }] },
        box: { x: 20, y: -142, w: 202, h: 142 } },
    },
  },
];