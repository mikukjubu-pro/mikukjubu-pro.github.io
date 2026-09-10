// 채널 RSS에서 최신 롱폼 영상 3개를 읽어 홈(ko/en)의 #ytGrid 카드를 다시 쓴다.
// GitHub Actions에서 매시간 실행 — 서버 쪽에서 도니 CORS 프록시가 필요 없다.
//
// 유튜브가 잠깐 맛이 가면(RSS 404 등) 아무것도 바꾸지 않고 조용히 끝낸다 —
// 페이지는 직전 상태를 유지하고 다음 회차에 다시 시도한다. 워크플로를 실패로
// 만들지 않는 이유는 매시간 실패 메일이 날아오지 않게 하기 위함이다.
// 반대로 페이지 구조가 바뀌어 앵커를 못 찾는 건 진짜 고장이므로 크게 실패시킨다.
import { readFileSync, writeFileSync } from 'node:fs';

const CHANNEL = 'UCssWRwTEAY-UY7X7lvFi80w';
const WANT = 3;
const PAGES = [
  { file: 'index.html',    altSuffix: ' 썸네일',    more: 'YOUTUBE에서 보기 →' },
  { file: 'en/index.html', altSuffix: ' thumbnail', more: 'WATCH ON YOUTUBE →' },
];

class SkipRun extends Error {}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const unxml = s => s.replace(/&(amp|lt|gt|quot|apos|#39);/g, m =>
  ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&#39;': "'" }[m]));
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function fetchFeed() {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL}`;
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(url).catch(() => null);
    if (res?.ok) return res.text();
    console.log(`RSS ${res ? res.status : '네트워크 오류'} — 재시도 ${attempt}/4`);
    await sleep(attempt * 5000);
  }
  throw new SkipRun('RSS 를 못 읽었다');
}

// youtube.com/shorts/<id> — 쇼츠면 200, 롱폼이면 watch 로 리다이렉트(303).
async function isShort(id) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(`https://www.youtube.com/shorts/${id}`, { method: 'HEAD', redirect: 'manual' }).catch(() => null);
    if (res?.status === 200) return true;
    if (res && res.status >= 300 && res.status < 400) return false;
    await sleep(attempt * 3000);
  }
  throw new SkipRun(`${id} 가 쇼츠인지 판정하지 못했다`);
}

async function run() {
  const xml = await fetchFeed();

  const videos = [];
  for (const entry of xml.split('<entry>').slice(1)) {
    const id = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
    const title = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1];
    if (!id || !title) continue;
    if (await isShort(id)) { console.log(`쇼츠 제외: ${id}`); continue; }
    videos.push({ id, title: unxml(title).trim() });
    if (videos.length === WANT) break;
  }
  if (videos.length < WANT) throw new SkipRun(`롱폼 ${WANT}개를 못 모았다 (${videos.length}개)`);

  const OPEN = '<div class="vgrid reveal" id="ytGrid">';
  let changed = 0;

  for (const { file, altSuffix, more } of PAGES) {
    const html = readFileSync(file, 'utf8');
    const start = html.indexOf(OPEN);
    if (start < 0) throw new Error(`${file}: #ytGrid 를 못 찾았다 — 페이지 구조가 바뀌었나?`);
    const bodyAt = start + OPEN.length;
    const end = html.indexOf('\n    </div>', bodyAt);        // 4칸 들여쓴 첫 </div> = 그리드 닫힘
    if (end < 0) throw new Error(`${file}: #ytGrid 의 끝을 못 찾았다`);

    const cards = videos.map(v => `
      <a class="vcard" href="https://www.youtube.com/watch?v=${v.id}" target="_blank" rel="noopener">
        <div class="vthumb"><img src="https://i.ytimg.com/vi/${v.id}/hqdefault.jpg" alt="${esc(v.title)}${altSuffix}" loading="lazy" /><span class="vplay"></span></div>
        <div class="vbody"><span class="vt">${esc(v.title)}</span><span class="vm">${more}</span></div>
      </a>`).join('');

    const eol = html.includes('\r\n') ? '\r\n' : '\n';        // 원본 줄바꿈을 그대로 따른다
    const next = html.slice(0, bodyAt) + cards.replaceAll('\n', eol) + html.slice(end);
    if (next !== html) { writeFileSync(file, next); changed++; console.log(`updated ${file}`); }
  }

  console.log(changed ? `최신 롱폼: ${videos.map(v => v.id).join(', ')}` : '변경 없음');
}

try {
  await run();
} catch (err) {
  if (!(err instanceof SkipRun)) throw err;
  console.log(`이번 회차 건너뜀 — ${err.message}. 페이지는 그대로 두고 다음 회차에 다시 시도한다.`);
}
