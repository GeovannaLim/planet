// Procedural textures and shared materials. No external image assets are needed
// for the 3D scenes: panels, screens and decals are drawn on canvases.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { gsap } from 'gsap';

export const FONT = '"Chakra Petch", monospace';
export const C = {
  amber: '#d6aa35', amberHot: '#ffcf5c', ok: '#2fd39e', info: '#4f8cff', warn: '#e0633b',
  ink: '#e9ecef', ink2: '#9aa3ad', ink3: '#58616b', screen: '#05090c',
};

/** A canvas-backed texture you can redraw at any time. */
export function canvasTexture(w, h, draw, { colorSpace = THREE.SRGBColorSpace, repeat } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const g = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = colorSpace;
  tex.anisotropy = 8;
  if (repeat) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(...repeat); }
  const api = {
    canvas, g, tex, w, h,
    redraw: (...args) => { draw?.(g, w, h, ...args); tex.needsUpdate = true; },
  };
  if (draw) api.redraw();
  return api;
}

// Deterministic PRNG so procedural detail is stable between reloads.
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** Brushed / painted metal wall panel with seams, rivets and small stencils. */
export function panelTexture({ base = '#24272b', seam = '#121416', labels = [], stripes = false, seed = 3, w = 1024, h = 1024 } = {}) {
  return canvasTexture(w, h, (g) => {
    const r = rng(seed);
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = `rgba(255,255,255,${r() * 0.025})`;
      g.fillRect(r() * w, r() * h, 1 + r() * 60, 1);
    }
    const cols = 2; const rows = 3;
    for (let x = 0; x < cols; x++) for (let y = 0; y < rows; y++) {
      const px = (x * w) / cols; const py = (y * h) / rows; const pw = w / cols; const ph = h / rows;
      const shade = (r() - 0.5) * 0.06;
      g.fillStyle = shade > 0 ? `rgba(255,255,255,${shade})` : `rgba(0,0,0,${-shade})`;
      g.fillRect(px + 4, py + 4, pw - 8, ph - 8);
      g.strokeStyle = seam; g.lineWidth = 5; g.strokeRect(px + 2, py + 2, pw - 4, ph - 4);
      g.strokeStyle = 'rgba(255,255,255,0.05)'; g.lineWidth = 1; g.strokeRect(px + 6, py + 6, pw - 12, ph - 12);
      g.fillStyle = 'rgba(0,0,0,0.55)';
      [[14, 14], [pw - 14, 14], [14, ph - 14], [pw - 14, ph - 14]].forEach(([rx, ry]) => {
        g.beginPath(); g.arc(px + rx, py + ry, 3.2, 0, Math.PI * 2); g.fill();
      });
      if (r() > 0.6) {
        g.fillStyle = 'rgba(0,0,0,0.6)';
        const vx = px + pw * 0.2; const vy = py + ph * 0.55;
        for (let k = 0; k < 7; k++) g.fillRect(vx, vy + k * 12, pw * 0.6, 5);
      }
    }
    if (stripes) {
      const sh = 54; g.save(); g.beginPath(); g.rect(0, h - sh, w, sh); g.clip();
      g.fillStyle = '#16181a'; g.fillRect(0, h - sh, w, sh);
      g.fillStyle = 'rgba(214,170,53,0.55)';
      for (let x = -sh; x < w + sh; x += 44) {
        g.beginPath(); g.moveTo(x, h); g.lineTo(x + 22, h); g.lineTo(x + 22 + sh, h - sh); g.lineTo(x + sh, h - sh); g.fill();
      }
      g.restore();
    }
    labels.forEach(([text, x, y, size = 22, color]) => {
      g.font = `500 ${size}px ${FONT}`; g.fillStyle = color || 'rgba(233,236,239,0.38)';
      g.fillText(text, x * w, y * h);
    });
  });
}

