import * as THREE from 'three';

/** Sample points from text drawn to a canvas */
export function samplePointsFromText(text, count, { font = '900 220px "Noto Sans JP", sans-serif', width = 9, w = 1400, h = 420 } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
  x.fillStyle = '#fff'; x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle';
  // shrink to fit
  let size = parseInt(font.match(/(\d+)px/)[1], 10);
  while (x.measureText(text).width > w * .94 && size > 20) { size -= 8; x.font = font.replace(/\d+px/, size + 'px'); }
  x.fillText(text, w / 2, h / 2);
  const data = x.getImageData(0, 0, w, h).data;
  const pts = [];
  for (let yy = 0; yy < h; yy += 3) for (let xx = 0; xx < w; xx += 3) if (data[(yy * w + xx) * 4] > 128) pts.push([xx, yy]);
  const out = new Float32Array(count * 3);
  const scale = width / w;
  for (let i = 0; i < count; i++) {
    const p = pts[(Math.random() * pts.length) | 0] || [w / 2, h / 2];
    out[i * 3] = (p[0] - w / 2) * scale + (Math.random() - .5) * .02;
    out[i * 3 + 1] = -(p[1] - h / 2) * scale + (Math.random() - .5) * .02;
    out[i * 3 + 2] = (Math.random() - .5) * .35;
  }
  return out;
}

export function sphereShape(count, r = 3) {
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = Math.random(), v = Math.random();
    const th = u * Math.PI * 2, ph = Math.acos(2 * v - 1);
    const rr = r * (.85 + Math.random() * .15);
    out[i * 3] = rr * Math.sin(ph) * Math.cos(th);
    out[i * 3 + 1] = rr * Math.sin(ph) * Math.sin(th);
    out[i * 3 + 2] = rr * Math.cos(ph);
  }
  return out;
}

/** Aperture: 9 blades spiral */
export function apertureShape(count, r = 3.2) {
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const blade = i % 9;
    const t = Math.random();
    const a0 = blade / 9 * Math.PI * 2;
    const a = a0 + t * 1.2;
    const rr = r * (.35 + t * .65);
    out[i * 3] = Math.cos(a) * rr + (Math.random() - .5) * .05;
    out[i * 3 + 1] = Math.sin(a) * rr + (Math.random() - .5) * .05;
    out[i * 3 + 2] = (Math.random() - .5) * .2;
  }
  return out;
}

export function ringShape(count, r = 3.6) {
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const band = (Math.random() - .5) * .6;
    out[i * 3] = Math.cos(a) * (r + band);
    out[i * 3 + 1] = (Math.random() - .5) * .08;
    out[i * 3 + 2] = Math.sin(a) * (r + band);
  }
  return out;
}

/** Morphing particle cloud */
export class MorphParticles {
  constructor(count = 7000) {
    this.count = count;
    this.shapes = {};
    this.current = new Float32Array(count * 3);
    this.target = null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.current, 3));
    const rnd = new Float32Array(count);
    for (let i = 0; i < count; i++) rnd[i] = Math.random();
    geo.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 1));
    this.uniforms = {
      uTime: { value: 0 },
      uSize: { value: 26 * Math.min(window.devicePixelRatio, 2) },
      uColorA: { value: new THREE.Color('#5ee7ff') },
      uColorB: { value: new THREE.Color('#b56cff') },
      uOpacity: { value: 1 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */`
        uniform float uTime; uniform float uSize;
        attribute float aRnd; varying float vRnd; varying float vDepth;
        void main(){
          vec3 p = position;
          p.x += sin(uTime*.7 + aRnd*40.)*.025;
          p.y += cos(uTime*.9 + aRnd*30.)*.025;
          vec4 mv = modelViewMatrix * vec4(p,1.);
          gl_Position = projectionMatrix * mv;
          float tw = .55 + .45*sin(uTime*2. + aRnd*60.);
          gl_PointSize = uSize * (0.35 + aRnd*.65) * tw / -mv.z;
          vRnd = aRnd; vDepth = -mv.z;
        }`,
      fragmentShader: /* glsl */`
        uniform vec3 uColorA; uniform vec3 uColorB; uniform float uOpacity;
        varying float vRnd; varying float vDepth;
        void main(){
          vec2 c = gl_PointCoord - .5; float d = length(c);
          float a = smoothstep(.5, 0., d); a *= a;
          vec3 col = mix(uColorA, uColorB, vRnd);
          gl_FragColor = vec4(col * 1.6, a * uOpacity);
        }`,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.geo = geo;
  }
  add(name, arr) { this.shapes[name] = arr; }
  setShape(name, instant = false) {
    if (this.name === name) return;
    this.name = name;
    this.target = this.shapes[name];
    if (instant) this.current.set(this.target);
    this.morphT = 0;
  }
  update(dt, t) {
    this.uniforms.uTime.value = t;
    if (!this.target) return;
    const k = 1 - Math.pow(.0009, dt); // ease
    const c = this.current, tg = this.target;
    for (let i = 0; i < c.length; i++) {
      // stagger by index for "flowing" morph
      const kk = k * (0.35 + ((i * 2654435761) % 1000) / 1000 * .9);
      c[i] += (tg[i] - c[i]) * kk;
    }
    this.geo.attributes.position.needsUpdate = true;
  }
}

/** Starfield with warp-speed streak support */
export class StarField {
  constructor(count = 3500) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const rnd = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - .5) * 60;
      pos[i * 3 + 1] = (Math.random() - .5) * 40;
      pos[i * 3 + 2] = -Math.random() * 80 + 10;
      rnd[i] = Math.random();
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 1));
    this.uniforms = { uTime: { value: 0 }, uTravel: { value: 0 }, uWarp: { value: 0 }, uPR: { value: Math.min(window.devicePixelRatio, 2) }, uTint: { value: new THREE.Color('#9fb6ff') } };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */`
        uniform float uTime; uniform float uTravel; uniform float uWarp; uniform float uPR;
        attribute float aRnd; varying float vA; varying float vRnd;
        void main(){
          vec3 p = position;
          p.z = mod(p.z + uTravel + 70., 80.) - 70.;
          vec4 mv = modelViewMatrix * vec4(p,1.);
          gl_Position = projectionMatrix * mv;
          float size = (1. + aRnd*2.2) * uPR * (1. + uWarp*3.);
          gl_PointSize = size * 22. / -mv.z;
          vA = smoothstep(-70., -40., p.z) * smoothstep(10., 2., p.z) * (.4+.6*sin(uTime*1.5+aRnd*50.)*.5+.5);
          vRnd = aRnd;
        }`,
      fragmentShader: /* glsl */`
        uniform vec3 uTint; uniform float uWarp; varying float vA; varying float vRnd;
        void main(){
          vec2 c = gl_PointCoord - .5;
          c.y *= mix(1., .18, uWarp);
          float d = length(c);
          float a = smoothstep(.5, 0., d);
          vec3 col = mix(uTint, vec3(1.), vRnd*.6);
          gl_FragColor = vec4(col, a*vA);
        }`,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
  }
}
