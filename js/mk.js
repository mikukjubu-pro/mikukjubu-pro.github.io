/* 미국주부 공통 스크립트 — 모바일 메뉴 · 탭 · 등장 애니메이션 (2026-09-07) */
(function () {
  'use strict';

  /* 모바일 메뉴 */
  var burger = document.getElementById('mkBurger');
  var menu = document.getElementById('mkMenu');
  if (burger && menu) {
    burger.addEventListener('click', function () {
      var open = menu.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        menu.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* 도구 탭 */
  var tabs = document.querySelectorAll('.tab[data-tab]');
  if (tabs.length) {
    tabs.forEach(function (btn) {
      btn.addEventListener('click', function () {
        tabs.forEach(function (b) { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
        document.querySelectorAll('.tab-panel').forEach(function (p) { p.classList.remove('active'); });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        var panel = document.getElementById(btn.dataset.tab);
        if (panel) panel.classList.add('active');
      });
    });
    /* /tools/#seller 처럼 해시로 들어오면 해당 탭을 연다 */
    if (location.hash) {
      var target = document.querySelector('.tab[data-tab="' + location.hash.slice(1) + '"]');
      if (target) target.click();
    }
  }

  /* 등장 애니메이션 — 관측이 안 되면 1.6초 뒤 전부 보이게 한다 */
  var rv = document.querySelectorAll('.reveal');
  if (!rv.length) return;
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -8% 0px' });
    rv.forEach(function (el) { io.observe(el); });
    setTimeout(function () { rv.forEach(function (el) { el.classList.add('in'); }); }, 1600);
  } else {
    rv.forEach(function (el) { el.classList.add('in'); });
  }
})();
