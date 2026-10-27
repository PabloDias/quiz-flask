/* ═══════════════════════════════════════════════════════════════
   PreloadScene.js — v2 (corrigido)
   
   BUG CORRIGIDO: CanvasTexture não suporta generateFrameNumbers.
   Solução: cada frame vira uma textura separada (ex: player_idle_0,
   player_idle_1 ...) e as animações referenciam essas chaves.
   Isso é 100% compatível com Phaser 3 e funciona sem PNGs.
═══════════════════════════════════════════════════════════════ */

class PreloadScene extends Phaser.Scene {
  constructor() { super({ key: 'PreloadScene' }); }

  preload() {
    this._showLoadingBar();
  }

  create() {
    this._generateAllAssets();
    this.scene.start('MenuScene');
  }

  _showLoadingBar() {
    const bar = document.getElementById('loading-bar');
    const txt = document.getElementById('loading-text');
    if (!bar) return;
    let p = 0;
    const iv = setInterval(() => {
      p = Math.min(p + 10, 95);
      bar.style.width = p + '%';
      if (txt) txt.textContent = 'Preparando assets... ' + p + '%';
      if (p >= 95) clearInterval(iv);
    }, 40);
  }

  _generateAllAssets() {
    // Cria cada frame como textura individual nomeada player_STATE_FRAME
    this._makePlayerFrames();
    this._makeThreatFrames();
    this._makeBackgrounds();
    this._makeExtras();

    // Registra todas as animações uma vez só aqui
    this._registerAllAnims();
  }

  // ─── PERSONAGEM — 1 CanvasTexture por frame ───────────────────
  _makePlayerFrames() {
    const FW = 48, FH = 64;

    const states = {
      idle:     this._drawIdle.bind(this),
      run:      this._drawRun.bind(this),
      dash:     this._drawDash.bind(this),
      correct:  this._drawCorrect.bind(this),
      wrong:    this._drawWrong.bind(this),
      stumble:  this._drawStumble.bind(this),
      scared:   this._drawScared.bind(this),
      gameover: this._drawGameover.bind(this),
    };

    for (const [state, drawFn] of Object.entries(states)) {
      for (let f = 0; f < 4; f++) {
        const key = `player_${state}_${f}`;
        if (this.textures.exists(key)) continue;
        const ct  = this.textures.createCanvas(key, FW, FH);
        const ctx = ct.getContext();
        ctx.clearRect(0, 0, FW, FH);
        drawFn(ctx, FW, FH, f);
        ct.refresh();
      }
    }
  }

