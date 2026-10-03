import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { textTexture, lcdTexture, wdLabelTexture, sensorTexture } from './textures.js';

const body = () => new THREE.MeshPhysicalMaterial({ color: 0x17181c, roughness: .55, metalness: .35, clearcoat: .4, clearcoatRoughness: .5 });
const rubber = () => new THREE.MeshStandardMaterial({ color: 0x0b0b0d, roughness: .95, metalness: 0 });
const metal = (c = 0x2a2b30, r = .3) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: .9 });

/* =========================================================
   Sony α7 IV – procedural, stylised model (≈ units: 1 = 10cm)
   ========================================================= */
export function createCamera() {
  const g = new THREE.Group();
  g.name = 'camera';
  const parts = {};

  // main body
  const bodyMesh = new THREE.Mesh(new RoundedBoxGeometry(1.31, .86, .48, 6, .07), body());
  bodyMesh.position.set(0, 0, 0);
  g.add(bodyMesh);

  // grip
  const grip = new THREE.Mesh(new RoundedBoxGeometry(.34, .84, .36, 6, .12), rubber());
  grip.position.set(-.53, -.01, .3);
  g.add(grip);

  // EVF hump
  const hump = new THREE.Group();
  const humpBase = new THREE.Mesh(new RoundedBoxGeometry(.5, .3, .46, 5, .06), body());
  humpBase.position.set(.02, .5, -.01);
  hump.add(humpBase);
  const humpTop = new THREE.Mesh(new RoundedBoxGeometry(.38, .12, .38, 4, .04), body());
  humpTop.position.set(.02, .66, -.01);
  hump.add(humpTop);
  // hot shoe
  const shoe = new THREE.Mesh(new THREE.BoxGeometry(.22, .02, .2), metal(0x55565c, .2));
  shoe.position.set(.02, .73, -.01);
  hump.add(shoe);
  g.add(hump);

  // SONY logo
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(.34, .085), new THREE.MeshBasicMaterial({ map: textTexture('SONY', { font: '700 92px "Times New Roman", serif', letter: 10 }), transparent: true }));
  logo.position.set(.02, .55, .232);
  g.add(logo);
  // alpha mark
  const alpha = new THREE.Mesh(new THREE.PlaneGeometry(.16, .16), new THREE.MeshBasicMaterial({ map: textTexture('α', { w: 128, h: 128, font: '400 110px "Times New Roman", serif' }), transparent: true }));
  alpha.position.set(.5, .3, .242);
  g.add(alpha);

  // dials
  const dial = (x, z, r, h, label) => {
    const d = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 48, 1), metal(0x1d1e22, .45));
    d.position.set(x, .43 + h / 2, z);
    g.add(d);
    // knurling ring
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, .006, 6, 64), metal(0x6b6d74, .2));
    ring.rotation.x = Math.PI / 2; ring.position.set(x, .43 + h, z);
    g.add(ring);
    return d;
  };
  parts.dialL = dial(.42, -.02, .11, .07);
  parts.dialR = dial(-.32, -.08, .085, .06);
  parts.dialR2 = dial(-.5, .12, .07, .05);
  // shutter button
  const shutter = new THREE.Mesh(new THREE.CylinderGeometry(.045, .05, .04, 32), metal(0x9a9ca3, .15));
  shutter.position.set(-.52, .45, .32);
  g.add(shutter);
  parts.shutter = shutter;
  // REC / photo-video lever
  const lever = new THREE.Mesh(new THREE.CylinderGeometry(.075, .075, .02, 32), metal(0x8b1f23, .4));
  lever.position.set(.42, .515, -.02);
  g.add(lever);

  /* ---- Lens mount + lens ---- */
  const lens = new THREE.Group();
  lens.position.set(.1, -.05, .24);
  const mount = new THREE.Mesh(new THREE.TorusGeometry(.33, .03, 16, 80), metal(0xb9bcc4, .15));
  lens.add(mount);
  const barrelMat = new THREE.MeshPhysicalMaterial({ color: 0x141518, roughness: .45, metalness: .5, clearcoat: .6 });
  const seg = (rTop, rBot, len, z, mat = barrelMat) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, len, 80, 1, true), mat);
    m.rotation.x = Math.PI / 2; m.position.z = z;
    lens.add(m);
    const cap = new THREE.Mesh(new THREE.RingGeometry(Math.min(rTop, rBot) * .2, rTop, 80), mat);
    cap.position.z = z + len / 2; lens.add(cap);
    return m;
  };
  seg(.31, .31, .12, .06);
  // zoom ring with ribs
  const ribTex = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 32; const x = c.getContext('2d'); x.fillStyle = '#121214'; x.fillRect(0, 0, 512, 32); x.fillStyle = '#2b2c31'; for (let i = 0; i < 512; i += 8) x.fillRect(i, 0, 4, 32); const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.repeat.set(4, 1); return t; })();
  const ribMat = new THREE.MeshStandardMaterial({ map: ribTex, roughness: .8, metalness: .2, bumpMap: ribTex, bumpScale: .02 });
  parts.zoom = seg(.325, .325, .2, .22, ribMat);
  seg(.315, .315, .14, .39);
  parts.focus = seg(.33, .33, .14, .53, ribMat);
  // G badge ring
  const gRing = new THREE.Mesh(new THREE.TorusGeometry(.33, .008, 8, 96), new THREE.MeshStandardMaterial({ color: 0xff7a1a, emissive: 0x6a2a00, roughness: .3, metalness: .6 }));
  gRing.position.z = .61; lens.add(gRing);
  seg(.345, .33, .06, .63);
  // front glass – iridescent coating
  const glass = new THREE.Mesh(new THREE.SphereGeometry(.29, 64, 32, 0, Math.PI * 2, 0, Math.PI * .32), new THREE.MeshPhysicalMaterial({
    color: 0x0a0f20, roughness: .02, metalness: .1, transmission: .0, clearcoat: 1, clearcoatRoughness: 0,
    iridescence: 1, iridescenceIOR: 1.8, iridescenceThicknessRange: [200, 900], envMapIntensity: 2.2,
  }));
  glass.rotation.x = Math.PI / 2; glass.position.z = .5; glass.scale.set(1, .35, 1);
  lens.add(glass);
  // inner elements
  for (let i = 0; i < 4; i++) {
    const r = new THREE.Mesh(new THREE.RingGeometry(.12 + i * .04, .13 + i * .04, 64), new THREE.MeshBasicMaterial({ color: [0x5ee7ff, 0xb56cff, 0x2b6bff, 0x66ffcc][i], transparent: true, opacity: .25, side: THREE.DoubleSide }));
    r.position.z = .58 - i * .05; lens.add(r);
  }
  g.add(lens);
  parts.lens = lens;
  parts.lensGlass = glass;

  // sensor (seen when lens detaches)
  const sensor = new THREE.Mesh(new THREE.PlaneGeometry(.36, .24), new THREE.MeshPhysicalMaterial({ map: sensorTexture(), roughness: .1, metalness: .8, iridescence: 1, iridescenceIOR: 2, emissive: 0x111133 }));
  sensor.position.set(.1, -.05, .2);
  g.add(sensor);
  parts.sensor = sensor;

  /* ---- Rear LCD (vari-angle) ---- */
  const lcdPivot = new THREE.Group();
  lcdPivot.position.set(.62, -.02, -.25); // hinge on the side (vari-angle)
  const lcdFrame = new THREE.Mesh(new RoundedBoxGeometry(.9, .6, .04, 4, .02), body());
  lcdFrame.position.set(-.5, 0, -.02);
  lcdPivot.add(lcdFrame);
  const lcd = new THREE.Mesh(new THREE.PlaneGeometry(.82, .54), new THREE.MeshBasicMaterial({ map: lcdTexture(), toneMapped: false }));
  lcd.position.set(-.5, 0, -.042); lcd.rotation.y = Math.PI;
  lcdPivot.add(lcd);
  g.add(lcdPivot);
  parts.lcd = lcdPivot;

  // EVF eyecup
  const eyecup = new THREE.Mesh(new RoundedBoxGeometry(.3, .2, .1, 4, .04), rubber());
  eyecup.position.set(.02, .55, -.28);
  g.add(eyecup);

  // strap lugs
  [[-.66, .32], [.66, .32]].forEach(([x, y]) => {
    const lug = new THREE.Mesh(new THREE.TorusGeometry(.035, .01, 8, 24), metal(0x8d9097, .2));
    lug.position.set(x, y, 0); lug.rotation.y = Math.PI / 2; g.add(lug);
  });

  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.userData.parts = parts;
  return g;
}

