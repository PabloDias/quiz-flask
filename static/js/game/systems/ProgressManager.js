// ── ProgressManager: progresso da fase (0% → 100%) ────────────
// Cada pergunta é um checkpoint; o progresso só sobe com ACERTO.
export default class ProgressManager {
  constructor(totalQuestions) {
    this.total = totalQuestions;
    this.correct = 0;     // acertos (sobem o progresso)
    this.current = 0;     // índice do próximo checkpoint/pergunta
  }

  registerAnswer(correct) {
    if (correct) this.correct += 1;
    this.current += 1;
  }

  /** 0..1 — fração de checkpoints respondidos corretamente. */
  get pct() { return this.total ? this.correct / this.total : 0; }

  /** 0..1 — quanto da fase já foi percorrido (perguntas respondidas). */
  get traveled() { return this.total ? this.current / this.total : 0; }

  get finished() { return this.current >= this.total; }
}
