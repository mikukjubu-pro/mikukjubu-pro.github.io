/* 휴대폰 터치 버튼 — 미국주부가 나중에 붙인 공용 스크립트 (AI가 만든 게임 코드는 그대로 둔다).
   화면 버튼을 누르면 게임이 원래 듣는 키보드 이벤트(e.code)를 window 로 보낸다.
   터치 기기(pointer: coarse)에서만 보이고, 데스크톱 화면은 바뀌지 않는다.
   사용: <script src="/games/touch-controls.js" data-keys="Space:JUMP,ShiftLeft:DASH,KeyP:II"></script> */
(function () {
  if (!matchMedia('(pointer: coarse)').matches) return;
  var me = document.currentScript;
  var btns = ((me && me.dataset.keys) || 'Space:JUMP').split(',').map(function (s) { var p = s.split(':'); return { code: p[0], label: p[1] || p[0] }; });
  var keyName = { Space: ' ', ShiftLeft: 'Shift', KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd', KeyP: 'p', Escape: 'Escape', Enter: 'Enter' };
  var down = {};
  function send(code, on) {
    if (!!down[code] === on) return;
    down[code] = on;
    window.dispatchEvent(new KeyboardEvent(on ? 'keydown' : 'keyup', { code: code, key: keyName[code] || code, bubbles: true, cancelable: true }));
  }

  var css = document.createElement('style');
  css.textContent =
    'canvas{touch-action:none}' +
    '.mk-tc{position:fixed;z-index:2147483000;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}' +
    '.mk-tc-joy{left:max(18px,env(safe-area-inset-left));bottom:max(22px,env(safe-area-inset-bottom));width:128px;height:128px;border-radius:50%;background:rgba(255,255,255,.18);border:3px solid rgba(255,255,255,.55)}' +
    '.mk-tc-knob{position:absolute;left:39px;top:39px;width:50px;height:50px;border-radius:50%;background:rgba(255,255,255,.75);pointer-events:none}' +
    '.mk-tc-pad{right:max(16px,env(safe-area-inset-right));bottom:max(22px,env(safe-area-inset-bottom));display:flex;flex-direction:column-reverse;align-items:flex-end;gap:12px}' +
    '.mk-tc-b{width:72px;height:72px;border-radius:50%;background:rgba(255,255,255,.22);border:3px solid rgba(255,255,255,.6);color:#fff;font:800 13px/1 system-ui,sans-serif;display:flex;align-items:center;justify-content:center;text-shadow:0 1px 2px rgba(0,0,0,.6)}' +
    '.mk-tc-b.on{background:rgba(255,255,255,.55)}' +
    '.mk-tc-b.sm{width:52px;height:52px;font-size:12px}';
  document.head.appendChild(css);

  /* 왼쪽 아래 조이스틱 → W·A·S·D (8방향) */
  var joy = document.createElement('div'); joy.className = 'mk-tc mk-tc-joy';
  var knob = document.createElement('div'); knob.className = 'mk-tc-knob'; joy.appendChild(knob);
  var jid = null;
  function move(e) {
    var r = joy.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    var d = Math.hypot(dx, dy), max = r.width / 2 - 14;
    if (d > max) { dx = dx / d * max; dy = dy / d * max; }
    knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    var t = max * 0.35;
    send('KeyW', dy < -t); send('KeyS', dy > t); send('KeyA', dx < -t); send('KeyD', dx > t);
  }
  function stop() { jid = null; knob.style.transform = ''; ['KeyW', 'KeyA', 'KeyS', 'KeyD'].forEach(function (c) { send(c, false); }); }
  joy.addEventListener('pointerdown', function (e) { e.preventDefault(); jid = e.pointerId; joy.setPointerCapture(jid); move(e); });
  joy.addEventListener('pointermove', function (e) { if (e.pointerId === jid) move(e); });
  joy.addEventListener('pointerup', function (e) { if (e.pointerId === jid) stop(); });
  joy.addEventListener('pointercancel', stop);

  /* 오른쪽 아래 버튼 → 각 게임이 쓰는 키 */
  var pad = document.createElement('div'); pad.className = 'mk-tc mk-tc-pad';
  btns.forEach(function (b, i) {
    var el = document.createElement('div'); el.className = 'mk-tc-b' + (i > 1 ? ' sm' : ''); el.textContent = b.label;
    el.addEventListener('pointerdown', function (e) { e.preventDefault(); el.setPointerCapture(e.pointerId); el.classList.add('on'); send(b.code, true); });
    var up = function () { el.classList.remove('on'); send(b.code, false); };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    pad.appendChild(el);
  });

  /* 시작 화면 버튼(PLAY)을 가리지 않게, 게임 안 버튼(PLAY)을 누른 뒤에 나타난다 */
  function mount() {
    document.addEventListener('click', function show(e) {
      if (!e.target.closest || !e.target.closest('button')) return;
      document.removeEventListener('click', show, true);
      setTimeout(function () { document.body.appendChild(joy); document.body.appendChild(pad); }, 300);
    }, true);
  }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
  window.addEventListener('blur', stop);
})();