/* =========================================================
   WD Blue 8TB — 3.5" HDD with exploded internals
   ========================================================= */
export function createHDD() {
  const g = new THREE.Group();
  g.name = 'hdd';
  const parts = {};
  const W = 1.46, D = 1.02, H = .26; // ~146 x 101.6 x 26.1 mm

  // base casting
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x8e9299, roughness: .35, metalness: 1 });
  const base = new THREE.Mesh(new RoundedBoxGeometry(D, H * .7, W, 4, .02), baseMat);
  base.position.y = -H * .15;
  g.add(base);
  parts.base = base;

  // PCB underneath
  const pcb = new THREE.Mesh(new THREE.BoxGeometry(D * .92, .02, W * .7), new THREE.MeshStandardMaterial({ color: 0x0d3b2a, roughness: .6, metalness: .2, emissive: 0x002211 }));
  pcb.position.set(0, -H * .52, -.12);
  g.add(pcb);
  parts.pcb = pcb;
  // chips on PCB
  for (let i = 0; i < 5; i++) {
    const chip = new THREE.Mesh(new THREE.BoxGeometry(.12 + Math.random() * .08, .02, .1 + Math.random() * .08), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: .4 }));
    chip.position.set(-.3 + i * .15, -.01, -.2 + Math.random() * .4);
    pcb.add(chip);
  }

  // platters (stack)
  const platterGroup = new THREE.Group();
  platterGroup.position.set(0, .02, .2);
  const platterMat = new THREE.MeshPhysicalMaterial({ color: 0xe6e9ef, metalness: 1, roughness: .08, clearcoat: 1, iridescence: .6, iridescenceIOR: 1.6, iridescenceThicknessRange: [100, 500] });
  parts.platters = [];
  for (let i = 0; i < 5; i++) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(.45, .45, .012, 128), platterMat);
    p.position.y = i * .03 - .06;
    platterGroup.add(p);
    parts.platters.push(p);
    // track rings (CMR – non-overlapping)
    const tracks = new THREE.Group();
    for (let k = 0; k < 9; k++) {
      const r = new THREE.Mesh(new THREE.RingGeometry(.15 + k * .033, .152 + k * .033, 128), new THREE.MeshBasicMaterial({ color: 0x5ee7ff, transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
      r.rotation.x = -Math.PI / 2; r.position.y = .007;
      tracks.add(r);
    }
    p.add(tracks);
    p.userData.tracks = tracks;
  }
  const spindle = new THREE.Mesh(new THREE.CylinderGeometry(.11, .11, .2, 48), new THREE.MeshStandardMaterial({ color: 0xc8ccd3, metalness: 1, roughness: .15 }));
  platterGroup.add(spindle);
  const spindleCap = new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, .02, 48), new THREE.MeshStandardMaterial({ color: 0xb0b3b9, metalness: 1, roughness: .25 }));
  spindleCap.position.y = .1; platterGroup.add(spindleCap);
  for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .01, 12), metal(0x44464c)); const a = i / 6 * Math.PI * 2; s.position.set(Math.cos(a) * .08, .112, Math.sin(a) * .08); platterGroup.add(s); }
  g.add(platterGroup);
  parts.platterGroup = platterGroup;

  // actuator arm
  const arm = new THREE.Group();
  arm.position.set(.34, .02, -.42);
  const pivot = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, .18, 32), metal(0x9ea2a9, .2));
  arm.add(pivot);
  const armShape = new THREE.Shape();
  armShape.moveTo(-.04, 0); armShape.lineTo(-.02, .62); armShape.lineTo(.02, .62); armShape.lineTo(.06, 0); armShape.closePath();
  const armGeo = new THREE.ExtrudeGeometry(armShape, { depth: .012, bevelEnabled: false });
  for (let i = 0; i < 5; i++) {
    const a = new THREE.Mesh(armGeo, new THREE.MeshStandardMaterial({ color: 0xd8dbe0, metalness: 1, roughness: .2 }));
    a.rotation.x = -Math.PI / 2; a.position.y = i * .03 - .055;
    arm.add(a);
    const head = new THREE.Mesh(new THREE.BoxGeometry(.03, .008, .04), new THREE.MeshStandardMaterial({ color: 0xffb547, emissive: 0xff7a00, emissiveIntensity: 1.5 }));
    head.position.set(0, i * .03 - .05, -.6);
    arm.add(head);
  }
  // voice coil magnet
  const vcm = new THREE.Mesh(new THREE.BoxGeometry(.25, .06, .18), metal(0x3a3c42, .4));
  vcm.position.set(.1, -.02, .12); arm.add(vcm);
  arm.rotation.y = .55;
  g.add(arm);
  parts.arm = arm;

  // top cover (lid)
  const lidMat = new THREE.MeshStandardMaterial({ color: 0xb7bbc2, roughness: .28, metalness: 1 });
  const lid = new THREE.Group();
  const lidMesh = new THREE.Mesh(new RoundedBoxGeometry(D * .98, .03, W * .98, 3, .012), lidMat);
  lid.add(lidMesh);
  const label = new THREE.Mesh(new THREE.PlaneGeometry(D * .78, W * .54), new THREE.MeshStandardMaterial({ map: wdLabelTexture(), roughness: .6, metalness: 0 }));
  label.rotation.x = -Math.PI / 2; label.rotation.z = Math.PI / 2; label.position.set(0, .017, -.12);
  label.rotation.z = -Math.PI / 2;
  lid.add(label);
  // spindle dome on lid
  const dome = new THREE.Mesh(new THREE.CylinderGeometry(.14, .14, .01, 48), metal(0x9b9fa6, .3));
  dome.position.set(0, .02, .45); lid.add(dome);
  // screws
  [[-.45, -.68], [.45, -.68], [-.45, .68], [.45, .68], [-.45, 0], [.45, 0]].forEach(([x, z]) => {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .012, 6), metal(0x2c2e33, .3));
    s.position.set(x, .02, z); lid.add(s);
  });
  lid.position.y = H * .22;
  g.add(lid);
  parts.lid = lid;

  // SATA connector
  const sata = new THREE.Mesh(new THREE.BoxGeometry(.5, .06, .05), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: .5 }));
  sata.position.set(0, -H * .35, -W / 2 - .01);
  g.add(sata);

  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.userData.parts = parts;
  return g;
}

