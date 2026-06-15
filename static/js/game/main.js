// ── Aventura Quiz 2D · ponto de entrada do Phaser ─────────────
import BootScene from './scenes/BootScene.js';
import PreloadScene from './scenes/PreloadScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import QuestionScene from './scenes/QuestionScene.js';
import ResultScene from './scenes/ResultScene.js';

export const GAME_W = 960;
export const GAME_H = 540;

// Mapeamento do spritesheet do jogador (static/img/player/player_spritesheet.png)
// Grade fixa: 6 colunas x 11 linhas, frames de 48x64 px.
// indice do frame = linha * 6 + coluna
export const PLAYER_SHEET = {
  frameWidth: 48,
  frameHeight: 64,
  columns: 6,
  rows: {
    idle:      { row: 0,  frames: 4, rate: 5,  repeat: -1 },
    walk:      { row: 1,  frames: 6, rate: 9,  repeat: -1 },
    run:       { row: 2,  frames: 6, rate: 13, repeat: -1 },
    jump:      { row: 3,  frames: 2, rate: 6,  repeat: 0  },
    fall:      { row: 4,  frames: 2, rate: 6,  repeat: -1 },
    correct:   { row: 5,  frames: 4, rate: 8,  repeat: 1  },
    wrong:     { row: 6,  frames: 4, rate: 8,  repeat: 1  },
    stumble:   { row: 7,  frames: 4, rate: 10, repeat: 0  },
    scared:    { row: 8,  frames: 4, rate: 8,  repeat: -1 },
    victory:   { row: 9,  frames: 4, rate: 6,  repeat: -1 },
    game_over: { row: 10, frames: 4, rate: 4,  repeat: 0  },
  },
};

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: GAME_W,
  height: GAME_H,
  pixelArt: true,                       // mantém o visual pixelado nítido
  backgroundColor: '#79c0ef',
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 1000 }, debug: false },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, PreloadScene, MenuScene, GameScene, QuestionScene, ResultScene],
};

window.addEventListener('load', () => {
  window.QUIZ_GAME = new Phaser.Game(config);
});
