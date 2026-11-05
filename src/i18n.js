// UI strings. Mission Control radio lines stay in English in both languages
// (as in real mission comms); the subtitle shows the translation underneath.

const STRINGS = {
  pt: {
    gateBy: 'BY GEØ.IA',
    gateTagline: 'Eyes · Intelligence · Action',
    gateHint: 'Cerca de um minuto e meio, em primeira pessoa. Recomendado com fones de ouvido.',
    loading: 'Preparando a plataforma de lançamento',
    ready: 'Nave pronta',
    startWithAudio: 'Iniciar missão com áudio',
    startSilent: 'Iniciar sem áudio',
    skipToPlatform: 'Ir direto para a plataforma',
    skip: 'Pular introdução',
    skipShort: 'Pular',
    audioOn: 'Som ligado',
    audioShort: 'Som',
    audioOff: 'Som desligado',
    fallbackText: 'Seu navegador não conseguiu iniciar o WebGL, necessário para a introdução da missão. A plataforma continua disponível.',

    scene_briefing: 'Mission Briefing',
    r_kicker: 'Etapa 1 · Centro de preparação',
    r_title: 'Transmissão recebida',
    r_text: 'A Central de Missão está transmitindo seu briefing. Confirme para seguir ao embarque.',
    r_confirm: 'Confirmar missão',
    tx1: 'MISSION CONTROL — SIGNAL ESTABLISHED',
    tx1s: 'Central de Missão — sinal estabelecido',
    tx2: 'Good evening, commander. This is GEO Control.',
    tx2s: 'Boa noite, comandante. Aqui é a Central GEO.',
    tx3: 'Your mission: Explore planetary analogues.',
    tx3s: 'Sua missão: explorar análogos planetários.',
    tx4: 'Terrain on Earth that mirrors the Moon and Mars. Confirm when ready.',
    tx4s: 'Terrenos na Terra que espelham a Lua e Marte. Confirme quando estiver pronto.',
    tx5: 'Copy that, commander. Proceed to the vehicle.',
    tx5s: 'Entendido, comandante. Siga para a nave.',
    scene_boarding: 'Embarque',
    scene_cockpit: 'Cockpit',
    scene_launch: 'Lançamento',

    b_kicker: 'Etapa 2 · Embarque',
    b_title: 'Escotilha aberta',
    b_board: 'Embarcar',
    b_tx1: 'GEO-1, Pad Leader. Vehicle is ready for crew ingress.',
    b_tx1s: 'GEO-1, aqui é o líder da plataforma. Nave pronta para o embarque.',

    c_kicker: 'Etapa 3 · Cockpit',
    c_title: 'Preparar a nave',
    c_prepare: 'Iniciar sistemas',
    c_running: 'Sistemas em inicialização',
    c_dest: 'Destino',
    c_moon: 'Lua',
    c_mars: 'Marte',
    c_s_power: 'Energia principal',
    c_s_nav: 'Navegação',
    c_s_comms: 'Comunicação',
    c_s_arm: 'Braço de acesso',
    c_tx1: 'GEO Control, GEO-1. Radio check.',
    c_tx1s: 'Central GEO, aqui é a GEO-1. Teste de rádio.',
    c_tx2: 'GEO-1, GEO Control. Loud and clear. You are go for launch.',
    c_tx2s: 'GEO-1, aqui é a Central GEO. Recebendo bem. Liberados para lançamento.',

    l_kicker: 'Etapa 4 · Lançamento',
    l_title: 'Liberado para lançamento',
    l_button: 'Lançar',
    l_tx1: 'Commander, the launch is yours.',
    l_tx1s: 'Comandante, o lançamento é seu.',
    l_tx2: 'Terminal count. Ignition sequence start.',
    l_tx2s: 'Contagem final. Início da sequência de ignição.',
    l_tx3: 'Liftoff. We have liftoff.',
    l_tx3s: 'Decolagem. Temos decolagem.',
    l_tx4: 'Max Q. Vehicle is stable.',
    l_tx4s: 'Pressão dinâmica máxima. Veículo estável.',

    e_title: 'Mission initialized',
    e_sub: 'Your exploration begins now.',
    e_subs: 'Sua exploração começa agora.',
    e_enter_moon: 'Entrar na plataforma · Lua',
    e_enter_mars: 'Entrar na plataforma · Marte',

    countdown: 'T-menos',
  },
  en: {
    gateBy: 'BY GEØ.IA',
    gateTagline: 'Eyes · Intelligence · Action',
    gateHint: 'About a minute and a half, in first person. Headphones recommended.',
    loading: 'Preparing the launch pad',
    ready: 'Vehicle ready',
    startWithAudio: 'Start mission with sound',
    startSilent: 'Start without sound',
    skipToPlatform: 'Go straight to the platform',
    skip: 'Skip intro',
    skipShort: 'Skip',
    audioOn: 'Sound on',
    audioShort: 'Sound',
    audioOff: 'Sound off',
    fallbackText: 'Your browser could not start WebGL, which the mission intro needs. The platform is still available.',

    scene_briefing: 'Mission Briefing',
    r_kicker: 'Stage 1 · Preparation facility',
    r_title: 'Transmission received',
    r_text: 'Mission Control is transmitting your briefing. Confirm to proceed to boarding.',
    r_confirm: 'Confirm mission',
    tx1: 'MISSION CONTROL — SIGNAL ESTABLISHED', tx1s: '',
    tx2: 'Good evening, commander. This is GEO Control.', tx2s: '',
    tx3: 'Your mission: Explore planetary analogues.', tx3s: '',
    tx4: 'Terrain on Earth that mirrors the Moon and Mars. Confirm when ready.', tx4s: '',
    tx5: 'Copy that, commander. Proceed to the vehicle.', tx5s: '',
    scene_boarding: 'Boarding',
    scene_cockpit: 'Cockpit',
    scene_launch: 'Launch',

    b_kicker: 'Stage 2 · Boarding',
    b_title: 'Hatch open',
    b_board: 'Board',
    b_tx1: 'GEO-1, Pad Leader. Vehicle is ready for crew ingress.', b_tx1s: '',

    c_kicker: 'Stage 3 · Cockpit',
    c_title: 'Prepare the vehicle',
    c_prepare: 'Start systems',
    c_running: 'Systems coming online',
    c_dest: 'Destination',
    c_moon: 'Moon',
    c_mars: 'Mars',
    c_s_power: 'Main power',
    c_s_nav: 'Navigation',
    c_s_comms: 'Comms',
    c_s_arm: 'Access arm',
    c_tx1: 'GEO Control, GEO-1. Radio check.', c_tx1s: '',
    c_tx2: 'GEO-1, GEO Control. Loud and clear. You are go for launch.', c_tx2s: '',

    l_kicker: 'Stage 4 · Launch',
    l_title: 'Cleared for launch',
    l_button: 'Launch',
    l_tx1: 'Commander, the launch is yours.', l_tx1s: '',
    l_tx2: 'Terminal count. Ignition sequence start.', l_tx2s: '',
    l_tx3: 'Liftoff. We have liftoff.', l_tx3s: '',
    l_tx4: 'Max Q. Vehicle is stable.', l_tx4s: '',

    e_title: 'Mission initialized',
    e_sub: 'Your exploration begins now.',
    e_subs: '',
    e_enter_moon: 'Enter the platform · Moon',
    e_enter_mars: 'Enter the platform · Mars',

    countdown: 'T-minus',
  },
};

let lang = (() => {
  try {
    const saved = localStorage.getItem('geo-mission-lang');
    if (saved && STRINGS[saved]) return saved;
  } catch {}
  return (navigator.language || 'pt').toLowerCase().startsWith('pt') ? 'pt' : 'en';
})();

export const t = (key) => STRINGS[lang][key] ?? STRINGS.pt[key] ?? key;
export const getLang = () => lang;

export function setLang(next) {
  if (!STRINGS[next]) return;
  lang = next;
  document.documentElement.lang = next === 'pt' ? 'pt-BR' : 'en';
  try { localStorage.setItem('geo-mission-lang', next); } catch {}
  applyStatic();
}

export function applyStatic(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
}
