// ── QuestionScene: painel de pergunta sobre o jogo ────────────
// Sobreposta à GameScene (scene.launch). As alternativas aparecem
// como placas de madeira clicáveis; teclado 1-4 / A-D também funciona.
import { GAME_W, GAME_H } from '../main.js';

const LETTER_COLORS = { A: 0xc0392b, B: 0x3498db, C: 0xe67e22, D: 0x9b59b6,
                        E: 0x16a085, F: 0x7f8c8d };

export default class QuestionScene extends Phaser.Scene {
  constructor() { super('Question'); }

  init(data) {
    this.quiz = data.quiz;
    this.index = data.index;
    this.startTime = data.startTime;
    this.onResult = data.onResult;
    this.onClosed = data.onClosed;
    this.answered = false;
  }

  create() {
    const q = this.quiz.question(this.index);

    // fundo translúcido (jogo continua visível — a ameaça segue se mexendo!)
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x10141c, 0.55).setOrigin(0);

    // painel da pergunta
    this.add.rectangle(GAME_W / 2, 118, 880, 132, 0xf6e7c8)
      .setStrokeStyle(4, 0x8a6238);
    this.add.text(GAME_W / 2, 70, `Pergunta ${this.index + 1} de ${this.quiz.total}`, {
      fontSize: '15px', fontFamily: 'monospace', color: '#6b4e2e',
    }).setOrigin(0.5);
    this.add.text(GAME_W / 2, 124, q.question, {
      fontSize: '21px', fontFamily: 'monospace', fontStyle: 'bold',
      color: '#3a2a16', align: 'center', wordWrap: { width: 830 },
    }).setOrigin(0.5);

    // alternativas: placas de madeira em grade 2x2
    this.buttons = [];
    q.options.forEach((opt, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = GAME_W / 2 + (col === 0 ? -222 : 222);
      const y = 252 + row * 104;
      this.buttons.push(this.makeOption(x, y, opt));
    });

    // teclado: 1-4 e A-D
    const keymap = { ONE: 0, TWO: 1, THREE: 2, FOUR: 3, A: 0, B: 1, C: 2, D: 3 };
    Object.entries(keymap).forEach(([k, i]) => {
      this.input.keyboard.on(`keydown-${k}`, () => {
        if (!this.answered && this.buttons[i]) this.select(this.buttons[i].opt);
      });
    });

    this.hint = this.add.text(GAME_W / 2, 470,
      '🌪️ Responda antes que o Redemoinho te alcance!', {
        fontSize: '16px', fontFamily: 'monospace', color: '#ffd76a',
      }).setOrigin(0.5);
    this.tweens.add({ targets: this.hint, alpha: 0.4, yoyo: true, repeat: -1, duration: 600 });
  }

  makeOption(x, y, opt) {
    const w = 428, h = 88;
    const board = this.add.rectangle(x, y, w, h, 0xb98c56)
      .setStrokeStyle(4, 0x7c5a30).setInteractive({ useHandCursor: true });
    const badge = this.add.circle(x - w / 2 + 34, y, 22, LETTER_COLORS[opt.id] ?? 0x555555)
      .setStrokeStyle(3, 0xffffff);
    const letter = this.add.text(x - w / 2 + 34, y, opt.id, {
      fontSize: '22px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5);
    const label = this.add.text(x - w / 2 + 66, y, opt.text, {
      fontSize: '17px', fontFamily: 'monospace', color: '#33220f',
      wordWrap: { width: w - 84 },
    }).setOrigin(0, 0.5);

    board.on('pointerover', () => !this.answered && board.setFillStyle(0xcda06a));
    board.on('pointerout',  () => !this.answered && board.setFillStyle(0xb98c56));
    board.on('pointerup',   () => this.select(opt));
    return { opt, board, badge, letter, label };
  }

  /** Envia a resposta escolhida ao servidor. */
  async select(opt) {
    if (this.answered) return;
    this.answered = true;
    const timeTaken = (this.time.now - this.startTime) / 1000;
    this.buttons.forEach(b => b.board.disableInteractive());
    try {
      const result = await this.quiz.answer(this.index, opt.id, timeTaken);
      this.showFeedback(result, opt.id);
      this.onResult(result);
    } catch (err) {
      console.error(err);
      this.close();
    }
  }

  /** Chamada pela GameScene quando a ameaça alcança o jogador (tempo esgotado). */
  async forceTimeout() {
    if (this.answered) return;
    this.answered = true;
    this.buttons.forEach(b => b.board.disableInteractive());
    try {
      const result = await this.quiz.answer(this.index, 'TIMEOUT', 999);
      this.showFeedback(result, null, true);
      this.onResult(result);
    } catch (err) {
      console.error(err);
      this.close();
    }
  }

  showFeedback(result, chosenId, timeout = false) {
    this.hint.destroy();
    // destaque visual + ícone/texto (não depende só de cor)
    this.buttons.forEach(b => {
      if (b.opt.id === result.correct_option) {
        b.board.setFillStyle(0x2e9e5b);
        b.label.setText('✔ ' + b.opt.text).setColor('#ffffff');
      } else if (b.opt.id === chosenId && !result.correct) {
        b.board.setFillStyle(0xc0392b);
        b.label.setText('✘ ' + b.opt.text).setColor('#ffffff');
      } else {
        b.board.setAlpha(0.45);
      }
    });

    const headline = timeout ? '🌪️ O Redemoinho te pegou!' :
      result.correct ? '✔ Correto!' : '✘ Tente novamente!';
    const pts = result.points_awarded >= 0 ? `+${result.points_awarded}` : `${result.points_awarded}`;
    const fb = this.add.text(GAME_W / 2, 452, `${headline}   ${pts} pontos`, {
      fontSize: '24px', fontFamily: 'monospace', fontStyle: 'bold',
      color: result.correct ? '#7dffa9' : '#ff9a9a',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5);
    this.tweens.add({ targets: fb, scale: { from: 0.6, to: 1 }, duration: 250, ease: 'Back.easeOut' });

    // explicação (modo aprendizagem) quando existir
    if (result.explanation && !result.correct) {
      this.add.rectangle(GAME_W / 2, 498, 880, 50, 0x1d2735, 0.92)
        .setStrokeStyle(2, 0x5a8dee);
      this.add.text(GAME_W / 2, 498, `💡 ${result.explanation}`, {
        fontSize: '14px', fontFamily: 'monospace', color: '#dce8ff',
        align: 'center', wordWrap: { width: 850 },
      }).setOrigin(0.5);
    }

    // botão continuar (ou ENTER/clique em qualquer lugar após 600ms)
    const btn = this.add.text(GAME_W - 88, 452, 'Continuar ▶', {
      fontSize: '17px', fontFamily: 'monospace', fontStyle: 'bold',
      color: '#ffffff', backgroundColor: '#2e6fde', padding: { x: 12, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn.on('pointerup', () => this.close());
    this.time.delayedCall(600, () => {
      this.input.keyboard.once('keydown-ENTER', () => this.close());
      this.input.once('pointerup', () => this.close());
    });
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.onClosed();
    this.scene.stop();
  }
}
