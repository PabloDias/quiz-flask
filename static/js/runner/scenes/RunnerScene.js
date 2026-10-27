/* ═══════════════════════════════════════════════════════════════
   RunnerScene.js — Cena principal do Agro Quiz Runner
   
   FLUXO:
   1. create() — monta cenário, carrega perguntas da API
   2. Loop automático de scrolling
   3. Quando pergunta é exibida, UIManager mostra o painel HTML
   4. Resposta enviada ao servidor via QuizManager
   5. Resultado aplicado ao ScoreManager e ThreatController
   6. Ao finalizar perguntas ou sem vidas → ResultScene
═══════════════════════════════════════════════════════════════ */

class RunnerScene extends Phaser.Scene {
  constructor() { super({ key: 'RunnerScene' }); }

  // ─── Inicialização ────────────────────────────────────────────
  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    this.quiz   = new QuizManager();
    this.score  = null;   // instanciado após carregar config
    this.threat = null;
    this.ui     = null;

    this._questionActive  = false;
    this._waitingForNext  = false;
    this._gameOver        = false;
    this._victory         = false;
    this._answeredCount   = 0;

    // Scrolling state
    this._scrollX     = 0;
    this._scrollSpeed = 2.5;   // px por frame (base)

    this._buildScene(W, H);
    this._loadAndStart();
  }

  // ─── Monta o cenário ──────────────────────────────────────────
  _buildScene(W, H) {
    // Camadas de paralaxe
    this._skyImg    = this.add.image(W / 2,       90,  'bg_sky'   ).setDisplaySize(W * 2, 180).setDepth(0);
    this._hillsImg  = this.add.image(W / 2,       255, 'bg_hills' ).setDisplaySize(W * 2, 150).setDepth(1);
    this._groundImg = this.add.image(W / 2,       385, 'bg_ground').setDisplaySize(W * 2, 100).setDepth(2);

    // Chão estático (âncora visual)
    const ground = this.add.graphics().setDepth(2);
    ground.fillStyle(0x8b6914, 1);
    ground.fillRect(0, 420, W, 30);
    ground.fillStyle(0x4a8c2a, 1);
    ground.fillRect(0, 416, W, 8);

    // Elementos decorativos repetíveis
    this._bgElements = [];
    this._spawnBgElements(W, H);
  }

  _spawnBgElements(W, H) {
    const types = ['🌾', '🌻', '🌴', '🌿', '🪨'];
    for (let i = 0; i < 12; i++) {
      const x = Phaser.Math.Between(50, W * 2);
      const y = Phaser.Math.Between(380, 412);
      const el = this.add.text(x, y, Phaser.Math.RND.pick(types), {
        fontSize: Phaser.Math.Between(12, 22) + 'px'
      }).setDepth(2).setAlpha(0.8);
      this._bgElements.push({ el, speed: Phaser.Math.FloatBetween(0.5, 1.5) });
    }
  }

  // ─── Carrega perguntas e inicia jogo ──────────────────────────
  async _loadAndStart() {
    try {
      const data = await this.quiz.loadQuestions();
      const cfg  = data.config;

      this.score  = new ScoreManager(cfg);
      this.threat = new ThreatController(this, cfg);
      this.ui     = new UIManager(this.quiz, this.score);

      // Player (após ui e score)
      const W = this.scale.width;
      const H = this.scale.height;
      this.player = new PlayerController(this, 180, H * 0.68);
      this.player.setDepth(10);

      // Callbacks da ameaça
      this.threat.onCatch   = () => this._onThreatCatch();
      this.threat.onWarning = (isClose) => {
        if (isClose) this.player.onThreatClose();
        else         this.player.onThreatFar();
      };

      // HUD
      this.ui.showHUD();
      this.score.onLivesChange(this.score.lives, this.score.maxLives);
      this.ui.setProgress(0, this.quiz.totalQuestions);

      // Começa a correr
      this.player.playState('run');
      this._scrollSpeed = 2.5;

      // Aguarda um segundo antes da primeira pergunta
      this.time.delayedCall(1200, () => this._nextQuestion());

    } catch (err) {
      console.error('[RunnerScene] Erro ao carregar:', err);
      this._showError('Não foi possível carregar as perguntas.\nVerifique o login e tente novamente.');
    }
  }

  // ─── Game loop ────────────────────────────────────────────────
  update(time, delta) {
    if (this._gameOver || this._victory) return;
    if (!this.threat) return;

    // Parallax scrolling
    this._scrollX += this._scrollSpeed * (this.score ? this.score.speed : 1);
    const W = this.scale.width;

    this._skyImg.x    = W / 2 - (this._scrollX * 0.1) % W;
    this._hillsImg.x  = W / 2 - (this._scrollX * 0.3) % W;
    this._groundImg.x = W / 2 - (this._scrollX * 1.0) % W;

    // Elementos de fundo
    this._bgElements.forEach(item => {
      item.el.x -= item.speed * (this.score ? this.score.speed : 1);
      if (item.el.x < -50) {
        item.el.x = W + Phaser.Math.Between(50, 200);
        item.el.y = Phaser.Math.Between(380, 412);
      }
    });

    // Ameaça
    this.threat.update(delta, this._questionActive);

    // Personagem
    if (this.player) this.player.update(this.score ? this.score.speed : 1);

    // Velocidade de scroll baseada na speed do score
    if (this.score) {
      this._scrollSpeed = 2.0 + this.score.speed * 1.2;
    }

    // Sincroniza progress no HUD
    if (this.score && this.ui && this.quiz) {
      this.score.progressPct = this._answeredCount / Math.max(1, this.quiz.totalQuestions);
      this.ui.setProgress(this._answeredCount, this.quiz.totalQuestions);
    }
  }

  // ─── Lógica de perguntas ──────────────────────────────────────
  _nextQuestion() {
    if (this._gameOver || this._victory) return;
    if (this.quiz.isFinished) {
      this._triggerVictory();
      return;
    }

    const q   = this.quiz.currentQuestion;
    const cfg = this.quiz.gameConfig;
    this._questionActive = true;

    // Exibe no UIManager
    this.ui.showQuestion(
      q,
      this.quiz.currentIndex,
      this.quiz.totalQuestions,
      cfg.answer_time_limit || 15,
      (optionId) => this._onAnswer(optionId)
    );

    // Callback de timeout
    this.ui.setTimeoutCallback(() => this._onTimeout());

    this.quiz.startTimer();
  }

  async _onAnswer(optionId) {
    if (!this._questionActive) return;
    this._questionActive = false;

    let result;
    try {
      result = await this.quiz.sendAnswer(optionId);
    } catch (err) {
      console.error('[RunnerScene] Erro ao enviar resposta:', err);
      return;
    }

    // Aplica ao ScoreManager
    if (result.correct) {
      const { combo, speed } = this.score.correct(result.points_awarded, result.fast);
      this.player.onCorrect(result.fast);
      this.threat.onCorrect(result.fast);
      this._showFloating(result.points_awarded, true, result.fast);
    } else {
      this.score.wrong(result.points_awarded);  // já negativo
      this.player.onWrong();
      this.threat.onWrong();
      this._showFloating(result.points_awarded, false, false);
    }

    this._answeredCount++;
    this.quiz.advance();

    // Mostra feedback e aguarda continuar
    this.ui.showFeedback(result, () => {
      if (this.score.isDead) {
        this._triggerGameOver();
      } else {
        this.time.delayedCall(400, () => this._nextQuestion());
      }
    });
  }

  _onTimeout() {
    if (!this._questionActive) return;
    this._questionActive = false;
    this.threat.onTimeout();
    this.score.loseLife();

    if (this.score.isDead) {
      this.ui.hideQuestion();
      this._triggerGameOver();
      return;
    }

    // Mostra feedback de timeout
    const fakeResult = {
      correct: false,
      correct_option: '?',
      explanation: 'O tempo acabou! A ameaça ficou mais perto...',
      points_awarded: 0,
      fast: false
    };
    this.ui.showFeedback(fakeResult, () => {
      this.quiz.advance();
      this._answeredCount++;
      this.time.delayedCall(400, () => {
        if (this.quiz.isFinished) this._triggerVictory();
        else this._nextQuestion();
      });
    });
  }

  _onThreatCatch() {
    const remaining = this.score.loseLife();
    this.cameras.main.shake(300, 0.015);
    this.player.onWrong('run');

    if (remaining <= 0) {
      this._triggerGameOver();
    } else {
      // Reseta distância da ameaça
      this.threat.distance = 0.6;
      this.threat.caught = false;
    }
  }

  // ─── Fim de jogo ──────────────────────────────────────────────
  _triggerVictory() {
    if (this._gameOver || this._victory) return;
    this._victory = true;
    this._questionActive = false;
    this.ui.hideQuestion();
    this.player.playState('correct');
    this.cameras.main.flash(500, 255, 255, 100);

    this.time.delayedCall(1000, () => {
      this.ui.destroy();
      this.scene.start('ResultScene', {
        victory:    true,
        score:      this.score.score,
        hits:       this.score.hits,
        misses:     this.score.misses,
        maxCombo:   this.score.maxCombo,
        lives:      this.score.lives,
        total:      this.quiz.totalQuestions,
        modo:       this.quiz.modo,
        dificuldade:this.quiz.dificuldade,
        quiz:       this.quiz,  // para chamar finish()
        scoreMgr:   this.score
      });
    });
  }

  _triggerGameOver() {
    if (this._gameOver) return;
    this._gameOver = true;
    this._questionActive = false;
    this.ui.hideQuestion();
    this.player.onGameOver();
    this.cameras.main.flash(400, 255, 50, 50);
    this.cameras.main.shake(400, 0.02);

    this.time.delayedCall(1200, () => {
      this.ui.destroy();
      this.scene.start('ResultScene', {
        victory:    false,
        score:      this.score.score,
        hits:       this.score.hits,
        misses:     this.score.misses,
        maxCombo:   this.score.maxCombo,
        lives:      0,
        total:      this.quiz.totalQuestions,
        modo:       this.quiz.modo,
        dificuldade:this.quiz.dificuldade,
        quiz:       this.quiz,
        scoreMgr:   this.score
      });
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────
  _showFloating(points, positive, fast) {
    if (!this.player) return;
    const canvas = this.game.canvas.getBoundingClientRect();
    const sx = this.player.x / this.scale.width  * canvas.width  + canvas.left;
    const sy = this.player.y / this.scale.height * canvas.height + canvas.top;
    const cls = fast ? 'bonus' : (positive ? 'positive' : 'negative');
    const txt  = (points > 0 ? '+' : '') + points + (fast ? ' ⚡' : '');

    const el = document.createElement('div');
    el.className = `floating-points ${cls}`;
    el.textContent = txt;
    el.style.left = sx + 'px';
    el.style.top  = (sy - 40) + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1500);
  }

  _showError(msg) {
    const W = this.scale.width, H = this.scale.height;
    this.add.text(W / 2, H / 2, msg, {
      fontSize: '16px', fill: '#ff6b35', fontFamily: 'Courier New',
      align: 'center', wordWrap: { width: W - 80 }
    }).setOrigin(0.5);
  }
}