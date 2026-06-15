// ── ThreatController: o "Redemoinho" — cronômetro visual ──────
// A ameaça persegue o jogador. Enquanto uma pergunta está aberta,
// ela avança numa velocidade calibrada para alcançar o jogador em
// exatamente `answer_time_limit` segundos (é o timer visível).
export default class ThreatController {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x posição inicial (atrás do jogador)
   * @param {number} groundY topo do chão
   * @param {object} cfg GAME_CONFIG vindo do Flask
   */
  constructor(scene, x, groundY, cfg) {
    this.scene = scene;
    this.cfg = cfg;
    this.startGap = 380;                       // distância "cheia" até o jogador
    this.idleSpeed = 14 * cfg.threat_speed;    // rastejo constante (px/s)
    this.chaseSpeed = (this.startGap / cfg.answer_time_limit) * cfg.threat_speed;
    this.chasing = false;

    if (!scene.anims.exists('threat_spin')) {
      scene.anims.create({
        key: 'threat_spin',
        frames: scene.anims.generateFrameNumbers('threat', { start: 0, end: 3 }),
        frameRate: 10,
        repeat: -1,
      });
    }
    this.sprite = scene.add.sprite(x, groundY - 32, 'threat')
      .setDepth(9).setScale(1.6).play('threat_spin');
  }

  /** Pergunta aberta → modo perseguição (timer visual correndo). */
  startChase() { this.chasing = true; }
  stopChase()  { this.chasing = false; }

  /** Resposta certa empurra a ameaça para trás. */
  pushBack(px = 260) {
    this.scene.tweens.add({
      targets: this.sprite,
      x: this.sprite.x - px,
      duration: 450,
      ease: 'Cubic.easeOut',
    });
  }

  /** Resposta errada puxa a ameaça para perto. */
  pullCloser(px = 120) {
    this.scene.tweens.add({
      targets: this.sprite,
      x: this.sprite.x + px,
      duration: 350,
      ease: 'Cubic.easeIn',
    });
  }

  /** Recuo grande após capturar o jogador (perdeu vida). */
  reset(playerX) {
    this.sprite.x = playerX - this.startGap;
  }

  /** Distância atual até o jogador (para HUD/tensão). 0..1, 1 = seguro. */
  safety(playerX) {
    return Phaser.Math.Clamp((playerX - this.sprite.x) / this.startGap, 0, 1);
  }

  caught(playerX) {
    return this.sprite.x >= playerX - 26;
  }

  update(dt, playerX) {
    const speed = this.chasing ? this.chaseSpeed : this.idleSpeed;
    this.sprite.x += speed * dt;
    // nunca passa muito do jogador (efeito visual)
    this.sprite.x = Math.min(this.sprite.x, playerX + 10);
    // tensão visual: cresce quando está perto
    const danger = 1 - this.safety(playerX);
    this.sprite.setScale(1.6 + danger * 0.5);
    this.sprite.setAlpha(0.85 + danger * 0.15);
  }
}
