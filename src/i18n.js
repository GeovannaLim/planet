// UI strings. Each language is complete on its own: radio lines, headers and
// the text on the briefing screen are all translated. The `…s` subtitle keys
// stay empty (kept so voice-over can later show a translation under the line).

const STRINGS = {
  pt: {
    gateBy: 'BY GEØ.IA',
    gateTagline: 'Olhos · Inteligência · Ação',
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

    scene_briefing: 'Briefing da missão',
    r_kicker: 'Etapa 1 · Centro de preparação',
    r_title: 'Transmissão recebida',
    r_text: 'A Central de Missão está transmitindo seu briefing. Confirme para seguir ao embarque.',
    r_confirm: 'Confirmar missão',
    tx1: 'CENTRAL DE MISSÃO — SINAL ESTABELECIDO', tx1s: '',
    tx2: 'Boa noite, comandante. Aqui é a Central GEO.', tx2s: '',
    tx3: 'Sua missão: explorar análogos planetários.', tx3s: '',
    tx4: 'Terrenos na Terra que espelham a Lua e Marte. Confirme quando estiver pronto.', tx4s: '',
    tx5: 'Entendido, comandante. Siga para a nave.', tx5s: '',
    scene_boarding: 'Embarque',
    scene_cockpit: 'Cockpit',
    scene_launch: 'Lançamento',

    b_kicker: 'Etapa 2 · Embarque',
    b_title: 'Escotilha aberta',
    b_board: 'Embarcar',
    b_tx1: 'GEO-1, aqui é o líder da plataforma. Nave pronta para o embarque.', b_tx1s: '',

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
    c_tx1: 'Central GEO, aqui é a GEO-1. Teste de rádio.', c_tx1s: '',
    c_tx2: 'GEO-1, aqui é a Central GEO. Recebendo alto e claro. Liberados para lançamento.', c_tx2s: '',

    l_kicker: 'Etapa 4 · Lançamento',
    l_title: 'Liberado para lançamento',
    l_button: 'Lançar',
    l_tx1: 'Comandante, o lançamento é seu.', l_tx1s: '',
    l_tx2: 'Contagem final. Início da sequência de ignição.', l_tx2s: '',
    l_tx3: 'Decolagem. Temos decolagem.', l_tx3s: '',
    l_tx4: 'Pressão dinâmica máxima. Veículo estável.', l_tx4s: '',

    e_title: 'Missão iniciada',
    e_sub: 'Sua exploração começa agora.',
    e_subs: '',
    e_enter_moon: 'Entrar na plataforma · Lua',
    e_enter_mars: 'Entrar na plataforma · Marte',

    countdown: 'T-menos',

    from_control: 'CENTRAL GEO · CANAL 2',
    from_pad: 'LÍDER DA PLATAFORMA · CANAL 4',
    from_cmdr: 'GEO-1 · COMANDANTE',

    scr_acquiring: 'BUSCANDO SINAL',
    scr_control: 'CENTRAL DE MISSÃO',
    scr_signal: '— SINAL ESTABELECIDO',
    scr_earth: 'TERRA', scr_moon: 'LUA', scr_mars: 'MARTE',
    scr_brief: 'BRIEFING DA MISSÃO',
    scr_objective: 'OBJETIVO', scr_objective_v: 'ANÁLOGOS PLANETÁRIOS',
    scr_sites: 'LOCAIS', scr_sites_v: 'TERRA · LUA · MARTE',
    scr_crew: 'TRIPULAÇÃO', scr_crew_v: '01 · COMANDANTE',
    scr_vehicle: 'VEÍCULO', scr_vehicle_v: 'GEO-1 · PLATAFORMA 39',
    scr_ack: 'TRIPULAÇÃO CONFIRMOU',
    scr_await: 'AGUARDANDO TRIPULAÇÃO',
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

    from_control: 'GEO CONTROL · CH 2',
    from_pad: 'PAD LEADER · CH 4',
    from_cmdr: 'GEO-1 · CMDR',

    scr_acquiring: 'ACQUIRING SIGNAL',
    scr_control: 'MISSION CONTROL',
    scr_signal: '— SIGNAL ESTABLISHED',
    scr_earth: 'EARTH', scr_moon: 'MOON', scr_mars: 'MARS',
    scr_brief: 'MISSION BRIEF',
    scr_objective: 'OBJECTIVE', scr_objective_v: 'PLANETARY ANALOGUES',
    scr_sites: 'SITES', scr_sites_v: 'EARTH · MOON · MARS',
    scr_crew: 'CREW', scr_crew_v: '01 · COMMANDER',
    scr_vehicle: 'VEHICLE', scr_vehicle_v: 'GEO-1 · PAD 39',
    scr_ack: 'CREW ACKNOWLEDGED',
    scr_await: 'AWAITING CREW ACK',
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
