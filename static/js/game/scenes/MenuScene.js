// ── MenuScene: tela inicial do modo aventura ──────────────────
import { GAME_W, GAME_H } from '../main.js';

export default class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    const quiz = this.registry.get('quiz');

    // céu + colinas decorativas
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x79c0ef).setOrigin(0);
    for (let i = 0; i < 6; i++) {
      this.add.image(90 + i * 170, GAME_H - 60, 'hill').setScale(2).setAlpha(0.9);
    }
    this.add.rectangle(0, GAME_H - 64, GAME_W, 64, 0x92683e).setOrigin(0);
    this.add.rectangle(0, GAME_H - 64, GAME_W, 10, 0x5ea84c).setOrigin(0);
    for (let i = 0; i < 4; i++) {
      this.add.image(120 + i * 240, 80 + (i % 2) * 40, 'cloud').setScale(1.4);
    }
    this.add.image(110, GAME_H - 96, 'tree').setScale(1.6);
    this.add.image(GAME_W - 110, GAME_H - 96, 'tree').setScale(1.6);

    // título
    this.add.text(GAME_W / 2, 110, '🌾 AVENTURA QUIZ 2D', {
      fontSize: '52px', fontFamily: 'monospace', fontStyle: 'bold',
      color: '#ffffff', stroke: '#2b3a22', strokeThickness: 8,
    }).setOrigin(0.5);
    this.add.text(GAME_W / 2, 162, `Modo: ${quiz.modo}  ·  ${quiz.total} perguntas`, {
      fontSize: '20px', fontFamily: 'monospace', color: '#2b3a22',
    }).setOrigin(0.5);

    // instruções
    const txt = [
      '🏃 Você corre sozinho para a frente!',
      '',
      '👆 TOQUE NA TELA para PULAR (toque 2× = pulo duplo)',
      '🪨 Pule sobre fardos, pedras e caixotes',
      '❓ Pare nas placas e responda para continuar',
      '🌪️ Não deixe o Redemoinho te alcançar!',
    ].join('\n');
    this.add.text(GAME_W / 2, 280, txt, {
      fontSize: '18px', fontFamily: 'monospace', align: 'center',
      color: '#ffffff', backgroundColor: '#00000055', padding: { x: 18, y: 12 },
    }).setOrigin(0.5);

    // botão iniciar
    const btn = this.add.text(GAME_W / 2, 420, '▶  COMEÇAR', {
      fontSize: '32px', fontFamily: 'monospace', fontStyle: 'bold',
      color: '#ffffff', backgroundColor: '#2e9e5b', padding: { x: 28, y: 14 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setStyle({ backgroundColor: '#37b96c' }));
    btn.on('pointerout',  () => btn.setStyle({ backgroundColor: '#2e9e5b' }));
    btn.on('pointerup',   () => this.scene.start('Game'));
    this.input.keyboard.once('keydown-ENTER', () => this.scene.start('Game'));
    this.tweens.add({ targets: btn, scale: 1.05, yoyo: true, repeat: -1, duration: 600 });
  }
}
