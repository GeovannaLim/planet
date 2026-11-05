// Stage 1 — Boarding (≈10 s).
// The visitor walks the last metres of the crew access arm toward the GEO-1
// capsule at dusk. The hatch swings open; one click (or tap on the hatch) boards.

import * as THREE from 'three';
import { gsap } from 'gsap';
import { canvasTexture, metal, paint, rbox, rng, FONT } from '../util.js';
import { createExterior, GROUND_Y, HATCH_PHI } from './exterior.js';
import * as hud from '../hud.js';
import { t } from '../i18n.js';
import { audio } from '../audio.js';

const once = (el) => new Promise((res) => el.addEventListener('click', res, { once: true }));
const loadImage = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });

// Capsule outer mould line (radius, height). Backshell is a straight cone.
const SHELL = { r0: 2.5, y0: -0.05, r1: 1.35, y1: 2.75 };
const shellR = (y) => SHELL.r0 + (SHELL.r1 - SHELL.r0) * ((y - SHELL.y0) / (SHELL.y1 - SHELL.y0));
const SHELL_TILT = Math.atan((SHELL.r0 - SHELL.r1) / (SHELL.y1 - SHELL.y0));
const HATCH_Y = 1.02; const HW = 0.9; const HH = 1.05; // hatch centre height and size (m)