/** Soft round sprite for dust / lights. */
export function dotTexture(size = 64) {
  return canvasTexture(size, size, (g, w) => {
    const grd = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.25, 'rgba(255,255,255,0.6)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, w, w);
  });
}

/** Soft, lumpy cloud puff built from overlapping radial blobs. */
export function cloudTexture(size = 256, seed = 5) {
  return canvasTexture(size, size, (g, w) => {
    const r = rng(seed);
    for (let i = 0; i < 26; i++) {
      const a = r() * Math.PI * 2; const d = Math.pow(r(), 0.8) * w * 0.26;
      const x = w / 2 + Math.cos(a) * d; const y = w / 2 + Math.sin(a) * d * 0.8;
      const rad = w * (0.1 + r() * 0.16);
      const grd = g.createRadialGradient(x, y, 0, x, y, rad);
      grd.addColorStop(0, `rgba(255,255,255,${0.22 + r() * 0.2})`);
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd; g.fillRect(0, 0, w, w);
    }
  });
}

/** Additive volumetric shaft (cone) — cheap fake god-rays. */
export function lightShaftMaterial(color = '#ffe2b0', intensity = 0.16) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color(color) }, uIntensity: { value: intensity }, uTime: { value: 0 } },
    vertexShader: /* glsl */`
      varying vec2 vUv; varying vec3 vN; varying vec3 vView;
      void main(){
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position,1.0);
        vN = normalize(normalMatrix * normal);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor; uniform float uIntensity; uniform float uTime;
      varying vec2 vUv; varying vec3 vN; varying vec3 vView;
      void main(){
        float edge = pow(abs(dot(vN, vView)), 1.6);
        float fall = smoothstep(0.0, 0.9, vUv.y) * (0.35 + 0.65 * vUv.y);
        float flicker = 0.94 + 0.06 * sin(uTime * 1.3 + vUv.y * 4.0);
        gl_FragColor = vec4(uColor * edge * fall * uIntensity * flicker, 1.0);
      }`,
  });
}

/** Floating dust motes inside a box volume. */
export function dust(count, box3, color = '#ffe8c4', size = 0.03, opacity = 0.55) {
  const pos = new Float32Array(count * 3);
  const r = rng(11);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = box3.min.x + r() * (box3.max.x - box3.min.x);
    pos[i * 3 + 1] = box3.min.y + r() * (box3.max.y - box3.min.y);
    pos[i * 3 + 2] = box3.min.z + r() * (box3.max.z - box3.min.z);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color, size, map: dotTexture().tex, transparent: true, opacity, depthWrite: false,
    blending: THREE.AdditiveBlending, sizeAttenuation: true,
  });
  const pts = new THREE.Points(geo, mat);
  pts.userData.update = (dt, t) => {
    const a = geo.attributes.position.array;
    for (let i = 0; i < count; i++) {
      a[i * 3 + 1] += Math.sin(t * 0.3 + i) * 0.0008;
      a[i * 3] += Math.cos(t * 0.2 + i * 0.7) * 0.0006;
    }
    geo.attributes.position.needsUpdate = true;
  };
  return pts;
}

export function emissive(color, intensity = 2) {
  return new THREE.MeshStandardMaterial({ color: '#000', emissive: color, emissiveIntensity: intensity, toneMapped: true });
}

export function metal(color = '#2b2e33', rough = 0.42, metalness = 0.85) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness });
}

export function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

// Screen helpers ------------------------------------------------------------

export function screenBase(g, w, h, { grid = true } = {}) {
  g.fillStyle = C.screen; g.fillRect(0, 0, w, h);
  if (grid) {
    g.strokeStyle = 'rgba(120,150,170,0.06)'; g.lineWidth = 1;
    for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, h); g.stroke(); }
    for (let y = 0; y < h; y += 32) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(w, y + 0.5); g.stroke(); }
  }
}

