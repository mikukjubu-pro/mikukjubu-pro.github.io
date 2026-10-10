/* 원화 입금 계산기 — 한국에 사는 셀러가 이베이·엣시·아마존(미국)에서 팔면 한국 통장에 원화로 얼마 들어오나
   카테고리별 판매 수수료 표는 v1 계산기(/js/calc-fees.js, MKFees.CATS)를 그대로 쓴다 — 표는 한 곳에만 둔다.
   그 밖의 숫자(해외 수수료 · 결제 수수료 · 환전 · 관세)는 전부 공식 페이지 원문에서 옮겼다 (확인 날짜 = KRW.checked). */
(function (root) {
  'use strict';

  var Fees = (typeof module !== 'undefined' && module.exports) ? require('./calc-fees.js') : root.MKFees;

  var KRW = {
    checked: '2026-10-10',
    ebay: {
      intlPct: 0.0145,            // 해외 수수료 — 한국 등록 셀러 1.45% (미국 셀러 1.65% 아님). 기준 = 판매세까지 포함한 총액
      orderFeeLow: 0.30, orderFeeHigh: 0.40, orderFeeCut: 10,
      conversion: 0               // USD 판매 → USD 로 Payoneer 지급이면 환전 수수료 없음 (3.0% 는 USD 이외 결제일 때만)
    },
    etsy: {
      listing: 0.20, transaction: 0.065,
      payPct: 0.065, payFixed: 0.30,   // 한국 셀러 결제 수수료 6.5% + $0.30 (미국 셀러 3% + $0.25 와 다름)
      conversion: 0.025,               // 등록 통화 ≠ 결제 계정 통화일 때만
      offsite: { std: 0.15, big: 0.12 }
    },
    amazon: { pro: 39.99, individual: 0.99, krwPct: 0.015 },   // Amazon Currency Converter — KRW 수령 1.5% 고정
    payoneer: { lo: 0.012, hi: 0.04 },   // 출금(환전 포함) 1.2%~4% — 공식 표가 범위만 공개
    duty: 0.125,                         // 한국산: MFN + 301조 합계 12.5% (2026-07-24~). MFN 이 12.5% 이상인 품목은 MFN 그대로
    sources: [
      { ko: '이베이 수수료', url: 'https://www.ebay.com/help/selling/fees-credits-invoices/selling-fees?id=4822' },
      { ko: '이베이 해외 수수료(한국 1.45%)', url: 'https://export.ebay.com/en/fees-regulations-policies/seller-fees/international-fees/' },
      { ko: '이베이 DDP 의무', url: 'https://export.ebay.com/jp/policies/shipping-policy-for-packages-from-japan-and-korea-to-the-united-states/' },
      { ko: '엣시 수수료', url: 'https://www.etsy.com/legal/fees/' },
      { ko: '엣시 결제 수수료(국가별)', url: 'https://www.etsy.com/legal/etsy-payments/' },
      { ko: '아마존 수수료', url: 'https://sell.amazon.com/pricing' },
      { ko: '아마존 환전(KRW 1.5%)', url: 'https://sell.amazon.com/programs/amazon-currency-converter' },
      { ko: 'Payoneer 요금표', url: 'https://www.payoneer.com/about/pricing/' },
      { ko: '미국 관세(Federal Register)', url: 'https://www.federalregister.gov/documents/2026/07/28/2026-15274' }
    ]
  };

  function num(v) { v = +v; return isFinite(v) ? v : 0; }
  function pct(v) { return num(v) / 100; }

  /* 입력(inp)
       market: 'ebay' | 'etsy' | 'amazon'   (폭포 그림 · 큰 숫자에 쓸 마켓)
       cat, price($), buyerShip($), taxPct(%)
       cost(원), packing(원), intlShip(원), ddpFee(원), dutyPct(%)
       fx(원/달러, 비어 있으면 null → 원화 결과 없음)
       payoneerPct(%, 비어 있으면 1.2~4% 범위)
       etsyOffsite: 'none' | 'std' | 'big'   etsyUsd: true(USD 로 등록) / false
       amazonPlan: 'pro' | 'individual'   qty(한 달 판매 개수)   fbaFee($)
     결과: { markets: {ebay, etsy, amazon}, main }  각 마켓 =
       { id, ko, sale, lines[[이름, $]…], arrive($), w{lo,hi,fixed?}, net{lo,hi}($), pct{lo,hi}(%),
         krw{lo,hi}(원 | null), costsKrw(원 | null), duty($), profit{lo,hi}(원 | null), beFx{lo,hi}(원 | null), note } */
  function calc(inp) {
    var cat = Fees.CATS.filter(function (c) { return c.id === inp.cat; })[0] || Fees.CATS[Fees.CATS.length - 1];
    var P = num(inp.price), S = num(inp.buyerShip), sale = P + S;
    var tax = sale * pct(inp.taxPct), G = sale + tax;        // G = 판매세까지 포함한 총액 (이베이 · 엣시 결제 수수료 기준)
    var fx = inp.fx === '' || inp.fx === null || inp.fx === undefined ? null : num(inp.fx);
    if (fx !== null && fx <= 0) fx = null;
    var wUser = inp.payoneerPct === '' || inp.payoneerPct === null || inp.payoneerPct === undefined ? null : pct(inp.payoneerPct);
    var dutyRate = inp.dutyPct === '' || inp.dutyPct === null || inp.dutyPct === undefined ? KRW.duty : pct(inp.dutyPct);
    var dutyUsd = P * dutyRate;                                // 관세(DDP) — 상품가 기준, 셀러가 따로 냄
    var fixedKrw = num(inp.cost) + num(inp.packing) + num(inp.intlShip) + num(inp.ddpFee);
    var out = {};

    function finish(id, ko, lines, w, note) {
      var fees = 0, i;
      for (i = 0; i < lines.length; i++) fees += lines[i][1];
      var arrive = sale - fees;
      function at(rate) {
        var net = arrive * (1 - rate);
        var denom = net - dutyUsd;                              // 환율 1원당 남는 달러
        return {
          net: net,
          pct: sale > 0 ? net / sale * 100 : 0,
          krw: fx === null ? null : net * fx,
          profit: fx === null ? null : net * fx - dutyUsd * fx - fixedKrw,
          beFx: denom > 0 ? fixedKrw / denom : null             // 손익분기 환율 — 분모 ≤ 0 이면 환율과 상관없이 손해
        };
      }
      var lo = at(w.lo), hi = at(w.hi);
      out[id] = {
        id: id, ko: ko, sale: sale, lines: lines, fees: fees, arrive: arrive, w: w,
        net: { lo: lo.net, hi: hi.net }, pct: { lo: lo.pct, hi: hi.pct },
        krw: { lo: lo.krw, hi: hi.krw }, profit: { lo: lo.profit, hi: hi.profit },
        beFx: { lo: lo.beFx, hi: hi.beFx },
        duty: dutyUsd, dutyRate: dutyRate, dutyKrw: fx === null ? null : dutyUsd * fx,
        costsKrw: fx === null ? null : fixedKrw + dutyUsd * fx,
        note: note || ''
      };
    }
    var wPay = wUser === null ? { lo: KRW.payoneer.lo, hi: KRW.payoneer.hi, fixed: false }
                              : { lo: wUser, hi: wUser, fixed: true };

    // 이베이 — 최종 판매 수수료 · 주문당 고정비 · 해외 수수료 전부 판매세 포함 총액 기준. USD 지급이라 환전 0
    var ebFee, ebOrder = G <= KRW.ebay.orderFeeCut ? KRW.ebay.orderFeeLow : KRW.ebay.orderFeeHigh;
    if (cat.eb === 'athletic') {
      if (G >= 150) { ebFee = G * 0.08; ebOrder = 0; } else ebFee = G * 0.136;
    } else ebFee = Fees.applyRule(cat.eb, G);
    finish('ebay', '이베이', [
      ['최종 판매 수수료', ebFee],
      ['주문당 수수료', ebOrder],
      ['해외 수수료 1.45%', G * KRW.ebay.intlPct]
    ], wPay, '정산은 Payoneer 로 미국 달러로 받아요');

    // 엣시 — 거래 6.5% 는 판매세 제외 · 결제 6.5% + $0.30 은 판매세 포함 총액 · 환전 2.5% 는 USD 등록이 아닐 때만
    var etLines = [
      ['등록비', KRW.etsy.listing],
      ['거래 수수료 6.5%', sale * KRW.etsy.transaction],
      ['결제 수수료 6.5% + $0.30', G * KRW.etsy.payPct + KRW.etsy.payFixed]
    ];
    if (inp.etsyUsd === false) etLines.push(['환전 수수료 2.5%', sale * KRW.etsy.conversion]);
    if (inp.etsyOffsite === 'std' || inp.etsyOffsite === 'big') {
      etLines.push(['오프사이트 광고 ' + (KRW.etsy.offsite[inp.etsyOffsite] * 100) + '%', sale * KRW.etsy.offsite[inp.etsyOffsite]]);
    }
    finish('etsy', '엣시', etLines, wPay, '핸드메이드 · 빈티지 · 공예 재료만 팔 수 있어요');

    // 아마존 — 판매 수수료(최소 수수료 적용) · 요금제 · FBA 배송비 → KRW 로 받으면 환전 1.5% 고정
    var qty = Math.max(1, num(inp.qty) || 1);
    var azLines = [['판매 수수료', Math.max(Fees.applyRule(cat.az.rule, sale), cat.az.min)]];
    if (cat.az.closing) azLines.push(['미디어 마감 수수료', cat.az.closing]);
    azLines.push(inp.amazonPlan === 'individual'
      ? ['개인 셀러 수수료 (개당)', KRW.amazon.individual]
      : ['프로 요금제 $39.99 ÷ ' + qty + '개', KRW.amazon.pro / qty]);
    if (num(inp.fbaFee) > 0) azLines.push(['FBA 배송비', num(inp.fbaFee)]);
    finish('amazon', '아마존', azLines, { lo: KRW.amazon.krwPct, hi: KRW.amazon.krwPct, fixed: true },
      '사업자 기준 · 원화 수령은 Amazon Currency Converter 1.5%');

    return { markets: out, main: out[inp.market] || out.ebay, fx: fx, tax: tax, gross: G };
  }

  var api = { KRW: KRW, calc: calc };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  root.MKKrw = api;

  /* ───── 화면 ───── */
  function $(id) { return document.getElementById(id); }
  function usd(n) { return (n < 0 ? '−$' : '$') + Math.abs(n).toFixed(2); }
  function won(n) { return (n < 0 ? '−' : '') + Math.round(Math.abs(n)).toLocaleString('ko-KR') + '원'; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function range(o, f) { var a = Math.min(o.lo, o.hi), b = Math.max(o.lo, o.hi); return b - a < 1e-9 ? f(a) : f(a) + '~' + f(b); }   // 항상 작은 값부터
  function pctTxt(o) { return Math.abs(o.lo - o.hi) < 0.05 ? o.lo.toFixed(1) + '%' : o.hi.toFixed(0) + '~' + o.lo.toFixed(0) + '%'; }
  var fxMeta = { auto: null, touched: false };

  function read() {
    return {
      market: document.querySelector('.kp-tab.active') ? document.querySelector('.kp-tab.active').dataset.m : 'ebay',
      cat: $('kpCat').value, price: $('kpPrice').value, buyerShip: $('kpBuyerShip').value, taxPct: $('kpTax').value,
      cost: $('kpCost').value, packing: $('kpPacking').value, intlShip: $('kpIntlShip').value, ddpFee: $('kpDdp').value,
      dutyPct: $('kpDuty').value, fx: $('kpFx').value, payoneerPct: $('kpPayoneer').value,
      etsyOffsite: $('kpOffsite').value, etsyUsd: $('kpEtsyUsd').checked,
      amazonPlan: $('kpAzPlan').value, qty: $('kpQty').value, fbaFee: $('kpFba').value
    };
  }

  function wfRow(label, amount, keep, total, cls) {
    var kw = total > 0 ? Math.max(0, Math.min(100, keep / total * 100)) : 0;
    var cw = total > 0 ? Math.max(0, Math.min(100 - kw, amount / total * 100)) : 0;
    return '<div class="kp-wf-row' + (cls ? ' ' + cls : '') + '"><div class="kp-wf-lab">' + label + '</div>' +
      '<div class="kp-wf-bar"><i class="keep" style="width:' + kw.toFixed(2) + '%"></i><i class="cut" style="width:' + cw.toFixed(2) + '%"></i></div></div>';
  }

  function render() {
    var inp = read(), r = calc(inp), m = r.main, i, html, keep;
    var hasFx = r.fx !== null;

    // ① 큰 글자
    $('kpHeroPct').textContent = pctTxt(m.pct);
    $('kpHeroSub').textContent = m.ko + ' · 판매가 ' + usd(m.sale) + ' 중 ' + range(m.net, usd) + '가 통장으로';

    // ② 폭포 그림
    keep = m.sale;
    html = wfRow('판매가 ' + (inp.buyerShip > 0 ? '+ 배송비 ' : '') + '<b>' + usd(m.sale) + '</b>', 0, keep, m.sale, 'is-top');
    for (i = 0; i < m.lines.length; i++) {
      keep -= m.lines[i][1];
      html += wfRow('− ' + esc(m.lines[i][0]) + ' <b>' + usd(m.lines[i][1]) + '</b>', m.lines[i][1], keep, m.sale);
    }
    var wLabel = m.id === 'amazon' ? '− 환전 1.5% (KRW 수령)' : (m.w.fixed ? '− Payoneer 출금 ' + (m.w.lo * 100).toFixed(1) + '%' : '− Payoneer 출금 1.2~4%');
    html += wfRow(wLabel + ' <b>' + range({ lo: m.arrive - m.net.lo, hi: m.arrive - m.net.hi }, usd) + '</b>', m.arrive - m.net.hi, m.net.hi, m.sale);
    html += wfRow('= 통장에 <b>' + (hasFx ? range(m.krw, won) : range(m.net, usd)) + '</b>' + (hasFx ? ' <small>(환율 ' + Math.round(r.fx).toLocaleString('ko-KR') + '원)</small>' : ''), 0, m.net.hi, m.sale, 'is-final');
    $('kpWf').innerHTML = html;

    // ③ 원화 입금 ④ 순이익 ⑤ 손익분기 환율
    $('kpKrw').textContent = hasFx ? range(m.krw, won) : '환율을 넣으면 원화로 보여 드려요';
    $('kpKrwSub').textContent = hasFx
      ? '판매가를 그대로 환산하면 ' + won(m.sale * r.fx) + ' — 그중 ' + pctTxt(m.pct) + '가 들어와요'
      : '위 % 는 환율과 상관없이 그대로예요';
    if (hasFx) {
      $('kpProfit').textContent = range(m.profit, won);
      $('kpProfit').classList.toggle('is-loss', m.profit.hi < 0);
      $('kpProfitSub').textContent = '원화 입금 − 원가 · 포장 · 국제 배송 · DDP 수수료 ' + won(m.costsKrw - m.dutyKrw) + ' − 관세 ' + won(m.dutyKrw) + ' (' + usd(m.duty) + ')';
    } else {
      $('kpProfit').textContent = '—'; $('kpProfit').classList.remove('is-loss');
      $('kpProfitSub').textContent = '환율을 넣어 주세요';
    }
    if (m.beFx.hi === null && m.beFx.lo === null) {
      $('kpBe').textContent = '환율과 상관없이 손해예요';
      $('kpBeSub').textContent = '수수료와 관세를 빼면 달러가 남지 않아요 — 판매가를 올리거나 원가를 낮춰 보세요';
    } else {
      var beHi = m.beFx.hi === null ? m.beFx.lo : m.beFx.hi;   // 출금 요율이 높을 때(hi) 손익분기 환율이 더 높다 = 보수적
      $('kpBe').textContent = '환율이 ' + won(beHi) + ' 아래로 내려가면 손해예요';
      $('kpBeSub').textContent = m.w.fixed || m.beFx.lo === null ? '지금 넣은 원가 · 배송비 · 관세 기준'
        : 'Payoneer 출금 4% 기준 · 1.2% 면 ' + won(m.beFx.lo);
    }

    // ⑥ 마켓 3개 카드
    html = '';
    ['ebay', 'etsy', 'amazon'].forEach(function (id) {
      var c = r.markets[id], j;
      html += '<article class="fc-card' + (id === m.id ? ' is-best' : '') + '"><header><h3>' + c.ko + '</h3>' +
        (id === m.id ? '<span class="fc-badge">지금 보는 마켓</span>' : '') + '</header>' +
        '<p class="fc-profit">' + pctTxt(c.pct) + '<small>판매가 중 통장에 들어오는 비율</small></p>' +
        '<p class="fc-fee">통장에 <b>' + (hasFx ? range(c.krw, won) : range(c.net, usd)) + '</b></p><dl>';
      for (j = 0; j < c.lines.length; j++) html += '<dt>' + esc(c.lines[j][0]) + '</dt><dd>' + usd(c.lines[j][1]) + '</dd>';
      html += '<dt>' + (id === 'amazon' ? '환전 1.5%' : (c.w.fixed ? 'Payoneer 출금 ' + (c.w.lo * 100).toFixed(1) + '%' : 'Payoneer 출금 1.2~4%')) + '</dt><dd>' +
        range({ lo: c.arrive - c.net.lo, hi: c.arrive - c.net.hi }, usd) + '</dd></dl>' +
        (hasFx ? '<p class="fc-be">순이익 ' + range(c.profit, won) + '</p>' : '') +
        (c.note ? '<p class="fc-note">' + esc(c.note) + '</p>' : '') + '</article>';
    });
    $('kpOut').innerHTML = html;
    $('kpBarTx').textContent = m.ko + ' ' + pctTxt(m.pct);
  }

  function setFx(rate, label) {
    if (fxMeta.touched) return;
    $('kpFx').value = Math.round(rate * 100) / 100;
    $('kpFxSrc').textContent = label;
    render();
  }

  function loadFx() {
    var done = false;
    function ok(rate, label) { if (!done && rate > 0) { done = true; setFx(rate, label); } }
    fetch('https://open.er-api.com/v6/latest/USD').then(function (r) { return r.json(); }).then(function (j) {
      if (j && j.rates && j.rates.KRW) {
        var d = j.time_last_update_utc ? new Date(j.time_last_update_utc) : new Date();
        ok(j.rates.KRW, '기준: 시장 환율(ExchangeRate-API) · ' + d.toISOString().slice(0, 10));
      } else throw new Error('no KRW');
    }).catch(function () {
      fetch('https://api.frankfurter.dev/v1/latest?from=USD&to=KRW').then(function (r) { return r.json(); }).then(function (j) {
        if (j && j.rates && j.rates.KRW) ok(j.rates.KRW, '기준: 유럽중앙은행(Frankfurter) · ' + j.date);
        else throw new Error('no KRW');
      }).catch(function () {
        if (!done && !fxMeta.touched) { $('kpFxSrc').textContent = '환율을 자동으로 못 가져왔어요 — 아래 링크에서 보고 직접 넣어 주세요'; render(); }
      });
    });
  }

  function init() {
    var sel = $('kpCat'), i, o;
    if (!sel) return;
    for (i = 0; i < Fees.CATS.length; i++) {
      o = document.createElement('option'); o.value = Fees.CATS[i].id; o.textContent = Fees.CATS[i].ko; sel.appendChild(o);
    }
    var tabs = document.querySelectorAll('.kp-tab');
    for (i = 0; i < tabs.length; i++) tabs[i].addEventListener('click', function () {
      for (var k = 0; k < tabs.length; k++) { tabs[k].classList.toggle('active', tabs[k] === this); tabs[k].setAttribute('aria-selected', tabs[k] === this); }
      document.body.dataset.market = this.dataset.m;
      render();
    });
    $('kpFx').addEventListener('input', function () { fxMeta.touched = true; $('kpFxSrc').textContent = '직접 넣은 환율'; });
    $('kpForm').addEventListener('input', render);
    $('kpForm').addEventListener('change', render);
    $('kpChecked').textContent = KRW.checked;
    $('kpFeesChecked').textContent = Fees.FEES.checked;
    if ('IntersectionObserver' in root) {
      new IntersectionObserver(function (e) { $('kpBar').classList.toggle('is-off', e[0].isIntersecting); }).observe($('kpRes'));
    }
    render();
    loadFx();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(this);
