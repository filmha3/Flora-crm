// Real WebGL building (plain three.js, lazy-loaded). Geometry is generated from project data:
// one THREE.Group per floor (slab, unit bodies, windows, balconies, core), roof, ground.
// Status colors live on thin indicators + selection glow only; facade materials stay architectural.
import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { orderedUnits } from "../lib/presale.js";

const COL = { available: 0x25a875, sold: 0xe94f55, reserved: 0xeba33b };
const CORE_W = 3.5, SLAB = 0.35;

function gradientTex(stops) {
  const cv = document.createElement("canvas"); cv.width = 2; cv.height = 256;
  const g = cv.getContext("2d"), gr = g.createLinearGradient(0, 0, 0, 256);
  stops.forEach(([o, c]) => gr.addColorStop(o, c)); g.fillStyle = gr; g.fillRect(0, 0, 2, 256);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function blobTex() {
  const cv = document.createElement("canvas"); cv.width = cv.height = 128;
  const g = cv.getContext("2d"), gr = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  gr.addColorStop(0, "rgba(0,0,0,.65)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(cv);
}
const loadTex = (url) => new Promise((res) => {
  if (!url) return res(null);
  new THREE.TextureLoader().load(url, (t) => { t.colorSpace = THREE.SRGBColorSpace; res(t); }, undefined, () => res(null));
});

function createEngine(host, { onPick, onFail, reduced }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    if (!renderer.getContext()) throw new Error("no gl");
  } catch { onFail?.(); return null; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const dom = renderer.domElement; dom.style.cssText = "display:block;width:100%;height:100%;touch-action:none;outline:none";
  host.appendChild(dom);

  const scene = new THREE.Scene();
  const bg = gradientTex([[0, "#24304d"], [0.55, "#171e30"], [1, "#101522"]]);
  scene.background = bg; scene.fog = new THREE.Fog(0x101522, 90, 220);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 500);
  const controls = new OrbitControls(camera, dom);
  Object.assign(controls, { enableDamping: true, dampingFactor: 0.09, rotateSpeed: 0.7, zoomSpeed: 0.9, screenSpacePanning: true, maxPolarAngle: Math.PI / 2 - 0.03, minPolarAngle: 0.15 });
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environment = env;
  scene.add(new THREE.HemisphereLight(0xbcc8ff, 0x1a1a22, 0.5));
  const key = new THREE.DirectionalLight(0xffd9a8, 2.4); key.position.set(30, 50, 35); scene.add(key);
  const fill = new THREE.DirectionalLight(0x7fa0ff, 0.5); fill.position.set(-30, 20, -20); scene.add(fill);

  const shared = {
    slab: new THREE.MeshStandardMaterial({ color: 0xf4f0e9, roughness: 0.7, envMapIntensity: 0.5 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x1c2b3c, metalness: 0.8, roughness: 0.15, envMapIntensity: 1.3 }),
    rail: new THREE.MeshStandardMaterial({ color: 0xbfd8ea, transparent: true, opacity: 0.35, roughness: 0.1 }),
    balc: new THREE.MeshStandardMaterial({ color: 0xe9e3d6, roughness: 0.8 }),
    core: new THREE.MeshStandardMaterial({ color: 0x2b3a4e, roughness: 0.6 }),
    coreGlass: new THREE.MeshStandardMaterial({ color: 0x5f8fb5, metalness: 0.6, roughness: 0.1, transparent: true, opacity: 0.8, envMapIntensity: 1.4 }),
  };
  const box = new THREE.BoxGeometry(1, 1, 1), plane = new THREE.PlaneGeometry(1, 1);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(120, 48), new THREE.MeshStandardMaterial({ color: 0x141b2c, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; scene.add(ground);
  const blob = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.01; scene.add(blob);

  let model = null, items = [], bodies = [], pick = [], meta = { H: 3.2, D: 22, W: 30, F: 1, totalH: 25 };
  let texs = [], local = [], outline = null, st = null, buildToken = 0;
  let insets = { top: 0, bottom: 0 }, size = { w: 1, h: 1 }, camTween = null, dirty = true;

  const disposeModel = () => {
    if (!model) return;
    scene.remove(model);
    model.traverse((o) => { if (o.geometry && o.geometry !== box && o.geometry !== plane) o.geometry.dispose(); });
    local.forEach((m) => m.dispose()); local = []; texs.forEach((t) => t.dispose()); texs = [];
    model = null; items = []; bodies = []; pick = []; outline = null;
  };
  const mat = (m) => { local.push(m); return m; };

  async function setData(d) {
    const token = ++buildToken;
    const [ft, bt] = await Promise.all([loadTex(d.frontImg), loadTex(d.backImg)]);
    if (token !== buildToken) { ft?.dispose(); bt?.dispose(); return; }
    disposeModel();
    const { floors } = d, cfg = d.cfg || {};
    const D = cfg.depth > 0 ? cfg.depth : 22, H = cfg.height > 0 ? cfg.height : 3.2, F = floors.length;
    const rows = floors.map((f) => orderedUnits(d.byFloor[f.id] || []));
    const widthsOf = (us) => {
      const raw = us.map((u) => (+u.area) / (D * 0.9));
      const sum = raw.reduce((s, x) => s + x, 0) || 1;
      const k = cfg.width > CORE_W + 4 ? (cfg.width - CORE_W) / sum : 1;
      return raw.map((x) => Math.max(2.5, x * k));
    };
    const Ws = rows.map((us) => widthsOf(us).reduce((s, x) => s + x, 0) + CORE_W);
    const Wmax = Math.max(10, ...Ws);
    meta = { H, D, W: Wmax, F, totalH: (F + 1) * H };
    model = new THREE.Group(); scene.add(model);
    const wall = new THREE.Color(d.wall || "#d9d4ca");
    if (ft) texs.push(ft); if (bt) texs.push(bt);
    const sliceTex = (t, i, Wf) => { const c = t.clone(); c.needsUpdate = true; c.repeat.set(Wf / Wmax, 1 / F); c.offset.set((1 - Wf / Wmax) / 2, i / F); texs.push(c); return c; };
    const photoMat = (t) => mat(new THREE.MeshStandardMaterial({ map: t, roughness: 0.9, envMapIntensity: 0.3 }));
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), qb = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI), s3 = new THREE.Vector3(), p3 = new THREE.Vector3();

    floors.forEach((f, i) => {
      const us = rows[i], ws = widthsOf(us), Wf = Ws[i];
      const g = new THREE.Group(); g.position.y = i * H; model.add(g);
      const slabMat = mat(shared.slab.clone());
      const slab = new THREE.Mesh(box, slabMat); slab.scale.set(Wf + 0.8, SLAB, D + 0.8); slab.position.y = SLAB / 2; slab.userData = { floorId: f.id }; g.add(slab); pick.push(slab);
      const item = { g, idx: i, id: f.id, ty: i * H, tz: 0, slabMat, units: [] }; items.push(item);
      let x = Wf / 2; const nF = [], nB = [], bal = [];
      us.forEach((u, k) => {
        const w = ws[k], xc = x - w / 2; x -= w;
        const bm = mat(new THREE.MeshStandardMaterial({ color: wall, roughness: 0.85, envMapIntensity: 0.4 }));
        const body = new THREE.Mesh(box, bm); body.scale.set(w, H - SLAB, D); body.position.set(xc, SLAB + (H - SLAB) / 2, 0);
        body.userData = { floorId: f.id, unitId: u.id }; g.add(body); pick.push(body); bodies.push({ mesh: body, unitId: u.id, floorId: f.id });
        const sm = mat(new THREE.MeshBasicMaterial({ color: COL.available }));
        const strip = new THREE.Mesh(box, sm); strip.scale.set(w * 0.8, 0.1, 0.06); strip.position.set(xc, 0.14, D / 2 + 0.43); strip.raycast = () => {}; g.add(strip);
        item.units.push({ unitId: u.id, mesh: body, strip, mat: bm, smat: sm });
        const wy = SLAB + (H - SLAB) * 0.56;
        [-0.22, 0.22].forEach((o) => { nF.push([xc + w * o, wy, D / 2 + 0.01, w * 0.28]); nB.push([xc + w * o, wy, -D / 2 - 0.01, w * 0.28]); });
        bal.push([xc, w]);
      });
      // facade: photo slices when provided, otherwise modelled windows + balconies
      if (ft) { const p = new THREE.Mesh(plane, photoMat(sliceTex(ft, i, Wf))); p.scale.set(Wf, H - SLAB, 1); p.position.set(0, SLAB + (H - SLAB) / 2, D / 2 + 0.02); p.raycast = () => {}; g.add(p); }
      if (bt) { const p = new THREE.Mesh(plane, photoMat(sliceTex(bt, i, Wf))); p.scale.set(Wf, H - SLAB, 1); p.rotation.y = Math.PI; p.position.set(0, SLAB + (H - SLAB) / 2, -D / 2 - 0.02); p.raycast = () => {}; g.add(p); }
      const win = (list, rot) => { if (!list.length) return; const im = new THREE.InstancedMesh(plane, shared.glass, list.length); list.forEach((w, n) => { m4.compose(p3.set(w[0], w[1], w[2]), rot ? qb : q.identity(), s3.set(w[3], 1.5, 1)); im.setMatrixAt(n, m4); }); im.raycast = () => {}; g.add(im); };
      if (!ft) win(nF, false); if (!bt) win(nB, true);
      if (!ft && bal.length) {
        const bs = new THREE.InstancedMesh(box, shared.balc, bal.length), rl = new THREE.InstancedMesh(box, shared.rail, bal.length);
        bal.forEach(([xc, w], n) => { m4.compose(p3.set(xc, 0.3, D / 2 + 0.6), q.identity(), s3.set(w * 0.7, 0.12, 1.6)); bs.setMatrixAt(n, m4); m4.compose(p3.set(xc, 0.8, D / 2 + 1.38), q.identity(), s3.set(w * 0.7, 0.95, 0.04)); rl.setMatrixAt(n, m4); });
        bs.raycast = () => {}; rl.raycast = () => {}; g.add(bs, rl);
      }
      const core = new THREE.Mesh(box, shared.core); core.scale.set(CORE_W, H - SLAB, D * 0.9); core.position.set(-Wf / 2 + CORE_W / 2, SLAB + (H - SLAB) / 2, 0); core.userData = { floorId: f.id }; g.add(core); pick.push(core);
      const cg = new THREE.Mesh(plane, shared.coreGlass); cg.scale.set(CORE_W * 0.55, H - SLAB - 0.4, 1); cg.position.set(-Wf / 2 + CORE_W / 2, SLAB + (H - SLAB) / 2, D * 0.45 + 0.02); cg.raycast = () => {}; g.add(cg);
    });
    // rooftop: slab, parapet, water tank
    const rg = new THREE.Group(); rg.position.y = F * H; model.add(rg);
    const Wt = Ws[F - 1] || Wmax;
    const rs = new THREE.Mesh(box, shared.slab); rs.scale.set(Wt + 0.8, 0.5, D + 0.8); rs.position.y = 0.25; rg.add(rs);
    [[0, D / 2 + 0.3, Wt + 0.8, 0.25], [0, -D / 2 - 0.3, Wt + 0.8, 0.25]].forEach(([a, z, w, t]) => { const b = new THREE.Mesh(box, shared.balc); b.scale.set(w, 0.9, t); b.position.set(a, 0.95, z); rg.add(b); });
    const tank = new THREE.Mesh(box, shared.core); tank.scale.set(4, 1.6, 4); tank.position.set(-Wt / 2 + 4, 1.3, 0); rg.add(tank);
    items.push({ g: rg, idx: F, id: null, ty: F * H, tz: 0, units: [] });
    blob.scale.set(Wmax * 2, D * 2.2, 1); blob.scale.set(Wmax * 2.2, Wmax * 2.2, 1);
    fit(true); if (st) apply(st); dirty = true;
  }

  const target = () => new THREE.Vector3(0, meta.totalH * 0.45, 0);
  const fitDist = () => {
    const R = Math.hypot(meta.W / 2, meta.D / 2, meta.totalH / 2);
    const vh = Math.max(200, size.h - 320), aspect = size.w / vh; // usable area between header and sheet
    const vf = THREE.MathUtils.degToRad(camera.fov), hf = 2 * Math.atan(Math.tan(vf / 2) * aspect);
    return (R / Math.sin(Math.min(vf, hf) / 2)) * 0.5;
  };
  const viewPos = (az, el) => { const d = fitDist(), t = target(); return { pos: new THREE.Vector3(t.x + d * Math.cos(el) * Math.sin(az), t.y + d * Math.sin(el), t.z + d * Math.cos(el) * Math.cos(az)), tgt: t }; };
  const limits = () => { controls.minDistance = fitDist() * 0.35; controls.maxDistance = fitDist() * 1.8; };
  function fit(instant) { limits(); go("default", instant); }
  function go(name, instant) {
    const v = name === "front" ? viewPos(0, 0.16) : name === "back" ? viewPos(Math.PI, 0.16) : viewPos(0.6, 0.22);
    if (instant || reduced) { camera.position.copy(v.pos); controls.target.copy(v.tgt); controls.update(); dirty = true; }
    else camTween = { t: 0, p0: camera.position.clone(), t0: controls.target.clone(), v };
  }
  function applyOffset() { camera.setViewOffset(size.w, size.h, 0, (insets.bottom - insets.top) / 2, size.w, size.h); dirty = true; }

  function apply(s) {
    st = s; const byId = new Map((s.units || []).map((u) => [u.id, u]));
    const selIdx = items.findIndex((it) => it.id && it.id === s.selId), { H } = meta;
    const gap = s.exploded ? H * 1.1 : 0, lift = selIdx >= 0 ? (s.exploded ? H * 0.6 : H * 1.3) : 0;
    items.forEach((it) => {
      it.ty = it.idx * H + it.idx * gap + (selIdx >= 0 && it.idx > selIdx ? lift : 0) + (it.idx === selIdx ? 0.5 : 0);
      it.tz = it.idx === selIdx ? 1.4 : 0;
      if (it.slabMat) { it.slabMat.emissive.setHex(it.idx === selIdx ? 0xffc866 : 0x000000); it.slabMat.emissiveIntensity = it.idx === selIdx ? 0.9 : 0; }
      it.units.forEach((x) => {
        const u = byId.get(x.unitId); if (!u) return;
        const c = COL[u.status] || COL.available; x.smat.color.setHex(c);
        const isU = x.unitId === s.unitId, isF = it.idx === selIdx, hi = s.filtering && s.hi?.(u);
        x.mat.emissive.setHex(isU || isF || hi ? c : 0x000000);
        x.mat.emissiveIntensity = isU ? 0.85 : isF ? 0.3 : hi ? 0.45 : 0;
      });
    });
    if (outline) { outline.parent?.remove(outline); outline.geometry.dispose(); outline.material.dispose(); outline = null; }
    const sel = bodies.find((b) => b.unitId === s.unitId);
    if (sel) { outline = new THREE.LineSegments(new THREE.EdgesGeometry(box), new THREE.LineBasicMaterial({ color: 0xffffff })); sel.mesh.add(outline); }
    dirty = true;
  }

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); const active = new Set(); let down = null, multi = false;
  const onDown = (e) => { active.add(e.pointerId); if (active.size > 1) multi = true; down = { x: e.clientX, y: e.clientY, t: performance.now() }; };
  const onUp = (e) => {
    active.delete(e.pointerId); const d = down; if (!active.size) { const m = multi; multi = false; if (m) { down = null; return; } } down = null;
    if (!d || multi || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 8 || performance.now() - d.t > 600) return;
    const r = dom.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera); const hit = ray.intersectObjects(pick, false)[0];
    if (hit) onPick(hit.object.userData);
  };
  dom.addEventListener("pointerdown", onDown); dom.addEventListener("pointerup", onUp); dom.addEventListener("pointercancel", onUp);
  controls.addEventListener("change", () => { // keep the building in frame while panning
    const t = controls.target, lim = meta.W; t.x = THREE.MathUtils.clamp(t.x, -lim, lim); t.z = THREE.MathUtils.clamp(t.z, -lim, lim); t.y = THREE.MathUtils.clamp(t.y, 0, meta.totalH * 1.2); dirty = true;
  });

  let raf = 0, last = performance.now();
  const tick = (now) => {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    let moving = false; const k = reduced ? 1 : 1 - Math.exp(-dt * 7);
    items.forEach((it) => {
      const dy = it.ty - it.g.position.y, dz = it.tz - it.g.position.z;
      if (Math.abs(dy) > 0.002 || Math.abs(dz) > 0.002) { it.g.position.y += dy * k; it.g.position.z += dz * k; moving = true; }
      else { it.g.position.y = it.ty; it.g.position.z = it.tz; }
    });
    if (camTween) {
      camTween.t = Math.min(1, camTween.t + dt / 0.7); const e = 1 - Math.pow(1 - camTween.t, 3);
      camera.position.lerpVectors(camTween.p0, camTween.v.pos, e); controls.target.lerpVectors(camTween.t0, camTween.v.tgt, e);
      if (camTween.t >= 1) camTween = null; moving = true;
    }
    const ch = controls.update();
    if (moving || ch || dirty) { renderer.render(scene, camera); dirty = false; }
  };
  raf = requestAnimationFrame(tick);

  return {
    setData, setState: apply, view: (n) => go(n, false),
    setInsets: (t, b) => { insets = { top: t, bottom: b }; applyOffset(); },
    resize() {
      const w = host.clientWidth || 1, h = host.clientHeight || 1; if (w === size.w && h === size.h && !dirty) return;
      size = { w, h }; renderer.setSize(w, h, false); camera.aspect = w / h; applyOffset(); camera.updateProjectionMatrix(); limits();
    },
    dispose() {
      cancelAnimationFrame(raf); buildToken++; dom.removeEventListener("pointerdown", onDown); dom.removeEventListener("pointerup", onUp); dom.removeEventListener("pointercancel", onUp);
      disposeModel(); controls.dispose(); [ground, blob].forEach((m) => { m.geometry.dispose?.(); m.material.dispose(); });
      Object.values(shared).forEach((m) => m.dispose()); box.dispose(); plane.dispose(); bg.dispose(); env.dispose(); pm.dispose();
      renderer.dispose(); renderer.forceContextLoss?.(); dom.remove();
    },
  };
}

