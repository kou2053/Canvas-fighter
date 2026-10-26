// ============================================================
// profile.js … 実績・称号・プレイヤープロフィール
//
//  【保存】すべて save(localStorage 'cf')に入る。ゲームを閉じても残る。
//    save.pf    … プロフィールの集計(下の PF_DEFAULT)。試合が終わるたびに足していく
//    save.ach   … 解除した実績 { 実績id: 解除した時刻 }
//    save.title … 装備している称号(実績 id。称号は実績の報酬)
//    save.pname … プレイヤー名
//  【集計するタイミング】(script.js から呼ぶ)
//    pfOnMatchEnd(w) … 試合の決着(endFight)。CPU対戦・ランク・カジュアル・プライベートを「自分の試合」として数える。
//                      CPU観戦は観戦回数だけ。トレーニングは試合に数えない
//    pfOnTraining()  … トレーニングを始めた
//    リプレイの保存   … replay.js の rpSavePending をこのファイルで包んで数える
//  【実績】PF_ACH(110 以上)。条件は「save.pf の値(または今の状態)が target 以上」。
//    試合の終わり・画面を開いたとき・メニューにいる間(1秒ごと)に判定し、達成したら解除 → 称号を獲得して通知を出す
// ============================================================
const PF_DEFAULT = {
  games: 0, wins: 0, losses: 0,                  // 自分の試合数・勝ち・負け
  streak: 0, bestStreak: 0, loseStreak: 0,       // 今の連勝 / 最高連勝 / 今の連敗
  recover: 0,                                    // 3連敗以上のあとの勝利の回数
  perfect: 0, comeback: 0, fastWin: 0,           // ノーダメージ勝利 / 体力1割以下からの勝利 / いちばん速い勝利(F。0=まだ)
  bestCombo: 0, bestComboDmg: 0,                 // 1試合の最大コンボ数・最大コンボダメージ(これまでの最高)
  jg: 0, guarded: 0, jgBest: 0,                  // ジャストガード累計 / シールドで受けた攻撃の累計 / 1試合の最多ジャスガ
  dealt: 0, taken: 0, hits: 0, atts: 0,          // 与えた・受けたダメージ累計 / 当たった技・出した技の累計
  bestHitRate: 0,                                // 勝った試合の最高命中率(%。技を5回以上出した試合だけ)
  throws: 0, apar: 0, cparry: 0, head: 0, pj: 0, // 投げ / 空中受け流し / しゃがみ受け流し / 頭に当てた / 飛び道具が当たった(累計)
  chars: {},                                     // キャラごとの { g: 試合数, w: 勝ち }
  stages: {},                                    // ステージごとの勝ち { ステージ番号: 勝ち数 }
  modes: {},                                     // モードごとの { g, w }
  cpuWinLv: 0,                                   // CPU対戦で勝った最高レベル
  rankGames: 0, rpMax: 0,                        // ランクの試合数 / 最高RP
  replays: 0, trainings: 0, watches: 0,          // リプレイを保存した回数 / トレーニングを始めた回数 / CPU観戦の回数
  playFrames: 0, coins: 0,                       // 試合時間の合計(F) / 試合で得たコインの合計
  titleSet: 0,                                   // 称号を装備したことがある
  gxUse: 0, sxUse: 0, sxHit: 0, sxKO: 0,         // ゲージ技を出した / 超必殺技を出した / 超必殺技が当たった / 超必殺技で K.O.(累計)
  last: [],                                      // 最近の試合の結果(新しい順。最大10件) [{ w, c: キャラ, o: 相手, t: 時刻 }]
};
function pfInit() {
  const had = !!save.pf;
  save.pf = { ...JSON.parse(JSON.stringify(PF_DEFAULT)), ...(save.pf || {}) };
  if (!had) {                                    // はじめて: これまでの勝ち負け(save.w / save.l)を引き継ぐ
    save.pf.wins = save.w | 0;
    save.pf.losses = save.l | 0;
    save.pf.games = save.pf.wins + save.pf.losses;
    save.pf.rpMax = save.rp | 0;
  }
  save.ach = save.ach || {};
  if (save.pname == null) save.pname = 'PLAYER';
}
pfInit();

