/* ═══════════════════════════════════════════════════════════════
   ThreatController.js — v2 (corrigido)
   BUG CORRIGIDO: sprite inicia com 'threat_0' (frame individual)
   em vez de 'threat'. Animação já registrada no PreloadScene.
═══════════════════════════════════════════════════════════════ */

class ThreatController {
  constructor(scene, config) {
    this.scene    = scene;
    this.config   = config;
    this.distance = 1.2;
    this.caught   = false;

    this.approachRate = (config.threat_speed || 1.0) * 0.011;
    this.answerTime   = config.answer_time_limit || 15;

    const H = scene.scale.height;
    // Inicia com primeiro frame da ameaça
    this.sprite = scene.add.sprite(-80, H * 0.63, 'threat_0').setScale(2.2);
    this.sprite.play('anim_threat');
    this._updatePosition();

    this._buildDistBar(scene);

    this.onCatch   = null;
    this.onWarning = null;
  }

  update(delta, questionActive) {
    if (this.caught) return;

    if (questionActive) {
      this.distance -= this.approachRate * (delta / 16.67);
    } else {
      this.distance = Math.min(this.distance + 0.003, 1.2);
    }

    this.distance = Phaser.Math.Clamp(this.distance, 0, 2.0);
    this._updatePosition();
    this._updateDistBar();

    if (this.onWarning) this.onWarning(this.distance < 0.35);

    if (this.distance <= 0 && !this.caught) {
      this.caught = true;
      if (this.onCatch) this.onCatch();
    }
  }

  onCorrect(fast) {
    this.distance = Math.min(2.0, this.distance + (fast ? 0.45 : 0.28));
    this.scene.tweens.add({ targets: this.sprite, alpha: 0.4, duration: 200, yoyo: true });
    this.caught = false;
  }

  onWrong() {
    this.distance = Math.max(0, this.distance - 0.22);
    this.sprite.setTint(0xff6b35);
    this.scene.time.delayedCall(300, () => this.sprite.clearTint());
    this.scene.cameras.main.shake(140, 0.007);
  }

  onTimeout() {
    this.distance = Math.max(0, this.distance - 0.35);
    this.scene.cameras.main.shake(200, 0.012);
  }

  _updatePosition() {
    const playerX = 180;
    const targetX = -100 + (playerX + 80) * this.distance;
    this.sprite.x = Phaser.Math.Clamp(targetX, -120, playerX - 20);
    const scale = Phaser.Math.Linear(2.8, 1.8, this.distance / 2.0);
    const alpha = Phaser.Math.Linear(0.95, 0.5, this.distance / 2.0);
    this.sprite.setScale(scale).setAlpha(alpha);
    this.sprite.setDepth(this.distance < 0.3 ? 20 : 5);
  }

  _buildDistBar(scene) {
    this.distBg   = scene.add.graphics().setDepth(30);
    this.distFill = scene.add.graphics().setDepth(31);
    this._updateDistBar();
  }

  _updateDistBar() {
    if (!this.distBg) return;
    const H = this.scene.scale.height;
    const bx = 8, by = 55, bw = 10, bh = H - 120;
    this.distBg.clear();
    this.distBg.fillStyle(0x000000, 0.4);
    this.distBg.fillRect(bx, by, bw, bh);
    this.distFill.clear();
    const pct   = Phaser.Math.Clamp(this.distance / 1.5, 0, 1);
    const fillH = bh * pct;
    const color = pct > 0.5 ? 0x27ae60 : pct > 0.25 ? 0xf39c12 : 0xe74c3c;
    this.distFill.fillStyle(color, 0.9);
    this.distFill.fillRect(bx, by + bh - fillH, bw, fillH);
    // Ícone topo
    this.distBg.fillStyle(0xe74c3c, 0.85);
    this.distBg.fillRect(bx, by - 13, bw, 11);
  }

  get distancePct() { return Phaser.Math.Clamp(this.distance / 1.5, 0, 1); }
}