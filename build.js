// Builds the profile card: an HTTP request for /cyber1998 types itself out,
// then a 200 OK response arrives with a small JSON body. The status line
// glitches in cyan and red. Writes a light and a dark version into ./assets.
// Run: node build.js
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'assets');
const THEMES = {
  light: {
    bg: '#ffffff', border: '#e4e4e8', ink: '#0a0a0b', mid: '#62626c', faint: '#a8a8b0',
    red: 'rgb(232,64,88)', cyan: 'rgb(44,190,222)'
  },
  dark: {
    bg: '#0d0d10', border: '#26262c', ink: '#ededf0', mid: '#9d9da7', faint: '#5a5a64',
    red: 'rgb(240,84,108)', cyan: 'rgb(64,200,230)'
  }
};
const MONO = "'IBM Plex Mono','JetBrains Mono','SFMono-Regular',Menlo,Consolas,monospace";

const T = 13;          // seconds per loop
const FS = 19;         // font size
const CH = 11.6;       // approx. character width at FS
const LH = 31;         // line height
const PAD = 44;        // outer padding
const GUTTER = 54;     // line-number column

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Each line is a list of [text, tone, extra] runs.
function lines() {
  return [
    { type: 'typed', runs: [['GET', 'ink', 'bold'], [' /cyber1998 ', 'ink'], ['HTTP/1.1', 'faint']] },
    { type: 'typed', runs: [['Host: ', 'mid'], ['github.com', 'ink']] },
    { type: 'blank' },
    { type: 'status', runs: [['HTTP/1.1 ', 'faint'], ['200 OK', 'ink', 'bold']] },
    { type: 'out', runs: [['Content-Type: ', 'mid'], ['application/json', 'ink']] },
    { type: 'out', runs: [['X-Uptime: ', 'mid'], ['8+ years', 'ink']] },
    { type: 'blank' },
    { type: 'out', runs: [['{', 'faint']] },
    json('name', '"Cyber Naskar"'),
    json('works_as', '"Senior Software Engineer at Anatta, as a consultant"'),
    json('builds', '["backends", "APIs", "LLM features"]'),
    json('speaks', '["python", "django", "fastapi", "graphql", "postgres"]'),
    json('based_in', '"Pune, India"'),
    json('open_to', '"interesting problems"', true),
    { type: 'out', runs: [['}', 'faint']] }
  ];
}
function json(key, value, last) {
  return { type: 'out', runs: [['  "', 'faint'], [key, 'ink'], ['": ', 'faint'], [value, 'mid'], [last ? '' : ',', 'faint']] };
}

const pct = (s) => (s / T).toFixed(4);

// Width of a clip rect over time: hidden, then revealed (char by char or at once),
// held until just before the loop restarts.
function reveal(start, chars, perChar) {
  const times = [0], vals = [0];
  if (perChar) {
    for (let i = 1; i <= chars; i++) {
      times.push(pct(start + (i - 1) * perChar));
      vals.push((i * CH + 2).toFixed(1));
    }
  } else {
    times.push(pct(start));
    vals.push(2000);
  }
  times.push(pct(T - 0.5));
  vals.push(0);
  return `<animate attributeName="width" dur="${T}s" repeatCount="indefinite" calcMode="discrete" keyTimes="${times.join(';')}" values="${vals.join(';')}"/>`;
}

// Short burst track: rest value except for a few frames starting at `at`
function burst(attr, at, rest, frames, step = 0.07) {
  const times = [0], vals = [rest];
  frames.forEach((v, i) => { times.push(pct(at + i * step)); vals.push(v); });
  times.push(pct(at + frames.length * step)); vals.push(rest);
  return `<animate attributeName="${attr}" dur="${T}s" repeatCount="indefinite" calcMode="discrete" keyTimes="${times.join(';')}" values="${vals.join(';')}"/>`;
}
// Two bursts of sideways jumps on one transform track
function jumps(bursts, step = 0.07) {
  const times = [0], vals = ['0 0'];
  bursts.forEach(([at, frames]) => {
    frames.forEach((v, i) => { times.push(pct(at + i * step)); vals.push(v + ' 0'); });
    times.push(pct(at + frames.length * step)); vals.push('0 0');
  });
  return `<animateTransform attributeName="transform" type="translate" dur="${T}s" repeatCount="indefinite" calcMode="discrete" keyTimes="${times.join(';')}" values="${vals.join(';')}"/>`;
}
function flashes(bursts, value, step = 0.07) {
  const times = [0], vals = [0];
  bursts.forEach(([at, n]) => {
    for (let i = 0; i < n; i++) { times.push(pct(at + i * step)); vals.push(value); }
    times.push(pct(at + n * step)); vals.push(0);
  });
  return `<animate attributeName="opacity" dur="${T}s" repeatCount="indefinite" calcMode="discrete" keyTimes="${times.join(';')}" values="${vals.join(';')}"/>`;
}

