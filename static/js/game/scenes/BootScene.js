// ── BootScene: configurações mínimas antes do Preload ─────────
export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    this.scale.lockOrientation && this.scale.lockOrientation('landscape');
    this.scene.start('Preload');
  }
}