  // ─── Helper: corpo base do personagem ────────────────────────
  _body(ctx, opts = {}) {
    const {
      shirt  = '#c0392b',
      skin   = '#f4c07a',
      pants  = '#5d6d7e',
      shoes  = '#7d5a3c',
      legOff = 0,
      bodyDY = 0,
      lean   = 0,
    } = opts;

    ctx.save();
    ctx.translate(24, 8 + bodyDY); // centro do personagem

    // Sombra
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(0, 52, 11, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Sapatos
    ctx.fillStyle = shoes;
    ctx.fillRect(-11 + legOff, 46, 10, 6);
    ctx.fillRect(  1 - legOff, 46, 10, 6);

    // Pernas
    ctx.fillStyle = pants;
    ctx.fillRect(-10 + legOff, 32, 8, 15);
    ctx.fillRect(  2 - legOff, 32, 8, 15);

    // Cinto
    ctx.fillStyle = '#8b6914';
    ctx.fillRect(-12, 30, 24, 4);

    // Corpo (polo)
    ctx.fillStyle = shirt;
    ctx.fillRect(-12 + lean, 9, 24, 22);

    // Braços
    ctx.fillStyle = shirt;
    ctx.fillRect(-18 + lean, 11, 7, 16);
    ctx.fillRect( 11 + lean, 11, 7, 16);
    // Mãos
    ctx.fillStyle = skin;
    ctx.fillRect(-18 + lean, 25, 7, 5);
    ctx.fillRect( 11 + lean, 25, 7, 5);

    // Colarinho
    ctx.fillStyle = skin;
    ctx.fillRect(-4, 9, 8, 5);

    // Cabeça
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(0, 0, 11, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Orelhas
    ctx.fillRect(-14, -3, 4, 7);
    ctx.fillRect( 10, -3, 4, 7);

    // Olhos
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(-5, -4, 3, 3);
    ctx.fillRect( 2, -4, 3, 3);

    // Boca
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(-3, 3, 6, 2);

    ctx.restore();
  }

  // ─── Frames por estado ────────────────────────────────────────
  _drawIdle(ctx, fw, fh, f) {
    const dy = Math.sin((f / 4) * Math.PI * 2) * 1.5;
    this._body(ctx, { bodyDY: dy });
  }

  _drawRun(ctx, fw, fh, f) {
    const offs = [5, 0, -5, 0];
    const dys  = [-2, 0, -2, 0];
    this._body(ctx, { legOff: offs[f], bodyDY: dys[f], lean: 2 });
  }

  _drawDash(ctx, fw, fh, f) {
    // Rastro de velocidade
    ctx.fillStyle = `rgba(249,194,46,${0.12 + f * 0.04})`;
    ctx.fillRect(0, 0, fw * 0.45, fh);
    this._body(ctx, { legOff: (f % 2 === 0 ? 7 : -7), bodyDY: f % 2 === 0 ? -3 : 0, lean: 5, shirt: '#e74c3c' });
    // Linhas de velocidade
    ctx.fillStyle = '#f9c22e';
    for (let l = 0; l < 3; l++) ctx.fillRect(2, 14 + l * 12, 10 - l * 2, 3);
  }

  _drawCorrect(ctx, fw, fh, f) {
    this._body(ctx, { shirt: '#27ae60', bodyDY: f < 2 ? -6 : 0 });
    if (f < 2) { ctx.fillStyle = '#f9c22e'; ctx.font = 'bold 14px monospace'; ctx.fillText('★', 30, 12); }
  }

  _drawWrong(ctx, fw, fh, f) {
    const shk = f % 2 === 0 ? -2 : 2;
    ctx.save(); ctx.translate(shk, 0);
    this._body(ctx, { shirt: '#e74c3c', bodyDY: 3 });
    ctx.restore();
    ctx.fillStyle = '#e74c3c'; ctx.font = 'bold 14px monospace'; ctx.fillText('✕', 30, 12);
  }

  _drawStumble(ctx, fw, fh, f) {
    ctx.save();
    ctx.translate(24, 32);
    ctx.rotate((f * 0.25) - 0.2);
    ctx.translate(-24, -32);
    this._body(ctx, { shirt: '#c0392b', bodyDY: 6 });
    ctx.restore();
    ctx.fillStyle = '#f9c22e'; ctx.font = '11px monospace'; ctx.fillText('💫', 30, 12);
  }

  _drawScared(ctx, fw, fh, f) {
    const shk = f % 2 === 0 ? 0 : 2;
    this._body(ctx, { legOff: f % 2 === 0 ? 4 : -4, lean: 4, shirt: '#8e44ad', bodyDY: shk });
    // Gotas de suor
    ctx.fillStyle = '#74b9ff';
    ctx.fillRect(36, 12, 4, 4);
  }

  _drawGameover(ctx, fw, fh, f) {
    ctx.save();
    ctx.translate(24, 42);
    ctx.rotate(1.4);
    ctx.translate(-24, -42);
    this._body(ctx, { shirt: '#7f8c8d' });
    ctx.restore();
    ctx.fillStyle = '#e74c3c'; ctx.font = 'bold 10px monospace';
    ctx.fillText('×', 13, 15); ctx.fillText('×', 23, 15);
  }

  // ─── AMEAÇA — Nuvem de Poeira ─────────────────────────────────
  _makeThreatFrames() {
    for (let f = 0; f < 4; f++) {
      const key = `threat_${f}`;
      if (this.textures.exists(key)) continue;
      const ct  = this.textures.createCanvas(key, 64, 48);
      const ctx = ct.getContext();
      ctx.clearRect(0, 0, 64, 48);
      const w = Math.sin(f * 1.2) * 3;

      ctx.fillStyle = 'rgba(139,90,43,0.88)';
      ctx.beginPath(); ctx.ellipse(32 + w, 30, 28, 17, 0, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = 'rgba(180,120,60,0.72)';
      ctx.beginPath(); ctx.ellipse(20 + w, 27, 17, 13, 0, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = 'rgba(200,160,80,0.62)';
      ctx.beginPath(); ctx.ellipse(44 + w, 28, 15, 11, 0, 0, Math.PI * 2); ctx.fill();

      // Olhos
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath(); ctx.ellipse(25 + w, 26, 5, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(40 + w, 26, 5, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#900';
      ctx.beginPath(); ctx.ellipse(25 + w, 27, 2, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(40 + w, 27, 2, 3, 0, 0, Math.PI * 2); ctx.fill();

      // Partículas
      ctx.fillStyle = 'rgba(160,100,40,0.5)';
      for (let p = 0; p < 5; p++) {
        const px = 6 + p * 10 + (f * 4) % 10;
        const py = 8 + Math.sin(p + f) * 7;
        ctx.beginPath(); ctx.ellipse(px, py, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
      }

      ct.refresh();
    }
  }

  // ─── BACKGROUNDS ──────────────────────────────────────────────
  _makeBackgrounds() {
    // Céu
    if (!this.textures.exists('bg_sky')) {
      const ct  = this.textures.createCanvas('bg_sky', 800, 200);
      const ctx = ct.getContext();
      const g   = ctx.createLinearGradient(0, 0, 0, 200);
      g.addColorStop(0, '#4fc3f7'); g.addColorStop(1, '#b3e5fc');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 800, 200);
      // Nuvens
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      [[80,30,38,18],[200,22,48,20],[380,38,32,16],[560,28,42,18],[720,18,28,14]].forEach(([x,y,rx,ry]) => {
        ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x+18, y-8, rx*.7, ry*.75, 0, 0, Math.PI*2); ctx.fill();
      });
      ct.refresh();
    }

    // Colinas
    if (!this.textures.exists('bg_hills')) {
      const ct  = this.textures.createCanvas('bg_hills', 800, 150);
      const ctx = ct.getContext();
      ctx.fillStyle = '#4a8c2a';
      ctx.beginPath(); ctx.moveTo(0, 150);
      for (let x = 0; x <= 800; x += 8) {
        ctx.lineTo(x, 58 + Math.sin(x*0.014)*28 + Math.sin(x*0.031)*12);
      }
      ctx.lineTo(800, 150); ctx.closePath(); ctx.fill();
      // Árvores
      ctx.fillStyle = '#2d5a1b';
      [60, 170, 310, 460, 600, 730].forEach(tx => {
        const ty = 58 + Math.sin(tx*0.014)*28;
        ctx.fillRect(tx-3, ty+8, 7, 18);
        ctx.beginPath(); ctx.moveTo(tx, ty-18); ctx.lineTo(tx-16, ty+12); ctx.lineTo(tx+16, ty+12); ctx.closePath(); ctx.fill();
      });
      ct.refresh();
    }

    // Chão / Estrada
    if (!this.textures.exists('bg_ground')) {
      const ct  = this.textures.createCanvas('bg_ground', 800, 100);
      const ctx = ct.getContext();
      ctx.fillStyle = '#8b6914'; ctx.fillRect(0, 0, 800, 100);
      ctx.fillStyle = '#c4956a'; ctx.fillRect(0, 0, 800, 58);
      // Marcações
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      for (let x = 0; x < 800; x += 48) ctx.fillRect(x, 26, 28, 4);
      // Grama
      ctx.fillStyle = '#4a8c2a';
      for (let x = 0; x < 800; x += 7) {
        ctx.fillRect(x, 56, 3, 5 + Math.sin(x*0.4)*2);
      }
      ct.refresh();
    }
  }

  // ─── EXTRAS ──────────────────────────────────────────────────
  _makeExtras() {
    if (!this.textures.exists('coin')) {
      const ct = this.textures.createCanvas('coin', 20, 20);
      const ctx = ct.getContext();
      ctx.fillStyle = '#f9c22e'; ctx.beginPath(); ctx.ellipse(10,10,9,9,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = '#e6ac00'; ctx.beginPath(); ctx.ellipse(10,10,6,6,0,0,Math.PI*2); ctx.fill();
      ct.refresh();
    }
  }

  // ─── ANIMAÇÕES — registradas UMA VEZ com chaves de textura ───
  _registerAllAnims() {
    const mgr = this.anims;
    const make = (key, state, rate, repeat = -1) => {
      if (mgr.exists(key)) return;
      mgr.create({
        key,
        frames: [0,1,2,3].map(f => ({ key: `player_${state}_${f}` })),
        frameRate: rate,
        repeat
      });
    };

    make('anim_idle',     'idle',     4);
    make('anim_run',      'run',      8);
    make('anim_dash',     'dash',    12);
    make('anim_correct',  'correct',  8,  1);
    make('anim_wrong',    'wrong',    8,  1);
    make('anim_stumble',  'stumble',  6,  1);
    make('anim_scared',   'scared',  10);
    make('anim_gameover', 'gameover', 3,  0);

    // Ameaça
    if (!mgr.exists('anim_threat')) {
      mgr.create({
        key: 'anim_threat',
        frames: [0,1,2,3].map(f => ({ key: `threat_${f}` })),
        frameRate: 8,
        repeat: -1
      });
    }
  }
}