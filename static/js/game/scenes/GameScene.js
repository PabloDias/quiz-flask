// ── GameScene: endless-runner com perguntas em checkpoints ────
import { GAME_W, GAME_H } from '../main.js';
import PlayerController from '../systems/PlayerController.js';
import ThreatController from '../systems/ThreatController.js';
import ScoreManager from '../systems/ScoreManager.js';
import ProgressManager from '../systems/ProgressManager.js';

const GROUND_H = 64;
const START_X = 180;
const CHECKPOINT_SPACING = 760;        // distancia entre placas (espaco p/ obstaculos)
const FINISH_GAP = 520;
const OBSTACLES_PER_SEGMENT = [2, 3];  // min, max obstaculos entre checkpoints
const MIN_OBSTACLE_GAP = 220;          // px minimo entre obstaculos consecutivos

const OBSTACLE_TYPES = {
  haybale: { key: 'haybale', bodyW: 40, bodyH: 36, yOffset: 20 },
  rock:    { key: 'rock',    bodyW: 36, bodyH: 22, yOffset: 14 },
  crate:   { key: 'crate',   bodyW: 36, bodyH: 36, yOffset: 20 },
};

export default class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    this.quiz = this.registry.get('quiz');
    const cfg = this.quiz.config;
    this.scoreMgr = new ScoreManager(cfg);
    this.progress = new ProgressManager(this.quiz.total);

    this.groundY = GAME_H - GROUND_H;
    this.questionOpen = false;
    this.invulnUntil = 0;
    this.obstacleCooldown = 0;
    this.finishedLevel = false;
    this.lastResult = null;

    const lastSign = START_X + this.quiz.total * CHECKPOINT_SPACING;
    this.finishX = lastSign + FINISH_GAP;
    const worldW = this.finishX + 360;
    this.physics.world.setBounds(0, 0, worldW, GAME_H);

    this.buildWorld(worldW);

    // jogador
    this.player = new PlayerController(this, START_X, this.groundY - 40);
    this.physics.add.collider(this.player.sprite, this.groundGroup);

    // obstaculos (criados ANTES da ameaca para ordem de desenho coerente)
    this.buildObstacles();

    // ameaca
    this.threat = new ThreatController(this, START_X - 380, this.groundY, cfg);

    // camera com lookahead grande (mais espaço a frente p/ ver obstaculos)
    this.cameras.main.setBounds(0, 0, worldW, GAME_H);
    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12, 200, 80);

    this.buildCheckpoints();
    this.buildFinish();
    this.buildHud();
    this.setupInput();
  }

  // ───────────────────── mundo / cenario ─────────────────────
  buildWorld(worldW) {
    this.add.rectangle(0, 0, worldW, GAME_H, 0x79c0ef).setOrigin(0).setScrollFactor(0.05);
    for (let x = 80; x < worldW; x += 300) {
      this.add.image(x, 70 + (x / 300 % 3) * 35, 'cloud').setScale(1.3).setScrollFactor(0.25);
    }
    for (let x = 0; x < worldW; x += 220) {
      this.add.image(x, this.groundY - 18, 'hill').setScale(2.2).setScrollFactor(0.55);
    }
    this.add.tileSprite(0, this.groundY, worldW, GROUND_H, 'ground').setOrigin(0);
    this.groundGroup = this.physics.add.staticGroup();
    const g = this.add.zone(0, this.groundY, worldW, GROUND_H).setOrigin(0);
    this.physics.add.existing(g, true);
    this.groundGroup.add(g);
    for (let x = 320; x < worldW; x += 430) this.add.image(x, this.groundY - 32, 'tree');
    for (let x = 90;  x < worldW; x += 230) this.add.image(x, this.groundY - 16, 'crop');
  }

  buildObstacles() {
    this.obstacles = this.physics.add.staticGroup();
    const types = Object.values(OBSTACLE_TYPES);
    for (let i = 0; i < this.quiz.total; i++) {
      const segStart = START_X + i * CHECKPOINT_SPACING + 200;
      const segEnd   = START_X + (i + 1) * CHECKPOINT_SPACING - 200;
      const count = Phaser.Math.Between(OBSTACLES_PER_SEGMENT[0], OBSTACLES_PER_SEGMENT[1]);
      const positions = [];
      let attempts = 0;
      while (positions.length < count && attempts++ < 40) {
        const x = Phaser.Math.Between(segStart, segEnd);
        if (positions.every(p => Math.abs(p - x) >= MIN_OBSTACLE_GAP)) positions.push(x);
      }
      positions.forEach(x => {
        const t = Phaser.Utils.Array.GetRandom(types);
        const obs = this.obstacles.create(x, this.groundY - t.yOffset, t.key);
        obs.body.setSize(t.bodyW, t.bodyH).setOffset(
          (obs.width  - t.bodyW) / 2,
          (obs.height - t.bodyH) / 2);
        obs.setDepth(8);
      });
    }
    // overlap (não bloqueia): bate, tropeca, ameaca chega perto
    this.physics.add.overlap(this.player.sprite, this.obstacles,
      (_, obs) => this.hitObstacle(obs));
  }

  hitObstacle(obs) {
    if (obs.getData('hit') || this.time.now < this.obstacleCooldown) return;
    obs.setData('hit', true);
    this.obstacleCooldown = this.time.now + 600;       // evita multi-trigger
    this.player.react('stumble');
    this.player.slowdown(700, 0.35);
    this.threat.pullCloser(80);
    this.floatText('💥', '#ffd76a', this.player.sprite.x, this.player.sprite.y - 60, true);
    // o obstaculo "tomba" e some
    this.tweens.add({
      targets: obs, angle: 35, alpha: 0.25, y: obs.y + 8,
      duration: 320, ease: 'Quad.easeOut',
      onComplete: () => obs.body && (obs.body.enable = false),
    });
  }

  buildCheckpoints() {
    this.checkpoints = [];
    for (let i = 0; i < this.quiz.total; i++) {
      const x = START_X + (i + 1) * CHECKPOINT_SPACING;
      const sign = this.add.image(x, this.groundY - 20, 'sign').setDepth(5);
      const badge = this.add.text(x, this.groundY - 76, `❓ ${i + 1}`, {
        fontSize: '16px', fontFamily: 'monospace', color: '#ffffff',
        backgroundColor: '#a35330', padding: { x: 6, y: 2 },
      }).setOrigin(0.5).setDepth(5);
      this.tweens.add({ targets: badge, y: badge.y - 6, yoyo: true, repeat: -1, duration: 800 });
      const zone = this.add.zone(x, this.groundY - 40, 60, 110);
      this.physics.add.existing(zone, true);
      const cp = { index: i, x, sign, badge, zone, done: false };
      this.physics.add.overlap(this.player.sprite, zone, () => this.reachCheckpoint(cp));
      this.checkpoints.push(cp);
    }
  }

  buildFinish() {
    this.add.image(this.finishX, this.groundY - 32, 'finish_flag').setDepth(5);
    const zone = this.add.zone(this.finishX, this.groundY - 40, 50, 120);
    this.physics.add.existing(zone, true);
    this.physics.add.overlap(this.player.sprite, zone, () => this.reachFinish());
  }

  // ───────────────────── input: tap = pular ─────────────────────
  setupInput() {
    // teclado p/ desenvolvimento (mas o jogo foi pensado pra touch)
    this.input.keyboard.on('keydown-SPACE', () => this.player.requestJump());
    this.input.keyboard.on('keydown-UP',    () => this.player.requestJump());
    this.input.keyboard.on('keydown-W',     () => this.player.requestJump());
    // tap em QUALQUER lugar da tela = pular
    this.input.on('pointerdown', () => {
      if (!this.questionOpen) this.player.requestJump();
    });
    // pista visual de toque
    this.tapHint = this.add.text(GAME_W / 2, GAME_H - 110, 'TOQUE PARA PULAR', {
      fontSize: '22px', fontFamily: 'monospace', fontStyle: 'bold',
      color: '#ffffff', stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(120);
    this.tweens.add({ targets: this.tapHint, alpha: 0.3, yoyo: true, repeat: -1, duration: 700 });
    this.time.delayedCall(3500, () => {
      this.tweens.add({ targets: this.tapHint, alpha: 0, duration: 400,
        onComplete: () => this.tapHint.destroy() });
    });
  }

  // ───────────────────── perguntas ─────────────────────
  reachCheckpoint(cp) {
    if (cp.done || this.questionOpen || cp.index !== this.progress.current) return;
    cp.done = true;
    this.questionOpen = true;
    this.questionStart = this.time.now;
    this.player.lock();
    this.threat.startChase();                       // timer visual ativo
    this.scene.launch('Question', {
      quiz: this.quiz,
      index: cp.index,
      startTime: this.questionStart,
      onResult: r => this.handleResult(cp, r),
      onClosed: () => this.closeQuestion(),
    });
  }

  handleResult(cp, result) {
    this.lastResult = result;
    this.threat.stopChase();
    this.scoreMgr.setScore(result.total_score);
    this.progress.registerAnswer(result.correct);
    cp.badge.setText(result.correct ? '✔' : '✘')
      .setBackgroundColor(result.correct ? '#2e9e5b' : '#c0392b');

    if (result.correct) {
      this.scoreMgr.addHit();
      this.player.react('correct');
      this.threat.pushBack(result.fast ? 360 : 260);
      this.sparkle(this.player.sprite.x, this.player.sprite.y - 40, 'star');
      if (result.fast) this.floatText('+RÁPIDO! 🚀', '#ffd76a');
    } else {
      this.player.react('wrong', () => this.player.react('stumble'));
      this.threat.pullCloser(180);
      this.floatText(`Resposta certa: ${result.correct_option}`, '#ffd76a');
    }
  }

  closeQuestion() {
    this.questionOpen = false;
    // aplica os efeitos AO retomar a corrida (assim a fala da explicação não consome o boost)
    if (this.lastResult) {
      if (this.lastResult.correct) this.player.boost(1500, 1.6);
      else this.player.slowdown(900, 0.4);
      this.lastResult = null;
    }
    this.player.unlock();
  }

  catchPlayer() {
    if (this.time.now < this.invulnUntil) return;
    this.invulnUntil = this.time.now + 1800;
    const lives = this.scoreMgr.loseLife();
    this.cameras.main.shake(220, 0.012);
    this.player.react('stumble');
    this.threat.reset(this.player.sprite.x);
    if (this.questionOpen) this.scene.get('Question')?.forceTimeout();
    if (lives <= 0) this.gameOver();
    else this.floatText('-1 vida! 💔', '#ff8a8a');
  }

  reachFinish() {
    if (!this.progress.finished || this.finishedLevel) return;
    this.finishedLevel = true;
    this.player.lock();
    this.player.sprite.play('p_victory');
    this.threat.stopChase();
    this.time.delayedCall(1200, () => this.endGame(true));
  }

  gameOver() {
    if (this.finishedLevel) return;
    this.finishedLevel = true;
    this.player.lock();
    this.player.sprite.play('p_game_over');
    if (this.scene.get('Question')?.scene.isActive()) this.scene.stop('Question');
    this.time.delayedCall(1400, () => this.endGame(false));
  }

  endGame(victory) {
    this.scene.stop('Question');
    this.scene.start('Result', {
      victory, livesLeft: this.scoreMgr.lives,
      hits: this.scoreMgr.hits, total: this.quiz.total,
    });
  }

  // ───────────────────── HUD ─────────────────────
  buildHud() {
    const ui = (o) => o.setScrollFactor(0).setDepth(100);
    ui(this.add.rectangle(0, 0, GAME_W, 52, 0x000000, 0.35).setOrigin(0));

    this.heartIcons = [];
    for (let i = 0; i < this.scoreMgr.cfg.lives; i++) {
      this.heartIcons.push(ui(this.add.image(24 + i * 26, 26, 'heart').setScale(1.3)));
    }
    ui(this.add.image(150, 26, 'coin'));
    this.scoreText = ui(this.add.text(166, 17, '0', {
      fontSize: '20px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffd76a',
    }));
    this.qText = ui(this.add.text(GAME_W / 2, 9, '', {
      fontSize: '15px', fontFamily: 'monospace', color: '#ffffff',
    }).setOrigin(0.5, 0));
    ui(this.add.rectangle(GAME_W / 2, 40, 322, 12).setStrokeStyle(2, 0xffffff));
    this.progFill = ui(this.add.rectangle(GAME_W / 2 - 160, 40, 1, 8, 0x37b96c).setOrigin(0, 0.5));
    ui(this.add.text(GAME_W - 250, 8, '🌪️ perigo', {
      fontSize: '13px', fontFamily: 'monospace', color: '#ffffff',
    }));
    ui(this.add.rectangle(GAME_W - 150, 36, 222, 12).setStrokeStyle(2, 0xffffff));
    this.dangerFill = ui(this.add.rectangle(GAME_W - 260, 36, 1, 8, 0xff5d5d).setOrigin(0, 0.5));
  }

  updateHud() {
    this.heartIcons.forEach((h, i) => h.setAlpha(i < this.scoreMgr.lives ? 1 : 0.18));
    this.scoreText.setText(String(this.scoreMgr.score));
    this.qText.setText(
      `Pergunta ${Math.min(this.progress.current + 1, this.quiz.total)}/${this.quiz.total}` +
      `  ·  ${Math.round(this.progress.pct * 100)}%`);
    this.progFill.width = Math.max(1, 320 * this.progress.pct);
    const danger = 1 - this.threat.safety(this.player.sprite.x);
    this.dangerFill.width = Math.max(1, 220 * danger);
  }

  // ───────────────────── efeitos ─────────────────────
  sparkle(x, y, key) {
    for (let i = 0; i < 6; i++) {
      const s = this.add.image(x, y, key).setDepth(50);
      this.tweens.add({
        targets: s,
        x: x + Phaser.Math.Between(-60, 60),
        y: y - Phaser.Math.Between(20, 80),
        alpha: 0, scale: 0.4,
        duration: 700, delay: i * 50,
        onComplete: () => s.destroy(),
      });
    }
  }

  floatText(msg, color, x = null, y = null, world = false) {
    const t = this.add.text(x ?? GAME_W / 2, y ?? 110, msg, {
      fontSize: '24px', fontFamily: 'monospace', fontStyle: 'bold',
      color, stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(120);
    if (!world) t.setScrollFactor(0);
    this.tweens.add({ targets: t, y: t.y - 40, alpha: 0, duration: 1400,
      onComplete: () => t.destroy() });
  }

  // ───────────────────── loop ─────────────────────
  update(time, delta) {
    if (this.finishedLevel) return;
    const dt = delta / 1000;
    this.player.update();
    this.threat.update(dt, this.player.sprite.x);
    if (this.threat.caught(this.player.sprite.x)) this.catchPlayer();
    this.updateHud();
  }
}
