// Mission director: gate → 01 briefing corridor → 02 boarding → 03 cockpit
// preparation → 04 launch → hand-off to the GEO.AI platform.
//
// Dev shortcuts: ?scene=boarding|cockpit starts later; &debug exposes window.__stage.

import { detectQuality, platformUrl, DEFAULT_DESTINATION } from './config.js';
import { t, setLang, getLang, applyStatic } from './i18n.js';
import { audio } from './audio.js';
import * as hud from './hud.js';

const $ = (id) => document.getElementById(id);
const mission = { dest: DEFAULT_DESTINATION };
const quality = detectQuality();
const params = new URLSearchParams(location.search);

function goToPlatform() {
  hud.newEpoch();
  location.assign(platformUrl(mission.dest));
}

// ---------------------------------------------------------------- chrome
function refreshChrome() {
  applyStatic();
  $('btn-audio').querySelector('[data-i18n-label]').innerHTML =
    `<span class="lbl-full">${audio.enabled ? t('audioOn') : t('audioOff')}</span><span class="lbl-short">${t('audioShort')}</span>`;
  $('btn-audio').setAttribute('aria-label', audio.enabled ? t('audioOn') : t('audioOff'));
  $('btn-audio').setAttribute('aria-pressed', String(audio.enabled));
  $('btn-skip').innerHTML = `<span class="lbl-full">${t('skip')}</span><span class="lbl-short">${t('skipShort')}</span>`;
  $('gate-skip').href = platformUrl(mission.dest);
  $('fallback-link').href = platformUrl(mission.dest);
  hud.buildRail();
}

function setupChrome() {
  const sel = $('lang');
  sel.value = getLang();
  sel.addEventListener('change', () => { setLang(sel.value); refreshChrome(); });
  $('btn-audio').addEventListener('click', () => audio.toggle());
  audio.onChange(refreshChrome);
  $('btn-skip').addEventListener('click', goToPlatform);
  $('gate-skip').addEventListener('click', (e) => { e.preventDefault(); goToPlatform(); });
  refreshChrome();
}

function showFallback() {
  $('gate').hidden = true;
  $('fallback').hidden = false;
  $('fade').style.opacity = 0;
}

// Loader label is stored as a key so a language switch mid-load re-translates it.
function progress(v, key) {
  $('gate-loader-fill').style.width = `${Math.round(v * 100)}%`;
  if (key) $('gate-loader-text').dataset.i18n = key;
  applyStatic($('gate-loader'));
}

// ---------------------------------------------------------------- boot
async function boot() {
  setupChrome();
  const { webglAvailable, Stage } = await import('./stage.js').catch(() => ({}));
  if (!Stage || !webglAvailable()) return showFallback();
  progress(0.15, 'loading');

  await Promise.race([
    Promise.all([document.fonts.load('500 20px "Chakra Petch"'), document.fonts.load('400 20px "Chakra Petch"')]),
    new Promise((r) => setTimeout(r, 2500)),
  ]);
  progress(0.35);

  let stage;
  try {
    stage = new Stage($('stage'), quality);
  } catch (err) {
    console.error(err);
    return showFallback();
  }
  stage.onContextLost = showFallback;
  if (params.has('debug')) window.__stage = stage;
  progress(0.55);

  const startAt = params.get('scene');
  const { createBriefing } = await import('./scenes/briefing.js');
  progress(0.7);
  stage.setScene(createBriefing(stage));
  // Fetch the later stages while the visitor reads the gate; each is built during
  // the fade to black that precedes it, so construction hitches stay hidden.
  const boardingModule = import('./scenes/boarding.js');
  const cockpitModule = import('./scenes/cockpit.js');
  await Promise.all([boardingModule, cockpitModule]);
  progress(1, 'ready');

  await new Promise((r) => setTimeout(r, 350));
  $('gate-loader').hidden = true;
  $('gate-actions').hidden = false;
  $('btn-start-audio').focus({ preventScroll: true });

  const choice = await new Promise((resolve) => {
    $('btn-start-audio').addEventListener('click', () => resolve(true), { once: true });
    $('btn-start-silent').addEventListener('click', () => resolve(false), { once: true });
  });
  if (choice) await audio.enable().catch((e) => console.warn('[audio] could not start', e));
  refreshChrome();

  $('gate').classList.add('is-out');
  setTimeout(() => { $('gate').hidden = true; }, 1300);
  $('chrome').hidden = false;
  $('rail').hidden = false;

  if (!startAt) await stage.active.run();
  if (startAt !== 'cockpit') {
    const { createBoarding } = await boardingModule;
    const boarding = await createBoarding(stage);
    stage.setScene(boarding);
    await boarding.run();
  }
  const { createCockpit } = await cockpitModule;
  const cockpit = createCockpit(stage, mission);
  stage.setScene(cockpit);
  await cockpit.runPreparation();
  await cockpit.runLaunch();
  await handoff();
}

// ---------------------------------------------------------------- hand-off
// The climb fades straight into the platform: a short title over black, then the
// real route. No extra stage after the launch.
async function handoff() {
  hud.hidePanel(); hud.clearTransmission();
  await hud.fadeTo(1, 1300);
  $('rail').hidden = true;
  const sub = t('e_subs');
  const card = hud.showTitle(`
    <p class="tc-sub">GEO-ANALOG-01 · ${mission.dest === 'moon' ? 'MOON' : 'MARS'}</p>
    <h1>${t('e_title')}</h1>
    <p>${t('e_sub')}</p>
    ${sub ? `<p style="margin-top:6px;color:var(--ink-3);letter-spacing:.08em;text-transform:none;font-family:var(--font-body)">${sub}</p>` : ''}
    <p style="margin-top:28px"><a class="gate-skip" href="${platformUrl(mission.dest)}">${t(mission.dest === 'moon' ? 'e_enter_moon' : 'e_enter_mars')}</a></p>`);
  card.querySelector('a').style.pointerEvents = 'auto';
  await new Promise((r) => setTimeout(r, quality.reducedMotion ? 1200 : 2600));
  audio.setIntensity(0.15);
  hud.hideTitle();
  await new Promise((r) => setTimeout(r, 700));
  goToPlatform();
}

boot();
