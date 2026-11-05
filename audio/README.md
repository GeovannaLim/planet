# Áudio — GEO.AI Mission Launch

**Status atual:** nenhum arquivo de áudio está incluído. Todo o som que você ouve
hoje é **sintetizado em tempo real** (Web Audio API) por `src/audio.js`:
trilha ambiente em acordes, ruído de sala, zumbido do cockpit, tons "Quindar"
de rádio (estilo NASA), chiado de canal aberto, cliques, servos, porta, ignição e
ronco do motor. É material original, sem questões de licença.

Os arquivos abaixo são **opcionais**: quando um deles existir, ele substitui a versão
sintetizada daquela pista específica. As outras continuam sintetizadas.

## Como adicionar um arquivo

1. Coloque o arquivo nesta pasta (`audio/`).
2. Em `src/audio.js`, no objeto `AUDIO_FILES`, troque `null` pelo caminho,
   por exemplo `music: 'audio/music.mp3'`.
3. Recarregue. Se o arquivo não carregar, o console mostra um aviso e a versão
   sintetizada continua tocando.

## Arquivos esperados

| Chave           | Sugestão de arquivo        | Tipo     | Descrição |
|-----------------|----------------------------|----------|-----------|
| `music`         | `audio/music.mp3`          | loop     | Trilha instrumental cinematográfica espacial, 2–4 min, sem percussão marcada no início. A intensidade é controlada por volume e filtro passa-baixa conforme a cena. |
| `amb_pad`       | `audio/amb_pad.mp3`        | loop     | Ambiente da plataforma de lançamento (vento, venting criogênico, bombas). |
| `amb_cockpit`   | `audio/amb_cockpit.mp3`    | loop     | Ventoinhas e zumbido elétrico do cockpit. |
| `engine`        | `audio/engine.mp3`         | loop     | Ronco contínuo de motor de foguete (o volume sobe do T-3 ao lançamento). |
| `ignition`      | `audio/ignition.mp3`       | one-shot | Impacto da ignição no T-0. |
| `radio_in`      | `audio/radio_in.mp3`       | one-shot | Abertura de transmissão (tom Quindar 2525 Hz + estática). |
| `radio_out`     | `audio/radio_out.mp3`      | one-shot | Fechamento de transmissão (tom 2475 Hz). |
| `ui_click`      | `audio/ui_click.mp3`       | one-shot | Clique de controle. |
| `ui_confirm`    | `audio/ui_confirm.mp3`     | one-shot | Confirmação de etapa concluída. |
| `power_up`      | `audio/power_up.mp3`       | one-shot | Energização do barramento principal. |
| `door`          | `audio/door.mp3`           | one-shot | Abertura da escotilha (~3 s). |
| `servo`         | `audio/servo.mp3`          | one-shot | Chave / servo / retração do braço de acesso. |

**Vozes (não implementadas):** as transmissões da Central são exibidas como texto
com legenda. Se quiser locução, grave as falas listadas em `src/i18n.js`
(chaves `b_tx1`, `c_tx1`, `c_tx2`, `l_tx1`…`l_tx4`) com um efeito de rádio; a reprodução por fala ainda
precisa ser ligada no `hud.transmit`.

## Licenciamento

Use somente áudio com licença que permita uso comercial em site (ex.: trilha
encomendada, bibliotecas royalty-free com licença registrada, Creative Commons
CC0/CC-BY com atribuição). Não use músicas comerciais. Registre a origem e a
licença de cada arquivo nesta tabela quando adicioná-lo.
