// Renderer, post-processing, camera rig (sway + shake) and pointer picking.
// Scenes plug in through stage.setScene({ scene, update, interactive }).

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2'));
  } catch { return false; }
}

export class Stage {
  constructor(canvas, quality) {
    this.quality = quality;
    const renderer = (this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: quality.tier === 'high', powerPreference: 'high-performance',
    }));
    renderer.setPixelRatio(quality.dpr);
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = quality.tier === 'high';
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.camera = new THREE.PerspectiveCamera(this._fov(), window.innerWidth / window.innerHeight, 0.03, 3000);

    // The rig is what scenes animate: a position and a point to look at.
    this.rig = { pos: new THREE.Vector3(0, 1.65, 6), look: new THREE.Vector3(0, 1.6, 0) };
    this.swayAmount = quality.reducedMotion ? 0 : 1;
    this.shake = 0;
    this._pointer = new THREE.Vector2(0, 0);
    this._sway = new THREE.Vector2(0, 0);

    const pmrem = new THREE.PMREMGenerator(renderer);
    this.envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    this.composer = new EffectComposer(renderer);
    this.renderPass = new RenderPass(new THREE.Scene(), this.camera);
    this.composer.addPass(this.renderPass);
    if (quality.bloom) {
      this.bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.55, 0.55, 0.82);
      this.composer.addPass(this.bloom);
    }
    this.composer.addPass(new OutputPass());

    this.raycaster = new THREE.Raycaster();
    this.hovered = null;
    this.active = null;
    this.clock = new THREE.Clock();

    window.addEventListener('resize', () => this.resize());
    canvas.addEventListener('pointermove', (e) => this._onMove(e));
    canvas.addEventListener('click', (e) => this._onClick(e));
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.onContextLost?.(); });

    renderer.setAnimationLoop(() => this._frame());
  }

  _fov() { return window.innerWidth / window.innerHeight < 1 ? 70 : 52; }

  resize() {
    const w = window.innerWidth; const h = window.innerHeight;
    this.camera.aspect = w / h; this.camera.fov = this._fov(); this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
  }

  setScene(active) {
    this.active?.dispose?.();
    this.active = active;
    active.scene.environment = this.envMap;
    this.renderPass.scene = active.scene;
    this.hovered = null;
    document.body.style.cursor = '';
  }

  // ---------------------------------------------------------------- picking
  _ndc(e) {
    return new THREE.Vector2((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  }

  _pick(ndc) {
    const list = this.active?.interactive?.filter((i) => i.enabled !== false) || [];
    if (!list.length) return null;
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObjects(list.map((i) => i.object), true);
    if (!hits.length) return null;
    let o = hits[0].object;
    while (o) {
      const item = list.find((i) => i.object === o);
      if (item) return item;
      o = o.parent;
    }
    return null;
  }

  _onMove(e) {
    this._pointer.set((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    if (e.pointerType === 'touch') return;
    const item = this._pick(this._ndc(e));
    if (item !== this.hovered) {
      this.hovered?.onHover?.(false);
      this.hovered = item;
      item?.onHover?.(true);
      document.body.style.cursor = item ? 'pointer' : '';
    }
  }

  _onClick(e) {
    const item = this._pick(this._ndc(e));
    item?.onClick?.();
  }

  // ---------------------------------------------------------------- loop
  _frame() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;

    // Smoothed pointer sway: a subtle head movement, never a free-look camera.
    this._sway.lerp(this._pointer, 1 - Math.pow(0.04, dt));
    const cam = this.camera;
    cam.position.copy(this.rig.pos);
    if (this.shake > 0) {
      const s = this.shake;
      cam.position.x += (Math.sin(t * 47.3) + Math.sin(t * 91.7) * 0.5) * 0.006 * s;
      cam.position.y += (Math.sin(t * 53.1) + Math.sin(t * 77.9) * 0.5) * 0.008 * s;
      cam.position.z += Math.sin(t * 61.7) * 0.004 * s;
    }
    cam.lookAt(this.rig.look);
    if (this.swayAmount) {
      cam.rotateY(-this._sway.x * 0.045 * this.swayAmount);
      cam.rotateX(-this._sway.y * 0.03 * this.swayAmount);
    }
    // Idle breathing.
    if (!this.quality.reducedMotion) cam.position.y += Math.sin(t * 0.9) * 0.006;

    this.active?.update?.(dt, t);
    this.composer.render(dt);
  }
}
