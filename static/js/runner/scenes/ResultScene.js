/* ═══════════════════════════════════════════════════════════════
   ResultScene.js — Tela de vitória / game over
   Mostra resultado, pede nick e salva no ranking via /api/game/finish
═══════════════════════════════════════════════════════════════ */

class ResultScene extends Phaser.Scene {
  constructor() { super({ key: 'ResultScene' }); }

  init(data) {
    this.resultData = data;
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;
    const d = this.resultData;

    // Fundo escurecido
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.75);

    if (d.victory) {
      this._buildVictoryScreen(W, H, d);
    } else {
      this._buildGameOverScreen(W, H, d);
    }
  }

  _buildVictoryScreen(W, H, d) {
    // Estrelas animadas
    for (let i = 0; i < 20; i++) {
      const star = this.add.text(
        Phaser.Math.Between(20, W - 20),
        Phaser.Math.Between(20, H - 20),
        '⭐', { fontSize: Phaser.Math.Between(12, 28) + 'px' }
      ).setAlpha(0);
      this.tweens.add({
        targets: star, alpha: 1, duration: 300,
        delay: i * 80, yoyo: true, repeat: -1
      });
    }

    this.add.text(W / 2, 60, '🏆 VITÓRIA! 🏆', {
      fontSize: '32px', fill: '#f9c22e',
      fontFamily: 'Courier New',
      stroke: '#2d5a1b', strokeThickness: 4
    }).setOrigin(0.5);

    this.add.text(W / 2, 108, 'Corrida concluída!', {
      fontSize: '16px', fill: '#b3e5fc', fontFamily: 'Courier New'
    }).setOrigin(0.5);

    this._buildStats(W, 145, d);
    this._buildNickInput(W, H, d, true);
  }

  _buildGameOverScreen(W, H, d) {
    this.add.text(W / 2, 60, '💨 A POEIRA TE ALCANÇOU!', {
      fontSize: '24px', fill: '#e74c3c',
      fontFamily: 'Courier New',
      stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5);

    this.add.text(W / 2, 100, 'Fim de corrida!', {
      fontSize: '15px', fill: '#ecf0f1', fontFamily: 'Courier New'
    }).setOrigin(0.5);

    this._buildStats(W, 135, d);
    this._buildNickInput(W, H, d, false);
  }

  _buildStats(W, startY, d) {
    const lines = [
      `⭐ Pontuação:     ${d.score.toLocaleString('pt-BR')}`,
      `✅ Acertos:       ${d.hits} / ${d.total}`,
      `❌ Erros:         ${d.misses}`,
      `🔥 Maior combo:   ${d.maxCombo}x`,
      `❤️ Vidas restantes: ${d.lives}`,
    ];
    lines.forEach((line, i) => {
      this.add.text(W / 2, startY + i * 26, line, {
        fontSize: '14px', fill: '#ecf0f1', fontFamily: 'Courier New'
      }).setOrigin(0.5);
    });
  }

  _buildNickInput(W, H, d, victory) {
    const y = H - 140;

    this.add.text(W / 2, y, 'Insira seu nome para o ranking:', {
      fontSize: '13px', fill: '#b3e5fc', fontFamily: 'Courier New'
    }).setOrigin(0.5);

    // Input HTML temporário
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 20;
    input.placeholder = 'Seu nome...';
    input.style.cssText = `
      position: fixed;
      left: 50%;
      top: ${y + 30}px;
      transform: translateX(-50%);
      width: 220px;
      padding: 8px 12px;
      font-size: 16px;
      font-family: 'Courier New', monospace;
      background: rgba(0,0,0,0.7);
      color: #ffffff;
      border: 2px solid #7ec850;
      border-radius: 6px;
      outline: none;
      text-align: center;
      z-index: 500;
    `;
    document.body.appendChild(input);
    input.focus();

    // Botão salvar
    const saveBtn = this._createDOMButton('💾  Salvar & Ver Ranking', W / 2, y + 90, '#27ae60', async () => {
      const nick = input.value.trim() || 'Anônimo';
      saveBtn.disabled = true;
      saveBtn.textContent = 'Salvando...';
      try {
        const result = await d.quiz.finish(victory, d.lives, nick);
        input.remove();
        document.querySelectorAll('._result-btn').forEach(b => b.remove());
        this._showFinalOptions(W, H, result.ranking_url, result.final_score);
      } catch (err) {
        saveBtn.textContent = '💾  Tentar novamente';
        saveBtn.disabled = false;
      }
    });

    // Botão pular
    const skipBtn = this._createDOMButton('Jogar novamente (sem salvar)', W / 2, y + 130, '#2c3e50', () => {
      input.remove();
      document.querySelectorAll('._result-btn').forEach(b => b.remove());
      this._playAgain();
    });

    // Bind enter no input
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') saveBtn.click();
    });

    this._inputEl = input;
    this._saveBtnEl = saveBtn;
    this._skipBtnEl = skipBtn;
  }

  _showFinalOptions(W, H, rankingUrl, finalScore) {
    this.add.text(W / 2, H - 120, `Pontuação final: ${finalScore.toLocaleString('pt-BR')}`, {
      fontSize: '16px', fill: '#f9c22e', fontFamily: 'Courier New'
    }).setOrigin(0.5);

    this._createDOMButton('🏆  Ver Ranking', W / 2, H - 85, '#c0392b', () => {
      window.location.href = rankingUrl;
    });

    this._createDOMButton('▶  Jogar Novamente', W / 2, H - 50, '#27ae60', () => {
      this._playAgain();
    });

    this._createDOMButton('← Voltar ao início', W / 2, H - 18, '#2c3e50', () => {
      window.location.href = window.RUNNER_CONFIG.homeUrl;
    });
  }

  _playAgain() {
    document.querySelectorAll('._result-btn').forEach(b => b.remove());
    if (this._inputEl) this._inputEl.remove();
    // Limpa overlays
    document.getElementById('question-overlay').classList.add('hidden');
    document.getElementById('game-hud').classList.add('hidden');
    this.scene.start('RunnerScene');
  }

  _createDOMButton(label, cx, cy, bg, onClick) {
    const canvas = this.game.canvas.getBoundingClientRect();
    const scaleX = canvas.width  / this.scale.width;
    const scaleY = canvas.height / this.scale.height;
    const btn = document.createElement('button');
    btn.className = '_result-btn';
    btn.textContent = label;
    btn.style.cssText = `
      position: fixed;
      left: ${cx * scaleX + canvas.left - 110 * scaleX}px;
      top: ${cy * scaleY + canvas.top}px;
      width: ${220 * scaleX}px;
      padding: 8px 0;
      font-size: ${14 * Math.min(scaleX, scaleY)}px;
      font-family: 'Courier New', monospace;
      background: ${bg};
      color: #ffffff;
      border: 2px solid rgba(255,255,255,0.3);
      border-radius: 6px;
      cursor: pointer;
      z-index: 500;
      transition: opacity 0.15s;
    `;
    btn.onmouseenter = () => btn.style.opacity = '0.8';
    btn.onmouseleave = () => btn.style.opacity = '1';
    btn.onclick = onClick;
    document.body.appendChild(btn);
    return btn;
  }

  // Limpa botões HTML ao sair da cena
  shutdown() {
    document.querySelectorAll('._result-btn').forEach(b => b.remove());
    if (this._inputEl) { this._inputEl.remove(); this._inputEl = null; }
  }
}