export async function createBoarding(stage) {
  const q = stage.quality;
  const R = q.reducedMotion;
  const dur = (s) => (R ? Math.min(s, 0.5) : s);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#2b2a33', 140, 1800);
  scene.environmentIntensity = 0.35;
  const ext = createExterior(scene, q);
  const interactive = [];
  const logo = await loadImage('assets/logo-dark.png');

  const vehicle = new THREE.Group(); ext.world.add(vehicle);
  const shadow = (o) => { o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };

  // ---------------------------------------------------------------- backshell texture
  // Lathe UVs: u wraps around from +Z toward +X, v runs bottom → top.
  const W = 2048; const H = 1024;
  const uOf = (phi) => ((phi / (Math.PI * 2)) % 1 + 1) % 1;
  const vOf = (y) => (y - SHELL.y0) / (SHELL.y1 - SHELL.y0);
  const PX = (u) => u * W; const PY = (v) => (1 - v) * H;
  const windows = [[-0.042, -0.006], [0.006, 0.042]].map(([a, b]) => [0.5 + a, 0.5 + b]);
  const hatchU = uOf(HATCH_PHI);

  function seams(g, ink, lw) {
    g.strokeStyle = ink; g.lineWidth = lw;
    [0.16, 0.4, 0.68, 0.86].forEach((v) => { g.beginPath(); g.moveTo(0, PY(v)); g.lineTo(W, PY(v)); g.stroke(); });
    for (let k = 0; k < 16; k++) {
      const u = (k + 0.5) / 16; g.beginPath(); g.moveTo(PX(u), PY(0.16)); g.lineTo(PX(u), PY(0.86)); g.stroke();
    }
  }
  function windowShapes(g, fill) {
    g.fillStyle = fill;
    windows.forEach(([a, b]) => {
      g.beginPath();
      g.moveTo(PX(a), PY(0.42)); g.lineTo(PX(b), PY(0.42)); g.lineTo(PX(b) - 6, PY(0.64)); g.lineTo(PX(a) + 6, PY(0.64)); g.closePath(); g.fill();
    });
  }

  const shellMap = canvasTexture(W, H, (g) => {
    const r = rng(5);
    g.fillStyle = '#d6d3cb'; g.fillRect(0, 0, W, H);
    // Tonal variation per panel and re-entry soot toward the heat shield.
    for (let k = 0; k < 16; k++) for (let j = 0; j < 4; j++) {
      g.fillStyle = `rgba(${r() > 0.5 ? '255,255,255' : '0,0,0'},${r() * 0.035})`;
      g.fillRect(PX(k / 16), PY(0.16 + j * 0.2 + 0.2), W / 16, H * 0.2);
    }
    const soot = g.createLinearGradient(0, H, 0, H * 0.55);
    soot.addColorStop(0, 'rgba(60,45,35,0.55)'); soot.addColorStop(0.4, 'rgba(60,45,35,0.12)'); soot.addColorStop(1, 'rgba(60,45,35,0)');
    g.fillStyle = soot; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(70,60,50,${r() * 0.05})`; g.fillRect(r() * W, H * (0.6 + r() * 0.4), 1 + r() * 2, 4 + r() * 22); }
    seams(g, 'rgba(70,70,70,0.45)', 2);
    // Rivet rows along the horizontal seams.
    g.fillStyle = 'rgba(80,80,80,0.5)';
    [0.16, 0.4, 0.68, 0.86].forEach((v) => { for (let x = 4; x < W; x += 11) { g.beginPath(); g.arc(x, PY(v) + 6, 1.4, 0, Math.PI * 2); g.fill(); } });
    // Brand band.
    g.fillStyle = '#c9a227'; g.fillRect(0, PY(0.93), W, 10);
    g.fillStyle = '#2a2d31'; g.fillRect(0, PY(0.93) + 14, W, 4);
    windowShapes(g, '#0b0d10');
    windows.forEach(([a, b]) => { g.strokeStyle = '#3b3e42'; g.lineWidth = 5; g.strokeRect(PX(a) - 4, PY(0.645), PX(b) - PX(a) + 8, PY(0.415) - PY(0.645)); });
    // Livery: GEO.AI wordmark and vehicle name either side of the hatch.
    if (logo) {
      const lw = 300; const lh = lw * (logo.height / logo.width);
      g.drawImage(logo, PX(hatchU - 0.105) - lw / 2, PY(0.6) - lh / 2, lw, lh);
    }
    g.font = `600 46px ${FONT}`; g.fillStyle = '#2a2d31'; g.textAlign = 'center';
    g.fillText('GEO-1', PX(hatchU + 0.09), PY(0.58));
    g.font = `500 18px ${FONT}`; g.fillStyle = 'rgba(42,45,49,0.8)';
    g.fillText('PLANETARY ANALOGUE MISSION', PX(hatchU + 0.09), PY(0.53));
    // Rescue markings around the hatch.
    g.font = `600 16px ${FONT}`; g.fillStyle = '#b8862a';
    g.fillText('RESCUE ▸ HATCH RELEASE', PX(hatchU), PY(vOf(HATCH_Y + 0.72)));
    g.strokeStyle = '#b8862a'; g.lineWidth = 3; g.setLineDash([12, 8]);
    g.strokeRect(PX(hatchU - 0.05), PY(vOf(HATCH_Y + 0.64)), PX(0.1), PY(vOf(HATCH_Y - 0.64)) - PY(vOf(HATCH_Y + 0.64))); g.setLineDash([]);
    // Small stencils.
    g.font = `500 13px ${FONT}`; g.fillStyle = 'rgba(42,45,49,0.7)'; g.textAlign = 'left';
    for (let k = 0; k < 16; k++) if (r() > 0.45) g.fillText(['NO STEP', 'GSE 04', 'VENT', 'P/N 7720-1', 'GROUND'][k % 5], PX(k / 16) + 14, PY(0.2) - 6);
    g.textAlign = 'left';
  });
  shellMap.tex.anisotropy = 8;
  const shellBump = canvasTexture(W, H, (g) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
    seams(g, '#000', 4);
    windowShapes(g, '#000');
    g.fillStyle = '#555';
    [0.16, 0.4, 0.68, 0.86].forEach((v) => { for (let x = 4; x < W; x += 11) { g.beginPath(); g.arc(x, PY(v) + 6, 1.6, 0, Math.PI * 2); g.fill(); } });
  }, { colorSpace: THREE.NoColorSpace });
  const shellGlow = canvasTexture(W, H, (g) => { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); windowShapes(g, '#ffb060'); });

  const shellMat = new THREE.MeshPhysicalMaterial({
    map: shellMap.tex, bumpMap: shellBump.tex, bumpScale: 1.2, emissiveMap: shellGlow.tex, emissive: '#ffffff', emissiveIntensity: 0.55,
    roughness: 0.52, metalness: 0.05, clearcoat: 0.25, clearcoatRoughness: 0.5,
  });

  // ---------------------------------------------------------------- capsule
  const lathe = (pts, mat, seg = 96) => shadow(new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg), mat));
  const backshellPts = []; for (let k = 0; k <= 24; k++) { const y = SHELL.y0 + (k / 24) * (SHELL.y1 - SHELL.y0); backshellPts.push([shellR(y), y]); }
  vehicle.add(lathe(backshellPts, shellMat));

  const heatTex = canvasTexture(1024, 256, (g, w, h) => {
    const r = rng(3); g.fillStyle = '#2d2723'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? '90,70,55' : '10,8,6'},${r() * 0.25})`; g.fillRect(r() * w, r() * h, 2 + r() * 6, 1 + r() * 3); }
  });
  vehicle.add(lathe([[0.01, -0.78], [1.4, -0.72], [2.2, -0.56], [2.52, -0.36], [2.58, -0.2], [2.54, -0.08], [2.5, -0.05]],
    new THREE.MeshStandardMaterial({ map: heatTex.tex, roughness: 0.92, metalness: 0.05 })));
  // Shoulder, docking ring and nose cap.
  vehicle.add(lathe([[1.35, 2.75], [1.3, 2.84], [1.15, 2.92], [1.02, 2.96]], paint('#dcd9d2', 0.5, 0.1)));
  vehicle.add(lathe([[1.0, 2.96], [1.0, 3.2], [0.96, 3.24]], metal('#8d9096', 0.35, 0.9)));
  vehicle.add(lathe([[0.96, 3.24], [0.9, 3.36], [0.7, 3.5], [0.4, 3.58], [0.01, 3.6]], paint('#e6e3dc', 0.45, 0.1)));
  vehicle.add(shadow(rbox(0.2, 0.06, 0.14, metal('#8d9096', 0.4, 0.9), 0, 3.36, -0.86, 0.02))); // nose-cap hinge

  // RCS thruster pods (avoid the hatch azimuth).
  const podMat = paint('#2a2c2f', 0.55, 0.4); const nozMat = metal('#6c6f75', 0.35, 0.95);
  [0.5, 1.9, 3.5, 5.1].forEach((phi) => {
    const y = 2.15; const r = shellR(y);
    const g = new THREE.Group(); g.position.set(Math.sin(phi) * r, y, Math.cos(phi) * r); g.rotation.y = phi;
    const tilt = new THREE.Group(); tilt.rotation.x = -SHELL_TILT; g.add(tilt);
    tilt.add(rbox(0.34, 0.28, 0.14, podMat, 0, 0, 0.05, 0.03));
    [[-0.09, 0.05, 0, 0], [0.09, 0.05, 0, 0], [0, -0.07, Math.PI / 2, 0]].forEach(([x, yy, rx]) => {
      const n = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.045, 0.07, 14, 1, true), nozMat);
      n.rotation.x = Math.PI / 2 + rx * 0.3; n.position.set(x, yy, 0.15); tilt.add(n);
    });
    vehicle.add(shadow(g));
  });

  // ---------------------------------------------------------------- service module + launcher
  const trunkTex = canvasTexture(2048, 512, (g, w, h) => {
    const r = rng(41);
    g.fillStyle = '#d5d6d6'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 12; k++) {
      const x = (k / 12) * w;
      if (k % 3 === 1) { // body-mounted solar cells
        g.fillStyle = '#121a2c'; g.fillRect(x + 8, 30, w / 12 - 16, h - 60);
        g.strokeStyle = 'rgba(120,150,200,0.25)'; g.lineWidth = 1;
        for (let cx = x + 8; cx < x + w / 12 - 8; cx += 14) { g.beginPath(); g.moveTo(cx, 30); g.lineTo(cx, h - 30); g.stroke(); }
        for (let cy = 30; cy < h - 30; cy += 14) { g.beginPath(); g.moveTo(x + 8, cy); g.lineTo(x + w / 12 - 8, cy); g.stroke(); }
      } else { // radiator panels
        for (let cx = x + 10; cx < x + w / 12 - 6; cx += 9) { g.fillStyle = `rgba(0,0,0,${0.05 + r() * 0.04})`; g.fillRect(cx, 24, 3, h - 48); }
      }
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x, 0, 3, h);
    }
    g.fillStyle = '#2a2d31'; g.fillRect(0, 0, w, 14); g.fillRect(0, h - 14, w, 14);
  });
  const trunk = shadow(new THREE.Mesh(new THREE.CylinderGeometry(2.55, 2.55, 3.8, 96, 1, true),
    new THREE.MeshStandardMaterial({ map: trunkTex.tex, roughness: 0.45, metalness: 0.35 })));
  trunk.position.y = -0.78 - 1.9; vehicle.add(trunk);
  const adapter = shadow(new THREE.Mesh(new THREE.CylinderGeometry(2.58, 2.62, 0.45, 96), metal('#3b3d41', 0.45, 0.8)));
  adapter.position.y = -4.8; vehicle.add(adapter);

  const stageLen = -5.0 - GROUND_Y - 6;
  const stageTex = canvasTexture(1024, 2048, (g, w, h) => {
    const r = rng(52);
    g.fillStyle = '#ecebe7'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#17181a'; g.fillRect(0, 0, w, h * 0.09);               // interstage (carbon)
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(255,255,255,${r() * 0.03})`; g.fillRect(r() * w, r() * h * 0.09, 40, 1); }
    for (let y = h * 0.12; y < h; y += h * 0.11) { g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, y, w, 3); }
    // Frost on the LOX tank section.
    for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(255,255,255,${r() * 0.35})`; g.fillRect(r() * w, h * 0.45 + r() * h * 0.5, 2 + r() * 8, 1 + r() * 3); }
    // Vertical wordmark facing the arm.
    g.save(); g.translate(uOf(HATCH_PHI) * w, h * 0.16); g.rotate(Math.PI / 2);
    g.font = `600 120px ${FONT}`; g.fillStyle = '#1e2124'; g.fillText('GEO.AI', 0, 40); g.restore();
    g.fillStyle = '#c9a227'; g.fillRect(0, h * 0.09, w, 12);
  });
  const stage1 = shadow(new THREE.Mesh(new THREE.CylinderGeometry(2.62, 2.62, stageLen, 64, 1, true),
    new THREE.MeshStandardMaterial({ map: stageTex.tex, roughness: 0.5, metalness: 0.15 })));
  stage1.position.y = -5.0 - stageLen / 2; vehicle.add(stage1);

  // Umbilicals from the tower to the launcher.
  const hoseMat = paint('#1d1e20', 0.7, 0.1);
  [[-14, 0.09], [-24, 0.07], [-36, 0.1]].forEach(([y, rad], i) => {
    const a = new THREE.Vector3(Math.sin(HATCH_PHI + 0.15 * (i - 1)) * 2.64, y, Math.cos(HATCH_PHI + 0.15 * (i - 1)) * 2.64);
    const b = new THREE.Vector3(8.4, y + 1.5, -8.4);
    const mid = a.clone().lerp(b, 0.5); mid.y -= 1.6;
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([a, mid, b]), 32, rad, 10), hoseMat);
    vehicle.add(shadow(tube));
  });

  // ---------------------------------------------------------------- hatch
  const roundRect = (w, h, r) => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2 + r, -h / 2); s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); s.lineTo(-w / 2 + r, h / 2);
    s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    return s;
  };
  const hatch = new THREE.Group();
  const hr = shellR(HATCH_Y);
  hatch.position.set(Math.sin(HATCH_PHI) * hr, HATCH_Y, Math.cos(HATCH_PHI) * hr);
  hatch.rotation.y = HATCH_PHI;
  const hatchTilt = new THREE.Group(); hatchTilt.rotation.x = -SHELL_TILT; hatch.add(hatchTilt);

  const frameShape = roundRect(HW + 0.2, HH + 0.2, 0.24); frameShape.holes.push(roundRect(HW + 0.01, HH + 0.01, 0.18));
  const frame = new THREE.Mesh(new THREE.ExtrudeGeometry(frameShape, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2 }), metal('#9a9da3', 0.38, 0.85));
  hatchTilt.add(shadow(frame));
  // What you glimpse through the open hatch: warm cabin light, a seat back and the edge of a panel.
  const cabinView = canvasTexture(256, 300, (g, w, h) => {
    const grd = g.createRadialGradient(w * 0.55, h * 0.35, 10, w * 0.5, h * 0.5, w * 0.9);
    grd.addColorStop(0, '#fff1da'); grd.addColorStop(0.5, '#c79a63'); grd.addColorStop(1, '#2a2018');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(30,26,22,0.85)';
    g.beginPath(); g.moveTo(w * 0.12, h); g.lineTo(w * 0.18, h * 0.45); g.quadraticCurveTo(w * 0.3, h * 0.36, w * 0.42, h * 0.46); g.lineTo(w * 0.46, h); g.fill();
    g.fillStyle = 'rgba(40,36,32,0.9)'; g.fillRect(w * 0.55, h * 0.62, w * 0.45, h * 0.1);
    g.fillStyle = 'rgba(110,200,170,0.8)'; for (let k = 0; k < 6; k++) g.fillRect(w * 0.6 + k * 14, h * 0.645, 6, 4);
    g.fillStyle = 'rgba(255,190,90,0.9)'; g.fillRect(w * 0.62, h * 0.58, 50, 10);
  });
  const glowMat = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffffff', emissiveMap: cabinView.tex, emissiveIntensity: 0 });
  const openingGeo = new THREE.ShapeGeometry(roundRect(HW, HH, 0.18));
  { const uv = openingGeo.attributes.uv; const pos = openingGeo.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / HW + 0.5, pos.getY(i) / HH + 0.5); }
  const opening = new THREE.Mesh(openingGeo, glowMat); opening.position.z = 0.006; hatchTilt.add(opening);

  const doorPivot = new THREE.Group(); doorPivot.position.set(-HW / 2, 0, 0.02); hatchTilt.add(doorPivot);
  const doorMat = new THREE.MeshPhysicalMaterial({ color: '#cfcbc3', roughness: 0.45, metalness: 0.05, clearcoat: 0.3, clearcoatRoughness: 0.4 });
  const door = new THREE.Mesh(new THREE.ExtrudeGeometry(roundRect(HW - 0.02, HH - 0.02, 0.17), { depth: 0.06, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 3 }), doorMat);
  door.position.x = HW / 2; doorPivot.add(shadow(door));
  const port = new THREE.Mesh(new THREE.CircleGeometry(0.1, 40), new THREE.MeshStandardMaterial({ color: '#06080a', roughness: 0.05, metalness: 0.9, emissive: '#ffb060', emissiveIntensity: 0.25 }));
  port.position.set(HW / 2, 0.24, 0.081); doorPivot.add(port);
  const portRing = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.012, 10, 40), metal('#8d9096', 0.3, 0.9));
  portRing.position.copy(port.position); doorPivot.add(portRing);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.013, 10, 24, Math.PI), metal('#2b2d31', 0.35, 0.8));
  handle.position.set(HW / 2 + 0.22, -0.1, 0.09); handle.rotation.z = -Math.PI / 2; doorPivot.add(handle);
  const decal = canvasTexture(256, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.fillStyle = '#c9a227'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1a1b1d'; for (let x = -h; x < w; x += 24) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 12, h); g.lineTo(x + 12 + h, 0); g.lineTo(x + h, 0); g.fill(); }
    g.fillStyle = '#e8e6e0'; g.fillRect(36, 14, w - 72, h - 28);
    g.font = `600 22px ${FONT}`; g.fillStyle = '#1a1b1d'; g.textAlign = 'center'; g.fillText('PULL TO OPEN', w / 2, h / 2 + 8);
  });
  const decalMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.075), new THREE.MeshStandardMaterial({ map: decal.tex, roughness: 0.6 }));
  decalMesh.position.set(HW / 2, -0.32, 0.081); doorPivot.add(decalMesh);
  const spill = new THREE.PointLight('#ffd9a8', 0, 7, 1.6); spill.position.set(0, 0.1, 0.7); hatchTilt.add(spill);
  vehicle.add(hatch);
  interactive.push({ object: hatch, enabled: false, onClick: () => panelBoard?.click(), onHover: (on) => on && audio.play('hover') });

  // ---------------------------------------------------------------- lighting
  const flood = new THREE.SpotLight('#ffe6c4', 45, 40, 0.5, 0.6, 1.4);
  flood.position.set(9.5, 7.5, -4.5); flood.target.position.set(0, 0.5, 0);
  if (q.tier === 'high') {
    flood.castShadow = true; flood.shadow.mapSize.set(2048, 2048); flood.shadow.bias = -0.0004; flood.shadow.normalBias = 0.02;
    flood.shadow.camera.near = 2; flood.shadow.camera.far = 40;
  }
  scene.add(flood, flood.target);
  const under = new THREE.PointLight('#ffb070', 8, 18, 1.6); under.position.set(5, -6, -4); scene.add(under);
  const rim = new THREE.DirectionalLight('#9fb4d8', 0.5); rim.position.set(-8, 4, 6); scene.add(rim);

  // ---------------------------------------------------------------- flow
  const cam = stage.rig;
  const out = ext.armPivot.position.clone().sub(ext.armEnd).setY(0).normalize();
  const side = new THREE.Vector3(-out.z, 0, out.x);
  scene.updateMatrixWorld(true);
  const hatchWorld = new THREE.Vector3(); hatch.getWorldPosition(hatchWorld);
  let panelBoard = null;

  async function run() {
    hud.setSceneChrome('boarding');
    audio.setBed('pad'); audio.setIntensity(0.25);
    const start = ext.armEnd.clone().addScaledVector(out, 8.5).addScaledVector(side, 0.25).setY(1.68);
    const end = ext.armEnd.clone().addScaledVector(out, 2.9).addScaledVector(side, 0.35).setY(1.66);
    cam.pos.copy(R ? end : start);
    cam.look.set(hatchWorld.x * 0.55, 1.9, hatchWorld.z * 0.55);
    await hud.fadeTo(0, R ? 300 : 1800);
    const ep = hud.currentEpoch();

    if (!R) {
      gsap.to(cam.pos, { x: end.x, y: end.y, z: end.z, duration: 6.5, ease: 'power2.inOut' });
      gsap.to(cam.look, { x: hatchWorld.x, y: HATCH_Y + 0.35, z: hatchWorld.z, duration: 6.5, ease: 'power2.inOut' });
    } else {
      cam.look.set(hatchWorld.x, HATCH_Y + 0.05, hatchWorld.z);
    }
    hud.transmit([{ k: 'b_tx1', hold: 2600 }], { from: 'PAD LEADER · CH 4' });
    if (!(await hud.wait(R ? 400 : 4600, ep))) return;

    // Hatch opens: servo, seal break, warm cabin light spills onto the arm.
    audio.play('servo'); audio.play('door');
    gsap.to(doorPivot.rotation, { y: -1.8, duration: dur(2.2), ease: 'power2.inOut', delay: 0.3 });
    gsap.to(glowMat, { emissiveIntensity: 0.85, duration: 1.6, delay: 0.5 });
    gsap.to(spill, { intensity: 2.2, duration: 1.6, delay: 0.5 });

    const panel = hud.showPanel(`
      <p class="panel-kicker">${t('b_kicker')}</p>
      <h2 class="panel-title">${t('b_title')}</h2>
      <button class="btn btn-tech" id="board" type="button">${t('b_board')}</button>`);
    panelBoard = panel.querySelector('#board');
    interactive[0].enabled = true;
    await once(panelBoard);
    if (ep !== hud.currentEpoch()) return;
    interactive[0].enabled = false; document.body.style.cursor = '';
    audio.play('click');
    hud.hidePanel(); hud.clearTransmission();

    // Duck through the hatch.
    const inside = hatchWorld.clone().multiplyScalar(0.55).setY(1.15);
    gsap.to(cam.look, { x: 0, y: 1.05, z: 0, duration: dur(1.2), ease: 'power2.in' });
    gsap.to(cam.pos, { x: inside.x, y: inside.y, z: inside.z, duration: dur(1.8), ease: 'power2.in' });
    audio.play('whoosh');
    await hud.wait(R ? 200 : 1100);
    await hud.fadeTo(1, 700);
  }

  function dispose() {
    gsap.killTweensOf([cam.pos, cam.look]);
    scene.traverse((o) => {
      o.geometry?.dispose?.();
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      mats.forEach((m) => { m.map?.dispose?.(); m.dispose?.(); });
    });
  }

  return { scene, update: ext.update, interactive, run, dispose };
}
