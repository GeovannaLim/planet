// Shared launch-pad world: dusk sky (with orbital Earth), pad, tower, crew access
// arm, venting, searchlights, ignition exhaust and the cloud deck.
// Both the boarding stage and the cockpit build on it, so what the visitor sees
// through the cockpit window is the same pad they just walked across.
//
// Vehicle frame: the crew cabin is centred on the origin, its windows face -Z,
// the hatch faces the tower (azimuth 135°, toward +X/-Z).

import * as THREE from 'three';
import {
  dotTexture, cloudTexture, gratingTexture, lightShaftMaterial, emissive, metal, paint, box, rbox, rng,
} from '../util.js';

export const GROUND_Y = -55;
export const TOWER = { x: 10, z: -10 };
export const HATCH_PHI = Math.atan2(TOWER.x - 1.6, TOWER.z + 1.6); // 135°

export function createExterior(scene, quality) {
  const q = quality;
  const E = { alt: 0, engine: 0, igniteAt: null, time: 0 };
  const updaters = [];

  // ---------------------------------------------------------------- sky
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(2500, 48, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: {
        uAlt: { value: 0 }, uTime: { value: 0 }, uPitch: { value: 0 },
        uSun: { value: new THREE.Vector3(-0.55, 0.04, -0.83).normalize() },
      },
      vertexShader: /* glsl */`
        varying vec3 vDir;
        void main(){
          vDir = normalize(position);
          vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_Position = p.xyww;
        }`,
      fragmentShader: /* glsl */`
        uniform float uAlt; uniform float uTime; uniform vec3 uSun; uniform float uPitch;
        varying vec3 vDir;
        float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
        float vnoise(vec3 p){
          vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                     mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
        }
        float fbm(vec3 p){ float a = 0.5; float v = 0.0; for (int k = 0; k < 5; k++) { v += a * vnoise(p); p *= 2.03; a *= 0.5; } return v; }
        void main(){
          vec3 d = normalize(vDir);
          // Pitch-over at the top of the climb tilts the view toward the planet.
          float cp = cos(uPitch); float sp = sin(uPitch);
          d = vec3(d.x, d.y * cp + d.z * sp, -d.y * sp + d.z * cp);
          float horizon = mix(-0.01, -0.12, uAlt) - uAlt * 0.35 * d.x * d.x;
          float y = d.y - horizon;
          vec3 zenith = mix(vec3(0.018,0.03,0.07), vec3(0.0,0.0,0.004), uAlt);
          vec3 mid    = mix(vec3(0.09,0.11,0.2), vec3(0.004,0.008,0.02), uAlt);
          vec3 hor    = mix(vec3(0.95,0.45,0.17), vec3(0.18,0.42,1.0), smoothstep(0.2,0.9,uAlt));
          vec3 col = mix(mid, zenith, smoothstep(0.04, 0.7, y));
          float hb = exp(-max(y, 0.0) * mix(7.0, 60.0, uAlt));
          col = mix(col, hor, hb * 0.9);
          // High thin cloud streaks at dusk.
          float streak = fbm(vec3(d.x * 3.0, d.y * 22.0, d.z * 3.0)) * smoothstep(0.02, 0.12, y) * smoothstep(0.45, 0.15, y);
          col += vec3(0.5, 0.28, 0.2) * streak * 0.18 * (1.0 - uAlt);
          float s = max(dot(d, uSun), 0.0);
          col += vec3(1.0, 0.55, 0.22) * pow(s, 10.0) * 0.55 * (1.0 - uAlt * 0.5);
          col += vec3(1.0, 0.8, 0.6) * pow(s, 300.0) * 2.0;
          if (y < 0.0) {
            vec3 q = d * 11.0 + vec3(0.0, 0.0, uTime * 0.02);
            float land = smoothstep(0.52, 0.6, fbm(q * 0.7 + 11.0));
            float cl = smoothstep(0.48, 0.78, fbm(q * 1.6));
            vec3 surf = mix(vec3(0.012, 0.04, 0.1), vec3(0.06, 0.065, 0.045), land);
            surf = mix(surf, vec3(0.6, 0.63, 0.68), cl * 0.85);
            float lit = clamp(0.35 + dot(d, normalize(uSun + vec3(0.0, 0.4, 0.0))) * 0.9, 0.08, 1.2);
            surf *= lit;
            vec3 earth = mix(vec3(0.03, 0.025, 0.03), surf, smoothstep(0.55, 1.0, uAlt));
            col = mix(hor * 0.8, earth, smoothstep(0.0, 0.02 + uAlt * 0.05, -y));
          }
          vec3 cell = floor(d * 380.0);
          float n = hash(cell);
          float star = step(0.9972, n) * smoothstep(0.0, 0.25, y);
          float tw = 0.65 + 0.35 * sin(uTime * 1.7 + n * 120.0);
          col += vec3(star * tw) * mix(0.18, 1.3, uAlt);
          gl_FragColor = vec4(col, 1.0);
        }`,
    }),
  );
  sky.frustumCulled = false; sky.renderOrder = -1;
  scene.add(sky);

  const world = new THREE.Group(); scene.add(world);

  // ---------------------------------------------------------------- ground + site lights
  const groundMat = new THREE.MeshStandardMaterial({ color: '#0d0d0f', roughness: 1, metalness: 0, transparent: true });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(2200, 64), groundMat);
  ground.rotation.x = -Math.PI / 2; ground.position.y = GROUND_Y; ground.receiveShadow = true; world.add(ground);

  const siteLights = new THREE.PointsMaterial({ color: '#ffc27a', size: 2.2, map: dotTexture().tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  {
    const r = rng(7); const N = q.tier === 'high' ? 900 : 350;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const a = r() * Math.PI * 2; const d = 90 + Math.pow(r(), 0.7) * 1500;
      pos[i * 3] = Math.cos(a) * d; pos[i * 3 + 1] = GROUND_Y + 0.5; pos[i * 3 + 2] = Math.sin(a) * d - 200;
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    world.add(new THREE.Points(geo, siteLights));
  }

  // Xenon searchlights sweeping the dusk sky from around the pad.
  const beams = [];
  [[-260, -420, 0.25], [320, -380, -0.2], [-80, -640, 0.05]].forEach(([x, z, lean], i) => {
    const mat = lightShaftMaterial('#dfe8ff', 0.05);
    mat.fog = false;
    // The shaft shader is brightest at uv.y = 1, so the narrow top is the lamp and
    // the cone is flipped to shine upward from it.
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 22, 700, 24, 1, true), mat);
    cone.geometry.translate(0, -350, 0); cone.rotation.x = Math.PI;
    const beam = new THREE.Group(); beam.add(cone);
    beam.position.set(x, GROUND_Y, z); beam.rotation.z = lean;
    beam.userData = { lean, ph: i * 2.1, mat };
    world.add(beam); beams.push(beam);
  });
  updaters.push((dt, t) => beams.forEach((b) => {
    b.rotation.z = b.userData.lean + Math.sin(t * 0.08 + b.userData.ph) * 0.12;
    b.rotation.x = Math.cos(t * 0.06 + b.userData.ph) * 0.08;
    b.userData.mat.uniforms.uTime.value = t;
    b.userData.mat.uniforms.uIntensity.value = 0.05 * (1 - E.alt);
  }));

  // ---------------------------------------------------------------- launch tower
  const tower = new THREE.Group(); tower.position.set(TOWER.x, 0, TOWER.z); world.add(tower);
  const towerMat = metal('#4a3a34', 0.6, 0.6);
  {
    const top = 30; const sz = 3.2; const step = 3.2;
    const levels = Math.floor((top - GROUND_Y) / step);
    const beamsI = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), towerMat, levels * 12 + 4);
    const m = new THREE.Matrix4(); const qn = new THREE.Quaternion(); const sc = new THREE.Vector3(); const p = new THREE.Vector3();
    let k = 0;
    const put = (x, y, z, sx, sy, sz2, rx = 0, ry = 0, rz = 0) => {
      qn.setFromEuler(new THREE.Euler(rx, ry, rz)); sc.set(sx, sy, sz2); p.set(x, y, z);
      m.compose(p, qn, sc); beamsI.setMatrixAt(k++, m);
    };
    const h = top - GROUND_Y;
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => put(a * sz / 2, GROUND_Y + h / 2, b * sz / 2, 0.24, h, 0.24));
    const diag = Math.hypot(sz, step); const ang = Math.atan2(step, sz);
    for (let l = 0; l < levels; l++) {
      const y = GROUND_Y + l * step;
      put(0, y, -sz / 2, sz, 0.14, 0.14); put(0, y, sz / 2, sz, 0.14, 0.14);
      put(-sz / 2, y, 0, 0.14, 0.14, sz); put(sz / 2, y, 0, 0.14, 0.14, sz);
      const s = l % 2 ? 1 : -1;
      put(0, y + step / 2, -sz / 2, diag, 0.08, 0.08, 0, 0, s * ang);
      put(0, y + step / 2, sz / 2, diag, 0.08, 0.08, 0, 0, -s * ang);
      put(-sz / 2, y + step / 2, 0, 0.08, 0.08, diag, s * ang, 0, 0);
      put(sz / 2, y + step / 2, 0, 0.08, 0.08, diag, -s * ang, 0, 0);
    }
    beamsI.count = k; beamsI.castShadow = true; tower.add(beamsI);
    // Platform decks.
    [-20, -8, 0, 12].forEach((y) => tower.add(box(sz + 0.6, 0.1, sz + 0.6, metal('#2c2e31', 0.7, 0.6), 0, y - 0.05, 0)));

    const glowTex = dotTexture(128).tex;
    const mkGlow = (color, opacity = 0.9) => new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
    [-30, -14, 2, 18].forEach((y, i) => {
      const s = mkGlow('#ffe1b0'); s.scale.setScalar(i % 2 ? 2.4 : 3.2); s.position.set(-sz / 2 - 0.3, y, sz / 2 + 0.2); tower.add(s);
      tower.add(box(0.3, 0.2, 0.2, emissive('#fff2d8', 5), -sz / 2 - 0.2, y, sz / 2 + 0.1));
    });
    const beacon = mkGlow('#ff3b2a'); beacon.scale.setScalar(3.5); beacon.position.set(0, top + 1, 0); tower.add(beacon);
    tower.add(box(0.3, 0.3, 0.3, emissive('#ff3b2a', 4), 0, top + 0.6, 0));
    updaters.push((dt, t) => { beacon.material.opacity = Math.max(0, Math.sin(t * 3.2)) > 0.6 ? 1 : 0.08; });
  }

  // ---------------------------------------------------------------- crew access arm
  const armPivot = new THREE.Group(); armPivot.position.set(TOWER.x - 1.6, 0, TOWER.z + 1.6); world.add(armPivot);
  const armEnd = new THREE.Vector3(Math.sin(HATCH_PHI) * 2.45, 0, Math.cos(HATCH_PHI) * 2.45);
  const armLen = armEnd.clone().sub(armPivot.position).length();
  const arm = new THREE.Group();
  arm.rotation.y = Math.atan2(-(armEnd.z - armPivot.position.z), armEnd.x - armPivot.position.x);
  armPivot.add(arm);
  {
    const L = armLen; const W = 1.7;
    const steel = metal('#3b3e43', 0.55, 0.75);
    const rail = paint('#c9a227', 0.45, 0.4);
    const grate = gratingTexture([L * 3, W * 3]);
    const floorMat = new THREE.MeshStandardMaterial({ color: '#7d8187', map: grate.tex, alphaMap: grate.tex, alphaTest: 0.5, metalness: 0.7, roughness: 0.5, side: THREE.DoubleSide });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(L, W - 0.1), floorMat);
    floor.rotation.x = -Math.PI / 2; floor.position.set(L / 2, 0, 0); floor.receiveShadow = true; floor.castShadow = true; arm.add(floor);
    [-1, 1].forEach((s) => {
      const ch = box(L, 0.32, 0.08, steel, L / 2, -0.17, s * W / 2); ch.castShadow = true; arm.add(ch);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, L, 10), rail);
      top.rotation.z = Math.PI / 2; top.position.set(L / 2, 1.06, s * (W / 2 - 0.02)); top.castShadow = true; arm.add(top);
      const mid = top.clone(); mid.position.y = 0.56; arm.add(mid);
      for (let x = 0.3; x < L; x += 1.2) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.06, 8), rail);
        post.position.set(x, 0.53, s * (W / 2 - 0.02)); post.castShadow = true; arm.add(post);
        arm.add(box(0.06, 0.06, 0.06, emissive('#ffd59a', 2.5), x + 0.6, 0.04, s * (W / 2 - 0.12)));
      }
      // Under-truss.
      for (let x = 0; x < L - 1; x += 1.2) {
        const d = box(1.6, 0.05, 0.05, steel, x + 0.6, -0.55, s * W / 2); d.rotation.z = 0.5; arm.add(d);
      }
      arm.add(box(L, 0.08, 0.08, steel, L / 2, -0.9, s * W / 2));
    });
    for (let x = 0.2; x < L; x += 1.2) arm.add(box(0.06, 0.1, W, steel, x, -0.08, 0));
    // Canopy portals with light fixtures.
    for (let x = 1.2; x < L - 0.6; x += 2.4) {
      [-1, 1].forEach((s) => { const p = box(0.08, 2.4, 0.08, steel, x, 1.2, s * (W / 2 + 0.05)); p.castShadow = true; arm.add(p); });
      arm.add(box(0.1, 0.1, W + 0.2, steel, x, 2.4, 0));
      arm.add(box(0.5, 0.03, 0.12, emissive('#fff0d8', 1.6), x, 2.33, 0));
    }
    // Cable tray.
    for (let k = 0; k < 3; k++) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, L, 8), paint(k ? '#1b1c1e' : '#3a2f22', 0.8, 0));
      c.rotation.z = Math.PI / 2; c.position.set(L / 2, 2.2 - k * 0.04, -W / 2 + 0.06); arm.add(c);
    }
    // White-room portal that mates with the hatch.
    const seal = paint('#d9d6cf', 0.6, 0.1);
    [-1, 1].forEach((s) => arm.add(rbox(0.16, 2.3, 0.14, seal, L - 0.12, 1.15, s * 0.78, 0.03)));
    arm.add(rbox(0.16, 0.18, 1.7, seal, L - 0.12, 2.3, 0, 0.03));
    arm.add(rbox(0.06, 0.06, 1.4, paint('#111', 0.9, 0), L - 0.02, 2.18, 0, 0.02));
    const l1 = new THREE.PointLight('#ffe2b8', 2.2, 7, 1.6); l1.position.set(L - 3, 2.1, 0); arm.add(l1);
    const l2 = new THREE.PointLight('#ffe2b8', 1.6, 7, 1.6); l2.position.set(L - 7.5, 2.1, 0); arm.add(l2);
  }

  // ---------------------------------------------------------------- vapor venting
  const vapor = [];
  {
    const tex = cloudTexture(128, 13).tex; const r = rng(17);
    for (let i = 0; i < (q.tier === 'high' ? 30 : 14); i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: '#b9b6b8', transparent: true, opacity: 0, depthWrite: false }));
      const a = r() * Math.PI * 2; const rad = 3 + r() * 6;
      const base = { x: Math.sin(a) * rad, y: -26 + r() * 22, z: Math.cos(a) * rad, s: 4 + r() * 7, v: 0.5 + r() * 0.8, ph: r() * 10 };
      s.userData = base; s.position.set(base.x, base.y, base.z); s.scale.setScalar(base.s);
      s.material.rotation = r() * 6;
      world.add(s); vapor.push(s);
    }
    updaters.push((dt, t) => vapor.forEach((s) => {
      const u = s.userData;
      s.position.y += u.v * dt * (1 + E.engine * 6);
      s.position.x += Math.sin(t * 0.2 + u.ph) * dt * 0.4 + dt * 0.25;
      if (s.position.y > u.y + 14) { s.position.y = u.y - 3; s.position.x = u.x; }
      const life = (s.position.y - (u.y - 3)) / 17;
      s.material.opacity = Math.sin(Math.PI * Math.min(1, Math.max(0, life))) * (0.16 + E.engine * 0.3) * (1 - E.alt);
      s.material.color.setRGB(0.72 + E.engine * 0.28, 0.71 + E.engine * 0.05, 0.73 - E.engine * 0.35);
    }));
  }

  // ---------------------------------------------------------------- exhaust + clouds
  const cloudTex = cloudTexture();
  const billows = [];
  {
    const r = rng(23); const N = q.tier === 'high' ? 24 : 10;
    for (let i = 0; i < N; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex.tex, color: '#d8cfc6', transparent: true, opacity: 0, depthWrite: false }));
      const x = (r() - 0.5) * 22; const z = -5 - r() * 16;
      s.position.set(x, -14 + r() * 6, z);
      s.userData = { x0: x, z0: z, y0: s.position.y, delay: r() * 1.6, rise: 9 + r() * 7, out: (r() - 0.5) * 6, size: 7 + r() * 9 };
      s.material.rotation = r() * Math.PI;
      s.visible = false; world.add(s); billows.push(s);
    }
    updaters.push(() => {
      if (E.igniteAt == null) return;
      const age = E.time - E.igniteAt;
      billows.forEach((s) => {
        const u = s.userData; const a = age - u.delay;
        if (a < 0) return;
        s.visible = true;
        s.position.set(u.x0 + u.out * a, u.y0 + u.rise * a + 0.5 * a * a, u.z0);
        s.scale.setScalar(u.size * (1 + a * 0.6));
        s.material.opacity = Math.min(1, a * 2) * Math.max(0, 1 - a / 6) * 0.7;
        const heat = Math.max(0, 1 - a / 2.5);
        s.material.color.setRGB(0.85 + heat * 0.15, 0.8 - heat * 0.15, 0.76 - heat * 0.4);
      });
    });
  }
  const clouds = [];
  {
    const r = rng(29); const N = q.tier === 'high' ? 34 : 14;
    for (let i = 0; i < N; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex.tex, color: '#d6c4b6', transparent: true, opacity: 0.75, depthWrite: false, fog: false }));
      const near = i < N * 0.35;
      s.position.set((r() - 0.5) * (near ? 14 : 180), 300 + r() * 60, near ? -3 - r() * 10 : -20 - r() * 160);
      s.scale.setScalar(near ? 12 + r() * 10 : 40 + r() * 60);
      s.material.rotation = r() * Math.PI;
      world.add(s); clouds.push(s);
    }
    updaters.push(() => clouds.forEach((c) => { c.material.opacity = 0.75 * (1 - E.alt); }));
  }

  // ---------------------------------------------------------------- lights
  scene.add(new THREE.HemisphereLight('#7f8fb0', '#1a1410', 0.2));
  const dusk = new THREE.DirectionalLight('#ffb27a', 0.9); dusk.position.set(-6, 2, -10); scene.add(dusk);
  const engineLight = new THREE.PointLight('#ff8a3a', 0, 40, 1.2); engineLight.position.set(0, -6, -3); scene.add(engineLight);

  function update(dt, t) {
    E.time = t;
    sky.material.uniforms.uTime.value = t;
    sky.material.uniforms.uAlt.value = E.alt;
    updaters.forEach((u) => u(dt, t));
    engineLight.intensity = E.engine > 0 ? E.engine * (300 + Math.random() * 160) * (1 - E.alt * 0.8) : 0;
  }

  /** Climb profile p∈[0,1]: pad falls away, sky turns to space. */
  function setAscent(p) {
    world.position.y = -Math.pow(p, 2.2) * 1400;
    E.alt = THREE.MathUtils.smoothstep(p, 0.18, 0.95);
    groundMat.opacity = 1 - THREE.MathUtils.smoothstep(p, 0.35, 0.7);
    siteLights.opacity = 1 - THREE.MathUtils.smoothstep(p, 0.2, 0.6);
    if (scene.fog) scene.fog.far = 1600 + p * 6000;
  }

  return { E, sky, world, armPivot, arm, armEnd, armLen, update, setAscent, engineLight };
}
