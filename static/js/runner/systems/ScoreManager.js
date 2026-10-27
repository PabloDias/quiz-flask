/* ═══════════════════════════════════════════════════════════════
   ScoreManager.js
   Gerencia pontuação, vidas, combo e velocidade do runner.
═══════════════════════════════════════════════════════════════ */

class ScoreManager {
  constructor(gameConfig) {
    const cfg = gameConfig || {};
    this.maxLives     = cfg.lives         || 3;
    this.lives        = this.maxLives;
    this.score        = 0;
    this.combo        = 0;
    this.maxCombo     = 0;
    this.speed        = 1.0;             // multiplicador de velocidade
    this.maxSpeed     = 2.5;
    this.speedStep    = 0.1;
    this.speedDecay   = 0.15;
    this.hits         = 0;
    this.misses       = 0;

    // Callbacks para atualizar o HUD
    this.onScoreChange = null;
    this.onLivesChange = null;
    this.onComboChange = null;
    this.onSpeedChange = null;
  }

  // ─── Resposta correta ─────────────────────────────────────────
  correct(pointsFromServer, fast = false) {
    this.score = Math.max(0, this.score + pointsFromServer);
    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    this.hits++;

    // Bônus de combo extra
    if (this.combo >= 3) {
      const comboBonus = Math.floor(this.combo / 3) * 10;
      this.score += comboBonus;
    }

    // Aumenta velocidade
    this.speed = Math.min(this.maxSpeed, this.speed + this.speedStep * (fast ? 2 : 1));

    this._emit();
    return { combo: this.combo, speed: this.speed };
  }

  // ─── Resposta errada ──────────────────────────────────────────
  wrong(pointsFromServer) {
    // pointsFromServer já é negativo ou zero (vindo do servidor)
    this.score = Math.max(0, this.score + pointsFromServer);
    this.combo = 0;
    this.misses++;

    // Reduz velocidade
    this.speed = Math.max(0.6, this.speed - this.speedDecay);
    this._emit();
    return { speed: this.speed };
  }

  // ─── Perder vida ──────────────────────────────────────────────
  loseLife() {
    this.lives = Math.max(0, this.lives - 1);
    this.combo = 0;
    this._emit();
    return this.lives;
  }

  get isDead() { return this.lives <= 0; }

  get progressPct() {
    // Será atualizado externamente pelo RunnerScene
    return this._progressPct || 0;
  }

  set progressPct(v) { this._progressPct = v; }

  _emit() {
    if (this.onScoreChange) this.onScoreChange(this.score);
    if (this.onLivesChange) this.onLivesChange(this.lives, this.maxLives);
    if (this.onComboChange) this.onComboChange(this.combo);
    if (this.onSpeedChange) this.onSpeedChange(this.speed);
  }

  summary() {
    return {
      score:    this.score,
      hits:     this.hits,
      misses:   this.misses,
      maxCombo: this.maxCombo,
      lives:    this.lives
    };
  }
}