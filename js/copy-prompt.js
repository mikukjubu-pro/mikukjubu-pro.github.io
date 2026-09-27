/* 프롬프트 복사 버튼: <button data-copy="요소id" data-done="완료 문구"> */
document.addEventListener('click', function (e) {
  var b = e.target.closest('[data-copy]');
  if (!b) return;
  var el = document.getElementById(b.getAttribute('data-copy'));
  if (!el) return;
  var text = el.innerText, label = b.textContent;
  function done() { b.textContent = b.getAttribute('data-done') || 'Copied'; setTimeout(function () { b.textContent = label; }, 1800); }
  if (navigator.clipboard) { navigator.clipboard.writeText(text).then(done, fallback); } else { fallback(); }
  function fallback() {
    var t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0';
    document.body.appendChild(t); t.select(); try { document.execCommand('copy'); done(); } catch (x) {} t.remove();
  }
});