export function screenOverlay(g, w, h, t = 0) {
  g.fillStyle = 'rgba(0,0,0,0.18)';
  for (let y = 0; y < h; y += 3) g.fillRect(0, y, w, 1);
  const grd = g.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, w * 0.75);
  grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(0,0,0,0.55)');
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  const band = ((t * 60) % (h + 80)) - 40;
  g.fillStyle = 'rgba(255,255,255,0.025)'; g.fillRect(0, band, w, 40);
}

export function text(g, str, x, y, { size = 20, color = C.ink, weight = 500, align = 'left', spacing = 0 } = {}) {
  g.font = `${weight} ${size}px ${FONT}`;
  g.fillStyle = color; g.textAlign = align; g.textBaseline = 'alphabetic';
  if ('letterSpacing' in g) g.letterSpacing = `${spacing}px`;
  g.fillText(str, x, y);
  if ('letterSpacing' in g) g.letterSpacing = '0px';
  g.textAlign = 'left';
}

/** Orthographic wireframe globe (lat/long) drawn onto a 2D canvas. */
export function wireGlobe(g, cx, cy, r, rot, { color = 'rgba(233,236,239,0.5)', tilt = 0.4, lat = 7, lon = 12 } = {}) {
  g.save();
  g.strokeStyle = color; g.lineWidth = 1;
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
  const ct = Math.cos(tilt); const st = Math.sin(tilt);
  const proj = (la, lo) => {
    const x = Math.cos(la) * Math.sin(lo + rot);
    const y = Math.sin(la);
    const z = Math.cos(la) * Math.cos(lo + rot);
    const y2 = y * ct - z * st; const z2 = y * st + z * ct;
    return [cx + x * r, cy - y2 * r, z2];
  };
  const seg = (pts) => {
    let pen = false; g.beginPath();
    pts.forEach(([x, y, z]) => {
      if (z < 0) { pen = false; return; }
      if (!pen) { g.moveTo(x, y); pen = true; } else g.lineTo(x, y);
    });
    g.stroke();
  };
  for (let i = 1; i < lat; i++) {
    const la = -Math.PI / 2 + (i * Math.PI) / lat; const pts = [];
    for (let k = 0; k <= 64; k++) pts.push(proj(la, (k / 64) * Math.PI * 2));
    seg(pts);
  }
  for (let j = 0; j < lon; j++) {
    const lo = (j / lon) * Math.PI * 2; const pts = [];
    for (let k = 0; k <= 48; k++) pts.push(proj(-Math.PI / 2 + (k / 48) * Math.PI, lo));
    seg(pts);
  }
  g.restore();
}

// ---------------------------------------------------------------- hard-surface helpers


/** Bevelled box: catches light on its edges, which reads as machined/moulded parts. */
export function rbox(w, h, d, mat, x = 0, y = 0, z = 0, r = 0.012) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2)), mat);
  m.position.set(x, y, z);
  return m;
}

export function paint(color, rough = 0.62, metalness = 0.15) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness });
}

/**
 * Spacecraft panel face with silkscreen markings. Returns a painted colour map and
 * a matching emissive map so the markings glow when panel lighting is switched on
 * (integrally lit panels). draw(api) is called with metre coordinates.
 */
