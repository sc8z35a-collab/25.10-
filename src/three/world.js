import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { createCamera, createHDD, createDevice } from './models.js';
import { MorphParticles, StarField, samplePointsFromText, sphereShape, apertureShape, ringShape } from './particles.js';
import { photoTextures, labelTexture, glowSprite } from './textures.js';

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const seg = (p, a, b) => clamp((p - a) / (b - a));

// Scene palettes (nebula colours)
const PALETTES = {
  hero: ['#0a1a4a', '#5a1f8a', '#00b3ff'],
  camera: ['#071435', '#2b6bff', '#5ee7ff'],
  hdd: ['#03132e', '#0a74ff', '#7ad7ff'],
  backup: ['#110a2e', '#7b3cff', '#4cffd2'],
  cases: ['#2a0718', '#ff3d8b', '#ffb547'],
  future: ['#08031f', '#b56cff', '#5ee7ff'],
  sources: ['#05070f', '#2b3a6b', '#5ee7ff'],
};

export class World {
  constructor(canvas) {
    this.canvas = canvas;
    this.mouse = new THREE.Vector2();
    this.mouseS = new THREE.Vector2();
    this.scene3 = 'hero';
    this.progress = {}; // stage progress per scene (0..1)
    this.focus = {};    // 0..1 how "front & centre" each scene is
    this.scroll = 0; this.velocity = 0;
    this.isMobile = window.innerWidth < 800;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isMobile ? 1.5 : 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer = renderer;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x04050a, .028);
    this.scene = scene;
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;

