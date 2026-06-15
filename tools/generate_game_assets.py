# -*- coding: utf-8 -*-
"""
Gerador de assets placeholder (pixel art) para o modo "Aventura Quiz 2D".

- Personagem desenhado em grade 24x32 "fat pixels" (2x2) => frames finais 48x64 px.
- Identidade baseada na referencia static/img/Pablo.png:
  careca, sorriso amigavel, polo vermelha, calca cinza, sapato marrom.
- Spritesheet: grade fixa de 6 colunas x 11 linhas (48x64 por frame).
  Linha por animacao (ver ANIMATIONS abaixo). Indices Phaser = linha*6 + coluna.

Rode novamente sempre que quiser regenerar os placeholders:
    python tools/generate_game_assets.py
"""
import os
from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
IMG = os.path.join(ROOT, 'static', 'img')

# Paleta (inspirada na referencia Pablo.png — cores originais, sem copia de jogos)
SKIN = (242, 200, 161)
SKIN_SH = (214, 168, 128)
SHIRT = (165, 48, 44)        # polo vermelha
SHIRT_SH = (124, 34, 32)
PANTS = (106, 114, 124)      # calca cinza
PANTS_SH = (80, 87, 96)
SHOE = (139, 90, 43)         # sapato marrom
OUTLINE = (43, 31, 26)
EYE = (32, 24, 20)
MOUTH = (120, 60, 50)

GRID_W, GRID_H = 24, 32       # grade de design
PX = 2                        # fator fat-pixel
FRAME_W, FRAME_H = GRID_W * PX, GRID_H * PX   # 48 x 64

# ordem das linhas no spritesheet (nome, n_frames)
ANIMATIONS = [
    ('idle', 4), ('walk', 6), ('run', 6), ('jump', 2), ('fall', 2),
    ('correct', 4), ('wrong', 4), ('stumble', 4), ('scared', 4),
    ('victory', 4), ('game_over', 4),
]
COLS = 6


def new_frame():
    return Image.new('RGBA', (GRID_W, GRID_H), (0, 0, 0, 0))


def px(d, x, y, c):
    if 0 <= x < GRID_W and 0 <= y < GRID_H:
        d.point((x, y), fill=c)


def rect(d, x0, y0, x1, y1, c):
    d.rectangle([x0, y0, x1, y1], fill=c)


