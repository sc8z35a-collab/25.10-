import './style.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { World } from './three/world.js';
import { sources, groups } from './sources.js';

gsap.registerPlugin(ScrollTrigger);
document.body.classList.add('loading');
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const isTouch = matchMedia('(hover: none)').matches;

/* =========================================================
   1. Citations  [[1,2]] → superscript chips
   ========================================================= */
function buildCitations() {
  $$('#content p, #content li, #content .price-sub').forEach(el => {
    if (!el.innerHTML.includes('[[')) return;
    el.innerHTML = el.innerHTML.replace(/\[\[([\d,\s]+)\]\]/g, (_, nums) =>
      `<span class="cite">${nums.split(',').map(n => n.trim()).map(n => `<a href="#s${n}" data-cite="${n}">${n}</a>`).join('')}</span>`);
  });
  const list = $('#src-list');
  list.innerHTML = groups.map(g => `
    <li id="s${g.nums[0]}" data-nums="${g.nums.join(',')}">
      <div class="src-nums">${g.nums.map(n => `<span id="s${n}-n">${n}</span>`).join('')}</div>
      <h4>${g.t}</h4>
      <a class="url" href="${g.u}" target="_blank" rel="noopener">${g.u}</a>
    </li>`).join('');
  // anchors for every number pointing to its group
  groups.forEach(g => g.nums.slice(1).forEach(n => { const a = document.createElement('span'); a.id = 's' + n; a.style.position = 'relative'; list.querySelector(`#s${g.nums[0]}`).prepend(a); }));

  const pop = $('#cite-pop');
  document.addEventListener('pointerover', e => {
    const a = e.target.closest('[data-cite]'); if (!a) return;
    const s = sources[a.dataset.cite]; if (!s) return;
    pop.innerHTML = `<b>[${a.dataset.cite}]</b>${s.t}<small>${s.u}</small>`;
    const r = a.getBoundingClientRect();
    pop.style.left = Math.min(window.innerWidth - 380, Math.max(10, r.left - 20)) + 'px';
    pop.style.top = (r.top > 180 ? r.top - pop.offsetHeight - 12 : r.bottom + 12) + 'px';
    pop.classList.add('on');
  });
  document.addEventListener('pointerout', e => { if (e.target.closest('[data-cite]')) pop.classList.remove('on'); });
}

/* =========================================================
   2. Split text into characters
   ========================================================= */
function splitChars(el) {
  const walk = node => {
    [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        [...n.textContent].forEach(ch => {
          if (ch === ' ' || ch === '\n') { frag.appendChild(document.createTextNode(ch)); return; }
          const s = document.createElement('span'); s.className = 'char'; s.textContent = ch; frag.appendChild(s);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && !n.classList.contains('cite')) walk(n);
    });
  };
  walk(el);
  return $$('.char', el);
}

/* =========================================================
   3. Loader
   ========================================================= */
function buildLoader() {
  const g = $('#loader .blades');
  const blades = [];
  for (let i = 0; i < 9; i++) {
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', 'M100 100 L100 8 A92 92 0 0 1 165 35 Z');
    p.setAttribute('class', 'blade');
    p.setAttribute('transform', `rotate(${i * 40} 100 100)`);
    g.appendChild(p); blades.push(p);
  }
  return blades;
}

/* =========================================================
   4. Boot
   ========================================================= */
const blades = buildLoader();
const loaderTl = gsap.timeline({ repeat: -1 });
loaderTl.to('#loader .blades', { rotate: 360, transformOrigin: '100px 100px', duration: 6, ease: 'none' });
const pct = { v: 0 };
const pctTween = gsap.to(pct, { v: 80, duration: 2.2, ease: 'power2.out', onUpdate: () => { $('#loader-pct').textContent = Math.round(pct.v); $('.loader-bar i').style.width = pct.v + '%'; } });

buildCitations();

let world;
try { world = new World($('#webgl')); } catch (err) { console.warn('WebGL unavailable', err); }