export function panelFace(wm, hm, draw, { base = '#2c2e32', ppm = 640, seed = 4 } = {}) {
  const w = Math.round(wm * ppm); const h = Math.round(hm * ppm);
  const mk = (lit) => canvasTexture(w, h, (g) => {
    const r = rng(seed);
    g.fillStyle = lit ? '#000' : base; g.fillRect(0, 0, w, h);
    if (!lit) {
      for (let i = 0; i < w * h / 900; i++) { g.fillStyle = `rgba(255,255,255,${r() * 0.018})`; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1); }
      g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, w - 3, h - 3);
      g.fillStyle = 'rgba(0,0,0,0.45)';
      [[10, 10], [w - 10, 10], [10, h - 10], [w - 10, h - 10]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 3.5, 0, Math.PI * 2); g.fill(); });
    }
    const ink = lit ? '#ffffff' : 'rgba(226,226,220,0.78)';
    const X = (m) => (m / wm + 0.5) * w; const Y = (m) => (0.5 - m / hm) * h;
    draw({
      g, X, Y, ppm,
      label: (s, x, y, size = 0.014, align = 'center') => {
        g.font = `500 ${Math.round(size * ppm)}px ${FONT}`; g.fillStyle = ink; g.textAlign = align; g.textBaseline = 'middle';
        g.fillText(s, X(x), Y(y)); g.textAlign = 'left';
      },
      frame: (x, y, fw, fh, title) => {
        g.strokeStyle = ink; g.lineWidth = Math.max(1, ppm * 0.0016);
        g.strokeRect(X(x - fw / 2), Y(y + fh / 2), fw * ppm, fh * ppm);
        if (title) {
          g.font = `600 ${Math.round(0.011 * ppm)}px ${FONT}`; const tw = g.measureText(title).width + 10;
          g.fillStyle = lit ? '#000' : base; g.fillRect(X(x) - tw / 2, Y(y + fh / 2) - 7, tw, 14);
          g.fillStyle = ink; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(title, X(x), Y(y + fh / 2)); g.textAlign = 'left';
        }
      },
      stripes: (x, y, sw, sh) => {
        if (lit) return;
        g.save(); g.beginPath(); g.rect(X(x - sw / 2), Y(y + sh / 2), sw * ppm, sh * ppm); g.clip();
        for (let k = -sh * ppm; k < sw * ppm + sh * ppm; k += 18) {
          g.fillStyle = 'rgba(214,170,53,0.85)'; g.beginPath();
          g.moveTo(X(x - sw / 2) + k, Y(y + sh / 2)); g.lineTo(X(x - sw / 2) + k + 9, Y(y + sh / 2));
          g.lineTo(X(x - sw / 2) + k + 9 - sh * ppm, Y(y - sh / 2)); g.lineTo(X(x - sw / 2) + k - sh * ppm, Y(y - sh / 2)); g.fill();
        }
        g.restore();
      },
    });
  });
  const map = mk(false); const lit = mk(true);
  const mat = new THREE.MeshStandardMaterial({
    map: map.tex, emissiveMap: lit.tex, emissive: '#ffcf8a', emissiveIntensity: 0, roughness: 0.68, metalness: 0.2,
  });
  return mat;
}

