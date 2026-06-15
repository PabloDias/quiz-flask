// ── QuizManager: ponte entre o jogo e a API Flask ─────────────
// Toda validação de resposta acontece NO SERVIDOR (sem gabarito no cliente).
export default class QuizManager {
  constructor() {
    this.urls = window.GAME_BOOT.urls;
    this.modo = window.GAME_BOOT.modo;
    this.dificuldade = window.GAME_BOOT.dificuldade;
    this.questions = [];   // perguntas públicas (sem gabarito)
    this.config = null;    // GAME_CONFIG vindo do Flask
  }

  /** Sorteia uma nova rodada de perguntas no servidor. */
  async loadRound() {
    const url = `${this.urls.questions}?modo=${encodeURIComponent(this.modo)}` +
                `&dificuldade=${encodeURIComponent(this.dificuldade)}`;
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) throw new Error(`Falha ao carregar perguntas (${res.status})`);
    const data = await res.json();
    this.questions = data.questions;
    this.config = data.config;
    return data;
  }

  get total() { return this.questions.length; }
  question(i) { return this.questions[i]; }

  /**
   * Envia a resposta ao servidor.
   * optionId: 'A'..'D' ou 'TIMEOUT' (ameaça alcançou / tempo esgotado).
   * Retorna {correct, correct_option, explanation, points_awarded, total_score, fast}
   */
  async answer(questionIndex, optionId, timeTaken) {
    const res = await fetch(this.urls.answer, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question_index: questionIndex,
        option_id: optionId,
        time_taken: timeTaken,
      }),
    });
    if (!res.ok) throw new Error(`Falha ao validar resposta (${res.status})`);
    return res.json();
  }

  /** Encerra a partida; se nick for informado, salva no ranking. */
  async finish({ victory, livesLeft, nick }) {
    const res = await fetch(this.urls.finish, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ victory, lives_left: livesLeft, nick: nick || '' }),
    });
    if (!res.ok) throw new Error(`Falha ao finalizar (${res.status})`);
    return res.json();
  }
}