    const cam = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, .1, 200);
    cam.position.set(0, 0, 8);
    this.camera = cam;
    this.camTarget = new THREE.Vector3();
    this.camPos = new THREE.Vector3(0, 0, 8);

    this.buildLights();
    this.buildNebula();
    this.buildParticles();
    this.buildCameraScene();
    this.buildHDDScene();
    this.buildBackupScene();
    this.buildCasesScene();
    this.buildFutureScene();
    this.buildPost();

    this._last = performance.now();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('pointermove', e => {
      this.mouse.set(e.clientX / window.innerWidth * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    });
    this.raycaster = new THREE.Raycaster();
  }

  /* ---------------- lights ---------------- */
  buildLights() {
    const s = this.scene;
    s.add(new THREE.AmbientLight(0x8899ff, .25));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(4, 6, 6); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    s.add(key);
    this.rimA = new THREE.PointLight(0x5ee7ff, 30, 20, 2); this.rimA.position.set(-4, 2, -3); s.add(this.rimA);
    this.rimB = new THREE.PointLight(0xb56cff, 30, 20, 2); this.rimB.position.set(4, -2, -2); s.add(this.rimB);
    this.spot = new THREE.SpotLight(0xffffff, 60, 30, .5, .6, 1.5); this.spot.position.set(0, 8, 4); s.add(this.spot); s.add(this.spot.target);
  }

  /* ---------------- nebula background ---------------- */
  buildNebula() {
    const p = PALETTES.hero.map(c => new THREE.Color(c));
    this.nebulaU = { uTime: { value: 0 }, uA: { value: p[0] }, uB: { value: p[1] }, uC: { value: p[2] }, uScroll: { value: 0 }, uMouse: { value: new THREE.Vector2() } };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.nebulaU, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: /* glsl */`
        uniform float uTime; uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform float uScroll; uniform vec2 uMouse;
        varying vec3 vP;
        float h(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7)))*43758.5453); }
        float n(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
          return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
                     mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
        float fbm(vec3 p){ float v=0., a=.5; for(int i=0;i<5;i++){ v+=a*n(p); p*=2.03; a*=.5; } return v; }
        void main(){
          vec3 p = vP*2.2 + vec3(uMouse*.15, uScroll*.6);
          float t = uTime*.03;
          float q = fbm(p + vec3(t, -t, t*.5));
          float r = fbm(p*1.7 + q*2.2 + vec3(-t*.7, t, 0.));
          vec3 col = mix(uA*.35, uB, smoothstep(.35,.85,r));
          col = mix(col, uC, smoothstep(.62,.95,r*q*1.9));
          col *= .55 + .45*smoothstep(-.6,.6,vP.y+.2);
          float stars = step(.9985, h(floor(vP*400.)));
          col += stars*.8;
          gl_FragColor = vec4(col*.55, 1.);
        }`,
    });
    this.nebula = new THREE.Mesh(new THREE.SphereGeometry(90, 48, 24), mat);
    this.scene.add(this.nebula);

    this.stars = new StarField(this.isMobile ? 1800 : 3500);
    this.scene.add(this.stars.points);
  }

  setPalette(name) {
    const p = PALETTES[name]; if (!p) return;
    const targets = p.map(c => new THREE.Color(c));
    this.paletteTarget = targets;
  }

  /* ---------------- particles ---------------- */
  buildParticles() {
    const N = this.isMobile ? 4000 : 8000;
    const mp = new MorphParticles(N);
    mp.add('ring', ringShape(N, 3.4));
    mp.add('aperture', apertureShape(N, 3.4));
    mp.add('sphere', sphereShape(N, 4.2));
    this.morph = mp;
    this.scene.add(mp.points);
    // text shapes require web fonts – created after fonts load
    mp.setShape('ring', true);
  }
  buildTextShapes() {
    const N = this.morph.count;
    const mp = this.morph;
    mp.add('t8tb', samplePointsFromText('8TB', N, { font: '700 360px "Space Grotesk", sans-serif', width: 7 }));
    mp.add('t321', samplePointsFromText('3-2-1', N, { font: '700 330px "Space Grotesk", sans-serif', width: 8 }));
    mp.add('tsugoi', samplePointsFromText('すごい！', N, { font: '900 300px "Noto Sans JP", sans-serif', width: 8.5 }));
    mp.add('tsuki', samplePointsFromText('好きこそ物の上手なれ', N, { font: '900 200px "Noto Sans JP", sans-serif', width: 10 }));
    mp.add('ta7', samplePointsFromText('α7 IV', N, { font: '700 330px "Space Grotesk", sans-serif', width: 8 }));
  }

  /* ---------------- ch1: camera ---------------- */
  buildCameraScene() {
    const root = new THREE.Group();
    const cam = createCamera();
    cam.scale.setScalar(2.2);
    root.add(cam);
    this.cameraModel = cam;
    // floor reflection disc
    const disc = new THREE.Mesh(new THREE.RingGeometry(1.6, 1.62, 128), new THREE.MeshBasicMaterial({ color: 0x5ee7ff, transparent: true, opacity: .5, side: THREE.DoubleSide, toneMapped: false }));
    disc.rotation.x = -Math.PI / 2; disc.position.y = -1.25; this.camDisc = disc;
    root.add(disc);
    // holographic spec rings
    this.holo = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(2.4 + i * .35, .006, 8, 200), new THREE.MeshBasicMaterial({ color: [0x5ee7ff, 0xb56cff, 0x2b6bff][i], transparent: true, opacity: .6, blending: THREE.AdditiveBlending }));
      r.rotation.x = Math.PI / 2 + (i - 1) * .25; r.rotation.y = (i - 1) * .3;
      this.holo.add(r);
    }
    root.add(this.holo);
    // light-ray "photons" entering the lens
    const rayGeo = new THREE.BufferGeometry();
    const RN = 300; const rp = new Float32Array(RN * 3); const rr = new Float32Array(RN);
    for (let i = 0; i < RN; i++) { const a = Math.random() * Math.PI * 2, r = Math.random() * .6; rp[i * 3] = Math.cos(a) * r; rp[i * 3 + 1] = Math.sin(a) * r; rp[i * 3 + 2] = Math.random() * 3; rr[i] = Math.random(); }
    rayGeo.setAttribute('position', new THREE.BufferAttribute(rp, 3)); rayGeo.setAttribute('aRnd', new THREE.BufferAttribute(rr, 1));
    this.rayU = { uTime: { value: 0 }, uOp: { value: 0 } };
    this.rays = new THREE.Points(rayGeo, new THREE.ShaderMaterial({
      uniforms: this.rayU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `uniform float uTime; attribute float aRnd; varying float vA; void main(){ vec3 p=position; p.z = mod(p.z - uTime*(1.+aRnd*1.5), 3.); float k = p.z/3.; p.xy *= .3 + k*1.4; vec4 mv = modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv; gl_PointSize = min((3.+aRnd*5.)/-mv.z*10., 14.); vA = k*(1.-k)*4.; }`,
      fragmentShader: `uniform float uOp; varying float vA; void main(){ float d=length(gl_PointCoord-.5); gl_FragColor=vec4(vec3(.6,.95,1.)*1.5, smoothstep(.5,0.,d)*vA*uOp); }`,
    }));
    this.rays.position.set(.22, -.11, .9);
    root.add(this.rays);
    this.cameraRoot = root;
    this.scene.add(root);
  }

  /* ---------------- ch2: hdd ---------------- */
  buildHDDScene() {
    const root = new THREE.Group();
    const hdd = createHDD();
    hdd.scale.setScalar(2.4);
    root.add(hdd);
    this.hdd = hdd;
    // data stream particles (writing)
    const N = 1200; const g = new THREE.BufferGeometry(); const p = new Float32Array(N * 3); const r = new Float32Array(N);
    for (let i = 0; i < N; i++) { r[i] = Math.random(); p[i * 3] = 0; p[i * 3 + 1] = 0; p[i * 3 + 2] = 0; }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('aRnd', new THREE.BufferAttribute(r, 1));
    this.streamU = { uTime: { value: 0 }, uOp: { value: 0 } };
    this.stream = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: this.streamU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `uniform float uTime; attribute float aRnd; varying float vA; varying float vR;
        void main(){ float t = fract(uTime*.25 + aRnd); float ang = aRnd*60. + t*6.;
          float rad = mix(4.5, .4, t); vec3 p = vec3(cos(ang)*rad, mix(2.5,0.,t) + sin(aRnd*90.)*.2, sin(ang)*rad);
          vec4 mv = modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv; gl_PointSize = (6.+aRnd*10.)/-mv.z*12.; vA = sin(t*3.1415); vR=aRnd; }`,
      fragmentShader: `uniform float uOp; varying float vA; varying float vR; void main(){ float d=length(gl_PointCoord-.5); vec3 c = mix(vec3(.04,.45,1.), vec3(.37,.9,1.), vR); gl_FragColor=vec4(c*1.8, smoothstep(.5,0.,d)*vA*uOp); }`,
    }));
    root.add(this.stream);
    // binary data columns (RAW / 4K labels as sprites)
    this.fileSprites = [];
    const glow = glowSprite();
    ['RAW', '4K', 'ARW', 'MP4', 'JPEG', 'XAVC'].forEach((t, i) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(t, ['33MP', '60p', 'α7 IV', '10bit', 'Export', 'S-I'][i], i % 2 ? '#7ad7ff' : '#5ee7ff'), transparent: true, depthWrite: false, opacity: 0 }));
      s.scale.set(1.1, .43, 1);
      s.userData.a = i / 6 * Math.PI * 2;
      root.add(s); this.fileSprites.push(s);
    });
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0x0a74ff, transparent: true, blending: THREE.AdditiveBlending, opacity: .5, depthWrite: false }));
    halo.scale.set(9, 9, 1); halo.position.z = -1.5; root.add(halo);
    this.hddHalo = halo;
    root.visible = false;
    this.hddRoot = root;
    this.scene.add(root);
  }

  /* ---------------- ch3: 3-2-1 network ---------------- */
  buildBackupScene() {
    const root = new THREE.Group();
    // central WD 8TB
    const core = createHDD(); core.scale.setScalar(1.1); core.rotation.x = .5;
    root.add(core); this.backupCore = core;
    const nodes = [
      { type: 'pc', color: 0x5ee7ff, label: ['PC', '取り込み'], pos: [-3.2, 1.3, 0] },
      { type: 'ext', color: 0x4cffd2, label: ['外付けHDD/SSD', 'USB3.0 ・ 差分'], pos: [3.2, 1.4, -.5] },
      { type: 'cloud', color: 0xb56cff, label: ['クラウド', 'Google Drive/OneDrive'], pos: [2.6, -1.7, .5] },
      { type: 'usb', color: 0xffb547, label: ['USBメモリ', '暗号化 ・ パスワード'], pos: [-2.6, -1.8, .4] },
      { type: 'club', color: 0xff5ea8, label: ['写真部PC', 'オフサイト保管'], pos: [0, 2.7, -1.5] },
    ];
    this.backupNodes = nodes.map((n, i) => {
      const d = createDevice(n.type, n.color);
      d.scale.setScalar(1.6);
      d.position.set(...n.pos);
      root.add(d);
      const lab = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(n.label[0], n.label[1], '#' + n.color.toString(16).padStart(6, '0')), transparent: true, depthWrite: false }));
      lab.scale.set(1.5, .59, 1); lab.position.set(n.pos[0], n.pos[1] - .95, n.pos[2] + .2);
      root.add(lab);
      // link curve
      const start = new THREE.Vector3(0, 0, 0), end = new THREE.Vector3(...n.pos);
      const mid = start.clone().lerp(end, .5).add(new THREE.Vector3(0, .8, 1));
      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, .012, 8), new THREE.MeshBasicMaterial({ color: n.color, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, toneMapped: false }));
      tube.geometry.setDrawRange(0, 0);
      root.add(tube);
      // packets along curve
      const packets = [];
      for (let k = 0; k < 4; k++) {
        const pk = new THREE.Mesh(new THREE.SphereGeometry(.05, 12, 8), new THREE.MeshBasicMaterial({ color: n.color, toneMapped: false }));
        root.add(pk); packets.push(pk);
      }
      return { d, lab, tube, curve, packets, i, total: tube.geometry.index.count };
    });
    // shield dome
    const shield = new THREE.Mesh(new THREE.IcosahedronGeometry(4.6, 3), new THREE.MeshBasicMaterial({ color: 0x7b3cff, wireframe: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, toneMapped: false }));
    root.add(shield); this.shield = shield;
    root.visible = false;
    this.backupRoot = root;
    this.scene.add(root);
  }

  /* ---------------- ch4: gallery ---------------- */
  buildCasesScene() {
    const root = new THREE.Group();
    const texs = photoTextures();
    this.photos = texs.map((t, i) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2), new THREE.MeshStandardMaterial({ map: t, roughness: .5, metalness: 0, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: .35 }));
      m.userData.a = i / texs.length * Math.PI * 2;
      root.add(m);
      return m;
    });
    // trophies / stars burst
    const N = 600; const g = new THREE.BufferGeometry(); const p = new Float32Array(N * 3); const r = new Float32Array(N);
    for (let i = 0; i < N; i++) { const a = Math.random() * Math.PI * 2, rr = 1 + Math.random() * 5; p[i * 3] = Math.cos(a) * rr; p[i * 3 + 1] = (Math.random() - .5) * 6; p[i * 3 + 2] = Math.sin(a) * rr; r[i] = Math.random(); }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('aRnd', new THREE.BufferAttribute(r, 1));
    this.confU = { uTime: { value: 0 }, uOp: { value: 0 } };
    root.add(new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: this.confU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `uniform float uTime; attribute float aRnd; varying float vR; void main(){ vec3 p=position; p.y = mod(p.y + uTime*(.3+aRnd*.6) + 3., 6.) - 3.; vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv; gl_PointSize=(6.+aRnd*12.)/-mv.z*10.; vR=aRnd; }`,
      fragmentShader: `uniform float uOp; varying float vR; void main(){ vec2 c=gl_PointCoord-.5; float d = max(abs(c.x),abs(c.y)) + min(abs(c.x),abs(c.y))*2.; float a = smoothstep(.5,.1,d); vec3 col = vR<.33? vec3(1.,.7,.28) : vR<.66 ? vec3(1.,.37,.66) : vec3(.71,.42,1.); gl_FragColor=vec4(col*1.6, a*uOp); }`,
    })));
    root.visible = false;
    this.casesRoot = root;
    this.scene.add(root);
  }

  /* ---------------- ch5: warp tunnel ---------------- */
  buildFutureScene() {
    const root = new THREE.Group();
    this.tunnelU = { uTime: { value: 0 }, uSpeed: { value: 0 }, uOp: { value: 0 } };
    const tunnel = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 80, 64, 1, true), new THREE.ShaderMaterial({
      uniforms: this.tunnelU, side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: /* glsl */`
        uniform float uTime; uniform float uSpeed; uniform float uOp; varying vec2 vUv;
        void main(){
          float y = vUv.y*40. + uTime*(1.+uSpeed*8.);
          float lines = smoothstep(.96,1.,fract(vUv.x*48.)) * .6;
          float rings = smoothstep(.9,1.,fract(y)) ;
          float streak = smoothstep(.985,1.,fract(vUv.x*31. + floor(y*.25)*.37)) * smoothstep(.0,1.,fract(y*.25));
          vec3 col = mix(vec3(.37,.9,1.), vec3(.71,.42,1.), vUv.x);
          float fade = smoothstep(0.,.25,vUv.y)*smoothstep(1.,.6,vUv.y);
          gl_FragColor = vec4(col*(lines+rings*.5+streak*2.), (lines+rings*.5+streak*2.)*fade*uOp);
        }`,
    }));
    tunnel.rotation.x = Math.PI / 2;
    tunnel.position.z = -30;
    root.add(tunnel);
    this.tunnel = tunnel;
    // floating path cubes (5 paths)
    this.pathCubes = [];
    const cols = [0x5ee7ff, 0xb56cff, 0xff5ea8, 0xffb547, 0x4cffd2];
    for (let i = 0; i < 5; i++) {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(.45, 0), new THREE.MeshPhysicalMaterial({ color: cols[i], roughness: .1, metalness: .2, transmission: .7, thickness: 1, emissive: cols[i], emissiveIntensity: .4, iridescence: 1 }));
      const w = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: cols[i], toneMapped: false }));
      m.add(w);
      root.add(m);
      this.pathCubes.push(m);
    }
    root.visible = false;
    this.futureRoot = root;
    this.scene.add(root);
  }

  /* ---------------- post processing ---------------- */
  buildPost() {
    const composer = new EffectComposer(this.renderer);
    composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), .75, .6, .82);
    composer.addPass(this.bloom);
    this.finalPass = new ShaderPass({
      uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uAberr: { value: 0 }, uFlash: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: /* glsl */`
        uniform sampler2D tDiffuse; uniform float uTime; uniform float uAberr; uniform float uFlash; varying vec2 vUv;
        void main(){
          vec2 c = vUv - .5; float d = length(c);
          vec2 off = c * (0.0025 + uAberr) * d * 2.;
          vec3 col;
          col.r = texture2D(tDiffuse, vUv + off).r;
          col.g = texture2D(tDiffuse, vUv).g;
          col.b = texture2D(tDiffuse, vUv - off).b;
          col += uFlash;
          gl_FragColor = vec4(col, 1.);
        }`,
    });
    composer.addPass(this.finalPass);
    composer.addPass(new OutputPass());
    this.composer = composer;
  }

  flash() { this.flashV = .55; }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h); this.composer.setSize(w, h);
    this.isMobile = w < 800;
  }

  setScene(name) {
    if (this.scene3 === name) return;
    this.scene3 = name;
    this.setPalette(name);
    const shapes = { hero: 'ta7', camera: 'aperture', hdd: 't8tb', backup: 't321', cases: 'tsugoi', future: 'sphere', sources: 'tsuki' };
    if (this.morph.shapes[shapes[name]]) this.morph.setShape(shapes[name]);
    else this.morph.setShape('ring');
  }

  /* ================= frame update ================= */
  adaptQuality(rawDt) {
    // adaptive resolution: keep the experience smooth on weaker GPUs
    this._acc = (this._acc || 0) + rawDt; this._n = (this._n || 0) + 1;
    if (this._acc < 1.5) return;
    const avg = this._acc / this._n; this._acc = 0; this._n = 0;
    const pr = this.renderer.getPixelRatio();
    const max = Math.min(window.devicePixelRatio, this.isMobile ? 1.5 : 2);
    let next = pr;
    if (avg > 1 / 40) next = Math.max(.5, pr * .75);
    else if (avg < 1 / 58 && pr < max) next = Math.min(max, pr * 1.15);
    if (Math.abs(next - pr) > .04) {
      this.renderer.setPixelRatio(next);
      this.composer.setPixelRatio ? this.composer.setPixelRatio(next) : null;
      this.composer.setSize(window.innerWidth, window.innerHeight);
    }
    this.bloom.enabled = next > .6;
  }

  update() {
    const now = performance.now(); const rawDt = (now - this._last) / 1000; this._last = now; this.elapsed = (this.elapsed || 0) + Math.min(rawDt, .1);
    this.adaptQuality(rawDt);
    const dt = Math.min(rawDt, .05);
    const t = this.elapsed;
    this.mouseS.lerp(this.mouse, 1 - Math.pow(.002, dt));
    const m = this.mouseS;
    const F = this.focus, P = this.progress;
    const side = this.isMobile ? 0 : 1;

    // palette blend
    if (this.paletteTarget) {
      const k = 1 - Math.pow(.05, dt);
      this.nebulaU.uA.value.lerp(this.paletteTarget[0], k);
      this.nebulaU.uB.value.lerp(this.paletteTarget[1], k);
      this.nebulaU.uC.value.lerp(this.paletteTarget[2], k);
    }
    this.nebulaU.uTime.value = t;
    this.nebulaU.uScroll.value = this.scroll;
    this.nebulaU.uMouse.value.copy(m);
    this.stars.uniforms.uTime.value = t;
    const warp = clamp((F.future || 0) * (P.future || 0) * 1.4) + clamp(Math.abs(this.velocity) * .002, 0, .5);
    this.stars.uniforms.uWarp.value = lerp(this.stars.uniforms.uWarp.value, warp, .08);
    this.stars.uniforms.uTravel.value += dt * (1 + this.stars.uniforms.uWarp.value * 40) + Math.abs(this.velocity) * .0008;

    // morph particles
    this.morph.update(dt, t);
    const mpOp = this.scene3 === 'hero' ? 1 : this.scene3 === 'sources' ? .9 : .55;
    this.morph.uniforms.uOpacity.value = lerp(this.morph.uniforms.uOpacity.value, mpOp, .05);
    this.morph.points.rotation.y = lerp(this.morph.points.rotation.y, m.x * .25 + (this.scene3 === 'camera' || this.scene3 === 'future' ? t * .1 : 0), .05);
    this.morph.points.rotation.x = lerp(this.morph.points.rotation.x, -m.y * .15, .05);
    const mpZ = { hero: -2, camera: -3.5, hdd: -4, backup: -6, cases: -5, future: -3, sources: -1 }[this.scene3] ?? -3;
    this.morph.points.position.z = lerp(this.morph.points.position.z, mpZ, .04);
    const mpY = { hero: 1.4 }[this.scene3] ?? 0;
    this.morph.points.position.y = lerp(this.morph.points.position.y, mpY, .04);

    /* ---- camera model (hero + ch1) ---- */
    const fh = F.hero || 0, fc = F.camera || 0, pc = P.camera || 0;
    const camVis = Math.max(fh, fc);
    this.cameraRoot.visible = camVis > .01;
    if (this.cameraRoot.visible) {
      const parts = this.cameraModel.userData.parts;
      // stage choreography: 0-.3 rotate to front, .3-.6 lens detaches (sensor), .6-.85 LCD swings, .85-1 back view
      const a = ease(seg(pc, 0, .3)), b = ease(seg(pc, .3, .55)), c = ease(seg(pc, .6, .85)), d = ease(seg(pc, .82, 1));
      const baseRotY = lerp(-.6 + t * .0, -.35, fc) + a * .35 - b * .5 + c * 1.2 + d * 1.6;
      this.cameraModel.rotation.y = lerp(this.cameraModel.rotation.y, baseRotY + m.x * .35 + (fh > .5 ? Math.sin(t * .4) * .25 : 0), .08);
      this.cameraModel.rotation.x = lerp(this.cameraModel.rotation.x, .12 - m.y * .2 + b * .1, .08);
      parts.lens.position.z = .24 + b * 1.1;
      parts.lens.rotation.z = b * 1.2;
      parts.lcd.rotation.y = -c * 2.2;
      parts.lcd.rotation.x = c * .5;
      parts.zoom.rotation.y = t * .3;
      parts.dialL.rotation.y = pc * 6;
      this.rayU.uTime.value = t; this.rayU.uOp.value = fc * (1 - b * .3);
      this.camDisc.scale.setScalar(1 + Math.sin(t * 1.5) * .05);
      this.holo.rotation.z = t * .2; this.holo.children.forEach((r, i) => { r.material.opacity = .5 * fc; r.rotation.z = t * (.2 + i * .1); });
      const inHero = fh >= fc;
      const tx = inHero ? side * 1.9 : side * lerp(2.6, 1.3, fc);
      this.cameraRoot.position.x = lerp(this.cameraRoot.position.x, tx, .07);
      this.cameraRoot.position.y = lerp(this.cameraRoot.position.y, (inHero ? -.6 : .2) + Math.sin(t * .8) * .08, .07);
      const sc = (inHero ? .85 : lerp(.6, 1, fc)) * (this.isMobile ? .65 : 1);
      this.cameraRoot.scale.setScalar(lerp(this.cameraRoot.scale.x, sc * camVis, .1));
    }

    /* ---- HDD (ch2) ---- */
    const fd = F.hdd || 0, pd = P.hdd || 0;
    this.hddRoot.visible = fd > .01;
    if (this.hddRoot.visible) {
      const parts = this.hdd.userData.parts;
      const ex = ease(seg(pd, .15, .55));
      const tr = ease(seg(pd, .5, .8));
      parts.lid.position.y = .057 + ex * 1.0;
      parts.lid.rotation.x = -ex * .25;
      parts.pcb.position.y = -.135 - ex * .6;
      parts.platters.forEach((p, i) => { p.position.y = i * .03 - .06 + ex * i * .14; p.userData.tracks.children.forEach((r, k) => { r.material.opacity = tr * (.35 + .65 * Math.max(0, Math.sin(t * 3 - k * .6 - i))); }); });
      parts.platterGroup.rotation.y += dt * (2 + 30 * fd);
      parts.arm.rotation.y = .55 + Math.sin(t * 2.3) * .18 * (.3 + ex) - ex * .1;
      parts.arm.position.y = .02 + ex * .28;
      this.hdd.rotation.x = lerp(this.hdd.rotation.x, .55 + ex * .25 - m.y * .2, .08);
      this.hdd.rotation.y = lerp(this.hdd.rotation.y, -.6 + pd * 1.4 + m.x * .4, .08);
      this.hdd.rotation.z = lerp(this.hdd.rotation.z, -.1, .08);
      this.streamU.uTime.value = t; this.streamU.uOp.value = fd * (.3 + tr);
      this.fileSprites.forEach((s, i) => { const a = s.userData.a + t * .3; s.position.set(Math.cos(a) * 3.4, Math.sin(t + i) * .4 + 1.2 * Math.sin(a * 2) * .3, Math.sin(a) * 2.2); s.material.opacity = fd * ease(seg(pd, .55, .9)); });
      this.hddHalo.material.opacity = .45 * fd;
      const ox = (P.hddFocus ?? 0);
      this.hddRoot.position.x = lerp(this.hddRoot.position.x, side * lerp(3, 1.2, fd), .07);
      this.hddRoot.position.y = lerp(this.hddRoot.position.y, Math.sin(t * .7) * .1, .07);
      this.hddRoot.scale.setScalar(lerp(this.hddRoot.scale.x, fd * (this.isMobile ? .6 : 1), .1));
    }

    /* ---- Backup network (ch3) ---- */
    const fb = F.backup || 0, pb = P.backup || 0;
    this.backupRoot.visible = fb > .01;
    if (this.backupRoot.visible) {
      this.backupCore.rotation.y += dt * .4;
      this.backupCore.userData.parts.platterGroup.rotation.y += dt * 20;
      this.backupNodes.forEach(n => {
        const s = ease(seg(pb, .08 + n.i * .12, .3 + n.i * .12));
        n.d.scale.setScalar(1.6 * s); n.lab.material.opacity = s; n.lab.visible = s > .01;
        n.d.rotation.y = Math.sin(t * .6 + n.i) * .4;
        n.d.position.y = n.curve.v2.y + Math.sin(t + n.i) * .08;
        n.tube.geometry.setDrawRange(0, Math.floor(n.total * s));
        n.packets.forEach((pk, k) => { const u = (t * .35 + k / n.packets.length) % 1; pk.position.copy(n.curve.getPoint(u)); pk.visible = s > .98; pk.scale.setScalar(.6 + Math.sin(u * Math.PI) * .8); });
      });
      const sh = ease(seg(pb, .75, 1));
      this.shield.material.opacity = sh * .22 * fb; this.shield.rotation.y = t * .08; this.shield.rotation.x = t * .05;
      this.shield.scale.setScalar(lerp(.6, 1, sh));
      this.backupRoot.rotation.y = lerp(this.backupRoot.rotation.y, m.x * .35 + Math.sin(t * .2) * .1, .05);
      this.backupRoot.rotation.x = lerp(this.backupRoot.rotation.x, -m.y * .15, .05);
      this.backupRoot.scale.setScalar(lerp(this.backupRoot.scale.x, fb * (this.isMobile ? .5 : .78), .1));
      this.backupRoot.position.y = lerp(this.backupRoot.position.y, .5, .05);
      this.backupRoot.position.x = lerp(this.backupRoot.position.x, side * 1.7, .05);
    }

    /* ---- Gallery (ch4) ---- */
    const fg = F.cases || 0, pg = P.cases || 0;
    this.casesRoot.visible = fg > .01;
    if (this.casesRoot.visible) {
      const spread = ease(seg(pg, 0, .5));
      const R = lerp(.3, 3.4, spread);
      this.photos.forEach((ph, i) => {
        const a = ph.userData.a + pg * Math.PI * 2 + t * .08;
        ph.position.set(Math.sin(a) * R, Math.sin(t * .8 + i) * .15 + (i % 2 ? .3 : -.3) * spread, Math.cos(a) * R - 1);
        ph.rotation.y = a;
        ph.rotation.z = (1 - spread) * (i - 2.5) * .15;
      });
      this.confU.uTime.value = t; this.confU.uOp.value = fg * ease(seg(pg, .3, .7));
      this.casesRoot.rotation.x = lerp(this.casesRoot.rotation.x, -.12 - m.y * .15, .05);
      this.casesRoot.rotation.y = lerp(this.casesRoot.rotation.y, m.x * .3, .05);
      this.casesRoot.scale.setScalar(lerp(this.casesRoot.scale.x, fg * (this.isMobile ? .6 : 1), .1));
    }

    /* ---- Future (ch5) ---- */
    const ff = F.future || 0, pf = P.future || 0;
    this.futureRoot.visible = ff > .01;
    if (this.futureRoot.visible) {
      this.tunnelU.uTime.value = t; this.tunnelU.uSpeed.value = pf; this.tunnelU.uOp.value = ff;
      this.pathCubes.forEach((c, i) => {
        const a = i / 5 * Math.PI * 2 + t * .3;
        const r = lerp(1.2, 2.4, ease(seg(pf, .1, .6)));
        c.position.set(Math.cos(a) * r, Math.sin(a) * r * .6, -2 - Math.sin(t + i) * .5);
        c.rotation.x = t * (.4 + i * .1); c.rotation.y = t * .5;
        c.scale.setScalar(ff * lerp(.6, 1.1, Math.sin(t * 2 + i) * .5 + .5));
      });
      this.futureRoot.rotation.z = t * .05 + m.x * .2;
    }

    // camera rig
    const camZ = 8 + (F.backup || 0) * 2 + (F.cases || 0) * .5;
    this.camPos.set(m.x * .35, m.y * .25, camZ);
    this.camera.position.lerp(this.camPos, .06);
    this.camera.lookAt(this.camTarget);

    // rim lights orbit
    this.rimA.position.set(Math.cos(t * .4) * 5, 2, Math.sin(t * .4) * 5);
    this.rimB.position.set(Math.cos(t * .4 + Math.PI) * 5, -1.5, Math.sin(t * .4 + Math.PI) * 5);

    // post
    this.flashV = (this.flashV || 0) * Math.pow(.004, Math.min(rawDt, .25));
    this.finalPass.uniforms.uFlash.value = this.flashV;
    this.finalPass.uniforms.uAberr.value = lerp(this.finalPass.uniforms.uAberr.value, clamp(Math.abs(this.velocity) * .00004, 0, .02) + warp * .01, .1);
    this.bloom.strength = lerp(this.bloom.strength, .7 + warp * .6, .05);

    this.composer.render();
  }
}
