// Stage 2 — Cockpit preparation (≈20 s) and Stage 3 — Launch (≈15 s).
// One command powers the vehicle: lights, panels, displays, guidance, comms and
// the access arm all come up on their own. Then the visitor launches.
//
// Cabin frame: camera seat at (0, 1.25, 0.62) looking down -Z through the windows.
// Panel groups use the convention "local +Z is the face toward the crew".

import * as THREE from 'three';
import { gsap } from 'gsap';
import {
  C, canvasTexture, emissive, metal, paint, rbox, panelFace, quiltTexture, smudgeTexture,
  switchBank, buttonBank, screenBase, screenOverlay, text, wireGlobe, rng,
} from '../util.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createExterior } from './exterior.js';
import * as hud from '../hud.js';
import { t } from '../i18n.js';
import { audio } from '../audio.js';

const once = (el) => new Promise((res) => el.addEventListener('click', res, { once: true }));

export function createCockpit(stage, mission) {
  const q = stage.quality;
  const R = q.reducedMotion;
  const dur = (s) => (R ? Math.min(s, 0.5) : s);
  const HIGH = q.tier === 'high';

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#2b2a33', 120, 1600);
  scene.environmentIntensity = 0.28;
  const ext = createExterior(scene, q);
  const E = ext.E;
  const interactive = [];
  const ticks = [];

  const S = {
    powered: false, boot: 0, align: 0, link: 0, nav: false, comms: false,
    dest: mission.dest, phase: 'standby', count: null,
    flight: false, altKm: 0, velocity: 0, talking: false, metAt: 0, liftAt: 0,
  };

  const cabin = new THREE.Group(); scene.add(cabin);
  const cast = (o) => { o.traverse((m) => { if (m.isMesh) { m.castShadow = HIGH; m.receiveShadow = HIGH; } }); return o; };

  // ---------------------------------------------------------------- materials
  const structure = paint('#2a2c30', 0.66, 0.25);
  const darkTrim = paint('#151618', 0.5, 0.4);
  const rubber = paint('#0d0d0e', 0.9, 0);
  const brushed = metal('#a3a6ab', 0.32, 0.95);
  const glassMat = new THREE.MeshBasicMaterial({ color: '#a8bfcc', envMap: stage.envMap, reflectivity: 0.4, transparent: true, opacity: 0.07, depthWrite: false });
  const smudge = smudgeTexture();
  const smudgeMat = new THREE.MeshBasicMaterial({ map: smudge.tex, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });

  // ================================================================ windows
  const zW = -1.35; const yS = 0.98; const yH = 1.78;
  const pane = (parent, w, h, x, y) => {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glassMat); g.position.set(x, y, 0.01); parent.add(g);
    const s = new THREE.Mesh(new THREE.PlaneGeometry(w, h), smudgeMat); s.position.set(x, y, 0.012); parent.add(s);
  };
  {
    const front = new THREE.Group(); front.position.z = zW; cabin.add(front);
    front.add(rbox(1.36, 0.12, 0.16, structure, 0, yS - 0.02, 0, 0.03));
    front.add(rbox(1.36, 0.12, 0.16, structure, 0, yH + 0.02, 0, 0.03));
    [-0.64, 0.64].forEach((x) => front.add(rbox(0.13, yH - yS + 0.16, 0.18, structure, x, (yS + yH) / 2, 0, 0.035)));
    // Rubber seals just inside the frame.
    front.add(rbox(1.18, 0.02, 0.03, rubber, 0, yS + 0.045, 0.06, 0.008));
    front.add(rbox(1.18, 0.02, 0.03, rubber, 0, yH - 0.045, 0.06, 0.008));
    pane(front, 1.18, yH - yS - 0.08, 0, (yS + yH) / 2);
    front.add(rbox(1.5, 0.75, 0.12, structure, 0, yH + 0.44, -0.02, 0.03));
    front.add(rbox(1.5, yS, 0.12, structure, 0, yS / 2 - 0.02, -0.04, 0.03));
    [-1, 1].forEach((s) => {
      const wing = new THREE.Group(); wing.position.set(s * 0.64, 0, zW); wing.rotation.y = -s * 0.62; cabin.add(wing);
      wing.add(rbox(0.98, 0.12, 0.16, structure, s * 0.5, yS - 0.02, 0, 0.03));
      wing.add(rbox(0.98, 0.12, 0.16, structure, s * 0.5, yH - 0.06, 0, 0.03));
      wing.add(rbox(0.13, yH - yS + 0.1, 0.18, structure, s * 0.98, (yS + yH) / 2 - 0.02, 0, 0.035));
      pane(wing, 0.82, yH - yS - 0.16, s * 0.48, (yS + yH) / 2 - 0.03);
      wing.add(rbox(1.05, yS, 0.1, structure, s * 0.5, (yS - 0.05) / 2, -0.02, 0.03));
      wing.add(rbox(1.05, 0.8, 0.1, structure, s * 0.5, yH + 0.4, -0.02, 0.03));
    });
  }

  // ================================================================ padded shell
  {
    const quilt = quiltTexture([10, 4]);
    const quiltMat = new THREE.MeshStandardMaterial({ map: quilt.tex, roughness: 0.95, metalness: 0, side: THREE.BackSide });
    const open = 1.0;
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.95, 2.6, 48, 1, true, Math.PI + open, Math.PI * 2 - open * 2), quiltMat);
    shell.position.y = 1.15; cabin.add(shell);
    const roof = new THREE.Mesh(new THREE.CircleGeometry(1.56, 48), new THREE.MeshStandardMaterial({ map: quilt.tex, roughness: 0.95, side: THREE.DoubleSide }));
    roof.rotation.x = Math.PI / 2; roof.position.y = 2.45; cabin.add(roof);
    cabin.add(rbox(3.6, 0.06, 3.4, paint('#1a1b1d', 0.85, 0.1), 0, -0.03, 0.1));
    // Cable runs along the walls.
    const hose = paint('#1c1d1f', 0.75, 0.05); const hoseGrey = paint('#55585d', 0.6, 0.2);
    [[-1, hose], [1, hose], [-1, hoseGrey]].forEach(([s, m], i) => {
      const pts = [[s * 0.5, 2.4, -0.6 + i * 0.1], [s * 1.25, 2.1, -0.3], [s * 1.5, 1.4, 0.0 + i * 0.12], [s * 1.35, 0.7, -0.2]].map((p) => new THREE.Vector3(...p));
      cabin.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.018 + i * 0.004, 8), m));
    });
  }

  // ================================================================ glareshield + caution panel
  const ANN = ['MAIN BUS', 'IMU', 'GUIDANCE', 'S-BAND', 'O₂', 'CABIN P', 'ARM CLR', 'GO LAUNCH'];
  const annState = ANN.map(() => 'off');
  const ann = canvasTexture(1024, 160);
  function drawAnn() {
    const g = ann.g; g.fillStyle = '#050607'; g.fillRect(0, 0, 1024, 160);
    ANN.forEach((label, i) => {
      const x = 10 + (i % 4) * 252; const y = i < 4 ? 10 : 84; const st = annState[i];
      g.fillStyle = st === 'ok' ? '#0e3b2e' : st === 'amber' ? '#4a3a10' : '#0c0d0f';
      g.fillRect(x, y, 244, 66);
      g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(x, y, 244, 4);
      text(g, label, x + 122, y + 43, { size: 24, align: 'center', spacing: 3, color: st === 'ok' ? '#5ff0bf' : st === 'amber' ? '#ffd36a' : '#24272b' });
    });
    ann.tex.needsUpdate = true;
  }
  drawAnn();
  const setAnn = (i, st) => { annState[i] = st; drawAnn(); };

  const masterLights = [];
  {
    const gs = new THREE.Group(); gs.position.set(0, 0.965, -1.12); cabin.add(gs);
    gs.add(cast(rbox(2.0, 0.07, 0.36, darkTrim, 0, 0, -0.08, 0.03)));
    gs.add(rbox(1.9, 0.01, 0.016, emissive('#ffd9a8', 0), 0, -0.04, 0.055, 0.004)); // LED strip tucked under the lip
    gs.userData.led = gs.children[1];
    const capsule = new THREE.Group(); capsule.position.set(0, 0.075, -0.06); capsule.rotation.x = -0.9; gs.add(capsule);
    capsule.add(rbox(0.58, 0.115, 0.05, darkTrim, 0, 0, -0.025, 0.01));
    const annMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.54, 0.084),
      new THREE.MeshStandardMaterial({ color: '#000', emissive: '#fff', emissiveMap: ann.tex, emissiveIntensity: 1.1, roughness: 0.2 }));
    annMesh.position.z = 0.002; capsule.add(annMesh);
    [-0.5, 0.5].forEach((x, i) => {
      const m = new THREE.Group(); m.position.set(x, 0.065, -0.04); m.rotation.x = -0.9; gs.add(m);
      m.add(rbox(0.11, 0.07, 0.04, darkTrim, 0, 0, -0.02, 0.008));
      const cap = new THREE.MeshStandardMaterial({ color: '#1a1508', emissive: i ? '#ff3b2a' : '#ffb21e', emissiveIntensity: 0, roughness: 0.3 });
      m.add(rbox(0.09, 0.05, 0.02, cap, 0, 0, 0.004, 0.006));
      masterLights.push(cap);
    });
    cabin.userData.glareshield = gs;
  }

  // ================================================================ main instrument panel
  const panelMats = [];
  const screens = {};
  const banks = [];
  const knobs = [];

  function segment({ x, y, z, ry = 0, w, h, draw, seed }) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.set(-0.26, ry, 0, 'YXZ'); cabin.add(g);
    const mat = panelFace(w, h, draw, { seed });
    panelMats.push(mat);
    g.add(cast(rbox(w, h, 0.06, mat, 0, 0, -0.03, 0.012)));
    return g;
  }

  function mfd(parent, id, x, y) {
    const bez = rbox(0.4, 0.31, 0.04, darkTrim, x, y, 0.02, 0.012); parent.add(cast(bez));
    parent.add(rbox(0.33, 0.24, 0.004, paint('#020203', 0.9, 0), x, y + 0.005, 0.04, 0.002)); // recess shadow
    const tex = canvasTexture(640, 480);
    const mat = new THREE.MeshStandardMaterial({ color: '#030405', roughness: 0.14, metalness: 0.1, emissive: '#ffffff', emissiveMap: tex.tex, emissiveIntensity: 0 });
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.31, 0.2325), mat); scr.position.set(x, y + 0.005, 0.043); parent.add(scr);
    const keys = [];
    for (let k = 0; k < 5; k++) { keys.push([x - 0.12 + k * 0.06, y - 0.137, 0.04]); keys.push([x - 0.12 + k * 0.06, y + 0.137, 0.04]); }
    const kb = buttonBank(parent, keys, { size: [0.034, 0.018, 0.01] });
    screens[id] = { tex, mat, keys: kb };
  }

  function gauge(parent, x, y, label, unit, max) {
    const face = canvasTexture(256, 256, (g, w) => {
      g.fillStyle = '#0b0c0d'; g.beginPath(); g.arc(w / 2, w / 2, w / 2, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#e9e6dd'; g.fillStyle = '#e9e6dd';
      for (let k = 0; k <= 40; k++) {
        const a = -Math.PI * 1.25 + (k / 40) * Math.PI * 1.5; const r0 = k % 5 ? 98 : 88;
        g.lineWidth = k % 5 ? 2 : 4; g.beginPath(); g.moveTo(w / 2 + Math.cos(a) * r0, w / 2 + Math.sin(a) * r0); g.lineTo(w / 2 + Math.cos(a) * 110, w / 2 + Math.sin(a) * 110); g.stroke();
        if (!(k % 10)) text(g, String(Math.round((k / 40) * max)), w / 2 + Math.cos(a) * 70, w / 2 + Math.sin(a) * 70 + 8, { size: 22, color: '#e9e6dd', align: 'center' });
      }
      g.strokeStyle = '#2fd39e'; g.lineWidth = 8; g.beginPath(); g.arc(w / 2, w / 2, 104, -Math.PI * 0.55, -Math.PI * 0.2); g.stroke();
      text(g, label, w / 2, w / 2 + 52, { size: 20, color: '#c9c6bd', align: 'center', spacing: 2 });
      text(g, unit, w / 2, w / 2 + 78, { size: 15, color: '#8a877f', align: 'center' });
    });
    const gg = new THREE.Group(); gg.position.set(x, y, 0.004); parent.add(gg);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.008, 12, 40), brushed); gg.add(rim);
    const faceMat = new THREE.MeshStandardMaterial({ map: face.tex, emissiveMap: face.tex, emissive: '#ffd9a0', emissiveIntensity: 0, roughness: 0.6 });
    gg.add(new THREE.Mesh(new THREE.CircleGeometry(0.05, 40), faceMat));
    panelMats.push(faceMat);
    // Needle points along +Y at rotation 0; the dial sweeps 270° from bottom-left to bottom-right.
    const needle = new THREE.Group(); needle.position.z = 0.004; needle.rotation.z = Math.PI * 0.75; gg.add(needle);
    const nm = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.042, 0.002), new THREE.MeshBasicMaterial({ color: '#ff8a3a' })); nm.position.y = 0.019; needle.add(nm);
    gg.add(new THREE.Mesh(new THREE.CircleGeometry(0.007, 16), metal('#222', 0.4, 0.8))).position.z = 0.006;
    const glass = new THREE.Mesh(new THREE.CircleGeometry(0.05, 40), new THREE.MeshStandardMaterial({ color: '#fff', transparent: true, opacity: 0.08, roughness: 0.05, metalness: 0.5 }));
    glass.position.z = 0.01; gg.add(glass);
    return { set: (v) => gsap.to(needle.rotation, { z: Math.PI * 0.75 - v * Math.PI * 1.5, duration: 1.6, ease: 'elastic.out(1, 0.6)' }) };
  }

  function knob(parent, x, y) {
    const k = new THREE.Group(); k.position.set(x, y, 0.004); parent.add(k);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.023, 0.022, 24), paint('#121314', 0.45, 0.3)); body.rotation.x = Math.PI / 2; body.position.z = 0.011; k.add(body);
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.004, 32), brushed); skirt.rotation.x = Math.PI / 2; skirt.position.z = 0.002; k.add(skirt);
    const ptr = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.016, 0.002), new THREE.MeshBasicMaterial({ color: '#f2efe6' })); ptr.position.set(0, 0.008, 0.023); k.add(ptr);
    knobs.push(k);
  }

  // Centre: guidance display, cabin gauges, event timer and master power.
  const center = segment({
    x: 0, y: 0.73, z: -1.1, w: 0.94, h: 0.46, seed: 11,
    draw: (a) => {
      a.frame(0, 0.08, 0.44, 0.36, 'GUIDANCE · NAV');
      a.frame(-0.34, 0.07, 0.2, 0.36, 'CABIN');
      a.frame(0.34, 0.07, 0.2, 0.36, 'MASTER');
      a.label('EVENT TIMER', 0.34, 0.205, 0.011);
      a.label('MAIN POWER', 0.34, -0.065, 0.012);
      a.stripes(0.34, 0.02, 0.12, 0.012);
      a.frame(0, -0.17, 0.86, 0.09, 'DISPLAY · LIGHTING · ECLSS');
      ['DSP 1', 'DSP 2', 'DSP 3', 'FLOOD', 'INTEG', 'FANS', 'H₂O', 'CO₂'].forEach((s, i) => a.label(s, -0.35 + i * 0.1, -0.205, 0.0095));
    },
  });
  mfd(center, 'nav', 0, 0.075);
  const gPress = gauge(center, -0.34, -0.02, 'CABIN', 'kPa', 120);
  const gO2 = gauge(center, -0.34, 0.16, 'O₂', '%', 100);
  // Event timer.
  const timer = canvasTexture(256, 64);
  const timerMat = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffb347', emissiveMap: timer.tex, emissiveIntensity: 0, roughness: 0.2 });
  const timerMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.0375), timerMat); timerMesh.position.set(0.34, 0.165, 0.006); center.add(timerMesh);
  center.add(rbox(0.17, 0.05, 0.01, darkTrim, 0.34, 0.165, 0.0, 0.004));
  function drawTimer(str) { const g = timer.g; g.fillStyle = '#000'; g.fillRect(0, 0, 256, 64); text(g, str, 128, 48, { size: 44, color: '#ffffff', align: 'center', spacing: 4, weight: 500 }); timer.tex.needsUpdate = true; }
  drawTimer('--:--:--');
  // Guarded master power switch.
  const master = new THREE.Group(); master.position.set(0.34, 0.035, 0.0); center.add(master);
  master.add(cast(rbox(0.085, 0.1, 0.012, darkTrim, 0, 0, 0.006, 0.005)));
  const masterLever = new THREE.Group(); masterLever.position.z = 0.012; masterLever.rotation.x = 0.9; master.add(masterLever);
  const ml = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.007, 0.05, 12), metal('#d6d8dc', 0.2, 1)); ml.position.y = 0.025; masterLever.add(ml);
  const mt = new THREE.Mesh(new THREE.SphereGeometry(0.009, 12, 10), metal('#e2e4e8', 0.2, 1)); mt.position.y = 0.05; masterLever.add(mt);
  const guardPivot = new THREE.Group(); guardPivot.position.set(0, 0.048, 0.012); master.add(guardPivot);
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.095, 0.05), new THREE.MeshStandardMaterial({ color: '#c9502f', transparent: true, opacity: 0.55, roughness: 0.25 }));
  guard.position.set(0, -0.048, 0.025); guardPivot.add(guard);
  const masterLed = new THREE.MeshStandardMaterial({ color: '#111', emissive: '#ffb21e', emissiveIntensity: 1.6 });
  const mled = new THREE.Mesh(new THREE.SphereGeometry(0.006, 12, 8), masterLed); mled.position.set(0.05, -0.045, 0.008); master.add(mled);
  const hitMaster = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.08), new THREE.MeshBasicMaterial({ visible: false })); hitMaster.position.z = 0.03; master.add(hitMaster);

  const centerSwitches = switchBank(center, Array.from({ length: 8 }, (_, i) => [-0.35 + i * 0.1, -0.165, 0]));
  banks.push(centerSwitches);

  // Wings: systems (left) and communications (right).
  [-1, 1].forEach((s) => {
    const g = segment({
      x: s * 0.79, y: 0.73, z: -0.95, ry: -s * 0.5, w: 0.66, h: 0.46, seed: 20 + s,
      draw: (a) => {
        a.frame(-s * 0.04, 0.08, 0.44, 0.36, s < 0 ? 'SYSTEMS' : 'COMMUNICATIONS');
        a.frame(s * 0.27, 0.08, 0.1, 0.36, s < 0 ? 'EPS' : 'AUDIO');
        (s < 0 ? ['BUS A', 'BUS B', 'FC 1', 'FC 2', 'BATT', 'INV'] : ['S-BND', 'UHF', 'VOX', 'PTT', 'REC', 'XPDR'])
          .forEach((l, i) => a.label(l, -0.26 + i * 0.09 - s * 0.03, -0.205, 0.0095));
        a.frame(-s * 0.03, -0.17, 0.6, 0.09);
        a.label(s < 0 ? 'VOL' : 'SQL', s * 0.27, 0.205, 0.0095); a.label(s < 0 ? 'DIM' : 'VOL', s * 0.27, 0.025, 0.0095);
      },
    });
    mfd(g, s < 0 ? 'sys' : 'com', -s * 0.04, 0.075);
    const bank = switchBank(g, Array.from({ length: 6 }, (_, i) => [-0.26 + i * 0.09 - s * 0.03, -0.165, 0]));
    banks.push(bank);
    knob(g, s * 0.27, 0.16); knob(g, s * 0.27, -0.02);
    return g;
  });

  // ================================================================ overhead panel
  const overhead = new THREE.Group(); overhead.position.set(0, 2.22, -0.25); overhead.rotation.x = Math.PI / 2 - 0.42; cabin.add(overhead);
  {
    const mat = panelFace(1.3, 0.9, (a) => {
      a.frame(-0.33, 0.18, 0.56, 0.38, 'CIRCUIT BREAKERS · MAIN A');
      a.frame(0.33, 0.18, 0.56, 0.38, 'CIRCUIT BREAKERS · MAIN B');
      a.frame(0, -0.2, 1.2, 0.3, 'ECLSS · LIGHTING · PYRO');
      for (let r = 0; r < 4; r++) for (let c = 0; c < 16; c++) {
        a.label(['O2', 'N2', 'FAN', 'PMP', 'HTR', 'DSP', 'GNC', 'COM'][c % 8] + (r + 1), -0.6 + c * 0.0775, 0.31 - r * 0.085 - 0.032, 0.0075);
      }
      ['CABIN FAN', 'DOME', 'FLOOD', 'PYRO ARM', 'SEP', 'RCS A', 'RCS B', 'HTR'].forEach((l, i) => a.label(l, -0.49 + i * 0.14, -0.29, 0.0095));
      a.stripes(0.07, -0.33, 0.12, 0.012);
    }, { seed: 31, base: '#2e3034' });
    panelMats.push(mat);
    overhead.add(cast(rbox(1.3, 0.9, 0.05, mat, 0, 0, -0.025, 0.02)));
    const bkPts = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 16; c++) bkPts.push([-0.6 + c * 0.0775, 0.31 - r * 0.085, 0]);
    const breakers = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.009, 0.009, 0.018, 12), paint('#0e0f10', 0.5, 0.4), bkPts.length);
    const collar = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.022, 10), paint('#e9e6df', 0.4, 0.1), bkPts.length);
    const m = new THREE.Matrix4(); const rot = new THREE.Matrix4().makeRotationX(Math.PI / 2);
    bkPts.forEach(([x, y], i) => { m.makeTranslation(x, y, 0.009).multiply(rot); breakers.setMatrixAt(i, m); m.makeTranslation(x, y, 0.016).multiply(rot); collar.setMatrixAt(i, m); });
    overhead.add(breakers, collar);
    const ovSwitches = switchBank(overhead, Array.from({ length: 8 }, (_, i) => [-0.49 + i * 0.14, -0.2, 0]));
    banks.unshift(ovSwitches);
  }
  // Dome lights.
  const domeMat = emissive('#eef3ff', 0);
  [[-0.38, 0.35], [0.38, 0.35]].forEach(([x, z]) => {
    cabin.add(rbox(0.22, 0.03, 0.12, darkTrim, x, 2.4, z, 0.01));
    const d = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.08), domeMat); d.rotation.x = Math.PI / 2; d.position.set(x, 2.384, z); cabin.add(d);
  });

  // ================================================================ pedestal
  const ped = new THREE.Group(); ped.position.set(0, 0.5, -0.52); ped.rotation.x = -1.0; cabin.add(ped);
  cabin.add(cast(rbox(0.46, 0.5, 0.5, structure, 0, 0.24, -0.6, 0.03)));
  const pedMat = panelFace(0.46, 0.62, (a) => {
    a.frame(0, 0.16, 0.36, 0.24, 'ENGINE START');
    a.stripes(0, 0.16, 0.34, 0.22);
    a.label('LAUNCH', 0, 0.06, 0.02);
    a.frame(-0.08, -0.15, 0.24, 0.26, 'DSKY');
    a.label('ABORT', 0.16, -0.27, 0.012);
  }, { seed: 41 });
  panelMats.push(pedMat);
  ped.add(cast(rbox(0.46, 0.62, 0.06, pedMat, 0, 0, -0.03, 0.02)));
  // Keypad.
  {
    const keyLbl = ['VERB', '+', '7', '8', '9', 'NOUN', '−', '4', '5', '6', 'CLR', '0', '1', '2', '3', 'PRO', 'KEY', 'ENTR', 'RSET', '·'];
    const pts = []; for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) pts.push([-0.17 + c * 0.044, -0.06 - r * 0.044, 0.0]);
    const keys = new THREE.InstancedMesh(new RoundedBoxGeometry(0.036, 0.036, 0.016, 2, 0.005), paint('#d8d5cc', 0.55, 0.05), pts.length);
    const m = new THREE.Matrix4(); pts.forEach(([x, y], i) => { m.makeTranslation(x, y, 0.008); keys.setMatrixAt(i, m); });
    keys.castShadow = HIGH; ped.add(keys);
    const lbl = canvasTexture(512, 512, (g) => {
      g.clearRect(0, 0, 512, 512);
      pts.forEach(([x, y], i) => text(g, keyLbl[i], (x / 0.46 + 0.5) * 512, (0.5 - y / 0.46) * 512 + 6, { size: 15, color: '#1b1c1e', align: 'center', weight: 600 }));
    });
    const lp = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.46), new THREE.MeshBasicMaterial({ map: lbl.tex, transparent: true, depthWrite: false }));
    lp.position.z = 0.0165; ped.add(lp);
  }
  // Abort T-handle.
  {
    const th = new THREE.Group(); th.position.set(0.16, -0.2, 0.0); ped.add(th);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 12), brushed); stem.rotation.x = Math.PI / 2; stem.position.z = 0.03; th.add(stem);
    const grip = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.07, 6, 12), paint('#c9a227', 0.5, 0.2)); grip.rotation.z = Math.PI / 2; grip.position.z = 0.062; th.add(grip);
  }
  // Launch control: guarded push-button.
  const launchBtnMat = new THREE.MeshStandardMaterial({ color: '#4a360c', emissive: '#ffb21e', emissiveIntensity: 0.08, roughness: 0.35 });
  const launchBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.03, 40), launchBtnMat);
  launchBtn.rotation.x = Math.PI / 2; launchBtn.position.set(0, 0.16, 0.015); ped.add(cast(launchBtn));
  const lbRing = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.009, 12, 48), brushed); lbRing.position.set(0, 0.16, 0.01); ped.add(lbRing);
  const coverPivot = new THREE.Group(); coverPivot.position.set(0, 0.24, 0.012); ped.add(coverPivot);
  const cover = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.05),
    new THREE.MeshStandardMaterial({ color: '#d6aa35', transparent: true, opacity: 0.4, roughness: 0.12, metalness: 0.1, depthWrite: false }));
  cover.position.set(0, -0.08, 0.025); coverPivot.add(cover);
  const hitLaunch = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.1), new THREE.MeshBasicMaterial({ visible: false })); hitLaunch.position.set(0, 0.16, 0.04); ped.add(hitLaunch);

  // Checklist card clipped by the left window post.
  {
    const card = canvasTexture(256, 360, (g, w, h) => {
      g.fillStyle = '#efece3'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#c9a227'; g.fillRect(0, 0, w, 26);
      text(g, 'ASCENT · GEO-1', 14, 19, { size: 15, color: '#1b1c1e', weight: 600, spacing: 2 });
      ['MASTER PWR ........ ON', 'DSP 1-3 ............ ON', 'IMU ALIGN ......... CMPL', 'S-BAND ............ LOCK', 'ARM ............... RETR', 'CABIN P ........... 101', 'ENGINE START ...... ARM', '', 'ABORT MODES', ' 1A  T-0 → 30 s', ' 1B  30 → 120 s', ' 2   > 120 s'].forEach((l, i) =>
        text(g, l, 14, 56 + i * 24, { size: 13, color: '#2a2b2e', weight: 500 }));
    });
    const c = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.155), new THREE.MeshStandardMaterial({ map: card.tex, color: '#a9a59c', roughness: 0.9 }));
    c.position.set(-0.58, 1.12, zW + 0.1); c.rotation.set(-0.05, 0.08, 0.04); cabin.add(c);
    cabin.add(rbox(0.05, 0.02, 0.01, brushed, -0.58, 1.195, zW + 0.102, 0.003));
  }

  // ================================================================ lights
  const emergency = new THREE.PointLight('#ff9a48', 1.1, 3.2, 1.8); emergency.position.set(0, 2.1, -0.1); scene.add(emergency);
  const domes = [-0.38, 0.38].map((x) => { const l = new THREE.PointLight('#e4ecff', 0, 4.5, 1.5); l.position.set(x, 2.3, 0.35); scene.add(l); return l; });
  const panelFlood = new THREE.SpotLight('#eef2ff', 0, 4, 0.75, 0.6, 1.2);
  panelFlood.position.set(0.15, 2.25, 0.25); panelFlood.target.position.set(0, 0.75, -1.05);
  if (HIGH) { panelFlood.castShadow = true; panelFlood.shadow.mapSize.set(1024, 1024); panelFlood.shadow.bias = -0.0005; panelFlood.shadow.normalBias = 0.01; }
  scene.add(panelFlood, panelFlood.target);
  const ledLights = [-0.45, 0.45].map((x) => { const l = new THREE.PointLight('#ffd7a0', 0, 0.9, 1.8); l.position.set(x, 0.9, -0.98); scene.add(l); return l; });
  const pedLight = new THREE.PointLight('#ffc45c', 0, 1.0, 2); pedLight.position.set(0, 0.85, -0.25); scene.add(pedLight);

  // ================================================================ displays
  const screenOn = (id, v = 1.25, d = 0.6) => gsap.to(screens[id].mat, { emissiveIntensity: v, duration: d });

  function drawSys(time) {
    const { tex } = screens.sys; const g = tex.g; const w = tex.w; const h = tex.h;
    screenBase(g, w, h);
    text(g, 'SYSTEMS', 24, 40, { size: 22, color: C.amber, spacing: 5 });
    text(g, 'GEO-1 FLT 4.2', w - 24, 40, { size: 17, color: C.ink3, align: 'right', spacing: 2 });
    if (S.boot < 1) {
      const lines = ['POST ............. OK', 'MAIN BUS A ....... 28.1 V', 'MAIN BUS B ....... 28.0 V', 'FUEL CELL 1/2 .... ON', 'ECLSS ............ NOMINAL', 'DISPLAYS ......... ONLINE', 'GNC .............. STBY'];
      lines.slice(0, Math.ceil(S.boot * lines.length)).forEach((l, i) => text(g, l, 24, 96 + i * 46, { size: 22, color: C.ink2, spacing: 1 }));
    } else if (S.flight) {
      [['THRUST', 0.97, '7.6 MN'], ['CHAMBER P', 0.95, '9.7 MPa'], ['LOX', 1 - S.velocity / 9000, ''], ['RP-1', 1 - S.velocity / 9500, ''], ['G-LOAD', Math.min(1, 0.3 + S.velocity / 9000), `${(1.2 + S.velocity / 2600).toFixed(1)} g`]].forEach(([k, v, s], i) => {
        const y = 100 + i * 66;
        text(g, k, 24, y, { size: 20, color: C.ink2, spacing: 2 }); if (s) text(g, s, w - 24, y, { size: 20, color: C.ink, align: 'right' });
        g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(24, y + 14, w - 48, 8); g.fillStyle = i > 1 ? C.amber : C.ok; g.fillRect(24, y + 14, (w - 48) * v, 8);
      });
    } else {
      const rows = [['BUS A', 0.94, '28.1 V'], ['BUS B', 0.93, '28.0 V'], ['FUEL CELLS', 0.88, '2 / 2'], ['O₂ TANK', 0.98, '98 %'], ['CABIN', 0.9, '101.3 kPa'], ['PROPELLANT', S.phase === 'go' ? 1 : 0.92 + S.link * 0.08, S.phase === 'go' ? 'FLIGHT' : 'TOPPING']];
      rows.forEach(([k, v, s], i) => {
        const y = 96 + i * 60; const jitter = Math.sin(time * 2 + i) * 0.01;
        text(g, k, 24, y, { size: 20, color: C.ink2, spacing: 2 }); text(g, s, w - 24, y, { size: 20, color: C.ink, align: 'right', spacing: 1 });
        g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(24, y + 14, w - 48, 8); g.fillStyle = C.ok; g.fillRect(24, y + 14, (w - 48) * Math.min(1, v + jitter), 8);
      });
    }
    screenOverlay(g, w, h, time); tex.tex.needsUpdate = true;
  }

  function attitude(g, cx, cy, r, roll, pitch) {
    g.save(); g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.clip();
    g.translate(cx, cy); g.rotate(roll);
    g.fillStyle = '#17324e'; g.fillRect(-r * 2, -r * 2, r * 4, r * 2 + pitch * r);
    g.fillStyle = '#3a2716'; g.fillRect(-r * 2, pitch * r, r * 4, r * 2);
    g.strokeStyle = 'rgba(233,236,239,0.8)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-r * 2, pitch * r); g.lineTo(r * 2, pitch * r); g.stroke();
    for (let k = -3; k <= 3; k++) if (k) { const y = pitch * r - k * r * 0.22; const lw = k % 2 ? r * 0.2 : r * 0.38; g.beginPath(); g.moveTo(-lw, y); g.lineTo(lw, y); g.stroke(); }
    g.restore();
    g.strokeStyle = 'rgba(233,236,239,0.45)'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = C.amberHot; g.lineWidth = 4; g.beginPath(); g.moveTo(cx - r * 0.55, cy); g.lineTo(cx - r * 0.15, cy); g.lineTo(cx - r * 0.1, cy + 10); g.moveTo(cx + r * 0.55, cy); g.lineTo(cx + r * 0.15, cy); g.lineTo(cx + r * 0.1, cy + 10); g.stroke();
  }

  function drawNav(time) {
    const { tex } = screens.nav; const g = tex.g; const w = tex.w; const h = tex.h;
    screenBase(g, w, h);
    text(g, 'GUIDANCE', 24, 40, { size: 22, color: C.amber, spacing: 5 });
    const moon = S.dest === 'moon';
    text(g, moon ? 'TGT · MOON' : 'TGT · MARS', w - 24, 40, { size: 18, color: C.ink2, align: 'right', spacing: 3 });
    if (S.count !== null) {
      text(g, t('countdown').toUpperCase(), w / 2, 150, { size: 26, color: C.ink2, align: 'center', spacing: 8 });
      text(g, `00:00:${String(Math.max(0, S.count)).padStart(2, '0')}`, w / 2, 280, { size: 104, color: S.count <= 3 ? C.amberHot : C.ink, align: 'center', spacing: 4 });
    } else if (S.flight) {
      // Ascent profile with the vehicle marker riding it.
      g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 1;
      for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(40, 120 + k * 60); g.lineTo(w - 40, 120 + k * 60); g.stroke(); }
      g.strokeStyle = 'rgba(214,170,53,0.6)'; g.lineWidth = 2; g.beginPath();
      for (let k = 0; k <= 60; k++) { const p = k / 60; const x = 40 + p * (w - 80); const y = 380 - Math.pow(p, 0.6) * 250; k ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
      const p = Math.min(1, S.altKm / 110); const mx = 40 + p * (w - 80); const my = 380 - Math.pow(p, 0.6) * 250;
      g.fillStyle = C.amberHot; g.beginPath(); g.arc(mx, my, 7, 0, Math.PI * 2); g.fill();
      text(g, `ALT ${S.altKm.toFixed(1)} km`, 40, h - 30, { size: 24, color: C.ink, spacing: 2 });
      text(g, `VEL ${Math.round(S.velocity)} m/s`, w - 40, h - 30, { size: 24, color: C.ink, align: 'right', spacing: 2 });
    } else if (S.nav) {
      const ex = 140; const ey = 270; const er = 70;
      wireGlobe(g, ex, ey, er, time * 0.3, { color: 'rgba(160,190,220,0.6)', lat: 5, lon: 8 });
      const tx = moon ? 470 : 540; const ty = moon ? 170 : 130; const tr = moon ? 22 : 28;
      g.setLineDash([6, 7]); g.lineDashOffset = -time * 24; g.strokeStyle = 'rgba(214,170,53,0.85)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(ex + er + 4, ey - 10); g.quadraticCurveTo((ex + tx) / 2, moon ? 60 : 30, tx - tr - 6, ty); g.stroke(); g.setLineDash([]);
      g.strokeStyle = moon ? 'rgba(225,225,220,0.9)' : 'rgba(214,120,80,0.95)'; g.beginPath(); g.arc(tx, ty, tr, 0, Math.PI * 2); g.stroke();
      text(g, moon ? 'TLI · Δv 3.1 km/s' : 'TMI · Δv 3.6 km/s', 330, 330, { size: 22, color: C.ink2, spacing: 2 });
      text(g, moon ? 'TRANSIT ≈ 3 d' : 'TRANSIT ≈ 7 mo', 330, 366, { size: 22, color: C.ink2, spacing: 2 });
      text(g, 'IMU ALIGNED', 24, h - 26, { size: 18, color: C.ok, spacing: 4 });
    } else {
      const k = 1 - S.align;
      attitude(g, w / 2, h / 2 + 14, 140, Math.sin(time * 5) * k * 0.7, Math.cos(time * 3.4) * k * 0.4 + k * 0.3);
      text(g, S.align > 0 ? `IMU ALIGN  ${Math.round(S.align * 100)}%` : 'IMU STANDBY', w / 2, h - 26, { size: 20, color: S.align > 0 ? C.ink2 : C.amberHot, align: 'center', spacing: 4 });
    }
    screenOverlay(g, w, h, time); tex.tex.needsUpdate = true;
  }

  function drawCom(time) {
    const { tex } = screens.com; const g = tex.g; const w = tex.w; const h = tex.h;
    screenBase(g, w, h);
    text(g, 'COMM', 24, 40, { size: 22, color: C.amber, spacing: 5 });
    text(g, S.comms ? 'S-BAND · LOCK' : S.link > 0 ? 'S-BAND · ACQ' : 'S-BAND · ---', w - 24, 40, { size: 18, color: S.comms ? C.ok : C.amberHot, align: 'right', spacing: 3 });
    const base = h - 70; const N = 64; const bw = (w - 48) / N;
    for (let i = 0; i < N; i++) {
      const center = Math.exp(-Math.pow((i - N / 2) / 4, 2)) * S.link;
      const noise = (Math.sin(time * 9 + i * 1.7) * 0.5 + 0.5) * 0.15 + Math.random() * 0.08;
      const talk = S.talking && S.comms ? Math.abs(Math.sin(time * 14 + i * 0.6)) * 0.25 * Math.random() : 0;
      const v = Math.min(1, noise + center * 0.9 + talk);
      g.fillStyle = center > 0.2 ? C.ok : 'rgba(150,170,190,0.45)';
      g.fillRect(24 + i * bw, base - v * 230, bw - 2, v * 230);
    }
    text(g, '2287.5 MHz', 24, h - 28, { size: 18, color: C.ink3, spacing: 2 });
    text(g, S.comms ? 'GEO CONTROL · CH 2' : '—', w - 24, h - 28, { size: 18, color: S.comms ? C.ink2 : C.ink3, align: 'right', spacing: 2 });
    screenOverlay(g, w, h, time); tex.tex.needsUpdate = true;
  }

  // ================================================================ interaction
  function hoverItem(object, onClick, onHover) {
    const item = { object, enabled: false, onClick, onHover: (on) => { if (on) audio.play('hover'); onHover?.(on); } };
    interactive.push(item); return item;
  }
  let pressPrepare = null; let pressLaunch = null;
  const masterItem = hoverItem(hitMaster, () => pressPrepare?.click(),
    (on) => gsap.to(masterLed, { emissiveIntensity: on ? 4 : 1.6, duration: 0.2 }));
  const launchItem = hoverItem(hitLaunch, () => pressLaunch?.click(),
    (on) => gsap.to(launchBtnMat, { emissiveIntensity: on ? 2.4 : 1.0, duration: 0.2 }));

  // ================================================================ update
  let acc = 0;
  function update(dt, time) {
    ext.update(dt, time);
    acc += dt;
    if (acc > 1 / 24) {
      acc = 0;
      if (S.boot > 0) { drawSys(time); drawNav(time); drawCom(time); }
      if (S.powered && S.count === null) {
        const pad = (v) => String(Math.max(0, Math.floor(v)) % 60).padStart(2, '0');
        drawTimer(S.flight ? `+00:00:${pad(time - S.liftAt)}` : `-00:09:${pad(59 - (time - S.metAt))}`);
      }
    }
    if (S.phase === 'go') launchBtnMat.emissiveIntensity = 0.7 + Math.sin(time * 4) * 0.35;
    ticks.forEach((f) => f(dt, time));
  }

  // ================================================================ stage 2 — preparation
  const cam = stage.rig;
  const look = (x, y, z, d, delay = 0) => gsap.to(cam.look, { x, y, z, duration: dur(d), ease: 'power2.inOut', delay });

  async function runPreparation() {
    hud.setSceneChrome('cockpit');
    audio.setBed('cockpit'); audio.setIntensity(0.35);
    cam.pos.set(-0.05, 1.22, 1.05); cam.look.set(0.1, 1.05, -2);
    await hud.fadeTo(0, R ? 300 : 1400);
    gsap.to(cam.pos, { x: 0, y: 1.25, z: 0.62, duration: dur(2.4), ease: 'power2.out' });
    look(0, 1.08, -3, 2.4);
    await hud.wait(R ? 150 : 900);

    masterItem.enabled = true;
    const p = hud.showPanel(`
      <p class="panel-kicker">${t('c_kicker')}</p>
      <h2 class="panel-title">${t('c_title')}</h2>
      <button class="btn btn-tech" id="prepare" type="button">${t('c_prepare')}</button>
      <div class="dest" role="group" aria-label="${t('c_dest')}">
        <span>${t('c_dest')}</span>
        <button type="button" data-dest="moon" aria-pressed="${S.dest === 'moon'}">${t('c_moon')}</button>
        <button type="button" data-dest="mars" aria-pressed="${S.dest === 'mars'}">${t('c_mars')}</button>
      </div>`);
    p.querySelectorAll('.dest button').forEach((b) => b.addEventListener('click', () => {
      S.dest = mission.dest = b.dataset.dest; audio.play('click');
      p.querySelectorAll('.dest button').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
    }));
    pressPrepare = p.querySelector('#prepare');
    pressPrepare.focus({ preventScroll: true });
    await once(pressPrepare);
    masterItem.enabled = false; document.body.style.cursor = '';
    await powerSequence(p);
  }

  async function powerSequence(p) {
    const steps = ['c_s_power', 'c_s_nav', 'c_s_comms', 'c_s_arm'];
    p.innerHTML = `<p class="panel-kicker">${t('c_kicker')}</p><h2 class="panel-title">${t('c_running')}</h2>
      <ul class="checklist">${steps.map((k, i) => hud.checkItem(String(i), t(k), 'idle', '')).join('')}</ul>`;
    p.querySelectorAll('.check').forEach((b) => { b.disabled = true; });
    const row = (i) => p.querySelector(`.check[data-id="${i}"]`);
    const busy = (i) => hud.setCheckState(row(i), 'busy', '···');
    const done = (i) => { hud.setCheckState(row(i), 'done', 'OK'); audio.play('confirm'); };
    const w = (ms) => hud.wait(R ? ms * 0.25 : ms);

    // Master power: guard up, switch thrown, relays, domes.
    busy(0);
    audio.play('servo');
    gsap.to(guardPivot.rotation, { x: -1.9, duration: dur(0.35), ease: 'power2.out' });
    await w(380);
    gsap.to(masterLever.rotation, { x: -0.9, duration: 0.12, ease: 'back.out(3)' });
    masterLed.emissive.set(C.ok);
    audio.play('relay'); audio.play('powerUp');
    S.powered = true; S.metAt = E.time;
    gsap.to(emergency, { intensity: 0.15, duration: 1.2 });
    domes.forEach((l, i) => gsap.to(l, { intensity: 1.5, duration: 0.25, delay: 0.15 + i * 0.12 }));
    gsap.to(domeMat, { emissiveIntensity: 1.8, duration: 0.25, delay: 0.15 });
    gsap.to(panelFlood, { intensity: 3.2, duration: 0.6, delay: 0.3 });
    gsap.to(timerMat, { emissiveIntensity: 1.6, duration: 0.3, delay: 0.4 });
    setAnn(0, 'amber');
    // Glance up at the overhead as it comes alive.
    look(0, 2.3, -0.4, 1.0, 0.1);
    for (let i = 0; i < banks[0].count; i++) { banks[0].flip(i, true, 0.35 + i * 0.07); }
    for (let i = 0; i < 8; i++) setTimeout(() => audio.play('tick'), (R ? 50 : 400) + i * 70);
    await w(1500);
    look(0, 1.0, -2.6, 1.0);
    // Integrally lit panels come up left → right, then the displays boot.
    panelMats.forEach((m, i) => gsap.to(m, { emissiveIntensity: 0.9, duration: 0.5, delay: 0.1 + (i % 6) * 0.08 }));
    gsap.to(cabin.userData.glareshield.userData.led.material, { emissiveIntensity: 0.7, duration: 0.6 });
    ledLights.forEach((l) => gsap.to(l, { intensity: 0.9, duration: 0.8 }));
    ['sys', 'nav', 'com'].forEach((id, i) => setTimeout(() => { screenOn(id); audio.play('tick'); }, (R ? 50 : 300) + i * 220));
    gsap.to(S, { boot: 1, duration: dur(2.2), ease: 'none' });
    banks.slice(1).forEach((b, bi) => { for (let i = 0; i < b.count; i++) b.flip(i, true, 0.6 + bi * 0.25 + i * 0.06); });
    knobs.forEach((k, i) => gsap.to(k.rotation, { z: -1.2 - i * 0.3, duration: 0.6, delay: 0.8 + i * 0.1, ease: 'power2.out' }));
    gO2.set(0.98); gPress.set(0.84);
    Object.values(screens).forEach((s, si) => { for (let k = 0; k < 10; k++) setTimeout(() => s.keys.set(k, k % 3 ? '#3d8f72' : '#9a7a24'), (R ? 60 : 900) + si * 120 + k * 40); });
    [4, 5].forEach((i) => setTimeout(() => setAnn(i, 'ok'), R ? 100 : 1600));
    await w(1800);
    setAnn(0, 'ok'); done(0);

    // Guidance alignment.
    busy(1); setAnn(1, 'amber'); setAnn(2, 'amber');
    audio.play('scan');
    look(0, 0.86, -1.6, 0.9);
    await new Promise((r) => gsap.to(S, { align: 1, duration: dur(2.6), ease: 'power1.inOut', onComplete: r }));
    S.nav = true; setAnn(1, 'ok'); setAnn(2, 'ok'); done(1);

    // Comms with Mission Control.
    busy(2); setAnn(3, 'amber');
    look(0.55, 0.95, -1.9, 1.0);
    gsap.to(S, { link: 1, duration: dur(1.4), ease: 'power2.in' });
    await w(1400);
    S.comms = true; setAnn(3, 'ok');
    S.talking = true;
    hud.transmit([{ k: 'c_tx1', hold: 1500 }], { from: t('from_cmdr') })
      .then(() => hud.transmit([{ k: 'c_tx2', hold: 1900 }]))
      .then(() => { S.talking = false; });
    done(2);

    // Access arm swings clear; look out the right window to watch it.
    busy(3);
    audio.play('servo');
    look(1.6, 1.25, -2.4, 1.2);
    gsap.to(ext.armPivot.rotation, { y: -1.0, duration: dur(4.5), ease: 'power1.inOut' });
    await w(3400);
    setAnn(6, 'ok'); done(3);
    look(0, 1.08, -3, 1.2);
    await w(900);
  }

  // ================================================================ stage 3 — launch
  async function runLaunch() {
    S.phase = 'go';
    hud.setSceneChrome('launch');
    audio.setIntensity(0.6);
    setAnn(7, 'amber');
    hud.transmit([{ k: 'l_tx1', hold: 2200 }]);
    look(0, 0.45, -0.75, 1.4);
    gsap.to(cam.pos, { y: 1.2, z: 0.55, duration: dur(1.4), ease: 'power2.inOut' });
    await hud.wait(R ? 150 : 900);
    audio.play('servo');
    gsap.to(coverPivot.rotation, { x: -1.9, duration: dur(0.8), ease: 'power2.out' });
    gsap.to(pedLight, { intensity: 0.9, duration: 0.8 });
    launchItem.enabled = true;
    const p = hud.showPanel(`
      <p class="panel-kicker">${t('l_kicker')}</p>
      <h2 class="panel-title">${t('l_title')}</h2>
      <button class="btn-launch" id="launch" type="button">${t('l_button')}</button>`);
    pressLaunch = p.querySelector('#launch');
    pressLaunch.focus({ preventScroll: true });
    await once(pressLaunch);
    launchItem.enabled = false; document.body.style.cursor = '';
    gsap.to(launchBtn.position, { z: 0.004, duration: 0.08, yoyo: true, repeat: 1 });
    audio.play('relay'); audio.play('confirm');
    hud.hidePanel();
    setAnn(7, 'ok');
    S.phase = 'count';
    launchBtnMat.emissiveIntensity = 2.5;
    masterLights[0].emissiveIntensity = 0;
    look(0, 1.1, -3, 1.2);
    gsap.to(cam.pos, { y: 1.25, z: 0.62, duration: dur(1.2), ease: 'power2.inOut' });
    audio.setIntensity(0.8);

    // T-5 … 0
    for (let n = 5; n >= 0; n--) {
      S.count = n; hud.showCount(n); drawTimer(`-00:00:0${n}`);
      audio.play('tick');
      if (n === 5) hud.transmit([{ k: 'l_tx2', hold: 1800 }]);
      if (n === 3) { audio.setEngine(0.35, 2); gsap.to(E, { engine: 0.4, duration: 2.5 }); stage.shake = R ? 0 : 0.3; }
      if (n === 1) gsap.to(masterLights[0], { emissiveIntensity: 3, duration: 0.1, yoyo: true, repeat: 5 });
      if (n > 0) await hud.wait(1000);
    }

    // Ignition and climb.
    S.count = null; S.flight = true; S.liftAt = E.time;
    E.igniteAt = E.time;
    setTimeout(() => hud.hideCount(), 700);
    audio.play('ignition'); audio.setEngine(1, 1.2); audio.setIntensity(1);
    hud.flash(1300);
    gsap.to(E, { engine: 1, duration: 0.8 });
    stage.shake = R ? 0 : 1.7;
    hud.transmit([{ k: 'l_tx3', hold: 2200 }]);
    const flight = { p: 0 };
    const total = R ? 5 : 11.5;
    let saidMaxQ = false;
    await new Promise((resolve) => gsap.to(flight, {
      p: 1, duration: total, ease: 'power1.in',
      onUpdate: () => {
        const pp = flight.p;
        ext.setAscent(pp);
        S.altKm = Math.pow(pp, 2.2) * 110; S.velocity = pp * pp * 7600;
        if (!R) stage.shake = 1.7 - pp * 1.0 + Math.sin(pp * 40) * 0.08;
        if (pp > 0.82) ext.sky.material.uniforms.uPitch.value = (pp - 0.82) / 0.18 * 0.26;
        if (pp > 0.45 && !saidMaxQ) { saidMaxQ = true; hud.transmit([{ k: 'l_tx4', hold: 2200 }]); }
        if (pp > 0.86 && !flight.fading) { flight.fading = true; audio.setEngine(0, 2.2); audio.setIntensity(0.45); }
      },
      onComplete: resolve,
    }));
    stage.shake = 0;
  }

  function dispose() {
    gsap.killTweensOf([cam.pos, cam.look, S, E]);
    scene.traverse((o) => {
      o.geometry?.dispose?.();
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      mats.forEach((m) => { m.map?.dispose?.(); m.emissiveMap?.dispose?.(); m.dispose?.(); });
    });
  }

  return { scene, update, interactive, runPreparation, runLaunch, dispose, state: S, ext };
}