// ---------------- 実績の一覧 ----------------
//  { id, cat: 分類, name: 実績名, desc: 条件の説明, title: 報酬の称号, target: 目標値, val: () => 今の値 }
const PF = () => save.pf;
const PF_CATS = ['試合', '勝利', '連勝', 'コンボ', '防御', '攻撃', 'ゲージ', 'キャラ', 'ステージ', 'CPU・ランク', 'その他'];
const PF_ACH = [];
function pfAdd(cat, id, name, desc, title, target, val) { PF_ACH.push({ cat, id, name, desc, title, target, val }); }
function pfTier(cat, id, list, name, desc, val) {
  for (const [n, title] of list) pfAdd(cat, id + n, name(n), desc(n), title, n, val);
}
const pfMin = (f) => Math.round(f / 3600);
// 試合
pfTier('試合', 'games', [[1, 'ルーキー'], [5, '駆け出しファイター'], [10, '見習い格闘家'], [25, '常連ファイター'], [50, '歴戦の格闘家'], [100, '百戦錬磨'], [200, 'ベテラン'], [300, '鉄人'], [500, '闘いの化身'], [1000, '生ける伝説']],
  (n) => (n === 1 ? 'はじめての試合' : '試合数 ' + n), (n) => '試合を ' + n + ' 回する', () => PF().games);
pfTier('試合', 'play', [[10, 'ちょっと一戦'], [60, '熱中ファイター'], [300, 'のめり込む者'], [600, '格闘ゲーム中毒']],
  (n) => (n < 60 ? n + '分' : n / 60 + '時間') + 'の戦い', (n) => '試合時間の合計が ' + (n < 60 ? n + '分' : n / 60 + '時間') + 'をこえる', () => pfMin(PF().playFrames));
// 勝利
pfTier('勝利', 'wins', [[1, '初勝利'], [5, '勝利の味'], [10, '実力者'], [25, '勝負師'], [50, '強者'], [100, '百勝の覇者'], [200, '猛者'], [300, '覇王'], [500, '無双'], [1000, '勝利の神']],
  (n) => (n === 1 ? 'はじめての勝利' : n + '勝'), (n) => '試合に ' + n + ' 回勝つ', () => PF().wins);
pfTier('勝利', 'perfect', [[1, '無傷の勝者'], [5, '完全勝利者'], [10, 'パーフェクトマスター']],
  (n) => 'パーフェクト' + (n > 1 ? ' ×' + n : ''), (n) => 'ダメージを受けずに勝つ(' + n + '回)', () => PF().perfect);
pfTier('勝利', 'comeback', [[1, '逆転の一手'], [5, '粘り腰'], [10, '不死鳥']],
  (n) => '大逆転' + (n > 1 ? ' ×' + n : ''), (n) => '体力が1割以下から勝つ(' + n + '回)', () => PF().comeback);
pfTier('勝利', 'fast', [[30, '速攻'], [20, '電光石火'], [15, '瞬殺']],
  (n) => n + '秒決着', (n) => n + '秒以内に勝つ', () => (PF().fastWin && PF().fastWin <= 0 ? 0 : 0));
// ↑ 速さは「小さいほど良い」ので val を下で付け直す
for (const a of PF_ACH) if (a.id.startsWith('fast')) { const s = a.target; a.target = 1; a.val = () => (PF().fastWin > 0 && PF().fastWin <= s * 60 ? 1 : 0); }
pfAdd('勝利', 'recover', '立ち上がる', '3連敗以上のあとに勝つ', 'あきらめない心', 1, () => PF().recover);
// 連勝
pfTier('連勝', 'streak', [[2, '波に乗る者'], [3, '三連星'], [5, '止まらない'], [7, '七つの勝利'], [10, '十連の覇者'], [15, '不敗神話'], [20, '無敗の帝王'], [30, '伝説の連勝']],
  (n) => n + '連勝', (n) => n + '連勝する', () => PF().bestStreak);
// コンボ
pfTier('コンボ', 'combo', [[3, 'コンボ入門'], [5, 'コンボ使い'], [7, 'つなぎの達人'], [10, 'コンボマスター'], [12, '連撃の鬼'], [15, 'コンボの芸術家'], [20, '無限コンボ']],
  (n) => n + 'ヒットコンボ', (n) => '1回のコンボで ' + n + ' ヒットする', () => PF().bestCombo);
pfTier('コンボ', 'cdmg', [[20, '痛い一撃'], [30, '大ダメージ'], [40, '破壊者'], [50, '粉砕者'], [60, '一撃必殺'], [80, 'オーバーキル']],
  (n) => 'コンボダメージ ' + n, (n) => '1回のコンボで ' + n + ' ダメージ与える', () => PF().bestComboDmg);
// 防御
pfTier('防御', 'jg', [[1, '見切りの芽'], [10, '見切り上手'], [25, '鉄壁'], [50, '完全防御'], [100, 'ジャスガ職人'], [250, '神の目'], [500, '未来視']],
  (n) => (n === 1 ? 'はじめてのジャスガ' : 'ジャスガ ' + n + '回'), (n) => 'ジャストガードを合計 ' + n + ' 回する', () => PF().jg);
