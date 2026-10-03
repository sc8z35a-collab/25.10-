import * as THREE from 'three';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}
function tex(c, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** SONY logo / alpha text for the camera body */
export function textTexture(text, { w = 512, h = 128, font = '700 84px "Space Grotesk", sans-serif', color = '#e8e8ea', letter = 8 } = {}) {
  const [c, x] = canvas(w, h);
  x.clearRect(0, 0, w, h);
  x.font = font; x.fillStyle = color; x.textAlign = 'center'; x.textBaseline = 'middle';
  if ('letterSpacing' in x) x.letterSpacing = `${letter}px`;
  x.fillText(text, w / 2, h / 2 + 4);
  return tex(c);
}

/** Rear LCD screen – viewfinder style UI */
export function lcdTexture() {
  const [c, x] = canvas(640, 427);
  const g = x.createLinearGradient(0, 0, 640, 427);
  g.addColorStop(0, '#1d3b7a'); g.addColorStop(.5, '#5d3c9a'); g.addColorStop(1, '#ff8a5c');
  x.fillStyle = g; x.fillRect(0, 0, 640, 427);
  // mountains / silhouette
  x.fillStyle = 'rgba(10,14,30,.85)';
  x.beginPath(); x.moveTo(0, 330); x.lineTo(160, 220); x.lineTo(260, 280); x.lineTo(380, 150); x.lineTo(520, 290); x.lineTo(640, 240); x.lineTo(640, 427); x.lineTo(0, 427); x.fill();
  // sun
  const sg = x.createRadialGradient(470, 120, 0, 470, 120, 90);
  sg.addColorStop(0, 'rgba(255,240,200,1)'); sg.addColorStop(1, 'rgba(255,200,120,0)');
  x.fillStyle = sg; x.fillRect(360, 20, 220, 220);
  // grid
  x.strokeStyle = 'rgba(255,255,255,.25)'; x.lineWidth = 1;
  for (let i = 1; i < 3; i++) { x.beginPath(); x.moveTo(640 * i / 3, 0); x.lineTo(640 * i / 3, 427); x.stroke(); x.beginPath(); x.moveTo(0, 427 * i / 3); x.lineTo(640, 427 * i / 3); x.stroke(); }
  // AF box
  x.strokeStyle = '#66ff66'; x.lineWidth = 4; x.strokeRect(280, 150, 80, 80);
  x.fillStyle = '#fff'; x.font = '700 22px "JetBrains Mono", monospace';
  x.fillText('● REC  4K 60p  10bit', 20, 36);
  x.fillText('F4.0   1/125   ISO 100', 20, 410);
  x.fillStyle = '#5ee7ff'; x.fillText('33MP', 560, 36);
  return tex(c);
}

/** WD Blue label */
export function wdLabelTexture() {
  const [c, x] = canvas(1024, 720);
  x.fillStyle = '#f4f6f9'; x.fillRect(0, 0, 1024, 720);
  x.fillStyle = '#0a5bd6'; x.fillRect(0, 0, 1024, 120);
  x.fillStyle = '#fff'; x.font = '700 58px "Space Grotesk", sans-serif'; x.textBaseline = 'middle';
  x.fillText('Western Digital.', 40, 62);
  x.font = '400 26px "Space Grotesk", sans-serif'; x.textAlign = 'right'; x.fillText('www.wdc.com', 990, 62);
  x.textAlign = 'left'; x.fillStyle = '#111';
  x.font = '700 120px "Space Grotesk", sans-serif'; x.fillText('8TB', 40, 210);
  x.font = '700 54px "JetBrains Mono", monospace'; x.fillText('WD80EAZZ', 420, 190);
  x.font = '400 30px "JetBrains Mono", monospace'; x.fillText('SATA 6Gb/s  PC HA500', 420, 240);
  x.font = '400 22px "JetBrains Mono", monospace';
  x.fillText('CMR ・ 5640rpm ・ 256MB CACHE', 40, 320);
  // barcode
  for (let i = 0; i < 120; i++) { x.fillRect(40 + i * 5, 350, Math.random() > .5 ? 3 : 1.5, 40); }
  x.fillStyle = '#555';
  ['DATA STORAGE FOR', 'RAW PHOTOS & 4K VIDEO', 'DO NOT COVER ANY DRIVE HOLES'].forEach((t, i) => x.fillText(t, 40, 440 + i * 34));
  x.fillStyle = '#0a5bd6'; x.fillRect(0, 600, 360, 120);
  x.fillStyle = '#fff'; x.font = '700 46px "Space Grotesk", sans-serif'; x.fillText('WD Blue™', 30, 645);
  x.font = '400 26px "Space Grotesk", sans-serif'; x.fillText('PC Hard Drive', 30, 690);
  return tex(c);
}

/** Procedural "photos" for the gallery (ch4) */
const photoDefs = [
  { title: '富士山', draw: fuji },
  { title: '文化祭ステージ', draw: stage },
  { title: '運動会', draw: sports },
  { title: '夜景', draw: night },
  { title: '日常の一瞬', draw: daily },
  { title: 'ショートフィルム', draw: film },
];
export function photoTextures() {
  return photoDefs.map((d, i) => {
    const [c, x] = canvas(720, 900);
    d.draw(x, 720, 760);
    // polaroid frame
    x.fillStyle = '#f2f2f0'; x.fillRect(0, 760, 720, 140);
    x.fillStyle = '#222'; x.font = '700 40px "Noto Sans JP", sans-serif'; x.textBaseline = 'middle';
    x.fillText(d.title, 40, 830);
    x.fillStyle = '#888'; x.font = '400 22px "JetBrains Mono", monospace'; x.textAlign = 'right';
    x.fillText(`α7 IV / DSC0${1200 + i * 37}.ARW`, 690, 830);
    return tex(c);
  });
}
function sky(x, w, h, a, b, cc) { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, a); g.addColorStop(.6, b); g.addColorStop(1, cc); x.fillStyle = g; x.fillRect(0, 0, w, h); }
function fuji(x, w, h) {
  sky(x, w, h, '#0b1f4d', '#f08a5d', '#ffd29a');
  x.fillStyle = '#1a2340';
  x.beginPath(); x.moveTo(0, h); x.lineTo(0, 600); x.lineTo(250, 330); x.lineTo(310, 300); x.lineTo(410, 300); x.lineTo(470, 330); x.lineTo(720, 600); x.lineTo(720, h); x.fill();
  x.fillStyle = '#f4f7ff';
  x.beginPath(); x.moveTo(250, 330); x.lineTo(310, 300); x.lineTo(410, 300); x.lineTo(470, 330); x.lineTo(430, 380); x.lineTo(395, 350); x.lineTo(360, 395); x.lineTo(325, 355); x.lineTo(290, 380); x.fill();
  x.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 60; i++) x.fillRect(Math.random() * w, Math.random() * 200, 2, 2);
  x.fillStyle = 'rgba(10,15,30,.9)'; x.fillRect(0, 680, w, 80);
}
function stage(x, w, h) {
  x.fillStyle = '#07040f'; x.fillRect(0, 0, w, h);
  const cols = ['#ff3d8b', '#5ee7ff', '#b56cff', '#ffb547'];
  cols.forEach((c, i) => { const g = x.createLinearGradient(100 + i * 170, 0, 360, h); g.addColorStop(0, c); g.addColorStop(1, 'transparent'); x.globalAlpha = .5; x.fillStyle = g; x.beginPath(); x.moveTo(80 + i * 180, 0); x.lineTo(130 + i * 180, 0); x.lineTo(460, h); x.lineTo(260, h); x.fill(); });
  x.globalAlpha = 1; x.fillStyle = '#000'; x.beginPath(); x.ellipse(360, 560, 50, 60, 0, 0, Math.PI * 2); x.fill(); x.fillRect(300, 610, 120, 150);
  x.fillStyle = '#140a24'; x.fillRect(0, 700, w, 60);
  for (let i = 0; i < 18; i++) { x.fillStyle = '#000'; x.beginPath(); x.arc(20 + i * 42, 740, 26, 0, Math.PI * 2); x.fill(); }
}
function sports(x, w, h) {
  sky(x, w, h, '#4aa3ff', '#a8dcff', '#e9f6ff');
  x.fillStyle = '#c96a3a'; x.fillRect(0, 480, w, 280);
  x.strokeStyle = '#fff'; x.lineWidth = 6; for (let i = 0; i < 5; i++) { x.beginPath(); x.ellipse(360, 900, 300 + i * 70, 340 + i * 50, 0, Math.PI, 2 * Math.PI); x.stroke(); }
  x.fillStyle = '#111'; [[220, 470], [420, 500]].forEach(([px, py]) => { x.beginPath(); x.arc(px, py, 28, 0, 7); x.fill(); x.save(); x.translate(px, py + 30); x.rotate(.35); x.fillRect(-22, 0, 44, 110); x.restore(); });
  x.strokeStyle = '#66ff66'; x.lineWidth = 5; x.strokeRect(190, 438, 60, 60);
}
function night(x, w, h) {
  sky(x, w, h, '#020414', '#0b1440', '#26135a');
  for (let i = 0; i < 26; i++) { const bw = 30 + Math.random() * 60, bh = 150 + Math.random() * 380; x.fillStyle = '#05060f'; x.fillRect(i * 30, h - bh, bw, bh); for (let k = 0; k < 30; k++) { x.fillStyle = Math.random() > .5 ? '#ffd58a' : '#7ad7ff'; x.globalAlpha = Math.random(); x.fillRect(i * 30 + Math.random() * bw, h - Math.random() * bh, 3, 4); } x.globalAlpha = 1; }
  for (let i = 0; i < 40; i++) { const g = x.createRadialGradient(0, 0, 0, 0, 0, 40); const c = ['255,120,180', '94,231,255', '255,200,100'][i % 3]; g.addColorStop(0, `rgba(${c},.5)`); g.addColorStop(1, `rgba(${c},0)`); x.save(); x.translate(Math.random() * w, 500 + Math.random() * 260); x.fillStyle = g; x.fillRect(-40, -40, 80, 80); x.restore(); }
}
function daily(x, w, h) {
  sky(x, w, h, '#ffe6c7', '#ffc59e', '#e78f74');
  x.fillStyle = 'rgba(255,255,255,.5)'; x.fillRect(80, 80, 260, 360); x.fillRect(380, 80, 260, 360);
  x.fillStyle = 'rgba(120,60,40,.9)'; x.fillRect(0, 560, w, 200);
  x.fillStyle = '#fff'; x.beginPath(); x.ellipse(360, 560, 90, 30, 0, 0, 7); x.fill();
  x.fillStyle = '#6b3a1f'; x.beginPath(); x.ellipse(360, 552, 60, 18, 0, 0, 7); x.fill();
  x.strokeStyle = 'rgba(255,255,255,.6)'; x.lineWidth = 4; for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(330 + i * 30, 520); x.bezierCurveTo(310 + i * 30, 470, 350 + i * 30, 450, 330 + i * 30, 400); x.stroke(); }
}
function film(x, w, h) {
  sky(x, w, h, '#0e0e14', '#1b2a3a', '#3a5566');
  x.fillStyle = '#000'; x.fillRect(0, 0, w, 90); x.fillRect(0, h - 90, w, 90);
  x.fillStyle = 'rgba(255,255,255,.9)'; x.font = '700 30px "JetBrains Mono", monospace'; x.fillText('SCENE 01  TAKE 3', 40, 50);
  x.fillStyle = '#e04a4a'; x.beginPath(); x.arc(660, 45, 12, 0, 7); x.fill();
  x.fillStyle = '#000'; x.beginPath(); x.arc(250, 470, 40, 0, 7); x.fill(); x.fillRect(215, 505, 70, 170);
  x.fillStyle = 'rgba(255,220,160,.35)'; x.beginPath(); x.moveTo(720, 100); x.lineTo(720, 300); x.lineTo(200, 670); x.lineTo(120, 670); x.fill();
}

