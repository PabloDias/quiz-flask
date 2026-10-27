/* ═══════════════════════════════════════════════════════════════
   MenuScene.js — v2 (corrigido)
   BUG CORRIGIDO: animações agora usam chaves de textura individual
   (player_idle_0 etc.) em vez de generateFrameNumbers.
   Não registra animações aqui — já foram registradas no PreloadScene.
═══════════════════════════════════════════════════════════════ */

class MenuScene extends Phaser.Scene {
  constructor() { super({ key: 'MenuScene' }); }

  create() {
    const W   = this.scale.width;
    const H   = this.scale.height;
    const cfg = window.RUNNER_CONFIG;

    // ─── Fundo ───────────────────────────────────────────────────
    this.add.image(W / 2, 100, 'bg_sky'   ).setDisplaySize(W, 200);
    this.add.image(W / 2, 280, 'bg_hills' ).setDisplaySize(W, 150);
    this.add.image(W / 2, 400, 'bg_ground').setDisplaySize(W, 100);

    // Chão sólido
    const g = this.add.graphics();
    g.fillStyle(0x4a8c2a); g.fillRect(0, 416, W, 10);
    g.fillStyle(0x8b6914); g.fillRect(0, 424, W, 26);

    // ─── Personagem animado ───────────────────────────────────────
    // usa a primeira textura do idle como frame inicial
    this.menuPlayer = this.add.sprite(W / 2, 350, 'player_idle_0').setScale(2.5);
    this.menuPlayer.play('anim_idle');

    // ─── Título ──────────────────────────────────────────────────
    this.add.text(W / 2, 38, '🌾 AGRO QUIZ RUNNER', {
      fontSize: '26px', color: '#f9c22e',
      fontFamily: 'Courier New',
      stroke: '#2d5a1b', strokeThickness: 5,
    }).setOrigin(0.5);

    const modeLabel = { classico: 'Geral', aprendizagem: 'Aprendizagem', piscicultura: 'Piscicultura' };
    this.add.text(W / 2, 72, `Modo: ${modeLabel[cfg.modo] || cfg.modo}  |  Dificuldade: ${cfg.dificuldade}`, {
      fontSize: '12px', color: '#b3e5fc', fontFamily: 'Courier New'
    }).setOrigin(0.5);

    // ─── Botão JOGAR ─────────────────────────────────────────────
    this._createPlayButton(W / 2, H - 75);

    // Dica teclas
    this.add.text(W / 2, H - 30, 'Use os botões ou as teclas  1 · 2 · 3 · 4  para responder', {
      fontSize: '11px', color: '#ffffffaa', fontFamily: 'Courier New'
    }).setOrigin(0.5);

    // Botão voltar
    const back = this.add.text(14, 14, '← Sair', {
      fontSize: '13px', color: '#ffffff', fontFamily: 'Courier New',
      backgroundColor: '#00000088', padding: { x: 8, y: 4 }
    }).setInteractive({ useHandCursor: true });
    back.on('pointerover', () => back.setColor('#f9c22e'));
    back.on('pointerout',  () => back.setColor('#ffffff'));
    back.on('pointerdown', () => { window.location.href = cfg.homeUrl; });
  }

  _createPlayButton(cx, cy) {
    const BW = 230, BH = 52;
    const x = cx - BW / 2, y = cy - BH / 2;

    const bg = this.add.graphics();
    bg.fillStyle(0x27ae60); bg.fillRoundedRect(x, y, BW, BH, 10);
    bg.lineStyle(3, 0x2ecc71); bg.strokeRoundedRect(x, y, BW, BH, 10);
    bg.setInteractive(new Phaser.Geom.Rectangle(x, y, BW, BH), Phaser.Geom.Rectangle.Contains);

    const lbl = this.add.text(cx, cy, '▶  INICIAR CORRIDA', {
      fontSize: '19px', color: '#ffffff', fontFamily: 'Courier New',
      stroke: '#145a32', strokeThickness: 2
    }).setOrigin(0.5);

    bg.on('pointerover',  () => { bg.setAlpha(0.82); lbl.setScale(1.06); });
    bg.on('pointerout',   () => { bg.setAlpha(1);    lbl.setScale(1);    });
    bg.on('pointerdown',  () => { this.scene.start('RunnerScene'); });

    this.tweens.add({
      targets: [bg, lbl], scaleX: 1.03, scaleY: 1.03,
      yoyo: true, repeat: -1, duration: 750, ease: 'Sine.easeInOut'
    });
  }
}