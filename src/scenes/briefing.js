// Stage 01 — Mission Briefing (≈15 s).
// The crew-prep corridor: Mission Control's display hangs mid-corridor; the
// visitor acknowledges the mission with one click, the display retracts and the
// vehicle-access hatch at the end opens onto the light of the access arm.

import * as THREE from 'three';
import { gsap } from 'gsap';
import {
  C, canvasTexture, panelTexture, lightShaftMaterial, dust, emissive, metal, box,
  screenBase, screenOverlay, text, wireGlobe, rng,
} from '../util.js';
import * as hud from '../hud.js';
import { t } from '../i18n.js';
import { audio } from '../audio.js';

const once = (el) => new Promise((res) => el.addEventListener('click', res, { once: true }));

export function createBriefing(stage) {
  const q = stage.quality;
  const R = q.reducedMotion;
  const dur = (s) => (R ? Math.min(s, 0.5) : s);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#040506');
  scene.fog = new THREE.FogExp2('#040506', 0.045);
  scene.environmentIntensity = 0.32;
  const updaters = [];
  const interactive = [];
  const L = { zFront: 11, zBack: -14, w: 7, h: 4.4 };

  // ---------------------------------------------------------------- materials
  const frameMat = metal('#2c2f34', 0.36, 0.9);
  const darkMat = metal('#141619', 0.55, 0.7);
  const wallTex = panelTexture({
    seed: 5, stripes: true,
    labels: [['SECTOR 07 · CREW PREP', 0.06, 0.09, 24], ['O₂ / N₂ LINE', 0.56, 0.42, 20], ['PRESS 101.3 kPa', 0.06, 0.76, 18]],
  });
  wallTex.tex.wrapS = THREE.RepeatWrapping; wallTex.tex.repeat.set(6, 1);
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex.tex, metalness: 0.65, roughness: 0.48 });
  const floorTex = canvasTexture(1024, 1024, (g, w, h) => {
    const r = rng(9);
    g.fillStyle = '#17191c'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(255,255,255,${r() * 0.03})`; g.fillRect(r() * w, r() * h, 2, 2); }
    g.strokeStyle = '#0a0b0c'; g.lineWidth = 6;
    for (let k = 0; k <= 4; k++) { g.beginPath(); g.moveTo(0, (k * h) / 4); g.lineTo(w, (k * h) / 4); g.stroke(); }
    g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke();
    g.fillStyle = 'rgba(214,170,53,0.32)'; g.fillRect(w * 0.06, 0, 8, h); g.fillRect(w * 0.94 - 8, 0, 8, h);
  }, { repeat: [2, 7] });
  const floorMat = new THREE.MeshStandardMaterial({ map: floorTex.tex, metalness: 0.78, roughness: 0.3 });

  // ---------------------------------------------------------------- shell
  const len = L.zFront - L.zBack; const zMid = (L.zFront + L.zBack) / 2;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(L.w, len), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.z = zMid; scene.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(L.w, len), darkMat);
  ceil.rotation.x = Math.PI / 2; ceil.position.set(0, L.h, zMid); scene.add(ceil);
  [-1, 1].forEach((s) => {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(len, L.h), wallMat);
    wall.rotation.y = -s * Math.PI / 2; wall.position.set(s * L.w / 2, L.h / 2, zMid); scene.add(wall);
  });

  const stripMat = emissive('#ffe6c2', 2.4);
  const ribZ = [8, 4, 0, -4, -8, -12];
  ribZ.forEach((z, i) => {
    const rib = new THREE.Group(); rib.position.z = z;
    [-1, 1].forEach((s) => {
      rib.add(box(0.4, L.h, 0.55, frameMat, s * 3.25, L.h / 2, 0));
      rib.add(box(0.05, 2.3, 0.07, stripMat, s * 3.04, 1.75, 0));
      const brace = box(0.9, 0.32, 0.55, frameMat, s * 2.85, L.h - 0.42, 0);
      brace.rotation.z = s * Math.PI / 4; rib.add(brace);
    });
    rib.add(box(L.w, 0.36, 0.55, frameMat, 0, L.h - 0.18, 0));
    scene.add(rib);
    if (i < ribZ.length - 1) {
      const fz = z - 2;
      scene.add(box(1.4, 0.06, 0.42, emissive('#fff1dd', i % 2 ? 1.4 : 2.6), 0, L.h - 0.05, fz));
      scene.add(box(1.6, 0.1, 0.6, darkMat, 0, L.h - 0.02, fz));
    }
  });

  // Floor guide LEDs leading to the hatch.
  const leds = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 0.02, 0.18), emissive('#ffbf47', 1.6), 44);
  const m4 = new THREE.Matrix4(); let n = 0;
  for (let k = 0; k < 22; k++) for (const s of [-1, 1]) { m4.makeTranslation(s * 2.95, 0.012, 10 - k * 1.1); leds.setMatrixAt(n++, m4); }
  scene.add(leds);

  const shafts = [];
  [[0, 4], [0, -9]].forEach(([x, z], i) => {
    const mat = lightShaftMaterial('#ffe0b0', i ? 0.12 : 0.16);
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 1.9, L.h - 0.1, 32, 1, true), mat);
    cone.position.set(x, L.h / 2 - 0.05, z); scene.add(cone); shafts.push(mat);
  });
  const motes = dust(q.particles, new THREE.Box3(new THREE.Vector3(-3, 0.1, -14), new THREE.Vector3(3, 4.2, 10)));
  scene.add(motes); updaters.push(motes.userData.update);

  // ---------------------------------------------------------------- lights
  scene.add(new THREE.HemisphereLight('#8a9bb0', '#0b0b0c', 0.25));
  const warmA = new THREE.PointLight('#ffd7a3', 14, 11, 1.6); warmA.position.set(0, 4, 2); scene.add(warmA);
  const warmB = new THREE.PointLight('#ffd7a3', 10, 11, 1.6); warmB.position.set(0, 4, -8); scene.add(warmB);
  const screenGlow = new THREE.PointLight('#a9c3d6', 0, 7, 1.8); screenGlow.position.set(0, 2.4, -3.6); scene.add(screenGlow);
  const hatchSpot = new THREE.SpotLight('#ffd8a0', 40, 9, 0.55, 0.7, 1.4);
  hatchSpot.position.set(0, 4.2, -10.5); hatchSpot.target.position.set(0, 1.2, -14); scene.add(hatchSpot, hatchSpot.target);
  const tubeLight = new THREE.PointLight('#fff0d8', 0, 14, 1.4); tubeLight.position.set(0, 1.8, -13.4); scene.add(tubeLight);

  // ---------------------------------------------------------------- briefing display
  const screen = { mode: 'nosignal' };
  const scr = canvasTexture(1280, 640);
  const screenGroup = new THREE.Group(); screenGroup.position.set(0, 2.45, -4.5);
  screenGroup.add(box(4.2, 2.2, 0.1, metal('#0d0e10', 0.4, 0.8), 0, 0, -0.06));
  const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(4, 2), new THREE.MeshBasicMaterial({ map: scr.tex, toneMapped: false, fog: false }));
  screenGroup.add(screenMesh);
  [-1.6, 1.6].forEach((x) => {
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 2, 6), frameMat);
    cable.position.set(x, 2.05, -0.06); screenGroup.add(cable);
  });
  scene.add(screenGroup);

  function drawScreen(time) {
    const g = scr.g; const w = scr.w; const h = scr.h;
    screenBase(g, w, h);
    if (screen.mode === 'nosignal') {
      const r = Math.random;
      for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(200,210,220,${r() * 0.12})`; g.fillRect(r() * w, r() * h, 3 + r() * 30, 2); }
      text(g, 'ACQUIRING SIGNAL', w / 2, h / 2, { size: 30, color: C.ink2, align: 'center', spacing: 8 });
      if (Math.floor(time * 2) % 2) text(g, '● ● ●', w / 2, h / 2 + 46, { size: 18, color: C.amber, align: 'center', spacing: 6 });
      screenOverlay(g, w, h, time); scr.tex.needsUpdate = true;
      return;
    }
    g.fillStyle = 'rgba(255,255,255,0.04)'; g.fillRect(0, 0, w, 64);
    text(g, 'MISSION CONTROL', 40, 42, { size: 22, color: C.ink, spacing: 5 });
    const mcW = g.measureText('MISSION CONTROL').width + 15 * 5;
    text(g, '— SIGNAL ESTABLISHED', 40 + mcW + 14, 42, { size: 22, color: C.ok, spacing: 5 });
    const now = new Date(); const pad = (v) => String(v).padStart(2, '0');
    text(g, `UTC ${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}`, w - 150, 42, { size: 20, color: C.ink2, align: 'right', spacing: 3 });
    for (let b = 0; b < 4; b++) { g.fillStyle = b < 3 + (Math.sin(time * 3) > 0) ? C.ok : C.ink3; g.fillRect(w - 120 + b * 12, 46 - b * 7, 7, 8 + b * 7); }

    const cx = 330; const cy = 360; const Rg = 190;
    const glow = g.createRadialGradient(cx, cy, Rg * 0.6, cx, cy, Rg * 1.35);
    glow.addColorStop(0, 'rgba(79,140,255,0.10)'); glow.addColorStop(1, 'rgba(79,140,255,0)');
    g.fillStyle = glow; g.beginPath(); g.arc(cx, cy, Rg * 1.35, 0, Math.PI * 2); g.fill();
    wireGlobe(g, cx, cy, Rg, time * 0.25, { color: 'rgba(200,215,230,0.42)' });
    text(g, 'EARTH', cx, cy + Rg + 40, { size: 16, color: C.ink2, align: 'center', spacing: 6 });
    [{ name: 'MOON', x: 700, y: 190, r: 22, col: 'rgba(220,220,215,0.85)' }, { name: 'MARS', x: 720, y: 520, r: 30, col: 'rgba(214,120,80,0.85)' }].forEach((tg, k) => {
      g.setLineDash([6, 8]); g.lineDashOffset = -time * 30;
      g.strokeStyle = 'rgba(214,170,53,0.55)'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(cx + Rg * 0.7, cy + (k ? 60 : -60));
      g.quadraticCurveTo((cx + tg.x) / 2 + 60, k ? cy + 260 : cy - 260, tg.x - tg.r - 6, tg.y); g.stroke();
      g.setLineDash([]);
      g.strokeStyle = tg.col; g.lineWidth = 1.5; g.beginPath(); g.arc(tg.x, tg.y, tg.r, 0, Math.PI * 2); g.stroke();
      wireGlobe(g, tg.x, tg.y, tg.r, -time * 0.4 + k, { color: tg.col.replace('0.85', '0.35'), lat: 4, lon: 6 });
      text(g, tg.name, tg.x + tg.r + 14, tg.y + 6, { size: 16, color: C.ink2, spacing: 6 });
    });

    const x0 = 860;
    g.strokeStyle = 'rgba(255,255,255,0.10)'; g.strokeRect(x0 - 24, 100, w - x0 - 16, 470);
    text(g, 'MISSION BRIEF', x0, 140, { size: 15, color: C.amber, spacing: 6 });
    text(g, 'GEO-ANALOG-01', x0, 184, { size: 34, color: C.ink, spacing: 3 });
    [['OBJECTIVE', 'PLANETARY ANALOGUES'], ['SITES', 'EARTH · MOON · MARS'], ['CREW', '01 · COMMANDER'], ['VEHICLE', 'GEO-1 · PAD 39']].forEach(([k, v], i) => {
      const y = 240 + i * 62;
      text(g, k, x0, y, { size: 13, color: C.ink3, spacing: 4 });
      text(g, v, x0, y + 26, { size: 20, color: C.ink, spacing: 2 });
    });
    const ack = screen.mode === 'ack';
    const blink = ack || Math.floor(time * 1.6) % 2;
    g.fillStyle = ack ? 'rgba(47,211,158,0.12)' : 'rgba(214,170,53,0.12)'; g.fillRect(x0 - 8, 498, w - x0 - 40, 46);
    if (blink) { g.fillStyle = ack ? C.ok : C.amber; g.beginPath(); g.arc(x0 + 10, 521, 6, 0, Math.PI * 2); g.fill(); }
    text(g, ack ? 'CREW ACKNOWLEDGED' : 'AWAITING CREW ACK', x0 + 28, 528, { size: 18, color: ack ? C.ok : C.amber, spacing: 4 });
    text(g, 'EYES · INTELLIGENCE · ACTION', 40, h - 28, { size: 13, color: C.ink3, spacing: 6 });
    text(g, 'GEO.AI', w - 40, h - 28, { size: 15, color: C.ink2, align: 'right', spacing: 6 });
    screenOverlay(g, w, h, time); scr.tex.needsUpdate = true;
  }

  // ---------------------------------------------------------------- hatch + back wall
  const back = new THREE.Group(); back.position.z = L.zBack;
  const backTex = panelTexture({ seed: 21, labels: [['HATCH 03', 0.08, 0.12, 30, 'rgba(214,170,53,0.7)']] });
  const backMat = new THREE.MeshStandardMaterial({ map: backTex.tex, metalness: 0.7, roughness: 0.45 });
  const opW = 2.6; const opH = 3.0; const side = (L.w - opW) / 2;
  back.add(box(side, L.h, 0.3, backMat, -(opW / 2 + side / 2), L.h / 2, 0));
  back.add(box(side, L.h, 0.3, backMat, opW / 2 + side / 2, L.h / 2, 0));
  back.add(box(opW, L.h - opH, 0.3, backMat, 0, opH + (L.h - opH) / 2, 0));
  back.add(box(opW + 0.3, 0.15, 0.5, frameMat, 0, opH + 0.07, 0.1));
  [-1, 1].forEach((s) => back.add(box(0.15, opH, 0.5, frameMat, s * (opW / 2 + 0.07), opH / 2, 0.1)));
  const tube = new THREE.Mesh(new THREE.PlaneGeometry(opW, opH), emissive('#fff0d6', 0));
  tube.position.set(0, opH / 2, -1.2); back.add(tube);
  const tubeShaft = lightShaftMaterial('#fff0d8', 0);
  const tubeCone = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2.8, 6, 32, 1, true), tubeShaft);
  tubeCone.rotation.x = Math.PI / 2; tubeCone.position.set(0, 1.4, 2.6); back.add(tubeCone);
  const doorTex = panelTexture({ seed: 33, stripes: true, w: 512, h: 1024, labels: [['VEHICLE ACCESS', 0.1, 0.1, 30], ['GEO-1', 0.1, 0.16, 22, 'rgba(214,170,53,0.7)']] });
  const doorMat = new THREE.MeshStandardMaterial({ map: doorTex.tex, metalness: 0.75, roughness: 0.4 });
  const doors = [-1, 1].map((s) => { const d = box(opW / 2, opH, 0.18, doorMat, s * opW / 4, opH / 2, 0.05); back.add(d); return d; });
  const statusLamp = box(0.5, 0.06, 0.06, emissive(C.warn, 2.5), 0, opH + 0.3, 0.2); back.add(statusLamp);
  scene.add(back);

  // ---------------------------------------------------------------- update
  let acc = 0; let hatchOpen = false;
  function update(dt, time) {
    updaters.forEach((u) => u(dt, time));
    shafts.forEach((m) => { m.uniforms.uTime.value = time; });
    tubeShaft.uniforms.uTime.value = time;
    acc += dt;
    if (acc > 1 / 30 && screenGroup.visible) { acc = 0; drawScreen(time); }
    if (!hatchOpen) statusLamp.material.emissiveIntensity = 1.4 + (0.5 + 0.5 * Math.sin(time * 4)) * 1.6;
  }

  // ---------------------------------------------------------------- flow
  const cam = stage.rig;

  async function run() {
    hud.setSceneChrome('briefing');
    audio.setBed('facility'); audio.setIntensity(0.15);
    cam.pos.set(0, 1.72, R ? 2.2 : 10.4); cam.look.set(0, 2.3, -4.5);
    drawScreen(0);
    await hud.fadeTo(0, R ? 300 : 2000);
    if (!R) gsap.to(cam.pos, { z: 2.2, y: 1.66, duration: 9, ease: 'power2.inOut' });
    const ep = hud.currentEpoch();
    if (!(await hud.wait(R ? 200 : 1600, ep))) return;
    screen.mode = 'signal'; audio.play('scan');
    gsap.to(screenGlow, { intensity: 6, duration: 1.2 });

    // The confirmation is offered right away, so a fast reader never waits on the radio.
    const panel = hud.showPanel(`
      <p class="panel-kicker">${t('r_kicker')}</p>
      <h2 class="panel-title">${t('r_title')}</h2>
      <p class="panel-text">${t('r_text')}</p>
      <button class="btn btn-tech" id="ack" type="button">${t('r_confirm')}</button>`);
    const ackBtn = panel.querySelector('#ack');
    interactive.push({ object: screenMesh, enabled: true, onClick: () => ackBtn.click(), onHover: (on) => on && audio.play('hover') });
    hud.transmit([{ k: 'tx1', hold: 1600 }, { k: 'tx2' }, { k: 'tx3', hold: 2400 }, { k: 'tx4' }]);
    await once(ackBtn);
    if (ep !== hud.currentEpoch()) return;
    interactive[0].enabled = false; document.body.style.cursor = '';
    screen.mode = 'ack'; audio.play('confirm'); audio.setIntensity(0.3);
    hud.hidePanel();
    hud.transmit([{ k: 'tx5', hold: 2000 }]);
    await hud.wait(R ? 200 : 1400);

    // Display retracts, the hatch opens onto the access arm, walk through.
    audio.play('servo');
    gsap.to(screenGroup.position, { y: 6.4, duration: dur(2.6), ease: 'power2.inOut', onComplete: () => { screenGroup.visible = false; } });
    gsap.to(screenGlow, { intensity: 0, duration: 1.6 });
    gsap.to(cam.look, { x: 0, y: 1.6, z: -14, duration: dur(2.6), ease: 'power2.inOut' });
    await hud.wait(R ? 200 : 1600);
    hatchOpen = true;
    statusLamp.material.emissive.set(C.ok); statusLamp.material.emissiveIntensity = 3;
    audio.play('door');
    gsap.to(doors[0].position, { x: -opW * 0.75, duration: dur(2.4), ease: 'power2.inOut' });
    gsap.to(doors[1].position, { x: opW * 0.75, duration: dur(2.4), ease: 'power2.inOut' });
    gsap.to(tube.material, { emissiveIntensity: 3.2, duration: 2.4 });
    gsap.to(tubeLight, { intensity: 30, duration: 2.4 });
    gsap.to(tubeShaft.uniforms.uIntensity, { value: 0.22, duration: 2.4 });
    gsap.to(cam.pos, { x: 0, y: 1.7, z: -13.4, duration: dur(4.6), ease: 'power2.inOut', delay: 0.6 });
    audio.play('whoosh');
    await hud.wait(R ? 300 : 4200);
    hud.clearTransmission();
    await hud.fadeTo(1, 900);
  }

  function dispose() {
    gsap.killTweensOf([cam.pos, cam.look]);
    scene.traverse((o) => {
      o.geometry?.dispose?.();
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      mats.forEach((m) => { m.map?.dispose?.(); m.dispose?.(); });
    });
  }

  return { scene, update, interactive, run, dispose };
}