pfTier('防御', 'jgm', [[3, '読み切り'], [5, '読心術'], [10, '全部見えている']],
  (n) => '1試合ジャスガ ' + n, (n) => '1試合でジャストガードを ' + n + ' 回する', () => PF().jgBest);
pfTier('防御', 'apar', [[1, '空中の舞'], [10, '空の受け流し'], [50, '天空の守り手']],
  (n) => '空中受け流し ' + n + '回', (n) => '空中受け流しを合計 ' + n + ' 回決める', () => PF().apar);
pfTier('防御', 'cparry', [[1, '受け流し'], [10, '柳に風'], [50, '流水の構え']],
  (n) => 'しゃがみ受け流し ' + n + '回', (n) => 'しゃがみ受け流しを合計 ' + n + ' 回決める', () => PF().cparry);
// 攻撃
pfTier('攻撃', 'dealt', [[500, 'ダメージディーラー'], [1000, '破壊の申し子'], [5000, '暴れん坊'], [10000, 'デストロイヤー'], [30000, '災厄'], [100000, '天災']],
  (n) => '累計ダメージ ' + n, (n) => '与えたダメージの合計が ' + n + ' をこえる', () => PF().dealt);
pfTier('攻撃', 'acc', [[70, '正確無比'], [90, 'スナイパー'], [100, '百発百中']],
  (n) => '命中率 ' + n + '%', (n) => '技を5回以上出して、命中率 ' + n + '% 以上で勝つ', () => PF().bestHitRate);
pfTier('攻撃', 'throw', [[1, '投げ技師'], [10, '投げの名手'], [50, '投げ職人'], [100, '柔の道']],
  (n) => '投げ ' + n + '回', (n) => '投げを合計 ' + n + ' 回決める', () => PF().throws);
pfTier('攻撃', 'head', [[10, '頭狙い'], [100, 'ヘッドハンター'], [500, '脳天直撃']],
  (n) => 'ヘッドショット ' + n, (n) => '頭に合計 ' + n + ' 回当てる', () => PF().head);
pfTier('攻撃', 'pj', [[10, '飛び道具使い'], [100, '弾幕職人'], [500, '砲台']],
  (n) => '飛び道具 ' + n + 'ヒット', (n) => '飛び道具を合計 ' + n + ' 回当てる', () => PF().pj);
// ゲージ(SP ゲージの技)
pfTier('ゲージ', 'gxu', [[1, 'ゲージ使い'], [10, 'ゲージ管理人'], [50, 'リソースの鬼']],
  (n) => 'ゲージ技 ' + n + '回', (n) => 'ゲージ技(Z と A 同時押し)を合計 ' + n + ' 回出す', () => PF().gxUse);
pfTier('ゲージ', 'sxu', [[1, '必殺の覚醒'], [10, '超必殺の担い手'], [30, '奥義伝承者']],
  (n) => '超必殺技 ' + n + '回', (n) => '超必殺技(↓ + Z と A)を合計 ' + n + ' 回出す', () => PF().sxUse);
pfTier('ゲージ', 'sxh', [[1, '決め技'], [20, '奥義の冴え'], [100, '必殺仕事人']],
  (n) => '超必殺ヒット ' + n, (n) => '超必殺技を合計 ' + n + ' ヒットさせる', () => PF().sxHit);
pfTier('ゲージ', 'sxko', [[1, 'フィニッシャー'], [10, '魅せる勝者']],
  (n) => '超必殺フィニッシュ' + (n > 1 ? ' ×' + n : ''), (n) => '超必殺技で K.O. する(' + n + '回)', () => PF().sxKO);
