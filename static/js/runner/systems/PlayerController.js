/* ═══════════════════════════════════════════════════════════════
   PlayerController.js — v2 (corrigido)
   BUG CORRIGIDO: usa chaves player_STATE_FRAME em vez de
   generateFrameNumbers (CanvasTextures não têm frames numerados).
   As animações já foram registradas no PreloadScene.
═══════════════════════════════════════════════════════════════ */

class PlayerController {
  constructor(scene, x, y) {
    this.scene  = scene;
    // Frame inicial: primeiro frame do idle
    this.sprite = scene.add.sprite(x, y, 'player_idle_0').setScale(2.5);
    this.state  = 'idle';
    this.playState('run');
  }

  playState(state, onComplete) {
    const map = {
      idle:     'anim_idle',
      run:      'anim_run',
      dash:     'anim_dash',
      correct:  'anim_correct',
      wrong:    'anim_wrong',
      stumble:  'anim_stumble',
      scared:   'anim_scared',
      gameover: 'anim_gameover',
    };
    const animKey = map[state] || 'anim_idle';
    if (this.state === state && this.sprite.anims.isPlaying) return;
    this.state = state;
    this.sprite.play(animKey);
    if (onComplete) {
      this.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, onComplete);
    }
  }

  onCorrect(fast, thenState = 'run') {
    this.scene.tweens.add({
      targets: this.sprite, tint: 0x2ecc71, duration: 100,
      yoyo: true, repeat: 1,
      onComplete: () => this.sprite.clearTint()
    });
    this.scene.tweens.add({
      targets: this.sprite,
      y: this.sprite.y - (fast ? 28 : 16),
      duration: 180, ease: 'Power2', yoyo: true
    });
    this.playState('correct', () => this.playState(thenState));
  }

  onWrong(thenState = 'run') {
    this.scene.tweens.add({
      targets: this.sprite, tint: 0xe74c3c, duration: 80,
      yoyo: true, repeat: 3,
      onComplete: () => this.sprite.clearTint()
    });
    this.scene.tweens.add({
      targets: this.sprite, x: this.sprite.x + 8,
      duration: 55, ease: 'Power1', yoyo: true, repeat: 4
    });
    this.playState('stumble', () => this.playState(thenState));
  }

  onThreatClose() { if (this.state !== 'scared') this.playState('scared'); }
  onThreatFar()   { if (this.state === 'scared') this.playState('run');    }
  onGameOver()    { this.playState('gameover'); }

  update(speed) {
    const lean = Math.min((speed - 1.0) * 5, 10);
    this.sprite.setAngle(-lean);
    if (speed >= 1.8 && this.state === 'run') this.playState('dash');
    else if (speed < 1.8 && this.state === 'dash') this.playState('run');
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }
  setPosition(x, y) { this.sprite.setPosition(x, y); }
  setDepth(d) { this.sprite.setDepth(d); return this; }
}