def draw_character(arm_l=0, arm_r=0, leg_l=0, leg_r=0, bob=0, lean=0,
                   mouth='smile', eyes='open', arms_up=False, lying=False,
                   sweat=False, star=False):
    """Desenha o personagem na grade 24x32 e devolve a imagem do frame."""
    im = new_frame()
    d = ImageDraw.Draw(im)
    ox = lean  # inclinacao simples (desloca a parte de cima)

    if lying:  # frame de game over: deitado
        rect(d, 3, 26, 20, 29, SHIRT)
        rect(d, 3, 25, 20, 25, OUTLINE)
        rect(d, 16, 23, 21, 28, SKIN)          # cabeca
        rect(d, 16, 22, 21, 22, OUTLINE)
        px(d, 18, 25, EYE); px(d, 20, 25, EYE) # olhos fechados (linha)
        rect(d, 3, 27, 8, 29, PANTS)
        rect(d, 1, 28, 3, 30, SHOE)
        if star:
            for sx, sy in ((12, 18), (16, 16), (20, 18)):
                px(d, sx, sy, (255, 215, 80))
        return im

    hy = 2 + bob  # topo da cabeca

    # ---- cabeca careca ----
    rect(d, 9 + ox, hy + 1, 14 + ox, hy + 7, SKIN)
    rect(d, 10 + ox, hy, 13 + ox, hy, SKIN)            # topo arredondado
    rect(d, 9 + ox, hy + 7, 14 + ox, hy + 7, SKIN_SH)  # queixo sombra
    # contorno superior
    for x in range(10, 14):
        px(d, x + ox, hy - 1, OUTLINE)
    px(d, 9 + ox, hy, OUTLINE); px(d, 14 + ox, hy, OUTLINE)
    # olhos
    if eyes == 'open':
        px(d, 10 + ox, hy + 3, EYE); px(d, 13 + ox, hy + 3, EYE)
    elif eyes == 'happy':
        px(d, 10 + ox, hy + 3, EYE); px(d, 13 + ox, hy + 3, EYE)
        px(d, 10 + ox, hy + 2, EYE); px(d, 13 + ox, hy + 2, EYE)
    elif eyes == 'wide':
        for ex in (10, 13):
            px(d, ex + ox, hy + 2, (255, 255, 255))
            px(d, ex + ox, hy + 3, EYE)
    elif eyes == 'closed':
        px(d, 10 + ox, hy + 3, OUTLINE); px(d, 13 + ox, hy + 3, OUTLINE)
    # boca
    if mouth == 'smile':
        px(d, 11 + ox, hy + 6, MOUTH); px(d, 12 + ox, hy + 6, MOUTH)
    elif mouth == 'open':
        rect(d, 11 + ox, hy + 5, 12 + ox, hy + 6, MOUTH)
    elif mouth == 'sad':
        px(d, 11 + ox, hy + 6, MOUTH); px(d, 12 + ox, hy + 6, MOUTH)
        px(d, 10 + ox, hy + 7, MOUTH); px(d, 13 + ox, hy + 7, MOUTH)
    if sweat:
        px(d, 16 + ox, hy + 2, (120, 190, 255))
        px(d, 16 + ox, hy + 4, (120, 190, 255))

    # ---- tronco: polo vermelha ----
    ty = hy + 8
    rect(d, 8 + ox, ty, 15 + ox, ty + 8, SHIRT)
    rect(d, 8 + ox, ty + 8, 15 + ox, ty + 8, SHIRT_SH)
    rect(d, 10 + ox, ty, 13 + ox, ty, SHIRT_SH)        # gola
    px(d, 11 + ox, ty + 2, SHIRT_SH)                    # botao

    # ---- bracos ----
    def arm(side, dy, up):
        x = (6 if side == 'l' else 17) + ox
        if up:
            rect(d, x, ty - 5, x + 1, ty - 1, SKIN)     # erguido
            rect(d, x, ty - 1, x + 1, ty + 1, SHIRT)    # manga
        else:
            rect(d, x, ty + 1, x + 1, ty + 3, SHIRT)    # manga
            rect(d, x, ty + 4 + dy, x + 1, ty + 7 + dy, SKIN)
    arm('l', arm_l, arms_up)
    arm('r', arm_r, arms_up)

    # ---- pernas (calca cinza) + sapatos ----
    ly = ty + 9
    rect(d, 9 + ox, ly, 11 + ox, ly + 9 + leg_l, PANTS)
    rect(d, 12 + ox, ly, 14 + ox, ly + 9 + leg_r, PANTS)
    px(d, 11 + ox, ly + 4, PANTS_SH); px(d, 12 + ox, ly + 4, PANTS_SH)
    rect(d, 8 + ox, ly + 10 + leg_l, 11 + ox, ly + 11 + leg_l, SHOE)
    rect(d, 12 + ox, ly + 10 + leg_r, 15 + ox, ly + 11 + leg_r, SHOE)
    return im


def frames_for(name):
    """Retorna a lista de imagens (grade 24x32) para cada animacao."""
    if name == 'idle':
        return [draw_character(bob=b) for b in (0, 0, 1, 0)]
    if name == 'walk':
        seq = [(-1, 1), (0, 0), (1, -1), (1, -1), (0, 0), (-1, 1)]
        return [draw_character(leg_l=a, leg_r=b, arm_l=b, arm_r=a) for a, b in seq]
    if name == 'run':
        seq = [(-2, 2), (-1, 1), (0, 0), (2, -2), (1, -1), (0, 0)]
        return [draw_character(leg_l=a, leg_r=b, arm_l=b, arm_r=a, lean=1,
                               mouth='open') for a, b in seq]
    if name == 'jump':
        return [draw_character(leg_l=-2, leg_r=-2, arms_up=True, mouth='open'),
                draw_character(leg_l=-1, leg_r=-2, arms_up=True)]
    if name == 'fall':
        return [draw_character(leg_l=1, leg_r=0, arm_l=-2, arm_r=-2, eyes='wide'),
                draw_character(leg_l=0, leg_r=1, arm_l=-2, arm_r=-2, eyes='wide')]
    if name == 'correct':
        return [draw_character(arms_up=True, eyes='happy', mouth='open', bob=b, star=True)
                for b in (0, -1, 0, -1)]
    if name == 'wrong':
        return [draw_character(eyes='closed', mouth='sad', bob=b, lean=l, sweat=True)
                for b, l in ((0, 0), (1, -1), (0, 0), (1, 1))]
    if name == 'stumble':
        return [draw_character(lean=l, leg_l=a, leg_r=b, eyes='wide', mouth='open')
                for l, a, b in ((1, -1, 1), (2, -2, 2), (2, -2, 1), (1, -1, 0))]
    if name == 'scared':
        return [draw_character(eyes='wide', mouth='open', sweat=True, bob=b, lean=l)
                for b, l in ((0, -1), (1, 0), (0, 1), (1, 0))]
    if name == 'victory':
        return [draw_character(arms_up=u, eyes='happy', mouth='open', bob=b, star=True)
                for u, b in ((True, -1), (False, 0), (True, -1), (False, 0))]
    if name == 'game_over':
        return [draw_character(eyes='closed', mouth='sad', bob=1),
                draw_character(eyes='closed', mouth='sad', bob=2, lean=1),
                draw_character(lying=True, star=True),
                draw_character(lying=True)]
    raise ValueError(name)


