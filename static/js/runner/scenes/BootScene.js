/* ═══════════════════════════════════════════════════════════════
   BootScene.js — v2 (corrigido)
   BUG CORRIGIDO: loading-screen agora some com fade-out suave
   antes de ir para PreloadScene.
═══════════════════════════════════════════════════════════════ */

class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'BootScene' }); }

  create() {
    const el = document.getElementById('loading-screen');
    if (el) {
      el.classList.add('fade-out');
      // Remove do DOM após a transição CSS (0.4s)
      setTimeout(() => el.remove(), 450);
    }
    this.scene.start('PreloadScene');
  }
}