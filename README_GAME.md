# 🎮 Aventura Quiz 2D — Documentação do novo modo

Novo modo de jogo de **plataforma 2D side-scrolling** adicionado ao Quiz SAGRIMA.
O quiz original (Clássico, Infantil, Piscicultura) continua **100% intacto** —
este modo é apenas uma adição.

---

## Como rodar

```bash
pip install -r requirements.txt
python run.py            # ou: flask --app app run
```

Abra `http://127.0.0.1:5000`, faça login com um código de acesso e clique em
**🎮 Aventura Quiz 2D**. URLs diretas:

```
/game                                  → tema padrão do seu nível de acesso
/game?modo=piscicultura                → escolhe o banco de perguntas
/game?modo=classico&dificuldade=facil  → facil | normal | dificil
```

O Phaser 3.90 está **vendorizado** em `static/js/vendor/phaser.min.js`
(funciona offline e dentro do pacote PyInstaller, sem CDN).

## Como jogar

| Tecla | Ação |
|---|---|
| ← → ou A/D | andar |
| SHIFT | correr |
| ESPAÇO / ↑ / W | pular |
| 1-4 ou A-D | escolher resposta |
| ENTER | confirmar / continuar |

Toque em telas touch: botões ◀ ▶ ⤒ aparecem automaticamente.

**Loop:** ande até a placa ❓ → a pergunta abre → responda.
Acertou: avança, ganha pontos e empurra o **Redemoinho** para trás.
Errou: recua, perde pontos, o Redemoinho se aproxima e a explicação aparece (quando existir no `.txt`).
O Redemoinho é o **timer visual**: enquanto a pergunta está aberta ele avança e
alcança o jogador em exatamente `answer_time_limit` segundos → perde 1 vida.
Chegue à bandeira 🏁 com todas as perguntas respondidas para vencer.

---

## Arquitetura

### Backend (Flask) — só adições em `app.py`

| Rota | Função |
|---|---|
| `GET /game` | página do jogo (valida nível de acesso e modo) |
| `GET /api/game/questions?modo=&dificuldade=` | sorteia perguntas, embaralha opções, **guarda o gabarito na sessão** e devolve JSON *sem* a resposta correta |
| `POST /api/game/answer` | valida `{question_index, option_id, time_taken}` no servidor; devolve gabarito, explicação e pontos. `option_id: "TIMEOUT"` = tempo esgotado. Anti-replay: cada pergunta só pode ser respondida uma vez |
| `POST /api/game/finish` | aplica bônus de vitória/vidas e salva no ranking reutilizando `carregar_placar`/`salvar_placar` com modo `game_<tema>` → ranking visível em `/placar/game_classico` etc. |

Funções reutilizadas sem alteração: `carregar_perguntas` (mesmos `.txt`,
incluindo `explicacao:`), `carregar_config`, `carregar_placar`, `salvar_placar`
e a rota `exibir_placar`.

### Configuração de pontuação/dificuldade

Edite `GAME_CONFIG` no fim de `app.py`:

```python
GAME_CONFIG = {
  "normal":  { correct_points: 100, fast_bonus: 50, fast_threshold: 7,
               wrong_penalty: 25, level_complete_bonus: 500, life_bonus: 100,
               lives: 3, threat_speed: 1.0, answer_time_limit: 15,
               questions_per_level: None },   # None = usa config.json
  "facil":   { lives: 5, threat_speed: 0.6, answer_time_limit: 25, wrong_penalty: 0 },
  "dificil": { lives: 2, threat_speed: 1.5, answer_time_limit: 10, wrong_penalty: 50 },
}
```

### Frontend (Phaser 3, ES modules)

```
static/js/game/
├─ main.js                  config do Phaser + PLAYER_SHEET (mapa de animações)
├─ scenes/
│  ├─ BootScene.js          inicialização
│  ├─ PreloadScene.js       carrega assets + busca perguntas no Flask
│  ├─ MenuScene.js          título e instruções
│  ├─ GameScene.js          mundo, jogador, ameaça, checkpoints, HUD
│  ├─ QuestionScene.js      painel de pergunta (overlay sobre o jogo)
│  └─ ResultScene.js        vitória/derrota + salvar no ranking
└─ systems/
   ├─ QuizManager.js        comunicação com a API Flask
   ├─ PlayerController.js   sprite, animações, input
   ├─ ThreatController.js   o Redemoinho (timer visual)
   ├─ ScoreManager.js       pontos, vidas
   └─ ProgressManager.js    progresso 0–100%
```

---

## 🧍 Sistema de sprites do personagem

### Arquivo e grade

`static/img/player/player_spritesheet.png`
**Frames de 48×64 px**, grade fixa de **6 colunas × 11 linhas**.
Índice de frame no Phaser = `linha * 6 + coluna`.

48×64 foi escolhido (em vez de 32×48) porque a identidade do personagem da
referência `Pablo.png` depende de detalhes — careca, gola da polo vermelha,
expressões faciais — que ficam ilegíveis abaixo dessa resolução; e ainda é
pequeno o suficiente para animar rápido e manter leitura "fofa" estilo
Stardew/Graveyard Keeper. O placeholder atual é desenhado numa grade lógica de
24×32 com "fat pixels" 2×2 (pixel art autêntica, sem anti-alias).

### Linhas do spritesheet (1 animação por linha)

