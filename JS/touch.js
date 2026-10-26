// ============================================================
// touch.js … タップで操作するためのボタン(キーボードの代わり)
//   HTML の script.js の下に <script src="touch.js"></script> を1行足すと使える。
//   いらなくなったら、その1行を消せば完全に元どおり(ほかのファイルは何も変えていない)。
//   画面右上の「タッチ操作」ボタンで、表示する/隠すを切り替えられる(選んだ状態はブラウザに保存)。
//
//   しくみ: ボタンを押すと「キーを押した」ことにして、ゲームにキーの合図を送るだけ。
//     対戦中 … 設定画面のキー配置で、その操作に割り当てたキー(メインのキー)を送る
//     メニュー … 矢印キー / Enter / Esc を送る
// ============================================================
(() => {
  const STORE = 'touchUI';
  let visible = true;
  try {
    visible = localStorage.getItem(STORE) !== 'off';
  } catch (e) {}

  // ---- キーの合図を送る ----
  const inFight = () => typeof sc !== 'undefined' && sc === 'fight';
  const keyOf = (action, menuKey) => {
    if (!inFight() && menuKey) return menuKey; // メニューでは矢印 / Enter / Esc
    try {
      return save.keys[action][0] || menuKey;
    } catch (e) {
      return menuKey;
    }
  };
  const send = (type, code) => code && dispatchEvent(new KeyboardEvent(type, { code, key: code, bubbles: true }));
  const down = (code) => send('keydown', code);
  const up = (code) => send('keyup', code);

  // ---- 見た目 ----
  const css = document.createElement('style');
  css.textContent = `
    .tc-root { position: fixed; inset: 0; pointer-events: none; z-index: 50; font-family: sans-serif;
      -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
    .tc-root * { box-sizing: border-box; }
    .tc-pad, .tc-btn, .tc-toggle { pointer-events: auto; touch-action: none; }
    .tc-pad { position: absolute; left: max(16px, env(safe-area-inset-left)); bottom: max(16px, env(safe-area-inset-bottom));
      width: 180px; height: 180px; border-radius: 50%; background: rgba(255,255,255,.12); border: 2px solid rgba(255,255,255,.35); }
    .tc-pad .tc-arrow { position: absolute; color: rgba(255,255,255,.75); font-size: 26px; font-weight: bold; }
    .tc-knob { position: absolute; left: 50%; top: 50%; width: 64px; height: 64px; margin: -32px 0 0 -32px; border-radius: 50%;
      background: rgba(255,255,255,.35); border: 2px solid rgba(255,255,255,.6); transition: transform .05s; }
    .tc-btns { position: absolute; right: max(16px, env(safe-area-inset-right)); bottom: max(16px, env(safe-area-inset-bottom));
      display: grid; grid-template-columns: repeat(3, 72px); gap: 10px; }
    .tc-btn { width: 72px; height: 72px; border-radius: 50%; border: 2px solid rgba(255,255,255,.55); color: #fff;
      font-size: 15px; font-weight: bold; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;
      line-height: 1.1; text-shadow: 0 1px 2px #000; }
    .tc-btn.on { filter: brightness(1.6); transform: scale(.94); }
    .tc-menu { position: absolute; right: max(16px, env(safe-area-inset-right)); bottom: calc(max(16px, env(safe-area-inset-bottom)) + 250px);
      display: flex; gap: 10px; }
    .tc-menu .tc-btn { width: 64px; height: 44px; border-radius: 10px; font-size: 14px; background: rgba(40,40,60,.6); }
    .tc-toggle { position: fixed; right: max(10px, env(safe-area-inset-right)); top: max(10px, env(safe-area-inset-top)); z-index: 51;
      padding: 8px 12px; border-radius: 10px; border: 2px solid rgba(255,255,255,.5); background: rgba(0,0,0,.5); color: #fff;
      font-size: 14px; font-weight: bold; }
  `;
  document.head.appendChild(css);

  const root = document.createElement('div');
  root.className = 'tc-root';
  document.body.appendChild(root);

  // ---- 方向パッド(指をすべらせると斜めも入る。コマンド技も出せる) ----
  const pad = document.createElement('div');
  pad.className = 'tc-pad';
  pad.innerHTML =
    '<span class="tc-arrow" style="left:50%;top:6px;transform:translateX(-50%)">▲</span>' +
    '<span class="tc-arrow" style="left:50%;bottom:6px;transform:translateX(-50%)">▼</span>' +
    '<span class="tc-arrow" style="left:8px;top:50%;transform:translateY(-50%)">◀</span>' +
    '<span class="tc-arrow" style="right:8px;top:50%;transform:translateY(-50%)">▶</span>' +
    '<div class="tc-knob"></div>';
  root.appendChild(pad);
  const knob = pad.querySelector('.tc-knob');
  const DIRS = [
    ['left', 'ArrowLeft'],
    ['right', 'ArrowRight'],
    ['up', 'ArrowUp'],
    ['down', 'ArrowDown'],
  ];
  const held = {}; // 方向ごとに今送っているキー
  let padId = null;
  function setDirs(dx, dy) {
    // 中心から少し離れたら入力。斜めは 2方向を同時に押す
    const dead = 22,
      want = { left: dx < -dead, right: dx > dead, up: dy < -dead * 1.2, down: dy > dead };
    for (const [a, menuKey] of DIRS) {
      if (want[a] && !held[a]) {
        held[a] = keyOf(a, menuKey);
        down(held[a]);
      } else if (!want[a] && held[a]) {
        up(held[a]);
        held[a] = null;
      }
    }
    const len = Math.hypot(dx, dy) || 1, k = Math.min(1, 58 / len);
    knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
  }
  const padMove = (e) => {
    const r = pad.getBoundingClientRect();
    setDirs(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
  };
  pad.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    padId = e.pointerId;
    pad.setPointerCapture(e.pointerId);
    padMove(e);
  });
  pad.addEventListener('pointermove', (e) => e.pointerId === padId && padMove(e));
  const padEnd = (e) => {
    if (e.pointerId !== padId) return;
    padId = null;
    setDirs(0, 0);
  };
  pad.addEventListener('pointerup', padEnd);
  pad.addEventListener('pointercancel', padEnd);

  // ---- ボタン ----
  function button(parent, label, color, action, menuKey) {
    const b = document.createElement('div');
    b.className = 'tc-btn';
    b.innerHTML = label;
    if (color) b.style.background = color;
    let code = null;
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      b.setPointerCapture(e.pointerId);
      code = action ? keyOf(action, menuKey) : menuKey;
      b.classList.add('on');
      down(code);
    });
    const end = () => {
      if (!code) return;
      up(code);
      code = null;
      b.classList.remove('on');
    };
    b.addEventListener('pointerup', end);
    b.addEventListener('pointercancel', end);
    parent.appendChild(b);
    return b;
  }
  const btns = document.createElement('div');
  btns.className = 'tc-btns';
  root.appendChild(btns);
  // 並び(3列): 上の段 シールド / 投げ / ジャンプ、下の段 必殺 / 攻撃 (メニューでは 攻撃=決定)
  button(btns, 'シールド', 'rgba(60,140,220,.55)', 'shield');
  button(btns, '投げ', 'rgba(220,150,40,.55)', 'throw');
  button(btns, 'ジャンプ', 'rgba(80,180,90,.55)', 'jump');
  btns.appendChild(document.createElement('div'));
  button(btns, '必殺', 'rgba(170,70,200,.6)', 'special');
  button(btns, '攻撃<small style="font-size:11px;opacity:.8">(決定)</small>', 'rgba(220,60,60,.6)', 'attack', 'Enter');

  // メニュー用(決定 / 戻る)
  const menu = document.createElement('div');
  menu.className = 'tc-menu';
  root.appendChild(menu);
  button(menu, '決定', null, null, 'Enter');
  button(menu, '戻る', null, null, 'Escape');

  // ---- 表示 / 隠す ----
  const toggle = document.createElement('div');
  toggle.className = 'tc-toggle';
  document.body.appendChild(toggle);
  function apply() {
    root.style.display = visible ? '' : 'none';
    toggle.textContent = visible ? 'タッチ操作を隠す' : 'タッチ操作';
    if (!visible) {
      setDirs(0, 0); // 押しっぱなしを残さない
    }
    try {
      localStorage.setItem(STORE, visible ? 'on' : 'off');
    } catch (e) {}
  }
  toggle.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    visible = !visible;
    apply();
  });
  apply();

  // iPad で画面をダブルタップしたときの拡大や、長押しのメニューを止める
  document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('contextmenu', (e) => e.target.closest && e.target.closest('.tc-root, .tc-toggle') && e.preventDefault());
  // タイトル画面は Space で始まるので、タッチでは画面のタップでも始められるようにする
  document.addEventListener('pointerdown', (e) => {
    if (typeof sc !== 'undefined' && sc === 'title' && !(e.target.closest && e.target.closest('.tc-root, .tc-toggle'))) {
      down('Space');
      setTimeout(() => up('Space'), 50);
    }
  });
})();
