/* ═══════════════════════════════════════════════════════════════
   main.js — Bootstrap do Phaser 3
   Configura e inicia o jogo. Todos os parâmetros globais ficam
   no objeto window.RUNNER_CONFIG injetado pelo Flask no HTML.
═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // Aguarda o DOM estar pronto
  window.addEventListener('load', function () {

    // Dimensões: 16:9, responsivo
    const BASE_W = 800;
    const BASE_H = 450;

    const config = {
      type: Phaser.AUTO,             // WebGL com fallback para Canvas
      width:  BASE_W,
      height: BASE_H,
      parent: 'game-container',
      backgroundColor: '#87ceeb',
      pixelArt: true,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 }, debug: false }
      },
      scene: [
        BootScene,
        PreloadScene,
        MenuScene,
        RunnerScene,
        ResultScene
      ]
    };

    window._phaserGame = new Phaser.Game(config);

  });

})();