// キャラ
for (const c of CH) {
  const nm = c.nm, cs = () => PF().chars[nm] || { g: 0, w: 0 };
  pfAdd('キャラ', 'cw1_' + nm, nm + 'で初勝利', nm + 'で勝つ', nm + '使い', 1, () => cs().w);
  pfAdd('キャラ', 'cw10_' + nm, nm + 'で10勝', nm + 'で10回勝つ', nm + 'の名手', 10, () => cs().w);
  pfAdd('キャラ', 'cw30_' + nm, nm + 'で30勝', nm + 'で30回勝つ', nm + 'マスター', 30, () => cs().w);
}
pfAdd('キャラ', 'allplay', '全キャラ使用', '全員のキャラで試合をする', 'オールラウンダー', CH.length, () => CH.filter((c) => (PF().chars[c.nm] || {}).g > 0).length);
pfAdd('キャラ', 'allwin', '全キャラ制覇', '全員のキャラで勝つ', '全キャラ制覇', CH.length, () => CH.filter((c) => (PF().chars[c.nm] || {}).w > 0).length);
// ステージ
ST.forEach((st, i) => pfAdd('ステージ', 'st' + i, st.nm + 'で勝利', st.nm + '(' + st.env + ')で勝つ', st.nm + 'の勝者', 1, () => PF().stages[i] | 0));
pfAdd('ステージ', 'stall', '全ステージ制覇', 'すべてのステージで勝つ', '世界を巡る者', ST.length, () => ST.filter((_, i) => PF().stages[i] > 0).length);
// CPU・ランク
pfTier('CPU・ランク', 'cpu', [[3, 'CPUキラー'], [5, '機械に勝つ者'], [7, 'AI撃破'], [9, '頭脳戦の勝者'], [10, '最強AIを超えし者']],
  (n) => 'CPU Lv' + n + ' 撃破', (n) => 'CPU対戦でレベル ' + n + ' 以上の CPU に勝つ', () => PF().cpuWinLv);
pfTier('CPU・ランク', 'rankg', [[1, 'ランク挑戦者'], [10, 'ランクの常連'], [50, 'ランクの住人']],
  (n) => 'ランク ' + n + '試合', (n) => 'ランクルームで ' + n + ' 回戦う', () => PF().rankGames);
pfTier('CPU・ランク', 'rp', [[1100, 'ブロンズ'], [1200, 'シルバー'], [1500, 'ゴールド'], [2000, 'レジェンド']],
  (n) => 'RP ' + n, (n) => 'RP を ' + n + ' 以上にする', () => Math.max(PF().rpMax, save.rp | 0));
// その他
pfTier('その他', 'replay', [[1, '記録係'], [10, '名場面コレクター'], [30, 'アーカイブの守人']],
  (n) => 'リプレイ保存 ' + n + '回', (n) => 'リプレイを ' + n + ' 回保存する', () => PF().replays);
pfTier('その他', 'train', [[1, '練習生'], [10, '努力家'], [50, '修行僧']],
  (n) => 'トレーニング ' + n + '回', (n) => 'トレーニングを ' + n + ' 回する', () => PF().trainings);
pfTier('その他', 'watch', [[1, '観戦者'], [10, '解説者']],
  (n) => 'CPU観戦 ' + n + '回', (n) => 'CPU観戦を最後まで ' + n + ' 回見る', () => PF().watches);
pfTier('その他', 'coin', [[1000, '小金持ち'], [5000, 'お金持ち'], [20000, '大富豪']],
  (n) => 'コイン ' + n, (n) => '試合で得たコインの合計が ' + n + ' をこえる', () => PF().coins);
const pfSkins = () => Object.keys(save.own || {}).filter((k) => save.own[k]).length;
pfTier('その他', 'skin', [[1, 'おしゃれ'], [5, 'コレクター'], [10, '衣装持ち']],
  (n) => 'スキン ' + n + '着', (n) => 'スキンを ' + n + ' 着持つ', pfSkins);
pfAdd('その他', 'skinall', 'スキン全部', 'すべてのスキンを持つ', 'ファッションリーダー', CH.length * 3, pfSkins);
pfAdd('その他', 'titleset', 'こだわり派', '称号を装備する', 'こだわり派', 1, () => PF().titleSet);
pfAdd('その他', 'achv50', '実績ハンター', '実績を50個解除する', '実績ハンター', 50, () => pfUnlockedCount());
pfAdd('その他', 'achv100', '実績コンプリーター', '実績を100個解除する', '求道者', 100, () => pfUnlockedCount());
const PF_BY_ID = Object.fromEntries(PF_ACH.map((a) => [a.id, a]));
const pfUnlockedCount = () => PF_ACH.filter((a) => save.ach[a.id]).length;
const pfTitleName = () => (save.title && save.ach[save.title] && PF_BY_ID[save.title] ? PF_BY_ID[save.title].title : '');

