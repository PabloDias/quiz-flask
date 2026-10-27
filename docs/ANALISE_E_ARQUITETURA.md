# Análise do Repositório e Arquitetura do Quiz Runner 2D

## 1. Análise do Repositório (quiz-flask)

### Estrutura Atual
```
quiz-flask/
├── app.py                      ← Backend Flask (481 linhas) — JÁ POSSUI rota /game e APIs
├── run.py                      ← Entry point para PyInstaller
├── config.json                 ← Configuração: número de perguntas por partida
├── perguntas.txt               ← Banco de perguntas geral (Agrobalsas 2026)
├── perguntas_infantil.txt      ← Banco de perguntas modo aprendizagem
├── perguntas_piscicultura.txt  ← Banco de perguntas piscicultura
├── placar_psicultura.json      ← Ranking persistido em JSON
├── requirements.txt
├── templates/                  ← Templates Jinja2
│   ├── home.html
│   ├── index.html              ← Tela principal do quiz
│   ├── revisao.html
│   ├── animacao.html
│   ├── resultado.html
│   ├── placar.html
│   └── configuracao.html
├── static/                     ← CSS, JS, imagens
└── configassetszip/            ← Configurações para gerar o .exe
```

### Rotas Existentes (app.py)
| Rota | Método | Descrição |
|------|--------|-----------|
| `/` | GET | Home / login com código de acesso |
| `/login` | POST | Autenticação por código |
| `/logout` | GET | Limpar sessão |
| `/iniciar/<modo>` | GET | Iniciar partida de quiz |
| `/quiz/<id>` | GET | Exibir pergunta |
| `/responder/<id>` | POST | Processar resposta |
| `/revisao/<id>` | GET | Tela de revisão com explicação |
| `/animacao` | GET | Animação de transição |
| `/resultado` | GET | Tela de resultado |
| `/salvar-pontuacao` | POST | Salvar nick + pontos no ranking |
| `/placar/<modo>` | GET | Exibir ranking |
| `/configuracao` | GET | Painel de configurações |
| `/salvar-configuracao` | POST | Salvar config |
| `/limpar-placar` | POST | Apagar ranking de um modo |
| **`/game`** | **GET** | **Página do runner 2D (NOVO — já no código!)** |
| **`/api/game/questions`** | **GET** | **Sortear perguntas para o runner (NOVO)** |
| **`/api/game/answer`** | **POST** | **Validar resposta no runner (NOVO)** |
| **`/api/game/finish`** | **POST** | **Finalizar partida e salvar ranking (NOVO)** |

> **DESCOBERTA IMPORTANTE:** O `app.py` já contém toda a infraestrutura de backend para o runner (rotas `/game`, `/api/game/questions`, `/api/game/answer`, `/api/game/finish` e a `GAME_CONFIG`). O que **FALTA** é apenas o **frontend**: o template `game.html` e os scripts Phaser.js.

### Como as Perguntas Funcionam
**Formato do arquivo .txt:**
```
Texto da pergunta
explicacao: Texto opcional de explicação
*Resposta correta (marcada com asterisco)
Opção errada 2
Opção errada 3
Opção errada 4
---
```

**Função `carregar_perguntas(nome_arquivo)`** retorna lista de dicts:
```python
{
  'pergunta': str,
  'opcoes': [str, str, str, str],   # todas as opções
  'resposta': str,                   # texto da correta (sem *)
  'explicacao': str | None
}
```

**Endpoint `/api/game/questions`** converte isso para JSON público:
```json
{
  "questions": [
    {
      "id": 0,
      "question": "Texto...",
      "options": [
        {"id": "A", "text": "..."},
        {"id": "B", "text": "..."},
        {"id": "C", "text": "..."},
        {"id": "D", "text": "..."}
      ],
      "theme": "classico",
      "difficulty": "normal"
    }
  ],
  "config": { ...GAME_CONFIG... },
  "modo": "classico"
}
```
O gabarito **não é enviado ao cliente** — validação é feita via `/api/game/answer` POST.

### GAME_CONFIG (já definida no app.py)
```python
GAME_CONFIG = {
  "normal": {
    "correct_points": 100,
    "fast_bonus": 50,
    "fast_threshold": 7,     # seg para bônus de velocidade
    "wrong_penalty": 25,
    "level_complete_bonus": 500,
    "life_bonus": 100,
    "lives": 3,
    "threat_speed": 1.0,
    "answer_time_limit": 15, # seg de timer visual (ameaça)
    "questions_per_level": None  # usa config.json
  },
  "facil":   {"lives": 5, "threat_speed": 0.6, "answer_time_limit": 25, "wrong_penalty": 0},
  "dificil": {"lives": 2, "threat_speed": 1.5, "answer_time_limit": 10, "wrong_penalty": 50},
}
```

### Nível de Acesso (session['access_level'])
- `'todos'` → classico + aprendizagem + piscicultura + config
- `'misto'` → classico + aprendizagem
- `'piscicultura'` → só piscicultura

