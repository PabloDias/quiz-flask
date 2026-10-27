# Guia de Sprites — Agro Quiz Runner

## Por que 48×64 px por frame?

Esta resolução foi escolhida porque:
- É legível em telas de apresentação (projetores) mesmo com pixel art
- Permite multiplicar ×2 (96×128) ou ×2.5 (120×160) sem borramento
- É compatível com a resolução interna do jogo (800×450)
- Segue o padrão de jogos como Stardew Valley (16px base × 3) e similares

---

## Estrutura Esperada do Spritesheet

**Arquivo:** `static/img/player/player_spritesheet.png`

| Linha | Estado | Frames | Frame Rate |
|-------|--------|--------|-----------|
| 0     | idle   | 4      | 4 fps     |
| 1     | run    | 4      | 8 fps     |
| 2     | dash   | 4      | 12 fps    |
| 3     | correct (celebração) | 4 | 8 fps |
| 4     | wrong / susto | 4 | 8 fps |
| 5     | stumble / tropeço | 4 | 6 fps |
| 6     | scared / assustado | 4 | 10 fps |
| 7     | gameover / caído | 4 | 3 fps |

**Total:** 800×512 px (10 colunas × 48 = 480, arredondado; 8 linhas × 64 = 512)

---

## Convenção de Nomenclatura (pastas separadas)

Se preferir arquivos separados em vez de spritesheet:

```
static/img/player/
├── idle/
│   ├── frame_0.png   (48×64)
│   ├── frame_1.png
│   ├── frame_2.png
│   └── frame_3.png
├── run/
│   ├── frame_0.png … frame_3.png
├── dash/
│   └── frame_0.png … frame_3.png
├── correct/
│   └── frame_0.png … frame_3.png
├── wrong/
│   └── frame_0.png … frame_3.png
├── stumble/
│   └── frame_0.png … frame_3.png
├── scared/
│   └── frame_0.png … frame_3.png
└── gameover/
    └── frame_0.png … frame_3.png
```

---

## Como Substituir o Placeholder pelo Personagem Real

### Opção A — Spritesheet único (recomendado)

1. **Crie o PNG** conforme a tabela acima.

2. **Em `PreloadScene.js`**, substitua todos os `textures.createCanvas('player_*')` por:
   ```js
   this.load.spritesheet('player_sheet',
     '/static/img/player/player_spritesheet.png',
     { frameWidth: 48, frameHeight: 64 }
   );
   ```

3. **Em `PlayerController.js`**, altere `_registerAnims()`:
   ```js
   const defs = [
     { key: 'anim_idle',     texture: 'player_sheet', start: 0,  end: 3,  rate: 4 },
     { key: 'anim_run',      texture: 'player_sheet', start: 4,  end: 7,  rate: 8 },
     { key: 'anim_dash',     texture: 'player_sheet', start: 8,  end: 11, rate: 12 },
     { key: 'anim_correct',  texture: 'player_sheet', start: 12, end: 15, rate: 8 },
     { key: 'anim_wrong',    texture: 'player_sheet', start: 16, end: 19, rate: 8 },
     { key: 'anim_stumble',  texture: 'player_sheet', start: 20, end: 23, rate: 6 },
     { key: 'anim_scared',   texture: 'player_sheet', start: 24, end: 27, rate: 10 },
     { key: 'anim_gameover', texture: 'player_sheet', start: 28, end: 31, rate: 3 },
   ];
   defs.forEach(d => {
     if (scene.anims.exists(d.key)) return;
     scene.anims.create({
       key:        d.key,
       frames:     scene.anims.generateFrameNumbers(d.texture, { start: d.start, end: d.end }),
       frameRate:  d.rate,
       repeat:     d.key.includes('idle') || d.key.includes('run') ? -1 : 0
     });
   });
   ```

4. No `constructor` do `PlayerController`, mude a linha de criação do sprite:
   ```js
   this.sprite = scene.add.sprite(x, y, 'player_sheet', 0).setScale(2.5);
   ```

---

### Opção B — Pastas separadas

No `PreloadScene.js`:
```js
const states = ['idle','run','dash','correct','wrong','stumble','scared','gameover'];
const frames = 4;
states.forEach(state => {
  for (let i = 0; i < frames; i++) {
    this.load.image(
      `player_${state}_${i}`,
      `/static/img/player/${state}/frame_${i}.png`
    );
  }
});
```

Em `PlayerController._registerAnims()`, use `generateFrameNames` em vez de `generateFrameNumbers`.

---

## Características Visuais do Personagem (referência)

Baseado na imagem PNG de referência fornecida:

| Atributo | Descrição |
|----------|-----------|
| Cabeça   | Careca, pele clara-amarelada, feições amigáveis |
| Camisa   | Polo vermelho (cor: `#c0392b`) |
| Calça    | Reta, cinza-azulada (cor: `#5d6d7e`) |
| Sapatos  | Marrom-chocolate (cor: `#7d5a3c`) |
| Proporção| Adulto masculino, ~5 cabeças de altura |
| Estilo   | Pixel art limpo, poucas cores, sem contorno preto grosso |

---

## Ameaça — Nuvem de Poeira

**Arquivo:** `static/img/threat/threat_spritesheet.png`
- Tamanho: 64×48 px por frame × 4 frames = 256×48 px total
- Animação: loop suave de turbilhão

Para substituir:
```js
// Em PreloadScene.js
this.load.spritesheet('threat', '/static/img/threat/threat_spritesheet.png',
  { frameWidth: 64, frameHeight: 48 });
```
E remova o `_makeThreatSprite()` do `PreloadScene`.

---

## Ferramentas Sugeridas para Criação de Pixel Art

| Ferramenta | Tipo | Link |
|-----------|------|------|
| Aseprite  | Desktop (pago, muito popular) | aseprite.org |
| LibreSprite | Desktop (gratuito, fork do Aseprite) | libresprite.github.io |
| Piskel    | Web (gratuito) | piskelapp.com |
| PixelArt.io | Web (gratuito) | pixelart.io |

**Dica:** Use Aseprite ou LibreSprite para exportar diretamente como spritesheet horizontal.
Em "File → Export Sprite Sheet", escolha:
- Sheet type: Horizontal Strip
- Output: `player_spritesheet.png`
