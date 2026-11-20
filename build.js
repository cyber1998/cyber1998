// Builds the SVG panels for the GitHub profile README in the same look as
// cybernaskar.com: white boards, blueprint grid, corner brackets, Inter Tight /
// Instrument Serif / IBM Plex Mono, and the cyan/red glitch.
// Run: node build.js   (writes into ./assets)
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'assets');
const C = {
  ink: '#0a0a0b', text2: '#45454d', text3: '#7d7d87',
  border: '#e2e2e6', borderStrong: '#bdbdc4', subtle: '#f6f6f8',
  red: 'rgb(232,64,88)', cyan: 'rgb(44,190,222)'
};
const SANS = "'Inter Tight','Inter','Helvetica Neue',Helvetica,Arial,sans-serif";
const SERIF = "'Instrument Serif','Iowan Old Style','Palatino Linotype',Georgia,serif";
const MONO = "'IBM Plex Mono','SFMono-Regular',Menlo,Consolas,monospace";
const CYCLE = 7; // seconds per glitch loop

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function svg(w, h, body, defs = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs>
  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
    <path d="M40 0H0V40" fill="none" stroke="rgba(0,0,0,0.045)" stroke-width="1"/>
  </pattern>
  ${defs}
</defs>
${body}
</svg>
`;
}

// Sections with a heading sit on their own white board, so the heading stays
// readable when GitHub is in dark mode.
function framed(w, h, body, defs) {
  const pad = 36, k = (w - pad * 2) / w;
  const H = Math.round(h * k + pad * 2);
  return svg(w, H, `${board(0, 0, w, H)}
<g transform="translate(${pad} ${pad}) scale(${k.toFixed(4)})">${body}</g>`, defs);
}

// White board with a faint grid and the site's corner brackets
function board(x, y, w, h, { grid = true, corner = C.ink, fill = '#ffffff', len = 22 } = {}) {
  const b = (px, py, dx, dy) =>
    `<path d="M${px} ${py + dy * len}V${py}H${px + dx * len}" fill="none" stroke="${corner}" stroke-width="2"/>`;
  return `<rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" fill="${fill}" stroke="${C.border}"/>
${grid ? `<rect x="${x + 1}" y="${y + 1}" width="${w - 2}" height="${h - 2}" fill="url(#grid)"/>` : ''}
${b(x, y, 1, 1)}${b(x + w, y, -1, 1)}${b(x, y + h, 1, -1)}${b(x + w, y + h, -1, -1)}`;
}

// Discrete SMIL track that holds `rest` except during a burst at `at` seconds
function burst(attr, at, rest, frames, step = 0.07) {
  const times = [0];
  const vals = [rest];
  frames.forEach((v, i) => {
    times.push((at + i * step) / CYCLE);
    vals.push(v);
  });
  times.push((at + frames.length * step) / CYCLE);
  vals.push(rest);
  return `<animate attributeName="${attr}" dur="${CYCLE}s" repeatCount="indefinite" calcMode="discrete" keyTimes="${times.map((t) => t.toFixed(4)).join(';')}" values="${vals.join(';')}"/>`;
}
function burstMove(at, frames, step = 0.07) {
  const times = [0];
  const vals = ['0 0'];
  frames.forEach((v, i) => {
    times.push((at + i * step) / CYCLE);
    vals.push(v + ' 0');
  });
  times.push((at + frames.length * step) / CYCLE);
  vals.push('0 0');
  return `<animateTransform attributeName="transform" type="translate" dur="${CYCLE}s" repeatCount="indefinite" calcMode="discrete" keyTimes="${times.map((t) => t.toFixed(4)).join(';')}" values="${vals.join(';')}"/>`;
}

// Glitch for a block of text: soft cyan/red fringes plus two sliced copies
// that jump sideways, the same recipe as the site's headings.
function glitchText(id, content, box, at) {
  const { y, h } = box;
  const slice = (fracs) => fracs.map(([a, b]) => [Math.round(y + a * h), Math.round(h * (b - a))]);
  const A = slice([[0.10, 0.30], [0.55, 0.80], [0.30, 0.50], [0.80, 0.95]]);
  const B = slice([[0.65, 0.90], [0.05, 0.25], [0.45, 0.65], [0.15, 0.40]]);
  const clip = (cid, s) => `<clipPath id="${cid}"><rect x="0" width="2000" y="-10" height="0">
    ${burst('y', at, -10, s.map((v) => v[0]))}${burst('height', at, 0, s.map((v) => v[1]))}</rect></clipPath>`;
  const defs = `<g id="${id}">${content}</g>${clip(id + '-ca', A)}${clip(id + '-cb', B)}`;
  const body = `
<g opacity="0">${burst('opacity', at, 0, [0.55, 0.55, 0.55, 0.55])}${burstMove(at, [-3, -2, -3, -2])}<use href="#${id}" xlink:href="#${id}" fill="${C.cyan}" style="fill:${C.cyan}"/></g>
<g opacity="0">${burst('opacity', at, 0, [0.55, 0.55, 0.55, 0.55])}${burstMove(at, [3, 2, 3, 2])}<use href="#${id}" xlink:href="#${id}" fill="${C.red}" style="fill:${C.red}"/></g>
<use href="#${id}" xlink:href="#${id}" style="fill:${C.ink}"/>
<g clip-path="url(#${id}-ca)">${burstMove(at, [-4, 5, -3, 4])}<use href="#${id}" xlink:href="#${id}" style="fill:${C.red};opacity:0.85"/></g>
<g clip-path="url(#${id}-cb)">${burstMove(at, [4, -5, 3, -4])}<use href="#${id}" xlink:href="#${id}" style="fill:${C.cyan};opacity:0.85"/></g>`;
  return { defs, body };
}

// ---------- Header: hero text + an at-a-glance card ----------
function header() {
  const W = 1200, H = 600;

  const title = glitchText('title',
    `<text x="48" y="262" font-family="${SANS}" font-size="84" font-weight="700" letter-spacing="-3.4">I build systems</text>
     <text x="48" y="346" font-family="${SERIF}" font-size="88" font-style="italic" letter-spacing="-1.5">that scale.</text>`,
    { y: 186, h: 180 }, 1.0);

  const sub = [
    'Backend engineer and software consultant helping',
    'teams design, build, and optimize production-grade',
    'systems. From high-traffic APIs to AI-powered features.'
  ].map((l, i) => `<text x="68" y="${424 + i * 30}" font-family="${SANS}" font-size="19" fill="${C.text2}">${esc(l)}</text>`).join('');

  const meta = ['8+ years experience', 'Pune, India', 'Remote-friendly'];
  let mx = 48;
  const metaSvg = meta.map((m) => {
    const t = `<text x="${mx}" y="548" font-family="${MONO}" font-size="14" fill="${C.text3}"><tspan fill="${C.ink}">/ </tspan>${esc(m)}</text>`;
    mx += (m.length + 2) * 8.6 + 22;
    return t;
  }).join('');

  const cx = 808, cy = 150, cw = 344;
  const rows = [
    ['Role', 'Senior Software Engineer'],
    ['At', 'Anatta · Shopify Platinum Partner'],
    ['Focus', 'Backend + AI'],
    ['Stack', 'Python · Django · GraphQL · LLMs'],
    ['Based', 'Pune, India · Remote']
  ];
  const rowH = 58, top = cy + 64;
  const ch = top - cy + rows.length * rowH + 8;
  const card = `${board(cx, cy, cw, ch, { grid: false, fill: '#fbfbfc' })}
<text x="${cx + 26}" y="${cy + 40}" font-family="${MONO}" font-size="13" fill="${C.text3}">At a glance</text>
${rows.map(([k, v], i) => {
    const y = top + i * rowH;
    return `<line x1="${cx + 26}" y1="${y}" x2="${cx + cw - 26}" y2="${y}" stroke="${C.border}"/>
<text x="${cx + 26}" y="${y + 22}" font-family="${MONO}" font-size="12" fill="${C.text3}">${esc(k)}</text>
<text x="${cx + 26}" y="${y + 45}" font-family="${SANS}" font-size="17" font-weight="500" fill="${C.ink}">${esc(v)}</text>`;
  }).join('\n')}`;

  const body = `${board(0, 0, W, H)}
<rect x="48" y="40" width="34" height="34" fill="#fff" stroke="${C.ink}" stroke-width="1.5"/>
<rect x="78" y="70" width="6" height="6" fill="${C.text3}"/>
<text x="65" y="63" text-anchor="middle" font-family="${MONO}" font-size="16" font-weight="600" fill="${C.ink}">C</text>
<text x="96" y="63" font-family="${SANS}" font-size="18" font-weight="600" letter-spacing="-0.3" fill="${C.ink}">Cyber Naskar</text>
<text x="${W - 48}" y="62" text-anchor="end" font-family="${MONO}" font-size="14" fill="${C.text2}">cybernaskar.com</text>
<line x1="48" y1="100" x2="${W - 48}" y2="100" stroke="${C.border}"/>
${title.body}
<rect x="48" y="404" width="2" height="72" fill="${C.ink}"/>
${sub}
${metaSvg}
${card}`;
  return svg(W, H, body, title.defs);
}

// ---------- Buttons ----------
function button(label, primary) {
  const w = Math.round(label.length * 9.4 + 52), h = 52, cut = 10;
  const shape = primary
    ? `<path d="M0 0H${w - cut}L${w} ${cut}V${h}H${cut}L0 ${h - cut}Z" fill="${C.ink}"/>`
    : `<rect x="0.75" y="0.75" width="${w - 1.5}" height="${h - 1.5}" fill="#fff" stroke="${C.borderStrong}" stroke-width="1.5"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
${shape}
<text x="${w / 2}" y="31.5" text-anchor="middle" font-family="${MONO}" font-size="15" font-weight="600" fill="${primary ? '#fff' : C.ink}">${esc(label)}</text>
</svg>
`;
}

// ---------- Stats ----------
function stats() {
  const W = 1200, H = 184, gap = 18, cw = (W - gap * 2) / 3;
  const items = [
    ['Experience', '8+', 'years', ['Senior-level backend engineering', 'across startups and enterprise clients.']],
    ['Client work', '7+', 'teams', ['Consultant first. Direct access,', 'async-friendly.']],
    ['Primary focus', 'Backend', '+ AI', ['APIs, data, and LLM features that', 'hold up in production.']]
  ];
  const body = items.map(([label, big, small, desc], i) => {
    const x = i * (cw + gap);
    const bigW = big.length * (big.length > 3 ? 27 : 30);
    return `${board(x, 0, cw, H, { corner: C.borderStrong })}
<text x="${x + 28}" y="44" font-family="${MONO}" font-size="13" fill="${C.text3}">${esc(label)}</text>
<text x="${x + 26}" y="100" font-family="${SANS}" font-size="48" font-weight="700" letter-spacing="-2" fill="${C.ink}">${esc(big)}<tspan dx="8" font-size="22" font-weight="600" letter-spacing="-0.4">${esc(small)}</tspan></text>
${desc.map((d, j) => `<text x="${x + 28}" y="${138 + j * 22}" font-family="${SANS}" font-size="15" fill="${C.text2}">${esc(d)}</text>`).join('')}`;
  }).join('\n');
  return svg(W, H, body);
}

// ---------- Section heading with the glitch ----------
function heading(id, text, accent, at) {
  return glitchText(id,
    `<text x="0" y="46" font-family="${SANS}" font-size="44" font-weight="700" letter-spacing="-1.6">${esc(text)} <tspan font-family="${SERIF}" font-style="italic" font-weight="400" letter-spacing="-0.5">${esc(accent)}</tspan></text>`,
    { y: 6, h: 52 }, at);
}

// ---------- Now: current role ----------
function now() {
  const W = 1200, H = 420;
  const hd = heading('now-h', 'Right', 'now.', 2.4);
  const bx = 0, by = 86, bw = W, bh = H - by;
  const pill = 'Oct 2026 – Present';
  const pw = pill.length * 7.6 + 22;
  const points = [
    'Engineering for luxury brands M.Gemi and John Hardy across performance optimisation, load testing, and security hardening',
    'Building a generic backend ecosystem product for developers and management, boosting team efficiency and project delivery'
  ];
  const brands = [
    ['John Hardy', 'Luxury jewellery house', '$100M+ annual revenue'],
    ['M.Gemi', 'Handmade Italian luxury footwear', '$80M+ venture-backed']
  ];
  const cardW = (bw - 64 - 14) / 2;
  const body = `${hd.body}
${board(bx, by, bw, bh, { corner: C.borderStrong })}
<text x="32" y="${by + 50}" font-family="${SANS}" font-size="24" font-weight="600" letter-spacing="-0.4" fill="${C.ink}">Senior Software Engineer</text>
<text x="32" y="${by + 78}" font-family="${SANS}" font-size="16" fill="${C.ink}">Anatta · Shopify Platinum Partner · Remote, as a consultant</text>
<rect x="${bw - 32 - pw}" y="${by + 30}" width="${pw}" height="28" fill="#fff" stroke="rgba(0,0,0,0.45)"/>
<text x="${bw - 32 - pw / 2}" y="${by + 49}" text-anchor="middle" font-family="${MONO}" font-size="13" fill="${C.ink}">${esc(pill)}</text>
${points.map((p, i) => `<text x="32" y="${by + 124 + i * 30}" font-family="${MONO}" font-size="15" font-weight="700" fill="${C.ink}">&gt;</text>
<text x="54" y="${by + 124 + i * 30}" font-family="${SANS}" font-size="16" fill="${C.text2}">${esc(p)}</text>`).join('\n')}
${brands.map(([n, d, f], i) => {
    const x = 32 + i * (cardW + 14), y = by + 192;
    return `<rect x="${x + 0.5}" y="${y + 0.5}" width="${cardW - 1}" height="111" fill="${C.subtle}" stroke="${C.border}"/>
<text x="${x + 20}" y="${y + 38}" font-family="${SERIF}" font-style="italic" font-size="28" fill="${C.ink}">${esc(n)}</text>
<text x="${x + 20}" y="${y + 64}" font-family="${SANS}" font-size="15" fill="${C.text2}">${esc(d)}</text>
<text x="${x + 20}" y="${y + 92}" font-family="${MONO}" font-size="13" fill="${C.ink}">${esc(f)}</text>`;
  }).join('\n')}`;
  return framed(W, H, body, hd.defs);
}

// ---------- Stack ----------
function stack() {
  const W = 1200;
  const hd = heading('stack-h', 'The', 'stack.', 5.2);
  const rows = [
    ['Core', ['Python', 'Django', 'FastAPI', 'GraphQL', 'Postgres', 'MySQL', 'Redis', 'TypeScript']],
    ['Cloud', ['AWS', 'GCP', 'Docker', 'Pinecone', 'pgvector']],
    ['AI', ['LangChain', 'PydanticAI', 'OpenAI', 'Gemini', 'Anthropic', 'Agentic workflows', 'Guardrails']]
  ];
  const top = 86, rowH = 62, H = top + 40 + rows.length * rowH + 16;
  let out = `${hd.body}\n${board(0, top, W, H - top, { corner: C.borderStrong })}`;
  rows.forEach(([label, tags], r) => {
    const y = top + 36 + r * rowH;
    out += `<text x="32" y="${y + 24}" font-family="${MONO}" font-size="13" fill="${C.text3}">${esc(label)}</text>`;
    let x = 140;
    tags.forEach((t) => {
      const w = Math.round(t.length * 8.4 + 30);
      out += `<rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="37" fill="#fff" stroke="${C.borderStrong}"/>
<text x="${x + w / 2}" y="${y + 24}" text-anchor="middle" font-family="${SANS}" font-size="15" font-weight="500" fill="${C.ink}">${esc(t)}</text>`;
      x += w + 10;
    });
  });
  return framed(W, H, out, hd.defs);
}

const files = {
  'header.svg': header(),
  'stats.svg': stats(),
  'now.svg': now(),
  'stack.svg': stack(),
  'btn-call.svg': button('Book a call →', true),
  'btn-site.svg': button('Website', false),
  'btn-chat.svg': button('Chat with my AI', false),
  'btn-linkedin.svg': button('LinkedIn', false)
};
for (const [name, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(OUT, name), content);
  console.log(name.padEnd(18), (Buffer.byteLength(content) / 1024).toFixed(1) + ' KB');
}