// ---------------- 判定・通知 ----------------
const PFU = { toast: [], tT: 0, sel: 0, cat: 0, flt: 0, top: 0, msg: '', from: 'main', chk: 0 };
function pfCheck() {
  let n = 0;
  for (let pass = 0; pass < 2; pass++)            // 「実績を◯個解除」が同じ判定で達成されることがあるので2回まわす
    for (const a of PF_ACH) {
      if (save.ach[a.id]) continue;
      let v = 0;
      try { v = a.val() || 0; } catch (e) {}
      if (v >= a.target) {
        save.ach[a.id] = Date.now();
        PFU.toast.push(a);
        n++;
      }
    }
  if (n) sv();
  return n;
}
// 試合の決着(script.js endFight から)
function pfOnMatchEnd(w) {
  const P = PF(), R_ = RESULT;
  if (!R_) return;
  if (R_.mode === 'watch') {
    P.watches++;
  } else if (R_.mode !== 'train') {
    const me = R_.A, op = R_.B;
    P.games++;
    if (w) {
      P.wins++;
      P.streak++;
      P.bestStreak = Math.max(P.bestStreak, P.streak);
      if (P.loseStreak >= 3) P.recover++;
      P.loseStreak = 0;
      if (me.taken === 0) P.perfect++;
      if (me.hp <= me.hpMax * 0.1) P.comeback++;
      if (!P.fastWin || R_.time < P.fastWin) P.fastWin = R_.time;
      P.stages[R_.st] = (P.stages[R_.st] | 0) + 1;
      if (me.att >= 5) P.bestHitRate = Math.max(P.bestHitRate, Math.round((me.hit / me.att) * 100));
      if (R_.mode === 'cpu') P.cpuWinLv = Math.max(P.cpuWinLv, R_.lvB | 0);
    } else {
      P.losses++;
      P.streak = 0;
      P.loseStreak++;
    }
    const cs = (P.chars[me.name] = P.chars[me.name] || { g: 0, w: 0 });
    cs.g++;
    if (w) cs.w++;
    const ms = (P.modes[R_.mode] = P.modes[R_.mode] || { g: 0, w: 0 });
    ms.g++;
    if (w) ms.w++;
    P.bestCombo = Math.max(P.bestCombo, me.maxCombo);
    P.bestComboDmg = Math.max(P.bestComboDmg, me.maxComboDmg);
    P.jg += me.jg;
    P.guarded += me.guarded;
    P.jgBest = Math.max(P.jgBest, me.jg);
    P.dealt += me.dealt;
    P.taken += me.taken;
    P.hits += me.hit;
    P.atts += me.att;
    P.throws += me.thr | 0;
    P.apar += me.apar | 0;
    P.cparry += me.cparry | 0;
    P.head += me.head | 0;
    P.pj += me.pj | 0;
    P.gxUse += me.gxUse | 0;
    P.sxUse += me.sxUse | 0;
    P.sxHit += me.sxHit | 0;
    P.sxKO += me.sxKO | 0;
    if (R_.mode === 'rank') P.rankGames++;
    P.rpMax = Math.max(P.rpMax, save.rp | 0);
    P.playFrames += R_.time;
    P.coins += w ? 60 : 15;
    P.last.unshift({ w: !!w, c: me.name, o: op.name, t: Date.now() });
    P.last.length = Math.min(P.last.length, 10);
  }
  sv();
  pfCheck();
}
function pfOnTraining() {
  PF().trainings++;
  sv();
  pfCheck();
}
// リプレイの保存を数える(replay.js の rpSavePending を包む)
if (typeof rpSavePending === 'function') {
  const rpSave0 = rpSavePending;
  rpSavePending = function () {
    const ok = rpSave0.apply(this, arguments);
    if (ok) { PF().replays++; sv(); pfCheck(); }
    return ok;
  };
}

