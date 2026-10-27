/* ═══════════════════════════════════════════════════════════════
   UIManager.js — v2 (corrigido)
   BUG CORRIGIDO: botões agora recebem addEventListener via JS
   em vez de onclick="window._runnerAnswerClick()" que nunca
   foi definido no HTML original.
═══════════════════════════════════════════════════════════════ */

class UIManager {
  constructor(quizManager, scoreManager) {
    this.quiz  = quizManager;
    this.score = scoreManager;

    // Refs DOM
    this._overlay       = document.getElementById('question-overlay');
    this._qNumber       = document.getElementById('question-number');
    this._qText         = document.getElementById('question-text');
    this._timerFill     = document.getElementById('question-timer-fill');
    this._feedbackDiv   = document.getElementById('answer-feedback');
    this._feedbackIcon  = document.getElementById('feedback-icon');
    this._feedbackText  = document.getElementById('feedback-text');
    this._explanText    = document.getElementById('explanation-text');
    this._hud           = document.getElementById('game-hud');
    this._scoreVal      = document.getElementById('score-value');
    this._comboDiv      = document.getElementById('hud-combo');
    this._comboVal      = document.getElementById('combo-value');
    this._livesDiv      = document.getElementById('hud-lives');
    this._speedVal      = document.getElementById('speed-value');
    this._progressFill  = document.getElementById('hud-progress-fill');
    this._progressTxt   = document.getElementById('hud-progress-text');

    // Botões — pega por id, não por querySelectorAll
    this._btns = {
      A: document.getElementById('btn-A'),
      B: document.getElementById('btn-B'),
      C: document.getElementById('btn-C'),
      D: document.getElementById('btn-D'),
    };

    // Conecta callbacks de score ao HUD
    this.score.onScoreChange = v       => this._setScore(v);
    this.score.onLivesChange = (v, mx) => this._setLives(v, mx);
    this.score.onComboChange = v       => this._setCombo(v);
    this.score.onSpeedChange = v       => this._setSpeed(v);

    // Atalhos de teclado 1-4
    this._keyHandler = (e) => {
      if (!this._questionActive) return;
      const map = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };
      if (map[e.key]) this._triggerAnswer(map[e.key]);
    };
    document.addEventListener('keydown', this._keyHandler);