def build_player_sheet():
    sheet = Image.new('RGBA', (COLS * FRAME_W, len(ANIMATIONS) * FRAME_H), (0, 0, 0, 0))
    for row, (name, n) in enumerate(ANIMATIONS):
        frs = frames_for(name)
        assert len(frs) == n, name
        for col, fr in enumerate(frs):
            big = fr.resize((FRAME_W, FRAME_H), Image.NEAREST)
            sheet.paste(big, (col * FRAME_W, row * FRAME_H))
    out = os.path.join(IMG, 'player')
    os.makedirs(out, exist_ok=True)
    sheet.save(os.path.join(out, 'player_spritesheet.png'))
    # frame unico de referencia
    frames_for('idle')[0].resize((FRAME_W, FRAME_H), Image.NEAREST).save(
        os.path.join(out, 'player_placeholder.png'))


# ---------------- AMEACA: redemoinho de poeira ("Redemoinho") ----------------
def build_threat():
    """Redemoinho de poeira 64x64, 4 frames girando (ameaca original)."""
    fw = 64
    dust = [(196, 164, 118), (172, 138, 94), (148, 116, 76), (120, 92, 60)]
    eye_c = (60, 44, 30)
    sheet = Image.new('RGBA', (fw * 4, fw), (0, 0, 0, 0))
    for f in range(4):
        im = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        # cone de espiral: faixas horizontais alternadas, largura cresce p/ cima
        for y in range(4, 30):
            w = 3 + int((y - 4) * 0.45 * 1.6)
            cx = 16 + (1 if (y + f) % 4 < 2 else -1)
            c = dust[(y + f) % 4]
            rect(d, cx - w // 2, y, cx + w // 2, y, c)
            # pontinhas de poeira
            if (y * 7 + f * 5) % 9 == 0:
                px(d, cx + w // 2 + 2, y, dust[3])
                px(d, cx - w // 2 - 2, y - 1, dust[2])
        # "olhos" travessos para leitura amigavel
        px(d, 13, 12 + (f % 2), eye_c); px(d, 19, 12 + (f % 2), eye_c)
        sheet.paste(im.resize((fw, fw), Image.NEAREST), (f * fw, 0))
    out = os.path.join(IMG, 'enemies')
    os.makedirs(out, exist_ok=True)
    sheet.save(os.path.join(out, 'threat_spritesheet.png'))


# ---------------- TILES / UI / DECOR ----------------
def build_tiles():
    out = os.path.join(IMG, 'tiles')
    os.makedirs(out, exist_ok=True)
    # ground 32x32: terra com grama no topo
    im = Image.new('RGBA', (16, 16))
    d = ImageDraw.Draw(im)
    rect(d, 0, 0, 15, 3, (94, 168, 76))
    rect(d, 0, 0, 15, 0, (122, 196, 96))
    rect(d, 0, 4, 15, 15, (146, 104, 62))
    for x, y in ((3, 7), (10, 9), (6, 12), (13, 13), (1, 11)):
        px(d, x, y, (120, 82, 48)); px(d, x + 1, y, (120, 82, 48))
    im.resize((32, 32), Image.NEAREST).save(os.path.join(out, 'ground.png'))
    # platform 32x16
    im = Image.new('RGBA', (16, 8))
    d = ImageDraw.Draw(im)
    rect(d, 0, 0, 15, 7, (170, 122, 70))
    rect(d, 0, 0, 15, 1, (200, 152, 92))
    for x in (4, 8, 12):
        rect(d, x, 2, x, 7, (140, 98, 54))
    im.resize((32, 16), Image.NEAREST).save(os.path.join(out, 'platform.png'))
    # sign (placa de madeira) 32x40
    im = Image.new('RGBA', (16, 20))
    d = ImageDraw.Draw(im)
    rect(d, 7, 8, 8, 19, (124, 88, 48))
    rect(d, 1, 1, 14, 8, (186, 140, 86))
    rect(d, 1, 1, 14, 1, (210, 166, 106))
    rect(d, 1, 1, 1, 8, (150, 108, 60))
    d.text((5, 2), "?", fill=(70, 46, 24))
    im.resize((32, 40), Image.NEAREST).save(os.path.join(out, 'sign.png'))
    # bandeira de chegada 48x64
    im = Image.new('RGBA', (24, 32))
    d = ImageDraw.Draw(im)
    rect(d, 4, 0, 5, 31, (160, 160, 168))
    for yy in range(2, 12):
        for xx in range(6, 20):
            c = (40, 40, 48) if ((xx // 3) + (yy // 3)) % 2 == 0 else (240, 240, 240)
            px(d, xx, yy, c)
    im.resize((48, 64), Image.NEAREST).save(os.path.join(out, 'finish_flag.png'))


def build_ui():
    out = os.path.join(IMG, 'ui')
    os.makedirs(out, exist_ok=True)
    # heart 16x16
    im = Image.new('RGBA', (8, 8))
    d = ImageDraw.Draw(im)
    for x, y in [(1,1),(2,1),(5,1),(6,1),(0,2),(1,2),(2,2),(3,2),(4,2),(5,2),(6,2),(7,2),
                 (0,3),(1,3),(2,3),(3,3),(4,3),(5,3),(6,3),(7,3),
                 (1,4),(2,4),(3,4),(4,4),(5,4),(6,4),(2,5),(3,5),(4,5),(5,5),(3,6),(4,6)]:
        px(d, x, y, (226, 64, 70))
    px(d, 1, 2, (255, 140, 144))
    im.resize((16, 16), Image.NEAREST).save(os.path.join(out, 'heart.png'))
    # coin 16x16
    im = Image.new('RGBA', (8, 8))
    d = ImageDraw.Draw(im)
    d.ellipse([0, 0, 7, 7], fill=(238, 192, 64))
    d.ellipse([2, 2, 5, 5], outline=(196, 148, 32))
    px(d, 2, 1, (255, 232, 150))
    im.resize((16, 16), Image.NEAREST).save(os.path.join(out, 'coin.png'))
    # star 16x16
    im = Image.new('RGBA', (8, 8))
    d = ImageDraw.Draw(im)
    pts = [(3,0),(4,0),(3,1),(4,1),(0,2),(1,2),(2,2),(3,2),(4,2),(5,2),(6,2),(7,2),
           (1,3),(2,3),(3,3),(4,3),(5,3),(6,3),(2,4),(3,4),(4,4),(5,4),
           (1,5),(2,5),(5,5),(6,5),(0,6),(1,6),(6,6),(7,6)]
    for x, y in pts:
        px(d, x, y, (252, 212, 72))
    im.resize((16, 16), Image.NEAREST).save(os.path.join(out, 'star.png'))


def build_decor():
    out = os.path.join(IMG, 'decor')
    os.makedirs(out, exist_ok=True)
    # arvore 48x64
    im = Image.new('RGBA', (24, 32))
    d = ImageDraw.Draw(im)
    rect(d, 10, 18, 13, 31, (124, 88, 48))
    d.ellipse([2, 2, 21, 19], fill=(72, 142, 64))
    d.ellipse([5, 0, 18, 12], fill=(94, 168, 76))
    px(d, 7, 5, (132, 200, 104)); px(d, 12, 3, (132, 200, 104))
    im.resize((48, 64), Image.NEAREST).save(os.path.join(out, 'tree.png'))
    # nuvem 64x32
    im = Image.new('RGBA', (32, 16))
    d = ImageDraw.Draw(im)
    d.ellipse([2, 6, 14, 14], fill=(255, 255, 255))
    d.ellipse([8, 2, 22, 13], fill=(255, 255, 255))
    d.ellipse([16, 6, 29, 14], fill=(255, 255, 255))
    im.resize((64, 32), Image.NEAREST).save(os.path.join(out, 'cloud.png'))
    # plantacao (pe de milho) 16x32
    im = Image.new('RGBA', (8, 16))
    d = ImageDraw.Draw(im)
    rect(d, 3, 4, 4, 15, (88, 150, 60))
    px(d, 2, 6, (88, 150, 60)); px(d, 5, 8, (88, 150, 60))
    px(d, 1, 5, (88, 150, 60)); px(d, 6, 7, (88, 150, 60))
    rect(d, 4, 5, 5, 8, (236, 200, 80))
    im.resize((16, 32), Image.NEAREST).save(os.path.join(out, 'crop.png'))
    # cerca 32x32
    im = Image.new('RGBA', (16, 16))
    d = ImageDraw.Draw(im)
    for x in (2, 12):
        rect(d, x, 4, x + 1, 15, (170, 122, 70))
        px(d, x, 4, (200, 152, 92))
    rect(d, 0, 7, 15, 8, (186, 140, 86))
    rect(d, 0, 12, 15, 13, (186, 140, 86))
    im.resize((32, 32), Image.NEAREST).save(os.path.join(out, 'fence.png'))
    # morro de fundo 128x64
    im = Image.new('RGBA', (64, 32))
    d = ImageDraw.Draw(im)
    d.ellipse([-20, 10, 50, 60], fill=(132, 186, 110))
    d.ellipse([24, 14, 84, 64], fill=(112, 170, 96))
    im.resize((128, 64), Image.NEAREST).save(os.path.join(out, 'hill.png'))


# ---------------- OBSTACULOS (fardo, pedra, caixote) ----------------
def build_obstacles():
    out = os.path.join(IMG, 'obstacles')
    os.makedirs(out, exist_ok=True)

    # Fardo de feno 48x40 (grade 24x20)
    im = Image.new('RGBA', (24, 20))
    d = ImageDraw.Draw(im)
    d.ellipse([1, 2, 22, 19], fill=(214, 168, 86))            # corpo
    d.ellipse([1, 1, 22, 16], fill=(232, 192, 110))           # claro topo
    for y in (6, 10, 14):                                      # cordoes do fardo
        for x in range(2, 22):
            if (x + y) % 2 == 0: px(d, x, y, (160, 118, 56))
    # palhas saindo
    px(d, 4, 4, (252, 220, 130)); px(d, 19, 5, (252, 220, 130))
    px(d, 12, 2, (252, 220, 130)); px(d, 8, 3, (252, 220, 130))
    px(d, 2, 8, OUTLINE); px(d, 21, 8, OUTLINE)
    im.resize((48, 40), Image.NEAREST).save(os.path.join(out, 'haybale.png'))

    # Pedra 40x28 (grade 20x14)
    im = Image.new('RGBA', (20, 14))
    d = ImageDraw.Draw(im)
    d.ellipse([0, 2, 19, 13], fill=(118, 124, 132))           # base
    d.ellipse([2, 1, 16, 10], fill=(150, 156, 164))           # claro
    d.ellipse([4, 1, 11, 6],  fill=(180, 186, 194))           # brilho
    px(d, 6, 8, (90, 96, 104)); px(d, 13, 9, (90, 96, 104))
    px(d, 9, 11, (90, 96, 104))
    im.resize((40, 28), Image.NEAREST).save(os.path.join(out, 'rock.png'))

    # Caixote de madeira 40x40 (grade 20x20)
    im = Image.new('RGBA', (20, 20))
    d = ImageDraw.Draw(im)
    rect(d, 1, 1, 18, 18, (164, 116, 64))                     # face
    rect(d, 1, 1, 18, 2,  (200, 152, 92))                     # topo claro
    rect(d, 1, 17, 18, 18, (118, 80, 38))                     # base escura
    rect(d, 1, 1, 2, 18,  (120, 82, 40))                      # borda esq
    rect(d, 17, 1, 18, 18,(120, 82, 40))                      # borda dir
    # X de reforco
    for k in range(2, 18):
        px(d, k, k, (90, 60, 28))
        px(d, k, 19 - k, (90, 60, 28))
    rect(d, 3, 9, 16, 10, (140, 96, 50))                      # tabua do meio
    im.resize((40, 40), Image.NEAREST).save(os.path.join(out, 'crate.png'))


if __name__ == '__main__':
    build_player_sheet()
    build_threat()
    build_tiles()
    build_ui()
    build_decor()
    build_obstacles()
    print('Assets gerados em', IMG)
