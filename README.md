# GEO.AI — Mission Launch (introdução cinematográfica)

Camada pública de entrada da plataforma GEO.AI, em primeira pessoa e em quatro
etapas (≈60–75 s): briefing no centro de preparação, embarque na nave,
preparação no cockpit e lançamento, que termina direto na plataforma científica existente.

A plataforma (`https://geoai-interplanetary.goskip.app`) **não é modificada**.
A introdução só navega para as rotas reais encontradas na inspeção:

| Rota da plataforma | Uso |
|---|---|
| `/` | landing atual (o "Iniciar" leva para `/mars`) |
| `/moon` | visualizador 3D da Lua |
| `/mars` | visualizador 3D de Marte (destino padrão, igual ao "Iniciar" atual) |

O destino final depende da escolha do visitante no computador de navegação
(Etapa 2). Tudo isso fica em [`src/config.js`](src/config.js).

## Rodar localmente

Não há build. São ES modules puros com Three.js e GSAP via CDN (versões fixas no
import map do `index.html`).

```bash
python3 -m http.server 5178
```

Abra http://localhost:5178. Para pular etapas na revisão: `?scene=boarding` ou `?scene=cockpit`
`&debug` expõe `window.__stage` no console; `?reduced` força o modo de movimento reduzido.

## Integração com o Skip

O código da landing hospedada no Skip não estava neste computador, então a
introdução foi construída como módulo estático autocontido. Duas opções:

1. **Hospedar esta pasta** (Vercel, Netlify, Cloudflare Pages, GitHub Pages ou
   um subdomínio como `mission.geoai…`) e apontar o botão "Iniciar" da landing
   atual para ela. O fim da missão volta para `/moon` ou `/mars`.
2. **Incorporar no projeto do Skip**: copiar `index.html`, `styles.css`, `src/`,
   `assets/` e `audio/` para a pasta pública do app e servir em uma rota
   (ex.: `/mission`). Como é JS puro, não depende do framework do app.

## Estrutura

```
index.html                gate, overlays, HUD (DOM acessível) e import map
styles.css                identidade visual (Chakra Petch + Poppins, grafite, dourado)
src/config.js             rotas da plataforma, etapas e qualidade por dispositivo
src/i18n.js               textos PT / EN (rádio em inglês com legenda em PT)
src/audio.js              motor de áudio sintetizado + substituição por arquivos
src/hud.js                transmissões com legenda, painéis, contagem, fades, trilha de progresso
src/stage.js              renderer, sombras, bloom, câmera (balanço e tremor), cliques em 3D
src/util.js               texturas procedurais, peças chanfradas, painéis serigrafados, bancos de chaves
src/scenes/exterior.js    plataforma compartilhada: céu/Terra, torre, braço de acesso, vapor, holofotes, nuvens, exaustão
src/scenes/briefing.js    Etapa 1: corredor de preparação e tela da Central de Missão
src/scenes/boarding.js    Etapa 2: cápsula, módulo de serviço e foguete detalhados; escotilha
src/scenes/cockpit.js     Etapas 3 e 4: cockpit e lançamento (carregado sob demanda)
```

## Etapas

| Etapa | Duração | O que acontece |
|---|---|---|
| 1 · Mission Briefing | ≈15 s | Corredor de preparação com feixes de luz e poeira; a tela da Central mostra globo, trajetórias para Lua e Marte e "AWAITING CREW ACK". Transmissão "MISSION CONTROL — SIGNAL ESTABLISHED / Your mission: Explore planetary analogues." com legenda. Um clique (botão ou na tela) confirma; a tela recolhe, a escotilha do fim do corredor abre para a luz e o visitante atravessa. |
| 2 · Embarque | ≈10 s | Aproximação pelo braço de acesso ao entardecer até a cápsula GEO-1, com escudo térmico, emendas e rebites, pintura, propulsores RCS, módulo de serviço com radiadores e painéis solares, foguete com gelo e umbilicais, sombras reais. A escotilha abre sozinha e a luz da cabine se espalha; um clique (botão ou na escotilha) embarca. |
| 3 · Cockpit | ≈20 s | Um único comando ("Iniciar sistemas" ou a chave MASTER POWER protegida) aciona tudo: luzes de teto, olhar para o painel superior com disjuntores, chaves virando em ondas, painéis com iluminação integral, telas inicializando, ponteiros dos manômetros, alinhamento da IMU, link de rádio com a Central e o braço de acesso se afastando visto pela janela. Destino Lua ou Marte opcional. |
| 4 · Lançamento | ≈15 s | A tampa do controle abre; "Lançar" (botão ou no pedestal) inicia T-5. Ignição com flash, exaustão subindo pela janela, luz dos motores, tremor, nuvens, transição para o espaço com a Terra; fade direto para a plataforma. |

## Acessibilidade e desempenho

- Áudio desligado até o visitante escolher "Iniciar com áudio"; botão de som sempre visível.
- "Pular introdução" sempre visível; o gate também tem "Ir direto para a plataforma".
- Todas as ações existem como `<button>` (teclado e leitor de tela); os controles 3D chamam as mesmas ações.
- Transmissões com texto e legenda (`aria-live`).
- `prefers-reduced-motion`: sem aproximação, balanço ou tremor; sequências encurtadas (todo o fluxo em poucos segundos).
- Dispositivos modestos: sem bloom nem sombras, menos partículas, pixel ratio limitado.
- Sem WebGL 2: tela de fallback com link direto para a plataforma.
- O cockpit é carregado sob demanda enquanto o visitante está no gate/briefing.

## Assets

Nenhum asset externo além dos logotipos GEO.AI do guia de identidade
(`assets/logo-white.png` na interface, `assets/logo-dark.png` pintado na cápsula) e das fontes Google. Ambientes, telas e decalques são gerados por
código. Áudio: ver [`audio/README.md`](audio/README.md).