    this._questionActive   = false;
    this._answerCallback   = null;
    this._timeoutCallback  = null;
    this._timerInterval    = null;
  }

  // ─── HUD ──────────────────────────────────────────────────────
  showHUD() { this._hud.classList.remove('hidden'); }
  hideHUD() { this._hud.classList.add('hidden'); }

  _setScore(v) {
    if (this._scoreVal) this._scoreVal.textContent = v.toLocaleString('pt-BR');
  }
  _setSpeed(v) {
    if (this._speedVal) this._speedVal.textContent = v.toFixed(1);
  }
  _setLives(v, max) {
    if (this._livesDiv)
      this._livesDiv.textContent = '❤️'.repeat(Math.max(0, v)) + '🖤'.repeat(Math.max(0, max - v));
  }
  _setCombo(v) {
    if (!this._comboDiv) return;
    if (v >= 2) {
      this._comboDiv.classList.remove('hidden');
      this._comboVal.textContent = v;
    } else {
      this._comboDiv.classList.add('hidden');
    }
  }

  setProgress(answered, total) {
    if (!this._progressFill) return;
    const pct = total > 0 ? Math.round((answered / total) * 100) : 0;
    this._progressFill.style.width = pct + '%';
    if (this._progressTxt) this._progressTxt.textContent = `${answered}/${total}`;
  }

  // ─── Painel de perguntas ──────────────────────────────────────
  showQuestion(question, index, total, timeLimit, onAnswer) {
    this._answerCallback = onAnswer;
    this._questionActive = true;

    if (this._qNumber) this._qNumber.textContent = `Pergunta ${index + 1} / ${total}`;
    if (this._qText)   this._qText.textContent   = question.question;

    // Preenche e conecta os botões
    const opts = question.options; // [{id, text}, ...]
    ['A', 'B', 'C', 'D'].forEach((letter, i) => {
      const btn = this._btns[letter];
      if (!btn) return;
      const opt = opts[i];
      // Atualiza texto
      const textSpan = btn.querySelector('.btn-text');
      if (textSpan) textSpan.textContent = opt ? opt.text : '';
      // Atualiza data-option para a letra real vinda do servidor
      btn.dataset.option = opt ? opt.id : letter;
      btn.disabled = false;
      btn.className = 'answer-btn';
      // Remove listener anterior e adiciona novo
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      this._btns[letter] = newBtn;
      newBtn.querySelector('.btn-text').textContent = opt ? opt.text : '';
      newBtn.dataset.option = opt ? opt.id : letter;
      newBtn.addEventListener('click', () => this._triggerAnswer(opt ? opt.id : letter));
    });

    // Esconde feedback anterior
    if (this._feedbackDiv) {
      this._feedbackDiv.classList.add('hidden');
      this._feedbackDiv.classList.remove('is-wrong');
    }
    if (this._explanText) this._explanText.classList.add('hidden');

    this._startTimerBar(timeLimit);
    if (this._overlay) this._overlay.classList.remove('hidden');
  }

  _triggerAnswer(optionId) {
    if (!this._questionActive) return;
    this._questionActive = false;
    this._stopTimerBar();
    if (this._answerCallback) this._answerCallback(optionId);
  }

  showFeedback(result, onNext) {
    // Desabilita todos os botões
    Object.values(this._btns).forEach(btn => { if (btn) btn.disabled = true; });
    this._stopTimerBar();
    this._questionActive = false;

    // Destaca correto / errado
    Object.values(this._btns).forEach(btn => {
      if (!btn) return;
      if (btn.dataset.option === result.correct_option) {
        btn.classList.add('correct');
      }
    });

    // Feedback
    if (this._feedbackDiv) {
      this._feedbackDiv.classList.toggle('is-wrong', !result.correct);
      this._feedbackDiv.classList.remove('hidden');
    }
    if (this._feedbackIcon)
      this._feedbackIcon.textContent = result.correct ? (result.fast ? '⚡' : '✅') : '❌';
    if (this._feedbackText)
      this._feedbackText.textContent = result.correct
        ? `Correto! +${result.points_awarded} pts` + (result.fast ? ' (rápido!)' : '')
        : `Errado! ${result.points_awarded} pts`;

    if (result.explanation && this._explanText) {
      this._explanText.textContent = '💡 ' + result.explanation;
      this._explanText.classList.remove('hidden');
    }

    const delay = result.correct ? 1400 : (result.explanation ? 2800 : 1900);
    setTimeout(() => {
      this.hideQuestion();
      if (onNext) onNext();
    }, delay);
  }

  hideQuestion() {
    if (this._overlay) this._overlay.classList.add('hidden');
    this._questionActive = false;
    this._stopTimerBar();
  }

  // ─── Timer bar ────────────────────────────────────────────────
  _startTimerBar(seconds) {
    this._stopTimerBar();
    if (!this._timerFill) return;
    const start = Date.now();
    this._timerFill.style.transition = 'none';
    this._timerFill.style.width = '100%';
    this._timerFill.classList.remove('danger');

    this._timerInterval = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const pct     = Math.max(0, 1 - elapsed / seconds) * 100;
      this._timerFill.style.transition = 'width 0.09s linear';
      this._timerFill.style.width = pct + '%';
      if (pct < 30) this._timerFill.classList.add('danger');
      if (pct <= 0) {
        this._stopTimerBar();
        if (this._questionActive) {
          this._questionActive = false;
          if (this._timeoutCallback) this._timeoutCallback();
        }
      }
    }, 80);
  }

  _stopTimerBar() {
    if (this._timerInterval) { clearInterval(this._timerInterval); this._timerInterval = null; }
  }

  setTimeoutCallback(fn) { this._timeoutCallback = fn; }

  // ─── Pontos flutuantes ────────────────────────────────────────
  showFloatingPoints(points, x, y) {
    const el = document.createElement('div');
    el.className = 'floating-points ' + (points > 0 ? 'positive' : 'negative');
    el.textContent = (points > 0 ? '+' : '') + points;
    el.style.left = x + 'px';
    el.style.top  = y + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1500);
  }

  // ─── Limpeza ──────────────────────────────────────────────────
  destroy() {
    document.removeEventListener('keydown', this._keyHandler);
    this._stopTimerBar();
    this.hideQuestion();
    this.hideHUD();
  }
}