O backend já valida o nível de acesso nas rotas `/game` e `/api/game/*`.

---

## 2. Funções Reaproveitáveis
| Função | Onde está | Uso no Runner |
|--------|-----------|---------------|
| `carregar_perguntas(arquivo)` | app.py | Reutilizada pela rota `/api/game/questions` |
| `carregar_placar(modo)` | app.py | Reutilizada por `/api/game/finish` |
| `salvar_placar(placar, modo)` | app.py | Reutilizada por `/api/game/finish` |
| `resource_path(path)` | app.py | Para compatibilidade com PyInstaller |
| `_game_config(dificuldade)` | app.py | Mescla config normal + dificuldade |
| `_modos_permitidos()` | app.py | Validação de acesso por sessão |

---

## 3. Arquivos a Criar (Frontend)

```
templates/
└── game.html                          ← Template principal do runner

static/
├── css/
│   └── runner.css                     ← Estilos do container do jogo
└── js/
    └── runner/
        ├── main.js                    ← Bootstrap do Phaser + config
        ├── scenes/
        │   ├── BootScene.js           ← Carrega assets iniciais
        │   ├── PreloadScene.js        ← Barra de progresso + carrega tudo
        │   ├── MenuScene.js           ← Tela de início (título, botão jogar)
        │   ├── RunnerScene.js         ← CENA PRINCIPAL do jogo
        │   └── ResultScene.js         ← Vitória / Game Over + salvar ranking
        └── systems/
            ├── QuizManager.js         ← Busca perguntas da API Flask
            ├── PlayerController.js    ← Animações e estado do personagem
            ├── ThreatController.js    ← Controla a ameaça perseguidora
            ├── ScoreManager.js        ← Pontuação, combo, vidas
            └── UIManager.js           ← HUD: score, vidas, barra de progresso
```

---

## 4. Arquivos a Modificar

| Arquivo | Modificação necessária |
|---------|----------------------|
| `app.py` | **NENHUMA** — backend já está completo |
| `templates/home.html` | Adicionar link/botão para o modo Runner no menu |

---

## 5. Recomendação Técnica

### Opção Escolhida: **C — Phaser.js integrado com Flask**

**Justificativa:**
- O backend já fornece uma API JSON limpa (`/api/game/questions`, `/api/game/answer`)
- Phaser 3 tem suporte nativo a: sprite sheets, animações por frames, scrolling de tilemap, câmera, inputs (teclado + touch), física arcade e gerenciamento de cenas
- Não requer build step (pode ser carregado via CDN)
- A sessão Flask autentica o usuário antes de renderizar `game.html`
- Todo o estado sensível (gabarito) fica no servidor

### Estilo de Runner: **Side-scroller** (Opção 1)
O personagem corre automaticamente da esquerda para a direita. O fundo se move. As perguntas aparecem em um painel superior. As respostas são 4 botões grandes clicáveis (teclado 1-4 ou clique). Esta abordagem é mais estável para prototipagem do que o three-lane, e mais adequada para apresentações públicas com projetor.

### Tamanho dos Sprites: **48×64 px por frame**
- Oferece detalhe suficiente para leitura em projetor (pixel art legível)
- Compatível com multiplicadores ×2 ou ×3 no Phaser (96×128 ou 144×192 na tela)
- Padrão comum em jogos de pixel art estilo Stardew Valley

---

## 6. Riscos e Limitações

| Risco | Mitigação |
|-------|-----------|
| Assets `.zip` (modo PyInstaller) não expõe `static/` | Em dev mode, Flask serve normalmente. Para PyInstaller, inclua `game.html` e os JS/CSS no `assets.zip` |
| `SESSION_TYPE = "filesystem"` pode criar arquivos temp | Normal para o projeto; não impacta o runner |
| Sem assets de imagem reais ainda | Usamos Canvas API + Phaser Graphics para placeholders gerados em código |
| `perguntas_por_partida` pode ser 0 ou muito alto | A rota `/api/game/questions` faz `min(n, len(perguntas))` — seguro |

---

## 7. Fluxo do Jogo

```
[home.html] → código de acesso → [/game?modo=classico&dificuldade=normal]
     ↓
[game.html] → Phaser carrega → BootScene → PreloadScene → MenuScene
     ↓
[RunnerScene inicia] → GET /api/game/questions → recebe lista de Qs + config
     ↓
Loop: personagem corre → pergunta aparece → timer visual (ameaça avança)
     ↓ player responde
[POST /api/game/answer] ← {question_index, option_id, time_taken}
     ↓ resposta do servidor: {correct, correct_option, explanation, points_awarded}
     ↓ se correto: animação de acerto, ameaça recua, score +
     ↓ se errado:  animação de tropeço, ameaça avança, life -
     ↓
Quando todas as perguntas respondidas OU vidas = 0:
[ResultScene] → POST /api/game/finish → salva ranking → mostra resultado
```