export default function Building3DViewer({ floors, byFloor, cfg, wall, frontImg, backImg, selId, unitId, exploded, units, filtering, hi, viewCmd, insets, onFloor, onUnit, onFail }) {
  const host = useRef(null), eng = useRef(null), cb = useRef({});
  cb.current = { onFloor, onUnit, onFail };
  useEffect(() => {
    const reduced = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const e = createEngine(host.current, { reduced, onFail: () => cb.current.onFail?.(), onPick: (p) => { if (p.unitId && p.floorId === stRef.current.selId) cb.current.onUnit(p.unitId); else cb.current.onFloor(p.floorId); } });
    eng.current = e; if (!e) return undefined;
    const ro = new ResizeObserver(() => e.resize()); ro.observe(host.current); e.resize();
    return () => { ro.disconnect(); e.dispose(); eng.current = null; };
  }, []);
  const stRef = useRef({ selId });
  stRef.current = { selId };
  const sig = useMemo(() => JSON.stringify([floors.map((f) => [f.id, (byFloor[f.id] || []).map((u) => [u.id, u.area, u.position_configuration?.order, u.position_configuration?.row])]), cfg, wall, frontImg?.length || 0, backImg?.length || 0]), [floors, byFloor, cfg, wall, frontImg, backImg]);
  useEffect(() => { const e = eng.current; if (!e) return; e.setData({ floors, byFloor, cfg, wall, frontImg, backImg }).then(() => e.setState({ selId, unitId, exploded, units, filtering, hi })); }, [sig]); // eslint-disable-line
  useEffect(() => { eng.current?.setState({ selId, unitId, exploded, units, filtering, hi }); }, [selId, unitId, exploded, units, filtering, hi]);
  useEffect(() => { if (viewCmd) eng.current?.view(viewCmd.name); }, [viewCmd]);
  useEffect(() => { eng.current?.setInsets(insets.top, insets.bottom); }, [insets.top, insets.bottom]);
  return <div ref={host} style={{ position: "absolute", inset: 0 }} />;
}