// ---------------- 画面 ----------------
//  sc: 'profile'(プロフィール) / 'achv'(実績一覧) / 'titles'(称号を選ぶ)
function pfOpen() {
  pfCheck();
  sc = 'profile';
  PFU.sel = 0;
  PFU.msg = '';
}
const PF_MENU = ['実績一覧', '称号を選ぶ', '名前を変える', '戻る'];
const pfRate = (a, b) => (b ? Math.round((a / b) * 100) + '%' : '—');
const pfTimeStr = (f) => { const m = Math.floor(f / 3600); return m >= 60 ? Math.floor(m / 60) + '時間' + (m % 60) + '分' : m + '分' + (Math.floor(f / 60) % 60) + '秒'; };
function pfFavChars() {
  return Object.entries(PF().chars).filter(([n]) => CH.some((c) => c.nm === n)).sort((a, b) => b[1].g - a[1].g || b[1].w - a[1].w).slice(0, 3);
}
function pfAchList() {
  const cat = PFU.cat ? PF_CATS[PFU.cat - 1] : null;
  return PF_ACH.filter((a) => (!cat || a.cat === cat) && (PFU.flt === 0 || (PFU.flt === 1) === !!save.ach[a.id]));
}
function pfTitleList() {
  return [null, ...PF_ACH];                        // 先頭は「称号なし」
}
function pfNav(k) {
  if (sc !== 'profile' && sc !== 'achv' && sc !== 'titles') return false;
  const up = k === 'ArrowUp', dn = k === 'ArrowDown', lf = k === 'ArrowLeft', rt = k === 'ArrowRight', ok = k === 'Enter' || k === 'Space', esc = k === 'Escape', h = rt - lf;
  if (sc === 'profile') {
    if (lf || up) PFU.sel = (PFU.sel + PF_MENU.length - 1) % PF_MENU.length;
    if (rt || dn) PFU.sel = (PFU.sel + 1) % PF_MENU.length;
    if (esc || (ok && PFU.sel === 3)) { sc = 'main'; sel = 6; return true; }
    if (ok && PFU.sel === 0) { sc = 'achv'; PFU.top = 0; PFU.asel = 0; }
    if (ok && PFU.sel === 1) { sc = 'titles'; PFU.tsel = Math.max(0, pfTitleList().findIndex((a) => (a ? a.id : null) === (save.title || null))); }
    if (ok && PFU.sel === 2) {
      let n = null;
      try { n = prompt('プレイヤー名(12文字まで)', save.pname || 'PLAYER'); } catch (e) {}
      if (n != null && n.trim()) { save.pname = n.trim().slice(0, 12); sv(); PFU.msg = '名前を変えました'; }
    }
    return true;
  }
  if (sc === 'achv') {
    const L = pfAchList(), n = 2 + L.length;
    if (up) PFU.asel = (PFU.asel + n - 1) % n;
    if (dn) PFU.asel = (PFU.asel + 1) % n;
    if (esc) { sc = 'profile'; return true; }
    if (PFU.asel === 0 && (h || ok)) { PFU.cat = (PFU.cat + (h || 1) + PF_CATS.length + 1) % (PF_CATS.length + 1); PFU.top = 0; }
    if (PFU.asel === 1 && (h || ok)) { PFU.flt = (PFU.flt + (h || 1) + 3) % 3; PFU.top = 0; }
    if (PFU.asel >= 2 && h) { PFU.cat = (PFU.cat + h + PF_CATS.length + 1) % (PF_CATS.length + 1); PFU.top = 0; PFU.asel = 2; }   // 一覧の中でも ←→ で分類を変えられる
    PFU.asel = Math.min(PFU.asel, 1 + pfAchList().length);
    return true;
  }
  if (sc === 'titles') {
    const L = pfTitleList(), n = L.length;
    if (up) PFU.tsel = (PFU.tsel + n - 1) % n;
    if (dn) PFU.tsel = (PFU.tsel + 1) % n;
    if (lf) PFU.tsel = Math.max(0, PFU.tsel - 8);
    if (rt) PFU.tsel = Math.min(n - 1, PFU.tsel + 8);
    if (esc) { sc = 'profile'; return true; }
    if (ok) {
      const a = L[PFU.tsel];
      if (!a) { save.title = null; sv(); PFU.msg = '称号を外しました'; }
      else if (save.ach[a.id]) { save.title = a.id; PF().titleSet = 1; sv(); pfCheck(); PFU.msg = '称号「' + a.title + '」を装備しました'; }
      else PFU.msg = 'まだ獲得していません(実績「' + a.name + '」を解除すると獲得)';
    }
    return true;
  }
  return false;
}
function pfDrawScene() {
  if (sc === 'profile') return pfDrawProfile(), true;
  if (sc === 'achv') return pfDrawAch(), true;
  if (sc === 'titles') return pfDrawTitles(), true;
  return false;
}
function pfPanel(x, y, w, h) {
  g.fillStyle = '#0009';
  g.fillRect(x, y, w, h);
  g.strokeStyle = '#ffffff22';
  g.lineWidth = 1;
  g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}