/** Quilted beta-cloth wall padding with stitching. */
export function quiltTexture(repeat = [6, 3]) {
  const t = canvasTexture(512, 512, (g, w) => {
    const r = rng(77);
    g.fillStyle = '#cfcbc2'; g.fillRect(0, 0, w, w);
    const n = 4; const c = w / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const x = i * c; const y = j * c;
      const grd = g.createRadialGradient(x + c / 2, y + c / 2, c * 0.1, x + c / 2, y + c / 2, c * 0.72);
      grd.addColorStop(0, 'rgba(255,255,255,0.18)'); grd.addColorStop(1, 'rgba(0,0,0,0.28)');
      g.fillStyle = grd; g.fillRect(x, y, c, c);
      g.strokeStyle = 'rgba(60,55,50,0.35)'; g.setLineDash([4, 4]); g.lineWidth = 1.5; g.strokeRect(x + 3, y + 3, c - 6, c - 6); g.setLineDash([]);
    }
    for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.04})`; g.fillRect(r() * w, r() * w, 2, 2); }
  }, { repeat });
  return t;
}

/** Open steel grating (used with alphaTest so the gaps are see-through). */
export function gratingTexture(repeat = [4, 20]) {
  return canvasTexture(128, 128, (g, w) => {
    g.clearRect(0, 0, w, w);
    g.fillStyle = '#ffffff';
    for (let k = 0; k < w; k += 16) { g.fillRect(k, 0, 4, w); }
    for (let k = 0; k < w; k += 32) { g.fillRect(0, k, w, 3); }
  }, { repeat });
}

/** Faint smudges and micro-scratches for window glass. */
export function smudgeTexture() {
  return canvasTexture(512, 512, (g, w) => {
    const r = rng(91);
    g.fillStyle = '#000'; g.fillRect(0, 0, w, w);
    for (let i = 0; i < 22; i++) {
      const x = r() * w; const y = r() * w; const rad = 20 + r() * 90;
      const grd = g.createRadialGradient(x, y, 0, x, y, rad);
      grd.addColorStop(0, `rgba(255,255,255,${0.05 + r() * 0.08})`); grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd; g.fillRect(0, 0, w, w);
    }
    g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 0.6;
    for (let i = 0; i < 60; i++) { const x = r() * w; const y = r() * w; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 60, y + (r() - 0.5) * 20); g.stroke(); }
  });
}

/**
 * A bank of instanced toggle switches (bases + levers) in a parent's local space.
 * flip(i, on) animates one lever; levers pivot about their base.
 */
export function switchBank(parent, points, { leverLen = 0.032, color = '#d4d6da' } = {}) {
  const n = points.length;
  const baseGeo = new RoundedBoxGeometry(0.026, 0.03, 0.008, 2, 0.003);
  const leverGeo = new THREE.CylinderGeometry(0.0032, 0.0045, leverLen, 10); leverGeo.translate(0, leverLen / 2, 0);
  const tipGeo = new THREE.SphereGeometry(0.0055, 10, 8); tipGeo.translate(0, leverLen, 0);
  const bases = new THREE.InstancedMesh(baseGeo, paint('#121314', 0.5, 0.5), n);
  const levers = new THREE.InstancedMesh(leverGeo, metal(color, 0.25, 1), n);
  const tips = new THREE.InstancedMesh(tipGeo, metal(color, 0.2, 1), n);
  const state = points.map(() => ({ a: 1.0 }));
  const m = new THREE.Matrix4(); const q = new THREE.Quaternion(); const e = new THREE.Euler(); const one = new THREE.Vector3(1, 1, 1);
  const p = new THREE.Vector3();
  const write = (i) => {
    p.set(points[i][0], points[i][1], points[i][2] + 0.004);
    q.setFromEuler(e.set(state[i].a, 0, 0)); m.compose(p, q, one);
    levers.setMatrixAt(i, m); tips.setMatrixAt(i, m);
  };
  points.forEach(([x, y, z], i) => { m.makeTranslation(x, y, z); bases.setMatrixAt(i, m); write(i); });
  [bases, levers, tips].forEach((o) => { o.castShadow = true; parent.add(o); });
  const refresh = () => { levers.instanceMatrix.needsUpdate = true; tips.instanceMatrix.needsUpdate = true; };
  return {
    count: n,
    flip(i, on = true, delay = 0) {
      gsap.to(state[i], { a: on ? -1.0 : 1.0, duration: 0.12, delay, ease: 'back.out(3)', onUpdate: () => { write(i); refresh(); } });
    },
  };
}

/**
 * Instanced push-buttons with backlit caps (unlit material so instance colour reads as light).
 */
export function buttonBank(parent, points, { size = [0.03, 0.022, 0.012] } = {}) {
  const n = points.length;
  const caps = new THREE.InstancedMesh(new RoundedBoxGeometry(size[0], size[1], size[2], 2, 0.003),
    new THREE.MeshBasicMaterial({ toneMapped: false }), n);
  const off = new THREE.Color('#2a2b2e');
  const m = new THREE.Matrix4();
  points.forEach(([x, y, z], i) => { m.makeTranslation(x, y, z + size[2] / 2); caps.setMatrixAt(i, m); caps.setColorAt(i, off); });
  parent.add(caps);
  return {
    count: n,
    set(i, color) { caps.setColorAt(i, color ? new THREE.Color(color) : off); caps.instanceColor.needsUpdate = true; },
  };
}
