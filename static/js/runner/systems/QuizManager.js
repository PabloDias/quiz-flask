/* ═══════════════════════════════════════════════════════════════
   QuizManager.js
   Gerencia comunicação com a API Flask do runner.
   Mantém estado local das perguntas e placar.
═══════════════════════════════════════════════════════════════ */

class QuizManager {
  constructor() {
    const cfg = window.RUNNER_CONFIG;
    this.questionsUrl = cfg.questionsUrl;
    this.answerUrl    = cfg.answerUrl;
    this.finishUrl    = cfg.finishUrl;
    this.modo         = cfg.modo;
    this.dificuldade  = cfg.dificuldade;

    this.questions    = [];   // lista pública recebida do servidor
    this.gameConfig   = {};   // GAME_CONFIG do servidor
    this.currentIndex = 0;
    this.questionStartTime = null;
  }

  // ─── Carrega perguntas ────────────────────────────────────────
  async loadQuestions() {
    const url = `${this.questionsUrl}?modo=${this.modo}&dificuldade=${this.dificuldade}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Erro ao carregar perguntas: ' + res.status);
    const data = await res.json();
    this.questions  = data.questions || [];
    this.gameConfig = data.config    || {};
    this.currentIndex = 0;
    return data;
  }

  get currentQuestion() {
    return this.questions[this.currentIndex] || null;
  }

  get totalQuestions() {
    return this.questions.length;
  }

  get isFinished() {
    return this.currentIndex >= this.questions.length;
  }

  startTimer() {
    this.questionStartTime = Date.now();
  }

  getElapsedSeconds() {
    if (!this.questionStartTime) return 999;
    return (Date.now() - this.questionStartTime) / 1000;
  }

  // ─── Envia resposta ao servidor ───────────────────────────────
  async sendAnswer(optionId) {
    const timeTaken = this.getElapsedSeconds();
    const res = await fetch(this.answerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question_index: this.currentIndex,
        option_id: optionId,
        time_taken: timeTaken
      })
    });
    if (!res.ok) throw new Error('Erro ao enviar resposta');
    const result = await res.json();
    return result;
    // result: { correct, correct_option, explanation, points_awarded, total_score, fast }
  }

  advance() {
    this.currentIndex++;
    this.questionStartTime = null;
  }

  // ─── Finaliza partida ─────────────────────────────────────────
  async finish(victory, livesLeft, nick = '') {
    const res = await fetch(this.finishUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ victory, lives_left: livesLeft, nick })
    });
    if (!res.ok) throw new Error('Erro ao finalizar');
    return await res.json();
    // result: { final_score, hits, saved, ranking_url }
  }
}