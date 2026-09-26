(async () => {
  const box = document.getElementById('burn'), cv = box.querySelector('canvas');
  const W = 1600, H = 1000;
  const C = {plum:'#2E1A5E', deep:'#1B1038', cream:'#FFF6E8', coral:'#FF6A3D', lime:'#D7F24B', lilac:'#C9B4F7', ink:'#180F2E'};
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  try { await Promise.all([['80px "Black Han Sans"', 'MY SITE 프롬프트 한 줄로 사이트 완성✦'], ['28px "Space Mono"', 'copy→paste launch index.html uniform float'], ['700 28px "Space Mono"', 'WORK ABOUT CONTACT NEW START→']].map(([f, t]) => document.fonts.load(f, t))); } catch (e) {}

  const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };

  // 완성된 사이트 (타고 나면 드러나는 쪽)
  const site = mk(), s = site.getContext('2d');
  s.fillStyle = C.plum; s.fillRect(0, 0, W, H);
  s.fillStyle = C.deep; s.fillRect(0, 0, W, 96);
  s.fillStyle = C.cream; s.font = '44px "Black Han Sans"'; s.fillText('MY SITE', 64, 64);
  s.font = '700 24px "Space Mono"'; ['WORK', 'ABOUT', 'CONTACT'].forEach((t, i) => s.fillText(t, 900 + i * 190, 60));
  s.fillStyle = C.lime; rr(s, 64, 170, 190, 50, 25); s.fill();
  s.fillStyle = C.ink; s.font = '700 24px "Space Mono"'; s.fillText('NEW ✦', 100, 204);
  s.font = '118px "Black Han Sans"'; s.fillStyle = C.cream; s.fillText('프롬프트 한 줄로', 64, 360);
  s.fillStyle = C.coral; s.fillText('사이트 완성', 64, 490);
  s.fillStyle = C.lilac; s.font = '30px "Space Mono"'; s.fillText('copy → paste → launch', 70, 560);
  s.fillStyle = C.coral; s.strokeStyle = C.ink; s.lineWidth = 5; rr(s, 64, 610, 300, 84, 42); s.fill(); s.stroke();
  s.fillStyle = C.ink; s.font = '700 28px "Space Mono"'; s.fillText('START →', 150, 662);
  [[C.lime, 0], [C.coral, 1], [C.lilac, 2]].forEach(([col, i]) => {
    const x = 64 + i * 330; s.fillStyle = col; rr(s, x, 760, 300, 180, 26); s.fill();
    s.strokeStyle = C.ink; s.lineWidth = 5; s.stroke(); s.fillStyle = C.ink; rr(s, x + 30, 800, 120, 16, 8); s.fill(); rr(s, x + 30, 836, 220, 12, 6); s.fill(); rr(s, x + 30, 862, 180, 12, 6); s.fill();
  });
  s.fillStyle = C.coral; s.beginPath(); s.arc(1260, 520, 250, 0, 7); s.fill();
  s.fillStyle = C.lime; s.beginPath(); s.arc(1370, 380, 110, 0, 7); s.fill();
  s.strokeStyle = C.cream; s.lineWidth = 6; s.beginPath(); s.arc(1260, 520, 330, 0, 7); s.stroke();
  s.fillStyle = C.ink; s.font = '150px "Black Han Sans"'; s.fillText('✦', 1180, 580);

  // 코드 화면 (위에 덮여 있다가 타서 사라지는 쪽)
  const code = mk(), k = code.getContext('2d');
  k.fillStyle = C.ink; k.fillRect(0, 0, W, H);
  k.fillStyle = '#231842'; k.fillRect(0, 0, W, 70);
  [C.coral, C.lime, C.lilac].forEach((c, i) => { k.fillStyle = c; k.beginPath(); k.arc(44 + i * 38, 35, 12, 0, 7); k.fill(); });
  k.fillStyle = C.lilac; k.font = '24px "Space Mono"'; k.fillText('index.html', 190, 44);
  const lines = [
    [['// 프롬프트 붙여넣는 중…', '#7d6fa8']], [],
    [['<', C.lilac], ['section', C.coral], [' class=', C.lilac], ['"hero"', C.lime], ['>', C.lilac]],
    [['  <', C.lilac], ['h1', C.coral], ['>', C.lilac], ['프롬프트 한 줄로', C.cream], ['</', C.lilac], ['h1', C.coral], ['>', C.lilac]],
    [['  <', C.lilac], ['a', C.coral], [' href=', C.lilac], ['"#start"', C.lime], ['>START</', C.lilac], ['a', C.coral], ['>', C.lilac]],
    [['</', C.lilac], ['section', C.coral], ['>', C.lilac]], [],
    [['const', C.coral], [' burn ', C.cream], ['=', C.lilac], [' spring', C.lime], ['({ tension: ', C.lilac], ['120', C.coral], [' })', C.lilac]],
    [['uniform float', C.coral], [' uProgress;', C.cream]],
    [['float', C.coral], [' edge = ', C.cream], ['smoothstep', C.lime], ['(p, p + 0.04, n);', C.cream]],
    [['gl_FragColor', C.lime], [' = mix(site, code, edge);', C.cream]], [],
    [['renderer', C.cream], ['.setAnimationLoop', C.lime], ['(tick);', C.lilac]],
    [['// ✦ launch', '#7d6fa8']],
  ];
  k.font = '30px "Space Mono"';
  lines.forEach((ln, i) => {
    const y = 150 + i * 58; k.fillStyle = '#4b3d78'; k.fillText(String(i + 1).padStart(2, ' '), 40, y);
    let x = 120; ln.forEach(([t, c]) => { k.fillStyle = c; k.fillText(t, x, y); x += k.measureText(t).width; });
  });
  k.fillStyle = C.lime; k.fillRect(120, 150 + lines.length * 58 - 26, 16, 34);

  const gl = cv.getContext('webgl', {antialias: false, premultipliedAlpha: false});
  const fit = () => { const r = Math.min(devicePixelRatio || 1, 2); cv.width = box.clientWidth * r; cv.height = box.clientHeight * r; gl && gl.viewport(0, 0, cv.width, cv.height); };
  if (!gl) { fit(); cv.getContext('2d').drawImage(site, 0, 0, cv.width, cv.height); return; }

  const vs = 'attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0,1);}';
  const fs = `precision highp float;varying vec2 v;uniform sampler2D uSite,uCode,uTrail;uniform float uP,uT;
  float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
  float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*n2(p);p*=2.03;a*=.5;}return s;}
  void main(){
    vec3 site=texture2D(uSite,v).rgb, code=texture2D(uCode,v).rgb;
    float n=fbm(v*vec2(6.,3.8)+vec2(0.,uT*.06));
    float f=(1.-v.y)*.72+n*.28;                       // 위(정수리)부터 탄다
    float a=smoothstep(uP-.012,uP+.012,f);          // 1 = 아직 코드로 덮임
    float e1=(1.-smoothstep(0.,.045,abs(f-uP)))*step(uP,1.02);
    float m=texture2D(uTrail,v).r;
    float g=m*1.15+(n-.5)*.9;                        // 커서 자국 = 물결 가장자리
    float b=smoothstep(.36,.42,g);
    float e2=(1.-smoothstep(0.,.07,abs(g-.39)))*step(.05,m);
    float cover=max(a,b), edge=max(e1,e2);
    float scan=exp(-pow((v.y-fract(uT/3.1))*60.,2.))*.14; // 3.1초마다 스캔선
    vec3 col=mix(site,code,cover);
    col=mix(col,code,scan*(1.-cover));
    col*=1.-.55*smoothstep(.0,1.,edge)*(1.-cover)*.6;  // 탄 자국
    vec3 glow=mix(vec3(1.,.416,.239),vec3(.843,.949,.294),smoothstep(.5,1.,edge));
    col+=glow*pow(edge,1.6)*1.25;
    gl_FragColor=vec4(col,1.);}`;
  const sh = (t, src) => { const o = gl.createShader(t); gl.shaderSource(o, src); gl.compileShader(o); return o; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr); gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  const tex = (unit, src, name) => {
    const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
    [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER].forEach(p => gl.texParameteri(gl.TEXTURE_2D, p, gl.LINEAR));
    [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach(p => gl.texParameteri(gl.TEXTURE_2D, p, gl.CLAMP_TO_EDGE));
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); gl.uniform1i(gl.getUniformLocation(pr, name), unit); return t;
  };
  tex(0, site, 'uSite'); tex(1, code, 'uCode');
  const trail = document.createElement('canvas'); trail.width = 320; trail.height = 200; const tg = trail.getContext('2d');
  tg.fillStyle = '#000'; tg.fillRect(0, 0, 320, 200); const tTex = tex(2, trail, 'uTrail');
  const uP = gl.getUniformLocation(pr, 'uP'), uT = gl.getUniformLocation(pr, 'uT');

  // 커서 자국
  let last = null, lastMove = 0, start = Infinity, vis = false, running = false;
  const stamp = (x, y) => {
    const pts = last ? Math.ceil(Math.hypot(x - last[0], y - last[1]) / 4) : 1;
    for (let i = 1; i <= pts; i++) {
      const px = last ? last[0] + (x - last[0]) * i / pts : x, py = last ? last[1] + (y - last[1]) * i / pts : y;
      const gr = tg.createRadialGradient(px, py, 0, px, py, 30); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      tg.fillStyle = gr; tg.fillRect(px - 30, py - 30, 60, 60);
    }
    last = [x, y];
  };
  const toTrail = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * 320, (e.clientY - r.top) / r.height * 200]; };
  cv.addEventListener('pointermove', e => { lastMove = performance.now(); stamp(...toTrail(e)); });
  cv.addEventListener('pointerleave', () => { last = null; });
  box.querySelector('.burn-replay').onclick = () => { start = performance.now(); tg.fillStyle = '#000'; tg.fillRect(0, 0, 320, 200); last = null; };

  fit(); addEventListener('resize', fit);
  // 화면에 들어올 때 불타기 시작, 화면 밖에선 멈춤
  new IntersectionObserver(([en]) => {
    vis = en.isIntersecting;
    if (vis && start === Infinity) start = performance.now();
    if (vis && !running) { running = true; requestAnimationFrame(frame); }
  }, {threshold: 0.35}).observe(box);
  const DUR = 2600;
  const frame = now => {
    const t = start === Infinity ? 0 : (now - start) / DUR, p = reduce ? 1.1 : Math.min(1.1, t < 0 ? 0 : 1 - Math.pow(1 - Math.min(t, 1), 2.2)) * 1.1;
    // 가만히 있으면 유령 커서가 대신 문지른다 (폰·영상 녹화용)
    if (!reduce && t > 1.2 && now - lastMove > 2500) {
      const q = now / 1000; stamp(160 + Math.sin(q * 0.9) * 120, 100 + Math.sin(q * 1.7) * 70);
    } else if (now - lastMove > 2500) last = null;
    tg.fillStyle = 'rgba(0,0,0,.035)'; tg.fillRect(0, 0, 320, 200);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, tTex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, trail);
    gl.uniform1f(uP, p); gl.uniform1f(uT, now / 1000); gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (vis) requestAnimationFrame(frame); else running = false;
  };
})();