| Linha | Animação | Frames | FPS | Loop |
|---|---|---|---|---|
| 0 | idle | 4 | 5 | sim |
| 1 | walk | 6 | 9 | sim |
| 2 | run | 6 | 13 | sim |
| 3 | jump | 2 | 6 | não |
| 4 | fall | 2 | 6 | sim |
| 5 | correct (comemoração) | 4 | 8 | 2× |
| 6 | wrong (reação de erro) | 4 | 8 | 2× |
| 7 | stumble (tropeço) | 4 | 10 | não |
| 8 | scared (assustado) | 4 | 8 | sim |
| 9 | victory | 4 | 6 | sim |
| 10 | game_over | 4 | 4 | não |

Frames sobrando numa linha (até a 6ª coluna) ficam vazios/transparentes.

### Como o Phaser carrega

```js
// PreloadScene.js
this.load.spritesheet('player', 'img/player/player_spritesheet.png',
                      { frameWidth: 48, frameHeight: 64 });

// PlayerController.js gera as animações a partir de PLAYER_SHEET (main.js):
anims.create({ key: 'p_walk',
  frames: anims.generateFrameNumbers('player', { start: 1*6, end: 1*6+5 }),
  frameRate: 9, repeat: -1 });
```

### Como substituir o placeholder pelo personagem final

1. Desenhe os frames do personagem (base: `static/img/Pablo.png` — careca,
   polo vermelha, calça cinza, sapato marrom) em **48×64 px**, voltado para a
   **direita**, pés encostando na borda inferior do frame (o jogo espelha
   automaticamente para a esquerda com `setFlipX`).
2. Monte a folha na mesma grade 6×11 respeitando a tabela acima
   (Aseprite/Piskel/LibreSprite exportam spritesheet em grade facilmente).
3. Sobrescreva `static/img/player/player_spritesheet.png`. **Pronto** — nenhum
   código muda.
4. Se mudar o tamanho do frame ou a quantidade de frames, ajuste apenas o
   objeto `PLAYER_SHEET` em `static/js/game/main.js` (frameWidth/Height,
   columns e `frames`/`rate` por animação) e, se preciso, o hitbox em
   `PlayerController` (`body.setSize(28, 58).setOffset(10, 6)`).
5. Convenção alternativa por pastas (`static/img/player/walk/walk_000.png` …):
   suportada trocando o `load.spritesheet` por vários `load.image` +
   `anims.create` com frames nomeados — a estrutura de pastas já está prevista,
   mas a folha única é a recomendada (1 request, atlas mais simples).
6. Os placeholders podem ser regenerados a qualquer momento:
   `python tools/generate_game_assets.py`.

### Ameaça (Redemoinho)

`static/img/enemies/threat_spritesheet.png` — 4 frames de 64×64, loop de giro.
Para trocar por outra ameaça (nuvem escura, enxame, fardo de feno rolante…),
basta sobrescrever o arquivo mantendo 4 frames 64×64, ou ajustar o
`load.spritesheet('threat', …)` no Preload e a animação `threat_spin` no
`ThreatController`.

### Demais assets (todos placeholders regeneráveis)

```
static/img/tiles/   ground.png (32×32) · platform.png (32×16) · sign.png (32×40) · finish_flag.png (48×64)
static/img/ui/      heart.png · coin.png · star.png (16×16)
static/img/decor/   tree.png · cloud.png · crop.png · fence.png · hill.png
```

---

## Formato das perguntas (inalterado)

O jogo lê os mesmos `.txt` do quiz (`perguntas.txt`, `perguntas_infantil.txt`,
`perguntas_piscicultura.txt`): blocos separados por `---`, resposta correta
prefixada com `*`, linha opcional `explicacao:`. O Flask converte para o JSON
do jogo em `/api/game/questions`:

```json
{ "id": 0,
  "question": "…",
  "options": [{"id": "A", "text": "…"}, …],
  "theme": "piscicultura", "difficulty": "normal" }
```

O campo `correct_option`/`explanation` **nunca** vai ao cliente junto com a
pergunta — só volta na resposta de `/api/game/answer`, o que impede trapaça
pelo console do navegador.

## Arquivos novos × modificados

**Modificados (mínimo possível):**
- `app.py` — `jsonify` no import + bloco novo no final (rotas/config do jogo)
- `templates/home.html` — apenas o botão "Aventura Quiz 2D" na grade de modos

**Novos:** `templates/game.html`, `static/css/game.css`,
`static/js/vendor/phaser.min.js`, `static/js/game/**` (11 módulos),
`static/img/{player,enemies,tiles,ui,decor}/**`, `tools/generate_game_assets.py`.

## Limitações conhecidas / próximos passos

- As perguntas ficam na **sessão Flask** (filesystem) — igual ao quiz atual;
  ok para uso local/quiosque, revisar se for publicar com múltiplos workers.
- Pulo existe mas a fase 1 é plana; plataformas (`platform.png`) já carregadas
  para fases futuras com verticalidade.
- Sem áudio ainda (estrutura de Preload pronta para `this.load.audio`).
- Ideias já previstas pela arquitetura: múltiplas fases/mundos (lista de
  configs de fase na GameScene), chefes por tema, seletor de dificuldade na
  MenuScene (`?dificuldade=` já funciona), moedas colecionáveis
  (`coin.png` + overlap), conquistas, ranking por dificuldade
  (`game_<modo>_<dif>`), seleção de perguntas pelo professor (tela de
  configuração já existe no projeto).