function card(C) {
  const L = lines();
  const longest = Math.max(...L.map((l) => (l.runs || []).reduce((n, r) => n + r[0].length, 0)));
  const W = Math.round(PAD * 2 + GUTTER + longest * CH + 40);
  const H = PAD * 2 + L.length * LH;
  const x0 = PAD + GUTTER;

  const runSvg = (runs) => runs.map(([t, tone, extra]) =>
    `<tspan fill="${C[tone]}"${extra === 'bold' ? ' font-weight="600"' : ''}>${esc(t)}</tspan>`).join('');

  let t = 0.5;             // request starts typing
  const typeSpeed = 0.055;
  let defs = '', body = '';
  const cursorT = [], cursorXY = [];
  let statusAt = 0;

  L.forEach((line, i) => {
    const y = PAD + (i + 1) * LH - 9;
    const num = `<text x="${PAD + GUTTER - 22}" y="${y}" text-anchor="end" font-family="${MONO}" font-size="${FS - 3}" fill="${C.faint}">${i + 1}</text>`;
    if (line.type === 'blank') {
      t += 0.35;
      body += num;
      return;
    }
    const text = line.runs.map((r) => r[0]).join('');
    const typed = line.type === 'typed';
    if (line.type === 'status') { t += 0.45; statusAt = t; }
    const id = 'l' + i;
    defs += `<clipPath id="${id}"><rect x="${x0 - 2}" y="${y - LH + 8}" width="2000" height="${LH}">${reveal(t, text.length, typed ? typeSpeed : 0)}</rect></clipPath>`;
    if (typed) {
      for (let k = 0; k <= text.length; k++) {
        cursorT.push(t + k * typeSpeed);
        cursorXY.push([x0 + k * CH, y]);
      }
    }
    const content = `<text x="${x0}" y="${y}" font-family="${MONO}" font-size="${FS}" xml:space="preserve">${runSvg(line.runs)}</text>`;
    if (line.type === 'status') {
      // Glitch: cyan and red copies pull apart while the line itself jumps
      defs += `<g id="status">${content}</g>`;
      const b = [[statusAt + 0.25, 4], [statusAt + 5.2, 3]];
      body += `${num}<g clip-path="url(#${id})">
<g opacity="0">${flashes(b, 0.75)}${jumps([[b[0][0], [-3, -2, -4, -2]], [b[1][0], [-4, -2, -3]]])}<use href="#status" filter="url(#tint-c)"/></g>
<g opacity="0">${flashes(b, 0.75)}${jumps([[b[0][0], [3, 2, 4, 2]], [b[1][0], [4, 2, 3]]])}<use href="#status" filter="url(#tint-r)"/></g>
<g>${jumps([[b[0][0], [2, -3, 1, 0]], [b[1][0], [-2, 3, 0]]])}<use href="#status"/></g>
</g>`;
    } else {
      body += `${num}<g clip-path="url(#${id})">${content}</g>`;
    }
    t += typed ? text.length * typeSpeed + 0.25 : 0.09;
  });

  // Recolour a copy to one flat glitch colour, whatever its tspan fills are
  const tint = (id, color) => `<filter id="${id}" x="0" y="-20%" width="100%" height="140%"><feFlood flood-color="${color}"/><feComposite in2="SourceAlpha" operator="in"/></filter>`;
  defs += tint('tint-r', C.red) + tint('tint-c', C.cyan);

  // Block cursor: follows the typing, blinks while waiting, leaves when the response lands
  const endTyping = cursorT[cursorT.length - 1];
  const keyT = [0, ...cursorT.map(pct)];
  const xs = [cursorXY[0][0], ...cursorXY.map((p) => p[0])];
  const ys = [cursorXY[0][1], ...cursorXY.map((p) => p[1])].map((v) => v - FS + 1);
  const blinkT = [0], blinkV = [0];
  blinkT.push(pct(0.5)); blinkV.push(1);
  for (let s = endTyping + 0.3, on = false; s < statusAt; s += 0.45, on = !on) { blinkT.push(pct(s)); blinkV.push(on ? 1 : 0); }
  blinkT.push(pct(statusAt)); blinkV.push(0);
  const cursor = `<rect width="${CH}" height="${FS + 3}" fill="${C.ink}" x="${xs[0]}" y="${ys[0]}" opacity="0">
<animate attributeName="x" dur="${T}s" repeatCount="indefinite" calcMode="discrete" keyTimes="${keyT.join(';')}" values="${xs.join(';')}"/>
<animate attributeName="y" dur="${T}s" repeatCount="indefinite" calcMode="discrete" keyTimes="${keyT.join(';')}" values="${ys.join(';')}"/>
<animate attributeName="opacity" dur="${T}s" repeatCount="indefinite" calcMode="discrete" keyTimes="${blinkT.join(';')}" values="${blinkV.join(';')}"/>
</rect>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>${defs}</defs>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="10" fill="${C.bg}" stroke="${C.border}"/>
<line x1="${PAD + GUTTER - 8}" y1="${PAD - 6}" x2="${PAD + GUTTER - 8}" y2="${H - PAD + 6}" stroke="${C.border}"/>
${body}
${cursor}
</svg>
`;
}

for (const f of fs.readdirSync(OUT)) fs.unlinkSync(path.join(OUT, f));
for (const [name, C] of Object.entries(THEMES)) {
  const file = name === 'light' ? 'card.svg' : 'card-dark.svg';
  const out = card(C);
  fs.writeFileSync(path.join(OUT, file), out);
  console.log(file.padEnd(14), (Buffer.byteLength(out) / 1024).toFixed(1) + ' KB');
}
