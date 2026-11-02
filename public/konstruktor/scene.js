/* 3D-сцена конструктора. Рисует только по запросу, а не в постоянном
   цикле: на телефоне это экономит батарею и не греет его впустую. */
import * as THREE from '../vendor/three/three.module.min.js';
import { OrbitControls } from '../vendor/three/OrbitControls.js';

const MM = 0.001;
const DIM_OFFSET = 130;
const TICK = 34;
const OPEN_ANGLE = 1.75;
const INK = 0x2b1e16;
const RULE = 0x5c4634;

function grainTexture(hex) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = hex;
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * 256;
    g.strokeStyle = `rgba(40,22,10,${0.03 + Math.random() * 0.09})`;
    g.lineWidth = 0.6 + Math.random() * 1.6;
    g.beginPath();
    g.moveTo(x, 0);
    g.bezierCurveTo(x + 6 - Math.random() * 12, 90, x + 6 - Math.random() * 12, 170, x + 4 - Math.random() * 8, 256);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function gridLines(size, step, plane) {
  const pts = [];
  for (let a = -size; a <= size + 1e-6; a += step) {
    if (plane === 'floor') pts.push(a, 0, 0, a, 0, size, -size, 0, Math.max(0, a), size, 0, Math.max(0, a));
    else pts.push(a, 0, 0, a, size, 0, -size, Math.max(0, a), 0, size, Math.max(0, a), 0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: RULE, transparent: true, opacity: 0.55 }));
}

/* Силуэт человека на стене, чтобы размер читался сразу */
function figure() {
  const s = new THREE.Shape();
  s.moveTo(-0.07, 0);
  s.lineTo(-0.15, 0);
  s.lineTo(-0.17, 0.82);
  s.quadraticCurveTo(-0.2, 0.98, -0.17, 1.08);
  s.lineTo(-0.27, 0.86);
  s.lineTo(-0.31, 0.88);
  s.quadraticCurveTo(-0.29, 1.28, -0.2, 1.4);
  s.quadraticCurveTo(-0.08, 1.44, -0.05, 1.46);
  s.lineTo(0.05, 1.46);
  s.quadraticCurveTo(0.08, 1.44, 0.2, 1.4);
  s.quadraticCurveTo(0.29, 1.28, 0.31, 0.88);
  s.lineTo(0.27, 0.86);
  s.lineTo(0.17, 1.08);
  s.quadraticCurveTo(0.2, 0.98, 0.17, 0.82);
  s.lineTo(0.15, 0);
  s.lineTo(0.07, 0);
  s.lineTo(0.02, 0.8);
  s.lineTo(-0.02, 0.8);
  s.closePath();
  const mat = new THREE.MeshBasicMaterial({ color: 0x1c120c, transparent: true, opacity: 0.6 });
  const group = new THREE.Group();
  group.add(new THREE.Mesh(new THREE.ShapeGeometry(s, 10), mat));
  const head = new THREE.Mesh(new THREE.CircleGeometry(0.095, 28), mat);
  head.position.y = 1.56;
  group.add(head);
  return group;
}