function pfBar(x, y, w, h, k, col) {
  g.fillStyle = '#333a';
  g.fillRect(x, y, w, h);
  g.fillStyle = col;
  g.fillRect(x, y, w * Math.max(0, Math.min(1, k)), h);
}
function pfDrawProfile() {
  const P = PF(), fav = pfFavChars(), un = pfUnlockedCount();
  dark('プロフィール');
  // プレイヤーカード
  pfPanel(30, 100, 430, 210);
  T(save.pname || 'PLAYER', 50, 142, 30, '#fff', 'left');
  T(pfTitleName() ? '「' + pfTitleName() + '」' : '称号なし', 50, 172, 17, pfTitleName() ? '#fd0' : '#888', 'left');
  T('RP ' + (save.rp | 0) + '(最高 ' + Math.max(P.rpMax, save.rp | 0) + ')   コイン ' + (save.coin | 0), 50, 202, 14, '#9cf', 'left');
  T('実績 ' + un + ' / ' + PF_ACH.length, 50, 236, 14, '#ddd', 'left');
  pfBar(50, 244, 230, 8, un / PF_ACH.length, '#fd0');
  T('称号 ' + un + ' / ' + PF_ACH.length + ' 獲得', 50, 276, 14, '#ddd', 'left');
  const last = (P.last || []).slice(0, 10);
  T('最近の試合', 50, 298, 12, '#aab', 'left');
  last.forEach((r, i) => T(r.w ? '○' : '●', 130 + i * 16, 298, 13, r.w ? '#7f7' : '#f77'));
  if (fav[0]) {                                    // いちばん使っているキャラ
    const ci = CH.findIndex((c) => c.nm === fav[0][0]), p = F(ci, save.sk[ci] || 0, 380, -1);
    g.save();
    g.translate(0, 290 - GY);
    drawF(p);
    g.restore();
  }
  // 戦績
  pfPanel(480, 100, 450, 300);
  T('戦績', 500, 126, 17, '#fd0', 'left');
  const rows = [
    ['総試合数', P.games], ['勝ち / 負け', P.wins + ' / ' + P.losses], ['勝率', pfRate(P.wins, P.games)],
    ['今の連勝', P.streak], ['最高連勝', P.bestStreak], ['総試合時間', pfTimeStr(P.playFrames)],
    ['最大コンボ', P.bestCombo + ' HIT'], ['最大コンボダメージ', P.bestComboDmg], ['与えた / 受けたダメージ', P.dealt + ' / ' + P.taken],
    ['ジャスガ率(累計)', pfRate(P.jg, P.guarded) + '  (' + P.jg + ' / ' + P.guarded + ')'], ['攻撃命中率(累計)', pfRate(P.hits, P.atts)],
    ['パーフェクト勝利', P.perfect], ['いちばん速い勝利', P.fastWin ? (P.fastWin / 60).toFixed(1) + '秒' : '—'],
  ];
  rows.forEach(([a, b], i) => {
    const col = i % 2, r = (i / 2) | 0, x = 500 + col * 215, y = 152 + r * 34;
    T(a, x, y, 11, '#aab', 'left');
    T(String(b), x, y + 18, 16, '#fff', 'left');
  });
  // よく使うキャラ
  pfPanel(30, 320, 430, 120);
  T('よく使うキャラ', 50, 345, 16, '#fd0', 'left');
  if (!fav.length) T('まだ試合をしていません', 50, 380, 14, '#888', 'left');
  fav.forEach(([nm, c], i) => {
    const y = 375 + i * 22;
    T((i + 1) + '. ' + nm, 50, y, 15, '#fff', 'left');
    T(c.g + '試合  ' + c.w + '勝  勝率 ' + pfRate(c.w, c.g), 200, y, 13, '#ccd', 'left');
  });
  // 最近解除した実績
  pfPanel(480, 410, 450, 30);
  const rec = PF_ACH.filter((a) => save.ach[a.id]).sort((a, b) => save.ach[b.id] - save.ach[a.id]).slice(0, 2);
  T(rec.length ? '最近の実績: ' + rec.map((a) => a.name).join(' / ') : '最近の実績: まだありません', 492, 430, 12, '#ddd', 'left');
  // メニュー
  PF_MENU.forEach((s, i) => {
    const on = PFU.sel === i, x = W / 2 + (i - 1.5) * 200;
    if (on) { g.fillStyle = '#fd03'; g.fillRect(x - 90, 458, 180, 32); }
    T(s, x, 481, on ? 18 : 16, on ? '#fd0' : '#ccc');
  });
  T(PFU.msg || '←→ 選択 / Enter 決定 / Esc 戻る', W / 2, 515, 13, PFU.msg ? '#9f9' : '#aaa');
}
function pfDrawAch() {
  const L = pfAchList(), un = pfUnlockedCount();
  dark('実績');
  T('解除 ' + un + ' / ' + PF_ACH.length, W - 40, 40, 15, '#9cf', 'right');
  pfBar(W - 200, 50, 160, 6, un / PF_ACH.length, '#fd0');
  const ctl = ['分類: ◀ ' + (PFU.cat ? PF_CATS[PFU.cat - 1] : 'すべて') + ' ▶', '表示: ◀ ' + ['すべて', '解除済み', '未解除'][PFU.flt] + ' ▶'];
  ctl.forEach((s, i) => { const on = PFU.asel === i; T((on ? '▶ ' : '') + s, 260 + i * 400, 112, on ? 17 : 15, on ? '#fd0' : '#ccc'); });
  const vis = 8, rh = 42, y0 = 140;
  if (PFU.asel >= 2) {
    const i = PFU.asel - 2;
    if (i < PFU.top) PFU.top = i;
    if (i >= PFU.top + vis) PFU.top = i - vis + 1;
  }
  PFU.top = Math.max(0, Math.min(PFU.top, Math.max(0, L.length - vis)));
  if (!L.length) T('この条件の実績はありません', W / 2, 260, 16, '#888');
  L.slice(PFU.top, PFU.top + vis).forEach((a, j) => {
    const i = PFU.top + j, y = y0 + j * rh, on = PFU.asel === i + 2, got = !!save.ach[a.id];
    let v = 0;
    try { v = a.val() || 0; } catch (e) {}
    g.fillStyle = on ? '#fd03' : j % 2 ? '#ffffff08' : '#ffffff10';
    g.fillRect(50, y, W - 100, rh - 4);
    T(got ? '★' : '☆', 72, y + 25, 20, got ? '#fd0' : '#555');
    T(a.name, 96, y + 17, 15, got ? '#fff' : '#bbb', 'left');
    T(a.desc + '   [' + a.cat + ']', 96, y + 33, 11, '#99a', 'left');
    T('称号「' + a.title + '」', 640, y + 17, 12, got ? '#fd9' : '#776', 'left');
    if (got) T('達成 ' + new Date(save.ach[a.id]).toLocaleDateString(), 640, y + 33, 11, '#7c7', 'left');
    else {
      pfBar(640, y + 26, 160, 6, v / a.target, '#59f');
      T(Math.min(v, a.target) + ' / ' + a.target, 810, y + 33, 11, '#aab', 'left');
    }
  });
  if (PFU.top + vis < L.length) T('▼ ほか ' + (L.length - PFU.top - vis) + '件', W / 2, y0 + vis * rh + 6, 12, '#aaa');
  T('↑↓ 選択 / ←→ 分類・表示の切り替え / Esc 戻る', W / 2, 520, 13, '#aaa');
}
function pfDrawTitles() {
  const L = pfTitleList(), un = pfUnlockedCount();
  dark('称号');
  T('獲得 ' + un + ' / ' + PF_ACH.length + '   装備中: ' + (pfTitleName() || 'なし'), W / 2, 112, 16, '#9cf');
  const vis = 10, rh = 32, y0 = 132, top = Math.max(0, Math.min(PFU.tsel - 4, L.length - vis));
  L.slice(top, top + vis).forEach((a, j) => {
    const i = top + j, y = y0 + j * rh, on = PFU.tsel === i, got = !a || !!save.ach[a.id], eq = (a ? a.id : null) === (save.title || null);
    g.fillStyle = on ? '#fd03' : j % 2 ? '#ffffff08' : '#ffffff10';
    g.fillRect(120, y, W - 240, rh - 4);
    T(!a ? '(称号なし)' : got ? '「' + a.title + '」' : '？？？', 150, y + 20, 16, got ? (eq ? '#fd0' : '#fff') : '#666', 'left');
    if (a) T(got ? '実績「' + a.name + '」' : '実績「' + a.name + '」で獲得: ' + a.desc, 420, y + 20, 12, got ? '#aab' : '#776', 'left');
    if (eq) T('装備中', W - 140, y + 20, 13, '#fd0', 'right');
  });
  T(PFU.msg || '↑↓ 選択(←→ で8件ずつ) / Enter 装備 / Esc 戻る', W / 2, 515, 13, PFU.msg ? '#9f9' : '#aaa');
}
// 実績解除の通知(どの画面の上にも出す)。メニューにいる間は1秒ごとに判定もする
function pfOverlay() {
  if (sc !== 'fight' && ++PFU.chk >= 60) { PFU.chk = 0; pfCheck(); }
  if (!PFU.toast.length || sc === 'fight') return;
  const a = PFU.toast[0], t = PFU.tT++, k = Math.min(1, t / 10, (180 - t) / 10);
  g.save();
  g.globalAlpha = Math.max(0, k);
  g.fillStyle = '#1d1826f0';
  g.fillRect(W - 330, 8, 320, 54);
  g.strokeStyle = '#ffd23f';
  g.lineWidth = 3;
  g.strokeRect(W - 330, 8, 320, 54);
  T('実績解除!  ' + a.name + (PFU.toast.length > 1 ? '  (ほか' + (PFU.toast.length - 1) + ')' : ''), W - 318, 30, 14, '#fd0', 'left');
  T('称号「' + a.title + '」を獲得', W - 318, 52, 13, '#fff', 'left');
  g.restore();
  if (t >= 180) { PFU.toast.shift(); PFU.tT = 0; }
}