/* =========================================================
   Simple stylised storage devices for the 3-2-1 network
   ========================================================= */
export function createDevice(type, color) {
  const g = new THREE.Group();
  const mat = new THREE.MeshPhysicalMaterial({ color: 0x15192a, roughness: .3, metalness: .7, clearcoat: 1 });
  const glow = new THREE.MeshBasicMaterial({ color, toneMapped: false });
  if (type === 'pc') {
    const m = new THREE.Mesh(new RoundedBoxGeometry(.7, .5, .05, 4, .02), mat); m.position.y = .2; g.add(m);
    const s = new THREE.Mesh(new THREE.PlaneGeometry(.64, .42), new THREE.MeshBasicMaterial({ color: 0x0b1f4d })); s.position.set(0, .2, .027); g.add(s);
    const bar = new THREE.Mesh(new THREE.PlaneGeometry(.5, .02), glow); bar.position.set(0, .05, .03); g.add(bar);
    const st = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .2, 16), mat); st.position.y = -.12; g.add(st);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(.15, .18, .02, 32), mat); b.position.y = -.22; g.add(b);
  } else if (type === 'ext') {
    const m = new THREE.Mesh(new RoundedBoxGeometry(.32, .5, .1, 6, .04), mat); g.add(m);
    const l = new THREE.Mesh(new THREE.CircleGeometry(.02, 16), glow); l.position.set(0, -.18, .052); g.add(l);
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(.24, .01), glow); stripe.position.set(0, .2, .052); g.add(stripe);
  } else if (type === 'cloud') {
    const cm = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .3, transmission: .6, thickness: .5, emissive: color, emissiveIntensity: .25 });
    [[0, 0, .22], [.22, -.05, .17], [-.22, -.05, .17], [.1, .12, .17], [-.1, .1, .15]].forEach(([x, y, r]) => { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 16), cm); s.position.set(x, y, 0); g.add(s); });
  } else if (type === 'usb') {
    const m = new THREE.Mesh(new RoundedBoxGeometry(.14, .38, .06, 4, .02), mat); g.add(m);
    const p = new THREE.Mesh(new THREE.BoxGeometry(.09, .1, .03), metal(0xc0c4cc, .2)); p.position.y = .24; g.add(p);
    const lock = new THREE.Mesh(new THREE.TorusGeometry(.03, .008, 8, 16, Math.PI), glow); lock.position.set(0, .03, .035); g.add(lock);
    const lb = new THREE.Mesh(new THREE.PlaneGeometry(.06, .05), glow); lb.position.set(0, -.01, .035); g.add(lb);
  } else if (type === 'club') {
    // school / photo club building
    const m = new THREE.Mesh(new THREE.BoxGeometry(.6, .32, .3), mat); g.add(m);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(.45, .2, 4), mat); roof.position.y = .26; roof.rotation.y = Math.PI / 4; g.add(roof);
    for (let i = 0; i < 4; i++) { const w = new THREE.Mesh(new THREE.PlaneGeometry(.08, .08), glow); w.position.set(-.21 + i * .14, 0, .152); g.add(w); }
  }
  return g;
}
