// DOM layer: transmissions (with subtitles), objective panels, title cards,
// progress rail. All interactive controls live here as real <button>s so the
// whole mission can be played by keyboard and screen reader; the 3D controls
// in the scenes call the same actions.

import { t } from './i18n.js';
import { audio } from './audio.js';
import { SCENES } from './config.js';

const $ = (id) => document.getElementById(id);
const els = {
  panel: $('panel'), tx: $('transmission'), title: $('title-card'),
  rail: $('rail'), label: $('scene-label'), fade: $('fade'), flash: $('flash'),
};

// Every scene change bumps the epoch; pending waits from an older scene resolve
// to false so their sequences stop instead of writing over the new scene.
let epoch = 0;
export const newEpoch = () => ++epoch;
export const currentEpoch = () => epoch;

export function wait(ms, ep = epoch) {
  return new Promise((res) => setTimeout(() => res(ep === epoch), ms));
}

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  || new URLSearchParams(location.search).has('reduced');

// ---------------------------------------------------------------- transmission
let txSeq = 0;

/**
 * Plays Mission Control lines one after another.
 * lines: [{ k: 'tx2' } | { text, sub }], each optionally { hold: ms, from: 'CONTROL' }
 */
export async function transmit(lines, { from = 'GEO CONTROL · CH 2' } = {}) {
  const ep = epoch; const seq = ++txSeq;
  els.tx.hidden = false;
  els.tx.innerHTML = `<div class="tx"><div class="tx-head"><span class="tx-wave"><i></i><i></i><i></i><i></i></span><span class="tx-from"></span></div><div class="tx-line"></div><div class="tx-sub"></div></div>`;
  const box = els.tx.firstElementChild;
  const line = box.querySelector('.tx-line');
  const sub = box.querySelector('.tx-sub');
  box.querySelector('.tx-from').textContent = from;
  sub.style.cssText = 'font-size:12px;color:var(--ink-3);margin-top:4px;min-height:1.2em;';
  requestAnimationFrame(() => box.classList.add('is-in'));
  audio.radioIn();
  if (!(await wait(380, ep))) return false;

  for (const item of lines) {
    const text = item.k ? t(item.k) : item.text;
    const subtitle = item.k ? t(item.k + 's') : item.sub || '';
    const speed = reduced() ? 0 : 26;
    audio.radioChatter(Math.min(3.5, text.length * 0.045));
    sub.textContent = '';
    if (speed) {
      for (let i = 1; i <= text.length; i++) {
        if (seq !== txSeq || ep !== epoch) return false;
        line.innerHTML = '';
        line.append(text.slice(0, i));
        const c = document.createElement('span'); c.className = 'caret'; line.append(c);
        await new Promise((r) => setTimeout(r, speed));
      }
    }
    line.textContent = text;
    sub.textContent = subtitle && subtitle !== item.k + 's' ? subtitle : '';
    if (!(await wait(item.hold ?? Math.max(1600, text.length * 42), ep))) return false;
    if (seq !== txSeq) return false;
  }
  audio.radioOut();
  return true;
}

export function clearTransmission() {
  txSeq++;
  const box = els.tx.firstElementChild;
  if (box) { box.classList.remove('is-in'); setTimeout(() => { if (!box.classList.contains('is-in')) els.tx.hidden = true; }, 500); }
}

// ---------------------------------------------------------------- panel
export function showPanel(html, bind) {
  const p = els.panel;
  p.classList.remove('is-in');
  p.hidden = false;
  p.innerHTML = html;
  p.querySelectorAll('button').forEach((b) => {
    b.addEventListener('pointerenter', () => audio.play('hover'));
  });
  bind?.(p);
  requestAnimationFrame(() => requestAnimationFrame(() => p.classList.add('is-in')));
  return p;
}

export function hidePanel() {
  const p = els.panel; p.classList.remove('is-in');
  setTimeout(() => { if (!p.classList.contains('is-in')) p.hidden = true; }, 600);
}

export function checkItem(id, label, state = 'idle', stateLabel = '') {
  return `<li><button class="check ${state === 'done' ? 'is-done' : ''} ${state === 'locked' ? 'is-locked' : ''}" type="button" data-id="${id}" ${state === 'done' ? 'disabled' : ''}>
    <span class="check-box" aria-hidden="true"></span><span>${label}</span><span class="check-state">${stateLabel}</span></button></li>`;
}

export function setCheckState(btn, state, stateLabel = '') {
  btn.classList.toggle('is-busy', state === 'busy');
  btn.classList.toggle('is-done', state === 'done');
  btn.classList.toggle('is-locked', state === 'locked');
  btn.disabled = state === 'done' || state === 'busy';
  btn.querySelector('.check-state').textContent = stateLabel;
}

// ---------------------------------------------------------------- titles
export function showTitle(html) {
  els.title.hidden = false;
  els.title.innerHTML = html;
  els.title.style.opacity = 0;
  els.title.style.transition = 'opacity 1.2s ease';
  requestAnimationFrame(() => requestAnimationFrame(() => { els.title.style.opacity = 1; }));
  return els.title;
}
export function hideTitle() {
  els.title.style.opacity = 0;
  setTimeout(() => { els.title.hidden = true; }, 1200);
}

// ---------------------------------------------------------------- fades
export function fadeTo(opacity, ms = 1200) {
  els.fade.style.transition = `opacity ${reduced() ? 200 : ms}ms ease`;
  els.fade.style.opacity = opacity;
  return new Promise((r) => setTimeout(r, reduced() ? 220 : ms));
}

export function flash(ms = 900) {
  els.flash.style.transition = 'none';
  els.flash.style.opacity = reduced() ? 0.25 : 0.85;
  requestAnimationFrame(() => {
    els.flash.style.transition = `opacity ${ms}ms ease-out`;
    els.flash.style.opacity = 0;
  });
}

// ---------------------------------------------------------------- rail + label
export function buildRail() {
  els.rail.innerHTML = SCENES.map((s) =>
    `<div class="rail-step" data-scene="${s.id}"><i></i><span>${s.n} · ${t('scene_' + s.id)}</span></div>`).join('');
}

export function setSceneChrome(id) {
  const idx = SCENES.findIndex((s) => s.id === id);
  els.rail.querySelectorAll('.rail-step').forEach((el, i) => {
    el.classList.toggle('is-active', i === idx);
    el.classList.toggle('is-done', i < idx);
  });
  const s = SCENES[idx];
  if (s) els.label.innerHTML = `<b>${s.n}</b>${t('scene_' + s.id)}`;
}

// ---------------------------------------------------------------- countdown
export function showCount(n) {
  const el = document.getElementById('count');
  el.hidden = false;
  el.innerHTML = `<span>${t('countdown')}</span><b>${String(n).padStart(2, '0')}</b>`;
  el.classList.toggle('is-final', n <= 3);
  requestAnimationFrame(() => el.classList.add('is-in'));
}
export function hideCount() {
  const el = document.getElementById('count');
  el.classList.remove('is-in');
  setTimeout(() => { el.hidden = true; }, 700);
}