/** Sprite label */
export function labelTexture(main, sub, color = '#5ee7ff') {
  const [c, x] = canvas(512, 200);
  x.fillStyle = 'rgba(8,12,28,.78)';
  const r = 30; x.beginPath(); x.roundRect ? x.roundRect(6, 6, 500, 188, r) : x.rect(6, 6, 500, 188); x.fill();
  x.strokeStyle = color; x.lineWidth = 3; x.stroke();
  x.fillStyle = '#fff'; x.font = '900 64px "Noto Sans JP", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(main, 256, 84);
  x.fillStyle = color; x.font = '400 28px "JetBrains Mono", "Noto Sans JP", monospace';
  x.fillText(sub, 256, 150);
  return tex(c);
}

/** sensor iridescent grid */
export function sensorTexture() {
  const [c, x] = canvas(512, 340);
  const g = x.createLinearGradient(0, 0, 512, 340);
  g.addColorStop(0, '#3a1d6e'); g.addColorStop(.3, '#1e6aa8'); g.addColorStop(.6, '#2fbf9f'); g.addColorStop(1, '#a0306e');
  x.fillStyle = g; x.fillRect(0, 0, 512, 340);
  x.strokeStyle = 'rgba(255,255,255,.12)';
  for (let i = 0; i < 512; i += 6) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 340); x.stroke(); }
  for (let j = 0; j < 340; j += 6) { x.beginPath(); x.moveTo(0, j); x.lineTo(512, j); x.stroke(); }
  return tex(c);
}

export function glowSprite() {
  const [c, x] = canvas(128, 128);
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.2, 'rgba(255,255,255,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return tex(c);
}