const fontsReady = (document.fonts ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 3500))]) : Promise.resolve());
// force-load fonts used in canvas textures
const fontLoads = document.fonts ? Promise.race([Promise.all([
  document.fonts.load('900 100px "Noto Sans JP"', 'すごい好きこそ物の上手なれ'),
  document.fonts.load('700 100px "Space Grotesk"', '8TB3-21α7IV'),
  document.fonts.load('700 30px "JetBrains Mono"', 'REC'),
]), new Promise(r => setTimeout(r, 3500))]) : Promise.resolve();

Promise.all([fontsReady, fontLoads]).then(() => {
  if (world) { world.buildTextShapes(); world.morph.setShape('ta7'); }
  pctTween.kill();
  gsap.to(pct, { v: 100, duration: .5, ease: 'power1.out', onUpdate: () => { $('#loader-pct').textContent = Math.round(pct.v); $('.loader-bar i').style.width = pct.v + '%'; }, onComplete: intro });
});

/* =========================================================
   5. Smooth scroll
   ========================================================= */
const lenis = new Lenis({ duration: 1.25, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
lenis.stop();
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add(time => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
$$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const id = a.getAttribute('href'); const el = id === '#top' ? 0 : $(id);
  if (el === null) return;
  e.preventDefault();
  lenis.scrollTo(el, { duration: 2, offset: id.startsWith('#s') ? -120 : 0 });
  if (id.startsWith('#s') && id !== '#sources') {
    const li = $(id)?.closest('li'); if (li) { li.classList.remove('flash'); void li.offsetWidth; li.classList.add('flash'); }
  }
}));

/* =========================================================
   6. Intro
   ========================================================= */
const heroChars = $$('.hero-title .split').flatMap(el => (el.classList.contains('grad') || el.classList.contains('grad2')) ? [el] : splitChars(el));
gsap.set(heroChars, { yPercent: 120, rotateX: -80, opacity: 0 });
gsap.set(['.hero-lead', '.hero-meta', '.hero-toc a', '.hero-scroll'], { opacity: 0, y: 30 });

