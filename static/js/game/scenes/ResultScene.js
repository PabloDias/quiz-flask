// ── ResultScene: vitória / fim de jogo + ranking ──────────────
import { GAME_W, GAME_H } from '../main.js';

export default class ResultScene extends Phaser.Scene {
  constructor() { super('Result'); }

  init(data) { this.data_ = data; }

  create() {
    const { victory, livesLeft, hits, total } = this.data_;
    this.quiz = this.registry.get('quiz');

    this.add.rectangle(0, 0, GAME_W, GAME_H, victory ? 0x16331f : 0x2a1418, 0.96).setOrigin(0);

    this.add.text(GAME_W / 2, 120, victory ? '🏁 VITÓRIA!' : '💔 FIM DE JOGO', {
      fontSize: '56px', fontFamily: 'monospace', fontStyle: 'bold',
      color: victory ? '#7dffa9' : '#ff9a9a', stroke: '#000', strokeThickness: 8,
    }).setOrigin(0.5);

    this.add.text(GAME_W / 2, 190,
      victory ? 'Você chegou à bandeira e escapou do Redemoinho!'
              : 'O Redemoinho venceu desta vez… tente de novo!', {
        fontSize: '20px', fontFamily: 'monospace', color: '#ffffff',
      }).setOrigin(0.5);

    this.statsText = this.add.text(GAME_W / 2, 270,
      `Acertos: ${hits}/${total}    Vidas restantes: ${livesLeft}\n\nCalculando pontuação final…`, {
        fontSize: '22px', fontFamily: 'monospace', align: 'center', color: '#ffd76a',
      }).setOrigin(0.5);

    // pergunta o nick via overlay DOM, depois finaliza no servidor
    this.askNick(victory, livesLeft, hits, total);
  }

  askNick(victory, livesLeft) {
    const overlay = document.getElementById('nick-overlay');
    const headline = document.getElementById('nick-headline');
    const scoreEl = document.getElementById('nick-score');
    const input = document.getElementById('nick-input');
    const save = document.getElementById('nick-save');
    const skip = document.getElementById('nick-skip');

    headline.textContent = victory ? '🏁 Vitória!' : 'Fim de jogo!';
    scoreEl.textContent = victory
      ? 'Bônus de fase e de vidas serão somados. Salvar no ranking?'
      : 'Quer salvar sua pontuação no ranking?';
    overlay.classList.remove('hidden');
    input.value = '';
    input.focus();

    const done = async (nick) => {
      overlay.classList.add('hidden');
      save.onclick = skip.onclick = null;
      try {
        const r = await this.quiz.finish({ victory, livesLeft, nick });
        this.showFinal(r);
      } catch (e) {
        console.error(e);
        this.showFinal(null);
      }
    };
    save.onclick = () => done(input.value.trim());
    skip.onclick = () => done('');
    input.onkeydown = (e) => { if (e.key === 'Enter') done(input.value.trim()); };
  }

  showFinal(r) {
    const { hits, total, livesLeft } = this.data_;
    this.statsText.setText(
      `Acertos: ${hits}/${total}    Vidas restantes: ${livesLeft}\n\n` +
      `PONTUAÇÃO FINAL: ${r ? r.final_score : '—'}`);

    const mkBtn = (x, label, bg, fn) => {
      const b = this.add.text(x, 410, label, {
        fontSize: '20px', fontFamily: 'monospace', fontStyle: 'bold',
        color: '#fff', backgroundColor: bg, padding: { x: 18, y: 12 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      b.on('pointerup', fn);
      b.on('pointerover', () => b.setAlpha(0.85));
      b.on('pointerout',  () => b.setAlpha(1));
    };
    mkBtn(GAME_W / 2 - 240, '🔄 Jogar de novo', '#2e9e5b', () => window.location.reload());
    if (r && r.saved) {
      mkBtn(GAME_W / 2, '🏆 Ver Ranking', '#b07a2a',
        () => window.location.href = r.ranking_url);
    }
    mkBtn(GAME_W / 2 + 240, '🏠 Menu', '#37527e',
      () => window.location.href = window.GAME_BOOT.urls.home);
  }
}
