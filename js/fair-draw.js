/* 공정한 추첨기 — 명단 정리 · 보안 난수 · 명단 지문 · 화면
   난수 코드 = rand32 · randInt · Fisher–Yates. Math.random 은 쓰지 않는다.
   순수 함수는 node 에서 require 해 검사할 수 있다 (파일 끝 module.exports). */
(function (root) {
  'use strict';

  var cryptoObj = root.crypto;
  var MAX_RANGE = 1000000;

  /* ───── 명단 정리 ───── */
  function clean(s) { return String(s).replace(/\s+/g, ' ').trim(); }
  function keyOf(s) { return clean(s).toLowerCase(); }

  /* 줄바꿈 · 쉼표 · 탭으로 나누고 빈 칸은 버린다 */
  function splitEntries(text) {
    var parts = String(text || '').split(/[\r\n,\t]+/), out = [], i, c;
    for (i = 0; i < parts.length; i++) { c = clean(parts[i]); if (c) out.push(c); }
    return out;
  }

  /* 댓글을 통째로 붙여 넣었을 때 @아이디만 골라낸다 (끝에 붙은 . - 는 문장부호로 보고 뗀다) */
  function extractHandles(text) {
    var m = String(text || '').match(/@[\w.\-가-힣]+/g) || [], out = [], i, h;
    for (i = 0; i < m.length; i++) { h = m[i].replace(/[.\-]+$/, ''); if (h.length > 1) out.push(h); }
    return out;
  }

  /* 입력 → 최종 명단. dedupe = 대소문자 무시 중복 제거, excludeText = 빼는 명단 */
  function buildList(text, dedupe, excludeText) {
    var raw = splitEntries(text), exArr = splitEntries(excludeText), ex = new Map(), seen = new Map();
    var entries = [], dupes = 0, excluded = 0, i, k;
    for (i = 0; i < exArr.length; i++) ex.set(keyOf(exArr[i]), true);
    for (i = 0; i < raw.length; i++) {
      k = keyOf(raw[i]);
      if (dedupe) { if (seen.has(k)) { dupes++; continue; } seen.set(k, true); }
      if (ex.has(k)) { excluded++; continue; }
      entries.push(raw[i]);
    }
    return { entries: entries, raw: raw.length, dupes: dupes, excluded: excluded };
  }

  /* ───── 번호 범위 · 인원 검사 ───── */
  var INT = /^\s*\d+\s*$/;
  function parseRange(a, b) {
    if (!INT.test(a) || !INT.test(b)) return { ok: false, error: '시작 번호와 끝 번호는 0 이상의 정수만 넣을 수 있어요.' };
    var s = parseInt(a, 10), e = parseInt(b, 10);
    if (s > e) return { ok: false, error: '시작 번호가 끝 번호보다 클 수 없어요.' };
    if (e - s + 1 > MAX_RANGE) return { ok: false, error: '번호 범위는 최대 1,000,000개까지예요.' };
    return { ok: true, start: s, end: e, n: e - s + 1 };
  }
  function validateCounts(n, winners, backups, unit) {
    unit = unit || '명';
    if (!INT.test(winners) || !INT.test(backups)) return { ok: false, error: '당첨자 수와 예비 당첨자 수는 0 이상의 정수만 넣을 수 있어요.' };
    var w = parseInt(winners, 10), b = parseInt(backups, 10);
    if (n < 1) return { ok: false, error: unit === '명' ? '참가자가 없어요. 명단을 먼저 넣어 주세요.' : '번호 범위를 먼저 넣어 주세요.' };
    if (w < 1) return { ok: false, error: '당첨자는 1' + unit + ' 이상이어야 해요.' };
    if (w + b > n) return { ok: false, error: '참가자 ' + n.toLocaleString() + unit + '인데 ' + (w + b).toLocaleString() + unit + '을 뽑을 수 없어요.' };
    return { ok: true, winners: w, backups: b };
  }

  /* ───── 보안 난수 ───── */
  // crypto.getRandomValues 를 2,048개씩 받아 두고, 거부 샘플링으로 나머지 치우침을 없앤다
  var POOL = new Uint32Array(2048), poolI = POOL.length;
  function rand32() { if (poolI >= POOL.length) { cryptoObj.getRandomValues(POOL); poolI = 0; } return POOL[poolI++]; }
  function randInt(n) { var lim = Math.floor(0x100000000 / n) * n, x; do { x = rand32(); } while (x >= lim); return x % n; }

  /* n개 중 k개를 중복 없이 뽑힌 순서대로 — 부분 Fisher–Yates.
     배열을 만들지 않고 교환 결과만 Map 에 적어 두므로 n 이 100만이라도 빠르다. k = n 이면 전체 순열. */
  function pickIndices(n, k) {
    var m = new Map(), out = [], i, j, vi, vj;
    for (i = 0; i < k; i++) {
      j = i + randInt(n - i);
      vi = m.has(i) ? m.get(i) : i;
      vj = m.has(j) ? m.get(j) : j;
      out.push(vj);
      m.set(j, vi);
    }
    return out;
  }

  /* ───── 명단 지문 (SHA-256) ───── */
  function listFingerprintText(entries) { return entries.join('\n'); }
  function rangeFingerprintText(s, e) { return 'range:' + s + '-' + e; }
  function sha256Hex(str) {
    var data = new TextEncoder().encode(str);
    return cryptoObj.subtle.digest('SHA-256', data).then(function (buf) {
      var a = new Uint8Array(buf), s = '', i;
      for (i = 0; i < a.length; i++) s += (a[i] < 16 ? '0' : '') + a[i].toString(16);
      return s;
    });
  }
  function sameHash(a, b) { return String(a).trim().toLowerCase() === String(b).trim().toLowerCase(); }
  /* 지문 확인 칸에 "1-100" 처럼 넣으면 번호 모드 지문으로 본다 */
  function parseRangeShorthand(text) {
    var m = String(text || '').match(/^\s*(\d+)\s*[-~]\s*(\d+)\s*$/);
    return m ? { start: parseInt(m[1], 10), end: parseInt(m[2], 10) } : null;
  }

  /* ───── 추첨 기록 ───── */
  function formatTimes(d) {
    var tz = '', p = function (n) { return (n < 10 ? '0' : '') + n; };
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { /* 구형 브라우저 */ }
    var label = tz === 'America/New_York' ? '미국 동부' : tz;
    var hm = new Intl.DateTimeFormat('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: true }).format(d);
    return {
      local: d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + hm + (label ? ' (' + label + ')' : ''),
      utc: d.toISOString().replace(/\.\d{3}Z$/, 'Z')
    };
  }
  function numbered(arr) { return arr.map(function (w, i) { return (i + 1) + ') ' + w; }).join('  '); }
  /* o: { date, mode:'list'|'range', n, dupes, excluded, start, end, hash, winners[], backups[] } */
  function buildRecord(o) {
    var t = formatTimes(o.date), lines = [], ex = [];
    lines.push('미국주부 공정한 추첨기 · 추첨 기록');
    lines.push('추첨 시각: ' + t.local + ' / ' + t.utc);
    if (o.mode === 'range') lines.push('참가자: ' + o.start + '~' + o.end + '번 (' + o.n.toLocaleString() + '개)');
    else {
      if (o.dupes) ex.push('중복 ' + o.dupes + '명');
      if (o.excluded) ex.push('제외 ' + o.excluded + '명');
      lines.push('참가자: ' + o.n.toLocaleString() + '명' + (ex.length ? ' (' + ex.join(' · ') + ' 뺀 뒤)' : ''));
    }
    lines.push('명단 지문(SHA-256): ' + o.hash);
    lines.push('당첨자: ' + numbered(o.winners));
    if (o.backups.length) lines.push('예비: ' + numbered(o.backups));
    lines.push('난수: 브라우저 보안용 난수(crypto.getRandomValues)');
    return lines.join('\n');
  }

  /* ───── 공정성 시험 — 1등만 반복해서 뽑아 참가자마다 비율을 본다 ───── */
  function fairnessPlan(n) { return Math.min(200000, 2000 * n); }
  /* counts[i] = i번 참가자가 1등이 된 횟수. n > 1000 이면 구간 10개로 묶는다 */
  function fairnessSummary(counts, total) {
    var n = counts.length, grouped = n > 1000, arr = [], i, b;
    if (grouped) { for (i = 0; i < 10; i++) arr.push(0); for (i = 0; i < n; i++) arr[Math.floor(i * 10 / n)] += counts[i]; }
    else for (i = 0; i < n; i++) arr.push(counts[i]);
    var mn = Infinity, mx = -Infinity;
    for (i = 0; i < arr.length; i++) { b = 100 * arr[i] / total; if (b < mn) mn = b; if (b > mx) mx = b; }
    return { grouped: grouped, min: mn, max: mx, theory: 100 / (grouped ? 10 : n) };
  }
  /* 6,000번씩 끊어 돌려 화면이 멈추지 않게 한다. 돌아오는 함수를 부르면 중단 */
  function runFairness(n, onTick, onDone) {
    var total = fairnessPlan(n), counts = new Uint32Array(n), done = 0, stopped = false;
    (function chunk() {
      if (stopped) return;
      var end = Math.min(total, done + 6000);
      for (; done < end; done++) counts[randInt(n)]++;
      onTick(done, total);
      if (done < total) return setTimeout(chunk, 0);
      onDone(fairnessSummary(counts, total), total);
    })();
    return function () { stopped = true; };
  }

  var api = {
    clean: clean, keyOf: keyOf, splitEntries: splitEntries, extractHandles: extractHandles, buildList: buildList,
    parseRange: parseRange, validateCounts: validateCounts, MAX_RANGE: MAX_RANGE,
    rand32: rand32, randInt: randInt, pickIndices: pickIndices,
    listFingerprintText: listFingerprintText, rangeFingerprintText: rangeFingerprintText, sha256Hex: sha256Hex,
    sameHash: sameHash, parseRangeShorthand: parseRangeShorthand,
    formatTimes: formatTimes, buildRecord: buildRecord,
    fairnessPlan: fairnessPlan, fairnessSummary: fairnessSummary, runFairness: runFairness
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  root.MKDraw = api;

  /* ═════════ 화면 ═════════ */
  var doc = root.document;
  function $(id) { return doc.getElementById(id); }
  function el(tag, cls, text) { var e = doc.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  var reduced = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var mode = 'list';            // 'list' | 'range'
  var list = { entries: [], raw: 0, dupes: 0, excluded: 0 };
  var fp = null;                // { text, hash } 마지막으로 만든 지문
  var result = null;            // 마지막 추첨
  var revealTimer = null, againTimer = null, fairStop = null;

  function copyText(str, btn) {
    var done = function () { var old = btn.getAttribute('data-label') || btn.textContent; btn.setAttribute('data-label', old); btn.textContent = '복사됐어요 ✓'; setTimeout(function () { btn.textContent = old; }, 1600); };
    if (root.navigator.clipboard && root.navigator.clipboard.writeText) root.navigator.clipboard.writeText(str).then(done, function () { fallback(); });
    else fallback();
    function fallback() { var t = el('textarea'); t.value = str; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0'; doc.body.appendChild(t); t.select(); try { doc.execCommand('copy'); done(); } catch (e) { /* 수동 복사 */ } doc.body.removeChild(t); }
  }

  /* ─ 탭 ─ */
  function setMode(m) {
    mode = m;
    ['list', 'range'].forEach(function (k) {
      var on = k === m, tab = $('fdTab-' + k), panel = $('fdPanel-' + k);
      tab.classList.toggle('is-on', on); tab.setAttribute('aria-selected', on ? 'true' : 'false'); tab.tabIndex = on ? 0 : -1;
      panel.hidden = !on;
    });
    refresh();
  }

  /* ─ 참가자 수 · 버튼 상태 ─ */
  function participants() {
    if (mode === 'range') { var r = parseRange($('fdStart').value, $('fdEnd').value); return r.ok ? { n: r.n, range: r } : { n: 0, error: r.error }; }
    return { n: list.entries.length };
  }
  function refresh() {
    list = buildList($('fdNames').value, $('fdDedupe').checked, $('fdExclude').value);
    var c = $('fdCount'), s;
    if (mode === 'list') {
      s = '참가자 ' + list.entries.length.toLocaleString() + '명';
      if ($('fdDedupe').checked && list.dupes) s += ' · 중복 ' + list.dupes.toLocaleString() + '명 제외';
      if (list.excluded) s += ' · 제외 명단 ' + list.excluded.toLocaleString() + '명 뺌';
      c.textContent = s;
    } else {
      var r = parseRange($('fdStart').value, $('fdEnd').value);
      c.textContent = r.ok ? '번호 ' + r.n.toLocaleString() + '개 (' + r.start + '~' + r.end + ')' : '번호 범위를 확인해 주세요';
    }
    // 지문이 있는데 명단이 바뀌었으면 흐리게
    if (fp) $('fdFp').classList.toggle('is-stale', fp.text !== currentFingerprintText());
    var p = participants(), v = p.error ? { ok: false, error: p.error } : validateCounts(p.n, $('fdWinners').value, $('fdBackups').value, mode === 'range' ? '개' : '명');
    $('fdDraw').disabled = !v.ok;
    $('fdErr').textContent = v.ok ? '' : v.error;
    $('fdFpBtn').disabled = $('fdListCopy').disabled = p.n < 1;
    $('fdFairRun').disabled = p.n < 2;
    $('fdFairN').textContent = p.n >= 2 ? '지금 참가자 ' + p.n.toLocaleString() + (mode === 'range' ? '개로 1등만 ' : '명으로 1등만 ') + fairnessPlan(p.n).toLocaleString() + '번 뽑아 봅니다.' : '참가자를 2명 이상 넣으면 돌릴 수 있어요.';
  }
  function currentFingerprintText() {
    if (mode === 'range') { var r = parseRange($('fdStart').value, $('fdEnd').value); return r.ok ? rangeFingerprintText(r.start, r.end) : ''; }
    return listFingerprintText(list.entries);
  }

  /* ─ @아이디만 골라내기 ─ */
  function onExtract() {
    var before = splitEntries($('fdNames').value).length, handles = extractHandles($('fdNames').value), msg = $('fdExtractMsg');
    if (!handles.length) { msg.textContent = '@로 시작하는 아이디를 찾지 못했어요. 댓글을 그대로 붙여 넣었는지 확인해 주세요.'; return; }
    $('fdNames').value = handles.join('\n');
    msg.textContent = '줄 ' + before.toLocaleString() + '개 → @아이디 ' + handles.length.toLocaleString() + '개로 바꿨어요.';
    refresh();
  }

  /* ─ 지문 ─ */
  function onFingerprint() {
    var text = currentFingerprintText(); if (!text) return;
    $('fdFpBtn').disabled = true;
    sha256Hex(text).then(function (h) {
      fp = { text: text, hash: h };
      $('fdFpShort').textContent = h.slice(0, 16);
      $('fdFpFull').textContent = h;
      $('fdFp').hidden = false; $('fdFp').classList.remove('is-stale');
      $('fdFpBtn').disabled = false;
    }, function () { $('fdFpBtn').disabled = false; $('fdErr').textContent = '이 브라우저에서는 지문을 만들 수 없어요(HTTPS 가 아니거나 오래된 브라우저).'; });
  }

  /* ─ 추첨 ─ */
  function onDraw() {
    var p = participants(), v = validateCounts(p.n, $('fdWinners').value, $('fdBackups').value, mode === 'range' ? '개' : '명');
    if (!v.ok) { $('fdErr').textContent = v.error; return; }
    var snap = mode === 'range' ? { mode: 'range', start: p.range.start, end: p.range.end, n: p.n } : { mode: 'list', entries: list.entries.slice(), n: p.n, dupes: list.dupes, excluded: list.excluded };
    var text = snap.mode === 'range' ? rangeFingerprintText(snap.start, snap.end) : listFingerprintText(snap.entries);
    $('fdDraw').disabled = true;
    sha256Hex(text).then(function (hash) {
      var idx = pickIndices(snap.n, v.winners + v.backups);
      var names = idx.map(function (i) { return snap.mode === 'range' ? String(snap.start + i) : snap.entries[i]; });
      result = { date: new Date(), mode: snap.mode, n: snap.n, dupes: snap.dupes || 0, excluded: snap.excluded || 0, start: snap.start, end: snap.end, hash: hash, winners: names.slice(0, v.winners), backups: names.slice(v.winners) };
      showResult();
      $('fdDraw').disabled = false;
    }, function () { $('fdDraw').disabled = false; $('fdErr').textContent = '이 브라우저에서는 추첨할 수 없어요(HTTPS 가 아니거나 오래된 브라우저).'; });
  }

  function showResult() {
    clearTimeout(revealTimer); disarmAgain();
    var res = $('fdRes'), wins = $('fdWins'), i;
    wins.textContent = ''; $('fdBacks').textContent = ''; $('fdBackWrap').hidden = true; $('fdRecWrap').hidden = true;
    res.hidden = false; $('fdEmpty').hidden = true;
    $('fdResHead').textContent = result.mode === 'range' ? '번호 ' + result.n.toLocaleString() + '개 중에서 뽑았어요' : '참가자 ' + result.n.toLocaleString() + '명 중에서 뽑았어요';
    $('fdShowAll').hidden = reduced || result.winners.length < 2;
    var k = 0;
    function card(i) {
      var c = el('div', 'fd-win' + (reduced ? '' : ' fd-pop'));
      c.appendChild(el('span', 'fd-rank', (i + 1) + '등'));
      c.appendChild(el('strong', 'fd-name', result.winners[i]));
      wins.appendChild(c);
    }
    function finish() {
      $('fdShowAll').hidden = true;
      if (result.backups.length) {
        for (i = 0; i < result.backups.length; i++) { var b = el('li'); b.appendChild(el('span', 'fd-rank', '예비 ' + (i + 1))); b.appendChild(el('span', 'fd-bname', result.backups[i])); $('fdBacks').appendChild(b); }
        $('fdBackWrap').hidden = false;
      }
      $('fdRecord').value = buildRecord(result);
      $('fdRecWrap').hidden = false;
    }
    function step() { card(k++); if (k < result.winners.length) revealTimer = setTimeout(step, 1100); else finish(); }
    if (reduced) { for (i = 0; i < result.winners.length; i++) card(i); finish(); } else step();
    $('fdShowAll').onclick = function () { clearTimeout(revealTimer); for (; k < result.winners.length; k++) card(k); finish(); };
    res.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }

  /* ─ 다시 뽑기: 두 번 눌러야 한다 (confirm() 안 씀) ─ */
  function disarmAgain() { clearTimeout(againTimer); $('fdAgain').classList.remove('is-armed'); $('fdAgain').textContent = '다시 뽑기'; $('fdAgainNote').textContent = ''; }
  function onAgain() {
    var b = $('fdAgain');
    if (!b.classList.contains('is-armed')) {
      b.classList.add('is-armed'); b.textContent = '정말 다시 뽑기';
      $('fdAgainNote').textContent = '다시 뽑으면 이 결과는 사라져요. 기록을 복사해 두셨나요? 한 번 더 누르면 새로 뽑아요.';
      againTimer = setTimeout(disarmAgain, 6000);
      return;
    }
    disarmAgain(); onDraw();
  }

  /* ─ 공정성 시험 ─ */
  function onFair() {
    var p = participants(); if (p.n < 2) return;
    if (fairStop) fairStop();
    var btn = $('fdFairRun'), out = $('fdFairOut'), unit = mode === 'range' ? '개' : '명';
    btn.disabled = true;
    fairStop = runFairness(p.n, function (done, total) { out.textContent = done.toLocaleString() + ' / ' + total.toLocaleString() + '번…'; }, function (s, total) {
      var f = function (x) { return x.toFixed(s.grouped ? 2 : 3) + '%'; };
      out.textContent = total.toLocaleString() + '번 뽑은 결과 — ' + (s.grouped ? '참가자를 구간 10개로 묶었을 때 1등 비율' : '참가자마다 1등이 된 비율') + ' 최저 ' + f(s.min) + ' · 최고 ' + f(s.max) + ' (이론값 ' + f(s.theory) + '). ' + (s.grouped ? '' : '참가자 ' + p.n.toLocaleString() + unit + ' 모두 비슷한 비율이면 공정한 거예요.');
      btn.disabled = false; fairStop = null;
    });
  }

  /* ─ 지문 확인 ─ */
  function onVerify() {
    var text = $('fdVList').value, hash = $('fdVHash').value.trim(), out = $('fdVOut'), r = parseRangeShorthand(text), src;
    out.className = 'fd-vout';
    if (!text.trim() || !hash) { out.textContent = '명단(또는 번호 범위)과 지문을 둘 다 넣어 주세요.'; return; }
    if (!/^[0-9a-f]{64}$/i.test(hash)) { out.textContent = '지문은 64자리 16진수(0-9, a-f)여야 해요. 전체 지문을 붙여 넣어 주세요.'; return; }
    src = r ? rangeFingerprintText(r.start, r.end) : listFingerprintText(buildList(text, $('fdVDedupe').checked, '').entries);
    sha256Hex(src).then(function (h) {
      var ok = sameHash(h, hash);
      out.className = 'fd-vout ' + (ok ? 'is-ok' : 'is-no');
      out.textContent = ok ? '일치 ✓ 이 명단으로 만든 지문이 맞아요. 추첨 뒤 명단이 바뀌지 않았어요.' : '불일치 ✗ 이 명단의 지문은 ' + h.slice(0, 16) + '… 예요. 명단 순서·철자·중복 제거 설정이 추첨 때와 같은지 확인해 주세요.';
    });
  }

  function init() {
    if (!$('fdNames')) return;
    if (!cryptoObj || !cryptoObj.getRandomValues || !cryptoObj.subtle) {
      $('fdErr').textContent = '이 브라우저는 보안 난수를 지원하지 않아 추첨할 수 없어요. 최신 크롬·사파리·엣지에서 열어 주세요.';
      $('fdDraw').disabled = true; return;
    }
    $('fdTab-list').addEventListener('click', function () { setMode('list'); });
    $('fdTab-range').addEventListener('click', function () { setMode('range'); });
    $('fdTabs').addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { setMode(mode === 'list' ? 'range' : 'list'); $('fdTab-' + mode).focus(); } });
    $('fdForm').addEventListener('input', refresh);
    $('fdForm').addEventListener('change', refresh);
    $('fdForm').addEventListener('submit', function (e) { e.preventDefault(); });
    $('fdExtract').addEventListener('click', onExtract);
    $('fdFpBtn').addEventListener('click', onFingerprint);
    $('fdFpCopy').addEventListener('click', function () { if (fp) copyText(fp.hash, this); });
    $('fdListCopy').addEventListener('click', function () { copyText(currentFingerprintText(), this); });
    $('fdDraw').addEventListener('click', onDraw);
    $('fdRecCopy').addEventListener('click', function () { copyText($('fdRecord').value, this); });
    $('fdAgain').addEventListener('click', onAgain);
    $('fdFairRun').addEventListener('click', onFair);
    $('fdVBtn').addEventListener('click', onVerify);
    setMode('list');
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init); else init();
})(typeof globalThis !== 'undefined' ? globalThis : this);