function intro() {
  loaderTl.kill();
  const tl = gsap.timeline({ onComplete: () => { document.body.classList.remove('loading'); lenis.start(); } });
  tl.to(blades, { attr: { transform: (i) => `rotate(${i * 40 + 70} 100 100) translate(0 -60)` }, duration: 1, ease: 'expo.inOut', stagger: .02 })
    .to('.loader-text, .loader-bar', { opacity: 0, duration: .4 }, '<')
    .add(() => world && world.flash(), '-=.3')
    .to('#loader', { opacity: 0, duration: .8, ease: 'power2.out', onComplete: () => $('#loader').remove() }, '-=.2')
    .to('#nav', { y: 0, duration: 1.2, ease: 'expo.out' }, '-=.5')
    .add(() => $('#hud').classList.add('on'), '<')
    .to(heroChars, { yPercent: 0, rotateX: 0, opacity: 1, duration: 1.4, ease: 'expo.out', stagger: .025 }, '<')
    .to('.hero-meta', { opacity: 1, y: 0, duration: 1, ease: 'expo.out' }, '-=1.2')
    .to('.hero-lead', { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out' }, '-=1')
    .to('.hero-toc a', { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: .08 }, '-=1')
    .to('.hero-scroll', { opacity: 1, y: 0, duration: 1 }, '-=.6');
}

/* =========================================================
   7. Scroll animations
   ========================================================= */
// hero parallax out
gsap.to('.hero-title', { yPercent: -30, opacity: .2, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

// chapter numbers parallax + titles
$$('.chapter').forEach(ch => {
  const num = $('.ch-num span', ch);
  if (num) gsap.fromTo(num, { yPercent: 40, opacity: 0 }, { yPercent: -30, opacity: 1, ease: 'none', scrollTrigger: { trigger: ch, start: 'top bottom', end: 'top top', scrub: true } });
  const k = $('.ch-kicker', ch);
  if (k) gsap.from(k, { x: -60, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: k, start: 'top 85%' } });
  const title = $('.ch-title', ch);
  if (title) {
    const chars = splitChars(title);
    gsap.set(chars, { opacity: 0, yPercent: 100, rotateY: 90 });
    ScrollTrigger.create({ trigger: title, start: 'top 85%', once: true, onEnter: () => gsap.to(chars, { opacity: 1, yPercent: 0, rotateY: 0, duration: 1.1, stagger: .018, ease: 'expo.out' }) });
  }
});

// prose reveal (line-ish mask by blur)
$$('.prose').forEach(p => {
  gsap.fromTo(p, { opacity: 0, y: 50, filter: 'blur(10px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: p, start: 'top 88%' } });
});

// tilt cards entrance
ScrollTrigger.batch('.tilt', {
  start: 'top 90%', once: true,
  onEnter: els => gsap.fromTo(els, { opacity: 0, y: 80, rotateX: -35, transformPerspective: 1000 }, { opacity: 1, y: 0, rotateX: 0, duration: 1.4, ease: 'expo.out', stagger: .1, overwrite: true }),
});
gsap.set('.tilt', { opacity: 0 });

// counters
$$('.count').forEach(el => {
  const to = +el.dataset.to; const o = { v: 0 };
  ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => gsap.to(o, { v: to, duration: 2.2, ease: 'expo.out', onUpdate: () => { el.textContent = Math.round(o.v).toLocaleString('ja-JP'); } }) });
});

// capacity meters & speed chart
$$('.cap-meter i').forEach(i => gsap.to(i, { scaleX: 1, duration: 2, ease: 'expo.out', scrollTrigger: { trigger: i, start: 'top 90%' } }));
$$('.sc-bar i').forEach((i, k) => gsap.to(i, { width: (+i.dataset.v / 224 * 100) + '%', duration: 2.2, delay: k * .12, ease: 'expo.out', scrollTrigger: { trigger: '#speed-chart', start: 'top 80%' } }));

// marquee skew by velocity
const mq = $('.marquee-track');

// big numbers 3-2-1
gsap.from('.r-item', { opacity: 0, y: 120, scale: .7, stagger: .18, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: '.rule321', start: 'top 80%' } });

// flow nodes
gsap.from('.flow-node', { opacity: 0, scale: .4, y: 40, stagger: .12, duration: 1, ease: 'back.out(2)', scrollTrigger: { trigger: '#flow', start: 'top 80%' } });
gsap.from('.flow-line', { scaleX: 0, transformOrigin: 'left', stagger: .12, duration: .8, ease: 'expo.out', scrollTrigger: { trigger: '#flow', start: 'top 80%' } });

// big word
gsap.fromTo('.big-word span', { scale: .3, opacity: 0, rotate: -8, filter: 'blur(20px)' }, { scale: 1, opacity: 1, rotate: 0, filter: 'blur(0px)', ease: 'none', scrollTrigger: { trigger: '.big-word', start: 'top 95%', end: 'center 55%', scrub: 1 } });
gsap.from('.tag-cloud span', { opacity: 0, scale: 0, rotate: () => gsap.utils.random(-20, 20), stagger: .1, duration: 1, ease: 'back.out(2.5)', scrollTrigger: { trigger: '.tag-cloud', start: 'top 85%' } });
gsap.from('.bubble', { opacity: 0, y: 30, scale: .8, stagger: .35, duration: .8, ease: 'back.out(2)', scrollTrigger: { trigger: '.chat', start: 'top 80%' } });
gsap.from('.tier-row, .tier-gap', { opacity: 0, x: 60, stagger: .15, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.tier', start: 'top 85%' } });
gsap.from('.price-val', { scale: .6, opacity: 0, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: '.price-block', start: 'top 80%' } });

// cycle ring
gsap.to('.cycle-fg', { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: '#cycle', start: 'top 80%', end: 'center 40%', scrub: 1 } });
gsap.from('.cycle-node', { scale: 0, opacity: 0, stagger: .2, duration: .9, ease: 'back.out(2)', scrollTrigger: { trigger: '#cycle', start: 'top 65%' } });

// finale
const kChars = $$('.kotowaza span');
gsap.fromTo(kChars, { opacity: 0, y: 100, rotateX: -90, scale: .5 }, { opacity: 1, y: 0, rotateX: 0, scale: 1, stagger: .08, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.kotowaza', start: 'top 90%' } });
gsap.from('.src-list li', { opacity: 0, y: 40, stagger: .05, duration: .8, ease: 'expo.out', scrollTrigger: { trigger: '.src-list', start: 'top 85%' } });

// stage text
$$('.stage').forEach(st => {
  const lines = $$('.sl > span', st);
  gsap.set(lines, { yPercent: 115 });
  const tl = gsap.timeline({ scrollTrigger: { trigger: st, start: 'top top', end: 'bottom bottom', scrub: 1 } });
  lines.forEach((l, i) => tl.to(l, { yPercent: 0, duration: .5, ease: 'expo.out' }, i * .25));
  tl.to($('.stage-sub', st), { opacity: 1, duration: .4 }, .7);
  tl.to(lines, { yPercent: -110, duration: .5, stagger: .1, ease: 'expo.in' }, 2.2);
  tl.to($('.stage-sub', st), { opacity: 0, duration: .3 }, 2.3);
  gsap.to($('.stage-progress i', st), { scaleX: 1, ease: 'none', scrollTrigger: { trigger: st, start: 'top top', end: 'bottom bottom', scrub: true } });
  ScrollTrigger.create({ trigger: st, start: 'top 60%', onEnter: () => world && st.dataset.stage === 'camera' && world.flash() });
});

/* =========================================================
   8. 3D scene focus calculation (every frame)
   ========================================================= */
const stages = $$('.stage').map(el => ({ el, name: el.dataset.stage }));
const sections = $$('[data-scene]').map(el => ({ el, name: el.dataset.scene }));
function computeFocus() {
  if (!world) return;
  const vh = window.innerHeight;
  const heroR = $('.hero').getBoundingClientRect();
  world.focus.hero = clamp(1 - (-heroR.top) / (vh * .8));
  stages.forEach(({ el, name }) => {
    const r = el.getBoundingClientRect();
    const fin = clamp((vh - r.top) / (vh * .6));
    const fout = clamp(r.bottom / (vh * .6));
    world.focus[name] = Math.min(fin, fout);
    world.progress[name] = clamp(-r.top / (r.height - vh));
  });
  world.progress.cameraFocus = 1; world.progress.hddFocus = 1;
  let current = 'hero';
  sections.forEach(({ el, name }) => { const r = el.getBoundingClientRect(); if (r.top < vh * .5 && r.bottom > vh * .5) current = name; });
  world.setScene(current);
}

/* =========================================================
   9. Nav / HUD / Cursor / Tilt
   ========================================================= */
const navLinks = $$('#nav nav a'), dots = $$('#chapter-dots a');
const ids = ['top', 'ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'sources'];
const hud = { f: $('#hud-f'), ss: $('#hud-ss'), iso: $('#hud-iso'), tc: $('#hud-tc'), store: $('#hud-store') };
const fs = ['1.4', '2.0', '2.8', '4.0', '5.6', '8.0', '11'], sss = ['8000', '4000', '2000', '1000', '500', '250', '125', '60'], isos = ['100', '200', '400', '800', '1600', '3200', '6400', '12800'];
let lastScroll = 0;
lenis.on('scroll', ({ scroll, limit, velocity }) => {
  const p = limit ? scroll / limit : 0;
  $('#progress-bar').style.transform = `scaleX(${p})`;
  hud.store.textContent = (p * 8).toFixed(2);
  hud.f.textContent = fs[Math.floor(p * (fs.length - 1) + .5)];
  hud.ss.textContent = sss[Math.floor((Math.sin(scroll * .002) * .5 + .5) * (sss.length - 1))];
  hud.iso.textContent = isos[Math.floor(p * (isos.length - 1))];
  if (world) { world.scroll = p; world.velocity = velocity * 60; }
  if (mq) mq.style.transform = `skewX(${clamp(-velocity * .6, -12, 12)}deg)`;
  lastScroll = scroll;
});
ids.forEach((id, i) => ScrollTrigger.create({
  trigger: '#' + id, start: 'top 50%', end: 'bottom 50%',
  onToggle: s => { if (!s.isActive) return; navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + id)); dots.forEach((d, k) => d.classList.toggle('active', k === i)); },
}));
const t0 = performance.now();
function updateTC() {
  const t = (performance.now() - t0) / 1000;
  const f = Math.floor((t % 1) * 60), s = Math.floor(t) % 60, m = Math.floor(t / 60) % 60, h = Math.floor(t / 3600);
  hud.tc.textContent = [h, m, s, f].map(v => String(v).padStart(2, '0')).join(':');
}

// cursor
const cursor = $('#cursor');
const cx = gsap.quickTo(cursor, 'x', { duration: .35, ease: 'power3' }), cy = gsap.quickTo(cursor, 'y', { duration: .35, ease: 'power3' });
window.addEventListener('pointermove', e => { cx(e.clientX); cy(e.clientY); });
document.addEventListener('pointerover', e => {
  const h = e.target.closest('a, button, .tilt');
  cursor.classList.toggle('hover', !!h);
  cursor.classList.toggle('focus', !!e.target.closest('.prose, .tilt'));
});
window.addEventListener('pointerdown', () => { gsap.fromTo('.cursor-ring', { scale: .6 }, { scale: 1, duration: .5, ease: 'back.out(3)' }); });

// tilt
if (!isTouch) $$('.tilt').forEach(el => {
  const rx = gsap.quickTo(el, 'rotateX', { duration: .6, ease: 'power3' }), ry = gsap.quickTo(el, 'rotateY', { duration: .6, ease: 'power3' });
  gsap.set(el, { transformPerspective: 900 });
  el.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    rx((.5 - y) * 14); ry((x - .5) * 14);
    el.style.setProperty('--mx', x * 100 + '%'); el.style.setProperty('--my', y * 100 + '%');
  });
  el.addEventListener('pointerleave', () => { rx(0); ry(0); });
});

// magnetic nav
if (!isTouch) $$('#nav nav a, .to-top, .hero-toc a').forEach(a => {
  const qx = gsap.quickTo(a, 'x', { duration: .5, ease: 'power3' }), qy = gsap.quickTo(a, 'y', { duration: .5, ease: 'power3' });
  a.addEventListener('pointermove', e => { const r = a.getBoundingClientRect(); qx((e.clientX - r.left - r.width / 2) * .3); qy((e.clientY - r.top - r.height / 2) * .4); });
  a.addEventListener('pointerleave', () => { qx(0); qy(0); });
});

// HDD health waveform
const wave = $('#wave-path');
function updateWave(t) {
  if (!wave) return;
  let d = 'M0 30';
  for (let x = 0; x <= 300; x += 4) {
    const k = (x + t * 80) % 100;
    const spike = k > 40 && k < 52 ? Math.sin((k - 40) / 12 * Math.PI * 2) * 22 : 0;
    d += ` L${x} ${30 - spike + Math.sin(x * .1 + t * 3) * 2}`;
  }
  wave.setAttribute('d', d);
}

// click = shutter flash
window.addEventListener('click', e => { if (!e.target.closest('a') && world) world.flash(); });

/* =========================================================
   10. Render loop
   ========================================================= */
gsap.ticker.add(() => {
  computeFocus();
  if (world) world.update();
  updateTC();
  updateWave(performance.now() / 1000);
});
window.addEventListener('load', () => ScrollTrigger.refresh());
