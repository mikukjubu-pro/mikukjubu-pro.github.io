// 채널 RSS에서 최신 영상 3개를 읽어 홈(ko/en)의 #ytGrid 카드를 다시 쓴다.
// GitHub Actions에서 매시간 실행 — 서버 쪽에서 도니 CORS 프록시가 필요 없다.
import { readFileSync, writeFileSync } from 'node:fs';

const CHANNEL = 'UCssWRwTEAY-UY7X7lvFi80w';
const PAGES = [
  { file: 'index.html',    altSuffix: ' 썸네일',    more: 'YOUTUBE에서 보기 →' },
  { file: 'en/index.html', altSuffix: ' thumbnail', more: 'WATCH ON YOUTUBE →' },
];

const unxml = s => s.replace(/&(amp|lt|gt|quot|apos|#39);/g, m =>
  ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&#39;': "'" }[m]));
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const xml = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL}`)
  .then(r => { if (!r.ok) throw new Error('RSS ' + r.status); return r.text(); });

const videos = [];
for (const entry of xml.split('<entry>').slice(1)) {
  const id = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
  const title = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1];
  if (id && title) videos.push({ id, title: unxml(title).trim() });
  if (videos.length === 3) break;
}
if (videos.length < 3) throw new Error(`영상 3개를 못 얻음 (${videos.length}개)`);

const OPEN = '<div class="vgrid reveal" id="ytGrid">';
let changed = 0;

for (const { file, altSuffix, more } of PAGES) {
  const html = readFileSync(file, 'utf8');
  const start = html.indexOf(OPEN);
  if (start < 0) throw new Error(`${file}: #ytGrid 없음`);
  const bodyAt = start + OPEN.length;
  const end = html.indexOf('\n    </div>', bodyAt);          // 4칸 들여쓴 첫 </div> = 그리드 닫힘
  if (end < 0) throw new Error(`${file}: #ytGrid 끝을 못 찾음`);

  const cards = videos.map(v => `
      <a class="vcard" href="https://www.youtube.com/watch?v=${v.id}" target="_blank" rel="noopener">
        <div class="vthumb"><img src="https://i.ytimg.com/vi/${v.id}/hqdefault.jpg" alt="${esc(v.title)}${altSuffix}" loading="lazy" /><span class="vplay"></span></div>
        <div class="vbody"><span class="vt">${esc(v.title)}</span><span class="vm">${more}</span></div>
      </a>`).join('');

  const eol = html.includes('\r\n') ? '\r\n' : '\n';          // 원본 줄바꿈을 그대로 따른다
  const next = html.slice(0, bodyAt) + cards.replaceAll('\n', eol) + html.slice(end);
  if (next !== html) { writeFileSync(file, next); changed++; console.log(`updated ${file}`); }
}

console.log(changed ? `최신 영상: ${videos.map(v => v.id).join(', ')}` : '변경 없음');
