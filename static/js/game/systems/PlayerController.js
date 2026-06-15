// ── PlayerController: corredor automático estilo runner ───────
// O personagem corre SEMPRE para a direita. O único input é "pular"
// (toque na tela / clique / espaço / seta-cima), tratado pela GameScene.
import { PLAYER_SHEET } from '../main.js';

export default class PlayerController {
  constructor(scene, x, y) {
    this.scene = scene;
    this.locked = false;            // true em perguntas/cutscenes/vitória
    this.runSpeed = 280;            // velocidade base do auto-run
    this.runSpeedFactor = 1;        // 1 normal · <1 lento · >1 boost
    this.jumpVel = -560;
    this.canDoubleJump = false;     // pequeno toque extra no ar (qualidade de vida)

    this.sprite = scene.physics.add.sprite(x, y, 'player');
    this.sprite.setCollideWorldBounds(true);
    this.sprite.body.setSize(28, 58).setOffset(10, 6);
    this.sprite.setDepth(10);

    this.createAnimations();
    this.sprite.play('p_idle');                       // meio segundo parado
    scene.time.delayedCall(450, () => {
      if (!this.locked) this.sprite.play('p_run');
    });
  }

  createAnimations() {
    const anims = this.scene.anims;
    Object.entries(PLAYER_SHEET.rows).forEach(([name, def]) => {
      const key = `p_${name}`;
      if (anims.exists(key)) return;
      anims.create({
        key,
        frames: anims.generateFrameNumbers('player', {
          start: def.row * PLAYER_SHEET.columns,
          end: def.row * PLAYER_SHEET.columns + def.frames - 1,
        }),
        frameRate: def.rate,
        repeat: def.repeat,
      });
    });
  }

  /** Solicita um pulo. Chamado pela GameScene em pointerdown / espaço / W / ↑. */
  requestJump() {
    if (this.locked) return;
    const onGround = this.sprite.body.blocked.down;
    if (onGround) {
      this.sprite.setVelocityY(this.jumpVel);
      this.canDoubleJump = true;
    } else if (this.canDoubleJump) {
      this.sprite.setVelocityY(this.jumpVel * 0.85);  // pulo duplo um pouco mais fraco
      this.canDoubleJump = false;
    }
  }

  /** Toca animação de reação (correct/wrong/stumble) sem travar o auto-run. */
  react(name, onDone) {
    this.sprite.play(`p_${name}`);
    this.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      if (onDone) onDone();
    });
  }

  /** Boost temporário (resposta correta). */
  boost(duration = 1500, factor = 1.6) {
    this.runSpeedFactor = factor;
    this.scene.time.delayedCall(duration, () => { this.runSpeedFactor = 1; });
  }

  /** Lentidão temporária (bateu em obstáculo ou errou pergunta). */
  slowdown(duration = 900, factor = 0.35) {
    this.runSpeedFactor = factor;
    this.scene.time.delayedCall(duration, () => { this.runSpeedFactor = 1; });
  }

  lock() {
    this.locked = true;
    this.sprite.setVelocityX(0);
    this.sprite.play('p_idle');
  }

  unlock() {
    this.locked = false;
  }

  update() {
    const s = this.sprite;
    if (this.locked) return;            // parado durante perguntas

    s.setFlipX(false);                  // sempre virado para a direita
    s.setVelocityX(this.runSpeed * this.runSpeedFactor);

    const cur = s.anims.currentAnim?.key;
    const reacting = ['p_correct', 'p_wrong', 'p_stumble'].includes(cur) && s.anims.isPlaying;
    if (reacting) return;               // deixa a reação terminar
    const onGround = s.body.blocked.down;
    if (!onGround) {
      this.playIfNot(s.body.velocity.y < 0 ? 'p_jump' : 'p_fall');
    } else if (this.runSpeedFactor < 0.5) {
      this.playIfNot('p_walk');
    } else {
      this.playIfNot('p_run');
    }
  }

  playIfNot(key) {
    if (this.sprite.anims.currentAnim?.key !== key) this.sprite.play(key, true);
  }
}
