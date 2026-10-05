/* 마켓 수수료·순이익 비교 계산기 — 수수료 표 + 계산 로직
   숫자는 전부 공식 페이지 원문에서 옮겼다 (확인 날짜 = FEES.checked).
   수수료가 바뀌면 이 파일의 표만 고치면 된다. */
(function (root) {
  'use strict';

  var INF = Infinity;
  /* 요율 규칙
     flat : 전체 금액 × r
     tier : 구간별 합산 — [[상한, 요율], …] ("$300 까지 15%, 초과분 8%")
     thr  : 총액이 어느 구간이냐에 따라 전체에 한 요율 ("$10 이하 8%, 초과 15%") */
  function flat(r) { return { t: 'flat', r: r }; }
  function tier() { return { t: 'tier', b: [].slice.call(arguments) }; }
  function thr() { return { t: 'thr', b: [].slice.call(arguments) }; }

  function applyRule(rule, amt) {
    var i, fee = 0, prev = 0;
    if (rule.t === 'flat') return amt * rule.r;
    if (rule.t === 'thr') {
      for (i = 0; i < rule.b.length; i++) if (amt <= rule.b[i][0]) return amt * rule.b[i][1];
    }
    for (i = 0; i < rule.b.length && amt > prev; i++) {
      fee += (Math.min(amt, rule.b[i][0]) - prev) * rule.b[i][1];
      prev = rule.b[i][0];
    }
    return fee;
  }

  var EBAY_MOST = tier([7500, 0.136], [INF, 0.0235]);
  var EBAY_MEDIA = tier([7500, 0.153], [INF, 0.0235]);
  var A15 = { rule: flat(0.15), min: 0.30 };
  var W15 = flat(0.15);

  /* 카테고리 = 한 줄에 아마존(az) · 월마트(wm) · 이베이(eb) 규칙.
     엣시 · 쇼피파이 · 틱톡샵은 카테고리와 상관없이 같은 요율이라 여기 없다. */
  var CATS = [
    { id: 'home', ko: '가정 · 주방', az: A15, wm: W15, eb: EBAY_MOST },
    { id: 'toys', ko: '장난감 · 게임', az: A15, wm: W15, eb: EBAY_MOST },
    { id: 'clothing', ko: '의류 · 액세서리',
      az: { rule: thr([15, 0.05], [20, 0.10], [INF, 0.17]), min: 0.30 },
      wm: thr([15, 0.05], [20, 0.10], [INF, 0.15]), eb: EBAY_MOST },
    { id: 'shoes', ko: '신발 (운동화 제외)', az: A15, wm: W15, eb: EBAY_MOST },
    { id: 'sneakers', ko: '운동화', az: A15, wm: W15, eb: 'athletic' },
    { id: 'bags', ko: '가방 · 백팩 · 여행가방', az: A15, wm: W15, eb: EBAY_MOST },
    { id: 'handbags', ko: '여성 핸드백', az: A15, wm: W15, eb: thr([2000, 0.15], [INF, 0.09]) },
    { id: 'beauty', ko: '뷰티 · 건강 · 개인용품',
      az: { rule: thr([10, 0.08], [INF, 0.15]), min: 0.30 },
      wm: thr([10, 0.08], [INF, 0.15]), eb: EBAY_MOST },
    { id: 'baby', ko: '유아용품',
      az: { rule: thr([10, 0.08], [INF, 0.15]), min: 0.30 },
      wm: thr([10, 0.08], [INF, 0.15]), eb: EBAY_MOST },
    { id: 'grocery', ko: '식품',
      az: { rule: thr([15, 0.08], [INF, 0.15]), min: 0 },
      wm: thr([15, 0.08], [INF, 0.15]), eb: EBAY_MOST },
    { id: 'electronics', ko: '전자제품 (본체)', az: { rule: flat(0.08), min: 0.30 }, wm: flat(0.08), eb: EBAY_MOST },
    { id: 'eaccessories', ko: '전자제품 액세서리',
      az: { rule: tier([100, 0.15], [INF, 0.08]), min: 0.30 },
      wm: tier([100, 0.15], [INF, 0.08]), eb: EBAY_MOST },
    { id: 'computers', ko: '컴퓨터', az: { rule: flat(0.08), min: 0.30 }, wm: flat(0.06), eb: EBAY_MOST },
    { id: 'consoles', ko: '게임 콘솔', az: { rule: flat(0.08), min: 0 }, wm: flat(0.08), eb: EBAY_MOST },
    { id: 'videogames', ko: '비디오 게임 · 게임 액세서리', az: { rule: flat(0.15), min: 0 }, wm: W15, eb: EBAY_MOST },
    { id: 'auto', ko: '자동차 · 오토바이 용품', az: { rule: flat(0.12), min: 0.30 }, wm: flat(0.12), eb: EBAY_MOST },
    { id: 'tires', ko: '타이어', az: { rule: flat(0.10), min: 0.30 }, wm: flat(0.10), eb: EBAY_MOST },
    { id: 'tools', ko: '공구 · 집수리', az: A15, wm: W15, eb: EBAY_MOST },
    { id: 'powertools', ko: '전동공구 (본체)', az: { rule: flat(0.12), min: 0.30 }, wm: flat(0.12), eb: EBAY_MOST },
    { id: 'garden', ko: '잔디 · 정원', az: A15, wm: W15, eb: EBAY_MOST },
    { id: 'furniture', ko: '가구',
      az: { rule: tier([200, 0.15], [INF, 0.10]), min: 0.30 },
      wm: tier([200, 0.15], [INF, 0.10]), eb: EBAY_MOST },
    { id: 'smallappl', ko: '소형 가전',
      az: { rule: tier([300, 0.15], [INF, 0.08]), min: 0.30 },
      wm: tier([300, 0.12], [INF, 0.08]), eb: EBAY_MOST },
    { id: 'majorappl', ko: '대형 가전', az: { rule: flat(0.08), min: 0.30 }, wm: flat(0.08), eb: EBAY_MOST },
    { id: 'pet', ko: '반려동물 용품', az: A15, wm: W15, eb: EBAY_MOST },
    { id: 'sports', ko: '스포츠 · 아웃도어', az: A15, wm: W15, eb: EBAY_MOST },
    { id: 'office', ko: '사무용품', az: A15, wm: W15, eb: EBAY_MOST },
    { id: 'instruments', ko: '악기 (기타 · 베이스 제외)', az: A15, wm: flat(0.12), eb: EBAY_MOST },
    { id: 'guitars', ko: '기타 · 베이스', az: A15, wm: flat(0.12), eb: tier([7500, 0.067], [INF, 0.0235]) },
    { id: 'jewelry', ko: '주얼리',
      az: { rule: tier([250, 0.20], [INF, 0.05]), min: 0.30 },
      wm: tier([250, 0.20], [INF, 0.05]), eb: thr([5000, 0.15], [INF, 0.09]) },
    { id: 'watches', ko: '시계',
      az: { rule: tier([1500, 0.16], [INF, 0.03]), min: 0.30 },
      wm: tier([1500, 0.15], [INF, 0.03]),
      eb: tier([1000, 0.15], [7500, 0.065], [INF, 0.03]) },
    { id: 'media', ko: '책 · 음악 · 영화(DVD)',
      az: { rule: flat(0.15), min: 0, closing: 1.80 }, wm: W15, eb: EBAY_MEDIA },
    { id: 'industrial', ko: '산업 · 과학 용품', az: { rule: flat(0.12), min: 0.30 }, wm: flat(0.12), eb: EBAY_MOST },
    { id: 'else', ko: '그 외 (위에 없는 것)', az: A15, wm: W15, eb: EBAY_MOST }
  ];

  var FEES = {
    checked: '2026-10-05',
    amazon: { pro: 39.99, individual: 0.99 },
    ebay: { orderFeeLow: 0.30, orderFeeHigh: 0.40, orderFeeCut: 10 },
    etsy: { transaction: 0.065, payPct: 0.03, payFixed: 0.25, listing: 0.20 },
    shopify: {
      basic: { ko: 'Basic', month: 39, pct: 0.029, fixed: 0.30 },
      grow: { ko: 'Grow', month: 105, pct: 0.027, fixed: 0.30 },
      advanced: { ko: 'Advanced', month: 399, pct: 0.025, fixed: 0.30 }
    },
    tiktok: { referral: 0.06 },
    sources: [
      { ko: '아마존', url: 'https://sell.amazon.com/pricing' },
      { ko: '이베이', url: 'https://www.ebay.com/help/selling/fees-credits-invoices/selling-fees?id=4822' },
      { ko: '월마트', url: 'https://marketplacelearn.walmart.com/guides/Getting%20started/Onboarding/Referral-fee-schedule-for-contract-categories' },
      { ko: '엣시', url: 'https://www.etsy.com/legal/fees/' },
      { ko: '쇼피파이', url: 'https://www.shopify.com/pricing' },
      { ko: '틱톡샵', url: 'https://seller-us.tiktok.com/university/essay?knowledge_id=5988482086864682' }
    ]
  };

  function findCat(id) {
    for (var i = 0; i < CATS.length; i++) if (CATS[i].id === id) return CATS[i];
    return CATS[CATS.length - 1];
  }

  /* 입력(in): cat, price, buyerShip, taxPct, cost, shipCost, fbaFee, qty,
                ad{amazon,ebay,walmart,etsy,shopify,tiktok} (개당 $), other(개당 $), amazonPlan, shopifyPlan
     결과: 마켓별 { id, ko, lines[[이름, 금액]…], fees, profit, margin, roi } — 순이익 큰 순서 */
  function calc(inp) {
    var cat = findCat(inp.cat);
    var P = +inp.price || 0, S = +inp.buyerShip || 0, C = +inp.cost || 0;
    var ship = +inp.shipCost || 0, fba = +inp.fbaFee || 0, other = +inp.other || 0;
    var qty = Math.max(1, +inp.qty || 1);
    var sale = P + S;                              // 내가 받는 돈 (세금 제외)
    var tax = sale * (+inp.taxPct || 0) / 100;     // 구매자가 내는 판매세 (마켓이 걷어서 냄)
    var gross = sale + tax;
    var ad = inp.ad || {};
    var out = [];

    function add(id, ko, lines, shipping, note) {
      var fees = 0, i;
      for (i = 0; i < lines.length; i++) fees += lines[i][1];
      var adv = +ad[id.split('-')[0]] || 0;
      var profit = sale - fees - shipping - adv - other - C;
      out.push({
        id: id, ko: ko, lines: lines, fees: fees, feePct: sale > 0 ? fees / sale * 100 : 0,
        shipping: shipping, ad: adv, other: other, note: note || '',
        profit: profit,
        margin: sale > 0 ? profit / sale * 100 : 0,
        roi: C > 0 ? profit / C * 100 : null
      });
    }

    // 아마존 — 판매 수수료는 (상품가 + 배송비)의 % 와 최소 수수료 중 큰 쪽
    var azRef = Math.max(applyRule(cat.az.rule, sale), cat.az.min);
    var azPlan = inp.amazonPlan === 'individual'
      ? ['개인 셀러 수수료 (개당)', FEES.amazon.individual]
      : ['프로 요금제 $39.99 ÷ ' + qty + '개', FEES.amazon.pro / qty];
    var azLines = [['판매 수수료', azRef]];
    if (cat.az.closing) azLines.push(['미디어 마감 수수료', cat.az.closing]);
    azLines.push(azPlan);
    add('amazon-fba', '아마존 (FBA)', azLines.slice(), fba);
    add('amazon-fbm', '아마존 (직접 배송)', azLines.slice(), ship);

    // 이베이 — 배송비 · 판매세까지 포함한 총액에 붙는다
    var ebFee, ebOrder = gross <= FEES.ebay.orderFeeCut ? FEES.ebay.orderFeeLow : FEES.ebay.orderFeeHigh;
    if (cat.eb === 'athletic') {
      if (gross >= 150) { ebFee = gross * 0.08; ebOrder = 0; } else ebFee = gross * 0.136;
    } else ebFee = applyRule(cat.eb, gross);
    add('ebay', '이베이', [['최종 판매 수수료', ebFee], ['주문당 수수료', ebOrder]], ship);

    // 월마트 — (상품가 + 배송비)의 %, 월 구독료 없음
    add('walmart', '월마트', [['판매 수수료', applyRule(cat.wm, sale)]], ship);

    // 엣시 — 거래 수수료는 세금 제외, 결제 수수료는 세금 포함 총액
    add('etsy', '엣시', [
      ['거래 수수료 6.5%', sale * FEES.etsy.transaction],
      ['결제 수수료 3% + $0.25', gross * FEES.etsy.payPct + FEES.etsy.payFixed],
      ['등록비', FEES.etsy.listing]
    ], ship, '핸드메이드 · 빈티지 · 공예 재료만 팔 수 있어요');

    // 쇼피파이 — 판매 수수료 없음, 월 요금 + 카드 결제 수수료
    var sp = FEES.shopify[inp.shopifyPlan] || FEES.shopify.basic;
    add('shopify', '쇼피파이', [
      ['카드 결제 수수료 ' + (sp.pct * 100).toFixed(1) + '% + $0.30', gross * sp.pct + sp.fixed],
      [sp.ko + ' 요금제 $' + sp.month + ' ÷ ' + qty + '개', sp.month / qty]
    ], ship, '손님을 직접 데려와야 해요 — 광고비를 꼭 넣어 보세요');

    // 틱톡샵 — (구매자 결제액 − 세금) × 6% (공식 공개 표 기준)
    add('tiktok', '틱톡샵', [['판매 수수료 6%', sale * FEES.tiktok.referral]], ship,
      '2026년 8월부터 8%로 올랐다는 보도가 있어요 — 셀러센터에서 확인하세요');

    out.sort(function (a, b) { return b.profit - a.profit; });
    return out;
  }

  /* 손해 안 보는 최저 판매가 — 마켓별로 순이익이 0 이 되는 판매가를 이분법으로 찾는다 */
  function breakEven(inp) {
    var ids = ['amazon-fba', 'amazon-fbm', 'ebay', 'walmart', 'etsy', 'shopify', 'tiktok'], out = {};
    function profitAt(id, price) {
      var c = {}, k, r, i;
      for (k in inp) c[k] = inp[k];
      c.price = price;
      r = calc(c);
      for (i = 0; i < r.length; i++) if (r[i].id === id) return r[i].profit;
    }
    ids.forEach(function (id) {
      var lo = 0, hi = 100000, mid, n;
      for (n = 0; n < 50; n++) { mid = (lo + hi) / 2; if (profitAt(id, mid) >= 0) hi = mid; else lo = mid; }
      out[id] = hi;
    });
    return out;
  }

  var api = { CATS: CATS, FEES: FEES, applyRule: applyRule, calc: calc, breakEven: breakEven };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  root.MKFees = api;

  /* ───── 화면 ───── */
  var AD_KEYS = ['amazon', 'ebay', 'walmart', 'etsy', 'shopify', 'tiktok'];
  function $(id) { return document.getElementById(id); }
  function money(n) { return (n < 0 ? '−$' : '$') + Math.abs(n).toFixed(2); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function read() {
    var ad = {}, same = !$('fcAdSplit').checked, i;
    for (i = 0; i < AD_KEYS.length; i++) ad[AD_KEYS[i]] = same ? $('fcAd').value : $('fcAd-' + AD_KEYS[i]).value;
    return {
      cat: $('fcCat').value, price: $('fcPrice').value, cost: $('fcCost').value,
      buyerShip: $('fcBuyerShip').value, shipCost: $('fcShip').value, fbaFee: $('fcFba').value,
      taxPct: $('fcTax').value, qty: $('fcQty').value, ad: ad, other: $('fcOther').value,
      amazonPlan: $('fcAzPlan').value, shopifyPlan: $('fcSpPlan').value
    };
  }

  function render() {
    var inp = read(), res = calc(inp), be = breakEven(inp), html = '', i, j, r;
    for (i = 0; i < res.length; i++) {
      r = res[i];
      html += '<article class="fc-card' + (i === 0 ? ' is-best' : '') + (r.profit < 0 ? ' is-loss' : '') + '">' +
        '<header><h3>' + esc(r.ko) + '</h3>' + (i === 0 ? '<span class="fc-badge">' + (r.profit < 0 ? '손해가 제일 적어요' : '제일 많이 남아요') + '</span>' : '') + '</header>' +
        '<p class="fc-profit">' + money(r.profit) + '<small>개당 순이익</small></p>' +
        '<p class="fc-rate">마진 ' + r.margin.toFixed(1) + '% · ROI ' + (r.roi === null ? '—' : r.roi.toFixed(0) + '%') + '</p>' +
        '<p class="fc-fee">마켓에 내는 돈 <b>' + money(r.fees) + '</b> (판매가의 ' + r.feePct.toFixed(1) + '%)</p><dl>';
      for (j = 0; j < r.lines.length; j++) html += '<dt>' + esc(r.lines[j][0]) + '</dt><dd>' + money(r.lines[j][1]) + '</dd>';
      html += '<dt>' + (r.id === 'amazon-fba' ? 'FBA 배송비' : '내가 내는 배송비') + '</dt><dd>' + money(r.shipping) + '</dd>' +
        '<dt>광고비</dt><dd>' + money(r.ad) + '</dd>' +
        (r.other ? '<dt>기타 비용</dt><dd>' + money(r.other) + '</dd>' : '') +
        '<dt>원가</dt><dd>' + money(+inp.cost || 0) + '</dd></dl>' +
        '<p class="fc-be">' + money(be[r.id]) + ' 넘게 팔아야 남아요</p>' +
        (r.note ? '<p class="fc-note">' + esc(r.note) + '</p>' : '') + '</article>';
    }
    $('fcOut').innerHTML = html;
    var best = res[0], last = res[res.length - 1];
    $('fcBarTx').textContent = best.ko + ' ' + money(best.profit);
    $('fcSum').textContent = best.profit < 0
      ? '지금 조건이면 어느 마켓에서 팔아도 손해예요. 판매가를 올리거나 원가 · 배송비를 낮춰 보세요.'
      : best.ko + '에서 팔면 개당 ' + money(best.profit) + ' 남고, ' + last.ko + '에서 팔면 ' +
        (last.profit < 0 ? money(-last.profit) + ' 손해예요.' : money(last.profit) + ' 남아요.') +
        ' 같은 상품인데 ' + money(best.profit - last.profit) + ' 차이예요.';
  }

  function init() {
    var sel = $('fcCat'), i, o;
    if (!sel) return;
    for (i = 0; i < CATS.length; i++) {
      o = document.createElement('option');
      o.value = CATS[i].id; o.textContent = CATS[i].ko;
      sel.appendChild(o);
    }
    $('fcAdSplit').addEventListener('change', function () {
      $('fcAdEach').hidden = !this.checked;
      $('fcAd').disabled = this.checked;
    });
    $('fcForm').addEventListener('input', render);
    $('fcForm').addEventListener('change', render);
    $('fcChecked').textContent = FEES.checked;
    if ('IntersectionObserver' in root) {
      new IntersectionObserver(function (e) { $('fcBar').classList.toggle('is-off', e[0].isIntersecting); })
        .observe($('fcOut'));
    }
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(this);
