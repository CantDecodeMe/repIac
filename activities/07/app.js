/* Actividad 07 · Animación didáctica de JWT
   Vanilla JS, sin dependencias. HMAC-SHA256 implementado a mano para que
   funcione igual en http, https y file:// (SubtleCrypto exige contexto seguro). */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const nowSec = () => Math.floor(Date.now() / 1000);

  /* ---------- SHA-256 / HMAC / base64url ---------- */
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);

  function sha256(msg) {
    const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
    const len = msg.length;
    const padLen = ((len + 9 + 63) >> 6) << 6;
    const buf = new Uint8Array(padLen);
    buf.set(msg);
    buf[len] = 0x80;
    const dv = new DataView(buf.buffer);
    dv.setUint32(padLen - 8, Math.floor((len * 8) / 2 ** 32));
    dv.setUint32(padLen - 4, (len * 8) >>> 0);
    const w = new Uint32Array(64);
    for (let o = 0; o < padLen; o += 64) {
      for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
      for (let i = 16; i < 64; i++) {
        const a = w[i - 15], b = w[i - 2];
        const s0 = ((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3);
        const s1 = ((b >>> 17) | (b << 15)) ^ ((b >>> 19) | (b << 13)) ^ (b >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) {
        const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
        const ch = (e & f) ^ (~e & g);
        const t1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
        const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + maj) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0;
        d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
    }
    const out = new Uint8Array(32);
    const odv = new DataView(out.buffer);
    H.forEach((v, i) => odv.setUint32(i * 4, v));
    return out;
  }

  function hmacSha256(key, msg) {
    if (key.length > 64) key = sha256(key);
    const ipad = new Uint8Array(64 + msg.length);
    const opad = new Uint8Array(64 + 32);
    for (let i = 0; i < 64; i++) {
      const k = key[i] || 0;
      ipad[i] = k ^ 0x36;
      opad[i] = k ^ 0x5c;
    }
    ipad.set(msg, 64);
    opad.set(sha256(ipad), 64);
    return sha256(opad);
  }

  const utf8 = (s) => new TextEncoder().encode(s);
  const b64uBytes = (bytes) => {
    let bin = '';
    bytes.forEach((b) => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  const b64uStr = (s) => b64uBytes(utf8(s));
  const b64uDecode = (s) => {
    let t = s.replace(/-/g, '+').replace(/_/g, '/');
    while (t.length % 4) t += '=';
    return new TextDecoder().decode(Uint8Array.from(atob(t), (c) => c.charCodeAt(0)));
  };

  /* ---------- Modelo de token ---------- */
  const SECRET = 'secreto-de-clase';
  const HEADER = { alg: 'HS256', typ: 'JWT', kid: 'k-2026-01' };
  const sign = (h, p, secret = SECRET) => b64uBytes(hmacSha256(utf8(secret), utf8(`${h}.${p}`)));

  function makeToken(payload, header = HEADER, secret = SECRET) {
    const h = b64uStr(JSON.stringify(header));
    const p = b64uStr(JSON.stringify(payload));
    const s = sign(h, p, secret);
    return { h, p, s, header, payload, str: `${h}.${p}.${s}` };
  }

  /** Verificación como la haría el servidor. */
  function verifyToken(str, secret = SECRET, at = nowSec()) {
    const parts = String(str).trim().split('.');
    if (parts.length !== 3) return { ok: false, why: 'No tiene 3 partes separadas por puntos.' };
    let header, payload;
    try { header = JSON.parse(b64uDecode(parts[0])); payload = JSON.parse(b64uDecode(parts[1])); }
    catch { return { ok: false, why: 'Header o payload no se pueden decodificar.' }; }
    if (header.alg !== 'HS256') return { ok: false, why: `Algoritmo «${header.alg}» no permitido (solo HS256).`, payload };
    if (sign(parts[0], parts[1], secret) !== parts[2]) return { ok: false, why: 'Firma inválida: el contenido fue alterado o el secreto no coincide.', payload };
    if (typeof payload.exp === 'number' && payload.exp <= at) return { ok: false, expired: true, why: 'Firma válida, pero el token expiró.', payload };
    return { ok: true, why: 'Firma válida y token vigente.', payload };
  }

  const pretty = (o) => JSON.stringify(o, null, 2);
  const fmtTime = (sec) => new Date(sec * 1000).toLocaleTimeString('es-MX', { hour12: false });
  const partsHTML = (t, seg = [t.h, t.p, t.s]) =>
    `<span class="part part-hdr c-hdr">${esc(seg[0])}</span><span class="c-dot">.</span>` +
    `<span class="part part-pay c-pay">${esc(seg[1])}</span><span class="c-dot">.</span>` +
    `<span class="part part-sig c-sig">${esc(seg[2])}</span>`;

  const base = nowSec();
  const DEMO = makeToken({ sub: 'ana', name: 'Ana Ruiz', role: 'lector', iat: base, exp: base + 900 });

  /* ---------- Barra de progreso ---------- */
  const bar = $('#progress');
  const hero = $('#hero');
  const heroTok = $('#hero-token');
  let ticking = false;

  function onScroll() {
    ticking = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? clamp(scrollY / max) : 0})`;

    // El token del hero se escribe conforme avanza el scroll.
    const r = hero.getBoundingClientRect();
    const p = clamp(-r.top / Math.max(1, r.height - innerHeight) / 0.8);
    const total = DEMO.str.length;
    const n = Math.round(total * p);
    const a = Math.min(n, DEMO.h.length);
    const dot1 = n > DEMO.h.length ? 1 : 0;
    const b = clamp(n - DEMO.h.length - 1, 0, DEMO.p.length);
    const dot2 = n > DEMO.h.length + 1 + DEMO.p.length ? 1 : 0;
    const c = clamp(n - DEMO.h.length - DEMO.p.length - 2, 0, DEMO.s.length);
    heroTok.innerHTML =
      `<span class="c-hdr">${esc(DEMO.h.slice(0, a))}</span>${dot1 ? '<span class="c-dot">.</span>' : ''}` +
      `<span class="c-pay">${esc(DEMO.p.slice(0, b))}</span>${dot2 ? '<span class="c-dot">.</span>' : ''}` +
      `<span class="c-sig">${esc(DEMO.s.slice(0, c))}</span>${n < total ? '<span class="caret"></span>' : ''}`;
  }
  const requestTick = () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } };
  addEventListener('scroll', requestTick, { passive: true });
  addEventListener('resize', requestTick);
  onScroll();

  /* ---------- Motor de scrollytelling ---------- */
  function scrolly(root, { onStep, onVisible } = {}) {
    const steps = $$('.step', root);
    let current = 0;
    let seen = false;
    const set = (n) => {
      current = n;
      root.dataset.step = n;
      steps.forEach((s) => s.classList.toggle('is-active', +s.dataset.step === n));
      $$('[data-from]', root).forEach((el) => el.classList.toggle('on', n >= +el.dataset.from));
      $$('[data-only]', root).forEach((el) => el.classList.toggle('on', el.dataset.only.split(' ').includes(String(n))));
      if (onStep) onStep(n);
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) set(+e.target.dataset.step); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    steps.forEach((s) => io.observe(s));
    new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting) && !seen) { seen = true; if (onVisible) onVisible(); if (onStep) onStep(current); }
    }, { threshold: 0.25 }).observe(root);
    set(1);
    return { get step() { return current; }, get seen() { return seen; } };
  }

  /* ---------- 2 · Anatomía ---------- */
  const anatTok = $('#anat-token');
  anatTok.innerHTML = partsHTML(DEMO);
  $('#dec-header').textContent = pretty(DEMO.header);
  $('#dec-payload').textContent = pretty(DEMO.payload);
  $('#dec-sig').textContent = `${DEMO.s}\n\n= 32 bytes (256 bits)\n= ${DEMO.s.length} caracteres en base64url`;
  scrolly($('#anatomia'), {
    onStep: (n) => {
      const f = { 2: 'hdr', 3: 'pay', 4: 'sig' }[n];
      if (f) anatTok.dataset.focus = f; else delete anatTok.dataset.focus;
    },
  });

  /* ---------- 2b · Probador ---------- */
  const liveIn = $('#live-input');
  const liveSecret = $('#live-secret');
  liveIn.value = DEMO.str;
  liveIn.style.color = 'var(--color-ink)';
  function renderLive() {
    const raw = liveIn.value.trim();
    const [h, p] = raw.split('.');
    const show = (el, part) => {
      try { el.textContent = pretty(JSON.parse(b64uDecode(part))); } catch { el.textContent = '— no se puede decodificar —'; }
    };
    show($('#live-header'), h || '');
    show($('#live-payload'), p || '');
    const v = verifyToken(raw, liveSecret.value);
    const out = $('#live-verdict');
    out.className = `status ${v.ok ? 's200' : 's401'}`;
    out.textContent = (v.ok ? '✓ ' : '✗ ') + v.why;
  }
  liveIn.addEventListener('input', renderLive);
  liveSecret.addEventListener('input', renderLive);
  renderLive();

  /* ---------- 3 · Construcción ---------- */
  $('#b-hdr-json').textContent = pretty(DEMO.header);
  $('#b-hdr-src').textContent = JSON.stringify(DEMO.header);
  $('#b-hdr-b64').textContent = DEMO.h;
  $('#b-pay-src').textContent = JSON.stringify(DEMO.payload);
  $('#b-pay-b64').textContent = DEMO.p;
  $('#b-sig-f').textContent = `HMAC-SHA256(\n  clave = "${SECRET}",\n  datos = "${DEMO.h.slice(0, 12)}…${DEMO.p.slice(0, 8)}…"\n)\n→ base64url → ${DEMO.s}`;
  $('#b-final').innerHTML = partsHTML(DEMO);
  scrolly($('#construccion'));

  /* ---------- 4 · Viaje por la API ---------- */
  const NODE = { client: $('#n-client'), auth: $('#n-auth'), libros: $('#n-libros') };
  const packet = $('#packet');
  const packetLabel = $('#packet-label');
  const wallet = $('#wallet');
  const ROUTE = { // centros del paquete: [inicio, fin]
    c2a: [[245, 123], [385, 82]], a2c: [[385, 82], [245, 123]],
    c2l: [[245, 202], [385, 253]], l2c: [[385, 253], [245, 202]],
  };
  const SUBS = { client: 'navegador / app', auth: 'emite tokens', libros: 'datos protegidos' };
  const STEPS = [
    null,
    { hot: ['client', 'auth'], send: ['c2a', 'POST /login', ''] },
    { hot: ['auth'], subs: { auth: 'firma el JWT ✍' } },
    { hot: ['auth', 'client'], send: ['a2c', '200 + JWT', 'token-packet'] },
    { hot: ['client'], subs: { client: 'token guardado ✓' } },
    { hot: ['client', 'libros'], send: ['c2l', 'Bearer eyJ…', 'token-packet'] },
    { hot: ['libros'], subs: { libros: 'verifica firma + exp' }, verify: true },
    { hot: ['libros', 'client'], send: ['l2c', '200 OK', 'ok'] },
  ];
  let verifyTimers = [];

  function renderJourney(n) {
    const s = STEPS[n];
    if (!s) return;
    Object.entries(NODE).forEach(([k, el]) => el.classList.toggle('hot', s.hot.includes(k)));
    Object.entries(SUBS).forEach(([k, txt]) => { $(`#${k}-sub`).textContent = (s.subs && s.subs[k]) || txt; });
    // La cartera del cliente conserva el token desde el paso 4 en adelante.
    wallet.classList.toggle('on', n >= 4);
    if (n === 4) $('#client-sub').textContent = 'token guardado ✓';
    packet.getAnimations().forEach((a) => a.cancel());
    if (s.send) {
      const [route, label, cls] = s.send;
      const [[x0, y0], [x1, y1]] = ROUTE[route];
      packet.setAttribute('class', `packet ${cls}`);
      packetLabel.textContent = label;
      packet.animate([
        { opacity: 0, transform: `translate(${x0}px, ${y0}px)` },
        { opacity: 1, transform: `translate(${x0}px, ${y0}px)`, offset: 0.12 },
        { opacity: 1, transform: `translate(${x1}px, ${y1}px)` },
      ], { duration: reduceMotion ? 1 : 1100, easing: 'ease-in-out', fill: 'forwards' });
    } else {
      packet.style.opacity = 0;
    }
    verifyTimers.forEach(clearTimeout);
    verifyTimers = [];
    const rows = $$('#verify-list .check-row');
    rows.forEach((r) => { r.className = 'check-row pending'; $('.mark', r).textContent = '·'; });
    if (s.verify) {
      rows.forEach((r, i) => verifyTimers.push(setTimeout(() => { r.className = 'check-row pass'; $('.mark', r).textContent = '✓'; }, 500 + i * 600)));
    }
  }
  scrolly($('#viaje'), { onStep: renderJourney });

  /* ---------- 5 · Expiración ---------- */
  const LIFE = 30;
  const ring = $('#exp-ring');
  const secsEl = $('#exp-secs');
  const resEl = $('#exp-result');
  const seqEl = $('#exp-seq');
  let tok = null;
  let wasDead = false;
  let seqTimers = [];

  function issue(offsetSec = 0) {
    const iat = nowSec() - offsetSec;
    tok = makeToken({ sub: 'ana', iat, exp: iat + LIFE });
    $('#exp-payload').textContent =
      `{\n  "sub": "ana",\n  "iat": ${tok.payload.iat},  // ${fmtTime(tok.payload.iat)}\n  "exp": ${tok.payload.exp},  // ${fmtTime(tok.payload.exp)}\n}`;
    resEl.textContent = '';
    seqTimers.forEach(clearTimeout);
    seqEl.innerHTML = '';
    wasDead = false;
    tick();
  }

  function playSeq() {
    const at = nowSec();
    const lines = [
      `<span class="c-dot">1.</span> Cliente → <b>GET /libros</b> con <code>Authorization: Bearer …</code>`,
      `<span class="c-dot">2.</span> Servidor recalcula la firma → <span class="c-dot">✓ coincide (nadie alteró el token)</span>`,
      `<span class="c-dot">3.</span> Compara <code>exp</code> = ${tok.payload.exp} con su reloj = ${at} → <span style="color:var(--color-bad)">✗ ${tok.payload.exp} ≤ ${at}</span>`,
      `<span class="c-dot">4.</span> Responde <span class="status s401">401 Unauthorized</span> <span class="c-dot">· WWW-Authenticate: Bearer error="invalid_token"</span>`,
    ];
    seqEl.innerHTML = lines.map((l) => `<li>${l}</li>`).join('');
    $$('li', seqEl).forEach((li, i) => seqTimers.push(setTimeout(() => li.classList.add('on'), reduceMotion ? 0 : 350 + i * 700)));
  }

  function tick() {
    if (!tok) return;
    const leftMs = tok.payload.exp * 1000 - Date.now();
    const left = Math.max(0, Math.ceil(leftMs / 1000));
    secsEl.textContent = left;
    ring.style.setProperty('--p', clamp(leftMs / (LIFE * 1000)));
    ring.classList.toggle('warn', left <= 10 && left > 0);
    ring.classList.toggle('dead', left === 0);
    if (left === 0 && !wasDead) { wasDead = true; playSeq(); }
  }
  setInterval(tick, 200);

  $('#exp-req').addEventListener('click', () => {
    const v = verifyToken(tok.str);
    resEl.innerHTML = v.ok
      ? '<span class="status s200">200 OK</span> firma válida y vigente'
      : `<span class="status s401">401 Unauthorized</span> ${esc(v.why)}`;
  });
  $('#exp-skip').addEventListener('click', () => issue(LIFE));
  $('#exp-reset').addEventListener('click', () => issue());
  issue();
  scrolly($('#expiracion'), { onVisible: () => { if (!wasDead) issue(); } });

  /* ---------- 6 · Refresco ---------- */
  const t1 = nowSec();
  $('#ref-old').textContent = `"iat": ${t1 - 900}  // ${fmtTime(t1 - 900)}\n"exp": ${t1}  // ${fmtTime(t1)}`;
  $('#ref-new').textContent = `"iat": ${t1}  // ${fmtTime(t1)}\n"exp": ${t1 + 900}  // ${fmtTime(t1 + 900)}`;
  const lifeA = $('#life-a');
  scrolly($('#refresco'), {
    onStep: (n) => {
      const dead = n === 2;
      lifeA.style.width = dead ? '0%' : '100%';
      lifeA.style.background = dead ? 'var(--color-bad)' : 'var(--color-pay)';
      $('#life-a-txt').textContent = dead ? 'vencido' : n >= 3 ? 'renovado · 15:00' : '15:00';
      $('#life-r-txt').textContent = '7 días';
    },
  });

  /* ---------- 7 · Seguridad ---------- */
  const T0 = makeToken({ sub: 'ana', role: 'lector', iat: base, exp: base + 900 });
  const tamperTok = $('#tamper-token');
  const tamperPay = $('#tamper-payload');
  const tamperV = $('#tamper-verdict');
  function renderTamper(tampered) {
    const p = tampered ? b64uStr(JSON.stringify({ ...T0.payload, role: 'admin' })) : T0.p;
    const str = `${T0.h}.${p}.${T0.s}`;
    tamperTok.innerHTML = partsHTML(T0, [T0.h, p, T0.s]);
    tamperPay.textContent = pretty(JSON.parse(b64uDecode(p)));
    const v = verifyToken(str);
    tamperV.innerHTML = v.ok
      ? '<span class="status s200">200 OK</span> La firma coincide: el servidor confía.'
      : `<span class="status s401">401</span> ${esc(v.why)}`;
  }
  $('#tamper-go').addEventListener('click', () => renderTamper(true));
  $('#tamper-undo').addEventListener('click', () => renderTamper(false));
  renderTamper(false);

  const boxes = $$('.checklist input');
  const countEl = $('#check-count');
  boxes.forEach((b) => b.addEventListener('change', () => {
    const n = boxes.filter((x) => x.checked).length;
    countEl.textContent = `${n} / ${boxes.length}`;
    countEl.className = `status ${n === boxes.length ? 's200' : 's401'}`;
    $('#check-done').hidden = n !== boxes.length;
  }));

  window.__jwt = { sha256, hmacSha256, makeToken, verifyToken, b64uStr, b64uDecode };
})();