export function createScene(stage, labels) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  stage.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(INK);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 60);
  const dirView = new THREE.Vector3(-0.42, 0.22, 1).normalize();

  scene.add(new THREE.HemisphereLight(0xfff4e6, 0x4a3728, 1.9));
  const sun = new THREE.DirectionalLight(0xfff1e0, 2.1);
  sun.position.set(-2.6, 4.4, 4.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -6; sun.shadow.camera.right = 6;
  sun.shadow.camera.top = 6; sun.shadow.camera.bottom = -6;
  sun.shadow.bias = -0.0006;
  sun.shadow.radius = 4;
  scene.add(sun);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x4a3626, roughness: 1 });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1e, roughness: 1 });
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), wallMat);
  wall.position.set(0, 4, -0.003);
  wall.receiveShadow = true;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -0.001, 4);
  floor.receiveShadow = true;
  const side = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), wallMat);
  side.rotation.y = -Math.PI / 2;
  side.position.set(0, 4, 4);
  side.receiveShadow = true;
  side.visible = false;
  scene.add(wall, floor, side, gridLines(8, 0.5, 'floor'), gridLines(8, 0.5, 'wall'));

  const man = figure();
  man.position.z = 0.002;
  scene.add(man);

  const root = new THREE.Group();
  scene.add(root);
  const dimLines = new THREE.Group();
  scene.add(dimLines);

  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const plateGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 28);
  const unitEdges = new THREE.EdgesGeometry(unitBox);
  const textures = {};
  const mats = {};
  const lineMats = {};

  function matFor(color, kind) {
    const key = color.hex + kind;
    if (mats[key]) return mats[key];
    const base = {
      roughness: 0.72, metalness: 0,
      polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1
    };
    if (kind === 'plate') return (mats[key] = new THREE.MeshStandardMaterial({ ...base, color: 0xf3f0e8, roughness: 0.35 }));
    if (kind === 'stone') return (mats[key] = new THREE.MeshStandardMaterial({ ...base, color: 0x6f6e6a, roughness: 0.5 }));
    if (kind === 'metal') return (mats[key] = new THREE.MeshStandardMaterial({ ...base, color: 0xc9c7c0, roughness: 0.35, metalness: 0.5 }));
    if (color.grain) {
      textures[color.hex] = textures[color.hex] || grainTexture(color.hex);
      return (mats[key] = new THREE.MeshStandardMaterial({ ...base, map: textures[color.hex] }));
    }
    return (mats[key] = new THREE.MeshStandardMaterial({ ...base, color: color.hex }));
  }

  function lineFor(hex) {
    return lineMats[hex] || (lineMats[hex] = new THREE.LineBasicMaterial({ color: hex, transparent: true, opacity: 0.75 }));
  }

  const dimMat = new THREE.LineBasicMaterial({ color: 0xf2ebe3 });
  const extMat = new THREE.LineBasicMaterial({ color: 0xc8baad, transparent: true, opacity: 0.55 });

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableDamping = false;
  controls.minAzimuthAngle = -1.2;
  controls.maxAzimuthAngle = 1.2;
  controls.minPolarAngle = 0.7;
  controls.maxPolarAngle = 1.53;
  controls.rotateSpeed = 0.7;
  controls.addEventListener('change', invalidate);

  let pending = false;
  let dimLabels = [];
  let fitDist = 0;
  let doorGroups = [];
  /* ящики и двери-купе: не поворачиваются, а сдвигаются на свой вектор */
  let slideGroups = [];
  /* просмотр без дверей: двери прячутся, цена не меняется */
  let doorsShown = true;
  let openness = 0;
  let openTarget = 0;
  let raf = 0;
  const v = new THREE.Vector3();

  function invalidate() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(renderNow);
  }

  function renderNow() {
    pending = false;
    renderer.render(scene, camera);
    placeLabels();
  }

  function placeLabels() {
    const w = stage.clientWidth, h = stage.clientHeight;
    dimLabels.forEach((d) => {
      v.copy(d.at).project(camera);
      const x = (v.x * 0.5 + 0.5) * w;
      const y = (-v.y * 0.5 + 0.5) * h;
      const inside = v.z < 1 && x > 14 && x < w - 14 && y > 10 && y < h - 10;
      d.el.hidden = !inside;
      if (inside) d.el.style.transform = `translate(-50%,-50%) translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
    });
  }

  function clearGroup(g) {
    while (g.children.length) {
      const c = g.children.pop();
      if (c.userData.owned) c.geometry.dispose();
    }
  }

  function addDim(d) {
    const a = new THREE.Vector3(...d.a).multiplyScalar(MM);
    const b = new THREE.Vector3(...d.b).multiplyScalar(MM);
    const n = new THREE.Vector3(...d.n);
    const off = DIM_OFFSET * MM;
    const a2 = a.clone().addScaledVector(n, off);
    const b2 = b.clone().addScaledVector(n, off);
    const axis = b.clone().sub(a).normalize();
    const slant = axis.clone().add(n).normalize().multiplyScalar(TICK * MM * 0.5);

    const ext = new THREE.BufferGeometry().setFromPoints([a, a2.clone().addScaledVector(n, off * 0.3), b, b2.clone().addScaledVector(n, off * 0.3)]);
    const extLine = new THREE.LineSegments(ext, extMat);
    extLine.userData.owned = true;
    dimLines.add(extLine);

    const main = new THREE.BufferGeometry().setFromPoints([
      a2, b2,
      a2.clone().sub(slant), a2.clone().add(slant),
      b2.clone().sub(slant), b2.clone().add(slant)
    ]);
    const mainLine = new THREE.LineSegments(main, dimMat);
    mainLine.userData.owned = true;
    dimLines.add(mainLine);

    const el = document.createElement('span');
    el.className = 'dimlab';
    el.textContent = d.v;
    labels.append(el);
    dimLabels.push({ el, at: a2.clone().add(b2).multiplyScalar(0.5).addScaledVector(n, off * 0.55) });
  }

  function makeMesh(p, color) {
    const kind = p.k === 'stone' || p.k === 'metal' || p.k === 'plate' ? p.k : 'panel';
    if (kind === 'plate') {
      /* тарелка: цилиндр, ось повёрнута вдоль x, чтобы стояла на ребре */
      const disc = new THREE.Mesh(plateGeo, matFor(color, 'plate'));
      disc.rotation.z = Math.PI / 2;
      disc.scale.set(p.s[1] * MM, p.s[0] * MM, p.s[2] * MM);
      disc.castShadow = true;
      disc.receiveShadow = true;
      return disc;
    }
    const mesh = new THREE.Mesh(unitBox, matFor(color, kind));
    mesh.scale.set(p.s[0] * MM, p.s[1] * MM, p.s[2] * MM);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (kind === 'panel') mesh.add(new THREE.LineSegments(unitEdges, lineFor(color.line)));
    return mesh;
  }

  function fit(force) {
    const box = new THREE.Box3().setFromObject(root);
    box.expandByPoint(new THREE.Vector3(man.position.x - 0.32, 1.65, 0));
    box.expandByScalar(0.16);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const vf = THREE.MathUtils.degToRad(camera.fov) / 2;
    const hf = Math.atan(Math.tan(vf) * camera.aspect);
    const need = Math.min(14, sphere.radius / Math.sin(Math.min(vf, hf)));
    controls.target.copy(sphere.center);
    if (force || need > fitDist) fitDist = need;
    const dir = force
      ? dirView.clone()
      : camera.position.clone().sub(controls.target).normalize();
    const cur = camera.position.distanceTo(controls.target);
    const dist = force || cur < need ? fitDist : cur;
    camera.position.copy(controls.target).addScaledVector(dir, dist);
    controls.minDistance = need * 0.45;
    controls.maxDistance = need * 1.7;
    controls.update();
  }

  function placeMoving(t) {
    doorGroups.forEach((g) => { g.rotation.y = g.userData.dir * OPEN_ANGLE * t; });
    slideGroups.forEach((g) => g.position.set(g.userData.dx * MM * t, 0, g.userData.dz * MM * t));
  }

  function applyDoors() {
    placeMoving(openness);
    invalidate();
  }

  function update(model, color, opts) {
    clearGroup(root);
    clearGroup(dimLines);
    labels.textContent = '';
    dimLabels = [];
    doorGroups = [];
    slideGroups = [];

    const groups = { a: new THREE.Group(), b: new THREE.Group() };
    root.add(groups.a, groups.b);
    if (model.wing) {
      groups.b.position.set(model.wing.x * MM, 0, model.wing.z * MM);
      groups.b.rotation.y = -Math.PI / 2;
    }
    const pivots = {};
    model.doors.forEach((d) => {
      const g = new THREE.Group();
      g.position.set(d.x * MM, 0, d.z * MM);
      g.userData.dir = d.dir;
      groups[d.g].add(g);
      pivots[d.id] = { g, d };
      g.visible = doorsShown;
      doorGroups.push(g);
    });
    const sliders = {};
    (model.drawers || []).forEach((d) => {
      const g = new THREE.Group();
      g.userData.dx = d.dx;
      g.userData.dz = d.dz;
      groups[d.g].add(g);
      sliders[d.id] = g;
      slideGroups.push(g);
    });

    model.parts.forEach((p) => {
      const mesh = makeMesh(p, color);
      if (p.door !== undefined) {
        const { g, d } = pivots[p.door];
        mesh.position.set((p.p[0] - d.x) * MM, p.p[1] * MM, (p.p[2] - d.z) * MM);
        g.add(mesh);
      } else {
        mesh.position.set(p.p[0] * MM, p.p[1] * MM, p.p[2] * MM);
        (p.drawer !== undefined ? sliders[p.drawer] : groups[p.g]).add(mesh);
      }
    });

    /* размер считаем по закрытому изделию, поэтому двери ставим на место
       только после подгонки камеры */
    placeMoving(0);

    const b = new THREE.Box3().setFromObject(root);
    man.position.x = b.min.x - 0.62;
    side.visible = !!model.wing;
    if (model.wing) side.position.x = b.max.x + 0.002;

    model.dims.forEach(addDim);
    fit(opts && opts.refit);
    placeMoving(openness);
    invalidate();
  }

  function setDoorsShown(shown) {
    doorsShown = shown;
    doorGroups.forEach((g) => { g.visible = shown; });
    invalidate();
  }

  function setOpen(open) {
    openTarget = open ? 1 : 0;
    cancelAnimationFrame(raf);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      openness = openTarget;
      applyDoors();
      return;
    }
    const start = performance.now();
    const from = openness;
    function step(now) {
      const t = Math.min(1, (now - start) / 420);
      const e = 1 - Math.pow(1 - t, 3);
      openness = from + (openTarget - from) * e;
      applyDoors();
      if (t < 1) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
  }

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (root.children.length) fit(false);
    renderNow();
  }

  new ResizeObserver(resize).observe(stage);
  resize();

  return { update, setOpen, setDoorsShown, resize };
}
