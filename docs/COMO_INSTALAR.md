# Como Integrar o Agro Quiz Runner ao Projeto quiz-flask

## Pré-requisitos

O backend Flask já está completo no `app.py` do repositório original.
As rotas `/game`, `/api/game/questions`, `/api/game/answer` e `/api/game/finish`
**já existem** — você não precisa alterar o `app.py`.

---

## Passo 1 — Copiar os Arquivos

Na raiz do seu projeto `quiz-flask`, copie:

```
# Templates
templates/game.html          ← copiar aqui

# CSS
static/css/runner.css        ← criar pasta css se não existir

# JavaScript
static/js/runner/
    main.js
    scenes/
        BootScene.js
        PreloadScene.js
        MenuScene.js
        RunnerScene.js
        ResultScene.js
    systems/
        QuizManager.js
        ScoreManager.js
        PlayerController.js
        ThreatController.js
        UIManager.js
```

---

## Passo 2 — Verificar requirements.txt

O projeto já usa Flask e Flask-Session. Não há novas dependências Python.

```
flask
flask-session
```

---

## Passo 3 — Rodar em Desenvolvimento

```bash
# Na pasta do projeto quiz-flask
python -m venv venv
source venv/bin/activate          # Linux/Mac
# ou: .\venv\Scripts\activate     # Windows

pip install -r requirements.txt

flask --app app run --debug
```

Acesse: `http://127.0.0.1:5000`

1. Entre com o código de acesso (ex: `12345` ou `dias`)
2. Você verá o menu com os modos disponíveis
3. Acesse `/game` ou clique no botão de runner (se adicionado ao home)

---

## Passo 4 — Adicionar Botão no Home (Opcional)

Para adicionar o Runner como opção no menu do home, edite `templates/home.html`.
Procure o bloco onde os modos são listados e adicione algo como:

```html
<!-- Dentro do bloco condicional de acesso -->
{% if session.get('access_level') %}
<a href="{{ url_for('game', modo='classico', dificuldade='normal') }}"
   class="mode-card runner-mode">
  🏃 Agro Quiz Runner
  <small>Modo corrida com perguntas</small>
</a>
{% endif %}
```

---

## Passo 5 — Gerar Versão .exe (PyInstaller)

Como o projeto usa `assets.zip`, inclua os novos arquivos antes de compactar:

1. Adicione à seleção antes de criar o `assets.zip`:
   - `templates/game.html`
   - `static/css/runner.css`
   - `static/js/runner/` (pasta inteira)

2. Crie o `assets.zip` normalmente.

3. Gere o .exe:
   ```bash
   pyinstaller --name="QuizAgro" --windowed --add-data="assets.zip;." run.py
   ```

---

## URLs do Runner

| URL | Descrição |
|-----|-----------|
| `/game` | Jogo com modo e dificuldade padrão |
| `/game?modo=classico&dificuldade=normal` | Modo clássico |
| `/game?modo=piscicultura&dificuldade=dificil` | Piscicultura difícil |
| `/api/game/questions?modo=classico&dificuldade=normal` | JSON das perguntas |
| `/api/game/answer` (POST JSON) | Validar resposta |
| `/api/game/finish` (POST JSON) | Finalizar e salvar |
| `/placar/game_classico` | Ranking do runner clássico |

---

## Controles do Jogo

| Entrada | Ação |
|---------|------|
| Clique / Toque nos botões A/B/C/D | Responder |
| Tecla `1` | Resposta A |
| Tecla `2` | Resposta B |
| Tecla `3` | Resposta C |
| Tecla `4` | Resposta D |

---

## Melhorias Futuras Preparadas no Código

O código já está estruturado para suportar:

| Feature | Como ativar |
|---------|-------------|
| Sprites reais do personagem | Ver SPRITES_GUIDE.md |
| Três pistas (three-lane) | Adicionar `LaneManager.js` e inputs de seta |
| Obstáculos físicos | Usar `arcade physics` já habilitado |
| Sons e música | `this.load.audio()` no PreloadScene |
| Power-ups (escudo, turbo) | Adicionar ao `ScoreManager.js` |
| Dificuldade no menu | Passar como param para MenuScene |
| Mundos diferentes | Novas texturas em `bg_sky`, `bg_hills` |
| Ranking separado por dificuldade | Já funciona via `game_finish` |

---

## Estrutura Completa de Pastas (após integração)

```
quiz-flask/
├── app.py                          ← sem alterações
├── run.py
├── config.json
├── perguntas.txt
├── perguntas_infantil.txt
├── perguntas_piscicultura.txt
├── templates/
│   ├── home.html                   ← opcional: adicionar link runner
│   ├── index.html
│   ├── revisao.html
│   ├── animacao.html
│   ├── resultado.html
│   ├── placar.html
│   ├── configuracao.html
│   └── game.html                   ← NOVO
└── static/
    ├── css/
    │   └── runner.css              ← NOVO
    ├── js/
    │   └── runner/
    │       ├── main.js             ← NOVO
    │       ├── scenes/
    │       │   ├── BootScene.js
    │       │   ├── PreloadScene.js
    │       │   ├── MenuScene.js
    │       │   ├── RunnerScene.js
    │       │   └── ResultScene.js
    │       └── systems/
    │           ├── QuizManager.js
    │           ├── ScoreManager.js
    │           ├── PlayerController.js
    │           ├── ThreatController.js
    │           └── UIManager.js
    └── img/
        └── player/                 ← futuro: sprites reais
            └── player_spritesheet.png
```
