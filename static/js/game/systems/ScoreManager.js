// ── ScoreManager: pontuação, vidas e acertos (estado da partida) ──
export default class ScoreManager {
  constructor(cfg) {
    this.cfg = cfg;
    this.score = 0;
    this.lives = cfg.lives;
    this.hits = 0;
    this.events = new Phaser.Events.EventEmitter();
  }

  /** Sincroniza com o total calculado pelo servidor. */
  setScore(total) {
    this.score = total;
    this.events.emit('score', this.score);
  }

  addHit() { this.hits += 1; }

  loseLife() {
    this.lives = Math.max(0, this.lives - 1);
    this.events.emit('lives', this.lives);
    return this.lives;
  }

  get dead() { return this.lives <= 0; }
}
