// ── PreloadScene: carrega assets + perguntas do Flask ─────────
import { GAME_W, GAME_H, PLAYER_SHEET } from '../main.js';
import QuizManager from '../systems/QuizManager.js';

export default class PreloadScene extends Phaser.Scene {
  constructor() { super('Preload'); }

  preload() {
    const st = window.GAME_BOOT.urls.static;

    // barra de carregamento
    const bar = this.add.rectangle(GAME_W / 2, GAME_H / 2, 10, 22, 0xffffff);
    this.add.rectangle(GAME_W / 2, GAME_H / 2, 424, 30)
      .setStrokeStyle(2, 0xffffff);
    this.add.text(GAME_W / 2, GAME_H / 2 - 40, 'Carregando a fazenda…',
      { fontSize: '20px', fontFamily: 'monospace' }).setOrigin(0.5);
    this.load.on('progress', p => { bar.width = 8 + 412 * p; });

    // jogador (1 spritesheet, 1 linha por animação — ver PLAYER_SHEET em main.js)
    this.load.spritesheet('player', `${st}img/player/player_spritesheet.png`, {
      frameWidth: PLAYER_SHEET.frameWidth,
      frameHeight: PLAYER_SHEET.frameHeight,
    });
    // ameaça (redemoinho de poeira)
    this.load.spritesheet('threat', `${st}img/enemies/threat_spritesheet.png`, {
      frameWidth: 64, frameHeight: 64,
    });
    // tiles e decoração
    this.load.image('ground',      `${st}img/tiles/ground.png`);
    this.load.image('platform',    `${st}img/tiles/platform.png`);
    this.load.image('sign',        `${st}img/tiles/sign.png`);
    this.load.image('finish_flag', `${st}img/tiles/finish_flag.png`);
    this.load.image('tree',        `${st}img/decor/tree.png`);
    this.load.image('cloud',       `${st}img/decor/cloud.png`);
    this.load.image('crop',        `${st}img/decor/crop.png`);
    this.load.image('fence',       `${st}img/decor/fence.png`);
    this.load.image('hill',        `${st}img/decor/hill.png`);
    // obstaculos do runner
    this.load.image('haybale',     `${st}img/obstacles/haybale.png`);
    this.load.image('rock',        `${st}img/obstacles/rock.png`);
    this.load.image('crate',       `${st}img/obstacles/crate.png`);
    // HUD
    this.load.image('heart', `${st}img/ui/heart.png`);
    this.load.image('coin',  `${st}img/ui/coin.png`);
    this.load.image('star',  `${st}img/ui/star.png`);
  }

  async create() {
    // perguntas vêm do backend (sem gabarito) ANTES do menu
    const quiz = new QuizManager();
    try {
      await quiz.loadRound();
      this.registry.set('quiz', quiz);
      this.scene.start('Menu');
    } catch (err) {
      this.add.text(GAME_W / 2, GAME_H / 2 + 50,
        'Erro ao carregar perguntas.\nVerifique seu acesso e tente novamente.',
        { fontSize: '18px', align: 'center', color: '#ffdddd' }).setOrigin(0.5);
      console.error(err);
    }
  }
}
